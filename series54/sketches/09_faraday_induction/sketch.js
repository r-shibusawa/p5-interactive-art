// ============================================
// 09 電磁誘導 ─ 磁石を動かすとコイルに電圧が生まれる
// コイルを通る磁束 Φ が変わると、誘導起電力 V = −N dΦ/dt（ファラデーの法則）。マイナス = 変化をじゃまする向き（レンツの法則）
// Φ は「ベクトルポテンシャル A をコイルにそって 1 周足す」∮A·dl で計算（磁石の中心がコイルを通りぬけても大丈夫）
// 磁石をドラッグ = 出し入れ / スペース = 自動で往復 / ↑↓ = 巻き数 / F = 磁石の向き / R = 最初から
// ============================================

const MU0 = 4 * Math.PI * 1e-7;
const PXM = 2000;                      // ★ 1 m = 2000 px（1 cm = 20 px）
const MDIP = 1.0;                      // ★ 磁石の強さ（磁気モーメント）[A·m²]：小さなネオジム磁石くらい
const A_COIL = 0.03;                   // ★ コイルの半径 [m]
const R_COIL = 10;                     // コイルの抵抗 [Ω]（誘導電流 = 起電力 / R）
const NSEG = 96;                       // 1 周を何本に分けて足すか
let turns = 100, dirM = 1, magnet = { x: -0.18, y: 0 }, target = { x: -0.18, y: 0 }, drag = false, auto = false, tAuto = 0;
let phiPrev = null, emf = 0, hist = { phi: [], emf: [] }, cx, cy, peak = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  cx = width * 0.5; cy = height * 0.36;
  selfTest();
}

function draw() {
  background(14, 18, 26);
  let dt = clampv(deltaTime / 1000, 0.005, 0.05);
  if (auto) { tAuto += dt; target.x = -0.16 * Math.cos(tAuto * 2.4); target.y = 0; }
  magnet.x += (target.x - magnet.x) * 0.35; magnet.y += (target.y - magnet.y) * 0.35;      // マウスの動きを少しなめらかに
  let phi = turns * fluxLoop(magnet.x, magnet.y, dirM);                                // N 巻き全部の磁束
  if (phiPrev !== null) emf = 0.6 * emf + 0.4 * (-(phi - phiPrev) / dt);         // V = −dΦ/dt（少しならす）
  phiPrev = phi; peak = Math.max(peak * 0.995, Math.abs(emf));
  pushCap(hist.phi, phi * 1000, 360); pushCap(hist.emf, emf * 1000, 360);
  drawCoil(emf); drawMagnet();
  // ---- グラフ
  let phiMax = turns * fluxLoop(0, 0, 1) * 1000, emax = Math.max(50, peak * 1000 * 1.1);
  let g1 = { x: 60, y: height * 0.64, w: width * 0.55, h: height * 0.12 }, g2 = { x: 60, y: height * 0.82, w: width * 0.55, h: height * 0.12 };
  plotFrame(g1, '磁束 NΦ [mWb]（コイル全体）', -phiMax * 1.1, phiMax * 1.1); stroke(110, 210, 255); strokeWeight(2); plotTrace(g1, hist.phi, -phiMax * 1.1, phiMax * 1.1, 360);
  plotFrame(g2, '誘導起電力 V = −N dΦ/dt [mV]', -emax, emax); stroke(255, 200, 90); strokeWeight(2); plotTrace(g2, hist.emf, -emax, emax, 360);
  // ---- 数字
  let tx = width * 0.66, y = height * 0.66;
  noStroke(); fill(235); textSize(15);
  for (let s of ['巻き数 N = ' + turns + '　半径 ' + A_COIL * 100 + ' cm', '磁束 NΦ = ' + sci(phi * 1000) + ' mWb', '起電力 V = ' + sci(emf * 1000) + ' mV', '誘導電流 I = V/R = ' + sci((emf / R_COIL) * 1000) + ' mA（R = ' + R_COIL + ' Ω）', 'いちばん大きかった |V| ≈ ' + sci(peak * 1000) + ' mV']) { text(s, tx, y); y += 26; }
  fill(170); textSize(13); text('速く動かすほど dΦ/dt が大きい → 大きな電圧。止めると 0（磁石があっても！）', tx, y + 6, width - tx - 20);
  fill(235); textSize(17);
  text('磁石をドラッグして出し入れ　スペース 自動で往復（' + (auto ? 'ON' : 'OFF') + '）　↑↓ 巻き数　F 磁石の向き　R 最初から', 20, 34);
  fill(170); textSize(13);
  text('磁石は点の磁気双極子 m = ' + MDIP + ' A·m²（赤 = N 極）。Φ = ∮A·dl、A = (μ0/4π) m × r / r³ をコイルの 1 周 ' + NSEG + ' か所で足した。黄の ⊙⊗ = 誘導電流の向き（コイルの上と下で）、緑 = 誘導電流がつくる磁場（変化をじゃまする向き）', 20, 58, width - 40);
  drawSelfTest(20, height - 14);
}

function drawCoil(v) {
  let rx = A_COIL * PXM * 0.35, ry = A_COIL * PXM;
  noFill(); strokeWeight(3);
  for (let k = -4; k <= 4; k++) { stroke(200, 130, 70); ellipse(cx + k * 7, cy, rx * 2, ry * 2); }
  // 誘導電流：起電力 > 0 は 右から見て反時計まわり（右ねじで +x 向きの磁場）
  let s = Math.sign(v), mag2 = clampv(Math.abs(v) / 0.05, 0, 1);
  if (mag2 > 0.02) {
    stroke(255, 230, 120, 80 + 175 * mag2); strokeWeight(3);
    let sym = (x, y, out) => { noFill(); circle(x, y, 18); if (out) { noStroke(); fill(255, 230, 120, 80 + 175 * mag2); circle(x, y, 6); noFill(); } else { line(x - 6, y - 6, x + 6, y + 6); line(x - 6, y + 6, x + 6, y - 6); } stroke(255, 230, 120, 80 + 175 * mag2); };
    sym(cx, cy - ry - 22, s > 0); sym(cx, cy + ry + 22, s < 0);       // 上と下の導線：⊙ 手前へ ⊗ 奥へ
    stroke(120, 255, 170, 80 + 175 * mag2); strokeWeight(4);
    arrowTo(cx - 30 * s, cy, cx + 30 * s, cy, 12);
  }
  noStroke(); fill(200); textSize(13); text('コイル（' + turns + ' 回巻き）', cx - 50, cy + ry + 46);
  // 検流計
  let gx = cx + 260, gy = cy + 40, ang = clampv((v / 0.05) * 0.8, -1.2, 1.2);
  stroke(150); strokeWeight(2); noFill(); arc(gx, gy, 120, 120, PI + 0.3, TWO_PI - 0.3);
  stroke(255, 230, 120); strokeWeight(3); line(gx, gy, gx + 55 * Math.sin(ang), gy - 55 * Math.cos(ang));
  noStroke(); fill(200); text('検流計', gx - 20, gy + 22);
}
function drawMagnet() {
  let x = cx + magnet.x * PXM, y = cy - magnet.y * PXM, L = 120, H = 34;
  noStroke(); fill(dirM > 0 ? color(70, 140, 240) : color(230, 80, 70)); rect(x - L / 2, y - H / 2, L / 2, H, 4);
  fill(dirM > 0 ? color(230, 80, 70) : color(70, 140, 240)); rect(x, y - H / 2, L / 2, H, 4);
  fill(255); textSize(18); textAlign(CENTER, CENTER);
  text(dirM > 0 ? 'S' : 'N', x - L / 4, y); text(dirM > 0 ? 'N' : 'S', x + L / 4, y); textAlign(LEFT, BASELINE);
}

function mousePressed() { drag = Math.abs(mouseX - (cx + magnet.x * PXM)) < 80 && Math.abs(mouseY - (cy - magnet.y * PXM)) < 40; if (drag) auto = false; }
function mouseDragged() { if (drag) { target.x = clampv((mouseX - cx) / PXM, -0.3, 0.3); target.y = clampv((cy - mouseY) / PXM, -0.1, 0.1); } }
function mouseReleased() { drag = false; }
function keyPressed() {
  if (key === ' ') { auto = !auto; tAuto = Math.acos(clampv(-magnet.x / 0.16, -1, 1)) / 2.4; }
  if (key === UP_ARROW) turns = Math.min(500, turns + 50);
  if (key === DOWN_ARROW) turns = Math.max(50, turns - 50);
  if (key === 'f' || key === 'F') dirM *= -1;
  if (key === 'r' || key === 'R') { turns = 100; dirM = 1; auto = false; magnet = { x: -0.18, y: 0 }; target = { x: -0.18, y: 0 }; peak = 0; }
  phiPrev = null;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let a = A_COIL, onAxis = (x) => (MU0 * MDIP * a * a) / (2 * Math.pow(a * a + x * x, 1.5));
  check('軸の上：∮A·dl = μ0ma²/(2(a² + x²)^(3/2))（10⁻⁴ 以内）', [0, 0.02, 0.1].every((x) => nearRel(fluxLoop(x, 0, 1), onAxis(x), 1e-4)));
  let xs = 0.05, ys = 0.04, sB = 0, nr = 200, np = 200;                  // 軸からはずれた所：面の上で B を積分した値と比べる（ストークスの定理）
  for (let i = 0; i < nr; i++) for (let j = 0; j < np; j++) {
    let r = (a * (i + 0.5)) / nr, ph = (2 * Math.PI * (j + 0.5)) / np, P = [0, r * Math.cos(ph), r * Math.sin(ph)];
    sB += dipoleB(P, [xs, ys, 0], 1)[0] * r * (a / nr) * ((2 * Math.PI) / np);
  }
  check('軸からはずれても ∮A·dl = 面を通る B の積分（0.5% 以内）', nearRel(fluxLoop(xs, ys, 1), sB, 0.005));
  check('左右対称：Φ(x) = Φ(−x)', nearRel(fluxLoop(-0.07, 0.01, 1), fluxLoop(0.07, 0.01, 1), 1e-9));
  let pass = (v) => { let N = 100, x0 = -0.25, x1 = 0.0, T = (x1 - x0) / v, n = 2000, h = T / n, s = 0, mx = 0;   // 一定の速さで近づける
    let e = (t) => { let x = x0 + v * t, d = 1e-6; return (-N * (fluxLoop(x + d, 0, 1) - fluxLoop(x - d, 0, 1)) / (2 * d)) * v; };
    for (let k = 0; k <= n; k++) { let w = k === 0 || k === n ? 1 : k % 2 ? 4 : 2, ev = e(k * h); s += (w * ev * h) / 3; mx = Math.max(mx, Math.abs(ev)); }
    return { s, mx, dPhi: N * (fluxLoop(x1, 0, 1) - fluxLoop(x0, 0, 1)) }; };
  let p1 = pass(0.5), p2 = pass(1.0);
  check('起電力を時間で積分 = −NΔΦ（10⁻⁴ 以内）', nearRel(p1.s, -p1.dPhi, 1e-4));
  check('2 倍の速さ → 起電力のピークも 2 倍（積分は同じ）', nearRel(p2.mx / p1.mx, 2, 1e-6) && nearRel(p2.s, p1.s, 1e-4));
  check('レンツ：N 極を近づけると Φ が増え、起電力は負（反対向きの磁場をつくる）', fluxLoop(-0.05, 0, 1) > fluxLoop(-0.06, 0, 1) && p1.s < 0);
  check('遠くでは Φ ≈ 0（中心の 10⁻⁴ 以下）', fluxLoop(-1, 0, 1) < 1e-4 * fluxLoop(0, 0, 1));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 磁石をゆっくり・速く入れて、起電力のピークを比べよう。磁束のグラフの「傾き」との関係は？
// 2. 磁石をコイルの中で止めると、Φ は大きいのに起電力は 0。なぜ？
// 3. 入れるときと出すときで、起電力の符号はどうなる？ F で磁石を反対にすると？
// 4. ↑ で巻き数を 2 倍にすると起電力は？（IH 調理器や変圧器はたくさん巻いている）
// 5. 磁石を軸から上にずらして通すと、Φ のグラフの形はどう変わる？


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 磁気双極子（位置 c、向き ±x、強さ MDIP）のベクトルポテンシャル A = (μ0/4π) m × r / r³
function dipoleA(P, c, dir) {
  let rx = P[0] - c[0], ry = P[1] - c[1], rz = P[2] - c[2], r = Math.max(0.004, Math.sqrt(rx * rx + ry * ry + rz * rz)), f = (1e-7 * MDIP * dir) / (r * r * r);
  return [0, -f * rz, f * ry];                     // m = (dir·MDIP, 0, 0) なので m × r = (0, −m·rz, m·ry)
}
// ---- 磁気双極子の磁場 B = (μ0/4π)(3(m·r̂)r̂ − m)/r³（自己テスト用）
function dipoleB(P, c, dir) {
  let rx = P[0] - c[0], ry = P[1] - c[1], rz = P[2] - c[2], r = Math.sqrt(rx * rx + ry * ry + rz * rz), m = MDIP * dir, mr = (m * rx) / r;
  let f = 1e-7 / (r * r * r);
  return [f * (3 * mr * (rx / r) - m), f * 3 * mr * (ry / r), f * 3 * mr * (rz / r)];
}
// ---- コイル 1 巻き（x = 0 の面、半径 A_COIL）を通る磁束 Φ = ∮A·dl（磁石は (mx, my, 0)）
function fluxLoop(mx, my, dir) {
  let s = 0;
  for (let k = 0; k < NSEG; k++) {
    let p0 = (2 * Math.PI * k) / NSEG, p1 = (2 * Math.PI * (k + 1)) / NSEG, pm = (p0 + p1) / 2;
    let P = [0, A_COIL * Math.cos(pm), A_COIL * Math.sin(pm)], dl = [0, -A_COIL * (p1 - p0) * Math.sin(pm), A_COIL * (p1 - p0) * Math.cos(pm)];   // 円にそった接線 × 弧の長さ
    let A = dipoleA(P, [mx, my, 0], dir);
    s += A[1] * dl[1] + A[2] * dl[2];
  }
  return s;
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
