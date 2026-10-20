// ============================================
// 02 最短経路（ダイクストラ法）
// 線に「長さ（コスト）」があるとき、いちばん安い道を見つける
// 「確定した点から、いちばん近い未確定の点を確定する」をくり返すだけ。カーナビや乗換案内の中身
// クリック = 出発点（1 回目）→ 目的地（2 回目） / R で新しい地図
// ============================================

let nodes = [], edges = [], adj = [];
let start = -1, goal = -1;
let distTo = [], prev = [], done = [];
let pathNodes = [];
let timer = 0;
let running = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeGraph();
}

function makeGraph() {
  nodes = []; edges = []; adj = [];
  for (let i = 0; i < 22; i++) {
    nodes.push({ x: random(100, width - 100), y: random(130, height - 60) });
    adj.push([]);
  }
  // 近い点どうしをつなぐ（各点から近い 3 点）
  for (let i = 0; i < nodes.length; i++) {
    let others = nodes.map((n, j) => ({ j, d: dist(nodes[i].x, nodes[i].y, n.x, n.y) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3);
    for (let o of others) {
      if (!adj[i].some((e) => e.to === o.j)) {
        let w = round(o.d / 20); // ★ 長さ = コスト
        edges.push([i, o.j, w]);
        adj[i].push({ to: o.j, w });
        adj[o.j].push({ to: i, w });
      }
    }
  }
  start = goal = -1; running = false; pathNodes = []; distTo = []; done = [];
}

function startSearch() {
  distTo = new Array(nodes.length).fill(Infinity);
  prev = new Array(nodes.length).fill(-1);
  done = new Array(nodes.length).fill(false);
  distTo[start] = 0;
  running = true;
  pathNodes = [];
}

// ★ ダイクストラの 1 ステップ
function stepDijkstra() {
  let best = -1;
  for (let i = 0; i < nodes.length; i++) if (!done[i] && distTo[i] < Infinity && (best < 0 || distTo[i] < distTo[best])) best = i;
  if (best < 0) { running = false; return; }
  done[best] = true; // いちばん近い未確定の点を確定
  if (best === goal) {
    running = false;
    for (let v = goal; v >= 0; v = prev[v]) pathNodes.unshift(v); // 来た道をたどる
    return;
  }
  for (let e of adj[best]) {
    if (distTo[best] + e.w < distTo[e.to]) { // より安く行けるなら更新
      distTo[e.to] = distTo[best] + e.w;
      prev[e.to] = best;
    }
  }
}

function draw() {
  background(220, 40, 10);
  if (running && millis() - timer > 200) { timer = millis(); stepDijkstra(); }

  for (let [a, b, w] of edges) {
    let onPath = pathNodes.length && pathNodes.some((v, k) => k > 0 && ((pathNodes[k - 1] === a && v === b) || (pathNodes[k - 1] === b && v === a)));
    stroke(onPath ? 45 : 0, onPath ? 90 : 0, onPath ? 100 : 35);
    strokeWeight(onPath ? 5 : 1.5);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
    noStroke();
    fill(0, 0, 55);
    textSize(12);
    text(w, (nodes[a].x + nodes[b].x) / 2 + 4, (nodes[a].y + nodes[b].y) / 2 - 4);
  }
  for (let i = 0; i < nodes.length; i++) {
    noStroke();
    fill(i === start ? 120 : i === goal ? 0 : done[i] ? 200 : 220, i === start || i === goal || done[i] ? 80 : 30, i === start || i === goal || done[i] ? 100 : 40);
    circle(nodes[i].x, nodes[i].y, i === start || i === goal ? 36 : 26);
    if (distTo[i] !== undefined && distTo[i] < Infinity) {
      fill(0, 0, 10);
      textAlign(CENTER, CENTER);
      textSize(12);
      text(distTo[i], nodes[i].x, nodes[i].y);
    }
  }
  textAlign(LEFT, BASELINE);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  let msg = start < 0 ? '出発点をクリック' : goal < 0 ? '目的地をクリック' : running ? '探索中…' : pathNodes.length ? '最短経路：コスト ' + distTo[goal] + '　' + pathNodes.length + ' 個の点を通る' : '到達できません';
  text(msg + '　R で新しい地図', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('線の数字 = コスト。点の数字 = 出発点からの最小コスト（確定すると水色）。確定した点から「いちばん近い点」を次々確定する', 20, 68);
}

function mousePressed() {
  for (let i = 0; i < nodes.length; i++) {
    if (dist(mouseX, mouseY, nodes[i].x, nodes[i].y) < 20) {
      if (start < 0 || goal >= 0) { start = i; goal = -1; pathNodes = []; distTo = []; done = []; running = false; }
      else if (i !== start) { goal = i; startSearch(); }
    }
  }
}
function keyPressed() {
  if (key === 'r' || key === 'R') makeGraph();
}

// ---------- やってみよう ----------
// 1. 「線の本数がいちばん少ない道」と「コストがいちばん小さい道」はちがう。例を探そう
// 2. コストを「線の長さ」ではなく全部 1 にすると、BFS（01）と同じ結果になる
// 3. 目的地までの直線距離をヒントに使うと速くなる（A*、→ 03）
