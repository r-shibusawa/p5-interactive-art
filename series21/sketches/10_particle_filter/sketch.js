// ============================================
// 10 パーティクルフィルタによる自己位置推定
// 「自分はどこ？」を、たくさんの仮説（粒子）で表す
//   予測：各粒子をロボットと同じ指令で動かす（＋ノイズ）　重みづけ：目印までの距離がセンサーと合う粒子ほど重く
//   リサンプリング：重い粒子を増やし、軽い粒子を消す → 粒子が本当の位置に集まる
// ←→ = 粒子の数 / K = 誘拐（ロボットを別の場所へ）/ ↑↓ = センサーのノイズ / スペース = 自動運転 ON/OFF（OFF なら W/A/D で操作）/ R = リセット
// ============================================

let landmarks = [];           // 目印（位置は既知）
let robot;                    // 本当の姿勢 {x, y, th}
let particles = [];           // {x, y, th, w}
let N = 500;                  // ★ 粒子の数
let sensorSigma = 15;         // ★ 距離センサーのノイズ（px）
let motionSigma = 1.2;        // ★ 動きのノイズ（粒子をばらまく大きさ）
let sensorRange = 260;        // ★ 目印が見える距離
let auto = true;
let est = null;               // 推定（重みつき平均）
let errHist = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomSeed(5);
  for (let i = 0; i < 7; i++) landmarks.push({ x: random(120, width - 120), y: random(150, height - 60) });
  resetAll();
}
function resetAll() {
  robot = { x: width * 0.3, y: height * 0.5, th: 0 };
  initParticles();
  errHist = [];
}
// 粒子を画面全体にばらまく（「どこにいるか全くわからない」状態）
function initParticles() {
  particles = [];
  for (let i = 0; i < N; i++) particles.push({ x: random(width), y: random(100, height), th: random(TWO_PI), w: 1 / N });
}

function moveStep(p, v, w) { p.th += w; p.x += v * cos(p.th); p.y += v * sin(p.th); }

// ★ 1：予測。指令（v, w）＋ノイズで各粒子を動かす
function predict(v, w) {
  for (let p of particles) moveStep(p, v + randomGaussian() * motionSigma, w + randomGaussian() * 0.03);
}
// ★ 2：重みづけ。「この粒子の場所なら目印までの距離はこうなるはず」とセンサー値を比べる
function weigh(meas) {
  let sum = 0;
  for (let p of particles) {
    let lw = 0;
    for (let m of meas) {
      let d = sqrt(sq(landmarks[m.i].x - p.x) + sq(landmarks[m.i].y - p.y));
      lw += -sq(d - m.d) / (2 * sensorSigma * sensorSigma);    // ガウス分布の対数
    }
    p.w = exp(lw) + 1e-300;
    sum += p.w;
  }
  for (let p of particles) p.w /= sum;
}
// ★ 3：リサンプリング（低分散法）。重い粒子を複製、軽い粒子を捨てる
function resample() {
  let out = [], r = random() / N, c = particles[0].w, i = 0;
  for (let m = 0; m < N; m++) {
    let u = r + m / N;
    while (u > c && i < particles.length - 1) { i++; c += particles[i].w; }
    let p = particles[i];
    out.push({ x: p.x, y: p.y, th: p.th, w: 1 / N });
  }
  particles = out;
}

function draw() {
  background(215, 35, 12);
  // ロボットの指令
  let v = 2, w = 0;
  if (auto) w = 0.02 * sin(frameCount * 0.01) + 0.01;
  else { v = keyIsDown('w') || keyIsDown('W') ? 2 : 0; w = (keyIsDown('a') || keyIsDown('A') ? -0.04 : 0) + (keyIsDown('d') || keyIsDown('D') ? 0.04 : 0); }
  moveStep(robot, v, w);
  if (robot.x < 20 || robot.x > width - 20 || robot.y < 120 || robot.y > height - 20) { robot.th += PI; robot.x = constrain(robot.x, 20, width - 20); robot.y = constrain(robot.y, 120, height - 20); }

  // センサー：見える目印までの距離（ノイズつき）
  let meas = [];
  for (let i = 0; i < landmarks.length; i++) {
    let d = sqrt(sq(landmarks[i].x - robot.x) + sq(landmarks[i].y - robot.y));
    if (d < sensorRange) meas.push({ i, d: d + randomGaussian() * sensorSigma });
  }
  predict(v, w);
  if (meas.length) { weigh(meas); resample(); }
  // 推定 = 粒子の平均
  let sx = 0, sy = 0;
  for (let p of particles) { sx += p.x; sy += p.y; }
  est = { x: sx / N, y: sy / N };
  let err = sqrt(sq(est.x - robot.x) + sq(est.y - robot.y));
  errHist.push(err); if (errHist.length > 300) errHist.shift();

  // 粒子
  noStroke();
  fill(45, 90, 100, 45);
  for (let p of particles) circle(p.x, p.y, 4);
  // 目印と観測
  for (let m of meas) { stroke(120, 60, 100, 30); strokeWeight(1); line(robot.x, robot.y, landmarks[m.i].x, landmarks[m.i].y); }
  noStroke();
  for (let l of landmarks) { fill(120, 80, 100); rect(l.x - 8, l.y - 8, 16, 16, 3); }
  // ロボット（本当）と推定
  push(); translate(robot.x, robot.y); rotate(robot.th);
  fill(170, 60, 95); rect(-16, -12, 32, 24, 5); fill(0, 0, 100); triangle(16, 0, 6, -7, 6, 7);
  pop();
  noFill(); stroke(45, 90, 100); strokeWeight(3); circle(est.x, est.y, 26);
  line(est.x - 10, est.y, est.x + 10, est.y); line(est.x, est.y - 10, est.x, est.y + 10);
  // 誤差グラフ
  let gx = width - 330, gy = 200, gw = 300, gh = 80;
  noStroke(); fill(0, 0, 100, 8); rect(gx - 10, gy - gh - 10, gw + 20, gh + 20, 8);
  stroke(0, 80, 100); strokeWeight(2); noFill();
  beginShape();
  for (let i = 0; i < errHist.length; i++) vertex(gx + i / 300 * gw, gy - constrain(errHist[i] / 300, 0, 1) * gh);
  endShape();
  noStroke(); fill(0, 0, 60); textSize(12); text('推定の誤差（0〜300 px）', gx, gy - gh - 16);

  fill(0, 0, 100);
  textSize(18);
  text('粒子 ' + N + '（←→）　センサー σ = ' + sensorSigma + '（↑↓）　K：誘拐　スペース：自動 ' + (auto ? 'ON' : 'off（W A D で運転）') + '　R：リセット　誤差 ' + nf(err, 1, 0) + ' px　見える目印 ' + meas.length, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('黄色い点 = 粒子（仮説）　黄色い輪 = 推定　緑の四角 = 目印。誘拐（K）すると粒子が一度ちらばり、また集まる。目印が見えないと誤差が増える', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { N = min(5000, N * 2); initParticles(); }
  if (key === LEFT_ARROW) { N = max(50, floor(N / 2)); initParticles(); }
  if (key === UP_ARROW) sensorSigma = min(80, sensorSigma + 5);
  if (key === DOWN_ARROW) sensorSigma = max(5, sensorSigma - 5);
  if (key === 'k' || key === 'K') { robot.x = random(60, width - 60); robot.y = random(140, height - 40); robot.th = random(TWO_PI); }
  if (key === ' ') auto = !auto;
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. 粒子 50 個と 5000 個で、誘拐（K）から回復するまでの時間を比べよう
// 2. 誘拐したあと粒子が「戻れない」ことがある（全部が間違った場所に集まる）。粒子を少し画面全体にばらまき続ける（5%）と直るか
// 3. 目印を 2 個にすると？ 1 個だと？（距離だけでは位置が決まらない = 円の上のどこか）
// 4. motionSigma を 0 にすると粒子が「痩せて」1 点に固まり、間違えたとき戻れなくなる。確かめよう
