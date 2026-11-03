// ============================================
// 03 パラメータ曲面のギャラリー
// 曲面は 2 つのパラメータ (u, v) から 3D の点を作る関数 r(u, v)。u, v を細かく動かして格子（メッシュ）にする
//   球面・トーラス・鞍・モンキーサドル・エンネパー・カテノイド・らせん面（後ろ 3 つは「極小曲面」）
//   右下の四角が (u, v) の平面。オレンジの線 = u 一定、水色の線 = v 一定。曲面の上ではこれが曲がって写っている
// 1〜7 = 曲面 / W = ワイヤー ↔ シェード / G = 格子線 / ドラッグ = 視点を回す
// ============================================

let surfNo = 1, wire = false, showGrid = true;
let nu = 48, nv = 48;          // ★ メッシュの分割数（大きいほどなめらか、重くなる）
let scaleF = 120;              // ★ 曲面の大きさ（px）
let hud, geo, SF;

// ★ 曲面のカタログ：f(u, v) → [x, y, z]（数学の座標、z が上）、u・v の範囲、つながっているか（wrap）
let SURFACES = [
  { name: '球面', formula: 'r(u,v) = (cos u cos v, sin u cos v, sin v)', u: [0, 2 * Math.PI], v: [-Math.PI / 2 + 0.005, Math.PI / 2 - 0.005], wrapU: true, f: (u, v) => [1.4 * Math.cos(u) * Math.cos(v), 1.4 * Math.sin(u) * Math.cos(v), 1.4 * Math.sin(v)] },
  { name: 'トーラス', formula: 'r(u,v) = ((R + r cos v) cos u, (R + r cos v) sin u, r sin v)', u: [0, 2 * Math.PI], v: [0, 2 * Math.PI], wrapU: true, wrapV: true, f: (u, v) => [(1.3 + 0.55 * Math.cos(v)) * Math.cos(u), (1.3 + 0.55 * Math.cos(v)) * Math.sin(u), 0.55 * Math.sin(v)] },
  { name: '鞍（双曲放物面）', formula: 'r(u,v) = (u, v, (u² − v²)/2)', u: [-1.5, 1.5], v: [-1.5, 1.5], f: (u, v) => [u, v, 0.5 * (u * u - v * v)] },
  { name: 'モンキーサドル', formula: 'r(u,v) = (u, v, (u³ − 3uv²)/2)', u: [-1.3, 1.3], v: [-1.3, 1.3], f: (u, v) => [u, v, 0.5 * (u ** 3 - 3 * u * v * v)] },
  { name: 'エンネパー曲面（極小）', formula: 'r(u,v) = (u − u³/3 + uv², v − v³/3 + vu², u² − v²)', u: [-1.7, 1.7], v: [-1.7, 1.7], f: (u, v) => [0.45 * (u - u ** 3 / 3 + u * v * v), 0.45 * (v - v ** 3 / 3 + v * u * u), 0.45 * (u * u - v * v)] },
  { name: 'カテノイド（極小）', formula: 'r(u,v) = (cosh v cos u, cosh v sin u, v)', u: [0, 2 * Math.PI], v: [-1.3, 1.3], wrapU: true, f: (u, v) => [0.8 * Math.cosh(v) * Math.cos(u), 0.8 * Math.cosh(v) * Math.sin(u), 0.8 * v] },
  { name: 'らせん面（極小）', formula: 'r(u,v) = (v cos u, v sin u, c·u)', u: [-2 * Math.PI, 2 * Math.PI], v: [-1.3, 1.3], f: (u, v) => [0.8 * v * Math.cos(u), 0.8 * v * Math.sin(u), 0.3 * u] },
];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  build();
}

// (u, v) → p5 の座標 [x, −z, y]（p5 は y が下向きなので z を上にする）
function pt(u, v) { let q = SF.f(u, v); return [q[0] * scaleF, -q[2] * scaleF, q[1] * scaleF]; }
function uAt(i) { return SF.u[0] + ((SF.u[1] - SF.u[0]) * i) / nu; }
function vAt(j) { return SF.v[0] + ((SF.v[1] - SF.v[0]) * j) / nv; }

function build() {
  SF = SURFACES[surfNo - 1];
  let P = [], C = [];
  for (let i = 0; i <= nu; i++) { P.push([]); C.push([]); for (let j = 0; j <= nv; j++) { P[i].push(pt(uAt(i), vAt(j))); let c = color(200 + (i / nu) * 120, 45, 90); C[i].push([red(c) / 255, green(c) / 255, blue(c) / 255]); } }
  if (geo) freeGeometry(geo);
  geo = gridMesh(P, C, SF.wrapU, SF.wrapV);
}

function draw() {
  background(215, 35, 9);
  ambientLight(70); directionalLight(220, 220, 220, -0.4, 0.6, -1); directionalLight(90, 90, 90, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  if (!wire) { noStroke(); model(geo); }
  if (showGrid || wire) {
    noFill(); strokeWeight(wire ? 1.5 : 1);
    let stepI = wire ? 2 : 4;
    for (let i = 0; i <= nu; i += stepI) {                       // u 一定の線（v が動く）
      stroke(25, 85, 100, wire ? 90 : 70); beginShape();
      for (let j = 0; j <= nv; j++) { let p = pt(uAt(i), vAt(j)); vertex(p[0], p[1], p[2]); } endShape();
    }
    for (let j = 0; j <= nv; j += stepI) {                       // v 一定の線（u が動く）
      stroke(190, 80, 100, wire ? 90 : 70); beginShape();
      for (let i = 0; i <= nu; i++) { let p = pt(uAt(i), vAt(j)); vertex(p[0], p[1], p[2]); } endShape();
    }
  }
  pop();

  // HUD
  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1〜7：曲面（' + surfNo + ' ' + SF.name + '）　W：' + (wire ? 'ワイヤー' : 'シェード') + '　G：格子線 ' + (showGrid ? 'ON' : 'off') + '　ドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text(SF.formula + '　　u ∈ [' + nf(SF.u[0], 1, 2) + ', ' + nf(SF.u[1], 1, 2) + ']　v ∈ [' + nf(SF.v[0], 1, 2) + ', ' + nf(SF.v[1], 1, 2) + ']　　' + nu + '×' + nv + ' の格子', 20, 66);
  // パラメータ平面（u, v）
  let bx = width - 230, by = height - 230, bw = 200, bh = 200;
  hud.fill(0, 0, 100, 8); hud.rect(bx - 10, by - 10, bw + 20, bh + 20, 10);
  hud.strokeWeight(1);
  for (let i = 0; i <= nu; i += 4) { hud.stroke(25, 85, 100, 70); hud.line(bx + (i / nu) * bw, by, bx + (i / nu) * bw, by + bh); }
  for (let j = 0; j <= nv; j += 4) { hud.stroke(190, 80, 100, 70); hud.line(bx, by + bh - (j / nv) * bh, bx + bw, by + bh - (j / nv) * bh); }
  hud.noStroke(); hud.fill(0, 0, 70); hud.textSize(13);
  hud.text('u →', bx + bw - 30, by + bh + 16); hud.text('v ↑', bx - 36, by + 14);
  hud.text('(u, v) のパラメータ平面', bx, by - 16);
  showHud();
}

function keyPressed() {
  if (key >= '1' && key <= '7') { surfNo = +key; build(); }
  if (key === 'w' || key === 'W') wire = !wire;
  if (key === 'g' || key === 'G') showGrid = !showGrid;
}
function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }

// ---------- やってみよう ----------
// 1. 球面（1）の北極・南極では u の線がぜんぶ集まる（パラメータの特異点）。格子線で確かめよう
// 2. トーラス（2）の u, v の範囲をどちらも [0, π] にすると半分になる。「貼り合わせ」が見える
// 3. SURFACES に自分の曲面を足そう。例：(u, v, sin u cos v) の波の曲面、(u cos v, u sin v, u) の円錐
// 4. カテノイド（6）とらせん面（7）は実は同じ曲面を「曲げた」もの（等長変形）。nu, nv を変えても形は同じ？

// ==================================================
// ここから下は「3D の道具」です（視点の回転・格子からメッシュを作る・HUD の重ね描き）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.5, rotY = 0.6;
// P[i][j] = [x, y, z]、C[i][j] = [r, g, b]（0〜1）の格子から p5.Geometry を作る（両面に光が当たるよう裏面も作る）
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
