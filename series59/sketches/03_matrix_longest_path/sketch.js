// ============================================
// 03 行列の積と最長経路 ─ (A ⊗ B)_ij = max_k (a_ik + b_kj)。A^{⊗k} の (i, j) = 「ちょうど k 本の辺で i から j へ行く道の最大重み」
// ここでは a_ij = 「i → j の辺の重み」（辺がなければ ε）。右の A^{⊗k} の数を、全部の道を数えた答え（総当たり）と並べて確かめる
//   （シリーズ 38 の 09 は min で最短経路。ここは max で「いちばん時間のかかる道」= 待ち合わせの連鎖）
// ノードをドラッグ / ノード → ノードの順にクリック = 辺を足す・消す / 辺の数字をクリックして ↑↓ 重み / ← → k / マスにマウス = その道を表示 / R ランダム
// ============================================

const N_NODES = 5;                      // ★ ノードの数
let wts = [[-Infinity, 4, -Infinity, 2, -Infinity], [-Infinity, -Infinity, 3, -Infinity, 5], [1, -Infinity, -Infinity, 6, -Infinity], [-Infinity, -Infinity, 2, -Infinity, 3], [2, -Infinity, -Infinity, -Infinity, 1]];   // ★ 重み a_ij（i → j）
let kPow = 3, pos = [], dragN = -1, firstN = -1, selArc = null, brute = null, powK = null, hoverCell = null, moved = false;

function setup() {
  createCanvas(windowWidth, windowHeight); textWrap(CHAR);
  for (let i = 0; i < N_NODES; i++) pos.push({ x: width * 0.22 + 190 * Math.cos((TWO_PI * i) / N_NODES - HALF_PI), y: height * 0.5 + 190 * Math.sin((TWO_PI * i) / N_NODES - HALF_PI) });
  selfTest(); recompute();
}
// ★ 総当たり：ちょうど k 本の辺の道（同じノードを何度通ってもよい）を全部たどり、(i, j) ごとに最大の重みと道を記録
function bruteWalks(A, k) {
  let n = A.length, best = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ w: NEG_INF, path: null, count: 0 })));
  let rec = (s, v, d, w, path) => {
    if (d === k) { let b = best[s][v]; b.count++; if (w > b.w) { b.w = w; b.path = path.slice(); } return; }
    for (let u = 0; u < n; u++) if (A[v][u] !== NEG_INF) { path.push(u); rec(s, u, d + 1, w + A[v][u], path); path.pop(); }
  };
  for (let s = 0; s < n; s++) rec(s, s, 0, 0, [s]);
  return best;
}
function recompute() { powK = mpPow(wts, kPow); brute = bruteWalks(wts, kPow); }

function drawMatrix(M, x0, y0, cs, title, hl) {
  noStroke(); fill(220); textSize(16); textAlign(LEFT, BASELINE); text(title, x0, y0 - 12);
  for (let i = 0; i < M.length; i++) for (let j = 0; j < M.length; j++) {
    let on = hl && hl[0] === i && hl[1] === j;
    stroke(on ? color(255, 220, 120) : 70); strokeWeight(on ? 3 : 1); fill(M[i][j] === NEG_INF ? 28 : 40); rect(x0 + j * cs, y0 + i * cs, cs, cs);
    noStroke(); fill(M[i][j] === NEG_INF ? 110 : 240); textAlign(CENTER, CENTER); textSize(15); text(mpFmt(M[i][j], 0), x0 + (j + 0.5) * cs, y0 + (i + 0.5) * cs);
  }
  fill(150); textSize(12);
  for (let i = 0; i < M.length; i++) { text(i, x0 - 12, y0 + (i + 0.5) * cs); text(i, x0 + (i + 0.5) * cs, y0 + M.length * cs + 10); }
}

function draw() {
  background(22, 22, 28);
  let cs = 50, mx1 = width * 0.47, mx2 = mx1 + N_NODES * cs + 80, my = 150;
  hoverCell = null;
  let ci = Math.floor((mouseY - my) / cs), cj = Math.floor((mouseX - mx2) / cs);
  if (ci >= 0 && ci < N_NODES && cj >= 0 && cj < N_NODES) hoverCell = [ci, cj];
  let path = hoverCell ? brute[hoverCell[0]][hoverCell[1]].path : null;
  let onPath = (i, j) => path && path.some((v, t) => t > 0 && path[t - 1] === i && v === j);

  // ---- グラフ
  for (let i = 0; i < N_NODES; i++) for (let j = 0; j < N_NODES; j++) {
    if (wts[i][j] === NEG_INF) continue;
    let hot = onPath(i, j), sel = selArc && selArc[0] === i && selArc[1] === j, lp;
    stroke(hot ? color(255, 200, 80) : color(150, 170, 200)); fill(hot ? color(255, 200, 80) : color(150, 170, 200)); strokeWeight(hot ? 4 : 2);
    if (i === j) { noFill(); circle(pos[i].x, pos[i].y - 34, 32); lp = [pos[i].x, pos[i].y - 58]; }
    else lp = arrowTo(pos[i].x, pos[i].y, pos[j].x, pos[j].y, 24, wts[j][i] !== NEG_INF ? 10 : 0);
    noStroke(); fill(sel ? color(255, 220, 120) : 30); circle(lp[0], lp[1], 26);
    fill(sel ? 20 : 240); textAlign(CENTER, CENTER); textSize(14); text(wts[i][j], lp[0], lp[1]);
  }
  for (let i = 0; i < N_NODES; i++) {
    stroke(i === firstN ? color(255, 220, 120) : 200); strokeWeight(i === firstN ? 4 : 2);
    fill(path && (path[0] === i || path[path.length - 1] === i) ? color(255, 170, 70) : color(60, 90, 140)); circle(pos[i].x, pos[i].y, 44);
    noStroke(); fill(255); textSize(18); textAlign(CENTER, CENTER); text(i, pos[i].x, pos[i].y);
  }
  drawMatrix(wts, mx1, my, cs, '行列 A（a_ij = i → j）', null);
  drawMatrix(powK, mx2, my, cs, 'A^{⊗' + kPow + '}', hoverCell);

  // ---- 説明と答え合わせ
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('行列の積と最長経路　k = ' + kPow + '（ちょうど ' + kPow + ' 本の辺）', 40, 40);
  fill(170); textSize(15); text('ドラッグ ノード　ノード → ノードをクリックで辺　数字をクリックして ↑↓ 重み　← → k　右の表のマスにマウス　R ランダム', 40, 66);
  let ty = my + N_NODES * cs + 60, allSame = true;
  for (let i = 0; i < N_NODES; i++) for (let j = 0; j < N_NODES; j++) if (powK[i][j] !== brute[i][j].w) allSame = false;
  fill(allSame ? color(120, 210, 150) : color(255, 100, 90)); textSize(17);
  text(allSame ? '✓ A^{⊗' + kPow + '} の 25 マスすべてが、道を全部数えた最大重みと一致' : '✗ 一致しないマスがある', mx1, ty);
  fill(220); textSize(16);
  if (hoverCell) {
    let [i, j] = hoverCell, b = brute[i][j];
    text('(' + i + ', ' + j + ')：' + kPow + ' 本の道は ' + b.count + ' 通り。いちばん重い道 ' + (b.path ? b.path.join(' → ') + '　重み ' + b.w : 'なし → ε'), mx1, ty + 30);
    let terms = []; for (let m = 0; m < N_NODES; m++) { let p = kPow > 0 ? mpPow(wts, kPow - 1)[i][m] : NEG_INF; if (p !== NEG_INF && wts[m][j] !== NEG_INF) terms.push(mpFmt(p, 0) + '⊗' + wts[m][j]); }
    text('= ⊕_m (A^{⊗' + (kPow - 1) + '})_' + i + 'm ⊗ a_m' + j + ' = ' + (terms.length ? terms.join(' ⊕ ') : 'ε'), mx1, ty + 44, width - mx1 - 30);
  } else text('右の表のマスにマウスをのせると、その道がグラフに出る', mx1, ty + 30);
  fill(170); textSize(14);
  text('ふつうの行列の積の「Σ と ×」を「max と +」に替えただけ。k を増やすと、ループ（回り道）を回るほど重くなる道が勝つ', mx1, ty + 76, width - mx1 - 30);
  drawSelfTest(width - 170, height - 12);
}

function nodeAt(x, y) { for (let i = 0; i < N_NODES; i++) if (Math.hypot(x - pos[i].x, y - pos[i].y) < 24) return i; return -1; }
function labelAt(x, y) {
  for (let i = 0; i < N_NODES; i++) for (let j = 0; j < N_NODES; j++) {
    if (wts[i][j] === NEG_INF) continue;
    let p = i === j ? [pos[i].x, pos[i].y - 58] : null;
    if (!p) { let dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y, L = Math.hypot(dx, dy) || 1, b = wts[j][i] !== NEG_INF ? 10 : 0; p = [(pos[i].x + pos[j].x) / 2 - (dy / L) * b * 1.6, (pos[i].y + pos[j].y) / 2 + (dx / L) * b * 1.6]; }
    if (Math.hypot(x - p[0], y - p[1]) < 14) return [i, j];
  }
  return null;
}
function mousePressed() { dragN = nodeAt(mouseX, mouseY); moved = false; let l = labelAt(mouseX, mouseY); if (l && dragN < 0) selArc = l; }
function mouseDragged() { if (dragN >= 0) { pos[dragN].x = mouseX; pos[dragN].y = mouseY; moved = true; } }
function mouseReleased() {
  if (dragN >= 0 && !moved) {
    if (firstN < 0) firstN = dragN;
    else { wts[firstN][dragN] = wts[firstN][dragN] === NEG_INF ? 3 : NEG_INF; selArc = wts[firstN][dragN] === NEG_INF ? null : [firstN, dragN]; firstN = -1; recompute(); }
  }
  dragN = -1;
}
function keyPressed() {
  if (key === RIGHT_ARROW) kPow = Math.min(6, kPow + 1);
  if (key === LEFT_ARROW) kPow = Math.max(1, kPow - 1);
  if (selArc && (key === UP_ARROW || key === DOWN_ARROW)) { let [i, j] = selArc; wts[i][j] = clampv(wts[i][j] + (key === UP_ARROW ? 1 : -1), -9, 9); }
  if (key === 'r' || key === 'R') { seedRng(Math.floor(Math.random() * 1e6)); wts = mpMat(N_NODES, N_NODES); for (let i = 0; i < N_NODES; i++) for (let j = 0; j < N_NODES; j++) if (rnd() < 0.3) wts[i][j] = rndInt(1, 9); selArc = null; }
  recompute();
  return false;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(3);
  let okP = true, okA = true, okE = true, okS = true;
  for (let t = 0; t < 30; t++) {
    let n = 4 + (t % 2), A = mpMat(n, n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (rnd() < 0.45) A[i][j] = rndInt(-5, 9);
    for (let k = 1; k <= 4; k++) { let P = mpPow(A, k), b = bruteWalks(A, k); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (P[i][j] !== b[i][j].w) okP = false; }
    let B = A.map((r) => r.map((v) => (v === NEG_INF ? v : v - 2))), C = mpPow(A, 2);
    if (!mpVecEq(mpMatMul(mpMatMul(A, B), C).flat(), mpMatMul(A, mpMatMul(B, C)).flat())) okA = false;
    if (!mpVecEq(mpMatMul(mpEye(n), A).flat(), A.flat()) || !mpVecEq(mpMatMul(A, mpEye(n)).flat(), A.flat())) okE = false;
    if (!mpVecEq(mpPow(A, 5).flat(), mpMatMul(mpPow(A, 2), mpPow(A, 3)).flat()) || !noNaN(mpPow(A, 5))) okS = false;
  }
  check('(A^{⊗k})_ij = 総当たりの最大重み（ランダムな 30 グラフ、k = 1〜4、道がなければ ε）', okP);
  check('行列の積の結合法則 (A⊗B)⊗C = A⊗(B⊗C)', okA);
  check('単位行列 E（対角 0、他は ε）：E ⊗ A = A ⊗ E = A', okE);
  check('指数法則 A^{⊗5} = A^{⊗2} ⊗ A^{⊗3}、NaN なし', okS);
  check('はじめの図：A^{⊗3} = 総当たり', mpVecEq(mpPow(wts, 3).flat(), bruteWalks(wts, 3).flat().map((b) => b.w)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. k を 1, 2, 3 と増やして、ε のマスがどう埋まっていくか見よう。ずっと ε のマスはなぜ？
// 2. マスにマウスをのせ、表示された道の重みを自分で足して確かめよう
// 3. 自己ループ（同じノードを 2 回クリック）に大きい重みをつけると、k を増やしたとき何が起きる？
// 4. 辺の重みを全部負にすると、長い道ほど軽くなる。A^{⊗k} はどう変わる？
// 5. 04 では E ⊕ A ⊕ A² ⊕ … をまとめて「全部の長さの道」の最大を一度に求める

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
// ---- 矢印（ノードの半径 r の手前で止める）。bend で少し曲げる（往復の辺を分ける）
function arrowTo(x1, y1, x2, y2, r, bend) {
  let dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ox = -uy * (bend || 0), oy = ux * (bend || 0);
  let ax = x1 + ux * r + ox, ay = y1 + uy * r + oy, bx = x2 - ux * r + ox, by = y2 - uy * r + oy;
  line(ax, ay, bx, by);
  let hx = bx - ux * 12, hy = by - uy * 12;
  noStroke(); triangle(bx, by, hx - uy * 6, hy + ux * 6, hx + uy * 6, hy - ux * 6);
  return [(ax + bx) / 2 + ox * 0.6, (ay + by) / 2 + oy * 0.6];
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
