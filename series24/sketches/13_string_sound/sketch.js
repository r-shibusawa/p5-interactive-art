// ============================================
// 13 振動を聞く 🔊
// 弦を N 個のおもりとばねに分けて、波動方程式 y'' = c² y_xx を差分で解く。マウスではじくと揺れが左右に伝わる
//   音は「基準モード（07）」の足し算：はじいた形をモードに分けて、ピックアップ（マイク）の位置で聞く
// クリックで音をスタート / ドラッグ = 弦をつまんで離す / ←→ = ピックアップの位置 / ↑↓ = 音の高さ / 1〜5 = モードだけ鳴らす / D = 減衰
// ============================================

let N = 80;                // ★ おもりの数（弦の分け方）
let f0 = 110;              // ★ 基本の音の高さ [Hz]（A2）
let MODES = 24;            // ★ 音にするモードの数
let decay = 1.5;           // ★ 音が消えるまでの時間の目安 [s]
let y = [], vy = [];
let pickup = 0.2;          // ピックアップの位置（0〜1）
let grabbing = false, grabX = 0.5, grabY = 0;
let amps = [];             // 各モードの大きさ
let damp = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i <= N + 1; i++) { y.push(0); vy.push(0); }
  amps = new Array(MODES).fill(0);
}

function sx(i) { return map(i, 0, N + 1, width * 0.05, width * 0.95); }
function cy() { return height * 0.36; }

// はじく前の三角形の形
function triShape(px, py) {
  for (let i = 0; i <= N + 1; i++) {
    let u = i / (N + 1);
    y[i] = u < px ? py * u / px : py * (1 - u) / (1 - px);
    vy[i] = 0;
  }
  y[0] = 0; y[N + 1] = 0;
}

// いまの形を基準モード sin(nπx) に分ける（フーリエ級数の係数）
function analyze() {
  for (let n = 1; n <= MODES; n++) {
    let s = 0;
    for (let i = 1; i <= N; i++) s += y[i] * sin(n * PI * i / (N + 1));
    amps[n - 1] = 2 * s / (N + 1);
  }
}

function draw() {
  background(270, 30, 10);
  // ★ 波動方程式の差分：となりとの高さの差が力になる（画面はスローモーション。本物は 1 秒に f₀ 回揺れる）
  if (!grabbing) {
    let sub = 4;
    for (let k = 0; k < sub; k++) {
      for (let i = 1; i <= N; i++) vy[i] += (y[i - 1] - 2 * y[i] + y[i + 1]) * 0.5 - (damp ? 0.0015 * vy[i] : 0);
      for (let i = 1; i <= N; i++) y[i] += vy[i] * 0.5;
    }
  } else {
    triShape(constrain(grabX, 0.02, 0.98), grabY);
  }
  for (let i = 0; i <= N + 1; i++) y[i] = constrain(y[i], -2, 2);

  // ---- 弦
  let A = height * 0.18;
  stroke(0, 0, 30); strokeWeight(1); line(sx(0), cy(), sx(N + 1), cy());
  noFill(); stroke(45, 80, 100); strokeWeight(3);
  beginShape(); for (let i = 0; i <= N + 1; i++) vertex(sx(i), cy() - y[i] * A); endShape();
  noStroke(); fill(45, 60, 90);
  for (let i = 1; i <= N; i += 2) circle(sx(i), cy() - y[i] * A, 5);
  fill(0, 0, 60); rect(sx(0) - 8, cy() - 40, 8, 80); rect(sx(N + 1), cy() - 40, 8, 80);
  // ピックアップ
  let pxp = sx(pickup * (N + 1));
  fill(200, 70, 100); rect(pxp - 14, cy() + A + 20, 28, 16, 3);
  stroke(200, 70, 100, 60); strokeWeight(1); line(pxp, cy() - A, pxp, cy() + A + 20);
  noStroke(); fill(200, 70, 100); textSize(13); textAlign(CENTER); text('ピックアップ', pxp, cy() + A + 54); textAlign(LEFT, BASELINE);

  // ---- 下：モードの大きさ（ピックアップの重みつき = 聞こえる音のスペクトル）
  analyze();
  let gx = width * 0.05, gy = height * 0.68, gw = width * 0.9, gh = height * 0.24;
  noStroke(); fill(0, 0, 14); rect(gx, gy, gw, gh, 6);
  let bw = gw / MODES;
  for (let n = 1; n <= MODES; n++) {
    let a = abs(amps[n - 1] * sin(n * PI * pickup));
    let hh = constrain(a / 0.6, 0, 1) * (gh - 40);
    fill(map(n, 1, MODES, 30, 300), 60, 95); rect(gx + (n - 1) * bw + 3, gy + gh - 20 - hh, bw - 6, hh, 2);
    fill(0, 0, 60); textSize(11); textAlign(CENTER);
    if (n <= 12 || n % 4 === 0) text(nf(n * f0, 1, 0), gx + (n - 0.5) * bw, gy + gh - 6);
  }
  textAlign(LEFT, BASELINE);
  fill(0, 0, 75); textSize(13);
  text('聞こえる倍音の大きさ ＝ |モードの大きさ × sin(nπ × ピックアップの位置)|　（下の数字は周波数 Hz = n × f₀。差分の弦は高いモードほど少し低くずれる）', gx + 8, gy + 18);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪ ' : 'クリックで音をスタート　') + 'ドラッグ：つまんで離す　ピックアップ ' + nf(pickup, 1, 2) + '（←→）　f₀ = ' + nf(f0, 1, 0) + ' Hz（↑↓）　1〜5：モード　D：減衰 ' + (damp ? 'ON' : 'OFF'), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('はじく位置で音色が変わる：まん中ではじくと偶数倍音が消える（節で押さえるのと同じ）。ギターのピックアップの位置でも音色が変わる', 20, 68);
}

// 弦のモード n の周波数（N 個のおもりの弦：ω_n ∝ sin(nπ / 2(N+1))）
function modeFreq(n) { return f0 * sin(n * PI / (2 * (N + 1))) / sin(PI / (2 * (N + 1))); }

function mousePressed() {
  startAudio();
  if (mouseY > height * 0.1 && mouseY < height * 0.64) { grabbing = true; grabX = (mouseX - sx(0)) / (sx(N + 1) - sx(0)); grabY = constrain((cy() - mouseY) / (height * 0.18), -1, 1); }
}
function mouseDragged() { if (grabbing) { grabX = (mouseX - sx(0)) / (sx(N + 1) - sx(0)); grabY = constrain((cy() - mouseY) / (height * 0.18), -1, 1); } }
function mouseReleased() {
  if (!grabbing) return;
  grabbing = false;
  analyze();
  pluckSound();
}
function keyPressed() {
  startAudio();
  if (key === LEFT_ARROW) pickup = max(0.03, pickup - 0.03);
  if (key === RIGHT_ARROW) pickup = min(0.97, pickup + 0.03);
  if (key === UP_ARROW) f0 = min(f0 * pow(2, 1 / 12), 440);
  if (key === DOWN_ARROW) f0 = max(f0 / pow(2, 1 / 12), 55);
  if (key === 'd' || key === 'D') damp = !damp;
  if (key >= '1' && key <= '5') {
    let n = int(key);
    for (let i = 0; i <= N + 1; i++) { y[i] = 0.6 * sin(n * PI * i / (N + 1)); vy[i] = 0; }
    analyze(); pluckSound();
  }
}

// ★ モードの足し算で音をつくる：Σ aₙ sin(nπp) sin(2π fₙ t) e^(−t/τₙ)（高いモードほど早く消える）
function pluckSound() {
  if (!audioCtx) return;
  let sr = audioCtx.sampleRate, len = floor(sr * decay * 2);
  let buf = audioCtx.createBuffer(1, len, sr), data = buf.getChannelData(0);
  let peak = 1e-6;
  for (let n = 1; n <= MODES; n++) {
    let a = amps[n - 1] * sin(n * PI * pickup);
    if (abs(a) < 1e-4) continue;
    let w = TWO_PI * modeFreq(n) / sr, tau = decay / (1 + 0.15 * n) * sr;
    for (let i = 0; i < len; i++) data[i] += a * Math.sin(w * i) * Math.exp(-i / tau);
  }
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(data[i]));
  for (let i = 0; i < len; i++) data[i] *= 0.5 / peak * (i < 40 ? i / 40 : 1);
  playBuffer(buf, 0.8);
}

// ---------- やってみよう ----------
// 1. 端の近くではじく（明るい音）と、まん中ではじく（丸い音）。スペクトルの棒を比べる
// 2. ピックアップをまん中（0.5）に置くと、偶数番のモードが全部聞こえなくなる。なぜ？（そこが節）
// 3. 1〜5 でモードだけ鳴らすと純音（サイン波）。2 は 1 オクターブ上、3 はその 5 度上…これが倍音
// 4. N を 10 にすると、高いモードの周波数が整数倍からずれる（分散）。音はどう変わる？


// ==================================================
// ここから下は「音を鳴らすための道具」
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 計算した波形（AudioBuffer）を 1 回鳴らす
function playBuffer(buf, vol) {
  if (!audioCtx) return;
  let src = audioCtx.createBufferSource(), g = audioCtx.createGain();
  src.buffer = buf; g.gain.value = constrain(vol, 0, 1);
  src.connect(g); g.connect(masterOut); src.start();
}
