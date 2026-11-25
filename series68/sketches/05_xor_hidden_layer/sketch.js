// ============================================
// 05 隠れ層が XOR を解く ─ 入力 2・隠れ 2（tanh）・出力 1（シグモイド）の小さなネット（2-2-1）
// XOR（(0,1) と (1,0) が 1、(0,0) と (1,1) が 0）は 1 本の直線では分けられない（00・02）。
// でも隠れ層は 4 点を新しい場所 h = (h1, h2) に写す。真ん中のパネル（隠れ層の空間）で 4 点が直線で分けられるようになれば、
// 出力のニューロン（ただの直線 = パーセプトロン）で答えられる。学習は交差エントロピーの勾配降下（誤差逆伝播は 04 と同じ）
// 初期値によっては「2 点だけ正しい」谷（損失 ≈ 0.347 = ln2 / 2）にはまって抜け出せない → 種を変えて試す
// ← → 種（初期値）を変える / スペース 一時停止 / F 速さ / R 同じ種でやり直し
// ============================================

const LR = 1.0;                          // ★ 学習率
const XOR_X = [[0, 0], [0, 1], [1, 0], [1, 1]], XOR_Y = [0, 1, 1, 0];
const SPEED_LIST = [1, 4, 20];
let seedX = 2, prm = null, stepsDone = 0, lossLog = [], paused = false, spdI = 1, inBuf = null, hidBuf = null, seedStats = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  inBuf = createGraphics(90, 90); inBuf.pixelDensity(1);
  hidBuf = createGraphics(90, 90); hidBuf.pixelDensity(1);
  seedStats = surveySeeds(40, 3000);
  restart();
}

// パラメータ：w1[j] = 隠れ j への重み (2 個)、b1[j]、w2[j]（隠れ j → 出力）、b2
function initXor(seed) { seedRng(seed); return { w1: [[randn(), randn()], [randn(), randn()]], b1: [randn(), randn()], w2: [randn(), randn()], b2: randn() }; }
function hiddenOf(p, x) { return [0, 1].map((j) => Math.tanh(p.w1[j][0] * x[0] + p.w1[j][1] * x[1] + p.b1[j])); }
function outFromH(p, h) { return sigm(p.w2[0] * h[0] + p.w2[1] * h[1] + p.b2); }
function xorLoss(p) { let s = 0; for (let i = 0; i < 4; i++) { let o = clampv(outFromH(p, hiddenOf(p, XOR_X[i])), 1e-15, 1 - 1e-15); s -= XOR_Y[i] ? Math.log(o) : Math.log(1 - o); } return s / 4; }
// ★ 誤差逆伝播：出力の誤差 d = (o − y)/4 → w2, b2。隠れへは d × w2 × (1 − h²)
function xorGrad(p) {
  let g = { w1: [[0, 0], [0, 0]], b1: [0, 0], w2: [0, 0], b2: 0 };
  for (let i = 0; i < 4; i++) {
    let x = XOR_X[i], h = hiddenOf(p, x), d = (outFromH(p, h) - XOR_Y[i]) / 4;
    g.b2 += d;
    for (let j = 0; j < 2; j++) { g.w2[j] += d * h[j]; let dz = d * p.w2[j] * (1 - h[j] * h[j]); g.b1[j] += dz; g.w1[j][0] += dz * x[0]; g.w1[j][1] += dz * x[1]; }
  }
  return g;
}
function xorStep(p, lr) {
  let g = xorGrad(p);
  for (let j = 0; j < 2; j++) { p.b1[j] -= lr * g.b1[j]; p.w2[j] -= lr * g.w2[j]; p.w1[j][0] -= lr * g.w1[j][0]; p.w1[j][1] -= lr * g.w1[j][1]; p.w2[j] = clampv(p.w2[j], -60, 60); }
  p.b2 = clampv(p.b2 - lr * g.b2, -60, 60);
}
function trainXor(seed, maxSteps) { let p = initXor(seed), k = 0; for (; k < maxSteps; k++) { if (xorLoss(p) < 0.01) break; xorStep(p, LR); } return { p, k, loss: xorLoss(p) }; }
function surveySeeds(n, maxSteps) { let ok = 0, list = []; for (let s = 1; s <= n; s++) { let r = trainXor(s, maxSteps); list.push(r.loss < 0.01); if (r.loss < 0.01) ok++; } return { ok, n, list }; }
// 4 点が直線で分けられるか（バイアスつきパーセプトロンが 2000 周以内に止まるか）
function linSep4(hs, ys) {
  let w = [0, 0, 0];
  for (let e = 0; e < 2000; e++) { let bad = 0; for (let i = 0; i < hs.length; i++) { let x = [hs[i][0], hs[i][1], 1], y = ys[i] ? 1 : -1; if (y * dotV(w, x) <= 0) { bad++; for (let q = 0; q < 3; q++) w[q] += y * x[q]; } } if (!bad) return true; }
  return false;
}
function restart() { prm = initXor(seedX); stepsDone = 0; lossLog = [xorLoss(prm)]; }

function draw() {
  background(...BG);
  if (!paused) for (let k = 0; k < SPEED_LIST[spdI]; k++) { if (stepsDone >= 20000) break; xorStep(prm, LR); stepsDone++; if (stepsDone % 4 === 0) { lossLog.push(xorLoss(prm)); if (lossLog.length > 1500) lossLog.splice(0, lossLog.length - 1500); } }
  let L = xorLoss(prm), hs = XOR_X.map((x) => hiddenOf(prm, x)), solved = XOR_X.every((x, i) => (outFromH(prm, hs[i]) > 0.5) === !!XOR_Y[i]);
  hudTitle('隠れ層が XOR を解く（2-2-1）：種 ' + seedX + '　' + stepsDone + ' 歩　損失 ' + fmtN(L, 4) + (solved ? '　→ 4 点とも正解' : L > 0.3 && stepsDone > 3000 ? '　→ 谷にはまった（← → で種を変える）' : ''),
    '← → 種（初期値）　スペース ' + (paused ? '再開' : '一時停止') + '　F 速さ ×' + SPEED_LIST[spdI] + '　R やり直し　｜　40 個の種のうち ' + seedStats.ok + ' 個が 3000 歩以内に解ける');
  let sz = Math.min((width - 140) / 3, height - 260), y0 = 110;
  // ---- 左：入力の空間
  let a = { x: 40, y: y0, w: sz }, b = { x: 40 + sz + 50, y: y0, w: sz };
  if (frameCount % 4 === 1 || !inBuf.painted) {
    paintImage(inBuf, (u, v) => { let x = [-0.5 + 2 * u, -0.5 + 2 * v]; return probCol(outFromH(prm, hiddenOf(prm, x))); });
    paintImage(hidBuf, (u, v) => { let h = [-1.1 + 2.2 * u, -1.1 + 2.2 * v]; return probCol(outFromH(prm, h)); });
    inBuf.painted = true;
  }
  image(inBuf, a.x, a.y, sz, sz); image(hidBuf, b.x, b.y, sz, sz);
  let toA = (x) => [a.x + ((x[0] + 0.5) / 2) * sz, a.y + (1 - (x[1] + 0.5) / 2) * sz], toB = (h) => [b.x + ((h[0] + 1.1) / 2.2) * sz, b.y + (1 - (h[1] + 1.1) / 2.2) * sz];
  // 隠れニューロン 2 個の直線（入力の空間）と、出力の直線（隠れの空間）
  [SKY, AMBER].forEach((c, j) => drawLineIn(a, sz, prm.w1[j][0], prm.w1[j][1], prm.b1[j], (u) => -0.5 + 2 * u, c));
  drawLineIn(b, sz, prm.w2[0], prm.w2[1], prm.b2, (u) => -1.1 + 2.2 * u, INK);
  XOR_X.forEach((x, i) => {
    let p = toA(x), q = toB(hs[i]);
    stroke(20); strokeWeight(1.5); fill(...(XOR_Y[i] ? MAG : LIME)); circle(p[0], p[1], 18); circle(q[0], q[1], 18);
    noStroke(); fill(...INK); textSize(12); textAlign(LEFT, BOTTOM); text('(' + x[0] + ',' + x[1] + ')', p[0] + 10, p[1] - 6); text('(' + x[0] + ',' + x[1] + ')', q[0] + 10, q[1] - 6);
  });
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text('入力の空間 (x1, x2)：色 = ネットの出力', a.x, a.y - 10);
  text('隠れ層の空間 (h1, h2)：4 点の写り先', b.x, b.y - 10);
  fill(...SUB); textSize(13);
  text('水色・オレンジの線 = 隠れニューロン 1・2 の境目（tanh = 0）', a.x, a.y + sz + 22);
  text('2 本の線で平面を 3〜4 つに切り分けている', a.x, a.y + sz + 42);
  text('白の線 = 出力ニューロンの境目（ただの直線）', b.x, b.y + sz + 22);
  text('ここで直線で分けられれば XOR が解ける' + (linSep4(hs, XOR_Y) ? '　✓ いま分けられる' : '　✗ まだ分けられない'), b.x, b.y + sz + 42);
  // ---- 右：損失
  let rx = b.x + sz + 50, g = { x: rx, y: y0, w: width - rx - 40, h: sz * 0.62, x0: 0, x1: Math.max(10, lossLog.length - 1), y0: -3, y1: 0.5 };
  plotAxes(g, '学習の歩数（×4）', 'log₁₀ 損失（交差エントロピー）', [0, g.x1], [-3, -2, -1, 0]);
  stroke(...WIRE); line(g.x, gY(g, Math.log10(0.347)), g.x + g.w, gY(g, Math.log10(0.347)));
  noStroke(); fill(...SUB); textSize(11); text('谷 0.347 = (ln 2)/2', g.x + 4, gY(g, Math.log10(0.347)) - 4);
  plotXY(g, lossLog.map((_, i) => i), lossLog.map((v) => Math.log10(Math.max(1e-6, v))), AMBER, 2);
  let ty = g.y + g.h + 60; noStroke(); fill(...INK); textSize(14);
  text('w1 = [' + prm.w1.map((r) => r.map((v) => fmtN(v, 2)).join(', ')).join(' | ') + ']', rx, ty);
  text('b1 = [' + prm.b1.map((v) => fmtN(v, 2)).join(', ') + ']　w2 = [' + prm.w2.map((v) => fmtN(v, 2)).join(', ') + ']　b2 = ' + fmtN(prm.b2, 2), rx, ty + 22);
  // 種ごとの成否
  fill(...SUB); textSize(13); text('種 1〜40：3000 歩で解けた ●／谷 ○', rx, ty + 54);
  seedStats.list.forEach((okv, i) => { let cx = rx + 8 + (i % 20) * 16, cy = ty + 72 + Math.floor(i / 20) * 18; if (okv) { noStroke(); fill(...LIME); } else { noFill(); stroke(...MAG); strokeWeight(1.5); } if (i + 1 === seedX) { stroke(...INK); strokeWeight(2.5); } circle(cx, cy, 11); });
  drawSelfTest(width - 180, height - 14);
}
function probCol(p) { let t = 2 * p - 1; return t >= 0 ? mixCol(PANEL, MAG, 0.12 + 0.5 * t) : mixCol(PANEL, LIME, 0.12 - 0.5 * t); }   // 出力の確率 → 色（0.5 の境目で切りかわる）
function drawLineIn(bx, sz, w1, w2, c, toVal, col) {   // w1 u + w2 v + c = 0 をパネルの中に
  let pts = [];
  for (let k = 0; k <= 1; k++) { let x = toVal(k); if (Math.abs(w2) > 1e-9) pts.push([x, -(w1 * x + c) / w2]); }
  if (pts.length < 2 && Math.abs(w1) > 1e-9) { let x = -c / w1; pts = [[x, toVal(0)], [x, toVal(1)]]; }
  if (pts.length < 2) return;
  let lo = toVal(0), span = toVal(1) - lo, P = pts.map((p) => [bx.x + ((p[0] - lo) / span) * sz, bx.y + (1 - (p[1] - lo) / span) * sz]);
  drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(bx.x, bx.y, sz, sz); drawingContext.clip();
  stroke(...col); strokeWeight(2.5); line(P[0][0], P[0][1], P[1][0], P[1][1]); drawingContext.restore();
}

function keyPressed() {
  if (key === RIGHT_ARROW) { seedX = seedX % 40 + 1; restart(); }
  if (key === LEFT_ARROW) { seedX = seedX === 1 ? 40 : seedX - 1; restart(); }
  if (key === ' ') paused = !paused;
  if (key === 'f' || key === 'F') spdI = (spdI + 1) % SPEED_LIST.length;
  if (key === 'r' || key === 'R') restart();
  return false;
}

// ============================================
// やってみよう
// ・種 2 で、隠れ層の空間の 4 点がどう動いて直線で分けられるようになるかを見る
// ・← → で谷にはまる種（○）を探す。そのとき隠れ層の空間で 4 点はどうなっている？
// ・LR を 0.3 や 3 にすると、解ける種の数は変わる？
// ・隠れ層を 3 個にしたら谷にはまりにくくなる？（initXor と hiddenOf を書きかえる）
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let r = trainXor(2, 3000), hs = XOR_X.map((x) => hiddenOf(r.p, x));
  check('種 2：' + r.k + ' 歩で損失 < 0.01（' + fmtE(r.loss) + '）', r.loss < 0.01);
  check('学習後、隠れ層の空間の 4 点は直線で分けられる', linSep4(hs, XOR_Y));
  check('入力の空間の XOR 4 点は直線で分けられない', !linSep4(XOR_X, XOR_Y));
  let f = trainXor(1, 3000), fh = XOR_X.map((x) => hiddenOf(f.p, x)), fOk = XOR_X.every((x, i) => (outFromH(f.p, fh[i]) > 0.5) === !!XOR_Y[i]);
  check('種 1：谷にはまる（3000 歩でも損失 ' + fmtN(f.loss, 3) + ' ≈ (ln 2)/2、全問正解できない）', Math.abs(f.loss - Math.log(2) / 2) < 0.01 && !fOk);
  let p = initXor(7), g = xorGrad(p), worst = 0, hh = 1e-6;
  let probe = (fnSet) => { let a = JSON.parse(JSON.stringify(p)), b = JSON.parse(JSON.stringify(p)); fnSet(a, hh); fnSet(b, -hh); return (xorLoss(a) - xorLoss(b)) / (2 * hh); };
  for (let j = 0; j < 2; j++) {
    worst = Math.max(worst, relErr(g.w2[j], probe((q, d) => (q.w2[j] += d))), relErr(g.b1[j], probe((q, d) => (q.b1[j] += d))));
    for (let k = 0; k < 2; k++) worst = Math.max(worst, relErr(g.w1[j][k], probe((q, d) => (q.w1[j][k] += d))));
  }
  worst = Math.max(worst, relErr(g.b2, probe((q, d) => (q.b2 += d))));
  check('逆伝播の勾配 = 中心差分（相対誤差 ' + fmtE(worst) + '）', worst < 1e-6);
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
// ---- 行列の道具
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function dotV(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function normV(a) { return Math.sqrt(dotV(a, a)); }
function matVec(a, v) { return a.map((r) => dotV(r, v)); }
function transposeM(a) { return a[0].map((_, j) => a.map((r) => r[j])); }
function solveLinear(a, b) {             // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = b.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-300) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) { let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  let x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = m[i][n]; for (let k = i + 1; k < n; k++) s -= m[i][k] * x[k]; x[i] = s / m[i][i]; }
  return x.every((v) => isFinite(v)) ? x : null;
}
// リッジ回帰 (ΦᵀΦ + λI) w = Φᵀ y。phi = 行がデータ、列が特徴
function ridgeSolve(phi, y, lam) {
  let p = phi[0].length, a = zerosMat(p), b = new Array(p).fill(0);
  for (let i = 0; i < phi.length; i++) { let f = phi[i]; for (let j = 0; j < p; j++) { b[j] += f[j] * y[i]; for (let k = j; k < p; k++) a[j][k] += f[j] * f[k]; } }
  for (let j = 0; j < p; j++) { a[j][j] += lam; for (let k = 0; k < j; k++) a[j][k] = a[k][j]; }
  return solveLinear(a, b) || new Array(p).fill(0);
}
// ---- 画像の道具：img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let w = img.width, h = img.height, d = img.pixelDensity ? img.pixelDensity() : 1;
  for (let py = 0; py < h * d; py++) for (let px = 0; px < w * d; px++) {
    let c = fn((px + 0.5) / (w * d), 1 - (py + 0.5) / (h * d)), i = 4 * (px + w * d * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function mixCol(a, b, t) { t = clampv(t, 0, 1); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function divCol(v) { return v >= 0 ? mixCol(PANEL, MAG, v) : mixCol(PANEL, LIME, -v); }   // −1〜1 → ライム・暗い・マゼンタ
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
