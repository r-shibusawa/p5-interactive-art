// ============================================
// 11 トロピカル凸包
// トロピカルな線分 [p, q] = { (λ ⊗ p) ⊕ (μ ⊗ q) } = { min(λ + p, μ + q) }：折れ線（最大 2 回曲がる）
//   方向は (1,0), (0,1), (1,1) のどれか。トロピカル凸包 = トロピカルな線分で閉じた集合 = 点の「トロピカル結合」全部
//   射影の公式：x が凸包にある ⇔ x = min_i (λ_i + p_i)，λ_i = max_j (x_j − p_ij)
// クリック = 点を置く / ドラッグ = 点を動かす / H = ふつうの凸包を重ねる / C = 消す / R = ランダム
// ============================================

let pts = [];
let showHull = true;
let sc = 60, ox, oy, buf, scale4 = 4, dragging = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.45; oy = height * 0.55;
  buf = createGraphics(ceil(width / scale4), ceil(height / scale4));
  buf.pixelDensity(1);
  randomPts();
}
function randomPts() { pts = []; for (let i = 0; i < 5; i++) pts.push({ x: random(-4, 4), y: random(-3, 3) }); }
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }
function fromX(s) { return (s - ox) / sc; }
function fromY(s) { return (oy - s) / sc; }

// ★ トロピカル線分 p–q の折れ点：同次座標 (0, px, py) と (s, s + qx, s + qy) の min を s で動かす
function tropSegment(p, q) {
  let br = [0, p.x - q.x, p.y - q.y].sort((a, b) => a - b);   // s がこの値を通るたびに「どちらが min か」が変わる
  let out = [{ x: q.x, y: q.y }];                                // s → −∞ では q，s → +∞ では p
  for (let s of br) {
    let h0 = Math.min(0, s), h1 = Math.min(p.x, s + q.x), h2 = Math.min(p.y, s + q.y);
    out.push({ x: h1 - h0, y: h2 - h0 });                        // 同次座標 → 最初の座標を引いて戻す
  }
  out.push({ x: p.x, y: p.y });
  return out;
}
// ★ 点 (X, Y) がトロピカル凸包に入っているか（射影して動かなければ入っている）
function inHull(X, Y) {
  let h0 = Infinity, h1 = Infinity, h2 = Infinity;
  for (let p of pts) {
    let lam = Math.max(0, X - p.x, Y - p.y);                  // λ_i = max_j (x_j − p_ij)
    h0 = Math.min(h0, lam); h1 = Math.min(h1, lam + p.x); h2 = Math.min(h2, lam + p.y);
  }
  return Math.abs(h1 - h0 - X) < 1e-6 && Math.abs(h2 - h0 - Y) < 1e-6;
}
// ふつうの凸包（ギフト包装）
function ordinaryHull() {
  if (pts.length < 3) return pts.slice();
  let P = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  let turn = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  let lo = [], up = [];
  for (let p of P) { while (lo.length >= 2 && turn(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { let p = P[i]; while (up.length >= 2 && turn(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}

function draw() {
  background(190, 55, 10);
  // 凸包の中を塗る（粗い画像）
  buf.loadPixels();
  for (let py = 0; py < buf.height; py++) for (let px = 0; px < buf.width; px++) {
    let inside = pts.length > 0 && inHull(fromX(px * scale4), fromY(py * scale4));
    let idx = (px + py * buf.width) * 4;
    buf.pixels[idx] = inside ? 255 : 0; buf.pixels[idx + 1] = inside ? 170 : 0; buf.pixels[idx + 2] = inside ? 60 : 0; buf.pixels[idx + 3] = inside ? 110 : 0;
  }
  buf.updatePixels();
  image(buf, 0, 0, width, height);

  stroke(0, 0, 100, 20); strokeWeight(1);
  for (let g = -12; g <= 12; g++) { line(toX(g), 0, toX(g), height); line(0, toY(g), width, toY(g)); }
  // すべての組のトロピカル線分
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    let seg = tropSegment(pts[i], pts[j]);
    stroke(35, 80, 100, 80); strokeWeight(2.5); noFill();
    beginShape(); for (let p of seg) vertex(toX(p.x), toY(p.y)); endShape();
  }
  // ふつうの凸包
  if (showHull && pts.length >= 3) {
    let h = ordinaryHull();
    stroke(90, 80, 100, 80); strokeWeight(2); noFill();
    beginShape(); for (let p of h) vertex(toX(p.x), toY(p.y)); endShape(CLOSE);
  }
  // マウス位置の線分（最後の点との）
  if (pts.length > 0) {
    let m = { x: fromX(mouseX), y: fromY(mouseY) }, seg = tropSegment(pts[pts.length - 1], m);
    stroke(330, 70, 100, 60); strokeWeight(1.5);
    for (let k = 0; k + 1 < seg.length; k++) line(toX(seg[k].x), toY(seg[k].y), toX(seg[k + 1].x), toY(seg[k + 1].y));
  }
  pts.forEach((p, k) => { stroke(0, 0, 10); strokeWeight(2); fill(k === dragging ? 55 : 330, 80, 100); circle(toX(p.x), toY(p.y), 16); });

  noStroke(); fill(0, 0, 100); textSize(18);
  text('クリック：点を置く　ドラッグ：動かす　H：ふつうの凸包（緑）' + (showHull ? ' ON' : ' off') + '　C：消す　R：ランダム　点 ' + pts.length + ' 個', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('マンゴーの折れ線 = 2 点ずつのトロピカル線分（方向は (1,0)・(0,1)・(1,1) だけ）。塗った部分 = トロピカル凸包（線分だけでは埋まらない 2 次元の部分もある）', 20, 62);
  text('ピンク = 最後の点とマウスを結ぶトロピカル線分。マウス (' + nf(fromX(mouseX), 1, 2) + ', ' + nf(fromY(mouseY), 1, 2) + ') は凸包の' + (pts.length && inHull(fromX(mouseX), fromY(mouseY)) ? '中' : '外'), 20, 86);
  text('min(λ + p, μ + q) = 「p を λ だけ持ち上げたものと q を μ だけ持ち上げたものの min」。3 つの座標のどれで min が入れ替わるかで 2 回曲がる', 20, height - 24);
}

function mousePressed() {
  if (mouseY < 100) return;
  dragging = -1;
  pts.forEach((p, k) => { if (dist(mouseX, mouseY, toX(p.x), toY(p.y)) < 14) dragging = k; });
  if (dragging < 0 && pts.length < 24) { pts.push({ x: fromX(mouseX), y: fromY(mouseY) }); dragging = pts.length - 1; }
}
function mouseDragged() { if (dragging >= 0) { pts[dragging].x = constrain(fromX(mouseX), -10, 10); pts[dragging].y = constrain(fromY(mouseY), -8, 8); } }
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === 'h' || key === 'H') showHull = !showHull;
  if (key === 'c' || key === 'C') pts = [];
  if (key === 'r' || key === 'R') randomPts();
}

// ---------- やってみよう ----------
// 1. 2 点だけ置く。トロピカル線分はいつ「まっすぐ」になる？（同じ x，同じ y，または対角線上）
// 2. 3 点でトロピカル凸包が 2 次元（面）になる配置と、折れ線だけ（1 次元）になる配置を探そう
// 3. ふつうの凸包とトロピカル凸包、どちらが広い？ 点を増やして比べよう
// 4. max 流儀（min → max, λ の max → min）に書き換えると線分の曲がり方が変わる。方向はどうなる？
