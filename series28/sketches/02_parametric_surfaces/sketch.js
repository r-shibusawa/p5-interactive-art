// ============================================
// 02 円周・トーラス・球面のパラメータ表示
// 2 つの数 (u, v) を 3D の点に送る式 r(u, v) で面をつくる。長方形の (u, v) を曲げて貼り合わせるイメージ
//   ←→ ↑↓ で u・v の範囲を広げると、長方形のどの辺とどの辺が貼り合わさるかが見える
// 1 = 円周 2 = 円柱 3 = 球面 4 = トーラス 5 = 一葉双曲面 6 = らせん面 / ←→ = u の範囲 / ↑↓ = v の範囲 / A = 点を動かす / ドラッグ = 視点
// ============================================

let kind = 4;
let uFrac = 1, vFrac = 1;      // ★ u・v の範囲のうち何割を描くか（0.1〜1）
let auto = true, t = 0;
let SC, surfModel, gridModel;
let A = 1.0, B = 0.4;          // ★ トーラスの半径

const PI2 = 2 * Math.PI;      // 2π（p5 が始まる前でも使えるように Math.PI で）

// ★ 面の式。u0..u1, v0..v1 がパラメータの範囲
const SHAPES = {
  1: { name: '円周 S¹', u: [0, PI2], v: [0, 0], f: (u, v) => [Math.cos(u), Math.sin(u), 0], txt: 'r(u) = (cos u, sin u)　u と u + 2π は同じ点（線分の両端を貼る）' },
  2: { name: '円柱', u: [0, PI2], v: [-0.8, 0.8], f: (u, v) => [Math.cos(u) * 0.8, Math.sin(u) * 0.8, v], txt: 'r(u, v) = (cos u, sin u, v)　左右の辺だけを貼る' },
  3: { name: '球面 S²', u: [0, PI2], v: [-Math.PI / 2, Math.PI / 2], f: (u, v) => [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)], txt: 'r(u, v) = (cos v cos u, cos v sin u, sin v)　左右を貼り、上の辺と下の辺はそれぞれ 1 点（極）につぶれる' },
  4: { name: 'トーラス T²', u: [0, PI2], v: [-Math.PI, Math.PI], f: (u, v) => [(A + B * Math.cos(v)) * Math.cos(u), (A + B * Math.cos(v)) * Math.sin(u), B * Math.sin(v)], txt: 'r(u, v) = ((A + B cos v) cos u, (A + B cos v) sin u, B sin v)　左右を貼り、上下も貼る' },
  5: { name: '一葉双曲面', u: [0, PI2], v: [-1.1, 1.1], f: (u, v) => [0.55 * Math.cosh(v) * Math.cos(u), 0.55 * Math.cosh(v) * Math.sin(u), 0.55 * Math.sinh(v)], txt: 'r(u, v) = (cosh v cos u, cosh v sin u, sinh v)　x² + y² − z² = 1。円柱と同じ「形」（位相）' },
  6: { name: 'らせん面', u: [0, 2 * PI2], v: [-0.9, 0.9], f: (u, v) => [v * Math.cos(u), v * Math.sin(u), 0.12 * (u - PI2)], txt: 'r(u, v) = (v cos u, v sin u, c u)　どこも貼らない。平面と同じ形（らせん階段）' },
};

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setupView();
  SC = min(width, height) * 0.32;
  rebuild();
}

function cur() { return SHAPES[kind]; }
function ranges() {
  let s = cur();
  return [s.u[0], s.u[0] + (s.u[1] - s.u[0]) * uFrac, s.v[0], s.v[0] + (s.v[1] - s.v[0]) * vFrac];
}
// 色：u で色相、v で明るさ（左下の長方形と同じ色）
function colUV(u, v) {
  let s = cur();
  let a = (u - s.u[0]) / (s.u[1] - s.u[0]), b = s.v[1] > s.v[0] ? (v - s.v[0]) / (s.v[1] - s.v[0]) : 0.5;
  return hsv(a, 0.55, 0.45 + 0.5 * b);
}
function rebuild() {
  if (surfModel) { freeGeometry(surfModel); freeGeometry(gridModel); surfModel = null; }
  if (kind === 1) return;
  let [u0, u1, v0, v1] = ranges();
  surfModel = makeSurface(cur().f, u0, u1, v0, v1, max(4, round(80 * uFrac)), max(2, round(40 * vFrac)), colUV);
  gridModel = makeGrid(cur().f, u0, u1, v0, v1, max(1, round(16 * uFrac)), max(1, round(8 * vFrac)), [20, 24, 40]);
}

function draw() {
  background(16, 18, 28);
  dragView();
  if (auto) t += 0.01;
  let s = cur(), [u0, u1, v0, v1] = ranges();
  // 動く点 (u, v)：範囲の中を行ったり来たり
  let pu = u0 + (u1 - u0) * (0.5 + 0.5 * Math.sin(t * 0.9)), pv = v0 + (v1 - v0) * (0.5 + 0.45 * Math.sin(t * 2.3));

  ambientLight(120); directionalLight(255, 255, 255, 0.3, 0.6, -1);
  push();
  rotateX(rotX); rotateY(rotY);
  if (kind === 1) {
    strokeWeight(6); noFill();
    for (let i = 0; i < 120; i++) {
      let a = u0 + ((u1 - u0) * i) / 120, b = u0 + ((u1 - u0) * (i + 1)) / 120;
      stroke(...colUV(a, 0)); seg(s.f(a, 0), s.f(b, 0));
    }
  } else {
    model(surfModel); showLines(gridModel);
  }
  // 座標軸
  strokeWeight(1);
  stroke(255, 90, 90, 140); seg([0, 0, 0], [1.5, 0, 0]);
  stroke(90, 255, 120, 140); seg([0, 0, 0], [0, 1.5, 0]);
  stroke(90, 140, 255, 140); seg([0, 0, 0], [0, 0, 1.5]);
  let q = toP(s.f(pu, pv));
  push(); translate(q[0], q[1], q[2]); noStroke(); fill(255, 230, 90); sphere(8); pop();
  pop();

  drawHud(s, u0, u1, v0, v1, pu, pv);
  showHud();
}

function drawHud(s, u0, u1, v0, v1, pu, pv) {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('1〜6：形（' + s.name + '）　←→：u の範囲 ' + round(uFrac * 100) + '%　↑↓：v の範囲 ' + round(vFrac * 100) + '%　A：点を動かす　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text(s.txt, 20, 68);
  // 左下：パラメータの長方形（(u, v) の世界）
  let W = 300, H = kind === 1 ? 40 : 200, ox = 30, oy = height - H - 60;
  hud.fill(0, 0, 0, 150); hud.rect(ox - 14, oy - 40, W + 28, H + 80, 10);
  hud.fill(255); hud.textSize(14); hud.text('パラメータの世界 (u, v)', ox, oy - 16);
  let nu = 30, nv = kind === 1 ? 1 : 15;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    let a = s.u[0] + ((s.u[1] - s.u[0]) * (i + 0.5)) / nu, b = s.v[0] + ((s.v[1] - s.v[0]) * (j + 0.5)) / nv;
    let inside = a <= u1 && (kind === 1 || b <= v1);
    let c = colUV(a, b);
    hud.fill(c[0], c[1], c[2], inside ? 255 : 40);
    hud.rect(ox + (i * W) / nu, oy + H - ((j + 1) * H) / nv, W / nu + 0.5, H / nv + 0.5);
  }
  // 貼り合わせる辺の印
  hud.strokeWeight(4);
  if (kind <= 5) { hud.stroke(255, 120, 120); hud.line(ox, oy, ox, oy + H); hud.line(ox + W, oy, ox + W, oy + H); }
  if (kind === 4) { hud.stroke(120, 200, 255); hud.line(ox, oy, ox + W, oy); hud.line(ox, oy + H, ox + W, oy + H); }
  if (kind === 3) { hud.stroke(255, 230, 90); hud.line(ox, oy, ox + W, oy); hud.line(ox, oy + H, ox + W, oy + H); }
  hud.noStroke(); hud.fill(255, 230, 90);
  let px = ox + ((pu - s.u[0]) / (s.u[1] - s.u[0])) * W, py = kind === 1 ? oy + H / 2 : oy + H - ((pv - s.v[0]) / (s.v[1] - s.v[0])) * H;
  hud.circle(px, py, 12);
  hud.fill(220); hud.textSize(13);
  hud.text('u →（横）　v ↑（縦）　赤 = 左右を貼る辺' + (kind === 4 ? '　青 = 上下を貼る辺' : kind === 3 ? '　黄 = 1 点につぶす辺' : ''), ox, oy + H + 24);
  hud.textSize(16); hud.fill(255, 230, 90);
  let p = s.f(pu, pv);
  hud.text('(u, v) = (' + nf(pu, 1, 2) + ', ' + nf(pv, 1, 2) + ')  →  r = (' + nf(p[0], 1, 2) + ', ' + nf(p[1], 1, 2) + ', ' + nf(p[2], 1, 2) + ')', ox + W + 40, height - 60);
}

function mousePressed() { dragging = true; }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if ('123456'.includes(key) && key.length === 1) { kind = int(key); rebuild(); }
  if (key === LEFT_ARROW) { uFrac = max(0.1, uFrac - 0.1); rebuild(); }
  if (key === RIGHT_ARROW) { uFrac = min(1, uFrac + 0.1); rebuild(); }
  if (key === DOWN_ARROW) { vFrac = max(0.1, vFrac - 0.1); rebuild(); }
  if (key === UP_ARROW) { vFrac = min(1, vFrac + 0.1); rebuild(); }
  if (key === 'a' || key === 'A') auto = !auto;
}

// ---------- やってみよう ----------
// 1. トーラスで u の範囲を 10% → 100% へ。次に v の範囲も。長方形の 4 辺がどう貼られたか言葉で説明しよう
// 2. 球面の v の範囲を半分にすると「半球」。上の辺が 1 点につぶれるのはどこ？
// 3. 一葉双曲面と円柱は位相的に同じ（どちらも左右だけ貼る）。でも曲がり方はちがう（05 で比べる）
// 4. SHAPES に自分の式を追加しよう。例：(u, v) → (sin u cos v, sin u sin v, cos u + log(tan(u/2)) + v)…


// 色相 h（0〜1）・彩度 s・明るさ b → [r, g, b]
function hsv(h, s, b) {
  h = ((h % 1) + 1) % 1;
  let i = Math.floor(h * 6), f = h * 6 - i, p = b * (1 - s), q = b * (1 - f * s), t = b * (1 - (1 - f) * s);
  let c = [[b, t, p], [q, b, p], [p, b, t], [p, q, b], [t, p, b], [b, p, q]][i % 6];
  return [c[0] * 255, c[1] * 255, c[2] * 255];
}

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
