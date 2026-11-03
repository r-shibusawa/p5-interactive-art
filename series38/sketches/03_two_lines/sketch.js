// ============================================
// 03 2 本のトロピカル直線は 1 点で交わる
// 一般の位置にある 2 本のトロピカル直線はちょうど 1 点で交わる（ふつうの直線と同じ）
//   重なってしまう（半直線が共有される）ときは「安定交点」：少しずらした交点の極限。
//   安定交点はトロピカル・クラメルの公式で一発で求まる：
//   X = (b1⊗c2) ⊕ (b2⊗c1),  Y = (a1⊗c2) ⊕ (a2⊗c1),  Z = (a1⊗b2) ⊕ (a2⊗b1)  → 交点 (X − Z, Y − Z)
// 2 つの頂点をドラッグ / ←→ = 摂動の大きさ ε / G = 頂点を格子にスナップ / R = リセット
// ============================================

let L1 = { a: 0, b: 0, c: 0 };       // ★ 直線 1 の係数 min(a + x, b + y, c)
let L2 = { a: -3, b: -1, c: 0 };     // ★ 直線 2
let eps = 0.6;                       // ★ 摂動の大きさ（←→）
let snap = false;
let sc = 70, ox, oy, dragging = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.45; oy = height * 0.55;
}
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }
function vert(L) { return { x: L.c - L.a, y: L.c - L.b }; }

// ★ トロピカル・クラメルの公式（min 流儀）→ 安定交点
function cramer(P, Q) {
  let X = Math.min(P.b + Q.c, Q.b + P.c);
  let Y = Math.min(P.a + Q.c, Q.a + P.c);
  let Z = Math.min(P.a + Q.b, Q.a + P.b);
  return { x: X - Z, y: Y - Z };
}
// 点が直線 L の上にあるか（最小が 2 回とられる）
function onLine(L, p) {
  let v = [L.a + p.x, L.b + p.y, L.c].sort((u, w) => u - w);
  return v[1] - v[0] < 1e-6;
}
// 2 本が半直線を共有しているか（頂点が同じ x, 同じ y, または同じ対角線上）
function overlapInfo() {
  let v1 = vert(L1), v2 = vert(L2);
  if (Math.abs(v1.x - v2.x) < 1e-6) return '同じ x の上にある → 縦の半直線が重なる';
  if (Math.abs(v1.y - v2.y) < 1e-6) return '同じ y の上にある → 横の半直線が重なる';
  if (Math.abs((v1.x - v1.y) - (v2.x - v2.y)) < 1e-6) return '同じ対角線の上にある → 斜めの半直線が重なる';
  return null;
}

function drawLine(L, hue, wgt) {
  let v = vert(L);
  for (let d of [[1, 0], [0, 1], [-1, -1]]) {
    stroke(hue, 70, 100, 90); strokeWeight(wgt);
    line(toX(v.x), toY(v.y), toX(v.x + d[0] * 100), toY(v.y + d[1] * 100));
  }
  noStroke(); fill(hue, 70, 100); circle(toX(v.x), toY(v.y), 18);
}

function draw() {
  background(190, 55, 10);
  stroke(0, 0, 100, 25); strokeWeight(1);
  for (let g = -12; g <= 12; g++) { line(toX(g), 0, toX(g), height); line(0, toY(g), width, toY(g)); }
  stroke(0, 0, 100, 50); line(toX(0), 0, toX(0), height); line(0, toY(0), width, toY(0));

  let ov = overlapInfo();
  // 重なっているときは、重なった部分を黄色で強調
  if (ov) {
    let v1 = vert(L1), v2 = vert(L2);
    stroke(55, 90, 100, 60); strokeWeight(14);
    // 共有される半直線：2 つの頂点を結ぶ線分 + その先
    let dx = Math.sign(v2.x - v1.x), dy = Math.sign(v2.y - v1.y);
    let d = Math.abs(v1.x - v2.x) < 1e-6 ? [0, 1] : Math.abs(v1.y - v2.y) < 1e-6 ? [1, 0] : [-1, -1];
    let far = (d[0] * dx + d[1] * dy >= 0) ? v2 : v1;   // 方向 d で遠いほう
    line(toX(far.x), toY(far.y), toX(far.x + d[0] * 100), toY(far.y + d[1] * 100));
    line(toX(v1.x), toY(v1.y), toX(v2.x), toY(v2.y));
  }
  drawLine(L1, 35, 4);
  drawLine(L2, 330, 4);

  // 摂動した直線 2（点線）と、その交点
  let P2 = { a: L2.a - eps, b: L2.b - 2 * eps, c: L2.c };
  let vp = vert(P2);
  for (let d of [[1, 0], [0, 1], [-1, -1]]) {
    stroke(330, 40, 100, 50); strokeWeight(1.5);
    for (let s = 0; s < 30; s += 0.5) line(toX(vp.x + d[0] * s), toY(vp.y + d[1] * s), toX(vp.x + d[0] * (s + 0.25)), toY(vp.y + d[1] * (s + 0.25)));
  }
  let pPert = cramer(L1, P2);
  noFill(); stroke(55, 90, 100); strokeWeight(2); circle(toX(pPert.x), toY(pPert.y), 22);

  // 安定交点（クラメル）
  let p = cramer(L1, L2);
  noStroke(); fill(90, 80, 100); circle(toX(p.x), toY(p.y), 20);
  fill(0, 0, 10); textSize(12); text('交点', toX(p.x) - 11, toY(p.y) + 4);

  // テキスト
  noStroke(); fill(0, 0, 100); textSize(18);
  text('頂点をドラッグ　←→：摂動 ε = ' + nf(eps, 1, 2) + '　G：格子にスナップ ' + (snap ? 'ON' : 'off') + '　R：リセット', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('直線 1 (a,b,c) = (' + nf(L1.a, 1, 1) + ', ' + nf(L1.b, 1, 1) + ', ' + nf(L1.c, 1, 1) + ')　直線 2 = (' + nf(L2.a, 1, 1) + ', ' + nf(L2.b, 1, 1) + ', ' + nf(L2.c, 1, 1) + ')', 20, 62);

  let px = width - 470, py = 100;
  fill(0, 0, 100, 8); rect(px - 16, py - 30, 455, 250, 10);
  fill(0, 0, 100); textSize(16);
  text('トロピカル・クラメルの公式', px, py);
  fill(90, 70, 100); textSize(15);
  text('X = min(b1 + c2, b2 + c1) = ' + nf(Math.min(L1.b + L2.c, L2.b + L1.c), 1, 2), px, py + 30);
  text('Y = min(a1 + c2, a2 + c1) = ' + nf(Math.min(L1.a + L2.c, L2.a + L1.c), 1, 2), px, py + 52);
  text('Z = min(a1 + b2, a2 + b1) = ' + nf(Math.min(L1.a + L2.b, L2.a + L1.b), 1, 2), px, py + 74);
  fill(0, 0, 100);
  text('安定交点 = (X − Z, Y − Z) = (' + nf(p.x, 1, 2) + ', ' + nf(p.y, 1, 2) + ')', px, py + 104);
  text('直線 1 の上？ ' + (onLine(L1, p) ? '○' : '×') + '　直線 2 の上？ ' + (onLine(L2, p) ? '○' : '×'), px, py + 128);
  fill(ov ? 55 : 0, ov ? 90 : 0, ov ? 100 : 65); textSize(14);
  text(ov ? '重なっている：' + ov : '一般の位置：交点はちょうど 1 つ', px, py + 158);
  fill(0, 0, 65);
  text('黄色の輪 = 直線 2 を (ε, 2ε) だけずらしたときの交点。', px, py + 182);
  text('ε → 0 で緑の安定交点に近づく（ずらし方によらない）', px, py + 202);
}

function mousePressed() {
  dragging = null;
  for (let L of [L1, L2]) { let v = vert(L); if (dist(mouseX, mouseY, toX(v.x), toY(v.y)) < 24) dragging = L; }
}
function mouseDragged() {
  if (!dragging) return;
  let x = (mouseX - ox) / sc, y = (oy - mouseY) / sc;
  if (snap) { x = Math.round(x); y = Math.round(y); }
  dragging.a = constrain(dragging.c - x, -10, 10);
  dragging.b = constrain(dragging.c - y, -10, 10);
}
function mouseReleased() { dragging = null; }
function keyPressed() {
  if (key === LEFT_ARROW) eps = Math.max(0.05, eps - 0.1);
  if (key === RIGHT_ARROW) eps = Math.min(2, eps + 0.1);
  if (key === 'g' || key === 'G') snap = !snap;
  if (key === 'r' || key === 'R') { L1 = { a: 0, b: 0, c: 0 }; L2 = { a: -3, b: -1, c: 0 }; }
}

// ---------- やってみよう ----------
// 1. 頂点を動かして、交点が「必ず 1 つ」になることを確かめよう。交点が頂点に来るのはどんなとき？
// 2. G でスナップして 2 つの頂点を同じ x に置く（半直線が重なる）。安定交点はどこ？ ε を変えても同じ？
// 3. 直線 2 のずらし方を (ε, 2ε) でなく (2ε, ε) に変えても極限が同じか試そう
// 4. 2 点を通るトロピカル直線もクラメルで求まる（係数 = 2 点の座標の 2×2 トロピカル行列式）。書いてみよう
