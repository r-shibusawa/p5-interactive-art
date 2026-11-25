// ============================================
// 01 KL ダイバージェンス ─ 2 つの分布の「近さ」 D(p‖q) = Σ p_i log(p_i / q_i)
// 本当は p なのに q だと思って符号（暗号表）を作ると、1 回あたり平均で D(p‖q) ビットだけ長くなる（交差エントロピー = H(p) + D）
// D(p‖q) ≥ 0 で、0 になるのは p = q のときだけ。でも D(p‖q) ≠ D(q‖p)（向きがある）、三角不等式も成り立たない → 距離ではない
// 左の三角形：p（オレンジ）と q（紫）をドラッグ / 棒グラフもドラッグできる / 右：p を固定したときの D(p‖·) と D(·‖p) の等高線
// T 三角不等式の反例（中点 m を経由）/ S p と q を入れかえ / R でたらめ
// ============================================

const LEVEL = 0.15;                      // ★ 等高線の間隔（ナット）
let pA = [0.7, 0.2, 0.1], qA = [0.2, 0.3, 0.5], fr, frL, frR, fieldL = null, fieldR = null, fieldKey = '', grab = null, showTri = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest(); layout();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() {
  let side = Math.min(width * 0.32, (height - 460) / 0.91);
  fr = simplexFrame(width * 0.22, 130 + side * 0.62, side);
  let s2 = Math.min(width * 0.2, height * 0.3);
  frL = simplexFrame(width * 0.55, 130 + s2 * 0.6, s2); frR = simplexFrame(width * 0.82, 130 + s2 * 0.6, s2);
  fieldKey = '';
}
function rebuildFields() {               // p が変わったときだけ等高線を作り直す（重いので）
  let fk = pA.map((v) => v.toFixed(3)).join(',') + width;
  if (fk === fieldKey) return;
  fieldKey = fk; freeField(fieldL); freeField(fieldR);
  fieldL = simplexField(frL, (x) => Math.min(divKL(pA, x), 3), { level: LEVEL, vmax: 2, cap: 1.5, c0: [30, 45, 75], c1: ORANGE, res: 3 });
  fieldR = simplexField(frR, (x) => Math.min(divKL(x, pA), 3), { level: LEVEL, vmax: 2, cap: 1.5, c0: [30, 45, 75], c1: VIOLET, res: 3 });
}

function draw() {
  background(...BG);
  hudTitle('KL ダイバージェンス：近さの目安だが、距離ではない', 'ドラッグ p（オレンジ）・q（紫）または棒グラフ　S 入れかえ　R でたらめ　T 三角不等式の反例 ' + (showTri ? 'ON' : 'OFF'));
  rebuildFields();
  drawSimplexFrame(fr); simplexDot(fr, pA, ORANGE, 18, 'p'); simplexDot(fr, qA, VIOLET, 18, 'q');
  let mid = mixM(pA, qA, 0.5), dpq = divKL(pA, qA), dqp = divKL(qA, pA), dpm = divKL(pA, mid), dmq = divKL(mid, qA);
  if (showTri) { simplexPath(fr, [pA, mid, qA], [...TEAL, 150], 1.5); simplexDot(fr, mid, TEAL, 11, 'm'); }
  // ---- 右上：等高線（形がちがう）
  drawField(fieldL); drawSimplexFrame(frL, ['1', '2', '3']); simplexDot(frL, pA, ORANGE, 12); simplexDot(frL, qA, VIOLET, 9);
  drawField(fieldR); drawSimplexFrame(frR, ['1', '2', '3']); simplexDot(frR, pA, ORANGE, 12); simplexDot(frR, qA, VIOLET, 9);
  noStroke(); fill(...INK); textSize(15); textAlign(CENTER, BASELINE);
  text('D(p‖x)：x を動かす（p を固定）', frL.cx, frL.v[0][1] + 38); text('D(x‖p)：x を動かす（p を固定）', frR.cx, frR.v[0][1] + 38);
  fill(...DIMC); textSize(13);
  text('辺へ近づくと急に ∞ へ（q_i → 0 で log の分母が 0）', frL.cx, frL.v[0][1] + 58); text('辺の上でも有限（x_i = 0 は 0·log 0 = 0）', frR.cx, frR.v[0][1] + 58);
  // ---- 下：棒グラフと数値
  let by = height - 250, bw = Math.min(260, width * 0.2);
  drawBars(pA, { x: 40, y: by, w: bw, h: 120 }); drawBars(qA, { x: 80 + bw, y: by, w: bw, h: 120 });
  noStroke(); fill(...ORANGE); textSize(15); textAlign(LEFT, BASELINE); text('p', 40, by - 22); fill(...VIOLET); text('q', 80 + bw, by - 22);
  let tx = 140 + 2 * bw; fill(...INK); textSize(17);
  text('D(p‖q) = ' + fmtN(dpq, 4) + ' ナット = ' + fmtN(bitsOf(dpq), 4) + ' ビット', tx, by);
  text('D(q‖p) = ' + fmtN(dqp, 4) + ' ナット = ' + fmtN(bitsOf(dqp), 4) + ' ビット　' + (Math.abs(dpq - dqp) > 1e-3 ? '← 向きで値がちがう' : ''), tx, by + 28);
  fill(...DIMC); textSize(14);
  text('符号の長さ：p に合わせた符号なら H(p) = ' + fmtN(bitsOf(entropyH(pA)), 3) + ' ビット', tx, by + 58);
  text('q に合わせた符号で p を送ると H(p, q) = ' + fmtN(bitsOf(crossH(pA, qA)), 3) + ' ビット', tx, by + 78);
  text('→ 余分なビット数 = H(p, q) − H(p) = ' + fmtN(bitsOf(crossH(pA, qA) - entropyH(pA)), 4) + ' = D(p‖q)', tx, by + 98);
  if (showTri) {
    let bad = dpq > dpm + dmq + 1e-12;
    fill(...(bad ? ROSE : TEAL)); textSize(15);
    text('三角不等式？ D(p‖q) = ' + fmtN(dpq, 3) + (bad ? ' ＞ ' : ' ≤ ') + 'D(p‖m) + D(m‖q) = ' + fmtN(dpm, 3) + ' + ' + fmtN(dmq, 3), tx, by + 132);
    text(bad ? '→ 中点 m を経由したほうが「近い」：三角不等式が成り立たない！' : '→ この組では成り立つ。p と q を遠ざけてみよう', tx, by + 154);
  }
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  grab = null;
  let [px, py] = baryToXY(fr, pA), [qx, qy] = baryToXY(fr, qA), bw = Math.min(260, width * 0.2), by = height - 250;
  if (dist(mouseX, mouseY, px, py) < 22) grab = 'p'; else if (dist(mouseX, mouseY, qx, qy) < 22) grab = 'q';
  else if (inRect(mouseX, mouseY, { x: 40, y: by - 30, w: bw, h: 170 })) grab = 'bp'; else if (inRect(mouseX, mouseY, { x: 80 + bw, y: by - 30, w: bw, h: 170 })) grab = 'bq';
  mouseDragged();
}
function mouseDragged() {
  let bw = Math.min(260, width * 0.2), by = height - 250;
  if (grab === 'p') pA = clampSimplex(xyToBary(fr, mouseX, mouseY));
  if (grab === 'q') qA = clampSimplex(xyToBary(fr, mouseX, mouseY));
  if (grab === 'bp') pA = barsDrag(pA, { x: 40, y: by, w: bw, h: 120 }, mouseX, mouseY, 0.002);
  if (grab === 'bq') qA = barsDrag(qA, { x: 80 + bw, y: by, w: bw, h: 120 }, mouseX, mouseY, 0.002);
}
function mouseReleased() { grab = null; }
function keyPressed() {
  if (key === 's' || key === 'S') [pA, qA] = [qA, pA];
  if (key === 'r' || key === 'R') { pA = rndDist(3, 0.01); qA = rndDist(3, 0.01); }
  if (key === 't' || key === 'T') showTri = !showTri;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(3); let okPos = true, okSelf = true, okGibbs = true;
  for (let k = 0; k < 500; k++) {
    let p = rndDist(3 + (k % 4)), q = rndDist(p.length);
    if (!(divKL(p, q) >= 0)) okPos = false;
    if (divKL(p, p) !== 0) okSelf = false;
    if (Math.abs(crossH(p, q) - entropyH(p) - divKL(p, q)) > 1e-12) okGibbs = false;
  }
  check('500 組のでたらめな分布で D(p‖q) ≥ 0、D(p‖p) = 0', okPos && okSelf);
  check('交差エントロピー H(p, q) = H(p) + D(p‖q)（符号の余分な長さ、誤差 1e-12）', okGibbs);
  let a = [0.9, 0.1], b = [0.5, 0.5];
  check('向きがある：p = (0.9, 0.1)、q = (0.5, 0.5) で D(p‖q) = ' + fmtN(divKL(a, b), 4) + ' ≠ D(q‖p) = ' + fmtN(divKL(b, a), 4), Math.abs(divKL(a, b) - (0.9 * Math.log(1.8) + 0.1 * Math.log(0.2))) < 1e-12 && Math.abs(divKL(a, b) - divKL(b, a)) > 0.05);
  let p2 = [0.9, 0.1], q2 = [0.1, 0.9], m2 = [0.5, 0.5];
  check('三角不等式の反例：D((0.9,0.1)‖(0.1,0.9)) = ' + fmtN(divKL(p2, q2), 3) + ' ＞ 中点経由 ' + fmtN(divKL(p2, m2) + divKL(m2, q2), 3), divKL(p2, q2) > divKL(p2, m2) + divKL(m2, q2) + 0.5);
  check('q_i = 0 で p_i > 0 なら D(p‖q) = ∞、p_i = 0 の項は 0（0·log 0 = 0）', divKL([0.5, 0.5], [1, 0]) === Infinity && Math.abs(divKL([1, 0], [0.5, 0.5]) - Math.log(2)) < 1e-15);
  let p3 = [0.5, 0.3, 0.2], e = 1e-4, dv = [1, -2, 1], q3 = p3.map((v, i) => v + e * dv[i]), fq = dv.reduce((s, d, i) => s + (d * d) / p3[i], 0);
  check('近くでは D(p‖p+dp) ≈ ½ Σ dp²/p（フィッシャー情報の 2 次の形、02 へ）相対誤差 ' + fmtN(Math.abs(divKL(p3, q3) / (0.5 * e * e * fq) - 1), 5), Math.abs(divKL(p3, q3) / (0.5 * e * e * fq) - 1) < 1e-3);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. q を辺に近づけると D(p‖q) はどうなる？ D(q‖p) は？ 右の 2 つの等高線の形と比べよう
// 2. D(p‖q) = D(q‖p) になる p と q を探そう（たとえば左右対称な位置）
// 3. T の三角不等式：成り立たない組と成り立つ組の両方を探そう。どんな位置関係のとき破れる？
// 4. 天気予報の確率 q と本当の確率 p。外れの予報は何ビット損をする？ 棒グラフで試そう
// 5. 近い 2 点では D(p‖q) ≈ D(q‖p)。小さな差の 2 次の形がフィッシャー情報（02）

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestOk() { return selfTestResults.every((r) => r.ok); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestOk() ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
