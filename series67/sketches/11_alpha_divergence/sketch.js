// ============================================
// 11 α-ダイバージェンスの家族 ─ D_α(p‖q) = 4/(1−α²)·(1 − Σ p_i^((1−α)/2) q_i^((1+α)/2))
// α → −1 で KL(p‖q)、α → +1 で KL(q‖p)、α = 0 で 2Σ(√p − √q)²（ヘリンジャー距離の仲間、左右対称）
// α-測地線：u^((1−α)/2) の座標で混ぜて正規化。α = −1 は m-測地線、α = +1 は e-測地線、その間をなめらかに変わる
// 右下：2 山の分布 p を 1 山の正規分布 q で近似。α = −1（KL(p‖q)）は「ゼロを避ける」= 両方の山をおおう、α = +1（KL(q‖p)）は「ゼロを許す」= 片方の山だけ
// ↑↓ α / ドラッグ p・q（三角形）/ スペース α を自動で往復
// ============================================

const ALPHAS = [-1, -0.5, 0, 0.5, 1];    // ★ うすく描く α-測地線
const XN = 240, XLO = -8, XHI = 8;       // ★ 近似のための x の区切り
let alphaNow = -1, pA = [0.7, 0.2, 0.1], qA = [0.1, 0.25, 0.65], fr, grab = null, autoA = false, target = [], fit = null, fitAlpha = null, ta = 0;

function setup() { createCanvas(windowWidth, windowHeight); makeTarget(); selfTest(); layout(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() { let side = Math.min(width * 0.38, (height - 300) / 0.91); fr = simplexFrame(50 + side / 2, 130 + side * 0.62, side); }
function xAt(i) { return XLO + ((XHI - XLO) * (i + 0.5)) / XN; }
function makeTarget() { target = normP(Array.from({ length: XN }, (_, i) => 0.35 * gaussPdf(xAt(i), -2.2, 0.7) + 0.65 * gaussPdf(xAt(i), 2, 0.9) + 1e-12)); }   // ★ 2 山の分布
function gaussBins(m, s) { return normP(Array.from({ length: XN }, (_, i) => gaussPdf(xAt(i), m, s) + 1e-300)); }
// ★ q = N(μ, σ) の中で D_α(p‖q) が最小のものを探す：粗い格子 → 細かく（パターン探索）
function fitGauss(a) {
  let obj = (m, s) => alphaDiv(target, gaussBins(m, s), a), best = [0, 1], bv = Infinity;
  for (let i = 0; i <= 40; i++) for (let j = 0; j <= 30; j++) { let m = -4 + (8 * i) / 40, s = 0.3 + (3.7 * j) / 30, v = obj(m, s); if (v < bv) { bv = v; best = [m, s]; } }
  let h = 0.2;
  while (h > 1e-5) {
    let moved = false;
    for (let [dm, ds] of [[h, 0], [-h, 0], [0, h], [0, -h]]) { let m = best[0] + dm, s = Math.max(0.05, best[1] + ds), v = obj(m, s); if (v < bv - 1e-15) { bv = v; best = [m, s]; moved = true; } }
    if (!moved) h /= 2;
  }
  return { m: best[0], s: best[1], v: bv };
}

function draw() {
  background(...BG);
  if (autoA) { ta += 0.006; alphaNow = Math.round(-Math.cos(ta) * 10) / 10; }
  hudTitle('α-ダイバージェンス：KL(p‖q) から KL(q‖p) まで　α = ' + fmtN(alphaNow, 1), '↑↓ α　ドラッグ p・q　スペース α を自動で往復 ' + (autoA ? 'ON' : 'OFF'));
  // ---- 左：三角形と α-測地線
  drawSimplexFrame(fr);
  for (let a of ALPHAS) { let ps = []; for (let k = 0; k <= 50; k++) ps.push(mixAlpha(pA, qA, k / 50, a)); simplexPath(fr, ps, a === -1 ? [...ORANGE, 110] : a === 1 ? [...VIOLET, 110] : [...INK, 60], 1.5); }
  let cur = []; for (let k = 0; k <= 60; k++) cur.push(mixAlpha(pA, qA, k / 60, alphaNow));
  let t = (alphaNow + 1) / 2, cc = ORANGE.map((v, i) => v * (1 - t) + VIOLET[i] * t);
  simplexPath(fr, cur, cc, 4); simplexDot(fr, pA, INK, 16, 'p'); simplexDot(fr, qA, INK, 16, 'q');
  noStroke(); textSize(14); textAlign(LEFT, BASELINE); fill(...ORANGE); text('α = −1：m-測地線（まっすぐ）', 40, fr.v[0][1] + 34); fill(...VIOLET); text('α = +1：e-測地線', 40, fr.v[0][1] + 56);
  // ---- 右上：α と D_α(p‖q)
  let rx = width * 0.5, b1 = plotBox(rx, 110, width * 0.44, height * 0.3, -1, 1, 0, 1), cv = [];
  for (let k = 0; k <= 100; k++) { let a = -1 + k / 50; cv.push([a, alphaDiv(pA, qA, a)]); }
  b1.y1 = Math.max(...cv.map((c) => c[1])) * 1.15 + 1e-6; drawAxes(b1, 'α', 'D_α(p‖q)'); plotLine(b1, cv, TEAL, 2.5);
  let dNow = alphaDiv(pA, qA, alphaNow), [ax, ay] = toScr(b1, alphaNow, dNow); noStroke(); fill(...cc); circle(ax, ay, 12);
  fill(...INK); textSize(14); textAlign(LEFT, BASELINE);
  text('D_α = ' + fmtN(dNow, 5) + '　　KL(p‖q) = ' + fmtN(divKL(pA, qA), 5) + '（α = −1）　KL(q‖p) = ' + fmtN(divKL(qA, pA), 5) + '（α = +1）', rx, b1.y + b1.h + 54);
  text('α = 0：2Σ(√p − √q)² = ' + fmtN(2 * hellingerSq(pA, qA), 5) + '　双対：D_α(p‖q) = D_−α(q‖p) = ' + fmtN(alphaDiv(qA, pA, -alphaNow), 5), rx, b1.y + b1.h + 76);
  // ---- 右下：2 山を 1 山で近似
  if (fitAlpha !== alphaNow) { fit = fitGauss(alphaNow); fitAlpha = alphaNow; }
  let dx = (XHI - XLO) / XN, q = gaussBins(fit.m, fit.s);     // 確率 ÷ 幅 = 密度で描く
  let b2 = plotBox(rx, height * 0.58, width * 0.44, height * 0.28, XLO, XHI, 0, (Math.max(...target, ...q) / dx) * 1.1);
  drawAxes(b2, 'x', '2 山の p（白）を N(μ, σ) で近似（色）　密度');
  plotLine(b2, target.map((v, i) => [xAt(i), v / dx]), INK, 2.5); plotLine(b2, q.map((v, i) => [xAt(i), v / dx]), cc, 3);
  noStroke(); fill(...cc); textSize(14); text('最小の q：μ = ' + fmtN(fit.m, 3) + '、σ = ' + fmtN(fit.s, 3) + '　D_α = ' + fmtN(fit.v, 4) + (alphaNow < -0.3 ? '　→ 全体をおおう' : alphaNow > 0.3 ? '　→ 1 つの山にしぼる' : '　→ 中間'), rx, b2.y + b2.h + 54);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() { grab = null; for (let [nm, P] of [['p', pA], ['q', qA]]) { let [x, y] = baryToXY(fr, P); if (dist(mouseX, mouseY, x, y) < 22) grab = nm; } }
function mouseDragged() { if (grab === 'p') pA = clampSimplex(xyToBary(fr, mouseX, mouseY), 0.003); if (grab === 'q') qA = clampSimplex(xyToBary(fr, mouseX, mouseY), 0.003); }
function mouseReleased() { grab = null; }
function keyPressed() {
  if (key === UP_ARROW) { autoA = false; alphaNow = clampv(Math.round((alphaNow + 0.1) * 10) / 10, -1, 1); }
  if (key === DOWN_ARROW) { autoA = false; alphaNow = clampv(Math.round((alphaNow - 0.1) * 10) / 10, -1, 1); }
  if (key === ' ') { autoA = !autoA; ta = Math.acos(clampv(-alphaNow, -1, 1)); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(111); let okLim = true, okH = true, okDual = true, okPos = true;
  for (let k = 0; k < 100; k++) {
    let p = rndDist(4, 0.01), q = rndDist(4, 0.01), e = 1e-6;
    if (Math.abs(alphaDiv(p, q, -1 + e) - divKL(p, q)) > 1e-4 * (1 + divKL(p, q)) || Math.abs(alphaDiv(p, q, 1 - e) - divKL(q, p)) > 1e-4 * (1 + divKL(q, p))) okLim = false;
    if (Math.abs(alphaDiv(p, q, 0) - 2 * hellingerSq(p, q)) > 1e-12) okH = false;
    for (let a of [-0.7, 0.3, 0.9]) { if (Math.abs(alphaDiv(p, q, a) - alphaDiv(q, p, -a)) > 1e-12) okDual = false; if (!(alphaDiv(p, q, a) > 0) || alphaDiv(p, p, a) > 1e-12) okPos = false; }
  }
  check('α → −1 で KL(p‖q)、α → +1 で KL(q‖p)（α = ±(1 − 10⁻⁶)、100 組、相対誤差 1e-4）', okLim);
  check('α = 0 は 2Σ(√p − √q)²（誤差 1e-12）', okH);
  check('双対 D_α(p‖q) = D_−α(q‖p)、D_α ≥ 0 で p = q のときだけ 0', okDual && okPos);
  let p = [0.6, 0.3, 0.1], q = [0.1, 0.2, 0.7], okG = true;
  for (let t of [0.25, 0.5, 0.8]) { let a = mixAlpha(p, q, t, -1), b = mixM(p, q, t), c = mixAlpha(p, q, t, 1), d = mixE(p, q, t); if (a.some((v, i) => Math.abs(v - b[i]) > 1e-12) || c.some((v, i) => Math.abs(v - d[i]) > 1e-12)) okG = false; }
  let near = mixAlpha(p, q, 0.5, 1 - 1e-7), e5 = mixE(p, q, 0.5);
  check('α-測地線：α = −1 は m-測地線、α = +1 は e-測地線、α → 1 で e に近づく', okG && near.every((v, i) => Math.abs(v - e5[i]) < 1e-6));
  let mom = (d) => { let m = d.reduce((s, v, i) => s + v * xAt(i), 0); return [m, Math.sqrt(d.reduce((s, v, i) => s + v * (xAt(i) - m) ** 2, 0))]; };
  let fm = fitGauss(-1), [mu, sd] = mom(target), [qm, qs] = mom(gaussBins(fm.m, fm.s));
  check('KL(p‖q) 最小の正規分布は p と平均・標準偏差が同じ（モーメント合わせ：' + fmtN(qm, 3) + ', ' + fmtN(qs, 3) + '、誤差 1e-3）', Math.abs(qm - mu) < 1e-3 && Math.abs(qs - sd) < 1e-3);
  let fz = fitGauss(1);
  check('KL(q‖p) 最小は片方の山へ（σ = ' + fmtN(fz.s, 2) + ' ＜ ' + fmtN(fm.s, 2) + '、μ = ' + fmtN(fz.m, 2) + ' は大きい山の近く）', fz.s < 0.6 * fm.s && Math.abs(fz.m - 2) < 0.4);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. α を −1 から +1 まで動かして、右下の近似がどこで「両方おおう」から「片方」に切りかわるか探そう
// 2. 2 つの山の重み（0.35 と 0.65）を同じにすると、α = +1 の近似はどちらの山を選ぶ？
// 3. 三角形で p を辺の近くに置くと、α によって測地線の形はどれくらいちがう？
// 4. 機械学習の「変分推論」は KL(q‖p) を、「最尤推定」は KL(p‖q) を小さくする。どちらが 1 つの山にしぼる？
// 5. α = 3 など範囲の外も式では計算できる。どんな近似になる？（ALPHAS と ↑↓ の範囲を変えて）

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
// ---- 確率の三角形（3 つの結果）：頂点 1 = 左下、2 = 右下、3 = 上。点 = 確率で重みをつけた頂点の平均（重心座標）
function simplexFrame(cx, cy, side) {
  let h = (side * Math.sqrt(3)) / 2;
  return { cx, cy, side, v: [[cx - side / 2, cy + h / 3], [cx + side / 2, cy + h / 3], [cx, cy - (2 * h) / 3]] };
}
function baryToXY(fr, p) { let x = 0, y = 0; for (let i = 0; i < 3; i++) { x += p[i] * fr.v[i][0]; y += p[i] * fr.v[i][1]; } return [x, y]; }
function xyToBary(fr, x, y) {           // 画面の点 → (p1, p2, p3)（三角形の外なら一番近い所へ寄せる）
  let [a, b, c] = fr.v, det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  let l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / det;
  let l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / det;
  return [l1, l2, 1 - l1 - l2];
}
function clampSimplex(p, f) { return mixFloor(normP(p), f === undefined ? 0.002 : f); }
function drawSimplexFrame(fr, names) {  // 三角形のふちと頂点の名前
  noFill(); stroke(...INK, 170); strokeWeight(1.5);
  triangle(fr.v[0][0], fr.v[0][1], fr.v[1][0], fr.v[1][1], fr.v[2][0], fr.v[2][1]);
  noStroke(); textSize(13); textAlign(CENTER, CENTER);
  let off = [[-16, 14], [16, 14], [0, -16]];
  for (let i = 0; i < 3; i++) { fill(...OUTC[i]); text(names ? names[i] : '結果 ' + (i + 1), fr.v[i][0] + off[i][0], fr.v[i][1] + off[i][1]); }
}
function simplexPath(fr, ps, col, w) {  // 分布の列を三角形の上の折れ線に（空なら何もしない）
  if (!ps || ps.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2.5); beginShape();
  for (let p of ps) { let [x, y] = baryToXY(fr, p); vertex(x, y); }
  endShape(); noStroke();
}
function simplexDot(fr, p, col, r, name) {
  let [x, y] = baryToXY(fr, p);
  stroke(...BG); strokeWeight(2); fill(...col); circle(x, y, r || 14);
  if (name) { noStroke(); fill(...col); textSize(15); textAlign(LEFT, CENTER); text(name, x + 10, y - 10); }
}
// ★ 等高線の地図：三角形の中の各点で fn(p) を計算し、levels の間隔で色の帯と線を描いた画像を作る（半分の解像度）
function simplexField(fr, fn, opt) {
  opt = opt || {};
  let pad = 4, x0 = Math.min(fr.v[0][0], fr.v[2][0]) - pad, y0 = fr.v[2][1] - pad, w = fr.side + 2 * pad, h = fr.v[0][1] - fr.v[2][1] + 2 * pad;
  let res = opt.res || 2, gw = Math.ceil(w / res), gh = Math.ceil(h / res);
  let g = createGraphics(gw, gh); g.pixelDensity(1); g.loadPixels();
  let vals = new Float64Array(gw * gh).fill(NaN), lv = opt.level || 0.1, vmax = opt.vmax || 1, c0 = opt.c0 || [40, 60, 95], c1 = opt.c1 || ORANGE;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let b = xyToBary(fr, x0 + (i + 0.5) * res, y0 + (j + 0.5) * res);
    if (b[0] < 0 || b[1] < 0 || b[2] < 0) continue;
    vals[j * gw + i] = fn(b.map((v) => Math.max(v, 1e-12)));
  }
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let k = j * gw + i, v = vals[k], o = 4 * k;
    if (v !== v) { g.pixels[o + 3] = 0; continue; }
    let band = Math.floor(Math.min(v, vmax * 4) / lv), t = clampv(v / vmax, 0, 1), sh = band % 2 ? 0.9 : 1;
    let edge = false, cap = opt.cap || Infinity;   // cap より大きい所には線を描かない（線が混みすぎるので）
    if (v < cap && i + 1 < gw && vals[k + 1] === vals[k + 1] && Math.floor(Math.min(vals[k + 1], vmax * 4) / lv) !== band) edge = true;
    if (v < cap && j + 1 < gh && vals[k + gw] === vals[k + gw] && Math.floor(Math.min(vals[k + gw], vmax * 4) / lv) !== band) edge = true;
    for (let c = 0; c < 3; c++) g.pixels[o + c] = edge ? 245 : (c0[c] + (c1[c] - c0[c]) * t) * sh;
    g.pixels[o + 3] = edge ? 200 : 255;
  }
  g.updatePixels();
  return { img: g, x: x0, y: y0, w: gw * res, h: gh * res };
}
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
