// ============================================
// 01 グラフをたどる（幅優先探索と深さ優先探索）
// BFS：近い点から順に、波のように広がる（最短経路が見つかる）
// DFS：一本道をどんどん奥へ、行き止まりで戻る（迷路の探索）
// クリックした点から探索開始 / 1 = BFS / 2 = DFS / R で新しいグラフ
// ============================================

let nodes = [], edges = [], adj = [];
let mode = 1;
let order = []; // 訪れた順
let frontier = []; // 次に見る候補（BFS：キュー、DFS：スタック）
let visited = [];
let timer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeGraph();
}

// 格子状にゆがんだグラフをつくる
function makeGraph() {
  nodes = []; edges = []; adj = [];
  let cols = 8, rows = 5;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    nodes.push({ x: map(c, 0, cols - 1, 120, width - 120) + random(-25, 25), y: map(r, 0, rows - 1, 150, height - 80) + random(-25, 25) });
    adj.push([]);
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    let i = r * cols + c;
    if (c < cols - 1 && random() < 0.85) addEdge(i, i + 1);
    if (r < rows - 1 && random() < 0.85) addEdge(i, i + cols);
  }
  order = []; frontier = []; visited = [];
}
function addEdge(a, b) {
  edges.push([a, b]);
  adj[a].push(b);
  adj[b].push(a);
}

function draw() {
  background(220, 40, 10);
  // ★ 1 ステップ進める（0.15 秒ごと）
  if (frontier.length && millis() - timer > 150) {
    timer = millis();
    let cur = mode === 1 ? frontier.shift() : frontier.pop(); // BFS は先頭から、DFS は末尾から
    if (!visited[cur]) {
      visited[cur] = order.length + 1;
      order.push(cur);
      for (let nb of adj[cur]) if (!visited[nb]) frontier.push(nb);
    }
  }

  for (let [a, b] of edges) {
    let both = visited[a] && visited[b];
    stroke(0, 0, both ? 80 : 30);
    strokeWeight(both ? 3 : 1.5);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  for (let i = 0; i < nodes.length; i++) {
    noStroke();
    let v = visited[i];
    let inFrontier = frontier.includes(i);
    fill(v ? map(v, 1, nodes.length, 180, 330) : inFrontier ? 45 : 220, v || inFrontier ? 80 : 30, v || inFrontier ? 100 : 35);
    circle(nodes[i].x, nodes[i].y, v ? 34 : 26);
    if (v) {
      fill(0, 0, 10);
      textAlign(CENTER, CENTER);
      textSize(13);
      text(v, nodes[i].x, nodes[i].y);
    }
  }
  textAlign(LEFT, BASELINE);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text((mode === 1 ? 'BFS 幅優先（キュー：先に入れたものから）' : 'DFS 深さ優先（スタック：後に入れたものから）') + '　1 / 2 で切りかえ　点をクリックで開始　R で新しいグラフ　訪問 ' + order.length + ' / ' + nodes.length, 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('数字 = 訪れた順。黄 = 次の候補。BFS は同心円状に広がり、DFS は一筆書きのように奥へ進む', 20, 68);
}

function mousePressed() {
  for (let i = 0; i < nodes.length; i++) {
    if (dist(mouseX, mouseY, nodes[i].x, nodes[i].y) < 20) {
      order = []; visited = []; frontier = [i];
    }
  }
}
function keyPressed() {
  if (key === '1' || key === '2') { mode = int(key); order = []; visited = []; frontier = []; }
  if (key === 'r' || key === 'R') makeGraph();
}

// ---------- やってみよう ----------
// 1. 同じ点から BFS と DFS を始めて、訪れる順番の違いを見る
// 2. グラフが 2 つに分かれているとき（R で作り直すと時々そうなる）、片方からは全部訪れない
// 3. BFS で「何歩目か」を記録すれば最短経路になる。visited に歩数を入れてみよう
