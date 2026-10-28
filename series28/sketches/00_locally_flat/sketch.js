// ============================================
// 00 局所的には平ら
// 球面やトーラスの上を歩く小さな虫には、まわりが「平らな床」に見える。これが多様体の出発点
//   見える範囲 r を小さくするほど、面は接平面（平らな板）からはみ出さなくなる：はみ出し ≈ r² / (2R)
// ↑↓ = 見える範囲 r（ズーム）/ ←→ = 向きを変える / スペース = 歩く・止まる / 1 = 球面 2 = トーラス / ドラッグ = 視点
// ============================================

let kind = 1;               // 1 = 球面、2 = トーラス
let A = 1.0, B = 0.42;      // ★ トーラスの大きい半径・小さい半径（球面の半径は 1）
let bu = 0.3, bv = 0.35;    // 虫のいる場所 (u, v)
let heading = 0.4;          // 虫の向き
let r = 0.5;                // ★ 虫に見える範囲（半径 1 の球に対する長さ）
let walking = true;
let speed = 0.006;          // ★ 歩く速さ
let SC, surfModel, gridModel;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setupView();
  SC = min(width, height) * 0.3;
  rebuild();
}

// ★ 面の式（数学の座標、z が上）
function surf(u, v) {
  if (kind === 1) return [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)];
  return [(A + B * Math.cos(v)) * Math.cos(u), (A + B * Math.cos(v)) * Math.sin(u), B * Math.sin(v)];
}
function vRange() { return kind === 1 ? [-HALF_PI, HALF_PI] : [-PI, PI]; }

function rebuild() {
  if (surfModel) { freeGeometry(surfModel); freeGeometry(gridModel); }
  let [v0, v1] = vRange();
  surfModel = makeSurface(surf, 0, TWO_PI, v0, v1, 72, 40, () => [70, 90, 130]);
  gridModel = makeGrid(surf, 0, TWO_PI, v0, v1, 24, 12, [150, 175, 230]);
}

// 虫のいる点での「床」の向き：e1 = 進む向き、e2 = 左、n = 上（法線）
function frame(u, v) {
  let e = 0.001;
  let ru = vmul(vsub(surf(u + e, v), surf(u - e, v)), 1 / (2 * e));
  let rv = vmul(vsub(surf(u, v + e), surf(u, v - e)), 1 / (2 * e));
  let n = vunit(vcross(ru, rv));
  let e1 = vunit(vadd(vmul(vunit(ru), Math.cos(heading)), vmul(vunit(rv), Math.sin(heading))));
  return { p: surf(u, v), ru, rv, n, e1, e2: vcross(n, e1) };
}

function draw() {
  background(14, 16, 26);
  dragView();
  if (keyIsDown(LEFT_ARROW)) heading += 0.04;
  if (keyIsDown(RIGHT_ARROW)) heading -= 0.04;
  let F = frame(bu, bv);
  if (walking) {
    // 進む向き e1 を (u, v) の変化に直す（u と v の方向が直交している面なので割り算でよい）
    bu += (speed * Math.cos(heading)) / vlen(F.ru);
    bv += (speed * Math.sin(heading)) / vlen(F.rv);
    if (kind === 1 && Math.abs(bv) > 1.35) { bv = constrain(bv, -1.35, 1.35); heading = -heading; }   // 極の近くははね返る
    if (kind === 2) bv = ((bv + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
  }

  ambientLight(110); directionalLight(255, 255, 255, 0.3, 0.6, -1);
  push();
  rotateX(rotX); rotateY(rotY);
  model(surfModel); showLines(gridModel);
  // 虫に見える範囲：面の網目（黄色）と接平面（白い板）
  let du = r / vlen(F.ru), dv = r / vlen(F.rv);
  stroke(255, 220, 90); strokeWeight(2); noFill();
  for (let i = -4; i <= 4; i++) {
    beginShape(); for (let k = -10; k <= 10; k++) vtx(lift(surf(bu + (i / 4) * du, bv + (k / 10) * dv), F)); endShape();
    beginShape(); for (let k = -10; k <= 10; k++) vtx(lift(surf(bu + (k / 10) * du, bv + (i / 4) * dv), F)); endShape();
  }
  noStroke(); fill(255, 255, 255, 60);
  let c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  beginShape(); for (let [a, b] of c) vtx(vadd(F.p, vadd(vmul(F.e1, a * r), vmul(F.e2, b * r)))); endShape(CLOSE);
  // 虫
  let q = toP(lift(F.p, F));
  push(); translate(q[0], q[1], q[2]); fill(255, 90, 90); sphere(6); pop();
  stroke(255, 90, 90); strokeWeight(3); seg(F.p, vadd(F.p, vmul(F.e1, 0.18)));
  pop();

  drawHud(F, du, dv);
  showHud();
}
function lift(p, F) { return vadd(p, vmul(F.n, 0.006)); }   // 面より少し浮かせる

// 右の窓：虫から見た景色（接平面の座標で、見える範囲 r を同じ大きさに拡大）
function drawHud(F, du, dv) {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('↑↓：見える範囲 r = ' + nf(r, 1, 3) + '　←→：向き　スペース：歩く ' + (walking ? 'ON' : 'off') + '　1：球面　2：トーラス　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('黄色 = 虫に見える範囲の面、白い板 = 接平面。r を小さくすると黄色の網と白い板の区別がつかなくなる（局所的に平ら）', 20, 68);
  let S = 340, ox = width - S - 30, oy = 100, k = (S * 0.42) / r;
  hud.fill(0, 0, 0, 150); hud.rect(ox, oy, S, S + 190, 10);
  hud.fill(255); hud.textSize(15); hud.text('虫から見た景色（r を窓いっぱいに拡大）', ox + 12, oy + 24);
  let hmax = 0;
  hud.strokeWeight(1.5); hud.noFill();
  for (let dir = 0; dir < 2; dir++) for (let i = -4; i <= 4; i++) {
    let prev = null;
    for (let s = -10; s <= 10; s++) {
      let a = dir ? i / 4 : s / 10, b = dir ? s / 10 : i / 4;
      let d = vsub(surf(bu + a * du, bv + b * dv), F.p);
      let x = vdot(d, F.e1), y = vdot(d, F.e2), h = vdot(d, F.n);
      hmax = max(hmax, Math.abs(h));
      let X = ox + S / 2 + x * k, Y = oy + S / 2 + 10 - y * k;
      let t = constrain((Math.abs(h) / r) * 4, 0, 1);
      hud.stroke(lerp(120, 255, t), lerp(230, 90, t), lerp(255, 90, t));
      if (prev) hud.line(prev[0], prev[1], X, Y);
      prev = [X, Y];
    }
  }
  hud.noStroke(); hud.fill(255, 90, 90); hud.circle(ox + S / 2, oy + S / 2 + 10, 10);
  // 横から見た断面：面の高さ h（赤）と接平面（白い線）
  let gy = oy + S + 70;
  hud.stroke(255, 120); hud.line(ox + 20, gy, ox + S - 20, gy);
  hud.stroke(255, 120, 120); hud.noFill(); hud.beginShape();
  for (let s = -20; s <= 20; s++) {
    let d = vsub(surf(bu + (s / 20) * du * Math.cos(heading), bv + (s / 20) * dv * Math.sin(heading)), F.p);
    hud.vertex(ox + S / 2 + vdot(d, F.e1) * k, gy - vdot(d, F.n) * k);
  }
  hud.endShape();
  hud.noStroke(); hud.fill(220); hud.textSize(14);
  hud.text('横から見た断面（白 = 接平面、赤 = 面）', ox + 12, oy + S + 30);
  hud.text('はみ出し h / r = ' + nf(hmax / r, 1, 4) + (kind === 1 ? '　（≈ r / 2R = ' + nf(r / 2, 1, 4) + '）' : ''), ox + 12, gy + 50);
  if (kind === 1) hud.text('円周 / (2πr) = sin r / r = ' + nf(Math.sin(r) / r, 1, 5) + '（平らなら 1）', ox + 12, gy + 74);
  else hud.text('トーラスは場所で曲がり方がちがう', ox + 12, gy + 74);
}

function mousePressed() { dragging = true; }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === UP_ARROW) r = max(0.01, r / 1.25);
  if (key === DOWN_ARROW) r = min(1.4, r * 1.25);
  if (key === ' ') walking = !walking;
  if (key === '1' || key === '2') { kind = int(key); bv = 0.3; rebuild(); }
}

// ---------- やってみよう ----------
// 1. r を 0.01 まで小さくして、右の窓の網がまっすぐな方眼紙に見えることを確かめよう
// 2. 球面で h / r と r / 2 を比べる。r を半分にすると、はみ出しの割合も半分になる？
// 3. トーラスの外側（v = 0）と内側（v = π）で右の窓を比べる。内側は「鞍の形」にはみ出す（05 のガウス曲率）
// 4. A と B を変えて細いトーラス・太いトーラスに。B を A より大きくすると何が起こる？


// ==================================================
// ここから下は「3D の道具」（視点・ベクトル計算・面をつくる・画面への投影）
// ==================================================
let rotX = -0.5, rotY = 0.5, EZ, hud, dragging = false;
function setupView() {
  EZ = height / 2 / Math.tan(PI / 6);
  perspective(PI / 3, width / height, EZ / 20, EZ * 20);
  camera(0, 0, EZ, 0, 0, 0, 0, 1, 0);
  hud = createGraphics(width, height);
}
function dragView() { if (mouseIsPressed && dragging) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -1.5, 1.5); } }
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); noLights(); image(hud, -width / 2, -height / 2); }
// 数学の座標（z が上）→ p5 の座標（y が下）に SC 倍
function toP(p) { return [p[0] * SC, -p[2] * SC, p[1] * SC]; }
function vtx(p) { let q = toP(p); vertex(q[0], q[1], q[2]); }
function seg(a, b) { let p = toP(a), q = toP(b); line(p[0], p[1], p[2], q[0], q[1], q[2]); }
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vmul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vlen(a) { return Math.sqrt(vdot(a, a)); }
function vunit(a) { let l = vlen(a) || 1; return vmul(a, 1 / l); }
// 面 f(u, v) を三角形でつくる（col(u, v) → [r, g, b] で色）
function makeSurface(f, u0, u1, v0, v1, nu, nv, col) {
  return buildGeometry(() => {
    noStroke();
    beginShape(TRIANGLES);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      for (let [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
        let u = u0 + ((u1 - u0) * (i + a)) / nu, v = v0 + ((v1 - v0) * (j + b)) / nv, e = 0.001;
        let n = vunit(vcross(vsub(f(u + e, v), f(u - e, v)), vsub(f(u, v + e), f(u, v - e))));
        fill(...col(u, v)); normal(n[0], -n[2], n[1]); vtx(f(u, v));
      }
    }
    endShape();
  });
}
// 面の網目（u 一定の線と v 一定の線）。線の色は showLines で描くときに決まる
function makeGrid(f, u0, u1, v0, v1, nu, nv, c) {
  let geo = buildGeometry(() => {
    noFill();
    for (let side of [1, -1]) {   // 面の表と裏に少し浮かせて 2 回（面にうもれないように）
      let g = (u, v) => { let e = 0.001, n = vunit(vcross(vsub(f(u + e, v), f(u - e, v)), vsub(f(u, v + e), f(u, v - e)))); return vadd(f(u, v), vmul(n, 0.005 * side)); };
      for (let i = 0; i <= nu; i++) { beginShape(); for (let k = 0; k <= 60; k++) vtx(g(u0 + ((u1 - u0) * i) / nu, v0 + ((v1 - v0) * k) / 60)); endShape(); }
      for (let j = 0; j <= nv; j++) { beginShape(); for (let k = 0; k <= 90; k++) vtx(g(u0 + ((u1 - u0) * k) / 90, v0 + ((v1 - v0) * j) / nv)); endShape(); }
    }
  });
  geo.lineColor = c;
  return geo;
}
// buildGeometry でつくった線は、model() の直前の stroke の色で描かれる
function showLines(geo, w) { stroke(...geo.lineColor); strokeWeight(w || 1); model(geo); }
