// ============================================
// 03 ワンタイムパッドと XOR
// 1 ビットずつ「鍵」と XOR（同じなら 0、違えば 1）。鍵が完全にランダムで 1 回きりなら、理論上ぜったいに破れない。
// でも同じ鍵を 2 回使うと：C1 ⊕ C2 = (A ⊕ K) ⊕ (B ⊕ K) = A ⊕ B　→ 鍵が消えて 2 枚の絵が重なって見える！
// ドラッグ = 絵 A に描く（右ドラッグ/Shift で消す）/ スペース = 鍵の使い回し ON/OFF / K = 新しい鍵 / C = 絵 A を消す / 1 = 絵 A を戻す
// ※ 教育用。実際の安全な暗号には使わない
// ============================================

let cols = 40, rows = 28;      // ★ ビットの数（横 × 縦）
let imgA = [], imgB = [], key1 = [], key2 = [];
let reuse = true;              // true = 同じ鍵を 2 回使う（ダメな使い方）
let cell = 8, panels = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  drawPictureA();
  // 絵 B：大きな星
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let dx = x - cols * 0.5, dy = y - rows * 0.52;
    let a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
    let edge = 7 + 5 * Math.cos(5 * a + 1.57);
    imgB[y * cols + x] = r < edge ? 1 : 0;
  }
  newKeys();
}

// 絵 A：にこにこ顔
function drawPictureA() {
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let dx = x - cols * 0.5, dy = y - rows * 0.5, r = Math.hypot(dx, dy * 1.1);
    let face = r > 10 && r < 12.5;
    let eye = Math.hypot(dx + 4, dy + 3) < 1.8 || Math.hypot(dx - 4, dy + 3) < 1.8;
    let mouth = dy > 1 && dy < 4.5 && Math.abs(Math.hypot(dx, dy - 0) - 5.5) < 1 ;
    imgA[y * cols + x] = (face || eye || mouth) ? 1 : 0;
  }
}

function newKeys() {
  for (let i = 0; i < cols * rows; i++) {
    key1[i] = random() < 0.5 ? 1 : 0;          // ★ 完全にランダムな鍵
    key2[i] = random() < 0.5 ? 1 : 0;
  }
}

function draw() {
  background(12, 16, 22);
  let kB = reuse ? key1 : key2;
  let C1 = [], C2 = [], X = [];
  for (let i = 0; i < cols * rows; i++) {
    C1[i] = imgA[i] ^ key1[i];        // ★ XOR で暗号化
    C2[i] = imgB[i] ^ kB[i];
    X[i] = C1[i] ^ C2[i];             // 盗聴者は C1 と C2 だけを XOR する
  }
  // 3 列 × 2 段のパネル
  let pw = (width - 80) / 3, ph = (height - 200) / 2;
  cell = min(pw / cols, (ph - 30) / rows);
  panels = [];
  let items = [
    ['絵 A（平文、ドラッグで描く）', imgA, color(120, 200, 255)],
    ['鍵 K1（ランダム）', key1, color(200, 200, 200)],
    ['C1 = A ⊕ K1（送る暗号文）', C1, color(255, 190, 90)],
    ['絵 B（別の平文）', imgB, color(120, 200, 255)],
    [reuse ? '鍵 K1 をもう一度使う ✗' : '鍵 K2（新しいランダム）', kB, reuse ? color(255, 110, 110) : color(200, 200, 200)],
    ['C2 = B ⊕ ' + (reuse ? 'K1' : 'K2'), C2, color(255, 190, 90)],
  ];
  for (let i = 0; i < 6; i++) {
    let px = 20 + (i % 3) * (pw + 20), py = 80 + floor(i / 3) * (ph + 10);
    drawBits(px, py, items[i][0], items[i][1], items[i][2]);
    if (i === 0) panels.push({ x: px, y: py + 24 });
  }

  // ヘッダー
  noStroke();
  fill(240);
  textSize(18);
  text('ワンタイムパッド（XOR）　スペース：鍵の使い回し ' + (reuse ? 'ON ✗' : 'OFF ✓') + '　K 新しい鍵　C 消す　1 戻す', 20, 32);
  fill(150);
  textSize(14);
  text('XOR：0⊕0=0　0⊕1=1　1⊕0=1　1⊕1=0　同じ鍵でもう一度 XOR すると元に戻る（A ⊕ K ⊕ K = A）　｜ 教育用', 20, 56);

  // 下：盗聴者の視点
  let bx = 20, by = height - 110;
  fill(reuse ? color(255, 110, 110) : color(120, 230, 150));
  textSize(17);
  text('盗聴者：C1 ⊕ C2 = ' + (reuse ? 'A ⊕ B（鍵が消えた！ 2 枚の絵が透けて見える）' : 'ただのノイズ（鍵が別々なので何も分からない）'), bx, by);
  let small = min(2.6, (height - by - 20) / rows);
  noStroke();
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    fill(X[y * cols + x] ? (reuse ? color(255, 120, 120) : 200) : 30);
    rect(width - 30 - cols * small * 1.5 + x * small * 1.5, by - 20 + y * small * 1.5 - rows * small * 0.5, small * 1.5, small * 1.5);
  }
  // 1 行ぶんの XOR を 0/1 で
  fill(170);
  textSize(14);
  let r = floor(rows / 2), s = '';
  for (let x = 0; x < 20; x++) s += imgA[r * cols + x];
  let k = ''; for (let x = 0; x < 20; x++) k += key1[r * cols + x];
  let c = ''; for (let x = 0; x < 20; x++) c += C1[r * cols + x];
  text('A の真ん中の行  ' + s + '\nK1             ' + k + '\nA ⊕ K1         ' + c, bx, by + 26);
}

function drawBits(x, y, title, bits, col) {
  noStroke();
  fill(220);
  textSize(14);
  text(title, x, y + 14);
  fill(28, 34, 44);
  rect(x, y + 24, cols * cell, rows * cell);
  fill(col);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++)
    if (bits[j * cols + i]) rect(x + i * cell, y + 24 + j * cell, cell - 0.5, cell - 0.5);
}

function paint() {
  if (panels.length === 0) return;
  let p = panels[0];
  let i = floor((mouseX - p.x) / cell), j = floor((mouseY - p.y) / cell);
  if (i < 0 || j < 0 || i >= cols || j >= rows) return;
  let erase = mouseButton === RIGHT || keyIsDown(SHIFT);
  imgA[j * cols + i] = erase ? 0 : 1;
}
function mousePressed() { paint(); }
function mouseDragged() { paint(); }

function keyPressed() {
  if (key === ' ') reuse = !reuse;
  if (key === 'k' || key === 'K') newKeys();
  if (key === 'c' || key === 'C') imgA.fill(0);
  if (key === '1') drawPictureA();
  return false;
}

// ---------- やってみよう ----------
// 1. 使い回し ON で絵 A に描くと、下の C1 ⊕ C2 にもそのまま現れる。鍵は毎回ランダムなのに！
// 2. 鍵を random() < 0.5 から random() < 0.1 にすると C1 から絵が透けて見える。「ランダムさ」が大事
// 3. 絵 B を全部 0（白紙）にすると C2 は鍵そのもの。「知っている平文」から鍵がバレる
// 4. ワンタイムパッドの弱点は「平文と同じ長さの鍵を、事前に安全に渡す」こと。どうやって渡す？（→ 08）

// ==================================================
// ここから下は「道具」：特になし（^ は JavaScript の XOR 演算子）
// ==================================================
