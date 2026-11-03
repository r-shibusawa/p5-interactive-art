// ============================================
// 06 トロピカル 3 次曲線と種数
// 3 次曲線のニュートン多角形には内部の格子点 (1, 1) が 1 つある。
//   その点が細分の頂点になる ⇔ 曲線に「サイクル」（有界な面）が 1 つできる → 種数 g = 1（楕円曲線！）
//   一般に 種数 = 細分の頂点になった内部格子点の数。smooth（単位三角形だけ）なら g = (d−1)(d−2)/2
// 格子点をドラッグ = 高さ / ↑↓ = 次数（2〜4）/ R = ランダム / 0 = 全部 0 / G = サイクルが出る例 / N = 消える例
// ============================================

let d = 3;                 // ★ 次数
let terms = [];
let sc = 50, ox, oy, nx, ny, ns, cv;
let dragging = -1, dragY = 0, dragA = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.3; oy = height * 0.5;
  rebuild(); preset(true);
}
function rebuild() { terms = makeTerms(d); nx = width * 0.62; ny = height * 0.84; ns = Math.min(100, (height - 220) / d); }
// ★ 内部の点を低く（サイクルあり）／高く（サイクルなし）
function preset(cycle) { for (let t of terms) t.a = 0.3 * (t.i * t.i + t.j * t.j) + 0.07 * t.i * t.j + (isInterior(t) ? (cycle ? -0.6 : 3) : 0); }   // お椀形（smooth になる）+ 内部点を下げる／上げる
function isInterior(t) { return t.i > 0 && t.j > 0 && t.i + t.j < d; }
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }
function latX(i) { return nx + i * ns; }
function latY(j) { return ny - j * ns; }

function draw() {
  background(190, 55, 10);
  cv = tropCurve(terms);
  // 種数：内部格子点のうち細分の頂点になったもの
  let usedInterior = terms.map((t, k) => isInterior(t) && cv.cells.some((c) => c.ids.includes(k)) ? k : -1).filter((k) => k >= 0);
  let interior = terms.filter(isInterior).length;
  let smooth = cv.cells.every((c) => c.ids.length === 3 && Math.abs(triArea2(c)) === 1);

  // 左：曲線。サイクル（有界な面）を塗る
  stroke(0, 0, 100, 18); strokeWeight(1);
  for (let g = -10; g <= 10; g++) { line(toX(g), 0, toX(g), height); line(0, toY(g), width * 0.55, toY(g)); }
  for (let k of usedInterior) {
    let poly = regionPoly(cv, k, terms, 100);
    if (!poly) continue;
    noStroke(); fill(330, 70, 100, 35);
    beginShape(); for (let p of poly) vertex(toX(p.x), toY(p.y)); endShape(CLOSE);
    let mx = 0, my = 0; for (let p of poly) { mx += p.x / poly.length; my += p.y / poly.length; }
    fill(330, 60, 100); textSize(14); text('x^' + terms[k].i + ' y^' + terms[k].j + ' が最小', toX(mx) - 36, toY(my) + 5);
  }
  for (let e of cv.edges) {
    let A = cv.cells[e.c1], B = e.c2 >= 0 ? cv.cells[e.c2] : { x: A.x + e.dx * 100, y: A.y + e.dy * 100 };
    stroke(35, 80, 100); strokeWeight(2 + e.w * 2);
    line(toX(A.x), toY(A.y), toX(B.x), toY(B.y));
  }
  for (let c of cv.cells) { noStroke(); fill(0, 0, 100); circle(toX(c.x), toY(c.y), 12); }

  // 右：ニュートン多角形
  noStroke(); fill(0, 0, 100, 6); rect(nx - 50, ny - d * ns - 50, d * ns + 140, d * ns + 100, 16);
  for (let c of cv.cells) {
    let unit = c.ids.length === 3 && Math.abs(triArea2(c)) === 1;
    fill(unit ? 90 : 0, unit ? 50 : 70, unit ? 50 : 60, 40); noStroke();
    beginShape(); for (let id of c.ids) vertex(latX(terms[id].i), latY(terms[id].j)); endShape(CLOSE);
  }
  for (let e of cv.edges) { stroke(35, 80, 100); strokeWeight(2 + e.w * 2); line(latX(terms[e.p].i), latY(terms[e.p].j), latX(terms[e.q].i), latY(terms[e.q].j)); }
  terms.forEach((t, k) => {
    let used = usedInterior.includes(k);
    stroke(0, 0, 10); strokeWeight(2);
    fill(isInterior(t) ? 330 : 190, isInterior(t) ? (used ? 90 : 30) : 20, 100);
    circle(latX(t.i), latY(t.j), isInterior(t) ? 26 : 20);
    noStroke(); fill(0, 0, 85); textSize(12); text(nf(t.a, 1, 1), latX(t.i) + 12, latY(t.j) - 10);
  });

  noStroke(); fill(0, 0, 100); textSize(18);
  text('格子点をドラッグ　↑↓：次数 d = ' + d + '　R：ランダム　0：全部 0　G：サイクルが出る例　N：消える例', 20, 36);
  fill(330, 70, 100); textSize(26);
  text('種数 g = ' + usedInterior.length + '　（内部格子点 ' + interior + ' 個のうち細分の頂点になったもの）', 20, 80);
  fill(smooth ? 90 : 35, 80, 100); textSize(18);
  text(smooth ? 'smooth：細分は単位三角形だけ → g = (d−1)(d−2)/2 = ' + (d - 1) * (d - 2) / 2 + '（最大）' : '非 smooth：大きいセルがある（赤）→ 種数が最大より小さいことがある', 20, 108);
  fill(0, 0, 65); textSize(15);
  text('ピンクの面 = サイクル（内部の格子点の項が最小になる有界な領域）。内部点が持ち上がる（高い）と下側凸包に現れず、サイクルは消える', 20, 134);
  text('複素数の世界では 3 次曲線 = 楕円曲線（種数 1 = ドーナツ）。トロピカルでは「輪っか 1 つ」として目に見える', 20, height - 24);
}
function triArea2(c) { let [p, q, r] = c.ids.map((id) => terms[id]); return (q.i - p.i) * (r.j - p.j) - (q.j - p.j) * (r.i - p.i); }

function mousePressed() {
  dragging = -1;
  terms.forEach((t, k) => { if (dist(mouseX, mouseY, latX(t.i), latY(t.j)) < 18) { dragging = k; dragY = mouseY; dragA = t.a; } });
}
function mouseDragged() { if (dragging >= 0) terms[dragging].a = constrain(dragA + (dragY - mouseY) * 0.02, -6, 6); }
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === UP_ARROW) { d = Math.min(4, d + 1); rebuild(); preset(true); }
  if (key === DOWN_ARROW) { d = Math.max(2, d - 1); rebuild(); preset(true); }
  if (key === 'r' || key === 'R') for (let t of terms) t.a = random(-2, 2);
  if (key === '0') for (let t of terms) t.a = 0;
  if (key === 'g' || key === 'G') preset(true);
  if (key === 'n' || key === 'N') preset(false);
}

// ---------- やってみよう ----------
// 1. 内部の点 (1,1) をゆっくり上げていって、サイクルが消える瞬間の高さを見つけよう（他の 3 点が作る平面の高さ）
// 2. d = 4 にして g = 3 を作ろう。内部の 3 点をすべて低くするとどうなる？
// 3. サイクルの辺の重みを 2 にできる？（細分の内部の辺が格子点をとばすように）
// 4. 種数 g の曲線の「サイクルの長さ」（辺の格子長の和）を計算して表示してみよう（j 不変量と関係がある）


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
