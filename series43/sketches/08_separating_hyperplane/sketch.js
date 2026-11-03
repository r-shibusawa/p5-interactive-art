// ============================================
// 08 分離超平面とファルカスの補題
// 交わらない 2 つの凸集合には、必ず間を通る直線（分離超平面）がある
//   作り方：いちばん近い 2 点を結び、その垂直二等分線を引く。交わっていると分離できない
//   ファルカス（F）：ベクトル b が a1, a2 の「錐」に入る か、錐と b を分ける直線がある か、どちらか一方だけ
// 頂点ドラッグ / 図形の中をドラッグ = 平行移動 / F = ファルカスのモード / R = リセット
// ============================================

let setA = [], setB = [];
let farkas = false;
let drag = null;                   // { set, i } または { set, i: -1（全体）}
let a1 = { x: 160, y: -40 }, a2 = { x: 60, y: 150 }, bv = { x: 180, y: 120 };   // ファルカス用（原点からのベクトル、px）
let dragV = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetSets();
}
function resetSets() {
  let cx = width / 2, cy = height / 2 + 30;
  setA = [{ x: cx - 330, y: cy - 120 }, { x: cx - 160, y: cy - 170 }, { x: cx - 110, y: cy + 10 }, { x: cx - 260, y: cy + 90 }];
  setB = [{ x: cx + 80, y: cy - 90 }, { x: cx + 300, y: cy - 60 }, { x: cx + 330, y: cy + 130 }, { x: cx + 120, y: cy + 150 }];
}
function hull(ps) {
  let s = ps.slice().sort((p, q) => p.x - q.x || p.y - q.y); if (s.length < 3) return s;
  let cr = (o, p, q) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  let lo = [], up = [];
  for (let p of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let p of s.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function inPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    let a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
// 点 p と線分 ab の最近点
function closestOnSeg(p, a, b) {
  let dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-9;
  let t = constrain(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return { x: a.x + dx * t, y: a.y + dy * t };
}
// ★ 2 つの凸多角形の最近点対（頂点 vs 辺 を両方向で総当たり）
function closestPair(P, Q) {
  let best = { d: Infinity };
  let check = (p, q) => { let d = dist(p.x, p.y, q.x, q.y); if (d < best.d) best = { d, p, q }; };
  for (let p of P) for (let i = 0; i < Q.length; i++) check(p, closestOnSeg(p, Q[i], Q[(i + 1) % Q.length]));
  for (let q of Q) for (let i = 0; i < P.length; i++) { let c = closestOnSeg(q, P[i], P[(i + 1) % P.length]); check(c, q); }
  return best;
}
function segsCross(a, b, c, d) {
  let cr = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return cr(a, b, c) * cr(a, b, d) < 0 && cr(c, d, a) * cr(c, d, b) < 0;
}
function intersects(P, Q) {
  if (P.some((p) => inPoly(p, Q)) || Q.some((q) => inPoly(q, P))) return true;
  for (let i = 0; i < P.length; i++) for (let j = 0; j < Q.length; j++) if (segsCross(P[i], P[(i + 1) % P.length], Q[j], Q[(j + 1) % Q.length])) return true;
  return false;
}
function drawPoly(poly, hue) {
  stroke(hue, 70, 100); strokeWeight(3); fill(hue, 70, 100, 20);
  beginShape(); for (let p of poly) vertex(p.x, p.y); endShape(CLOSE);
  noStroke(); fill(hue, 70, 100); for (let p of poly) circle(p.x, p.y, 10);
}

function draw() {
  background(250, 40, 10);
  if (farkas) { drawFarkas(); return; }
  drawPoly(setA, 10); drawPoly(setB, 180);
  let hit = intersects(setA, setB);
  if (!hit) {
    let cp = closestPair(setA, setB);
    stroke(55, 90, 100); strokeWeight(2); line(cp.p.x, cp.p.y, cp.q.x, cp.q.y);
    noStroke(); fill(55, 90, 100); circle(cp.p.x, cp.p.y, 10); circle(cp.q.x, cp.q.y, 10);
    // 垂直二等分線 = 分離直線
    let mx = (cp.p.x + cp.q.x) / 2, my = (cp.p.y + cp.q.y) / 2, nx = cp.q.x - cp.p.x, ny = cp.q.y - cp.p.y, L = Math.hypot(nx, ny) || 1;
    let tx = -ny / L * 2000, ty = nx / L * 2000;
    stroke(0, 0, 100); strokeWeight(2); line(mx - tx, my - ty, mx + tx, my + ty);
    // 半平面を薄く塗る（A 側）
    noStroke(); fill(10, 70, 100, 6); beginShape(); vertex(mx - tx, my - ty); vertex(mx + tx, my + ty); vertex(mx + tx - nx / L * 2000, my + ty - ny / L * 2000); vertex(mx - tx - nx / L * 2000, my - ty - ny / L * 2000); endShape(CLOSE);
    fill(0, 0, 100); textSize(14); text('最近点対の距離 ' + nf(cp.d, 1, 1) + ' px', mx + 14, my - 14);
    fill(0, 0, 100); textSize(18); text('✓ 交わらない → 分離直線がある（最近点対の垂直二等分線）　F：ファルカスの補題　R：リセット', 20, 40);
  } else {
    fill(0, 80, 100); textSize(18); noStroke(); text('✗ 交わっている → どんな直線も両方を分けられない　F：ファルカスの補題　R：リセット', 20, 40);
  }
  fill(0, 0, 60); textSize(15); noStroke();
  text('凸だからこそ「最近点対の中点を通る直線」で分かれる。片方が凹だと失敗する。この定理が LP 双対・SVM・ファルカスの補題の土台', 20, 68);
}

// ★ ファルカスの補題（2D）：b ∈ cone(a1, a2) か、y·a1 ≥ 0, y·a2 ≥ 0, y·b < 0 の y があるか、ちょうど一方
function drawFarkas() {
  let o = { x: width / 2, y: height / 2 + 40 };
  // 錐を塗る
  noStroke(); fill(10, 70, 100, 15);
  let e1 = { x: a1.x * 20, y: a1.y * 20 }, e2 = { x: a2.x * 20, y: a2.y * 20 };
  beginShape(); vertex(o.x, o.y); vertex(o.x + e1.x, o.y + e1.y); vertex(o.x + e2.x, o.y + e2.y); endShape(CLOSE);
  stroke(0, 0, 30); strokeWeight(1); line(0, o.y, width, o.y); line(o.x, 0, o.x, height);
  let arrow = (v, hue, name) => {
    stroke(hue, 80, 100); strokeWeight(4); line(o.x, o.y, o.x + v.x, o.y + v.y);
    noStroke(); fill(hue, 80, 100); circle(o.x + v.x, o.y + v.y, 14);
    fill(0, 0, 100); textSize(16); text(name, o.x + v.x + 10, o.y + v.y - 10);
  };
  arrow(a1, 10, 'a1'); arrow(a2, 10, 'a2'); arrow(bv, 180, 'b');
  // b = λ1 a1 + λ2 a2 を解く
  let det = a1.x * a2.y - a1.y * a2.x;
  let l1 = (bv.x * a2.y - bv.y * a2.x) / (det || 1e-9), l2 = (a1.x * bv.y - a1.y * bv.x) / (det || 1e-9);
  let inCone = Math.abs(det) > 1e-6 && l1 >= 0 && l2 >= 0;
  if (inCone) {
    // 分解を平行四辺形で描く
    stroke(55, 90, 100, 70); strokeWeight(2); drawingContext.setLineDash([6, 6]);
    line(o.x + a1.x * l1, o.y + a1.y * l1, o.x + bv.x, o.y + bv.y); line(o.x + a2.x * l2, o.y + a2.y * l2, o.x + bv.x, o.y + bv.y);
    drawingContext.setLineDash([]);
    noStroke(); fill(0, 0, 100); textSize(18);
    text('(1) b = ' + nf(l1, 1, 2) + ' a1 + ' + nf(l2, 1, 2) + ' a2（係数 ≥ 0）→ b は錐の中。分ける直線はない', 20, 40);
  } else {
    // y の候補：a1, a2 に直交するベクトル（錐の縁の法線）のうち条件を満たすもの
    let cands = [{ x: -a1.y, y: a1.x }, { x: a1.y, y: -a1.x }, { x: -a2.y, y: a2.x }, { x: a2.y, y: -a2.x }];
    let y = cands.find((v) => v.x * a1.x + v.y * a1.y >= -1e-6 && v.x * a2.x + v.y * a2.y >= -1e-6 && v.x * bv.x + v.y * bv.y < 0);
    if (y) {
      let L = Math.hypot(y.x, y.y) || 1, tx = -y.y / L * 2000, ty = y.x / L * 2000;
      stroke(0, 0, 100); strokeWeight(2); line(o.x - tx, o.y - ty, o.x + tx, o.y + ty);
      stroke(55, 90, 100); strokeWeight(3); line(o.x, o.y, o.x + y.x / L * 120, o.y + y.y / L * 120);
      noStroke(); fill(55, 90, 100); circle(o.x + y.x / L * 120, o.y + y.y / L * 120, 12);
      fill(0, 0, 100); textSize(16); text('y', o.x + y.x / L * 120 + 10, o.y + y.y / L * 120 - 8);
      textSize(18); text('(2) y·a1 ≥ 0, y·a2 ≥ 0 なのに y·b < 0 となる y がある（白い直線が錐と b を分ける）→ b は錐の外', 20, 40);
    } else { noStroke(); fill(0, 0, 100); textSize(18); text('退化（a1 と a2 が平行）', 20, 40); }
  }
  noStroke(); fill(0, 0, 60); textSize(15);
  text('矢印の先をドラッグ。「解がある（b = Aλ, λ ≥ 0）」と「解がないことの証明書 y」はちょうど一方だけ。これが LP 双対の正体（実行不能の証明 = 双対の非有界方向）　F：戻る', 20, 68);
}

function mousePressed() {
  if (farkas) {
    let o = { x: width / 2, y: height / 2 + 40 };
    for (let v of [a1, a2, bv]) if (dist(mouseX, mouseY, o.x + v.x, o.y + v.y) < 16) dragV = v;
    return;
  }
  for (let sset of [setA, setB]) {
    for (let i = 0; i < sset.length; i++) if (dist(mouseX, mouseY, sset[i].x, sset[i].y) < 14) { drag = { set: sset, i }; return; }
  }
  for (let sset of [setA, setB]) if (inPoly({ x: mouseX, y: mouseY }, sset)) { drag = { set: sset, i: -1 }; return; }
}
function mouseDragged() {
  if (farkas) { if (dragV) { dragV.x = constrain(mouseX - width / 2, -600, 600); dragV.y = constrain(mouseY - height / 2 - 40, -360, 360); } return; }
  if (!drag) return;
  if (drag.i >= 0) {
    let moved = drag.set[drag.i]; moved.x = constrain(mouseX, 10, width - 10); moved.y = constrain(mouseY, 90, height - 10);
    let h = hull(drag.set); if (h.length === drag.set.length) { drag.set.length = 0; for (let p of h) drag.set.push(p); drag.i = drag.set.indexOf(moved); }
  } else for (let p of drag.set) { p.x += movedX; p.y += movedY; }
}
function mouseReleased() { drag = null; dragV = null; }
function keyPressed() {
  if (key === 'f' || key === 'F') farkas = !farkas;
  if (key === 'r' || key === 'R') { resetSets(); a1 = { x: 160, y: -40 }; a2 = { x: 60, y: 150 }; bv = { x: 180, y: 120 }; }
}

// ---------- やってみよう ----------
// 1. 2 つの図形をぎりぎりまで近づける。分離直線は最後まで存在する？ 触れた瞬間は？
// 2. 片方を凹の形にしたくなるが、頂点は凸包に直される。凹だと分離できない例を頭の中で描こう
// 3. F で b を錐の縁ぎりぎりに置く。λ の片方が 0 になるとき y はどうなる？（相補性）
// 4. a3 を増やして 3 本の錐にする。y の候補はどう探せばいい？（錐の各縁の法線）
