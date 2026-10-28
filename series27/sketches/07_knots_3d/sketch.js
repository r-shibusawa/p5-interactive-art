// ============================================
// 07 結び目（3D）
// ひもの両端をつないだ輪が「結び目」。ほどけない（切らずに丸い輪に戻せない）結び目はたくさんある
//   トーラス（ドーナツ）の表面を、まわりに p 回・穴を q 回まわる曲線 ＝ トーラス結び目 (p, q)。右は真上から見た図（交点の上下つき）
// ←→ = p / ↑↓ = q / 8 = 8 の字結び目 / T = トーラス結び目に戻す / スペース = 回転を止める / ドラッグ = 視点
// ============================================

let p = 2, q = 3;             // ★ トーラス結び目の (p, q)
let kind = 'torus';
let geom = null, diag;
let rotX = -0.9, rotY = 0, spin = true;
let hud, S;
let nPts = 360;               // ★ 曲線の点の数
let tubeR = 0.13;             // ★ チューブの太さ
let info = {};

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hud = createGraphics(width, height);
  diag = createGraphics(round(min(width * 0.36, height * 0.6)), round(min(width * 0.36, height * 0.6)));
  S = min(width, height) * 0.13;
  rebuild();
}
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

// 曲線（成分ごとの点のリスト）をつくる。座標は x, y が水平面、z が高さ
function curves() {
  if (kind === 'eight') {
    let c = [];
    for (let i = 0; i < nPts; i++) { let t = (i / nPts) * TWO_PI; c.push([(2 + Math.cos(2 * t)) * Math.cos(3 * t), (2 + Math.cos(2 * t)) * Math.sin(3 * t), Math.sin(4 * t)]); }
    return [c];
  }
  // ★ トーラス結び目：まわりの角度 φ = p t、チューブのまわりの角度 θ = q t
  let d = gcd(p, q), pp = p / d, qq = q / d, out = [];
  for (let k = 0; k < d; k++) {
    let c = [];
    for (let i = 0; i < nPts; i++) {
      let t = (i / nPts) * TWO_PI;
      let r = 2 + Math.cos(qq * t + (TWO_PI * k) / d);
      c.push([r * Math.cos(pp * t), r * Math.sin(pp * t), -Math.sin(qq * t + (TWO_PI * k) / d)]);
    }
    out.push(c);
  }
  return out;
}

function rebuild() {
  let cs = curves(), cols = [[255, 140, 70], [90, 200, 255], [150, 240, 120], [255, 110, 200], [250, 230, 90], [180, 150, 255], [255, 255, 255], [120, 255, 220], [255, 90, 90]];
  geom = buildGeometry(() => { cs.forEach((c, k) => { fill(...cols[k % cols.length]); tube(c); }); });
  // 情報
  let d = gcd(p, q);
  if (kind === 'eight') info = { title: '8 の字結び目', cross: 4, comps: 1, note: '交点 4 つ。トーラス結び目ではない。三彩色（08）できない' };
  else if (p === 1 || q === 1) info = { title: '自明な結び目（ほどける）', cross: 0, comps: 1, note: 'p か q が 1 だと、ただの輪に戻せる' };
  else if (d > 1) info = { title: '絡み目（' + d + ' 本の輪）', cross: '—', comps: d, note: 'p と q の最大公約数 ' + d + ' → ' + d + ' 本の輪がからまる' };
  else {
    let names = { '2,3': '三葉結び目', '3,2': '三葉結び目', '2,5': '五葉結び目', '5,2': '五葉結び目', '2,7': '七葉結び目', '7,2': '七葉結び目', '3,4': '8₁₉', '4,3': '8₁₉', '3,5': '10₁₂₄', '5,3': '10₁₂₄' };
    info = { title: 'トーラス結び目 (' + p + ', ' + q + ')' + (names[p + ',' + q] ? ' ＝ ' + names[p + ',' + q] : ''), cross: min(p * (q - 1), q * (p - 1)), comps: 1, note: '最小交点数 = min(p(q−1), q(p−1))。(p, q) と (q, p) は同じ結び目' };
  }
  drawDiagram(cs, cols);
}

function draw() {
  background(12, 14, 24);
  if (mouseIsPressed) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -2.5, 0.5); }
  else if (spin) rotY += 0.005;
  push();
  translate(-width * 0.17, 20, 0);
  rotateX(rotX); rotateZ(rotY);
  ambientLight(90); directionalLight(255, 255, 255, 0.3, 0.5, -0.8); pointLight(120, 120, 160, 0, -400, 400);
  specularMaterial(60); shininess(30);
  noStroke(); scale(S);
  model(geom);
  pop();

  hud.clear(); hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('←→：p = ' + p + '　↑↓：q = ' + q + '　8：8 の字結び目　T：トーラス結び目　スペース：回転 ' + (spin ? 'ON' : 'off') + '　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('結び目の図：交点で下を通るひもを切って描く。図の交点の数は見る向きで変わるが、「最小交点数」は結び目ごとに決まった数', 20, 68);
  let X0 = width - diag.width - 50, Y0 = 120;
  hud.image(diag, X0, Y0);
  hud.fill(255, 230, 120); hud.textSize(26); hud.text(info.title, X0 - 40, Y0 + diag.height + 46);
  hud.fill(255); hud.textSize(18);
  hud.text('この図の交点：' + info.diagCross + '　最小交点数：' + info.cross + '　輪の数：' + info.comps, X0 - 40, Y0 + diag.height + 80);
  hud.fill(170); hud.textSize(15); hud.text(info.note, X0 - 40, Y0 + diag.height + 108);
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);
  image(hud, -width / 2, -height / 2);
}

function keyPressed() {
  let old = [p, q, kind];
  if (key === RIGHT_ARROW) { p = min(9, p + 1); kind = 'torus'; }
  if (key === LEFT_ARROW) { p = max(1, p - 1); kind = 'torus'; }
  if (key === UP_ARROW) { q = min(9, q + 1); kind = 'torus'; }
  if (key === DOWN_ARROW) { q = max(1, q - 1); kind = 'torus'; }
  if (key === '8') kind = 'eight';
  if (key === 't' || key === 'T') kind = 'torus';
  if (key === ' ') spin = !spin;
  if (old[0] !== p || old[1] !== q || old[2] !== kind) { freeGeometry(geom); rebuild(); }
}

// ---------- やってみよう ----------
// 1. (2, 3) と (3, 2) を見比べよう。形はちがうのに同じ結び目（三葉結び目）
// 2. (2, 4) や (3, 6) にすると輪が何本になる？ 最大公約数との関係は？
// 3. 右の図の交点の数と最小交点数がいちばん近くなる見る向きを探そう（(3, 4) は？）
// 4. curves() に自分の式（たとえば x = sin t + 2 sin 2t, y = cos t − 2 cos 2t, z = −sin 3t）を足してみよう


// ==================================================
// ここから下は「チューブと結び目の図の道具」
// ==================================================
// 曲線のまわりにチューブ（平行移動フレームで、つなぎ目のねじれを補正）
function tube(c) {
  let n = c.length, sides = 10, T = [], Nn = [], B = [];
  let sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], nrm = (a) => { let m = Math.hypot(...a) || 1; return a.map((x) => x / m); };
  let crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  for (let i = 0; i < n; i++) T.push(nrm(sub(c[(i + 1) % n], c[(i - 1 + n) % n])));
  let N0 = nrm(crs(T[0], Math.abs(T[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), cur = N0;
  for (let i = 0; i < n; i++) { let d = dt(cur, T[i]); cur = nrm(cur.map((x, k) => x - d * T[i][k])); Nn.push(cur); }
  let d0 = dt(cur, T[0]), end = nrm(cur.map((x, k) => x - d0 * T[0][k]));
  let alpha = Math.atan2(dt(crs(end, N0), T[0]), dt(end, N0));
  for (let i = 0; i < n; i++) {
    let a = (alpha * i) / n, b0 = crs(T[i], Nn[i]);
    let nn = Nn[i].map((x, k) => x * Math.cos(a) + b0[k] * Math.sin(a));
    Nn[i] = nn; B.push(crs(T[i], nn));
  }
  for (let i = 0; i < n; i++) {
    let j = (i + 1) % n;
    beginShape(TRIANGLE_STRIP);
    for (let s = 0; s <= sides; s++) {
      let a = (s / sides) * TWO_PI, ca = Math.cos(a) * tubeR, sa = Math.sin(a) * tubeR;
      for (let k of [i, j]) {
        let nx = Nn[k][0] * ca + B[k][0] * sa, ny = Nn[k][1] * ca + B[k][1] * sa, nz = Nn[k][2] * ca + B[k][2] * sa;
        normal(nx, ny, nz); vertex(c[k][0] + nx, c[k][1] + ny, c[k][2] + nz);
      }
    }
    endShape();
  }
}
// 真上から見た結び目の図：下を通るところにすき間をあける
function drawDiagram(cs, cols) {
  let g = diag, W = g.width, sc = W / 7, segs = [];
  cs.forEach((c, k) => { for (let i = 0; i < c.length; i += 2) segs.push({ a: c[i], b: c[(i + 2) % c.length], k }); });
  let under = new Set(), count = 0;
  for (let i = 0; i < segs.length; i++) for (let j = i + 2; j < segs.length; j++) {
    if (i === 0 && j === segs.length - 1) continue;
    let A = segs[i], Bs = segs[j];
    let r = segHit(A.a, A.b, Bs.a, Bs.b);
    if (!r) continue;
    count++;
    let zi = A.a[2] + (A.b[2] - A.a[2]) * r[0], zj = Bs.a[2] + (Bs.b[2] - Bs.a[2]) * r[1];
    let u = zi < zj ? i : j;
    under.add(u); if (u > 0 && segs[u - 1].k === segs[u].k) under.add(u - 1);   // 下を通る側にすき間
  }
  info.diagCross = count;
  g.clear(); g.background(255, 255, 255, 12); g.strokeWeight(4); g.noFill();
  segs.forEach((s, i) => {
    if (under.has(i)) return;
    g.stroke(...cols[s.k % cols.length]);
    g.line(W / 2 + s.a[0] * sc, W / 2 - s.a[1] * sc, W / 2 + s.b[0] * sc, W / 2 - s.b[1] * sc);
  });
}
function segHit(p1, p2, p3, p4) {
  let d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-12) return null;
  let t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  let u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  return t >= 0 && t < 1 && u >= 0 && u < 1 ? [t, u] : null;
}
