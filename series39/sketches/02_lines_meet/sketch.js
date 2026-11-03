// ============================================
// 02 平行線も交わる：外積で直線と交点
// 2 点 P, Q（同次座標）を通る直線は外積 P × Q。2 直線 l, m の交点も外積 l × m。式はまったく同じ！
//   平行な 2 直線の交点は w = 0 の点 = 無限遠点。画面のふちに「方向の矢印」で描く
//   D で双対：点 (a, b, c) ↔ 直線 ax + by + cw = 0 を入れかえても、同じ定理が成り立つ
// 4 つの点をドラッグ / P = 2 本目を 1 本目と平行にする / D = 双対を表示 / R = リセット
// ============================================

let pts = [];               // 4 つの端点（直線 1 = pts[0], pts[1]、直線 2 = pts[2], pts[3]）
let dragging = -1;
let showDual = false;
let U;                      // 数値表示用の単位（px）。画面の中心が原点

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  U = min(width, height) / 4;
  resetAll();
}
function resetAll() {
  pts = [{ x: width * 0.25, y: height * 0.7 }, { x: width * 0.55, y: height * 0.35 },
         { x: width * 0.3, y: height * 0.3 }, { x: width * 0.7, y: height * 0.6 }];
}
// 画面の座標 ↔ 中心が原点・U px = 1 の座標（数値を見やすく、双対を意味のある形にするため）
function toUnit(p) { return hPt((p.x - width / 2) / U, (height / 2 - p.y) / U); }
function unitLineToScreen(l) { return [l[0] / U, -l[1] / U, l[2] - (l[0] * width) / (2 * U) + (l[1] * height) / (2 * U)]; }
function unitPtToScreen(p) { return [p[0] * U + (p[2] * width) / 2, -p[1] * U + (p[2] * height) / 2, p[2]]; }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) { pts[dragging].x = mouseX; pts[dragging].y = mouseY; }

  // 単位座標で計算（表示する数値）
  let A = toUnit(pts[0]), B = toUnit(pts[1]), C = toUnit(pts[2]), D = toUnit(pts[3]);
  let l1 = hCross(A, B), l2 = hCross(C, D);         // 直線 = 点 × 点
  let X = hCross(l1, l2);                            // 交点 = 直線 × 直線
  let n1 = hUnit(l1), n2 = hUnit(l2), nX = hUnit(X);
  let far = isFar(X);

  // 画面に描く
  let s1 = unitLineToScreen(l1), s2 = unitLineToScreen(l2), sX = unitPtToScreen(X);
  stroke(200, 60, 95, showDual ? 35 : 90); strokeWeight(3); drawHLine(s1);
  stroke(15, 75, 95, showDual ? 35 : 90); drawHLine(s2);
  noStroke(); fill(0, 0, 100, showDual ? 40 : 100);
  let names = ['P', 'Q', 'R', 'S'];
  textSize(16);
  for (let i = 0; i < 4; i++) { fill(i < 2 ? 200 : 15, 60, 100, showDual ? 40 : 100); circle(pts[i].x, pts[i].y, 14); text(names[i], pts[i].x + 10, pts[i].y - 10); }
  stroke(45, 90, 100); strokeWeight(3); fill(45, 90, 100, 40);
  drawHPoint(sX, 22, 'X');

  if (showDual) drawDual([A, B, C, D], [l1, l2], X);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('l1 = P × Q = [' + v3(n1) + ']　l2 = R × S = [' + v3(n2) + ']　X = l1 × l2 = [' + v3(nX) + ']' + (far ? '　← w ≈ 0：無限遠点！' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('点をドラッグ　P：平行にする　D：双対 ' + (showDual ? 'ON' : 'off') + '　R：リセット　　2 直線が平行 → 交点の w = 0 → 画面のふちの矢印（両端は同じ 1 つの点）', 20, 68);
  // 検算：内積 = 0
  fill(0, 0, 80); textSize(14);
  text('検算（内積）：l1·X = ' + nf(hDot(n1, nX), 1, 4) + '　l2·X = ' + nf(hDot(n2, nX), 1, 4) + '　→ X は両方の直線の上にある', 20, height - 24);
}

// 双対：点 [a, b, c] → 直線 ax + by + cw = 0、直線 → 点。元の図の「点と線」が入れかわる
function drawDual(P, L, X) {
  noFill(); stroke(0, 0, 100, 20); strokeWeight(1); circle(width / 2, height / 2, U * 2);   // 単位円（目安）
  stroke(0, 0, 100, 25); line(width / 2, 0, width / 2, height); line(0, height / 2, width, height / 2);
  // 4 点 → 4 直線
  for (let i = 0; i < 4; i++) { stroke(i < 2 ? 200 : 15, 60, 100, 70); strokeWeight(1.5); drawHLine(unitLineToScreen(P[i])); }
  // 2 直線 → 2 点（= 対応する 2 直線の交点になっている）
  noStroke(); textSize(15);
  for (let i = 0; i < 2; i++) { fill(i === 0 ? 200 : 15, 60, 100); drawHPoint(unitPtToScreen(L[i]), 16, 'l' + (i + 1) + '*'); }
  // 交点 X → 直線（2 つの双対点を通る）
  stroke(45, 90, 100, 90); strokeWeight(2); drawHLine(unitLineToScreen(X));
  noStroke(); fill(45, 90, 100); textSize(15);
  text('双対：点 P, Q → 直線 P*, Q*。直線 l1 = P × Q → 点 l1* = P* ∩ Q*。「2 点を通る 1 直線」↔「2 直線が交わる 1 点」', 20, 92);
}

function v3(v) { return nf(v[0], 1, 2) + ', ' + nf(v[1], 1, 2) + ', ' + nf(v[2], 1, 2); }

function mousePressed() { dragging = nearestHandle(pts, mouseX, mouseY, 30); }
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'p' || key === 'P') {    // S を R + (Q − P) にして平行に
    pts[3] = { x: pts[2].x + (pts[1].x - pts[0].x), y: pts[2].y + (pts[1].y - pts[0].y) };
  }
  if (key === 'd' || key === 'D') showDual = !showDual;
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. P を押して平行にし、S をほんの少しだけ動かす。交点は画面のどちら側に現れる？ 矢印の向きと比べよう
// 2. 直線 [a, b, c] の a, b, c を 2 倍しても同じ直線。hUnit で長さをそろえている理由を考えよう
// 3. 双対（D）で P, Q, R, S を動かし、「3 点が一直線」のとき双対の 3 直線がどうなるか観察
// 4. 3 本目の直線を足して、3 直線が 1 点で交わる条件を行列式 hDet(l1, l2, l3) = 0 で判定してみよう

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
