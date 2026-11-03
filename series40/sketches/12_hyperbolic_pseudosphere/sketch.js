// ============================================
// 12 負曲率の世界 ─ 擬球と双曲平面
// 擬球 = トラクトリックス（牽引線）を回した曲面。どこでも K = −1（球面の K = +1 の逆）
//   擬球の上の幾何は双曲平面の一部：上半平面モデル {(x, y) : y ≥ 1}、ds² = (dx² + dy²)/y²、測地線は x 軸に中心を持つ半円
//   測地三角形の内角の和は π 未満。不足分 π − (A + B + C) = 三角形の面積（K = −1 なので）
// 下の上半平面で三角形の頂点をドラッグ / 曲面の上に同じ三角形が写る / R = 元に戻す / 空いた所をドラッグ = 視点を回す
// ============================================

let scaleF = 150;                         // ★ 擬球の大きさ（px）
let tri = [], tri0 = [[1.2, 1.5], [4.6, 1.3], [3.1, 3.2]];   // 上半平面の三角形の頂点 (x, y)、y ≥ 1
let hud, geo, dragV = -1;
let panel = { x: 30, y: 0, w: 440, h: 250, xmax: 2 * Math.PI, ymax: 4.5 };   // 上半平面の表示枠
let disc = { cx: 0, cy: 0, r: 120 };                                        // ポアンカレ円板の表示枠

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  panel.y = height - panel.h - 30; disc.cx = width - 170; disc.cy = height - 170;
  tri = tri0.map((p) => p.slice());
  // 擬球のメッシュ（K で色：全部 −1 なので青一色になるはず）
  let nu = 48, nv = 40, P = [], C = [];
  for (let i = 0; i <= nu; i++) { P.push([]); C.push([]); for (let j = 0; j <= nv; j++) { let v = (i / nu) * TWO_PI, u = 0.02 + (2.6 * j) / nv; P[i].push(pseudo(u, v)); C[i].push(kColor(fundForms(pseudo, u, v).K * scaleF * scaleF, 1)); } }
  geo = gridMesh(P, C, true, false);
}

// 擬球 r(u, v) = (sech u cos v, sech u sin v, u − tanh u)（p5 の座標、z を上に）
function pseudo(u, v) { let s = 1 / Math.cosh(u); return [scaleF * s * Math.cos(v), -scaleF * (u - Math.tanh(u)) + 110, scaleF * s * Math.sin(v)]; }
// 上半平面 (x, y) → 擬球（y = cosh u、x = v）
function toSurface(x, y) { return pseudo(Math.acosh(Math.max(y, 1)), x); }
// 上半平面の 2 点を結ぶ測地線（x 軸に中心をもつ半円）を n 個の点でサンプル。向きの接ベクトルも返す
function hypArc(a, b, n) {
  let out = [];
  if (Math.abs(a[0] - b[0]) < 1e-6) { for (let i = 0; i <= n; i++) out.push([a[0], a[1] + ((b[1] - a[1]) * i) / n]); return { pts: out, tanA: [0, Math.sign(b[1] - a[1])], tanB: [0, Math.sign(a[1] - b[1])] }; }
  let c = (b[0] * b[0] + b[1] * b[1] - a[0] * a[0] - a[1] * a[1]) / (2 * (b[0] - a[0])), r = Math.hypot(a[0] - c, a[1]);
  let t1 = Math.atan2(a[1], a[0] - c), t2 = Math.atan2(b[1], b[0] - c);
  for (let i = 0; i <= n; i++) { let th = t1 + ((t2 - t1) * i) / n; out.push([c + r * Math.cos(th), r * Math.sin(th)]); }
  let sg = Math.sign(t2 - t1);
  return { pts: out, tanA: [-sg * Math.sin(t1), sg * Math.cos(t1)], tanB: [sg * Math.sin(t2), -sg * Math.cos(t2)] };
}
// 三角形の 3 辺と内角（等角モデルなので、ふつうの角度で測ってよい）
function triangleInfo() {
  let arcs = [], angles = [0, 0, 0];
  for (let i = 0; i < 3; i++) arcs.push(hypArc(tri[i], tri[(i + 1) % 3], 40));
  for (let i = 0; i < 3; i++) {
    let out = arcs[i].tanA, inn = arcs[(i + 2) % 3].tanB;            // 頂点 i から出る 2 本の接ベクトル
    angles[i] = Math.acos(constrain(out[0] * inn[0] + out[1] * inn[1], -1, 1));
  }
  return { arcs, angles, sum: angles[0] + angles[1] + angles[2] };
}
function toPanel(p) { return { x: panel.x + (p[0] / panel.xmax) * panel.w, y: panel.y + panel.h - ((p[1] - 0) / panel.ymax) * panel.h }; }
function fromPanel(mx, my) { return [constrain(((mx - panel.x) / panel.w) * panel.xmax, 0.05, panel.xmax - 0.05), constrain(((panel.y + panel.h - my) / panel.h) * panel.ymax, 1.02, panel.ymax)]; }
function toDisc(p) { let x = p[0] - Math.PI, y = p[1], d = x * x + (y + 1) * (y + 1); return { x: disc.cx + ((2 * x) / d) * disc.r, y: disc.cy - ((x * x + y * y - 1) / d) * disc.r }; }   // ケイリー変換 w = i(z − i)/(z + i)

function draw() {
  background(250, 30, 9);
  let info = triangleInfo();
  ambientLight(85); directionalLight(190, 190, 190, -0.4, 0.6, -1); directionalLight(80, 80, 80, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  noStroke(); model(geo);
  // 三角形を曲面に写す
  noFill(); strokeWeight(3);
  for (let k = 0; k < 3; k++) {
    stroke([45, 130, 300][k], 85, 100);
    beginShape(); for (let p of info.arcs[k].pts) { let q = lift(toSurface(p[0], p[1])); vertex(q[0], q[1], q[2]); } endShape();
  }
  for (let k = 0; k < 3; k++) { let q = toSurface(tri[k][0], tri[k][1]); push(); translate(q[0], q[1], q[2]); noStroke(); fill(0, 0, 100); sphere(5); pop(); }
  pop();

  // HUD
  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('下の上半平面で頂点をドラッグ　R：元に戻す　空いた所をドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('擬球：トラクトリックスの回転面。色 = K（青 = 負）。計算した K = ' + nf(fundForms(pseudo, 1.0, 1.0).K * scaleF * scaleF, 1, 3) + '（どこでも −1）　上半平面 y ≥ 1 の帯が擬球に等長に写る（y = cosh u, x = v）', 20, 66);
  // 上半平面モデル
  hud.fill(0, 0, 100, 8); hud.rect(panel.x - 10, panel.y - 10, panel.w + 20, panel.h + 20, 10);
  hud.fill(230, 50, 60, 25); let y1 = toPanel([0, 1]).y; hud.rect(panel.x, panel.y, panel.w, y1 - panel.y);           // y ≥ 1 の帯（擬球の部分）
  hud.stroke(0, 0, 100, 30); hud.strokeWeight(1); hud.line(panel.x, y1, panel.x + panel.w, y1);
  hud.noFill(); hud.strokeWeight(2.5);
  for (let k = 0; k < 3; k++) { hud.stroke([45, 130, 300][k], 85, 100); hud.beginShape(); for (let p of info.arcs[k].pts) { let q = toPanel(p); hud.vertex(q.x, q.y); } hud.endShape(); }
  hud.noStroke();
  for (let k = 0; k < 3; k++) { let q = toPanel(tri[k]); hud.fill(0, 0, 100); hud.circle(q.x, q.y, dragV === k ? 16 : 12); hud.fill(0, 0, 100); hud.textSize(13); hud.text(['A', 'B', 'C'][k] + ' = ' + nf(degrees(info.angles[k]), 1, 1) + '°', q.x + 10, q.y - 8); }
  hud.fill(0, 0, 70); hud.textSize(13);
  hud.text('上半平面モデル　ds² = (dx² + dy²)/y²　測地線 = x 軸に中心をもつ半円　（帯 y ≥ 1 が擬球）', panel.x, panel.y - 18);
  hud.text('x = 0', panel.x, panel.y + panel.h + 16); hud.text('x = 2π', panel.x + panel.w - 40, panel.y + panel.h + 16); hud.text('y = 1', panel.x + panel.w - 34, y1 - 4);
  // ポアンカレ円板
  hud.fill(0, 0, 100, 8); hud.circle(disc.cx, disc.cy, 2 * disc.r + 20);
  hud.noFill(); hud.stroke(0, 0, 100, 40); hud.strokeWeight(1); hud.circle(disc.cx, disc.cy, 2 * disc.r);
  hud.strokeWeight(2.5);
  for (let k = 0; k < 3; k++) { hud.stroke([45, 130, 300][k], 85, 100); hud.beginShape(); for (let p of info.arcs[k].pts) { let q = toDisc(p); hud.vertex(q.x, q.y); } hud.endShape(); }
  hud.noStroke(); hud.fill(0, 0, 100);
  for (let k = 0; k < 3; k++) { let q = toDisc(tri[k]); hud.circle(q.x, q.y, 8); }
  hud.fill(0, 0, 70); hud.textSize(13); hud.text('ポアンカレ円板（同じ三角形）', disc.cx - 80, disc.cy - disc.r - 22);
  // 内角の和
  let ix = width - 640, iy = 96;
  hud.fill(0, 0, 100, 8); hud.rect(ix - 16, iy - 10, 636, 110, 10);
  hud.fill(0, 0, 100); hud.textSize(22);
  hud.text('内角の和 A + B + C = ' + nf(degrees(info.sum), 1, 1) + '° < 180°', ix, iy + 30);
  hud.textSize(17);
  hud.text('不足 π − (A + B + C) = ' + nf(Math.PI - info.sum, 1, 4) + ' rad = 三角形の面積（K = −1）', ix, iy + 62);
  hud.fill(0, 0, 65); hud.textSize(14);
  hud.text('球面（07）は「超過 = 面積」、平面は 0、双曲平面は「不足 = 面積」。ガウス＝ボネの 3 つの顔', ix, iy + 88);
  showHud();
}

function lift(q) { let c = [0, q[1], 0], d = [q[0] - c[0], 0, q[2] - c[2]], l = Math.hypot(d[0], d[2]) || 1; return [q[0] + (2.5 * d[0]) / l, q[1], q[2] + (2.5 * d[2]) / l]; }
function mousePressed() {
  dragV = -1;
  for (let k = 0; k < 3; k++) { let q = toPanel(tri[k]); if (Math.hypot(q.x - mouseX, q.y - mouseY) < 18) dragV = k; }
  if (dragV < 0 && mouseX > panel.x && mouseX < panel.x + panel.w && mouseY > panel.y && mouseY < panel.y + panel.h) { let best = 1e9; for (let k = 0; k < 3; k++) { let q = toPanel(tri[k]); let d = Math.hypot(q.x - mouseX, q.y - mouseY); if (d < best) { best = d; dragV = k; } } tri[dragV] = fromPanel(mouseX, mouseY); }
}
function mouseDragged() { if (dragV >= 0) tri[dragV] = fromPanel(mouseX, mouseY); else { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); } }
function mouseReleased() { dragV = -1; }
function keyPressed() { if (key === 'r' || key === 'R') tri = tri0.map((p) => p.slice()); }

// ---------- やってみよう ----------
// 1. 三角形を大きくするほど内角の和が小さくなる。頂点を上（y 大）に引っぱると曲面のどこに行く？（細い先のほう）
// 2. 小さい三角形は内角の和がほぼ 180°（小さい範囲では平面とほぼ同じ）。どのくらい小さいと 179° になる？
// 3. 頂点を x = 0 と x = 2π の近くに置くと、擬球の上では「裏で貼り合わさって」いる。曲面の上でつながるか見よう
// 4. 2 つの頂点を同じ x にすると、その辺は垂直線（半径無限大の半円）。擬球の上では子午線になる

// ==================================================
// ここから下は「曲面の道具」です（基本形式の差分計算・メッシュ・色・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.3, rotY = 0.6;
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function fundForms(f, u, v) {
  let h = 1e-3;
  let p = f(u, v), pu1 = f(u + h, v), pu0 = f(u - h, v), pv1 = f(u, v + h), pv0 = f(u, v - h);
  let puv = f(u + h, v + h), puV = f(u + h, v - h), pUv = f(u - h, v + h), pUV = f(u - h, v - h);
  let ru = [0, 1, 2].map((i) => (pu1[i] - pu0[i]) / (2 * h)), rv = [0, 1, 2].map((i) => (pv1[i] - pv0[i]) / (2 * h));
  let ruu = [0, 1, 2].map((i) => (pu1[i] - 2 * p[i] + pu0[i]) / (h * h)), rvv = [0, 1, 2].map((i) => (pv1[i] - 2 * p[i] + pv0[i]) / (h * h));
  let ruv = [0, 1, 2].map((i) => (puv[i] - puV[i] - pUv[i] + pUV[i]) / (4 * h * h));
  let c = cross3(ru, rv), cl = Math.sqrt(dot3(c, c)) || 1e-12, n = c.map((x) => x / cl);
  let E = dot3(ru, ru), F = dot3(ru, rv), G = dot3(rv, rv), L = dot3(ruu, n), M = dot3(ruv, n), N = dot3(rvv, n);
  let det = E * G - F * F || 1e-12;
  return { p, ru, rv, n, E, F, G, L, M, N, K: (L * N - M * M) / det, H: (E * N + G * L - 2 * F * M) / (2 * det) };
}
function kColor(v, s) { let t = Math.tanh(v / s); return t > 0 ? [1, 1 - 0.85 * t, 1 - 0.85 * t] : [1 + 0.8 * t, 1 + 0.6 * t, 1]; }
function gridMesh(P, C, wrapU, wrapV) {
  let g = new p5.Geometry(), nu = P.length - 1, nv = P[0].length - 1;
  let NU = wrapU ? nu : nu + 1, NV = wrapV ? nv : nv + 1;
  let idx = (i, j) => (i % NU) * NV + (j % NV);
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { g.vertices.push(new p5.Vector(P[i][j][0], P[i][j][1], P[i][j][2])); let c = C ? C[i][j] : [0.8, 0.8, 0.8]; g.vertexColors.push(c[0], c[1], c[2], 1); }
    let off = side * NU * NV;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      let a = idx(i, j) + off, b = idx(i + 1, j) + off, c = idx(i, j + 1) + off, d = idx(i + 1, j + 1) + off;
      if (side === 0) g.faces.push([a, b, c], [b, d, c]); else g.faces.push([a, c, b], [b, c, d]);
    }
  }
  g.computeNormals();
  return g;
}
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); image(hud, -width / 2, -height / 2); }
