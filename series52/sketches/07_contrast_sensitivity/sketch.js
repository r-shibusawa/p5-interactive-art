// ============================================
// 07 コントラスト感度関数（CSF）─ どの細かさの縞がいちばん見えやすい？
// 左の図は計算で作った縞（キャンベル-ロブソン型）：右へ行くほど細かく（空間周波数が高く）、上へ行くほどうすく（コントラストが低く）なる
// モード 1：縞が見えなくなる高さを、横の位置を変えながら何か所かクリック → 感度 S = 1 / コントラスト を両対数で描き、放物線を当てはめる
// モード 2：周波数を ←→ で選び、縞が + の上か下かを ↑↓ で答える上下法（1-up-2-down）。しきい値を CSF に足す
// 1 / 2 = モード / O = シミュレーション観察者 / R = やり直し
// ============================================

const VIEW_CM = 50, PX_PER_CM = 38;    // ★ 目と画面の距離 [cm] と、画面の 1 cm の画素数（だいたいでよい）
const PX_PER_DEG = VIEW_CM * Math.tan(Math.PI / 180) * PX_PER_CM;   // 視角 1 度あたりの画素数
const F0 = 0.15, F1 = 14;              // ★ 図の左はし・右はしの空間周波数 [cycles/deg]
const C_MIN = 0.003, C_MAX = 0.8;      // ★ 図の上はし・下はしのコントラスト
const FREQS = [0.5, 1, 2, 4, 8];       // ★ モード 2 で測る周波数 [c/deg]
const SIM = { smax: 150, fp: 3, k: 0.5 };   // ★ シミュレーション観察者の CSF：ln S = ln Smax − k (ln f − ln fp)²
let chart, patch, cw, ch, clicks = [], stairPts = [], fi = 2, st, tmode = 1, phase = 'ready', tPhase = 0, cur = null, simMode = false, simSeed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  cw = Math.floor(width * 0.52); ch = Math.floor(height * 0.62);
  chart = createGraphics(cw, ch); chart.pixelDensity(1); makeChart();
  patch = createGraphics(130, 130); patch.pixelDensity(1);
  selfTest();
  resetData(false);
}
function resetData(sim) { simMode = sim; clicks = []; stairPts = []; st = makeStair(0.05, 1.3, 2, C_MIN, C_MAX, true); phase = 'ready'; seedRng(Date.now()); }
// 図の位置 → 周波数・コントラスト（どちらも対数で等間隔）
function freqAt(x) { return F0 * Math.pow(F1 / F0, x / cw); }
function contrastAt(y) { return C_MIN * Math.pow(C_MAX / C_MIN, y / ch); }
function makeChart() {
  chart.loadPixels();
  let r = Math.log(F1 / F0), k = (2 * Math.PI * F0 * cw) / (r * PX_PER_DEG);
  seedRng(1);
  for (let x = 0; x < cw; x++) {
    let ph = k * (Math.exp((r * x) / cw) - 1);           // 周波数が変わっても縞がつながるように、周波数を積分した位相
    for (let y = 0; y < ch; y++) {
      let v = 128 * (1 + contrastAt(y) * Math.sin(ph)) + rnd() - 0.5, o = 4 * (y * cw + x);
      chart.pixels[o] = chart.pixels[o + 1] = chart.pixels[o + 2] = clampv(Math.round(v), 0, 255); chart.pixels[o + 3] = 255;
    }
  }
  chart.updatePixels();
}
function makePatch(f, c) {
  patch.loadPixels();
  let N = patch.width;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let dx = x - N / 2, dy = y - N / 2, env = Math.exp(-(dx * dx + dy * dy) / (2 * 22 * 22));
    let v = 128 * (1 + c * env * Math.sin((2 * Math.PI * f * dx) / PX_PER_DEG)) + rnd() - 0.5, o = 4 * (y * N + x);
    patch.pixels[o] = patch.pixels[o + 1] = patch.pixels[o + 2] = clampv(Math.round(v), 0, 255); patch.pixels[o + 3] = 255;
  }
  patch.updatePixels();
}
function startTrial() { if (st.track.length >= 30) { finishStair(); return; } cur = { up: rnd() < 0.5 }; makePatch(FREQS[fi], st.v); phase = 'fix'; tPhase = millis(); }
function finishStair() { let t = stairThreshold(st, 2); if (t) stairPts.push([FREQS[fi], 1 / t]); st = makeStair(0.05, 1.3, 2, C_MIN, C_MAX, true); phase = 'ready'; }
function answer(up) { if (tmode !== 2 || (phase !== 'stim' && phase !== 'wait')) return; stairUpdate(st, up === cur.up); phase = 'blank'; tPhase = millis(); }

// 両対数で放物線：ln S = a + b u + c u²（u = ln f）を最小二乗で → ピーク周波数 = e^(−b / 2c)
function fitCSF(pts) {
  if (pts.length < 3) return null;
  let M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
  for (let p of pts) { let u = Math.log(p[0]), s = Math.log(p[1]), q = [1, u, u * u]; for (let i = 0; i < 3; i++) { v[i] += q[i] * s; for (let j = 0; j < 3; j++) M[i][j] += q[i] * q[j]; } }
  let D = det3(M); if (Math.abs(D) < 1e-9) return null;
  let sol = [0, 1, 2].map((k) => det3(M.map((r, i) => r.map((x, j) => (j === k ? v[i] : x)))) / D);
  let [a, b, c] = sol, peak = c < 0 ? Math.exp(-b / (2 * c)) : null;
  return { a, b, c, peak, smax: peak ? Math.exp(a - (b * b) / (4 * c)) : null, S: (f) => Math.exp(a + b * Math.log(f) + c * Math.log(f) ** 2) };
}
function det3(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
// シミュレーション観察者
function simS(f) { return SIM.smax * Math.exp(-SIM.k * (Math.log(f) - Math.log(SIM.fp)) ** 2); }
function simPc(f, c) { let s = 0.35, alpha = (1 / simS(f)) / Math.exp(s * Math.log(0.4142 / 0.5858)); return 0.5 + 0.5 / (1 + Math.exp(-(Math.log(c) - Math.log(alpha)) / s)); }
function runSim(seed) {
  resetData(true); seedRng(seed);
  for (let i = 0; i < 10; i++) { let f = F0 * Math.pow(F1 / F0, (i + 0.5) / 10); clicks.push([f, simS(f) * Math.exp(0.15 * rndNormal())]); }
  for (let f of FREQS) { let s = makeStair(0.05, 1.3, 2, C_MIN, C_MAX, true); for (let t = 0; t < 60; t++) stairUpdate(s, rnd() < simPc(f, s.v)); stairPts.push([f, 1 / stairThreshold(s, 2)]); }
}

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('1 クリックで記録　2 上下法（←→ 周波数、スペース開始、↑↓ で答える）　いま：' + (tmode === 1 ? 'クリック' : '上下法') + '　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  text('縞が見えなくなる高さをクリック。右へ行くほど細かい（c/deg = 視角 1 度あたりの縞の数、目から ' + VIEW_CM + ' cm で）', 20, 62);
  let sx = 20, sy = 84;
  if (tmode === 1) {
    image(chart, sx, sy);
    noStroke(); fill(255, 170, 90);
    for (let p of clicks) { let x = sx + (cw * Math.log(p[0] / F0)) / Math.log(F1 / F0), y = sy + (ch * Math.log(1 / p[1] / C_MIN)) / Math.log(C_MAX / C_MIN); circle(x, y, 9); }
    fill(170); textSize(13); text('← 粗い（' + F0 + ' c/deg）', sx, sy + ch + 18); textAlign(RIGHT); text('細かい（' + F1 + ' c/deg）→', sx + cw, sy + ch + 18); textAlign(LEFT, BASELINE);
  } else {
    if (phase === 'blank' && millis() - tPhase > 500) startTrial();
    if (phase === 'fix' && millis() - tPhase > 400) { phase = 'stim'; tPhase = millis(); }
    if (phase === 'stim' && millis() - tPhase > 500) phase = 'wait';
    noStroke(); fill(128); rect(sx, sy, cw, ch);
    let px = sx + cw / 2 - 65, py = sy + ch / 2 + (cur && cur.up ? -175 : 45);
    if (phase === 'stim') image(patch, px, py);
    stroke(70); strokeWeight(2); line(sx + cw / 2 - 7, sy + ch / 2, sx + cw / 2 + 7, sy + ch / 2); line(sx + cw / 2, sy + ch / 2 - 7, sx + cw / 2, sy + ch / 2 + 7);
    noStroke(); fill(205); textSize(15);
    text('周波数 ' + FREQS[fi] + ' c/deg　試行 ' + st.track.length + ' / 30　コントラスト ' + (st.v * 100).toFixed(2) + '%　' + (phase === 'ready' ? 'スペースで開始' : phase === 'wait' ? '上（↑）？ 下（↓）？' : ''), sx, sy + ch + 22);
  }
  fill(200); textSize(14); text(simMode ? 'シミュレーション観察者' : 'あなたが観察者', sx, sy + ch + 44);

  // ---- CSF のグラフ
  let g = { x: width * 0.62, y: 110, w: width * 0.34, h: height * 0.5, x0: F0, x1: F1, y0: 1, y1: 1 / C_MIN, logx: true, logy: true };
  plotAxes(g, '空間周波数 [c/deg]', '感度 S = 1 / コントラスト', [0.2, 0.5, 1, 2, 5, 10], [1, 3, 10, 30, 100, 300]);
  let drawS = (fn, col, w) => { stroke(col); strokeWeight(w); let p = []; for (let i = 0; i <= 120; i++) { let f = F0 * Math.pow(F1 / F0, i / 120), s = fn(f); if (s > 0 && isFinite(s)) p.push([gX(g, f), gY(g, s)]); } polyline(p); };
  if (simMode) drawS(simS, color(120, 200, 140), 1.5);
  let all = clicks.concat(stairPts), fit = fitCSF(all);
  if (fit) drawS(fit.S, color(255, 170, 90), 3);
  noStroke(); fill(255, 170, 90); for (let p of clicks) circle(gX(g, p[0]), gY(g, p[1]), 9);
  fill(120, 190, 255); for (let p of stairPts) circle(gX(g, p[0]), gY(g, p[1]), 13);
  fill(235); textSize(16);
  let ry = g.y + g.h + 56;
  if (fit && fit.peak) text('山の周波数 ≈ ' + fit.peak.toFixed(2) + ' c/deg　最大感度 ≈ ' + fit.smax.toFixed(0) + '（' + (100 / fit.smax).toFixed(2) + '%）', g.x - 30, ry);
  else text('3 点以上で放物線を当てはめる（上に凸のとき山の位置を出す）', g.x - 30, ry);
  fill(170); textSize(13); text('橙 = クリック、青 = 上下法、橙の線 = 両対数で放物線', g.x - 30, ry + 24);
  if (simMode) { fill(120, 200, 140); text('緑 = 本当の CSF（山 ' + SIM.fp + ' c/deg、最大感度 ' + SIM.smax + '）', g.x - 30, ry + 44); }
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function mousePressed() {
  if (tmode !== 1) return;
  let x = mouseX - 20, y = mouseY - 84;
  if (x >= 0 && x < cw && y >= 0 && y < ch) { if (simMode) resetData(false); clicks.push([freqAt(x), 1 / contrastAt(y)]); }
}
function keyPressed() {
  if (key === '1' || key === '2') { tmode = +key; phase = 'ready'; }
  if (tmode === 2) {
    if (key === ' ' && phase === 'ready') { if (simMode) resetData(false); startTrial(); }
    if (key === UP_ARROW) answer(true);
    if (key === DOWN_ARROW) answer(false);
    if ((key === LEFT_ARROW || key === RIGHT_ARROW) && phase === 'ready') { fi = clampv(fi + (key === LEFT_ARROW ? -1 : 1), 0, FREQS.length - 1); st = makeStair(0.05, 1.3, 2, C_MIN, C_MAX, true); }
  }
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('図の上はしのコントラスト = ' + C_MIN + '、下はし = ' + C_MAX, near(contrastAt(0), C_MIN, 1e-12) && near(contrastAt(ch), C_MAX, 1e-12));
  check('図の左はし・右はし・まん中の周波数（まん中 = √(F0·F1)）', near(freqAt(0), F0, 1e-12) && near(freqAt(cw), F1, 1e-9) && near(freqAt(cw / 2), Math.sqrt(F0 * F1), 1e-9));
  let pts = [0.3, 0.7, 1.5, 3, 6, 10].map((f) => [f, simS(f)]), fit = fitCSF(pts);
  check('ゆらぎのない CSF の点から山の周波数 3 c/deg と最大感度 150 を復元', fit && near(fit.peak, SIM.fp, 1e-6) && near(fit.smax, SIM.smax, 1e-4));
  check('点が 2 つでは当てはめない（null）', fitCSF([[1, 10], [2, 20]]) === null);
  check('シミュレーション観察者の 70.7% 点 = 1 / S(f)', near(simPc(2, 1 / simS(2)), 0.7071, 1e-3));
  seedRng(52); let sp = FREQS.map((f) => { let th = []; for (let r = 0; r < 20; r++) { let s = makeStair(0.05, 1.3, 2, C_MIN, C_MAX, true); for (let t = 0; t < 80; t++) stairUpdate(s, rnd() < simPc(f, s.v)); th.push(Math.log(stairThreshold(s, 2))); } return [f, 1 / Math.exp(th.reduce((a, b) => a + b) / th.length)]; });
  check('シミュレーションの上下法：5 つの周波数で感度 ≈ S(f)（1 段 ×1.3 以内）', sp.every((p) => Math.abs(Math.log(p[1] / simS(p[0]))) < Math.log(1.3)));
  let f2 = fitCSF(sp);
  check('その 5 点から山の周波数 ≈ 3 c/deg（±30%）', f2 && f2.peak && near(f2.peak, SIM.fp, 0.3 * SIM.fp));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 図の上のほう（うすい所）で、縞がいちばん高くまで見えるのはどの細かさ？ そこが CSF の山
// 2. 横の位置を変えて 6 か所以上クリックし、自分の CSF を描こう。山は何 c/deg？
// 3. 画面から離れて（VIEW_CM を変えて）もう一度。山の位置はどう動く？（c/deg が変わる）
// 4. モード 2 で 3 つの周波数を上下法で測り、クリックの結果と比べよう
// 5. 文字の読みやすさ・模様のデザインと、CSF の山の関係を考えよう


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
