// ============================================
// 15 カメラ映像のファジィ処理
// 画素ごとに「肌色」「明るい」「鮮やか」の所属度を計算し、4 つのファジィ規則で色を決める（ファジィな領域分け）
//   色 = Σ wᵢ · 色ᵢ ÷ Σ wᵢ（高木－菅野型の 0 次：後件が「色」という定数）。どこにも当てはまらない画素は背景色
// 1〜3 = 表示（塗り分け・ドット・所属度マップ） / ←→ = マップの所属度を選ぶ / T = かつ を min ↔ 積 / V = カメラ ↔ テスト画像 / S = 保存
// ============================================

const CW = 160, CH = 120;   // カメラの大きさ（小さくして計算を軽く）
let RULES = [               // ★ 規則：もし … ならば この色（RGB）
  { name: '肌色 かつ 明るい', col: [255, 190, 160] },
  { name: '暗い', col: [40, 30, 80] },
  { name: '鮮やか かつ 肌色でない', col: [40, 200, 190] },
  { name: '明るい かつ 鮮やかでない かつ 肌色でない', col: [200, 195, 230] },
];
const BG = [90, 85, 110];   // ★ どの規則も発火しないときの色
let skinHue = 20;           // ★ 肌色の色相 [度]
let view = 1, mapSel = 0, useProd = false, useCam = true;
let cap, test, out, mapImg, src = null;
const MAPS = ['肌色', '明るい', '鮮やか'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(CW, CH);
  cap.hide();
  out = createImage(CW, CH); mapImg = createImage(CW, CH);
  test = makeTestImage();
  selfTest();
}

function draw() {
  background(250, 18, 14);
  // 入力の画素（カメラが使えなければテスト画像）
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0;   // 映像が本当に届いているか
  src = test;
  if (live) { cap.loadPixels(); if (cap.width === CW && cap.pixels.length >= CW * CH * 4) src = cap.pixels; }
  // 全部の画素を処理（19200 画素）
  out.loadPixels(); mapImg.loadPixels();
  for (let i = 0; i < CW * CH; i++) {
    let o = 4 * i, f = fuzzyPixel(src[o], src[o + 1], src[o + 2]), c = f.col, mv = f.m[mapSel] * 255;
    out.pixels[o] = c[0]; out.pixels[o + 1] = c[1]; out.pixels[o + 2] = c[2]; out.pixels[o + 3] = 255;
    mapImg.pixels[o] = mv * 0.6; mapImg.pixels[o + 1] = mv * 0.95; mapImg.pixels[o + 2] = mv; mapImg.pixels[o + 3] = 255;
  }
  out.updatePixels(); mapImg.updatePixels();

  let sc = Math.min((width * 0.66) / CW, (height - 130) / CH), iw = CW * sc, ih = CH * sc, x0 = 20, y0 = 90;
  noStroke();
  if (view === 1) image(out, x0, y0, iw, ih);
  else if (view === 3) image(mapImg, x0, y0, iw, ih);
  else {
    fill(250, 18, 8); rect(x0, y0, iw, ih);
    colorMode(RGB, 255);
    for (let y = 1; y < CH; y += 2) for (let x = 1; x < CW; x += 2) {
      let o = 4 * (y * CW + x), m = fuzzyPixel(src[o], src[o + 1], src[o + 2]);
      fill(out.pixels[o], out.pixels[o + 1], out.pixels[o + 2]);
      circle(x0 + x * sc, y0 + y * sc, sc * (0.6 + 1.6 * Math.max(m.m[0], m.m[2])));
    }
    colorMode(HSB, 360, 100, 100, 100);
  }
  // 小さく元の画像
  let thumb = live ? cap : null;
  if (thumb) image(thumb, x0 + iw - CW - 8, y0 + 8, CW, CH); else { push(); let tg = createImageFromArr(); image(tg, x0 + iw - CW - 8, y0 + 8); pop(); }

  // マウスの画素の所属度と規則の強さ
  let px = Math.floor((mouseX - x0) / sc), py = Math.floor((mouseY - y0) / sc);
  if (px < 0 || px >= CW || py < 0 || py >= CH) { px = CW >> 1; py = CH >> 1; }
  let o = 4 * (py * CW + px), f = fuzzyPixel(src[o], src[o + 1], src[o + 2]);
  noFill(); stroke(0, 0, 100); rect(x0 + px * sc - 6, y0 + py * sc - 6, 12, 12);
  let hx = x0 + iw + 30, hy = 110, bw = width - hx - 40;
  noStroke(); fill(0, 0, 95); textSize(16);
  text('画素 (' + px + ', ' + py + ')　RGB = ' + src[o] + ', ' + src[o + 1] + ', ' + src[o + 2], hx, hy);
  fill(0, 0, 70); textSize(14); text('色相 ' + f.h.toFixed(0) + '°　彩度 ' + f.s.toFixed(2) + '　明度 ' + f.v.toFixed(2), hx, hy + 22);
  MAPS.forEach((n, i) => bar(hx, hy + 44 + i * 30, bw, n, f.m[i], color(175, 60, 80)));
  fill(0, 0, 95); textSize(16); text('規則の強さ w（かつ = ' + (useProd ? '積' : 'min') + '）', hx, hy + 150);
  let sumW = f.w.reduce((a, b) => a + b, 0);
  RULES.forEach((r, i) => { colorMode(RGB, 255); let c = color(r.col[0], r.col[1], r.col[2]); colorMode(HSB, 360, 100, 100, 100); bar(hx, hy + 168 + i * 30, bw, (i + 1) + ' ' + r.name, f.w[i], c); });
  colorMode(RGB, 255); fill(f.col[0], f.col[1], f.col[2]); colorMode(HSB, 360, 100, 100, 100); rect(hx, hy + 300, 60, 40, 6);
  fill(0, 0, 90); textSize(14);
  text('出力の色 = Σ w·色 ÷ Σ w（Σ w = ' + sumW.toFixed(3) + (sumW < 1e-6 ? '：どれも発火せず背景色' : '') + '）', hx + 72, hy + 316);
  text('= (' + f.col.map((v) => Math.round(v)).join(', ') + ')', hx + 72, hy + 336);

  fill(0, 0, 95); textSize(18);
  text((live ? 'カメラ' : 'テスト画像（V でカメラ）') + '　｜ 1 塗り分け　2 ドット　3 所属度マップ（←→ ' + MAPS[mapSel] + '）　T かつ = ' + (useProd ? '積' : 'min') + '　V 切りかえ　S 保存', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('肌色 = 色相が ' + skinHue + '° 付近（ガウス）かつ 彩度がほどほど（三角）、明るい = 明度のシグモイド、鮮やか = 彩度のシグモイド', 20, 62);
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}
function bar(x, y, w, name, v, c) {
  noStroke(); fill(0, 0, 100, 8); rect(x + 150, y - 14, w - 210, 18, 3); fill(c); rect(x + 150, y - 14, (w - 210) * v, 18, 3);
  fill(0, 0, 85); textSize(13); text(name.length > 11 ? name.slice(0, 11) + '…' : name, x, y); text(v.toFixed(3), x + w - 50, y);
}
let thumbImg = null;
function createImageFromArr() {
  if (thumbImg) return thumbImg;
  thumbImg = createImage(CW, CH); thumbImg.loadPixels();
  for (let i = 0; i < test.length; i++) thumbImg.pixels[i] = test[i];
  thumbImg.updatePixels(); return thumbImg;
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') view = +key;
  if (key === RIGHT_ARROW) mapSel = (mapSel + 1) % 3;
  if (key === LEFT_ARROW) mapSel = (mapSel + 2) % 3;
  if (key === 't' || key === 'T') useProd = !useProd;
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('fuzzy_camera', 'png');
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let c = blendRules([0.5, 0.5, 0, 0]);
  check('w = (0.5, 0.5, 0, 0) → 規則 1 と 2 の色の平均 (147.5, 110, 120)', near(c[0], 147.5) && near(c[1], 110) && near(c[2], 120));
  let c2 = blendRules([0.3, 0, 0, 0]);
  check('規則 1 つだけなら強さに関係なく その色（÷ Σw で正規化）', near(c2[0], 255) && near(c2[1], 190) && near(c2[2], 160));
  let c3 = blendRules([0, 0, 0, 0]);
  check('どの規則も発火しない（Σw = 0）→ 背景色、NaN にならない', c3[0] === BG[0] && c3[1] === BG[1] && c3[2] === BG[2]);
  let c4 = blendRules([0.2, 0, 0.6, 0]);
  check('w = (0.2, 0, 0.6, 0) → (0.2·255 + 0.6·40) ÷ 0.8 = 93.75', near(c4[0], 93.75) && near(c4[1], (0.2 * 190 + 0.6 * 200) / 0.8));
  let h = rgb2hsv(255, 0, 0), h2 = rgb2hsv(0, 0, 255);
  check('RGB → HSV：赤 = (0°, 1, 1)、青 = (240°, 1, 1)', near(h[0], 0) && near(h[1], 1) && near(h[2], 1) && near(h2[0], 240));
  check('色相の差は円で測る：350° と 20° の差は 30°', near(hueDiff(350, 20), 30) && near(hueDiff(20, 350), 30));
  let k = fuzzyPixel(0, 0, 0);
  check('真っ黒な画素：明るい ≈ 0 → 規則「暗い」がいちばん強い', k.m[1] < 0.01 && k.w[1] > 0.99 && k.w.every((w, i) => i === 1 || w <= k.w[1]));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 3 で所属度マップにして ←→。自分の顔や手は「肌色」でどれくらい白くなる？ skinHue を変えて合わせよう
// 2. RULES の色を自分の好きな配色に変える（夕焼け、海、ネオン…）
// 3. 規則を 1 つ足してみよう：「鮮やか かつ 暗い ならば 紫」（fuzzyPixel の w に 1 行足す）
// 4. T で 積 にすると境目がやわらかくなる？ 2 のドット表示で見比べよう
// 5. S で保存して、元の写真と並べてみよう


// ==================================================
// ここから下は「ファジィの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- メンバーシップ関数（所属度 μ を 0〜1 で返す）
function trimf(x, a, b, c) {            // 三角：a で 0、b で 1、c で 0
  if (x < a || x > c) return 0;
  if (x === b) return 1;
  if (x < b) return b > a ? (x - a) / (b - a) : 1;
  return c > b ? (c - x) / (c - b) : 1;
}
function trapmf(x, a, b, c, d) {         // 台形：b〜c が 1
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}
function gaussmf(x, c, s) { return Math.exp(-((x - c) * (x - c)) / (2 * s * s)); }
function sigmf(x, a, c) { return 1 / (1 + Math.exp(-a * (x - c))); }
function bellmf(x, a, b, c) { return 1 / (1 + Math.pow(Math.abs((x - c) / a), 2 * b)); }
// mf = { type: 'tri', p: [a, b, c] } のような形
function evalMF(mf, x) {
  let p = mf.p;
  if (mf.type === 'tri') return trimf(x, p[0], p[1], p[2]);
  if (mf.type === 'trap') return trapmf(x, p[0], p[1], p[2], p[3]);
  if (mf.type === 'gauss') return gaussmf(x, p[0], p[1]);
  if (mf.type === 'sig') return sigmf(x, p[0], p[1]);
  if (mf.type === 'bell') return bellmf(x, p[0], p[1], p[2]);
  return 0;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---- 演算：t ノルム（かつ）・s ノルム（または）・補集合（でない）
const T_NORMS = [
  { name: 'min', f: (a, b) => Math.min(a, b) },
  { name: '積', f: (a, b) => a * b },
  { name: 'ウカシェヴィチ', f: (a, b) => Math.max(0, a + b - 1) },
];
const S_NORMS = [
  { name: 'max', f: (a, b) => Math.max(a, b) },
  { name: '確率和', f: (a, b) => a + b - a * b },
  { name: '有界和', f: (a, b) => Math.min(1, a + b) },
];
function fnot(a) { return 1 - a; }

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

// ---- 画素のファジィ処理
function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  let mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
  if (d > 1e-9) { if (mx === r) h = 60 * (((g - b) / d) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); }
  if (h < 0) h += 360;
  return [h, mx > 0 ? d / mx : 0, mx];
}
function hueDiff(a, b) { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
// 所属度 m = [肌色, 明るい, 鮮やか] と 規則の強さ w、出力の色
function fuzzyPixel(r, g, b) {
  let [h, s, v] = rgb2hsv(r, g, b);
  let bright = sigmf(v, 12, 0.5), vivid = sigmf(s, 12, 0.5);
  let skin = gaussmf(hueDiff(h, skinHue), 0, 14) * trimf(s, 0.12, 0.4, 0.75) * sigmf(v, 15, 0.3);
  let and = useProd ? (a, c) => a * c : (a, c) => Math.min(a, c);
  let w = [and(skin, bright), fnot(bright), and(vivid, fnot(skin)), and(and(bright, fnot(vivid)), fnot(skin))];
  return { h, s, v, m: [skin, bright, vivid], w, col: blendRules(w) };
}
// 色 = Σ w·色 ÷ Σ w（Σ w が 0 なら背景色）
function blendRules(w) {
  let sw = 0, c = [0, 0, 0];
  for (let i = 0; i < RULES.length; i++) { sw += w[i]; for (let d = 0; d < 3; d++) c[d] += w[i] * RULES[i].col[d]; }
  return sw < 1e-9 ? BG.slice() : c.map((x) => x / sw);
}
// カメラが使えないときのテスト画像（RGBA の配列）：肌色の円・鮮やかなしま・明暗のグラデーション
function makeTestImage() {
  let a = new Uint8ClampedArray(CW * CH * 4);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let o = 4 * (y * CW + x), t = x / CW, c = [40 + 180 * t, 40 + 170 * t, 60 + 170 * t];
    if (y > 92) c = (Math.floor(x / 20) % 2) ? [230, 40, 60] : [30, 160, 230];
    let dx = x - 60, dy = y - 48;
    if (dx * dx + dy * dy < 900) c = [225, 165, 135 - (dx + dy) * 0.6];
    if ((x - 125) * (x - 125) + (y - 40) * (y - 40) < 300) c = [40, 220, 90];
    a[o] = c[0]; a[o + 1] = c[1]; a[o + 2] = c[2]; a[o + 3] = 255;
  }
  return a;
}
