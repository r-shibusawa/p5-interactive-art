// ============================================
// 08 パスカルの定理とブリアンションの定理
// 円錐曲線（楕円）上の 6 点 P1〜P6 を順に結んだ六角形：対辺の交点 P1P2∩P4P5, P2P3∩P5P6, P3P4∩P6P1 は 1 直線（パスカル線）上
//   双対（B）：楕円の 6 本の接線が作る六角形の対角線 3 本は 1 点（ブリアンション点）で交わる
//   パスカルの定理の「点 ↔ 直線」「〜上の点 ↔ 〜に接する直線」を入れかえるとブリアンションになる
// 6 点をドラッグ（楕円の上を動く） / B = パスカル ↔ ブリアンション / ↑↓ = 楕円の太さ / ←→ = 回転 / S = 順番をシャッフル / R = リセット
// ============================================

let th = [];                    // 6 点の楕円上の角度
let ea = 300, eb = 180, phi = 0.3;   // ★ 楕円の半軸と回転
let hexOrder = [0, 1, 2, 3, 4, 5]; // 六角形の順番
let brianchon = false;
let dragging = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  ea = min(width, height) * 0.38; eb = ea * 0.6;
  resetAll();
}
function resetAll() { th = [0.3, 1.2, 2.3, 3.3, 4.2, 5.4]; hexOrder = [0, 1, 2, 3, 4, 5]; phi = 0.3; eb = ea * 0.6; }
function ctr() { return { x: width * 0.5, y: height * 0.54 }; }
// 楕円上の点（角度 t）と、その点での接線の方向
function ePt(t) { let c = ctr(), x = ea * Math.cos(t), y = eb * Math.sin(t); return { x: c.x + x * Math.cos(phi) - y * Math.sin(phi), y: c.y + x * Math.sin(phi) + y * Math.cos(phi) }; }
function eTan(t) { let x = -ea * Math.sin(t), y = eb * Math.cos(t); return { x: x * Math.cos(phi) - y * Math.sin(phi), y: x * Math.sin(phi) + y * Math.cos(phi) }; }
function angleOf(mx, my) { let c = ctr(), dx = mx - c.x, dy = my - c.y, x = dx * Math.cos(phi) + dy * Math.sin(phi), y = -dx * Math.sin(phi) + dy * Math.cos(phi); return Math.atan2(y / eb, x / ea); }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) th[dragging] = angleOf(mouseX, mouseY);
  let P = hexOrder.map((i) => ePt(th[i]));           // 六角形の順に並べた点
  let c = ctr();
  // 楕円
  noFill(); stroke(200, 50, 90, 70); strokeWeight(2);
  push(); translate(c.x, c.y); rotate(phi); ellipse(0, 0, ea * 2, eb * 2); pop();

  if (!brianchon) {
    // パスカル：辺 i = P_i P_{i+1}。対辺は i と i+3
    let sides = [0, 1, 2, 3, 4, 5].map((i) => lineThrough(P[i], P[(i + 1) % 6]));
    let X = [0, 1, 2].map((i) => hCross(sides[i], sides[i + 3]));
    let det = hDet(hUnit(X[0]), hUnit(X[1]), hUnit(X[2]));
    stroke(45, 70, 100, 50); strokeWeight(1.5); for (let s of sides) drawHLine(s);
    stroke(140, 60, 95); strokeWeight(3); for (let i = 0; i < 6; i++) line(P[i].x, P[i].y, P[(i + 1) % 6].x, P[(i + 1) % 6].y);
    stroke(15, 80, 100); strokeWeight(3); drawHLine(hCross(X[0], X[1]));
    stroke(15, 80, 100); strokeWeight(2); fill(15, 80, 100, 60);
    for (let i = 0; i < 3; i++) drawHPoint(X[i], 16, ['12∩45', '23∩56', '34∩61'][i]);
    noStroke(); fill(0, 0, 100); textSize(18);
    text('パスカルの定理　対辺の交点 3 つの行列式 = ' + nf(det, 1, 6) + '　→ ' + (Math.abs(det) < 1e-4 ? '共線 ✓' : '…'), 20, 40);
  } else {
    // ブリアンション：接線 t_i。六角形の頂点 V_i = t_i ∩ t_{i+1}。対角線 V_i V_{i+3}
    let tg = P.map((p, k) => { let d = eTan(th[hexOrder[k]]); return lineThrough(p, { x: p.x + d.x, y: p.y + d.y }); });
    let V = [0, 1, 2, 3, 4, 5].map((i) => hCross(tg[i], tg[(i + 1) % 6]));
    let diag = [0, 1, 2].map((i) => hCross(V[i], V[i + 3]));
    let det = hDet(hUnit(diag[0]), hUnit(diag[1]), hUnit(diag[2]));
    let Bp = hCross(diag[0], diag[1]);
    stroke(45, 70, 100, 60); strokeWeight(1.5); for (let t of tg) drawHLine(t);
    stroke(140, 60, 95); strokeWeight(2); for (let i = 0; i < 6; i++) { let a = toXY(V[i]), b = toXY(V[(i + 1) % 6]); if (a && b) line(a.x, a.y, b.x, b.y); }
    stroke(15, 80, 100); strokeWeight(3); for (let d of diag) drawHLine(d);
    stroke(45, 90, 100); strokeWeight(2); fill(45, 90, 100, 60); for (let i = 0; i < 6; i++) drawHPoint(V[i], 12, 'V' + (i + 1));
    stroke(15, 80, 100); fill(15, 80, 100); drawHPoint(Bp, 20, 'B');
    noStroke(); fill(0, 0, 100); textSize(18);
    text('ブリアンションの定理　対角線 3 本の行列式 = ' + nf(det, 1, 6) + '　→ ' + (Math.abs(det) < 1e-4 ? '共点 ✓' : '…'), 20, 40);
  }
  // 6 点
  noStroke(); textSize(15);
  for (let k = 0; k < 6; k++) { fill(200, 60, 100); circle(P[k].x, P[k].y, 14); fill(0, 0, 100); text('P' + (k + 1), P[k].x + 10, P[k].y - 8); }
  fill(0, 0, 65); textSize(15);
  text('6 点をドラッグ（楕円の上を動く）　B：' + (brianchon ? 'パスカルに' : 'ブリアンションに') + '　↑↓：太さ　←→：回転　S：順番シャッフル　R：リセット', 20, 68);
  fill(0, 0, 80); textSize(14);
  text(brianchon ? '点 ↔ 接線、辺 ↔ 頂点、共線 ↔ 共点。パスカル（1640 年、16 歳）の双対がブリアンション（1806 年）' : '六角形が自分と交差していても成り立つ。2 点を近づけて重ねると「辺」が接線になる（5 点で接線を作図できる）', 20, height - 24);
}

function mousePressed() { dragging = nearestHandle(hexOrder.map((i) => ePt(th[i])), mouseX, mouseY, 26); if (dragging >= 0) dragging = hexOrder[dragging]; }
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'b' || key === 'B') brianchon = !brianchon;
  if (key === UP_ARROW) eb = min(ea, eb + 10);
  if (key === DOWN_ARROW) eb = max(40, eb - 10);
  if (key === LEFT_ARROW) phi -= 0.05;
  if (key === RIGHT_ARROW) phi += 0.05;
  if (key === 's' || key === 'S') { for (let i = 5; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [hexOrder[i], hexOrder[j]] = [hexOrder[j], hexOrder[i]]; } }
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. S で順番を変えて星形の六角形にしても、パスカル線はちゃんと 3 点を通る。順番は 60 通り（線は 60 本）
// 2. 2 点を近づけて重ねる（P1 ≈ P2）。辺 P1P2 は接線に近づく。「5 点と 1 本の接線」でもパスカルは成り立つ
// 3. ブリアンションで、六角形の頂点 V が無限遠に飛ぶ配置（接線が平行 = 2 点が楕円の反対側）を作る。対角線はまだ 1 点で交わる？
// 4. 楕円の eb を ea と同じにして円にする。円の場合のパスカル線を 6 点を動かして観察し、07 のパップスと見比べよう

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
