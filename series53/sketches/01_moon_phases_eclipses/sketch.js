// ============================================
// 01 月の満ち欠けと日食・月食 ─ 新月のたびに日食が起きないのはなぜ？
// 太陽と月の黄経の差（離角）E から、光って見える割合 k = (1 − cos E) / 2
// 月の通り道（白道）は黄道から 5.1° 傾いている。交点の近くで新月 → 日食、満月 → 月食
// 平均の速さで計算した近似（実際の食の時刻とは数時間ずれることがある）
// スペース = 再生/停止 / ←→ = 速さ / N = 次の新月 / F = 次の満月 / E = 次の食 / R = 今日にもどる
// ============================================

const INC = 5.145;                     // ★ 白道の傾き [度]（0 にすると毎月 食が起こる）
const SOLAR_LIM = 1.5, LUNAR_LIM = 1.0;   // ★ 食が起こる月の黄緯 β の目安 [度]（日食・月食）
const SPEEDS = [0.05, 0.25, 1, 4, 15];   // 1 秒あたりに進む日数
let jdNow, playing = true, sp = 2, events = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  jdNow = jdNowUT();
  selfTest();
  makeEvents();
}
// 平均の黄経（2000-01-01 12:00 から d 日）と、白道の昇交点（18.6 年で 1 周、逆向きに回る）
function lonSun(jd) { return wrap360(280.460 + 0.9856474 * (jd - 2451545)); }
function lonMoon(jd) { return wrap360(218.316 + 13.176396 * (jd - 2451545)); }
function nodeLon(jd) { return wrap360(125.044 - 0.0529538 * (jd - 2451545)); }
function elong(jd) { return wrap360(lonMoon(jd) - lonSun(jd)); }
function moonBeta(jd) { return Math.asin(Math.sin(INC * DEG) * Math.sin((lonMoon(jd) - nodeLon(jd)) * DEG)) / DEG; }
function litFrac(E) { return (1 - Math.cos(E * DEG)) / 2; }
const RATE = 13.176396 - 0.9856474;    // 離角が増える速さ [度/日] → 朔望月 = 360 / RATE
function nextSyzygy(jd, target) { return jd + wrap360(target - elong(jd)) / RATE + (wrap360(target - elong(jd)) < 1e-9 ? 360 / RATE : 0); }
function eclipseAt(jd, isNew) { let b = Math.abs(moonBeta(jd)); return isNew ? (b < SOLAR_LIM ? '日食' : '') : (b < LUNAR_LIM ? '月食' : ''); }
// これから 1 年の新月・満月の一覧
function makeEvents() {
  events = []; let j = jdNow - 1;
  for (let k = 0; k < 26; k++) {
    let a = nextSyzygy(j, 0), b = nextSyzygy(j, 180), t = Math.min(a, b), isNew = a < b;
    events.push({ jd: t, isNew, beta: moonBeta(t), ecl: eclipseAt(t, isNew) }); j = t + 0.5;
  }
}

function draw() {
  background(10, 14, 32);
  if (playing) { jdNow += SPEEDS[sp] / 60; if (events.length && jdNow > events[1].jd) makeEvents(); }
  let E = elong(jdNow), k = litFrac(E), b = moonBeta(jdNow);
  // ---- 真上から（太陽の光は左から）
  let cx = width * 0.22, cy = height * 0.4, R = Math.min(width * 0.17, height * 0.27);
  for (let i = -5; i <= 5; i++) { stroke(255, 220, 130, 60); line(20, cy + i * R * 0.2, 70, cy + i * R * 0.2); }
  noStroke(); fill(255, 215, 110); textSize(13); text('太陽の光 →', 20, cy - R - 12);
  let nd = (nodeLon(jdNow) - lonSun(jdNow)) * DEG;   // 太陽の方向から見た交点の向き
  // 白道：黄道より上（北）の半分は実線、下は点線
  for (let i = 0; i < 72; i++) {
    let a0 = (i / 72) * TWO_PI, a1 = ((i + 1) / 72) * TWO_PI, up = Math.sin(a0 - nd) > 0;
    stroke(up ? color(200, 210, 255, 200) : color(200, 210, 255, 70)); strokeWeight(up ? 2 : 1);
    if (up || i % 2 === 0) line(cx - R * Math.cos(a0), cy + R * Math.sin(a0), cx - R * Math.cos(a1), cy + R * Math.sin(a1));
  }
  stroke(255, 150, 120); strokeWeight(1.5); line(cx - R * 1.15 * Math.cos(nd), cy + R * 1.15 * Math.sin(nd), cx + R * 1.15 * Math.cos(nd), cy - R * 1.15 * Math.sin(nd));
  noStroke(); fill(255, 150, 120); textSize(12); text('昇交点', cx - R * 1.2 * Math.cos(nd), cy + R * 1.2 * Math.sin(nd));
  fill(60, 120, 200); circle(cx, cy, 36); fill(20, 30, 60); arc(cx, cy, 36, 36, -HALF_PI, HALF_PI);   // 地球（右半分が夜）
  let mx = cx - R * Math.cos(E * DEG), my = cy + R * Math.sin(E * DEG);   // 北から見て反時計回り
  fill(40, 42, 55); circle(mx, my, 22); fill(240, 235, 210); arc(mx, my, 22, 22, HALF_PI, PI + HALF_PI);   // 月（左＝太陽側が明るい）
  fill(220); textSize(13); textAlign(CENTER);
  text('真上から（大きさ・距離は実際とちがう）。明るい白道 = 黄道より北', cx, cy + R + 50); textAlign(LEFT, BASELINE);

  // ---- 地球から見た月の形
  let fx = width * 0.55, fy = height * 0.33, fr = Math.min(110, height * 0.14);
  drawPhase(fx, fy, fr, E);
  fill(240, 236, 215); textSize(15); textAlign(CENTER);
  text('地球から見た月　光っている割合 k = ' + (k * 100).toFixed(1) + '%', fx, fy + fr + 30);
  text(phaseName(E), fx, fy + fr + 52); textAlign(LEFT, BASELINE);

  // ---- 横から：月の黄緯 β（黄道からの高さ）を時間で
  let gx = width * 0.4, gw = width - gx - 30, gy = height * 0.62, gh = height * 0.22, span = 365;
  stroke(70, 80, 120); noFill(); rect(gx, gy, gw, gh);
  let Y = (v) => gy + gh / 2 - (v / 6) * (gh / 2), X = (j) => gx + ((j - jdNow + 15) / span) * gw;
  noStroke(); fill(255, 210, 120, 40); rect(gx, Y(SOLAR_LIM), gw, Y(-SOLAR_LIM) - Y(SOLAR_LIM));
  stroke(255, 255, 255, 60); line(gx, Y(0), gx + gw, Y(0));
  let pts = []; for (let i = 0; i <= 300; i++) { let j = jdNow - 15 + (i / 300) * span; pts.push([X(j), Y(moonBeta(j))]); }
  stroke(200, 210, 255); strokeWeight(1.5); polyline(pts);
  for (let ev of events) {
    if (X(ev.jd) > gx + gw) continue;
    noStroke(); fill(ev.isNew ? color(30, 30, 40) : color(245, 240, 215)); stroke(200); strokeWeight(1); circle(X(ev.jd), Y(ev.beta), ev.ecl ? 14 : 8);
    if (ev.ecl) { noStroke(); fill(255, 140, 110); textSize(12); textAlign(CENTER); text(ev.ecl, X(ev.jd), Y(ev.beta) - 12); textAlign(LEFT, BASELINE); }
  }
  stroke(255, 200); line(X(jdNow), gy, X(jdNow), gy + gh);
  noStroke(); fill(200, 205, 225); textSize(13);
  text('月の黄緯 β（黄道からの高さ）これから 1 年 ─ ● 新月　○ 満月。帯の中（|β| < ' + SOLAR_LIM + '°）の新月だけが日食', gx, gy - 8);
  text('+6°', gx - 30, Y(6) + 10); text('−6°', gx - 30, Y(-6)); text('0°', gx - 22, Y(0) + 4);

  // ---- 次の食の一覧
  let ecl = events.filter((e) => e.ecl).slice(0, 3);
  fill(255, 175, 140); textSize(14);
  text('これからの食（目安）：' + (ecl.length ? ecl.map((e) => dateStr(e.jd) + ' ' + e.ecl + '（β = ' + e.beta.toFixed(2) + '°）').join('　') : 'なし'), gx, gy + gh + 30);

  noStroke(); fill(240, 236, 215); textSize(18);
  text('月の満ち欠けと日食・月食　｜ スペース 再生/停止　←→ 速さ　N 次の新月　F 次の満月　E 次の食　R 今日', 20, 34);
  fill(250, 225, 140); textSize(16);
  text(dateStr(jdNow) + '（UT）　速さ ' + SPEEDS[sp] + ' 日/秒　離角 E = ' + E.toFixed(1) + '°　月の黄緯 β = ' + b.toFixed(2) + '°　月齢 ≈ ' + (E / RATE).toFixed(1) + ' 日　朔望月 = 360° ÷ ' + RATE.toFixed(4) + '°/日 = ' + (360 / RATE).toFixed(3) + ' 日', 20, 62);
  drawSelfTest(20, height - 12);
}

// 月の形：明るい半円 ＋ 明暗の境目（だ円）。北半球から見て、満ちていくときは右が明るい
function drawPhase(x, y, r, E) {
  let c = Math.cos(E * DEG), waxing = E < 180, lit = color(245, 238, 210), dark = color(45, 47, 60);
  noStroke(); fill(dark); circle(x, y, 2 * r);
  fill(lit); if (waxing) arc(x, y, 2 * r, 2 * r, -HALF_PI, HALF_PI); else arc(x, y, 2 * r, 2 * r, HALF_PI, PI + HALF_PI);
  fill(c > 0 ? dark : lit); ellipse(x, y, 2 * r * Math.abs(c), 2 * r);
}
function phaseName(E) {
  let n = ['新月', '三日月のころ', '上弦', '満ちていく', '満月', '欠けていく', '下弦', '有明の月'];
  return n[Math.floor(wrap360(E + 22.5) / 45) % 8];
}

function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) sp = Math.min(SPEEDS.length - 1, sp + 1);
  if (key === LEFT_ARROW) sp = Math.max(0, sp - 1);
  if (key === 'n' || key === 'N') { jdNow = nextSyzygy(jdNow + 0.01, 0); playing = false; }
  if (key === 'f' || key === 'F') { jdNow = nextSyzygy(jdNow + 0.01, 180); playing = false; }
  if (key === 'e' || key === 'E') { let e = events.find((v) => v.ecl && v.jd > jdNow + 0.01); if (e) { jdNow = e.jd; playing = false; } }
  if (key === 'r' || key === 'R') jdNow = jdNowUT();
  makeEvents();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('光っている割合：新月 0、上弦 1/2、満月 1', near(litFrac(0), 0, 1e-12) && near(litFrac(90), 0.5, 1e-12) && near(litFrac(180), 1, 1e-12));
  check('朔望月 = 360 ÷ (月 − 太陽の速さ) ≈ 29.53 日', near(360 / RATE, 29.5306, 0.001));
  check('食の季節の間隔 = 180 ÷ (太陽 + 交点の速さ) ≈ 173.3 日', near(180 / (0.9856474 + 0.0529538), 173.31, 0.05));
  let jn = jdFromDate(2000, 1, 1), bs = []; for (let i = 0; i < 400; i++) bs.push(Math.abs(moonBeta(jn + i * 0.7)));
  check('月の黄緯 |β| の最大 = 白道の傾き 5.145°（交点では 0）', near(Math.max(...bs), INC, 0.02) && near(Math.min(...bs), 0, 0.2));
  let a = nextSyzygy(jdFromDate(2024, 4, 5), 0), c = nextSyzygy(jdFromDate(2024, 6, 3), 0);
  check('2024-04-08 の新月は交点の近く → 日食（実際に皆既日食）', dateStr(a) === '2024-04-08' && eclipseAt(a, true) === '日食');
  check('2024-06-06 の新月は交点から遠い（|β| > 4°）→ 食なし', dateStr(c) === '2024-06-06' && Math.abs(moonBeta(c)) > 4 && eclipseAt(c, true) === '');
  let f = nextSyzygy(jdFromDate(2025, 3, 11), 180);
  check('2025-03-14 の満月は月食（実際に皆既月食）', dateStr(f) === '2025-03-14' && eclipseAt(f, false) === '月食');
  let ns = 0, j = jdFromDate(2000, 1, 1); for (let i = 0; i < 1237; i++) { let t = nextSyzygy(j, 0); if (eclipseAt(t, true)) ns++; j = t + 1; }
  check('100 年で数えた日食は 1 年に約 2.4 回（実際の平均に近い）', ns / 100 > 2.1 && ns / 100 < 2.6);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. N を何回か押して新月ごとの β を見よう。帯（|β| < 1.5°）に入るのは何回に 1 回？
// 2. E で次の食へ。そのとき「交点の線」と太陽の方向はどうなっている？
// 3. INC を 0 にすると？ 毎月、日食と月食が起こってしまう
// 4. 食は約 173 日ごとの「食の季節」にまとまって起こる。一覧の日付の間隔を計算しよう
// 5. 月の形を描く drawPhase を使って、1 か月の月の形を 1 枚に並べたポスターを作ろう


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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
