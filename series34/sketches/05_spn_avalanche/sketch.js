// ============================================
// 05 ブロック暗号の考え方（置換と転置）
// 16 ビットのおもちゃのブロック暗号（SPN）。1 ラウンド = 鍵を XOR → S ボックス（4 ビットずつ入れかえ）→ P ボックス（ビットの並べかえ）
// 入力を 1 ビットだけ変えると、ラウンドを重ねるごとに違いが広がり、最後は約半分（8 ビット）が変わる = なだれ効果
// 入力のビットをクリック = 変えるビットを選ぶ / ↑↓ = ラウンド数 / ←→ = 鍵を変える / スペース = 入力をランダムに
// ※ 教育用（16 ビットは小さすぎて総当たりできる）。実際の安全な暗号には使わない
// ============================================

const SBOX = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2]; // ★ 4 ビットの入れかえ表
let rounds = 4;            // ★ ラウンド数（1〜8）
let cipherKey = 0x3A94;    // ★ 16 ビットの鍵
let inputX = 0x1234;
let flipBit = 0;           // 変えるビット
let hist = [], meanFlip = 0;
let samples = 3000;        // ★ なだれ効果のグラフに使う試行回数

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  measure();
}

// ★ 暗号化。途中の状態を全部記録して返す（図に使う）
function encryptTrace(x, k, R) {
  let trace = [{ name: '入力', v: x }];
  for (let r = 0; r < R; r++) {
    x ^= roundKey(k, r);           trace.push({ name: 'R' + (r + 1) + ' 鍵XOR', v: x });
    x = subst(x);                  trace.push({ name: 'R' + (r + 1) + ' S', v: x });
    if (r < R - 1) { x = permute(x); trace.push({ name: 'R' + (r + 1) + ' P', v: x, perm: true }); }
  }
  x ^= roundKey(k, R);             trace.push({ name: '出力', v: x });
  return trace;
}

// なだれ効果：ランダムな入力の 1 ビットを変えて、出力が何ビット変わるかを数える
function measure() {
  hist = new Array(17).fill(0);
  let sum = 0;
  for (let s = 0; s < samples; s++) {
    let x = floor(random(65536)), b = floor(random(16));
    let a = encryptTrace(x, cipherKey, rounds), c = encryptTrace(x ^ (1 << b), cipherKey, rounds);
    let d = popcount(a[a.length - 1].v ^ c[c.length - 1].v);
    hist[d]++; sum += d;
  }
  meanFlip = sum / samples;
}

function draw() {
  background(14, 16, 24);
  noStroke();
  fill(240);
  textSize(18);
  text('おもちゃの SPN ブロック暗号（16 ビット）　ラウンド ' + rounds + '（↑↓）　鍵 ' + hex4(cipherKey) + '（←→）　スペース 入力', 24, 34);
  fill(150);
  textSize(14);
  text('上の段のビットをクリック → そのビットだけ変えた入力 B と比べる。赤 = A と B で違うビット　｜ 教育用', 24, 56);

  let tA = encryptTrace(inputX, cipherKey, rounds);
  let tB = encryptTrace(inputX ^ (1 << flipBit), cipherKey, rounds);
  let n = tA.length;
  let areaW = width * 0.6, bit = min(26, (areaW - 200) / 16);
  let rowH = min(46, (height - 120) / n);
  let x0 = 150, y0 = 84;
  for (let i = 0; i < n; i++) {
    let y = y0 + i * rowH;
    let diff = tA[i].v ^ tB[i].v;
    fill(170);
    textSize(13);
    text(tA[i].name, 20, y + bit * 0.7);
    // P ボックスの配線（前の行 → この行）
    if (tA[i].perm) {
      stroke(80, 100, 140, 120);
      strokeWeight(1);
      for (let b = 0; b < 16; b++) {
        let to = pboxIndex(b);
        let hot = (tA[i - 1].v ^ tB[i - 1].v) >> (15 - b) & 1;
        stroke(hot ? color(255, 100, 100, 200) : color(80, 100, 140, 90));
        line(x0 + b * bit + bit / 2, y - rowH + bit, x0 + to * bit + bit / 2, y);
      }
      noStroke();
    }
    for (let b = 0; b < 16; b++) {
      let v = (tA[i].v >> (15 - b)) & 1, d = (diff >> (15 - b)) & 1;
      fill(d ? color(255, 90, 90) : (v ? color(220, 225, 240) : color(44, 50, 66)));
      rect(x0 + b * bit, y, bit - 2, bit - 2, 3);
      if (i === 0 && 15 - b === flipBit) { noFill(); stroke(255, 210, 90); strokeWeight(2); rect(x0 + b * bit - 2, y - 2, bit + 2, bit + 2, 4); noStroke(); }
    }
    // S ボックスの区切り（4 ビットずつ）
    fill(200);
    text(popcount(diff) + ' ビット違う', x0 + 16 * bit + 12, y + bit * 0.7);
  }

  // ---- 右：なだれ効果のヒストグラム
  let gx = width * 0.64, gy = 110, gw = width * 0.33, gh = height * 0.5;
  fill(220);
  textSize(15);
  text('1 ビット変えたとき、出力で変わるビット数（' + samples + ' 回）', gx, gy - 20);
  let mx = max(hist);
  let bw = gw / 17;
  for (let d = 0; d <= 16; d++) {
    let h = hist[d] / mx * gh;
    fill(d === 8 ? color(255, 210, 90) : color(110, 140, 230));
    rect(gx + d * bw + 1, gy + gh - h, bw - 2, h, 2);
    fill(160);
    textSize(11);
    textAlign(CENTER);
    text(d, gx + d * bw + bw / 2, gy + gh + 16);
    textAlign(LEFT);
  }
  fill(240);
  textSize(18);
  text('平均 ' + nf(meanFlip, 1, 2) + ' ビット（理想は 8 = 半分）', gx, gy + gh + 50);
  fill(150);
  textSize(14);
  text('ラウンド 1：違いは S ボックス 1 つの中だけ\nラウンドを増やすと P ボックスで全体に広がる\n→ 本物の AES は 128 ビット・10 ラウンド以上', gx, gy + gh + 80);
}

function mousePressed() {
  let bit = min(26, (width * 0.6 - 200) / 16);
  let b = floor((mouseX - 150) / bit);
  if (mouseY > 84 && mouseY < 84 + bit && b >= 0 && b < 16) flipBit = 15 - b;
}

function keyPressed() {
  if (key === UP_ARROW) { rounds = min(8, rounds + 1); measure(); }
  if (key === DOWN_ARROW) { rounds = max(1, rounds - 1); measure(); }
  if (key === LEFT_ARROW || key === RIGHT_ARROW) { cipherKey = floor(random(65536)); measure(); }
  if (key === ' ') inputX = floor(random(65536));
  return false;
}

// ---------- やってみよう ----------
// 1. ラウンド 1 → 2 → 3 で平均は何ビットになる？ 何ラウンドで 8 に近づく？
// 2. SBOX を [0,1,2,...,15]（何もしない）にすると？ 線形な処理だけでは混ざらない
// 3. pboxIndex を「そのまま b を返す」にすると、違いが 4 ビットの中に閉じこめられる
// 4. 鍵は 65536 通り。1 秒に 1000 万回試せるコンピュータなら何秒で総当たりできる？

// ==================================================
// ここから下は「道具」（S ボックス・P ボックス・ラウンド鍵・ビットを数える）
// ==================================================
function subst(x) {
  let y = 0;
  for (let i = 0; i < 4; i++) y |= SBOX[(x >> (4 * i)) & 0xF] << (4 * i);
  return y;
}
// P ボックス：4×4 の表の行と列を入れかえる（左から b 番目のビット → pboxIndex(b) 番目へ）
function pboxIndex(b) { return (b % 4) * 4 + (b >> 2); }
function permute(x) {
  let y = 0;
  for (let b = 0; b < 16; b++) if ((x >> (15 - b)) & 1) y |= 1 << (15 - pboxIndex(b));
  return y;
}
function roundKey(k, r) {
  let s = (3 * r) % 16;
  return (((k << s) | (k >>> (16 - s))) ^ (0x1357 * (r + 1))) & 0xFFFF;
}
function popcount(v) { let c = 0; while (v) { c += v & 1; v >>>= 1; } return c; }
function hex4(v) { return '0x' + v.toString(16).toUpperCase().padStart(4, '0'); }
