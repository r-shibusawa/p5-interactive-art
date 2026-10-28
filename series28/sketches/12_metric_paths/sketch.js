// ============================================
// 12 リーマン計量で距離を変える
// 「場所によって 1 歩の重さがちがう」平面：ds = c(x, y) × |dx|（c が大きい所は進みにくい = 遠い）。これがリーマン計量の一例
//   最短の道（測地線）は直線でなく、重い所をよけて曲がる。光が水やガラスで曲がる（屈折）のと同じしくみ
// ドラッグ = 重い地面を塗る / Shift + ドラッグ = 軽い道を塗る / S・G をドラッグ = 出発・到着 / 1 = レンズ 2 = 双曲（上半平面）3 = 山 / C = 平らに / W = 等距離線 / ↑↓ = 筆の大きさ
// ============================================

let cs = 10;                    // ★ 1 マスの大きさ（px）。小さいほど細かいが重い
let gw, gh, top0 = 90;
let cost, distA, prevA;         // マスごとの重さ c、出発点からの距離、ひとつ前のマス
let S, G;                       // 出発・到着（マスの番号 [i, j]）
let brush = 4;                  // ★ 筆の半径（マス）
let showWaves = true, dirty = true, imgDirty = true, img, dragWhat = null;
let path = [];
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];   // 16 方向に進める

function setup() {
  createCanvas(windowWidth, windowHeight);
  gw = floor(width / cs); gh = floor((height - top0 - 60) / cs);
  cost = new Float32Array(gw * gh); distA = new Float64Array(gw * gh); prevA = new Int32Array(gw * gh);
  img = createImage(gw, gh);
  preset(1);
}
function idx(i, j) { return j * gw + i; }

function preset(k) {
  S = [floor(gw * 0.12), floor(gh * 0.5)]; G = [floor(gw * 0.88), floor(gh * 0.5)];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let c = 1;
    let dx = (i - gw / 2) / gh, dy = (j - gh / 2) / gh;
    if (k === 1) c = dx * dx + dy * dy < 0.09 ? 2.5 : 1;                       // ガラスのレンズ（重い円）
    if (k === 2) c = Math.min(30, 0.25 / ((gh - j) / gh));                      // ★ 上半平面 ds = |dx| / y（下ほど重い）
    if (k === 3) c = 1 + 4 * Math.exp(-((dx * dx + dy * dy) / 0.02));           // 山
    cost[idx(i, j)] = c;
  }
  if (k === 2) { S = [floor(gw * 0.2), floor(gh * 0.75)]; G = [floor(gw * 0.8), floor(gh * 0.75)]; }
  dirty = true; imgDirty = true;
}

// ★ ダイクストラ法：出発点から全マスへの最短距離（計量 c で測った長さ）
function dijkstra() {
  distA.fill(Infinity); prevA.fill(-1);
  let s = idx(S[0], S[1]);
  distA[s] = 0;
  let heap = [[0, s]];
  while (heap.length) {
    let [d, u] = heapPop(heap);
    if (d > distA[u]) continue;
    let ui = u % gw, uj = (u - ui) / gw;
    for (let [di, dj] of NB) {
      let vi = ui + di, vj = uj + dj;
      if (vi < 0 || vj < 0 || vi >= gw || vj >= gh) continue;
      let v = idx(vi, vj);
      let nd = d + Math.hypot(di, dj) * 0.5 * (cost[u] + cost[v]);   // 辺の長さ × 平均の重さ
      if (nd < distA[v]) { distA[v] = nd; prevA[v] = u; heapPush(heap, [nd, v]); }
    }
  }
  path = [];
  for (let v = idx(G[0], G[1]); v >= 0; v = prevA[v]) path.push([v % gw, floor(v / gw)]);
}

function draw() {
  background(14, 16, 26);
  if (mouseIsPressed && dragWhat === 'paint') paint();
  if (dirty && frameCount % 4 === 0) { dijkstra(); dirty = false; imgDirty = true; }
  if (imgDirty) redrawImage();
  noSmooth(); image(img, 0, top0, gw * cs, gh * cs); smooth();
  // 最短路（測地線）
  noFill(); stroke(255, 230, 90); strokeWeight(4);
  beginShape(); for (let [i, j] of path) vertex((i + 0.5) * cs, top0 + (j + 0.5) * cs); endShape();
  // 直線と、その計量での長さ
  let sx = (S[0] + 0.5) * cs, sy = top0 + (S[1] + 0.5) * cs, gx = (G[0] + 0.5) * cs, gy = top0 + (G[1] + 0.5) * cs;
  stroke(255, 255, 255, 160); strokeWeight(2); drawingContext.setLineDash([8, 6]); line(sx, sy, gx, gy); drawingContext.setLineDash([]);
  let straightLen = 0, n = 400;
  for (let k = 0; k < n; k++) {
    let t = (k + 0.5) / n, i = floor(S[0] + (G[0] - S[0]) * t + 0.5), j = floor(S[1] + (G[1] - S[1]) * t + 0.5);
    straightLen += cost[idx(constrain(i, 0, gw - 1), constrain(j, 0, gh - 1))] * Math.hypot(G[0] - S[0], G[1] - S[1]) / n;
  }
  for (let [p, c, nm] of [[[sx, sy], [120, 255, 160], 'S'], [[gx, gy], [255, 120, 160], 'G']]) {
    noStroke(); fill(...c); circle(p[0], p[1], 20); fill(0); textSize(13); textAlign(CENTER, CENTER); text(nm, p[0], p[1]); textAlign(LEFT, BASELINE);
  }
  noFill(); stroke(255, 120); strokeWeight(1); circle(mouseX, mouseY, brush * 2 * cs);

  noStroke(); fill(255); textSize(18);
  text('ドラッグ：重い地面　Shift + ドラッグ：軽い道　S・G をドラッグ　1：レンズ　2：双曲　3：山　C：平ら　W：等距離線 ' + (showWaves ? 'ON' : 'off') + '　↑↓：筆', 20, 34);
  fill(170); textSize(15);
  text('明るい所ほど重い（1 歩が長い）。黄色 = 最短の道（測地線）、白い点線 = 直線。等距離線は S から同じ距離の点（波面）', 20, 62);
  let geo = distA[idx(G[0], G[1])];
  fill(255, 230, 90); textSize(17);
  text('測地線の長さ = ' + nf(geo, 1, 1) + '　　直線の長さ（同じ計量で）= ' + nf(straightLen, 1, 1) + '　　→ 直線のほうが ' + nf((straightLen / geo - 1) * 100, 1, 1) + '% 長い', 20, height - 24);
}
// 重さ → 色、等距離線を重ねた画像
function redrawImage() {
  img.loadPixels();
  let wave = showWaves ? max(8, (distA[idx(G[0], G[1])] || 100) / 14) : 0;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let k = idx(i, j), c = cost[k], t = constrain(Math.log(c) / Math.log(30) + 0.35, 0, 1), p = 4 * k;
    let r = 30 + 200 * t, g = 40 + 120 * t, b = 70 + 40 * (1 - t);
    if (wave && isFinite(distA[k]) && Math.floor(distA[k] / wave) % 2 === 0) { r *= 0.75; g *= 0.85; b *= 1.15; }
    img.pixels[p] = r; img.pixels[p + 1] = g; img.pixels[p + 2] = b; img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  imgDirty = false;
}
function paint() {
  let ci = floor(mouseX / cs), cj = floor((mouseY - top0) / cs), lighter = keyIsDown(SHIFT);
  for (let j = cj - brush; j <= cj + brush; j++) for (let i = ci - brush; i <= ci + brush; i++) {
    if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
    let w = Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) / (brush * brush * 0.5));
    let k = idx(i, j);
    cost[k] = constrain(cost[k] * (lighter ? 1 - 0.15 * w : 1 + 0.25 * w), 0.2, 30);   // ★ 重さの範囲 0.2〜30
  }
  dirty = true; imgDirty = true;
}

function mousePressed() {
  let gx = floor(mouseX / cs), gy = floor((mouseY - top0) / cs);
  if (Math.hypot(gx - S[0], gy - S[1]) < 2.5) dragWhat = 'S';
  else if (Math.hypot(gx - G[0], gy - G[1]) < 2.5) dragWhat = 'G';
  else if (mouseY > top0) dragWhat = 'paint';
  else dragWhat = null;
}
function mouseDragged() {
  let p = [constrain(floor(mouseX / cs), 0, gw - 1), constrain(floor((mouseY - top0) / cs), 0, gh - 1)];
  if (dragWhat === 'S') { S = p; dirty = true; }
  if (dragWhat === 'G') { G = p; dirty = true; }
}
function mouseReleased() { dragWhat = null; }
function keyPressed() {
  if ('123'.includes(key) && key.length === 1) preset(int(key));
  if (key === 'c' || key === 'C') { cost.fill(1); dirty = true; }
  if (key === 'w' || key === 'W') { showWaves = !showWaves; imgDirty = true; }
  if (key === UP_ARROW) brush = min(15, brush + 1);
  if (key === DOWN_ARROW) brush = max(1, brush - 1);
}

// ---------- やってみよう ----------
// 1. 例 1（レンズ）：S と G をレンズの上下にずらすと、道がレンズの中で折れ曲がる（スネルの法則）
// 2. 例 2（双曲）：同じ高さの 2 点を結ぶ最短の道は半円！ これは 09 の双曲平面のもう 1 つの地図（上半平面）
// 3. 等距離線（W）の波面と最短の道は、いつも直角に交わる。確かめよう
// 4. NB を 4 方向（上下左右）だけにすると、平らな所の最短の道はどう見える？（マス目の計量）


// ==================================================
// ここから下は「ヒープの道具」（いちばん小さいものを速く取り出す）
// ==================================================
function heapPush(h, x) {
  h.push(x);
  let i = h.length - 1;
  while (i > 0) { let p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; }
}
function heapPop(h) {
  let top = h[0], last = h.pop();
  if (h.length) {
    h[0] = last;
    let i = 0;
    for (;;) {
      let l = 2 * i + 1, r = l + 1, m = i;
      if (l < h.length && h[l][0] < h[m][0]) m = l;
      if (r < h.length && h[r][0] < h[m][0]) m = r;
      if (m === i) break;
      [h[m], h[i]] = [h[i], h[m]]; i = m;
    }
  }
  return top;
}
