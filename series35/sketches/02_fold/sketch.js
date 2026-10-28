// ============================================
// 02 折り目のカタストロフィー（fold）
// いちばん単純なカタストロフィー：V(x) = x³ + a·x
//   a < 0 のとき谷（x = +√(−a/3)）と山（x = −√(−a/3)）がある。a = 0 で 2 つが合体して消える（分岐集合は a = 0 の 1 点）
//   谷がなくなるとボールは坂を転がり落ち、a を戻しても帰ってこない。谷が浅くなるほど、揺らしたあと戻るのが遅くなる（臨界減速）
// マウス左右（または ←→）= a / P = ボールを押す / A = a をゆっくり 0 へ近づける / R = ボールを谷へ戻す
// ============================================

let a = -1.5;
let x = 0.7, v = 0;
let damping = 2.2;          // ★ 摩擦
let kick = 1.2;             // ★ P で押す強さ
let fallen = false;
let autoRamp = false;
let recover = [];           // 押してから戻るまでの時間 {a, frames}
let kickFrame = -1, kickA = 0;
let logX = [];

function V(xx) { return xx * xx * xx + a * xx; }
function dV(xx) { return 3 * xx * xx + a; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(20, 25, 12);
  if (autoRamp) a = min(0.4, a + 0.0015);
  // ボールの運動
  for (let k = 0; k < 4; k++) {
    let dt = 1 / 120;
    v += (-6 * dV(x) - damping * v) * dt;
    x += v * dt;
  }
  if (x < -2.5) { x = -2.5; v = 0; fallen = true; }
  x = min(x, 2.5);
  let xm = a < 0 ? sqrt(-a / 3) : NaN;          // 谷の位置
  // 押したあと、谷へ戻ったら時間を記録
  if (kickFrame >= 0 && isFinite(xm) && abs(x - xm) < 0.02 && abs(v) < 0.02) {
    recover.push({ a: kickA, f: frameCount - kickFrame }); kickFrame = -1;
    if (recover.length > 12) recover.shift();
  }
  logX.push(x); if (logX.length > 400) logX.shift();

  // ---- 左：地形
  let lx = 40, lw = width * 0.55, py = 110, ph = height - py - 40;
  let toX = (xx) => lx + (xx + 2.5) / 5 * lw;
  let toY = (vv) => py + ph * 0.5 - vv * ph * 0.08;
  noStroke(); fill(20, 20, 18); rect(lx, py, lw, ph, 8);
  fill(30, 50, 45);
  beginShape(); vertex(lx, py + ph);
  for (let i = 0; i <= 200; i++) { let xx = -2.5 + 5 * i / 200; vertex(toX(xx), constrain(toY(V(xx)), py, py + ph)); }
  vertex(lx + lw, py + ph); endShape(CLOSE);
  if (a < 0) {
    fill(150, 60, 100); circle(toX(xm), toY(V(xm)) + 14, 12);
    fill(0, 70, 100); circle(toX(-xm), toY(V(-xm)) - 14, 12);
  }
  fill(45, 90, 100); circle(toX(x), constrain(toY(V(x)) - 14, py + 14, py + ph - 14), 26);
  if (fallen) { fill(0, 80, 100); textSize(30); text('落ちた！ a を負にして R で戻す', lx + 30, py + 50); }

  // ---- 右上：平衡点の図（a = −3x²）
  let rx = lx + lw + 30, rw = width - rx - 40, rh = ph * 0.5 - 15;
  let toA = (aa) => rx + (aa + 3) / 3.6 * rw;
  let toXr = (xx) => py + rh / 2 - xx / 1.1 * (rh / 2 - 10);
  noStroke(); fill(20, 20, 18); rect(rx, py, rw, rh, 8);
  stroke(0, 0, 100, 20); strokeWeight(1); line(toA(0), py, toA(0), py + rh); line(rx, toXr(0), rx + rw, toXr(0));
  noFill(); strokeWeight(4);
  stroke(150, 60, 100); beginShape(); for (let xx = 0; xx <= 1; xx += 0.02) vertex(toA(-3 * xx * xx), toXr(xx)); endShape();
  stroke(0, 70, 100); strokeWeight(2); beginShape(); for (let xx = 0; xx >= -1; xx -= 0.02) vertex(toA(-3 * xx * xx), toXr(xx)); endShape();
  noStroke(); fill(45, 90, 100); circle(toA(0), toXr(0), 14);
  stroke(200, 70, 100); strokeWeight(2); line(toA(a), py, toA(a), py + rh);
  noStroke(); fill(45, 90, 100); if (abs(x) < 1.1) circle(toA(a), toXr(x), 12);
  fill(0, 0, 80); textSize(14);
  text('平衡点：緑 = 谷、赤 = 山。黄 = 分岐点 a = 0', rx + 12, py + 22);

  // ---- 右下：押してから戻るまでの時間
  let gy = py + rh + 30, gh = ph - rh - 30;
  noStroke(); fill(20, 20, 18); rect(rx, gy, rw, gh, 8);
  fill(0, 0, 80); textSize(14);
  text('P で押す → 谷に戻るまでのフレーム数（a が 0 に近いほど遅い）', rx + 12, gy + 22);
  for (let i = 0; i < recover.length; i++) {
    let r = recover[i];
    let bh = min(gh - 60, r.f * 0.6);
    fill(200, 60, 90); rect(rx + 16 + i * (rw - 32) / 12, gy + gh - 24 - bh, (rw - 32) / 12 - 6, bh);
    fill(0, 0, 80); textSize(11); text(nf(r.a, 1, 2), rx + 16 + i * (rw - 32) / 12, gy + gh - 8);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('a = ' + nf(a, 1, 3) + '（マウス左右 / ←→）　P：押す　A：ゆっくり 0 へ ' + (autoRamp ? 'ON' : 'off') + '　R：谷へ戻す　谷の曲がり V\'\' = ' + (a < 0 ? nf(6 * xm, 1, 2) : '谷なし'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('a が 0 に近づくと谷はどんどん浅く平らになり、a > 0 で消える。消える前に「戻りが遅くなる」ことで、急変の予兆がわかる（12 で再登場）', 20, 68);
}

function mouseMoved() {
  if (mouseY > 90) { a = constrain(map(mouseX, 0, width, -3, 0.6), -3, 0.6); autoRamp = false; }
}
function keyPressed() {
  if (key === LEFT_ARROW) a = max(-3, a - 0.05);
  if (key === RIGHT_ARROW) a = min(0.6, a + 0.05);
  if (key === 'p' || key === 'P') { v -= kick; kickFrame = frameCount; kickA = a; }
  if (key === 'a' || key === 'A') { autoRamp = !autoRamp; if (autoRamp) a = min(a, -1.5); }
  if (key === 'r' || key === 'R') { if (a >= 0) a = -1; x = sqrt(-a / 3); v = 0; fallen = false; kickFrame = -1; }
}

// ---------- やってみよう ----------
// 1. a = −2, −1, −0.5, −0.2 で P を押し、戻るまでの時間を比べよう。グラフはどんな形になる？
// 2. kick を大きくすると、谷があっても山を越えて落ちる。何 a で、どのくらい押すと落ちる？
// 3. 谷の深さ（山と谷の高さの差）を式で出してみよう：ΔV = 4(−a/3)^(3/2)
// 4. ボールに小さなランダムな揺れ（random(-0.05, 0.05)）を毎フレーム加えると、a が 0 に近いとき揺れはどうなる？
