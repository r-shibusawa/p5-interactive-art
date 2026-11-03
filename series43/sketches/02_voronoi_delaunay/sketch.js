// ============================================
// 02 ボロノイ図とドロネー三角形分割の双対
// 同じ点群から作る 2 つの図は裏表の関係：
//   ボロノイの「面」 ↔ ドロネーの「頂点」（母点）、ボロノイの「頂点」 ↔ ドロネーの「三角形」（外接円の中心）
//   ボロノイの「辺」 ↔ ドロネーの「辺」（垂直二等分線どうし）
// クリック = 点を追加 / ドラッグ = 点を動かす / V・D = 表示切替 / K = 外接円 / R = ランダム / C = 全部消す
// ============================================

let pts = [];
let showV = true, showD = true, showCirc = false;
let dragI = -1;
let maxPts = 60;      // ★ 点の上限（多いと重い）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomPts(14);
}
function fieldRect() { return { x: 20, y: 95, w: width - 40, h: height - 130 }; }
function randomPts(n) {
  let A = fieldRect(); pts = [];
  for (let i = 0; i < n; i++) pts.push({ x: A.x + 60 + random(A.w - 120), y: A.y + 60 + random(A.h - 120) });
}

function draw() {
  background(250, 40, 10);
  let A = fieldRect();
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(A.x, A.y, A.w, A.h);
  let tris = pts.length >= 3 ? delaunay(pts) : [];
  let cells = pts.length >= 2 ? voronoiCells(pts, A.x, A.y, A.x + A.w, A.y + A.h) : [];

  // マウスに近い母点・近い外接円の中心
  let near = -1, nearT = -1;
  for (let i = 0; i < pts.length; i++) if (dist(mouseX, mouseY, pts[i].x, pts[i].y) < 18) near = i;
  for (let t = 0; t < tris.length; t++) if (dist(mouseX, mouseY, tris[t].cx, tris[t].cy) < 12) nearT = t;
  if (dragI >= 0) near = dragI;

  // ボロノイの面（母点ごとに 1 つ）
  if (showV) {
    for (let i = 0; i < cells.length; i++) {
      let c = cells[i]; if (c.length < 3) continue;
      noStroke(); fill(180 + (i * 23) % 60, 50, 60, i === near ? 55 : 14);
      beginShape(); for (let p of c) vertex(p.x, p.y); endShape(CLOSE);
      stroke(180, 70, 100, 80); strokeWeight(2); noFill();
      beginShape(); for (let p of c) vertex(p.x, p.y); endShape(CLOSE);
    }
  }
  // ドロネーの辺
  if (showD) {
    stroke(10, 80, 100, 70); strokeWeight(1.5);
    for (let t of tris) {
      for (let [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
        if (near >= 0 && (a === near || b === near)) { strokeWeight(4); stroke(10, 90, 100); } else { strokeWeight(1.5); stroke(10, 80, 100, 60); }
        line(pts[a].x, pts[a].y, pts[b].x, pts[b].y);
      }
    }
  }
  // ボロノイの頂点 = 外接円の中心（三角形の数だけある）
  if (showV && showD) {
    noStroke(); fill(55, 90, 100);
    for (let t of tris) if (t.cx > A.x && t.cx < A.x + A.w && t.cy > A.y && t.cy < A.y + A.h) circle(t.cx, t.cy, 6);
  }
  // 外接円（空円性：中に母点が入らない）
  if ((showCirc || nearT >= 0) && tris.length) {
    let list = nearT >= 0 ? [tris[nearT]] : tris;
    noFill(); stroke(55, 80, 100, nearT >= 0 ? 90 : 25); strokeWeight(nearT >= 0 ? 2 : 1);
    for (let t of list) circle(t.cx, t.cy, 2 * Math.sqrt(t.r2));
    if (nearT >= 0) { let t = tris[nearT]; noStroke(); fill(55, 80, 100, 35); triangle(pts[t.a].x, pts[t.a].y, pts[t.b].x, pts[t.b].y, pts[t.c].x, pts[t.c].y); }
  }
  // 母点
  for (let i = 0; i < pts.length; i++) { noStroke(); fill(i === near ? 50 : 0, i === near ? 90 : 0, 100); circle(pts[i].x, pts[i].y, i === near ? 12 : 8); }

  // 数える：面 = 母点、ボロノイ頂点 = 三角形
  noStroke(); fill(0, 0, 100); textSize(18);
  text('母点 ' + pts.length + '（= ボロノイの面）　三角形 ' + tris.length + '（= ボロノイの頂点 ●）　V：ボロノイ ' + (showV ? 'ON' : 'off') + '　D：ドロネー ' + (showD ? 'ON' : 'off') + '　K：外接円　R：ランダム　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('点にマウス：その面と、面を囲む辺に直交するドロネー辺（双対の辺）が光る。黄の ● にマウス：3 母点を通る外接円（中に他の点が入らない）。辺の数は両方同じ', 20, 68);
}

function mousePressed() {
  for (let i = 0; i < pts.length; i++) if (dist(mouseX, mouseY, pts[i].x, pts[i].y) < 14) { dragI = i; return; }
  let A = fieldRect();
  if (mouseX > A.x && mouseX < A.x + A.w && mouseY > A.y && mouseY < A.y + A.h && pts.length < maxPts) { pts.push({ x: mouseX, y: mouseY }); dragI = pts.length - 1; }
}
function mouseDragged() {
  if (dragI < 0) return;
  let A = fieldRect();
  pts[dragI].x = constrain(mouseX, A.x + 2, A.x + A.w - 2); pts[dragI].y = constrain(mouseY, A.y + 2, A.y + A.h - 2);
}
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if (key === 'v' || key === 'V') showV = !showV;
  if (key === 'd' || key === 'D') showD = !showD;
  if (key === 'k' || key === 'K') showCirc = !showCirc;
  if (key === 'r' || key === 'R') randomPts(14);
  if (key === 'c' || key === 'C') pts = [];
}

// ---------- やってみよう ----------
// 1. 点を 3 つだけにする。三角形 1 つ、ボロノイの頂点 1 つ。4 点目を外接円の中に入れると？
// 2. 4 点を正方形に置くと外接円に 4 点が乗る（退化）。少しずらすと三角形の分け方が変わる瞬間を見よう
// 3. 点をどれか 1 つだけ動かすと、ボロノイの面はいくつ変わる？ 隣の面だけ？
// 4. 母点を格子状に並べるとボロノイは正方形、三角格子なら六角形（ハニカム）になる


// ==================================================
// ここから下は「ボロノイ・ドロネーの道具」（中身は読まなくても OK）
// ==================================================

// 三角形 (a, b, c) と外接円（中心 cx, cy・半径² r2）
function makeTri(P, a, b, c) {
  let A = P[a], B = P[b], C = P[c];
  let d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(d) < 1e-9) d = 1e-9;
  let a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
  let cx = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d;
  let cy = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
  return { a, b, c, cx, cy, r2: (A.x - cx) ** 2 + (A.y - cy) ** 2 };
}

// ドロネー三角形分割（Bowyer–Watson 法）：点を 1 つずつ入れ、外接円に含む三角形を壊して貼り直す
function delaunay(P0) {
  let n = P0.length, big = 1e5;
  let P = P0.concat([{ x: -big, y: -big }, { x: big, y: -big }, { x: 0, y: big }]);
  let tris = [makeTri(P, n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    let bad = [], keep = [];
    for (let t of tris) (((P[i].x - t.cx) ** 2 + (P[i].y - t.cy) ** 2 < t.r2) ? bad : keep).push(t);
    let edges = [];
    for (let t of bad) for (let [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
      let shared = bad.some((u) => u !== t && [[u.a, u.b], [u.b, u.c], [u.c, u.a]].some(([p, q]) => (p === a && q === b) || (p === b && q === a)));
      if (!shared) edges.push([a, b]);
    }
    for (let [a, b] of edges) keep.push(makeTri(P, a, b, i));
    tris = keep;
  }
  return tris.filter((t) => t.a < n && t.b < n && t.c < n);
}

// ボロノイの面：枠を、各母点との垂直二等分線で切っていく（半平面の交わり）
function voronoiCells(P, x0, y0, x1, y1) {
  return P.map((p, i) => {
    let poly = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    for (let j = 0; j < P.length && poly.length; j++) {
      if (j === i) continue;
      let q = P[j], nx = q.x - p.x, ny = q.y - p.y, c = nx * (p.x + q.x) / 2 + ny * (p.y + q.y) / 2;
      poly = clipHalf(poly, nx, ny, c);
    }
    return poly;
  });
}
// 多角形を半平面 nx*x + ny*y <= c で切る（Sutherland–Hodgman）
function clipHalf(poly, nx, ny, c) {
  let out = [];
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], b = poly[(i + 1) % poly.length];
    let fa = nx * a.x + ny * a.y - c, fb = nx * b.x + ny * b.y - c;
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { let t = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
  }
  return out;
}
