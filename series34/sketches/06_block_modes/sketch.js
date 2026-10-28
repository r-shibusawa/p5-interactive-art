// ============================================
// 06 暗号利用モード（ECB・CBC・CTR）
// ブロック暗号は 16 ビットずつしか暗号化できない。長いデータ（画像）をどうつなぐか = 利用モード
//   ECB：ブロックごとにそのまま暗号化 → 同じ色のブロックは同じ暗号文 → 絵の輪郭が透けて見える！
//   CBC：1 つ前の暗号文を XOR してから暗号化 → 連鎖して模様が消える
//   CTR：カウンタ（0, 1, 2, …）を暗号化した列を XOR → ストリーム暗号のように使える
// 1〜3 = 画像 / ←→ = 鍵を変える / I = 初期値（IV）を変える / D = 復号して見せる
// ※ 教育用（05 と同じおもちゃの 16 ビット暗号）。実際の安全な暗号には使わない
// ============================================

const SBOX = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2];
let INV = [];
let W = 160, H = 112;        // ★ 画像の大きさ（4 画素 × 4 ビット = 1 ブロック）
let cipherKey = 0x5A3C, iv = 0x0F0F;
let picture = 1, showDecrypt = false;
let plainBlocks = [], layers = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  for (let i = 0; i < 16; i++) INV[SBOX[i]] = i;
  for (let name of ['plain', 'ecb', 'cbc', 'ctr']) { layers[name] = createGraphics(W, H); layers[name].pixelDensity(1); }
  makePicture();
}

// 画像を描いて、1 画素 = 4 ビット（16 段階の明るさ）にする
function makePicture() {
  let g = createGraphics(W, H);
  g.pixelDensity(1);
  g.background(255);
  g.noStroke();
  if (picture === 1) {          // ペンギン風
    g.fill(20); g.ellipse(80, 62, 74, 92); g.ellipse(80, 22, 46, 40);
    g.fill(240); g.ellipse(80, 70, 48, 70); g.ellipse(72, 22, 12, 14); g.ellipse(88, 22, 12, 14);
    g.fill(250, 160, 30); g.triangle(74, 30, 86, 30, 80, 40); g.ellipse(66, 108, 22, 8); g.ellipse(94, 108, 22, 8);
  } else if (picture === 2) {   // 文字
    g.fill(30); g.textSize(64); g.textStyle(BOLD); g.textAlign(CENTER, CENTER); g.text('p5', 80, 52);
    g.fill(120); g.rect(10, 96, 140, 8);
  } else {                      // しま模様と円
    for (let i = 0; i < 8; i++) { g.fill(i % 2 ? 60 : 200); g.rect(i * 20, 0, 20, H); }
    g.fill(0); g.circle(80, 56, 60);
  }
  g.loadPixels();
  plainBlocks = [];
  for (let y = 0; y < H; y++) for (let bx = 0; bx < W / 4; bx++) {
    let v = 0;
    for (let k = 0; k < 4; k++) {
      let i = 4 * (y * W + bx * 4 + k);
      v = (v << 4) | floor(g.pixels[i] / 16);      // 明るさ 0〜255 → 0〜15
    }
    plainBlocks.push(v);
  }
  g.remove();
  encryptAll();
}

// ★ 3 つのモードで暗号化（showDecrypt なら、そのあと復号もする）
function encryptAll() {
  let n = plainBlocks.length, ecb = [], cbc = [], ctr = [];
  let prev = iv;
  for (let i = 0; i < n; i++) {
    let p = plainBlocks[i];
    ecb[i] = enc(p);                         // ECB：そのまま
    cbc[i] = enc(p ^ prev); prev = cbc[i];   // CBC：前の暗号文を混ぜる
    ctr[i] = p ^ enc((iv + i) & 0xFFFF);     // CTR：カウンタを暗号化して XOR
  }
  if (showDecrypt) {
    let prevC = iv;
    for (let i = 0; i < n; i++) {
      let c = cbc[i];
      ecb[i] = dec(ecb[i]);
      cbc[i] = dec(c) ^ prevC; prevC = c;
      ctr[i] = ctr[i] ^ enc((iv + i) & 0xFFFF);
    }
  }
  paint(layers.plain, plainBlocks);
  paint(layers.ecb, ecb);
  paint(layers.cbc, cbc);
  paint(layers.ctr, ctr);
}

function paint(g, blocks) {
  g.loadPixels();
  for (let b = 0; b < blocks.length; b++) {
    let y = floor(b / (W / 4)), bx = b % (W / 4);
    for (let k = 0; k < 4; k++) {
      let v = ((blocks[b] >> (12 - 4 * k)) & 0xF) * 17;
      let i = 4 * (y * W + bx * 4 + k);
      g.pixels[i] = v; g.pixels[i + 1] = v; g.pixels[i + 2] = v; g.pixels[i + 3] = 255;
    }
  }
  g.updatePixels();
}

function draw() {
  background(16, 18, 24);
  noStroke();
  fill(240);
  textSize(18);
  text('暗号利用モード　1〜3 画像　←→ 鍵 ' + hex4(cipherKey) + '　I 初期値 IV ' + hex4(iv) + '　D 復号 ' + (showDecrypt ? 'ON' : 'off'), 24, 34);
  fill(150);
  textSize(14);
  text('1 ブロック = 横に並んだ 4 画素（16 ビット）。中身は 05 と同じおもちゃの暗号　｜ 教育用', 24, 56);

  let pw = (width - 100) / 4, ph = pw * H / W;
  if (ph > height - 220) { ph = height - 220; pw = ph * W / H; }
  let names = [['plain', '平文（元の画像）', '—'], ['ecb', 'ECB', '同じブロック → 同じ暗号文。輪郭が見える ✗'],
    ['cbc', 'CBC', '前の暗号文を XOR。IV が要る'], ['ctr', 'CTR', 'カウンタを暗号化して XOR。並列にできる']];
  noSmooth();
  for (let i = 0; i < 4; i++) {
    let x = 20 + i * (pw + 20), y = 100;
    image(layers[names[i][0]], x, y, pw, ph);
    fill(i === 1 ? color(255, 120, 120) : 230);
    textSize(18);
    text(names[i][1] + (showDecrypt && i > 0 ? ' → 復号' : ''), x, y - 12);
    fill(160);
    textSize(13);
    text(names[i][2], x, y + ph + 22);
  }
  smooth();

  // 図：3 つのモードのつなぎ方
  let dy = 100 + ph + 70;
  fill(200);
  textSize(15);
  text('ECB：C[i] = E(P[i])', 24, dy);
  text('CBC：C[i] = E(P[i] ⊕ C[i−1])　C[−1] = IV', 24, dy + 26);
  text('CTR：C[i] = P[i] ⊕ E(IV + i)', 24, dy + 52);
  fill(150);
  textSize(14);
  text('同じ鍵・同じ IV で 2 枚暗号化すると CTR は 03 のワンタイムパッドの鍵の使い回しと同じ失敗になる。IV は毎回変えること', 24, dy + 86);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { picture = int(key); makePicture(); return false; }
  if (key === LEFT_ARROW || key === RIGHT_ARROW) cipherKey = floor(random(65536));
  if (key === 'i' || key === 'I') iv = floor(random(65536));
  if (key === 'd' || key === 'D') showDecrypt = !showDecrypt;
  encryptAll();
  return false;
}

// ---------- やってみよう ----------
// 1. 画像 1〜3 で ECB を見比べよう。どんな画像だと輪郭がいちばんよく見える？
// 2. 鍵を変えても ECB の輪郭は消えない。なぜ？（鍵ではなく「モード」の問題）
// 3. encryptAll の CBC で、暗号文の 1 ブロックだけ壊して（cbc[100] ^= 1）から復号すると、何ブロック壊れる？ CTR では？
// 4. W, H を大きくすると細かい絵になる。ブロックを縦 2 × 横 2 画素にするとどう見える？

// ==================================================
// ここから下は「道具」（05 と同じおもちゃの 16 ビット SPN 暗号と、その逆）
// ==================================================
function subst(x, box) { let y = 0; for (let i = 0; i < 4; i++) y |= box[(x >> (4 * i)) & 0xF] << (4 * i); return y; }
function pboxIndex(b) { return (b % 4) * 4 + (b >> 2); }
function permute(x) { let y = 0; for (let b = 0; b < 16; b++) if ((x >> (15 - b)) & 1) y |= 1 << (15 - pboxIndex(b)); return y; }
function roundKey(k, r) { let s = (3 * r) % 16; return (((k << s) | (k >>> (16 - s))) ^ (0x1357 * (r + 1))) & 0xFFFF; }
const ROUNDS = 4;
function enc(x) {
  for (let r = 0; r < ROUNDS; r++) { x ^= roundKey(cipherKey, r); x = subst(x, SBOX); if (r < ROUNDS - 1) x = permute(x); }
  return x ^ roundKey(cipherKey, ROUNDS);
}
function dec(x) {   // 逆順にたどる（P ボックスは 4×4 の転置なので、もう一度かけると元に戻る）
  x ^= roundKey(cipherKey, ROUNDS);
  for (let r = ROUNDS - 1; r >= 0; r--) { if (r < ROUNDS - 1) x = permute(x); x = subst(x, INV); x ^= roundKey(cipherKey, r); }
  return x;
}
function hex4(v) { return '0x' + v.toString(16).toUpperCase().padStart(4, '0'); }
