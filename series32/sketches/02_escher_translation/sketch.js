// ============================================
// 02 エッシャー風の変形タイル（平行移動）
// 正方形や正六角形の 1 つの辺をへこませたら、向かいの辺を「同じ形」でふくらませる
//   → 平行移動しただけでぴったりかみ合う。エッシャーのトカゲや鳥のタイルの基本
// 真ん中のタイルの白い点をドラッグ / 1 = 正方形 2 = 正六角形 / N = ランダム / R = 戻す / E = 目 / C = 色 / S = 保存
// ============================================

let base = 1;           // ★ 1 = 正方形、2 = 正六角形
let cell = 150;         // ★ タイルの大きさ（ピクセル）
let K = 3;              // ★ 1 辺あたりの動かせる点の数
let smoothOn = true;    // ★ 辺をなめらかにする
let eyes = true;
let colorSet = 0;
let V = [];             // もとの多角形の頂点（タイルの中心が原点）
let offs = [];          // offs[辺][点] = まっすぐな辺からのずれ [dx, dy]
let outline = [];       // できあがったタイルの輪郭
let drag = null;        // ドラッグ中の点 { e, k, sign }

let palettes = [
  [[240, 120, 90], [250, 200, 90], [90, 170, 230]],
  [[60, 70, 110], [230, 230, 220], [200, 80, 90]],
  [[120, 200, 150], [40, 120, 110], [240, 220, 160]],
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  makeBase();
}

function makeBase() {
  V = [];
  let m = base === 1 ? 4 : 6;
  for (let i = 0; i < m; i++) {
    let a = base === 1 ? PI / 4 + (i * TWO_PI) / 4 + PI : PI / 6 + (i * TWO_PI) / 6 + PI;
    let r = base === 1 ? cell / Math.SQRT2 : cell / 1.8;
    V.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  offs = [];
  for (let e = 0; e < m / 2; e++) offs.push(Array.from({ length: K }, () => [0, 0]));
  rebuild();
}

function draw() {
  background(20, 22, 30);
  let m = V.length;
  let [a1, a2] = latticeVectors();
  let pal = palettes[colorSet];
  push();
  translate(width / 2, height / 2);
  let range = Math.ceil(Math.max(width, height) / cell) + 2;
  stroke(20, 22, 30);
  strokeWeight(2);
  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      let ox = i * a1[0] + j * a2[0], oy = i * a1[1] + j * a2[1];
      if (Math.abs(ox) > width / 2 + cell * 1.5 || Math.abs(oy) > height / 2 + cell * 1.5) continue;
      let ci = base === 1 ? ((i + j) % 2 + 2) % 2 : (((i - j) % 3) + 3) % 3;
      fill(pal[ci][0], pal[ci][1], pal[ci][2]);
      push();
      translate(ox, oy);
      beginShape();
      for (let p of outline) vertex(p[0], p[1]);
      endShape(CLOSE);
      if (eyes) drawEye(cell * 0.12, -cell * 0.1);
      pop();
    }
  }
  // 真ん中のタイル：辺と動かせる点
  noFill();
  stroke(255);
  strokeWeight(3);
  beginShape();
  for (let p of outline) vertex(p[0], p[1]);
  endShape(CLOSE);
  for (let h of handles()) {
    fill(h.e === (drag && drag.e) ? 255 : 230);
    stroke(20);
    strokeWeight(2);
    circle(h.x, h.y, h.sign > 0 ? 14 : 9);
  }
  pop();

  noStroke();
  fill(0, 0, 0, 160);
  rect(10, 10, 620, 76, 8);
  fill(255);
  textSize(19);
  text((base === 1 ? '正方形' : '正六角形') + 'からつくる平行移動タイル　（1 / 2 で切りかえ）', 22, 38);
  textSize(15);
  fill(200);
  text('白い点をドラッグ → 向かいの辺も同じ形で動く（大きい点 ↔ 小さい点がペア）。N ランダム R 戻す', 22, 66);
}

// 平行移動の 2 つの向き
function latticeVectors() {
  if (base === 1) return [[V[1][0] - V[0][0], V[1][1] - V[0][1]], [V[3][0] - V[0][0], V[3][1] - V[0][1]]];
  return [[V[4][0] - V[0][0], V[4][1] - V[0][1]], [V[5][0] - V[1][0], V[5][1] - V[1][1]]];
}

// ★ 辺 e の点の列（まっすぐな辺 + ずれ）
function edgePoints(e) {
  let a = V[e], b = V[(e + 1) % V.length];
  let pts = [a];
  for (let k = 0; k < K; k++) {
    let t = (k + 1) / (K + 1);
    pts.push([a[0] + (b[0] - a[0]) * t + offs[e][k][0], a[1] + (b[1] - a[1]) * t + offs[e][k][1]]);
  }
  pts.push(b);
  return smoothOn ? smoothLine(pts, 8) : pts;
}

// 輪郭：前半の辺はそのまま、後半の辺は「向かいの辺を平行移動して逆向き」にしたもの
function rebuild() {
  let m = V.length, h = m / 2;
  outline = [];
  for (let e = 0; e < m; e++) {
    let pts;
    if (e < h) pts = edgePoints(e);
    else {
      let src = edgePoints(e - h);
      let T = [V[(e + 1) % m][0] - V[e - h][0], V[(e + 1) % m][1] - V[e - h][1]];
      pts = src.map((p) => [p[0] + T[0], p[1] + T[1]]).reverse();
    }
    for (let i = 0; i < pts.length - 1; i++) outline.push(pts[i]);
  }
}

// 動かせる点（もとの辺の点 sign = +1 と、向かいの辺のコピー sign = −1）
function handles() {
  let m = V.length, h = m / 2, out = [];
  for (let e = 0; e < h; e++) {
    let a = V[e], b = V[e + 1];
    let T = [V[(e + h + 1) % m][0] - a[0], V[(e + h + 1) % m][1] - a[1]];
    for (let k = 0; k < K; k++) {
      let t = (k + 1) / (K + 1);
      let x = a[0] + (b[0] - a[0]) * t + offs[e][k][0], y = a[1] + (b[1] - a[1]) * t + offs[e][k][1];
      out.push({ e, k, x, y, sign: 1 });
      out.push({ e, k, x: x + T[0], y: y + T[1], sign: -1 });
    }
  }
  return out;
}

function mousePressed() {
  let mx = mouseX - width / 2, my = mouseY - height / 2;
  drag = null;
  let bd = 20;
  for (let h of handles()) {
    let d = Math.hypot(h.x - mx, h.y - my);
    if (d < bd) { bd = d; drag = h; }
  }
}
function mouseDragged() {
  if (!drag) return;
  let o = offs[drag.e][drag.k];
  o[0] = constrain(o[0] + movedX, -cell * 0.45, cell * 0.45);
  o[1] = constrain(o[1] + movedY, -cell * 0.45, cell * 0.45);
  rebuild();
}
function mouseReleased() { drag = null; }

function keyPressed() {
  if (key === '1' || key === '2') { base = int(key); makeBase(); }
  if (key === 'r' || key === 'R') makeBase();
  if (key === 'n' || key === 'N') {
    for (let e of offs) for (let o of e) { o[0] = random(-0.25, 0.25) * cell; o[1] = random(-0.25, 0.25) * cell; }
    rebuild();
  }
  if (key === 'e' || key === 'E') eyes = !eyes;
  if (key === 'c' || key === 'C') colorSet = (colorSet + 1) % palettes.length;
  if (key === 'l' || key === 'L') { smoothOn = !smoothOn; rebuild(); }
  if (key === 's' || key === 'S') saveCanvas('escher_tile', 'png');
}

// ---------- やってみよう ----------
// 1. 正方形で、上の辺をへこませると下の辺がふくらむ。動物の頭としっぽを作ってみよう
// 2. 正六角形は 3 組の辺のペア。鳥や魚の形に挑戦（L で直線 / 曲線を切りかえ）
// 3. K を 5 にすると細かい形が作れる。drawEye を改造して顔を描こう
// 4. 辺の点を大きく動かしすぎると線が交差してタイルが壊れる。どこまで大丈夫？


// ==================================================
// ここから下は「描画の道具」（なめらかな線・目）
// ==================================================
// 点の列をキャットマル・ロム曲線でなめらかにする（両端は固定）
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

function drawEye(x, y) {
  noStroke();
  fill(255);
  circle(x, y, cell * 0.12);
  fill(20);
  circle(x + cell * 0.015, y, cell * 0.06);
  stroke(20, 22, 30);
  strokeWeight(2);
}
