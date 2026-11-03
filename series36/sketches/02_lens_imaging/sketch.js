// ============================================
// 02 薄レンズの結像
// 物体（矢印）から出た光がレンズで曲がり、像を結ぶ
//   レンズの公式： 1/a + 1/b = 1/f   （a = 物体距離、b = 像距離、f = 焦点距離）   倍率 m = −b/a
//   主光線 3 本：① 軸に平行 → 焦点 F' を通る　② 中心を通る → 直進　③ 焦点 F を通る → 軸に平行
// 矢印の先をドラッグ = 物体の位置と高さ / ↑↓ = 焦点距離 f / C = 凸 ⇄ 凹 / R = リセット
// ============================================

let f = 150;                       // ★ 焦点距離（px）正 = 凸レンズ、負 = 凹レンズ
let obj = { x: -380, h: 110 };     // 物体：レンズからの距離（左が負）と高さ
let dragging = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(225, 35, 10);
  let cx = width * 0.5, axis = height * 0.55;
  let a = -obj.x, h = obj.h;
  // ★ レンズの公式で像の位置を求める（a = f のときは無限遠 → 大きな値に抑える）
  let inv = 1 / f - 1 / a;
  let b = Math.abs(inv) < 1e-6 ? (inv >= 0 ? 1 : -1) * 1e6 : 1 / inv;
  let m = -b / a;                           // 倍率
  let hi = h * m;                            // 像の高さ（負 = 倒立）
  let virtual = b < 0;

  // 光軸・レンズ・焦点
  stroke(0, 0, 100, 40); strokeWeight(1); line(0, axis, width, axis);
  drawLens(cx, axis, f > 0);
  for (let s of [-1, 1]) {
    let fx = cx + s * f;
    noStroke(); fill(0, 0, 100); circle(fx, axis, 7);
    textSize(14); text(s * (f > 0 ? 1 : -1) < 0 ? 'F' : "F'", fx - 5, axis + 22);
    fill(0, 0, 60); circle(cx + s * 2 * f, axis, 5);
  }

  // 主光線 3 本（物体の先端から）
  let ox = cx + obj.x, oy = axis - h;
  let rays = [];
  // ① 平行 → F' を通る（凹なら F から出たように広がる）
  rays.push({ hit: { x: cx, y: oy }, dir: { x: Math.abs(f), y: Math.sign(f) * (axis - oy) }, hue: 45 });
  // ② 中心を通る
  rays.push({ hit: { x: cx, y: axis }, dir: { x: cx - ox, y: axis - oy }, hue: 170 });
  // ③ F を通ってレンズへ → 平行
  let fx = cx - f;
  let dyF = (axis - oy) / (fx - ox);
  rays.push({ hit: { x: cx, y: oy + dyF * (cx - ox) }, dir: { x: 1, y: 0 }, hue: 320 });
  strokeWeight(2);
  for (let r of rays) {
    let L = Math.hypot(r.dir.x, r.dir.y); let dx = r.dir.x / L, dy = r.dir.y / L;
    stroke(r.hue, 70, 100, 85);
    line(ox, oy, r.hit.x, r.hit.y);                                   // レンズまで
    line(r.hit.x, r.hit.y, r.hit.x + dx * 3000, r.hit.y + dy * 3000);  // レンズの後
    if (virtual) { stroke(r.hue, 70, 100, 40); drawDashed(r.hit.x, r.hit.y, r.hit.x - dx * 3000, r.hit.y - dy * 3000); }
  }

  // 物体と像
  drawArrow(ox, axis, oy, 45, 100);
  let ix = cx + b;
  if (Math.abs(b) < 1e5) drawArrow(ix, axis, axis - hi, virtual ? 320 : 170, virtual ? 55 : 100);
  // スクリーン（実像ならここに映る）
  if (!virtual && Math.abs(b) < 1e5) { stroke(0, 0, 100, 30); strokeWeight(6); line(ix, axis - 260, ix, axis + 260); }

  // HUD
  noStroke(); fill(0, 0, 100); textSize(18);
  text((f > 0 ? '凸レンズ' : '凹レンズ') + '　f = ' + f + ' px（↑↓）　C：凸⇄凹　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('矢印の先（黄）をドラッグして物体を動かそう。黄 = 平行光線、水色 = 中心光線、ピンク = 焦点を通る光線。点線は「そこから来たように見える」延長', 20, 68);

  let px = width - 470, py = 110;
  fill(0, 0, 100, 8); rect(px - 16, py - 30, 455, 175, 10);
  fill(0, 0, 100); textSize(16);
  text('1/a + 1/b = 1/f', px, py);
  fill(45, 90, 100);
  text('a = ' + nf(a, 1, 0) + '　b = ' + (Math.abs(b) < 1e5 ? nf(b, 1, 0) : '∞') + '　→ 1/' + nf(a, 1, 0) + ' + 1/' + (Math.abs(b) < 1e5 ? nf(b, 1, 0) : '∞') + ' = 1/' + f, px, py + 30);
  text('倍率 m = −b/a = ' + nf(m, 1, 2), px, py + 56);
  fill(0, 0, 100);
  let kind = Math.abs(b) >= 1e5 ? '像は無限遠（平行光になる）' : (virtual ? '虚像' : '実像') + '　' + (hi < 0 ? '倒立' : '正立') + '　' + (Math.abs(m) > 1 ? '拡大' : '縮小');
  text(kind, px, py + 88);
  fill(0, 0, 70); textSize(14);
  text(virtual ? 'レンズをのぞくと物体と同じ側に大きく見える（虫めがね）' : 'スクリーンを置くと像が映る（カメラ・プロジェクター）', px, py + 116);
}

function drawLens(cx, cy, convex) {
  noStroke(); fill(190, 40, 100, 25);
  if (convex) ellipse(cx, cy, 36, 540);
  else { beginShape(); vertex(cx - 18, cy - 270); vertex(cx + 18, cy - 270); vertex(cx + 5, cy); vertex(cx + 18, cy + 270); vertex(cx - 18, cy + 270); vertex(cx - 5, cy); endShape(CLOSE); }
  stroke(190, 40, 100, 80); strokeWeight(2); line(cx, cy - 270, cx, cy + 270);
}
function drawArrow(x, y0, y1, hue, bri) {
  stroke(hue, 70, bri); strokeWeight(4); line(x, y0, x, y1);
  let s = y1 < y0 ? -1 : 1;
  noStroke(); fill(hue, 70, bri);
  triangle(x, y1, x - 9, y1 - s * 16, x + 9, y1 - s * 16);
}
function drawDashed(x1, y1, x2, y2) {
  let d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(d / 14));
  for (let i = 0; i < n; i += 2) line(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, x1 + (x2 - x1) * (i + 1) / n, y1 + (y2 - y1) * (i + 1) / n);
}

function mousePressed() {
  let cx = width * 0.5, axis = height * 0.55;
  dragging = Math.hypot(mouseX - (cx + obj.x), mouseY - (axis - obj.h)) < 40 || mouseX < cx - 20;
}
function mouseDragged() {
  if (!dragging) return;
  let cx = width * 0.5, axis = height * 0.55;
  obj.x = Math.min(-15, mouseX - cx);
  obj.h = constrain(axis - mouseY, -260, 260);
  if (Math.abs(obj.h) < 10) obj.h = 10;
}
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === UP_ARROW) f += f > 0 ? 10 : -10;
  if (key === DOWN_ARROW) { if (Math.abs(f) > 40) f -= f > 0 ? 10 : -10; }
  if (key === 'c' || key === 'C') f = -f;
  if (key === 'r' || key === 'R') { f = 150; obj = { x: -380, h: 110 }; }
}

// ---------- やってみよう ----------
// 1. 物体を遠くから F に近づける：像はどう動く？ a = f でちょうど無限遠、さらに近づくと虚像になる
// 2. a = 2f のとき b = ? 倍率は？（等倍の位置 → コピー機の原理）
// 3. 凹レンズ（C）はいつも「正立・縮小・虚像」。物体をどこに置いても確かめよう
// 4. 主光線 3 本はどれか 2 本あれば像の位置が決まる。1 本消しても同じ場所で交わるか確かめよう
