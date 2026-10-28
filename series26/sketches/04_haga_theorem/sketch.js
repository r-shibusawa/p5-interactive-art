// ============================================
// 04 芳賀の定理（オリガミクス）
// 上の辺の点 P に左下の角を重ねて折ると、折り返された下の辺が右の辺を切る点 Q ができる
//   上の辺の左から x の所に P を取ると、右上の角から Q までは 2x / (1 + x)。x = 1/2 なら 2/3（3 等分！）
// ドラッグ／←→ = P を動かす / 1〜5 = x = 1/2, 1/3, 1/4, 1/5, 2/3 / F = 折る・広げる / T = 3 つの三角形
// ============================================

let x = 0.5;               // ★ P の位置（上の辺の左から。一辺 = 1）
let folded = true;
let showTri = true;
let phi = Math.PI;            // 折りのアニメーション
let dragging = false;
let px0, py0, PS;
const PRESETS = [[1 / 2, '1/2'], [1 / 3, '1/3'], [1 / 4, '1/4'], [1 / 5, '1/5'], [2 / 3, '2/3']];

function setup() {
  createCanvas(windowWidth, windowHeight);
  PS = min(width * 0.48, height - 180);
  px0 = 70; py0 = 120;
}
function sx(u) { return px0 + u * PS; }
function sy(v) { return py0 + PS - v * PS; }

// ★ 折り線と、折った後の点を計算する（紙の座標：左下が原点、y は上向き）
function haga(x) {
  let K = { x: 0, y: 0 }, P = { x, y: 1 };
  let cr = bisector(K, P);                     // 角 K を P に重ねる折り線 = 垂直二等分線
  let B2 = refl({ x: 1, y: 0 }, cr);           // 右下の角の行き先
  // 折り返された下の辺（P → B2）が右の辺 x = 1 と交わる点 Q
  let t = (1 - P.x) / (B2.x - P.x);
  let Q = { x: 1, y: P.y + (B2.y - P.y) * t };
  let E = atX(cr, 0), G = atX(cr, 1);          // 折り線が左の辺・右の辺と交わる点
  return { cr, P, Q, B2, E, G };
}

function draw() {
  background(34, 32, 40);
  if (dragging) x = constrain((mouseX - px0) / PS, 0.02, 0.98);
  phi += ((folded ? PI : 0) - phi) * 0.1;
  let g = haga(x);
  let DQ = 1 - g.Q.y;

  noStroke(); fill(246, 240, 226); rect(px0, py0, PS, PS);
  // 折り線
  let seg = clipSquare(g.cr);
  if (seg) { stroke(255, 190, 40); strokeWeight(2); line(sx(seg[0].x), sy(seg[0].y), sx(seg[1].x), sy(seg[1].y)); }
  // 折り返す部分（左下の角の側）
  let side = sdist({ x: 0, y: 0 }, g.cr) > 0 ? 1 : -1;
  let flap = clipHalf([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], g.cr, side);
  let k = 1 - cos(phi);
  fill(phi > HALF_PI ? color(226, 84, 72, 235) : color(255, 250, 235, 235));
  stroke(80, 40, 40); strokeWeight(1);
  beginShape();
  for (let p of flap) { let s = sdist(p, g.cr); vertex(sx(p.x + g.cr.u.y * s * k), sy(p.y - g.cr.u.x * s * k)); }
  endShape(CLOSE);

  // 3 つの直角三角形（折った後）
  if (showTri && phi > 3) {
    noStroke();
    fill(60, 110, 220, 70); triangle(sx(g.P.x), sy(1), sx(1), sy(1), sx(1), sy(g.Q.y));            // 右上
    fill(40, 160, 110, 70); triangle(sx(0), sy(1), sx(g.P.x), sy(1), sx(0), sy(g.E.y));             // 左上
    if (g.G.y > 0) { fill(255, 190, 40, 70); triangle(sx(1), sy(g.Q.y), sx(g.B2.x), sy(g.B2.y), sx(1), sy(g.G.y)); }  // 右下
  }
  // Q の目盛り
  strokeWeight(8);
  stroke(60, 110, 220); line(sx(1) + 14, sy(1), sx(1) + 14, sy(g.Q.y));
  stroke(140); line(sx(1) + 14, sy(g.Q.y), sx(1) + 14, sy(0));
  noStroke(); fill(40);
  circle(sx(g.P.x), sy(1), 12); circle(sx(1), sy(g.Q.y), 12);
  fill(255); textSize(16);
  text('P', sx(g.P.x) - 4, sy(1) - 14); text('Q', sx(1) + 26, sy(g.Q.y) + 5);
  text('x = ' + nf(x, 1, 3), sx(x / 2) - 30, sy(1) - 14);
  fill(110, 160, 255); text(nf(DQ, 1, 3), sx(1) + 26, sy((1 + g.Q.y) / 2));

  // 説明と表
  let tx = px0 + PS + 90;
  fill(255); textSize(18);
  text('ドラッグ／←→：P を動かす　1〜5：x を選ぶ　F：' + (folded ? '広げる' : '折る') + '　T：三角形 ' + (showTri ? 'ON' : 'off'), 20, 40);
  fill(170); textSize(15);
  text('芳賀和夫さんが見つけた「折り紙の数学（オリガミクス）」。1 回折るだけで、辺を好きな比に分けられる', 20, 68);
  fill(255, 190, 40); textSize(24); text('右上の角 → Q ＝ 2x / (1 + x)', tx, py0 + 10);
  fill(255); textSize(18);
  text('測った値 ' + nf(DQ, 1, 5) + '　　式 ' + nf(2 * x / (1 + x), 1, 5), tx, py0 + 44);
  let rows = [['x', '右上 → Q', '分数']];
  let fr = ['2/3', '1/2', '2/5', '1/3', '4/5'];
  PRESETS.forEach((p, i) => rows.push([p[1], nf(2 * p[0] / (1 + p[0]), 1, 4), fr[i]]));
  let y = py0 + 100;
  rows.forEach((r, i) => {
    let on = i > 0 && Math.abs(PRESETS[i - 1][0] - x) < 0.002;
    fill(on ? color(255, 190, 40) : i === 0 ? 200 : 150); textSize(i === 0 ? 15 : 18);
    text((i > 0 ? i + '　' : '　 ') + r[0], tx, y); text(r[1], tx + 120, y); text(r[2], tx + 260, y);
    y += 32;
  });
  fill(190); textSize(15);
  text('x = 1/(2n − 1) に取ると 2x/(1 + x) = 1/n。\nどんな n 等分も 1 回折りでつくれる', tx, y + 10);
  let P1 = 1 - x, P2 = DQ, P3 = Math.hypot(P1, P2);
  fill(110, 160, 255); textSize(17);
  text('右上の青い三角形：' + nf(P1, 1, 3) + ' : ' + nf(P2, 1, 3) + ' : ' + nf(P3, 1, 3), tx, y + 80);
  if (Math.abs(x - 0.5) < 0.002) { fill(255, 190, 40); text('= 3 : 4 : 5 の直角三角形！（×6 すると 3, 4, 5）', tx, y + 108); }
  fill(150); textSize(14);
  text('3 つの三角形（青・緑・黄）はすべて相似。辺の比から 2x/(1+x) が導ける', tx, y + 140, width - tx - 20);
}

function mousePressed() { if (abs(mouseY - py0) < 40 && mouseX > px0 - 20 && mouseX < px0 + PS + 20) dragging = true; }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === LEFT_ARROW) x = max(0.02, x - 0.01);
  if (key === RIGHT_ARROW) x = min(0.98, x + 0.01);
  if (key >= '1' && key <= '5') x = PRESETS[int(key) - 1][0];
  if (key === 'f' || key === 'F') folded = !folded;
  if (key === 't' || key === 'T') showTri = !showTri;
}

// ---------- やってみよう ----------
// 1. x = 1/2 で 2/3、そこから 1/3 も手に入る。x をいくつにすれば 1/4、1/5 がつくれる？ 表で確かめよう
// 2. 青・緑・黄の三角形が相似であることを使って、DQ = 2x/(1+x) を自分で導いてみよう
// 3. 折り線が左の辺と交わる高さは (1 + x²)/2。緑の三角形の辺の長さを x で表してみよう
// 4. 本物の紙で x = 1/2 を折って、右の辺の 2/3 の点ができるか確かめよう（芳賀の第 1 定理）


// ==================================================
// ここから下は「折り紙の幾何の道具」（紙の座標：一辺 1）
// ==================================================
function atX(L, xv) { let t = (xv - L.p.x) / L.u.x; return { x: xv, y: L.p.y + L.u.y * t }; }
function nrm(x, y) { let l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
function bisector(a, b) { return { p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, u: nrm(-(b.y - a.y), b.x - a.x) }; }
function sdist(q, L) { return (q.x - L.p.x) * -L.u.y + (q.y - L.p.y) * L.u.x; }
function refl(q, L) { let s = sdist(q, L); return { x: q.x + 2 * s * L.u.y, y: q.y - 2 * s * L.u.x }; }
function clipHalf(pts, L, side) {
  let out = [];
  for (let i = 0; i < pts.length; i++) {
    let p = pts[i], q = pts[(i + 1) % pts.length], s1 = sdist(p, L) * side, s2 = sdist(q, L) * side;
    if (s1 >= 0) out.push(p);
    if (s1 * s2 < 0) { let t = s1 / (s1 - s2); out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
  }
  return out;
}
function clipSquare(L) {
  let sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], r = [];
  for (let i = 0; i < 4; i++) {
    let p = sq[i], q = sq[(i + 1) % 4], s1 = sdist(p, L), s2 = sdist(q, L);
    if (s1 * s2 <= 0 && s1 !== s2) { let t = s1 / (s1 - s2); r.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
  }
  return r.length >= 2 ? r : null;
}
