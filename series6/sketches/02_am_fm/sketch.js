// ============================================
// 02 AM と FM（波に情報を乗せる）
// 低い周波数のメッセージ（声）を、そのままでは遠くへ飛ばせない
// 高い周波数の「搬送波」の 大きさ（AM）か 周波数（FM）を、メッセージで揺らして運ぶ
// 1 = AM / 2 = FM / マウス左右 = メッセージの周波数 / クリックで音
// ============================================

let mode = 'AM';
let msgFreq = 2;
let carrierFreq = 30; // 画面内に 30 周期（本物は数百 kHz〜）
let phase = 0;
let playing = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  msgFreq = map(mouseX, 0, width, 1, 5, true);
  phase += 0.01;
  let left = 60, right = width - 60;

  let rows = [
    ['メッセージ（送りたい信号）', (t) => sin(TWO_PI * msgFreq * t + phase), 120],
    ['搬送波（高い周波数の波）', (t) => sin(TWO_PI * carrierFreq * t), 0],
    [mode === 'AM' ? 'AM：搬送波の「大きさ」をメッセージで変える' : 'FM：搬送波の「周波数」をメッセージで変える', (t) => modulate(t), 40],
  ];
  for (let i = 0; i < 3; i++) {
    let [label, fn, hue] = rows[i];
    let mid = height * (0.25 + i * 0.25), h = height * 0.09;
    stroke(0, 0, 25);
    line(left, mid, right, mid);
    noFill();
    stroke(hue, hue ? 70 : 0, hue ? 100 : 80);
    strokeWeight(i === 2 ? 2.5 : 1.5);
    beginShape();
    for (let x = left; x <= right; x++) vertex(x, mid - fn((x - left) / (right - left)) * h);
    endShape();
    if (i === 2 && mode === 'AM') {
      // 包絡線 = メッセージの形
      stroke(120, 70, 100, 60);
      strokeWeight(2);
      for (let s of [1, -1]) {
        beginShape();
        for (let x = left; x <= right; x += 3) vertex(x, mid - s * (0.6 + 0.4 * rows[0][1]((x - left) / (right - left))) * h);
        endShape();
      }
    }
    noStroke();
    fill(hue, hue ? 70 : 0, hue ? 100 : 80);
    textSize(15);
    text(label, left, mid - h - 10);
  }
  if (playing) updateSound();

  fill(0, 0, 100);
  textSize(18);
  text(mode + '（1：AM　2：FM）　メッセージの周波数 ' + nf(msgFreq, 1, 1) + '（マウス左右）　クリックで音 ' + (playing ? 'ON' : 'OFF'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('AM ラジオ（中波 500〜1600 kHz）、FM ラジオ（76〜95 MHz）。FM は雑音に強く、音がきれい', 20, 68);
}

// ★ 変調
function modulate(t) {
  let m = sin(TWO_PI * msgFreq * t + phase); // メッセージ（-1〜1）
  if (mode === 'AM') return (0.6 + 0.4 * m) * sin(TWO_PI * carrierFreq * t); // 大きさを変える
  // FM：位相の進む速さ（＝周波数）を変える。積分して位相にする
  let ph = TWO_PI * carrierFreq * t + 8 * -cos(TWO_PI * msgFreq * t + phase) / msgFreq;
  return sin(ph);
}

function keyPressed() {
  if (key === '1') mode = 'AM';
  if (key === '2') mode = 'FM';
}
function mousePressed() {
  startAudio();
  playing = !playing;
  gainNode.gain.setTargetAtTime(playing ? 0.2 : 0, audioCtx.currentTime, 0.03);
}

// ---------- やってみよう ----------
// 1. AM の出力の「輪郭」がメッセージと同じ形になっているのを確認（受信側はこの輪郭を取り出す）
// 2. FM の波が「詰まったり広がったり」しているのを見る
// 3. AM で 0.4 を 1.0 にすると（過変調）、輪郭がつぶれて受信側で歪む


// ==================================================
// ここから下は「音を鳴らすための道具」（搬送波 440 Hz を、聞こえる速さで AM/FM）
// ==================================================
let audioCtx, carrier, lfo, lfoGain, gainNode, amGain;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    carrier = audioCtx.createOscillator();
    carrier.frequency.value = 440;
    lfo = audioCtx.createOscillator(); // メッセージ役の低い周波数
    lfo.frequency.value = 2;
    lfoGain = audioCtx.createGain();
    amGain = audioCtx.createGain();
    amGain.gain.value = 0.6;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    lfo.connect(lfoGain);
    carrier.connect(amGain);
    amGain.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    carrier.start();
    lfo.start();
  }
  audioCtx.resume();
}

function updateSound() {
  lfo.frequency.setTargetAtTime(msgFreq, audioCtx.currentTime, 0.02);
  lfoGain.disconnect();
  if (mode === 'AM') {
    lfoGain.gain.value = 0.4; // 大きさを ±0.4 揺らす
    lfoGain.connect(amGain.gain);
  } else {
    lfoGain.gain.value = 150; // 周波数を ±150 Hz 揺らす
    lfoGain.connect(carrier.frequency);
  }
}
