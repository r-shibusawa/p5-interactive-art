// ============================================
// 13 キー（調）の推定
// 曲の中でよく鳴る 12 音の割合（クロマの累積）を、24 の調の「お手本の形」と比べて、
// いちばん似ている調を答える（クルムハンスル＝シュムクラーのアルゴリズム）
// クリックでマイク ON → 曲を流す・歌う / R でリセット
// ============================================

let noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// ★ 長調・短調の「音の重み」お手本（心理実験から求められた値）
let majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
let minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
let accum = new Array(12).fill(0);
let scores = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// 相関係数（形がどれだけ似ているか、-1〜1）
function correlation(a, b) {
  let ma = a.reduce((x, y) => x + y) / 12, mb = b.reduce((x, y) => x + y) / 12;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < 12; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / sqrt(da * db + 1e-9);
}

function draw() {
  background(260, 40, 10);
  if (micReady) {
    let spec = getSpectrum();
    let binHz = audioCtx.sampleRate / 2 / spec.length;
    for (let i = 2; i < spec.length; i++) {
      let f = i * binHz;
      if (f < 80 || f > 2000) continue;
      let pc = ((round(69 + 12 * log(f / 440) / log(2)) % 12) + 12) % 12;
      accum[pc] += (spec[i] / 255) ** 2 * 0.01; // ★ 時間とともに積み上げる
    }
    // ★ 24 の調それぞれと比べる：お手本を回転させて相関をとる
    scores = [];
    for (let root = 0; root < 12; root++) {
      let maj = [], mnr = [];
      for (let i = 0; i < 12; i++) {
        maj.push(majorProfile[(i - root + 12) % 12]);
        mnr.push(minorProfile[(i - root + 12) % 12]);
      }
      scores.push({ name: noteNames[root] + ' 長調', v: correlation(accum, maj) });
      scores.push({ name: noteNames[root] + ' 短調', v: correlation(accum, mnr) });
    }
    scores.sort((a, b) => b.v - a.v);
  }

  // ---- 左：累積クロマ ----
  let m = max(...accum) || 1;
  let bx = 60, bw = (width * 0.5 - 80) / 12, base = height * 0.75, bh = height * 0.4;
  for (let i = 0; i < 12; i++) {
    noStroke();
    fill((i * 30) % 360, 70, 90);
    rect(bx + i * bw, base - (accum[i] / m) * bh, bw - 4, (accum[i] / m) * bh, 4);
    fill(0, 0, 70);
    textAlign(CENTER);
    textSize(14);
    text(noteNames[i], bx + i * bw + bw / 2, base + 20);
  }
  textAlign(LEFT);
  fill(0, 0, 60);
  textSize(14);
  text('曲全体で、各音がどれだけ鳴ったか（累積クロマ）', bx, base - bh - 14);

  // ---- 右：上位の調 ----
  let rx = width * 0.58;
  if (scores.length) {
    fill(0, 0, 100);
    textSize(48);
    text(scores[0].name, rx, height * 0.35);
    textSize(16);
    fill(0, 0, 60);
    text('似ている度 ' + nf(scores[0].v, 1, 2), rx, height * 0.35 + 36);
    for (let i = 1; i < 6; i++) {
      fill(0, 0, 60 - i * 6);
      textSize(20);
      text(i + 1 + '. ' + scores[i].name + '  ' + nf(scores[i].v, 1, 2), rx, height * 0.35 + 50 + i * 34);
    }
  }
  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '曲を流す・歌う → だんだん調が決まる　R でリセット' : 'クリックしてマイクを ON にしよう', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('24 の調それぞれの「よく鳴る音の形」と比べて、いちばん似ている調を選ぶ。音楽アプリのキー表示と同じ方法', 20, 68);
}

function mousePressed() {
  startMic();
}
function keyPressed() {
  if (key === 'r' || key === 'R') accum.fill(0);
}

// ---------- やってみよう ----------
// 1. 「きらきら星」をハ長調（ドから）で歌う → C 長調 と出るか
// 2. 同じ曲を違う高さで歌う → 別の調が出る（移調）
// 3. 長調と短調で迷うのはなぜ？（C 長調と A 短調は同じ 7 音を使う：平行調）


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
    analyser.smoothingTimeConstant = 0.5;
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
