// ============================================
// 11 剛体の回転：テニスラケットの定理（ジャニベコフ効果）
// 3 つの軸で慣性モーメントが違う箱（I₁ < I₂ < I₃）。いちばん小さい軸・大きい軸のまわりの回転は安定、
//   まん中の軸のまわりの回転だけは不安定で、ときどきくるっと裏返る。オイラーの方程式を RK4 で解く
// 1 / 2 / 3 = 回す軸 / ←→ = ずれの大きさ / ↑↓ = 時間の速さ / ドラッグ = 見る向き / スペース = 一時停止
// ============================================

let dims = [240, 140, 44];  // ★ 箱の大きさ [px]（x: 長い, y: まん中, z: うすい）
let spin = 4;               // ★ 回転の速さ [rad/s]
let eps = 0.02;             // ★ ほかの軸へのずれ（小さな揺らぎ）
let timeScale = 1;
let I = [1, 1, 1];          // 主慣性モーメント
let w = [0, 0, 0];          // 体に固定した座標での角速度 ω
let R;                      // 姿勢（体 → 世界の回転行列）
let axisNow = 2, paused = false;
let viewX = -0.4, viewY = 0.5;
let HIST = 600, hw = [[], [], []];
let hud, info;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  // 箱の慣性モーメント：I₁ ∝ b² + c² など（質量は 1 にそろえる）
  let [a, b, c] = dims.map((d) => d / 100);
  I = [(b * b + c * c) / 12, (a * a + c * c) / 12, (a * a + b * b) / 12];
  hud = createGraphics(floor(width * 0.42), floor(height * 0.5));
  hud.colorMode(HSB, 360, 100, 100, 100);
  info = createDiv('');
  info.position(20, 16);
  info.style('color', '#eee'); info.style('font', '15px sans-serif'); info.style('pointer-events', 'none'); info.style('line-height', '1.7');
  start(2);
}

function start(k) {
  axisNow = k;
  w = [eps * spin, eps * spin, eps * spin];
  w[k - 1] = spin;
  R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  hw = [[], [], []];
}

// ★ オイラーの方程式（外からのトルクなし）
function eulerEq(v) {
  return [(I[1] - I[2]) / I[0] * v[1] * v[2], (I[2] - I[0]) / I[1] * v[2] * v[0], (I[0] - I[1]) / I[2] * v[0] * v[1]];
}
function rk4(v, h) {
  let k1 = eulerEq(v), k2 = eulerEq(v.map((q, i) => q + k1[i] * h / 2)), k3 = eulerEq(v.map((q, i) => q + k2[i] * h / 2)), k4 = eulerEq(v.map((q, i) => q + k3[i] * h));
  return v.map((q, i) => q + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

function draw() {
  background(225, 35, 9);
  if (!paused) {
    let sub = 20, h = timeScale / 60 / sub;
    for (let s = 0; s < sub; s++) {
      let wm = rk4(w, h / 2);         // 刻みのまん中の ω で姿勢を回す
      R = mulM(R, rodrigues(wm, h));  // 姿勢の更新：R ← R · exp([ω]× h)
      w = rk4(w, h);
    }
    R = orthonormalize(R);
    for (let i = 0; i < 3; i++) pushHist(hw[i], w[i]);
  }

  // ---- 3D の箱
  push();
  translate(-width * 0.2, 20, 0);
  rotateX(viewX); rotateY(viewY);
  ambientLight(0, 0, 45); directionalLight(0, 0, 100, 0.4, 0.6, -1);
  // 角運動量 L（世界座標では向きが変わらない）
  let Lb = [I[0] * w[0], I[1] * w[1], I[2] * w[2]], Lw = mulV(R, Lb), Ln = Math.hypot(...Lw);
  stroke(55, 90, 100); strokeWeight(3);
  line(0, 0, 0, Lw[0] / Ln * 260, Lw[1] / Ln * 260, Lw[2] / Ln * 260);
  applyMatrix(R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, 0, 0, 0, 1);
  noStroke(); fill(210, 20, 85); box(dims[0], dims[1], dims[2]);
  // 軸の棒（赤 = 1 軸、緑 = 2 軸、青 = 3 軸）と目印
  fill(0, 80, 100); push(); translate(dims[0] / 2 + 30, 0, 0); box(60, 8, 8); pop();
  fill(130, 80, 90); push(); translate(0, dims[1] / 2 + 30, 0); box(8, 60, 8); pop();
  fill(220, 80, 100); push(); translate(0, 0, dims[2] / 2 + 30); box(8, 8, 60); pop();
  fill(30, 90, 100); push(); translate(dims[0] * 0.3, -dims[1] / 2 - 6, 0); box(30, 12, 30); pop();
  pop();

  // ---- 右上：ω のグラフ（2D の画像に描いて、画面に貼る）
  drawHUD();
  drawingContext.disable(drawingContext.DEPTH_TEST);
  push(); resetMatrix(); image(hud, width * 0.55 - width / 2, height * 0.18 - height / 2); pop();
  drawingContext.enable(drawingContext.DEPTH_TEST);

  if (frameCount % 5 === 0) {
    let E = 0.5 * (I[0] * w[0] ** 2 + I[1] * w[1] ** 2 + I[2] * w[2] ** 2);
    let names = ['', '1 軸（I 最小・長い軸）→ 安定', '2 軸（I まん中）→ 不安定！ときどき裏返る', '3 軸（I 最大・うすい面に垂直）→ 安定'];
    info.html('<b style="font-size:18px">回している軸：' + names[axisNow] + '（1/2/3）</b><br>' +
      'ずれ ε = ' + nf(eps, 1, 3) + '（←→）　時間 ×' + nf(timeScale, 1, 2) + '（↑↓）　ドラッグ：見る向き　スペース：' + (paused ? '再開' : '一時停止') + '<br>' +
      '<span style="color:#aaa">I₁ : I₂ : I₃ = ' + nf(I[0] / I[0], 1, 2) + ' : ' + nf(I[1] / I[0], 1, 2) + ' : ' + nf(I[2] / I[0], 1, 2) +
      '　エネルギー ' + nf(E, 1, 4) + '　|L| = ' + nf(Ln, 1, 4) + '（どちらも保存）　黄色い線 = 角運動量 L（向きも変わらない）</span>');
  }
}

function drawHUD() {
  let g = hud, W = g.width, H = g.height;
  g.clear(); g.noStroke(); g.fill(0, 0, 12, 90); g.rect(0, 0, W, H, 6);
  let hues = [0, 130, 220], names = ['ω₁', 'ω₂', 'ω₃'];
  g.stroke(0, 0, 35); g.line(0, H / 2, W, H / 2);
  for (let k = 0; k < 3; k++) {
    g.stroke(hues[k], 70, 100); g.strokeWeight(2); g.noFill();
    g.beginShape();
    for (let i = 0; i < hw[k].length; i++) g.vertex(map(i + HIST - hw[k].length, 0, HIST - 1, 0, W), map(constrain(hw[k][i], -spin * 1.2, spin * 1.2), -spin * 1.2, spin * 1.2, H - 10, 30));
    g.endShape();
    g.noStroke(); g.fill(hues[k], 70, 100); g.textSize(14); g.text(names[k], W - 120 + k * 36, 20);
  }
  g.fill(0, 0, 75); g.textSize(13); g.text('体の座標での角速度 ω（10 秒分）', 10, 20);
  g.text('2 軸で回すと ω₂ が + と − を行き来する = 裏返り', 10, H - 12);
}

function mouseDragged() { viewY += (mouseX - pmouseX) * 0.01; viewX -= (mouseY - pmouseY) * 0.01; }
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') start(int(key));
  if (key === RIGHT_ARROW) { eps = min(eps * 2, 0.32); start(axisNow); }
  if (key === LEFT_ARROW) { eps = max(eps / 2, 0.0025); start(axisNow); }
  if (key === UP_ARROW) timeScale = min(timeScale * 2, 4);
  if (key === DOWN_ARROW) timeScale = max(timeScale / 2, 0.125);
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. 1 と 3 では箱はきれいに回り続ける。2 だけ、数秒ごとにくるっと裏返る（宇宙ステーションのナットで有名）
// 2. ε を小さくすると、裏返るまでの時間はどう変わる？ 0 にはならない（不安定なので必ずいつか崩れる）
// 3. dims を [240, 239, 44] にして I₁ と I₂ を近づけると？
// 4. スマホやテニスラケットを放り投げて、3 つの軸で回してみよう（落とさないように！）


// ==================================================
// ここから下は「3 × 3 行列の道具」です
// ==================================================
function mulM(A, B) {
  let C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}
function mulV(A, v) { return [0, 1, 2].map((i) => A[i][0] * v[0] + A[i][1] * v[1] + A[i][2] * v[2]); }
// ロドリゲスの公式：軸 ω/|ω| のまわりに |ω|h 回す回転行列
function rodrigues(v, h) {
  let th = Math.hypot(v[0], v[1], v[2]) * h;
  if (th < 1e-12) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  let [x, y, z] = v.map((q) => q * h / th), c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
}
// 計算誤差で行列がゆがまないように、列を直交に直す（グラム＝シュミット）
function orthonormalize(A) {
  let c0 = [A[0][0], A[1][0], A[2][0]], c1 = [A[0][1], A[1][1], A[2][1]];
  let n0 = Math.hypot(...c0); c0 = c0.map((q) => q / n0);
  let d = c0[0] * c1[0] + c0[1] * c1[1] + c0[2] * c1[2]; c1 = c1.map((q, i) => q - d * c0[i]);
  let n1 = Math.hypot(...c1); c1 = c1.map((q) => q / n1);
  let c2 = [c0[1] * c1[2] - c0[2] * c1[1], c0[2] * c1[0] - c0[0] * c1[2], c0[0] * c1[1] - c0[1] * c1[0]];
  return [[c0[0], c1[0], c2[0]], [c0[1], c1[1], c2[1]], [c0[2], c1[2], c2[2]]];
}
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : 0);
  if (arr.length > HIST) arr.shift();
}
