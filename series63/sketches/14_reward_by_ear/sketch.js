// ============================================
// 14 耳で報酬を与える 🔊 ─ エージェントが 6 つのフレーズ（4〜8 音）から 1 つ選んで鳴らす。
// 聞いたあなたが「好き」（+1）か「きらい」（−1）を返すと、それが報酬。多腕バンディット（00）と同じしくみで好みを学ぶ。
// 人の好みは途中で変わる → 平均（1/n）ではなく、最近の報酬を重く見る「一定の学習率 α」で更新すると、変化についていける
// クリック 音を出す・好き/きらい（↑ 好き ↓ きらい でも）/ スペース もう一度聞く / A 自動の聞き手（好みが 150 回ごとに変わる）/ N フレーズを作り直す
// 音量は小さめから。全体の音量 MASTER は 0.2 以下
// ============================================

const N_PHRASES = 6;                     // ★ フレーズの数
const ALPHA = 0.3, EPS = 0.15;           // ★ 一定の学習率（最近を重く見る）と探索の割合
const SCALE_NOTES = [0, 2, 4, 7, 9, 12, 14, 16];   // ★ 音階（ペンタトニック、ド = 0）
const BASE_MIDI = 60;                    // ★ いちばん低い音（60 = ド）
let phrases = [], agent, current = -1, waiting = false, rewardLog = [], autoMode = false, sim = null, buttons = [], cardBox = [], playStart = 0;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(14); makePhrases(); agent = makeAgent(true); sim = makeSim(); }

function makePhrases() {                 // 4〜8 音のフレーズ：音の高さ（音階の番号）と長さ
  phrases = [];
  for (let k = 0; k < N_PHRASES; k++) {
    let n = rndInt(4, 8), notes = [], deg = rndInt(0, 4);
    for (let i = 0; i < n; i++) { deg = clampv(deg + rndInt(-2, 2), 0, SCALE_NOTES.length - 1); notes.push({ midi: BASE_MIDI + SCALE_NOTES[deg], dur: [0.15, 0.3, 0.3, 0.45][rndInt(0, 3)] }); }
    phrases.push({ notes, wave: ['triangle', 'sine', 'square'][k % 3] });
  }
}
function makeAgent(constAlpha) { return { constAlpha, q: new Array(N_PHRASES).fill(0), n: new Array(N_PHRASES).fill(0) }; }
function choosePhrase(ag) { return epsGreedy(ag.q, EPS); }
// ★ 更新：一定の α なら Q ← Q + α (r − Q)（最近の報酬ほど重い）。標本平均なら α = 1/n（全部を同じ重さで平均）
function learn(ag, k, r) { ag.n[k]++; let al = ag.constAlpha ? ALPHA : 1 / ag.n[k]; ag.q[k] += al * (r - ag.q[k]); }
// 自動の聞き手：好きなフレーズは 90%、ほかは 20% で「好き」。PERIOD 回ごとに好みが変わる
function makeSim() { return { fav: 0, t: 0, agents: [makeAgent(true), makeAgent(false)], picks: [[], []], favs: [] }; }
function simListen(s, k) { return rnd() < (k === s.fav ? 0.9 : 0.2) ? 1 : -1; }
function simStep(s) {
  if (s.t > 0 && s.t % 150 === 0) s.fav = (s.fav + 1 + Math.floor(rnd() * (N_PHRASES - 1))) % N_PHRASES;
  s.agents.forEach((ag, i) => { let k = choosePhrase(ag); learn(ag, k, simListen(s, k)); s.picks[i].push(k === s.fav ? 1 : 0); });
  s.favs.push(s.fav); s.t++;
}
function playPhrase(k) {
  startAudio(); if (!audioCtx) return;
  let t = audioCtx.currentTime + 0.05;
  for (let nt of phrases[k].notes) { playNote(midiHz(nt.midi), t, nt.dur * 0.95, phrases[k].wave); t += nt.dur; }
  playStart = millis();
}
function nextTrial() { current = choosePhrase(agent); waiting = true; playPhrase(current); }
function feedback(r) {
  if (!waiting) return;
  learn(agent, current, r); rewardLog.push({ k: current, r }); waiting = false;
  setTimeout(nextTrial, 400);
}

function draw() {
  background(...BG);
  if (autoMode) { let t0 = performance.now(); while (performance.now() - t0 < 2 && sim.t < 3000) simStep(sim); }
  noStroke(); fill(240); textSize(22); textAlign(LEFT, BASELINE);
  text('耳で報酬を与える：フレーズ選びのバンディット' + (autoMode ? '（自動の聞き手）' : ''), 40, 42);
  fill(170, 176, 210); textSize(15);
  text('クリック 音を出す・好き/きらい（↑ 好き ↓ きらい）　スペース もう一度　A 自動の聞き手　N フレーズを作り直す', 40, 68);

  // ---- フレーズのカード（ピアノロール）と推定値
  let cw = Math.min(180, (width - 80) / N_PHRASES - 12), y0 = 100, ag = autoMode ? sim.agents[0] : agent;
  cardBox = [];
  phrases.forEach((ph, k) => {
    let x = 40 + k * (cw + 12), on = k === current && !autoMode, playing = on && millis() - playStart < 2500;
    cardBox.push([x, y0, cw, 150]);
    fill(on ? color(50, 56, 100) : color(28, 32, 64)); stroke(on ? color(...GOLD) : color(70, 76, 120)); strokeWeight(on ? 3 : 1); rect(x, y0, cw, 150, 8);
    let tot = ph.notes.reduce((s, n) => s + n.dur, 0), tx = x + 10; noStroke();
    for (let nt of ph.notes) { let w = ((cw - 20) * nt.dur) / tot, yy = y0 + 100 - (nt.midi - BASE_MIDI) * 4; fill(playing ? color(...GOLD) : color(...CYAN)); rect(tx, yy, w - 2, 8, 2); tx += w; }
    fill(230); textSize(14); textAlign(LEFT, BASELINE); text('フレーズ ' + (k + 1) + '（' + ph.notes.length + ' 音）', x + 8, y0 + 20);
    fill(...(ag.q[k] >= 0 ? LIME : PINK)); rect(x + cw / 2, y0 + 128, (ag.q[k] * (cw / 2 - 10)), 10);
    fill(200, 205, 235); textSize(12); text('Q = ' + fmtN(ag.q[k]) + '　' + ag.n[k] + ' 回', x + 8, y0 + 145);
  });

  if (!autoMode) {
    // ---- 好き / きらい ボタン
    let by = y0 + 190; buttons = [[40, by, 200, 60, 1, '好き ↑'], [260, by, 200, 60, -1, 'きらい ↓'], [480, by, 200, 60, 0, current < 0 ? 'はじめる ▶' : 'もう一度 ♪']];
    for (let [x, y, w, h, r, s] of buttons) { fill(r > 0 ? color(...LIME, waiting ? 255 : 90) : r < 0 ? color(...PINK, waiting ? 255 : 90) : color(...CYAN)); rect(x, y, w, h, 10); fill(20); textAlign(CENTER, CENTER); textSize(20); text(s, x + w / 2, y + h / 2); }
    textAlign(LEFT, BASELINE); fill(230); textSize(16);
    text(current < 0 ? 'まず「はじめる」をクリック（音が出ます。音量に注意）' : waiting ? 'フレーズ ' + (current + 1) + ' はどうだった？' : '次のフレーズを選んでいます…', 700, by + 36);
    // 報酬の履歴
    let hy = by + 110; fill(230); text('あなたが返した報酬（新しいほど右）', 40, hy);
    rewardLog.slice(-60).forEach((h, i) => { fill(...(h.r > 0 ? LIME : PINK)); rect(40 + i * 18, hy + 14, 14, 14, 3); fill(20); textSize(10); textAlign(CENTER, CENTER); text(h.k + 1, 47 + i * 18, hy + 21); textAlign(LEFT, BASELINE); });
    fill(170, 176, 210); textSize(13);
    text('途中で好みを変えてみよう（さっきまで好きだったフレーズを「きらい」に）。一定の α なので数回で Q が下がり、ほかを試しはじめる', 40, hy + 60);
  } else {
    // ---- 自動の聞き手：好きなフレーズを選べた割合（直近 50 回）
    let g = { x: 70, y: y0 + 210, w: width - 140, h: height - (y0 + 210) - 80, x0: 0, x1: 3000, y0: 0, y1: 1 };
    plotAxes(g, '回数（150 回ごとに好みが変わる）', '好きなフレーズを選べた割合（直近 50 回）', [0, 750, 1500, 2250, 3000], [0, 0.5, 1]);
    for (let t = 150; t < 3000; t += 150) { stroke(90, 96, 140); strokeWeight(1); line(gX(g, t), g.y, gX(g, t), g.y + g.h); }
    drawCurve(g, smoothArr(sim.picks[0], 50), GOLD, 2.5); drawCurve(g, smoothArr(sim.picks[1], 50), VIOLET, 2.5);
    legend(g.x + 12, g.y + 16, [[GOLD, '一定の α = ' + ALPHA + '（最近を重く）'], [VIOLET, '標本平均 1/n（昔も同じ重さ）']]);
  }
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  startAudio();
  for (let [x, y, w, h, r] of buttons) if (!autoMode && mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) { if (r === 0) { if (current < 0) nextTrial(); else playPhrase(current); } else feedback(r); return; }
  cardBox.forEach((b, k) => { if (mouseX > b[0] && mouseX < b[0] + b[2] && mouseY > b[1] && mouseY < b[1] + b[3]) playPhrase(k); });
}
function keyPressed() {
  startAudio();
  if (key === UP_ARROW) feedback(1);
  if (key === DOWN_ARROW) feedback(-1);
  if (key === ' ') { if (current < 0) nextTrial(); else playPhrase(current); }
  if (key === 'a' || key === 'A') { autoMode = !autoMode; if (autoMode) { seedRng(140); sim = makeSim(); } }
  if (key === 'n' || key === 'N') { makePhrases(); agent = makeAgent(true); rewardLog = []; current = -1; waiting = false; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('全体の音量 MASTER ≤ 0.2', MASTER <= 0.2);
  seedRng(1); makePhrases();
  check('フレーズは ' + N_PHRASES + ' つ、どれも 4〜8 音で、音の高さは音階の中', phrases.length === N_PHRASES && phrases.every((p) => p.notes.length >= 4 && p.notes.length <= 8 && p.notes.every((n) => SCALE_NOTES.includes(n.midi - BASE_MIDI))));
  let ag = makeAgent(true); learn(ag, 2, 1); learn(ag, 2, -1);
  let av = makeAgent(false); learn(av, 2, 1); learn(av, 2, -1);
  check('更新の式：一定の α = 0.3 なら 0 → 0.3 → 0.3 + 0.3(−1 − 0.3) = −0.09、標本平均なら (1 − 1)/2 = 0', near(ag.q[2], -0.09, 1e-12) && near(av.q[2], 0, 1e-12));
  let before = [0, 0], after = [0, 0];
  for (let seed = 1; seed <= 6; seed++) {
    seedRng(seed); let s = makeSim();
    for (let t = 0; t < 600; t++) simStep(s);
    for (let i = 0; i < 2; i++) { before[i] += meanOf(s.picks[i].slice(100, 150)) / 6; after[i] += meanOf(s.picks[i].slice(150, 600)) / 6; }
  }
  check('好みが変わる前は、どちらも好きなフレーズを選べる（' + Math.round(100 * before[0]) + '%・' + Math.round(100 * before[1]) + '%）', before[0] > 0.6 && before[1] > 0.6);
  check('好みが変わったあとは、一定の α（' + Math.round(100 * after[0]) + '%）が標本平均（' + Math.round(100 * after[1]) + '%）よりよくついていく', after[0] > after[1] + 0.1);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 好きなフレーズを決めて、エージェントが何回でそれを選ぶようになるか数えよう
// 2. ALPHA を 0.05 にすると、好みの変化についていくのはどうなる？ 0.8 では？
// 3. EPS を 0 にすると、ほかのフレーズを試さなくなる。好みが変わったらどうなる？
// 4. 「好き」の報酬を +1、「きらい」を 0 にすると？（−1 との違い）
// 5. SCALE_NOTES を変えて、音階をかえてみよう（例：[0, 3, 5, 6, 7, 10, 12]）

// ==================================================
// ここから下は「強化学習の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [14, 16, 34];                // 背景（アーケードの紺）
const GOLD = [255, 196, 60], CYAN = [90, 215, 245], PINK = [245, 110, 170], LIME = [160, 230, 110], VIOLET = [175, 140, 255];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function argmaxR(q) {                  // いちばん大きい値の番号（同点はランダムに 1 つ）
  let m = -Infinity, best = [];
  for (let i = 0; i < q.length; i++) {
    if (q[i] > m + 1e-12) { m = q[i]; best = [i]; } else if (Math.abs(q[i] - m) <= 1e-12) best.push(i);
  }
  return best.length ? best[Math.floor(rnd() * best.length)] : 0;
}
function argmaxFirst(q) { let b = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[b]) b = i; return b; }   // 同点は若い番号
function maxOf(q) { let m = -Infinity; for (let v of q) if (v > m) m = v; return m; }
function epsGreedy(q, eps) { return rnd() < eps ? Math.floor(rnd() * q.length) : argmaxR(q); }   // ε の確率でランダム、ほかは貪欲
function softmaxArr(h, tau) {          // ボルツマン分布 exp(h/τ) / Σ（大きい数でもあふれないように最大値を引く）
  let m = maxOf(h), e = h.map((v) => Math.exp((v - m) / (tau || 1))), s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
function sampleFrom(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
function meanOf(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; let s = v.toFixed(d === undefined ? 2 : d); return s === '-0.00' || s === '-0.0' || s === '-0' ? s.slice(1) : s; }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(70, 76, 110); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(150, 156, 190); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205, 210, 235); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function smoothArr(a, k) {             // 直前 k 個の平均（ギザギザの学習曲線をならす）
  let out = [], s = 0;
  for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= k) s -= a[i - k]; out.push(s / Math.min(i + 1, k)); }
  return out;
}
function drawCurve(g, arr, col, sw, xOff) {   // arr[i] を x = i (+ xOff) に。長いときは間引いて 600 点まで
  let n = arr.length, stride = Math.max(1, Math.ceil(n / 600)), pts = [];
  for (let i = 0; i < n; i += stride) pts.push([gX(g, i + (xOff || 0)), gY(g, arr[i])]);
  if (n > 1 && (n - 1) % stride) pts.push([gX(g, n - 1 + (xOff || 0)), gY(g, arr[n - 1])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {         // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(220, 225, 245); text(s, x + 22, y); y += 20; }
}
// ---- 音の道具（Web Audio）。全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playNote(freq, when, dur, wave) {   // 1 音（やわらかく立ち上がって消える）
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = wave || 'triangle'; o.frequency.setValueAtTime(freq, when);
  gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(0.6, when + 0.02);
  gn.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + dur + 0.05);
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 225, 200) : color(255, 90, 120)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
