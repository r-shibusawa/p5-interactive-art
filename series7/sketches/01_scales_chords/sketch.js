// ============================================
// 01 音階と和音（五度圏）
// 12 の音を「5 度ずつ」並べると円になる（五度圏）。隣どうしは仲がいい音
// 音階 = 12 音から 7 つ選ぶパターン。和音 = 音階から 1 つおきに 3 つ取る
// 円の音をクリックで調（キー）を変える / 1〜4 で音階の種類 / スペースで音階を演奏 / C で和音
// ============================================

let noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let scales = {
  1: { name: '長音階（メジャー）', steps: [0, 2, 4, 5, 7, 9, 11] },
  2: { name: '短音階（マイナー）', steps: [0, 2, 3, 5, 7, 8, 10] },
  3: { name: 'ペンタトニック', steps: [0, 2, 4, 7, 9] },
  4: { name: 'ブルース', steps: [0, 3, 5, 6, 7, 10] },
};
let root = 0;
let scaleType = 1;
let highlight = -1;
let highlightTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function scaleNotes() {
  return scales[scaleType].steps.map((s) => (root + s) % 12);
}

function draw() {
  background(230, 40, 10);
  let cx = width * 0.32, cy = height * 0.55, r = min(width, height) * 0.3;
  let inScale = scaleNotes();

  // ---- 五度圏：i 番目の位置には (i × 7) % 12 の音 ----
  for (let i = 0; i < 12; i++) {
    let n = (i * 7) % 12; // ★ 5 度（7 半音）ずつ
    let a = -HALF_PI + (TWO_PI * i) / 12;
    let x = cx + cos(a) * r, y = cy + sin(a) * r;
    let on = inScale.includes(n);
    let hot = highlight === n && millis() - highlightTime < 400;
    noStroke();
    fill(n === root ? 45 : on ? 170 : 230, n === root ? 90 : on ? 70 : 30, hot ? 100 : n === root ? 100 : on ? 90 : 30);
    circle(x, y, hot ? 70 : 56);
    fill(0, 0, on || n === root ? 10 : 70);
    textAlign(CENTER, CENTER);
    textSize(20);
    text(noteNames[n], x, y);
  }
  // 音階の音を線でつなぐ
  noFill();
  stroke(170, 60, 100, 40);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < 12; i++) {
    let n = (i * 7) % 12;
    if (inScale.includes(n)) {
      let a = -HALF_PI + (TWO_PI * i) / 12;
      vertex(cx + cos(a) * r, cy + sin(a) * r);
    }
  }
  endShape(CLOSE);
  textAlign(LEFT, BASELINE);

  // ---- 右：音階と和音 ----
  let rx = width * 0.62;
  noStroke();
  fill(0, 0, 100);
  textSize(24);
  text(noteNames[root] + ' ' + scales[scaleType].name, rx, height * 0.3);
  textSize(18);
  text('音階：' + inScale.map((n) => noteNames[n]).join('  '), rx, height * 0.3 + 44);
  fill(0, 0, 60);
  textSize(15);
  text('半音の間隔：' + scales[scaleType].steps.map((s, i, a) => (i < a.length - 1 ? a[i + 1] - s : 12 - s)).join(' - '), rx, height * 0.3 + 72);
  // 和音：音階の 1, 3, 5 番目
  let steps = scales[scaleType].steps;
  if (steps.length >= 5) {
    fill(0, 0, 100);
    textSize(18);
    text('和音（1・3・5 番目）：' + [0, 2, 4].map((k) => noteNames[(root + steps[k]) % 12]).join(' + '), rx, height * 0.3 + 120);
  }
  fill(0, 0, 60);
  textSize(15);
  text('円の音をクリック → 調（キー）を変える\n1〜4 → 音階の種類\nスペース → 音階を上から演奏\nC → 和音を鳴らす', rx, height * 0.3 + 170);

  fill(0, 0, 100);
  textSize(18);
  text('五度圏：隣どうしの音は、周波数の比が 3:2 に近い（よく響く）。長音階の 7 音は円の上で「かたまり」になる', 20, 40);
}

function playSeq(notes, interval) {
  startAudio();
  notes.forEach((n, i) => {
    let m = 60 + n + (i > 0 && n < notes[0] ? 12 : 0);
    playNote(440 * pow(2, (m - 69) / 12), 0.3, 0.5, 'triangle', audioCtx.currentTime + i * interval);
    setTimeout(() => {
      highlight = n;
      highlightTime = millis();
    }, i * interval * 1000);
  });
}

function mousePressed() {
  startAudio();
  let cx = width * 0.32, cy = height * 0.55, r = min(width, height) * 0.3;
  for (let i = 0; i < 12; i++) {
    let a = -HALF_PI + (TWO_PI * i) / 12;
    if (dist(mouseX, mouseY, cx + cos(a) * r, cy + sin(a) * r) < 30) {
      root = (i * 7) % 12;
      playSeq([root], 0);
    }
  }
}
function keyPressed() {
  if (scales[key]) scaleType = int(key);
  if (key === ' ') playSeq(scaleNotes().concat([root]), 0.25);
  if (key === 'c' || key === 'C') {
    let steps = scales[scaleType].steps;
    if (steps.length >= 5) playSeq([0, 2, 4].map((k) => (root + steps[k]) % 12), 0);
  }
}

// ---------- やってみよう ----------
// 1. 長音階と短音階を同じ調で聞き比べる。3 番目の音が半音ちがうだけで「明るい／暗い」
// 2. ペンタトニックは隣り合う 5 つ。だから何を弾いてもぶつからない（黒鍵だけで弾ける F# ペンタトニック）
// 3. 自分の音階を scales に追加しよう（例：日本の音階「都節」 [0, 1, 5, 7, 8]）


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
