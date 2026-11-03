// ============================================
// 14 トロピカル曲線ブラシ
// マウスの軌跡の点を「係数（高さ）」にして、次数 d のトロピカル曲線をリアルタイムに計算し直す
//   各領域（どの項が最小か）を色分けし、曲線を鉛の線にした「ステンドグラス」。軌跡が変わると曲線が動く
//   自由制作のベース：高さの決め方（heightOf）・色（hueOf）・次数・線の太さを変えよう
// ドラッグ = 描く / ↑↓ = 次数 d / 1〜3 = 配色 / S = 画像を保存 / C = クリア
// ============================================

let d = 4;                       // ★ 次数（2〜6）
let trail = [];                  // マウスの軌跡（最近の点）
let palette = 1;
let sc = 60, ox, oy, buf, scale4 = 5, terms = [], cv;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.5; oy = height * 0.5;
  buf = createGraphics(ceil(width / scale4), ceil(height / scale4));
  buf.pixelDensity(1);
  terms = makeTerms(d);
  for (let k = 0; k < terms.length; k++) trail.push({ x: width * (0.3 + 0.4 * Math.random()), y: height * (0.3 + 0.4 * Math.random()) });
}
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }
function fromX(s) { return (s - ox) / sc; }
function fromY(s) { return (oy - s) / sc; }

// ★ 軌跡の点 k（画面座標）→ 項 (i, j) の高さ。縦位置で全体の高さ、横位置で x–y の偏り
function heightOf(p, t) { return (p.y / height) * 4 + (p.x / width - 0.5) * 2 * (t.i - t.j) + 0.15 * (t.i * t.i + t.j * t.j); }
// ★ 項 k の色（配色 1〜3）
function hueOf(k, t) {
  if (palette === 1) return (k * 47 + 20) % 360;
  if (palette === 2) return 20 + (t.i + t.j) * 25;
  return (t.i * 90 + t.j * 150) % 360;
}
function hsb2rgb(h, s, v) {   // 0..360, 0..1, 0..1 → [r, g, b]
  let c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function draw() {
  background(190, 55, 10);
  // 軌跡 → 高さ
  for (let k = 0; k < terms.length; k++) terms[k].a = heightOf(trail[trail.length - 1 - k] || trail[0], terms[k]);
  cv = tropCurve(terms);

  // 領域を塗る：粗い画像で各ピクセルの最小の項を探す。1 位と 2 位の差が小さいところは暗く（鉛の線のにじみ）
  let cols = terms.map((t, k) => hsb2rgb(hueOf(k, t), 0.6, 0.95));
  buf.loadPixels();
  let bw = buf.width, bh = buf.height, px = buf.pixels;
  for (let py = 0; py < bh; py++) {
    let y = fromY(py * scale4);
    for (let qx = 0; qx < bw; qx++) {
      let x = fromX(qx * scale4), m1 = Infinity, m2 = Infinity, best = 0;
      for (let k = 0; k < terms.length; k++) {
        let v = terms[k].a + terms[k].i * x + terms[k].j * y;
        if (v < m1) { m2 = m1; m1 = v; best = k; } else if (v < m2) m2 = v;
      }
      let sh = 0.45 + 0.55 * Math.min(1, (m2 - m1) / 0.8), c = cols[best], idx = (qx + py * bw) * 4;
      px[idx] = c[0] * sh; px[idx + 1] = c[1] * sh; px[idx + 2] = c[2] * sh; px[idx + 3] = 255;
    }
  }
  buf.updatePixels();
  image(buf, 0, 0, width, height);

  // 鉛の線（曲線の辺）
  for (let e of cv.edges) {
    let A = cv.cells[e.c1], B = e.c2 >= 0 ? cv.cells[e.c2] : { x: A.x + e.dx * 100, y: A.y + e.dy * 100 };
    stroke(0, 0, 8); strokeWeight(4 + e.w * 3);
    line(toX(A.x), toY(A.y), toX(B.x), toY(B.y));
  }
  for (let c of cv.cells) { noStroke(); fill(0, 0, 8); circle(toX(c.x), toY(c.y), 10); }
  // 軌跡
  noFill(); stroke(0, 0, 100, 50); strokeWeight(1.5);
  beginShape(); for (let p of trail) vertex(p.x, p.y); endShape();

  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグ：描く　↑↓：次数 d = ' + d + '（項 ' + terms.length + ' 個）　1〜3：配色　S：保存　C：クリア', 20, 36);
  fill(0, 0, 85); textSize(15);
  text('軌跡の最近 ' + terms.length + ' 点がそのまま係数に。各領域 = ひとつの項 a + i x + j y が最小の場所。鉛の線 = トロピカル曲線（頂点 ' + cv.cells.length + '）', 20, 62);
}

function mouseDragged() {
  let last = trail[trail.length - 1];
  if (!last || dist(mouseX, mouseY, last.x, last.y) > 12) { trail.push({ x: mouseX, y: mouseY }); if (trail.length > 60) trail.shift(); }
}
function keyPressed() {
  if (key === UP_ARROW) { d = Math.min(6, d + 1); terms = makeTerms(d); }
  if (key === DOWN_ARROW) { d = Math.max(2, d - 1); terms = makeTerms(d); }
  if (key === '1') palette = 1;
  if (key === '2') palette = 2;
  if (key === '3') palette = 3;
  if (key === 's' || key === 'S') saveCanvas('tropical_brush', 'png');
  if (key === 'c' || key === 'C') { trail = []; for (let k = 0; k < terms.length; k++) trail.push({ x: width * (0.3 + 0.4 * Math.random()), y: height * (0.3 + 0.4 * Math.random()) }); }
}

// ---------- やってみよう ----------
// 1. heightOf を変える：p.y だけにすると？ 距離 dist(p, 画面中央) にすると？ 曲線の動きがどう変わる？
// 2. 鉛の線の太さを重み w に比例させている。太さを一定にする／頂点に丸をつけない、で印象を比べよう
// 3. 0.8（明暗の差のしきい値）を 3 にすると領域の中がグラデーションになる。「谷」が見える
// 4. 軌跡を保存して（trail を JSON に）、同じ絵を再現できるようにしよう。S で保存した画像と比べる


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
