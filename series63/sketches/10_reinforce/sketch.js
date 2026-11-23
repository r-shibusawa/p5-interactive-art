// ============================================
// 10 方策勾配 REINFORCE ─ 価値の表を作らずに「行動の確率」そのものを学ぶ
// 短い廊下：3 マス + ゴール。1 歩ごとに −1。どのマスも見た目が同じ（エージェントには区別できない）のに、2 マス目だけ左右が逆になる。
// 「いつも右」も「いつも左」もゴールに着けない → 確率で選ぶ方策（右 59% くらい）がいちばん良い。決定的な方策では解けない例
// 方策 π(右) = e^θR / (e^θR + e^θL)（ソフトマックス）。エピソードが終わったら θ ← θ + α (G_t − b) ∇ln π(a_t)
// ベースライン b（平均的な結果の予想）を引くと、勾配の向きは同じまま、ゆれ（分散）が小さくなる
// F 速さ / スペース 一時停止 / R やり直し / ← → グラフの p を動かして J(p) を見る
// ============================================

const P0 = 0.05;                          // ★ はじめの π(右)
const ALPHA_NB = Math.pow(2, -14);        // ★ ベースラインなしの学習率
const ALPHA_B = Math.pow(2, -10), ALPHA_W = Math.pow(2, -6);   // ★ ベースラインありの学習率（方策、ベースライン）
const N_RUNS = 30, N_EPIS = 1000;          // ★ 平均をとる回数とエピソード数
let learners = [], curves = [], runsDone = 0, speed = 1, paused = false, probeP = 0.5, demo = null;
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(10); resetAll(); }
function resetAll() { curves = [new Array(N_EPIS).fill(0), new Array(N_EPIS).fill(0)]; runsDone = 0; learners = [makeLearner(false), makeLearner(true)]; demo = { s: 0, path: [0], ep: 0 }; }
function makeLearner(base) { return { base, th: [Math.log(P0), Math.log(1 - P0)], w: 0, ep: 0, hist: [] }; }
function pRight(th) { return softmaxArr(th, 1)[0]; }

// ---- 環境：マス 0, 1, 2（2 だけ左右が逆）、3 = ゴール。左のはしでは左に行けない
function corridorMove(s, right) { let goRight = s === 1 ? !right : right; return goRight ? s + 1 : Math.max(0, s - 1); }
function runEpisode(p, cap) { let s = 0, acts = []; while (s < 3 && acts.length < cap) { let right = rnd() < p; acts.push(right); s = corridorMove(s, right); } return acts; }
// ★ 真の J(p)：v0 = −1 + p v1 + (1−p) v0、v1 = −1 + (1−p) v0 + p v2 ... を解いた式（v1 = (p − 3)/(p(1 − p))、v0 = v1 − 1/p）
function trueJ(p) { if (p <= 0 || p >= 1) return -Infinity; let v1 = (p - 3) / (p * (1 - p)); return v1 - 1 / p; }
// ★ REINFORCE の 1 エピソード
function reinforceEpisode(L) {
  let p = pRight(L.th), acts = runEpisode(p, 5000), T = acts.length;
  for (let t = 0; t < T; t++) {
    let G = -(T - t), pr = pRight(L.th), delta = G - (L.base ? L.w : 0);   // G_t = それから先の報酬の合計（γ = 1）
    if (L.base) L.w += ALPHA_W * delta;                                      // ベースライン b = w も平均の結果に近づける
    let gR = (acts[t] ? 1 : 0) - pr, gL = (acts[t] ? 0 : 1) - (1 - pr);      // ∇ln π(a) = (選んだら 1) − π
    let al = L.base ? ALPHA_B : ALPHA_NB;
    L.th[0] = clampv(L.th[0] + al * delta * gR, -20, 20); L.th[1] = clampv(L.th[1] + al * delta * gL, -20, 20);
  }
  L.ep++; L.hist.push(T);
  return T;
}
function gradSample(p, useBase) {         // 1 エピソードぶんの勾配の推定（θR の向き）
  let acts = runEpisode(p, 5000), T = acts.length, b = useBase ? trueJ(p) : 0, g = 0;
  for (let t = 0; t < T; t++) g += (-(T - t) - b) * ((acts[t] ? 1 : 0) - p);
  return g;
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (!paused) {
    let budget = speed === 0 ? 0.5 : speed === 1 ? 3 : 8;
    while (runsDone < N_RUNS && performance.now() - t0 < budget) {
      for (let k = 0; k < 2; k++) { let L = learners[k]; reinforceEpisode(L); curves[k][L.ep - 1] += trueJ(pRight(L.th)); }
      if (learners[0].ep >= N_EPIS) { runsDone++; learners = [makeLearner(false), makeLearner(true)]; }
      if (speed === 0) break;
    }
    if (runsDone >= N_RUNS && learners[0].ep < N_EPIS && frameCount % 2 === 0) learners.forEach(reinforceEpisode);   // 平均がそろったら、画面の 2 つをゆっくり学習
    if (frameCount % 8 === 0) { let r = rnd() < pRight(learners[1].th); demo.s = corridorMove(demo.s, r); demo.path.push(r); if (demo.s === 3 || demo.path.length > 60) { demo = { s: 0, path: [0], ep: demo.ep + 1 }; } }
  }
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('方策勾配 REINFORCE：見分けのつかない廊下', 40, 42);
  fill(170, 176, 210); textSize(15);
  text('F 速さ（' + SPEEDS[speed] + '）　スペース 一時停止　R やり直し　← → グラフの p を動かす', 40, 68);

  // ---- 廊下
  let cw = 90, cx0 = 60, cy = 110;
  for (let i = 0; i < 4; i++) {
    fill(i === 3 ? color(...GOLD) : color(30, 34, 70)); stroke(...CYAN, 150); strokeWeight(2); rect(cx0 + i * (cw + 10), cy, cw, 60, 6);
    noStroke(); fill(i === 3 ? 30 : 230); textAlign(CENTER, CENTER); textSize(15); text(i === 3 ? 'ゴール' : i === 1 ? '左右が逆' : 'ふつう', cx0 + i * (cw + 10) + cw / 2, cy + 30);
  }
  fill(...PINK); circle(cx0 + demo.s * (cw + 10) + cw / 2, cy - 14, 18);
  let pB = pRight(learners[1].th), pN = pRight(learners[0].th);
  textAlign(LEFT, BASELINE); fill(230); textSize(16);
  text('いまの学習（ベースラインあり）π(右) = ' + fmtN(pB, 3) + '　（なし）π(右) = ' + fmtN(pN, 3) + '　　最適は π(右) = 2 − √2 ≈ 0.586', cx0 + 4 * (cw + 10) + 20, cy + 26);
  text('θR = ' + fmtN(learners[1].th[0], 2) + '、θL = ' + fmtN(learners[1].th[1], 2) + '　エピソード ' + learners[1].ep + '　（' + runsDone + ' / ' + N_RUNS + ' 回目の学習が終了）', cx0 + 4 * (cw + 10) + 20, cy + 52);

  // ---- J(p) の曲線
  let g = { x: 80, y: 250, w: width * 0.36, h: height - 360, x0: 0, x1: 1, y0: -100, y1: 0 };
  plotAxes(g, 'π(右) = p', '期待される報酬 J(p)', [0, 0.25, 0.5, 0.75, 1], [-100, -50, -12, 0]);
  let pts = []; for (let i = 1; i < 200; i++) { let p = i / 200; pts.push([gX(g, p), gY(g, Math.max(-100, trueJ(p)))]); }
  stroke(...LIME); strokeWeight(2.5); polyline(pts);
  noStroke(); fill(...GOLD); circle(gX(g, pB), gY(g, Math.max(-100, trueJ(pB))), 14);
  fill(...PINK); circle(gX(g, pN), gY(g, Math.max(-100, trueJ(pN))), 10);
  stroke(255, 120); strokeWeight(1); line(gX(g, probeP), g.y, gX(g, probeP), g.y + g.h);
  noStroke(); fill(230); textSize(14); text('p = ' + probeP.toFixed(2) + '：J = ' + fmtN(trueJ(probeP), 2) + '　（p = 0 や 1 では −∞：ゴールに着かない）', g.x, g.y + g.h + 50);

  // ---- 学習曲線（平均）
  let h = { x: width * 0.5, y: 250, w: width * 0.45, h: height - 360, x0: 0, x1: N_EPIS, y0: -90, y1: -10 };
  plotAxes(h, 'エピソード', 'J（' + Math.max(1, runsDone) + ' 回の学習の平均）', [0, 250, 500, 750, 1000], [-90, -50, -11.66]);
  stroke(...LIME, 120); strokeWeight(1); line(h.x, gY(h, -11.66), h.x + h.w, gY(h, -11.66));
  let nDone = Math.max(1, runsDone);
  if (runsDone > 0) { drawCurve(h, curves[0].map((v) => v / nDone), PINK, 2.5); drawCurve(h, curves[1].map((v) => v / nDone), GOLD, 2.5); }
  legend(h.x + h.w - 200, h.y + h.h - 50, [[GOLD, 'ベースラインあり'], [PINK, 'ベースラインなし']]);
  noStroke(); fill(170, 176, 210); textSize(13);
  text('ベースラインがないと、学習率を小さくしないと暴れてしまう → 遅い。勾配法の話はシリーズ 49', h.x, h.y + h.h + 50);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetAll();
  if (key === RIGHT_ARROW) probeP = Math.min(0.99, probeP + 0.01);
  if (key === LEFT_ARROW) probeP = Math.max(0.01, probeP - 0.01);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(1); let gs = []; for (let e = 0; e < 5000; e++) gs.push(-runEpisode(0.3, 100000).length);
  let mu = meanOf(gs), se = Math.sqrt(meanOf(gs.map((v) => (v - mu) ** 2)) / gs.length);
  check('式の J(0.3) = ' + fmtN(trueJ(0.3), 2) + ' ≈ 5000 回の平均 ' + fmtN(mu, 2) + '（標準誤差の 3 倍以内）', Math.abs(mu - trueJ(0.3)) < 3 * se);
  let best = 0.01; for (let i = 1; i < 1000; i++) if (trueJ(i / 1000) > trueJ(best)) best = i / 1000;
  check('J(p) がいちばん大きいのは p = ' + best + ' ≈ 2 − √2（右 59%、J ≈ −11.66）', near(best, 2 - Math.SQRT2, 0.002) && near(trueJ(best), -11.657, 0.01));
  let jB = 0, jN = 0;
  for (let r = 0; r < 6; r++) {
    seedRng(100 + r); let L = makeLearner(true); for (let e = 0; e < 400; e++) reinforceEpisode(L); jB += trueJ(pRight(L.th)) / 6;
    seedRng(100 + r); let M = makeLearner(false); for (let e = 0; e < 400; e++) reinforceEpisode(M); jN += trueJ(pRight(M.th)) / 6;
  }
  check('REINFORCE で期待報酬が上がる：J(0.05) = ' + fmtN(trueJ(P0), 1) + ' → 400 回でベースラインあり ' + fmtN(jB, 1) + '、なし ' + fmtN(jN, 1), jB > -14 && jN > trueJ(P0) + 20);
  let gA = [], gB = []; seedRng(7); for (let e = 0; e < 4000; e++) gA.push(gradSample(0.3, false)); seedRng(8); for (let e = 0; e < 4000; e++) gB.push(gradSample(0.3, true));
  let exact = ((trueJ(0.3 + 1e-6) - trueJ(0.3 - 1e-6)) / 2e-6) * 0.3 * 0.7, va = meanOf(gA.map((v) => (v - meanOf(gA)) ** 2)), vb = meanOf(gB.map((v) => (v - meanOf(gB)) ** 2));
  check('勾配の推定の平均 ≈ 本当の勾配 ' + fmtN(exact, 1) + '（なし ' + fmtN(meanOf(gA), 1) + '、あり ' + fmtN(meanOf(gB), 1) + '）', Math.abs(meanOf(gA) - exact) < 3 * Math.sqrt(va / 4000) && Math.abs(meanOf(gB) - exact) < 3 * Math.sqrt(vb / 4000));
  check('ベースラインで分散が小さくなる：' + Math.round(vb) + ' < ' + Math.round(va), vb < va);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ALPHA_NB を 2 倍、4 倍にすると、ベースラインなしの学習はどうなる？（大きすぎると p が 0 か 1 に張りついて戻れない）
// 2. P0 を 0.95（右ばかり）から始めると、どちらに向かって学ぶ？
// 3. ← → で p を動かして、J(p) の山の形を確かめよう。なぜ p = 0.5 より右寄りがよい？
// 4. 「決定的な方策」（いつも右・いつも左）で解ける廊下にするには、どこを変える？
// 5. 勾配を使って山を登る方法は、シリーズ 49 の勾配法と同じ考え方。ちがいは「勾配をサンプルで推定する」こと

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
