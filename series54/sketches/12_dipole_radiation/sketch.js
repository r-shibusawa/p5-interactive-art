// ============================================
// 12 アンテナからの電波 ─ 振動する電気双極子のまわりの電気力線
// まん中の短いアンテナで ＋ と − が入れかわり続ける（ヘルツの双極子）。電場は式で正確にわかる（解析解）
// 電気力線 = 関数 Ψ = sin²θ·(cos(kr − ωt)/(kr) + sin(kr − ωt)) の等高線。近くでは双極子の形、遠くでは輪が切りはなされて光の速さで飛んでいく
// ←→ = 波長（周波数）/ スペース = 止める / C = 色 / ↑↓ = 線の数
// ============================================

const CPX = 110;                       // ★ 画面の上での光の速さ [px/秒]（本物は 3×10⁸ m/s）
const PX_M = 0.01;                     // ★ 1 px = 1 cm として周波数を計算
const CELL = 6;                        // 等高線の格子 [px]
let lam = 220, phase = 0, paused = false, showColor = true, nLev = 6, cx, cy, NX, NY, psi, img;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cx = width * 0.38; cy = height * 0.55;
  NX = Math.ceil(width * 0.76 / CELL) + 1; NY = Math.ceil((height - 120) / CELL) + 1;
  psi = new Float64Array(NX * NY); img = createImage(NX, NY);
  selfTest();
}

function draw() {
  background(14, 18, 26);
  let k = (2 * Math.PI) / lam;
  if (!paused) phase += (2 * Math.PI * CPX / lam) * Math.min(deltaTime, 50) / 1000;     // ωt
  img.loadPixels();
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let x = i * CELL - cx, z = cy - (120 + j * CELL), r = Math.hypot(x, z), th = Math.atan2(Math.abs(x), z);
    let v = streamPsi(Math.max(k * r, 0.25), th, phase), q = j * NX + i, p = 4 * q;
    psi[q] = v;
    let e = showColor ? clampv(Math.abs(v), 0, 1.2) / 1.2 : 0;                           // 色：|Ψ|
    img.pixels[p] = 14 + (v > 0 ? 120 * e : 30 * e); img.pixels[p + 1] = 18 + 50 * e; img.pixels[p + 2] = 30 + (v < 0 ? 150 * e : 30 * e); img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  image(img, -CELL / 2, 120 - CELL / 2, NX * CELL, NY * CELL);
  stroke(240, 245, 255, 210); strokeWeight(1.4);
  for (let L = 1; L <= nLev; L++) for (let sgn of [1, -1]) {
    let lev = (sgn * L) / (nLev + 1) * 1.4;
    for (let s of marchingSquares(psi, NX, NY, lev)) line(s[0] * CELL, 120 + s[1] * CELL, s[2] * CELL, 120 + s[3] * CELL);
  }
  // 近い場と遠い場の境目 r = λ/2π
  noFill(); stroke(255, 230, 120, 120); drawingContext.setLineDash([5, 6]); circle(cx, cy, (2 * lam) / (2 * Math.PI)); drawingContext.setLineDash([]);
  // アンテナ（電荷 ± が入れかわる）
  let q = Math.cos(phase);
  stroke(200); strokeWeight(4); line(cx, cy - 18, cx, cy + 18);
  noStroke(); fill(q > 0 ? color(240, 90, 70) : color(70, 150, 250)); circle(cx, cy - 20, 6 + 10 * Math.abs(q));
  fill(q > 0 ? color(70, 150, 250) : color(240, 90, 70)); circle(cx, cy + 20, 6 + 10 * Math.abs(q));
  drawPattern(width * 0.86, height * 0.42, Math.min(130, width * 0.1));
  // 文字
  let f = (CPX / lam), fReal = 3e8 / (lam * PX_M);
  noStroke(); fill(235); textSize(17);
  text('←→ 波長　スペース 止める（' + (paused ? '止めている' : '動いている') + '）　C 色　↑↓ 線の数', 20, 34);
  fill(255, 230, 120); textSize(15);
  text('波長 λ = ' + lam + ' px（1 px = 1 cm なら ' + (lam * PX_M).toFixed(2) + ' m → f = c/λ = ' + sci(fReal / 1e6) + ' MHz）', 20, 60);
  fill(170); textSize(13);
  text('白線 = 電気力線（たての断面、アンテナはまん中でたて向き）。点線の円 r = λ/2π より内側は「近い場」（双極子の形）、外側は「遠い場」（電波）。画面では光の速さ = ' + CPX + ' px/秒', 20, 82, width * 0.7);
  noStroke(); fill(0, 0, 0, 160); rect(10, height - 32, 150, 26, 4);
  drawSelfTest(20, height - 14);
}

// 右：放射の強さの向き（遠くの E を式で計算して |E|² の時間平均）と sin²θ
function drawPattern(x, y, R) {
  noFill(); stroke(70, 80, 100); circle(x, y, 2 * R); line(x, y - R - 10, x, y + R + 10);
  let pts = [], pts2 = [];
  for (let a = 0; a <= 360; a += 3) {
    let th = (a * Math.PI) / 180, s = farIntensity(Math.abs(th) % (2 * Math.PI)), r = R * s;
    pts.push([x + r * Math.sin(th), y - r * Math.cos(th)]);
    let r2 = R * Math.sin(th) ** 2; pts2.push([x + r2 * Math.sin(th), y - r2 * Math.cos(th)]);
  }
  stroke(255, 200, 90); strokeWeight(3); polyline(pts);
  stroke(120, 230, 255); strokeWeight(1.5); drawingContext.setLineDash([4, 4]); polyline(pts2); drawingContext.setLineDash([]);
  noStroke(); fill(220); textSize(13);
  text('放射の強さ（向きごと）', x - R, y - R - 30);
  fill(255, 200, 90); text('橙：kr = 200 で計算した |E|²', x - R, y + R + 30); fill(120, 230, 255); text('点線：sin²θ（アンテナの向きには出ない）', x - R, y + R + 50);
}

function keyPressed() {
  if (key === RIGHT_ARROW) lam = Math.min(400, lam + 20);
  if (key === LEFT_ARROW) lam = Math.max(60, lam - 20);
  if (key === UP_ARROW) nLev = Math.min(12, nLev + 1);
  if (key === DOWN_ARROW) nLev = Math.max(2, nLev - 1);
  if (key === ' ') paused = !paused;
  if (key === 'c' || key === 'C') showColor = !showColor;
  if (key === 'r' || key === 'R') { lam = 220; nLev = 6; paused = false; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let worst = 0;
  for (let n = 0; n < 40; n++) {                           // E が Ψ の等高線にそっている（E·∇Ψ = 0）
    let kr = 0.3 + n * 0.37, th = 0.2 + ((n * 0.61) % 2.7), wt = n * 0.9, e = fieldE(kr, th, wt), h = 1e-6;
    let dr = (streamPsi(kr + h, th, wt) - streamPsi(kr - h, th, wt)) / (2 * h), dth = (streamPsi(kr, th + h, wt) - streamPsi(kr, th - h, wt)) / (2 * h) / kr;
    worst = Math.max(worst, Math.abs(e[0] * dr + e[1] * dth) / (Math.hypot(e[0], e[1]) * Math.hypot(dr, dth) + 1e-300));
  }
  check('式の電場 E は Ψ の等高線（電気力線）にそっている（E·∇Ψ ≈ 0）', worst < 1e-5);
  check('遠くの放射の強さ ∝ sin²θ（1% 以内）', [0.3, 0.7, 1.2].every((t) => nearRel(farIntensity(t), Math.sin(t) ** 2, 0.01)));
  let P = 0, n = 2000; for (let i = 0; i < n; i++) { let t = (Math.PI * (i + 0.5)) / n, c = cplxE(500, t); P += (c[2] * c[2] + c[3] * c[3]) * 500 * 500 * 2 * Math.PI * Math.sin(t) * (Math.PI / n); }
  check('全部の向きに出る電力 ∝ ∫sin²θ dΩ = 8π/3（ラーモアの式の形、1% 以内）', nearRel(P, (8 * Math.PI) / 3, 0.01));
  let e0 = fieldE(0.01, 0.6, 0);
  check('ごく近く（kr ≪ 1）は ふつうの双極子：E_r/E_θ = 2 cot θ', nearRel(e0[0] / e0[1], 2 / Math.tan(0.6), 1e-3));
  let root = (wt) => { let lo = 40, hi = 40 + Math.PI; for (let i = 0; i < 60; i++) { let m = (lo + hi) / 2; (Math.sign(streamPsi(m, Math.PI / 2, wt)) === Math.sign(streamPsi(lo, Math.PI / 2, wt))) ? (lo = m) : (hi = m); } return lo; };
  check('遠くの輪は光の速さで進む（Δ(kr) = Δ(ωt)、1% 以内）', nearRel(root(0.5) - root(0), 0.5, 0.01));
  check('c = fλ：λ = 2 m → f = 150 MHz', near(3e8 / 2 / 1e6, 150, 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 止めて（スペース）、電気力線の輪がアンテナから切りはなされる瞬間を探そう
// 2. ←→ で波長を変えると、点線の円（λ/2π）と輪の間隔はどう変わる？
// 3. アンテナの真上（たての向き）には電波が出ない。右の図で確かめよう。テレビのアンテナの向きとの関係は？
// 4. FM ラジオ（80 MHz）の波長は何 m？ そのときの半波長アンテナの長さは？
// 5. CPX を変えて、画面の上での光の速さを変えてみよう


// ==================================================
// ここから下は「電磁気の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 電気力線の関数 Ψ（kr、θ = アンテナの向きからの角度、wt = ωt）
function streamPsi(kr, th, wt) { let a = kr - wt; return Math.sin(th) ** 2 * (Math.cos(a) / kr + Math.sin(a)); }
// ---- ヘルツの双極子の電場（係数 k³p/4πε0 を 1 にした値）：複素数で [Re E_r, Im E_r, Re E_θ, Im E_θ]（時刻 0）
// E_r = 2cosθ (1/(kr)³ − i/(kr)²) e^{ikr}、E_θ = sinθ (1/(kr)³ − i/(kr)² − 1/(kr)) e^{ikr}
function cplxE(kr, th) {
  let c = Math.cos(kr), s = Math.sin(kr), a = 1 / kr ** 3, b = 1 / kr ** 2, d = 1 / kr;
  let mul = (re, im) => [re * c - im * s, re * s + im * c];
  let er = mul(a, -b), et = mul(a - d, -b);
  return [2 * Math.cos(th) * er[0], 2 * Math.cos(th) * er[1], Math.sin(th) * et[0], Math.sin(th) * et[1]];
}
// ---- 時刻 t の本物の電場 Re(E e^{−iωt}) = [E_r, E_θ]
function fieldE(kr, th, wt) { let c = cplxE(kr, th), cw = Math.cos(wt), sw = Math.sin(wt); return [c[0] * cw + c[1] * sw, c[2] * cw + c[3] * sw]; }
// ---- 遠く（kr = 200）での |E|² の時間平均を、θ = 90° を 1 として
function farIntensity(th) { let c = cplxE(200, th), m = cplxE(200, Math.PI / 2); return (c[0] ** 2 + c[1] ** 2 + c[2] ** 2 + c[3] ** 2) / (m[2] ** 2 + m[3] ** 2); }
// ---- マーチング・スクエア：値 = level の線分 [x1, y1, x2, y2]（格子の単位）
function marchingSquares(g, nx, ny, level) {
  let segs = [];
  let at = (a, b, ia, ja, ib, jb) => { let t = (level - a) / (b - a); return [ia + t * (ib - ia), ja + t * (jb - ja)]; };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let v0 = g[j * nx + i], v1 = g[j * nx + i + 1], v2 = g[(j + 1) * nx + i + 1], v3 = g[(j + 1) * nx + i];
    let pts = [];
    if ((v0 > level) !== (v1 > level)) pts.push(at(v0, v1, i, j, i + 1, j));
    if ((v1 > level) !== (v2 > level)) pts.push(at(v1, v2, i + 1, j, i + 1, j + 1));
    if ((v2 > level) !== (v3 > level)) pts.push(at(v2, v3, i + 1, j + 1, i, j + 1));
    if ((v3 > level) !== (v0 > level)) pts.push(at(v3, v0, i, j + 1, i, j));
    if (pts.length >= 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
    if (pts.length === 4) segs.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
  }
  return segs;
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
