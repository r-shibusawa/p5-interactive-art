// ============================================
// 05 すごろくの平均手数 ─ オリジナルの 30 マスのすごろく（はしごで上へ、へびで下へ）
// サイコロの目で進むだけなので、次のマスは「今のマス」だけで決まる → マルコフ連鎖。ゴール 30 は吸収状態。
// まだゴールしていないマス 0〜29 の間の遷移 Q から、基本行列 N = (I − Q)⁻¹ を作ると
//   N[0][j] = スタートから、マス j に止まる平均の回数　　Σ_j N[0][j] = ゴールまでの平均の手数
// ぴったり 30 に止まらないとゴールできない（出た目が大きすぎたら、その場で休み）
// マスをクリック → 別のマスをクリック はしご・へびを作る（同じマスを 2 回 = 消す）/ スペース 1 手 / A 自動 / R はしご・へびを元に / F シミュレーションの速さ
// ============================================

const BOARD = 30;                        // ★ ゴールのマス
const START_JUMPS = { 3: 12, 8: 16, 13: 22, 19: 27, 11: 2, 17: 5, 24: 15, 28: 9 };   // ★ はしご（上へ）とへび（下へ）
let jumps = {}, sol = null, viMoves = 0, viIters = 0, sel = -1, token = 0, tokenMoves = 0, lastRoll = 0, auto = true;
let simGames = 0, simSum = 0, simHist = [], simVisits = [], fast = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(5); jumps = Object.assign({}, START_JUMPS); rebuild();
}
// ★ 1 手のルール：pos から roll だけ進む。行きすぎならその場、着いたマスにはしご・へびがあれば飛ぶ（行列・価値反復・シミュレーションで同じ関数を使う）
function landing(jm, pos, roll) { let np = pos + roll; if (np > BOARD) np = pos; return jm[np] !== undefined ? jm[np] : np; }
function buildQ(jm) {                    // マス 0〜29 の間の遷移 Q（ゴールへ行く分は Q に入らない）
  let q = zerosMat(BOARD);
  for (let s = 0; s < BOARD; s++) for (let r = 1; r <= 6; r++) { let t = landing(jm, s, r); if (t < BOARD) q[s][t] += 1 / 6; }
  return q;
}
function solveBoard(jm) {                // ★ 基本行列 N = (I − Q)⁻¹。ゴールに行けない盤では逆行列がない → null
  let q = buildQ(jm), iq = eyeMat(BOARD);
  for (let i = 0; i < BOARD; i++) for (let j = 0; j < BOARD; j++) iq[i][j] -= q[i][j];
  let fm = matInv(iq); if (!fm || !noNaN(fm) || fm.some((r) => r.some((v) => v < -1e-9 || v > 1e8))) return null;
  return { q, fm, moves: fm.map((r) => sumOf(r)) };
}
function valueIter(jm, tol, maxIt) {     // 価値反復：E[s] = 1 + (1/6) Σ_r E[着いたマス]、E[ゴール] = 0
  let e = new Array(BOARD + 1).fill(0), it = 0, d = Infinity;
  while (d > tol && it < maxIt) { d = 0; for (let s = 0; s < BOARD; s++) { let v = 1; for (let r = 1; r <= 6; r++) v += e[landing(jm, s, r)] / 6; d = Math.max(d, Math.abs(v - e[s])); e[s] = v; } it++; }
  return { e, it, ok: d <= tol };
}
function playOnce(jm, visits) { let s = 0, n = 0; while (s !== BOARD && n < 100000) { s = landing(jm, s, rndInt(1, 6)); n++; if (visits && s < BOARD) visits[s]++; } return n; }
function rebuild() {
  sol = solveBoard(jumps); let vi = valueIter(jumps, 1e-10, 20000); viMoves = vi.ok ? vi.e[0] : Infinity; viIters = vi.it;
  simGames = 0; simSum = 0; simHist = new Array(61).fill(0); simVisits = new Array(BOARD).fill(0); token = 0; tokenMoves = 0;
}
function cellPos(k, bx, by, cs) {        // マス k の左上（下の段から、左右に折り返して並べる。0 はスタートの外）
  let r = Math.floor((k - 1) / 6), c = (k - 1) % 6; if (r % 2) c = 5 - c;
  return [bx + c * cs, by + (4 - r) * cs];
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (sol) while (performance.now() - t0 < (fast ? 8 : 2)) { let n = playOnce(jumps, simVisits); simGames++; simSum += n; simHist[Math.min(60, n)]++; }
  if (auto && frameCount % 30 === 0) moveToken();
  hudTitle('すごろくの平均手数：ゴールまで ' + (sol ? fmtN(sol.moves[0], 3) : '∞') + ' 手（基本行列）', 'マス→マスをクリック はしご・へび　スペース 1 手　A 自動（' + (auto ? 'ON' : 'OFF') + '）　R 元の盤　F 速さ' + (fast ? '（速い）' : ''));

  // ---- 盤（色 = スタートからそのマスに止まる平均回数 N[0][j]）
  let cs = Math.min(84, (height - 170) / 5, width * 0.48 / 6), bx = 40, by = 100, hi = sol ? Math.max(...sol.fm[0].slice(1)) : 1;
  for (let k = 1; k <= BOARD; k++) {
    let [x, y] = cellPos(k, bx, by, cs), v = sol && k < BOARD ? sol.fm[0][k] / hi : 0;
    noStroke(); fill(k === BOARD ? color(...MUSTARD) : color(52 + v * 180, 46 + v * 60, 42 + v * 10)); rect(x + 2, y + 2, cs - 4, cs - 4, 6);
    if (k === sel) { noFill(); stroke(...MUSTARD); strokeWeight(3); rect(x + 2, y + 2, cs - 4, cs - 4, 6); }
    noStroke(); fill(k === BOARD ? 30 : 235); textSize(13); textAlign(LEFT, TOP); text(k === BOARD ? 'ゴール' : k, x + 7, y + 6);
    if (sol && k < BOARD) { fill(200, 190, 175); textSize(11); textAlign(RIGHT, BOTTOM); text(fmtN(sol.fm[0][k], 2), x + cs - 6, y + cs - 5); }
  }
  for (let a in jumps) {                 // はしご = 水色の 2 本線、へび = 赤い波線
    let b = jumps[a], [x1, y1] = cellPos(+a, bx, by, cs), [x2, y2] = cellPos(b, bx, by, cs); x1 += cs / 2; y1 += cs / 2; x2 += cs / 2; y2 += cs / 2;
    let L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
    if (b > a) { stroke(...TEAL); strokeWeight(4); line(x1 + nx * 7, y1 + ny * 7, x2 + nx * 7, y2 + ny * 7); line(x1 - nx * 7, y1 - ny * 7, x2 - nx * 7, y2 - ny * 7); }
    else { let pts = []; for (let k = 0; k <= 30; k++) { let t = k / 30, w = Math.sin(t * Math.PI * 4) * 9 * (1 - t * 0.5); pts.push([x1 + (x2 - x1) * t + nx * w, y1 + (y2 - y1) * t + ny * w]); } stroke(...DICE); strokeWeight(5); polyline(pts); noStroke(); fill(...DICE); circle(x1, y1, 14); }
  }
  let [tx, ty] = token === 0 ? [bx - cs * 0.6, by + 4 * cs] : cellPos(token, bx, by, cs);
  stroke(20); strokeWeight(2); fill(...CREAM); circle(tx + cs / 2, ty + cs / 2, cs * 0.36);
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, TOP); text('コマ：' + tokenMoves + ' 手目　出た目 ' + (lastRoll || '—') + '　（右下の小さな数 = そのマスに止まる平均回数）', bx, by + 5 * cs + 8);

  // ---- 3 つの方法
  let rx = bx + 6 * cs + 60;
  noStroke(); fill(...CREAM); textSize(16); textAlign(LEFT, BASELINE); text('ゴールまでの平均の手数', rx, 120);
  let lines = [['① 基本行列 Σ N[0][j]', sol ? fmtN(sol.moves[0], 4) : '∞（ゴールに行けない）', MUSTARD], ['② 価値反復（' + viIters + ' 回）', fmtN(viMoves, 4), TEAL], ['③ シミュレーション（' + simGames.toLocaleString() + ' 回）', simGames ? fmtN(simSum / simGames, 2) : '…', DICE]];
  lines.forEach(([a, b, c], k) => { fill(...c); textSize(15); text(a, rx, 150 + k * 26); fill(...CREAM); text(b, rx + 270, 150 + k * 26); });
  // 手数のヒストグラム
  let g = { x: rx, y: 270, w: Math.min(440, width - rx - 50), h: height * 0.3, x0: 0, x1: 60, y0: 0, y1: Math.max(0.01, ...simHist.map((v) => v / Math.max(1, simGames))) * 1.1 };
  plotAxes(g, '手数（60 以上はまとめて）', 'ゴールまでの手数の割合（シミュレーション）', [0, 20, 40, 60], [0]);
  noStroke(); fill(...DICE); for (let n = 0; n <= 60; n++) { let hh = gY(g, 0) - gY(g, simHist[n] / Math.max(1, simGames)); rect(gX(g, n) - 2, gY(g, 0) - hh, 4, hh); }
  if (sol) { stroke(...MUSTARD); strokeWeight(2); line(gX(g, sol.moves[0]), g.y, gX(g, sol.moves[0]), g.y + g.h); }
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, TOP);
  text('黄色の線 = 平均（基本行列）。平均より長くかかる回が多い（右にすそが長い）', rx, g.y + g.h + 40);
  if (sel > 0) { fill(...MUSTARD); text('マス ' + sel + ' を選択中 → 行き先のマスをクリック', rx, g.y + g.h + 62); }
  drawSelfTest(width - 180, height - 14);
}
function moveToken() { if (token === BOARD) { token = 0; tokenMoves = 0; } lastRoll = rndInt(1, 6); token = landing(jumps, token, lastRoll); tokenMoves++; }

function mousePressed() {
  let cs = Math.min(84, (height - 170) / 5, width * 0.48 / 6), hit = -1;
  for (let k = 1; k <= BOARD; k++) { let [x, y] = cellPos(k, 40, 100, cs); if (mouseX > x && mouseX < x + cs && mouseY > y && mouseY < y + cs) hit = k; }
  if (hit < 0) { sel = -1; return; }
  if (sel < 0) { if (hit < BOARD) sel = hit; return; }
  if (hit === sel) delete jumps[sel];
  else { delete jumps[hit]; jumps[sel] = hit; for (let a in jumps) if (jumps[a] === +a) delete jumps[a]; }
  sel = -1; rebuild();
}
function keyPressed() {
  if (key === ' ') moveToken();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') { jumps = Object.assign({}, START_JUMPS); rebuild(); }
  if (key === 'f' || key === 'F') fast = !fast;
  return false;
}

// ============================================
// やってみよう
// 1. へび 28 → 9 を消すと平均の手数は何手へる？（マス 28 をクリックして、もう一度 28）
// 2. 色の濃いマス（よく止まるマス）にはしごを置くと、効き目が大きい？
// 3. landing() を「行きすぎたら、はね返る（30 − あまり）」に変えると平均はどう変わる？
// 4. へびだらけにして、ゴールに行けない盤を作ると N はどうなる？（逆行列がなくなる）
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let jm = Object.assign({}, START_JUMPS), so = solveBoard(jm), q = buildQ(jm);
  let rowsOk = true; for (let s = 0; s < BOARD; s++) { let toGoal = 0; for (let r = 1; r <= 6; r++) if (landing(jm, s, r) === BOARD) toGoal += 1 / 6; if (Math.abs(sumOf(q[s]) + toGoal - 1) > 1e-12) rowsOk = false; }
  check('各マスの行：Q の合計 + ゴールへ行く確率 = 1', rowsOk);
  let iq = eyeMat(BOARD); for (let i = 0; i < BOARD; i++) for (let j = 0; j < BOARD; j++) iq[i][j] -= q[i][j];
  check('(I − Q) N = I（ずれ < 10⁻¹⁰）', maxAbsDiff(matMul(iq, so.fm), eyeMat(BOARD)) < 1e-10);
  let vi = valueIter(jm, 1e-12, 200000);
  check('平均の手数：基本行列 ' + fmtN(so.moves[0], 4) + ' = 価値反復（全マス、ずれ < 10⁻⁹）', so.moves.every((m, s) => Math.abs(m - vi.e[s]) < 1e-9));
  let ser = zerosMat(BOARD), qk = eyeMat(BOARD); for (let k = 0; k < 3000; k++) { for (let i = 0; i < BOARD; i++) for (let j = 0; j < BOARD; j++) ser[i][j] += qk[i][j]; qk = matMul(qk, q); if (maxAbsDiff(qk, zerosMat(BOARD)) < 1e-15) break; }
  check('N = I + Q + Q² + …（止まる回数の期待値の和、ずれ < 10⁻⁹）', maxAbsDiff(ser, so.fm) < 1e-9);
  seedRng(55); let games = 20000, sum = 0, vis = new Array(BOARD).fill(0);
  for (let k = 0; k < games; k++) sum += playOnce(jm, vis);
  check('シミュレーション 2 万回の平均 ' + fmtN(sum / games, 2) + ' ≈ ' + fmtN(so.moves[0], 2) + '（3% 以内）', Math.abs(sum / games / so.moves[0] - 1) < 0.03);
  check('マスごとの止まる回数もシミュレーション ≈ N[0][j]（ずれ < 0.06）', vis.every((v, j) => j === 0 || Math.abs(v / games - so.fm[0][j]) < 0.06));
  let trap = { 25: 20, 26: 20, 27: 20, 28: 20, 29: 20, 24: 20, 30: 20 };   // ゴールの手前が全部へび → ゴールできない
  check('ゴールに行けない盤では N がない（null）→ 画面は ∞', solveBoard(trap) === null);
  reportSelfTest();
}

// ==================================================
// ここから下は「マルコフ連鎖の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [32, 28, 26];                // 背景（あたたかい炭色）
const CREAM = [246, 236, 214], DICE = [236, 96, 58], TEAL = [44, 178, 166], MUSTARD = [236, 190, 82], PLUM = [190, 130, 200], SUB = [190, 178, 160];
const STATE_COLS = [[236, 96, 58], [44, 178, 166], [236, 190, 82], [190, 130, 200], [120, 190, 240], [150, 210, 110], [240, 140, 170], [200, 170, 130]];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function sampleFrom(p) { let u = rnd() * sumOf(p), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }   // 確率 p[i] で i を返す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return '∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function hudTitle(t, sub) {            // 左上の見出しと操作の説明
  noStroke(); fill(...CREAM); textSize(22); textAlign(LEFT, BASELINE); text(t, 40, 42);
  fill(...SUB); textSize(15); text(sub, 40, 68);
}
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
// ---- 行列の道具（行列 = 配列の配列。遷移行列 transP[i][j] = i の次に j へ行く確率、行の和 = 1）
function zerosMat(n, m) { let a = []; for (let i = 0; i < n; i++) a.push(new Array(m === undefined ? n : m).fill(0)); return a; }
function eyeMat(n) { let a = zerosMat(n); for (let i = 0; i < n; i++) a[i][i] = 1; return a; }
function copyMat(a) { return a.map((r) => r.slice()); }
function matMul(a, b) {                // 行列の積 (a b)[i][j] = Σ_k a[i][k] b[k][j]
  let n = a.length, m = b[0].length, kk = b.length, c = zerosMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < kk; k++) { let v = a[i][k]; if (v !== 0) for (let j = 0; j < m; j++) c[i][j] += v * b[k][j]; }
  return c;
}
function vecMat(v, a) {                // 横ベクトル × 行列：次の時刻の分布 = いまの分布 × P
  let out = new Array(a[0].length).fill(0);
  for (let i = 0; i < v.length; i++) if (v[i] !== 0) for (let j = 0; j < out.length; j++) out[j] += v[i] * a[i][j];
  return out;
}
function matPow(a, k) { let r = eyeMat(a.length); for (let t = 0; t < k; t++) r = matMul(r, a); return r; }   // P^k（k 回かけるだけ）
function maxAbsDiff(a, b) {            // 2 つの行列（またはベクトル）のいちばん大きなずれ
  let d = 0;
  for (let i = 0; i < a.length; i++) { if (Array.isArray(a[i])) d = Math.max(d, maxAbsDiff(a[i], b[i])); else d = Math.max(d, Math.abs(a[i] - b[i])); }
  return d;
}
function rowSumErr(a, target) { let d = 0; for (let r of a) d = Math.max(d, Math.abs(sumOf(r) - (target === undefined ? 1 : target))); return d; }
function fixRows(a) {                  // 行の和を 1 に。全部 0 の行は「その場にとどまる」にする（NaN を出さない）
  return a.map((r, i) => { let s = sumOf(r); if (!(s > 1e-12)) { let z = r.map(() => 0); z[i] = 1; return z; } return r.map((v) => v / s); });
}
function solveLinear(a, b) {           // ガウスの消去法（部分ピボット）で a x = b。解けなければ null
  let n = a.length, m = a.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-13) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; let f = m[r][c] / m[c][c]; if (f !== 0) for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((r, i) => r[n] / r[i]);
}
function matInv(a) {                   // 逆行列（ガウス-ジョルダン）。逆がなければ null
  let n = a.length, cols = [];
  for (let j = 0; j < n; j++) { let e = new Array(n).fill(0); e[j] = 1; let x = solveLinear(a, e); if (!x) return null; cols.push(x); }
  return a.map((_, i) => cols.map((c) => c[i]));
}
// 定常分布：π P = π と Σ π = 1 を連立方程式として解く（(P^T − I) π = 0 の最後の式を Σ π = 1 に置きかえる）
function stationaryExact(a) {
  let n = a.length, m = zerosMat(n), b = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m[i][j] = a[j][i] - (i === j ? 1 : 0);
  for (let j = 0; j < n; j++) m[n - 1][j] = 1; b[n - 1] = 1;
  return solveLinear(m, b);
}
function stationaryPower(a, tol, maxIt, start) {   // べき乗法：π ← π P を変化が tol 未満になるまで
  let n = a.length, v = start ? start.slice() : new Array(n).fill(1 / n), its = 0, d = Infinity;
  while (d > (tol || 1e-13) && its < (maxIt || 100000)) { let w = vecMat(v, a); d = maxAbsDiff(w, v); v = w; its++; }
  return { pi: v, its };
}
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }   // 全変動距離
function entropyRate(a, pi) {          // エントロピー率 H = −Σ_i π_i Σ_j P_ij log₂ P_ij（1 歩あたりの情報量、ビット）
  let h = 0;
  for (let i = 0; i < a.length; i++) for (let v of a[i]) if (v > 0) h -= pi[i] * v * Math.log2(v);
  return h;
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(84, 76, 70); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...CREAM); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...CREAM); text(s, x + 22, y); y += 20; }
}
function drawBars(x, y, w, h, vals, cols, top, names) {   // 棒グラフ（top = 縦軸の上限）
  let n = vals.length, bw = w / n;
  stroke(84, 76, 70); strokeWeight(1); line(x, y + h, x + w, y + h); noStroke();
  for (let i = 0; i < n; i++) {
    let c = cols[i % cols.length], hh = clampv(vals[i] / (top || 1), 0, 1) * h; fill(...c); rect(x + i * bw + bw * 0.12, y + h - hh, bw * 0.76, hh, 3);
    if (names) { fill(...SUB); textSize(12); textAlign(CENTER, TOP); text(names[i], x + i * bw + bw / 2, y + h + 4); }
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 220, 190) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
