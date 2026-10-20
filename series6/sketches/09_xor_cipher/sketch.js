// ============================================
// 09 XOR 暗号（鍵の良し悪しが絵でわかる）
// 画像の各ビットを「鍵」と XOR すると暗号になる。もう一度 XOR すると元に戻る
// 鍵が短くてくり返しだと、絵の形が透けて見える（有名な「ECB ペンギン」問題）
// 1 = 短い鍵 / 2 = 長い鍵 / 3 = ランダムな鍵（ワンタイムパッド） / クリックで復号⇄暗号
// ============================================

let w = 64, h = 48;
let plain = [];
let keyMode = 1;
let showDecrypted = false;
let keyBits = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  // 元の絵：ハート
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx = (x - w / 2) / 14, ny = (y - h / 2 + 4) / 14;
      let heart = pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny < 0;
      plain.push(heart ? 1 : 0);
    }
  }
  makeKey();
}

// ★ 鍵をつくる
function makeKey() {
  keyBits = [];
  if (keyMode === 1) {
    let pattern = [1, 0, 1, 1, 0, 0, 1, 0]; // 8 ビットをくり返す
    for (let i = 0; i < plain.length; i++) keyBits.push(pattern[i % 8]);
  } else if (keyMode === 2) {
    let pattern = [];
    for (let i = 0; i < 100; i++) pattern.push(random() < 0.5 ? 1 : 0); // 100 ビットをくり返す
    for (let i = 0; i < plain.length; i++) keyBits.push(pattern[i % 100]);
  } else {
    for (let i = 0; i < plain.length; i++) keyBits.push(random() < 0.5 ? 1 : 0); // 絵と同じ長さの乱数
  }
}

function draw() {
  background(230, 40, 10);
  let cipher = plain.map((b, i) => b ^ keyBits[i]); // ★ 暗号化：XOR
  let decrypted = cipher.map((b, i) => b ^ keyBits[i]); // ★ 復号：もう一度 XOR

  let cell = min((width - 160) / (w * 3 + 8), (height - 220) / h);
  drawImg(plain, 40, 130, cell, '元の絵');
  drawImg(keyBits, 40 + (w + 4) * cell, 130, cell, '鍵');
  drawImg(showDecrypted ? decrypted : cipher, 40 + (w + 4) * cell * 2, 130, cell, showDecrypted ? '復号（鍵でもう一度 XOR）' : '暗号文（絵 XOR 鍵）');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  let names = ['', '8 ビットのくり返し', '100 ビットのくり返し', '絵と同じ長さの乱数（ワンタイムパッド）'];
  text('鍵：' + names[keyMode] + '（1〜3）　クリックで ' + (showDecrypted ? '暗号文' : '復号') + ' を表示', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('XOR：同じなら 0、ちがえば 1。a ⊕ k ⊕ k = a なので、同じ鍵で戻せる。鍵がくり返しだと、絵の模様が暗号文に残ってしまう', 20, 68);
}

function drawImg(img, ox, oy, cell, label) {
  noStroke();
  for (let i = 0; i < img.length; i++) {
    fill(img[i] ? 45 : 230, img[i] ? 90 : 30, img[i] ? 100 : 20);
    rect(ox + (i % w) * cell, oy + floor(i / w) * cell, cell - 0.5, cell - 0.5);
  }
  fill(0, 0, 100);
  textSize(15);
  text(label, ox, oy - 10);
}

function keyPressed() {
  if (key >= '1' && key <= '3') {
    keyMode = int(key);
    makeKey();
  }
}
function mousePressed() {
  showDecrypted = !showDecrypted;
}

// ---------- やってみよう ----------
// 1. 鍵 1 の暗号文を見る。ハートが縞模様ごしに見える＝暗号として失格
// 2. 鍵 3 の暗号文は、どう見ても乱数。これが「解読不可能」と証明された唯一の暗号
// 3. でも鍵 3 は「絵と同じ長さの鍵」を安全に相手に渡す必要がある。どうやって？（鍵配送問題）
