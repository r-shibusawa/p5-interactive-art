// ============================================
// 12 min-plus と最短経路 ─ ⊕ を max から min に替えると (min, +) 半環。ゼロは +∞、いちは 0。今度は「いちばん近い道」
// 迷路のマスがノード。となりのマスへ入るコスト：道 1、ぬかるみ 4、壁は入れない（+∞）
//   ベルマン-フォード法 = min-plus の 1 次方程式 x = A ⊗' x ⊕' b をくり返し x ← A ⊗' x ⊕' b で解く（b = 出発点 0、他は +∞）
//   1 回くり返すごとに「1 歩ぶん」波が広がる。止まった答えを、ダイクストラ法（優先度つきキュー）の答えと比べる
// ドラッグで塗る（1 壁 / 2 ぬかるみ / 3 道 / 4 出発点）/ スペース 一時停止 / ← → 1 コマのくり返し回数 / R ランダムな迷路 / C 全部消す
// ============================================

const COLS = 40, ROWS = 24;            // ★ 迷路の大きさ
const COST = { road: 1, mud: 4 };      // ★ マスに入るコスト
const INF = Infinity;                  // min-plus のゼロ（行けない）
let cellT, src = 0, brush = 1, xs, iter = 0, done = false, paused = false, perFrame = 1, dj = null;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); seedRng(12); cellT = randomMaze(COLS, ROWS); src = idx(1, 1); for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) cellT[idx(c, r)] = 0; restart(); }
function idx(c, r) { return c + COLS * r; }
function mnAdd(a, b) { return a <= b ? a : b; }                                   // a ⊕' b = min(a, b)
function mnMul(a, b) { return a === INF || b === INF ? INF : a + b; }             // a ⊗' b = a + b（+∞ があれば +∞）
function costOf(t) { return t === 1 ? INF : t === 2 ? COST.mud : COST.road; }      // 0 道、1 壁、2 ぬかるみ
function neighbors(i, nc, nr) { let c = i % nc, r = Math.floor(i / nc), out = []; if (c > 0) out.push(i - 1); if (c < nc - 1) out.push(i + 1); if (r > 0) out.push(i - nc); if (r < nr - 1) out.push(i + nc); return out; }
// ★ ベルマン-フォードの 1 回：x_i ← min( b_i, min_j (x_j ⊗' a_ij) )、a_ij = となりの j から i に入るコスト
function bfStep(x, T, s, nc, nr) {
  let y = new Array(x.length), changed = false;
  for (let i = 0; i < x.length; i++) {
    let v = i === s ? 0 : INF, ci = costOf(T[i]);
    if (ci !== INF) for (let j of neighbors(i, nc, nr)) v = mnAdd(v, mnMul(x[j], ci));
    y[i] = v; if (v !== x[i]) changed = true;
  }
  return { y, changed };
}
// ★ ダイクストラ法（2 分ヒープ）
function dijkstra(T, s, nc, nr) {
  let d = new Array(T.length).fill(INF), heap = [[0, s]]; d[s] = 0;
  let push = (e) => { heap.push(e); let k = heap.length - 1; while (k > 0) { let p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  let pop = () => { let top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  while (heap.length) {
    let [dv, v] = pop(); if (dv > d[v]) continue;
    for (let u of neighbors(v, nc, nr)) { let w = costOf(T[u]); if (w !== INF && dv + w < d[u]) { d[u] = dv + w; push([d[u], u]); } }
  }
  return d;
}
function randomMaze(nc, nr) { let T = new Array(nc * nr).fill(0); for (let i = 0; i < T.length; i++) { let u = rnd(); T[i] = u < 0.22 ? 1 : u < 0.36 ? 2 : 0; } return T; }
function restart() { xs = cellT.map((_, i) => (i === src ? 0 : INF)); iter = 0; done = false; dj = dijkstra(cellT, src, COLS, ROWS); }

function draw() {
  background(22, 22, 28);
  if (!paused && !done) for (let t = 0; t < perFrame && !done; t++) { let r = bfStep(xs, cellT, src, COLS, ROWS); if (r.changed) { xs = r.y; iter++; } else done = true; }
  let cs = Math.floor(Math.min((width - 80) / COLS, (height - 190) / ROWS)), ox = 40, oy = 100;
  let dmax = Math.max(1, ...dj.filter((v) => v < INF));
  noStroke();
  for (let i = 0; i < cellT.length; i++) {
    let c = i % COLS, r = Math.floor(i / COLS), v = xs[i];
    if (cellT[i] === 1) fill(90, 95, 105);
    else if (v === INF) fill(cellT[i] === 2 ? color(60, 45, 30) : 34);
    else { let u = v / dmax; fill(255 - 150 * u, 190 - 80 * u + (cellT[i] === 2 ? -60 : 0), 90 + 140 * u); }
    rect(ox + c * cs, oy + r * cs, cs - 1, cs - 1);
  }
  // ---- マウスのマスから出発点までの最短の道（距離が 1 つずつ減るとなりをたどる）
  let mc = Math.floor((mouseX - ox) / cs), mr = Math.floor((mouseY - oy) / cs), info = '';
  if (mc >= 0 && mc < COLS && mr >= 0 && mr < ROWS) {
    let i = idx(mc, mr), pts = [];
    if (xs[i] < INF) {
      for (let g = 0; g < COLS * ROWS && i !== src; g++) { pts.push(i); let ci = costOf(cellT[i]), nx = neighbors(i, COLS, ROWS).find((j) => xs[j] + ci === xs[i]); if (nx === undefined) break; i = nx; }
      pts.push(src); stroke(255); strokeWeight(3); noFill(); beginShape(); for (let p of pts) vertex(ox + ((p % COLS) + 0.5) * cs, oy + (Math.floor(p / COLS) + 0.5) * cs); endShape();
    }
    info = '　マウスのマス：ベルマン-フォード ' + mpFmt(xs[idx(mc, mr)], 0) + '、ダイクストラ ' + mpFmt(dj[idx(mc, mr)], 0);
  }
  noStroke(); fill(255, 255, 255); circle(ox + ((src % COLS) + 0.5) * cs, oy + (Math.floor(src / COLS) + 0.5) * cs, cs * 0.8);
  let same = xs.every((v, i) => v === dj[i]);
  textAlign(LEFT, BASELINE); fill(240); textSize(20);
  text('min-plus と最短経路　くり返し ' + iter + ' 回' + (done ? '（止まった）' : '') + info, 40, 40);
  fill(170); textSize(15); text('ドラッグで塗る（いま ' + ['', '1 壁', '2 ぬかるみ', '3 道', '4 出発点'][brush] + '）　スペース 一時停止　← → 1 コマ ' + perFrame + ' 回　R ランダム　C 全部消す', 40, 66);
  fill(done && same ? color(120, 210, 150) : color(255, 220, 120)); textSize(16);
  text(done ? (same ? '✓ ベルマン-フォード（x ← A ⊗\' x ⊕\' b）の答え = ダイクストラ法の答え（全 ' + COLS * ROWS + ' マス、行けないマスは +∞）' : '✗ 一致しない') : '波が広がり中… k 回目の値 = 「k 歩以内の道だけ」を使ったときの最短距離（もっと歩くと縮むこともある）', 40, oy + ROWS * cs + 30, width - 80);
  drawSelfTest(width - 170, height - 12);
}

function paint() {
  let cs = Math.floor(Math.min((width - 80) / COLS, (height - 190) / ROWS)), c = Math.floor((mouseX - 40) / cs), r = Math.floor((mouseY - 100) / cs);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
  let i = idx(c, r);
  if (brush === 4) { src = i; cellT[i] = 0; } else if (i !== src) cellT[i] = brush === 1 ? 1 : brush === 2 ? 2 : 0;
  restart();
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }
function keyPressed() {
  for (let k = 1; k <= 4; k++) if (key === String(k)) brush = k;
  if (key === ' ') paused = !paused;
  if (key === RIGHT_ARROW) perFrame = Math.min(64, perFrame * 2);
  if (key === LEFT_ARROW) perFrame = Math.max(1, perFrame / 2);
  if (key === 'r' || key === 'R') { cellT = randomMaze(COLS, ROWS); for (let j of neighbors(src, COLS, ROWS).concat([src])) cellT[j] = 0; restart(); }
  if (key === 'c' || key === 'C') { cellT.fill(0); restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(120);
  let okBD = true, okIt = true, okTri = true;
  for (let t = 0; t < 20; t++) {
    let nc = 12 + (t % 5), nr = 9, T = randomMaze(nc, nr), s = rndInt(0, nc * nr - 1); T[s] = 0;
    let x = T.map((_, i) => (i === s ? 0 : INF)), k = 0, r;
    while ((r = bfStep(x, T, s, nc, nr)).changed && k < nc * nr) { x = r.y; k++; }
    let d = dijkstra(T, s, nc, nr);
    if (!x.every((v, i) => v === d[i]) || !noNaN(x)) okBD = false;
    if (k > nc * nr - 1) okIt = false;
    for (let i = 0; i < x.length; i++) if (costOf(T[i]) !== INF) for (let j of neighbors(i, nc, nr)) if (x[i] > mnMul(x[j], costOf(T[i]))) okTri = false;
  }
  check('ベルマン-フォード（min-plus のくり返し）= ダイクストラ法（ランダムな迷路 20 個、+∞ も一致）', okBD);
  check('くり返しは n − 1 回以内で止まる', okIt);
  check('答えは三角不等式 x_i ≤ x_j + （i に入るコスト）を満たす（もう縮まない）', okTri);
  let okW = true, okD = true;
  for (let t = 0; t < 30; t++) {
    let n = 4, A = Array.from({ length: n }, () => Array.from({ length: n }, () => (rnd() < 0.3 ? INF : rndInt(1, 9))));
    let P = A.map((r, i) => r.map((_, j) => { let m = INF; for (let k = 0; k < n; k++) m = mnAdd(m, mnMul(A[i][k], A[k][j])); return m; }));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let b = INF; for (let k = 0; k < n; k++) if (A[i][k] < INF && A[k][j] < INF) b = Math.min(b, A[i][k] + A[k][j]); if (P[i][j] !== b) okW = false; }
    let neg = (M) => M.map((r) => r.map((v) => (v === INF ? NEG_INF : v === NEG_INF ? INF : -v))), Q = neg(mpMatMul(neg(A), neg(A)));
    if (!Q.every((r, i) => r.every((v, j) => v === P[i][j]))) okD = false;
  }
  check('min-plus の行列の積 (A ⊗\' A)_ij = 2 本の道の最短（総当たり）', okW);
  check('min-plus = 符号を反対にした max-plus：A ⊗\' B = −((−A) ⊗ (−B))', okD);
  check('+∞ ⊗\' a = +∞、+∞ ⊕\' a = a（NaN なし）', mnMul(INF, 5) === INF && mnMul(INF, INF) === INF && mnAdd(INF, 5) === 5);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで止めて ← → で 1 回ずつ進め、波（色のついたマス）が 1 歩ずつ広がるのを見よう
// 2. 2 でぬかるみを塗って、最短の道がぬかるみをよけるか確かめよう。ぬかるみのコストを 2 にすると？
// 3. 壁で出発点を囲むと、外のマスはずっと +∞（暗いまま）。ε = −∞ の min 版
// 4. くり返しの回数とダイクストラ法の手間を比べよう。ダイクストラが速いのはなぜ？（負のコストがないとき）
// 5. 03 の A^{⊗k}（max）とシリーズ 38 の 09（min）は、符号を反対にすれば同じ計算

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
