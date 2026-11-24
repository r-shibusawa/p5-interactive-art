// ============================================
// 06 グラフ上のランダムウォーク ─ 頂点から出る辺を 1 本、同じ確率で選んで歩く（P_ij = 1 / 次数(i)）
// 長く歩くと、各頂点にいる時間の割合は「次数（つながっている辺の数）に比例」：π_i = 次数(i) / (2 × 辺の数)
// 理由は詳細つり合い π_i P_ij = π_j P_ji：どの辺でも、行きと帰りの流れが同じ（1 / (2 × 辺の数)）
// カバー時間：全部の頂点を 1 回以上訪れるまでの歩数（何回もやって平均）
// （向きのあるリンクとランダムなジャンプにすると、検索のページランク：シリーズ 8 の 08、シリーズ 31 の 11）
// 空き地をクリック 頂点を追加 / 頂点から頂点へドラッグ 辺をつける・消す / 頂点を空き地へドラッグ 移動 / R 数え直し / 1 2 3 例のグラフ / ↑↓ 速さ
// ============================================

const MAX_V = 12;                        // ★ 頂点の数の上限
const NODE_R = 20;
let pos = [], adjM = [], transP = [], piDeg = [], walker = 0, visits = [], tWalk = 0, speed = 200;
let cover = { seen: [], nSeen: 0, t: 0, done: [], start: 0 }, dragFrom = -1, pressX = 0, pressY = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  seedRng(6); example(1);
}
function example(k) {                    // ★ 例のグラフ
  let cx = width * 0.3, cy = height * 0.5, r = Math.min(width * 0.22, height * 0.32), lists = {
    1: [8, [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [3, 4], [4, 5], [5, 6], [6, 7], [7, 4], [4, 6], [5, 7], [1, 3]]],   // 2 つのかたまり
    2: [8, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]],                                                     // 1 本の道
    3: [9, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [1, 2], [5, 6]]],                             // 星（中心の次数が大きい）
  };
  let [n, list] = lists[k]; pos = [];
  for (let i = 0; i < n; i++) pos.push(k === 3 && i === 0 ? [cx, cy] : [cx + r * Math.cos((i * 2 * Math.PI) / (k === 3 ? n - 1 : n)), cy + r * Math.sin((i * 2 * Math.PI) / (k === 3 ? n - 1 : n))]);
  adjM = zerosMat(n); for (let [i, j] of list) { adjM[i][j] = 1; adjM[j][i] = 1; }
  rebuild();
}
// ★ ランダムウォークの遷移：P_ij = 辺があれば 1 / 次数(i)。辺のない頂点はその場にとどまる
function walkP(a) { return fixRows(a.map((r) => r.slice())); }
function degreesOf(a) { return a.map((r) => sumOf(r)); }
function rebuild() {
  transP = walkP(adjM); let deg = degreesOf(adjM), tot = sumOf(deg);
  piDeg = deg.map((d) => (tot > 0 ? d / tot : 0));
  walker = Math.max(0, deg.findIndex((d) => d > 0)); visits = new Array(pos.length).fill(0); tWalk = 0;
  cover = { seen: [], nSeen: 0, t: 0, done: [], start: walker }; resetCover();
}
function resetCover() { cover.seen = new Array(pos.length).fill(false); cover.seen[walker] = true; cover.nSeen = 1; cover.t = 0; cover.start = walker; }
function reachableCount(a, s) { let seen = new Set([s]), q = [s]; while (q.length) { let u = q.shift(); a[u].forEach((v, j) => { if (v && !seen.has(j)) { seen.add(j); q.push(j); } }); } return seen.size; }
// 2 つの頂点の間の「平均の到達時間」h_i = 1 + Σ_j P_ij h_j（h_target = 0）を連立方程式で
function hittingTimes(a, target) {
  let n = a.length, m = eyeMat(n), b = new Array(n).fill(1);
  for (let i = 0; i < n; i++) { if (i === target) { b[i] = 0; continue; } for (let j = 0; j < n; j++) m[i][j] -= a[i][j]; }
  return solveLinear(m, b);
}

function draw() {
  background(...BG);
  let comp = pos.length ? reachableCount(adjM, walker) : 0;
  for (let k = 0; k < speed && pos.length; k++) {
    walker = sampleFrom(transP[walker]); visits[walker]++; tWalk++; cover.t++;
    if (!cover.seen[walker]) { cover.seen[walker] = true; cover.nSeen++; }
    if (cover.nSeen >= comp) { cover.done.push(cover.t); if (cover.done.length > 2000) cover.done.shift(); resetCover(); }
  }
  let edgesN = sumOf(degreesOf(adjM)) / 2;
  hudTitle('グラフ上のランダムウォーク：頂点 ' + pos.length + '、辺 ' + edgesN + '、' + tWalk.toLocaleString() + ' 歩', '空き地クリック 頂点　頂点→頂点ドラッグ 辺　頂点→空き地ドラッグ 移動　R 数え直し　1 2 3 例　↑↓ 速さ ' + speed);

  // ---- グラフ（頂点の大きさ = 滞在割合、白い輪 = 次数から計算した π）
  let fr = visits.map((v) => v / Math.max(1, tWalk));
  stroke(110, 100, 90); strokeWeight(2);
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) if (adjM[i][j]) line(pos[i][0], pos[i][1], pos[j][0], pos[j][1]);
  for (let i = 0; i < pos.length; i++) {
    let col = cover.seen[i] ? TEAL : [90, 82, 76];
    noStroke(); fill(...col); circle(pos[i][0], pos[i][1], 2 * NODE_R + 120 * Math.sqrt(fr[i]));
    noFill(); stroke(...CREAM); strokeWeight(1.5); circle(pos[i][0], pos[i][1], 2 * NODE_R + 120 * Math.sqrt(piDeg[i]));
    noStroke(); fill(...CREAM); textSize(14); textAlign(CENTER, CENTER); text(i, pos[i][0], pos[i][1]);
  }
  if (pos.length) { noStroke(); fill(...DICE); circle(pos[walker][0], pos[walker][1] - NODE_R - 8, 12); }
  if (dragFrom >= 0) { stroke(...MUSTARD); strokeWeight(2); line(pos[dragFrom][0], pos[dragFrom][1], mouseX, mouseY); }
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, TOP);
  text('色の円の大きさ = 滞在割合、白い輪 = 次数 / (2 × 辺の数)。水色 = 今のカバーで訪れた頂点、赤い点 = 歩く人', 40, height - 50);

  // ---- 滞在割合 と π（次数）
  let x = width * 0.6, gw = Math.min(460, width - x - 40), n = pos.length;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('頂点ごとの割合：棒 = 歩いた割合、白い線 = 次数 / (2 × 辺の数)', x, 120);
  let top = Math.max(0.05, ...piDeg, ...fr) * 1.15, bh = height * 0.24;
  drawBars(x, 135, gw, bh, fr, [TEAL], top, pos.map((_, i) => String(i)));
  for (let i = 0; i < n; i++) { let bx = x + (i + 0.5) * (gw / n), y = 135 + bh - (piDeg[i] / top) * bh; stroke(...CREAM); strokeWeight(2); line(bx - gw / n / 2.5, y, bx + gw / n / 2.5, y); }
  // 詳細つり合い
  let db = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) db = Math.max(db, Math.abs(piDeg[i] * transP[i][j] - piDeg[j] * transP[j][i]));
  let ty = 135 + bh + 50;
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE);
  text('詳細つり合い：max |π_i P_ij − π_j P_ji| = ' + db.toExponential(1), x, ty);
  text('π P と π のずれ = ' + (n ? maxAbsDiff(vecMat(piDeg, transP), piDeg).toExponential(1) : '—') + '（π は定常分布）', x, ty + 24);
  fill(...(comp < n ? DICE : SUB)); textSize(13); text(comp < n ? 'つながっていない頂点がある → 歩く人のいる部分だけで考える' : 'グラフはつながっている', x, ty + 48);
  // カバー時間
  let cy2 = ty + 90; fill(...MUSTARD); textSize(16);
  text('カバー時間（全部の頂点を訪れるまで）：平均 ' + (cover.done.length ? fmtN(meanOf(cover.done), 1) : '…') + ' 歩（' + cover.done.length + ' 回）', x, cy2);
  fill(...SUB); textSize(13); text('今回：' + cover.nSeen + ' / ' + comp + ' 頂点、' + cover.t + ' 歩目', x, cy2 + 22);
  if (n > 1 && comp === n) { let h = hittingTimes(transP, n - 1); if (h) text('頂点 0 → 頂点 ' + (n - 1) + ' の平均到達時間（連立方程式）= ' + fmtN(h[0], 1) + ' 歩', x, cy2 + 44); }
  drawSelfTest(width - 180, height - 14);
}

function nodeAt(x, y) { for (let i = 0; i < pos.length; i++) if (Math.hypot(x - pos[i][0], y - pos[i][1]) < NODE_R + 6) return i; return -1; }
function mousePressed() {
  pressX = mouseX; pressY = mouseY; if (mouseX > width * 0.57 || mouseY < 90) return;
  let i = nodeAt(mouseX, mouseY);
  if (i >= 0) { dragFrom = i; return; }
  if (pos.length < MAX_V) { pos.push([mouseX, mouseY]); adjM = adjM.map((r) => r.concat([0])); adjM.push(new Array(pos.length).fill(0)); rebuild(); }
}
function mouseReleased() {
  if (dragFrom < 0) return;
  let j = nodeAt(mouseX, mouseY);
  if (j >= 0 && j !== dragFrom) { adjM[dragFrom][j] = adjM[j][dragFrom] = adjM[dragFrom][j] ? 0 : 1; rebuild(); }
  else if (j < 0 && Math.hypot(mouseX - pressX, mouseY - pressY) > 8) pos[dragFrom] = [clampv(mouseX, 40, width * 0.57), clampv(mouseY, 100, height - 70)];
  dragFrom = -1;
}
function keyPressed() {
  if (key === 'r' || key === 'R') rebuild();
  if (key === '1' || key === '2' || key === '3') { example(Number(key)); }
  if (key === UP_ARROW) speed = Math.min(20000, speed * 2);
  if (key === DOWN_ARROW) speed = Math.max(1, Math.floor(speed / 2));
  return false;
}

// ============================================
// やってみよう
// 1. 例 3（星）：中心の割合は？ 次数 8 の頂点は、次数 1 の頂点の 8 倍の時間いる
// 2. 例 2（1 本の道）はカバー時間が長い。両はしの間の到達時間は（辺の数）² になる
// 3. 2 つのかたまりを 1 本の辺だけでつなぐと、カバー時間はどう変わる？（ボトルネック）
// 4. 全部の頂点どうしをつないだ「完全グラフ」のカバー時間は、クーポン集めの問題と同じ
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let graph = (n, list) => { let a = zerosMat(n); for (let [i, j] of list) { a[i][j] = 1; a[j][i] = 1; } return a; };
  let gA = graph(6, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3], [1, 4]]), pA = walkP(gA), dA = degreesOf(gA), piA = dA.map((d) => d / sumOf(dA));
  check('遷移行列の行の合計 = 1', rowSumErr(pA) < 1e-12);
  check('連立方程式の定常分布 = 次数 / (2 × 辺の数)', maxAbsDiff(stationaryExact(pA), piA) < 1e-12);
  let db = 0; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) db = Math.max(db, Math.abs(piA[i] * pA[i][j] - piA[j] * pA[j][i]));
  check('詳細つり合い π_i P_ij = π_j P_ji（ずれ ' + db.toExponential(1) + '）', db < 1e-15);
  let cyc = graph(6, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]);   // 周期 2（二部グラフ）でも π は求まる
  check('偶数の輪（周期 2）でも π = 一様（1/6）', maxAbsDiff(stationaryExact(walkP(cyc)), new Array(6).fill(1 / 6)) < 1e-12);
  seedRng(66); let w = 0, cnt = new Array(6).fill(0), nS = 200000;
  for (let t = 0; t < nS; t++) { w = sampleFrom(pA[w]); cnt[w]++; }
  check('20 万歩の滞在割合 ≈ 次数に比例（ずれ < 0.01）', maxAbsDiff(cnt.map((c) => c / nS), piA) < 0.01);
  let path = graph(6, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]);
  check('1 本の道（辺 5 本）：はし → はしの平均到達時間 = 5² = 25', near(hittingTimes(walkP(path), 5)[0], 25, 1e-9));
  // 完全グラフ K_6 のカバー時間 = (n − 1)(1 + 1/2 + … + 1/(n − 1))（クーポン集め）
  let kl = []; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) kl.push([i, j]);
  let pK = walkP(graph(6, kl)), runs = 6000, tot = 0, expect = 5 * (1 + 1 / 2 + 1 / 3 + 1 / 4 + 1 / 5);
  for (let r = 0; r < runs; r++) { let s = 0, seen = new Set([0]), t = 0; while (seen.size < 6) { s = sampleFrom(pK[s]); seen.add(s); t++; } tot += t; }
  check('完全グラフ K₆ のカバー時間（6000 回）' + fmtN(tot / runs, 2) + ' ≈ クーポン集め ' + fmtN(expect, 2) + '（4% 以内）', Math.abs(tot / runs / expect - 1) < 0.04);
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
