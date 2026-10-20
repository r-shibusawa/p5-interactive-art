// ============================================
// 09 歌を楽譜にする（自動採譜）
// 声の高さを測り（シリーズ5の 11 と同じ自己相関）、半音に丸めて「音符」にする
// 録音 → 再生 で、自分の歌がピコピコ音で返ってくる
// クリックでマイク ON → スペースで録音開始・停止 → P で再生 / C で消す
// ============================================

let contour = []; // 測った高さ（MIDI 番号、小数）
let notes = []; // 丸めた音符 {midi, start, len}
let recording = false;
let playingBack = false;
let playStart = 0;
let noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(260, 40, 10);
  if (micReady && recording) {
    analyser.getFloatTimeDomainData(waveData);
    let f = detectPitch(waveData, audioCtx.sampleRate);
    contour.push(f > 0 ? 69 + 12 * log(f / 440) / log(2) : null);
    if (contour.length > 600) {
      recording = false;
      transcribe();
    }
  }

  let left = 60, right = width - 60, top = 110, bottom = height - 80;
  let Y = (m) => map(m, 48, 84, bottom, top); // C3〜C6
  // 五線風の横線（C の位置）
  for (let m = 48; m <= 84; m++) {
    stroke(0, 0, m % 12 === 0 ? 40 : 18);
    line(left, Y(m), right, Y(m));
    if (m % 12 === 0) {
      noStroke();
      fill(0, 0, 60);
      textSize(12);
      text('C' + (m / 12 - 1), left - 30, Y(m) + 4);
    }
  }
  // 測った高さ（点）
  noStroke();
  for (let i = 0; i < contour.length; i++) {
    if (contour[i] === null) continue;
    fill(170, 60, 100, 60);
    circle(map(i, 0, 600, left, right), Y(contour[i]), 4);
  }
  // 音符（四角）
  for (let n of notes) {
    let x1 = map(n.start, 0, 600, left, right), x2 = map(n.start + n.len, 0, 600, left, right);
    let active = playingBack && millis() - playStart > n.start * 33 && millis() - playStart < (n.start + n.len) * 33;
    fill(45, 90, active ? 100 : 70);
    rect(x1, Y(n.midi) - 8, max(x2 - x1, 4), 16, 4);
    if (n.len > 12) {
      fill(0, 0, 10);
      textSize(11);
      text(noteNames[n.midi % 12], x1 + 3, Y(n.midi) + 4);
    }
  }

  fill(0, 0, 100);
  textSize(18);
  let status = !micReady ? 'クリックしてマイクを ON にしよう' : recording ? '● 録音中… 歌おう！（スペースで停止）' : notes.length ? 'P で再生　スペースで録音し直し　C で消す　音符 ' + notes.length + ' 個' : 'スペースで録音開始';
  text(status, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('水色の点 = 測った高さ（連続）　黄 = 半音に丸めて、同じ高さが続く区間を 1 音符にまとめたもの', 20, 68);
}

// ★ 採譜：半音に丸めて、同じ音が続く区間をまとめる（短すぎるものは捨てる）
function transcribe() {
  notes = [];
  let cur = null;
  for (let i = 0; i < contour.length; i++) {
    let m = contour[i] === null ? null : round(contour[i]);
    if (cur && m === cur.midi) cur.len++;
    else {
      if (cur && cur.len >= 4) notes.push(cur); // 4 フレーム（約 0.13 秒）以上
      cur = m === null ? null : { midi: m, start: i, len: 1 };
    }
  }
  if (cur && cur.len >= 4) notes.push(cur);
}

function detectPitch(buf, sampleRate) {
  let n = buf.length, rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  if (sqrt(rms / n) < 0.01) return -1;
  let best = -1, bestCorr = 0;
  for (let lag = floor(sampleRate / 1000); lag < floor(sampleRate / 80); lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) corr += buf[i] * buf[i + lag];
    corr /= n - lag;
    if (corr > bestCorr) { bestCorr = corr; best = lag; }
  }
  return bestCorr < 0.001 ? -1 : sampleRate / best;
}

function mousePressed() {
  startMic();
}
function keyPressed() {
  if (!micReady) return;
  if (key === ' ') {
    if (recording) {
      recording = false;
      transcribe();
    } else {
      contour = [];
      notes = [];
      recording = true;
    }
  }
  if ((key === 'p' || key === 'P') && notes.length) {
    playingBack = true;
    playStart = millis();
    for (let n of notes) playNote(440 * pow(2, (n.midi - 69) / 12), 0.3, (n.len * 33) / 1000, 'square', audioCtx.currentTime + (n.start * 33) / 1000);
    setTimeout(() => (playingBack = false), 600 * 33);
  }
  if (key === 'c' || key === 'C') {
    contour = [];
    notes = [];
  }
}

// ---------- やってみよう ----------
// 1. 「ドレミファソラシド」を歌って、階段になるか見る
// 2. 4 フレームの最小長さを変える。短いと細切れ、長いと速いフレーズが消える
// 3. 再生の音色を 'square' から 'triangle' や 'sawtooth' に。シリーズ5の 10 のフィルタを足すとシンセに


// ==================================================
// ここから下は「音とマイクの道具」です
// ==================================================
let audioCtx, analyser, waveData, masterOut;
let micReady = false;
function startMic() {
  if (audioCtx) return;
  audioCtx = new AudioContext();
  masterOut = audioCtx.createDynamicsCompressor();
  masterOut.connect(audioCtx.destination);
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    waveData = new Float32Array(analyser.fftSize);
    micReady = true;
  }).catch((err) => { console.log('マイクが使えません：' + err); audioCtx = null; });
}
function playNote(freqHz, volume, duration, type, when) {
  let t = when, osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.setValueAtTime(volume, t + max(duration - 0.05, 0.02));
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
