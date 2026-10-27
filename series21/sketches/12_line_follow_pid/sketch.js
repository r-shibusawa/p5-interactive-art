// ============================================
// 12 ライントレースと PID
// 床の線を 5 個の明るさセンサーで読み、「線が中央からどれだけずれているか」= 誤差 e を回転速度に変える
//   P：e に比例　I：e の積み重ね（ずれっぱなしを直す）　D：e の変化（曲がり始めを先読みして振動を抑える）
//   ω = Kp e + Ki Σe + Kd Δe
// ←→ = Kp / ↑↓ = Kd / I = 積分項 ON/OFF / 1〜3 = コース / F・S = 速く・遅く / R = スタートに戻す
// ============================================

let track;                       // コースを描いた画像
let robot;                       // {x, y, th}
let nSensors = 5;                // ★ センサーの数
let sensorSpacing = 9;           // ★ センサーの間隔（px）
let sensorAhead = 22;            // ★ ロボットの中心からセンサーまでの距離
let Kp = 0.06, Ki = 0, Kd = 0.4; // ★ ゲイン
let useI = false;
let speed = 2.5;                 // ★ 前進速度
let eSum = 0, ePrev = 0, lastDir = 1;
let course = 1;
let errHist = [];
let readings = [];
let lost = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  makeTrack();
}

// ★ コース：中心からの半径を角度の関数で決める閉じた曲線
function trackPoint(t) {
  let cx = width / 2, cy = height / 2 + 40;
  let R = min(width, height - 120) * 0.36;
  let r;
  if (course === 1) r = R;
  else if (course === 2) r = R * (1 + 0.25 * sin(3 * t));
  else r = R * (1 + 0.18 * sin(5 * t) + 0.12 * cos(2 * t));
  return { x: cx + r * cos(t) * 1.25, y: cy + r * sin(t) * 0.85 };
}
function makeTrack() {
  track = createGraphics(width, height);
  track.pixelDensity(1);
  track.background(0);
  track.noFill();
  track.stroke(255);
  track.strokeWeight(14);         // ★ 線の太さ
  track.beginShape();
  for (let t = 0; t < TWO_PI; t += 0.02) { let p = trackPoint(t); track.vertex(p.x, p.y); }
  track.endShape(CLOSE);
  track.loadPixels();
  let p0 = trackPoint(0), p1 = trackPoint(0.02);
  robot = { x: p0.x, y: p0.y, th: atan2(p1.y - p0.y, p1.x - p0.x) };
  eSum = 0; ePrev = 0; errHist = []; lost = 0;
}
// 画像の明るさを読む（0〜1）
function brightAt(x, y) {
  let ix = floor(x), iy = floor(y);
  if (ix < 0 || iy < 0 || ix >= width || iy >= height) return 0;
  return track.pixels[(ix + iy * width) * 4] / 255;
}

function draw() {
  background(215, 35, 12);
  image(track, 0, 0);
  // センサーの位置と値
  readings = [];
  let weighted = 0, total = 0;
  for (let i = 0; i < nSensors; i++) {
    let off = (i - (nSensors - 1) / 2) * sensorSpacing;
    let sx = robot.x + cos(robot.th) * sensorAhead - sin(robot.th) * off;
    let sy = robot.y + sin(robot.th) * sensorAhead + cos(robot.th) * off;
    let b = brightAt(sx, sy);
    readings.push({ x: sx, y: sy, v: b });
    weighted += b * off; total += b;
  }
  // ★ 誤差 e：線がセンサー列のどこにあるか（重みつき平均、右が＋）
  let e;
  if (total > 0.2) { e = weighted / total; lastDir = e >= 0 ? 1 : -1; lost = 0; }
  else { e = lastDir * sensorSpacing * (nSensors - 1) / 2; lost++; }   // 見失ったら最後に見た側へ
  eSum = constrain(eSum + e, -400, 400);
  let dE = e - ePrev; ePrev = e;
  let w = Kp * e + (useI ? Ki * eSum : 0) + Kd * dE;
  w = constrain(w, -0.2, 0.2);
  robot.th += w;
  let v = lost > 30 ? speed * 0.4 : speed;
  robot.x += v * cos(robot.th); robot.y += v * sin(robot.th);
  errHist.push(e); if (errHist.length > 300) errHist.shift();

  // ロボット
  push(); translate(robot.x, robot.y); rotate(robot.th);
  noStroke(); fill(170, 60, 95); rect(-18, -14, 36, 28, 5);
  fill(0, 0, 100); triangle(18, 0, 8, -7, 8, 7);
  pop();
  for (let s of readings) {
    stroke(0, 0, 100); strokeWeight(1);
    fill(s.v > 0.5 ? 45 : 0, 90, s.v > 0.5 ? 100 : 30);
    circle(s.x, s.y, 8);
  }
  // 誤差グラフ
  let gx = width - 330, gy = 200, gw = 300, gh = 90;
  noStroke(); fill(0, 0, 100, 8); rect(gx - 10, gy - gh / 2 - 10, gw + 20, gh + 20, 8);
  stroke(0, 0, 40); line(gx, gy, gx + gw, gy);
  stroke(45, 90, 100); strokeWeight(2); noFill();
  beginShape();
  for (let i = 0; i < errHist.length; i++) vertex(gx + i / 300 * gw, gy - constrain(errHist[i] / 20, -1, 1) * gh / 2);
  endShape();
  noStroke(); fill(0, 0, 60); textSize(12); text('誤差 e の推移（振動していたら Kd を上げる）', gx, gy - gh / 2 - 16);

  fill(0, 0, 100); textSize(18);
  text('Kp = ' + nf(Kp, 1, 3) + '（←→）　Kd = ' + nf(Kd, 1, 2) + '（↑↓）　I：積分 ' + (useI ? 'ON Ki = ' + Ki : 'off') + '　速さ ' + nf(speed, 1, 1) + '（F・S）　コース ' + course + '（1〜3）　R：戻す' + (lost > 0 ? '　⚠ 線を見失った' : ''), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('黄色いセンサー = 線の上。e = 線の位置（右が＋）。P だけだと曲がり角で振動、D で落ち着く。速くするとどこで脱線する？', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) Kp = min(0.5, Kp * 1.3);
  if (key === LEFT_ARROW) Kp = max(0.005, Kp / 1.3);
  if (key === UP_ARROW) Kd = min(3, Kd + 0.1);
  if (key === DOWN_ARROW) Kd = max(0, Kd - 0.1);
  if (key === 'i' || key === 'I') { useI = !useI; Ki = 0.0005; eSum = 0; }
  if (key === 'f' || key === 'F') speed = min(8, speed + 0.5);
  if (key === 's' || key === 'S') speed = max(0.5, speed - 0.5);
  if (key >= '1' && key <= '3') { course = int(key); makeTrack(); }
  if (key === 'r' || key === 'R') makeTrack();
}

// ---------- やってみよう ----------
// 1. Kd = 0 にして Kp を上げていく。ふらつき始める Kp はいくつ？ そこから Kd を足して落ち着かせる
// 2. 速さを 6 にしてコース 3 を走れる Kp・Kd を探す（ロボコンのチューニングそのもの）
// 3. nSensors を 2 にすると？（左右だけ）8 にすると？ センサーの数と走りの質
// 4. 積分 ON で、線の太さを 4 にしてみる。小さなずれが残るときに効く
