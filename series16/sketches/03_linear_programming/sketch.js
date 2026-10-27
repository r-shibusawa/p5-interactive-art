// ============================================
// 03 線形計画法：制約の中でいちばん得をする点
// 「aᵢ₁x₁ + aᵢ₂x₂ ≤ bᵢ」という直線の不等式をいくつか満たす点（実行可能領域・凸多角形）の中で、
// 目的関数 c₁x₁ + c₂x₂ を最大にする点を探す。答えは必ず多角形の「角」にある
// ドラッグ：直線の白い丸（制約を動かす）・矢印の先（目的の向き） / F：マウスに近い制約の向きを反転
// N：制約を 1 本追加 / D：マウスに近い制約を消す / 1：お手本 2：パン屋 3：非有界 4：実行不能
// ============================================

let range = 10;   // ★ 画面に表示する範囲（0〜range）
let sweepSpeed = 0.01; // ★ 等高線が動く速さ

let cons = [], cobj = { x: 1, y: 1 };
let drag = null, sweep = 0;
let poly = [], best = null, status = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textWrap(CHAR); // 日本語を文字単位で折り返す
  preset(1);
}

function preset(k) {
  if (k === 1) { cons = [[3, -1, 9], [1, 1, 7], [-1, 2, 8]]; cobj = { x: 2, y: 1 }; } // 最適は角 (4, 3)、z = 11
  if (k === 2) { cons = [[2, 1, 10], [1, 2, 8], [0, 1, 3.5]]; cobj = { x: 3, y: 2 }; }
  if (k === 3) { cons = [[-1, 1, 2], [1, -2, 2]]; cobj = { x: 1, y: 1 }; }
  if (k === 4) { cons = [[1, 1, 2], [-1, -1, -5]]; cobj = { x: 1, y: 1 }; }
  cons = cons.map(([a1, a2, b]) => ({ a1, a2, b }));
  solve();
}

// 大きな箱を半平面で切り取って実行可能領域を作り、角を全部調べる
function solve() {
  let W = 60;
  poly = [[0, 0], [W, 0], [W, W], [0, W]];
  for (let c of cons) poly = clipHalf(poly, c.a1, c.a2, c.b);
  best = null; status = '';
  if (poly.length < 3) { status = 'infeasible'; return; }
  for (let p of poly) { let z = cobj.x * p[0] + cobj.y * p[1]; if (!best || z > best.z + 1e-9) best = { x: p[0], y: p[1], z }; }
  if (best.x > W - 1e-6 || best.y > W - 1e-6) status = 'unbounded'; else status = 'optimal';
}
function clipHalf(P, a1, a2, b) {
  let out = [];
  for (let i = 0; i < P.length; i++) {
    let p = P[i], q = P[(i + 1) % P.length];
    let fp = a1 * p[0] + a2 * p[1] - b, fq = a1 * q[0] + a2 * q[1] - b;
    if (fp <= 1e-9) out.push(p);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) { let t = fp / (fp - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}

function R() { let s = min(width * 0.55, height - 140); return { x: 40, y: 110, s }; }
function toS(p) { let r = R(); return [r.x + (p[0] / range) * r.s, r.y + r.s - (p[1] / range) * r.s]; }
function toW(x, y) { let r = R(); return [((x - r.x) / r.s) * range, ((r.y + r.s - y) / r.s) * range]; }

// 制約の直線が画面に入る部分の 1/4 と 3/4 の点（ドラッグ用の丸）
function handles(c) {
  let pts = [];
  let L = [[0, 0, 1, 0], [0, range, 1, 0], [0, 0, 0, 1], [range, 0, 0, 1]];
  for (let [px, py, dx, dy] of L) {
    let den = c.a1 * dx + c.a2 * dy; if (abs(den) < 1e-9) continue;
    let t = (c.b - c.a1 * px - c.a2 * py) / den;
    let q = [px + dx * t, py + dy * t];
    if (q[0] >= -1e-6 && q[0] <= range + 1e-6 && q[1] >= -1e-6 && q[1] <= range + 1e-6) pts.push(q);
  }
  if (pts.length < 2) return null;
  let [p, q] = [pts[0], pts[pts.length - 1]];
  return [[lerp(p[0], q[0], 0.25), lerp(p[1], q[1], 0.25)], [lerp(p[0], q[0], 0.75), lerp(p[1], q[1], 0.75)]];
}

function draw() {
  background(18, 14, 26);
  let r = R();
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('線形計画法：制約の中でいちばん得をする点', 30, 50);
  textSize(15); fill(150);
  text('白丸ドラッグ：制約を動かす　矢印ドラッグ：目的の向き　F：向き反転　N：追加　D：削除　1：お手本　2：パン屋　3：非有界　4：実行不能', 30, 80);

  fill(28, 22, 38); rect(r.x, r.y, r.s, r.s, 8);
  push(); drawingContext.beginPath(); drawingContext.rect(r.x, r.y, r.s, r.s); drawingContext.clip();
  stroke(45, 38, 62); strokeWeight(1);
  for (let k = 0; k <= range; k++) { let [gx] = toS([k, 0]), [, gy] = toS([0, k]); line(gx, r.y, gx, r.y + r.s); line(r.x, gy, r.x + r.s, gy); }
  if (poly.length >= 3) { fill(78, 225, 190, 60); stroke(78, 225, 190); strokeWeight(2); beginShape(); for (let p of poly) { let s = toS(p); vertex(s[0], s[1]); } endShape(CLOSE); }
  // 等高線 c·x = z が広がっていく
  if (status !== 'infeasible') {
    sweep = (sweep + sweepSpeed) % 1.2;
    let zmax = status === 'optimal' ? best.z : (cobj.x + cobj.y) * range * 1.5;
    let z = min(sweep, 1) * zmax;
    levelLine(z, color(255, 200, 90, 200), 3);
    for (let k = 1; k <= 4; k++) levelLine((zmax * k) / 4, color(255, 200, 90, 40), 1);
  }
  for (let i = 0; i < cons.length; i++) {
    let c = cons[i], h = handles(c); if (!h) continue;
    let s1 = toS(lerpP(h[0], h[1], -2)), s2 = toS(lerpP(h[0], h[1], 3));
    stroke(255, 95, 109); strokeWeight(2.5); line(s1[0], s1[1], s2[0], s2[1]);
    // 「ダメな側」に短い斜線
    let n = createVector(c.a1, -c.a2).normalize();
    for (let t = 0; t <= 1; t += 0.08) { let m = toS(lerpP(h[0], h[1], t * 3 - 1)); stroke(255, 95, 109, 120); line(m[0], m[1], m[0] + n.x * 10, m[1] + n.y * 10); }
    for (let k = 0; k < 2; k++) { let s = toS(h[k]); noStroke(); fill(255); circle(s[0], s[1], 14); }
    let m = toS(h[1]); fill(255, 150, 160); noStroke(); textSize(14); textAlign(LEFT, BOTTOM); text('(' + (i + 1) + ')', m[0] + 8, m[1] - 4);
  }
  if (status === 'optimal') { let s = toS([best.x, best.y]); noStroke(); fill(255, 200, 90); circle(s[0], s[1], 22); fill(18, 14, 26); circle(s[0], s[1], 8); }
  pop();

  // 目的関数の矢印（左下に原点）
  let o = toS([0, 0]), tip = [o[0] + cobj.x * 30, o[1] - cobj.y * 30];
  stroke(255, 200, 90); strokeWeight(4); line(o[0], o[1], tip[0], tip[1]); noStroke(); fill(255, 200, 90); circle(tip[0], tip[1], 16);

  // 右：標準形・スラック形
  let px = r.x + r.s + 30, w = width - px - 30;
  textAlign(LEFT, TOP); noStroke();
  fill(235); textSize(18); text('標準形', px, 115);
  textSize(16); fill(255, 200, 90);
  text(`最大化　${f(cobj.x)}x₁ ${sgn(cobj.y)} ${f(abs(cobj.y))}x₂`, px, 145);
  fill(235);
  let yy = 172;
  for (let i = 0; i < cons.length; i++) { let c = cons[i]; text(`(${i + 1})  ${f(c.a1)}x₁ ${sgn(c.a2)} ${f(abs(c.a2))}x₂ ≤ ${f(c.b)}`, px + 20, yy); yy += 24; }
  text('x₁, x₂ ≥ 0', px + 20, yy); yy += 40;
  fill(235); textSize(18); text('スラック形（余り sᵢ ≥ 0 を足して等式に）', px, yy); yy += 30;
  textSize(16); fill(200);
  for (let i = 0; i < cons.length; i++) { let c = cons[i]; text(`s${sub(i + 1)} = ${f(c.b)} ${sgn(-c.a1)} ${f(abs(c.a1))}x₁ ${sgn(-c.a2)} ${f(abs(c.a2))}x₂`, px + 20, yy); yy += 24; }
  yy += 24;
  textSize(20);
  if (status === 'optimal') { fill(78, 225, 190); text(`最適解 x = (${f(best.x)}, ${f(best.y)})\n最大値 z = ${f(best.z)}`, px, yy); }
  if (status === 'unbounded') { fill(255, 200, 90); text('非有界：矢印の向きにどこまでも行ける\n→ 最大値がない', px, yy); }
  if (status === 'infeasible') { fill(255, 100, 100); text('実行不能：全部の制約を満たす点がない', px, yy); }
  fill(150); textSize(14);
  text('等高線（黄色の線）c·x = z を矢印の向きに動かして、最後に領域にふれる点が答え。\nだから答えは角（頂点）にある → シンプレックス法（04）は角から角へ歩く。\n最短経路も最大流も、変数を増やせば LP として書ける。', px, height - 110, w);
}

function levelLine(z, col, wgt) {
  let a = cobj.x, b = cobj.y, p, q;
  if (abs(b) > abs(a)) { p = [-range, (z + a * range) / b]; q = [2 * range, (z - 2 * a * range) / b]; }
  else { p = [(z + b * range) / a, -range]; q = [(z - 2 * b * range) / a, 2 * range]; }
  let s1 = toS(p), s2 = toS(q); stroke(col); strokeWeight(wgt); line(s1[0], s1[1], s2[0], s2[1]);
}
function lerpP(p, q, t) { return [lerp(p[0], q[0], t), lerp(p[1], q[1], t)]; }
function nearestCons() {
  let w = toW(mouseX, mouseY), bi = -1, bd = 1e9;
  for (let i = 0; i < cons.length; i++) { let c = cons[i], d = abs(c.a1 * w[0] + c.a2 * w[1] - c.b) / mag(c.a1, c.a2); if (d < bd) { bd = d; bi = i; } }
  return bi;
}

function mousePressed() {
  let o = toS([0, 0]);
  if (dist(mouseX, mouseY, o[0] + cobj.x * 30, o[1] - cobj.y * 30) < 14) { drag = { obj: true }; return; }
  for (let i = 0; i < cons.length; i++) {
    let h = handles(cons[i]); if (!h) continue;
    for (let k = 0; k < 2; k++) { let s = toS(h[k]); if (dist(mouseX, mouseY, s[0], s[1]) < 12) { drag = { i, k, other: h[1 - k], len: mag(cons[i].a1, cons[i].a2), n: [cons[i].a1, cons[i].a2] }; return; } }
  }
}
function mouseDragged() {
  if (!drag) return;
  if (drag.obj) { let o = toS([0, 0]); cobj = { x: round(((mouseX - o[0]) / 30) * 2) / 2, y: round(((o[1] - mouseY) / 30) * 2) / 2 }; if (cobj.x === 0 && cobj.y === 0) cobj.x = 0.5; solve(); return; }
  let p = toW(mouseX, mouseY), q = drag.other;
  let dx = q[0] - p[0], dy = q[1] - p[1]; if (mag(dx, dy) < 0.3) return;
  let n = [-dy, dx]; if (n[0] * drag.n[0] + n[1] * drag.n[1] < 0) n = [dy, -dx];
  let s = drag.len / mag(n[0], n[1]); n = [n[0] * s, n[1] * s];
  cons[drag.i] = { a1: round(n[0] * 10) / 10, a2: round(n[1] * 10) / 10, b: 0 };
  cons[drag.i].b = round((cons[drag.i].a1 * q[0] + cons[drag.i].a2 * q[1]) * 10) / 10;
  drag.n = [cons[drag.i].a1, cons[drag.i].a2];
  solve();
}
function mouseReleased() { drag = null; }
function keyPressed() {
  if (key >= '1' && key <= '4') preset(int(key));
  if ((key === 'f' || key === 'F') && cons.length) { let i = nearestCons(); cons[i] = { a1: -cons[i].a1, a2: -cons[i].a2, b: -cons[i].b }; solve(); }
  if ((key === 'n' || key === 'N') && cons.length < 7) { let ang = random(TWO_PI); let a1 = round(cos(ang) * 30) / 10, a2 = round(sin(ang) * 30) / 10; cons.push({ a1, a2, b: round((a1 * 4 + a2 * 4 + 6) * 10) / 10 }); solve(); }
  if ((key === 'd' || key === 'D') && cons.length) { cons.splice(nearestCons(), 1); solve(); }
}
function f(v) { return abs(v - round(v)) < 1e-9 ? String(round(v)) : v.toFixed(1); }
function sgn(v) { return v < 0 ? '−' : '+'; }
function sub(k) { return String(k).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join(''); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 矢印をゆっくり回すと、答えの角がパッと隣の角へ飛ぶ。辺と矢印が直角のときは辺全体が答え
// 2. 2 のパン屋で「バターをもう 1 増やす」（(2) の b を増やす）と利益はいくら増える？（05 の双対へ）
// 3. 4（実行不能）で F を押して制約の向きを反転すると、領域が現れる
