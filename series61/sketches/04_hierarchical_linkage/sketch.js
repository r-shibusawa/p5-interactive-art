// ============================================
// 04 凝集型クラスタリング ─ はじめは 1 点ずつ別のグループ。いちばん近い 2 つのグループを合体、をくり返す（n − 1 回で 1 つに）
//   「グループどうしの距離」の決め方（連結法）で結果が変わる
//   単連結 = いちばん近い点の組 / 完全連結 = いちばん遠い点の組 / 群平均 = 全部の組の平均 / ウォード法 = 合体で増える J（慣性）
//   合体のたびに全部を計算しなおさず、ランス-ウィリアムズの更新式 d(i∪j, k) = α_i d(i,k) + α_j d(j,k) + β d(i,j) + γ |d(i,k) − d(j,k)| で
//   単連結は「鎖」のように 1 点ずつつながって伸びやすい（鎖効果）。右の 4 つの小さな図 = 同じデータを 4 つの連結法で 3 つに分けた結果
// 1〜4 連結法 / スペース 再生・停止 / ← → 1 回ずつ / D データ / R 新しいデータ / クリック 点を足す
// ============================================

const NPTS = 46;                       // ★ 点の数（多いと合体が速すぎて見えない）
const DKINDS = ['chain', 'blobs', 'moons'];
let data, method = 0, merges = [], segs = [], all4 = [], tStep = 0, playing = true, timer = 0, dataNo = 0, seedD = 41, view;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function newData() { data = makeDataset(DKINDS[dataNo], NPTS, seedD); rebuild(); }
function rebuild() {
  all4 = [0, 1, 2, 3].map((m) => agglomerate(data.pts, m));
  merges = all4[method]; segs = mergeSegments(data.pts, merges, method); tStep = 0;
}
// ★ 合体を絵にするための線分：単連結 = いちばん近い組、完全連結 = いちばん遠い組、群平均・ウォード = 重心どうし
function mergeSegments(pts, mg, m) {
  let mem = membersOf(mg, pts.length);
  return mg.map((e) => {
    let A = mem[e.a], B = mem[e.b];
    if (m >= 2) { let ca = centroid(pts, A), cb = centroid(pts, B); return [ca, cb]; }
    let best = null, bd = m === 0 ? Infinity : -1;
    for (let i of A) for (let j of B) { let d = edist(pts[i], pts[j]); if ((m === 0 && d < bd) || (m === 1 && d > bd)) { bd = d; best = [pts[i], pts[j]]; } }
    return best;
  });
}
function centroid(pts, ids) { let c = [0, 0]; for (let i of ids) { c[0] += pts[i][0] / ids.length; c[1] += pts[i][1] / ids.length; } return c; }

function draw() {
  background(22, 24, 34);
  let n = data.pts.length;
  if (playing && ++timer % 12 === 0) tStep = tStep >= n - 1 ? 0 : tStep + 1;
  view = fitView(40, 100, width * 0.5, height - 260, 0, 0, dataNo === 0 ? 3.4 : 4.8);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  let lab = labelsAfter(merges, n, tStep);
  for (let t = 0; t < tStep; t++) {
    let s = segs[t], last = t === tStep - 1;
    stroke(last ? color(255, 240, 150) : color(255, 255, 255, 70)); strokeWeight(last ? 3 : 1.2);
    line(gX(view, s[0][0]), gY(view, s[0][1]), gX(view, s[1][0]), gY(view, s[1][1]));
  }
  drawPts(view, data.pts, lab, 10);
  // ---- 合体の高さのグラフ
  let gx = view.x + view.w + 60, gw = width - gx - 40, hmax = merges[n - 2].h * 1.05;
  let g1 = { x: gx, y: 120, w: gw, h: 150, x0: 0, x1: n - 1, y0: 0, y1: hmax };
  plotAxes(g1, '合体の回数', '合体した高さ（グループ間の距離）', [0, n - 1], [0, +hmax.toPrecision(2)]);
  stroke(255, 190, 80); strokeWeight(2); polyline(merges.slice(0, Math.max(1, tStep)).map((e, t) => [gX(g1, t + 1), gY(g1, e.h)]));
  stroke(255, 255, 255, 60); strokeWeight(1); polyline(merges.map((e, t) => [gX(g1, t + 1), gY(g1, e.h)]));
  // ---- 4 つの連結法で 3 つに分けた結果
  let tw = (gw - 30) / 2, th = (height - 420) / 2 - 20;
  for (let m = 0; m < 4; m++) {
    let v = fitView(gx + (m % 2) * (tw + 30), 340 + Math.floor(m / 2) * (th + 40), tw, th, 0, 0, dataNo === 0 ? 3.6 : 5.0), lb = cutTreeK(all4[m], n, 3);
    noFill(); stroke(m === method ? color(176, 140, 255) : 70); strokeWeight(m === method ? 2 : 1); rect(v.x, v.y, v.w, v.h);
    drawPts(v, data.pts, lb, 6);
    noStroke(); fill(m === method ? color(200, 180, 255) : 190); textSize(13); textAlign(LEFT, BASELINE);
    text((m + 1) + ' ' + LINK_JA[m] + '（k = 3）　ARI ' + ariScore(lb, data.truth).toFixed(2), v.x, v.y - 6);
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); fill(240); textSize(20);
  let last = tStep > 0 ? merges[tStep - 1] : null;
  text('凝集型クラスタリング　' + LINK_JA[method] + '　合体 ' + tStep + ' / ' + (n - 1) + ' 回　グループ数 ' + (n - tStep) + (last ? '　いまの高さ ' + last.h.toFixed(3) : ''), 40, 40);
  fill(170); textSize(15); text('1 単連結　2 完全連結　3 群平均　4 ウォード法　スペース 再生' + (playing ? '中' : '・停止') + '　← → 1 回ずつ　D データ（' + DATA_JA[DKINDS[dataNo]] + '）　R 新しいデータ　クリック 点を足す', 40, 66);
  fill(150); textSize(13);
  text(['黄色の線 = いま合体した「いちばん近い点の組」。線を全部つなぐと最小全域木（シリーズ 9 の 13 クラスタの木と同じ）。鎖のように長くつながりやすい', '黄色の線 = いま合体した 2 つのグループの「いちばん遠い点の組」。直径が小さいまとまった丸いグループができる', '黄色の線 = 重心どうし。全部の点の組の距離の平均で決める。単連結と完全連結の中間', '黄色の線 = 重心どうし。合体で増える J（k-means の目的関数）がいちばん小さい組を選ぶ → k-means に近い丸いグループ'][method], 40, view.y + view.h + 30, view.w);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { if (view && inBox(view, mouseX, mouseY)) { data.pts.push([invX(view, mouseX), invY(view, mouseY)]); data.truth.push(0); rebuild(); } }
function keyPressed() {
  let n = data.pts.length;
  if (key.length === 1 && '1234'.includes(key)) { method = +key - 1; merges = all4[method]; segs = mergeSegments(data.pts, merges, method); }
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { playing = false; tStep = Math.min(n - 1, tStep + 1); }
  if (key === LEFT_ARROW) { playing = false; tStep = Math.max(0, tStep - 1); }
  if (key === 'd' || key === 'D') { dataNo = (dataNo + 1) % DKINDS.length; newData(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
// グループ A, B の距離をそのまま計算（総当たり）。ウォード = √(2|A||B|/(|A|+|B|))·|重心の差|
function bruteLink(pts, A, B, m) {
  if (m === 3) return Math.sqrt((2 * A.length * B.length) / (A.length + B.length)) * edist(centroid(pts, A), centroid(pts, B));
  let v = m === 0 ? Infinity : m === 1 ? -Infinity : 0;
  for (let i of A) for (let j of B) { let d = edist(pts[i], pts[j]); v = m === 0 ? Math.min(v, d) : m === 1 ? Math.max(v, d) : v + d / (A.length * B.length); }
  return v;
}
function selfTest() {
  selfTestResults = [];
  seedRng(44);
  let pts = Array.from({ length: 22 }, () => [rnd() * 3, rnd() * 2]), n = pts.length, lwOk = true, minOk = true, monoOk = true;
  for (let m = 0; m < 4; m++) {
    let mg = agglomerate(pts, m), mem = membersOf(mg, n), alive = pts.map((_, i) => i);
    mg.forEach((e, t) => {
      if (Math.abs(bruteLink(pts, mem[e.a], mem[e.b], m) - e.h) > 1e-9) lwOk = false;
      for (let a of alive) for (let b of alive) if (a < b && bruteLink(pts, mem[a], mem[b], m) < e.h - 1e-9) minOk = false;
      alive = alive.filter((c) => c !== e.a && c !== e.b).concat([n + t]);
      if (t > 0 && e.h < mg[t - 1].h - 1e-12) monoOk = false;
    });
  }
  check('ランス-ウィリアムズの更新 = 総当たりで計算しなおしたグループ間の距離（4 つの連結法、21 回ずつ）', lwOk);
  check('毎回、生きているグループの中でいちばん近い組を合体している（総当たりで確認）', minOk);
  check('合体の高さは増える一方（単調）→ デンドログラムが正しく描ける', monoOk);
  let edges = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) edges.push([edist(pts[i], pts[j]), i, j]);
  edges.sort((a, b) => a[0] - b[0]);
  let par = pts.map((_, i) => i), root = (x) => (par[x] === x ? x : (par[x] = root(par[x]))), mst = [];
  for (let [d, i, j] of edges) { let a = root(i), b = root(j); if (a !== b) { par[a] = b; mst.push(d); } }
  let sl = agglomerate(pts, 0);
  check('単連結の高さ = 最小全域木（クラスカル法）の辺の長さ（小さい順）', sl.every((e, t) => Math.abs(e.h - mst[t]) < 1e-12));
  let ch = makeDataset('chain', NPTS, 7), aS = ariScore(cutTreeK(agglomerate(ch.pts, 0), NPTS, 2), ch.truth), aW = ariScore(cutTreeK(agglomerate(ch.pts, 3), NPTS, 2), ch.truth);
  check('鎖効果：橋でつながった 2 つのかたまりを 2 つに分けると、単連結 ARI ' + aS.toFixed(2) + ' < ウォード法 ARI ' + aW.toFixed(2), aS < 0.3 && aW > 0.6);
  check('n − 1 回で 1 つになる（最後のグループの大きさ = n）', [0, 1, 2, 3].every((m) => { let mg = agglomerate(pts, m); return mg.length === n - 1 && mg[n - 2].size === n; }));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. D で「鎖でつながる」にして 1（単連結）と 4（ウォード法）を比べよう。右の小さい図の ARI は？
// 2. ← → で 1 回ずつ進め、黄色の線（いま合体した組）が長くなっていく様子を見よう。右上のグラフは下がらない
// 3. 2（完全連結）で、離れた点を 1 つクリックで足すと？ 外れ値は最後まで 1 人ぼっち
// 4. 三日月（D）では、どの連結法なら 2 つに分けられる？（03 で k-means は失敗した）
// 5. 05 では合体の記録を「木（デンドログラム）」にして、切る高さを選ぶ

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
