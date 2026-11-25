// ============================================
// 00 隠れた状態と観測 ─ 地下の部屋にいる人には外の天気（晴れ・くもり・雨）が見えない。見えるのは、来る人が「かさ」を持っているかどうかだけ。
// 天気は遷移行列 A のマルコフ連鎖（シリーズ 65）で動き、かさは出力行列 B の確率で出る。これが隠れマルコフモデル（HMM）。
// 下の段：最近 6 日の「かさの列」を出せる天気の列は 3^6 = 729 本ある。その中でありそうな順に 5 本（同じ観測でも状態はいろいろありうる）
// H 天気を隠す ⇔ 見せる / スペース 止める ⇔ 動かす / 右の A・B の数字を上下にドラッグ / R 新しい列 / ↑↓ 速さ
// ============================================

const W_NAMES = ['晴れ', 'くもり', '雨'], W_SHORT = ['晴', '曇', '雨'], U_NAMES = ['かさなし', 'かさあり'], W_COLS = [[236, 124, 150], [176, 156, 236], [110, 200, 210]];   // 天気の色
let sky = {                              // ★ モデル：p0 = はじめの天気、tr = A（今日 → 明日）、em = B（天気 → かさなし・かさあり）
  p0: [0.5, 0.3, 0.2],
  tr: [[0.7, 0.2, 0.1], [0.3, 0.4, 0.3], [0.2, 0.3, 0.5]],
  em: [[0.9, 0.1], [0.6, 0.4], [0.15, 0.85]],
};
const N_RANK = 6;                        // ★ 下の段で調べる日数（3^6 = 729 本の道）
let days = [], showTruth = true, playing = true, period = 30, cellsHit = [], drag = null, ranked = null, counts;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(70); restart();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function restart() { days = []; counts = { z: [0, 0, 0], u: [[0, 0], [0, 0], [0, 0]] }; for (let k = 0; k < 8; k++) addDay(); }
function addDay() {                      // ★ 1 日すすめる：天気は A の行から、かさは B の行からサイコロ
  let z = days.length ? sampleFrom(sky.tr[days[days.length - 1].z]) : sampleFrom(sky.p0), x = sampleFrom(sky.em[z]);
  days.push({ z, x }); counts.z[z]++; counts.u[z][x]++;
  if (days.length > 400) days.shift();
  ranked = null;
}
// ★ 行列の 1 つの数字を変える：同じ行のほかの数字を同じ比でちぢめて、行の合計を 1 に保つ
function setCell(row, j, v) {
  v = clampv(v, 0.01, 0.98);
  let rest = sumOf(row) - row[j];
  for (let k = 0; k < row.length; k++) if (k !== j) row[k] = rest > 1e-9 ? (row[k] / rest) * (1 - v) : (1 - v) / (row.length - 1);
  row[j] = v;
}
// ★ 総当たり：観測 xs を出せる全部の道と、その確率 P(道 | 観測)。大きい順に並べる
function rankPaths(m, xs) {
  let n = m.p0.length, len = xs.length, total = Math.pow(n, len), all = [], lik = 0;
  for (let k = 0; k < total; k++) {
    let zs = [], r = k; for (let t = 0; t < len; t++) { zs.unshift(r % n); r = Math.floor(r / n); }
    let p = 1; for (let t = 0; t < len; t++) p *= (t === 0 ? m.p0[zs[0]] : m.tr[zs[t - 1]][zs[t]]) * m.em[zs[t]][xs[t]];
    all.push({ zs, p }); lik += p;
  }
  all.sort((a, b) => b.p - a.p);
  for (let a of all) a.post = lik > 0 ? a.p / lik : 0;
  return { all, lik };
}

function draw() {
  background(...BG);
  if (playing && frameCount % period === 0) addDay();
  hudTitle('隠れた状態と観測：外の天気は見えない。見えるのは「かさ」だけ', 'H 天気を隠す ⇔ 見せる　スペース 止める ⇔ 動かす　A・B の数字を上下にドラッグ　R 新しい列　↑↓ 速さ');
  let mx = Math.max(560, width - 420), x0 = 40, cw = 38, nShow = Math.max(8, Math.floor((mx - x0 - 30) / cw)), from = Math.max(0, days.length - nShow), y1 = 140, y2 = 232;
  note('隠れた状態：外の天気（マルコフ連鎖）', x0, y1 - 34, ROSE, 14); note('観測：来た人のかさ', x0, y2 + 52, LAN, 14);
  for (let i = from; i < days.length; i++) {
    let d = days[i], x = x0 + (i - from) * cw + cw / 2;
    if (i > from) { stroke(...LINEC); strokeWeight(1.5); fill(...LINEC); arrowLine(x - cw + 15, y1, x - 15, y1, 6); }
    stroke(...LINEC); fill(...LINEC); arrowLine(x, y1 + 16, x, y2 - 20, 6);
    noStroke(); fill(...(showTruth ? W_COLS[d.z] : [70, 80, 98])); circle(x, y1, 28);
    fill(...(showTruth ? BG : DIMC)); textSize(14); textAlign(CENTER, CENTER); text(showTruth ? W_SHORT[d.z] : '？', x, y1);
    drawUmbrella(x, y2, d.x);
  }
  // ---- 下の段：最近 N_RANK 日の観測を出せる道
  let py = y2 + 90, recent = days.slice(-N_RANK);
  if (!ranked) ranked = rankPaths(sky, recent.map((d) => d.x));
  panelBox(x0 - 10, py, mx - x0 - 10, 290);
  note('最近 ' + recent.length + ' 日のかさ：', x0 + 6, py + 30, INK, 15);
  for (let t = 0; t < recent.length; t++) drawUmbrella(x0 + 150 + t * 44, py + 24, recent[t].x);
  note('この観測を出せる天気の列は ' + ranked.all.length + ' 本。ありそうな順に 5 本と、その確率 P(天気の列 | かさ)', x0 + 6, py + 62, DIMC, 13);
  let truthRank = ranked.all.findIndex((a) => a.zs.every((z, t) => z === recent[t].z));
  for (let k = 0; k < Math.min(5, ranked.all.length); k++) {
    let a = ranked.all[k], yy = py + 92 + k * 34;
    note(k + 1 + ' 位', x0 + 6, yy + 5, DIMC, 13);
    for (let t = 0; t < a.zs.length; t++) { noStroke(); fill(...W_COLS[a.zs[t]]); circle(x0 + 150 + t * 44, yy, 24); fill(...BG); textSize(13); textAlign(CENTER, CENTER); text(W_SHORT[a.zs[t]], x0 + 150 + t * 44, yy); }
    let bx = x0 + 150 + N_RANK * 44 + 10; noStroke(); fill(...LAN); rect(bx, yy - 8, Math.max(1, a.post * 260), 16, 3);
    note(fmtN(a.post * 100, 1) + '%' + (showTruth && k === truthRank ? '　← 本当の列' : ''), bx + a.post * 260 + 8, yy + 5, INK, 13);
  }
  note(showTruth ? '本当の天気の列は ' + ranked.all.length + ' 本のうち ' + (truthRank + 1) + ' 位。1 位が本当とは限らない' : 'H で答え合わせ。1 位の列が本当だと思う？', x0 + 6, py + 272, showTruth ? ROSE : DIMC, 13);
  // ---- 右：A と B（ドラッグできる）
  cellsHit = [];
  note('遷移行列 A（今日 → 明日）', mx, 112, ROSE, 15);
  matrixCells(sky.tr, mx + 60, 140, 78, 40, W_NAMES, W_NAMES, 'tr', ROSE);
  note('出力行列 B（天気 → かさ）', mx, 312, LAN, 15);
  matrixCells(sky.em, mx + 60, 340, 100, 40, W_NAMES, U_NAMES, 'em', LAN);
  let st = stationaryOf(sky.tr), tot = Math.max(1, sumOf(counts.z)), pu = 0; for (let i = 0; i < 3; i++) pu += st[i] * sky.em[i][1];
  note('どの行も合計は 1（ドラッグすると残りが自動で調整される）', mx, 490, DIMC, 12);
  note('長く続けたときの天気の割合（定常分布）と、数えた割合', mx, 526, INK, 13);
  for (let i = 0; i < 3; i++) note(W_NAMES[i] + '　' + fmtN(st[i], 3) + '　／　' + (showTruth ? fmtN(counts.z[i] / tot, 3) : '？'), mx + 10, 550 + i * 22, W_COLS[i], 13);
  let nu = counts.u[0][1] + counts.u[1][1] + counts.u[2][1];
  note('かさありの割合：計算 ' + fmtN(pu, 3) + '　数えた ' + fmtN(nu / tot, 3) + '（' + tot + ' 日）', mx, 630, LAN, 13);
  note('かさの割合は見えるが、どの日がどの天気かは見えない', mx, 654, DIMC, 12);
  drawSelfTest();
}
function drawUmbrella(x, y, has) {       // かさの絵（なし = 小さな点）
  if (!has) { noStroke(); fill(...LINEC); circle(x, y, 7); return; }
  noStroke(); fill(...LAN); arc(x, y - 2, 28, 26, Math.PI, 2 * Math.PI);
  stroke(...LAN); strokeWeight(2); noFill(); line(x, y - 2, x, y + 11); arc(x + 3, y + 11, 6, 6, 0, Math.PI);
}
function matrixCells(a, x, y, cw, ch, rn, cn, which, col) {
  drawMatrix(a, x, y, cw, ch, rn, cn, { col, ts: 14 });
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) cellsHit.push({ which, i, j, x: x + j * cw, y: y + i * ch, w: cw, h: ch });
  if (drag && drag.which === which) { noFill(); stroke(...INK); strokeWeight(2); rect(x + drag.j * cw, y + drag.i * ch, cw - 2, ch - 2, 3); }
}

function mousePressed() {
  drag = null;
  for (let c of cellsHit) if (mouseX >= c.x && mouseX < c.x + c.w && mouseY >= c.y && mouseY < c.y + c.h) drag = { which: c.which, i: c.i, j: c.j, y0: mouseY, v0: sky[c.which][c.i][c.j] };
}
function mouseDragged() { if (drag) { setCell(sky[drag.which][drag.i], drag.j, drag.v0 + (drag.y0 - mouseY) / 160); ranked = null; } }
function mouseReleased() { drag = null; }
function keyPressed() {
  if (key === 'h' || key === 'H') showTruth = !showTruth;
  if (key === ' ') playing = !playing;
  if (key === 'r' || key === 'R') restart();
  if (key === UP_ARROW) period = Math.max(4, Math.round(period / 2));
  if (key === DOWN_ARROW) period = Math.min(120, period * 2);
  return false;
}

// やってみよう
// 1. H で天気を隠して、かさの列だけから今日の天気を当ててみよう。どのくらい当たる？
// 2. B の「雨 → かさあり」を 1 に近く、「晴れ → かさあり」を 0 に近くすると、当てやすさはどう変わる？
// 3. B の 3 つの行を全部同じ数字にすると（かさが天気と関係ない）、下の段の確率はどうなる？
// 4. A の「晴れ → 晴れ」を 0.95 にすると、天気の列とかさの列はどう変わる？

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(700);
  let m = { p0: sky.p0.slice(), tr: sky.tr.map((r) => r.slice()), em: sky.em.map((r) => r.slice()) };
  check('π と A と B の行の合計 = 1', near(sumOf(m.p0), 1, 1e-12) && rowSumErr(m.tr) < 1e-12 && rowSumErr(m.em) < 1e-12);
  let s = hmmSample(m, 60000), tc = m.tr.map(() => [0, 0, 0]), ec = m.em.map(() => [0, 0]), zc = [0, 0, 0];
  for (let t = 0; t < s.zs.length; t++) { zc[s.zs[t]]++; ec[s.zs[t]][s.xs[t]]++; if (t > 0) tc[s.zs[t - 1]][s.zs[t]]++; }
  check('6 万日のサンプル：数えた遷移の割合 ≈ A（ずれ < 0.02）', maxAbsDiff(tc.map(normRow), m.tr) < 0.02);
  check('6 万日のサンプル：数えたかさの割合 ≈ B（ずれ < 0.02）', maxAbsDiff(ec.map(normRow), m.em) < 0.02);
  let st = stationaryOf(m.tr);
  check('定常分布 π A = π、天気の割合 ≈ 定常分布', maxAbsDiff(vecMat(st, m.tr), st) < 1e-12 && maxAbsDiff(normRow(zc), st) < 0.02);
  let xs = [1, 1, 0, 0, 1, 0], rk = rankPaths(m, xs), eb = emTable(m, xs), bf = bruteAll(m, eb);
  check('729 本の道の確率の合計 = 前向きアルゴリズムの尤度', rk.all.length === 729 && near(rk.lik, fwdPlain(m, eb).lik, 1e-15) && near(rk.lik, bf.lik, 1e-15));
  check('P(道 | 観測) の合計 = 1、1 位 = ビタビの道', near(sumOf(rk.all.map((a) => a.post)), 1, 1e-12) && near(rk.all[0].p, Math.exp(viterbiLog(m, eb).logP), 1e-15) && rk.all[0].zs.join() === viterbiLog(m, eb).vitPath.join());
  check('1 位の道でも確率は 50% 未満（同じ観測でも状態はいろいろ）', rk.all[0].post < 0.5 && rk.all[1].post > 0.01);
  let okRow = true;
  for (let k = 0; k < 200; k++) { let row = m.tr[rndInt(0, 2)], j = rndInt(0, 2), o = [0, 1, 2].filter((q) => q !== j), ratio = row[o[0]] / row[o[1]]; setCell(row, j, rnd() * 1.4 - 0.2); if (!near(sumOf(row), 1, 1e-12) || row.some((v) => !(v > 0)) || !near(row[o[0]] / row[o[1]], ratio, 1e-9)) okRow = false; }
  check('ドラッグで数字を変えても行の合計は 1、ほかの数字の比はそのまま', okRow);
  let flat = { p0: m.p0, tr: m.tr, em: [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5]] }, rf = rankPaths(flat, xs), prior = 1; for (let t = 0; t < 6; t++) prior *= t === 0 ? flat.p0[rf.all[0].zs[0]] : flat.tr[rf.all[0].zs[t - 1]][rf.all[0].zs[t]];
  check('B の行が全部同じなら、観測は何も教えない：P(道 | 観測) = P(道)', near(rf.all[0].post, prior, 1e-12));
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
