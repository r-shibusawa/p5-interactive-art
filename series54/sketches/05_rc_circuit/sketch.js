// ============================================
// 05 RC 回路 ─ コンデンサの充電と放電、時定数 τ = RC
// コンデンサの電圧 Vc は dVc/dt = (Vin − Vc) / (RC)。これをルンゲ・クッタ法（RK4）で少しずつ進める
// 充電では Vc = V0(1 − e^(−t/τ))、τ たつと 63.2%。電池が出したエネルギーの半分は抵抗で熱になる
// 1 = スイッチ / 2 = 方形波 / スペース = スイッチ切りかえ / ↑↓ = R / ←→ = C（2 では周波数）/ R = 最初から
// ============================================

const V0 = 5;                                    // ★ 電池の電圧 [V]
const R_LIST = [1e3, 2e3, 5e3, 10e3, 20e3, 50e3];  // ★ 抵抗 [Ω]
const C_LIST = [10e-6, 22e-6, 47e-6, 100e-6, 220e-6]; // ★ コンデンサ [F]
const F_LIST = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];   // 方形波の周波数 [Hz]
const SPAN = 10;                                  // グラフの横幅 [秒]
let ri = 3, ci = 3, fi = 3, runMode = 1, charging = false, Vc = 0, t = 0, tSwitch = 0, vcSwitch = 0;
let hist = { t: [], vin: [], vc: [], i: [] }, Wbat = 0, WR = 0, ppLo = 1e9, ppHi = -1e9, ppShow = 0, lastPeriod = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
}
function RC() { return R_LIST[ri] * C_LIST[ci]; }
function vinAt(tt) { return runMode === 1 ? (charging ? V0 : 0) : (tt * F_LIST[fi]) % 1 < 0.5 ? V0 : 0; }

function draw() {
  background(14, 18, 26);
  let dtF = Math.min(deltaTime, 50) / 1000, n = Math.max(1, Math.ceil(dtF / (RC() / 50))), h = dtF / n;   // 1 歩は τ/50 より小さく
  for (let k = 0; k < n; k++) {
    let vin = vinAt(t), I = (vin - Vc) / R_LIST[ri];
    Vc = rk4Step(Vc, vin, RC(), h);
    Wbat += vin * I * h; WR += I * I * R_LIST[ri] * h; t += h;
    if (runMode === 2) { ppLo = Math.min(ppLo, Vc); ppHi = Math.max(ppHi, Vc); let p = Math.floor(t * F_LIST[fi]); if (p !== lastPeriod) { ppShow = ppHi - ppLo; ppLo = 1e9; ppHi = -1e9; lastPeriod = p; } }
  }
  let vin = vinAt(t), I = (vin - Vc) / R_LIST[ri];
  hist.t.push(t); hist.vin.push(vin); hist.vc.push(Vc); hist.i.push(I * 1000);
  while (hist.t.length > 2 && (t - hist.t[0] > SPAN || hist.t.length > 2000)) for (let k in hist) hist[k].shift();
  drawCircuit(110, 120, vin, I);
  // ---- グラフ
  let g1 = { x: 60, y: height * 0.5, w: width - 160, h: height * 0.2 }, g2 = { x: 60, y: height * 0.76, w: width - 160, h: height * 0.13 };
  plotFrame(g1, '電圧 [V]　橙 = 入力 Vin、水色 = コンデンサ Vc（横 = 最近 ' + SPAN + ' 秒）', -0.2, V0 * 1.1);
  stroke(255, 170, 80); strokeWeight(2); plotTime(g1, hist.vin, -0.2, V0 * 1.1);
  stroke(110, 210, 255); strokeWeight(2.5); plotTime(g1, hist.vc, -0.2, V0 * 1.1);
  if (runMode === 1) {                               // 63.2%（充電）または 36.8%（放電）の線
    let lv = vcSwitch + (charging ? V0 - vcSwitch : -vcSwitch) * (1 - Math.exp(-1)), yy = g1.y + g1.h - ((lv + 0.2) / (V0 * 1.1 + 0.2)) * g1.h;
    stroke(255, 240, 150, 120); drawingContext.setLineDash([6, 6]); line(g1.x, yy, g1.x + g1.w, yy); drawingContext.setLineDash([]);
    let el = t - tSwitch, xx = g1.x + g1.w - ((el - RC()) / SPAN) * g1.w;
    if (el >= RC() && xx > g1.x) { stroke(255, 240, 150); line(xx, g1.y, xx, g1.y + g1.h); noStroke(); fill(255, 240, 150); textSize(12); text('切りかえから τ', xx + 4, g1.y + 14); }
  }
  let imax = (V0 / R_LIST[ri]) * 1000;
  plotFrame(g2, '電流 I [mA]（＋ = 充電の向き）', -imax * 1.1, imax * 1.1);
  stroke(255, 230, 120); strokeWeight(2); plotTime(g2, hist.i, -imax * 1.1, imax * 1.1);
  // ---- 数字
  let tx = width * 0.5, y = 128, Ec = 0.5 * C_LIST[ci] * Vc * Vc;
  noStroke(); fill(235); textSize(16);
  text('R = ' + sci(R_LIST[ri] / 1000, 2) + ' kΩ　C = ' + sci(C_LIST[ci] * 1e6, 2) + ' μF　→　τ = RC = ' + sci(RC(), 3) + ' 秒', tx, y); y += 28;
  text('Vc = ' + Vc.toFixed(3) + ' V（' + ((Vc / V0) * 100).toFixed(1) + '%）　I = ' + (I * 1000).toFixed(3) + ' mA', tx, y); y += 28;
  if (runMode === 1) {
    text('切りかえから ' + (t - tSwitch).toFixed(2) + ' 秒 = ' + ((t - tSwitch) / RC()).toFixed(2) + ' τ', tx, y); y += 28;
    fill(255, 230, 120);
    text('エネルギー：電池が出した ' + sci(Wbat * 1000, 3) + ' mJ = コンデンサ ' + sci((Ec - 0.5 * C_LIST[ci] * vcSwitch * vcSwitch) * 1000, 3) + ' mJ ＋ 抵抗の熱 ' + sci(WR * 1000, 3) + ' mJ', tx, y, width - tx - 20); y += 50;
    fill(170); textSize(13); text('0 V から満タンまで充電すると、電池の CV0² のちょうど半分が熱になる（R の大きさによらない）', tx, y, width - tx - 20);
  } else {
    let fc = 1 / (2 * Math.PI * RC()), T = 1 / F_LIST[fi];
    text('方形波 f = ' + F_LIST[fi] + ' Hz　しゃ断周波数 fc = 1/(2πRC) = ' + sci(fc, 3) + ' Hz', tx, y); y += 28;
    fill(255, 230, 120);
    text('Vc の振れ幅（測定）= ' + ppShow.toFixed(3) + ' V　式 V0·tanh(T/4τ) = ' + (V0 * Math.tanh(T / (4 * RC()))).toFixed(3) + ' V', tx, y); y += 28;
    fill(170); textSize(13); text('f ≪ fc：そのまま通る（Vc ≈ Vin）。f ≫ fc：ほとんど通らず、三角波になる → ローパスフィルタ（高い音を消すのと同じしくみ）', tx, y, width - tx - 20);
  }
  fill(235); textSize(17);
  text('1 スイッチ　2 方形波 ｜ スペース スイッチ（' + (charging ? '充電' : '放電') + '）　↑↓ R　←→ ' + (runMode === 1 ? 'C' : '周波数') + '　R 最初から', 20, 34);
  fill(170); textSize(13); text('dVc/dt = (Vin − Vc)/(RC) を RK4 で（1 フレームを τ/50 より細かく分ける）。時間は本物と同じ速さ', 20, 60);
  drawSelfTest(20, height - 14);
}

function drawCircuit(x, y, vin, I) {
  let w = Math.min(380, width * 0.36), h = 170;
  stroke(200, 205, 215); strokeWeight(3); noFill();
  line(x, y, x + w, y); line(x + w, y, x + w, y + h); line(x, y + h, x + w, y + h); line(x, y, x, y + h);
  noStroke(); fill(14, 18, 26); rect(x - 25, y + h / 2 - 22, 50, 44); rect(x + w * 0.4, y - 14, w * 0.25, 28); rect(x + w - 30, y + h / 2 - 14, 60, 28);
  stroke(120, 200, 255); strokeWeight(4); line(x - 22, y + h / 2 - 8, x + 22, y + h / 2 - 8); strokeWeight(3); line(x - 11, y + h / 2 + 8, x + 11, y + h / 2 + 8);
  noStroke(); fill(160, 220, 255); textSize(14); text(runMode === 1 ? V0 + ' V' : '方形波', x - 80, y + h / 2 + 5);
  stroke(255, 170, 110); strokeWeight(3); noFill(); beginShape();
  for (let i = 0; i <= 8; i++) vertex(x + w * 0.4 + (w * 0.25 * i) / 8, y + (i === 0 || i === 8 ? 0 : i % 2 ? 9 : -9)); endShape();
  noStroke(); fill(255, 190, 140); text('R', x + w * 0.5, y - 18);
  let q = clampv(Vc / V0, -1, 1);                   // コンデンサの極板（ためた電荷）
  stroke(200, 205, 215); strokeWeight(4); line(x + w - 26, y + h / 2 - 7, x + w + 26, y + h / 2 - 7); line(x + w - 26, y + h / 2 + 7, x + w + 26, y + h / 2 + 7);
  noStroke(); fill(240, 90, 70, 60 + 190 * q); rect(x + w - 26, y + h / 2 - 16, 52, 6); fill(70, 150, 250, 60 + 190 * q); rect(x + w - 26, y + h / 2 + 10, 52, 6);
  fill(140, 220, 255); text('C', x + w + 34, y + h / 2 + 5);
  if (runMode === 1) { fill(charging ? color(255, 230, 120) : 150); text(charging ? 'スイッチ：電池につなぐ（充電）' : 'スイッチ：電池を外して短絡（放電）', x + 10, y + h + 28); }
  // 電流の点
  let s = (frameCount * I * 1000 * 2) % 30, per = 2 * (w + h);
  fill(255, 230, 120); noStroke();
  for (let d = ((s % 30) + 30) % 30; d < per; d += 30) { let p = d < w ? [x + d, y] : d < w + h ? [x + w, y + d - w] : d < 2 * w + h ? [x + w - (d - w - h), y + h] : [x, y + h - (d - 2 * w - h)]; if (Math.abs(I) > 1e-6) circle(p[0], p[1], 6); }
}

function keyPressed() {
  if (key === '1' || key === '2') { runMode = +key; resetRun(); }
  if (key === ' ' && runMode === 1) { charging = !charging; markSwitch(); }
  if (key === UP_ARROW) { ri = Math.min(R_LIST.length - 1, ri + 1); markSwitch(); }
  if (key === DOWN_ARROW) { ri = Math.max(0, ri - 1); markSwitch(); }
  if (key === RIGHT_ARROW) { if (runMode === 1) ci = Math.min(C_LIST.length - 1, ci + 1); else fi = Math.min(F_LIST.length - 1, fi + 1); markSwitch(); }
  if (key === LEFT_ARROW) { if (runMode === 1) ci = Math.max(0, ci - 1); else fi = Math.max(0, fi - 1); markSwitch(); }
  if (key === 'r' || key === 'R') { ri = 3; ci = 3; fi = 3; resetRun(); }
  return false;
}
function resetRun() { Vc = 0; t = 0; charging = false; hist = { t: [], vin: [], vc: [], i: [] }; markSwitch(); }
function markSwitch() { tSwitch = t; vcSwitch = Vc; Wbat = 0; WR = 0; }

// ---- 自己テスト：式で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let tau = 1, run = (v0, vin, T, dt) => { let v = v0; for (let k = 0; k < Math.round(T / dt); k++) v = rk4Step(v, vin, tau, dt); return v; };
  check('充電：t = τ で Vc = 63.2%（1 − e⁻¹）', near(run(0, 1, 1, 1e-3), 1 - Math.exp(-1), 1e-9));
  check('放電：t = τ で Vc = 36.8%（e⁻¹）', near(run(1, 0, 1, 1e-3), Math.exp(-1), 1e-9));
  let v = 0, tt = 0, dt = 1e-3, prev = 0; while (v < 1 - Math.exp(-1)) { prev = v; v = rk4Step(v, 1, tau, dt); tt += dt; }
  let tCross = tt - (dt * (v - (1 - Math.exp(-1)))) / (v - prev);
  check('63.2% になる時刻 = RC（0.1% 以内）', nearRel(tCross, tau, 0.001));
  let Rr = 1000, Cc = 1e-3, vc = 0, wb = 0, wr = 0, h = (Rr * Cc) / 1000;
  for (let k = 0; k < 15000; k++) { let I = (1 - vc) / Rr; wb += 1 * I * h; wr += I * I * Rr * h; vc = rk4Step(vc, 1, Rr * Cc, h); }
  check('満タンまで：電池 CV² = コンデンサ ½CV² + 抵抗 ½CV²（0.5% 以内）', nearRel(wb, Cc, 0.005) && nearRel(0.5 * Cc * vc * vc, 0.5 * Cc, 0.005) && nearRel(wr, 0.5 * Cc, 0.005));
  check('半分になる時間 = τ·ln2', near(run(1, 0, Math.LN2, Math.LN2 / 1000), 0.5, 1e-9));
  let T = 0.8, x = 0, lo = 9, hi = -9; dt = 1e-4;
  for (let k = 0; k < 400000; k++) { let ts = k * dt; x = rk4Step(x, (ts / T) % 1 < 0.5 ? 1 : 0, tau, dt); if (ts > 30) { lo = Math.min(lo, x); hi = Math.max(hi, x); } }
  check('方形波：落ち着いた振れ幅 = V0·tanh(T/4τ)（0.5% 以内）', nearRel(hi - lo, Math.tanh(T / (4 * tau)), 0.005));
  check('RK4 の 1 歩（h = τ/50）の誤差 < 10⁻¹⁰（e^(−h/τ) と比べる）', near(rk4Step(0, 1, tau, tau / 50), 1 - Math.exp(-1 / 50), 1e-10));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで充電し、τ たったとき（黄色の縦線）に Vc が 63.2% になっていることを確かめよう
// 2. ↑ で R を大きくすると τ は？ 抵抗で熱になったエネルギーは変わる？（実は変わらない！）
// 3. 2 の方形波で、f を fc より小さく・大きくして Vc の形を比べよう（ローパスフィルタ）
// 4. カメラのフラッシュは、コンデンサにためたエネルギーを一気に使う。½CV² で何 J？
// 5. V0 を変えて、τ が電圧によらないことを確かめよう


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 時刻つきのグラフ：右はし = いま、左はし = SPAN 秒前
function plotTime(g, arr, lo, hi) {
  if (arr.length < 2) return;
  noFill(); beginShape();
  for (let i = 0; i < arr.length; i++) vertex(g.x + g.w - ((t - hist.t[i]) / SPAN) * g.w, g.y + g.h - clampv((arr[i] - lo) / (hi - lo), 0, 1) * g.h);
  endShape();
}
// ---- RK4 で 1 歩：dVc/dt = (vin − Vc) / τ（vin はこの 1 歩のあいだ一定）
function rk4Step(v, vin, tau, h) {
  let f = (x) => (vin - x) / tau;
  let k1 = f(v), k2 = f(v + (h / 2) * k1), k3 = f(v + (h / 2) * k2), k4 = f(v + h * k3);
  return v + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}
// ---- 描く道具（どのスケッチも同じ）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（[[x, y], ...]）
  if (!pts || pts.length < 2) return;
  beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function arrowTo(x1, y1, x2, y2, hs) {  // (x1, y1) → (x2, y2) の矢印。hs = 矢じりの大きさ
  let dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (!(L > 0.5)) return;
  line(x1, y1, x2, y2);
  let ux = dx / L, uy = dy / L, h = Math.min(hs || 8, L * 0.5);
  line(x2, y2, x2 - h * ux + h * 0.5 * uy, y2 - h * uy - h * 0.5 * ux);
  line(x2, y2, x2 - h * ux - h * 0.5 * uy, y2 - h * uy + h * 0.5 * ux);
}
const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function sci(v, d) {                   // 0.000032 → "3.20×10⁻⁵"（大きい数・小さい数を読みやすく）
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  let sig = d === undefined ? 3 : d, e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return v.toFixed(Math.max(0, sig - 1 - e));
  let m = v / Math.pow(10, e);
  return m.toFixed(sig - 1) + '×10' + String(e).split('').map((c) => SUP[c]).join('');
}
// グラフの枠：g = { x, y, w, h }。lo〜hi の範囲で、数字の配列 arr を左から右へ（cap 個ぶん）
function plotFrame(g, title, lo, hi) {
  noFill(); stroke(70, 80, 100); strokeWeight(1); rect(g.x, g.y, g.w, g.h);
  if (lo < 0 && hi > 0) { let y0 = g.y + g.h * (hi / (hi - lo)); stroke(70, 80, 100, 160); line(g.x, y0, g.x + g.w, y0); }
  noStroke(); fill(200); textSize(13); text(title, g.x + 4, g.y - 6);
  fill(140); textSize(11); text(sci(hi, 2), g.x + g.w + 4, g.y + 10); text(sci(lo, 2), g.x + g.w + 4, g.y + g.h);
}
function plotTrace(g, arr, lo, hi, cap) {
  if (!arr || arr.length < 2) return;
  noFill(); beginShape();
  for (let i = 0; i < arr.length; i++) vertex(g.x + (i / (cap - 1)) * g.w, g.y + g.h - clampv((arr[i] - lo) / (hi - lo), 0, 1) * g.h);
  endShape();
}
function pushCap(arr, v, cap) { arr.push(v); if (arr.length > cap) arr.shift(); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function nearRel(a, b, rel) { return near(a, b, Math.abs(b) * rel); }   // 相対誤差 rel 以内
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) {
  noStroke(); textSize(13);
  if (selfTestResults.length > 0 && selfTestResults.every((r) => r.ok)) fill(120, 220, 160); else fill(255, 100, 90);
  text(selfTestLine(), x, y);
}
