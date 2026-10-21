// ============================================
// 03 デジタル変調（0 と 1 を波で送る）
// ビット列を波にする 3 つの方法：
//   ASK：1 なら波あり、0 なら小さく   FSK：1 と 0 で周波数を変える   PSK：1 と 0 で波の向き（位相）を反転
// 1〜3 キーで方式 / クリックでビットをランダムに / 上下キーで速さ
// ============================================

let bits = [1, 0, 1, 1, 0, 0, 1, 0];
let mode = 1;
let names = ['', 'ASK（振幅）', 'FSK（周波数）', 'PSK（位相）'];
let scroll = 0;
let speed = 2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  scroll += speed;
  let left = 60, right = width - 60;
  let bitW = (right - left) / bits.length; // 1 ビットの横幅

  // ---- ビット列 ----
  for (let i = 0; i < bits.length; i++) {
    let x = left + i * bitW;
    noStroke();
    fill(bits[i] ? 45 : 230, bits[i] ? 90 : 30, bits[i] ? 100 : 35);
    rect(x + 2, height * 0.18, bitW - 4, 50, 6);
    fill(bits[i] ? 230 : 0, 40, bits[i] ? 20 : 70);
    textAlign(CENTER, CENTER);
    textSize(24);
    text(bits[i], x + bitW / 2, height * 0.18 + 25);
    stroke(0, 0, 25);
    line(x, height * 0.3, x, height * 0.85);
  }
  textAlign(LEFT, BASELINE);

  // ---- 変調した波 ----
  let mid = height * 0.58, h = height * 0.2;
  stroke(0, 0, 25);
  line(left, mid, right, mid);
  noFill();
  stroke(40, 90, 100);
  strokeWeight(2.5);
  beginShape();
  for (let x = left; x <= right; x++) {
    let i = floor((x - left) / bitW);
    let b = bits[min(i, bits.length - 1)];
    let t = (x - left) / bitW; // ビット単位の時間
    let v;
    // ★ 3 つの方式
    if (mode === 1) v = (b ? 1 : 0.2) * sin(TWO_PI * 6 * t); // ASK
    else if (mode === 2) v = sin(TWO_PI * (b ? 9 : 4) * t); // FSK
    else v = sin(TWO_PI * 6 * t + (b ? 0 : PI)); // PSK：0 のとき位相を 180° 反転
    vertex(x, mid - v * h);
  }
  endShape();

  // 送信アニメーション（点が波の上を走る）
  let px = left + (scroll % (right - left));
  let i = floor((px - left) / bitW);
  let b = bits[min(i, bits.length - 1)];
  let t = (px - left) / bitW;
  let v = mode === 1 ? (b ? 1 : 0.2) * sin(TWO_PI * 6 * t) : mode === 2 ? sin(TWO_PI * (b ? 9 : 4) * t) : sin(TWO_PI * 6 * t + (b ? 0 : PI));
  noStroke();
  fill(0, 0, 100);
  circle(px, mid - v * h, 14);

  fill(0, 0, 100);
  textSize(18);
  text(names[mode] + '　1〜3 で方式　クリックでビットをランダムに　↑↓で速さ', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  let desc = mode === 1 ? '1 = 大きい波、0 = 小さい波。簡単だが雑音に弱い（光ファイバーの ON/OFF もこの仲間）' : mode === 2 ? '1 = 高い周波数、0 = 低い周波数。昔のモデムの「ピーガー」音。雑音に強い' : '1 と 0 で波の向きを反転。Wi-Fi や携帯電話は、これを発展させた QPSK / QAM を使う（→ 04）';
  text(desc, 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '3') mode = int(key);
  if (key === UP_ARROW) speed = min(8, speed + 1);
  if (key === DOWN_ARROW) speed = max(0, speed - 1);
}
function mousePressed() {
  bits = bits.map(() => (random() < 0.5 ? 1 : 0));
}

// ---------- やってみよう ----------
// 1. PSK で、ビットが変わる境目の波をよく見る。急にひっくり返っている
// 2. 1 ビットの中の波の数（6）を増やすと、1 秒に送れるビット数は減る？増える？
// 3. 4 種類の位相（0°, 90°, 180°, 270°）を使えば 1 回で 2 ビット送れる（QPSK）
