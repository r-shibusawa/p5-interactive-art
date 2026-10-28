// ============================================
// 05 ペンローズ・タイル（ひし形）
// 太いひし形（72°）と細いひし形（36°）の 2 種類で、平面を「くり返しのない模様」で埋める（1974 年 ペンローズ）
//   作り方 = 分割（デフレーション）：三角形を黄金比 φ で切り分けるのをくり返す
//   円弧の模様 = マッチング規則。弧がとぎれないようにつなぐと、必ずくり返さない模様になる
// ↑↓ = 分割の回数 / A = 円弧 / T = 三角形の切れ目 / ドラッグ = 移動 / Z・X = 拡大・縮小 / S = 保存
// ============================================

let level = 5;          // ★ 分割の回数（0〜8）
let showArcs = true;    // ★ マッチング規則の円弧
let showTri = false;    // ★ 半分の三角形（ロビンソンの三角形）を見せる
let zoomF = 1;
let panX = 0, panY = 0;
let tris = [];          // [色, A, B, C]（色 0 = 細い、1 = 太い）
let layer;
let dragging = false;

const PHI = (1 + Math.sqrt(5)) / 2;
let thinCol = [250, 190, 80], thickCol = [70, 120, 200];   // ★ 色

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  build();
}

function build() {
  // 最初は 10 枚の三角形でできた「車輪」
  let R = Math.max(width, height) * 0.75 * zoomF;
  tris = [];
  for (let i = 0; i < 10; i++) {
    let b = [R * Math.cos(((2 * i - 1) * PI) / 10), R * Math.sin(((2 * i - 1) * PI) / 10)];
    let c = [R * Math.cos(((2 * i + 1) * PI) / 10), R * Math.sin(((2 * i + 1) * PI) / 10)];
    if (i % 2 === 0) [b, c] = [c, b];
    tris.push([0, [0, 0], b, c]);
  }
  for (let k = 0; k < level; k++) tris = deflate(tris);
  render();
}

// ★ 分割（デフレーション）：細い三角形 → 2 枚、太い三角形 → 3 枚。切る位置は 1/φ
function deflate(list) {
  let out = [];
  for (let [c, A, B, C] of list) {
    if (c === 0) {
      let P = lerp2(A, B, 1 / PHI);
      out.push([0, C, P, B], [1, P, C, A]);
    } else {
      let Q = lerp2(B, A, 1 / PHI), R = lerp2(B, C, 1 / PHI);
      out.push([1, R, C, A], [1, Q, R, B], [0, R, Q, A]);
    }
  }
  return out;
}

function render() {
  layer.background(18, 20, 28);
  layer.push();
  layer.translate(width / 2 + panX, height / 2 + panY);
  let edge = 0;
  for (let t of tris) {
    let [c, A, B, C] = t;
    let cx = (A[0] + B[0] + C[0]) / 3 + width / 2 + panX, cy = (A[1] + B[1] + C[1]) / 3 + height / 2 + panY;
    if (cx < -80 || cx > width + 80 || cy < -80 || cy > height + 80) continue;
    let col = c === 0 ? thinCol : thickCol;
    layer.noStroke();
    layer.fill(col[0], col[1], col[2]);
    layer.triangle(A[0], A[1], B[0], B[1], C[0], C[1]);
    // ひし形の外側の辺だけ描く（B−C は 2 枚の三角形の境目）
    layer.stroke(18, 20, 28);
    layer.strokeWeight(1.5);
    layer.line(A[0], A[1], B[0], B[1]);
    layer.line(A[0], A[1], C[0], C[1]);
    if (showTri) { layer.stroke(255, 255, 255, 90); layer.line(B[0], B[1], C[0], C[1]); }
    edge = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (showArcs) {
      // ★ マッチング規則：頂点 B と C のまわりに円弧（半径は辺の長さ × 0.382 / 0.618）
      drawArc(B, A, C, edge * (c === 0 ? 0.382 : 0.618), [230, 60, 60]);
      drawArc(C, A, B, edge * 0.382, [40, 200, 120]);
    }
  }
  layer.pop();
}

function draw() {
  image(layer, dragging ? movedSum.x : 0, dragging ? movedSum.y : 0);
  let thin = Math.round(tris.filter((t) => t[0] === 0).length / 2), thick = Math.round(tris.filter((t) => t[0] === 1).length / 2);
  noStroke();
  fill(0, 0, 0, 170);
  rect(10, 10, 560, 104, 8);
  fill(255);
  textSize(19);
  text('ペンローズ・タイル　分割 ' + level + ' 回（↑↓）', 22, 38);
  textSize(15);
  fill(210);
  text('太いひし形 ' + thick + ' 枚 ／ 細いひし形 ' + thin + ' 枚 → 比 ' + (thin > 0 ? nf(thick / thin, 1, 4) : '—') + '（φ = 1.6180…）', 22, 64);
  text('赤い弧どうし・緑の弧どうしが必ずつながる = マッチング規則（A で表示 ' + (showArcs ? 'ON' : 'OFF') + '）', 22, 88);
}

let movedSum = { x: 0, y: 0 };
function mousePressed() { dragging = true; movedSum = { x: 0, y: 0 }; }
function mouseDragged() { movedSum.x += movedX; movedSum.y += movedY; }
function mouseReleased() {
  if (!dragging) return;
  dragging = false;
  if (Math.abs(movedSum.x) + Math.abs(movedSum.y) > 2) { panX += movedSum.x; panY += movedSum.y; render(); }
  movedSum = { x: 0, y: 0 };
}

function keyPressed() {
  if (key === UP_ARROW) { level = Math.min(8, level + 1); build(); }
  if (key === DOWN_ARROW) { level = Math.max(0, level - 1); build(); }
  if (key === 'a' || key === 'A') { showArcs = !showArcs; render(); }
  if (key === 't' || key === 'T') { showTri = !showTri; render(); }
  if (key === 'z' || key === 'Z') { zoomF = Math.min(8, zoomF * PHI); panX *= PHI; panY *= PHI; build(); }
  if (key === 'x' || key === 'X') { zoomF = Math.max(0.3, zoomF / PHI); panX /= PHI; panY /= PHI; build(); }
  if (key === 's' || key === 'S') saveCanvas('penrose', 'png');
}

// ---------- やってみよう ----------
// 1. ↑ を押すたびに枚数が約 2.6 倍。太い ÷ 細い の比が φ に近づくのを確かめよう
// 2. T で三角形の切れ目を表示。1 回の分割で三角形がどう切られるか、↑↓ を往復して観察しよう
// 3. 同じ形の「星」や「太陽」が何度も出てくるのに、全体はくり返さない。ずらしても重ならない場所を探そう
// 4. thinCol / thickCol を変えて、床や壁紙のデザインにしよう


// ==================================================
// ここから下は「描画の道具」
// ==================================================
function lerp2(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

// 頂点 V を中心に、V→P と V→Q の間に半径 r の円弧を描く
function drawArc(V, P, Q, r, col) {
  let a1 = Math.atan2(P[1] - V[1], P[0] - V[0]), a2 = Math.atan2(Q[1] - V[1], Q[0] - V[0]);
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  let s = d > 0 ? a1 : a2, e = d > 0 ? a2 : a1;
  if (e < s) e += 2 * Math.PI;
  layer.noFill();
  layer.stroke(col[0], col[1], col[2]);
  layer.strokeWeight(Math.max(1.5, r * 0.12));
  layer.arc(V[0], V[1], 2 * r, 2 * r, s, e);
}
