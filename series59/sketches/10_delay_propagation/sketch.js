// ============================================
// 10 遅延の伝わり方 ─ 1 本の列車が d 分遅れると、乗り継ぎを守る列車にも遅れがうつる。どこまで広がり、何周期で消える？
// 時刻表（ダイヤ）：周期 T = λ + 余裕 s で、計画 x_plan(k) = v + k·T（v = 固有ベクトル、08）。列車は計画より早くは出ない
//   x(k+1) = A ⊗ x(k) ⊕ x_plan(k+1)。遅れ z(k) = x(k) − x_plan(k) ≥ 0 は 1 周期ごとに少なくとも s ずつ減る → 回復は ⌈d / s⌉ 周期以内
//   余裕 s = 0 だと、臨界回路にのった遅れはいつまでも消えない
// マスをクリック = その列車・周期に遅れを入れる / ← → 遅れ d / ↑↓ 余裕 s / 1・2 路線網 / R 遅れを消す
// ============================================

const NETS = [                         // ★ 路線網：a_ij = 列車 j が出てから、次の周期に列車 i が出られるまで（分）
  { name: '環状に乗り継ぐ 4 本', names: ['赤線', '青線', '緑線', '黄線'], A: [[52, 56, -Infinity, -Infinity], [-Infinity, 55, 57, -Infinity], [-Infinity, -Infinity, 50, 55], [56, -Infinity, -Infinity, 48]] },
  { name: 'ハブ駅で全部が乗り継ぐ 5 本', names: ['1 番線', '2 番線', '3 番線', '4 番線', '5 番線'], A: [[40, 38, -Infinity, -Infinity, 36], [37, 42, 39, -Infinity, -Infinity], [-Infinity, 40, 41, 38, -Infinity], [-Infinity, -Infinity, 36, 44, 40], [39, -Infinity, -Infinity, 41, 38]] },
];
const K_N = 26;                        // 計算する周期の数
let net = 0, slack = 3, delayD = 20, at = [1, 2], sim = null;   // ★ slack = 余裕 s（分）、delayD = 遅れ d、at = [列車, 周期]

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); run(); }
// ★ 計画ダイヤと実際の発車時刻（遅れを 1 つ入れる）
function propagate(A, s, d, who, kd, K) {
  let lam = karp(A), v = criticalInfo(A, lam).vec, T = lam + s, plan = [], x = [];
  for (let k = 0; k <= K; k++) plan.push(v.map((u) => u + k * T));
  for (let k = 0; k <= K; k++) {
    x.push(k === 0 ? plan[0].slice() : mpMatVec(A, x[k - 1]).map((u, i) => mpAdd(u, plan[k][i])));
    if (k === kd) x[k][who] += d;                    // この列車がこの周期に d 分遅れる
  }
  let z = x.map((r, k) => r.map((u, i) => Math.max(0, u - plan[k][i])));
  let last = -1; z.forEach((r, k) => { if (r.some((u) => u > 1e-9)) last = k; });
  return { lam, T, v, plan, x, z, recover: last < 0 ? 0 : last - kd + 1, last };
}
function run() { sim = propagate(NETS[net].A, slack, delayD, at[0], at[1], K_N); sim.ci = criticalInfo(NETS[net].A, sim.lam).nodes; }

function draw() {
  background(22, 22, 28);
  let N = NETS[net], n = N.A.length, z = sim.z, cw = (width - 220) / (K_N + 1), ch = 40, gx = 160, gy = 120;
  // ---- 遅れの表（行 = 列車、列 = 周期 k）
  for (let i = 0; i < n; i++) {
    noStroke(); fill(220); textSize(15); textAlign(RIGHT, CENTER); text(N.names[i] + (sim.ci && sim.ci.includes(i) ? ' ★' : ''), gx - 10, gy + i * ch + ch / 2);
    for (let k = 0; k <= K_N; k++) {
      let u = z[k][i], t = clampv(u / Math.max(1, delayD), 0, 1), src = i === at[0] && k === at[1];
      stroke(src ? color(255, 255, 255) : 45); strokeWeight(src ? 2 : 1);
      fill(u > 1e-9 ? color(60 + 195 * t, 60 + 110 * t, 70 - 30 * t) : 30); rect(gx + k * cw, gy + i * ch, cw, ch);
      if (u > 1e-9) { noStroke(); fill(t > 0.5 ? 20 : 230); textAlign(CENTER, CENTER); textSize(11); text(Math.round(u * 10) / 10, gx + (k + 0.5) * cw, gy + (i + 0.5) * ch); }
    }
  }
  noStroke(); fill(140); textSize(11); textAlign(CENTER, TOP);
  for (let k = 0; k <= K_N; k += 2) text('k=' + k, gx + (k + 0.5) * cw, gy + n * ch + 4);
  // ---- 遅れの合計と最大のグラフ
  let tot = z.map((r) => r.reduce((a, b) => a + b, 0)), mx = z.map((r) => Math.max(...r));
  let g = { x: gx, y: gy + n * ch + 70, w: (K_N + 1) * cw, h: height - (gy + n * ch + 70) - 150, x0: 0, x1: K_N, y0: 0, y1: Math.max(1, ...tot) * 1.1 };
  plotAxes(g, '周期 k', '遅れの合計（オレンジ）と最大（青）', [0, 5, 10, 15, 20, 25], [0, Math.round(g.y1)]);
  stroke(255, 170, 70); strokeWeight(2.5); polyline(tot.map((u, k) => [gX(g, k), gY(g, u)]));
  stroke(110, 190, 255); strokeWeight(2); polyline(mx.map((u, k) => [gX(g, k), gY(g, u)]));
  if (slack > 0) { stroke(255, 255, 255, 90); strokeWeight(1); drawingContext.setLineDash([4, 4]); polyline(mx.map((u, k) => [gX(g, k), gY(g, k < at[1] ? 0 : Math.max(0, delayD - (k - at[1]) * slack))])); drawingContext.setLineDash([]); }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('遅延の伝わり方　' + N.name + '　λ = ' + mpFmt(sim.lam, 2) + ' 分、周期 T = λ + s = ' + mpFmt(sim.T, 2) + ' 分', 40, 40);
  fill(170); textSize(15); text('マスをクリック = 遅れを入れる場所　← → 遅れ d = ' + delayD + ' 分　↑↓ 余裕 s = ' + slack + ' 分　1・2 路線網　R 遅れを消す', 40, 66);
  let y0 = height - 70, affected = z.flat().filter((u) => u > 1e-9).length;
  fill(255, 220, 120); textSize(17);
  text(sim.last >= K_N ? '回復しない！（余裕 s = 0 で臨界回路の列車に遅れ → ずっと続く）' : delayD === 0 ? '遅れなし：計画どおり' : '遅れは ' + sim.recover + ' 周期で消えた（上限 ⌈d / s⌉ = ' + (slack > 0 ? Math.ceil(delayD / slack) : '∞') + '）　遅れた発車 ' + affected + ' 回', 40, y0);
  fill(190); textSize(14);
  text('★ = 臨界回路の列車（ここに余裕がないと遅れが回り続ける）。点線 = 上限 d − (k − k_d)·s。余裕を増やすと速く回復するが、T が長くなる（本数が減る）', 40, y0 + 26, width - 80);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() {
  let n = NETS[net].A.length, cw = (width - 220) / (K_N + 1), i = Math.floor((mouseY - 120) / 40), k = Math.floor((mouseX - 160) / cw);
  if (i >= 0 && i < n && k >= 0 && k <= K_N) { at = [i, k]; run(); }
}
function keyPressed() {
  if (key === RIGHT_ARROW) delayD = Math.min(90, delayD + 5);
  if (key === LEFT_ARROW) delayD = Math.max(0, delayD - 5);
  if (key === UP_ARROW) slack = Math.min(15, slack + 1);
  if (key === DOWN_ARROW) slack = Math.max(0, slack - 1);
  if (key === '1' || key === '2') { net = +key - 1; at = [1, 2]; }
  if (key === 'r' || key === 'R') delayD = 0;
  run();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(10);
  let okPlan = true, okPos = true, okBound = true, okMono = true, okSlack = true, okIrr = NETS.every((N) => isIrreducible(N.A));
  for (let t = 0; t < 40; t++) {
    let n = 3 + (t % 4), A = randomIrreducible(n, 0.35, 20, 60), s = rndInt(1, 8), d = rndInt(5, 60), who = rndInt(0, n - 1);
    let p0 = propagate(A, s, 0, who, 1, 30);
    if (!p0.z.flat().every((u) => u === 0) || !noNaN(p0.x)) okPlan = false;
    let p = propagate(A, s, d, who, 1, 40);
    if (!p.z.flat().every((u) => u >= 0) || !noNaN(p.z)) okPos = false;
    if (p.recover > Math.ceil(d / s)) okBound = false;
    let mxz = p.z.map((r) => Math.max(...r)); for (let k = 2; k <= 40; k++) if (mxz[k] > Math.max(0, mxz[k - 1] - s) + 1e-9) okBound = false;
    let p2 = propagate(A, s, d + 10, who, 1, 40); if (!p2.z.every((r, k) => r.every((u, i) => u >= p.z[k][i] - 1e-9))) okMono = false;
    let p3 = propagate(A, s + 3, d, who, 1, 40); if (p3.recover > p.recover) okSlack = false;
  }
  check('2 つの路線網は強連結（既約）', okIrr);
  check('遅れがなければ実際の発車 = 計画ダイヤ（計画は A ⊗ x_plan(k) ≤ x_plan(k+1) を満たす）', okPlan);
  check('遅れ z(k) ≥ 0、NaN なし', okPos);
  check('最大の遅れは 1 周期ごとに s 以上減る → 回復は ⌈d/s⌉ 周期以内（ランダム 40 例）', okBound);
  check('遅れ d を増やすと、どの列車の遅れも増えるか同じ（単調）。余裕を増やすと回復は速いか同じ', okMono && okSlack);
  let A = NETS[0].A, lam = karp(A), c = criticalInfo(A, lam).nodes[0], q = propagate(A, 0, 15, c, 1, 60);
  check('余裕 s = 0、臨界の列車に 15 分の遅れ → 60 周期たっても最大の遅れは 15 分のまま', q.z.slice(1).every((r) => Math.abs(Math.max(...r) - 15) < 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で余裕 s を 0 → 1 → 5 と変えて、遅れが消えるまでの周期を比べよう。⌈d/s⌉ と比べると？
// 2. ★（臨界回路）の列車と、★ でない列車に同じ遅れを入れて比べよう。どちらが長引く？
// 3. 2 の路線網（ハブ駅）では、遅れはいくつの列車に広がる？
// 4. 余裕を大きくすると回復は速いが、1 時間あたりの本数（60 / T）は減る。ちょうどよい s は？
// 5. 実際の鉄道の時刻表づくり（オランダなど）でも、このマックスプラスの計算で余裕の置き場所を決めている

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
