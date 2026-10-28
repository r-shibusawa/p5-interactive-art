// ============================================
// 10 回転と角運動量
// フィギュアスケートのスピン：腕をたたむと速く回る。外から力のモーメント（トルク）がなければ角運動量 L = Iω は一定
//   慣性モーメント I = Σ m r²（重さが軸から遠いほど回しにくい）。腕をたたむと I が減る → ω が増える
// スペース（押している間）= 腕をたたむ / T（押している間）= トルクを加える / R = 逆向きトルク / F = 氷の摩擦 / 0 = リセット
// ============================================

let Ibody = 1.0;           // ★ 体（軸の近く）の慣性モーメント [kg·m²]
let mHand = 4;             // ★ 片腕（＋手に持ったおもり）の質量 [kg]
let rOut = 0.9, rIn = 0.15; // ★ 腕を広げたとき・たたんだときの半径 [m]
let torque = 6;            // ★ T キーで加えるトルク [N·m]
let fric = 0.3;            // ★ 摩擦トルクの係数
let r = 0.9, L = 4, phi = 0;
let friction = false;
let HIST = 600, hI = [], hW = [], hL = [], hK = [];
let trail = [];
let held = {};              // 押されているキー

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}
function inertia(rr) { return Ibody + 2 * mHand * rr * rr; }

function draw() {
  background(205, 30, 10);
  let dt = 1 / 60;
  // 腕の半径を目標へなめらかに近づける（スケーターが自分の筋肉で引き寄せる）
  let target = held[' '] ? rIn : rOut;
  r += (target - r) * 0.08;
  // ★ 外からのトルク τ だけが L を変える：dL/dt = τ
  let tau = 0;
  if (held['t']) tau += torque;   // T
  if (held['r']) tau -= torque;   // R
  let I = inertia(r), w = L / I;
  if (friction) tau -= fric * w;
  L = constrain(L + tau * dt, -60, 60);
  w = L / I;                           // ★ ω = L / I
  phi += w * dt;
  let K = L * L / (2 * I);             // 回転の運動エネルギー = L² / 2I
  pushHist(hI, I); pushHist(hW, w); pushHist(hL, L); pushHist(hK, K);

  // ---- 上から見たスケーター
  let cx = width * 0.25, cy = height * 0.52, PXM = min(width, height) * 0.28;
  let hx = cos(phi) * r * PXM, hy = sin(phi) * r * PXM;
  trail.push([cx + hx, cy + hy, cx - hx, cy - hy]); if (trail.length > 60) trail.shift();
  noFill(); stroke(0, 0, 25); strokeWeight(1); circle(cx, cy, 2 * rOut * PXM); circle(cx, cy, 2 * rIn * PXM);
  trail.forEach((q, i) => { stroke(30, 70, 100, i * 1.2); strokeWeight(3); point(q[0], q[1]); point(q[2], q[3]); });
  stroke(20, 30, 90); strokeWeight(12); line(cx - hx, cy - hy, cx + hx, cy + hy);   // 腕
  noStroke(); fill(220, 30, 70); ellipse(cx, cy, 70, 70);                          // 体（上から見た頭と肩）
  push(); translate(cx, cy); rotate(phi); fill(220, 30, 90); ellipse(0, 0, 40, 60); fill(0, 0, 20); circle(14, 0, 8); pop(); // 顔の向き
  fill(30, 80, 100); circle(cx + hx, cy + hy, 26); circle(cx - hx, cy - hy, 26);    // 手のおもり
  // トルクの矢印（回転方向の円弧）
  if (tau !== 0 && (held['t'] || held['r'])) {
    let s = Math.sign(tau);
    noFill(); stroke(0, 80, 100); strokeWeight(5);
    arc(cx, cy, 2 * rOut * PXM + 60, 2 * rOut * PXM + 60, -HALF_PI - 0.6, -HALF_PI + 0.6);
    let ex = cx + cos(-HALF_PI + 0.6 * s) * (rOut * PXM + 30), ey = cy + sin(-HALF_PI + 0.6 * s) * (rOut * PXM + 30);
    noStroke(); fill(0, 80, 100); circle(ex, ey, 16);
    textSize(16); text('トルク τ = ' + nf(tau, 1, 1) + ' N·m', cx - 70, cy - rOut * PXM - 50);
  }
  // 角運動量ベクトル（上から見ると紙面の手前向き ⊙ / 奥向き ⊗）
  noStroke(); fill(55, 90, 100); textSize(15);
  text('L = ' + nf(L, 1, 2) + (L >= 0 ? '（紙面の手前向き ⊙）' : '（奥向き ⊗）'), width * 0.04, height * 0.88);

  // ---- 右のグラフ
  let gx = width * 0.5, gw = width * 0.46, gh = height * 0.17;
  drawPlot(gx, height * 0.12, gw, gh, [{ data: hI, hue: 200, name: '慣性モーメント I' }], 0, inertia(rOut) * 1.1, 'I = I体 + 2 m r²  [kg·m²]');
  drawPlot(gx, height * 0.32, gw, gh, [{ data: hW, hue: 30, name: '角速度 ω' }], -25, 25, 'ω = L / I  [rad/s]');
  drawPlot(gx, height * 0.52, gw, gh, [{ data: hL, hue: 55, name: '角運動量 L' }], -20, 20, 'L = Iω  [kg·m²/s]（トルクがなければ水平）');
  drawPlot(gx, height * 0.72, gw, gh, [{ data: hK, hue: 330, name: '運動エネルギー' }], 0, 150, 'K = L² / 2I  [J]（腕をたたむと増える）');

  noStroke(); fill(0, 0, 100); textSize(18);
  text('スペース：腕をたたむ（押している間）　T / R：トルク　F：摩擦 ' + (friction ? 'ON' : 'OFF') + '　0：リセット', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('I = ' + nf(I, 1, 2) + '　ω = ' + nf(w, 1, 2) + ' rad/s（' + nf(abs(w) / TWO_PI * 60, 1, 0) + ' 回転/分）　L = ' + nf(L, 1, 2) + '　K = ' + nf(K, 1, 1) + ' J　　腕をたたむと I が ' + nf(inertia(rOut) / inertia(rIn), 1, 1) + ' 分の 1 → ω が ' + nf(inertia(rOut) / inertia(rIn), 1, 1) + ' 倍', 20, 68);
}

function keyPressed() {
  held[key.toLowerCase()] = true;
  if (key === 'f' || key === 'F') friction = !friction;
  if (key === '0') { L = 4; r = rOut; phi = 0; }
  return false;
}
function keyReleased() { held[key.toLowerCase()] = false; }

// ---------- やってみよう ----------
// 1. スペースで腕をたたむと何倍速くなる？ I の比と同じになるか確かめる
// 2. 腕をたたむと運動エネルギー K が増える。エネルギーはどこから来た？（腕を引き寄せる筋肉の仕事）
// 3. T を押している間だけ L が増える。押していない間は、腕を動かしても L のグラフは水平
// 4. mHand を 0 にすると（おもりなし）腕をたたんでもあまり変わらない。猫が空中で向きを変えるのも角運動量の工夫


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : 0);
  if (arr.length > HIST) arr.shift();
}
function drawPlot(x0, y0, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x0, y0, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let yz = map(0, lo, hi, y0 + h, y0);
  if (yz > y0 && yz < y0 + h) line(x0, yz, x0 + w, yz);
  for (let s of series) {
    stroke(s.hue, 70, 100); strokeWeight(2); noFill();
    beginShape();
    for (let i = 0, off = HIST - s.data.length; i < s.data.length; i++) vertex(map(i + off, 0, HIST - 1, x0, x0 + w), map(constrain(s.data[i], lo, hi), lo, hi, y0 + h, y0));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x0 + 8, y0 + 6);
  let lx = x0 + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, 70, 100); text(s.name, lx, y0 + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
