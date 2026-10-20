// ============================================
// 04 量子化（値を「段」にする）
// サンプリングで時間を点にしたら、今度は値（高さ）も段にする＝量子化
// 段の数 = 2^ビット。ビットが少ないと、波がガタガタになり、ノイズが混ざる
// マウス左右 = ビット数（1〜8） / クリックで音を聞く
// ============================================

let bits = 4;
let phase = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 量子化：-1〜1 の値を、2^bits 段のどれかに丸める
function quantize(v, b) {
  let levels = pow(2, b);
  return round(((v + 1) / 2) * (levels - 1)) / (levels - 1) * 2 - 1;
}

function draw() {
  background(220, 40, 10);
  let newBits = floor(map(mouseX, 0, width, 1, 9, true));
  if (newBits !== bits) {
    bits = newBits;
    if (playing) playBuffer();
  }
  phase += 0.02;

  let left = 60, right = width - 60, mid = height * 0.45, h = height * 0.3;
  let levels = pow(2, bits);

  // 段の線
  stroke(0, 0, 25);
  strokeWeight(1);
  for (let i = 0; i < levels && levels <= 64; i++) {
    let y = mid - (i / (levels - 1) * 2 - 1) * h;
    line(left, y, right, y);
  }

  // 元の波
  noFill();
  stroke(170, 60, 100, 50);
  strokeWeight(2);
  beginShape();
  for (let x = left; x <= right; x++) {
    let t = (x - left) / (right - left);
    vertex(x, mid - sin(TWO_PI * 2 * t + phase) * h);
  }
  endShape();

  // 量子化した波
  stroke(40, 90, 100);
  strokeWeight(3);
  beginShape();
  let errSum = 0;
  for (let x = left; x <= right; x++) {
    let t = (x - left) / (right - left);
    let v = sin(TWO_PI * 2 * t + phase);
    let q = quantize(v, bits);
    errSum += abs(v - q);
    vertex(x, mid - q * h);
  }
  endShape();

  // 誤差（ノイズ）
  stroke(0, 90, 100, 70);
  strokeWeight(1.5);
  beginShape();
  for (let x = left; x <= right; x += 2) {
    let t = (x - left) / (right - left);
    let v = sin(TWO_PI * 2 * t + phase);
    vertex(x, height * 0.85 - (v - quantize(v, bits)) * h * 2);
  }
  endShape();
  noStroke();
  fill(0, 90, 100);
  textSize(14);
  text('誤差（量子化ノイズ）×2', left, height * 0.85 - h * 0.35);

  fill(0, 0, 100);
  textSize(18);
  text(bits + ' ビット = ' + levels + ' 段（マウス左右）　平均の誤差 ' + nf(errSum / (right - left), 1, 4) + '　クリックで音 ' + (playing ? 'ON' : 'OFF'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('CD は 16 ビット = 65536 段。1 ビット増えるごとに、ノイズは約 6 dB 減る', 20, 68);
}

function mousePressed() {
  startAudio();
  playing = !playing;
  if (playing) playBuffer();
  else stopBuffer();
}

// ---------- やってみよう ----------
// 1. 1 ビット（2段）の音を聞こう。ブザーみたいになる
// 2. 誤差のグラフを見ると、ビットが多いほど誤差が細かく・小さくなる
// 3. quantize を「切り捨て floor」にすると、波が片側にずれる（バイアス）


// ==================================================
// ここから下は「音を鳴らすための道具」（量子化した波を1秒ぶん作って、くり返し再生）
// ==================================================
let audioCtx, source, playing = false;

function startAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  audioCtx.resume();
}

function playBuffer() {
  stopBuffer();
  let sr = audioCtx.sampleRate;
  let buf = audioCtx.createBuffer(1, sr, sr);
  let data = buf.getChannelData(0);
  for (let i = 0; i < sr; i++) {
    data[i] = quantize(sin((TWO_PI * 330 * i) / sr), bits) * 0.3; // 330 Hz の正弦波を量子化
  }
  source = audioCtx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  source.connect(audioCtx.destination);
  source.start();
}

function stopBuffer() {
  if (source) {
    source.stop();
    source = null;
  }
}
