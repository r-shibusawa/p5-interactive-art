// ============================================
// 07 探索の工夫 ─ 報酬がゴール（+1）にしかない迷路。1 歩ごとの報酬は 0 なので、ゴールを一度見つけるまで何も学べない
// 5 つのエージェントが同じ迷路で同時に Q 学習する。ちがうのは「どう行動を選ぶか」だけ：
//   ε 一定 / ε を減らす / 楽観的な初期値（Q を 1 から始め、ε = 0）/ ボルツマン選択（ソフトマックス）/ 貪欲だけ（Q = 0、ε = 0）
// 小さな迷路の色 = そのマスに来た回数（明るいほど多い）。F 速さ / スペース 一時停止 / R やり直し / ↑↓ 温度 τ
// ============================================

let mapRows = [                          // ★ 迷路（S スタート、G ゴール）
  'S...#.......',
  '.##.#.####..',
  '.#..#....#..',
  '.#.####..#..',
  '.#....#..#..',
  '.####.#.##..',
  '......#....#',
  '#####...##.G',
];
const GAMMA = 0.95, ALPHA = 0.5, MAX_LEN = 3000;    // ★ 割引率、学習率、1 エピソードの上限
const EPS = 0.1, Q_OPT = 1;              // ★ ε 一定の ε、楽観的な初期値
let tau = 0.02;                          // ★ ボルツマン選択の温度 τ（小さいほど貪欲）
let gw, agents = [], speed = 1, paused = false, KINDS = [];
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() {
  createCanvas(windowWidth, windowHeight); gw = gridParse(mapRows);
  KINDS = [['eps', 'ε 一定（0.1）', CYAN], ['decay', 'ε を減らす（1 → 0.02）', LIME], ['opt', '楽観的な初期値（Q = 1, ε = 0）', GOLD], ['boltz', 'ボルツマン選択', VIOLET], ['greedy', '貪欲だけ（Q = 0, ε = 0）', PINK]];
  selfTest(); seedRng(4); resetAgents();
}
function resetAgents() { agents = KINDS.map((k) => makeAgent(gw, k[0])); }
function makeAgent(g, kind) {
  let q0 = kind === 'opt' ? Q_OPT : 0;
  return { kind, Q: Array.from({ length: g.w * g.h }, () => [q0, q0, q0, q0]), s: g.cell.indexOf('S'), len: 0, epLens: [], visits: new Array(g.w * g.h).fill(0), fails: 0 };
}
// ★ 行動の選び方（ここだけがちがう）
function chooseAct(ag) {
  let q = ag.Q[ag.s], ep = ag.epLens.length;
  if (ag.kind === 'eps') return epsGreedy(q, EPS);
  if (ag.kind === 'decay') return epsGreedy(q, Math.max(0.02, 1 / (1 + ep / 3)));
  if (ag.kind === 'boltz') return sampleFrom(softmaxArr(q, tau));
  return argmaxFirst(q);                 // 'opt' と 'greedy'：いちばん良い向き（同点なら上→右→下→左の順）
}
function agentStep(ag, g) {              // Q 学習の 1 歩（5 つとも同じ）
  let s = ag.s, a = chooseAct(ag), s2 = gridMove(g, s, a), done = g.cell[s2] === 'G', r = done ? 1 : 0;
  ag.Q[s][a] += ALPHA * ((done ? r : r + GAMMA * maxOf(ag.Q[s2])) - ag.Q[s][a]);
  ag.visits[s2]++; ag.len++; ag.s = s2;
  if (done || ag.len >= MAX_LEN) { if (!done) ag.fails++; ag.epLens.push(ag.len); ag.len = 0; ag.s = g.cell.indexOf('S'); }
}
function greedyLen(ag, g) { let s = g.cell.indexOf('S'); for (let t = 1; t <= 200; t++) { s = gridMove(g, s, argmaxFirst(ag.Q[s])); if (g.cell[s] === 'G') return t; } return -1; }

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (!paused) {
    if (speed === 0) { if (frameCount % 3 === 0) for (let ag of agents) agentStep(ag, gw); }
    else if (speed === 1) { for (let k = 0; k < 10; k++) for (let ag of agents) agentStep(ag, gw); }
    else while (performance.now() - t0 < 6) for (let ag of agents) agentStep(ag, gw);
  }
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('探索の工夫：報酬が遠くにしかない迷路', 40, 42);
  fill(170, 176, 210); textSize(15);
  text('F 速さ（' + SPEEDS[speed] + '）　スペース 一時停止　R やり直し　↑↓ ボルツマンの温度 τ = ' + tau.toFixed(3), 40, 68);

  // ---- 5 つの小さな迷路（来た回数のヒートマップ）
  let cols = 3, bw = (width - 80) / cols, cs = Math.min(bw / (gw.w + 1), (height * 0.5) / 2 / (gw.h + 2)), L = bfsDist(gw, gw.cell.indexOf('G'))[gw.cell.indexOf('S')];
  agents.forEach((ag, k) => {
    let gx = 40 + (k % cols) * bw, gy = 120 + Math.floor(k / cols) * (gw.h * cs + 60), mx = Math.log(1 + maxOf(ag.visits));
    for (let s = 0; s < gw.w * gw.h; s++) {
      let [x, y] = cellXY(gw, s, gx, gy, cs), c = gw.cell[s];
      noStroke();
      if (c === '#') fill(60, 66, 110); else if (c === 'G') fill(...GOLD);
      else { let t = mx > 0 ? Math.log(1 + ag.visits[s]) / mx : 0; fill(20 + t * KINDS[k][2][0] * 0.9, 22 + t * KINDS[k][2][1] * 0.9, 50 + t * KINDS[k][2][2] * 0.7); }
      rect(x, y, cs - 1, cs - 1);
    }
    let [ax, ay] = cellXY(gw, ag.s, gx, gy, cs); fill(255); circle(ax + cs / 2, ay + cs / 2, cs * 0.6);
    let gl = greedyLen(ag, gw);
    fill(...KINDS[k][2]); textSize(14); textAlign(LEFT, BASELINE); text(KINDS[k][1], gx, gy - 8);
    fill(200, 205, 235); textSize(12);
    text('ゴール ' + (ag.epLens.length - ag.fails) + ' 回　貪欲の道 ' + (gl > 0 ? gl + ' 歩' + (gl === L ? ' ✓' : '') : 'まだ'), gx, gy + gw.h * cs + 16);
  });

  // ---- エピソードごとの歩数
  let px = 40 + 2 * bw, g = { x: px + 30, y: 120 + gw.h * cs + 80, w: bw - 50, h: Math.max(80, height - (120 + gw.h * cs + 80) - 110), x0: 0, x1: 40, y0: 1, y1: 3.6 };
  plotAxes(g, 'エピソード', 'log₁₀（歩数）', [0, 20, 40], [1, 2, 3]);
  stroke(...LIME, 120); strokeWeight(1); line(g.x, gY(g, Math.log10(L)), g.x + g.w, gY(g, Math.log10(L)));
  agents.forEach((ag, k) => drawCurve(g, ag.epLens.slice(0, 41).map((v) => Math.log10(Math.max(1, v))), KINDS[k][2], 2));
  noStroke(); fill(170, 176, 210); textSize(12); textAlign(LEFT, BASELINE);
  text('最初の 40 エピソード。緑の線 = 最短 ' + L + ' 歩', g.x - 20, g.y + g.h + 46);
  text('いちばん上 = ' + MAX_LEN + ' 歩で打ち切り', g.x - 20, g.y + g.h + 64);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetAgents();
  if (key === UP_ARROW) tau = Math.min(1, tau * 2);
  if (key === DOWN_ARROW) tau = Math.max(0.005, tau / 2);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let g = gridParse(mapRows), L = bfsDist(g, g.cell.indexOf('G'))[g.cell.indexOf('S')];
  let run = (kind, seed, eps) => { seedRng(seed); let ag = makeAgent(g, kind); while (ag.epLens.length < eps) agentStep(ag, g); return ag; };
  let gr = run('greedy', 1, 1);
  check('貪欲だけ（Q = 0、同点は決まった向き）は ' + MAX_LEN + ' 歩たってもゴールに着かない（同じ所を行き来する）', gr.fails === 1);
  let okOpt = true, first = []; for (let seed = 1; seed <= 3; seed++) { let op = run('opt', seed, 60); first.push(op.epLens[0]); if (!(op.epLens[0] < MAX_LEN && greedyLen(op, g) === L)) okOpt = false; }
  check('楽観的な初期値（ε = 0）は 1 回目からゴールに着き（' + first.join('・') + ' 歩）、60 回で貪欲の道 = 最短 ' + L + ' 歩（3 つの種）', okOpt);
  // ε やボルツマンは、たまたま先に見つけた道（2 歩長い）に落ち着くことがある：もう一方の道はめったに試さないから
  let okAll = true, lens = []; for (let kind of ['eps', 'decay', 'boltz']) for (let seed = 1; seed <= 3; seed++) { let gl = greedyLen(run(kind, seed, 300), g); lens.push(gl); if (!(gl >= L && gl <= L + 2)) okAll = false; }
  check('ε 一定・ε を減らす・ボルツマンも 300 回でゴールに着く道を学ぶ（' + L + '〜' + (L + 2) + ' 歩：' + lens.join(',') + '）', okAll);
  let tot = (ag) => ag.epLens.slice(0, 20).reduce((a, b) => a + b, 0), sOpt = 0, sEps = 0;
  for (let seed = 1; seed <= 3; seed++) { sOpt += tot(run('opt', seed, 20)); sEps += tot(run('eps', seed, 20)); }
  check('最初の 20 エピソードの歩数の合計：楽観的 ' + Math.round(sOpt / 3) + ' < ε 一定 ' + Math.round(sEps / 3) + '（3 つの種の平均）', sOpt < sEps);
  let p = softmaxArr([1000, 0, -5, 2], 0.01);
  check('ソフトマックスの確率の合計 = 1、大きな値でもあふれない', near(p.reduce((a, b) => a + b, 0), 1, 1e-12) && noNaN(p));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. どのエージェントがいちばん早く最短の道を見つける？ ヒートマップで「どこを探したか」をくらべよう
// 2. ↑↓ で τ を変えると、ボルツマン選択はどう変わる？（大きい = でたらめ、小さい = 貪欲）
// 3. Q_OPT を 0.1 にすると、楽観的な初期値の探索はどう変わる？
// 4. 貪欲だけのエージェントがどこで行き来しているか、ヒートマップで探そう
// 5. ε 一定のエージェントが 22 歩の道に落ち着いたら、左の縦の道（20 歩）を試すには何が要る？
// 6. 1 歩ごとに −0.01 の報酬にすると、貪欲だけでも探索するようになる。なぜ？（05 と同じしくみ）

// ==================================================
// ここから下は「強化学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [14, 16, 34];                // 背景（アーケードの紺）
const GOLD = [255, 196, 60], CYAN = [90, 215, 245], PINK = [245, 110, 170], LIME = [160, 230, 110], VIOLET = [175, 140, 255];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function argmaxR(q) {                  // いちばん大きい値の番号（同点はランダムに 1 つ）
  let m = -Infinity, best = [];
  for (let i = 0; i < q.length; i++) {
    if (q[i] > m + 1e-12) { m = q[i]; best = [i]; } else if (Math.abs(q[i] - m) <= 1e-12) best.push(i);
  }
  return best.length ? best[Math.floor(rnd() * best.length)] : 0;
}
function argmaxFirst(q) { let b = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[b]) b = i; return b; }   // 同点は若い番号
function maxOf(q) { let m = -Infinity; for (let v of q) if (v > m) m = v; return m; }
function epsGreedy(q, eps) { return rnd() < eps ? Math.floor(rnd() * q.length) : argmaxR(q); }   // ε の確率でランダム、ほかは貪欲
function softmaxArr(h, tau) {          // ボルツマン分布 exp(h/τ) / Σ（大きい数でもあふれないように最大値を引く）
  let m = maxOf(h), e = h.map((v) => Math.exp((v - m) / (tau || 1))), s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
function sampleFrom(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
function meanOf(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; let s = v.toFixed(d === undefined ? 2 : d); return s === '-0.00' || s === '-0.0' || s === '-0' ? s.slice(1) : s; }
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
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(70, 76, 110); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(150, 156, 190); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 235); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function smoothArr(a, k) {             // 直前 k 個の平均（ギザギザの学習曲線をならす）
  let out = [], s = 0;
  for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= k) s -= a[i - k]; out.push(s / Math.min(i + 1, k)); }
  return out;
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(220, 225, 245); text(s, x + 22, y); y += 20; }
}
// ---- グリッドワールド：文字の地図 '.' 床、'#' 壁、'S' スタート、'G' 宝（+1 で終わり）、'P' 落とし穴（−1 で終わり）
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];    // 行動 0 上、1 右、2 下、3 左
const DIR_NAMES = ['上', '右', '下', '左'];
function gridParse(rows) { return { w: rows[0].length, h: rows.length, cell: rows.join('').split('') }; }
function gridMove(gw, s, a) {          // 決まった向きに 1 マス。外や壁ならその場にとどまる
  let x = s % gw.w + DIRS[a][0], y = Math.floor(s / gw.w) + DIRS[a][1];
  if (x < 0 || y < 0 || x >= gw.w || y >= gw.h || gw.cell[y * gw.w + x] === '#') return s;
  return y * gw.w + x;
}
function isTerminalCell(c) { return c === 'G' || c === 'P'; }
function enterReward(c, stepR) { return c === 'G' ? 1 : c === 'P' ? -1 : stepR; }
// マルコフ決定過程を作る：P[s][a] = [{ s2, p, r }]。意図した向きに 1 − slip、左右の直角の向きに slip/2 ずつ
function buildMdp(gw, slip, stepR) {
  let nS = gw.w * gw.h, P = [], term = [];
  for (let s = 0; s < nS; s++) {
    let c = gw.cell[s]; term.push(isTerminalCell(c) || c === '#'); P.push([]);
    for (let a = 0; a < 4; a++) {
      if (term[s]) { P[s].push([{ s2: s, p: 1, r: 0 }]); continue; }       // 終わりのマス（と壁）はそこに留まり、報酬 0
      let outs = [[a, 1 - slip], [(a + 1) % 4, slip / 2], [(a + 3) % 4, slip / 2]], list = [];
      for (let [d, p] of outs) {
        if (p <= 0) continue;
        let s2 = gridMove(gw, s, d), r = enterReward(gw.cell[s2], stepR), e = list.find((o) => o.s2 === s2);
        if (e) e.p += p; else list.push({ s2, p, r });
      }
      P[s].push(list);
    }
  }
  return { nS, nA: 4, P, term, gw };
}
function qValue(mdp, V, gamma, s, a) { let q = 0; for (let o of mdp.P[s][a]) q += o.p * (o.r + gamma * V[o.s2]); return q; }
function viSweep(mdp, V, gamma) {      // 価値反復の 1 回：V(s) ← max_a Σ p (r + γ V(s'))。戻り値 = 最大の変化量
  let nv = V.slice(), d = 0;
  for (let s = 0; s < mdp.nS; s++) {
    if (mdp.term[s]) continue;
    let best = -Infinity; for (let a = 0; a < 4; a++) best = Math.max(best, qValue(mdp, V, gamma, s, a));
    nv[s] = best; d = Math.max(d, Math.abs(best - V[s]));
  }
  for (let s = 0; s < mdp.nS; s++) V[s] = nv[s];
  return d;
}
function valueIteration(mdp, gamma, tol, maxIt) {
  let V = new Array(mdp.nS).fill(0), its = 0, d = Infinity, deltas = [];
  while (d >= tol && its < (maxIt || 100000)) { d = viSweep(mdp, V, gamma); deltas.push(d); its++; }
  return { V, its, deltas };
}
function optimalActs(mdp, V, gamma, s, tol) {     // 最適な行動の集合（同点は全部）
  let q = [0, 1, 2, 3].map((a) => qValue(mdp, V, gamma, s, a)), m = maxOf(q);
  return [0, 1, 2, 3].filter((a) => q[a] >= m - (tol || 1e-9));
}
function evalPolicy(mdp, pi, gamma, tol, V0) {    // 方策評価：V(s) ← Σ p (r + γ V(s')) を、変化が tol 未満になるまで
  let V = V0 ? V0.slice() : new Array(mdp.nS).fill(0), sweeps = 0, d = Infinity;
  while (d >= tol && sweeps < 100000) {
    d = 0;
    for (let s = 0; s < mdp.nS; s++) {
      if (mdp.term[s]) continue;
      let v = qValue(mdp, V, gamma, s, pi[s]); d = Math.max(d, Math.abs(v - V[s])); V[s] = v;
    }
    sweeps++;
  }
  return { V, sweeps };
}
function cellXY(gw, s, gx, gy, cs) { return [gx + (s % gw.w) * cs, gy + Math.floor(s / gw.w) * cs]; }
function drawArrowIn(cx, cy, a, len) { // マスの中心から向き a に矢印
  let dx = DIRS[a][0], dy = DIRS[a][1], ex = cx + dx * len, ey = cy + dy * len;
  line(cx - dx * len * 0.4, cy - dy * len * 0.4, ex, ey);
  noStroke(); triangle(ex + dx * 5, ey + dy * 5, ex - dy * 5 - dx * 2, ey + dx * 5 - dy * 2, ex + dy * 5 - dx * 2, ey - dx * 5 - dy * 2);
}
function drawCells(gw, gx, gy, cs, skipFloor) {   // 壁・宝・落とし穴・スタートを描く
  textAlign(CENTER, CENTER); textSize(cs * 0.4);
  for (let s = 0; s < gw.w * gw.h; s++) {
    let c = gw.cell[s], [x, y] = cellXY(gw, s, gx, gy, cs);
    if (c === '.' && skipFloor) continue;
    noStroke();
    if (c === '#') fill(70, 76, 120); else if (c === 'G') fill(...GOLD); else if (c === 'P') fill(120, 30, 70); else fill(26, 30, 60);
    rect(x + 1, y + 1, cs - 2, cs - 2, 4);
    if (c === 'G') { fill(40, 30, 0); text('宝', x + cs / 2, y + cs / 2); }
    if (c === 'P') { fill(255, 150, 190); text('穴', x + cs / 2, y + cs / 2); }
    if (c === 'S') { fill(...CYAN); text('S', x + cs / 2, y + cs / 2); }
  }
}
function cellAt(gw, gx, gy, cs, mx, my) {         // マウスの下のマス（なければ −1）
  let x = Math.floor((mx - gx) / cs), y = Math.floor((my - gy) / cs);
  return x >= 0 && y >= 0 && x < gw.w && y < gw.h ? y * gw.w + x : -1;
}
function bfsDist(gw, goal) {           // 決定的に動くときの、各マスからゴールまでの最短の歩数（届かなければ Infinity）
  let d = new Array(gw.w * gw.h).fill(Infinity), q = [goal]; d[goal] = 0;
  while (q.length) {
    let s = q.shift();
    for (let a = 0; a < 4; a++) {
      let x = s % gw.w - DIRS[a][0], y = Math.floor(s / gw.w) - DIRS[a][1], p = y * gw.w + x;   // p から向き a で s に来られる？
      if (x < 0 || y < 0 || x >= gw.w || y >= gw.h || gw.cell[p] === '#' || d[p] < Infinity || isTerminalCell(gw.cell[p])) continue;
      if (gridMove(gw, p, a) === s) { d[p] = d[s] + 1; q.push(p); }
    }
  }
  return d;
}
function valueFill(v, lo, hi) {        // 低い = 紫、0 = 紺、高い = 金
  let t = clampv((v - lo) / (hi - lo || 1), 0, 1);
  if (t < 0.5) { let u = t / 0.5; fill(110 - 80 * u, 60 - 30 * u, 150 - 90 * u); }
  else { let u = (t - 0.5) / 0.5; fill(30 + 220 * u, 30 + 160 * u, 60 - 20 * u); }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 225, 200) : color(255, 90, 120)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
