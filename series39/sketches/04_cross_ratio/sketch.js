// ============================================
// 04 複比の不変性
// 直線 l 上の 4 点 A, B, C, D を、点 O から別の直線 m に射影して A', B', C', D' を作る
//   長さ AC や比 AC/BC は変わるのに、複比 (A,B;C,D) = (AC·BD)/(BC·AD) だけは同じ値のまま ─ 射影変換の不変量
// 点 A〜D・O・直線の端をドラッグ / P = m を l と平行に / R = リセット
// ============================================

let la, lb;                 // 直線 l の端（ドラッグ可）
let ma, mb;                 // 直線 m の端
let O;                      // 射影の中心
let tt = [0.15, 0.4, 0.55, 0.85];   // ★ A, B, C, D の l 上の位置（0〜1）
let handles = [], dragging = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function resetAll() {
  la = { x: width * 0.12, y: height * 0.78 }; lb = { x: width * 0.88, y: height * 0.78 };
  ma = { x: width * 0.2, y: height * 0.45 }; mb = { x: width * 0.8, y: height * 0.25 };
  O = { x: width * 0.5, y: height * 0.12 };
  tt = [0.15, 0.4, 0.55, 0.85];
}
function onL(t) { return { x: la.x + (lb.x - la.x) * t, y: la.y + (lb.y - la.y) * t }; }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) {
    if (dragging < 4) {   // A〜D は直線 l の上を動く（マウスを l に射影）
      let vx = lb.x - la.x, vy = lb.y - la.y, L2 = vx * vx + vy * vy || 1;
      tt[dragging] = constrain(((mouseX - la.x) * vx + (mouseY - la.y) * vy) / L2, -0.3, 1.3);
    } else handles[dragging].x = mouseX, handles[dragging].y = mouseY;
  }
  let P = tt.map(onL), names = ['A', 'B', 'C', 'D'];
  let m = lineThrough(ma, mb), l = lineThrough(la, lb);
  // 射影：O と各点を通る直線と m の交点
  let Pp = P.map((p) => hCross(lineThrough(O, p), m));

  // 直線
  stroke(200, 60, 95, 70); strokeWeight(2); drawHLine(l);
  stroke(15, 75, 95, 70); drawHLine(m);
  // 射影の線
  stroke(45, 80, 100, 40); strokeWeight(1);
  for (let p of P) { let d = { x: p.x - O.x, y: p.y - O.y }, k = 3; line(O.x, O.y, p.x + d.x * k, p.y + d.y * k); }
  // 点
  noStroke(); textSize(16);
  for (let i = 0; i < 4; i++) { fill(200, 60, 100); circle(P[i].x, P[i].y, 14); fill(0, 0, 100); text(names[i], P[i].x - 5, P[i].y + 28); }
  for (let i = 0; i < 4; i++) { fill(15, 75, 100); stroke(15, 75, 100); strokeWeight(2); drawHPoint(Pp[i], 14, names[i] + "'"); noStroke(); }
  fill(45, 90, 100); circle(O.x, O.y, 16); fill(0, 0, 100); text('O', O.x + 12, O.y - 8);
  fill(0, 0, 60); circle(la.x, la.y, 8); circle(lb.x, lb.y, 8); circle(ma.x, ma.y, 8); circle(mb.x, mb.y, 8);

  // 複比：l 上は位置 t で、m 上は同次座標の式で（無限遠点があっても計算できる）
  let crL = crossRatio4(tt[0], tt[1], tt[2], tt[3]);
  let crM = crossRatioH(Pp[0], Pp[1], Pp[2], Pp[3], hPt(ma.x, ma.y), hPt(mb.x, mb.y));
  // 比較用：ふつうの長さと比
  let Ld = (i, j) => Math.abs(tt[j] - tt[i]) * dist(la.x, la.y, lb.x, lb.y);
  let q = Pp.map(toXY);
  let Md = (i, j) => (q[i] && q[j]) ? dist(q[i].x, q[i].y, q[j].x, q[j].y) : Infinity;

  noStroke(); fill(0, 0, 100); textSize(18);
  text('複比 (A,B;C,D) = (AC·BD)/(BC·AD)：　l 上 = ' + fmt(crL) + '　　m 上 = ' + fmt(crM) + '　→ ' + (Math.abs(crL - crM) < 1e-3 * (1 + Math.abs(crL)) ? '同じ！' : '計算中…'), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('A〜D・O・直線の端をドラッグ　P：m を l と平行に　R：リセット　　長さや比は変わるのに複比だけ変わらない（点が無限遠に飛んでも同じ）', 20, 68);
  // 表
  let px = width - 430, py = 110;
  fill(0, 0, 100, 8); rect(px - 16, py - 30, 420, 150, 10);
  fill(0, 0, 100); textSize(15);
  text('長さ　　 AC　　　BC　　　AC/BC　　複比', px, py);
  fill(200, 60, 100); text('l 上　 ' + nf(Ld(0, 2), 1, 0).padStart(5) + '　　' + nf(Ld(1, 2), 1, 0).padStart(5) + '　　' + nf(Ld(0, 2) / (Ld(1, 2) || 1), 1, 2).padStart(5) + '　　' + fmt(crL), px, py + 30);
  fill(15, 75, 100); text("m 上　 " + fmtD(Md(0, 2)).padStart(5) + '　　' + fmtD(Md(1, 2)).padStart(5) + '　　' + (isFinite(Md(0, 2)) && isFinite(Md(1, 2)) ? nf(Md(0, 2) / (Md(1, 2) || 1), 1, 2).padStart(5) : '    ∞') + '　　' + fmt(crM), px, py + 60);
  fill(0, 0, 70); textSize(13);
  text('比 AC/BC は変わる（アフィン不変ではあるが射影不変ではない）。', px, py + 92);
  text('4 点から作る「比の比」= 複比だけが射影でも変わらない', px, py + 110);
}

function crossRatio4(a, b, c, d) { let den = (c - b) * (d - a); return Math.abs(den) < 1e-12 ? NaN : ((c - a) * (d - b)) / den; }
function fmt(v) { return isNaN(v) ? '—' : Math.abs(v) > 1e4 ? '∞' : nf(v, 1, 3); }
function fmtD(v) { return isFinite(v) ? nf(v, 1, 0) : '∞'; }

function mousePressed() {
  handles = [...tt.map(onL), O, la, lb, ma, mb];
  dragging = nearestHandle(handles, mouseX, mouseY, 26);
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'p' || key === 'P') { let d = { x: lb.x - la.x, y: lb.y - la.y }; ma = { x: width * 0.2, y: height * 0.45 }; mb = { x: ma.x + d.x * 0.7, y: ma.y + d.y * 0.7 }; }
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. m を l と平行にする（P）と A'B'C'D' は ABCD の相似な縮小版になる。比 AC/BC も同じになることを確かめよう
// 2. m の端を動かして D' を無限遠に飛ばす（O と D を結ぶ線と m を平行に）。複比は？（AD → ∞ でも (AC·BD)/(BC·AD) は極限で有限）
// 3. 複比が −1 になる位置（調和列点）を探そう。C が AB の中点なら D はどこ？（→ 09）
// 4. A, B, C, D の順番を入れかえると複比はどう変わる？（1 − λ、1/λ などの 6 種類）

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
