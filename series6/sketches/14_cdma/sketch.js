// ============================================
// 14 符号で分ける（CDMA）（おまけ）
// 同じ周波数・同じ時間に、何人もが同時に送っているのに、ちゃんと取り出せる
// 各ユーザーに「直交する符号」を割り当て、ビットを符号で広げて足し算して送る
// 受信側は自分の符号をかけて足す（相関）と、自分のビットだけ出てくる
// クリックでビットをランダムに / 1〜4 で取り出すユーザー
// ============================================

// ★ ウォルシュ符号（たがいに直交：かけて足すと 0）
let codes = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, -1, 1, -1, 1, -1, 1, -1],
  [1, 1, -1, -1, 1, 1, -1, -1],
  [1, -1, -1, 1, 1, -1, -1, 1],
];
let userBits = [[1, 0, 1], [0, 1, 1], [1, 1, 0], [0, 0, 1]];
let listenTo = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(230, 40, 10);
  let L = 8, nBits = 3;
  let left = 60, right = width - 60;
  let chipW = (right - left) / (L * nBits);

  // ---- 各ユーザーの送信信号 = ビット（±1）× 符号 ----
  let signals = userBits.map((bits, u) => {
    let s = [];
    for (let b of bits) for (let c of codes[u]) s.push((b ? 1 : -1) * c);
    return s;
  });
  // ---- 電波の上では全部足し算される ----
  let sum = new Array(L * nBits).fill(0);
  for (let s of signals) for (let i = 0; i < s.length; i++) sum[i] += s[i];

  // 描く：4 ユーザー
  for (let u = 0; u < 4; u++) {
    let y = 120 + u * 70;
    drawSteps(signals[u], left, right, y, 20, u === listenTo ? 45 : 170, 'ユーザー ' + (u + 1) + '  ビット ' + userBits[u].join('') + '  符号 ' + codes[u].map((c) => (c > 0 ? '+' : '−')).join(''));
  }
  // 合成
  drawSteps(sum, left, right, 440, 10, 0, '電波の上（全員の足し算）', true);

  // ---- 受信：聞きたいユーザーの符号をかけて、8 個ずつ足す ----
  let decoded = [];
  for (let b = 0; b < nBits; b++) {
    let acc = 0;
    for (let i = 0; i < L; i++) acc += sum[b * L + i] * codes[listenTo][i];
    decoded.push(acc);
  }
  let y = 560;
  noStroke();
  fill(0, 0, 100);
  textSize(15);
  text('受信：ユーザー ' + (listenTo + 1) + ' の符号をかけて 8 個ずつ足す →', left, y - 14);
  for (let b = 0; b < nBits; b++) {
    let x = left + b * L * chipW;
    fill(decoded[b] > 0 ? 45 : 230, decoded[b] > 0 ? 90 : 30, decoded[b] > 0 ? 100 : 35);
    rect(x + 4, y, L * chipW - 8, 50, 8);
    fill(0, 0, decoded[b] > 0 ? 10 : 90);
    textAlign(CENTER, CENTER);
    textSize(20);
    text((decoded[b] > 0 ? '+' : '') + decoded[b] + ' → ' + (decoded[b] > 0 ? 1 : 0), x + (L * chipW) / 2, y + 25);
    textAlign(LEFT, BASELINE);
  }
  fill(0, 0, 100);
  textSize(18);
  text('1〜4：取り出すユーザー　クリックでビットをランダムに　　4 人が同時に同じ周波数で送っても、分けられる', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('他のユーザーの符号は「かけて足すと 0」になるので消える（直交）。3G 携帯電話や GPS で使われている', 20, 68);
}

function drawSteps(arr, left, right, mid, h, hue, label, thick) {
  let w = (right - left) / arr.length;
  stroke(0, 0, 25);
  line(left, mid, right, mid);
  stroke(hue, hue ? 80 : 0, hue ? 100 : 90);
  strokeWeight(thick ? 3 : 2);
  noFill();
  beginShape();
  for (let i = 0; i < arr.length; i++) {
    vertex(left + i * w, mid - arr[i] * h);
    vertex(left + (i + 1) * w, mid - arr[i] * h);
  }
  endShape();
  noStroke();
  fill(hue, hue ? 80 : 0, hue ? 100 : 90);
  textSize(14);
  text(label, left, mid - h * (thick ? 4.5 : 1) - 8);
}

function keyPressed() {
  if (key >= '1' && key <= '4') listenTo = int(key) - 1;
}
function mousePressed() {
  userBits = userBits.map((bits) => bits.map(() => (random() < 0.5 ? 1 : 0)));
}

// ---------- やってみよう ----------
// 1. 1〜4 を押して、合成波は同じなのに取り出されるビットが変わるのを確認
// 2. 符号を 2 つ同じにすると（直交でなくなる）、取り出せなくなる
// 3. 合成波に雑音を足しても取り出せる？（sum[i] += random(-1, 1)）
