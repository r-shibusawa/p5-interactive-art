// ============================================
// 14 多様体ブラシ
// 球面やトーラスの表面に直接絵をかく。マウスの位置から「面のどの (u, v) か」を探して、(u, v) の画像（テクスチャ）に塗る
//   n 回対称・鏡映でコピーしながら描ける。描くと面の上の高さ v で音が鳴る。自由制作のベース
// クリックで音をスタート / 面の上をドラッグ = 描く / 背景をドラッグ = 回す / 1 = 球面 2 = トーラス / ←→ = 対称の数 n / ↑↓ = 太さ / M = 鏡映 / H = 虹色 / スペース = 自動回転 / C = 消す / S = 保存
// ============================================

let kind = 1;
let nSym = 6;                  // ★ 回転対称の数（u 方向に 2π/n ずつコピー）
let mirror = true;             // ★ v → −v の鏡映もコピー
let brushSize = 0.05;               // ★ 筆の太さ（面の上の長さ）
let rainbow = true, spin = true;
let TW = 1024, TH = 512;       // ★ テクスチャの大きさ
let tex, SC, models = {}, painting = false, last = null, hue0 = 0;

const SURF = {
  1: { name: '球面', u: [0, 2 * Math.PI], v: [-Math.PI / 2, Math.PI / 2], f: (u, v) => [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)] },
  2: { name: 'トーラス', u: [0, 2 * Math.PI], v: [-Math.PI, Math.PI], f: (u, v) => [(1 + 0.45 * Math.cos(v)) * Math.cos(u), (1 + 0.45 * Math.cos(v)) * Math.sin(u), 0.45 * Math.sin(v)] },
};

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setupView();
  SC = min(width, height) * 0.32;
  tex = createGraphics(TW, TH);
  clearTex();
  textureMode(NORMAL);
  for (let k of [1, 2]) models[k] = texturedSurface(SURF[k], 96, 64);
}
function clearTex() {
  tex.background(235, 232, 222);
  tex.stroke(0, 0, 0, 25); tex.strokeWeight(1);
  for (let i = 0; i <= 24; i++) tex.line((i * TW) / 24, 0, (i * TW) / 24, TH);
  for (let j = 0; j <= 12; j++) tex.line(0, (j * TH) / 12, TW, (j * TH) / 12);
}
// 画像の座標 (s, t)（0〜1）つきの面をつくる
function texturedSurface(S, nu, nv) {
  return buildGeometry(() => {
    noStroke(); beginShape(TRIANGLES);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) for (let [a, b] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
      let s = (i + a) / nu, t = (j + b) / nv, u = S.u[0] + (S.u[1] - S.u[0]) * s, v = S.v[0] + (S.v[1] - S.v[0]) * t, e = 0.001;
      let n = vunit(vcross(vsub(S.f(u + e, v), S.f(u - e, v)), vsub(S.f(u, v + e), S.f(u, v - e))));
      let q = toP(S.f(u, v));
      normal(n[0], -n[2], n[1]); vertex(q[0], q[1], q[2], s, t);
    }
    endShape();
  });
}
function S() { return SURF[kind]; }

// (u, v) に筆を 1 回押す（対称なコピーもすべて）
function stamp(u, v, col) {
  let s = S(), e = 0.001;
  let ru = vlen(vsub(s.f(u + e, v), s.f(u - e, v))) / (2 * e), rv = vlen(vsub(s.f(u, v + e), s.f(u, v - e))) / (2 * e);
  // 面の上で円になるように、画像の上では横 w・縦 h の楕円にする
  let w = min(TW * 0.5, (brushSize * TW) / (s.u[1] - s.u[0]) / max(ru, 0.03)), h = (brushSize * TH) / (s.v[1] - s.v[0]) / rv;
  tex.noStroke(); tex.fill(...col);
  let vs = mirror ? [v, -v] : [v];
  for (let k = 0; k < nSym; k++) for (let vv of vs) {
    let uu = u + (k * (s.u[1] - s.u[0])) / nSym;
    let x = ((((uu - s.u[0]) / (s.u[1] - s.u[0])) % 1) + 1) % 1 * TW, y = ((vv - s.v[0]) / (s.v[1] - s.v[0])) * TH;
    for (let dx of [-TW, 0, TW]) if (x + dx > -w && x + dx < TW + w) tex.ellipse(x + dx, y, w, h);
  }
}

function draw() {
  background(20, 20, 30);
  dragView();
  if (spin && !mouseIsPressed) rotY += 0.004;
  if (painting && mouseIsPressed) {
    let hit = pickUV(S().f, mouseX, mouseY, S().u[0], S().u[1], S().v[0], S().v[1]);
    if (hit) {
      hue0 = (hue0 + 0.004) % 1;
      let col = rainbow ? hsv(hue0, 0.75, 0.95) : [30, 40, 70];
      // 前の点から今の点まで、すき間なく押していく
      let from = last || hit, du = hit.u - from.u;
      if (Math.abs(du) > PI) du -= Math.sign(du) * TWO_PI;
      let dv = hit.v - from.v, n = constrain(ceil(Math.hypot(du, dv) / (brushSize * 0.3)), 1, 60);
      for (let i = 1; i <= n; i++) stamp(from.u + (du * i) / n, from.v + (dv * i) / n, col);
      last = hit;
      setTone(toFreq(hit.v), 0.12, Math.sin(hit.u));
    } else { last = null; setTone(0, 0, 0); }
  } else setTone(0, 0, 0);

  ambientLight(170); directionalLight(120, 120, 120, 0.3, 0.6, -1);
  push();
  rotateX(rotX); rotateY(rotY);
  noStroke(); texture(tex); model(models[kind]);
  pop();
  drawHud();
  showHud();
}

function drawHud() {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text((audioCtx ? '♪' : 'クリックで音') + '　面をドラッグ：描く　背景：回す　1/2：' + S().name + '　←→：対称 n = ' + nSym + '　↑↓：太さ　M：鏡映 ' + (mirror ? 'ON' : 'off') + '　H：虹色　スペース：回転　C：消す　S：保存', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('右下の長方形が (u, v) の画像（テクスチャ）。球面とトーラスは同じ画像を別の形に貼っている → 1/2 で切りかえて比べよう', 20, 68);
  let W = 300, H = 150, ox = width - W - 24, oy = height - H - 24;
  hud.fill(0, 0, 0, 150); hud.rect(ox - 8, oy - 30, W + 16, H + 38, 8);
  hud.image(tex, ox, oy, W, H);
  hud.fill(220); hud.textSize(13); hud.text('(u, v) の画像　横 = u（経度）、縦 = v', ox, oy - 10);
}
function toFreq(v) { let s = [0, 2, 4, 7, 9], t = (v - S().v[0]) / (S().v[1] - S().v[0]), k = floor(t * 14); return 196 * Math.pow(2, (floor(k / 5) * 12 + s[k % 5]) / 12); }

function mousePressed() {
  startAudio();
  let hit = pickUV(S().f, mouseX, mouseY, S().u[0], S().u[1], S().v[0], S().v[1]);
  painting = !!hit; dragging = !hit; last = null;
}
function mouseReleased() { painting = false; dragging = false; last = null; }
function keyPressed() {
  if (key === '1' || key === '2') kind = int(key);
  if (key === LEFT_ARROW) nSym = max(1, nSym - 1);
  if (key === RIGHT_ARROW) nSym = min(16, nSym + 1);
  if (key === UP_ARROW) brushSize = min(0.3, brushSize * 1.3);
  if (key === DOWN_ARROW) brushSize = max(0.01, brushSize / 1.3);
  if (key === 'm' || key === 'M') mirror = !mirror;
  if (key === 'h' || key === 'H') rainbow = !rainbow;
  if (key === ' ') spin = !spin;
  if (key === 'c' || key === 'C') clearTex();
  if (key === 's' || key === 'S') saveCanvas('manifold_brush', 'png');
}

// ---------- やってみよう ----------
// 1. 球面の北極の近くに描くと、右下の画像では横に長く伸びる。でも球の上では丸い（stamp の w の計算）
// 2. トーラスで u 方向に 1 周する線と v 方向に 1 周する線を描こう。どちらも縮めて消せない輪（シリーズ 27）
// 3. 球面で描いた絵を 2 でトーラスに貼ると、極のまわりの模様はどこへ行く？
// 4. SURF に自分の面を追加して描いてみよう（03 や 05 の面の式が使える）。音の決め方（toFreq）も変えよう


// ==================================================
// ここから下は「音を鳴らすための道具」（描いている間だけ鳴る音）
// ==================================================
let audioCtx, masterOut, voice;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    let o = audioCtx.createOscillator(), g = audioCtx.createGain(), p = audioCtx.createStereoPanner();
    o.type = 'triangle'; o.frequency.value = 220; g.gain.value = 0;
    o.connect(g); g.connect(p); p.connect(masterOut); o.start();
    voice = { o, g, p };
  }
  audioCtx.resume();
}
// 音の高さ f（Hz）、大きさ vol、左右 pan（−1〜1）
function setTone(f, vol, pan) {
  if (!audioCtx || !voice) return;
  let t = audioCtx.currentTime;
  if (f > 0) voice.o.frequency.setTargetAtTime(constrain(f, 40, 4000), t, 0.02);
  voice.g.gain.setTargetAtTime(constrain(vol, 0, 0.3), t, 0.04);
  voice.p.pan.setTargetAtTime(constrain(pan, -1, 1), t, 0.05);
}


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
