// ============================================
// 15 カメラで星の軌跡 ─ 映像の明るい点を「星」にして、日周運動の長時間露光を作る
// カメラの画素のうち明るさがしきい値より上の点を星とみなし、北極星（天の北極）のまわりに少しずつ回しながら重ねる
// 空は 1 恒星日（23 時間 56 分）で 360° 回る → 1 時間に 15.04°。回した角度から「何時間ぶんの露光か」を計算
// 回転：x' = cx + (x − cx) cos θ − (y − cy) sin θ、y' = cy + (x − cx) sin θ + (y − cy) cos θ（中心からの距離は変わらない）
// クリック = 天の北極の位置 / ↑↓ = 回す速さ / ←→ = しきい値 / C = 消す / V = カメラ ⇔ テスト画像 / S = 保存
// ============================================

const CW = 160, CH = 120;              // カメラの大きさ（小さくして計算を軽く）
const TW = 400, TH = 250;              // 軌跡の画像の大きさ
const SIDEREAL_H = 23.9345;            // 1 恒星日 [時間]
let degPerFrame = 0.25, thresh = 0.6, useCam = true;   // ★ 1 フレームで回す角度 [度] と、星とみなす明るさ（0〜1）
let cap, test, trailR, trailG2, trailB, out, theta = 0, pole = [0.5, 0.18];      // 天の北極の位置（画面の割合）

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(CW, CH); cap.hide();
  trailR = new Float32Array(TW * TH); trailG2 = new Float32Array(TW * TH); trailB = new Float32Array(TW * TH);
  out = createImage(TW, TH);
  test = makeTestImage();
  selfTest();
}
function rotatePt(x, y, cx, cy, th) { let c = Math.cos(th), s = Math.sin(th); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; }
function lum(r, g, b) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
function hoursOf(deg) { return (deg / 360) * SIDEREAL_H; }
function clearTrails() { trailR.fill(0); trailG2.fill(0); trailB.fill(0); theta = 0; }

function draw() {
  background(0);
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0, src = test;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= CW * CH * 4) src = cap.pixels; else live = false; }
  // 明るい画素を回して、軌跡の画像に「明るいほうを残す」で重ねる
  let px = pole[0] * TW, py = pole[1] * TH, th = theta * DEG, n = 0;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let o = 4 * (y * CW + x), L = lum(src[o], src[o + 1], src[o + 2]);
    if (L < thresh) continue;
    n++;
    let p = rotatePt(((x + 0.5) / CW) * TW, ((y + 0.5) / CH) * TH, px, py, th), ix = Math.floor(p[0]), iy = Math.floor(p[1]);
    if (ix < 0 || iy < 0 || ix >= TW || iy >= TH) continue;
    let k = iy * TW + ix, w = (L - thresh) / Math.max(1e-6, 1 - thresh) * 0.7 + 0.3;
    trailR[k] = Math.max(trailR[k], (src[o] / 255) * w); trailG2[k] = Math.max(trailG2[k], (src[o + 1] / 255) * w); trailB[k] = Math.max(trailB[k], (src[o + 2] / 255) * w);
  }
  theta += degPerFrame;
  out.loadPixels();
  for (let k = 0; k < TW * TH; k++) { out.pixels[4 * k] = 255 * trailR[k]; out.pixels[4 * k + 1] = 255 * trailG2[k]; out.pixels[4 * k + 2] = 255 * Math.min(1, trailB[k] + 0.05); out.pixels[4 * k + 3] = 255; }
  out.updatePixels();
  let sc = Math.min(width / TW, (height - 90) / TH), iw = TW * sc, ih = TH * sc, x0 = (width - iw) / 2, y0 = 74;
  image(out, x0, y0, iw, ih);
  noFill(); stroke(255, 120, 110, 160); circle(x0 + px * sc, y0 + py * sc, 14); line(x0 + px * sc - 10, y0 + py * sc, x0 + px * sc + 10, y0 + py * sc);
  if (live) image(cap, x0 + iw - CW - 8, y0 + 8, CW, CH);
  noStroke(); fill(240, 236, 215); textSize(18);
  text((live ? 'カメラ' : 'テスト画像（V でカメラ）') + '　｜ クリック 天の北極　↑↓ 回す速さ　←→ しきい値　C 消す　V 切りかえ　S 保存', 20, 30);
  fill(250, 225, 140); textSize(15);
  text('回した角度 ' + theta.toFixed(1) + '° = ' + hoursOf(theta).toFixed(2) + ' 時間の露光（1 時間 = ' + (360 / SIDEREAL_H).toFixed(2) + '°）　1 フレーム ' + degPerFrame.toFixed(2) + '°　しきい値 ' + thresh.toFixed(2) + '　星とみなした画素 ' + n, 20, 56);
  drawSelfTest(20, height - 10);
}

// テスト画像：暗い空に、明るさと色のちがう星（種つきの乱数で毎回同じ）
function makeTestImage() {
  let a = new Uint8ClampedArray(CW * CH * 4); seedRng(2024);
  for (let i = 0; i < CW * CH; i++) { a[4 * i] = 5; a[4 * i + 1] = 8; a[4 * i + 2] = 20; a[4 * i + 3] = 255; }
  let cols = [[255, 200, 150], [255, 255, 240], [190, 210, 255], [255, 170, 120]];
  for (let s = 0; s < 120; s++) {
    let x = Math.floor(rnd() * CW), y = Math.floor(rnd() * CH), b = 0.5 + 0.5 * rnd(), c = cols[Math.floor(rnd() * 4)], big = rnd() < 0.15;
    for (let dy = 0; dy <= (big ? 1 : 0); dy++) for (let dx = 0; dx <= (big ? 1 : 0); dx++) {
      let xx = Math.min(CW - 1, x + dx), yy = Math.min(CH - 1, y + dy), o = 4 * (yy * CW + xx);
      a[o] = c[0] * b; a[o + 1] = c[1] * b; a[o + 2] = c[2] * b;
    }
  }
  return a;
}

function mousePressed() {
  let sc = Math.min(width / TW, (height - 90) / TH), iw = TW * sc, ih = TH * sc, x0 = (width - iw) / 2, y0 = 74;
  if (mouseX >= x0 && mouseX <= x0 + iw && mouseY >= y0 && mouseY <= y0 + ih) { pole = [(mouseX - x0) / iw, (mouseY - y0) / ih]; clearTrails(); }
}
function keyPressed() {
  if (key === UP_ARROW) degPerFrame = Math.min(2, degPerFrame + 0.05);
  if (key === DOWN_ARROW) degPerFrame = Math.max(0.05, degPerFrame - 0.05);
  if (key === RIGHT_ARROW) thresh = Math.min(0.95, thresh + 0.05);
  if (key === LEFT_ARROW) thresh = Math.max(0.1, thresh - 0.05);
  if (key === 'c' || key === 'C') clearTrails();
  if (key === 'v' || key === 'V') { useCam = !useCam; clearTrails(); }
  if (key === 's' || key === 'S') saveCanvas('star_trails', 'png');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let p = rotatePt(130, 40, 100, 20, 1.234);
  check('回しても中心（天の北極）からの距離は変わらない', near(Math.hypot(p[0] - 100, p[1] - 20), Math.hypot(30, 20), 1e-9));
  let q = rotatePt(130, 40, 100, 20, 2 * Math.PI);
  check('360° 回すと元の位置にもどる', near(q[0], 130, 1e-9) && near(q[1], 40, 1e-9));
  check('空の回る速さ = 360° ÷ 23.934 時間 = 15.04°/時', near(360 / SIDEREAL_H, 15.041, 0.001));
  check('4 時間の露光 → 弧の角度は約 60.2°', near((4 / SIDEREAL_H) * 360, 60.16, 0.01) && near(hoursOf(60.164), 4, 0.001));
  check('白は明るさ 1、黒は 0（しきい値で星を選ぶ）', near(lum(255, 255, 255), 1, 1e-12) && lum(0, 0, 0) === 0);
  let n = 0; for (let i = 0; i < CW * CH; i++) if (lum(test[4 * i], test[4 * i + 1], test[4 * i + 2]) >= 0.6) n++;
  check('テスト画像には星（明るい点）がある（0.6 以上が 20 画素以上）', n >= 20);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 部屋を暗くして、スマホのライトや豆電球をカメラに映そう。光が星の軌跡になる
// 2. 天の北極をクリックで画面の真ん中にすると、軌跡は全部まん丸になる
// 3. 回す速さを変えると点線のような軌跡になる。なめらかにするには？
// 4. 1 時間 15° を使って、3 時間ぶん（45°）回したところで止まるようにしてみよう
// 5. S で保存して、本物の星の軌跡の写真と比べよう


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
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
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
