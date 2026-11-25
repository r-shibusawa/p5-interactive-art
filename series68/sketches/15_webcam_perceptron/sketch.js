// ============================================
// 15 カメラ映像を学ぶパーセプトロン 📷 ─ 映像を 16 × 12 = 192 画素の明るさに縮め、それを入力にする 1 個のニューロン
// 1 キー = 「A（例：手をあげる）」、2 キー = 「B（手をおろす）」として、いまの映像を 10 枚ずつ教える
// 学習は 00 と同じローゼンブラットの規則（まちがえたら w ← w + y x）を、ためた例で毎フレーム少しずつ（オンライン学習）
// 重み w を画像として見ると、ネットが「どこを見ているか」が分かる（マゼンタ = 明るいと A、ライム = 明るいと B）
// 入力は 1 枚ごとに平均 0・標準偏差 1 にそろえる（部屋の明るさが変わっても大丈夫なように）
// 1 2 例を教える / スペース 学習を止める / R 全部忘れる / C カメラ ⇔ テスト画像 / S 画面を保存
// カメラが使えないときは、テスト画像（マウスを上にすると手があがる人）で動く
// ============================================

const GW16 = 16, GH12 = 12, NIN = GW16 * GH12;   // 縮めた画像の大きさ
const BURST = 10, MAX_EX = 300, PASSES_PER_FRAME = 40;   // ★ 1 回に教える枚数、ためる例の最大、1 フレームに調べる例の数
let cap = null, useCam = true, wPer = null, examples = [], burstLeft = 0, burstCls = 1, exCursor = 0, mistakesWin = [], learnOn = true, lastX = null, frameNoise = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  wPer = new Array(NIN + 1).fill(0);
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(64, 48); cap.hide(); } catch (e) { cap = null; }
}
function camLive() { return useCam && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }

// テスト画像（64 × 48 の明るさ）：人の形。handUp（0〜1）で右手が上がる。ノイズは種つき
function testScene(handUp, seed) {
  seedRng(seed); let px = new Float64Array(64 * 48);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) {
    let v = 60 + y * 1.2 + 25 * rnd();
    if ((x - 32) ** 2 + (y - 16) ** 2 < 36) v = 200;                     // 頭
    if (x > 24 && x < 40 && y > 22 && y < 46) v = 170;                    // 体
    let hx = 44, hy = 30 - 22 * handUp;                                  // 右手の先
    for (let t = 0; t <= 1; t += 0.05) { let ax = 39 + (hx - 39) * t, ay = 26 + (hy - 26) * t; if ((x - ax) ** 2 + (y - ay) ** 2 < 6) v = 210; }
    px[y * 64 + x] = Math.min(255, v);
  }
  return px;
}
// ★ 縮める：4 × 4 の平均で 16 × 12 に → 平均 0・標準偏差 1 にそろえて、最後にバイアスの 1
function features(gray64) {
  let f = new Array(NIN).fill(0);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) f[Math.floor(y / 4) * GW16 + Math.floor(x / 4)] += gray64[y * 64 + x] / 16;
  let m = meanOf(f), sd = Math.sqrt(meanOf(f.map((v) => (v - m) ** 2)));
  return f.map((v) => (sd > 1e-6 ? (v - m) / sd : 0)).concat([1]);
}
function camGray() { cap.loadPixels(); let g = new Float64Array(64 * 48), p = cap.pixels; if (!p || p.length < 64 * 48 * 4) return null; for (let i = 0; i < 64 * 48; i++) g[i] = 0.3 * p[4 * i] + 0.59 * p[4 * i + 1] + 0.11 * p[4 * i + 2]; return g; }
function currentGray() { if (camLive()) { let g = camGray(); if (g) return g; } return testScene(clampv(1 - mouseY / Math.max(1, height), 0, 1), 5000 + (frameNoise++ % 997)); }
// ★ パーセプトロンの 1 回（00 と同じ）
function perceptronUpdate(w, x, y) { if (y * dotV(w, x) <= 0) { for (let i = 0; i < w.length; i++) w[i] += y * x[i]; return true; } return false; }
function trainPerceptron(w, exs, maxEpochs) { let k = 0; for (let e = 0; e < maxEpochs; e++) { let bad = 0; for (let ex of exs) if (perceptronUpdate(w, ex.x, ex.y)) { bad++; k++; } if (!bad) return { k, epochs: e + 1, converged: true }; } return { k, epochs: maxEpochs, converged: false }; }

function draw() {
  background(...BG);
  let gray = currentGray(), x = features(gray); lastX = x;
  if (burstLeft > 0 && frameCount % 3 === 0) { examples.push({ x, y: burstCls, g: gray }); if (examples.length > MAX_EX) examples.shift(); burstLeft--; }
  if (learnOn && examples.length) for (let k = 0; k < PASSES_PER_FRAME; k++) { let ex = examples[exCursor % examples.length]; mistakesWin.push(perceptronUpdate(wPer, ex.x, ex.y) ? 1 : 0); if (mistakesWin.length > 200) mistakesWin.shift(); exCursor++; }
  let score = dotV(wPer, x), nA = examples.filter((e) => e.y > 0).length, okCnt = examples.filter((e) => e.y * dotV(wPer, e.x) > 0).length;
  hudTitle('カメラ映像を学ぶパーセプトロン：いまの答え ' + (score > 0 ? 'A（1）' : score < 0 ? 'B（2）' : '?') + '　例 A ' + nA + ' 枚・B ' + (examples.length - nA) + ' 枚　ためた例の正解 ' + okCnt + ' / ' + examples.length,
    '1 A を教える　2 B を教える（10 枚ずつ）　スペース 学習 ' + (learnOn ? 'ON' : 'OFF') + '　R 全部忘れる　C ' + (camLive() ? 'カメラ' : 'テスト画像（マウスの高さ = 手）') + '　S 保存');
  // ---- 左：映像
  let vw = Math.min(width * 0.36, (height - 200) * (4 / 3)), vh = vw * 0.75, x0 = 40, y0 = 100;
  drawGray(gray, 64, 48, x0, y0, vw, vh);
  stroke(...WIRE); strokeWeight(1); for (let i = 1; i < GW16; i++) line(x0 + (i * vw) / GW16, y0, x0 + (i * vw) / GW16, y0 + vh); for (let j = 1; j < GH12; j++) line(x0, y0 + (j * vh) / GH12, x0 + vw, y0 + (j * vh) / GH12);
  if (burstLeft > 0) { noFill(); stroke(...(burstCls > 0 ? MAG : LIME)); strokeWeight(6); rect(x0, y0, vw, vh); }
  // 答えのバー
  let bx = x0, by = y0 + vh + 30, bw = vw, sc = clampv(score / (Math.abs(score) + 50), -1, 1);
  noStroke(); fill(...PANEL); rect(bx, by, bw, 26, 4); fill(...(sc > 0 ? MAG : LIME)); rect(bx + bw / 2, by, (sc * bw) / 2, 26, 4);
  fill(...INK); textSize(14); textAlign(CENTER, CENTER); text('w·x = ' + fmtN(score, 1) + '　（右 = A、左 = B）', bx + bw / 2, by + 13);
  // ---- 中：入力と重み
  let mx0 = x0 + vw + 40, cw = Math.min(16, (width - mx0 - 300) / GW16 / 1.0);
  textAlign(LEFT, BASELINE); fill(...INK); textSize(14); text('入力 x（16 × 12、平均 0 にそろえた明るさ）', mx0, y0 - 6);
  drawVec(x.slice(0, NIN), mx0, y0, cw, 2.5, false);
  text('重み w（どこを見ているか）', mx0, y0 + GH12 * cw + 40);
  let wm = Math.max(1e-9, ...wPer.slice(0, NIN).map(Math.abs)); drawVec(wPer.slice(0, NIN), mx0, y0 + GH12 * cw + 50, cw, wm, true);
  fill(...SUB); textSize(12); text('マゼンタ = そこが明るいと A、ライム = 明るいと B', mx0, y0 + 2 * GH12 * cw + 70);
  // ---- 右：例と学習のようす
  let rx = mx0 + GW16 * cw + 40; fill(...INK); textSize(14); text('教えた例（最近の A / B）', rx, y0 - 6);
  let showA = examples.filter((e) => e.y > 0).slice(-6), showB = examples.filter((e) => e.y < 0).slice(-6), tw = Math.min(80, (width - rx - 40) / 3 - 8);
  showA.forEach((e, q) => drawGray(e.g, 64, 48, rx + (q % 3) * (tw + 8), y0 + Math.floor(q / 3) * (tw * 0.75 + 8), tw, tw * 0.75, MAG));
  showB.forEach((e, q) => drawGray(e.g, 64, 48, rx + (q % 3) * (tw + 8), y0 + 2 * (tw * 0.75 + 8) + 20 + Math.floor(q / 3) * (tw * 0.75 + 8), tw, tw * 0.75, LIME));
  let ry = y0 + 4 * (tw * 0.75 + 8) + 50, mr = mistakesWin.length ? meanOf(mistakesWin) : 0;
  noStroke(); fill(...INK); textSize(14); text('最近 200 回の修正の割合 ' + fmtN(100 * mr, 1) + '%', rx, ry);
  fill(...SUB); textSize(12);
  ['A と B が直線（超平面）で分けられれば、', '修正は (R/γ)² 回以下で止まる（00 の定理）', '似た映像を A と B 両方に教えると止まらない', '入力 192 個 + バイアス = 重み 193 個'].forEach((s, q) => text(s, rx, ry + 24 + 18 * q));
  drawSelfTest(width - 180, height - 14);
}
function drawGray(g, w, h, x, y, dw, dh, frameCol) {
  let img = drawGray.cache || (drawGray.cache = createImage(64, 48)); img.loadPixels();
  for (let i = 0; i < w * h; i++) { img.pixels[4 * i] = g[i]; img.pixels[4 * i + 1] = g[i]; img.pixels[4 * i + 2] = g[i] * 0.95; img.pixels[4 * i + 3] = 255; }
  img.updatePixels(); image(img, x, y, dw, dh);
  if (frameCol) { noFill(); stroke(...frameCol); strokeWeight(2); rect(x, y, dw, dh); }
}
function drawVec(v, x, y, cw, scl, div) {
  noStroke();
  for (let j = 0; j < GH12; j++) for (let i = 0; i < GW16; i++) { let a = v[j * GW16 + i] / scl; fill(...(div ? divCol(a) : mixCol([10, 20, 22], INK, (a + 1) / 2))); rect(x + i * cw, y + j * cw, cw - 1, cw - 1); }
}

function keyPressed() {
  if (key === '1') { burstLeft = BURST; burstCls = 1; }
  if (key === '2') { burstLeft = BURST; burstCls = -1; }
  if (key === ' ') learnOn = !learnOn;
  if (key === 'r' || key === 'R') { wPer = new Array(NIN + 1).fill(0); examples = []; mistakesWin = []; exCursor = 0; }
  if (key === 'c' || key === 'C') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('webcam_perceptron', 'png');
  return false;
}

// ============================================
// やってみよう
// ・手をあげて 1、おろして 2 を何回か。重みの画像のどこが濃くなる？
// ・顔を左右に動かすなど、別の 2 つを教えてみる。何が見分けやすくて、何が難しい？
// ・A と B に同じような映像を教えると、修正の割合はどうなる？（分けられないと止まらない）
// ・GW16 × GH12 を 8 × 6 にすると、学習は速くなる？ 見分けられなくなる？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let flat = features(new Float64Array(64 * 48).fill(120));
  check('真っ平らな画像：入力は全部 0（標準偏差 0 でも NaN にならない）、最後はバイアスの 1', flat.slice(0, NIN).every((v) => v === 0) && flat[NIN] === 1);
  let f = features(testScene(0.3, 1)), m = meanOf(f.slice(0, NIN)), sd = Math.sqrt(meanOf(f.slice(0, NIN).map((v) => (v - m) ** 2)));
  check('入力は平均 0・標準偏差 1 にそろう（' + fmtE(m) + '、' + fmtN(sd, 6) + '）', Math.abs(m) < 1e-12 && near(sd, 1, 1e-9));
  let tr = [], te = [];
  for (let k = 0; k < 60; k++) tr.push({ x: features(testScene(k % 2 ? 0.55 + 0.45 * ((k * 7) % 10) / 10 : 0.45 * ((k * 3) % 10) / 10, 100 + k)), y: k % 2 ? 1 : -1 });
  for (let k = 0; k < 40; k++) te.push({ x: features(testScene(k % 2 ? 0.6 + 0.4 * ((k * 3) % 10) / 10 : 0.4 * ((k * 7) % 10) / 10, 900 + k)), y: k % 2 ? 1 : -1 });
  let w = new Array(NIN + 1).fill(0), r = trainPerceptron(w, tr, 200), R = Math.max(...tr.map((e) => normV(e.x))), nw = normV(w), gam = Math.min(...tr.map((e) => (e.y * dotV(w, e.x)) / nw));
  check('テスト画像 60 枚（手をあげる / おろす）：' + r.epochs + ' 周で止まり、全部正しい', r.converged && gam > 0);
  check('修正の回数 ' + r.k + ' ≤ (R/γ)² = ' + fmtN((R / gam) ** 2, 0) + '（γ は止まった重みで測る）', r.k <= (R / gam) ** 2);
  let acc = te.filter((e) => e.y * dotV(w, e.x) > 0).length / te.length;
  check('学習に使っていない 40 枚の正解率 ' + fmtN(100 * acc, 0) + '% ≥ 95%', acc >= 0.95);
  let up = 0, low = 0; for (let j = 0; j < 4; j++) for (let i = 10; i < 13; i++) up += w[j * GW16 + i];
  for (let j = 6; j < 9; j++) for (let i = 10; i < 13; i++) low += w[j * GW16 + i];
  check('重みの画像：手が上がる場所（右上）は A（+）、手が下がる場所は B（−）', up > 0 && low < 0);
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
