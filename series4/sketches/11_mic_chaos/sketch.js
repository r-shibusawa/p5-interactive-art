// ============================================
// 11 声でカオスを操る
// 声の大きさが r になる。静かなら規則的な点滅、大きな声でカオスの嵐
// 画面には「いまの x の値」の粒が飛び、下には最近の値のヒストグラム
// クリックでマイク ON
// ============================================

let r = 2.8;
let x = 0.3;
let vol = 0;
let particles = [];
let hist = new Array(50).fill(0);

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10, 40);
  vol = lerp(vol, getMicLevel(), 0.15);
  r = map(vol, 0, 0.25, 2.8, 4.0, true); // ★ 声の大きさ → r

  // 毎フレーム x を更新して粒を出す
  x = r * x * (1 - x);
  let px = map(x, 0, 1, 80, width - 80);
  particles.push({ x: px, y: height * 0.45, vy: random(-3, -1), hue: map(x, 0, 1, 180, 360), life: 100 });
  hist[floor(x * 49.99)]++;

  // 粒
  noStroke();
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.y += p.vy;
    p.life -= 2;
    fill(p.hue, 70, 100, p.life);
    circle(p.x, p.y, 10 + (r - 2.8) * 8);
    if (p.life <= 0) particles.splice(i, 1);
  }
  // いまの x
  fill(0, 0, 100);
  circle(px, height * 0.45, 24);

  // ヒストグラム（どの値によく来るか）
  let m = max(...hist) || 1;
  for (let i = 0; i < 50; i++) {
    let hx = map(i, 0, 50, 80, width - 80);
    let hh = (hist[i] / m) * (height * 0.3);
    fill(map(i, 0, 50, 180, 360), 60, 80);
    rect(hx, height - 60 - hh, (width - 160) / 50 - 2, hh);
    hist[i] *= 0.99; // 古い記録はゆっくり忘れる
  }

  let state = r < 3.0 ? '規則的（1つの値）' : r < 3.449 ? '周期2' : r < 3.57 ? '周期4・8' : 'カオス！';
  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '声の大きさ → r = ' + nf(r, 1, 3) + '　' + state : 'クリックしてマイクを ON にしよう', 20, 40);
}

function mousePressed() {
  startMic();
}

// ---------- やってみよう ----------
// 1. 黙る → 粒は1列。小声 → 2列。大声 → 散らばる。声でカオスを ON/OFF できる
// 2. 0.25（どのくらいの声で r=4 になるか）を変えて感度を調整
// 3. x を音の高さにして鳴らす（10 と合体）


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
