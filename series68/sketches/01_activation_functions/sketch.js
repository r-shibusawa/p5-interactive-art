// ============================================
// 01 活性化関数と勾配消失 ─ ニューロンの出力 = f(重みつきの和 z)。f が「活性化関数」
// ステップ（0 か 1）・シグモイド σ(z) = 1/(1 + e⁻ᶻ)・tanh・ReLU = max(0, z)・softplus = log(1 + eᶻ) のグラフと微分 f'(z)
// 何層も重ねた鎖 h_l = f(w_l h_(l−1) + b_l) の勾配は ∂h_L/∂h_l = Π w f'(z)（連鎖律で掛け算）。
// シグモイドの微分は最大でも 1/4 → 層を重ねるほど勾配が指数的に小さくなる（勾配消失）。ReLU の微分は 1 なので消えにくい
// 1〜5 関数をえらぶ / マウス 接線を見る z / ↑↓ 層の数 L / ← → 重みの大きさ σ_w / R 鎖を作り直す
// ============================================

const NICE = ['ステップ', 'シグモイド', 'tanh', 'ReLU', 'softplus'];
const N_CHAINS = 300;                    // ★ 平均をとる鎖の数
let actSel = 1, depthL = 20, sigW = 1.0, seedC = 1, chainLog = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  rebuild();
}

function actCol(k) { return [SUB, MAG, LIME, SKY, AMBER][k]; }   // 関数ごとの色（道具の色は下で決めているので関数にする）
// ★ 1 本の鎖：前向きに z と h を計算し、後ろ向きに ∂h_L/∂h_l を掛け算でためる（l = L, L−1, …, 0）
function chainForward(name, ws, bs, h0) {
  let hs = [h0], zs = [];
  for (let l = 0; l < ws.length; l++) { let z = ws[l] * hs[l] + bs[l]; zs.push(z); hs.push(actF(name, z)); }
  return { hs, zs };
}
function chainBackward(name, ws, zs) {   // g[l] = ∂h_L/∂h_l
  let L = ws.length, g = new Array(L + 1).fill(0); g[L] = 1;
  for (let l = L - 1; l >= 0; l--) g[l] = g[l + 1] * actD(name, zs[l]) * ws[l];
  return g;
}
function randomChain(L, sw) { let ws = [], bs = []; for (let l = 0; l < L; l++) { ws.push(sw * randn()); bs.push(0.3 * randn()); } return { ws, bs }; }
// 300 本の鎖で log₁₀|∂h_L/∂h_l| の平均（幾何平均）を、関数ごとに
function rebuild() {
  seedRng(100 + seedC); chainLog = {};
  let chains = []; for (let c = 0; c < N_CHAINS; c++) chains.push(randomChain(depthL, sigW));
  for (let name of ['sigmoid', 'tanh', 'relu', 'softplus']) {
    let acc = new Array(depthL + 1).fill(0), cnt = new Array(depthL + 1).fill(0), zeroCnt = 0;
    for (let ch of chains) {
      let f = chainForward(name, ch.ws, ch.bs, 0.5), g = chainBackward(name, ch.ws, f.zs);
      if (g[0] === 0) zeroCnt++;
      for (let l = 0; l <= depthL; l++) if (g[l] !== 0) { acc[l] += Math.log10(Math.abs(g[l])); cnt[l]++; }   // 0（死んだ鎖）は平均から除いて別に数える
    }
    chainLog[name] = { lg: acc.map((v, l) => (cnt[l] >= 0.2 * N_CHAINS ? v / cnt[l] : NaN)), dead: zeroCnt / N_CHAINS };   // 生きている鎖が 2 割未満の層は描かない
  }
}

function draw() {
  background(...BG);
  let name = ACT_NAMES[actSel];
  hudTitle('活性化関数と勾配消失：' + NICE[actSel] + '　層の数 L = ' + depthL + '　σ_w = ' + fmtN(sigW, 2),
    '1〜5 関数（1 ステップ 2 シグモイド 3 tanh 4 ReLU 5 softplus）　マウス 接線　↑↓ 層の数　← → 重みの大きさ σ_w　R 鎖を作り直す');
  // ---- 左：f(z) と f'(z)
  let lw = width * 0.44, g1 = { x: 60, y: 110, w: lw - 60, h: (height - 250) * 0.55, x0: -4, x1: 4, y0: -1.2, y1: 4.2 };
  plotAxes(g1, 'z', '関数 f(z)（細い線 = ほかの関数）', [-4, -2, 0, 2, 4], [-1, 0, 1, 2, 3, 4]);
  let zs = []; for (let i = 0; i <= 240; i++) zs.push(-4 + i / 30);
  for (let k = 0; k < 5; k++) if (k !== actSel) plotXY(g1, zs, zs.map((z) => actF(ACT_NAMES[k], z)), [...actCol(k), 90], 1);
  plotXY(g1, zs, zs.map((z) => actF(name, z)), actCol(actSel), 3);
  let zm = clampv(((mouseX - g1.x) / g1.w) * 8 - 4, -4, 4), fm = actF(name, zm), dm = actD(name, zm);
  stroke(...INK, 160); strokeWeight(1);
  line(gX(g1, zm - 1.2), gY(g1, fm - 1.2 * dm), gX(g1, zm + 1.2), gY(g1, fm + 1.2 * dm));
  noStroke(); fill(...INK); circle(gX(g1, zm), gY(g1, fm), 9);
  let g2 = { x: 60, y: g1.y + g1.h + 60, w: g1.w, h: (height - 250) * 0.3, x0: -4, x1: 4, y0: 0, y1: 1.1 };
  plotAxes(g2, 'z', "微分 f'(z) = 接線の傾き（マウスの z で " + fmtN(dm, 3) + '）', [-4, -2, 0, 2, 4], [0, 0.25, 0.5, 1]);
  stroke(...WIRE); line(g2.x, gY(g2, 0.25), g2.x + g2.w, gY(g2, 0.25));
  plotXY(g2, zs, zs.map((z) => actD(name, z)), actCol(actSel), 3);
  noStroke(); fill(...INK); circle(gX(g2, zm), gY(g2, dm), 9);
  // ---- 右：深い鎖の勾配
  let rx = lw + 70, g3 = { x: rx, y: 110, w: width - rx - 40, h: (height - 250) * 0.62, x0: 0, x1: depthL, y0: -12, y1: 2 };
  for (let nm in chainLog) for (let v of chainLog[nm].lg) if (isFinite(v)) g3.y0 = Math.min(g3.y0, 4 * Math.floor(v / 4));
  g3.y0 = Math.max(-60, g3.y0);
  plotAxes(g3, '層 l（左ほど入力に近い）', 'log₁₀ |∂h_L / ∂h_l|（' + N_CHAINS + ' 本の鎖の平均）', [0, Math.round(depthL / 2), depthL], [g3.y0, Math.round(g3.y0 / 2), 0]);
  let ls = []; for (let l = 0; l <= depthL; l++) ls.push(l);
  stroke(...WIRE); line(g3.x, gY(g3, 0), g3.x + g3.w, gY(g3, 0));
  ['sigmoid', 'tanh', 'relu', 'softplus'].forEach((nm, k) => plotXY(g3, ls, chainLog[nm].lg, actCol(k + 1), nm === name ? 4 : 1.5));
  legend(g3.x + 12, g3.y + 16, [[MAG, 'シグモイド'], [LIME, 'tanh'], [SKY, 'ReLU'], [AMBER, 'softplus']]);
  let ty = g3.y + g3.h + 56;
  fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text("微分の最大値：シグモイド 1/4、tanh 1、ReLU 1、softplus 1 未満", rx, ty);
  fill(...SUB); textSize(13); text('ステップは傾きがどこでも 0 → 勾配では学習できない（00 は別の規則で学ぶ）', rx, ty + 20); fill(...INK); textSize(15);
  if (name !== 'step') {
    let c = chainLog[name];
    text(NICE[actSel] + '：入力側の勾配 ≈ ' + (isFinite(c.lg[0]) ? '10^' + fmtN(c.lg[0], 1) : 'ほとんどの鎖で 0') + (name === 'relu' ? '　死んだ鎖（z < 0 で勾配 0）' + fmtN(100 * c.dead, 0) + '%' : ''), rx, ty + 46);
  }
  fill(...SUB); textSize(13);
  text('シグモイドは 1 層ごとに |w| × 1/4 以下 → log が層の数に比例して下がる（グラフが直線）', rx, ty + 74);
  text('σ_w を大きくすると、tanh や ReLU は逆に爆発しやすい。ちょうどよい大きさは 07 の初期化で', rx, ty + 94);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key >= '1' && key <= '5') actSel = +key - 1;
  if (key === UP_ARROW) { depthL = Math.min(50, depthL + 5); rebuild(); }
  if (key === DOWN_ARROW) { depthL = Math.max(5, depthL - 5); rebuild(); }
  if (key === RIGHT_ARROW) { sigW = Math.min(4, Math.round((sigW + 0.25) * 100) / 100); rebuild(); }
  if (key === LEFT_ARROW) { sigW = Math.max(0.25, Math.round((sigW - 0.25) * 100) / 100); rebuild(); }
  if (key === 'r' || key === 'R') { seedC++; rebuild(); }
  return false;
}

// ============================================
// やってみよう
// ・マウスを左右に動かして、接線の傾きと下の微分のグラフの点が同じか確かめる
// ・シグモイドで σ_w を 4 にすると勾配消失はましになる？ その代わり何が起きる？
// ・ReLU で、勾配が 0 になってしまう鎖の割合（死んだ ReLU）を L を変えて見る
// ・actF に自分の関数（例 leaky ReLU：z > 0 ? z : 0.1 z）を足して、actD も書いてみる
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let worst = 0, hh = 1e-5;
  for (let name of ['sigmoid', 'tanh', 'relu', 'softplus']) for (let i = 0; i <= 80; i++) {
    let z = -4 + i * 0.1 + 0.013;                    // 0 ちょうど（ReLU の角）はさける
    let fd = (actF(name, z + hh) - actF(name, z - hh)) / (2 * hh);
    worst = Math.max(worst, Math.abs(fd - actD(name, z)) / Math.max(1e-3, Math.abs(fd)));
  }
  check("4 つの関数の微分 f'(z) = 中心差分（相対誤差 " + fmtE(worst) + '）', worst < 1e-6);
  let mx = 0; for (let i = 0; i <= 2000; i++) mx = Math.max(mx, actD('sigmoid', -10 + i / 100));
  check("シグモイドの微分 σ'(0) = 1/4 が最大（σ' = σ(1 − σ)）", near(actD('sigmoid', 0), 0.25, 1e-15) && mx <= 0.25 + 1e-15);
  let e2 = 0; for (let z = -5; z <= 5; z += 0.25) e2 = Math.max(e2, Math.abs(Math.tanh(z) - (2 * sigm(2 * z) - 1)));
  check('tanh(z) = 2σ(2z) − 1（ずれ ' + fmtE(e2) + '）', e2 < 1e-12);
  seedRng(7); let ch = randomChain(12, 1.2), sh = randomChain(6, 2), worstC = 0;
  for (let name of ['sigmoid', 'tanh', 'softplus']) {          // 差分が正確に測れるよう、6 層・大きめの重みで
    let f = chainForward(name, sh.ws, sh.bs, 0.5), g = chainBackward(name, sh.ws, f.zs), eps = 1e-5;
    let fd = (chainForward(name, sh.ws, sh.bs, 0.5 + eps).hs[6] - chainForward(name, sh.ws, sh.bs, 0.5 - eps).hs[6]) / (2 * eps);
    worstC = Math.max(worstC, relErr(fd, g[0]));
  }
  check('6 層の鎖：連鎖律の掛け算 ∂h_L/∂h_0 = 差分（相対誤差 ' + fmtE(worstC) + '）', worstC < 1e-6);
  let f = chainForward('sigmoid', ch.ws, ch.bs, 0.5), g = chainBackward('sigmoid', ch.ws, f.zs), prodW = ch.ws.reduce((a, w) => a * Math.abs(w), 1);
  check('シグモイドの鎖の勾配 ≤ Π|w| × (1/4)^12', Math.abs(g[0]) <= prodW * Math.pow(0.25, 12) * (1 + 1e-12));
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 活性化関数とその微分（name = 'step' 'sigmoid' 'tanh' 'relu' 'softplus'）
const ACT_NAMES = ['step', 'sigmoid', 'tanh', 'relu', 'softplus'];
function actF(name, z) {
  if (name === 'step') return z >= 0 ? 1 : 0;
  if (name === 'sigmoid') return sigm(z);
  if (name === 'tanh') return Math.tanh(z);
  if (name === 'relu') return z > 0 ? z : 0;
  return z > 30 ? z : Math.log(1 + Math.exp(z));           // softplus = log(1 + eᶻ)
}
function actD(name, z) {                 // 微分 f'(z)（ステップは 0、ReLU の 0 での微分は 0 とする）
  if (name === 'step') return 0;
  if (name === 'sigmoid') { let s = sigm(z); return s * (1 - s); }
  if (name === 'tanh') { let t = Math.tanh(z); return 1 - t * t; }
  if (name === 'relu') return z > 0 ? 1 : 0;
  return sigm(z);                          // softplus の微分 = シグモイド
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
