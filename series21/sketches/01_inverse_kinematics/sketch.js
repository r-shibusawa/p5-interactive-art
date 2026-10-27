// ============================================
// 01 逆運動学（IK）─ 解析解
// 「手先をここへ」から関節の角度を逆算する。2 リンクなら余弦定理で式が解ける
//   cos q2 = (x² + y² − L1² − L2²) / (2 L1 L2)   → q2 には ±（ひじ上・ひじ下）の 2 つの解
// クリック／ドラッグ = 目標 / E = ひじ上・ひじ下を切りかえ / 1〜3 = リンクの長さ / A = 自動で目標を動かす
// ============================================

let L1 = 180, L2 = 140;      // ★ リンクの長さ（px）
let target = null;           // 目標（画面座標）
let elbowUp = true;          // ひじの向き
let q1 = 0.6, q2 = 0.9;      // いまの関節角（なめらかに目標の解へ近づける）
let smooth = 0.15;           // ★ 1 フレームで近づく割合（1 で瞬間移動）
let auto = false;
let reachable = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  target = { x: width * 0.6, y: height * 0.35 };
}

function basePos() { return { x: width * 0.4, y: height * 0.6 }; }

// ★ 逆運動学：目標 (tx, ty) → [q1, q2]（届かないときは届く方向へ伸ばした解を返す）
function inverse(tx, ty, up) {
  let b = basePos();
  let x = tx - b.x, y = b.y - ty;      // 台座を原点、y 上向き
  let r = sqrt(x * x + y * y);
  let rMin = abs(L1 - L2) + 0.001, rMax = L1 + L2 - 0.001;
  let ok = r >= rMin && r <= rMax;
  let rr = constrain(r, rMin, rMax);  // 範囲外なら一番近い半径に丸める
  let c2 = (rr * rr - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  c2 = constrain(c2, -1, 1);
  let a2 = acos(c2) * (up ? 1 : -1);
  // q1 = atan2(y, x) − atan2(L2 sin q2, L1 + L2 cos q2)
  let a1 = atan2(y, x) - atan2(L2 * sin(a2), L1 + L2 * cos(a2));
  return { a1, a2, ok };
}

function forward(a1, a2) {
  let b = basePos();
  let e = { x: b.x + L1 * cos(a1), y: b.y - L1 * sin(a1) };
  let h = { x: e.x + L2 * cos(a1 + a2), y: e.y - L2 * sin(a1 + a2) };
  return { b, e, h };
}

// 角度の差を −π〜π に折り返して少しずつ近づける
function approach(cur, goal) {
  let d = goal - cur;
  d = atan2(sin(d), cos(d));
  return cur + d * smooth;
}

function drawArm(a1, a2, alpha) {
  let fk = forward(a1, a2);
  stroke(200, 60, 95, alpha);
  strokeWeight(14);
  line(fk.b.x, fk.b.y, fk.e.x, fk.e.y);
  stroke(320, 60, 95, alpha);
  line(fk.e.x, fk.e.y, fk.h.x, fk.h.y);
  noStroke();
  fill(0, 0, 100, alpha);
  circle(fk.b.x, fk.b.y, 22);
  circle(fk.e.x, fk.e.y, 18);
  fill(45, 90, 100, alpha);
  circle(fk.h.x, fk.h.y, 16);
}

function draw() {
  background(215, 35, 12);
  let b = basePos();
  if (auto) {
    let t = frameCount * 0.02;
    target = { x: b.x + 240 * cos(t) + 60 * cos(3 * t), y: b.y - 150 - 120 * sin(2 * t) };
  }
  if (mouseIsPressed && !auto) target = { x: mouseX, y: mouseY };

  // 届く範囲（ドーナツ）
  noStroke();
  fill(45, 80, 100, 10);
  circle(b.x, b.y, (L1 + L2) * 2);
  fill(215, 35, 12);
  circle(b.x, b.y, abs(L1 - L2) * 2);
  noFill();
  stroke(45, 80, 100, 40);
  strokeWeight(1);
  circle(b.x, b.y, (L1 + L2) * 2);
  circle(b.x, b.y, abs(L1 - L2) * 2);

  // 解を求める（両方の解を薄く、選んだほうへなめらかに動く）
  let sol = inverse(target.x, target.y, elbowUp);
  let other = inverse(target.x, target.y, !elbowUp);
  reachable = sol.ok;
  q1 = approach(q1, sol.a1);
  q2 = approach(q2, sol.a2);

  drawArm(other.a1, other.a2, 18);   // もう 1 つの解（ゴースト）
  drawArm(q1, q2, 100);

  // 目標
  noFill();
  stroke(reachable ? 120 : 0, 90, 100);
  strokeWeight(2);
  circle(target.x, target.y, 26);
  line(target.x - 18, target.y, target.x + 18, target.y);
  line(target.x, target.y - 18, target.x, target.y + 18);

  // 台座
  noStroke();
  fill(0, 0, 40);
  rect(b.x - 30, b.y, 60, 14, 3);

  fill(0, 0, 100);
  textSize(18);
  text('クリック／ドラッグ＝目標　E：ひじ' + (elbowUp ? '上' : '下') + '　1〜3：リンクの長さ　A：自動 ' + (auto ? 'ON' : 'off') + '　' + (reachable ? '届く' : '届かない（いちばん近い所へ）'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('q2 = ±acos((x² + y² − L1² − L2²) / 2 L1 L2)　q1 = atan2(y, x) − atan2(L2 sin q2, L1 + L2 cos q2)　薄い腕 = もう 1 つの解', 20, 68);

  let px = width - 360, py = 110;
  fill(0, 0, 100, 8);
  rect(px - 16, py - 30, 350, 120, 10);
  fill(45, 90, 100);
  textSize(16);
  let X = target.x - b.x, Y = b.y - target.y;
  text('目標 (x, y) = (' + nf(X, 1, 0) + ', ' + nf(Y, 1, 0) + ')　r = ' + nf(sqrt(X * X + Y * Y), 1, 0), px, py);
  text('q1 = ' + nf(degrees(sol.a1), 1, 1) + '°　q2 = ' + nf(degrees(sol.a2), 1, 1) + '°', px, py + 28);
  fill(0, 0, 60);
  textSize(13);
  text('届く半径：' + abs(L1 - L2) + ' 〜 ' + (L1 + L2), px, py + 56);
  text(reachable ? '2 つの解のどちらも正解。選ぶのは設計者' : '届かない：|D| > 1 で acos が定義できない', px, py + 76);
}

function keyPressed() {
  if (key === 'e' || key === 'E') elbowUp = !elbowUp;
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === '1') { L1 = 180; L2 = 140; }
  if (key === '2') { L1 = 160; L2 = 160; }
  if (key === '3') { L1 = 220; L2 = 90; }
}

// ---------- やってみよう ----------
// 1. 目標を台座のすぐそばに置くと？（内側の穴）遠くに置くと？（外側）
// 2. E でひじを切りかえ、腕が「バタン」と裏返るのを見る。ロボットが実際にやると危ないのはなぜ？
// 3. smooth を 1 にすると瞬間移動。0.03 にするとゆっくり。本物のモーターはどちらに近い？
// 4. 腕が届く範囲の境界ぎりぎりで目標を動かすと、q1 が急に変わる所がある（特異点）。探してみよう
