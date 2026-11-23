// ============================================
// 01 マルコフ決定過程とグリッドワールド ─ 状態・行動・報酬・割引率・すべりやすさ
// マス = 状態 s、上下左右 = 行動 a。意図した向きに進むのは 1 − slip の確率、残りは左右の直角へすべる。
// でたらめに動くエージェントの「割引つき報酬の合計」G = r1 + γ r2 + γ² r3 + … を集めると、その平均が状態の価値 V(S) になる
// クリック マスを 床→壁→宝→穴 と切りかえ / ↑↓ 割引率 γ / ← → すべりやすさ / C 1 歩ごとの報酬 / F 速さ / スペース やり直し
// マウスを乗せたマスの「行き先の確率」を表示
// ============================================

let mapRows = [                          // ★ 地図（. 床、# 壁、S スタート、G 宝 +1、P 落とし穴 −1）
  '..........',
  '.....#....',
  '..........',
  'S........G',
  '.PPPPPPPP.',
  '..........',
];
let gamma = 0.9, slip = 0.2;             // ★ 割引率 γ とすべりやすさ
const STEP_COSTS = [0, -0.04, -0.1];     // ★ 1 歩ごとの報酬の候補（C で切りかえ）
let costIdx = 1, gw, mdp, startS = 0, vRand = [], fast = false;
let agentPos = 0, epReturn = 0, epDisc = 1, epLen = 0, returns = [], trail = [], gx = 40, gy = 110, cs = 60;

function setup() {
  createCanvas(windowWidth, windowHeight);
  gw = gridParse(mapRows);
  selfTest();
  seedRng(11); rebuild();
}

function rebuild() {                     // 地図や γ・slip が変わったら作り直す
  mdp = buildMdp(gw, slip, STEP_COSTS[costIdx]);
  startS = gw.cell.indexOf('S');
  vRand = evalRandomPolicy(mdp, gamma, 1e-10).V;
  returns = []; newEpisode();
}
function newEpisode() { agentPos = startS; epReturn = 0; epDisc = 1; epLen = 0; trail = [startS]; }

// ★ でたらめな方策（4 方向を 1/4 ずつ）の価値：V(s) = Σ_a ¼ Σ_s' p (r + γ V(s')) を収束するまでくり返す
function evalRandomPolicy(m, gam, tol) {
  let V = new Array(m.nS).fill(0), d = Infinity, sweeps = 0;
  while (d >= tol && sweeps < 20000) {
    d = 0;
    for (let s = 0; s < m.nS; s++) {
      if (m.term[s]) continue;
      let v = 0; for (let a = 0; a < 4; a++) v += 0.25 * qValue(m, V, gam, s, a);
      d = Math.max(d, Math.abs(v - V[s])); V[s] = v;
    }
    sweeps++;
  }
  return { V, sweeps };
}
// ★ 環境の 1 歩：確率 P[s][a] にしたがって次のマスを 1 つ選ぶ
function sampleStep(m, s, a) { let u = rnd(), c = 0; for (let o of m.P[s][a]) { c += o.p; if (u < c) return o; } return m.P[s][a][m.P[s][a].length - 1]; }
function agentStep() {
  let a = Math.floor(rnd() * 4), o = sampleStep(mdp, agentPos, a);
  epReturn += epDisc * o.r; epDisc *= gamma; epLen++; agentPos = o.s2; trail.push(agentPos);
  if (trail.length > 40) trail.shift();
  if (mdp.term[agentPos] || epLen >= 300) { returns.push(epReturn); if (returns.length > 3000) returns.shift(); newEpisode(); }
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (fast) { while (performance.now() - t0 < 5) agentStep(); } else if (frameCount % 6 === 0) agentStep();

  cs = Math.min(64, (width * 0.55 - 60) / gw.w, (height - 260) / gw.h);
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('マルコフ決定過程：γ = ' + gamma.toFixed(2) + '　すべり = ' + slip.toFixed(1) + '　1 歩の報酬 = ' + STEP_COSTS[costIdx], 40, 42);
  fill(170, 176, 210); textSize(15);
  text('クリック 床→壁→宝→穴　↑↓ γ　← → すべり　C 1 歩の報酬　F 速さ（' + (fast ? '速い' : 'ふつう') + '）　スペース やり直し', 40, 68);

  drawCells(gw, gx, gy, cs);
  // 価値（でたらめ方策）を小さく表示
  textSize(Math.max(10, cs * 0.22)); textAlign(CENTER, BOTTOM);
  for (let s = 0; s < mdp.nS; s++) if (!mdp.term[s]) { let [x, y] = cellXY(gw, s, gx, gy, cs); fill(150, 156, 200); text(fmtN(vRand[s]), x + cs / 2, y + cs - 3); }
  // 足あと
  stroke(...CYAN, 140); strokeWeight(3);
  polyline(trail.map((s) => { let [x, y] = cellXY(gw, s, gx, gy, cs); return [x + cs / 2, y + cs / 2]; }));
  let [ax, ay] = cellXY(gw, agentPos, gx, gy, cs); noStroke(); fill(...CYAN); circle(ax + cs / 2, ay + cs / 2, cs * 0.45);

  // ---- マウスの下のマスの遷移確率
  let hs = cellAt(gw, gx, gy, cs, mouseX, mouseY), px = gx + gw.w * cs + 30, py = gy + 10;
  fill(230); textAlign(LEFT, TOP); textSize(16);
  text('このエピソード：' + epLen + ' 歩、G = ' + fmtN(epReturn, 3), px, py);
  text('集めた G の平均（' + returns.length + ' 回）= ' + (returns.length ? fmtN(meanOf(returns), 3) : '?'), px, py + 26);
  fill(...GOLD); text('計算した V(S)（でたらめ方策）= ' + fmtN(vRand[startS], 3), px, py + 52);
  if (hs >= 0 && !mdp.term[hs]) {
    fill(230); text('マス (' + (hs % gw.w) + ', ' + Math.floor(hs / gw.w) + ') の P(s′ | s, a)：', px, py + 96);
    textSize(14);
    for (let a = 0; a < 4; a++) {
      let outs = mdp.P[hs][a].map((o) => '(' + (o.s2 % gw.w) + ',' + Math.floor(o.s2 / gw.w) + ') ' + fmtN(o.p) + ' r=' + o.r).join('  ');
      fill(200, 205, 235); text(DIR_NAMES[a] + '：' + outs, px, py + 122 + a * 22);
    }
    let [hx, hy] = cellXY(gw, hs, gx, gy, cs); noFill(); stroke(...GOLD); strokeWeight(2); rect(hx + 2, hy + 2, cs - 4, cs - 4, 4);
  } else { fill(150, 156, 190); textSize(14); text('マスにマウスを乗せると、4 つの行動の行き先と確率が出る', px, py + 96); }

  // ---- 集めた G のヒストグラム
  let g = { x: px, y: py + 250, w: Math.min(440, width - px - 40), h: 150, x0: -1.5, x1: 1.5, y0: 0, y1: 1 };
  let bins = new Array(30).fill(0); for (let r of returns) bins[clampv(Math.floor((r + 1.5) / 0.1), 0, 29)]++;
  g.y1 = Math.max(1, maxOf(bins));
  plotAxes(g, 'G（割引つき報酬の合計）', 'エピソードの数', [-1.5, -1, 0, 1, 1.5], [0, g.y1]);
  noStroke(); fill(...CYAN, 190);
  bins.forEach((b, i) => rect(gX(g, -1.5 + i * 0.1) + 1, gY(g, b), g.w / 30 - 2, gY(g, 0) - gY(g, b)));
  stroke(...GOLD); strokeWeight(2); line(gX(g, vRand[startS]), g.y, gX(g, vRand[startS]), g.y + g.h);
  noStroke(); fill(150, 156, 190); textSize(13); textAlign(LEFT, BASELINE);
  text('金の線 = 計算した V(S)。たくさん集めると平均がここに近づく', 40, gy + gw.h * cs + 34);
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  let s = cellAt(gw, gx, gy, cs, mouseX, mouseY);
  if (s < 0 || gw.cell[s] === 'S') return;
  let order = ['.', '#', 'G', 'P'];
  gw.cell[s] = order[(order.indexOf(gw.cell[s]) + 1) % 4];
  rebuild();
}
function keyPressed() {
  if (key === UP_ARROW) gamma = Math.min(0.99, Math.round((gamma + 0.05) * 100) / 100);
  if (key === DOWN_ARROW) gamma = Math.max(0, Math.round((gamma - 0.05) * 100) / 100);
  if (key === RIGHT_ARROW) slip = Math.min(0.8, Math.round((slip + 0.1) * 10) / 10);
  if (key === LEFT_ARROW) slip = Math.max(0, Math.round((slip - 0.1) * 10) / 10);
  if (key === 'c' || key === 'C') costIdx = (costIdx + 1) % STEP_COSTS.length;
  if (key === 'f' || key === 'F') fast = !fast;
  if (key === UP_ARROW || key === DOWN_ARROW || key === LEFT_ARROW || key === RIGHT_ARROW || key === 'c' || key === 'C' || key === ' ') rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let gwT = gridParse(mapRows);           // テスト用の地図（画面の地図とは別）
  let okSum = true, okTerm = true, okDet = true;
  for (let sl of [0, 0.2, 0.5, 0.8]) {
    let m = buildMdp(gwT, sl, -0.04);
    for (let s = 0; s < m.nS; s++) for (let a = 0; a < 4; a++) {
      let tot = 0; for (let o of m.P[s][a]) { tot += o.p; if (o.p < 0) okSum = false; }
      if (!near(tot, 1, 1e-12)) okSum = false;
      if (m.term[s] && !(m.P[s][a].length === 1 && m.P[s][a][0].s2 === s && m.P[s][a][0].r === 0)) okTerm = false;
      if (sl === 0 && !m.term[s] && m.P[s][a].length !== 1) okDet = false;
    }
  }
  check('どの状態・行動でも遷移確率の合計 = 1、どれも ≥ 0（すべり 0, 0.2, 0.5, 0.8）', okSum);
  check('宝と落とし穴（終わりの状態）は動かず、報酬 0', okTerm);
  check('すべり 0 なら行き先は 1 つに決まる（確率 1）', okDet);
  // サンプリングの頻度 = 確率
  let m = buildMdp(gwT, 0.2, -0.04), s0 = 2 * gwT.w + 4, cnt = {}; seedRng(3);
  for (let i = 0; i < 20000; i++) { let o = sampleStep(m, s0, 1); cnt[o.s2] = (cnt[o.s2] || 0) + 1; }
  check('サンプルした行き先の割合 ≈ P(s′ | s, 右)（2 万回）', m.P[s0][1].every((o) => near((cnt[o.s2] || 0) / 20000, o.p, 0.015)));
  // でたらめ方策：集めた G の平均 ≈ 計算した V(S)
  let ev = evalRandomPolicy(m, 0.9, 1e-10), st = gwT.cell.indexOf('S'), gs = [];
  seedRng(4);
  for (let e = 0; e < 3000; e++) { let s = st, G = 0, d = 1; for (let t = 0; t < 300 && !m.term[s]; t++) { let o = sampleStep(m, s, Math.floor(rnd() * 4)); G += d * o.r; d *= 0.9; s = o.s2; } gs.push(G); }
  let mu = meanOf(gs), se = Math.sqrt(meanOf(gs.map((g) => (g - mu) * (g - mu))) / gs.length);
  check('でたらめ方策の G の平均 ' + fmtN(mu, 3) + ' ≈ 計算した V(S) ' + fmtN(ev.V[st], 3) + '（標準誤差の 3 倍以内）', Math.abs(mu - ev.V[st]) < 3 * se + 1e-3);
  check('価値は ±1 の範囲（γ < 1、報酬は −1〜1）で NaN なし', ev.V.every((v) => Math.abs(v) <= 1 / (1 - 0.9) && isFinite(v)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. すべり 0 と 0.5 で、でたらめ方策の V(S) はどう変わる？
// 2. γ を 0 にすると V(S) は？（すぐ次の報酬しか見ない）。γ = 0.99 では？
// 3. 落とし穴をふやす・宝をスタートの近くに置くと、G のヒストグラムの形はどう変わる？
// 4. 1 歩の報酬を −0.1 にすると「早く終わるほうがよい」世界になる。V(S) は？
// 5. でたらめではなく「いつも右」の方策にしたら、価値はどう計算する？（03 の方策評価）

// ==================================================
// ここから下は「強化学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [14, 16, 34];                // 背景（アーケードの紺）
const GOLD = [255, 196, 60], CYAN = [90, 215, 245], PINK = [245, 110, 170], LIME = [160, 230, 110], VIOLET = [175, 140, 255];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function argmaxR(q) {                  // いちばん大きい値の番号（同点はランダムに 1 つ）
  let m = -Infinity, best = [];
  for (let i = 0; i < q.length; i++) {
    if (q[i] > m + 1e-12) { m = q[i]; best = [i]; } else if (Math.abs(q[i] - m) <= 1e-12) best.push(i);
  }
  return best.length ? best[Math.floor(rnd() * best.length)] : 0;
}
function argmaxFirst(q) { let b = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[b]) b = i; return b; }   // 同点は若い番号
function maxOf(q) { let m = -Infinity; for (let v of q) if (v > m) m = v; return m; }
function epsGreedy(q, eps) { return rnd() < eps ? Math.floor(rnd() * q.length) : argmaxR(q); }   // ε の確率でランダム、ほかは貪欲
function softmaxArr(h, tau) {          // ボルツマン分布 exp(h/τ) / Σ（大きい数でもあふれないように最大値を引く）
  let m = maxOf(h), e = h.map((v) => Math.exp((v - m) / (tau || 1))), s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
function sampleFrom(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
function meanOf(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; let s = v.toFixed(d === undefined ? 2 : d); return s === '-0.00' || s === '-0.0' || s === '-0' ? s.slice(1) : s; }
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
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(70, 76, 110); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(150, 156, 190); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 235); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function smoothArr(a, k) {             // 直前 k 個の平均（ギザギザの学習曲線をならす）
  let out = [], s = 0;
  for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= k) s -= a[i - k]; out.push(s / Math.min(i + 1, k)); }
  return out;
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(220, 225, 245); text(s, x + 22, y); y += 20; }
}
// ---- グリッドワールド：文字の地図 '.' 床、'#' 壁、'S' スタート、'G' 宝（+1 で終わり）、'P' 落とし穴（−1 で終わり）
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];    // 行動 0 上、1 右、2 下、3 左
const DIR_NAMES = ['上', '右', '下', '左'];
function gridParse(rows) { return { w: rows[0].length, h: rows.length, cell: rows.join('').split('') }; }
function gridMove(gw, s, a) {          // 決まった向きに 1 マス。外や壁ならその場にとどまる
  let x = s % gw.w + DIRS[a][0], y = Math.floor(s / gw.w) + DIRS[a][1];
  if (x < 0 || y < 0 || x >= gw.w || y >= gw.h || gw.cell[y * gw.w + x] === '#') return s;
  return y * gw.w + x;
}
function isTerminalCell(c) { return c === 'G' || c === 'P'; }
function enterReward(c, stepR) { return c === 'G' ? 1 : c === 'P' ? -1 : stepR; }
// マルコフ決定過程を作る：P[s][a] = [{ s2, p, r }]。意図した向きに 1 − slip、左右の直角の向きに slip/2 ずつ
function buildMdp(gw, slip, stepR) {
  let nS = gw.w * gw.h, P = [], term = [];
  for (let s = 0; s < nS; s++) {
    let c = gw.cell[s]; term.push(isTerminalCell(c) || c === '#'); P.push([]);
    for (let a = 0; a < 4; a++) {
      if (term[s]) { P[s].push([{ s2: s, p: 1, r: 0 }]); continue; }       // 終わりのマス（と壁）はそこに留まり、報酬 0
      let outs = [[a, 1 - slip], [(a + 1) % 4, slip / 2], [(a + 3) % 4, slip / 2]], list = [];
      for (let [d, p] of outs) {
        if (p <= 0) continue;
        let s2 = gridMove(gw, s, d), r = enterReward(gw.cell[s2], stepR), e = list.find((o) => o.s2 === s2);
        if (e) e.p += p; else list.push({ s2, p, r });
      }
      P[s].push(list);
    }
  }
  return { nS, nA: 4, P, term, gw };
}
function qValue(mdp, V, gamma, s, a) { let q = 0; for (let o of mdp.P[s][a]) q += o.p * (o.r + gamma * V[o.s2]); return q; }
function viSweep(mdp, V, gamma) {      // 価値反復の 1 回：V(s) ← max_a Σ p (r + γ V(s'))。戻り値 = 最大の変化量
  let nv = V.slice(), d = 0;
  for (let s = 0; s < mdp.nS; s++) {
    if (mdp.term[s]) continue;
    let best = -Infinity; for (let a = 0; a < 4; a++) best = Math.max(best, qValue(mdp, V, gamma, s, a));
    nv[s] = best; d = Math.max(d, Math.abs(best - V[s]));
  }
  for (let s = 0; s < mdp.nS; s++) V[s] = nv[s];
  return d;
}
function valueIteration(mdp, gamma, tol, maxIt) {
  let V = new Array(mdp.nS).fill(0), its = 0, d = Infinity, deltas = [];
  while (d >= tol && its < (maxIt || 100000)) { d = viSweep(mdp, V, gamma); deltas.push(d); its++; }
  return { V, its, deltas };
}
function optimalActs(mdp, V, gamma, s, tol) {     // 最適な行動の集合（同点は全部）
  let q = [0, 1, 2, 3].map((a) => qValue(mdp, V, gamma, s, a)), m = maxOf(q);
  return [0, 1, 2, 3].filter((a) => q[a] >= m - (tol || 1e-9));
}
function evalPolicy(mdp, pi, gamma, tol, V0) {    // 方策評価：V(s) ← Σ p (r + γ V(s')) を、変化が tol 未満になるまで
  let V = V0 ? V0.slice() : new Array(mdp.nS).fill(0), sweeps = 0, d = Infinity;
  while (d >= tol && sweeps < 100000) {
    d = 0;
    for (let s = 0; s < mdp.nS; s++) {
      if (mdp.term[s]) continue;
      let v = qValue(mdp, V, gamma, s, pi[s]); d = Math.max(d, Math.abs(v - V[s])); V[s] = v;
    }
    sweeps++;
  }
  return { V, sweeps };
}
function cellXY(gw, s, gx, gy, cs) { return [gx + (s % gw.w) * cs, gy + Math.floor(s / gw.w) * cs]; }
function drawArrowIn(cx, cy, a, len) { // マスの中心から向き a に矢印
  let dx = DIRS[a][0], dy = DIRS[a][1], ex = cx + dx * len, ey = cy + dy * len;
  line(cx - dx * len * 0.4, cy - dy * len * 0.4, ex, ey);
  noStroke(); triangle(ex + dx * 5, ey + dy * 5, ex - dy * 5 - dx * 2, ey + dx * 5 - dy * 2, ex + dy * 5 - dx * 2, ey - dx * 5 - dy * 2);
}
function drawCells(gw, gx, gy, cs, skipFloor) {   // 壁・宝・落とし穴・スタートを描く
  textAlign(CENTER, CENTER); textSize(cs * 0.4);
  for (let s = 0; s < gw.w * gw.h; s++) {
    let c = gw.cell[s], [x, y] = cellXY(gw, s, gx, gy, cs);
    if (c === '.' && skipFloor) continue;
    noStroke();
    if (c === '#') fill(70, 76, 120); else if (c === 'G') fill(...GOLD); else if (c === 'P') fill(120, 30, 70); else fill(26, 30, 60);
    rect(x + 1, y + 1, cs - 2, cs - 2, 4);
    if (c === 'G') { fill(40, 30, 0); text('宝', x + cs / 2, y + cs / 2); }
    if (c === 'P') { fill(255, 150, 190); text('穴', x + cs / 2, y + cs / 2); }
    if (c === 'S') { fill(...CYAN); text('S', x + cs / 2, y + cs / 2); }
  }
}
function cellAt(gw, gx, gy, cs, mx, my) {         // マウスの下のマス（なければ −1）
  let x = Math.floor((mx - gx) / cs), y = Math.floor((my - gy) / cs);
  return x >= 0 && y >= 0 && x < gw.w && y < gw.h ? y * gw.w + x : -1;
}
function bfsDist(gw, goal) {           // 決定的に動くときの、各マスからゴールまでの最短の歩数（届かなければ Infinity）
  let d = new Array(gw.w * gw.h).fill(Infinity), q = [goal]; d[goal] = 0;
  while (q.length) {
    let s = q.shift();
    for (let a = 0; a < 4; a++) {
      let x = s % gw.w - DIRS[a][0], y = Math.floor(s / gw.w) - DIRS[a][1], p = y * gw.w + x;   // p から向き a で s に来られる？
      if (x < 0 || y < 0 || x >= gw.w || y >= gw.h || gw.cell[p] === '#' || d[p] < Infinity || isTerminalCell(gw.cell[p])) continue;
      if (gridMove(gw, p, a) === s) { d[p] = d[s] + 1; q.push(p); }
    }
  }
  return d;
}
function valueFill(v, lo, hi) {        // 低い = 紫、0 = 紺、高い = 金
  let t = clampv((v - lo) / (hi - lo || 1), 0, 1);
  if (t < 0.5) { let u = t / 0.5; fill(110 - 80 * u, 60 - 30 * u, 150 - 90 * u); }
  else { let u = (t - 0.5) / 0.5; fill(30 + 220 * u, 30 + 160 * u, 60 - 20 * u); }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 225, 200) : color(255, 90, 120)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
