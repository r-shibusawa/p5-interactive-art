// ============================================
// 12 MAX-3-CNF を聞く（乱択近似）
// 3 文字の節がたくさん。全部を真にするのは難しいが、「コインで変数を決める」だけで平均 7/8 の節が真になる
// 各節が偽になるのは 3 文字とも偽のときだけ：確率 (1/2)³ = 1/8 → 期待値 7/8（最適の 8/7 倍以内の近似）
// 割り当てを試すたびに音が鳴る：真の節が多いほど高い音。全部真なら和音
// クリックで音 ON / スペース：再生・停止 / 1：コインで乱択  2：全部の割り当てを総当たり / R：新しい式 / 上下：速さ
// ============================================

let N_VARS = 8;          // ★ 変数の数（総当たりは 2^N_VARS 通り）
let M_CLAUSES = 40;      // ★ 節の数
let clauses = [], asg = [], sat = [];
let mode = 1, playing = false, tempo = 0.18;
let history = [], best = 0, bruteI = 0, nextTime = 0;
let tones = [0, 2, 4, 7, 9];  // ★ 音階（ペンタトニック）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newFormula();
  setInterval(scheduler, 25);
}

function newFormula() {
  clauses = [];
  for (let c = 0; c < M_CLAUSES; c++) {
    let vs = shuffle([...Array(N_VARS).keys()]).slice(0, 3);
    clauses.push(vs.map((v) => ({ v, neg: random() < 0.5 })));
  }
  asg = new Array(N_VARS).fill(false);
  history = []; best = 0; bruteI = 0;
  evaluate();
}
function evaluate() { sat = clauses.map((cl) => cl.some((l) => asg[l.v] !== l.neg)); return sat.filter((s) => s).length; }

function trial(when) {
  if (mode === 1) for (let i = 0; i < N_VARS; i++) asg[i] = random() < 0.5;
  else { for (let i = 0; i < N_VARS; i++) asg[i] = ((bruteI >> i) & 1) === 1; bruteI = (bruteI + 1) % (1 << N_VARS); }
  let k = evaluate();
  history.push(k); if (history.length > 400) history.shift();
  best = max(best, k);
  // 音：真の節の割合 → 音の高さ
  let frac = k / M_CLAUSES;
  let idx = floor(map(frac, 0.6, 1, 0, 14, true));
  let midi = 60 + floor(idx / 5) * 12 + tones[idx % 5];
  playNote(noteToFreq(midi), 0.25, tempo * 1.5, 'triangle', when);
  if (k === M_CLAUSES) { playNote(noteToFreq(midi + 4), 0.18, 0.8, 'sine', when); playNote(noteToFreq(midi + 7), 0.18, 0.8, 'sine', when); }
  if (k < M_CLAUSES * 0.8) playNote(noteToFreq(36), 0.2, tempo, 'sawtooth', when); // 少ないと低いうなり
}

function scheduler() {
  if (!playing || !audioCtx) return;
  while (nextTime < audioCtx.currentTime + 0.1) { trial(nextTime); nextTime += tempo; }
}

function draw() {
  background(290, 30, 9);
  noStroke(); textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('クリックで音 ON　スペース：再生／停止　1：コインで乱択　2：総当たり　R：新しい式　上下：速さ', 20, 34);

  // 変数
  for (let i = 0; i < N_VARS; i++) {
    fill(asg[i] ? color(50, 85, 100) : color(230, 30, 35));
    rect(20 + i * 62, 60, 54, 40, 8);
    fill(asg[i] ? 0 : 100); textAlign(CENTER, CENTER); textSize(16);
    text('x' + (i + 1) + (asg[i] ? ' T' : ' F'), 47 + i * 62, 80);
  }
  // 節のマス
  let cols = 10, cw = min(110, (width * 0.55) / cols), ch = 44;
  clauses.forEach((cl, c) => {
    let x = 20 + (c % cols) * cw, y = 130 + floor(c / cols) * ch;
    fill(sat[c] ? color(140, 60, 75) : color(0, 80, 95)); rect(x, y, cw - 6, ch - 6, 6);
    fill(0, 0, sat[c] ? 10 : 100); textSize(11); textAlign(CENTER, CENTER);
    text(cl.map((l) => (l.neg ? '¬' : '') + 'x' + (l.v + 1)).join('∨'), x + (cw - 6) / 2, y + (ch - 6) / 2);
  });

  // ヒストグラム
  let hx = width * 0.62, hy = 130, hw = width - hx - 30, hh = height * 0.45;
  let counts = new Array(M_CLAUSES + 1).fill(0);
  for (let k of history) counts[k]++;
  let mc = max(1, max(counts));
  let lo = floor(M_CLAUSES * 0.6);
  for (let k = lo; k <= M_CLAUSES; k++) {
    let x = map(k, lo, M_CLAUSES + 1, hx, hx + hw), w = hw / (M_CLAUSES + 1 - lo);
    let h = (counts[k] / mc) * hh;
    fill(k === M_CLAUSES ? color(50, 90, 100) : color(190, 60, 90)); rect(x, hy + hh - h, w - 2, h);
  }
  let ex = map(M_CLAUSES * 7 / 8, lo, M_CLAUSES + 1, hx, hx + hw);
  stroke(0, 0, 100); strokeWeight(2); drawingContext.setLineDash([6, 6]); line(ex, hy, ex, hy + hh); drawingContext.setLineDash([]);
  noStroke(); fill(0, 0, 100); textSize(14); textAlign(CENTER, TOP); text('7/8 = ' + nf(M_CLAUSES * 7 / 8, 1, 1), ex, hy + hh + 6);
  fill(0, 0, 60); text('真の節の数', hx + hw / 2, hy + hh + 28);

  let k = sat.filter((s) => s).length;
  let avg = history.length ? history.reduce((a, b) => a + b, 0) / history.length : 0;
  textAlign(LEFT, BASELINE); textSize(20);
  fill(45, 85, 100); text('今：' + k + ' / ' + M_CLAUSES + ' 節が真', hx, hy - 50);
  fill(0, 0, 90); text('平均 ' + nf(avg, 1, 2) + '（' + history.length + ' 回）　最高 ' + best, hx, hy - 20);
  if (mode === 2) { fill(280, 50, 100); textSize(16); text('総当たり ' + bruteI + ' / ' + (1 << N_VARS) + '（1 周すれば最高 = 最適）', hx, hy + hh + 60); }
  fill(0, 0, 60); textSize(15);
  text('平均はほぼ 7/8 に集まる（期待値の線形性）。コインを投げ直すだけで「最適の 8/7 倍以内」が期待できる乱択近似アルゴリズム', 20, height - 22);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') { playing = !playing; if (playing) nextTime = audioCtx.currentTime + 0.05; }
  if (key === '1') { mode = 1; history = []; }
  if (key === '2') { mode = 2; history = []; bruteI = 0; best = 0; }
  if (key === 'r' || key === 'R') newFormula();
  if (key === UP_ARROW) tempo = max(0.04, tempo * 0.7);
  if (key === DOWN_ARROW) tempo = min(0.6, tempo / 0.7);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. しばらく鳴らして、平均が 7/8 に近づくのを確かめよう
// 2. M_CLAUSES を 80 にすると、全部真（和音）はほとんど鳴らなくなる。なぜ？
// 3. tones を [0, 3, 5, 7, 10]（マイナー・ペンタ）にして雰囲気を変えよう


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
function noteToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
