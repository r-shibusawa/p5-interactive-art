// ============================================
// 15 声でゆらす振り子たち（おまけ）
// 13 の振り子に、声の大きさで「風」を吹かせる
// 静かなら同じ動き。声でキックすると、ほんのわずかな差が広がってばらばらに
// クリックでマイク ON・やり直し
// ============================================

let pends = [];
let count = 60;
let vol = 0;
let layer;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  pends = [];
  for (let i = 0; i < count; i++) {
    pends.push({ a1: PI * 0.5 + i * 0.00005, a2: PI * 0.5, v1: 0, v2: 0, hue: (i / count) * 300, px: null, py: null });
  }
  layer.background(240, 40, 8);
}

function draw() {
  vol = lerp(vol, getMicLevel(), 0.2);
  let kick = map(vol, 0, 0.2, 0, 0.004, true); // ★ 声 → 風の強さ

  let ox = width / 2, oy = height * 0.38;
  let L = min(width, height) * 0.2;

  // 残像を少しずつ消す
  layer.noStroke();
  layer.fill(240, 40, 8, 6);
  layer.rect(0, 0, width, height);

  for (let p of pends) {
    for (let k = 0; k < 6; k++) simulate(p, 1 / 6);
    p.v1 += kick; // 風（全員に同じ力。でも結果はばらばらになる）
    let x1 = ox + L * sin(p.a1), y1 = oy + L * cos(p.a1);
    let x2 = x1 + L * sin(p.a2), y2 = y1 + L * cos(p.a2);
    if (p.px !== null) {
      layer.stroke(p.hue, 70, 100, 50);
      layer.strokeWeight(1.5);
      layer.line(p.px, p.py, x2, y2);
    }
    p.px = x2;
    p.py = y2;
  }
  image(layer, 0, 0);

  // 本体（うす く）
  for (let p of pends) {
    let x1 = ox + L * sin(p.a1), y1 = oy + L * cos(p.a1);
    let x2 = x1 + L * sin(p.a2), y2 = y1 + L * cos(p.a2);
    stroke(p.hue, 50, 100, 40);
    strokeWeight(1);
    line(ox, oy, x1, y1);
    line(x1, y1, x2, y2);
  }

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text(micReady ? '声を出すと風が吹く　音量 ' + nf(vol, 1, 3) + '　クリックでやり直し' : 'クリックしてマイクを ON にしよう', 20, 40);
}

function simulate(p, dt) {
  let g = 1, m1 = 1, m2 = 1, L1 = 1, L2 = 1;
  let { a1, a2, v1, v2 } = p;
  let num1 = -g * (2 * m1 + m2) * sin(a1) - m2 * g * sin(a1 - 2 * a2) - 2 * sin(a1 - a2) * m2 * (v2 * v2 * L2 + v1 * v1 * L1 * cos(a1 - a2));
  let den1 = L1 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
  let num2 = 2 * sin(a1 - a2) * (v1 * v1 * L1 * (m1 + m2) + g * (m1 + m2) * cos(a1) + v2 * v2 * L2 * m2 * cos(a1 - a2));
  let den2 = L2 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
  p.v1 += (num1 / den1) * dt * 0.05;
  p.v2 += (num2 / den2) * dt * 0.05;
  p.a1 += p.v1 * dt;
  p.a2 += p.v2 * dt;
  p.v1 *= 0.9995; // ほんの少しの摩擦
  p.v2 *= 0.9995;
}

function mousePressed() {
  startMic();
  if (micReady) reset();
}

// ---------- やってみよう ----------
// 1. 黙って見る → ずっとそろって動く。ひと声かける → ばらばらに。もう元には戻らない
// 2. 風の強さ 0.004 を変える。小さくても結局ばらばらになる？
// 3. 本数 count を 200 にして、残像を長く（6 を 2 に）すると絵画のようになる


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
