// ============================================
// 12 フラクタルの森（自由制作のベース）
// クリックした場所に木が生えて、音を鳴らしながら育つ
// C で消す / S で保存
// ============================================
// ★ のついた数字を変えて、自分だけの森にしよう！

let trees = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 8);

  for (let t of trees) {
    // 育つ：depth が 0 から maxDepth まで少しずつ増える
    let before = floor(t.grow);
    t.grow = min(t.grow + 0.08, t.maxDepth); // ★ 育つ速さ
    if (floor(t.grow) > before) {
      // 1段育つごとに、高い音を鳴らす
      playNote(t.notes[floor(t.grow) % t.notes.length], 0.2, 0.5);
    }

    randomSeed(t.seed); // この木の形は毎回同じ
    push();
    translate(t.x, t.y);
    branch(t, t.size, 0);
    pop();
  }

  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text('クリックで木を植える（' + trees.length + '本）　C：消す　S：保存', 20, 30);
}

function branch(t, len, depth) {
  if (depth > t.grow) return; // まだ育っていない部分は描かない

  // 育っている途中の枝は短く描く（にゅっと伸びる）
  let partial = min(1, t.grow - depth + 1);
  strokeWeight(map(depth, 0, t.maxDepth, 10, 1));
  stroke((t.hue + depth * 12) % 360, 60, 60 + depth * 5); // ★ 色
  line(0, 0, 0, -len * partial);
  translate(0, -len * partial);
  if (partial < 1) return;

  if (depth === t.maxDepth) {
    noStroke();
    fill((t.hue + 180) % 360, 70, 100, 80); // ★ 花の色
    circle(0, 0, 8);
    return;
  }
  let n = t.branches; // ★ 枝の数
  for (let i = 0; i < n; i++) {
    push();
    rotate(map(i, 0, n - 1, -t.angle, t.angle) + random(-0.15, 0.15));
    branch(t, len * t.ratio, depth + 1);
    pop();
  }
}

function mousePressed() {
  startAudio();
  if (mouseY < 44) return;
  let notes = ['C3', 'E3', 'G3', 'B3', 'D4', 'F#4', 'A4', 'C5'];
  trees.push({
    x: mouseX,
    y: mouseY,
    size: random(50, 130), // ★ 幹の長さ
    maxDepth: floor(random(5, 8)), // ★ 深さ
    branches: random() < 0.5 ? 2 : 3,
    angle: random(0.3, 0.9), // ★ 枝の広がり
    ratio: random(0.6, 0.75), // ★ 縮む割合
    hue: random(360),
    seed: floor(random(100000)),
    grow: 0,
    notes: notes,
  });
}

function keyPressed() {
  if (key === 'c' || key === 'C') trees = [];
  if (key === 's' || key === 'S') saveCanvas('forest', 'png');
}

// ---------- 自由制作のアイデア ----------
// ・枝の先を花ではなく、円の中に円（00）やコッホ（06）にしてみる
// ・mouseDragged() で、ドラッグしながら森を植える
// ・10 のマイクと組み合わせて、声で木が育つようにする
// ・背景を 14 の山にして、山にフラクタルの森をつくる


// ==================================================
// ここから下は「音を鳴らすための道具」です
// （中身は読まなくても OK。消さないでね）
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

// 音を1つ鳴らす： playNote('C4', 音の大きさ 0〜1, 長さ[秒], 音色)
function playNote(note, volume = 0.3, duration = 0.3, type = 'triangle') {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let osc = audioCtx.createOscillator();
  let amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = noteToFreq(note);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp);
  amp.connect(masterOut);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noteToFreq(note) {
  let steps = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = steps[note[0]];
  if (note[1] === '#') n = n + 1;
  if (note[1] === 'b') n = n - 1;
  let octave = parseInt(note.slice(-1));
  return 440 * Math.pow(2, (n + (octave + 1) * 12 - 69) / 12);
}
