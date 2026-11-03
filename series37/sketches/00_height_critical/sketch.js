// ============================================
// 00 高さ関数の臨界点 ─ 水位を上げると形が変わる
// ノイズでつくった地形（高さ関数 h）の極小・鞍点・極大を自動で見つけて色分けする
//   マウス左右 = 水位 t。水位より低い所（劣位集合 {h ≤ t}）が水色に染まる
//   水面の形（塊の数 b0・島の数 b1）が変わるのは、水位が臨界点を通る瞬間だけ ─ これがモース理論の出発点
// マウス左右 = 水位 / スペース = 自動で上げる / N = 新しい地形 / C = 臨界点の表示 / ↑↓ = 地形の細かさ
// ============================================

let cols = 128, rows = 80;        // ★ 地形の解像度
let h = [];                       // 高さ（0〜1）
let terrainImg, waterImg;
let crit = [];                    // { x, y, type: 'min'|'saddle'|'max', h }
let level = 0.3, auto = false, showCrit = true;
let freq = 2.2;                   // ★ ノイズの細かさ（↑↓）
let seed = 1;
let b0 = 0, b1 = 0, lastCross = null, flash = 0;
let ox = 30, oy = 100, W, H;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  noSmooth();
  W = width - 60; H = height - 180;
  noiseDetail(3, 0.4);
  makeTerrain();
}

// ★ 地形をつくる：ノイズを足し合わせて 0〜1 に正規化
function makeTerrain() {
  noiseSeed(seed);
  h = new Float32Array((cols + 1) * (rows + 1));
  let lo = 1e9, hi = -1e9;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    let v = noise(i / cols * freq, j / rows * freq * 0.7) + 0.2 * noise(i / cols * freq * 3 + 9, j / rows * freq * 2 + 9);
    h[i + j * (cols + 1)] = v; lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  for (let k = 0; k < h.length; k++) h[k] = (h[k] - lo) / (hi - lo);
  findCritical();
  terrainImg = createImage(cols + 1, rows + 1);
  terrainImg.loadPixels();
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    let v = h[i + j * (cols + 1)];
    let band = Math.floor(v * 12) / 12;                 // 等高線の帯
    let c = color(100 - band * 70, 40, 25 + band * 60);
    let p = (i + j * (cols + 1)) * 4;
    terrainImg.pixels[p] = red(c); terrainImg.pixels[p + 1] = green(c); terrainImg.pixels[p + 2] = blue(c); terrainImg.pixels[p + 3] = 255;
  }
  terrainImg.updatePixels();
  waterImg = createImage(cols + 1, rows + 1);
}

// ★ 臨界点を見つける：8 近傍とくらべて、全部高い = 極小、全部低い = 極大、まわりの上下が 4 回入れかわる = 鞍点
function findCritical() {
  crit = [];
  let at = (i, j) => h[i + j * (cols + 1)];
  let ring = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  for (let j = 1; j < rows; j++) for (let i = 1; i < cols; i++) {
    let v = at(i, j), lower = 0, changes = 0;
    let signs = ring.map(([a, b]) => at(i + a, j + b) > v);
    for (let k = 0; k < 8; k++) { if (!signs[k]) lower++; if (signs[k] !== signs[(k + 1) % 8]) changes++; }
    if (lower === 0) crit.push({ i, j, type: 'min', h: v });
    else if (lower === 8) crit.push({ i, j, type: 'max', h: v });
    else if (changes >= 4) crit.push({ i, j, type: 'saddle', h: v });
  }
  crit.sort((a, b) => a.h - b.h);
}

// 劣位集合 {h ≤ t} の塊の数 b0 と島（穴）の数 b1 を数える（Union-Find）
function countWater(t) {
  let n = (cols + 1) * (rows + 1);
  let parent = new Int32Array(n); for (let k = 0; k < n; k++) parent[k] = k;
  let find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  let union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  let wet = (k) => h[k] <= t;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    let k = i + j * (cols + 1), w = wet(k);
    if (i < cols && wet(k + 1) === w) union(k, k + 1);
    if (j < rows && wet(k + cols + 1) === w) union(k, k + cols + 1);
    if (!w && i < cols && j < rows) {                 // 陸は斜めもつなぐ（水を 4 近傍、陸を 8 近傍で見る）
      if (!wet(k + cols + 2)) union(k, k + cols + 2);
      if (!wet(k + cols)) union(k, k + cols);
    }
  }
  let touchEdge = {}, water = {}, land = {};
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    let k = i + j * (cols + 1), r = find(k);
    if (wet(k)) water[r] = true; else { land[r] = true; if (i === 0 || j === 0 || i === cols || j === rows) touchEdge[r] = true; }
  }
  b0 = Object.keys(water).length;
  b1 = Object.keys(land).filter((r) => !touchEdge[r]).length;   // 水に囲まれた陸 = 島 = 水の穴
}

function draw() {
  background(225, 30, 8);
  if (auto) level = (level + 0.0015) % 1.02;
  else if (mouseY > oy) level = constrain((mouseX - ox) / W, 0, 1);
  countWater(level);
  // 通りすぎた臨界点を調べる（直前との差）
  let passed = crit.filter((c) => c.h <= level).length;
  if (lastCross !== null && passed !== lastCross) flash = 1;
  lastCross = passed;
  flash *= 0.9;

  image(terrainImg, ox, oy, W, H);
  waterImg.loadPixels();
  for (let k = 0; k < h.length; k++) {
    let p = k * 4, w = h[k] <= level;
    waterImg.pixels[p] = 40; waterImg.pixels[p + 1] = 140; waterImg.pixels[p + 2] = 255; waterImg.pixels[p + 3] = w ? 190 : 0;
  }
  waterImg.updatePixels();
  image(waterImg, ox, oy, W, H);

  if (showCrit) {
    let sx = W / cols, sy = H / rows;
    for (let c of crit) {
      let x = ox + c.i * sx, y = oy + c.j * sy, under = c.h <= level;
      if (c.type === 'min') { fill(272, 70, 100, under ? 50 : 100); noStroke(); circle(x, y, 14); }
      else if (c.type === 'max') { fill(12, 85, 100, under ? 50 : 100); noStroke(); circle(x, y, 14); }
      else { stroke(85, 90, 100, under ? 50 : 100); strokeWeight(3); noFill(); line(x - 7, y - 7, x + 7, y + 7); line(x - 7, y + 7, x + 7, y - 7); }
    }
  }
  // 水位のスライダー
  noStroke(); fill(0, 0, 100, 60); rect(ox, height - 30, W, 6);
  fill(205, 80, 100); rect(ox, height - 30, W * level, 6);
  fill(0, 0, 100); circle(ox + W * level, height - 27, 14);

  // HUD
  let nMin = crit.filter((c) => c.type === 'min').length, nSad = crit.filter((c) => c.type === 'saddle').length, nMax = crit.filter((c) => c.type === 'max').length;
  fill(0, 0, 100); textSize(18); textAlign(LEFT, BASELINE);
  text('水位 t = ' + nf(level, 1, 3) + '　水の塊 b0 = ' + b0 + '　島（穴）b1 = ' + b1 + '　　通りすぎた臨界点 ' + passed + ' / ' + crit.length, ox, 40);
  fill(0, 0, 65); textSize(15);
  text('● 極小 ' + nMin + '（紫）　× 鞍点 ' + nSad + '（ライム）　● 極大 ' + nMax + '（コーラル）　　マウス左右：水位　スペース：自動 ' + (auto ? 'ON' : 'off') + '　N：新しい地形　C：臨界点　↑↓：細かさ ' + nf(freq, 1, 1), ox, 66);
  if (flash > 0.05) { fill(48, 90, 100, flash * 100); textSize(22); text('臨界点を通過！ 形が変わった', ox + W - 330, 40); }
  fill(0, 0, 60); textSize(14);
  text('極小を通ると塊が生まれ、鞍点を通ると塊がつながる（または島ができる）、極大を通ると島が沈む。それ以外では形は変わらない', ox, height - 50);
}

function keyPressed() {
  if (key === ' ') auto = !auto;
  if (key === 'n' || key === 'N') { seed++; makeTerrain(); lastCross = null; }
  if (key === 'c' || key === 'C') showCrit = !showCrit;
  if (key === UP_ARROW) { freq = Math.min(6, freq + 0.4); makeTerrain(); lastCross = null; }
  if (key === DOWN_ARROW) { freq = Math.max(1, freq - 0.4); makeTerrain(); lastCross = null; }
}

// ---------- やってみよう ----------
// 1. 水位をゆっくり上げて、b0 が増える瞬間に紫の点（極小）が沈んでいるのを確かめよう
// 2. 鞍点（×）を通るとき、b0 が減る場合と b1 が増える場合がある。どちらになるかは何で決まる？
// 3. freq を大きくして臨界点を増やす。極小 − 鞍点 + 極大 はいつもいくつ？（モースの関係式）
// 4. 8 近傍の判定だと「壊れた鞍点」が出ることがある。changes >= 6 の点（猿の鞍点）を探してみよう
