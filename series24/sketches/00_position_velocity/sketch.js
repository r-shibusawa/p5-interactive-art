// ============================================
// 00 位置・速度・加速度
// ボールの位置 x(t) を記録して、速度 v = dx/dt（グラフの傾き）、加速度 a = dv/dt（v の傾き）を計算する
//   左のレールのボールをドラッグして動かしてみよう。右のグラフの黄色い線が「いまの傾き」
// ドラッグ = ボールを動かす / 1 = 自分で動かす / 2 = 単振動 / 3 = 坂道と壁 / スペース = 一時停止
// ============================================

let mode = 1;              // 1: ドラッグ, 2: 単振動, 3: 坂道（一定の加速度）
let x = 0, v = 0, a = 0;   // 位置 [m]、速度 [m/s]、加速度 [m/s²]
let xPrev = 0, vPrev = 0, vSim = 0;
let smoothV = 0.35;        // ★ 速度のなめらかさ（0〜1、小さいほどノイズが減るが遅れる）
let smoothA = 0.2;         // ★ 加速度のなめらかさ
let amp = 0.8, omega = 2.5; // ★ 単振動の振幅 [m] と角振動数 [rad/s]
let slope = 3.0;           // ★ 坂道モードの加速度 [m/s²]
let t = 0, paused = false, dragging = false;
let HIST = 600, dt = 1 / 60;
let hX = [], hV = [], hA = [], hVt = [], hAt = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function railX(xm) { return map(xm, -1, 1, width * 0.06, width * 0.44); }

function draw() {
  background(225, 30, 11);
  if (!paused) {
    t += dt;
    let vTrue = NaN, aTrue = NaN;
    if (mode === 1) {
      // マウスで動かす：位置だけを決め、速度と加速度は差分で求める
      if (dragging) {
        let target = constrain(map(mouseX, width * 0.06, width * 0.44, -1, 1), -1, 1);
        x += (target - x) * 0.6;
      }
    } else if (mode === 2) {
      x = amp * sin(omega * t);                  // 位置の式
      vTrue = amp * omega * cos(omega * t);      // 微分すると速度
      aTrue = -amp * omega * omega * sin(omega * t); // もう一度微分すると加速度
    } else {
      // 坂道：左へ一定の加速度、左の壁で跳ね返る
      vSim -= slope * dt;
      x += vSim * dt;
      if (x < -1) { x = -1; vSim = abs(vSim) * 0.95; }
      if (x > 1) { x = 1; vSim = -abs(vSim); }
      vTrue = vSim; aTrue = -slope;
    }
    // ★ 微分 = 「少しの時間でどれだけ変わったか」
    let vRaw = (x - xPrev) / dt;
    v += (vRaw - v) * smoothV;
    let aRaw = (v - vPrev) / dt;
    a += (aRaw - a) * smoothA;
    v = constrain(v, -50, 50); a = constrain(a, -500, 500);
    xPrev = x; vPrev = v;
    pushHist(hX, x); pushHist(hV, v); pushHist(hA, a);
    pushHist(hVt, vTrue); pushHist(hAt, aTrue);
  }

  // ---- レールとボール
  let ry = height * 0.5;
  stroke(0, 0, 40); strokeWeight(4); line(railX(-1), ry + 26, railX(1), ry + 26);
  noStroke(); fill(0, 0, 60); textSize(13); textAlign(CENTER);
  for (let m = -1; m <= 1.001; m += 0.5) { rect(railX(m) - 1, ry + 26, 2, 10); text(nf(m, 1, 1) + ' m', railX(m), ry + 52); }
  if (mode === 3) { fill(0, 0, 30); rect(railX(-1) - 14, ry - 40, 10, 70); }
  let bx = railX(x);
  fill(30, 80, 100); circle(bx, ry, 44);
  // 速度（緑）と加速度（赤）の矢印
  arrow(bx, ry - 40, bx + v * 40, ry - 40, color(130, 80, 100), 'v');
  arrow(bx, ry + 80, bx + a * 4, ry + 80, color(0, 80, 100), 'a');
  textAlign(LEFT, BASELINE);

  // ---- グラフ 3 段（右）
  let gx = width * 0.5, gw = width * 0.46, gh = height * 0.22;
  drawPlot(gx, height * 0.12, gw, gh, [{ data: hX, hue: 30, name: '位置 x [m]' }], -1.2, 1.2, 'x(t)');
  drawPlot(gx, height * 0.38, gw, gh, [{ data: hVt, hue: 0, sat: 0, name: '式の値' }, { data: hV, hue: 130, name: '速度 v = dx/dt' }], -5, 5, 'v(t)');
  drawPlot(gx, height * 0.64, gw, gh, [{ data: hAt, hue: 0, sat: 0, name: '式の値' }, { data: hA, hue: 0, name: '加速度 a = dv/dt' }], -40, 40, 'a(t)');
  // ★ x(t) の右端に「接線」を引く：傾き = いまの速度
  tangent(gx, height * 0.12, gw, gh, x, v, -1.2, 1.2);
  tangent(gx, height * 0.38, gw, gh, v, a, -5, 5);

  noStroke(); fill(0, 0, 100); textSize(18);
  let names = ['', 'ドラッグで自由に動かす', '単振動 x = A sin ωt', '坂道：一定の加速度 a = −' + slope + ' m/s²'];
  text('モード ' + mode + '：' + names[mode] + '（1〜3）　スペース：' + (paused ? '再開' : '一時停止'), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('x = ' + nf(x, 1, 2) + ' m　v = ' + nf(v, 1, 2) + ' m/s　a = ' + nf(a, 1, 1) + ' m/s²　　黄色の線 = グラフの「傾き」。x の傾きが v、v の傾きが a', 20, 68);
  text('速く動かすと v が大きく、急に向きを変えると a が大きくなる。等速で動かすと a ≈ 0 になるか試そう', 20, height - 30);
}

function mousePressed() { if (mouseX < width * 0.48) { dragging = true; if (mode !== 1) mode = 1; } }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') {
    mode = int(key); t = 0;
    if (mode === 3) { x = 0.9; xPrev = 0.9; vSim = 0; }
  }
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. モード 1 で「等速」で動かしてみる。v のグラフが平らになり a ≈ 0 になる？ 人の手は意外と加速している
// 2. モード 2 で x, v, a の山の位置を比べる。v は x より 1/4 周期早い、a は x と逆向き（a = −ω²x）
// 3. smoothV を 1 にする（なめらかにしない）。差分はノイズを大きくする → 2 回微分の a はもっとガタガタ
// 4. モード 3 の v(t) は直線、x(t) は放物線。坂道の slope を変えて傾きの変化を見る


// ==================================================
// ここから下は「グラフと矢印を描く道具」です
// ==================================================
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : NaN);
  if (arr.length > HIST) arr.shift();
}
function arrow(x1, y1, x2, y2, c, name) {
  stroke(c); strokeWeight(3); line(x1, y1, x2, y2);
  let ang = atan2(y2 - y1, x2 - x1);
  if (abs(x2 - x1) + abs(y2 - y1) > 6) {
    noStroke(); fill(c);
    triangle(x2, y2, x2 - 10 * cos(ang - 0.4), y2 - 10 * sin(ang - 0.4), x2 - 10 * cos(ang + 0.4), y2 - 10 * sin(ang + 0.4));
  }
  noStroke(); fill(c); textSize(14); text(name, x1 - 14, y1 + 5);
}
// グラフの右端に、傾き slopeVal の接線を描く（横軸は 1 目盛り = 1 フレーム）
function tangent(x0, y0, w, h, val, slopeVal, lo, hi) {
  if (!isFinite(val) || !isFinite(slopeVal)) return;
  let pxPerSec = w / (HIST * dt), pxPerUnit = h / (hi - lo);
  let px = x0 + w, py = map(constrain(val, lo, hi), lo, hi, y0 + h, y0);
  let dx = pxPerSec * 1.0, dy = -slopeVal * pxPerUnit * 1.0;
  stroke(55, 90, 100); strokeWeight(2);
  line(px - dx, py - dy, px, py);
  noStroke(); fill(55, 90, 100); circle(px, py, 8);
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x0, y0, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x0, y0, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let yz = map(0, lo, hi, y0 + h, y0);
  if (yz > y0 && yz < y0 + h) line(x0, yz, x0 + w, yz);
  for (let s of series) {
    stroke(s.hue, s.sat === undefined ? 70 : s.sat, s.sat === 0 ? 55 : 100); strokeWeight(2); noFill();
    beginShape();
    for (let i = 0, off = HIST - s.data.length; i < s.data.length; i++) {
      if (!isFinite(s.data[i])) { endShape(); beginShape(); continue; }
      vertex(map(i + off, 0, HIST - 1, x0, x0 + w), map(constrain(s.data[i], lo, hi), lo, hi, y0 + h, y0));
    }
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x0 + 8, y0 + 6);
  let lx = x0 + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, s.sat === undefined ? 70 : s.sat, s.sat === 0 ? 70 : 100); text(s.name, lx, y0 + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
