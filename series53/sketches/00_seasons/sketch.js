// ============================================
// 00 昼と夜・季節 ─ 地軸の傾き 23.44° が、昼の長さと日射量を変える
// 日付から太陽の黄経 λ を計算し、赤緯 δ = asin(sin ε · sin λ)（ε = 地軸の傾き）
// 緯度 φ での昼の長さ = 2·H₀ ÷ 15°（cos H₀ = −tan φ · tan δ）、南中高度 = 90° − |φ − δ|
// 1 日の平均日射量 Q = (S₀/π)(1/r²)(H₀ sin φ sin δ + cos φ cos δ sin H₀)　← 大気の外での値
// ↑↓ = 緯度 / ←→ = 日付（Shift で 10 日）/ スペース = 1 年を早送り / T = 傾き 23.44° → 0° → 45° / グラフをドラッグ = 日付
// ============================================

const S0 = 1361;                       // ★ 太陽定数 [W/m²]（地球の位置で太陽に垂直な面が受ける光）
const TILTS = [23.44, 0, 45];          // ★ T キーで切りかえる地軸の傾き [度]
let tilt = 23.44, lat = 35, doy = 172, playing = false;   // ★ 緯度（35° ≒ 東京）と日付（1 月 1 日 = 1）
let curves = null;                     // 1 年分のグラフ（緯度・傾きを変えたときだけ計算しなおす）
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  makeCurves();
}

// 日付（1〜365）→ 太陽の黄経 λ と、地球と太陽の距離 r [AU]（簡単な式、誤差は 0.01° 程度）
function sunOf(d) {
  let n = d - 1 + 9132;                // 2025 年のその日の正午（2000-01-01 12:00 からの日数）
  let L = 280.460 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * DEG;
  let lam = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return { lam: wrap360(lam), r: 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g) };
}
function declination(d, eps) { return Math.asin(Math.sin(eps * DEG) * Math.sin(sunOf(d).lam * DEG)) / DEG; }
// 日の出から日の入りまでの時角の半分 H₀ [度]（0 = 白夜の反対の極夜、180 = 白夜）
function halfDay(phi, dec) {
  let c = -Math.tan(clampv(phi, -89.99, 89.99) * DEG) * Math.tan(dec * DEG);
  return Math.acos(clampv(c, -1, 1)) / DEG;      // |c| > 1 のときは 0° か 180° にする（NaN にしない）
}
function dayLength(phi, dec) { return (2 * halfDay(phi, dec)) / 15; }   // [時間]（太陽の中心で、大気の屈折なし）
function noonAlt(phi, dec) { return 90 - Math.abs(phi - dec); }
function insolation(phi, dec, r) {
  let H = halfDay(phi, dec) * DEG, p = phi * DEG, q = dec * DEG;
  return Math.max(0, (S0 / Math.PI / (r * r)) * (H * Math.sin(p) * Math.sin(q) + Math.cos(p) * Math.cos(q) * Math.sin(H)));
}
function makeCurves() {
  curves = [];
  for (let d = 1; d <= 365; d++) { let s = sunOf(d), q = declination(d, tilt); curves.push({ dl: dayLength(lat, q), alt: noonAlt(lat, q), Q: insolation(lat, q, s.r) }); }
}

function draw() {
  background(12, 16, 34);
  if (playing) { doy += 1; if (doy > 365) doy = 1; }
  let s = sunOf(doy), dec = declination(doy, tilt), dl = dayLength(lat, dec), alt = noonAlt(lat, dec), Q = insolation(lat, dec, s.r);
  drawEarthSide(240, height * 0.36, Math.min(150, height * 0.18), dec);
  drawOrbitTop(240, height * 0.8, Math.min(130, height * 0.15));

  // ---- 1 年のグラフ 3 つ
  let gx = 540, gw = width - gx - 40, gh = (height - 210) / 3 - 34;
  let G = [
    { key: 'dl', y0: 0, y1: 24, lab: '昼の長さ [時間]', ticks: [0, 6, 12, 18, 24], col: color(250, 225, 140) },
    { key: 'alt', y0: -30, y1: 90, lab: '南中高度 [度]', ticks: [-30, 0, 30, 60, 90], col: color(230, 150, 90) },
    { key: 'Q', y0: 0, y1: 600, lab: '1 日の平均日射量 [W/m²]（大気の外）', ticks: [0, 200, 400, 600], col: color(140, 190, 255) },
  ];
  G.forEach((o, i) => {
    let g = { x: gx, y: 120 + i * (gh + 52), w: gw, h: gh, x0: 1, x1: 365, y0: o.y0, y1: o.y1 };
    o.g = g;
    plotAxes(g, i === 2 ? '日付' : '', o.lab, [], o.ticks);
    textSize(11); fill(120, 130, 160); textAlign(CENTER, TOP);
    for (let m = 0; m < 12; m++) text(MONTHS[m], gX(g, 15 + m * 30.4), g.y + g.h + 4);
    textAlign(LEFT, BASELINE);
    stroke(o.col); strokeWeight(2.5); polyline(curves.map((c, k) => [gX(g, k + 1), gY(g, c[o.key])]));
    stroke(255, 120); strokeWeight(1); line(gX(g, doy), g.y, gX(g, doy), g.y + g.h);
    noStroke(); fill(o.col); circle(gX(g, doy), gY(g, curves[doy - 1][o.key]), 10);
  });

  // ---- 文字
  noStroke(); fill(240, 236, 215); textSize(18);
  text('昼と夜・季節　｜ ↑↓ 緯度　←→ 日付（Shift で 10 日）　スペース 早送り　T 傾き　グラフをドラッグ', 20, 34);
  fill(250, 225, 140); textSize(16);
  text(dateLabel(doy) + '　緯度 φ = ' + lat + '°　地軸の傾き ε = ' + tilt + '°　太陽の黄経 λ = ' + s.lam.toFixed(1) + '°　赤緯 δ = ' + dec.toFixed(2) + '°', 20, 62);
  fill(225, 228, 240); textSize(15);
  let H0 = halfDay(lat, dec);
  text('昼の長さ = 2·H₀/15° = ' + dl.toFixed(2) + ' 時間（H₀ = ' + H0.toFixed(1) + '°）' + (H0 >= 180 ? '　白夜' : H0 <= 0 ? '　極夜' : '') +
       '　南中高度 = ' + alt.toFixed(1) + '°　日射量 Q = ' + Q.toFixed(0) + ' W/m²　太陽までの距離 r = ' + s.r.toFixed(4) + ' AU', 20, 88);
  if (tilt === 0) { fill(255, 170, 120); text('傾き 0°：どの日も δ = 0 → 昼はいつも 12 時間、季節がなくなる', gx, height - 34); }
  drawSelfTest(20, height - 12);
}

// 横から見た地球：太陽の光は右から。地軸は光の方向へ δ だけ傾いて見える
function drawEarthSide(cx, cy, R, dec) {
  noStroke(); fill(255, 230, 150, 40);
  for (let i = -4; i <= 4; i++) { stroke(255, 225, 140, 90); line(cx + R + 20, cy + i * R * 0.24, cx + R + 80, cy + i * R * 0.24); line(cx + R + 20, cy + i * R * 0.24, cx + R + 28, cy + i * R * 0.24 - 4); }
  noStroke(); fill(30, 50, 100); circle(cx, cy, 2 * R);
  fill(70, 130, 200); arc(cx, cy, 2 * R, 2 * R, -HALF_PI, HALF_PI, CHORD);   // 昼の側（右半分）
  push(); translate(cx, cy); rotate(dec * DEG);    // 地球の座標：上が北極（δ > 0 なら北極が太陽のほうへ）
  stroke(255); strokeWeight(2); line(0, -R * 1.25, 0, R * 1.25);
  stroke(200, 210, 240, 120); strokeWeight(1);
  for (let la of [66.56, 23.44, 0, -23.44, -66.56]) { let y = -R * Math.sin(la * DEG), x = R * Math.cos(la * DEG); line(-x, y, x, y); }
  let y = -R * Math.sin(lat * DEG), x = R * Math.cos(lat * DEG);
  stroke(250, 225, 140); strokeWeight(3); line(-x, y, x, y);
  noStroke(); fill(255, 200, 90); circle(x, y, 12);   // 正午の地点
  pop();
  noStroke(); fill(220, 225, 240); textSize(13); textAlign(CENTER);
  text('横から（光は右から、左半分が夜）。黄色の線 = 緯度 ' + lat + '° の 1 日の通り道', cx, cy + R + 44);
  text('右側（昼）にある部分の割合 = 昼の長さ ÷ 24 時間', cx, cy + R + 62);
  textAlign(LEFT, BASELINE);
}
// 真上から見た公転：地軸はいつも同じ向き（北極は図の右上へ傾く）
function drawOrbitTop(cx, cy, R) {
  noFill(); stroke(90, 100, 140); ellipse(cx, cy, 2.4 * R, 2 * R * 0.62);
  noStroke(); fill(255, 210, 100); circle(cx, cy, 24);
  let a = (sunOf(doy).lam + 180) * DEG, ex = cx + 1.2 * R * Math.cos(a), ey = cy - 0.62 * R * Math.sin(a);
  fill(70, 130, 200); circle(ex, ey, 18);
  stroke(255); strokeWeight(2); let t = Math.sin(tilt * DEG) * 22; line(ex - t, ey + 22 * Math.cos(tilt * DEG) * 0.4, ex + t, ey - 22 * Math.cos(tilt * DEG) * 0.4 - 10);
  noStroke(); fill(200, 205, 225); textSize(12); textAlign(CENTER);
  text('春分', cx - 1.2 * R - 20, cy + 4); text('秋分', cx + 1.2 * R + 22, cy + 4); text('冬至', cx, cy - 0.62 * R - 8); text('夏至', cx, cy + 0.62 * R + 18);
  text('真上から（地軸の向きは 1 年中同じ）', cx, cy + R * 0.62 + 40); textAlign(LEFT, BASELINE);
}
function dateLabel(d) { let cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365], m = 0; while (d > cum[m + 1]) m++; return (m + 1) + '月' + (d - cum[m]) + '日（' + d + ' 日目）'; }

function keyPressed() {
  let st = keyIsDown(SHIFT) ? 10 : 1;
  if (key === UP_ARROW) lat = Math.min(90, lat + 5);
  if (key === DOWN_ARROW) lat = Math.max(-90, lat - 5);
  if (key === RIGHT_ARROW) doy = ((doy - 1 + st) % 365) + 1;
  if (key === LEFT_ARROW) doy = ((doy - 1 - st + 365 * 10) % 365) + 1;
  if (key === ' ') playing = !playing;
  if (key === 't' || key === 'T') tilt = TILTS[(TILTS.indexOf(tilt) + 1) % TILTS.length];
  makeCurves();
  return false;
}
function mouseDragged() { if (mouseX > 540 && mouseX < width - 40) doy = clampv(Math.round(1 + ((mouseX - 540) / (width - 580)) * 364), 1, 365); }
function mousePressed() { mouseDragged(); }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('春分・秋分（δ = 0）は、どの緯度でも昼が 12 時間', [0, 35, 60, -45, 80].every((p) => near(dayLength(p, 0), 12, 1e-9)));
  check('夏至の南中高度（北緯 35°）= 90 − 35 + 23.44 = 78.44°', near(noonAlt(35, 23.44), 78.44, 1e-9));
  check('北極圏（70°N）の冬至は極夜（昼 0 時間）、夏至は白夜（24 時間）', near(dayLength(70, -23.44), 0, 1e-9) && near(dayLength(70, 23.44), 24, 1e-9));
  check('傾き 0° なら、北緯 50° でも 1 年中ずっと昼 12 時間', Array.from({ length: 365 }, (_, i) => dayLength(50, declination(i + 1, 0))).every((h) => near(h, 12, 1e-9)));
  check('赤道・春分・r = 1 の日射量 = S₀/π ≈ 433 W/m²', near(insolation(0, 0, 1), S0 / Math.PI, 1e-9) && near(S0 / Math.PI, 433.2, 0.1));
  let ds = Array.from({ length: 365 }, (_, i) => declination(i + 1, 23.44)), imax = ds.indexOf(Math.max(...ds));
  check('1 年の赤緯の最大 ≈ 23.44°、その日は夏至のころ（6 月 19〜23 日）', near(ds[imax], 23.44, 0.05) && imax + 1 >= 170 && imax + 1 <= 174);
  let rs = Array.from({ length: 365 }, (_, i) => sunOf(i + 1).r), rmin = rs.indexOf(Math.min(...rs));
  check('太陽にいちばん近い日（近日点）は 1 月はじめ、r ≈ 0.983 AU', rmin + 1 <= 8 && near(rs[rmin], 0.9833, 0.001));
  check('昼の長さは北半球と南半球で足すと 24 時間（δ ≠ 0 でも）', near(dayLength(40, 15) + dayLength(-40, 15), 24, 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で緯度を 0°（赤道）、35°、66.6°（北極圏）、90° にして、昼の長さのグラフの形を比べよう
// 2. T で傾きを 0° に。グラフが平らになる = 季節がなくなる。45° にすると？
// 3. 夏至の日射量は、赤道と北極ではどちらが大きい？（北極は 1 日中日が当たる）
// 4. 南半球（−35°）にして、季節が逆になることを確かめよう
// 5. S0 を変えると、どのグラフが変わる？ 昼の長さは変わる？


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
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
