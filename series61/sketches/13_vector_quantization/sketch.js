// ============================================
// 13 ベクトル量子化と画像の減色 ─ 画素の色 (r, g, b) を 3 次元の点とみなして k-means → k 色のパレット（中心）に置きかえる
//   各画素は「パレットの番号」だけ覚えればよい → 1 画素 24 ビットが ⌈log2 k⌉ ビットに（データ量が減る）
//   画質は PSNR = 10·log10(255² / MSE)（MSE = 色の差の 2 乗の平均）で測る。大きいほどもとの画像に近い（同じなら ∞）
//   k + 1 色は「k 色の答え + いちばん合っていない画素の色」から始めるので、k を増やすと PSNR は必ず上がるか同じ
// ↑↓ 色の数 k / E 誤差の画像 / スペース もとの画像 ⇔ 減色 / R 新しい画像
// ============================================

const IW = 128, IH = 96;               // ★ 画像の大きさ（大きいと計算が重い）
const KS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];   // ★ 調べる色の数
let pix = [], results = [], kSel = 4, showErr = false, showOrig = false, seedI = 131, imgO, imgQ;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); selfTest(); newImage(); }
// ★ テスト用の合成画像：グラデーションの空、太陽、山、しま模様、色のついた丸
function makeImage(w, h, seed) {
  seedRng(seed);
  let out = [], disks = Array.from({ length: 6 }, () => ({ x: rnd() * w, y: h * (0.55 + 0.4 * rnd()), r: 5 + 9 * rnd(), c: [255 * rnd(), 255 * rnd(), 255 * rnd()] }));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let u = y / h, c = [40 + 180 * u, 80 + 120 * u, 200 - 60 * u];                                           // 空のグラデーション
    if ((x - w * 0.75) ** 2 + (y - h * 0.25) ** 2 < (h * 0.12) ** 2) c = [255, 210 - 40 * u, 90];            // 太陽
    let hill = h * (0.6 + 0.12 * Math.sin(x * 0.07 + seed));
    if (y > hill) c = [60 + 40 * Math.sin(x * 0.3), 140 - 50 * ((y - hill) / h), 70];                        // 山
    if (y > h * 0.85) c = Math.floor(x / 6) % 2 ? [230, 230, 220] : [70, 60, 90];                             // しま
    for (let d of disks) if ((x - d.x) ** 2 + (y - d.y) ** 2 < d.r * d.r) c = d.c.slice();
    out.push(c.map((v) => clampv(Math.round(v), 0, 255)));
  }
  return out;
}
// ★ k 色の答え：lloyd の結果から MSE・PSNR・ビット数をまとめる
function finish(px, k, r) { let mse = r.inertia / (px.length * 3); return { k, centers: r.centers, labels: r.labels, mse, psnr: mse > 0 ? 10 * Math.log10((255 * 255) / mse) : Infinity, bits: Math.ceil(Math.log2(k)) }; }
// ★ 前の答え + いちばん合っていない画素の色 から始める → J は増えないので PSNR は下がらない
function growFrom(px, prev, k) {
  let c0 = prev.centers.slice(), lab = prev.labels;
  while (c0.length < k) { let far = 0, fd = -1; px.forEach((p, i) => { let d = sqd(p, c0[lab[i]]); if (d > fd) { fd = d; far = i; } }); c0.push(px[far].slice()); lab = assignLabels(px, c0); }
  return finish(px, k, lloyd(px, c0, 30));
}
function quantizeChain(px, ks, seed) {
  seedRng(seed);
  let res = [finish(px, ks[0], lloyd(px, initPlusPlus(px, ks[0]), 30))];
  for (let q = 1; q < ks.length; q++) res.push(growFrom(px, res[q - 1], ks[q]));
  return res;
}
function newImage() { pix = makeImage(IW, IH, seedI); results = []; imgO = toImage(pix); }
function toImage(px) { let im = createImage(IW, IH); im.loadPixels(); px.forEach((c, i) => { im.pixels[4 * i] = c[0]; im.pixels[4 * i + 1] = c[1]; im.pixels[4 * i + 2] = c[2]; im.pixels[4 * i + 3] = 255; }); im.updatePixels(); return im; }
function psnrText(v) { return v === Infinity ? '∞' : v.toFixed(2) + ' dB'; }

function draw() {
  background(22, 24, 34);
  if (results.length === 0) results = quantizeChain(pix, KS.slice(0, 1), 3);
  else if (results.length < KS.length) results.push(growFrom(pix, results[results.length - 1], KS[results.length]));   // 1 フレームに 1 つずつ（重いので）
  let ready = kSel < results.length, e = ready ? results[kSel] : null;
  if (e && (!imgQ || imgQ.kk !== e.k || imgQ.err !== showErr)) {
    imgQ = toImage(pix.map((c, i) => { let q = e.centers[e.labels[i]]; return showErr ? c.map((v, j) => clampv(4 * Math.abs(v - q[j]), 0, 255)) : q.map(Math.round); }));
    imgQ.kk = e.k; imgQ.err = showErr;
  }
  let sc = Math.min((width - 120) / (2 * IW), (height - 330) / IH);
  noSmooth(); image(imgO, 40, 110, IW * sc, IH * sc); if (e) image(showOrig ? imgO : imgQ, 80 + IW * sc, 110, IW * sc, IH * sc); smooth();
  noStroke(); fill(205); textSize(14); textAlign(LEFT, BASELINE);
  text('もとの画像（1 画素 24 ビット）', 40, 102);
  if (e) text((showErr ? '誤差 × 4（明るいほど色がずれた）' : showOrig ? 'もとの画像（スペースで減色にもどる）' : e.k + ' 色に減色（1 画素 ' + e.bits + ' ビット）'), 80 + IW * sc, 102);
  // ---- パレット
  let py = 130 + IH * sc;
  if (e) {
    let cnt = new Array(e.k).fill(0); e.labels.forEach((l) => cnt[l]++);
    let order = e.centers.map((_, j) => j).sort((a, b) => cnt[b] - cnt[a]), sw = Math.min(36, (width * 0.5) / e.k);
    order.forEach((j, r) => { let c = e.centers[j]; fill(c[0], c[1], c[2]); rect(40 + r * sw, py, sw - 3, 30, 3); });
    fill(170); textSize(12); text('パレット（使われている画素の多い順）', 40, py + 48);
  }
  // ---- PSNR のグラフ
  let g = { x: width * 0.6, y: py + 10, w: width * 0.4 - 60, h: height - py - 110, x0: 0, x1: Math.log2(32), y0: 10, y1: 45 };
  plotAxes(g, 'log2 k', 'PSNR（dB）', [0, 1, 2, 3, 4, 5], [10, 20, 30, 40]);
  stroke(110, 230, 190); strokeWeight(2); polyline(results.filter((r) => isFinite(r.psnr)).map((r) => [gX(g, Math.log2(r.k)), gY(g, r.psnr)]));
  noStroke(); results.forEach((r, i) => { fill(i === kSel ? 255 : color(110, 230, 190)); circle(gX(g, Math.log2(r.k)), gY(g, Math.min(45, r.psnr)), i === kSel ? 12 : 6); });
  // ---- 数
  fill(225); textSize(16);
  if (e) {
    let bytes = Math.ceil((IW * IH * e.bits) / 8) + 3 * e.k, orig = IW * IH * 3;
    text('k = ' + e.k + '　PSNR = ' + psnrText(e.psnr) + '　MSE = ' + e.mse.toFixed(2) + '\nデータ量：' + IW * IH + ' 画素 × ' + e.bits + ' ビット + パレット ' + 3 * e.k + ' バイト = ' + bytes + ' バイト（もとの ' + ((100 * bytes) / orig).toFixed(1) + '%）', 40, py + 90, width * 0.55);
  } else text('計算中…', 40, py + 90);
  // ---- 文字
  fill(240); textSize(20);
  text('ベクトル量子化と画像の減色　k = ' + KS[kSel] + (e ? '　PSNR ' + psnrText(e.psnr) : '　（計算中）'), 40, 40);
  fill(170); textSize(15); text('↑↓ 色の数 k　E 誤差の画像' + (showErr ? '（表示中）' : '') + '　スペース もとの画像 ⇔ 減色　R 新しい画像', 40, 66);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW) kSel = Math.min(KS.length - 1, kSel + 1);
  if (key === DOWN_ARROW) kSel = Math.max(0, kSel - 1);
  if (key === 'e' || key === 'E') showErr = !showErr;
  if (key === ' ') showOrig = !showOrig;
  if (key === 'r' || key === 'R') { seedI++; newImage(); imgQ = null; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let px = makeImage(48, 36, 7), ch = quantizeChain(px, [1, 2, 4, 8, 16], 3);
  check('k を増やすと PSNR は上がる：' + ch.map((r) => psnrText(r.psnr)).join(' → '), ch.every((r, i) => i === 0 || r.psnr >= ch[i - 1].psnr - 1e-9) && ch[4].psnr > ch[0].psnr + 10);
  let e = ch[3], cen = true, near1 = true;
  for (let j = 0; j < e.k; j++) { let mem = px.filter((_, i) => e.labels[i] === j); if (mem.length) for (let d = 0; d < 3; d++) if (Math.abs(meanOf(mem.map((p) => p[d])) - e.centers[j][d]) > 1e-9) cen = false; }
  check('止まったとき、パレットの各色 = その色に置きかえた画素の色の平均', cen);
  px.forEach((p, i) => { if (e.centers.some((c) => sqd(p, c) < sqd(p, e.centers[e.labels[i]]) - 1e-9)) near1 = false; });
  check('どの画素も、パレットのいちばん近い色に置きかえられている（総当たり）', near1);
  check('MSE = J（慣性）÷（画素の数 × 3）、PSNR = 10·log10(255² / MSE)', near(e.mse * px.length * 3, inertiaOf(px, e.centers, e.labels), 1e-6) && near(e.psnr, 10 * Math.log10(65025 / e.mse), 1e-12));
  let five = Array.from({ length: 200 }, (_, i) => [[10, 20, 30], [200, 0, 0], [0, 200, 0], [0, 0, 200], [250, 250, 250]][i % 5]), q5 = quantizeChain(five, [5], 2)[0];
  check('5 色だけの画像を 5 色に減色すると誤差 0、PSNR = ∞（表示は「∞」）', q5.mse === 0 && q5.psnr === Infinity && psnrText(q5.psnr) === '∞');
  check('ビット数 ⌈log2 k⌉：k = 1 → 0、2 → 1、16 → 4、17 → 5、32 → 5', [1, 2, 16, 17, 32].map((k) => Math.ceil(Math.log2(k))).join() === '0,1,4,5,5');
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で k を 1 → 32 に。何色くらいから「もとの画像と区別がつかない」？ PSNR は何 dB？
// 2. E で誤差の画像を見よう。どこの色がいちばんずれる？（グラデーションの空はなかなか消えない）
// 3. k = 2 のパレットは何色と何色？ 明るい・暗いに分かれる？
// 4. データ量の % と PSNR のグラフを比べて、「ちょうどよい k」を決めよう
// 5. 12 の SOM の色の地図も、色のパレットを作っている（しかも似た色がとなりに並ぶ）

// ==================================================
// ここから下は「クラスタリングの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 共通：値をはさむ・クラスタの色・距離（点は [x, y] や [r, g, b] のような配列）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const PAL = [[176, 140, 255], [110, 230, 190], [255, 190, 80], [110, 180, 255], [255, 120, 130], [200, 240, 110], [255, 150, 220], [90, 210, 220], [255, 150, 70], [190, 190, 255]];
function palC(k, a) {                  // クラスタ k の色（k < 0 = ノイズ = 灰色）
  let al = a === undefined ? 255 : a;
  if (k < 0) return color(120, 120, 135, al);
  let c = PAL[k % PAL.length]; return color(c[0], c[1], c[2], al);
}
function sqd(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { let d = a[i] - b[i]; s += d * d; } return s; }   // 距離の 2 乗
function edist(a, b) { return Math.sqrt(sqd(a, b)); }                                                              // ユークリッド距離
function meanOf(arr) { if (!arr.length) return 0; let s = 0; for (let v of arr) s += v; return s / arr.length; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1, gaussSpare = null;
function seedRng(s) { rngState = (s >>> 0) || 1; gaussSpare = null; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function gauss() {                     // 標準正規分布（ボックス-ミュラー法）
  if (gaussSpare !== null) { let g = gaussSpare; gaussSpare = null; return g; }
  let u = 1 - rnd(), v = rnd(), r = Math.sqrt(-2 * Math.log(u));
  gaussSpare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v);
}
// ---- k-means（ロイドのアルゴリズム）。目的関数 = 慣性 = Σ |x_i − 中心|²
function nearestCenter(p, centers) { let best = 0, bd = Infinity; for (let j = 0; j < centers.length; j++) { let d = sqd(p, centers[j]); if (d < bd) { bd = d; best = j; } } return best; }
function assignLabels(pts, centers) { return pts.map((p) => nearestCenter(p, centers)); }        // ① 割り当て
function inertiaOf(pts, centers, labels) { let s = 0; for (let i = 0; i < pts.length; i++) s += sqd(pts[i], centers[labels[i]]); return s; }
function updateCenters(pts, labels, centers) {                                                     // ② 更新（仲間の平均。仲間 0 なら動かさない）
  let k = centers.length, dim = centers[0].length, sum = centers.map(() => new Array(dim).fill(0)), cnt = new Array(k).fill(0);
  for (let i = 0; i < pts.length; i++) { let l = labels[i]; cnt[l]++; for (let d = 0; d < dim; d++) sum[l][d] += pts[i][d]; }
  return sum.map((s, j) => (cnt[j] ? s.map((v) => v / cnt[j]) : centers[j].slice()));
}
function initRandomCenters(pts, k) {   // ランダムに k 点えらぶ（重ならないように）
  if (!pts.length) return Array.from({ length: k }, () => [0, 0]);
  let idx = pts.map((_, i) => i), out = [];
  for (let j = 0; j < Math.min(k, pts.length); j++) { let r = j + Math.floor(rnd() * (idx.length - j)); [idx[j], idx[r]] = [idx[r], idx[j]]; out.push(pts[idx[j]].slice()); }
  while (out.length < k) out.push(pts[0].slice());
  return out;
}
function initPlusPlus(pts, k) {        // k-means++：今ある中心から遠い点ほど（距離² に比例して）えらばれやすい
  if (!pts.length) return Array.from({ length: k }, () => [0, 0]);
  let out = [pts[Math.floor(rnd() * pts.length)].slice()], d2 = pts.map((p) => sqd(p, out[0]));
  while (out.length < k) {
    let tot = 0; for (let v of d2) tot += v;
    let r = rnd() * tot, pick = pts.length - 1;
    if (tot > 0) { for (let i = 0; i < pts.length; i++) { r -= d2[i]; if (r <= 0) { pick = i; break; } } } else pick = Math.floor(rnd() * pts.length);
    out.push(pts[pick].slice());
    for (let i = 0; i < pts.length; i++) d2[i] = Math.min(d2[i], sqd(pts[i], pts[pick]));
  }
  return out;
}
// 最後まで回す。hist = 半ステップ（割り当て・更新）ごとの慣性
function lloyd(pts, centers0, maxIter) {
  let centers = centers0.map((c) => c.slice()), labels = assignLabels(pts, centers), hist = [inertiaOf(pts, centers, labels)], iters = 0;
  for (let it = 0; it < (maxIter || 100); it++) {
    let nc = updateCenters(pts, labels, centers); hist.push(inertiaOf(pts, nc, labels));
    let nl = assignLabels(pts, nc); hist.push(inertiaOf(pts, nc, nl));
    centers = nc; iters++;
    let same = nl.every((v, i) => v === labels[i]); labels = nl;
    if (same) break;
  }
  return { centers, labels, inertia: hist[hist.length - 1], hist, iters };
}
function kmeansBest(pts, k, restarts, usePP, maxIter) {   // restarts 回やり直して慣性がいちばん小さいものを選ぶ
  let best = null, all = [];
  for (let r = 0; r < restarts; r++) { let res = lloyd(pts, usePP ? initPlusPlus(pts, k) : initRandomCenters(pts, k), maxIter); all.push(res.inertia); if (!best || res.inertia < best.inertia) best = res; }
  best.all = all; return best;
}
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }（画面の四角とデータの範囲）
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function invX(g, px) { return g.x0 + ((px - g.x) / g.w) * (g.x1 - g.x0); }
function invY(g, py) { return g.y0 + ((g.y + g.h - py) / g.h) * (g.y1 - g.y0); }
function inBox(g, px, py) { return px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h; }
function fitView(x, y, w, h, cx, cy, span) {   // 縦横の縮尺をそろえる（span = 短い辺に入るデータの幅）
  let s = Math.min(w, h) / span; return { x, y, w, h, x0: cx - w / 2 / s, x1: cx + w / 2 / s, y0: cy - h / 2 / s, y1: cy + h / 2 / s };
}
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawPts(g, pts, labels, r, al) {   // クラスタの色で点を描く（labels がなければ白）
  noStroke();
  for (let i = 0; i < pts.length; i++) { fill(labels ? palC(labels[i], al) : color(230, 230, 240, al === undefined ? 255 : al)); circle(gX(g, pts[i][0]), gY(g, pts[i][1]), r); }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
