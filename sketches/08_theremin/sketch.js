// ============================================
// 08 テルミン（マウスで演奏する電子楽器）
// マウスを押している間だけ音が鳴る
// 左右 = 音の高さ / 上下 = 音の大きさ
// 1〜4 キーで音色を変更
// ============================================

let playing = false;
let waveName = 'sine';

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(15, 15, 30);

  // マウス位置 → 周波数（音の高さ）と音量
  let freq = map(mouseX, 0, width, 100, 1200, true);
  let amp = map(mouseY, 0, height, 0.6, 0, true);

  if (playing) {
    setTone(freq, amp); // 音の高さと大きさを変える
  }

  // ---- 音の波形を描く ----
  let wave = getWaveform(); // 今鳴っている音の波の形（-1〜1 の数の配列）
  noFill();
  stroke(0, 255, 200);
  strokeWeight(4);
  beginShape();
  for (let i = 0; i < wave.length; i++) {
    let x = map(i, 0, wave.length, 0, width);
    let y = height / 2 + wave[i] * height * 0.4;
    vertex(x, y);
  }
  endShape();

  // ---- マウスの位置に印 ----
  noStroke();
  fill(255, 80, 150, playing ? 255 : 80);
  circle(mouseX, mouseY, 30 + amp * 60);

  // ---- 説明 ----
  fill(255);
  textSize(16);
  text('押している間だけ音が鳴る  左右=高さ  上下=大きさ', 20, 30);
  text('1:sine  2:triangle  3:sawtooth  4:square   いまの音色 → ' + waveName, 20, 55);
  text(round(freq) + ' Hz', 20, 80);
}

function mousePressed() {
  startAudio(); // ブラウザで音を出すために必要
  playing = true;
}

function mouseReleased() {
  setTone(0, 0); // 音量を 0 にする
  playing = false;
}

function keyPressed() {
  if (key === '1') waveName = 'sine';
  if (key === '2') waveName = 'triangle';
  if (key === '3') waveName = 'sawtooth';
  if (key === '4') waveName = 'square';
  setWaveType(waveName);
}

// ---------- やってみよう ----------
// 1. 音色を 1〜4 で切り替えて、波の形と音の違いを比べよう
// 2. 周波数の範囲 100〜1200 を変えてみよう（人の耳は約20〜20000Hz）
// 3. 波形の線の色を、音の高さで変えてみよう


// ==================================================
// ここから下は「音を鳴らすための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, osc, amp, analyser, waveData;

// 音を出す準備（クリックしたときに呼ぶ）
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    osc = audioCtx.createOscillator(); // オシレーター＝音の波をつくる装置
    amp = audioCtx.createGain(); // 音量を調整する装置
    analyser = audioCtx.createAnalyser(); // 波の形を調べる装置
    analyser.fftSize = 1024;
    waveData = new Float32Array(analyser.fftSize);
    amp.gain.value = 0;
    osc.connect(amp);
    amp.connect(analyser);
    analyser.connect(audioCtx.destination);
    osc.type = waveName;
    osc.start();
  }
  audioCtx.resume();
}

// 音の高さ（Hz）と大きさ（0〜1）を変える。高さ 0 なら高さはそのまま
function setTone(freq, volume) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  if (freq > 0) osc.frequency.setTargetAtTime(freq, t, 0.02);
  amp.gain.setTargetAtTime(volume, t, volume > 0 ? 0.02 : 0.1);
}

// 音色を変える： 'sine' 'triangle' 'sawtooth' 'square'
function setWaveType(type) {
  if (osc) osc.type = type;
}

// 今の音の波の形（-1〜1 の数がたくさん入った配列）
function getWaveform() {
  if (!audioCtx) return new Array(512).fill(0);
  analyser.getFloatTimeDomainData(waveData);
  return waveData;
}
