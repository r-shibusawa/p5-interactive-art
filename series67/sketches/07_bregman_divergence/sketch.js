// ============================================
// 07 ブレグマン・ダイバージェンス ─ 下に凸な関数 f のグラフと、点 y での接線のすき間
// D_f(x, y) = f(x) − f(y) − f′(y)(x − y)。f = x² なら (x − y)²（2 乗距離）、f = x log x − x なら x log(x/y) − x + y（KL の 1 成分）
// 点の集まり x_1 … x_n の「中心」：2 番目の引数 c について Σ D_f(x_i, c) を最小にすると、どの f でもいつも算術平均！
// 1 番目の引数で最小にすると f によってちがう（x log x なら幾何平均）。k-means（クラスタリング、シリーズ 61）が KL でも使える理由
// 1 x²  2 x log x − x  3 −log x  4 eˣ / 上のグラフで x・y をドラッグ / 下をクリック 点を足す / R 新しい点 / Backspace 点を減らす
// ============================================

const FS = [
  { name: 'x²（2 乗距離）', f: (x) => x * x, d: (x) => 2 * x, inv: (u) => u / 2, mean1: '算術平均' },
  { name: 'x log x − x（KL）', f: (x) => x * Math.log(x) - x, d: (x) => Math.log(x), inv: (u) => Math.exp(u), mean1: '幾何平均' },
  { name: '−log x（板倉-斎藤）', f: (x) => -Math.log(x), d: (x) => -1 / x, inv: (u) => -1 / u, mean1: '調和平均' },
  { name: 'eˣ', f: (x) => Math.exp(x), d: (x) => Math.exp(x), inv: (u) => Math.log(u), mean1: 'log(eˣ の平均)' },
];
const XR = [0.1, 4];                     // ★ x の範囲（x log x と −log x は x > 0 が必要）
let fK = 1, xA = 3.2, yA = 1.0, pts = [], grab = null, topR, botR;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(17); newPoints(); layout(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() { topR = { x: 70, y: 100, w: width * 0.5, h: height * 0.4 }; botR = { x: 70, y: height * 0.6, w: width * 0.5, h: height * 0.3 }; }
function newPoints() { pts = []; for (let k = 0; k < 6; k++) pts.push(0.3 + 3.4 * rnd() ** 1.5); }
function breg(F, x, y) { return Math.max(0, F.f(x) - F.f(y) - F.d(y) * (x - y)); }   // ★ ブレグマン・ダイバージェンス
function sum2(F, c) { return pts.reduce((s, x) => s + breg(F, x, c), 0); }           // 2 番目の引数を動かす
function sum1(F, c) { return pts.reduce((s, x) => s + breg(F, c, x), 0); }           // 1 番目の引数を動かす
function center2() { return pts.reduce((s, x) => s + x, 0) / pts.length; }
function center1(F) { return F.inv(pts.reduce((s, x) => s + F.d(x), 0) / pts.length); }   // ∇f の平均を ∇f で戻す
function goldenMin(fn, a, b) { let g = (Math.sqrt(5) - 1) / 2; for (let it = 0; it < 200; it++) { let c = b - g * (b - a), d = a + g * (b - a); if (fn(c) < fn(d)) b = d; else a = c; } return (a + b) / 2; }

function draw() {
  background(...BG);
  let F = FS[fK];
  hudTitle('ブレグマン・ダイバージェンス：f = ' + F.name, '1 x²　2 x log x − x　3 −log x　4 eˣ　上：x（オレンジ）・y（紫）をドラッグ　下：クリック 点を足す　R 新しい点　Backspace 減らす');
  // ---- 上：f のグラフ、y での接線、x でのすき間
  let ys = []; for (let k = 0; k <= 200; k++) { let x = XR[0] + ((XR[1] - XR[0]) * k) / 200; ys.push(F.f(x)); }
  let lo = Math.min(...ys), hi = Math.max(...ys), b = plotBox(topR.x, topR.y, topR.w, topR.h, XR[0], XR[1], lo - 0.1 * (hi - lo), hi + 0.05 * (hi - lo));
  drawAxes(b, 'x', 'f(x) と、y での接線');
  plotLine(b, ys.map((v, k) => [XR[0] + ((XR[1] - XR[0]) * k) / 200, v]), TEAL, 3);
  plotLine(b, [[XR[0], F.f(yA) + F.d(yA) * (XR[0] - yA)], [XR[1], F.f(yA) + F.d(yA) * (XR[1] - yA)]], VIOLET, 1.8);
  let [gx, g1] = toScr(b, xA, F.f(xA)), [, g2] = toScr(b, xA, F.f(yA) + F.d(yA) * (xA - yA));
  stroke(...ORANGE); strokeWeight(5); line(gx, g1, gx, clampv(g2, b.y, b.y + b.h));
  for (let [x, col, nm] of [[xA, ORANGE, 'x'], [yA, VIOLET, 'y']]) { let [sx, sy] = toScr(b, x, F.f(x)); noStroke(); fill(...col); circle(sx, sy, 14); textSize(15); textAlign(CENTER, TOP); text(nm, sx, b.y + b.h + 3); }
  let rx = topR.x + topR.w + 50; noStroke(); textAlign(LEFT, BASELINE); fill(...ORANGE); textSize(17);
  text('D_f(x, y) = オレンジの長さ = ' + fmtN(breg(F, xA, yA), 4), rx, 140);
  fill(...VIOLET); text('D_f(y, x) = ' + fmtN(breg(F, yA, xA), 4) + '（ふつうは向きでちがう）', rx, 168);
  fill(...DIMC); textSize(14);
  text('x² なら (x − y)² = ' + fmtN((xA - yA) ** 2, 4), rx, 200);
  text('x log x − x なら x log(x/y) − x + y = ' + fmtN(xA * Math.log(xA / yA) - xA + yA, 4), rx, 222);
  text('−log x なら x/y − log(x/y) − 1 = ' + fmtN(xA / yA - Math.log(xA / yA) - 1, 4), rx, 244);
  text('f が下に凸 → 接線はいつもグラフの下 → D_f ≥ 0', rx, 274);
  // ---- 下：点の集まりと 2 つの「中心」
  let c2 = center2(), c1 = center1(F), cs = [], s2 = [], s1 = [];
  for (let k = 0; k <= 200; k++) { let c = XR[0] + ((XR[1] - XR[0]) * k) / 200; cs.push(c); s2.push(sum2(F, c)); s1.push(sum1(F, c)); }
  let top2 = Math.min(Math.max(...s2), Math.max(...s1), 4 * Math.max(sum2(F, c2), sum1(F, c1)) + 1), b2 = plotBox(botR.x, botR.y, botR.w, botR.h, XR[0], XR[1], 0, top2);
  drawAxes(b2, 'c', 'Σ D_f(x_i, c)（オレンジ）と Σ D_f(c, x_i)（紫）');
  plotLine(b2, cs.map((c, k) => [c, Math.min(top2, s2[k])]), ORANGE, 2.5); plotLine(b2, cs.map((c, k) => [c, Math.min(top2, s1[k])]), VIOLET, 2.5);
  for (let x of pts) { let [sx] = toScr(b2, x, 0); noStroke(); fill(...INK); circle(sx, b2.y + b2.h, 10); }
  for (let [c, col] of [[c2, ORANGE], [c1, VIOLET]]) { let [sx] = toScr(b2, c, 0); stroke(...col); strokeWeight(1.5); drawingContext.setLineDash([5, 4]); line(sx, b2.y, sx, b2.y + b2.h); drawingContext.setLineDash([]); }
  let ry = botR.y + 10; noStroke(); textAlign(LEFT, BASELINE); textSize(16);
  fill(...ORANGE); text('2 番目で最小：c = ' + fmtN(c2, 4) + ' = 算術平均 ' + fmtN(center2(), 4), rx, ry);
  fill(...VIOLET); text('1 番目で最小：c = ' + fmtN(c1, 4) + ' = ' + F.mean1, rx, ry + 28);
  fill(...DIMC); textSize(14);
  text('数値で最小を探すと：' + fmtN(goldenMin((c) => sum2(F, c), XR[0], XR[1]), 4) + ' と ' + fmtN(goldenMin((c) => sum1(F, c), XR[0], XR[1]), 4), rx, ry + 56);
  text('平均がいつも中心 → k-means の「平均を取り直す」は', rx, ry + 84);
  text('どのブレグマン・ダイバージェンスでも正しい', rx, ry + 104);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  grab = null;
  if (inRect(mouseX, mouseY, { x: topR.x, y: topR.y, w: topR.w, h: topR.h + 30 })) { let ux = XR[0] + ((mouseX - topR.x) / topR.w) * (XR[1] - XR[0]); grab = Math.abs(ux - xA) < Math.abs(ux - yA) ? 'x' : 'y'; mouseDragged(); }
  else if (inRect(mouseX, mouseY, botR) && pts.length < 20) pts.push(clampv(XR[0] + ((mouseX - botR.x) / botR.w) * (XR[1] - XR[0]), XR[0] + 0.05, XR[1]));
}
function mouseDragged() { if (!grab) return; let ux = clampv(XR[0] + ((mouseX - topR.x) / topR.w) * (XR[1] - XR[0]), XR[0] + 0.02, XR[1]); if (grab === 'x') xA = ux; else yA = ux; }
function mouseReleased() { grab = null; }
function keyPressed() {
  for (let k = 1; k <= 4; k++) if (key === String(k)) fK = k - 1;
  if (key === 'r' || key === 'R') newPoints();
  if (key === 'Backspace' && pts.length > 2) pts.pop();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(70); let okPos = true, okSq = true, okKL = true;
  for (let k = 0; k < 300; k++) {
    let x = 0.1 + 3.9 * rnd(), y = 0.1 + 3.9 * rnd();
    for (let F of FS) if (!(breg(F, x, y) >= 0) || breg(F, x, x) > 1e-12) okPos = false;
    if (Math.abs(breg(FS[0], x, y) - (x - y) ** 2) > 1e-12) okSq = false;
    if (Math.abs(breg(FS[1], x, y) - (x * Math.log(x / y) - x + y)) > 1e-12) okKL = false;
  }
  check('4 つの f で D_f(x, y) ≥ 0、D_f(x, x) = 0（300 組）', okPos);
  check('f = x² なら D_f(x, y) = (x − y)²、f = x log x − x なら x log(x/y) − x + y（誤差 1e-12）', okSq && okKL);
  let p = rndDist(5), q = rndDist(5), vk = p.reduce((s, v, i) => s + breg(FS[1], v, q[i]), 0);
  check('確率分布なら各成分の和 Σ D_f(p_i, q_i) = KL ダイバージェンス D(p‖q)', Math.abs(vk - divKL(p, q)) < 1e-12);
  seedRng(71); newPoints();
  let okMean = true, okGold = true;
  for (let F of FS) {
    let m = center2(), fm = sum2(F, m);
    for (let j = 0; j < 500; j++) if (sum2(F, 0.1 + 3.9 * rnd()) < fm - 1e-12) okMean = false;
    if (Math.abs(goldenMin((c) => sum1(F, c), XR[0], XR[1]) - center1(F)) > 1e-6) okGold = false;
  }
  check('どの f でも Σ D_f(x_i, c) の最小は算術平均（4 つの f × 500 個のでたらめな c に勝つ）', okMean);
  check('1 番目の引数の最小 = ∇f⁻¹(∇f の平均)：黄金分割法の答えと一致（誤差 1e-6）', okGold);
  let g = Math.exp(pts.reduce((s, x) => s + Math.log(x), 0) / pts.length);
  check('x log x − x なら 1 番目の最小は幾何平均 ' + fmtN(g, 3) + '（算術平均 ' + fmtN(center2(), 3) + ' とはちがう）', Math.abs(center1(FS[1]) - g) < 1e-12 && Math.abs(g - center2()) > 0.01);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. f = x² で x と y を入れかえても値は同じ？ ほかの f では？
// 2. 3（−log x）で点を 1 つだけ 0.1 の近くに置くと、紫の中心はどう動く？ オレンジは？
// 3. 自分で f を足そう：f(x) = x⁴、f(x) = x log x + (1−x) log(1−x)（範囲に注意）。中心はやっぱり平均？
// 4. 下に凸でない f（たとえば sin x）にすると、D_f が負になる所がある。どこ？
// 5. KL は f = Σ p log p のブレグマン・ダイバージェンス。ψ のブレグマン・ダイバージェンスも KL になる（04 の双対）

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
