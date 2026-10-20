// ============================================
// 00 正弦波（サイン波）を見る・聞く
// すべての音・信号のもとになる、いちばん単純な波
// マウス左右 = 周波数（高さ） / 上下 = 振幅（大きさ） / クリックで音 ON/OFF
// ============================================

let freq = 440; // 周波数（Hz：1秒間に何回ゆれるか）
let amp = 0.5; // 振幅（0〜1）
let phase = 0; // 波の進み具合
let playing = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 40, 10);
  freq = map(mouseX, 0, width, 100, 1000, true);
  amp = map(mouseY, 0, height, 1, 0.05, true);
  if (playing) setTone(freq, amp * 0.3);

  // ---- 波を描く ----
  // 画面の横幅 = 20ミリ秒 ぶんの時間
  let msPerScreen = 20;
  phase += 0.02; // 少しずつ流れる
  stroke(170, 80, 100);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let x = 0; x < width; x++) {
    let t = (x / width) * (msPerScreen / 1000); // 秒
    // ★ 正弦波の式： y = 振幅 × sin(2π × 周波数 × 時間)
    let y = amp * sin(TWO_PI * freq * t + phase);
    vertex(x, height / 2 - y * height * 0.35);
  }
  endShape();

  // 中心線
  stroke(0, 0, 30);
  strokeWeight(1);
  line(0, height / 2, width, height / 2);

  // 1周期の長さを示す
  let periodPx = (1 / freq / (msPerScreen / 1000)) * width;
  stroke(40, 90, 100);
  strokeWeight(2);
  line(60, height * 0.85, 60 + periodPx, height * 0.85);
  noStroke();
  fill(40, 90, 100);
  textSize(16);
  text('1周期 = ' + nf(1000 / freq, 1, 2) + ' ms', 60, height * 0.85 - 10);

  fill(0, 0, 100);
  textSize(18);
  text('y = ' + nf(amp, 1, 2) + ' × sin(2π × ' + round(freq) + ' × t)　　周波数 ' + round(freq) + ' Hz（左右）　振幅 ' + nf(amp, 1, 2) + '（上下）　クリックで音 ' + (playing ? 'ON' : 'OFF'), 20, 40);
}

function mousePressed() {
  startAudio();
  playing = !playing;
  if (!playing) setTone(freq, 0);
}

// ---------- やってみよう ----------
// 1. 周波数を 2倍にすると、1周期の長さは？（音は1オクターブ上がる）
// 2. 人の耳が聞こえるのは 20〜20000 Hz。範囲を変えて試そう
// 3. sin を「sin(…) > 0 ? 1 : -1」にすると矩形波。音はどう変わる？


// ==================================================
// ここから下は「音を鳴らすための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, osc, gainNode;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    osc = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
  }
  audioCtx.resume();
}

// 音の高さ（Hz）と大きさ（0〜1）を変える
function setTone(f, volume) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  osc.frequency.setTargetAtTime(f, t, 0.02);
  gainNode.gain.setTargetAtTime(volume, t, 0.03);
}
