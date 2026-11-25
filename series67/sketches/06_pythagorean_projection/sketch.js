// ============================================
// 06 ピタゴラスの定理と射影 ─ KL ダイバージェンスでも「直角三角形」なら D(p‖r) = D(p‖q) + D(q‖r) がぴったり成り立つ
// 左（e-射影）：平均が c の分布の集合 E（三角形の中の直線 = m-平坦）。r から E へ e-測地線で降ろした足 q は q_i ∝ r_i e^(λ x_i)
//   E の中のどの p でも D(p‖r) = D(p‖q) + D(q‖r)（p→q は m-測地線、q→r は e-測地線、q で直交）
// 右（m-射影）：2×2 の表 p(x, y) から「独立な表」の集合 M（e-平坦）へ。足 q = 周辺分布の積 p(x)p(y) = 最尤推定
//   M の中のどの r でも D(p‖r) = D(p‖q) + D(q‖r)
// 左：ドラッグ r（紫）・p（直線の上）、↑↓ 平均 c / 右：棒をドラッグで表 p、正方形の中をクリックで独立な r / R でたらめ
// ============================================

const XV = [0, 1, 2];                    // ★ 3 つの結果の値 x（平均 = Σ x_i p_i）
let cMean = 1.3, rL = [0.6, 0.3, 0.1], sL = 0.3, tabP = [0.4, 0.1, 0.15, 0.35], abR = [0.3, 0.7], fr, grab = null, barR, sqB, sqField = null, sqKey = '';

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); layout(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() {
  let side = Math.min(width * 0.4, (height - 330) / 0.91);
  fr = simplexFrame(50 + side / 2, 130 + side * 0.62, side);
  barR = { x: width * 0.56, y: 140, w: width * 0.18, h: 130 };
  let s = Math.min(width * 0.18, 200); sqB = plotBox(width * 0.79, 120, s, s, 0, 1, 0, 1); sqKey = '';
}
// ---- 左：平均 c の集合 E と e-射影
function lineEnds(c) { return [Math.max(0, c - 1), c / 2]; }                          // p3 = s の範囲
function onLine(c, s) { return [1 - c + s, c - 2 * s, s]; }                            // p2 + 2 p3 = c、合計 1
function tilt(r, lam) { return normP(r.map((v, i) => v * Math.exp(lam * XV[i]))); }      // r_i e^(λ x_i) を正規化
function meanOf(p) { return p.reduce((s, v, i) => s + v * XV[i], 0); }
function solveLambda(r, c) {             // ★ ニュートン法：f(λ) = 平均 − c、f'(λ) = 分散
  let lam = 0, lo = -80, hi = 80;        // 平均は λ について増える → [lo, hi] で答えをはさみ、外へ跳んだら二分法
  for (let it = 0; it < 100; it++) {
    let q = tilt(r, lam), m = meanOf(q), v = q.reduce((s, w, i) => s + w * (XV[i] - m) ** 2, 0);
    if (m < c) lo = lam; else hi = lam;
    let nx = lam - (m - c) / Math.max(v, 1e-300);
    if (!(nx > lo && nx < hi)) nx = (lo + hi) / 2;
    if (Math.abs(nx - lam) < 1e-15 * (1 + Math.abs(lam))) { lam = nx; break; }
    lam = nx;
  }
  return lam;
}
function eProject(r, c) { return tilt(r, solveLambda(r, c)); }
// ---- 右：2×2 の表 [p00, p01, p10, p11] と独立な表
function margins(t) { return [t[2] + t[3], t[1] + t[3]]; }                               // [P(x=1), P(y=1)]
function indep(a, b) { return [(1 - a) * (1 - b), (1 - a) * b, a * (1 - b), a * b]; }
function mProject(t) { let [a, b] = margins(t); return indep(a, b); }

function draw() {
  background(...BG);
  hudTitle('ピタゴラスの定理と射影：D(p‖r) = D(p‖q) + D(q‖r)', '左：ドラッグ r（紫）と p（直線の上）　↑↓ 平均 c = ' + fmtN(cMean, 2) + '　／　右：棒をドラッグ = 表 p、正方形をクリック = 独立な r　R でたらめ');
  // ===== 左
  let [s0, s1] = lineEnds(cMean); sL = clampv(sL, s0 + 0.004, s1 - 0.004);
  let pE = onLine(cMean, sL), qE = eProject(rL, cMean), eg = [], mg = [];
  for (let k = 0; k <= 40; k++) { eg.push(mixE(qE, rL, k / 40)); mg.push(mixM(pE, qE, k / 40)); }
  drawSimplexFrame(fr, ['x = 0', 'x = 1', 'x = 2']);
  simplexPath(fr, [onLine(cMean, s0), onLine(cMean, s1)], [...TEAL, 200], 2);
  simplexPath(fr, mg, ORANGE, 3.5); simplexPath(fr, eg, VIOLET, 3.5);
  simplexDot(fr, rL, VIOLET, 16, 'r'); simplexDot(fr, pE, ORANGE, 16, 'p'); simplexDot(fr, qE, INK, 13, 'q');
  let dpr = divKL(pE, rL), dpq = divKL(pE, qE), dqr = divKL(qE, rL), y0 = fr.v[0][1] + 34;
  noStroke(); textAlign(LEFT, BASELINE); textSize(14); fill(...TEAL); text('緑の直線 E = 平均が ' + fmtN(cMean, 2) + ' の分布（m-平坦）', 40, y0);
  textSize(16); fill(...INK); text('D(p‖r) = ' + fmtN(dpr, 6), 40, y0 + 28);
  text('D(p‖q) + D(q‖r) = ' + fmtN(dpq, 6) + ' + ' + fmtN(dqr, 6) + ' = ' + fmtN(dpq + dqr, 6), 40, y0 + 52);
  fill(...LIME); text('差 = ' + (dpr - dpq - dqr).toExponential(1) + '　直交：Σ(p−q)(log r − log q) = ' + qE.reduce((s, v, i) => s + (pE[i] - v) * (safeLog(rL[i]) - safeLog(v)), 0).toExponential(1), 40, y0 + 76);
  fill(...DIMC); textSize(13); text('q = E の中で r に一番近い（D(·‖r) 最小）。r を E の上に置くと q = r', 40, y0 + 98);
  // ===== 右
  let qM = mProject(tabP), rM = indep(abR[0], abR[1]);
  drawBars(tabP, barR, { names: ['x0 y0', 'x0 y1', 'x1 y0', 'x1 y1'], ghost: qM, vmax: 0.8 });
  noStroke(); fill(...ORANGE); textSize(15); textAlign(LEFT, BASELINE); text('表 p（白い枠 = 周辺分布の積 q）', barR.x, barR.y - 18);
  let fk = tabP.map((v) => v.toFixed(3)).join(',') + width;
  if (fk !== sqKey) { sqKey = fk; freeField(sqField); sqField = gridField(sqB, (a, b) => Math.min(divKL(tabP, indep(clampv(a, 1e-4, 1 - 1e-4), clampv(b, 1e-4, 1 - 1e-4))), 3), { level: 0.05, vmax: 1.5, cap: 0.6, c0: [40, 60, 95], c1: VIOLET, res: 2 }); }
  drawField(sqField); drawAxes(sqB, 'P(x = 1)', '独立な表 M（D(p‖r) の等高線）');
  for (let [P, col, nm] of [[margins(qM), INK, 'q'], [abR, VIOLET, 'r']]) { let [x, y] = toScr(sqB, P[0], P[1]); noStroke(); fill(...col); circle(x, y, 13); textSize(14); text(nm, x + 9, y - 8); }
  let Dpr = divKL(tabP, rM), Dpq = divKL(tabP, qM), Dqr = divKL(qM, rM), ty = Math.max(barR.y + barR.h + 60, sqB.y + sqB.h + 60);
  fill(...INK); textSize(16); textAlign(LEFT, BASELINE);
  text('D(p‖r) = ' + fmtN(Dpr, 6), barR.x, ty);
  text('D(p‖q) + D(q‖r) = ' + fmtN(Dpq, 6) + ' + ' + fmtN(Dqr, 6) + ' = ' + fmtN(Dpq + Dqr, 6), barR.x, ty + 26);
  fill(...LIME); text('差 = ' + (Dpr - Dpq - Dqr).toExponential(1), barR.x, ty + 52);
  fill(...DIMC); textSize(14);
  text('D(p‖q) = 相互情報量（12 で詳しく）。p をデータの割合と見ると', barR.x, ty + 82);
  text('q = 独立なモデルの最尤推定：最尤推定 = m-射影', barR.x, ty + 102);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  grab = null;
  let [rx, ry] = baryToXY(fr, rL), [px, py] = baryToXY(fr, onLine(cMean, sL));
  if (dist(mouseX, mouseY, rx, ry) < 22) grab = 'r'; else if (dist(mouseX, mouseY, px, py) < 22) grab = 'p';
  else if (inRect(mouseX, mouseY, { x: barR.x, y: barR.y - 30, w: barR.w, h: barR.h + 50 })) grab = 'bar';
  else if (inRect(mouseX, mouseY, sqB)) grab = 'sq';
  mouseDragged();
}
function mouseDragged() {
  if (grab === 'r') rL = clampSimplex(xyToBary(fr, mouseX, mouseY), 0.004);
  if (grab === 'p') { let [s0, s1] = lineEnds(cMean), [ax, ay] = baryToXY(fr, onLine(cMean, s0)), [bx, by] = baryToXY(fr, onLine(cMean, s1)); let u = ((mouseX - ax) * (bx - ax) + (mouseY - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 + 1e-9); sL = s0 + clampv(u, 0, 1) * (s1 - s0); }
  if (grab === 'bar') tabP = barsDrag(tabP, { x: barR.x, y: barR.y + barR.h - barR.h / 0.8, w: barR.w, h: barR.h / 0.8 }, mouseX, mouseY, 0.003);   // 縦軸の上限 0.8 に合わせる
  if (grab === 'sq') { let [a, b] = fromScr(sqB, mouseX, mouseY); abR = [clampv(a, 0.01, 0.99), clampv(b, 0.01, 0.99)]; }
}
function mouseReleased() { grab = null; }
function keyPressed() {
  if (key === UP_ARROW) cMean = clampv(cMean + 0.05, 0.1, 1.9);
  if (key === DOWN_ARROW) cMean = clampv(cMean - 0.05, 0.1, 1.9);
  if (key === 'r' || key === 'R') { rL = rndDist(3, 0.02); tabP = rndDist(4, 0.01); abR = [0.1 + 0.8 * rnd(), 0.1 + 0.8 * rnd()]; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(606); let wA = 0, okMinA = true, wB = 0, okMinB = true, okLam = true, okOrth = true;
  for (let k = 0; k < 200; k++) {        // (a) m-射影（独立な表へ）
    let p = rndDist(4, 0.002), q = mProject(p), r = indep(0.02 + 0.96 * rnd(), 0.02 + 0.96 * rnd());
    wA = Math.max(wA, Math.abs(divKL(p, r) - divKL(p, q) - divKL(q, r)));
    if (k < 20) for (let j = 0; j < 100; j++) { let r2 = indep(rnd(), rnd()); if (divKL(p, r2) < divKL(p, q) - 1e-12) okMinA = false; }
  }
  check('m-射影：200 個の表 p と独立な r で D(p‖r) = D(p‖q) + D(q‖r)（最大誤差 ' + wA.toExponential(1) + ' ≤ 1e-10）', wA < 1e-10);
  check('q = 周辺分布の積は、独立な表の中で D(p‖·) が最小（2000 個のでたらめな独立表に勝つ）', okMinA);
  for (let k = 0; k < 200; k++) {        // (b) e-射影（平均 c の集合へ）
    let r = rndDist(3, 0.002), c = 0.15 + 1.7 * rnd(), q = eProject(r, c), [s0, s1] = lineEnds(c), p = onLine(c, s0 + (s1 - s0) * (0.01 + 0.98 * rnd()));
    wB = Math.max(wB, Math.abs(divKL(p, r) - divKL(p, q) - divKL(q, r)));
    if (Math.abs(meanOf(q) - c) > 1e-12) okLam = false;
    if (Math.abs(q.reduce((s, v, i) => s + (p[i] - v) * (safeLog(r[i]) - safeLog(v)), 0)) > 1e-10) okOrth = false;
    if (k < 20) for (let j = 0; j < 100; j++) { let p2 = onLine(c, s0 + (s1 - s0) * rnd()); if (divKL(p2, r) < divKL(q, r) - 1e-12) okMinB = false; }
  }
  check('e-射影：200 組の r と E の中の p で D(p‖r) = D(p‖q) + D(q‖r)（最大誤差 ' + wB.toExponential(1) + ' ≤ 1e-10）', wB < 1e-10);
  check('ニュートン法の q は平均がちょうど c（誤差 1e-12）、E の中で D(·‖r) が最小', okLam && okMinB);
  check('直交：Σ (p_i − q_i)(log r_i − log q_i) = 0（m の向きと e の向きがフィッシャー計量で直角）', okOrth);
  let r = [0.5, 0.3, 0.2], lo = -50, hi = 50; for (let it = 0; it < 200; it++) { let m = (lo + hi) / 2; if (meanOf(tilt(r, m)) < 1.4) lo = m; else hi = m; }
  check('ニュートン法の λ = 二分法の λ（誤差 1e-10）', Math.abs(solveLambda(r, 1.4) - (lo + hi) / 2) < 1e-10);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 左で r を動かすと、q は直線 E の上をどう動く？ 紫の e-測地線はいつも E と直角？
// 2. 右の表を「x と y が同じになりやすい」形（x0 y0 と x1 y1 が大きい）にすると D(p‖q) は？ 独立な表にすると？
// 3. 右の正方形で r を q に重ねると D(q‖r) = 0。等高線の一番低い所が q になっているか確かめよう
// 4. ふつうのピタゴラス a² = b² + c² との対応：KL は「距離の 2 乗」の仲間（01：近い所では ½ × 距離²）
// 5. EM 法（09）はこの 2 つの射影を交互にくり返す

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
// ---- 棒グラフ（ドラッグで高さを変えられる）
function drawBars(p, r, opt) {          // r = {x, y, w, h}、opt = {cols, names, vmax, ghost（重ねて描く別の分布）}
  opt = opt || {};
  let k = p.length, bw = r.w / k, vmax = opt.vmax || 1;
  stroke(...WIRE); strokeWeight(1); line(r.x, r.y + r.h, r.x + r.w, r.y + r.h);
  for (let i = 0; i < k; i++) {
    let hh = (clampv(p[i], 0, vmax) / vmax) * r.h, col = (opt.cols || OUTC)[i % 8];
    noStroke(); fill(...col, 210); rect(r.x + i * bw + 3, r.y + r.h - hh, bw - 6, hh, 3);
    if (opt.ghost) { let gh = (clampv(opt.ghost[i], 0, vmax) / vmax) * r.h; noFill(); stroke(...INK); strokeWeight(1.5); rect(r.x + i * bw + 3, r.y + r.h - gh, bw - 6, gh, 3); }
    noStroke(); fill(...INK); textSize(12); textAlign(CENTER, BASELINE);
    if (bw >= 30) text(fmtN(p[i], 2), r.x + (i + 0.5) * bw, r.y + r.h - hh - 4);   // 細い棒では数字を省く
    fill(...DIMC); text(opt.names ? opt.names[i] : String(i + 1), r.x + (i + 0.5) * bw, r.y + r.h + 15);
  }
}
function barsDrag(p, r, mx, my, floor) {  // 棒をドラッグ：i 番目の高さを変えて、残りを比例で縮める（合計 1 のまま）
  let k = p.length, i = Math.floor((mx - r.x) / (r.w / k));
  if (i < 0 || i >= k || my < r.y - 30 || my > r.y + r.h + 20) return p;
  let v = clampv((r.y + r.h - my) / r.h, floor || 0.001, 1 - (floor || 0.001) * (k - 1)), rest = 1 - p[i], q = p.slice();
  for (let j = 0; j < k; j++) q[j] = j === i ? v : rest > 1e-9 ? (p[j] / rest) * (1 - v) : (1 - v) / (k - 1);
  return mixFloor(q, floor || 0.001);
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
