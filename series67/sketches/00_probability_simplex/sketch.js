// ============================================
// 00 確率の三角形 ─ 3 つの結果（グー・チョキ・パー）の確率 (p1, p2, p3) は、合計が 1 なので正三角形の中の「1 つの点」
// 頂点 = 必ずその結果、まん中 = 3 つが同じ確率。背景の等高線はエントロピー H(p) = −Σ p log p（偏りの少なさ）
// 「分布は点、分布の集まりは図形」。その図形の形や距離を調べるのが情報幾何学（コイン 1 枚のエントロピーはシリーズ 6 の 01）
// ドラッグ 点を動かす / スペース サンプルを止める・動かす / 1 2 3 頂点へ / C まん中へ / ↑↓ サンプルの速さ / B ビット ⇔ ナット
// ============================================

const NAMES = ['グー', 'チョキ', 'パー'];   // ★ 3 つの結果の名前
const SAMPLE_N = 60;                     // ★ 右下に並べるサンプルの数
let pCur = [0.5, 0.3, 0.2], fr, field = null, dragging = false, samples = [], counts = [0, 0, 0], total = 0, running = true, speed = 4, useBits = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  seedRng(7); selfTest(); layout();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() {
  let side = Math.min(width * 0.46, (height - 170) * 1.1);
  fr = simplexFrame(width * 0.3, height * 0.56, side);
  freeField(field);
  // ★ エントロピーの等高線：最大 log 3 ≈ 1.10 ナット。間隔 0.1
  field = simplexField(fr, entropyH, { level: 0.1, vmax: Math.log(3), c0: [30, 45, 75], c1: [210, 120, 60] });
}

function draw() {
  background(...BG);
  hudTitle('確率の三角形：分布は 1 つの点', 'ドラッグ 点を動かす　1 2 3 頂点へ　C まん中へ　スペース サンプル ' + (running ? '動いている' : '止めた') + '　↑↓ 速さ ' + speed + '　B 単位（' + (useBits ? 'ビット' : 'ナット') + '）');
  drawField(field); drawSimplexFrame(fr, NAMES);
  // 3 つの辺は「どれか 1 つが 0」の分布。辺の上ではその結果は一度も出ない
  if (running) for (let k = 0; k < speed; k++) addSample();
  let emp = total > 0 ? counts.map((c) => c / total) : [1 / 3, 1 / 3, 1 / 3];
  simplexDot(fr, emp, VIOLET, 10, '出た割合');
  simplexDot(fr, pCur, ORANGE, 18, 'p');
  // 点から 3 つの辺への垂線：長さが確率に比例する（高さ × p_i）
  let [px, py] = baryToXY(fr, pCur);
  for (let i = 0; i < 3; i++) {
    let a = fr.v[(i + 1) % 3], b = fr.v[(i + 2) % 3], t = ((px - a[0]) * (b[0] - a[0]) + (py - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
    stroke(...OUTC[i], 200); strokeWeight(2); drawingContext.setLineDash([5, 5]); line(px, py, a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])); drawingContext.setLineDash([]);
  }
  // ---- 右側：棒グラフ・数値・サンプル列
  let rx = width * 0.6, rw = width * 0.34, H = entropyH(pCur), unit = useBits ? ' ビット' : ' ナット', cv = useBits ? 1 / Math.LN2 : 1;
  drawBars(pCur, { x: rx, y: 110, w: rw, h: 150 }, { names: NAMES, ghost: emp });
  noStroke(); fill(...INK); textSize(16); textAlign(LEFT, BASELINE);
  text('p = ' + fmtP(pCur, 3) + '　（合計 ' + fmtN(pCur[0] + pCur[1] + pCur[2], 3) + '）', rx, 310);
  text('エントロピー H(p) = ' + fmtN(H * cv, 3) + unit + '　（最大 ' + fmtN(Math.log(3) * cv, 3) + ' はまん中）', rx, 336);
  fill(...DIMC); textSize(14);
  text('白い枠 = これまでに出た割合（' + total + ' 回）。回数が増えると p に近づく', rx, 362);
  text('出た割合と p の差（全変動）= ' + fmtN(tvDist(emp, pCur), 4) + '　≈ 1/√回数 くらいで小さくなる', rx, 384);
  // サンプルの列（新しいほど左）
  let cw = Math.min(26, rw / 15);
  for (let k = 0; k < samples.length; k++) {
    let x = rx + (k % 15) * cw, y = 420 + Math.floor(k / 15) * (cw + 4);
    noStroke(); fill(...OUTC[samples[k]], 230 - k * 2); rect(x, y, cw - 3, cw - 3, 4);
    fill(...BG); textSize(11); textAlign(CENTER, CENTER); text(NAMES[samples[k]][0], x + (cw - 3) / 2, y + (cw - 3) / 2);
  }
  fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE);
  text('どの点も「くじの箱」：同じ点なら、出る列はちがっても割合は同じところへ集まる', rx, height - 60);
  drawSelfTest(width - 180, height - 14);
}
function addSample() {
  let i = sampleIndex(pCur); samples.unshift(i); if (samples.length > SAMPLE_N) samples.pop();
  counts[i]++; total++;
  if (total > 20000) { counts = counts.map((c) => c / 2); total = counts[0] + counts[1] + counts[2]; total = Math.round(total); }
}
function setP(p) { pCur = clampSimplex(p, 0); counts = [0, 0, 0]; total = 0; }
function mousePressed() { let [x, y] = baryToXY(fr, pCur); dragging = dist(mouseX, mouseY, x, y) < 40 || Math.min(...xyToBary(fr, mouseX, mouseY)) >= 0; mouseDragged(); }
function mouseDragged() { if (dragging) setP(xyToBary(fr, mouseX, mouseY)); }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === '1') setP([1, 0, 0]);
  if (key === '2') setP([0, 1, 0]);
  if (key === '3') setP([0, 0, 1]);
  if (key === 'c' || key === 'C') setP([1 / 3, 1 / 3, 1 / 3]);
  if (key === ' ') running = !running;
  if (key === UP_ARROW) speed = Math.min(40, speed + 1);
  if (key === DOWN_ARROW) speed = Math.max(1, speed - 1);
  if (key === 'b' || key === 'B') useBits = !useBits;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let f = simplexFrame(400, 400, 300), okRound = true, okMax = true, okSum = true;
  seedRng(11);
  for (let k = 0; k < 300; k++) {
    let p = rndDist(3), [x, y] = baryToXY(f, p), b = xyToBary(f, x, y);
    if (Math.max(...b.map((v, i) => Math.abs(v - p[i]))) > 1e-12) okRound = false;
    if (Math.abs(b[0] + b[1] + b[2] - 1) > 1e-12) okSum = false;
    if (entropyH(p) > Math.log(3) + 1e-12) okMax = false;
  }
  check('三角形の点 ⇔ (p1, p2, p3) の行き来が 300 個の分布で一致（誤差 1e-12）、合計はいつも 1', okRound && okSum);
  check('頂点 = 必ず 1 つの結果、まん中 = (1/3, 1/3, 1/3)', [0, 1, 2].every((i) => { let b = xyToBary(f, f.v[i][0], f.v[i][1]); return Math.abs(b[i] - 1) < 1e-12; }) && Math.abs(xyToBary(f, f.cx, f.cy)[0] - 1 / 3) < 1e-12);
  check('エントロピー：頂点で 0、まん中で log 3 = ' + fmtN(Math.log(3), 4) + '、300 個のでたらめな分布はどれも log 3 以下', entropyH([1, 0, 0]) === 0 && Math.abs(entropyH([1 / 3, 1 / 3, 1 / 3]) - Math.log(3)) < 1e-12 && okMax);
  check('コイン（p, 1−p, 0）のエントロピーは p = 0.5 で 1 ビット（シリーズ 6 の 01 と同じ）', Math.abs(bitsOf(entropyH([0.5, 0.5, 0])) - 1) < 1e-12);
  seedRng(5); let c = [0, 0, 0], p = [0.5, 0.3, 0.2], n = 100000;
  for (let k = 0; k < n; k++) c[sampleIndex(p)]++;
  check('10 万回サンプルすると出た割合は p から 0.01 以内（' + fmtP(c.map((v) => v / n), 3) + '）', c.every((v, i) => Math.abs(v / n - p[i]) < 0.01));
  let g = 0; for (let k = 0; k <= 1000; k++) { let t = k / 1000, q = [t * 0.6, t * 0.4, 1 - t]; g = Math.max(g, entropyH(q)); }
  check('辺から辺へ動くとエントロピーは途中で最大になり、端の値（0）より大きい', g > 0.9 && entropyH([0, 0, 1]) === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 点を辺の上に置くと、どの結果が一度も出なくなる？ 頂点の近くでは列はどう見える？
// 2. エントロピーが同じ値の点を 3 つ探そう（同じ等高線の上）。棒グラフはどれくらいちがう？
// 3. SAMPLE_N を 300 にして、まん中と頂点の近くで「出た割合」の点の揺れ方を比べよう
// 4. 4 つの結果なら三角形ではなく正四面体（三角すい）の中の点になる。何次元の図形になる？
// 5. 次の 01 では、2 つの点の「近さ」を KL ダイバージェンスで測る

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
