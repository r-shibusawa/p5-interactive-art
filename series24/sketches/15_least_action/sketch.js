// ============================================
// 15 ラグランジュ形式と最小作用
// 時刻 0 に高さ y₀、時刻 T に高さ y₁ ── 両端を決めたとき、本物の運動はどの道を通る？
//   作用 S = ∫ (T − V) dt（運動エネルギー − 位置エネルギー）を計算すると、本物の道で S が「停留」する（ずらしても 1 次では変わらない）
// ドラッグ = 道の制御点を動かす / 1 = 重力（投げ上げ）/ 2 = ばね / ←→ = 時間 T / R = 本物の道に戻す / スペース = 玉を動かす
// ============================================

let mode = 1;              // 1: 重力 V = mgy、2: ばね V = ½ky²
let g = 9.8, m = 1;        // ★ 重力加速度、質量
let w0 = 2.0;              // ★ ばねの角振動数 ω [rad/s]
let T = 2.0;               // ★ かかる時間 [s]
let y0, y1;                // 両端の高さ
let ctrl = { t: 1, dy: 0 };  // 制御点：時刻 t で本物の道から dy ずらす
let dragging = false;
let NS = 400;              // ★ 作用の積分の分割数
let anim = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setMode(1);
}
function setMode(n) {
  mode = n;
  if (n === 1) { y0 = 0; y1 = 0; T = 2.0; } else { y0 = 1.0; y1 = 0.5; T = 1.2; }
  ctrl = { t: T * 0.4, dy: 1.0 };
}

// ★ 本物の道（オイラー＝ラグランジュ方程式 m y'' = −dV/dy の解で、両端を通るもの）
function truePath(t) {
  if (mode === 1) return y0 + (y1 - y0) * t / T + 0.5 * g * t * (T - t);
  let s = sin(w0 * T);
  if (abs(s) < 1e-6) return y0 * cos(w0 * t);             // 半周期ちょうどは解が決まらない
  return y0 * cos(w0 * t) + (y1 - y0 * cos(w0 * T)) / s * sin(w0 * t);
}
// ずらし方の形：制御点で 1、両端で 0、なめらか
function bump(t, tc) {
  if (t <= tc) return pow(sin(HALF_PI * t / tc), 2);
  return pow(sin(HALF_PI * (T - t) / (T - tc)), 2);
}
function pathY(t, eps) { return truePath(t) + eps * ctrl.dy * bump(t, ctrl.t); }
function V(yy) { return mode === 1 ? m * g * yy : 0.5 * m * w0 * w0 * yy * yy; }

// ★ 作用 S = Σ (½ m v² − V(y)) Δt
function action(eps) {
  let S = 0, h = T / NS;
  for (let i = 0; i < NS; i++) {
    let ta = i * h, tb = ta + h, ya = pathY(ta, eps), yb = pathY(tb, eps);
    let v = (yb - ya) / h;
    S += (0.5 * m * v * v - V((ya + yb) / 2)) * h;
  }
  return S;
}

function draw() {
  background(280, 25, 10);
  // ---- 左：時刻 t と高さ y のグラフ上の道
  let px = width * 0.05, py = height * 0.14, pw = width * 0.44, ph = height * 0.62;
  let ylo = mode === 1 ? -3 : -2, yhi = mode === 1 ? 8 : 2.5;
  let X = (t) => map(t, 0, T, px + 30, px + pw - 30), Y = (yy) => map(constrain(yy, ylo - 0.5, yhi + 0.5), ylo, yhi, py + ph - 20, py + 20);
  noStroke(); fill(0, 0, 13); rect(px, py, pw, ph, 6);
  stroke(0, 0, 30); line(px, Y(0), px + pw, Y(0));
  // いろいろなずらし方（薄い線）
  for (let e = -1; e <= 1.001; e += 0.25) {
    stroke(0, 0, 50, 30); strokeWeight(1); noFill();
    beginShape(); for (let i = 0; i <= 80; i++) { let t = T * i / 80; vertex(X(t), Y(pathY(t, e))); } endShape();
  }
  // 本物の道（黄色）とずらした道（ピンク）
  stroke(55, 90, 100); strokeWeight(3); noFill();
  beginShape(); for (let i = 0; i <= 120; i++) { let t = T * i / 120; vertex(X(t), Y(truePath(t))); } endShape();
  stroke(330, 70, 100); strokeWeight(3);
  beginShape(); for (let i = 0; i <= 120; i++) { let t = T * i / 120; vertex(X(t), Y(pathY(t, 1))); } endShape();
  noStroke(); fill(0, 0, 100); circle(X(0), Y(y0), 12); circle(X(T), Y(y1), 12);
  fill(330, 70, 100); circle(X(ctrl.t), Y(pathY(ctrl.t, 1)), 18);
  fill(0, 0, 70); textSize(13);
  text('横 = 時刻 t（0〜' + nf(T, 1, 2) + ' s）、縦 = 高さ y。白い点 = 決めた両端。ピンクの点をドラッグ', px + 8, py + 16);

  // 玉の動き（右端に縦に並べて、2 つの道を同時に動かす）
  anim = (anim + 1 / 60 / T * 0.5) % 1;
  let ta = anim * T;
  noStroke(); fill(55, 90, 100); circle(X(ta), Y(truePath(ta)), 10);
  fill(330, 70, 100); circle(X(ta), Y(pathY(ta, 1)), 10);

  // ---- 右：S(ε) のグラフ（ずらす量を連続に変えたときの作用）
  let gx = width * 0.53, gy = height * 0.14, gw = width * 0.43, gh = height * 0.5;
  noStroke(); fill(0, 0, 13); rect(gx, gy, gw, gh, 6);
  let Ss = [], smin = 1e9, smax = -1e9;
  for (let i = 0; i <= 60; i++) { let e = map(i, 0, 60, -1.5, 1.5), S = action(e); Ss.push([e, S]); smin = min(smin, S); smax = max(smax, S); }
  let pad = (smax - smin) * 0.15 + 1e-3;
  let SX = (e) => map(e, -1.5, 1.5, gx + 30, gx + gw - 20), SY = (S) => map(S, smin - pad, smax + pad, gy + gh - 30, gy + 30);
  stroke(0, 0, 35); line(SX(0), gy + 26, SX(0), gy + gh - 26);
  stroke(190, 70, 100); strokeWeight(2.5); noFill();
  beginShape(); for (let q of Ss) vertex(SX(q[0]), SY(q[1])); endShape();
  let S0 = action(0), S1 = action(1);
  noStroke(); fill(55, 90, 100); circle(SX(0), SY(S0), 14);
  fill(330, 70, 100); circle(SX(1), SY(S1), 14);
  fill(0, 0, 70); textSize(13);
  text('作用 S(ε)：ピンクのずらし方を ε 倍したとき（ε = 0 が本物、ε = 1 がピンク）', gx + 8, gy + 16);
  textAlign(CENTER); text('ε', gx + gw / 2, gy + gh - 8); textAlign(LEFT, BASELINE);

  // 数字
  let slope = (action(0.001) - action(-0.001)) / 0.002, curv = (action(0.01) - 2 * S0 + action(-0.01)) / 0.0001;
  let ty = gy + gh + 30;
  fill(0, 0, 90); textSize(16);
  text('本物の道　S = ' + nf(S0, 1, 4), gx, ty);
  fill(330, 70, 100); text('ピンクの道　S = ' + nf(S1, 1, 4) + '（差 ' + nf(S1 - S0, 1, 4) + '）', gx, ty + 28);
  fill(0, 0, 75); textSize(15);
  text('ε = 0 での傾き dS/dε = ' + nf(slope, 1, 5) + ' ≈ 0（停留）', gx, ty + 60);
  text('曲がり方 d²S/dε² = ' + nf(curv, 1, 3) + (curv > 0 ? ' > 0 → 最小' : ' < 0 → 最大！（「最小」ではなく「停留」）'), gx, ty + 86);
  if (mode === 2) text('ばね：T = ' + nf(T, 1, 2) + ' s、半周期 π/ω = ' + nf(PI / w0, 1, 2) + ' s' + (T > PI / w0 ? '　→ 半周期より長いと最小でなくなることがある' : ''), gx, ty + 112);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((mode === 1 ? '1：重力（投げ上げ）V = mgy' : '2：ばね V = ½mω²y²') + '　T = ' + nf(T, 1, 2) + ' s（←→）　ドラッグ：ずらす　R：本物に戻す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('L = T − V（ラグランジアン）。S が停留する条件を式にすると m y\'\' = −dV/dy（ニュートンの運動方程式）になる＝オイラー＝ラグランジュ方程式', 20, 68);
}

function mousePressed() {
  let px = width * 0.05, pw = width * 0.44;
  if (mouseX > px && mouseX < px + pw && mouseY > height * 0.14 && mouseY < height * 0.76) dragging = true;
}
function mouseDragged() {
  if (!dragging) return;
  let px = width * 0.05, py = height * 0.14, pw = width * 0.44, ph = height * 0.62;
  let ylo = mode === 1 ? -3 : -2, yhi = mode === 1 ? 8 : 2.5;
  ctrl.t = constrain(map(mouseX, px + 30, px + pw - 30, 0, T), T * 0.05, T * 0.95);
  let yy = map(mouseY, py + ph - 20, py + 20, ylo, yhi);
  ctrl.dy = constrain(yy - truePath(ctrl.t), -6, 6);
}
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === '1') setMode(1);
  if (key === '2') setMode(2);
  if (key === RIGHT_ARROW) { let r = ctrl.t / T; T = min(T + 0.2, 4); ctrl.t = r * T; }
  if (key === LEFT_ARROW) { let r = ctrl.t / T; T = max(T - 0.2, 0.4); ctrl.t = r * T; }
  if (key === 'r' || key === 'R') ctrl.dy = 0;
  if (key === ' ') anim = 0;
}

// ---------- やってみよう ----------
// 1. ピンクの点をどこへ動かしても、S は本物（黄色）より大きくなる？ 青い曲線の底が ε = 0
// 2. 2（ばね）で T を半周期 π/ω（約 1.57 s）より長くする。S(ε) の曲線がひっくり返る → 自然は「最小」ではなく「停留」を選ぶ
// 3. V の符号を変えて T + V にすると？ 停留する道は本物ではなくなる（L = T − V が正しい理由）
// 4. 光の屈折（フェルマーの原理：時間が停留する道）も同じ考え方。最短時間の道を描いてみよう
