// ============================================
// 06 DBSCAN ─ 「点が混んでいるところ」をつないでクラスタにする（密度にもとづくクラスタリング）
//   半径 ε の円の中に minPts 個以上（自分も数える）点がある = コア点（大きい丸）
//   コア点の円の中にあるけれど自分はコアでない = 境界点（輪）、どのコア点の円にも入らない = ノイズ（灰色の ×）
//   コア点から ε 以内のコア点へ、次々に広がって 1 つのクラスタになる（アニメーション）。k を決めなくてよい・形は自由・外れ値はノイズに
//   近くの点は「ε の大きさのマス目」に分けて、周りの 3 × 3 マスだけ探す（全部の組を調べなくてよい）
// スライダ / ← → ε / ↑↓ minPts / D データ / スペース 広がりを再生 / R 新しいデータ / クリック 点を足す
// ============================================

const NPTS = 300;                      // ★ 点の数
const DKINDS = ['moons', 'noise', 'density', 'circles'];
let data, dataNo = 0, seedD = 61, res, km, reveal = 0, view, sEps, sMin;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR);
  sEps = makeSlider(width - 360, 150, 300, 0.05, 0.7, 0.34, 'ε（半径）', 2); sMin = makeSlider(width - 360, 215, 300, 1, 20, 6, 'minPts', 0);
  selfTest(); newData();
}
function moonsNoise(n, seed) {         // 三日月 + まばらな外れ値（正解 −1）
  let d = makeDataset('moons', n, seed);
  for (let i = 0; i < Math.floor(n * 0.06); i++) { d.pts.push([-2.4 + 4.8 * rnd(), -1.6 + 3.2 * rnd()]); d.truth.push(-1); }
  return d;
}
function newData() {
  let kd = DKINDS[dataNo]; data = kd === 'moons' ? moonsNoise(NPTS, seedD) : makeDataset(kd, NPTS, seedD);
  seedRng(3); let kTrue = new Set(data.truth.filter((v) => v >= 0)).size; km = kmeansBest(data.pts, Math.max(1, kTrue), 10, true, 100);
  rerun();
}
function rerun() { res = dbscan(data.pts, sEps.val, sMin.val); reveal = 0; }

function draw() {
  background(22, 24, 34);
  view = fitView(40, 100, width - 480, height - 190, 0, 0, 4.4);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  reveal = Math.min(res.order.length, reveal + 3);
  let shown = new Array(data.pts.length).fill(false); for (let r = 0; r < reveal; r++) shown[res.order[r]] = true;
  let px = (gX(view, 1) - gX(view, 0)) * sEps.val;
  // いま広がっている点の ε の円
  if (reveal < res.order.length && reveal > 0) { let p = data.pts[res.order[reveal - 1]]; noFill(); stroke(255, 240, 150, 160); strokeWeight(1.5); circle(gX(view, p[0]), gY(view, p[1]), 2 * px); }
  // マウスの近くの点の ε の円（コアかどうか確かめる）
  if (inBox(view, mouseX, mouseY)) { noFill(); stroke(255, 255, 255, 70); strokeWeight(1); circle(mouseX, mouseY, 2 * px); }
  for (let i = 0; i < data.pts.length; i++) {
    let x = gX(view, data.pts[i][0]), y = gY(view, data.pts[i][1]), l = res.labels[i];
    if (l < 0) { stroke(130, 130, 145); strokeWeight(1.5); line(x - 4, y - 4, x + 4, y + 4); line(x - 4, y + 4, x + 4, y - 4); continue; }
    if (!shown[i]) { noStroke(); fill(90, 90, 105); circle(x, y, 6); continue; }
    if (res.core[i]) { noStroke(); fill(palC(l)); circle(x, y, 10); } else { noFill(); stroke(palC(l)); strokeWeight(2); circle(x, y, 9); }
  }
  // ---- 右のパネル
  drawSlider(sEps); drawSlider(sMin);
  let nCore = res.core.filter((v) => v).length, nNoise = res.labels.filter((v) => v < 0).length, bx = width - 360;
  noStroke(); textAlign(LEFT, BASELINE); fill(220); textSize(15);
  text('クラスタ ' + res.nClusters + ' 個\nコア点 ' + nCore + '　境界点 ' + (data.pts.length - nCore - nNoise) + '　ノイズ ' + nNoise, bx, 270);
  let aD = ariScore(res.labels, data.truth), aK = ariScore(km.labels, data.truth);
  fill(110, 230, 190); text('DBSCAN の ARI（正解と）= ' + aD.toFixed(3), bx, 330);
  fill(255, 160, 150); text('k-means の ARI = ' + aK.toFixed(3), bx, 354);
  let v2 = fitView(bx, 390, 300, 220, 0, 0, 4.6);
  noFill(); stroke(70); strokeWeight(1); rect(v2.x, v2.y, v2.w, v2.h); drawPts(v2, data.pts, km.labels, 4);
  noStroke(); fill(170); textSize(12); text('くらべる：k-means（k = 正解の数、ノイズも必ずどこかへ）', v2.x, v2.y + v2.h + 18, 300);
  // ---- 文字
  fill(240); textSize(20); textAlign(LEFT, BASELINE);
  text('DBSCAN　ε = ' + sEps.val.toFixed(2) + '　minPts = ' + sMin.val + '　→ クラスタ ' + res.nClusters + ' 個、ノイズ ' + nNoise + ' 点', 40, 40);
  fill(170); textSize(15); text('スライダ または ← → ε　↑↓ minPts　D データ（' + DATA_JA[DKINDS[dataNo]] + '）　スペース 広がりを再生　R 新しいデータ　クリック 点を足す', 40, 66);
  fill(150); textSize(13); text('● コア点　○ 境界点　× ノイズ。白い円 = マウスの位置の ε。ε が小さすぎるとノイズだらけ、大きすぎると全部つながって 1 つになる', 40, height - 50, view.w);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() {
  if (sliderPress(sEps, mouseX, mouseY) || sliderPress(sMin, mouseX, mouseY)) { rerun(); return; }
  if (view && inBox(view, mouseX, mouseY)) { let p = [invX(view, mouseX), invY(view, mouseY)]; data.pts.push(p); data.truth.push(-1); km.labels.push(nearestCenter(p, km.centers)); rerun(); reveal = res.order.length; }
}
function mouseDragged() { if (sliderDrag(sEps, mouseX) || sliderDrag(sMin, mouseX)) { rerun(); reveal = res.order.length; } }
function mouseReleased() { sEps.drag = sMin.drag = false; }
function keyPressed() {
  if (key === RIGHT_ARROW || key === LEFT_ARROW) { sEps.val = clampv(sEps.val + (key === RIGHT_ARROW ? 0.01 : -0.01), sEps.lo, sEps.hi); rerun(); }
  if (key === UP_ARROW || key === DOWN_ARROW) { sMin.val = clampv(sMin.val + (key === UP_ARROW ? 1 : -1), sMin.lo, sMin.hi); rerun(); }
  if (key === 'd' || key === 'D') { dataNo = (dataNo + 1) % DKINDS.length; newData(); }
  if (key === ' ') reveal = 0;
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
// 答え合わせ用：全部の組の距離（O(n²)）→ コア点 → コア点どうしのつながり（小さい番号から）→ 境界点はいちばん小さい番号のクラスタへ
function dbscanBrute(pts, eps, minPts) {
  let n = pts.length, nb = pts.map((p) => pts.map((q, j) => j).filter((j) => edist(p, pts[j]) <= eps)), core = nb.map((l) => l.length >= minPts), lab = new Array(n).fill(-1), c = 0;
  for (let i = 0; i < n; i++) {
    if (!core[i] || lab[i] >= 0) continue;
    let st = [i]; lab[i] = c;
    while (st.length) { let v = st.pop(); for (let j of nb[v]) if (core[j] && lab[j] < 0) { lab[j] = c; st.push(j); } }
    c++;
  }
  for (let i = 0; i < n; i++) if (!core[i]) { let best = -1; for (let j of nb[i]) if (core[j] && (best < 0 || lab[j] < best)) best = lab[j]; lab[i] = best; }
  return { labels: lab, core };
}
function selfTest() {
  selfTestResults = [];
  let same = true, coreOk = true, nbOk = true, joinOk = true;
  for (let t = 0; t < 8; t++) {
    let d = t % 2 ? moonsNoise(160, 600 + t) : makeDataset(DKINDS[t % 4], 160, 600 + t), eps = 0.1 + 0.05 * (t % 5), mp = 3 + (t % 6), r = dbscan(d.pts, eps, mp), b = dbscanBrute(d.pts, eps, mp);
    if (r.labels.some((v, i) => v !== b.labels[i])) same = false;
    d.pts.forEach((p, i) => {
      let cnt = d.pts.filter((q) => edist(p, q) <= eps).length;
      if (r.core[i] !== cnt >= mp) coreOk = false;
      let coreNb = d.pts.map((q, j) => j).filter((j) => r.core[j] && edist(p, d.pts[j]) <= eps);
      if (r.labels[i] < 0 && coreNb.length > 0) nbOk = false;
      if (r.labels[i] >= 0 && !coreNb.some((j) => r.labels[j] === r.labels[i])) nbOk = false;
      if (r.core[i]) for (let j of coreNb) if (r.labels[j] !== r.labels[i]) joinOk = false;
    });
  }
  check('マス目を使った DBSCAN = 全部の組を調べる DBSCAN（8 通りのデータと ε・minPts でラベルが完全に一致）', same);
  check('コア点 ⇔ 半径 ε に minPts 個以上（総当たりで数えた数）', coreOk);
  check('ノイズの近くにコア点はない。クラスタの点はどれも、同じクラスタのコア点の ε 以内', nbOk);
  check('ε 以内にある 2 つのコア点は、必ず同じクラスタ', joinOk);
  let mo = makeDataset('moons', NPTS, 61), r = dbscan(mo.pts, 0.34, 6); seedRng(2); let k2 = kmeansBest(mo.pts, 2, 10, true, 100);
  let aD = ariScore(r.labels, mo.truth), aK = ariScore(k2.labels, mo.truth);
  check('三日月：DBSCAN（ε = 0.34, minPts = 6）の ARI ' + aD.toFixed(3) + ' ≥ 0.95、k-means は ' + aK.toFixed(3) + ' < 0.6', aD >= 0.95 && aK < 0.6);
  let one = dbscan(mo.pts, 100, 5), all = dbscan(mo.pts, 0.1, 1);
  check('ε がとても大きいと 1 クラスタ、minPts = 1 ならノイズ 0（全部コア点）', one.nClusters === 1 && all.labels.every((v) => v >= 0) && all.core.every((v) => v));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ε を少しずつ大きくして、クラスタの数が 多い → 2 → 1 と変わるところを探そう
// 2. minPts を大きくすると、境界点とノイズはどうなる？
// 3. D で「密度がちがう」にすると、1 つの ε では両方のかたまりをうまく取れない。これが DBSCAN の弱点（→ OPTICS・HDBSCAN）
// 4. 同心円（D）は ε と minPts をどうすれば分けられる？
// 5. 何もないところをクリックして点を足すと、ノイズ（×）になる。たくさん足してコア点にしてみよう

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
// ---- DBSCAN：半径 eps の中に minPts 個以上（自分も数える）ある点 = コア点。コア点どうしが eps でつながって 1 つのクラスタ
//   ラベル −1 = ノイズ。近くの点は「eps の大きさのマス目」で探す（周り 3 × 3 マスだけ見ればよい）
function gridKey(cx, cy) { return cx * 100003 + cy; }
function buildGrid(pts, eps) {
  let g = new Map();
  pts.forEach((p, i) => { let key = gridKey(Math.floor(p[0] / eps), Math.floor(p[1] / eps)); if (!g.has(key)) g.set(key, []); g.get(key).push(i); });
  return g;
}
function neighborsGrid(g, pts, i, eps) {
  let p = pts[i], cx = Math.floor(p[0] / eps), cy = Math.floor(p[1] / eps), out = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { let c = g.get(gridKey(cx + dx, cy + dy)); if (c) for (let j of c) if (sqd(p, pts[j]) <= eps * eps) out.push(j); }
  return out.sort((a, b) => a - b);
}
function dbscan(pts, eps, minPts) {    // order = 広がっていく順（アニメーション用）
  let n = pts.length, e = Math.max(1e-6, eps), g = buildGrid(pts, e), nb = pts.map((_, i) => neighborsGrid(g, pts, i, e));
  let core = nb.map((l) => l.length >= minPts), labels = new Array(n).fill(-2), order = [], c = 0;
  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2 || !core[i]) continue;
    labels[i] = c; order.push(i); let q = [i];
    for (let h = 0; h < q.length; h++) for (let j of nb[q[h]]) {
      if (labels[j] >= 0) continue;
      labels[j] = c; order.push(j); if (core[j]) q.push(j);
    }
    c++;
  }
  for (let i = 0; i < n; i++) if (labels[i] === -2) labels[i] = -1;
  return { labels, core, order, nClusters: c, nb };
}
// ---- 正解との一致：分割表、純度、調整ランド指数（ARI）、正規化相互情報量（NMI）。ラベル −1（ノイズ）も 1 つのグループとして数える
function contingency(a, b) {
  let ra = [...new Set(a)].sort((x, y) => x - y), cb = [...new Set(b)].sort((x, y) => x - y), ia = new Map(ra.map((v, i) => [v, i])), ib = new Map(cb.map((v, i) => [v, i]));
  let M = ra.map(() => new Array(cb.length).fill(0));
  for (let i = 0; i < a.length; i++) M[ia.get(a[i])][ib.get(b[i])]++;
  return { M, ra, cb };
}
function comb2(x) { return (x * (x - 1)) / 2; }
function ariScore(a, b) {
  let { M } = contingency(a, b), n = a.length, sij = 0, sa = 0, sb = 0, colS = new Array(M[0].length).fill(0);
  for (let r of M) { let rs = 0; r.forEach((v, j) => { sij += comb2(v); rs += v; colS[j] += v; }); sa += comb2(rs); }
  for (let v of colS) sb += comb2(v);
  let expv = (sa * sb) / Math.max(1, comb2(n)), maxv = (sa + sb) / 2;
  return maxv - expv === 0 ? 1 : (sij - expv) / (maxv - expv);
}
function nmiScore(a, b) {              // NMI = 2·I(A; B) / (H(A) + H(B))
  let { M } = contingency(a, b), n = a.length, rs = M.map((r) => r.reduce((s, v) => s + v, 0)), cs = M[0].map((_, j) => M.reduce((s, r) => s + r[j], 0));
  let H = (arr) => -arr.reduce((s, v) => s + (v > 0 ? (v / n) * Math.log(v / n) : 0), 0), mi = 0;
  M.forEach((r, i) => r.forEach((v, j) => { if (v > 0) mi += (v / n) * Math.log((n * v) / (rs[i] * cs[j])); }));
  let hs = H(rs) + H(cs); return hs === 0 ? 1 : clampv((2 * mi) / hs, 0, 1);
}
function purityScore(pred, truth) { let { M } = contingency(pred, truth); return M.reduce((s, r) => s + Math.max(...r), 0) / pred.length; }
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
// ---- かんたんなスライダ（ドラッグで値を変える）
function makeSlider(x, y, w, lo, hi, val, name, digits) { return { x, y, w, lo, hi, val, name, digits: digits === undefined ? 2 : digits, drag: false }; }
function drawSlider(s) {
  let u = (s.val - s.lo) / (s.hi - s.lo);
  stroke(90); strokeWeight(4); line(s.x, s.y, s.x + s.w, s.y);
  stroke(176, 140, 255); line(s.x, s.y, s.x + u * s.w, s.y);
  noStroke(); fill(s.drag ? 255 : 220); circle(s.x + u * s.w, s.y, 16);
  fill(200); textSize(14); textAlign(LEFT, BASELINE); text(s.name + ' = ' + s.val.toFixed(s.digits), s.x, s.y - 12);
}
function sliderPress(s, mx, my) { if (Math.abs(my - s.y) < 14 && mx > s.x - 10 && mx < s.x + s.w + 10) { s.drag = true; sliderDrag(s, mx); return true; } return false; }
function sliderDrag(s, mx) { if (!s.drag) return false; let v = s.lo + clampv((mx - s.x) / s.w, 0, 1) * (s.hi - s.lo); if (s.digits === 0) v = Math.round(v); s.val = v; return true; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
