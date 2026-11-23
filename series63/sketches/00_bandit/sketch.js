// ============================================
// 00 多腕バンディット ─ 当たりの確率が隠れた 5 台のスロットマシン
// まず自分で引いて「どれが当たりやすいか」を探す。次に ε-greedy・UCB1・トンプソン抽出に任せて、
// 後悔（regret = いちばん良い台を引き続けた場合との差の合計）がどう増えるかを比べる。探索と活用のジレンマ
// クリック or 1〜5 自分で引く / スペース 3 つのアルゴリズムの競争をやり直す / F 速さ / H 確率を見せる / R 台を入れかえ
// ============================================

let probs = [0.1, 0.2, 0.3, 0.4, 0.9];  // ★ 当たりの確率（はじめはシャッフルして隠す）
const HORIZON = 2000;                   // ★ 競争で引く回数
const EPS = 0.1;                        // ★ ε-greedy の ε（10% はでたらめに引く）
let agents = [], me = null, fast = false, reveal = false, flash = [], machineBox = [];
let KINDS = [];                         // [種類, 名前, 色]（色は道具の中にあるので setup で入れる）

function setup() {
  createCanvas(windowWidth, windowHeight);
  KINDS = [['eps', 'ε-greedy（ε = 0.1）', CYAN], ['ucb', 'UCB1', GOLD], ['ts', 'トンプソン抽出', PINK]];
  selfTest();
  seedRng(7); shuffleProbs(); restart();
}

function shuffleProbs() { for (let i = probs.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [probs[i], probs[j]] = [probs[j], probs[i]]; } }
function restart() { agents = KINDS.map((k) => makeAgent(k[0])); me = makeAgent('me'); flash = probs.map(() => 0); }
function makeAgent(kind, K) { K = K || probs.length; return { kind, n: new Array(K).fill(0), s: new Array(K).fill(0), t: 0, regret: 0, reward: 0, curve: [0] }; }

// ★ どの台を引くか（ここがアルゴリズムの中身）
function chooseArm(ag) {
  let K = ag.n.length;
  if (ag.kind === 'eps') {                       // ε の確率で探索、それ以外は平均がいちばん高い台（活用）
    if (rnd() < EPS) return Math.floor(rnd() * K);
    return argmaxR(ag.n.map((n, i) => (n ? ag.s[i] / n : 0)));
  }
  if (ag.kind === 'ucb') {                       // 平均 + 自信のなさ √(2 ln t / n)。まだ引いていない台が先
    for (let i = 0; i < K; i++) if (ag.n[i] === 0) return i;
    return argmaxR(ag.n.map((n, i) => ag.s[i] / n + Math.sqrt((2 * Math.log(ag.t + 1)) / n)));
  }
  // トンプソン抽出：「当たりの確率」の信念 Beta(1 + 当たり, 1 + はずれ) から 1 つずつ引いて、いちばん大きい台
  return argmaxR(ag.n.map((n, i) => betaSample(1 + ag.s[i], 1 + n - ag.s[i])));
}
function pull(ag, arm, pr) {
  let r = rnd() < pr[arm] ? 1 : 0;
  ag.n[arm]++; ag.s[arm] += r; ag.t++; ag.reward += r;
  ag.regret += maxOf(pr) - pr[arm];              // 後悔は「期待値の差」で数える（運の良し悪しを除く）
  ag.curve.push(ag.regret);
  return r;
}

function draw() {
  background(...BG);
  // ---- 競争を進める（1 フレームの計算は数ミリ秒まで → 60fps のまま）
  let t0 = performance.now(), budget = fast ? 6 : 0;
  do { for (let ag of agents) if (ag.t < HORIZON) pull(ag, chooseArm(ag), probs); } while (performance.now() - t0 < budget && agents[0].t < HORIZON);

  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('多腕バンディット：探索と活用', 40, 42);
  fill(170, 176, 210); textSize(15);
  text('クリック or 1〜5 で自分で引く　スペース 競争をやり直す　F 速さ（' + (fast ? '速い' : 'ふつう') + '）　H 確率を見せる　R 台を入れかえ', 40, 68);

  // ---- スロットマシン（自分で引く）
  let mw = Math.min(120, (width * 0.5 - 60) / 5 - 14), y0 = 100;
  machineBox = [];
  for (let i = 0; i < probs.length; i++) {
    let x = 40 + i * (mw + 14);
    machineBox.push([x, y0, mw, 170]);
    fill(30, 34, 70); stroke(...GOLD, 120 + 135 * flash[i]); strokeWeight(2); rect(x, y0, mw, 170, 10);
    noStroke(); fill(flash[i] > 0 && me.lastWin ? color(...GOLD) : color(60, 66, 110)); rect(x + 12, y0 + 20, mw - 24, 50, 6);
    fill(255); textAlign(CENTER, CENTER); textSize(26); text(i + 1, x + mw / 2, y0 + 45);
    textSize(13); fill(200, 205, 235);
    text('引いた ' + me.n[i] + ' 回', x + mw / 2, y0 + 92);
    text('当たり ' + me.s[i], x + mw / 2, y0 + 112);
    text('平均 ' + (me.n[i] ? fmtN(me.s[i] / me.n[i]) : '?'), x + mw / 2, y0 + 132);
    fill(...LIME); text(reveal ? 'p = ' + probs[i] : 'p = ?', x + mw / 2, y0 + 154);
    flash[i] *= 0.9;
  }
  textAlign(LEFT, BASELINE); fill(230); textSize(16);
  text('あなた：' + me.t + ' 回で当たり ' + me.reward + '　後悔 ' + fmtN(me.regret, 1) + '（いちばん良い台なら期待 ' + fmtN(me.t * maxOf(probs), 1) + '）', 40, y0 + 200);

  // ---- 後悔のグラフ（3 つのアルゴリズム + あなた）
  let g = { x: width * 0.55, y: 110, w: width * 0.4, h: height * 0.36, x0: 0, x1: HORIZON, y0: 0, y1: 0 };
  g.y1 = Math.max(20, ...agents.map((a) => a.regret)) * 1.1;
  plotAxes(g, '引いた回数 t', '累積の後悔（regret）', [0, 500, 1000, 1500, 2000], [0, Math.round(g.y1 / 2), Math.round(g.y1)]);
  agents.forEach((ag, k) => drawCurve(g, ag.curve, KINDS[k][2], 2.5));
  if (me.t > 1) drawCurve(g, me.curve, [235, 235, 235], 2);
  legend(g.x + 12, g.y + 16, KINDS.map((k) => [k[2], k[1]]).concat([[[235, 235, 235], 'あなた']]));

  // ---- それぞれが各台を何回引いたか
  let by = g.y + g.h + 90, bh = Math.max(60, height - by - 80), bw = (width - 120) / 3;
  agents.forEach((ag, k) => {
    let x = 40 + k * (bw + 20);
    fill(...KINDS[k][2]); textSize(15); text(KINDS[k][1] + '　後悔 ' + fmtN(ag.regret, 1) + '　当たり ' + ag.reward + ' / ' + ag.t, x, by - 10);
    for (let i = 0; i < probs.length; i++) {
      let h = (ag.n[i] / Math.max(1, ag.t)) * bh, cw = bw / probs.length;
      fill(...KINDS[k][2], 200); rect(x + i * cw + 4, by + bh - h, cw - 8, h);
      fill(190, 195, 225); textSize(12); textAlign(CENTER, TOP); text((i + 1) + (reveal ? ' (' + probs[i] + ')' : ''), x + i * cw + cw / 2, by + bh + 4); textAlign(LEFT, BASELINE);
    }
  });
  fill(150, 156, 190); textSize(13);
  text('棒 = その台を引いた割合。良い台に集中するほど後悔の増え方がゆるやかになる', 40, height - 40);
  drawSelfTest(width - 180, height - 14);
}

function pullMine(i) { if (i < 0 || i >= probs.length) return; let r = pull(me, i, probs); me.lastWin = r === 1; flash[i] = 1; }
function mousePressed() { machineBox.forEach((b, i) => { if (mouseX > b[0] && mouseX < b[0] + b[2] && mouseY > b[1] && mouseY < b[1] + b[3]) pullMine(i); }); }
function keyPressed() {
  if (key >= '1' && key <= '5') pullMine(+key - 1);
  if (key === ' ') restart();
  if (key === 'f' || key === 'F') fast = !fast;
  if (key === 'h' || key === 'H') reveal = !reveal;
  if (key === 'r' || key === 'R') { probs = probs.map(() => Math.round((0.05 + rnd() * 0.9) * 100) / 100); restart(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let base = [0.1, 0.2, 0.3, 0.4, 0.9], reg = { eps: 0, ucb: 0, ts: 0 }, runs = 20, okCount = true, okFirst = true;
  for (let r = 0; r < runs; r++) for (let kind of ['eps', 'ucb', 'ts']) {
    seedRng(1000 + 7 * r);                       // 3 つとも同じ種で比べる
    let ag = makeAgent(kind, base.length);
    for (let t = 0; t < HORIZON; t++) { let a = chooseArm(ag); if (kind === 'ucb' && t < 5 && a !== t) okFirst = false; pull(ag, a, base); }
    reg[kind] += ag.regret / runs;
    if (ag.n.reduce((a, b) => a + b, 0) !== HORIZON || ag.regret < 0) okCount = false;
  }
  check('UCB1 の後悔 < ε-greedy（ε = 0.1）の後悔：2000 回 × 20 回の平均 ' + fmtN(reg.ucb, 1) + ' < ' + fmtN(reg.eps, 1), reg.ucb < reg.eps);
  check('トンプソン抽出の後悔 < ε-greedy：' + fmtN(reg.ts, 1) + ' < ' + fmtN(reg.eps, 1), reg.ts < reg.eps);
  check('引いた回数の合計 = 2000、後悔 ≥ 0、UCB1 は最初の 5 回で全部の台を 1 回ずつ', okCount && okFirst);
  seedRng(3); let xs = []; for (let i = 0; i < 20000; i++) xs.push(betaSample(3, 7));
  let m = meanOf(xs), v = meanOf(xs.map((x) => (x - m) * (x - m)));
  check('ベータ分布 Beta(3, 7) のサンプル：平均 ' + fmtN(m, 3) + ' ≈ 0.3、分散 ' + fmtN(v, 4) + ' ≈ 0.0191', near(m, 0.3, 0.01) && near(v, 21 / 1100, 0.0015) && xs.every((x) => x > 0 && x < 1));
  seedRng(5); let ag = makeAgent('eps', 5), hits = 0; for (let t = 0; t < 4000; t++) hits += pull(ag, 4, base);
  check('台 5（p = 0.9）を 4000 回引くと当たりの割合 ≈ 0.9、後悔 0', near(hits / 4000, 0.9, 0.02) && ag.regret === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. H を押さずに 30 回だけ引いて、どの台がいちばん良いか当てよう。何回引けば自信がもてる？
// 2. EPS を 0.01 や 0.3 にすると、ε-greedy の後悔のグラフはどう変わる？（探索しすぎ・しなさすぎ）
// 3. probs を [0.5, 0.55, 0.6, 0.62, 0.65] のように近くすると、UCB1 と ε-greedy の順位は？（差が小さいと見分けに時間がかかる）
// 4. トンプソン抽出の Beta(1 + 当たり, 1 + はずれ) は「信念」。台ごとの山の形を描いてみよう
// 5. 当たりの確率が途中で入れかわったら？（14 で、好みが変わる人に合わせる工夫をする）

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
// ---- ベータ分布からのサンプル（トンプソン抽出用）：ガンマ分布 2 つの比
function gammaSample(k) {
  if (k < 1) return gammaSample(k + 1) * Math.pow(1 - rnd(), 1 / k);
  let d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {                           // マルサグリア-ツァンの方法
    let x = randn(), v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    if (Math.log(1 - rnd()) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
  }
}
function betaSample(a, b) { let x = gammaSample(a), y = gammaSample(b); return x / (x + y); }
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
