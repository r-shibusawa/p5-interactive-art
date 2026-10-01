// ============================================
// 07 音の出るボール
// クリックするとボールが落ちて、床で跳ねるたびに音が鳴る
// 左ほど低い音、右ほど高い音
// ============================================

let balls = [];

// ペンタトニック・スケール（どの音を組み合わせてもきれいに聞こえる音階）
let notes = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 12, 40);

  // ---- 床（音のゾーン）を描く ----
  let zoneW = width / notes.length;
  for (let i = 0; i < notes.length; i++) {
    noStroke();
    fill(i * 30, 60, 50);
    rect(i * zoneW, height - 30, zoneW - 2, 30);
    fill(0, 0, 100);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(notes[i], i * zoneW + zoneW / 2, height - 15);
  }

  // ---- ボールを動かす ----
  for (let b of balls) {
    b.vy = b.vy + 0.5; // 重力
    b.y = b.y + b.vy;

    // 床にぶつかったら跳ね返る
    let floor = height - 30 - b.r;
    if (b.y > floor) {
      b.y = floor;
      if (abs(b.vy) > 2) {
        // ぶつかった強さで音の大きさを決める
        let volume = map(abs(b.vy), 0, 25, 0.05, 0.5, true);
        playNote(b.note, volume, 0.4); // 音を鳴らす（音名, 大きさ, 長さ）
        b.flash = 100; // 光らせる
      }
      b.vy = b.vy * -0.85; // 跳ね返り（少しずつ弱くなる）
    }

    // ボールを描く
    noStroke();
    fill(b.hue, 70, 100);
    circle(b.x, b.y, b.r * 2);

    // ぶつかった瞬間に光の輪を出す
    if (b.flash > 0) {
      noFill();
      stroke(b.hue, 50, 100, b.flash);
      strokeWeight(4);
      circle(b.x, b.y, b.r * 2 + (100 - b.flash));
      b.flash = b.flash - 5;
    }
  }

  // ボールが多すぎたら古いものから消す
  if (balls.length > 25) {
    balls.shift();
  }

  // ---- 説明 ----
  noStroke();
  fill(0, 0, 100);
  textAlign(LEFT, TOP);
  textSize(16);
  text('クリックでボールを落とそう！', 20, 20);
}

function mousePressed() {
  startAudio(); // ブラウザで音を出すために必要（クリックのときに呼ぶ）

  // マウスの x 位置で音の高さを決める
  let i = floor(map(mouseX, 0, width, 0, notes.length));
  i = constrain(i, 0, notes.length - 1);
  balls.push({
    x: mouseX,
    y: mouseY,
    vy: 0,
    r: random(15, 35),
    note: notes[i],
    hue: i * 30,
    flash: 0,
  });
}

// ---------- やってみよう ----------
// 1. 跳ね返り -0.85 を -1 にすると？（ずっと跳ね続ける）
// 2. 重力 0.5 を 0.2 にすると、ふんわり跳ねる
// 3. notes の中身を変えて、別の音階にしてみよう
//    例） ['C4', 'E4', 'G4', 'B4', 'C5'] など


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
