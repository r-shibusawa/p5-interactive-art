// ============================================
// 13 報酬の設計と「ずる」─ 宝（+1）に早く着いてほしいので「宝に近づいたら +0.1」のごほうびを足すと…？
// 近づく → 離れる → 近づく…と行ったり来たりすれば、宝に着かなくても +0.1 をもらい続けられる（報酬ハッキング）。
// ポテンシャルに基づく整形 F = γΦ(s′) − Φ(s)（Φ = −0.1 × 宝までの距離）なら、1 周してもどれば合計がほぼ 0 になり、ずるができない。
// しかも最適方策は元の報酬とまったく同じになる（価値は V − Φ にずれるだけ）
// 3 つのエージェントが同時に Q 学習。矢印 = 価値反復で求めた最適方策。F 速さ / スペース 一時停止 / R やり直し / ↑↓ ごほうびの大きさ
// ============================================

let mapRows = [                          // ★ 部屋（S スタート、G 宝）
  '.........',
  '.........',
  'S...#....',
  '....#...G',
  '....#....',
  '.........',
];
const GAMMA = 0.99, ALPHA = 0.5, EPS = 0.1, MAX_LEN = 200;   // ★ 割引率・学習率・ε・1 エピソードの上限
let bonus = 0.1;                         // ★ 素朴な整形のごほうび（近づいたら +bonus）。ポテンシャルは Φ = −bonus × 距離
let gw, dist, agents = [], plans = [], tick = 0, speed = 1, paused = false, KINDS = [];
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() {
  createCanvas(windowWidth, windowHeight); gw = gridParse(mapRows);
  KINDS = [['orig', '元の報酬（宝 +1 だけ）', CYAN], ['naive', '素朴な整形（近づいたら +' + bonus + '）', PINK], ['pot', 'ポテンシャル整形 γΦ(s′) − Φ(s)', GOLD]];
  selfTest(); seedRng(13); rebuild();
}
function rebuild() {
  dist = bfsDist(gw, gw.cell.indexOf('G'));
  KINDS[1][1] = '素朴な整形（近づいたら +' + bonus.toFixed(2) + '）';
  plans = KINDS.map((k) => solve(gw, dist, k[0], bonus));
  agents = KINDS.map((k) => ({ kind: k[0], Q: Array.from({ length: gw.w * gw.h }, () => [0, 0, 0, 0]), s: gw.cell.indexOf('S'), len: 0, goals: 0, shaped: 0, goalHist: [0] }));
  tick = 0;
}
function phi(dd, s, b) { return dd[s] === Infinity ? 0 : -b * dd[s]; }   // ポテンシャル Φ(s)（宝では 0）
// ★ 報酬の 3 つの作り方
function rewardOf(kind, s, s2, dd, b) {
  let r = gw2cell(s2) === 'G' ? 1 : 0;
  if (kind === 'naive' && dd[s2] < dd[s]) r += b;                          // 近づいたらごほうび（離れても罰はない）
  if (kind === 'pot') r += (gw2cell(s2) === 'G' ? 0 : GAMMA * phi(dd, s2, b)) - phi(dd, s, b);   // 終わりの状態の Φ は 0
  return r;
}
let curGrid = null;
function gw2cell(s) { return curGrid.cell[s]; }
// 価値反復（決定的な迷路）で、その報酬での最適な価値と方策
function solve(g, dd, kind, b) {
  curGrid = g; let n = g.w * g.h, V = new Array(n).fill(0);
  for (let it = 0; it < 5000; it++) {
    let delta = 0;
    for (let s = 0; s < n; s++) {
      if (g.cell[s] === '#' || g.cell[s] === 'G') continue;
      let best = -Infinity; for (let a = 0; a < 4; a++) { let s2 = gridMove(g, s, a); best = Math.max(best, rewardOf(kind, s, s2, dd, b) + (g.cell[s2] === 'G' ? 0 : GAMMA * V[s2])); }
      delta = Math.max(delta, Math.abs(best - V[s])); V[s] = best;
    }
    if (delta < 1e-12) break;
  }
  let acts = V.map((v, s) => { if (g.cell[s] === '#' || g.cell[s] === 'G') return []; let q = [0, 1, 2, 3].map((a) => { let s2 = gridMove(g, s, a); return rewardOf(kind, s, s2, dd, b) + (g.cell[s2] === 'G' ? 0 : GAMMA * V[s2]); }); let m = maxOf(q); return [0, 1, 2, 3].filter((a) => q[a] >= m - 1e-9); });
  return { V, acts };
}
function rollout(g, plan) {               // S から最適な向き（最初のもの）に進む。ループしたら止める
  let s = g.cell.indexOf('S'), path = [s];
  for (let t = 0; t < 100 && g.cell[s] !== 'G'; t++) { s = gridMove(g, s, plan.acts[s][0]); path.push(s); }
  return path;
}
function agentStep(ag) {
  curGrid = gw;
  let s = ag.s, a = epsGreedy(ag.Q[s], EPS), s2 = gridMove(gw, s, a), done = gw.cell[s2] === 'G', r = rewardOf(ag.kind, s, s2, dist, bonus);
  ag.Q[s][a] += ALPHA * ((done ? r : r + GAMMA * maxOf(ag.Q[s2])) - ag.Q[s][a]);
  ag.shaped += r; ag.len++; ag.s = s2;
  if (done) ag.goals++;
  if (done || ag.len >= MAX_LEN) { ag.len = 0; ag.s = gw.cell.indexOf('S'); }
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (!paused) {
    let k = speed === 0 ? (frameCount % 4 === 0 ? 1 : 0) : speed === 1 ? 5 : 0;
    for (let i = 0; i < k; i++) { agents.forEach(agentStep); tick++; if (tick % 20 === 0) agents.forEach((ag) => ag.goalHist.push(ag.goals)); }
    if (speed === 2) while (performance.now() - t0 < 6) { agents.forEach(agentStep); tick++; if (tick % 20 === 0) agents.forEach((ag) => ag.goalHist.push(ag.goals)); }
  }
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('報酬の設計と「ずる」　' + tick + ' 歩', 40, 42);
  fill(170, 176, 210); textSize(15);
  text('F 速さ（' + SPEEDS[speed] + '）　スペース 一時停止　R やり直し　↑↓ ごほうびの大きさ ' + bonus.toFixed(2) + '　（γ = ' + GAMMA + '）', 40, 68);

  let bw = (width - 80) / 3, cs = Math.min(bw / (gw.w + 1), (height * 0.42) / gw.h), gy = 120;
  agents.forEach((ag, k) => {
    let gx = 40 + k * bw, plan = plans[k];
    fill(...KINDS[k][2]); textSize(14); textAlign(LEFT, BASELINE); text(KINDS[k][1], gx, gy - 10);
    drawCells(gw, gx, gy, cs);
    for (let s = 0; s < gw.w * gw.h; s++) {
      if (!plan.acts[s].length) continue;
      let [x, y] = cellXY(gw, s, gx, gy, cs); stroke(255, 110); strokeWeight(1.5); fill(255, 110);
      for (let a of plan.acts[s]) drawArrowIn(x + cs / 2, y + cs / 2, a, cs * 0.25);
    }
    let path = rollout(gw, plan);
    stroke(...KINDS[k][2]); strokeWeight(4); polyline(path.map((s) => { let [x, y] = cellXY(gw, s, gx, gy, cs); return [x + cs / 2 + (k - 1) * 3, y + cs / 2 + (k - 1) * 3]; }));
    let [ax, ay] = cellXY(gw, ag.s, gx, gy, cs); noStroke(); fill(255); circle(ax + cs / 2, ay + cs / 2, cs * 0.45);
    fill(220); textSize(13); textAlign(LEFT, BASELINE); let ok = gw.cell[path[path.length - 1]] === 'G';
    text('最適方策の道：' + (ok ? path.length - 1 + ' 歩で宝' : '宝に着かずに行ったり来たり'), gx, gy + gw.h * cs + 20);
    text('学習中：宝 ' + ag.goals + ' 回　もらった報酬 ' + fmtN(ag.shaped, 1), gx, gy + gw.h * cs + 40);
  });
  let g = { x: 70, y: gy + gw.h * cs + 110, w: width - 140, h: height - (gy + gw.h * cs + 110) - 80, x0: 0, x1: Math.max(100, agents[0].goalHist.length), y0: 0, y1: Math.max(10, ...agents.map((a) => a.goals)) };
  plotAxes(g, '歩数（× 20）', '宝に着いた回数（累計）', [0, g.x1], [0, Math.round(g.y1)]);
  agents.forEach((ag, k) => drawCurve(g, ag.goalHist, KINDS[k][2], 2.5));
  noStroke(); fill(170, 176, 210); textSize(13); textAlign(LEFT, BASELINE);
  text('ピンク（素朴な整形）は、報酬はたくさんもらうのに宝にはほとんど行かない = 設計した人の意図とちがうことを学んだ', g.x, g.y + g.h + 46);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') rebuild();
  if (key === UP_ARROW) { bonus = Math.min(0.5, Math.round((bonus + 0.01) * 100) / 100); rebuild(); }
  if (key === DOWN_ARROW) { bonus = Math.max(0, Math.round((bonus - 0.01) * 100) / 100); rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let g = gridParse(mapRows), dd = bfsDist(g, g.cell.indexOf('G')), pa = solve(g, dd, 'orig', 0.1), pn = solve(g, dd, 'naive', 0.1), pp = solve(g, dd, 'pot', 0.1);
  let same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]), cells = [];
  for (let s = 0; s < g.w * g.h; s++) if (pa.acts[s].length) cells.push(s);
  check('ポテンシャル整形の最適な行動の集合 = 元の報酬と同じ（' + cells.length + ' マスすべて）', cells.every((s) => same(pa.acts[s], pp.acts[s])));
  check('ポテンシャル整形の価値 = 元の価値 − Φ（ずれるだけ）', cells.every((s) => near(pp.V[s], pa.V[s] - phi(dd, s, 0.1), 1e-8)));
  let pathN = rollout(g, pn), pathA = rollout(g, pa);
  check('素朴な整形の最適方策は宝に着かない（100 歩たっても）、元の報酬は最短 ' + dd[g.cell.indexOf('S')] + ' 歩', g.cell[pathN[pathN.length - 1]] !== 'G' && pathA.length - 1 === dd[g.cell.indexOf('S')]);
  check('素朴な整形で最適な行動が変わるマスがある（' + cells.filter((s) => !same(pa.acts[s], pn.acts[s])).length + ' マス）', cells.some((s) => !same(pa.acts[s], pn.acts[s])));
  // Q 学習でも：素朴な整形は報酬を多くもらうのに宝に行かない
  let saveGw = gw, saveDist = dist; gw = g; dist = dd; seedRng(5);
  let ags = ['naive', 'pot'].map((kind) => ({ kind, Q: Array.from({ length: g.w * g.h }, () => [0, 0, 0, 0]), s: g.cell.indexOf('S'), len: 0, goals: 0, shaped: 0 }));
  let oldBonus = bonus; bonus = 0.1;
  for (let t = 0; t < 20000; t++) ags.forEach(agentStep);
  bonus = oldBonus; gw = saveGw; dist = saveDist;
  check('Q 学習 2 万歩：素朴な整形は宝 ' + ags[0].goals + ' 回だけで、報酬 ' + Math.round(ags[0].shaped) + ' のほとんどが「近づいたごほうび」。ポテンシャル整形は宝 ' + ags[1].goals + ' 回', ags[0].goals * 3 < ags[1].goals && ags[0].shaped - ags[0].goals > 10 * ags[0].goals);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↓ でごほうびを小さくしていくと、素朴な整形でも宝に向かうようになるのはどこから？（γ も関係する）
// 2. 素朴な整形で「離れたら −0.1」も足すと？ それはポテンシャル整形とどうちがう？
// 3. Φ をでたらめな値にしても、ポテンシャル整形なら最適方策は変わらない。試してみよう
// 4. ゲームや掃除ロボットで「報酬のずる」が起きそうな例を考えよう
// 5. 人がほめる・しかる報酬（14・15）でも、同じことが起きないかな？

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
