// ============================================
// 11 可展面と地図 ─ 平らに広げられる曲面、広げられない曲面
// 円柱・円錐・接線面は K = 0：伸ばしも縮めもせずに（距離を変えずに）平面に展開できる（可展面）
//   アニメーションの途中もすべて等長：格子の正方形の大きさが変わらないことに注目
// 球面は K = 1/R² ≠ 0 なので展開できない（Gauss の驚異の定理）。無理に地図にすると距離や面積が歪む
//   → メルカトル図法：角は正しいが面積が 1/cos²φ 倍に（極に近いほど巨大に）
// 1〜4 = 曲面（円柱・円錐・らせんの接線面・球面とメルカトル地図）/ スペース = 広げる ↔ 巻く / ←→ = 手動で / ドラッグ = 視点を回す
// ============================================

let surfNo = 1, t = 0, target = 1;     // t = 0 で曲面、1 で平面
let ease = 0.015;                     // ★ 広がる速さ
let hud, geo;
let names = ['円柱', '円錐', 'らせんの接線面', '球面（展開できない）'];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
}

// ★ 内在座標 (s, w) と展開の進み具合 t から 3D の点（数学の座標、z が上）。どの t でも距離を保つ
function devPt(s, w, t) {
  if (surfNo === 1) {                                        // 円柱：曲率 k を (1−t)/R に減らす（弧長 s は保つ）
    let R = 110, k = (1 - t) / R;
    if (k < 1e-4) return [s - Math.PI * R, w, R];
    return [Math.sin(k * s) / k - t * Math.PI * R, w, (Math.cos(k * s) - 1) / k + R];
  }
  if (surfNo === 2) {                                        // 円錐：半頂角 α を広げる（扇形の角 σ = ψ sin α は保つ）
    let a0 = 0.5, a = a0 + t * (Math.PI / 2 - a0), rho = s, sig = w;
    return [rho * Math.sin(a) * Math.cos(sig / Math.sin(a)), rho * Math.sin(a) * Math.sin(sig / Math.sin(a)), -rho * Math.cos(a) + 120 * Math.cos(a)];
  }
  if (surfNo === 3) {                                        // らせんの接線面：曲率 κ はそのまま、捩率 τ を 0 へ（内在距離は κ だけで決まる）
    let a0 = 60, b0 = 30, kap = a0 / (a0 * a0 + b0 * b0), tau = (b0 / (a0 * a0 + b0 * b0)) * (1 - t);
    let a = kap / (kap * kap + tau * tau), b = tau / (kap * kap + tau * tau), c = Math.sqrt(a * a + b * b);
    let r = [a * Math.cos(s / c), a * Math.sin(s / c), (b * s) / c], T = [(-a * Math.sin(s / c)) / c, (a * Math.cos(s / c)) / c, b / c];
    return [r[0] + w * T[0], r[1] + w * T[1], r[2] + w * T[2] - b * 1.1 * Math.PI];
  }
  let R = 130;                                               // 球面（展開できない）：そのまま
  return [R * Math.cos(w) * Math.cos(s), R * Math.cos(w) * Math.sin(s), R * Math.sin(w)];
}
// (s, w) の範囲と格子の分割
function domain() {
  if (surfNo === 1) return { s: [0, 2 * Math.PI * 110], w: [-120, 120], ns: 48, nw: 16 };
  if (surfNo === 2) return { s: [40, 230], w: [0, 2 * Math.PI * Math.sin(0.5)], ns: 14, nw: 40 };
  if (surfNo === 3) return { s: [0, 2.2 * Math.PI * Math.sqrt(60 * 60 + 30 * 30)], w: [0, 150], ns: 48, nw: 10 };
  return { s: [0, 2 * Math.PI], w: [-1.45, 1.45], ns: 48, nw: 24 };
}

function draw() {
  background(210, 30, 9);
  if (keyIsDown(LEFT_ARROW)) { target = t = Math.max(0, t - 0.01); }
  if (keyIsDown(RIGHT_ARROW)) { target = t = Math.min(1, t + 0.01); }
  if (surfNo < 4) t += (target - t) * ease * 4; else t = 0;
  let D = domain(), P = [], C = [];
  for (let i = 0; i <= D.ns; i++) {
    P.push([]); C.push([]);
    for (let j = 0; j <= D.nw; j++) {
      let s = D.s[0] + ((D.s[1] - D.s[0]) * i) / D.ns, w = D.w[0] + ((D.w[1] - D.w[0]) * j) / D.nw, q = devPt(s, w, t);
      P[i].push([q[0], -q[2], q[1]]);
      let stripe = (Math.floor(i / 4) + Math.floor(j / 4)) % 2;
      let c = surfNo === 4 ? areaColor(1 / Math.max(Math.cos(w) ** 2, 0.02)) : stripe ? [0.55, 0.75, 0.95] : [0.95, 0.85, 0.6];
      C[i].push(c);
    }
  }
  if (geo) freeGeometry(geo);
  geo = gridMesh(P, C, false, false);

  ambientLight(90); directionalLight(180, 180, 180, -0.4, 0.6, -1); directionalLight(80, 80, 80, 0.5, -0.4, 0.5);
  push(); rotateX(rotX); rotateY(rotY);
  noStroke(); model(geo);
  noFill(); stroke(0, 0, 100, 45); strokeWeight(1);
  for (let i = 0; i <= D.ns; i += 4) { beginShape(); for (let j = 0; j <= D.nw; j++) { let p = P[i][j]; vertex(p[0], p[1], p[2]); } endShape(); }
  for (let j = 0; j <= D.nw; j += 4) { beginShape(); for (let i = 0; i <= D.ns; i++) { let p = P[i][j]; vertex(p[0], p[1], p[2]); } endShape(); }
  pop();

  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1〜4：曲面（' + names[surfNo - 1] + '）　' + (surfNo < 4 ? 'スペース：' + (target === 1 ? '巻く' : '広げる') + '　←→：手動　展開 ' + nf(t * 100, 1, 0) + '%' : '右の地図を見よう') + '　ドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text(surfNo === 1 ? '円柱：曲率を減らしていく。どの瞬間も格子の正方形は同じ大きさ（等長変形）。K = 0 だから' :
           surfNo === 2 ? '円錐：先の角を広げると扇形になる。扇形の角 = 2π sin α（底の円周 ÷ 母線の長さ）' :
           surfNo === 3 ? '接線面：らせんの接線を集めた曲面。ねじれ τ を 0 にすると、円の接線を集めた平面の輪になる（曲率 κ は同じまま）' :
           '球面は K ≠ 0 なので平面に広げられない。メルカトル図法（右）は角を保つ代わりに面積が 1/cos²φ 倍（赤いほど拡大）。グリーンランドが巨大に見える理由', 20, 66);
  if (surfNo === 4) drawMercator();
  showHud();
}

// メルカトル地図（HUD に描く）
function drawMercator() {
  let mx = width - 540, my = 110, mw = 400, mh = 380, lam = 1.45;
  hud.fill(0, 0, 100, 8); hud.rect(mx - 10, my - 10, mw + 20, mh + 20, 10);
  let Y = (phi) => my + mh / 2 - (Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.log(Math.tan(Math.PI / 4 + lam / 2))) * (mh / 2);
  for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
    let p0 = -lam + (2 * lam * j) / 24, p1 = -lam + (2 * lam * (j + 1)) / 24, pm = (p0 + p1) / 2;
    let c = areaColor(1 / Math.max(Math.cos(pm) ** 2, 0.02));
    hud.fill(cssRGB(c)); hud.rect(mx + (i / 24) * mw, Y(p1), mw / 24 + 0.5, Y(p0) - Y(p1) + 0.5);
  }
  hud.stroke(0, 0, 100, 40); hud.strokeWeight(1); hud.noFill();
  for (let i = 0; i <= 24; i += 2) hud.line(mx + (i / 24) * mw, my, mx + (i / 24) * mw, my + mh);
  for (let j = 0; j <= 24; j += 2) { let y = Y(-lam + (2 * lam * j) / 24); hud.line(mx, y, mx + mw, y); }
  hud.noStroke(); hud.fill(0, 0, 100); hud.textSize(14);
  hud.text('メルカトル図法　y = ln tan(π/4 + φ/2)　色 = 面積の拡大率 1/cos²φ', mx, my - 18);
  hud.fill(0, 0, 70); hud.textSize(12);
  for (let phi of [0, 0.5, 1.0, 1.3]) { hud.text('φ = ' + nf(degrees(phi), 1, 0) + '°：×' + nf(1 / Math.cos(phi) ** 2, 1, 1), mx + mw + 14, Y(phi) + 4); }
  hud.text('赤道', mx + mw + 14, Y(0) + 18);
}
function areaColor(f) { let v = Math.min(1, Math.log(f) / Math.log(30)); return [0.95, 0.95 - 0.8 * v, 0.9 - 0.85 * v]; }

function keyPressed() {
  if (key >= '1' && key <= '4') { surfNo = +key; t = 0; target = 1; }
  if (key === ' ') target = target === 1 ? 0 : 1;
}
function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }

// ---------- やってみよう ----------
// 1. 円錐（2）を展開した扇形の角は 2π sin α。α = 0.5 なら約 173°。扇形を見て確かめよう。α = π/6 なら半円
// 2. 接線面（3）の途中の形はどれも同じ「内在的な形」。格子の正方形がずっと正方形なことを見よう
// 3. 球面（4）の地図で、緯度 60° の正方形は赤道の何倍の面積に見える？（1/cos²60° = 4 倍）
// 4. 円柱（1）の R を変えても展開図の幅は 2πR。R = 60 にして確かめよう。devPt にトーラスを足すと展開できる？（できない：K ≠ 0）

// ==================================================
// ここから下は「3D の道具」です（視点の回転・メッシュ・色・HUD）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.5, rotY = 0.5;
function cssRGB(c) { return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')'; }
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
