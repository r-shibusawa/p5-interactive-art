// ============================================
// 05 2 種類のまっすぐ ─ 2 つの分布 p と q をつなぐ「まっすぐな道」は 2 つある
// m-測地線（mixture）：確率をそのまま混ぜる p_t = (1−t)p + t q → 確率の三角形（η 座標）でまっすぐ
// e-測地線（exponential）：対数で混ぜて正規化 log p_t = (1−t)log p + t log q − ψ(t) → θ 座標 θ_i = log(p_i/p_3) でまっすぐ
// 片方の座標でまっすぐな線は、もう片方の座標では曲がる（双対平坦）。左 = 確率の三角形、右 = θ 平面
// ドラッグ p・q / ← → t を動かす / スペース 自動 / F e-測地線の扇（q へ向かう道をたくさん）/ R でたらめ
// ============================================

const N_PATH = 80;                       // ★ 道を何分割で描くか
let pA = [0.75, 0.15, 0.1], qA = [0.08, 0.32, 0.6], tCur = 0.5, auto = true, fan = false, fr, tb, grab = null;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); layout(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() {
  let side = Math.min(width * 0.36, (height - 330) / 0.91);
  fr = simplexFrame(40 + side / 2 + 10, 120 + side * 0.62, side);
  let w = Math.min(width * 0.32, height * 0.48); tb = plotBox(width * 0.5, 110, w, w, -4, 4, -4, 4);
}
function thetaOf(p) { return [safeLog(p[0]) - safeLog(p[2]), safeLog(p[1]) - safeLog(p[2])]; }   // ★ θ 座標（3 番目を基準にした対数の比）
function pathOf(fn) { let out = []; for (let k = 0; k <= N_PATH; k++) out.push(fn(pA, qA, k / N_PATH)); return out; }

function draw() {
  background(...BG);
  hudTitle('2 種類のまっすぐ：m-測地線（確率を混ぜる）と e-測地線（対数で混ぜる）', 'ドラッグ p・q　← → t = ' + fmtN(tCur, 2) + '　スペース 自動 ' + (auto ? 'ON' : 'OFF') + '　F e-測地線の扇 ' + (fan ? 'ON' : 'OFF') + '　R でたらめ');
  if (auto) tCur = 0.5 - 0.5 * Math.cos(frameCount * 0.015);
  let mp = pathOf(mixM), ep = pathOf(mixE), mt = mixM(pA, qA, tCur), et = mixE(pA, qA, tCur);
  // ---- 左：確率の三角形
  drawSimplexFrame(fr);
  if (fan) for (let i = 1; i < 10; i++) for (let j = 1; j < 10 - i; j++) {   // いろいろな点から q への e-測地線（m なら全部まっすぐ）
    let s = [i / 10, j / 10, 1 - (i + j) / 10], ps = []; for (let k = 0; k <= 30; k++) ps.push(mixE(s, qA, k / 30)); simplexPath(fr, ps, [...VIOLET, 70], 1);
  }
  simplexPath(fr, mp, ORANGE, 3); simplexPath(fr, ep, VIOLET, 3);
  simplexDot(fr, pA, INK, 16, 'p'); simplexDot(fr, qA, INK, 16, 'q');
  simplexDot(fr, mt, ORANGE, 12); simplexDot(fr, et, VIOLET, 12);
  noStroke(); textSize(15); textAlign(LEFT, BASELINE); fill(...ORANGE); text('m-測地線：三角形の中でまっすぐ', 40, fr.v[0][1] + 40); fill(...VIOLET); text('e-測地線：三角形の中では曲がる', 40, fr.v[0][1] + 62);
  // ---- 右：θ 平面
  drawAxes(tb, 'θ1 = log(p1/p3)', 'θ2 = log(p2/p3)　（θ 平面）');
  plotLine(tb, mp.map(thetaOf), ORANGE, 3); plotLine(tb, ep.map(thetaOf), VIOLET, 3);
  for (let [P, col, r] of [[pA, INK, 14], [qA, INK, 14], [mt, ORANGE, 11], [et, VIOLET, 11]]) { let [x, y] = toScr(tb, ...thetaOf(P)); if (inRect(x, y, tb)) { noStroke(); fill(...col); circle(x, y, r); } }
  noStroke(); textSize(15); fill(...VIOLET); text('e-測地線：θ 平面でまっすぐ', tb.x, tb.y + tb.h + 44); fill(...ORANGE); text('m-測地線：θ 平面では曲がる', tb.x, tb.y + tb.h + 66);
  // ---- 右端：途中の分布の棒グラフと KL
  let bx = tb.x + tb.w + 40, bw = width - bx - 30;
  if (bw > 120) {
    drawBars(mt, { x: bx, y: 130, w: bw, h: 110 }); drawBars(et, { x: bx, y: 300, w: bw, h: 110 });
    fill(...ORANGE); textSize(14); textAlign(LEFT, BASELINE); text('m：(1−t)p + t q', bx, 116); fill(...VIOLET); text('e：p^(1−t) q^t / Z', bx, 286);
    fill(...DIMC); textSize(13);
    text('t = 0.5：m は足して 2 で割る', bx, 450); text('e は掛けて √、正規化', bx, 470);
    text('D(m_t‖q) = ' + fmtN(divKL(mt, qA), 3), bx, 500); text('D(e_t‖q) = ' + fmtN(divKL(et, qA), 3), bx, 520);
  }
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  grab = null;
  for (let [nm, P] of [['p', pA], ['q', qA]]) { let [x, y] = baryToXY(fr, P); if (dist(mouseX, mouseY, x, y) < 22) grab = nm; }
}
function mouseDragged() { if (grab === 'p') pA = clampSimplex(xyToBary(fr, mouseX, mouseY), 0.004); if (grab === 'q') qA = clampSimplex(xyToBary(fr, mouseX, mouseY), 0.004); }
function mouseReleased() { grab = null; }
function keyPressed() {
  if (key === LEFT_ARROW) { auto = false; tCur = clampv(tCur - 0.05, 0, 1); }
  if (key === RIGHT_ARROW) { auto = false; tCur = clampv(tCur + 0.05, 0, 1); }
  if (key === ' ') auto = !auto;
  if (key === 'f' || key === 'F') fan = !fan;
  if (key === 'r' || key === 'R') { pA = rndDist(3, 0.01); qA = rndDist(3, 0.01); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(21); let okEnd = true, okSum = true, okLineM = true, okLineE = true, okMid = true, maxGap = 0;
  let col = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  for (let k = 0; k < 100; k++) {
    let p = rndDist(3, 0.005), q = rndDist(3, 0.005);
    for (let fn of [mixM, mixE]) {
      let a = fn(p, q, 0), b = fn(p, q, 1);
      if (a.some((v, i) => Math.abs(v - p[i]) > 1e-12) || b.some((v, i) => Math.abs(v - q[i]) > 1e-12)) okEnd = false;
      for (let t of [0.2, 0.5, 0.9]) if (Math.abs(fn(p, q, t).reduce((s, v) => s + v, 0) - 1) > 1e-12) okSum = false;
    }
    let m3 = mixM(p, q, 0.37); if (col(p, q, m3) > 1e-12) okLineM = false;
    let e3 = mixE(p, q, 0.37); if (col(thetaOf(p), thetaOf(q), thetaOf(e3)) > 1e-9 * (1 + Math.abs(thetaOf(q)[0]) * 10)) okLineE = false;
    let em = mixE(p, q, 0.5), g = p.map((v, i) => Math.sqrt(v * q[i])), gs = g.reduce((s, v) => s + v, 0);
    if (em.some((v, i) => Math.abs(v - g[i] / gs) > 1e-12)) okMid = false;
    maxGap = Math.max(maxGap, tvDist(mixM(p, q, 0.5), em));
  }
  check('両方の道とも t = 0 で p、t = 1 で q（100 組、誤差 1e-12）', okEnd);
  check('途中の分布はどれも合計 1', okSum);
  check('m-測地線の途中の点は p・q と一直線（確率の座標で）', okLineM);
  check('e-測地線の途中の点は θ = log(p_i/p_3) の座標で一直線', okLineE);
  check('e の中点 = √(p q) を正規化したもの、m の中点 = (p + q)/2', okMid);
  check('2 つの道はちがう：中点の差（全変動）の最大 ' + fmtN(maxGap, 3), maxGap > 0.05);
  let p = [0.7, 0.2, 0.1], q = [0.1, 0.3, 0.6], cv = true;
  for (let t = 0.1; t < 1; t += 0.1) { let a = divKL(mixM(p, q, t - 0.05), q), b = divKL(mixM(p, q, t), q), c = divKL(mixM(p, q, t + 0.05), q); if (a + c - 2 * b < -1e-12 || b > a) cv = false; }
  check('m-測地線に沿って D(p_t‖q) は減り続け、下に凸', cv);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. p と q を三角形の辺の近くに置くと、e-測地線はどう曲がる？ 確率が 0 に近い結果はどうなる？
// 2. F の扇：q へ向かう e-測地線はどれも θ 平面でまっすぐ。三角形では？
// 3. t = 0.5 の 2 つの分布を棒グラフで比べよう。どちらが「とがって」いる？
// 4. p と q を入れかえても道は同じ？（向きだけ反対？）
// 5. 次の 06：e と m の 2 本のまっすぐが直角に交わると、ピタゴラスの定理が成り立つ

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
