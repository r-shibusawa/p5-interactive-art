// ============================================
// 02 スティーヴンスのべき法則 ─ 感じの大きさ R = c · I^n
// 左の基準を「100」としたとき、右はいくつに感じる？ 数字で答える（マグニチュード推定法）
// 両対数グラフ（log R と log I）で直線を当てはめると、傾きがべき指数 n。長さ・面積・明るさで n がちがう
// クリック → 数字キーで入力して Enter（Backspace で消す）/ T = 刺激の種類 / O = シミュレーション観察者 / R = やり直し
// ============================================

const TYPES = [                        // ★ 刺激の種類：基準の大きさと、見せる大きさ（6 段階）
  { name: '線の長さ', std: 150, xs: [40, 70, 110, 160, 230, 320], unit: 'px', simN: 1.0 },
  { name: '円の面積', std: 11000, xs: [1600, 3300, 6600, 13000, 26000, 44000], unit: 'px²', simN: 0.7 },
  { name: '明るさ', std: 0.2, xs: [0.02, 0.05, 0.1, 0.25, 0.5, 1], unit: '光の量', simN: 0.33 },
];
const REPS = 2;                        // ★ 1 段階あたりの回数（6 × 2 = 12 試行）
const SIM_NOISE = 0.15;                // ★ シミュレーション観察者の答えのばらつき（対数）
let ty = 0, data = [[], [], []], order = [], ti = 0, typed = '', phase = 'ready', tPhase = 0, simMode = false, simSeed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  newOrder();
}
function newOrder() {
  seedRng(Date.now()); order = [];
  for (let r = 0; r < REPS; r++) for (let x of TYPES[ty].xs) order.push(x);
  shuffleArr(order); ti = 0; typed = ''; phase = 'stim'; data[ty] = []; simMode = false;
}
function submit() {
  let v = parseFloat(typed);
  if (phase !== 'stim' || !(v > 0)) { typed = ''; return; }   // 0 以下は対数にできないので受けつけない
  data[ty].push([order[ti], v]); typed = ''; ti++;
  phase = ti >= order.length ? 'done' : 'blank'; tPhase = millis();
}
// 両対数で直線：log R = log c + n · log(I / 基準)
function fitPower(d, std) {
  let p = d.filter((q) => q[0] > 0 && q[1] > 0);
  let f = linFit(p.map((q) => Math.log(q[0] / std)), p.map((q) => Math.log(q[1])));
  return f.ok ? { n: f.b, c: Math.exp(f.a), r2: f.r2 } : null;
}
// シミュレーション観察者：R = 100 · (I / 基準)^n · e^(ゆらぎ)、整数に丸める
function simAnswer(T, x) { return Math.max(1, Math.round(100 * Math.pow(x / T.std, T.simN) * Math.exp(SIM_NOISE * rndNormal()))); }
function runSim(seed) {
  seedRng(seed);
  TYPES.forEach((T, k) => { data[k] = []; for (let r = 0; r < 8; r++) for (let x of T.xs) data[k].push([x, simAnswer(T, x)]); });
  simMode = true; phase = 'done'; ti = order.length;
}

function drawStim(T, x, cx, cy) {
  if (T === TYPES[0]) { stroke(235); strokeWeight(6); strokeCap(SQUARE); line(cx - x / 2, cy, cx + x / 2, cy); noStroke(); }
  else if (T === TYPES[1]) { noStroke(); fill(235); circle(cx, cy, 2 * Math.sqrt(x / Math.PI)); }
  else { noStroke(); fill(linToSrgb(x)); rect(cx - 70, cy - 70, 140, 140); }
}

function draw() {
  background(30, 32, 40);
  let T = TYPES[ty];
  fill(235); noStroke(); textSize(18);
  text('数字キー → Enter で答える　Backspace 消す　T 種類（いま：' + T.name + '）　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  text('左の基準を 100 とすると、右はいくつ？ 2 倍に感じたら 200、半分なら 50。思ったとおりの数でよい（正解はない）', 20, 62);

  // ---- 刺激
  let bx = 20, by = 90, bw = width * 0.5, bh = height * 0.5;
  fill(18); rect(bx, by, bw, bh);
  if (phase === 'blank' && millis() - tPhase > 500) phase = 'stim';
  if (phase === 'stim') {
    drawStim(T, T.std, bx + bw * 0.25, by + bh * 0.5); drawStim(T, order[ti], bx + bw * 0.72, by + bh * 0.5);
    fill(200); textSize(16); textAlign(CENTER);
    text('基準 = 100', bx + bw * 0.25, by + bh - 20); text('これは？', bx + bw * 0.72, by + bh - 20);
    textSize(40); fill(255, 210, 120); text(typed === '' ? '_' : typed, bx + bw * 0.72, by + 60); textAlign(LEFT, BASELINE);
  } else if (phase === 'done') { fill(200); textSize(16); textAlign(CENTER); text(simMode ? 'シミュレーション観察者（3 種類 × 48 回）' : 'おつかれさま！ T でほかの種類も', bx + bw / 2, by + bh / 2); textAlign(LEFT, BASELINE); }
  fill(200); textSize(15);
  text((simMode ? 'シミュレーション観察者' : 'あなたが観察者') + '　' + T.name + '　' + Math.min(ti, order.length) + ' / ' + order.length, bx, by + bh + 26);
  fill(160); textSize(13);
  let last = data[ty].slice(-6).map((q) => (T === TYPES[2] ? q[0] : Math.round(q[0])) + '→' + q[1]).join('　');
  text('最近の答え：' + last, bx, by + bh + 48);

  // ---- 両対数グラフ（3 種類を重ねる）
  let g = { x: width * 0.6, y: 110, w: width * 0.36, h: height * 0.5, x0: 0.08, x1: 5, y0: 5, y1: 1000, logx: true, logy: true };
  plotAxes(g, '刺激 ÷ 基準（対数）', '答えた数 R（対数）', [0.1, 0.3, 1, 3], [10, 30, 100, 300, 1000]);
  let cols = [color(120, 190, 255), color(255, 170, 90), color(220, 130, 255)];
  let ry = g.y + g.h + 56;
  TYPES.forEach((Tk, k) => {
    let d = data[k];
    noStroke(); fill(cols[k]);
    for (let q of d) circle(gX(g, q[0] / Tk.std), gY(g, q[1]), k === ty ? 8 : 5);
    let f = fitPower(d, Tk.std);
    if (f) {
      stroke(cols[k]); strokeWeight(k === ty ? 3 : 1.5);
      line(gX(g, 0.08), gY(g, f.c * Math.pow(0.08, f.n)), gX(g, 5), gY(g, f.c * Math.pow(5, f.n)));
      noStroke(); fill(cols[k]); textSize(16);
      text(Tk.name + '：n = ' + f.n.toFixed(2) + '　c = ' + f.c.toFixed(0) + '　r² = ' + f.r2.toFixed(2) + (simMode ? '　（本当の n = ' + Tk.simN + '）' : ''), g.x - 30, ry + k * 26);
    } else { noStroke(); fill(cols[k]); textSize(16); text(Tk.name + '：まだデータなし', g.x - 30, ry + k * 26); }
  });
  fill(170); textSize(13); text('n < 1：大きくなるほど増え方がにぶる（明るさ）　n ≈ 1：比例（長さ）', g.x - 30, ry + 86);
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key >= '0' && key <= '9' && typed.length < 5) typed += key;
  if (key === '.' && typed.indexOf('.') < 0) typed += '.';
  if (key === BACKSPACE) typed = typed.slice(0, -1);
  if (key === ENTER) submit();
  if (key === 't' || key === 'T') { ty = (ty + 1) % TYPES.length; newOrder(); }
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') { data = [[], [], []]; newOrder(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let T = TYPES[1], d = T.xs.map((x) => [x, 100 * Math.pow(x / T.std, 0.7)]), f = fitPower(d, T.std);
  check('ゆらぎのない答え R = 100·(I/基準)^0.7 → n = 0.7、c = 100 ちょうど', f && near(f.n, 0.7, 1e-9) && near(f.c, 100, 1e-6));
  check('両対数で直線なので r² = 1', f && near(f.r2, 1, 1e-9));
  let f2 = fitPower([[1, 50], [4, 100]], 1);
  check('2 点 (1, 50) と (4, 100) → n = log 2 ÷ log 4 = 0.5', f2 && near(f2.n, 0.5, 1e-12));
  check('0 や負の答えは除く（対数にできない）→ NaN にならない', fitPower([[1, 0], [2, -3]], 1) === null && fitPower([[1, 0], [2, 10], [4, 20]], 1).n > 0);
  seedRng(52); let d3 = []; for (let r = 0; r < 20; r++) for (let x of TYPES[2].xs) d3.push([x, simAnswer(TYPES[2], x)]);
  check('シミュレーション観察者（明るさ、120 回）：n ≈ 0.33（±0.05）', near(fitPower(d3, TYPES[2].std).n, 0.33, 0.05));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 3 種類を全部やって、n を比べよう。明るさの n は 1 より小さい？ 長さは 1 に近い？
// 2. 面積の n が 1 より小さいと、グラフの円の大きさで量を表すときにどんな誤解が起きる？
// 3. 基準の数を 100 ではなく 10 にすると、答え方や n は変わる？
// 4. O を押して、本当の n と推定した n を比べよう。SIM_NOISE を大きくするとどうなる？
// 5. TYPES に「線の太さ」や「点の数」を足して、自分の n を測ってみよう


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
// ---- 画面の値 sRGB（0〜255）⇔ 光の量（0〜1、線形）。画面の値 128 は光の量では約 0.22
function srgbToLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linToSrgb(v) { v = clampv(v, 0, 1); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
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
