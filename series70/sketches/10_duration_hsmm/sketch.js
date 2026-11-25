// ============================================
// 10 滞在時間 ─ 灯台のあかり（ついている・消えている）を、霧ごしに見ている（ときどき見まちがえる）。
// HMM では「同じ状態にとどまる長さ」は必ず幾何分布 P(d) = (1 − a) a^(d−1) になる：いちばん多いのは長さ 1 で、長いほど少ない。平均は 1 / (1 − a)。
// でも本物の灯台は「だいたい 8 秒ついて、8 秒消える」。隠れセミマルコフモデル（HSMM）は、状態に入るたびに滞在時間 d を好きな分布から選び、d 回そこにとどまる。
// 下のヒストグラムの棒をドラッグして、滞在時間の分布を自由に決めよう。HMM は平均だけ同じにそろえてある。
// 棒をドラッグ 滞在時間の分布 / 1 山形 2 ほぼ一定 3 二山 4 幾何分布（HMM と同じ）/ スペース 新しい列 / R 最初にもどす
// ============================================

const D_MAX = 20;                        // ★ 滞在時間の上限
const lamp = { p0: [0.5, 0.5], tr: [[0, 1], [1, 0]], em: [[0.85, 0.15], [0.2, 0.8]] };   // ★ 状態 0 = 消えている、1 = ついている。tr = 「出たあと」の行き先（自分にはもどらない）
const N_SHOW = 240;                      // ★ 帯に表示する長さ
let durW = [], preset = 1, seqSeed = 80, view = null, barsBox = null, dragging = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  durW = presetWeights(1); refresh();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function presetWeights(k) {              // 滞在時間 d = 1〜D_MAX の重み（合計は自動で 1 にする）
  let w = new Array(D_MAX).fill(0);
  for (let d = 1; d <= D_MAX; d++) {
    if (k === 1) w[d - 1] = Math.exp(-0.5 * ((d - 8) / 1.6) ** 2);
    if (k === 2) w[d - 1] = d === 6 ? 0.8 : d === 5 || d === 7 ? 0.1 : 0;
    if (k === 3) w[d - 1] = Math.exp(-0.5 * ((d - 2) / 0.8) ** 2) + Math.exp(-0.5 * ((d - 14) / 1.5) ** 2);
    if (k === 4) w[d - 1] = d < D_MAX ? 0.2 * Math.pow(0.8, d - 1) : Math.pow(0.8, D_MAX - 1);
  }
  return w;
}
function pmfMean(p) { let s = 0; for (let d = 1; d <= p.length; d++) s += d * p[d - 1]; return s; }
function matchedHmm(h, pmf) { let a = clampv(1 - 1 / pmfMean(pmf), 0, 0.999); return { p0: h.p0, tr: [[a, 1 - a], [1 - a, a]], em: h.em }; }   // ★ 平均の滞在時間が同じ HMM：a_ii = 1 − 1/平均
// ★ HSMM のサンプル：状態に入る → 滞在時間 d を選ぶ → d 回とどまって観測を出す → 別の状態へ
function hsmmSample(h, pmf, n) {
  let z = sampleFrom(h.p0), zs = [], xs = [];
  while (zs.length < n) { let d = sampleFrom(pmf) + 1; for (let k = 0; k < d && zs.length < n; k++) { zs.push(z); xs.push(sampleFrom(h.em[z])); } z = sampleFrom(h.tr[z]); }
  return { zs, xs };
}
function dwellsOf(zs) { let out = [], s = 0; for (let t = 1; t < zs.length; t++) if (zs[t] !== zs[s]) { out.push(t - s); s = t; } return out; }   // 最後まで見とどけた滞在の長さ（とちゅうで切れた最後の 1 つは数えない）
function histOf(lens, dmax) { let h = new Array(dmax).fill(0); for (let d of lens) h[Math.min(d, dmax) - 1]++; return normRow(h); }
// ★ HSMM の前向き（対数）：la[t][j] = log P(x_1..x_t, 時刻 t でちょうど状態 j の滞在が終わる)
//   = logSumExp_d [ log p_j(d) + （その d 個の観測を j が出す log 確率）+ （その前：t = d なら log π_j、そうでなければ logSumExp_i (la[t−d][i] + log a_ij)）]
//   列の終わりは滞在のとちゅうでもよい（最後の滞在は「d 以上」の確率を使う）
function hsmmForward(h, pmf, xs) {
  let n = h.p0.length, len = xs.length, dm = pmf.length, la = [], surv = new Array(dm + 2).fill(0);
  for (let d = dm; d >= 1; d--) surv[d] = surv[d + 1] + pmf[d - 1];              // surv[d] = P(滞在 ≥ d)
  let enter = (t, j) => { if (t < 0) return lg(h.p0[j]); let b = []; for (let i = 0; i < n; i++) b.push(la[t][i] + lg(h.tr[i][j])); return logSumExp(b); };   // 時刻 t のあとに状態 j へ入る
  let run = (t, d, j) => { let s = 0; for (let k = t - d + 1; k <= t; k++) s += lg(h.em[j][xs[k]]); return s; };
  for (let t = 0; t < len; t++) { let row = []; for (let j = 0; j < n; j++) { let terms = []; for (let d = 1; d <= Math.min(dm, t + 1); d++) terms.push(lg(pmf[d - 1]) + run(t, d, j) + enter(t - d, j)); row.push(logSumExp(terms)); } la.push(row); }
  let fin = []; for (let j = 0; j < n; j++) for (let d = 1; d <= Math.min(dm, len); d++) fin.push(lg(surv[d]) + run(len - 1, d, j) + enter(len - 1 - d, j));
  return len ? logSumExp(fin) : 0;
}
// ★ 同じ HSMM を「状態 = (状態, 残りの滞在時間)」のふつうの HMM に広げる（状態の数は N × D_MAX）。尤度は同じになるはず
function expandHsmm(h, pmf) {
  let n = h.p0.length, dm = pmf.length, tot = n * dm, m = { p0: new Array(tot).fill(0), tr: [], em: [] };
  for (let i = 0; i < n; i++) for (let r = 1; r <= dm; r++) {
    let row = new Array(tot).fill(0); m.p0[i * dm + r - 1] = h.p0[i] * pmf[r - 1];
    if (r > 1) row[i * dm + r - 2] = 1; else for (let j = 0; j < n; j++) for (let d = 1; d <= dm; d++) row[j * dm + d - 1] += h.tr[i][j] * pmf[d - 1];
    m.tr.push(row); m.em.push(h.em[i].slice());
  }
  return m;
}
function refresh() {
  let pmf = normRow(durW), hm = matchedHmm(lamp, pmf);
  seedRng(seqSeed); let a = hmmSample(hm, N_SHOW), b = hsmmSample(lamp, pmf, N_SHOW);
  let la = hmmSample(hm, 30000), lb = hsmmSample(lamp, pmf, 30000);
  view = { pmf, hm, a, b, histA: histOf(dwellsOf(la.zs), D_MAX), histB: histOf(dwellsOf(lb.zs), D_MAX), mean: pmfMean(pmf),
    llHsmm: hsmmForward(lamp, pmf, b.xs), llHmm: hmmLogLik(hm, b.xs), llHsmmA: hsmmForward(lamp, pmf, a.xs), llHmmA: hmmLogLik(hm, a.xs) };
}

function draw() {
  background(...BG);
  let v = view, aii = v.hm.tr[0][0];
  hudTitle('滞在時間：HMM は必ず幾何分布、隠れセミマルコフモデル（HSMM）は自由', '下の棒をドラッグ 滞在時間の分布　1 山形　2 ほぼ一定　3 二山　4 幾何分布　スペース 新しい列　R 最初にもどす');
  let x0 = 60, bw = width - 120, colOf = (z) => (z ? LAN : [58, 68, 86]);
  note('HMM が作った列（a_ii = ' + fmtN(aii, 3) + '、平均の滞在 1 / (1 − a_ii) = ' + fmtN(1 / (1 - aii), 2) + '）：短い滞在がたくさん、ときどきとても長い', x0, 112, AQUA, 13);
  drawBand(v.a.zs, x0, 120, bw, 22, colOf); obsRow(v.a.xs, x0, 146, bw);
  note('HSMM が作った列（平均の滞在 ' + fmtN(v.mean, 2) + '）：決めた分布どおりの長さ', x0, 190, ROSE, 13);
  drawBand(v.b.zs, x0, 198, bw, 22, colOf); obsRow(v.b.xs, x0, 224, bw);
  note('帯 = 本当のあかり（黄 = ついている）　下の点 = 霧ごしに見えたもの（ときどきまちがう）', x0, 258, DIMC, 12);
  // ---- ヒストグラム 2 つ
  let hy = 310, hh = Math.max(140, height - hy - 190), hw = Math.min(480, (width - 180) / 2), top = Math.max(0.3, Math.max(...v.pmf, 1 - aii) * 1.15);
  histogram(x0 + 20, hy, hw, hh, v.histA, (d) => (d < D_MAX ? (1 - aii) * Math.pow(aii, d - 1) : Math.pow(aii, D_MAX - 1)), top, AQUA, 'HMM の滞在時間（3 万歩を数えた棒と、幾何分布の式 ●）');
  barsBox = { x: x0 + hw + 100, y: hy, w: hw, h: hh, top };
  histogram(barsBox.x, hy, hw, hh, v.histB, (d) => v.pmf[d - 1], top, ROSE, 'HSMM の滞在時間（数えた棒と、決めた分布 ●）← ドラッグで変える');
  let ty = hy + hh + 64;
  note('どちらのモデルが列をよく説明する？（観測だけを見た対数尤度。大きいほうが勝ち）', x0, ty, INK, 14);
  note('HSMM が作った列：HSMM ' + fmtN(v.llHsmm, 1) + '　HMM ' + fmtN(v.llHmm, 1) + '　→ 差 ' + fmtN(v.llHsmm - v.llHmm, 1), x0, ty + 26, ROSE, 14);
  note('HMM が作った列：HSMM ' + fmtN(v.llHsmmA, 1) + '　HMM ' + fmtN(v.llHmmA, 1) + '　→ 差 ' + fmtN(v.llHsmmA - v.llHmmA, 1), x0, ty + 50, AQUA, 14);
  note(preset === 4 ? '4 の幾何分布にすると 2 つのモデルは同じもの → 差はほぼ 0' : '平均が同じでも、長さの「形」がちがうと別のモデル。HSMM は状態を (状態, 残り時間) に広げた大きな HMM とも言える', x0, ty + 78, DIMC, 12);
  drawSelfTest();
}
function obsRow(xs, x, y, w) { let n = xs.length; noStroke(); for (let t = 0; t < n; t++) { fill(...(xs[t] ? LAN : LINEC)); rect(x + (t / n) * w, y, Math.max(1, w / n - 1), xs[t] ? 8 : 4); } }
function histogram(x, y, w, h, hist, formula, top, col, title) {
  note(title, x, y - 12, col, 13); stroke(...LINEC); strokeWeight(1); line(x, y + h, x + w, y + h);
  let cw = w / D_MAX;
  for (let d = 1; d <= D_MAX; d++) {
    noStroke(); fill(...col, 190); let bh = clampv(hist[d - 1] / top, 0, 1) * h; rect(x + (d - 1) * cw + 2, y + h - bh, cw - 4, bh, 2);
    fill(...INK); circle(x + (d - 0.5) * cw, y + h - clampv(formula(d) / top, 0, 1) * h, 6);
    if (d % 2 === 1 || d === D_MAX) { fill(...DIMC); textSize(11); textAlign(CENTER, TOP); text(d === D_MAX ? d + '+' : d, x + (d - 0.5) * cw, y + h + 4); }
  }
  note('滞在時間 d', x + w - 64, y + h + 34, DIMC, 12);
}
function editBar() {
  let b = barsBox; if (!b || mouseX < b.x || mouseX > b.x + b.w || mouseY < b.y - 20 || mouseY > b.y + b.h + 10) return false;
  let d = clampv(Math.floor(((mouseX - b.x) / b.w) * D_MAX), 0, D_MAX - 1), p = clampv(((b.y + b.h - mouseY) / b.h) * b.top, 0, 1), cur = normRow(durW);
  cur[d] = p; durW = cur; preset = 0; refresh(); return true;
}

function mousePressed() { dragging = editBar(); }
function mouseDragged() { if (dragging) editBar(); }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key >= '1' && key <= '4' && String(key).length === 1) { preset = Number(key); durW = presetWeights(preset); refresh(); }
  if (key === ' ') { seqSeed++; refresh(); }
  if (key === 'r' || key === 'R') { preset = 1; durW = presetWeights(1); seqSeed = 80; refresh(); }
  return false;
}

// やってみよう
// 1. 上の 2 本の帯をくらべよう。HMM の列には長さ 1 や 2 の「ちらつき」が多いのはなぜ？
// 2. 2（ほぼ一定）にすると、HSMM の列は時計のようになる。このとき対数尤度の差はどのくらい？
// 3. 4（幾何分布）にすると、2 つのヒストグラムと対数尤度はどうなる？
// 4. 棒をドラッグして「長さ 3 か 12 のどちらか」という分布を作ろう。HMM でまねするには状態をいくつ用意すればよい？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(800);
  let hm = { p0: [0.5, 0.5], tr: [[0.9, 0.1], [0.1, 0.9]], em: lamp.em }, dw = dwellsOf(hmmSample(hm, 400000).zs), mean = sumOf(dw) / dw.length, h1 = histOf(dw, D_MAX);
  check('HMM（a_ii = 0.9）の滞在時間 ' + dw.length + ' 個：平均 ' + fmtN(mean, 2) + ' は 1 / (1 − a_ii) = 10 の ±5% 以内', dw.length > 30000 && Math.abs(mean - 10) < 0.5);
  let worstG = 0; for (let d = 1; d < D_MAX; d++) worstG = Math.max(worstG, Math.abs(h1[d - 1] - 0.1 * Math.pow(0.9, d - 1)));
  check('HMM の滞在時間のヒストグラム = 幾何分布 0.1 × 0.9^(d−1)（ずれ < 0.01）。いちばん多いのは d = 1', worstG < 0.01 && argMax(h1.slice(0, D_MAX - 1)) === 0);
  let okH = true, means = [];
  for (let k = 1; k <= 3; k++) { let pmf = normRow(presetWeights(k)), d2 = dwellsOf(hsmmSample(lamp, pmf, 300000).zs), h2 = histOf(d2, D_MAX); if (maxAbsDiff(h2, pmf) > 0.015 || d2.length < 10000 || Math.max(...d2) > D_MAX) okH = false; means.push(Math.abs(sumOf(d2) / d2.length - pmfMean(pmf))); }
  check('HSMM の滞在時間のヒストグラム = 決めた分布（3 つの形、ずれ < 0.015）、上限 ' + D_MAX + ' をこえない', okH && Math.max(...means) < 0.1);
  let worst = 0, worstE = 0;
  for (let k = 0; k < 12; k++) {
    let dm = rndInt(2, 5), pmf = normRow(new Array(dm).fill(0).map(() => rnd())), len = rndInt(1, 9), xs = []; for (let t = 0; t < len; t++) xs.push(rndInt(0, 1));
    let f = hsmmForward(lamp, pmf, xs), ex = expandHsmm(lamp, pmf);
    worst = Math.max(worst, Math.abs(f - Math.log(hsmmBrute(lamp, pmf, xs)))); worstE = Math.max(worstE, Math.abs(f - hmmLogLik(ex, xs)), rowSumErr(ex.tr), Math.abs(sumOf(ex.p0) - 1));
  }
  check('HSMM の前向き = 2^T 本の状態の列の総当たり（12 通り、T ≤ 9、差 < 1e-10）', worst < 1e-10);
  check('HSMM の前向き = 「(状態, 残り時間)」に広げたふつうの HMM の前向き（差 < 1e-10）', worstE < 1e-10);
  let geo = normRow(presetWeights(4)), g2 = { p0: lamp.p0, tr: [[0.8, 0.2], [0.2, 0.8]], em: lamp.em }, xs12 = hmmSample(g2, 12).xs;
  check('滞在時間を幾何分布にした HSMM = HMM（a_ii = 0.8）：長さ 12 の列の尤度が一致', near(hsmmForward(lamp, geo, xs12), hmmLogLik(g2, xs12), 1e-10) && near(sumOf(geo), 1, 1e-12));
  let bump = normRow(presetWeights(1)), mh = matchedHmm(lamp, bump);
  check('平均をそろえた HMM：a_ii = 1 − 1 / 平均、幾何分布の平均 1 / (1 − a_ii) = ' + fmtN(pmfMean(bump), 3), near(1 / (1 - mh.tr[0][0]), pmfMean(bump), 1e-9) && rowSumErr(mh.tr) < 1e-12);
  let data = hsmmSample(lamp, bump, 1500).xs, a = hsmmForward(lamp, bump, data), b = hmmLogLik(mh, data);
  check('山形の HSMM が作った 1500 個の観測：HSMM の対数尤度 ' + fmtN(a, 1) + ' > 平均をそろえた HMM ' + fmtN(b, 1) + '（差 > 20）', a > b + 20 && isFinite(a));
  check('棒が全部 0 でも分布は一様になり NaN にならない', near(sumOf(normRow(new Array(D_MAX).fill(0))), 1, 1e-12) && noNaN(hsmmSample(lamp, normRow(new Array(D_MAX).fill(0)), 50).zs));
  reportSelfTest();
}
function hsmmBrute(h, pmf, xs) {         // 総当たり：2^T 本の状態の列。同じ状態の続き = 1 つの滞在。最後の滞在だけ「d 以上」
  let n = h.p0.length, len = xs.length, tot = 0, surv = (d) => { let s = 0; for (let k = d; k <= pmf.length; k++) s += pmf[k - 1]; return s; };
  for (let k = 0; k < Math.pow(n, len); k++) {
    let zs = [], r = k; for (let t = 0; t < len; t++) { zs.push(r % n); r = Math.floor(r / n); }
    let p = h.p0[zs[0]], s = 0;
    for (let t = 0; t < len; t++) { p *= h.em[zs[t]][xs[t]]; if (t + 1 < len && zs[t + 1] !== zs[t]) { let d = t - s + 1; p *= (d <= pmf.length ? pmf[d - 1] : 0) * h.tr[zs[t]][zs[t + 1]]; s = t + 1; } }
    tot += p * surv(len - s);
  }
  return tot;
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
