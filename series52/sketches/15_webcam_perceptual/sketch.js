// ============================================
// 15 知覚の尺度でカメラ映像 ─ 明るさを「物理的」「フェヒナー的」「スティーヴンス的」に段階化
// 画素の光の量 Y（0〜1）を K 段に分ける（ポスタリゼーション）。分け方は 3 通り：
//   1 物理的に等間隔（Y で等分）　2 フェヒナー（log Y で等分）　3 スティーヴンス（Y^(1/3) で等分 ≒ L*）
// どの分け方だと、となりの段の境目が「同じくらいの差」に見える？ 下の帯と映像で比べる
// 4 = JND より小さい差を誇張（まわりとの差が JND（k·Y）より小さい所だけ G 倍に広げる）
// 1〜4 = 表示 / ↑↓ = 段の数 K / ←→ = 誇張の倍率 G / V = カメラ ⇔ テスト画像 / S = 保存
// ============================================

const CW = 160, CH = 120;              // カメラの大きさ（小さくして計算を軽く）
const Y_MIN = 0.005;                   // ★ いちばん暗い光の量（log の下限）
const JND_K = 0.03;                    // ★ 明るさの JND の比（ウェーバー比）
let K = 6, gainG = 8, view = 1, useCam = true;   // ★ 段の数・誇張の倍率
let cap, test, out;
const NAMES = { 1: '物理的に等間隔（Y）', 2: 'フェヒナー（log Y）', 3: 'スティーヴンス（Y^1/3）', 4: 'JND より小さい差を誇張' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
  out = createImage(CW, CH);
  test = makeTestImage();
  selfTest();
}

// 尺度：光の量 Y → 0〜1 の「感じの目盛り」と、その逆
function toScale(Y, v) {
  Y = clampv(Y, Y_MIN, 1);
  if (v === 2) return Math.log(Y / Y_MIN) / Math.log(1 / Y_MIN);
  if (v === 3) return (Math.cbrt(Y) - Math.cbrt(Y_MIN)) / (1 - Math.cbrt(Y_MIN));
  return (Y - Y_MIN) / (1 - Y_MIN);
}
function fromScale(s, v) {
  s = clampv(s, 0, 1);
  if (v === 2) return Y_MIN * Math.pow(1 / Y_MIN, s);
  if (v === 3) return Math.pow(Math.cbrt(Y_MIN) + s * (1 - Math.cbrt(Y_MIN)), 3);
  return Y_MIN + s * (1 - Y_MIN);
}
function levelOf(Y, v, k) { return Math.min(k - 1, Math.floor(toScale(Y, v) * k)); }   // 0〜k−1 段目
function levelY(i, v, k) { return fromScale((i + 0.5) / k, v); }                     // 段の代表の光の量（目盛りでまん中）
function boundaries(v, k) { let b = []; for (let i = 1; i < k; i++) b.push(fromScale(i / k, v)); return b; }
// JND より小さい差を誇張：まわり 3 × 3 の平均 m との差 d が k·m より小さければ m + G·d
function exaggerate(Y, m, k, G) { let d = Y - m; return Math.abs(d) < k * m ? clampv(m + G * d, 0, 1) : Y; }

function draw() {
  background(30, 32, 40);
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0, src = test;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) src = cap.pixels; }
  // 画素ごとに光の量 Y（sRGB を線形にもどして重みづけ）
  let Ys = new Float32Array(CW * CH);
  for (let i = 0; i < CW * CH; i++) Ys[i] = 0.2126 * LUT[src[4 * i]] + 0.7152 * LUT[src[4 * i + 1]] + 0.0722 * LUT[src[4 * i + 2]];
  out.loadPixels();
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let i = y * CW + x, Y = Ys[i], o;
    if (view === 4) {
      let m = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { let xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < CW && yy < CH) { m += Ys[yy * CW + xx]; n++; } }
      o = exaggerate(Y, m / n, JND_K, gainG);
    } else o = levelY(levelOf(Y, view, K), view, K);
    let v = linToSrgb(o), p = 4 * i; out.pixels[p] = out.pixels[p + 1] = out.pixels[p + 2] = v; out.pixels[p + 3] = 255;
  }
  out.updatePixels();
  let sc = Math.min((width * 0.62) / CW, (height - 250) / CH), iw = CW * sc, ih = CH * sc, x0 = 20, y0 = 84;
  noSmooth(); image(out, x0, y0, iw, ih); smooth();
  // 小さく元の映像
  let thumbW = CW, thumbH = CH;
  if (live) image(cap, x0 + iw - thumbW - 8, y0 + 8, thumbW, thumbH);

  // ---- 3 つの尺度の段の帯
  let bx = x0 + iw + 30, bw = width - bx - 30, by = 100;
  fill(235); noStroke(); textSize(15); text('段の数 K = ' + K + '（下の帯：となりの段の差がそろって見えるのは？）', bx, by - 12);
  for (let v = 1; v <= 3; v++) {
    let yy = by + (v - 1) * 86;
    fill(view === v ? color(255, 210, 120) : 200); textSize(14); text(v + ' ' + NAMES[v], bx, yy + 16);
    for (let i = 0; i < K; i++) { fill(linToSrgb(levelY(i, v, K))); rect(bx + (i * bw) / K, yy + 24, bw / K + 1, 40); }
  }
  // 境目の位置（光の量 Y の軸）
  let ay = by + 280; stroke(110); line(bx, ay, bx + bw, ay); noStroke(); fill(150); textSize(11); text('0', bx, ay + 14); text('Y = 1', bx + bw - 30, ay + 14);
  for (let v = 1; v <= 3; v++) { fill([color(120, 190, 255), color(220, 130, 255), color(255, 170, 90)][v - 1]); for (let b of boundaries(v, K)) rect(bx + b * bw - 1, ay - 8 - v * 10, 2, 9); }
  fill(170); textSize(12); text('境目の光の量（青 = 物理、紫 = フェヒナー、橙 = スティーヴンス）', bx, ay + 32);

  fill(235); textSize(18);
  text((live ? 'カメラ' : 'テスト画像（V でカメラ）') + '　｜ 1〜3 尺度　4 誇張（G = ' + gainG + '）　↑↓ 段の数　←→ 倍率　V 切りかえ　S 保存', 20, 36);
  fill(170); textSize(15);
  text('いま：' + NAMES[view] + (view === 4 ? '　まわりとの差が ' + (JND_K * 100).toFixed(0) + '% より小さい所だけ ' + gainG + ' 倍' : '　物理的に等分すると暗い所が 1 段につぶれる'), 20, 62);
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key >= '1' && key <= '4') view = +key;
  if (key === UP_ARROW) K = Math.min(16, K + 1);
  if (key === DOWN_ARROW) K = Math.max(2, K - 1);
  if (key === RIGHT_ARROW) gainG = Math.min(30, gainG + 1);
  if (key === LEFT_ARROW) gainG = Math.max(1, gainG - 1);
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('perceptual_camera', 'png');
  return false;
}

// テスト画像：左から右へなめらかな明るさ、下半分に 2% だけ明るい小さな四角（JND くらいの差）
function makeTestImage() {
  let a = new Uint8ClampedArray(CW * CH * 4);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let Y = Y_MIN + (1 - Y_MIN) * Math.pow(x / (CW - 1), 2.2);
    if (y > CH / 2 && (Math.floor(x / 20) + Math.floor(y / 20)) % 2 === 0) Y *= 1.02;
    if (Math.hypot(x - CW * 0.3, y - CH * 0.3) < 18) Y = 0.03;
    let v = linToSrgb(Y), o = 4 * (y * CW + x); a[o] = a[o + 1] = a[o + 2] = v; a[o + 3] = 255;
  }
  return a;
}
const LUT = Array.from({ length: 256 }, (_, i) => srgbToLin(i));   // 0〜255 → 光の量（毎回計算しないための表）

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let b1 = boundaries(1, 4), b2 = boundaries(2, 4), b3 = boundaries(3, 4);
  check('物理的：境目は Y で等間隔（差がどこも同じ）', near(b1[1] - b1[0], b1[2] - b1[1], 1e-12) && near(b1[0], Y_MIN + (1 - Y_MIN) / 4, 1e-12));
  check('フェヒナー：境目は等比（比がどこも同じ = 対数で等間隔）', near(b2[1] / b2[0], b2[2] / b2[1], 1e-9) && near(b2[0], Y_MIN * Math.pow(1 / Y_MIN, 0.25), 1e-12));
  check('スティーヴンス：境目の Y^(1/3) が等間隔', near(Math.cbrt(b3[1]) - Math.cbrt(b3[0]), Math.cbrt(b3[2]) - Math.cbrt(b3[1]), 1e-12));
  check('いちばん暗い所は 0 段目、Y = 1 は K − 1 段目（はみ出さない）', [1, 2, 3].every((v) => levelOf(0, v, 6) === 0 && levelOf(1, v, 6) === 5));
  check('toScale と fromScale はたがいに逆（3 つとも）', [1, 2, 3].every((v) => near(toScale(fromScale(0.37, v), v), 0.37, 1e-12)));
  check('sRGB 128 → Y = 0.216 → 128 にもどる', near(LUT[128], 0.21586, 1e-5) && near(linToSrgb(LUT[128]), 128, 1e-9));
  check('誇張：JND より小さい差（1%）は G 倍、大きい差（10%）はそのまま', near(exaggerate(0.505, 0.5, 0.03, 8), 0.54, 1e-12) && near(exaggerate(0.55, 0.5, 0.03, 8), 0.55, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1〜3 を切りかえて、自分の顔の影の部分がいちばん自然に段になるのはどれか比べよう
// 2. ↑↓ で K を 3 や 12 に。物理的に等分すると、暗い所は何段に分かれる？
// 3. 4 の誇張で、テスト画像の下半分の「2% だけ明るい四角」は見えるようになった？
// 4. JND_K を 0.01 や 0.1 にすると、誇張される所はどう変わる？
// 5. S で保存して、ポスター風の作品にしよう。段ごとに好きな色をつけてもよい


// ==================================================
// ここから下は「心理物理の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーション観察者と自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 画面の値 sRGB（0〜255）⇔ 光の量（0〜1、線形）。画面の値 128 は光の量では約 0.22
function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linToSrgb(v) { v = clampv(v, 0, 1); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
