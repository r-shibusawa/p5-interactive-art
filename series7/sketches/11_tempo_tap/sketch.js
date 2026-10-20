// ============================================
// 11 タップテンポとメトロノーム（声・手拍子でテンポを決める）
// スペースキーや手拍子でテンポを打つと BPM を測り、そのテンポでメトロノームが鳴る
// 自分のテンポ感が安定しているか、揺らぎのグラフで見える
// クリックでマイク ON（手拍子で打つ）/ スペースで打つ / M でメトロノーム ON/OFF / R でリセット
// ============================================

let taps = [];
let bpm = 0;
let metronome = false;
let nextTick = 0;
let tickFlash = 0;
let deviations = []; // 各打点の、理想からのずれ（ミリ秒）
let lastOnset = 0;
let energyHist = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setInterval(scheduler, 25);
}

function tap() {
  let now = millis();
  if (taps.length && now - taps[taps.length - 1] > 2500) taps = [];
  taps.push(now);
  if (taps.length > 16) taps.shift();
  if (taps.length >= 2) {
    let gaps = [];
    for (let i = 1; i < taps.length; i++) gaps.push(taps[i] - taps[i - 1]);
    let mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    bpm = 60000 / mean;
    deviations = gaps.map((g) => g - mean);
  }
}

function draw() {
  background(260, 40, 10);
  tickFlash *= 0.85;

  // 手拍子でも打てる（音量の立ち上がり）
  if (micReady) {
    let e = getMicLevel();
    energyHist.push(e);
    if (energyHist.length > 30) energyHist.shift();
    let avg = energyHist.slice(0, -1).reduce((a, b) => a + b, 0) / max(energyHist.length - 1, 1);
    if (e > avg * 2 && e > 0.03 && millis() - lastOnset > 200) {
      lastOnset = millis();
      tap();
    }
  }

  // ---- BPM ----
  noStroke();
  fill(45, 90, 100, tickFlash * 100);
  circle(width / 2, height * 0.4, 220 + tickFlash * 100);
  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  textSize(130);
  text(bpm > 0 ? round(bpm) : '--', width / 2, height * 0.4);
  textSize(26);
  text('BPM', width / 2, height * 0.4 + 95);
  textAlign(LEFT, BASELINE);

  // ---- 揺らぎのグラフ ----
  let gx = 100, gw = width - 200, gy = height * 0.8;
  stroke(0, 0, 30);
  line(gx, gy, gx + gw, gy);
  for (let i = 0; i < deviations.length; i++) {
    let x = gx + (i / 15) * gw;
    let d = constrain(deviations[i], -150, 150);
    stroke(abs(d) < 30 ? 120 : 0, 80, 100);
    strokeWeight(6);
    line(x, gy, x, gy - d);
  }
  noStroke();
  fill(0, 0, 60);
  textSize(14);
  text('各打点のずれ（ms）：上 = 遅い、下 = 速い。緑 = ±30 ms 以内', gx, gy - 90);
  if (deviations.length) {
    let sd = sqrt(deviations.reduce((a, d) => a + d * d, 0) / deviations.length);
    text('ばらつき（標準偏差）' + nf(sd, 1, 0) + ' ms　' + (sd < 20 ? '機械のよう！' : sd < 40 ? '安定' : sd < 80 ? 'ふつう' : 'もっと一定に'), gx, gy + 30);
  }

  fill(0, 0, 100);
  textSize(18);
  text('スペースで打つ（' + (micReady ? '手拍子でも OK' : 'クリックでマイク ON → 手拍子でも') + '）　M：メトロノーム ' + (metronome ? 'ON' : 'OFF') + '　R：リセット　打点 ' + taps.length, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('DAW（音楽制作ソフト）のタップテンポ機能と同じ。打点の間隔の平均から BPM = 60000 ÷ 平均（ms）', 20, 68);
}

function scheduler() {
  if (!metronome || !audioCtx || bpm <= 0) return;
  let dur = 60 / bpm;
  while (nextTick < audioCtx.currentTime + 0.1) {
    let o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 1200;
    g.gain.setValueAtTime(0.3, nextTick);
    g.gain.exponentialRampToValueAtTime(0.001, nextTick + 0.05);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(nextTick);
    o.stop(nextTick + 0.08);
    let when = nextTick;
    setTimeout(() => (tickFlash = 1), max(0, (when - audioCtx.currentTime) * 1000));
    nextTick += dur;
  }
}

function keyPressed() {
  startMic();
  if (key === ' ') tap();
  if (key === 'm' || key === 'M') {
    metronome = !metronome;
    if (metronome) nextTick = audioCtx.currentTime + 0.1;
  }
  if (key === 'r' || key === 'R') {
    taps = [];
    bpm = 0;
    deviations = [];
  }
}
function mousePressed() {
  startMic();
}

// ---------- やってみよう ----------
// 1. 120 BPM を目指して 16 回打つ。ばらつきは何 ms？ プロのドラマーは 10 ms 以下
// 2. メトロノームを ON にして、それに合わせて打つと、ばらつきは減る？
// 3. 「遅れる癖」「走る癖」がグラフに出る（上に偏る／下に偏る）


// ==================================================
// ここから下は「マイクの道具」です
// ==================================================
let audioCtx, analyser, waveData;
let micReady = false;
function startMic() {
  if (audioCtx) {
    audioCtx.resume();
    return;
  }
  audioCtx = new AudioContext();
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    let source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.1;
    source.connect(analyser);
    waveData = new Float32Array(analyser.fftSize);
    micReady = true;
  }).catch((err) => console.log('マイクが使えません：' + err));
}
function getMicLevel() {
  if (!micReady) return 0;
  analyser.getFloatTimeDomainData(waveData);
  let sum = 0;
  for (let i = 0; i < waveData.length; i++) sum += waveData[i] * waveData[i];
  return Math.sqrt(sum / waveData.length);
}
