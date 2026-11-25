// ============================================
// 06 アンダーフローとスケーリング ─ 前向きの α は時刻ごとに 0.3 倍くらいずつ小さくなる。コンピュータの小数（倍精度）は
// 約 1e-308 より小さい数を正しく持てず、5e-324 より小さいと 0 になる（アンダーフロー）。長さ 1000 の列で、もう P(x) = 0 になってしまう。
// 直し方は 2 つ：
//   ① スケーリング　毎時刻、α の合計 c_t で割って合計 1 に直す。log P(x) = Σ log c_t
//   ② 対数のまま　　log α を持ち、足し算は log-sum-exp（いちばん大きい値を引いてから exp）で行う
// どちらも同じ答えになる。グラフの縦は「10 の何乗か」
// ↑↓ 列の長さ T / スペース 0 になる所を拡大 / R 新しい列
// ============================================

const T_LIST = [20, 100, 500, 1000, 2000, 5000];   // ★ 列の長さの候補
const sig = {                            // ★ 3 状態・4 記号のモデル
  p0: [0.5, 0.3, 0.2],
  tr: [[0.8, 0.15, 0.05], [0.1, 0.8, 0.1], [0.1, 0.2, 0.7]],
  em: [[0.4, 0.3, 0.2, 0.1], [0.1, 0.2, 0.3, 0.4], [0.25, 0.25, 0.25, 0.25]],
};
const TINY_NORMAL = 2.2250738585072014e-308;   // これより小さいと精度が落ちはじめる（非正規化数）
let tIdx = 3, zoom = false, res = null, seedNo = 76;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  recompute();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function recompute() { seedRng(seedNo); res = threeWays(sig, hmmSample(sig, T_LIST[tIdx]).xs); }
// ★ 3 つのやり方で前向きを計算して、時刻ごとの「ここまでの確率」の対数を記録する
function threeWays(m, xs) {
  let eb = emTable(m, xs), plain = fwdPlain(m, eb), sc = fwdScaled(m, eb), lv = fwdLog(m, eb);
  let out = { plainLog10: [], cum: [], logCum: [], cs: sc.cs, plainLik: plain.lik, scaledLL: sc.logLik, logLL: lv.logLik, deadAt: -1, denormAt: -1 }, acc = 0;
  for (let t = 0; t < xs.length; t++) {
    let s = sumOf(plain.al[t]);
    out.plainLog10.push(s > 0 ? Math.log10(s) : -Infinity);
    if (s === 0 && out.deadAt < 0) out.deadAt = t;
    if (s < TINY_NORMAL && out.denormAt < 0) out.denormAt = t;
    acc += lg(sc.cs[t]); out.cum.push(acc); out.logCum.push(logSumExp(lv.la[t]));
  }
  return out;
}

function draw() {
  background(...BG);
  let len = T_LIST[tIdx], L10 = Math.LN10;
  hudTitle('アンダーフローとスケーリング：長さ T = ' + len + ' の列の前向きアルゴリズム', '↑↓ 列の長さ T　スペース 0 になる所を拡大 ' + (zoom ? 'ON' : 'OFF') + '　R 新しい列');
  let g = { x: 90, y: 130, w: width - 520, h: 420, x0: 0, x1: len, y0: Math.min(-10, (res.scaledLL / L10) * 1.05), y1: 0 }, zoomed = zoom && res.denormAt >= 0;
  if (zoomed) { let c = res.deadAt >= 0 ? res.deadAt : res.denormAt; g.x0 = Math.max(0, c - 44); g.x1 = Math.min(len, c + 12); g.y0 = -332; g.y1 = -296; }
  let yt = zoomed ? [-330, -324, -316, -308, -300] : [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(g.y0 * f));
  plotAxes(g, '時刻 t', '時刻 t までの観測の確率 P(x_1..x_t)（10 の何乗か）', [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(g.x0 + (g.x1 - g.x0) * f)), yt);
  for (let [v, name] of [[-307.65, '1e-308：ここから下は精度が落ちる'], [-323.3, '5e-324：これより小さい数は 0']]) if (v > g.y0 && v < g.y1) { stroke(...ROSE, 150); strokeWeight(1); line(g.x, gY(g, v), g.x + g.w, gY(g, v)); note(name, g.x + g.w - 250, gY(g, v) - 5, ROSE, 12); }
  let a = Math.floor(g.x0), b = Math.ceil(g.x1), toL10 = (arr) => arr.map((v) => v / L10);
  drawCurve(g, toL10(res.cum), LAN, 7, 1, a, b);
  drawCurve(g, toL10(res.logCum), AQUA, 2.5, 1, a, b);
  drawCurve(g, res.plainLog10, ROSE, 3, 1, a, b);
  if (res.deadAt >= 0 && res.deadAt >= a && res.deadAt <= b) {
    let x = gX(g, res.deadAt + 1); stroke(...ROSE); strokeWeight(2); line(x, g.y, x, g.y + g.h);
    note('t = ' + (res.deadAt + 1) + ' で 0 に！', Math.min(x + 8, g.x + g.w - 120), g.y + 20, ROSE, 15); note('（これより右は全部 0）', Math.min(x + 8, g.x + g.w - 140), g.y + 40, ROSE, 12);
  }
  legend(g.x + 16, g.y + g.h - 70, [[ROSE, 'そのまま掛け算（α をそのまま持つ）'], [LAN, '① スケーリング：Σ log c_t'], [AQUA, '② 対数のまま：log-sum-exp']]);
  // ---- 数字
  let px = g.x + g.w + 40;
  note('最後の答え', px, 150, INK, 16);
  note('そのまま', px, 186, ROSE, 14); note('P(x) = ' + (res.plainLik === 0 ? '0　← まちがい（本当は 0 ではない）' : res.plainLik.toExponential(6)), px, 208, INK, 14);
  note('① スケーリング', px, 246, LAN, 14); note('log P(x) = ' + fmtN(res.scaledLL, 8), px, 268, INK, 14);
  note('② 対数のまま', px, 306, AQUA, 14); note('log P(x) = ' + fmtN(res.logLL, 8), px, 328, INK, 14);
  note('①と②の差 ' + Math.abs(res.scaledLL - res.logLL).toExponential(1) + '　→　P(x) = 10^(' + fmtN(res.scaledLL / L10, 1) + ')', px, 362, LEAF, 13);
  if (res.plainLik > 0) note('そのままでも log(P) = ' + fmtN(Math.log(res.plainLik), 8) + '（まだ大丈夫）', px, 386, DIMC, 13);
  // c_t の小さなグラフ
  let g2 = { x: px + 30, y: 440, w: Math.min(360, width - px - 60), h: 110, x0: 0, x1: Math.min(len, 200), y0: 0, y1: 0.6 };
  plotAxes(g2, '時刻 t', 'c_t（毎時刻の合計。ふつうの大きさの数）', [0, g2.x1], [0, 0.3, 0.6]);
  drawCurve(g2, res.cs, LAN, 1.5, 1, 0, g2.x1);
  note('1 時刻で平均 ' + fmtN(Math.exp(res.scaledLL / len), 3) + ' 倍 → ' + len + ' 回掛けると 10^(' + fmtN(res.scaledLL / L10, 0) + ')', px, 606, DIMC, 13);
  note('そのままの掛け算が 0 になるのは、およそ t = ' + Math.round(-744.4 / (res.scaledLL / len)) + ' のあたり', px, 630, DIMC, 13);
  drawSelfTest();
}

function keyPressed() {
  if (key === UP_ARROW) { tIdx = Math.min(T_LIST.length - 1, tIdx + 1); recompute(); }
  if (key === DOWN_ARROW) { tIdx = Math.max(0, tIdx - 1); recompute(); }
  if (key === ' ') zoom = !zoom;
  if (key === 'r' || key === 'R') { seedNo++; recompute(); }
  return false;
}

// やってみよう
// 1. ↑↓ で T を変えて、ばら色の線が 0 に落ちるのは T がいくつから？ その時刻はだいたい同じ？
// 2. スペースで拡大すると、0 になる直前のばら色の線は黄色からずれてガタガタする。なぜ？（非正規化数は桁が足りない）
// 3. logSumExp で「いちばん大きい値を先に引く」のをやめて Math.log(Math.exp(a) + Math.exp(b)) と書くと、a = b = −1000 のとき何が返る？
// 4. 記号を 4 種類から 20 種類に増やすと（em の 1 つ 1 つが小さくなる）、0 になる時刻は早くなる？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(760);
  let r20 = threeWays(sig, hmmSample(sig, 20).xs);
  check('T = 20：そのまま = スケーリング = 対数のまま（log P の差 < 1e-10）', near(Math.log(r20.plainLik), r20.scaledLL, 1e-10) && near(r20.logLL, r20.scaledLL, 1e-10) && r20.deadAt < 0);
  let xs8 = [0, 3, 1, 2, 2, 0, 3, 1], bf = bruteAll(sig, emTable(sig, xs8)), r8 = threeWays(sig, xs8);
  check('T = 8：3 つとも総当たり（6561 本）と同じ', near(r8.scaledLL, Math.log(bf.lik), 1e-12) && near(r8.logLL, Math.log(bf.lik), 1e-12) && near(r8.plainLik, bf.lik, 1e-18));
  let xs = hmmSample(sig, 5000).xs, r = threeWays(sig, xs);
  check('T = 5000：そのままの P(x) は 0 になる（アンダーフロー）', r.plainLik === 0 && r.deadAt > 0);
  check('T = 5000：スケーリング ' + fmtN(r.scaledLL, 2) + ' と対数のまま は有限で一致（差 < 1e-7）', isFinite(r.scaledLL) && isFinite(r.logLL) && Math.abs(r.scaledLL - r.logLL) < 1e-7 && r.scaledLL < -5000);
  let okT = true; for (let t = 0; t < 5000; t += 37) if (Math.abs(r.cum[t] - r.logCum[t]) > 1e-7) okT = false;
  check('とちゅうの時刻でも Σ log c_t = log-sum-exp（135 か所）', okT);
  let cross = r.cum.findIndex((v) => v < Math.log(Number.MIN_VALUE) - 0.7);
  check('0 になる時刻 t = ' + (r.deadAt + 1) + ' は、Σ log c_t が log(5e-324) ≈ −744.4 を下まわる時刻（' + (cross + 1) + '）の ±3 以内', Math.abs(r.deadAt - cross) <= 3 && r.denormAt < r.deadAt);
  check('アンダーフローの前までは、そのまま = スケーリング（t = 200 で差 < 1e-9）', near(r.plainLog10[199] * Math.LN10, r.cum[199], 1e-9));
  check('logSumExp：全部 −∞ なら −∞、大きな数でもあふれない（[1000, 1000] → 1000 + log 2）', logSumExp([-Infinity, -Infinity]) === -Infinity && near(logSumExp([1000, 1000]), 1000 + Math.LN2, 1e-12) && near(logSumExp([-1000, -1000]), -1000 + Math.LN2, 1e-12) && logSumExp([-Infinity, 3]) === 3);
  let imp = { p0: [1, 0], tr: [[1, 0], [0, 1]], em: [[1, 0], [0, 1]] }, ri = threeWays(imp, [0, 1, 0]);
  check('ありえない観測の列：3 つとも「確率 0」（log は −∞）で、NaN にならない', ri.plainLik === 0 && ri.scaledLL === -Infinity && ri.logLL === -Infinity && noNaN(ri.cum) && noNaN(ri.logCum));
  let eb = emTable(sig, xs), sm = smoothAll(sig, eb), lv = fwdLog(sig, eb), g0 = lv.la[4999].map((v) => Math.exp(v - lv.logLik));
  check('T = 5000 でも γ は計算できる：最後の時刻の γ（スケーリング）= exp(log α − log P)', maxAbsDiff(sm.gam[4999], g0) < 1e-9 && noNaN(sm.gam) && near(sumOf(sm.gam[2500]), 1, 1e-12));
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
