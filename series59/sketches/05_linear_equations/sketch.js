// ============================================
// 05 線形方程式を解く ─ 引き算がないのに、どうやって A ⊗ x = b を解く？
// 部品 j を時刻 x_j に投入すると、製品 i は max_j (a_ij + x_j) = (A ⊗ x)_i に完成する。締め切りは b_i
//   「全部の製品が締め切りに間に合う中で、いちばん遅く始める」= A ⊗ x ≤ b の最大の x（残余・最大劣解）
//   x⁺_j = min_i (b_i − a_ij)。A ⊗ x⁺ = b なら方程式は解ける、ちがえばどんな x でも解けない
// 下：x = A ⊗ x ⊕ b（「準備 b_i と、前の作業 j の a_ij 後の遅いほう」）の最小解は x = A* ⊗ b。x ← A ⊗ x ⊕ b をくり返すと n 回以内で止まる
// ● ドラッグ 締め切り b_i / 表のマスにマウスで ↑↓ a_ij、E = ε / R ランダム / N 下の行列を作り直す
// ============================================

let matA = [[5, 8, -Infinity], [-Infinity, 4, 6], [3, -Infinity, 7]];   // ★ a_ij = 部品 j の投入から製品 i の完成まで（分）
let dl = [20, 18, 22];                  // ★ 締め切り b_i（分）
let matQ = [[-Infinity, 2, -Infinity], [-Infinity, -Infinity, 3], [-6, -Infinity, -Infinity]], bQ = [1, 0, 2];   // ★ 下の x = Q ⊗ x ⊕ b
let dragI = -1, hover = null;
const T_SPAN = 30;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); }
// ★ 最小解 x = A* ⊗ b（正の回路があれば解なし）と、くり返し x ← A ⊗ x ⊕ b の途中経過
function leastSolution(A, b) {
  let st = mpStar(A); if (st.positive) return null;
  let it = [b.slice()];
  for (let k = 0; k < A.length + 1; k++) { let x = it[it.length - 1], y = mpMatVec(A, x).map((v, i) => mpAdd(v, b[i])); it.push(y); }
  return { x: mpMatVec(st.star, b), it };
}

function draw() {
  background(22, 22, 28);
  let xh = mpResid(matA, dl), Ax = mpMatVec(matA, xh), solv = mpVecEq(Ax, dl);
  let tl = { x: 380, w: width - 440 }, tx = (t) => tl.x + (clampv(t, -5, T_SPAN) / T_SPAN) * tl.w;
  let yIn = (j) => 150 + j * 46, yOut = (i) => 340 + i * 46;
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('線形方程式を解く：A ⊗ x = b', 40, 40);
  fill(170); textSize(15); text('● ドラッグ 締め切り b_i　表のマスにマウスで ↑↓ a_ij、E = ε　R ランダム　N 下の行列を作り直す', 40, 66);
  // ---- 時間軸
  stroke(55); strokeWeight(1);
  for (let t = 0; t <= T_SPAN; t += 5) line(tx(t), 120, tx(t), 470);
  noStroke(); fill(140); textSize(12); textAlign(CENTER, TOP); for (let t = 0; t <= T_SPAN; t += 5) text(t, tx(t), 474);
  // 部品 → 製品の線（x⁺_j + a_ij。ぴったり締め切りに着く線 = 効いている制約）
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (matA[i][j] === NEG_INF || !isFinite(xh[j])) continue;
    let tight = Math.abs(xh[j] + matA[i][j] - dl[i]) < 1e-9;
    stroke(tight ? color(255, 170, 70) : color(120, 140, 170, 120)); strokeWeight(tight ? 3 : 1.5);
    line(tx(xh[j]), yIn(j), tx(xh[j] + matA[i][j]), yOut(i));
  }
  for (let j = 0; j < 3; j++) {
    noStroke(); fill(110, 190, 255); circle(tx(isFinite(xh[j]) ? xh[j] : T_SPAN), yIn(j), 16);
    fill(220); textSize(15); textAlign(RIGHT, CENTER); text('部品 ' + (j + 1) + ' の投入 x⁺' + (j + 1) + ' = ' + mpFmt(xh[j]), tl.x - 20, yIn(j));
  }
  for (let i = 0; i < 3; i++) {
    stroke(255, 220, 120); strokeWeight(2); line(tx(dl[i]), yOut(i) - 16, tx(dl[i]), yOut(i) + 16);
    noStroke(); fill(255, 220, 120); circle(tx(dl[i]), yOut(i) - 18, 12);
    fill(150, 230, 160); if (Ax[i] !== NEG_INF) circle(tx(Ax[i]), yOut(i), 12);
    fill(220); textSize(15); textAlign(RIGHT, CENTER); text('製品 ' + (i + 1) + '：完成 ' + mpFmt(Ax[i]) + '　締め切り b = ' + dl[i], tl.x - 20, yOut(i));
  }
  // ---- 行列 A
  let cs = 46, mx = 40, my = 120; hover = null;
  noStroke(); fill(200); textSize(14); textAlign(LEFT, BASELINE); text('A（行 = 製品、列 = 部品）', mx, my - 8);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let x = mx + j * cs, y = my + i * cs, on = mouseX > x && mouseX < x + cs && mouseY > y && mouseY < y + cs;
    if (on) hover = [i, j];
    stroke(on ? color(255, 220, 120) : 70); fill(matA[i][j] === NEG_INF ? 28 : 42); rect(x, y, cs, cs);
    noStroke(); fill(matA[i][j] === NEG_INF ? 110 : 240); textAlign(CENTER, CENTER); textSize(15); text(mpFmt(matA[i][j]), x + cs / 2, y + cs / 2);
  }
  textAlign(LEFT, BASELINE); fill(solv ? color(120, 210, 150) : color(255, 170, 110)); textSize(17);
  text(solv ? '✓ A ⊗ x⁺ = b：ぴったり解ける（どの製品も締め切りちょうどに完成）' : '✗ A ⊗ x⁺ ≠ b：早く完成する製品がある → この方程式には解がない', 40, 520);
  fill(200); textSize(15);
  text('x⁺_j = min_i (b_i − a_ij)：部品 j を x⁺_j より 1 分でも遅らせると、オレンジの線の製品が締め切りに遅れる（いちばん大きい劣解）', 40, 546, width - 80);

  // ---- 下：x = Q ⊗ x ⊕ b
  let ls = leastSolution(matQ, bQ), y0 = 610;
  fill(240); textSize(17);
  text('x = Q ⊗ x ⊕ b　Q = ' + JSON.stringify(matQ.map((r) => r.map((v) => mpFmt(v)))).replace(/"/g, '') + '、b = (' + bQ.join(', ') + ')', 40, y0);
  fill(200); textSize(15);
  if (!ls) text('Q に正の回路 → 最小解はない（くり返すといつまでも増える）。N で作り直す', 40, y0 + 26);
  else {
    text('くり返し x ← Q ⊗ x ⊕ b：' + ls.it.map((x, k) => 'x' + k + ' = (' + x.map((v) => mpFmt(v)).join(', ') + ')').join('　'), 40, y0 + 26, width - 80);
    fill(150, 230, 160); text('最小解 x = Q* ⊗ b = (' + ls.x.map((v) => mpFmt(v)).join(', ') + ')　→ くり返しの答えと一致', 40, y0 + 70);
  }
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { let tl = { x: 380, w: width - 440 }; dragI = -1; for (let i = 0; i < 3; i++) if (Math.hypot(mouseX - (tl.x + (dl[i] / T_SPAN) * tl.w), mouseY - (340 + i * 46 - 18)) < 14) dragI = i; }
function mouseDragged() { if (dragI >= 0) dl[dragI] = Math.round(clampv(((mouseX - 380) / (width - 440)) * T_SPAN, 0, T_SPAN)); }
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if (hover) {
    let [i, j] = hover, v = matA[i][j];
    if (key === UP_ARROW) matA[i][j] = v === NEG_INF ? 0 : Math.min(15, v + 1);
    if (key === DOWN_ARROW) matA[i][j] = v === NEG_INF ? 0 : Math.max(0, v - 1);
    if (key === 'e' || key === 'E') matA[i][j] = v === NEG_INF ? 3 : NEG_INF;
  }
  if (key === 'r' || key === 'R') { matA = matA.map((r) => r.map(() => (Math.random() < 0.3 ? NEG_INF : Math.floor(Math.random() * 10)))); dl = dl.map(() => 10 + Math.floor(Math.random() * 15)); }
  if (key === 'n' || key === 'N') { matQ = matQ.map((r, i) => r.map((_, j) => (i === j || Math.random() < 0.5 ? NEG_INF : Math.floor(Math.random() * 9) - 5))); bQ = bQ.map(() => Math.floor(Math.random() * 5)); }
  return false;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(5);
  let okLeq = true, okMax = true, okSamp = true, okSolv = true, okNo = true, okLeast = true;
  for (let t = 0; t < 60; t++) {
    let A = mpMat(3, 3); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (rnd() < 0.7) A[i][j] = rndInt(0, 9);
    let b = [0, 1, 2].map(() => rndInt(5, 20)), xh = mpResid(A, b), Ax = mpMatVec(A, xh);
    if (!noNaN(Ax) || !mpVecLeq(Ax, b)) okLeq = false;
    for (let j = 0; j < 3; j++) if (isFinite(xh[j])) { let y = xh.slice(); y[j] += 0.5; if (mpVecLeq(mpMatVec(A, y), b)) okMax = false; }
    for (let s = 0; s < 200; s++) { let y = [0, 1, 2].map(() => rndInt(-5, 20)); if (mpVecLeq(mpMatVec(A, y), b) && !y.every((v, j) => v <= xh[j])) okSamp = false; }
    let y = [0, 1, 2].map(() => rndInt(0, 10)), by = mpMatVec(A, y);
    if (by.every((v) => v !== NEG_INF)) { let x2 = mpResid(A, by); if (!mpVecEq(mpMatVec(A, x2), by) || !y.every((v, j) => v <= x2[j])) okSolv = false; }
    if (!mpVecEq(Ax, b) && t < 20) for (let p = -5; p <= 20; p++) for (let q = -5; q <= 20; q++) for (let r = -5; r <= 20; r++) if (mpVecEq(mpMatVec(A, [p, q, r]), b)) okNo = false;
    let Q = mpMat(3, 3); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j && rnd() < 0.5) Q[i][j] = rndInt(-6, 3);
    let ls = leastSolution(Q, b);
    if (ls) {
      let x = ls.x, fix = mpMatVec(Q, x).map((v, i) => mpAdd(v, b[i]));
      let other = mpMatVec(mpStar(Q).star, b.map((v) => v + rndInt(0, 4)));
      if (!mpVecEq(fix, x) || !mpVecEq(ls.it[ls.it.length - 1], x) || !x.every((v, i) => v <= other[i])) okLeast = false;
    } else if (!(bruteMaxMean(Q) > 0)) okLeast = false;
  }
  check('残余 x⁺ = A \\ b は A ⊗ x⁺ ≤ b を満たす（ε 入り、NaN なし）', okLeq);
  check('いちばん大きい：x⁺_j を 0.5 増やすと必ず締め切りを破る', okMax);
  check('A ⊗ y ≤ b を満たすランダムな y はすべて y ≤ x⁺', okSamp);
  check('b = A ⊗ y と作ると A ⊗ x⁺ = b（解ける）、しかも y ≤ x⁺', okSolv);
  check('A ⊗ x⁺ ≠ b のときは、格子上のどの y でも A ⊗ y ≠ b（26³ 通り × 該当分）', okNo);
  check('x = Q ⊗ x ⊕ b の最小解 Q* ⊗ b：方程式を満たし、くり返しと一致し、他の解以下', okLeast);
  check('どの行にも関係しない部品（列が全部 ε）は x⁺ = +∞、A ⊗ x⁺ に NaN が出ない', (() => { let A = [[3, NEG_INF], [4, NEG_INF]], x = mpResid(A, [10, 9]); return x[1] === Infinity && noNaN(mpMatVec(A, x)) && x[0] === 5; })());
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 製品 1 の締め切りを ● で早くすると、どの部品の投入 x⁺ が早まる？ オレンジの線に注目
// 2. ✓（ぴったり解ける）になる締め切りの組を探そう。✗ のとき、早く完成する製品はどれ？
// 3. 表の a_ij を E で ε にすると、その部品は何に縛られる？ 列が全部 ε なら？
// 4. 下の式で N を押し、くり返しが何回で止まるか数えよう（n = 3 回以内）
// 5. 04 の A* と下の Q* は同じもの。「準備 b」を加えると PERT の最早開始時刻そのもの

// ==================================================
// ここから下は「マックスプラスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- マックスプラスの数：ε = −∞（「ゼロ」= 起きない・制約なし）、e = 0（「いち」= 待ち時間なし）
const NEG_INF = -Infinity;
function mpAdd(a, b) { return a >= b ? a : b; }                                   // a ⊕ b = max(a, b)
function mpMul(a, b) { return a === NEG_INF || b === NEG_INF ? NEG_INF : a + b; }  // a ⊗ b = a + b（ε があれば ε。−∞ + ∞ を作らない）
function mpFmt(v, d) {                                                             // ε を「ε」と表示（−Infinity を見せない）
  if (v === NEG_INF) return 'ε';
  if (v === Infinity) return '+∞';
  if (typeof v !== 'number' || v !== v) return '?';
  let s = (+v.toFixed(d === undefined ? 1 : d)).toString();
  return s === '-0' ? '0' : s;
}
// ---- マックスプラス行列（配列の配列）。(A ⊗ B)_ij = max_k (a_ik + b_kj)
function mpMat(n, m, v) { return Array.from({ length: n }, () => new Array(m).fill(v === undefined ? NEG_INF : v)); }
function mpEye(n) { let I = mpMat(n, n); for (let i = 0; i < n; i++) I[i][i] = 0; return I; }      // 単位行列 E（対角 e = 0、他は ε）
function mpMatMul(A, B) {
  let n = A.length, m = B[0].length, q = B.length, C = mpMat(n, m);
  for (let i = 0; i < n; i++) for (let k = 0; k < q; k++) {
    let a = A[i][k]; if (a === NEG_INF) continue;
    for (let j = 0; j < m; j++) { let b = B[k][j]; if (b !== NEG_INF && a + b > C[i][j]) C[i][j] = a + b; }
  }
  return C;
}
function mpMatAdd(A, B) { return A.map((r, i) => r.map((v, j) => mpAdd(v, B[i][j]))); }
function mpMatVec(A, x) { return A.map((r) => { let s = NEG_INF; for (let j = 0; j < r.length; j++) s = mpAdd(s, mpMul(r[j], x[j])); return s; }); }
function mpPow(A, k) { let P = mpEye(A.length); for (let t = 0; t < k; t++) P = mpMatMul(P, A); return P; }
// A* = E ⊕ A ⊕ A² ⊕ … ⊕ A^(n−1)。正の回路があると A* は発散する → positive = true（tol は計算誤差のゆとり）
function mpStar(A, tol) {
  let n = A.length, St = mpMatAdd(mpEye(n), A), P = A, plus = A.map((r) => r.slice());
  for (let k = 2; k <= n; k++) { P = mpMatMul(P, A); plus = mpMatAdd(plus, P); if (k < n) St = mpMatAdd(St, P); }
  let positive = false; for (let i = 0; i < n; i++) if (plus[i][i] > (tol === undefined ? 1e-9 : tol)) positive = true;
  return { star: St, positive };
}
// 残余（いちばん大きい劣解）：A ⊗ x ≤ b を満たす最大の x。x_j = min_i (b_i − a_ij)（a_ij = ε の行は制約なし）
function mpResid(A, b) {
  let m = A[0].length, x = new Array(m).fill(Infinity);
  for (let j = 0; j < m; j++) for (let i = 0; i < A.length; i++) {
    if (A[i][j] === NEG_INF) continue;
    let v = b[i] === NEG_INF ? NEG_INF : b[i] - A[i][j];
    if (v < x[j]) x[j] = v;
  }
  return x;                            // どの行にも関係しない列は +∞（いくら遅くてもよい）
}
function mpVecLeq(u, v, tol) { return u.every((a, i) => a === NEG_INF || a <= v[i] + (tol || 1e-9)); }
function mpVecEq(u, v, tol) { return u.every((a, i) => (a === NEG_INF && v[i] === NEG_INF) || (a !== NEG_INF && v[i] !== NEG_INF && Math.abs(a - v[i]) <= (tol || 1e-9))); }
// 全部の単純な回路（小さいグラフ用の答え合わせ）。nodes は辺の向きの順
function allCycles(A) {
  let n = A.length, out = [];
  let dfs = (s, v, path, w) => {
    for (let u = s; u < n; u++) {
      if (A[u][v] === NEG_INF) continue;
      if (u === s) out.push({ nodes: path.slice(), w: w + A[u][v], mean: (w + A[u][v]) / path.length });
      else if (!path.includes(u)) dfs(s, u, path.concat([u]), w + A[u][v]);
    }
  };
  for (let s = 0; s < n; s++) dfs(s, s, [s], 0);
  return out;
}
function bruteMaxMean(A) { return allCycles(A).reduce((m, c) => Math.max(m, c.mean), NEG_INF); }
function isIrreducible(A) {            // どのノードからどのノードへも行ける（強連結）
  let n = A.length, reach = (fwd) => { let seen = [0], st = [0]; while (st.length) { let v = st.pop(); for (let u = 0; u < n; u++) if ((fwd ? A[u][v] : A[v][u]) !== NEG_INF && !seen.includes(u)) { seen.push(u); st.push(u); } } return seen.length === n; };
  return n > 0 && reach(true) && reach(false);
}
// ---- 種つきの乱数（同じ種なら毎回同じ列）
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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
