// ============================================
// 15 カメラ映像を暗号化 📷
// カメラの映像を 160×120 に縮め、横に並んだ 4 画素（各色 4 ビット × 4 = 16 ビット）を 1 ブロックとして
// 05 のおもちゃの暗号で毎フレーム暗号化する。ECB だと動く輪郭が見えてしまい、CTR だと砂嵐になる
// 1 = ECB / 2 = CTR / D = 表示の切りかえ（暗号文 → 正しい鍵で復号 → 違う鍵で復号）/ ←→ = 鍵を変える
// カメラが使えないときは、自動で動く絵を暗号化する
// ※ 教育用。実際の安全な暗号には使わない
// ============================================

let VW = 160, VH = 120;          // ★ 暗号化する映像の大きさ
let cap, out, fake;
let cipherKey = 0x6C1F, wrongKey = 0x6C1E;   // 違う鍵は 1 ビットだけ違う
let modeNo = 1, view = 0;        // view：0 暗号文 1 正しい鍵で復号 2 違う鍵で復号
let encT, decT, decWrong, stream = [], streamWrong = [];
const SBOX = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(VW, VH);
  cap.hide();
  out = createGraphics(VW, VH); out.pixelDensity(1);
  fake = createGraphics(VW, VH); fake.pixelDensity(1);
  makeTables();
}

// ★ 鍵が決まったら、65536 通りの入力すべての暗号文を表にしておく（毎フレーム計算しなくて済む）
function makeTables() {
  encT = new Uint16Array(65536); decT = new Uint16Array(65536); decWrong = new Uint16Array(65536);
  let wrongEnc = new Uint16Array(65536);
  for (let x = 0; x < 65536; x++) { encT[x] = enc(x, cipherKey); wrongEnc[x] = enc(x, wrongKey); }
  for (let x = 0; x < 65536; x++) { decT[encT[x]] = x; decWrong[wrongEnc[x]] = x; }
  // CTR 用の鍵の列：カウンタ i を暗号化したもの（ブロックの数 × 3 色）
  let nBlocks = VW / 4 * VH * 3;
  stream = new Uint16Array(nBlocks); streamWrong = new Uint16Array(nBlocks);
  for (let i = 0; i < nBlocks; i++) { stream[i] = encT[i & 0xFFFF]; streamWrong[i] = wrongEnc[i & 0xFFFF]; }
}

function camReady() { return cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2; }

function draw() {
  background(10, 12, 16);
  // 元の映像（カメラか、代わりの絵）
  let src;
  if (camReady()) { cap.loadPixels(); src = cap.pixels.length >= VW * VH * 4 ? cap.pixels : null; }
  if (!src) { drawFake(); fake.loadPixels(); src = fake.pixels; }

  // ★ 暗号化（と復号）：4 画素 × 4 ビットを 1 ブロックに
  out.loadPixels();
  let o = out.pixels, b = 0;
  for (let y = 0; y < VH; y++) {
    for (let bx = 0; bx < VW; bx += 4) {
      for (let ch = 0; ch < 3; ch++) {
        let block = 0;
        for (let k = 0; k < 4; k++) block = (block << 4) | (src[4 * (y * VW + bx + k) + ch] >> 4);
        let c = modeNo === 1 ? encT[block] : block ^ stream[b];      // 1 = ECB、2 = CTR
        let v = c;
        if (view === 1) v = modeNo === 1 ? decT[c] : c ^ stream[b];
        if (view === 2) v = modeNo === 1 ? decWrong[c] : c ^ streamWrong[b];   // 違う鍵の列
        for (let k = 0; k < 4; k++) o[4 * (y * VW + bx + k) + ch] = ((v >> (12 - 4 * k)) & 0xF) * 17;
        b++;
      }
      for (let k = 0; k < 4; k++) o[4 * (y * VW + bx + k) + 3] = 255;
    }
  }
  out.updatePixels();

  // 表示
  let bigW = min(width * 0.62, (height - 150) * VW / VH), bigH = bigW * VH / VW;
  let smallW = min(width - bigW - 80, bigW * 0.5), smallH = smallW * VH / VW;
  noSmooth();
  image(out, 30, 100, bigW, bigH);
  if (camReady()) image(cap, bigW + 60, 100, smallW, smallH);
  else image(fake, bigW + 60, 100, smallW, smallH);
  smooth();

  noStroke();
  fill(240);
  textSize(18);
  text('カメラ映像を暗号化　1 ECB　2 CTR　D 表示切りかえ　←→ 鍵 ' + hex4(cipherKey), 24, 34);
  fill(150);
  textSize(14);
  text((camReady() ? 'カメラ使用中' : 'カメラなし → 動く絵で代用') + '　1 ブロック = 横 4 画素 × 4 ビット（色ごと）　｜ 教育用', 24, 56);
  let viewName = ['暗号文', '正しい鍵で復号', '1 ビットだけ違う鍵で復号'][view];
  fill(modeNo === 1 && view === 0 ? color(255, 120, 120) : color(120, 230, 150));
  textSize(20);
  text((modeNo === 1 ? 'ECB' : 'CTR') + '：' + viewName, 30, 90);
  fill(200);
  textSize(15);
  text('元の映像', bigW + 60, 90);
  let tx = bigW + 60, ty = 130 + smallH;
  fill(170);
  textSize(14);
  let msgs = modeNo === 1
    ? ['ECB：同じ色の 4 画素 → 同じ暗号文', '背景や服の単色の部分が同じ模様になり、', '人の輪郭や動きが透けて見える ✗']
    : ['CTR：ブロックごとに違う鍵の列を XOR', '同じ色でも場所が違えば別の暗号文', '→ 砂嵐にしか見えない ✓（IV は毎回変える）'];
  if (view === 2) msgs = ['鍵が 1 ビット違うだけで、', '復号した映像はまったく読めない', '（05 のなだれ効果）'];
  for (let i = 0; i < msgs.length; i++) text(msgs[i], tx, ty + i * 22);
}

// カメラがないときの代わり：動く円と文字
function drawFake() {
  fake.background(230, 220, 200);
  fake.noStroke();
  let t = millis() / 1000;
  fake.fill(40, 60, 160);
  fake.circle(80 + 50 * Math.cos(t), 60 + 30 * Math.sin(t * 1.3), 50);
  fake.fill(200, 40, 40);
  fake.rect(20 + 30 * Math.sin(t * 0.7), 80, 40, 30);
  fake.fill(20);
  fake.textSize(28);
  fake.textStyle(BOLD);
  fake.text('HELLO', 30, 40);
}

function keyPressed() {
  if (key === '1') modeNo = 1;
  if (key === '2') modeNo = 2;
  if (key === 'd' || key === 'D') view = (view + 1) % 3;
  if (key === LEFT_ARROW || key === RIGHT_ARROW) {
    cipherKey = floor(random(65536));
    wrongKey = cipherKey ^ 1;
    makeTables();
  }
  return false;
}

// ---------- やってみよう ----------
// 1. ECB で手をふると、暗号文の中でも手が動くのが見える。CTR では？
// 2. 単色の服・壁の前と、模様のある服の前では、ECB の「透け方」はどう違う？
// 3. VW, VH を 320, 240 にすると細かくなる。ECB の輪郭はもっとはっきりする？（重くなったら戻す）
// 4. 作品のアイデア：映像の一部だけ（顔のあたりだけ）を暗号化する「モザイク」をつくってみよう

// ==================================================
// ここから下は「道具」（05 と同じおもちゃの 16 ビット SPN 暗号）
// ==================================================
function subst(x) { let y = 0; for (let i = 0; i < 4; i++) y |= SBOX[(x >> (4 * i)) & 0xF] << (4 * i); return y; }
function permute(x) { let y = 0; for (let b = 0; b < 16; b++) if ((x >> (15 - b)) & 1) y |= 1 << (15 - ((b % 4) * 4 + (b >> 2))); return y; }
function roundKey(k, r) { let s = (3 * r) % 16; return (((k << s) | (k >>> (16 - s))) ^ (0x1357 * (r + 1))) & 0xFFFF; }
function enc(x, k) { for (let r = 0; r < 4; r++) { x ^= roundKey(k, r); x = subst(x); if (r < 3) x = permute(x); } return x ^ roundKey(k, 4); }
function hex4(v) { return '0x' + v.toString(16).toUpperCase().padStart(4, '0'); }
