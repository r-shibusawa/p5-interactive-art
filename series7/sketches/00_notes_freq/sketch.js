// ============================================
// 00 音の高さと周波数（ピアノの鍵盤）
// 鍵盤を 1 つ右に進むと、周波数は 2 の 12 乗根（約 1.0595）倍。12 個進むと 2 倍（1 オクターブ）
// 鍵盤をクリックして音を鳴らす / キーボード A S D F G H J K でも
// ============================================

let keyChars = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k'];
let names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C'];
let lastNote = -1;
let lastTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 半音の番号（A4 = 69）→ 周波数
function midiToFreq(m) {
  return 440 * pow(2, (m - 69) / 12);
}

function draw() {
  background(230, 40, 10);
  let whiteW = min(110, (width - 100) / 8);
  let x0 = (width - whiteW * 8) / 2, y0 = height * 0.4, h = height * 0.4;
  let isBlack = [false, true, false, true, false, false, true, false, true, false, true, false, false];

  // 白鍵
  let wi = 0;
  let positions = [];
  for (let i = 0; i < 13; i++) {
    if (!isBlack[i]) {
      let x = x0 + wi * whiteW;
      positions[i] = x + whiteW / 2;
      let on = lastNote === i && millis() - lastTime < 300;
      stroke(0, 0, 20);
      fill(on ? 45 : 0, on ? 90 : 0, on ? 100 : 95);
      rect(x, y0, whiteW, h, 0, 0, 8, 8);
      noStroke();
      fill(0, 0, 30);
      textAlign(CENTER);
      textSize(16);
      text(names[i] + (i === 12 ? '5' : '4'), x + whiteW / 2, y0 + h - 40);
      text(round(midiToFreq(60 + i)) + ' Hz', x + whiteW / 2, y0 + h - 16);
      textSize(13);
      fill(0, 0, 55);
      text(keyChars[i].toUpperCase(), x + whiteW / 2, y0 + h - 64);
      wi++;
    }
  }
  // 黒鍵
  wi = 0;
  for (let i = 0; i < 13; i++) {
    if (!isBlack[i]) wi++;
    else {
      let x = x0 + wi * whiteW - whiteW * 0.3;
      positions[i] = x + whiteW * 0.3;
      let on = lastNote === i && millis() - lastTime < 300;
      noStroke();
      fill(on ? 45 : 0, on ? 90 : 0, on ? 100 : 12);
      rect(x, y0, whiteW * 0.6, h * 0.6, 0, 0, 6, 6);
      fill(0, 0, 70);
      textAlign(CENTER);
      textSize(12);
      text(names[i], x + whiteW * 0.3, y0 + h * 0.6 - 30);
      text(round(midiToFreq(60 + i)), x + whiteW * 0.3, y0 + h * 0.6 - 12);
      text(keyChars[i].toUpperCase(), x + whiteW * 0.3, y0 + h * 0.6 - 48);
    }
  }
  textAlign(LEFT);

  // 周波数の対数グラフ
  let gy = height * 0.3;
  stroke(0, 0, 30);
  line(x0, gy, x0 + whiteW * 8, gy);
  for (let i = 0; i < 13; i++) {
    let f = midiToFreq(60 + i);
    let bh = map(f, 261, 523, 20, 100);
    noStroke();
    fill(isBlack[i] ? 0 : 170, isBlack[i] ? 0 : 60, isBlack[i] ? 40 : 100);
    rect(positions[i] - 8, gy - bh, 16, bh);
  }
  fill(0, 0, 60);
  textSize(13);
  text('周波数（1 鍵ごとに ×1.0595。棒の高さが等比で伸びる）', x0, gy - 110);

  fill(0, 0, 100);
  textSize(18);
  text('鍵盤をクリック、または A W S E D F T G Y H U J K キー　　f = 440 × 2^((n − 69) / 12)　　ド(C4) = 261.6 Hz、ラ(A4) = 440 Hz、ド(C5) = 523.3 Hz', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('1 オクターブ上 = 周波数 2 倍。12 等分するので 1 半音 = 2^(1/12) 倍（平均律）。人の耳は「倍率」で高さを感じる', 20, 68);
}

function play(i) {
  startAudio();
  lastNote = i;
  lastTime = millis();
  playNote(midiToFreq(60 + i), 0.3, 0.8, 'triangle');
}

function mousePressed() {
  let whiteW = min(110, (width - 100) / 8);
  let x0 = (width - whiteW * 8) / 2, y0 = height * 0.4, h = height * 0.4;
  if (mouseY < y0 || mouseY > y0 + h) return;
  let isBlack = [false, true, false, true, false, false, true, false, true, false, true, false, false];
  // 黒鍵を優先して判定
  let wi = 0;
  for (let i = 0; i < 13; i++) {
    if (!isBlack[i]) wi++;
    else {
      let x = x0 + wi * whiteW - whiteW * 0.3;
      if (mouseX > x && mouseX < x + whiteW * 0.6 && mouseY < y0 + h * 0.6) return play(i);
    }
  }
  wi = 0;
  for (let i = 0; i < 13; i++) {
    if (!isBlack[i]) {
      let x = x0 + wi * whiteW;
      if (mouseX > x && mouseX < x + whiteW) return play(i);
      wi++;
    }
  }
}
function keyPressed() {
  let i = keyChars.indexOf(key.toLowerCase());
  if (i >= 0) play(i);
}

// ---------- やってみよう ----------
// 1. C4 と C5 の周波数を比べよう（ぴったり 2 倍）
// 2. 「ドレミファソラシド」を弾いて、周波数の増え方を見る（等間隔ではなく等倍）
// 3. 60 を 48 にすると 1 オクターブ下。 72 にすると上


// ==================================================
// ここから下は「音を鳴らすための道具」です
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
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp);
  amp.connect(masterOut);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}
