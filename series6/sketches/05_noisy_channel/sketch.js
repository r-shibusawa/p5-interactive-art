// ============================================
// 05 雑音のある通信路（画像を送る）
// 送ったビットが確率 p でひっくり返る「二元対称通信路」
// 絵をそのまま送ると… / 3 回ずつ送って多数決すると…（くり返し符号）
// マウス左右 = ビットが反転する確率 / 1 = そのまま / 2 = 3 回くり返し / 3 = 5 回
// ============================================

let w = 48, h = 32;
let original = []; // 元の絵（0/1）
let p = 0.1;
let repeat = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  // 元の絵：スマイルマーク
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let cx = w / 2, cy = h / 2;
      let d = dist(x, y, cx, cy);
      let face = d < 14 && d > 12;
      let eye = dist(x, y, cx - 5, cy - 4) < 2 || dist(x, y, cx + 5, cy - 4) < 2;
      let mouth = d > 7 && d < 9 && y > cy + 2;
      original.push(face || eye || mouth ? 1 : 0);
    }
  }
}

function draw() {
  background(230, 40, 10);
  p = map(mouseX, 0, width, 0, 0.5, true);

  // ★ 通信路：各ビットが確率 p で反転。くり返し送って多数決で復元
  randomSeed(frameCount >> 4); // 少しずつ変わる
  let received = [], errs = 0;
  for (let i = 0; i < original.length; i++) {
    let ones = 0;
    for (let k = 0; k < repeat; k++) {
      let bit = original[i];
      if (random() < p) bit = 1 - bit; // 反転！
      ones += bit;
    }
    let decoded = ones > repeat / 2 ? 1 : 0; // 多数決
    received.push(decoded);
    if (decoded !== original[i]) errs++;
  }

  // ---- 描く ----
  let cell = min((width / 2 - 100) / w, (height - 200) / h);
  drawImage(original, 60, 120, cell, '送った絵');
  drawImage(received, width / 2 + 40, 120, cell, '受け取った絵（' + repeat + ' 回送って多数決）');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('反転確率 p = ' + nf(p, 1, 2) + '（マウス左右）　1：そのまま　2：3 回くり返し　3：5 回くり返し　　誤り ' + errs + ' / ' + original.length + ' ビット（' + nf((100 * errs) / original.length, 1, 1) + ' %）', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('送るビット数は ' + original.length * repeat + '（' + repeat + ' 倍）。くり返すほど正確だが、遅くなる。もっと賢い方法 → 06 ハミング符号', 20, 68);
}

function drawImage(img, ox, oy, cell, label) {
  noStroke();
  for (let i = 0; i < img.length; i++) {
    fill(img[i] ? 45 : 230, img[i] ? 90 : 30, img[i] ? 100 : 20);
    rect(ox + (i % w) * cell, oy + floor(i / w) * cell, cell - 1, cell - 1);
  }
  fill(0, 0, 100);
  textSize(16);
  text(label, ox, oy - 10);
}

function keyPressed() {
  if (key === '1') repeat = 1;
  if (key === '2') repeat = 3;
  if (key === '3') repeat = 5;
}

// ---------- やってみよう ----------
// 1. p = 0.1 で 1 回 → 3 回 → 5 回 と比べよう。誤りがどのくらい減る？
// 2. p = 0.5 だと何回くり返しても直らない（情報がゼロ）。p = 0.9 だと…？（反転すれば読める！）
// 3. 自分の絵を描いて送ろう（original を変える）
