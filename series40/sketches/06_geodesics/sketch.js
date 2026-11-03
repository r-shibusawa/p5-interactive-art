// ============================================
// 06 測地線 ─ 曲面の上の「まっすぐ」
// 測地線 = 曲面に沿って進むとき、横に曲がらない（加速度が曲面の法線方向だけ）道。曲面の上では最短経路になる
//   曲面を F(p) = 0 で表し、p'' = −(v·∇²F·v / |∇F|²) ∇F を RK4 で数値積分（速さ 1 を保つ）
//   球面の測地線は大円（中心を通る平面で切った円）。トーラスでは巻きついたり、内側と外側を行き来したりする
// クリック = 曲面の上の出発点 / ←→ = 出発の向き / N = 12 本の扇 / ↑↓ = 長さ / C = 消す / 1〜3 = 曲面（球・トーラス・楕円体）/ ドラッグ = 視点を回す
// ============================================

let surfNo = 1, hud, geo, SF;
let geos = [];                       // 測地線（点の列）
let start = null, theta = 0.6;       // 出発点と向き
let maxLen = 1400;                   // ★ 測地線の長さ（px）
let ds = 2;                          // ★ RK4 の 1 歩（px）
let scaleF = 150;
let dragMoved = false;

// ★ 曲面のカタログ：陰関数 F(p) = 0（外側で +）とパラメータ表示（描画用）
let SURFACES = [
  { name: '球面', F: (p) => p[0] * p[0] + p[1] * p[1] + p[2] * p[2] - 1.3 * 1.3, u: [0, 2 * Math.PI], v: [-Math.PI / 2 + 0.005, Math.PI / 2 - 0.005], wrapU: true, f: (u, v) => [1.3 * Math.cos(u) * Math.cos(v), 1.3 * Math.sin(u) * Math.cos(v), 1.3 * Math.sin(v)] },
  { name: 'トーラス', F: (p) => (Math.hypot(p[0], p[1]) - 1.25) ** 2 + p[2] * p[2] - 0.55 * 0.55, u: [0, 2 * Math.PI], v: [0, 2 * Math.PI], wrapU: true, wrapV: true, f: (u, v) => [(1.25 + 0.55 * Math.cos(v)) * Math.cos(u), (1.25 + 0.55 * Math.cos(v)) * Math.sin(u), 0.55 * Math.sin(v)] },
  { name: '楕円体', F: (p) => (p[0] / 1.8) ** 2 + (p[1] / 1.1) ** 2 + (p[2] / 0.85) ** 2 - 1, u: [0, 2 * Math.PI], v: [-Math.PI / 2 + 0.005, Math.PI / 2 - 0.005], wrapU: true, f: (u, v) => [1.8 * Math.cos(u) * Math.cos(v), 1.1 * Math.sin(u) * Math.cos(v), 0.85 * Math.sin(v)] },
];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  build();
}

// 数学の座標（z が上）↔ p5 の座標
function toP5(q) { return [q[0] * scaleF, -q[2] * scaleF, q[1] * scaleF]; }
function Fp5(p) { return SF.F([p[0] / scaleF, p[2] / scaleF, -p[1] / scaleF]); }
function gradF(p) { let h = 0.5, g = []; for (let i = 0; i < 3; i++) { let a = p.slice(), b = p.slice(); a[i] += h; b[i] -= h; g.push((Fp5(a) - Fp5(b)) / (2 * h)); } return g; }
function onSurface(p) { for (let k = 0; k < 3; k++) { let g = gradF(p), g2 = dot3(g, g) || 1e-9, f = Fp5(p); p = [0, 1, 2].map((i) => p[i] - f * g[i] / g2); } return p; }

function build() {
  SF = SURFACES[surfNo - 1];
  let nu = 48, nv = 32, P = [], C = [];
  for (let i = 0; i <= nu; i++) { P.push([]); C.push([]); for (let j = 0; j <= nv; j++) { let u = SF.u[0] + (SF.u[1] - SF.u[0]) * i / nu, v = SF.v[0] + (SF.v[1] - SF.v[0]) * j / nv; P[i].push(toP5(SF.f(u, v))); C[i].push([0.58, 0.64, 0.8]); } }
  if (geo) freeGeometry(geo);
  geo = gridMesh(P, C, SF.wrapU, SF.wrapV);
  for (let g of geos) freeGeometry(g.lineGeo);
  geos = [];
  start = onSurface(toP5(SF.f(0.9, surfNo === 2 ? 0.8 : 0.5)));
}

// 測地線の加速度：曲面の法線方向に、曲面から離れないだけの分
function accel(p, v) {
  let g = gradF(p), g2 = dot3(g, g) || 1e-9, h = 0.5;
  let d2 = (Fp5([0, 1, 2].map((i) => p[i] + h * v[i])) - 2 * Fp5(p) + Fp5([0, 1, 2].map((i) => p[i] - h * v[i]))) / (h * h);
  return g.map((x) => -(d2 / g2) * x);
}
// RK4 で測地線を maxLen だけ積分（各歩で曲面に戻し、速さを 1 にそろえる）
function shoot(p0, dir, hue) {
  let p = p0.slice(), v = dir.slice(), pts = [p.slice()];
  for (let s = 0; s < maxLen; s += ds) {
    let k1v = accel(p, v), k1p = v;
    let p2 = [0, 1, 2].map((i) => p[i] + 0.5 * ds * k1p[i]), v2 = [0, 1, 2].map((i) => v[i] + 0.5 * ds * k1v[i]);
    let k2v = accel(p2, v2), k2p = v2;
    let p3 = [0, 1, 2].map((i) => p[i] + 0.5 * ds * k2p[i]), v3 = [0, 1, 2].map((i) => v[i] + 0.5 * ds * k2v[i]);
    let k3v = accel(p3, v3), k3p = v3;
    let p4 = [0, 1, 2].map((i) => p[i] + ds * k3p[i]), v4 = [0, 1, 2].map((i) => v[i] + ds * k3v[i]);
    let k4v = accel(p4, v4), k4p = v4;
    p = [0, 1, 2].map((i) => p[i] + (ds / 6) * (k1p[i] + 2 * k2p[i] + 2 * k3p[i] + k4p[i]));
    v = [0, 1, 2].map((i) => v[i] + (ds / 6) * (k1v[i] + 2 * k2v[i] + 2 * k3v[i] + k4v[i]));
    p = onSurface(p);
    let n = unit3(gradF(p)), vn = dot3(v, n);
    v = unit3([0, 1, 2].map((i) => v[i] - vn * n[i]));
    if (!isFinite(p[0]) || !isFinite(v[0])) break;
    pts.push(p.slice());
  }
  let lineGeo = buildGeometry(() => { noFill(); beginShape(); for (let i = 0; i < pts.length; i += 2) { let n = unit3(gradF(pts[i])); vertex(pts[i][0] + 2.5 * n[0], pts[i][1] + 2.5 * n[1], pts[i][2] + 2.5 * n[2]); } endShape(); });   // 曲面から少し浮かせて描く
  return { pts, hue, born: frameCount, lineGeo };
}
// 出発点での接ベクトル（向き theta）
function startDir(p, th) {
  let n = unit3(gradF(p)), ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let e1 = unit3(cross3(n, ref)), e2 = cross3(n, e1);
  return [0, 1, 2].map((i) => Math.cos(th) * e1[i] + Math.sin(th) * e2[i]);
}
function launch(th, hue) { if (geos.length > 24) freeGeometry(geos.shift().lineGeo); geos.push(shoot(start, startDir(start, th), hue)); }

function draw() {
  background(220, 30, 9);
  if (keyIsDown(LEFT_ARROW)) theta -= 0.03;
  if (keyIsDown(RIGHT_ARROW)) theta += 0.03;
  if (keyIsDown(UP_ARROW)) maxLen = Math.min(4000, maxLen + 20);
  if (keyIsDown(DOWN_ARROW)) maxLen = Math.max(200, maxLen - 20);

  ambientLight(85); directionalLight(190, 190, 190, -0.4, 0.6, -1); directionalLight(80, 80, 80, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  noStroke(); model(geo);
  noFill();
  for (let g of geos) {
    stroke(g.hue, 85, 100); strokeWeight(2.5);
    model(g.lineGeo);                                          // 線は作ったときに固めてある（軽い）
    let tp = g.pts[Math.floor(((frameCount - g.born) * 3) % g.pts.length)], tn = unit3(gradF(tp)), tip = [0, 1, 2].map((i) => tp[i] + 3 * tn[i]);    // 点が測地線の上を走る
    push(); translate(tip[0], tip[1], tip[2]); noStroke(); fill(g.hue, 85, 100); sphere(4); pop();
  }
  // 出発点と向きの矢印
  let d = startDir(start, theta), L = 50;
  stroke(45, 95, 100); strokeWeight(3);
  line(start[0], start[1], start[2], start[0] + d[0] * L, start[1] + d[1] * L, start[2] + d[2] * L);
  push(); translate(start[0], start[1], start[2]); noStroke(); fill(0, 0, 100); sphere(6); pop();
  pop();

  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1〜3：曲面（' + SF.name + '）　クリック：出発点　←→：向き ' + nf(degrees(theta) % 360, 1, 0) + '°　スペース：1 本打つ　N：12 本の扇　↑↓：長さ ' + maxLen + '　C：消す　ドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('黄色の矢印 = 出発の向き　測地線は「曲面の上でハンドルを切らずに進む道」。' + (surfNo === 1 ? '球面では必ず大円になり、出発点に戻ってくる' : surfNo === 2 ? 'トーラスでは外側を巻いたり、内側に入ったり、閉じないことが多い' : '楕円体では閉じない測地線が帯のように埋め尽くす'), 20, 66);
  hud.text('測地線 ' + geos.length + ' 本　p\'\' = −(v·∇²F·v / |∇F|²) ∇F を RK4 で積分（1 歩 ' + ds + ' px）', 20, 90);
  showHud();
}

// クリック：マウスの光線が曲面にぶつかる点を探す（F の符号が変わる所を二分法で）
function pickSurface(mx, my) {
  let ez = (height / 2) / Math.tan(Math.PI / 6);
  let o = invRot([0, 0, ez]), dir = unit3(invRot([mx - width / 2, my - height / 2, -ez]));
  let prev = null, tPrev = 0;
  for (let t = ez - 450; t < ez + 450; t += 3) {
    let p = [0, 1, 2].map((i) => o[i] + dir[i] * t), f = Fp5(p);
    if (prev !== null && prev > 0 && f <= 0) {
      let a = tPrev, b = t;
      for (let k = 0; k < 20; k++) { let m = (a + b) / 2, fm = Fp5([0, 1, 2].map((i) => o[i] + dir[i] * m)); if (fm > 0) a = m; else b = m; }
      return onSurface([0, 1, 2].map((i) => o[i] + dir[i] * (a + b) / 2));
    }
    prev = f; tPrev = t;
  }
  return null;
}
function mousePressed() { dragMoved = false; }
function mouseDragged() { dragMoved = true; rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }
function mouseReleased() { if (dragMoved) return; let p = pickSurface(mouseX, mouseY); if (p) { start = p; launch(theta, (geos.length * 47) % 360); } }
function keyPressed() {
  if (key >= '1' && key <= '3') { surfNo = +key; build(); }
  if (key === ' ') launch(theta, (geos.length * 47) % 360);
  if (key === 'n' || key === 'N') for (let k = 0; k < 12; k++) launch(theta + (k * TWO_PI) / 12, (k * 30) % 360);
  if (key === 'c' || key === 'C') { for (let g of geos) freeGeometry(g.lineGeo); geos = []; }
}

// ---------- やってみよう ----------
// 1. 球面（1）で N を押すと 12 本の大円が反対側の 1 点（対蹠点）で全部交わる。確かめよう
// 2. トーラス（2）の外側から内側へ向かう測地線は、内側で「跳ね返る」ものと、穴をくぐるものがある。向き（←→）で分けてみよう
// 3. 楕円体（3）の測地線はほとんど閉じない。maxLen を 4000 にして、どの帯に閉じ込められるか見よう（クレローの関係）
// 4. SURFACES に自分の曲面を足そう（F(p) = 0 の形で書けるもの。例：z − (x² − y²)/2 の鞍）

// ==================================================
// ここから下は「3D の道具」です（ベクトル・視点の回転・メッシュ・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.5, rotY = 0.6;
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function unit3(a) { let l = Math.sqrt(dot3(a, a)) || 1; return a.map((x) => x / l); }
// 画面（カメラ）の座標 → 物体の座標（rotateX, rotateY の逆）
function invRot(q) {
  let cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
  let y1 = cx * q[1] + sx * q[2], z1 = -sx * q[1] + cx * q[2];
  return [cy * q[0] - sy * z1, y1, sy * q[0] + cy * z1];
}
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
