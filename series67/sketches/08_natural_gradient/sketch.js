// ============================================
// 08 自然勾配 ─ 正規分布 N(μ, σ) をデータに合わせる（平均の負の対数尤度 L を小さくする）学習
// ふつうの勾配降下は「どの座標で書くか」で道が変わる：(μ, σ) で下るのと (μ, log σ) で下るのとでは別の道
// 自然勾配は勾配にフィッシャー行列の逆を掛ける Δ = −η F⁻¹ ∇L（2×2 の連立方程式を解く）→ 座標を変えてもほとんど同じ道
// 分布の空間そのものの「最急降下」だから。左 = (μ, σ) 平面、右 = (μ, log σ) 平面に同じ 4 本の道（最適化の工夫はシリーズ 49）
// クリック 出発点 / スペース 学習を止める・動かす / R 最初から / D 新しいデータ / ↑↓ 学習率
// ============================================

const N_DATA = 200;                      // ★ データの数
const TRUE_MU = 1.5, TRUE_SG = 0.6;      // ★ データを作る正規分布
let lrPlain = 0.1, lrNat = 0.08, mData = 0, vData = 1, start = [-2, 2.2], paths = [], running = true, bA, bB, fieldA = null, fieldB = null, fKey = '', seedD = 5;
const KINDS = [                         // 色は描くときに決める（道具の色はファイルの下で作られるので）
  { name: 'ふつうの勾配（μ, σ で）', nat: false, dash: false },
  { name: 'ふつうの勾配（μ, log σ で）', nat: false, dash: true },
  { name: '自然勾配（μ, σ で）', nat: true, dash: false },
  { name: '自然勾配（μ, log σ で）', nat: true, dash: true },
];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); makeData(); layout(); resetPaths(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() {
  let w = Math.min(width * 0.4, height * 0.62);
  bA = plotBox(70, 110, w, w, -3, 3, 0.05, 3); bB = plotBox(width * 0.52, 110, w, w, -3, 3, Math.log(0.05), Math.log(3)); fKey = '';
}
function makeData() { seedRng(seedD); let xs = []; for (let k = 0; k < N_DATA; k++) xs.push(TRUE_MU + TRUE_SG * gaussRnd()); mData = xs.reduce((s, x) => s + x, 0) / N_DATA; vData = xs.reduce((s, x) => s + (x - mData) ** 2, 0) / N_DATA; fKey = ''; }
function lossOf(mu, sg) { return Math.log(sg) + ((mu - mData) ** 2 + vData) / (2 * sg * sg); }   // ★ 平均の負の対数尤度（定数を除く）
function gradA(mu, sg) { return [(mu - mData) / (sg * sg), 1 / sg - ((mu - mData) ** 2 + vData) / (sg * sg * sg)]; }   // (μ, σ) での勾配
// ★ 1 歩：kind 0,1 はふつう、2,3 は自然勾配。偶数は (μ, σ)、奇数は (μ, ℓ = log σ) の座標で計算する
function stepOf(kind, P) {
  let [mu, sg] = P, g = gradA(mu, sg);
  if (kind === 0) return [mu - lrPlain * g[0], sg - lrPlain * g[1]];
  if (kind === 1) { let gl = sg * g[1]; return [mu - lrPlain * g[0], sg * Math.exp(-lrPlain * gl)]; }   // ∂L/∂ℓ = σ ∂L/∂σ
  if (kind === 2) { let d = solveLin([[1 / (sg * sg), 0], [0, 2 / (sg * sg)]], g); return [mu - lrNat * d[0], sg - lrNat * d[1]]; }   // F = diag(1/σ², 2/σ²)
  let d = solveLin([[1 / (sg * sg), 0], [0, 2]], [g[0], sg * g[1]]); return [mu - lrNat * d[0], sg * Math.exp(-lrNat * d[1])];       // F = diag(1/σ², 2)
}
function safeStep(kind, P) { let Q = stepOf(kind, P); return [clampv(Q[0], -6, 6), clampv(Q[1], 0.05, 6)]; }
function resetPaths() { paths = KINDS.map(() => [start.slice()]); }

function draw() {
  background(...BG);
  hudTitle('自然勾配：座標を変えても同じ道', 'クリック 出発点　スペース ' + (running ? '学習中' : '止めた') + '　R 最初から　D 新しいデータ　↑↓ 学習率 ×' + fmtN(lrPlain / 0.1, 2));
  if (fKey !== mData + '/' + width) {
    fKey = mData + '/' + width; freeField(fieldA); freeField(fieldB);
    let L0 = lossOf(mData, Math.sqrt(vData));
    fieldA = gridField(bA, (u, v) => Math.log1p(Math.max(0, lossOf(u, v) - L0)), { level: 0.15, vmax: 2.5, cap: 2.3, c0: [52, 74, 112], c1: [28, 38, 60], res: 3 });
    fieldB = gridField(bB, (u, v) => Math.log1p(Math.max(0, lossOf(u, Math.exp(v)) - L0)), { level: 0.15, vmax: 2.5, cap: 2.3, c0: [52, 74, 112], c1: [28, 38, 60], res: 3 });
  }
  if (running && paths[0].length < 600) for (let k = 0; k < KINDS.length; k++) paths[k].push(safeStep(k, paths[k][paths[k].length - 1]));
  drawField(fieldA); drawField(fieldB);
  drawAxes(bA, 'μ', 'σ　（(μ, σ) 平面と L の等高線）'); drawAxes(bB, 'μ', 'log σ　（(μ, log σ) 平面）');
  KINDS.forEach((K, k) => {
    if (K.dash) drawingContext.setLineDash([7, 5]);
    let col = K.nat ? VIOLET : ORANGE;
    plotLine(bA, paths[k], col, 2.5); plotLine(bB, paths[k].map((P) => [P[0], Math.log(P[1])]), col, 2.5);
    drawingContext.setLineDash([]);
  });
  for (let [b, P] of [[bA, [mData, Math.sqrt(vData)]], [bB, [mData, Math.log(Math.sqrt(vData))]]]) { let [x, y] = toScr(b, P[0], P[1]); noFill(); stroke(...LIME); strokeWeight(2); circle(x, y, 16); }
  for (let [b, P] of [[bA, start], [bB, [start[0], Math.log(start[1])]]]) { let [x, y] = toScr(b, P[0], P[1]); noStroke(); fill(...INK); circle(x, y, 10); }
  // ---- 下：凡例と数値
  let y0 = bA.y + bA.h + 50; noStroke(); textAlign(LEFT, BASELINE); textSize(15);
  KINDS.forEach((K, k) => { let P = paths[k][paths[k].length - 1]; fill(...(K.nat ? VIOLET : ORANGE)); text((K.dash ? '- - ' : '── ') + K.name + '　→ (' + fmtN(P[0], 3) + ', ' + fmtN(P[1], 3) + ')　L = ' + fmtN(lossOf(P[0], P[1]), 4), 70, y0 + k * 22); });
  let gap = (a, b) => Math.max(...paths[a].map((P, i) => Math.hypot(P[0] - paths[b][i][0], P[1] - paths[b][i][1])));
  fill(...INK); text('2 つの座標の道のずれ（最大）：ふつう ' + fmtN(gap(0, 1), 3) + '　自然 ' + fmtN(gap(2, 3), 4), width * 0.52, y0);
  fill(...DIMC); textSize(14);
  text('答え（緑の丸）= データの平均 ' + fmtN(mData, 3) + ' と標準偏差 ' + fmtN(Math.sqrt(vData), 3) + '（最尤推定）', width * 0.52, y0 + 24);
  text('フィッシャー行列：(μ, σ) では diag(1/σ², 2/σ²)、(μ, log σ) では diag(1/σ², 2)', width * 0.52, y0 + 46);
  text('ふつうの勾配は σ が小さい所で急に大きくなり、遠回りや行きすぎが起こる', width * 0.52, y0 + 68);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  for (let [b, isLog] of [[bA, false], [bB, true]]) if (inRect(mouseX, mouseY, b)) { let [u, v] = fromScr(b, mouseX, mouseY); start = [clampv(u, -3, 3), clampv(isLog ? Math.exp(v) : v, 0.08, 3)]; resetPaths(); running = true; }
}
function keyPressed() {
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') resetPaths();
  if (key === 'd' || key === 'D') { seedD++; makeData(); resetPaths(); }
  if (key === UP_ARROW) { lrPlain = Math.min(0.4, lrPlain * 1.5); lrNat = Math.min(0.5, lrNat * 1.5); resetPaths(); }
  if (key === DOWN_ARROW) { lrPlain = Math.max(0.01, lrPlain / 1.5); lrNat = Math.max(0.01, lrNat / 1.5); resetPaths(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  makeData();
  let h = 1e-6, P = [0.4, 0.9], g = gradA(P[0], P[1]), fd = [(lossOf(P[0] + h, P[1]) - lossOf(P[0] - h, P[1])) / (2 * h), (lossOf(P[0], P[1] + h) - lossOf(P[0], P[1] - h)) / (2 * h)];
  check('勾配の式 = 数値微分（誤差 1e-7）', Math.abs(g[0] - fd[0]) < 1e-7 && Math.abs(g[1] - fd[1]) < 1e-7);
  seedRng(808); let mu = 0.5, sg = 1.3, n = 60000, c = [0, 0, 0];
  for (let k = 0; k < n; k++) { let x = mu + sg * gaussRnd(), a = (x - mu) / (sg * sg), b = -1 / sg + (x - mu) ** 2 / sg ** 3; c[0] += a * a; c[1] += b * b; c[2] += a * b; }
  check('スコアの分散（6 万回）≈ フィッシャー行列 diag(1/σ², 2/σ²)（3% 以内、非対角 ≈ 0）', Math.abs((c[0] / n) * sg * sg - 1) < 0.03 && Math.abs((c[1] / n) * sg * sg / 2 - 1) < 0.03 && Math.abs(c[2] / n) < 0.03);
  let A = [[1 / (sg * sg), 0.2], [0.2, 2 / (sg * sg)]], xs = solveLin(A, [0.3, -0.7]), rr = matVec(A, xs);
  check('2×2 の連立方程式 F x = ∇L の解の残差 < 1e-14', Math.abs(rr[0] - 0.3) < 1e-14 && Math.abs(rr[1] + 0.7) < 1e-14);
  start = [-2, 2.2]; resetPaths();
  for (let s = 0; s < 400; s++) for (let k = 0; k < 4; k++) paths[k].push(safeStep(k, paths[k][paths[k].length - 1]));
  let gap = (a, b) => Math.max(...paths[a].map((Q, i) => Math.hypot(Q[0] - paths[b][i][0], Q[1] - paths[b][i][1])));
  check('自然勾配の 2 つの座標の道はほぼ同じ（ずれ ' + fmtN(gap(2, 3), 4) + ' < 0.05）', gap(2, 3) < 0.05);
  check('ふつうの勾配の 2 つの道は大きくちがう（ずれ ' + fmtN(gap(0, 1), 3) + ' > 0.3、自然勾配の 6 倍以上）', gap(0, 1) > 0.3 && gap(0, 1) > 6 * gap(2, 3));
  let e2 = paths[2][400], e3 = paths[3][400];
  check('自然勾配は 400 歩で最尤推定 (平均, 標準偏差) に着く（誤差 1e-4）', [e2, e3].every((Q) => Math.abs(Q[0] - mData) < 1e-4 && Math.abs(Q[1] - Math.sqrt(vData)) < 1e-4));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. σ の小さい所（下のほう）から出発すると、ふつうの勾配（オレンジ）はどうなる？ 自然勾配（紫）は？
// 2. ↑ で学習率を上げると、どちらが先にこわれる？
// 3. 3 つ目の座標 (μ, 1/σ²) でもふつうの勾配と自然勾配を足してみよう。自然勾配の道はやっぱり同じ？
// 4. 自然勾配の 1 歩の大きさを KL で測ると、どこでもだいたい同じ（½ η² ∇Lᵀ F⁻¹ ∇L）。確かめよう
// 5. 深層学習の Adam（シリーズ 49）は「対角だけのフィッシャー行列」で割る自然勾配の親戚と見ることもできる

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
// ---- 小さな連立一次方程式 A x = b（ガウスの消去法、部分ピボット）
function solveLin(A, b) {
  let n = b.length, M = A.map((r, i) => r.slice().concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    let d = Math.abs(M[c][c]) < 1e-300 ? 1e-300 : M[c][c];
    for (let r = c + 1; r < n; r++) { let f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  let x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / (Math.abs(M[r][r]) < 1e-300 ? 1e-300 : M[r][r]); }
  return x;
}
function matVec(A, x) { return A.map((r) => r.reduce((s, v, j) => s + v * x[j], 0)); }
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
