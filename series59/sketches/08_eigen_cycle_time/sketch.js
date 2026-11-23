// ============================================
// 08 固有値とサイクル時間 ─ A ⊗ v = λ ⊗ v。λ = 「いちばん遅い回路の 1 本あたりの平均」（最大平均回路）
// a_ij = 事象 j が起きてから i が起きるまでの時間（辺 j → i）。x(k+1) = A ⊗ x(k) は、やがて 1 周期に λ ずつ進む
//   λ はカープのアルゴリズム（D_k = ちょうど k 本の道の最大）で、全部の回路を調べなくても計算できる
//   臨界グラフ（オレンジ）= 平均 λ の回路の辺。固有ベクトル v = (A − λ)* の臨界ノードの列 → 「定常ダイヤ」
//   グラフは必ず強連結（ハミルトン閉路を入れてある）。強連結でないと λ が場所ごとにちがうことがある
// R 新しいグラフ / 4〜7 ノードの数 / ノードをドラッグ / 辺の数字をクリックして ↑↓ 重み / スペース x(k) を 1 つずつ
// ============================================

let nN = 5, matA = null, pos = [], info = null, selArc = null, dragN = -1, kShow = 30, seedG = 8;   // ★ nN = ノードの数

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); newGraph(); }
function newGraph() {
  seedRng(seedG); matA = randomIrreducible(nN, 0.25, 1, 9);
  pos = Array.from({ length: nN }, (_, i) => ({ x: width * 0.22 + 180 * Math.cos((TWO_PI * i) / nN - HALF_PI), y: height * 0.47 + 180 * Math.sin((TWO_PI * i) / nN - HALF_PI) }));
  analyse();
}
// ★ 固有値・臨界グラフ・固有ベクトル・x(k) をまとめて計算
function analyse() {
  let lam = karp(matA), ci = criticalInfo(matA, lam), xs = [new Array(nN).fill(0)];
  for (let k = 1; k <= 40; k++) xs.push(mpMatVec(matA, xs[k - 1]));
  info = { lam, ci, xs, Av: mpMatVec(matA, ci.vec), brute: bruteMaxMean(matA), irr: isIrreducible(matA) };
}

function draw() {
  background(22, 22, 28);
  let lam = info.lam, crit = (j, i) => info.ci.arcs.some(([a, b]) => a === j && b === i);
  // ---- グラフ（辺 j → i の重み a_ij）
  for (let i = 0; i < nN; i++) for (let j = 0; j < nN; j++) {
    if (matA[i][j] === NEG_INF) continue;
    let c = crit(j, i), s = selArc && selArc[0] === i && selArc[1] === j, lp;
    stroke(c ? color(255, 170, 70) : color(140, 160, 190, 170)); fill(c ? color(255, 170, 70) : color(140, 160, 190)); strokeWeight(c ? 4 : 1.5);
    if (i === j) { noFill(); circle(pos[i].x, pos[i].y - 34, 32); lp = [pos[i].x, pos[i].y - 58]; }
    else lp = arrowTo(pos[j].x, pos[j].y, pos[i].x, pos[i].y, 24, matA[j][i] !== NEG_INF ? 9 : 0);
    noStroke(); fill(s ? color(255, 220, 120) : 30); circle(lp[0], lp[1], 24); fill(s ? 20 : 235); textSize(13); textAlign(CENTER, CENTER); text(matA[i][j], lp[0], lp[1]);
  }
  for (let i = 0; i < nN; i++) {
    let cn = info.ci.nodes.includes(i);
    stroke(cn ? color(255, 170, 70) : 200); strokeWeight(cn ? 4 : 1.5); fill(60, 90, 140); circle(pos[i].x, pos[i].y, 44);
    noStroke(); fill(255); textSize(17); textAlign(CENTER, CENTER); text(i, pos[i].x, pos[i].y);
    fill(150, 230, 160); textSize(13); text('v = ' + mpFmt(info.ci.vec[i], 2), pos[i].x, pos[i].y + 36);
  }
  // ---- x(k) のグラフ
  let xs = info.xs, cols = [[255, 170, 70], [110, 190, 255], [150, 230, 160], [255, 220, 120], [220, 150, 255], [255, 130, 150], [180, 180, 180]];
  let gx = width * 0.5, gw = width * 0.46;
  let g1 = { x: gx, y: 120, w: gw, h: (height - 330) / 2, x0: 0, x1: 40, y0: 0, y1: Math.max(1, Math.max(...xs[40])) };
  plotAxes(g1, 'k', 'x_i(k)（破線 = 傾き λ の直線 kλ）', [0, 10, 20, 30, 40], [0, Math.round(g1.y1)]);
  for (let i = 0; i < nN; i++) { stroke(...cols[i]); strokeWeight(2); polyline(xs.slice(0, kShow + 1).map((x, k) => [gX(g1, k), gY(g1, x[i])])); }
  stroke(255, 255, 255, 120); strokeWeight(1); drawingContext.setLineDash([5, 5]); line(gX(g1, 0), gY(g1, 0), gX(g1, 40), gY(g1, 40 * lam)); drawingContext.setLineDash([]);
  let g2 = { x: gx, y: g1.y + g1.h + 70, w: gw, h: g1.h, x0: 0, x1: 40, y0: lam - 3, y1: lam + 3 };
  plotAxes(g2, 'k', 'x_i(k) / k → λ', [0, 10, 20, 30, 40], [lam - 3, lam, lam + 3].map((v) => +v.toFixed(2)));
  stroke(255, 220, 120); line(g2.x, gY(g2, lam), g2.x + g2.w, gY(g2, lam));
  for (let i = 0; i < nN; i++) { stroke(...cols[i]); strokeWeight(2); polyline(xs.slice(1, kShow + 1).map((x, k) => [gX(g2, k + 1), gY(g2, x[i] / (k + 1))])); }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('固有値とサイクル時間　λ = ' + mpFmt(lam, 3) + '（カープ）　総当たりの最大平均回路 = ' + mpFmt(info.brute, 3) + (info.irr ? '　強連結 ✓' : '　強連結でない！'), 40, 40);
  fill(170); textSize(15); text('R 新しいグラフ　4〜7 ノードの数　ドラッグ ノード　辺の数字をクリックして ↑↓ 重み　スペース k を 1 つずつ（いま k = ' + kShow + '）', 40, 66);
  let y0 = height - 120;
  fill(150, 230, 160); textSize(16);
  text('A ⊗ v = (' + info.Av.map((v) => mpFmt(v, 2)).join(', ') + ')　λ ⊗ v = (' + info.ci.vec.map((v) => mpFmt(mpMul(v, lam), 2)).join(', ') + ')' + (mpVecEq(info.Av, info.ci.vec.map((v) => v + lam), 1e-7) ? '　✓ 一致' : ''), 40, y0);
  fill(255, 200, 120);
  text('臨界グラフ（オレンジ）の辺：' + info.ci.arcs.map(([j, i]) => j + '→' + i).join('、') + '　= 平均 λ の回路にのる辺。ここの重みを 1 増やすと λ が増える', 40, y0 + 26, width - 80);
  fill(170); textSize(14);
  text('x(k) を v から始めると、はじめから全部が同じ傾き λ で進む（定常ダイヤ）。0 から始めると、しばらくずれてから傾き λ にそろう（09）', 40, y0 + 70);
  drawSelfTest(width - 170, height - 12);
}

function labelAt(x, y) {
  for (let i = 0; i < nN; i++) for (let j = 0; j < nN; j++) {
    if (matA[i][j] === NEG_INF) continue;
    let p = i === j ? [pos[i].x, pos[i].y - 58] : null;
    if (!p) { let dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y, L = Math.hypot(dx, dy) || 1, b = matA[j][i] !== NEG_INF ? 9 : 0; p = [(pos[i].x + pos[j].x) / 2 - (dy / L) * b * 1.6, (pos[i].y + pos[j].y) / 2 + (dx / L) * b * 1.6]; }
    if (Math.hypot(x - p[0], y - p[1]) < 13) return [i, j];
  }
  return null;
}
function mousePressed() { let l = labelAt(mouseX, mouseY); if (l) { selArc = l; return; } dragN = -1; for (let i = 0; i < nN; i++) if (Math.hypot(mouseX - pos[i].x, mouseY - pos[i].y) < 22) dragN = i; }
function mouseDragged() { if (dragN >= 0) { pos[dragN].x = mouseX; pos[dragN].y = mouseY; } }
function mouseReleased() { dragN = -1; }
function keyPressed() {
  if (key === 'r' || key === 'R') { seedG++; selArc = null; newGraph(); }
  for (let k = 4; k <= 7; k++) if (key === String(k)) { nN = k; selArc = null; newGraph(); }
  if (selArc && (key === UP_ARROW || key === DOWN_ARROW)) { let [i, j] = selArc; matA[i][j] = clampv(matA[i][j] + (key === UP_ARROW ? 1 : -1), 0, 15); analyse(); }
  if (key === ' ') kShow = kShow >= 40 ? 1 : kShow + 1;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(80);
  let okK = true, okV = true, okC = true, okP = true, okL = true;
  for (let t = 0; t < 40; t++) {
    let n = 3 + (t % 5), A = randomIrreducible(n, 0.3, 1, 9), lam = karp(A), ci = criticalInfo(A, lam), cyc = allCycles(A);
    if (!isIrreducible(A) || Math.abs(lam - bruteMaxMean(A)) > 1e-9) okK = false;
    if (!ci.vec.every(isFinite) || !mpVecEq(mpMatVec(A, ci.vec), ci.vec.map((v) => v + lam), 1e-7)) okV = false;
    let onMax = []; cyc.filter((c) => Math.abs(c.mean - lam) < 1e-9).forEach((c) => c.nodes.forEach((v, q) => onMax.push(v + '>' + c.nodes[(q + 1) % c.nodes.length])));
    let critS = ci.arcs.map(([j, i]) => j + '>' + i);
    if (!(critS.every((s) => onMax.includes(s)) && onMax.every((s) => critS.includes(s)))) okC = false;
    let pp = powerPeriod(A, new Array(n).fill(0), 400, 24); if (!(pp.c > 0 && Math.abs(pp.lam - lam) < 1e-9)) okP = false;
    let xs = [new Array(n).fill(0)]; for (let k = 1; k <= 400; k++) xs.push(mpMatVec(A, xs[k - 1]));
    if (!xs[400].every((v) => Math.abs(v / 400 - lam) < 0.1)) okL = false;
  }
  check('カープの λ = 全部の単純回路の平均の最大（ランダムな強連結グラフ 40 個）', okK);
  check('固有ベクトル v（(A − λ)* の臨界の列）は有限で A ⊗ v = λ ⊗ v', okV);
  check('臨界グラフの辺 = 平均 λ の回路にのる辺（ぴったり同じ集合）', okC);
  check('べき乗法：x(k + c) = x(k) + c·λ になる（傾き = λ）', okP);
  check('x(400)/400 が λ の ±0.1 以内', okL);
  let Rd = [[2, NEG_INF], [NEG_INF, 5]];
  check('強連結でない例（2 つの離れた自己ループ）は「既約でない」と判定、λ = 5 でも x₁(k)/k → 2', !isIrreducible(Rd) && karp(Rd) === 5 && mpPow(Rd, 10)[0][0] === 20);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. オレンジ（臨界）の辺の重みを ↑ で 1 増やすと λ はどう変わる？ オレンジでない辺なら？
// 2. R で何回かグラフを変え、λ がどの回路で決まるか予想してから確かめよう
// 3. 固有ベクトル v の差 v_i − v_j は「定常ダイヤでの i と j の時刻の差」。グラフで確かめよう
// 4. 下のグラフ x_i(k)/k は、どれくらいの k で λ にそろう？ 7 ノードでは？
// 5. 06・07 の λ も、このカープのアルゴリズムで計算している（06）

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
