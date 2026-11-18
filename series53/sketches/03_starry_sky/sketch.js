// ============================================
// 03 星空の回転 ─ 赤経・赤緯から「いま、どの高さ・方角に見えるか」を計算する
// 地方恒星時 LST = グリニッジ恒星時 + 経度、時角 H = LST − 赤経 α
// 高度：sin h = sin φ sin δ + cos φ cos δ cos H　方位：A = atan2(−cos δ sin H, sin δ cos φ − cos δ cos H sin φ)
// 図は真上を見上げた全天（中心 = 天頂、円 = 地平線、上が北・左が東）。星の位置は J2000（誤差 1° 未満）
// ↑↓ = 緯度 / ←→ = 1 時間（Shift で 1 日）/ スペース = 早送り / T = 軌跡 / C = 星座の線 / R = いまの時刻
// ============================================

const LON = 139.7, TZ = 9;             // ★ 経度 [度、東が +] と時差 [時間]（東京）
let lat = 35.7, jdNow, fast = false, trails = false, lines = true, trailG;
// 明るい星：名前、赤経 [時]、赤緯 [度]、等級（J2000、おおよその値）
const STARS = [
  ['北極星', 2.530, 89.264, 2.0], ['シリウス', 6.7525, -16.716, -1.46], ['カノープス', 6.399, -52.696, -0.74], ['アークトゥルス', 14.261, 19.182, -0.05],
  ['ベガ', 18.6156, 38.784, 0.03], ['カペラ', 5.2782, 45.998, 0.08], ['リゲル', 5.2423, -8.202, 0.13], ['プロキオン', 7.655, 5.225, 0.34],
  ['ベテルギウス', 5.9195, 7.407, 0.5], ['アケルナル', 1.6286, -57.237, 0.46], ['アルタイル', 19.8464, 8.868, 0.77], ['アルデバラン', 4.5987, 16.509, 0.85],
  ['アンタレス', 16.4901, -26.432, 1.0], ['スピカ', 13.4199, -11.161, 0.97], ['ポルックス', 7.7553, 28.026, 1.14], ['フォーマルハウト', 22.9608, -29.622, 1.16],
  ['デネブ', 20.6905, 45.280, 1.25], ['レグルス', 10.1395, 11.967, 1.35], ['アクルックス', 12.4433, -63.099, 0.76], ['ハダル', 14.0637, -60.373, 0.61],
  ['リギル・ケンタウルス', 14.660, -60.835, -0.27], ['ミモザ', 12.7953, -59.689, 1.25], ['ガクルックス', 12.5194, -57.113, 1.64], ['イマイ', 12.2524, -58.749, 2.8],
  ['ベラトリクス', 5.4189, 6.350, 1.64], ['アルニタク', 5.6793, -1.943, 1.77], ['アルニラム', 5.6036, -1.202, 1.69], ['ミンタカ', 5.5334, -0.299, 2.23],
  ['サイフ', 5.7959, -9.670, 2.06], ['カストル', 7.5767, 31.888, 1.58], ['ドゥーベ', 11.0621, 61.751, 1.79], ['メラク', 11.0307, 56.383, 2.37],
  ['フェクダ', 11.8972, 53.695, 2.44], ['メグレズ', 12.2571, 57.033, 3.31], ['アリオト', 12.9005, 55.960, 1.77], ['ミザール', 13.3988, 54.925, 2.23],
  ['アルカイド', 13.7923, 49.313, 1.86], ['カフ', 0.1529, 59.150, 2.27], ['シェダル', 0.6751, 56.537, 2.24], ['ツィー', 0.9451, 60.717, 2.47],
  ['ルクバー', 1.4302, 60.235, 2.68], ['セギン', 1.9066, 63.670, 3.37], ['サドル', 20.3705, 40.257, 2.23], ['アルビレオ', 19.512, 27.960, 3.1],
  ['コカブ', 14.8451, 74.156, 2.08], ['ミルファク', 3.4054, 49.861, 1.79], ['アルゴル', 3.1361, 40.956, 2.1], ['アルフェラッツ', 0.1398, 29.091, 2.06],
  ['エルナト', 5.4382, 28.608, 1.65], ['デネボラ', 11.8177, 14.572, 2.14], ['シャウラ', 17.5601, -37.104, 1.62], ['アルキオネ（すばる）', 3.7914, 24.105, 2.87],
];
// 星座の線（STARS の名前で）
const CLINES = [['ベテルギウス', 'ベラトリクス'], ['ベラトリクス', 'ミンタカ'], ['ミンタカ', 'アルニラム'], ['アルニラム', 'アルニタク'], ['アルニタク', 'サイフ'], ['ミンタカ', 'リゲル'], ['ベテルギウス', 'アルニタク'],
  ['ドゥーベ', 'メラク'], ['メラク', 'フェクダ'], ['フェクダ', 'メグレズ'], ['メグレズ', 'ドゥーベ'], ['メグレズ', 'アリオト'], ['アリオト', 'ミザール'], ['ミザール', 'アルカイド'],
  ['カフ', 'シェダル'], ['シェダル', 'ツィー'], ['ツィー', 'ルクバー'], ['ルクバー', 'セギン'], ['デネブ', 'サドル'], ['サドル', 'アルビレオ'],
  ['アクルックス', 'ガクルックス'], ['ミモザ', 'イマイ'], ['カストル', 'ポルックス'],
  ['ベガ', 'デネブ', 1], ['デネブ', 'アルタイル', 1], ['アルタイル', 'ベガ', 1], ['ベテルギウス', 'シリウス', 1], ['シリウス', 'プロキオン', 1], ['プロキオン', 'ベテルギウス', 1]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  trailG = createGraphics(width, height); trailG.pixelDensity(1);
  jdNow = jdNowUT();
  selfTest();
}
// グリニッジ平均恒星時 [度]（J2000.0 で 280.46°、1 日に 360.9856°）
function gmst(jd) { return wrap360(280.46061837 + 360.98564736629 * (jd - 2451545.0)); }
// 赤経 α [時]・赤緯 δ [度] → 高度 h・方位 A [度]（A は北から東まわり）
function altAz(raH, dec, phi, lstDeg) {
  let H = (lstDeg - raH * 15) * DEG, d = dec * DEG, p = phi * DEG;
  let sh = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H);
  let A = Math.atan2(-Math.cos(d) * Math.sin(H), Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.cos(H) * Math.sin(p));
  return [Math.asin(clampv(sh, -1, 1)) / DEG, wrap360(A / DEG)];
}
// 全天の図の座標（中心 = 天頂、半径 = 地平線。上が北、左が東）
function skyXY(alt, az, cx, cy, R) { let r = ((90 - alt) / 90) * R; return [cx - r * Math.sin(az * DEG), cy - r * Math.cos(az * DEG)]; }
function sepDeg(a, b) {                // 2 つの星の角距離 [度]
  let [r1, d1] = [a[1] * 15 * DEG, a[2] * DEG], [r2, d2] = [b[1] * 15 * DEG, b[2] * DEG];
  return Math.acos(clampv(Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2), -1, 1)) / DEG;
}
const byName = (n) => STARS.find((s) => s[0] === n);

function draw() {
  background(4, 8, 24);
  if (fast) jdNow += 1 / (24 * 60) * 4;   // 1 フレームで 4 分（1 秒で 4 時間）
  let lst = wrap360(gmst(jdNow) + LON), cx = width * 0.4, cy = height * 0.55, R = Math.min(width * 0.36, height * 0.41);
  noStroke(); fill(14, 22, 52); circle(cx, cy, 2 * R);
  stroke(60, 70, 110); noFill(); circle(cx, cy, (2 * R) / 3); circle(cx, cy, (4 * R) / 3);
  line(cx - R, cy, cx + R, cy); line(cx, cy - R, cx, cy + R);
  if (trails) image(trailG, 0, 0);
  let P = STARS.map((s) => { let [h, A] = altAz(s[1], s[2], lat, lst); return { s, h, A, xy: skyXY(h, A, cx, cy, R) }; });
  if (lines) for (let L of CLINES) {
    let a = P.find((p) => p.s[0] === L[0]), b = P.find((p) => p.s[0] === L[1]);
    if (a.h < 0 || b.h < 0) continue;
    stroke(L[2] ? color(255, 210, 120, 90) : color(130, 160, 230, 150)); strokeWeight(L[2] ? 1 : 1.5);
    line(a.xy[0], a.xy[1], b.xy[0], b.xy[1]);
  }
  noStroke(); textSize(11);
  for (let p of P) {
    if (p.h < 0) continue;
    let r = clampv(7 - 1.6 * p.s[3], 1.5, 10);
    fill(255, 250, 225); circle(p.xy[0], p.xy[1], r);
    if (p.s[3] < 1.3 || p.s[0] === '北極星') { fill(200, 205, 230); text(p.s[0], p.xy[0] + 6, p.xy[1] - 4); }
  }
  if (trails) { trailG.noStroke(); trailG.fill(255, 240, 200, 120); for (let p of P) if (p.h >= 0) trailG.circle(p.xy[0], p.xy[1], 1.6); }
  fill(250, 225, 140); textSize(16); textAlign(CENTER);
  text('北', cx, cy - R - 8); text('南', cx, cy + R + 20); text('東', cx - R - 16, cy + 6); text('西', cx + R + 16, cy + 6);
  textAlign(LEFT, BASELINE);
  // ---- 右の表：明るい星の高度と方位
  let x0 = width * 0.78, y0 = 120, vis = P.filter((p) => p.h > 0).sort((a, b) => a.s[3] - b.s[3]).slice(0, 14);
  fill(240, 236, 215); textSize(14); text('見えている明るい星（高度 / 方位）', x0, y0 - 14);
  textSize(13);
  vis.forEach((p, i) => { fill(220, 225, 240); text(p.s[0], x0, y0 + 10 + i * 22); fill(250, 225, 140); text(p.h.toFixed(1) + '° / ' + p.A.toFixed(0) + '°', x0 + 140, y0 + 10 + i * 22); });
  let pol = P[0];
  fill(160, 200, 255); text('北極星の高度 ' + pol.h.toFixed(2) + '° ≈ 緯度 ' + lat.toFixed(1) + '°', x0, y0 + 22 * 14 + 30);
  let lt = dateFromJd(jdNow + TZ / 24);
  noStroke(); fill(240, 236, 215); textSize(18);
  text('星空の回転　｜ ↑↓ 緯度　←→ 1 時間（Shift で 1 日）　スペース 早送り　T 軌跡　C 星座の線　R いま', 20, 34);
  fill(250, 225, 140); textSize(15);
  text(dateStr(jdNow + TZ / 24) + ' ' + String(Math.floor(lt.h)).padStart(2, '0') + ':' + String(Math.floor((lt.h % 1) * 60)).padStart(2, '0') + '（UTC+' + TZ + '）　緯度 ' + lat.toFixed(1) + '°　経度 ' + LON + '°　地方恒星時 LST = ' + (lst / 15).toFixed(3) + ' 時' + (fast ? '　早送り中' : ''), 20, 60);
  drawSelfTest(20, height - 12);
}

function keyPressed() {
  let moved = true;
  if (key === UP_ARROW) lat = Math.min(90, lat + 5);
  else if (key === DOWN_ARROW) lat = Math.max(-90, lat - 5);
  else if (key === RIGHT_ARROW) jdNow += keyIsDown(SHIFT) ? 1 : 1 / 24;
  else if (key === LEFT_ARROW) jdNow -= keyIsDown(SHIFT) ? 1 : 1 / 24;
  else if (key === 'r' || key === 'R') jdNow = jdNowUT();
  else moved = false;
  if (moved) trailG.clear();
  if (key === ' ') fast = !fast;
  if (key === 't' || key === 'T') { trails = !trails; trailG.clear(); }
  if (key === 'c' || key === 'C') lines = !lines;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('J2000.0（2000-01-01 12:00 UT）のグリニッジ恒星時 = 18.697 時', near(gmst(2451545.0) / 15, 18.6973, 0.001));
  check('恒星時は 1 太陽日で 3 分 56 秒進む（1 恒星日 = 23 時間 56 分 4 秒）', near(86400 * 360 / 360.98564736629, 86164.09, 0.05));
  let pol = byName('北極星');
  check('北極星の高度 ≈ 緯度（35°N、どの時刻でも 1° 以内）', [0, 90, 180, 270].every((L) => near(altAz(pol[1], pol[2], 35, L)[0], 35, 0.75)));
  let v = byName('ベガ'), mer = altAz(v[1], v[2], 35, v[1] * 15);
  check('南中（H = 0）の高度 = 90° − |φ − δ|（ベガ、35°N で 86.2°、方位は北 = 天頂の向こう側）', near(mer[0], 90 - Math.abs(35 - v[2]), 1e-9) && near(mer[1], 0, 1e-6));
  let si = byName('シリウス'), hs = []; for (let L = 0; L < 360; L += 5) hs.push(altAz(si[1], si[2], 80, L)[0]);
  check('北緯 80° ではシリウス（δ = −16.7°）は 1 日中のぼらない', Math.max(...hs) < 0);
  let du = byName('ドゥーベ'), hd = []; for (let L = 0; L < 360; L += 5) hd.push(altAz(du[1], du[2], 35, L)[0]);
  check('35°N でドゥーベ（δ = 61.8° > 90° − 35°）は沈まない（周極星）', Math.min(...hd) > 0);
  check('北斗七星の指極星ドゥーベとメラクの間は約 5.4°', near(sepDeg(du, byName('メラク')), 5.4, 0.15));
  check('東の地平線（方位 90°）は図の左はし、天頂は中心', near(skyXY(0, 90, 0, 0, 100)[0], -100, 1e-9) && near(skyXY(90, 0, 0, 0, 100)[0], 0, 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースと T で軌跡を描こう。北極星のまわりを回る中心はどこ？ 1 時間で何度回る？（約 15°）
// 2. ↑↓ で緯度を 90°（北極）、0°（赤道）、−35°（南半球）に。軌跡の形はどう変わる？
// 3. Shift + →で 1 日ずつ進めると、同じ時刻の星空は 1 日に約 1° 西へずれる（1 か月で 2 時間ぶん）
// 4. 南十字星（アクルックス）が見えるのは緯度何度より南？（δ = −63° から考えよう）
// 5. STARS に好きな星を足して、自分の星座の線を CLINES に加えよう


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
// ---- 日付 ⇔ ユリウス日 JD（グレゴリオ暦、時刻は世界時 UT。2000-01-01 12:00 UT = 2451545.0）
function jdFromDate(Y, M, D, h) {
  if (M <= 2) { Y -= 1; M += 12; }
  let A = Math.floor(Y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5 + (h || 0) / 24;
}
function dateFromJd(jd) {
  let Z = Math.floor(jd + 0.5), F = jd + 0.5 - Z, al = Math.floor((Z - 1867216.25) / 36524.25);
  let A = Z + 1 + al - Math.floor(al / 4), B = A + 1524, C = Math.floor((B - 122.1) / 365.25), Dd = Math.floor(365.25 * C), E = Math.floor((B - Dd) / 30.6001);
  let D = B - Dd - Math.floor(30.6001 * E), M = E < 14 ? E - 1 : E - 13, Y = M > 2 ? C - 4716 : C - 4715;
  return { Y, M, D, h: F * 24 };
}
function dateStr(jd) { let d = dateFromJd(jd); return d.Y + '-' + String(d.M).padStart(2, '0') + '-' + String(d.D).padStart(2, '0'); }
function jdNowUT() { return 2440587.5 + Date.now() / 86400000; }   // いまの JD（1970-01-01 0:00 UT = 2440587.5）
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
