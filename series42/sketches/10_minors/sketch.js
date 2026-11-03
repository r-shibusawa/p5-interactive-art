// ============================================
// 10 削除と縮約（マイナー）
// 辺 e を「削除」（M∖e：辺を消す）または「縮約」（M/e：辺を縮めて両端をひとつの点にする）して、小さなマトロイドを作る
//   削除と縮約を繰り返してできるものが「マイナー」。縮約すると平行な辺はループ（1 本で従属）になる
//   グラフ的マトロイドは GF(2) で表現できる = U_{2,4} をマイナーに持たない（Tutte の定理）
// 辺をクリック = 操作する / D・K = 削除モード・縮約モード / U = 元に戻す / R = 最初から / ノードをドラッグ
// ============================================

let nodes = [], edges = [];          // edges: {a, b, name}
let opMode = 'D';                    // 'D' = 削除, 'K' = 縮約
let stack = [];                      // 元に戻す用
let ops = [];                        // 操作の記録（表示用）
let anim = null;                     // 縮約のアニメーション {from, to, t, edgeIdx}
let dragI = -1;
let stats = { rank: 0, bases: 0, fam: [], loops: 0, parallel: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  resetGraph();
}

function resetGraph() {
  // ★ 最初のグラフ：5 頂点、7 辺（四角形 ＋ 対角線 ＋ ぶら下がり）
  let cx = width * 0.3, cy = height * 0.55, r = min(width, height) * 0.24;
  nodes = [];
  for (let i = 0; i < 4; i++) nodes.push({ x: cx + r * cos(TWO_PI * i / 4 + QUARTER_PI), y: cy + r * sin(TWO_PI * i / 4 + QUARTER_PI) });
  nodes.push({ x: cx + r * 1.9, y: cy });
  edges = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3], [1, 4]].map(([a, b], i) => ({ a, b, name: 'e' + (i + 1) }));
  stack = []; ops = []; anim = null;
  computeStats();
}

function snapshot() { stack.push({ nodes: nodes.map((n) => ({ ...n })), edges: edges.map((e) => ({ ...e })), ops: ops.slice() }); if (stack.length > 30) stack.shift(); }

// ★ 削除：辺を消すだけ
function deleteEdge(i) { snapshot(); ops.push('∖' + edges[i].name); edges.splice(i, 1); computeStats(); }
// ★ 縮約：両端をひとつにする（アニメーションの後で finishContract）
function contractEdge(i) {
  let e = edges[i];
  if (e.a === e.b) { deleteEdge(i); return; }   // ループの縮約は削除と同じ
  snapshot(); ops.push('/' + e.name);
  anim = { from: e.b, to: e.a, t: 0, edgeIdx: i, start: { ...nodes[e.b] } };
}
function finishContract() {
  let { from, to, edgeIdx } = anim;
  edges.splice(edgeIdx, 1);
  for (let e of edges) { if (e.a === from) e.a = to; if (e.b === from) e.b = to; }
  nodes.splice(from, 1);
  for (let e of edges) { if (e.a > from) e.a--; if (e.b > from) e.b--; }
  anim = null;
  computeStats();
}

function computeStats() {
  let n = nodes.length, E = edges.length;
  let all = [...Array(E).keys()];
  stats.rank = forestRank(n, edges, all);
  stats.fam = new Array(E + 1).fill(0); stats.bases = 0;
  for (let m = 0; m < (1 << E); m++) {
    let sub = []; for (let i = 0; i < E; i++) if (m & (1 << i)) sub.push(i);
    if (isForest(n, edges, sub)) { stats.fam[sub.length]++; if (sub.length === stats.rank) stats.bases++; }
  }
  stats.loops = edges.filter((e) => e.a === e.b).length;
  stats.parallel = 0;
  for (let i = 0; i < E; i++) for (let j = i + 1; j < E; j++) {
    let p = edges[i], q = edges[j];
    if (p.a !== p.b && ((p.a === q.a && p.b === q.b) || (p.a === q.b && p.b === q.a))) stats.parallel++;
  }
}

function draw() {
  background(20, 30, 9);
  if (anim) { anim.t += 1 / 40; let k = min(1, anim.t); nodes[anim.from].x = lerp(anim.start.x, nodes[anim.to].x, k); nodes[anim.from].y = lerp(anim.start.y, nodes[anim.to].y, k); if (anim.t >= 1) finishContract(); }
  let hov = anim ? -1 : nearestEdge(mouseX, mouseY);

  // 平行辺を少しずらして描く
  let seen = {};
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = nodes[e.a], q = nodes[e.b];
    let hue = hov === i ? (opMode === 'D' ? 5 : 50) : 20, sat = hov === i ? 90 : 25, bri = hov === i ? 100 : 75;
    stroke(hue, sat, bri); strokeWeight(hov === i ? 7 : 4); noFill();
    if (e.a === e.b) { circle(p.x + 26, p.y - 26, 40); }   // ループ
    else {
      let k = [e.a, e.b].sort().join('-'); seen[k] = (seen[k] || 0) + 1;
      let off = (seen[k] - 1) * 18, nx = -(q.y - p.y), ny = q.x - p.x, L = Math.hypot(nx, ny) || 1;
      bezier(p.x, p.y, p.x + nx / L * off * 2, p.y + ny / L * off * 2, q.x + nx / L * off * 2, q.y + ny / L * off * 2, q.x, q.y);
    }
    noStroke(); fill(0, 0, 100); textSize(13); textAlign(CENTER, CENTER);
    let mx = e.a === e.b ? p.x + 26 : (p.x + q.x) / 2, my = e.a === e.b ? p.y - 54 : (p.y + q.y) / 2;
    text(e.name, mx + 10, my - 10);
  }
  if (anim) { let p = nodes[anim.from], q = nodes[anim.to]; stroke(50, 90, 100); strokeWeight(8); line(p.x, p.y, q.x, q.y); }
  for (let i = 0; i < nodes.length; i++) { stroke(0, 0, 100); strokeWeight(2); fill(20, 40, 85); circle(nodes[i].x, nodes[i].y, 26); noStroke(); fill(0, 0, 10); textSize(13); textAlign(CENTER, CENTER); text(i + 1, nodes[i].x, nodes[i].y); }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('辺をクリック：' + (opMode === 'D' ? '削除 M∖e' : '縮約 M/e') + '　D：削除モード　K：縮約モード　U：元に戻す　R：最初から　ドラッグ：ノード', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('削除 = 辺を消す。縮約 = 辺を縮めて両端を 1 つの点に（平行な辺はループになる）。どちらもまたマトロイド', 20, 66);

  let px = width - 420, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 410, 420, 12);
  fill(50, 80, 100); textSize(24);
  text('M' + (ops.length ? ' ' + ops.join(' ') : '') + '　（|E| = ' + edges.length + '）', px, py);
  fill(0, 0, 100); textSize(18);
  text('階数 ' + stats.rank + '　基の数 ' + stats.bases + '　ループ ' + stats.loops + '　平行な組 ' + stats.parallel, px, py + 34);
  fill(0, 0, 70); textSize(15);
  text('独立集合の数（大きさ順）：' + stats.fam.slice(0, stats.rank + 1).join(', '), px, py + 58);
  text('削除で階数は変わらないか 1 減る。縮約で階数は 1 減る（ループ以外）', px, py + 80);
  fill(0, 0, 100); textSize(17); text('マイナーと表現可能性', px, py + 124);
  fill(0, 0, 70); textSize(15);
  text('U_{2,4}：4 要素で「2 個までなら独立」（1 直線上の 4 点）', px, py + 150);
  text('GF(2) では 1 直線上に 3 点しか置けないので U_{2,4} は', px, py + 172);
  text('二元体で表現できない。しかも削除・縮約で壊れない性質なので', px, py + 194);
  text('定理（Tutte）：M が二元的 ⇔ U_{2,4} をマイナーに持たない', px, py + 216);
  text('グラフ的マトロイドはすべて二元的（02）→ どう削除・縮約しても', px, py + 246);
  text('U_{2,4} は出てこない。試しに 4 要素 階数 2 を作ってみよう：', px, py + 268);
  let is4 = edges.length === 4 && stats.rank === 2;
  fill(is4 ? 50 : 0, is4 ? 80 : 0, is4 ? 100 : 60);
  text(is4 ? '今 |E| = 4, 階数 2。独立な 2 個組は ' + stats.fam[2] + ' / 6（U_{2,4} なら 6）' : '（今は |E| = ' + edges.length + ', 階数 ' + stats.rank + '）', px, py + 292);
  fill(0, 0, 70);
  text('同じく、グラフ的 ⇔ U_{2,4}, F_7, F_7*, M*(K5), M*(K3,3) を持たない', px, py + 330);
}

function nearestNode(mx, my) {
  let best = -1, bd = 18;
  for (let i = 0; i < nodes.length; i++) { let d = dist(mx, my, nodes[i].x, nodes[i].y); if (d < bd) { bd = d; best = i; } }
  return best;
}
function nearestEdge(mx, my) {
  let best = -1, bd = 16, seen = {};
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = nodes[e.a], q = nodes[e.b], d;
    if (e.a === e.b) d = abs(dist(mx, my, p.x + 26, p.y - 26) - 20);
    else {
      let k = [e.a, e.b].sort().join('-'); seen[k] = (seen[k] || 0) + 1;
      let off = (seen[k] - 1) * 18, nx = -(q.y - p.y), ny = q.x - p.x, L = Math.hypot(nx, ny) || 1;
      let cx = (p.x + q.x) / 2 + nx / L * off * 1.5, cy = (p.y + q.y) / 2 + ny / L * off * 1.5;
      let dx = q.x - p.x, dy = q.y - p.y, l2 = dx * dx + dy * dy;
      let t = l2 ? constrain(((mx - p.x) * dx + (my - p.y) * dy) / l2, 0, 1) : 0;
      d = off ? dist(mx, my, cx, cy) : dist(mx, my, p.x + t * dx, p.y + t * dy);
    }
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function mousePressed() { dragI = nearestNode(mouseX, mouseY); }
function mouseDragged() { if (dragI >= 0 && !anim) { nodes[dragI].x = constrain(mouseX, 20, width - 440); nodes[dragI].y = constrain(mouseY, 90, height - 20); } }
function mouseReleased() {
  if (dragI < 0 && !anim) { let i = nearestEdge(mouseX, mouseY); if (i >= 0) { if (opMode === 'D') deleteEdge(i); else contractEdge(i); } }
  dragI = -1;
}
function keyPressed() {
  if (key === 'd' || key === 'D') opMode = 'D';
  if (key === 'k' || key === 'K') opMode = 'K';
  if ((key === 'u' || key === 'U') && stack.length && !anim) { let s = stack.pop(); nodes = s.nodes; edges = s.edges; ops = s.ops; computeStats(); }
  if (key === 'r' || key === 'R') resetGraph();
}

// ---------- やってみよう ----------
// 1. e5（対角線）を縮約すると、四角形の 4 辺が 2 組の平行辺になる。さらに縮約してループを作ってみよう
// 2. 辺が 4 本・階数 2 のマイナーをいろいろ作り、「独立な 2 個組」が 6 にならないことを確かめる（U_{2,4} は出ない）
// 3. 削除と縮約の順番を入れかえても結果は同じ（M∖e/f = M/f∖e）。U で戻して試す
// 4. 双対（09）との関係：M∖e の双対 = M*/e。削除と縮約は双対で入れかわる

// ==================================================
// ここから下は「マトロイドの道具」（union–find と森の判定。ループは union(a, a) で従属になる）
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
