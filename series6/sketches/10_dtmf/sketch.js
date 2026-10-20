// ============================================
// 10 プッシュホンの音（DTMF）
// 電話のボタンを押すと「ピ・ポ・パ」。実は 2 つの周波数の和。
// 行と列で周波数が決まっていて、受信側はスペクトルの 2 つの山で「どのボタンか」を知る
// 画面のボタンをクリック（音が鳴る＋スペクトル表示）
// ============================================

let rowsF = [697, 770, 852, 941];
let colsF = [1209, 1336, 1477, 1633];
let labels = [['1', '2', '3', 'A'], ['4', '5', '6', 'B'], ['7', '8', '9', 'C'], ['*', '0', '#', 'D']];
let pressed = null;
let pressTime = 0;
let dialed = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  let bx = 80, by = 120, bs = min(90, (height - 260) / 4);

  // ---- ボタン ----
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let on = pressed && pressed[0] === r && pressed[1] === c && millis() - pressTime < 300;
      noStroke();
      fill(on ? 45 : 230, on ? 90 : 30, on ? 100 : 30);
      rect(bx + c * (bs + 10), by + r * (bs + 10), bs, bs, 12);
      fill(0, 0, on ? 10 : 90);
      textAlign(CENTER, CENTER);
      textSize(28);
      text(labels[r][c], bx + c * (bs + 10) + bs / 2, by + r * (bs + 10) + bs / 2);
      textAlign(LEFT, BASELINE);
    }
  }
  // 周波数のラベル
  noStroke();
  fill(0, 0, 60);
  textSize(13);
  for (let r = 0; r < 4; r++) text(rowsF[r] + ' Hz', bx - 70, by + r * (bs + 10) + bs / 2 + 4);
  for (let c = 0; c < 4; c++) text(colsF[c], bx + c * (bs + 10) + bs / 2 - 14, by - 12);

  // ---- スペクトル ----
  let sl = bx + 4 * (bs + 10) + 60, sr = width - 60, base = height - 100, sh = height * 0.5;
  stroke(0, 0, 30);
  line(sl, base, sr, base);
  if (analyser) {
    analyser.getByteFrequencyData(specData);
    noFill();
    stroke(170, 80, 100);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < specData.length; i++) {
      let f = (i * audioCtx.sampleRate) / 2 / specData.length;
      if (f > 2000) break;
      vertex(map(f, 0, 2000, sl, sr), base - (specData[i] / 255) * sh);
    }
    endShape();
  }
  noStroke();
  fill(0, 0, 60);
  for (let f of rowsF.concat(colsF)) {
    let x = map(f, 0, 2000, sl, sr);
    stroke(0, 0, 25);
    line(x, base, x, base - sh);
    noStroke();
    text(f, x - 14, base + 18);
  }
  text('スペクトル（0〜2000 Hz）', sl, base - sh - 14);

  fill(0, 0, 100);
  textSize(18);
  text('ボタンをクリック → 2 つの周波数（行 ＋ 列）が同時に鳴る　ダイヤル: ' + dialed, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('例：5 = 770 Hz + 1336 Hz。受信側は 2 つの山の位置を見て、どのボタンか判定する（周波数多重）', 20, 68);
}

function mousePressed() {
  startAudio();
  let bx = 80, by = 120, bs = min(90, (height - 260) / 4);
  let c = floor((mouseX - bx) / (bs + 10)), r = floor((mouseY - by) / (bs + 10));
  if (r >= 0 && r < 4 && c >= 0 && c < 4) {
    pressed = [r, c];
    pressTime = millis();
    dialed = (dialed + labels[r][c]).slice(-16);
    playTone(rowsF[r], colsF[c]);
  }
}

// ---------- やってみよう ----------
// 1. 電話機（スマホの通話画面）のボタンの音と聞き比べよう。同じ音！
// 2. 「1」と「2」は行が同じ → 低い方の山は同じ位置、高い方だけ動く
// 3. なぜ 1 つの周波数ではなく 2 つ使う？（声や雑音で誤って反応しないため）


// ==================================================
// ここから下は「音を鳴らすための道具」（2 つの正弦波を 0.25 秒鳴らす ＋ 分析）
// ==================================================
let audioCtx, analyser, specData;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;
    specData = new Uint8Array(analyser.frequencyBinCount);
    analyser.connect(audioCtx.destination);
  }
  audioCtx.resume();
}

function playTone(f1, f2) {
  let t = audioCtx.currentTime;
  for (let f of [f1, f2]) {
    let o = audioCtx.createOscillator();
    let g = audioCtx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.15, t);
    g.gain.setTargetAtTime(0, t + 0.2, 0.03);
    o.connect(g);
    g.connect(analyser);
    o.start(t);
    o.stop(t + 0.4);
  }
}
