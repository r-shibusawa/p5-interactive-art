// ============================================
// 12 自分の生命ルールをつくる（自由制作のベース）
// ライフゲームのルールは B3/S23（となりが3で誕生、2か3で生存）。
// この数字を変えると、まったく別の「宇宙」が生まれる。セルが生まれると音が鳴る
// ドラッグで描く / スペース = 再生・停止 / R = ランダム / 1〜5 で有名なルール
// ============================================
// ★ のついたところを変えて、自分だけの宇宙をつくろう！

let BIRTH = [3]; // ★ となりが何個のとき生まれるか
let SURVIVE = [2, 3]; // ★ となりが何個のとき生き残るか
let ruleName = 'B3/S23 ライフゲーム';

let presets = {
  1: { b: [3], s: [2, 3], name: 'B3/S23 ライフゲーム' },
  2: { b: [3, 6], s: [2, 3], name: 'B36/S23 ハイライフ（自己複製）' },
  3: { b: [3], s: [1, 2, 3, 4, 5], name: 'B3/S12345 迷路' },
  4: { b: [3, 6, 7, 8], s: [3, 4, 6, 7, 8], name: 'B3678/S34678 昼と夜' },
  5: { b: [2], s: [], name: 'B2/S 種（爆発）' },
};

let cellSize = 12; // ★ セルの大きさ
let cols, rows, grid, age;
let running = true;
let notes = ['C3', 'E3', 'G3', 'B3', 'D4', 'F#4', 'A4', 'C5']; // ★ 誕生の音

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cols = floor(width / cellSize);
  rows = floor((height - 50) / cellSize);
  grid = make2D();
  age = make2D();
  randomize(0.15);
}

function make2D() {
  let a = [];
  for (let x = 0; x < cols; x++) a.push(new Array(rows).fill(0));
  return a;
}
function randomize(p) {
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) grid[x][y] = random() < p ? 1 : 0;
}

function draw() {
  background(0, 0, 6);
  if (running && frameCount % 6 === 0) nextGeneration(); // ★ 6 を小さくすると速い

  noStroke();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (grid[x][y]) {
        fill((age[x][y] * 8 + 180) % 360, 60, 100); // ★ 色：年齢で変わる
        rect(x * cellSize, 50 + y * cellSize, cellSize - 1, cellSize - 1, 3); // ★ 図形
      }
    }
  }
  fill(0, 0, 100);
  textSize(16);
  text(ruleName + '　' + (running ? '▶' : '❚❚') + '　スペース=再生/停止　ドラッグ=描く　R=ランダム　1〜5=ルール　クリックで音 ON', 16, 30);
}

function nextGeneration() {
  let next = make2D();
  let births = 0;
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let n = 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        if (i || j) n += grid[(x + i + cols) % cols][(y + j + rows) % rows];
      }
      if (grid[x][y] === 1 && SURVIVE.includes(n)) {
        next[x][y] = 1;
        age[x][y]++;
      } else if (grid[x][y] === 0 && BIRTH.includes(n)) {
        next[x][y] = 1;
        age[x][y] = 0;
        births++;
      }
    }
  }
  grid = next;
  // 生まれた数で音を鳴らす（多すぎると鳴らしすぎるので上限）
  if (audioCtx && births > 0) {
    let k = min(births, 4);
    for (let i = 0; i < k; i++) playNote(random(notes), 0.08, 0.3, 'sine');
  }
}

function mousePressed() {
  startAudio();
  paint();
}
function mouseDragged() {
  paint();
}
function paint() {
  let x = floor(mouseX / cellSize), y = floor((mouseY - 50) / cellSize);
  if (x >= 0 && x < cols && y >= 0 && y < rows) grid[x][y] = 1;
}

function keyPressed() {
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') randomize(0.15);
  if (key === 'c' || key === 'C') grid = make2D();
  if (presets[key]) {
    BIRTH = presets[key].b;
    SURVIVE = presets[key].s;
    ruleName = presets[key].name;
  }
}

// ---------- 自由制作のアイデア ----------
// ・BIRTH と SURVIVE を自分で決めて、面白い宇宙を探す（B3/S23 以外に 2^18 通りある）
// ・セルを rect から circle や文字にする。年齢で大きさを変える
// ・11 のマイクと組み合わせて、声でセルをランダムに生み出す
// ・10 のように、再生バーで音を鳴らす


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
