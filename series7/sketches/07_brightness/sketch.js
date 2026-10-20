// ============================================
// 07 音の「明るさ」を測る（スペクトル重心）
// スペクトルの「重心」が高いほど明るい音、低いほど暗い音。
// 「あ」と「う」、シンバルとドラム、笛と太鼓。音色を数字 1 つで表す特徴量
// クリックでマイク ON
// ============================================

let centroid = 0; // スペクトル重心（Hz）
let flatness = 0; // 平坦さ（雑音っぽさ 0〜1）
let history = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(260, 40, 10);
  if (micReady) {
    let spec = getSpectrum();
    let binHz = audioCtx.sampleRate / 2 / spec.length;
    // ★ スペクトル重心 = Σ(周波数 × 強さ) ÷ Σ(強さ)
    let num = 0, den = 0, logSum = 0, lin = 0, cnt = 0;
    for (let i = 1; i < spec.length; i++) {
      let f = i * binHz, m = spec[i] / 255;
      num += f * m;
      den += m;
      if (f < 8000) {
        logSum += log(m + 1e-4);
        lin += m + 1e-4;
        cnt++;
      }
    }
    if (den > 2) {
      centroid = lerp(centroid, num / den, 0.2);
      // ★ 平坦さ = 幾何平均 ÷ 算術平均（1 に近いほどノイズ、0 に近いほど「音程がある」）
      flatness = lerp(flatness, exp(logSum / cnt) / (lin / cnt), 0.2);
    }
    history.push(centroid);
    if (history.length > 200) history.shift();

    // スペクトルと重心
    let base = height * 0.8, sh = height * 0.3;
    noFill();
    stroke(170, 70, 100);
    strokeWeight(2);
    beginShape();
    for (let i = 1; i < spec.length; i++) {
      let f = i * binHz;
      if (f > 8000) break;
      vertex(map(f, 0, 8000, 60, width - 60), base - (spec[i] / 255) * sh);
    }
    endShape();
    let cxp = map(centroid, 0, 8000, 60, width - 60);
    stroke(45, 90, 100);
    strokeWeight(4);
    line(cxp, base, cxp, base - sh);
    noStroke();
    fill(45, 90, 100);
    textSize(16);
    text('重心 ' + round(centroid) + ' Hz', cxp + 8, base - sh + 20);
  }

  // メーター
  let bright = constrain(map(centroid, 300, 4000, 0, 1), 0, 1);
  noStroke();
  fill(map(bright, 0, 1, 230, 50), 70, 40 + bright * 60);
  rect(60, height * 0.2, (width - 120) * bright, 40, 20);
  fill(0, 0, 100);
  textSize(20);
  text('暗い ←　明るさ　→ 明るい', 60, height * 0.2 - 12);
  fill(0, 0, 60);
  textSize(16);
  text('雑音っぽさ（平坦さ） ' + nf(flatness, 1, 2) + '　　' + (flatness > 0.4 ? 'ノイズ・打楽器・「す」の音' : flatness > 0.15 ? 'まざった音' : '音程のある音・母音'), 60, height * 0.2 + 70);

  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '「あ」「い」「う」、口笛、「す〜」、手を叩く。明るさと雑音っぽさがどう変わる？' : 'クリックしてマイクを ON にしよう', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('音色を数で表す「特徴量」。音楽の自動タグ付け・楽器の識別・曲の似ている度の計算に使われる', 20, 68);
}

function mousePressed() {
  startMic();
}

// ---------- やってみよう ----------
// 1. 「う」と「い」で重心を比べる（「い」は 2000 Hz 以上に成分がある）
// 2. 「す〜」は雑音っぽさがほぼ 1。「あ〜」は 0 に近い
// 3. 明るさ・雑音っぽさの 2 つで、音を 2 次元に並べる（12 の自由制作で）


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
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
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
  if (!micReady) return new Array(1024).fill(0);
  analyser.getByteFrequencyData(spectrumData);
  return spectrumData;
}
