// ============================================
// 10 双対性の遊び場
// 左に点と直線を置くと、右にその双対（点 ↔ 直線）がリアルタイムで描かれる
//   双対は単位円に関する「極と極線」：点 (u, v) ↔ 直線 uX + vY = 1。円の内側の点 ↔ 円の外の直線、円周上の点 ↔ 接線
//   左で「3 点が 1 直線」なら右で「3 直線が 1 点」。「2 点を通る直線」は「2 直線の交点」になる
// 左の空いた所をクリック = 点を置く / 点をドラッグ / 点を続けて 2 つクリック = その 2 点を通る直線を引く（もう一度で消す） / X = 選んだ点を消す / 1〜3 = お手本 / C = 全部消す
// ============================================

let pts = [];                 // 左の点（画面座標）
let lines = [];               // 左の直線 = [点の番号, 点の番号]
let sel = [];                 // 選択中の点（最大 2）
let dragging = -1, moved = false;
let U;                        // 単位円の半径（px）
let L, Rb;                    // 左右の枠

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  L = [0, 90, width / 2 - 5, height]; Rb = [width / 2 + 5, 90, width, height];
  U = min(width / 4, (height - 90) / 2) * 0.5;
  preset(1);
}
function cL() { return { x: (L[0] + L[2]) / 2, y: (L[1] + L[3]) / 2 }; }
function cR() { return { x: (Rb[0] + Rb[2]) / 2, y: (Rb[1] + Rb[3]) / 2 }; }
// 画面 ↔ 単位円の座標
function toUnit(p) { let c = cL(); return hPt((p.x - c.x) / U, (c.y - p.y) / U); }
function fromUnit(u, c) { return { x: c.x + u.x * U, y: c.y - u.y * U }; }
function unitLineToScreen(l, c) { return [l[0] / U, -l[1] / U, l[2] - (l[0] * c.x) / U + (l[1] * c.y) / U]; }
// 双対：点 [u, v, 1] → 直線 uX + vY − 1 = 0。直線 [a, b, c] → 点 [a, b, −c]
function dualOfPoint(p) { return [p[0], p[1], -p[2]]; }
function dualOfLine(l) { return [l[0], l[1], -l[2]]; }

function preset(n) {
  let c = cL(); pts = []; lines = []; sel = [];
  if (n === 1) { pts = [fromUnit({ x: -1.2, y: -0.5 }, c), fromUnit({ x: 0.1, y: 0.2 }, c), fromUnit({ x: 1.4, y: 0.9 }, c), fromUnit({ x: 0.6, y: -1.1 }, c)]; lines = [[0, 1], [1, 2], [0, 2]]; }
  if (n === 2) { pts = [fromUnit({ x: -1, y: -0.8 }, c), fromUnit({ x: 1.1, y: -0.6 }, c), fromUnit({ x: 0.2, y: 1.2 }, c)]; lines = [[0, 1], [1, 2], [2, 0]]; }
  if (n === 3) { pts = [fromUnit({ x: -1.2, y: -0.9 }, c), fromUnit({ x: 1.2, y: -0.9 }, c), fromUnit({ x: 0.8, y: 1.1 }, c), fromUnit({ x: -0.5, y: 0.7 }, c)]; lines = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]]; }
}

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) { let nx = constrain(mouseX, L[0] + 10, L[2] - 10), ny = constrain(mouseY, L[1] + 10, L[3] - 10); if (dist(nx, ny, pts[dragging].x, pts[dragging].y) > 2) moved = true; pts[dragging] = { x: nx, y: ny }; }
  let cl = cL(), cr = cR();
  // 枠と単位円
  for (let [b, c, t] of [[L, cl, '点と直線（ここで操作）'], [Rb, cr, '双対（点 ↔ 直線）']]) {
    noFill(); stroke(0, 0, 100, 25); strokeWeight(1); rect(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    stroke(0, 0, 100, 30); circle(c.x, c.y, U * 2); line(c.x - 8, c.y, c.x + 8, c.y); line(c.x, c.y - 8, c.x, c.y + 8);
    noStroke(); fill(45, 80, 100); textSize(15); text(t, b[0] + 12, b[1] + 24);
  }
  let hp = pts.map(toUnit);
  let hl = lines.map(([i, j]) => hCross(hp[i], hp[j]));
  // 左：直線
  stroke(200, 60, 95, 80); strokeWeight(2);
  for (let l of hl) drawHLine(unitLineToScreen(l, cl), L);
  // 右：点の双対 = 直線
  stroke(15, 75, 100, 85); strokeWeight(2);
  for (let p of hp) drawHLine(unitLineToScreen(dualOfPoint(p), cr), Rb);
  // 右：直線の双対 = 点
  stroke(200, 60, 95); strokeWeight(2); fill(200, 60, 95); textSize(14);
  for (let k = 0; k < hl.length; k++) {
    let d = dualOfLine(hl[k]);
    drawHPoint([d[0] * U + d[2] * cr.x, -d[1] * U + d[2] * cr.y, d[2]], 14, 'l' + (k + 1) + '*', Rb);
  }
  // 左：点
  noStroke(); textSize(14);
  for (let i = 0; i < pts.length; i++) {
    let s = sel.includes(i);
    fill(15, 75, 100); circle(pts[i].x, pts[i].y, s ? 20 : 14);
    if (s) { noFill(); stroke(45, 90, 100); strokeWeight(2); circle(pts[i].x, pts[i].y, 28); noStroke(); }
    fill(0, 0, 100); text('P' + (i + 1), pts[i].x + 10, pts[i].y - 8);
  }
  // 左：直線のラベル（2 点の中点に）
  fill(200, 60, 95);
  for (let k = 0; k < lines.length; k++) { let [i, j] = lines[k]; text('l' + (k + 1), (pts[i].x + pts[j].x) / 2 + 6, (pts[i].y + pts[j].y) / 2 - 6); }
  // 右：直線の双対点のそばに「どの点を通る線か」
  // 共線・共点のチェック：3 点が共線 ↔ 右で 3 直線が共点
  let collin = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) for (let k = j + 1; k < pts.length; k++)
    if (Math.abs(hDet(hUnit(hp[i]), hUnit(hp[j]), hUnit(hp[k]))) < 2e-3) collin.push('P' + (i + 1) + 'P' + (j + 1) + 'P' + (k + 1));

  fill(0, 0, 100); textSize(18);
  text('左：点 ' + pts.length + '・直線 ' + lines.length + '　→　右：直線 ' + pts.length + '・点 ' + lines.length + (collin.length ? '　　共線の 3 点：' + collin.join(', ') + ' → 右では 3 直線が 1 点で交わる' : ''), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('クリック：点を置く　ドラッグ：動かす　点を 2 つ続けてクリック：直線を引く／消す　X：選んだ点を消す　1〜3：お手本　C：全部消す　　円の中心に点を置くと双対は無限遠直線', 20, 68);
}

function mousePressed() {
  if (mouseX > L[2] || mouseY < L[1]) return;
  dragging = nearestHandle(pts, mouseX, mouseY, 22); moved = false;
  if (dragging < 0 && pts.length < 12) { pts.push({ x: mouseX, y: mouseY }); sel = []; }
}
function mouseReleased() {
  if (dragging >= 0 && !moved) {   // クリック = 選択
    if (sel.includes(dragging)) sel = sel.filter((i) => i !== dragging);
    else sel.push(dragging);
    if (sel.length === 2) {
      let [a, b] = sel, k = lines.findIndex(([i, j]) => (i === a && j === b) || (i === b && j === a));
      if (k >= 0) lines.splice(k, 1); else lines.push([a, b]);
      sel = [];
    }
  }
  dragging = -1;
}
function keyPressed() {
  if (key === 'x' || key === 'X') {
    for (let i of [...sel].sort((a, b) => b - a)) { pts.splice(i, 1); lines = lines.filter(([a, b]) => a !== i && b !== i).map(([a, b]) => [a > i ? a - 1 : a, b > i ? b - 1 : b]); }
    sel = [];
  }
  if (key === '1' || key === '2' || key === '3') preset(Number(key));
  if (key === 'c' || key === 'C') { pts = []; lines = []; sel = []; }
}

// ---------- やってみよう ----------
// 1. お手本 1 で P1, P2, P3 が 1 直線に並ぶようにドラッグ。右の 3 直線が 1 点で交わる瞬間を見よう
// 2. 点を単位円の上に置くと、双対の直線はその点での接線になる。円の中心に置くと？（無限遠直線 = 描けない）
// 3. お手本 3（完全四辺形：4 点 6 直線）の双対は「完全四角形：4 直線 6 点」。右の図を数えて確かめよう
// 4. デザルグ（06）やパップス（07）の図をここで作って、双対の図で「双対定理」を目で確かめよう

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
