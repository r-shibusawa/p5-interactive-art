// ============================================
// 06 冷凍機とヒートポンプ ─ サイクルを逆に回すと、低温から高温へ熱を運べる
// 仕事 W を使って、外（低温 Tc）から熱 Qc をくみ上げ、部屋（高温 Th）へ Qh = Qc + W を出す
// 成績係数 COP = Qh / W。カルノーの上限は Th/(Th − Tc)（逆カルノーサイクルを数値で回して確かめる）
// 下：同じ家を「ヒートポンプ」と「電気ヒーター（COP = 1）」で温めて、使った電気を比べる
// ← → 外の気温 / ↑↓ 設定温度 / M 暖房 ⇔ 冷房 / スペース 一時停止 / R やり直し
// ============================================

const N_MOL = 1, R_GAS = 8.314;
const EFF = 0.45;                      // ★ 本物の機械はカルノーの何倍の COP か（0.4〜0.5 くらい）
const DT_HX = 5;                       // ★ 熱交換器の温度差 [K]（部屋より 5 K 熱く、外より 5 K 冷たくしないと熱が流れない）
const UA = 50;                         // ★ 家の熱の逃げやすさ [W/K]
const C_ROOM = 4e6;                    // ★ 家の熱容量 [J/K]
const P_IN = 2000;                     // ★ ヒートポンプ・ヒーターの電力 [W]
const DT_SIM = 30;                     // ★ 1 回の計算で進む時間 [秒]（1 コマ 20 回 = 10 分）
let tOut = 0, tSet = 20, cooling = false, paused = false, rooms, logT = [], simTime = 0;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); resetRooms(); }
function resetRooms() { rooms = [{ name: 'ヒートポンプ', t: tOut, on: false, kwh: 0, pump: true }, { name: '電気ヒーター', t: tOut, on: false, kwh: 0, pump: false }]; logT = []; simTime = 0; }

// 逆カルノーサイクル（04・05 と同じ数値積分）。tc で等温膨張して熱を吸い、th で等温圧縮して熱を出す
function legIso(V1, V2, t, nsub) { let W = 0; for (let i = 0; i < nsub; i++) { let a = V1 + ((V2 - V1) * i) / nsub, b = V1 + ((V2 - V1) * (i + 1)) / nsub; W += 0.5 * N_MOL * R_GAS * t * (1 / a + 1 / b) * (b - a); } return W; }   // 等温：Q = W
function legAdi(V1, t1, V2, g, nsub) { let W = 0; for (let i = 0; i < nsub; i++) { let a = V1 + ((V2 - V1) * i) / nsub, b = V1 + ((V2 - V1) * (i + 1)) / nsub, ta = t1 * Math.pow(V1 / a, g - 1), tb = t1 * Math.pow(V1 / b, g - 1); W += 0.5 * N_MOL * R_GAS * (ta / a + tb / b) * (b - a); } return W; }
function reverseCarnot(th, tc, nsub) {
  let g = 1.4, e = 1 / (g - 1), VA = 10, VB = 25, VC = VB * Math.pow(th / tc, e), VD = VA * Math.pow(th / tc, e);
  // 逆回り：A → D（断熱膨張で冷える）→ C（tc で等温膨張、熱 Qc を吸う）→ B（断熱圧縮）→ A（th で等温圧縮、熱を出す）
  let W1 = legAdi(VA, th, VD, g, nsub), Qc = legIso(VD, VC, tc, nsub), W3 = legAdi(VC, tc, VB, g, nsub), Qh = -legIso(VB, VA, th, nsub);
  let Wnet = -(W1 + Qc + W3 - Qh);     // 外からされた仕事 = −（気体がした仕事の合計）
  return { Qc, Qh, W: Wnet, cop: Qh / Wnet };
}
function copHeat(tRoomC, tOutC) { let th = tRoomC + 273.15 + DT_HX, tc = tOutC + 273.15 - DT_HX; return th > tc ? Math.min(20, (EFF * th) / (th - tc)) : 20; }
function copCool(tRoomC, tOutC) { let tc = tRoomC + 273.15 - DT_HX, th = tOutC + 273.15 + DT_HX; return th > tc ? Math.min(20, (EFF * tc) / (th - tc)) : 20; }
// 家の温度：C dT/dt = 入る熱 − UA (T − T外)。サーモスタットは ±0.5 °C で入り切り
function roomStep(r, dt) {
  if (!cooling) { if (r.t < tSet - 0.5) r.on = true; if (r.t > tSet + 0.5) r.on = false; }
  else { if (r.t > tSet + 0.5) r.on = true; if (r.t < tSet - 0.5) r.on = false; }
  let q = 0;
  if (r.on) { q = r.pump ? P_IN * (cooling ? -copCool(r.t, tOut) : copHeat(r.t, tOut)) : cooling ? 0 : P_IN; if (r.pump || !cooling) r.kwh += (P_IN * dt) / 3.6e6; }
  r.t += ((q - UA * (r.t - tOut)) * dt) / C_ROOM;
  r.t = clampv(r.t, -40, 60);
}

function draw() {
  background(22, 24, 30);
  if (!paused) {
    for (let k = 0; k < 20; k++) { for (let r of rooms) roomStep(r, DT_SIM); simTime += DT_SIM; }
    logT.push([rooms[0].t, rooms[1].t, rooms[0].kwh, rooms[1].kwh]); if (logT.length > 300) logT.shift();
  }
  let th = (cooling ? tOut + DT_HX : tSet + DT_HX) + 273.15, tc = (cooling ? tSet - DT_HX : tOut - DT_HX) + 273.15;
  let rc = reverseCarnot(th, tc, 200), cop = cooling ? copCool(tSet, tOut) : copHeat(tSet, tOut);

  // ---- エネルギーの流れの図（幅 = 量）：W = 1 として Qc = COP − 1、Qh = COP（暖房）
  let fx = 40, fy = 130, fw = width * 0.42;
  let Wn = 1, Qh = cooling ? cop + 1 : cop, Qc = Qh - Wn, sc = 26;
  noStroke(); fill(255, 110, 60, 200); rect(fx, fy, fw, 50, 8); fill(70, 140, 255, 200); rect(fx, fy + 230, fw, 50, 8);
  fill(255); textSize(16); text((cooling ? '外' : '部屋') + '（高温 Th = ' + (th - 273.15).toFixed(0) + ' °C）', fx + 14, fy + 31); text((cooling ? '部屋' : '外') + '（低温 Tc = ' + (tc - 273.15).toFixed(0) + ' °C）', fx + 14, fy + 261);
  let mx = fx + fw / 2; fill(200); circle(mx, fy + 140, 70); fill(30); textSize(14); textAlign(CENTER, CENTER); text('ポンプ', mx, fy + 140); textAlign(LEFT, BASELINE);
  fill(90, 170, 255, 180); rect(mx - (Qc * sc) / 2, fy + 175, Qc * sc, 55);
  fill(255, 140, 70, 180); rect(mx - (Qh * sc) / 2, fy + 50, Qh * sc, 55);
  fill(240, 220, 120, 200); rect(mx + 40, fy + 130, 120, Wn * sc);
  fill(235); textSize(15);
  text('Qh = ' + Qh.toFixed(2), mx + (Qh * sc) / 2 + 8, fy + 85); text('Qc = ' + Qc.toFixed(2), mx + (Qc * sc) / 2 + 8, fy + 210); text('W = 1（電気）', mx + 168, fy + 148);

  // ---- COP と外の気温のグラフ
  let g = { x: fx + 50, y: fy + 340, w: fw - 50, h: height - fy - 420, x0: -20, x1: 40, y0: 0, y1: 10 };
  plotAxes(g, '外の気温 [°C]', 'COP', [-20, 0, 20, 40], [0, 5, 10]);
  stroke(255, 150, 70); strokeWeight(2); polyline(Array.from({ length: 121 }, (_, k) => { let t = -20 + k / 2; return [gX(g, t), gY(g, copHeat(tSet, t))]; }));
  stroke(110, 180, 255); polyline(Array.from({ length: 121 }, (_, k) => { let t = -20 + k / 2; return [gX(g, t), gY(g, copCool(tSet, t))]; }));
  noStroke(); fill(255); circle(gX(g, tOut), gY(g, cop), 10);
  fill(255, 150, 70); textSize(13); text('暖房の COP', g.x + 8, g.y + 16); fill(110, 180, 255); text('冷房の COP', g.x + 8, g.y + 34);

  // ---- 2 つの家の温度と電気
  let g2 = { x: width * 0.52 + 40, y: 130, w: width * 0.44, h: height * 0.32, x0: 0, x1: 300, y0: -20, y1: 40 };
  plotAxes(g2, '時間（1 目盛り = 10 分）', '部屋の温度 [°C]', [], [-20, 0, 20, 40]);
  stroke(255, 255, 255, 60); line(g2.x, gY(g2, tSet), g2.x + g2.w, gY(g2, tSet)); stroke(90, 160, 255, 80); line(g2.x, gY(g2, tOut), g2.x + g2.w, gY(g2, tOut));
  stroke(255, 160, 80); strokeWeight(2); polyline(logT.map((v, k) => [gX(g2, k), gY(g2, v[0])]));
  stroke(230, 230, 120); strokeWeight(1.5); polyline(logT.map((v, k) => [gX(g2, k), gY(g2, v[1])]));
  let kmax = Math.max(1, ...logT.map((v) => v[3]), ...logT.map((v) => v[2]));
  let g3 = { x: g2.x, y: g2.y + g2.h + 70, w: g2.w, h: height * 0.25, x0: 0, x1: 300, y0: 0, y1: kmax * 1.1 };
  plotAxes(g3, '時間', '使った電気 [kWh]', [], [0, +(kmax * 1.1).toFixed(1)]);
  stroke(255, 160, 80); strokeWeight(2); polyline(logT.map((v, k) => [gX(g3, k), gY(g3, v[2])]));
  stroke(230, 230, 120); polyline(logT.map((v, k) => [gX(g3, k), gY(g3, v[3])]));
  noStroke(); fill(235); textSize(15);
  let hrs = simTime / 3600;
  text('ヒートポンプ ' + rooms[0].kwh.toFixed(2) + ' kWh（橙）　電気ヒーター ' + rooms[1].kwh.toFixed(2) + ' kWh（黄）' + (cooling ? '　※ヒーターは冷房できない' : '') + '　経過 ' + hrs.toFixed(1) + ' 時間', g3.x, g3.y + g3.h + 50);

  fill(240); textSize(18);
  text((cooling ? '冷房（冷凍機）' : '暖房（ヒートポンプ）') + '　外 ' + tOut + ' °C　設定 ' + tSet + ' °C　COP = ' + cop.toFixed(2) + '（カルノーの上限 ' + (cooling ? tc / (th - tc) : th / (th - tc)).toFixed(2) + ' × ' + EFF + '）', 20, 36);
  fill(175); textSize(15);
  text('← → 外の気温　↑↓ 設定温度　M 暖房 ⇔ 冷房　スペース 停止　R やり直し', 20, 62);
  fill(255, 200, 120);
  text('逆カルノーサイクルを数値で 1 周：Qh = ' + rc.Qh.toFixed(1) + ' J、Qc = ' + rc.Qc.toFixed(1) + ' J、W = ' + rc.W.toFixed(1) + ' J → Qh/W = ' + rc.cop.toFixed(3) + '（Th/(Th − Tc) = ' + (th / (th - tc)).toFixed(3) + '）', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === RIGHT_ARROW) tOut = Math.min(cooling ? 38 : 16, tOut + 2);      // 暖房は外が部屋より寒いときだけ、冷房は暑いときだけ
  if (key === LEFT_ARROW) tOut = Math.max(cooling ? 24 : -20, tOut - 2);
  if (key === UP_ARROW) tSet = Math.min(cooling ? 28 : 24, tSet + 1);
  if (key === DOWN_ARROW) tSet = Math.max(cooling ? 20 : 16, tSet - 1);
  if (key === 'm' || key === 'M') { cooling = !cooling; if (cooling && tOut < 25) tOut = 32; if (!cooling && tOut > 15) tOut = 0; resetRooms(); }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetRooms();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let rc = reverseCarnot(298, 268, 2000);
  check('逆カルノー（25 °C ← −5 °C）：数値の Qh/W = Th/(Th − Tc) = ' + (298 / 30).toFixed(3) + '（1e-5）', near(rc.cop, 298 / 30, 1e-5));
  check('エネルギー保存 Qh = Qc + W', near(rc.Qh, rc.Qc + rc.W, 1e-6 * rc.Qh));
  check('カルノーでは 暖房の COP − 冷房の COP = 1、暖房の COP = 1/η（η = 1 − Tc/Th）', near(298 / 30 - 268 / 30, 1, 1e-12) && near(rc.cop, 1 / (1 - 268 / 298), 1e-5));
  check('エントロピー：カルノーは Qh/Th − Qc/Tc = 0、本物（EFF < 1）は > 0', near(rc.Qh / 298 - rc.Qc / 268, 0, 1e-6) && (() => { let c = EFF * 298 / 30, Qh = c, Qc = c - 1; return Qh / 298 - Qc / 268 > 0; })());
  let r = { t: 0, on: true, kwh: 0, pump: false }, saved = [tOut, tSet, cooling]; tOut = 0; tSet = 100; cooling = false;
  for (let k = 0; k < 20000; k++) roomStep(r, 60);
  check('家にずっと ' + P_IN + ' W：定常の温度 = 外 + P/UA = ' + (P_IN / UA).toFixed(2) + ' °C', near(r.t, P_IN / UA, 0.01));
  let a = { t: 20, on: false, kwh: 0, pump: true }, b = { t: 20, on: false, kwh: 0, pump: false }; tSet = 20;
  for (let k = 0; k < 2880 * 2; k++) { roomStep(a, 30); roomStep(b, 30); }
  let ratio = b.kwh / a.kwh, c0 = copHeat(20, 0);
  check('同じ家を 2 日：電気ヒーターの電気 ÷ ヒートポンプの電気 = ' + ratio.toFixed(2) + ' ≈ COP ' + c0.toFixed(2) + '（10%）', Math.abs(ratio / c0 - 1) < 0.1);
  [tOut, tSet, cooling] = saved;
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← で外の気温を下げよう。COP はどう変わる？ 寒い日にヒートポンプが苦手なのはなぜ？
// 2. 2 つの家の電気の量を比べよう。COP が 3 なら、電気は何分の 1？
// 3. M で冷房に。外が暑いほど COP は？ 冷蔵庫の後ろが熱いのはなぜ？
// 4. DT_HX を 0 にすると COP はカルノーの値に近づく。熱交換器を大きくする意味は？
// 5. UA（断熱の悪さ）を半分にすると、電気はどれだけ減る？


// ==================================================
// ここから下は「熱力学の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーションと自己テストで使う
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
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(t, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
