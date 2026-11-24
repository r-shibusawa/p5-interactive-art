// ============================================
// 06 スタッキング ─ 5 つのモデルの「予測」を特徴量にして、2 段目のモデル（メタ学習器 = ロジスティック回帰）が組み合わせ方を学ぶ
// 大事なのは「見ていないデータでの予測」を使うこと：訓練データを 5 つに分け、4 つで学習 → 残り 1 つを予測、を 5 回（out-of-fold）
//   ずるい方法（右）：訓練データでそのまま予測して使う → 1 近傍法は訓練データを全部覚えているので「100% 正しい」ように見え、
//   メタ学習器が 1 近傍法ばかり信じる「漏れ（リーク）」が起こる。テストでは 1 近傍法と同じくらいに落ちる
//   下の棒 = メタ学習器の重み（予測の対数オッズにかける数）。上の帯 = 5 分割のどこを予測しているか
// スペース 1 分割ずつ進める / A 自動 / ← → データの形 / R データを作り直す
// ============================================

let kind = 5, nTrain = 200, nTest = 1000, flipP = 0.1, seedD = 2, K_FOLD = 5;   // ★ データ・分割の数
const LV1 = ['1 近傍法', '15 近傍法', 'ロジスティック（直線）', 'ナイーブベイズ', 'ロジスティック（2 次）'];
const LV1_COL = [[240, 120, 100], [245, 175, 140], [236, 214, 160], [110, 165, 240], [150, 210, 95]];
let trainD, testD, full = [], fold = [], fpos = [], oofF = [], foldDone = 0, autoRun = true, wOOF = null, wIn = null, imgs = [], accs = {};
const CELLS = 60;
function fitLv1(X, y) { return [fitKnn(X, y, 1), fitKnn(X, y, 15), fitLogit(X, y, false), fitNB(X, y), fitLogit(X, y, true)]; }
// ★ メタ学習器の特徴量：1 + 各モデルの確率の対数オッズ（確率は 0.02〜0.98 にはさむ）
function metaFeat(ms, x) { return [1].concat(ms.map((m) => { let p = clampv(probOf(m, x), 0.02, 0.98); return Math.log(p / (1 - p)); })); }
function stackProb(w, x) { return sigm(dotV(w, metaFeat(full, x))); }

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); for (let k = 0; k < 3; k++) imgs.push(createImage(CELLS, CELLS)); selfTest(); restart(); }
function makeFolds(n, kf, seed) { seedRng(seed); let f = new Array(n); shuffleArr(Array.from({ length: n }, (_, i) => i)).forEach((i, q) => (f[i] = q % kf)); return f; }
function restart(noPaint) {
  trainD = makeData2D(kind, nTrain, flipP, seedD); testD = makeData2D(kind, nTest, flipP, seedD + 1000);
  full = fitLv1(trainD.X, trainD.y); fold = makeFolds(nTrain, K_FOLD, seedD * 3 + 1);
  let cnt = new Array(K_FOLD).fill(0); fpos = fold.map((f) => cnt[f]++);   // 分割の中での順番（帯に並べる位置）
  oofF = trainD.X.map(() => null); foldDone = 0; wOOF = null;
  wIn = fitLogitVec(trainD.X.map((x) => metaFeat(full, x)), trainD.y, 1, 30);       // ずるい方法：訓練データでそのまま
  accs = { single: full.map((m) => accuracyOf((x) => predOf(m, x), testD.X, testD.y)), inS: accuracyOf((x) => (stackProb(wIn, x) > 0.5 ? 1 : 0), testD.X, testD.y) };
  if (!noPaint) repaint();
}
// ★ 1 分割ぶん：fold f 以外で 5 つのモデルを学習 → fold f の点の予測を特徴量として記録
function doFold(f) {
  let idx = trainD.X.map((_, i) => i).filter((i) => fold[i] !== f), ms = fitLv1(idx.map((i) => trainD.X[i]), idx.map((i) => trainD.y[i]));
  trainD.X.forEach((x, i) => { if (fold[i] === f) oofF[i] = metaFeat(ms, x); });
}
function finishOOF(noPaint) { wOOF = fitLogitVec(oofF, trainD.y, 1, 30); accs.oof = accuracyOf((x) => (stackProb(wOOF, x) > 0.5 ? 1 : 0), testD.X, testD.y); if (!noPaint) repaint(); }
function repaint() {
  let b = argMaxArr(accs.single);
  paintImage(imgs[0], (u, v) => probCol(probOf(full[b], [u, v]), 0.7));
  paintImage(imgs[1], (u, v) => (wOOF ? probCol(stackProb(wOOF, [u, v]), 0.7) : BG_COL));
  paintImage(imgs[2], (u, v) => probCol(stackProb(wIn, [u, v]), 0.7));
}

function draw() {
  background(...BG_COL);
  if (autoRun && foldDone < K_FOLD && frameCount % 40 === 0) { doFold(foldDone++); if (foldDone === K_FOLD) finishOOF(); }
  let b = argMaxArr(accs.single), side = Math.min(260, (width - 140) / 3 - 20), py = 185;
  let panels = [['1 つだけのベスト：' + LV1[b], accs.single[b]], ['スタッキング（out-of-fold）', wOOF ? accs.oof : null], ['ずるいスタッキング（訓練データで予測）', accs.inS]];
  panels.forEach(([nm, acc], q) => {
    let bx = { x: 40 + q * (side + 40), y: py, w: side, h: side };
    noSmooth(); image(imgs[q], bx.x, bx.y, side, side); smooth(); frameBox(bx, q === 1 ? GOLD : q === 2 ? WINE : null);
    drawPoints(bx, trainD.X, trainD.y, 5);
    noStroke(); fill(...INK); textSize(14); textAlign(LEFT, BASELINE); text(nm, bx.x, bx.y - 26);
    fill(...(q === 1 ? GOLD : q === 2 ? WINE : INK)); text(acc === null ? '（5 分割を計算中…）' : 'テスト正解率 ' + pctStr(acc), bx.x, bx.y - 8);
  });
  // ---- 5 分割の帯
  let sx = 40, sy = 96, sw = (width - 80 - 140) / nTrain;
  noStroke(); fill(200, 185, 170); textSize(13); textAlign(LEFT, CENTER); text('5 分割：', sx, sy + 6);
  for (let i = 0; i < nTrain; i++) { let f = fold[i], done = f < foldDone, now = f === foldDone && foldDone < K_FOLD; fill(...(now ? GOLD : done ? TEAL : [70, 55, 60])); rect(sx + 70 + (f * (nTrain / K_FOLD) + fpos[i]) * sw + f * 6, sy, Math.max(1, sw - 0.5), 12); }
  fill(200, 185, 170); text(foldDone < K_FOLD ? '金 = 次に予測する分割（ほかの 4 つで学習）、青緑 = 予測ずみ' : '全部の点に「見ていないモデルの予測」がそろった', sx + 70, sy + 28);
  // ---- メタ学習器の重み
  let wy = py + side + 60, wx = 40, colW = (width - 120) / 3;
  [['out-of-fold の重み', wOOF, GOLD], ['ずるい方法の重み', wIn, WINE]].forEach(([nm, w], q) => {
    let x0 = wx + q * (colW + 20); noStroke(); fill(...INK); textSize(14); textAlign(LEFT, BASELINE); text('メタ学習器：' + nm, x0, wy);
    if (!w) return;
    let top = Math.max(1, ...w.slice(1).map(Math.abs));
    LV1.forEach((nmk, k) => {
      let yy = wy + 14 + 24 * k, v = w[k + 1], len = (v / top) * (colW - 220) * 0.5, mid = x0 + 170 + (colW - 220) * 0.5;
      fill(...LV1_COL[k]); rect(Math.min(mid, mid + len), yy, Math.abs(len), 16);
      fill(210, 195, 180); textSize(12); textAlign(RIGHT, CENTER); text(nmk, x0 + 160, yy + 8); textAlign(LEFT, CENTER); text(fmtNum(v, 2), mid + Math.max(0, len) + 6, yy + 8);
    });
  });
  // ---- 1 つずつのテスト正解率
  let tx = wx + 2 * (colW + 20); noStroke(); fill(...INK); textSize(14); textAlign(LEFT, BASELINE); text('1 つずつのテスト正解率', tx, wy);
  LV1.forEach((nm, k) => { fill(...LV1_COL[k]); textSize(13); text(nm + '　' + pctStr(accs.single[k]), tx, wy + 26 + 22 * k); });
  fill(170, 155, 145); textSize(12); text('1 近傍法の「訓練」正解率はいつも 100%（自分自身がいちばん近い）', tx, wy + 26 + 22 * 5 + 4, colW);
  // ---- 文字
  fill(...INK); textSize(20); text('スタッキング　データ：' + SHAPES[kind] + '　（メタ学習器はロジスティック回帰、L2 正則化 λ = 1）', 40, 40);
  fill(170, 155, 145); textSize(15); text('スペース 1 分割ずつ　A 自動' + (autoRun ? '（ON）' : '（OFF）') + '　← → データの形　R データを作り直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  if (key === ' ' && foldDone < K_FOLD) { autoRun = false; doFold(foldDone++); if (foldDone === K_FOLD) finishOOF(); }
  if (key === 'a' || key === 'A') autoRun = !autoRun;
  if (key === RIGHT_ARROW) { kind = (kind + 1) % SHAPES.length; restart(); }
  if (key === LEFT_ARROW) { kind = (kind + SHAPES.length - 1) % SHAPES.length; restart(); }
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let sv = [kind, seedD]; kind = 5; seedD = 2; restart(true);
  let part = true; for (let f = 0; f < K_FOLD; f++) if (fold.filter((g) => g === f).length !== nTrain / K_FOLD) part = false;
  check('5 分割：どの点もちょうど 1 つの分割に入り、各分割は 40 点', part && fold.every((f) => f >= 0 && f < K_FOLD));
  for (let f = 0; f < K_FOLD; f++) doFold(f);
  foldDone = K_FOLD; finishOOF(true);
  let oofAcc1 = accuracyOf((x) => x, oofF.map((ft) => (ft[1] > 0 ? 1 : 0)), trainD.y), inAcc1 = accuracyOf((x) => predOf(full[0], x), trainD.X, trainD.y);
  check('1 近傍法の訓練データでの正解率 = 100%（覚えているだけ）、out-of-fold では ' + pctStr(oofAcc1), inAcc1 === 1 && oofAcc1 < 0.9);
  check('ずるい方法ではメタ学習器の重みが 1 近傍法でいちばん大きい（' + fmtNum(wIn[1], 2) + '）', argMaxArr(wIn.slice(1).map(Math.abs)) === 0);
  let best = Math.max(...accs.single);
  check('しまデータ：out-of-fold のスタッキング ' + pctStr(accs.oof) + ' ≥ 1 つだけのベスト ' + pctStr(best) + ' > ずるいスタッキング ' + pctStr(accs.inS), accs.oof >= best && accs.inS < accs.oof);
  let F = oofF, g = new Array(F[0].length).fill(0);
  F.forEach((f, i) => { let r = sigm(dotV(wOOF, f)) - trainD.y[i]; f.forEach((v, a) => (g[a] += r * v)); });
  check('メタ学習器（ニュートン法）の解で、正則化つきの勾配 ≈ 0（' + fmtNum(Math.max(...g.map((v, a) => Math.abs(v + wOOF[a]))), 8) + '）', g.every((v, a) => Math.abs(v + 1 * wOOF[a]) < 1e-6));
  kind = sv[0]; seedD = sv[1];
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. A を止めてスペースで 1 分割ずつ進め、帯の色の変化を見よう。「予測する点は、学習に使っていない」
// 2. ずるい方法の重みは 1 近傍法ばかり大きい。テストではなぜ落ちる？
// 3. ← → でほかのデータでも、out-of-fold のスタッキングは 1 つだけのベストに勝つ？ 負けるのはどんなとき？
// 4. K_FOLD を 2 や 10 にすると？ 分割が少ないと、学習に使える点が減る
// 5. 07 では、場所によって「どのモデルに任せるか」を変える（専門家の混合）

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
