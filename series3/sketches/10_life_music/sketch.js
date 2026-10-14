// ============================================
// 10 ライフゲーム・ミュージック
// 02 のライフゲームを「楽譜」にする。縦が音の高さ、横が時間。
// 再生バーが通った列の、生きているセルの音が鳴る。世代が進むと曲も変わる
// クリックで音 ON・セルを描く / スペース = 世代を進める ON/OFF / R = ランダム
// ============================================

let cols = 32, rows = 12;
let grid, next;
let cellW, cellH;
let playhead = 0; // 再生バーの位置（列）
let lastBeat = 0;
let evolving = true;
// 縦の位置 → 音（ペンタトニック・スケール。何が重なってもきれい）
let notes = ['C5', 'A4', 'G4', 'E4', 'D4', 'C4', 'A3', 'G3', 'E3', 'D3', 'C3', 'A2'];
let flash = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cellW = width / cols;
  cellH = (height - 60) / rows;
  grid = make2D();
  flash = make2D();
  randomize();
}

function make2D() {
  let a = [];
  for (let x = 0; x < cols; x++) a.push(new Array(rows).fill(0));
  return a;
}

function randomize() {
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) grid[x][y] = random() < 0.2 ? 1 : 0;
}

function draw() {
  background(260, 40, 10);

  // 8分音符ごとに再生バーを進める（BPM 120）
  if (audioCtx && audioCtx.currentTime - lastBeat > 0.25) {
    lastBeat = audioCtx.currentTime;
    playhead = (playhead + 1) % cols;
    // この列の生きているセルを鳴らす
    for (let y = 0; y < rows; y++) {
      if (grid[playhead][y] === 1) {
        playNote(notes[y], 0.15, 0.4);
        flash[playhead][y] = 1;
      }
    }
    // 1周ごとにライフゲームを1世代進める
    if (playhead === 0 && evolving) nextGeneration();
  }

  // 描く
  noStroke();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (grid[x][y] === 1) fill(map(y, 0, rows, 300, 180), 60, 60 + flash[x][y] * 40);
      else fill(260, 30, 15);
      rect(x * cellW + 1, 60 + y * cellH + 1, cellW - 2, cellH - 2, 4);
      flash[x][y] *= 0.9;
    }
  }
  // 再生バー
  fill(0, 0, 100, 25);
  rect(playhead * cellW, 60, cellW, height - 60);

  fill(0, 0, 100);
  textSize(16);
  text(audioCtx ? 'クリックでセルを描く　スペース：世代を進める ' + (evolving ? 'ON' : 'off') + '　R：ランダム　C：消す' : 'クリックして音を ON にしよう', 16, 30);
}

// ライフゲームのルール（02 と同じ）
function nextGeneration() {
  let n = make2D();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let c = 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        if (i || j) c += grid[(x + i + cols) % cols][(y + j + rows) % rows];
      }
      n[x][y] = grid[x][y] === 1 ? (c === 2 || c === 3 ? 1 : 0) : c === 3 ? 1 : 0;
    }
  }
  grid = n;
}

function mousePressed() {
  startAudio();
  if (!lastBeat) lastBeat = audioCtx.currentTime;
  let x = floor(mouseX / cellW), y = floor((mouseY - 60) / cellH);
  if (x >= 0 && x < cols && y >= 0 && y < rows) grid[x][y] = 1 - grid[x][y];
}

function keyPressed() {
  if (key === ' ') evolving = !evolving;
  if (key === 'r' || key === 'R') randomize();
  if (key === 'c' || key === 'C') grid = make2D();
}

// ---------- やってみよう ----------
// 1. スペースで世代を止めて、自分で描いたパターンを「作曲」しよう
// 2. notes を変える（例：長調のドレミファソラシ）
// 3. 0.25（8分音符）を 0.125 にすると倍速になる


// ==================================================
// ここから下は「音を鳴らすための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, masterOut;

// 音を出す準備（クリックやキーを押したときに呼ぶ）
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor(); // 音割れを防ぐ
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}

// 音を1つ鳴らす： playNote('C4', 音の大きさ 0〜1, 長さ[秒], 音色, 鳴らす時刻)
// 音色は 'sine' 'triangle' 'sawtooth' 'square' から選べる
function playNote(note, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator();
  let amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = typeof note === 'number' ? note : noteToFreq(note);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01); // すぐ大きく
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration); // だんだん小さく
  osc.connect(amp);
  amp.connect(masterOut);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

// 音名（'C4' や 'F#3'）を周波数（Hz）に変える
function noteToFreq(note) {
  let steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = steps[note[0]];
  if (note[1] === '#') n = n + 1;
  if (note[1] === 'b') n = n - 1;
  let octave = parseInt(note.slice(-1));
  return 440 * Math.pow(2, (n + (octave + 1) * 12 - 69) / 12); // ラ(A4) = 440Hz が基準
}
