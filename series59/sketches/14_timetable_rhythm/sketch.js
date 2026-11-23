// ============================================
// 14 時刻表のリズム ─ x(k+1) = A ⊗ x(k) の「できごと」を打楽器の音にする。周期 λ がテンポ、巡回性 c が「何拍で 1 まわりか」
// 4 つのできごと（キック・スネア・ハイハット・タム）が輪（0 → 1 → 2 → 3 → 0）でつながり、それぞれ自分の休み時間（自己ループ）をもつ
//   いちばん遅い回路（臨界回路）がリズムを決める：自己ループなら毎回同じ形（c = 1）、輪全体なら 4 拍で 1 まわり（c = 4）
// クリックで音 ON / 1・2・3 例 / ← → できごとを選ぶ / ↑↓ その休み時間（自己ループ）/ M 消音 / R 最初から
// 音量は小さめから。ヘッドホンは特に注意（全体の音量 MASTER は 0.2 以下）
// ============================================

const NAMES = ['キック', 'スネア', 'ハイハット', 'タム'];
const PRESETS = [                      // ★ ring = 輪の辺 i → i+1 の時間、self = 自己ループ（0 はなし）、chord = 1 ⇔ 3 の辺（0 はなし）
  { name: '1：キックの休みがネック（c = 1）', ring: [2, 3, 2, 3], self: [6, 4, 3, 4], chord: 0 },
  { name: '2：スネア ⇔ タムの往復がネック（c = 2）', ring: [2, 3, 2, 3], self: [4, 3, 0, 4], chord: 5 },
  { name: '3：輪全体がネック（c = 4）', ring: [5, 6, 5, 6], self: [4, 3, 4, 3], chord: 0 },
];
const UNIT = 0.11;                     // ★ 時間 1 = 0.11 秒（テンポ）
let pr, sel = 0, matA, lam, cyc, ci, xk, kNow = 0, t0 = 0, hits = [], muted = false;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); loadPreset(0); }
function buildA(p) {
  let A = mpMat(4, 4);
  for (let i = 0; i < 4; i++) { A[(i + 1) % 4][i] = p.ring[i]; if (p.self[i] > 0) A[i][i] = p.self[i]; }
  if (p.chord > 0) { A[3][1] = p.chord; A[1][3] = p.chord; }
  return A;
}
function loadPreset(k) { pr = JSON.parse(JSON.stringify(PRESETS[k])); pr.idx = k; rebuild(); }
function rebuild() {
  matA = buildA(pr); lam = karp(matA); ci = criticalInfo(matA, lam); cyc = cyclicity(matA, lam);
  let now = playTime(); xk = new Array(4).fill(Math.ceil(now)); kNow = 0;            // いまの時刻からやり直す
}
function playTime() { return (millis() - t0) / 1000 / UNIT; }
// ★ 先読み：次の x(k) が 0.4 秒先までに入ったら、全部の音を予約して k を 1 つ進める
function schedule() {
  let now = playTime();
  for (let guard = 0; guard < 8 && Math.min(...xk) <= now + 0.4 / UNIT; guard++) {
    xk.forEach((t, i) => { hits.push({ i, t, k: kNow }); if (t >= now - 0.05 && audioCtx && !muted) drum(i, audioCtx.currentTime + Math.max(0, (t - now) * UNIT)); });
    xk = mpMatVec(matA, xk); kNow++;
  }
  hits = hits.filter((h) => h.t > now - 60);
}

function draw() {
  background(22, 22, 28);
  schedule();
  let now = playTime(), W = 60, gx = 140, gw = width - 190, gy = 380, rh = 50, cols = [[255, 170, 70], [110, 190, 255], [150, 230, 160], [220, 150, 255]];
  // ---- ピアノロール（右はし = いま）
  for (let i = 0; i < 4; i++) { noStroke(); fill(i === sel ? 40 : 32); rect(gx, gy + i * rh, gw, rh - 6); fill(220); textSize(15); textAlign(RIGHT, CENTER); text(NAMES[i], gx - 10, gy + i * rh + rh / 2 - 3); }
  stroke(60); strokeWeight(1);
  for (let t = Math.ceil(now - W); t <= now; t++) if (t % 10 === 0) line(gx + ((t - now + W) / W) * gw, gy, gx + ((t - now + W) / W) * gw, gy + 4 * rh);
  noStroke();
  for (let h of hits) if (h.t <= now && h.t > now - W) { fill(...cols[h.i]); circle(gx + ((h.t - now + W) / W) * gw, gy + h.i * rh + rh / 2 - 3, 14); }
  // ---- 輪のグラフと光る楽器
  let cx = 210, cy = 240, R = 74, P = (i) => [cx + R * Math.cos((TWO_PI * i) / 4 - HALF_PI), cy + R * Math.sin((TWO_PI * i) / 4 - HALF_PI)];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    if (matA[i][j] === NEG_INF) continue;
    let c = ci.arcs.some(([a, b]) => a === j && b === i);
    stroke(c ? color(255, 170, 70) : 130); fill(c ? color(255, 170, 70) : 130); strokeWeight(c ? 3.5 : 1.5);
    let lp;
    if (i === j) { noFill(); let [x, y] = P(i), ox = (x - cx) * 0.45, oy = (y - cy) * 0.45; circle(x + ox, y + oy, 34); lp = [x + ox * 2.1, y + oy * 2.1]; }
    else lp = arrowTo(P(j)[0], P(j)[1], P(i)[0], P(i)[1], 24, matA[j][i] !== NEG_INF ? 8 : 0);
    noStroke(); fill(230); textSize(13); textAlign(CENTER, CENTER); text(matA[i][j], lp[0], lp[1]);
  }
  for (let i = 0; i < 4; i++) {
    let recent = hits.some((h) => h.i === i && h.t <= now && h.t > now - 1.2);
    stroke(i === sel ? color(255, 220, 120) : 0); strokeWeight(i === sel ? 3 : 1); fill(...cols[i], recent ? 255 : 110); circle(P(i)[0], P(i)[1], recent ? 48 : 40);
    noStroke(); fill(20); textSize(10); textAlign(CENTER, CENTER); text(NAMES[i], P(i)[0], P(i)[1]);
  }
  // ---- 文字
  textAlign(LEFT, BASELINE); noStroke(); fill(240); textSize(20);
  text('時刻表のリズム　' + pr.name.slice(2), 40, 40);
  fill(170); textSize(15); text((audioCtx ? (muted ? '消音中（M）' : '音 ON') : 'クリックで音 ON') + '　1・2・3 例　← → できごとを選ぶ　↑↓ 休み時間（自己ループ）　M 消音　R 最初から', 40, 66);
  let tx = 420;
  fill(255, 220, 120); textSize(18);
  text('周期 λ = ' + mpFmt(lam, 3) + '（= ' + (lam * UNIT).toFixed(2) + ' 秒）　巡回性 c = ' + cyc + '（' + cyc + ' 周期 = ' + (cyc * lam * UNIT).toFixed(2) + ' 秒で同じ形）', tx, 120);
  fill(220); textSize(15);
  text('選んだ「' + NAMES[sel] + '」の休み時間 = ' + (pr.self[sel] > 0 ? pr.self[sel] : 'なし（ε）') + '。オレンジ = 臨界回路（リズムを決めている所）', tx, 150);
  text('臨界の辺：' + ci.arcs.map(([j, i]) => NAMES[j] + '→' + NAMES[i]).join('、'), tx, 176, width - tx - 40);
  fill(170); text('x(k+1) = A ⊗ x(k)：「つながっている全部のできごとから a_ij 後」の遅いほうで鳴る。下の点が 1 回の音。いまの k = ' + kNow, tx, 230, width - tx - 40);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() { startAudio(); if (t0 === 0) { t0 = millis(); hits = []; rebuild(); } }
function keyPressed() {
  startAudio();
  for (let k = 1; k <= 3; k++) if (key === String(k)) loadPreset(k - 1);
  if (key === LEFT_ARROW) sel = (sel + 3) % 4;
  if (key === RIGHT_ARROW) sel = (sel + 1) % 4;
  if (key === UP_ARROW) { pr.self[sel] = Math.min(12, pr.self[sel] + 1); rebuild(); }
  if (key === DOWN_ARROW) { pr.self[sel] = Math.max(0, pr.self[sel] - 1); rebuild(); }
  if (key === 'm' || key === 'M') muted = !muted;
  if (key === 'r' || key === 'R') { hits = []; loadPreset(pr.idx); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let As = PRESETS.map(buildA), ls = As.map(karp), cs = As.map((A, k) => cyclicity(A, ls[k]));
  check('3 つの例はどれも強連結、λ = 6・5・5.5（カープ = 総当たり）', As.every(isIrreducible) && ls.join() === '6,5,5.5' && As.every((A, k) => Math.abs(bruteMaxMean(A) - ls[k]) < 1e-9));
  check('巡回性 c = 1・2・4（臨界回路：キックの自己ループ・スネア⇔タム・輪全体）', cs.join() === '1,2,4');
  let okP = As.every((A, k) => { let pp = powerPeriod(A, [0, 1, 2, 3], 300, 12); return pp.c === cs[k] && Math.abs(pp.lam - ls[k]) < 1e-9; });
  check('鳴らしたリズム（初期値 0, 1, 2, 3）の周期 = 巡回性、傾き = λ', okP);
  let okM = true; As.forEach((A) => { let x = [0, 0, 0, 0]; for (let k = 0; k < 100; k++) { let y = mpMatVec(A, x); if (!y.every((v, i) => v >= x[i]) || !noNaN(y)) okM = false; x = y; } });
  check('どのできごとも時刻が戻らない（x(k+1) ≥ x(k)）、NaN なし → 予約の順番が正しい', okM);
  seedRng(14); let okR = true;
  for (let t = 0; t < 30; t++) { let p = { ring: [0, 1, 2, 3].map(() => rndInt(1, 7)), self: [0, 1, 2, 3].map(() => rndInt(0, 9)), chord: rndInt(0, 6) }, A = buildA(p), l = karp(A), pp = powerPeriod(A, [0, 0, 0, 0], 400, 24); if (!isIrreducible(A) || cyclicity(A, l) % pp.c !== 0) okR = false; }
  check('休み時間をランダムに変えても強連結、見える周期は巡回性の約数', okR);
  check('音量の上限：全体 MASTER ≤ 0.2', MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 例 1 でキックを選び、↓ で休み時間を短くしていこう。どこでリズムの形が変わる？（臨界回路が入れかわる）
// 2. 例 3（c = 4）は 4 拍で 1 まわり。何の楽器から順に鳴っている？
// 3. 例 2 で、スネアの休み時間を ↑ で 6 にすると、c は 2 から何に変わる？
// 4. UNIT を小さくするとテンポが速くなる。λ と BPM（1 分あたりの拍）の関係は？
// 5. 07 の生産ラインの機械を楽器にして、パレットの数でリズムが変わる曲を作ろう

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
// ---- 音の道具（Web Audio）。音量の上限：全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null, noiseBuf = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
    let d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  audioCtx.resume();
}
function drum(kind, when) {            // 0 キック、1 スネア、2 ハイハット、3 タム（when = 鳴らす時刻）
  if (!audioCtx) return;
  let gn = audioCtx.createGain(); gn.connect(masterOut);
  if (kind === 0 || kind === 3) {      // 音の高さが下がるサイン波
    let o = audioCtx.createOscillator(), f0 = kind === 0 ? 150 : 260;
    o.frequency.setValueAtTime(f0, when); o.frequency.exponentialRampToValueAtTime(f0 / 3, when + 0.15);
    gn.gain.setValueAtTime(0.9, when); gn.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
    o.connect(gn); o.start(when); o.stop(when + 0.3);
  } else {                             // 雑音をフィルターで
    let s = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = kind === 1 ? 'bandpass' : 'highpass'; f.frequency.value = kind === 1 ? 1800 : 7000;
    gn.gain.setValueAtTime(kind === 1 ? 0.7 : 0.35, when); gn.gain.exponentialRampToValueAtTime(0.001, when + (kind === 1 ? 0.18 : 0.05));
    s.connect(f); f.connect(gn); s.start(when); s.stop(when + 0.25);
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
