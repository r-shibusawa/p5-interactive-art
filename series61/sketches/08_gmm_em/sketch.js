// ============================================
// 08 混合ガウス分布と EM ─ データを「k 個の正規分布（楕円の山）を重みつきで足したもの」とみなしてあてはめる
//   E ステップ：各点がどの山から来たかの確率（所属確率 r_ik、合計 1）を計算 → 点の色の混ざりぐあい
//   M ステップ：所属確率を重みにして、各山の重み・平均・共分散（楕円の形と向き）を計算しなおす
//   対数尤度 log L は E → M のたびに必ず増えるか同じ（EM アルゴリズムの性質、右上のグラフ）。k は BIC = −2 log L + (母数の数)·log n が小さいものを選ぶ
//   k-means は「丸くて同じ大きさ・どれか 1 つに所属」の特別な場合。所属度で分けるファジィ c-平均法はシリーズ 50 の 11
// スペース EM を 1 回 / A 自動 / ↑↓ k / I 初期値を変える / D データ / R 新しいデータ / クリック 点を足す
// ============================================

const NPTS = 300;                      // ★ 点の数
const DKINDS = ['ellipses', 'aniso', 'sizes', 'moons'];
let data, kNum = 3, gm, eRes, llHist = [], auto = true, timer = 0, dataNo = 0, seedD = 81, seedI = 1, bic = [], view;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newData(); }
function ellipses3(n, seed) {          // 共分散をきめた 3 つの楕円のかたまり
  seedRng(seed);
  return makeBlobs([{ n: Math.floor(n * 0.4), c: [-0.9, 0.5], sd: [0.6, 0.15], rot: 0.6 }, { n: Math.floor(n * 0.35), c: [1.0, 0.45], sd: [0.45, 0.22], rot: -0.7 }, { n: n - Math.floor(n * 0.4) - Math.floor(n * 0.35), c: [0.05, -0.85], sd: [0.22, 0.22] }]);
}
function newData() { data = DKINDS[dataNo] === 'ellipses' ? ellipses3(NPTS, seedD) : makeDataset(DKINDS[dataNo], NPTS, seedD); bic = []; reinit(); }
function reinit() { seedRng(900 + seedI); gm = gmmInit(data.pts, kNum); eRes = gmmE(data.pts, gm); llHist = [eRes.ll]; }
// ★ EM を 1 回：M（今の所属確率で山を計算しなおす）→ E（新しい山で所属確率と log L）
function emStep() { gm = gmmM(data.pts, eRes.resp, gm); eRes = gmmE(data.pts, gm); llHist.push(eRes.ll); if (llHist.length > 300) llHist.splice(1, 1); }
function bestFit(pts, k, tries, seed) { seedRng(seed); let best = null; for (let r = 0; r < tries; r++) { let f = gmmFit(pts, k, 150); if (!best || f.ll > best.ll) best = f; } return best; }

function draw() {
  background(22, 24, 34);
  if (auto && ++timer % 8 === 0) emStep();
  if (bic.length < 6 && frameCount % 3 === 0) { let k = bic.length + 1, f = bestFit(data.pts, k, 3, 50 + k); bic.push(gmmBIC(f.ll, k, data.pts.length)); }   // 1 つずつ計算（重いので）
  view = fitView(40, 100, width * 0.58, height - 190, 0, 0, 4.6);
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  // ---- 点：所属確率で色を混ぜる
  noStroke();
  for (let i = 0; i < data.pts.length; i++) {
    let r = 0, g = 0, b = 0; eRes.resp[i].forEach((v, k) => { let c = PAL[k % PAL.length]; r += v * c[0]; g += v * c[1]; b += v * c[2]; });
    fill(r, g, b); circle(gX(view, data.pts[i][0]), gY(view, data.pts[i][1]), 7);
  }
  // ---- 山（楕円 = 1σ と 2σ）
  gm.mu.forEach((m, k) => {
    let ax = covAxes(gm.cv[k]);
    for (let s of [1, 2]) {
      let ring = []; for (let t = 0; t <= 60; t++) { let a = (TWO_PI * t) / 60, u = s * ax.s1 * Math.cos(a), v = s * ax.s2 * Math.sin(a); ring.push([gX(view, m[0] + u * Math.cos(ax.ang) - v * Math.sin(ax.ang)), gY(view, m[1] + u * Math.sin(ax.ang) + v * Math.cos(ax.ang))]); }
      stroke(palC(k, s === 1 ? 230 : 120)); strokeWeight(s === 1 ? 2.5 : 1.5); polyline(ring);
    }
    noStroke(); fill(palC(k)); textSize(13); textAlign(CENTER, BOTTOM); text('w = ' + gm.w[k].toFixed(2), gX(view, m[0]), gY(view, m[1]) - 6);
  });
  // ---- 対数尤度
  let gx = view.x + view.w + 60, gw = width - gx - 40, lo = Math.min(...llHist), hi = Math.max(...llHist);
  let g1 = { x: gx, y: 130, w: gw, h: 180, x0: 0, x1: Math.max(10, llHist.length - 1), y0: lo - 1, y1: hi + 1 };
  plotAxes(g1, 'EM の回数', '対数尤度 log L（増える一方）', [0, g1.x1], [+(lo - 1).toFixed(0), +(hi + 1).toFixed(0)]);
  stroke(110, 230, 190); strokeWeight(2); polyline(llHist.map((v, i) => [gX(g1, i), gY(g1, v)]));
  // ---- BIC
  let g2 = { x: gx, y: 400, w: gw, h: 160 };
  noStroke(); fill(205); textSize(13); textAlign(LEFT, BASELINE); text('BIC（小さいほどよい。k ごとに 3 回やり直した最良）', g2.x, g2.y - 10);
  if (bic.length) {
    let bl = Math.min(...bic), bh = Math.max(...bic), best = bic.indexOf(bl) + 1;
    bic.forEach((v, i) => { let hgt = 20 + ((v - bl) / Math.max(1e-9, bh - bl)) * (g2.h - 30), bw = g2.w / 6; fill(i + 1 === best ? color(255, 190, 80) : i + 1 === kNum ? color(176, 140, 255) : color(90, 95, 120)); rect(g2.x + i * bw + 4, g2.y + g2.h - hgt, bw - 8, hgt); fill(190); textAlign(CENTER, TOP); text('k=' + (i + 1), g2.x + i * bw + bw / 2, g2.y + g2.h + 4); });
    textAlign(LEFT, BASELINE); fill(255, 200, 120); text(bic.length < 6 ? '計算中…' : 'BIC が最小 → k = ' + best, g2.x, g2.y + g2.h + 40);
  }
  // ---- 文字
  let lab = eRes.resp.map((r) => r.indexOf(Math.max(...r)));
  textAlign(LEFT, BASELINE); fill(240); textSize(20);
  text('混合ガウス分布と EM　k = ' + kNum + '　log L = ' + eRes.ll.toFixed(2) + '　EM ' + (llHist.length - 1) + ' 回　ARI（いちばん確率の高い山で分けて）' + ariScore(lab, data.truth).toFixed(3), 40, 40);
  fill(170); textSize(15); text('スペース EM 1 回　A 自動' + (auto ? '（再生中）' : '') + '　↑↓ k　I 初期値を変える　D データ（' + (DKINDS[dataNo] === 'ellipses' ? '3 つの楕円' : DATA_JA[DKINDS[dataNo]]) + '）　R 新しいデータ　クリック 点を足す', 40, 66);
  fill(150); textSize(13); text('点の色 = 所属確率で混ぜた色（山の境目では色が混ざる = 「どちらとも言えない」）。楕円 = 共分散の 1σ・2σ。k-means（03）が苦手な細長い・大きさがちがうデータも分けられる', 40, height - 50, view.w);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { if (view && inBox(view, mouseX, mouseY)) { data.pts.push([invX(view, mouseX), invY(view, mouseY)]); data.truth.push(0); eRes = gmmE(data.pts, gm); llHist = [eRes.ll]; bic = []; } }
function keyPressed() {
  if (key === ' ') { auto = false; emStep(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW || key === DOWN_ARROW) { kNum = clampv(kNum + (key === UP_ARROW ? 1 : -1), 1, 6); reinit(); }
  if (key === 'i' || key === 'I') { seedI++; reinit(); }
  if (key === 'd' || key === 'D') { dataNo = (dataNo + 1) % DKINDS.length; newData(); }
  if (key === 'r' || key === 'R') { seedD++; newData(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let d = ellipses3(150, 8), mono = true, sum1 = true;
  for (let s = 0; s < 5; s++) {
    seedRng(30 + s); let g = gmmInit(d.pts, 3), e = gmmE(d.pts, g), prev = e.ll;
    for (let t = 0; t < 40; t++) {
      g = gmmM(d.pts, e.resp, g); e = gmmE(d.pts, g);
      if (e.ll < prev - 1e-9 * Math.abs(prev)) mono = false; prev = e.ll;
      if (!e.resp.every((r) => Math.abs(r.reduce((a, b) => a + b, 0) - 1) < 1e-12 && r.every((v) => v >= 0 && v <= 1))) sum1 = false;
    }
  }
  check('対数尤度は EM のたびに減らない（5 通りの初期値 × 40 回）', mono);
  check('所属確率 r_ik は 0〜1 で、各点の合計がちょうど 1', sum1);
  check('log-sum-exp：log(e^−1000 + e^−1001) = −1000 + log(1 + e^−1) を NaN なしで計算、ふつうの値でも直接計算と一致', near(logSumExp([-1000, -1001]), -1000 + Math.log(1 + Math.exp(-1)), 1e-12) && near(logSumExp([0.5, -0.3, 1.2]), Math.log(Math.exp(0.5) + Math.exp(-0.3) + Math.exp(1.2)), 1e-12));
  let one = gmmM(d.pts, d.pts.map(() => [1]), null), n = d.pts.length, mx = meanOf(d.pts.map((p) => p[0])), my = meanOf(d.pts.map((p) => p[1]));
  let sxx = meanOf(d.pts.map((p) => (p[0] - mx) ** 2)), sxy = meanOf(d.pts.map((p) => (p[0] - mx) * (p[1] - my)));
  check('山が 1 つなら、M ステップの答え = データの平均と共分散（n で割る）そのもの', near(one.mu[0][0], mx, 1e-12) && near(one.mu[0][1], my, 1e-12) && near(one.cv[0][0], sxx, 1e-12) && near(one.cv[0][1], sxy, 1e-12) && one.w[0] === 1);
  let bics = [1, 2, 3, 4, 5].map((k) => gmmBIC(bestFit(d.pts, k, 1, 70 + k).ll, k, n));
  check('3 つの楕円のデータでは BIC が k = 3 で最小（k = 1〜5）', bics.indexOf(Math.min(...bics)) === 2);
  let flat = Array.from({ length: 40 }, (_, i) => [i * 0.05, 0]); seedRng(5); let fl = gmmFit(flat, 2, 50);
  check('一直線の点（共分散がつぶれる）でも、共分散の下限で log L は有限・NaN なし', isFinite(fl.ll) && fl.gm.cv.every((c) => c[0] * c[2] - c[1] * c[1] > 0) && noNaN(fl.llHist));
  let an = makeDataset('aniso', 150, 9), fa = bestFit(an.pts, 3, 2, 4), la = fa.resp.map((r) => r.indexOf(Math.max(...r))); seedRng(4); let ka = kmeansBest(an.pts, 3, 10, true, 100);
  let aG = ariScore(la, an.truth), aK = ariScore(ka.labels, an.truth);
  check('細長いかたまり：混合ガウス ARI ' + aG.toFixed(3) + ' ≥ 0.9、k-means は ' + aK.toFixed(3), aG >= 0.9 && aK < aG);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. I で初期値を変えてスペースで 1 回ずつ。楕円がだんだんデータに合っていく様子と、log L のグラフを見よう
// 2. ↑↓ で k を変えて BIC の棒を見る。log L は k を増やすほど大きくなるのに、BIC はなぜ k = 3 で最小？
// 3. D で「細長い」「大きさがちがう」に。03 で k-means が失敗したデータを、楕円ならどう分ける？
// 4. 三日月（D）では？ 正規分布の山は丸い（楕円）ので、三日月 1 つに山がいくつも必要になる
// 5. 所属確率で色が混ざる点を探そう。シリーズ 50 の 11（ファジィ c-平均法）の所属度とくらべてみよう

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
// ---- 混合ガウス分布（2 次元、共分散は全部）。cv = [s_xx, s_xy, s_yy]。gm = { w: 重み, mu: 平均, cv: 共分散 }
const COV_FLOOR = 1e-4;                // 共分散の固有値の下限（1 点に縮んで尤度が ∞ になるのを防ぐ）
function logGauss2(p, mu, cv) {
  let det = cv[0] * cv[2] - cv[1] * cv[1], dx = p[0] - mu[0], dy = p[1] - mu[1];
  let q = (cv[2] * dx * dx - 2 * cv[1] * dx * dy + cv[0] * dy * dy) / det;
  return -Math.log(2 * Math.PI) - 0.5 * Math.log(det) - 0.5 * q;
}
function logSumExp(arr) { let m = -Infinity; for (let v of arr) if (v > m) m = v; if (m === -Infinity) return -Infinity; let s = 0; for (let v of arr) s += Math.exp(v - m); return m + Math.log(s); }
function gmmE(pts, gm) {               // E ステップ：所属確率 r_ik（各点で合計 1）と対数尤度
  let ll = 0, resp = pts.map((p) => {
    let lg = gm.w.map((w, k) => Math.log(Math.max(w, 1e-300)) + logGauss2(p, gm.mu[k], gm.cv[k])), lse = logSumExp(lg);
    ll += lse; return lg.map((v) => Math.exp(v - lse));
  });
  return { resp, ll };
}
function floorCov(cv) {                // 固有値が COV_FLOOR より小さければ持ち上げる（ふだんは何もしない）
  let a = cv[0], b = cv[1], c = cv[2], tr = (a + c) / 2, df = Math.sqrt(((a - c) / 2) ** 2 + b * b), l1 = tr + df, l2 = tr - df;
  if (l2 >= COV_FLOOR && isFinite(l1)) return cv;
  let th = 0.5 * Math.atan2(2 * b, a - c), co = Math.cos(th), si = Math.sin(th);
  l1 = Math.max(isFinite(l1) ? l1 : 1, COV_FLOOR); l2 = Math.max(isFinite(l2) ? l2 : COV_FLOOR, COV_FLOOR);
  return [l1 * co * co + l2 * si * si, (l1 - l2) * co * si, l1 * si * si + l2 * co * co];
}
function gmmM(pts, resp, old) {        // M ステップ：重み・平均・共分散を所属確率の重みつきで計算しなおす
  let k = resp[0].length, n = pts.length, gm = { w: [], mu: [], cv: [] };
  for (let j = 0; j < k; j++) {
    let nk = 0, mx = 0, my = 0; for (let i = 0; i < n; i++) { let r = resp[i][j]; nk += r; mx += r * pts[i][0]; my += r * pts[i][1]; }
    if (nk < 1e-8) { gm.w.push(1e-8); gm.mu.push(old ? old.mu[j].slice() : pts[j % n].slice()); gm.cv.push(old ? old.cv[j].slice() : [1, 0, 1]); continue; }
    mx /= nk; my /= nk;
    let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { let r = resp[i][j], dx = pts[i][0] - mx, dy = pts[i][1] - my; a += r * dx * dx; b += r * dx * dy; c += r * dy * dy; }
    gm.w.push(nk / n); gm.mu.push([mx, my]); gm.cv.push(floorCov([a / nk, b / nk, c / nk]));
  }
  let sw = gm.w.reduce((s, v) => s + v, 0); gm.w = gm.w.map((v) => v / sw);
  return gm;
}
function gmmInit(pts, k) {             // k-means++ の中心から始めて、近い点を仲間にして M ステップ 1 回
  let cs = initPlusPlus(pts, k), lab = assignLabels(pts, cs);
  return gmmM(pts, lab.map((l) => cs.map((_, j) => (j === l ? 1 : 0))), { mu: cs, cv: cs.map(() => [0.3, 0, 0.3]) });
}
function gmmFit(pts, k, iters) {       // EM をくり返す。llHist = 対数尤度の記録（必ず増えるか同じ）
  let gm = gmmInit(pts, k), llHist = [], e = gmmE(pts, gm);
  for (let t = 0; t < iters; t++) { llHist.push(e.ll); gm = gmmM(pts, e.resp, gm); e = gmmE(pts, gm); if (t > 3 && Math.abs(e.ll - llHist[t]) < 1e-9 * Math.abs(e.ll)) break; }
  llHist.push(e.ll);
  return { gm, ll: e.ll, resp: e.resp, llHist };
}
function gmmBIC(ll, k, n) { return -2 * ll + (6 * k - 1) * Math.log(n); }   // 母数の数 = 平均 2k + 共分散 3k + 重み (k − 1)
function covAxes(cv) {                 // 共分散の楕円：長い軸・短い軸の標準偏差と傾き
  let a = cv[0], b = cv[1], c = cv[2], tr = (a + c) / 2, df = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  return { s1: Math.sqrt(Math.max(0, tr + df)), s2: Math.sqrt(Math.max(0, tr - df)), ang: 0.5 * Math.atan2(2 * b, a - c) };
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
