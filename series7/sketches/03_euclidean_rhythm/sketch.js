// ============================================
// 03 ユークリッド・リズム（世界の民族音楽のリズムが1つの式で）
// n 個のマスに k 個の音を「できるだけ均等に」配る。ユークリッドの互除法と同じ計算
// E(3,8) = キューバのトレシージョ、E(5,8) = キンティージョ、E(7,12) = 西アフリカのベル…
// マウス左右 = 音の数 k / 上下 = マスの数 n / クリックで再生・停止 / 1〜4 でお手本
// ============================================

let n = 8, k = 3;
let pattern = [];
let pos = 0;
let nextTime = 0;
let playing = false;
let bpm = 100;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setInterval(scheduler, 25);
}

// ★ ビョークランドのアルゴリズム（簡易版）：k 個の 1 を n マスに均等に散らす
function euclid(k, n) {
  let out = [];
  let bucket = 0;
  for (let i = 0; i < n; i++) {
    bucket += k;
    if (bucket >= n) {
      bucket -= n;
      out.push(1);
    } else out.push(0);
  }
  // 最初が 1 になるように回転
  let first = out.indexOf(1);
  if (first > 0) out = out.slice(first).concat(out.slice(0, first));
  return out;
}

function draw() {
  background(260, 40, 10);
  if (!mouseIsPressed) {
    let nk = floor(map(mouseX, 0, width, 1, 13, true));
    let nn = floor(map(mouseY, 0, height, 16, 4, true));
    if (nk !== k || nn !== n) {
      n = nn;
      k = min(nk, n);
    }
  }
  pattern = euclid(k, n);

  // ---- 円に並べる ----
  let cx = width * 0.35, cy = height * 0.55, r = min(width, height) * 0.3;
  noFill();
  stroke(0, 0, 30);
  strokeWeight(2);
  circle(cx, cy, r * 2);
  // 音どうしをつなぐ多角形
  stroke(170, 60, 100, 50);
  beginShape();
  for (let i = 0; i < n; i++) {
    if (pattern[i]) {
      let a = -HALF_PI + (TWO_PI * i) / n;
      vertex(cx + cos(a) * r, cy + sin(a) * r);
    }
  }
  endShape(CLOSE);
  for (let i = 0; i < n; i++) {
    let a = -HALF_PI + (TWO_PI * i) / n;
    let x = cx + cos(a) * r, y = cy + sin(a) * r;
    let now = playing && i === pos;
    noStroke();
    fill(pattern[i] ? 45 : 260, pattern[i] ? 90 : 30, now ? 100 : pattern[i] ? 85 : 25);
    circle(x, y, now ? 44 : pattern[i] ? 34 : 18);
  }

  // ---- 右：パターンを文字で ----
  let rx = width * 0.62;
  noStroke();
  fill(0, 0, 100);
  textSize(30);
  text('E(' + k + ', ' + n + ')', rx, height * 0.3);
  textSize(26);
  fill(45, 90, 100);
  text(pattern.map((p) => (p ? 'x' : '.')).join(' '), rx, height * 0.3 + 50);
  fill(0, 0, 60);
  textSize(15);
  let known = { '3,8': 'トレシージョ（キューバ）', '5,8': 'キンティージョ（キューバ）', '7,12': 'ベルパターン（西アフリカ）', '5,12': 'ベンベ（西アフリカ）', '4,9': 'アクサク（トルコ）', '5,16': 'ボサノバ', '2,5': 'カリブ', '7,16': 'サンバ' };
  let name = known[k + ',' + n];
  if (name) text('→ ' + name, rx, height * 0.3 + 90);
  text('1〜4：E(3,8) E(5,8) E(7,12) E(5,16)\nクリックで再生・停止\n\n音の間隔を見ると「2, 3」など、なるべく等しい間隔が交互に出る。\nこれはユークリッドの互除法（最大公約数を求める計算）そのもの', rx, height * 0.3 + 140);

  fill(0, 0, 100);
  textSize(18);
  text('マウス左右 = 音の数 k　上下 = マスの数 n　→ k 個を n マスに「できるだけ均等に」', 20, 40);
}

function scheduler() {
  if (!playing || !audioCtx) return;
  let dur = 60 / bpm / 2;
  while (nextTime < audioCtx.currentTime + 0.1) {
    let s = (pos + 1) % n;
    if (pattern[s]) hit(nextTime, s === 0 ? 220 : 440);
    else tick(nextTime);
    let when = nextTime;
    setTimeout(() => (pos = s), max(0, (when - audioCtx.currentTime) * 1000));
    nextTime += dur;
  }
}

function mousePressed() {
  startAudio();
  playing = !playing;
  if (playing) {
    nextTime = audioCtx.currentTime + 0.05;
    pos = -1;
  }
}
function keyPressed() {
  let presets = { 1: [3, 8], 2: [5, 8], 3: [7, 12], 4: [5, 16] };
  if (presets[key]) [k, n] = presets[key];
}

// ---------- やってみよう ----------
// 1. E(3,8) を聞いて、手を叩いてみよう。「タン・タ・タン」のラテンのリズム
// 2. k と n が割り切れるとき（E(4,8)）は等間隔でつまらない。割り切れないときが面白い
// 3. 2 つのユークリッド・リズムを重ねる（E(3,8) ＋ E(5,8)）


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, master;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    master = audioCtx.createDynamicsCompressor();
    master.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function hit(t, f) {
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
}
function tick(t) {
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.value = 2000;
  g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.05);
}
