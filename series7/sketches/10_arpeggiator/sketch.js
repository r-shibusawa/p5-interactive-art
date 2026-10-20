// ============================================
// 10 コード進行とアルペジオ（音楽が「進む」しくみ）
// 4 つの和音をくり返す「コード進行」。それぞれの和音の音を順番に鳴らす（アルペジオ）
// 1〜4 で有名なコード進行 / マウス左右 = テンポ / 上下 = 音の並べ方 / クリックで再生・停止
// ============================================

// 度数で表したコード進行（ローマ数字）。I = ドミソ、IV = ファラド、V = ソシレ、vi = ラドミ
let progressions = {
  1: { name: 'I – V – vi – IV（王道・ポップス）', chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]] },
  2: { name: 'vi – IV – I – V（切ない）', chords: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]] },
  3: { name: 'I – vi – ii – V（ジャズ・循環）', chords: [[0, 4, 7], [9, 12, 16], [2, 5, 9], [7, 11, 14]] },
  4: { name: 'I – IV – V – I（基本）', chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]] },
};
let current = 1;
let bpm = 110;
let playing = false;
let nextTime = 0;
let stepIdx = 0;
let pattern = 'up';
let flashNote = -1, flashChord = 0;
let particles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setInterval(scheduler, 25);
}

function draw() {
  background(260, 40, 10, 60);
  bpm = map(mouseX, 0, width, 70, 160, true);
  pattern = mouseY < height / 2 ? 'up' : 'updown';

  // ---- 4 つの和音 ----
  let prog = progressions[current];
  let cw = (width - 160) / 4;
  for (let c = 0; c < 4; c++) {
    let x = 80 + c * cw, y = height * 0.25;
    let active = playing && c === flashChord;
    noStroke();
    fill(c * 60 + 200, 60, active ? 60 : 25);
    rect(x + 8, y, cw - 16, 120, 16);
    fill(0, 0, 100);
    textAlign(CENTER, CENTER);
    textSize(22);
    text(['I', 'V', 'vi', 'IV'][0] && prog.name.split('（')[0].split(' – ')[c], x + cw / 2, y + 40);
    textSize(16);
    fill(0, 0, 80);
    text(prog.chords[c].map((n) => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][n % 12]).join(' '), x + cw / 2, y + 80);
    textAlign(LEFT, BASELINE);
  }

  // ---- 粒（鳴った音）----
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.y -= 2;
    p.life -= 2;
    fill(p.hue, 70, 100, p.life);
    circle(p.x, p.y, p.size);
    if (p.life <= 0) particles.splice(i, 1);
  }

  fill(0, 0, 100);
  textSize(18);
  text(prog.name + '（1〜4）　テンポ ' + round(bpm) + '（左右）　並べ方：' + (pattern === 'up' ? '上昇' : '上昇→下降') + '（上下）　クリックで' + (playing ? '停止' : '再生'), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('和音を 1 音ずつ順に鳴らす = アルペジオ。同じ 4 つの和音をくり返すだけで「曲」に聞こえる。多くのヒット曲が 1 のコード進行', 20, 68);
}

function scheduler() {
  if (!playing || !audioCtx) return;
  let dur = 60 / bpm / 2; // 8 分音符
  while (nextTime < audioCtx.currentTime + 0.1) {
    let chordIdx = floor(stepIdx / 8) % 4; // 1 和音 = 8 ステップ
    let chord = progressions[current].chords[chordIdx];
    let seq = pattern === 'up' ? [0, 1, 2, 3] : [0, 1, 2, 3, 2, 1];
    let k = seq[stepIdx % seq.length];
    let midi = 60 + chord[k % 3] + (k >= 3 ? 12 : 0); // 4 番目は 1 オクターブ上の根音
    playNote(440 * pow(2, (midi - 69) / 12), 0.25, dur * 1.8, 'triangle', nextTime);
    if (stepIdx % 8 === 0) {
      // 和音の低音
      for (let n of chord) playNote(440 * pow(2, (48 + n - 69) / 12), 0.12, dur * 8, 'sine', nextTime);
    }
    let when = nextTime, s = stepIdx;
    setTimeout(() => {
      flashChord = chordIdx;
      particles.push({ x: 80 + chordIdx * ((width - 160) / 4) + random(40, (width - 160) / 4 - 40), y: height * 0.7, size: 14 + k * 4, hue: chordIdx * 60 + 200, life: 100 });
    }, max(0, (when - audioCtx.currentTime) * 1000));
    stepIdx++;
    nextTime += dur;
  }
}

function mousePressed() {
  startAudio();
  playing = !playing;
  if (playing) {
    nextTime = audioCtx.currentTime + 0.05;
    stepIdx = 0;
  }
}
function keyPressed() {
  if (progressions[key]) {
    current = int(key);
    stepIdx = 0;
  }
}

// ---------- やってみよう ----------
// 1. 1 と 2 は同じ 4 つの和音なのに、始める場所がちがうだけで明るさが変わる
// 2. 自分のコード進行を 5 として追加（度数：I=0, ii=2, iii=4, IV=5, V=7, vi=9）
// 3. アルペジオの並べ方を自分で決める（seq を [0, 2, 1, 3] など）


// ==================================================
// ここから下は「音を鳴らすための道具」です
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
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp);
  amp.connect(masterOut);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}
