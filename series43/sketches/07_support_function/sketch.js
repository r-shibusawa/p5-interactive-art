// ============================================
// 07 支持関数と極集合
// 凸体 K の支持関数  h(θ) = max{ ⟨x, u_θ⟩ : x ∈ K }（方向 u_θ に K がどこまで届くか）
//   支持直線 ⟨x, u_θ⟩ = h(θ) は K にぴったり接する。h を全方向で知れば K は復元できる
//   極集合 K° = { y : ⟨x, y⟩ ≤ 1 for all x ∈ K }：方向 θ での K° の半径は 1 / h(θ)
// マウス = 方向 θ / 頂点ドラッグ / クリック = 頂点追加 / 1〜3 = 形 / R = リセット
// ============================================

let verts = [];
let UNIT = 90;               // ★ 単位円の半径（px）
let dragI = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}
function preset(k) {
  verts = [];
  if (k === 1) verts = [{ x: 1.6, y: 0.3 }, { x: 0.4, y: 1.5 }, { x: -1.3, y: 0.9 }, { x: -1.1, y: -1.2 }, { x: 0.9, y: -1.4 }];
  if (k === 2) for (let i = 0; i < 4; i++) verts.push({ x: 1.4 * Math.cos(i * Math.PI / 2 + Math.PI / 4), y: 1.4 * Math.sin(i * Math.PI / 2 + Math.PI / 4) });
  if (k === 3) for (let i = 0; i < 3; i++) verts.push({ x: 1.7 * Math.cos(i * 2 * Math.PI / 3), y: 1.7 * Math.sin(i * 2 * Math.PI / 3) });
}
function panels() {
  let w = (width - 80) / 3, h = height - 150, y = 100;
  return [0, 1, 2].map((i) => ({ x: 20 + i * (w + 20), y, w, h, cx: 20 + i * (w + 20) + w / 2, cy: y + h / 2 }));
}
function toS(P, p) { return { x: P.cx + p.x * UNIT, y: P.cy - p.y * UNIT }; }
function toM(P, sx, sy) { return { x: (sx - P.cx) / UNIT, y: (P.cy - sy) / UNIT }; }

// ★ 支持関数：方向 u に対して max ⟨v, u⟩ とその頂点
function support(th) {
  let u = { x: Math.cos(th), y: Math.sin(th) }, best = -Infinity, bi = 0;
  for (let i = 0; i < verts.length; i++) { let v = verts[i].x * u.x + verts[i].y * u.y; if (v > best) { best = v; bi = i; } }
  return { h: best, i: bi, u };
}
// 極集合：箱を半平面 ⟨v_i, y⟩ ≤ 1 で切る
function polarSet() {
  let poly = [{ x: -4, y: -4 }, { x: 4, y: -4 }, { x: 4, y: 4 }, { x: -4, y: 4 }];
  for (let v of verts) poly = clipHalf(poly, v.x, v.y, 1);
  return poly;
}
function hull(ps) {
  let s = ps.slice().sort((p, q) => p.x - q.x || p.y - q.y); if (s.length < 3) return s;
  let cr = (o, p, q) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  let lo = [], up = [];
  for (let p of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let p of s.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function drawFrame(P, title) {
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(P.x, P.y, P.w, P.h);
  stroke(0, 0, 30); line(P.x, P.cy, P.x + P.w, P.cy); line(P.cx, P.y, P.cx, P.y + P.h);
  stroke(0, 0, 45); drawingContext.setLineDash([4, 6]); circle(P.cx, P.cy, 2 * UNIT); drawingContext.setLineDash([]);
  noStroke(); fill(0, 0, 70); textSize(14); text(title, P.x + 10, P.y + 22);
}
function drawPoly(P, poly, hue, fa, w) {
  if (poly.length < 2) return;
  stroke(hue, 70, 100, 85); strokeWeight(w); fill(hue, 70, 100, fa);
  beginShape(); for (let p of poly) { let s = toS(P, p); vertex(s.x, s.y); } endShape(CLOSE);
}

function draw() {
  background(250, 40, 10);
  let [A, B, C] = panels();
  let th = Math.atan2(-(mouseY - A.cy), mouseX - A.cx);
  if (mouseX > B.x) th = Math.atan2(-(mouseY - (mouseX > C.x ? C.cy : B.cy)), mouseX - (mouseX > C.x ? C.cx : B.cx));
  let sp = support(th);
  let originInside = verts.length >= 3 && [...Array(72)].every((_, k) => support(k * Math.PI / 36).h > 0.05);

  // 左：K と支持直線
  drawFrame(A, 'K と支持直線 ⟨x, u⟩ = h(θ)');
  drawPoly(A, verts, 10, 18, 3);
  for (let i = 0; i < verts.length; i++) { let s = toS(A, verts[i]); noStroke(); fill(10, 70, 100); circle(s.x, s.y, i === sp.i ? 14 : 10); }
  let o = { x: A.cx, y: A.cy };
  // 方向 u と距離 h の矢印
  stroke(180, 70, 100); strokeWeight(3); line(o.x, o.y, o.x + sp.u.x * sp.h * UNIT, o.y - sp.u.y * sp.h * UNIT);
  // 支持直線
  let fx = sp.u.x * sp.h, fy = sp.u.y * sp.h, tx = -sp.u.y, ty = sp.u.x;
  let lc = clipSeg(A, toS(A, { x: fx + tx * 5, y: fy + ty * 5 }), toS(A, { x: fx - tx * 5, y: fy - ty * 5 }));
  if (lc) { stroke(55, 90, 100); strokeWeight(2); line(lc[0].x, lc[0].y, lc[1].x, lc[1].y); }
  noStroke(); fill(0, 0, 100); textSize(13); text('h(θ) = ' + nf(sp.h, 1, 2) + '　θ = ' + nf(degrees(th), 1, 0) + '°', A.x + 10, A.y + A.h - 12);

  // 中：h(θ) の極座標プロット（全方向を計算して描く）
  drawFrame(B, '支持関数 h(θ) の極座標プロット（r = h）');
  noFill(); stroke(55, 80, 100); strokeWeight(2.5); beginShape();
  for (let k = 0; k <= 180; k++) { let t = k * Math.PI / 90, hh = support(t).h; vertex(B.cx + Math.cos(t) * hh * UNIT, B.cy - Math.sin(t) * hh * UNIT); }
  endShape();
  // 1/h（= K° の半径）も薄く
  if (originInside) {
    stroke(180, 70, 100, 50); strokeWeight(1.5); beginShape();
    for (let k = 0; k <= 180; k++) { let t = k * Math.PI / 90, hh = support(t).h; vertex(B.cx + Math.cos(t) / hh * UNIT, B.cy - Math.sin(t) / hh * UNIT); }
    endShape();
  }
  stroke(180, 70, 100); strokeWeight(3); line(B.cx, B.cy, B.cx + Math.cos(th) * sp.h * UNIT, B.cy - Math.sin(th) * sp.h * UNIT);
  noStroke(); fill(55, 90, 100); circle(B.cx + Math.cos(th) * sp.h * UNIT, B.cy - Math.sin(th) * sp.h * UNIT, 10);
  fill(0, 0, 70); textSize(13); text('黄：h(θ)　薄いアクア：1/h(θ)（K° の輪郭）', B.x + 10, B.y + B.h - 12);

  // 右：極集合 K°
  drawFrame(C, 'K° = { y : ⟨x, y⟩ ≤ 1 ∀x ∈ K }');
  let pol = polarSet();
  drawPoly(C, pol, 180, 18, 3);
  // 頂点 v_i ↔ K° の辺（極線）
  for (let i = 0; i < verts.length; i++) {
    let v = verts[i], d2 = v.x * v.x + v.y * v.y; if (d2 < 1e-6) continue;
    let px = v.x / d2, py = v.y / d2, ux = -v.y / Math.sqrt(d2), uy = v.x / Math.sqrt(d2);
    let cc = clipSeg(C, toS(C, { x: px + ux * 5, y: py + uy * 5 }), toS(C, { x: px - ux * 5, y: py - uy * 5 })); if (!cc) continue;
    stroke(10, 60, 100, i === sp.i ? 90 : 25); strokeWeight(i === sp.i ? 3 : 1); line(cc[0].x, cc[0].y, cc[1].x, cc[1].y);
  }
  if (originInside) {
    let r = 1 / sp.h, q = toS(C, { x: Math.cos(th) * r, y: Math.sin(th) * r });
    stroke(180, 70, 100); strokeWeight(3); line(C.cx, C.cy, q.x, q.y);
    noStroke(); fill(55, 90, 100); circle(q.x, q.y, 10);
    fill(0, 0, 100); textSize(13); text('方向 θ の半径 = 1/h(θ) = ' + nf(r, 1, 2), C.x + 10, C.y + C.h - 12);
  } else { noStroke(); fill(0, 80, 100); textSize(13); text('⚠ 原点が K の外：K° は有界でない', C.x + 10, C.y + C.h - 12); }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('頂点 ' + verts.length + '　マウス = 方向 θ　' + (originInside ? '✓ 原点は K の内側' : '⚠ 原点を K の内側に') + '　1〜3：形　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('K の「頂点」が K° の「辺」（赤い極線）になり、K の辺が K° の頂点になる。h_K(θ) が大きい方向ほど K° は薄い：1/h。方向 θ を回して黄色い点の対応を見よう', 20, 68);
}

function mousePressed() {
  let A = panels()[0];
  for (let i = 0; i < verts.length; i++) { let s = toS(A, verts[i]); if (dist(mouseX, mouseY, s.x, s.y) < 14) { dragI = i; return; } }
  if (mouseX > A.x && mouseX < A.x + A.w && mouseY > A.y && mouseY < A.y + A.h && verts.length < 12) { verts.push(toM(A, mouseX, mouseY)); verts = hull(verts); }
}
function mouseDragged() {
  if (dragI < 0) return;
  let A = panels()[0], m = toM(A, constrain(mouseX, A.x, A.x + A.w), constrain(mouseY, A.y, A.y + A.h));
  let moved = verts[dragI]; moved.x = m.x; moved.y = m.y;
  let h = hull(verts); if (h.length === verts.length) { verts = h; dragI = verts.indexOf(moved); }
}
function mouseReleased() { dragI = -1; }
function keyPressed() {
  if (key >= '1' && key <= '3') preset(int(key));
  if (key === 'r' || key === 'R') preset(1);
}

// ---------- やってみよう ----------
// 1. 正方形（2）の h(θ) は何の形？ 円（頂点をたくさん置く）なら h は定数
// 2. 頂点を 1 つ遠くへ引っ張る。h の極座標プロットのどの方向がふくらみ、K° はどの方向にへこむ？
// 3. K が単位円の中にすっぽり入ると K° は単位円より大きい。K = 単位円なら K° = 単位円
// 4. h(θ) は「凸」な関数（h(u+v) ≤ h(u)+h(v)）。2 つの凸体の h を足すとミンコフスキー和の h になる


// ==================================================
// ここから下は「道具」（半平面の切り取り・線分の切り取り）
// ==================================================
function clipHalf(poly, nx, ny, cv) {
  let out = [];
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], bb = poly[(i + 1) % poly.length];
    let fa = nx * a.x + ny * a.y - cv, fb = nx * bb.x + ny * bb.y - cv;
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { let t = fa / (fa - fb); out.push({ x: a.x + (bb.x - a.x) * t, y: a.y + (bb.y - a.y) * t }); }
  }
  return out;
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
