// ============================================
// 06 貪欲法 = クラスカル法
// 重みつきグラフで「軽い辺から順に、閉路ができなければ採用」を繰り返すと最小全域木になる
//   これがマトロイド上の貪欲法：独立なら入れる、従属なら捨てる。それだけで最適
//   右の表は重み順の辺のリスト。全列挙で求めた本当の最小値とも比べる（いつも一致）
// スペース = 1 ステップ / A = 自動 / ノードをドラッグ = 重み（長さ）が変わる / R = 最初から / N = 新しいグラフ
// ============================================

let nodes = [], edges = [];          // edges: {a, b, w}
let nNode = 7;                       // ★ ノードの数
let order = [];                      // 重み順の辺番号
let stepI = 0;                       // 次に試す辺（order の添字）
let status = [];                     // 辺ごと：'' / 'ok' / 'ng'
let auto = false, timer = 0;
let best = Infinity;                 // 全列挙で求めた最小全域木の重み
let dragI = -1;
let flash = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  newGraph();
}

function newGraph() {
  nodes = []; edges = [];
  let tries = 0;
  while (nodes.length < nNode && tries++ < 500) {
    let p = { x: random(80, width - 480), y: random(130, height - 60) };
    if (nodes.every((q) => dist(p.x, p.y, q.x, q.y) > 110)) nodes.push(p);
  }
  // 近い順に辺を張る（各ノードから 3 本）＋ つながるまで足す
  for (let i = 0; i < nodes.length; i++) {
    let near = [...Array(nodes.length).keys()].filter((j) => j !== i).sort((p, q) => dist(nodes[i].x, nodes[i].y, nodes[p].x, nodes[p].y) - dist(nodes[i].x, nodes[i].y, nodes[q].x, nodes[q].y));
    for (let j of near.slice(0, 2)) addEdge(i, j);
  }
  let uf = makeUF(nodes.length);
  for (let e of edges) uf.union(e.a, e.b);
  for (let i = 1; i < nodes.length; i++) if (uf.find(i) !== uf.find(0)) { addEdge(0, i); uf.union(0, i); }
  let guard = 0;
  while (edges.length < 12 && guard++ < 100) addEdge(floor(random(nodes.length)), floor(random(nodes.length)));   // ★ 辺の本数
  reset();
}
function addEdge(a, b) {
  if (a === b || edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return;
  edges.push({ a, b, w: 0 });
}
function updateWeights() { for (let e of edges) e.w = Math.round(dist(nodes[e.a].x, nodes[e.a].y, nodes[e.b].x, nodes[e.b].y) / 10); }

function reset() {
  updateWeights();
  order = [...Array(edges.length).keys()].sort((p, q) => edges[p].w - edges[q].w);
  status = new Array(edges.length).fill('');
  stepI = 0; auto = false;
  best = bruteForce();
}

// ★ 貪欲法の 1 ステップ：次に軽い辺を、閉路ができないなら採用
function kruskalStep() {
  if (stepI >= order.length) return;
  let i = order[stepI];
  let chosen = order.slice(0, stepI).filter((j) => status[j] === 'ok');
  status[i] = isForest(nodes.length, edges, chosen.concat([i])) ? 'ok' : 'ng';
  if (status[i] === 'ng') flash = 20;
  stepI++;
}

// 全列挙：すべての全域木の中で最小の重み（辺 ≤ 16 本くらいまで）
function bruteForce() {
  let n = nodes.length, E = edges.length, bestW = Infinity;
  if (E > 18) return NaN;
  for (let m = 0; m < (1 << E); m++) {
    if (bitCount(m) !== n - 1) continue;
    let sub = [], w = 0;
    for (let i = 0; i < E; i++) if (m & (1 << i)) { sub.push(i); w += edges[i].w; }
    if (w < bestW && isForest(n, edges, sub)) bestW = w;
  }
  return bestW;
}
function bitCount(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }

function draw() {
  background(100, 25, 9);
  if (auto && ++timer % 25 === 0) kruskalStep();
  if (flash > 0) flash--;

  let total = 0, nOk = 0;
  for (let i = 0; i < edges.length; i++) if (status[i] === 'ok') { total += edges[i].w; nOk++; }
  let done = nOk === nodes.length - 1;
  let current = stepI < order.length && !done ? order[stepI] : -1;

  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = nodes[e.a], q = nodes[e.b];
    if (status[i] === 'ok') { stroke(130, 85, 100); strokeWeight(7); }
    else if (status[i] === 'ng') { stroke(5, 70, 70, 60); strokeWeight(2); drawingContext.setLineDash([6, 6]); }
    else if (i === current) { stroke(50, 90, 100); strokeWeight(4); }
    else { stroke(0, 0, 40); strokeWeight(2); }
    line(p.x, p.y, q.x, q.y);
    drawingContext.setLineDash([]);
    noStroke(); fill(status[i] === 'ok' ? 130 : i === current ? 50 : 0, status[i] === 'ok' || i === current ? 70 : 0, status[i] === 'ng' ? 45 : 100);
    textSize(14); textAlign(CENTER, CENTER);
    text(e.w, (p.x + q.x) / 2 + 8, (p.y + q.y) / 2 - 8);
  }
  for (let i = 0; i < nodes.length; i++) {
    stroke(0, 0, 100); strokeWeight(2); fill(100, 40, 85); circle(nodes[i].x, nodes[i].y, 28);
    noStroke(); fill(0, 0, 10); textSize(13); text(i + 1, nodes[i].x, nodes[i].y);
  }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('スペース：1 ステップ　A：自動 ' + (auto ? 'ON' : 'off') + '　ドラッグ：ノード（重み = 長さ）　R：最初から　N：新しいグラフ', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('軽い辺から順に試す。閉路ができなければ採用（緑）、できるなら捨てる（赤の破線）。独立かどうかだけで決める', 20, 66);

  let px = width - 400, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 390, height - py - 20, 12);
  fill(done ? 130 : 50, 80, 100); textSize(24);
  text(done ? '最小全域木 完成！' : '重み順に試す（' + stepI + ' / ' + edges.length + '）', px, py);
  fill(0, 0, 100); textSize(18);
  text('採用した重みの合計 = ' + total + '　（' + nOk + ' / ' + (nodes.length - 1) + ' 本）', px, py + 34);
  fill(done ? (total === best ? 130 : 5) : 0, done ? 80 : 0, done ? 100 : 70); textSize(16);
  text('全列挙の最小値 = ' + best + (done ? (total === best ? '　→ 一致 ✓ 貪欲法は最適' : '　→ ？') : ''), px, py + 60);
  textSize(15);
  let rowH = 22;
  for (let k = 0; k < order.length; k++) {
    let i = order[k], e = edges[i], st = status[i];
    fill(st === 'ok' ? 130 : st === 'ng' ? 5 : k === stepI && !done ? 50 : 0, st || (k === stepI && !done) ? 75 : 0, st === 'ng' ? 70 : k > stepI ? 60 : 100);
    text((k === stepI && !done ? '▶ ' : '　 ') + nf(e.w, 2) + '　' + (e.a + 1) + '–' + (e.b + 1) + '　' + (st === 'ok' ? '採用' : st === 'ng' ? '閉路 → 捨てる' : ''), px, py + 100 + k * rowH);
  }
}

function nearestNode(mx, my) {
  let bst = -1, bd = 20;
  for (let i = 0; i < nodes.length; i++) { let d = dist(mx, my, nodes[i].x, nodes[i].y); if (d < bd) { bd = d; bst = i; } }
  return bst;
}
function mousePressed() { dragI = nearestNode(mouseX, mouseY); }
function mouseDragged() { if (dragI >= 0) { nodes[dragI].x = constrain(mouseX, 20, width - 430); nodes[dragI].y = constrain(mouseY, 90, height - 20); updateWeights(); } }
function mouseReleased() { if (dragI >= 0) reset(); dragI = -1; }
function keyPressed() {
  if (key === ' ') kruskalStep();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') reset();
  if (key === 'n' || key === 'N') newGraph();
}

// ---------- やってみよう ----------
// 1. 全部終えたら、捨てられた辺を 1 本選んで「この辺を木に入れるなら、代わりにどの辺を外すか」を考える。外す辺は必ず重い？
// 2. ノードをドラッグして重みを変え、木がどう変わるかを見る。1 つの辺の重みだけが変わると、木の変化は 1 本ずつ
// 3. 「重い辺から順に、閉路ができないなら採用」にすると最大全域木。コードの sort を逆にしてみよう
// 4. 貪欲法が最適になる理由を 07・08 で確かめる。「独立かどうか」で決めてよいのはマトロイドのときだけ

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
