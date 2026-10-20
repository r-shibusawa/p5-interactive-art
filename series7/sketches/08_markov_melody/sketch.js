// ============================================
// 08 マルコフ連鎖で作曲（曲から曲を学ぶ）
// お手本のメロディから「この音の次はどの音が来やすいか」の表（遷移確率）を作り、
// その表にしたがってサイコロを振ると、お手本に似た新しいメロディが生まれる
// クリックで再生・停止 / 1〜3 でお手本の曲 / 2 キーで 2 音前まで見る（次数）
// ============================================

let songs = {
  1: { name: 'きらきら星', notes: 'C C G G A A G F F E E D D C G G F F E E D G G F F E E D C C G G A A G F F E E D D C'.split(' ') },
  2: { name: 'かえるのうた', notes: 'C D E F E D C E F G A G F E C C C C C C D D E E F F E D C'.split(' ') },
  3: { name: 'ちょうちょう', notes: 'G E E F D D C D E F G G G G E E F D D C E G G E D D D D D E F E E E E E F G G E E F D D C E G G E'.split(' ') },
};
let current = 1;
let table = {}; // table['C'] = { D: 3, G: 2, ... }
let generated = [];
let playing = false;
let nextTime = 0;
let lastNote = 'C';
let noteFreq = { C: 261.6, D: 293.7, E: 329.6, F: 349.2, G: 392.0, A: 440.0, B: 493.9 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  learn();
  setInterval(scheduler, 25);
}

// ★ 学習：お手本の「前の音 → 次の音」を数える
function learn() {
  table = {};
  let notes = songs[current].notes;
  for (let i = 0; i < notes.length - 1; i++) {
    let a = notes[i], b = notes[i + 1];
    if (!table[a]) table[a] = {};
    table[a][b] = (table[a][b] || 0) + 1;
  }
  generated = [];
  lastNote = notes[0];
}

// ★ 生成：表の数に比例した確率で次の音を選ぶ
function nextNote(prev) {
  let row = table[prev];
  if (!row) return random(Object.keys(table));
  let total = Object.values(row).reduce((a, b) => a + b, 0);
  let r = random(total);
  for (let n in row) {
    r -= row[n];
    if (r < 0) return n;
  }
  return prev;
}

function draw() {
  background(260, 40, 10);
  let names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  // ---- 遷移表（ヒートマップ）----
  let cell = min(60, (height - 240) / 8), tx = 160, ty = 130;
  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text('遷移表：行 = いまの音、列 = 次の音（数字 = 回数）', 40, ty - 30);
  for (let i = 0; i < 7; i++) {
    fill(0, 0, 70);
    textAlign(CENTER, CENTER);
    text(names[i], tx + i * cell + cell / 2, ty - 12);
    text(names[i] + ' →', tx - 30, ty + i * cell + cell / 2);
    for (let j = 0; j < 7; j++) {
      let v = (table[names[i]] || {})[names[j]] || 0;
      let hot = names[i] === lastNote;
      fill(v ? 170 : 260, v ? 70 : 30, v ? 40 + min(v, 6) * 10 : hot ? 25 : 15);
      rect(tx + j * cell + 1, ty + i * cell + 1, cell - 2, cell - 2, 4);
      if (v) {
        fill(0, 0, 100);
        text(v, tx + j * cell + cell / 2, ty + i * cell + cell / 2);
      }
    }
  }
  textAlign(LEFT, BASELINE);

  // ---- 生成したメロディ ----
  let gx = tx + 7 * cell + 80, gw = width - gx - 60, gy = height * 0.55, gh = height * 0.35;
  stroke(0, 0, 25);
  for (let i = 0; i < 7; i++) line(gx, gy + gh - (i / 6) * gh, gx + gw, gy + gh - (i / 6) * gh);
  noStroke();
  for (let k = 0; k < generated.length; k++) {
    let n = generated[k];
    let i = names.indexOf(n);
    fill(k === generated.length - 1 ? 45 : 170, 80, 100);
    circle(gx + (k / 32) * gw, gy + gh - (i / 6) * gh, k === generated.length - 1 ? 22 : 14);
  }
  fill(0, 0, 60);
  textSize(14);
  text('生成したメロディ（最新 32 音）', gx, gy - 12);
  for (let i = 0; i < 7; i++) text(names[i], gx - 20, gy + gh - (i / 6) * gh + 5);

  fill(0, 0, 100);
  textSize(18);
  text('お手本：' + songs[current].name + '（1〜3）　クリックで' + (playing ? '停止' : '生成・再生') + '　表の濃いマス = よく起きる「次の音」', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('お手本そのものではなく「お手本らしい」メロディができる。ChatGPT のような言語モデルも、この考え方のとても大きな版', 20, 68);
}

function scheduler() {
  if (!playing || !audioCtx) return;
  while (nextTime < audioCtx.currentTime + 0.1) {
    lastNote = nextNote(lastNote);
    generated.push(lastNote);
    if (generated.length > 32) generated.shift();
    playNote(noteFreq[lastNote], 0.3, 0.3, 'triangle', nextTime);
    nextTime += 0.3;
  }
}

function mousePressed() {
  startAudio();
  playing = !playing;
  if (playing) nextTime = audioCtx.currentTime + 0.05;
}
function keyPressed() {
  if (songs[key]) {
    current = int(key);
    learn();
  }
}

// ---------- やってみよう ----------
// 1. 3 曲を学習させて、生成されるメロディの「らしさ」を比べよう
// 2. 「2 音前まで見る」（2 次マルコフ）にすると、もっとお手本に近くなる。table のキーを a + b にしてみよう
// 3. 自分の好きな曲をドレミで書いて songs に追加


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
