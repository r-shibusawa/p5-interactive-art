// ============================================
// 09 双曲平面（ポアンカレ円板）
// ガウス曲率がどこでも −1 の「双曲平面」を円板の中に描いた地図。円板のふちは無限に遠い
//   測地線（まっすぐな線）= ふちと直角に交わる円弧。タイルはすべて同じ大きさの正七角形（{7,3}：各頂点に 3 枚）
// 点 A・B をドラッグ = 測地線と距離 / 背景をドラッグ = 平面を平行移動（メビウス変換）/ T = タイル / C = 同じ半径の円 / ↑↓ = 円の半径 / R = もどす
// ============================================

let A = [-0.3, 0.1], B = [0.45, -0.2];   // 2 点（円板の中の座標、|z| < 1）
let showTiles = true, showCircles = true;
let rho = 0.8;                 // ★ 円の双曲半径
let polys = [];                // タイル（頂点の列）
let M = { a: [1, 0], b: [0, 0] };   // いまのメビウス変換 z → (a z + b) / (b̄ z + ā)
let drag = null, last = null;
let P = 7, Q = 3;              // ★ {p, q} タイル：正 p 角形が各頂点に q 枚（1/p + 1/q < 1/2 なら双曲）
let RD;                        // 円板の半径（px）

function setup() {
  createCanvas(windowWidth, windowHeight);
  RD = min(width * 0.36, height * 0.42);
  makeTiling();
}

// ---- 複素数の計算 ----
function cmul(a, b) { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function cdiv(a, b) { let d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
function cadd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function conj(a) { return [a[0], -a[1]]; }
function cabs2(a) { return a[0] * a[0] + a[1] * a[1]; }
function mob(m, z) { return cdiv(cadd(cmul(m.a, z), m.b), cadd(cmul(conj(m.b), z), conj(m.a))); }
function compose(m1, m2) {   // m1 ∘ m2
  let a = cadd(cmul(m1.a, m2.a), cmul(m1.b, conj(m2.b))), b = cadd(cmul(m1.a, m2.b), cmul(m1.b, conj(m2.a)));
  let s = Math.sqrt(cabs2(a) - cabs2(b));
  return { a: [a[0] / s, a[1] / s], b: [b[0] / s, b[1] / s] };
}
// ★ 双曲距離 d(z, w) = arcosh(1 + 2|z − w|² / ((1 − |z|²)(1 − |w|²)))
function hdist(z, w) { return Math.acosh(1 + (2 * cabs2([z[0] - w[0], z[1] - w[1]])) / ((1 - cabs2(z)) * (1 - cabs2(w)))); }

// 円 (中心 c, 半径 r) での反転（双曲平面の「鏡映」）
function invert(z, c, r) { let d = [z[0] - c[0], z[1] - c[1]], k = (r * r) / cabs2(d); return [c[0] + d[0] * k, c[1] + d[1] * k]; }
// 2 点を通る測地線の円（ふちと直角）。原点を通る直線なら null
function geoCircle(p, q) {
  let cr = p[0] * q[1] - p[1] * q[0];
  if (Math.abs(cr) < 1e-9) return null;
  // 中心 c は c·p = (1 + |p|²)/2、c·q = (1 + |q|²)/2 を満たす
  let a = (1 + cabs2(p)) / 2, b = (1 + cabs2(q)) / 2;
  let c = [(a * q[1] - b * p[1]) / cr, (b * p[0] - a * q[0]) / cr];
  return { c, r: Math.sqrt(cabs2(c) - 1) };
}
// p から q への測地線の弧を n 個の点で
function geoArc(p, q, n) {
  let g = geoCircle(p, q), out = [];
  if (!g) { for (let i = 0; i <= n; i++) out.push([p[0] + ((q[0] - p[0]) * i) / n, p[1] + ((q[1] - p[1]) * i) / n]); return out; }
  let a0 = Math.atan2(p[1] - g.c[1], p[0] - g.c[0]), a1 = Math.atan2(q[1] - g.c[1], q[0] - g.c[0]);
  let d = a1 - a0; while (d > PI) d -= TWO_PI; while (d < -PI) d += TWO_PI;
  for (let i = 0; i <= n; i++) out.push([g.c[0] + g.r * Math.cos(a0 + (d * i) / n), g.c[1] + g.r * Math.sin(a0 + (d * i) / n)]);
  return out;
}

// ★ {P, Q} タイルを、中心の正 P 角形から辺での鏡映をくり返してつくる
function makeTiling() {
  // 中心の多角形の頂点までの距離：双曲の直角三角形の公式 cosh R = cot(π/P) cot(π/Q)
  let ch = 1 / (Math.tan(PI / P) * Math.tan(PI / Q));               // cosh(頂点までの双曲距離)
  let r0 = Math.sqrt((ch - 1) / (ch + 1));                          // tanh(d/2)
  let first = [];
  for (let i = 0; i < P; i++) first.push([r0 * Math.cos((TWO_PI * i) / P + PI / P), r0 * Math.sin((TWO_PI * i) / P + PI / P)]);
  polys = [first];
  let seen = new Set([key0(first)]), queue = [first];
  while (queue.length && polys.length < 1200) {
    let poly = queue.shift();
    for (let i = 0; i < P; i++) {
      let p = poly[i], q = poly[(i + 1) % P], g = geoCircle(p, q);
      let img = poly.map((z) => (g ? invert(z, g.c, g.r) : reflectLine(z, p, q)));
      let c = center(img);
      if (cabs2(c) > 0.995 * 0.995) continue;
      let k = key0(img);
      if (!seen.has(k)) { seen.add(k); polys.push(img); queue.push(img); }
    }
  }
}
function reflectLine(z, p, q) { let d = [q[0] - p[0], q[1] - p[1]], l = cabs2(d), t = ((z[0] - p[0]) * d[0] + (z[1] - p[1]) * d[1]) / l; let f = [p[0] + d[0] * t, p[1] + d[1] * t]; return [2 * f[0] - z[0], 2 * f[1] - z[1]]; }
function center(poly) { let s = [0, 0]; for (let z of poly) { s[0] += z[0]; s[1] += z[1]; } return [s[0] / poly.length, s[1] / poly.length]; }
function key0(poly) { let c = center(poly); return Math.round(c[0] * 2000) + ',' + Math.round(c[1] * 2000); }

function scr(z) { return [width * 0.38 + z[0] * RD, height * 0.53 - z[1] * RD]; }
function unscr(x, y) { return [(x - width * 0.38) / RD, -(y - height * 0.53) / RD]; }

function draw() {
  background(16, 16, 26);
  let [cx, cy] = scr([0, 0]);
  noStroke(); fill(28, 34, 58); circle(cx, cy, 2 * RD);
  if (showTiles) {
    for (let k = 0; k < polys.length; k++) {
      let poly = polys[k].map((z) => mob(M, z));
      let c = center(poly);
      let size = Math.abs(poly[0][0] - c[0]) + Math.abs(poly[0][1] - c[1]);
      if (size * RD < 1.5) continue;                                // 小さすぎるタイルは省略
      let n = size * RD > 30 ? 8 : size * RD > 8 ? 3 : 1;          // 大きいタイルほど弧を細かく
      fill(k % 2 ? [70, 90, 160] : [110, 80, 170]); stroke(200, 210, 255, 120); strokeWeight(1);
      beginShape();
      for (let i = 0; i < P; i++) for (let z of geoArc(poly[i], poly[(i + 1) % P], n).slice(0, -1)) { let s = scr(z); vertex(s[0], s[1]); }
      endShape(CLOSE);
    }
  }
  noFill(); stroke(255, 160); strokeWeight(2); circle(cx, cy, 2 * RD);
  // A と B を通る測地線（ふちからふちまで）と、A から B への線分
  let g = geoCircle(A, B);
  stroke(255, 230, 90, 120); strokeWeight(2);
  if (g) {
    // 円板の中にある部分だけ
    beginShape(); noFill();
    for (let i = 0; i <= 200; i++) { let a = (i / 200) * TWO_PI, z = [g.c[0] + g.r * Math.cos(a), g.c[1] + g.r * Math.sin(a)]; if (cabs2(z) < 1) { let s = scr(z); vertex(s[0], s[1]); } else { endShape(); beginShape(); } }
    endShape();
  } else { let d = [B[0] - A[0], B[1] - A[1]], l = Math.sqrt(cabs2(d)), s1 = scr([d[0] / l, d[1] / l]), s2 = scr([-d[0] / l, -d[1] / l]); line(s1[0], s1[1], s2[0], s2[1]); }
  stroke(255, 230, 90); strokeWeight(4); noFill();
  beginShape(); for (let z of geoArc(A, B, 60)) { let s = scr(z); vertex(s[0], s[1]); } endShape();
  // 同じ双曲半径の円（ユークリッドでは、ふちに近いほど小さく見える）
  if (showCircles) {
    let centers = [[0, 0], [0.5, 0], [0.75, 0], [0.88, 0], [0.95, 0], [-0.3, -0.6], [-0.6, -0.65]];
    for (let c of centers) hcircle(c, [120, 255, 170]);
    hcircle(A, [255, 140, 140]);
  }
  for (let [z, nm] of [[A, 'A'], [B, 'B']]) { let s = scr(z); noStroke(); fill(255); circle(s[0], s[1], 16); textSize(18); text(nm, s[0] + 10, s[1] - 10); }

  noStroke(); fill(255); textSize(18);
  text('A・B をドラッグ：測地線　背景をドラッグ：平行移動　T：タイル ' + (showTiles ? 'ON' : 'off') + '　C：円 ' + (showCircles ? 'ON' : 'off') + '　↑↓：円の半径 ' + nf(rho, 1, 2) + '　R：もどす', 20, 40);
  fill(170); textSize(15);
  text('七角形のタイルはどれも同じ大きさ・同じ形（双曲平面の中では）。ふちに近いほど小さく見えるのは地図のゆがみ', 20, 68);
  let x = width * 0.72, y = 150;
  fill(0, 0, 0, 160); rect(x - 16, y - 34, width - x, 330, 10);
  fill(255, 230, 90); textSize(17);
  text('双曲距離 d(A, B) = ' + nf(hdist(A, B), 1, 3), x, y);
  fill(220); textSize(14);
  text('見た目の長さ |A − B| = ' + nf(Math.sqrt(cabs2([A[0] - B[0], A[1] - B[1]])), 1, 3), x, y + 26);
  text('原点から A までの距離 = ' + nf(hdist([0, 0], A), 1, 3), x, y + 50);
  text('（ふちまでは ∞）', x, y + 72);
  fill(170);
  text('距離の式：', x, y + 110);
  text('d = arcosh(1 + 2|z−w|² / ((1−|z|²)(1−|w|²)))', x, y + 132);
  text('緑の円はすべて双曲半径 ' + nf(rho, 1, 2) + '。', x, y + 166);
  text('ふちに近い円ほど小さく、中心もずれる', x, y + 188);
  text('三角形の内角の和 < 180°（K = −1）', x, y + 222);
  text('タイル {' + P + ',' + Q + '}：' + polys.length + ' 枚', x, y + 256);
}
// 双曲円：原点の円 |z| = tanh(ρ/2) を c へ平行移動
function hcircle(c, col) {
  let r = Math.tanh(rho / 2), s = Math.sqrt(1 - cabs2(c));
  let T = { a: [1 / s, 0], b: [c[0] / s, c[1] / s] };   // 原点を c へ送るメビウス変換
  noFill(); stroke(...col); strokeWeight(1.5);
  beginShape();
  for (let i = 0; i <= 60; i++) { let a = (i / 60) * TWO_PI, z = mob(T, [r * Math.cos(a), r * Math.sin(a)]), q = scr(z); vertex(q[0], q[1]); }
  endShape();
}

function mousePressed() {
  let z = unscr(mouseX, mouseY);
  drag = null;
  for (let [p, nm] of [[A, 'A'], [B, 'B']]) { let s = scr(p); if (dist(mouseX, mouseY, s[0], s[1]) < 16) drag = nm; }
  if (!drag && cabs2(z) < 1) drag = 'bg';
  last = z;
}
function mouseDragged() {
  let z = unscr(mouseX, mouseY);
  if (cabs2(z) > 0.985 * 0.985) { let l = Math.sqrt(cabs2(z)); z = [(z[0] / l) * 0.985, (z[1] / l) * 0.985]; }
  if (drag === 'A') A = z;
  if (drag === 'B') B = z;
  if (drag === 'bg' && last) {
    // last を z へ動かすメビウス変換（原点経由）を、今の変換に合成する
    let s1 = Math.sqrt(1 - cabs2(last)), s2 = Math.sqrt(1 - cabs2(z));
    let toO = { a: [1 / s1, 0], b: [-last[0] / s1, -last[1] / s1] }, fromO = { a: [1 / s2, 0], b: [z[0] / s2, z[1] / s2] };
    M = compose(fromO, compose(toO, M));
  }
  last = z;
}
function mouseReleased() { drag = null; }
function keyPressed() {
  if (key === 't' || key === 'T') showTiles = !showTiles;
  if (key === 'c' || key === 'C') showCircles = !showCircles;
  if (key === UP_ARROW) rho = min(3, rho + 0.1);
  if (key === DOWN_ARROW) rho = max(0.1, rho - 0.1);
  if (key === 'r' || key === 'R') { M = { a: [1, 0], b: [0, 0] }; A = [-0.3, 0.1]; B = [0.45, -0.2]; }
}

// ---------- やってみよう ----------
// 1. B をふちに近づける。見た目はあまり動かないのに d(A, B) がどんどん大きくなる
// 2. 背景をドラッグしてタイルを動かす。ふちの小さなタイルが中心に来ると、中心のタイルと同じ大きさになる
// 3. P = 5, Q = 4 や P = 4, Q = 5 に変えると別のタイル。P = 6, Q = 3 だと平面（1/p + 1/q = 1/2）になって作れない
// 4. A, B と 3 つ目の点で三角形を描き、内角の和を測ってみよう（180° より小さい）
