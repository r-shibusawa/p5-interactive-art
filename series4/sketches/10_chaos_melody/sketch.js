// ============================================
// 10 カオス・メロディ
// ロジスティック写像の x を「音の高さ」にする
// r が小さいと同じ音のくり返し、r を上げると 2音・4音のフレーズ、そしてカオスの即興演奏
// クリックで再生 / マウス左右 = r / 上下 = テンポ
// ============================================

let r = 3.5;
let x = 0.3;
let playing = false;
let lastBeat = 0;
let interval = 0.25;
let notes = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5'];
let played = []; // 鳴らした音の記録 {x, i}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(260, 40, 10);
  r = map(mouseX, 0, width, 2.8, 4.0, true);
  interval = map(mouseY, 0, height, 0.1, 0.5, true);

  if (playing && audioCtx.currentTime - lastBeat > interval) {
    lastBeat = audioCtx.currentTime;
    x = r * x * (1 - x); // ★ 次の値
    let i = floor(x * notes.length); // 0〜1 → 音の番号
    i = constrain(i, 0, notes.length - 1);
    playNote(notes[i], 0.3, interval * 1.5, r > 3.57 ? 'sawtooth' : 'triangle');
    played.push({ x, i });
    if (played.length > 64) played.shift();
  }

  // 鳴らした音を「楽譜」風に描く
  let left = 60, right = width - 60, top = 120, bot = height - 80;
  stroke(0, 0, 25);
  for (let k = 0; k < notes.length; k++) {
    let y = map(k, 0, notes.length - 1, bot, top);
    line(left, y, right, y);
    noStroke();
    fill(0, 0, 55);
    textSize(12);
    text(notes[k], 20, y + 4);
    stroke(0, 0, 25);
  }
  noStroke();
  for (let k = 0; k < played.length; k++) {
    let p = played[k];
    let px = map(k, 0, 63, left, right);
    let py = map(p.i, 0, notes.length - 1, bot, top);
    fill(map(p.i, 0, notes.length, 180, 360), 70, 100, k === played.length - 1 ? 100 : 60);
    circle(px, py, k === played.length - 1 ? 26 : 16);
  }

  let state = r < 3.0 ? '1音のくり返し' : r < 3.449 ? '2音のフレーズ' : r < 3.544 ? '4音のフレーズ' : r < 3.57 ? '8音…' : 'カオス（即興）';
  fill(0, 0, 100);
  textSize(18);
  text(playing ? 'r = ' + nf(r, 1, 3) + '（左右）　' + state + '　　テンポ ' + nf(interval, 1, 2) + '秒（上下）' : 'クリックで再生', 20, 40);
  textSize(14);
  fill(0, 0, 60);
  text('x ← r x (1 − x)　　x の値（0〜1）を 14 個の音に割り当てる', 20, 70);
}

function mousePressed() {
  startAudio();
  if (!playing) {
    playing = true;
    lastBeat = audioCtx.currentTime;
  }
}

// ---------- やってみよう ----------
// 1. r を 2.8 から 4.0 までゆっくり動かして、音楽が変わっていくのを聞こう
// 2. r = 3.83 付近は「3音のフレーズ」。見つけられる？
// 3. notes を自分の好きな音階に。ペンタトニックだとカオスでも心地よい


// ==================================================
// ここから下は「音を鳴らすための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, masterOut;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}

function playNote(note, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator();
  let amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = typeof note === 'number' ? note : noteToFreq(note);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp);
  amp.connect(masterOut);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noteToFreq(note) {
  let steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = steps[note[0]];
  if (note[1] === '#') n = n + 1;
  if (note[1] === 'b') n = n - 1;
  let octave = parseInt(note.slice(-1));
  return 440 * Math.pow(2, (n + (octave + 1) * 12 - 69) / 12);
}
