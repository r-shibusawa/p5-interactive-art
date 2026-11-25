// ============================================
// 14 スパイクするニューロンの音 🔊 ─ 漏れ積分発火（LIF）ニューロン：τ dV/dt = −V + R I
// 膜電位 V はたまっては漏れる。しきい値 θ をこえたら「発火」（スパイク）して 0 に戻る。発火のたびに音を 1 つ鳴らす
// 一定の入力なら発火の間隔は T = τ ln(RI / (RI − θ))（RI ≤ θ なら永遠に発火しない）→ 頻度 f = 1/T（F-I 曲線）
// 計算は「正確な指数の式」：1 ステップの間に V = RI + (V − RI) e^(−dt/τ)。しきい値をこえる時刻もステップの中で正確に求める
// 5 個をつなぐ：興奮（マゼンタ、相手の V を上げる）と抑制（ライム、下げる）のつなぎ方でリズムや「勝ち残り」が変わる
// クリック 音を出す / ↑↓ 入力の強さ / 1〜4 つなぎ方 / スペース 一時停止 / M 消音
// 時間は 1/8 のスローモーション（ニューロンの 1 秒 = 画面の 8 秒）
// ============================================

const TAU_M = 0.02, THETA = 1, DT = 0.0001;   // ★ 時定数 20 ms、しきい値、計算の刻み 0.1 ms
const TIME_SCALE = 1 / 8;                // ★ スローモーション
const NUM_N = 5, NOTE_MIDI = [60, 64, 67, 71, 74];   // ★ ニューロンの数と音の高さ（ド ミ ソ シ レ）
const PRESETS = ['ばらばら（つながりなし）', '興奮の輪 1→2→3→4→5→1', '抑制で勝ち残り（1・2 組と 3・4 組が抑え合う）', 'まぜこぜ（ランダム）'];
let preset = 0, drive = 1.25, vMem = null, wSyn = null, simT = 0, spikesLog = [], traceLog = [], flashN = null, pausedS = false, muted = false, fiSim = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  vMem = [0.1, 0.3, 0.5, 0.7, 0.9]; flashN = new Array(NUM_N).fill(0);
  setPreset(0);
  fiSim = [1.05, 1.1, 1.2, 1.35, 1.5, 1.75, 2, 2.5, 3].map((ri) => [ri, simRate(ri, 1.5)]);
}

// ★ F-I の公式：f = 1 / (τ ln(RI / (RI − θ)))、RI ≤ θ なら 0
function rateFormula(ri) { return ri > THETA ? 1 / (TAU_M * Math.log(ri / (ri - THETA))) : 0; }
// ★ 1 ステップ（長さ dt）を正確に進める。しきい値をこえる時刻 t* = τ ln((RI − V)/(RI − θ)) を求め、0 に戻して残りを進める
// 戻り値 = このステップの中の発火の時刻（ステップの始めからの秒）の配列
function lifStep(st, ri, dt) {
  let out = [], left = dt, used = 0;
  while (left > 0) {
    if (ri > THETA && st.v < THETA) {
      let tc = TAU_M * Math.log((ri - st.v) / (ri - THETA));
      if (tc <= left) { used += tc; left -= tc; out.push(used); st.v = 0; continue; }
    } else if (st.v >= THETA) { out.push(used); st.v = 0; continue; }
    st.v = ri + (st.v - ri) * Math.exp(-left / TAU_M); left = 0;
  }
  return out;
}
function simRate(ri, dur) {               // 1 個だけで dur 秒。発火の間隔の平均から頻度を
  let st = { v: 0 }, times = [], n = Math.round(dur / DT);
  for (let k = 0; k < n; k++) for (let t of lifStep(st, ri, DT)) times.push(k * DT + t);
  if (times.length < 2) return 0;
  return (times.length - 1) / (times[times.length - 1] - times[0]);
}
function setPreset(k) {
  preset = k; wSyn = Array.from({ length: NUM_N }, () => new Array(NUM_N).fill(0));   // wSyn[i][j] = j が発火したとき i の V に足す量
  if (k === 1) for (let j = 0; j < NUM_N; j++) wSyn[(j + 1) % NUM_N][j] = 0.45;
  if (k === 2) { wSyn[2][0] = wSyn[3][0] = wSyn[2][1] = wSyn[3][1] = -0.8; wSyn[0][2] = wSyn[1][2] = wSyn[0][3] = wSyn[1][3] = -0.8; wSyn[1][0] = wSyn[0][1] = wSyn[3][2] = wSyn[2][3] = 0.25; }
  if (k === 3) { seedRng(1414); for (let i = 0; i < NUM_N; i++) for (let j = 0; j < NUM_N; j++) if (i !== j && rnd() < 0.5) wSyn[i][j] = rnd() < 0.6 ? 0.3 : -0.5; }
}
function driveOf(i) { return drive * (1 + 0.04 * i); }   // 少しずつちがう入力（全部同じだとそろってしまう）
// ネットワークを real 秒ぶん進める（発火は次のステップで相手に届く = 遅れ 0.1 ms）
function simNetwork(dur) {
  let n = Math.round(dur / DT), fired = [];
  for (let k = 0; k < n; k++) {
    let now = [];
    for (let i = 0; i < NUM_N; i++) { let st = { v: vMem[i] }, sp = lifStep(st, driveOf(i), DT); vMem[i] = st.v; if (sp.length) now.push(i); }
    for (let j of now) { for (let i = 0; i < NUM_N; i++) if (wSyn[i][j]) vMem[i] = clampv(vMem[i] + wSyn[i][j], -2, THETA + 0.5); fired.push([simT + k * DT, j]); }
    if (k % 20 === 0) traceLog.push(vMem.slice());
  }
  simT += n * DT; if (traceLog.length > 400) traceLog.splice(0, traceLog.length - 400);
  return fired;
}

function draw() {
  background(...BG);
  if (!pausedS) {
    let fired = simNetwork(TIME_SCALE / 60), plays = 0;
    for (let [t, j] of fired) {
      spikesLog.push([t, j]); flashN[j] = 10;
      if (!muted && audioCtx && plays < 4) { playNote(midiHz(NOTE_MIDI[j]), audioCtx.currentTime + 0.01, 0.25, 'triangle', 0.35); plays++; }
    }
    while (spikesLog.length && spikesLog[0][0] < simT - 1.5) spikesLog.shift();
  }
  for (let i = 0; i < NUM_N; i++) if (flashN[i] > 0) flashN[i]--;
  hudTitle('スパイクするニューロンの音：' + PRESETS[preset] + '　入力 RI = ' + fmtN(drive, 2) + '（θ = 1）　' + (audioCtx ? (muted ? '消音中' : '音 ON') : 'クリックで音'),
    'クリック 音を出す　↑↓ 入力の強さ　1〜4 つなぎ方　スペース ' + (pausedS ? '再開' : '一時停止') + '　M 消音　（1/8 のスローモーション）');
  // ---- 左上：つながり
  let cx = 190, cy = 250, rr = 110, pos = [];
  for (let i = 0; i < NUM_N; i++) { let a = -Math.PI / 2 + (2 * Math.PI * i) / NUM_N; pos.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  for (let i = 0; i < NUM_N; i++) for (let j = 0; j < NUM_N; j++) if (wSyn[i][j]) {
    let a = pos[j], b = pos[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, ox = -uy * 6, oy = ux * 6;
    stroke(...(wSyn[i][j] > 0 ? MAG : LIME), 200); strokeWeight(1 + 4 * Math.abs(wSyn[i][j]));
    line(a[0] + ux * 24 + ox, a[1] + uy * 24 + oy, b[0] - ux * 30 + ox, b[1] - uy * 30 + oy);
    noStroke(); fill(...(wSyn[i][j] > 0 ? MAG : LIME)); circle(b[0] - ux * 28 + ox, b[1] - uy * 28 + oy, 8);
  }
  for (let i = 0; i < NUM_N; i++) { noStroke(); fill(...(flashN[i] > 0 ? AMBER : PANEL)); stroke(...INK); strokeWeight(1.5); circle(pos[i][0], pos[i][1], 40 + flashN[i] * 2); noStroke(); fill(...(flashN[i] > 0 ? BG : INK)); textSize(15); textAlign(CENTER, CENTER); text(i + 1, pos[i][0], pos[i][1]); }
  textAlign(LEFT, BASELINE); fill(...SUB); textSize(12); text('マゼンタ = 興奮（+）、ライム = 抑制（−）、点 = 矢印の先', 40, cy + rr + 50);
  // ---- 右上：膜電位
  let rx = 400, g1 = { x: rx, y: 105, w: width - rx - 40, h: (height - 220) * 0.38, x0: 0, x1: 400, y0: -1.2, y1: NUM_N * 1.2 };
  plotAxes(g1, '時刻 →（最近 ' + Math.round(400 * 20 * DT * 1000) + ' ms）', '膜電位 V（下から 1〜5 番、点線 = しきい値 θ）', [], []);
  let cols = [MAG, LIME, SKY, AMBER, VIOLET];
  for (let i = 0; i < NUM_N; i++) {
    stroke(...WIRE); drawingContext.setLineDash([4, 4]); line(g1.x, gY(g1, i * 1.2 + THETA - 0.6), g1.x + g1.w, gY(g1, i * 1.2 + THETA - 0.6)); drawingContext.setLineDash([]);
    plotXY(g1, traceLog.map((_, k) => k), traceLog.map((r) => i * 1.2 + clampv(r[i], -0.6, 1.1) - 0.6), cols[i], 1.5);
  }
  // ---- 右中：ラスター
  let g2 = { x: rx, y: g1.y + g1.h + 50, w: g1.w, h: (height - 220) * 0.22, x0: simT - 1.5, x1: simT, y0: -0.5, y1: NUM_N - 0.5 };
  plotAxes(g2, '時刻（最近 1.5 秒）', 'ラスター：発火の時刻（1 行 = 1 ニューロン）', [], []);
  for (let [t, j] of spikesLog) { stroke(...cols[j]); strokeWeight(2); let x = gX(g2, t), y = gY(g2, j); line(x, y - 7, x, y + 7); }
  // ---- 下：F-I 曲線
  let g3 = { x: 70, y: g2.y + g2.h + 60, w: width * 0.45, h: height - (g2.y + g2.h + 60) - 70, x0: 0.8, x1: 3, y0: 0, y1: 120 };
  plotAxes(g3, '入力 RI', 'F-I 曲線：線 = 公式 1/(τ ln(RI/(RI − θ)))、点 = シミュレーション [Hz]', [1, 2, 3], [0, 50, 100]);
  let ris = []; for (let k = 0; k <= 200; k++) ris.push(0.8 + k * 0.011);
  plotXY(g3, ris, ris.map(rateFormula), AMBER, 2.5);
  noStroke(); fill(...INK); for (let [ri, f] of fiSim) circle(gX(g3, ri), gY(g3, f), 8);
  stroke(...MAG); strokeWeight(1); line(gX(g3, drive), g3.y, gX(g3, drive), g3.y + g3.h);
  noStroke(); fill(...INK); textSize(14); textAlign(LEFT, BASELINE);
  let tx = g3.x + g3.w + 40, cnt = new Array(NUM_N).fill(0); for (let [, j] of spikesLog) cnt[j]++;
  text('いまの頻度（最近 1.5 秒）：' + cnt.map((c) => fmtN(c / 1.5, 0)).join('・') + ' Hz', tx, g3.y + 20);
  text('1 番だけなら公式で ' + fmtN(rateFormula(driveOf(0)), 1) + ' Hz', tx, g3.y + 44);
  fill(...SUB); textSize(13);
  ['RI ≤ θ = 1 なら、V は RI までしか上がらず発火しない（頻度 0）', 'RI が大きいと f ≈ RI/(τθ)：入力にほぼ比例', '興奮の輪：となりが発火すると早く発火 → 輪をまわるリズム', '抑制：先に鳴った組が相手の組を黙らせる（勝者総取り）'].forEach((s, q) => text(s, tx, g3.y + 76 + 20 * q));
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === UP_ARROW) drive = Math.min(3, Math.round((drive + 0.05) * 100) / 100);
  if (key === DOWN_ARROW) drive = Math.max(0.8, Math.round((drive - 0.05) * 100) / 100);
  if (key >= '1' && key <= '4') setPreset(+key - 1);
  if (key === ' ') pausedS = !pausedS;
  if (key === 'm' || key === 'M') muted = !muted;
  return false;
}

// ============================================
// やってみよう
// ・↓ で入力を 1 以下にすると音が止まる。ぎりぎり 1.05 だと？（公式で何 Hz？）
// ・2 の興奮の輪で、入力を少しずつ上げる。リズムはどう変わる？
// ・3 の抑制で、wSyn の −0.8 を −0.2 にすると、負けた組も鳴るようになる？
// ・NOTE_MIDI を変えて、自分の音階にする。TIME_SCALE を 1/4 にすると？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let worst = 0;
  for (let ri of [1.1, 1.5, 2, 3]) worst = Math.max(worst, Math.abs(simRate(ri, 1) / rateFormula(ri) - 1));
  check('シミュレーションの頻度 = 公式 1/(τ ln(RI/(RI − θ)))（RI = 1.1〜3、ずれ ' + fmtN(100 * worst, 4) + '% < 2%）', worst < 0.02);
  let st = { v: 0 }, first = null; for (let k = 0; k < 2000 && first === null; k++) { let sp = lifStep(st, 1.5, DT); if (sp.length) first = k * DT + sp[0]; }
  check('最初の発火の時刻 = τ ln(RI/(RI − θ))（ずれ ' + fmtE(Math.abs(first - TAU_M * Math.log(3))) + ' 秒）', near(first, TAU_M * Math.log(3), 1e-12));
  check('RI = 0.9 ≤ θ：2 秒たっても発火しない、公式も 0', simRate(0.9, 2) === 0 && rateFormula(0.9) === 0 && rateFormula(1) === 0);
  let big = 20; check('入力が大きいと f ≈ RI/(τθ) − 1/(2τ)（RI = 20 で ' + fmtN(rateFormula(big), 1) + ' Hz）', Math.abs(rateFormula(big) / (big / (TAU_M * THETA) - 1 / (2 * TAU_M)) - 1) < 0.02);
  let mono = true, prev = 0; for (let ri = 1.01; ri < 4; ri += 0.05) { let f = rateFormula(ri); if (!(f > prev)) mono = false; prev = f; }
  check('F-I 曲線は単調に増える', mono);
  let keepV = vMem, keepW = wSyn, keepT = simT, keepTr = traceLog, keepD = drive, keepP = preset;
  drive = 1.2; let count = (pr) => { setPreset(pr); vMem = [0, 0, 0, 0, 0]; simT = 0; traceLog = []; let f = simNetwork(1); return f.filter(([, j]) => j === 2).length; };
  let alone = count(0), ring = count(1);
  check('興奮の輪：となりからの入力で 3 番の発火が増える（' + alone + ' → ' + ring + ' 回/秒）', ring > alone);
  vMem = keepV; wSyn = keepW; simT = keepT; traceLog = keepTr; drive = keepD; preset = keepP;
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 音の道具（Web Audio）。全体の音量 MASTER は 0.2 以下
const MASTER = 0.1;                      // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playNote(freq, when, dur, wave, vol) {   // 1 音（すぐ立ち上がって消える）
  if (!audioCtx || !(freq > 20 && freq < 8000)) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = wave || 'sine'; o.frequency.setValueAtTime(freq, when);
  gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(clampv(vol || 0.5, 0.001, 1), when + 0.005);
  gn.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + dur + 0.05);
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
