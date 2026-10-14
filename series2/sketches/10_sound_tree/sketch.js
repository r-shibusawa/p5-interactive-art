// ============================================
// 10 声で育つ木
// 声の大きさで枝が開き、色が変わり、大声で花が咲く
// クリックでマイク ON
// ============================================

let vol = 0; // なめらかにした音量
let bloom = 0; // 花の咲き具合（0〜1）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 40, 10);

  // 音量を取って、なめらかにする
  vol = lerp(vol, getMicLevel(), 0.2);
  let open = map(vol, 0, 0.25, 0, 1, true); // 0〜1

  // 大声が続くと花が咲き、静かになるとしぼむ
  bloom = lerp(bloom, open > 0.5 ? 1 : 0, 0.05);

  let angle = map(open, 0, 1, 0.15, 0.9); // 枝の開く角度
  let sway = (noise(frameCount * 0.01) - 0.5) * 0.2 * open; // 大声でゆれる

  translate(width / 2, height);
  rotate(sway);
  branch(height * 0.26, angle, 0);

  resetMatrix();
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '声を出すと枝が開く。大きな声を続けると花が咲く！' : 'クリックしてマイクを ON にしよう', 20, 30);
}

function branch(len, angle, depth) {
  strokeWeight(map(depth, 0, 9, 14, 1, true));
  // 静か = 青っぽい、うるさい = 暖かい色
  stroke(map(vol, 0, 0.25, 200, 20, true), 60, map(depth, 0, 9, 50, 100));
  line(0, 0, 0, -len);
  translate(0, -len);

  if (len < 8) {
    if (bloom > 0.05) {
      noStroke();
      fill(340 + depth * 5, 60, 100, bloom * 90);
      circle(0, 0, 6 + bloom * 14 + vol * 60);
    }
    return;
  }
  push();
  rotate(angle);
  branch(len * 0.7, angle, depth + 1);
  pop();
  push();
  rotate(-angle * 0.8);
  branch(len * 0.7, angle, depth + 1);
  pop();
}

function mousePressed() {
  startMic();
}

// ---------- やってみよう ----------
// 1. 0.25（どのくらいの声で最大になるか）を変えて感度を調整しよう
// 2. 枝の縮む割合 0.7 を、音量で変えてみよう
// 3. 高い声と低い声で色を変えたい → getSpectrum() を使ってみよう


// ==================================================
// ここから下は「マイクを使うための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, analyser, waveData, spectrumData;
let micReady = false; // マイクの準備ができたら true

// マイクを ON にする（クリックしたときに呼ぶ）
function startMic() {
  if (audioCtx) return; // もう ON なら何もしない
  audioCtx = new AudioContext();
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      let source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser(); // 音を調べる装置
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8; // なめらかさ
      source.connect(analyser);
      waveData = new Float32Array(analyser.fftSize);
      spectrumData = new Uint8Array(analyser.frequencyBinCount);
      micReady = true;
    })
    .catch((err) => {
      console.log('マイクが使えません。ブラウザでマイクを「許可」してください：' + err);
      audioCtx = null;
    });
}

// 今の音量（0〜1。ふつうの声で 0.05〜0.2 くらい）
function getMicLevel() {
  if (!micReady) return 0;
  analyser.getFloatTimeDomainData(waveData);
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) {
    sum += waveData[i] * waveData[i];
  }
  return Math.sqrt(sum / waveData.length);
}

// 低い音〜高い音、それぞれの強さ（0〜255）が入った配列（256個）
function getSpectrum() {
  if (!micReady) return new Array(256).fill(0);
  analyser.getByteFrequencyData(spectrumData);
  return spectrumData;
}
