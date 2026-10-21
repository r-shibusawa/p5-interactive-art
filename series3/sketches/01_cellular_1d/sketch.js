// ============================================
// 01 1次元セル・オートマトン
// 1列のマス（セル）が「自分と両どなり」だけを見て、次の世代の色を決める
// 8通りのルールを 0/1 で書くと「ルール番号」になる（0〜255）
// ←→ でルール変更 / 数字キー 1〜4 で有名なルール / クリックで最初の1列をランダムに
// ============================================

let rule = 30; // ルール番号（有名：30 = カオス、90 = フラクタル、110 = 複雑、184 = 交通）
let cells = []; // 今の世代（0 か 1）
let cellSize = 4;
let row = 0; // いま描いている行
let randomStart = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  reset();
}

function reset() {
  background(255);
  row = 0;
  cells = new Array(floor(width / cellSize)).fill(0);
  if (randomStart) {
    for (let i = 0; i < cells.length; i++) cells[i] = random() < 0.5 ? 1 : 0;
  } else {
    cells[floor(cells.length / 2)] = 1; // 真ん中に1つだけ
  }
}

function draw() {
  // 今の世代を1行描く
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 1) {
      noStroke();
      fill(20);
      rect(i * cellSize, 50 + row * cellSize, cellSize, cellSize);
    }
  }

  // 次の世代を計算する
  let next = new Array(cells.length).fill(0);
  for (let i = 0; i < cells.length; i++) {
    let left = cells[(i - 1 + cells.length) % cells.length]; // 端は反対側とつなぐ
    let me = cells[i];
    let right = cells[(i + 1) % cells.length];
    next[i] = applyRule(left, me, right);
  }
  cells = next;

  row++;
  if (50 + row * cellSize > height) {
    noLoop(); // 画面の下まで来たら止まる（←→ やクリックで再開）
  }

  // 説明
  fill(255);
  noStroke();
  rect(0, 0, width, 46);
  fill(0);
  textSize(16);
  text('ルール ' + rule + '（←→ で変更、1〜4 で有名なルール）　2進数: ' + rule.toString(2).padStart(8, '0') + '　クリックで最初の列をランダムに', 16, 30);
}

// ルール：左・自分・右 の3つ（000〜111 = 0〜7）→ ルール番号のそのビットが 0 か 1 か
function applyRule(a, b, c) {
  let index = a * 4 + b * 2 + c; // 3つの 0/1 を 0〜7 の数にする
  return (rule >> index) & 1; // ルール番号の index 番目のビットを取り出す
}

function keyPressed() {
  if (key === RIGHT_ARROW) rule = (rule + 1) % 256;
  if (key === LEFT_ARROW) rule = (rule + 255) % 256;
  if (key === '1') rule = 30;
  if (key === '2') rule = 90;
  if (key === '3') rule = 110;
  if (key === '4') rule = 184;
  reset();
  loop();
}

function mousePressed() {
  randomStart = !randomStart;
  reset();
  loop();
}

// ---------- やってみよう ----------
// 1. ルール 90 → シェルピンスキーの三角形（シリーズ2！）が出てくる
// 2. ルール 30 の真ん中の列を上から読むと、ほぼランダム。実は乱数に使われたことがある
// 3. 256 個のルールを ←→ で全部見て、お気に入りを見つけよう
