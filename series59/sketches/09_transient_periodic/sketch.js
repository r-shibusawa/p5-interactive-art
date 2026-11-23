// ============================================
// 09 過渡と周期性 ─ x(k+1) = A ⊗ x(k) から傾き λ を引いた x(k) − kλ を見ると、しばらく揺れてから「c 周期ごとのくり返し」に入る
// 強連結な A では必ず x(k + c) = x(k) + c·λ（k ≥ k0）。k0 = 過渡の長さ、c = 周期
//   周期 c は臨界グラフ（平均 λ の回路）の形で決まる：成分ごとの回路の長さの最大公約数、全体はその最小公倍数（= 巡回性）
//   初期値によって、見える周期は巡回性の約数になることがある。過渡の長さは初期値と「2 番目に遅い回路」との差で決まる
// 1〜4 例を選ぶ / 左の棒をドラッグ = 初期値 x(0) / V 初期値 = 固有ベクトル / Z 初期値 = 0 / R ランダムな強連結グラフ
// ============================================

const PRESETS = [                      // ★ 例：辺 [from, to, 重み]
  { name: '1：ランダム（巡回性 1）', n: 5, arcs: null },
  { name: '2：長さ 2 の臨界回路', n: 4, arcs: [[0, 1, 4], [1, 0, 4], [1, 2, 1], [2, 3, 2], [3, 0, 1]] },
  { name: '3：長さ 3 の臨界回路', n: 5, arcs: [[0, 1, 5], [1, 2, 5], [2, 0, 5], [2, 3, 1], [3, 4, 2], [4, 0, 1], [3, 3, 3]] },
  { name: '4：長い過渡（平均 10 と 9.5 の回路）', n: 3, arcs: [[0, 0, 10], [1, 2, 9], [2, 1, 10], [0, 1, 1], [2, 0, 1]], x0: [0, 20, 0] },
];
const K_MAX = 60;
let preset = 1, matA, x0, res, dragI = -1, seedR = 9;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); loadPreset(1); }
function presetMatrix(p) {
  if (!p.arcs) { seedRng(seedR); return randomIrreducible(p.n, 0.3, 1, 9); }
  let A = mpMat(p.n, p.n); for (let [j, i, w] of p.arcs) A[i][j] = w; return A;   // 辺 j → i は a_ij
}
function loadPreset(k) { preset = k; let p = PRESETS[k]; matA = presetMatrix(p); x0 = p.x0 ? p.x0.slice() : new Array(p.n).fill(0).map((_, i) => (i * 7) % 5); analyse(); }
// ★ 固有値・巡回性・べき乗法の (k0, c)
function analyse() {
  let lam = karp(matA), pp = powerPeriod(matA, x0, 400, 24), xs = [x0.slice()];
  for (let k = 1; k <= K_MAX; k++) xs.push(mpMatVec(matA, xs[k - 1]));
  res = { lam, pp, xs, cyc: cyclicity(matA, lam), ci: criticalInfo(matA, lam) };
}

function draw() {
  background(22, 22, 28);
  let n = matA.length, cols = [[255, 170, 70], [110, 190, 255], [150, 230, 160], [255, 220, 120], [220, 150, 255]];
  // ---- 初期値の棒
  let bx = 60, by = 140, bh = 260, val = (v) => by + bh - ((v + 10) / 40) * bh;
  noStroke(); fill(200); textSize(14); textAlign(LEFT, BASELINE); text('初期値 x(0)（ドラッグ）', bx - 20, by - 14);
  stroke(70); line(bx - 10, val(0), bx + n * 36, val(0));
  for (let i = 0; i < n; i++) {
    noStroke(); fill(...cols[i]); rect(bx + i * 36, Math.min(val(0), val(x0[i])), 24, Math.abs(val(x0[i]) - val(0)) + 1);
    fill(220); textAlign(CENTER, TOP); textSize(12); text(i + '\n' + mpFmt(x0[i]), bx + i * 36 + 12, by + bh + 6);
  }
  // ---- 臨界グラフ（小さく）
  let cx = 130, cy = by + bh + 150, R = 80;
  let P = (i) => [cx + R * Math.cos((TWO_PI * i) / n - HALF_PI), cy + R * Math.sin((TWO_PI * i) / n - HALF_PI)];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (matA[i][j] === NEG_INF) continue;
    let c = res.ci.arcs.some(([a, b]) => a === j && b === i);
    stroke(c ? color(255, 170, 70) : color(120, 130, 150)); fill(c ? color(255, 170, 70) : color(120, 130, 150)); strokeWeight(c ? 3 : 1);
    if (i === j) { noFill(); circle(P(i)[0], P(i)[1] - 20, 22); } else arrowTo(P(j)[0], P(j)[1], P(i)[0], P(i)[1], 13, matA[j][i] !== NEG_INF ? 6 : 0);
  }
  for (let i = 0; i < n; i++) { noStroke(); fill(...cols[i]); circle(P(i)[0], P(i)[1], 24); fill(20); textAlign(CENTER, CENTER); textSize(12); text(i, P(i)[0], P(i)[1]); }
  // ---- x(k) − kλ
  let xs = res.xs, lam = res.lam, ys = xs.map((x, k) => x.map((v) => v - k * lam)), lo = Math.min(...ys.flat()), hi = Math.max(...ys.flat());
  let g = { x: 340, y: 120, w: width - 390, h: height - 300, x0: 0, x1: K_MAX, y0: lo - 1, y1: hi + 1 };
  plotAxes(g, 'k', 'x_i(k) − k·λ', [0, 10, 20, 30, 40, 50, 60], [Math.round(lo), Math.round(hi)]);
  if (res.pp.k0 >= 0 && res.pp.k0 <= K_MAX) {
    noStroke(); fill(255, 255, 255, 18); rect(g.x, g.y, gX(g, res.pp.k0) - g.x, g.h);
    stroke(255, 220, 120); strokeWeight(1); line(gX(g, res.pp.k0), g.y, gX(g, res.pp.k0), g.y + g.h);
    for (let k = res.pp.k0; k <= K_MAX; k += res.pp.c) { stroke(255, 220, 120, 60); line(gX(g, k), g.y + g.h - 10, gX(g, k), g.y + g.h); }
  }
  for (let i = 0; i < n; i++) {
    stroke(...cols[i]); strokeWeight(2); polyline(ys.map((y, k) => [gX(g, k), gY(g, y[i])]));
    noStroke(); fill(...cols[i]); for (let k = 0; k <= K_MAX; k++) circle(gX(g, k), gY(g, ys[k][i]), 4);
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('過渡と周期性　' + PRESETS[preset].name + '　λ = ' + mpFmt(lam, 3), 40, 40);
  fill(170); textSize(15); text('1〜4 例　棒をドラッグ = 初期値　V 固有ベクトルから　Z 全部 0 から　R ランダムなグラフ', 40, 66);
  let y0 = g.y + g.h + 56;
  fill(255, 220, 120); textSize(18);
  text('過渡の長さ k0 = ' + res.pp.k0 + '　見えた周期 c = ' + res.pp.c + '　（臨界グラフの巡回性 = ' + res.cyc + '、c は巡回性の約数）', g.x, y0);
  fill(200); textSize(15);
  text('k ≥ k0 では x(k + c) = x(k) + c·λ：グラフが c 個ごとに同じ形をくり返す（薄い部分 = 過渡）。臨界の辺（オレンジ）：' + res.ci.arcs.map(([j, i]) => j + '→' + i).join('、'), g.x, y0 + 28, g.w);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { dragI = -1; for (let i = 0; i < matA.length; i++) if (mouseX > 60 + i * 36 - 4 && mouseX < 60 + i * 36 + 28 && mouseY > 120 && mouseY < 420) dragI = i; }
function mouseDragged() { if (dragI >= 0) { x0[dragI] = Math.round(clampv(((140 + 260 - mouseY) / 260) * 40 - 10, -10, 30)); analyse(); } }
function mouseReleased() { dragI = -1; }
function keyPressed() {
  for (let k = 1; k <= 4; k++) if (key === String(k)) loadPreset(k - 1);
  if (key === 'r' || key === 'R') { seedR++; loadPreset(0); }
  if (key === 'v' || key === 'V') { x0 = res.ci.vec.slice(); analyse(); }
  if (key === 'z' || key === 'Z') { x0 = x0.map(() => 0); analyse(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let cycs = PRESETS.slice(1).map((p) => { let A = presetMatrix(p); return { A, lam: karp(A), cyc: cyclicity(A, karp(A)), irr: isIrreducible(A) }; });
  check('例 2・3・4 の巡回性 = 2・3・1、λ = 4・5・10、どれも強連結', cycs.map((c) => c.cyc).join() === '2,3,1' && cycs.map((c) => c.lam).join() === '4,5,10' && cycs.every((c) => c.irr));
  check('例 2・3：初期値 (0, 1, 2, …) で見える周期 = 巡回性（2 と 3）。例 2 を全部 0 から始めると周期 1（2 の約数）', powerPeriod(cycs[0].A, [0, 1, 2, 3], 200, 12).c === 2 && powerPeriod(cycs[1].A, [0, 1, 2, 3, 4], 200, 12).c === 3 && powerPeriod(cycs[0].A, [0, 0, 0, 0], 200, 12).c === 1);
  check('例 4：初期値 (0, 20, 0) では過渡が長い（k0 ≥ 30）', powerPeriod(cycs[2].A, [0, 20, 0], 400, 12).k0 >= 30);
  seedRng(90);
  let okDiv = true, okEig = true, okHom = true, okMon = true;
  for (let t = 0; t < 40; t++) {
    let n = 3 + (t % 5), A = randomIrreducible(n, 0.3, 1, 9), lam = karp(A), cy = cyclicity(A, lam), x = Array.from({ length: n }, () => rndInt(-5, 10));
    let pp = powerPeriod(A, x, 500, 30);
    if (!(pp.c > 0 && cy % pp.c === 0 && Math.abs(pp.lam - lam) < 1e-9)) okDiv = false;
    let v = criticalInfo(A, lam).vec, pv = powerPeriod(A, v, 10, 4);
    if (!(pv.k0 === 0 && pv.c === 1)) okEig = false;
    let a = mpPow(A, 7), y1 = mpMatVec(a, x.map((u) => u + 3)), y2 = mpMatVec(a, x).map((u) => u + 3);
    if (!mpVecEq(y1, y2)) okHom = false;
    let z = x.map((u) => u + rndInt(0, 4)); if (!mpVecLeq(mpMatVec(a, x), mpMatVec(a, z))) okMon = false;
  }
  check('ランダムな強連結グラフ 40 個：見える周期 c は巡回性の約数、傾き = カープの λ', okDiv);
  check('固有ベクトルから始めると過渡 0、周期 1（はじめから定常ダイヤ）', okEig);
  check('同次性 A ⊗ (x + α) = A ⊗ x + α と単調性 x ≤ y ⇒ A ⊗ x ≤ A ⊗ y', okHom && okMon);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 と 3 を押して、x(k) − kλ が何個ごとにくり返すか数えよう。臨界回路の長さと同じ？
// 2. 4 で、ノード 1 の初期値を ドラッグで小さくすると、過渡はどう短くなる？
// 3. V（固有ベクトルから）を押すと、グラフはどうなる？ これが「定常ダイヤ」
// 4. 例 2 で Z（全部 0 から）を押すと周期 1 に見える。なぜ？（2 つのノードが同じ時刻から出発 → 巡回性 2 の約数）
// 5. 実際のダイヤでは周期 2 は「1 本おきに同じ時刻」。どんな路線で起きそう？

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
// ---- 固有値・臨界グラフ・周期（約束：a_ij = 「j が起きてから i が起きるまで」= 辺 j → i の重み、x(k+1) = A ⊗ x(k)）
// カープのアルゴリズム：D_k(v) = ちょうど k 本の辺で v に着く最大重み。λ = max_v min_k (D_n(v) − D_k(v)) / (n − k)
function karp(A) {
  let n = A.length, D = [new Array(n).fill(0)];
  for (let k = 1; k <= n; k++) D.push(mpMatVec(A, D[k - 1]));
  let lam = NEG_INF;
  for (let v = 0; v < n; v++) {
    if (D[n][v] === NEG_INF) continue;
    let m = Infinity;
    for (let k = 0; k < n; k++) if (D[k][v] !== NEG_INF) m = Math.min(m, (D[n][v] - D[k][v]) / (n - k));
    if (m < Infinity) lam = Math.max(lam, m);
  }
  return lam;
}
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
function mpShift(A, lam) { return A.map((r) => r.map((v) => (v === NEG_INF ? NEG_INF : v - lam))); }   // A − λ
// 臨界グラフ：平均 λ の回路にのる辺とノード。固有ベクトル v = (A − λ)* の臨界ノード c の列
function criticalInfo(A, lam) {
  let n = A.length, B = mpShift(A, lam), Bs = mpStar(B, 1e-7).star, tol = 1e-7, nodes = [], arcs = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (B[i][j] !== NEG_INF && Bs[j][i] !== NEG_INF && Math.abs(B[i][j] + Bs[j][i]) < tol) arcs.push([j, i]);
  for (let [j, i] of arcs) { if (!nodes.includes(j)) nodes.push(j); if (!nodes.includes(i)) nodes.push(i); }
  nodes.sort((a, b) => a - b);
  let vec = null;
  if (nodes.length) { let c = nodes[0]; vec = Bs.map((r) => r[c]); let mx = Math.max(...vec); vec = vec.map((v) => (v === NEG_INF ? NEG_INF : v - mx)); }
  return { nodes, arcs, vec, star: Bs };
}
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
// 巡回性：臨界グラフの強連結成分ごとに回路の長さの最大公約数、全体はその最小公倍数
function cyclicity(A, lam) {
  let ci = criticalInfo(A, lam), done = [], cyc = 1;
  for (let r of ci.nodes) {
    if (done.includes(r)) continue;
    let lev = {}; lev[r] = 0; let q = [r];
    while (q.length) { let v = q.shift(); for (let [j, i] of ci.arcs) if (j === v && lev[i] === undefined) { lev[i] = lev[v] + 1; q.push(i); } }
    let comp = ci.nodes.filter((u) => lev[u] !== undefined && reachesBack(ci.arcs, u, r));
    let g = 0; for (let [j, i] of ci.arcs) if (comp.includes(j) && comp.includes(i)) g = gcd(g, lev[j] + 1 - lev[i]);
    comp.forEach((u) => done.push(u));
    if (g > 0) cyc = (cyc * g) / gcd(cyc, g);
  }
  return cyc;
}
function reachesBack(arcs, u, r) { let seen = [u], q = [u]; while (q.length) { let v = q.shift(); if (v === r) return true; for (let [j, i] of arcs) if (j === v && !seen.includes(i)) { seen.push(i); q.push(i); } } return false; }
// べき乗法：x(k+1) = A ⊗ x(k) を回し、はじめて x(k0 + c) = c·λ ⊗ x(k0) になる (k0, c) を探す
function powerPeriod(A, x0, kmax, cmax) {
  let xs = [x0.slice()];
  for (let k = 1; k <= kmax; k++) {
    xs.push(mpMatVec(A, xs[k - 1]));
    for (let c = 1; c <= Math.min(k, cmax || 12); c++) {
      let a = xs[k], b = xs[k - c], d = null, ok = true;
      for (let i = 0; i < a.length && ok; i++) {
        if (a[i] === NEG_INF || b[i] === NEG_INF) { ok = a[i] === b[i]; continue; }
        let di = a[i] - b[i]; if (d === null) d = di; else if (Math.abs(di - d) > 1e-9) ok = false;
      }
      if (ok && d !== null) return { k0: k - c, c, lam: d / c, xs };
    }
  }
  return { k0: -1, c: 0, lam: NaN, xs };
}
// 強連結なランダムグラフ：ハミルトン閉路（全ノードを 1 周）を必ず入れる
function randomIrreducible(n, p, wmin, wmax) {
  let A = mpMat(n, n), perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let k = 0; k < n; k++) A[perm[(k + 1) % n]][perm[k]] = rndInt(wmin, wmax);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (A[i][j] === NEG_INF && rnd() < p) A[i][j] = rndInt(wmin, wmax);
  return A;
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
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
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
