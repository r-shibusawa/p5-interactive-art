// ============================================
// 09 モデルを使う Dyna-Q ─ 実際の 1 歩で Q 学習をしたあと、「(s, a) → (r, s′)」の記録（モデル）から
// 思い出した経験で n 回の Q 学習をくり返す（頭の中の計画 = プランニング）。同じ経験を何度も使えるので、少ない歩数で学べる。
// 1：計画回数 n = 0・5・50 のくらべっこ　2：途中で道がふさがる迷路　3：途中で近道ができる迷路
// 2・3 では Dyna-Q と Dyna-Q+（長く試していない行動に小さなボーナス κ√τ）をくらべる
// 1 2 3 実験をえらぶ / F 速さ / スペース 一時停止 / R やり直し
// ============================================

const MAZES = {                           // ★ 迷路（S スタート、G ゴール）
  basic: ['.......#G', '..#....#.', 'S.#....#.', '..#......', '.....#...', '.........'],
  blockA: ['........G', '.........', '.........', '########.', '.........', '...S.....'],
  blockB: ['........G', '.........', '.........', '.########', '.........', '...S.....'],
  shortA: ['........G', '.........', '.........', '.########', '.........', '...S.....'],
  shortB: ['........G', '.........', '.........', '.#######.', '.........', '...S.....'],
};
const GAMMA = 0.95, ALPHA = 0.1, EPS = 0.1, KAPPA = 0.001;   // ★ 割引率・学習率・ε・Dyna-Q+ のボーナスの強さ
const CHANGE_AT = { 2: 1000, 3: 3000 }, TOTAL = { 2: 3000, 3: 6000 };   // ★ 迷路が変わる歩数と、全体の歩数
let expMode = 1, agents = [], tick = 0, speed = 1, paused = false, KINDS = {};
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  KINDS = { 1: [[0, false, 'n = 0（ただの Q 学習）', PINK], [5, false, 'n = 5', CYAN], [50, false, 'n = 50', GOLD]], 2: [[50, false, 'Dyna-Q（n = 50）', CYAN], [50, true, 'Dyna-Q+（n = 50）', GOLD]] };
  KINDS[3] = KINDS[2];
  selfTest(); seedRng(6); resetMode();
}
function mazeFor(m, t) {
  if (m === 1) return MAZES.basic;
  if (m === 2) return t < CHANGE_AT[2] ? MAZES.blockA : MAZES.blockB;
  return t < CHANGE_AT[3] ? MAZES.shortA : MAZES.shortB;
}
function resetMode() { tick = 0; agents = KINDS[expMode].map(([n, plus]) => makeAgent(n, plus, gridParse(mazeFor(expMode, 0)))); }
function makeAgent(n, plus, g) { return { n, plus, g, Q: Array.from({ length: g.w * g.h }, () => [0, 0, 0, 0]), model: new Map(), keys: [], seen: new Set(), s: g.cell.indexOf('S'), len: 0, epLens: [], cum: 0, cumHist: [0] }; }
function qUpdate(ag, s, a, r, s2, done) { let t = done ? r : r + GAMMA * maxOf(ag.Q[s2]); ag.Q[s][a] += ALPHA * (t - ag.Q[s][a]); }
// ★ Dyna-Q の 1 歩：(1) 実際に動いて Q 学習 (2) モデルに記録 (3) モデルからランダムに n 回思い出して Q 学習
function dynaStep(ag, g, now) {
  let s = ag.s, a = epsGreedy(ag.Q[s], EPS), s2 = gridMove(g, s, a), done = g.cell[s2] === 'G', r = done ? 1 : 0;
  qUpdate(ag, s, a, r, s2, done);
  if (ag.plus && !ag.seen.has(s)) {     // Dyna-Q+：はじめて来た状態の、まだ試していない行動も「その場にとどまる・報酬 0」としてモデルに入れる
    ag.seen.add(s);
    for (let b = 0; b < 4; b++) { let k = s * 4 + b; if (!ag.model.has(k)) { ag.keys.push(k); ag.model.set(k, [0, s, false, 0]); } }
  }
  let k = s * 4 + a; if (!ag.model.has(k)) ag.keys.push(k);
  ag.model.set(k, [r, s2, done, now]);
  for (let i = 0; i < ag.n; i++) {
    let kk = ag.keys[Math.floor(rnd() * ag.keys.length)], [rr, ss, dd, tt] = ag.model.get(kk);
    qUpdate(ag, Math.floor(kk / 4), kk % 4, rr + (ag.plus ? KAPPA * Math.sqrt(now - tt) : 0), ss, dd);
  }
  ag.len++; ag.cum += r; ag.cumHist.push(ag.cum);
  if (done) { ag.epLens.push(ag.len); ag.len = 0; ag.s = g.cell.indexOf('S'); } else ag.s = s2;
}
function stepAll() {
  if (expMode === 1) { for (let ag of agents) if (ag.epLens.length < 50) dynaStep(ag, ag.g, tick); tick++; return; }
  if (tick >= TOTAL[expMode]) return;
  if (tick === CHANGE_AT[expMode]) for (let ag of agents) ag.g = gridParse(mazeFor(expMode, tick));   // ここで迷路が変わる（エージェントには知らせない）
  for (let ag of agents) dynaStep(ag, ag.g, tick);
  tick++;
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (!paused) { if (speed === 0) { if (frameCount % 3 === 0) stepAll(); } else if (speed === 1) { for (let k = 0; k < 5; k++) stepAll(); } else while (performance.now() - t0 < 6) stepAll(); }
  let title = { 1: '計画回数 n をくらべる', 2: '道がふさがる迷路（' + CHANGE_AT[2] + ' 歩で変化）', 3: '近道ができる迷路（' + CHANGE_AT[3] + ' 歩で変化）' }[expMode];
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('Dyna-Q：' + title + '　' + tick + ' 歩', 40, 42);
  fill(170, 176, 210); textSize(15);
  text('1 2 3 実験　F 速さ（' + SPEEDS[speed] + '）　スペース 一時停止　R やり直し', 40, 68);

  // ---- 迷路（エージェントごと、色 = max Q）
  let kinds = KINDS[expMode], cs = Math.min(40, (width - 120) / (agents[0].g.w * agents.length + agents.length), (height * 0.3) / agents[0].g.h), gy = 120;
  agents.forEach((ag, k) => {
    let gx = 40 + k * (ag.g.w * cs + 24);
    for (let s = 0; s < ag.g.w * ag.g.h; s++) {
      let [x, y] = cellXY(ag.g, s, gx, gy, cs), c = ag.g.cell[s]; noStroke();
      if (c === '#') fill(70, 76, 120); else if (c === 'G') fill(...GOLD); else valueFill(maxOf(ag.Q[s]), -1, 1);
      rect(x, y, cs - 1, cs - 1, 2);
    }
    let [ax, ay] = cellXY(ag.g, ag.s, gx, gy, cs); fill(...kinds[k][3]); circle(ax + cs / 2, ay + cs / 2, cs * 0.6);
    fill(...kinds[k][3]); textSize(14); textAlign(LEFT, BASELINE); text(kinds[k][2], gx, gy - 8);
  });
  let gh = agents[0].g.h * cs, g;
  if (expMode === 1) {
    g = { x: 70, y: gy + gh + 70, w: width - 140, h: height - (gy + gh + 70) - 70, x0: 1, x1: 50, y0: 0, y1: 800 };
    plotAxes(g, 'エピソード', 'ゴールまでの歩数（800 で頭打ちに表示）', [1, 10, 20, 30, 40, 50], [0, 200, 400, 600, 800]);
    stroke(...LIME, 120); strokeWeight(1); line(g.x, gY(g, 14), g.x + g.w, gY(g, 14));
    agents.forEach((ag, k) => drawCurve(g, ag.epLens, kinds[k][3], 2.5, 1));
    noStroke(); fill(170, 176, 210); textSize(13); text('緑の線 = 最短 14 歩。n が大きいほど、少ないエピソードで最短に近づく', g.x + 10, g.y + 18);
  } else {
    g = { x: 70, y: gy + gh + 70, w: width - 140, h: height - (gy + gh + 70) - 70, x0: 0, x1: TOTAL[expMode], y0: 0, y1: expMode === 2 ? 150 : 400 };
    plotAxes(g, '歩数', 'ゴールに着いた回数（累計）', [0, CHANGE_AT[expMode], TOTAL[expMode]], [0, g.y1 / 2, g.y1]);
    stroke(...PINK, 150); strokeWeight(1); line(gX(g, CHANGE_AT[expMode]), g.y, gX(g, CHANGE_AT[expMode]), g.y + g.h);
    agents.forEach((ag, k) => drawCurve(g, ag.cumHist, kinds[k][3], 2.5));
    noStroke(); fill(170, 176, 210); textSize(13);
    text(expMode === 2 ? 'ピンクの線で右の通り道がふさがる。グラフが平らな間 = 新しい道を探している' : 'ピンクの線で右に近道ができる。Dyna-Q は古い道で満足して気づきにくい', g.x + 10, g.y + 18);
  }
  legend(g.x + g.w - 210, g.y + g.h - 20 * kinds.length - 6, kinds.map((k) => [k[3], k[2]]));
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { expMode = +key; resetMode(); }
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetMode();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let g = gridParse(MAZES.basic), tot = {};
  for (let n of [0, 5, 50]) {
    tot[n] = 0;
    for (let seed = 1; seed <= 3; seed++) { seedRng(seed); let ag = makeAgent(n, false, g), t = 0; while (ag.epLens.length < 20) dynaStep(ag, g, t++); tot[n] += ag.epLens.slice(1).reduce((a, b) => a + b, 0) / 3; }
  }
  check('2〜20 エピソード目の歩数の合計：n = 50（' + Math.round(tot[50]) + '）< n = 5（' + Math.round(tot[5]) + '）< n = 0（' + Math.round(tot[0]) + '）', tot[50] < tot[5] && tot[5] < tot[0]);
  let eps = { 0: 0, 50: 0 };             // 「何エピソードで歩数 ≤ 20 に来るか」
  for (let n of [0, 50]) for (let seed = 1; seed <= 3; seed++) { seedRng(seed); let ag = makeAgent(n, false, g), t = 0; while (ag.epLens.length < 60 && !(ag.epLens.length && ag.epLens[ag.epLens.length - 1] <= 20)) dynaStep(ag, g, t++); eps[n] += ag.epLens.length / 3; }
  check('計画ありは少ないエピソードでゴールまで 20 歩以下に（n = 50：' + fmtN(eps[50], 1) + ' 回、n = 0：' + fmtN(eps[0], 1) + ' 回）', eps[50] < eps[0]);
  let gA = gridParse(MAZES.shortA), gB = gridParse(MAZES.shortB), after = [0, 0];
  [false, true].forEach((plus, i) => { for (let seed = 1; seed <= 2; seed++) { seedRng(seed); let ag = makeAgent(50, plus, gA); for (let t = 0; t < 6000; t++) { dynaStep(ag, t < 3000 ? gA : gB, t); if (t === 2999) after[i] -= ag.cum; } after[i] += ag.cum; } });
  check('近道ができたあと 3000 歩でゴールした回数：Dyna-Q+ ' + after[1] + ' > Dyna-Q ' + after[0], after[1] > after[0]);
  let toy = makeAgent(3, false, g); seedRng(1); dynaStep(toy, g, 0);
  let rec = toy.model.get(toy.keys[0]);
  check('1 歩動くと、モデルに (s, a) → (r, s′) が 1 件記録される（s′ = 実際に着いたマス）', toy.keys.length === 1 && toy.model.size === 1 && rec[1] === toy.s && rec[0] === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 実験 1 で n を 500 にすると？（考えるほど速く学べるが、1 歩の計算は重くなる）
// 2. 実験 2：ふさがったあと、Dyna-Q は何歩くらいで新しい道を見つける？
// 3. 実験 3：KAPPA を 0.01 にすると、近道に気づくのは早くなる？ 遅くなる？
// 4. モデルがまちがっている（世界が変わった）とき、計画はむしろ害になる。どんなときか考えよう
// 5. 自分の迷路を MAZES に足してみよう

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
