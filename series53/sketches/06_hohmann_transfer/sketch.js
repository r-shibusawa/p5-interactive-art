// ============================================
// 06 ホーマン軌道で火星へ ─ いつ打ち上げれば、火星に会える？
// 地球の軌道（半径 r₁）に接して出発し、火星の軌道（r₂）に接して着く楕円 = ホーマン移行軌道（a = (r₁ + r₂)/2）
// 速さは vis-viva の式 v² = μ(2/r − 1/a)：出発の Δv₁ = v(近日点) − 地球の速さ、到着の Δv₂ = 火星の速さ − v(遠日点)
// 所要時間 = 楕円の半周 = π√(a³/μ)。その間に火星も進むので、出発のとき火星は地球より約 44° 先にいないといけない
// 円軌道・同じ平面の近似。スペース = 打ち上げ / ←→ = 時間の速さ / W = 次の窓まで早送り / R = 最初から
// ============================================

const MU = 1.32712440018e20, AU = 1.495978707e11, DAY = 86400;   // 太陽の GM [m³/s²]、1 AU [m]、1 日 [s]
const R1 = 1.0, R2 = 1.5237;           // ★ 出発と到着の軌道半径 [AU]（地球と火星）
const HIT_DEG = 3;                     // ★ 「会えた」とする角度の差 [度]
const SPEEDS = [2, 5, 10, 20, 40];     // 1 秒あたりの日数
let tDay = 0, sp = 2, thE0, thM0, craft = null, tries = 0, hits = 0, msg = '', skipping = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  HO = hohmann(R1, R2);
  selfTest();
  resetGame();
}
function resetGame() { tDay = 0; thE0 = Math.random() * TWO_PI; thM0 = Math.random() * TWO_PI; craft = null; msg = ''; skipping = false; }
// 円軌道の角速度 [rad/日]、速さ [m/s]
function nOf(r) { return Math.sqrt(MU / Math.pow(r * AU, 3)) * DAY; }
function vCirc(r) { return Math.sqrt(MU / (r * AU)); }
function visViva(r, a) { return Math.sqrt(MU * (2 / (r * AU) - 1 / (a * AU))); }
function hohmann(r1, r2) {
  let a = (r1 + r2) / 2, tH = (Math.PI * Math.sqrt(Math.pow(a * AU, 3) / MU)) / DAY;
  let dv1 = visViva(r1, a) - vCirc(r1), dv2 = vCirc(r2) - visViva(r2, a);
  return { a, e: (r2 - r1) / (r2 + r1), tH, dv1, dv2, phase: 180 - (nOf(r2) * tH) / DEG };
}
let HO;                                // ホーマン軌道の数字（setup で計算）
function thE(t) { return thE0 + nOf(R1) * t; }
function thM(t) { return thM0 + nOf(R2) * t; }
function phaseNow(t) { return wrap360((thM(t) - thE(t)) / DEG); }          // 火星が地球より何度先か
function daysToWindow(t) { return wrap360(phaseNow(t) - HO.phase) / ((nOf(R1) - nOf(R2)) / DEG); }
// 移行軌道の上の位置：近日点の向き θL、出発から dt 日（ケプラー方程式をニュートン法で）
function craftPos(thL, dt) {
  let nT = Math.sqrt(MU / Math.pow(HO.a * AU, 3)) * DAY, M = nT * dt, E = M;
  for (let i = 0; i < 30; i++) { let d = (E - HO.e * Math.sin(E) - M) / (1 - HO.e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-13) break; }
  let x = HO.a * (Math.cos(E) - HO.e), y = HO.a * Math.sqrt(1 - HO.e * HO.e) * Math.sin(E);
  return [x * Math.cos(thL) - y * Math.sin(thL), x * Math.sin(thL) + y * Math.cos(thL)];
}
function launch() {
  if (craft) return;
  craft = { t0: tDay, thL: thE(tDay) }; tries++; msg = '';
}

function draw() {
  background(6, 10, 28);
  let dt = SPEEDS[sp] / 60;
  if (skipping) { let w = daysToWindow(tDay); if (w < 6) { tDay += w; skipping = false; } else tDay += 6; }
  else tDay += dt;
  if (craft && tDay - craft.t0 >= HO.tH) {      // 到着：火星との角度の差
    let miss = wrap180((thM(craft.t0 + HO.tH) - craft.thL - Math.PI) / DEG);
    if (Math.abs(miss) < HIT_DEG) { hits++; msg = '到着！ 火星との差 ' + miss.toFixed(1) + '°（成功）'; }
    else msg = '火星は ' + (miss > 0 ? miss.toFixed(0) + '° 先' : (-miss).toFixed(0) + '° 後ろ') + 'にいた（失敗）';
    craft = null;
  }
  let cx = width * 0.33, cy = height * 0.55, sc = Math.min(width * 0.28, height * 0.4) / R2;
  stroke(60, 110, 200, 120); noFill(); circle(cx, cy, 2 * R1 * sc); stroke(220, 110, 80, 120); circle(cx, cy, 2 * R2 * sc);
  noStroke(); fill(255, 210, 90); circle(cx, cy, 20);
  // 移行軌道（いま打ち上げたら通る道）
  let thL = craft ? craft.thL : thE(tDay), pts = [];
  for (let i = 0; i <= 60; i++) { let p = craftPos(thL, (i / 60) * HO.tH); pts.push([cx + p[0] * sc, cy - p[1] * sc]); }
  stroke(250, 225, 140, craft ? 220 : 80); strokeWeight(craft ? 2 : 1); drawingContext.setLineDash(craft ? [] : [5, 6]); polyline(pts); drawingContext.setLineDash([]); strokeWeight(1);
  // 到着の点と、そのとき火星がいる場所
  let ax = cx + R2 * sc * Math.cos(thL + Math.PI), ay = cy - R2 * sc * Math.sin(thL + Math.PI), tA = (craft ? craft.t0 : tDay) + HO.tH;
  noFill(); stroke(250, 225, 140); circle(ax, ay, 22);
  stroke(220, 110, 80, 160); let mx = cx + R2 * sc * Math.cos(thM(tA)), my = cy - R2 * sc * Math.sin(thM(tA)); circle(mx, my, 16);
  noStroke(); fill(220, 150, 130); textSize(12); text('到着の日の火星', mx + 10, my + 4);
  // 惑星と探査機
  fill(90, 150, 240); circle(cx + R1 * sc * Math.cos(thE(tDay)), cy - R1 * sc * Math.sin(thE(tDay)), 16);
  fill(230, 110, 80); circle(cx + R2 * sc * Math.cos(thM(tDay)), cy - R2 * sc * Math.sin(thM(tDay)), 14);
  if (craft) { let p = craftPos(craft.thL, tDay - craft.t0); fill(255); circle(cx + p[0] * sc, cy - p[1] * sc, 9); }

  // ---- 数字
  let x0 = width * 0.66, y0 = 110, ph = phaseNow(tDay), lh = 25;
  let rows = [
    ['移行軌道の長半径 a = (r₁ + r₂)/2', HO.a.toFixed(4) + ' AU'],
    ['地球の公転の速さ √(μ/r₁)', (vCirc(R1) / 1000).toFixed(2) + ' km/s'],
    ['出発の速さ v = √(μ(2/r₁ − 1/a))', (visViva(R1, HO.a) / 1000).toFixed(2) + ' km/s'],
    ['Δv₁（地球の軌道から加速）', (HO.dv1 / 1000).toFixed(3) + ' km/s'],
    ['到着の速さ（遠日点）', (visViva(R2, HO.a) / 1000).toFixed(2) + ' km/s'],
    ['Δv₂（火星の軌道に合わせる）', (HO.dv2 / 1000).toFixed(3) + ' km/s'],
    ['所要時間 π√(a³/μ)', HO.tH.toFixed(1) + ' 日 = ' + (HO.tH / 365.25).toFixed(3) + ' 年'],
    ['必要な位相角（火星が先に）', HO.phase.toFixed(1) + '°'],
    ['会合周期（窓の間隔）', (TWO_PI / (nOf(R1) - nOf(R2))).toFixed(1) + ' 日'],
  ];
  textSize(14);
  rows.forEach((r, i) => { fill(200, 205, 225); text(r[0], x0, y0 + i * lh); fill(250, 225, 140); text(r[1], x0 + 250, y0 + i * lh); });
  let ok = Math.abs(wrap180(ph - HO.phase)) < HIT_DEG;
  fill(ok ? color(130, 230, 160) : color(240, 236, 215)); textSize(17);
  text('いまの位相角 ' + ph.toFixed(1) + '°' + (ok ? '　← いまだ！' : ''), x0, y0 + rows.length * lh + 24);
  fill(220, 225, 240); textSize(15);
  text('次の打ち上げの窓まで ' + daysToWindow(tDay).toFixed(0) + ' 日', x0, y0 + rows.length * lh + 50);
  text('成功 ' + hits + ' / ' + tries + ' 回' + (craft ? '　飛行中 ' + (tDay - craft.t0).toFixed(0) + ' / ' + HO.tH.toFixed(0) + ' 日' : ''), x0, y0 + rows.length * lh + 76);
  fill(255, 190, 150); text(msg, x0, y0 + rows.length * lh + 102);

  noStroke(); fill(240, 236, 215); textSize(18);
  text('ホーマン軌道で火星へ　｜ スペース 打ち上げ　←→ 時間の速さ　W 次の窓まで早送り　R 最初から', 20, 34);
  fill(250, 225, 140); textSize(16);
  text(tDay.toFixed(0) + ' 日目（' + SPEEDS[sp] + ' 日/秒）　点線 = いま打ち上げたときの道　○ = 着く場所', 20, 60);
  drawSelfTest(20, height - 12);
}

function keyPressed() {
  if (key === ' ') launch();
  if (key === RIGHT_ARROW) sp = Math.min(SPEEDS.length - 1, sp + 1);
  if (key === LEFT_ARROW) sp = Math.max(0, sp - 1);
  if ((key === 'w' || key === 'W') && !craft) skipping = true;
  if (key === 'r' || key === 'R') resetGame();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('地球の公転の速さ √(μ/1 AU) ≈ 29.78 km/s', near(vCirc(1) / 1000, 29.78, 0.01));
  check('地球 → 火星のホーマン軌道の所要時間 ≈ 259 日（0.709 年）', near(HO.tH, 258.9, 1) && near(HO.tH / 365.25, 0.709, 0.003));
  check('Δv₁ ≈ 2.94 km/s、Δv₂ ≈ 2.65 km/s', near(HO.dv1 / 1000, 2.94, 0.02) && near(HO.dv2 / 1000, 2.65, 0.02));
  check('出発のとき火星は地球より約 44° 先', near(HO.phase, 44.3, 0.5));
  check('打ち上げの窓は約 780 日（2 年 2 か月）ごと', near(TWO_PI / (nOf(R1) - nOf(R2)), 779.9, 2));
  let p0 = craftPos(0.7, 0), p1 = craftPos(0.7, HO.tH);
  check('ケプラー方程式で進めると、出発は r₁、半周後はちょうど r₂ の反対側', near(Math.hypot(...p0), R1, 1e-9) && near(Math.hypot(...p1), R2, 1e-9) && near(Math.abs(wrap180(Math.atan2(p1[1], p1[0]) / DEG - 0.7 / DEG)), 180, 1e-6));
  check('エネルギー v²/2 − μ/r は近日点と遠日点で同じ（= −μ/2a）', near(visViva(R1, HO.a) ** 2 / 2 - MU / (R1 * AU), visViva(R2, HO.a) ** 2 / 2 - MU / (R2 * AU), 1) && near(visViva(R1, HO.a) ** 2 / 2 - MU / (R1 * AU), -MU / (2 * HO.a * AU), 1));
  let sE = thE0, sM = thM0, sT = tDay; thE0 = 0; thM0 = 1; tDay = 0;
  let w = daysToWindow(0), miss = wrap180((thM(w + HO.tH) - thE(w) - Math.PI) / DEG);
  check('窓の日に打ち上げると、火星にぴったり会える（差 < 0.01°）', Math.abs(miss) < 0.01);
  thE0 = sE; thM0 = sM; tDay = sT;
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 位相角を見ながら、ちょうどいいときにスペースで打ち上げよう。何回で成功する？
// 2. W で窓まで早送りしてから打ち上げると？ 次の窓までは何日？
// 3. R2 を 5.2（木星）にすると、所要時間と Δv はどうなる？ 必要な位相角は？
// 4. R2 を 0.723（金星）にすると、Δv はマイナス（減速）になる。内側へ行くにはブレーキ
// 5. HIT_DEG を 1 にしてむずかしくしよう。実際の探査機は途中で軌道を細かく直している


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
