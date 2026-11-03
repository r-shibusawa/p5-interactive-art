// ============================================
// 12 バランス条件
// トロピカル曲線のどの頂点でも、出ていく辺の（重み × 原始方向ベクトル）の和は 0 になる
//   例：直線の頂点では (1,0) + (0,1) + (−1,−1) = 0。重み 2 の辺は 2 倍で数える
//   逆に「バランスした折れ線グラフ」は必ずどれかのトロピカル多項式の曲線になる（Mikhalkin の定理）
// 頂点をクリック = ベクトルを展開 / ↑↓ = 次数 / R = ランダム / W = 重み 2 の辺がある例 / 0 = 全部 0
// ============================================

let d = 3;
let terms = [];
let picked = -1;
let sc = 50, ox, oy, cv;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.38; oy = height * 0.52;
  randomize();
}
function randomize() { terms = makeTerms(d); for (let t of terms) t.a = random(-2, 2) + 0.3 * (t.i * t.i + t.j * t.j); picked = -1; }
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }

// ★ 頂点 ci から出ていく辺：{ w, ux, uy }（原始方向ベクトルは外向き）
function outgoing(ci) {
  let out = [];
  for (let e of cv.edges) {
    if (e.c1 === ci) out.push({ w: e.w, ux: e.dx, uy: e.dy, e });
    else if (e.c2 === ci) out.push({ w: e.w, ux: -e.dx, uy: -e.dy, e });
  }
  return out;
}

function draw() {
  background(190, 55, 10);
  cv = tropCurve(terms);
  if (picked >= cv.cells.length) picked = -1;

  stroke(0, 0, 100, 15); strokeWeight(1);
  for (let g = -12; g <= 12; g++) { line(toX(g), 0, toX(g), height); line(0, toY(g), width * 0.7, toY(g)); }
  for (let e of cv.edges) {
    let A = cv.cells[e.c1], B = e.c2 >= 0 ? cv.cells[e.c2] : { x: A.x + e.dx * 100, y: A.y + e.dy * 100 };
    stroke(35, 70, 100, 80); strokeWeight(2 + e.w * 2);
    line(toX(A.x), toY(A.y), toX(B.x), toY(B.y));
    if (e.w > 1) { let M = e.c2 >= 0 ? { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 } : { x: A.x + e.dx, y: A.y + e.dy }; noStroke(); fill(55, 90, 100); textSize(13); text('w=' + e.w, toX(M.x) + 6, toY(M.y) - 6); }
  }
  // 全頂点でのバランスを確認（小さく表示）
  let allOk = true;
  cv.cells.forEach((c, ci) => {
    let sx = 0, sy = 0;
    for (let o of outgoing(ci)) { sx += o.w * o.ux; sy += o.w * o.uy; }
    let ok = sx === 0 && sy === 0; if (!ok) allOk = false;
    stroke(0, 0, 10); strokeWeight(2); fill(ci === picked ? 330 : (ok ? 90 : 0), 80, 100);
    circle(toX(c.x), toY(c.y), ci === picked ? 22 : 14);
  });
  // 選んだ頂点：ベクトルを矢印で（そこから出る向きに）、さらに頭と尻をつないで閉じた多角形に
  if (picked >= 0) {
    let c = cv.cells[picked], vs = outgoing(picked);
    vs.sort((p, q) => Math.atan2(p.uy, p.ux) - Math.atan2(q.uy, q.ux));
    let L = 1.3;
    for (let v of vs) arrow(toX(c.x), toY(c.y), toX(c.x + v.ux * v.w * L), toY(c.y + v.uy * v.w * L), 330);
    // 右側に「つないで一周」の図
    let px = width * 0.78, py = height * 0.5, k = 36, cx = 0, cy = 0;
    noStroke(); fill(0, 0, 100, 6); rect(px - 160, py - 170, 320, 340, 16);
    fill(0, 0, 100); textSize(16); text('頭と尻をつなぐ → ちょうど一周して戻る', px - 150, py - 180);
    for (let v of vs) {
      arrow(px + cx * k, py - cy * k, px + (cx + v.w * v.ux) * k, py - (cy + v.w * v.uy) * k, 330);
      cx += v.w * v.ux; cy += v.w * v.uy;
    }
    noStroke(); fill(90, 80, 100); circle(px, py, 10);
    // 式
    let ty = 120;
    fill(0, 0, 100); textSize(16);
    text('頂点 (' + nf(c.x, 1, 2) + ', ' + nf(c.y, 1, 2) + ')　辺 ' + vs.length + ' 本', width * 0.62, ty);
    fill(330, 60, 100); textSize(15);
    vs.forEach((v, idx) => text(v.w + ' × (' + v.ux + ', ' + v.uy + ')', width * 0.62, ty + 26 + idx * 22));
    let sx = vs.reduce((s, v) => s + v.w * v.ux, 0), sy = vs.reduce((s, v) => s + v.w * v.uy, 0);
    fill(90, 80, 100); textSize(16);
    text('和 = (' + sx + ', ' + sy + ')' + (sx === 0 && sy === 0 ? '　✓ バランス' : '　×'), width * 0.62, ty + 36 + vs.length * 22);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('頂点をクリック：ベクトルを展開　↑↓：次数 d = ' + d + '　R：ランダム　W：重み 2 の例　0：全部 0', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('頂点 ' + cv.cells.length + ' 個　全頂点でバランス ' + (allOk ? '✓' : '×') + '。緑 = バランスしている頂点。辺の太さ = 重み w，方向ベクトルは整数で最も短いもの（原始ベクトル）', 20, 62);
  text('なぜ 0 になる？ 頂点に対応する細分のセル（多角形）を一周すると元に戻るから：曲線の辺 ⊥ セルの辺、重み = セルの辺の格子長', 20, height - 24);
}
function arrow(x1, y1, x2, y2, hue) {
  stroke(hue, 80, 100); strokeWeight(3); line(x1, y1, x2, y2);
  let ang = atan2(y2 - y1, x2 - x1);
  noStroke(); fill(hue, 80, 100);
  push(); translate(x2, y2); rotate(ang); triangle(0, 0, -12, 6, -12, -6); pop();
}

function mousePressed() {
  picked = -1;
  cv.cells.forEach((c, ci) => { if (dist(mouseX, mouseY, toX(c.x), toY(c.y)) < 16) picked = ci; });
}
function keyPressed() {
  if (key === UP_ARROW) { d = Math.min(4, d + 1); randomize(); }
  if (key === DOWN_ARROW) { d = Math.max(1, d - 1); randomize(); }
  if (key === 'r' || key === 'R') randomize();
  if (key === '0') { for (let t of terms) t.a = 0; picked = -1; }
  if (key === 'w' || key === 'W') { for (let t of terms) t.a = 0.3 * (t.i * t.i + t.j * t.j) + (t.i === 1 && t.j === 0 ? 1.5 : 0); picked = -1; }
}

// ---------- やってみよう ----------
// 1. 0 キー：全部 0 なら頂点は 1 つで、d 倍の重みの半直線が 3 本。d × ((1,0) + (0,1) + (−1,−1)) = 0 を確かめよう
// 2. 重み 2 の辺を持つ頂点（W）では、他の辺の向きがどう変わる？ 展開図で見よう
// 3. 4 本以上の辺が出る頂点（細分のセルが四角形）を作ろう：ランダムを繰り返すか 04 の要領で高さを調整
// 4. 自分で「バランスした折れ線」を紙に描いてみよう。半直線の方向の和が 0 なら、必ずどれかの曲線になる


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
