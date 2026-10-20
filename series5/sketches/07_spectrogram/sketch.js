// ============================================
// 07 スペクトログラム（声の指紋）
// 横 = 時間、縦 = 周波数、色 = 強さ。声や音楽を「周波数の地図」として見る
// 母音ごとにちがう縞（フォルマント）、口笛は細い1本線、拍手は縦の帯
// クリックでマイク ON / 1・2 で縦軸の範囲
// ============================================

let layer;
let maxBin = 128; // 表示する周波数の範囲（256 まで）
let x = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layer = createGraphics(width, height - 60);
  layer.colorMode(HSB, 360, 100, 100, 100);
  layer.background(0, 0, 5);
}

function draw() {
  background(0, 0, 5);
  if (micReady) {
    let spec = getSpectrum(); // 256 個の周波数ごとの強さ（0〜255）
    let gh = layer.height;
    // 1列ぶん描く（時間が右へ進む）
    for (let i = 0; i < maxBin; i++) {
      let v = spec[i] / 255;
      let y = map(i, 0, maxBin, gh, 0);
      let binH = gh / maxBin + 1;
      layer.noStroke();
      layer.fill(map(v, 0, 1, 240, 0), 80, v * 100); // 青 → 赤
      layer.rect(x, y - binH, 3, binH);
    }
    x = (x + 3) % layer.width;
    // 再生位置の線
    layer.stroke(0, 0, 100);
    layer.line(x + 3, 0, x + 3, gh);
    layer.noStroke();
    layer.fill(0, 0, 5);
    layer.rect(x + 4, 0, 6, gh);
  }
  image(layer, 0, 60);

  // 周波数の目盛（1 bin ≈ 86 Hz）
  noStroke();
  fill(0, 0, 100);
  textSize(13);
  for (let hz = 0; hz <= maxBin * 86; hz += 1000) {
    let y = 60 + map(hz / 86, 0, maxBin, layer.height, 0);
    text(hz + ' Hz', 6, y - 4);
  }
  textSize(18);
  text(micReady ? '話す・歌う・口笛・手を叩く、でちがう模様に　1：〜11kHz  2：〜5.5kHz' : 'クリックしてマイクを ON にしよう', 20, 40);
}

function mousePressed() {
  startMic();
}
function keyPressed() {
  if (key === '1') maxBin = 128;
  if (key === '2') maxBin = 64;
}

// ---------- やってみよう ----------
// 1. 「あ・い・う・え・お」を順に言って、縞の位置（フォルマント）の違いを見よう
// 2. 口笛を吹くと細い線。高くすると線が上に動く
// 3. 色の式を変えて、好きな配色のスペクトログラムに


// ==================================================
// ここから下は「マイクを使うための道具」です
// （中身は読まなくても OK。消さないでね）
// ==================================================
let audioCtx, analyser, waveData, spectrumData;
let micReady = false;

function startMic() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      let source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      waveData = new Float32Array(analyser.fftSize);
      spectrumData = new Uint8Array(analyser.frequencyBinCount);
      micReady = true;
    })
    .catch((err) => {
      console.log('マイクが使えません：' + err);
      audioCtx = null;
    });
}

function getMicLevel() {
  if (!micReady) return 0;
  analyser.getFloatTimeDomainData(waveData);
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) sum += waveData[i] * waveData[i];
  return Math.sqrt(sum / waveData.length);
}

function getSpectrum() {
  if (!micReady) return new Array(256).fill(0);
  analyser.getByteFrequencyData(spectrumData);
  return spectrumData;
}
