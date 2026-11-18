// ============================================
// 07 スイングバイ ─ 惑星のそばを通るだけで、探査機が速くなる（遅くなる）のはなぜ？
// 惑星から見ると：双曲線軌道で、入る速さと出る速さは同じ（向きが δ だけ変わる）sin(δ/2) = 1/e、e = √(1 + (b v∞²/μ)²)
// 太陽から見ると：v = 惑星の速度 V + 惑星から見た速度。向きが変わると V との足し算の結果の長さが変わる
// 1 kg あたりのエネルギーの変化 Δ(v²/2) = V · (v_出 − v_入)。軌道は運動方程式を RK4 で数値積分して描く
// 左の図をドラッグ = 通る位置 b / ↑↓ = 惑星から見た速さ v∞ / ←→ = 入ってくる向き / 1 木星 2 土星 3 地球
// ============================================

// 惑星：名前、GM [km³/s²]、半径 [km]、公転の速さ [km/s]
const PLANETS = [['木星', 1.26687e8, 71492, 13.07], ['土星', 3.7931e7, 60268, 9.68], ['地球', 398600.4, 6371, 29.78]];
let pk = 0, vinf = 8, inAng = 160, bImp = 20, path = null;   // ★ v∞ [km/s]、入る向き [度]（惑星の進む向き = 0°）、b [惑星の半径の何倍]

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  path = flyby(pk, vinf, inAng, bImp);
}
// 解析解：離心率 e、曲がる角 δ、いちばん近づく距離 rp
function hyper(mu, v, b) { let e = Math.sqrt(1 + Math.pow((b * v * v) / mu, 2)); return { e, delta: 2 * Math.asin(1 / e), rp: (mu / (v * v)) * (e - 1) }; }
// 数値積分：惑星を原点に、ずっと遠く（10 万 R）から入って、同じ距離まで出ていくまで（RK4、刻みは距離に合わせて変える）
// 図に描くのは惑星のまわり ±60 R の部分だけ
function flyby(k, v, al, bR) {
  let [, mu, Rp] = PLANETS[k], u = [Math.cos(al * DEG), Math.sin(al * DEG)], n = [-u[1], u[0]], D = 1e5 * Rp, VIEW = 60 * Rp, b = bR * Rp;
  let v0 = Math.sqrt(v * v + (2 * mu) / D);   // 遠くで v∞ になるように、出発点ではエネルギー保存の分だけ速く
  let s = [-D * u[0] + b * n[0], -D * u[1] + b * n[1], v0 * u[0], v0 * u[1]], t = 0, pts = [], rmin = 1e99, hit = false;
  let f = (q) => { let r3 = Math.pow(q[0] * q[0] + q[1] * q[1], 1.5); return [q[2], q[3], (-mu * q[0]) / r3, (-mu * q[1]) / r3]; };
  for (let i = 0; i < 20000; i++) {
    let r = Math.hypot(s[0], s[1]), h = (0.01 * r) / Math.hypot(s[2], s[3]);
    let k1 = f(s), k2 = f(s.map((x, j) => x + (h / 2) * k1[j])), k3 = f(s.map((x, j) => x + (h / 2) * k2[j])), k4 = f(s.map((x, j) => x + h * k3[j]));
    s = s.map((x, j) => x + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); t += h;
    r = Math.hypot(s[0], s[1]); rmin = Math.min(rmin, r);
    if (r < 1.5 * VIEW) pts.push([s[0], s[1], t]);
    if (r < Rp) { hit = true; break; }
    if (r > D && s[0] * s[2] + s[1] * s[3] > 0) break;
  }
  // 遠くでの速さ v∞ は、エネルギー保存 v∞² = v² − 2μ/r で出口の値から求める
  let vv = s[2] * s[2] + s[3] * s[3], vo = Math.sqrt(Math.max(0, vv - (2 * mu) / Math.hypot(s[0], s[1])));
  let dir = Math.atan2(s[3], s[2]), vout = [vo * Math.cos(dir), vo * Math.sin(dir)];
  let T = pts.length ? (pts[0][2] + pts[pts.length - 1][2]) / 2 : t / 2;   // 最接近のころの時刻（図の中央）
  return { pts, vin: [v * u[0], v * u[1]], vout, rmin, hit, D: VIEW, Rp, mu, T };
}

function draw() {
  background(6, 10, 28);
  let [pname, mu, Rp, Vp] = PLANETS[pk], P = path, h = hyper(mu, vinf, bImp * Rp);
  // ---- 惑星から見た図
  let S = Math.min(width * 0.36, height * 0.62), cx = 20 + S / 2, cy = 110 + S / 2, sc = S / 2 / P.D;
  stroke(60, 70, 110); noFill(); rect(cx - S / 2, cy - S / 2, S, S);
  noStroke(); fill(220, 180, 130); circle(cx, cy, Math.max(4, 2 * Rp * sc));
  drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(cx - S / 2, cy - S / 2, S, S); drawingContext.clip();   // 枠の外は描かない
  stroke(255, 255, 255, 40); let u = P.vin.map((x) => x / vinf); line(cx - u[0] * S, cy + u[1] * S, cx + u[0] * S, cy - u[1] * S);
  stroke(250, 225, 140); strokeWeight(2); polyline(P.pts.map((p) => [cx + p[0] * sc, cy - p[1] * sc])); strokeWeight(1);
  drawingContext.restore();
  noStroke(); fill(200, 205, 225); textSize(13);
  text(pname + 'から見た図（ドラッグで通る位置 b）', cx - S / 2, cy - S / 2 - 8);
  text('速さ：入 ' + vinf.toFixed(2) + ' → 出 ' + Math.hypot(...P.vout).toFixed(4) + ' km/s（同じ）', cx - S / 2, cy + S / 2 + 20);
  // ---- 太陽から見た速度の足し算
  let vx = width * 0.5, vy = height * 0.33, vs = 0.9 * Math.min((width * 0.45) / (Vp + vinf), (height * 0.2) / vinf);
  let vin = [Vp + P.vin[0], P.vin[1]], vout = [Vp + P.vout[0], P.vout[1]];
  stroke(150, 160, 200, 120); noFill(); circle(vx + Vp * vs, vy, 2 * vinf * vs);
  arrowV(vx, vy, Vp, 0, vs, color(220, 180, 130)); arrowV(vx + Vp * vs, vy, P.vin[0], P.vin[1], vs, color(130, 170, 255)); arrowV(vx + Vp * vs, vy, P.vout[0], P.vout[1], vs, color(255, 140, 110));
  arrowV(vx, vy, vin[0], vin[1], vs, color(130, 170, 255, 140)); arrowV(vx, vy, vout[0], vout[1], vs, color(255, 140, 110, 140));
  noStroke(); fill(200, 205, 225); textSize(13);
  text('太陽から見た速度 = 惑星の速度 V（茶）+ 惑星から見た速度（青 = 入、赤 = 出）。円の半径 = v∞', vx - 20, 104);
  // ---- 太陽から見た通り道（惑星が右へ動く）
  let gx = width * 0.47, gy = height * 0.6, gw = width - gx - 30, gh = height * 0.3;
  stroke(60, 70, 110); noFill(); rect(gx, gy, gw, gh);
  let T = P.T, Xs = P.pts.map((p) => [p[0] + Vp * (p[2] - T), p[1]]), xr = Math.max(1, ...Xs.map((q) => Math.abs(q[0]))), yr = Math.max(1, ...Xs.map((q) => Math.abs(q[1])));
  let s2 = Math.min(gw / 2 / xr, gh / 2 / yr) * 0.95, ox = gx + gw / 2, oy = gy + gh / 2;
  stroke(220, 180, 130, 120); line(ox - xr * s2, oy, ox + xr * s2, oy);
  stroke(250, 225, 140); strokeWeight(2); polyline(Xs.map((q) => [ox + q[0] * s2, oy - q[1] * s2])); strokeWeight(1);
  noStroke(); fill(220, 180, 130); circle(ox, oy, 8); fill(200, 205, 225); text('太陽から見た通り道（茶の線 = 惑星の動き、最接近のとき中央）', gx, gy - 8);
  // ---- 数字
  let Ein = (vin[0] ** 2 + vin[1] ** 2) / 2, Eout = (vout[0] ** 2 + vout[1] ** 2) / 2, dE = Vp * (P.vout[0] - P.vin[0]);
  let x0 = 20, y0 = cy + S / 2 + 46;
  fill(250, 225, 140); textSize(15);
  text('b = ' + bImp.toFixed(2) + ' R　e = ' + h.e.toFixed(3) + '　曲がる角 δ = 2 asin(1/e) = ' + (h.delta / DEG).toFixed(1) + '°　最接近 rp = ' + (h.rp / Rp).toFixed(2) + ' R' + (P.hit ? '　衝突！' : ''), x0, y0);
  fill(220, 225, 240);
  text('太陽から見た速さ：' + Math.hypot(...vin).toFixed(2) + ' → ' + Math.hypot(...vout).toFixed(2) + ' km/s　Δ(v²/2) = ' + (Eout - Ein).toFixed(1) + ' km²/s²（= V·Δv = ' + dE.toFixed(1) + '）= ' + ((Eout - Ein) * 1e6 / 1e9).toFixed(2) + ' GJ/kg', x0, y0 + 24);
  fill(Eout > Ein ? color(130, 230, 160) : color(255, 150, 130));
  text(Eout > Ein ? '加速：惑星の後ろ側を通って、惑星の運動エネルギーを少しもらった' : '減速：惑星の前を横切ると、エネルギーを渡してしまう', x0, y0 + 48);

  noStroke(); fill(240, 236, 215); textSize(18);
  text('スイングバイ　｜ 左の図をドラッグ = b　↑↓ v∞　←→ 入る向き　1 木星 2 土星 3 地球', 20, 34);
  fill(250, 225, 140); textSize(16);
  text(pname + '：GM = ' + mu.toExponential(3) + ' km³/s²、半径 ' + Rp + ' km、公転の速さ V = ' + Vp + ' km/s　v∞ = ' + vinf + ' km/s　入る向き ' + inAng + '°', 20, 60);
  drawSelfTest(width - 160, height - 12);
}
function arrowV(x, y, vx, vy, s, c) {
  let ex = x + vx * s, ey = y - vy * s, L = Math.hypot(ex - x, ey - y);
  stroke(c); strokeWeight(2); line(x, y, ex, ey); strokeWeight(1);
  if (L < 4) return;
  let ux = (ex - x) / L, uy = (ey - y) / L; line(ex, ey, ex - 8 * ux + 4 * uy, ey - 8 * uy - 4 * ux); line(ex, ey, ex - 8 * ux - 4 * uy, ey - 8 * uy + 4 * ux);
}
function mouseDragged() {
  let S = Math.min(width * 0.36, height * 0.62), cx = 20 + S / 2, cy = 110 + S / 2;
  if (Math.abs(mouseX - cx) > S / 2 || Math.abs(mouseY - cy) > S / 2) return;
  let u = [Math.cos(inAng * DEG), Math.sin(inAng * DEG)], n = [-u[1], u[0]], dx = (mouseX - cx) / (S / 2 / 60), dy = -(mouseY - cy) / (S / 2 / 60);
  bImp = clampv(dx * n[0] + dy * n[1], -40, 40);
  if (Math.abs(bImp) < 0.2) bImp = 0.2;
  path = flyby(pk, vinf, inAng, bImp);
}
function mousePressed() { mouseDragged(); }
function keyPressed() {
  if (key === UP_ARROW) vinf = Math.min(25, vinf + 1);
  if (key === DOWN_ARROW) vinf = Math.max(2, vinf - 1);
  if (key === RIGHT_ARROW) inAng = wrap360(inAng + 10);
  if (key === LEFT_ARROW) inAng = wrap360(inAng - 10);
  if (key >= '1' && key <= '3') pk = +key - 1;
  path = flyby(pk, vinf, inAng, bImp);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let [, mu, Rp, Vp] = PLANETS[0], P = flyby(0, 8, 160, 20), h = hyper(mu, 8, 20 * Rp);
  check('惑星から見ると、出ていく速さ = 入る速さ（数値積分で差 0.01% 以内）', near(Math.hypot(...P.vout) / 8, 1, 1e-4));
  let turn = Math.abs(wrap180((Math.atan2(P.vout[1], P.vout[0]) - Math.atan2(P.vin[1], P.vin[0])) / DEG));
  check('数値積分で曲がった角 = 2 asin(1/e)（0.3° 以内）', near(turn, h.delta / DEG, 0.3));
  check('いちばん近づく距離 = (μ/v∞²)(e − 1)（0.5% 以内）', near(P.rmin / h.rp, 1, 0.005));
  let vin = [Vp + P.vin[0], P.vin[1]], vout = [Vp + P.vout[0], P.vout[1]], dE = (vout[0] ** 2 + vout[1] ** 2 - vin[0] ** 2 - vin[1] ** 2) / 2;
  check('太陽から見たエネルギーの変化 Δ(v²/2) = V · (v出 − v入)', near(dE, Vp * (P.vout[0] - P.vin[0]) + 0 * P.vin[1], 1e-6 * Math.abs(dE) + 1e-9));
  check('速度の変化の大きさ |Δv| = 2 v∞ sin(δ/2)', near(Math.hypot(P.vout[0] - P.vin[0], P.vout[1] - P.vin[1]), 2 * 8 * Math.sin(h.delta / 2), 0.02));
  check('遠くを通る（b → 大）ほど曲がらない：δ(400 R) < δ(20 R) / 5', hyper(mu, 8, 400 * Rp).delta < h.delta / 5);
  check('この例（木星の後ろ側を通る）では太陽から見て加速する', dE > 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 左の図で、惑星の上側と下側を通してみよう。加速するのはどちら？
// 2. b を小さく（惑星すれすれ）すると δ は大きくなる。でも近づきすぎると衝突！
// 3. ↑↓ で v∞ を大きくすると曲がりにくくなる（速すぎると重力が効く時間が短い）
// 4. 1・2・3 で木星・土星・地球を比べよう。重い惑星ほど大きく曲げられる
// 5. ボイジャーは木星と土星のスイングバイで太陽系の外へ。どれくらい加速できるか試そう


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
function polyline(pts, closed) {       // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape はエラーになるため）
  if (!pts || pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
