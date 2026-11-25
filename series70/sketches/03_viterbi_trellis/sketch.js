// ============================================
// 03 ビタビの最尤経路 ─ となりの部屋の人（寝ている・料理・ゲーム）は見えず、聞こえる音（しずか・カチャカチャ・笑い声）だけがわかる。
// 「いちばんありそうな 1 本の道」をさがす：トレリスの各点に δ_t(j) = 「ここで終わるいちばん良い道の確率」と、1 つ前の状態への戻り矢印を書く。
//   δ_t(j) = b_j(x_t) × max_i δ_{t−1}(i) a_ij。最後の列でいちばん大きい点から、矢印を逆にたどる（足し算を max に変えた前向き。マックスプラスはシリーズ 59 の 13）
// 事後復号 = 時刻ごとに γ_t がいちばん大きい状態をつないだ道。ビタビの道とちがうことがあり、つないだ道が「ありえない」（確率 0）こともある
//   このモデルでは「寝ている → ゲーム」は起きない（a = 0）
// スペース 1 列すすめる / A 自動 / 1 2 3 例 / 下の音をクリックで変える / P 事後復号を表示 / R ランダムな音
// ============================================

const V_STATES = ['寝ている', '料理', 'ゲーム'], V_OBS = ['しずか', 'カチャカチャ', '笑い声'];
const room = {                           // ★ モデル（寝ている → ゲーム は 0）
  p0: [0.4, 0.4, 0.2],
  tr: [[0.7, 0.3, 0], [0.2, 0.4, 0.4], [0.2, 0.2, 0.6]],
  em: [[0.8, 0.1, 0.1], [0.1, 0.8, 0.1], [0.2, 0.2, 0.6]],
};
const EXAMPLES = [[0, 0, 1, 1, 2, 2], [2, 1, 0, 2, 2, 2], [1, 0, 0, 2, 2, 0]];   // ★ 例 1 同じ道 / 例 2 ちがう道 / 例 3 事後復号の道が確率 0
const EX_NOTES = ['例 1：2 つの道は同じ', '例 2：2 つの道がちがう', '例 3：事後復号の道は「寝ている → ゲーム」を通る → 確率 0'];
let seq = EXAMPLES[2].slice(), exNo = 2, colsDone = 1, auto = true, showPost = true, vit = null, sm = null, pd = [], obsHit = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(73); refresh();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function refresh() { let eb = emTable(room, seq); vit = viterbiLog(room, eb); sm = smoothAll(room, eb); pd = postDecode(sm.gam); colsDone = 1; }
function expectedHits(gam, zs) { let s = 0; for (let t = 0; t < zs.length; t++) s += gam[t][zs[t]]; return s; }   // その道が当たっている時刻の数の期待値

function draw() {
  background(...BG);
  let len = seq.length, eb = emTable(room, seq), done = colsDone >= len;
  if (auto && frameCount % 45 === 0 && colsDone < len) colsDone++;
  hudTitle('ビタビの最尤経路：戻り矢印つきのトレリス', 'スペース 1 列すすめる　A 自動 ' + (auto ? 'ON' : 'OFF') + '　1 2 3 例　下の音をクリックで変える　P 事後復号 ' + (showPost ? 'ON' : 'OFF') + '　R ランダムな音');
  let gx = 150, gy = 120, gw = Math.max(520, width - 520), gh = 300, tx = (t) => gx + ((t + 0.5) * gw) / len, ty = (j) => gy + ((j + 0.5) * gh) / 3, r = Math.min(34, gw / len / 2 - 10);
  for (let j = 0; j < 3; j++) note(V_STATES[j], 34, ty(j) + 5, ST_COLS[j], 15);
  // うすい線 = できる遷移、太い線 = 戻り矢印（各点の「1 つ前」）
  for (let t = 1; t < len; t++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (room.tr[i][j] > 0) { stroke(...LINEC, 90); strokeWeight(1); line(tx(t - 1) + r, ty(i), tx(t) - r, ty(j)); }
  for (let t = 1; t < colsDone; t++) for (let j = 0; j < 3; j++) {
    let i = vit.bp[t][j]; if (i < 0 || vit.dl[t][j] === -Infinity) continue;
    let onPath = done && vit.vitPath[t] === j; stroke(...(onPath ? LAN : DIMC)); fill(...(onPath ? LAN : DIMC)); strokeWeight(onPath ? 5 : 2);
    arrowLine(tx(t) - r, ty(j), tx(t - 1) + r, ty(i), onPath ? 12 : 8);
  }
  obsHit = [];
  for (let t = 0; t < len; t++) {
    for (let j = 0; j < 3; j++) {
      let on = t < colsDone, onPath = done && vit.vitPath[t] === j;
      stroke(...(onPath ? LAN : on ? ST_COLS[j] : LINEC)); strokeWeight(onPath ? 5 : on ? 2 : 1); fill(...PANEL); circle(tx(t), ty(j), 2 * r);
      if (on) { noStroke(); fill(...INK); textSize(12); textAlign(CENTER, CENTER); text(fmtP(Math.exp(vit.dl[t][j])), tx(t), ty(j) - 5); }
      if (showPost) {
        noStroke(); fill(...(pd[t] === j ? ROSE : DIMC)); textSize(10); textAlign(CENTER, CENTER); text('γ ' + fmtN(sm.gam[t][j], 2), tx(t), ty(j) + 11);
        if (pd[t] === j) { noFill(); stroke(...ROSE); strokeWeight(2); circle(tx(t), ty(j), 2 * r + 12); }
      }
    }
    let bw = Math.min(96, gw / len - 8); noStroke(); fill(...LAN); rect(tx(t) - bw / 2, gy + gh + 10, bw, 26, 5);
    fill(...BG); textSize(bw > 80 ? 13 : 10); textAlign(CENTER, CENTER); text(V_OBS[seq[t]], tx(t), gy + gh + 23);
    obsHit.push({ x: tx(t) - bw / 2, y: gy + gh + 10, w: bw, h: 26 });
  }
  note('聞こえた音', 34, gy + gh + 28, LAN, 13);
  note('丸の中 上 = δ（ここで終わるいちばん良い道の確率）　灰色の矢印 = 戻り矢印　黄 = 最後からたどったビタビの道　ばら色の輪 = γ がいちばん大きい状態', gx - 110, gy + gh + 62, DIMC, 12);
  // ---- 2 つの道の比較
  let py = gy + gh + 80, pv = Math.exp(vit.logP), pp = Math.exp(pathLogProb(room, eb, pd)), same = pd.join() === vit.vitPath.join();
  panelBox(30, py, Math.min(width - 60, 1180), 190);
  note(exNo >= 0 ? EX_NOTES[exNo] : '自分で変えた音の列', 46, py + 28, INK, 16);
  pathRow('ビタビの道', vit.vitPath, 46, py + 62, LAN, done);
  if (done) note('P(道, 音) = ' + fmtP(pv) + '　当たる時刻の期待値 ' + fmtN(expectedHits(sm.gam, vit.vitPath), 2) + ' / ' + len, 46 + 150 + len * 84, py + 67, LAN, 14);
  pathRow('事後復号の道', pd, 46, py + 100, ROSE, showPost);
  if (showPost) note('P(道, 音) = ' + fmtP(pp) + (pp === 0 ? '（ありえない道！）' : '') + '　当たる時刻の期待値 ' + fmtN(expectedHits(sm.gam, pd), 2) + ' / ' + len, 46 + 150 + len * 84, py + 105, ROSE, 14);
  note(!done ? 'スペースで最後の列まで進めると、黄色の道が決まる' : same ? '2 つの道は同じ。' : pp === 0 ? '時刻ごとの「いちばん」をつなぐと、起こりえない移り方（寝ている → ゲーム）が入った。道として使うならビタビ。' : '道まるごとの確率はビタビが最大。時刻ごとの当たりやすさは事後復号が最大。', 46, py + 142, INK, 14);
  note('ビタビ = 道まるごとの確率を最大に　／　事後復号 = 各時刻の当たる確率を最大に（道としてのつながりは考えない）', 46, py + 170, DIMC, 13);
  drawSelfTest();
}
function pathRow(name, zs, x, y, col, visible) {
  note(name, x, y + 5, col, 14);
  for (let t = 0; t < zs.length; t++) {
    noStroke(); fill(...(visible ? ST_COLS[zs[t]] : LINEC)); rect(x + 130 + t * 84, y - 12, 78, 24, 5);
    if (visible) { fill(...BG); textSize(13); textAlign(CENTER, CENTER); text(V_STATES[zs[t]], x + 130 + t * 84 + 39, y); }
    if (visible && t > 0 && room.tr[zs[t - 1]][zs[t]] === 0) { stroke(255, 90, 90); strokeWeight(3); line(x + 130 + t * 84 - 12, y - 10, x + 130 + t * 84 + 4, y + 10); line(x + 130 + t * 84 + 4, y - 10, x + 130 + t * 84 - 12, y + 10); }
  }
}

function mousePressed() {
  for (let t = 0; t < obsHit.length; t++) { let h = obsHit[t]; if (mouseX >= h.x && mouseX < h.x + h.w && mouseY >= h.y && mouseY < h.y + h.h) { seq[t] = (seq[t] + 1) % 3; exNo = -1; refresh(); colsDone = seq.length; return; } }
}
function keyPressed() {
  if (key === ' ') { if (colsDone >= seq.length) colsDone = 1; else colsDone++; auto = false; }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'p' || key === 'P') showPost = !showPost;
  if (key === '1' || key === '2' || key === '3') { exNo = Number(key) - 1; seq = EXAMPLES[exNo].slice(); refresh(); }
  if (key === 'r' || key === 'R') { seq = seq.map(() => rndInt(0, 2)); exNo = -1; refresh(); }
  return false;
}

// やってみよう
// 1. 例 3 で、事後復号の道のどこが「ありえない」？ そこの音を 1 つ変えると 2 つの道はそろう？
// 2. 音をクリックで変えて、ビタビの道が「全部 寝ている」になる列を作ろう。笑い声が 1 回まじってもそうなる？
// 3. room.tr の「寝ている → ゲーム」を 0.1 にすると（行の合計は 1 に）、例 3 はどう変わる？
// 4. 丸の中の δ は右へ行くほど小さくなる。長さ 1000 の列ではどうなる？（→ 06）

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(730);
  check('π・A・B の行の合計 = 1、寝ている → ゲーム は 0', near(sumOf(room.p0), 1, 1e-12) && rowSumErr(room.tr) < 1e-12 && rowSumErr(room.em) < 1e-12 && room.tr[0][2] === 0);
  let worst = 0, okBack = true, okOrder = true, nDiff = 0, nZero = 0;
  for (let k = 0; k < 729; k++) {
    let xs = []; let q = k; for (let t = 0; t < 6; t++) { xs.push(q % 3); q = Math.floor(q / 3); }
    let eb = emTable(room, xs), v = viterbiLog(room, eb), bf = bruteAll(room, eb), s = smoothAll(room, eb), dec = postDecode(s.gam), lp = pathLogProb(room, eb, dec);
    worst = Math.max(worst, Math.abs(Math.exp(v.logP) - bf.bestP) / bf.bestP, Math.abs(pathLogProb(room, eb, v.vitPath) - v.logP));
    for (let j = 0; j < 3; j++) { let zs = [], z = j; for (let t = 5; t >= 0; t--) { zs[t] = z; z = v.bp[t][z] >= 0 ? v.bp[t][z] : 0; } if (v.dl[5][j] > -Infinity && Math.abs(pathLogProb(room, eb, zs) - v.dl[5][j]) > 1e-12) okBack = false; }
    if (lp > v.logP + 1e-12 || expectedHits(s.gam, dec) < expectedHits(s.gam, v.vitPath) - 1e-12) okOrder = false;
    if (dec.join() !== v.vitPath.join()) nDiff++; if (lp === -Infinity) nZero++;
  }
  check('長さ 6 の音の列 729 通り全部：ビタビの道の確率 = 総当たり（729 本）の最大', worst < 1e-12);
  check('どの点からも、戻り矢印をたどった道の確率 = その点の δ', okBack);
  check('道の確率はビタビ ≥ 事後復号、当たる時刻の期待値は事後復号 ≥ ビタビ（729 通り全部）', okOrder);
  check('729 通りのうち ' + nDiff + ' 通りで 2 つの道がちがい、' + nZero + ' 通りで事後復号の道は確率 0', nDiff > 100 && nZero > 10);
  let res = EXAMPLES.map((xs) => { let eb = emTable(room, xs), v = viterbiLog(room, eb), s = smoothAll(room, eb), dec = postDecode(s.gam), marg = Math.min(...s.gam.map((g) => { let o = g.slice().sort((a, b) => b - a); return o[0] - o[1]; })); return { v, dec, lp: pathLogProb(room, eb, dec), marg }; });
  check('例 1：ビタビの道 = 事後復号の道', res[0].dec.join() === res[0].v.vitPath.join());
  check('例 2：道はちがうが、事後復号の道の確率は 0 より大きくビタビより小さい', res[1].dec.join() !== res[1].v.vitPath.join() && res[1].lp > -Infinity && res[1].lp < res[1].v.logP - 0.05);
  check('例 3：事後復号の道（料理・寝・寝・ゲーム・ゲーム・寝）は確率 0、ビタビの道は 0 でない（γ の差 > 0.1）', res[2].lp === -Infinity && res[2].dec.join() === '1,0,0,2,2,0' && res[2].v.logP > -Infinity && res[2].marg > 0.1);
  let st = { p0: [1, 0, 0], tr: room.tr, em: room.em }, v0 = viterbiLog(st, emTable(st, [2, 2, 2]));
  check('log 0 = −∞ をそのまま扱う：寝ているから始めると、次の時刻のゲームの δ は −∞（NaN ではない）', v0.dl[1][2] === -Infinity && noNaN(v0.dl) && v0.logP > -Infinity);
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
