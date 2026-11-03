// ============================================
// 08 トロピカル・ベズーの定理
// 一般の位置にある次数 d と次数 e のトロピカル曲線の交点数（重み付き）= d × e
//   交点の重み = w1 · w2 · |det(u1, u2)|（w = 辺の重み，u = 原始方向ベクトル）。ちょうど d·e になる
// ←→ = 次数 d / ↑↓ = 次数 e / R = 係数をランダムに / スペース = 曲線 2 を動かす
// ============================================

let d = 2, e = 3;            // ★ 2 つの曲線の次数（1〜4）
let T1 = [], T2 = [];        // 項
let moving = false;
let sc = 40, ox, oy, shift = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.42; oy = height * 0.52;
  randomize();
}
function randomize() {
  T1 = makeTerms(d); T2 = makeTerms(e);
  for (let t of T1) t.a = random(-3, 3) + 0.3 * (t.i * t.i + t.j * t.j);   // お椀形 + ランダム → smooth になりやすい
  for (let t of T2) t.a = random(-3, 3) + 0.3 * (t.i * t.i + t.j * t.j);
}
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }

// 曲線の辺を「線分」のリストにする（半直線は長さ 100 で切る）。方向ベクトルと重みつき
function segments(cv) {
  let out = [];
  for (let ed of cv.edges) {
    let A = cv.cells[ed.c1], B = ed.c2 >= 0 ? cv.cells[ed.c2] : { x: A.x + ed.dx * 100, y: A.y + ed.dy * 100 };
    out.push({ x1: A.x, y1: A.y, x2: B.x, y2: B.y, ux: ed.dx, uy: ed.dy, w: ed.w });
  }
  return out;
}
// ★ 線分どうしの交点（あれば）と重み
function intersect(s, u) {
  let rx = s.x2 - s.x1, ry = s.y2 - s.y1, qx = u.x2 - u.x1, qy = u.y2 - u.y1;
  let den = rx * qy - ry * qx;
  if (Math.abs(den) < 1e-9) return null;                          // 平行
  let dx = u.x1 - s.x1, dy = u.y1 - s.y1;
  let ta = (dx * qy - dy * qx) / den, tb = (dx * ry - dy * rx) / den;
  if (ta < -1e-9 || ta > 1 + 1e-9 || tb < -1e-9 || tb > 1 + 1e-9) return null;
  let m = s.w * u.w * Math.abs(s.ux * u.uy - s.uy * u.ux);         // 重み w1 w2 |det(u1, u2)|
  return { x: s.x1 + ta * rx, y: s.y1 + ta * ry, m };
}

function draw() {
  background(190, 55, 10);
  if (moving) shift += 0.01;
  let T2s = T2.map((t) => ({ i: t.i, j: t.j, a: t.a + 2 * Math.sin(shift) * (t.i - t.j) }));
  let c1 = tropCurve(T1), c2 = tropCurve(T2s);
  let S1 = segments(c1), S2 = segments(c2), pts = [];
  for (let s of S1) for (let u of S2) {
    let p = intersect(s, u);
    if (!p || p.m === 0) continue;
    if (pts.some((q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6)) continue;   // 同じ点は 1 回だけ
    pts.push(p);
  }
  let total = pts.reduce((acc, p) => acc + p.m, 0);

  stroke(0, 0, 100, 15); strokeWeight(1);
  for (let g = -14; g <= 14; g++) { line(toX(g), 0, toX(g), height); line(0, toY(g), width, toY(g)); }
  for (let s of S1) { stroke(35, 80, 100); strokeWeight(1.5 + s.w * 1.5); line(toX(s.x1), toY(s.y1), toX(s.x2), toY(s.y2)); }
  for (let s of S2) { stroke(330, 70, 100); strokeWeight(1.5 + s.w * 1.5); line(toX(s.x1), toY(s.y1), toX(s.x2), toY(s.y2)); }
  for (let p of pts) {
    noStroke(); fill(90, 90, 100); circle(toX(p.x), toY(p.y), 10 + p.m * 6);
    if (p.m > 1) { fill(0, 0, 10); textSize(13); textAlign(CENTER, CENTER); text(p.m, toX(p.x), toY(p.y)); textAlign(LEFT, BASELINE); }
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('←→：d = ' + d + '（マンゴー）　↑↓：e = ' + e + '（ピンク）　R：ランダム　スペース：曲線 2 を動かす ' + (moving ? 'ON' : 'off'), 20, 36);
  fill(90, 90, 100); textSize(28);
  text('交点の重みの合計 = ' + total + '　＝　d × e = ' + d + ' × ' + e + ' = ' + d * e + (total === d * e ? '　✓' : '　（一般の位置でない：頂点を通っている）'), 20, 82);
  fill(0, 0, 65); textSize(15);
  text('交点 ' + pts.length + ' 個（緑。大きい丸・数字 = 重み 2 以上）。重み = w1 · w2 · |det(u1, u2)|。例：方向 (1,0) と (1,1) なら |det| = 1，(1,0) と (1,2) なら 2', 20, 110);
  text('ふつうのベズー（d 次と e 次の複素曲線は d·e 点で交わる）がそのまま成り立つ。証明は「曲線を平行移動して無限遠の半直線だけで数える」', 20, height - 24);
}

function keyPressed() {
  if (key === LEFT_ARROW) { d = Math.max(1, d - 1); randomize(); }
  if (key === RIGHT_ARROW) { d = Math.min(4, d + 1); randomize(); }
  if (key === DOWN_ARROW) { e = Math.max(1, e - 1); randomize(); }
  if (key === UP_ARROW) { e = Math.min(4, e + 1); randomize(); }
  if (key === 'r' || key === 'R') randomize();
  if (key === ' ') moving = !moving;
}

// ---------- やってみよう ----------
// 1. d = e = 1：2 本の直線は 1 点で交わる（03）。d = 1, e = 2 なら 2 点。実際に数えよう
// 2. スペースで動かしているとき、交点が一瞬 d·e からずれる瞬間がある？（頂点を通るとき = 一般の位置でない）
// 3. 重み 2 の交点が出る配置を探そう（重み 2 の辺が交わる、または方向 (1,0) と (1,2) のように斜めに交わる）
// 4. 同じ次数の曲線を 2 本重ねると（T2 = T1 をコピー）交点は無限個。03 のように「安定交点」を考えるとやはり d² 個


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
