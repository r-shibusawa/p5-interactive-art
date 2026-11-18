// ============================================
// 03 恒常法と心理測定関数 ─「下の線は上の線より長い？」
// 決まった 7 段階の長さをランダムな順に何回も見せ、「長い」と答えた割合をグラフにする（恒常法）
// その点にロジスティック関数を最尤法で当てはめ、PSE（主観的等価点 = 50%）と JND（25%〜75% の幅の半分）を求める
// クリック → スペースで開始 / ← = 短い  → = 長い / O = シミュレーション観察者 / R = やり直し
// ============================================

const STD = 200;                                  // ★ 基準の線の長さ [px]
const LEVELS = [180, 187, 193, 200, 207, 213, 220];  // ★ 比較の線の長さ（7 段階）
const REPS = 5;                                   // ★ 1 段階あたりの回数（7 × 5 = 35 試行）
const SIM = { pse: 203, s: 6 };                   // ★ シミュレーション観察者の本当の値（s = ロジスティックの広がり）
let order = [], ti = 0, ks = [], ns = [], phase = 'ready', tPhase = 0, offs = [0, 0];
let fit = { ok: false }, simMode = false, simSeed = 1, lastAns = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}

function resetData(sim) {
  simMode = sim; ks = LEVELS.map(() => 0); ns = LEVELS.map(() => 0);
  order = []; for (let r = 0; r < REPS; r++) for (let i = 0; i < LEVELS.length; i++) order.push(i);
  seedRng(Date.now()); shuffleArr(order); ti = 0; phase = 'ready'; fit = { ok: false };
}

function startTrial() {
  phase = 'stim'; tPhase = millis();
  offs = [Math.round((rnd() - 0.5) * 120), Math.round((rnd() - 0.5) * 120)];   // 端の位置で比べられないように左右にずらす
}

function answer(longer) {
  if (phase !== 'stim') return;
  let i = order[ti]; ns[i]++; if (longer) ks[i]++;
  lastAns = longer ? '長い' : '短い';
  fit = fitLogistic(LEVELS, ks, ns, 0);
  ti++; phase = ti >= order.length ? 'done' : 'blank'; tPhase = millis();
}

// シミュレーション観察者：本当の心理測定関数 p(x) で「長い」と答える（コンピュータの中だけで、画面はちらつかない）
function simObserver(x) { return rnd() < 1 / (1 + Math.exp(-(x - SIM.pse) / SIM.s)); }
function runSim(perLevel, seed) {
  resetData(true); seedRng(seed);
  for (let i = 0; i < LEVELS.length; i++) for (let r = 0; r < perLevel; r++) { ns[i]++; if (simObserver(LEVELS[i])) ks[i]++; }
  ti = order.length; phase = 'done';
  fit = fitLogistic(LEVELS, ks, ns, 0);
}

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('クリックしてからスペースで開始　← 短い　→ 長い　O：シミュレーション観察者　R：やり直し', 20, 36);
  fill(170); textSize(15);
  text('上が基準（' + STD + ' px）。下の線は上より「長い」？ 迷っても必ずどちらかを答える（強制選択）', 20, 62);

  // ---- 刺激（左半分）
  let cx = width * 0.27, cy = height * 0.45;
  if (phase === 'blank' && millis() - tPhase > 600) startTrial();    // 0.6 秒あけて次へ（速く切りかわらない）
  if (phase === 'stim') {
    stroke(235); strokeWeight(6); strokeCap(SQUARE);
    line(cx - STD / 2 + offs[0], cy - 60, cx + STD / 2 + offs[0], cy - 60);
    let L = LEVELS[order[ti]];
    line(cx - L / 2 + offs[1], cy + 60, cx + L / 2 + offs[1], cy + 60);
    noStroke(); fill(150); textSize(14); textAlign(CENTER);
    text('基準', cx + offs[0], cy - 80); text('比較', cx + offs[1], cy + 95); textAlign(LEFT, BASELINE);
  } else {
    stroke(120); strokeWeight(2); line(cx - 8, cy, cx + 8, cy); line(cx, cy - 8, cx, cy + 8);   // 注視点
    noStroke(); fill(200); textSize(16); textAlign(CENTER);
    if (phase === 'ready') text(simMode ? '' : 'スペースで開始（' + order.length + ' 試行）', cx, cy + 50);
    if (phase === 'done') text(simMode ? 'シミュレーション観察者の結果' : 'おつかれさま！ R でもう一度', cx, cy + 50);
    textAlign(LEFT, BASELINE);
  }
  fill(200); textSize(15);
  text((simMode ? 'シミュレーション観察者' : 'あなたが観察者') + (simMode ? '　試行 ' + ns.reduce((a, b) => a + b, 0) : '　試行 ' + Math.min(ti, order.length) + ' / ' + order.length) + (lastAns && !simMode ? '　（前の答え：' + lastAns + '）' : ''), 20, height - 110);

  // ---- 結果の表
  textSize(13); fill(160);
  let tx = 20, ty = height - 80;
  text('長さ', tx, ty); text('回数', tx, ty + 18); text('「長い」', tx, ty + 36);
  LEVELS.forEach((L, i) => { fill(210); text(L, tx + 60 + i * 52, ty); text(ns[i], tx + 60 + i * 52, ty + 18); text(ns[i] ? (ks[i] / ns[i]).toFixed(2) : '-', tx + 60 + i * 52, ty + 36); });

  // ---- 心理測定関数のグラフ（右半分）
  let g = { x: width * 0.56, y: 110, w: width * 0.4, h: height * 0.5, x0: 175, x1: 225, y0: 0, y1: 1 };
  plotAxes(g, '比較の長さ [px]', '「長い」と答えた割合', [180, 190, 200, 210, 220], [0, 0.25, 0.5, 0.75, 1]);
  stroke(70); strokeWeight(1);
  for (let v of [0.25, 0.5, 0.75]) line(g.x, gY(g, v), g.x + g.w, gY(g, v));
  if (simMode) {                                  // 本当の関数（点線のかわりに細い線）
    stroke(120, 200, 140, 150); strokeWeight(1.5);
    let pts = []; for (let x = 175; x <= 225; x += 0.5) pts.push([gX(g, x), gY(g, 1 / (1 + Math.exp(-(x - SIM.pse) / SIM.s)))]); polyline(pts);
  }
  if (fit.ok) {
    stroke(255, 170, 90); strokeWeight(3);
    let pts = []; for (let x = 175; x <= 225; x += 0.5) pts.push([gX(g, x), gY(g, fit.p(x))]); polyline(pts);
    let x25 = fit.pse - fit.jnd, x75 = fit.pse + fit.jnd;
    stroke(255, 170, 90, 160); strokeWeight(1);
    line(gX(g, fit.pse), gY(g, 0), gX(g, fit.pse), gY(g, 0.5));
    line(gX(g, x25), gY(g, 0.25), gX(g, x25), gY(g, 0)); line(gX(g, x75), gY(g, 0.75), gX(g, x75), gY(g, 0));
  }
  noStroke();
  LEVELS.forEach((L, i) => { if (ns[i] > 0) { fill(120, 190, 255); circle(gX(g, L), gY(g, ks[i] / ns[i]), 6 + Math.sqrt(ns[i]) * 2); } });

  fill(235); textSize(17);
  let ry = g.y + g.h + 60;
  if (fit.ok) {
    text('PSE（50% 点）= ' + fit.pse.toFixed(1) + ' px　（基準 ' + STD + ' px とのずれ ' + (fit.pse - STD).toFixed(1) + '）', g.x, ry);
    text('JND（25%〜75% の幅の半分）= ' + fit.jnd.toFixed(1) + ' px　→ ウェーバー比 ' + (fit.jnd / STD).toFixed(3) + (fit.steep ? '　（答えが完全に分かれた：傾きは上限）' : ''), g.x, ry + 26);
  } else text('データ不足（2 段階以上・4 試行以上で当てはめる）', g.x, ry);
  if (simMode) { fill(120, 200, 140); textSize(15); text('本当の値：PSE = ' + SIM.pse + ' px、JND = ' + (SIM.s * Math.log(3)).toFixed(2) + ' px（O で別の乱数）', g.x, ry + 52); }

  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === ' ' && phase === 'ready') startTrial();
  if (key === LEFT_ARROW) answer(false);
  if (key === RIGHT_ARROW) answer(true);
  if (key === 'o' || key === 'O') runSim(40, ++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト：答えのわかっているデータで当てはめを確かめる
function selfTest() {
  selfTestResults = [];
  check('Φ(0) = 0.5、z(Φ(1)) = 1', near(Phi(0), 0.5, 1e-6) && near(zOf(Phi(1)), 1, 1e-5));
  let xs = [1, 2, 3, 4, 5], a = -6, b = 2, ps = xs.map((x) => 1 / (1 + Math.exp(-(a + b * x))));
  let f0 = fitLogistic(xs, ps.map((p) => p * 1e4), xs.map(() => 1e4), 0);
  check('割合がちょうど関数上にあれば a, b をそのまま復元（a = −6, b = 2）', f0.ok && near(f0.a, a, 1e-4) && near(f0.b, b, 1e-4));
  check('PSE = −a/b = 3、JND = ln3 / b = 0.549', near(f0.pse, 3, 1e-4) && near(f0.jnd, Math.log(3) / 2, 1e-4));
  check('当てはめた関数は PSE で 0.5、PSE ± JND で 0.25 と 0.75', near(f0.p(f0.pse), 0.5, 1e-6) && near(f0.p(f0.pse + f0.jnd), 0.75, 1e-6) && near(f0.p(f0.pse - f0.jnd), 0.25, 1e-6));
  seedRng(52); let K = LEVELS.map(() => 0), Nn = LEVELS.map(() => 300);
  LEVELS.forEach((L, i) => { for (let r = 0; r < 300; r++) if (simObserver(L)) K[i]++; });
  let f1 = fitLogistic(LEVELS, K, Nn, 0);
  check('シミュレーション観察者 2100 試行：PSE ≈ 203（±1.5）', f1.ok && near(f1.pse, SIM.pse, 1.5));
  check('シミュレーション観察者 2100 試行：JND ≈ 6.59（±15%）', f1.ok && near(f1.jnd, SIM.s * Math.log(3), 0.15 * SIM.s * Math.log(3)));
  check('データ不足（1 段階だけ）なら「当てはめない」で NaN を出さない', fitLogistic([200], [3], [5], 0).ok === false);
  let f2 = fitLogistic([190, 200, 210], [0, 0, 5], [5, 5, 5], 0);
  check('答えが完全に分かれても PSE は 200〜210 の有限の値', f2.ok && f2.pse > 200 && f2.pse < 210);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 35 試行やって、自分の PSE と JND を隣の人と比べよう。PSE が 200 からずれるのはなぜ？（上下の位置、線の太さ…）
// 2. REPS を 10 にすると点のばらつきはどう変わる？ 当てはめた曲線は安定する？
// 3. O を何回か押して、40 回 × 7 段階でも推定値が本当の値のまわりでどれくらいばらつくかを見よう
// 4. LEVELS の間かくを広げすぎる・狭めすぎると、当てはめはどうなる？（全部 0 か 1 になる段階が増える）
// 5. 比較の線を斜めにしたり色を変えたりして、PSE が動くかを測ってみよう


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
// ---- ロジスティック関数を最尤法で当てはめる
// p(x) = g + (1 − g) / (1 + e^−(a + b x))　g = 当て推量の正答率（Yes/No なら 0、2 肢強制選択なら 0.5）
// xs = 刺激の値、ks = 「はい／正答」の数、ns = 試行数。ニュートン法（フィッシャーのスコア法）で a, b を求める
// PSE = −a / b（ロジスティックの真ん中）、JND = ln3 / |b|（25% 点と 75% 点の幅の半分）
function fitLogistic(xs, ks, ns, g) {
  g = g || 0;
  let N = 0, mx = 0, vals = [];
  for (let i = 0; i < xs.length; i++) if (ns[i] > 0) { N += ns[i]; mx += ns[i] * xs[i]; if (vals.indexOf(xs[i]) < 0) vals.push(xs[i]); }
  if (N < 4 || vals.length < 2) return { ok: false };
  mx /= N;
  let sx = 0;
  for (let i = 0; i < xs.length; i++) sx += ns[i] * (xs[i] - mx) * (xs[i] - mx);
  sx = Math.sqrt(sx / N) || 1;
  const BMAX = 25;                     // 傾きの上限（全部そろった答えでも無限大にしない）
  let u = xs.map((x) => (x - mx) / sx), a = 0, b = 1;
  let P = (a, b, ui) => clampv(g + (1 - g) / (1 + Math.exp(-(a + b * ui))), 1e-9, 1 - 1e-9);
  let LL = (a, b) => { let s = 0; for (let i = 0; i < u.length; i++) { let p = P(a, b, u[i]); s += ks[i] * Math.log(p) + (ns[i] - ks[i]) * Math.log(1 - p); } return s; };
  let it = 0;
  for (; it < 60; it++) {
    let Haa = 1e-6, Hab = 0, Hbb = 1e-6, ga = 0, gb = 0;
    for (let i = 0; i < u.length; i++) {
      if (ns[i] <= 0) continue;
      let L = 1 / (1 + Math.exp(-(a + b * u[i]))), p = P(a, b, u[i]), dp = (1 - g) * L * (1 - L);
      let w = (ns[i] * dp * dp) / (p * (1 - p)), sc = ((ks[i] - ns[i] * p) / (p * (1 - p))) * dp;
      Haa += w; Hab += w * u[i]; Hbb += w * u[i] * u[i]; ga += sc; gb += sc * u[i];
    }
    let det = Haa * Hbb - Hab * Hab;
    if (!(det > 1e-12)) break;
    let da = (Hbb * ga - Hab * gb) / det, db = (Haa * gb - Hab * ga) / det, t = 1, l0 = LL(a, b);
    let mag = Math.hypot(da, db); if (mag > 5) { da *= 5 / mag; db *= 5 / mag; }
    while (t > 1e-4 && LL(a + t * da, clampv(b + t * db, -BMAX, BMAX)) < l0 - 1e-12) t /= 2;
    a += t * da; b = clampv(b + t * db, -BMAX, BMAX);
    if (Math.abs(t * da) + Math.abs(t * db) < 1e-10) break;
  }
  let B = b / sx, A = a - (b * mx) / sx;
  if (!isFinite(A) || !isFinite(B) || Math.abs(B) < 1e-12) return { ok: false };
  return { ok: true, a: A, b: B, pse: -A / B, jnd: Math.log(3) / Math.abs(B), steep: Math.abs(b) >= BMAX * 0.999, iters: it, g,
           p: (x) => g + (1 - g) / (1 + Math.exp(-(A + B * x))) };
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
