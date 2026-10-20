// ============================================
// 02 サンプリング（連続な波を、点にする）
// コンピュータは波を「1秒間に何回か」測った点でしか持てない
// 点が少なすぎると、元の波とはちがう波に見えてしまう（エイリアシング）
// マウス左右 = サンプリング周波数 / 上下 = 波の周波数
// ============================================

let signalFreq = 5; // 波の周波数（画面内に何周期あるか）
let sampleRate = 20; // 画面内に何個の点を取るか

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(220, 40, 10);
  sampleRate = floor(map(mouseX, 0, width, 3, 60, true));
  signalFreq = map(mouseY, 0, height, 20, 1, true);

  let left = 60, right = width - 60, mid = height * 0.5, h = height * 0.3;

  // ---- 元の波（連続）----
  stroke(170, 60, 100, 50);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let x = left; x <= right; x++) {
    let t = (x - left) / (right - left);
    vertex(x, mid - sin(TWO_PI * signalFreq * t) * h);
  }
  endShape();

  // ---- サンプル点 ----
  let samples = [];
  for (let i = 0; i < sampleRate; i++) {
    let t = i / sampleRate;
    let x = map(t, 0, 1, left, right);
    let y = sin(TWO_PI * signalFreq * t); // ★ この瞬間の値だけを測る
    samples.push({ x, y, t });
    stroke(40, 90, 100);
    strokeWeight(1);
    line(x, mid, x, mid - y * h);
    noStroke();
    fill(40, 90, 100);
    circle(x, mid - y * h, 10);
  }

  // ---- 点だけから波を「復元」する（点を線でつなぐ）----
  stroke(0, 90, 100);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let s of samples) vertex(s.x, mid - s.y * h);
  endShape();

  // 判定：ナイキストの条件 サンプリング周波数 > 2 × 波の周波数
  let ok = sampleRate > 2 * signalFreq;
  fill(ok ? 120 : 0, 80, 100);
  noStroke();
  textSize(26);
  text(ok ? '✔ 復元できる（サンプリング周波数 > 2 × 波の周波数）' : '✘ 別の波に見える！（エイリアシング）', 60, height - 60);

  fill(0, 0, 100);
  textSize(18);
  text('サンプル ' + sampleRate + ' 個（マウス左右）　波 ' + nf(signalFreq, 1, 1) + ' 周期（上下）　水色 = 本当の波　赤 = 点だけから復元した波', 20, 40);
}

// ---------- やってみよう ----------
// 1. サンプルを減らしていき、復元した波がおかしくなる境目を探そう。波の周波数の 2 倍？
// 2. サンプル数 = 波の周期数 ぴったりにすると、まっすぐな線になる（波が消える！）
// 3. CD は 44100 Hz。人の耳の上限 20000 Hz の 2 倍より少し多い理由がこれ
