// ============================================
// 03 逆回転する車輪（エイリアシングを目で見る）
// 映画で車輪が逆回転して見えるのは、カメラが1秒に24回しか「サンプリング」しないから
// 左 = 本当の回転 / 右 = 1秒 12 回だけ見た回転
// マウス左右 = 回転の速さ / 上下 = スポークの数
// ============================================

let angle = 0;
let shownAngle = 0; // 右の車輪の「見えている」角度
let rpm = 60; // 1分間の回転数
let spokes = 8;
let lastSample = 0;
let sampleFps = 12; // 1秒に何回見るか
let trail = []; // 見えた角度の記録（回転方向を判定するため）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 40, 10);
  rpm = map(mouseX, 0, width, 0, 200, true);
  spokes = floor(map(mouseY, 0, height, 12, 3, true));

  // 本当の回転（1フレーム = 1/60 秒）
  angle += ((rpm / 60) * TWO_PI) / 60;

  // 右側は 1秒に sampleFps 回だけ角度を「見る」
  if (millis() - lastSample > 1000 / sampleFps) {
    lastSample = millis();
    trail.push(angle);
    if (trail.length > 2) trail.shift();
    shownAngle = angle;
  }

  drawWheel(width * 0.28, height * 0.5, angle, '本当の回転（連続）');
  drawWheel(width * 0.72, height * 0.5, shownAngle, '1秒に ' + sampleFps + ' 回だけ見た回転');

  // 見かけの回転方向を計算：スポークの対称性で mod をとる
  let perSample = ((rpm / 60) * TWO_PI) / sampleFps; // 1サンプルあたりの本当の回転角
  let symmetry = TWO_PI / spokes;
  let apparent = ((perSample % symmetry) + symmetry * 1.5) % symmetry - symmetry / 2;
  let dir = abs(apparent) < 0.01 ? '止まって見える' : apparent > 0 ? '正転に見える' : '逆転に見える！';

  fill(0, 0, 100);
  textSize(18);
  text('回転 ' + round(rpm) + ' rpm（マウス左右）　スポーク ' + spokes + ' 本（上下）　→ 右の車輪は「' + dir + '」', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('1サンプルあたり ' + nf(degrees(perSample), 1, 1) + '° 回る。スポークの間隔 ' + nf(360 / spokes, 1, 1) + '° の半分を超えると、逆に見える', 20, 68);
}

function drawWheel(cx, cy, a, label) {
  let r = min(width, height) * 0.2;
  push();
  translate(cx, cy);
  noFill();
  stroke(0, 0, 70);
  strokeWeight(10);
  circle(0, 0, r * 2);
  rotate(a);
  stroke(40, 90, 100);
  strokeWeight(5);
  for (let i = 0; i < spokes; i++) {
    rotate(TWO_PI / spokes);
    line(0, 0, r, 0);
  }
  // 1本だけ目印
  stroke(0, 90, 100);
  strokeWeight(8);
  line(0, 0, r, 0);
  pop();
  noStroke();
  fill(0, 0, 100);
  textAlign(CENTER);
  textSize(18);
  text(label, cx, cy + r + 40);
  textAlign(LEFT);
}

// ---------- やってみよう ----------
// 1. ゆっくり速くしていき、右が「止まる」速さ、「逆転する」速さを見つけよう
// 2. sampleFps を 24（映画）や 30（テレビ）にすると？
// 3. 02 の波の話とまったく同じ現象。「2倍より速く見ないと、本当の動きはわからない」
