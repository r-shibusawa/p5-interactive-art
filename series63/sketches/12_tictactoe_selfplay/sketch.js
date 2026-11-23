// ============================================
// 12 三目並べの自己対戦 ─ 盤面の「価値」を表に覚えるエージェント同士を、何万回も戦わせる
// 自分が打ったあとの盤面（アフターステート）の価値 V = 「そこから自分が勝つ見こみ」（勝ち 1、引き分け 0.5、負け 0）。
// 打つ手は「打ったあとの V がいちばん大きいマス」。時々（ε）でたらめに打って新しい盤面を試す。
// 次に自分の番が来たら、前の盤面の V を今の盤面の V に近づける（TD 学習）：V ← V + α (V′ − V)
// 盤をクリックして対戦 / N 新しい対局 / T 先手・後手を交代 / F 学習の速さ / スペース 学習を止める / R 学習をやり直す
// ============================================

const ALPHA = 0.2, EPS = 0.3;            // ★ 学習率と、自己対戦でのでたらめな手の割合
const WIN_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
let vTable = new Map(), games = 0, evalCurve = [], speed = 1, paused = false;
let board = [], humanFirst = true, turn = 1, result = 0, message = '';
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(12); vTable = new Map(); newBoard(); }

// ---- 盤：0 空き、1 = ×（先手）、2 = ○（後手）
function winnerOf(b) { for (let [p, q, r] of WIN_LINES) if (b[p] && b[p] === b[q] && b[p] === b[r]) return b[p]; return b.includes(0) ? 0 : 3; }   // 3 = 引き分け
function keyOf(b, me) { let k = 0; for (let i = 0; i < 9; i++) k = k * 3 + (b[i] === 0 ? 0 : b[i] === me ? 1 : 2); return k; }   // 自分の石を 1 として数にする
function valueOf(b, me) {                // 表にない盤面：終わっていれば結果、そうでなければ 0.5
  let k = keyOf(b, me); if (vTable.has(k)) return vTable.get(k);
  let w = winnerOf(b); return w === me ? 1 : w === 0 || w === 3 ? 0.5 : 0;
}
function chooseMove(b, me, eps) {
  let moves = []; for (let i = 0; i < 9; i++) if (!b[i]) moves.push(i);
  if (rnd() < eps) return { m: moves[Math.floor(rnd() * moves.length)], explore: true };
  let vals = moves.map((m) => { b[m] = me; let v = valueOf(b, me); b[m] = 0; return v; });
  return { m: moves[argmaxR(vals)], explore: false };
}
// ★ 自己対戦 1 局。どちらの手番も同じ表（自分の石 = 1 として見る）で学ぶ
function selfPlayGame(alpha, eps) {
  let b = new Array(9).fill(0), me = 1, prev = { 1: null, 2: null };
  for (;;) {
    let { m, explore } = chooseMove(b, me, eps); b[m] = me;
    let w = winnerOf(b);
    if (prev[me] && !explore) { let pv = valueOf(prev[me], me); vTable.set(keyOf(prev[me], me), pv + alpha * (valueOf(b, me) - pv)); }   // TD 学習
    prev[me] = b.slice();
    if (w) {                             // 終わったら、相手の最後の盤面も結果に近づける
      let o = 3 - me; if (prev[o]) { let pv = valueOf(prev[o], o); vTable.set(keyOf(prev[o], o), pv + alpha * ((w === 3 ? 0.5 : 0) - pv)); }
      return w;
    }
    me = 3 - me;
  }
}
function vsRandom(side) {                // 学習した手（ε = 0）とでたらめな相手。戻り値：1 勝ち、0 引き分け、−1 負け
  let b = new Array(9).fill(0), me = 1;
  for (;;) {
    let m; if (me === side) m = chooseMove(b, me, 0).m; else { let mv = []; for (let i = 0; i < 9; i++) if (!b[i]) mv.push(i); m = mv[Math.floor(rnd() * mv.length)]; }
    b[m] = me; let w = winnerOf(b); if (w) return w === 3 ? 0 : w === side ? 1 : -1;
    me = 3 - me;
  }
}
function evaluate(n) { let c = { win: 0, draw: 0, lose: 0 }; for (let side of [1, 2]) for (let i = 0; i < n; i++) { let r = vsRandom(side); r > 0 ? c.win++ : r < 0 ? c.lose++ : c.draw++; } for (let k in c) c[k] /= 2 * n; return c; }

// ---- 人との対局
function newBoard() { board = new Array(9).fill(0); turn = 1; result = 0; message = humanFirst ? 'あなたは ×（先手）。マスをクリック' : 'あなたは ○（後手）'; }
function agentSide() { return humanFirst ? 2 : 1; }
function play(m) {
  board[m] = turn; result = winnerOf(board); turn = 3 - turn;
  if (result) message = result === 3 ? '引き分け！ N で次の対局' : result === agentSide() ? 'エージェントの勝ち。N で次の対局' : 'あなたの勝ち！ N で次の対局';
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (!paused) {
    let budget = speed === 0 ? 0.3 : speed === 1 ? 2 : 7;
    while (performance.now() - t0 < budget) { selfPlayGame(ALPHA, EPS); games++; if (games % 1000 === 0) evalCurve.push(evaluate(100)); }
  }
  if (!result && turn === agentSide() && frameCount % 20 === 0) play(chooseMove(board, turn, 0).m);

  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('三目並べの自己対戦：' + games + ' 局　覚えた盤面 ' + vTable.size, 40, 42);
  fill(170, 176, 210); textSize(15);
  text('クリック 打つ　N 新しい対局　T 先手・後手（いま あなたが' + (humanFirst ? '先手' : '後手') + '）　F 学習の速さ（' + SPEEDS[speed] + '）　スペース 学習を止める　R やり直し', 40, 68);

  // ---- 盤（空きマスに、エージェントから見た価値）
  let cs = Math.min(130, (height - 260) / 3), bx = 60, by = 110;
  for (let i = 0; i < 9; i++) {
    let x = bx + (i % 3) * cs, y = by + Math.floor(i / 3) * cs;
    fill(26, 30, 60); stroke(80, 86, 130); strokeWeight(2); rect(x, y, cs, cs, 6);
    if (board[i] === 1) { stroke(...CYAN); strokeWeight(8); line(x + cs * 0.25, y + cs * 0.25, x + cs * 0.75, y + cs * 0.75); line(x + cs * 0.75, y + cs * 0.25, x + cs * 0.25, y + cs * 0.75); }
    else if (board[i] === 2) { noFill(); stroke(...GOLD); strokeWeight(8); circle(x + cs / 2, y + cs / 2, cs * 0.55); }
    else if (!result) { board[i] = agentSide(); let v = valueOf(board, agentSide()); board[i] = 0; noStroke(); fill(150, 156, 200); textAlign(CENTER, CENTER); textSize(15); text(fmtN(v, 2), x + cs / 2, y + cs / 2); }
  }
  noStroke(); fill(230); textSize(17); textAlign(LEFT, BASELINE); text(message, bx, by + 3 * cs + 34);
  fill(170, 176, 210); textSize(13); text('灰色の数字 = エージェントがそこに打ったときの価値（自分が勝つ見こみ）', bx, by + 3 * cs + 58);

  // ---- でたらめな相手との成績
  let g = { x: bx + 3 * cs + 90, y: 130, w: width - (bx + 3 * cs + 90) - 50, h: height - 300, x0: 0, x1: Math.max(10, evalCurve.length), y0: 0, y1: 1 };
  plotAxes(g, '自己対戦の数（× 1000 局）', 'でたらめな相手との成績（先手・後手 100 局ずつ）', [0, Math.round(g.x1 / 2), g.x1], [0, 0.5, 1]);
  drawCurve(g, evalCurve.map((c) => c.win), LIME, 2.5); drawCurve(g, evalCurve.map((c) => c.draw), CYAN, 2.5); drawCurve(g, evalCurve.map((c) => c.lose), PINK, 2.5);
  legend(g.x + 12, g.y + 16, [[LIME, '勝ち'], [CYAN, '引き分け'], [PINK, '負け']]);
  let last = evalCurve[evalCurve.length - 1];
  noStroke(); fill(230); textSize(15);
  if (last) text('直近：勝ち ' + Math.round(100 * last.win) + '%　引き分け ' + Math.round(100 * last.draw) + '%　負け ' + Math.round(100 * last.lose) + '%', g.x, g.y + g.h + 50);
  fill(170, 176, 210); textSize(13); text('おたがい最善なら必ず引き分けになるゲーム（ゲーム理論の話はシリーズ 30 の 13）', g.x, g.y + g.h + 72);
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  let cs = Math.min(130, (height - 260) / 3), i = Math.floor((mouseX - 60) / cs), j = Math.floor((mouseY - 110) / cs);
  if (result || turn === agentSide() || i < 0 || j < 0 || i > 2 || j > 2 || board[j * 3 + i]) return;
  play(j * 3 + i);
}
function keyPressed() {
  if (key === 'n' || key === 'N') newBoard();
  if (key === 't' || key === 'T') { humanFirst = !humanFirst; newBoard(); }
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { vTable = new Map(); games = 0; evalCurve = []; newBoard(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let okL = WIN_LINES.every((l) => { let b = new Array(9).fill(0); l.forEach((i) => (b[i] = 2)); return winnerOf(b) === 2; });
  check('8 本の列どれでも勝ちを判定、全部うまって勝者なし = 引き分け', okL && winnerOf([1, 2, 1, 1, 2, 2, 2, 1, 1]) === 3 && winnerOf(new Array(9).fill(0)) === 0);
  vTable = new Map(); seedRng(2);
  for (let g = 0; g < 40000; g++) selfPlayGame(ALPHA, EPS);
  let lose = 0, win1 = 0;
  for (let side of [1, 2]) for (let i = 0; i < 200; i++) { let r = vsRandom(side); if (r < 0) lose++; if (side === 1 && r > 0) win1++; }
  check('4 万局の自己対戦のあと、でたらめな相手に 400 局（先手・後手 200 局ずつ）で 1 度も負けない（負け ' + lose + '）', lose === 0);
  check('先手のときは 9 割以上勝つ（' + Math.round(win1 / 2) + '%）', win1 / 200 > 0.9);
  let okV = true; for (let v of vTable.values()) if (!(v >= 0 && v <= 1)) okV = false;
  check('価値はすべて 0〜1（勝つ見こみ）', okV && vTable.size > 3000);
  let b = [1, 1, 0, 2, 2, 0, 0, 0, 0];   // × の番：右上で勝てる
  check('勝てる手があれば、その手を選ぶ（× が 3 マス目で勝ち）', chooseMove(b, 1, 0).m === 2);
  vTable = new Map();
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 学習をはじめる前（R の直後）と、何万局かあとで、エージェントと対戦してくらべよう
// 2. EPS を 0 にすると？（同じ手ばかりで、知らない盤面に弱くなる）
// 3. ALPHA を 0.5 にすると学習は速くなる？ ゆれる？
// 4. あなたが先手のとき、エージェントに勝てる？ 勝てたら、そのあと学習を続けるとどうなる？
// 5. 4 × 4 で 4 つ並べる版にすると、盤面の数はどれくらい増える？

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 225, 200) : color(255, 90, 120)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
