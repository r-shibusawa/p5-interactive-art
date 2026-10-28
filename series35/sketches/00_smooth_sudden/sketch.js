// ============================================
// 00 なめらかな変化と突然の変化
// 谷が 2 つある地形 V(x) = x⁴ − 2x² + b·x の上をボールが転がる。b（傾き）をゆっくり変えると、
//   ボールのいる谷がだんだん浅くなり、ある瞬間に「消える」→ ボールはとなりの谷へ一気に落ちる
// 原因（b）はなめらかなのに、結果（x）は突然とぶ。これがカタストロフィー
// マウス左右（または ←→）= b / A = 自動で往復 / スペース = 一時停止 / R = 最初から
// ============================================

let b = -2.2;              // 地形の傾き（コントロール）
let x = 1.2, v = 0;        // ボールの位置と速度（状態）
let damping = 2.5;         // ★ 摩擦（大きいほどすぐ止まる）
let gravity = 6;           // ★ 転がる力の強さ
let auto = true;
let paused = false;
let useMouse = false;
let logX = [], logB = [];  // 時間グラフ用
let jumps = [];            // とんだ瞬間 {t, from, to}
let t = 0;
let flash = 0;
let lastSide = -1;

function V(xx, bb) { return xx * xx * xx * xx - 2 * xx * xx + bb * xx; }
function dV(xx, bb) { return 4 * xx * xx * xx - 4 * xx + bb; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(250, 30, 12);
  if (!paused) {
    t += 1;
    if (auto && !useMouse) b = 2.4 * sin(t * 0.006 - HALF_PI);
    // ★ ボールの運動：坂を下る力 − 摩擦（小さな刻みで何回か計算）
    for (let k = 0; k < 6; k++) {
      let dt = 1 / 360;
      v += (-gravity * dV(x, b) - damping * v) * dt * 6;
      x += v * dt * 6;
      x = constrain(x, -2.2, 2.2);
      if (abs(x) >= 2.2) v = 0;
    }
    let side = x < 0 ? -1 : 1;
    if (side !== lastSide && abs(v) > 0.5) { jumps.push({ t, b }); flash = 30; if (jumps.length > 20) jumps.shift(); lastSide = side; }
    else if (abs(v) < 0.05) lastSide = side;
    logX.push(x); logB.push(b);
    if (logX.length > 900) { logX.shift(); logB.shift(); }
  }

  // ---- 地形の絵（上半分）
  let px = 80, pw = width - 160, py = 110, ph = height * 0.5;
  let toX = (xx) => px + (xx + 2.2) / 4.4 * pw;
  let toY = (vv) => py + ph - (vv + 3) / 10 * ph;
  noStroke(); fill(250, 25, 18); rect(px, py, pw, ph, 8);
  // 地形（塗りつぶし）
  fill(140, 45, 45);
  beginShape();
  vertex(px, py + ph);
  for (let i = 0; i <= 200; i++) { let xx = -2.2 + 4.4 * i / 200; vertex(toX(xx), constrain(toY(V(xx, b)), py, py + ph)); }
  vertex(px + pw, py + ph);
  endShape(CLOSE);
  // 谷（極小）と山（極大）の印：V'(x) = 0 の点
  for (let e of equilibria(b)) {
    let stable = 12 * e * e - 4 > 0;
    let yy = toY(V(e, b));
    if (yy < py || yy > py + ph) continue;
    if (stable) { fill(140, 30, 90); triangle(toX(e), yy + 6, toX(e) - 8, yy + 20, toX(e) + 8, yy + 20); }
    else { fill(0, 70, 90); triangle(toX(e), yy - 6, toX(e) - 8, yy - 20, toX(e) + 8, yy - 20); }
  }
  // ボール
  let bx = toX(x), by = toY(V(x, b)) - 14;
  if (flash > 0) { fill(45, 90, 100, flash * 2); circle(bx, by, 40 + flash * 3); flash--; }
  fill(45, 90, 100); circle(bx, constrain(by, py, py + ph), 28);
  // 傾きのメーター
  let mx = px + pw / 2 + b / 3 * pw / 2;
  stroke(0, 0, 100, 40); strokeWeight(2); line(px + pw / 2, py + ph + 18, px + pw / 2, py + ph + 34);
  stroke(200, 70, 100); strokeWeight(6); line(px + pw / 2, py + ph + 26, mx, py + ph + 26);
  noStroke(); fill(200, 70, 100); circle(mx, py + ph + 26, 14);
  // 谷が消える境目 b = ±1.54
  let bc = 1.5396;
  fill(0, 70, 90);
  for (let s of [-1, 1]) rect(px + pw / 2 + s * bc / 3 * pw / 2 - 1, py + ph + 14, 3, 24);

  // ---- 時間のグラフ（下）
  let gy = py + ph + 60, gh = height - gy - 30;
  noStroke(); fill(250, 25, 18); rect(px, gy, pw, gh, 8);
  stroke(0, 0, 100, 20); strokeWeight(1); line(px, gy + gh / 2, px + pw, gy + gh / 2);
  noFill();
  stroke(200, 70, 100, 70); strokeWeight(2);
  beginShape(); for (let i = 0; i < logB.length; i++) vertex(px + i / 900 * pw, gy + gh / 2 - logB[i] / 3 * gh / 2.2); endShape();
  stroke(45, 90, 100); strokeWeight(3);
  beginShape(); for (let i = 0; i < logX.length; i++) vertex(px + i / 900 * pw, gy + gh / 2 - logX[i] / 2 * gh / 2.2); endShape();
  noStroke(); fill(200, 70, 100); textSize(14); text('青 = b（原因：なめらか）', px + 10, gy + 20);
  fill(45, 90, 100); text('黄 = x（結果：とぶ）', px + 200, gy + 20);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('b = ' + nf(b, 1, 2) + '（マウス左右 / ←→）　A：自動 ' + (auto ? 'ON' : 'off') + '　スペース：' + (paused ? '再開' : '一時停止') + '　R：最初から　とんだ回数 ' + jumps.length, 20, 40);
  fill(0, 0, 60); textSize(15);
  text('▲ = 谷（安定）、▼ = 山（不安定）。赤い線（b = ±1.54）を越えると、いまの谷と山がぶつかって消え、ボールはとなりの谷へ落ちる', 20, 68);
}

// V'(x) = 0 の解（谷と山）を細かく調べて探す
function equilibria(bb) {
  let out = [];
  let prev = dV(-2.2, bb);
  for (let i = 1; i <= 400; i++) {
    let xx = -2.2 + 4.4 * i / 400, cur = dV(xx, bb);
    if (prev * cur <= 0) out.push(xx - 4.4 / 400 * cur / (cur - prev + 1e-12));
    prev = cur;
  }
  return out;
}

function mouseMoved() {
  if (mouseY > 90) { useMouse = true; b = constrain(map(mouseX, 80, width - 80, -3, 3), -3, 3); }
}
function keyPressed() {
  if (key === LEFT_ARROW) { useMouse = true; b = max(-3, b - 0.1); }
  if (key === RIGHT_ARROW) { useMouse = true; b = min(3, b + 0.1); }
  if (key === 'a' || key === 'A') { auto = !auto; useMouse = false; }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { x = 1.2; v = 0; b = -2.2; t = 0; logX = []; logB = []; jumps = []; useMouse = false; }
}

// ---------- やってみよう ----------
// 1. b を −3 から +3 までゆっくり動かし、ボールがとぶ b の値を記録しよう。戻るときは同じ値でとぶ？（04 ヒステリシス）
// 2. damping を 0.3 にすると、とんだ後にボールが行ったり来たりする。10 にすると？
// 3. V の「−2x²」を「−1x²」にすると谷が浅くなる。とぶ b の値はどう変わる？
// 4. 地形を x⁴ − 2x² + b·x + 0.5·sin(5x) にして、谷をたくさんつくってみよう
