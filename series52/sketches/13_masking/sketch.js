// ============================================
// 13 マスキングと臨界帯域 ─ ノイズの中の音が聞こえるしきい値
// ノイズが 2 回鳴り、どちらか一方にだけ 1 kHz の音が入っている。入っていたのは 1 回目（←）か 2 回目（→）か
// 上下法で音の大きさのしきい値を測る。ノイズの帯域幅 BW（1 kHz を中心）を ↑↓ で変えて何回か測る
// ノイズの「1 Hz あたりの強さ」は同じなので、帯域を広げるとノイズ全体は強くなる。でもしきい値が上がるのはある幅（臨界帯域）まで
// → しきい値 = K + 10·log₁₀(min(BW, CB)) の折れ線を当てはめて、臨界帯域 CB を推定する
// まずクリック / スペース = 開始 / ← 1 回目  → 2 回目 / ↑↓ = 帯域幅 / O = シミュレーション観察者 / R = やり直し
// 音量は小さめから。ヘッドホンは特に注意（全体の音量 MASTER は 0.2 以下）
// ============================================

const BWS = [50, 100, 200, 400, 800, 1600];   // ★ ノイズの帯域幅 [Hz]
const N_TRIALS = 24;                   // ★ 1 つの帯域幅あたりの試行
const NOISE_VOL = 0.8;                 // ★ ノイズの大きさ（白色ノイズを帯域フィルタに通す前、0〜1）
const BURST = 0.45, GAP = 0.35;        // ★ ノイズの長さと間 [秒]
const SIM = { K: -38, CB: 130, s: 1.5 };   // ★ シミュレーション観察者：しきい値 [dB] = K + 10 log₁₀(min(BW, CB))、ばらつき s
let busyUntil = 0, bi = 2, st, thr = {}, phase = 'ready', tPhase = 0, cur = null, noiseBuf = null, simMode = false, simSeed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}
function newStair() { return makeStair(0.1, Math.pow(10, 2 / 20), 2, 0.001, 1, true); }   // 音の大きさ（倍率）を 2 dB ずつ
function resetData(sim) { simMode = sim; st = newStair(); thr = {}; phase = 'ready'; seedRng(Date.now()); }
function dB(v) { return 20 * Math.log10(v); }
// ノイズ：白色ノイズ（バッファは 1 回だけ作る）→ 帯域フィルタ（中心 1 kHz、Q = 1000 / BW）→ 音量
function playNoise(t, bw) {
  if (!noiseBuf) { noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate); let d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  let src = audioCtx.createBufferSource(), flt = audioCtx.createBiquadFilter(), gn = audioCtx.createGain();
  src.buffer = noiseBuf; flt.type = 'bandpass'; flt.frequency.value = 1000; flt.Q.value = 1000 / bw;
  gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(NOISE_VOL, t + 0.02); gn.gain.setValueAtTime(NOISE_VOL, t + BURST - 0.02); gn.gain.linearRampToValueAtTime(0, t + BURST);
  src.connect(flt); flt.connect(gn); gn.connect(masterOut); src.start(t, Math.random()); src.stop(t + BURST + 0.05);
}
function startTrial() {
  if (st.track.length >= N_TRIALS) { thr[BWS[bi]] = dB(stairThreshold(st, 2)); phase = 'done'; return; }
  cur = { second: rnd() < 0.5 }; busyUntil = millis() + 1000 * (2 * BURST + GAP + 0.2);
  if (audioCtx) {
    let t = audioCtx.currentTime + 0.1;
    playNoise(t, BWS[bi]); playNoise(t + BURST + GAP, BWS[bi]);
    tone(1000, t + (cur.second ? BURST + GAP : 0) + 0.075, BURST - 0.15, st.v);   // 音はノイズのまん中に
  }
  phase = 'play'; tPhase = millis();
}
function answer(second) { if (phase !== 'wait') return; stairUpdate(st, second === cur.second); phase = 'blank'; tPhase = millis(); }
// 折れ線 t = K + 10 log₁₀(min(BW, CB)) を当てはめる：CB を 10〜3000 Hz で細かく試し、K は平均で決まる
function fitCB(T) {
  let bw = Object.keys(T).map(Number); if (bw.length < 3) return null;
  let best = null;
  for (let i = 0; i <= 600; i++) {
    let cb = 10 * Math.pow(300, i / 600), g = bw.map((b) => 10 * Math.log10(Math.min(b, cb)));
    let K = bw.reduce((s, b, j) => s + T[b] - g[j], 0) / bw.length, e = bw.reduce((s, b, j) => s + (T[b] - K - g[j]) ** 2, 0);
    if (!best || e < best.e - 1e-12) best = { cb, K, e };
  }
  return best;
}
function erb(f) { return 24.7 * (4.37 * f / 1000 + 1); }   // グラスバーグとムーアの等価矩形帯域幅 [Hz]
// シミュレーション観察者（音は鳴らさない）：正答率 = 0.5 + 0.5·L((dB − α)/s)。70.7% 点 = モデルのしきい値
function simThr(bw) { return SIM.K + 10 * Math.log10(Math.min(bw, SIM.CB)); }
function simPc(v, bw) { let a = simThr(bw) - SIM.s * Math.log(0.4142 / 0.5858); return 0.5 + 0.5 / (1 + Math.exp(-(dB(v) - a) / SIM.s)); }
function simStair(bw, n) { let s = newStair(); for (let t = 0; t < n; t++) stairUpdate(s, rnd() < simPc(s.v, bw)); return s; }
function runSim(seed) { resetData(true); seedRng(seed); for (let b of BWS) thr[b] = dB(stairThreshold(simStair(b, 80), 2)); st = simStair(BWS[bi], 80); phase = 'done'; }

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('まずクリック　スペース 開始　← 1 回目　→ 2 回目　↑↓ 帯域幅 ' + BWS[bi] + ' Hz　O シミュレーション観察者　R やり直し', 20, 36);
  fill(255, 200, 120); textSize(15);
  text('音量は小さめから。ヘッドホンは特に注意。「ザー」の中に「ピー」が入っていたのはどっち？', 20, 62);
  if (phase === 'blank' && millis() - tPhase > 700) startTrial();
  let el = (millis() - tPhase) / 1000;
  if (phase === 'play' && el > 2 * BURST + GAP + 0.15) phase = 'wait';
  let bx = 20, by = 110;
  fill(phase === 'play' && el > 0.1 && el < 0.1 + BURST ? color(150, 200, 255) : 55); circle(bx + 40, by + 40, 50);
  fill(phase === 'play' && el > 0.1 + BURST + GAP && el < 0.1 + 2 * BURST + GAP ? color(150, 200, 255) : 55); circle(bx + 140, by + 40, 50);
  fill(30); textSize(18); textAlign(CENTER, CENTER); text('1', bx + 40, by + 40); text('2', bx + 140, by + 40); textAlign(LEFT, BASELINE);
  fill(215); textSize(16);
  let msg = { ready: simMode ? '' : (audioCtx ? 'スペースで開始（' + N_TRIALS + ' 試行）' : 'まずキャンバスをクリック → スペース'), wait: '音が入っていたのは？（← 1 回目　→ 2 回目）', done: simMode ? 'シミュレーション観察者（各 80 試行、音は鳴らさない）' : '終わり！ ↑↓ で別の帯域幅 → スペース' }[phase] || '';
  text(msg, bx, by + 110);
  text((simMode ? 'シミュレーション観察者' : 'あなた') + '　帯域幅 ' + BWS[bi] + ' Hz　試行 ' + st.track.length + (simMode ? '' : ' / ' + N_TRIALS) + '　いまの音 ' + dB(st.v).toFixed(1) + ' dB', bx, by + 136);
  // ノイズの帯域の図
  let sx = bx + 40, sy = by + 190, sw = width * 0.4, sh = 140, fX = (f) => sx + (sw * Math.log(f / 250)) / Math.log(16);
  stroke(95); noFill(); rect(sx, sy, sw, sh);
  noStroke(); fill(120, 170, 255, 110); let lo = Math.max(250, 1000 - BWS[bi] / 2); rect(fX(lo), sy + 40, fX(lo + BWS[bi]) - fX(lo), sh - 40);
  fill(255, 220, 120); rect(fX(1000) - 1.5, sy + 10, 3, sh - 10);
  stroke(255, 120, 120, 180); strokeWeight(1.5); line(fX(1000 - erb(1000) / 2), sy + 25, fX(1000 + erb(1000) / 2), sy + 25);
  noStroke(); fill(170); textSize(12); text('250 Hz', sx, sy + sh + 16); text('4000 Hz', sx + sw - 46, sy + sh + 16); text('赤：1 kHz の臨界帯域（ERB ≈ ' + erb(1000).toFixed(0) + ' Hz）　青：ノイズ　黄：音', sx, sy + sh + 34);

  // ---- しきい値と帯域幅
  let g = { x: width * 0.6, y: 110, w: width * 0.35, h: height * 0.45, x0: 35, x1: 2300, y0: -45, y1: 0, logx: true };
  plotAxes(g, 'ノイズの帯域幅 [Hz]', 'しきい値 [dB]', BWS, [-40, -30, -20, -10, 0]);
  let fit = fitCB(thr);
  if (simMode) { stroke(120, 200, 140); strokeWeight(1.5); polyline(BWS.map((b) => [gX(g, b), gY(g, simThr(b))])); }
  if (fit) { stroke(255, 170, 90); strokeWeight(3); let p = []; for (let i = 0; i <= 100; i++) { let b = 40 * Math.pow(2000 / 40, i / 100); p.push([gX(g, b), gY(g, fit.K + 10 * Math.log10(Math.min(b, fit.cb)))]); } polyline(p); stroke(255, 170, 90, 120); strokeWeight(1); line(gX(g, fit.cb), g.y, gX(g, fit.cb), g.y + g.h); }
  noStroke(); fill(120, 190, 255); for (let b in thr) circle(gX(g, +b), gY(g, thr[b]), 13);
  fill(235); textSize(16);
  let ry = g.y + g.h + 56;
  text(fit ? '推定した臨界帯域 CB ≈ ' + fit.cb.toFixed(0) + ' Hz（ERB の式では ' + erb(1000).toFixed(0) + ' Hz）' : '3 つ以上の帯域幅で折れ線を当てはめる', g.x - 30, ry);
  fill(170); textSize(13); text('帯域 2 倍でノイズ全体は +3 dB。でも CB より広げた分は聞こえに効かない', g.x - 30, ry + 24);
  if (simMode) { fill(120, 200, 140); textSize(14); text('本当の CB = ' + SIM.CB + ' Hz', g.x - 30, ry + 48); }
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ' && (phase === 'ready' || phase === 'done') && millis() > busyUntil) { if (phase === 'done' || simMode) { simMode = false; st = newStair(); } startTrial(); }
  if (key === LEFT_ARROW) answer(false);
  if (key === RIGHT_ARROW) answer(true);
  if ((key === UP_ARROW || key === DOWN_ARROW) && (phase === 'ready' || phase === 'done')) { bi = clampv(bi + (key === UP_ARROW ? 1 : -1), 0, BWS.length - 1); st = newStair(); phase = 'ready'; }
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト（音は鳴らさない）
function selfTest() {
  selfTestResults = [];
  check('ERB(1000 Hz) = 24.7 × (4.37 + 1) = 132.6 Hz', near(erb(1000), 132.639, 1e-3));
  check('帯域を 2 倍 → ノイズ全体は 10 log₁₀2 = 3.01 dB 強くなる', near(10 * Math.log10(2), 3.0103, 1e-4));
  let T = {}; for (let b of BWS) T[b] = -40 + 10 * Math.log10(Math.min(b, 150));
  let f = fitCB(T);
  check('ゆらぎのない折れ線（CB = 150）から CB ≈ 150 Hz（±2%）と K = −40', f && near(f.cb, 150, 3) && near(f.K, -40, 0.1));
  check('データが 2 点ではしない（null）', fitCB({ 100: -20, 200: -17 }) === null);
  check('シミュレーション観察者の 70.7% 点 = モデルのしきい値', near(simPc(Math.pow(10, simThr(400) / 20), 400), 0.7071, 1e-3));
  seedRng(52); let S = {}; for (let b of BWS) { let a = []; for (let r = 0; r < 20; r++) a.push(dB(stairThreshold(simStair(b, 80), 2))); S[b] = a.reduce((x, y) => x + y) / a.length; }
  check('シミュレーションの上下法：しきい値がモデル ±2 dB（1 段）以内', BWS.every((b) => near(S[b], simThr(b), 2)));
  let f2 = fitCB(S);
  check('その 6 点から CB ≈ 130 Hz（÷1.6〜×1.6）', f2 && Math.abs(Math.log(f2.cb / SIM.CB)) < Math.log(1.6));
  check('音量の上限：ノイズ ≤ 1、音 ≤ 1、全体 MASTER ≤ 0.2', NOISE_VOL <= 1 && newStair().hi <= 1 && MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 帯域幅 50 Hz と 800 Hz でしきい値を測り比べよう。差は何 dB？ ノイズ全体は 12 dB ちがうのに？
// 2. 3〜4 つの帯域幅を測って折れ線を当てはめ、自分の臨界帯域を推定しよう
// 3. 音の周波数を 2000 Hz にしたら、臨界帯域は広くなる？（erb(2000) を計算してみよう）
// 4. にぎやかな所で話し声が聞こえにくい理由を、マスキングで説明しよう
// 5. 音楽の圧縮（MP3 など）が「聞こえない音」を削る考え方と、この実験の関係を調べよう


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
