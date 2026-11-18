// ============================================
// 11 等ラウドネス ─ 低い音・高い音は、同じ大きさに聞こえるのにどれだけの音量が必要？
// スペースで「1 kHz の基準音 → 比べる音」を鳴らす。↑↓ で比べる音の音量を 1 dB ずつ変え、同じ大きさに聞こえたら Enter（または N）
// 125 Hz〜8 kHz の 6 つの音で 2 回ずつ合わせると、自分の「等ラウドネス曲線」ができる（端末やヘッドホンでも形が変わる。形の傾向だけを見る）
// 曲線に放物線（log 周波数の 2 次式）を当てはめ、いちばん敏感な周波数を求める
// まずクリック / スペース = 再生 / ↑↓ = 音量 / Enter = 決定 / O = シミュレーション観察者 / R = やり直し
// 音量は小さめから。ヘッドホンは特に注意（全体の音量 MASTER は 0.2 以下）
// ============================================

const FREQS = [125, 250, 500, 2000, 4000, 8000];   // ★ 比べる音の周波数 [Hz]
const REF_VOL = 0.2;                   // ★ 基準音（1 kHz）の大きさ（0〜1）
const MAX_DB = 13;                     // 比べる音の上限：REF_VOL × 10^(13/20) ≈ 0.89（これ以上は大きくしない）
const PASSES = 2;                      // ★ 1 つの周波数を何回合わせるか
const SIM_TRUE = { 125: 12, 250: 7, 500: 3, 2000: -1, 4000: -4, 8000: 6 };   // ★ シミュレーション観察者の「本当の」曲線（作り物）[dB]
let order = [], ti = 0, lev = 0, sets = [], simMode = false, simSeed = 1, playing = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}
function resetData(sim) {
  simMode = sim; sets = []; ti = 0; seedRng(Date.now());
  order = []; for (let p = 0; p < PASSES; p++) order = order.concat(shuffleArr(FREQS.slice()));
  lev = Math.round((rnd() - 0.5) * 12);   // はじめの音量はばらばらに（はじめの値に引っぱられないように）
}
function playPair() {
  if (!audioCtx || ti >= order.length || millis() - playing < 1400) return;   // 鳴っている間は重ねない
  let t = audioCtx.currentTime + 0.05;
  tone(1000, t, 0.5, REF_VOL);
  tone(order[ti], t + 0.75, 0.5, compVol(lev));
  playing = millis();
}
function compVol(db) { return REF_VOL * dbToGain(clampv(db, -30, MAX_DB)); }
function accept() { if (ti >= order.length || simMode) return; sets.push([order[ti], lev]); ti++; lev = Math.round((rnd() - 0.5) * 12); }
function meanAt(f, s) { let r = s.filter((q) => q[0] === f).map((q) => q[1]); return r.length ? r.reduce((a, b) => a + b) / r.length : null; }
// dB = a + b u + c u²（u = log₂(f/1000)）を最小二乗で（1 kHz の 0 dB も 1 点として入れる）
function fitCurve(s) {
  let pts = [[0, 0]].concat(FREQS.map((f) => [Math.log2(f / 1000), meanAt(f, s)]).filter((p) => p[1] !== null));
  if (pts.length < 3) return null;
  let M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
  for (let p of pts) { let q = [1, p[0], p[0] * p[0]]; for (let i = 0; i < 3; i++) { v[i] += q[i] * p[1]; for (let j = 0; j < 3; j++) M[i][j] += q[i] * q[j]; } }
  let D = det3(M); if (Math.abs(D) < 1e-9) return null;
  let [a, b, c] = [0, 1, 2].map((k) => det3(M.map((r, i) => r.map((x, j) => (j === k ? v[i] : x)))) / D);
  return { a, b, c, best: c > 0 ? 1000 * Math.pow(2, -b / (2 * c)) : null, at: (f) => { let u = Math.log2(f / 1000); return a + b * u + c * u * u; } };
}
function det3(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
// シミュレーション観察者：本当の値 + ゆらぎ 1.5 dB で合わせる（音は鳴らさない）
function simSets(reps) { let s = []; for (let r = 0; r < reps; r++) for (let f of FREQS) s.push([f, Math.round(clampv(SIM_TRUE[f] + 1.5 * rndNormal(), -30, MAX_DB))]); return s; }
function runSim(seed) { resetData(true); seedRng(seed); sets = simSets(4); ti = order.length; }

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('まずクリック　スペース 再生　↑↓ 比べる音の音量　Enter（N）決定　O シミュレーション観察者　R やり直し', 20, 36);
  fill(255, 200, 120); textSize(15);
  text('音量は小さめから。ヘッドホンは特に注意。大きすぎると感じたらすぐに端末の音量を下げる', 20, 62);

  let bx = 20, by = 100;
  fill(220); textSize(17);
  if (ti < order.length) {
    let f = order[ti];
    text((simMode ? '' : 'あなた') + '　' + (ti + 1) + ' / ' + order.length + '　比べる音 ' + f + ' Hz', bx, by);
    text('基準 1000 Hz と比べて、音量 ' + (lev >= 0 ? '+' : '') + lev + ' dB' + (lev >= MAX_DB ? '（上限）' : lev <= -30 ? '（下限）' : ''), bx, by + 30);
    // 音量のメーター
    noFill(); stroke(90); rect(bx, by + 50, 360, 22);
    noStroke(); fill(lev >= MAX_DB ? color(255, 120, 100) : color(120, 190, 255)); rect(bx, by + 50, (360 * (lev + 30)) / (MAX_DB + 30), 22);
    fill(160); textSize(13); text('−30 dB', bx, by + 90); text('+' + MAX_DB + ' dB（上限）', bx + 290, by + 90);
    // 再生中の表示（ゆっくり：1 回の再生で 2 回だけ光る）
    let t = millis() - playing;
    fill(t < 550 ? color(255, 220, 120) : 60); circle(bx + 30, by + 140, 34);
    fill(t > 750 && t < 1300 ? color(120, 190, 255) : 60); circle(bx + 110, by + 140, 34);
    fill(170); textSize(13); text('基準', bx + 18, by + 176); text('比べる音', bx + 84, by + 176);
    if (!audioCtx) { fill(255, 200, 120); textSize(15); text('キャンバスをクリックすると音が出せるようになる', bx, by + 210); }
  } else text(simMode ? 'シミュレーション観察者（各 4 回、音は鳴らさない）' : 'おつかれさま！ これが自分の等ラウドネス曲線', bx, by);
  // ---- 表
  let ty = by + 250; fill(160); textSize(14); text('周波数 [Hz]　合わせた音量 [dB]（平均）', bx, ty);
  FREQS.forEach((f, i) => { let m = meanAt(f, sets); fill(210); text(f + '　　' + sets.filter((q) => q[0] === f).map((q) => q[1]).join(', ') + (m !== null ? '　→ ' + m.toFixed(1) : ''), bx, ty + 22 + i * 20); });

  // ---- 等ラウドネス曲線
  let g = { x: width * 0.52, y: 110, w: width * 0.43, h: height * 0.5, x0: 100, x1: 10000, y0: -20, y1: 20, logx: true };
  plotAxes(g, '周波数 [Hz]（対数）', '同じ大きさに聞こえる音量 [dB]（1 kHz = 0）', [125, 250, 500, 1000, 2000, 4000, 8000], [-20, -10, 0, 10, 20]);
  stroke(70); line(g.x, gY(g, 0), g.x + g.w, gY(g, 0));
  let fit = fitCurve(sets);
  if (simMode) { stroke(120, 200, 140); strokeWeight(1.5); polyline([[gX(g, 1000), gY(g, 0)]].concat(FREQS.map((f) => [gX(g, f), gY(g, SIM_TRUE[f])])).sort((a, b) => a[0] - b[0])); }
  if (fit) { stroke(255, 170, 90); strokeWeight(3); let p = []; for (let i = 0; i <= 100; i++) { let f = 110 * Math.pow(9000 / 110, i / 100); p.push([gX(g, f), gY(g, clampv(fit.at(f), -20, 20))]); } polyline(p); }
  noStroke(); fill(120, 190, 255, 120); for (let q of sets) circle(gX(g, q[0]), gY(g, q[1]), 7);
  fill(120, 190, 255); FREQS.forEach((f) => { let m = meanAt(f, sets); if (m !== null) circle(gX(g, f), gY(g, m), 13); });
  fill(255, 220, 120); circle(gX(g, 1000), gY(g, 0), 13);
  fill(235); textSize(16);
  let ry = g.y + g.h + 56;
  text(fit && fit.best ? 'いちばん敏感な周波数（放物線の底）≈ ' + fit.best.toFixed(0) + ' Hz' : '3 つ以上の周波数で放物線を当てはめる', g.x, ry);
  fill(170); textSize(13); text('上ほど大きな音量が必要（感度が低い）。人の耳は 2〜5 kHz あたりが敏感', g.x, ry + 24);
  if (simMode) { fill(120, 200, 140); textSize(14); text('緑 = シミュレーション観察者の本当の曲線（作り物。ISO 226 の値ではない）', g.x, ry + 48); }
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') playPair();
  if (key === UP_ARROW) lev = Math.min(MAX_DB, lev + 1);
  if (key === DOWN_ARROW) lev = Math.max(-30, lev - 1);
  if (key === ENTER || key === 'n' || key === 'N') accept();
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト（音は鳴らさない）
function selfTest() {
  selfTestResults = [];
  check('dB → 倍率：+20 dB = 10 倍、−20 dB = 0.1 倍、+6 dB ≈ 1.995 倍', near(dbToGain(20), 10, 1e-12) && near(dbToGain(-20), 0.1, 1e-12) && near(dbToGain(6), 1.9953, 1e-4));
  check('音量の上限：比べる音は最大でも 1.0 以下、全体の音量 MASTER ≤ 0.2', compVol(100) <= 1.0001 && MASTER <= 0.2);
  let s = []; for (let f of FREQS) { let u = Math.log2(f / 1000); s.push([f, -3 * u + 1.5 * u * u]); }
  let f0 = fitCurve(s);
  check('ゆらぎのない放物線 −3u + 1.5u²（1 kHz で 0）→ 底は 2^(1) × 1000 = 2000 Hz', f0 && near(f0.best, 2000, 1e-6));
  check('データがないと当てはめない（null）', fitCurve([]) === null);
  seedRng(52); let ss = simSets(30);
  check('シミュレーション観察者（各 30 回）：平均が本当の値 ±1 dB', FREQS.every((f) => near(meanAt(f, ss), SIM_TRUE[f], 1)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 6 つの周波数を 2 回ずつ合わせて、自分の曲線を描こう。いちばん敏感なのは何 Hz？
// 2. スピーカーとヘッドホンで測り比べよう。低い音（125 Hz）の値は大きく変わる？（小さなスピーカーは低音が出にくい）
// 3. REF_VOL を半分にして測り直すと、曲線の形は変わる？（小さい音ほど低音は聞こえにくい）
// 4. 2 回の合わせた値のちがい（ばらつき）は何 dB くらい？
// 5. 音楽のミックスで低音や高音を「どれだけ上げるか」を、この曲線から考えよう


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
