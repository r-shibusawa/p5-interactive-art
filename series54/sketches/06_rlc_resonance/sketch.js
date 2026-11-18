// ============================================
// 06 RLC 回路と共振 ─ 電気のふりこ
// コイル L・コンデンサ C・抵抗 R の直列回路：L·di/dt + R·i + q/C = V(t)、dq/dt = i（RK4 で計算）
// R = 0 なら電荷とエネルギーが C と L を行き来して振動し続ける（f0 = 1/(2π√LC)）。R があると減衰（Q 値）
// 交流を加えて周波数を変えると、f0 で電流がいちばん大きい（共振）。スペースで周波数を掃引して共振曲線を測る
// 1 = 自由振動 / 2 = 交流で共振 / ↑↓ = R / ←→ = 周波数 / スペース = 1：充電しなおす 2：掃引 / R = 最初から
// ============================================

const L_H = 0.1;                       // ★ コイル L [H]（100 mH）
const C_F = 100e-6;                    // ★ コンデンサ C [F]（100 μF）
const V0 = 10;                         // ★ 電圧 [V]（1：最初の充電、2：交流の振幅）
const R_LIST = [0, 0.5, 1, 2, 5, 10, 20];   // 抵抗 [Ω]
const SLOW = 0.01;                     // ★ スローモーション（1 秒で 0.01 秒ぶん）
let runMode = 1, ri = 3, fDrive = 40, st = { q: C_F * V0, i: 0 }, tSim = 0, heat = 0, hist = { q: [], i: [] };
let sweep = [], sweepOn = false, sweepF = 20;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
}
function Rnow() { return runMode === 2 ? Math.max(0.5, R_LIST[ri]) : R_LIST[ri]; }
function f0() { return 1 / (2 * Math.PI * Math.sqrt(L_H * C_F)); }
function vSrc(t) { return runMode === 2 ? V0 * Math.sin(2 * Math.PI * fDrive * t) : 0; }

function draw() {
  background(14, 18, 26);
  let dt = ((Math.min(deltaTime, 50) / 1000) * SLOW) / 20, R = Rnow();
  for (let k = 0; k < 20; k++) { st = rlcStep(st, tSim, dt, R, L_H, C_F, vSrc); heat += st.i * st.i * R * dt; tSim += dt; }
  let qn = runMode === 1 ? C_F * V0 : (2 * ampFormula(fDrive, R)) / (2 * Math.PI * fDrive);   // 電荷の目盛り（2 は落ち着いたときの振幅 I/ω の 2 倍：始めのうなりも入る）
  pushCap(hist.q, st.q / qn, 500); pushCap(hist.i, st.i, 500);
  if (runMode === 2 && sweepOn) {                  // 掃引：1 フレームに 1 つの周波数で、落ち着くまで計算して振幅を測る
    sweep.push([sweepF, steadyAmp(sweepF, R)]); sweepF *= 1.03;
    if (sweepF > 120) sweepOn = false;
  }
  let Uc = (st.q * st.q) / (2 * C_F), Ul = 0.5 * L_H * st.i * st.i, U0 = 0.5 * C_F * V0 * V0;
  // ---- グラフ：電荷と電流
  let g = { x: 60, y: 120, w: width * 0.5, h: height * 0.24 }, imax = runMode === 1 ? V0 * Math.sqrt(C_F / L_H) : Math.min(V0 / R, 40);
  plotFrame(g, (runMode === 1 ? '水色 = コンデンサの電荷 q/q₀、' : '水色 = 電荷 q（落ち着いた振幅を 0.5）、') + '黄 = 電流 i（黄の目盛り ±' + imax.toFixed(2) + ' A）', -1.1, 1.1);
  stroke(110, 210, 255); strokeWeight(2); plotTrace(g, hist.q, -1.1, 1.1, 500);
  stroke(255, 220, 110); strokeWeight(2); plotTrace(g, hist.i.map((v) => v / imax), -1.1, 1.1, 500);
  // ---- エネルギーの棒
  let bx = 60, by = g.y + g.h + 60, bw = width * 0.5;
  let bars = [['コンデンサ q²/2C', Uc, color(110, 210, 255)], ['コイル ½Li²', Ul, color(255, 220, 110)], ['合計', Uc + Ul, color(220)], ['熱になった ∫i²R dt', heat, color(255, 120, 90)]];
  bars.forEach((b, k) => {
    noStroke(); fill(200); textSize(13); text(b[0], bx, by + k * 30 + 14);
    fill(b[2]); rect(bx + 150, by + k * 30, clampv(b[1] / Math.max(U0, Uc + Ul + 1e-12), 0, 1.2) * (bw - 260), 18);
    fill(200); text(sci(b[1] * 1000, 3) + ' mJ', bx + bw - 90, by + k * 30 + 14);
  });
  // ---- 右：共振曲線（式）と測った点
  let rg = { x: width * 0.6, y: 140, w: width * 0.36, h: height * 0.38 }, fmin = 20, fmax = 120, imaxC = V0 / R;
  plotFrame(rg, '共振曲線：電流の振幅 |I| [A] と 周波数 f [Hz]', 0, imaxC * 1.05);
  let pts = []; for (let k = 0; k <= 200; k++) { let f = fmin + ((fmax - fmin) * k) / 200; pts.push([rg.x + ((f - fmin) / (fmax - fmin)) * rg.w, rg.y + rg.h - (ampFormula(f, R) / (imaxC * 1.05)) * rg.h]); }
  stroke(255, 170, 80); strokeWeight(2); noFill(); polyline(pts);
  noStroke(); fill(120, 230, 170);
  for (let [f, a] of sweep) circle(rg.x + ((f - fmin) / (fmax - fmin)) * rg.w, rg.y + rg.h - (a / (imaxC * 1.05)) * rg.h, 6);
  let xf0 = rg.x + ((f0() - fmin) / (fmax - fmin)) * rg.w, xd = rg.x + ((fDrive - fmin) / (fmax - fmin)) * rg.w;
  stroke(255, 255, 255, 90); line(xf0, rg.y, xf0, rg.y + rg.h);
  if (runMode === 2) { stroke(255, 220, 110); line(xd, rg.y, xd, rg.y + rg.h); }
  noStroke(); fill(160); textSize(11); for (let f of [20, 40, 60, 80, 100, 120]) text(f, rg.x + ((f - fmin) / (fmax - fmin)) * rg.w - 8, rg.y + rg.h + 14);
  // ---- 数字
  let Q = R > 0 ? Math.sqrt(L_H / C_F) / R : Infinity, tx = rg.x, y = rg.y + rg.h + 46;
  fill(235); textSize(16);
  text('L = ' + L_H * 1000 + ' mH　C = ' + C_F * 1e6 + ' μF　R = ' + R + ' Ω', tx, y); y += 26;
  fill(255, 230, 120); text('f0 = 1/(2π√LC) = ' + f0().toFixed(2) + ' Hz　Q = √(L/C)/R = ' + (isFinite(Q) ? Q.toFixed(1) : '∞'), tx, y); y += 26;
  fill(235); text('半値幅 Δf = R/(2πL) = ' + (R / (2 * Math.PI * L_H)).toFixed(2) + ' Hz（= f0/Q）', tx, y); y += 26;
  if (runMode === 2) { let Z = Math.hypot(R, 2 * Math.PI * fDrive * L_H - 1 / (2 * Math.PI * fDrive * C_F)); text('いま f = ' + fDrive.toFixed(1) + ' Hz　|Z| = ' + Z.toFixed(2) + ' Ω　|I| = V0/|Z| = ' + (V0 / Z).toFixed(3) + ' A', tx, y); }
  else text('合計のエネルギー ' + sci((Uc + Ul) * 1000, 4) + ' mJ（R = 0 なら変わらない）', tx, y);
  y += 26; fill(170); textSize(13); text('橙の線 = 式 V0/√(R² + (ωL − 1/ωC)²)、緑の点 = RK4 で落ち着くまで計算して測った振幅（スペースで掃引）', tx, y, width - tx - 20);
  fill(235); textSize(17);
  text('1 自由振動　2 交流で共振 ｜ ↑↓ R　' + (runMode === 2 ? '←→ 周波数　スペース 掃引' : 'スペース 充電しなおす') + '　R 最初から', 20, 34);
  fill(170); textSize(13); text('L·di/dt + R·i + q/C = V(t) を RK4 で。時間は ' + SLOW + ' 倍のスロー（f0 ≈ 50 Hz → 画面では約 0.5 回/秒）', 20, 60);
  drawSelfTest(20, height - 14);
}

function keyPressed() {
  if (key === '1' || key === '2') { runMode = +key; restart(); }
  if (key === UP_ARROW) { ri = Math.min(R_LIST.length - 1, ri + 1); sweep = []; }
  if (key === DOWN_ARROW) { ri = Math.max(0, ri - 1); sweep = []; }
  if (key === RIGHT_ARROW) fDrive = Math.min(120, fDrive * 1.03);
  if (key === LEFT_ARROW) fDrive = Math.max(20, fDrive / 1.03);
  if (key === ' ') { if (runMode === 1) restart(); else { sweep = []; sweepF = 20; sweepOn = true; } }
  if (key === 'r' || key === 'R') { ri = 3; fDrive = 40; sweep = []; restart(); }
  return false;
}
function restart() { st = { q: runMode === 1 ? C_F * V0 : 0, i: 0 }; tSim = 0; heat = 0; hist = { q: [], i: [] }; }

// ---- 自己テスト：式で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let T0 = 2 * Math.PI * Math.sqrt(L_H * C_F), dt = T0 / 2000, s = { q: 1e-3, i: 0 }, t = 0, cross = [], none = () => 0;
  let E0 = (s.q * s.q) / (2 * C_F), Emax = 0;
  for (let k = 0; k < 2000 * 20; k++) {
    let n = rlcStep(s, t, dt, 0, L_H, C_F, none);
    if (s.q > 0 && n.q <= 0) cross.push(t + (dt * s.q) / (s.q - n.q));
    s = n; t += dt; Emax = Math.max(Emax, Math.abs((s.q * s.q) / (2 * C_F) + 0.5 * L_H * s.i * s.i - E0));
  }
  check('f0 = 1/(2π√LC) = 50.33 Hz', near(f0(), 50.329, 0.001));
  check('R = 0 の振動の周期 = 2π√LC（0.1% 以内）', nearRel((cross[cross.length - 1] - cross[0]) / (cross.length - 1), T0, 0.001));
  check('R = 0 なら エネルギーが保存（20 周期で 10⁻⁶ 以内）', Emax / E0 < 1e-6);
  let R = 2, wd = Math.sqrt(1 / (L_H * C_F) - (R * R) / (4 * L_H * L_H)), peaks = [];
  s = { q: 1e-3, i: 0 }; t = 0; let prev = s;
  for (let k = 0; k < 2000 * 5; k++) { let n = rlcStep(s, t, dt, R, L_H, C_F, none); if (prev.q < s.q && n.q <= s.q && s.q > 0) peaks.push(s.q); prev = s; s = n; t += dt; }
  check('R があると 1 周期ごとに e^(−R·T/2L) 倍に減る（0.5% 以内）', peaks.length >= 3 && nearRel(peaks[2] / peaks[1], Math.exp((-R * 2 * Math.PI) / wd / (2 * L_H)), 0.005));
  check('共振（f = f0）で落ち着いた電流の振幅 = V0/R（1% 以内）', nearRel(steadyAmp(f0(), 2), V0 / 2, 0.01));
  check('f0 からはずれた所（0.8 f0）でも 計算 = 式 V0/|Z|（1% 以内）', nearRel(steadyAmp(0.8 * f0(), 2), ampFormula(0.8 * f0(), 2), 0.01));
  let half = (lo, hi, up) => { for (let k = 0; k < 80; k++) { let m = (lo + hi) / 2; ((ampFormula(m, 2) ** 2 > 0.5 * (V0 / 2) ** 2) === up) ? (hi = m) : (lo = m); } return (lo + hi) / 2; };
  let f1 = half(20, f0(), true), f2 = half(f0(), 120, false);
  check('半値幅（電力が半分の 2 点の差）= R/(2πL) = f0/Q', nearRel(f2 - f1, 2 / (2 * Math.PI * L_H), 1e-6));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 で R = 0 にして、エネルギーが コンデンサ ⇔ コイル を行き来するのを見よう。合計は？
// 2. ↑ で R を大きくすると、何回くらいで止まる？ Q 値との関係は？（Q ≈ 何回ふれるか × π）
// 3. 2 で ←→ を押して f0 に近づけ、電流が大きくなるのを確かめよう。電圧と電流の山の時間差（位相）は？
// 4. スペースで掃引し、緑の点（計算）と橙の線（式）が重なることを確かめよう。R を変えると幅は？
// 5. ラジオのチューニングは共振。C を変えて 1 MHz に合わせるには C をいくつにする？


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- RK4 で 1 歩：状態 { q, i }、dq/dt = i、di/dt = (V(t) − R·i − q/C) / L
function rlcStep(s, t, h, R, L, C, V) {
  let f = (tt, q, i) => [i, (V(tt) - R * i - q / C) / L];
  let k1 = f(t, s.q, s.i), k2 = f(t + h / 2, s.q + (h / 2) * k1[0], s.i + (h / 2) * k1[1]);
  let k3 = f(t + h / 2, s.q + (h / 2) * k2[0], s.i + (h / 2) * k2[1]), k4 = f(t + h, s.q + h * k3[0], s.i + h * k3[1]);
  return { q: s.q + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), i: s.i + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) };
}
// ---- 式：交流 V0 sin(2πft) のときの電流の振幅 V0 / |Z|
function ampFormula(f, R) { let w = 2 * Math.PI * f; return V0 / Math.hypot(R, w * L_H - 1 / (w * C_F)); }
// ---- 計算：静かな状態から RK4 で落ち着くまで（減衰の時間 2L/R の 12 倍）進め、最後の 3 周期の電流の最大値
function steadyAmp(f, R) {
  let T = 1 / f, dt = T / 60, Ttot = Math.max(12 * ((2 * L_H) / R), 10 * T), s = { q: 0, i: 0 }, t = 0, mx = 0;
  let V = (tt) => V0 * Math.sin(2 * Math.PI * f * tt), n = Math.ceil(Ttot / dt);
  for (let k = 0; k < n; k++) { s = rlcStep(s, t, dt, R, L_H, C_F, V); t += dt; if (t > Ttot - 3 * T) mx = Math.max(mx, Math.abs(s.i)); }
  return mx;
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
