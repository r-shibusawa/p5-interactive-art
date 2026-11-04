// ============================================
// 05 階数関数と閉包
// 平面に点を置く（格子にスナップ）。点の集合 A の「階数」r(A) は、A が張る広さ：1 点 = 1、同じ直線上 = 2、広がっている = 3
//   「閉包」cl(A) = A を足しても階数が変わらない点の全部（同じ直線上の点は A に入っていなくても閉包に入る）
//   2 つの集合 A・B で劣モジュラ性 r(A∪B) + r(A∩B) ≤ r(A) + r(B) を数字で確かめる
// クリック = A に入れる・外す / T = 編集する集合を A ⇄ B / 点をドラッグ = 動かす / ↑↓ = 点の数 / R = ランダム / C = 選択を消す
// ============================================

let pts = [];                        // {gx, gy, inA, inB}  格子座標
let nPts = 7;                        // ★ 点の数（4〜9）
let cell = 70;                       // ★ 格子の間隔（px）
let target = 'A';                    // 今クリックで編集している集合
let dragI = -1, dragMoved = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  randomPoints();
}
function cols() { return floor((width - 440) / cell); }
function rows() { return floor((height - 140) / cell); }
function toXY(p) { return { x: 40 + p.gx * cell, y: 110 + p.gy * cell }; }

function randomPoints() {
  pts = [];
  let tries = 0;
  while (pts.length < nPts && tries++ < 500) {
    let gx = floor(random(cols())), gy = floor(random(rows()));
    if (pts.some((p) => p.gx === gx && p.gy === gy)) continue;
    pts.push({ gx, gy, inA: false, inB: false });
  }
  // 最初の 3 点を同じ直線に乗せておく
  if (pts.length >= 3) { pts[0].gx = max(0, min(pts[0].gx, cols() - 4)); pts[1].gx = pts[0].gx + 1; pts[1].gy = pts[0].gy; pts[2].gx = pts[0].gx + 3; pts[2].gy = pts[0].gy; }
}

// ★ 階数：点 (gx, gy) を (gx, gy, 1) というベクトルとみなして、その階数
function rankOf(list) { return rankReal(list.map((p) => [p.gx, p.gy, 1])); }
// ★ 閉包：足しても階数が増えない点
function closureOf(list) { let r = rankOf(list); return pts.filter((p) => rankOf(list.concat([p])) === r); }

function drawSpan(list, hue) {
  let r = rankOf(list);
  if (r === 2) {   // 直線
    let a = toXY(list[0]), b = toXY(list.find((p) => p.gx !== list[0].gx || p.gy !== list[0].gy));
    let dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    stroke(hue, 70, 90, 60); strokeWeight(3);
    line(a.x - dx / L * 3000, a.y - dy / L * 3000, a.x + dx / L * 3000, a.y + dy / L * 3000);
  } else if (r === 3) {
    noStroke(); fill(hue, 60, 60, 12); rect(20, 90, width - 440, height - 110);
  }
}

function draw() {
  background(170, 25, 9);
  // 格子
  stroke(0, 0, 20); strokeWeight(1);
  for (let i = 0; i < cols(); i++) line(40 + i * cell, 110, 40 + i * cell, 110 + (rows() - 1) * cell);
  for (let j = 0; j < rows(); j++) line(40, 110 + j * cell, 40 + (cols() - 1) * cell, 110 + j * cell);

  let A = pts.filter((p) => p.inA), B = pts.filter((p) => p.inB);
  let AuB = pts.filter((p) => p.inA || p.inB), AnB = pts.filter((p) => p.inA && p.inB);
  let rA = rankOf(A), rB = rankOf(B), rU = rankOf(AuB), rI = rankOf(AnB);
  if (A.length) drawSpan(A, 130);
  if (B.length) drawSpan(B, 290);
  let clA = A.length ? closureOf(A) : [];

  // 点
  for (let i = 0; i < pts.length; i++) {
    let p = pts[i], q = toXY(p);
    let inCl = clA.includes(p) && !p.inA;
    if (inCl) { noFill(); stroke(130, 70, 90); strokeWeight(2); drawingContext.setLineDash([4, 4]); circle(q.x, q.y, 34); drawingContext.setLineDash([]); }
    if (p.inB) { noFill(); stroke(290, 70, 100); strokeWeight(4); circle(q.x, q.y, 30); }
    noStroke(); fill(p.inA ? 130 : 0, p.inA ? 75 : 0, p.inA ? 90 : 60); circle(q.x, q.y, 20);
    fill(0, 0, 100); textSize(13); textAlign(LEFT, CENTER); text('p' + (i + 1), q.x + 14, q.y - 12);
  }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('クリック：' + target + ' に入れる・外す　T：編集を A ⇄ B（今は ' + target + '）　ドラッグ：点を動かす　↑↓：点の数 ' + nPts + '　R：ランダム　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('緑の点 = A、紫の輪 = B。緑の破線の輪 = A の閉包に入る点（A の直線上にある）。緑の線・面 = A が張る空間', 20, 66);

  let px = width - 380, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 365, 380, 12);
  fill(130, 70, 100); textSize(24); text('r(A) = ' + rA + '　|A| = ' + A.length, px, py);
  fill(0, 0, 70); textSize(15);
  text(rA === 0 ? '空集合' : rA === 1 ? '1 点（同じ場所）' : rA === 2 ? '同じ直線の上' : '平面いっぱい', px, py + 24);
  fill(130, 50, 90); textSize(16);
  text('cl(A) = {' + clA.map((p) => 'p' + (pts.indexOf(p) + 1)).join(', ') + '}', px, py + 52);
  fill(0, 0, 70); textSize(14);
  text(A.length && clA.length === A.length ? 'A は閉じている（閉集合 = フラット）' : A.length ? '閉包の方が大きい：足しても階数が増えない点がある' : 'A を選んでみよう', px, py + 74);

  fill(290, 60, 100); textSize(24); text('r(B) = ' + rB + '　|B| = ' + B.length, px, py + 118);
  fill(0, 0, 100); textSize(20);
  text('r(A∪B) = ' + rU + '　r(A∩B) = ' + rI, px, py + 156);
  let lhs = rU + rI, rhs = rA + rB;
  fill(lhs <= rhs ? 130 : 5, 80, 100); textSize(22);
  text('r(A∪B) + r(A∩B) = ' + lhs + ' ≤ ' + rhs + ' = r(A) + r(B)' + (lhs <= rhs ? ' ✓' : ' ✗'), px, py + 196);
  fill(0, 0, 70); textSize(14);
  text('劣モジュラ性：「合わせた広さ」は「それぞれの広さ」の和を超えない', px, py + 220);
  text(lhs < rhs ? '今は < 。A と B が同じ直線を共有していると = に近づく' : '等号が成り立っている（モジュラ）', px, py + 242);
  fill(0, 0, 100); textSize(16);
  text('階数関数の公理', px, py + 282);
  fill(0, 0, 70); textSize(14);
  text('(R1) 0 ≤ r(A) ≤ |A|　(R2) A ⊂ B なら r(A) ≤ r(B)　(R3) 劣モジュラ', px, py + 304);
  text('独立 ⇔ r(A) = |A|。' + (A.length ? (rA === A.length ? '今の A は独立 ✓' : '今の A は従属（r < |A|）') : ''), px, py + 326);
}

function nearest(mx, my) {
  let best = -1, bd = 18;
  for (let i = 0; i < pts.length; i++) { let q = toXY(pts[i]); let d = dist(mx, my, q.x, q.y); if (d < bd) { bd = d; best = i; } }
  return best;
}
function mousePressed() { dragI = nearest(mouseX, mouseY); dragMoved = false; }
function mouseDragged() {
  if (dragI < 0) return;
  let gx = constrain(Math.round((mouseX - 40) / cell), 0, cols() - 1), gy = constrain(Math.round((mouseY - 110) / cell), 0, rows() - 1);
  let p = pts[dragI];
  if ((gx !== p.gx || gy !== p.gy) && !pts.some((q) => q !== p && q.gx === gx && q.gy === gy)) { p.gx = gx; p.gy = gy; dragMoved = true; }
}
function mouseReleased() {
  if (dragI >= 0 && !dragMoved) { let p = pts[dragI]; if (target === 'A') p.inA = !p.inA; else p.inB = !p.inB; }
  dragI = -1;
}
function keyPressed() {
  if (key === 't' || key === 'T') target = target === 'A' ? 'B' : 'A';
  if (key === 'r' || key === 'R') randomPoints();
  if (key === 'c' || key === 'C') for (let p of pts) { p.inA = false; p.inB = false; }
  if (key === UP_ARROW) { nPts = min(9, nPts + 1); randomPoints(); }
  if (key === DOWN_ARROW) { nPts = max(4, nPts - 1); randomPoints(); }
}

// ---------- やってみよう ----------
// 1. 直線上の 2 点を A にして、3 点目をドラッグでその直線に乗せる。閉包に入る瞬間（破線の輪）を見る
// 2. A = 直線上の 3 点、B = 別の直線上の 3 点で交点を共有させると r(A∪B) + r(A∩B) はいくつ？
// 3. 「閉集合（フラット）」を全部挙げる：点、直線（2 点以上が乗っているもの）、平面全体、空集合
// 4. 階数を「3 次元」に拡張すると、4 点が同じ平面に乗るかどうかが問題になる（00 の空間と同じ）

// ==================================================
// ここから下は「マトロイドの道具」（階数の計算）
// ==================================================
function rankReal(rowsIn) {
  let a = rowsIn.map((r) => r.slice());
  let m = a.length, n = m ? a[0].length : 0, rank = 0;
  for (let c = 0; c < n && rank < m; c++) {
    let p = rank;
    for (let i = rank + 1; i < m; i++) if (Math.abs(a[i][c]) > Math.abs(a[p][c])) p = i;
    if (Math.abs(a[p][c]) < 1e-6) continue;
    [a[rank], a[p]] = [a[p], a[rank]];
    for (let i = 0; i < m; i++) {
      if (i === rank) continue;
      let f = a[i][c] / a[rank][c];
      for (let j = c; j < n; j++) a[i][j] -= f * a[rank][j];
    }
    rank++;
  }
  return rank;
}
