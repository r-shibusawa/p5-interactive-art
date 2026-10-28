// ============================================
// 15 カメラでモザイク 📷
// カメラの映像を、タイリングのモザイクで描き直す。1 枚のタイルの色 = その中心の映像の色
//   六角形・三角形・ペンローズのひし形・トルシェ（明るさで向きが変わる）で見え方がどう変わるか比べよう
// 1 = 六角形 2 = 三角形 3 = ペンローズ 4 = トルシェ / ↑↓ = タイルの大きさ / G = すき間 / スペース = 映像を止める / S = 保存
// （カメラが使えないときは、動く模様の画像で代わりに動きます）
// ============================================

let mode = 1;           // ★ タイリングの種類
let tileSize = 22;      // ★ タイルの大きさ（ピクセル）
let gap = true;
let frozen = false;
let cap, fake;
let VW = 160, VH = 120; // カメラの解像度（小さいほど速い）
let tiles = [];         // { pts, cx, cy, o }

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(VW, VH);
  cap.hide();
  fake = createGraphics(VW, VH);
  fake.pixelDensity(1);
  build();
}

// ★ タイルの形を作る（画面の座標で）
function build() {
  tiles = [];
  let s = tileSize;
  if (mode === 1) {
    let w = Math.sqrt(3) * s, h = 1.5 * s;
    for (let r = -1; r * h < height + s; r++) for (let c = -1; c * w < width + w; c++) {
      let cx = c * w + (r % 2 ? w / 2 : 0), cy = r * h;
      tiles.push(polyTile(cx, cy, s, 6, Math.PI / 6));
    }
  } else if (mode === 2) {
    let h = (Math.sqrt(3) / 2) * s * 1.6, w = s * 1.6;
    for (let r = -1; r * h < height + h; r++) for (let c = -2; c * w / 2 < width + w; c++) {
      let up = (c + r) % 2 === 0, x = (c * w) / 2, y = r * h;
      let pts = up ? [[x - w / 2, y + h], [x + w / 2, y + h], [x, y]] : [[x - w / 2, y], [x + w / 2, y], [x, y + h]];
      tiles.push({ pts, cx: x, cy: y + (up ? (2 * h) / 3 : h / 3) });
    }
  } else if (mode === 3) tiles = penroseTiles(s * 1.4);
  else {
    let w = s * 1.6;
    for (let y = 0; y < height + w; y += w) for (let x = 0; x < width + w; x += w) tiles.push({ pts: [], cx: x + w / 2, cy: y + w / 2, w });
  }
}

function draw() {
  background(12);
  let src = videoSource();
  if (!frozen) src.loadPixels();
  let px = src.pixels;
  if (!px || px.length < VW * VH * 4) return;
  stroke(12);
  strokeWeight(gap ? 1.5 : 0);
  if (!gap) noStroke();
  for (let t of tiles) {
    // タイルの中心 → 映像の画素
    let u = constrain(Math.floor((t.cx / width) * VW), 0, VW - 1), v = constrain(Math.floor((t.cy / height) * VH), 0, VH - 1);
    let i = 4 * (v * VW + u);
    let r = px[i], g = px[i + 1], b = px[i + 2];
    if (mode === 4) { truchet(t, r, g, b); continue; }
    fill(r, g, b);
    beginShape();
    for (let p of t.pts) vertex(p[0], p[1]);
    endShape(CLOSE);
  }
  noStroke();
  fill(0, 0, 0, 170);
  rect(10, 10, 600, 70, 8);
  fill(255);
  textSize(19);
  text(['', '六角形', '三角形', 'ペンローズのひし形', 'トルシェ（明るさで向き）'][mode] + 'のモザイク（1〜4）　タイル ' + tiles.length + ' 枚', 22, 38);
  textSize(15);
  fill(200);
  text((camReady() ? 'カメラの映像' : 'カメラなし → 動く模様で代用') + '　↑↓ 大きさ ' + tileSize + '　G すき間　スペース 止める', 22, 64);
}

// トルシェ：明るい所と暗い所で 4 分の 1 円の向きを変え、暗いほど線を太く
function truchet(t, r, g, b) {
  let br = (r + g + b) / 3, h = t.w / 2;
  noStroke();
  fill(r * 0.35, g * 0.35, b * 0.35);
  rect(t.cx - h, t.cy - h, t.w, t.w);
  noFill();
  stroke(r, g, b);
  strokeWeight(Math.max(1, (t.w * (255 - br)) / 255 * 0.45 + 1));
  if (br > 110) { arc(t.cx - h, t.cy - h, t.w, t.w, 0, HALF_PI); arc(t.cx + h, t.cy + h, t.w, t.w, PI, PI + HALF_PI); }
  else { arc(t.cx + h, t.cy - h, t.w, t.w, HALF_PI, PI); arc(t.cx - h, t.cy + h, t.w, t.w, PI + HALF_PI, TWO_PI); }
}

function camReady() { return cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2; }

// カメラが使えないときの代わり：ゆっくり動く色の玉
function videoSource() {
  if (camReady()) return cap;
  fake.background(30, 40, 70);
  fake.noStroke();
  for (let k = 0; k < 5; k++) {
    let x = VW / 2 + Math.cos(frameCount * 0.01 * (k + 1) + k) * VW * 0.35, y = VH / 2 + Math.sin(frameCount * 0.013 * (k + 2)) * VH * 0.35;
    fake.fill((k * 70) % 255, 150 + k * 20, 255 - k * 40);
    fake.circle(x, y, 40 + k * 8);
  }
  return fake;
}

function keyPressed() {
  if (key >= '1' && key <= '4') { mode = int(key); build(); }
  if (key === UP_ARROW) { tileSize = Math.min(80, tileSize + 4); build(); }
  if (key === DOWN_ARROW) { tileSize = Math.max(10, tileSize - 4); build(); }
  if (key === 'g' || key === 'G') gap = !gap;
  if (key === ' ') frozen = !frozen;
  if (key === 's' || key === 'S') saveCanvas('mosaic', 'png');
}

// ---------- やってみよう ----------
// 1. 同じ大きさで 1〜3 を切りかえ、顔がいちばん分かりやすいタイリングはどれ？
// 2. ↑ でタイルを大きくしていくと、どこで「誰だか分からなく」なる？
// 3. トルシェ（4）は明るさで向きが変わる。手を動かすと模様の流れが変わるのを楽しもう
// 4. 色を中心の 1 画素ではなく、タイルの中の平均にすると？（ヒント：まわりの 4 画素を足して 4 で割る）


// ==================================================
// ここから下は「タイルの道具」
// ==================================================
function polyTile(cx, cy, r, n, rot) {
  let pts = [];
  for (let k = 0; k < n; k++) pts.push([cx + r * Math.cos(rot + (2 * Math.PI * k) / n), cy + r * Math.sin(rot + (2 * Math.PI * k) / n)]);
  return { pts, cx, cy };
}
// ペンローズ（05 と同じ分割）。辺の長さがだいたい edge になるまで分割する
function penroseTiles(edge) {
  const PHI = (1 + Math.sqrt(5)) / 2;
  let R = Math.hypot(width, height) * 0.55, tr = [];
  let lv = Math.max(1, Math.round(Math.log(R / edge) / Math.log(PHI)));
  for (let i = 0; i < 10; i++) {
    let b = [R * Math.cos(((2 * i - 1) * Math.PI) / 10), R * Math.sin(((2 * i - 1) * Math.PI) / 10)];
    let c = [R * Math.cos(((2 * i + 1) * Math.PI) / 10), R * Math.sin(((2 * i + 1) * Math.PI) / 10)];
    if (i % 2 === 0) [b, c] = [c, b];
    tr.push([0, [0, 0], b, c]);
  }
  let L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let k = 0; k < lv; k++) {
    let out = [];
    for (let [c, A, B, C] of tr) {
      if (c === 0) { let P = L2(A, B, 1 / PHI); out.push([0, C, P, B], [1, P, C, A]); }
      else { let Q = L2(B, A, 1 / PHI), Rr = L2(B, C, 1 / PHI); out.push([1, Rr, C, A], [1, Q, Rr, B], [0, Rr, Q, A]); }
    }
    tr = out;
  }
  // 三角形 2 枚（辺 B−C を共有）を 1 枚のひし形にまとめる
  let m = new Map();
  for (let [c, A, B, C] of tr) {
    let k = c + ':' + [B, C].map((v) => Math.round(v[0] * 10) + ',' + Math.round(v[1] * 10)).sort().join('|');
    if (!m.has(k)) m.set(k, { as: [], B, C });
    m.get(k).as.push(A);
  }
  let out = [];
  for (let h of m.values()) {
    let pts = h.as.length === 2 ? [h.as[0], h.B, h.as[1], h.C] : [h.as[0], h.B, h.C];
    pts = pts.map((v) => [v[0] + width / 2, v[1] + height / 2]);
    let cx = pts.reduce((s, v) => s + v[0], 0) / pts.length, cy = pts.reduce((s, v) => s + v[1], 0) / pts.length;
    if (cx < -60 || cx > width + 60 || cy < -60 || cy > height + 60) continue;
    out.push({ pts, cx, cy });
  }
  return out;
}
