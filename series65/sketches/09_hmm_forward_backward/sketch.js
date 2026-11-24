// ============================================
// 09 隠れマルコフモデル ─ いかさまカジノ：ふつうのサイコロ（どの目も 1/6）と、6 が出やすいいかさまサイコロを、
// 店がこっそり切りかえている。どちらを使っているか（隠れた状態）はマルコフ連鎖で動き、見えるのは出た目だけ。
// 前向きアルゴリズム α と後ろ向きアルゴリズム β を掛けると、各時刻の「いかさまだった確率」P(いかさま | 全部の目) が出る。
// 掛け算をくり返すと数が小さくなりすぎるので、毎回合計で割る（スケーリング）。最もありそうな 1 本の道はビタビ（series59/13）
// クリック 目を変える / R 新しい列 / スペース 前向きだけ ⇔ 前向き後ろ向き / ↑↓ いかさまサイコロの 6 の確率
// ============================================

const NT = 150;                          // ★ サイコロを振る回数
let toLoaded = 0.05, toFair = 0.1;       // ★ 切りかえの確率（ふつう → いかさま、いかさま → ふつう）
let six = 0.5;                           // ★ いかさまサイコロで 6 が出る確率（ほかの目は等しく残りを分ける）
let hmm, rolls = [], truth = [], post = [], filt = [], logLik = 0, useSmooth = true, cells = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(9); hmm = makeHmm(toLoaded, toFair, six); newSequence();
}
function makeHmm(a, b, p6) {             // 状態 0 = ふつう、1 = いかさま。emit[状態][目 − 1]
  let q = (1 - p6) / 5;
  return { init: [b / (a + b), a / (a + b)], trans: [[1 - a, a], [b, 1 - b]], emit: [[1, 1, 1, 1, 1, 1].map((v) => v / 6), [q, q, q, q, q, p6]] };
}
function sampleHmm(h, n) {               // 隠れた状態と目を 1 つずつ作る
  let z = sampleFrom(h.init), zs = [], os = [];
  for (let t = 0; t < n; t++) { if (t > 0) z = sampleFrom(h.trans[z]); zs.push(z); os.push(sampleFrom(h.emit[z]) + 1); }
  return { zs, os };
}
// ★ 前向き・後ろ向き（スケーリングつき）：戻り値 post[t][状態]、filt[t][状態] = P(状態 | 1〜t 回目の目)、logLik = log P(全部の目)
function forwardBackward(h, os) {
  let n = os.length, K = 2, al = [], sc = [], logL = 0;
  for (let t = 0; t < n; t++) {
    let a = new Array(K).fill(0);
    for (let j = 0; j < K; j++) {
      let s = 0; if (t === 0) s = h.init[j]; else for (let i = 0; i < K; i++) s += al[t - 1][i] * h.trans[i][j];
      a[j] = s * h.emit[j][os[t] - 1];
    }
    let c = sumOf(a); sc.push(c); al.push(a.map((v) => v / c)); logL += Math.log(c);
  }
  let be = new Array(n); be[n - 1] = new Array(K).fill(1);
  for (let t = n - 2; t >= 0; t--) {
    be[t] = new Array(K).fill(0);
    for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) be[t][i] += h.trans[i][j] * h.emit[j][os[t + 1] - 1] * be[t + 1][j];
    for (let i = 0; i < K; i++) be[t][i] /= sc[t + 1];
  }
  let ps = al.map((a, t) => { let g = a.map((v, i) => v * be[t][i]), s = sumOf(g); return g.map((v) => v / s); });
  return { post: ps, filt: al, logLik: logL };
}
function newSequence() { let s = sampleHmm(hmm, NT); rolls = s.os; truth = s.zs; recompute(); }
function recompute() { let r = forwardBackward(hmm, rolls); post = r.post; filt = r.filt; logLik = r.logLik; }
function accuracy(ps, zs) { let ok = 0; for (let t = 0; t < zs.length; t++) if ((ps[t][1] > 0.5 ? 1 : 0) === zs[t]) ok++; return ok / Math.max(1, zs.length); }

function draw() {
  background(...BG);
  let shownP = useSmooth ? post : filt;
  hudTitle('隠れマルコフモデル：いかさまカジノ　' + (useSmooth ? '前向き後ろ向き P(いかさま | 全部の目)' : '前向きだけ P(いかさま | ここまでの目)'),
    'クリック 目を変える　R 新しい列　スペース 前向きだけ ⇔ 前向き後ろ向き　↑↓ いかさまの 6 の確率 = ' + fmtN(six, 2));
  let perRow = 50, nRows = Math.ceil(NT / perRow), cw = Math.min(22, (width - 80) / perRow), x0 = 40, y0 = 150, rowH = Math.min(150, (height - y0 - 110) / nRows);
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  text('四角 = 出た目（6 は赤）　下の帯 = 本当に使っていたサイコロ（赤 = いかさま）　棒 = 計算した「いかさまだった確率」', x0, y0 - 40);
  cells = [];
  for (let t = 0; t < NT; t++) {
    let r = Math.floor(t / perRow), c = t % perRow, x = x0 + c * cw, y = y0 + r * rowH;
    noStroke(); fill(rolls[t] === 6 ? color(...DICE) : color(70, 63, 58)); rect(x + 1, y, cw - 2, cw - 2, 4);
    fill(...CREAM); textSize(12); textAlign(CENTER, CENTER); text(rolls[t], x + cw / 2, y + cw / 2 - 1);
    fill(truth[t] ? color(...DICE) : color(...TEAL)); rect(x, y + cw + 2, cw, 6);
    let bh = rowH - cw - 40, p = shownP[t][1];
    fill(60, 54, 50); rect(x + 1, y + cw + 12, cw - 2, bh);
    fill(...MUSTARD); rect(x + 1, y + cw + 12 + bh * (1 - p), cw - 2, bh * p);
    cells.push([x, y, cw]);
    if (c === 0) { fill(...SUB); textSize(11); textAlign(RIGHT, CENTER); text(t + 1, x - 4, y + cw / 2); }
  }
  // 0.5 の線
  stroke(...CREAM, 90); strokeWeight(1);
  for (let r = 0; r < nRows; r++) { let y = y0 + r * rowH + cw + 12 + (rowH - cw - 40) / 2; line(x0, y, x0 + perRow * cw, y); }
  // ---- 数字
  let ty = y0 + nRows * rowH + 10; noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
  text('当たりの割合（確率 > 0.5 を「いかさま」と判定）：前向き後ろ向き ' + Math.round(accuracy(post, truth) * 100) + '%　／　前向きだけ ' + Math.round(accuracy(filt, truth) * 100) + '%', x0, ty);
  text('log P(全部の目) = ' + fmtN(logLik, 2) + '（ふつうのサイコロだけと考えると ' + fmtN(NT * Math.log(1 / 6), 2) + '）', x0, ty + 24);
  fill(...SUB); textSize(13);
  text('切りかえ：ふつう → いかさま ' + toLoaded + '、いかさま → ふつう ' + toFair + '。後ろ向きを使うと「あとの目」も手がかりになり、切りかえの前後がそろう', x0, ty + 48);
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  for (let t = 0; t < cells.length; t++) { let [x, y, cw] = cells[t]; if (mouseX >= x && mouseX < x + cw && mouseY >= y && mouseY < y + cw) { rolls[t] = (rolls[t] % 6) + 1; recompute(); return; } }
}
function keyPressed() {
  if (key === ' ') useSmooth = !useSmooth;
  if (key === 'r' || key === 'R') newSequence();
  if (key === UP_ARROW) { six = Math.min(0.95, Math.round((six + 0.05) * 100) / 100); hmm = makeHmm(toLoaded, toFair, six); recompute(); }
  if (key === DOWN_ARROW) { six = Math.max(0.2, Math.round((six - 0.05) * 100) / 100); hmm = makeHmm(toLoaded, toFair, six); recompute(); }
  return false;
}

// やってみよう
// 1. 6 の確率を 0.2（ほぼふつう）にすると、計算した確率の棒はどうなる？ 見分けにくいのはなぜ？
// 2. 6 が続くところをクリックで別の目に変えると、まわりの確率はどう変わる？（後ろ向きの効果）
// 3. スペースで「前向きだけ」にすると、切りかえに気づくのが少し遅れるのはなぜ？
// 4. toLoaded を 0.3 にして、切りかえが多い店にすると、当たりの割合は？

// ---- 自己テスト
function bruteForce(h, os) {             // 2^n 通りの隠れた道を全部足す（短い列だけ）
  let n = os.length, tot = 0, marg = os.map(() => [0, 0]);
  for (let m = 0; m < 1 << n; m++) {
    let p = 1;
    for (let t = 0; t < n; t++) { let z = (m >> t) & 1; p *= (t === 0 ? h.init[z] : h.trans[(m >> (t - 1)) & 1][z]) * h.emit[z][os[t] - 1]; }
    tot += p; for (let t = 0; t < n; t++) marg[t][(m >> t) & 1] += p;
  }
  return { lik: tot, post: marg.map((r) => [r[0] / tot, r[1] / tot]) };
}
function selfTest() {
  selfTestResults = [];
  seedRng(90);
  let h = makeHmm(0.05, 0.1, 0.5);
  check('遷移と出る目の確率の行の合計 = 1', rowSumErr(h.trans) < 1e-12 && rowSumErr(h.emit) < 1e-12 && near(sumOf(h.init), 1, 1e-12));
  check('はじめの分布 = 切りかえの連鎖の定常分布（2/3, 1/3）', maxAbsDiff(stationaryExact(h.trans), h.init) < 1e-12 && near(h.init[1], 1 / 3, 1e-12));
  let os = [6, 6, 2, 6, 5, 6, 6, 1, 3, 4, 6, 2], fb = forwardBackward(h, os), bf = bruteForce(h, os);
  check('尤度：前向き（スケーリング）= 4096 通りの総当たり（12 回）', near(fb.logLik, Math.log(bf.lik), 1e-10));
  check('各時刻の P(いかさま | 目) = 総当たりの周辺確率', maxAbsDiff(fb.post, bf.post) < 1e-12);
  check('どの時刻でも P(ふつう) + P(いかさま) = 1', fb.post.every((p) => near(sumOf(p), 1, 1e-12)));
  check('最後の時刻では 前向きだけ = 前向き後ろ向き', maxAbsDiff(fb.filt[os.length - 1], fb.post[os.length - 1]) < 1e-12);
  let s = sampleHmm(h, 3000), big = forwardBackward(h, s.os), accS = accuracy(big.post, s.zs), accF = accuracy(big.filt, s.zs);
  check('3000 回：当たりの割合 ' + Math.round(accS * 100) + '%（> 80%）、前向きだけ以上', accS > 0.8 && accS >= accF - 0.005 && noNaN(big.logLik));
  let all6 = forwardBackward(h, new Array(20).fill(6)), no6 = forwardBackward(h, [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
  check('6 ばかりなら いかさま > 0.9、6 がなければ < 0.1', all6.post[10][1] > 0.9 && no6.post[10][1] < 0.1);
  reportSelfTest();
}

// ==================================================
// ここから下は「マルコフ連鎖の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [32, 28, 26];                // 背景（あたたかい炭色）
const CREAM = [246, 236, 214], DICE = [236, 96, 58], TEAL = [44, 178, 166], MUSTARD = [236, 190, 82], PLUM = [190, 130, 200], SUB = [190, 178, 160];
const STATE_COLS = [[236, 96, 58], [44, 178, 166], [236, 190, 82], [190, 130, 200], [120, 190, 240], [150, 210, 110], [240, 140, 170], [200, 170, 130]];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return '∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function hudTitle(t, sub) {            // 左上の見出しと操作の説明
  noStroke(); fill(...CREAM); textSize(22); textAlign(LEFT, BASELINE); text(t, 40, 42);
  fill(...SUB); textSize(15); text(sub, 40, 68);
}
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
// ---- 行列の道具（行列 = 配列の配列。遷移行列 transP[i][j] = i の次に j へ行く確率、行の和 = 1）
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function eyeMat(n) { let a = zerosMat(n); for (let i = 0; i < n; i++) a[i][i] = 1; return a; }
function copyMat(a) { return a.map((r) => r.slice()); }
function matMul(a, b) {                // 行列の積 (a b)[i][j] = Σ_k a[i][k] b[k][j]
  let n = a.length, m = b[0].length, kk = b.length, c = zerosMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < kk; k++) { let v = a[i][k]; if (v !== 0) for (let j = 0; j < m; j++) c[i][j] += v * b[k][j]; }
  return c;
}
function vecMat(v, a) {                // 横ベクトル × 行列：次の時刻の分布 = いまの分布 × P
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function matPow(a, k) { let r = eyeMat(a.length); for (let t = 0; t < k; t++) r = matMul(r, a); return r; }   // P^k（k 回かけるだけ）
function maxAbsDiff(a, b) {            // 2 つの行列（またはベクトル）のいちばん大きなずれ
  let d = 0;
  for (let i = 0; i < a.length; i++) { if (Array.isArray(a[i])) d = Math.max(d, maxAbsDiff(a[i], b[i])); else d = Math.max(d, Math.abs(a[i] - b[i])); }
  return d;
}
function rowSumErr(a, target) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - (target === undefined ? 1 : target))); return d; }
function fixRows(a) {                  // 行の和を 1 に。全部 0 の行は「その場にとどまる」にする（NaN を出さない）
  return a.map((r, i) => { let s = sumOf(r); if (!(s > 1e-12)) { let z = r.map(() => 0); z[i] = 1; return z; } return r.map((v) => v / s); });
}
function solveLinear(a, b) {           // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = a.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-13) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((r, i) => r[n] / r[i]);
}
function matInv(a) {                   // 逆行列（ガウス-ジョルダン）。逆がなければ null
  let n = a.length, cols = [];
  for (let j = 0; j < n; j++) { let e = new Array(n).fill(0); e[j] = 1; let x = solveLinear(a, e); if (!x) return null; cols.push(x); }
  return a.map((_, i) => cols.map((c) => c[i]));
}
// 定常分布：π P = π と Σ π = 1 を連立方程式として解く（(P^T − I) π = 0 の最後の式を Σ π = 1 に置きかえる）
function stationaryExact(a) {
  let n = a.length, m = zerosMat(n), b = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m[i][j] = a[j][i] - (i === j ? 1 : 0);
  for (let j = 0; j < n; j++) m[n - 1][j] = 1; b[n - 1] = 1;
  return solveLinear(m, b);
}
function stationaryPower(a, tol, maxIt, start) {   // べき乗法：π ← π P を変化が tol 未満になるまで
  let n = a.length, v = start ? start.slice() : new Array(n).fill(1 / n), its = 0, d = Infinity;
  while (d > (tol || 1e-13) && its < (maxIt || 100000)) { let w = vecMat(v, a); d = maxAbsDiff(w, v); v = w; its++; }
  return { pi: v, its };
}
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }   // 全変動距離
function entropyRate(a, pi) {          // エントロピー率 H = −Σ_i π_i Σ_j P_ij log₂ P_ij（1 歩あたりの情報量、ビット）
  let h = 0;
  for (let i = 0; i < a.length; i++) for (let v of a[i]) if (v > 0) h -= pi[i] * v * Math.log2(v);
  return h;
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
