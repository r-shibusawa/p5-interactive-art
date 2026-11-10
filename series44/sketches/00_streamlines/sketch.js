// ============================================
// 00 流線・流跡線・流脈線
// 流れを「線」で見る 3 つの方法
//   流線   = いまこの瞬間の速度ベクトルをつないだ線（スナップ写真）
//   流跡線 = 1 個の粒子がたどってきた道（長時間露光）
//   流脈線 = 同じ点から次々に出した粒子を、いま結んだ線（煙突のけむり）
// 定常（時間で変わらない流れ）では 3 本は重なる。非定常にするとばらばらになる
// T = 定常／非定常 / 1〜3 = 流れの種類 / クリック = 放出点を置く / R = やり直し
// ============================================

let U0 = 140; // ★ 一様流の速さ [px/秒]
let swing = 0.6; // ★ 非定常のとき、流れの向きがゆれる角度 [rad]
let swingRate = 1.2; // ★ ゆれる速さ [rad/秒]
let strength = 15000; // ★ 渦・湧き出しの強さ（速さ = strength / 距離）
let fieldNo = 1; // 1 = 一様流, 2 = 一様流 + 渦, 3 = 一様流 + 湧き出し
let unsteady = false;

let t = 0, emit, tracer;
let streak = [], path = [], dots = [];
let fieldNames = ['', '一様流', '一様流 + 渦', '一様流 + 湧き出し'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  emit = { x: width * 0.22, y: height * 0.42 };
  for (let i = 0; i < 260; i++) dots.push({ x: Math.random() * width, y: Math.random() * height });
  restart();
}

function restart() {
  streak = []; path = [];
  tracer = { x: emit.x, y: emit.y };
}

// ★ 速度場：場所 (x, y) と時刻 tt を入れると、そこでの流れの速度 [vx, vy] が返る
function velocity(x, y, tt) {
  let th = unsteady ? swing * Math.sin(swingRate * tt) : 0;
  let vx = U0 * Math.cos(th), vy = U0 * Math.sin(th);
  let dx = x - width / 2, dy = y - height / 2, r2 = dx * dx + dy * dy + 900;
  if (fieldNo === 2) { vx += -strength * dy / r2; vy += strength * dx / r2; } // 渦：中心のまわりを回る
  if (fieldNo === 3) { vx += strength * dx / r2; vy += strength * dy / r2; } // 湧き出し：中心から外へ
  return [vx, vy];
}

function draw() {
  background(215, 60, 10);
  let dt = Math.min(deltaTime / 1000, 0.033);
  t += dt;

  // ---- 背景の粒（流れのようすを見るだけ）
  noStroke(); fill(200, 30, 80, 45);
  for (let d of dots) {
    moveBy(d, dt);
    if (!inside(d)) { d.x = Math.random() * width; d.y = Math.random() * height; }
    circle(d.x, d.y, 3);
  }

  // ---- 流線：いまの速度場を少しずつたどる（時間は止めたまま）
  noFill(); stroke(200, 40, 70, 35); strokeWeight(1);
  for (let k = 0; k < 13; k++) polyline(streamline(2, (k + 0.5) * height / 13, 260));
  if (fieldNo > 1) for (let k = 0; k < 8; k++) polyline(streamline(width / 2 + 45 * Math.cos(k * 0.785), height / 2 + 45 * Math.sin(k * 0.785), 200));
  stroke(180, 80, 100); strokeWeight(3);
  polyline(streamline(emit.x, emit.y, 260));

  // ---- 流跡線：1 個の粒子を追いかけ、通った場所を全部おぼえる
  moveBy(tracer, dt);
  path.push([tracer.x, tracer.y]);
  if (!inside(tracer) || path.length > 700) { tracer = { x: emit.x, y: emit.y }; path = []; }
  stroke(42, 80, 100); strokeWeight(3);
  polyline(path);
  noStroke(); fill(42, 80, 100); circle(tracer.x, tracer.y, 12);

  // ---- 流脈線：放出点から毎フレーム粒子を出し、出た順に結ぶ
  streak.push({ x: emit.x, y: emit.y });
  for (let s of streak) moveBy(s, dt);
  streak = streak.filter(inside);
  if (streak.length > 500) streak.shift();
  noFill(); stroke(350, 60, 100); strokeWeight(3);
  polyline(streak.map((s) => [s.x, s.y]));

  // ---- 放出点
  stroke(0, 0, 100); strokeWeight(2); noFill();
  circle(emit.x, emit.y, 18);

  // ---- 文字
  noStroke();
  fill(0, 0, 100); textSize(18);
  text(fieldNames[fieldNo] + '（1〜3）　' + (unsteady ? '非定常：流れの向きが時間でゆれる' : '定常：流れは時間で変わらない') + '（T で切替）　クリック = 放出点　R = やり直し', 20, 40);
  fill(0, 0, 65); textSize(15);
  text(unsteady ? '3 本がばらばら。流線は「いま」だけ、流跡線は 1 粒の「過去」、流脈線は同じ点を通った粒たちの「いま」' : '定常なので 3 本がぴったり重なる。T を押して流れをゆらしてみよう', 20, 68);
  let lx = width - 250, ly = height - 100;
  textSize(16);
  fill(180, 80, 100); text('━ 流線（streamline）', lx, ly);
  fill(42, 80, 100); text('━ 流跡線（pathline）', lx, ly + 26);
  fill(350, 60, 100); text('━ 流脈線（streakline）', lx, ly + 52);
}

function mousePressed() {
  emit.x = constrain(mouseX, 10, width - 10); emit.y = constrain(mouseY, 90, height - 10);
  restart();
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { fieldNo = Number(key); restart(); }
  if (key === 't' || key === 'T') { unsteady = !unsteady; restart(); }
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. 定常のまま 1〜3 を切り替える。3 本が重なったままなのを確かめる
// 2. T で非定常に。流脈線（ピンク）は「旗」のようにうねる。流線（水色）はまっすぐなのに、なぜ？
// 3. swingRate を 3 にする／swing を 1.2 にする。うねりの波長はどう変わる？
// 4. 2 の渦のすぐ近くに放出点を置く。粒子は渦につかまる？ strength を 2 倍にすると？
// 5. velocity() の中に自分の流れを足してみよう（例：vy += 60 * Math.sin(x / 80)）


// ==================================================
// ここから下は「線をたどる道具」です
// ==================================================
// 粒子を dt 秒だけ流す（中点法：半歩先の速度で進めるとずれが小さい）
function moveBy(q, dt) {
  let a = velocity(q.x, q.y, t);
  let b = velocity(q.x + a[0] * dt / 2, q.y + a[1] * dt / 2, t + dt / 2);
  q.x += b[0] * dt; q.y += b[1] * dt;
}
// 流線：(x, y) から、いまの速度の向きへ 8 px ずつ n 回進んだ点の列
function streamline(x, y, n) {
  let pts = [[x, y]];
  for (let k = 0; k < n; k++) {
    let a = velocity(x, y, t), ma = Math.hypot(a[0], a[1]) + 1e-6;
    let b = velocity(x + a[0] / ma * 4, y + a[1] / ma * 4, t), mb = Math.hypot(b[0], b[1]) + 1e-6;
    x += b[0] / mb * 8; y += b[1] / mb * 8;
    if (x < -20 || x > width + 20 || y < -20 || y > height + 20) break;
    pts.push([x, y]);
  }
  return pts;
}
function inside(q) { return q.x > -20 && q.x < width + 20 && q.y > -20 && q.y < height + 20; }
// 点の列を折れ線で描く（2 点より少ないときは何もしない）
function polyline(pts) {
  if (pts.length < 2) return;
  beginShape();
  for (let q of pts) vertex(q[0], q[1]);
  endShape();
}
