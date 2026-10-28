// ============================================
// 03 接ベクトルと接平面
// 面の上の点 p で、u だけ少し動かした向き ∂r/∂u（赤）と v だけ動かした向き ∂r/∂v（緑）が「接平面」を張る
//   面の上を動く点の速度は、いつもこの 2 本の組み合わせ γ' = a ∂r/∂u + b ∂r/∂v（黄）。法線 n（青）とは直角
// クリック = 点 p を選ぶ / ←→ = 曲線の向き φ / スペース = 止める / 1 = 球面 2 = トーラス 3 = 鞍面 4 = 波 / P = 接平面の表示 / ドラッグ = 視点
// ============================================

let kind = 4;
let pu = 0.5, pv = 0.4;        // 選んだ点 p の (u, v)
let phi = 0.6;                 // ★ 曲線の向き（(u, v) の世界での角度）
let tt = 0, moving = true, showPlane = true;
let SC, surfModel, gridModel, press = null;

const SURF = {
  1: { name: '球面', u: [-Math.PI, Math.PI], v: [-1.5, 1.5], f: (u, v) => [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)] },
  2: { name: 'トーラス', u: [-Math.PI, Math.PI], v: [-Math.PI, Math.PI], f: (u, v) => [(1 + 0.42 * Math.cos(v)) * Math.cos(u), (1 + 0.42 * Math.cos(v)) * Math.sin(u), 0.42 * Math.sin(v)] },
  3: { name: '鞍面 z = (x² − y²)/3', u: [-1.2, 1.2], v: [-1.2, 1.2], f: (u, v) => [u, v, (u * u - v * v) / 3] },
  4: { name: '波 z = 0.3 sin 2x cos 2y', u: [-1.3, 1.3], v: [-1.3, 1.3], f: (u, v) => [u, v, 0.3 * Math.sin(2 * u) * Math.cos(2 * v)] },
};

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setupView();
  SC = min(width, height) * 0.3;
  rebuild();
}
function S() { return SURF[kind]; }
function rebuild() {
  if (surfModel) { freeGeometry(surfModel); freeGeometry(gridModel); }
  let s = S();
  surfModel = makeSurface(s.f, s.u[0], s.u[1], s.v[0], s.v[1], 64, 48, () => [80, 110, 160]);
  gridModel = makeGrid(s.f, s.u[0], s.u[1], s.v[0], s.v[1], 16, 12, [150, 175, 230]);
}
// ★ 偏微分（接ベクトル）を差分で求める
function partials(u, v) {
  let e = 0.0005, f = S().f;
  return {
    p: f(u, v),
    ru: vmul(vsub(f(u + e, v), f(u - e, v)), 1 / (2 * e)),
    rv: vmul(vsub(f(u, v + e), f(u, v - e)), 1 / (2 * e)),
  };
}

function draw() {
  background(16, 18, 28);
  dragView();
  if (keyIsDown(LEFT_ARROW)) phi -= 0.03;
  if (keyIsDown(RIGHT_ARROW)) phi += 0.03;
  if (moving) tt += 0.012;
  let T = partials(pu, pv);
  let n = vunit(vcross(T.ru, T.rv));
  // 曲線 γ(t) = r(pu + t cos φ, pv + t sin φ)
  let L = 0.9, s = L * Math.sin(tt);
  let cu = pu + s * Math.cos(phi), cv = pv + s * Math.sin(phi);
  let C = partials(cu, cv);
  let vel = vadd(vmul(C.ru, Math.cos(phi)), vmul(C.rv, Math.sin(phi)));   // γ'(t)
  let nC = vunit(vcross(C.ru, C.rv));

  ambientLight(120); directionalLight(255, 255, 255, 0.3, 0.6, -1);
  push();
  rotateX(rotX); rotateY(rotY);
  model(surfModel); showLines(gridModel);
  // 曲線
  stroke(255, 230, 90); strokeWeight(3); noFill();
  beginShape();
  for (let i = -40; i <= 40; i++) { let a = (i / 40) * L; vtx(vadd(S().f(pu + a * Math.cos(phi), pv + a * Math.sin(phi)), vmul(nC, 0.004))); }
  endShape();
  // 接平面
  if (showPlane) {
    let e1 = vunit(T.ru), e2 = vcross(n, e1), h = 0.5;
    noStroke(); fill(255, 255, 255, 70);
    beginShape();
    for (let [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) vtx(vadd(T.p, vadd(vmul(e1, a * h), vmul(e2, b * h))));
    endShape(CLOSE);
  }
  // 接ベクトル（長いほうを 0.55 にそろえて表示）
  let k = 0.55 / max(vlen(T.ru), vlen(T.rv));
  arrow(T.p, vmul(T.ru, k), [255, 90, 90]);
  arrow(T.p, vmul(T.rv, k), [90, 230, 120]);
  arrow(T.p, vmul(n, 0.45), [100, 150, 255]);
  // 動く点とその速度
  let kv = 0.4 / max(vlen(vel), 0.4);
  arrow(C.p, vmul(vel, kv), [255, 230, 90]);
  let q = toP(C.p);
  push(); translate(q[0], q[1], q[2]); noStroke(); fill(255, 230, 90); sphere(7); pop();
  q = toP(T.p);
  push(); translate(q[0], q[1], q[2]); noStroke(); fill(255); sphere(6); pop();
  pop();

  drawHud(T, n, vel, nC);
  showHud();
}
function arrow(p, d, c) {
  stroke(...c); strokeWeight(4); seg(p, vadd(p, d));
  let q = toP(vadd(p, d));
  push(); translate(q[0], q[1], q[2]); noStroke(); fill(...c); sphere(5); pop();
}

function drawHud(T, n, vel, nC) {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('クリック：点を選ぶ　←→：曲線の向き φ = ' + nf(degrees(phi) % 360, 1, 0) + '°　スペース：止める　1〜4：面（' + S().name + '）　P：接平面　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('赤 = ∂r/∂u、緑 = ∂r/∂v、青 = 法線 n = ∂r/∂u × ∂r/∂v を長さ 1 に。黄色の点の速度（黄色の矢印）はいつも接平面の中にある', 20, 68);
  let E = vdot(T.ru, T.ru), F = vdot(T.ru, T.rv), G = vdot(T.rv, T.rv);
  let x = 20, y = height - 210;
  hud.fill(0, 0, 0, 150); hud.rect(x - 10, y - 30, 560, 200, 10);
  hud.textSize(16);
  hud.fill(255); hud.text('p = r(' + nf(pu, 1, 2) + ', ' + nf(pv, 1, 2) + ') = ' + v3(T.p), x, y);
  hud.fill(255, 120, 120); hud.text('∂r/∂u = ' + v3(T.ru), x, y + 26);
  hud.fill(120, 240, 140); hud.text('∂r/∂v = ' + v3(T.rv), x, y + 52);
  hud.fill(130, 170, 255); hud.text('n = ' + v3(n), x, y + 78);
  hud.fill(255); hud.text('第一基本形式　E = ' + nf(E, 1, 3) + '　F = ' + nf(F, 1, 3) + '　G = ' + nf(G, 1, 3), x, y + 106);
  hud.fill(255, 230, 90); hud.text('速度 γ\' = cos φ ∂r/∂u + sin φ ∂r/∂v　　n · γ\' = ' + nf(vdot(nC, vel), 1, 5) + '（いつも 0）', x, y + 132);
  hud.fill(170); hud.textSize(13);
  hud.text('速さ |γ\'|² = E cos²φ + 2F cos φ sin φ + G sin²φ = ' + nf(vdot(vel, vel), 1, 3) + '（長さは第一基本形式で測る）', x, y + 156);
}
function v3(a) { return '(' + nf(a[0], 1, 2) + ', ' + nf(a[1], 1, 2) + ', ' + nf(a[2], 1, 2) + ')'; }

function mousePressed() { dragging = true; press = { x: mouseX, y: mouseY }; }
function mouseReleased() {
  dragging = false;
  if (press && Math.hypot(mouseX - press.x, mouseY - press.y) < 5) {
    let s = S(), hit = pickUV(s.f, mouseX, mouseY, s.u[0], s.u[1], s.v[0], s.v[1]);
    if (hit) { pu = hit.u; pv = hit.v; tt = 0; }
  }
  press = null;
}
function keyPressed() {
  if ('1234'.includes(key) && key.length === 1) { kind = int(key); pu = 0.3; pv = 0.3; rebuild(); }
  if (key === ' ') moving = !moving;
  if (key === 'p' || key === 'P') showPlane = !showPlane;
}

// ---------- やってみよう ----------
// 1. 球面の北極の近く（v ≈ 1.5）をクリック。∂r/∂u がとても短くなるのはなぜ？（緯度経度の座標の弱点）
// 2. 鞍面の原点で接平面は水平。少しずれた点では？ 面が接平面の上と下の両方にはみ出すのを横から見よう
// 3. E, F, G から角度 cos θ = F / √(EG) を計算して表示しよう。F = 0 なら ∂r/∂u と ∂r/∂v は直角
// 4. SURF に自分の面（例：z = x³ − 3xy²「猿の鞍」）を追加しよう


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
// 数学の座標の点が、いまの視点で画面のどこに見えるか（depth が大きいほど手前）
function project(p) {
  let [x, y, z] = toP(p);
  let cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
  let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
  let s = EZ / (EZ - z2);
  return { sx: width / 2 + x1 * s, sy: height / 2 + y2 * s, depth: z2 };
}
// 画面の (mx, my) に見えている面の点 (u, v) を探す（なければ null）
function pickUV(f, mx, my, u0, u1, v0, v1) {
  let N = 70, best = null;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    let u = u0 + ((u1 - u0) * i) / N, v = v0 + ((v1 - v0) * j) / N, s = project(f(u, v));
    if (Math.hypot(s.sx - mx, s.sy - my) < 22 && (!best || s.depth > best.depth)) best = { u, v, depth: s.depth };
  }
  if (!best) return null;
  let u = best.u, v = best.v, du = (u1 - u0) / N, dv = (v1 - v0) / N;
  let err = (a, b) => { let s = project(f(a, b)); return (s.sx - mx) ** 2 + (s.sy - my) ** 2; };
  let e = err(u, v);
  for (let k = 0; k < 60 && du > 1e-5; k++) {
    let moved = false;
    for (let [a, b] of [[du, 0], [-du, 0], [0, dv], [0, -dv]]) {
      let uu = u + a, vv = constrain(v + b, v0, v1), ee = err(uu, vv);
      if (ee < e) { e = ee; u = uu; v = vv; moved = true; }
    }
    if (!moved) { du /= 2; dv /= 2; }
  }
  return e < 36 ? { u, v } : null;
}
