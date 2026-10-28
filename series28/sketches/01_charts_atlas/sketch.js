// ============================================
// 01 地図帳（チャートとアトラス）
// 球面全体を 1 枚の平らな地図で表すことはできない。でも 2 枚あれば足りる（地図帳 = アトラス）
//   北極から投影した地図（北極が無限遠に飛ぶ）と、南極から投影した地図。重なる所は w → w / |w|² で行き来できる
// 地図や球をクリック = 点 P を動かす / ←→ ↑↓ = P を動かす / ドラッグ（球）= 回す / M = 右の地図をメルカトルに / A = 自動 / C = 小さな円
// ============================================

let lat = 0.5, lon = 0.6;      // 点 P（緯度・経度、ラジアン）
let yaw = 0.4, tilt = 0.45;    // 球の見る向き
let mercator = false, auto = false, showCircle = true;
let circR = 0.18;              // ★ P のまわりの小さな円（球の上の角度）
let chartScale = 0.22;         // ★ 地図の拡大率（パネルの幅に対する 1 の長さ）
let panels = [];
let dragStart = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

// 緯度経度 → 球面の点（z が北）
function sph(la, lo) { return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]; }
// ★ 2 枚のチャート（立体射影）
function chartN(p) { return [p[0] / (1 - p[2]), p[1] / (1 - p[2])]; }   // 北極から：北極は ∞ へ
function chartS(p) { return [p[0] / (1 + p[2]), p[1] / (1 + p[2])]; }   // 南極から：南極は ∞ へ
function invN(w) { let d = 1 + w[0] * w[0] + w[1] * w[1]; return [(2 * w[0]) / d, (2 * w[1]) / d, (d - 2) / d]; }
function invS(w) { let d = 1 + w[0] * w[0] + w[1] * w[1]; return [(2 * w[0]) / d, (2 * w[1]) / d, (2 - d) / d]; }
function merc(p) { let la = Math.asin(constrain(p[2], -1, 1)), lo = Math.atan2(p[1], p[0]); return [lo, Math.log(Math.tan(PI / 4 + constrain(la, -1.4, 1.4) / 2))]; }

function draw() {
  background(16, 20, 30);
  if (auto) { lat = 1.45 * Math.sin(frameCount * 0.008); lon += 0.004; }
  if (keyIsDown(LEFT_ARROW)) lon -= 0.02;
  if (keyIsDown(RIGHT_ARROW)) lon += 0.02;
  if (keyIsDown(UP_ARROW)) lat = min(lat + 0.02, HALF_PI - 0.001);
  if (keyIsDown(DOWN_ARROW)) lat = max(lat - 0.02, -HALF_PI + 0.001);
  let P = sph(lat, lon);

  let pw = width / 3, top = 120, ph = height - top - 150;
  panels = [
    { x: 0, w: pw, kind: 'globe' },
    { x: pw, w: pw, kind: 'N', f: chartN, inv: invN },
    { x: 2 * pw, w: pw, kind: mercator ? 'M' : 'S', f: mercator ? merc : chartS, inv: invS },
  ];
  for (let pn of panels) {
    pn.cx = pn.x + pn.w / 2; pn.cy = top + ph / 2; pn.k = pn.kind === 'M' ? pn.w * 0.15 : pn.w * chartScale;
    noFill(); stroke(255, 40); rect(pn.x + 10, top - 10, pn.w - 20, ph + 20, 8);
    if (pn.kind === 'globe') drawGlobe(pn, P); else drawChart(pn, P, top, ph);
  }

  // 文字
  noStroke(); fill(255); textSize(18);
  text('クリック：点 P を置く　←→ ↑↓：P を動かす　球をドラッグ：回す　M：メルカトル ' + (mercator ? 'ON' : 'off') + '　A：自動 ' + (auto ? 'ON' : 'off') + '　C：小さな円', 20, 40);
  fill(170); textSize(15);
  text('1 枚の地図では球のどこか 1 点（投影の中心）が必ず抜ける。2 枚のチャートを重ねて地図帳にすれば球全体を覆える', 20, 68);
  textSize(16);
  fill(255, 210, 90); text('球', panels[0].x + 24, top + 16);
  fill(120, 200, 255); text('チャート φN（北極から投影）', panels[1].x + 24, top + 16);
  fill(255, 140, 200); text(mercator ? 'メルカトル図法（緯度 ±80° まで）' : 'チャート φS（南極から投影）', panels[2].x + 24, top + 16);
  let wN = chartN(P), wS = chartS(P), r2 = wN[0] * wN[0] + wN[1] * wN[1];
  let by = height - 110;
  fill(255); textSize(16);
  text('P = 緯度 ' + nf(degrees(lat), 1, 1) + '°　経度 ' + nf(((degrees(lon) % 360) + 540) % 360 - 180, 1, 1) + '°', 30, by);
  text('φN(P) = (' + fmt(wN[0]) + ', ' + fmt(wN[1]) + ')　　φS(P) = (' + fmt(wS[0]) + ', ' + fmt(wS[1]) + ')', 30, by + 28);
  fill(255, 210, 90);
  text('座標変換（移り変わりの写像）φS ∘ φN⁻¹ (w) = w / |w|² = (' + fmt(wN[0] / r2) + ', ' + fmt(wN[1] / r2) + ')　← φS(P) と同じ！', 30, by + 56);
  fill(170); textSize(14);
  text('北極に近づくと φN の値は無限大へ（左の地図からはみ出す）。そのときは φS を使えばよい。2 つの地図が両方使えるのは北極と南極以外', 30, by + 82);
}
function fmt(v) { return Math.abs(v) > 999 ? (v > 0 ? '∞' : '−∞') : nf(v, 1, 2); }

// 球（正射影で描く）
function view(p, pn) {
  let c = Math.cos(yaw), s = Math.sin(yaw);
  let x1 = c * p[0] + s * p[1], y1 = -s * p[0] + c * p[1], z1 = p[2];
  let up = y1 * Math.sin(tilt) + z1 * Math.cos(tilt), depth = -y1 * Math.cos(tilt) + z1 * Math.sin(tilt);
  let R = min(pn.w * 0.4, height * 0.28);
  return { x: pn.cx + x1 * R, y: pn.cy - up * R, front: depth > 0, R };
}
function drawGlobe(pn, P) {
  let R = view(P, pn).R;
  noStroke(); fill(30, 50, 80); circle(pn.cx, pn.cy, 2 * R);
  strokeWeight(1);
  for (let la = -75; la <= 75; la += 15) curveOnGlobe(pn, (t) => sph(radians(la), t * TWO_PI), la === 0 ? 160 : 70);
  for (let lo = 0; lo < 360; lo += 30) curveOnGlobe(pn, (t) => sph((t - 0.5) * PI, radians(lo)), 70);
  // 2 つの投影の中心
  for (let [p, c] of [[[0, 0, 1], [120, 200, 255]], [[0, 0, -1], [255, 140, 200]]]) {
    let q = view(p, pn); if (q.front) { noStroke(); fill(...c); circle(q.x, q.y, 12); }
  }
  if (showCircle) { stroke(120, 255, 160); strokeWeight(2); curveOnGlobe(pn, (t) => smallCircle(P, t), 255, true); }
  let q = view(P, pn);
  noStroke(); fill(255, 210, 90, q.front ? 255 : 80); circle(q.x, q.y, 16);
}
function curveOnGlobe(pn, f, a, keepStroke) {
  if (!keepStroke) stroke(200, 220, 255, a);
  noFill(); let prev = null;
  for (let i = 0; i <= 96; i++) {
    let q = view(f(i / 96), pn);
    if (prev && q.front && prev.front) line(prev.x, prev.y, q.x, q.y);
    prev = q;
  }
}
// P を中心とする角度 circR の小さな円の点（t = 0〜1）
function smallCircle(P, t) {
  let e1 = vunit(vcross([0, 0, 1], P)); if (!isFinite(e1[0]) || vlen(vcross([0, 0, 1], P)) < 1e-6) e1 = [1, 0, 0];
  let e2 = vcross(P, e1), a = t * TWO_PI;
  return vadd(vmul(P, Math.cos(circR)), vmul(vadd(vmul(e1, Math.cos(a)), vmul(e2, Math.sin(a))), Math.sin(circR)));
}

// チャート（平面の地図）
function drawChart(pn, P, top, ph) {
  push();
  drawingContext.save();
  drawingContext.beginPath(); drawingContext.rect(pn.x + 10, top - 10, pn.w - 20, ph + 20); drawingContext.clip();
  if (pn.kind !== 'M') { noStroke(); fill(30, 50, 80); circle(pn.cx, pn.cy, 2 * pn.k); }   // 単位円 = 赤道
  strokeWeight(1);
  for (let la = -75; la <= 75; la += 15) curveOnChart(pn, (t) => sph(radians(la), t * TWO_PI), la === 0 ? 170 : 70);
  for (let lo = 0; lo < 360; lo += 30) curveOnChart(pn, (t) => sph((t - 0.5) * (PI - 0.02), radians(lo)), 70);
  if (showCircle) { stroke(120, 255, 160); strokeWeight(2); curveOnChart(pn, (t) => smallCircle(P, t), 255, true); }
  let w = pn.f(P);
  noStroke(); fill(255, 210, 90); circle(pn.cx + w[0] * pn.k, pn.cy - w[1] * pn.k, 14);
  drawingContext.restore();
  pop();
}
function curveOnChart(pn, f, a, keepStroke) {
  if (!keepStroke) stroke(200, 220, 255, a);
  let prev = null;
  for (let i = 0; i <= 120; i++) {
    let w = pn.f(f(i / 120));
    let q = { x: pn.cx + w[0] * pn.k, y: pn.cy - w[1] * pn.k };
    let ok = isFinite(q.x) && isFinite(q.y) && Math.abs(w[0]) < 50 && Math.abs(w[1]) < 50;
    if (prev && ok && Math.abs(q.x - prev.x) < pn.w * 0.5) line(prev.x, prev.y, q.x, q.y);
    prev = ok ? q : null;
  }
}

function mousePressed() { dragStart = { x: mouseX, y: mouseY, yaw, tilt }; }
function mouseDragged() {
  if (dragStart && dragStart.x < width / 3) {
    yaw = dragStart.yaw - (mouseX - dragStart.x) * 0.01;
    tilt = constrain(dragStart.tilt + (mouseY - dragStart.y) * 0.01, -1.4, 1.4);
  }
}
function mouseReleased() {
  if (!dragStart || dist(mouseX, mouseY, dragStart.x, dragStart.y) > 4) return;
  for (let pn of panels) {
    if (mouseX < pn.x || mouseX > pn.x + pn.w || pn.kind === 'M') continue;
    let p;
    if (pn.kind === 'globe') {
      let q = view([1, 0, 0], pn), R = q.R;
      let X = (mouseX - pn.cx) / R, U = -(mouseY - pn.cy) / R, D = 1 - X * X - U * U;
      if (D < 0) return;
      let d = Math.sqrt(D);   // 見ている向きの成分 → 元の座標へもどす
      let y1 = U * Math.sin(tilt) - d * Math.cos(tilt), z1 = U * Math.cos(tilt) + d * Math.sin(tilt);
      let c = Math.cos(yaw), s = Math.sin(yaw);
      p = [c * X - s * y1, s * X + c * y1, z1];
    } else {
      p = pn.inv([(mouseX - pn.cx) / pn.k, -(mouseY - pn.cy) / pn.k]);
    }
    lat = constrain(Math.asin(constrain(p[2], -1, 1)), -HALF_PI + 0.001, HALF_PI - 0.001); lon = Math.atan2(p[1], p[0]);
    auto = false;
  }
}
function keyPressed() {
  if (key === 'm' || key === 'M') mercator = !mercator;
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'c' || key === 'C') showCircle = !showCircle;
}

// ---------- やってみよう ----------
// 1. P を北極に近づける（↑ を押し続ける）。φN の黄色い点はどこへ行く？ φS ではどこ？
// 2. 緑の小さな円は、どの地図でも「円」のまま（立体射影とメルカトルは角度を保つ = 等角）。でも大きさは変わる
// 3. 球面を 1 枚のチャートで覆えないのはなぜ？（球はコンパクト、平面はちがう）。トーラスなら何枚いる？
// 4. chartN の式を (x, −y) / (1 − z) にすると、座標変換はどうなる？（複素数の 1/w になる）


// ==================================================
// ここから下は「ベクトルの道具」
// ==================================================
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vmul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vlen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
function vunit(a) { let l = vlen(a) || 1; return vmul(a, 1 / l); }
