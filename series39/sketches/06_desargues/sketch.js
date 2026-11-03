// ============================================
// 06 デザルグの定理
// 2 つの三角形 ABC と A'B'C' が「点配景」（AA', BB', CC' が 1 点 O を通る）なら、
//   対応する辺の交点 AB∩A'B', BC∩B'C', CA∩C'A' の 3 つは必ず 1 直線（配景の軸）の上にある
//   双対：3 つの交点が共線（線配景）なら AA', BB', CC' は共点。定理の文の「点」と「線」を入れかえても正しい
// O・A・B・C・A'・B'・C' をドラッグ（A' は直線 OA の上を動く） / D = 双対の説明 / 1 = A'B'C' を ABC の相似形に / R = リセット
// ============================================

let O, tri = [], kk = [];       // 中心、三角形 ABC、A' = O + k (A − O) の k
let handles = [], dragging = -1;
let showDual = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function resetAll() {
  O = { x: width * 0.12, y: height * 0.5 };
  tri = [{ x: width * 0.38, y: height * 0.3 }, { x: width * 0.42, y: height * 0.72 }, { x: width * 0.3, y: height * 0.55 }];
  kk = [1.8, 1.45, 2.3];
}
function primed(i) { return { x: O.x + kk[i] * (tri[i].x - O.x), y: O.y + kk[i] * (tri[i].y - O.y) }; }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) {
    if (dragging === 0) O = { x: mouseX, y: mouseY };
    else if (dragging <= 3) tri[dragging - 1] = { x: mouseX, y: mouseY };
    else {   // A' などは直線 OA の上に拘束：k = 射影
      let i = dragging - 4, vx = tri[i].x - O.x, vy = tri[i].y - O.y, L2 = vx * vx + vy * vy || 1;
      let k = ((mouseX - O.x) * vx + (mouseY - O.y) * vy) / L2;
      kk[i] = constrain(Math.abs(k) < 0.05 ? 0.05 : k, -4, 4);
    }
  }
  let T = tri, Tp = [0, 1, 2].map(primed);
  let names = ['A', 'B', 'C'];
  // 対応する辺の交点
  let X = [];
  for (let i = 0; i < 3; i++) { let j = (i + 1) % 3; X.push(hCross(lineThrough(T[i], T[j]), lineThrough(Tp[i], Tp[j]))); }
  let axis = hCross(X[0], X[1]);
  // 共線の検算：3 点の行列式（単位長にそろえて）
  let det = hDet(hUnit(X[0]), hUnit(X[1]), hUnit(X[2]));
  let axisFar = isFar(X[0]) && isFar(X[1]);

  // 配景の線（O から）
  stroke(45, 80, 100, 35); strokeWeight(1);
  for (let i = 0; i < 3; i++) { let d = { x: T[i].x - O.x, y: T[i].y - O.y }; line(O.x - d.x * 5, O.y - d.y * 5, O.x + d.x * 8, O.y + d.y * 8); }
  // 辺の延長（薄く）
  stroke(0, 0, 100, 12);
  for (let i = 0; i < 3; i++) { let j = (i + 1) % 3; drawHLine(lineThrough(T[i], T[j])); drawHLine(lineThrough(Tp[i], Tp[j])); }
  // 軸
  stroke(15, 80, 100, showDual ? 100 : 80); strokeWeight(showDual ? 4 : 2); drawHLine(axis);
  // 三角形
  noFill(); strokeWeight(3);
  stroke(200, 60, 100); triangle(T[0].x, T[0].y, T[1].x, T[1].y, T[2].x, T[2].y);
  stroke(140, 60, 95); triangle(Tp[0].x, Tp[0].y, Tp[1].x, Tp[1].y, Tp[2].x, Tp[2].y);
  // 点
  noStroke(); textSize(16);
  for (let i = 0; i < 3; i++) {
    fill(200, 60, 100); circle(T[i].x, T[i].y, 14); fill(0, 0, 100); text(names[i], T[i].x + 10, T[i].y - 8);
    fill(140, 60, 95); circle(Tp[i].x, Tp[i].y, 14); fill(0, 0, 100); text(names[i] + "'", Tp[i].x + 10, Tp[i].y - 8);
  }
  fill(45, 90, 100); circle(O.x, O.y, showDual ? 12 : 18); fill(0, 0, 100); text('O（中心）', O.x + 12, O.y - 10);
  stroke(15, 80, 100); strokeWeight(2); fill(15, 80, 100, 60);
  for (let i = 0; i < 3; i++) drawHPoint(X[i], 16, ['AB∩A\'B\'', 'BC∩B\'C\'', 'CA∩C\'A\''][i]);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('3 つの交点の行列式 = ' + nf(det, 1, 6) + '　→ ' + (Math.abs(det) < 1e-4 ? '共線 ✓（いつでも 0）' : '…') + (axisFar ? '　軸は無限遠直線（2 つの三角形が相似）' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('O・A・B・C・A\'・B\'・C\' をドラッグ　D：双対の説明 ' + (showDual ? 'ON' : 'off') + '　1：相似形に　R：リセット　　交点が画面の外に出ても、無限遠に飛んでも、3 点は 1 直線の上', 20, 68);

  if (showDual) {
    fill(0, 0, 100, 8); rect(width - 520, 90, 500, 170, 10);
    fill(15, 80, 100); textSize(16); text('双対（点 ↔ 直線、通る ↔ 交わる）', width - 500, 118);
    fill(0, 0, 90); textSize(14);
    text('定理：AA\', BB\', CC\' が 1 点 O を通る（点配景）', width - 500, 146);
    text('　　⇒ AB∩A\'B\', BC∩B\'C\', CA∩C\'A\' は 1 直線（軸）上', width - 500, 166);
    text('双対：対応する辺の交点が 1 直線上（線配景）', width - 500, 196);
    text('　　⇒ AA\', BB\', CC\' は 1 点を通る。つまり逆も成り立つ', width - 500, 216);
    text('デザルグの定理は「自分自身の双対」。3 次元の影（透視図）だと思うと自然に見える', width - 500, 244);
  }
}

function mousePressed() {
  handles = [O, ...tri, ...[0, 1, 2].map(primed)];
  dragging = nearestHandle(handles, mouseX, mouseY, 26);
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'd' || key === 'D') showDual = !showDual;
  if (key === '1') kk = [1.8, 1.8, 1.8];
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. A' を O の反対側（k < 0）へ動かす。2 つの三角形が O をはさんでも定理は成り立つ？
// 2. 1 で相似形にすると 3 つの交点はすべて無限遠（矢印が 3 組）。それでも「1 直線上」= 無限遠直線上
// 3. O を無限遠に持っていきたい。AA', BB', CC' を平行にするにはどうすれば？（O をずっと遠くへ）
// 4. この図を「2 枚の三角形の板に光を当てた影」と考えると、軸は 2 枚の板の面の交線。立体で説明してみよう

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
