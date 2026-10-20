// ============================================
// 10 ローパスフィルタで音を削る（シンセサイザーの基本）
// 倍音たっぷりののこぎり波を、ローパスフィルタ（高い周波数を通さない）で削ると、
// こもった音 ⇄ 明るい音 が自由に作れる。レゾナンスを上げると「ミョーン」
// マウス左右 = カットオフ周波数 / 上下 = レゾナンス / クリックで音 ON/OFF / 1〜3 で波形
// ============================================

let cutoff = 1000;
let resonance = 1;
let playing = false;
let waveName = 'sawtooth';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  // 対数で動かす（耳は対数で聞いている）
  cutoff = pow(10, map(mouseX, 0, width, log(80) / log(10), log(12000) / log(10), true));
  resonance = map(mouseY, 0, height, 25, 0.5, true);
  if (playing) {
    filterNode.frequency.setTargetAtTime(cutoff, audioCtx.currentTime, 0.02);
    filterNode.Q.setTargetAtTime(resonance, audioCtx.currentTime, 0.02);
  }

  // ---- フィルタの通り具合（周波数応答）を描く ----
  let left = 60, right = width - 60, base = height * 0.55, h = height * 0.35;
  stroke(0, 0, 30);
  line(left, base, right, base);
  noFill();
  stroke(40, 90, 100);
  strokeWeight(3);
  beginShape();
  for (let x = left; x <= right; x += 2) {
    let f = pow(10, map(x, left, right, log(20) / log(10), log(20000) / log(10)));
    // 2次ローパスの大きさ（だいたいの形）
    let r = f / cutoff;
    let mag = 1 / sqrt(pow(1 - r * r, 2) + pow(r / resonance, 2));
    let db = 20 * log(mag) / log(10);
    vertex(x, base - map(db, -60, 30, 0, h, true));
  }
  endShape();
  // 目盛
  noStroke();
  fill(0, 0, 60);
  textSize(13);
  for (let f of [20, 100, 1000, 10000]) text(f + 'Hz', map(log(f) / log(10), log(20) / log(10), log(20000) / log(10), left, right), base + 20);
  text('通る', left - 50, base - h * 0.7);
  text('削る', left - 50, base - 6);

  // ---- 実際の出力スペクトル ----
  if (playing) {
    analyser.getByteFrequencyData(specData);
    stroke(170, 80, 100, 80);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let i = 1; i < specData.length; i++) {
      let f = (i * audioCtx.sampleRate) / 2 / specData.length;
      if (f < 20) continue;
      let x = map(log(f) / log(10), log(20) / log(10), log(20000) / log(10), left, right);
      vertex(x, height - 40 - (specData[i] / 255) * height * 0.22);
    }
    endShape();
  }

  fill(0, 0, 100);
  textSize(18);
  text('カットオフ ' + round(cutoff) + ' Hz（左右）　レゾナンス Q = ' + nf(resonance, 1, 1) + '（上下）　波形：' + waveName + '（1〜3）　クリックで音 ' + (playing ? 'ON' : 'OFF'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('黄 = フィルタの通り具合　水色 = 実際に出ている音のスペクトル', 20, 68);
}

function mousePressed() {
  startAudio();
  playing = !playing;
  gainNode.gain.setTargetAtTime(playing ? 0.2 : 0, audioCtx.currentTime, 0.03);
}
function keyPressed() {
  if (key === '1') waveName = 'sawtooth';
  if (key === '2') waveName = 'square';
  if (key === '3') waveName = 'triangle';
  if (osc) osc.type = waveName;
}

// ---------- やってみよう ----------
// 1. レゾナンスを最大にしてカットオフを左右に動かす → シンセの「ワウ」
// 2. 三角波（倍音が少ない）だと、フィルタの効果が小さい。なぜ？
// 3. filterNode.type を 'highpass' や 'bandpass' にすると？


// ==================================================
// ここから下は「音を鳴らすための道具」（のこぎり波 → ローパスフィルタ → 分析）
// ==================================================
let audioCtx, osc, filterNode, gainNode, analyser, specData;

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    osc = audioCtx.createOscillator();
    osc.type = waveName;
    osc.frequency.value = 110;
    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    specData = new Uint8Array(analyser.frequencyBinCount);
    osc.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    osc.start();
  }
  audioCtx.resume();
}
