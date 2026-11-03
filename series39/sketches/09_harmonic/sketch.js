// ============================================
// 09 調和共役と完全四辺形
// 直線上の 3 点 A, B, C から、複比 (A,B;C,D) = −1 になる第 4 点 D（C の調和共役）を「定規だけ」で作図する
//   ① 直線の外に点 P、PA 上に点 Q　② 直線 QC と PB の交点 R　③ 直線 AR と BQ の交点 S　④ 直線 PS と AB の交点 = D
//   P, Q をどこに取っても D は同じ所に決まる（完全四辺形 PQRS の性質）。C が AB の中点なら D は無限遠
// スペース = 次の手順（作図線がアニメーション） / A, B, C を直線上でドラッグ / P, Q をドラッグ / R = 最初から
// ============================================

let yL;                       // 直線 AB の高さ
let xa, xb, xc;               // A, B, C の x 座標
let P, sQ = 0.45;             // P の位置と、Q = P + sQ (A − P)
let stage = 0, prog = 0;      // 手順と、その手順のアニメーションの進み（0〜1）
let speed = 0.03;             // ★ 作図線が伸びる速さ
let handles = [], dragging = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function resetAll() {
  yL = height * 0.52; xa = width * 0.17; xb = width * 0.63; xc = width * 0.53;
  P = { x: width * 0.74, y: height * 0.21 }; sQ = 0.43; stage = 0; prog = 0;
}
function Qpt() { return { x: P.x + sQ * (xa - P.x), y: P.y + sQ * (yL - P.y) }; }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) {
    if (dragging === 0) xa = mouseX; if (dragging === 1) xb = mouseX; if (dragging === 2) xc = mouseX;
    if (dragging === 3) P = { x: mouseX, y: constrain(mouseY, 40, yL - 40) };
    if (dragging === 4) { let vx = xa - P.x, vy = yL - P.y, L2 = vx * vx + vy * vy || 1; sQ = constrain(((mouseX - P.x) * vx + (mouseY - P.y) * vy) / L2, 0.1, 0.9); }
  }
  if (prog < 1) prog = min(1, prog + speed);
  let A = { x: xa, y: yL }, B = { x: xb, y: yL }, C = { x: xc, y: yL }, Q = Qpt();
  let AB = lineThrough(A, B);
  let Rh = hCross(lineThrough(Q, C), lineThrough(P, B)), R = toXY(Rh);
  let Sh = R ? hCross(lineThrough(R, A), lineThrough(Q, B)) : [0, 0, 0], S = toXY(Sh);
  let Dh = S ? hCross(lineThrough(P, S), AB) : [1, 0, 0];
  let cr = crossRatioH(hPt(A.x, A.y), hPt(B.x, B.y), hPt(C.x, C.y), Dh, hPt(A.x, A.y), hPt(B.x, B.y));

  // 直線 AB
  stroke(200, 60, 95, 70); strokeWeight(2); line(0, yL, width, yL);
  // 作図（手順ごとに描く。今の手順はアニメーション）
  let f = (k) => (k < stage ? 1 : k === stage ? prog : 0);
  strokeWeight(2);
  if (f(1) > 0) { stroke(45, 70, 100, 70); grow(P, A, f(1), 2.2); grow(P, B, f(1), 2.2); }
  if (f(2) > 0 && R) { stroke(140, 60, 95, 80); grow(Q, C, f(2), 1.6); }
  if (f(3) > 0 && R && S) { stroke(15, 75, 100, 80); grow(A, R, f(3), 1.5); grow(B, Q, f(3), 1.6); }
  if (f(4) > 0 && S) { stroke(300, 50, 100, 90); let D = toXY(Dh); if (D) grow(P, S, f(4), (D.y - P.y) / (S.y - P.y || 1)); else grow(P, S, f(4), 3); }
  // 点
  noStroke(); textSize(16);
  for (let [p, nm, col] of [[A, 'A', 200], [B, 'B', 200], [C, 'C', 45]]) { fill(col, 60, 100); circle(p.x, p.y, 14); fill(0, 0, 100); text(nm, p.x - 5, p.y + 26); }
  if (stage >= 1) { fill(45, 70, 100); circle(P.x, P.y, 14); fill(0, 0, 100); text('P', P.x + 10, P.y - 8); }
  if (stage >= 1 && f(1) >= 1) { fill(45, 70, 100); circle(Q.x, Q.y, 12); fill(0, 0, 100); text('Q', Q.x - 24, Q.y); }
  if (stage >= 2 && f(2) >= 1 && R) { fill(140, 60, 95); circle(R.x, R.y, 12); fill(0, 0, 100); text('R', R.x + 10, R.y); }
  if (stage >= 3 && f(3) >= 1 && S) { fill(15, 75, 100); circle(S.x, S.y, 12); fill(0, 0, 100); text('S', S.x + 10, S.y - 8); }
  if (stage >= 4 && f(4) >= 1) { stroke(300, 50, 100); strokeWeight(2); fill(300, 50, 100); drawHPoint(Dh, 16, 'D'); noStroke(); }
  if (stage >= 5) {
    // 複比の図示：A, B に対して C が内分、D が外分。同じ比
    let D = toXY(Dh);
    let py = height - 140;
    noStroke(); fill(0, 0, 100, 8); rect(20, py - 30, 470, 120, 10);
    fill(0, 0, 100); textSize(16);
    text('(A,B;C,D) = (AC/BC) ÷ (AD/BD) = ' + (isNaN(cr) ? '—' : nf(cr, 1, 4)), 40, py);
    fill(0, 0, 80); textSize(14);
    text('AC/CB = ' + nf((xc - xa) / (xb - xc || 1e-9), 1, 3) + '（内分）　AD/DB = ' + (D ? nf((D.x - xa) / (xb - D.x || 1e-9), 1, 3) : '∞（無限遠）') + '（外分）', 40, py + 28);
    text('内分比 = 外分比 → 調和列点。C が中点なら D は無限遠', 40, py + 52);
    text('P, Q をどこへ動かしても D は動かない', 40, py + 76);
  }

  let msgs = ['直線 AB 上に A, B, C。C の調和共役 D を定規だけで作図する → スペース',
              '① 直線の外に点 P、PA 上に点 Q を取る（どこでもよい）',
              '② 直線 QC と直線 PB の交点を R とする',
              '③ 直線 AR と直線 BQ の交点を S とする',
              '④ 直線 PS が AB と交わる点が D',
              '⑤ 複比 (A,B;C,D) = −1。P と Q を動かしても D は変わらない！'];
  noStroke(); fill(0, 0, 100); textSize(18);
  text('手順 ' + stage + '/5：' + msgs[stage], 20, 40);
  fill(0, 0, 65); textSize(15);
  text('スペース：次へ　A, B, C を直線上でドラッグ　P, Q をドラッグ　R：最初から　　完全四辺形 PQRS の対角点 A, B と残りの 2 辺の交点 C, D は調和', 20, 68);
}

// a から b の方向へ、長さ k 倍まで、進み f で線を伸ばす
function grow(a, b, f, k) { line(a.x, a.y, a.x + (b.x - a.x) * k * f, a.y + (b.y - a.y) * k * f); }

function mousePressed() {
  handles = [{ x: xa, y: yL }, { x: xb, y: yL }, { x: xc, y: yL }, P, Qpt()];
  dragging = nearestHandle(handles, mouseX, mouseY, 26);
  if (dragging === 3 && stage < 1) dragging = -1;
  if (dragging === 4 && stage < 1) dragging = -1;
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === ' ') { if (stage < 5) { stage++; prog = 0; } }
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. 手順 5 まで進めてから C を AB の中点へ。D はどこへ行く？（矢印 = 無限遠）
// 2. C を AB の外側に置くと D は AB の内側に来る。(A,B;C,D) = (A,B;D,C) であることを確かめよう
// 3. P と Q をいろいろ動かして D が本当に動かないことを確かめる。定規だけ（長さを測らない）で決まる点
// 4. 複比 −1 は射影で保たれる（04）。この図全体をホモグラフィ（03）で写しても D は D のまま

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
