// ============================================
// 06 PID 制御とチューニング（ボール・アンド・ビーム）
// 板を傾けてボールを目標の位置に止める。P だけでは必ずゆれる → D（微分）でブレーキ、I で偏差を消す
//   u = Kp e + Ki ∫e dt − Kd x'　（微分は「ボールの速さ」にかける）
// Ziegler–Nichols 法：Ki = Kd = 0 で Kp を上げ、ゆれが止まらなくなる Kp = Ku と周期 Tu を測る
//   → Kp = 0.6 Ku, Ki = 1.2 Ku/Tu, Kd = 0.075 Ku Tu
// Q/A = Kp 上下 / W/S = Ki / E/D = Kd / Z = いまの Kp を Ku として Z-N で自動設定 / クリック = 目標
// ============================================

let Kp = 0.3, Ki = 0.0, Kd = 0.0; // ★ PID ゲイン
let tauServo = 0.3; // ★ 板を傾けるサーボの遅れ [秒]
let thMax = 0.4; // ★ 板の最大の傾き [rad]
let cBall = 1.0; // ボールの転がり摩擦
let g = 9.8;

let x = 0, v = 0, th = 0, r = 0.5, u = 0, I = 0, t = 0;
let fell = 0;
let HIST = 600, dt = 1 / 60;
let hX = [], hR = [], hE = [], hTh = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 30, 10);
  // ★ PID
  let e = r - x;
  I = constrain(I + e * dt, -3, 3);
  u = Kp * e + Ki * I - Kd * v;
  let thCmd = constrain(u, -thMax, thMax);
  for (let k = 0; k < 2; k++) {
    th += ((thCmd - th) / tauServo) * dt / 2; // サーボ：板はすぐには傾かない
    let a = (5 / 7) * g * sin(th) - cBall * v; // 転がるボール
    v += a * dt / 2;
    x += v * dt / 2;
  }
  if (abs(x) > 1.1) { x = 0; v = 0; I = 0; th = 0; fell++; } // 落ちたら中央にもどす
  t += dt;
  pushHist(hX, x); pushHist(hR, r); pushHist(hE, e); pushHist(hTh, th);

  // ---- 板とボール
  let px = width * 0.26, py = height * 0.5, L = width * 0.2;
  stroke(0, 0, 50); strokeWeight(6); line(px, py, px, py + 80); // 支柱
  noStroke(); fill(0, 0, 50); triangle(px - 30, py + 80, px + 30, py + 80, px, py + 60);
  push();
  translate(px, py); rotate(th);
  stroke(200, 40, 90); strokeWeight(8); line(-L, 0, L, 0);
  stroke(45, 90, 100); strokeWeight(2); line(r * L, -24, r * L, -4);
  noStroke(); fill(30, 80, 100); circle(x * L, -18, 30);
  pop();
  noStroke(); fill(0, 0, 100); textSize(14); textAlign(CENTER);
  text('板の角度 ' + nf(degrees(th), 1, 1) + '°', px, py + 110);
  fill(45, 90, 100); text('目標 r = ' + nf(r, 1, 2) + '（クリック）', px, py - 100);
  textAlign(LEFT, BASELINE);
  // サーボの絵
  stroke(0, 0, 60); strokeWeight(3); noFill(); rect(px + L + 20, py + 20, 40, 50, 6);
  line(px + L + 40, py + 45, px + L + 40 + 30 * cos(-thCmd * 3), py + 45 + 30 * sin(-thCmd * 3));

  // ---- グラフ
  let gx = width * 0.52, gw = width * 0.44;
  drawPlot(gx, height * 0.18, gw, height * 0.36, [{ data: hR, hue: 45, sat: 90, name: '目標 r' }, { data: hX, hue: 30, name: 'ボール x' }], -1.1, 1.1, 'ボールの位置');
  drawPlot(gx, height * 0.6, gw, height * 0.25, [{ data: hTh, hue: 200, name: '板の角度' }], -thMax * 1.2, thMax * 1.2, '制御入力（板の角度 [rad]）');

  // ---- ゆれの計測（ゼロ交差から周期、山の高さから増減）
  let osc = measureOscillation(hE);
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('Kp = ' + nf(Kp, 1, 2) + '（Q/A）　Ki = ' + nf(Ki, 1, 2) + '（W/S）　Kd = ' + nf(Kd, 1, 2) + '（E/D）　Z = Ziegler–Nichols　落下 ' + fell + ' 回', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('ゆれの周期 Tu ≈ ' + (osc.period > 0 ? nf(osc.period, 1, 2) + ' 秒' : '—') + '　振幅は ' + osc.trend + '　／　Z-N 法：Ki = Kd = 0 にして Kp を上げ、振幅が「一定」になったら Z を押す', 20, 68);
  text('P：誤差に比例　I：誤差をためて偏差を消す　D：速さにブレーキ（ゆれを抑える）。板はサーボで遅れて傾くので、Kp だけ上げるといずれ発散する', 20, height - 30);
}

// 誤差の履歴から、ゆれの周期と振幅の増減を推定
function measureOscillation(h) {
  let crossings = [], peaks = [];
  for (let i = 1; i < h.length; i++) {
    if ((h[i - 1] < 0 && h[i] >= 0) || (h[i - 1] > 0 && h[i] <= 0)) crossings.push(i);
    if (i > 1 && abs(h[i - 1]) > abs(h[i - 2]) && abs(h[i - 1]) >= abs(h[i]) && abs(h[i - 1]) > 0.01) peaks.push(abs(h[i - 1]));
  }
  let period = 0;
  if (crossings.length >= 3) period = (crossings[crossings.length - 1] - crossings[crossings.length - 3]) * dt; // ゼロ交差 2 回分 = 1 周期
  let trend = '—';
  if (peaks.length >= 3) {
    let a = peaks[peaks.length - 3], b = peaks[peaks.length - 1];
    trend = b > a * 1.1 ? '増大中（Kp が大きすぎ）' : b < a * 0.9 ? '減衰中' : '一定（ここが Ku・Tu）';
  }
  return { period, trend };
}

function mousePressed() {
  if (mouseX < width * 0.5) r = constrain(map(mouseX, width * 0.06, width * 0.46, -1, 1), -0.9, 0.9);
}
function keyPressed() {
  if (key === 'q' || key === 'Q') Kp = min(Kp + 0.05, 5);
  if (key === 'a' || key === 'A') Kp = max(Kp - 0.05, 0);
  if (key === 'w' || key === 'W') Ki = min(Ki + 0.05, 5);
  if (key === 's' || key === 'S') Ki = max(Ki - 0.05, 0);
  if (key === 'e' || key === 'E') Kd = min(Kd + 0.05, 5);
  if (key === 'd' || key === 'D') Kd = max(Kd - 0.05, 0);
  if (key === 'z' || key === 'Z') {
    let osc = measureOscillation(hE);
    let Ku = Kp, Tu = osc.period > 0 ? osc.period : 3.4;
    Kp = 0.6 * Ku; Ki = 1.2 * Ku / Tu; Kd = 0.075 * Ku * Tu; I = 0; // ★ Ziegler–Nichols の表
  }
  Kp = round(Kp * 100) / 100; Ki = round(Ki * 100) / 100; Kd = round(Kd * 100) / 100;
}

// ---------- やってみよう ----------
// 1. Ki = Kd = 0 で Kp を 0.3 → 0.5 → 0.7 と上げる。ゆれが「一定」になる Kp（Ku ≈ 0.6）を探して Z
// 2. Z-N の値から Kd を 2 倍にする／半分にする。どちらが落ち着く？
// 3. Kd を大きくしすぎると、サーボの遅れとぶつかってかえって細かくゆれる
// 4. 目標を遠くにクリックしたとき、Ki が大きいと行きすぎる（05 のワインドアップ）


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
function pushHist(arr, v) {
  arr.push(isFinite(v) ? v : 0);
  if (arr.length > HIST) arr.shift();
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x, y, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x, y, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let y0 = map(0, lo, hi, y + h, y);
  if (y0 > y && y0 < y + h) line(x, y0, x + w, y0);
  for (let s of series) {
    stroke(s.hue, s.sat === undefined ? 70 : s.sat, 100); strokeWeight(s.weight || 2); noFill();
    beginShape();
    for (let i = 0; i < s.data.length; i++) vertex(map(i, 0, HIST - 1, x, x + w), map(constrain(s.data[i], lo, hi), lo, hi, y + h, y));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x + 8, y + 6);
  let lx = x + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, s.sat === undefined ? 70 : s.sat, 100); text(s.name, lx, y + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
