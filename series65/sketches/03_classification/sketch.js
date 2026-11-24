// ============================================
// 03 状態の分類 ─ 自分で遷移図を作ると、状態を自動で分類して色分けする
// 通じ合うクラス：i から j へも、j から i へも行ける状態のまとまり（強連結成分、タージャンの方法で求める）
// 閉じたクラス：外へ出る矢印がない（一度入ると出られない）。1 つだけで自分に戻るなら吸収状態
// 周期：戻ってこられる歩数の最大公約数（gcd）。周期 2 だと分布が行ったり来たりして収束しない
// 既約（クラスが 1 つ）で周期 1 なら、どこから始めても定常分布へ（01・02 の場合）
// 空いている所をクリック 状態を追加 / 状態から状態へドラッグ 矢印をつける・消す / 状態をクリック 自分への矢印
// 1 周期 2 の例　2 吸収状態のある例　3 既約で周期 1　4 周期 3　C 全部消す　（矢印の確率は、出る矢印に均等）
// ============================================

const MAX_STATES = 8;                    // ★ 状態の数の上限
const NODE_R = 26;
let pos = [], edges = [], transP = [], info = null, dragFrom = -1, pressX = 0, pressY = 0, distHist = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  preset(1);
}
function preset(k) {                     // ★ 例の遷移図（矢印のリスト）
  let w = width * 0.55, h = height - 200, cx = 40 + w / 2, cy = 110 + h / 2, ring = (n, r) => { let p = []; for (let i = 0; i < n; i++) p.push([cx + r * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n), cy + r * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n)]); return p; };
  let lists = {
    1: [4, [[0, 1], [1, 2], [2, 3], [3, 0], [1, 0], [3, 2]]],                   // 偶数歩でしか戻れない → 周期 2
    2: [5, [[1, 0], [1, 2], [2, 1], [2, 3], [3, 2], [3, 4], [0, 0], [4, 4]]],   // 0 と 4 が吸収状態（ギャンブラーの破産、04）
    3: [5, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [2, 0], [4, 4]]],          // 長さ 5 と 3 の輪 + 自分への矢印 → 周期 1
    4: [6, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3], [5, 0]]],  // どの輪も長さ 3 の倍数 → 周期 3
  };
  let [n, list] = lists[k]; pos = ring(n, Math.min(w, h) * 0.36); edges = zerosMat(n);
  for (let [i, j] of list) edges[i][j] = 1;
  rebuild();
}
// ★ 矢印から遷移行列：出る矢印に均等な確率。矢印がない状態は「その場にとどまる」（吸収状態）
function edgesToP(e) { return fixRows(e.map((r) => r.slice())); }
function rebuild() {
  transP = edgesToP(edges); info = classifyChain(transP);
  let mu = new Array(pos.length).fill(0); if (pos.length) mu[0] = 1; distHist = [mu];
  for (let n = 1; n <= 40; n++) distHist.push(vecMat(distHist[n - 1], transP));
}
function nodeAt(x, y) { for (let i = 0; i < pos.length; i++) if (Math.hypot(x - pos[i][0], y - pos[i][1]) < NODE_R + 6) return i; return -1; }

function draw() {
  background(...BG);
  hudTitle('状態の分類：' + pos.length + ' 個の状態、' + (info ? info.classes.length : 0) + ' つのクラス' + (info && info.irreducible ? '（既約）' : ''), '空き地クリック 追加　状態→状態ドラッグ 矢印　状態クリック 自分への矢印　1〜4 例　C 消す');
  let w = width * 0.55;
  noFill(); stroke(60, 54, 50); strokeWeight(1); rect(40, 96, w, height - 150, 10);
  if (pos.length) {
    let cols = pos.map((_, i) => STATE_COLS[info.comp[i] % STATE_COLS.length]);
    drawChainGraph(pos, transP, NODE_R, cols, { labels: pos.length <= 6 });
    for (let i = 0; i < pos.length; i++) {
      let c = info.classes[info.comp[i]], tag = c.absorbing ? '吸収' : c.closed ? '閉' : '一時';
      noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP); text(tag, pos[i][0], pos[i][1] + NODE_R + 4);
    }
  }
  if (dragFrom >= 0) { stroke(...MUSTARD); strokeWeight(2); line(pos[dragFrom][0], pos[dragFrom][1], mouseX, mouseY); }

  // ---- 分類の結果
  let x = w + 80, y = 120;
  noStroke(); fill(...CREAM); textSize(16); textAlign(LEFT, BASELINE); text('クラス（行ったり来たりできるまとまり）', x, y);
  if (info) info.classes.forEach((c, k) => {
    let yy = y + 26 + k * 26; fill(...STATE_COLS[k % STATE_COLS.length]); rect(x, yy - 12, 16, 16, 3);
    fill(...CREAM); textSize(14);
    let per = c.period === 0 ? '戻れない' : '周期 ' + c.period;
    text('{' + c.members.join(', ') + '}　' + (c.absorbing ? '吸収状態' : c.closed ? '閉じている（再帰的）' : '出ていく（一時的）') + '　' + per, x + 24, yy);
  });
  let yy = y + 40 + (info ? info.classes.length : 0) * 26;
  fill(...MUSTARD); textSize(15);
  if (info && pos.length) text(info.irreducible ? (info.classes[0].period === 1 ? '既約で周期 1 → どこからでも定常分布へ収束' : '既約だが周期 ' + info.classes[0].period + ' → 分布は回り続ける') : '既約ではない → 始める場所で行き先が変わる', x, yy);

  // ---- 状態 0 から始めた分布の変化（周期があると振動）
  let g = { x, y: yy + 50, w: Math.min(460, width - x - 40), h: height - yy - 140, x0: 0, x1: 40, y0: 0, y1: 1 };
  plotAxes(g, 'n（歩）', '状態 0 から始めて、n 歩後に各状態にいる確率', [0, 10, 20, 30, 40], [0, 0.5, 1]);
  for (let i = 0; i < pos.length; i++) drawCurve(g, distHist.map((d) => d[i]), STATE_COLS[i % STATE_COLS.length], 2);
  for (let i = 0; i < Math.min(pos.length, 8); i++) { noStroke(); fill(...STATE_COLS[i % STATE_COLS.length]); textSize(11); textAlign(LEFT, CENTER); text(i, g.x + g.w + 4, gY(g, distHist[40][i])); }
  noStroke(); fill(...SUB); textSize(12); textAlign(LEFT, TOP); text('線の色 = 状態の番号（左の色はクラス）', g.x, g.y + g.h + 34);
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  pressX = mouseX; pressY = mouseY;
  if (mouseX > width * 0.55 + 40 || mouseY < 96) return;
  let i = nodeAt(mouseX, mouseY);
  if (i >= 0) { dragFrom = i; return; }
  if (pos.length < MAX_STATES) {
    let n = pos.length; pos.push([mouseX, mouseY]);
    edges = edges.map((r) => r.concat([0])); edges.push(new Array(n + 1).fill(0)); rebuild();
  }
}
function mouseReleased() {
  if (dragFrom < 0) return;
  let j = nodeAt(mouseX, mouseY), moved = Math.hypot(mouseX - pressX, mouseY - pressY) > 8;
  if (j >= 0 && (j !== dragFrom || !moved)) { edges[dragFrom][j] = edges[dragFrom][j] ? 0 : 1; rebuild(); }
  dragFrom = -1;
}
function keyPressed() {
  if (key >= '1' && key <= '4') preset(Number(key));
  if (key === 'c' || key === 'C') { pos = []; edges = []; transP = []; info = { comp: [], classes: [], irreducible: false }; distHist = [[]]; for (let n = 0; n < 40; n++) distHist.push([]); }
  return false;
}

// ============================================
// やってみよう
// 1. 例 1（周期 2）に、どこか 1 つ「自分への矢印」を足すと、周期は？ グラフの振動は？
// 2. 例 2 で、状態 0 から始めずに真ん中から始めたい → rebuild() の mu[0] = 1 を mu[2] = 1 に
// 3. 例 4 の輪のどこかに長さ 4 の輪を作ると、gcd(3, 4) = 1 で周期 1 になる
// 4. 吸収状態が 2 つあるとき、どちらに吸収されるかの確率を 04・05 で計算する
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let fromList = (n, list) => { let e = zerosMat(n); for (let [i, j] of list) e[i][j] = 1; return edgesToP(e); };
  let c2 = classifyChain(fromList(2, [[0, 1], [1, 0]]));
  check('2 つの間を行き来するだけ：既約、周期 2', c2.irreducible && c2.classes[0].period === 2);
  let c3 = classifyChain(fromList(3, [[0, 1], [1, 2], [2, 0]]));
  check('長さ 3 の輪：周期 3', c3.irreducible && c3.classes[0].period === 3);
  let c1 = classifyChain(fromList(3, [[0, 1], [1, 2], [2, 0], [1, 1]]));
  check('輪に自分への矢印を足す：周期 1', c1.irreducible && c1.classes[0].period === 1);
  let gr = classifyChain(fromList(5, [[1, 0], [1, 2], [2, 1], [2, 3], [3, 2], [3, 4]]));   // 0 と 4 は矢印なし → 吸収
  let byM = (m) => gr.classes.find((c) => c.members.includes(m));
  check('ギャンブラーの連鎖：クラス {0} {1,2,3} {4}、0 と 4 は吸収、{1,2,3} は一時的', gr.classes.length === 3 && byM(0).absorbing && byM(4).absorbing && !byM(2).closed && byM(2).members.length === 3);
  // 周期 = gcd{ n : P^n(i,i) > 0 } を総当たりで、でたらめなグラフと比べる
  seedRng(3); let okP = true, okIrr = true;
  for (let t = 0; t < 40; t++) {
    let n = 3 + (t % 5), e = zerosMat(n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (rnd() < (t % 2 ? 0.25 : 0.4)) e[i][j] = 1;
    let a = edgesToP(e), info = classifyChain(a), pw = eyeMat(n), g = new Array(n).fill(0), reach = eyeMat(n);
    for (let k = 1; k <= 3 * n; k++) { pw = matMul(pw, a); for (let i = 0; i < n; i++) { if (pw[i][i] > 1e-15) g[i] = gcdInt(g[i], k); for (let j = 0; j < n; j++) if (pw[i][j] > 1e-15) reach[i][j] = 1; } }
    for (let c of info.classes) for (let i of c.members) if (c.period !== g[i]) okP = false;
    let allReach = reach.every((r) => r.every((v) => v > 0));
    if (allReach !== info.irreducible) okIrr = false;
  }
  check('でたらめなグラフ 40 個：周期 = gcd{n : Pⁿ(i,i) > 0}（総当たり）', okP);
  check('40 個：既約 ⇔ どこからどこへも行ける（Pⁿ で確認）', okIrr);
  let p2 = fromList(2, [[0, 1], [1, 0]]), mu = [1, 0], osc = true; for (let n = 1; n <= 10; n++) { mu = vecMat(mu, p2); if (mu[n % 2] !== 1) osc = false; }
  check('周期 2 の連鎖では分布が (0,1) ⇔ (1,0) を行き来して収束しない', osc);
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
// ---- 状態の分類：強連結成分（タージャンの方法）と周期
function adjOf(a) { return a.map((r) => r.map((v, j) => (v > 1e-12 ? j : -1)).filter((j) => j >= 0)); }   // 確率 > 0 の矢印
function sccTarjan(adj) {              // 戻り値：comp[i] = 状態 i のクラスの番号（行ったり来たりできる状態どうしが同じ番号）
  let n = adj.length, idx = new Array(n).fill(-1), low = new Array(n).fill(0), onSt = new Array(n).fill(false), st = [], comp = new Array(n).fill(-1), counter = 0, nc = 0;
  function visit(v) {
    idx[v] = low[v] = counter++; st.push(v); onSt[v] = true;
    for (let w of adj[v]) {
      if (idx[w] < 0) { visit(w); low[v] = Math.min(low[v], low[w]); }
      else if (onSt[w]) low[v] = Math.min(low[v], idx[w]);
    }
    if (low[v] === idx[v]) { let w; do { w = st.pop(); onSt[w] = false; comp[w] = nc; } while (w !== v); nc++; }
  }
  for (let v = 0; v < n; v++) if (idx[v] < 0) visit(v);
  return comp;
}
function gcdInt(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
function classPeriod(adj, members) {   // クラスの周期：BFS の深さ lev で、クラスの中の矢印 u→v ごとに gcd(lev u + 1 − lev v)
  let inC = new Set(members), lev = new Map([[members[0], 0]]), q = [members[0]], g = 0;
  while (q.length) { let u = q.shift(); for (let v of adj[u]) if (inC.has(v) && !lev.has(v)) { lev.set(v, lev.get(u) + 1); q.push(v); } }
  for (let u of members) for (let v of adj[u]) if (inC.has(v)) g = gcdInt(g, lev.get(u) + 1 - lev.get(v));
  return g;                            // 0 = クラスの中に矢印がない（1 回きりの状態）
}
function classifyChain(a) {            // クラスごとに：メンバー、閉じている（外へ出ない）か、周期
  let adj = adjOf(a), comp = sccTarjan(adj), nc = Math.max(-1, ...comp) + 1, classes = [];
  for (let c = 0; c < nc; c++) {
    let mem = []; comp.forEach((k, i) => { if (k === c) mem.push(i); });
    let closed = mem.every((u) => adj[u].every((v) => comp[v] === c));
    classes.push({ members: mem, closed, period: classPeriod(adj, mem), absorbing: mem.length === 1 && a[mem[0]][mem[0]] > 1 - 1e-12 });
  }
  return { comp, classes, irreducible: nc === 1 };
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
