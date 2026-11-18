// ============================================
// 10 フィッツの法則 ─ 遠くて小さいものほど、指すのに時間がかかる
// 出てきた円（ターゲット）をできるだけ速く正確にクリックする。距離 D と幅 W を 3 × 3 通りに変える
// 難しさ ID = log₂(D/W + 1) [bit]（シャノン形）。移動時間 MT = a + b·ID を回帰し、スループット = ID ÷ MT [bit/秒] を出す
// 灰色の円をクリックして開始 / O = シミュレーション観察者 / R = やり直し
// ============================================

const DS = [150, 300, 500];            // ★ 距離 D [px]
const WS = [16, 32, 64];               // ★ 幅 W [px]（円の直径）
const REPS = 4;                        // ★ 1 条件の回数（9 × 4 = 36 回）
const SIM = { a: 150, b: 120, sd: 40, err: 0.04 };   // ★ シミュレーション観察者：MT = a + b·ID [ms]
let order = [], ti = 0, trials = [], phase = 'ready', from = null, tgt = null, t0 = 0, sc = 1, simMode = false, simSeed = 1, fit = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}
function arena() { return { x: 20, y: 90, w: width * 0.55, h: height - 200 }; }
function resetData(sim) {
  simMode = sim; trials = []; ti = 0; fit = null; seedRng(Date.now());
  order = []; for (let r = 0; r < REPS; r++) for (let D of DS) for (let W of WS) order.push([D, W]);
  shuffleArr(order);
  let A = arena(); sc = Math.min(1, (A.w - 80) / DS[DS.length - 1]);   // 画面がせまいときは全体を縮める（ID は変わらない）
  from = { x: A.x + A.w / 2, y: A.y + A.h / 2 }; phase = 'ready';
}
function ID(D, W) { return Math.log2(D / W + 1); }
function placeTarget() {
  let A = arena(), [D, W] = order[ti], d = D * sc, dir = rnd() < 0.5 ? -1 : 1;
  if (from.x + dir * d < A.x + 40 || from.x + dir * d > A.x + A.w - 40) dir = -dir;
  tgt = { x: from.x + dir * d, y: from.y, D, W, w: W * sc };
}
function mousePressed() {
  if (simMode) return;
  if (phase === 'ready') { if (Math.hypot(mouseX - from.x, mouseY - from.y) < 22) { placeTarget(); phase = 'go'; t0 = performance.now(); } return; }
  if (phase !== 'go') return;
  let mt = performance.now() - t0, hit = Math.hypot(mouseX - tgt.x, mouseY - tgt.y) <= tgt.w / 2;
  trials.push({ D: tgt.D, W: tgt.W, id: ID(tgt.D, tgt.W), mt, hit });
  from = { x: tgt.x, y: tgt.y }; ti++; refit();
  if (ti >= order.length) { phase = 'done'; return; }
  placeTarget(); t0 = performance.now();   // 次のターゲットはいまクリックした所から D はなれた所
}
// 条件ごとの平均 MT（当たりだけ）で直線 MT = a + b·ID
function condMeans(tr) {
  let out = [];
  for (let D of DS) for (let W of WS) { let r = tr.filter((t) => t.D === D && t.W === W && t.hit); if (r.length) out.push([ID(D, W), r.reduce((s, t) => s + t.mt, 0) / r.length]); }
  return out;
}
function throughput(tr) { let r = tr.filter((t) => t.hit && t.mt > 0); return r.length ? r.reduce((s, t) => s + t.id / (t.mt / 1000), 0) / r.length : null; }
function refit() { let c = condMeans(trials); fit = linFit(c.map((p) => p[0]), c.map((p) => p[1])); }
function simTrials(reps) {
  let out = [];
  for (let r = 0; r < reps; r++) for (let D of DS) for (let W of WS) { let id = ID(D, W); out.push({ D, W, id, mt: Math.max(80, SIM.a + SIM.b * id + SIM.sd * rndNormal()), hit: rnd() > SIM.err }); }
  return out;
}
function runSim(seed) { resetData(true); seedRng(seed); trials = simTrials(15); ti = order.length; phase = 'done'; refit(); }

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('灰色の円をクリックして開始 → 出てくる円を次々にクリック　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  text('速く、でも外さないように。外れも記録される（回帰には当たりだけを使う）', 20, 62);
  let A = arena();
  noFill(); stroke(55); rect(A.x, A.y, A.w, A.h);
  noStroke();
  if (phase === 'ready' && !simMode) { fill(150); circle(from.x, from.y, 40); fill(30); textSize(13); textAlign(CENTER, CENTER); text('開始', from.x, from.y); textAlign(LEFT, BASELINE); }
  if (phase === 'go') {
    stroke(70); strokeWeight(1); line(from.x, from.y, tgt.x, tgt.y);
    noStroke(); fill(255, 200, 110); circle(tgt.x, tgt.y, tgt.w);
    fill(170); textSize(13); text('D = ' + tgt.D + '　W = ' + tgt.W + '　ID = ' + ID(tgt.D, tgt.W).toFixed(2) + ' bit', A.x + 10, A.y + A.h - 10);
  }
  let hits = trials.filter((t) => t.hit).length;
  fill(205); textSize(15);
  text((simMode ? 'シミュレーション観察者' : 'あなた') + '　' + trials.length + (simMode ? '' : ' / ' + order.length) + ' 回　外れ ' + (trials.length - hits) + ' 回（' + (trials.length ? ((100 * (trials.length - hits)) / trials.length).toFixed(0) : 0) + '%）' + (phase === 'done' && !simMode ? '　おつかれさま！' : ''), A.x, A.y + A.h + 30);

  // ---- MT と ID のグラフ
  let g = { x: width * 0.64, y: 110, w: width * 0.32, h: height * 0.5, x0: 0, x1: 6, y0: 0, y1: 1200 };
  plotAxes(g, '難しさ ID = log₂(D/W + 1) [bit]', '移動時間 MT [ms]', [0, 1, 2, 3, 4, 5, 6], [0, 400, 800, 1200]);
  noStroke();
  for (let t of trials) { fill(t.hit ? color(120, 190, 255, 90) : color(255, 100, 100, 150)); circle(gX(g, t.id), gY(g, Math.min(t.mt, 1200)), 5); }
  fill(120, 190, 255); for (let p of condMeans(trials)) circle(gX(g, p[0]), gY(g, p[1]), 12);
  if (simMode) { stroke(120, 200, 140); strokeWeight(1.5); line(gX(g, 0), gY(g, SIM.a), gX(g, 6), gY(g, SIM.a + 6 * SIM.b)); }
  let ry = g.y + g.h + 60, tp = throughput(trials);
  if (fit && fit.ok) {
    stroke(255, 170, 90); strokeWeight(3); line(gX(g, 0), gY(g, fit.a), gX(g, 6), gY(g, fit.a + 6 * fit.b));
    noStroke(); fill(235); textSize(17);
    text('MT = ' + fit.a.toFixed(0) + ' + ' + fit.b.toFixed(0) + '·ID [ms]　r² = ' + fit.r2.toFixed(2), g.x - 30, ry);
  } else { noStroke(); fill(235); textSize(16); text('ID のちがう条件が 2 つ以上そろうと直線を当てはめる', g.x - 30, ry); }
  noStroke(); fill(235); textSize(15);
  if (tp) text('スループット（ID ÷ MT の平均）= ' + tp.toFixed(2) + ' bit/秒' + (fit && fit.ok && fit.b > 1 ? '　（1/b = ' + (1000 / fit.b).toFixed(2) + '）' : ''), g.x - 30, ry + 26);
  if (simMode) { fill(120, 200, 140); textSize(14); text('本当の値：a = ' + SIM.a + ' ms、b = ' + SIM.b + ' ms/bit', g.x - 30, ry + 52); }
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('ID(D = 300, W = 20) = log₂16 = 4 bit、ID(150, 50) = 2 bit', near(ID(300, 20), 4, 1e-12) && near(ID(150, 50), 2, 1e-12));
  check('D と W を同じ倍率で縮めても ID は同じ', near(ID(500 * 0.7, 16 * 0.7), ID(500, 16), 1e-12));
  let f = linFit([1, 2, 3, 4], [250, 370, 490, 610]);
  check('ゆらぎのない MT → a = 130、b = 120 ちょうど', near(f.a, 130, 1e-9) && near(f.b, 120, 1e-9));
  check('スループット：ID 4 bit を 0.5 秒 → 8 bit/秒', near(throughput([{ id: 4, mt: 500, hit: true }]), 8, 1e-12));
  check('外ればかり・データなしでも NaN にならない（null）', throughput([{ id: 4, mt: 500, hit: false }]) === null && throughput([]) === null);
  seedRng(52); let tr = simTrials(40), c = condMeans(tr), f2 = linFit(c.map((p) => p[0]), c.map((p) => p[1]));
  check('シミュレーション観察者（360 回）：b ≈ 120 ms/bit（±12）、a ≈ 150（±30）', near(f2.b, SIM.b, 12) && near(f2.a, SIM.a, 30));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 36 回やって、自分の a、b、スループットを出そう。隣の人と比べると？
// 2. マウスとトラックパッド（またはタッチ）で測り比べよう。どのくらいちがう？
// 3. 「速く！」と「絶対に外さない」で意識を変えると、外れの割合と MT はどう変わる？
// 4. 画面の端にあるボタン（メニューバーなど）が押しやすいのはなぜ？ W がどうなると考えられる？
// 5. WS に 8 を足して、とても小さいターゲットでも直線に乗るか確かめよう


// ==================================================
// ここから下は「心理物理の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーション観察者と自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 正規分布：Φ（累積分布）と z（その逆関数。二分法で数値的に解く）
function erfA(x) {                     // 誤差関数（Abramowitz & Stegun 7.1.26、誤差 1.5e-7 以下）
  let s = x < 0 ? -1 : 1; x = Math.abs(x);
  let t = 1 / (1 + 0.3275911 * x);
  let y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
function Phi(x) { return 0.5 * (1 + erfA(x / Math.SQRT2)); }
function zOf(p) {                      // Φ(z) = p となる z
  p = clampv(p, 1e-9, 1 - 1e-9);
  let lo = -9, hi = 9;
  for (let i = 0; i < 70; i++) { let m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// 割合を 1/(2N) で補正（0 や 1 だと z が無限大になるので）
function rateFix(k, n) { return n > 0 ? clampv(k / n, 1 / (2 * n), 1 - 1 / (2 * n)) : 0.5; }
// ---- 直線 y = a + b x を最小二乗法で当てはめる（r² = 当てはまりのよさ）
function linFit(xs, ys) {
  let n = xs.length;
  if (n < 2) return { ok: false };
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; }
  if (sxx < 1e-12) return { ok: false };
  let b = sxy / sxx;
  return { ok: true, a: my - b * mx, b, r2: syy > 1e-12 ? (sxy * sxy) / (sxx * syy) : 1 };
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(t, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
