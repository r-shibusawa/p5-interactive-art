// ============================================
// 04 ビート検出（音楽のテンポをコンピュータが聞き取る）
// 音量が急に増える瞬間（オンセット）を見つけ、その間隔からテンポ（BPM）を推定する
// スマホで音楽を流す、手を叩く、机をたたく → 光が点滅し、BPM が出る
// クリックでマイク ON / マウス左右 = 感度
// ============================================

let energyHist = []; // 音量の履歴
let onsets = []; // 音が立ち上がった時刻
let bpm = 0;
let flash = 0;
let lastOnset = 0;
let sensitivity = 1.5;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(260, 40, 8);
  sensitivity = map(mouseX, 0, width, 1.1, 3, true);
  let e = getMicLevel();
  energyHist.push(e);
  if (energyHist.length > 300) energyHist.shift();

  // ★ オンセット検出：直近の平均より sensitivity 倍以上大きく、前回から 0.15 秒以上たっていたら
  let recent = energyHist.slice(-30, -1);
  let avg = recent.reduce((a, b) => a + b, 0) / max(recent.length, 1);
  let now = millis();
  if (e > avg * sensitivity && e > 0.02 && now - lastOnset > 150) {
    onsets.push(now);
    lastOnset = now;
    flash = 1;
    if (onsets.length > 16) onsets.shift();
    estimateBpm();
  }
  flash *= 0.85;

  // ---- 光 ----
  noStroke();
  fill(45, 90, 100, flash * 100);
  circle(width / 2, height * 0.42, 200 + flash * 200);
  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  textSize(120);
  text(bpm > 0 ? round(bpm) : '--', width / 2, height * 0.42);
  textSize(28);
  text('BPM', width / 2, height * 0.42 + 90);
  textAlign(LEFT, BASELINE);

  // ---- 音量の波形とオンセット ----
  let base = height * 0.85, h = height * 0.2;
  stroke(0, 0, 30);
  line(0, base, width, base);
  noFill();
  stroke(170, 70, 100);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < energyHist.length; i++) vertex(map(i, 0, 300, 0, width), base - min(energyHist[i], 0.5) * h * 2);
  endShape();
  // オンセットの縦線
  stroke(45, 90, 100);
  for (let t of onsets) {
    let age = (now - t) / 1000; // 秒
    let x = width - age * (width / 5); // 画面幅 = 5 秒
    if (x > 0) line(x, base, x, base - h);
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '手を叩く・音楽を流す → 立ち上がりを検出してテンポを推定　感度 ' + nf(sensitivity, 1, 1) + '（マウス左右）' : 'クリックしてマイクを ON にしよう', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('黄の線 = 検出した拍。間隔の中央値から BPM = 60 ÷ 間隔（秒）。曲のテンポが 2 倍・半分に出ることもある（オクターブ誤り）', 20, 68);
}

// ★ 間隔の中央値からテンポを求める（外れ値に強い）
function estimateBpm() {
  if (onsets.length < 4) return;
  let gaps = [];
  for (let i = 1; i < onsets.length; i++) gaps.push(onsets[i] - onsets[i - 1]);
  gaps.sort((a, b) => a - b);
  let median = gaps[floor(gaps.length / 2)] / 1000;
  let b = 60 / median;
  while (b > 200) b /= 2; // 速すぎたら半分に
  while (b < 50) b *= 2;
  bpm = bpm === 0 ? b : lerp(bpm, b, 0.3);
}

function mousePressed() {
  startMic();
}

// ---------- やってみよう ----------
// 1. メトロノーム（スマホアプリ）を 120 BPM で鳴らして、120 と出るか試す
// 2. 自分で手を叩いて、一定のテンポを保てるか（BPM の表示が安定するか）
// 3. 間隔の「中央値」を「平均」にするとどうなる？（1 回の誤検出で大きくずれる）


// ==================================================
// ここから下は「マイクを使うための道具」です
// ==================================================
let audioCtx, analyser, waveData, spectrumData;
let micReady = false;
function startMic() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);
    waveData = new Float32Array(analyser.fftSize);
    spectrumData = new Uint8Array(analyser.frequencyBinCount);
    micReady = true;
  }).catch((err) => { console.log('マイクが使えません：' + err); audioCtx = null; });
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
