// ============================================
// 02 潮汐 ─ 月の引力の「差」が、海を 2 方向にふくらませる
// 地球の各点の加速度から、地球の中心の加速度を引いたもの = 潮汐力 a = GM[(d − r)/|d − r|³ − d/|d|³]
// 月の側も、反対側も外向き → ふくらみが 2 つ → 1 日に満潮が 2 回。太陽の潮汐は月の約 0.46 倍
// 新月・満月（太陽と月が一直線）で大潮、上弦・下弦で小潮。海の形は「平衡潮汐」（大陸のない理想の海）
// スペース = 再生/停止 / ←→ = 速さ / 1 月だけ 2 太陽だけ 3 両方 / ↑↓ = 月までの距離（×0.6〜×2）
// ============================================

const GRAV = 6.674e-11, M_MOON = 7.342e22, M_SUN = 1.989e30, M_EARTH = 5.972e24;   // [m³/(kg s²)], [kg]
const D_MOON = 3.844e8, D_SUN = 1.496e11, R_EARTH = 6.371e6;                        // [m]
const EXAG = 0.35;                     // ★ 海のふくらみを見やすく大げさにする倍率（R に対する割合 / 1 m）
let hours = 0, playing = true, sp = 2, which = 3, dScale = 1;
const SPEEDS = [0.5, 2, 6, 24, 72];    // 1 秒あたりに進む時間 [時間]
let hist = [], monthCurve = null;   // 30 日間の満潮の高さ（設定を変えたときだけ計算）

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
}
// 天体の向き（上から見た角度 [度]）。t = 0 は新月（太陽と月が同じ向き）
function moonAng(t) { return (360 * t) / (27.3217 * 24); }
function sunAng(t) { return (360 * t) / (365.2422 * 24); }
function spinAng(t) { return (360 * t) / 23.9345; }      // 地球の自転（恒星日 23 時間 56 分）
// 地球の中心から見た位置 r（m）での潮汐加速度 [m/s²]。M = 質量、d = 中心から天体までのベクトル
function tidalAcc(rx, ry, M, dx, dy) {
  let ex = dx - rx, ey = dy - ry, e3 = Math.pow(ex * ex + ey * ey, 1.5), d3 = Math.pow(dx * dx + dy * dy, 1.5);
  return [GRAV * M * (ex / e3 - dx / d3), GRAV * M * (ey / e3 - dy / d3)];
}
function bodies(t) {
  let out = [], m = moonAng(t) * DEG, s = sunAng(t) * DEG, dm = D_MOON * dScale;
  if (which & 1) out.push({ M: M_MOON, dx: dm * Math.cos(m), dy: dm * Math.sin(m), d: dm });
  if (which & 2) out.push({ M: M_SUN, dx: D_SUN * Math.cos(s), dy: D_SUN * Math.sin(s), d: D_SUN });
  return out;
}
// 平衡潮汐の高さ [m]：h = H (3 cos²ψ − 1) / 2、H = (M/M地球)(R/d)³ R（ψ = 天体の方向からの角度）
function eqH(M, d) { return (M / M_EARTH) * Math.pow(R_EARTH / d, 3) * R_EARTH; }
function tideHeight(ang, t) {
  let h = 0;
  for (let b of bodies(t)) { let c = Math.cos(ang - Math.atan2(b.dy, b.dx)); h += (eqH(b.M, b.d) * (3 * c * c - 1)) / 2; }
  return h;
}
function totalAcc(rx, ry, t) { let a = [0, 0]; for (let b of bodies(t)) { let q = tidalAcc(rx, ry, b.M, b.dx, b.dy); a[0] += q[0]; a[1] += q[1]; } return a; }

function draw() {
  background(8, 14, 34);
  if (playing) hours += SPEEDS[sp] / 60;
  let cx = width * 0.28, cy = height * 0.53, R = Math.min(width * 0.17, height * 0.3);
  // ---- 海（ふくらみを大げさに）
  let pts = [];
  for (let i = 0; i <= 180; i++) { let a = (i / 180) * TWO_PI, r = R * (1 + EXAG * tideHeight(a, hours)); pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]); }
  noStroke(); fill(40, 100, 190); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(CLOSE);
  fill(150, 115, 70); circle(cx, cy, 2 * R * 0.93);   // 地面
  // ---- 潮汐力の矢印（地球の中と表面）
  let amax = 2 * GRAV * (M_MOON / Math.pow(D_MOON, 3) + M_SUN / Math.pow(D_SUN, 3)) * R_EARTH;
  stroke(255, 240, 180); strokeWeight(1.5);
  for (let gy = -1; gy <= 1.001; gy += 0.25) for (let gx = -1; gx <= 1.001; gx += 0.25) {
    if (gx * gx + gy * gy > 1.0001) continue;
    arrowAt(cx + gx * R, cy - gy * R, totalAcc(gx * R_EARTH, gy * R_EARTH, hours), (R * 0.22) / amax);
  }
  for (let i = 0; i < 24; i++) { let a = (i / 24) * TWO_PI; arrowAt(cx + R * Math.cos(a), cy - R * Math.sin(a), totalAcc(R_EARTH * Math.cos(a), R_EARTH * Math.sin(a), hours), (R * 0.22) / amax); }
  // ---- 月・太陽の方向と観測地点
  let ma = moonAng(hours) * DEG, sa = sunAng(hours) * DEG;
  noStroke(); fill(230, 230, 220, which & 1 ? 255 : 60); circle(cx + R * 1.4 * Math.cos(ma), cy - R * 1.4 * Math.sin(ma), 26);
  fill(255, 210, 90, which & 2 ? 255 : 60); circle(cx + R * 1.62 * Math.cos(sa), cy - R * 1.62 * Math.sin(sa), 40);
  fill(220); textSize(12); textAlign(CENTER);
  text('月', cx + R * 1.4 * Math.cos(ma), cy - R * 1.4 * Math.sin(ma) + 30); text('太陽の方向', cx + R * 1.62 * Math.cos(sa), cy - R * 1.62 * Math.sin(sa) + 36);
  let oa = spinAng(hours) * DEG, oh = tideHeight(oa, hours);
  fill(255, 90, 90); circle(cx + R * (1 + EXAG * oh) * Math.cos(oa), cy - R * (1 + EXAG * oh) * Math.sin(oa), 14);
  fill(255, 160, 160); text('観測地点（自転で回る）', cx + R * 1.25 * Math.cos(oa), cy - R * 1.25 * Math.sin(oa));
  textAlign(LEFT, BASELINE);
  // ---- 観測地点の潮位のグラフ（過去 3 日）
  hist.push([hours, oh]); while (hist.length > 1 && hist[0][0] < hours - 72) hist.shift();
  let gx = width * 0.6, gw = width - gx - 30, gy = height * 0.16, gh = height * 0.26;
  stroke(70, 80, 120); noFill(); rect(gx, gy, gw, gh);
  let Y = (h) => gy + gh / 2 - (h / 0.6) * (gh / 2);
  stroke(255, 120, 120); strokeWeight(2); polyline(hist.map((p) => [gx + gw - ((hours - p[0]) / 72) * gw, Y(p[1])]));
  noStroke(); fill(200, 205, 225); textSize(13);
  text('観測地点の海面の高さ（平衡潮汐、過去 72 時間）　±0.6 m', gx, gy - 8);
  // ---- 1 か月の満潮の高さ（大潮・小潮）
  let gy2 = gy + gh + 70, gh2 = height * 0.2;
  stroke(70, 80, 120); noFill(); rect(gx, gy2, gw, gh2);
  if (!monthCurve) { monthCurve = []; for (let i = 0; i <= 240; i++) { let t = (i / 240) * 30 * 24, hi = -9; for (let k = 0; k < 72; k++) hi = Math.max(hi, tideHeight((k / 72) * PI, t)); monthCurve.push(hi); } }
  stroke(140, 190, 255); strokeWeight(2); polyline(monthCurve.map((hi, i) => [gx + (i / 240) * gw, gy2 + gh2 - (hi / 0.6) * gh2]));
  let tx = gx + ((hours % (30 * 24)) / (30 * 24)) * gw; stroke(255, 150); line(tx, gy2, tx, gy2 + gh2);
  noStroke(); fill(200, 205, 225); text('30 日間の満潮の高さ（新月 → 満月 → 新月）', gx, gy2 - 8);

  // ---- 数字
  let am = 2 * GRAV * M_MOON * R_EARTH / Math.pow(D_MOON * dScale, 3), as = 2 * GRAV * M_SUN * R_EARTH / Math.pow(D_SUN, 3), ratio = as / am;
  noStroke(); fill(240, 236, 215); textSize(18);
  text('潮汐　｜ スペース 再生/停止　←→ 速さ　1 月　2 太陽　3 両方　↑↓ 月までの距離', 20, 34);
  fill(250, 225, 140); textSize(15);
  text((hours / 24).toFixed(2) + ' 日目（' + SPEEDS[sp] + ' 時間/秒）　月の距離 = ' + (D_MOON * dScale / 1000).toFixed(0) + ' km（×' + dScale.toFixed(1) + '）　月と太陽の離角 = ' + wrap360(moonAng(hours) - sunAng(hours)).toFixed(0) + '°', 20, 60);
  fill(225, 228, 240); textSize(14);
  text('月の潮汐加速度 2GMR/d³ = ' + am.toExponential(3) + ' m/s²（地球の重力の ' + (am / 9.81 * 1e7).toFixed(2) + ' × 10⁻⁷）　太陽 = ' + as.toExponential(3) + ' m/s²　太陽 ÷ 月 = ' + ratio.toFixed(3), gx, gy2 + gh2 + 34);
  text('大潮 ÷ 小潮 = (1 + ' + ratio.toFixed(2) + ') ÷ (1 − ' + ratio.toFixed(2) + ') = ' + ((1 + ratio) / Math.max(1e-6, 1 - ratio)).toFixed(2) + '　平衡潮汐の月の H = ' + eqH(M_MOON, D_MOON * dScale).toFixed(3) + ' m', gx, gy2 + gh2 + 56);
  fill(170, 175, 200); text('矢印 = 潮汐力（中心との差）。海の厚さは大げさ（' + EXAG + ' × R / m）', 20, height - 34);
  drawSelfTest(20, height - 12);
}
function arrowAt(x, y, a, k) {
  let vx = a[0] * k, vy = -a[1] * k, L = Math.hypot(vx, vy);
  if (!(L > 0.5)) return;
  line(x, y, x + vx, y + vy);
  let ux = vx / L, uy = vy / L; line(x + vx, y + vy, x + vx - 5 * ux + 3 * uy, y + vy - 5 * uy - 3 * ux); line(x + vx, y + vy, x + vx - 5 * ux - 3 * uy, y + vy - 5 * uy + 3 * ux);
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) sp = Math.min(SPEEDS.length - 1, sp + 1);
  if (key === LEFT_ARROW) sp = Math.max(0, sp - 1);
  if (key === '1' || key === '2' || key === '3') { which = +key; hist = []; monthCurve = null; }
  if (key === UP_ARROW) { dScale = Math.min(2, dScale + 0.1); hist = []; monthCurve = null; }
  if (key === DOWN_ARROW) { dScale = Math.max(0.6, dScale - 0.1); hist = []; monthCurve = null; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let near1 = tidalAcc(R_EARTH, 0, M_MOON, D_MOON, 0)[0], far1 = tidalAcc(-R_EARTH, 0, M_MOON, D_MOON, 0)[0], side = tidalAcc(0, R_EARTH, M_MOON, D_MOON, 0)[1];
  let k2 = (2 * GRAV * M_MOON * R_EARTH) / Math.pow(D_MOON, 3);
  check('月の側は月へ、反対側は月と逆へ引かれる（ふくらみが 2 つ）', near1 > 0 && far1 < 0);
  check('両側の平均の大きさ = 2GMR/d³ ≈ 1.10 × 10⁻⁶ m/s²（差 0.1% 以内）', near((near1 - far1) / 2 / k2, 1, 0.001) && near(k2, 1.10e-6, 0.02e-6));
  check('横の点は中心へ押される：大きさ = 縦の半分（GMR/d³）', side < 0 && near(-side / k2, 0.5, 0.01));
  let ratio = (M_SUN / M_MOON) * Math.pow(D_MOON / D_SUN, 3);
  check('太陽の潮汐 ÷ 月の潮汐 = (M☉/M月)(d月/d☉)³ ≈ 0.46', near(ratio, 0.46, 0.01));
  check('大潮 ÷ 小潮 = (1 + 0.46) ÷ (1 − 0.46) ≈ 2.7', near((1 + ratio) / (1 - ratio), 2.7, 0.1));
  check('月の平衡潮汐：満潮 +0.36 m、干潮 −0.18 m（差 0.54 m）', near(eqH(M_MOON, D_MOON), 0.357, 0.003) && near(1.5 * eqH(M_MOON, D_MOON), 0.535, 0.005));
  let save = which; which = 1; let n = 0, prev = [];
  for (let i = 0; i <= 2484; i++) { let t = 3 + i * 0.01; prev.push(tideHeight(spinAng(t) * DEG, t)); }
  for (let i = 1; i < prev.length - 1; i++) if (prev[i] > prev[i - 1] && prev[i] >= prev[i + 1]) n++;
  check('月だけのとき、24 時間 50 分の間に満潮は 2 回', n === 2);
  which = save;
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1（月だけ）と 2（太陽だけ）で、ふくらみの大きさを比べよう。太陽はずっと重いのに小さいのはなぜ？
// 2. 3 で 30 日ぶん進めて、大潮（新月・満月）と小潮（上弦・下弦）を見つけよう
// 3. ↑↓ で月の距離を半分に近づけると、潮汐は何倍？（1/d³ なので 8 倍）
// 4. 観測地点のグラフで、満潮から次の満潮までの時間を測ろう（約 12 時間 25 分）
// 5. 本当の海では大陸や海の深さのせいで時刻も高さも変わる。日本の港の潮汐表と比べてみよう


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
