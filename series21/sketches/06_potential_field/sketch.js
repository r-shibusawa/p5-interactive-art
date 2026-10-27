// ============================================
// 06 ポテンシャル法
// ゴールは「谷」、障害物は「山」。地形の傾き（勾配）にそって転がればゴールに着く
//   引力 = k_att × (ゴール − 位置)　斥力 = η × (1/d − 1/d0) / d²（d0 より近い障害物だけ）
// でも、山に囲まれた「くぼみ」で止まってしまうことがある（局所解）
// クリック = 障害物を置く / G = ゴールをマウスへ / 1 = ランダム配置 / 2 = 罠（局所解） / ↑↓ = 斥力の強さ / R = ロボットを戻す
// ============================================

let obstacles = [];          // {x, y, r}
let goal, robot, start;
let kAtt = 0.004;            // ★ 引力の強さ
let eta = 60000;             // ★ 斥力の強さ
let d0 = 90;                 // ★ 斥力がはたらく距離（障害物の表面から）
let vMax = 2.5;
let trail = [];
let stuck = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  start = { x: 120, y: height / 2 };
  goal = { x: width - 140, y: height / 2 };
  preset(1);
}

function preset(k) {
  obstacles = [];
  if (k === 1) {
    randomSeed(3);
    for (let i = 0; i < 9; i++) obstacles.push({ x: random(width * 0.3, width * 0.75), y: random(130, height - 60), r: random(20, 45) });
  } else {
    // ゴールに向かって口を開けた「コ」の字：引力でくぼみに入って出られない
    let cx = width * 0.55, cy = height / 2;
    for (let i = -5; i <= 5; i++) { obstacles.push({ x: cx, y: cy + i * 34, r: 18 }); }
    for (let i = 0; i <= 5; i++) { obstacles.push({ x: cx - i * 34, y: cy - 5 * 34, r: 18 }); obstacles.push({ x: cx - i * 34, y: cy + 5 * 34, r: 18 }); }
  }
  resetRobot();
}
function resetRobot() { robot = { x: start.x, y: start.y }; trail = []; stuck = false; }

// ★ 位置 (x, y) での力（＝ポテンシャルの勾配の逆向き）
function force(x, y) {
  let fx = kAtt * (goal.x - x), fy = kAtt * (goal.y - y);
  for (let o of obstacles) {
    let dx = x - o.x, dy = y - o.y;
    let dist2 = sqrt(dx * dx + dy * dy);
    let d = max(dist2 - o.r, 2);     // 表面からの距離
    if (d < d0) {
      let m = eta * (1 / d - 1 / d0) / (d * d);
      fx += m * dx / dist2;
      fy += m * dy / dist2;
    }
  }
  return { fx, fy };
}

function draw() {
  background(215, 35, 12);
  // 力の場を矢印で
  let gs = 40;
  for (let gx = gs; gx < width; gx += gs) for (let gy = 110; gy < height; gy += gs) {
    let f = force(gx, gy);
    let m = sqrt(f.fx * f.fx + f.fy * f.fy);
    if (m < 1e-6) continue;
    let l = min(14, m * 6);
    stroke(map(min(m, 3), 0, 3, 200, 0), 70, 100, 45);
    strokeWeight(1);
    line(gx, gy, gx + f.fx / m * l, gy + f.fy / m * l);
    noStroke();
    fill(map(min(m, 3), 0, 3, 200, 0), 70, 100, 60);
    circle(gx + f.fx / m * l, gy + f.fy / m * l, 3);
  }
  // 障害物
  noStroke();
  for (let o of obstacles) {
    fill(0, 70, 60, 25);
    circle(o.x, o.y, (o.r + d0) * 2);
    fill(0, 70, 80);
    circle(o.x, o.y, o.r * 2);
  }
  // ゴール
  fill(120, 80, 100);
  circle(goal.x, goal.y, 24);
  // ロボットを動かす：力の方向へ（速さに上限）
  let f = force(robot.x, robot.y);
  let m = sqrt(f.fx * f.fx + f.fy * f.fy);
  let dGoal = sqrt(sq(goal.x - robot.x) + sq(goal.y - robot.y));
  let v = min(vMax, m);
  if (m > 1e-6 && dGoal > 6) { robot.x += f.fx / m * v; robot.y += f.fy / m * v; }
  robot.x = constrain(robot.x, 10, width - 10); robot.y = constrain(robot.y, 100, height - 10);
  stuck = dGoal > 30 && v < 0.05;
  if (frameCount % 2 === 0) { trail.push({ x: robot.x, y: robot.y }); if (trail.length > 1500) trail.shift(); }
  stroke(45, 90, 100, 80);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let p of trail) vertex(p.x, p.y);
  endShape();
  noStroke();
  fill(170, 60, 95);
  circle(robot.x, robot.y, 22);
  stroke(0, 0, 100);
  strokeWeight(2);
  if (m > 1e-6) line(robot.x, robot.y, robot.x + f.fx / m * 24, robot.y + f.fy / m * 24);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('クリック：障害物　G：ゴールをマウスへ　1：ランダム　2：罠　斥力 η = ' + eta + '（↑↓）　R：戻す　ゴールまで ' + nf(dGoal, 1, 0) + ' px' + (stuck ? '　⚠ 局所解で止まった！' : dGoal <= 6 ? '　✓ 到着' : ''), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('矢印 = その場所で受ける力（青 = 弱い、赤 = 強い）。赤い円の外側のうすい輪 = 斥力が届く範囲 d0。罠（2）では引力と斥力がつり合って動けなくなる', 20, 68);
}

function mousePressed() {
  if (mouseY < 90) return;
  obstacles.push({ x: mouseX, y: mouseY, r: 28 });
}
function keyPressed() {
  if (key === 'g' || key === 'G') { goal = { x: mouseX, y: max(100, mouseY) }; stuck = false; }
  if (key === '1') preset(1);
  if (key === '2') preset(2);
  if (key === UP_ARROW) eta = min(400000, round(eta * 1.5));
  if (key === DOWN_ARROW) eta = max(5000, round(eta / 1.5));
  if (key === 'r' || key === 'R') resetRobot();
  if (key === 'c' || key === 'C') { obstacles = []; resetRobot(); }
}

// ---------- やってみよう ----------
// 1. 罠（2）から脱出する方法を考えよう：ランダムな力を少し足す？ 止まったら壁ぞいに歩く？（09 の bug 法）
// 2. 2 つの障害物の間を通るとき、η が大きいと通れない。「通れる隙間」の最小値を探す
// 3. d0 を 30 にすると障害物のすぐそばまで寄る。200 にすると？
// 4. 複数のゴールを順に目指す（05 の経由点）と組み合わせてみよう
