// ============================================
// 06 崖歩きと SARSA ─ 4 × 12 のマス。下の段は崖（落ちると −100 でスタートに戻る）、1 歩ごとに −1
// Q 学習は「次はいちばん良い行動」を仮定するので、崖ぎりぎりの最短路を学ぶ。でも実際は ε のぶんでたらめに動くので、よく落ちる。
// SARSA は「次に実際にとる行動」Q(s′, a′) で更新する（方策オン）。でたらめな一歩も計算に入るので、崖から離れた安全な遠回りを学ぶ
// F 速さ / スペース 一時停止 / ↑↓ ε / R やり直し
// ============================================

const CLIFF_ROWS = [                     // ★ 崖のマップ（P = 崖）
  '............',
  '............',
  '............',
  'SPPPPPPPPPPG',
];
let eps = 0.1;                           // ★ 探索の割合 ε（ε を小さくすると 2 つの差は？）
const ALPHA = 0.5, FALL_R = -100;        // ★ 学習率、崖に落ちたときの報酬
let gw, agents = [], speed = 1, paused = false;
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() { createCanvas(windowWidth, windowHeight); gw = gridParse(CLIFF_ROWS); selfTest(); seedRng(3); resetAgents(); }
function resetAgents() { agents = [makeAgent(gw, false), makeAgent(gw, true)]; }
function makeAgent(g, sarsa) { let s = g.cell.indexOf('S'); return { sarsa, Q: Array.from({ length: g.w * g.h }, () => [0, 0, 0, 0]), s, a: -1, tot: 0, len: 0, rewards: [], falls: 0 }; }
function cliffMove(g, s, a) {            // 崖に入ったら −100 でスタートへ
  let s2 = gridMove(g, s, a);
  if (g.cell[s2] === 'P') return { s2: g.cell.indexOf('S'), r: FALL_R, fell: true };
  return { s2, r: -1, fell: false };
}
// ★ 1 歩：Q 学習と SARSA のちがいは target の 1 行だけ
function agentStep(ag, g, ep) {
  if (ag.a < 0) ag.a = epsGreedy(ag.Q[ag.s], ep);
  let s = ag.s, a = ag.a, o = cliffMove(g, s, a), done = g.cell[o.s2] === 'G';
  let a2 = epsGreedy(ag.Q[o.s2], ep);    // 次に実際にとる行動
  let target = done ? o.r : o.r + (ag.sarsa ? ag.Q[o.s2][a2] : maxOf(ag.Q[o.s2]));
  ag.Q[s][a] += ALPHA * (target - ag.Q[s][a]);
  ag.tot += o.r; ag.len++; if (o.fell) ag.falls++;
  if (done || ag.len >= 1000) { ag.rewards.push(ag.tot); ag.tot = 0; ag.len = 0; ag.s = g.cell.indexOf('S'); ag.a = -1; }
  else { ag.s = o.s2; ag.a = a2; }
}
function greedyPath(ag, g) {
  let s = g.cell.indexOf('S'), p = [s];
  for (let t = 0; t < 60 && g.cell[s] !== 'G'; t++) { let o = cliffMove(g, s, argmaxFirst(ag.Q[s])); if (o.fell) return { p, ok: false }; s = o.s2; if (p.includes(s)) return { p, ok: false }; p.push(s); }
  return { p, ok: g.cell[s] === 'G' };
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (!paused) {
    let n = speed === 0 ? (frameCount % 4 === 0 ? 1 : 0) : 1;
    for (let k = 0; k < n; k++) for (let ag of agents) agentStep(ag, gw, eps);
    if (speed === 2) while (performance.now() - t0 < 6) for (let ag of agents) agentStep(ag, gw, eps);
  }
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('崖歩き：Q 学習 と SARSA（ε = ' + eps.toFixed(2) + '）', 40, 42);
  fill(170, 176, 210); textSize(15);
  text('F 速さ（' + SPEEDS[speed] + '）　スペース 一時停止　↑↓ ε　R やり直し', 40, 68);

  let cs = Math.min(44, (width * 0.5 - 60) / gw.w), names = ['Q 学習（方策オフ）', 'SARSA（方策オン）'], cols = [GOLD, CYAN];
  agents.forEach((ag, k) => {
    let gx = 40, gy = 120 + k * (gw.h * cs + 90);
    fill(...cols[k]); noStroke(); textSize(17); textAlign(LEFT, BASELINE);
    text(names[k] + '　エピソード ' + ag.rewards.length + '　落ちた回数 ' + ag.falls, gx, gy - 10);
    drawCells(gw, gx, gy, cs);
    for (let s = 0; s < gw.w * gw.h; s++) {
      if (gw.cell[s] === 'P' || gw.cell[s] === 'G') continue;
      let [x, y] = cellXY(gw, s, gx, gy, cs); noStroke(); valueFill(maxOf(ag.Q[s]), -30, 0); rect(x + 1, y + 1, cs - 2, cs - 2, 3);
      if (ag.rewards.length) { stroke(255, 160); strokeWeight(1.5); fill(255, 160); drawArrowIn(x + cs / 2, y + cs / 2, argmaxFirst(ag.Q[s]), cs * 0.25); }
    }
    let gp = greedyPath(ag, gw);
    stroke(...cols[k]); strokeWeight(4); polyline(gp.p.map((s) => { let [x, y] = cellXY(gw, s, gx, gy, cs); return [x + cs / 2, y + cs / 2]; }));
    let [ax, ay] = cellXY(gw, ag.s, gx, gy, cs); noStroke(); fill(255); circle(ax + cs / 2, ay + cs / 2, cs * 0.45);
    fill(200, 205, 235); textSize(14); text('貪欲方策の道：' + (gp.ok ? gp.p.length - 1 + ' 歩' : 'まだ'), gx, gy + gw.h * cs + 20);
  });

  // ---- エピソードごとの報酬の合計（直近 20 回の平均）
  let g = { x: width * 0.58, y: 120, w: width * 0.38, h: height - 300, x0: 0, x1: Math.max(100, ...agents.map((a) => a.rewards.length)), y0: -120, y1: 0 };
  plotAxes(g, 'エピソード', '1 エピソードの報酬の合計（20 回の平均）', [0, Math.round(g.x1 / 2), g.x1], [-120, -80, -40, -13, 0]);
  stroke(...LIME, 120); strokeWeight(1); line(g.x, gY(g, -13), g.x + g.w, gY(g, -13));
  agents.forEach((ag, k) => drawCurve(g, smoothArr(ag.rewards, 20), cols[k], 2.5));
  legend(g.x + 12, g.y + g.h - 30, [[GOLD, 'Q 学習'], [CYAN, 'SARSA']]);
  let last = (ag) => meanOf(ag.rewards.slice(-100));
  noStroke(); fill(230); textSize(15); textAlign(LEFT, BASELINE);
  text('直近 100 回の平均：Q 学習 ' + fmtN(last(agents[0]), 1) + '　SARSA ' + fmtN(last(agents[1]), 1), g.x, g.y + g.h + 50);
  fill(170, 176, 210); textSize(13);
  text('緑の線 = 最短 13 歩（−13）。学習中の成績は SARSA が上、学んだ道の短さは Q 学習が上', g.x, g.y + g.h + 74);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) eps = Math.min(0.5, Math.round((eps + 0.05) * 100) / 100);
  if (key === DOWN_ARROW) eps = Math.max(0, Math.round((eps - 0.05) * 100) / 100);
  if (key === 'r' || key === 'R') resetAgents();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let g = gridParse(CLIFF_ROWS), okSarsa = true, okQ = true, okSafe = false, msg = [];
  for (let seed = 1; seed <= 5; seed++) {
    let res = [false, true].map((sarsa) => {
      seedRng(seed); let ag = makeAgent(g, sarsa);
      while (ag.rewards.length < 500) agentStep(ag, g, 0.1);
      return { avg: meanOf(ag.rewards.slice(-100)), gp: greedyPath(ag, g) };
    });
    if (!(res[1].avg > res[0].avg)) okSarsa = false;
    if (!(res[0].gp.ok && res[0].gp.p.length - 1 === 13)) okQ = false;
    if (res[1].gp.ok && res[1].gp.p.length - 1 > 13) okSafe = true;
    msg.push(fmtN(res[1].avg, 0) + '>' + fmtN(res[0].avg, 0));
  }
  check('最後の 100 エピソードの平均報酬：SARSA > Q 学習（5 つの種すべて：' + msg.join('、') + '）', okSarsa);
  check('Q 学習の貪欲方策の道 = 崖ぎりぎりの最短 13 歩（5 つの種すべて）', okQ);
  check('SARSA の貪欲方策の道は 13 歩より長い（崖から離れた遠回り）', okSafe);
  let o = cliffMove(g, g.cell.indexOf('S'), 1);
  check('崖に入ると報酬 −100 でスタートに戻る', o.fell && o.r === -100 && o.s2 === g.cell.indexOf('S'));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ε を 0 にすると、2 つの成績はどうなる？（でたらめな一歩がなければ崖ぎりぎりでも落ちない）
// 2. 学習の途中で ε を少しずつ小さくすると、SARSA の道はどう変わる？
// 3. FALL_R を −10 にすると、SARSA も崖ぎりぎりを通る？
// 4. Q 学習と SARSA の target の行を見くらべよう（ちがうのは 1 か所だけ）
// 5. 崖の形を変えてみよう（CLIFF_ROWS の P を動かす）

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
