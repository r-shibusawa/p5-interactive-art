// ============================================
// 02 多リンクの逆運動学 ─ CCD とヤコビアン転置
// リンクが多いと式では解けない。だから「少しずつ近づける」反復法を使う
//   CCD：先端の関節から順に、手先が目標を向くように 1 関節ずつ回す
//   ヤコビアン転置：各関節を少し回したら手先がどう動くか（J）から、目標方向へ全関節を同時に回す
// マウス = 目標 / 1 = CCD / 2 = ヤコビアン転置 / L = 関節の角度制限 / ↑↓ = リンク数 / スペース = 1 回ずつ進める
// ============================================

let n = 5;                  // ★ リンク数（3〜8）
let len = 70;               // ★ 1 本の長さ
let q = [];                 // 各関節の角度（1 つ前のリンクからの相対角）
let method = 1;             // 1 = CCD, 2 = ヤコビアン転置
let limitOn = false;        // 関節制限 ±100°
let maxAngle = Math.PI * 100 / 180;   // 関節制限（ラジアン）
let gain = 0.0012;          // ★ ヤコビアン転置のステップ幅
let itersPerFrame = 1;      // ★ 1 フレームに何回反復するか
let stepMode = false;       // スペースで手動
let iterCount = 0;          // 目標が動いてからの反復回数
let converged = false;
let errHist = [];
let lastTarget = { x: 0, y: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetChain();
}

function resetChain() { q = []; for (let i = 0; i < n; i++) q.push(i === 0 ? 1.2 : -0.3); iterCount = 0; errHist = []; }
function basePos() { return { x: width * 0.4, y: height * 0.65 }; }

// 順運動学：各関節の位置（0 = 台座、n = 手先）
function joints() {
  let b = basePos();
  let pts = [{ x: b.x, y: b.y }];
  let a = 0;
  for (let i = 0; i < n; i++) {
    a += q[i];
    let p = pts[pts.length - 1];
    pts.push({ x: p.x + len * cos(a), y: p.y - len * sin(a) });
  }
  return pts;
}

function clampQ() {
  if (!limitOn) return;
  for (let i = 1; i < n; i++) q[i] = constrain(q[i], -maxAngle, maxAngle);
}

// ★ CCD：手先に近い関節から順に、「関節→手先」が「関節→目標」を向くように回す
function ccdStep(tx, ty) {
  for (let i = n - 1; i >= 0; i--) {
    let pts = joints();
    let j = pts[i], h = pts[n];
    let aH = atan2(-(h.y - j.y), h.x - j.x);
    let aT = atan2(-(ty - j.y), tx - j.x);
    let d = aT - aH;
    q[i] += atan2(sin(d), cos(d));
    clampQ();
  }
}

// ★ ヤコビアン転置：Δq = k · Jᵀ · (目標 − 手先)
//   関節 i を少し回すと手先は「関節 i から手先へのベクトルを 90° 回したもの」の方向に動く
function jacobianStep(tx, ty) {
  let pts = joints();
  let h = pts[n];
  let ex = tx - h.x, ey = -(ty - h.y);      // 誤差（y 上向き）
  for (let i = 0; i < n; i++) {
    let rx = h.x - pts[i].x, ry = -(h.y - pts[i].y);
    let jx = -ry, jy = rx;                  // ∂手先/∂q_i
    q[i] += gain * (jx * ex + jy * ey);
  }
  clampQ();
}

function doIteration(tx, ty) {
  if (method === 1) ccdStep(tx, ty); else jacobianStep(tx, ty);
  iterCount++;
}

function draw() {
  background(215, 35, 12);
  let b = basePos();
  let tx = mouseX, ty = mouseY;
  if (tx === 0 && ty === 0) { tx = b.x + 200; ty = b.y - 150; }
  // 目標が動いたら数え直す
  if (abs(tx - lastTarget.x) > 2 || abs(ty - lastTarget.y) > 2) { iterCount = 0; errHist = []; lastTarget = { x: tx, y: ty }; converged = false; }

  let pts = joints();
  let err = sqrt(sq(pts[n].x - tx) + sq(pts[n].y - ty));
  converged = err < 2;
  if (!stepMode && !converged) for (let k = 0; k < itersPerFrame; k++) doIteration(tx, ty);
  pts = joints();
  err = sqrt(sq(pts[n].x - tx) + sq(pts[n].y - ty));
  if (errHist.length < 300 && (errHist.length === 0 || !converged)) errHist.push(err);

  // 届く範囲
  noFill();
  stroke(45, 80, 100, 30);
  strokeWeight(1);
  circle(b.x, b.y, n * len * 2);

  // 腕
  for (let i = 0; i < n; i++) {
    stroke(map(i, 0, n, 200, 330), 60, 95);
    strokeWeight(12 - i);
    line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  noStroke();
  for (let i = 0; i <= n; i++) {
    fill(i === n ? 45 : 0, i === n ? 90 : 0, 100);
    circle(pts[i].x, pts[i].y, i === n ? 16 : 14);
    if (limitOn && i > 0 && i < n && abs(abs(q[i]) - maxAngle) < 0.01) { fill(0, 90, 100); circle(pts[i].x, pts[i].y, 22); }
  }
  fill(0, 0, 40);
  rect(b.x - 30, b.y, 60, 14, 3);

  // 目標
  noFill();
  stroke(converged ? 120 : 0, 90, 100);
  strokeWeight(2);
  circle(tx, ty, 24);
  line(pts[n].x, pts[n].y, tx, ty);

  // 誤差のグラフ
  let gx = width - 380, gy = height - 60, gw = 340, gh = 140;
  noStroke();
  fill(0, 0, 100, 8);
  rect(gx - 10, gy - gh - 10, gw + 20, gh + 20, 8);
  stroke(170, 70, 100);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < errHist.length; i++) vertex(gx + (i / 300) * gw, gy - constrain(errHist[i] / 300, 0, 1) * gh);
  endShape();
  noStroke();
  fill(0, 0, 60);
  textSize(12);
  text('誤差（px）の推移 ─ 横軸：反復回数 0〜300', gx, gy - gh - 16);

  fill(0, 0, 100);
  textSize(18);
  text('方法：' + (method === 1 ? 'CCD（1）' : 'ヤコビアン転置（2）') + '　リンク ' + n + ' 本（↑↓）　L：関節制限 ' + (limitOn ? 'ON ±100°' : 'off') + '　スペース：1 回ずつ ' + (stepMode ? 'ON' : 'off') + '　反復 ' + iterCount + ' 回　誤差 ' + nf(err, 1, 1) + ' px' + (converged ? '　✓ 収束' : ''), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('CCD は少ない回数で届くが腕がくねる。ヤコビアン転置は全関節が少しずつ動くので自然だが回数が要る。制限で赤い関節 = 限界', 20, 68);
}

function keyPressed() {
  if (key === '1') { method = 1; iterCount = 0; errHist = []; }
  if (key === '2') { method = 2; iterCount = 0; errHist = []; }
  if (key === 'l' || key === 'L') { limitOn = !limitOn; clampQ(); }
  if (key === UP_ARROW) { n = min(8, n + 1); resetChain(); }
  if (key === DOWN_ARROW) { n = max(3, n - 1); resetChain(); }
  if (key === ' ') { stepMode = !stepMode; }
  if (key === RIGHT_ARROW && stepMode) doIteration(mouseX, mouseY);
  if (key === 'r' || key === 'R') resetChain();
}

// ---------- やってみよう ----------
// 1. 同じ目標に対して 1 と 2 で「収束までの回数」と「腕の形」を比べよう（グラフを見る）
// 2. gain を 0.003 にすると速いが震える。0.0003 だと？ 安定と速さのトレードオフ
// 3. L で関節制限をつけると届かない目標が出てくる。どんな場所？
// 4. 腕を 8 本にして、スペース＋→ で 1 回ずつ進め、CCD の「先端から順に」を目で追う
