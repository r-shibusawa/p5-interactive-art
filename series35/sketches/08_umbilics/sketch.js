// ============================================
// 08 臍点（へそ）のカタストロフィー（双曲・楕円・放物）
// 状態が 2 つ (x, y) ある地形 V(x, y)。左 = 地形の等高線と平衡点（● 谷、▲ 山、✕ 峠）
//   右 = コントロール (u, v) の平面。黄の線（分岐集合）をこえると平衡点が 2 つ生まれる / 消える
//   楕円 = 三角形（デルトイド）、双曲 = 1 本の折り目と 1 つのカスプ、放物 = その中間。光のコースティクス（09）にも同じ形が出る
// マウス（右の平面）= (u, v) / 1〜3 = 種類 / ↑↓ = w（形の大きさ） / G = 等高線の線
// ============================================

let kind = 1;               // 1 楕円, 2 双曲, 3 放物
let w = 1.2;                // ★ 形の大きさ
let tP = -0.5;              // ★ 放物の追加パラメータ
let u = 0.3, v = 0.2;       // コントロール
let R = 1.6;                // 状態 (x, y) の表示範囲
let UR = 2.5;               // コントロール (u, v) の表示範囲
let map2, setG;             // 等高線の絵・分岐集合の絵
let lastKey = '';
let lines_ = true;
let names = ['', '楕円の臍点  V = x³ − 3xy² + w(x² + y²) − ux − vy', '双曲の臍点  V = x³ + y³ + w·xy − ux − vy', '放物の臍点  V = x²y + y⁴ + w·x² + t·y² − ux − vy'];

// ★ 地形（u, v の 1 次の項を除いた部分）と、その勾配・ヘッセ行列（2 階微分）
function V0(x, y) {
  if (kind === 1) return x ** 3 - 3 * x * y * y + w * (x * x + y * y);
  if (kind === 2) return x ** 3 + y ** 3 + w * x * y;
  return x * x * y + y ** 4 + w * x * x + tP * y * y;
}
function grad0(x, y) {
  if (kind === 1) return [3 * x * x - 3 * y * y + 2 * w * x, -6 * x * y + 2 * w * y];
  if (kind === 2) return [3 * x * x + w * y, 3 * y * y + w * x];
  return [2 * x * y + 2 * w * x, x * x + 4 * y ** 3 + 2 * tP * y];
}
function hess0(x, y) {
  if (kind === 1) return [6 * x + 2 * w, -6 * y, -6 * x + 2 * w];   // [xx, xy, yy]
  if (kind === 2) return [6 * x, w, 6 * y];
  return [2 * y + 2 * w, 2 * x, 12 * y * y + 2 * tP];
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  map2 = createGraphics(150, 150); map2.pixelDensity(1);
}

// 分岐集合：det H = 0 の曲線を (x, y) → 勾配 = (u, v) へ写す
function buildSet(sz) {
  if (setG) setG.remove();
  setG = createGraphics(sz, sz);
  setG.noStroke(); setG.fill(255, 220, 90);
  let N = 260, d = [];
  for (let i = 0; i <= N; i++) { d.push([]); for (let j = 0; j <= N; j++) { let h = hess0(-R * 1.6 + 3.2 * R * i / N, -R * 1.6 + 3.2 * R * j / N); d[i].push(h[0] * h[2] - h[1] * h[1]); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    for (let [di, dj] of [[1, 0], [0, 1]]) {
      let d0 = d[i][j], d1 = d[i + di][j + dj];
      if (d0 * d1 < 0) {
        let s = d0 / (d0 - d1);
        let x = -R * 1.6 + 3.2 * R * (i + di * s) / N, y = -R * 1.6 + 3.2 * R * (j + dj * s) / N;
        let g = grad0(x, y);
        if (abs(g[0]) < UR && abs(g[1]) < UR) setG.circle((g[0] + UR) / (2 * UR) * sz, (UR - g[1]) / (2 * UR) * sz, 2.5);
      }
    }
  }
}

// 平衡点（勾配 = (u, v)）をニュートン法で探す
function criticalPoints() {
  let out = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    let x = -R + 2 * R * i / 6, y = -R + 2 * R * j / 6;
    for (let k = 0; k < 30; k++) {
      let g = grad0(x, y), h = hess0(x, y);
      let fx = g[0] - u, fy = g[1] - v, det = h[0] * h[2] - h[1] * h[1];
      if (abs(det) < 1e-9) break;
      let dx = (h[2] * fx - h[1] * fy) / det, dy = (-h[1] * fx + h[0] * fy) / det;
      x -= constrain(dx, -0.5, 0.5); y -= constrain(dy, -0.5, 0.5);
    }
    let g = grad0(x, y);
    if (abs(g[0] - u) + abs(g[1] - v) < 1e-6 && abs(x) < R && abs(y) < R && !out.some((p) => abs(p.x - x) + abs(p.y - y) < 1e-3)) {
      let h = hess0(x, y), det = h[0] * h[2] - h[1] * h[1];
      out.push({ x, y, type: det < 0 ? 'saddle' : h[0] > 0 ? 'min' : 'max' });
    }
  }
  return out;
}

function draw() {
  background(200, 25, 10);
  let py = 110, sz = min(height - py - 50, (width - 90) / 2);
  let lx = 30, rx = lx + sz + 30;
  let k = kind + ',' + w;
  if (k !== lastKey) { buildSet(floor(sz)); lastKey = k; }

  // ---- 左：等高線
  map2.loadPixels();
  let vals = [], lo = 1e9, hi = -1e9;
  for (let j = 0; j < 150; j++) for (let i = 0; i < 150; i++) {
    let x = -R + 2 * R * (i + 0.5) / 150, y = R - 2 * R * (j + 0.5) / 150;
    let val = V0(x, y) - u * x - v * y; vals.push(val); lo = min(lo, val); hi = max(hi, val);
  }
  // 高さを圧縮した「段」の番号。となりの画素と段がちがう所 = 等高線
  let lev = vals.map((val) => Math.floor(Math.asinh((val - (lo + hi) / 2) * 3) * 2.5));
  for (let n = 0; n < vals.length; n++) {
    let s = (vals[n] - lo) / (hi - lo + 1e-9);
    let edge = lines_ && ((n % 150 < 149 && lev[n] !== lev[n + 1]) || (n + 150 < vals.length && lev[n] !== lev[n + 150]));
    let line_ = edge ? 70 : 0;
    map2.pixels[4 * n] = 30 + 200 * s ** 0.6 + line_; map2.pixels[4 * n + 1] = 50 + 80 * s + line_; map2.pixels[4 * n + 2] = 140 - 100 * s + line_; map2.pixels[4 * n + 3] = 255;
  }
  map2.updatePixels();
  noSmooth(); image(map2, lx, py, sz, sz); smooth();
  let cps = criticalPoints();
  let mins = 0;
  for (let p of cps) {
    let sx = lx + (p.x + R) / (2 * R) * sz, sy = py + (R - p.y) / (2 * R) * sz;
    if (p.type === 'min') { mins++; noStroke(); fill(160, 80, 100); circle(sx, sy, 16); }
    else if (p.type === 'max') { noStroke(); fill(0, 80, 100); triangle(sx, sy - 10, sx - 9, sy + 7, sx + 9, sy + 7); }
    else { stroke(0, 0, 100); strokeWeight(3); line(sx - 7, sy - 7, sx + 7, sy + 7); line(sx - 7, sy + 7, sx + 7, sy - 7); }
  }
  noStroke(); fill(0, 0, 100); textSize(14);
  text('地形 V(x, y)：暗い = 低い、明るい = 高い。● 谷 ' + mins + '　▲ 山　✕ 峠　平衡点 ' + cps.length + ' 個', lx + 10, py + 20);

  // ---- 右：コントロール平面
  noStroke(); fill(200, 25, 16); rect(rx, py, sz, sz);
  stroke(0, 0, 100, 20); strokeWeight(1); line(rx + sz / 2, py, rx + sz / 2, py + sz); line(rx, py + sz / 2, rx + sz, py + sz / 2);
  image(setG, rx, py);
  noStroke(); fill(0, 0, 100); circle(rx + (u + UR) / (2 * UR) * sz, py + (UR - v) / (2 * UR) * sz, 14);
  fill(0, 0, 90); textSize(14);
  text('コントロール (u, v)：マウスで動かす。黄 = 分岐集合', rx + 10, py + 20);

  noStroke(); fill(0, 0, 100); textSize(18);
  text(names[kind] + '　w = ' + nf(w, 1, 2) + '（↑↓）　1〜3：種類　G：等高線', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('点を黄の線の外から中へ動かすと、谷（または山）と峠が 1 組生まれる。とがった所（カスプ）では 3 つが一度に合体する', 20, 68);
}

function mouseMoved() {
  let py = 110, sz = min(height - py - 50, (width - 90) / 2), rx = 60 + sz;
  if (mouseX > rx && mouseX < rx + sz && mouseY > py && mouseY < py + sz) {
    u = (mouseX - rx) / sz * 2 * UR - UR; v = UR - (mouseY - py) / sz * 2 * UR;
  }
}
function mouseDragged() { mouseMoved(); }
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') kind = Number(key);
  if (key === UP_ARROW) w = min(2.5, w + 0.2);
  if (key === DOWN_ARROW) w = max(-2.5, w - 0.2);
  if (key === 'g' || key === 'G') lines_ = !lines_;
}

// ---------- やってみよう ----------
// 1. 楕円（1）で三角形の外・中に点を置いて、平衡点の数を数えよう（外 = 峠 2 つ、中 = 谷 1 つ + 峠 3 つ）
// 2. w = 0 にすると三角形は 1 点につぶれる。そこが「臍点（へそ）」
// 3. 双曲（2）では、カスプの近くで ● と ✕ と ✕ がどう合体するか、ゆっくり見よう
// 4. 放物（3）で tP を −1 や +0.5 に変えて、楕円と双曲の間の形を探そう
