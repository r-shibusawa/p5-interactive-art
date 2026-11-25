// ============================================
// 05 バウム-ウェルチ（EM）で学習 ─ 森の鳥の気分（元気・つかれ）は見えず、鳴き声（ピー・チュン・だまる）の列だけが 600 個ある。
// 観測だけから A と B を学ぶ：
//   E ステップ　いまのモデルで γ_t(i)（時刻 t に状態 i にいた確率）と ξ_t(i, j)（i → j と動いた確率）を計算
//   M ステップ　A_ij = Σ ξ(i, j) / Σ γ(i)、B_i(k) = （k が出た時刻の γ(i) の合計）/ Σ γ(i)　…「期待回数」の割り算
// くり返すたびに対数尤度は必ず上がる（か同じ）。出発点によって別の山に登ることがあり、状態の番号は本物と入れかわることがある（ラベルの入れかえ）
// （混合正規分布の EM はシリーズ 61 の 08、EM の幾何はシリーズ 67 の 09）
// スペース EM を 1 回 / A 自動 / N 新しい出発点 / 1 全部同じ（動けない）2 でたらめ 3 番号が逆 / R 全部やり直し
// ============================================

const BIRD_STATES = ['元気', 'つかれ'], BIRD_OBS = ['ピー', 'チュン', 'だまる'];
const TRUE_BIRD = { p0: [0.5, 0.5], tr: [[0.9, 0.1], [0.2, 0.8]], em: [[0.7, 0.2, 0.1], [0.1, 0.3, 0.6]] };   // ★ データを作る本当のモデル（学習には見せない）
const N_OBS = 600;                       // ★ 観測の数
const MAX_IT = 80;
let data = null, runs = [], auto = true, trueLL = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(75); data = hmmSample(TRUE_BIRD, N_OBS); trueLL = hmmLogLik(TRUE_BIRD, data.xs); runs = []; addRun(randomHmm(2, 3), 'でたらめ');
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function addRun(start, name) { runs.push({ cur: start, lls: [hmmLogLik(start, data.xs)], name }); if (runs.length > 6) runs.shift(); }
function emOnce(run) {                   // ★ EM を 1 回（E ステップ + M ステップ）
  if (run.lls.length > MAX_IT) return;
  run.cur = baumWelchStep(run.cur, [data.xs]).m; run.lls.push(hmmLogLik(run.cur, data.xs));
}
function presetStart(k) {
  if (k === 1) return { p0: [0.5, 0.5], tr: [[0.5, 0.5], [0.5, 0.5]], em: [[1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3]] };
  if (k === 3) return { p0: [0.5, 0.5], tr: [[0.7, 0.3], [0.2, 0.8]], em: [[0.2, 0.3, 0.5], [0.6, 0.3, 0.1]] };
  return randomHmm(2, 3);
}
// ★ ラベルの入れかえを直す：出力行列 B の行が本物といちばん近くなるように状態の番号を並べかえる
function alignToTruth(m, truth) { let p = bestPerm(m.p0.length, (i, j) => rowDist(truth.em[i], m.em[j])); return { m: permuteHmm(m, p), perm: p }; }

function draw() {
  background(...BG);
  let run = runs[runs.length - 1];
  if (auto && frameCount % 5 === 0) emOnce(run);
  hudTitle('バウム-ウェルチ（EM）：観測だけから A と B を学ぶ　' + (run.lls.length - 1) + ' 回め', 'スペース EM を 1 回　A 自動 ' + (auto ? 'ON' : 'OFF') + '　N 新しい出発点　1 全部同じ　2 でたらめ　3 番号が逆　R 全部やり直し');
  // ---- 対数尤度のグラフ
  let lo = Math.min(...runs.map((r) => r.lls[Math.min(1, r.lls.length - 1)])) - 4, hi = Math.max(trueLL, ...runs.map((r) => r.lls[r.lls.length - 1])) + 3;
  let g = { x: 80, y: 130, w: Math.min(520, width * 0.42), h: 280, x0: 0, x1: MAX_IT, y0: lo, y1: hi };
  plotAxes(g, 'EM の回数', '対数尤度 log P(x)（上がるだけ）', [0, 20, 40, 60, 80], [Math.round(lo), Math.round(hi)]);
  stroke(...ROSE); strokeWeight(1.5); line(g.x, gY(g, trueLL), g.x + g.w, gY(g, trueLL)); note('本当のモデルの対数尤度 ' + fmtN(trueLL, 1), g.x + g.w - 210, gY(g, trueLL) + 16, ROSE, 12);
  runs.forEach((r, k) => { let c = k === runs.length - 1 ? LAN : [LILAC, AQUA, LEAF, TANG, DIMC][k % 5]; drawCurve(g, r.lls, c, k === runs.length - 1 ? 3 : 1.5); note(r.name + ' ' + fmtN(r.lls[r.lls.length - 1], 1), g.x + g.w + 10, g.y + 14 + k * 16, c, 11); });
  let stuck = run.lls.length > 5 && run.lls[run.lls.length - 1] < trueLL - 15;
  note(stuck ? 'この出発点は低い山（または平らな所）で止まった。N で別の出発点をためそう' : '黄色 = いまの学習。線が増えるのは別の出発点（N）', g.x, g.y + g.h + 58, stuck ? ROSE : DIMC, 13);
  // ---- γ の帯：はじめの 120 時刻
  let al = alignToTruth(run.cur, TRUE_BIRD), sm = smoothAll(run.cur, emTable(run.cur, data.xs.slice(0, 120))), by = g.y + g.h + 90, bw = Math.min(width - 160, 1000);
  note('はじめの 120 時刻：本当の気分（上）と、E ステップの γ = P(元気 | 観測)（下の曲線。番号は本物に合わせて表示）', 80, by, INK, 13);
  drawBand(data.zs.slice(0, 120), 80, by + 10, bw, 12, (z) => (z === 0 ? ROSE : [58, 68, 86]));
  let gg = { x: 80, y: by + 28, w: bw, h: 70, x0: 0, x1: 120, y0: 0, y1: 1 };
  noStroke(); fill(...PANEL); rect(gg.x, gg.y, gg.w, gg.h); drawCurve(gg, sm.gam.map((p) => p[al.perm[0]]), ROSE, 2, 0.5);
  for (let t = 0; t < 120; t++) { noStroke(); fill(...[LAN, AQUA, LINEC][data.xs[t]]); rect(80 + (t / 120) * bw + 1, by + 102, bw / 120 - 2, 8, 2); }
  note('観測：黄 ピー　水色 チュン　灰 だまる', 80, by + 128, DIMC, 12);
  // ---- 行列：本物・学習（そのまま）・学習（並べかえ後）
  let mx = g.x + g.w + 130, cw = 56, ch = 30;
  showModel('本当のモデル（学習には見せない）', TRUE_BIRD, mx, 130, cw, ch, ROSE);
  showModel('学習中のモデル（番号はそのまま）', run.cur, mx, 250, cw, ch, LAN, ['状態 1', '状態 2']);
  showModel('学習中のモデル（番号を本物に合わせて並べかえ）', al.m, mx, 370, cw, ch, LEAF);
  let swapped = al.perm[0] !== 0, err = Math.max(maxAbsDiff(al.m.tr, TRUE_BIRD.tr), maxAbsDiff(al.m.em, TRUE_BIRD.em));
  note(swapped ? '状態の番号が本物と逆（ラベルの入れかえ）。どちらでも尤度は同じ' : '状態の番号は本物と同じ', mx, 452, swapped ? TANG : DIMC, 13);
  note('並べかえ後の、本物とのいちばん大きなずれ ' + fmtN(err, 3), mx, 474, DIMC, 13);
  drawSelfTest();
}
function showModel(title, m, x, y, cw, ch, col, names) {
  names = names || BIRD_STATES;
  note(title, x, y - 22, col, 13);
  drawMatrix(m.tr, x + 50, y, cw, ch, names, names, { col: ROSE, ts: 12 });
  drawMatrix(m.em, x + 50 + 2 * cw + 70, y, cw, ch, names, BIRD_OBS, { col: LAN, ts: 12 });
}

function keyPressed() {
  let run = runs[runs.length - 1];
  if (key === ' ') { emOnce(run); auto = false; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'n' || key === 'N' || key === '2') addRun(randomHmm(2, 3), 'でたらめ');
  if (key === '1') addRun(presetStart(1), '全部同じ');
  if (key === '3') addRun(presetStart(3), '番号が逆');
  if (key === 'r' || key === 'R') { data = hmmSample(TRUE_BIRD, N_OBS); trueLL = hmmLogLik(TRUE_BIRD, data.xs); runs = []; addRun(randomHmm(2, 3), 'でたらめ'); }
  return false;
}

// やってみよう
// 1. 1 キー（A も B も全部同じ数字）から始めると、なぜ 1 歩も動けない？（2 つの状態に区別がない）
// 2. N を何回か押して、出発点ごとに最後の対数尤度がちがうか見よう。学習したモデルが本物より高い尤度になるのはなぜ？
// 3. 3 キーで番号が逆のモデルになる。「元気」と「つかれ」という名前は、だれが付けている？
// 4. N_OBS を 60 に減らすと、学んだ行列は本物からどのくらいずれる？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(750);
  let d = hmmSample(TRUE_BIRD, 600), tl = hmmLogLik(TRUE_BIRD, d.xs), okMono = true, best = null, bestLL = -Infinity, finals = [];
  for (let r = 0; r < 5; r++) {
    let m = randomHmm(2, 3), prev = -Infinity;
    for (let it = 0; it < 60; it++) { let s = baumWelchStep(m, [d.xs]); if (s.logLik < prev - 1e-9 || !noNaN(s.m.tr) || rowSumErr(s.m.tr) > 1e-9 || rowSumErr(s.m.em) > 1e-9) okMono = false; prev = s.logLik; m = s.m; }
    let ll = hmmLogLik(m, d.xs); finals.push(ll); if (ll > bestLL) { bestLL = ll; best = m; }
  }
  check('5 つの出発点 × 60 回：対数尤度は 1 回も下がらない、行の合計はいつも 1', okMono);
  check('いちばん良い出発点の対数尤度 ' + fmtN(bestLL, 1) + ' ≥ 本当のモデル ' + fmtN(tl, 1) + '（差は 15 以内）', bestLL >= tl - 1e-6 && bestLL < tl + 15);
  let al = alignToTruth(best, TRUE_BIRD);
  check('番号を合わせると、学んだ A・B は本物に近い（ずれ < 0.1）', maxAbsDiff(al.m.tr, TRUE_BIRD.tr) < 0.1 && maxAbsDiff(al.m.em, TRUE_BIRD.em) < 0.1);
  let sw = permuteHmm(best, [1, 0]);
  check('状態の番号を入れかえても尤度は同じ（ラベルの入れかえ）、並べかえで元にもどる', near(hmmLogLik(sw, d.xs), bestLL, 1e-9) && maxAbsDiff(alignToTruth(sw, TRUE_BIRD).m.em, al.m.em) < 1e-12);
  let flat = presetStart(1), f1 = baumWelchStep(flat, [d.xs]).m, f2 = baumWelchStep(f1, [d.xs]).m;
  check('全部同じ数字の出発点：2 つの状態は同じまま動けない（B の 2 行が同じ）', maxAbsDiff(f2.em[0], f2.em[1]) < 1e-12 && maxAbsDiff(f1.em, f2.em) < 1e-12 && hmmLogLik(f2, d.xs) < tl - 20);
  // 短い列で、M ステップの式を総当たりの γ・ξ から直接計算したものと照合
  let xs = [0, 2, 2, 1, 0, 0, 2], m0 = presetStart(3), eb = emTable(m0, xs), bf = bruteAll(m0, eb), st = baumWelchStep(m0, [xs]).m, trB = [[0, 0], [0, 0]], emB = [[0, 0, 0], [0, 0, 0]];
  for (let t = 0; t < 7; t++) for (let i = 0; i < 2; i++) { emB[i][xs[t]] += bf.gam[t][i]; if (t < 6) for (let j = 0; j < 2; j++) trB[i][j] += bf.xi[t][i][j]; }
  check('M ステップ = 総当たり（128 本）の期待回数の割り算（長さ 7 の列）', maxAbsDiff(st.tr, trB.map(normRow)) < 1e-12 && maxAbsDiff(st.em, emB.map(normRow)) < 1e-12 && maxAbsDiff(st.p0, bf.gam[0]) < 1e-12);
  let sm = smoothAll(best, emTable(best, d.xs)), tot = 0; for (let g of sm.gam) tot += g[0] + g[1];
  check('期待回数の合計：Σ_t Σ_i γ_t(i) = 600', near(tot, 600, 1e-8));
  let acc = 0; for (let t = 0; t < 600; t++) if (al.perm[d.zs[t]] === argMax(sm.gam[t])) acc++;
  check('学んだモデルの γ で気分を当てる：' + Math.round(acc / 6) + '%（> 80%）', acc / 600 > 0.8);
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
// ---- バウム-ウェルチ（EM）の道具
function randomRow(k, sharp) { let r = []; for (let i = 0; i < k; i++) r.push(Math.pow(0.05 + rnd(), sharp || 1)); return normRow(r); }
function randomHmm(n, k) { let m = { p0: randomRow(n), tr: [], em: [] }; for (let i = 0; i < n; i++) { m.tr.push(randomRow(n)); m.em.push(randomRow(k)); } return m; }
function copyHmm(m) { return { p0: m.p0.slice(), tr: m.tr.map((r) => r.slice()), em: m.em.map((r) => r.slice()) }; }
// ★ 1 回の EM：E ステップで γ（状態 i にいた期待回数）と ξ（i → j と動いた期待回数）を足し合わせ、M ステップで割り算する
//   seqs = 観測列のリスト。eps = 出力の数に足す小さな数（0 でもよい）。戻り値の logLik は「更新する前」のモデルの対数尤度
function baumWelchStep(m, seqs, eps) {
  let n = m.p0.length, k = m.em[0].length, logLik = 0;
  let g0 = new Array(n).fill(0), trNum = m.tr.map(() => new Array(n).fill(0)), emNum = m.em.map(() => new Array(k).fill(eps || 0));
  for (let xs of seqs) {
    if (!xs.length) continue;
    let eb = emTable(m, xs), sm = smoothAll(m, eb); logLik += sm.logLik;
    if (sm.logLik === -Infinity) continue;                    // このモデルでは出せない列は数えない
    for (let i = 0; i < n; i++) g0[i] += sm.gam[0][i];
    for (let t = 0; t < xs.length; t++) for (let i = 0; i < n; i++) emNum[i][xs[t]] += sm.gam[t][i];
    for (let t = 0; t + 1 < xs.length; t++) {
      let c = sm.cs[t + 1];
      for (let i = 0; i < n; i++) { let a = sm.filt[t][i]; if (a === 0) continue; for (let j = 0; j < n; j++) trNum[i][j] += (a * m.tr[i][j] * eb[t + 1][j] * sm.bh[t + 1][j]) / c; }
    }
  }
  let next = { p0: sumOf(g0) > 0 ? normRow(g0) : m.p0.slice(), tr: trNum.map((r, i) => (sumOf(r) > 1e-12 ? normRow(r) : m.tr[i].slice())), em: emNum.map((r, i) => (sumOf(r) > 1e-12 ? normRow(r) : m.em[i].slice())) };
  return { m: next, logLik };
}
function permsOf(n) {                   // 0..n−1 の並べかえを全部（n ≤ 6）
  let out = [], cur = [], used = new Array(n).fill(false);
  (function rec() { if (cur.length === n) { out.push(cur.slice()); return; } for (let i = 0; i < n; i++) if (!used[i]) { used[i] = true; cur.push(i); rec(); cur.pop(); used[i] = false; } })();
  return out;
}
// ★ ラベルの入れかえ：学んだ状態の番号は本物とそろっているとは限らない。cost(本物 i, 学習 p[i]) の合計が最小になる並べかえ p を探す
function bestPerm(n, cost) { let best = null, bc = Infinity; for (let p of permsOf(n)) { let c = 0; for (let i = 0; i < n; i++) c += cost(i, p[i]); if (c < bc) { bc = c; best = p; } } return best; }
function permuteHmm(m, p) { return { p0: p.map((i) => m.p0[i]), tr: p.map((i) => p.map((j) => m.tr[i][j])), em: p.map((i) => m.em[i].slice()) }; }
function rowDist(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s; }
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
