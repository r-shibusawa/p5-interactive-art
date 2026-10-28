// ============================================
// 06 測地線
// 面の上で「まっすぐ進む」線 = 測地線。左右にハンドルを切らずに歩くと、球面では大円になる
//   測地線の方程式 u″ᵏ + Γᵏᵢⱼ u′ⁱ u′ʲ = 0 を数値積分（RK4）。Γ（クリストッフェル記号）は E, F, G の微分から
// クリック = 出発点 / ←→ = 出発の向き / ↑↓ = 長さ / F = 扇（9 本同時）/ L = 地図上の直線と比べる / 1 = 球面 2 = トーラス 3 = 円柱 4 = 丘 / ドラッグ = 視点
// ============================================

let kind = 2;
let su = 0.0, sv = 0.2;        // 出発点 (u, v)
let theta = 0.5;               // ★ 出発の向き（∂r/∂u からの角度）
let len = 9;                   // ★ 測地線の長さ
let ds = 0.012;                // ★ 積分の刻み（小さいほど正確）
let fan = false, showLine = true;
let SC, surfModel, gridModel, pathModels = [], paths = [], straight = [], walker = 0, press = null;

const SURF = {
  1: { name: '球面', u: [-Math.PI, Math.PI], v: [-1.5, 1.5], wrapU: true, f: (u, v) => [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)] },
  2: { name: 'トーラス', u: [-Math.PI, Math.PI], v: [-Math.PI, Math.PI], wrapU: true, wrapV: true, f: (u, v) => [(1 + 0.45 * Math.cos(v)) * Math.cos(u), (1 + 0.45 * Math.cos(v)) * Math.sin(u), 0.45 * Math.sin(v)] },
  3: { name: '円柱', u: [-Math.PI, Math.PI], v: [-1.2, 1.2], wrapU: true, f: (u, v) => [0.6 * Math.cos(u), 0.6 * Math.sin(u), v] },
  4: { name: '丘（ガウス関数の山）', u: [-1.6, 1.6], v: [-1.6, 1.6], f: (u, v) => [u, v, 0.7 * Math.exp(-4 * (u * u + v * v))] },
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
  surfModel = makeSurface(s.f, s.u[0], s.u[1], s.v[0], s.v[1], 72, 54, () => [70, 95, 140]);
  gridModel = makeGrid(s.f, s.u[0], s.u[1], s.v[0], s.v[1], 16, 12, [120, 145, 200]);
  computePaths();
}

// 第一基本形式 E, F, G
function metric(u, v) {
  let f = S().f, h = 0.001;
  let ru = vmul(vsub(f(u + h, v), f(u - h, v)), 1 / (2 * h)), rv = vmul(vsub(f(u, v + h), f(u, v - h)), 1 / (2 * h));
  return [vdot(ru, ru), vdot(ru, rv), vdot(rv, rv), ru, rv];
}
// ★ 測地線の方程式：加速度 = −Γ(速度, 速度)
function accel(u, v, du, dv) {
  let h = 0.002;
  let [E, F, G] = metric(u, v);
  let a = metric(u + h, v), b = metric(u - h, v), c = metric(u, v + h), d = metric(u, v - h);
  let Eu = (a[0] - b[0]) / (2 * h), Fu = (a[1] - b[1]) / (2 * h), Gu = (a[2] - b[2]) / (2 * h);
  let Ev = (c[0] - d[0]) / (2 * h), Fv = (c[1] - d[1]) / (2 * h), Gv = (c[2] - d[2]) / (2 * h);
  let W2 = 2 * (E * G - F * F);
  let Guu = (G * Eu - 2 * F * Fu + F * Ev) / W2, Guv = (G * Ev - F * Gu) / W2, Gvv = (2 * G * Fv - G * Gu - F * Gv) / W2;
  let Hvu = (2 * E * Fu - E * Ev - F * Eu) / W2, Hvv2 = (E * Gu - F * Ev) / W2, Hvv = (E * Gv - 2 * F * Fv + F * Gu) / W2;
  return [-(Guu * du * du + 2 * Guv * du * dv + Gvv * dv * dv), -(Hvu * du * du + 2 * Hvv2 * du * dv + Hvv * dv * dv)];
}
// 出発点から向き th の測地線を RK4 で積分して、(u, v) の列を返す
function geodesic(th) {
  let [E, F, G, ru, rv] = metric(su, sv);
  let e1 = vunit(ru), e2 = vunit(vsub(rv, vmul(e1, vdot(rv, e1))));
  let d = vadd(vmul(e1, Math.cos(th)), vmul(e2, Math.sin(th)));   // 3D の単位ベクトル → (u′, v′) に直す
  let p = vdot(ru, d), q = vdot(rv, d), W = E * G - F * F;
  let st = [su, sv, (G * p - F * q) / W, (E * q - F * p) / W], out = [[su, sv]];
  let s = S(), n = Math.round(len / ds);
  let fn = (y) => { let a = accel(y[0], y[1], y[2], y[3]); return [y[2], y[3], a[0], a[1]]; };
  for (let i = 0; i < n; i++) {
    let k1 = fn(st), k2 = fn(st.map((x, j) => x + (ds / 2) * k1[j])), k3 = fn(st.map((x, j) => x + (ds / 2) * k2[j])), k4 = fn(st.map((x, j) => x + ds * k3[j]));
    st = st.map((x, j) => x + (ds / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    if (!st.every(isFinite) || Math.abs(st[2]) + Math.abs(st[3]) > 1e3) break;
    if (!s.wrapV && (st[1] < s.v[0] || st[1] > s.v[1])) break;   // 端（球面なら極の近く）で止める
    if (!s.wrapU && (st[0] < s.u[0] || st[0] > s.u[1])) break;
    out.push([st[0], st[1]]);
  }
  return out;
}
function computePaths() {
  paths = [];
  let ths = fan ? [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) => theta + k * 0.08) : [theta];
  for (let th of ths) paths.push(geodesic(th));
  // 比べる線：(u, v) の地図の上でまっすぐな線（同じ出発の向き）
  let g = paths[fan ? 4 : 0];
  if (g.length < 2) g = [[su, sv], [su + 0.001, sv]];
  let k = max(1, min(g.length - 1, 25)), du = (g[k][0] - su) / k, dv = (g[k][1] - sv) / k;
  straight = [];
  for (let i = 0; i < g.length; i++) {
    let v = sv + dv * i;
    if (!S().wrapV && (v < S().v[0] || v > S().v[1])) break;
    straight.push([su + du * i, v]);
  }
  for (let m of pathModels) freeGeometry(m);
  pathModels = [];
  let f = S().f;
  let lineModel = (pts, c, w) => {   // 点の列 → 線の模型（色と太さをつけておく）
    let geo = buildGeometry(() => { noFill(); beginShape(); for (let [u, v] of pts) vtx(lift(f, u, v)); endShape(); });
    geo.lineColor = c; geo.w = w;
    return geo;
  };
  paths.forEach((pp, j) => pathModels.push(lineModel(pp, hsvA(fan ? j / 9 : 0.13), 3)));
  if (showLine && straight.length > 1) pathModels.push(lineModel(straight, [200, 200, 210], 2));
  walker = 0;
}
function lift(f, u, v) { let m = metric(u, v); return vadd(f(u, v), vmul(vunit(vcross(m[3], m[4])), 0.008)); }
function hsvA(h) { return hsv(h, 0.65, 1); }

function draw() {
  background(16, 18, 28);
  dragView();
  ambientLight(120); directionalLight(255, 255, 255, 0.3, 0.6, -1);
  push();
  rotateX(rotX); rotateY(rotY);
  model(surfModel); showLines(gridModel);
  for (let m of pathModels) showLines(m, m.w);
  // 歩く点
  walker = (walker + 3) % max(1, paths[0].length);
  let f = S().f;
  for (let pp of paths) {
    let [u, v] = pp[min(walker, pp.length - 1)], q = toP(f(u, v));
    push(); translate(q[0], q[1], q[2]); noStroke(); fill(255); sphere(6); pop();
  }
  let q = toP(f(su, sv));
  push(); translate(q[0], q[1], q[2]); noStroke(); fill(255, 90, 90); sphere(8); pop();
  pop();
  drawHud();
  showHud();
}

function drawHud() {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('クリック：出発点　←→：向き ' + nf(degrees(theta), 1, 0) + '°　↑↓：長さ ' + nf(len, 1, 1) + '　F：扇 ' + (fan ? 'ON' : 'off') + '　L：地図の直線 ' + (showLine ? 'ON' : 'off') + '　1〜4：' + S().name, 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('黄色 = 測地線（面の上のまっすぐ）。灰色 = (u, v) の地図の上でまっすぐな線を面に写したもの → 面の上では曲がっている', 20, 68);
  // 右下：(u, v) の地図
  let s = S(), W = 320, H = 240, ox = width - W - 30, oy = height - H - 50;
  hud.fill(0, 0, 0, 160); hud.rect(ox - 10, oy - 34, W + 20, H + 50, 10);
  hud.fill(255); hud.textSize(14); hud.text('(u, v) の地図（チャート）で見ると', ox, oy - 12);
  hud.noFill(); hud.stroke(255, 60); hud.rect(ox, oy, W, H);
  let X = (u) => ox + ((((u - s.u[0]) % (s.u[1] - s.u[0])) + (s.u[1] - s.u[0])) % (s.u[1] - s.u[0])) / (s.u[1] - s.u[0]) * W;
  let Y = (v) => oy + H - (s.wrapV ? ((((v - s.v[0]) % (s.v[1] - s.v[0])) + (s.v[1] - s.v[0])) % (s.v[1] - s.v[0])) : v - s.v[0]) / (s.v[1] - s.v[0]) * H;
  let drawPath = (pp) => {
    let prev = null;
    for (let [u, v] of pp) {
      let p = [X(u), Y(v)];
      if (prev && Math.abs(p[0] - prev[0]) < W / 2 && Math.abs(p[1] - prev[1]) < H / 2) hud.line(prev[0], prev[1], p[0], p[1]);
      prev = p;
    }
  };
  hud.strokeWeight(2);
  if (showLine) { hud.stroke(200, 200, 210); drawPath(straight); }
  paths.forEach((pp, j) => { hud.stroke(...hsvA(fan ? j / 9 : 0.13)); drawPath(pp); });
  hud.noStroke(); hud.fill(255, 90, 90); hud.circle(X(su), Y(sv), 10);
  hud.fill(200); hud.textSize(13);
  hud.text(kind === 1 ? '球面：測地線 = 大円。地図の上ではくねくね曲がる（極の近くで止まるのは座標がこわれるから）' : kind === 2 ? 'トーラス：外側を回る・内側で戻される・ぐるぐる巻くなど色々' : kind === 3 ? '円柱：測地線はらせん。円柱を切り開くと直線（地図でもまっすぐ）' : '丘：測地線が山をよけて曲がる（重力レンズのよう）', 20, height - 24);
}

function mousePressed() { dragging = true; press = { x: mouseX, y: mouseY }; }
function mouseReleased() {
  dragging = false;
  if (press && Math.hypot(mouseX - press.x, mouseY - press.y) < 5 && !(mouseX > width - 360 && mouseY > height - 330)) {
    let s = S(), hit = pickUV(s.f, mouseX, mouseY, s.u[0], s.u[1], s.v[0], s.v[1]);
    if (hit) { su = hit.u; sv = constrain(hit.v, s.v[0] + 0.05, s.v[1] - 0.05); computePaths(); }
  }
  press = null;
}
function keyPressed() {
  if ('1234'.includes(key) && key.length === 1) { kind = int(key); su = kind === 4 ? -1.3 : 0; sv = kind === 4 ? -0.25 : 0.2; theta = kind === 4 ? 0.15 : 0.5; rebuild(); }
  if (key === LEFT_ARROW) { theta += 0.08; computePaths(); }
  if (key === RIGHT_ARROW) { theta -= 0.08; computePaths(); }
  if (key === UP_ARROW) { len = min(20, len + 1); computePaths(); }
  if (key === DOWN_ARROW) { len = max(1, len - 1); computePaths(); }
  if (key === 'f' || key === 'F') { fan = !fan; computePaths(); }
  if (key === 'l' || key === 'L') { showLine = !showLine; computePaths(); }
}

// ---------- やってみよう ----------
// 1. 球面で F（扇）。赤道から出た 9 本は反対側の 1 点で再び集まる（正の曲率は測地線を集める）
// 2. 丘で F。山の両側を通った線は広がる？ 集まる？ 山のふもと（K < 0 の輪）に注目
// 3. 円柱の測地線は (u, v) の地図でもまっすぐ。円柱は「平らな紙を丸めたもの」（05 で K = 0）だから
// 4. ds を 0.05 にすると誤差でどうなる？ RK4 をオイラー法（1 段）に変えて比べよう


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
