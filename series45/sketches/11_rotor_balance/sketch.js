// ============================================
// 11 回転体の不つり合いと危険速度
// 重心が軸の中心からわずかにずれた円板を回すと、遠心力で軸がたわみ、振れ回る
// 回転数が軸の固有振動数に一致するところ（危険速度）で振れが最大。それを超えると重心が回転中心に寄って静かになる（自動調心）
// ↑↓（押し続ける）= 回転数 / スペース = 止めて調整 / 円板をクリック = つり合いおもりを置く / 1〜3 = おもりの重さ / Z = 1 つ戻す / C = 全部外す / N = 新しい不つり合い / H = 重い点を隠す
// ============================================

let zeta = 0.06;              // ★ 減衰比
let naturalHz = 1.2;          // ★ 軸の固有振動数（Hz）。危険速度はこれと同じ回転数
let eccUnit = 14;             // ★ 重さ 1 のおもりを円板のふちに付けたときの重心のずれ（px）
let discR = 105;              // 円板の半径（px）
let heavy = { x: 0, y: 0, w: 1 };   // もともとの不つり合い（重い点）
let weights = [];             // 置いたつり合いおもり { x, y, w }（円板に固定した座標）
let weightSize = 0.5;         // 次に置くおもりの重さ
let speedGoal = 0.5, speedNow = 0;   // 回転数 / 危険速度（目標と現在）
let spin = 0;                 // 回転角
let rs = [0, 0, 0, 0];        // 軸中心の [x, vx, y, vy]
let orbit = [];
let paused = false, hideHeavy = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newUnbalance();
}
function newUnbalance() {
  let a = Math.random() * 2 * Math.PI;
  heavy = { x: discR * 0.8 * Math.cos(a), y: discR * 0.8 * Math.sin(a), w: 1 };
  weights = []; orbit = [];
}

// ★ 重心のずれ e（円板に固定した座標）：すべてのおもりの「重さ × 位置」の合計
function eccentricity() {
  let ex = (heavy.w * heavy.x) / discR, ey = (heavy.w * heavy.y) / discR;
  for (let q of weights) { ex += (q.w * q.x) / discR; ey += (q.w * q.y) / discR; }
  return { x: ex * eccUnit, y: ey * eccUnit };
}

// ★ 運動方程式：x″ + 2ζωn x′ + ωn² x = Ω² (e を回転させたものの x 成分)。y も同じ
function deriv(s, ang, om, e) {
  let wn = 2 * Math.PI * naturalHz;
  let fx = om * om * (e.x * Math.cos(ang) - e.y * Math.sin(ang));
  let fy = om * om * (e.x * Math.sin(ang) + e.y * Math.cos(ang));
  return [s[1], fx - 2 * zeta * wn * s[1] - wn * wn * s[0], s[3], fy - 2 * zeta * wn * s[3] - wn * wn * s[2]];
}
function rk4(dt, om, e) {
  let add = (s, k, h) => s.map((v, i) => v + k[i] * h);
  let k1 = deriv(rs, spin, om, e), k2 = deriv(add(rs, k1, dt / 2), spin + (om * dt) / 2, om, e);
  let k3 = deriv(add(rs, k2, dt / 2), spin + (om * dt) / 2, om, e), k4 = deriv(add(rs, k3, dt), spin + om * dt, om, e);
  rs = rs.map((v, i) => constrain(v + ((k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * dt) / 6, -1e4, 1e4));
  spin += om * dt;
}
// 理論の振れ回り半径：|e| r² / √((1 − r²)² + (2ζr)²)
function whirl(r, eMag) { return (eMag * r * r) / Math.hypot(1 - r * r, 2 * zeta * r); }

function draw() {
  background(212, 45, 13);
  if (keyIsDown(UP_ARROW)) speedGoal += 0.012;
  if (keyIsDown(DOWN_ARROW)) speedGoal -= 0.012;
  speedGoal = constrain(speedGoal, 0, 3);
  let e = eccentricity(), eMag = Math.hypot(e.x, e.y);
  if (!paused) {
    speedNow += constrain(speedGoal - speedNow, -0.004, 0.004);        // 回転数はゆっくり変わる
    let om = speedNow * 2 * Math.PI * naturalHz;
    for (let i = 0; i < 8; i++) rk4(1 / 480, om, e);
    orbit.push([rs[0], rs[2]]);
    if (orbit.length > 240) orbit.shift();
  }

  // ---- 左：軸方向から見た図。O = 軸受の中心、S = 軸の中心、G = 重心
  let ocx = width * 0.27, ocy = height * 0.55;
  let sx = ocx + constrain(rs[0], -170, 170), sy = ocy + constrain(rs[2], -170, 170);
  stroke(0, 0, 40); strokeWeight(1); line(ocx - 220, ocy, ocx + 220, ocy); line(ocx, ocy - 220, ocx, ocy + 220);
  noFill(); stroke(50, 90, 100, 60); strokeWeight(1.5);
  if (orbit.length > 1) { beginShape(); for (let p of orbit) vertex(ocx + constrain(p[0], -170, 170), ocy + constrain(p[1], -170, 170)); endShape(); }
  push();
  translate(sx, sy);
  rotate(spin);
  fill(200, 40, 55, 80); stroke(200, 50, 100); strokeWeight(2);
  circle(0, 0, discR * 2);
  stroke(200, 50, 100, 50); strokeWeight(1);
  for (let k = 0; k < 12; k++) line(discR * 0.9 * Math.cos((k * Math.PI) / 6), discR * 0.9 * Math.sin((k * Math.PI) / 6), discR * Math.cos((k * Math.PI) / 6), discR * Math.sin((k * Math.PI) / 6));
  line(0, 0, discR * 0.9, 0);
  noStroke();
  if (!hideHeavy) { fill(0, 85, 100); circle(heavy.x, heavy.y, 20); }
  fill(140, 70, 100);
  for (let q of weights) circle(q.x, q.y, 10 + q.w * 12);
  fill(50, 90, 100); circle(e.x, e.y, 9);                              // 重心 G
  pop();
  stroke(0, 0, 100, 70); strokeWeight(2); line(ocx, ocy, sx, sy);
  noStroke(); fill(0, 0, 100); circle(ocx, ocy, 8); circle(sx, sy, 10);
  textSize(13); text('O', ocx - 16, ocy - 8); text('S', sx + 8, sy - 8);

  // ---- 右：振れ回り半径と回転数
  let gx = width * 0.56, gw = width - gx - 50, gy = 150, gh = height * 0.4;
  let peakTop = whirl(1, Math.max(eccUnit * 0.8, eMag)) * 1.1;
  let X = (r) => gx + (r / 3) * gw, Y = (v) => gy + gh - (Math.min(v, peakTop) / peakTop) * gh;
  stroke(0, 0, 45); strokeWeight(1); line(gx, gy, gx, gy + gh); line(gx, gy + gh, gx + gw, gy + gh);
  stroke(0, 80, 100, 50); line(X(1), gy, X(1), gy + gh);
  noFill();
  stroke(0, 0, 100, 30); strokeWeight(1.5);
  beginShape(); for (let i = 0; i <= 150; i++) vertex(X(i / 50), Y(whirl(i / 50, eccUnit * 0.8))); endShape();   // 修正前
  stroke(200, 60, 100); strokeWeight(2.5);
  beginShape(); for (let i = 0; i <= 150; i++) vertex(X(i / 50), Y(whirl(i / 50, eMag))); endShape();             // いまの e
  stroke(140, 60, 100, 60); strokeWeight(1); line(gx, Y(eMag), gx + gw, Y(eMag));
  let radNow = Math.hypot(rs[0], rs[2]);
  noStroke(); fill(50, 90, 100); circle(X(speedNow), Y(radNow), 13);
  fill(0, 0, 60); textSize(12);
  for (let r = 0; r <= 3; r += 0.5) text(nf(r, 1, 1), X(r) - 8, gy + gh + 16);
  text('回転数 / 危険速度', gx + gw - 110, gy + gh + 34);
  fill(0, 70, 100); text('危険速度', X(1) + 6, gy + 12);
  fill(140, 50, 100); text('高速では振れ → e（重心が中心に来る）', gx + gw - 250, Y(eMag) - 6);
  fill(200, 50, 100); textSize(14); text('振れ回りの半径 |OS|（灰＝修正前、青＝いま、黄＝実測）', gx, gy - 10);

  // ---- 数値
  let rpmNow = speedNow * naturalHz * 60;
  noStroke(); fill(0, 0, 100); textSize(18);
  text('↑↓：回転数 ' + nf(rpmNow, 1, 0) + ' rpm　スペース：' + (paused ? '再開' : '止めて調整') + '　クリック：おもり（1〜3：重さ ' + weightSize + '）　Z：戻す　C：外す　N：新しい不つり合い　H：' + (hideHeavy ? '表示' : '隠す'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('赤＝重い点、緑＝つり合いおもり、黄＝全体の重心 G。G が円板の中心に来るように、重い点の反対側におもりを置こう', 20, 68);
  let ix = width * 0.56, iy = gy + gh + 80;
  fill(0, 0, 100, 8); rect(ix - 14, iy - 26, gw + 28, 120, 10);
  fill(0, 0, 100); textSize(15);
  text('振れ回り半径 = e r² / √((1 − r²)² + (2ζr)²)、r = 回転数 / 危険速度', ix, iy);
  fill(35, 90, 100);
  text('重心のずれ e = ' + nf(eMag, 1, 2) + ' px（修正前 ' + nf(eccUnit * 0.8, 1, 1) + '）　いまの振れ = ' + nf(radNow, 1, 1) + ' px', ix, iy + 26);
  let grade = eMag < 0.6 ? '合格！ ほぼ完全につり合った' : eMag < 3 ? 'あと少し' : '不つり合いが大きい';
  fill(eMag < 0.6 ? 140 : eMag < 3 ? 50 : 0, 70, 100);
  text('つり合わせの判定：' + grade, ix, iy + 52);
  fill(0, 0, 60); textSize(13);
  text(speedNow < 0.9 ? '低速：重い点が外側を向いて振れ回る' : speedNow < 1.1 ? '危険速度：振れが最大（位相が 90° 遅れる）' : '高速：重い点が内側を向く（自動調心）', ix, iy + 78);
}

function mousePressed() {
  // マウスの位置を円板に固定した座標に直す
  let sx = width * 0.27 + constrain(rs[0], -170, 170), sy = height * 0.55 + constrain(rs[2], -170, 170);
  let dx = mouseX - sx, dy = mouseY - sy;
  if (Math.hypot(dx, dy) > discR || weights.length >= 8) return;
  weights.push({ x: dx * Math.cos(-spin) - dy * Math.sin(-spin), y: dx * Math.sin(-spin) + dy * Math.cos(-spin), w: weightSize });
}

function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === '1') weightSize = 0.25;
  if (key === '2') weightSize = 0.5;
  if (key === '3') weightSize = 1;
  if (key === 'z' || key === 'Z') weights.pop();
  if (key === 'c' || key === 'C') weights = [];
  if (key === 'n' || key === 'N') newUnbalance();
  if (key === 'h' || key === 'H') hideHeavy = !hideHeavy;
}

// ---------- やってみよう ----------
// 1. ↑ を押し続けて危険速度を通過しよう。振れが最大になったあと、高速では逆に小さくなる（洗濯機の脱水と同じ）
// 2. スペースで止め、重い点のちょうど反対側・同じ半径に重さ 1 のおもり（3）を置く。振れはどうなる？
// 3. 重さ 0.5 のおもり 2 個でつり合わせるには、どこに置けばいい？（ベクトルの足し算）
// 4. H で重い点を隠し、N で新しい不つり合いに。低速で「外側に振れる向き」をヒントに重い点を探そう（タイヤのバランス取り）
// 5. zeta を 0.02 にすると危険速度の山は何倍？ 危険速度をすばやく通過すると振れは小さくてすむ。確かめよう
