// ============================================
// 09 距離センサーと障害物回避
// ロボットは地図を持っていない。前方に扇形に飛ばした光線（LiDAR）の「距離」だけで動く
//   1 ブライテンベルク：左が近いと右へ、右が近いと左へ。反射だけで壁を避ける虫のような動き
//   2 ゴールへ：ゴールの方へ向かいつつ、前が詰まったら空いている側へ（bug 法のアイデア）
// クリック = 障害物を置く / G = ゴールをマウスへ / 1・2 = 行動 / ↑↓ = センサーのノイズ / R = ロボットを戻す / C = 障害物を消す
// ============================================

let robot;                      // {x, y, th}
let obstacles = [];             // {x, y, r}
let goal;
let nRays = 15;                 // ★ 光線の本数
let fov = Math.PI;              // ★ 視野角（180°）
let maxRange = 220;             // ★ 測れる最大距離
let noiseSigma = 4;             // ★ 距離のノイズ（px）
let ranges = [];
let mode = 2;
let vMax = 2.2;
let trail = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomSeed(11);
  for (let i = 0; i < 12; i++) obstacles.push({ x: random(200, width - 200), y: random(150, height - 60), r: random(18, 50) });
  goal = { x: width - 100, y: height - 100 };
  resetRobot();
}
function resetRobot() { robot = { x: 100, y: 140, th: 0.5 }; trail = []; }

// ★ 1 本の光線：角度 a で飛ばし、最初にぶつかる障害物（円）か画面の端までの距離
function castRay(x, y, a) {
  let dx = cos(a), dy = sin(a);
  let best = maxRange;
  for (let o of obstacles) {
    // 円との交点（二次方程式）
    let fx = x - o.x, fy = y - o.y;
    let b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - o.r * o.r;
    let disc = b * b - 4 * c;
    if (disc < 0) continue;
    let t = (-b - sqrt(disc)) / 2;
    if (t > 0 && t < best) best = t;
  }
  // 画面の端（壁）
  for (let t of [dx > 0 ? (width - x) / dx : dx < 0 ? -x / dx : Infinity, dy > 0 ? (height - y) / dy : dy < 0 ? (100 - y) / dy : Infinity]) if (t > 0 && t < best) best = t;
  return best;
}

function sense() {
  ranges = [];
  for (let i = 0; i < nRays; i++) {
    let a = robot.th - fov / 2 + fov * i / (nRays - 1);
    let d = castRay(robot.x, robot.y, a) + randomGaussian() * noiseSigma;
    ranges.push(constrain(d, 1, maxRange));
  }
}

// ★ 行動 1：ブライテンベルク。近い光線ほど強く反対側へ押す
function braitenberg() {
  let turn = 0;
  for (let i = 0; i < nRays; i++) {
    let side = (i - (nRays - 1) / 2) / ((nRays - 1) / 2);     // −1（左）〜 +1（右）
    let closeness = 1 - ranges[i] / maxRange;
    turn -= side * closeness * closeness * 0.25;                // 右が近い → 左へ（マイナス）
  }
  let front = ranges[floor(nRays / 2)];
  if (front < 50 && abs(turn) < 0.02) turn = 0.1;             // 真正面に壁 → とりあえず右へ
  return { v: vMax * min(1, front / 120), w: turn };
}

// ★ 行動 2：ゴールへ向かう＋避ける。ゴール方向に一番近い「空いている光線」を選ぶ
function goToGoal() {
  let dGoal = sqrt(sq(goal.x - robot.x) + sq(goal.y - robot.y));
  if (dGoal < 15) return { v: 0, w: 0 };
  let aGoal = atan2(goal.y - robot.y, goal.x - robot.x);
  let bestI = -1, bestScore = Infinity;
  for (let i = 0; i < nRays; i++) {
    let a = robot.th - fov / 2 + fov * i / (nRays - 1);
    let clear = ranges[i] > 70;                                 // ★ 70 px 以上空いていれば通れる
    if (!clear) continue;
    let diff = abs(atan2(sin(a - aGoal), cos(a - aGoal)));
    if (diff < bestScore) { bestScore = diff; bestI = i; }
  }
  if (bestI < 0) return { v: 0.3, w: 0.08 };                   // 全部ふさがっている → ゆっくり回る
  let aBest = robot.th - fov / 2 + fov * bestI / (nRays - 1);
  let e = atan2(sin(aBest - robot.th), cos(aBest - robot.th));
  let front = ranges[floor(nRays / 2)];
  return { v: vMax * min(1, front / 100) * min(1, dGoal / 50), w: 0.12 * e };
}

function draw() {
  background(215, 35, 12);
  sense();
  let u = mode === 1 ? braitenberg() : goToGoal();
  u.w = constrain(u.w, -0.15, 0.15);
  robot.th += u.w;
  robot.x += u.v * cos(robot.th);
  robot.y += u.v * sin(robot.th);
  robot.x = constrain(robot.x, 12, width - 12); robot.y = constrain(robot.y, 112, height - 12);
  if (frameCount % 2 === 0) { trail.push({ x: robot.x, y: robot.y }); if (trail.length > 1500) trail.shift(); }

  noStroke();
  fill(0, 60, 70);
  for (let o of obstacles) circle(o.x, o.y, o.r * 2);
  if (mode === 2) { fill(120, 80, 100); circle(goal.x, goal.y, 22); }
  stroke(45, 90, 100, 60);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let p of trail) vertex(p.x, p.y);
  endShape();
  // 光線
  for (let i = 0; i < nRays; i++) {
    let a = robot.th - fov / 2 + fov * i / (nRays - 1);
    let d = ranges[i];
    stroke(map(d, 0, maxRange, 0, 170), 80, 100, 60);
    strokeWeight(1);
    line(robot.x, robot.y, robot.x + cos(a) * d, robot.y + sin(a) * d);
    noStroke();
    fill(map(d, 0, maxRange, 0, 170), 80, 100);
    circle(robot.x + cos(a) * d, robot.y + sin(a) * d, 5);
  }
  push();
  translate(robot.x, robot.y);
  rotate(robot.th);
  noStroke();
  fill(170, 60, 95);
  rect(-16, -12, 32, 24, 5);
  fill(0, 0, 100);
  triangle(16, 0, 6, -7, 6, 7);
  pop();

  // 距離の棒グラフ（センサーから見た世界）
  let gx = width - 330, gy = 100, bw = 300 / nRays;
  noStroke();
  fill(0, 0, 100, 8);
  rect(gx - 10, gy, 320, 110, 8);
  for (let i = 0; i < nRays; i++) {
    let h = ranges[i] / maxRange * 90;
    fill(map(ranges[i], 0, maxRange, 0, 170), 80, 100);
    rect(gx + i * bw, gy + 100 - h, bw - 2, h);
  }
  fill(0, 0, 60);
  textSize(12);
  text('← 左　　　センサーの距離（' + nRays + ' 本）　　　右 →', gx, gy + 122);

  fill(0, 0, 100);
  textSize(18);
  text('行動：' + (mode === 1 ? 'ブライテンベルク（1）' : 'ゴールへ（2）') + '　ノイズ σ = ' + noiseSigma + ' px（↑↓）　クリック：障害物　G：ゴール　R：戻す　C：消す　v = ' + nf(u.v, 1, 1), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('光線の色：赤 = 近い、水色 = 遠い。地図なし・記憶なしでも、距離→速度の単純な対応づけで避けられる。ただし行き止まり（コの字）では困る', 20, 68);
}

function mousePressed() { if (mouseY > 90) obstacles.push({ x: mouseX, y: mouseY, r: 30 }); }
function keyPressed() {
  if (key === '1') mode = 1;
  if (key === '2') mode = 2;
  if (key === 'g' || key === 'G') goal = { x: mouseX, y: max(110, mouseY) };
  if (key === UP_ARROW) noiseSigma = min(60, noiseSigma + 4);
  if (key === DOWN_ARROW) noiseSigma = max(0, noiseSigma - 4);
  if (key === 'r' || key === 'R') resetRobot();
  if (key === 'c' || key === 'C') obstacles = [];
}

// ---------- やってみよう ----------
// 1. ノイズを 40 にすると急にふらつく。平均をとる（直前の値となめらかにする）と安定するか試そう
// 2. nRays を 3 にしても避けられる？ 1 本では？（本物の安いロボットは 3〜5 個の超音波センサー）
// 3. 障害物で「コ」の字をつくってゴールをその奥に置く。2 はどうなる？（06 の局所解と同じ問題）
// 4. 行動 1 の「近いほど強く反対へ」の符号を逆にすると「光に寄る虫」になる。やってみよう
