// ============================================
// 11 ペア HMM と配列アラインメント ─ 2 本の文字列（DNA 風の A C G T）を、1 つの HMM が「同時に」出していくと考える。状態は 3 つ：
//   M 一致：両方に 1 文字ずつ出す（同じ文字が出やすい）　X：上の文字列だけに 1 文字（下はすき間 −）　Y：下の文字列だけに 1 文字
// 状態の道 1 本 = 並べ方（アラインメント）1 つ。
//   ビタビ = いちばん確率の高い並べ方。対数にすると「一致の点数・すき間の開始の罰・のばす罰」を足す動的計画法の表（Needleman–Wunsch、アフィンギャップ）と同じ
//   前向き = 全部の並べ方の確率の合計（2 本が「関係ある」確率）。前向き × 後ろ向きで、マスごとの「x_i と y_j が対応している確率」が出る
// （文字を 1 つずつ直す回数を数える編集距離はシリーズ 12 の 04）
// A C G T 文字を足す / Backspace 消す / Tab かクリックで上下を切りかえ / ↑↓ すき間の始まりやすさ δ / ← → すき間ののびやすさ ε / R 新しい 2 本
// ※ A・C・G・T のキーは文字の入力に使う。操作は矢印・Tab・Backspace・R
// ============================================

const DNA = 'ACGT';
let pp = { delta: 0.1, eps: 0.3, tau: 0.05, same: 0.85 };   // ★ δ = M → X（または Y）、ε = X → X、τ = 終わる、same = M が同じ文字を出す確率の合計
let strs = ['GATTACA', 'GACTAA'], active = 0, res = null, MAX_LEN = 14, hitBoxes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(81); recompute();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function pMatch(P, a, b) { return a === b ? P.same / 4 : (1 - P.same) / 12; }   // M が (a, b) を出す確率（16 通りの合計 = 1）
const Q_BASE = 0.25;                     // X・Y が 1 文字を出す確率（4 文字とも同じ）
function grid3(n, m, v) { let mk = () => { let a = []; for (let i = 0; i <= n; i++) a.push(new Array(m + 1).fill(v)); return a; }; return { M: mk(), X: mk(), Y: mk() }; }
// ★ ビタビ（対数）：v.M[i][j] = x の i 文字目と y の j 文字目までを出して、状態 M で終わるいちばん良い並べ方の log 確率
function pairViterbi(x, y, P) {
  let n = x.length, m = y.length, v = grid3(n, m, -Infinity), from = grid3(n, m, ''), lmm = lg(1 - 2 * P.delta - P.tau), lgm = lg(1 - P.eps - P.tau), ld = lg(P.delta), le = lg(P.eps), lq = lg(Q_BASE);
  v.M[0][0] = 0;                         // はじまりは「M にいる」のと同じあつかい
  let pick = (cands) => { let b = cands[0]; for (let c of cands) if (c[0] > b[0]) b = c; return b; };
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (i > 0 && j > 0) { let b = pick([[v.M[i - 1][j - 1] + lmm, 'M'], [v.X[i - 1][j - 1] + lgm, 'X'], [v.Y[i - 1][j - 1] + lgm, 'Y']]); v.M[i][j] = b[0] + lg(pMatch(P, x[i - 1], y[j - 1])); from.M[i][j] = b[1]; }
    if (i > 0) { let b = pick([[v.M[i - 1][j] + ld, 'M'], [v.X[i - 1][j] + le, 'X']]); v.X[i][j] = b[0] + lq; from.X[i][j] = b[1]; }
    if (j > 0) { let b = pick([[v.M[i][j - 1] + ld, 'M'], [v.Y[i][j - 1] + le, 'Y']]); v.Y[i][j] = b[0] + lq; from.Y[i][j] = b[1]; }
  }
  let end = pick([[v.M[n][m], 'M'], [v.X[n][m], 'X'], [v.Y[n][m], 'Y']]), cols = [], i = n, j = m, s = end[1];
  while ((i > 0 || j > 0) && end[0] > -Infinity) { cols.unshift({ s, i, j }); let p = from[s][i][j]; if (s === 'M') { i--; j--; } else if (s === 'X') i--; else j--; s = p; }
  return { logP: end[0] + lg(P.tau), cols };
}
// ★ 前向き：max を「合計」に変えるだけ。全部の並べ方の確率の合計
function pairForward(x, y, P) {
  let n = x.length, m = y.length, f = grid3(n, m, 0), mm = 1 - 2 * P.delta - P.tau, gm = 1 - P.eps - P.tau;
  f.M[0][0] = 1;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (i > 0 && j > 0) f.M[i][j] = pMatch(P, x[i - 1], y[j - 1]) * (mm * f.M[i - 1][j - 1] + gm * (f.X[i - 1][j - 1] + f.Y[i - 1][j - 1]));
    if (i > 0) f.X[i][j] = Q_BASE * (P.delta * f.M[i - 1][j] + P.eps * f.X[i - 1][j]);
    if (j > 0) f.Y[i][j] = Q_BASE * (P.delta * f.M[i][j - 1] + P.eps * f.Y[i][j - 1]);
  }
  return { f, prob: P.tau * (f.M[n][m] + f.X[n][m] + f.Y[n][m]) };
}
function pairBackward(x, y, P) {         // 後ろ向き：b.M[i][j] = (i, j) まで出して M にいるとき、残りを全部出して終わる確率
  let n = x.length, m = y.length, b = grid3(n, m, 0), mm = 1 - 2 * P.delta - P.tau, gm = 1 - P.eps - P.tau;
  for (let i = n; i >= 0; i--) for (let j = m; j >= 0; j--) {
    if (i === n && j === m) { b.M[i][j] = b.X[i][j] = b.Y[i][j] = P.tau; continue; }
    let em = i < n && j < m ? pMatch(P, x[i], y[j]) * b.M[i + 1][j + 1] : 0, ex = i < n ? Q_BASE * b.X[i + 1][j] : 0, ey = j < m ? Q_BASE * b.Y[i][j + 1] : 0;
    b.M[i][j] = mm * em + P.delta * (ex + ey); b.X[i][j] = gm * em + P.eps * ex; b.Y[i][j] = gm * em + P.eps * ey;
  }
  return b;
}
function matchPosterior(x, y, P) {       // ★ マス (i, j) ごとの P(x_i と y_j が対応 | 2 本の文字列)
  let fw = pairForward(x, y, P), b = pairBackward(x, y, P), out = [];
  for (let i = 1; i <= x.length; i++) { out.push([]); for (let j = 1; j <= y.length; j++) out[i - 1].push(fw.prob > 0 ? (fw.f.M[i][j] * b.M[i][j]) / fw.prob : 0); }
  return out;
}
// ★ ペア HMM の確率から、動的計画法の点数を作る：s(a, b) = log( p_ab / (q_a q_b) ) + log(1 − 2δ − τ)、すき間の開始 d、のばす e、最後の補正 c
function scoresFromHmm(P) {
  let mm = 1 - 2 * P.delta - P.tau, gm = 1 - P.eps - P.tau;
  return { sub: (a, b) => Math.log(pMatch(P, a, b) / (Q_BASE * Q_BASE)) + Math.log(mm), d: -Math.log((P.delta * gm) / mm), e: -Math.log(P.eps), c: Math.log(mm) - Math.log(gm) };
}
// ★ Needleman–Wunsch（アフィンギャップ、3 枚の表）：点数を足して最大をとるだけ。確率は出てこない
function nwAffine(x, y, sc) {
  let n = x.length, m = y.length, t = grid3(n, m, -Infinity);
  t.M[0][0] = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (i > 0 && j > 0) t.M[i][j] = sc.sub(x[i - 1], y[j - 1]) + Math.max(t.M[i - 1][j - 1], t.X[i - 1][j - 1], t.Y[i - 1][j - 1]);
    if (i > 0) t.X[i][j] = Math.max(t.M[i - 1][j] - sc.d, t.X[i - 1][j] - sc.e);
    if (j > 0) t.Y[i][j] = Math.max(t.M[i][j - 1] - sc.d, t.Y[i][j - 1] - sc.e);
  }
  return Math.max(t.M[n][m], t.X[n][m] + sc.c, t.Y[n][m] + sc.c);
}
function recompute() {
  let [x, y] = strs, vit = pairViterbi(x, y, pp), fw = pairForward(x, y, pp), sc = scoresFromHmm(pp);
  res = { vit, fwd: fw.prob, post: matchPosterior(x, y, pp), sc, nw: nwAffine(x, y, sc), base: (x.length + y.length) * Math.log(Q_BASE) + Math.log(pp.tau) };
}
function randomPair() {                  // 1 本を作り、もう 1 本はそれを少し変えたもの（置きかえ・ぬけ・追加）
  let x = ''; for (let k = 0; k < rndInt(6, 10); k++) x += DNA[rndInt(0, 3)];
  let y = ''; for (let ch of x) { let u = rnd(); if (u < 0.12) continue; y += u < 0.27 ? DNA[rndInt(0, 3)] : ch; if (rnd() < 0.1) y += DNA[rndInt(0, 3)]; }
  return [x, y.slice(0, MAX_LEN) || 'A'];
}

function draw() {
  background(...BG);
  let [x, y] = strs, n = x.length, m = y.length;
  hudTitle('ペア HMM と配列アラインメント：2 本の文字列を「一致 M・すき間 X・すき間 Y」の 3 状態が同時に出す', 'A C G T 文字を足す　Backspace 消す　Tab / クリック 上下の切りかえ　↑↓ δ = ' + fmtN(pp.delta, 2) + '　← → ε = ' + fmtN(pp.eps, 2) + '　R 新しい 2 本');
  // ---- 入力
  hitBoxes = [];
  for (let k = 0; k < 2; k++) {
    let yy = 112 + k * 34; noStroke(); fill(...(k === active ? LAN : DIMC)); textSize(14); textAlign(LEFT, BASELINE); text(k ? '下 y：' : '上 x：', 40, yy);
    fill(...INK); textSize(22); textFont('monospace'); text(strs[k] + (k === active && frameCount % 60 < 30 ? '▏' : ''), 100, yy + 2); textFont('sans-serif');
    hitBoxes.push({ x: 30, y: yy - 24, w: 420, h: 32 });
  }
  // ---- 表：色 = 対応している確率、線 = ビタビの並べ方
  let gx = 80, gy = 210, cs = Math.min(46, (height - gy - 60) / (n + 1), (width * 0.5 - gx) / (m + 1)), cell = (i, j) => [gx + j * cs, gy + i * cs];
  note('マスの明るさ = P(x_i と y_j が対応)　黄色の線 = ビタビの並べ方（ななめ = 一致 M、たて = X、よこ = Y）', 40, gy - 22, DIMC, 12);
  textFont('monospace');
  for (let i = 1; i <= n; i++) { noStroke(); fill(...INK); textSize(16); textAlign(CENTER, CENTER); text(x[i - 1], gx - cs * 0.1, gy + (i + 0.5) * cs); }
  for (let j = 1; j <= m; j++) { noStroke(); fill(...INK); textSize(16); textAlign(CENTER, CENTER); text(y[j - 1], gx + (j + 0.5) * cs, gy + cs * 0.5); }
  textFont('sans-serif');
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) { let p = res.post[i - 1][j - 1], [cx, cy] = cell(i, j); noStroke(); fill(PANEL[0] + p * (ROSE[0] - PANEL[0]), PANEL[1] + p * (ROSE[1] - PANEL[1]), PANEL[2] + p * (ROSE[2] - PANEL[2])); rect(cx + 1, cy + 1, cs - 2, cs - 2, 3); if (p > 0.3 && cs > 26) { fill(...INK); textSize(9); textAlign(CENTER, CENTER); text(fmtN(p, 2), cx + cs / 2, cy + cs / 2); } }
  let pts = [[gx + cs, gy + cs]]; for (let c of res.vit.cols) pts.push([gx + (c.j + 1) * cs, gy + (c.i + 1) * cs]);
  stroke(...LAN); strokeWeight(3); polyline(pts);
  // ---- 右：並べ方と数字
  let rx = Math.max(gx + (m + 1) * cs + 50, width * 0.52), top = '', mid = '', bot = '';
  for (let c of res.vit.cols) { let a = c.s === 'Y' ? '-' : x[c.i - 1], b = c.s === 'X' ? '-' : y[c.j - 1]; top += a; bot += b; mid += c.s === 'M' ? (a === b ? '|' : '.') : ' '; }
  note('ビタビの並べ方（| 同じ文字、. ちがう文字、- すき間）', rx, 130, LAN, 14);
  noStroke(); fill(...INK); textFont('monospace'); textSize(22); textAlign(LEFT, BASELINE); text(top, rx, 164); fill(...DIMC); text(mid, rx, 188); fill(...INK); text(bot, rx, 212); textFont('sans-serif');
  let lv = res.vit.logP, lf = lg(res.fwd), sc = res.sc;
  note('ビタビ：log P(いちばん良い並べ方) = ' + fmtN(lv, 3), rx, 256, LAN, 14);
  note('動的計画法の点数 ' + fmtN(res.nw, 3) + ' + 定数 ' + fmtN(res.base, 3) + ' = ' + fmtN(res.nw + res.base, 3) + (Math.abs(res.nw + res.base - lv) < 1e-9 ? '　✓ 同じ' : '　✗'), rx, 280, INK, 14);
  note('点数：同じ文字 ' + fmtN(sc.sub('A', 'A'), 2) + '　ちがう文字 ' + fmtN(sc.sub('A', 'C'), 2) + '　すき間の開始 −' + fmtN(sc.d, 2) + '　のばす −' + fmtN(sc.e, 2), rx, 304, DIMC, 13);
  note('（定数 = 全部の文字を「でたらめに出した」ときの log 確率 + log τ。点数は、でたらめとくらべた対数の比）', rx, 326, DIMC, 11);
  note('前向き：log P(全部の並べ方の合計) = ' + fmtN(lf, 3), rx, 366, ROSE, 14);
  let share = res.fwd > 0 ? Math.exp(lv - lf) : 0; noStroke(); fill(...LINEC); rect(rx, 380, 300, 14, 4); fill(...LAN); rect(rx, 380, 300 * clampv(share, 0, 1), 14, 4);
  note('いちばん良い並べ方は、全体の ' + fmtN(share * 100, 1) + '% だけ', rx + 310, 392, INK, 13);
  note('似た並べ方がたくさんあるとき、1 本だけを信じるのはあぶない → マスごとの確率（左の表）を見る', rx, 420, DIMC, 12);
  note('δ を大きくすると すき間が入りやすく、ε を大きくすると長いすき間が出やすい', rx, 444, DIMC, 12);
  drawSelfTest();
}

function mousePressed() { for (let k = 0; k < hitBoxes.length; k++) { let h = hitBoxes[k]; if (mouseX >= h.x && mouseX < h.x + h.w && mouseY >= h.y && mouseY < h.y + h.h) active = k; } }
function keyPressed() {
  let k = String(key);
  if (k.length === 1 && DNA.includes(k.toUpperCase())) { if (strs[active].length < MAX_LEN) { strs[active] += k.toUpperCase(); recompute(); } return false; }
  if (key === BACKSPACE) { strs[active] = strs[active].slice(0, -1); recompute(); }
  if (key === TAB) active = 1 - active;
  if (key === 'r' || key === 'R') { strs = randomPair(); recompute(); }
  if (key === UP_ARROW) { pp.delta = Math.min(0.4, Math.round((pp.delta + 0.02) * 100) / 100); recompute(); }
  if (key === DOWN_ARROW) { pp.delta = Math.max(0.02, Math.round((pp.delta - 0.02) * 100) / 100); recompute(); }
  if (key === RIGHT_ARROW) { pp.eps = Math.min(0.8, Math.round((pp.eps + 0.05) * 100) / 100); recompute(); }
  if (key === LEFT_ARROW) { pp.eps = Math.max(0.05, Math.round((pp.eps - 0.05) * 100) / 100); recompute(); }
  return false;
}

// やってみよう
// 1. 上を GATTACA、下を GATTACA にすると、表はどうなる？ 下の 1 文字を消すと、すき間はどこに入る？
// 2. 上を AAAA、下を AAA にすると、いちばん良い並べ方は全体の何 %？ なぜ小さい？（すき間の場所が 4 通りある）
// 3. ↑ で δ を大きくしていくと、「ちがう文字」として並べていた所が、すき間 2 つに変わることがある。どこで変わる？
// 4. ← で ε を小さくすると、長いすき間 1 つと短いすき間 2 つのどちらが選ばれやすい？

// ---- 自己テスト
function pairBrute(x, y, P) {            // 総当たり：M・X・Y の道を全部たどる（X のすぐあとに Y、Y のすぐあとに X は来ない）
  let n = x.length, m = y.length, out = { sum: 0, best: 0, count: 0, mass: [] };
  for (let i = 0; i < n; i++) out.mass.push(new Array(m).fill(0));
  (function rec(i, j, prev, p, matched) {
    if (i === n && j === m) { let q = p * P.tau; out.sum += q; out.count++; if (q > out.best) out.best = q; for (let [a, b] of matched) out.mass[a][b] += q; return; }
    let toM = prev === 'M' ? 1 - 2 * P.delta - P.tau : 1 - P.eps - P.tau;
    if (i < n && j < m) rec(i + 1, j + 1, 'M', p * toM * pMatch(P, x[i], y[j]), matched.concat([[i, j]]));
    if (i < n && prev !== 'Y') rec(i + 1, j, 'X', p * (prev === 'M' ? P.delta : P.eps) * Q_BASE, matched);
    if (j < m && prev !== 'X') rec(i, j + 1, 'Y', p * (prev === 'M' ? P.delta : P.eps) * Q_BASE, matched);
  })(0, 0, 'M', 1, []);
  return out;
}
function selfTest() {
  selfTestResults = [];
  seedRng(810);
  let P0 = { delta: 0.1, eps: 0.3, tau: 0.05, same: 0.85 }, tot = 0; for (let a of DNA) for (let b of DNA) tot += pMatch(P0, a, b);
  check('確率の合計：M が出す 16 通り = 1、M から出る矢印 (1 − 2δ − τ) + 2δ + τ = 1', near(tot, 1, 1e-12) && near(1 - 2 * P0.delta - P0.tau + 2 * P0.delta + P0.tau, 1, 1e-12));
  let rs = (len) => { let s = ''; for (let k = 0; k < len; k++) s += DNA[rndInt(0, 3)]; return s; }, worstB = 0, worstS = 0, worstP = 0, counts = 0;
  for (let k = 0; k < 25; k++) {
    let P = k < 5 ? P0 : { delta: 0.03 + rnd() * 0.3, eps: 0.1 + rnd() * 0.6, tau: 0.02 + rnd() * 0.1, same: 0.4 + rnd() * 0.55 }, x = rs(rndInt(0, 4)), y = rs(rndInt(0, 4)), bf = pairBrute(x, y, P), v = pairViterbi(x, y, P), fw = pairForward(x, y, P), post = matchPosterior(x, y, P);
    worstB = Math.max(worstB, Math.abs(Math.exp(v.logP) - bf.best) / bf.best); worstS = Math.max(worstS, Math.abs(fw.prob - bf.sum) / bf.sum); counts += bf.count;
    for (let i = 0; i < x.length; i++) for (let j = 0; j < y.length; j++) worstP = Math.max(worstP, Math.abs(post[i][j] - bf.mass[i][j] / bf.sum));
  }
  check('短い文字列 25 組（合わせて ' + counts + ' 通りの並べ方を総当たり）：ビタビ = いちばん良い並べ方の確率', worstB < 1e-10);
  check('同じ 25 組：前向き = 全部の並べ方の確率の合計', worstS < 1e-10);
  check('同じ 25 組：マスごとの「対応している確率」= 総当たり', worstP < 1e-10);
  let worstN = 0, okGe = true, worstBk = 0;
  for (let k = 0; k < 40; k++) {
    let P = k < 10 ? P0 : { delta: 0.03 + rnd() * 0.3, eps: 0.1 + rnd() * 0.6, tau: 0.02 + rnd() * 0.1, same: 0.4 + rnd() * 0.55 }, x = rs(rndInt(0, 12)), y = rs(rndInt(0, 12)), v = pairViterbi(x, y, P), fw = pairForward(x, y, P);
    worstN = Math.max(worstN, Math.abs(nwAffine(x, y, scoresFromHmm(P)) + (x.length + y.length) * Math.log(Q_BASE) + Math.log(P.tau) - v.logP));
    if (fw.prob < Math.exp(v.logP) * (1 - 1e-12)) okGe = false;
    worstBk = Math.max(worstBk, Math.abs(pairBackward(x, y, P).M[0][0] - fw.prob) / fw.prob);
    let ci = 0, cj = 0; for (let c of v.cols) { if (c.s !== 'Y') ci++; if (c.s !== 'X') cj++; } if (ci !== x.length || cj !== y.length) okGe = false;
  }
  check('でたらめな 40 組（長さ 12 まで、パラメータもいろいろ）：ビタビの log 確率 = Needleman–Wunsch の点数 + 定数（差 < 1e-9）', worstN < 1e-9);
  check('前向き ≥ ビタビ、後ろ向きの合計 = 前向きの合計、並べ方は両方の文字を全部使う', okGe && worstBk < 1e-10);
  let same = pairViterbi('GATTACA', 'GATTACA', P0), gap = pairViterbi('GATTACA', 'GATACA', P0);
  check('同じ文字列どうしは全部「一致」。1 文字ぬけた文字列は、すき間 1 つと一致 6 つ', same.cols.every((c) => c.s === 'M') && gap.cols.filter((c) => c.s === 'X').length === 1 && gap.cols.filter((c) => c.s === 'M').length === 6);
  let e0 = pairViterbi('', '', P0), e1 = pairForward('', 'AC', P0);
  check('空の文字列でも動く：P(空, 空) = τ、P(空, AC) = δ ε τ / 16', near(Math.exp(e0.logP), P0.tau, 1e-12) && near(e1.prob, (P0.delta * P0.eps * P0.tau) / 16, 1e-15) && noNaN(matchPosterior('', 'AC', P0)));
  let sh = Math.exp(pairViterbi('AAAA', 'AAA', P0).logP) / pairForward('AAAA', 'AAA', P0).prob;
  check('AAAA と AAA：いちばん良い並べ方は全体の ' + fmtN(sh * 100, 1) + '%（すき間の場所が 4 通りあるので 30% 未満）', sh < 0.3 && sh > 0.15);
  reportSelfTest();
}

// ==================================================
// ここから下は「HMM の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（霧の夜と灯り：黄 = 見える観測、ばら色 = 隠れた状態）
const BG = [27, 33, 44];                // 背景（霧の夜の青ねずみ色）
const INK = [230, 234, 240];            // 文字（やわらかい白）
const LAN = [250, 208, 100], ROSE = [236, 124, 150], AQUA = [110, 200, 210], LILAC = [176, 156, 236], LEAF = [150, 210, 130], TANG = [240, 160, 96];
const DIMC = [142, 154, 172], PANEL = [38, 46, 60], LINEC = [76, 88, 108];
const ST_COLS = [ROSE, AQUA, LAN, LILAC, LEAF, TANG, [200, 200, 210], [130, 150, 240]];   // 状態の色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function argMax(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtP(v) {                      // 確率の表示：小さい数は 1.2e-5 の形で
  if (typeof v !== 'number' || v !== v) return '?';
  if (v === 0) return '0'; if (Math.abs(v) >= 0.001) return v.toFixed(v >= 0.1 ? 3 : 4); return v.toExponential(1);
}
function hudTitle(t, sub) {             // 左上の見出しと操作の説明（日本語は 1 文字ずつ折り返す）
  textWrap(CHAR); noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62, width - 60);
}
function panelBox(x, y, w, h) { noStroke(); fill(...PANEL); rect(x, y, w, h, 8); }
function note(s, x, y, col, sz) { noStroke(); fill(...(col || DIMC)); textSize(sz || 13); textAlign(LEFT, BASELINE); text(s, x, y); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
// ---- 隠れマルコフモデルの道具
// モデル m = { p0: はじめの分布 π, tr: 遷移行列 A（tr[i][j] = 状態 i の次に j）, em: 出力行列 B（em[j][k] = 状態 j が記号 k を出す） }
// どの計算も「出力の表」eb[t][j] = b_j(x_t)（時刻 t の観測を状態 j が出す確率）を受け取る → 記号でも数（正規分布）でも同じ道具が使える
function lg(p) { return p > 0 ? Math.log(p) : -Infinity; }          // log 0 は −∞（NaN にしない）
function logSumExp(a) {                // log(Σ e^a_i)：いちばん大きい値を先に引く。全部 −∞ なら −∞
  let m = -Infinity; for (let v of a) if (v > m) m = v;
  if (m === -Infinity) return -Infinity;
  let s = 0; for (let v of a) s += Math.exp(v - m);
  return m + Math.log(s);
}
function normRow(r) { let s = sumOf(r); return s > 1e-300 ? r.map((v) => v / s) : r.map(() => 1 / r.length); }   // 合計 1 に（全部 0 なら一様に）
function rowSumErr(a) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - 1)); return d; }
function maxAbsDiff(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d = Math.max(d, Array.isArray(a[i]) ? maxAbsDiff(a[i], b[i]) : Math.abs(a[i] - b[i])); return d; }
function vecMat(v, a) {                // 横ベクトル × 行列：1 歩先の分布
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function emTable(m, xs) { return xs.map((x) => m.em.map((r) => r[x])); }   // 記号の列 → 出力の表
function hmmSample(m, n) {             // π, A, B からサイコロで列を作る：zs = 隠れた状態、xs = 観測
  let z = sampleFrom(m.p0), zs = [], xs = [];
  for (let t = 0; t < n; t++) { if (t > 0) z = sampleFrom(m.tr[z]); zs.push(z); xs.push(sampleFrom(m.em[z])); }
  return { zs, xs };
}
// ★ 前向き：α_t(j) = P(x_1..x_t, z_t = j) = b_j(x_t) Σ_i α_{t−1}(i) a_ij。尤度 P(x) = Σ_j α_T(j)
function fwdPlain(m, eb) {
  let n = m.p0.length, al = [];
  for (let t = 0; t < eb.length; t++) {
    let prev = t === 0 ? null : al[t - 1], row = new Array(n);
    for (let j = 0; j < n; j++) { let s = 0; if (t === 0) s = m.p0[j]; else for (let i = 0; i < n; i++) s += prev[i] * m.tr[i][j]; row[j] = s * eb[t][j]; }
    al.push(row);
  }
  return { al, lik: al.length ? sumOf(al[al.length - 1]) : 1 };
}
// ★ 後ろ向き：β_t(i) = P(x_{t+1}..x_T | z_t = i) = Σ_j a_ij b_j(x_{t+1}) β_{t+1}(j)。尤度 = Σ_i π_i b_i(x_1) β_1(i)
function bwdPlain(m, eb) {
  let n = m.p0.length, len = eb.length, be = new Array(len);
  for (let t = len - 1; t >= 0; t--) {
    be[t] = new Array(n).fill(t === len - 1 ? 1 : 0);
    if (t < len - 1) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) be[t][i] += m.tr[i][j] * eb[t + 1][j] * be[t + 1][j];
  }
  let lik = 0; if (len) for (let i = 0; i < n; i++) lik += m.p0[i] * eb[0][i] * be[0][i]; else lik = 1;
  return { be, lik };
}
// ★ スケーリングつきの前向き：毎時刻 合計 c_t で割る。ah[t] = P(z_t | x_1..x_t)（= フィルタ）、log P(x) = Σ log c_t
//   c_t = 0（ありえない観測）なら logLik = −∞ にして、その時刻は一様分布で先へ進む（NaN を作らない）
function fwdScaled(m, eb) {
  let n = m.p0.length, ah = [], cs = [], logLik = 0;
  for (let t = 0; t < eb.length; t++) {
    let pred = t === 0 ? m.p0 : vecMat(ah[t - 1], m.tr), row = pred.map((v, j) => v * eb[t][j]), c = sumOf(row);
    if (!(c > 0)) { logLik = -Infinity; row = new Array(n).fill(1 / n); c = 0; } else { row = row.map((v) => v / c); if (logLik !== -Infinity) logLik += Math.log(c); }
    ah.push(row); cs.push(c);
  }
  return { ah, cs, logLik };
}
function bwdScaled(m, eb, cs) {         // 同じ c_t で割った後ろ向き。γ_t(i) = ah[t][i] × bh[t][i]
  let n = m.p0.length, len = eb.length, bh = new Array(len);
  for (let t = len - 1; t >= 0; t--) {
    bh[t] = new Array(n).fill(t === len - 1 ? 1 : 0);
    if (t < len - 1) { let c = cs[t + 1] > 0 ? cs[t + 1] : 1; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += m.tr[i][j] * eb[t + 1][j] * bh[t + 1][j]; bh[t][i] = s / c; } }
  }
  return bh;
}
function fwdLog(m, eb) {                // 対数のまま：log α_t(j) = log b_j(x_t) + logSumExp_i(log α_{t−1}(i) + log a_ij)
  let n = m.p0.length, la = [], lt = m.tr.map((r) => r.map(lg)), buf = new Array(n);
  for (let t = 0; t < eb.length; t++) {
    let row = new Array(n);
    for (let j = 0; j < n; j++) { let s; if (t === 0) s = lg(m.p0[j]); else { for (let i = 0; i < n; i++) buf[i] = la[t - 1][i] + lt[i][j]; s = logSumExp(buf); } row[j] = s + lg(eb[t][j]); }
    la.push(row);
  }
  return { la, logLik: la.length ? logSumExp(la[la.length - 1]) : 0 };
}
// ★ 平滑化：γ_t(i) = P(z_t = i | 全部の観測)。filt = フィルタ P(z_t | x_1..x_t)
function smoothAll(m, eb) {
  let f = fwdScaled(m, eb), bh = bwdScaled(m, eb, f.cs);
  let gam = f.ah.map((a, t) => normRow(a.map((v, i) => v * bh[t][i])));
  return { filt: f.ah, gam, bh, cs: f.cs, logLik: f.logLik };
}
function xiAt(m, eb, sm, t) {           // ξ_t(i, j) = P(z_t = i, z_{t+1} = j | 全部の観測)
  let n = m.p0.length, c = sm.cs[t + 1] > 0 ? sm.cs[t + 1] : 1, out = [];
  for (let i = 0; i < n; i++) { out.push(new Array(n)); for (let j = 0; j < n; j++) out[i][j] = (sm.filt[t][i] * m.tr[i][j] * eb[t + 1][j] * sm.bh[t + 1][j]) / c; }
  return out;
}
// ★ ビタビ（対数）：dl[t][j] = 時刻 t に状態 j で終わるいちばん良い道の log 確率、bp[t][j] = そのとき 1 つ前にいた状態（戻り矢印）
function viterbiLog(m, eb) {
  let n = m.p0.length, len = eb.length, dl = [], bp = [], lt = m.tr.map((r) => r.map(lg));
  for (let t = 0; t < len; t++) {
    let row = new Array(n), back = new Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      let best = -Infinity, arg = -1;
      if (t === 0) best = lg(m.p0[j]); else for (let i = 0; i < n; i++) { let v = dl[t - 1][i] + lt[i][j]; if (v > best) { best = v; arg = i; } }
      row[j] = best + lg(eb[t][j]); back[j] = arg;
    }
    dl.push(row); bp.push(back);
  }
  let vitPath = new Array(len).fill(0), logP = len ? -Infinity : 0;
  if (len) { let z = argMax(dl[len - 1]); logP = dl[len - 1][z]; for (let t = len - 1; t >= 0; t--) { vitPath[t] = z; z = bp[t][z] >= 0 ? bp[t][z] : 0; } }
  return { vitPath, logP, dl, bp };
}
function pathLogProb(m, eb, zs) {       // 1 本の道 zs と観測がいっしょに起きる log 確率
  let s = 0; for (let t = 0; t < zs.length; t++) s += (t === 0 ? lg(m.p0[zs[0]]) : lg(m.tr[zs[t - 1]][zs[t]])) + lg(eb[t][zs[t]]);
  return s;
}
function postDecode(gam) { return gam.map(argMax); }                 // 事後復号：時刻ごとにいちばんありそうな状態
// ★ 総当たり：N^T 本の道を全部ためす（短い列だけ）。尤度、γ、ξ、いちばん良い道
function bruteAll(m, eb) {
  let n = m.p0.length, len = eb.length, total = Math.pow(n, len), zs = new Array(len).fill(0);
  let lik = 0, gam = eb.map(() => new Array(n).fill(0)), xi = eb.slice(1).map(() => m.p0.map(() => new Array(n).fill(0))), bestP = -1, best = null;
  for (let k = 0; k < total; k++) {
    let r = k; for (let t = len - 1; t >= 0; t--) { zs[t] = r % n; r = Math.floor(r / n); }
    let p = 1; for (let t = 0; t < len && p > 0; t++) p *= (t === 0 ? m.p0[zs[0]] : m.tr[zs[t - 1]][zs[t]]) * eb[t][zs[t]];
    if (p > bestP) { bestP = p; best = zs.slice(); }
    if (p === 0) continue;
    lik += p; for (let t = 0; t < len; t++) { gam[t][zs[t]] += p; if (t > 0) xi[t - 1][zs[t - 1]][zs[t]] += p; }
  }
  if (lik > 0) { gam = gam.map((g) => g.map((v) => v / lik)); xi = xi.map((x) => x.map((r) => r.map((v) => v / lik))); }
  return { lik, gam, xi, best, bestP, paths: total };
}
function stationaryOf(tr) {             // 定常分布 π A = π（なまけた連鎖 (π + πA)/2 をくり返す。周期があっても収束する）
  let v = new Array(tr.length).fill(1 / tr.length);
  for (let k = 0; k < 4000; k++) { let w = vecMat(v, tr), d = 0; for (let i = 0; i < v.length; i++) { let u = (v[i] + w[i]) / 2; d = Math.max(d, Math.abs(u - v[i])); v[i] = u; } if (d < 1e-15) break; }
  return normRow(v);
}
function hmmLogLik(m, xs) { return fwdScaled(m, emTable(m, xs)).logLik; }   // 記号の列の対数尤度 log P(x)
function predictK(belief, tr, k) { let v = belief.slice(); for (let s = 0; s < k; s++) v = vecMat(v, tr); return v; }   // k 歩先の予測：A を k 回掛ける
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...LINEC); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...DIMC); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(4), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(4), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawCurve(g, arr, col, sw, xOff, from, to) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let a = from || 0, b = to === undefined ? arr.length : to, n = b - a, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = a; i < b; i += stride) if (isFinite(arr[i])) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10, 2); fill(...INK); text(s, x + 22, y); y += 20; }
}
function drawMatrix(a, x, y, cw, ch, rowNames, colNames, opts) {   // 行列を色つきの表で（明るい = 大きい）
  opts = opts || {}; let d = opts.digits === undefined ? 2 : opts.digits, col = opts.col || AQUA;
  textAlign(CENTER, CENTER); textSize(opts.ts || 13);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) {
    let v = a[i][j], t = clampv(Math.abs(v) / (opts.hi || 1), 0, 1); noStroke();
    fill(PANEL[0] + t * (col[0] * 0.75 - PANEL[0]), PANEL[1] + t * (col[1] * 0.75 - PANEL[1]), PANEL[2] + t * (col[2] * 0.75 - PANEL[2])); rect(x + j * cw, y + i * ch, cw - 2, ch - 2, 3);
    if (opts.numbers !== false) { fill(...INK); text(fmtN(v, d), x + j * cw + cw / 2, y + i * ch + ch / 2); }
  }
  fill(...DIMC);
  if (rowNames) for (let i = 0; i < a.length; i++) { textAlign(RIGHT, CENTER); text(rowNames[i], x - 6, y + i * ch + ch / 2); }
  if (colNames) for (let j = 0; j < a[0].length; j++) { textAlign(CENTER, BOTTOM); text(colNames[j], x + j * cw + cw / 2, y - 3); }
}
function drawBand(arr, x, y, w, h, colOf) {   // 状態の列を色の帯で（同じ色が続くところは 1 つの四角にまとめる）
  let n = arr.length, s = 0; noStroke();
  for (let t = 1; t <= n; t++) if (t === n || arr[t] !== arr[s]) { let c = colOf(arr[s]); if (c) { fill(...c); rect(x + (s / n) * w, y, ((t - s) / n) * w + 0.6, h); } s = t; }
}
function arrowLine(x1, y1, x2, y2, hs) { // 矢印
  let L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L; hs = hs || 7;
  line(x1, y1, x2 - ux * hs * 0.6, y2 - uy * hs * 0.6);
  push(); noStroke(); triangle(x2, y2, x2 - ux * hs - uy * hs * 0.5, y2 - uy * hs + ux * hs * 0.5, x2 - ux * hs + uy * hs * 0.5, y2 - uy * hs - ux * hs * 0.5); pop();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LEAF : [255, 90, 90])); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x === undefined ? width - 170 : x, y === undefined ? height - 14 : y); }
