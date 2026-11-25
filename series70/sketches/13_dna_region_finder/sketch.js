// ============================================
// 13 DNA の領域さがし ─ DNA は A・C・G・T の 4 文字の長い列。その中に、C と G が多い「島」（CpG アイランド風の領域。遺伝子の近くに多い）がまじっている。
// 状態は 2 つ（背景・島）。島の中では C・G が出やすく、いちど島に入るとしばらく続く。文字の列だけから、どこが島かを推定する。
//   ばら色の曲線 = 事後確率 P(島 | 全部の文字)（前向き × 後ろ向き）　下の帯 = 本当の島・事後確率 > 0.5・ビタビ・「窓の中の C と G の割合」で切るだけの方法
// 窓で数える方法は窓の幅としきい値を自分で決めないといけないが、HMM は「島の長さ」も確率で持っているので境目がはっきりする。遺伝子さがし（遺伝子の始まり・終わり・中身を状態にした HMM）の基本
// ※ ここの DNA は乱数で作った合成の列（本物のゲノムではない）
// R 新しい列 / ↑↓ 窓の幅 / ← → 窓のしきい値 / L 文字の列だけからパラメータを学習（バウム-ウェルチ）/ スペース 本当のモデル ⇔ 学習したモデル
// ============================================

const BASES = 'ACGT';
const N_BASES = 1500;                    // ★ 列の長さ
const dnaTrue = {                        // ★ 列を作る本当のモデル（状態 0 = 背景、1 = 島。em の列は A, C, G, T）
  p0: [0.8, 0.2],
  tr: [[0.995, 0.005], [0.012, 0.988]],
  em: [[0.3, 0.2, 0.2, 0.3], [0.15, 0.35, 0.35, 0.15]],
};
let winW = 61, winTh = 0.55;             // ★ 窓の幅（文字数）と、島と判定する C + G の割合
let dna = null, learned = null, learnIt = 0, learning = false, useLearned = false, calc = null, dataSeed = 83, learnLL = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  newData();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function newData() { seedRng(dataSeed); dna = hmmSample(dnaTrue, N_BASES); learned = null; learning = false; useLearned = false; learnIt = 0; learnLL = []; analyse(); }
function roughStart() { return { p0: [0.5, 0.5], tr: [[0.95, 0.05], [0.05, 0.95]], em: [[0.27, 0.23, 0.23, 0.27], [0.22, 0.28, 0.28, 0.22]] }; }   // 学習の出発点：「島は少しだけ C・G が多い」くらいしか知らない
function islandFirst(m) { let gc = (r) => r[1] + r[2]; return gc(m.em[1]) >= gc(m.em[0]) ? m : permuteHmm(m, [1, 0]); }   // C・G が多いほうを「島」（状態 1）と呼ぶ
// ★ 窓で数える方法：前後 w 文字の中の C と G の割合（はしは短い窓）
function windowGC(xs, w) {
  let n = xs.length, half = Math.floor(w / 2), pre = [0], out = [];
  for (let t = 0; t < n; t++) pre.push(pre[t] + (xs[t] === 1 || xs[t] === 2 ? 1 : 0));
  for (let t = 0; t < n; t++) { let a = Math.max(0, t - half), b = Math.min(n, t + half + 1); out.push((pre[b] - pre[a]) / (b - a)); }
  return out;
}
function segAccuracy(seg, zs) { let ok = 0; for (let t = 0; t < zs.length; t++) if (seg[t] === zs[t]) ok++; return ok / Math.max(1, zs.length); }
function countIslands(seg) { let c = 0; for (let t = 0; t < seg.length; t++) if (seg[t] === 1 && (t === 0 || seg[t - 1] === 0)) c++; return c; }
function bestWindow(xs, zs) {            // 窓の幅としきい値を全部ためして、いちばん当たる組み合わせ（答えを見て選ぶので、窓の方法にいちばん有利）
  let best = { acc: 0, w: 0, th: 0 };
  for (let w of [11, 21, 31, 41, 61, 81, 101, 141, 201]) { let gc = windowGC(xs, w); for (let th = 0.4; th <= 0.75; th += 0.01) { let a = segAccuracy(gc.map((v) => (v > th ? 1 : 0)), zs); if (a > best.acc) best = { acc: a, w, th }; } }
  return best;
}
function analyse() {
  let m = useLearned && learned ? learned : dnaTrue, eb = emTable(m, dna.xs), sm = smoothAll(m, eb), gc = windowGC(dna.xs, winW);
  calc = { post: sm.gam.map((g) => g[1]), postSeg: sm.gam.map((g) => (g[1] > 0.5 ? 1 : 0)), vitSeg: viterbiLog(m, eb).vitPath, gc, winSeg: gc.map((v) => (v > winTh ? 1 : 0)), logLik: sm.logLik };
}

function draw() {
  background(...BG);
  if (learning) { let r = baumWelchStep(learned, [dna.xs]); learned = islandFirst(r.m); learnLL.push(r.logLik); if (++learnIt >= 40) { learning = false; useLearned = true; } analyse(); }
  let m = useLearned && learned ? learned : dnaTrue, zs = dna.zs;
  hudTitle('DNA の領域さがし：C と G が多い「島」を 2 状態の HMM で見つける（合成の列 ' + N_BASES + ' 文字）', 'R 新しい列　↑↓ 窓の幅 ' + winW + '　← → 窓のしきい値 ' + fmtN(winTh, 2) + '　L 文字の列だけから学習' + (learning ? '中… ' + learnIt + ' / 40' : '') + '　スペース モデル：' + (useLearned && learned ? '学習したもの' : '本当のもの'));
  let x0 = 60, bw = width - 120, y = 112;
  note('文字の列（黄 = C か G、暗い = A か T）　はじめの 60 文字：' + dna.xs.slice(0, 60).map((b) => BASES[b]).join(''), x0, y - 6, DIMC, 12);
  drawBand(dna.xs, x0, y, bw, 16, (b) => (b === 1 || b === 2 ? LAN : [52, 60, 76]));
  let g = { x: x0, y: y + 50, w: bw, h: 190, x0: 0, x1: N_BASES, y0: 0, y1: 1 };
  plotAxes(g, '位置', '', [0, 300, 600, 900, 1200, 1500], [0, 0.5, 1]);
  stroke(...AQUA, 110); strokeWeight(1); line(g.x, gY(g, winTh), g.x + g.w, gY(g, winTh));
  drawCurve(g, calc.gc, AQUA, 1.5, 0.5); drawCurve(g, calc.post, ROSE, 2.5, 0.5);
  legend(g.x + g.w - 330, g.y + 14, [[ROSE, '事後確率 P(島 | 全部の文字)'], [AQUA, '窓の中の C + G の割合（横線 = しきい値）']]);
  let by = g.y + g.h + 54, colOf = (z) => (z ? ROSE : [58, 68, 86]);
  let rows = [['本当の島', zs, ROSE], ['HMM：事後確率 > 0.5', calc.postSeg, INK], ['HMM：ビタビ', calc.vitSeg, INK], ['窓で数えるだけ（幅 ' + winW + '、しきい値 ' + fmtN(winTh, 2) + '）', calc.winSeg, AQUA]];
  rows.forEach(([name, seg, col], k) => {
    let yy = by + k * 38; drawBand(seg, x0, yy, bw, 16, colOf);
    note(name + '　島の数 ' + countIslands(seg) + (k ? '　当たり ' + fmtN(segAccuracy(seg, zs) * 100, 1) + '%' : ''), x0, yy - 4, col, 12);
  });
  let ty = by + 4 * 38 + 20, cw = 54;
  note((useLearned && learned ? '学習した' : '本当の') + 'モデル：出力 B（行 = 背景・島）', x0, ty, INK, 13);
  drawMatrix(m.em, x0 + 50, ty + 28, cw, 28, ['背景', '島'], ['A', 'C', 'G', 'T'], { col: LAN, ts: 12, hi: 0.5 });
  note('遷移 A', x0 + 320, ty, INK, 13);
  drawMatrix(m.tr, x0 + 360, ty + 28, 70, 28, ['背景', '島'], ['背景', '島'], { col: ROSE, ts: 12, digits: 3 });
  let rx = x0 + 560;
  note('島の平均の長さ 1 / (1 − a_島島) = ' + fmtN(1 / Math.max(1e-6, 1 - m.tr[1][1]), 0) + ' 文字　背景の平均の長さ ' + fmtN(1 / Math.max(1e-6, 1 - m.tr[0][0]), 0) + ' 文字', rx, ty + 20, DIMC, 13);
  note('対数尤度 log P(列) = ' + fmtN(calc.logLik, 1) + (learned ? '　（学習 ' + learnIt + ' 回' + (learnLL.length > 1 ? '、はじめ ' + fmtN(learnLL[0], 1) + ' → 今 ' + fmtN(learnLL[learnLL.length - 1], 1) : '') + '）' : ''), rx, ty + 44, DIMC, 13);
  note('1 文字だけ見ても島かどうかはわからない（C は背景でも 20% 出る）。続きぐあいを使うのが HMM', rx, ty + 68, DIMC, 12);
  drawSelfTest();
}

function keyPressed() {
  if (key === 'r' || key === 'R') { dataSeed++; newData(); }
  if (key === UP_ARROW) { winW = Math.min(301, winW + 10); analyse(); }
  if (key === DOWN_ARROW) { winW = Math.max(11, winW - 10); analyse(); }
  if (key === RIGHT_ARROW) { winTh = Math.min(0.8, Math.round((winTh + 0.01) * 100) / 100); analyse(); }
  if (key === LEFT_ARROW) { winTh = Math.max(0.3, Math.round((winTh - 0.01) * 100) / 100); analyse(); }
  if (key === 'l' || key === 'L') { learned = roughStart(); learnIt = 0; learnLL = []; learning = true; }
  if (key === ' ' && learned && !learning) { useLearned = !useLearned; analyse(); }
  return false;
}

// やってみよう
// 1. ↑↓ で窓の幅を 11 と 201 にしてみよう。せまいとちらつき、広いと境目がぼける。HMM にはその調整がいらないのはなぜ？
// 2. L を押して、文字の列だけからモデルを学習させよう。学んだ B は本物（島：C・G が 0.35 ずつ）に近い？
// 3. dnaTrue.em の島を [0.2, 0.3, 0.3, 0.2] にして背景との差を小さくすると、当たりの割合はどうなる？
// 4. 「島」と「背景」のほかに「島の始まりの目印」の状態を足すには、遷移行列をどう作ればよい？（遺伝子さがしの HMM の考え方）

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(830);
  check('π・A・B の行の合計 = 1、島は C + G = 0.7、背景は 0.4', near(sumOf(dnaTrue.p0), 1, 1e-12) && rowSumErr(dnaTrue.tr) < 1e-12 && rowSumErr(dnaTrue.em) < 1e-12 && near(dnaTrue.em[1][1] + dnaTrue.em[1][2], 0.7, 1e-12));
  let d = hmmSample(dnaTrue, 6000), eb = emTable(dnaTrue, d.xs), sm = smoothAll(dnaTrue, eb), postSeg = sm.gam.map((g) => (g[1] > 0.5 ? 1 : 0)), vit = viterbiLog(dnaTrue, eb).vitPath;
  let gcIn = 0, nIn = 0; for (let t = 0; t < 6000; t++) if (d.zs[t]) { nIn++; if (d.xs[t] === 1 || d.xs[t] === 2) gcIn++; }
  check('作った列 6000 文字：島の中の C + G の割合 ' + fmtN(gcIn / nIn, 3) + ' ≈ 0.7、島は全体の ' + Math.round((100 * nIn) / 6000) + '%', Math.abs(gcIn / nIn - 0.7) < 0.03 && nIn > 600);
  let s8 = d.xs.slice(100, 108), bf = bruteAll(dnaTrue, emTable(dnaTrue, s8));
  check('事後確率 = 総当たり（長さ 8、256 本）', maxAbsDiff(smoothAll(dnaTrue, emTable(dnaTrue, s8)).gam, bf.gam) < 1e-12);
  let accP = segAccuracy(postSeg, d.zs), accV = segAccuracy(vit, d.zs), bw = bestWindow(d.xs, d.zs);
  check('当たりの割合：HMM の事後確率 ' + fmtN(accP * 100, 1) + '% > いちばん良い窓（幅 ' + bw.w + '、しきい値 ' + fmtN(bw.th, 2) + '）' + fmtN(bw.acc * 100, 1) + '%', accP > bw.acc && accP > 0.85);
  let win61 = windowGC(d.xs, 61).map((v) => (v > 0.55 ? 1 : 0)), nT = countIslands(d.zs), nV = countIslands(vit), nW = countIslands(win61);
  check('島の数：本当 ' + nT + '（短すぎて見つけようのない島もある）、ビタビ ' + nV + '、窓（幅 61）' + nW + '。ビタビは本当より多くは作らず、窓はちらついて多くなる。当たりもビタビ ' + fmtN(accV * 100, 1) + '% > 窓（幅 61）', nV <= nT && nV >= 0.3 * nT && nW > nV && accV > segAccuracy(win61, d.zs));
  let gc5 = windowGC([1, 0, 2, 2, 0, 3, 1], 3);
  check('窓の中の C + G の割合：[C A G G A T C] を幅 3 で → 1/2, 2/3, 2/3, 2/3, 1/3, 1/3, 1/2', maxAbsDiff(gc5, [1 / 2, 2 / 3, 2 / 3, 2 / 3, 1 / 3, 1 / 3, 1 / 2]) < 1e-12);
  let m = roughStart(), prev = -Infinity, okMono = true;
  for (let it = 0; it < 40; it++) { let r = baumWelchStep(m, [d.xs]); if (r.logLik < prev - 1e-7) okMono = false; prev = r.logLik; m = islandFirst(r.m); }
  let accL = segAccuracy(smoothAll(m, emTable(m, d.xs)).gam.map((g) => (g[1] > 0.5 ? 1 : 0)), d.zs);
  check('文字の列だけから学習（40 回）：対数尤度は下がらず、学んだ島の C + G = ' + fmtN(m.em[1][1] + m.em[1][2], 2) + '（0.6〜0.8）', okMono && m.em[1][1] + m.em[1][2] > 0.6 && m.em[1][1] + m.em[1][2] < 0.8);
  check('学習したモデルの当たり ' + fmtN(accL * 100, 1) + '% は、本当のモデル ' + fmtN(accP * 100, 1) + '% の −4 ポイント以内', accL > accP - 0.04);
  check('全部 A の列でも NaN にならない（島ではないと判定）', noNaN(smoothAll(dnaTrue, emTable(dnaTrue, new Array(300).fill(0))).gam) && viterbiLog(dnaTrue, emTable(dnaTrue, new Array(300).fill(0))).vitPath.every((z) => z === 0));
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
