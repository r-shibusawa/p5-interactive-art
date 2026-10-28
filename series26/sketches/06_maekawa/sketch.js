// ============================================
// 06 平坦折りの条件：前川の定理
// 紙の 1 点（頂点）に集まる折り目が、ぺたんと平らにたためるなら「山の数 − 谷の数 = ±2」
//   だから折り目の本数はかならず偶数。条件を満たさない折り目は、どうやっても平らにならない
// クリック = 折り目を追加（既存の折り目なら 山 ⇄ 谷）/ D = マウスに近い折り目を消す / Shift = 角度を自由に / 1〜4 = 例 / R = ランダム / C = 全部消す
// ============================================

let creases = [];        // { a: 角度（ラジアン）, mv: 'M' か 'V' }
let snapDeg = 15;        // ★ 角度の吸いつき（度）
let cx, cy, half;

function setup() {
  createCanvas(windowWidth, windowHeight);
  layout();
  preset(1);
}
function layout() { half = min(width * 0.28, (height - 150) / 2); cx = width * 0.36; cy = 110 + half; }

function preset(k) {
  let d = (deg) => deg * PI / 180;
  if (k === 1) creases = [{ a: d(0), mv: 'M' }, { a: d(90), mv: 'M' }, { a: d(180), mv: 'M' }, { a: d(270), mv: 'V' }];   // 半分に 2 回
  if (k === 2) creases = [0, 45, 135, 180, 225, 315].map((g) => ({ a: d(g), mv: g % 90 === 0 ? 'M' : 'V' }));           // 風船の基本形
  if (k === 3) creases = [0, 90, 180, 270].map((g, i) => ({ a: d(g), mv: i % 2 ? 'M' : 'V' }));                           // 山 2・谷 2（たためない）
  if (k === 4) creases = [0, 60, 120, 180, 240, 300].map((g, i) => ({ a: d(g), mv: i === 0 || i === 3 ? 'V' : 'M' }));   // 6 本（山 4・谷 2）
}

function counts() {
  let M = creases.filter((c) => c.mv === 'M').length;
  return { M, V: creases.length - M };
}

function draw() {
  background(34, 32, 40);
  noStroke(); fill(246, 240, 226); rect(cx - half, cy - half, half * 2, half * 2);
  let sorted = creases.slice().sort((p, q) => p.a - q.a);

  // 区切られた角（セクター）を色分け
  for (let i = 0; i < sorted.length; i++) {
    let a0 = sorted[i].a, a1 = i + 1 < sorted.length ? sorted[i + 1].a : sorted[0].a + TWO_PI;
    fill(i % 2 ? color(240, 220, 200) : color(225, 232, 240));
    arc(cx, cy, half * 0.9, half * 0.9, a0, a1, PIE);
    let am = (a0 + a1) / 2;
    fill(80); textSize(14); textAlign(CENTER, CENTER);
    text(nf(degrees(a1 - a0), 1, 0) + '°', cx + cos(am) * half * 0.3, cy + sin(am) * half * 0.3);
    textAlign(LEFT, BASELINE);
  }
  // 折り目
  strokeWeight(3);
  for (let c of creases) {
    let e = rayToSquare(c.a);
    if (c.mv === 'M') { stroke(220, 70, 50); drawingContext.setLineDash([16, 6, 3, 6]); }
    else { stroke(50, 110, 230); drawingContext.setLineDash([9, 7]); }
    line(cx, cy, e.x, e.y);
  }
  drawingContext.setLineDash([]);
  // マウスの位置に入る折り目の予告
  let ma = mouseAngle();
  if (dist(mouseX, mouseY, cx, cy) > 30 && insideSquare(mouseX, mouseY)) {
    let near = nearest(ma);
    stroke(near && near.d < radians(5) ? color(255, 190, 40, 200) : color(0, 0, 0, 60)); strokeWeight(near && near.d < radians(5) ? 7 : 2);
    let e = rayToSquare(near && near.d < radians(5) ? near.c.a : ma);
    line(cx, cy, e.x, e.y);
  }
  noStroke(); fill(30); circle(cx, cy, 12);

  // 判定パネル
  let { M, V } = counts(), n = creases.length;
  let ok = Math.abs(M - V) === 2;
  let tx = cx + half + 50, y = 140;
  fill(255); textSize(18);
  text('クリック：折り目を追加／山⇄谷　D：近い折り目を消す　Shift：自由な角度　1〜4：例　R：ランダム　C：消す', 20, 40);
  fill(170); textSize(15);
  text('赤の一点鎖線 = 山折り（M）、青の破線 = 谷折り（V）。紙のおもてから見た向き', 20, 68);
  textSize(30);
  fill(230, 90, 70); text('山 M = ' + M, tx, y);
  fill(90, 150, 255); text('谷 V = ' + V, tx, y + 44);
  fill(255); text('M − V = ' + (M - V), tx, y + 96);
  textSize(18); fill(200); text('折り目の本数 ' + n + '（' + (n % 2 === 0 ? '偶数' : '奇数 → 絶対たためない') + '）', tx, y + 136);
  fill(ok ? color(80, 220, 140) : color(255, 110, 90)); rect(tx, y + 160, 380, 56, 10);
  fill(20); textSize(22);
  text(ok ? '前川の条件 OK（M − V = ±2）' : '前川の条件 NG', tx + 16, y + 196);
  fill(190); textSize(15);
  text('なぜ ±2？ 平らにたたんだ頂点のまわりを 1 周すると、\n谷折りで +180°、山折りで −180° 向きが変わる。\n1 周でちょうど ±360° 回るから\n180°×V − 180°×M = ±360° → V − M = ±2', tx, y + 250);
  fill(255, 190, 40);
  text('注意：前川の条件は「必要条件」。満たしても\n角度が悪いとたためない（07 川崎の定理）', tx, y + 360);
}

function mouseAngle() { let a = atan2(mouseY - cy, mouseX - cx); return a < 0 ? a + TWO_PI : a; }
function nearest(a) {
  let best = null;
  for (let c of creases) { let d = abs(atan2(sin(c.a - a), cos(c.a - a))); if (!best || d < best.d) best = { c, d }; }
  return best;
}
function insideSquare(x, y) { return abs(x - cx) <= half && abs(y - cy) <= half; }
function rayToSquare(a) { let dx = cos(a), dy = sin(a), t = half / max(abs(dx), abs(dy)); return { x: cx + dx * t, y: cy + dy * t }; }

function mousePressed() {
  if (!insideSquare(mouseX, mouseY) || dist(mouseX, mouseY, cx, cy) < 30) return;
  let a = mouseAngle();
  let near = nearest(a);
  if (near && near.d < radians(5)) { near.c.mv = near.c.mv === 'M' ? 'V' : 'M'; return; }
  if (!keyIsDown(SHIFT)) a = radians(round(degrees(a) / snapDeg) * snapDeg) % TWO_PI;
  if (creases.length < 16) creases.push({ a, mv: 'M' });
}
function keyPressed() {
  if (key >= '1' && key <= '4') preset(int(key));
  if (key === 'c' || key === 'C') creases = [];
  if (key === 'd' || key === 'D') { let near = nearest(mouseAngle()); if (near) creases.splice(creases.indexOf(near.c), 1); }
  if (key === 'r' || key === 'R') {
    let n = 2 * floor(random(2, 5));
    creases = [];
    for (let i = 0; i < n; i++) creases.push({ a: random(TWO_PI), mv: random() < 0.5 ? 'M' : 'V' });
  }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }

// ---------- やってみよう ----------
// 1. 1 の例（半分に 2 回折る）の山と谷を 1 本だけ反転すると？ 本物の紙でも確かめよう
// 2. 本数を奇数にすると M − V = ±2 は絶対に成り立たない。なぜ？
// 3. R でランダムな折り目をつくり、クリックで山谷を変えて OK にしよう。それで本当にたためるかは 07 で
// 4. 1 点に 8 本の折り目（風車・鶴の基本形の中心）を描いて、山と谷を決めてみよう
