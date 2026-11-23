// ============================================
// 03 方策反復 ─ 「方策評価（いまの方策の価値を計算）」→「方策改善（価値を見て貪欲に向きを変える）」のくり返し
// 方策を改善すると価値は下がらない（方策改善定理）。方策の種類は有限なので、数回で最適方策にたどり着いて止まる。
// 価値反復（02）と、くり返しの回数・計算量をくらべる
// スペース 1 段階すすめる / A 自動 / R 方策をでたらめに / U 全部「上」 / ↑↓ γ / ← → すべり / クリック 床→壁→宝→穴
// ============================================

let mapRows = [                          // ★ 地図（02 と同じ）
  '..........',
  '.....#....',
  '..........',
  'S........G',
  '.PPPPPPPP.',
  '..........',
];
let gamma = 0.95, slip = 0.2;            // ★ 割引率とすべりやすさ
const STEP_R = -0.04, TOL = 1e-8;        // ★ 1 歩の報酬、方策評価の収束の判定
let gw, mdp, policy = [], vTable = [], phase = 'eval', improveLog = [], auto = true, evalSweeps = 0, viInfo = null, gx = 40, gy = 110, cs = 60, lastChanged = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  gw = gridParse(mapRows);
  selfTest();
  rebuild();
}
function rebuild() {
  mdp = buildMdp(gw, slip, STEP_R);
  viInfo = valueIteration(mdp, gamma, TOL, 20000);       // くらべる相手：価値反復
  resetPolicy(false);
}
function resetPolicy(randomize) {
  policy = new Array(mdp.nS).fill(0).map(() => (randomize ? Math.floor(rnd() * 4) : 0));
  vTable = new Array(mdp.nS).fill(0); phase = 'eval'; improveLog = []; evalSweeps = 0; lastChanged = [];
}

// ★ 方策評価の 1 回：V(s) ← Σ_s' P(s′|s,π(s)) (r + γ V(s′))（行動は方策が決めた 1 つだけ）。戻り値 = 最大の変化量
function evalSweep(m, pi, V, gam) {
  let d = 0;
  for (let s = 0; s < m.nS; s++) { if (m.term[s]) continue; let v = qValue(m, V, gam, s, pi[s]); d = Math.max(d, Math.abs(v - V[s])); V[s] = v; }
  return d;
}
// ★ 方策改善：各マスで Q(s, a) がいちばん大きい向きへ。同点ならいまの向きのまま（行ったり来たりを防ぐ）
function improve(m, pi, V, gam) {
  let changed = [];
  for (let s = 0; s < m.nS; s++) {
    if (m.term[s]) continue;
    let q = [0, 1, 2, 3].map((a) => qValue(m, V, gam, s, a)), best = argmaxFirst(q);
    if (q[best] > q[pi[s]] + 1e-12) { pi[s] = best; changed.push(s); }
  }
  return changed;
}
function policyIteration(m, pi0, gam) {          // 全部まとめて（自己テスト用）
  let pi = pi0.slice(), V = new Array(m.nS).fill(0), sweeps = 0, rounds = 0, vs = [];
  for (; rounds < 100; rounds++) {
    let d; do { d = evalSweep(m, pi, V, gam); sweeps++; } while (d >= TOL && sweeps < 1e6);
    vs.push(V.slice());
    if (improve(m, pi, V, gam).length === 0) break;
  }
  return { pi, V, sweeps, rounds: rounds + 1, vs };
}
function advance() {                             // 評価を 1 回すすめる／評価が終わっていたら改善
  if (phase === 'done') return;
  if (phase === 'eval') {
    let d = evalSweep(mdp, policy, vTable, gamma); evalSweeps++;
    if (d < TOL) phase = 'improve';
  } else {
    lastChanged = improve(mdp, policy, vTable, gamma);
    improveLog.push({ sweeps: evalSweeps, changed: lastChanged.length, vS: vTable[gw.cell.indexOf('S')] });
    phase = lastChanged.length ? 'eval' : 'done';
  }
}

function draw() {
  background(...BG);
  if (auto) { if (phase === 'eval') { for (let k = 0; k < 4; k++) if (phase === 'eval') advance(); } else if (frameCount % 45 === 0) advance(); }
  cs = Math.min(64, (width * 0.55 - 60) / gw.w, (height - 230) / gw.h);
  let label = { eval: '方策評価中', improve: '評価が収束 → 次は改善', done: '方策が変わらない → 最適方策' }[phase];
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('方策反復：改善 ' + improveLog.length + ' 回目　' + label, 40, 42);
  fill(170, 176, 210); textSize(15);
  text('スペース 1 段階　A 自動（' + (auto ? 'ON' : 'OFF') + '）　R でたらめな方策から　U 全部「上」から　↑↓ γ = ' + gamma.toFixed(2) + '　← → すべり = ' + slip.toFixed(1), 40, 68);

  for (let s = 0; s < mdp.nS; s++) {
    if (mdp.term[s]) continue;
    let [x, y] = cellXY(gw, s, gx, gy, cs); noStroke(); valueFill(vTable[s], -1, 1); rect(x + 1, y + 1, cs - 2, cs - 2, 4);
    if (lastChanged.includes(s)) { noFill(); stroke(...PINK); strokeWeight(2); rect(x + 3, y + 3, cs - 6, cs - 6, 4); }
  }
  drawCells(gw, gx, gy, cs, true);
  for (let s = 0; s < mdp.nS; s++) {
    if (mdp.term[s]) continue;
    let [x, y] = cellXY(gw, s, gx, gy, cs);
    noStroke(); fill(235); textAlign(CENTER, TOP); textSize(Math.max(10, cs * 0.2)); text(fmtN(vTable[s]), x + cs / 2, y + 3);
    stroke(255); strokeWeight(2); fill(255); drawArrowIn(x + cs / 2, y + cs * 0.6, policy[s], cs * 0.22);
  }
  noStroke(); fill(150, 156, 190); textSize(13); textAlign(LEFT, BASELINE);
  text('矢印 = いまの方策 π(s)（1 マス 1 つ）。ピンクの枠 = 直前の改善で向きが変わったマス', gx, gy + gw.h * cs + 24);

  // ---- 記録の表と、価値反復との比較
  let px = gx + gw.w * cs + 50, py = 120;
  fill(230); textSize(16); text('改善　評価の回数（累計）　向きが変わったマス　V(S)', px, py);
  improveLog.slice(-10).forEach((h, i) => { fill(h.changed ? 210 : color(...GOLD)); text((improveLog.length - Math.min(10, improveLog.length) + i + 1) + '　　' + h.sweeps + '　　　　　' + h.changed + '　　　　　　' + fmtN(h.vS, 4), px, py + 26 + i * 22); });
  let ty = py + 270, actsPI = evalSweeps * mdp.nS + improveLog.length * mdp.nS * 4, actsVI = viInfo.its * mdp.nS * 4;
  fill(...CYAN); text('方策反復：改善 ' + improveLog.length + ' 回、評価 ' + evalSweeps + ' 回（Q の計算 約 ' + actsPI + ' 回）', px, ty);
  fill(...GOLD); text('価値反復（02）：' + viInfo.its + ' 回（Q の計算 約 ' + actsVI + ' 回）', px, ty + 26);
  fill(170, 176, 210); textSize(14);
  text('方策反復は「改善」の回数がとても少ない。', px, ty + 58);
  text('そのかわり 1 回の評価に何十回もの計算が要る', px, ty + 78);
  if (phase === 'done') {
    let same = 0, tot = 0; for (let s = 0; s < mdp.nS; s++) if (!mdp.term[s]) { tot++; if (optimalActs(mdp, viInfo.V, gamma, s, 1e-6).includes(policy[s])) same++; }
    fill(...LIME); textSize(16); text('価値反復の最適な向きと一致：' + same + ' / ' + tot + ' マス', px, ty + 112);
  }
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  let s = cellAt(gw, gx, gy, cs, mouseX, mouseY);
  if (s < 0 || gw.cell[s] === 'S') return;
  let order = ['.', '#', 'G', 'P']; gw.cell[s] = order[(order.indexOf(gw.cell[s]) + 1) % 4]; rebuild();
}
function keyPressed() {
  if (key === ' ') { if (phase === 'eval') { while (phase === 'eval') advance(); } else advance(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') resetPolicy(true);
  if (key === 'u' || key === 'U') resetPolicy(false);
  if (key === UP_ARROW) { gamma = Math.min(0.99, Math.round((gamma + 0.05) * 100) / 100); rebuild(); }
  if (key === DOWN_ARROW) { gamma = Math.max(0.05, Math.round((gamma - 0.05) * 100) / 100); rebuild(); }
  if (key === RIGHT_ARROW) { slip = Math.min(0.8, Math.round((slip + 0.1) * 10) / 10); rebuild(); }
  if (key === LEFT_ARROW) { slip = Math.max(0, Math.round((slip - 0.1) * 10) / 10); rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let gwT = gridParse(mapRows), okV = true, okPi = true, okMono = true, okRounds = true, maxRounds = 0;
  for (let sl of [0, 0.2]) {
    let m = buildMdp(gwT, sl, STEP_R), vi = valueIteration(m, 0.95, 1e-12, 20000);
    seedRng(21 + sl * 10);
    for (let trial = 0; trial < 4; trial++) {
      let pi0 = trial === 0 ? new Array(m.nS).fill(0) : Array.from({ length: m.nS }, () => Math.floor(rnd() * 4));
      let pr = policyIteration(m, pi0, 0.95); maxRounds = Math.max(maxRounds, pr.rounds);
      if (pr.rounds > 15) okRounds = false;
      for (let s = 0; s < m.nS; s++) {
        if (m.term[s]) continue;
        if (!near(pr.V[s], vi.V[s], 1e-6)) okV = false;
        if (!optimalActs(m, vi.V, 0.95, s, 1e-6).includes(pr.pi[s])) okPi = false;
      }
      for (let k = 1; k < pr.vs.length; k++) for (let s = 0; s < m.nS; s++) if (pr.vs[k][s] < pr.vs[k - 1][s] - 1e-6) okMono = false;   // 評価を 10⁻⁸ で打ち切る誤差（約 γ/(1−γ) × 10⁻⁸）は見のがす
    }
  }
  check('方策反復は 15 回以内の改善で止まる（いちばん多くて ' + maxRounds + ' 回、すべり 0 と 0.2、初期方策 4 通り）', okRounds);
  check('最後の価値 = 価値反復の V*（誤差 10⁻⁶ 以内）', okV);
  check('最後の方策の向きは、どのマスでも価値反復の最適な向きの 1 つ', okPi);
  check('方策改善定理：改善のたびに、どのマスの価値も下がらない（評価の打ち切り誤差 10⁻⁶ まで）', okMono);
  // 改善しても変わらない = 貪欲方策が自分自身
  let m = buildMdp(gwT, 0.2, STEP_R), pr = policyIteration(m, new Array(m.nS).fill(0), 0.95), pi2 = pr.pi.slice();
  check('止まった方策をもう一度改善しても変わらない', improve(m, pi2, pr.V, 0.95).length === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. U（全部「上」）と R（でたらめ）で始めて、改善の回数をくらべよう
// 2. 評価のたびに V を 0 からやり直すと、評価の回数はどれくらい増える？（いまは前の V から続けている）
// 3. γ を 0.99 にすると、価値反復と方策反復の回数はそれぞれどう変わる？
// 4. 評価を最後まで待たずに数回で打ち切って改善すると？（価値反復との中間）
// 5. 壁を置いて迷路にすると、改善の回数はどう変わる？

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
