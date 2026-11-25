// ============================================
// 04 フィルタ・平滑化・予測 ─ 工場の機械の調子（正常・不調）は見えず、出てくる製品（良品・不良品）だけが見える。同じ観測から 3 種類の推定ができる：
//   フィルタ　P(z_t | x_1..x_t)　　その時点までの観測だけ（リアルタイム）
//   平滑化　　P(z_t | x_1..x_今)　　あとの観測も使って、前の推定を直す（前向き × 後ろ向き。くわしくはシリーズ 65 の 09）
//   予測　　　P(z_{今+k} | x_1..x_今)　先のこと。フィルタに A を k 回掛ける → だんだん定常分布に戻る
// 固定ラグ平滑化 = L 個だけ先の観測を待ってから答える（少し遅れるかわりに、かなり正確）
// ← → 「今」を動かす / スペース 再生 / ↑↓ ラグ L / X 今の観測を反転 / クリック その時刻を「今」に / R 新しい列
// ============================================

const N_T = 100;                         // ★ 列の長さ
const mach = { p0: [2 / 3, 1 / 3], tr: [[0.95, 0.05], [0.1, 0.9]], em: [[0.9, 0.1], [0.4, 0.6]] };   // ★ 状態 0 = 正常、1 = 不調。観測 0 = 良品、1 = 不良品
let lagL = 5;                            // ★ 固定ラグ平滑化のラグ L
let truth = [], seq = [], nowT = 60, playing = true, cur = null, lagAcc = [], plotBox = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(74); newSequence(); lagAcc = lagAccuracy(4000, 15);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function newSequence() { let s = hmmSample(mach, N_T); truth = s.zs; seq = s.xs; recompute(); }
// ★ 固定ラグ平滑化：P(z_t | x_1..x_{t+L})。フィルタ ah[t] に、t+1〜t+L の観測だけの後ろ向きを掛ける
function fixedLag(m, eb, ah, lag, last) {
  let n = m.p0.length, out = [], end = last === undefined ? eb.length - 1 : last;
  for (let t = 0; t <= end; t++) {
    let be = new Array(n).fill(1);
    for (let s = Math.min(end, t + lag); s > t; s--) { let nb = new Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nb[i] += m.tr[i][j] * eb[s][j] * be[j]; be = normRow(nb); }
    out.push(normRow(ah[t].map((v, i) => v * be[i])));
  }
  return out;
}
function recompute() {                   // 「今」までの観測だけで全部計算する
  let eb = emTable(mach, seq.slice(0, nowT + 1)), sm = smoothAll(mach, eb);
  cur = { filt: sm.filt, smooth: sm.gam, lag: fixedLag(mach, eb, sm.filt, lagL), pred: [] };
  for (let k = 0; nowT + k < N_T + 20; k++) cur.pred.push(predictK(sm.filt[nowT], mach.tr, k));
}
function accOf(ps, zs) { let ok = 0; for (let t = 0; t < ps.length; t++) if (argMax(ps[t]) === zs[t]) ok++; return ok / Math.max(1, ps.length); }
function lagAccuracy(len, maxLag) {      // 長い列で、ラグ L ごとの当たりの割合
  let s = hmmSample(mach, len), eb = emTable(mach, s.xs), ah = fwdScaled(mach, eb).ah, out = [];
  for (let l = 0; l <= maxLag; l++) out.push(accOf(fixedLag(mach, eb, ah, l), s.zs));
  return out;
}

function draw() {
  background(...BG);
  if (playing && frameCount % 10 === 0) { nowT = nowT >= N_T - 1 ? 5 : nowT + 1; recompute(); }
  hudTitle('フィルタ・平滑化・予測：機械が「不調」である確率の 3 本の曲線', '← → 「今」を動かす　スペース 再生 ' + (playing ? 'ON' : 'OFF') + '　↑↓ ラグ L = ' + lagL + '　X 今の観測を反転　クリックで「今」を選ぶ　R 新しい列');
  let g = { x: 70, y: 180, w: width - 130, h: 300, x0: 0, x1: N_T + 20, y0: 0, y1: 1 }; plotBox = g;
  let colW = g.w / (N_T + 20), st = stationaryOf(mach.tr);
  note('本当の調子（ばら色 = 不調）', g.x, g.y - 58, ROSE, 12); note('製品（黄 = 不良品）', g.x + 220, g.y - 58, LAN, 12);
  drawBand(truth, g.x, g.y - 50, colW * N_T, 14, (z) => (z ? ROSE : [58, 68, 86]));
  for (let t = 0; t < N_T; t++) { noStroke(); let seen = t <= nowT; fill(...(seq[t] ? LAN : LINEC), seen ? 255 : 70); rect(g.x + t * colW + 1, g.y - 30, colW - 2, seq[t] ? 16 : 6, 2); }
  plotAxes(g, '時刻 t', '', [0, 20, 40, 60, 80, 100, 120], [0, 0.5, 1]); note('縦 = P(不調)', g.x + 8, g.y + 16, DIMC, 12);
  noStroke(); fill(...INK, 14); rect(gX(g, nowT + 0.5), g.y, g.x + g.w - gX(g, nowT + 0.5), g.h);
  stroke(...DIMC, 120); strokeWeight(1); line(g.x, gY(g, st[1]), g.x + g.w, gY(g, st[1])); line(g.x, gY(g, 0.5), g.x + g.w, gY(g, 0.5));
  note('定常分布 ' + fmtN(st[1], 3), g.x + g.w - 110, gY(g, st[1]) - 5, DIMC, 11);
  drawCurve(g, cur.lag.map((p) => p[1]), LILAC, 2, 0.5);
  drawCurve(g, cur.filt.map((p) => p[1]), AQUA, 2.5, 0.5);
  drawCurve(g, cur.smooth.map((p) => p[1]), LAN, 3, 0.5);
  drawCurve(g, cur.pred.map((p) => p[1]), TANG, 3, nowT + 0.5);
  stroke(...INK); strokeWeight(2); line(gX(g, nowT + 0.5), g.y - 56, gX(g, nowT + 0.5), g.y + g.h);
  note('今 t = ' + (nowT + 1), gX(g, nowT + 0.5) + 6, g.y + 16, INK, 13); note('これから（まだ見ていない）', gX(g, nowT + 0.5) + 6, g.y + g.h - 10, DIMC, 12);
  legend(g.x + 12, g.y + g.h + 56, [[AQUA, 'フィルタ：その時刻までの観測だけ'], [LAN, '平滑化：「今」までの全部の観測（過去の推定が直る）'], [LILAC, '固定ラグ平滑化：L = ' + lagL + ' 個先まで待つ'], [TANG, '予測：今から k 歩先（定常分布へ戻っていく）']]);
  // ---- 当たりの割合
  let px = Math.max(520, width * 0.45), py = g.y + g.h + 44, known = truth.slice(0, nowT + 1);
  note('「今」までの当たりの割合（確率 > 0.5 を不調と判定）', px, py + 6, INK, 14);
  note('フィルタ ' + Math.round(accOf(cur.filt, known) * 100) + '%　固定ラグ ' + Math.round(accOf(cur.lag, known) * 100) + '%　平滑化 ' + Math.round(accOf(cur.smooth, known) * 100) + '%', px, py + 30, INK, 15);
  let g2 = { x: px + 40, y: py + 70, w: Math.min(360, width - px - 90), h: 100, x0: 0, x1: 15, y0: lagAcc[0] - 0.01, y1: lagAcc[15] + 0.01 };
  plotAxes(g2, 'ラグ L', '4000 時刻での当たりの割合', [0, 5, 10, 15], [+lagAcc[0].toFixed(2), +lagAcc[15].toFixed(2)]);
  drawCurve(g2, lagAcc, LILAC, 2.5); noStroke(); fill(...INK); circle(gX(g2, Math.min(15, lagL)), gY(g2, lagAcc[Math.min(15, lagL)]), 9);
  note('L = 0 がフィルタ。少し待つだけでほぼ平滑化に並ぶ', g.x + 12, g.y + g.h + 150, DIMC, 12);
  drawSelfTest();
}

function mousePressed() {
  let g = plotBox; if (!g || mouseX < g.x || mouseX > g.x + g.w || mouseY < g.y - 60 || mouseY > g.y + g.h) return;
  nowT = clampv(Math.floor(((mouseX - g.x) / g.w) * (N_T + 20)), 0, N_T - 1); playing = false; recompute();
}
function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === RIGHT_ARROW) { nowT = Math.min(N_T - 1, nowT + 1); playing = false; recompute(); }
  if (key === LEFT_ARROW) { nowT = Math.max(0, nowT - 1); playing = false; recompute(); }
  if (key === UP_ARROW) { lagL = Math.min(20, lagL + 1); recompute(); }
  if (key === DOWN_ARROW) { lagL = Math.max(0, lagL - 1); recompute(); }
  if (key === 'x' || key === 'X') { seq[nowT] = 1 - seq[nowT]; playing = false; recompute(); }
  if (key === 'r' || key === 'R') newSequence();
  return false;
}

// やってみよう
// 1. → で「今」を 1 つずつ進めて、黄色（平滑化）の過去の部分が書きかわる瞬間を見つけよう。どんな観測が来たとき？
// 2. X で今の観測を反転すると、水色（フィルタ）の過去は変わらないのに、黄色の過去は変わる。なぜ？
// 3. オレンジ（予測）は何歩くらいで定常分布に戻る？ mach.tr の 0.95 を 0.99 にすると？
// 4. ラグ L を 0 → 3 → 10 と変えて、当たりの割合のグラフと見くらべよう

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(740);
  let xs = [0, 1, 1, 0, 1, 0, 0, 1], eb = emTable(mach, xs), sm = smoothAll(mach, eb), bf = bruteAll(mach, eb);
  check('平滑化 γ = 総当たり（256 本）の事後確率', maxAbsDiff(sm.gam, bf.gam) < 1e-12);
  let okXi = true; for (let t = 0; t < 7; t++) { let xi = xiAt(mach, eb, sm, t); if (maxAbsDiff(xi, bf.xi[t]) > 1e-12 || maxAbsDiff(xi.map(sumOf), sm.gam[t]) > 1e-12) okXi = false; }
  check('ξ_t(i, j) = 総当たり、Σ_j ξ_t(i, j) = γ_t(i)', okXi);
  check('最後の時刻では 平滑化 = フィルタ', maxAbsDiff(sm.gam[7], sm.filt[7]) < 1e-12);
  let okF = true; for (let t = 0; t < 8; t++) if (maxAbsDiff(sm.filt[t], bruteAll(mach, eb.slice(0, t + 1)).gam[t]) > 1e-12) okF = false;
  check('フィルタ = 「その時刻までの観測だけ」の総当たりの事後確率', okF);
  let l2 = fixedLag(mach, eb, sm.filt, 2), okL = true; for (let t = 0; t < 8; t++) if (maxAbsDiff(l2[t], bruteAll(mach, eb.slice(0, Math.min(8, t + 3))).gam[t]) > 1e-12) okL = false;
  check('固定ラグ L = 2：P(z_t | x_1..x_{t+2}) = 総当たり', okL);
  check('ラグ 0 = フィルタ、ラグ ≥ 列の長さ = 平滑化', maxAbsDiff(fixedLag(mach, eb, sm.filt, 0), sm.filt) < 1e-12 && maxAbsDiff(fixedLag(mach, eb, sm.filt, 99), sm.gam) < 1e-12);
  let st = stationaryOf(mach.tr);
  check('予測：0 歩先 = フィルタ、1 歩先 = フィルタ × A、300 歩先 = 定常分布 (2/3, 1/3)', maxAbsDiff(predictK(sm.filt[7], mach.tr, 0), sm.filt[7]) === 0 && maxAbsDiff(predictK(sm.filt[7], mach.tr, 1), vecMat(sm.filt[7], mach.tr)) < 1e-15 && maxAbsDiff(predictK(sm.filt[7], mach.tr, 300), st) < 1e-9 && near(st[1], 1 / 3, 1e-9));
  let p1 = predictK(sm.filt[3], mach.tr, 2), b1 = bruteAll(mach, eb.slice(0, 4).concat([[1, 1], [1, 1]]));
  check('2 歩先の予測 = 「先の観測は何でもよい」とした総当たり', maxAbsDiff(p1, b1.gam[5]) < 1e-12);
  let la = lagAccuracy(20000, 8);
  check('2 万時刻の当たりの割合：フィルタ ' + Math.round(la[0] * 100) + '% < ラグ 3 ' + Math.round(la[3] * 100) + '% ≤ ラグ 8 ' + Math.round(la[8] * 100) + '%', la[0] < la[3] - 0.01 && la[3] <= la[8] + 0.005);
  let ys = xs.slice(); ys[6] = 1 - ys[6]; let sm2 = smoothAll(mach, emTable(mach, ys));
  check('あとの観測（7 番目）を変えると：それより前のフィルタは同じ、平滑化は変わる', maxAbsDiff(sm.filt.slice(0, 6), sm2.filt.slice(0, 6)) === 0 && Math.abs(sm.gam[4][1] - sm2.gam[4][1]) > 0.01);
  reportSelfTest();
}

// ==================================================
// ここから下は「HMM の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（霧の夜と灯り：黄 = 見える観測、ばら色 = 隠れた状態）
const BG = [27, 33, 44];                // 背景（霧の夜の青ねずみ色）
const INK = [230, 234, 240];            // 文字（やわらかい白）
const LAN = [250, 208, 100], ROSE = [236, 124, 150], AQUA = [110, 200, 210], LILAC = [176, 156, 236], LEAF = [150, 210, 130], TANG = [240, 160, 96];
const DIMC = [142, 154, 172], PANEL = [38, 46, 60], LINEC = [76, 88, 108];
const ST_COLS = [ROSE, AQUA, LAN, LILAC, LEAF, TANG, [200, 200, 210], [130, 150, 240]];   // 状態の色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function argMax(a) { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; }   // 同点なら小さい番号
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtP(v) {                      // 確率の表示：小さい数は 1.2e-5 の形で
  if (typeof v !== 'number' || v !== v) return '?';
  if (v === 0) return '0'; if (Math.abs(v) >= 0.001) return v.toFixed(v >= 0.1 ? 3 : 4); return v.toExponential(1);
}
function hudTitle(t, sub) {             // 左上の見出しと操作の説明（日本語は 1 文字ずつ折り返す）
  textWrap(CHAR); noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62, width - 60);
}
function panelBox(x, y, w, h) { noStroke(); fill(...PANEL); rect(x, y, w, h, 8); }
function note(s, x, y, col, sz) { noStroke(); fill(...(col || DIMC)); textSize(sz || 13); textAlign(LEFT, BASELINE); text(s, x, y); }
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
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
// ---- 隠れマルコフモデルの道具
// モデル m = { p0: はじめの分布 π, tr: 遷移行列 A（tr[i][j] = 状態 i の次に j）, em: 出力行列 B（em[j][k] = 状態 j が記号 k を出す） }
// どの計算も「出力の表」eb[t][j] = b_j(x_t)（時刻 t の観測を状態 j が出す確率）を受け取る → 記号でも数（正規分布）でも同じ道具が使える
function lg(p) { return p > 0 ? Math.log(p) : -Infinity; }          // log 0 は −∞（NaN にしない）
function logSumExp(a) {                // log(Σ e^a_i)：いちばん大きい値を先に引く。全部 −∞ なら −∞
  let m = -Infinity; for (let v of a) if (v > m) m = v;
  if (m === -Infinity) return -Infinity;
  let s = 0; for (let v of a) s += Math.exp(v - m);
  return m + Math.log(s);
}
function normRow(r) { let s = sumOf(r); return s > 1e-300 ? r.map((v) => v / s) : r.map(() => 1 / r.length); }   // 合計 1 に（全部 0 なら一様に）
function rowSumErr(a) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - 1)); return d; }
function maxAbsDiff(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d = Math.max(d, Array.isArray(a[i]) ? maxAbsDiff(a[i], b[i]) : Math.abs(a[i] - b[i])); return d; }
function vecMat(v, a) {                // 横ベクトル × 行列：1 歩先の分布
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function emTable(m, xs) { return xs.map((x) => m.em.map((r) => r[x])); }   // 記号の列 → 出力の表
function hmmSample(m, n) {             // π, A, B からサイコロで列を作る：zs = 隠れた状態、xs = 観測
  let z = sampleFrom(m.p0), zs = [], xs = [];
  for (let t = 0; t < n; t++) { if (t > 0) z = sampleFrom(m.tr[z]); zs.push(z); xs.push(sampleFrom(m.em[z])); }
  return { zs, xs };
}
// ★ 前向き：α_t(j) = P(x_1..x_t, z_t = j) = b_j(x_t) Σ_i α_{t−1}(i) a_ij。尤度 P(x) = Σ_j α_T(j)
function fwdPlain(m, eb) {
  let n = m.p0.length, al = [];
  for (let t = 0; t < eb.length; t++) {
    let prev = t === 0 ? null : al[t - 1], row = new Array(n);
    for (let j = 0; j < n; j++) { let s = 0; if (t === 0) s = m.p0[j]; else for (let i = 0; i < n; i++) s += prev[i] * m.tr[i][j]; row[j] = s * eb[t][j]; }
    al.push(row);
  }
  return { al, lik: al.length ? sumOf(al[al.length - 1]) : 1 };
}
// ★ 後ろ向き：β_t(i) = P(x_{t+1}..x_T | z_t = i) = Σ_j a_ij b_j(x_{t+1}) β_{t+1}(j)。尤度 = Σ_i π_i b_i(x_1) β_1(i)
function bwdPlain(m, eb) {
  let n = m.p0.length, len = eb.length, be = new Array(len);
  for (let t = len - 1; t >= 0; t--) {
    be[t] = new Array(n).fill(t === len - 1 ? 1 : 0);
    if (t < len - 1) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) be[t][i] += m.tr[i][j] * eb[t + 1][j] * be[t + 1][j];
  }
  let lik = 0; if (len) for (let i = 0; i < n; i++) lik += m.p0[i] * eb[0][i] * be[0][i]; else lik = 1;
  return { be, lik };
}
// ★ スケーリングつきの前向き：毎時刻 合計 c_t で割る。ah[t] = P(z_t | x_1..x_t)（= フィルタ）、log P(x) = Σ log c_t
//   c_t = 0（ありえない観測）なら logLik = −∞ にして、その時刻は一様分布で先へ進む（NaN を作らない）
function fwdScaled(m, eb) {
  let n = m.p0.length, ah = [], cs = [], logLik = 0;
  for (let t = 0; t < eb.length; t++) {
    let pred = t === 0 ? m.p0 : vecMat(ah[t - 1], m.tr), row = pred.map((v, j) => v * eb[t][j]), c = sumOf(row);
    if (!(c > 0)) { logLik = -Infinity; row = new Array(n).fill(1 / n); c = 0; } else { row = row.map((v) => v / c); if (logLik !== -Infinity) logLik += Math.log(c); }
    ah.push(row); cs.push(c);
  }
  return { ah, cs, logLik };
}
function bwdScaled(m, eb, cs) {         // 同じ c_t で割った後ろ向き。γ_t(i) = ah[t][i] × bh[t][i]
  let n = m.p0.length, len = eb.length, bh = new Array(len);
  for (let t = len - 1; t >= 0; t--) {
    bh[t] = new Array(n).fill(t === len - 1 ? 1 : 0);
    if (t < len - 1) { let c = cs[t + 1] > 0 ? cs[t + 1] : 1; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += m.tr[i][j] * eb[t + 1][j] * bh[t + 1][j]; bh[t][i] = s / c; } }
  }
  return bh;
}
function fwdLog(m, eb) {                // 対数のまま：log α_t(j) = log b_j(x_t) + logSumExp_i(log α_{t−1}(i) + log a_ij)
  let n = m.p0.length, la = [], lt = m.tr.map((r) => r.map(lg)), buf = new Array(n);
  for (let t = 0; t < eb.length; t++) {
    let row = new Array(n);
    for (let j = 0; j < n; j++) { let s; if (t === 0) s = lg(m.p0[j]); else { for (let i = 0; i < n; i++) buf[i] = la[t - 1][i] + lt[i][j]; s = logSumExp(buf); } row[j] = s + lg(eb[t][j]); }
    la.push(row);
  }
  return { la, logLik: la.length ? logSumExp(la[la.length - 1]) : 0 };
}
// ★ 平滑化：γ_t(i) = P(z_t = i | 全部の観測)。filt = フィルタ P(z_t | x_1..x_t)
function smoothAll(m, eb) {
  let f = fwdScaled(m, eb), bh = bwdScaled(m, eb, f.cs);
  let gam = f.ah.map((a, t) => normRow(a.map((v, i) => v * bh[t][i])));
  return { filt: f.ah, gam, bh, cs: f.cs, logLik: f.logLik };
}
function xiAt(m, eb, sm, t) {           // ξ_t(i, j) = P(z_t = i, z_{t+1} = j | 全部の観測)
  let n = m.p0.length, c = sm.cs[t + 1] > 0 ? sm.cs[t + 1] : 1, out = [];
  for (let i = 0; i < n; i++) { out.push(new Array(n)); for (let j = 0; j < n; j++) out[i][j] = (sm.filt[t][i] * m.tr[i][j] * eb[t + 1][j] * sm.bh[t + 1][j]) / c; }
  return out;
}
// ★ ビタビ（対数）：dl[t][j] = 時刻 t に状態 j で終わるいちばん良い道の log 確率、bp[t][j] = そのとき 1 つ前にいた状態（戻り矢印）
function viterbiLog(m, eb) {
  let n = m.p0.length, len = eb.length, dl = [], bp = [], lt = m.tr.map((r) => r.map(lg));
  for (let t = 0; t < len; t++) {
    let row = new Array(n), back = new Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      let best = -Infinity, arg = -1;
      if (t === 0) best = lg(m.p0[j]); else for (let i = 0; i < n; i++) { let v = dl[t - 1][i] + lt[i][j]; if (v > best) { best = v; arg = i; } }
      row[j] = best + lg(eb[t][j]); back[j] = arg;
    }
    dl.push(row); bp.push(back);
  }
  let vitPath = new Array(len).fill(0), logP = len ? -Infinity : 0;
  if (len) { let z = argMax(dl[len - 1]); logP = dl[len - 1][z]; for (let t = len - 1; t >= 0; t--) { vitPath[t] = z; z = bp[t][z] >= 0 ? bp[t][z] : 0; } }
  return { vitPath, logP, dl, bp };
}
function pathLogProb(m, eb, zs) {       // 1 本の道 zs と観測がいっしょに起きる log 確率
  let s = 0; for (let t = 0; t < zs.length; t++) s += (t === 0 ? lg(m.p0[zs[0]]) : lg(m.tr[zs[t - 1]][zs[t]])) + lg(eb[t][zs[t]]);
  return s;
}
function postDecode(gam) { return gam.map(argMax); }                 // 事後復号：時刻ごとにいちばんありそうな状態
// ★ 総当たり：N^T 本の道を全部ためす（短い列だけ）。尤度、γ、ξ、いちばん良い道
function bruteAll(m, eb) {
  let n = m.p0.length, len = eb.length, total = Math.pow(n, len), zs = new Array(len).fill(0);
  let lik = 0, gam = eb.map(() => new Array(n).fill(0)), xi = eb.slice(1).map(() => m.p0.map(() => new Array(n).fill(0))), bestP = -1, best = null;
  for (let k = 0; k < total; k++) {
    let r = k; for (let t = len - 1; t >= 0; t--) { zs[t] = r % n; r = Math.floor(r / n); }
    let p = 1; for (let t = 0; t < len && p > 0; t++) p *= (t === 0 ? m.p0[zs[0]] : m.tr[zs[t - 1]][zs[t]]) * eb[t][zs[t]];
    if (p > bestP) { bestP = p; best = zs.slice(); }
    if (p === 0) continue;
    lik += p; for (let t = 0; t < len; t++) { gam[t][zs[t]] += p; if (t > 0) xi[t - 1][zs[t - 1]][zs[t]] += p; }
  }
  if (lik > 0) { gam = gam.map((g) => g.map((v) => v / lik)); xi = xi.map((x) => x.map((r) => r.map((v) => v / lik))); }
  return { lik, gam, xi, best, bestP, paths: total };
}
function stationaryOf(tr) {             // 定常分布 π A = π（なまけた連鎖 (π + πA)/2 をくり返す。周期があっても収束する）
  let v = new Array(tr.length).fill(1 / tr.length);
  for (let k = 0; k < 4000; k++) { let w = vecMat(v, tr), d = 0; for (let i = 0; i < v.length; i++) { let u = (v[i] + w[i]) / 2; d = Math.max(d, Math.abs(u - v[i])); v[i] = u; } if (d < 1e-15) break; }
  return normRow(v);
}
function hmmLogLik(m, xs) { return fwdScaled(m, emTable(m, xs)).logLik; }   // 記号の列の対数尤度 log P(x)
function predictK(belief, tr, k) { let v = belief.slice(); for (let s = 0; s < k; s++) v = vecMat(v, tr); return v; }   // k 歩先の予測：A を k 回掛ける
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...LINEC); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...DIMC); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(4), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(4), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawCurve(g, arr, col, sw, xOff, from, to) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let a = from || 0, b = to === undefined ? arr.length : to, n = b - a, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = a; i < b; i += stride) if (isFinite(arr[i])) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10, 2); fill(...INK); text(s, x + 22, y); y += 20; }
}
function drawMatrix(a, x, y, cw, ch, rowNames, colNames, opts) {   // 行列を色つきの表で（明るい = 大きい）
  opts = opts || {}; let d = opts.digits === undefined ? 2 : opts.digits, col = opts.col || AQUA;
  textAlign(CENTER, CENTER); textSize(opts.ts || 13);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) {
    let v = a[i][j], t = clampv(Math.abs(v) / (opts.hi || 1), 0, 1); noStroke();
    fill(PANEL[0] + t * (col[0] * 0.75 - PANEL[0]), PANEL[1] + t * (col[1] * 0.75 - PANEL[1]), PANEL[2] + t * (col[2] * 0.75 - PANEL[2])); rect(x + j * cw, y + i * ch, cw - 2, ch - 2, 3);
    if (opts.numbers !== false) { fill(...INK); text(fmtN(v, d), x + j * cw + cw / 2, y + i * ch + ch / 2); }
  }
  fill(...DIMC);
  if (rowNames) for (let i = 0; i < a.length; i++) { textAlign(RIGHT, CENTER); text(rowNames[i], x - 6, y + i * ch + ch / 2); }
  if (colNames) for (let j = 0; j < a[0].length; j++) { textAlign(CENTER, BOTTOM); text(colNames[j], x + j * cw + cw / 2, y - 3); }
}
function drawBand(arr, x, y, w, h, colOf) {   // 状態の列を色の帯で（同じ色が続くところは 1 つの四角にまとめる）
  let n = arr.length, s = 0; noStroke();
  for (let t = 1; t <= n; t++) if (t === n || arr[t] !== arr[s]) { let c = colOf(arr[s]); if (c) { fill(...c); rect(x + (s / n) * w, y, ((t - s) / n) * w + 0.6, h); } s = t; }
}
function arrowLine(x1, y1, x2, y2, hs) { // 矢印
  let L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L; hs = hs || 7;
  line(x1, y1, x2 - ux * hs * 0.6, y2 - uy * hs * 0.6);
  push(); noStroke(); triangle(x2, y2, x2 - ux * hs - uy * hs * 0.5, y2 - uy * hs + ux * hs * 0.5, x2 - ux * hs + uy * hs * 0.5, y2 - uy * hs - ux * hs * 0.5); pop();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return typeof a === 'number' && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LEAF : [255, 90, 90])); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x === undefined ? width - 170 : x, y === undefined ? height - 14 : y); }
