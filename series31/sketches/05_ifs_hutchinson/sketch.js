// ============================================
// 05 反復関数系（IFS）と自己相似図形
// 縮小写像を何枚か用意し、図形 A を全部で写して合わせる：H(A) = w₁(A) ∪ w₂(A) ∪ … （ハッチンソン作用素）
//   H は「図形の空間」の上の縮小写像 → 02 の定理で不動点（アトラクタ）がただ 1 つ。どんな図形から始めても同じ形に着く
// スペース = H を 1 回かける / A = 自動 / 1〜4 = 写像の組 / ドラッグ = 出発の図形を描き足す / B = 出発の図形を変える / C = 消す / G = カオスゲーム / R = 最初から
// ============================================

let PRESETS = [
  { name: 'シェルピンスキーの三角形', view: [-0.05, 1.05, -0.1, 1.0], maps: [[0.5, 0, 0, 0.5, 0, 0], [0.5, 0, 0, 0.5, 0.5, 0], [0.5, 0, 0, 0.5, 0.25, 0.433]] },
  { name: 'バーンズリーのシダ', view: [-3.2, 3.2, -0.3, 10.3], maps: [[0, 0, 0, 0.16, 0, 0], [0.85, 0.04, -0.04, 0.85, 0, 1.6], [0.2, -0.26, 0.23, 0.22, 0, 1.6], [-0.15, 0.28, 0.26, 0.24, 0, 0.44]] },
  { name: 'ドラゴン曲線', view: [-0.45, 1.25, -0.6, 1.1], maps: [[0.5, -0.5, 0.5, 0.5, 0, 0], [-0.5, -0.5, 0.5, -0.5, 1, 0]] },
  { name: 'シェルピンスキーのカーペット', view: [-0.05, 1.05, -0.05, 1.05], maps: [] },
];
// カーペット：3×3 のうち真ん中以外の 8 枚
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== 1 || j !== 1) PRESETS[3].maps.push([1 / 3, 0, 0, 1 / 3, i / 3, j / 3]);

let pre = 0;
let startU = [];           // 出発の図形（0〜1 の正規化座標の点）
let startKind = 0;
let ptsX, ptsY, ptsC;      // 今の図形 Hⁿ(A) の点（x, y, どの写像から来たか）
let n = 0;
let maxPts = 60000;        // ★ 点の数の上限（多いほどきれい・重い）
let auto = false, chaos = false;
let V, vx0, vy0, viewG, chaosG, cx = 0.3, cy = 0.3;
let thumbs = [];
let lastMouse = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  V = floor(min(height - 250, width * 0.55)); vx0 = 40; vy0 = 100;
  viewG = createGraphics(V, V); viewG.pixelDensity(1);
  chaosG = createGraphics(V, V); chaosG.pixelDensity(1);
  makeStart();
}
function P() { return PRESETS[pre]; }
function toWorld(u, v) { let w = P().view; return [lerp(w[0], w[1], u), lerp(w[2], w[3], v)]; }

// 出発の図形：0 = 正方形の枠、1 = 円、2 = 顔、3 = 1 点
function makeStart() {
  startU = [];
  if (startKind === 0) for (let i = 0; i < 400; i++) { let t = i / 100, s = t % 1, e = floor(t); startU.push([[s, 0], [1, s], [1 - s, 1], [0, 1 - s]][e]); }
  if (startKind === 1) for (let i = 0; i < 400; i++) { let a = i / 400 * TWO_PI; startU.push([0.5 + 0.3 * Math.cos(a), 0.5 + 0.3 * Math.sin(a)]); }
  if (startKind === 2) {
    for (let i = 0; i < 300; i++) { let a = i / 300 * TWO_PI; startU.push([0.5 + 0.35 * Math.cos(a), 0.5 + 0.35 * Math.sin(a)]); }
    for (let i = 0; i < 60; i++) { let a = Math.PI * (1.2 + 0.6 * i / 60); startU.push([0.5 + 0.2 * Math.cos(a), 0.5 + 0.2 * Math.sin(a)]); }
    for (let i = 0; i < 40; i++) { let a = i / 40 * TWO_PI; startU.push([0.38 + 0.04 * Math.cos(a), 0.62 + 0.04 * Math.sin(a)], [0.62 + 0.04 * Math.cos(a), 0.62 + 0.04 * Math.sin(a)]); }
  }
  if (startKind === 3) startU.push([0.8, 0.2]);
  resetShape();
}
function resetShape() {
  n = 0; thumbs = [];
  ptsX = []; ptsY = []; ptsC = [];
  for (let u of startU) { let w = toWorld(u[0], u[1]); ptsX.push(w[0]); ptsY.push(w[1]); ptsC.push(-1); }
  render();
  chaosG.clear();
}

// ★ ハッチンソン作用素：全部の点を全部の写像で写して合わせる
function applyH() {
  let M = P().maps, nx = [], ny = [], nc = [];
  for (let m = 0; m < M.length; m++) {
    let [a, b, c, d, e, f] = M[m];
    for (let i = 0; i < ptsX.length; i++) {
      nx.push(a * ptsX[i] + b * ptsY[i] + e); ny.push(c * ptsX[i] + d * ptsY[i] + f); nc.push(m);
    }
  }
  // 多すぎたらランダムに間引く（形はほとんど変わらない）
  if (nx.length > maxPts) {
    let keep = maxPts / nx.length, kx = [], ky = [], kc = [];
    for (let i = 0; i < nx.length; i++) if (Math.random() < keep) { kx.push(nx[i]); ky.push(ny[i]); kc.push(nc[i]); }
    nx = kx; ny = ky; nc = kc;
  }
  ptsX = nx; ptsY = ny; ptsC = nc; n++;
  render();
}

function render() {
  viewG.background(16, 18, 30);
  viewG.loadPixels();
  let w = P().view, big = ptsX.length < 20000 ? 2 : 1;
  for (let i = 0; i < ptsX.length; i++) {
    let px = floor((ptsX[i] - w[0]) / (w[1] - w[0]) * V), py = floor(V - (ptsY[i] - w[2]) / (w[3] - w[2]) * V);
    let col = ptsC[i] < 0 ? [255, 255, 255] : hsbToRgb((ptsC[i] * 70 + 180) % 360, 60, 100);
    for (let dx = 0; dx < big; dx++) for (let dy = 0; dy < big; dy++) {
      let X = px + dx, Y = py + dy;
      if (X < 0 || Y < 0 || X >= V || Y >= V) continue;
      let k = (Y * V + X) * 4;
      viewG.pixels[k] = col[0]; viewG.pixels[k + 1] = col[1]; viewG.pixels[k + 2] = col[2]; viewG.pixels[k + 3] = 255;
    }
  }
  viewG.updatePixels();
  thumbs.push(viewG.get());
  if (thumbs.length > 6) thumbs.shift();
}

function contraction() {
  // 各写像の縮小率（行列の最大特異値）のうち最大のもの
  let r = 0;
  for (let [a, b, c, d] of P().maps) {
    let s1 = a * a + b * b + c * c + d * d, det = a * d - b * c;
    r = max(r, Math.sqrt((s1 + Math.sqrt(max(0, s1 * s1 - 4 * det * det))) / 2));
  }
  return r;
}

function draw() {
  background(230, 30, 11);
  if (auto && frameCount % 45 === 0 && n < 12) applyH();
  image(viewG, vx0, vy0);
  if (chaos) { runChaos(); image(chaosG, vx0, vy0); }
  noFill(); stroke(0, 0, 40); rect(vx0, vy0, V, V);

  // 右：これまでの Hⁿ(A) のサムネイル
  let tx = vx0 + V + 40, tw = min(150, (width - tx - 30) / 3 - 10, (V - 150) / 2 - 30);
  noStroke(); fill(0, 0, 70); textSize(14);
  text('これまでの図形（左上が古い）', tx, vy0 - 8);
  for (let i = 0; i < thumbs.length; i++) {
    let x = tx + (i % 3) * (tw + 10), y = vy0 + floor(i / 3) * (tw + 30);
    image(thumbs[i], x, y, tw, tw);
    fill(0, 0, 70); text('H^' + (n - thumbs.length + 1 + i) + '(A)', x, y + tw + 16);
  }
  let r = contraction();
  let ty = vy0 + 2 * (tw + 30) + 20;
  fill(0, 0, 100); textSize(16);
  text('写像 ' + P().maps.length + ' 枚、縮小率 r = ' + nf(r, 1, 3), tx, ty);
  text('d(Hⁿ(A), アトラクタ) ≤ rⁿ · d(A, アトラクタ)、rⁿ = ' + Math.pow(r, n).toExponential(2), tx, ty + 26);
  fill(0, 0, 60); textSize(14);
  text('d はハウスドルフ距離（2 つの図形の「いちばん離れた所」の距離）', tx, ty + 52);
  text('点の数：' + ptsX.length + (ptsX.length >= maxPts * 0.9 ? '（間引き中）' : ''), tx, ty + 76);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((pre + 1) + '：' + P().name + '　n = ' + n + '　スペース：H　A：自動 ' + (auto ? 'ON' : 'off') + '　ドラッグ：描き足す　B：出発の図形　C：消す　G：カオスゲーム ' + (chaos ? 'ON' : 'off') + '　R：最初から', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('白 = 出発の図形 A。色 = どの写像で写されたか。正方形でも顔でも 1 点でも、くり返すと同じ図形（不動点 = アトラクタ）になる', 20, 68);
}

// カオスゲーム：1 点だけを、ランダムに選んだ写像で何度も動かす。それでもアトラクタが浮かぶ
function runChaos() {
  let M = P().maps, w = P().view;
  chaosG.colorMode(HSB, 360, 100, 100, 100); chaosG.noStroke();
  for (let i = 0; i < 1500; i++) {
    let m = floor(Math.random() * M.length);
    if (pre === 1) { let r = Math.random(); m = r < 0.01 ? 0 : r < 0.86 ? 1 : r < 0.93 ? 2 : 3; }   // シダは確率つき
    let [a, b, c, d, e, f] = M[m];
    let nx = a * cx + b * cy + e; cy = c * cx + d * cy + f; cx = nx;
    chaosG.fill(50, 90, 100, 60);
    chaosG.rect((cx - w[0]) / (w[1] - w[0]) * V, V - (cy - w[2]) / (w[3] - w[2]) * V, 1.5, 1.5);
  }
}

function mouseDragged() {
  if (mouseX < vx0 || mouseX > vx0 + V || mouseY < vy0 || mouseY > vy0 + V) { lastMouse = null; return; }
  let u = (mouseX - vx0) / V, v = 1 - (mouseY - vy0) / V;
  if (lastMouse) {
    let steps = ceil(dist(u, v, lastMouse[0], lastMouse[1]) * 300);
    for (let i = 1; i <= steps; i++) startU.push([lerp(lastMouse[0], u, i / steps), lerp(lastMouse[1], v, i / steps)]);
  } else startU.push([u, v]);
  lastMouse = [u, v];
  resetShape();
}
function mouseReleased() { lastMouse = null; }
function keyPressed() {
  if (key === ' ') applyH();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key >= '1' && key <= '4') { pre = int(key) - 1; resetShape(); }
  if (key === 'b' || key === 'B') { startKind = (startKind + 1) % 4; makeStart(); }
  if (key === 'c' || key === 'C') { startU = []; resetShape(); }
  if (key === 'g' || key === 'G') { chaos = !chaos; chaosG.clear(); }
  if (key === 'r' || key === 'R') resetShape();
}

// ---------- やってみよう ----------
// 1. B で出発の図形を正方形 → 円 → 顔 → 1 点と変えて、n = 8 の形を比べよう。全部同じになる理由は？
// 2. シェルピンスキーの 3 枚目の写像の 0.433 を 0.6 にすると形はどう変わる？
// 3. 写像の 0.5 を 0.7 にすると、写した 3 つが重なる。縮小率 r が大きいと何回で「着く」？
// 4. maps に自分の写像を足して、オリジナルの自己相似図形をつくろう（14 の不動点ブラシで手で作れる）

// ==================================================
// ここから下は「道具」
// ==================================================
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  let kf = (k) => (k + h / 60) % 6;
  let fc = (k) => b * (1 - s * Math.max(0, Math.min(kf(k), 4 - kf(k), 1)));
  return [255 * fc(5), 255 * fc(3), 255 * fc(1)];
}
