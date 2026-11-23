// ============================================
// 15 カメラ映像とマックスプラス ─ 画像の「膨張」は max-plus のたたみこみ (f ⊕⊗ g)(x) = max_y ( f(y) + g(x − y) )
// ふつうのたたみこみ（ぼかし）の「Σ と ×」を「max と +」に替えただけ。g = 放物線 −c·|z|²（やわらかい構造要素）
//   1 膨張（max-plus）：明るい所がふくらむ / 2 収縮（min-plus）：暗い所がふくらむ（= −膨張(−f)）
//   3 距離変換：しきい値より明るいマスまでの距離² = min_y ( 0 or +∞ + |x − y|² )（min-plus のたたみこみ）
//   放物線は |z|² = z₁² + z₂² なので、横 → 縦の 1 次元 2 回に分けられる（同じ答えで速い）。シリーズ 19 のモルフォロジーとつながる
// 1 膨張 / 2 収縮 / 3 距離変換 / ↑↓ 大きさ s / ← → しきい値（3）/ V カメラ ⇔ テスト画像 / S 保存
// ============================================

const CW = 160, CH = 120;              // カメラとマス目の大きさ
const R_MAX = 14;                      // ★ 窓の半径（大きいほど遠くまで届くが重い）
let cap, testPix, outImg, srcImg, f, tmp, res, opMode = 1, sizeS = 4, thr = 150, useCam = true;   // ★ sizeS = 放物線の大きさ

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
  outImg = createImage(CW, CH); srcImg = createImage(CW, CH); testPix = makeTestImage();
  f = new Float64Array(CW * CH); tmp = new Float64Array(CW * CH); res = new Float64Array(CW * CH);
  selfTest();
}
// ★ 1 次元の max-plus（isMax）/ min-plus たたみこみ。w[d + R] = 構造要素 g(d)（max）または罰金（min）
function conv1d(src, dst, W, H, horiz, R, w, isMax) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = isMax ? NEG_INF : Infinity;
    for (let d = -R; d <= R; d++) {
      let xx = horiz ? x - d : x, yy = horiz ? y : y - d;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      let v = src[xx + W * yy];
      if (isMax) { if (v !== NEG_INF && v + w[d + R] > best) best = v + w[d + R]; }
      else if (v !== Infinity && v + w[d + R] < best) best = v + w[d + R];
    }
    dst[x + W * y] = best;
  }
}
function parab(R, c, sign) { return Array.from({ length: 2 * R + 1 }, (_, i) => sign * c * (i - R) * (i - R)); }
// ★ 2 次元 = 横 → 縦（放物線は分けられる）
function morph2d(src, dst, W, H, R, c, isMax, scratch) {
  let w = parab(R, c, isMax ? -1 : 1);
  conv1d(src, scratch, W, H, true, R, w, isMax); conv1d(scratch, dst, W, H, false, R, w, isMax);
}
function distanceSq(mask, dst, W, H, R, scratch) {           // mask 1 のマスまでの距離²（窓の外は +∞）
  let g = new Float64Array(W * H); for (let i = 0; i < g.length; i++) g[i] = mask[i] ? 0 : Infinity;
  morph2d(g, dst, W, H, R, 1, false, scratch);
}

function draw() {
  background(22, 22, 28);
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0, px = testPix;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) px = cap.pixels; }
  for (let i = 0; i < CW * CH; i++) f[i] = 0.3 * px[4 * i] + 0.59 * px[4 * i + 1] + 0.11 * px[4 * i + 2];
  let c = 30 / (sizeS * sizeS), R = Math.min(R_MAX, Math.ceil(sizeS * 3));
  if (opMode === 1) morph2d(f, res, CW, CH, R, c, true, tmp);
  else if (opMode === 2) morph2d(f, res, CW, CH, R, c, false, tmp);
  else { let m = new Uint8Array(CW * CH); for (let i = 0; i < m.length; i++) m[i] = f[i] > thr ? 1 : 0; distanceSq(m, res, CW, CH, R_MAX, tmp); }
  outImg.loadPixels(); srcImg.loadPixels();
  for (let i = 0; i < CW * CH; i++) {
    let v = res[i], r, g, b;
    if (opMode === 3) {
      if (v === Infinity) { r = 25; g = 25; b = 35; }
      else { let dd = Math.sqrt(v), band = Math.floor(dd / 3) % 2, u = dd / R_MAX; r = 255 - 180 * u; g = 170 - 60 * u + band * 30; b = 70 + 160 * u; }
    } else { let q = clampv(v, 0, 255); r = q; g = q * 0.85 + 20 * (opMode === 2); b = q * (opMode === 1 ? 0.6 : 1); }
    outImg.pixels[4 * i] = r; outImg.pixels[4 * i + 1] = g; outImg.pixels[4 * i + 2] = b; outImg.pixels[4 * i + 3] = 255;
    srcImg.pixels[4 * i] = srcImg.pixels[4 * i + 1] = srcImg.pixels[4 * i + 2] = f[i]; srcImg.pixels[4 * i + 3] = 255;
  }
  outImg.updatePixels(); srcImg.updatePixels();
  let big = Math.min((width - 420) / CW, (height - 170) / CH);
  noSmooth(); image(srcImg, 40, 110, 320, 240); image(outImg, 400, 110, CW * big, CH * big); smooth();
  // ---- 構造要素 g の形
  let gx = 40, gy = 400, gw = 320, gh = 120;
  noFill(); stroke(80); rect(gx, gy, gw, gh); stroke(255, 170, 70); strokeWeight(2); beginShape();
  for (let d = -R_MAX; d <= R_MAX; d++) { let v = opMode === 3 ? -d * d : Math.abs(d) <= R ? -c * d * d : -255; let u = clampv(-v / (opMode === 3 ? R_MAX * R_MAX : 255), 0, 1); vertex(gx + ((d + R_MAX) / (2 * R_MAX)) * gw, opMode === 1 ? gy + 10 + u * (gh - 20) : gy + gh - 10 - u * (gh - 20)); }
  endShape();
  noStroke(); fill(200); textSize(13); textAlign(LEFT, BASELINE);
  text(opMode === 3 ? '罰金 |z|²（min-plus）' : opMode === 2 ? '罰金 −g(z) = +' + c.toFixed(2) + '·z²（min-plus、窓の半径 ' + R + '）' : '構造要素 g(z) = −' + c.toFixed(2) + '·z²（窓の半径 ' + R + '）', gx, gy - 8);
  fill(240); textSize(20);
  text('カメラ映像とマックスプラス　' + ['', '1 膨張（max-plus）', '2 収縮（min-plus）', '3 距離変換（min-plus）'][opMode] + (live ? '' : '　（テスト画像）'), 40, 40);
  fill(170); textSize(15); text('1 膨張　2 収縮　3 距離変換　↑↓ 大きさ s = ' + sizeS + '　← → しきい値 ' + thr + '　V カメラ ⇔ テスト画像　S 保存', 40, 66);
  fill(200); textSize(14);
  text(opMode === 1 ? '(f ⊕⊗ g)(x) = max_y ( f(y) + g(x − y) )：明るい点が放物線の「山」になって広がる' : opMode === 2 ? '(f ⊖ g)(x) = min_y ( f(y) − g(x − y) ) = −((−f) ⊕⊗ g)：暗い所が広がる' : '距離² = min_y ( 0（明るい）または +∞ ） + |x − y|²：しま模様 = 3 px ごとの等距離線', 40, gy + gh + 30, 340);
  fill(150); text('左 = もとの明るさ。ふつうのたたみこみ（ぼかし）の Σ と × を、max と + に替えたもの', 40, gy + gh + 90, 340);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') opMode = +key;
  if (key === UP_ARROW) sizeS = Math.min(8, sizeS + 1);
  if (key === DOWN_ARROW) sizeS = Math.max(1, sizeS - 1);
  if (key === RIGHT_ARROW) thr = Math.min(250, thr + 10);
  if (key === LEFT_ARROW) thr = Math.max(10, thr - 10);
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('maxplus_camera', 'png');
  return false;
}
function makeTestImage() {             // カメラがないときのテスト画像（明るい円・線・点）
  let p = new Uint8ClampedArray(CW * CH * 4);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let v = 30 + 0.2 * x;
    if ((x - 45) ** 2 + (y - 60) ** 2 < 18 ** 2) v = 220;
    if (Math.abs(y - 0.5 * x - 10) < 1.5 && x > 80) v = 250;
    if ((x % 23 === 5 && y % 19 === 7)) v = 255;
    if (x > 110 && x < 140 && y > 75 && y < 100) v = 170;
    let i = 4 * (x + CW * y); p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255;
  }
  return p;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(15);
  let W = 20, H = 16, img = new Float64Array(W * H).map(() => rndInt(0, 255)), R = 4, c = 2.5, s1 = new Float64Array(W * H), out = new Float64Array(W * H);
  morph2d(img, out, W, H, R, c, true, s1);
  let okSep = true;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = NEG_INF;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { let xx = x - dx, yy = y - dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) best = Math.max(best, img[xx + W * yy] - c * (dx * dx + dy * dy)); }
    if (Math.abs(best - out[x + W * y]) > 1e-9) okSep = false;
  }
  check('横 → 縦の 2 回 = 2 次元の max-plus たたみこみ（窓の中を全部調べた答え）', okSep);
  let er = new Float64Array(W * H); morph2d(img, er, W, H, R, c, false, s1);
  check('膨張 ≥ もとの画像 ≥ 収縮（g(0) = 0 だから）', out.every((v, i) => v >= img[i]) && er.every((v, i) => v <= img[i]));
  let neg = img.map((v) => -v), dn = new Float64Array(W * H); morph2d(neg, dn, W, H, R, c, true, s1);
  check('双対性：収縮(f) = −膨張(−f)', er.every((v, i) => Math.abs(v + dn[i]) < 1e-9));
  let sh = img.map((v) => v + 7), ds = new Float64Array(W * H); morph2d(sh, ds, W, H, R, c, true, s1);
  check('明るさを +7 すると膨張も +7（max-plus で「線形」）', ds.every((v, i) => Math.abs(v - out[i] - 7) < 1e-9));
  let m = new Uint8Array(W * H).map(() => (rnd() < 0.05 ? 1 : 0)), dt = new Float64Array(W * H); m[37] = 1; distanceSq(m, dt, W, H, 25, s1);
  let okDT = true;
  for (let i = 0; i < W * H; i++) { let b = Infinity; for (let j = 0; j < W * H; j++) if (m[j]) b = Math.min(b, ((i % W) - (j % W)) ** 2 + (Math.floor(i / W) - Math.floor(j / W)) ** 2); if (b !== dt[i]) okDT = false; }
  check('距離変換 = いちばん近い明るいマスまでの距離²（総当たり）', okDT);
  let em = new Uint8Array(W * H), de = new Float64Array(W * H); distanceSq(em, de, W, H, 5, s1);
  check('明るいマスが 1 つもないと全部 +∞（NaN なし）', de.every((v) => v === Infinity) && noNaN(Array.from(out)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1（膨張）で ↑ を押して s を大きくすると、明るい点はどんな形に広がる？（放物線の山）
// 2. 2（収縮）にすると、細い明るい線はどうなる？ 1 → 2 の順にかけると「オープニング」（シリーズ 19）
// 3. 3（距離変換）で ← → のしきい値を変え、しま模様（等距離線）を見よう
// 4. g を放物線ではなく「円の中は 0、外は −∞」にすると、ふつうの（かたい）膨張になる
// 5. S で保存して、膨張と収縮をくり返した絵を作ろう

// ==================================================
// ここから下は「マックスプラスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- マックスプラスの数：ε = −∞（「ゼロ」= 起きない・制約なし）、e = 0（「いち」= 待ち時間なし）
const NEG_INF = -Infinity;
function mpAdd(a, b) { return a >= b ? a : b; }                                   // a ⊕ b = max(a, b)
function mpMul(a, b) { return a === NEG_INF || b === NEG_INF ? NEG_INF : a + b; }  // a ⊗ b = a + b（ε があれば ε。−∞ + ∞ を作らない）
function mpFmt(v, d) {                                                             // ε を「ε」と表示（−Infinity を見せない）
  if (v === NEG_INF) return 'ε';
  if (v === Infinity) return '+∞';
  if (typeof v !== 'number' || v !== v) return '?';
  let s = (+v.toFixed(d === undefined ? 1 : d)).toString();
  return s === '-0' ? '0' : s;
}
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
