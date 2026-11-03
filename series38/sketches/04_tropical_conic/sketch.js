// ============================================
// 04 トロピカル 2 次曲線とニュートン多角形の双対性
// F = min(a00, a10 + x, a01 + y, a20 + 2x, a11 + x + y, a02 + 2y)：6 つの係数 = 6 つの格子点の「高さ」
//   高さを 3 次元に持ち上げて下から見た凸包 = ニュートン三角形の「正則細分」
//   細分の 辺 ⇔ 曲線の 辺（垂直）， 三角形 ⇔ 曲線の 頂点， 境界の辺 ⇔ 無限に伸びる半直線（同じ色で対応）
// 右の格子点を上下にドラッグ = 高さを変える / R = ランダム / 0 = 全部 0 / S = なめらかな例
// ============================================

let terms = makeTerms(2);        // ★ 6 つの項 {i, j, a}
let sc = 60;                     // ★ 曲線側：1 単位 = 何 px
let ox, oy, nx, ny, ns;          // 曲線の原点 / ニュートン多角形の原点と間隔
let dragging = -1, dragY = 0, dragA = 0;
let cv;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.3; oy = height * 0.55;
  nx = width * 0.66; ny = height * 0.78; ns = 120;
  setExample();
}
function setExample() { let ex = { '0,0': 1, '1,0': 0, '0,1': 0, '2,0': 1, '1,1': 0, '0,2': 1 }; for (let t of terms) t.a = ex[t.i + ',' + t.j]; }   // ★ 4 つの三角形に割れる例
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }
function latX(i) { return nx + i * ns; }
function latY(j) { return ny - j * ns; }
function cellHue(ci) { return (ci * 73 + 30) % 360; }
function edgeHue(ei) { return (ei * 41 + 200) % 360; }

function draw() {
  background(190, 55, 10);
  cv = tropCurve(terms);

  // ---- 左：曲線 ----
  stroke(0, 0, 100, 20); strokeWeight(1);
  for (let g = -8; g <= 8; g++) { line(toX(g), 0, toX(g), height); line(0, toY(g), width * 0.55, toY(g)); }
  cv.edges.forEach((e, ei) => {
    let A = cv.cells[e.c1];
    stroke(edgeHue(ei), 70, 100); strokeWeight(3 + e.w * 2);
    if (e.c2 >= 0) { let B = cv.cells[e.c2]; line(toX(A.x), toY(A.y), toX(B.x), toY(B.y)); }
    else line(toX(A.x), toY(A.y), toX(A.x + e.dx * 100), toY(A.y + e.dy * 100));
  });
  cv.cells.forEach((c, ci) => {
    noStroke(); fill(cellHue(ci), 70, 100); circle(toX(c.x), toY(c.y), 18);
    fill(0, 0, 100); textSize(12); text('(' + nf(c.x, 1, 1) + ', ' + nf(c.y, 1, 1) + ')', toX(c.x) + 12, toY(c.y) - 10);
  });

  // ---- 右：ニュートン多角形と正則細分 ----
  noStroke(); fill(0, 0, 100, 6); rect(nx - 60, ny - 2 * ns - 60, 2 * ns + 180, 2 * ns + 120, 16);
  cv.cells.forEach((c, ci) => {           // セル（三角形など）を塗る
    fill(cellHue(ci), 60, 60, 45); noStroke();
    beginShape(); for (let id of c.ids) vertex(latX(terms[id].i), latY(terms[id].j)); endShape(CLOSE);
    let mi = 0, mj = 0; for (let id of c.ids) { mi += terms[id].i / c.ids.length; mj += terms[id].j / c.ids.length; }
    fill(cellHue(ci), 70, 100); circle(latX(mi), latY(mj), 14);
  });
  cv.edges.forEach((e, ei) => {           // 細分の辺（曲線の辺と同じ色）
    stroke(edgeHue(ei), 70, 100); strokeWeight(3 + e.w * 2);
    line(latX(terms[e.p].i), latY(terms[e.p].j), latX(terms[e.q].i), latY(terms[e.q].j));
  });
  terms.forEach((t, k) => {                // 格子点と高さ
    stroke(0, 0, 10); strokeWeight(2); fill(dragging === k ? 55 : 0, dragging === k ? 90 : 0, 100);
    circle(latX(t.i), latY(t.j), 26);
    noStroke(); fill(0, 0, 100); textSize(14);
    text('a' + t.i + t.j + ' = ' + nf(t.a, 1, 1), latX(t.i) + 16, latY(t.j) - 14);
    fill(0, 0, 60); textSize(11); text('x^' + t.i + ' y^' + t.j, latX(t.i) + 16, latY(t.j) + 22);
  });

  // ---- テキスト ----
  noStroke(); fill(0, 0, 100); textSize(18);
  text('格子点を上下にドラッグ = 高さ（係数）を変える　R：ランダム　0：全部 0　S：なめらかな例', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('左 = トロピカル 2 次曲線（min が 2 回とられる場所）　右 = ニュートン多角形（三角形）の正則細分。同じ色どうしが「双対」', 20, 62);
  let tri = cv.cells.filter((c) => c.ids.length === 3).length;
  text('セル ' + cv.cells.length + ' 個（⇔ 曲線の頂点 ' + cv.cells.length + '）　辺 ' + cv.edges.length + ' 本（うち半直線 ' + cv.edges.filter((e) => e.c2 < 0).length + '，⇔ 境界の辺）　' + (tri === cv.cells.length && cv.cells.length === 4 ? 'smooth：単位三角形 4 個 → 頂点 4 つの「六角形の半分」' : cv.cells.length === 1 ? '細分なし：曲線は 1 点から 6 本（重み付き）' : '一部のセルが大きい → 頂点が少ない（非 smooth）'), 20, 86);
  text('F(x, y) = min(' + terms.map((t) => nf(t.a, 1, 1) + (t.i ? ' + ' + (t.i > 1 ? t.i : '') + 'x' : '') + (t.j ? ' + ' + (t.j > 1 ? t.j : '') + 'y' : '')).join(', ') + ')', 20, height - 24);
}

function mousePressed() {
  dragging = -1;
  terms.forEach((t, k) => { if (dist(mouseX, mouseY, latX(t.i), latY(t.j)) < 20) { dragging = k; dragY = mouseY; dragA = t.a; } });
}
function mouseDragged() { if (dragging >= 0) terms[dragging].a = constrain(dragA + (dragY - mouseY) * 0.02, -6, 6); }
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'r' || key === 'R') for (let t of terms) t.a = Math.round(random(-3, 3) * 2) / 2;
  if (key === '0') for (let t of terms) t.a = 0;
  if (key === 's' || key === 'S') setExample();
}

// ---------- やってみよう ----------
// 1. 全部 0 にしてから a11（真ん中）だけ下げる／上げる。細分と曲線はどう変わる？
// 2. 曲線の辺は、対応する細分の辺と必ず垂直。色を見て確かめよう
// 3. 角の点 a20 をうんと上げると、x^2 の項は「どこでも最小にならない」。曲線の半直線は何本になる？
// 4. 06 のように次数 3 にすると（makeTerms(3)）、真ん中の点が「サイクル」をつくる


// ==================================================
// ここから下は「トロピカル曲線の道具」（コピーするときは一番下まで）
//   terms = [{ i, j, a }] … 単項 a ⊗ x^i ⊗ y^j（a = 係数 = 格子点 (i, j) の高さ）
//   F(x, y) = min (a + i x + j y)。tropCurve(terms) は曲線を「頂点と辺」で返す
//     cells[c] = { ids: [項番号…], x, y } … 細分のセル（高さの下側凸包の面）⇔ 曲線の頂点 (x, y)
//     edges[e] = { p, q, w, c1, c2, dx, dy } … 細分の辺 (項 p–q) ⇔ 曲線の辺。w = 格子長 = 重み
//       c2 >= 0 なら頂点 c1 → c2 の線分。c2 < 0 なら頂点 c1 から方向 (dx, dy) の半直線
// ==================================================
function tropCurve(terms) {
  let n = terms.length, cells = [], seen = {}, EPS = 1e-7;
  for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) for (let r = q + 1; r < n; r++) {
    let P = terms[p], Q = terms[q], R = terms[r];
    let det = (Q.i - P.i) * (R.j - P.j) - (Q.j - P.j) * (R.i - P.i);
    if (Math.abs(det) < 1e-9) continue;
    // 3 点を通る平面 z = al + be*i + ga*j。すべての点がその上側なら「下側凸包の面」
    let be = ((Q.a - P.a) * (R.j - P.j) - (Q.j - P.j) * (R.a - P.a)) / det;
    let ga = ((Q.i - P.i) * (R.a - P.a) - (R.i - P.i) * (Q.a - P.a)) / det;
    let al = P.a - be * P.i - ga * P.j;
    let ids = [], ok = true;
    for (let k = 0; k < n && ok; k++) {
      let dd = terms[k].a - (al + be * terms[k].i + ga * terms[k].j);
      if (dd < -EPS) ok = false; else if (dd < EPS) ids.push(k);
    }
    if (!ok) continue;
    let key = ids.join(',');
    if (seen[key]) continue;
    seen[key] = true;
    let hull = hull2d(ids, terms);
    if (hull.length >= 3) cells.push({ ids: hull, x: -be, y: -ga });   // 面の傾き → 曲線の頂点
  }
  let edges = [], emap = {}, ci0 = 0, cj0 = 0;
  for (let t of terms) { ci0 += t.i / n; cj0 += t.j / n; }
  cells.forEach((c, ci) => {
    for (let k = 0; k < c.ids.length; k++) {
      let p = c.ids[k], q = c.ids[(k + 1) % c.ids.length];
      let key = Math.min(p, q) + '-' + Math.max(p, q);
      if (emap[key] !== undefined) edges[emap[key]].c2 = ci;
      else { emap[key] = edges.length; edges.push({ p, q, c1: ci, c2: -1 }); }
    }
  });
  for (let e of edges) {
    let P = terms[e.p], Q = terms[e.q];
    let di = Q.i - P.i, dj = Q.j - P.j, g = gcdInt(Math.abs(di), Math.abs(dj));
    e.w = g;
    let ux = dj / g, uy = -di / g, A = cells[e.c1], s;   // 細分の辺に垂直な原始ベクトル
    if (e.c2 >= 0) { let B = cells[e.c2]; s = ux * (B.x - A.x) + uy * (B.y - A.y); }
    else s = ux * (ci0 - P.i) + uy * (cj0 - P.j);        // 半直線はニュートン多角形の内向き（min 流儀）
    if (s < 0) { ux = -ux; uy = -uy; }
    e.dx = ux; e.dy = uy;
  }
  return { cells, edges };
}
function gcdInt(a, b) { while (b) { [a, b] = [b, a % b]; } return a || 1; }
// 格子点の集合の凸包（反時計回り。一直線上の点は除く）
function hull2d(ids, terms) {
  let pts = ids.slice().sort((u, v) => terms[u].i - terms[v].i || terms[u].j - terms[v].j);
  if (pts.length < 3) return pts;
  let turn = (o, a, b) => (terms[a].i - terms[o].i) * (terms[b].j - terms[o].j) - (terms[a].j - terms[o].j) * (terms[b].i - terms[o].i);
  let lo = [], up = [];
  for (let p of pts) { while (lo.length >= 2 && turn(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let k = pts.length - 1; k >= 0; k--) { let p = pts[k]; while (up.length >= 2 && turn(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
// 項 k が最小になる領域（曲線の頂点を結んだ多角形）。無限に伸びる領域は far だけ先で切る
function regionPoly(cv, k, terms, far) {
  let cs = [];
  cv.cells.forEach((c, ci) => { if (c.ids.includes(k)) cs.push(ci); });
  if (cs.length === 0) return null;
  let T = terms[k];
  let ang = (ci) => { let c = cv.cells[ci], mi = 0, mj = 0; for (let id of c.ids) { mi += terms[id].i / c.ids.length; mj += terms[id].j / c.ids.length; } return Math.atan2(mj - T.j, mi - T.i); };
  cs.sort((u, v) => ang(u) - ang(v));
  let rays = cv.edges.filter((e) => e.c2 < 0 && (e.p === k || e.q === k)), poly = [];
  if (rays.length < 2) { for (let ci of cs) poly.push({ x: cv.cells[ci].x, y: cv.cells[ci].y }); return poly; }
  let best = -1, bi = 0;   // 境界の点：いちばん大きい角度のすき間のあとから始める
  for (let m = 0; m < cs.length; m++) { let g = ang(cs[(m + 1) % cs.length]) - ang(cs[m]); if (m === cs.length - 1) g += Math.PI * 2; if (g > best) { best = g; bi = (m + 1) % cs.length; } }
  cs = cs.slice(bi).concat(cs.slice(0, bi));
  let first = cs[0], last = cs[cs.length - 1];
  let rA = rays.find((e) => e.c1 === first) || rays[0];
  let rB = rays.find((e) => e !== rA && e.c1 === last) || rays.find((e) => e !== rA) || rA;
  let A = cv.cells[rA.c1], B = cv.cells[rB.c1];
  poly.push({ x: A.x + rA.dx * far, y: A.y + rA.dy * far });
  for (let ci of cs) poly.push({ x: cv.cells[ci].x, y: cv.cells[ci].y });
  poly.push({ x: B.x + rB.dx * far, y: B.y + rB.dy * far });
  return poly;
}
// 次数 d のすべての項 (i + j <= d) を高さ 0 でつくる
function makeTerms(d) { let ts = []; for (let i = 0; i <= d; i++) for (let j = 0; i + j <= d; j++) ts.push({ i, j, a: 0 }); return ts; }
