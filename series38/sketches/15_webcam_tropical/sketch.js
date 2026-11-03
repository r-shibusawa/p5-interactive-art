// ============================================
// 15 カメラ映像からトロピカル曲線（おまけ）
// カメラ画像を縮小し、ニュートン多角形の格子点 (i, j) に対応する場所の明るさを係数 a_ij にする
//   暗いところ = 低い = その項が勝ちやすい。明るさが変わると曲線が動く（カメラの許可が必要。なければノイズ画像）
// ↑↓ = 次数 d / I = 明暗を反転 / V = 映像の表示切替 / R = 領域の色分け
// ============================================

let cap, ready = false;
let vw = 64, vh = 48;              // ★ カメラ画像の大きさ（小さいほど速い）
let d = 5;                         // ★ 次数（2〜7）
let invert = false, showVideo = true, showRegions = true;
let amp = 5;                       // ★ 明るさ → 高さの幅
let terms = [], target = [], cv;
let sc, ox, oy, buf, scale4 = 6;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.5; oy = height * 0.5; sc = Math.min(width, height) / 14;
  buf = createGraphics(ceil(width / scale4), ceil(height / scale4));
  buf.pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  terms = makeTerms(d);
}

// ★ 格子点 (i, j) → カメラ画像のどこを見るか（三角形を画像全体に広げる）
function samplePos(t) { return { x: Math.floor((t.i + t.j * 0.5) / d * (vw - 1)), y: Math.floor((1 - t.j / d) * (vh - 1)) }; }

function draw() {
  background(190, 55, 10);
  // 明るさ → 高さ（カメラがなければノイズ）
  cap.loadPixels();
  ready = cap.width > 0 && cap.pixels.length >= vw * vh * 4;
  for (let k = 0; k < terms.length; k++) {
    let t = terms[k], p = samplePos(t), b;
    if (ready) { let idx = (p.x + p.y * vw) * 4; b = (cap.pixels[idx] + cap.pixels[idx + 1] + cap.pixels[idx + 2]) / 765; }
    else b = noise(t.i * 0.5, t.j * 0.5, frameCount * 0.01);
    if (invert) b = 1 - b;
    let goal = b * amp + 0.1 * (t.i * t.i + t.j * t.j);
    t.a += (goal - t.a) * 0.2;                                     // なめらかに追いかける
  }
  cv = tropCurve(terms);

  // 背景：映像（薄く）
  if (showVideo && ready) { tint(0, 0, 100, 35); image(cap, 0, 0, width, height); noTint(); }
  // 領域の色分け（粗い画像）
  if (showRegions) {
    buf.loadPixels();
    let bw = buf.width, bh = buf.height, px = buf.pixels;
    for (let py = 0; py < bh; py++) {
      let y = (oy - py * scale4) / sc;
      for (let qx = 0; qx < bw; qx++) {
        let x = (qx * scale4 - ox) / sc, m1 = Infinity, m2 = Infinity, best = 0;
        for (let k = 0; k < terms.length; k++) { let v = terms[k].a + terms[k].i * x + terms[k].j * y; if (v < m1) { m2 = m1; m1 = v; best = k; } else if (v < m2) m2 = v; }
        let t = terms[best], sh = 0.5 + 0.5 * Math.min(1, (m2 - m1) / 0.6), idx = (qx + py * bw) * 4;
        px[idx] = (120 + t.i * 30) * sh; px[idx + 1] = (60 + t.j * 35) * sh; px[idx + 2] = (200 - (t.i + t.j) * 20) * sh; px[idx + 3] = 150;
      }
    }
    buf.updatePixels();
    image(buf, 0, 0, width, height);
  }
  // 曲線
  for (let e of cv.edges) {
    let A = cv.cells[e.c1], B = e.c2 >= 0 ? cv.cells[e.c2] : { x: A.x + e.dx * 100, y: A.y + e.dy * 100 };
    stroke(0, 0, 10); strokeWeight(5 + e.w * 3); line(ox + A.x * sc, oy - A.y * sc, ox + B.x * sc, oy - B.y * sc);
    stroke(35, 80, 100); strokeWeight(2 + e.w * 2); line(ox + A.x * sc, oy - A.y * sc, ox + B.x * sc, oy - B.y * sc);
  }
  for (let c of cv.cells) { noStroke(); fill(0, 0, 100); circle(ox + c.x * sc, oy - c.y * sc, 8); }

  // 右下：ニュートン多角形と、どこの明るさを見ているか
  let nx = width - 40 - d * 28, ny = height - 40, ns = 28;
  noStroke(); fill(0, 0, 0, 50); rect(nx - 20, ny - d * ns - 20, d * ns + 40, d * ns + 40, 10);
  for (let t of terms) { fill(0, 0, 100 - Math.min(100, Math.max(0, (t.a / amp) * 100))); circle(nx + t.i * ns, ny - t.j * ns, 14); }
  if (ready) { let s = 1.5; image(cap, 20, height - vh * s - 20, vw * s, vh * s); noFill(); stroke(0, 0, 100, 60); strokeWeight(1); for (let t of terms) { let p = samplePos(t); rect(20 + p.x * s, height - vh * s - 20 + p.y * s, s, s); } }

  noStroke(); fill(0, 0, 100); textSize(18);
  text((ready ? '📷 カメラ' : 'カメラなし → ノイズ') + '　↑↓：次数 d = ' + d + '（項 ' + terms.length + ' 個）　I：反転 ' + (invert ? 'ON' : 'off') + '　V：映像　R：領域の色', 20, 36);
  fill(0, 0, 85); textSize(15);
  text('右下 = ニュートン多角形（白いほど低い = 強い項）。左下 = カメラ画像と、各格子点が見ている画素。暗い物をかざすと、その場所に対応する項の領域が広がる', 20, 62);
}

function keyPressed() {
  if (key === UP_ARROW) { d = Math.min(7, d + 1); terms = makeTerms(d); }
  if (key === DOWN_ARROW) { d = Math.max(2, d - 1); terms = makeTerms(d); }
  if (key === 'i' || key === 'I') invert = !invert;
  if (key === 'v' || key === 'V') showVideo = !showVideo;
  if (key === 'r' || key === 'R') showRegions = !showRegions;
}

// ---------- やってみよう ----------
// 1. 手を画面の左下・右下・上に動かして、曲線のどの部分が動くか観察しよう（samplePos の対応）
// 2. amp を大きくすると曲線は大きく動く。小さくするとほぼ 0.1(i²+j²) の「お椀」だけ = 規則正しい六角形模様
// 3. 明るさの代わりに「赤の強さ − 青の強さ」を高さにする（色で動く曲線）
// 4. 14 のように各領域の色を項ごとに決めて、カメラの色と混ぜてみよう


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
