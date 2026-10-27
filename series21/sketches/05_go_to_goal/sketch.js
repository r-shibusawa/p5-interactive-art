// ============================================
// 05 ゴールへ向かう ─ go-to-goal と pure pursuit
// 「向きたい方向」と「いま向いている方向」の差を、回転速度にフィードバックする
//   1 go-to-goal：ω = Kp × (目標の方角 − θ)。ゴールごとにまっすぐ向かう
//   2 pure pursuit：経路の少し先（lookahead 距離 Ld）の点を追いかける。曲がり角がなめらかになる
// クリック = 経由点を追加 / 1・2 = 方法 / ↑↓ = Kp / ←→ = Ld / C = 経由点を消す / R = ロボットを戻す
// ============================================

let robot;                 // {x, y, th}
let waypoints = [];
let method = 1;
let Kp = 0.08;             // ★ 向きのゲイン
let Ld = 90;               // ★ pure pursuit の先読み距離
let vMax = 3;              // ★ 最大速度
let cur = 0;               // いま目指している経由点の番号
let trail = [];
let lookPt = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetRobot();
  waypoints = [{ x: width * 0.3, y: height * 0.3 }, { x: width * 0.7, y: height * 0.35 }, { x: width * 0.6, y: height * 0.75 }, { x: width * 0.25, y: height * 0.7 }];
}
function resetRobot() { robot = { x: 120, y: height - 120, th: 0 }; cur = 0; trail = []; }

function angDiff(a) { return atan2(sin(a), cos(a)); }

// ★ 1：go-to-goal。目標の方角へ比例制御で向きを合わせる
function goToGoal() {
  if (cur >= waypoints.length) return { v: 0, w: 0 };
  let g = waypoints[cur];
  let dx = g.x - robot.x, dy = g.y - robot.y;
  let d = sqrt(dx * dx + dy * dy);
  if (d < 12) { cur++; return { v: 0, w: 0 }; }
  let e = angDiff(atan2(dy, dx) - robot.th);
  let v = vMax * max(0, cos(e)) * min(1, d / 60);     // 向きがずれている間は遅く、近づいたら減速
  return { v, w: Kp * e };
}

// ★ 2：pure pursuit。経路（経由点をつないだ折れ線）上で、ロボットから Ld 離れた点を追う
function purePursuit() {
  let path = [{ x: robot.x, y: robot.y }].concat(waypoints);
  if (waypoints.length === 0) return { v: 0, w: 0 };
  let last = waypoints[waypoints.length - 1];
  let dEnd = sqrt(sq(last.x - robot.x) + sq(last.y - robot.y));
  if (dEnd < 10) { lookPt = null; return { v: 0, w: 0 }; }
  // 経路の後ろの方から探して、ロボットからの距離が Ld を越える最初の点
  lookPt = last;
  let found = false;
  for (let i = cur; i < waypoints.length && !found; i++) {
    let a = i === 0 ? { x: robot.x, y: robot.y } : waypoints[i - 1], b = waypoints[i];
    for (let u = 0; u <= 1; u += 0.02) {
      let p = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
      if (sqrt(sq(p.x - robot.x) + sq(p.y - robot.y)) >= Ld) { lookPt = p; found = true; break; }
    }
    // この区間を通りすぎたら次の区間へ
    if (!found && i === cur && sqrt(sq(b.x - robot.x) + sq(b.y - robot.y)) < Ld) cur = min(cur + 1, waypoints.length - 1);
  }
  // 曲率 κ = 2 sin α / Ld（α = 先読み点の方角とロボットの向きの差）
  let alpha = angDiff(atan2(lookPt.y - robot.y, lookPt.x - robot.x) - robot.th);
  let kappa = 2 * sin(alpha) / Ld;
  let v = vMax * (dEnd < 60 ? dEnd / 60 : 1);
  return { v, w: v * kappa };
}

function draw() {
  background(215, 35, 12);
  let u = method === 1 ? goToGoal() : purePursuit();
  u.w = constrain(u.w, -0.15, 0.15);
  robot.x += u.v * cos(robot.th);
  robot.y += u.v * sin(robot.th);
  robot.th += u.w;
  if (u.v > 0.01 && frameCount % 2 === 0) { trail.push({ x: robot.x, y: robot.y }); if (trail.length > 2000) trail.shift(); }

  // 経路
  stroke(0, 0, 100, 25);
  strokeWeight(1);
  noFill();
  beginShape();
  for (let p of waypoints) vertex(p.x, p.y);
  endShape();
  for (let i = 0; i < waypoints.length; i++) {
    let p = waypoints[i];
    noStroke();
    fill(i < cur ? 0 : 120, i < cur ? 0 : 80, i < cur ? 40 : 100);
    circle(p.x, p.y, 18);
    fill(0, 0, 10);
    textSize(11);
    textAlign(CENTER, CENTER);
    text(i + 1, p.x, p.y);
    textAlign(LEFT, BASELINE);
  }
  // 軌跡
  stroke(45, 90, 100, 80);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let p of trail) vertex(p.x, p.y);
  endShape();
  // 先読み
  if (method === 2) {
    stroke(320, 60, 100, 50);
    strokeWeight(1);
    circle(robot.x, robot.y, Ld * 2);
    if (lookPt) { fill(320, 60, 100); noStroke(); circle(lookPt.x, lookPt.y, 10); stroke(320, 60, 100, 70); line(robot.x, robot.y, lookPt.x, lookPt.y); }
  }
  // ロボット
  push();
  translate(robot.x, robot.y);
  rotate(robot.th);
  noStroke();
  fill(170, 60, 95);
  rect(-20, -15, 40, 30, 6);
  fill(0, 0, 100);
  triangle(20, 0, 8, -8, 8, 8);
  pop();

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('方法：' + (method === 1 ? 'go-to-goal（1）' : 'pure pursuit（2）') + '　Kp = ' + nf(Kp, 1, 2) + '（↑↓）　Ld = ' + Ld + '（←→）　経由点 ' + waypoints.length + '（クリックで追加、C で消す）　R：戻す　v = ' + nf(u.v, 1, 1) + '  ω = ' + nf(u.w, 1, 3), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('1 は角でいったん止まって向きを変える。2 は先読み点を追うので角を丸く曲がる。Ld が大きいほど角を大きくショートカットする', 20, 68);
}

function mousePressed() {
  if (mouseY < 90) return;
  waypoints.push({ x: mouseX, y: mouseY });
}
function keyPressed() {
  if (key === '1') { method = 1; cur = min(cur, waypoints.length); }
  if (key === '2') { method = 2; cur = min(cur, max(0, waypoints.length - 1)); }
  if (key === UP_ARROW) Kp = min(0.5, Kp * 1.3);
  if (key === DOWN_ARROW) Kp = max(0.01, Kp / 1.3);
  if (key === RIGHT_ARROW) Ld = min(300, Ld + 15);
  if (key === LEFT_ARROW) Ld = max(20, Ld - 15);
  if (key === 'c' || key === 'C') { waypoints = []; cur = 0; lookPt = null; }
  if (key === 'r' || key === 'R') resetRobot();
}

// ---------- やってみよう ----------
// 1. Kp を大きくすると向きを合わせるのは速いが、ふらつく（振動）。ちょうどいい値を探そう
// 2. Ld を 20 と 300 で比べる。小さいとジグザグ、大きいと角をショートカット
// 3. 経由点を「く」の字に置いて、1 と 2 の軌跡の形を比べよう
// 4. vMax を上げると曲がりきれなくなる。ω の上限（constrain）を変えるとどうなる？
