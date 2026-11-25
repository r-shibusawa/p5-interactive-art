// ============================================
// 10 畳み込みと等変性 ─ 3 × 3 のフィルタ（重み 9 個）を画像の全部の場所で使い回す「畳み込み層」
// 出力 y[i][j] = Σ k[a][b] × x[i + a][j + b]。どの場所でも同じ重みなので、入力をずらすと出力もそのままずれる（並進等変性）
//   conv(ずらす(x)) = ずらす(conv(x))。この画面では、はしは反対側につながる「輪っか」（循環境界）で計算するので、差はぴったり 0
//   （0 で埋める境界だと、はしの数マスだけ差が出る。内側の画素は同じ）
// 全結合なら 32 × 24 の画像 → 同じ大きさの出力に 768 × 768 = 589,824 個の重み。畳み込みは 9 個
// 層を重ねると、1 つの出力が見ている入力の範囲（受容野）が 3 × 3 → 5 × 5 → 7 × 7 … と広がる
// ドラッグ 絵を描く（Shift で消す）/ 1〜4 フィルタ / ← → ↑↓ 入力をずらす / L 受容野の層の数 / C 消す / D お手本の絵 / N ランダムな絵
// ============================================

const IW = 32, IH = 24;                  // ★ 画像の大きさ
const FILTERS = [
  ['縦の縁（ソーベル x）', [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]],
  ['横の縁（ソーベル y）', [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]],
  ['ぼかし', [[1 / 16, 2 / 16, 1 / 16], [2 / 16, 4 / 16, 2 / 16], [1 / 16, 2 / 16, 1 / 16]]],
  ['ラプラシアン', [[0, 1, 0], [1, -4, 1], [0, 1, 0]]],
];
let img = null, fIdx = 0, shX = 3, shY = 2, rfLayers = 2, seedI = 1, panelBufs = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  img = defaultPicture();
}

function blankImg() { return Array.from({ length: IH }, () => new Array(IW).fill(0)); }
function defaultPicture() {              // ★ お手本：家と丸
  let a = blankImg();
  for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) {
    if (i >= 4 && i <= 13 && j >= 11 && j <= 19) a[j][i] = 1;
    if (j >= 5 && j <= 10 && Math.abs(i - 8.5) <= j - 4.5) a[j][i] = 1;
    if (i >= 7 && i <= 9 && j >= 15 && j <= 19) a[j][i] = 0;
    if ((i - 23) ** 2 + (j - 9) ** 2 <= 20) a[j][i] = 1;
    if (j === 21 && i >= 18 && i <= 29) a[j][i] = 0.6;
  }
  return a;
}
function randomPicture(seed) { seedRng(seed); let a = blankImg(); for (let r = 0; r < 6; r++) { let cx = rnd() * IW, cy = rnd() * IH, rr = 2 + 4 * rnd(); for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) if ((i - cx) ** 2 + (j - cy) ** 2 < rr * rr) a[j][i] = Math.round(rnd() * 4) / 4 || 1; } return a; }
// ★ 循環境界の畳み込み：はしを越えたら反対側から（(i + a) mod W）
function convCirc(x, k) {
  let h = x.length, w = x[0].length, y = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let s = 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += k[b + 1][a + 1] * x[(j + b + h) % h][(i + a + w) % w];
    y[j][i] = s;
  }
  return y;
}
function convZero(x, k) {                 // 0 で埋める境界（くらべる用）
  let h = x.length, w = x[0].length, y = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let s = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { let jj = j + b, ii = i + a; if (jj >= 0 && jj < h && ii >= 0 && ii < w) s += k[b + 1][a + 1] * x[jj][ii]; } y[j][i] = s; }
  return y;
}
function shiftCirc(x, dx, dy) { let h = x.length, w = x[0].length; return x.map((row, j) => row.map((_, i) => x[(((j - dy) % h) + h) % h][(((i - dx) % w) + w) % w])); }
function maxDiff(a, b) { let m = 0; for (let j = 0; j < a.length; j++) for (let i = 0; i < a[0].length; i++) m = Math.max(m, Math.abs(a[j][i] - b[j][i])); return m; }
function subsample2(x) { let out = []; for (let j = 0; j < x.length; j += 2) { let r = []; for (let i = 0; i < x[0].length; i += 2) r.push(x[j][i]); out.push(r); } return out; }
// 受容野：出力 (ci, cj) に効く入力の画素 = 衝撃（1 点だけ 1）を、全部 1 の 3 × 3 で layers 回広げた範囲
function receptiveField(layers, ci, cj) {
  let d = blankImg(), ones = [[1, 1, 1], [1, 1, 1], [1, 1, 1]]; d[cj][ci] = 1;
  for (let l = 0; l < layers; l++) d = convCirc(d, ones);
  return d;
}

function draw() {
  background(...BG);
  let k = FILTERS[fIdx][1], out = convCirc(img, k), xs = shiftCirc(img, shX, shY), outS = convCirc(xs, k), sOut = shiftCirc(out, shX, shY), diff = maxDiff(outS, sOut);
  let zd = maxDiff(convZero(xs, k), shiftCirc(convZero(img, k), shX, shY));
  hudTitle('畳み込みと等変性：' + FILTERS[fIdx][0] + '　ずらし (' + shX + ', ' + shY + ')　差の最大 |conv(ずらす x) − ずらす(conv x)| = ' + (diff === 0 ? '0 ✓' : fmtE(diff)),
    'ドラッグ 描く（Shift で消す）　1〜4 フィルタ　← → ↑↓ ずらす　L 受容野の層 ' + rfLayers + '　C 消す　D お手本　N ランダム　（境界は循環 = 輪っか）');
  let pw = Math.min((width - 140) / 3, ((height - 260) / 2) * (IW / IH)), ph = pw * (IH / IW), gx = [40, 40 + pw + 30, 40 + 2 * (pw + 30)], gy = [110, 110 + ph + 60];
  let mx = 0; for (let r of out) for (let v of r) mx = Math.max(mx, Math.abs(v));
  showImg('in', img, gx[0], gy[0], pw, ph, 1, '入力 x（ここに描く）');
  showImg('out', out, gx[1], gy[0], pw, ph, mx, '出力 conv(x)');
  showImg('xs', xs, gx[0], gy[1], pw, ph, 1, 'ずらした入力 ずらす(x)');
  showImg('outS', outS, gx[1], gy[1], pw, ph, mx, 'conv(ずらす(x))');
  showImg('sOut', sOut, gx[2], gy[1], pw, ph, mx, 'ずらす(conv(x))  ← 左と同じ');
  // 受容野（右上）：マウスがパネルの上なら、その出力の画素に効く入力の範囲
  let ci = 16, cj = 12, onOut = mouseX > gx[1] && mouseX < gx[1] + pw && mouseY > gy[0] && mouseY < gy[0] + ph;
  if (onOut) { ci = Math.floor(((mouseX - gx[1]) / pw) * IW); cj = Math.floor(((mouseY - gy[0]) / ph) * IH); }
  let rf = receptiveField(rfLayers, clampv(ci, 0, IW - 1), clampv(cj, 0, IH - 1)), cnt = 0, rmx = 0;
  for (let r of rf) for (let v of r) { if (v > 0) cnt++; rmx = Math.max(rmx, v); }
  showImg('rf', rf, gx[2], gy[0], pw, ph, rmx, '受容野：' + rfLayers + ' 層の 3 × 3 → ' + (2 * rfLayers + 1) + ' × ' + (2 * rfLayers + 1) + '（' + cnt + ' 画素、濃い = 道が多い）', true);
  noFill(); stroke(...AMBER); strokeWeight(2); rect(gx[1] + (ci / IW) * pw, gy[0] + (cj / IH) * ph, pw / IW, ph / IH);
  // 下の説明
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  let ty = gy[1] + ph + 40;
  text('重みの数：全結合 ' + (IW * IH) + ' × ' + (IW * IH) + ' = ' + (IW * IH * IW * IH).toLocaleString() + ' 個　｜　畳み込み 3 × 3 = 9 個（どこでも同じ 9 個を使う）', 40, ty);
  fill(...SUB); textSize(13);
  text('0 で埋める境界にすると、差の最大 = ' + fmtN(zd, 3) + '（はしの画素だけ。内側はぴったり同じ）。2 マスおきに間引くと、1 マスずらしでは等変でなくなる（2 マスなら OK）', 40, ty + 22);
  text('マウスを右上の「出力」パネルにのせると、その画素の受容野が右上に出る。フィルタ = 小さな「部品の検出器」、層を重ねると大きな形を見る', 40, ty + 42);
  drawSelfTest(width - 180, height - 14);
}
function showImg(id, a, x, y, w, h, scl, title, warm) {   // −scl〜scl を ライム〜マゼンタ（入力は 0〜1 を黒〜白）
  if (!panelBufs[id]) { panelBufs[id] = createImage(IW, IH); }
  let b = panelBufs[id]; b.loadPixels();
  for (let j = 0; j < IH; j++) for (let i = 0; i < IW; i++) {
    let v = a[j][i], c = id === 'in' || id === 'xs' ? [20 + 225 * v, 20 + 215 * v, 22 + 200 * v] : warm ? mixCol(PANEL, AMBER, v / Math.max(1e-9, scl)) : divCol(v / Math.max(1e-9, scl)), q = 4 * (j * IW + i);
    b.pixels[q] = c[0]; b.pixels[q + 1] = c[1]; b.pixels[q + 2] = c[2]; b.pixels[q + 3] = 255;
  }
  b.updatePixels();
  noSmooth(); image(b, x, y, w, h); smooth();
  noStroke(); fill(...INK); textSize(14); textAlign(LEFT, BASELINE); text(title, x, y - 8);
}

function paintAt() {
  let pw = Math.min((width - 140) / 3, ((height - 260) / 2) * (IW / IH)), ph = pw * (IH / IW);
  let i = Math.floor(((mouseX - 40) / pw) * IW), j = Math.floor(((mouseY - 110) / ph) * IH);
  if (i < 0 || i >= IW || j < 0 || j >= IH) return;
  let v = keyIsDown(SHIFT) ? 0 : 1;
  for (let b = 0; b <= 1; b++) for (let a = 0; a <= 1; a++) if (j + b < IH && i + a < IW) img[j + b][i + a] = v;
}
function mousePressed() { paintAt(); }
function mouseDragged() { paintAt(); }
function keyPressed() {
  if (key >= '1' && key <= '4') fIdx = +key - 1;
  if (key === RIGHT_ARROW) shX = (shX + 1) % IW;
  if (key === LEFT_ARROW) shX = (shX + IW - 1) % IW;
  if (key === DOWN_ARROW) shY = (shY + 1) % IH;
  if (key === UP_ARROW) shY = (shY + IH - 1) % IH;
  if (key === 'l' || key === 'L') rfLayers = rfLayers % 5 + 1;
  if (key === 'c' || key === 'C') img = blankImg();
  if (key === 'd' || key === 'D') img = defaultPicture();
  if (key === 'n' || key === 'N') img = randomPicture(++seedI);
  return false;
}

// ============================================
// やってみよう
// ・← → で入力をずらしても、下の 2 つのパネルがいつも同じになることを確かめる
// ・自分のフィルタを FILTERS に足す（例：斜めの縁 [[0, 1, 2], [-1, 0, 1], [-2, -1, 0]]）
// ・L で層を増やす。5 層だと受容野は何 × 何？ 真ん中ほど濃いのはなぜ？
// ・convCirc を convZero に変えると、ずらしたときの差は 0 のまま？ どこにずれが出る？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(1010); let ok = true;
  for (let t = 0; t < 6; t++) {
    let x = Array.from({ length: IH }, () => Array.from({ length: IW }, () => rnd())), k = [0, 1, 2].map(() => [0, 1, 2].map(() => randn())), dx = rndInt(-40, 40), dy = rndInt(-30, 30);
    if (maxDiff(convCirc(shiftCirc(x, dx, dy), k), shiftCirc(convCirc(x, k), dx, dy)) !== 0) ok = false;
  }
  check('循環境界：conv(ずらす(x)) = ずらす(conv(x)) が差 0 でぴったり（ランダムな画像・フィルタ・ずらし 6 組）', ok);
  let x = randomPicture(5), delta = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];
  check('真ん中だけ 1 のフィルタ → 出力 = 入力', maxDiff(convCirc(x, delta), x) === 0);
  let y = randomPicture(6), k = FILTERS[0][1], lin = maxDiff(convCirc(x.map((r, j) => r.map((v, i) => 2 * v - 3 * y[j][i])), k), convCirc(x, k).map((r, j) => r.map((v, i) => 2 * v - 3 * convCirc(y, k)[j][i])));
  check('線形：conv(2x − 3y) = 2 conv(x) − 3 conv(y)（ずれ ' + fmtE(lin) + '）', lin < 1e-12);
  let cz = convZero(x, FILTERS[3][1]), cc = convCirc(x, FILTERS[3][1]), inner = 0;
  for (let j = 1; j < IH - 1; j++) for (let i = 1; i < IW - 1; i++) inner = Math.max(inner, Math.abs(cz[j][i] - cc[j][i]));
  check('0 で埋める境界も、はしから 1 マス内側の画素は循環境界と同じ', inner === 0);
  let rfOk = true; for (let L = 1; L <= 5; L++) { let r = receptiveField(L, 15, 11), c = 0; for (let row of r) for (let v of row) if (v > 0) c++; if (c !== (2 * L + 1) ** 2) rfOk = false; }
  check('受容野：3 × 3 を L 層重ねると (2L + 1)² 画素（L = 1〜5）', rfOk);
  let base = subsample2(convCirc(x, k)), s1 = subsample2(convCirc(shiftCirc(x, 1, 0), k)), s2 = subsample2(convCirc(shiftCirc(x, 2, 0), k));
  check('2 マスおきに間引くと：1 マスずらしは等変でない、2 マスずらしは 1 マスずれるだけ', maxDiff(s1, shiftCirc(base, 1, 0)) > 0 && maxDiff(s1, base) > 0 && maxDiff(s2, shiftCirc(base, 1, 0)) === 0);
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
