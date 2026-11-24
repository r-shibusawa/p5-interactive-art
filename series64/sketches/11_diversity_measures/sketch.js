// ============================================
// 11 多様性の測り方 ─ 2 つのモデルの「当たり/はずれ」を 2 × 2 の表にして、似ている度合いを数で測る
// N11 = 両方当たり、N00 = 両方はずれ、N10・N01 = 片方だけ当たり。テストの点 N 個で数える
//   不一致率 = (N10 + N01)/N、Q 統計量 = (N11·N00 − N10·N01)/(N11·N00 + N10·N01)、相関 ρ = 当たり/はずれ（0/1）の相関係数
//   Q と ρ は −1〜1。1 に近い = 同じ所でまちがう（多数決しても伸びない）、0 = 独立、負 = 互いに補い合う
//   6・7 はロジスティック回帰（2）の「ほぼコピー」（ブートストラップで学習）。2・6・7 の多数決は 2 とほとんど同じ
//   右下 = 3 つ組 35 通り：横 = 平均の Q、縦 = 多数決で伸びた分（多数決の正解率 − 3 つの平均）
// 1〜7 モデルを入れる/外す / M 表の物差し / D いちばん伸びる 3 つ（コピーなし）/ C コピー 3 つ / R データを作り直す
// ============================================

let kind = 4, nTrain = 200, nTest = 1000, flipP = 0.1, seedD = 6, measure = 1;   // ★ measure：0 不一致率、1 Q、2 ρ
const NAMES7 = ['k 近傍法', 'ロジスティック', 'ナイーブベイズ', 'ネット', '切り株', 'ロジ（コピー 1）', 'ロジ（コピー 2）'];
const COL7 = [[240, 120, 100], [236, 214, 160], [110, 165, 240], [190, 135, 235], [150, 210, 95], [215, 190, 130], [195, 170, 110]];
const MEAS = ['不一致率', 'Q 統計量', '相関 ρ'];
let trainD, testD, models = [], correct = [], probs = [], use = [true, false, true, true, false, false, false], mlpLeft = 0, triples = [], bestTri = [0, 2, 3];

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); pixelDensity(1); selfTest(); restart(); }
function restart() {
  trainD = makeData2D(kind, nTrain, flipP, seedD); testD = makeData2D(kind, nTest, flipP, seedD + 400);
  models = [fitBase(0, trainD.X, trainD.y), fitBase(1, trainD.X, trainD.y), fitBase(2, trainD.X, trainD.y), { type: 'mlp', net: makeMLP(2, 10, true, 7) }, fitBase(4, trainD.X, trainD.y)];
  seedRng(seedD * 5);
  for (let c = 0; c < 2; c++) { let b = bootIdx(nTrain); models.push(fitLogit(b.map((i) => trainD.X[i]), b.map((i) => trainD.y[i]), false)); }   // ほぼコピー
  mlpLeft = 300; refresh();
}
function bootIdx(n) { let a = []; for (let k = 0; k < n; k++) a.push(Math.floor(rnd() * n)); return a; }
function refresh() {
  probs = models.map((m) => testD.X.map((x) => probOf(m, x)));          // テストの点での確率（先に計算しておく）
  correct = probs.map((pk) => pk.map((p, i) => ((p > 0.5 ? 1 : 0) === testD.y[i] ? 1 : 0)));
  triples = [];
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 7; c++) {
    let ids = [a, b, c], q = meanOf([pairStats(correct[a], correct[b]).q, pairStats(correct[a], correct[c]).q, pairStats(correct[b], correct[c]).q]);
    triples.push({ ids, q, gain: majAcc(ids) - meanOf(ids.map((k) => meanOf(correct[k]))) });
  }
  bestTri = triples.filter((t) => t.ids.every((k) => k < 5)).sort((a, b) => b.gain - a.gain)[0].ids;   // コピーを使わない 3 つ組で、いちばん伸びる組
  if (mlpLeft <= 0) use = [0, 1, 2, 3, 4, 5, 6].map((k) => bestTri.includes(k));
}
// ★ 2 × 2 の表と 3 つの物差し（分母が 0 のとき：まったく同じ当たり方なら 1、それ以外は 0）
function pairStats(ca, cb) {
  let n11 = 0, n10 = 0, n01 = 0, n00 = 0;
  for (let i = 0; i < ca.length; i++) { if (ca[i] && cb[i]) n11++; else if (ca[i]) n10++; else if (cb[i]) n01++; else n00++; }
  let same = n10 + n01 === 0, dq = n11 * n00 + n10 * n01, dr = Math.sqrt((n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00));
  return { n11, n10, n01, n00, dis: (n10 + n01) / ca.length, q: dq > 0 ? (n11 * n00 - n10 * n01) / dq : same ? 1 : 0, rho: dr > 0 ? (n11 * n00 - n10 * n01) / dr : same ? 1 : 0 };
}
function majAcc(ids) { let ok = 0; for (let i = 0; i < nTest; i++) { let s = 0, ps = 0; for (let k of ids) { s += correct[k][i] ? (testD.y[i] ? 1 : 0) : testD.y[i] ? 0 : 1; ps += probs[k][i]; } let v = 2 * s > ids.length ? 1 : 2 * s < ids.length ? 0 : ps / ids.length > 0.5 ? 1 : 0; if (v === testD.y[i]) ok++; } return ok / nTest; }
function measOf(st) { return [st.dis, st.q, st.rho][measure]; }

function draw() {
  background(...BG_COL);
  if (mlpLeft > 0) { mlpTrain(models[3].net, trainD.X.map(centerX), trainD.y, 15, 0.03); mlpLeft -= 15; if (mlpLeft <= 0) refresh(); }
  // ---- 左：7 × 7 の表
  let cs = Math.min(64, (height - 260) / 7), gx = 190, gy = 130;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('組ごとの ' + MEAS[measure] + '（M で切りかえ）', 40, gy - 30);
  for (let a = 0; a < 7; a++) {
    fill(...COL7[a]); textSize(12); textAlign(RIGHT, CENTER); text((a + 1) + ' ' + NAMES7[a] + ' ' + pctStr(meanOf(correct[a])), gx - 8, gy + a * cs + cs / 2);
    textAlign(CENTER, BOTTOM); text(a + 1, gx + a * cs + cs / 2, gy - 4);
    for (let b = 0; b < 7; b++) {
      let st = pairStats(correct[a], correct[b]), v = measOf(st), t = measure === 0 ? 1 - Math.min(1, v * 3) : clampv(v, 0, 1);
      fill(BG_COL[0] + t * (WINE[0] - BG_COL[0]) + (1 - t) * (TEAL[0] - BG_COL[0]) * 0.6, BG_COL[1] + t * (WINE[1] - BG_COL[1]) + (1 - t) * (TEAL[1] - BG_COL[1]) * 0.6, BG_COL[2] + t * (WINE[2] - BG_COL[2]) + (1 - t) * (TEAL[2] - BG_COL[2]) * 0.6);
      stroke(use[a] && use[b] ? 255 : 40); strokeWeight(use[a] && use[b] ? 1.5 : 1); rect(gx + b * cs, gy + a * cs, cs, cs);
      noStroke(); fill(240); textAlign(CENTER, CENTER); textSize(11); text(fmtNum(v, 2), gx + b * cs + cs / 2, gy + a * cs + cs / 2);
    }
  }
  fill(170, 155, 145); textSize(12); textAlign(LEFT, BASELINE);
  text('赤 = 似ている（同じ所でまちがう）、青緑 = ちがう。白い枠 = 選んだモデルどうし', 40, gy + 7 * cs + 24, gx + 7 * cs - 40);
  // ---- 右上：選んだモデルの多数決
  let rx = gx + 7 * cs + 70, ids = [0, 1, 2, 3, 4, 5, 6].filter((k) => use[k]), ty = 120;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('選んだモデル：' + (ids.length ? ids.map((k) => k + 1).join('・') : 'なし'), rx, ty);
  if (ids.length) {
    let ind = meanOf(ids.map((k) => meanOf(correct[k]))), mj = majAcc(ids), prs = [];
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) prs.push(pairStats(correct[ids[a]], correct[ids[b]]));
    fill(220, 210, 195); textSize(14);
    text('1 つずつの平均 ' + pctStr(ind) + '　→　多数決 ' + pctStr(mj) + '（' + (mj >= ind ? '+' : '') + pctStr(mj - ind) + '）', rx, ty + 28);
    if (prs.length) text('組の平均：不一致率 ' + fmtNum(meanOf(prs.map((p) => p.dis)), 3) + '　Q ' + fmtNum(meanOf(prs.map((p) => p.q)), 3) + '　ρ ' + fmtNum(meanOf(prs.map((p) => p.rho)), 3), rx, ty + 52);
    if (ids.length === 3) text('もしまちがいが独立なら：p³ + 3p²(1 − p) ≈ ' + pctStr(ind ** 3 + 3 * ind ** 2 * (1 - ind)) + '（p = 平均の正解率）', rx, ty + 76);
  }
  // ---- 右下：3 つ組 35 通り
  let g = { x: rx + 30, y: ty + 140, w: width - rx - 90, h: height - ty - 260, x0: -0.2, x1: 1, y0: -0.06, y1: 0.08 };
  plotAxes(g, '3 つの組の平均の Q', '3 つ組 35 通り：多数決で伸びた分（正解率の差）', [-0.2, 0, 0.5, 1], [-0.05, 0, 0.05]);
  stroke(110, 80, 85); line(g.x, gY(g, 0), g.x + g.w, gY(g, 0));
  for (let tr of triples) { let on = tr.ids.every((k) => use[k]) && ids.length === 3; noStroke(); fill(...(on ? GOLD : tr.ids.filter((k) => k >= 5).length + tr.ids.includes(1) >= 2 ? WINE : TEAL), on ? 255 : 170); circle(gX(g, tr.q), gY(g, tr.gain), on ? 16 : 8); }
  legend(g.x + g.w - 230, g.y + 14, [[TEAL, 'ふつうの組'], [WINE, 'ロジスティックとコピーが 2 つ以上'], [GOLD, 'いま選んだ 3 つ']]);
  // ---- 文字
  fill(...INK); textSize(20); textAlign(LEFT, BASELINE); text('多様性の測り方　データ：' + SHAPES[kind] + (mlpLeft > 0 ? '　（ネットを学習中…）' : ''), 40, 40);
  fill(170, 155, 145); textSize(15); text('1〜7 入れる/外す　M 物差し　D いちばん伸びる 3 つ　C コピー 3 つ　R データを作り直す', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function keyPressed() {
  for (let k = 1; k <= 7; k++) if (key === String(k)) use[k - 1] = !use[k - 1];
  if (key === 'm' || key === 'M') measure = (measure + 1) % 3;
  if (key === 'd' || key === 'D') use = [0, 1, 2, 3, 4, 5, 6].map((k) => bestTri.includes(k));
  if (key === 'c' || key === 'C') use = [false, true, false, false, false, true, true];
  if (key === 'r' || key === 'R') { seedD++; restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  kind = 4; seedD = 6; restart(); mlpTrain(models[3].net, trainD.X.map(centerX), trainD.y, 300, 0.03); mlpLeft = 0; refresh();
  let okR = true, okSign = true, okP = true;
  for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) {
    let st = pairStats(correct[a], correct[b]);
    if (!(st.q >= -1 && st.q <= 1 && st.rho >= -1 && st.rho <= 1 && st.dis >= 0 && st.dis <= 1)) okR = false;
    if (st.q * st.rho < -1e-12) okSign = false;
    let ma = meanOf(correct[a]), mb = meanOf(correct[b]), cov = 0, va = 0, vb = 0;     // ふつうのピアソンの相関係数
    for (let i = 0; i < nTest; i++) { cov += (correct[a][i] - ma) * (correct[b][i] - mb); va += (correct[a][i] - ma) ** 2; vb += (correct[b][i] - mb) ** 2; }
    if (va > 0 && vb > 0 && Math.abs(cov / Math.sqrt(va * vb) - st.rho) > 1e-9) okP = false;
  }
  check('49 組すべてで Q・ρ は −1〜1、不一致率は 0〜1', okR);
  check('ρ = 当たり/はずれ（0/1）のピアソンの相関係数（1e-9）、Q と ρ は同じ符号', okP && okSign);
  let self = pairStats(correct[2], correct[2]), allOk = pairStats([1, 1, 1], [1, 1, 1]);
  check('同じモデルどうし：Q = 1、ρ = 1、不一致率 = 0（全部当たりの 0/0 の場合も 1）', self.q === 1 && self.rho === 1 && self.dis === 0 && allOk.q === 1 && allOk.rho === 1);
  let cl = majAcc([1, 5, 6]), lo = meanOf(correct[1]), dv = majAcc(bestTri), dvi = meanOf(bestTri.map((k) => meanOf(correct[k])));
  let qOf = (ids) => meanOf([pairStats(correct[ids[0]], correct[ids[1]]).q, pairStats(correct[ids[0]], correct[ids[2]]).q, pairStats(correct[ids[1]], correct[ids[2]]).q]);
  check('コピー 3 つ：Q ' + fmtNum(qOf([1, 5, 6]), 2) + '、多数決 ' + pctStr(cl) + ' ≈ ロジスティック 1 つ ' + pctStr(lo) + '（1% 以内）', Math.abs(cl - lo) <= 0.01 && qOf([1, 5, 6]) > 0.95);
  check('いちばん伸びる 3 つ（' + bestTri.map((k) => k + 1).join('・') + '）：Q ' + fmtNum(qOf(bestTri), 2) + ' < コピー 3 つ、多数決で +' + pctStr(dv - dvi), qOf(bestTri) < qOf([1, 5, 6]) && dv - dvi > 0.02 && dv - dvi > cl - lo);
  seedRng(21); let T = 20000, mj = 0, c3 = [[], [], []];
  for (let t = 0; t < T; t++) { let v = [0, 1, 2].map(() => (rnd() < 0.7 ? 1 : 0)); v.forEach((x, k) => c3[k].push(x)); if (sumArr(v) >= 2) mj++; }
  let qi = pairStats(c3[0], c3[1]).q;
  check('独立にまちがう 3 つ（p = 0.7）：多数決 ' + pctStr(mj / T) + ' ≈ p³ + 3p²(1 − p) = 78.4%、Q ≈ 0（' + fmtNum(qi, 3) + '）', Math.abs(mj / T - 0.784) < 0.01 && Math.abs(qi) < 0.05);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. C（コピー 3 つ）と D（いちばん伸びる 3 つ）を押しくらべよう。多数決で伸びる分は？ 表の Q は？
// 2. M で 3 つの物差しを切りかえよう。順位（どの組がいちばん似ているか）は同じ？
// 3. 右下の 35 点で、Q が小さい組ほど伸びが大きい？ 例外はどんな組？（弱いモデルが 2 つ入ると…）
// 4. 5（切り株）は弱いが、ほかと「ちがう」。入れると多数決は上がる？ 下がる？
// 5. 02〜03 の「平均でばらつきが減る」・01 の「独立なら多数決は強い」を、ここでは実際のモデルで測っている

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
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95, 70, 75); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(175, 160, 150); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(215, 205, 190); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER); noStroke();
  items.forEach(([c, s], k) => { fill(...c); rect(x, y + 20 * k - 5, 14, 10, 2); fill(220, 210, 195); text(s, x + 22, y + 20 * k); });
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(140, 215, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
