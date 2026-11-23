// ============================================
// 11 小さなニューラルネットで Q 学習 ─ 落ちてくる玉を、幅 3 のかごで受ける「キャッチ」（10 × 10）
// 状態（玉の列・玉の行・かごの列）を 30 個の 0/1 にして、隠れ層 1 層（16 個、tanh）のネットで Q(s, 左/そのまま/右) を出す。
// 表のかわりにネットを使う Q 学習の 2 つの工夫：経験再生（昔の経験をためて、ランダムに 16 個ずつ学ぶ）と
// ターゲットネットワーク（目標 r + γ max Q′ は、100 歩ごとにコピーした古いネットで計算 → 目標が逃げない）
// 誤差逆伝播は手書き、最適化は Adam。F 速さ / スペース 一時停止 / R やり直し / G 見るだけ（ε = 0、学習しない）
// ============================================

const BOARD_N = 10, NIN = 30, NH = 16, NA = 3;       // ★ 盤の大きさ、入力・隠れ層・出力の数
const GAMMA = 0.9, LR = 0.01, BATCH = 16, BUF_SIZE = 3000, TARGET_EVERY = 100;   // ★ 学習の設定
const EPS_STEPS = 2400;                            // ★ ε を 1 → 0.1 に下げる歩数
const NET_KEYS = ['W1', 'b1', 'W2', 'b2'];
let dqn, speed = 1, paused = false, watchOnly = false, lastQ = [0, 0, 0], lastH = [];
const SPEEDS = ['ゆっくり', 'ふつう', '速い'];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(2); dqn = makeDqn(); }

// ---- ゲーム
function newGame() { return { bx: Math.floor(rnd() * BOARD_N), by: 0, px: Math.floor(rnd() * BOARD_N) }; }
function gameStep(g, a) {                // a = 0 左、1 そのまま、2 右。戻り値：0 続く、+1 とれた、−1 落とした
  g.px = clampv(g.px + a - 1, 0, BOARD_N - 1); g.by++;
  if (g.by === BOARD_N - 1) return Math.abs(g.bx - g.px) <= 1 ? 1 : -1;
  return 0;
}
function encode(g) { return [g.bx, BOARD_N + g.by, 2 * BOARD_N + g.px]; }   // 30 個の入力のうち 1 になる 3 つの番号

// ---- ニューラルネット（30 → 16 tanh → 3）
function newNet() {
  return { W1: Array.from({ length: NH * NIN }, () => randn() * Math.sqrt(1 / 3)), b1: new Array(NH).fill(0), W2: Array.from({ length: NA * NH }, () => randn() * Math.sqrt(1 / NH)), b2: new Array(NA).fill(0) };
}
function cloneNet(n) { let o = {}; for (let k of NET_KEYS) o[k] = n[k].slice(); return o; }
function zerosLike() { return { W1: new Float64Array(NH * NIN), b1: new Float64Array(NH), W2: new Float64Array(NA * NH), b2: new Float64Array(NA) }; }
function forward(net, x) {               // x = 1 になる入力の番号（ほかは 0 なので足すだけ）
  let hid = new Array(NH), q = new Array(NA);
  for (let j = 0; j < NH; j++) { let s = net.b1[j]; for (let i of x) s += net.W1[j * NIN + i]; hid[j] = Math.tanh(s); }
  for (let a = 0; a < NA; a++) { let s = net.b2[a]; for (let j = 0; j < NH; j++) s += net.W2[a * NH + j] * hid[j]; q[a] = s; }
  return { hid, q };
}
// ★ 誤差逆伝播：損失 ½ (Q(s,a) − y)² の各重みでの微分を gr に足しこむ
function backprop(net, x, a, y, gr) {
  let f = forward(net, x), d = f.q[a] - y;
  gr.b2[a] += d;
  for (let j = 0; j < NH; j++) {
    gr.W2[a * NH + j] += d * f.hid[j];
    let dh = d * net.W2[a * NH + j] * (1 - f.hid[j] * f.hid[j]);   // tanh′ = 1 − tanh²
    gr.b1[j] += dh; for (let i of x) gr.W1[j * NIN + i] += dh;
  }
  return 0.5 * d * d;
}
function adamStep(net, gr, opt, n) {     // Adam：勾配の平均と 2 乗の平均で、重みごとに歩幅を調整
  opt.t++; let c1 = 1 - Math.pow(0.9, opt.t), c2 = 1 - Math.pow(0.999, opt.t);
  for (let k of NET_KEYS) {
    let p = net[k], g = gr[k], m = opt.m[k], v = opt.v[k];
    for (let i = 0; i < p.length; i++) {
      let gi = g[i] / n; m[i] = 0.9 * m[i] + 0.1 * gi; v[i] = 0.999 * v[i] + 0.001 * gi * gi;
      p[i] -= (LR * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + 1e-8);
    }
  }
}
// ---- DQN エージェント
function makeDqn() { let net = newNet(); return { net, tgt: cloneNet(net), opt: { t: 0, m: zerosLike(), v: zerosLike() }, gr: zerosLike(), buf: [], t: 0, game: newGame(), results: [] }; }
function epsAt(t) { return Math.max(0.1, 1 - t / EPS_STEPS); }
function dqnStep(d, learn) {
  let x = encode(d.game), f = forward(d.net, x), a = learn && rnd() < epsAt(d.t) ? Math.floor(rnd() * NA) : argmaxFirst(f.q);
  lastQ = f.q; lastH = f.hid;
  let r = gameStep(d.game, a), done = r !== 0, x2 = encode(d.game);
  if (done) { d.results.push(r > 0 ? 1 : 0); d.game = newGame(); }
  if (!learn) return;
  let e = [x, a, r, x2, done];
  if (d.buf.length < BUF_SIZE) d.buf.push(e); else d.buf[d.t % BUF_SIZE] = e;   // 経験再生のバッファ（古いものから上書き）
  if (d.buf.length >= BATCH) {
    for (let k of NET_KEYS) d.gr[k].fill(0);
    for (let k = 0; k < BATCH; k++) {
      let [s, aa, rr, s2, dd] = d.buf[Math.floor(rnd() * d.buf.length)];
      let y = dd ? rr : rr + GAMMA * maxOf(forward(d.tgt, s2).q);   // 目標はターゲットネットワークで
      backprop(d.net, s, aa, y, d.gr);
    }
    adamStep(d.net, d.gr, d.opt, BATCH);
  }
  d.t++;
  if (d.t % TARGET_EVERY === 0) d.tgt = cloneNet(d.net);
}
function catchRate(net) {               // 100 通りの始まり方すべてで、貪欲に動いたときにとれる割合
  let win = 0;
  for (let bx = 0; bx < BOARD_N; bx++) for (let px = 0; px < BOARD_N; px++) { let g = { bx, by: 0, px }, r = 0; while (r === 0) r = gameStep(g, argmaxFirst(forward(net, encode(g)).q)); if (r > 0) win++; }
  return win / (BOARD_N * BOARD_N);
}

function draw() {
  background(...BG);
  let t0 = performance.now();
  if (!paused) {
    if (watchOnly || speed === 0) { if (frameCount % 6 === 0) dqnStep(dqn, !watchOnly); }
    else if (speed === 1) { if (frameCount % 2 === 0) dqnStep(dqn, true); }
    else while (performance.now() - t0 < 7) dqnStep(dqn, true);
  }
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('小さなニューラルネットで Q 学習：キャッチ　' + dqn.t + ' 歩　ε = ' + (watchOnly ? '0（見るだけ）' : epsAt(dqn.t).toFixed(2)), 40, 42);
  fill(170, 176, 210); textSize(15);
  text('F 速さ（' + SPEEDS[speed] + '）　スペース 一時停止　R やり直し　G 見るだけ（' + (watchOnly ? 'ON' : 'OFF') + '）', 40, 68);

  // ---- 盤
  let cs = Math.min(40, (height - 220) / BOARD_N), gx = 40, gy = 100, g = dqn.game;
  for (let y = 0; y < BOARD_N; y++) for (let x = 0; x < BOARD_N; x++) { fill(24, 28, 58); rect(gx + x * cs, gy + y * cs, cs - 2, cs - 2, 3); }
  fill(...GOLD); circle(gx + g.bx * cs + cs / 2 - 1, gy + g.by * cs + cs / 2 - 1, cs * 0.7);
  fill(...CYAN); rect(gx + (g.px - 1) * cs, gy + (BOARD_N - 1) * cs + cs * 0.3, cs * 3 - 2, cs * 0.6, 4);
  // Q の値
  let qx = gx, qy = gy + BOARD_N * cs + 30;
  fill(230); textSize(15); text('いまの Q（左 / そのまま / 右）', qx, qy);
  lastQ.forEach((v, a) => { let w = clampv(Math.abs(v) * 80, 0, 120); fill(v >= 0 ? color(...LIME) : color(...PINK)); rect(qx + a * 130, qy + 12, v >= 0 ? w : w, 16); fill(230); text(fmtN(v, 2), qx + a * 130, qy + 48); });

  // ---- 隠れ層の活性（16 個）
  let nx = gx + BOARD_N * cs + 50, ny = 120;
  fill(230); textSize(15); text('隠れ層 16 個の値（tanh）', nx, ny - 10);
  lastH.forEach((v, j) => { fill(v > 0 ? color(...GOLD, 60 + 195 * v) : color(...VIOLET, 60 - 195 * v)); circle(nx + 16 + (j % 8) * 34, ny + 20 + Math.floor(j / 8) * 34, 26); });

  // ---- 成功率
  let res = dqn.results, n = res.length, rate = [];
  for (let i = 0; i < n; i++) rate.push(meanOf(res.slice(Math.max(0, i - 49), i + 1)));
  let pg = { x: nx + 10, y: 230, w: width - nx - 60, h: height - 360, x0: 0, x1: Math.max(100, n), y0: 0, y1: 1 };
  plotAxes(pg, 'ゲームの数', '玉をとれた割合（直近 50 回）', [0, Math.round(pg.x1 / 2), pg.x1], [0, 0.3, 0.5, 0.8, 1]);
  stroke(...LIME, 120); strokeWeight(1); line(pg.x, gY(pg, 0.8), pg.x + pg.w, gY(pg, 0.8));
  drawCurve(pg, rate, CYAN, 2.5);
  noStroke(); fill(170, 176, 210); textSize(13);
  text('でたらめに動くと 3 割くらい。緑の線 = 8 割。学習中は ε のぶんだけわざと失敗する', pg.x, pg.y + pg.h + 50);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'f' || key === 'F') speed = (speed + 1) % 3;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') dqn = makeDqn();
  if (key === 'g' || key === 'G') watchOnly = !watchOnly;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  // 数値微分との照合（中心差分）
  seedRng(3); let net = newNet(), x = [3, BOARD_N + 4, 2 * BOARD_N + 6], gr = zerosLike(), worst = 0;
  backprop(net, x, 1, 0.7, gr);
  let lossAt = () => 0.5 * (forward(net, x).q[1] - 0.7) ** 2;
  for (let k of NET_KEYS) for (let i = 0; i < net[k].length; i++) {
    let o = net[k][i]; net[k][i] = o + 1e-5; let lp = lossAt(); net[k][i] = o - 1e-5; let lm = lossAt(); net[k][i] = o;
    let num = (lp - lm) / 2e-5, an = gr[k][i];
    if (Math.abs(num) + Math.abs(an) > 1e-9) worst = Math.max(worst, Math.abs(num - an) / (Math.abs(num) + Math.abs(an)));
  }
  check('誤差逆伝播 = 数値微分（全部の重み、相対誤差の最大 ' + worst.toExponential(1) + ' < 10⁻⁵）', worst < 1e-5);
  let before = catchRate(net);
  seedRng(4); let d = makeDqn(), r0 = catchRate(d.net), copyOk = d.tgt.W1 !== d.net.W1 && d.tgt.W1[0] === d.net.W1[0];
  for (let t = 0; t < 6000; t++) dqnStep(d, true);
  let r1 = catchRate(d.net);
  check('学習前のネットはあまりとれない（' + Math.round(100 * Math.max(before, r0)) + '%）', Math.max(before, r0) < 0.6);
  check('6000 歩学習すると、100 通りの始まり方のうち ' + Math.round(100 * r1) + '% をとれる（> 80%）', r1 > 0.8);
  check('ターゲットネットワークは中身のコピー（同じ値、別の配列）', copyOk);
  check('重みに NaN・Infinity なし', NET_KEYS.every((k) => noNaN(Array.from(d.net[k]))));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. TARGET_EVERY を 1 にすると（ターゲットネットワークなし）、学習はどうなる？
// 2. BUF_SIZE を 16 にすると（ほとんど経験再生なし）？ 直前の経験ばかり学ぶとどうなる？
// 3. NH を 4 や 64 にしてみよう。小さすぎると覚えられない、大きいと遅い
// 4. 入力を 100 マスの絵（0/1）にすると、本物の「画面から学ぶ」に近づく（NIN = 100 に）
// 5. G で見るだけにして、学習したかごの動きを観察しよう。どこで動き出す？

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
