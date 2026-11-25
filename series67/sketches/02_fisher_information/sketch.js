// ============================================
// 02 フィッシャー情報とクラメール-ラオの限界 ─ 表の確率 p のコインを n 回投げて p を推定する（p_hat = 表の数 / n）
// スコア = 対数尤度の傾き s(x) = d/dp log P(x; p)。平均は 0、分散 = フィッシャー情報 I(p) = 1/(p(1−p))
// どんな偏りのない推定でも分散 ≥ 1/(n I(p)) = p(1−p)/n（クラメール-ラオ）。実験をくり返すと p_hat の分散はこの限界にぴったり
// I(p) は KL の 2 次の項 D(p‖p+dp) ≈ ½ I(p) dp²：「近くの p とどれだけ区別しやすいか」= 分布の空間の曲がり方
// ← → p / ↑↓ 投げる回数 n / スペース 実験を止める・動かす / R やり直し / マウスを下のグラフに乗せる = その p の I(p)
// ============================================

const REPS_PER_FRAME = 300;              // ★ 1 フレームでくり返す実験の数
let pTrue = 0.3, nToss = 20, hist = [], reps = 0, sumE = 0, sumE2 = 0, running = true, scoreHist = [0, 0], scoreSum = 0, scoreSum2 = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest(); seedRng(2025); resetExp();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function resetExp() { hist = new Array(nToss + 1).fill(0); reps = 0; sumE = 0; sumE2 = 0; scoreSum = 0; scoreSum2 = 0; scoreHist = [0, 0]; }
function scoreOf(x, p) { return x ? 1 / p : -1 / (1 - p); }          // ★ スコア：表(x=1) なら 1/p、裏なら −1/(1−p)
function fisherExact(p) { return p * scoreOf(1, p) ** 2 + (1 - p) * scoreOf(0, p) ** 2; }   // 分散 = Σ P(x) s(x)²（平均は 0）
function oneExperiment(p, n) { let h = 0; for (let k = 0; k < n; k++) { let x = rnd() < p ? 1 : 0; h += x; let s = scoreOf(x, p); scoreSum += s; scoreSum2 += s * s; scoreHist[x]++; } return h / n; }
function binKL(a, b) { return divKL([a, 1 - a], [b, 1 - b]); }

function draw() {
  background(...BG);
  hudTitle('フィッシャー情報とクラメール-ラオの限界：コインの p を推定する', '← → p = ' + fmtN(pTrue, 2) + '　↑↓ 投げる回数 n = ' + nToss + '　スペース ' + (running ? '実験中' : '止めた') + '　R やり直し　下のグラフにマウス');
  if (running && reps < 200000) for (let k = 0; k < REPS_PER_FRAME; k++) { let e = oneExperiment(pTrue, nToss); sumE += e; sumE2 += e * e; reps++; hist[Math.round(e * nToss)]++; }
  let mean = reps ? sumE / reps : 0, vr = reps > 1 ? (sumE2 - reps * mean * mean) / (reps - 1) : 0, bound = (pTrue * (1 - pTrue)) / nToss;
  // ---- 左：p_hat のヒストグラムと理論の正規分布（分散 = 限界）
  let b = plotBox(60, 120, width * 0.5, height * 0.42, 0, 1, 0, 1), mx = Math.max(1, ...hist);
  drawAxes(b, 'p_hat = 表の数 / n（' + reps + ' 回の実験）', '回数');
  noStroke(); fill(...ORANGE, 200);
  let bwid = b.w / nToss;                // 表の数 h = 0, 1, …, n ごとに 1 本
  for (let i = 0; i <= nToss; i++) { let hh = (hist[i] / mx) * b.h * 0.95, x = b.x + (i / nToss) * b.w; rect(x - bwid / 2 + 0.5, b.y + b.h - hh, Math.max(1, bwid - 1), hh); }
  let pk = [], sc = (reps / mx) * (1 / nToss) * 0.95;   // 正規分布の高さ = 回数 × 密度 × 幅 1/n
  for (let k = 0; k <= 200; k++) { let x = k / 200; pk.push([x, Math.min(1, gaussPdf(x, pTrue, Math.sqrt(bound)) * sc)]); }
  plotLine(b, pk, VIOLET, 2.5);
  stroke(...INK); strokeWeight(1.5); let [tx] = toScr(b, pTrue, 0); line(tx, b.y, tx, b.y + b.h);
  // ---- 右：数値
  let rx = width * 0.6; noStroke(); textAlign(LEFT, BASELINE);
  fill(...INK); textSize(17);
  text('p_hat の平均 = ' + fmtN(mean, 4) + '　（本当の p = ' + fmtN(pTrue, 4) + '：偏りなし）', rx, 140);
  text('p_hat の分散（実験）= ' + fmtN(vr, 6), rx, 172);
  fill(...VIOLET); text('限界 1/(n I(p)) = p(1−p)/n = ' + fmtN(bound, 6), rx, 200);
  fill(...(Math.abs(vr / bound - 1) < 0.05 ? LIME : SAND)); text('比 = ' + fmtN(vr / bound, 4) + '　（→ 1：限界ぴったり）', rx, 228);
  fill(...INK); textSize(16);
  text('スコア s(x)：表なら 1/p = ' + fmtN(scoreOf(1, pTrue), 3) + '、裏なら −1/(1−p) = ' + fmtN(scoreOf(0, pTrue), 3), rx, 276);
  let nS = scoreHist[0] + scoreHist[1], sm = nS ? scoreSum / nS : 0, sv = nS ? scoreSum2 / nS - sm * sm : 0;
  text('スコアの平均（実験）= ' + fmtN(sm, 4) + '　→ 0', rx, 304);
  text('スコアの分散（実験）= ' + fmtN(sv, 4) + '　厳密 Σ P(x)s(x)² = ' + fmtN(fisherExact(pTrue), 4), rx, 332);
  fill(...TEAL); text('I(p) = 1/(p(1−p)) = ' + fmtN(1 / (pTrue * (1 - pTrue)), 4), rx, 360);
  // ---- 下：I(p) のグラフと KL の 2 次近似
  let b2 = plotBox(60, height * 0.66, width * 0.38, height * 0.25, 0, 1, 0, 25);
  drawAxes(b2, 'p', 'I(p) = 1/(p(1−p))：0 と 1 に近いほど大きい（区別しやすい）');
  let ip = []; for (let k = 1; k < 200; k++) { let x = k / 200; ip.push([x, Math.min(25, 1 / (x * (1 - x)))]); }
  plotLine(b2, ip, TEAL, 2.5);
  let ph = inRect(mouseX, mouseY, b2) ? clampv(fromScr(b2, mouseX, mouseY)[0], 0.02, 0.98) : pTrue, [hx, hy] = toScr(b2, ph, Math.min(25, 1 / (ph * (1 - ph))));
  noStroke(); fill(...ORANGE); circle(hx, hy, 10);
  let b3 = plotBox(width * 0.52, height * 0.66, width * 0.4, height * 0.25, ph - 0.25, ph + 0.25, 0, 0.3), kl = [], q2 = [];
  for (let k = 0; k <= 200; k++) { let x = ph - 0.25 + (0.5 * k) / 200; if (x > 0.001 && x < 0.999) { kl.push([x, Math.min(0.3, binKL(ph, x))]); q2.push([x, Math.min(0.3, 0.5 * (x - ph) ** 2 / (ph * (1 - ph)))]); } }
  drawAxes(b3, 'q（p = ' + fmtN(ph, 2) + ' のまわり）', 'D(p‖q)（オレンジ）と ½ I(p)(q−p)²（緑）');
  plotLine(b3, kl, ORANGE, 2.5); plotLine(b3, q2, TEAL, 1.5);
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === LEFT_ARROW) { pTrue = clampv(Math.round((pTrue - 0.05) * 100) / 100, 0.05, 0.95); resetExp(); }
  if (key === RIGHT_ARROW) { pTrue = clampv(Math.round((pTrue + 0.05) * 100) / 100, 0.05, 0.95); resetExp(); }
  if (key === UP_ARROW) { nToss = Math.min(200, nToss * 2); resetExp(); }
  if (key === DOWN_ARROW) { nToss = Math.max(5, Math.round(nToss / 2)); resetExp(); }
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') resetExp();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okEx = true, okMean = true, okKL = true;
  for (let p of [0.1, 0.3, 0.5, 0.77, 0.9]) {
    if (Math.abs(fisherExact(p) * p * (1 - p) - 1) > 1e-12) okEx = false;
    if (Math.abs(p * scoreOf(1, p) + (1 - p) * scoreOf(0, p)) > 1e-12) okMean = false;
    let h = 1e-3, d2 = (binKL(p, p + h) - 2 * binKL(p, p) + binKL(p, p - h)) / (h * h);   // KL の 2 階微分（数値）
    if (Math.abs(d2 / fisherExact(p) - 1) > 1e-4) okKL = false;
  }
  check('スコアの分散（厳密な和）= 1/(p(1−p))、p = 0.1, 0.3, 0.5, 0.77, 0.9 で誤差 1e-12', okEx);
  check('スコアの平均 = 0（どの p でも）', okMean);
  check('KL の 2 階微分 d²/dq² D(p‖q)|q=p = I(p)（数値微分、相対誤差 1e-4）', okKL);
  seedRng(99); let s1 = 0, s2 = 0, n = 40000, p = 0.3;
  for (let k = 0; k < n; k++) { let x = rnd() < p ? 1 : 0, s = scoreOf(x, p); s1 += s; s2 += s * s; }
  let mv = s2 / n - (s1 / n) ** 2;
  check('モンテカルロ 4 万回：スコアの分散 ' + fmtN(mv, 3) + ' ≈ I(0.3) = ' + fmtN(1 / 0.21, 3) + '（3% 以内）', Math.abs(mv * 0.21 - 1) < 0.03);
  seedRng(123); let e1 = 0, e2 = 0, R = 20000, nn = 50;
  for (let k = 0; k < R; k++) { let h = 0; for (let j = 0; j < nn; j++) h += rnd() < p ? 1 : 0; let e = h / nn; e1 += e; e2 += e * e; }
  let vv = (e2 - R * (e1 / R) ** 2) / (R - 1);
  check('n = 50 回の実験を 2 万回：p_hat の分散 ' + fmtN(vv, 6) + ' は限界 p(1−p)/n = ' + fmtN(0.0042, 6) + ' の 5% 以内', Math.abs(vv / 0.0042 - 1) < 0.05);
  check('p_hat の平均は p（偏りなし）：' + fmtN(e1 / R, 4), Math.abs(e1 / R - p) < 0.003);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. p を 0.5 と 0.9 にして、同じ n でヒストグラムの幅を比べよう。どちらが推定しやすい？ I(p) の値と比べよう
// 2. n を 4 倍にすると、ヒストグラムの幅（標準偏差）は何倍になる？
// 3. 推定を「(表の数 + 1) / (n + 2)」に変えると分散は限界より小さくなる？ 平均は p からずれる？（偏りのある推定）
// 4. 下右のグラフで、D(p‖q) と 2 次近似がずれ始めるのはどのくらい離れたとき？
// 5. 次の 03 では、正規分布 N(μ, σ) の 2 つのパラメータで同じことをすると、曲がった平面（双曲平面）が現れる

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
