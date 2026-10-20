// ============================================
// 00 グラフをつくる（点と線）
// グラフ = 点（ノード）と、点をつなぐ線（エッジ）。友だち関係、路線図、Web のリンク、全部グラフ
// クリックで点を置く / 点から点へドラッグで線を引く / 点の大きさ = つながりの数（次数）
// C で消す / F で力学レイアウト ON/OFF（線でつながった点が引き合う）
// ============================================

let nodes = []; // {x, y, vx, vy}
let edges = []; // [i, j]
let dragFrom = -1;
let forceLayout = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  // お手本：小さな友だちネットワーク
  for (let i = 0; i < 7; i++) nodes.push({ x: width / 2 + cos((TWO_PI * i) / 7) * 200, y: height / 2 + sin((TWO_PI * i) / 7) * 200, vx: 0, vy: 0 });
  edges = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [3, 4], [4, 5], [5, 6]];
}

function degree(i) {
  return edges.filter(([a, b]) => a === i || b === i).length;
}

function draw() {
  background(220, 40, 10);
  if (forceLayout) applyForces();

  // 線
  for (let [a, b] of edges) {
    stroke(0, 0, 60);
    strokeWeight(2);
    line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y);
  }
  // ドラッグ中の線
  if (dragFrom >= 0) {
    stroke(45, 90, 100);
    line(nodes[dragFrom].x, nodes[dragFrom].y, mouseX, mouseY);
  }
  // 点
  for (let i = 0; i < nodes.length; i++) {
    let d = degree(i);
    noStroke();
    fill(map(d, 0, 6, 200, 320), 70, 100);
    circle(nodes[i].x, nodes[i].y, 24 + d * 8);
    fill(0, 0, 10);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(d, nodes[i].x, nodes[i].y);
  }
  textAlign(LEFT, BASELINE);

  let totalDeg = nodes.reduce((s, _, i) => s + degree(i), 0);
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('ノード ' + nodes.length + '　エッジ ' + edges.length + '　次数の合計 ' + totalDeg + '（= エッジ × 2）　クリックで点、ドラッグで線　F：力学レイアウト ' + (forceLayout ? 'ON' : 'off') + '　C：消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('点の中の数字 = 次数（つながっている線の数）。「握手の補題」：次数を全部足すと必ずエッジの 2 倍', 20, 68);
}

// ★ 力学レイアウト：つながった点はバネで引き合い、全部の点は反発する
function applyForces() {
  for (let i = 0; i < nodes.length; i++) {
    let fx = 0, fy = 0;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      let dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
      let d2 = max(dx * dx + dy * dy, 100);
      fx += (dx / d2) * 3000; // 反発
      fy += (dy / d2) * 3000;
    }
    fx += (width / 2 - nodes[i].x) * 0.005; // 中心へ
    fy += (height / 2 - nodes[i].y) * 0.005;
    nodes[i].vx = (nodes[i].vx + fx) * 0.6;
    nodes[i].vy = (nodes[i].vy + fy) * 0.6;
  }
  for (let [a, b] of edges) {
    let dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y;
    let d = max(sqrt(dx * dx + dy * dy), 1);
    let f = (d - 120) * 0.02; // バネ（自然長 120）
    nodes[a].vx += (dx / d) * f; nodes[a].vy += (dy / d) * f;
    nodes[b].vx -= (dx / d) * f; nodes[b].vy -= (dy / d) * f;
  }
  for (let n of nodes) {
    n.x = constrain(n.x + n.vx, 30, width - 30);
    n.y = constrain(n.y + n.vy, 90, height - 30);
  }
}

function nearest(x, y) {
  for (let i = 0; i < nodes.length; i++) if (dist(x, y, nodes[i].x, nodes[i].y) < 25) return i;
  return -1;
}
function mousePressed() {
  if (mouseY < 80) return;
  dragFrom = nearest(mouseX, mouseY);
  if (dragFrom < 0) nodes.push({ x: mouseX, y: mouseY, vx: 0, vy: 0 });
}
function mouseReleased() {
  if (dragFrom >= 0) {
    let to = nearest(mouseX, mouseY);
    if (to >= 0 && to !== dragFrom && !edges.some(([a, b]) => (a === dragFrom && b === to) || (a === to && b === dragFrom))) edges.push([dragFrom, to]);
  }
  dragFrom = -1;
}
function keyPressed() {
  if (key === 'c' || key === 'C') { nodes = []; edges = []; }
  if (key === 'f' || key === 'F') forceLayout = !forceLayout;
}

// ---------- やってみよう ----------
// 1. 自分のクラスの友だち関係を描いてみよう。いちばん次数が大きい人は誰？
// 2. 全部の点を全部とつなぐ（完全グラフ）。n 個の点なら線は何本？ n(n−1)/2
// 3. F で力学レイアウトにすると、つながりの強いグループが自然に集まる
