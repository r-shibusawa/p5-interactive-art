// ============================================
// 15 カメラの明るさを高さにした曲面と、そのガウス曲率（カメラの許可が必要）
// 映像を 48×36 に縮め、各画素の明るさを高さ z とする曲面 z = f(x, y)（モンジュのパッチ）を 3D に描く
//   K = (z_xx z_yy − z_xy²) / (1 + z_x² + z_y²)²　　H = ((1 + z_y²) z_xx − 2 z_x z_y z_xy + (1 + z_x²) z_yy) / (2 (1 + z_x² + z_y²)^{3/2}
//   明るい所は山（てっぺんは K > 0 赤）、山と谷の間の斜面は鞍（K < 0 青）。顔や手をかざすと曲率の地図になる
//   カメラが使えないときは、動くノイズの地形になる
// K / H = 色分け / W = ワイヤー / ↑↓ = 高さの倍率 / B = 映像を表示 / ドラッグ = 視点を回す
// ============================================

let cap, usingCam = false;
let nx = 48, ny = 36;             // ★ 格子の分割（映像の縮小サイズ）
let cs = 13;                      // ★ 1 マスの大きさ（px）
let amp = 160;                    // ★ 高さの倍率（↑↓）
let colorBy = 'K', wire = false, showVideo = true;
let z = [], hud, geo;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(nx, ny);
  cap.hide();
  for (let i = 0; i < nx; i++) { z.push([]); for (let j = 0; j < ny; j++) z[i].push(0); }
}

// 高さの場を更新（カメラの明るさ、なければノイズ地形）。3×3 でぼかして時間方向にもなじませる
function updateHeights() {
  let raw = [];
  usingCam = false;
  if (cap && cap.width > 0) { cap.loadPixels(); if (cap.pixels && cap.pixels.length >= nx * ny * 4) usingCam = true; }
  for (let i = 0; i < nx; i++) {
    raw.push([]);
    for (let j = 0; j < ny; j++) {
      let v;
      if (usingCam) { let k = (i + j * nx) * 4; v = (cap.pixels[k] + cap.pixels[k + 1] + cap.pixels[k + 2]) / (3 * 255); }
      else { let t = frameCount * 0.01; v = 0.5 + 0.25 * Math.sin(i * 0.25 + t * 1.3) * Math.cos(j * 0.3 - t) + 0.2 * Math.sin((i + j) * 0.18 + t * 0.7); }
      raw[i].push(v);
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    let b = raw.map((r) => r.slice());
    for (let i = 1; i < nx - 1; i++) for (let j = 1; j < ny - 1; j++) { let s = 0; for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) s += raw[i + di][j + dj]; b[i][j] = s / 9; }
    raw = b;
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) z[i][j] += (raw[i][j] - z[i][j]) * 0.3;
}

function draw() {
  background(215, 35, 9);
  if (keyIsDown(UP_ARROW)) amp = Math.min(400, amp + 3);
  if (keyIsDown(DOWN_ARROW)) amp = Math.max(0, amp - 3);
  updateHeights();
  // 曲率（モンジュのパッチ）
  let P = [], C = [], vals = [], Kf = [], Hf = [];
  for (let i = 0; i < nx; i++) {
    Kf.push([]); Hf.push([]);
    for (let j = 0; j < ny; j++) {
      let i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, nx - 1), j0 = Math.max(j - 1, 0), j1 = Math.min(j + 1, ny - 1);
      let zx = ((z[i1][j] - z[i0][j]) * amp) / (2 * cs), zy = ((z[i][j1] - z[i][j0]) * amp) / (2 * cs);
      let zxx = ((z[i1][j] - 2 * z[i][j] + z[i0][j]) * amp) / (cs * cs), zyy = ((z[i][j1] - 2 * z[i][j] + z[i][j0]) * amp) / (cs * cs);
      let zxy = ((z[i1][j1] - z[i1][j0] - z[i0][j1] + z[i0][j0]) * amp) / (4 * cs * cs);
      let g = 1 + zx * zx + zy * zy;
      let K = (zxx * zyy - zxy * zxy) / (g * g), H = ((1 + zy * zy) * zxx - 2 * zx * zy * zxy + (1 + zx * zx) * zyy) / (2 * Math.pow(g, 1.5));
      Kf[i].push(K); Hf[i].push(H); vals.push(Math.abs(colorBy === 'K' ? K : H));
    }
  }
  vals.sort((a, b) => a - b);
  let ref = Math.max(vals[Math.floor(vals.length * 0.85)], 1e-6);
  for (let i = 0; i < nx; i++) { P.push([]); C.push([]); for (let j = 0; j < ny; j++) { P[i].push([(i - nx / 2) * cs, -z[i][j] * amp + 60, (j - ny / 2) * cs]); C[i].push(kColor(colorBy === 'K' ? Kf[i][j] : Hf[i][j], ref)); } }
  if (geo) freeGeometry(geo);
  geo = gridMesh(P, C, false, false);

  ambientLight(85); directionalLight(190, 190, 190, -0.4, 0.6, -1); directionalLight(80, 80, 80, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  if (!wire) { noStroke(); model(geo); }
  noFill(); strokeWeight(wire ? 1.2 : 0.7); stroke(0, 0, 100, wire ? 75 : 20);
  for (let i = 0; i < nx; i += wire ? 2 : 4) { beginShape(); for (let j = 0; j < ny; j++) { let p = P[i][j]; vertex(p[0], p[1], p[2]); } endShape(); }
  for (let j = 0; j < ny; j += wire ? 2 : 4) { beginShape(); for (let i = 0; i < nx; i++) { let p = P[i][j]; vertex(p[0], p[1], p[2]); } endShape(); }
  pop();

  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('K / H：色分け（今 ' + (colorBy === 'K' ? 'ガウス曲率 K' : '平均曲率 H') + '）　W：ワイヤー　↑↓：高さ ×' + amp + '　B：映像　ドラッグ：視点　　' + (usingCam ? '📷 カメラ' : 'カメラなし → ノイズ地形'), 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('明るい所が高い。赤 = ' + (colorBy === 'K' ? 'K > 0（山頂・谷底）　青 = K < 0（鞍・斜面のねじれ）　白 = K ≈ 0（平ら・片方向だけ曲がる）' : 'H > 0（へこみ）　青 = H < 0（ふくらみ）　白 = H ≈ 0') + '　色の基準 = |' + colorBy + '| の 85% 点', 20, 66);
  if (showVideo && usingCam) { hud.image(cap, width - 212, 90, 192, 144); hud.noFill(); hud.stroke(45, 90, 100); hud.strokeWeight(2); hud.rect(width - 212, 90, 192, 144); hud.noStroke(); hud.fill(0, 0, 70); hud.textSize(13); hud.text('映像（' + nx + '×' + ny + '）', width - 212, 250); }
  showHud();
}

function keyPressed() {
  if (key === 'k' || key === 'K') colorBy = 'K';
  if (key === 'h' || key === 'H') colorBy = 'H';
  if (key === 'w' || key === 'W') wire = !wire;
  if (key === 'b' || key === 'B') showVideo = !showVideo;
}
function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }

// ---------- やってみよう ----------
// 1. 懐中電灯やスマホのライトをカメラに向けると鋭い山ができる。てっぺんは赤、まわりの斜面は青（鞍）になる
// 2. amp を 0 に近づけると全部白（平面）。高さを上げるほど曲率がはっきりする。式の分母 (1 + z_x² + z_y²) の役目は？
// 3. 時間方向のなじませ（0.3）を 1 にするとちらつく、0.05 にすると遅れる。曲率は 2 階微分なのでノイズに弱い
// 4. 04 の曲面のカタログと見比べよう。山頂・谷底・鞍の 3 種類の点はどこにある？

// ==================================================
// ここから下は「3D の道具」です（視点の回転・メッシュ・色・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.8, rotY = 0.0;
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
