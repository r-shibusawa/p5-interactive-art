// ============================================
// 04 惑星の位置 ─ 軌道要素とケプラー方程式で「その日」の惑星の場所を計算する
// 平均近点角 M = L − ϖ（日付とともに一定の速さで増える）→ ケプラー方程式 E − e sin E = M をニュートン法で解く
// → 軌道面での位置 (a(cos E − e), a√(1−e²) sin E) → 3 回回転して黄道座標。真上（黄道の北）から見た図
// 公転周期 T と軌道長半径 a から、ケプラーの第 3 法則 T² / a³ = 1（年、AU）を実データで確かめる
// ←→ = 日付を進める・もどす / 1 = 1 日 2 = 1 週 3 = 1 か月 単位 / スペース = 自動で進める / Z = 内惑星 ⇔ 全惑星 / T = 今日
// ============================================

const NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const JP = { Mercury: '水星', Venus: '金星', Earth: '地球', Mars: '火星', Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星' };
const COLS = { Mercury: [190, 180, 170], Venus: [240, 210, 140], Earth: [90, 150, 240], Mars: [230, 110, 80], Jupiter: [220, 180, 130], Saturn: [230, 210, 150], Uranus: [150, 220, 230], Neptune: [110, 140, 250] };
const UNITS = [1, 7, 30.4375], UNIT_JP = ['1 日', '1 週', '1 か月'];
let jdNow, unit = 0, playing = false, outer = false, orbits = {}, trail = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  jdNow = Math.floor(jdNowUT() - 0.5) + 0.5;     // 今日の 0:00 UT
  for (let n of NAMES) {                        // 1 周ぶんの軌道（要素の変化はゆっくりなので 1 回だけ計算）
    let T = periodYr(n) * 365.25, pts = [];
    for (let k = 0; k <= 180; k++) pts.push(planetPos(n, jdNow + (k / 180) * T));
    orbits[n] = pts;
  }
  selfTest();
}

function draw() {
  background(6, 10, 28);
  if (playing && frameCount % 2 === 0) jdNow += UNITS[unit];
  let cx = width * 0.33, cy = height * 0.55, R = Math.min(width * 0.33, height * 0.42);
  let rmax = outer ? 31 : 1.75, sc = R / rmax, list = outer ? NAMES : NAMES.slice(0, 4);
  stroke(40, 50, 90); noFill(); for (let a = (outer ? 10 : 0.5); a <= rmax; a += (outer ? 10 : 0.5)) circle(cx, cy, 2 * a * sc);
  stroke(255, 255, 255, 50); line(cx, cy, cx + R, cy); noStroke(); fill(160, 170, 200); textSize(12); text('春分点の方向（黄経 0°）', cx + R - 140, cy - 6);
  noStroke(); fill(255, 210, 90); circle(cx, cy, outer ? 10 : 22);
  let P = {};
  for (let n of NAMES) P[n] = planetPos(n, jdNow);
  for (let n of list) {
    let c = COLS[n];
    stroke(c[0], c[1], c[2], 110); strokeWeight(1);
    polyline(orbits[n].map((p) => [cx + p[0] * sc, cy - p[1] * sc]));
    let p = P[n], x = cx + p[0] * sc, y = cy - p[1] * sc;
    noStroke(); fill(c[0], c[1], c[2]); circle(x, y, outer ? 10 : 14);
    fill(225, 228, 240); textSize(13); text(JP[n], x + 9, y - 7);
  }
  // 地球から火星への視線（04 → 05 逆行へのつなぎ）
  if (!outer) { let e = P.Earth, m = P.Mars; stroke(230, 110, 80, 90); line(cx + e[0] * sc, cy - e[1] * sc, cx + m[0] * sc, cy - m[1] * sc); }
  noStroke(); fill(150, 160, 190); textSize(12); text('円の間隔 ' + (outer ? '10' : '0.5') + ' AU', cx - R, cy + R + 4);

  // ---- 表
  let x0 = width - 470, y0 = 120, cw = [80, 70, 64, 74, 82, 70];
  fill(240, 236, 215); textSize(14);
  ['惑星', 'a [AU]', 'e', 'T [年]', 'T² / a³', '距離 r'].forEach((h, i) => text(h, x0 + cw.slice(0, i).reduce((s, v) => s + v, 0), y0));
  NAMES.forEach((n, j) => {
    let a = ELEM[n][0][0], T = periodYr(n), r = Math.hypot(...P[n]), c = COLS[n], y = y0 + 28 + j * 26;
    let cells = [JP[n], a.toFixed(3), ELEM[n][0][1].toFixed(3), T.toFixed(3), ((T * T) / (a * a * a)).toFixed(4), r.toFixed(3)];
    cells.forEach((v, i) => { fill(i === 0 ? color(c[0], c[1], c[2]) : i === 4 ? color(250, 225, 140) : color(215, 220, 235)); text(v, x0 + cw.slice(0, i).reduce((s, q) => s + q, 0), y); });
  });
  let g = { x: x0 + 10, y: y0 + 270, w: width - x0 - 50, h: Math.max(100, height - y0 - 360) };
  drawLogLog(g);

  noStroke(); fill(240, 236, 215); textSize(18);
  text('惑星の位置　｜ ←→ 日付　1 日 / 2 週 / 3 月 単位　スペース 自動　Z 内惑星 ⇔ 全惑星　T 今日', 20, 34);
  let mars = geoLonLat('Mars', jdNow);
  fill(250, 225, 140); textSize(16);
  text(dateStr(jdNow) + '（JD ' + jdNow.toFixed(1) + '）　単位 ' + UNIT_JP[unit] + (playing ? '　自動で進めている' : '') + '　太陽の黄経 ' + sunGeoLon(jdNow).toFixed(1) + '°　地球から見た火星の黄経 ' + mars[0].toFixed(1) + '°', 20, 60);
  drawSelfTest(20, height - 12);
}
// 両対数のグラフ：log T = 1.5 log a の直線に 8 個が乗る
function drawLogLog(g) {
  stroke(70, 80, 120); noFill(); rect(g.x, g.y, g.w, g.h);
  let X = (a) => g.x + ((Math.log10(a) + 0.6) / 2.2) * g.w, Y = (T) => g.y + g.h - ((Math.log10(T) + 0.8) / 3.2) * g.h;
  stroke(250, 225, 140, 140); line(X(0.3), Y(Math.pow(0.3, 1.5)), X(40), Y(Math.pow(40, 1.5)));
  noStroke();
  for (let n of NAMES) { let c = COLS[n]; fill(c[0], c[1], c[2]); circle(X(ELEM[n][0][0]), Y(periodYr(n)), 9); }
  fill(200, 205, 225); textSize(12);
  text('両対数：横 a、縦 T。線は T = a^1.5', g.x, g.y - 8);
  text('0.3 AU', g.x + 2, g.y + g.h + 14); text('40 AU', g.x + g.w - 36, g.y + g.h + 14);
}

function keyPressed() {
  if (key === RIGHT_ARROW) jdNow += UNITS[unit];
  if (key === LEFT_ARROW) jdNow -= UNITS[unit];
  if (key >= '1' && key <= '3') unit = +key - 1;
  if (key === ' ') playing = !playing;
  if (key === 'z' || key === 'Z') outer = !outer;
  if (key === 't' || key === 'T') jdNow = Math.floor(jdNowUT() - 0.5) + 0.5;
  jdNow = clampv(jdNow, 2378496.5, 2470171.5);   // 軌道要素が使える 1800〜2050 年に制限
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let worst = 0;
  for (let e of [0, 0.2, 0.5, 0.9]) for (let k = 0; k < 50; k++) { let M = -Math.PI + (k / 49) * 2 * Math.PI, E = solveKepler(M, e); worst = Math.max(worst, Math.abs(E - e * Math.sin(E) - M)); }
  check('ケプラー方程式の残り |E − e sin E − M| < 10⁻⁹（e = 0〜0.9）', worst < 1e-9);
  check('2000-01-01 12:00 UT = JD 2451545.0、日付にもどせる', near(jdFromDate(2000, 1, 1, 12), 2451545, 1e-9) && dateStr(jdFromDate(2024, 2, 29)) === '2024-02-29');
  let rs = []; for (let d = 0; d < 365; d++) rs.push(Math.hypot(...planetPos('Earth', jdFromDate(2025, 1, 1) + d)));
  let imin = rs.indexOf(Math.min(...rs));
  check('地球と太陽の距離は 0.983〜1.017 AU、いちばん近いのは 1 月はじめ', Math.min(...rs) > 0.982 && Math.max(...rs) < 1.018 && imin <= 7);
  check('8 惑星すべてで T² / a³ = 1 ± 1%（ケプラーの第 3 法則）', NAMES.every((n) => near((periodYr(n) ** 2) / ELEM[n][0][0] ** 3, 1, 0.01)));
  let j = jdFromDate(2020, 10, 13), el = wrap180(geoLonLat('Mars', j)[0] - sunGeoLon(j));
  check('2020-10-13 は火星の衝（地球から見て太陽の反対 180° ± 3°）', Math.abs(el) > 177);
  let j2 = jdFromDate(2020, 12, 21);
  check('2020-12-21 は木星と土星の大接近（地球から見た黄経の差 < 1°）', Math.abs(wrap180(geoLonLat('Jupiter', j2)[0] - geoLonLat('Saturn', j2)[0])) < 1);
  let p = planetPos('Mars', jdFromDate(2010, 5, 5)), a = ELEM.Mars[0][0], e = ELEM.Mars[0][1], r = Math.hypot(...p);
  check('火星の距離はいつも a(1 − e) と a(1 + e) の間', r >= a * (1 - e) - 0.001 && r <= a * (1 + e) + 0.001);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. T で今日にして、3（1 か月単位）とスペースで 1 年進めよう。いちばん速く回るのは？
// 2. 表の T² / a³ がどれも 1 に近いことを確かめよう。両対数のグラフで 8 個が 1 本の直線に乗る
// 3. 火星への赤い線を見ながら進め、地球が火星を追いこす日（衝）を探そう（2 年 2 か月ごと）
// 4. 自分の誕生日に合わせると、その日の惑星の並びがわかる
// 5. ELEM の e（離心率）を 0.5 にしてみると、軌道の形と速さの変わり方はどうなる？


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
// ---- 惑星の位置：J2000 の軌道要素（JPL の近似式、1800〜2050 年で誤差は数分角程度）
// [a (AU), e, I (度), L 平均黄経 (度), ϖ 近日点黄経 (度), Ω 昇交点黄経 (度)] と、それぞれの 1 世紀あたりの変化
const ELEM = {
  Mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  Venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  Earth:   [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  Mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  Jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  Saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  Uranus:  [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  Neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.01262724]],
};
// ケプラー方程式 E − e sin E = M をニュートン法で解く（M, E はラジアン）
function solveKepler(M, e) {
  let E = e < 0.8 ? M : (M < 0 ? -Math.PI : Math.PI);   // 最初の値（M は −π〜π）
  for (let i = 0; i < 30; i++) {
    let d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d; if (Math.abs(d) < 1e-13) break;
  }
  return E;
}
// 日付 jd の、太陽を中心とした黄道座標 [x, y, z]（AU）
function planetPos(name, jd) {
  let [p0, dp] = ELEM[name], T = (jd - 2451545.0) / 36525;
  let a = p0[0] + dp[0] * T, e = p0[1] + dp[1] * T, I = (p0[2] + dp[2] * T) * DEG;
  let L = p0[3] + dp[3] * T, w = p0[4] + dp[4] * T, O = (p0[5] + dp[5] * T) * DEG;
  let om = w * DEG - O, M = wrap180(L - w) * DEG, E = solveKepler(M, e);
  let xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  let co = Math.cos(om), so = Math.sin(om), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return [(co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp,
          (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp,
          so * sI * xp + co * sI * yp];
}
function periodYr(name) { return 36000 / ELEM[name][1][3]; }   // 公転周期 [年] = 360° ÷ 平均黄経の変化（1 年あたり）
// 地球から見た黄経・黄緯 [度]
function geoLonLat(name, jd) {
  let p = planetPos(name, jd), q = planetPos('Earth', jd), x = p[0] - q[0], y = p[1] - q[1], z = p[2] - q[2];
  return [wrap360(Math.atan2(y, x) / DEG), Math.atan2(z, Math.hypot(x, y)) / DEG];
}
function sunGeoLon(jd) { let q = planetPos('Earth', jd); return wrap360(Math.atan2(-q[1], -q[0]) / DEG); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
