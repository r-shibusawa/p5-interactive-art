// ============================================
// 15 うなり（おまけ）
// 周波数がほんの少しちがう 2 つの音を同時に鳴らすと、「ワンワンワン」と大きさがゆれる
// ゆれの速さ = 2つの周波数の差。ギターのチューニングはこれを使う
// マウス左右 = 2つ目の周波数（440 ± 20 Hz） / クリックで音 ON/OFF
// ============================================

let f1 = 440, f2 = 443;
let phase = 0;
let playing = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 40, 10);
  f2 = map(mouseX, 0, width, 420, 460, true);
  if (playing) {
    osc2.frequency.setTargetAtTime(f2, audioCtx.currentTime, 0.02);
  }
  phase += 0.5;

  let left = 60, right = width - 60;
  let secondsOnScreen = 1.0; // 画面の横幅 = 1 秒

  // 2つの波（上、うすく）
  for (let [f, mid, hue] of [[f1, height * 0.22, 170], [f2, height * 0.38, 40]]) {
    noFill();
    stroke(hue, 70, 100, 60);
    strokeWeight(1.5);
    beginShape();
    for (let x = left; x <= right; x += 1) {
      let t = ((x - left) / (right - left)) * secondsOnScreen;
      vertex(x, mid - sin(TWO_PI * f * t + phase) * height * 0.06);
    }
    endShape();
    noStroke();
    fill(hue, 70, 100);
    textSize(14);
    text(nf(f, 1, 1) + ' Hz', left, mid - height * 0.07);
  }

  // 足した波（下、大きく）＝ うなり
  let mid = height * 0.7, h = height * 0.2;
  stroke(0, 0, 30);
  line(left, mid, right, mid);
  noFill();
  stroke(0, 0, 100);
  strokeWeight(1);
  beginShape();
  for (let x = left; x <= right; x += 1) {
    let t = ((x - left) / (right - left)) * secondsOnScreen;
    let v = (sin(TWO_PI * f1 * t + phase) + sin(TWO_PI * f2 * t + phase)) / 2; // ★ 足し算
    vertex(x, mid - v * h);
  }
  endShape();
  // 包絡線（大きさのゆれ）
  stroke(0, 90, 100);
  strokeWeight(3);
  for (let sgn of [1, -1]) {
    beginShape();
    for (let x = left; x <= right; x += 2) {
      let t = ((x - left) / (right - left)) * secondsOnScreen;
      vertex(x, mid - sgn * abs(cos(PI * (f2 - f1) * t + phase / 2)) * h);
    }
    endShape();
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('f1 = 440 Hz　f2 = ' + nf(f2, 1, 1) + ' Hz（マウス左右）　→ うなりは 1秒に ' + nf(abs(f2 - f1), 1, 1) + ' 回　クリックで音 ' + (playing ? 'ON' : 'OFF'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('赤 = 大きさのゆれ（包絡線）。差が 0 に近づくほどゆっくりになり、ぴったり合うと消える', 20, 68);
}

function mousePressed() {
  startAudio();
  playing = !playing;
  gainNode.gain.setTargetAtTime(playing ? 0.15 : 0, audioCtx.currentTime, 0.03);
}

// ---------- やってみよう ----------
// 1. f2 を 440 にぴったり合わせて、うなりを消そう（チューニング！）
// 2. 差を 20 Hz にすると、うなりは速すぎて「ざらざらした音」に聞こえる
// 3. 3つの音を鳴らすと、うなりはどうなる？


// ==================================================
// ここから下は「音を鳴らすための道具」（2つの正弦波を同時に鳴らす）
// ==================================================
let audioCtx, osc1, osc2, gainNode;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);
    osc1 = audioCtx.createOscillator();
    osc1.frequency.value = f1;
    osc2 = audioCtx.createOscillator();
    osc2.frequency.value = f2;
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    osc1.start();
    osc2.start();
  }
  audioCtx.resume();
}
