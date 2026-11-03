// ============================================
// 07 アメーバと Maslov 脱量子化
// 複素曲線 Σ t^{a_ij} z^i w^j = 0 の点 (z, w) を乱数で拾い、(log_t|z|, log_t|w|) に打つ = アメーバ
//   底 t（0 < t < 1）を小さくするとアメーバは細くなり、トロピカル曲線 min(a_ij + i x + j y) に近づく
//   （log_t をとる = 「掛け算 → 足し算」「足し算 → min」に化ける：Maslov の脱量子化）
// ↑↓ = 底 t / M = 直線 ⇄ 2 次曲線 / T = トロピカル曲線を重ねる / C = 描き直す
// ============================================

let t = 0.3;                  // ★ 底 t（0.001 〜 0.9）。小さいほど細い
let kind = 1;                 // 1 = 直線 1 + z + w，2 = 2 次曲線
let showTrop = true;
let perFrame = 1500;          // ★ 1 フレームに打つ点の数
let R = 7;                    // ★ 座標の範囲 ±R
let terms, amb, sc, ox, oy;
let count = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.5; oy = height * 0.5; sc = Math.min(width, height) / (2 * R + 2);
  amb = createGraphics(width, height);
  amb.colorMode(HSB, 360, 100, 100, 100);
  setKind();
}
// ★ 係数 a_ij：複素曲線の係数は t^{a_ij}
function setKind() {
  if (kind === 1) terms = [{ i: 0, j: 0, a: 0 }, { i: 1, j: 0, a: 0 }, { i: 0, j: 1, a: 0 }];
  else terms = [{ i: 0, j: 0, a: 1 }, { i: 1, j: 0, a: 0 }, { i: 2, j: 0, a: 1 }, { i: 0, j: 1, a: 0 }, { i: 1, j: 1, a: 0 }, { i: 0, j: 2, a: 1 }];
  amb.clear(); count = 0;
}
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }

// 複素数の道具（[re, im]）
function cmul(p, q) { return [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]]; }
function cadd(p, q) { return [p[0] + q[0], p[1] + q[1]]; }
function cdiv(p, q) { let d = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d]; }
function csqrt(p) { let r = Math.hypot(p[0], p[1]), re = Math.sqrt((r + p[0]) / 2), im = Math.sqrt(Math.max(0, (r - p[0]) / 2)); return [re, p[1] < 0 ? -im : im]; }
function cabs(p) { return Math.hypot(p[0], p[1]); }

// ★ z を決めて w を解く：w について 2 次以下の多項式 c2 w² + c1 w + c0 = 0（係数は z の多項式）
function solveW(z) {
  let c = [[0, 0], [0, 0], [0, 0]], zp = [[1, 0], z, cmul(z, z)];
  for (let T of terms) c[T.j] = cadd(c[T.j], cmul([Math.pow(t, T.a), 0], zp[T.i]));
  if (cabs(c[2]) < 1e-300) { if (cabs(c[1]) < 1e-300) return []; return [cdiv([-c[0][0], -c[0][1]], c[1])]; }
  let disc = cadd(cmul(c[1], c[1]), cmul([-4, 0], cmul(c[2], c[0])));
  let s = csqrt(disc), two = cmul([2, 0], c[2]);
  return [cdiv(cadd([-c[1][0], -c[1][1]], s), two), cdiv(cadd([-c[1][0], -c[1][1]], [-s[0], -s[1]]), two)];
}

function draw() {
  background(190, 55, 10);
  let lt = Math.log(t);
  // 点を打つ（蓄積）
  amb.noStroke();
  for (let n = 0; n < perFrame; n++) {
    let x = Math.random() * 2 * R - R, th = Math.random() * Math.PI * 2;
    let r = Math.exp(x * lt);                                   // |z| = t^x
    let z = [r * Math.cos(th), r * Math.sin(th)];
    for (let w of solveW(z)) {
      let aw = cabs(w);
      if (!(aw > 0) || !isFinite(aw)) continue;
      let y = Math.log(aw) / lt;                                // log_t|w|
      if (Math.abs(y) > R + 1) continue;
      amb.fill(35, 60, 100, 18);
      amb.circle(toX(x), toY(y), 3);
      count++;
    }
  }
  image(amb, 0, 0);

  // 軸
  stroke(0, 0, 100, 30); strokeWeight(1);
  line(toX(0), 0, toX(0), height); line(0, toY(0), width, toY(0));
  // トロピカル曲線（極限）
  if (showTrop) {
    let cv = tropCurve(terms);
    for (let e of cv.edges) {
      let A = cv.cells[e.c1], B = e.c2 >= 0 ? cv.cells[e.c2] : { x: A.x + e.dx * 100, y: A.y + e.dy * 100 };
      stroke(90, 90, 100, 85); strokeWeight(2.5);
      line(toX(A.x), toY(A.y), toX(B.x), toY(B.y));
    }
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('↑↓：底 t = ' + nf(t, 1, 3) + '　M：' + (kind === 1 ? '直線 1 + z + w' : '2 次曲線 t + z + t z² + w + z w + t w²') + '　T：トロピカル曲線 ' + (showTrop ? 'ON' : 'off') + '　C：描き直す　点 ' + count, 20, 36);
  fill(0, 0, 65); textSize(15);
  text('横 = log_t|z|，縦 = log_t|w|。|t^a z^i w^j| = t^{a + i x + j y} なので、t → 0 では指数が最小の 2 項だけが残って打ち消し合う = min が 2 回とられる場所', 20, 62);
  text('t = 0.9 → 太いアメーバ（幅 ∝ 1/|log t|）　t = 0.01 → ほぼ折れ線。「脱量子化」：掛け算 → 足し算，足し算 → min', 20, 86);
  text('緑 = トロピカル曲線 min(' + terms.map((T) => T.a + (T.i ? ' + ' + (T.i > 1 ? T.i : '') + 'x' : '') + (T.j ? ' + ' + (T.j > 1 ? T.j : '') + 'y' : '')).join(', ') + ')。アメーバの「背骨」', 20, height - 24);
}

function keyPressed() {
  if (key === UP_ARROW) { t = Math.min(0.9, t * 1.5); amb.clear(); count = 0; }
  if (key === DOWN_ARROW) { t = Math.max(0.001, t / 1.5); amb.clear(); count = 0; }
  if (key === 'm' || key === 'M') { kind = kind === 1 ? 2 : 1; setKind(); }
  if (key === 't' || key === 'T') showTrop = !showTrop;
  if (key === 'c' || key === 'C') { amb.clear(); count = 0; }
}

// ---------- やってみよう ----------
// 1. t = 0.9 のアメーバの「触手」は 3 本（直線）。方向はトロピカル直線の半直線と同じ？
// 2. 2 次曲線のアメーバには穴（有界な補集合）がある？ ない？ 係数 a_ij を変えて（setKind の数字）試そう
// 3. 係数 a_00 を 3 にすると、トロピカル曲線の頂点はどこへ動く？ アメーバもついてくる？
// 4. t > 1 にすると（log t > 0）min が max に変わる。keyPressed の Math.min(0.9, …) の上限を外して確かめよう


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
