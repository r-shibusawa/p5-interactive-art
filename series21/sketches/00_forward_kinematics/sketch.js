// ============================================
// 00 2 リンクアームの順運動学（FK）
// 関節の角度 (q1, q2) を決めると、手先の位置 (x, y) は三角関数で決まる
//   x = L1 cos q1 + L2 cos(q1 + q2),  y = L1 sin q1 + L2 sin(q1 + q2)
// ←→ = 第 1 関節 q1 / ↑↓ = 第 2 関節 q2 / W = 届く範囲（作業空間）を表示 / T = 手先の軌跡を消す / R = リセット
// ============================================

let L1 = 180, L2 = 140;   // ★ リンクの長さ（px）
let q1 = 0.6, q2 = 0.9;   // 関節角（ラジアン）
let turnSpeed = 0.025;    // ★ キーを押したときの回る速さ
let trail = [];           // 手先の軌跡
let showWorkspace = false;
let wsLayer;              // 作業空間を描いておく層（毎フレーム計算しない）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  wsLayer = createGraphics(width, height);
  drawWorkspace();
}

// 台座の位置（画面の下のほう、少し左）
function basePos() { return { x: width * 0.38, y: height * 0.62 }; }

// ★ 順運動学：角度 → 各関節と手先の位置（画面は y が下向きなので sin にマイナス）
function forward(a1, a2) {
  let b = basePos();
  let ex = b.x + L1 * cos(a1), ey = b.y - L1 * sin(a1);                     // ひじ
  let hx = ex + L2 * cos(a1 + a2), hy = ey - L2 * sin(a1 + a2);             // 手先
  return { b, elbow: { x: ex, y: ey }, hand: { x: hx, y: hy } };
}

// 作業空間：q1, q2 をすべて試して手先の点を打つ（ドーナツ形になる）
function drawWorkspace() {
  wsLayer.clear();
  wsLayer.colorMode(HSB, 360, 100, 100, 100);
  wsLayer.noStroke();
  wsLayer.fill(45, 80, 100, 18);
  for (let a1 = 0; a1 < TWO_PI; a1 += 0.05) {
    for (let a2 = 0; a2 < TWO_PI; a2 += 0.05) {
      let p = forward(a1, a2).hand;
      wsLayer.circle(p.x, p.y, 3);
    }
  }
}

function draw() {
  background(215, 35, 12);
  // キーを押している間、角度が変わる
  if (keyIsDown(LEFT_ARROW)) q1 += turnSpeed;
  if (keyIsDown(RIGHT_ARROW)) q1 -= turnSpeed;
  if (keyIsDown(UP_ARROW)) q2 += turnSpeed;
  if (keyIsDown(DOWN_ARROW)) q2 -= turnSpeed;

  let fk = forward(q1, q2);
  trail.push({ x: fk.hand.x, y: fk.hand.y });
  if (trail.length > 600) trail.shift();

  if (showWorkspace) image(wsLayer, 0, 0);

  // 軌跡
  noFill();
  stroke(170, 70, 100, 60);
  strokeWeight(2);
  beginShape();
  for (let p of trail) vertex(p.x, p.y);
  endShape();

  // 台座
  noStroke();
  fill(0, 0, 40);
  rect(fk.b.x - 30, fk.b.y, 60, 14, 3);
  // リンク 1
  stroke(200, 60, 95);
  strokeWeight(14);
  line(fk.b.x, fk.b.y, fk.elbow.x, fk.elbow.y);
  // リンク 2
  stroke(320, 60, 95);
  line(fk.elbow.x, fk.elbow.y, fk.hand.x, fk.hand.y);
  // 関節
  noStroke();
  fill(0, 0, 100);
  circle(fk.b.x, fk.b.y, 22);
  circle(fk.elbow.x, fk.elbow.y, 18);
  fill(45, 90, 100);
  circle(fk.hand.x, fk.hand.y, 16);

  // 角度の弧
  noFill();
  stroke(200, 60, 95, 70);
  strokeWeight(2);
  arc(fk.b.x, fk.b.y, 70, 70, -q1, 0);
  stroke(320, 60, 95, 70);
  arc(fk.elbow.x, fk.elbow.y, 60, 60, -(q1 + q2), -q1);
  stroke(0, 0, 50, 50);
  line(fk.b.x, fk.b.y, fk.b.x + 60, fk.b.y);
  line(fk.elbow.x, fk.elbow.y, fk.elbow.x + 50 * cos(q1), fk.elbow.y - 50 * sin(q1));

  // 数値（台座を原点、y は上向き）
  let X = fk.hand.x - fk.b.x, Y = fk.b.y - fk.hand.y;
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('q1 = ' + nf(degrees(q1) % 360, 1, 0) + '°（←→）　q2 = ' + nf(degrees(q2) % 360, 1, 0) + '°（↑↓）　W：届く範囲 ' + (showWorkspace ? 'ON' : 'off') + '　T：軌跡を消す　R：リセット', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('角度を決めれば手先の位置は一通りに決まる（順運動学）。逆に「手先をここへ」から角度を求めるのが 01 の逆運動学', 20, 68);

  // 式のパネル
  let px = width - 440, py = 110;
  fill(0, 0, 100, 8);
  rect(px - 16, py - 30, 430, 150, 10);
  fill(0, 0, 100);
  textSize(16);
  text('x = L1 cos q1 + L2 cos(q1 + q2)', px, py);
  text('y = L1 sin q1 + L2 sin(q1 + q2)', px, py + 26);
  fill(45, 90, 100);
  text('x = ' + L1 + '·' + nf(cos(q1), 1, 2) + ' + ' + L2 + '·' + nf(cos(q1 + q2), 1, 2) + ' = ' + nf(X, 1, 0), px, py + 62);
  text('y = ' + L1 + '·' + nf(sin(q1), 1, 2) + ' + ' + L2 + '·' + nf(sin(q1 + q2), 1, 2) + ' = ' + nf(Y, 1, 0), px, py + 88);
  fill(0, 0, 60);
  textSize(13);
  text('届く範囲：半径 ' + abs(L1 - L2) + ' 〜 ' + (L1 + L2) + ' のドーナツ', px, py + 112);
}

function keyPressed() {
  if (key === 'w' || key === 'W') showWorkspace = !showWorkspace;
  if (key === 't' || key === 'T') trail = [];
  if (key === 'r' || key === 'R') { q1 = 0.6; q2 = 0.9; trail = []; }
}

// ---------- やってみよう ----------
// 1. q2 = 0 のときと q2 = 180° のとき、手先はどこ？ 届く範囲の外側と内側の円の半径を確かめよう
// 2. L1 = L2 にすると内側の穴が消える。L1 と L2 を変えて W で作業空間を見比べよう
// 3. q1 だけ回すと手先は円を描く。q1 と q2 を同時に回すと？（軌跡を観察）
// 4. 3 本目のリンク L3 と q3 を足して、式を 3 項にしてみよう
