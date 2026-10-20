// ============================================
// 14 パーコレーション（染み込み）（おまけ）
// 格子の各マスを確率 p で「通れる」にする。p がある値（約 0.593）を超えると、
// 突然、上から下まで通れる道ができる（相転移）。04 の巨大成分と同じ現象を格子で
// マウス左右 = p / クリックで配置をやり直す / 上から染み込んだ水が青く広がる
// ============================================

let cols = 60, rows = 36, cell;
let open = [];
let wet = [];
let p = 0.5;
let seed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 40) / cols, (height - 140) / rows);
}

function draw() {
  background(220, 40, 10);
  p = map(mouseX, 0, width, 0.3, 0.8, true);
  randomSeed(seed);
  open = [];
  for (let i = 0; i < cols * rows; i++) open.push(random() < p);

  // ★ 上の段から「通れるマス」をたどって染み込ませる（BFS）
  wet = new Array(cols * rows).fill(false);
  let q = [];
  for (let x = 0; x < cols; x++) if (open[x]) { wet[x] = true; q.push(x); }
  while (q.length) {
    let i = q.shift(), x = i % cols, y = floor(i / cols);
    for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      let j = nx + ny * cols;
      if (open[j] && !wet[j]) { wet[j] = true; q.push(j); }
    }
  }
  let percolates = false;
  for (let x = 0; x < cols; x++) if (wet[(rows - 1) * cols + x]) percolates = true;

  let ox = 20, oy = 100;
  noStroke();
  for (let i = 0; i < cols * rows; i++) {
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    if (!open[i]) fill(0, 0, 20);
    else if (wet[i]) fill(200, 80, 100);
    else fill(0, 0, 70);
    rect(x, y, cell - 1, cell - 1);
  }

  fill(0, 0, 100);
  textSize(18);
  text('p = ' + nf(p, 1, 3) + '（マウス左右）　' + (percolates ? '✔ 上から下まで通った！（パーコレーション）' : '✘ 途中で止まった') + '　クリックで配置をやり直す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('白 = 通れる、黒 = 通れない、青 = 上から水が染みた。しきい値 p ≈ 0.593（正方格子）。それより上ではほぼ必ず通り、下ではほぼ通らない', 20, 68);
}

function mousePressed() { seed = floor(random(10000)); }

// ---------- やってみよう ----------
// 1. p を 0.55 → 0.60 → 0.65 と動かし、クリックを何回もして「通る確率」を体感する
// 2. 格子を大きくすると（cols, rows）、境目はもっと鋭くなる（無限なら完全な階段）
// 3. 森林火災（シリーズ3の 03）で木の密度がこれを超えると全焼する。同じ数学
