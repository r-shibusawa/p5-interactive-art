// ============================================
// 05 ニュートン多角形の正則細分と双対グラフ
// 次数 d の曲線：格子点 (i, j), i + j ≤ d の高さ a_ij が係数。高さをノイズでゆらす／ドラッグで変形
//   細分の各辺の「格子長」（辺の上にある格子点の間隔の数）= 曲線の対応する辺の 重み
//   重みは辺の太さと数字で表示。重み 2 以上の辺は、細分で格子点を「とばす」辺から生まれる
// ↑↓ = 次数 d（2〜4）/ 格子点をドラッグ = 高さ / スペース = ノイズを流す / R = ランダム / 0 = 全部 0 / W = 重み 2 の例
// ============================================

let d = 3;                 // ★ 次数（2〜4）
let terms = [];            // 項 {i, j, a, base}（a = base + offset）
let offset = {};           // ドラッグで足した分
let flowing = false;       // スペースでノイズを流す
let amp = 1.5;             // ★ ノイズの大きさ
let tt = 0;
let sc = 55, ox, oy, nx, ny, ns, cv;
let dragging = -1, dragY = 0, dragA = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.3; oy = height * 0.52;
  rebuild();
}
function rebuild() {
  terms = makeTerms(d); offset = {};
  nx = width * 0.62; ny = height * 0.84; ns = Math.min(100, (height - 220) / d);
  for (let t of terms) t.a = noise(t.i * 0.9 + 10, t.j * 0.9 + 20, tt) * amp * 2 - amp;
}
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }
function latX(i) { return nx + i * ns; }
function latY(j) { return ny - j * ns; }
function hueOf(ei) { return (ei * 37 + 20) % 360; }

function draw() {
  background(190, 55, 10);
  if (flowing) { tt += 0.004; for (let t of terms) t.a = noise(t.i * 0.9 + 10, t.j * 0.9 + 20, tt) * amp * 2 - amp + (offset[t.i + ',' + t.j] || 0); }
  cv = tropCurve(terms);

  // 左：曲線
  stroke(0, 0, 100, 18); strokeWeight(1);
  for (let g = -10; g <= 10; g++) { line(toX(g), 0, toX(g), height); line(0, toY(g), width * 0.55, toY(g)); }
  cv.edges.forEach((e, ei) => {
    let A = cv.cells[e.c1], B = e.c2 >= 0 ? cv.cells[e.c2] : { x: A.x + e.dx * 100, y: A.y + e.dy * 100 };
    stroke(e.w > 1 ? 55 : hueOf(ei), e.w > 1 ? 95 : 65, 100); strokeWeight(2 + e.w * 2.5);
    line(toX(A.x), toY(A.y), toX(B.x), toY(B.y));
    if (e.w > 1) {
      let M = e.c2 >= 0 ? { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 } : { x: A.x + e.dx * 1.2, y: A.y + e.dy * 1.2 };
      noStroke(); fill(55, 95, 100); textSize(16); text('重み ' + e.w, toX(M.x) + 8, toY(M.y) - 8);
    }
  });
  for (let c of cv.cells) { noStroke(); fill(0, 0, 100); circle(toX(c.x), toY(c.y), 12); }

  // 右：ニュートン多角形と細分
  noStroke(); fill(0, 0, 100, 6); rect(nx - 50, ny - d * ns - 50, d * ns + 140, d * ns + 100, 16);
  for (let c of cv.cells) {
    fill(190, 40, 40, 40); noStroke();
    beginShape(); for (let id of c.ids) vertex(latX(terms[id].i), latY(terms[id].j)); endShape(CLOSE);
  }
  cv.edges.forEach((e, ei) => {
    stroke(e.w > 1 ? 55 : hueOf(ei), e.w > 1 ? 95 : 65, 100); strokeWeight(2 + e.w * 2.5);
    line(latX(terms[e.p].i), latY(terms[e.p].j), latX(terms[e.q].i), latY(terms[e.q].j));
    if (e.w > 1) { noStroke(); fill(55, 95, 100); textSize(16); text('格子長 ' + e.w, (latX(terms[e.p].i) + latX(terms[e.q].i)) / 2 + 8, (latY(terms[e.p].j) + latY(terms[e.q].j)) / 2 - 8); }
  });
  // 双対グラフ：セルの重心どうしを結ぶ（曲線の骨格）
  cv.edges.forEach((e) => {
    if (e.c2 < 0) return;
    let A = cv.cells[e.c1], B = cv.cells[e.c2], ca = centroid(A), cb = centroid(B);
    stroke(0, 0, 100, 60); strokeWeight(1.5); line(latX(ca.i), latY(ca.j), latX(cb.i), latY(cb.j));
  });
  for (let c of cv.cells) { let m = centroid(c); noStroke(); fill(0, 0, 100); circle(latX(m.i), latY(m.j), 9); }
  terms.forEach((t, k) => {
    stroke(0, 0, 10); strokeWeight(2); fill(dragging === k ? 55 : 190, dragging === k ? 90 : 20, 100);
    circle(latX(t.i), latY(t.j), 20);
    noStroke(); fill(0, 0, 85); textSize(12); text(nf(t.a, 1, 1), latX(t.i) + 12, latY(t.j) - 10);
  });

  noStroke(); fill(0, 0, 100); textSize(18);
  text('↑↓：次数 d = ' + d + '　格子点をドラッグ：高さ　スペース：ノイズ ' + (flowing ? '流れている' : '止まっている') + '　R：ランダム　0：全部 0　W：重み 2 の例', 20, 36);
  fill(0, 0, 65); textSize(15);
  let heavy = cv.edges.filter((e) => e.w > 1).length;
  let unit = cv.cells.every((c) => c.ids.length === 3 && Math.abs(triArea2(c)) === 1);
  text('項 ' + terms.length + ' 個　セル ' + cv.cells.length + '（曲線の頂点）　辺 ' + cv.edges.length + '　重み 2 以上の辺 ' + heavy + '　' + (unit ? 'すべて単位三角形 = smooth（頂点はすべて 3 価）' : '大きいセルあり = 非 smooth') + '。白い線 = 細分の双対グラフ（曲線の骨格）', 20, 62);
  text('細分の辺 ⊥ 曲線の辺。辺の格子長 = 曲線の辺の重み。smooth なら頂点の数 = d²，有界な辺の数 = 3d(d−1)/2，半直線 = 3d', 20, height - 24);
}
function centroid(c) { let mi = 0, mj = 0; for (let id of c.ids) { mi += terms[id].i / c.ids.length; mj += terms[id].j / c.ids.length; } return { i: mi, j: mj }; }
function triArea2(c) { let [p, q, r] = c.ids.map((id) => terms[id]); return (q.i - p.i) * (r.j - p.j) - (q.j - p.j) * (r.i - p.i); }

function mousePressed() {
  dragging = -1;
  terms.forEach((t, k) => { if (dist(mouseX, mouseY, latX(t.i), latY(t.j)) < 18) { dragging = k; dragY = mouseY; dragA = t.a; } });
}
function mouseDragged() {
  if (dragging < 0) return;
  let t = terms[dragging], na = constrain(dragA + (dragY - mouseY) * 0.02, -6, 6);
  offset[t.i + ',' + t.j] = (offset[t.i + ',' + t.j] || 0) + (na - t.a);
  t.a = na;
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === UP_ARROW) { d = Math.min(4, d + 1); rebuild(); }
  if (key === DOWN_ARROW) { d = Math.max(2, d - 1); rebuild(); }
  if (key === ' ') flowing = !flowing;
  if (key === 'r' || key === 'R') { tt += 7; rebuild(); }
  if (key === '0') { offset = {}; for (let t of terms) t.a = 0; }
  if (key === 'w' || key === 'W') { flowing = false; offset = {}; for (let t of terms) t.a = 0.3 * (t.i * t.i + t.j * t.j) + (t.i === 1 && t.j === 0 ? 1 : 0); }   // お椀形 + (1,0) だけ持ち上げる → 辺 (0,0)–(2,0) が格子長 2
}

// ---------- やってみよう ----------
// 1. 辺の太さ（重み）が変わる瞬間を探そう。細分で「格子点をとばす」辺が出たときだ
// 2. 全部 0（0 キー）の細分は「分けない」= 曲線は 1 点に 3 本の太い半直線。重みはいくつ？
// 3. d = 4 で smooth なとき、頂点は 16 個、半直線は 12 本。数えてみよう
// 4. ノイズの amp を大きくすると、どんな細分が出やすい？ 小さくすると？


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
