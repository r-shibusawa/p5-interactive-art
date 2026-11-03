// ============================================
// 05 円錐曲線の射影像：円が楕円・放物線・双曲線になる
// 左の正方形の中の円を、右の四角形へのホモグラフィ H で写す。写した先は必ず円錐曲線（2 次曲線）
//   H の 3 行目 [h31, h32, h33] は「無限遠直線に写る直線」（w' = h31 x + h32 y + h33 = 0）。左に点線で描く
//   この点線と円が 交わらない → 楕円 / 接する → 放物線 / 2 点で交わる → 双曲線（2 つの交点 = 双曲線の無限遠点 = 漸近線の方向）
// 右の 4 角をドラッグ / 左の円の中心をドラッグ / ↑↓ = 半径 / T = 放物線にする（半径を点線にぴったり合わせる） / R = リセット
// ============================================

let dst = [];                     // 右の四角形の角（画面座標）
let src = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
let cc = { x: 0.5, y: 0.5 }, cr = 0.28;   // ★ 円の中心と半径（0〜1 の座標）
let dragging = -1, dragCenter = false;
let H = null;
let S0, OX, OY;                   // 左の正方形の大きさと位置

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  S0 = min(width * 0.36, height * 0.6); OX = width * 0.06; OY = height * 0.27;
  resetAll();
}
function resetAll() {
  let x0 = width * 0.5, y0 = height * 0.18, w = width * 0.42, h = height * 0.66;
  dst = [{ x: x0 + w * 0.1, y: y0 + h * 0.98 }, { x: x0 + w * 0.9, y: y0 + h * 0.98 }, { x: x0 + w * 0.58, y: y0 + h * 0.25 }, { x: x0 + w * 0.42, y: y0 + h * 0.25 }];
  cc = { x: 0.5, y: 0.5 }; cr = 0.28;
}
function srcToScreen(p) { return { x: OX + p.x * S0, y: OY + p.y * S0 }; }

function draw() {
  background(30, 35, 11);
  if (dragging >= 0) dst[dragging] = { x: mouseX, y: mouseY };
  if (dragCenter) cc = { x: constrain((mouseX - OX) / S0, 0.05, 0.95), y: constrain((mouseY - OY) / S0, 0.05, 0.95) };
  H = homographyFrom4(src, dst);
  if (!H) { fill(0, 0, 100); textSize(18); text('4 点がつぶれています（R）', 20, 40); return; }

  // 無限遠直線の元 l∞ = H の 3 行目（元の正方形の座標で）
  let linf = H[2];
  let d = Math.abs(linf[0] * cc.x + linf[1] * cc.y + linf[2]) / (Math.hypot(linf[0], linf[1]) || 1);   // 中心から l∞ までの距離
  let kind = d > cr * 1.01 ? 0 : d < cr * 0.99 ? 2 : 1;
  let kindName = ['楕円（交点 0）', '放物線（接する：交点 1）', '双曲線（交点 2）'][kind];

  // ---- 左：元の正方形
  noStroke(); fill(0, 0, 100, 6); rect(OX, OY, S0, S0);
  stroke(0, 0, 100, 25); strokeWeight(1); noFill();
  for (let k = 0; k <= 8; k++) { line(OX + (k * S0) / 8, OY, OX + (k * S0) / 8, OY + S0); line(OX, OY + (k * S0) / 8, OX + S0, OY + (k * S0) / 8); }
  stroke(200, 60, 100); strokeWeight(3); let c0 = srcToScreen(cc); circle(c0.x, c0.y, cr * S0 * 2);
  // l∞ の元（点線）：a x + b y + c = 0 を画面座標に
  let lscr = [linf[0] / S0, linf[1] / S0, linf[2] - (linf[0] * OX) / S0 - (linf[1] * OY) / S0];
  stroke(45, 90, 100); strokeWeight(2); drawingContext.setLineDash([8, 8]); drawHLine(lscr, [OX - 130, OY - 130, OX + S0 + 130, OY + S0 + 130]); drawingContext.setLineDash([]);
  // 交点（円と l∞）→ 右では無限遠点（漸近線の方向）
  let inter = circleLine(cc, cr, linf);
  noStroke(); fill(15, 80, 100);
  for (let p of inter) { let s = srcToScreen(p); circle(s.x, s.y, 12); }
  fill(45, 90, 100); circle(c0.x, c0.y, 10);
  fill(0, 0, 100); textSize(15); text('元の正方形（0〜1）　点線 = 無限遠直線に写る直線', OX, OY - 12);

  // ---- 右：写した先
  noFill(); stroke(0, 0, 100, 25); strokeWeight(1);
  for (let k = 0; k <= 8; k++) { mappedLine(k / 8, 0, k / 8, 1); mappedLine(0, k / 8, 1, k / 8); }
  stroke(0, 0, 100, 60); quad(dst[0].x, dst[0].y, dst[1].x, dst[1].y, dst[2].x, dst[2].y, dst[3].x, dst[3].y);
  // 円の像：細かく刻んで写す。w' の符号が変わる所（無限遠を通る所）で線を切る
  stroke(200, 60, 100); strokeWeight(3);
  let prev = null;
  for (let i = 0; i <= 720; i++) {
    let a = (i / 720) * Math.PI * 2, q = mat3Vec(H, hPt(cc.x + cr * Math.cos(a), cc.y + cr * Math.sin(a)));
    let p = Math.abs(q[2]) > 1e-9 ? { x: q[0] / q[2], y: q[1] / q[2], s: Math.sign(q[2]) } : null;
    if (p && prev && p.s === prev.s && Math.abs(p.x) < 1e5 && Math.abs(p.y) < 1e5 && Math.abs(prev.x) < 1e5 && Math.abs(prev.y) < 1e5) line(prev.x, prev.y, p.x, p.y);
    prev = p;
  }
  // 無限遠点の方向（矢印）
  stroke(15, 80, 100); strokeWeight(3); fill(15, 80, 100);
  for (let p of inter) drawHPoint(mat3Vec(H, hPt(p.x, p.y)), 14, '', [width * 0.46, 90, width - 10, height - 10]);
  noStroke(); fill(45, 90, 100); textSize(15);
  for (let i = 0; i < 4; i++) circle(dst[i].x, dst[i].y, 16);

  fill(0, 0, 100); textSize(18);
  text('写した先： ' + kindName + '　　中心と点線の距離 d = ' + nf(d, 1, 3) + '　半径 r = ' + nf(cr, 1, 3) + '（↑↓）　T：放物線に　R：リセット', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('右の角と左の円の中心をドラッグ。円が点線をまたぐと曲線が無限遠を通り、画面の反対側から戻ってくる（双曲線の 2 本の枝は 1 本の閉じた曲線）', 20, 68);
  fill(0, 0, 80); textSize(14);
  text('楕円・放物線・双曲線のちがいは「無限遠直線との交わり方」だけ。射影幾何では全部同じ曲線（円の像）', 20, height - 24);
}

// 元の座標の線分を写して描く
function mappedLine(x0, y0, x1, y1) {
  let prev = null;
  for (let i = 0; i <= 16; i++) {
    let q = mat3Vec(H, hPt(x0 + ((x1 - x0) * i) / 16, y0 + ((y1 - y0) * i) / 16));
    let p = q[2] > 1e-6 ? { x: q[0] / q[2], y: q[1] / q[2] } : null;
    if (p && prev) line(prev.x, prev.y, p.x, p.y);
    prev = p;
  }
}
// 円（中心 c、半径 r）と直線 [a, b, c] の交点（0〜2 個）
function circleLine(c, r, l) {
  let n = Math.hypot(l[0], l[1]) || 1, a = l[0] / n, b = l[1] / n, k = l[2] / n;
  let d = a * c.x + b * c.y + k;                 // 符号つき距離
  if (Math.abs(d) > r) return [];
  let fx = c.x - a * d, fy = c.y - b * d;        // 垂線の足
  let h = Math.sqrt(Math.max(0, r * r - d * d));
  if (h < 1e-9) return [{ x: fx, y: fy }];
  return [{ x: fx - b * h, y: fy + a * h }, { x: fx + b * h, y: fy - a * h }];
}

function mousePressed() {
  dragging = nearestHandle(dst, mouseX, mouseY, 30);
  let c0 = srcToScreen(cc);
  if (dragging < 0 && dist(mouseX, mouseY, c0.x, c0.y) < 30) dragCenter = true;
}
function mouseReleased() { dragging = -1; dragCenter = false; }
function keyPressed() {
  if (key === UP_ARROW) cr = min(0.9, cr + 0.02);
  if (key === DOWN_ARROW) cr = max(0.03, cr - 0.02);
  if (key === 't' || key === 'T') { let l = H[2]; cr = constrain(Math.abs(l[0] * cc.x + l[1] * cc.y + l[2]) / (Math.hypot(l[0], l[1]) || 1), 0.03, 0.9); }
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. 右の四角形を長方形にすると点線は正方形からどこまで離れる？（アフィンなら l∞ は無限遠のまま = 楕円しかできない）
// 2. 双曲線のとき、矢印の方向（無限遠点）が漸近線の方向。曲線が本当にその方向に伸びているか確かめよう
// 3. 放物線（T）のときの矢印は 1 つ。放物線は「無限遠直線に接する」と言える。接点の方向は軸の方向？
// 4. 円のかわりに正方形の中の別の図形（三角形）を写してみよう。角が無限遠を通るとどう見える？

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
