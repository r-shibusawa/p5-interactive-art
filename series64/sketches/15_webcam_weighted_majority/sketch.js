// ============================================
// 15 カメラ映像で重み付き多数決 📷 ─ 単純な 6 つの「検出器」が、画素ごとに「前景（手前のもの）か？」を投票する
// 明るさ・赤み・動き（前のフレームとの差）・エッジ・まん中・背景との差（ゆっくり覚えた背景と比べる）。どれも単独ではまちがいが多い
//   重み付き多数決：重み w の合計が大きい方の意見に従う。クリックで正解を教えると、まちがえた検出器の重みを (1 − ε) 倍にする
//   自分のまちがい ≤ 2(1 + ε)·m* + 2 ln n / ε（m* = いちばん良い検出器のまちがい、n = 6）← series17/11 の乗算型重み更新法と同じ式
//   カメラがなければテスト画像（動く人形が前景）。T でテスト画像の正解を自動で教える
// 1 / 2 クリックで教えるのは「前景」/「背景」 / クリック 正解を教える / T 自動で教える / ↑↓ ε / C 重みを戻す / V カメラ ⇔ テスト画像 / S 保存
// ============================================

const CW = 160, CH = 120, NDET = 6;
const DET_NAMES = ['明るさ', '赤み', '動き', 'エッジ', 'まん中', '背景との差'];
const DET_COL = [[236, 214, 160], [240, 120, 100], [64, 186, 176], [110, 165, 240], [190, 135, 235], [150, 210, 95]];
let eps = 0.25, teachFg = 1, autoTeach = true, useCam = true;   // ★ eps = まちがえた検出器の重みを減らす割合
let lastDet = null, cap, srcImg, outImg, thumbs = [], wts, detMiss, algMiss = 0, nTaught = 0, prevLum = null, bgModel = null, votes = null, clicks = [], vidBox, outBox, tFrame = 0;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
  srcImg = createImage(CW, CH); outImg = createImage(CW, CH); for (let k = 0; k < NDET; k++) thumbs.push(createImage(CW, CH));
  selfTest(); resetWeights();
}
function resetWeights() { wts = new Array(NDET).fill(1); detMiss = new Array(NDET).fill(0); algMiss = 0; nTaught = 0; clicks = []; }
// テスト画像（t = 時刻）：暗い部屋、明るいランプ（背景）、しまもようの壁（背景）、左右に動く人形（前景：赤っぽい顔 + 青い服）
function figureAt(t) { return { x: 80 + 45 * Math.sin(t * 0.03), y: 62 }; }
function isFigure(x, y, t) { let f = figureAt(t); return (x - f.x) ** 2 + (y - f.y + 24) ** 2 < 13 ** 2 || (Math.abs(x - f.x) < 15 && y > f.y - 12 && y < f.y + 40); }
function testFrame(t) {
  let p = new Uint8ClampedArray(CW * CH * 4), f = figureAt(t);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let c = [50 + 0.2 * y, 55 + 0.15 * x, 75];
    if ((x - 25) ** 2 + (y - 22) ** 2 < 14 ** 2) c = [250, 240, 190];                     // ランプ
    if (x > 125 && Math.floor(x / 4) % 2 === 0) c = [150, 150, 160];                      // しまの壁
    if ((x - f.x) ** 2 + (y - f.y + 24) ** 2 < 13 ** 2) c = [225, 150, 120];              // 顔
    else if (Math.abs(x - f.x) < 15 && y > f.y - 12 && y < f.y + 40) c = [40, 70, 160];   // 服
    let i = 4 * (x + CW * y); p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255;
  }
  return p;
}
function currentPixels() {
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) return { px: cap.pixels, live: true }; }
  return { px: testFrame(tFrame), live: false };
}
// ★ 6 つの検出器の票（画素ごとに 0/1）。lum = 明るさ、prev = 前のフレームの明るさ、bg = 覚えた背景
function detectAll(px, prev, bg) {
  let n = CW * CH, lum = new Float32Array(n), v = Array.from({ length: NDET }, () => new Uint8Array(n));
  for (let i = 0; i < n; i++) lum[i] = (0.3 * px[4 * i] + 0.59 * px[4 * i + 1] + 0.11 * px[4 * i + 2]) / 255;
  for (let i = 0; i < n; i++) {
    let x = i % CW, y = Math.floor(i / CW), r = px[4 * i] / 255, g = px[4 * i + 1] / 255, b = px[4 * i + 2] / 255;
    v[0][i] = lum[i] > 0.55 ? 1 : 0;                                                      // ★ しきい値
    v[1][i] = r - (g + b) / 2 > 0.12 ? 1 : 0;
    v[2][i] = prev && Math.abs(lum[i] - prev[i]) > 0.06 ? 1 : 0;
    let gx = x > 0 && x < CW - 1 ? lum[i + 1] - lum[i - 1] : 0, gy = y > 0 && y < CH - 1 ? lum[i + CW] - lum[i - CW] : 0;
    v[3][i] = Math.abs(gx) + Math.abs(gy) > 0.15 ? 1 : 0;
    v[4][i] = ((x - CW / 2) / CW) ** 2 + ((y - CH / 2) / CH) ** 2 < 0.06 ? 1 : 0;
    v[5][i] = bg && Math.abs(lum[i] - bg[i]) > 0.1 ? 1 : 0;
  }
  return { lum, v };
}
function updateBg(bg, lum) { if (!bg) return Float32Array.from(lum); for (let i = 0; i < lum.length; i++) bg[i] += 0.01 * (lum[i] - bg[i]); return bg; }   // ゆっくり覚える背景
// ★ 重み付き多数決：前景の票の重み > 全体の半分 なら前景
function wmVote(w, d) { let s = 0, tot = 0; for (let k = 0; k < w.length; k++) { tot += w[k]; if (d[k]) s += w[k]; } return 2 * s > tot ? 1 : 0; }
// ★ 正解を 1 つ教える：まちがえた検出器の重みを (1 − ε) 倍（小さくなりすぎたら全体を割り直す）
function teach(w, d, truth, e) {
  let alg = wmVote(w, d), out = w.map((v, k) => (d[k] !== truth ? v * (1 - e) : v)), mx = Math.max(...out);
  if (mx < 1e-100) out = out.map((v) => v / mx);
  return { w: out, wrongAlg: alg !== truth };
}
function teachAt(det, i, truth) {
  let d = det.v.map((a) => a[i]), r = teach(wts, d, truth, eps);
  d.forEach((v, k) => { if (v !== truth) detMiss[k]++; }); if (r.wrongAlg) algMiss++; nTaught++; wts = r.w;
  clicks.push({ i, truth, t: millis() }); if (clicks.length > 40) clicks.shift();
}

function draw() {
  background(...BG_COL);
  tFrame++;
  let { px, live } = currentPixels(), det = detectAll(px, prevLum, bgModel);
  prevLum = det.lum; bgModel = updateBg(bgModel, det.lum); lastDet = det;
  if (!live && autoTeach && frameCount % 6 === 0 && nTaught < 400) { let i = Math.floor(rnd() * CW * CH); teachAt(det, i, isFigure(i % CW, Math.floor(i / CW), tFrame) ? 1 : 0); }
  // ---- 画像を作る
  srcImg.loadPixels(); outImg.loadPixels(); thumbs.forEach((t) => t.loadPixels());
  let tot0 = sumArr(wts), sp = srcImg.pixels, op = outImg.pixels, tp = thumbs.map((t) => t.pixels);
  for (let i = 0; i < CW * CH; i++) {
    let fgW = 0, gray = det.lum[i] * 255, j = 4 * i;
    for (let k = 0; k < NDET; k++) { let on = det.v[k][i]; if (on) fgW += wts[k]; tp[k][j] = on ? DET_COL[k][0] : 25; tp[k][j + 1] = on ? DET_COL[k][1] : 14; tp[k][j + 2] = on ? DET_COL[k][2] : 20; tp[k][j + 3] = 255; }
    let fg = 2 * fgW > tot0;                // wmVote と同じ（速くするために展開）
    sp[j] = px[j]; sp[j + 1] = px[j + 1]; sp[j + 2] = px[j + 2]; sp[j + 3] = 255;
    op[j] = fg ? CLS_COL[1][0] * 0.7 + gray * 0.3 : gray * 0.35; op[j + 1] = fg ? CLS_COL[1][1] * 0.7 + gray * 0.3 : gray * 0.35; op[j + 2] = fg ? CLS_COL[1][2] * 0.7 + gray * 0.3 : gray * 0.35; op[j + 3] = 255;
  }
  srcImg.updatePixels(); outImg.updatePixels(); thumbs.forEach((t) => t.updatePixels());
  let s = Math.min((width - 140) / (2 * CW), (height - 420) / CH);
  vidBox = { x: 40, y: 100, w: CW * s, h: CH * s }; outBox = { x: 80 + CW * s, y: 100, w: CW * s, h: CH * s };
  image(srcImg, vidBox.x, vidBox.y, vidBox.w, vidBox.h); noSmooth(); image(outImg, outBox.x, outBox.y, outBox.w, outBox.h); smooth();
  for (let c of clicks) for (let b of [vidBox, outBox]) { let x = b.x + ((c.i % CW) + 0.5) * s, y = b.y + (Math.floor(c.i / CW) + 0.5) * s; noFill(); stroke(...(c.truth ? TEAL : WINE)); strokeWeight(2); circle(x, y, 9); }
  noStroke(); fill(...INK); textSize(14); textAlign(LEFT, BASELINE);
  text(live ? 'カメラ' : 'テスト画像（動く人形が前景）', vidBox.x, vidBox.y - 8); text('重み付き多数決：青緑 = 前景', outBox.x, outBox.y - 8);
  // ---- 下：6 つの検出器と重み
  let ty = vidBox.y + vidBox.h + 30, tw = Math.min(130, (width - 80) / NDET - 16), th = (tw * CH) / CW, tot = sumArr(wts);
  for (let k = 0; k < NDET; k++) {
    let x = 40 + k * (tw + 16); noSmooth(); image(thumbs[k], x, ty, tw, th); smooth();
    noStroke(); fill(...DET_COL[k]); textSize(13); textAlign(LEFT, BASELINE); text(DET_NAMES[k], x, ty + th + 18);
    fill(60, 45, 50); rect(x, ty + th + 26, tw, 12); fill(...DET_COL[k]); rect(x, ty + th + 26, (tw * wts[k]) / Math.max(...wts), 12);
    fill(200, 185, 170); textSize(12); text('重み ' + fmtNum(wts[k] / tot, 3), x, ty + th + 56); text('まちがい ' + detMiss[k], x, ty + th + 74);
  }
  let mStar = Math.min(...detMiss), bound = 2 * (1 + eps) * mStar + (2 * Math.log(NDET)) / eps;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text('教えた数 ' + nTaught + '　多数決のまちがい ' + algMiss + ' ≤ 2(1 + ε)·' + mStar + ' + 2 ln 6 / ε = ' + fmtNum(bound, 1) + '（いちばん良い検出器：' + DET_NAMES[detMiss.indexOf(mStar)] + '）', 40, height - 40);
  // ---- 文字
  fill(...INK); textSize(20); text('カメラ映像で重み付き多数決　ε = ' + fmtNum(eps, 2) + '　クリックで教えるのは「' + (teachFg ? '前景' : '背景') + '」', 40, 40);
  fill(170, 155, 145); textSize(15); text('1 前景 / 2 背景　クリック 正解を教える　T 自動' + (autoTeach ? '（ON）' : '（OFF）') + '　↑↓ ε　C 重みを戻す　V カメラ ⇔ テスト画像　S 保存', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function mousePressed() {
  if (!lastDet) return;
  for (let b of [vidBox, outBox]) {
    if (!b) continue;
    let u = (mouseX - b.x) / b.w, v = (mouseY - b.y) / b.h;
    if (u >= 0 && u < 1 && v >= 0 && v < 1) { teachAt(lastDet, Math.floor(u * CW) + CW * Math.floor(v * CH), teachFg); return; }
  }
}
function keyPressed() {
  if (key === '1') teachFg = 1;
  if (key === '2') teachFg = 0;
  if (key === 't' || key === 'T') autoTeach = !autoTeach;
  if (key === UP_ARROW) eps = Math.min(0.5, eps + 0.05);
  if (key === DOWN_ARROW) eps = Math.max(0.05, eps - 0.05);
  if (key === 'c' || key === 'C') resetWeights();
  if (key === 'v' || key === 'V') { useCam = !useCam; prevLum = null; bgModel = null; }
  if (key === 's' || key === 'S') saveCanvas('weighted_majority', 'png');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let w0 = [1, 0.5, 0.25, 1, 1, 1], d = [1, 0, 1, 0, 1, 0], r = teach(w0, d, 1, 0.25);
  check('教えると、まちがえた検出器（2・4・6）だけ重みが × 0.75、当たった検出器はそのまま', r.w.every((v, k) => near(v, d[k] !== 1 ? w0[k] * 0.75 : w0[k], 1e-15)));
  let okV = true; seedRng(4);
  for (let t = 0; t < 300; t++) { let w = w0.map(() => rnd()), dd = w0.map(() => (rnd() < 0.5 ? 1 : 0)), fgW = 0; dd.forEach((v, k) => (fgW += v ? w[k] : 0)); if (wmVote(w, dd) !== (fgW > sumArr(w) - fgW ? 1 : 0)) okV = false; }
  check('重み付き多数決 = 前景の票の重み > 背景の票の重み（300 通り）。重みが全部 1 ならふつうの多数決（3 対 3 は背景）', okV && wmVote([1, 1, 1, 1, 1, 1], [1, 1, 1, 0, 0, 0]) === 0 && wmVote([1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 0, 0]) === 1);
  let f0 = testFrame(0), f1 = testFrame(10), d0 = detectAll(f0, null, null), d1 = detectAll(f1, d0.lum, d0.lum), fp = figureAt(10);
  check('テスト画像：160 × 120、NaN なし。人形の顔は「赤み」、ランプは「明るさ」、動いた人形のふちは「動き」が反応する', f0.length === CW * CH * 4 && noNaN(Array.from(d1.lum)) && d1.v[1][Math.round(fp.x) + CW * Math.round(fp.y - 24)] === 1 && d1.v[0][25 + CW * 22] === 1 && d1.v[2].some((v, i) => v && isFigure(i % CW, Math.floor(i / CW), 10)));
  let w = new Array(NDET).fill(1), miss = new Array(NDET).fill(0), alg = 0, prev = null, bg = null; seedRng(8);
  for (let t = 0; t < 400; t++) {
    let det = detectAll(testFrame(t), prev, bg); prev = det.lum; bg = updateBg(bg, det.lum);
    if (t < 30) continue;                 // 背景を覚えるまで少し待つ
    let i = Math.floor(rnd() * CW * CH), truth = isFigure(i % CW, Math.floor(i / CW), t) ? 1 : 0, dd = det.v.map((a) => a[i]), rr = teach(w, dd, truth, 0.25);
    dd.forEach((v, k) => { if (v !== truth) miss[k]++; }); if (rr.wrongAlg) alg++; w = rr.w;
  }
  let ms = Math.min(...miss), bd = 2 * 1.25 * ms + (2 * Math.log(NDET)) / 0.25;
  check('テスト画像で 370 回教える：多数決のまちがい ' + alg + ' ≤ 上限 2(1 + ε)m* + 2 ln 6/ε = ' + fmtNum(bd, 1) + '（m* = ' + ms + '）', alg <= bd);
  check('いちばんまちがいの少ない検出器（' + DET_NAMES[miss.indexOf(ms)] + '）の重みがいちばん大きい。重みはすべて正で有限', argMaxArr(w) === miss.indexOf(ms) && w.every((v) => v > 0 && isFinite(v)));
  let sv = useCam; useCam = false; let cp = currentPixels(); useCam = sv;
  check('カメラを使わないとき（V）はテスト画像に切りかわる（大きさ 160 × 120）', !cp.live && cp.px.length === CW * CH * 4);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. T を切って、自分でクリックして教えよう（1 前景 / 2 背景）。何回教えると塗り分けが落ち着く？
// 2. ↑↓ で ε を大きくすると、重みの変わり方は？ 速く決まるが、たまたまのまちがいにも振り回される
// 3. カメラでは、どの検出器が強い？ 部屋の明るさ・服の色・動き方で答えが変わる
// 4. 検出器を 1 つ自分で作ろう（例：青み b − (r + g)/2 > 0.1）。NDET と DET_NAMES も増やす
// 5. series17/11 では天気予報の専門家に同じ更新をしている。「誰が当たるか分からないとき」の強い作戦。S で保存

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
