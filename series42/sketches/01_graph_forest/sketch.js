// ============================================
// 01 グラフの森
// グラフの辺をいくつか選ぶ。選んだ辺が「閉路を含まない」（森になる）なら独立、閉路ができたら従属
//   判定は union–find：辺の両端がもう同じ木にいれば、その辺で閉路ができる
//   これが「グラフ的マトロイド」。00 のベクトルと同じ「独立／従属」の構造になっている
// 辺をクリック = 選ぶ・外す / ノードをドラッグ = 動かす / R = ランダムなグラフ / C = 全部外す / N = ノード数
// ============================================

let nodes = [];                  // {x, y}
let edges = [];                  // {a, b, on}
let nNode = 6;                   // ★ ノードの数（4〜8）
let extraEdges = 4;              // ★ 木より何本多く辺を張るか
let dragI = -1;
let cycleEdges = [];             // 閉路になっている辺の番号
let family = [];                 // 大きさごとの独立集合の数
let nBases = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  randomGraph();
}

function randomGraph() {
  nodes = []; edges = [];
  let cx = width * 0.4, cy = height * 0.55, rad = min(width, height) * 0.3;
  for (let i = 0; i < nNode; i++) {
    let a = (TWO_PI * i) / nNode - HALF_PI;
    nodes.push({ x: cx + rad * cos(a) + random(-30, 30), y: cy + rad * sin(a) + random(-30, 30) });
  }
  // まず全域木をランダムに張り、そこに辺を足す
  let order = shuffle([...Array(nNode).keys()]);
  for (let i = 1; i < nNode; i++) edges.push({ a: order[i], b: order[floor(random(i))], on: false });
  let tries = 0;
  while (edges.length < nNode - 1 + extraEdges && tries++ < 200) {
    let a = floor(random(nNode)), b = floor(random(nNode));
    if (a === b || edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) continue;
    edges.push({ a, b, on: false });
  }
  update();
}

// ★ 選んだ辺の判定：union–find で閉路を探し、閉路の辺を集める
function update() {
  cycleEdges = [];
  let on = edges.map((e, i) => i).filter((i) => edges[i].on);
  if (!isForest(nNode, edges, on)) {
    // 閉路の辺：その辺を外しても「残りだけでまだ両端がつながっている」辺
    for (let i of on) {
      let rest = on.filter((j) => j !== i);
      if (connected(nNode, edges, rest, edges[i].a, edges[i].b)) cycleEdges.push(i);
    }
  }
  // 全部の部分集合を数える（辺 ≤ 12 本なら一瞬）
  family = new Array(edges.length + 1).fill(0); nBases = 0;
  let rankAll = forestRank(nNode, edges, edges.map((e, i) => i));
  for (let m = 0; m < (1 << edges.length); m++) {
    let sub = [];
    for (let i = 0; i < edges.length; i++) if (m & (1 << i)) sub.push(i);
    if (isForest(nNode, edges, sub)) { family[sub.length]++; if (sub.length === rankAll) nBases++; }
  }
}

function draw() {
  background(150, 25, 10);
  let on = edges.filter((e) => e.on).length;
  let indep = cycleEdges.length === 0;
  let hueSel = indep ? 130 : 5;

  // 辺
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = nodes[e.a], q = nodes[e.b];
    let inCycle = cycleEdges.includes(i);
    if (e.on) { stroke(inCycle ? 5 : 130, 85, 100); strokeWeight(inCycle ? 9 : 6); }
    else { stroke(0, 0, 45); strokeWeight(2.5); }
    line(p.x, p.y, q.x, q.y);
    // 辺の番号
    noStroke(); fill(0, 0, e.on ? 100 : 60); textSize(13); textAlign(CENTER, CENTER);
    text('e' + (i + 1), (p.x + q.x) / 2 + 10, (p.y + q.y) / 2 - 10);
  }
  // ノード（同じ木は同じ色）
  let uf = makeUF(nNode);
  for (let e of edges) if (e.on) uf.union(e.a, e.b);
  for (let i = 0; i < nodes.length; i++) {
    let root = uf.find(i);
    stroke(0, 0, 100); strokeWeight(2); fill((root * 57) % 360, 55, 85);
    circle(nodes[i].x, nodes[i].y, 30);
    noStroke(); fill(0, 0, 10); textSize(14); text(i + 1, nodes[i].x, nodes[i].y);
  }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('辺をクリックで選ぶ　ノードをドラッグ　R：新しいグラフ　C：全部外す　N：ノード数 ' + nNode, 20, 40);
  fill(0, 0, 60); textSize(15);
  text('同じ色のノード = 選んだ辺でつながっている仲間（union–find の木）。両端がもう仲間なら、その辺は閉路をつくる', 20, 66);

  let px = width - 380, py = 110;
  fill(0, 0, 100, 8); rect(px - 20, py - 40, 360, 330, 12);
  fill(on === 0 ? 50 : hueSel, on === 0 ? 0 : 80, 100); textSize(30);
  text(on === 0 ? '何も選んでいない' : indep ? '独立（森）✓' : '従属（閉路あり）✗', px, py);
  fill(0, 0, 100); textSize(20);
  let comps = new Set(nodes.map((n, i) => uf.find(i))).size;
  text('選んだ辺 |A| = ' + on + '　　階数 r(A) = ' + (nNode - comps), px, py + 40);
  fill(0, 0, 60); textSize(15);
  text('階数 = ノード数 − つながった塊の数 = ' + nNode + ' − ' + comps + '。木なら辺の数と同じ', px, py + 66);
  fill(0, 0, 100); textSize(18); text('独立集合（森）の数　基（全域木）は ' + nBases + ' 個', px, py + 110);
  for (let s = 0; s <= edges.length; s++) {
    fill(s === on && on > 0 ? hueSel : 0, s === on && on > 0 ? 70 : 0, 100); textSize(16);
    text('|A| = ' + s + '：' + family[s] + ' 個', px, py + 140 + s * 22);
    if (family[s] === 0 || s >= 7) { if (family[s] === 0) text('（これより大きい森はない）', px + 160, py + 140 + s * 22); break; }
  }
}

function nearestNode(mx, my) {
  let best = -1, bd = 20;
  for (let i = 0; i < nodes.length; i++) { let d = dist(mx, my, nodes[i].x, nodes[i].y); if (d < bd) { bd = d; best = i; } }
  return best;
}
function nearestEdge(mx, my) {
  let best = -1, bd = 14;
  for (let i = 0; i < edges.length; i++) {
    let p = nodes[edges[i].a], q = nodes[edges[i].b];
    let d = segDist(mx, my, p.x, p.y, q.x, q.y);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function mousePressed() { dragI = nearestNode(mouseX, mouseY); }
function mouseDragged() { if (dragI >= 0) { nodes[dragI].x = constrain(mouseX, 20, width - 20); nodes[dragI].y = constrain(mouseY, 90, height - 20); } }
function mouseReleased() {
  if (dragI < 0) { let i = nearestEdge(mouseX, mouseY); if (i >= 0) { edges[i].on = !edges[i].on; update(); } }
  dragI = -1;
}
function keyPressed() {
  if (key === 'r' || key === 'R') randomGraph();
  if (key === 'c' || key === 'C') { for (let e of edges) e.on = false; update(); }
  if (key === 'n' || key === 'N') { nNode = nNode >= 8 ? 4 : nNode + 1; randomGraph(); }
}

// ---------- やってみよう ----------
// 1. 辺を 1 本ずつ足していき、初めて赤くなる瞬間を見る。赤い辺はいつも「輪」になっている？
// 2. 独立集合の最大の大きさ（階数）はいつも「ノード数 − 1」？ 離れ小島があるグラフだとどうなる？
// 3. 「基（全域木）」の数を R を押して何回か比べる。辺が多いほど多い？
// 4. 00 と見比べる：ベクトルの「同じ直線に乗る」とグラフの「閉路になる」は同じ役目

// ==================================================
// ここから下は「マトロイドの道具」（union–find と森の判定）
// ==================================================
function makeUF(n) {
  let parent = [...Array(n).keys()];
  let find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; parent[a] = b; return true; };
  return { find, union };
}
// 辺番号のリスト sub が森か（閉路がないか）
function isForest(n, edgeList, sub) {
  let uf = makeUF(n);
  for (let i of sub) if (!uf.union(edgeList[i].a, edgeList[i].b)) return false;
  return true;
}
// 辺番号のリスト sub の階数（= 閉路を作らずに入れられる本数）
function forestRank(n, edgeList, sub) {
  let uf = makeUF(n), r = 0;
  for (let i of sub) if (uf.union(edgeList[i].a, edgeList[i].b)) r++;
  return r;
}
// 辺 sub だけで a と b がつながっているか
function connected(n, edgeList, sub, a, b) {
  let uf = makeUF(n);
  for (let i of sub) uf.union(edgeList[i].a, edgeList[i].b);
  return uf.find(a) === uf.find(b);
}
// 点と線分の距離
function segDist(px, py, x1, y1, x2, y2) {
  let dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? constrain(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}
