// ============================================
// 14 Musicolour 風（パスク 1953〜）
// キーボードで音を鳴らすと、8 つのランプが光で応える。でも同じ音・同じ流れをくり返すと機械は「慣れて（飽きて）」光が弱まる
// 新しい音やつながりを弾くと、また明るく応える。飽きが続くと、機械は自分の色の割り当てを変える（気分を変える）
// A S D F G H J K = ド〜ド（最初に 1 回クリックで音が出る） / ランプをクリック = その音 / P = 同じフレーズを自動演奏 / Z = でたらめ自動演奏 / R = やり直し
// ============================================

const KEYS = 'asdfghjk';
const FREQ = [261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3];
const NAMES = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
const ALPHA = 0.25;     // ★ 1 回鳴るごとの慣れの増え方
const TAU_H = 6;        // ★ 慣れが消える時間 [秒]
const FORGET_T = 0.97;  // ★ 音のつながりの記録を、1 音ごとに少しずつ忘れる
const BORED = 0.65;     // ★ 飽きがこの値を 4 秒こえたら気分を変える
let mc, autoMode = 0, autoT = 0, autoI = 0, arng, histR = [];
const PHRASE = [0, 2, 4, 2];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  mc = makeMachine(); arng = makeRng(14);
}
// ---- 機械の状態：慣れ h（チャンネルごと）、ランプの明るさ、つながりの回数 T[前][今]、飽き
function makeMachine() { let T = []; for (let i = 0; i < 8; i++) T.push(new Array(8).fill(0)); return { h: new Array(8).fill(0), lamp: new Array(8).fill(0), T, prev: -1, bored: 0, boredT: 0, moods: 0, hueShift: 0, last: { r: 0, nov: 1, out: 0 } }; }
// 時間がたつ：慣れは e^(−t/τ) で消え、ランプは暗くなり、飽きはゆっくり下がる
function advance(m, dt) {
  let f = Math.exp(-dt / TAU_H);
  for (let c = 0; c < 8; c++) { m.h[c] *= f; m.lamp[c] *= Math.exp(-dt / 0.6); }
  m.bored *= Math.exp(-dt / 8);
  if (m.bored > BORED) { m.boredT += dt; if (m.boredT > 4) { m.moods++; m.hueShift = (m.hueShift + 137) % 360; m.boredT = 0; m.bored = 0; for (let r of m.T) r.fill(0); } } else m.boredT = 0;
}
// 音 c が鳴った：応答 = (1 − 慣れ) × (0.4 + 0.6 × 新しさ)。新しさ = 1 ÷ (1 + このつながりを聞いた回数)
function hear(m, c) {
  let r = 1 - m.h[c], nov = m.prev < 0 ? 1 : 1 / (1 + m.T[m.prev][c]), out = r * (0.4 + 0.6 * nov);
  m.h[c] = clampv(m.h[c] + ALPHA * (1 - m.h[c]), 0, 1);
  for (let row of m.T) for (let j = 0; j < 8; j++) row[j] *= FORGET_T;
  if (m.prev >= 0) m.T[m.prev][c] += 1;
  m.prev = c; m.lamp[c] = Math.max(m.lamp[c], out);
  m.bored = clampv(m.bored + 0.15 * (1 - out - m.bored), 0, 1);
  m.last = { r, nov, out };
  return out;
}
function playChannel(c) { startAudio(); let o = hear(mc, c); playNote(FREQ[c], 0.35, 0.15 + 0.15 * o, 'triangle'); histR.push(o); if (histR.length > 120) histR.shift(); }

function draw() {
  background(24, 35, 10);
  advance(mc, deltaTime / 1000 > 0 ? Math.min(0.1, deltaTime / 1000) : 1 / 60);
  if (autoMode) { autoT += deltaTime / 1000; if (autoT > 0.3) { autoT = 0; playChannel(autoMode === 1 ? PHRASE[autoI++ % PHRASE.length] : Math.floor(arng() * 8)); } }

  say('Musicolour 風 ─ 同じことばかり弾くと、機械は飽きる', 20, 36, 20);
  say('A S D F G H J K で演奏（最初にクリック）　ランプをクリック　P 同じフレーズ自動 ' + (autoMode === 1 ? 'ON' : 'OFF') + '　Z でたらめ自動 ' + (autoMode === 2 ? 'ON' : 'OFF') + '　R やり直し', 20, 62, 15, C_SUB);
  // ---- ランプ
  let lw = (width - 80) / 8, ly = 110, lh = height * 0.38;
  for (let c = 0; c < 8; c++) {
    let x = 40 + c * lw, hue = (c * 45 + mc.hueShift) % 360, b = mc.lamp[c];
    noStroke(); fill(hue, 70, 15 + 85 * b, 100); rect(x + 6, ly, lw - 12, lh, 14);
    for (let k = 3; k > 0; k--) { fill(hue, 60, 100, 12 * b); circle(x + lw / 2, ly + lh / 2, (lw - 12) * (0.5 + 0.35 * k) * b); }
    say(NAMES[c] + '（' + KEYS[c].toUpperCase() + '）', x + 16, ly + lh + 26, 15);
    noStroke(); fill(0, 0, 100, 8); rect(x + 10, ly + lh + 38, lw - 20, 10, 3); fill(col(C_ALARM)); rect(x + 10, ly + lh + 38, (lw - 20) * mc.h[c], 10, 3);
  }
  say('赤い帯 = そのチャンネルの慣れ h（同じ音を続けると 1 に近づき、休むと e^(−t/' + TAU_H + ') で消える）', 40, ly + lh + 70, 13, C_SUB);
  // ---- 数とグラフ
  let my = ly + lh + 100, L = mc.last;
  say(mc.prev < 0 ? 'まずキャンバスをクリックして、A S D F … で弾いてみよう' : '前の音への応答 = (1 − 慣れ ' + (1 - L.r).toFixed(2) + ') × (0.4 + 0.6 × 新しさ ' + L.nov.toFixed(2) + ') = ' + L.out.toFixed(3), 40, my, 16, C_TUBE);
  say('飽き ' + mc.bored.toFixed(2) + (mc.bored > BORED ? '（' + mc.boredT.toFixed(1) + ' 秒…4 秒で気分を変える）' : '') + '　気分を変えた回数 ' + mc.moods, 40, my + 26, 16, mc.bored > BORED ? C_ALARM : C_TXT);
  let gy = my + 44, gh = height - gy - 40, gw = width * 0.55;
  plotFrame(40, gy, gw, gh, '1 音ごとの応答（0〜1）');
  plotLine(histR, 40, gy, gw, gh, 0, 1, C_TUBE, 120, 2);
  // つながりの表
  let tx = 70 + gw, cs = Math.min(22, (gh - 20) / 9);
  say('音のつながりを聞いた回数（行 = 前、列 = 今）', tx, gy + 12, 12, C_SUB);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { noStroke(); fill(42, 60, 15 + 20 * Math.min(4, mc.T[i][j])); rect(tx + j * cs, gy + 22 + i * cs, cs - 2, cs - 2, 2); }
  drawSelfTest();
}

function mousePressed() {
  startAudio();
  let lw = (width - 80) / 8, c = Math.floor((mouseX - 40) / lw);
  if (c >= 0 && c < 8 && mouseY > 110 && mouseY < 110 + height * 0.38) playChannel(c);
}
function keyPressed() {
  let c = KEYS.indexOf(String(key).toLowerCase());
  if (c >= 0) { playChannel(c); return; }
  if (key === 'p' || key === 'P') { startAudio(); autoMode = autoMode === 1 ? 0 : 1; }
  if (key === 'z' || key === 'Z') { startAudio(); autoMode = autoMode === 2 ? 0 : 2; }
  if (key === 'r' || key === 'R') { mc = makeMachine(); histR = []; }
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let m = makeMachine(), rs = [];
  for (let k = 0; k < 20; k++) { rs.push(hear(m, 0)); advance(m, 0.2); }
  check('同じ音（ド）を 20 回：応答は毎回へる（' + rs[0].toFixed(2) + ' → ' + rs[19].toFixed(2) + '）', rs.every((r, k) => k === 0 || r < rs[k - 1]));
  let fresh = hear(m, 1);
  check('ドに飽きた後でも、レは慣れ 0 → (1 − 0) × 新しいつながり（新しさ 1）= 応答 1', near(fresh, 1, 1e-12));
  let m2 = makeMachine(); for (let k = 0; k < 20; k++) { hear(m2, 0); advance(m2, 0.2); }
  advance(m2, 15); let back = 1 - m2.h[0];
  check('15 秒休むと慣れが消える：1 − h = ' + back.toFixed(3) + ' > 0.9（e^(−15/6) で減る）', back > 0.9);
  let m3 = makeMachine(), nov = [];
  for (let k = 0; k < 10; k++) for (let c of [0, 2, 4]) { hear(m3, c); nov.push(m3.last.nov); advance(m3, 0.3); }
  check('ド ミ ソ を 10 回くり返す：つながりの新しさ ' + nov[4].toFixed(2) + ' → ' + nov[nov.length - 1].toFixed(2) + '（1/3 以下に）', nov[nov.length - 1] < nov[4] / 3);
  let m4 = makeMachine(), r4 = makeRng(1), ok = true;
  for (let k = 0; k < 1000; k++) { hear(m4, Math.floor(r4() * 8)); advance(m4, r4() * 0.5); if (!m4.h.every((v) => v >= 0 && v <= 1) || !(m4.bored >= 0 && m4.bored <= 1)) ok = false; }
  check('でたらめな 1000 音でも、慣れと飽きは 0〜1 の中', ok);
  let m5 = makeMachine(); for (let k = 0; k < 200; k++) { hear(m5, 0); advance(m5, 0.1); }
  check('同じ音ばかり 20 秒 → 飽きが続いて気分（色の割り当て）を変える（' + m5.moods + ' 回）', m5.moods >= 1);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ド（A）だけを連打しよう。光はどうなる？ ほかの音に変えると？
// 2. P で同じフレーズを流すと、機械はいつ「気分を変える」？ そのあと同じフレーズへの反応は？
// 3. Z（でたらめ）と P（くり返し）で、応答のグラフを比べよう。機械が一番喜ぶのはどんな演奏？
// 4. ALPHA や TAU_H を変えて、飽きっぽい機械・がまん強い機械を作ろう
// 5. パスクは「演奏者と機械が互いに学び合う会話」と考えた。人が機械に合わせて弾き方を変えるのは、どちらが制御している？


// ==================================================
// ここから下は「サイバネティクスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function fin(v, d) { return Number.isFinite(v) ? v : d; }        // NaN・Infinity なら d にもどす
// 決まった種（seed）から毎回同じ乱数列（0〜1）を出す。自己テストをいつも同じにするため
function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- 画面の道具（色は [色相, 彩度, 明るさ] の配列）
const C_TXT = [40, 12, 96], C_SUB = [35, 18, 72], C_SCOPE = [135, 70, 92], C_TUBE = [24, 85, 100], C_BRASS = [42, 55, 88], C_ALARM = [0, 80, 100];
function col(c, a) { return color(c[0], c[1], c[2], a === undefined ? 100 : a); }
function say(s, x, y, size, c) { noStroke(); fill(col(c || C_TXT)); textSize(size || 15); text(s, x, y); }
// オシロスコープ風の枠
function plotFrame(x, y, w, h, title) {
  noStroke(); fill(130, 40, 6, 90); rect(x, y, w, h, 6);
  stroke(130, 40, 40, 40); strokeWeight(1);
  for (let k = 1; k < 4; k++) line(x, y + (h * k) / 4, x + w, y + (h * k) / 4);
  noFill(); stroke(C_BRASS[0], C_BRASS[1], 60); rect(x, y, w, h, 6);
  if (title) say(title, x + 8, y + 18, 13, C_SUB);
}
// arr の値を lo〜hi の範囲で、枠 (x, y, w, h) に折れ線で描く（n = 横に並べる点の数）
function plotLine(arr, x, y, w, h, lo, hi, c, n, wt) {
  if (!arr || arr.length < 2) return;
  n = n || arr.length;
  stroke(col(c)); strokeWeight(wt || 2); noFill();
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / (n - 1)) * w, y + h - clampv((fin(arr[i], lo) - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
function hLine(v, x, y, w, h, lo, hi, c) {   // グラフの中の水平線（目標値など）
  let yy = y + h - clampv((v - lo) / (hi - lo), 0, 1) * h;
  stroke(col(c, 70)); strokeWeight(1); drawingContext.setLineDash([6, 5]); line(x, yy, x + w, yy); drawingContext.setLineDash([]);
}
// ブロック図の箱（名前と今の値）
function blockBox(x, y, w, h, name, val, c) {
  stroke(col(c || C_BRASS)); strokeWeight(2); fill(25, 40, 16); rect(x, y, w, h, 8);
  noStroke(); fill(col(C_TXT)); textAlign(CENTER, CENTER); textSize(15); text(name, x + w / 2, y + h / 2 - (val === undefined ? 0 : 10));
  if (val !== undefined) { fill(col(c || C_TUBE)); textSize(14); text(val, x + w / 2, y + h / 2 + 12); }
  textAlign(LEFT, BASELINE);
}
// 信号の矢印：点が流れて「ループを回る」ようすを見せる（phase = 0〜1）
function flowArrow(x1, y1, x2, y2, c, phase, label) {
  stroke(col(c)); strokeWeight(2); line(x1, y1, x2, y2);
  let a = Math.atan2(y2 - y1, x2 - x1);
  noStroke(); fill(col(c)); triangle(x2, y2, x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4), x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4));
  for (let k = 0; k < 3; k++) { let f = (phase + k / 3) % 1; circle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 6); }
  if (label) { fill(col(C_SUB)); textSize(13); text(label, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6); }
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return Number.isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { say(selfTestLine(), 20, height - 16, 14, selfTestResults.every((r) => r.ok) ? C_SCOPE : C_ALARM); }

// ---- 音を鳴らす道具（Web Audio。最初のクリックかキーで startAudio()）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音：周波数 f、長さ dur 秒、大きさ vol、音色 type（'sine' 'triangle' 'square' 'sawtooth'）
function playNote(f, dur, vol, type) {
  if (!audioCtx || !isFinite(f) || f <= 0) return;
  dur = Math.max(0.05, Math.min(3, dur));
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'triangle'; o.frequency.value = Math.min(4000, f);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, Math.min(0.5, vol)), t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + dur + 0.05);
}
