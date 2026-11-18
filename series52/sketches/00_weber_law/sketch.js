// ============================================
// 00 ウェーバーの法則 ─ 違いがわかる最小の差（弁別閾 JND）は、基準に比例する？
// 左右の点の数（または線の長さ）のどちらが多いかを答える。基準の大きさ 4 段階それぞれで上下法を同時に進め（交互配置）、JND を測る
// JND と基準のグラフが原点を通る直線 ΔI = k·I になれば、ウェーバーの法則。k = ウェーバー比
// クリック → スペースで開始 / ← = 左が多い（長い） → = 右 / 1 = 点の数  2 = 線の長さ / O = シミュレーション観察者 / R = やり直し
// ============================================

const BASES = { 1: [10, 20, 40, 80], 2: [60, 110, 160, 210] };   // ★ 基準の大きさ（点の数 / たての線の長さ px）
const PER = 10;                    // ★ 基準 1 つあたりの試行（4 × 10 = 40 試行）
const SHOW_MS = 900;               // ★ 点を見せる時間 [ms]（数えられないように短く）
const START = { 1: 0.3, 2: 0.15 };     // ★ 差 Δ のはじめの大きさ（基準に対する比）
const SIM_SIGMA = { 1: 0.2, 2: 0.05 };   // ★ シミュレーション観察者の「感じ方のゆらぎ」（対数でのばらつき）
let task = 1, stairs = [], phase = 'ready', tPhase = 0, cur = null, simMode = false, simSeed = 1;
let pg, result = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(Math.floor(width * 0.5), Math.floor(height * 0.55));
  selfTest();
  resetData(false);
}

function resetData(sim) {
  simMode = sim; phase = 'ready'; result = null; seedRng(Date.now());
  stairs = BASES[task].map((I) => makeStair(I * START[task], 1.3, 2, 1, I * (task === 1 ? 1.5 : 0.5), true));   // 差 Δ は基準の 30%（線は 15%）から
}
function deltaShown(st, I) { return task === 1 ? Math.max(1, Math.round(st.v)) : st.v; }   // 点の数は整数

function startTrial() {
  let cand = stairs.map((s, i) => i).filter((i) => stairs[i].track.length < PER);
  if (cand.length === 0) { phase = 'done'; return; }
  let m = Math.min(...cand.map((i) => stairs[i].track.length));
  cand = cand.filter((i) => stairs[i].track.length === m);
  let si = cand[Math.floor(rnd() * cand.length)], I = BASES[task][si], d = deltaShown(stairs[si], I);
  cur = { si, I, d, bigRight: rnd() < 0.5 };
  drawStim(cur); phase = 'stim'; tPhase = millis();
}

// 刺激を 1 回だけ描く（試行の間は変わらない）
function drawStim(c) {
  pg.background(30, 32, 40); pg.noStroke(); pg.fill(235);
  let hw = pg.width / 2;
  for (let side = 0; side < 2; side++) {
    let big = (side === 1) === c.bigRight, v = big ? c.I + c.d : c.I, cx = hw * side + hw / 2, cy = pg.height / 2;
    if (task === 1) {
      let pts = [], R = Math.min(hw, pg.height) * 0.42, tries = 0;
      while (pts.length < v && tries++ < 20000) {
        let a = rnd() * Math.PI * 2, r = R * Math.sqrt(rnd()), x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        if (pts.every((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 > 81)) pts.push([x, y]);
      }
      for (let p of pts) pg.circle(p[0], p[1], 6);
    } else {
      pg.stroke(235); pg.strokeWeight(5); pg.strokeCap(SQUARE);   // たての線（上下の位置は少しずらす）
      let x = cx + (rnd() - 0.5) * hw * 0.5, y0 = cy - v / 2 + (rnd() - 0.5) * 40;
      pg.line(x, y0, x, y0 + v); pg.noStroke();
    }
  }
}

function answer(right) {
  if (phase !== 'stim' && phase !== 'wait') return;
  stairUpdate(stairs[cur.si], right === cur.bigRight);
  phase = 'blank'; tPhase = millis(); computeResult();
}

// 4 つの階段のしきい値（JND）→ 原点を通る直線 ΔI = k·I を最小二乗で（k = ΣIΔ ÷ ΣI²）
function computeResult() {
  let Is = [], Ds = [];
  stairs.forEach((s, i) => { if (s.track.length >= 4) { let t = stairThreshold(s, 2); if (t) { Is.push(BASES[task][i]); Ds.push(t); } } });
  result = Is.length >= 2 ? { Is, Ds, k: weberK(Is, Ds), lin: linFit(Is, Ds) } : { Is, Ds, k: null };
}
function weberK(Is, Ds) { let a = 0, b = 0; for (let i = 0; i < Is.length; i++) { a += Is[i] * Ds[i]; b += Is[i] * Is[i]; } return b > 0 ? a / b : null; }

// シミュレーション観察者：感じる大きさ = I × e^(σ·ゆらぎ)。大きく感じたほうを答える
function simAnswer(I, d, sg) { return (I + d) * Math.exp(sg * rndNormal()) > I * Math.exp(sg * rndNormal()); }
function trueK(sg) { return Math.exp(Math.SQRT2 * sg * zOf(Math.SQRT1_2)) - 1; }   // 正答率 70.7% になる Δ/I
function runSim(n, seed) {
  resetData(true); seedRng(seed);
  stairs.forEach((s, i) => { let I = BASES[task][i]; for (let t = 0; t < n; t++) stairUpdate(s, simAnswer(I, deltaShown(s, I), SIM_SIGMA[task])); });
  phase = 'done'; computeResult();
}

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('スペースで開始　← 左が' + (task === 1 ? '多い' : '長い') + '　→ 右が' + (task === 1 ? '多い' : '長い') + '　1 点の数 / 2 線の長さ（いま：' + (task === 1 ? '点の数' : '線の長さ') + '）　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  text('上下法（2 回続けて正解で差を小さく、1 回まちがえたら大きく）→ 正答率 70.7% の差 = JND。基準 4 つを順番をまぜて同時に測る', 20, 62);

  let sx = 20, sy = 90;
  if (phase === 'blank' && millis() - tPhase > 500) startTrial();
  if (phase === 'stim' && task === 1 && millis() - tPhase > SHOW_MS) phase = 'wait';   // 点は短く見せて消す
  if (phase === 'stim') image(pg, sx, sy);
  else {
    noFill(); stroke(70); rect(sx, sy, pg.width, pg.height);
    noStroke(); fill(200); textSize(16); textAlign(CENTER);
    let msg = { ready: simMode ? '' : 'スペースで開始（' + BASES[task].length * PER + ' 試行）', wait: '左と右、どちらが多かった？（← / →）', done: simMode ? 'シミュレーション観察者の結果' : 'おつかれさま！ R でもう一度', blank: '+' }[phase];
    text(msg, sx + pg.width / 2, sy + pg.height / 2); textAlign(LEFT, BASELINE);
  }
  // ---- 階段の表
  let ty = sy + pg.height + 40;
  fill(170); textSize(14); text('基準 I　　試行　いまの差 Δ　反転　JND（しきい値）', sx, ty);
  stairs.forEach((s, i) => {
    let I = BASES[task][i], t = s.track.length >= 4 ? stairThreshold(s, 2) : null;
    fill(215); text(I + '　　　' + s.track.length + '　　' + deltaShown(s, I).toFixed(task === 1 ? 0 : 1) + '　　　' + s.revs.length + '　　' + (t ? t.toFixed(1) + '（' + (t / I * 100).toFixed(1) + '%）' : '-'), sx, ty + 22 + i * 20);
  });
  fill(200); textSize(15); text(simMode ? 'シミュレーション観察者（各 ' + stairs[0].track.length + ' 試行）' : 'あなたが観察者', sx, ty + 112);

  // ---- JND と基準のグラフ
  let Imax = BASES[task][3] * 1.1, g = { x: width * 0.62, y: 110, w: width * 0.34, h: height * 0.48, x0: 0, x1: Imax, y0: 0, y1: Imax * (task === 1 ? 0.4 : 0.12) };
  plotAxes(g, '基準の大きさ I', 'JND ΔI', [0, ...BASES[task]], [0, g.y1 / 2, g.y1]);
  if (simMode) { stroke(120, 200, 140, 170); strokeWeight(1.5); line(gX(g, 0), gY(g, 0), gX(g, Imax), gY(g, trueK(SIM_SIGMA[task]) * Imax)); }
  if (result && result.k) { stroke(255, 170, 90); strokeWeight(3); line(gX(g, 0), gY(g, 0), gX(g, Imax), gY(g, result.k * Imax)); }
  noStroke(); fill(120, 190, 255);
  if (result) result.Is.forEach((I, i) => circle(gX(g, I), gY(g, result.Ds[i]), 11));
  fill(235); textSize(17);
  let ry = g.y + g.h + 60;
  if (result && result.k) {
    text('ΔI = k·I　ウェーバー比 k = ' + result.k.toFixed(3) + '（基準の ' + (result.k * 100).toFixed(1) + '% 変われば気づく）', g.x - 40, ry);
    if (result.lin.ok) { fill(180); textSize(14); text('切片あり：ΔI = ' + result.lin.a.toFixed(2) + ' + ' + result.lin.b.toFixed(3) + '·I（切片 ≈ 0 ならウェーバーどおり）', g.x - 40, ry + 24); }
  } else text('基準 2 つ以上で 4 試行ずつ答えると直線を当てはめる', g.x - 40, ry);
  if (simMode) { fill(120, 200, 140); textSize(15); text('本当の k = ' + trueK(SIM_SIGMA[task]).toFixed(3) + '（σ = ' + SIM_SIGMA[task] + '）', g.x - 40, ry + 50); }
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === ' ' && phase === 'ready') startTrial();
  if (key === LEFT_ARROW) answer(false);
  if (key === RIGHT_ARROW) answer(true);
  if (key === '1' || key === '2') { task = +key; resetData(false); }
  if (key === 'o' || key === 'O') runSim(150, ++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('原点を通る直線：ΔI = 0.1·I のデータから k = 0.1', near(weberK([10, 20, 40], [1, 2, 4]), 0.1));
  check('1-up-2-down は p² = 0.5 の点（p = 0.7071）に集まる', near(Math.SQRT1_2 ** 2, 0.5) && near(Phi(zOf(Math.SQRT1_2)), 0.7071, 1e-4));
  check('σ = 0 なら本当の k = 0（ゆらぎがなければどんな差でもわかる）', near(trueK(0), 0, 1e-9));
  let st = makeStair(10, 1.3, 2, 1, 100); stairUpdate(st, true); stairUpdate(st, true); stairUpdate(st, false);
  check('階段：正正 → 1 段下げ（10 → 7.69）、誤 → 1 段上げ（→ 10）、反転 1 回', near(st.track[2].v, 10 / 1.3) && near(st.v, 10) && st.revs.length === 1);
  let keep = task; task = 1; seedRng(520);
  let Is = BASES[1], Ds = Is.map((I) => { let s = makeStair(I * START[1], 1.3, 2, 1, I * 1.5, true); for (let t = 0; t < 400; t++) stairUpdate(s, simAnswer(I, deltaShown(s, I), 0.2)); return stairThreshold(s, 4); });
  let k = weberK(Is, Ds);
  check('シミュレーション観察者（σ = 0.2）：推定 k ≈ 本当の k ' + trueK(0.2).toFixed(3) + '（±25%）', near(k, trueK(0.2), 0.25 * trueK(0.2)));
  task = 2; seedRng(521);
  Is = BASES[2]; Ds = Is.map((I) => { let s = makeStair(I * START[2], 1.3, 2, 1, I * 0.5, true); for (let t = 0; t < 400; t++) stairUpdate(s, simAnswer(I, s.v, 0.05)); return stairThreshold(s, 4); });
  check('線の長さ（σ = 0.05）：推定 k ≈ ' + trueK(0.05).toFixed(3) + '（±25%）', near(weberK(Is, Ds), trueK(0.05), 0.25 * trueK(0.05)));
  task = keep;
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 点の数で 40 試行。自分の k はいくつ？ 線の長さ（2）の k と比べると、どちらが細かく見分けられる？
// 2. グラフの点は原点を通る直線に乗った？ 基準が小さいところ（10 個）では法則からずれていない？
// 3. SHOW_MS を 300 にすると k はどう変わる？ 長くすると数えられてしまうのはなぜ？
// 4. O でシミュレーション観察者を何回か走らせ、推定 k のばらつきを見よう。PER を増やすとどうなる？
// 5. 重さや音の大きさのウェーバー比を調べて、ここで測った値と比べよう


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
// ---- 上下法（階段法）：nDown 回続けて正答で 1 段下げ（難しく）、1 回まちがえたら 1 段上げ（やさしく）
// 値は掛け算で動かす（factor 倍）。1-up-2-down は正答率 70.7%（p² = 0.5）、1-up-3-down は 79.4% に集まる
// fast = true なら、最初にまちがえるまでは 1 回正解ごとに factor² ずつ下げて、すばやくしきい値の近くへ
function makeStair(start, factor, nDown, lo, hi, fast) {
  return { v: start, factor, nDown, lo, hi, fast: !!fast, run: 0, dir: 0, track: [], revs: [] };
}
function stairUpdate(st, correct) {
  st.track.push({ v: st.v, ok: correct });
  if (st.fast && !correct) st.fast = false;
  if (st.fast) { st.dir = -1; st.v = clampv(st.v / (st.factor * st.factor), st.lo, st.hi); return; }
  let move = 0;
  if (correct) { st.run++; if (st.run >= st.nDown) { st.run = 0; move = -1; } }
  else { st.run = 0; move = 1; }
  if (move !== 0) {
    if (st.dir !== 0 && move !== st.dir) st.revs.push({ i: st.track.length - 1, v: st.v });   // 向きが変わった = 反転点
    st.dir = move;
    st.v = clampv(move < 0 ? st.v / st.factor : st.v * st.factor, st.lo, st.hi);
  }
}
// しきい値 = 反転点の幾何平均（最初の skip 個は練習とみなして捨てる）。足りなければ最後の 6 試行の幾何平均
function stairThreshold(st, skip) {
  let r = st.revs.slice(skip === undefined ? 2 : skip).map((q) => q.v);
  if (r.length < 2) r = st.track.slice(-6).map((q) => q.v);
  if (r.length === 0) return null;
  return Math.exp(r.reduce((s, v) => s + Math.log(v), 0) / r.length);
}
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
