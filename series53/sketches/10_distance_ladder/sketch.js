// ============================================
// 10 距離のはしご ─ 宇宙の距離は、近い所から順にはしごをかけて測る
// 1 年周視差：地球が太陽のまわりを回ると、近い星は遠くの星に対して小さな円をえがく。その半径 p [秒角] から d = 1/p [pc]
// 2 セファイド（脈動する星）：周期 P が長いほど本当に明るい。周期-光度関係 M_V = −2.43 (log₁₀P − 1) − 4.05（Benedict ほか 2007）
//   見かけの明るさ m と比べて、距離指数 m − M = 5 log₁₀ d − 5（星間の吸収は考えない）
// 3 はしごの全体：レーダー → 年周視差 → セファイド → Ia 型超新星 → ハッブルの法則（13 へ）
// 1 2 3 = 段 / ↑↓ = 星を選ぶ・見かけの等級 / ←→ = 周期 / M = 測りなおす（視差）/ スペース = 再生/停止
// ============================================

const AU_PER_PC = 1 / Math.tan(Math.PI / 180 / 3600);   // 1 pc = 1 AU ÷ tan(1″) ≈ 206265 AU
const AU_PER_LY = 63241.08;            // 1 光年 [AU]
const NOISE = 0.01;                    // ★ 位置の測定の誤差 [秒角]
// 近い星：名前、年周視差 [秒角]
const NEARBY = [['プロキシマ・ケンタウリ', 0.7685], ['シリウス', 0.3792], ['アルタイル', 0.1949], ['ベガ', 0.1302]];
let bgStars = [], stage = 1, si = 0, tYear = 0, playing = true, meas = null, period = 5.366, mApp = 3.95;   // ★ δ ケフェウスの周期 [日] と平均の見かけの等級

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(7); for (let i = 0; i < 40; i++) bgStars.push([rnd() - 0.5, rnd() - 0.5]);   // 遠くの星（動かない）
  seedRng(Date.now()); measure();
}
function distPc(p) { return 1 / Math.max(p, 1e-9); }
// 12 か月の測定：x(t) = p cos(2πt) + 誤差 → a cos + b sin を最小二乗で → p = √(a² + b²)
function fitParallax(ts, xs) {
  let cc = 0, ss = 0, cs = 0, xc = 0, xsn = 0;
  for (let i = 0; i < ts.length; i++) { let c = Math.cos(TWO_PI_ * ts[i]), s = Math.sin(TWO_PI_ * ts[i]); cc += c * c; ss += s * s; cs += c * s; xc += xs[i] * c; xsn += xs[i] * s; }
  let det = cc * ss - cs * cs; if (Math.abs(det) < 1e-12) return 0;
  let a = (xc * ss - xsn * cs) / det, b = (xsn * cc - xc * cs) / det;
  return Math.hypot(a, b);
}
const TWO_PI_ = 2 * Math.PI;
function measure() {
  let p = NEARBY[si][1], ts = [], xs = [];
  for (let k = 0; k < 12; k++) { ts.push(k / 12); xs.push(p * Math.cos(TWO_PI_ * (k / 12)) + NOISE * rndNormal()); }
  meas = { ts, xs, p: fitParallax(ts, xs) };
}
function plM(P) { return -2.43 * (Math.log10(Math.max(P, 0.1)) - 1) - 4.05; }          // 周期-光度関係
function distFromModulus(m, M) { return Math.pow(10, (m - M + 5) / 5); }                 // [pc]
function modulus(d) { return 5 * Math.log10(d) - 5; }
// セファイドの光度曲線の形（すばやく明るくなり、ゆっくり暗くなる）位相 0〜1 → 等級の変化
function cephShape(ph) { ph = ph - Math.floor(ph); return ph < 0.2 ? 0.4 - (ph / 0.2) * 0.8 : -0.4 + ((ph - 0.2) / 0.8) * 0.8; }

function draw() {
  background(6, 10, 28);
  if (playing) tYear += 1 / 600;
  if (stage === 1) drawParallax(); else if (stage === 2) drawCepheid(); else drawLadder();
  noStroke(); fill(240, 236, 215); textSize(18);
  text('距離のはしご　｜ 1 年周視差　2 セファイド　3 はしごの全体　' + ['', '↑↓ 星　M 測りなおす　スペース 再生', '←→ 周期　↑↓ 見かけの等級', ''][stage], 20, 34);
  drawSelfTest(20, height - 12);
}
function drawParallax() {
  let [name, p] = NEARBY[si], d = distPc(p), cx = width * 0.22, cy = height * 0.5, R = Math.min(90, height * 0.12);
  // 真上から：太陽・地球の軌道・近い星（距離は縮めて描く）・遠くの星
  noFill(); stroke(70, 110, 200); circle(cx, cy, 2 * R);
  noStroke(); fill(255, 210, 90); circle(cx, cy, 16);
  let ea = TWO_PI_ * tYear, ex = cx + R * Math.cos(ea), ey = cy - R * Math.sin(ea), sy = cy - height * 0.4;
  fill(90, 150, 240); circle(ex, ey, 12);
  fill(255, 240, 200); circle(cx, sy, 10); fill(200, 205, 225); textSize(12); text(name, cx + 10, sy + 4); text('（本当は ' + (d * AU_PER_PC).toExponential(2) + ' AU 先）', cx + 10, sy + 20);
  stroke(255, 230, 160, 120); line(ex, ey, cx, sy);   // 地球から星への視線（季節で向きが変わる）
  noStroke(); fill(160, 170, 200); textSize(12); text('真上から（星までの距離はとても縮めた）', cx - 110, cy + R + 30);
  // 望遠鏡で見た位置（右）：遠くの星は動かず、近い星は半径 p の円をえがく
  let vx = width * 0.62, vy = height * 0.4, vr = Math.min(width * 0.18, height * 0.25), sc = vr / 1.0;   // 1 秒角 = vr
  stroke(70, 80, 120); noFill(); rect(vx - vr * 1.2, vy - vr * 1.2, vr * 2.4, vr * 2.4);
  noStroke(); fill(200, 200, 220); for (let b of bgStars) circle(vx + b[0] * vr * 2.3, vy + b[1] * vr * 2.3, 2.5);
  stroke(255, 230, 160, 100); noFill(); circle(vx, vy, 2 * p * sc);
  noStroke(); fill(255, 240, 200); circle(vx + p * sc * Math.cos(ea), vy - p * sc * Math.sin(ea), 10);
  fill(255, 140, 110); for (let i = 0; i < 12; i++) circle(vx + meas.xs[i] * sc, vy + vr * 1.1, 5);   // 測るのは横方向（x）の位置
  fill(200, 205, 225); textSize(12); text('望遠鏡で見た位置（枠 = ±1.2″、遠くの星は動かない。赤 = 毎月の測定）', vx - vr * 1.2, vy - vr * 1.2 - 8);
  // 数字
  let x0 = 20, y0 = vy + vr * 1.2 + 40;
  fill(250, 225, 140); textSize(16);
  text(name + '：年周視差 p = ' + p + '″　→ d = 1/p = ' + d.toFixed(3) + ' pc = ' + (d * AU_PER_PC / AU_PER_LY).toFixed(2) + ' 光年', x0, y0);
  fill(220, 225, 240); textSize(15);
  text('12 回の測定（誤差 ' + NOISE + '″）に cos・sin を当てはめた p = ' + meas.p.toFixed(4) + '″ → d = ' + distPc(meas.p).toFixed(3) + ' pc（M で測りなおす）', x0, y0 + 26);
  text('1 pc = 1 AU ÷ tan 1″ = ' + AU_PER_PC.toFixed(0) + ' AU = ' + (AU_PER_PC / AU_PER_LY).toFixed(3) + ' 光年。p が誤差（' + NOISE + '″）に近づくと、距離は測れない', x0, y0 + 50);
}
function drawCepheid() {
  let M = plM(period), d = distFromModulus(mApp, M);
  // 光度曲線
  let g = { x: 70, y: 110, w: width * 0.5, h: height * 0.32, x0: 0, x1: 3 * period, y0: mApp + 0.7, y1: mApp - 0.7 };
  plotAxes(g, '日', '見かけの等級 m（上ほど明るい）', [0, period, 2 * period, 3 * period].map((v) => +v.toFixed(1)), [mApp - 0.5, mApp, mApp + 0.5].map((v) => +v.toFixed(2)));
  let pts = []; for (let i = 0; i <= 300; i++) { let t = (i / 300) * 3 * period; pts.push([gX(g, t), gY(g, mApp + cephShape(t / period))]); }
  stroke(250, 225, 140); strokeWeight(2); polyline(pts); strokeWeight(1);
  let tt = (tYear * 365.25 * 0.2) % (3 * period); noStroke(); fill(255); circle(gX(g, tt), gY(g, mApp + cephShape(tt / period)), 10);
  // 周期-光度関係
  let g2 = { x: 70, y: g.y + g.h + 80, w: width * 0.5, h: height * 0.3, x0: 1, x1: 100, y0: -1, y1: -7.5, logx: true };
  plotAxes(g2, '周期 P [日]（対数）', '本当の明るさ（絶対等級）M_V', [1, 3, 10, 30, 100], [-1, -3, -5, -7]);
  stroke(140, 190, 255); strokeWeight(2); polyline([[gX(g2, 1), gY(g2, plM(1))], [gX(g2, 100), gY(g2, plM(100))]]); strokeWeight(1);
  noStroke(); fill(255, 140, 110); circle(gX(g2, period), gY(g2, M), 12);
  // 星の明るさのまる
  let sx = width * 0.78, sy = height * 0.3, br = 30 + 8 * cephShape(tt / period) * -1;
  for (let i = 5; i >= 1; i--) { fill(255, 235, 190, 20); circle(sx, sy, br * 2 + i * 12); }
  fill(255, 240, 210); circle(sx, sy, br * 2);
  let x0 = width * 0.62, y0 = height * 0.55, lh = 26;
  [['周期 P', period.toFixed(2) + ' 日'], ['周期-光度関係 → M_V', M.toFixed(2)], ['見かけの平均等級 m', mApp.toFixed(2)], ['距離指数 m − M', (mApp - M).toFixed(2)], ['距離 d = 10^((m − M + 5)/5)', fmtD(d)]]
    .forEach((r, i) => { fill(200, 205, 225); textSize(15); text(r[0], x0, y0 + i * lh); fill(250, 225, 140); text(r[1], x0 + 250, y0 + i * lh); });
  fill(170, 175, 200); textSize(13);
  text('最初の値は δ ケフェウス（P = 5.366 日、m ≈ 3.95）。吸収を無視しているので、少し遠めに出る', x0, y0 + 5 * lh + 10);
  text('↑↓ で m を大きく（暗く）すると遠くなる：5 等暗い = 光が 1/100 = 距離 10 倍', x0, y0 + 5 * lh + 32);
}
function fmtD(pc) { return pc < 1000 ? pc.toFixed(0) + ' pc' : pc < 1e6 ? (pc / 1000).toFixed(1) + ' kpc' : (pc / 1e6).toFixed(2) + ' Mpc'; }
function drawLadder() {
  let x0 = 80, x1 = width - 60, y = height * 0.62, lo = -9, hi = 10.5;     // 横軸：log₁₀(距離 [pc])
  let X = (pc) => x0 + ((Math.log10(pc) - lo) / (hi - lo)) * (x1 - x0);
  stroke(120, 130, 170); line(x0, y, x1, y);
  noStroke(); fill(160, 170, 195); textSize(12); textAlign(CENTER, TOP);
  for (let e = -8; e <= 10; e += 2) text('10^' + e + ' pc', X(10 ** e), y + 8);
  textAlign(LEFT, BASELINE);
  let rungs = [['レーダー・レーザー（太陽系）', 2e-9, 3e-4, [140, 190, 255]], ['年周視差（ガイア衛星で数千 pc まで）', 1, 1e4, [250, 225, 140]], ['セファイド', 1e3, 4e7, [255, 170, 120]], ['Ia 型超新星', 1e6, 3e9, [220, 140, 255]], ['ハッブルの法則 v = H₀d（13）', 1e7, 1e10, [140, 230, 180]]];
  rungs.forEach((r, i) => { let yy = y - 60 - i * 46; fill(r[3][0], r[3][1], r[3][2], 160); rect(X(r[1]), yy, X(r[2]) - X(r[1]), 18, 9); fill(230); textSize(13); text(r[0], X(r[1]) + 6, yy - 6); });
  let objs = [['月', 384400e3 / 1.496e11 / AU_PER_PC], ['太陽', 1 / AU_PER_PC], ['海王星', 30 / AU_PER_PC], ['プロキシマ', 1.30], ['δ ケフェウス', 270], ['大マゼラン雲', 5.0e4], ['アンドロメダ銀河', 7.7e5], ['おとめ座銀河団', 1.65e7]];
  objs.forEach((o, i) => { let x = X(o[1]); fill(255); circle(x, y, 8); fill(220, 225, 240); textSize(12); push(); translate(x, y + 34 + (i % 2) * 16); text(o[0], -textWidth(o[0]) / 2, 0); pop(); });
  fill(220, 225, 240); textSize(15);
  text('となりの段と重なる所で「ものさし」を合わせる（較正）。下の段の誤差は、上の段すべてに伝わる', x0, height * 0.2);
  text('1 pc = ' + AU_PER_PC.toFixed(0) + ' AU = 3.26 光年。月から宇宙の果てまで、約 19 けた', x0, height * 0.2 + 26);
}

function keyPressed() {
  if (key >= '1' && key <= '3') stage = +key;
  if (key === ' ') playing = !playing;
  if (stage === 1) {
    if (key === UP_ARROW) { si = (si + 1) % NEARBY.length; measure(); }
    if (key === DOWN_ARROW) { si = (si + NEARBY.length - 1) % NEARBY.length; measure(); }
    if (key === 'm' || key === 'M') measure();
  }
  if (stage === 2) {
    if (key === RIGHT_ARROW) period = Math.min(100, period * 1.1);
    if (key === LEFT_ARROW) period = Math.max(1, period / 1.1);
    if (key === UP_ARROW) mApp = Math.max(-1, mApp - 0.5);
    if (key === DOWN_ARROW) mApp = Math.min(30, mApp + 0.5);
  }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('p = 0.1″ → d = 10 pc、プロキシマ（0.7685″）→ 1.30 pc', near(distPc(0.1), 10, 1e-9) && near(distPc(0.7685), 1.301, 0.001));
  check('1 pc = 206265 AU = 3.262 光年', near(AU_PER_PC, 206264.8, 0.5) && near(AU_PER_PC / AU_PER_LY, 3.2616, 0.001));
  let ts = [], xs = []; for (let k = 0; k < 12; k++) { ts.push(k / 12); xs.push(0.3792 * Math.cos(TWO_PI_ * (k / 12) + 0.7)); }
  check('誤差のない測定からは視差がぴったり求まる（cos・sin の最小二乗）', near(fitParallax(ts, xs), 0.3792, 1e-12));
  check('距離指数：10 pc で m − M = 0、1 kpc で 10、往復で元の距離', near(modulus(10), 0, 1e-12) && near(modulus(1000), 10, 1e-12) && near(distFromModulus(13.7 + plM(20), plM(20)), Math.pow(10, 13.7 / 5 + 1), 1e-6));
  check('周期-光度関係：P = 10 日で M_V = −4.05、周期 2 倍で 0.73 等明るい', near(plM(10), -4.05, 1e-12) && near(plM(10) - plM(20), 2.43 * Math.log10(2), 1e-12));
  check('5 等の差 = 明るさ 100 倍 = 距離 10 倍', near(distFromModulus(15, 0) / distFromModulus(10, 0), 10, 1e-9));
  let dC = distFromModulus(3.95, plM(5.366));
  check('δ ケフェウスの距離の目安は 200〜350 pc（吸収なし）', dC > 200 && dC < 350);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 で ↑↓ を押して、遠い星ほど円（視差）が小さくなることを確かめよう
// 2. NOISE を 0.1 にすると、ベガの距離はどれくらいばらつく？ M で何回か測りなおそう
// 3. 2 で周期を 30 日、見かけの等級を 25 にすると、どれくらい遠い？（ほかの銀河まで届く）
// 4. 3 のはしごで、自分が知っている天体の距離を objs に足してみよう
// 5. 光は 1 年に 1 光年進む。アンドロメダ銀河の光は、何年前に出た光？


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(isFinite(t) ? t : 0, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(isFinite(t) ? t : 0, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(80, 90, 120); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(160, 170, 195); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 225); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
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
