// ============================================
// 01 スライダクランク機構（エンジンのピストン）
// クランクの回転 ⇄ ピストンの往復。位置 x(θ) = r cos θ + √(L² − r² sin² θ)
// 連接棒比 λ = r / L が大きいほど、動きは単振動からずれる（上死点側で加速度が大きい）
// ←→ = 連接棒の長さ L / ↑↓ = 回転数 / クランクピンをドラッグ = 手で回す / A = 近似式を重ねる / スペース = 止める
// ============================================

let crankR = 60;          // ★ クランク半径 r（mm として扱う。ストローク = 2r）
let rodL = 200;           // ★ 連接棒の長さ L（mm）
let rpm = 1200;           // ★ 回転数（1 分あたりの回転）
let th = 0.6;             // クランク角 θ（ラジアン）
let playing = true, showApprox = false, grabbing = false;
let cx = 0, cy = 0;       // クランク軸の位置

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cx = width * 0.2; cy = height * 0.3;
}

// ★ ピストンピンの位置（クランク軸からの距離）
function pistonPos(t) {
  let q = Math.sqrt(rodL * rodL - crankR * crankR * Math.sin(t) * Math.sin(t));
  return crankR * Math.cos(t) + q;
}
// dx/dθ（解析的）
function pistonD1(t) {
  let q = Math.sqrt(rodL * rodL - crankR * crankR * Math.sin(t) * Math.sin(t));
  return -crankR * Math.sin(t) - (crankR * crankR * Math.sin(t) * Math.cos(t)) / q;
}
// d²x/dθ²（数値微分）
function pistonD2(t) { return (pistonD1(t + 1e-4) - pistonD1(t - 1e-4)) / 2e-4; }

function draw() {
  background(212, 45, 13);
  let omega = (rpm * TWO_PI) / 60;                    // 角速度（rad/s）
  if (playing && !grabbing) th += 0.015 + rpm / 60000; // 画面上はスローモーション
  th = ((th % TWO_PI) + TWO_PI) % TWO_PI;

  let px = pistonPos(th);
  let pinX = cx + crankR * Math.cos(th), pinY = cy - crankR * Math.sin(th);
  let lam = crankR / rodL;

  // シリンダー
  let headX = cx + rodL + crankR + 70;
  noStroke(); fill(0, 0, 30);
  rect(cx + rodL - crankR - 30, cy - 48, headX - (cx + rodL - crankR - 30), 8);
  rect(cx + rodL - crankR - 30, cy + 40, headX - (cx + rodL - crankR - 30), 8);
  rect(headX, cy - 48, 8, 96);
  // 上死点・下死点の線
  stroke(0, 0, 50, 60); strokeWeight(1);
  for (let x of [cx + rodL + crankR, cx + rodL - crankR]) line(x, cy - 70, x, cy + 70);
  noStroke(); fill(0, 0, 60); textSize(13);
  text('上死点', cx + rodL + crankR - 18, cy - 78); text('下死点', cx + rodL - crankR - 18, cy - 78);
  // クランクの円
  noFill(); stroke(0, 0, 40); strokeWeight(1);
  circle(cx, cy, crankR * 2);
  // クランク、連接棒、ピストン
  strokeWeight(12); stroke(8, 75, 100); line(cx, cy, pinX, pinY);
  stroke(200, 60, 95); strokeWeight(9); line(pinX, pinY, cx + px, cy);
  noStroke(); fill(40, 20, 85); rect(cx + px - 18, cy - 40, 62, 80, 4);
  fill(0, 0, 100); circle(cx, cy, 18); circle(pinX, pinY, 16); circle(cx + px, cy, 14);
  fill(0, 0, 100); textSize(14);
  text('r = ' + crankR, cx - 20, cy + crankR + 26);
  text('L = ' + rodL + '（←→）', (pinX + cx + px) / 2 - 30, cy + 70);

  // 値
  let v = pistonD1(th) * omega / 1000;                  // m/s
  let acc = pistonD2(th) * omega * omega / 1000;        // m/s²
  noStroke(); fill(0, 0, 100); textSize(18);
  text('←→：連接棒 L　↑↓：回転数 ' + rpm + ' rpm　ピンをドラッグ：手で回す　A：近似式 ' + (showApprox ? 'ON' : 'off') + '　スペース：' + (playing ? '止める' : '動かす'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('連接棒比 λ = r / L = ' + nf(lam, 1, 3) + '。λ が大きい（棒が短い）ほど、上死点側と下死点側で動きが非対称になる', 20, 68);

  let ix = width - 400, iy = 120;
  fill(0, 0, 100, 8); rect(ix - 16, iy - 30, 390, 150, 10);
  fill(0, 0, 100); textSize(16);
  text('x = r cos θ + √(L² − r² sin² θ)', ix, iy);
  fill(35, 90, 100); text('θ = ' + nf(th * 180 / Math.PI, 1, 0) + '°　x = ' + nf(px, 1, 1) + ' mm', ix, iy + 30);
  fill(190, 70, 100); text('速度 v = ' + nf(v, 1, 2) + ' m/s', ix, iy + 56);
  fill(320, 60, 100); text('加速度 a = ' + nf(acc, 1, 0) + ' m/s²（' + nf(acc / 9.8, 1, 0) + ' G）', ix, iy + 82);
  fill(0, 0, 60); textSize(13);
  text('近似：a ≈ −rω²（cos θ + λ cos 2θ）', ix, iy + 106);

  // グラフ 3 段（位置・速度・加速度）
  let gx = 70, gw = width - 140, gy = height * 0.5, gh = (height - gy - 40) / 3;
  let rows = [
    { name: '位置 x', hue: 35, f: (t) => pistonPos(t) - rodL, peak: crankR * 1.05 },
    { name: '速度 v', hue: 190, f: (t) => pistonD1(t), peak: crankR * (1 + lam) * 1.05 },
    { name: '加速度 a', hue: 320, f: (t) => pistonD2(t), peak: crankR * (1 + lam) * 1.1, approx: (t) => -crankR * (Math.cos(t) + lam * Math.cos(2 * t)) },
  ];
  for (let i = 0; i < 3; i++) {
    let r = rows[i], y0 = gy + gh * i + gh / 2, amp = gh * 0.42;
    stroke(0, 0, 30); strokeWeight(1); line(gx, y0, gx + gw, y0);
    noFill(); stroke(r.hue, 70, 100); strokeWeight(2.5);
    beginShape();
    for (let k = 0; k <= 180; k++) { let t = (k / 180) * TWO_PI; vertex(gx + (k / 180) * gw, y0 - (r.f(t) / r.peak) * amp); }
    endShape();
    if (r.approx && showApprox) {
      stroke(0, 0, 100, 70); strokeWeight(1.5);
      beginShape();
      for (let k = 0; k <= 180; k++) { let t = (k / 180) * TWO_PI; vertex(gx + (k / 180) * gw, y0 - (r.approx(t) / r.peak) * amp); }
      endShape();
    }
    let mx = gx + (th / TWO_PI) * gw;
    noStroke(); fill(r.hue, 70, 100); circle(mx, y0 - (r.f(th) / r.peak) * amp, 12);
    fill(r.hue, 50, 100); textSize(14); text(r.name, gx - 56, y0 + 5);
  }
  stroke(0, 0, 100, 40); strokeWeight(1);
  line(gx + (th / TWO_PI) * gw, gy, gx + (th / TWO_PI) * gw, gy + gh * 3);
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let d = 0; d <= 360; d += 90) text(d + '°', gx + (d / 360) * gw - 8, gy + gh * 3 + 18);
}

function mousePressed() {
  let pinX = cx + crankR * Math.cos(th), pinY = cy - crankR * Math.sin(th);
  grabbing = Math.hypot(mouseX - pinX, mouseY - pinY) < 30;
}
function mouseDragged() { if (grabbing) th = Math.atan2(cy - mouseY, mouseX - cx); }
function mouseReleased() { grabbing = false; }

function keyPressed() {
  if (key === LEFT_ARROW) rodL = constrain(rodL - 10, crankR + 20, 400);
  if (key === RIGHT_ARROW) rodL = constrain(rodL + 10, crankR + 20, 400);
  if (key === UP_ARROW) rpm = constrain(rpm + 300, 300, 9000);
  if (key === DOWN_ARROW) rpm = constrain(rpm - 300, 300, 9000);
  if (key === 'a' || key === 'A') showApprox = !showApprox;
  if (key === ' ') playing = !playing;
}

// ---------- やってみよう ----------
// 1. L を 80 まで短くすると、加速度のグラフの下側（下死点）にくぼみが 2 つできる。λ がいくつを超えると現れる？
// 2. A で近似式 a ≈ −rω²(cos θ + λ cos 2θ) を重ねよう。cos 2θ の項が「2 次の慣性力」＝エンジンの振動のもと
// 3. 速度が最大になるクランク角は 90° より手前。連接棒とクランクが直角になるあたり、を図で確かめよう
// 4. 9000 rpm での加速度は何 G？ ピストンの質量を 0.3 kg として、連接棒にかかる力（F = ma）を計算しよう
// 5. crankR を 2 倍にすると（ストローク 2 倍）、同じ回転数で加速度は何倍？
