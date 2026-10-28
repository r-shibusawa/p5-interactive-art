// ============================================
// 02 放物運動と空気抵抗
// 空気抵抗がなければ 45° がいちばん遠くへ飛ぶ（R = v² sin2θ / g）。空気抵抗があると最適な角度は小さくなる
//   発射台からマウスをドラッグして離すと発射（向き = 角度、長さ = 速さ）
// ドラッグ = 発射 / ↑↓ = 空気抵抗 k / A = 15°〜75° を一斉発射 / C = 軌道を消す
// ============================================

let g = 9.8;               // ★ 重力加速度 [m/s²]
let k = 0.01;              // ★ 空気抵抗の係数（a = −k|v|v、0 で真空）
let vMax = 40;             // ★ 最大の初速 [m/s]
let shots = [];            // 発射した軌道 {pts, ptsVac, theta, v0}
let rangeCurve = [];            // 角度ごとの飛距離 [θ, 真空, 空気あり]
let aiming = false, aimV = 25, aimTh = Math.PI / 4;
let world = 170;           // 画面に入れる距離 [m]

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeCurve();
}
function ox() { return width * 0.04; }
function oy() { return height * 0.82; }
function sc() { return width * 0.44 / world; }

// ★ 空気抵抗ありの軌道を RK4 で計算する（地面に落ちるまで）
function simulate(v0, th, kk, h = 0.01) {
  let s = [0, 0, v0 * cos(th), v0 * sin(th)], pts = [[0, 0]];
  let f = (q) => { let sp = sqrt(q[2] * q[2] + q[3] * q[3]); return [q[2], q[3], -kk * sp * q[2], -g - kk * sp * q[3]]; };
  for (let i = 0; i < 20 / h; i++) {
    let k1 = f(s), k2 = f(s.map((v, j) => v + k1[j] * h / 2)), k3 = f(s.map((v, j) => v + k2[j] * h / 2)), k4 = f(s.map((v, j) => v + k3[j] * h));
    let ns = s.map((v, j) => v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    if (ns[1] < 0) { let r = s[1] / (s[1] - ns[1]); pts.push([s[0] + (ns[0] - s[0]) * r, 0]); break; } // 地面との交点
    s = ns;
    if (i % 3 === 0) pts.push([s[0], s[1]]);
  }
  return pts;
}
function rangeOf(pts) { return pts[pts.length - 1][0]; }

// 角度 1°〜89° の飛距離を全部計算してグラフにする
function makeCurve() {
  rangeCurve = [];
  for (let d = 1; d <= 89; d += 2) {
    let th = radians(d);
    rangeCurve.push([d, aimV * aimV * sin(2 * th) / g, rangeOf(simulate(aimV, th, k, 0.03))]);
  }
}

function launch(v0, th) {
  shots.push({ pts: simulate(v0, th, k), vac: simulate(v0, th, 0), th, v0, kk: k, born: frameCount });
  if (shots.length > 10) shots.shift();
}

function draw() {
  background(210, 35, 11);
  let X = ox(), Y = oy(), S = sc();
  // 地面と目盛り
  stroke(0, 0, 35); strokeWeight(2); line(X, Y, X + world * S, Y);
  noStroke(); fill(0, 0, 55); textSize(12); textAlign(CENTER);
  for (let m = 0; m <= world; m += 20) { rect(X + m * S, Y, 1, 8); text(m + ' m', X + m * S, Y + 22); }
  textAlign(LEFT, BASELINE);

  // これまでの軌道（点線 = 真空、実線 = 空気あり）
  for (let s of shots) {
    let hue = map(degrees(s.th), 0, 90, 180, 360);
    stroke(hue, 50, 80, 60); strokeWeight(1.5); noFill(); drawingContext.setLineDash([4, 6]);
    beginShape(); for (let p of s.vac) vertex(X + p[0] * S, Y - p[1] * S); endShape();
    drawingContext.setLineDash([]);
    stroke(hue, 70, 100); strokeWeight(2.5);
    let n = min(s.pts.length, (frameCount - s.born) * 2 + 2);   // 少しずつ伸ばす
    beginShape(); for (let i = 0; i < n; i++) vertex(X + s.pts[i][0] * S, Y - s.pts[i][1] * S); endShape();
    let p = s.pts[n - 1];
    noStroke(); fill(hue, 70, 100); circle(X + p[0] * S, Y - p[1] * S, 10);
    if (n === s.pts.length && s === shots[shots.length - 1]) { textSize(12); text(nf(rangeOf(s.pts), 1, 1) + ' m', X + p[0] * S - 16, Y - 10); }
  }

  // 狙い中の矢印
  if (aiming) {
    let dx = mouseX - X, dy = Y - mouseY;
    aimTh = constrain(atan2(dy, dx), 0.02, PI / 2 - 0.02);
    aimV = constrain(sqrt(dx * dx + dy * dy) / (width * 0.3) * vMax, 3, vMax);
    if (frameCount % 6 === 0) makeCurve();
  }
  let L = aimV / vMax * width * 0.3;
  stroke(55, 90, 100); strokeWeight(3);
  line(X, Y, X + L * cos(aimTh), Y - L * sin(aimTh));
  noStroke(); fill(0, 0, 80); circle(X, Y, 18);
  fill(55, 90, 100); textSize(14);
  text(nf(degrees(aimTh), 1, 0) + '°  ' + nf(aimV, 1, 1) + ' m/s', X + L * cos(aimTh) + 8, Y - L * sin(aimTh));

  drawRangePlot();

  noStroke(); fill(0, 0, 100); textSize(18);
  text('発射台からドラッグして離す　空気抵抗 k = ' + nf(k, 1, 3) + '（↑↓）　A：15°〜75° を一斉発射　C：消す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('点線 = 空気がない場合（放物線）、実線 = 空気抵抗あり（a = −g − k|v|v）。空気があると落ちるときの角度が急になる', 20, 68);
}

// 右：角度と飛距離のグラフ（いまの初速で）
function drawRangePlot() {
  let gx = width * 0.52, gy = height * 0.16, gw = width * 0.44, gh = height * 0.6;
  noStroke(); fill(0, 0, 14); rect(gx, gy, gw, gh, 6);
  let rMax = max(10, aimV * aimV / g * 1.1);
  let px = (d) => map(d, 0, 90, gx + 40, gx + gw - 16), py = (r) => map(r, 0, rMax, gy + gh - 30, gy + 30);
  stroke(0, 0, 30); strokeWeight(1);
  for (let d = 0; d <= 90; d += 15) line(px(d), gy + 30, px(d), gy + gh - 30);
  noStroke(); fill(0, 0, 60); textSize(12); textAlign(CENTER);
  for (let d = 0; d <= 90; d += 15) text(d + '°', px(d), gy + gh - 12);
  textAlign(LEFT, BASELINE);
  let best = [0, 0, 0], bestVac = [0, 0, 0];
  for (let c of rangeCurve) { if (c[2] > best[2]) best = c; if (c[1] > bestVac[1]) bestVac = c; }
  noFill(); strokeWeight(2);
  stroke(0, 0, 60); drawingContext.setLineDash([4, 6]);
  beginShape(); for (let c of rangeCurve) vertex(px(c[0]), py(c[1])); endShape();
  drawingContext.setLineDash([]);
  stroke(30, 80, 100);
  beginShape(); for (let c of rangeCurve) vertex(px(c[0]), py(c[2])); endShape();
  // 最大の点
  noStroke(); fill(0, 0, 80); circle(px(bestVac[0]), py(bestVac[1]), 10);
  fill(30, 80, 100); circle(px(best[0]), py(best[2]), 12);
  stroke(55, 90, 100); line(px(degrees(aimTh)), gy + 30, px(degrees(aimTh)), gy + gh - 30);
  noStroke(); textSize(14);
  fill(0, 0, 80); text('真空：最大 ' + bestVac[0] + '° で ' + nf(bestVac[1], 1, 1) + ' m（v²/g = ' + nf(aimV * aimV / g, 1, 1) + '）', gx + 50, gy + 50);
  fill(30, 80, 100); text('空気あり：最大 ' + best[0] + '° で ' + nf(best[2], 1, 1) + ' m', gx + 50, gy + 72);
  fill(0, 0, 70); textSize(13); text('角度と飛距離（初速 ' + nf(aimV, 1, 1) + ' m/s）', gx + 8, gy + 18);
}

function mousePressed() { if (mouseX < width * 0.5 && mouseY > 90) aiming = true; }
function mouseReleased() {
  if (aiming) { aiming = false; makeCurve(); launch(aimV, aimTh); }
}
function keyPressed() {
  if (key === UP_ARROW) { k = min(k + 0.005, 0.1); makeCurve(); }
  if (key === DOWN_ARROW) { k = max(k - 0.005, 0); makeCurve(); }
  if (key === 'a' || key === 'A') for (let d = 15; d <= 75; d += 15) launch(aimV, radians(d));
  if (key === 'c' || key === 'C') shots = [];
}

// ---------- やってみよう ----------
// 1. k = 0 にして 30° と 60° で撃つ。飛距離が同じになる（sin2θ が同じ）
// 2. k を大きくすると最適な角度は何度になる？ 野球のホームランは 25°〜35° くらい
// 3. 初速を 2 倍にすると、真空では飛距離 4 倍。空気ありでは？
// 4. 月面（g = 1.62、k = 0）にしてみる。同じ初速でどれだけ飛ぶ？
