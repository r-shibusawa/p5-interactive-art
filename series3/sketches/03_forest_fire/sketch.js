// ============================================
// 03 森林火災モデル
// 空き地に木が生え、まれに雷が落ち、火はとなりの木に広がる
// 3つの確率だけで、森が「呼吸」するように燃えて再生する
// クリックで火をつける / マウス左右 = 木の生える確率 / 上下 = 雷の確率
// ============================================

const EMPTY = 0, TREE = 1, FIRE = 2;
let cellSize = 6;
let cols, rows, grid;
let pGrow = 0.01; // 空き地に木が生える確率
let pLightning = 0.00005; // 木に雷が落ちる確率

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cols = floor(width / cellSize);
  rows = floor((height - 50) / cellSize);
  grid = [];
  for (let x = 0; x < cols; x++) {
    grid.push([]);
    for (let y = 0; y < rows; y++) grid[x].push(random() < 0.5 ? TREE : EMPTY);
  }
}

function draw() {
  pGrow = map(mouseX, 0, width, 0.001, 0.03, true);
  pLightning = map(mouseY, 0, height, 0.0005, 0.000005, true);

  let next = [];
  let counts = [0, 0, 0];
  for (let x = 0; x < cols; x++) {
    next.push([]);
    for (let y = 0; y < rows; y++) {
      let c = grid[x][y];
      let n = c;
      if (c === FIRE) {
        n = EMPTY; // 燃えた木は空き地になる
      } else if (c === TREE) {
        // となりが燃えていたら燃え移る。または雷
        if (neighborOnFire(x, y) || random() < pLightning) n = FIRE;
      } else {
        if (random() < pGrow) n = TREE; // 空き地に木が生える
      }
      next[x].push(n);
      counts[n]++;
    }
  }
  grid = next;

  // 描く
  background(30, 30, 10);
  noStroke();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let c = grid[x][y];
      if (c === TREE) fill(110, 70, 55);
      else if (c === FIRE) fill(random(10, 40), 90, 100);
      else continue;
      rect(x * cellSize, 50 + y * cellSize, cellSize, cellSize);
    }
  }

  // グラフ風の表示
  fill(0, 0, 100);
  textSize(16);
  text('木 ' + counts[TREE] + '　火 ' + counts[FIRE] + '　生える確率 ' + nf(pGrow, 1, 3) + '（左右）　雷の確率 ' + nf(pLightning * 10000, 1, 2) + '/万（上下）　クリックで放火', 16, 30);
}

function neighborOnFire(x, y) {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      let nx = x + i, ny = y + j;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (grid[nx][ny] === FIRE) return true;
    }
  }
  return false;
}

function mousePressed() {
  let x = floor(mouseX / cellSize);
  let y = floor((mouseY - 50) / cellSize);
  if (x >= 0 && x < cols && y >= 0 && y < rows && grid[x][y] === TREE) grid[x][y] = FIRE;
}

// ---------- やってみよう ----------
// 1. 木が密集するまで待ってクリック → 大火災。すぐクリック → 小さな火。「密度」が大事
// 2. 雷をゼロにして、木が生える確率を最大に。全部木になったらクリック
// 3. 火が「斜め」に広がらないようにすると？（i, j の片方が 0 のときだけ）
