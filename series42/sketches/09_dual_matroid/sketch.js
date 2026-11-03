// ============================================
// 09 双対マトロイド
// 平面グラフ（3×3 の格子）とその双対グラフ（面 = 頂点、辺を横切る辺）を重ねて描く
//   辺集合 T が全域木 ⇔ 残りの辺（補集合）の双対辺が双対グラフの全域木。基の補集合 = 双対の基
//   T に閉路（サーキット）があると、その双対辺は双対グラフを切る「カット」になる
// 辺をクリック = T に入れる・外す / ノードをドラッグ / スペース = ランダムな全域木 / C = 全部外す / D = 双対の表示 / R = 位置を戻す
// ============================================

let nodes = [], edges = [];          // edges: {a, b, f1, f2, on}  f = 面の番号（4 = 外側の面）
let faces = [];                      // 面の頂点番号（外側は空）
let nF = 5;
let dragI = -1;
let showDual = true;
let cycleEdges = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  buildLattice();
}

function buildLattice() {
  nodes = []; edges = []; faces = [];
  let cell = min(width * 0.18, height * 0.24), ox = width * 0.3 - cell, oy = height * 0.56 - cell;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) nodes.push({ x: ox + i * cell, y: oy + j * cell });
  let id = (i, j) => i + j * 3;
  let cellId = (i, j) => (i < 0 || j < 0 || i > 1 || j > 1) ? 4 : i + j * 2;     // ★ 外側の面は 4
  for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) edges.push({ a: id(i, j), b: id(i + 1, j), f1: cellId(i, j - 1), f2: cellId(i, j), on: false });  // 横の辺
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) edges.push({ a: id(i, j), b: id(i, j + 1), f1: cellId(i - 1, j), f2: cellId(i, j), on: false });  // 縦の辺
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) faces.push([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]);
  faces.push([]);
  update();
}

// 面（双対の頂点）の位置：内側は重心、外側は格子の右下の外
function facePos(f) {
  if (f === 4) { let xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y); return { x: max(...xs) + 90, y: max(...ys) + 70 }; }
  let fx = 0, fy = 0; for (let v of faces[f]) { fx += nodes[v].x; fy += nodes[v].y; }
  return { x: fx / 4, y: fy / 4 };
}
// 辺の中点から外向きの点（外側の面へ向かう双対辺の折れ曲がり）
function outward(e) {
  let p = nodes[e.a], q = nodes[e.b], mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  let c = facePos(e.f1 === 4 ? e.f2 : e.f1);
  let dx = mx - c.x, dy = my - c.y, L = Math.hypot(dx, dy) || 1;
  return { x: mx + dx / L * 50, y: my + dy / L * 50 };
}

function update() {
  cycleEdges = [];
  let on = edges.map((e, i) => i).filter((i) => edges[i].on);
  if (!isForest(nodes.length, edges, on)) {
    for (let i of on) if (connected(nodes.length, edges, on.filter((j) => j !== i), edges[i].a, edges[i].b)) cycleEdges.push(i);
  }
}
function randomTree() {
  let order = shuffle([...Array(edges.length).keys()]);
  let uf = makeUF(nodes.length);
  for (let e of edges) e.on = false;
  for (let i of order) if (uf.union(edges[i].a, edges[i].b)) edges[i].on = true;
  update();
}

function draw() {
  background(280, 25, 9);
  let on = edges.map((e, i) => i).filter((i) => edges[i].on);
  let off = edges.map((e, i) => i).filter((i) => !edges[i].on);
  let rankT = forestRank(nodes.length, edges, on);
  let isTree = cycleEdges.length === 0 && rankT === nodes.length - 1;
  // 双対の判定：補集合の双対辺が双対グラフで森か・全域木か
  let dualEdges = edges.map((e) => ({ a: e.f1, b: e.f2 }));
  let dualForest = isForest(nF, dualEdges, off);
  let dualRank = forestRank(nF, dualEdges, off);
  let dualTree = dualForest && dualRank === nF - 1;

  // 面を塗る
  for (let f = 0; f < 4; f++) {
    noStroke(); fill(280, 30, 20);
    beginShape(); for (let v of faces[f]) vertex(nodes[v].x, nodes[v].y); endShape(CLOSE);
  }
  // 元のグラフの辺
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = nodes[e.a], q = nodes[e.b];
    if (e.on) { stroke(cycleEdges.includes(i) ? 5 : 130, 85, 100); strokeWeight(8); } else { stroke(0, 0, 40); strokeWeight(2); }
    line(p.x, p.y, q.x, q.y);
  }
  // 双対グラフ：T に入っていない辺の双対辺を描く（T の辺の双対はうすく）
  if (showDual) {
    for (let i = 0; i < edges.length; i++) {
      let e = edges[i], a = facePos(e.f1), b = facePos(e.f2);
      let inCut = cycleEdges.includes(i);
      if (!e.on) { stroke(35, 90, 100); strokeWeight(5); } else if (inCut) { stroke(5, 80, 100, 70); strokeWeight(3); drawingContext.setLineDash([6, 6]); } else { stroke(35, 40, 60, 40); strokeWeight(1.5); drawingContext.setLineDash([4, 6]); }
      if (e.f1 === 4 || e.f2 === 4) { let o = outward(e), inner = facePos(e.f1 === 4 ? e.f2 : e.f1), outer = facePos(4); line(inner.x, inner.y, o.x, o.y); line(o.x, o.y, outer.x, outer.y); }
      else line(a.x, a.y, b.x, b.y);
      drawingContext.setLineDash([]);
    }
    for (let f = 0; f < nF; f++) {
      let c = facePos(f);
      stroke(0, 0, 100); strokeWeight(2); fill(35, 80, 95); rect(c.x - 13, c.y - 13, 26, 26, 5);
      noStroke(); fill(0, 0, 10); textSize(13); textAlign(CENTER, CENTER); text(f === 4 ? '外' : 'F' + (f + 1), c.x, c.y);
    }
  }
  for (let i = 0; i < nodes.length; i++) { stroke(0, 0, 100); strokeWeight(2); fill(280, 40, 85); circle(nodes[i].x, nodes[i].y, 24); }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('辺をクリック：T に入れる・外す　スペース：ランダムな全域木　C：全部外す　D：双対 ' + (showDual ? 'ON' : 'off') + '　ドラッグ：ノード　R：位置を戻す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('緑 = T の辺。オレンジ = T に入っていない辺の双対辺（面と面をつなぐ）。外側の面「外」はひとつの頂点', 20, 66);

  let px = width - 420, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 410, 380, 12);
  fill(130, 70, 100); textSize(22);
  text('T：' + on.length + ' 本　' + (on.length === 0 ? '' : cycleEdges.length ? '閉路あり（従属）' : isTree ? '全域木（基）✓' : '森（独立、まだ木でない）'), px, py);
  fill(0, 0, 70); textSize(15);
  text('頂点 9、辺 12、面 5（4 + 外）。全域木は 8 本、補集合は 4 本', px, py + 26);
  fill(35, 80, 100); textSize(22);
  text('双対：補集合 ' + off.length + ' 本　' + (dualForest ? (dualTree ? '双対の全域木 ✓' : '双対の森') : '双対に閉路あり'), px, py + 70);
  fill(0, 0, 70); textSize(15);
  text('双対グラフは頂点 5、辺 12。全域木は 4 本', px, py + 96);
  fill(0, 0, 100); textSize(17);
  text(isTree && dualTree ? '基の補集合 = 双対の基 ✓' : on.length === 0 ? '辺を選んでみよう' : '', px, py + 136);
  fill(0, 0, 80); textSize(15);
  if (cycleEdges.length) {
    text('T の閉路（赤）の双対辺（赤破線）は、閉路の内側の面と', px, py + 166);
    text('外側の面を切り分ける「カット」。サーキット ↔ カット', px, py + 188);
  } else if (!dualForest) {
    text('補集合の双対辺に閉路がある ⇔ T は切れている', px, py + 166);
    text('（T だけでは全部の頂点がつながらない）', px, py + 188);
  } else if (isTree) {
    text('T の辺を 1 本抜くと T は切れる（カット）。そのとき', px, py + 166);
    text('双対側では抜いた辺の双対が補集合に入り、閉路になる', px, py + 188);
  }
  fill(0, 0, 100); textSize(16); text('双対マトロイド M* の定義', px, py + 236);
  fill(0, 0, 70); textSize(15);
  text('M* の基 = M の基の補集合。r*(E) = |E| − r(E) = 12 − 8 = 4', px, py + 260);
  text('M のサーキット = M* のコサーキット（カット）', px, py + 282);
  text('平面グラフなら M* もグラフ的（双対グラフ）。平面でないと（K5, K3,3）そうならない', px, py + 304);
}

function nearestNode(mx, my) {
  let best = -1, bd = 18;
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
function mousePressed() { dragI = nearestNode(mouseX, mouseY); }
function mouseDragged() { if (dragI >= 0) { nodes[dragI].x = constrain(mouseX, 20, width - 440); nodes[dragI].y = constrain(mouseY, 90, height - 100); } }
function mouseReleased() { if (dragI < 0) { let i = nearestEdge(mouseX, mouseY); if (i >= 0) { edges[i].on = !edges[i].on; update(); } } dragI = -1; }
function keyPressed() {
  if (key === ' ') randomTree();
  if (key === 'c' || key === 'C') { for (let e of edges) e.on = false; update(); }
  if (key === 'd' || key === 'D') showDual = !showDual;
  if (key === 'r' || key === 'R') { let keep = edges.map((e) => e.on); buildLattice(); edges.forEach((e, i) => (e.on = keep[i])); update(); }
}

// ---------- やってみよう ----------
// 1. スペースで全域木を作り、オレンジの双対辺が「外」を含む 5 つの面をちょうど木でつなぐのを確かめる
// 2. 全域木から辺を 1 本外す → 双対側に閉路ができる。1 本足す → 元のグラフに閉路、双対側はカット
// 3. 格子を 2×2 や 4×4 に変える（buildLattice の 3 を変える。面の番号 cellId も直す）
// 4. 双対の双対は元に戻る（M** = M）。表の式 r*(E) = |E| − r(E) をもう一度当てはめると？

// ==================================================
// ここから下は「マトロイドの道具」（union–find と森の判定）
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
