// ============================================
// 02 定常分布 ─ P を掛けても変わらない分布 π（π P = π、Σ π = 1）を 3 つの方法で求めて、一致するのを見る
// ① 連立方程式：π P = π を、ガウスの消去法で解く（ぴったりの答え）
// ② べき乗法：適当な分布に P を何度も掛ける（01 の μ_n）。誤差はほぼ一定の割合で縮む
// ③ シミュレーション：1 人が長い間歩いたときの「各状態にいた時間の割合」（誤差は 1/√t くらいで縮む）
// π は P の転置の「固有値 1 の固有ベクトル」。検索のページランクも同じ考え（シリーズ 8 の 08）
// N 新しい連鎖 / R やり直し / スペース 一時停止 / ↑↓ シミュレーションの速さ
// ============================================

const N_STATES = 5;                      // ★ 状態の数（3〜7）
let transP, piExact, powVec, powErr = [], powIt = 0, walker = 0, visits, tSim = 0, simErr = [], paused = false, speed = 2000, chainSeed = 5, nodes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  newChain();
}
// ★ でたらめな連鎖：i → i+1 の矢印は必ず入れて（ぐるっと回れる = 既約）、ほかは半分くらいの確率で
function randomChain(n) {
  let a = zerosMat(n);
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) if (rnd() < 0.45) a[i][j] = rnd(); a[i][(i + 1) % n] += 0.2 + rnd(); }
  return fixRows(a).map((r) => r.map((v) => Math.round(v * 100) / 100)).map((r) => { let s = sumOf(r); r[r.indexOf(Math.max(...r))] += Math.round((1 - s) * 100) / 100; return r; });
}
function newChain() { seedRng(chainSeed++); transP = fixRows(randomChain(N_STATES)); restart(); }
function restart() {
  piExact = stationaryExact(transP);
  powVec = new Array(N_STATES).fill(0); powVec[0] = 1; powErr = [Math.log10(Math.max(1e-16, tvDist(powVec, piExact)))]; powIt = 0;
  walker = 0; visits = new Array(N_STATES).fill(0); tSim = 0; simErr = [];
}

function draw() {
  background(...BG);
  // ② べき乗法：20 フレームに 1 回、π ← π P
  if (!paused && frameCount % 20 === 0 && powIt < 60) { powVec = vecMat(powVec, transP); powIt++; powErr.push(Math.log10(Math.max(1e-16, tvDist(powVec, piExact)))); }
  // ③ シミュレーション：1 フレームに speed 歩
  if (!paused) { for (let k = 0; k < speed; k++) { walker = sampleFrom(transP[walker]); visits[walker]++; } tSim += speed; if (frameCount % 6 === 0) simErr.push([Math.log10(tSim), Math.log10(Math.max(1e-6, tvDist(visits.map((v) => v / tSim), piExact)))]); }
  hudTitle('定常分布 π：3 つの方法で求める（状態 ' + N_STATES + ' 個）', 'N 新しい連鎖　R やり直し　スペース 一時停止' + (paused ? '（停止中）' : '') + '　↑↓ 速さ ' + speed + ' 歩/フレーム');

  // ---- 遷移図と歩く人
  let gcx = width * 0.2, gcy = height * 0.32, rad = Math.min(width * 0.12, height * 0.17);
  nodes = []; for (let k = 0; k < N_STATES; k++) nodes.push([gcx + rad * Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / N_STATES), gcy + rad * Math.sin(-Math.PI / 2 + (k * 2 * Math.PI) / N_STATES)]);
  drawChainGraph(nodes, transP, 24, STATE_COLS, { labels: false, hl: walker });
  noStroke(); fill(...SUB); textSize(13); textAlign(CENTER, TOP); text('矢印の太さ = 確率、白い輪 = 歩く人の今の場所', gcx, gcy + rad + 44);

  // ---- 3 つの答えを並べた棒
  let bx = 40, by = height * 0.7, bw = Math.min(420, width * 0.33), bh = height * 0.19, gw = bw / N_STATES, sim = visits.map((v) => v / Math.max(1, tSim));
  noStroke(); fill(...CREAM); textSize(15); textAlign(LEFT, BASELINE); text('各状態の π（② ' + powIt + ' 回、③ ' + tSim.toLocaleString() + ' 歩）', bx, by - 14);
  let top = Math.max(...piExact) * 1.3;
  for (let k = 0; k < N_STATES; k++) {
    let vals = [piExact[k], powVec[k], sim[k]], cols = [MUSTARD, TEAL, DICE];
    for (let m = 0; m < 3; m++) { let hh = clampv(vals[m] / top, 0, 1) * bh; noStroke(); fill(...cols[m]); rect(bx + k * gw + gw * 0.12 + m * gw * 0.25, by + bh - hh, gw * 0.23, hh, 2); }
    fill(...CREAM); textSize(12); textAlign(CENTER, TOP); text('状態 ' + k + '\n' + fmtN(piExact[k], 3), bx + k * gw + gw / 2, by + bh + 4);
  }
  legend(bx + bw - 150, by - 76, [[MUSTARD, '① 連立方程式'], [TEAL, '② べき乗法'], [DICE, '③ シミュレーション']]);

  // ---- 誤差のグラフ 2 つ（全変動距離、対数）
  let px = width * 0.47, pw = Math.min(560, width - px - 50);
  let g1 = { x: px, y: 120, w: pw, h: height * 0.24, x0: 0, x1: 60, y0: -16, y1: 0 };
  plotAxes(g1, 'べき乗法の回数', '② log₁₀（π との距離）：まっすぐ下がる = 毎回同じ割合で縮む', [0, 20, 40, 60], [-16, -8, 0]);
  drawCurve(g1, powErr, TEAL, 2.5);
  let g2 = { x: px, y: g1.y + g1.h + 80, w: pw, h: height * 0.24, x0: 2, x1: 8, y0: -4, y1: 0 };
  plotAxes(g2, 'log₁₀（歩数）', '③ log₁₀（滞在割合と π の距離）：傾き −1/2 の線（点線）に沿う', [2, 4, 6, 8], [-4, -2, 0]);
  if (simErr.length) { let b0 = simErr[0][1] + 0.5 * simErr[0][0]; stroke(...SUB); strokeWeight(1); drawingContext.setLineDash([5, 5]); line(gX(g2, 2), gY(g2, b0 - 1), gX(g2, 8), gY(g2, b0 - 4)); drawingContext.setLineDash([]); }
  stroke(...DICE); strokeWeight(2); polyline(simErr.map((p) => [gX(g2, p[0]), gY(g2, p[1])]));
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  text('π P = π ⇔ Pᵀ πᵀ = πᵀ：π は Pᵀ の固有値 1 の固有ベクトル（ページランクも同じ、シリーズ 8 の 08）', px, g2.y + g2.h + 56);
  text('π P − π の最大 = ' + maxAbsDiff(vecMat(piExact, transP), piExact).toExponential(1), px, g2.y + g2.h + 78);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'n' || key === 'N') newChain();
  if (key === 'r' || key === 'R') restart();
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) speed = Math.min(20000, speed * 2);
  if (key === DOWN_ARROW) speed = Math.max(1, Math.floor(speed / 2));
  return false;
}

// ============================================
// やってみよう
// 1. N で連鎖を変えると、② の直線の傾きが変わる。傾きが急な連鎖と、ゆるい連鎖の矢印のちがいは？
// 2. ③ は 100 倍歩いても誤差は 1/10 にしかならない（傾き −1/2）。① ② にくらべてずっと遅い
// 3. randomChain の 0.2 + rnd() の矢印を消して、ぐるっと回れない連鎖にすると ① の答えはどうなる？（03 へ）
// 4. N_STATES を 7 にしてみよう
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(99); let worst = 0, worstPi = 0, rows = 0;
  for (let t = 0; t < 30; t++) {
    let a = fixRows(randomChain(3 + (t % 5))), pe = stationaryExact(a), pw = stationaryPower(a, 1e-15, 200000).pi;
    worst = Math.max(worst, maxAbsDiff(pe, pw)); worstPi = Math.max(worstPi, maxAbsDiff(vecMat(pe, a), pe)); rows = Math.max(rows, rowSumErr(a));
  }
  check('でたらめな連鎖 30 個：行の合計 = 1', rows < 1e-12);
  check('30 個すべてで ① 連立方程式 = ② べき乗法（ずれ ' + worst.toExponential(1) + '）', worst < 1e-10);
  check('30 個すべてで π P = π', worstPi < 1e-12);
  seedRng(5); let a = fixRows(randomChain(N_STATES)), pe = stationaryExact(a), cnt = new Array(N_STATES).fill(0), w = 0, nS = 300000;
  for (let t = 0; t < nS; t++) { w = sampleFrom(a[w]); cnt[w]++; }
  check('③ 30 万歩の滞在割合 ≈ π（全変動距離 < 0.01）', tvDist(cnt.map((c) => c / nS), pe) < 0.01);
  let ds = [[0.2, 0.5, 0.3], [0.5, 0.3, 0.2], [0.3, 0.2, 0.5]];
  check('列の合計も 1 の行列（二重確率行列）の π は一様（1/3, 1/3, 1/3）', maxAbsDiff(stationaryExact(ds), [1 / 3, 1 / 3, 1 / 3]) < 1e-12);
  // 2 状態：π = (q, p) / (p + q)
  check('2 状態 [[1−p, p], [q, 1−q]] の π = (q, p)/(p + q)', maxAbsDiff(stationaryExact([[0.7, 0.3], [0.1, 0.9]]), [0.25, 0.75]) < 1e-12);
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
// ---- 遷移図を描く道具：矢印の太さ = 確率
function bezPts(ax, ay, bx, by, bend, r) {          // 少しふくらんだ曲線の点（両はしの円 r の中は除く）
  let mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  let cx = mx - (dy / L) * bend * L, cy = my + (dx / L) * bend * L, pts = [];
  for (let k = 0; k <= 30; k++) {
    let t = k / 30, x = (1 - t) * (1 - t) * ax + 2 * t * (1 - t) * cx + t * t * bx, y = (1 - t) * (1 - t) * ay + 2 * t * (1 - t) * cy + t * t * by;
    if (Math.hypot(x - ax, y - ay) > r + 2 && Math.hypot(x - bx, y - by) > r + 6) pts.push([x, y]);
  }
  return pts;
}
function arrowHeadAt(pts, sz) {       // 折れ線の最後に三角の矢じり
  if (pts.length < 2) return;
  let [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  triangle(x2 + ux * sz, y2 + uy * sz, x2 - uy * sz * 0.6, y2 + ux * sz * 0.6, x2 + uy * sz * 0.6, y2 - ux * sz * 0.6);
}
// nodes = [[x, y], …]、a = 遷移行列。戻り値：矢印ごとの { i, j, mx, my }（ラベルやクリック判定用）
function drawChainGraph(nodes, a, r, cols, opts) {
  opts = opts || {};
  let cx = meanOf(nodes.map((p) => p[0])), cy = meanOf(nodes.map((p) => p[1])), hits = [];
  for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) {
    let p = a[i][j]; if (!(p > 1e-9)) continue;
    let col = cols[i % cols.length], w = 1 + 11 * p, pts;
    if (i === j) {                     // 自分に戻る矢印：外側に小さな輪
      let ox = nodes[i][0] - cx, oy = nodes[i][1] - cy, L = Math.hypot(ox, oy) || 1, ux = ox / L, uy = L > 1 ? oy / L : -1;
      if (L <= 1) ux = 0;
      let lx = nodes[i][0] + ux * r * 1.55, ly = nodes[i][1] + uy * r * 1.55, rr = r * 0.62, base = Math.atan2(-uy, -ux);
      pts = []; for (let k = 0; k <= 32; k++) { let t = base + 0.9 + (k / 32) * (2 * Math.PI - 1.8); pts.push([lx + rr * Math.cos(t), ly + rr * Math.sin(t)]); }
      hits.push({ i, j, mx: lx + ux * rr, my: ly + uy * rr });
    } else {
      pts = bezPts(nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1], 0.14, r);
      if (pts.length) hits.push({ i, j, mx: pts[pts.length >> 1][0], my: pts[pts.length >> 1][1] });
    }
    stroke(col[0], col[1], col[2], opts.alphaEdge || 210); strokeWeight(w); noFill(); polyline(pts);
    noStroke(); fill(col[0], col[1], col[2], opts.alphaEdge || 230); arrowHeadAt(pts, 8 + w * 0.8);
    if (opts.labels !== false && pts.length) {
      let h = hits[hits.length - 1]; fill(...CREAM); textSize(13); textAlign(CENTER, CENTER); text(fmtN(p, 2), h.mx, h.my - 12);
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    let col = cols[i % cols.length]; stroke(...CREAM); strokeWeight(opts.hl === i ? 4 : 1.5); fill(col[0] * 0.55, col[1] * 0.55, col[2] * 0.55);
    circle(nodes[i][0], nodes[i][1], 2 * r);
    noStroke(); fill(...CREAM); textAlign(CENTER, CENTER); textSize(opts.nameSize || 18); text(opts.names ? opts.names[i] : String(i), nodes[i][0], nodes[i][1]);
  }
  return hits;
}
function drawMatrix(a, x, y, cw, ch, names, opts) {   // 行列を色つきの表で（濃い = 大きい）
  opts = opts || {}; let d = opts.digits === undefined ? 2 : opts.digits, n = a.length, m = a[0].length, hi = opts.hi || 1;
  textAlign(CENTER, CENTER); textSize(opts.ts || 13);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    let v = a[i][j], t = clampv(Math.abs(v) / hi, 0, 1); noStroke();
    fill(48 + t * (TEAL[0] - 48), 42 + t * (TEAL[1] - 42), 40 + t * (TEAL[2] - 40)); rect(x + j * cw, y + i * ch, cw - 2, ch - 2, 3);
    fill(...CREAM); text(fmtN(v, d), x + j * cw + cw / 2, y + i * ch + ch / 2);
  }
  if (names) { fill(...SUB); for (let i = 0; i < n; i++) { textAlign(RIGHT, CENTER); text(names[i], x - 6, y + i * ch + ch / 2); } for (let j = 0; j < m; j++) { textAlign(CENTER, BOTTOM); text(names[j], x + j * cw + cw / 2, y - 3); } }
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
