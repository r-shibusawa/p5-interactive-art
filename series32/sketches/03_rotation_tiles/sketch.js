// ============================================
// 03 回転で作るタイル
// 辺の真ん中のまわりに 180° 回したコピーを並べると、どんな三角形も・どんな四角形も平面を埋める
//   辺を「真ん中で点対称な曲線（C カーブ）」に変えても、まだぴったりかみ合う
// 大きい点 = 頂点をドラッグ / 小さい点 = 辺の曲がりをドラッグ / 3・4 = 三角形・四角形 / C = 曲線 / R = 戻す / S = 保存
// ============================================

let sides = 4;          // ★ 3 = 三角形、4 = 四角形
let curves = true;      // ★ 辺を C カーブにする
let P = [];             // 頂点（画面の座標）
let H = [];             // 辺ごとの曲がり { s: 辺にそった位置 0〜0.5, u: 横へのずれ（辺の長さに対する割合） }
let drag = null;
let showLattice = false;

let colA = [255, 170, 80], colB = [70, 150, 220];   // ★ もとのタイルと 180° 回したタイルの色

function setup() {
  createCanvas(windowWidth, windowHeight);
  reset();
}

function reset() {
  let cx = width / 2, cy = height / 2;
  if (sides === 3) P = [[cx - 90, cy + 60], [cx + 110, cy + 50], [cx - 10, cy - 100]];
  else P = [[cx - 100, cy + 70], [cx + 90, cy + 80], [cx + 120, cy - 60], [cx - 60, cy - 90]];
  H = P.map((_, i) => ({ s: 0.28, u: i % 2 === 0 ? 0.18 : -0.15 }));
}

function draw() {
  background(22, 24, 32);
  let A = P[0], B = P[1];
  let shape = outlinePts();
  // 平行移動の 2 つの向き（三角形：C−A と B−A、四角形：2 本の対角線 C−A と D−B）
  let t1 = sub2(P[2], P[0]);
  let t2 = sides === 3 ? sub2(P[1], P[0]) : sub2(P[3], P[1]);
  let det = t1[0] * t2[1] - t1[1] * t2[0];
  let ok = Math.abs(det) > 200 && isSimple(P);

  if (ok) {
    stroke(22, 24, 32);
    strokeWeight(2);
    let R = 14;
    for (let i = -R; i <= R; i++) {
      for (let j = -R; j <= R; j++) {
        let ox = i * t1[0] + j * t2[0], oy = i * t1[1] + j * t2[1];
        if (Math.abs(A[0] + ox - width / 2) > width * 0.75 || Math.abs(A[1] + oy - height / 2) > height * 0.8) continue;
        let shade = ((i + j) % 2 === 0) ? 1 : 0.82;
        // もとのタイル
        fill(colA[0] * shade, colA[1] * shade, colA[2] * shade);
        drawPts(shape, ox, oy, 1, 0, 0);
        // 辺 AB の真ん中のまわりに 180° 回したタイル：点 p → (A + B) − p
        fill(colB[0] * shade, colB[1] * shade, colB[2] * shade);
        drawPts(shape, ox, oy, -1, A[0] + B[0], A[1] + B[1]);
      }
    }
  }
  // もとのタイルを強調
  noFill();
  stroke(255);
  strokeWeight(3);
  drawPts(shape, 0, 0, 1, 0, 0);
  // 回転の中心（辺の真ん中）
  for (let i = 0; i < sides; i++) {
    let m = mid2(P[i], P[(i + 1) % sides]);
    noStroke();
    fill(255, 80, 80);
    circle(m[0], m[1], 7);
  }
  // 点
  for (let i = 0; i < sides; i++) {
    fill(255);
    stroke(20);
    strokeWeight(2);
    circle(P[i][0], P[i][1], 18);
    if (curves) {
      let h = handlePos(i);
      fill(255, 230, 120);
      circle(h[0], h[1], 11);
    }
  }
  if (showLattice && ok) {
    stroke(255, 255, 255, 160);
    strokeWeight(2);
    line(A[0], A[1], A[0] + t1[0], A[1] + t1[1]);
    line(A[0], A[1], A[0] + t2[0], A[1] + t2[1]);
  }

  noStroke();
  fill(0, 0, 0, 170);
  rect(10, 10, 660, 100, 8);
  fill(255);
  textSize(19);
  text((sides === 3 ? 'どんな三角形' : 'どんな四角形') + 'でも埋まる ─ 赤い点（辺の真ん中）のまわりに 180° 回す', 22, 38);
  textSize(15);
  fill(200);
  text('オレンジ = もとのタイル、青 = 180° 回したタイル。頂点をドラッグして形を変えよう', 22, 64);
  text(ok ? '角の合計：' + (sides === 3 ? '三角形 180° × 2 枚 = 360°' : '四角形の 4 つの角が 1 点に集まって 360°') + '　C 曲線 ' + (curves ? 'ON' : 'OFF') + '　L 格子'
    : '辺が交差している・つぶれている → タイルにならない', 22, 90);
}

// 曲がりのハンドルの位置（辺 i の上）
function handlePos(i) {
  let a = P[i], b = P[(i + 1) % sides];
  let d = sub2(b, a), len = Math.hypot(d[0], d[1]) || 1;
  let nx = -d[1] / len, ny = d[0] / len;
  return [a[0] + d[0] * H[i].s + nx * H[i].u * len, a[1] + d[1] * H[i].s + ny * H[i].u * len];
}

// ★ タイルの輪郭：辺ごとに [始点, ハンドル, 点対称なハンドル, 終点] をなめらかにつなぐ
function outlinePts() {
  let out = [];
  for (let i = 0; i < sides; i++) {
    let a = P[i], b = P[(i + 1) % sides];
    if (!curves) { out.push(a); continue; }
    let h = handlePos(i);
    let h2 = [a[0] + b[0] - h[0], a[1] + b[1] - h[1]];   // 辺の真ん中について点対称
    let seg = smoothLine([a, h, h2, b], 8);
    for (let k = 0; k < seg.length - 1; k++) out.push(seg[k]);
  }
  return out;
}

function mousePressed() {
  drag = null;
  let bd = 22;
  for (let i = 0; i < sides; i++) {
    let d = Math.hypot(P[i][0] - mouseX, P[i][1] - mouseY);
    if (d < bd) { bd = d; drag = { type: 'v', i }; }
    if (curves) {
      let h = handlePos(i);
      d = Math.hypot(h[0] - mouseX, h[1] - mouseY);
      if (d < bd) { bd = d; drag = { type: 'h', i }; }
    }
  }
}
function mouseDragged() {
  if (!drag) return;
  let i = drag.i;
  if (drag.type === 'v') { P[i] = [constrain(mouseX, 20, width - 20), constrain(mouseY, 20, height - 20)]; return; }
  // ハンドル：マウスの位置を「辺にそった位置 s」と「横へのずれ u」に直す
  let a = P[i], b = P[(i + 1) % sides];
  let d = sub2(b, a), len2 = d[0] * d[0] + d[1] * d[1] || 1, len = Math.sqrt(len2);
  let m = [mouseX - a[0], mouseY - a[1]];
  H[i].s = constrain((m[0] * d[0] + m[1] * d[1]) / len2, 0.05, 0.45);
  H[i].u = constrain((m[0] * -d[1] + m[1] * d[0]) / len2, -0.4, 0.4);
}
function mouseReleased() { drag = null; }

function keyPressed() {
  if (key === '3' || key === '4') { sides = int(key); reset(); }
  if (key === 'c' || key === 'C') curves = !curves;
  if (key === 'r' || key === 'R') reset();
  if (key === 'l' || key === 'L') showLattice = !showLattice;
  if (key === 's' || key === 'S') saveCanvas('rotation_tile', 'png');
}

// ---------- やってみよう ----------
// 1. 四角形をへこんだ形（矢じり形）にしても埋まる？ 交差させると？
// 2. C を OFF にして、1 つの頂点に 4 つの角（四角形）/ 6 つの角（三角形）が集まっているのを確かめよう
// 3. 曲がりを使って、くるっと回るとかみ合う「魚」や「鳥」をデザインしよう
// 4. L で格子を表示。平行移動の向きが「対角線」になっているのはなぜ？


// ==================================================
// ここから下は「図形の道具」
// ==================================================
function sub2(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function mid2(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

// 輪郭を描く：sgn = 1 ならずらすだけ、−1 なら (cx, cy) − 点（180° 回転）
function drawPts(pts, ox, oy, sgn, cx, cy) {
  beginShape();
  for (let p of pts) vertex(cx + sgn * p[0] + ox, cy + sgn * p[1] + oy);
  endShape(CLOSE);
}

// 多角形の辺が交差していないか
function isSimple(pts) {
  let n = pts.length;
  let o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      let a = pts[i], b = pts[(i + 1) % n], c = pts[j], d = pts[(j + 1) % n];
      if (o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0) return false;
    }
  }
  return true;
}

function smoothLine(pts, seg) {
  let out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    let p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      let t = s / seg, t2 = t * t, t3 = t2 * t;
      let f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
