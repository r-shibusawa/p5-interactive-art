// ============================================
// 12 波形を描いて鳴らす（自由制作のベース）
// マウスで1周期ぶんの波形を描くと、それが音になる（ウェーブテーブル合成）
// 右にはその波のスペクトル。ギザギザに描くほど倍音が増えて明るい音に
// ドラッグで描く / マウス左右（描いていないとき）= 音の高さ / C で消す / 1〜3 でお手本
// ============================================
// ★ のついたところを変えて、自分だけの楽器をつくろう！

let N = 256; // 1周期の点の数
let wave = new Array(N).fill(0);
let playing = false;
let freq = 220;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function preset(k) {
  for (let i = 0; i < N; i++) {
    let t = i / N;
    if (k === 1) wave[i] = sin(TWO_PI * t); // ★ 正弦波
    if (k === 2) wave[i] = t < 0.5 ? 1 : -1; // 矩形波
    if (k === 3) wave[i] = 2 * t - 1; // のこぎり波
  }
  updateBuffer();
}

function draw() {
  background(260, 40, 10);
  if (!mouseIsPressed) freq = pow(2, map(mouseX, 0, width, log(80) / log(2), log(880) / log(2), true));
  if (playing) source.playbackRate.setTargetAtTime(freq / 220, audioCtx.currentTime, 0.02);

  // ---- 左：波形（1周期）----
  let left = 60, right = width * 0.55, mid = height * 0.5, h = height * 0.3;
  noFill();
  stroke(0, 0, 30);
  rect(left, mid - h, right - left, h * 2);
  line(left, mid, right, mid);
  stroke(40, 90, 100);
  strokeWeight(3);
  beginShape();
  for (let i = 0; i < N; i++) vertex(map(i, 0, N - 1, left, right), mid - wave[i] * h);
  endShape();

  // ---- 右：スペクトル（DFT）----
  let sl = width * 0.62, sr = width - 60, base = mid + h;
  stroke(0, 0, 30);
  line(sl, base, sr, base);
  noStroke();
  let spec = dft(wave, 40);
  for (let k = 1; k < spec.length; k++) {
    let x = map(k, 0, spec.length, sl, sr);
    fill(map(k, 0, 40, 180, 330), 70, 100); // ★ 色
    rect(x, base - spec[k] * h * 1.8, (sr - sl) / spec.length - 3, spec[k] * h * 1.8);
  }
  fill(0, 0, 60);
  textSize(14);
  text('倍音（1〜39 倍）', sl, base + 24);
  text('波形（1周期）', left, mid - h - 10);

  fill(0, 0, 100);
  textSize(18);
  text('ドラッグで波形を描く　左右で高さ ' + round(freq) + ' Hz　1〜3 でお手本　C で消す　クリックで音 ' + (playing ? 'ON' : 'OFF'), 20, 40);
}

function dft(x, maxK) {
  let out = [];
  for (let k = 0; k < maxK; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < x.length; i++) {
      re += x[i] * cos((TWO_PI * k * i) / x.length);
      im -= x[i] * sin((TWO_PI * k * i) / x.length);
    }
    out.push((2 * sqrt(re * re + im * im)) / x.length);
  }
  return out;
}

function mousePressed() {
  startAudio();
  if (mouseY < 60) return;
  let inBox = mouseX > 60 && mouseX < width * 0.55;
  if (!inBox) {
    playing = !playing;
    gainNode.gain.setTargetAtTime(playing ? 0.25 : 0, audioCtx.currentTime, 0.03);
  }
}
function mouseDragged() {
  let left = 60, right = width * 0.55, mid = height * 0.5, h = height * 0.3;
  let i = floor(map(mouseX, left, right, 0, N - 1));
  let pi = floor(map(pmouseX, left, right, 0, N - 1));
  if (i < 0 || i >= N) return;
  let v = constrain(map(mouseY, mid - h, mid + h, 1, -1), -1, 1);
  // 前の位置から今の位置まで線で埋める（飛びを防ぐ）
  for (let k = min(i, pi); k <= max(i, pi); k++) if (k >= 0 && k < N) wave[k] = v;
  updateBuffer();
}
function keyPressed() {
  if (key === 'c' || key === 'C') {
    wave.fill(0);
    updateBuffer();
  }
  if (key >= '1' && key <= '3') preset(int(key));
}

// ---------- 自由制作のアイデア ----------
// ・描いた波形を少しずつ変化させる（毎フレーム wave[i] を sin で揺らす）
// ・11 のマイクの波形をそのまま wave にコピーして「自分の声の楽器」に
// ・キーボードで音階を弾けるようにする（シリーズ1の 09 を参考に）
// ・スペクトルの色や形を作品にする


// ==================================================
// ここから下は「音を鳴らすための道具」（描いた波形を 220 Hz でループ再生）
// ==================================================
let audioCtx, source, gainNode;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);
    updateBuffer();
  }
  audioCtx.resume();
}

function updateBuffer() {
  if (!audioCtx) return;
  let sr = audioCtx.sampleRate;
  let len = round(sr / 220); // 220 Hz の1周期
  let buf = audioCtx.createBuffer(1, len, sr);
  let data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = wave[floor((i / len) * N)];
  let s = audioCtx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.playbackRate.value = freq / 220;
  s.connect(gainNode);
  s.start();
  if (source) source.stop();
  source = s;
}
