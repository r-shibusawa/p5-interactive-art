// ============================================
// 12 音の高さの弁別 ─ どれくらいの差なら「高い」とわかる？
// 2 つの音が続けて鳴る。高かったのは 1 つ目（←）か 2 つ目（→）か（2 肢強制選択）
// 周波数の差 Δf を上下法（1-up-2-down、正答率 70.7%）で小さくしていき、弁別閾 Δf とウェーバー比 Δf/f を求める
// 基準の周波数（↑↓）を変えて測ると、Δf/f はほぼ一定（0.2〜1% くらい）になるか確かめる
// まずクリック / スペース = 開始 / ← 1 つ目  → 2 つ目 / ↑↓ = 基準の周波数 / O = シミュレーション観察者 / R = やり直し
// 音量は小さめから。ヘッドホンは特に注意（全体の音量 MASTER は 0.2 以下）
// ============================================

const BASES = [250, 500, 1000, 2000];  // ★ 基準の周波数 [Hz]
const N_TRIALS = 30;                   // ★ 1 つの基準あたりの試行
const VOL = 0.3;                       // ★ 音の大きさ（0〜1）
const TONE = 0.3, GAP = 0.35;          // ★ 音の長さと間 [秒]
const SIM_SIGMA = 0.004;               // ★ シミュレーション観察者：1 つの音の高さの感じ方のゆらぎ（対数）
let busyUntil = 0, bi = 2, st, results = {}, phase = 'ready', tPhase = 0, cur = null, simMode = false, simSeed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}
function newStair() { return makeStair(0.03, 1.3, 2, 0.0005, 0.3, true); }   // Δf/f を 3% から
function resetData(sim) { simMode = sim; st = newStair(); results = {}; phase = 'ready'; seedRng(Date.now()); }
function startTrial() {
  if (st.track.length >= N_TRIALS) { results[BASES[bi]] = stairThreshold(st, 2); phase = 'done'; return; }
  let f = BASES[bi] * Math.exp((rnd() - 0.5) * 0.1);    // 基準も少しずつずらす（前の音を覚えて比べないように）
  cur = { secondHigher: rnd() < 0.5, f }; busyUntil = millis() + 1000 * (2 * TONE + GAP + 0.2);
  let t = audioCtx ? audioCtx.currentTime + 0.1 : 0, hi = f * (1 + st.v);
  if (audioCtx) { tone(cur.secondHigher ? f : hi, t, TONE, VOL); tone(cur.secondHigher ? hi : f, t + TONE + GAP, TONE, VOL); }
  phase = 'play'; tPhase = millis();
}
function answer(second) {
  if (phase !== 'wait') return;
  stairUpdate(st, second === cur.secondHigher); phase = 'blank'; tPhase = millis();
}
// シミュレーション観察者：それぞれの音の高さ（対数）にゆらぎ σ。正答率 = Φ(ln(1 + δ) ÷ (√2 σ))
function simCorrect(d) { return Math.log(1 + d) + SIM_SIGMA * rndNormal() - SIM_SIGMA * rndNormal() > 0; }
function trueDelta() { return Math.exp(Math.SQRT2 * SIM_SIGMA * zOf(Math.SQRT1_2)) - 1; }
function simStair(n) { let s = newStair(); for (let t = 0; t < n; t++) stairUpdate(s, simCorrect(s.v)); return s; }
function runSim(seed) {
  resetData(true); seedRng(seed);
  for (let f of BASES) results[f] = stairThreshold(simStair(80), 2);
  st = simStair(80); phase = 'done';
}

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('まずクリック　スペース 開始　← 1 つ目が高い　→ 2 つ目が高い　↑↓ 基準 ' + BASES[bi] + ' Hz　O シミュレーション観察者　R やり直し', 20, 36);
  fill(255, 200, 120); textSize(15);
  text('音量は小さめから。ヘッドホンは特に注意。わからなくても必ずどちらかを答える', 20, 62);

  if (phase === 'blank' && millis() - tPhase > 700) startTrial();
  let el = (millis() - tPhase) / 1000;
  if (phase === 'play' && el > TONE * 2 + GAP + 0.1) phase = 'wait';
  let bx = 20, by = 110;
  // 1 つ目・2 つ目の表示（鳴っている間だけ明るく。1 試行に 2 回だけ）
  fill(phase === 'play' && el > 0.1 && el < 0.1 + TONE ? color(255, 220, 120) : 55); circle(bx + 40, by + 40, 50);
  fill(phase === 'play' && el > 0.1 + TONE + GAP && el < 0.1 + 2 * TONE + GAP ? color(255, 220, 120) : 55); circle(bx + 140, by + 40, 50);
  fill(30); textSize(18); textAlign(CENTER, CENTER); text('1', bx + 40, by + 40); text('2', bx + 140, by + 40); textAlign(LEFT, BASELINE);
  fill(215); textSize(16);
  let msg = { ready: simMode ? '' : (audioCtx ? 'スペースで開始（' + N_TRIALS + ' 試行）' : 'まずキャンバスをクリック → スペース'), wait: '高かったのは？（← 1 つ目　→ 2 つ目）', done: simMode ? 'シミュレーション観察者（各 80 試行、音は鳴らさない）' : '終わり！ ↑↓ で別の基準 → スペース' }[phase] || '';
  text(msg, bx, by + 110);
  text((simMode ? 'シミュレーション観察者' : 'あなた') + '　基準 ' + BASES[bi] + ' Hz　試行 ' + st.track.length + '　いまの差 Δf/f = ' + (st.v * 100).toFixed(2) + '%（' + (BASES[bi] * st.v).toFixed(1) + ' Hz）', bx, by + 136);

  // ---- 階段（左下）
  let g1 = { x: bx + 40, y: by + 180, w: width * 0.42, h: height - by - 300, x0: 0, x1: Math.max(N_TRIALS, st.track.length), y0: 0.0005, y1: 0.3, logy: true };
  plotAxes(g1, '試行', 'Δf/f（対数）', [0, g1.x1], [0.001, 0.01, 0.1]);
  stroke(120); strokeWeight(1.5); polyline(st.track.map((q, i) => [gX(g1, i), gY(g1, q.v)]));
  noStroke(); for (let i = 0; i < st.track.length; i++) { fill(st.track[i].ok ? color(120, 210, 150) : color(255, 100, 100)); circle(gX(g1, i), gY(g1, st.track[i].v), 6); }

  // ---- Δf/f と基準の周波数（右）
  let g = { x: width * 0.6, y: 110, w: width * 0.35, h: height * 0.45, x0: 180, x1: 2800, y0: 0.0005, y1: 0.1, logx: true, logy: true };
  plotAxes(g, '基準の周波数 [Hz]', 'ウェーバー比 Δf/f（対数）', BASES, [0.001, 0.003, 0.01, 0.03, 0.1]);
  if (simMode) { stroke(120, 200, 140); strokeWeight(1.5); line(g.x, gY(g, trueDelta()), g.x + g.w, gY(g, trueDelta())); }
  let ry = g.y + g.h + 56; noStroke(); textSize(15);
  BASES.forEach((f, i) => {
    let r = results[f];
    if (r) { fill(120, 190, 255); circle(gX(g, f), gY(g, r), 13); fill(220); text(f + ' Hz：Δf = ' + (f * r).toFixed(2) + ' Hz、Δf/f = ' + (r * 100).toFixed(2) + '%', g.x, ry + i * 22); }
    else { fill(130); text(f + ' Hz：まだ', g.x, ry + i * 22); }
  });
  if (simMode) { fill(120, 200, 140); textSize(14); text('本当の 70.7% 点：Δf/f = ' + (trueDelta() * 100).toFixed(3) + '%（どの周波数でも同じ）', g.x, ry + 96); }
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ' && (phase === 'ready' || phase === 'done') && millis() > busyUntil) { if (phase === 'done' || simMode) { simMode = false; st = newStair(); } startTrial(); }
  if (key === LEFT_ARROW) answer(false);
  if (key === RIGHT_ARROW) answer(true);
  if ((key === UP_ARROW || key === DOWN_ARROW) && phase !== 'play' && phase !== 'wait' && phase !== 'blank') { bi = clampv(bi + (key === UP_ARROW ? 1 : -1), 0, BASES.length - 1); st = newStair(); phase = 'ready'; }
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト（音は鳴らさない）
function selfTest() {
  selfTestResults = [];
  let d = trueDelta();
  check('本当の 70.7% 点で正答率 Φ(ln(1 + δ)/(√2σ)) = 0.7071', near(Phi(Math.log(1 + d) / (Math.SQRT2 * SIM_SIGMA)), Math.SQRT1_2, 1e-5));
  check('δ = 0 なら正答率 0.5（当てずっぽう）', near(Phi(0), 0.5, 1e-6));
  check('1000 Hz で Δf/f = 0.5% → 2 つの音は 1000 Hz と 1005 Hz', near(1000 * (1 + 0.005), 1005, 1e-9));
  seedRng(52); let th = []; for (let r = 0; r < 40; r++) th.push(Math.log(stairThreshold(simStair(80), 2)));
  let m = Math.exp(th.reduce((a, b) => a + b) / th.length);
  check('シミュレーション観察者 80 試行 × 40 回：平均しきい値 ≈ 本当の 70.7% 点（1 段 ×1.3 以内）', Math.abs(Math.log(m / d)) < Math.log(1.3));
  check('音量の上限：1 音 ≤ 1、全体 MASTER ≤ 0.2', VOL <= 1 && MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1000 Hz で 30 試行。自分の Δf は何 Hz？ Δf/f は何 %？
// 2. ↑↓ で 250 Hz と 2000 Hz も測ろう。Δf/f はだいたい同じ？（ウェーバーの法則）
// 3. 楽器をやっている人とやっていない人で比べてみよう。半音（約 6%）よりずっと小さい？
// 4. TONE を 0.1 秒にすると、しきい値はどう変わる？（短い音ほど高さがあいまい）
// 5. O でシミュレーション観察者の階段と、自分の階段のゆれ方を比べよう


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
// ---- 音を鳴らす道具（Web Audio。最初のクリックかキーで startAudio()）
// 音量の上限：全体の音量 MASTER は 0.2 以下（大きな音は出ない）。1 音の大きさ vol も 0〜1 に制限
const MASTER = 0.15;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音：周波数 f、開始 t0（audioCtx の時刻）、長さ dur 秒、大きさ vol（0〜1）。立ち上がりと終わりは 15 ms でなめらかに
function tone(f, t0, dur, vol) {
  if (!audioCtx || !isFinite(f) || f <= 0 || !isFinite(vol)) return;
  vol = clampv(vol, 0, 1); dur = clampv(dur, 0.03, 2);
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = clampv(f, 20, 12000);
  gn.gain.setValueAtTime(0, t0);
  gn.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  gn.gain.setValueAtTime(vol, t0 + dur - 0.015);
  gn.gain.linearRampToValueAtTime(0, t0 + dur);
  o.connect(gn); gn.connect(masterOut); o.start(t0); o.stop(t0 + dur + 0.02);
}
function dbToGain(db) { return Math.pow(10, db / 20); }   // +6 dB ≈ 2 倍、−20 dB = 0.1 倍
