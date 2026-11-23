// ============================================
// 04 推移的閉包 A* ─ A* = E ⊕ A ⊕ A² ⊕ … ⊕ A^{n−1} の (i, j) = 「i から j へ、何本の辺でもよい道」の最大重み
// 家を建てる作業（シリーズ 30 の 05 PERT と同じデータ）。a_ij = d_i（作業 i が始まって d_i 日後に j が始められる）
//   最早開始 ES_j = max_i (A*)_ij（どこから始めても 0 日目以降）、工期 = max_j (ES_j + d_j)。A* 1 つで全部の答え
//   「I は B の開始から W 日以内に始める」という締め切りは、I → B の重み −W の辺。きつすぎると正の回路 = 無限にお得な回り道 → A* は発散（解なし）
// クリック 作業を選ぶ / ↑↓ 日数 / D 締め切りの辺 ON・OFF / ← → W / R 元にもどす
// ============================================

let acts = [                           // ★ 作業：名前、日数、前の作業（シリーズ 30 の 05 と同じ）
  { id: 'A', name: '基礎', d: 4, pre: [] }, { id: 'B', name: '骨組み', d: 6, pre: ['A'] }, { id: 'C', name: '屋根', d: 4, pre: ['B'] },
  { id: 'D', name: '電気配線', d: 3, pre: ['B'] }, { id: 'E', name: '水道配管', d: 5, pre: ['B'] }, { id: 'F', name: '内装', d: 6, pre: ['D', 'E'] },
  { id: 'G', name: '外壁', d: 5, pre: ['C'] }, { id: 'H', name: '庭', d: 3, pre: ['A'] }, { id: 'I', name: '検査・引き渡し', d: 2, pre: ['F', 'G', 'H'] },
];
const D0 = acts.map((a) => a.d);
let useDeadline = false, deadlineW = 20, sel = 4, pos = [], res = null;   // ★ deadlineW = 締め切り W（日）

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); layout(); recompute(); }
// ★ 行列 A：a_ij = d_i（i が j の前の作業）。締め切りの辺 I → B は −W
function buildA(list, dl, W) {
  let n = list.length, A = mpMat(n, n), idx = (id) => list.findIndex((a) => a.id === id);
  list.forEach((a, j) => a.pre.forEach((p) => (A[idx(p)][j] = list[idx(p)].d)));
  if (dl) A[idx('I')][idx('B')] = -W;
  return A;
}
// ★ A* から ES・工期・余裕を計算
function schedule(list, A) {
  let st = mpStar(A), n = list.length;
  if (st.positive) return { positive: true, A, star: st.star };
  let ES = list.map((_, j) => Math.max(...st.star.map((r) => r[j])));
  let T = Math.max(...ES.map((e, j) => e + list[j].d));
  let LS = list.map((_, i) => T - Math.max(...list.map((b, j) => mpMul(st.star[i][j], b.d))));
  return { positive: false, A, star: st.star, ES, T, LS };
}
function recompute() { res = schedule(acts, buildA(acts, useDeadline, deadlineW)); }
function layout() {
  let lv = []; acts.forEach((a, i) => (lv[i] = a.pre.length ? Math.max(...a.pre.map((p) => lv[acts.findIndex((b) => b.id === p)] + 1)) : 0));
  let cnt = {}; pos = acts.map((a, i) => { cnt[lv[i]] = (cnt[lv[i]] || 0) + 1; return { x: 70 + lv[i] * 100, y: 200 + (cnt[lv[i]] - 1) * 90 }; });
}

function draw() {
  background(22, 22, 28);
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('推移的閉包 A* と PERT' + (useDeadline ? '　締め切り：I は B の開始から ' + deadlineW + ' 日以内' : ''), 40, 40);
  fill(170); textSize(15); text('クリック 作業を選ぶ　↑↓ 日数　D 締め切りの辺 ' + (useDeadline ? 'ON' : 'OFF') + '　← → W　R 元にもどす', 40, 66);
  // ---- 作業のグラフ
  let A = res.A, crit = (i) => !res.positive && Math.abs(res.LS[i] - res.ES[i]) < 1e-9;
  for (let i = 0; i < acts.length; i++) for (let j = 0; j < acts.length; j++) {
    if (A[i][j] === NEG_INF) continue;
    let neg = A[i][j] < 0, hot = crit(i) && crit(j) && !neg;
    stroke(neg ? color(220, 150, 255) : hot ? color(255, 170, 70) : 140); fill(neg ? color(220, 150, 255) : hot ? color(255, 170, 70) : 140); strokeWeight(hot ? 3 : 1.5);
    let lp = arrowTo(pos[i].x, pos[i].y, pos[j].x, pos[j].y, 26, neg ? 60 : 0);
    noStroke(); fill(neg ? color(220, 150, 255) : 200); textSize(13); textAlign(CENTER, CENTER); text(A[i][j], lp[0], lp[1] - 10);
  }
  acts.forEach((a, i) => {
    stroke(i === sel ? color(255, 220, 120) : 0); strokeWeight(i === sel ? 3 : 1);
    fill(crit(i) ? color(255, 170, 70) : color(60, 90, 140)); circle(pos[i].x, pos[i].y, 50);
    noStroke(); fill(crit(i) ? 20 : 255); textAlign(CENTER, CENTER); textSize(17); text(a.id, pos[i].x, pos[i].y - 6); textSize(11); text(a.d + ' 日', pos[i].x, pos[i].y + 12);
  });
  // ---- A* の表
  let cs = 30, mx = 40, my = 520, n = acts.length;
  fill(220); textSize(15); textAlign(LEFT, BASELINE); text(res.positive ? 'A* は発散（正の回路）' : 'A*（i → j の最長の道。対角は e = 0）', mx, my - 10);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let v = res.positive ? null : res.star[i][j];
    stroke(60); fill(v === null ? color(80, 30, 40) : v === NEG_INF ? 28 : 42); rect(mx + j * cs + 16, my + i * cs * 0.62, cs, cs * 0.62);
    noStroke(); fill(v === NEG_INF ? 100 : 230); textSize(10); textAlign(CENTER, CENTER); text(v === null ? '∞' : mpFmt(v, 0), mx + (j + 0.5) * cs + 16, my + (i + 0.31) * cs * 0.62);
  }
  fill(150); textSize(10); for (let i = 0; i < n; i++) { text(acts[i].id, mx + 6, my + (i + 0.31) * cs * 0.62); text(acts[i].id, mx + (i + 0.5) * cs + 16, my + n * cs * 0.62 + 8); }
  // ---- ガントチャート
  let gx = width * 0.5, gw = width * 0.46, gy = 110, rh = 38;
  if (res.positive) {
    let cyc = allCycles(A).filter((c) => c.w > 0).reduce((m, c) => (!m || c.w > m.w ? c : m), null);   // allCycles は a_ij を j → i とたどるので、i → j の向きに直す
    if (cyc) cyc = { w: cyc.w, nodes: [cyc.nodes[0]].concat(cyc.nodes.slice(1).reverse()) };
    fill(255, 120, 110); textSize(22); textAlign(LEFT, BASELINE);
    text('正の回路があるので A* は発散 → この締め切りは守れない', gx, gy + 30, gw);
    fill(230); textSize(17);
    if (cyc) text('回路 ' + cyc.nodes.map((v) => acts[v].id).join(' → ') + ' → ' + acts[cyc.nodes[0]].id + ' の重み = +' + cyc.w + '（回るたびに開始が ' + cyc.w + ' 日ずつ遅れる）', gx, gy + 70, gw);
    text('B から I までの最長の道（' + longestBI() + ' 日）> W = ' + deadlineW + ' 日。W を大きくするか、作業を短くする', gx, gy + 130, gw);
  } else {
    let T = res.T, sx = (t) => gx + (t / Math.max(T, 1)) * gw;
    acts.forEach((a, i) => {
      let y = gy + i * rh;
      noStroke(); fill(40); rect(gx, y, gw, rh - 8);
      fill(crit(i) ? color(255, 170, 70) : color(110, 170, 255)); rect(sx(res.ES[i]), y, sx(res.ES[i] + a.d) - sx(res.ES[i]), rh - 8);
      if (!crit(i)) { fill(110, 170, 255, 60); rect(sx(res.ES[i] + a.d), y, sx(res.LS[i] + a.d) - sx(res.ES[i] + a.d), rh - 8); }
      fill(230); textSize(13); textAlign(RIGHT, CENTER); text(a.id + ' ' + a.name, gx - 8, y + (rh - 8) / 2);
      textAlign(LEFT, CENTER); fill(20); text('ES ' + res.ES[i], sx(res.ES[i]) + 4, y + (rh - 8) / 2);
    });
    fill(240); textSize(20); textAlign(LEFT, BASELINE);
    text('工期 = ' + T + ' 日', gx, gy + acts.length * rh + 30);
    fill(190); textSize(15); text('オレンジ = 余裕 0（クリティカルパス）、薄い青 = 余裕', gx + 130, gy + acts.length * rh + 30);
    fill(190); textSize(15);
    text('ES_j = max_i (A*)_ij、LS_i = 工期 − max_j ((A*)_ij + d_j)。シリーズ 30 の前向き・後ろ向き計算と同じ答え', gx, gy + acts.length * rh + 44, gw);
    if (useDeadline) text('締め切り：ES_I − ES_B = ' + (res.ES[8] - res.ES[1]) + ' ≤ W = ' + deadlineW + '（守れている）', gx, gy + acts.length * rh + 100);
  }
  drawSelfTest(width - 170, height - 12);
}
function longestBI() { let A = buildA(acts, false, 0), st = mpStar(A).star; return st[1][8]; }

function mousePressed() { for (let i = 0; i < acts.length; i++) if (Math.hypot(mouseX - pos[i].x, mouseY - pos[i].y) < 26) sel = i; }
function keyPressed() {
  if (key === UP_ARROW) acts[sel].d = Math.min(15, acts[sel].d + 1);
  if (key === DOWN_ARROW) acts[sel].d = Math.max(1, acts[sel].d - 1);
  if (key === 'd' || key === 'D') useDeadline = !useDeadline;
  if (key === RIGHT_ARROW) deadlineW = Math.min(40, deadlineW + 1);
  if (key === LEFT_ARROW) deadlineW = Math.max(0, deadlineW - 1);
  if (key === 'r' || key === 'R') { acts.forEach((a, i) => (a.d = D0[i])); useDeadline = false; deadlineW = 20; }
  recompute();
  return false;
}

// ---- 自己テスト
function floydLongest(A) {                       // 答え合わせ用：フロイド-ワーシャル法（max 版）
  let n = A.length, D = A.map((r, i) => r.map((v, j) => (i === j ? Math.max(0, v) : v)));
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] !== NEG_INF && D[k][j] !== NEG_INF && D[i][k] + D[k][j] > D[i][j]) D[i][j] = D[i][k] + D[k][j];
  return D;
}
function cpmForward(list) {                       // シリーズ 30 と同じ前向き計算（作業は前の作業が先に並ぶ）
  let ES = [];
  list.forEach((a, j) => (ES[j] = Math.max(0, ...a.pre.map((p) => { let i = list.findIndex((b) => b.id === p); return ES[i] + list[i].d; }))));
  return ES;
}
function selfTest() {
  selfTestResults = [];
  seedRng(4);
  let okF = true, okD = true, okX = true;
  for (let t = 0; t < 40; t++) {
    let n = 4 + (t % 4), A = mpMat(n, n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && rnd() < 0.45) A[i][j] = t < 20 ? (i < j ? rndInt(1, 9) : NEG_INF) : rndInt(-9, 4);
    let st = mpStar(A), hasPos = bruteMaxMean(A) > 0;
    if (st.positive !== hasPos) okD = false;
    if (!st.positive) {
      if (!mpVecEq(st.star.flat(), floydLongest(A).flat())) okF = false;
      if (!mpVecEq(st.star.flat(), mpMatAdd(mpEye(n), mpMatMul(A, st.star)).flat())) okX = false;
    }
  }
  check('A* = フロイド-ワーシャル法の最長路（正の回路のない 40 グラフのうち該当分）', okF);
  check('正の回路の検出 = 総当たりで回路の重みが正のものがある', okD);
  check('A* = E ⊕ A ⊗ A*（A* は方程式 X = E ⊕ A ⊗ X の解）', okX);
  let r0 = schedule(acts, buildA(acts, false, 0));
  check('PERT：工期 23 日、ES がシリーズ 30 の前向き計算と一致', r0.T === 23 && r0.ES.every((e, j) => e === cpmForward(acts)[j]));
  let r1 = schedule(acts, buildA(acts, true, 20)), r2 = schedule(acts, buildA(acts, true, 16));
  check('締め切り W = 20 は守れる（ES_I − ES_B ≤ 20）、W = 16 < 17（B→I の最長）は正の回路で発散', !r1.positive && r1.ES[8] - r1.ES[1] <= 20 && r2.positive && longestBI() === 17);
  check('余裕 LS − ES ≥ 0、クリティカルパス A→B→E→F→I', r0.LS.every((l, i) => l - r0.ES[i] >= 0) && ['A', 'B', 'E', 'F', 'I'].every((id) => { let i = acts.findIndex((a) => a.id === id); return r0.LS[i] === r0.ES[i]; }));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. E（水道配管）を選んで ↓ で短くしていくと、クリティカルパスはどこで入れかわる？
// 2. D で締め切りの辺を ON にし、← で W を小さくしていこう。何日で「正の回路」になる？ その回路は？
// 3. A* の表の 1 行目（A の行）が、各作業の ES とどう関係しているか確かめよう
// 4. 作業 J「引っ越し」（前の作業 I、1 日）を acts に足してみよう
// 5. 03 の A^{⊗k} と A* のちがいは？（「ちょうど k 本」と「何本でも」）

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
