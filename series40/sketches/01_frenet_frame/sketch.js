// ============================================
// 01 空間曲線のフレネ標構（T, N, B）
// 曲線の上を動く「小さな座標系」。T = 進む向き（接線）、N = 曲がる向き（主法線）、B = T × N（従法線）
//   曲率 κ = |r' × r''| / |r'|³ …… どれだけ曲がるか（接触円の半径は 1/κ）
//   捩率 τ = (r' × r'')·r''' / |r' × r''|² …… 平面から「ねじれて」飛び出す速さ（平面曲線なら 0）
// 1〜5 = 曲線（らせん・トレフォイル結び目・(3,5) トーラス結び目・ビビアニ曲線・ねじれた 8 の字）/ スペース = 一時停止 / ←→ = 速さ / ドラッグ = 視点を回す
// ============================================

let curveNo = 1;
let t = 0, speed = 0.006;        // ★ 曲線の上を動く速さ
let paused = false;
let scaleF = 130;                // ★ 曲線の大きさ（px）
let hud, trail = [];
let names = ['らせん', 'トレフォイル結び目', '(3,5) トーラス結び目', 'ビビアニ曲線（球 ∩ 円柱）', 'ねじれた 8 の字'];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(width, height); hud.colorMode(HSB, 360, 100, 100, 100);
}

// ★ 曲線 r(t)（t は 0〜1 で一周）。戻り値は [x, y, z]（px）
function curvePt(s) {
  let a = s * TWO_PI;
  if (curveNo === 1) return [1.2 * Math.cos(2 * a), 0.4 * (s - 0.5) * 6, 1.2 * Math.sin(2 * a)].map((v) => v * scaleF);     // らせん（2 巻き）
  if (curveNo === 2) return [Math.sin(a) + 2 * Math.sin(2 * a), Math.cos(a) - 2 * Math.cos(2 * a), -Math.sin(3 * a)].map((v) => v * scaleF * 0.5);
  if (curveNo === 3) { let p = 3, q = 5, r = 2 + Math.cos(q * a); return [r * Math.cos(p * a), r * Math.sin(p * a), Math.sin(q * a)].map((v) => v * scaleF * 0.55); }
  if (curveNo === 4) { let b = 2 * a; return [1 + Math.cos(b), Math.sin(b), 2 * Math.sin(b / 2)].map((v) => v * scaleF * 0.8); }
  return [1.6 * Math.sin(a), 0.9 * Math.sin(2 * a), 0.9 * Math.cos(3 * a)].map((v) => v * scaleF);
}

// 差分で r', r'', r''' を求め、フレネ標構と κ, τ を返す
function frenet(s) {
  let d = 0.002;
  let p = curvePt(s), p1 = curvePt(s + d), m1 = curvePt(s - d), p2 = curvePt(s + 2 * d), m2 = curvePt(s - 2 * d);
  let v1 = sub3(p1, m1).map((v) => v / (2 * d));                                         // r'
  let v2 = [0, 1, 2].map((i) => (p1[i] - 2 * p[i] + m1[i]) / (d * d));                    // r''
  let v3 = [0, 1, 2].map((i) => (p2[i] - 2 * p1[i] + 2 * m1[i] - m2[i]) / (2 * d * d * d)); // r'''
  let c = cross3(v1, v2), cl = len3(c), vl = len3(v1);
  let T = v1.map((v) => v / (vl || 1));
  let B = cl > 1e-9 ? c.map((v) => v / cl) : [0, 0, 1];
  let N = cross3(B, T);
  let kappa = cl / Math.pow(vl || 1, 3);
  let tau = cl > 1e-9 ? dot3(c, v3) / (cl * cl) : 0;
  return { p, T, N, B, kappa, tau };
}

function draw() {
  background(230, 30, 9);
  if (!paused) t = (t + speed) % 1;
  if (keyIsDown(LEFT_ARROW)) speed = Math.max(0.0005, speed * 0.97);
  if (keyIsDown(RIGHT_ARROW)) speed = Math.min(0.03, speed * 1.03);

  let f = frenet(t);
  trail.push({ p: f.p, N: f.N, k: f.kappa });
  if (trail.length > 90) trail.shift();

  push();
  rotateX(rotX); rotateY(rotY);
  // 曲線（曲率で色：κ 大 = 赤、小 = 水色）
  noFill(); strokeWeight(2.5);
  let n = 400, prev = curvePt(0);
  for (let i = 1; i <= n; i++) {
    let s = i / n, q = curvePt(s), k = frenet(s - 0.5 / n).kappa * scaleF;
    stroke(200 - Math.min(1, k / 2.5) * 200, 70, 100, 85);
    line(prev[0], prev[1], prev[2], q[0], q[1], q[2]);
    prev = q;
  }
  // これまでの主法線の軌跡（曲がる向きが回っていく様子）
  strokeWeight(1);
  for (let i = 0; i < trail.length; i++) {
    let tr = trail[i], L = 28;
    stroke(130, 70, 100, (i / trail.length) * 45);
    line(tr.p[0], tr.p[1], tr.p[2], tr.p[0] + tr.N[0] * L, tr.p[1] + tr.N[1] * L, tr.p[2] + tr.N[2] * L);
  }
  // 接触円（半径 1/κ、T-N 平面の中、中心は p + N/κ）
  let r = 1 / Math.max(f.kappa, 1e-6);
  if (r < 900) {
    let c = [0, 1, 2].map((i) => f.p[i] + f.N[i] * r);
    stroke(45, 90, 100, 60); strokeWeight(1.5); noFill();
    beginShape();
    for (let i = 0; i <= 64; i++) { let a = (i / 64) * TWO_PI; vertex(c[0] + r * (Math.cos(a) * f.T[0] + Math.sin(a) * f.N[0]), c[1] + r * (Math.cos(a) * f.T[1] + Math.sin(a) * f.N[1]), c[2] + r * (Math.cos(a) * f.T[2] + Math.sin(a) * f.N[2])); }
    endShape();
  }
  // 標構の矢印
  arrow3(f.p, f.T, 70, 0);
  arrow3(f.p, f.N, 70, 130);
  arrow3(f.p, f.B, 70, 215);
  push(); translate(f.p[0], f.p[1], f.p[2]); noStroke(); fill(0, 0, 100); sphere(6); pop();
  pop();

  // HUD
  hud.clear(); hud.noStroke();
  hud.fill(0, 0, 100); hud.textSize(18);
  hud.text('1〜5：曲線（' + names[curveNo - 1] + '）　スペース：' + (paused ? '再開' : '一時停止') + '　←→：速さ　ドラッグ：視点', 20, 40);
  hud.fill(0, 0, 65); hud.textSize(15);
  hud.text('赤 T = 接線　緑 N = 主法線（曲がる向き）　青 B = 従法線　黄色 = 接触円（半径 1/κ）　緑の薄い線 = N の軌跡', 20, 66);
  hud.fill(0, 0, 100, 8); hud.rect(20, height - 120, 420, 96, 10);
  hud.fill(0, 0, 100); hud.textSize(22);
  hud.text('κ = ' + nf(f.kappa * scaleF, 1, 3) + '　（1/κ = ' + nf(1 / Math.max(f.kappa, 1e-6), 1, 0) + ' px）', 36, height - 86);
  hud.text('τ = ' + nf(f.tau * scaleF, 1, 3) + (Math.abs(f.tau * scaleF) < 0.02 ? '　（≈ 0：平面的）' : f.tau > 0 ? '　（右ねじ）' : '　（左ねじ）'), 36, height - 50);
  // κ・τ の小さなグラフ（曲線一周ぶん）
  let gx = width - 420, gy = height - 150, gw = 400, gh = 120;
  hud.fill(0, 0, 100, 8); hud.rect(gx, gy, gw, gh, 10);
  hud.noFill(); hud.strokeWeight(2);
  for (let which of [0, 1]) {
    hud.stroke(which === 0 ? 0 : 215, 70, 100);
    hud.beginShape();
    for (let i = 0; i <= 120; i++) { let g = frenet(i / 120), v = which === 0 ? g.kappa * scaleF : g.tau * scaleF; hud.vertex(gx + (i / 120) * gw, gy + gh / 2 - Math.max(-1, Math.min(1, v / 3)) * gh * 0.45); }
    hud.endShape();
  }
  hud.stroke(45, 90, 100); hud.line(gx + t * gw, gy, gx + t * gw, gy + gh);
  hud.noStroke(); hud.fill(0, 0, 60); hud.textSize(13);
  hud.text('一周ぶんの κ（赤）と τ（青）', gx + 8, gy + 18);
  showHud();
}

function arrow3(p, d, L, hue) {
  stroke(hue, 80, 100); strokeWeight(3);
  line(p[0], p[1], p[2], p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L);
  push(); translate(p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L); noStroke(); fill(hue, 80, 100); sphere(4); pop();
}

function keyPressed() {
  if (key >= '1' && key <= '5') { curveNo = +key; trail = []; }
  if (key === ' ') paused = !paused;
}
function mouseDragged() { rotY += (mouseX - pmouseX) * 0.01; rotX = constrain(rotX + (mouseY - pmouseY) * 0.01, -1.6, 1.6); }

// ---------- やってみよう ----------
// 1. らせん（1）は κ も τ も一定。グラフが平らなのを確かめよう。半径や巻き数を変えると κ と τ はどう変わる？
// 2. ビビアニ曲線（4）で τ の符号が変わる所を探そう。そこでは B がひっくり返りそうになる
// 3. curvePt に自分の曲線を足してみよう（例：[cos a, sin a, 0] の平面曲線 → τ = 0 になる？）
// 4. 接触円の半径 1/κ が大きい所と小さい所で、曲線の見た目がどう違うか

// ==================================================
// ここから下は「3D の道具」です（ベクトル計算・視点の回転・HUD の重ね描き）
// （中身は読まなくても OK。消さないでね）
// ==================================================
let rotX = -0.5, rotY = 0.6;
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function len3(a) { return Math.sqrt(dot3(a, a)); }
function showHud() { drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT); image(hud, -width / 2, -height / 2); }
