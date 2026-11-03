// ============================================
// 13 時間と周波数を聴く
// 短い「カチッ」という音 ↔ 幅の広いスペクトル、長く伸びる純音 ↔ 鋭いピーク（11 の不確定性を耳で）
//   クリックで音を鳴らし、スピーカーに送る直前の信号を AnalyserNode で解析して波形とスペクトルを描く
//   音の長さはマウス左右（5 ms 〜 1 s）、高さはマウス上下
// クリック = 鳴らす / 1〜3 = 波形（サイン・矩形・ノイズ） / A = 自動でくり返す
// ============================================

let waveNo = 1;
let autoPlay = false;
let lastDur = 0, lastFreq = 0, lastT = 0;
let names = ['', 'サイン波', '矩形波', 'ノイズ'];
let spec, wave, hold = [];        // 解析データ（hold = 短い音も見えるようにピークを残す）
let peakHist = [];                // 直近の「帯域幅」の記録
let holdDecay = 0.985;            // ★ ピークホールドの減り方（1 に近いほど長く残る）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}
function durFromMouse() { return Math.pow(10, map(constrain(mouseX, 40, width - 40), 40, width - 40, Math.log10(0.005), 0)); }
function freqFromMouse() { return map(constrain(mouseY, 100, height - 60), 100, height - 60, 1200, 200); }

function draw() {
  background(250, 40, 10);
  let dur = durFromMouse(), fq = freqFromMouse();
  if (autoPlay && audioCtx && millis() - lastT > Math.max(700, dur * 1000 + 400)) playTone(dur, fq);

  let L = { x: 40, y: 110, w: width - 80, h: (height - 200) * 0.35 };
  let R = { x: 40, y: L.y + L.h + 50, w: width - 80, h: (height - 200) * 0.5 };
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(L.x, L.y, L.w, L.h); rect(R.x, R.y, R.w, R.h);
  noStroke(); fill(0, 0, 70); textSize(14); text('波形（時間）', L.x + 10, L.y + 22); text('スペクトル（周波数, 0 〜 4 kHz）　アクア = いま　黄の線 = ピークホールド', R.x + 10, R.y + 22);

  let bw = 0;
  if (analyser) {
    analyser.getFloatTimeDomainData(wave);
    analyser.getByteFrequencyData(spec);
    if (hold.length !== spec.length) hold = new Array(spec.length).fill(0);
    for (let i = 0; i < spec.length; i++) hold[i] = Math.max(hold[i] * holdDecay, spec[i]);   // ★ ピークホールド
    // 波形
    noFill(); stroke(10, 80, 100); strokeWeight(2); beginShape();
    for (let i = 0; i < wave.length; i += 2) vertex(L.x + i / wave.length * L.w, L.y + L.h / 2 - wave[i] * L.h * 0.45);
    endShape();
    // スペクトル（4 kHz まで）
    let binHz = audioCtx.sampleRate / analyser.fftSize, nb = Math.min(spec.length, Math.floor(4000 / binHz));
    let mx = 0, mi = 0;
    for (let i = 0; i < nb; i++) if (hold[i] > mx) { mx = hold[i]; mi = i; }
    noStroke();
    for (let i = 0; i < nb; i++) { fill(180, 80, 100, 80); rect(R.x + i / nb * R.w, R.y + R.h - spec[i] / 255 * (R.h - 30), R.w / nb + 0.5, spec[i] / 255 * (R.h - 30)); }
    noFill(); stroke(55, 70, 100, 70); strokeWeight(1.5); beginShape();
    for (let i = 0; i < nb; i++) vertex(R.x + (i + 0.5) / nb * R.w, R.y + R.h - hold[i] / 255 * (R.h - 30));
    endShape();
    // ★ 帯域幅：ピークの半分（−6 dB）より大きいビンの数 × 刻み
    if (mx > 40) {
      let lo = mi, hi = mi;
      while (lo > 0 && hold[lo - 1] > mx / 2) lo--;
      while (hi < nb - 1 && hold[hi + 1] > mx / 2) hi++;
      bw = (hi - lo + 1) * binHz;
      stroke(55, 90, 100); strokeWeight(2); line(R.x + lo / nb * R.w, R.y + 40, R.x + (hi + 1) / nb * R.w, R.y + 40);
      noStroke(); fill(55, 90, 100); textSize(13); text('幅 ≈ ' + nf(bw, 1, 0) + ' Hz（ピーク ' + nf(mi * binHz, 1, 0) + ' Hz）', R.x + (hi + 1) / nb * R.w + 8, R.y + 45);
    }
    for (let f = 0; f <= 4000; f += 500) { let sx = R.x + f / 4000 * R.w; stroke(0, 0, 30); line(sx, R.y + R.h - 6, sx, R.y + R.h); noStroke(); fill(0, 0, 50); textSize(11); text(f, sx - 8, R.y + R.h + 14); }
  } else {
    noStroke(); fill(0, 0, 60); textSize(20); text('クリックして音を出す', L.x + L.w / 2 - 80, L.y + L.h / 2);
  }
  // 記録（長さ vs 帯域幅）
  if (peakHist.length) {
    noStroke(); fill(0, 0, 70); textSize(13);
    text('記録（長さ → 幅）：' + peakHist.slice(-5).map((p) => nf(p.d * 1000, 1, 0) + 'ms→' + nf(p.b, 1, 0) + 'Hz').join('　'), R.x + 10, R.y + R.h - 10);
  }
  if (bw > 0 && millis() - lastT > 100 && millis() - lastT < 400 && (!peakHist.length || peakHist[peakHist.length - 1].t !== lastT)) peakHist.push({ d: lastDur, b: bw, t: lastT });

  // 現在のマウスの設定
  noStroke(); fill(0, 0, 100); textSize(18);
  text('長さ ' + nf(dur * 1000, 1, 0) + ' ms（マウス左右）　高さ ' + nf(fq, 1, 0) + ' Hz（上下）　波形：' + names[waveNo] + '（1〜3）　A：自動 ' + (autoPlay ? 'ON' : 'off') + '　クリックで鳴らす', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('左端（5 ms）はカチッという音で、スペクトルは横に広がる。右端（1 s）は「ピー」でスペクトルは針のように細い。時間の幅 × 周波数の幅 ≈ 一定（不確定性）', 20, 68);
}

function mousePressed() { startAudio(); playTone(durFromMouse(), freqFromMouse()); }
function keyPressed() {
  if (key >= '1' && key <= '3') waveNo = int(key);
  if (key === 'a' || key === 'A') { startAudio(); autoPlay = !autoPlay; }
}

// ---------- やってみよう ----------
// 1. 同じ高さで長さだけ変えて、スペクトルの幅を記録しよう。長さ × 幅 はだいたい一定？
// 2. 矩形波（2）は倍音がたくさん出る。長くしても「針が何本も」立つ。ノイズ（3）は？
// 3. 長さを 20 ms にしてマウス上下で高さを変える。高さがわかりにくいのはなぜ？（幅が広いから）
// 4. 打楽器は短い音、笛は長い音。その楽器の「音色」の違いをスペクトルの幅で説明してみよう


// ==================================================
// ここから下は「音を鳴らすための道具」（短い音をエンベロープ付きで鳴らし、出力を解析する）
// ==================================================
let audioCtx, masterOut, analyser;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createGain(); masterOut.gain.value = 0.5;
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.5;
    masterOut.connect(analyser); analyser.connect(audioCtx.destination);
    spec = new Uint8Array(analyser.frequencyBinCount); wave = new Float32Array(analyser.fftSize);
  }
  audioCtx.resume();
}
// ★ 長さ dur 秒・周波数 f の音を 1 回鳴らす（ガウス風のエンベロープ）
function playTone(dur, f) {
  if (!audioCtx) return;
  let t0 = audioCtx.currentTime + 0.02, g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.8, t0 + dur * 0.3);
  g.gain.setValueAtTime(0.8, t0 + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(masterOut);
  let src;
  if (waveNo === 3) {
    let len = Math.ceil(audioCtx.sampleRate * (dur + 0.05)), buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    src = audioCtx.createBufferSource(); src.buffer = buf;
  } else { src = audioCtx.createOscillator(); src.type = waveNo === 2 ? 'square' : 'sine'; src.frequency.value = f; }
  src.connect(g); src.start(t0); src.stop(t0 + dur + 0.05);
  lastDur = dur; lastFreq = f; lastT = millis();
}
