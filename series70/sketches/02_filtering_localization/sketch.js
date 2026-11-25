// ============================================
// 02 フィルタリング ─ 輪になった廊下（20 マス）を右回りに進むロボット。自分の位置は見えず、「横にドアがある / ない」のセンサ（ときどきまちがう）だけが頼り。
// 信念 = 「いまマス i にいる確率」の棒グラフ。次の 2 つをくり返す：
//   動く → 棒が右へずれて、すべる分だけぼやける（予測：信念 × A）　　見る → センサと合うマスが伸びて、とがる（更新：× b_i(観測) して合計で割る）
// これは前向きアルゴリズムを毎時刻 合計 1 に直したもの。状態が連続のときはカルマンフィルタ・粒子フィルタ（シリーズ 21 の 10・11）
// スペース 半歩（動く / 見る）/ A 自動 / ↑↓ センサの誤り率 / ← → すべる確率 / H ロボットを隠す / R やり直し
// ============================================

const DOORS = [1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1];   // ★ ドアのあるマス（1 = ドア）。くり返し模様にすると区別できなくなる
let sensErr = 0.15;                      // ★ センサがまちがう確率
let slip = 0.15;                         // ★ すべって進めない確率（進むつもりがその場にとどまる）
const OVER = 0.05;                       // ★ 勢いあまって 2 マス進む確率
let ring, robotPos = 0, belief = [], before = [], phase = 'see', lastSeen = -1, auto = true, showRobot = true, entHist = [], stepsDone = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(72); rebuild(); restart();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
// ★ 廊下を HMM にする：状態 = マス、tr = 動き方、em[i] = [ドアなしと出る確率, ドアありと出る確率]
function ringModel(doors, sl, over, err) {
  let n = doors.length, m = { p0: new Array(n).fill(1 / n), tr: [], em: [] };
  for (let i = 0; i < n; i++) {
    let row = new Array(n).fill(0); row[i] += sl; row[(i + 1) % n] += 1 - sl - over; row[(i + 2) % n] += over; m.tr.push(row);
    m.em.push(doors[i] ? [err, 1 - err] : [1 - err, err]);
  }
  return m;
}
function predictStep(b, m) { return vecMat(b, m.tr); }                    // ★ 動く：信念 × A
function updateStep(b, m, x) { return normRow(b.map((v, i) => v * m.em[i][x])); }   // ★ 見る：× b_i(x) して合計 1 に（全部 0 なら一様に戻す）
function entropyBits(b) { let h = 0; for (let v of b) if (v > 0) h -= v * Math.log2(v); return h; }
function rebuild() { ring = ringModel(DOORS, slip, OVER, sensErr); }
function restart() { robotPos = rndInt(0, DOORS.length - 1); belief = ring.p0.slice(); before = belief.slice(); phase = 'see'; lastSeen = -1; entHist = [entropyBits(belief)]; stepsDone = 0; }
function halfStep() {
  before = belief.slice();
  if (phase === 'see') { robotPos = sampleFrom(ring.tr[robotPos]); belief = predictStep(belief, ring); phase = 'move'; }
  else { lastSeen = sampleFrom(ring.em[robotPos]); belief = updateStep(belief, ring, lastSeen); phase = 'see'; stepsDone++; }
  entHist.push(entropyBits(belief)); if (entHist.length > 160) entHist.shift();
}

function draw() {
  background(...BG);
  if (auto && frameCount % 24 === 0) halfStep();
  let n = DOORS.length, best = argMax(belief);
  hudTitle('フィルタリング：ドアのセンサだけで自分の位置を推定する', 'スペース 半歩　A 自動 ' + (auto ? 'ON' : 'OFF') + '　↑↓ センサの誤り率 ' + fmtN(sensErr, 2) + '　← → すべる確率 ' + fmtN(slip, 2) + '　H ロボットを隠す　R やり直し');
  // ---- 輪の廊下
  let cx = Math.min(330, width * 0.27), cy = 430, rad = Math.min(190, height * 0.25);
  for (let i = 0; i < n; i++) {
    let a = -Math.PI / 2 + (i / n) * 2 * Math.PI, ux = Math.cos(a), uy = Math.sin(a), x = cx + ux * rad, y = cy + uy * rad;
    stroke(...LINEC); strokeWeight(1); fill(...PANEL); circle(x, y, 34);
    if (DOORS[i]) { noStroke(); fill(...LAN); rect(cx + ux * (rad - 30) - 5, cy + uy * (rad - 30) - 8, 10, 16, 2); }
    let len = clampv(belief[i] * 260, 0, 120); stroke(...ROSE); strokeWeight(9); strokeCap(SQUARE); line(cx + ux * (rad + 22), cy + uy * (rad + 22), cx + ux * (rad + 22 + len), cy + uy * (rad + 22 + len)); strokeCap(ROUND);
    noStroke(); fill(...(i === best ? ROSE : DIMC)); textSize(12); textAlign(CENTER, CENTER); text(i, x, y);
    if (showRobot && i === robotPos) { noFill(); stroke(...INK); strokeWeight(3); circle(x, y, 42); }
  }
  noStroke(); fill(...INK); textAlign(CENTER, CENTER); textSize(15);
  text(phase === 'move' ? '動いた → ぼやける（予測）' : lastSeen < 0 ? 'どこにいるかわからない' : '見た → とがる（更新）', cx, cy - 24);
  fill(...LAN); textSize(14); text(lastSeen < 0 ? '' : 'センサ：ドア' + (lastSeen ? 'あり' : 'なし') + (showRobot && phase === 'see' && lastSeen !== DOORS[robotPos] ? '（まちがい！）' : ''), cx, cy + 4);
  fill(...DIMC); textSize(12); text('黄 = ドア　ばら色の棒 = 信念　白い輪 = 本当の位置', cx, cy + 30);
  // ---- 棒グラフ（うすい枠 = 半歩前）
  let bx = Math.max(600, cx + rad + 190), bw = width - bx - 50, by = 130, bh = 220, top = Math.max(0.25, Math.max(...belief, ...before) * 1.1), cw = bw / n;
  note('信念 P(マス i にいる | これまでのセンサ)　うすい枠 = 半歩前', bx, by - 12, INK, 14);
  stroke(...LINEC); strokeWeight(1); line(bx, by + bh, bx + bw, by + bh);
  for (let i = 0; i < n; i++) {
    noStroke(); fill(...(DOORS[i] ? LAN : LINEC)); rect(bx + i * cw + 2, by + bh + 5, cw - 4, 6);
    fill(...ROSE); let h1 = (belief[i] / top) * bh; rect(bx + i * cw + 3, by + bh - h1, cw - 6, h1, 2);
    noFill(); stroke(...INK, 110); strokeWeight(1); let h0 = (before[i] / top) * bh; rect(bx + i * cw + 3, by + bh - h0, cw - 6, h0);
    noStroke(); fill(...DIMC); textSize(10); textAlign(CENTER, TOP); text(i, bx + i * cw + cw / 2, by + bh + 14);
    if (showRobot && i === robotPos) { fill(...INK); triangle(bx + i * cw + cw / 2, by + bh + 30, bx + i * cw + cw / 2 - 6, by + bh + 40, bx + i * cw + cw / 2 + 6, by + bh + 40); }
  }
  // ---- あいまいさ（エントロピー）の動き
  let g = { x: bx + 30, y: by + bh + 90, w: bw - 30, h: 170, x0: 0, x1: 160, y0: 0, y1: Math.log2(n) };
  plotAxes(g, '半歩', 'あいまいさ（エントロピー、ビット）', [0, 40, 80, 120, 160], [0, 1, 2, 3, 4]);
  drawCurve(g, entHist, AQUA, 2);
  note('動くたびに上がり、見るたびに下がる（のこぎりの形）。誤り率 0.5 のセンサは何も教えない', bx, g.y + g.h + 56, DIMC, 12);
  note('いちばんありそうなマス：' + best + '（確率 ' + fmtN(belief[best], 2) + '）' + (showRobot ? '　本当：' + robotPos + (best === robotPos ? '　✓' : '　✗') : '') + '　' + stepsDone + ' 歩め', bx, g.y + g.h + 82, INK, 15);
  drawSelfTest();
}

function keyPressed() {
  if (key === ' ') { halfStep(); auto = false; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'h' || key === 'H') showRobot = !showRobot;
  if (key === 'r' || key === 'R') restart();
  if (key === UP_ARROW) { sensErr = Math.min(0.5, Math.round((sensErr + 0.05) * 100) / 100); rebuild(); }
  if (key === DOWN_ARROW) { sensErr = Math.max(0, Math.round((sensErr - 0.05) * 100) / 100); rebuild(); }
  if (key === RIGHT_ARROW) { slip = Math.min(0.9, Math.round((slip + 0.05) * 100) / 100); rebuild(); }
  if (key === LEFT_ARROW) { slip = Math.max(0, Math.round((slip - 0.05) * 100) / 100); rebuild(); }
  return false;
}

// やってみよう
// 1. R でやり直して、信念の山が 1 つになるまで何歩かかるか数えよう。誤り率を 0.3 にすると？
// 2. 誤り率を 0.5 にすると信念はどうなる？ 0 にすると？（0 でも数歩は必要なのはなぜ？）
// 3. DOORS を [1,0,1,0,…] のくり返しにすると、信念の山はいくつ残る？
// 4. H でロボットを隠して、信念だけを見て位置を当てよう

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(720);
  let m = ringModel(DOORS, 0.15, 0.05, 0.15);
  check('廊下のモデル：A と B の行の合計 = 1、A は列の合計も 1（輪なのでかたよらない）', rowSumErr(m.tr) < 1e-12 && rowSumErr(m.em) < 1e-12 && m.tr.every((_, j) => near(sumOf(m.tr.map((r) => r[j])), 1, 1e-12)));
  // 5 マスの輪で総当たり（5^6 = 15625 本）と照合
  let small = ringModel([1, 0, 0, 1, 0], 0.2, 0.1, 0.2), xs = [1, 0, 0, 1, 1, 0], b = small.p0.slice(), worst = 0, fs = fwdScaled(small, emTable(small, xs));
  for (let t = 0; t < xs.length; t++) { b = updateStep(predictStep(b, small), small, xs[t]); let bf = bruteAll(small, emTable(small, xs.slice(0, t + 1))); worst = Math.max(worst, maxAbsDiff(b, bf.gam[t]), maxAbsDiff(b, fs.ah[t])); }
  check('5 マスの輪：予測 → 更新の信念 = 総当たり（最大 15625 本）の事後確率 = スケーリングつき前向き', worst < 1e-12);
  let okSum = true, bb = m.p0.slice(), pos = 3;
  for (let k = 0; k < 400; k++) { pos = sampleFrom(m.tr[pos]); bb = updateStep(predictStep(bb, m), m, sampleFrom(m.em[pos])); if (!near(sumOf(bb), 1, 1e-9) || !noNaN(bb)) okSum = false; }
  check('400 歩：信念の合計はいつも 1、NaN なし', okSum);
  let det = ringModel(DOORS, 0, 0, 0), d0 = new Array(20).fill(0); d0[19] = 1;
  check('すべらないなら、「動く」は信念をちょうど 1 マスずらす（19 → 0）', predictStep(d0, det)[0] === 1);
  let half = ringModel(DOORS, 0.15, 0.05, 0.5);
  check('誤り率 0.5 のセンサ：見ても信念は変わらない', maxAbsDiff(updateStep(bb, half, 1), bb) < 1e-12);
  let bd = det.p0.slice(), p = 7, when = -1;
  for (let k = 1; k <= 20; k++) { p = (p + 1) % 20; bd = updateStep(predictStep(bd, det), det, DOORS[p]); if (when < 0 && bd[p] > 1 - 1e-12) when = k; }
  check('まちがわないセンサ・すべらない：' + when + ' 歩で位置が 1 つに決まる（20 歩以内）', when > 0 && when <= 20);
  check('ありえない観測（信念が全部 0 になる）でも NaN にならず、一様に戻る', near(updateStep(d0, det, 1 - DOORS[19])[5], 1 / 20, 1e-12));
  let okEnt = true; for (let k = 0; k < 200; k++) { let r = normRow(m.p0.map(() => Math.pow(rnd(), 3))); if (entropyBits(predictStep(r, m)) < entropyBits(r) - 1e-12) okEnt = false; }
  check('「動く」であいまいさ（エントロピー）は減らない（200 個のでたらめな信念）', okEnt);
  let per = ringModel([1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0], 0.15, 0.05, 0.15), bp = per.p0.slice(), pp = 2, okPer = true;
  for (let k = 0; k < 60; k++) { pp = sampleFrom(per.tr[pp]); bp = updateStep(predictStep(bp, per), per, sampleFrom(per.em[pp])); for (let i = 0; i < 10; i++) if (!near(bp[i], bp[i + 10], 1e-12)) okPer = false; }
  check('ドアが 10 マスごとのくり返し模様：信念はいつも 2 つの同じ山（区別できない）', okPer);
  let hit = 0, runs = 300;
  for (let r = 0; r < runs; r++) { let q = rndInt(0, 19), bq = m.p0.slice(); for (let k = 0; k < 50; k++) { q = sampleFrom(m.tr[q]); bq = updateStep(predictStep(bq, m), m, sampleFrom(m.em[q])); } if (Math.min(Math.abs(argMax(bq) - q), 20 - Math.abs(argMax(bq) - q)) <= 1) hit++; }
  check('50 歩後：いちばんありそうなマスが本当の位置の ±1 マス以内 ' + Math.round((100 * hit) / runs) + '%（> 60%。でたらめなら 15%）', hit / runs > 0.6);
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
