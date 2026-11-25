// ============================================
// 07 深さと初期化 ─ 幅 N のネットを 20 層重ね、ランダムな重み（分散 σ_w²/N）で入力を流す
// 層ごとの信号の大きさ q_l = (z の 2 乗の平均) は、N が大きいと漸化式 q_l = σ_w² E[f(√q_(l−1) ξ)²]（ξ は標準正規分布）に従う
// 勾配の大きさ G は後ろから G_(l−1) = σ_w² E[f'(z_l)²] G_l で伝わる。1 層あたりの倍率が 1 より小さいと消え、大きいと爆発
//   ReLU：E[f²] = q/2、E[f'²] = 1/2 → σ_w² = 2（ヒー/He の初期化）でちょうど 1 倍 → 何層でも保たれる
//   tanh：σ_w² = 1（ザビエル/Xavier）で小さな信号の倍率がちょうど 1 → 勾配がほぼ保たれる（信号はゆっくり小さくなる）
// 太い線 = 理論の漸化式、点 = 本物のランダムなネット（毎フレーム 1 個作って平均）、細い線 = いちばん新しい 1 個
// 1 tanh / 2 ReLU / ← → σ_w² / X ザビエル（σ_w² = 1）/ H ヒー（σ_w² = 2）/ スペース 一時停止 / R 平均をやり直す
// ============================================

const WIDTH_N = 96, DEPTH = 20, BATCH_B = 4;   // ★ 幅、層の数、1 回に流す入力の数
const SW2_LIST = [0.5, 1, 1.5, 2, 3, 4];
let actName = 'relu', sw2Idx = 3, simQ = null, simG = null, lastQ = null, lastG = null, nNets = 0, pausedD = false, thQ = null, thG = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(77); resetSim();
}

// ガウス分布の期待値 E[g(√q ξ)]（中点則、ξ ∈ [−8, 8] を 800 等分。ξ = 0 ちょうどは使わないので ReLU の角でも正確）
function gaussE(g, q) {
  let s = 0, n = 800, sq = Math.sqrt(Math.max(0, q));
  for (let i = 0; i < n; i++) { let x = -8 + (16 * (i + 0.5)) / n; s += Math.exp(-x * x / 2) * g(sq * x); }
  return (s * (16 / n)) / Math.sqrt(2 * Math.PI);
}
// ★ 理論の漸化式：q[l]（l = 1…L の z の分散）、grad[l]（l = 0…L、出力側を 1 とした勾配の 2 乗の平均）
function theoryCurves(act, sw2, L) {
  let q = [0, sw2 * 1];                        // 入力 x は標準正規分布 → q_1 = σ_w²
  for (let l = 2; l <= L; l++) q.push(sw2 * gaussE((z) => actF(act, z) ** 2, q[l - 1]));
  let g = new Array(L + 1).fill(0); g[L] = 1;
  for (let l = L; l >= 1; l--) g[l - 1] = g[l] * sw2 * gaussE((z) => actD(act, z) ** 2, q[l]);
  return { q, g };
}
// ★ 本物のネットを 1 個：前向きに q_l、後ろ向きに勾配（出力側にランダムな勾配ベクトルを置いて W の転置で戻す）
function simulateNet(act, sw2, n, L, b) {
  let sd = Math.sqrt(sw2 / n), ws = [], hs = [], zs = [], q = [0], g = new Array(L + 1).fill(0);
  let h = []; for (let k = 0; k < b; k++) { let x = new Float64Array(n); for (let i = 0; i < n; i++) x[i] = randn(); h.push(x); }
  for (let l = 1; l <= L; l++) {
    let w = new Float64Array(n * n); for (let i = 0; i < n * n; i++) w[i] = sd * randn(); ws.push(w);
    let s = 0, zl = [], hl = [];
    for (let k = 0; k < b; k++) {
      let z = new Float64Array(n), hn = new Float64Array(n), hp = h[k];
      for (let i = 0; i < n; i++) { let a = 0, o = i * n; for (let j = 0; j < n; j++) a += w[o + j] * hp[j]; z[i] = a; s += a * a; hn[i] = actF(act, a); }
      zl.push(z); hl.push(hn);
    }
    q.push(s / (n * b)); zs.push(zl); h = hl;
  }
  let d = []; for (let k = 0; k < b; k++) { let v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = randn(); d.push(v); }
  let acc = 0; for (let v of d) for (let i = 0; i < n; i++) acc += v[i] * v[i]; g[L] = acc / (n * b);
  for (let l = L; l >= 1; l--) {
    let w = ws[l - 1], s = 0, nd = [];
    for (let k = 0; k < b; k++) {
      let u = new Float64Array(n), z = zs[l - 1][k], out = new Float64Array(n);
      for (let i = 0; i < n; i++) u[i] = d[k][i] * actD(act, z[i]);
      for (let i = 0; i < n; i++) { let ui = u[i], o = i * n; if (ui !== 0) for (let j = 0; j < n; j++) out[j] += w[o + j] * ui; }
      for (let j = 0; j < n; j++) s += out[j] * out[j];
      nd.push(out);
    }
    g[l - 1] = s / (n * b); d = nd;
  }
  return { q, g: g.map((v) => v / Math.max(1e-300, g[L])) };
}
function resetSim() {
  simQ = new Array(DEPTH + 1).fill(0); simG = new Array(DEPTH + 1).fill(0); nNets = 0; lastQ = null; lastG = null;
  let t = theoryCurves(actName, SW2_LIST[sw2Idx], DEPTH); thQ = t.q; thG = t.g;
}

function draw() {
  background(...BG);
  if (!pausedD && nNets < 2000) {
    let r = simulateNet(actName, SW2_LIST[sw2Idx], WIDTH_N, DEPTH, BATCH_B); nNets++;
    for (let l = 0; l <= DEPTH; l++) { simQ[l] += (r.q[l] - simQ[l]) / nNets; simG[l] += (r.g[l] - simG[l]) / nNets; }
    lastQ = r.q; lastG = r.g;
  }
  let sw2 = SW2_LIST[sw2Idx], crit = actName === 'relu' ? 2 : 1, per = actName === 'relu' ? sw2 / 2 : sw2;
  hudTitle('深さと初期化：' + (actName === 'relu' ? 'ReLU' : 'tanh') + '　σ_w² = ' + sw2 + (sw2 === crit ? (actName === 'relu' ? '（ヒーの初期化）' : '（ザビエルの初期化）') : '') + '　幅 ' + WIDTH_N + '・' + DEPTH + ' 層　ネット ' + nNets + ' 個の平均',
    '1 tanh　2 ReLU　← → σ_w²　X ザビエル（1）　H ヒー（2）　スペース ' + (pausedD ? '再開' : '一時停止') + '　R 平均をやり直す');
  let ls = []; for (let l = 0; l <= DEPTH; l++) ls.push(l);
  let pw = (width - 140) / 2, ph = height - 300;
  let lgq = (arr) => arr.map((v, l) => (l === 0 ? NaN : Math.log10(Math.max(1e-30, v)))), lgg = (arr) => arr.map((v) => Math.log10(Math.max(1e-30, v)));
  let rangeOf = (arrs) => { let lo = 0, hi = 0; for (let a of arrs) for (let v of a) if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } return [Math.floor(lo) - 0.5, Math.ceil(hi) + 0.5]; };
  let rq = rangeOf(nNets ? [lgq(thQ), lgq(simQ)] : [lgq(thQ)]), rg = rangeOf(nNets ? [lgg(thG), lgg(simG)] : [lgg(thG)]);
  let g1 = { x: 70, y: 110, w: pw, h: ph, x0: 1, x1: DEPTH, y0: rq[0], y1: rq[1] }, g2 = { x: 70 + pw + 70, y: 110, w: pw - 30, h: ph, x0: 0, x1: DEPTH, y0: rg[0], y1: rg[1] };
  plotAxes(g1, '層 l（右ほど深い）', '前向き：信号の大きさ log₁₀ q_l', [1, 5, 10, 15, 20], [Math.ceil(rq[0]), 0, Math.floor(rq[1])]);
  plotAxes(g2, '層 l（右が出力）', '後ろ向き：勾配の大きさ log₁₀ G_l（出力側 = 1）', [0, 5, 10, 15, 20], [Math.ceil(rg[0]), 0, Math.floor(rg[1])]);
  for (let [g, th, sim, last, col] of [[g1, lgq(thQ), lgq(simQ), lastQ ? lgq(lastQ) : null, MAG], [g2, lgg(thG), lgg(simG), lastG ? lgg(lastG) : null, LIME]]) {
    stroke(...WIRE); line(g.x, gY(g, 0), g.x + g.w, gY(g, 0));
    plotXY(g, ls, th, col, 4);
    if (last) plotXY(g, ls, last, [...INK, 110], 1);
    noStroke(); fill(...INK); for (let l = 0; l <= DEPTH; l++) if (isFinite(sim[l]) && nNets) circle(gX(g, l), gY(g, sim[l]), 7);
  }
  legend(g1.x + 12, g1.y + 16, [[MAG, '理論の漸化式'], [INK, '本物のネット（点 = 平均、細線 = 1 個）']]);
  // 下の説明
  let ty = g1.y + ph + 60, ratio = nNets ? simQ[DEPTH] / thQ[DEPTH] : NaN;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text('1 層あたりの倍率（小さな信号）：' + (actName === 'relu' ? 'σ_w² / 2 = ' : 'σ_w² × tanh\'(0)² = ') + fmtN(per, 2) + (Math.abs(per - 1) < 1e-9 ? '　→ ちょうど 1（保たれる）' : per < 1 ? '　→ 1 未満（消える）' : '　→ 1 より大きい（爆発 / tanh は飽和）'), 70, ty);
  text('20 層目の q：理論 ' + fmtE(thQ[DEPTH]) + '　本物 ' + fmtE(simQ[DEPTH]) + '　比 ' + fmtN(ratio, 3) + '　入力側の勾配 G_0：理論 ' + fmtE(thG[0]) + '　本物 ' + fmtE(simG[0]), 70, ty + 24);
  fill(...SUB); textSize(13);
  text('細い線（1 個のネット）はガタガタ：幅が有限なので 1 層ごとに少しずつずれる。たくさん平均すると理論に近づく', 70, ty + 50);
  text('tanh の σ_w² = 2 などでは q がある値 q* に落ち着く（固定点）。σ_w² < 1 では 0 へ。シグモイドの勾配消失は 01 で', 70, ty + 70);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === '1') { actName = 'tanh'; resetSim(); }
  if (key === '2') { actName = 'relu'; resetSim(); }
  if (key === RIGHT_ARROW) { sw2Idx = Math.min(SW2_LIST.length - 1, sw2Idx + 1); resetSim(); }
  if (key === LEFT_ARROW) { sw2Idx = Math.max(0, sw2Idx - 1); resetSim(); }
  if (key === 'x' || key === 'X') { sw2Idx = 1; resetSim(); }
  if (key === 'h' || key === 'H') { sw2Idx = 3; resetSim(); }
  if (key === ' ') pausedD = !pausedD;
  if (key === 'r' || key === 'R') resetSim();
  return false;
}

// ============================================
// やってみよう
// ・ReLU で σ_w² = 1、2、3 をくらべる。20 層で信号は何倍になる？（理論：(σ_w²/2)^19 × σ_w²）
// ・tanh で σ_w² = 0.5、1、2、4。信号が 0 に行くか、ある値に落ち着くか
// ・WIDTH_N を 16 にすると、細い線（1 個のネット）のガタガタはどうなる？ 理論との平均のずれは？
// ・DEPTH を 50 にして、ヒーの初期化でも勾配が保たれるか見る
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check("数値積分：E[ξ²] = 1、E[ReLU(ξ)²] = 1/2、E[ReLU'(ξ)²] = 1/2", near(gaussE((z) => z * z, 1), 1, 1e-9) && near(gaussE((z) => actF('relu', z) ** 2, 1), 0.5, 1e-9) && near(gaussE((z) => actD('relu', z) ** 2, 1), 0.5, 1e-9));
  let tr = theoryCurves('relu', 3, 20), closed = true;
  for (let l = 1; l <= 20; l++) if (!near(tr.q[l] / (3 * Math.pow(1.5, l - 1)), 1, 1e-5)) closed = false;
  let thHe = theoryCurves('relu', 2, 20);
  check('ReLU の漸化式 = 式 q_l = σ_w² (σ_w²/2)^(l−1)（σ_w² = 3）、ヒーなら理論の勾配はどの層も 1', closed && thHe.g.every((v) => near(v, 1, 1e-9)));
  let avg = (act, sw2, k, n) => { let q = new Array(21).fill(0), g = new Array(21).fill(0); for (let t = 0; t < k; t++) { let r = simulateNet(act, sw2, n, 20, 4); for (let l = 0; l <= 20; l++) { q[l] += r.q[l] / k; g[l] += r.g[l] / k; } } return { q, g }; };
  seedRng(701); let th2 = theoryCurves('tanh', 2, 20), s2 = avg('tanh', 2, 25, 64), worst = 0;
  for (let l = 1; l <= 20; l++) worst = Math.max(worst, Math.abs(s2.q[l] / th2.q[l] - 1));
  check('tanh（σ_w² = 2）：本物のネット 25 個の平均 = 漸化式（全部の層でずれ ' + fmtN(100 * worst, 1) + '% < 10%）', worst < 0.1);
  seedRng(702); let he = avg('relu', 2, 20, 64), okHe = true;
  for (let l = 1; l <= 20; l++) if (!(he.q[l] / he.q[1] > 0.5 && he.q[l] / he.q[1] < 2)) okHe = false;
  check('ヒーの初期化（ReLU、σ_w² = 2）：20 層まで信号が 1/2〜2 倍に保たれ、勾配も ' + fmtN(he.g[0], 2) + ' 倍', okHe && he.g[0] > 0.5 && he.g[0] < 2);
  seedRng(703); let lo = avg('relu', 0.5, 3, 48), hi = avg('relu', 4, 3, 48);
  check('ReLU σ_w² = 0.5 で消える（q_20/q_1 = ' + fmtE(lo.q[20] / lo.q[1]) + '）、4 で爆発（' + fmtE(hi.q[20] / hi.q[1]) + '）', lo.q[20] / lo.q[1] < 1e-8 && hi.q[20] / hi.q[1] > 1e4);
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
