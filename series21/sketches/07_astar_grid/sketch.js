// ============================================
// 07 グリッド上の A* 経路計画
// 地図をマス目にして「スタートからゴールまでの最短の道」をグラフ探索で見つける
//   f = g（ここまでの実コスト）+ w × h（ゴールまでの見込み距離）。w = 0 ならダイクストラ、w = 1 で A*、w > 1 は速いが最短とは限らない
// ドラッグ = 壁を描く / E = 消しゴム / S・G = マウスの位置にスタート・ゴール / スペース = 探索 / ↑↓ = w / D = ダイクストラと切りかえ / C = 全部消す / R = ランダムな壁
// ============================================

let cols = 44, rows = 26, cell;
let wall = [];
let startIdx, goalIdx;
let openSet = [], closedSet = [];
let state = [];            // 0 = 未訪問, 1 = 候補（open）, 2 = 調べた（closed）, 3 = 道
let gScore = [], fScore = [], cameFrom = [];
let path = [];
let searching = false, done = false;
let w = 1.0;               // ★ ヒューリスティックの重み（0 = ダイクストラ）
let erase = false;
let diag = false;          // ★ ななめ移動を許すか
let expanded = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cell = min((width - 40) / cols, (height - 120) / rows);
  wall = new Array(cols * rows).fill(false);
  state = new Array(cols * rows).fill(0);
  startIdx = 2 + 3 * cols;
  goalIdx = (cols - 3) + (rows - 4) * cols;
  randomWalls();
}

function randomWalls() {
  for (let i = 0; i < wall.length; i++) wall[i] = random() < 0.3;
  wall[startIdx] = false; wall[goalIdx] = false;
  resetSearch();
}
function resetSearch() { openSet = []; closedSet = []; path = []; searching = false; done = false; expanded = 0; state = new Array(cols * rows).fill(0); }

// ★ 見込み距離（ヒューリスティック）：ななめなしならマンハッタン、ありならオクタイル距離
function heuristic(i) {
  let dx = abs(i % cols - goalIdx % cols), dy = abs(floor(i / cols) - floor(goalIdx / cols));
  return diag ? max(dx, dy) + (sqrt(2) - 1) * min(dx, dy) : dx + dy;
}

function startSearch() {
  resetSearch();
  gScore = new Array(cols * rows).fill(Infinity);
  fScore = new Array(cols * rows).fill(Infinity);
  cameFrom = new Array(cols * rows).fill(-1);
  gScore[startIdx] = 0; fScore[startIdx] = w * heuristic(startIdx);
  openSet = [startIdx]; state[startIdx] = 1;
  searching = true;
}

// ★ A* の 1 ステップ：f が最小の候補を取り出して、隣を調べる
function stepAStar() {
  if (!openSet.length) { searching = false; done = true; return; }
  let bi = 0;
  for (let k = 1; k < openSet.length; k++) if (fScore[openSet[k]] < fScore[openSet[bi]]) bi = k;
  let cur = openSet.splice(bi, 1)[0];
  closedSet.push(cur); state[cur] = 2;
  expanded++;
  if (cur === goalIdx) {
    for (let v = cur; v >= 0; v = cameFrom[v]) { path.unshift(v); state[v] = 3; }
    searching = false; done = true;
    return;
  }
  let x = cur % cols, y = floor(cur / cols);
  let moves = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]];
  if (diag) moves = moves.concat([[1, 1, sqrt(2)], [1, -1, sqrt(2)], [-1, 1, sqrt(2)], [-1, -1, sqrt(2)]]);
  for (let [dx, dy, c] of moves) {
    let nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    let nb = nx + ny * cols;
    if (wall[nb] || state[nb] === 2) continue;
    if (dx !== 0 && dy !== 0 && (wall[x + dx + y * cols] || wall[x + (y + dy) * cols])) continue;  // 角をすり抜けない
    let g = gScore[cur] + c;
    if (g < gScore[nb]) {
      gScore[nb] = g; fScore[nb] = g + w * heuristic(nb); cameFrom[nb] = cur;
      if (state[nb] !== 1) { openSet.push(nb); state[nb] = 1; }
    }
  }
}

function cellAt(mx, my) {
  let cx = floor((mx - 20) / cell), cy = floor((my - 100) / cell);
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return -1;
  return cx + cy * cols;
}

function draw() {
  background(215, 35, 12);
  if (searching) for (let k = 0; k < 4; k++) stepAStar();   // ★ 1 フレームに進める回数

  let ox = 20, oy = 100;
  noStroke();
  for (let i = 0; i < cols * rows; i++) {
    let x = ox + (i % cols) * cell, y = oy + floor(i / cols) * cell;
    if (wall[i]) fill(0, 0, 60);
    else if (state[i] === 3) fill(45, 90, 100);
    else if (state[i] === 2) fill(200, 60, 55);
    else if (state[i] === 1) fill(120, 70, 80);
    else fill(0, 0, 18);
    rect(x + 0.5, y + 0.5, cell - 1, cell - 1);
  }
  let sx = ox + (startIdx % cols) * cell + cell / 2, sy = oy + floor(startIdx / cols) * cell + cell / 2;
  let gx = ox + (goalIdx % cols) * cell + cell / 2, gy = oy + floor(goalIdx / cols) * cell + cell / 2;
  fill(170, 80, 100); circle(sx, sy, cell * 0.9);
  fill(0, 90, 100); circle(gx, gy, cell * 0.9);
  fill(0, 0, 10); textSize(cell * 0.6); textAlign(CENTER, CENTER);
  text('S', sx, sy); text('G', gx, gy);
  textAlign(LEFT, BASELINE);

  let len = path.length ? nf(gScore[goalIdx], 1, 1) : '—';
  fill(0, 0, 100);
  textSize(18);
  text('スペース：探索　w = ' + nf(w, 1, 1) + '（↑↓）' + (w === 0 ? ' = ダイクストラ' : w === 1 ? ' = A*' : ' = 重みつき A*') + '　D：ダイクストラ ⇄ A*　8：ななめ ' + (diag ? 'ON' : 'off') + '　E：' + (erase ? '消しゴム' : 'ペン') + '　S・G：スタート・ゴール　C：消す　R：ランダム', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('調べたマス（青）' + expanded + '　候補（緑）' + openSet.length + '　道の長さ ' + len + (done && !path.length ? '　✗ 道がない' : '') + '　w を上げると青が減る（速い）が、道が最短でなくなることがある', 20, 68);
}

function mouseDragged() { paint(); }
function mousePressed() { paint(); }
function paint() {
  let i = cellAt(mouseX, mouseY);
  if (i < 0 || i === startIdx || i === goalIdx) return;
  wall[i] = !erase;
  if (done || searching) resetSearch();
}

function keyPressed() {
  if (key === ' ') startSearch();
  if (key === 'e' || key === 'E') erase = !erase;
  if (key === 'c' || key === 'C') { wall.fill(false); resetSearch(); }
  if (key === 'r' || key === 'R') randomWalls();
  if (key === 'd' || key === 'D') { w = w === 0 ? 1 : 0; if (done) startSearch(); }
  if (key === '8') { diag = !diag; resetSearch(); }
  if (key === UP_ARROW) { w = min(5, w + 0.5); if (done) startSearch(); }
  if (key === DOWN_ARROW) { w = max(0, w - 0.5); if (done) startSearch(); }
  if (key === 's' || key === 'S') { let i = cellAt(mouseX, mouseY); if (i >= 0 && !wall[i]) { startIdx = i; resetSearch(); } }
  if (key === 'g' || key === 'G') { let i = cellAt(mouseX, mouseY); if (i >= 0 && !wall[i]) { goalIdx = i; resetSearch(); } }
}

// ---------- やってみよう ----------
// 1. 同じ地図で w = 0（ダイクストラ）と w = 1（A*）の「調べたマス」の数を比べよう。道の長さは同じ？
// 2. w = 3 にすると道の長さが変わることがある。そうなる地図を描いてみよう
// 3. ゴールを囲む壁を描いて「道がない」を出す。A* はいつあきらめる？
// 4. ななめ移動 ON で道がどう変わるか。斜めのコストを 1 にする（ずる）とどうなる？
