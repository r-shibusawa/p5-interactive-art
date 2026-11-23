// ============================================
// 02 k の選び方 ─ k-means は k を自分で決められない。J（慣性）は k を増やすほど小さくなる一方（k = 点の数で 0）
//   エルボー法：J の折れ線が「ひじ」のように曲がる k（ここでは、両端を結ぶ直線からいちばん下に離れた k）
//   シルエット係数 s_i = (b − a) / max(a, b)：a = 仲間までの平均距離、b = いちばん近い別グループまでの平均距離。−1〜1、大きいほどよい
//   全部の点の平均がいちばん大きい k を選ぶ。右の棒 = 各点の s_i（負 = 別のグループのほうが近い「迷子」）
// ← → 本当のグループ数 / ↑↓ 表示する k / D かたまりの広がり / R 新しいデータ / クリック 点を足す
// ============================================

const NPTS = 240, KMAX = 10;           // ★ 点の数、調べる k の上限
let data, trueG = 4, spread = 1, showK = 4, seedD = 21, res = [], view;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function makeGroups(g, sp, seed, n) {  // g 個のかたまりを輪の上に（sp = 広がり 0, 1, 2）
  seedRng(seed);
  let specs = [];
  for (let j = 0; j < g; j++) { let a = (TWO_PI * j) / g + 0.3, r = g === 1 ? 0 : 1.3; specs.push({ n: Math.floor((n || NPTS) / g), c: [r * Math.cos(a), r * Math.sin(a)], sd: [[0.12, 0.2, 0.32][sp], [0.12, 0.2, 0.32][sp]] }); }
  return makeBlobs(specs);
}
// ★ k = 1〜KMAX で J とシルエットを計算。k + 1 は「k の中心 + いちばん遠い点」からも始める → J は必ず減る
function analyse(pts, seed, restarts) {
  seedRng(seed);
  let out = [], prev = null;
  for (let k = 1; k <= KMAX; k++) {
    let best = kmeansBest(pts, k, restarts || 5, true, 100);
    if (prev) {
      let far = 0; pts.forEach((p, i) => { if (sqd(p, prev.centers[prev.labels[i]]) > sqd(pts[far], prev.centers[prev.labels[far]])) far = i; });
      let warm = lloyd(pts, prev.centers.concat([pts[far].slice()]), 100); if (warm.inertia < best.inertia) best = warm;
    }
    let sil = k >= 2 ? silhouetteVals(pts, best.labels) : pts.map(() => 0);
    out.push({ k, J: best.inertia, labels: best.labels, centers: best.centers, sil, silMean: meanOf(sil) }); prev = best;
  }
  return out;
}
function elbowK(r) {                   // 両端を結ぶ直線から、いちばん下に離れた k（J と k を 0〜1 にそろえてから）
  let j0 = r[0].J, j1 = r[r.length - 1].J, best = 1, bd = -1;
  r.forEach((e, i) => { let x = i / (r.length - 1), y = (e.J - j1) / Math.max(1e-12, j0 - j1), d = 1 - x - y; if (d > bd) { bd = d; best = e.k; } });
  return best;
}
function silK(r) { let b = r[1]; for (let e of r) if (e.k >= 2 && e.silMean > b.silMean) b = e; return b.k; }
function newData() { data = makeGroups(trueG, spread, seedD); res = analyse(data.pts, 3); }

function draw() {
  background(22, 24, 34);
  let e = res[showK - 1], eK = elbowK(res), sK = silK(res);
  view = fitView(40, 100, width * 0.36, height * 0.56, 0, 0, 3.6);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  drawPts(view, data.pts, e.labels, 7);
  e.centers.forEach((c, j) => { stroke(20); strokeWeight(2); fill(palC(j)); rect(gX(view, c[0]) - 7, gY(view, c[1]) - 7, 14, 14); });
  // ---- エルボー（J）とシルエットの平均
  let gx = view.x + view.w + 70, gw = width * 0.27, ks = res.map((r) => r.k);
  let g1 = { x: gx, y: 120, w: gw, h: 200, x0: 1, x1: KMAX, y0: 0, y1: res[0].J * 1.05 };
  plotAxes(g1, 'k', 'J（慣性）→ ひじ = エルボー法', [1, 2, 4, 6, 8, 10], [0, +g1.y1.toPrecision(2)]);
  stroke(255, 190, 80); strokeWeight(2); polyline(res.map((r) => [gX(g1, r.k), gY(g1, r.J)]));
  stroke(255, 255, 255, 60); strokeWeight(1); line(gX(g1, 1), gY(g1, res[0].J), gX(g1, KMAX), gY(g1, res[KMAX - 1].J));
  noStroke(); res.forEach((r) => { fill(r.k === eK ? color(255, 190, 80) : r.k === showK ? 255 : 120); circle(gX(g1, r.k), gY(g1, r.J), r.k === eK ? 14 : 7); });
  let g2 = { x: gx, y: 400, w: gw, h: 200, x0: 1, x1: KMAX, y0: 0, y1: 1 };
  plotAxes(g2, 'k', 'シルエット係数の平均 → いちばん大きい k', [1, 2, 4, 6, 8, 10], [0, 0.5, 1]);
  stroke(110, 230, 190); strokeWeight(2); polyline(res.slice(1).map((r) => [gX(g2, r.k), gY(g2, r.silMean)]));
  noStroke(); res.slice(1).forEach((r) => { fill(r.k === sK ? color(110, 230, 190) : r.k === showK ? 255 : 120); circle(gX(g2, r.k), gY(g2, r.silMean), r.k === sK ? 14 : 7); });
  // ---- 各点のシルエット（クラスタごとに大きい順）
  let bx = gx + gw + 60, bw = width - bx - 40, by = 120, bh = height - 230, order = data.pts.map((_, i) => i).sort((a, b) => e.labels[a] - e.labels[b] || e.sil[b] - e.sil[a]);
  let x0 = bx + bw * 0.3;
  stroke(120); line(x0, by, x0, by + bh);
  noStroke(); order.forEach((i, r) => { fill(palC(e.labels[i])); let y = by + (r / order.length) * bh, wv = Math.max(e.sil[i], -0.44) * bw * 0.68; rect(Math.min(x0, x0 + wv), y, Math.abs(wv), Math.max(1, bh / order.length)); });
  stroke(255, 255, 255, 120); let xm = x0 + e.silMean * bw * 0.68; line(xm, by, xm, by + bh);
  noStroke(); fill(205); textSize(13); textAlign(LEFT, BASELINE); text('各点の s_i（k = ' + showK + '）', bx, by - 10);
  textAlign(CENTER, TOP); fill(165); text('−0.3', x0 - 0.3 * bw * 0.68, by + bh + 4); text('0', x0, by + bh + 4); text('1', x0 + bw * 0.68, by + bh + 4);
  let neg = e.sil.filter((v) => v < 0).length;
  // ---- 文字
  textAlign(LEFT, BASELINE); fill(240); textSize(20);
  text('k の選び方　本当のグループ数 = ' + trueG + '　エルボー法 → k = ' + eK + (eK === trueG ? ' ✓' : ' ✗') + '　シルエット → k = ' + sK + (sK === trueG ? ' ✓' : ' ✗'), 40, 40);
  fill(170); textSize(15); text('← → 本当のグループ数　↑↓ 表示する k　D 広がり（' + ['小', '中', '大'][spread] + '）　R 新しいデータ　クリック 点を足す', 40, 66);
  fill(215); textSize(15);
  text('k = ' + showK + '：J = ' + e.J.toFixed(2) + '　シルエットの平均 = ' + e.silMean.toFixed(3) + '　負の点 ' + neg + ' 個', 40, view.y + view.h + 34);
  fill(150); textSize(13);
  text('J は k を増やすと必ず減る（k + 1 は k の答え + 中心 1 つから始めるので）。だから「J がいちばん小さい k」は選べない。広がりを「大」にすると、どちらの方法も迷いはじめる', 40, view.y + view.h + 60, view.w + 40);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { if (view && inBox(view, mouseX, mouseY)) { data.pts.push([invX(view, mouseX), invY(view, mouseY)]); data.truth.push(0); res = analyse(data.pts, 3); } }
function keyPressed() {
  if (key === RIGHT_ARROW || key === LEFT_ARROW) { trueG = clampv(trueG + (key === RIGHT_ARROW ? 1 : -1), 1, 8); newData(); }
  if (key === UP_ARROW || key === DOWN_ARROW) showK = clampv(showK + (key === UP_ARROW ? 1 : -1), 1, KMAX);
  if (key === 'd' || key === 'D') { spread = (spread + 1) % 3; newData(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let line4 = [[0, 0], [1, 0], [10, 0], [11, 0]], s4 = silhouetteVals(line4, [0, 0, 1, 1]);
  check('手で計算できる例：0, 1 | 10, 11 で s(0) = 1 − 1/10.5 = ' + (1 - 1 / 10.5).toFixed(4), near(s4[0], 1 - 1 / 10.5, 1e-12) && near(s4[1], 1 - 1 / 9.5, 1e-12));
  seedRng(5);
  let rp = Array.from({ length: 60 }, () => [rnd(), rnd()]), inR = true;
  for (let t = 0; t < 10; t++) { let lab = rp.map(() => rndInt(0, 3)), s = silhouetteVals(rp, lab); if (!s.every((v) => v >= -1 && v <= 1)) inR = false; }
  check('どんな分け方でも s_i は −1〜1（でたらめなラベル 10 通り）', inR);
  let okG = true, okE = 0, msg = [];
  for (let g = 2; g <= 6; g++) { let d = makeGroups(g, 0, 40 + g, 120), r = analyse(d.pts, 9, 2); if (silK(r) !== g) okG = false; if (elbowK(r) === g) okE++; msg.push(silK(r)); }
  check('はっきり離れたかたまり（g = 2〜6）では、シルエットの平均が本当の g でいちばん大きい：' + msg.join(','), okG);
  let r4 = analyse(makeGroups(4, 1, 33, 120).pts, 9, 2);
  check('J は k について減る一方（k = 1〜10）', r4.every((e, i) => i === 0 || e.J <= r4[i - 1].J + 1e-9));
  check('エルボー法も g = 2〜6 のうち 3 つ以上で当たる（' + okE + ' / 5）', okE >= 3);
  let one = silhouetteVals([[0, 0], [1, 1], [5, 5]], [0, 0, 1]);
  check('1 点だけのクラスタの s は 0、全部 1 つのクラスタなら全部 0', one[2] === 0 && silhouetteVals(rp, rp.map(() => 0)).every((v) => v === 0));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ← → で本当のグループ数を 2〜8 に変えて、エルボー法とシルエットのどちらがよく当たるか数えよう
// 2. D で広がりを「大」にすると、かたまりが重なる。どちらの方法が先に外れる？
// 3. ↑↓ で k を本当の数より大きくすると、右の棒（各点の s_i）はどうなる？ 負の点はどこにある？
// 4. 本当のグループ数を 1 にすると？ シルエットは k ≥ 2 でしか計算できない（だから 1 は選べない）
// 5. NPTS を 600 にすると計算が重くなる。シルエットは全部の点の組の距離（n² 個）を使うから

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
// ---- 合成データ（種つき）。どれも { pts, truth（正解のグループ番号）, k（正解のグループ数）} を返す
// blob = { n, c: [中心 x, y], sd: [長い向きの標準偏差, 短い向き], rot: 傾き（ラジアン）}
function makeBlobs(specs) {
  let pts = [], truth = [];
  specs.forEach((s, k) => {
    let cr = Math.cos(s.rot || 0), sr = Math.sin(s.rot || 0);
    for (let i = 0; i < s.n; i++) { let a = gauss() * s.sd[0], b = gauss() * s.sd[1]; pts.push([s.c[0] + cr * a - sr * b, s.c[1] + sr * a + cr * b]); truth.push(k); }
  });
  return { pts, truth, k: specs.length };
}
function makeMoons(n, noise) {         // 2 つの三日月（かみ合った半円）
  let pts = [], truth = [];
  for (let i = 0; i < n; i++) {
    let k = i % 2, t = rnd() * Math.PI, x = k ? 1 - Math.cos(t) : Math.cos(t), y = k ? 0.5 - Math.sin(t) : Math.sin(t);
    pts.push([(x - 0.5) * 1.6 + gauss() * noise, (y - 0.25) * 1.6 + gauss() * noise]); truth.push(k);
  }
  return { pts, truth, k: 2 };
}
function makeCircles(n, noise, inner) { // 同心円（外の輪と内の輪。点の数は輪の長さに比例）
  let pts = [], truth = [], nOut = Math.round((n * 1.3) / (1.3 + inner));
  for (let i = 0; i < n; i++) { let k = i < nOut ? 0 : 1, t = rnd() * 2 * Math.PI, r = k ? inner : 1.3; pts.push([r * Math.cos(t) + gauss() * noise, r * Math.sin(t) + gauss() * noise]); truth.push(k); }
  return { pts, truth, k: 2 };
}
const DATA_JA = { blobs: 'かたまり', moons: '三日月', circles: '同心円', aniso: '細長い', density: '密度がちがう', sizes: '大きさがちがう', noise: 'かたまり + 外れ値', chain: '鎖でつながる' };
function makeDataset(kind, n, seed) {
  seedRng(seed);
  if (kind === 'moons') return makeMoons(n, 0.07);
  if (kind === 'circles') return makeCircles(n, 0.05, 0.55);
  if (kind === 'aniso') { let m = Math.floor(n / 3); return makeBlobs([{ n: m, c: [-0.6, 0.9], sd: [0.9, 0.1], rot: 0.5 }, { n: m, c: [0, 0], sd: [0.9, 0.1], rot: 0.5 }, { n: n - 2 * m, c: [0.6, -0.9], sd: [0.9, 0.1], rot: 0.5 }]); }
  if (kind === 'density') { let m = Math.floor(n * 0.45); return makeBlobs([{ n: m, c: [-0.9, 0.3], sd: [0.12, 0.12] }, { n: m, c: [-0.3, 0.3], sd: [0.12, 0.12] }, { n: n - 2 * m, c: [0.9, -0.2], sd: [0.65, 0.65] }]); }
  if (kind === 'sizes') { let m = Math.floor(n * 0.12); return makeBlobs([{ n: n - 2 * m, c: [-0.5, 0], sd: [0.6, 0.6] }, { n: m, c: [0.85, 0.75], sd: [0.1, 0.1] }, { n: m, c: [0.85, -0.75], sd: [0.1, 0.1] }]); }
  if (kind === 'chain') {
    let m = Math.floor(n * 0.4), d = makeBlobs([{ n: m, c: [-1.2, 0], sd: [0.25, 0.25] }, { n: m, c: [1.2, 0], sd: [0.25, 0.25] }]), rest = n - 2 * m;
    for (let i = 0; i < rest; i++) { d.pts.push([-0.8 + (1.6 * (i + 0.5)) / rest, 0.04 * gauss()]); d.truth.push(i < rest / 2 ? 0 : 1); }
    return d;
  }
  let m = Math.floor(n / 3), d = makeBlobs([{ n: m, c: [-1, 0.7], sd: [0.25, 0.25] }, { n: m, c: [1, 0.6], sd: [0.3, 0.22], rot: 0.4 }, { n: n - 2 * m, c: [0, -0.9], sd: [0.28, 0.28] }]);
  if (kind === 'noise') { let q = Math.floor(n * 0.08); for (let i = 0; i < q; i++) { d.pts.push([-2 + 4 * rnd(), -1.8 + 3.6 * rnd()]); d.truth.push(-1); } }
  return d;
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
// ---- シルエット係数 s_i = (b − a) / max(a, b)（ちょうど O(n²)）
//   a = 同じクラスタの点までの平均距離、b = いちばん近い別クラスタの点までの平均距離。1 点だけのクラスタは s = 0
function silhouetteVals(pts, labels) {
  let n = pts.length, k = 0; for (let l of labels) k = Math.max(k, l + 1);
  let cnt = new Array(k).fill(0); for (let l of labels) if (l >= 0) cnt[l]++;
  let out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = new Array(k).fill(0), own = labels[i];
    if (own < 0 || cnt[own] <= 1) continue;               // ノイズ（−1）と 1 点だけのクラスタは 0
    for (let j = 0; j < n; j++) if (j !== i && labels[j] >= 0) sum[labels[j]] += edist(pts[i], pts[j]);
    let a = sum[own] / (cnt[own] - 1), b = Infinity;
    for (let c = 0; c < k; c++) if (c !== own && cnt[c] > 0) b = Math.min(b, sum[c] / cnt[c]);
    if (b === Infinity) continue;
    let m = Math.max(a, b); out[i] = m > 0 ? (b - a) / m : 0;
  }
  return out;
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
