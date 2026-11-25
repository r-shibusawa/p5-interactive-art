// ============================================
// 01 尤度と前向きアルゴリズム ─ となりの部屋の猫のきげん（ねむい・あそぶ・はらぺこ）は見えず、聞こえる音（しずか・ゴロゴロ・ニャー）だけがわかる。
// 「この音の列が出る確率 P(x)」は、きげんの道 N^T 本ぜんぶの確率の合計。総当たりは T が増えるとすぐ無理になる。
// 前向きアルゴリズム：格子（トレリス）の点に α_t(j) = P(ここまでの音, 今 j) を左から右へ書く。α_t(j) = b_j(x_t) × Σ_i α_{t−1}(i) a_ij。掛け算は T·N² 回くらい
// 2 匹の猫（のんびり・やんちゃ）のモデルで P(x) をくらべると、どちらの猫の音らしいかがわかる
// スペース 1 列すすめる / A 自動 / 下の音をクリックで変える / ↑↓ 長さ T / M 見る猫を切りかえ / R 新しい列
// ============================================

const C_STATES = ['ねむい', 'あそぶ', 'はらぺこ'], C_OBS = ['しずか', 'ゴロゴロ', 'ニャー'], CAT_NAMES = ['のんびり猫', 'やんちゃ猫'];
const cats = [                           // ★ 2 匹のモデル（p0 = はじめ、tr = A、em = B）
  { p0: [0.6, 0.2, 0.2], tr: [[0.8, 0.1, 0.1], [0.3, 0.5, 0.2], [0.3, 0.2, 0.5]], em: [[0.7, 0.25, 0.05], [0.3, 0.3, 0.4], [0.1, 0.1, 0.8]] },
  { p0: [0.2, 0.5, 0.3], tr: [[0.4, 0.4, 0.2], [0.1, 0.7, 0.2], [0.1, 0.5, 0.4]], em: [[0.6, 0.3, 0.1], [0.2, 0.2, 0.6], [0.05, 0.05, 0.9]] },
];
const T_MAX = 10;                        // ★ 長さの上限（総当たりは 3^10 = 59049 本まで）
let seq = [0, 1, 1, 2, 2, 0], shown = 0, colsDone = 1, auto = true, fw = null, liks = [0, 0], brute = null, obsHit = [], srcCat = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(71); refresh();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function refresh() {                     // 列かモデルが変わったら計算し直す
  fw = forwardCount(cats[shown], seq); liks = cats.map((m) => fwdPlain(m, emTable(m, seq)).lik);
  colsDone = 1; brute = { k: 0, sum: 0, total: Math.pow(3, seq.length), cur: null };
}
// ★ 前向きアルゴリズム（掛け算の回数も数える）
function forwardCount(m, xs) {
  let n = m.p0.length, al = [], mults = 0;
  for (let t = 0; t < xs.length; t++) {
    let row = [];
    for (let j = 0; j < n; j++) {
      let s = 0;
      if (t === 0) s = m.p0[j]; else for (let i = 0; i < n; i++) { s += al[t - 1][i] * m.tr[i][j]; mults++; }
      row.push(s * m.em[j][xs[t]]); mults++;
    }
    al.push(row);
  }
  return { al, lik: sumOf(al[al.length - 1]), mults };
}
function pathOfIndex(k, n, len) { let zs = new Array(len); for (let t = len - 1; t >= 0; t--) { zs[t] = k % n; k = Math.floor(k / n); } return zs; }   // k 番目の道（3 進法）
function pathProb(m, xs, zs) { let p = m.p0[zs[0]] * m.em[zs[0]][xs[0]]; for (let t = 1; t < xs.length; t++) p *= m.tr[zs[t - 1]][zs[t]] * m.em[zs[t]][xs[t]]; return p; }   // 掛け算 2T − 1 回
// ★ 総当たりを少しずつ進める（1 フレームに何本か）
function advanceBrute(b, m, xs, count) {
  let end = Math.min(b.total, b.k + count);
  for (; b.k < end; b.k++) { b.cur = pathOfIndex(b.k, 3, xs.length); b.sum += pathProb(m, xs, b.cur); }
}
function bruteMults(n, len) { return (2 * len - 1) * Math.pow(n, len); }
function forwardMults(n, len) { return n + (len - 1) * (n * n + n); }

function draw() {
  background(...BG);
  let m = cats[shown], len = seq.length;
  if (auto && frameCount % 40 === 0 && colsDone < len) colsDone++;
  if (brute.k < brute.total) advanceBrute(brute, m, seq, Math.max(1, Math.ceil(brute.total / 200)));
  hudTitle('尤度と前向きアルゴリズム：' + CAT_NAMES[shown] + 'がこの音の列を出す確率 P(x)', 'スペース 1 列すすめる　A 自動 ' + (auto ? 'ON' : 'OFF') + '　下の音をクリックで変える　↑↓ 長さ T = ' + len + '　M 猫を切りかえ　R 新しい列');
  // ---- トレリス
  let gx = 130, gy = 110, gw = Math.max(420, width - 560), gh = 250, tx = (t) => gx + ((t + 0.5) * gw) / len, ty = (j) => gy + ((j + 0.5) * gh) / 3, r = Math.min(30, gw / len / 2 - 6);
  for (let j = 0; j < 3; j++) note(C_STATES[j], 34, ty(j) + 5, ST_COLS[j], 14);
  for (let t = 1; t < len; t++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let on = t < colsDone; stroke(...(t === colsDone - 1 ? LAN : LINEC), on ? 60 + 190 * m.tr[i][j] : 40); strokeWeight(on ? 0.6 + 3 * m.tr[i][j] : 0.6); line(tx(t - 1) + r, ty(i), tx(t) - r, ty(j));
  }
  if (brute.cur && brute.k < brute.total) { stroke(...ROSE); strokeWeight(3); polyline(brute.cur.map((z, t) => [tx(t), ty(z)])); }
  obsHit = [];
  for (let t = 0; t < len; t++) {
    for (let j = 0; j < 3; j++) {
      let on = t < colsDone; stroke(...(on ? ST_COLS[j] : LINEC)); strokeWeight(on ? 2 : 1); fill(...PANEL); circle(tx(t), ty(j), 2 * r);
      if (on) { noStroke(); fill(...INK); textSize(r > 24 ? 12 : 10); textAlign(CENTER, CENTER); text(fmtP(fw.al[t][j]), tx(t), ty(j)); }
    }
    let bw = Math.min(74, gw / len - 6); noStroke(); fill(...LAN); rect(tx(t) - bw / 2, gy + gh + 12, bw, 26, 5);
    fill(...BG); textSize(bw > 60 ? 13 : 10); textAlign(CENTER, CENTER); text(C_OBS[seq[t]], tx(t), gy + gh + 25);
    obsHit.push({ x: tx(t) - bw / 2, y: gy + gh + 12, w: bw, h: 26 });
    note('t=' + (t + 1), tx(t) - 10, gy - 2, DIMC, 11);
  }
  note('聞こえた音', 34, gy + gh + 30, LAN, 13);
  let done = colsDone >= len;
  note('丸の中 = α_t(j)。黄色い線の列を計算中：α = （左の列の α × 矢印の確率）の合計 × その音を出す確率', gx, gy + gh + 66, DIMC, 13);
  note('P(x) = いちばん右の列の合計 = ' + (done ? fw.lik.toExponential(4) : '…（スペースで進める）'), gx, gy + gh + 92, INK, 16);
  // ---- 総当たり
  let by = gy + gh + 120; panelBox(30, by, gw + 110, 150);
  note('総当たり：' + brute.total + ' 本の道（ばら色の線）を 1 本ずつ足す', 46, by + 28, ROSE, 15);
  noStroke(); fill(...LINEC); rect(46, by + 44, gw + 70, 14, 4); fill(...ROSE); rect(46, by + 44, (gw + 70) * (brute.k / brute.total), 14, 4);
  note(brute.k + ' / ' + brute.total + ' 本　ここまでの合計 = ' + brute.sum.toExponential(4), 46, by + 84, INK, 14);
  if (brute.k >= brute.total) note('総当たり = 前向き ' + (Math.abs(brute.sum - fw.lik) <= 1e-12 * fw.lik ? '✓ 同じ答え' : '✗') + '（差 ' + Math.abs(brute.sum - fw.lik).toExponential(1) + '）', 46, by + 110, LEAF, 14);
  note('掛け算の回数：総当たり (2T − 1)·N^T = ' + bruteMults(3, len) + '　前向き = ' + fw.mults, 46, by + 136, DIMC, 13);
  // ---- 右：2 匹の比較と、回数のグラフ
  let rx = gx + gw + 50, post = normRow(liks);
  note('どちらの猫の音らしい？', rx, 126, INK, 16);
  for (let c = 0; c < 2; c++) {
    let yy = 150 + c * 54; noStroke(); fill(...(c === shown ? LAN : LINEC)); rect(rx, yy, 6, 40, 2);
    note(CAT_NAMES[c] + '　P(x) = ' + liks[c].toExponential(3), rx + 16, yy + 16, INK, 14);
    fill(...LINEC); rect(rx + 16, yy + 24, 300, 12, 3); fill(...(c === 0 ? AQUA : TANG)); rect(rx + 16, yy + 24, 300 * post[c], 12, 3);
    note(fmtN(post[c] * 100, 1) + '%', rx + 324, yy + 35, INK, 13);
  }
  note('（どちらの猫も同じくらいいるとして、P(猫 | 音) を計算）', rx, 276, DIMC, 12);
  if (srcCat >= 0) note('R で作った列の本当の出どころ：' + CAT_NAMES[srcCat], rx, 298, post[srcCat] > 0.5 ? LEAF : ROSE, 13);
  let g = { x: rx + 40, y: 350, w: Math.min(340, width - rx - 70), h: 250, x0: 1, x1: 20, y0: 0, y1: 12 };
  plotAxes(g, '長さ T', '掛け算の回数（10 の何乗か）', [1, 5, 10, 15, 20], [0, 3, 6, 9, 12]);
  let bc = [], fc = []; for (let t = 1; t <= 20; t++) { bc.push(Math.log10(bruteMults(3, t))); fc.push(Math.log10(forwardMults(3, t))); }
  drawCurve(g, bc, ROSE, 3, 1); drawCurve(g, fc, LAN, 3, 1);
  stroke(...INK, 120); strokeWeight(1); line(gX(g, len), g.y, gX(g, len), g.y + g.h);
  legend(g.x + 14, g.y + 18, [[ROSE, '総当たり (2T − 1)·N^T'], [LAN, '前向き ≈ T·N²']]);
  note('T = 20 で総当たりは約 ' + bruteMults(3, 20).toExponential(1) + ' 回、前向きは ' + forwardMults(3, 20) + ' 回', rx, g.y + g.h + 56, DIMC, 12);
  drawSelfTest();
}

function mousePressed() {
  for (let t = 0; t < obsHit.length; t++) { let h = obsHit[t]; if (mouseX >= h.x && mouseX < h.x + h.w && mouseY >= h.y && mouseY < h.y + h.h) { seq[t] = (seq[t] + 1) % 3; srcCat = -1; refresh(); colsDone = seq.length; return; } }
}
function keyPressed() {
  if (key === ' ') { if (colsDone >= seq.length) colsDone = 1; else colsDone++; auto = false; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'm' || key === 'M') { shown = 1 - shown; refresh(); colsDone = seq.length; }
  if (key === 'r' || key === 'R') { srcCat = rnd() < 0.5 ? 0 : 1; seq = hmmSample(cats[srcCat], seq.length).xs; refresh(); }
  if (key === UP_ARROW && seq.length < T_MAX) { seq.push(rndInt(0, 2)); srcCat = -1; refresh(); }
  if (key === DOWN_ARROW && seq.length > 2) { seq.pop(); srcCat = -1; refresh(); }
  return false;
}

// やってみよう
// 1. 音を全部「ニャー」にすると、どちらの猫らしい？ 全部「しずか」なら？
// 2. ↑ で T を 10 にすると総当たりは何本？ T = 20 だと 1 秒に 1 億本数えても何秒かかる？
// 3. トレリスの 1 つの丸の α は、そこを通る何本の道の合計になっている？（t = 3 なら 3² = 9 本）
// 4. cats の em（B）を 2 匹とも同じにすると、見分けるのはむずかしくなる？ 何で見分けている？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(710);
  check('2 つのモデルの π・A・B の行の合計 = 1', cats.every((m) => near(sumOf(m.p0), 1, 1e-12) && rowSumErr(m.tr) < 1e-12 && rowSumErr(m.em) < 1e-12));
  let worst = 0, okM = true;
  for (let k = 0; k < 24; k++) {
    let m = cats[k % 2], len = rndInt(1, 8), xs = hmmSample(m, len).xs, eb = emTable(m, xs), bf = bruteAll(m, eb), f = forwardCount(m, xs), b = bwdPlain(m, eb);
    worst = Math.max(worst, Math.abs(f.lik - bf.lik) / bf.lik, Math.abs(b.lik - bf.lik) / bf.lik, Math.abs(fwdPlain(m, eb).lik - f.lik) / bf.lik);
    if (f.mults !== forwardMults(3, len)) okM = false;
  }
  check('尤度：前向き = N^T 本の総当たり = 後ろ向き（24 本の列、T ≤ 8、相対誤差 < 1e-12）', worst < 1e-12);
  check('前向きの掛け算の回数 = N + (T − 1)(N² + N)', okM && forwardMults(3, 6) === 63);
  let xs10 = hmmSample(cats[0], 10).xs, b10 = { k: 0, sum: 0, total: 59049, cur: null }, steps = 0;
  while (b10.k < b10.total && steps++ < 1000) advanceBrute(b10, cats[0], xs10, 296);
  check('T = 10：少しずつ進めた総当たり 59049 本の合計 = 前向き', b10.k === 59049 && near(b10.sum, forwardCount(cats[0], xs10).lik, 1e-12 * b10.sum));
  check('総当たりの掛け算は (2T − 1)·N^T：T = 10 で 1121931 回、前向きは 111 回', bruteMults(3, 10) === 1121931 && forwardMults(3, 10) === 111);
  let tot = 0; for (let k = 0; k < 81; k++) tot += forwardCount(cats[1], pathOfIndex(k, 3, 4)).lik;
  check('長さ 4 の音の列 81 通りの P(x) の合計 = 1', near(tot, 1, 1e-12));
  let right = 0, nTry = 600;
  for (let k = 0; k < nTry; k++) { let c = k % 2, xs = hmmSample(cats[c], 12).xs, l0 = forwardCount(cats[0], xs).lik, l1 = forwardCount(cats[1], xs).lik; if ((l1 > l0 ? 1 : 0) === c) right++; }
  check('長さ 12 の列 600 本：尤度の大きいほうの猫と答えると ' + Math.round((100 * right) / nTry) + '% 当たる（> 75%）', right / nTry > 0.75);
  let zs = pathOfIndex(5, 3, 3);
  check('道の番号 → 道（3 進法）：5 番 = [0, 1, 2]、道の確率 = π b a b a b', zs.join() === '0,1,2' && near(pathProb(cats[0], [0, 0, 2], zs), 0.6 * 0.7 * 0.1 * 0.3 * 0.2 * 0.8, 1e-15));
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
