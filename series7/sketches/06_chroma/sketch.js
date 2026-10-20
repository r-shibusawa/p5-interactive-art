// ============================================
// 06 クロマ（12 音のどれが鳴っているか）
// スペクトルを「オクターブちがいは同じ音」として 12 個に折りたたむ ＝ クロマグラム
// 歌う・楽器を鳴らすと、12 音の円のどこが光るかで、鳴っている音や和音がわかる
// クリックでマイク ON
// ============================================

let noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let chroma = new Array(12).fill(0);
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
    let c = new Array(12).fill(0);
    // ★ 各周波数ビンを、いちばん近い音名（12 で割った余り）に加える
    for (let i = 2; i < spec.length; i++) {
      let f = i * binHz;
      if (f < 80 || f > 4000) continue;
      let midi = 69 + 12 * log(f / 440) / log(2);
      let pc = ((round(midi) % 12) + 12) % 12;
      c[pc] += spec[i] * spec[i];
    }
    let m = max(...c) || 1;
    for (let i = 0; i < 12; i++) chroma[i] = lerp(chroma[i], c[i] / m, 0.3);
    history.push(chroma.slice());
    if (history.length > 120) history.shift();
  }

  // ---- 円 ----
  let cx = width * 0.33, cy = height * 0.55, r = min(width, height) * 0.3;
  for (let i = 0; i < 12; i++) {
    let a = -HALF_PI + (TWO_PI * i) / 12;
    let v = chroma[i];
    noStroke();
    fill((i * 30) % 360, 70, 30 + v * 70);
    circle(cx + cos(a) * r, cy + sin(a) * r, 40 + v * 50);
    fill(0, 0, v > 0.5 ? 10 : 90);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(noteNames[i], cx + cos(a) * r, cy + sin(a) * r);
  }
  textAlign(LEFT, BASELINE);
  // いちばん強い音
  let best = chroma.indexOf(max(...chroma));
  noStroke();
  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  textSize(72);
  text(micReady && max(...chroma) > 0.2 ? noteNames[best] : '', cx, cy);
  textAlign(LEFT, BASELINE);

  // ---- クロマグラム（時間 × 12 音）----
  let gx = width * 0.62, gw = width - gx - 60, gy = height * 0.2, gh = height * 0.6;
  for (let t = 0; t < history.length; t++) {
    for (let i = 0; i < 12; i++) {
      let v = history[t][i];
      fill((i * 30) % 360, 70, v * 100);
      rect(gx + (t / 120) * gw, gy + gh - (i + 1) * (gh / 12), gw / 120 + 1, gh / 12);
    }
  }
  fill(0, 0, 60);
  textSize(13);
  for (let i = 0; i < 12; i++) text(noteNames[i], gx - 24, gy + gh - i * (gh / 12) - 4);
  text('クロマグラム（横：時間、縦：12 音）', gx, gy - 12);

  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '歌う・楽器を鳴らす → 鳴っている音が光る。和音なら複数が光る' : 'クリックしてマイクを ON にしよう', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('C3 も C4 も C5 も、全部「C」に足す（オクターブを折りたたむ）。コード認識・キー推定（→ 13）の材料になる', 20, 68);
}

function mousePressed() {
  startMic();
}

// ---------- やってみよう ----------
// 1. 「ド」を歌う → C が光る。倍音のせいで G や E も少し光る（なぜ？）
// 2. ピアノやギターで和音を弾く → 3 つ光る。長三和音と短三和音の形の違い
// 3. 好きな曲を流して、クロマグラムの縞の変化（コード進行）を見る


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
    analyser.fftSize = 4096;
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
  if (!micReady) return new Array(2048).fill(0);
  analyser.getByteFrequencyData(spectrumData);
  return spectrumData;
}
