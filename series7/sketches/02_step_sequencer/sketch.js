// ============================================
// 02 ステップシーケンサー（リズムを打ち込む）
// 16 マス × 4 段のグリッド。マスを ON にすると、再生バーが通ったときに鳴る
// 1 マス = 16 分音符。4 マスで 1 拍、16 マスで 1 小節（4/4 拍子）
// マスをクリックで ON/OFF / マウス左右（上の帯）= テンポ / R でランダム / C で消す / スペースで再生・停止
// ============================================

let steps = 16, tracks = 4;
let grid = [];
let names = ['キック', 'スネア', 'ハイハット', 'クラップ'];
let bpm = 120;
let playhead = -1;
let nextTime = 0;
let playing = false;
let flash = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let t = 0; t < tracks; t++) grid.push(new Array(steps).fill(0));
  flash = new Array(tracks).fill(0);
  // お手本：基本の 8 ビート
  grid[0] = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  grid[1] = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
  grid[2] = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
  setInterval(scheduler, 25);
}

function draw() {
  background(260, 40, 10);
  let cellW = (width - 160) / steps, cellH = min(90, (height - 260) / tracks);
  let x0 = 130, y0 = 120;

  // テンポの帯
  noStroke();
  fill(0, 0, 20);
  rect(x0, 80, width - 160, 14, 7);
  fill(45, 90, 100);
  rect(x0, 80, map(bpm, 60, 200, 0, width - 160), 14, 7);

  for (let t = 0; t < tracks; t++) {
    fill(0, 0, 100);
    textSize(16);
    text(names[t], 20, y0 + t * (cellH + 6) + cellH / 2 + 6);
    for (let s = 0; s < steps; s++) {
      let on = grid[t][s];
      let beat = s % 4 === 0;
      let isNow = s === playhead;
      fill(on ? t * 60 + 20 : 260, on ? 80 : 30, on ? (isNow ? 100 : 75) : isNow ? 30 : beat ? 20 : 15);
      rect(x0 + s * cellW + 2, y0 + t * (cellH + 6), cellW - 4, cellH, 8);
    }
  }
  // 再生バー
  if (playhead >= 0) {
    fill(0, 0, 100, 20);
    rect(x0 + playhead * cellW, y0 - 6, cellW, tracks * (cellH + 6));
  }
  // 拍の番号
  fill(0, 0, 60);
  textSize(13);
  for (let s = 0; s < steps; s += 4) text((s / 4 + 1) + ' 拍', x0 + s * cellW + 4, y0 + tracks * (cellH + 6) + 20);

  fill(0, 0, 100);
  textSize(18);
  text('マスをクリックで ON/OFF　上の帯でテンポ ' + round(bpm) + ' BPM　スペース：' + (playing ? '停止' : '再生') + '　R：ランダム　C：消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('1 マス = 16 分音符（1 拍の 1/4）。BPM = 1 分間の拍の数。120 BPM なら 1 拍 = 0.5 秒', 20, 64);
}

// ★ 少し先の音を予約する（正確なリズムのため）
function scheduler() {
  if (!playing || !audioCtx) return;
  let stepDur = 60 / bpm / 4;
  while (nextTime < audioCtx.currentTime + 0.1) {
    let s = (playhead + 1) % steps;
    for (let t = 0; t < tracks; t++) if (grid[t][s]) drums[t](nextTime);
    let when = nextTime;
    setTimeout(() => (playhead = s), max(0, (when - audioCtx.currentTime) * 1000));
    nextTime += stepDur;
  }
}

function mousePressed() {
  startAudio();
  let cellW = (width - 160) / steps, cellH = min(90, (height - 260) / tracks);
  let x0 = 130, y0 = 120;
  if (mouseY > 74 && mouseY < 100 && mouseX > x0) {
    bpm = map(mouseX, x0, width - 30, 60, 200, true);
    return;
  }
  let s = floor((mouseX - x0) / cellW), t = floor((mouseY - y0) / (cellH + 6));
  if (s >= 0 && s < steps && t >= 0 && t < tracks) {
    grid[t][s] = 1 - grid[t][s];
    if (grid[t][s]) drums[t](audioCtx.currentTime);
  }
}
function mouseDragged() {
  let x0 = 130;
  if (mouseY > 74 && mouseY < 100 && mouseX > x0) bpm = map(mouseX, x0, width - 30, 60, 200, true);
}
function keyPressed() {
  startAudio();
  if (key === ' ') {
    playing = !playing;
    if (playing) {
      nextTime = audioCtx.currentTime + 0.05;
      playhead = -1;
    }
  }
  if (key === 'r' || key === 'R') for (let t = 0; t < tracks; t++) grid[t] = grid[t].map(() => (random() < 0.25 ? 1 : 0));
  if (key === 'c' || key === 'C') for (let t = 0; t < tracks; t++) grid[t].fill(0);
}

// ---------- やってみよう ----------
// 1. キックを 1・3 拍、スネアを 2・4 拍に置く（ロックの基本）。キックを 4 つ全部に（ダンス）
// 2. ハイハットを「裏拍」（2, 6, 10, 14 マス）だけにすると、ノリが変わる
// 3. steps を 12 にすると 3 拍子（ワルツ）になる


// ==================================================
// ここから下は「音を鳴らすための道具」（ドラムの音を合成する）
// ==================================================
let audioCtx, master, noiseBuffer;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    master = audioCtx.createDynamicsCompressor();
    master.connect(audioCtx.destination);
    noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    let d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  audioCtx.resume();
}
function noiseHit(t, vol, type, freq, decay) {
  let src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  src.buffer = noiseBuffer; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + decay + 0.05);
}
let drums = [
  (t) => { let o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45); },
  (t) => { noiseHit(t, 0.5, 'highpass', 1200, 0.18); let o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'triangle'; o.frequency.value = 190; g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.12); },
  (t) => noiseHit(t, 0.3, 'highpass', 7000, 0.05),
  (t) => { for (let k = 0; k < 3; k++) noiseHit(t + k * 0.012, 0.4, 'bandpass', 1500, k === 2 ? 0.15 : 0.03); },
];
