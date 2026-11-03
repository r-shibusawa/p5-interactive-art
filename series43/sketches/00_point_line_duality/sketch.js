// ============================================
// 00 点と直線の双対
// 左の点 (a, b) と右の直線 y = ax − b を入れ替える「双対変換」
//   点を動かすと右の直線が動く。右にマウスを置くと、その点の双対直線が左に現れる
//   3 点が一直線に並ぶ ↔ 3 本の直線が 1 点で交わる、上側の凸包 ↔ 下側の包絡線
// ドラッグ = 点を動かす / クリック = 点を追加 / C = 一直線の 3 点 / H = 凸包と包絡線 / R = リセット
// ============================================

let pts = [];               // 左の点 (a, b)（数学座標、−3〜3）
let RANGE = 3;              // ★ 表示する範囲（−RANGE 〜 RANGE）
let showHull = false;
let dragI = -1;
let tol = 0.03;             // ★ 「一直線」と判定する許しの幅

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetPts();
}

function resetPts() {
  pts = [{ a: -1.5, b: 1 }, { a: 0.5, b: -0.8 }, { a: 2, b: 1.6 }, { a: -0.6, b: -2 }];
}

// パネル：left と right の枠（画面座標）
function panels() {
  let w = (width - 60) / 2, h = height - 150, y = 100;
  return { L: { x: 20, y, w, h }, R: { x: 40 + w, y, w, h } };
}
// 数学座標 ↔ 画面座標
function toScreen(P, x, y) { return { x: P.x + (x + RANGE) / (2 * RANGE) * P.w, y: P.y + (RANGE - y) / (2 * RANGE) * P.h }; }
function toMath(P, sx, sy) { return { x: (sx - P.x) / P.w * 2 * RANGE - RANGE, y: RANGE - (sy - P.y) / P.h * 2 * RANGE }; }
function inside(P, sx, sy) { return sx >= P.x && sx <= P.x + P.w && sy >= P.y && sy <= P.y + P.h; }

// 直線 y = m x + k を枠の中に描く
function drawLine(P, m, k, hue, alphaV, w) {
  let s1 = toScreen(P, -RANGE, m * -RANGE + k), s2 = toScreen(P, RANGE, m * RANGE + k);
  let c = clipSeg(P, s1, s2);
  if (!c) return;
  stroke(hue, 70, 100, alphaV); strokeWeight(w);
  line(c[0].x, c[0].y, c[1].x, c[1].y);
}
// 線分を枠で切る（Liang–Barsky）
function clipSeg(P, s1, s2) {
  let t0 = 0, t1 = 1, dx = s2.x - s1.x, dy = s2.y - s1.y;
  for (let [p, q] of [[-dx, s1.x - P.x], [dx, P.x + P.w - s1.x], [-dy, s1.y - P.y], [dy, P.y + P.h - s1.y]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    let r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  return [{ x: s1.x + t0 * dx, y: s1.y + t0 * dy }, { x: s1.x + t1 * dx, y: s1.y + t1 * dy }];
}

function drawFrame(P, title) {
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(P.x, P.y, P.w, P.h);
  let o = toScreen(P, 0, 0);
  stroke(0, 0, 30); line(P.x, o.y, P.x + P.w, o.y); line(o.x, P.y, o.x, P.y + P.h);
  noStroke(); fill(0, 0, 70); textSize(14); text(title, P.x + 10, P.y + 22);
}

function draw() {
  background(250, 40, 10);
  let { L, R } = panels();
  drawFrame(L, '点 (a, b)');
  drawFrame(R, '直線 y = a x − b');

  // ★ 双対：点 i → 右の直線
  for (let i = 0; i < pts.length; i++) {
    let p = pts[i], hue = 10 + i * 37 % 360;
    drawLine(R, p.a, -p.b, hue, 80, i === dragI ? 4 : 2);
  }
  // 凸包 ↔ 包絡線
  if (showHull && pts.length >= 3) drawHullEnvelope(L, R);
  // 一直線の 3 点 ↔ 共点の 3 直線
  let n = pts.length, found = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let p = pts[i], q = pts[j], r = pts[k];
    let cr = (q.a - p.a) * (r.b - p.b) - (q.b - p.b) * (r.a - p.a);
    if (abs(cr) < tol * 3 && found < 3) {
      found++;
      // 左：3 点を通る直線（点線）
      let m = (q.b - p.b) / ((q.a - p.a) || 1e-9), kk = p.b - m * p.a;
      drawingContext.setLineDash([6, 6]); drawLine(L, m, kk, 50, 70, 2); drawingContext.setLineDash([]);
      // 右：3 直線の共通点 (m, −k)：y = a m − b が全ての a,b で同じ値 −k
      let s = toScreen(R, m, -kk);
      noFill(); stroke(50, 90, 100); strokeWeight(3); circle(s.x, s.y, 22);
    }
  }
  // 点を描く
  for (let i = 0; i < pts.length; i++) {
    let p = pts[i], s = toScreen(L, p.a, p.b), hue = 10 + i * 37 % 360;
    noStroke(); fill(hue, 70, 100); circle(s.x, s.y, i === dragI ? 16 : 12);
    fill(0, 0, 100); textSize(12); text('(' + nf(p.a, 1, 1) + ', ' + nf(p.b, 1, 1) + ')', s.x + 10, s.y - 8);
  }
  // マウスの双対：右の点 (x, y) → 左の直線 b = x a − y
  if (inside(R, mouseX, mouseY)) {
    let m = toMath(R, mouseX, mouseY);
    drawLine(L, m.x, -m.y, 180, 90, 2);
    noStroke(); fill(180, 70, 100); circle(mouseX, mouseY, 10);
    fill(180, 50, 100); textSize(12); text('(' + nf(m.x, 1, 1) + ', ' + nf(m.y, 1, 1) + ') → 左の直線 b = ' + nf(m.x, 1, 1) + ' a − (' + nf(m.y, 1, 1) + ')', mouseX + 12, mouseY - 8);
  } else if (inside(L, mouseX, mouseY) && dragI < 0) {
    let m = toMath(L, mouseX, mouseY);
    drawLine(R, m.x, -m.y, 180, 60, 1.5);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('点 (a, b) ↔ 直線 y = ax − b　点 ' + pts.length + ' 個　一直線の 3 点組 ' + found + '　H：凸包と包絡線 ' + (showHull ? 'ON' : 'off') + '　C：一直線の例　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('「点が直線の上にある」という関係は双対でも保たれる：(a, b) が y = mx + k 上 ⟺ (m, −k) が y = ax − b 上。だから 3 点が一直線 ⟺ 3 直線が 1 点で交わる', 20, 68);
}

// ★ 上側の凸包（左）↔ 下側の包絡線（右）、下側の凸包 ↔ 上側の包絡線
function drawHullEnvelope(L, R) {
  let sorted = pts.slice().sort((p, q) => p.a - q.a || p.b - q.b);
  let cr = (o, p, q) => (p.a - o.a) * (q.b - o.b) - (p.b - o.b) * (q.a - o.a);
  let lower = [], upper = [];
  for (let p of sorted) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let p of sorted.slice().reverse()) { while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  let chain = (c, hue) => { noFill(); stroke(hue, 80, 100, 80); strokeWeight(5); beginShape(); for (let p of c) { let s = toScreen(L, p.a, p.b); vertex(s.x, s.y); } endShape(); };
  chain(upper, 10); chain(lower, 180);
  // 包絡線：x を細かく動かして min / max を取る
  for (let [hue, pick] of [[10, Math.min], [180, Math.max]]) {
    noFill(); stroke(hue, 80, 100, 80); strokeWeight(5);
    beginShape();
    for (let x = -RANGE; x <= RANGE + 1e-9; x += 0.05) {
      let y = constrain(pick(...pts.map((p) => p.a * x - p.b)), -RANGE, RANGE);
      let s = toScreen(R, x, y); vertex(s.x, s.y);
    }
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13);
  text('コーラル：上側の凸包 ↔ 下側の包絡線　　アクア：下側の凸包 ↔ 上側の包絡線', L.x + 10, L.y + L.h - 10);
}

function mousePressed() {
  let { L } = panels();
  if (!inside(L, mouseX, mouseY)) return;
  for (let i = 0; i < pts.length; i++) {
    let s = toScreen(L, pts[i].a, pts[i].b);
    if (dist(mouseX, mouseY, s.x, s.y) < 14) { dragI = i; return; }
  }
  if (pts.length < 12) { let m = toMath(L, mouseX, mouseY); pts.push({ a: m.x, b: m.y }); dragI = pts.length - 1; }
}
function mouseDragged() {
  if (dragI < 0) return;
  let { L } = panels();
  let m = toMath(L, constrain(mouseX, L.x, L.x + L.w), constrain(mouseY, L.y, L.y + L.h));
  pts[dragI].a = m.x; pts[dragI].b = m.y;
}
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if (key === 'h' || key === 'H') showHull = !showHull;
  if (key === 'r' || key === 'R') resetPts();
  if (key === 'c' || key === 'C') pts = [{ a: -2, b: -1.5 }, { a: 0, b: -0.5 }, { a: 2, b: 0.5 }, { a: 1, b: 2 }];
}

// ---------- やってみよう ----------
// 1. C で一直線の 3 点を出し、右で 3 本の直線が 1 点で交わるのを確認。1 点だけ少し動かすと？
// 2. 右の交点 (m, −k) の m は左の直線の傾き。左の直線を立てていくと交点はどこへ行く？
// 3. H を押し、点を 1 つ上に引っ張る。左の凸包が変わるとき右の包絡線はどう変わる？
// 4. 双対変換を (a, b) → y = ax + b に変えると（符号を変える）、上下の対応はどうなる？
