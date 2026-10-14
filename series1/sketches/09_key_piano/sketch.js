// ============================================
// 09 キーボードピアノ
// A S D F G H J K キーでドレミファソラシド
// 音に合わせて光の波紋が広がる
// ※ 最初にキャンバスを1回クリックしてからキーを押してね
// ============================================

let keyList = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
let notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
let names = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
let ripples = []; // 波紋
let glow = [0, 0, 0, 0, 0, 0, 0, 0]; // 鍵盤の光り具合

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(250, 30, 10, 30);

  // ---- 波紋 ----
  for (let i = ripples.length - 1; i >= 0; i--) {
    let r = ripples[i];
    r.size = r.size + 6;
    r.life = r.life - 1.5;
    noFill();
    stroke(r.hue, 70, 100, r.life);
    strokeWeight(6);
    circle(r.x, r.y, r.size);
    strokeWeight(2);
    circle(r.x, r.y, r.size * 0.6);
    if (r.life <= 0) ripples.splice(i, 1);
  }

  // ---- 鍵盤 ----
  let w = width / 8;
  for (let i = 0; i < 8; i++) {
    stroke(0, 0, 20);
    strokeWeight(2);
    fill(i * 45, glow[i], 100); // 押すと色がつく
    rect(i * w, height - 120, w, 120, 8);
    noStroke();
    fill(0, 0, 20);
    textAlign(CENTER, CENTER);
    textSize(20);
    text(names[i], i * w + w / 2, height - 75);
    textSize(14);
    text(keyList[i].toUpperCase(), i * w + w / 2, height - 40);
    glow[i] = max(0, glow[i] - 4);
  }
}

function mousePressed() {
  startAudio(); // クリックで音の準備
}

function keyPressed() {
  startAudio();
  let i = keyList.indexOf(key.toLowerCase()); // 押したキーが何番目か
  if (i >= 0) {
    playNote(notes[i], 0.4, 0.6); // 音を鳴らす（音名, 大きさ, 長さ）
    glow[i] = 80;
    ripples.push({
      x: (i + 0.5) * (width / 8),
      y: random(height * 0.15, height * 0.6),
      size: 0,
      hue: i * 45,
      life: 100,
    });
  }
}

// ---------- やってみよう ----------
// 1. 好きな曲を弾いてみよう（かえるのうた：ドレミファミレド）
// 2. notes を 1オクターブ下げる（C4→C3 など）とどうなる？
// 3. playNote の4つ目に 'square' を足すと音色が変わる
//    例） playNote(notes[i], 0.4, 0.6, 'square');


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

// 音を1つ鳴らす： playNote('C4', 音の大きさ 0〜1, 長さ[秒], 音色)
// 音色は 'sine' 'triangle' 'sawtooth' 'square' から選べる
function playNote(note, volume = 0.3, duration = 0.3, type = 'triangle') {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let osc = audioCtx.createOscillator();
  let amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = noteToFreq(note);
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
  let midi = n + (octave + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12); // ラ(A4) = 440Hz が基準
}
