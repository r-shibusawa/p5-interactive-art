// ============================================
// 02 ライフゲーム（Conway's Game of Life）
// 2次元のマス目。各セルは「生きている(1)」か「死んでいる(0)」
// ルールはたった3つ。でも、動く・増える・くり返す「生き物」が現れる
// ドラッグでセルを描く / スペース = 再生・停止 / R = ランダム / C = 全部消す / G = グライダー銃
// ============================================

let cellSize = 10;
let cols, rows;
let grid; // grid[x][y] = 0 or 1
let age; // 何世代生きているか（色に使う）
let running = false;
let generation = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cols = floor(width / cellSize);
  rows = floor((height - 50) / cellSize);
  grid = make2D(cols, rows);
  age = make2D(cols, rows);
  randomize();
}

function make2D(c, r) {
  let a = [];
  for (let x = 0; x < c; x++) a.push(new Array(r).fill(0));
  return a;
}

function randomize() {
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) grid[x][y] = random() < 0.25 ? 1 : 0;
  generation = 0;
}

function draw() {
  background(0, 0, 8);

  if (running && frameCount % 4 === 0) nextGeneration();

  // 描く
  noStroke();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (grid[x][y] === 1) {
        // 若いセルは黄色、長生きのセルは青に
        fill(map(min(age[x][y], 30), 0, 30, 50, 220), 70, 100);
        rect(x * cellSize, 50 + y * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }

  fill(0, 0, 100);
  textSize(16);
  text((running ? '▶ 再生中' : '❚❚ 停止中') + '　世代 ' + generation + '　スペース=再生/停止　ドラッグ=描く　R=ランダム　C=消す　G=グライダー銃', 16, 30);
}

// ★ ライフゲームのルール（これだけ！）
function nextGeneration() {
  let next = make2D(cols, rows);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let n = countNeighbors(x, y);
      if (grid[x][y] === 1 && (n === 2 || n === 3)) {
        next[x][y] = 1; // 生存：となりが 2 か 3 なら生き続ける
        age[x][y]++;
      } else if (grid[x][y] === 0 && n === 3) {
        next[x][y] = 1; // 誕生：死んでいるセルのとなりがちょうど 3 なら生まれる
        age[x][y] = 0;
      } else {
        next[x][y] = 0; // それ以外は死ぬ（過疎・過密）
      }
    }
  }
  grid = next;
  generation++;
}

// まわり8マスの生きているセルの数（端は反対側とつながっている）
function countNeighbors(x, y) {
  let sum = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      sum += grid[(x + i + cols) % cols][(y + j + rows) % rows];
    }
  }
  return sum;
}

function mouseDragged() {
  paint();
}
function mousePressed() {
  paint();
}
function paint() {
  let x = floor(mouseX / cellSize);
  let y = floor((mouseY - 50) / cellSize);
  if (x >= 0 && x < cols && y >= 0 && y < rows) {
    grid[x][y] = 1;
    age[x][y] = 0;
  }
}

function keyPressed() {
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') randomize();
  if (key === 'c' || key === 'C') {
    grid = make2D(cols, rows);
    generation = 0;
  }
  if (key === 'g' || key === 'G') gliderGun(5, 5);
  if (key === 'n' || key === 'N') nextGeneration(); // 1世代だけ進める
}

// ゴスパーのグライダー銃（グライダーを次々と発射する有名なパターン）
function gliderGun(ox, oy) {
  let pattern = [
    '........................O...........',
    '......................O.O...........',
    '............OO......OO............OO',
    '...........O...O....OO............OO',
    'OO........O.....O...OO..............',
    'OO........O...O.OO....O.O...........',
    '..........O.....O.......O...........',
    '...........O...O....................',
    '............OO......................',
  ];
  for (let j = 0; j < pattern.length; j++) {
    for (let i = 0; i < pattern[j].length; i++) {
      if (pattern[j][i] === 'O' && ox + i < cols && oy + j < rows) grid[ox + i][oy + j] = 1;
    }
  }
}

// ---------- やってみよう ----------
// 1. C で消して、横に3つ並べて描く → スペース。「ブリンカー」が点滅する
// 2. 斜めに階段状に5つ描く（グライダー）→ 動いていく！
// 3. ルールの数字（2, 3, 3）を変えると、まったく別の世界になる（→ 12 で本格的に）
