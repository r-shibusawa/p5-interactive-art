// ============================================
// 12 双曲平面と球面のタイリング
// 正 p 角形を 1 つの頂点に q 枚ずつ集める {p, q} タイリング
//   (p − 2)(q − 2) < 4 → 角が余るので丸まって「球面」（正多面体 5 種類）
//   (p − 2)(q − 2) = 4 → ぴったり「平面」（00 の 3 種類）
//   (p − 2)(q − 2) > 4 → 角が足りないので波打って「双曲平面」（ポアンカレの円板に無限に描ける。エッシャー『円の極限』）
// ←→ = p / ↑↓ = q / ドラッグ = 回す・動かす / R = 中心に戻す / S = 保存
// ============================================

let p = 7, q = 3;       // ★ 正 p 角形を q 枚ずつ
let polys = [];         // 平面・双曲：[{ v: [[x, y], …], c: [x, y], d: 深さ }]
let faces = [];         // 球面：[{ c: [x, y, z], v: [[x, y, z], …] }]
let layer, gl;
let rotX = -0.4, rotY = 0;
let geom = '';
let maxPolys = 2500;    // ★ 双曲のときに描く最大枚数

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  gl = createGraphics(600, 600, WEBGL);
  build();
}

function build() {
  let k = (p - 2) * (q - 2);
  geom = k < 4 ? 'sphere' : k === 4 ? 'flat' : 'hyper';
  if (geom === 'sphere') buildSphere();
  else buildPlane();
}

function draw() {
  background(16, 18, 26);
  let R = Math.min(width, height - 140) * 0.45;
  if (geom === 'sphere') {
    if (!mouseIsPressed) rotY += 0.006;
    drawSphere();
    image(gl, width / 2 - 300, height / 2 + 40 - 300);
  } else {
    image(layer, 0, 0);
  }
  let names = { '3,3': '正四面体', '4,3': '立方体', '3,4': '正八面体', '5,3': '正十二面体', '3,5': '正二十面体' };
  let deg = (180 * (p - 2)) / p;
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, width, 100);
  fill(255);
  textSize(20);
  let title = geom === 'sphere' ? '球面：' + names[p + ',' + q] + '（' + faces.length + ' 面）' : geom === 'flat' ? '平面：ぴったり 360°' : '双曲平面（ポアンカレ円板）';
  text('{' + p + ', ' + q + '}　正 ' + p + ' 角形を 1 つの頂点に ' + q + ' 枚　→　' + title, 20, 36);
  textSize(15);
  fill(190);
  text('平らな正 ' + p + ' 角形の角 ' + nf(deg, 1, 1) + '° × ' + q + ' 枚 = ' + nf(deg * q, 1, 1) + '°　' +
    (geom === 'sphere' ? '< 360° → 余った分だけ丸まる' : geom === 'flat' ? '= 360°' : '> 360° → 入りきらないので、ふちに向かって小さく見える'), 20, 62);
  text('←→ で p、↑↓ で q。ドラッグで' + (geom === 'sphere' ? '回す。面はすべて同じ形の「ふくらんだ」正多角形' : geom === 'hyper' ? '平行移動（双曲の世界の中で動く）。円板の中では、どの多角形も本当は同じ大きさ' : '動かす'), 20, 86);
}

// ---------- 球面 ----------
function buildSphere() {
  let rho = Math.acos(1 / (Math.tan(Math.PI / p) * Math.tan(Math.PI / q)));   // 面の中心から頂点までの角度
  let first = { c: [0, 0, 1], v: [] };
  for (let i = 0; i < p; i++) {
    let a = (2 * Math.PI * i) / p;
    first.v.push([Math.sin(rho) * Math.cos(a), Math.sin(rho) * Math.sin(a), Math.cos(rho)]);
  }
  faces = [first];
  let seen = new Set([key3(first.c)]);
  for (let f = 0; f < faces.length && faces.length < 30; f++) {
    let F = faces[f];
    for (let i = 0; i < p; i++) {
      // ★ 辺を含む「原点を通る平面」で鏡に映す
      let nrm = unit3(cross3(F.v[i], F.v[(i + 1) % p]));
      let G = { c: mirror3(F.c, nrm), v: F.v.map((v) => mirror3(v, nrm)) };
      if (!seen.has(key3(G.c))) { seen.add(key3(G.c)); faces.push(G); }
    }
  }
}

function drawSphere() {
  gl.clear();
  gl.push();
  gl.rotateX(rotX);
  gl.rotateY(rotY);
  let R = 230;
  gl.noStroke();
  faces.forEach((F, fi) => {
    let h = (fi * 137.5) % 360;
    let c = hsbToRgb(h, 0.55, 0.95);
    let shade = 0.6 + 0.4 * Math.max(0, F.c[2] * 0.5 + 0.5);
    gl.fill(c[0] * shade, c[1] * shade, c[2] * shade);
    gl.beginShape(TRIANGLES);
    for (let i = 0; i < p; i++) {
      let a = F.v[i], b = F.v[(i + 1) % p], S = 6;
      for (let s = 0; s < S; s++) {
        let e1 = unit3(lerp3(a, b, s / S)), e2 = unit3(lerp3(a, b, (s + 1) / S));
        // 中心から辺まで 2 段に分けて、球にそってふくらませる
        let m1 = unit3(lerp3(F.c, e1, 0.5)), m2 = unit3(lerp3(F.c, e2, 0.5));
        for (let tri of [[F.c, m1, m2], [m1, e1, e2], [m1, e2, m2]]) for (let v of tri) gl.vertex(v[0] * R, v[1] * R, v[2] * R);
      }
    }
    gl.endShape();
  });
  // 辺（大円の弧）
  gl.stroke(20);
  gl.strokeWeight(3);
  for (let F of faces) {
    for (let i = 0; i < p; i++) {
      let a = F.v[i], b = F.v[(i + 1) % p];
      for (let s = 0; s < 8; s++) {
        let u = unit3(lerp3(a, b, s / 8)), w = unit3(lerp3(a, b, (s + 1) / 8)), k = R * 1.004;
        gl.line(u[0] * k, u[1] * k, u[2] * k, w[0] * k, w[1] * k, w[2] * k);
      }
    }
  }
  gl.pop();
}

// ---------- 平面・双曲（ポアンカレ円板） ----------
function buildPlane(start) {
  let first;
  if (start) first = start;
  else {
    let d = geom === 'hyper' ? Math.sqrt(Math.cos(Math.PI / p + Math.PI / q) / Math.cos(Math.PI / p - Math.PI / q)) : 0.08;
    first = { v: [], c: [0, 0], d: 0 };
    for (let i = 0; i < p; i++) first.v.push([d * Math.cos((2 * Math.PI * i) / p + 0.3), d * Math.sin((2 * Math.PI * i) / p + 0.3)]);
  }
  polys = [first];
  let seen = new Set([key2(first.c)]);
  for (let f = 0; f < polys.length && polys.length < maxPolys; f++) {
    let P = polys[f];
    if (geom === 'flat' && Math.hypot(P.c[0], P.c[1]) > 1.1) continue;
    for (let i = 0; i < p; i++) {
      let a = P.v[i], b = P.v[(i + 1) % p];
      let Q = { v: P.v.map((v) => reflectGeo(v, a, b)), c: reflectGeo(P.c, a, b), d: P.d + 1 };
      if (geom === 'hyper' && Math.hypot(Q.v[0][0] - Q.c[0], Q.v[0][1] - Q.c[1]) < 0.004) continue;   // 小さすぎる所は省略
      let kk = key2(Q.c);
      if (!seen.has(kk)) { seen.add(kk); polys.push(Q); }
    }
  }
  renderPlane();
}

function renderPlane() {
  let R = Math.min(width, height - 140) * 0.45, cx = width / 2, cy = height / 2 + 40;
  if (geom === 'flat') R = Math.max(width, height) * 0.6;
  layer.clear();
  layer.stroke(16, 18, 26);
  layer.strokeWeight(1);
  for (let P of polys) {
    let c = hsbToRgb((P.d * 23) % 360, 0.5, 0.95 - Math.min(0.4, P.d * 0.03));
    layer.fill(c[0], c[1], c[2]);
    layer.beginShape();
    for (let i = 0; i < p; i++) {
      let pts = geom === 'hyper' ? arcPts(P.v[i], P.v[(i + 1) % p], Math.hypot(P.v[0][0] - P.c[0], P.v[0][1] - P.c[1]) * R > 6 ? 6 : 1) : [P.v[i]];
      for (let v of pts) layer.vertex(cx + v[0] * R, cy + v[1] * R);
    }
    layer.endShape(CLOSE);
  }
  if (geom === 'hyper') {
    layer.noFill();
    layer.stroke(200);
    layer.strokeWeight(2);
    layer.circle(cx, cy, 2 * R);
  }
}

function mouseDragged() {
  if (geom === 'sphere') { rotY += movedX * 0.01; rotX += movedY * 0.01; return; }
  let R = Math.min(width, height - 140) * 0.45;
  if (geom === 'flat') R = Math.max(width, height) * 0.6;
  let w = [constrain(movedX / R, -0.2, 0.2), constrain(movedY / R, -0.2, 0.2)];
  for (let P of polys) {
    P.v = P.v.map((v) => geom === 'hyper' ? mobius(v, w) : [v[0] + w[0], v[1] + w[1]]);
    P.c = geom === 'hyper' ? mobius(P.c, w) : [P.c[0] + w[0], P.c[1] + w[1]];
  }
  renderPlane();
}
function mouseReleased() {
  if (geom === 'sphere' || !polys.length) return;
  // 中心にいちばん近い多角形から作り直す（端の欠けを埋める）
  let best = polys[0];
  for (let P of polys) if (Math.hypot(P.c[0], P.c[1]) < Math.hypot(best.c[0], best.c[1])) best = P;
  buildPlane({ v: best.v, c: best.c, d: 0 });
}

function keyPressed() {
  if (key === LEFT_ARROW) { p = Math.max(3, p - 1); build(); }
  if (key === RIGHT_ARROW) { p = Math.min(10, p + 1); build(); }
  if (key === UP_ARROW) { q = Math.min(10, q + 1); build(); }
  if (key === DOWN_ARROW) { q = Math.max(3, q - 1); build(); }
  if (key === 'r' || key === 'R') build();
  if (key === 's' || key === 'S') saveCanvas('pq_tiling', 'png');
}

// ---------- やってみよう ----------
// 1. q = 3 のまま p を 3, 4, 5, 6, 7 と増やそう。球 → 平面 → 双曲 と変わる境目は？
// 2. 正多面体が 5 つしかない理由を (p − 2)(q − 2) < 4 から説明しよう
// 3. {7, 3} をドラッグで動かすと、ふちの小さな七角形が真ん中に来て大きくなる。どれも同じ大きさの証拠
// 4. 調べてみよう：エッシャー『円の極限』とコクセター、かぎ針編みの双曲平面


// ==================================================
// ここから下は「幾何の道具」（鏡映・反転・メビウス変換）
// （中身は読まなくても OK。消さないでね）
// ==================================================
function key2(c) { return Math.round(c[0] * 1e5) + ',' + Math.round(c[1] * 1e5); }
function key3(c) { return Math.round(c[0] * 1e4) + ',' + Math.round(c[1] * 1e4) + ',' + Math.round(c[2] * 1e4); }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function unit3(a) { let l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function mirror3(v, nn) { let d = 2 * (v[0] * nn[0] + v[1] * nn[1] + v[2] * nn[2]); return [v[0] - d * nn[0], v[1] - d * nn[1], v[2] - d * nn[2]]; }

// 点 a, b を通る測地線（双曲：単位円に直交する円、平面：直線）
function geoCircle(a, b) {
  if (geom !== 'hyper') return null;
  // c·a = (|a|² + 1)/2, c·b = (|b|² + 1)/2 を解く
  let det = a[0] * b[1] - a[1] * b[0];
  if (Math.abs(det) < 1e-9) return null;                 // 原点を通る直径
  let ra = (a[0] * a[0] + a[1] * a[1] + 1) / 2, rb = (b[0] * b[0] + b[1] * b[1] + 1) / 2;
  let c = [(ra * b[1] - rb * a[1]) / det, (a[0] * rb - b[0] * ra) / det];
  return { c, r: Math.sqrt(Math.max(0, c[0] * c[0] + c[1] * c[1] - 1)) };
}
// 測地線で折り返す（円なら反転、直線なら鏡映）
function reflectGeo(z, a, b) {
  let g = geoCircle(a, b);
  if (!g) {
    let dx = b[0] - a[0], dy = b[1] - a[1];
    let t = ((z[0] - a[0]) * dx + (z[1] - a[1]) * dy) / (dx * dx + dy * dy);
    return [2 * (a[0] + t * dx) - z[0], 2 * (a[1] + t * dy) - z[1]];
  }
  let dx = z[0] - g.c[0], dy = z[1] - g.c[1], d2 = dx * dx + dy * dy || 1e-12;
  return [g.c[0] + (g.r * g.r * dx) / d2, g.c[1] + (g.r * g.r * dy) / d2];
}
// 測地線の弧を点の列で
function arcPts(a, b, m) {
  let g = geoCircle(a, b);
  if (!g || m <= 1) return [a];
  let t1 = Math.atan2(a[1] - g.c[1], a[0] - g.c[0]), t2 = Math.atan2(b[1] - g.c[1], b[0] - g.c[0]);
  let d = t2 - t1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  let out = [];
  for (let i = 0; i < m; i++) out.push([g.c[0] + g.r * Math.cos(t1 + (d * i) / m), g.c[1] + g.r * Math.sin(t1 + (d * i) / m)]);
  return out;
}
// 双曲の平行移動（メビウス変換）z → (z + w) / (1 + conj(w) z)
function mobius(z, w) {
  let nr = z[0] + w[0], ni = z[1] + w[1];
  let dr = 1 + (w[0] * z[0] + w[1] * z[1]), di = w[0] * z[1] - w[1] * z[0];
  let d2 = dr * dr + di * di;
  let out = [(nr * dr + ni * di) / d2, (ni * dr - nr * di) / d2];
  let l = Math.hypot(out[0], out[1]);
  if (l > 0.99999) { out[0] *= 0.99999 / l; out[1] *= 0.99999 / l; }
  return out;
}
function hsbToRgb(h, s, v) {
  let c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c, r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
