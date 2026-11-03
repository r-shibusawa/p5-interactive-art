// ============================================
// 05 主曲率と主方向 ─ オイラーの公式
// 曲面の 1 点で、接平面の方向 θ ごとに「その方向に切った断面の曲率」= 法曲率 κ(θ) を測る
//   いちばん大きい κ1 といちばん小さい κ2 が主曲率、その方向が主方向（互いに直交する）
//   オイラーの公式：κ(θ) = κ1 cos²θ + κ2 sin²θ　　K = κ1 κ2（ガウス曲率）　H = (κ1 + κ2)/2（平均曲率）
//   主曲率・主方向は、第一・第二基本形式から作る 2×2 行列（シェイプ作用素 I⁻¹ II）の固有値・固有ベクトル
// 1〜3 = 曲面（トーラス・鞍・楕円体）/ マウス = 調べる点（右下の (u,v) 平面）/ ドラッグ = 視点を回す
// ============================================

let surfNo = 1;
let nu = 40, nv = 40;          // ★ メッシュの分割数
let scaleF = 120;              // ★ 曲面の大きさ（px）
let hud, geo, SF, probe = { u: 0.3, v: 0.3 }, dragging = false;

// ★ 曲面のカタログ（数学の座標、z が上）
let SURFACES = [
  { name: 'トーラス', u: [0, 2 * Math.PI], v: [0, 2 * Math.PI], wrapU: true, wrapV: true, f: (u, v) => [(1.3 + 0.55 * Math.cos(v)) * Math.cos(u), (1.3 + 0.55 * Math.cos(v)) * Math.sin(u), 0.55 * Math.sin(v)] },
  { name: '鞍（双曲放物面）', u: [-1.5, 1.5], v: [-1.5, 1.5], f: (u, v) => [u, v, 0.5 * (u * u - v * v)] },
  { name: '楕円体', u: [0, 2 * Math.PI], v: [-Math.PI / 2 + 0.08, Math.PI / 2 - 0.08], wrapU: true, f: (u, v) => [1.8 * Math.cos(u) * Math.cos(v), 1.1 * Math.sin(u) * Math.cos(v), 0.8 * Math.sin(v)] },
];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  build();
}
function pt(u, v) { let q = SF.f(u, v); return [q[0] * scaleF, -q[2] * scaleF, q[1] * scaleF]; }
function uAt(t) { return SF.u[0] + (SF.u[1] - SF.u[0]) * t; }
function vAt(t) { return SF.v[0] + (SF.v[1] - SF.v[0]) * t; }

function build() {
  SF = SURFACES[surfNo - 1];
  let P = [], C = [];
  for (let i = 0; i <= nu; i++) { P.push([]); C.push([]); for (let j = 0; j <= nv; j++) { let ff = fundForms(pt, uAt(i / nu), vAt(j / nv)); P[i].push(ff.p); C[i].push(kColor(ff.K * scaleF * scaleF, 0.6)); } }
  if (geo) freeGeometry(geo);
  geo = gridMesh(P, C, SF.wrapU, SF.wrapV);
}

// 主曲率と主方向（シェイプ作用素 W = I⁻¹ II の固有値・固有ベクトル）
function principal(ff) {
  let det = ff.E * ff.G - ff.F * ff.F || 1e-12;
  // W = [[a, b], [c, d]]（(u, v) 成分）
  let a = (ff.G * ff.L - ff.F * ff.M) / det, b = (ff.G * ff.M - ff.F * ff.N) / det;
  let c = (ff.E * ff.M - ff.F * ff.L) / det, d = (ff.E * ff.N - ff.F * ff.M) / det;
  let H = (a + d) / 2, K = a * d - b * c, disc = Math.sqrt(Math.max(H * H - K, 0));
  let k1 = H + disc, k2 = H - disc;
  let dir = (k) => { let v1 = [b, k - a], v2 = [k - d, c]; let v = Math.hypot(v1[0], v1[1]) > Math.hypot(v2[0], v2[1]) ? v1 : v2; if (Math.hypot(v[0], v[1]) < 1e-9) v = [1, 0]; let e = [0, 1, 2].map((i) => v[0] * ff.ru[i] + v[1] * ff.rv[i]); let l = Math.sqrt(dot3(e, e)) || 1; return e.map((x) => x / l); };
  let e1 = dir(k1), e2 = cross3(ff.n, e1);                      // e2 は e1 と直交する接方向
  return { k1, k2, e1, e2, K, H };
}

function draw() {
  background(215, 35, 9);
  if (!dragging) probe = { u: constrain(mouseX / width, 0, 1), v: constrain(1 - mouseY / height, 0, 1) };
  let ff = fundForms(pt, uAt(probe.u), vAt(probe.v)), pr = principal(ff);
  let k1 = pr.k1 * scaleF, k2 = pr.k2 * scaleF;                   // 曲面の大きさを 1 とした単位
  let p = ff.p, n = ff.n;

  ambientLight(80); directionalLight(200, 200, 200, -0.4, 0.6, -1); directionalLight(90, 90, 90, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  noStroke(); model(geo);
  // 主方向の矢印（赤 = κ1、青 = κ2）と法線（白）
  arrow3(p, pr.e1, 70, 0); arrow3(p, pr.e2, 70, 215); arrow3(p, n, 50, 0, 0);
  // 法曲率の「花」：接平面の中で方向 θ に長さ |κ(θ)| の線（赤 = +、青 = −）
  strokeWeight(1.5);
  for (let i = 0; i < 48; i++) {
    let th = (i / 48) * TWO_PI, kth = pr.k1 * Math.cos(th) ** 2 + pr.k2 * Math.sin(th) ** 2;
    let L = Math.min(Math.abs(kth) * scaleF, 3) * 25;
    stroke(kth > 0 ? 0 : 215, 80, 100, 70);
    line(p[0], p[1], p[2], p[0] + L * (Math.cos(th) * pr.e1[0] + Math.sin(th) * pr.e2[0]), p[1] + L * (Math.cos(th) * pr.e1[1] + Math.sin(th) * pr.e2[1]), p[2] + L * (Math.cos(th) * pr.e1[2] + Math.sin(th) * pr.e2[2]));
  }
  // 主方向の断面の接触円（半径 1/κ、法線の方向に中心）
  for (let [k, e, hue] of [[pr.k1, pr.e1, 0], [pr.k2, pr.e2, 215]]) {
    if (Math.abs(k) < 1e-4) continue;
    let r = 1 / k, c = [0, 1, 2].map((i) => p[i] + n[i] * r);
    if (Math.abs(r) > 700) continue;
    stroke(hue, 80, 100, 55); strokeWeight(1.5); noFill();
    beginShape();
    for (let i = 0; i <= 48; i++) { let a = (i / 48) * TWO_PI; vertex(c[0] + Math.abs(r) * (Math.cos(a) * e[0] + Math.sin(a) * n[0]), c[1] + Math.abs(r) * (Math.cos(a) * e[1] + Math.sin(a) * n[1]), c[2] + Math.abs(r) * (Math.cos(a) * e[2] + Math.sin(a) * n[2])); }
    endShape();
  }
  push(); translate(p[0], p[1], p[2]); noStroke(); fill(0, 0, 100); sphere(6); pop();
  pop();

  // HUD
  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1〜3：曲面（' + SF.name + '）　マウス：調べる点　ドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('赤の矢印 = 主方向 e1（κ1）　青の矢印 = 主方向 e2（κ2）　白 = 法線　花びら = 法曲率 κ(θ)　薄い円 = 主方向の断面の接触円（半径 1/κ）', 20, 66);
  // 極座標プロット（オイラーの公式）
  let cx = width - 190, cy = height - 190, R = 130;
  hud.fill(0, 0, 100, 8); hud.rect(cx - R - 30, cy - R - 40, 2 * R + 60, 2 * R + 70, 12);
  hud.noFill(); hud.stroke(0, 0, 100, 20); hud.strokeWeight(1); hud.circle(cx, cy, 2 * R); hud.line(cx - R, cy, cx + R, cy); hud.line(cx, cy - R, cx, cy + R);
  let kmax = Math.max(Math.abs(k1), Math.abs(k2), 1e-6);
  hud.strokeWeight(2.5);
  for (let i = 0; i < 180; i++) {
    let th = (i / 180) * TWO_PI, th2 = ((i + 1) / 180) * TWO_PI;
    let f1 = k1 * Math.cos(th) ** 2 + k2 * Math.sin(th) ** 2, f2 = k1 * Math.cos(th2) ** 2 + k2 * Math.sin(th2) ** 2;
    hud.stroke(f1 > 0 ? 0 : 215, 80, 100);
    hud.line(cx + (Math.abs(f1) / kmax) * R * Math.cos(th), cy - (Math.abs(f1) / kmax) * R * Math.sin(th), cx + (Math.abs(f2) / kmax) * R * Math.cos(th2), cy - (Math.abs(f2) / kmax) * R * Math.sin(th2));
  }
  hud.noStroke(); hud.fill(0, 0, 100); hud.textSize(14);
  hud.text('κ(θ) = κ1 cos²θ + κ2 sin²θ　（横 = e1 の向き）', cx - R - 20, cy - R - 18);
  hud.fill(0, 80, 100); hud.text('κ1 = ' + nf(k1, 1, 3), cx + R - 70, cy + 18);
  hud.fill(215, 80, 100); hud.text('κ2 = ' + nf(k2, 1, 3), cx - 32, cy - R + 16);
  // 数値パネル
  hud.fill(0, 0, 100, 8); hud.rect(20, height - 120, 560, 96, 10);
  hud.fill(0, 0, 100); hud.textSize(20);
  hud.text('κ1 = ' + nf(k1, 1, 3) + '　κ2 = ' + nf(k2, 1, 3) + '　→　K = κ1κ2 = ' + nf(k1 * k2, 1, 3) + '　H = ' + nf((k1 + k2) / 2, 1, 3), 36, height - 84);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text(Math.abs(k1 - k2) < 0.03 ? 'κ1 ≈ κ2：どの方向も同じ曲がり方（臍点・umbilic）。球面はすべての点が臍点' : k1 * k2 < 0 ? 'κ1 と κ2 の符号が逆：ある方向では上に、別の方向では下に曲がる（鞍点、K < 0）' : 'κ1 と κ2 が同符号：どの方向にも同じ側に曲がる（楕円的、K > 0）', 36, height - 52);
  showHud();
}

function arrow3(p, d, L, hue, sat = 80) {
  stroke(hue, sat, 100); strokeWeight(3);
  line(p[0], p[1], p[2], p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L);
  push(); translate(p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L); noStroke(); fill(hue, sat, 100); sphere(4); pop();
}
function keyPressed() { if (key >= '1' && key <= '3') { surfNo = +key; build(); } }
function mousePressed() { dragging = true; }
function mouseReleased() { dragging = false; }
function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }

// ---------- やってみよう ----------
// 1. トーラス（1）の外側の点では κ1, κ2 が同符号、内側では逆符号。花びらの色が変わるのを見よう
// 2. 鞍（2）の中心では κ1 = −κ2（H = 0）。花びらが 4 枚のきれいな形になる。中心からずれると？
// 3. 楕円体（3）には κ1 = κ2 になる点（臍点）が 4 つある。マウスで探してみよう（花びらが円になる）
// 4. 主方向 e1 と e2 はいつも直交している。曲面を変えても確かめよう（なぜ直交する？→対称行列の固有ベクトル）

// ==================================================
// ここから下は「曲面の道具」です（基本形式の差分計算・メッシュ・色・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.5, rotY = 0.6;
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
