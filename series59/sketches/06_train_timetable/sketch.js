// ============================================
// 06 列車ダイヤ ─ 発車時刻は「全部の条件がそろったら」= max、走る時間 = +。だから x(k) = M ⊗ x(k−1)
// 駅 S0 − S1 − S2 … を、路線 l の列車（1 編成）が S_l ⇔ S_{l+1} を往復する。S_{l+1} で隣の路線と乗り継ぎを守る
//   同じ周期 k の中の条件 A0、前の周期からの条件 A1 → x(k) = A0 ⊗ x(k) ⊕ A1 ⊗ x(k−1) → x(k) = A0* ⊗ A1 ⊗ x(k−1)
//   全体の周期 λ = M の固有値（カープのアルゴリズム）。乗り継ぎを守ると、路線ごとの往復時間より長くなることがある
// 2・3・4 路線の数 / ← → 路線を選ぶ / ↑↓ 走る時間 / T 乗り継ぎ時間 / スペース 列車を動かす / R 元にもどす
// ============================================

let nLines = 2, runT = [12, 15, 10, 14], sel = 0, transfer = 4;   // ★ 路線ごとの走る時間（分）と乗り継ぎ時間
const TURN = 3;                        // ★ 折り返しの時間（分）
const K_SHOW = 8;                      // 図に描く周期の数
let tt = null, playing = true, tNow = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); rebuild(); }
// ★ 条件を行列に。f_l = 2l（S_l を外向きに発車）、b_l = 2l + 1（S_{l+1} を内向きに発車）
function buildSystem(L, run, tr) {
  let n = 2 * L, A0 = mpMat(n, n), A1 = mpMat(n, n);
  for (let l = 0; l < L; l++) {
    A0[2 * l + 1][2 * l] = run[l] + TURN;                                // 着いて折り返したら戻る
    A1[2 * l][2 * l + 1] = run[l] + TURN;                                // 戻って折り返したら次の周期
    if (l + 1 < L) {
      A0[2 * (l + 1)][2 * l] = run[l] + tr;                              // 外向き：内側の列車が着いてから乗り継いで発車
      A1[2 * l + 1][2 * (l + 1) + 1] = run[l + 1] + tr;                  // 内向き：外側の列車（前の周期）が着いてから発車
    }
  }
  let M = mpMatMul(mpStar(A0).star, A1), bIdx = Array.from({ length: L }, (_, l) => 2 * l + 1);
  let My = bIdx.map((i) => bIdx.map((j) => M[i][j]));                     // トークンのある事象（内向き発車）だけの行列
  return { A0, A1, M, My, n };
}
function timetable(sys, K) {           // x(1) … x(K)。x(0) = 0（はじめに全列車が外側の駅で待っている）
  let xs = [new Array(sys.n).fill(0)];
  for (let k = 1; k <= K; k++) xs.push(mpMatVec(sys.M, xs[k - 1]));
  return xs;
}
function rebuild() {
  let sys = buildSystem(nLines, runT, transfer), lam = karp(sys.My), pp = powerPeriod(sys.My, new Array(nLines).fill(0), 200, 12);
  tt = { sys, lam, xs: timetable(sys, K_SHOW + 1), pp, ci: criticalInfo(sys.My, lam) };
}

function draw() {
  background(22, 22, 28);
  let L = nLines, xs = tt.xs, tMax = Math.max(...xs[K_SHOW]) + Math.max(...runT), g = { x: 110, y: 130, w: width - 160, h: height - 330 };
  let sx = (t) => g.x + (t / tMax) * g.w, sy = (s) => g.y + g.h - (s / L) * g.h;
  let cols = [[255, 170, 70], [110, 190, 255], [150, 230, 160], [220, 150, 255]];
  if (playing) tNow = (tNow + 0.25) % tMax;
  // ---- 駅の線
  stroke(60); strokeWeight(1);
  for (let s = 0; s <= L; s++) line(g.x, sy(s), g.x + g.w, sy(s));
  noStroke(); fill(200); textSize(15); textAlign(RIGHT, CENTER);
  for (let s = 0; s <= L; s++) text('駅 S' + s, g.x - 12, sy(s));
  fill(140); textSize(12); textAlign(CENTER, TOP);
  for (let t = 0; t <= tMax; t += 30) text(t + ' 分', sx(t), g.y + g.h + 8);
  // ---- ダイヤ（時間 − 距離図）
  for (let l = 0; l < L; l++) {
    stroke(...cols[l], l === sel ? 255 : 170); strokeWeight(l === sel ? 3 : 2); noFill();
    for (let k = 1; k <= K_SHOW; k++) {
      let f = xs[k][2 * l], b = xs[k][2 * l + 1], fn = xs[k + 1][2 * l];
      beginShape(); vertex(sx(f), sy(l)); vertex(sx(f + runT[l]), sy(l + 1)); vertex(sx(b), sy(l + 1)); vertex(sx(b + runT[l]), sy(l)); vertex(sx(Math.min(fn, tMax)), sy(l)); endShape();
    }
    // 動く列車
    for (let k = 1; k <= K_SHOW; k++) {
      let f = xs[k][2 * l], b = xs[k][2 * l + 1], s = null;
      if (tNow >= f && tNow < f + runT[l]) s = l + (tNow - f) / runT[l];
      else if (tNow >= f + runT[l] && tNow < b) s = l + 1;
      else if (tNow >= b && tNow < b + runT[l]) s = l + 1 - (tNow - b) / runT[l];
      if (s !== null) { noStroke(); fill(...cols[l]); circle(sx(tNow), sy(s), 14); }
    }
  }
  stroke(255, 255, 255, 90); line(sx(tNow), g.y, sx(tNow), g.y + g.h);
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('列車ダイヤ　路線 ' + L + ' 本、乗り継ぎ ' + transfer + ' 分、折り返し ' + TURN + ' 分　→　周期 λ = ' + mpFmt(tt.lam, 2) + ' 分（1 時間に ' + (60 / tt.lam).toFixed(2) + ' 本）', 40, 40);
  fill(170); textSize(15); text('2・3・4 路線の数　← → 路線を選ぶ（いま ' + (sel + 1) + '）　↑↓ 走る時間　T 乗り継ぎ時間　スペース 動かす / 止める　R 元にもどす', 40, 66);
  let y0 = g.y + g.h + 50;
  fill(220); textSize(16);
  text('路線ごとの往復 2(走る + 折り返し)：' + runT.slice(0, L).map((r, l) => '路線 ' + (l + 1) + ' = ' + 2 * (r + TURN)).join('、') + '　→ 乗り継ぎを守った全体の周期 λ = ' + mpFmt(tt.lam, 2), 40, y0);
  let cyc = allCycles(tt.sys.My).reduce((m, c) => (c.mean > m.mean ? c : m), { mean: NEG_INF, nodes: [] });
  fill(255, 220, 120);
  text('いちばん遅い回路（臨界回路）：' + cyc.nodes.map((v) => '路線 ' + (v + 1)).join(' → ') + (cyc.nodes.length > 1 ? '（乗り継ぎでつながった ' + cyc.nodes.length + ' 本が足を引っぱる）' : '（この路線の往復がネック）'), 40, y0 + 26);
  fill(190); textSize(15);
  text('過渡：x(k) は ' + tt.pp.k0 + ' 周期目から ' + tt.pp.c + ' 周期ごとに λ·' + tt.pp.c + ' 分ずつ進むくり返しに入る（べき乗法）。M（内向き発車だけ）= ' + JSON.stringify(tt.sys.My.map((r) => r.map((v) => mpFmt(v)))).replace(/"/g, ''), 40, y0 + 52, width - 80);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  for (let k = 2; k <= 4; k++) if (key === String(k)) { nLines = k; sel = Math.min(sel, k - 1); }
  if (key === LEFT_ARROW) sel = (sel + nLines - 1) % nLines;
  if (key === RIGHT_ARROW) sel = (sel + 1) % nLines;
  if (key === UP_ARROW) runT[sel] = Math.min(30, runT[sel] + 1);
  if (key === DOWN_ARROW) runT[sel] = Math.max(4, runT[sel] - 1);
  if (key === 't' || key === 'T') transfer = (transfer + 2) % 14;
  if (key === ' ') playing = !playing;
  if (key === 'r' || key === 'R') { runT = [12, 15, 10, 14]; transfer = 4; nLines = 2; sel = 0; }
  rebuild();
  return false;
}

// ---- 自己テスト
function directTimetable(L, run, tr, K) {   // 答え合わせ：行列を使わず、条件を 1 つずつ max でたどる
  let F = [], B = [];
  for (let k = 0; k <= K; k++) {
    F.push([]); B.push([]);
    for (let l = 0; l < L; l++) F[k][l] = k === 0 ? 0 : B[k - 1][l] + run[l] + TURN;
    for (let l = 1; l < L; l++) if (k > 0) F[k][l] = Math.max(F[k][l], F[k][l - 1] + run[l - 1] + tr);
    for (let l = L - 1; l >= 0; l--) {
      B[k][l] = k === 0 ? 0 : F[k][l] + run[l] + TURN;
      if (k > 0 && l + 1 < L) B[k][l] = Math.max(B[k][l], B[k - 1][l + 1] + run[l + 1] + tr);
    }
  }
  return { F, B };
}
function selfTest() {
  selfTestResults = [];
  seedRng(6);
  let okIrr = true, okK = true, okNil = true, okD = true, okP = true, okN = true;
  for (let t = 0; t < 24; t++) {
    let L = 2 + (t % 3), run = [0, 1, 2, 3].map(() => rndInt(5, 25)), tr = rndInt(0, 12), sys = buildSystem(L, run, tr);
    if (!isIrreducible(sys.My)) okIrr = false;
    let lam = karp(sys.My); if (Math.abs(lam - bruteMaxMean(sys.My)) > 1e-9) okK = false;
    if (mpStar(sys.A0).positive || mpPow(sys.A0, sys.n).flat().some((v) => v !== NEG_INF)) okNil = false;
    let xs = timetable(sys, 30), d = directTimetable(L, run, tr, 30);
    for (let k = 1; k <= 30; k++) for (let l = 0; l < L; l++) if (xs[k][2 * l] !== d.F[k][l] || xs[k][2 * l + 1] !== d.B[k][l]) okD = false;
    let pp = powerPeriod(sys.My, new Array(L).fill(0), 300, 12);
    if (!(pp.c > 0 && Math.abs(pp.lam - lam) < 1e-9)) okP = false;
    if (!noNaN(xs)) okN = false;
  }
  check('M（内向き発車どうし）は強連結（既約）：2〜4 路線のランダムな 24 例', okIrr);
  check('カープの λ = 全部の回路の平均の最大（総当たり）', okK);
  check('同じ周期の条件 A0 には回路がない（A0^{⊗n} = ε 行列、A0* が有限）', okNil);
  check('行列の漸化式 x(k) = A0* ⊗ A1 ⊗ x(k−1) = 条件を 1 つずつたどった時刻表（30 周期）', okD);
  check('べき乗法：やがて x(k + c) = x(k) + c·λ（傾き = カープの λ）', okP);
  let s0 = buildSystem(2, [12, 15], 4);
  check('はじめの例：λ = 36（路線 2 の往復 2·(15 + 3)）、乗り継ぎ 8 分なら λ = 12 + 15 + 3 + 8 = 38', karp(s0.My) === 36 && karp(buildSystem(2, [12, 15], 8).My) === 38 && okN);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. T で乗り継ぎ時間を長くしていくと、どこで λ が路線ごとの往復より長くなる？ 臨界回路の表示も見よう
// 2. 路線 1 の走る時間を ↑ で長くすると、路線 2 のダイヤ（青）はどう変わる？（待ち = 水平の線）
// 3. 4 路線にして、まん中の路線だけ遅くすると？ 遅れはどこまで広がる？（10 で詳しく）
// 4. λ が決まると「1 時間に何本」が決まる。60 / λ を計算してみよう
// 5. TURN（折り返し時間）を 0 にすると、λ はいくつ減る？

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
