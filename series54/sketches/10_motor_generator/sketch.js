// ============================================
// 10 モーターと発電機 ─ 磁場の中で回るコイル
// コイルを通る磁束 Φ = NBA cos θ。回すと起電力 V = −dΦ/dt = NBAω sin θ（交流）→ 発電機
// 逆に電流を流すと力のモーメント τ = NBA·I·sin θ で回る → モーター。整流子は半回転ごとに電流の向きを切りかえる
// 1 = 発電機 / 2 = モーター / K = 整流子 あり・なし / ←→ = 回す速さ（2 は電池の電圧）/ ↑↓ = つなぐ抵抗 / R = 最初から
// ============================================

const NT = 50, BF = 0.2, AREA = 0.01;  // ★ 巻き数、磁束密度 [T]、コイルの面積 [m²]（10 cm × 10 cm）
const NBA = NT * BF * AREA;            // = 0.1 Wb
const R_COIL = 2;                      // コイルの抵抗 [Ω]
const J_ROT = 2e-4;                    // ★ 回る部分の慣性モーメント [kg·m²]
const FRICTION = 2e-5;                 // ★ 軸のまさつ [N·m·s]
let runMode = 1, commutator = false, omegaGen = 2 * Math.PI * 1, Vbat = 6, Rload = 10, th = 0, om = 0;
let hist = { v: [], i: [], w: [] }, eIn = 0, eHeat = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
}

function draw() {
  background(14, 18, 26);
  let dt = Math.min(deltaTime, 50) / 1000, n = 40, h = dt / n, emfOut = 0, I = 0, tau = 0;
  for (let k = 0; k < n; k++) {
    if (runMode === 1) { th += omegaGen * h; om = omegaGen; let g = genState(th, om, commutator, Rload); emfOut = g.vout; I = g.I; tau = g.tau; }
    else { let s = motorStep({ th, om }, h, Vbat, commutator); th = s.th; om = s.om; let m = motorState(th, om, Vbat, commutator); I = m.I; tau = m.tau; emfOut = m.vapp; eIn += m.vapp * m.I * h; eHeat += m.I * m.I * R_COIL * h; }
  }
  th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  pushCap(hist.v, runMode === 1 ? emfOut : NBA * om * Math.sin(th), 400); pushCap(hist.i, I, 400); pushCap(hist.w, om / (2 * Math.PI), 400);
  drawMachine(width * 0.3, height * 0.42, I);
  // ---- グラフ
  let gx = width * 0.56, gw = width * 0.38;
  let vmax = runMode === 1 ? NBA * omegaGen * 1.1 + 0.01 : Vbat * 1.2, imax = runMode === 1 ? vmax / (R_COIL + Rload) : Vbat / R_COIL * 1.1;
  let g1 = { x: gx, y: 140, w: gw, h: 110 }, g2 = { x: gx, y: 290, w: gw, h: 110 }, g3 = { x: gx, y: 440, w: gw, h: 80 };
  plotFrame(g1, runMode === 1 ? '出てくる電圧 [V]' + (commutator ? '（整流子：向きをそろえる）' : '（交流）') : '逆起電力 NBAω sin θ [V]', -vmax, vmax);
  stroke(255, 200, 90); strokeWeight(2); plotTrace(g1, hist.v, -vmax, vmax, 400);
  plotFrame(g2, '電流 I [A]', -imax, imax); stroke(110, 210, 255); strokeWeight(2); plotTrace(g2, hist.i, -imax, imax, 400);
  plotFrame(g3, '回転数 [回/秒]', 0, 25); stroke(150, 255, 170); strokeWeight(2); plotTrace(g3, hist.w, 0, 25, 400);
  // ---- 数字
  let y = 570; noStroke(); fill(235); textSize(15);
  let L = ['N = ' + NT + ' 回、B = ' + BF + ' T、A = ' + AREA * 1e4 + ' cm² → NBA = ' + NBA.toFixed(2) + ' Wb', '角度 θ = ' + Math.round(degreesOf(th)) + '°　回転数 ' + (om / (2 * Math.PI)).toFixed(2) + ' 回/秒'];
  if (runMode === 1) L.push('電圧の山 NBAω = ' + (NBA * omegaGen).toFixed(3) + ' V　つないだ抵抗 ' + Rload + ' Ω', '回すのに必要な力のモーメント τ = NBA·I·sin θ = ' + sci(tau) + ' N·m（レンツ：発電すると重くなる）');
  else L.push('電池 ' + Vbat + ' V　電流 ' + I.toFixed(3) + ' A　τ = ' + sci(tau) + ' N·m', '電池のエネルギー ' + eIn.toFixed(2) + ' J → 熱 ' + eHeat.toFixed(2) + ' J ＋ 回転（と まさつ）');
  for (let s of L) { text(s, gx, y, width - gx - 10); y += 26; }
  fill(235); textSize(17);
  text('1 発電機　2 モーター ｜ K 整流子（' + (commutator ? 'あり' : 'なし') + '）　←→ ' + (runMode === 1 ? '回す速さ' : '電池の電圧') + (runMode === 1 ? '　↑↓ つなぐ抵抗' : '') + '　R 最初から', 20, 34);
  fill(170); textSize(13);
  text('左の赤 = N 極、右の青 = S 極（磁場は左から右）。コイルは たての軸のまわりに回る。θ = コイルの面に垂直な向きと磁場の角度。' + (runMode === 2 && !commutator ? '整流子なし：半回転ごとに力が逆向きになり、θ = 180° で止まってしまう' : ''), 20, 60, width - 40);
  drawSelfTest(20, height - 14);
}
function degreesOf(a) { return (a * 180) / Math.PI; }

function drawMachine(x, y, I) {
  let W = 150, H = 170;
  noStroke(); fill(220, 80, 70); rect(x - 280, y - 120, 70, 240, 6); fill(70, 130, 230); rect(x + 210, y - 120, 70, 240, 6);
  fill(255); textSize(28); textAlign(CENTER, CENTER); text('N', x - 245, y); text('S', x + 245, y); textAlign(LEFT, BASELINE);
  stroke(120, 140, 170, 90); strokeWeight(1); for (let yy = y - 100; yy <= y + 100; yy += 25) arrowTo(x - 205, yy, x + 205, yy, 6);
  // コイルの 4 つの角（面の法線 n = (cos θ, 0, sin θ)、面の中の横の向き t = (−sin θ, 0, cos θ)）
  let tx = -Math.sin(th), tz = Math.cos(th), P = (s, v) => [x + s * (W / 2) * tx, y + v * (H / 2) - s * (W / 2) * tz * 0.18];
  let a = P(-1, -1), b = P(1, -1), c = P(1, 1), d = P(-1, 1), lit = Math.abs(Math.cos(th));
  noStroke(); fill(200, 130, 60, 40 + 60 * lit); quad(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
  stroke(230, 150, 70); strokeWeight(5); noFill(); quad(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
  stroke(200); strokeWeight(3); line(x, y - H / 2 - 50, x, y + H / 2 + 50);
  // 電流の点（向き = I の符号）
  let ph = (frameCount * 0.12 * Math.sign(I) * Math.min(1, Math.abs(I) * 3)) % 1, path = [a, b, c, d, a];
  noStroke(); fill(255, 230, 120);
  if (Math.abs(I) > 1e-3) for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) { let u = (((k + ph) / 4) % 1 + 1) % 1, p0 = path[s], p1 = path[s + 1]; circle(p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, 6); }
  // 整流子・ブラシ
  noStroke(); fill(commutator ? color(240, 200, 120) : color(160)); textSize(13);
  text(commutator ? '整流子：半回転ごとに つなぎかえ' : 'スリップリング：つなぎかえなし', x - 90, y + H / 2 + 80);
}

function keyPressed() {
  if (key === '1' || key === '2') { runMode = +key; om = 0; th = runMode === 2 ? 0.3 : 0; hist = { v: [], i: [], w: [] }; eIn = 0; eHeat = 0; }
  if (key === 'k' || key === 'K') commutator = !commutator;
  let d = key === RIGHT_ARROW ? 1 : key === LEFT_ARROW ? -1 : 0;
  if (d && runMode === 1) omegaGen = clampv(omegaGen + d * Math.PI, 0, 2 * Math.PI * 6);
  if (d && runMode === 2) Vbat = clampv(Vbat + d, 0, 12);
  if (key === UP_ARROW) Rload = Math.min(100, Rload * 2);
  if (key === DOWN_ARROW) Rload = Math.max(1.25, Rload / 2);
  if (key === 'r' || key === 'R') { commutator = false; omegaGen = 2 * Math.PI; Vbat = 6; Rload = 10; th = 0.3; om = 0; eIn = 0; eHeat = 0; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let w = 2 * Math.PI * 3, ok = true, mx = 0;
  for (let k = 0; k < 360; k++) {
    let t = k / (360 * 3), d = 1e-7, phi = (tt) => NBA * Math.cos(w * tt);
    let num = -(phi(t + d) - phi(t - d)) / (2 * d), ex = NBA * w * Math.sin(w * t);
    if (Math.abs(num - ex) > 1e-6 * NBA * w) ok = false; mx = Math.max(mx, num);
  }
  check('発電機：−dΦ/dt（数値の微分）= NBAω sin θ', ok);
  check('電圧の山 = NBAω', nearRel(mx, NBA * w, 1e-4));
  let P = 0, Tq = 0, n = 10000, Rl = 10;
  for (let k = 0; k < n; k++) { let g = genState((2 * Math.PI * (k + 0.5)) / n, w, false, Rl); P += (g.vout * g.vout) / Rl / n; Tq += g.tau / n; }
  let Ptot = ((NBA * w) ** 2) / (2 * (R_COIL + Rl));
  check('平均の電力（抵抗で使う）= (NBAω)²R/(2(r + R)²)（0.1% 以内）', nearRel(P, Ptot * Rl / (R_COIL + Rl), 0.001));
  check('回すのに必要な仕事 τω = 発電した全電力（レンツの法則）', nearRel(Tq * w, Ptot, 0.001));
  let avg = 0; for (let k = 0; k < n; k++) avg += (NBA * Math.sin((2 * Math.PI * (k + 0.5)) / n) * 6) / R_COIL / n;
  check('整流子なしでは電池からの力のモーメントは 1 周の平均で 0', Math.abs(avg) < 1e-12);
  let s = { th: 0.3, om: 0 }, Ein = 0, Eh = 0, Ef = 0, hh = 1e-4;
  for (let k = 0; k < 40000; k++) { let m = motorState(s.th, s.om, 6, true); Ein += m.vapp * m.I * hh; Eh += m.I * m.I * R_COIL * hh; Ef += FRICTION * s.om * s.om * hh; s = motorStep(s, hh, 6, true); }
  let KE = 0.5 * J_ROT * s.om * s.om;
  check('エネルギー保存：電池 = 熱 + 回転の運動エネルギー + まさつ（0.5% 以内）', nearRel(Ein, Eh + KE + Ef, 0.005));
  check('整流子つきモーター：まさつが小さいと ω → 4V/(π·NBA)（逆起電力の平均 = 電池の 8/π²）、3% 以内', nearRel(s.om, (4 * 6) / (Math.PI * NBA), 0.03));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 発電機で ←→ を押して回す速さを 2 倍にすると、電圧の山は？ 周期は？
// 2. ↑↓ でつなぐ抵抗を小さくすると電流が大きくなり、回すのが重くなる（τ）。自転車の発電機と同じ
// 3. K で整流子をつけると、出てくる電圧の形はどう変わる？（直流の発電機）
// 4. モーターで整流子をなしにすると、どこで止まる？ なぜ？
// 5. モーターの回転数が上がると電流が減るのはなぜ？（逆起電力）。電圧を 2 倍にすると回転数は？


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 発電機：角度 θ、角速度 ω、抵抗 Rl をつないだとき
// 起電力 e = NBAω sin θ（整流子ありなら |…|）、電流 I = e/(r + Rl)、出力電圧 vout = I·Rl、回すのに必要な τ = NBA·I·sin θ
function genState(t, w, comm, Rl) {
  let s = Math.sin(t), sw = comm ? (s >= 0 ? 1 : -1) : 1, e = NBA * w * s * sw, I = e / (R_COIL + Rl);
  return { vout: I * Rl, I, tau: NBA * I * s * sw };
}
// ---- モーター：電池 V（整流子ありなら sin θ の符号で向きを切りかえ）、I = (V − 逆起電力)/r、τ = NBA·I·sin θ
function motorState(t, w, V, comm) {
  let s = Math.sin(t), sw = comm ? (s >= 0 ? 1 : -1) : 1, vapp = V * sw, I = (vapp - NBA * w * s) / R_COIL;
  return { vapp, I, tau: NBA * I * s };
}
// ---- RK4 で 1 歩：dθ/dt = ω、J dω/dt = τ − まさつ·ω
function motorStep(st, h, V, comm) {
  let f = (t, w) => [w, (motorState(t, w, V, comm).tau - FRICTION * w) / J_ROT];
  let k1 = f(st.th, st.om), k2 = f(st.th + (h / 2) * k1[0], st.om + (h / 2) * k1[1]), k3 = f(st.th + (h / 2) * k2[0], st.om + (h / 2) * k2[1]), k4 = f(st.th + h * k3[0], st.om + h * k3[1]);
  return { th: st.th + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), om: clampv(st.om + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]), -400, 400) };
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
