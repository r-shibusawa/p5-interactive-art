// ============================================
// 07 パップスの定理
// 直線 l 上の 3 点 A, B, C と直線 m 上の 3 点 A', B', C'。交差結合の 3 交点
//   X = AB'∩A'B,  Y = AC'∩A'C,  Z = BC'∩B'C  は必ず 1 直線（パップス線）の上にある
//   l と m が平行でも、交点が無限遠に飛んでも成り立つ（同次座標なら何も特別扱いしなくてよい）
// 6 点と直線の端をドラッグ / P = m を l と平行に / S = 点の順番を入れかえる / R = リセット
// ============================================

let la, lb, ma, mb;             // 直線 l, m の端
let tl = [0.15, 0.5, 0.85];     // ★ l 上の A, B, C の位置（0〜1）
let tm = [0.2, 0.55, 0.9];      // ★ m 上の A', B', C' の位置
let handles = [], dragging = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function resetAll() {
  la = { x: width * 0.1, y: height * 0.72 }; lb = { x: width * 0.9, y: height * 0.8 };
  ma = { x: width * 0.15, y: height * 0.3 }; mb = { x: width * 0.85, y: height * 0.18 };
  tl = [0.15, 0.5, 0.85]; tm = [0.2, 0.55, 0.9];
}
function on(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function paramOf(a, b, mx, my) { let vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1; return constrain(((mx - a.x) * vx + (my - a.y) * vy) / L2, -0.3, 1.3); }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) {
    if (dragging < 3) tl[dragging] = paramOf(la, lb, mouseX, mouseY);
    else if (dragging < 6) tm[dragging - 3] = paramOf(ma, mb, mouseX, mouseY);
    else { let h = [la, lb, ma, mb][dragging - 6]; h.x = mouseX; h.y = mouseY; }
  }
  let P = tl.map((t) => on(la, lb, t)), Q = tm.map((t) => on(ma, mb, t));
  // 交差結合
  let X = hCross(lineThrough(P[0], Q[1]), lineThrough(Q[0], P[1]));
  let Y = hCross(lineThrough(P[0], Q[2]), lineThrough(Q[0], P[2]));
  let Z = hCross(lineThrough(P[1], Q[2]), lineThrough(Q[1], P[2]));
  let pappus = hCross(X, Y);
  let det = hDet(hUnit(X), hUnit(Y), hUnit(Z));
  let lm = hCross(lineThrough(la, lb), lineThrough(ma, mb));

  // 直線 l, m
  stroke(200, 60, 95, 70); strokeWeight(2); drawHLine(lineThrough(la, lb));
  stroke(140, 60, 95, 70); drawHLine(lineThrough(ma, mb));
  // 結合線（6 本）
  stroke(45, 70, 100, 45); strokeWeight(1.5);
  for (let [i, j] of [[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]]) drawHLine(lineThrough(P[i], Q[j]));
  // パップス線
  stroke(15, 80, 100); strokeWeight(3); drawHLine(pappus);
  // 点
  noStroke(); textSize(16);
  let nm = ['A', 'B', 'C'];
  for (let i = 0; i < 3; i++) {
    fill(200, 60, 100); circle(P[i].x, P[i].y, 14); fill(0, 0, 100); text(nm[i], P[i].x - 5, P[i].y + 26);
    fill(140, 60, 95); circle(Q[i].x, Q[i].y, 14); fill(0, 0, 100); text(nm[i] + "'", Q[i].x - 5, Q[i].y - 14);
  }
  fill(0, 0, 60); for (let h of [la, lb, ma, mb]) circle(h.x, h.y, 8);
  stroke(15, 80, 100); strokeWeight(2); fill(15, 80, 100, 60);
  drawHPoint(X, 16, 'X'); drawHPoint(Y, 16, 'Y'); drawHPoint(Z, 16, 'Z');
  // l と m の交点（参考）
  noStroke(); fill(0, 0, 100, 50); stroke(0, 0, 100, 50); strokeWeight(1); drawHPoint(lm, 10, 'l∩m');

  noStroke(); fill(0, 0, 100); textSize(18);
  text('X = AB\'∩A\'B,  Y = AC\'∩A\'C,  Z = BC\'∩B\'C　　行列式 det(X, Y, Z) = ' + nf(det, 1, 6) + '　→ ' + (Math.abs(det) < 1e-4 ? '共線 ✓' : '…') + (isFar(lm) ? '　（l ∥ m）' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('6 点と直線の端をドラッグ　P：平行に　S：順番を入れかえ　R：リセット　　パップス線（赤）は点を動かしても必ず X, Y, Z を通る。古代ギリシャ（4 世紀）の定理', 20, 68);
  fill(0, 0, 80); textSize(14);
  text('パスカルの定理（08）で「円錐曲線」を「2 直線」にしたものがパップス。どちらも六角形の対辺の交点が共線', 20, height - 24);
}

function mousePressed() {
  handles = [...tl.map((t) => on(la, lb, t)), ...tm.map((t) => on(ma, mb, t)), la, lb, ma, mb];
  dragging = nearestHandle(handles, mouseX, mouseY, 26);
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'p' || key === 'P') { let d = { x: lb.x - la.x, y: lb.y - la.y }; mb = { x: ma.x + d.x * 0.8, y: ma.y + d.y * 0.8 }; }
  if (key === 's' || key === 'S') tm = [tm[1], tm[2], tm[0]];
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. P で平行にしてから B' を動かす。X, Y, Z のどれかが無限遠に飛ぶ位置を探そう（矢印が出る）
// 2. S で A', B', C' の順番を変えると別のパップス線ができる。3 通りのパップス線は 1 点で交わる？（そうなる配置を探そう）
// 3. 6 点を 1 つの六角形 A B' C A' B C' の順につなぐと、X, Y, Z は「対辺の交点」。08 のパスカルと同じ形の定理
// 4. l と m を同じ直線にすると？（退化）。定理の条件を読み直してみよう

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
