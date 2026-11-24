// ============================================
// 04 ちがう種類のモデルの投票 ─ k 近傍法・ロジスティック回帰・ナイーブベイズ・ニューラルネット・切り株の 5 つを、同じデータで学習
// 上の小さな 5 枚 = それぞれの境界。下の大きな 2 枚 = 選んだモデルの「多数決（ハード）」と「確率の平均（ソフト）」
//   得意・不得意がちがうモデルを集めると、まちがいが打ち消し合う。右の表 = 31 通りの組合せのテスト正解率のベスト 5
//   ソフト投票は「どれくらい自信があるか」も使う。ハード投票は 0/1 の票だけ（同数ならソフトで決める）
// 1〜5 モデルを入れる/外す / ← → データの形 / R データを作り直す
// ============================================

let kind = 4, nTrain = 200, nTest = 600, flipP = 0.08, seedD = 2;   // ★ データの形・点の数・ノイズ
const CELLS = 60, MLP_ITERS = 300;
let trainD, testD, models = [], use = [true, true, true, true, true], mlpDone = 0, imgs = [], hardImg, softImg, testProb = [], combos = [];

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1);
  for (let k = 0; k < 5; k++) imgs.push(createImage(CELLS, CELLS));
  hardImg = createImage(CELLS, CELLS); softImg = createImage(CELLS, CELLS);
  selfTest(); restart();
}
function restart() {
  trainD = makeData2D(kind, nTrain, flipP, seedD); testD = makeData2D(kind, nTest, flipP, seedD + 900);
  models = [0, 1, 2, 4].map((k) => fitBase(k, trainD.X, trainD.y));
  models.splice(3, 0, { type: 'mlp', net: makeMLP(2, 10, true, 7) });   // ニューラルネットは draw の中で少しずつ学習
  mlpDone = 0; refresh();
}
// ★ 全部の組合せ（2⁵ − 1 = 31 通り）をテストデータで採点
function refresh() {
  testProb = models.map((m) => testD.X.map((x) => probOf(m, x)));
  combos = [];
  for (let mask = 1; mask < 32; mask++) {
    let ids = [0, 1, 2, 3, 4].filter((k) => mask & (1 << k)), okH = 0, okS = 0;
    testD.X.forEach((_, i) => {
      let v = 0, s = 0; for (let k of ids) { v += testProb[k][i] > 0.5 ? 1 : 0; s += testProb[k][i]; }
      let ps = s / ids.length, h = 2 * v > ids.length ? 1 : 2 * v < ids.length ? 0 : ps > 0.5 ? 1 : 0;
      if (h === testD.y[i]) okH++; if ((ps > 0.5 ? 1 : 0) === testD.y[i]) okS++;
    });
    combos.push({ mask, ids, hard: okH / nTest, soft: okS / nTest });
  }
  repaint();
}
function chosen() { return models.filter((_, k) => use[k]); }
function repaint() {
  models.forEach((m, k) => paintImage(imgs[k], (u, v) => probCol(probOf(m, [u, v]))));
  let ms = chosen();
  paintImage(hardImg, (u, v) => (ms.length ? probCol(hardVote(ms, [u, v]), 0.6) : BG_COL));
  paintImage(softImg, (u, v) => (ms.length ? probCol(softVote(ms, [u, v]), 0.8) : BG_COL));
}

function draw() {
  background(...BG_COL);
  if (mlpDone < MLP_ITERS) {               // ニューラルネットを 1 フレームに 15 回ずつ学習
    mlpTrain(models[3].net, trainD.X.map(centerX), trainD.y, 15, 0.03); mlpDone += 15;
    if (mlpDone % 60 === 0 || mlpDone >= MLP_ITERS) refresh();
  }
  // ---- 上：5 つのモデル
  let sw = Math.min(150, (width - 80) / 5 - 24), cur = combos.find((c) => c.mask === use.reduce((s, u, k) => s + (u ? 1 << k : 0), 0));
  models.forEach((m, k) => {
    let bx = { x: 40 + k * (sw + 24), y: 100, w: sw, h: sw };
    noSmooth(); image(imgs[k], bx.x, bx.y, sw, sw); smooth();
    stroke(...(use[k] ? BASE_COL[k] : [70, 55, 58])); strokeWeight(use[k] ? 3 : 1); noFill(); rect(bx.x, bx.y, sw, sw);
    noStroke(); fill(...(use[k] ? BASE_COL[k] : [120, 105, 105])); textSize(13); textAlign(LEFT, BASELINE);
    text((k + 1) + ' ' + BASE_NAMES[k] + (k === 3 && mlpDone < MLP_ITERS ? '（学習中）' : ''), bx.x, bx.y + sw + 18);
    fill(200, 185, 170); text('テスト ' + pctStr(accuracyOf((x) => predOf(m, x), testD.X, testD.y)), bx.x, bx.y + sw + 36);
  });
  // ---- 下：多数決とソフト投票
  let big = Math.min(height - 100 - sw - 150, (width - 560) / 2), by = 100 + sw + 80;
  [['多数決（ハード投票）', hardImg, cur ? cur.hard : 0], ['確率の平均（ソフト投票）', softImg, cur ? cur.soft : 0]].forEach(([nm, img, acc], q) => {
    let bx = { x: 40 + q * (big + 30), y: by, w: big, h: big };
    noSmooth(); image(img, bx.x, bx.y, big, big); smooth(); frameBox(bx);
    drawPoints(bx, trainD.X, trainD.y, 6);
    noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text(nm + '　テスト ' + pctStr(acc), bx.x, bx.y - 8);
  });
  // ---- 右：組合せのベスト 5
  let tx = 40 + 2 * (big + 30) + 20, ty = by + 4;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('組合せのベスト 5（ソフト投票のテスト正解率）', tx, ty);
  combos.slice().sort((a, b) => b.soft - a.soft || a.ids.length - b.ids.length).slice(0, 5).forEach((c, r) => {
    let yy = ty + 30 + 28 * r; fill(220, 210, 195); textSize(14); text(pctStr(c.soft), tx, yy);
    c.ids.forEach((k, j) => { fill(...BASE_COL[k]); rect(tx + 64 + j * 22, yy - 12, 16, 16, 3); fill(20); textAlign(CENTER, CENTER); textSize(11); text(k + 1, tx + 72 + j * 22, yy - 4); textAlign(LEFT, BASELINE); });
  });
  let best1 = Math.max(...combos.filter((c) => c.ids.length === 1).map((c) => c.soft));
  fill(200, 185, 170); textSize(14);
  text('1 つだけのベスト ' + pctStr(best1) + '　→　組合せのベスト ' + pctStr(Math.max(...combos.map((c) => c.soft))), tx, ty + 200);
  if (cur) text('いま選んだ ' + cur.ids.length + ' 個：ハード ' + pctStr(cur.hard) + '　ソフト ' + pctStr(cur.soft), tx, ty + 226);
  // ---- 文字
  fill(...INK); textSize(20); text('ちがう種類のモデルの投票　データ：' + SHAPES[kind], 40, 40);
  fill(170, 155, 145); textSize(15); text('1〜5 モデルを入れる/外す　← → データの形　R データを作り直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  for (let k = 1; k <= 5; k++) if (key === String(k)) { use[k - 1] = !use[k - 1]; repaint(); }
  if (key === RIGHT_ARROW) { kind = (kind + 1) % SHAPES.length; restart(); }
  if (key === LEFT_ARROW) { kind = (kind + SHAPES.length - 1) % SHAPES.length; restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let tr = makeData2D(1, 200, 0, 5), te = makeData2D(1, 500, 0, 6);   // 直線で分けられる「斜め」データ（ノイズなし）
  let ms = [0, 1, 2, 3].map((k) => fitBase(k, tr.X, tr.y)), acc = ms.map((m) => accuracyOf((x) => predOf(m, x), te.X, te.y));
  check('直線で分けられるデータで、k 近傍法 ' + pctStr(acc[0]) + ' ≥ 93%、ロジスティック回帰 ' + pctStr(acc[1]) + ' ≥ 97%、ナイーブベイズ ' + pctStr(acc[2]) + ' ≥ 85%、ネット ' + pctStr(acc[3]) + ' ≥ 95%', acc[0] >= 0.93 && acc[1] >= 0.97 && acc[2] >= 0.85 && acc[3] >= 0.95);
  seedRng(4); let Xs = [], ys = []; for (let i = 0; i < 200; i++) { let u = rnd(), v = rnd(); Xs.push([u, v]); ys.push(u > 0.4 ? 1 : 0); }
  let st = fitBase(4, Xs, ys);
  check('縦の線 1 本で分けられるデータで、切り株は訓練 100%（しきい値 ' + fmtNum(st.thr, 3) + ' ≈ 0.4）', accuracyOf((x) => predOf(st, x), Xs, ys) === 1 && Math.abs(st.thr - 0.4) < 0.02);
  let okSum = true; seedRng(6);
  for (let t = 0; t < 200; t++) { let x = [rnd(), rnd()], p = softVote(ms, x); if (!(p >= 0 && p <= 1) || Math.abs(p + (1 - p) - 1) > 1e-12 || Math.abs(p - meanOf(ms.map((m) => probOf(m, x)))) > 1e-12) okSum = false; }
  check('ソフト投票の確率 = 4 つの確率の平均、0〜1 で、2 クラスの和 = 1（200 点）', okSum);
  check('1 つだけの投票 = そのモデル、同じモデル 3 つの多数決 = そのモデル', te.X.every((x) => hardVote([ms[2]], x) === predOf(ms[2], x) && hardVote([ms[0], ms[0], ms[0]], x) === predOf(ms[0], x)));
  let tr2 = makeData2D(4, 200, 0.08, 2), te2 = makeData2D(4, 600, 0.08, 902), all = [0, 1, 2, 3, 4].map((k) => fitBase(k, tr2.X, tr2.y));
  let ind = all.map((m) => accuracyOf((x) => predOf(m, x), te2.X, te2.y)), sv = accuracyOf((x) => (softVote(all, x) > 0.5 ? 1 : 0), te2.X, te2.y);
  check('三日月データ：5 つのソフト投票 ' + pctStr(sv) + ' > 5 つの平均 ' + pctStr(meanOf(ind)) + '（いちばん弱い切り株 ' + pctStr(Math.min(...ind)) + ' も入っているのに）', sv > meanOf(ind));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1〜5 で 1 つずつ外して、多数決の境界がどう変わるか見よう。どれを外すといちばん下がる？
// 2. 円（← →）ではロジスティック回帰と切り株は「直線」しか引けない。それでも組合せに入ると役に立つ？
// 3. ハードとソフトの境界のちがいは？ 偶数個のモデルのとき、ハードは同数になることがある
// 4. 右の表のベストは「全部入り」とは限らない。弱いモデルが多いと多数決を引っ張る
// 5. 05 では「平均の重み」をデータから決める。同じ重みで足すのがいちばんとは限らない

// ==================================================
// ここから下は「アンサンブル学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 小さな道具：はさむ・合計・平均・いちばん大きい番号・数の表示
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumArr(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumArr(a) / a.length : 0; }
function varOf(a) { let m = meanOf(a), s = 0; for (let v of a) s += (v - m) * (v - m); return a.length ? s / a.length : 0; }   // ÷n の分散
function argMaxArr(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
function fmtNum(v, d) { if (typeof v !== 'number' || !isFinite(v)) return '?'; let s = (+v.toFixed(d === undefined ? 2 : d)).toString(); return s === '-0' ? '0' : s; }
function pctStr(v) { return fmtNum(100 * v, 1) + '%'; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function rndGauss() { let u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 合成データ（[0, 1]² の 2 次元、2 クラス、種つき）。kind = 0 かたまり / 1 斜め / 2 円 / 3 XOR / 4 三日月 / 5 しま
const SHAPES = ['かたまり', '斜め', '円', 'XOR', '三日月', 'しま'];
function trueLabel(kind, u, v) {
  if (kind === 0) return (u - 0.32) ** 2 + (v - 0.36) ** 2 < (u - 0.68) ** 2 + (v - 0.64) ** 2 + 0.03 * Math.sin(9 * u) ? 0 : 1;
  if (kind === 1) return u + 0.8 * v > 0.9 ? 1 : 0;
  if (kind === 2) return (u - 0.5) ** 2 + (v - 0.5) ** 2 < 0.09 ? 1 : 0;
  if (kind === 3) return (u > 0.5) !== (v > 0.5) ? 1 : 0;
  if (kind === 4) return v > 0.5 + 0.28 * Math.cos(Math.PI * (1.6 * u - 0.3)) - 0.18 ? 1 : 0;
  return Math.sin(10 * u + 3 * v) > 0 ? 1 : 0;
}
// n 個、flip = ラベルをわざと入れかえる割合（ノイズ）
function makeData2D(kind, n, flip, seed) {
  seedRng(seed);
  let X = [], y = [];
  for (let i = 0; i < n; i++) {
    let u = 0.02 + 0.96 * rnd(), v = 0.02 + 0.96 * rnd(), c = trueLabel(kind, u, v);
    if (rnd() < flip) c = 1 - c;
    X.push([u, v]); y.push(c);
  }
  return { X, y };
}
// ---- 連立 1 次方程式 A w = b（部分ピボットつきのガウスの消去法）。ridge = 対角に足す小さな数（解けないのを防ぐ）
function solveLin(A, b, ridge) {
  let n = b.length, M = A.map((r, i) => r.slice().concat([b[i]]));
  for (let i = 0; i < n; i++) M[i][i] += ridge || 0;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) continue;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { let f = M[r][c] / M[c][c]; if (f !== 0) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => (Math.abs(r[i]) < 1e-14 ? 0 : r[n] / r[i]));
}
// ---- k 近傍法：近い k 個のうちクラス 1 の割合 = 確率
function fitKnn(X, y, k) { return { type: 'knn', X, y, k }; }
function knnProb(m, x) {
  let bd = [], bc = [], k = Math.min(m.k, m.X.length);
  for (let i = 0; i < m.X.length; i++) {
    let d = (m.X[i][0] - x[0]) ** 2 + (m.X[i][1] - x[1]) ** 2;
    if (bd.length < k || d < bd[bd.length - 1]) {      // 小さい順の列に挿入（並べ替えはしない）
      let q = bd.length < k ? bd.length : bd.length - 1;
      while (q > 0 && bd[q - 1] > d) { bd[q] = bd[q - 1]; bc[q] = bc[q - 1]; q--; }
      bd[q] = d; bc[q] = m.y[i];
    }
  }
  return k ? sumArr(bc) / k : 0.5;
}
// ---- ロジスティック回帰（ニュートン法、L2 正則化 λ）。F = 特徴量ベクトルの列、戻り値 = 重み w
function fitLogitVec(F, y, lam, iters) {
  let d = F[0].length, w = new Array(d).fill(0);
  for (let it = 0; it < (iters || 25); it++) {
    let g = new Array(d).fill(0), H = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < F.length; i++) {
      let f = F[i], p = sigm(dotV(w, f)), r = p - y[i], s = Math.max(1e-6, p * (1 - p));
      for (let a = 0; a < d; a++) { g[a] += r * f[a]; for (let b = 0; b < d; b++) H[a][b] += s * f[a] * f[b]; }
    }
    for (let a = 0; a < d; a++) { g[a] += lam * w[a]; H[a][a] += lam; }
    let dw = solveLin(H, g, 0), big = 0;
    for (let a = 0; a < d; a++) { w[a] -= clampv(dw[a], -20, 20); big = Math.max(big, Math.abs(dw[a])); }
    if (big < 1e-9) break;
  }
  return w;
}
function dotV(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function logitFeat(x, quad) { let u = x[0] - 0.5, v = x[1] - 0.5; return quad ? [1, u, v, u * u, v * v, u * v] : [1, u, v]; }
function fitLogit(X, y, quad, lam) { return { type: 'logit', quad: !!quad, w: fitLogitVec(X.map((x) => logitFeat(x, quad)), y, lam === undefined ? 0.01 : lam) }; }
function logitProb(m, x) { return sigm(dotV(m.w, logitFeat(x, m.quad))); }
// ---- ガウスのナイーブベイズ：クラスごとに、特徴量ごとの平均と分散（特徴量どうしは独立と仮定）
function fitNB(X, y) {
  let m = { type: 'nb', prior: [0, 0], mu: [[0, 0], [0, 0]], va: [[0, 0], [0, 0]] };
  for (let c = 0; c < 2; c++) {
    let pts = X.filter((_, i) => y[i] === c); m.prior[c] = (pts.length + 1) / (X.length + 2);
    for (let f = 0; f < 2; f++) { let col = pts.map((p) => p[f]); m.mu[c][f] = col.length ? meanOf(col) : 0.5; m.va[c][f] = Math.max(1e-3, varOf(col)); }
  }
  return m;
}
function nbProb(m, x) {
  let lg = [0, 1].map((c) => Math.log(m.prior[c]) + [0, 1].reduce((s, f) => s - 0.5 * Math.log(2 * Math.PI * m.va[c][f]) - (x[f] - m.mu[c][f]) ** 2 / (2 * m.va[c][f]), 0));
  return sigm(lg[1] - lg[0]);
}
// ---- 隠れ層 1 層のニューラルネット（tanh）。cls = true なら出力はシグモイド（交差エントロピー）、false なら直線（2 乗誤差 / 2）
// 学習はフルバッチの Adam。mlpTrain(net, X, y, 回数) を 1 フレームに少しずつ呼べば画面は止まらない
function makeMLP(nIn, nH, cls, seed) {
  seedRng(seed);
  let s1 = 1.5 / Math.sqrt(nIn), net = { nIn, nH, cls, W1: [], b1: [], W2: [], b2: 0, t: 0, ad: null };
  for (let j = 0; j < nH; j++) { net.W1.push(Array.from({ length: nIn }, () => s1 * rndGauss())); net.b1.push(0.5 * rndGauss()); net.W2.push(rndGauss() / Math.sqrt(nH)); }
  return net;
}
function mlpOut(net, x) {
  let o = net.b2;
  for (let j = 0; j < net.nH; j++) { let z = net.b1[j]; for (let k = 0; k < net.nIn; k++) z += net.W1[j][k] * x[k]; o += net.W2[j] * Math.tanh(z); }
  return net.cls ? sigm(o) : o;
}
function mlpLoss(net, X, y) {
  let L = 0;
  for (let i = 0; i < X.length; i++) { let p = mlpOut(net, X[i]); L += net.cls ? -(y[i] ? Math.log(Math.max(1e-12, p)) : Math.log(Math.max(1e-12, 1 - p))) : 0.5 * (p - y[i]) ** 2; }
  return X.length ? L / X.length : 0;
}
// 誤差逆伝播：平均の損失の勾配（W1, b1, W2, b2 と同じ形）
function mlpGrad(net, X, y) {
  let g = { W1: net.W1.map((r) => r.map(() => 0)), b1: net.b1.map(() => 0), W2: net.W2.map(() => 0), b2: 0 }, h = new Array(net.nH), n = X.length || 1;
  for (let i = 0; i < X.length; i++) {
    let x = X[i], o = net.b2;
    for (let j = 0; j < net.nH; j++) { let z = net.b1[j]; for (let k = 0; k < net.nIn; k++) z += net.W1[j][k] * x[k]; h[j] = Math.tanh(z); o += net.W2[j] * h[j]; }
    let d = ((net.cls ? sigm(o) : o) - y[i]) / n;              // どちらの損失でも出力の誤差は (予測 − 正解)
    g.b2 += d;
    for (let j = 0; j < net.nH; j++) { g.W2[j] += d * h[j]; let dz = d * net.W2[j] * (1 - h[j] * h[j]); g.b1[j] += dz; for (let k = 0; k < net.nIn; k++) g.W1[j][k] += dz * x[k]; }
  }
  return g;
}
function mlpParams(o) { return [].concat(...o.W1, o.b1, o.W2, [o.b2]); }   // 全部のパラメータを 1 列に
function mlpSetParams(net, p) { let q = 0; for (let j = 0; j < net.nH; j++) for (let k = 0; k < net.nIn; k++) net.W1[j][k] = p[q++]; for (let j = 0; j < net.nH; j++) net.b1[j] = p[q++]; for (let j = 0; j < net.nH; j++) net.W2[j] = p[q++]; net.b2 = p[q++]; }
function mlpTrain(net, X, y, iters, lr, wd) {   // Adam（β1 = 0.9, β2 = 0.999）、wd = 重みの減衰
  let p = mlpParams(net);
  if (!net.ad) net.ad = { m: p.map(() => 0), v: p.map(() => 0) };
  for (let it = 0; it < iters; it++) {
    let g = mlpParams(mlpGrad(net, X, y)); net.t++;
    let b1t = 1 - Math.pow(0.9, net.t), b2t = 1 - Math.pow(0.999, net.t);
    for (let q = 0; q < p.length; q++) {
      let gq = g[q] + (wd || 0) * p[q];
      net.ad.m[q] = 0.9 * net.ad.m[q] + 0.1 * gq; net.ad.v[q] = 0.999 * net.ad.v[q] + 0.001 * gq * gq;
      p[q] = clampv(p[q] - (lr || 0.02) * (net.ad.m[q] / b1t) / (Math.sqrt(net.ad.v[q] / b2t) + 1e-8), -50, 50);
    }
    mlpSetParams(net, p);
  }
}
// ---- 切り株（深さ 1 の木）：特徴量 1 つ × しきい値 1 つ。重み w つき。左右の葉 = クラス 1 の重みの割合（確率）
function fitStump(X, y, w) {
  let n = X.length, W = 0, W1 = 0, best = null;
  for (let i = 0; i < n; i++) { let wi = w ? w[i] : 1; W += wi; if (y[i]) W1 += wi; }
  for (let f = 0; f < 2; f++) {
    let ord = X.map((_, i) => i).sort((a, b) => X[a][f] - X[b][f]), lw = 0, l1 = 0;
    for (let q = 0; q < n - 1; q++) {
      let i = ord[q], wi = w ? w[i] : 1; lw += wi; if (y[i]) l1 += wi;
      let v0 = X[i][f], v1 = X[ord[q + 1]][f]; if (!(v1 > v0)) continue;
      let err = Math.min(l1, lw - l1) + Math.min(W1 - l1, W - lw - (W1 - l1));   // 左右それぞれ多数決にしたときの重みつき誤り
      if (!best || err < best.err - 1e-12) best = { feat: f, thr: (v0 + v1) / 2, lw, l1, err };
    }
  }
  if (!best) return { type: 'stump', feat: 0, thr: 2, pl: (W1 + 1) / (W + 2), pr: 0.5, err: Math.min(W1, W - W1) };
  return { type: 'stump', feat: best.feat, thr: best.thr, pl: (best.l1 + 0.5) / (best.lw + 1), pr: (W1 - best.l1 + 0.5) / (W - best.lw + 1), err: best.err };
}
function stumpProb(m, x) { return x[m.feat] <= m.thr ? m.pl : m.pr; }
// ---- 5 種類の「ちがうモデル」をまとめて扱う：fitBase(番号, X, y) → モデル、probOf(モデル, x) → クラス 1 の確率
const BASE_NAMES = ['k 近傍法', 'ロジスティック回帰', 'ナイーブベイズ', 'ニューラルネット', '切り株'];
const BASE_COL = [[240, 120, 100], [236, 214, 160], [110, 165, 240], [190, 135, 235], [150, 210, 95]];   // ★ モデルの色
function fitBase(kind, X, y, seed) {
  if (kind === 0) return fitKnn(X, y, 15);                     // ★ k = 15
  if (kind === 1) return fitLogit(X, y, false);                // 直線の境界
  if (kind === 2) return fitNB(X, y);
  if (kind === 3) { let net = makeMLP(2, 10, true, seed || 7), Xc = X.map(centerX); mlpTrain(net, Xc, y, 300, 0.03); return { type: 'mlp', net }; }
  return fitStump(X, y);
}
function centerX(x) { return [2 * x[0] - 1, 2 * x[1] - 1]; }  // ネットには [−1, 1] に直して渡す
function probOf(m, x) {
  if (m.type === 'knn') return knnProb(m, x);
  if (m.type === 'logit') return logitProb(m, x);
  if (m.type === 'nb') return nbProb(m, x);
  if (m.type === 'mlp') return mlpOut(m.net, centerX(x));
  if (m.type === 'stump') return stumpProb(m, x);
  return 0.5;
}
function predOf(m, x) { return probOf(m, x) > 0.5 ? 1 : 0; }
function accuracyOf(fn, X, y) { let ok = 0; for (let i = 0; i < X.length; i++) if (fn(X[i]) === y[i]) ok++; return X.length ? ok / X.length : 0; }
// 投票：hard = 多数決（同数ならソフトの確率で決める）、soft = 確率の平均
function hardVote(ms, x) { let v = 0; for (let m of ms) v += predOf(m, x); return 2 * v > ms.length ? 1 : 2 * v < ms.length ? 0 : softVote(ms, x) > 0.5 ? 1 : 0; }
function softVote(ms, x) { let s = 0; for (let m of ms) s += probOf(m, x); return ms.length ? s / ms.length : 0.5; }
// ---- 描く道具：色（オーケストラ：えんじ色の黒、象牙色、金管の金、弦の青緑）、領域の絵、点
const BG_COL = [24, 11, 16];                                     // 背景（えんじ色の黒）
const INK = [242, 233, 214], GOLD = [226, 176, 74], TEAL = [64, 186, 176], WINE = [196, 72, 96];
const CLS_COL = [[226, 170, 70], [60, 182, 176]];                // ★ クラス 0（金）・クラス 1（青緑）の色
function probCol(p, k) {             // クラス 1 の確率 → 背景と混ぜた色（k = 濃さ）
  let c = [], a = clampv(k === undefined ? 0.55 : k, 0, 1) * Math.abs(2 * p - 1) + 0.12;
  for (let q = 0; q < 3; q++) c.push(BG_COL[q] + ((p > 0.5 ? CLS_COL[1][q] : CLS_COL[0][q]) - BG_COL[q]) * a);
  return c;
}
// img の全部の画素に fn(u, v) → [r, g, b] を塗る（u は右向き、v は上向き、どちらも 0〜1）
function paintImage(img, fn) {
  img.loadPixels();
  let W = img.width, H = img.height;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    let c = fn((px + 0.5) / W, 1 - (py + 0.5) / H), i = 4 * (px + W * py);
    img.pixels[i] = c[0]; img.pixels[i + 1] = c[1]; img.pixels[i + 2] = c[2]; img.pixels[i + 3] = 255;
  }
  img.updatePixels();
}
function toPx(bx, u, v) { return [bx.x + u * bx.w, bx.y + (1 - v) * bx.h]; }   // [0,1]² → 画面
function fromPx(bx, px, py) { return [(px - bx.x) / bx.w, 1 - (py - bx.y) / bx.h]; }
function drawPoints(bx, X, y, r) {
  stroke(10); strokeWeight(1);
  for (let i = 0; i < X.length; i++) { let p = toPx(bx, X[i][0], X[i][1]); fill(...CLS_COL[y[i]]); circle(p[0], p[1], r); }
}
function frameBox(bx, col) { noFill(); stroke(...(col || [110, 80, 85])); strokeWeight(1); rect(bx.x, bx.y, bx.w, bx.h); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
