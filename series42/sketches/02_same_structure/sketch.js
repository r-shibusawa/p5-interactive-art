// ============================================
// 02 同じ構造：グラフと GF(2) のベクトル
// 左はグラフ、右はその「接続行列」（行 = ノード、列 = 辺。辺の両端に 1）。計算は GF(2)（1 + 1 = 0 の世界）
//   辺集合を選ぶと、左では「閉路がない？」、右では「列ベクトルが独立？（GF(2) の階数 = 本数？）」を判定
//   答えはいつも一致する。グラフ的マトロイドは GF(2) 上で「表現できる」
// 辺または列をクリック = 選ぶ・外す / ノードをドラッグ / R = 新しいグラフ / C = 全部外す
// ============================================

let nodes = [], edges = [];
let nNode = 5;                       // ★ ノードの数（4〜6）
let nEdge = 7;                       // ★ 辺の数
let dragI = -1;
let cycleEdges = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  randomGraph();
}

function randomGraph() {
  nodes = []; edges = [];
  let cx = width * 0.25, cy = height * 0.55, rad = min(width * 0.18, height * 0.3);
  for (let i = 0; i < nNode; i++) {
    let a = (TWO_PI * i) / nNode - HALF_PI;
    nodes.push({ x: cx + rad * cos(a) + random(-20, 20), y: cy + rad * sin(a) + random(-20, 20) });
  }
  let order = shuffle([...Array(nNode).keys()]);
  for (let i = 1; i < nNode; i++) edges.push({ a: order[i], b: order[floor(random(i))], on: false });
  let tries = 0;
  while (edges.length < nEdge && tries++ < 200) {
    let a = floor(random(nNode)), b = floor(random(nNode));
    if (a === b || edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) continue;
    edges.push({ a, b, on: false });
  }
  for (let e of edges) if (e.a > e.b) [e.a, e.b] = [e.b, e.a];
  update();
}

// ★ 辺 i の列ベクトル：両端のノードの行に 1（ビットで持つ）
function column(i) { return (1 << edges[i].a) | (1 << edges[i].b); }

function update() {
  cycleEdges = [];
  let on = edges.map((e, i) => i).filter((i) => edges[i].on);
  if (!isForest(nNode, edges, on)) {
    for (let i of on) if (connected(nNode, edges, on.filter((j) => j !== i), edges[i].a, edges[i].b)) cycleEdges.push(i);
  }
}

function draw() {
  background(260, 25, 10);
  let on = edges.map((e, i) => i).filter((i) => edges[i].on);
  let forest = cycleEdges.length === 0;
  let r2 = rankGF2(on.map(column));
  let indep2 = r2 === on.length;
  let hueL = forest ? 130 : 5, hueR = indep2 ? 130 : 5;

  // ---- 左：グラフ
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = nodes[e.a], q = nodes[e.b];
    if (e.on) { stroke(cycleEdges.includes(i) ? 5 : 130, 85, 100); strokeWeight(7); } else { stroke(0, 0, 45); strokeWeight(2.5); }
    line(p.x, p.y, q.x, q.y);
    noStroke(); fill(0, 0, e.on ? 100 : 60); textSize(13); textAlign(CENTER, CENTER);
    text('e' + (i + 1), (p.x + q.x) / 2 + 10, (p.y + q.y) / 2 - 10);
  }
  for (let i = 0; i < nodes.length; i++) {
    stroke(0, 0, 100); strokeWeight(2); fill(260, 30, 80); circle(nodes[i].x, nodes[i].y, 30);
    noStroke(); fill(0, 0, 10); textSize(14); text('v' + (i + 1), nodes[i].x, nodes[i].y);
  }

  // ---- 右：接続行列（GF(2)）
  let cw = 54, ch = 44, mx = width * 0.5, my = height * 0.32;
  textSize(14);
  for (let j = 0; j < edges.length; j++) {
    let e = edges[j], x = mx + j * cw;
    let h = e.on ? (cycleEdges.includes(j) ? 5 : 130) : 0;
    if (e.on) { noStroke(); fill(h, 70, 60, 35); rect(x - cw / 2 + 2, my - ch - 6, cw - 4, ch * (nNode + 1) + 4, 6); }
    noStroke(); fill(0, 0, e.on ? 100 : 65); text('e' + (j + 1), x, my - ch / 2 - 4);
    for (let i = 0; i < nNode; i++) {
      let v = i === e.a || i === e.b ? 1 : 0;
      fill(v ? (e.on ? h : 200) : 0, v ? 60 : 0, v ? 100 : 40); textSize(v ? 20 : 16);
      text(v, x, my + i * ch + ch / 2);
      textSize(14);
    }
  }
  for (let i = 0; i < nNode; i++) { fill(0, 0, 70); text('v' + (i + 1), mx - cw / 2 - 20, my + i * ch + ch / 2); }
  stroke(0, 0, 40); strokeWeight(1); line(mx - cw / 2 - 2, my - 2, mx - cw / 2 - 2, my + nNode * ch + 2);
  line(mx + edges.length * cw - cw / 2 + 2, my - 2, mx + edges.length * cw - cw / 2 + 2, my + nNode * ch + 2);
  // 選んだ列の和（GF(2)）
  let sum = 0; for (let i of on) sum ^= column(i);
  let sy = my + nNode * ch + 40;
  noStroke(); fill(0, 0, 100); textSize(16); textAlign(LEFT, CENTER);
  text('選んだ列の和（GF(2)）：(' + [...Array(nNode).keys()].map((i) => (sum >> i) & 1).join(', ') + ')' + (on.length && sum === 0 ? '　← 0 ベクトル = 従属！' : ''), mx - cw / 2, sy);
  fill(0, 0, 60); textSize(14);
  text('閉路の辺の列を足すと、どのノードも 2 回ずつ現れて 1 + 1 = 0 → 全部 0 になる', mx - cw / 2, sy + 24);

  // ---- 判定
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('辺か列をクリックで選ぶ　ノードをドラッグ　R：新しいグラフ　C：全部外す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('左：閉路がなければ独立（森）　右：列ベクトルの GF(2) 階数が本数と同じなら独立。両方いつも一致する', 20, 66);
  let py = height - 120;
  fill(on.length ? hueL : 0, on.length ? 80 : 0, 100); textSize(26);
  text('グラフ：' + (on.length === 0 ? '—' : forest ? '森（独立）✓' : '閉路あり（従属）✗') + '　階数 ' + forestRank(nNode, edges, on), 20, py);
  fill(on.length ? hueR : 0, on.length ? 80 : 0, 100);
  text('GF(2)：' + (on.length === 0 ? '—' : indep2 ? '独立 ✓' : '従属 ✗') + '　階数 ' + r2 + ' / 本数 ' + on.length, 20, py + 40);
  fill(0, 0, 100); textSize(18);
  text(on.length ? (forest === indep2 ? '→ 同じ答え。同じ「独立の構造」= 同じマトロイド' : '→ ？') : '辺を選んでみよう', 20, py + 76);
}

function mousePressed() { dragI = nearestNode(mouseX, mouseY); }
function mouseDragged() { if (dragI >= 0) { nodes[dragI].x = constrain(mouseX, 20, width * 0.45); nodes[dragI].y = constrain(mouseY, 90, height - 140); } }
function mouseReleased() {
  if (dragI < 0) {
    let i = nearestEdge(mouseX, mouseY);
    if (i < 0) { // 列をクリック？
      let cw = 54, ch = 44, mx = width * 0.5, my = height * 0.32;
      let j = Math.round((mouseX - mx) / cw);
      if (j >= 0 && j < edges.length && mouseY > my - ch && mouseY < my + nNode * ch) i = j;
    }
    if (i >= 0) { edges[i].on = !edges[i].on; update(); }
  }
  dragI = -1;
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
    let dx = q.x - p.x, dy = q.y - p.y, l2 = dx * dx + dy * dy;
    let t = l2 ? constrain(((mx - p.x) * dx + (my - p.y) * dy) / l2, 0, 1) : 0;
    let d = dist(mx, my, p.x + t * dx, p.y + t * dy);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function keyPressed() {
  if (key === 'r' || key === 'R') randomGraph();
  if (key === 'c' || key === 'C') { for (let e of edges) e.on = false; update(); }
}

// ---------- やってみよう ----------
// 1. 閉路になる辺だけを選んで、右の「列の和」が全部 0 になるのを確かめる
// 2. 木（全域木）を選ぶと階数はノード数 − 1。行列の階数も同じ？（行が 1 つ余分 = 全部足すと 0）
// 3. 実数で計算したらどうなる？ 接続行列の 1 を「出る側 −1、入る側 +1」にすると実数でも同じ構造になる
// 4. GF(2) で表現できないマトロイドもある（11 の非ファノ）。逆にグラフでは作れないマトロイドも（10 の U_{2,4}）

// ==================================================
// ここから下は「マトロイドの道具」（union–find と GF(2) の階数）
// ==================================================
function makeUF(n) {
  let parent = [...Array(n).keys()];
  let find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; parent[a] = b; return true; };
  return { find, union };
}
function isForest(n, edgeList, sub) {
  let uf = makeUF(n);
  for (let i of sub) if (!uf.union(edgeList[i].a, edgeList[i].b)) return false;
  return true;
}
function forestRank(n, edgeList, sub) {
  let uf = makeUF(n), r = 0;
  for (let i of sub) if (uf.union(edgeList[i].a, edgeList[i].b)) r++;
  return r;
}
function connected(n, edgeList, sub, a, b) {
  let uf = makeUF(n);
  for (let i of sub) uf.union(edgeList[i].a, edgeList[i].b);
  return uf.find(a) === uf.find(b);
}
// GF(2) 上の階数：ベクトルをビット列（整数）で持ち、XOR で消去する
function rankGF2(vecsBits) {
  let basis = [], r = 0;
  for (let v of vecsBits) {
    for (let b of basis) v = Math.min(v, v ^ b);
    if (v) { basis.push(v); basis.sort((p, q) => q - p); r++; }
  }
  return r;
}
