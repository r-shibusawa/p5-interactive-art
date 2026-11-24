// ============================================
// 13 アンサンブルで「自信のなさ」を測る ─ 種（シード）だけがちがう小さなニューラルネットを 8 個、同じデータで学習
// データのある所では 8 個ともほぼ同じ答え。データのない所（すき間・外側）では、てんでばらばら
//   → 8 個の予測の標準偏差 σ(x) を「自信のなさ」として使える。1 つのモデルだけでは、どこで自信がないか分からない
//   金 = 8 個の平均、帯 = 平均 ± 2σ、下のグラフ = σ(x)。クリックで点を足すと、そこの σ が小さくなる
//   アンビギュイティ分解（00 の多様性予測定理と同じ式）：平均の誤差 = 1 つずつの誤差の平均 − ばらつき（どの点でもぴったり）
// クリック 点を足す / C 足した点を消す / B ブートストラップ（ネットごとにデータを引き直す）/ R 種を変えてやり直す
// ============================================

const N_NETS = 8, HID = 20, LR = 0.01;                 // ★ ネットの数、隠れ層の大きさ、学習率
let seedBase = 1, bootOn = false, base = [], added = [], nets = [], sets = [], iters = 0, plotBoxG = null;
const NET_COL = [[240, 120, 100], [236, 214, 160], [110, 165, 240], [190, 135, 235], [150, 210, 95], [245, 175, 140], [64, 186, 176], [200, 160, 200]];
const XS = Array.from({ length: 141 }, (_, i) => -0.2 + (1.4 * i) / 140);   // 描く x（データの外側 −0.2〜1.2 まで）
function ftrue(x) { return Math.sin(5 * x) * 0.6 + 0.3 * x; }   // ★ 本当の関数

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); selfTest(); restart(); }
function makeGap(seed) {               // データは 2 つの区間だけ（まん中と外側にすき間）
  seedRng(seed); let pts = [];
  for (let i = 0; i < 40; i++) { let x = i < 22 ? 0.05 + 0.3 * rnd() : 0.62 + 0.25 * rnd(); pts.push([x, ftrue(x) + 0.05 * rndGauss()]); }
  return pts;
}
function inp(x) { return [2 * x - 1]; }   // ネットへの入力は [−1, 1] に直す
function restart() { base = makeGap(4); added = []; resetNets(); }
function resetNets() {
  nets = []; sets = []; iters = 0;
  let pts = base.concat(added);
  for (let k = 0; k < N_NETS; k++) {
    nets.push(makeMLP(1, HID, false, seedBase * 1000 + k));          // ★ ちがうのは種だけ
    seedRng(seedBase * 77 + k); let use = bootOn ? pts.map(() => pts[Math.floor(rnd() * pts.length)]) : pts;
    sets.push({ X: use.map((p) => inp(p[0])), y: use.map((p) => p[1]) });
  }
}
function preds(x) { return nets.map((n) => mlpOut(n, inp(x))); }
function sdOf(a) { return Math.sqrt(varOf(a)); }

function draw() {
  background(...BG_COL);
  if (iters < 3000) { nets.forEach((n, k) => mlpTrain(n, sets[k].X, sets[k].y, 10, LR)); iters += 10; }   // 1 フレームに 10 回ずつ
  let P = XS.map(preds), mu = P.map(meanOf), sd = P.map(sdOf);
  let g = { x: 70, y: 110, w: width - 140, h: height * 0.48, x0: -0.2, x1: 1.2, y0: -1.5, y1: 1.5 };
  // 帯 ±2σ
  noStroke(); fill(...TEAL, 60); beginShape(); XS.forEach((x, q) => vertex(gX(g, x), gY(g, mu[q] + 2 * sd[q]))); for (let q = XS.length - 1; q >= 0; q--) vertex(gX(g, XS[q]), gY(g, mu[q] - 2 * sd[q])); endShape(CLOSE);
  plotAxes(g, 'x', 'うすい線 = 8 個のネット、金 = 平均、帯 = 平均 ± 2σ、白い点線 = 本当の関数（データは白い点だけ）', [-0.2, 0, 0.5, 1, 1.2], [-1, 0, 1]);
  for (let k = 0; k < N_NETS; k++) { stroke(...NET_COL[k % NET_COL.length], 120); strokeWeight(1.2); polyline(XS.map((x, q) => [gX(g, x), gY(g, P[q][k])])); }
  stroke(...INK, 150); strokeWeight(1); drawingContext.setLineDash([4, 5]); polyline(XS.map((x) => [gX(g, x), gY(g, ftrue(x))])); drawingContext.setLineDash([]);
  stroke(...GOLD); strokeWeight(3); polyline(XS.map((x, q) => [gX(g, x), gY(g, mu[q])]));
  noStroke(); fill(...INK); base.forEach((p) => circle(gX(g, p[0]), gY(g, p[1]), 7)); fill(...WINE); added.forEach((p) => circle(gX(g, p[0]), gY(g, p[1]), 10));
  // ---- 下：σ(x)
  let g2 = { x: g.x, y: g.y + g.h + 50, w: g.w, h: Math.max(70, height - g.y - g.h - 130), x0: -0.2, x1: 1.2, y0: 0, y1: Math.max(0.2, ...sd) };
  plotAxes(g2, 'x', '自信のなさ σ(x) = 8 個の予測の標準偏差（下の白い線 = データのある x）', [-0.2, 0, 0.5, 1, 1.2], [0, +g2.y1.toFixed(2)]);
  noStroke(); fill(...WINE, 160); beginShape(); vertex(gX(g2, XS[0]), gY(g2, 0)); XS.forEach((x, q) => vertex(gX(g2, x), gY(g2, sd[q]))); vertex(gX(g2, XS[XS.length - 1]), gY(g2, 0)); endShape(CLOSE);
  stroke(...INK); strokeWeight(1.5); base.concat(added).forEach((p) => line(gX(g2, p[0]), g2.y + g2.h - 6, gX(g2, p[0]), g2.y + g2.h));
  // ---- 数字
  let pts = base.concat(added), amb = ambiguity(pts);
  noStroke(); fill(220, 210, 195); textSize(14); textAlign(LEFT, BASELINE);
  text('学習 ' + iters + ' 回　訓練データで：平均の誤差 ' + fmtNum(amb.ens, 5) + ' = 1 つずつの誤差の平均 ' + fmtNum(amb.avg, 5) + ' − ばらつき ' + fmtNum(amb.amb, 5), g.x, height - 40);
  fill(...INK); textSize(20); text('アンサンブルで自信のなさを測る　ネット ' + N_NETS + ' 個（種だけちがう）' + (bootOn ? '＋ブートストラップ' : ''), 40, 40);
  fill(170, 155, 145); textSize(15); text('クリック 点を足す　C 足した点を消す　B ブートストラップ　R 種を変えてやり直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
  plotBoxG = g;
}
// ★ アンビギュイティ分解：(平均 − y)² = 平均ₖ (fₖ − y)² − 平均ₖ (fₖ − 平均)²（点ごとに成り立つ → 全部の点で平均）
function ambiguity(pts) {
  let ens = 0, avg = 0, amb = 0;
  for (let p of pts) { let f = preds(p[0]), m = meanOf(f); ens += (m - p[1]) ** 2; avg += meanOf(f.map((v) => (v - p[1]) ** 2)); amb += varOf(f); }
  let n = pts.length || 1; return { ens: ens / n, avg: avg / n, amb: amb / n };
}
function mousePressed() {
  if (!plotBoxG) return;
  let x = (mouseX - plotBoxG.x) / plotBoxG.w * 1.4 - 0.2, y = 1.5 - ((mouseY - plotBoxG.y) / plotBoxG.h) * 3;
  if (x > -0.2 && x < 1.2 && y > -1.5 && y < 1.5 && added.length < 40) { added.push([x, y]); resetNets(); }
}
function keyPressed() {
  if (key === 'c' || key === 'C') { added = []; resetNets(); }
  if (key === 'b' || key === 'B') { bootOn = !bootOn; resetNets(); }
  if (key === 'r' || key === 'R') { seedBase++; resetNets(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let net = makeMLP(1, 6, false, 3), X = [[-0.5], [0.1], [0.7]], y = [0.2, -0.3, 0.5], G = mlpParams(mlpGrad(net, X, y)), p = mlpParams(net), worst = 0;
  p.forEach((v, q) => { let h = 1e-6, a = p.slice(), b = p.slice(); a[q] = v + h; b[q] = v - h; mlpSetParams(net, a); let la = mlpLoss(net, X, y); mlpSetParams(net, b); let lb = mlpLoss(net, X, y); mlpSetParams(net, p); worst = Math.max(worst, Math.abs((la - lb) / (2 * h) - G[q]) / Math.max(1e-4, Math.abs(G[q]))); });
  check('誤差逆伝播の勾配 = 数値微分（回帰、全 ' + p.length + ' パラメータ、相対誤差 ' + worst.toExponential(1) + '）', worst < 1e-5);
  base = makeGap(4); added = []; nets = []; sets = [];
  let pts = base, Xs = pts.map((q) => inp(q[0])), ys = pts.map((q) => q[1]);
  for (let k = 0; k < 5; k++) { let n = makeMLP(1, HID, false, 1000 + k); mlpTrain(n, Xs, ys, 1500, LR); nets.push(n); }
  let mses = nets.map((n) => mlpLoss(n, Xs, ys) * 2);
  check('5 個のネットとも訓練の 2 乗誤差 < 0.01（' + mses.map((v) => fmtNum(v, 4)).join(', ') + '）', mses.every((v) => v < 0.01));
  let near0 = meanOf([0.15, 0.25, 0.7, 0.8].map((x) => sdOf(preds(x)))), far = meanOf([0.48, -0.15, 1.15].map((x) => sdOf(preds(x))));
  check('ばらつき σ：データのない所（すき間・外側）' + fmtNum(far, 3) + ' > データのある所 ' + fmtNum(near0, 3) + ' の 5 倍', far > 5 * near0);
  check('データのある所では 5 個ともほぼ同じ（σ < 0.05）', near0 < 0.05);
  let a = ambiguity(pts);
  check('アンビギュイティ分解：平均の誤差 = 1 つずつの誤差の平均 − ばらつき（1e-12）、だから平均は「平均的な 1 つ」より悪くならない', near(a.ens, a.avg - a.amb, 1e-12) && a.ens <= a.avg + 1e-15);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. すき間（x = 0.4〜0.6）に点を 1 つクリックしよう。σ の山はどう変わる？
// 2. 外側（x < 0 や x > 1）では σ が大きいまま。「知らない所では自信がない」と言えるのがアンサンブルの強み
// 3. B でブートストラップにすると、データのある所でも少しばらつく。どちらが「自信のなさ」として正直？
// 4. N_NETS を 2 や 20 にすると、σ の形は？ 少なすぎると σ そのものがあてにならない
// 5. 下の式は 00 の多様性予測定理と同じ形。ネットどうしがばらつくほど、平均は 1 つずつより良くなる

// ==================================================
// ここから下は「アンサンブル学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・平均・いちばん大きい番号・数の表示
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumArr(a) / a.length : 0; }
function varOf(a) { let m = meanOf(a), s = 0; for (let v of a) s += (v - m) * (v - m); return a.length ? s / a.length : 0; }   // ÷n の分散
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
function fmtNum(v, d) { if (typeof v !== 'number' || !isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
function pctStr(v) { return fmtNum(100 * v, 1) + '%'; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
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
function rndGauss() { let u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 隠れ層 1 層のニューラルネット（tanh）。cls = true なら出力はシグモイド（交差エントロピー）、false なら直線（2 乗誤差 / 2）
// 学習はフルバッチの Adam。mlpTrain(net, X, y, 回数) を 1 フレームに少しずつ呼べば画面は止まらない
function makeMLP(nIn, nH, cls, seed) {
  seedRng(seed);
  let s1 = 1.5 / Math.sqrt(nIn), net = { nIn, nH, cls, W1: [], b1: [], W2: [], b2: 0, t: 0, ad: null };
  for (let j = 0; j < nH; j++) { net.W1.push(Array.from({ length: nIn }, () => s1 * rndGauss())); net.b1.push(0.5 * rndGauss()); net.W2.push(rndGauss() / Math.sqrt(nH)); }
  return net;
}
function mlpOut(net, x) {
  let o = net.b2;
  for (let j = 0; j < net.nH; j++) { let z = net.b1[j]; for (let k = 0; k < net.nIn; k++) z += net.W1[j][k] * x[k]; o += net.W2[j] * Math.tanh(z); }
  return net.cls ? sigm(o) : o;
}
function mlpLoss(net, X, y) {
  let L = 0;
  for (let i = 0; i < X.length; i++) { let p = mlpOut(net, X[i]); L += net.cls ? -(y[i] ? Math.log(Math.max(1e-12, p)) : Math.log(Math.max(1e-12, 1 - p))) : 0.5 * (p - y[i]) ** 2; }
  return X.length ? L / X.length : 0;
}
// 誤差逆伝播：平均の損失の勾配（W1, b1, W2, b2 と同じ形）
function mlpGrad(net, X, y) {
  let g = { W1: net.W1.map((r) => r.map(() => 0)), b1: net.b1.map(() => 0), W2: net.W2.map(() => 0), b2: 0 }, h = new Array(net.nH), n = X.length || 1;
  for (let i = 0; i < X.length; i++) {
    let x = X[i], o = net.b2;
    for (let j = 0; j < net.nH; j++) { let z = net.b1[j]; for (let k = 0; k < net.nIn; k++) z += net.W1[j][k] * x[k]; h[j] = Math.tanh(z); o += net.W2[j] * h[j]; }
    let d = ((net.cls ? sigm(o) : o) - y[i]) / n;              // どちらの損失でも出力の誤差は (予測 − 正解)
    g.b2 += d;
    for (let j = 0; j < net.nH; j++) { g.W2[j] += d * h[j]; let dz = d * net.W2[j] * (1 - h[j] * h[j]); g.b1[j] += dz; for (let k = 0; k < net.nIn; k++) g.W1[j][k] += dz * x[k]; }
  }
  return g;
}
function mlpParams(o) { return [].concat(...o.W1, o.b1, o.W2, [o.b2]); }   // 全部のパラメータを 1 列に
function mlpSetParams(net, p) { let q = 0; for (let j = 0; j < net.nH; j++) for (let k = 0; k < net.nIn; k++) net.W1[j][k] = p[q++]; for (let j = 0; j < net.nH; j++) net.b1[j] = p[q++]; for (let j = 0; j < net.nH; j++) net.W2[j] = p[q++]; net.b2 = p[q++]; }
function mlpTrain(net, X, y, iters, lr, wd) {   // Adam（β1 = 0.9, β2 = 0.999）、wd = 重みの減衰
  let p = mlpParams(net);
  if (!net.ad) net.ad = { m: p.map(() => 0), v: p.map(() => 0) };
  for (let it = 0; it < iters; it++) {
    let g = mlpParams(mlpGrad(net, X, y)); net.t++;
    let b1t = 1 - Math.pow(0.9, net.t), b2t = 1 - Math.pow(0.999, net.t);
    for (let q = 0; q < p.length; q++) {
      let gq = g[q] + (wd || 0) * p[q];
      net.ad.m[q] = 0.9 * net.ad.m[q] + 0.1 * gq; net.ad.v[q] = 0.999 * net.ad.v[q] + 0.001 * gq * gq;
      p[q] = clampv(p[q] - (lr || 0.02) * (net.ad.m[q] / b1t) / (Math.sqrt(net.ad.v[q] / b2t) + 1e-8), -50, 50);
    }
    mlpSetParams(net, p);
  }
}
// ---- 描く道具：色（オーケストラ：えんじ色の黒、象牙色、金管の金、弦の青緑）、領域の絵、点
const BG_COL = [24, 11, 16];                                     // 背景（えんじ色の黒）
const INK = [242, 233, 214], GOLD = [226, 176, 74], TEAL = [64, 186, 176], WINE = [196, 72, 96];
const CLS_COL = [[226, 170, 70], [60, 182, 176]];                // ★ クラス 0（金）・クラス 1（青緑）の色
function probCol(p, k) {             // クラス 1 の確率 → 背景と混ぜた色（k = 濃さ）
  let c = [], a = clampv(k === undefined ? 0.55 : k, 0, 1) * Math.abs(2 * p - 1) + 0.12;
  for (let q = 0; q < 3; q++) c.push(BG_COL[q] + ((p > 0.5 ? CLS_COL[1][q] : CLS_COL[0][q]) - BG_COL[q]) * a);
  return c;
}
// img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let W = img.width, H = img.height;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    let c = fn((px + 0.5) / W, 1 - (py + 0.5) / H), i = 4 * (px + W * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function toPx(bx, u, v) { return [bx.x + u * bx.w, bx.y + (1 - v) * bx.h]; }   // [0,1]² → 画面
function fromPx(bx, px, py) { return [(px - bx.x) / bx.w, 1 - (py - bx.y) / bx.h]; }
function drawPoints(bx, X, y, r) {
  stroke(10); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r); }
}
function frameBox(bx, col) { noFill(); stroke(...(col || [110, 80, 85])); strokeWeight(1); rect(bx.x, bx.y, bx.w, bx.h); }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95, 70, 75); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(175, 160, 150); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(215, 205, 190); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER); noStroke();
  items.forEach(([c, s], k) => { fill(...c); rect(x, y + 20 * k - 5, 14, 10, 2); fill(220, 210, 195); text(s, x + 22, y + 20 * k); });
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
