// ============================================
// 09 反応時間とヒックの法則 ─ 選択肢が 2 倍になると、反応は一定時間ずつ遅くなる
// 箱のどれかが光ったら、その下のキーをできるだけ速く押す。選択肢の数 N = 1, 2, 4, 8 の順にブロックで測る
// 平均反応時間 RT と log₂N（選ぶのに必要な情報量 [bit]）に直線 RT = a + b·log₂N を当てはめる。1/b = 情報を処理する速さ [bit/秒]
// クリック → スペースでブロック開始 / A S D F J K L ; で答える / O = シミュレーション観察者 / R = やり直し
// ============================================

const KEYS = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];   // 8 つのキー（左手 ASDF、右手 JKL;）
const SETS = { 1: [3], 2: [3, 4], 4: [2, 3, 4, 5], 8: [0, 1, 2, 3, 4, 5, 6, 7] };   // N ごとに使う箱
const NS = [1, 2, 4, 8];
const PER = 8;                         // ★ 1 ブロックの試行（4 × 8 = 32 試行）
const SIM = { a: 220, b: 140, sd: 40, err: 0.03 };   // ★ シミュレーション観察者：RT = a + b·log₂N（ms）
let bi = 0, trials = [], phase = 'ready', tGo = 0, onset = 0, target = -1, msg = '', simMode = false, simSeed = 1, fit = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}
function resetData(sim) { simMode = sim; bi = 0; trials = []; phase = 'ready'; msg = ''; fit = null; seedRng(Date.now()); }
function blockCount() { return trials.filter((t) => t.N === NS[bi]).length; }
function nextTrial() {
  if (blockCount() >= PER) { bi++; phase = bi >= NS.length ? 'done' : 'ready'; return; }
  phase = 'fore'; tGo = millis() + 800 + rnd() * 800; target = -1;   // 0.8〜1.6 秒待ってから光る（予測させない）
}
function respond(k) {
  let idx = KEYS.indexOf(k), N = NS[bi];
  if (idx < 0 || simMode) return;
  if (phase === 'fore') { msg = '早すぎ！（光る前に押した）'; trials.push({ N, rt: null, ok: false, early: true }); nextTrial(); return; }
  if (phase !== 'stim') return;
  let rt = performance.now() - onset, ok = idx === target;
  msg = ok ? Math.round(rt) + ' ms' : 'ちがうキー（' + Math.round(rt) + ' ms）';
  trials.push({ N, rt, ok }); phase = 'iti'; tGo = millis() + 500; refit();
}
// N ごとの平均 RT（正解だけ）→ RT = a + b·log₂N
function means(tr) { return NS.map((N) => { let r = tr.filter((t) => t.N === N && t.ok && t.rt !== null).map((t) => t.rt); return r.length ? r.reduce((a, b) => a + b) / r.length : null; }); }
function refit() {
  let m = means(trials), xs = [], ys = [];
  NS.forEach((N, i) => { if (m[i] !== null) { xs.push(Math.log2(N)); ys.push(m[i]); } });
  fit = linFit(xs, ys);
}
function simTrials(per) {
  let out = [];
  for (let N of NS) for (let t = 0; t < per; t++) out.push({ N, rt: Math.max(120, SIM.a + SIM.b * Math.log2(N) + SIM.sd * rndNormal()), ok: rnd() > SIM.err * Math.log2(2 * N) });
  return out;
}
function runSim(seed) { resetData(true); seedRng(seed); trials = simTrials(30); bi = NS.length; phase = 'done'; refit(); }

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('スペースでブロック開始　光った箱の下のキー（A S D F J K L ;）をすぐ押す　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  text('人差し指を F と J に、ほかの指もとなりのキーに置いておく。速く、でもなるべくまちがえずに', 20, 62);

  if (phase === 'fore' && millis() >= tGo) { target = SETS[NS[bi]][Math.floor(rnd() * NS[bi])]; phase = 'stim'; onset = performance.now(); }
  if (phase === 'iti' && millis() >= tGo) nextTrial();
  // ---- 8 つの箱
  let N = NS[Math.min(bi, NS.length - 1)], bw = Math.min(70, (width * 0.5 - 60) / 8), bx = 20, by = 120;
  for (let i = 0; i < 8; i++) {
    let x = bx + i * (bw + 8) + (i >= 4 ? 20 : 0), use = SETS[N].indexOf(i) >= 0 && phase !== 'done';
    stroke(use ? 150 : 60); strokeWeight(2);
    fill(phase === 'stim' && i === target ? color(255, 220, 120) : use ? 45 : 32);
    rect(x, by, bw, bw, 8);
    noStroke(); fill(use ? 220 : 80); textSize(18); textAlign(CENTER); text(KEYS[i].toUpperCase(), x + bw / 2, by + bw + 26); textAlign(LEFT, BASELINE);
  }
  fill(220); textSize(16);
  let info = phase === 'done' ? (simMode ? 'シミュレーション観察者（各 N 30 試行）' : 'おつかれさま！ R でもう一度') : 'ブロック ' + (bi + 1) + ' / 4：N = ' + N + '（' + Math.log2(N) + ' bit）　' + blockCount() + ' / ' + PER + (phase === 'ready' ? '　→ スペースで開始' : '');
  text(info, bx, by + bw + 70);
  fill(255, 210, 120); textSize(22); text(msg, bx, by + bw + 110);
  // ---- 表
  let m = means(trials), ty = by + bw + 160;
  fill(160); textSize(14); text('N　　bit　平均 RT　誤り・早すぎ', bx, ty);
  NS.forEach((n, i) => { let e = trials.filter((t) => t.N === n && !t.ok).length, c = trials.filter((t) => t.N === n).length; fill(210); text(n + '　　' + Math.log2(n) + '　　' + (m[i] !== null ? Math.round(m[i]) + ' ms' : '-') + '　　' + e + ' / ' + c, bx, ty + 22 + i * 20); });

  // ---- RT と log₂N のグラフ
  let g = { x: width * 0.6, y: 110, w: width * 0.35, h: height * 0.5, x0: -0.3, x1: 3.3, y0: 0, y1: 1000 };
  plotAxes(g, 'log₂N [bit]', '反応時間 RT [ms]', [0, 1, 2, 3], [0, 250, 500, 750, 1000]);
  noStroke(); fill(120, 190, 255, 110);
  for (let t of trials) if (t.ok && t.rt !== null) circle(gX(g, Math.log2(t.N) + (((t.rt * 7) % 1) - 0.5) * 0.12), gY(g, Math.min(t.rt, 1000)), 5);
  fill(120, 190, 255); NS.forEach((n, i) => { if (m[i] !== null) circle(gX(g, Math.log2(n)), gY(g, m[i]), 13); });
  if (simMode) { stroke(120, 200, 140); strokeWeight(1.5); line(gX(g, 0), gY(g, SIM.a), gX(g, 3), gY(g, SIM.a + 3 * SIM.b)); }
  let ry = g.y + g.h + 56;
  if (fit && fit.ok) {
    stroke(255, 170, 90); strokeWeight(3); line(gX(g, 0), gY(g, fit.a), gX(g, 3), gY(g, fit.a + 3 * fit.b));
    noStroke(); fill(235); textSize(17);
    text('RT = ' + fit.a.toFixed(0) + ' + ' + fit.b.toFixed(0) + '·log₂N [ms]　r² = ' + fit.r2.toFixed(2), g.x, ry);
    textSize(15); text('1 bit 増えるごとに ' + fit.b.toFixed(0) + ' ms 遅くなる → 処理の速さ ≈ ' + (fit.b > 1 ? (1000 / fit.b).toFixed(1) + ' bit/秒' : '-'), g.x, ry + 26);
  } else { noStroke(); fill(235); textSize(16); text('2 つ以上の N を測ると直線を当てはめる', g.x, ry); }
  if (simMode) { noStroke(); fill(120, 200, 140); textSize(14); text('本当の値：a = ' + SIM.a + ' ms、b = ' + SIM.b + ' ms/bit', g.x, ry + 52); }
  noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === ' ' && phase === 'ready') { msg = ''; nextTrial(); return false; }
  if (key === 'o' || key === 'O') { runSim(++simSeed); return false; }
  if (key === 'r' || key === 'R') { resetData(false); return false; }
  respond(key.toLowerCase());
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('log₂1 = 0、log₂2 = 1、log₂4 = 2、log₂8 = 3（bit）', NS.every((n, i) => Math.log2(n) === i));
  check('各 N で使う箱の数 = N', NS.every((n) => SETS[n].length === n));
  let f = linFit([0, 1, 2, 3], [200, 350, 500, 650]);
  check('ゆらぎのない RT 200, 350, 500, 650 → a = 200、b = 150 ちょうど、r² = 1', near(f.a, 200, 1e-9) && near(f.b, 150, 1e-9) && near(f.r2, 1, 1e-12));
  check('N が 1 種類だけなら直線を当てはめない', linFit([1, 1, 1], [300, 320, 310]).ok === false);
  seedRng(52); let tr = simTrials(80), m = means(tr), f2 = linFit([0, 1, 2, 3], m);
  check('シミュレーション観察者（各 N 80 試行）：b ≈ 140 ms/bit（±15）', near(f2.b, SIM.b, 15));
  check('切片 a ≈ 220 ms（±25）', near(f2.a, SIM.a, 25));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 32 試行やって、自分の a と b を出そう。1/b は何 bit/秒？
// 2. 平均 RT は log₂N の直線に乗った？ N = 1 だけ特別に速くない？
// 3. まちがいの数は N とともに増えた？ 速さと正確さのトレードオフを考えよう
// 4. 片方の箱だけよく光るようにすると（確率をかたよらせる）、ヒックの法則ではどうなると予想できる？
// 5. メニューの項目数と選ぶ時間：アプリのメニューを設計するときに使えるか考えよう


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
