// ============================================
// 03 ホモグラフィ（射影変換）
// 正方形の 4 頂点を好きな 4 点に写す 3×3 行列 H を、8 本の連立方程式から求める（道具の homographyFrom4）
//   点 [x, y, 1] → H [x, y, 1] = [x', y', w']、画面では (x'/w', y'/w')。直線は直線のまま、平行は保たれない
//   A でアフィン変換に制限：H の 3 行目が [0, 0, 1] になり、平行線は平行のまま（平行四辺形）
// 4 つの角をドラッグ / A = アフィンに制限 / G = 格子の数 / R = リセット
// ============================================

let dst = [];                   // 4 つの角（画面座標）
let src = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];   // 元の正方形
let dragging = -1;
let affine = false;
let nGrid = 8;                  // ★ チェッカーのマス目の数
let H = null, Hinv = null;
let figure = [];                // 元の正方形の中の絵（線のリスト）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
  makeFigure();
}
function resetAll() {
  let s = min(width, height) * 0.5, cx = width * 0.42, cy = height * 0.52;
  dst = [{ x: cx - s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy + s / 2 }, { x: cx - s / 2, y: cy + s / 2 }];
}
// 絵：顔（円と弧）と矢印。0〜1 の座標で作っておく
function makeFigure() {
  figure = [];
  let circ = (cx, cy, r, a0, a1, n) => { let ln = []; for (let i = 0; i <= n; i++) { let a = a0 + ((a1 - a0) * i) / n; ln.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); } return ln; };
  figure.push(circ(0.5, 0.5, 0.32, 0, Math.PI * 2, 48));
  figure.push(circ(0.38, 0.42, 0.04, 0, Math.PI * 2, 12)); figure.push(circ(0.62, 0.42, 0.04, 0, Math.PI * 2, 12));
  figure.push(circ(0.5, 0.5, 0.2, Math.PI * 0.15, Math.PI * 0.85, 16));
  figure.push([{ x: 0.1, y: 0.9 }, { x: 0.3, y: 0.9 }, { x: 0.25, y: 0.85 }, { x: 0.3, y: 0.9 }, { x: 0.25, y: 0.95 }]);
}

// 点 (x, y) を H で写して [x', y', w'] を返す（w' の符号も見たいので割らない）
function mapH(x, y) { return mat3Vec(H, hPt(x, y)); }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) {
    dst[dragging] = { x: mouseX, y: mouseY };
    if (affine) { let k = dragging; dst[(k + 2) % 4] = { x: dst[(k + 1) % 4].x + dst[(k + 3) % 4].x - dst[k].x, y: dst[(k + 1) % 4].y + dst[(k + 3) % 4].y - dst[k].y }; }
  }
  H = homographyFrom4(src, dst);
  if (!H) { fill(0, 0, 100); textSize(18); text('4 点がつぶれています（R でリセット）', 20, 40); return; }
  Hinv = mat3Inv(H);

  // チェッカーボード：マスの 4 角を写して四角形で描く（w' > 0 のときだけ）
  noStroke();
  for (let i = 0; i < nGrid; i++) for (let j = 0; j < nGrid; j++) {
    let c = [mapH(i / nGrid, j / nGrid), mapH((i + 1) / nGrid, j / nGrid), mapH((i + 1) / nGrid, (j + 1) / nGrid), mapH(i / nGrid, (j + 1) / nGrid)];
    if (c.some((p) => p[2] <= 1e-6)) continue;
    fill((i + j) % 2 ? 45 : 200, 40, (i + j) % 2 ? 80 : 45, 70);
    quad(c[0][0] / c[0][2], c[0][1] / c[0][2], c[1][0] / c[1][2], c[1][1] / c[1][2], c[2][0] / c[2][2], c[2][1] / c[2][2], c[3][0] / c[3][2], c[3][1] / c[3][2]);
  }
  // 格子線（直線は直線に写る：両端を写すだけでよい）
  stroke(0, 0, 100, 35); strokeWeight(1);
  for (let k = 0; k <= nGrid; k++) { drawMappedLine(k / nGrid, 0, k / nGrid, 1); drawMappedLine(0, k / nGrid, 1, k / nGrid); }
  // 絵
  stroke(15, 80, 100); strokeWeight(3); noFill();
  for (let ln of figure) {
    beginShape();
    for (let p of ln) { let q = mapH(p.x, p.y); if (q[2] > 1e-6) vertex(q[0] / q[2], q[1] / q[2]); }
    endShape();
  }
  // 角
  noStroke(); textSize(15);
  for (let i = 0; i < 4; i++) { fill(45, 90, 100); circle(dst[i].x, dst[i].y, 16); fill(0, 0, 100); text('(' + src[i].x + ', ' + src[i].y + ')', dst[i].x + 10, dst[i].y - 10); }

  drawMatrixPanel();
  drawSourcePanel();

  noStroke(); fill(0, 0, 100); textSize(18);
  text('角をドラッグ　A：アフィンに制限 ' + (affine ? 'ON（平行四辺形）' : 'off') + '　G：マス目 ' + nGrid + '　R：リセット', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('直線は直線のまま、平行線は交わるようになる（遠くのマスがつぶれる）。右下：マウスの位置を H⁻¹ で戻すと元の座標がわかる', 20, 68);
}

function drawMappedLine(x0, y0, x1, y1) {
  // 両端が有限ならそのまま。片方が w' ≤ 0 なら途中までを細かく刻む
  let a = mapH(x0, y0), b = mapH(x1, y1);
  if (a[2] > 1e-6 && b[2] > 1e-6) { line(a[0] / a[2], a[1] / a[2], b[0] / b[2], b[1] / b[2]); return; }
  let prev = null;
  for (let i = 0; i <= 24; i++) {
    let q = mapH(x0 + ((x1 - x0) * i) / 24, y0 + ((y1 - y0) * i) / 24);
    let p = q[2] > 1e-6 ? { x: q[0] / q[2], y: q[1] / q[2] } : null;
    if (p && prev) line(prev.x, prev.y, p.x, p.y);
    prev = p;
  }
}

// 行列の数値
function drawMatrixPanel() {
  let px = width - 400, py = 110;
  noStroke(); fill(0, 0, 100, 8); rect(px - 16, py - 30, 390, 165, 10);
  fill(0, 0, 100); textSize(16); text('H =', px, py + 30);
  textFont('monospace');
  for (let r = 0; r < 3; r++) {
    let s = H[r].map((v) => nf(v, 1, r === 2 ? 5 : 2).padStart(9)).join(' ');
    fill(r === 2 && affine ? 45 : 0, r === 2 && affine ? 90 : 0, 100);
    text(s, px + 40, py + r * 26);
  }
  textFont('sans-serif');
  fill(0, 0, 70); textSize(13);
  text('元の正方形は 0〜1、写した先は画面の px', px, py + 100);
  text('3 行目が [0, 0, 1] ならアフィン（平行が保たれる）', px, py + 120);
}

// 右下：元の正方形とマウスの対応点
function drawSourcePanel() {
  let s = 160, px = width - 200, py = height - 200;
  noStroke(); fill(0, 0, 100, 8); rect(px - 10, py - 10, s + 20, s + 20, 10);
  for (let i = 0; i < nGrid; i++) for (let j = 0; j < nGrid; j++) { fill((i + j) % 2 ? 45 : 200, 40, (i + j) % 2 ? 80 : 45, 50); rect(px + (i * s) / nGrid, py + (j * s) / nGrid, s / nGrid, s / nGrid); }
  noFill(); stroke(15, 80, 100); strokeWeight(2);
  for (let ln of figure) { beginShape(); for (let p of ln) vertex(px + p.x * s, py + p.y * s); endShape(); }
  if (Hinv) {
    let q = toXY(mat3Vec(Hinv, hPt(mouseX, mouseY)));
    if (q && q.x >= 0 && q.x <= 1 && q.y >= 0 && q.y <= 1) {
      noStroke(); fill(120, 80, 100); circle(px + q.x * s, py + q.y * s, 10);
      textSize(13); text('(' + nf(q.x, 1, 2) + ', ' + nf(q.y, 1, 2) + ')', px, py - 16);
      noFill(); stroke(120, 80, 100); circle(mouseX, mouseY, 14);
    }
  }
}

function mousePressed() { dragging = nearestHandle(dst, mouseX, mouseY, 30); }
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'a' || key === 'A') { affine = !affine; if (affine) dst[2] = { x: dst[1].x + dst[3].x - dst[0].x, y: dst[1].y + dst[3].y - dst[0].y }; }
  if (key === 'g' || key === 'G') nGrid = nGrid >= 16 ? 4 : nGrid * 2;
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. 上の 2 角を近づけて「地面を見下ろした格子」を作る。00 の透視図と同じ形になるか
// 2. 角を 1 つだけ内側に動かして、3 行目の数値（h31, h32）がどう変わるか見る。0 から離れるほど「遠近感」が強い
// 3. 顔の絵を自分の絵（figure の線のリスト）に変えて、ゆがませてみよう
// 4. 2 つのホモグラフィを続けて使うと？ H2 × H1（mat3Mul）も 1 つのホモグラフィになることを確かめよう

// ==================================================
// ここから下は「射影幾何の道具」（同次座標・外積・行列・ホモグラフィ）
// （中身は読まなくても OK。消さないでね）
// ==================================================

// 同次座標の点 [x, y, w]。w = 1 ならふつうの点 (x, y)、w = 0 なら「方向 (x, y) の無限遠点」
function hPt(x, y, w) { return [x, y, w === undefined ? 1 : w]; }
// 外積。2 点 → それを通る直線 [a, b, c]（ax + by + cw = 0）／ 2 直線 → その交点。どちらも同じ式！
function hCross(p, q) {
  return [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
}
// 内積。点と直線で 0 なら「点が直線の上にある」
function hDot(p, q) { return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]; }
// 3 つの点（または直線）の行列式。0 なら共線（共点）
function hDet(p, q, r) { return hDot(p, hCross(q, r)); }
// 長さを 1 にそろえる（表示用。射影的には同じ点・同じ直線）
function hUnit(p) { let m = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / m, p[1] / m, p[2] / m]; }
// 無限遠（または画面からはるか遠く）にあるか
function isFar(p) { return Math.abs(p[2]) * 1e5 < Math.hypot(p[0], p[1]); }
// 同次座標 → 画面の点 {x, y}（無限遠なら null）
function toXY(p) { return isFar(p) ? null : { x: p[0] / p[2], y: p[1] / p[2] }; }
// 2 点 {x, y} を通る直線
function lineThrough(a, b) { return hCross(hPt(a.x, a.y), hPt(b.x, b.y)); }
// 1 直線上の 4 点の複比 (P1,P2;P3,P4)。X, Y はその直線上の基準 2 点（無限遠点があっても計算できる）
function crossRatioH(P1, P2, P3, P4, X, Y) {
  let n = hCross(X, Y), nn = hDot(n, n) || 1;
  let lm = (P) => [hDot(hCross(P, Y), n) / nn, hDot(hCross(X, P), n) / nn];
  let [l1, m1] = lm(P1), [l2, m2] = lm(P2), [l3, m3] = lm(P3), [l4, m4] = lm(P4);
  let num = (l1 * m3 - l3 * m1) * (l2 * m4 - l4 * m2), den = (l2 * m3 - l3 * m2) * (l1 * m4 - l4 * m1);
  return Math.abs(den) < 1e-12 ? NaN : num / den;
}

// 直線 [a, b, c] を枠（省略すると画面全体）いっぱいに描く
function drawHLine(l, box) {
  let [x0, y0, x1, y1] = box || [0, 0, width, height], cand = [];
  for (let e of [[1, 0, -x0], [1, 0, -x1], [0, 1, -y0], [0, 1, -y1]]) {
    let p = toXY(hCross(l, e));
    if (p && p.x > x0 - 1 && p.x < x1 + 1 && p.y > y0 - 1 && p.y < y1 + 1) cand.push(p);
  }
  if (cand.length < 2) return;
  let best = null, bd = -1;
  for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
    let d = Math.hypot(cand[i].x - cand[j].x, cand[i].y - cand[j].y);
    if (d > bd) { bd = d; best = [cand[i], cand[j]]; }
  }
  line(best[0].x, best[0].y, best[1].x, best[1].y);
}
// 点を描く。ふつうの点なら丸、無限遠点なら枠のふちに「方向の矢印」（向かい合う 2 か所 = 同じ 1 点）
function drawHPoint(p, r, label, box) {
  let [x0, y0, x1, y1] = box || [0, 0, width, height];
  let q = toXY(p);
  if (q) { circle(q.x, q.y, r); if (label) text(label, q.x + r * 0.7, q.y - r * 0.7); return; }
  let dx = p[0], dy = p[1], m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
  let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (let s of [1, -1]) {
    let ux = dx * s, uy = dy * s, t = Infinity;
    if (ux > 1e-9) t = Math.min(t, (x1 - 30 - cx) / ux); if (ux < -1e-9) t = Math.min(t, (x0 + 30 - cx) / ux);
    if (uy > 1e-9) t = Math.min(t, (y1 - 30 - cy) / uy); if (uy < -1e-9) t = Math.min(t, (y0 + 30 - cy) / uy);
    let x = cx + ux * t, y = cy + uy * t;
    push(); translate(x, y); rotate(Math.atan2(uy, ux));
    line(-r * 2.5, 0, r, 0); line(r, 0, 0, -r * 0.8); line(r, 0, 0, r * 0.8);
    pop();
    if (label) text(label + '∞', x - r * 2, y - r);
  }
}

// 3×3 行列（配列の配列）の道具
function mat3Mul(A, B) {
  let C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}
function mat3Vec(M, v) { return [hDot(M[0], v), hDot(M[1], v), hDot(M[2], v)]; }
function mat3T(M) { return [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]]; }
function mat3Inv(M) {
  let [[a, b, c], [d, e, f], [g, h, i]] = M;
  let A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  let det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
          [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
          [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}
// ガウスの消去法（部分ピボット）で A x = b を解く。解けなければ null
function solveLinear(A, b) {
  let n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      let f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
// 4 点の対応 src[i] → dst[i]（{x, y}）からホモグラフィ 3×3 を求める（h33 = 1 に固定、8 本の連立方程式）
function homographyFrom4(src, dst) {
  let A = [], b = [];
  for (let i = 0; i < 4; i++) {
    let x = src[i].x, y = src[i].y, u = dst[i].x, v = dst[i].y;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  let h = solveLinear(A, b);
  if (!h) return null;
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}
// ホモグラフィで点 {x, y} を写す（無限遠へ飛ぶなら null）
function applyH(H, p) { return toXY(mat3Vec(H, hPt(p.x, p.y))); }
// つかめる点のリスト（{x, y}）からマウスに近いものの番号。半径 r 以内になければ -1
function nearestHandle(list, mx, my, r) {
  let best = -1, bd = r;
  for (let i = 0; i < list.length; i++) {
    let d = Math.hypot(list[i].x - mx, list[i].y - my);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
