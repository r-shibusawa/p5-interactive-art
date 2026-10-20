// ============================================
// 11 チューナー（声の高さを測る）
// マイクの波形が「どのくらいの周期でくり返しているか」を自己相関で調べ、
// 周波数 → 音名（ドレミ）に変換する。楽器のチューナーと同じしくみ
// クリックでマイク ON
// ============================================

let freq = 0;
let noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let history = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  if (micReady) {
    analyser.getFloatTimeDomainData(waveData);
    let f = detectPitch(waveData, audioCtx.sampleRate);
    if (f > 0) freq = lerp(freq, f, 0.4);
    history.push(f);
    if (history.length > 200) history.shift();

    // ---- 波形 ----
    noFill();
    stroke(170, 60, 100, 60);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < waveData.length; i += 2) vertex(map(i, 0, waveData.length, 0, width), height * 0.8 + waveData[i] * height * 0.15);
    endShape();

    // ---- 音名 ----
    if (freq > 0) {
      // ★ 周波数 → 半音の番号（A4 = 440 Hz = 69 番）
      let midi = 69 + 12 * log(freq / 440) / log(2);
      let nearest = round(midi);
      let cents = (midi - nearest) * 100; // ずれ（セント：半音の 1/100）
      let name = noteNames[((nearest % 12) + 12) % 12] + (floor(nearest / 12) - 1);
      noStroke();
      fill(0, 0, 100);
      textAlign(CENTER);
      textSize(140);
      text(name, width / 2, height * 0.42);
      textSize(28);
      text(round(freq) + ' Hz', width / 2, height * 0.52);
      // ずれのメーター
      let mx = map(cents, -50, 50, width * 0.25, width * 0.75);
      stroke(0, 0, 40);
      strokeWeight(2);
      line(width * 0.25, height * 0.6, width * 0.75, height * 0.6);
      line(width / 2, height * 0.58, width / 2, height * 0.62);
      noStroke();
      fill(abs(cents) < 10 ? 120 : 40, 80, 100);
      circle(mx, height * 0.6, 24);
      textSize(16);
      text(nf(cents, 1, 0) + ' セント', mx, height * 0.6 + 40);
      textAlign(LEFT);
    }
    // 高さの履歴
    noStroke();
    for (let i = 0; i < history.length; i++) {
      if (history[i] <= 0) continue;
      let y = map(log(history[i]), log(80), log(1000), height * 0.75, height * 0.1);
      fill(40, 80, 100, 60);
      circle(map(i, 0, 200, 0, width), y, 4);
    }
  }
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '声を出す・楽器を鳴らす → 音名と Hz を表示（A4 = 440 Hz）' : 'クリックしてマイクを ON にしよう', 20, 40);
}

// ★ 自己相関で周期を見つける：波形を少しずつずらして重ね、いちばん似ている「ずれ」が周期
function detectPitch(buf, sampleRate) {
  let n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  if (sqrt(rms / n) < 0.01) return -1; // 静かすぎる
  let best = -1, bestCorr = 0;
  for (let lag = floor(sampleRate / 1000); lag < floor(sampleRate / 70); lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) corr += buf[i] * buf[i + lag];
    corr /= n - lag;
    if (corr > bestCorr) {
      bestCorr = corr;
      best = lag;
    }
  }
  if (bestCorr < 0.001) return -1;
  return sampleRate / best;
}

function mousePressed() {
  startMic();
}

// ---------- やってみよう ----------
// 1. 「あー」と言いながら、ゆっくり高くしていく。音名が C → C# → D と変わる
// 2. ハミングで A（ラ）をぴったり当てる（メーターが緑になるまで）
// 3. 低い声（70 Hz 以下）が測れない理由 → lag の範囲を変えてみよう


// ==================================================
// ここから下は「マイクを使うための道具」です
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
      analyser.fftSize = 2048;
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
