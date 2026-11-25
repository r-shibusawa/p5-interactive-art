// ============================================
// 07 状態はいくつ？ ─ カフェの時間帯（朝・昼・夜の 3 つ、見えない）が注文（コーヒー・紅茶・ジュース・ケーキ・サンド）を決めている。
// 注文の列だけを見て、状態の数 N = 1〜6 の HMM をバウム-ウェルチで当てはめる。
//   訓練データの対数尤度：N を増やすほど上がり続ける（大きいモデルは小さいモデルを中にふくむ）→ これだけでは N を選べない
//   検証データ（学習に使っていない列）の対数尤度：本当の数をこえると上がらなくなり、下がることも（過学習）
//   BIC = −2 log L + k log T、AIC = −2 log L + 2k（k = パラメータの数）：小さいほど良い。増やしすぎに罰金
// パラメータの数 k = N(N − 1)［A の各行］+ N(M − 1)［B の各行］+ (N − 1)［π］（行の合計が 1 なので 1 つずつ少ない）
// スペース 学習をやり直す / ↑↓ データの長さ T / ← → 見るモデルの N / R 新しいデータ
// ============================================

const CAFE_OBS = ['コーヒー', '紅茶', 'ジュース', 'ケーキ', 'サンド'];
const TRUE_CAFE = {                      // ★ 本当のモデル（3 状態）
  p0: [1 / 3, 1 / 3, 1 / 3],
  tr: [[0.9, 0.07, 0.03], [0.04, 0.9, 0.06], [0.06, 0.04, 0.9]],
  em: [[0.7, 0.15, 0.05, 0.05, 0.05], [0.05, 0.05, 0.1, 0.1, 0.7], [0.05, 0.15, 0.5, 0.25, 0.05]],
};
const T_CHOICES = [300, 600, 1200, 2400]; // ★ データの長さの候補
const MAX_N = 6, RESTARTS = 6, SHORT_ITERS = 12, EM_ITERS = 50;   // ★ ためす状態数の上限、出発点の数、短くためす回数、仕上げの EM の回数
let tSel = 1, dataSeed = 77, fit = null, viewN = 3;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  startFit();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function startFit() { seedRng(dataSeed); let len = T_CHOICES[tSel]; fit = newFit(hmmSample(TRUE_CAFE, len).xs, hmmSample(TRUE_CAFE, len).xs, MAX_N, RESTARTS, EM_ITERS); }
function paramCount(n, k) { return n * (n - 1) + n * (k - 1) + (n - 1); }   // ★ 自由に決められる数字の数
function newFit(train, val, maxN, restarts, iters) { return { train, val, maxN, restarts, iters, n: 1, r: 0, it: 0, cur: null, fallback: null, bestOfN: null, results: [], done: false }; }
// ★ 状態を 1 つ 2 つに分ける：N 状態のモデルとまったく同じ確率を出す N + 1 状態のモデルを作る（ゆらす = 少しだけずらして EM が動けるように）
function splitState(m, shake) {
  let n = m.p0.length, s = argMax(stationaryOf(m.tr)), out = { p0: m.p0.concat([m.p0[s] / 2]), tr: [], em: m.em.map((r) => r.slice()) };
  out.p0[s] /= 2;
  for (let i = 0; i < n; i++) { let row = m.tr[i].concat([m.tr[i][s] / 2]); row[s] /= 2; out.tr.push(row); }
  out.tr.push(out.tr[s].slice()); out.em.push(m.em[s].slice());
  if (shake) for (let i of [s, n]) out.em[i] = normRow(out.em[i].map((v) => v * (0.6 + 0.8 * rnd())));
  return out;
}
function stickyStart(n, k) {              // でたらめな出発点（ただし「同じ状態にとどまりやすい」ところから始める）
  let m = randomHmm(n, k); m.tr = m.tr.map((r, i) => normRow(r.map((v, j) => v * 0.3 + (i === j ? 2 : 0)))); return m;
}
// ★ 学習を 1 回分だけ進める（EM 1 回）。1 フレームに少しずつ呼ぶ
//   出発点ごとに短く（SHORT_ITERS 回）ためして、いちばん良かったものだけを長く（iters 回）みがく
function fitStep(f) {
  if (f.done) return;
  let k = TRUE_CAFE.em[0].length;
  if (!f.cur) {
    if (f.r === f.restarts) f.cur = f.bestOfN.m;                       // 仕上げ：いちばん良い出発点をつづける
    else if (f.r === 0 && f.n > 1) { f.fallback = splitState(f.results[f.n - 2].m, false); f.cur = splitState(f.results[f.n - 2].m, true); }
    else f.cur = stickyStart(f.n, k);
    f.it = 0;
  }
  f.cur = baumWelchStep(f.cur, [f.train]).m; f.it++;
  if (f.it < (f.r === f.restarts ? f.iters : SHORT_ITERS)) return;
  let ll = hmmLogLik(f.cur, f.train), m = f.cur;
  if (!f.bestOfN || ll > f.bestOfN.ll) f.bestOfN = { m, ll };
  f.cur = null; f.r++;
  if (f.r <= f.restarts) return;
  if (f.fallback) { let fl = hmmLogLik(f.fallback, f.train); if (fl > f.bestOfN.ll) f.bestOfN = { m: f.fallback, ll: fl }; }   // 小さいモデルより悪くはならない
  let len = f.train.length, kk = paramCount(f.n, k);
  f.results.push({ n: f.n, m: f.bestOfN.m, k: kk, trainLL: f.bestOfN.ll, valLL: hmmLogLik(f.bestOfN.m, f.val), bic: -2 * f.bestOfN.ll + kk * Math.log(len), aic: -2 * f.bestOfN.ll + 2 * kk });
  f.bestOfN = null; f.fallback = null; f.r = 0; f.n++; if (f.n > f.maxN) f.done = true;
}
function bestBy(results, keyName, sign) { let b = 0; for (let i = 1; i < results.length; i++) if (sign * results[i][keyName] > sign * results[b][keyName]) b = i; return results.length ? results[b].n : 0; }

function draw() {
  background(...BG);
  let t0 = performance.now(); while (!fit.done && performance.now() - t0 < 6) fitStep(fit);     // 1 フレームに 6 ミリ秒だけ学習
  let rs = fit.results, len = fit.train.length;
  hudTitle('状態はいくつ？：本当は 3 状態のデータに N = 1〜' + MAX_N + ' 状態の HMM を当てはめる', 'スペース 学習をやり直す　↑↓ データの長さ T = ' + len + '　← → 見るモデル N = ' + viewN + '　R 新しいデータ　' + (fit.done ? '学習おわり' : '学習中… N = ' + fit.n + (fit.r < RESTARTS ? '（出発点 ' + (fit.r + 1) + ' / ' + RESTARTS + '）' : '（仕上げ）')));
  let gw = Math.min(400, (width - 600) / 2), g1 = { x: 90, y: 150, w: gw, h: 260, x0: 0.5, x1: MAX_N + 0.5, y0: -1.62, y1: -1.3 }, g2 = { x: 90 + gw + 90, y: 150, w: gw, h: 260, x0: 0.5, x1: MAX_N + 0.5, y0: 0, y1: 1 };
  if (rs.length) {
    let v1 = rs.flatMap((r) => [r.trainLL / len, r.valLL / len]).filter((v) => isFinite(v)), v2 = rs.flatMap((r) => [r.bic, r.aic]);
    g1.y0 = Math.min(...v1) - 0.01; g1.y1 = Math.max(...v1) + 0.01; g2.y0 = Math.min(...v2) - 10; g2.y1 = Math.max(...v2) + 10;
  }
  plotAxes(g1, '状態の数 N', '1 観測あたりの対数尤度（大きいほど良い）', [1, 2, 3, 4, 5, 6], [+g1.y0.toFixed(3), +g1.y1.toFixed(3)]);
  plotAxes(g2, '状態の数 N', 'BIC・AIC（小さいほど良い）', [1, 2, 3, 4, 5, 6], [Math.round(g2.y0), Math.round(g2.y1)]);
  for (let g of [g1, g2]) { stroke(...INK, 60); strokeWeight(1); line(gX(g, 3), g.y, gX(g, 3), g.y + g.h); noStroke(); fill(...INK, 20); rect(gX(g, viewN) - 14, g.y, 28, g.h); }
  dots(g1, rs, (r) => r.trainLL / len, LAN); dots(g1, rs, (r) => r.valLL / len, AQUA); dots(g2, rs, (r) => r.bic, ROSE); dots(g2, rs, (r) => r.aic, LILAC);
  legend(g1.x + 14, g1.y + g1.h - 46, [[LAN, '訓練データ（上がり続ける）'], [AQUA, '検証データ']]); legend(g2.x + 14, g2.y + 18, [[ROSE, 'BIC'], [LILAC, 'AIC']]);
  note('たての線 = 本当の数（3）', g1.x, g1.y + g1.h + 56, DIMC, 12);
  // ---- 表
  let ty = g1.y + g1.h + 90; note('N', 90, ty, DIMC, 13); note('パラメータ k', 130, ty, DIMC, 13); note('訓練 log L', 250, ty, LAN, 13); note('検証 log L', 370, ty, AQUA, 13); note('BIC', 490, ty, ROSE, 13); note('AIC', 590, ty, LILAC, 13);
  for (let r of rs) { let y = ty + 24 * r.n, c = r.n === viewN ? INK : DIMC; note(r.n, 90, y, c, 14); note(r.k + ' = ' + r.n * (r.n - 1) + ' + ' + r.n * 4 + ' + ' + (r.n - 1), 130, y, c, 13); note(fmtN(r.trainLL, 1), 250, y, c, 14); note(fmtN(r.valLL, 1), 370, y, c, 14); note(fmtN(r.bic, 1), 490, y, c, 14); note(fmtN(r.aic, 1), 590, y, c, 14); }
  if (fit.done) note('いちばん良い N：検証データ → ' + bestBy(rs, 'valLL', 1) + '　BIC → ' + bestBy(rs, 'bic', -1) + '　AIC → ' + bestBy(rs, 'aic', -1) + '　（訓練データだけで選ぶと ' + bestBy(rs, 'trainLL', 1) + ' になってしまう）', 90, ty + 24 * MAX_N + 34, LEAF, 14);
  // ---- 選んだ N のモデル
  let mx = g2.x + g2.w + 50, sel = rs[viewN - 1];
  note('N = ' + viewN + ' のモデルが学んだ出力行列 B', mx, 122, INK, 13); note('（行 = 状態、列 = 注文）', mx, 142, DIMC, 12);
  if (sel) {
    let cw = Math.min(60, (width - mx - 30) / 5);
    drawMatrix(sel.m.em, mx, 176, cw, 30, null, CAFE_OBS, { col: LAN, ts: 11 });
    note('遷移行列 A', mx, 176 + viewN * 30 + 34, INK, 13);
    drawMatrix(sel.m.tr, mx, 176 + viewN * 30 + 46, 44, 26, null, null, { col: ROSE, ts: 10 });
    note(viewN > 3 ? '似た行ができる（同じ時間帯を分けただけ）' : viewN < 3 ? 'ちがう時間帯が 1 つにまとめられる' : '本当のモデルと同じ形（番号の順は別）', mx, 176 + viewN * 56 + 76, DIMC, 12);
  } else note('学習中…', mx, 180, DIMC, 13);
  note('本当の B：朝 = コーヒー、昼 = サンド、', mx, height - 78, DIMC, 12); note('夜 = ジュース・ケーキ・紅茶 が多い', mx, height - 60, DIMC, 12);
  drawSelfTest();
}
function dots(g, rs, f, col) { stroke(...col); strokeWeight(2.5); polyline(rs.map((r) => [gX(g, r.n), gY(g, f(r))])); noStroke(); fill(...col); for (let r of rs) circle(gX(g, r.n), gY(g, f(r)), 9); }

function keyPressed() {
  if (key === ' ') { let s = rngState; startFit(); seedRng(s + 12345); }
  if (key === 'r' || key === 'R') { dataSeed++; startFit(); }
  if (key === UP_ARROW) { tSel = Math.min(T_CHOICES.length - 1, tSel + 1); startFit(); }
  if (key === DOWN_ARROW) { tSel = Math.max(0, tSel - 1); startFit(); }
  if (key === RIGHT_ARROW) viewN = Math.min(MAX_N, viewN + 1);
  if (key === LEFT_ARROW) viewN = Math.max(1, viewN - 1);
  return false;
}

// やってみよう
// 1. 黄色（訓練）は右へ行くほど上がるのに、水色（検証）は N = 3 のあとどうなる？
// 2. ↓ でデータを 300 個に減らすと、BIC と AIC が選ぶ N は変わる？（データが少ないと、複雑なモデルは選ばれにくい）
// 3. → で N = 5 のモデルを見よう。B のどの行とどの行が似ている？
// 4. TRUE_CAFE の em の 3 行をもっと似せると（見分けにくくすると）、3 状態だと当てられる？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(770);
  check('パラメータの数：N = 3, M = 5 で 6 + 12 + 2 = 20、N = 1 で 4、N = 6 で 59', paramCount(3, 5) === 20 && paramCount(1, 5) === 4 && paramCount(6, 5) === 59);
  let tr = hmmSample(TRUE_CAFE, 600).xs, va = hmmSample(TRUE_CAFE, 600).xs, f = newFit(tr, va, 5, 5, 40), guard = 0;
  while (!f.done && guard++ < 5000) fitStep(f);
  let rs = f.results, okUp = rs.length === 5; for (let i = 1; i < rs.length; i++) if (rs[i].trainLL < rs[i - 1].trainLL - 1e-9) okUp = false;
  check('訓練データの対数尤度は N とともに上がる（下がらない）：' + rs.map((r) => fmtN(r.trainLL, 0)).join(' → '), okUp);
  check('BIC がいちばん小さいのは N = 3（本当の数）：' + rs.map((r) => fmtN(r.bic, 0)).join(', '), bestBy(rs, 'bic', -1) === 3);
  check('検証データの対数尤度がいちばん大きいのも N = 3、N = 5 は N = 3 より悪い（過学習）', bestBy(rs, 'valLL', 1) === 3 && rs[4].valLL < rs[2].valLL - 1);
  check('AIC は BIC より罰金が軽い：N ≥ 2 で AIC < BIC（log 600 > 2）', rs.slice(1).every((r) => r.aic < r.bic) && near(rs[2].bic - rs[2].aic, 20 * (Math.log(600) - 2), 1e-9));
  let sp = splitState(rs[2].m, false);
  check('状態を 2 つに分けたモデル（4 状態）は、もとの 3 状態のモデルとまったく同じ尤度', near(hmmLogLik(sp, tr), rs[2].trainLL, 1e-8) && sp.p0.length === 4 && rowSumErr(sp.tr) < 1e-12 && near(sumOf(sp.p0), 1, 1e-12));
  let tl = hmmLogLik(TRUE_CAFE, tr);
  check('N = 3 の訓練の対数尤度 ' + fmtN(rs[2].trainLL, 1) + ' ≥ 本当のモデル ' + fmtN(tl, 1), rs[2].trainLL >= tl - 1e-6);
  let p = bestPerm(3, (i, j) => rowDist(TRUE_CAFE.em[i], rs[2].m.em[j])), al = permuteHmm(rs[2].m, p);
  check('N = 3：番号を合わせると B は本物に近い（ずれ < 0.12）', maxAbsDiff(al.em, TRUE_CAFE.em) < 0.12);
  check('N = 1 のモデル：B = 注文の割合そのもの', maxAbsDiff(rs[0].m.em[0], normRow([0, 1, 2, 3, 4].map((k) => tr.filter((x) => x === k).length))) < 1e-9);
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
