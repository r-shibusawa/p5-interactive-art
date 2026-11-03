// ============================================
// 01 胞体複体を作る ─ 頂点・辺・面を置いてオイラー標数を数える
// 離散モース理論の舞台は「胞体複体」：点（0 次元）、線（1 次元）、面（2 次元）を貼り合わせたもの
//   V − E + F = オイラー標数 χ = b0 − b1。b0 = 塊の数、b1 = 穴の数（穴 = 辺で囲まれているのに面で埋まっていない所）
// クリック = 頂点を置く / 頂点からドラッグ = 辺を引く / F = マウスのある三角形・四角形を面にする / X = 近くの頂点を消す / R = ランダムな複体 / C = 全部消す
// ============================================

let verts = [];                  // { x, y }
let edges = [];                  // [a, b]（頂点番号、a < b）
let faces = [];                  // 頂点番号の列（3 つか 4 つ、まわる順）
let dragFrom = -1;
let snapR = 18;                  // ★ 頂点をつかむ距離
let msg = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomComplex();
}

function nearestVertex(x, y) {
  let best = -1, bd = snapR;
  for (let i = 0; i < verts.length; i++) { let d = dist(x, y, verts[i].x, verts[i].y); if (d < bd) { bd = d; best = i; } }
  return best;
}
function hasEdge(a, b) { return edges.some((e) => e[0] === Math.min(a, b) && e[1] === Math.max(a, b)); }
function addEdge(a, b) { if (a !== b && !hasEdge(a, b)) edges.push([Math.min(a, b), Math.max(a, b)]); }
function neighbors(a) { let out = []; for (let e of edges) { if (e[0] === a) out.push(e[1]); if (e[1] === a) out.push(e[0]); } return out; }

// 多角形の中にマウスがあるか
function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    let a = verts[poly[i]], b = verts[poly[j]];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
function polyArea(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { let a = verts[poly[i]], b = verts[poly[(i + 1) % poly.length]]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; }
function sameFace(p, q) { return p.length === q.length && p.every((v) => q.includes(v)); }

// ★ F：マウスを囲む、辺でできた三角形・四角形のうち一番小さいものを面にする
function addFaceAtMouse() {
  let best = null, bestA = 1e18;
  let consider = (poly) => { if (inside(poly, mouseX, mouseY) && !faces.some((f) => sameFace(f, poly))) { let a = polyArea(poly); if (a < bestA) { bestA = a; best = poly; } } };
  for (let a = 0; a < verts.length; a++) for (let b of neighbors(a)) {
    if (b <= a) continue;
    for (let c of neighbors(b)) {
      if (c === a) continue;
      if (c > a && hasEdge(a, c)) consider([a, b, c]);
      for (let d of neighbors(c)) if (d !== b && d > a && d !== a && hasEdge(a, d) && !hasEdge(a, c) && !hasEdge(b, d)) consider([a, b, c, d]);
    }
  }
  if (best) { faces.push(best); msg = '面を追加：' + best.length + ' 角形'; } else msg = '面にできる三角形・四角形がマウスの下にない';
}

// オイラー標数とベッチ数（b0 は Union-Find、b1 = b0 − χ：平面なので b2 = 0）
function betti() {
  let parent = verts.map((v, i) => i);
  let find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let [a, b] of edges) { a = find(a); b = find(b); if (a !== b) parent[a] = b; }
  let b0 = 0; for (let i = 0; i < verts.length; i++) if (find(i) === i) b0++;
  let chi = verts.length - edges.length + faces.length;
  return { b0, b1: b0 - chi, chi };
}

function randomComplex() {
  verts = []; edges = []; faces = [];
  let n = 14;
  for (let k = 0; k < n; k++) verts.push({ x: random(width * 0.15, width * 0.85), y: random(height * 0.2, height * 0.85) });
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (dist(verts[a].x, verts[a].y, verts[b].x, verts[b].y) < 170 && random() < 0.8) {
    if (!edges.some(([p, q]) => crossing(a, b, p, q))) addEdge(a, b);
  }
  for (let a = 0; a < n; a++) for (let b of neighbors(a)) for (let c of neighbors(b)) if (a < b && b < c && hasEdge(a, c) && random() < 0.5) faces.push([a, b, c]);
  msg = 'ランダムな複体';
}
// 辺 ab と pq が交わるか（端点を共有するものは除く）
function crossing(a, b, p, q) {
  if (a === p || a === q || b === p || b === q) return false;
  let A = verts[a], B = verts[b], P = verts[p], Q = verts[q];
  let cr = (u, v, w) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  return cr(A, B, P) * cr(A, B, Q) < 0 && cr(P, Q, A) * cr(P, Q, B) < 0;
}

function draw() {
  background(225, 30, 8);
  // 面
  noStroke();
  for (let f of faces) { fill(12, 70, 90, 45); beginShape(); for (let v of f) vertex(verts[v].x, verts[v].y); endShape(CLOSE); }
  // 辺
  stroke(85, 60, 90); strokeWeight(3);
  for (let [a, b] of edges) line(verts[a].x, verts[a].y, verts[b].x, verts[b].y);
  if (dragFrom >= 0) { stroke(48, 80, 100); line(verts[dragFrom].x, verts[dragFrom].y, mouseX, mouseY); }
  // 頂点
  noStroke();
  for (let i = 0; i < verts.length; i++) { fill(272, 60, 100); circle(verts[i].x, verts[i].y, 14); }
  let nv = nearestVertex(mouseX, mouseY);
  if (nv >= 0) { noFill(); stroke(0, 0, 100); strokeWeight(2); circle(verts[nv].x, verts[nv].y, 26); }

  let b = betti();
  fill(0, 0, 100); noStroke(); textSize(20); textAlign(LEFT, BASELINE);
  text('V = ' + verts.length + '　E = ' + edges.length + '　F = ' + faces.length + '　　χ = V − E + F = ' + b.chi + '　　b0（塊）= ' + b.b0 + '　b1（穴）= ' + b.b1 + '　　χ = b0 − b1 ✓', 30, 40);
  fill(0, 0, 65); textSize(15);
  text('クリック：頂点　ドラッグ：辺　F：マウスの下の三角形・四角形を面に　X：頂点を消す　R：ランダム　C：消す　　' + msg, 30, 66);
  fill(0, 0, 55); textSize(14);
  text('穴 = 辺で囲まれているのに面がない所。面で埋めると b1 が 1 減り、χ が 1 増える', 30, height - 30);
}

function mousePressed() {
  if (mouseY < 80) return;
  let v = nearestVertex(mouseX, mouseY);
  if (v >= 0) dragFrom = v; else { verts.push({ x: mouseX, y: mouseY }); dragFrom = -1; msg = '頂点を追加'; }
}
function mouseReleased() {
  if (dragFrom >= 0) {
    let v = nearestVertex(mouseX, mouseY);
    if (v >= 0 && v !== dragFrom) { addEdge(dragFrom, v); msg = '辺を追加'; }
    else if (v < 0 && dist(mouseX, mouseY, verts[dragFrom].x, verts[dragFrom].y) > snapR) { verts.push({ x: mouseX, y: mouseY }); addEdge(dragFrom, verts.length - 1); msg = '頂点と辺を追加'; }
  }
  dragFrom = -1;
}

function keyPressed() {
  if (key === 'f' || key === 'F') addFaceAtMouse();
  if (key === 'r' || key === 'R') randomComplex();
  if (key === 'c' || key === 'C') { verts = []; edges = []; faces = []; msg = ''; }
  if (key === 'x' || key === 'X') {
    let v = nearestVertex(mouseX, mouseY);
    if (v < 0) return;
    verts.splice(v, 1);
    edges = edges.filter((e) => e[0] !== v && e[1] !== v).map((e) => e.map((k) => (k > v ? k - 1 : k)));
    faces = faces.filter((f) => !f.includes(v)).map((f) => f.map((k) => (k > v ? k - 1 : k)));
    msg = '頂点を削除';
  }
}

// ---------- やってみよう ----------
// 1. 三角形を 1 つ作る（V=3, E=3, F=0）→ χ = 0、b1 = 1。F で埋めると χ = 1。表で確かめよう
// 2. 「8 の字」（穴 2 つ）を作って b1 = 2 にしよう。最低何個の頂点がいる？
// 3. 離れた塊を 2 つ作ると b0 = 2。辺 1 本でつなぐと χ はどう変わる？
// 4. 四角形の面を 2 つ並べて共通の辺を X で消す（頂点ごと）。面も消えるのはなぜ？
