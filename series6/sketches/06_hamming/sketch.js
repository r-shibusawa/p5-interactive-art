// ============================================
// 06 ハミング符号（1 ビットの誤りを自動で直す）
// 4 ビットのデータに 3 ビットの「検査ビット」を足して 7 ビットにする
// どこか 1 ビットが反転しても、検査ビットの組み合わせで「どこが壊れたか」がわかる
// クリックで送信中のビットをひっくり返す / スペースで新しいデータ
// ============================================

let data = [1, 0, 1, 1]; // 送りたい 4 ビット
let sent = []; // 7 ビット
let received = [];
let flipped = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  encode();
}

// ★ 符号化：検査ビット p1, p2, p3 は、決まったデータビットの偶奇（XOR）
function encode() {
  let [d1, d2, d3, d4] = data;
  let p1 = d1 ^ d2 ^ d4;
  let p2 = d1 ^ d3 ^ d4;
  let p3 = d2 ^ d3 ^ d4;
  sent = [p1, p2, d1, p3, d2, d3, d4]; // 位置 1〜7（検査ビットは 1, 2, 4 番目）
  received = sent.slice();
  flipped = -1;
}

// ★ 復号：受信側で検査を計算し直す。3 つの検査結果を 2 進数で読むと、壊れた位置になる！
function decode() {
  let r = received;
  let c1 = r[0] ^ r[2] ^ r[4] ^ r[6];
  let c2 = r[1] ^ r[2] ^ r[5] ^ r[6];
  let c3 = r[3] ^ r[4] ^ r[5] ^ r[6];
  let pos = c1 * 1 + c2 * 2 + c3 * 4; // 0 なら誤りなし
  let fixed = r.slice();
  if (pos > 0) fixed[pos - 1] = 1 - fixed[pos - 1];
  return { pos, fixed, dataOut: [fixed[2], fixed[4], fixed[5], fixed[6]] };
}

function draw() {
  background(230, 40, 10);
  let res = decode();
  let cell = min(90, (width - 200) / 8);

  drawBits(data, 100, height * 0.2, cell, '送りたいデータ（4 ビット）', [0, 1, 2, 3].map(() => 170));
  drawBits(sent, 100, height * 0.38, cell, '符号化（7 ビット）：p1 p2 d1 p3 d2 d3 d4　検査ビットを足す', [40, 40, 170, 40, 170, 170, 170]);
  drawBits(received, 100, height * 0.56, cell, '受信（クリックして 1 ビット壊してみよう）', received.map((b, i) => (b !== sent[i] ? 0 : 230)), true);
  drawBits(res.dataOut, 100, height * 0.76, cell, '復号したデータ', res.dataOut.map((b, i) => (b === data[i] ? 120 : 0)));

  noStroke();
  fill(0, 0, 100);
  textSize(20);
  let msg = res.pos === 0 ? '検査結果 000 → 誤りなし' : '検査結果 ' + ((res.pos >> 2) & 1) + ((res.pos >> 1) & 1) + (res.pos & 1) + ' = ' + res.pos + ' → ' + res.pos + ' 番目のビットを直した！';
  text(msg, 100, height * 0.56 + cell + 50);
  fill(0, 0, 100);
  textSize(18);
  text('クリックで受信ビットを反転（1 つまで直せる。2 つ壊すと…？）　スペースで新しいデータ', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('p1 = d1⊕d2⊕d4　p2 = d1⊕d3⊕d4　p3 = d2⊕d3⊕d4　（⊕ = XOR：1 の数が奇数なら 1）', 20, 68);
}

function drawBits(bits, x0, y0, cell, label, hues, clickable) {
  noStroke();
  fill(0, 0, 100);
  textSize(15);
  text(label, x0, y0 - 12);
  for (let i = 0; i < bits.length; i++) {
    let x = x0 + i * (cell + 8);
    fill(hues[i], hues[i] === 230 ? 25 : 70, hues[i] === 230 ? 35 : 90);
    rect(x, y0, cell, cell, 10);
    fill(0, 0, hues[i] === 230 ? 90 : 10);
    textAlign(CENTER, CENTER);
    textSize(30);
    text(bits[i], x + cell / 2, y0 + cell / 2);
    textSize(13);
    text(i + 1, x + cell / 2, y0 + cell + 14);
    textAlign(LEFT, BASELINE);
  }
}

function mousePressed() {
  let cell = min(90, (width - 200) / 8), y0 = height * 0.56;
  if (mouseY < y0 || mouseY > y0 + cell) return;
  let i = floor((mouseX - 100) / (cell + 8));
  if (i >= 0 && i < 7) received[i] = 1 - received[i];
}
function keyPressed() {
  if (key === ' ') {
    data = data.map(() => (random() < 0.5 ? 1 : 0));
    encode();
  }
}

// ---------- やってみよう ----------
// 1. 7 個のどれを壊しても直ることを確かめよう（検査ビット自身が壊れても OK）
// 2. 2 個壊すと「間違った場所」を直してしまう。ハミング(7,4) は 1 ビット訂正まで
// 3. 05 の 3 回くり返し（12 ビットで 4 ビット送る）と比べて、7 ビットで済む。効率 4/7
