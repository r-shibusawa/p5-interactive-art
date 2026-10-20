// ============================================
// 03 迷路を解く（A* 探索）
// マス目も「隣どうしがつながったグラフ」。壁を描いて、A* で左上から右下への道を探す
// A* = ダイクストラ ＋「ゴールまでの見込み距離」のヒント。無駄な方向を調べない
// ドラッグで壁を描く / 右側をドラッグで壁を消す（Shift + ドラッグ） / スペースで探索 / C で消す / R でランダムな壁
// ============================================

let cols = 40, rows = 24, cell;
let wall = [];
let openSet = [], closedSet = [];
let gScore = [], fScore = [], cameFrom = [];
let path = [];
let searching = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 40) / cols, (height - 120) / rows);
  wall = new Array(cols * rows).fill(false);
  randomWalls();
}

function randomWalls() {
  for (let i = 0; i < wall.length; i++) wall[i] = random() < 0.28;
  wall[0] = false; wall[cols * rows - 1] = false;
  reset();
}
function reset() { openSet = []; closedSet = []; path = []; searching = false; }

function heuristic(i) {
  let x = i % cols, y = floor(i / cols);
  return abs(cols - 1 - x) + abs(rows - 1 - y); // ★ ゴールまでのマンハッタン距離（見込み）
}

function startSearch() {
  reset();
  gScore = new Array(cols * rows).fill(Infinity);
  fScore = new Array(cols * rows).fill(Infinity);
  cameFrom = new Array(cols * rows).fill(-1);
  gScore[0] = 0; fScore[0] = heuristic(0);
  openSet = [0];
  searching = true;
}

// ★ A* の 1 ステップ
function stepAStar() {
  if (!openSet.length) { searching = false; return; }
  // f = g（ここまでの実コスト）+ h（見込み）がいちばん小さい候補を選ぶ
  let bi = 0;
  for (let k = 1; k < openSet.length; k++) if (fScore[openSet[k]] < fScore[openSet[bi]]) bi = k;
  let cur = openSet.splice(bi, 1)[0];
  closedSet.push(cur);
  if (cur === cols * rows - 1) {
    for (let v = cur; v >= 0; v = cameFrom[v]) path.unshift(v);
    searching = false;
    return;
  }
  let x = cur % cols, y = floor(cur / cols);
  for (let [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    let nb = nx + ny * cols;
    if (wall[nb] || closedSet.includes(nb)) continue;
    let g = gScore[cur] + 1;
    if (g < gScore[nb]) {
      gScore[nb] = g; fScore[nb] = g + heuristic(nb); cameFrom[nb] = cur;
      if (!openSet.includes(nb)) openSet.push(nb);
    }
  }
}

function draw() {
  background(220, 40, 10);
  if (searching) for (let k = 0; k < 3; k++) stepAStar();

  let ox = 20, oy = 100;
  noStroke();
  for (let i = 0; i < cols * rows; i++) {
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    if (wall[i]) fill(0, 0, 70);
    else if (path.includes(i)) fill(45, 90, 100);
    else if (closedSet.includes(i)) fill(200, 60, 45);
    else if (openSet.includes(i)) fill(120, 70, 70);
    else fill(220, 30, 15);
    rect(x, y, cell - 1, cell - 1);
  }
  fill(120, 90, 100); rect(ox, oy, cell - 1, cell - 1);
  fill(0, 90, 100); rect(ox + (cols - 1) * cell, oy + (rows - 1) * cell, cell - 1, cell - 1);

  fill(0, 0, 100);
  textSize(18);
  text('ドラッグで壁（Shift で消す）　スペースで探索　C：全部消す　R：ランダムな壁　' + (path.length ? '道の長さ ' + (path.length - 1) + '　調べたマス ' + closedSet.length : searching ? '探索中…' : openSet.length === 0 && closedSet.length ? '道がありません' : ''), 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('青 = 調べたマス、緑 = 候補、黄 = 見つけた道。見込み距離のヒントがあるので、ゴールの方向を優先して調べる', 20, 68);
}

function paint() {
  let i = floor((mouseX - 20) / cell) + floor((mouseY - 100) / cell) * cols;
  let x = floor((mouseX - 20) / cell), y = floor((mouseY - 100) / cell);
  if (x < 0 || y < 0 || x >= cols || y >= rows) return;
  if (i === 0 || i === cols * rows - 1) return;
  wall[i] = !keyIsDown(SHIFT);
  reset();
}
function mousePressed() { if (mouseY > 90) paint(); }
function mouseDragged() { if (mouseY > 90) paint(); }
function keyPressed() {
  if (key === ' ') startSearch();
  if (key === 'c' || key === 'C') { wall.fill(false); reset(); }
  if (key === 'r' || key === 'R') randomWalls();
}

// ---------- やってみよう ----------
// 1. heuristic を「return 0」にするとダイクストラ（02）と同じ。調べたマスの数を比べよう
// 2. 斜め移動を許す（[1,1] などを足す）と道はどう変わる？
// 3. 壁で完全に囲むと「道がありません」。調べたマスは全部青になる
