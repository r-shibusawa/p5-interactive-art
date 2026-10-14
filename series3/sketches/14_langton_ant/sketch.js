// ============================================
// 14 ラングトンのアリ（おまけ）
// ルールは2つだけ：白マスなら右に曲がって黒くする、黒マスなら左に曲がって白くする
// 1万歩ほどはめちゃくちゃ。でもそのあと突然「高速道路」をつくり始める
// マウス左右 = 速さ / クリックでアリを追加 / R でリセット
// ============================================

let cellSize = 4;
let cols, rows, grid;
let ants = [];
let steps = 0;
let dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 上・右・下・左

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cols = floor(width / cellSize);
  rows = floor((height - 50) / cellSize);
  reset();
}

function reset() {
  grid = new Uint8Array(cols * rows); // 0 = 白, 1 = 黒
  ants = [{ x: floor(cols / 2), y: floor(rows / 2), dir: 0, hue: 0 }];
  steps = 0;
  background(0, 0, 100);
}

function draw() {
  let speed = floor(map(mouseX, 0, width, 1, 400, true)); // 1フレームに何歩進むか

  noStroke();
  for (let k = 0; k < speed; k++) {
    for (let a of ants) {
      let i = a.x + a.y * cols;
      if (grid[i] === 0) {
        a.dir = (a.dir + 1) % 4; // 白 → 右に曲がる
        grid[i] = 1;
        fill(a.hue, 60, 30); // 黒く塗る（アリごとの色）
      } else {
        a.dir = (a.dir + 3) % 4; // 黒 → 左に曲がる
        grid[i] = 0;
        fill(0, 0, 100); // 白く塗る
      }
      rect(a.x * cellSize, 50 + a.y * cellSize, cellSize, cellSize);
      a.x = (a.x + dirs[a.dir][0] + cols) % cols;
      a.y = (a.y + dirs[a.dir][1] + rows) % rows;
    }
    steps++;
  }

  // アリの現在地
  for (let a of ants) {
    fill(0, 90, 100);
    rect(a.x * cellSize, 50 + a.y * cellSize, cellSize, cellSize);
  }

  fill(0, 0, 100);
  rect(0, 0, width, 50);
  fill(0, 0, 10);
  textSize(16);
  text('歩数 ' + steps + '　アリ ' + ants.length + '　マウス左右で速さ（' + speed + '歩/フレーム）　クリックでアリ追加　R でリセット', 16, 30);
}

function mousePressed() {
  if (mouseY < 50) return;
  ants.push({ x: floor(mouseX / cellSize), y: floor((mouseY - 50) / cellSize), dir: floor(random(4)), hue: random(360) });
}

function keyPressed() {
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. 速さを最大にして待つ。約 10,000 歩で「高速道路」が始まる
// 2. アリを2匹にすると、高速道路はできる？ 衝突すると？
// 3. ルールを「白→左、黒→右」に変えると？（鏡になるだけ？）
//    3色にして「右・右・左」にすると、別の模様が出る（ターマイトという拡張）
