// ============================================
// 01 多角形の極双対
// 凸多角形 K の各「辺」の直線 ⟨n, x⟩ = d を、単位円に関する極で「頂点」n/d に写す
//   K° = { y : ⟨x, y⟩ ≤ 1 for all x ∈ K }　頂点の数 ↔ 辺の数 が入れ替わり、(K°)° = K
//   原点が K の内側にないと d ≤ 0 の辺が出て、双対は「壊れる」（有界でなくなる）
// 頂点ドラッグ / 原点（白）ドラッグ / クリック = 頂点を追加 / D = 双対の双対を重ねる / 1〜3 = 形 / R = リセット
// ============================================

let verts = [];                 // K の頂点（原点を中心とした数学座標、単位円の半径 = 1）
let origin = { x: 0, y: 0 };    // 極の中心（これを動かすと「壊れる」のが見える）
let UNIT = 110;                    // ★ 単位円の半径（px）
let showDD = false;
let dragI = -1, dragO = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function preset(k) {
  verts = [];
  let n = [0, 3, 4, 6][k], rr = [0, 1.9, 1.6, 1.5][k];
  for (let i = 0; i < n; i++) verts.push({ x: rr * Math.cos(i * 2 * Math.PI / n + 0.3), y: rr * Math.sin(i * 2 * Math.PI / n + 0.3) });
  origin = { x: 0, y: 0 };
}

function panels() {
  let w = (width - 60) / 2, h = height - 150, y = 100;
  return { L: { x: 20, y, w, h, cx: 20 + w / 2, cy: y + h / 2 }, Rp: { x: 40 + w, y, w, h, cx: 40 + w * 1.5, cy: y + h / 2 } };
}
function toScreen(P, p) { return { x: P.cx + p.x * UNIT, y: P.cy - p.y * UNIT }; }
function toMath(P, sx, sy) { return { x: (sx - P.cx) / UNIT, y: (P.cy - sy) / UNIT }; }

// ★ 極双対：辺 (v_i, v_{i+1}) の直線 ⟨n, x − o⟩ = d → 双対の頂点 o + n / d
function polarDual(poly, o) {
  let out = [], broken = false;
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], b = poly[(i + 1) % poly.length];
    let ex = b.x - a.x, ey = b.y - a.y, len = Math.hypot(ex, ey) || 1e-9;
    let nx = ey / len, ny = -ex / len;                 // 外向き法線（頂点は反時計回り）
    let d = nx * (a.x - o.x) + ny * (a.y - o.y);        // 原点から辺までの符号つき距離
    if (d <= 0.02) broken = true;
    d = Math.abs(d) < 0.02 ? (d < 0 ? -0.02 : 0.02) : d;
    out.push({ x: o.x + nx / d, y: o.y + ny / d });
  }
  return { poly: out, broken };
}

// 凸包（反時計回り）
function hull(ps) {
  let s = ps.slice().sort((p, q) => p.x - q.x || p.y - q.y);
  if (s.length < 3) return s;
  let cr = (o, p, q) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  let lo = [], up = [];
  for (let p of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let p of s.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function drawPoly(P, poly, hue, fillA, w, hiEdge) {
  for (let i = 0; i < poly.length; i++) {
    let a = toScreen(P, poly[i]), b = toScreen(P, poly[(i + 1) % poly.length]);
    stroke(hue, 70, 100, i === hiEdge ? 100 : 80); strokeWeight(i === hiEdge ? 7 : w);
    line(a.x, a.y, b.x, b.y);
  }
  if (fillA > 0) { noStroke(); fill(hue, 70, 100, fillA); beginShape(); for (let p of poly) { let s = toScreen(P, p); vertex(s.x, s.y); } endShape(CLOSE); }
}
function drawFrame(P, title) {
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(P.x, P.y, P.w, P.h);
  stroke(0, 0, 45); strokeWeight(1); drawingContext.setLineDash([4, 6]);
  let o = toScreen(P, origin); circle(o.x, o.y, 2 * UNIT);
  drawingContext.setLineDash([]);
  noStroke(); fill(0, 0, 70); textSize(14); text(title, P.x + 10, P.y + 22);
}

function draw() {
  background(250, 40, 10);
  let { L, Rp } = panels();
  drawFrame(L, 'K（コーラル）と単位円');
  drawFrame(Rp, 'K°（アクア）：K の辺 → K° の頂点、K の頂点 → K° の辺');
  let D = polarDual(verts, origin);
  let DD = polarDual(D.poly, origin);

  // マウスに近い頂点（左）/ 近い双対頂点（右）
  let hiV = -1, hiE = -1;
  for (let i = 0; i < verts.length; i++) { let s = toScreen(L, verts[i]); if (dist(mouseX, mouseY, s.x, s.y) < 16) hiV = i; }
  for (let i = 0; i < D.poly.length; i++) { let s = toScreen(Rp, D.poly[i]); if (dist(mouseX, mouseY, s.x, s.y) < 16) hiE = i; }
  if (dragI >= 0) hiV = dragI;

  // 左：K。頂点 i に対応する K° の辺は (w_{i-1}, w_i)
  drawPoly(L, verts, 10, 18, 3, hiE);
  for (let i = 0; i < verts.length; i++) {
    let s = toScreen(L, verts[i]);
    noStroke(); fill(10, 70, 100); circle(s.x, s.y, i === hiV ? 16 : 11);
  }
  // 右：K°。頂点 i に対応する K の辺 i を太く、K の頂点 hiV に対応する K° の辺 (hiV−1, hiV) を太く
  let n = verts.length;
  drawPoly(Rp, D.poly, 180, 18, 3, hiV >= 0 ? (hiV - 1 + n) % n : -1);
  for (let i = 0; i < D.poly.length; i++) {
    let s = toScreen(Rp, D.poly[i]);
    noStroke(); fill(180, 70, 100); circle(s.x, s.y, i === hiE ? 16 : 11);
  }
  // 選んだ頂点 ↔ 辺：左の頂点 hiV の極線を右に、右の頂点 hiE の極線を左に（点線）
  if (hiV >= 0) polarLine(Rp, verts[hiV], 10);
  if (hiE >= 0) polarLine(L, D.poly[hiE], 180);
  // 双対の双対
  if (showDD) { drawingContext.setLineDash([8, 6]); drawPoly(L, DD.poly, 60, 0, 3, -1); drawingContext.setLineDash([]); }
  // 原点
  let o = toScreen(L, origin), o2 = toScreen(Rp, origin);
  stroke(0, 0, 100); strokeWeight(2); noFill(); circle(o.x, o.y, 14); circle(o2.x, o2.y, 8);
  line(o.x - 10, o.y, o.x + 10, o.y); line(o.x, o.y - 10, o.x, o.y + 10);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('K：頂点 ' + n + '・辺 ' + n + '　→　K°：頂点 ' + n + '・辺 ' + n + '　' + (D.broken ? '⚠ 原点が K の外（または辺の上）：双対が壊れる' : '✓ 原点は K の内側') + '　D：(K°)° ' + (showDD ? 'ON（黄の点線 = K に重なる）' : 'off') + '　1〜3：形　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('頂点をドラッグ／白い原点をドラッグ。K が原点に近づくと（d が小さい）K° は遠くへ広がる。頂点にマウスを置くと相手の辺が光る：頂点 ↔ 辺 の入れ替え', 20, 68);
}

// 点 p の極線 ⟨p − o, x − o⟩ = 1 を描く
function polarLine(P, p, hue) {
  let vx = p.x - origin.x, vy = p.y - origin.y, d2 = vx * vx + vy * vy;
  if (d2 < 1e-6) return;
  let fx = origin.x + vx / d2, fy = origin.y + vy / d2;        // 足
  let tx = -vy / Math.sqrt(d2), ty = vx / Math.sqrt(d2);
  let c = clipSeg(P, toScreen(P, { x: fx + tx * 6, y: fy + ty * 6 }), toScreen(P, { x: fx - tx * 6, y: fy - ty * 6 }));
  if (!c) return;
  stroke(hue, 60, 100, 60); strokeWeight(2); drawingContext.setLineDash([6, 6]); line(c[0].x, c[0].y, c[1].x, c[1].y); drawingContext.setLineDash([]);
}

function mousePressed() {
  let { L } = panels();
  let o = toScreen(L, origin);
  if (dist(mouseX, mouseY, o.x, o.y) < 14) { dragO = true; return; }
  for (let i = 0; i < verts.length; i++) {
    let s = toScreen(L, verts[i]);
    if (dist(mouseX, mouseY, s.x, s.y) < 14) { dragI = i; return; }
  }
  if (mouseX >= L.x && mouseX <= L.x + L.w && mouseY >= L.y && mouseY <= L.y + L.h && verts.length < 12) {
    verts.push(toMath(L, mouseX, mouseY)); verts = hull(verts);
  }
}
function mouseDragged() {
  let { L } = panels();
  let m = toMath(L, constrain(mouseX, L.x, L.x + L.w), constrain(mouseY, L.y, L.y + L.h));
  if (dragO) origin = m;
  else if (dragI >= 0) {
    let moved = verts[dragI]; moved.x = m.x; moved.y = m.y;
    let h = hull(verts); if (h.length === verts.length) { verts = h; dragI = verts.indexOf(moved); }
  }
}
function mouseReleased() { dragI = -1; dragO = false; }
function keyPressed() {
  if (key === 'd' || key === 'D') showDD = !showDD;
  if (key === 'r' || key === 'R') preset(1);
  if (key >= '1' && key <= '3') preset(int(key));
}

// ---------- やってみよう ----------
// 1. 正方形（2）の双対はひし形（正方形を 45° 回したもの）。正三角形の双対は？ 正六角形は？
// 2. 頂点を単位円の上に置くと、双対の辺はその頂点に接する。中に入れると双対は外へ、外に出すと内へ
// 3. 原点を K の辺の近くへ持っていく。d → 0 のとき双対の頂点はどこへ飛ぶ？
// 4. D を押して (K°)° = K を確認。壊れたとき（原点が外）はどうなる？

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
