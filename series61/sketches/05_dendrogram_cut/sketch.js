// ============================================
// 05 デンドログラムと切る高さ ─ 04 の合体の記録を「木」にする。縦 = 合体した高さ（グループ間の距離）
//   横の線（切る高さ h）で木を切ると、その下にある枝の数 = クラスタの数。長い縦の枝 = はっきり離れたグループ
//   コーフェン距離 c_ij = i と j が初めて同じグループになった高さ。もとの距離 d_ij との相関（コーフェン相関係数）が
//   1 に近いほど、木がもとの距離をよく保っている。単連結の木はシリーズ 9 の 13（H0 のパーシステンス）と同じもの
// マウスを木の上で上下 / ↑↓ 切る高さ / 1〜4 連結法 / D データ / R 新しいデータ / クリック（左の図）点を足す
// ============================================

const NPTS = 60;                       // ★ 点の数
const DKINDS = ['blobs', 'noise', 'chain', 'moons'];
let data, method = 2, merges = [], order = [], coph = [], cutH = 0.8, dataNo = 0, seedD = 51, view, tree, cut = null;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function newData() { data = makeDataset(DKINDS[dataNo], NPTS, seedD); rebuild(); }
function rebuild() {
  merges = agglomerate(data.pts, method); order = leafOrder(merges, data.pts.length);
  coph = [0, 1, 2, 3].map((m) => copheneticCorr(data.pts, agglomerate(data.pts, m)));
  cutH = clampv(cutH, 0, merges[merges.length - 1].h * 1.02); cut = null;
}
// ★ 木の形：葉の横位置 = 並び順、つなぎ目 = 子の真ん中、高さ = 合体の高さ
function layout(n) {
  let xs = new Array(2 * n - 1), hs = new Array(2 * n - 1).fill(0);
  order.forEach((leaf, r) => (xs[leaf] = r));
  merges.forEach((e, t) => { xs[n + t] = (xs[e.a] + xs[e.b]) / 2; hs[n + t] = e.h; });
  return { xs, hs };
}

function draw() {
  background(22, 24, 34);
  let n = data.pts.length;
  if (!cut || cut.h !== cutH) { let lab = cutTreeH(merges, n, cutH), k = new Set(lab).size; cut = { h: cutH, lab, k, sil: k >= 2 && k < n ? meanOf(silhouetteVals(data.pts, lab)) : 0 }; }
  view = fitView(40, 100, width * 0.36, height * 0.62, 0, 0, 5.0);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  drawPts(view, data.pts, cut.lab, 9);
  // ---- デンドログラム
  tree = { x: view.x + view.w + 80, y: 110, w: width - view.x - view.w - 120, h: height - 260, x0: -0.5, x1: n - 0.5, y0: 0, y1: merges[n - 2].h * 1.08 };
  let L = layout(n), col = new Array(2 * n - 1).fill(-1);
  for (let i = 0; i < n; i++) col[i] = cut.lab[i];
  merges.forEach((e, t) => { col[n + t] = e.h <= cutH && col[e.a] === col[e.b] ? col[e.a] : -1; });
  merges.forEach((e, t) => {
    let p = n + t, xa = gX(tree, L.xs[e.a]), xb = gX(tree, L.xs[e.b]), yp = gY(tree, e.h);
    strokeWeight(2);
    for (let c of [e.a, e.b]) { stroke(col[p] >= 0 ? palC(col[p]) : color(170, 170, 185)); if (col[c] >= 0 && col[p] < 0) stroke(palC(col[c])); line(gX(tree, L.xs[c]), gY(tree, L.hs[c]), gX(tree, L.xs[c]), yp); }
    stroke(col[p] >= 0 ? palC(col[p]) : color(170, 170, 185)); line(xa, yp, xb, yp);
  });
  stroke(255, 100, 120); strokeWeight(2); drawingContext.setLineDash([8, 6]); line(tree.x - 10, gY(tree, cutH), tree.x + tree.w, gY(tree, cutH)); drawingContext.setLineDash([]);
  noStroke(); fill(255, 130, 150); textSize(14); textAlign(RIGHT, CENTER); text('h = ' + cutH.toFixed(2), tree.x - 14, gY(tree, cutH));
  textAlign(RIGHT, CENTER); fill(160); textSize(12); for (let v of [0, tree.y1 / 2, tree.y1]) text(v.toFixed(2), tree.x - 14, gY(tree, v) + (v === 0 ? 0 : 14));
  // ---- コーフェン相関の表
  let ty = view.y + view.h + 36;
  textAlign(LEFT, BASELINE); fill(215); textSize(15); text('コーフェン相関係数（木がもとの距離をどれだけ保つか）', 40, ty);
  for (let m = 0; m < 4; m++) {
    let y = ty + 26 + m * 24; fill(m === method ? color(200, 180, 255) : 180);
    text((m + 1) + ' ' + LINK_JA[m], 40, y); text(coph[m].toFixed(3), 170, y);
    fill(m === method ? color(176, 140, 255) : color(90, 90, 110)); rect(230, y - 12, Math.max(0, coph[m]) * 160, 12);
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); fill(240); textSize(20);
  text('デンドログラムと切る高さ　' + LINK_JA[method] + '　h = ' + cutH.toFixed(3) + ' → クラスタ ' + cut.k + ' 個　シルエット ' + cut.sil.toFixed(3) + '　ARI（正解と）' + ariScore(cut.lab, data.truth).toFixed(3), 40, 40);
  fill(170); textSize(15); text('木の上でマウスを上下 / ↑↓ 切る高さ　1〜4 連結法　D データ（' + DATA_JA[DKINDS[dataNo]] + '）　R 新しいデータ　クリック（左）点を足す', 40, 66);
  fill(150); textSize(13); text('赤い破線より下でつながった枝 = 1 つのクラスタ（同じ色）。灰色 = 破線より上の合体。縦に長い枝のところで切ると、h を少し動かしても答えが変わらない', tree.x, tree.y + tree.h + 40, tree.w);
  drawSelfTest(width - 170, height - 12);
}

function mouseMoved() { if (tree && inBox(tree, mouseX, mouseY)) cutH = clampv(invY(tree, mouseY), 0, tree.y1); }
function mouseDragged() { mouseMoved(); }
function mousePressed() { if (view && inBox(view, mouseX, mouseY)) { data.pts.push([invX(view, mouseX), invY(view, mouseY)]); data.truth.push(0); rebuild(); } }
function keyPressed() {
  let top = merges[merges.length - 1].h;
  if (key === UP_ARROW) cutH = Math.min(top * 1.05, cutH + top / 60);
  if (key === DOWN_ARROW) cutH = Math.max(0, cutH - top / 60);
  if (key.length === 1 && '1234'.includes(key)) { method = +key - 1; rebuild(); }
  if (key === 'd' || key === 'D') { dataNo = (dataNo + 1) % DKINDS.length; newData(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(55);
  let pts = Array.from({ length: 28 }, () => [rnd() * 3, rnd() * 2]), n = pts.length, cc = [0, 1, 2, 3].map((m) => copheneticCorr(pts, agglomerate(pts, m)));
  check('コーフェン相関係数は 4 つとも −1〜1 で有限：' + cc.map((v) => v.toFixed(3)).join(', '), cc.every((v) => isFinite(v) && v >= -1 && v <= 1));
  let ultra = true;
  for (let m = 0; m < 4; m++) {
    let C = copheneticMatrix(agglomerate(pts, m), n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) if (C[i * n + j] > Math.max(C[i * n + k], C[k * n + j]) + 1e-12) ultra = false;
  }
  check('コーフェン距離は超距離：c_ij ≤ max(c_ik, c_kj)（全部の 3 点の組）', ultra);
  let mg = agglomerate(pts, 2), kOk = true;
  for (let t = 0; t < 40; t++) { let h = rnd() * mg[n - 2].h * 1.1, lab = cutTreeH(mg, n, h), cnt = mg.filter((e) => e.h <= h).length; if (new Set(lab).size !== n - cnt || ariScore(lab, cutTreeK(mg, n, n - cnt)) !== 1) kOk = false; }
  check('高さ h で切ったクラスタの数 = n − (h 以下の合体の数)、k で切った結果と同じ', kOk);
  let sl = agglomerate(pts, 0), ccOk = true;
  for (let t = 0; t < 15; t++) {
    let h = rnd() * sl[n - 2].h, par = pts.map((_, i) => i), root = (x) => (par[x] === x ? x : (par[x] = root(par[x])));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (edist(pts[i], pts[j]) <= h) par[root(i)] = root(j);
    if (ariScore(cutTreeH(sl, n, h), pts.map((_, i) => root(i))) !== 1) ccOk = false;
  }
  check('単連結を高さ h で切る = 「距離 h 以下を線でつないだグラフ」の連結成分（総当たり）', ccOk);
  let ordOk = true;
  for (let m = 0; m < 4; m++) {
    let g = agglomerate(pts, m), od = leafOrder(g, n);
    if (new Set(od).size !== n) ordOk = false;
    for (let k = 1; k <= n; k++) { let lab = cutTreeK(g, n, k), seq = od.map((i) => lab[i]), seen = new Set(); for (let r = 0; r < n; r++) { if (r > 0 && seq[r] !== seq[r - 1] && seen.has(seq[r])) ordOk = false; seen.add(seq[r]); } }
  }
  check('葉の並びは全部の点の並べかえで、どの k でもクラスタが横にひと続き（枝が交差しない）', ordOk);
  let D = pts.map((p) => pts.map((q) => edist(p, q)));
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) D[i][j] = Math.min(D[i][j], Math.max(D[i][k], D[k][j]));
  let Cs = copheneticMatrix(sl, n);
  check('単連結のコーフェン距離 = 道のりの中のいちばん長い一歩を最小にした値（ミニマックス距離、総当たり）', D.every((r, i) => r.every((v, j) => i === j || Math.abs(v - Cs[i * n + j]) < 1e-12)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 木の上でマウスをゆっくり上下させ、クラスタの数がどこで変わるか見よう。長い縦の枝はどこ？
// 2. 1〜4 で連結法を変え、コーフェン相関係数がいちばん大きいのはどれか確かめよう（群平均が大きくなりやすい）
// 3. D で「かたまり + 外れ値」に。単連結では外れ値が最後まで 1 人ぼっちの枝になる
// 4. シルエット（上の数字）がいちばん大きくなる高さを探そう。02 の k の選び方とくらべて
// 5. シリーズ 9 の 13 クラスタの木は、単連結の木を「パーシステンス」として見たもの

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
// ---- 凝集型クラスタリング（ランス-ウィリアムズの更新式）。merges[t] = { a, b（合体した 2 つの番号）, h（高さ）, size }
//   葉 = 0〜n−1、t 番目の合体でできたクラスタ = n + t。ウォード法は距離² で更新し、高さ = √（更新した値）
const LINK_JA = ['単連結', '完全連結', '群平均', 'ウォード法'];
function agglomerate(pts, method) {    // method: 0 単連結 / 1 完全連結 / 2 群平均 / 3 ウォード法
  let n = pts.length, Dm = new Float64Array(n * n), size = new Array(n).fill(1), id = pts.map((_, i) => i), act = new Array(n).fill(true), merges = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Dm[i * n + j] = method === 3 ? sqd(pts[i], pts[j]) : edist(pts[i], pts[j]);
  for (let t = 0; t < n - 1; t++) {
    let bi = -1, bj = -1, bd = Infinity;
    for (let i = 0; i < n; i++) if (act[i]) for (let j = i + 1; j < n; j++) if (act[j] && Dm[i * n + j] < bd) { bd = Dm[i * n + j]; bi = i; bj = j; }
    let ni = size[bi], nj = size[bj];
    merges.push({ a: id[bi], b: id[bj], h: method === 3 ? Math.sqrt(Math.max(0, bd)) : bd, size: ni + nj });
    for (let k = 0; k < n; k++) {
      if (!act[k] || k === bi || k === bj) continue;
      let dik = Dm[bi * n + k], djk = Dm[bj * n + k], nk = size[k], v;
      if (method === 0) v = Math.min(dik, djk);
      else if (method === 1) v = Math.max(dik, djk);
      else if (method === 2) v = (ni * dik + nj * djk) / (ni + nj);
      else v = ((ni + nk) * dik + (nj + nk) * djk - nk * bd) / (ni + nj + nk);
      Dm[bi * n + k] = Dm[k * n + bi] = v;
    }
    size[bi] = ni + nj; act[bj] = false; id[bi] = n + t;
  }
  return merges;
}
function membersOf(merges, n) {        // 番号 → 中の点のリスト
  let mem = []; for (let i = 0; i < n; i++) mem.push([i]);
  for (let m of merges) mem.push(mem[m.a].concat(mem[m.b]));
  return mem;
}
function labelsAfter(merges, n, count) { // はじめの count 回だけ合体したときのラベル（0, 1, 2… 小さい点の番号順）
  let mem = membersOf(merges, n), alive = new Set(); for (let i = 0; i < n; i++) alive.add(i);
  for (let t = 0; t < count; t++) { alive.delete(merges[t].a); alive.delete(merges[t].b); alive.add(n + t); }
  let groups = [...alive].map((c) => mem[c]).sort((p, q) => Math.min(...p) - Math.min(...q)), lab = new Array(n).fill(0);
  groups.forEach((g, k) => g.forEach((i) => (lab[i] = k)));
  return lab;
}
function cutTreeK(merges, n, k) { return labelsAfter(merges, n, clampv(n - k, 0, n - 1)); }
function cutTreeH(merges, n, h) { let c = 0; while (c < merges.length && merges[c].h <= h) c++; return labelsAfter(merges, n, c); }
function leafOrder(merges, n) {        // デンドログラムの葉の並び（枝が交差しない順）
  if (n === 1) return [0];
  let out = [], st = [2 * n - 2];
  while (st.length) { let v = st.pop(); if (v < n) out.push(v); else { let m = merges[v - n]; st.push(m.b); st.push(m.a); } }
  return out;
}
function copheneticMatrix(merges, n) { // c_ij = i と j が初めて同じクラスタになった高さ
  let mem = membersOf(merges, n), C = new Float64Array(n * n);
  merges.forEach((m) => { for (let x of mem[m.a]) for (let y of mem[m.b]) C[x * n + y] = C[y * n + x] = m.h; });
  return C;
}
function pearson(xs, ys) {
  let n = xs.length, mx = meanOf(xs), my = meanOf(ys), sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { let a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxx > 0 && syy > 0 ? clampv(sxy / Math.sqrt(sxx * syy), -1, 1) : 0;
}
function copheneticCorr(pts, merges) {  // もとの距離とコーフェン距離の相関
  let n = pts.length, C = copheneticMatrix(merges, n), xs = [], ys = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { xs.push(edist(pts[i], pts[j])); ys.push(C[i * n + j]); }
  return pearson(xs, ys);
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
