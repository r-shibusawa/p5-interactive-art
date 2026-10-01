// ============================================
// 10 マイク・ビジュアライザー
// 声や音楽に反応して、光の輪が動く
// クリックでマイクを ON（ブラウザの許可が必要）
// ============================================

let hueShift = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(0, 0, 5, 25);

  if (!micReady) {
    fill(0, 0, 100);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(24);
    text('クリックしてマイクを ON にしよう', width / 2, height / 2);
    return; // ここで draw を終わる
  }

  let spectrum = getSpectrum(); // 低い音〜高い音の強さ（0〜255）の配列
  let vol = getMicLevel(); // 全体の音量（0〜1）

  translate(width / 2, height / 2); // 中心へ
  let inner = min(width, height) * 0.15; // 内側の円の半径
  let bins = 100; // 使う数（高すぎる音は使わない）

  // ---- 放射状の線（スペクトラム）----
  for (let i = 0; i < bins; i++) {
    let angle = map(i, 0, bins, 0, PI); // 半周分
    let len = map(spectrum[i], 0, 255, 0, min(width, height) * 0.35);
    let h = (map(i, 0, bins, 180, 360) + hueShift) % 360;
    stroke(h, 80, 100, 90);
    strokeWeight(4);
    // 左右対称に描く
    for (let side of [1, -1]) {
      let a = angle * side - HALF_PI;
      line(cos(a) * inner, sin(a) * inner, cos(a) * (inner + len), sin(a) * (inner + len));
    }
  }

  // ---- 中心の円（音量で大きくなる）----
  noStroke();
  fill((hueShift + 200) % 360, 60, 100, 80);
  circle(0, 0, inner * 1.6 + vol * 800);

  hueShift = (hueShift + 0.5) % 360;
}

function mousePressed() {
  startMic(); // マイクを ON
}

// ---------- やってみよう ----------
// 1. 「あー」と高い声・低い声を出して、線の動き方を比べよう
// 2. スマホで音楽を流してマイクに近づけてみよう
// 3. line を circle に変えると、どんな模様になる？


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
