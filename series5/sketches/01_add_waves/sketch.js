// ============================================
// 01 波を足す（フーリエ級数）
// 正弦波を「1倍・3倍・5倍…」の周波数で足していくと、矩形波になる！
// どんな波も、正弦波の足し算で作れる（フーリエの定理）
// マウス左右 = 足す波の数（1〜30） / 1〜3 キーで目標の波形 / クリックで音
// ============================================

let n = 1; // 足す正弦波の数
let target = 1; // 1 = 矩形波, 2 = のこぎり波, 3 = 三角波
let names = ['', '矩形波', 'のこぎり波', '三角波'];
let phase = 0;
let playing = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// k 番目の正弦波の「周波数の倍率」と「大きさ」を返す（★ ここが各波形のレシピ）
function harmonic(k) {
  if (target === 1) return { mult: 2 * k - 1, amp: 1 / (2 * k - 1) }; // 奇数倍、1/n
  if (target === 2) return { mult: k, amp: ((k % 2 === 0 ? -1 : 1) * 1) / k }; // 全部、1/n、符号交互
  return { mult: 2 * k - 1, amp: ((k % 2 === 0 ? -1 : 1) * 1) / ((2 * k - 1) * (2 * k - 1)) }; // 奇数倍、1/n²
}

function draw() {
  background(220, 40, 10);
  n = floor(map(mouseX, 0, width, 1, 31, true));
  phase += 0.03;

  // ---- 上：足し合わせた波 ----
  let top = 100, mid = height * 0.38, h = height * 0.22;
  stroke(0, 0, 30);
  line(0, mid, width, mid);
  noFill();
  // 足す前の各波（うすく）
  for (let k = 1; k <= min(n, 8); k++) {
    let hm = harmonic(k);
    stroke((k * 40) % 360, 60, 100, 35);
    strokeWeight(1);
    beginShape();
    for (let x = 0; x < width; x += 3) {
      let t = (x / width) * TWO_PI * 2;
      vertex(x, mid - hm.amp * sin(hm.mult * t + phase) * h);
    }
    endShape();
  }
  // 合計
  stroke(170, 80, 100);
  strokeWeight(3);
  beginShape();
  for (let x = 0; x < width; x += 2) {
    let t = (x / width) * TWO_PI * 2;
    let y = 0;
    for (let k = 1; k <= n; k++) {
      let hm = harmonic(k);
      y += hm.amp * sin(hm.mult * t + phase); // ★ 正弦波の足し算
    }
    vertex(x, mid - y * h * 0.8);
  }
  endShape();

  // ---- 下：スペクトル（どの周波数がどれだけ入っているか）----
  let base = height - 80, sh = height * 0.25;
  stroke(0, 0, 30);
  line(60, base, width - 60, base);
  noStroke();
  for (let k = 1; k <= n; k++) {
    let hm = harmonic(k);
    let x = map(hm.mult, 0, 62, 60, width - 60);
    fill((k * 40) % 360, 60, 100);
    rect(x - 6, base - abs(hm.amp) * sh, 12, abs(hm.amp) * sh);
  }
  fill(0, 0, 60);
  textSize(14);
  text('周波数（基本の何倍か）→', width - 220, base + 24);
  text('大きさ', 20, base - sh);

  if (playing) updateSound();

  fill(0, 0, 100);
  textSize(18);
  text(names[target] + 'をつくる　正弦波 ' + n + ' 個（マウス左右）　1〜3 で波形　クリックで音 ' + (playing ? 'ON' : 'OFF'), 20, 40);
}

function keyPressed() {
  if (key >= '1' && key <= '3') target = int(key);
}

function mousePressed() {
  startAudio();
  playing = !playing;
  if (!playing) for (let g of gains) g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02);
}

// ---------- やってみよう ----------
// 1. n を 1 から増やして、角がだんだんできるのを見よう（30 でも完全な矩形にはならない）
// 2. 自分のレシピを書く：harmonic で mult と amp を自由に決める
// 3. 音を聞き比べる：矩形波はクラリネット、のこぎり波は弦楽器に似ている


// ==================================================
// ここから下は「音を鳴らすための道具」（30 個の正弦波を同時に鳴らす）
// ==================================================
let audioCtx, oscs = [], gains = [];

function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    for (let k = 0; k < 30; k++) {
      let o = audioCtx.createOscillator();
      let g = audioCtx.createGain();
      g.gain.value = 0;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      oscs.push(o);
      gains.push(g);
    }
  }
  audioCtx.resume();
}

function updateSound() {
  let t = audioCtx.currentTime;
  for (let k = 0; k < 30; k++) {
    let hm = harmonic(k + 1);
    let on = k < n;
    oscs[k].frequency.setTargetAtTime(220 * hm.mult, t, 0.02);
    gains[k].gain.setTargetAtTime(on ? abs(hm.amp) * 0.15 : 0, t, 0.02);
  }
}
