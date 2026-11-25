// ============================================
// 03 正規分布の族は双曲平面 ─ 正規分布 N(μ, σ) を (μ, σ) の上半平面の点として並べ、フィッシャー情報で長さを測る
// フィッシャー計量 ds² = (dμ² + 2dσ²) / σ²：σ が小さい（とがった）分布ほど、同じ Δμ でも「遠い」（区別しやすい）
// 最短路（測地線）は横に √2 倍した半円 = 半楕円。距離 d = √2·arccosh(1 + (Δμ²/2 + Δσ²)/(2σ1σ2))
// 測地線の方程式を RK4 で解いた道（点線）と、半楕円の長さの数値積分が、閉じた式とぴったり合う（ポアンカレ円板はシリーズ 28 の 09）
// ドラッグ A・B を動かす / E 等距離の円 / G 分布の形を並べる / 1 σ が小さい所で比べる 2 σ が大きい所で比べる / R もどす
// ============================================

const MU_RANGE = [-4, 4], SG_RANGE = [0, 3];   // ★ 図の範囲
let ptA = [-1, 0.6], ptB = [1.5, 1.2], grab = null, showEq = true, showGlyph = true, pb, field = null, fieldKey = '', rkPath = [], dAB = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest(); layout();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() { pb = plotBox(70, 100, width * 0.6, height - 190, MU_RANGE[0], MU_RANGE[1], SG_RANGE[0], SG_RANGE[1]); fieldKey = ''; }
// ★ A から B への測地線の向き（半楕円の接線）を、計量で長さ 1 にした速度にする
function initialVelocity(A, B) {
  let u1 = A[0] / Math.SQRT2, u2 = B[0] / Math.SQRT2, vm, vs;
  if (Math.abs(u1 - u2) < 1e-12) { vm = 0; vs = B[1] > A[1] ? 1 : -1; }
  else {
    let c = (u2 * u2 + B[1] * B[1] - u1 * u1 - A[1] * A[1]) / (2 * (u2 - u1)), t1 = Math.atan2(A[1], u1 - c), t2 = Math.atan2(B[1], u2 - c), sg = t2 > t1 ? 1 : -1;
    vm = -Math.sin(t1) * sg * Math.SQRT2; vs = Math.cos(t1) * sg;
  }
  let sp = Math.sqrt(vm * vm + 2 * vs * vs) / A[1];
  return [vm / sp, vs / sp];
}
function shoot(A, B, n) { let v = initialVelocity(A, B); return geodesicRK4(A[0], A[1], v[0], v[1], gaussFR(A[0], A[1], B[0], B[1]), n); }
function eqCircle(C, d) {                // A から距離 d の点の集まり：(u, σ) では中心 (u0, σ0 cosh(d/√2))、半径 σ0 sinh(d/√2) の円
  let r = d / Math.SQRT2, cy = C[1] * Math.cosh(r), rr = C[1] * Math.sinh(r), out = [];
  for (let k = 0; k <= 120; k++) { let t = (2 * Math.PI * k) / 120; out.push([C[0] + Math.SQRT2 * rr * Math.cos(t), cy + rr * Math.sin(t)]); }
  return out;
}

function draw() {
  background(...BG);
  hudTitle('正規分布の族は双曲平面：(μ, σ) の上半平面とフィッシャー計量', 'ドラッグ A・B　E 等距離の円 ' + (showEq ? 'ON' : 'OFF') + '　G 分布の形 ' + (showGlyph ? 'ON' : 'OFF') + '　1 σ が小さい所　2 σ が大きい所　R もどす');
  let fk = ptA.join(',') + '|' + width + 'x' + height;
  if (fk !== fieldKey) {                // A からの距離の等高線（A が動いたときだけ作り直す）
    fieldKey = fk; freeField(field);
    field = gridField(pb, (m, s) => (s > 0.005 ? gaussFR(ptA[0], ptA[1], m, s) : 9), { level: 0.5, vmax: 5, cap: 4.6, c0: [60, 85, 125], c1: [28, 38, 60], res: 4 });
  }
  drawField(field); drawAxes(pb, 'μ（平均）', 'σ（標準偏差）　背景 = A からのフィッシャー-ラオ距離（0.5 ごと）');
  if (showGlyph) for (let m = -3; m <= 3; m += 1.5) for (let s of [0.35, 0.9, 1.8, 2.6]) {   // その点の正規分布の形
    let [cx, cy] = toScr(pb, m, s); noFill(); stroke(...SAND, 120); strokeWeight(1); beginShape();
    for (let k = 0; k <= 30; k++) { let x = m - 0.65 + (1.3 * k) / 30, [sx] = toScr(pb, x, 0); vertex(sx, cy - 24 * Math.exp(-((x - m) * (x - m)) / (2 * s * s))); }   // 高さをそろえた形（幅 = σ）
    endShape();
  }
  if (showEq) for (let d of [0.5, 1, 1.5, 2]) plotLine(pb, eqCircle(ptA, d), [...TEAL, 170], 1.2);
  dAB = gaussFR(ptA[0], ptA[1], ptB[0], ptB[1]);
  let geo = gaussGeodesic(ptA[0], ptA[1], ptB[0], ptB[1], 400);
  plotLine(pb, [ptA, ptB], [...DIMC, 160], 1.5);                       // ふつうの直線（最短ではない）
  plotLine(pb, geo, ORANGE, 3.5);
  rkPath = shoot(ptA, ptB, 400);
  drawingContext.setLineDash([6, 6]); plotLine(pb, rkPath, VIOLET, 2); drawingContext.setLineDash([]);
  for (let [P, nm, col] of [[ptA, 'A', ORANGE], [ptB, 'B', VIOLET]]) { let [x, y] = toScr(pb, P[0], P[1]); stroke(...BG); strokeWeight(2); fill(...col); circle(x, y, 16); noStroke(); textSize(16); textAlign(LEFT, CENTER); text(nm, x + 10, y - 12); }
  // ---- 右：数値
  let rx = pb.x + pb.w + 40, Lgeo = metricLength(gaussGeodesic(ptA[0], ptA[1], ptB[0], ptB[1], 4000)), Lline = metricLength(Array.from({ length: 4001 }, (_, k) => [ptA[0] + ((ptB[0] - ptA[0]) * k) / 4000, ptA[1] + ((ptB[1] - ptA[1]) * k) / 4000]));
  let end = rkPath[rkPath.length - 1];
  noStroke(); textAlign(LEFT, BASELINE); fill(...INK); textSize(16);
  text('A = N(' + fmtN(ptA[0], 2) + ', ' + fmtN(ptA[1], 2) + '²)', rx, 130); text('B = N(' + fmtN(ptB[0], 2) + ', ' + fmtN(ptB[1], 2) + '²)', rx, 154);
  fill(...ORANGE); text('閉じた式の距離 d = ' + fmtN(dAB, 5), rx, 190);
  text('半楕円の長さ（数値積分）= ' + fmtN(Lgeo, 5), rx, 214);
  fill(...VIOLET); text('RK4 で撃った測地線の終点', rx, 244); text('  (' + fmtN(end[0], 4) + ', ' + fmtN(end[1], 4) + ')', rx, 266);
  fill(...DIMC); text('まっすぐな線分の長さ = ' + fmtN(Lline, 5) + '（長い）', rx, 296);
  fill(...TEAL); textSize(14); text('緑の円 = A から距離 0.5, 1, 1.5, 2。上ほど大きい', rx, 326);
  fill(...INK); text('KL との関係：近い 2 点では D ≈ ½ d²', rx, 356);
  fill(...DIMC); text('D(A‖B) = ' + fmtN(gaussKL(ptA[0], ptA[1], ptB[0], ptB[1]), 4) + '、½ d² = ' + fmtN(0.5 * dAB * dAB, 4), rx, 378);
  // 2 つの分布の形
  let b2 = plotBox(rx, 420, width - rx - 40, 150, -5, 5, 0, 1.3), ca = [], cb = [];
  for (let k = 0; k <= 200; k++) { let x = -5 + k / 20; ca.push([x, Math.min(1.3, gaussPdf(x, ptA[0], ptA[1]))]); cb.push([x, Math.min(1.3, gaussPdf(x, ptB[0], ptB[1]))]); }
  drawAxes(b2, 'x', '2 つの正規分布の形'); plotLine(b2, ca, ORANGE, 2); plotLine(b2, cb, VIOLET, 2);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  let [ax, ay] = toScr(pb, ptA[0], ptA[1]), [bx, by] = toScr(pb, ptB[0], ptB[1]);
  grab = dist(mouseX, mouseY, ax, ay) < 20 ? 'A' : dist(mouseX, mouseY, bx, by) < 20 ? 'B' : null;
}
function mouseDragged() {
  if (!grab) return;
  let [m, s] = fromScr(pb, mouseX, mouseY), P = [clampv(m, MU_RANGE[0], MU_RANGE[1]), clampv(s, 0.08, SG_RANGE[1])];
  if (grab === 'A') ptA = P; else ptB = P;
}
function mouseReleased() { grab = null; }
function keyPressed() {
  if (key === 'e' || key === 'E') showEq = !showEq;
  if (key === 'g' || key === 'G') showGlyph = !showGlyph;
  if (key === '1') { ptA = [-1, 0.3]; ptB = [1, 0.3]; }
  if (key === '2') { ptA = [-1, 2]; ptB = [1, 2]; }
  if (key === 'r' || key === 'R') { ptA = [-1, 0.6]; ptB = [1.5, 1.2]; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(8); let okLen = true, okShoot = true, okLine = true, worst = 0;
  for (let k = 0; k < 12; k++) {
    let A = [rnd() * 6 - 3, 0.2 + rnd() * 2], B = [rnd() * 6 - 3, 0.2 + rnd() * 2], d = gaussFR(A[0], A[1], B[0], B[1]);
    let L = metricLength(gaussGeodesic(A[0], A[1], B[0], B[1], 6000)); worst = Math.max(worst, Math.abs(L - d));
    if (Math.abs(L - d) > 1e-4) okLen = false;
    let e = shoot(A, B, 2000).pop(); if (Math.hypot(e[0] - B[0], e[1] - B[1]) > 1e-4) okShoot = false;
    let Ls = metricLength(Array.from({ length: 3001 }, (_, i) => [A[0] + ((B[0] - A[0]) * i) / 3000, A[1] + ((B[1] - A[1]) * i) / 3000]));
    if (Ls < d - 1e-6) okLine = false;
  }
  check('閉じた式 √2·arccosh(…) = 半楕円の長さの数値積分（12 組、最大誤差 ' + worst.toExponential(1) + ' ≤ 1e-4）', okLen);
  check('測地線の方程式を RK4 で長さ d だけ進むと B に着く（12 組、誤差 1e-4）', okShoot);
  check('まっすぐな線分は測地線より長い（12 組）', okLine);
  check('同じ Δμ = 2 でも σ = 0.3 では d = ' + fmtN(gaussFR(-1, 0.3, 1, 0.3), 3) + '、σ = 2 では d = ' + fmtN(gaussFR(-1, 2, 1, 2), 3), gaussFR(-1, 0.3, 1, 0.3) > 3 * gaussFR(-1, 2, 1, 2));
  let okEq = eqCircle([0.5, 0.8], 1.3).every((P) => Math.abs(gaussFR(0.5, 0.8, P[0], P[1]) - 1.3) < 1e-9);
  check('等距離の円の上の 121 点はどれも距離 1.3（誤差 1e-9）', okEq);
  let h = 1e-3, kl = gaussKL(0.3, 0.7, 0.3 + h, 0.7 + h), ds2 = (h * h + 2 * h * h) / (0.7 * 0.7);
  check('近い 2 点で KL ≈ ½ ds²（フィッシャー計量そのもの、相対誤差 1e-2）', Math.abs(kl / (0.5 * ds2) - 1) < 1e-2);
  check('σ だけちがう 2 点の距離 = √2 |log(σ2/σ1)|（縦の直線が測地線）', Math.abs(gaussFR(0, 0.5, 0, 2) - Math.SQRT2 * Math.log(4)) < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 と 2 を押して、同じ Δμ = 2 の 2 点の距離を比べよう。なぜ σ が小さいと遠い？（分布の形を見る）
// 2. A を下（σ → 0）へ近づけると、等距離の円はどうなる？ σ = 0 の線は「無限に遠い」
// 3. 測地線はなぜ上に膨らむ？ 「一度ぼかしてから移動する」ほうが近道になる理由を考えよう
// 4. 計量の 2 を 1 に変えると、ふつうの双曲平面（シリーズ 28 の 09）と同じになる。半楕円は半円になる
// 5. 平均だけを動かす族（σ 固定）は直線、σ だけの族は縦の直線。どちらも測地線？

// ==================================================
// ここから下は「情報幾何の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（等高線地図の色）
const BG = [22, 33, 52];                // 背景（深いスレートブルー）
const INK = [240, 236, 226];            // 文字（紙の白）
const ORANGE = [255, 150, 75], VIOLET = [170, 140, 255], TEAL = [95, 205, 190], ROSE = [255, 110, 125], LIME = [150, 225, 120], SAND = [235, 210, 150];
const DIMC = [140, 152, 175], PANEL = [32, 46, 70], WIRE = [62, 80, 110];
const OUTC = [[255, 150, 75], [95, 205, 190], [170, 140, 255], [235, 210, 150], [255, 110, 125], [150, 225, 120], [120, 175, 255], [230, 140, 210]];   // 結果ごとの色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; return v.toFixed(d === undefined ? 2 : d); }
function fmtP(p, d) { return '(' + p.map((v) => fmtN(v, d === undefined ? 2 : d)).join(', ') + ')'; }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function drawField(f) { if (f) image(f.img, f.x, f.y, f.w, f.h); }   // 等高線の地図（画像）を描く
function freeField(f) { if (f && f.img) f.img.remove(); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function gaussRnd() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布（ボックス-ミュラー法）
function rndDist(k, floor) {            // でたらめな確率分布（k 個、どれも floor 以上）
  let p = []; for (let i = 0; i < k; i++) p.push(-Math.log(1 - rnd()) + 1e-9);
  return mixFloor(normP(p), floor || 0);
}
function sampleIndex(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
// ---- 情報の道具：確率分布 p = [p1, p2, ...]（合計 1）。log(0) は 0·log 0 = 0 として扱う
const TINY = 1e-300;
function normP(p) { let s = 0; for (let v of p) s += Math.max(0, v); if (!(s > 0)) return p.map(() => 1 / p.length); return p.map((v) => Math.max(0, v) / s); }
function mixFloor(p, f) { if (!f) return p; return normP(p.map((v) => Math.max(v, f))); }   // どの確率も f 以上に（0 を避ける）
function safeLog(v) { return Math.log(Math.max(v, TINY)); }
function entropyH(p) { let h = 0; for (let v of p) if (v > 0) h -= v * Math.log(v); return h; }           // エントロピー（ナット）
function divKL(p, q) {                  // KL ダイバージェンス D(p‖q)（ナット）。q が 0 で p > 0 なら ∞
  let d = 0;
  for (let i = 0; i < p.length; i++) { if (p[i] <= 0) continue; if (q[i] <= 0) return Infinity; d += p[i] * Math.log(p[i] / q[i]); }
  return Math.max(0, d);
}
function crossH(p, q) { let h = 0; for (let i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * safeLog(q[i]); return h; }  // 交差エントロピー
function bhatta(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.sqrt(Math.max(0, p[i] * q[i])); return Math.min(1, s); }
function fisherRao(p, q) { return 2 * Math.acos(clampv(bhatta(p, q), -1, 1)); }                          // フィッシャー-ラオ距離 = 球の大円の長さ
function hellingerSq(p, q) { let s = 0; for (let i = 0; i < p.length; i++) { let d = Math.sqrt(p[i]) - Math.sqrt(q[i]); s += d * d; } return s; }   // Σ(√p − √q)²
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }
function alphaDiv(p, q, a) {            // α-ダイバージェンス（甘利の流儀）。α → −1 で D(p‖q)、α → +1 で D(q‖p)
  if (Math.abs(a + 1) < 1e-12) return divKL(p, q);
  if (Math.abs(a - 1) < 1e-12) return divKL(q, p);
  let s = 0, ea = (1 - a) / 2, eb = (1 + a) / 2;
  for (let i = 0; i < p.length; i++) s += Math.pow(Math.max(p[i], 0), ea) * Math.pow(Math.max(q[i], 0), eb);
  return Math.max(0, (4 / (1 - a * a)) * (1 - s));
}
function mixM(p, q, t) { return p.map((v, i) => (1 - t) * v + t * q[i]); }                       // m-測地線：確率をそのまま混ぜる
function mixE(p, q, t) { return normP(p.map((v, i) => Math.exp((1 - t) * safeLog(v) + t * safeLog(q[i])))); }   // e-測地線：対数で混ぜて正規化
function mixAlpha(p, q, t, a) {         // α-測地線：u^((1−α)/2) で混ぜて正規化（α = −1 は m、α = +1 は e）
  if (Math.abs(a - 1) < 1e-9) return mixE(p, q, t);
  let ex = (1 - a) / 2;
  return normP(p.map((v, i) => Math.pow((1 - t) * Math.pow(v, ex) + t * Math.pow(q[i], ex), 1 / ex)));
}
function bitsOf(nat) { return nat / Math.LN2; }
// ---- 正規分布 N(μ, σ) の道具。フィッシャー計量 ds² = (dμ² + 2dσ²) / σ²
function gaussPdf(x, m, s) { return Math.exp(-((x - m) * (x - m)) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI)); }
function gaussFR(m1, s1, m2, s2) {      // フィッシャー-ラオ距離（閉じた式）
  let a = ((m1 - m2) * (m1 - m2)) / 2 + (s1 - s2) * (s1 - s2);
  return Math.SQRT2 * Math.acosh(1 + a / (2 * s1 * s2));
}
function gaussKL(m1, s1, m2, s2) { return Math.log(s2 / s1) + (s1 * s1 + (m1 - m2) * (m1 - m2)) / (2 * s2 * s2) - 0.5; }   // D(N1‖N2)
// ★ 測地線：u = μ/√2 と置くと (u, σ) では半円（中心は σ = 0 の上）→ (μ, σ) では横に √2 倍の半楕円
function gaussGeodesic(m1, s1, m2, s2, n) {
  let u1 = m1 / Math.SQRT2, u2 = m2 / Math.SQRT2, out = [];
  if (Math.abs(u1 - u2) < 1e-9 * (1 + Math.abs(u1))) { for (let k = 0; k <= n; k++) out.push([m1, s1 * Math.pow(s2 / s1, k / n)]); return out; }
  let c = (u2 * u2 + s2 * s2 - u1 * u1 - s1 * s1) / (2 * (u2 - u1)), rr = Math.hypot(u1 - c, s1);
  let t1 = Math.atan2(s1, u1 - c), t2 = Math.atan2(s2, u2 - c);
  for (let k = 0; k <= n; k++) { let t = t1 + ((t2 - t1) * k) / n; out.push([(c + rr * Math.cos(t)) * Math.SQRT2, rr * Math.sin(t)]); }
  return out;
}
function metricLength(path) {           // 折れ線の長さをフィッシャー計量で（区間の真ん中の σ を使う）
  let L = 0;
  for (let k = 1; k < path.length; k++) {
    let dm = path[k][0] - path[k - 1][0], ds = path[k][1] - path[k - 1][1], sm = (path[k][1] + path[k - 1][1]) / 2;
    L += Math.sqrt(dm * dm + 2 * ds * ds) / sm;
  }
  return L;
}
// 測地線の方程式（クリストッフェル記号から）：μ'' = 2μ'σ'/σ、σ'' = −μ'²/(2σ) + σ'²/σ を RK4 で解く
function geodesicRK4(m, s, vm, vs, T, n) {
  let st = [m, s, vm, vs], h = T / n, out = [[m, s]];
  let fd = (y) => [y[2], y[3], (2 * y[2] * y[3]) / y[1], (-y[2] * y[2]) / (2 * y[1]) + (y[3] * y[3]) / y[1]];
  for (let k = 0; k < n; k++) {
    let k1 = fd(st), k2 = fd(st.map((v, i) => v + (h / 2) * k1[i])), k3 = fd(st.map((v, i) => v + (h / 2) * k2[i])), k4 = fd(st.map((v, i) => v + h * k3[i]));
    st = st.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    if (!(st[1] > 1e-6)) st[1] = 1e-6;
    out.push([st[0], st[1]]);
  }
  return out;
}
// ---- 2 次元の図の枠（データ座標 ↔ 画面）
function plotBox(x, y, w, h, x0, x1, y0, y1) { return { x, y, w, h, x0, x1, y0, y1 }; }
function toScr(b, u, v) { return [b.x + ((u - b.x0) / (b.x1 - b.x0)) * b.w, b.y + b.h - ((v - b.y0) / (b.y1 - b.y0)) * b.h]; }
function fromScr(b, sx, sy) { return [b.x0 + ((sx - b.x) / b.w) * (b.x1 - b.x0), b.y0 + ((b.y + b.h - sy) / b.h) * (b.y1 - b.y0)]; }
function drawAxes(b, xl, yl) {
  noFill(); stroke(...WIRE); strokeWeight(1); rect(b.x, b.y, b.w, b.h);
  noStroke(); fill(...DIMC); textSize(12); textAlign(CENTER, TOP); text(xl, b.x + b.w / 2, b.y + b.h + 16);
  textAlign(LEFT, TOP); text(fmtN(b.x0, 1), b.x, b.y + b.h + 3); textAlign(RIGHT, TOP); text(fmtN(b.x1, 1), b.x + b.w, b.y + b.h + 3);
  textAlign(RIGHT, CENTER); text(fmtN(b.y0, 1), b.x - 4, b.y + b.h); text(fmtN(b.y1, 1), b.x - 4, b.y); textAlign(LEFT, BOTTOM); text(yl, b.x, b.y - 4);
}
function plotLine(b, pts, col, w) {      // データ座標の点列を折れ線に（枠の外の部分は枠のふちで切る）
  if (!pts || pts.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2);
  let run = [], x0 = b.x - 1, x1 = b.x + b.w + 1, y0 = b.y - 1, y1 = b.y + b.h + 1;
  let flush = () => { if (run.length >= 2) { beginShape(); for (let q of run) vertex(q[0], q[1]); endShape(); } run = []; };
  let clip = (a, c) => {                 // 線分 a→c の枠の中の部分 [t0, t1]（リャン-バースキー法）。なければ null
    let t0 = 0, t1 = 1, dx = c[0] - a[0], dy = c[1] - a[1];
    for (let [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      let r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    return t0 <= t1 ? [t0, t1] : null;
  };
  let prev = null;
  for (let p of pts) {
    let s = toScr(b, p[0], p[1]);
    if (!(s[0] === s[0] && s[1] === s[1] && isFinite(s[0]) && isFinite(s[1]))) { flush(); prev = null; continue; }
    if (prev) {
      let c = clip(prev, s);
      if (!c) flush();
      else {
        let A = [prev[0] + c[0] * (s[0] - prev[0]), prev[1] + c[0] * (s[1] - prev[1])], B = [prev[0] + c[1] * (s[0] - prev[0]), prev[1] + c[1] * (s[1] - prev[1])];
        if (c[0] > 0) { flush(); run.push(A); } else if (!run.length) run.push(A);
        run.push(B);
        if (c[1] < 1) flush();
      }
    }
    prev = s;
  }
  flush(); noStroke();                  // あとの文字にふちがつかないように
}
function gridField(b, fn, opt) {        // 長方形の上の等高線の地図（fn(u, v)）
  opt = opt || {};
  let res = opt.res || 3, gw = Math.ceil(b.w / res), gh = Math.ceil(b.h / res), g = createGraphics(gw, gh); g.pixelDensity(1); g.loadPixels();
  let vals = new Float64Array(gw * gh), lv = opt.level || 0.1, vmin = opt.vmin || 0, vmax = opt.vmax || 1, c0 = opt.c0 || [40, 60, 95], c1 = opt.c1 || ORANGE;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let [u, v] = fromScr(b, b.x + (i + 0.5) * res, b.y + (j + 0.5) * res); vals[j * gw + i] = fn(u, v); }
  let bandOf = (v) => Math.floor(clampv((v - vmin) / lv, -1e6, 1e6));
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let k = j * gw + i, v = vals[k], o = 4 * k, band = bandOf(v), t = clampv((v - vmin) / (vmax - vmin), 0, 1), sh = band % 2 ? 0.9 : 1;
    let edge = v < (opt.cap || Infinity) && ((i + 1 < gw && bandOf(vals[k + 1]) !== band) || (j + 1 < gh && bandOf(vals[k + gw]) !== band));
    for (let c = 0; c < 3; c++) g.pixels[o + c] = edge ? 235 : (c0[c] + (c1[c] - c0[c]) * t) * sh;
    g.pixels[o + 3] = edge ? 170 : 255;
  }
  g.updatePixels();
  return { img: g, x: b.x, y: b.y, w: b.w, h: b.h };
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestOk() { return selfTestResults.every((r) => r.ok); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestOk() ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
