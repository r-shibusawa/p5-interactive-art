// ============================================
// 15 カメラで回折（おまけ）
// 光（や電子）を穴（開口）に通して遠くのスクリーンで見ると、穴の形の 2 次元フーリエ変換の |·|² が映る（フラウンホーファー回折）
//   カメラの映像を白黒にして「穴」とみなし、2D FFT（128×128）で回折像を計算する。カメラがなければマウスで穴を描く
// V = カメラ ⇔ 手描き / 1〜5 = 穴の例（スリット・二重スリット・円・格子・正方形） / ドラッグ = 穴を描く（E = 消しゴム） / C = 全部ふさぐ
// ←→ = カメラのしきい値 / ↑↓ = 回折像の明るさ / I = 白黒反転 / L = 光の色（カメラの許可が必要）
// ============================================

const G = 128;              // ★ FFT の大きさ（2 のべき。128 で 60fps）
let cap, camMode = true;
let mask = new Float64Array(G * G);
let re = new Float64Array(G * G), im = new Float64Array(G * G);
let rowR = new Float64Array(G), rowI = new Float64Array(G);
let thr = 25;               // ★ しきい値：画面の平均の明るさ + thr より明るい所 = 穴
let gain = 3;               // ★ 回折像の明るさ（対数の強さ）
let invert = false, eraser = false;
let tints = [[255, 70, 60], [90, 255, 120], [90, 150, 255], [255, 255, 255]], tint = 0;
let imgA, imgF, dirty = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(G, (G * 3) / 4);
  cap.hide();
  imgA = createGraphics(G, G); imgA.pixelDensity(1);
  imgF = createGraphics(G, G); imgF.pixelDensity(1);
  preset(2);
  camMode = true;           // カメラが動きだすまでは手描きの穴を表示
}

function camReady() { return cap && cap.width > 0 && cap.pixels && cap.elt && cap.elt.readyState >= 2; }

// 穴の例を描く（1 = 開いている、0 = ふさがっている）
function preset(k) {
  mask.fill(0);
  let c = G / 2;
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    let dx = x - c, dy = y - c, v = 0;
    if (k === 1) v = abs(dx) < 2 && abs(dy) < 30;
    if (k === 2) v = abs(abs(dx) - 8) < 2 && abs(dy) < 30;
    if (k === 3) v = dx * dx + dy * dy < 64;
    if (k === 4) v = abs(dy) < 30 && abs(dx) < 24 && ((dx + 64) % 8) < 2;
    if (k === 5) v = abs(dx) < 6 && abs(dy) < 6;
    mask[y * G + x] = v ? 1 : 0;
  }
  camMode = false; dirty = true;
}

// カメラの画像 → 穴（明るい所 = 1）
function maskFromCam() {
  cap.loadPixels();
  let ch = (G * 3) / 4, off = (G - ch) / 2;
  let cw = cap.width;
  if (!cap.pixels || cw < G || cap.pixels.length < cw * ch * 4) return false;
  // 平均の明るさを求めて、それより thr だけ明るい所を「穴」にする（部屋の明るさが変わっても使える）
  let mean = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < G; x++) { let i = (y * cw + x) * 4; mean += (cap.pixels[i] + cap.pixels[i + 1] + cap.pixels[i + 2]) / 3; }
  mean /= G * ch;
  mask.fill(0);
  for (let y = 0; y < ch; y++) for (let x = 0; x < G; x++) {
    let i = (y * cw + x) * 4, b = (cap.pixels[i] + cap.pixels[i + 1] + cap.pixels[i + 2]) / 3;
    let on = b > mean + thr;
    mask[(y + off) * G + x] = on !== invert ? 1 : 0;
  }
  return true;
}

// ★ 2 次元 FFT = 横の各行を FFT → 縦の各列を FFT
function fft2() {
  re.set(mask); im.fill(0);
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) { rowR[x] = re[y * G + x]; rowI[x] = im[y * G + x]; }
    fft(rowR, rowI, false);
    for (let x = 0; x < G; x++) { re[y * G + x] = rowR[x]; im[y * G + x] = rowI[x]; }
  }
  for (let x = 0; x < G; x++) {
    for (let y = 0; y < G; y++) { rowR[y] = re[y * G + x]; rowI[y] = im[y * G + x]; }
    fft(rowR, rowI, false);
    for (let y = 0; y < G; y++) { re[y * G + x] = rowR[y]; im[y * G + x] = rowI[y]; }
  }
}

function render() {
  fft2();
  let imax = 1e-12, tc = tints[tint];
  for (let k = 0; k < G * G; k++) imax = max(imax, re[k] * re[k] + im[k] * im[k]);
  imgA.loadPixels(); imgF.loadPixels();
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    let k = y * G + x, a = mask[k] * 255;
    imgA.pixels[k * 4] = a; imgA.pixels[k * 4 + 1] = a; imgA.pixels[k * 4 + 2] = a; imgA.pixels[k * 4 + 3] = 255;
    // 真ん中が周波数 0 になるよう半分ずらす（fftshift）
    let sx = (x + G / 2) % G, sy = (y + G / 2) % G, s = sy * G + sx;
    let I = (re[s] * re[s] + im[s] * im[s]) / imax;
    let b = constrain(Math.log(1 + I * Math.pow(10, gain)) / Math.log(1 + Math.pow(10, gain)), 0, 1);   // 対数で暗い縞も見えるように
    imgF.pixels[k * 4] = tc[0] * b; imgF.pixels[k * 4 + 1] = tc[1] * b; imgF.pixels[k * 4 + 2] = tc[2] * b; imgF.pixels[k * 4 + 3] = 255;
  }
  imgA.updatePixels(); imgF.updatePixels();
}

function draw() {
  background(220, 25, 6);
  let S = min((width - 120) / 2, height - 190), ax = 40, ay = 120, fx = ax + S + 40;
  let usingCam = camMode && camReady();
  if (usingCam) { if (maskFromCam()) dirty = true; }
  // マウスで穴を描く
  if (mouseIsPressed && !usingCam && mouseX > ax && mouseX < ax + S && mouseY > ay && mouseY < ay + S) {
    let cx = floor(((mouseX - ax) / S) * G), cy = floor(((mouseY - ay) / S) * G);
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++)
      if (x >= 0 && y >= 0 && x < G && y < G && sq(x - cx) + sq(y - cy) <= 5) mask[y * G + x] = eraser ? 0 : 1;
    dirty = true;
  }
  if (dirty) { render(); dirty = false; }

  image(imgA, ax, ay, S, S);
  image(imgF, fx, ay, S, S);
  noFill(); stroke(0, 0, 40); rect(ax, ay, S, S); rect(fx, ay, S, S);
  noStroke(); fill(0, 0, 100); textSize(16);
  text('穴（開口）' + (usingCam ? '：カメラの明るい所' : camMode ? '：カメラを待っています（手描き）' : '：手描き'), ax, ay - 12);
  text('回折像 = |2D FFT|²（対数表示、真ん中 = まっすぐ進んだ光）', fx, ay - 12);

  fill(0, 0, 100); textSize(18);
  text('V：' + (camMode ? 'カメラ' : '手描き') + '　1〜5：穴の例　ドラッグ：描く（E：' + (eraser ? '消しゴム' : 'ペン') + '）　C：ふさぐ　←→ しきい値 平均+' + thr + '　↑↓ 明るさ ' + gain + '　I：反転　L：色', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('細い穴ほど回折像は広がる（不確定性 Δx·Δp と同じ）。二重スリットは縞、円は同心円（エアリー円盤）、格子は点の列。向きは 90° 回る', 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '5') preset(int(key));
  if (key === 'v' || key === 'V') { camMode = !camMode; dirty = true; }
  if (key === 'e' || key === 'E') eraser = !eraser;
  if (key === 'c' || key === 'C') { mask.fill(0); camMode = false; dirty = true; }
  if (key === RIGHT_ARROW) thr = min(200, thr + 5);
  if (key === LEFT_ARROW) thr = max(-100, thr - 5);
  if (key === UP_ARROW) { gain = min(8, gain + 1); dirty = true; }
  if (key === DOWN_ARROW) { gain = max(0, gain - 1); dirty = true; }
  if (key === 'i' || key === 'I') { invert = !invert; dirty = true; }
  if (key === 'l' || key === 'L') { tint = (tint + 1) % tints.length; dirty = true; }
}

// ---------- やってみよう ----------
// 1. 1（スリット）を手描きで太くしたり細くしたりして、回折像の横の広がりがどう変わるか観察しよう
// 2. 2 の二重スリットの間隔を広げると縞が細かくなる（00 の λL/d と同じ）
// 3. カメラの前で指を 2 本立てる・手を丸くする。どんな回折像になる？（暗い部屋なら I で反転）
// 4. 4 の格子の間隔（% 8）を変えると点の間隔はどうなる？ これが結晶の X 線回折で原子の並びを調べる仕組み


// ==================================================
// ここから下は「道具」（複素数の FFT：高速フーリエ変換）
// ==================================================
// re, im：長さ n（2 のべき）の配列をその場で変換する。inv = true で逆変換（1/n で割る）
function fft(re, im, inv) {
  let n = re.length;
  for (let i = 1, j = 0; i < n; i++) {           // ビット反転の並べ替え
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let tr = re[i]; re[i] = re[j]; re[j] = tr; let ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {       // バタフライ演算
    let ang = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        let a = i + k, b = a + len / 2;
        let xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        let tc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = tc;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
