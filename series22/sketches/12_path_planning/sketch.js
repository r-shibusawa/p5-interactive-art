// ============================================
// 12 経路計画：ボロノイ辺に沿って
// 障害物と壁のふちに点を並べてボロノイ図を作ると、その辺は「左右の障害物からちょうど真ん中」を通る道になる
//   = いちばん安全な（障害物から遠い）道の網。その網の上をダイクストラ法で探すと、ぶつかりにくい経路が見つかる
// クリック = 障害物を置く / S・G = マウスの位置にスタート・ゴール / ↑↓ = ロボットの半径 / スペース = 走らせる / V = 網の表示 / R = ランダム / C = 障害物を消す
// ============================================

let obs = [];             // 障害物 {x, y, r}
let start, goal;
let robotR = 18;          // ★ ロボットの半径（これより狭いすき間は通れない）
let bounds;
let pts = [], owner = [];
let nodes = [], edges = [];   // 道の網（ノード = ボロノイの頂点）
let path = [], pathLen = 0;
let dirty = true;
let showNet = true;
let robot = null;         // 走っているロボット {d: 進んだ距離}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  bounds = { x0: 20, y0: 100, x1: width - 20, y1: height - 20 };
  start = { x: bounds.x0 + 50, y: (bounds.y0 + bounds.y1) / 2 };
  goal = { x: bounds.x1 - 50, y: (bounds.y0 + bounds.y1) / 2 };
  randomObstacles();
}
function randomObstacles() {
  obs = [];
  let guard = 0;
  while (obs.length < 14 && guard++ < 500) {
    let o = { x: random(bounds.x0 + 60, bounds.x1 - 60), y: random(bounds.y0 + 40, bounds.y1 - 40), r: random(25, 70) };
    if (dist(o.x, o.y, start.x, start.y) < o.r + 60 || dist(o.x, o.y, goal.x, goal.y) < o.r + 60) continue;
    if (obs.some((q) => dist(o.x, o.y, q.x, q.y) < o.r + q.r + 15)) continue;
    obs.push(o);
  }
  dirty = true;
}

// 障害物・壁からの距離（すき間の広さ）
function clearance(x, y) {
  let c = min(x - bounds.x0, bounds.x1 - x, y - bounds.y0, bounds.y1 - y);
  for (let o of obs) c = min(c, dist(x, y, o.x, o.y) - o.r);
  return c;
}
function segClear(a, b) {
  let n = max(1, ceil(dist(a.x, a.y, b.x, b.y) / 6));
  for (let k = 0; k <= n; k++) if (clearance(lerp(a.x, b.x, k / n), lerp(a.y, b.y, k / n)) < robotR) return false;
  return true;
}

function rebuild() {
  // ① 障害物のふちと壁に点を並べる（持ち主の番号つき）
  pts = []; owner = [];
  obs.forEach((o, k) => {
    let m = max(8, ceil(TWO_PI * o.r / 18));
    for (let i = 0; i < m; i++) { pts.push({ x: o.x + o.r * cos(TWO_PI * i / m), y: o.y + o.r * sin(TWO_PI * i / m) }); owner.push(k); }
  });
  for (let x = bounds.x0; x <= bounds.x1; x += 30) { pts.push({ x, y: bounds.y0 }); owner.push(-1); pts.push({ x: x + 15, y: bounds.y1 }); owner.push(-3); }
  for (let y = bounds.y0 + 15; y < bounds.y1; y += 30) { pts.push({ x: bounds.x0, y }); owner.push(-4); pts.push({ x: bounds.x1, y: y + 7 }); owner.push(-2); }
  // ② ドロネー → となりの三角形の外心どうしを結ぶ = ボロノイの辺
  let tris = delaunay(pts);
  nodes = tris.map((t) => { let c = circumcircle(pts[t[0]], pts[t[1]], pts[t[2]]); return { x: c.x, y: c.y, c: clearance(c.x, c.y), adj: [] }; });
  let em = new Map();
  tris.forEach((t, ti) => {
    for (let e = 0; e < 3; e++) {
      let a = t[e], b = t[(e + 1) % 3], id = min(a, b) + '_' + max(a, b);
      if (em.has(id)) em.get(id).push(ti); else em.set(id, [ti]);
    }
  });
  edges = [];
  for (let [id, list] of em) {
    if (list.length < 2) continue;
    let [a, b] = id.split('_').map(Number);
    if (owner[a] === owner[b]) continue;                // 同じ障害物どうし → 障害物の中の辺なので使わない
    let u = list[0], v = list[1], A = nodes[u], B = nodes[v];
    let mc = clearance((A.x + B.x) / 2, (A.y + B.y) / 2);
    let ok = A.c >= robotR && B.c >= robotR && mc >= robotR;
    edges.push({ u, v, ok, c: min(A.c, B.c, mc) });
    if (ok) { let w = dist(A.x, A.y, B.x, B.y); A.adj.push([v, w]); B.adj.push([u, w]); }
  }
  findPath();
  dirty = false;
}

// ③ スタート・ゴールを近くのノードにつないで、ダイクストラ法
function findPath() {
  path = []; pathLen = 0;
  let S = nodes.length, G = nodes.length + 1;
  let link = (p) => nodes.map((n, i) => [i, dist(p.x, p.y, n.x, n.y)]).filter(([i]) => nodes[i].c >= robotR)
    .sort((a, b) => a[1] - b[1]).slice(0, 12).filter(([i]) => segClear(p, nodes[i])).slice(0, 3);
  let fromS = link(start), toG = link(goal);
  if (clearance(start.x, start.y) < robotR || clearance(goal.x, goal.y) < robotR) return;
  let N = nodes.length + 2, d = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), done = new Array(N).fill(false);
  let adj = (i) => i === S ? fromS : i < nodes.length ? nodes[i].adj.concat(toG.filter(([j]) => j === i).map(([j, w]) => [G, w])) : [];
  d[S] = 0;
  for (let it = 0; it < N; it++) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0 || d[u] === Infinity || u === G) break;
    done[u] = true;
    for (let [v, w] of adj(u)) if (d[u] + w < d[v]) { d[v] = d[u] + w; prev[v] = u; }
  }
  if (d[G] === Infinity) return;
  for (let v = G; v >= 0; v = prev[v]) path.unshift(v === S ? start : v === G ? goal : nodes[v]);
  pathLen = d[G];
}

function pointAt(dd) {
  for (let k = 0; k + 1 < path.length; k++) {
    let a = path[k], b = path[k + 1], L = dist(a.x, a.y, b.x, b.y);
    if (dd <= L) return { x: lerp(a.x, b.x, dd / L), y: lerp(a.y, b.y, dd / L) };
    dd -= L;
  }
  return path.length ? path[path.length - 1] : start;
}

function draw() {
  background(230, 25, 12);
  if (dirty) rebuild();
  noFill(); stroke(0, 0, 60); strokeWeight(2); rect(bounds.x0, bounds.y0, bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);

  // 道の網：色 = すき間の広さ（赤 = 狭い → 緑 = 広い）。通れない辺は薄く
  if (showNet) for (let e of edges) {
    let A = nodes[e.u], B = nodes[e.v];
    if (e.ok) { stroke(constrain(map(e.c, robotR, 120, 0, 140), 0, 140), 70, 90, 80); strokeWeight(2); }
    else { stroke(0, 0, 100, 12); strokeWeight(1); }
    line(A.x, A.y, B.x, B.y);
  }
  noStroke(); fill(230, 15, 50);
  for (let o of obs) circle(o.x, o.y, o.r * 2);

  // まっすぐの線（ぶつかる所に ×）
  drawingContext.setLineDash([8, 8]); stroke(0, 70, 100, 70); strokeWeight(2); line(start.x, start.y, goal.x, goal.y); drawingContext.setLineDash([]);
  let hits = 0, n = ceil(dist(start.x, start.y, goal.x, goal.y) / 10);
  for (let k = 0; k <= n; k++) {
    let x = lerp(start.x, goal.x, k / n), y = lerp(start.y, goal.y, k / n);
    if (clearance(x, y) < robotR) { hits++; if (k % 2 === 0) { stroke(0, 90, 100); strokeWeight(2); line(x - 4, y - 4, x + 4, y + 4); line(x - 4, y + 4, x + 4, y - 4); } }
  }

  // 見つけた道
  if (path.length) {
    noFill(); stroke(50, 90, 100); strokeWeight(5);
    beginShape(); for (let p of path) vertex(p.x, p.y); endShape();
  }
  // ロボット
  if (robot && path.length) {
    robot.d += 3;
    let p = pointAt(robot.d);
    noStroke(); fill(190, 80, 100, 50); circle(p.x, p.y, robotR * 2);
    fill(190, 80, 100); circle(p.x, p.y, 10);
    if (robot.d > pathLen + 30) robot = null;
  }
  noStroke(); fill(130, 80, 100); circle(start.x, start.y, 18); fill(0, 80, 100); circle(goal.x, goal.y, 18);
  fill(0, 0, 10); textSize(12); textAlign(CENTER, CENTER); text('S', start.x, start.y); text('G', goal.x, goal.y); textAlign(LEFT, BASELINE);

  fill(0, 0, 100); textSize(18);
  text('クリック：障害物　S・G：スタート・ゴール　↑↓：ロボットの半径 ' + robotR + '　スペース：走らせる　V：網 ' + (showNet ? 'ON' : 'off') + '　R：ランダム　C：消す', 20, 40);
  fill(0, 0, 65); textSize(15);
  let straight = dist(start.x, start.y, goal.x, goal.y);
  text('黄 = ボロノイの辺だけを通る道 ' + (path.length ? nf(pathLen, 1, 0) + 'px' : '（見つからない：すき間が狭い）') + '　赤い点線 = まっすぐ ' + nf(straight, 1, 0) + 'px（ぶつかる所 ' + hits + '）。網の色 = すき間の広さ（緑ほど広い）。遠回りでも、いちばん障害物から遠い道', 20, 68);
}

function mousePressed() {
  if (mouseX > bounds.x0 && mouseX < bounds.x1 && mouseY > bounds.y0 && mouseY < bounds.y1) { obs.push({ x: mouseX, y: mouseY, r: random(25, 60) }); dirty = true; }
}
function keyPressed() {
  let inBox = mouseX > bounds.x0 && mouseX < bounds.x1 && mouseY > bounds.y0 && mouseY < bounds.y1;
  if ((key === 's' || key === 'S') && inBox) { start = { x: mouseX, y: mouseY }; dirty = true; }
  if ((key === 'g' || key === 'G') && inBox) { goal = { x: mouseX, y: mouseY }; dirty = true; }
  if (key === UP_ARROW) { robotR = min(60, robotR + 3); dirty = true; }
  if (key === DOWN_ARROW) { robotR = max(3, robotR - 3); dirty = true; }
  if (key === ' ') robot = { d: 0 };
  if (key === 'v' || key === 'V') showNet = !showNet;
  if (key === 'r' || key === 'R') randomObstacles();
  if (key === 'c' || key === 'C') { obs = []; dirty = true; }
}

// ---------- やってみよう ----------
// 1. ロボットの半径を大きくしていくと、狭いすき間の辺が消えて道が遠回りになる。道がなくなる半径は？
// 2. 辺の重みを「長さ」でなく「長さ ÷ すき間」にすると、もっと安全側を通る道になる。試そう
// 3. シリーズ 21 の A*（格子）や RRT と比べると？ ボロノイの道は「最短」ではないが「いちばん安全」
// 4. 障害物を四角形や壁の線にしても、ふちに点を並べれば同じ方法が使える（一般化ボロノイ図）


// ==================================================
// ここから下は「ボロノイ図の道具」（ほかのスケッチにもそのままコピーして使える）
//   voronoiCell(sites, i, x0, y0, x1, y1) … サイト i の領域（多角形）。長方形を垂直二等分線で切っていく（O(n²)）
//   delaunay(pts) … ドロネー三角形分割（Bowyer–Watson 法）。[[i, j, k], ...] を返す
//   circumcircle(a, b, c) … 外接円 {x, y, r2}（r2 = 半径の 2 乗）
//   polyArea(poly) / polyCentroid(poly) … 多角形の面積と重心
// ==================================================
function voronoiCell(sites, i, x0, y0, x1, y1) {
  let poly = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  let a = sites[i];
  for (let j = 0; j < sites.length && poly.length > 2; j++) {
    if (j === i) continue;
    let b = sites[j];
    // a の側 ＝ (b − a)・p ≦ (|b|² − |a|²) / 2　（a と b の垂直二等分線で切る）
    poly = clipHalfPlane(poly, b.x - a.x, b.y - a.y, (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y) / 2);
  }
  return poly;
}
// nx·x + ny·y ≦ c の側だけ残す（Sutherland–Hodgman の 1 本分）
function clipHalfPlane(poly, nx, ny, c) {
  let out = [];
  for (let k = 0; k < poly.length; k++) {
    let p = poly[k], q = poly[(k + 1) % poly.length];
    let dp = nx * p.x + ny * p.y - c, dq = nx * q.x + ny * q.y - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      let t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}
function polyArea(poly) {
  let s = 0;
  for (let k = 0; k < poly.length; k++) { let p = poly[k], q = poly[(k + 1) % poly.length]; s += p.x * q.y - q.x * p.y; }
  return Math.abs(s) / 2;
}
function polyCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let k = 0; k < poly.length; k++) {
    let p = poly[k], q = poly[(k + 1) % poly.length], cr = p.x * q.y - q.x * p.y;
    a += cr; cx += (p.x + q.x) * cr; cy += (p.y + q.y) * cr;
  }
  if (Math.abs(a) < 1e-9) {
    let sx = 0, sy = 0;
    for (let p of poly) { sx += p.x; sy += p.y; }
    return poly.length ? { x: sx / poly.length, y: sy / poly.length } : { x: 0, y: 0 };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}
function circumcircle(a, b, c) {
  let d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, r2: Infinity };
  let a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  let x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  let y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { x, y, r2: (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) };
}
// Bowyer–Watson：点を 1 つずつ入れ、「外接円の中に新しい点がある三角形」を消して穴を新しい点とつなぐ
function delaunay(pts) {
  let n = pts.length;
  if (n < 3) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  let m = Math.max(x1 - x0, y1 - y0, 1) * 20, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let P = pts.concat([{ x: cx - m, y: cy - m }, { x: cx + m, y: cy - m }, { x: cx, y: cy + m }]);   // 全部を囲む大きな三角形
  let mk = (i, j, k) => ({ v: [i, j, k], c: circumcircle(P[i], P[j], P[k]) });
  let tris = [mk(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    let p = P[i], edges = new Map(), keep = [];
    for (let t of tris) {
      if ((p.x - t.c.x) * (p.x - t.c.x) + (p.y - t.c.y) * (p.y - t.c.y) < t.c.r2) {
        for (let e = 0; e < 3; e++) {
          let a = t.v[e], b = t.v[(e + 1) % 3], id = a < b ? a + '_' + b : b + '_' + a;
          if (edges.has(id)) edges.delete(id); else edges.set(id, [a, b]);   // 2 回出た辺 = 穴の内側なので消す
        }
      } else keep.push(t);
    }
    for (let [a, b] of edges.values()) keep.push(mk(a, b, i));
    tris = keep;
  }
  return tris.filter((t) => t.v[0] < n && t.v[1] < n && t.v[2] < n).map((t) => t.v);
}
