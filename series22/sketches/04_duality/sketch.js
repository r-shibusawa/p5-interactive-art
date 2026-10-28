// ============================================
// 04 双対性：ボロノイとドロネー
// ボロノイ図とドロネー三角形分割は「裏表」の関係（双対）
//   となり合うセルのサイト同士を結ぶ = ドロネーの辺。ボロノイの辺はその辺と直交する。三角形の外心 = ボロノイの頂点
// V = ボロノイ / D = ドロネー / O = 外接円 / マウスを辺に近づける = 対応する辺 / ドラッグ = 動かす / クリック = 追加 / R = ランダム / C = 消す
// ============================================

let sites = [];
let showV = true, showD = true, showO = false;
let cells = [], tris = [], circ = [];
let edgeMap = new Map();  // ドロネーの辺 "i_j" → その辺を持つ三角形の番号
let dirty = true;
let dragging = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomSites(22);
}
function randomSites(n) {
  sites = [];
  for (let i = 0; i < n; i++) sites.push({ x: random(80, width - 80), y: random(140, height - 60) });
  dirty = true;
}

function rebuild() {
  cells = sites.map((s, i) => voronoiCell(sites, i, 0, 90, width, height));
  tris = delaunay(sites);
  circ = tris.map((t) => circumcircle(sites[t[0]], sites[t[1]], sites[t[2]]));
  edgeMap = new Map();
  tris.forEach((t, ti) => {
    for (let e = 0; e < 3; e++) {
      let a = t[e], b = t[(e + 1) % 3], id = min(a, b) + '_' + max(a, b);
      if (!edgeMap.has(id)) edgeMap.set(id, []);
      edgeMap.get(id).push(ti);
    }
  });
  dirty = false;
}

// ドロネーの辺 (a, b) に対応するボロノイの辺：両側の三角形の外心を結ぶ。片側しかない（外周）なら外向きに半直線
function dualEdge(a, b, list) {
  let c1 = circ[list[0]];
  if (list.length === 2) { let c2 = circ[list[1]]; return [c1.x, c1.y, c2.x, c2.y]; }
  let t = tris[list[0]], third = t.find((v) => v !== a && v !== b);
  let mx = (sites[a].x + sites[b].x) / 2, my = (sites[a].y + sites[b].y) / 2;
  let nx = -(sites[b].y - sites[a].y), ny = sites[b].x - sites[a].x, L = sqrt(nx * nx + ny * ny) || 1;
  if ((sites[third].x - mx) * nx + (sites[third].y - my) * ny > 0) { nx = -nx; ny = -ny; }   // 3 番目の点と反対向き
  return [c1.x, c1.y, c1.x + nx / L * 3000, c1.y + ny / L * 3000];
}

function segDist(px, py, x1, y1, x2, y2) {
  let dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? constrain(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

function draw() {
  background(230, 25, 12);
  if (dirty) rebuild();

  if (showV) {
    for (let i = 0; i < cells.length; i++) {
      fill((i * 137.5) % 360, 35, 45, 60); stroke(50, 80, 100); strokeWeight(2);
      beginShape(); for (let p of cells[i]) vertex(p.x, p.y); endShape(CLOSE);
    }
    noStroke(); fill(50, 90, 100);
    for (let c of circ) circle(c.x, c.y, 7);            // ボロノイの頂点 = 外心
  }
  if (showO) {
    noFill(); stroke(0, 0, 100, 25); strokeWeight(1);
    for (let c of circ) if (c.r2 < 4e6) circle(c.x, c.y, 2 * sqrt(c.r2));
  }
  if (showD) {
    stroke(190, 70, 100); strokeWeight(1.5);
    for (let id of edgeMap.keys()) { let [a, b] = id.split('_').map(Number); line(sites[a].x, sites[a].y, sites[b].x, sites[b].y); }
  }

  // マウスにいちばん近いドロネーの辺と、その双対のボロノイの辺
  let best = null, bd = 18;
  for (let [id, list] of edgeMap) {
    let [a, b] = id.split('_').map(Number);
    let d = segDist(mouseX, mouseY, sites[a].x, sites[a].y, sites[b].x, sites[b].y);
    if (d < bd) { bd = d; best = { a, b, list }; }
  }
  let info = '';
  if (best) {
    let { a, b, list } = best, e = dualEdge(a, b, list);
    stroke(190, 90, 100); strokeWeight(5); line(sites[a].x, sites[a].y, sites[b].x, sites[b].y);
    stroke(50, 100, 100); strokeWeight(5); line(e[0], e[1], e[2], e[3]);
    for (let ti of list) { noFill(); stroke(50, 100, 100, 70); strokeWeight(2); circle(circ[ti].x, circ[ti].y, 2 * sqrt(circ[ti].r2)); }
    // 直交の確認：2 本の向きの内積
    let ux = sites[b].x - sites[a].x, uy = sites[b].y - sites[a].y, vx = e[2] - e[0], vy = e[3] - e[1];
    let cosv = (ux * vx + uy * vy) / ((sqrt(ux * ux + uy * uy) * sqrt(vx * vx + vy * vy)) || 1);
    info = '　｜　水色の辺と黄色の辺のなす角 ' + nf(degrees(acos(constrain(abs(cosv), 0, 1))), 1, 1) + '°' + (list.length === 1 ? '（外周の辺 → ボロノイ側は無限に伸びる）' : '');
  }

  for (let s of sites) { stroke(0, 0, 10); strokeWeight(2); fill(0, 0, 100); circle(s.x, s.y, 12); }

  noStroke(); fill(0, 0, 0, 55); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text('V：ボロノイ ' + (showV ? 'ON' : 'off') + '　D：ドロネー ' + (showD ? 'ON' : 'off') + '　O：外接円 ' + (showO ? 'ON' : 'off') + '　マウスを水色の辺へ　ドラッグ：動かす　クリック：追加　R：ランダム　C：消す　点 ' + sites.length + '　辺 ' + edgeMap.size + '　三角形 ' + tris.length, 20, 40);
  fill(0, 0, 80); textSize(15);
  text('黄の点 = ボロノイの頂点 = ドロネー三角形の外心（3 つのサイトから等距離）。となりのセル同士を結ぶとドロネーになる' + info, 20, 68);
}

function mousePressed() {
  if (mouseY < 90) return;
  for (let i = 0; i < sites.length; i++) if (dist(mouseX, mouseY, sites[i].x, sites[i].y) < 14) { dragging = i; return; }
  sites.push({ x: mouseX, y: mouseY }); dirty = true;
}
function mouseDragged() {
  if (dragging < 0) return;
  sites[dragging].x = constrain(mouseX, 0, width); sites[dragging].y = constrain(mouseY, 90, height); dirty = true;
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'v' || key === 'V') showV = !showV;
  if (key === 'd' || key === 'D') showD = !showD;
  if (key === 'o' || key === 'O') showO = !showO;
  if (key === 'r' || key === 'R') randomSites(floor(random(10, 40)));
  if (key === 'c' || key === 'C') { sites = []; dirty = true; }
}

// ---------- やってみよう ----------
// 1. サイトを 1 つドラッグして、ボロノイの頂点（黄）と外接円の中心がいつも一致していることを確かめよう
// 2. セルの辺の数 = そのサイトから出ているドロネーの辺の数。いくつかのサイトで数えて確かめよう
// 3. 外周のサイト（凸包の上）のセルは無限に広がっている（画面の端で切れているだけ）。どのサイトがそう？
// 4. オイラーの公式：点 n、ドロネーの辺 e、三角形 t のあいだに n − e + t = 1 が成り立つ。表示の数で確かめよう


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
