// ============================================
// 07 点描画（スティップリング）─ 重みつき重心ボロノイ
// 06 のロイド緩和で、重心を「暗さで重みをつけて」計算する → 暗い所に点が集まり、点の間隔がそろった点描画になる
//   各画素を最寄りの点に割り当て（ボロノイ）、暗さ w を重みにした重心 Σ(w·x) / Σw へ点を動かす
// スペース = 緩和 ON/OFF / 1〜3 = 絵 / ←→ = 点の数 / V = 元の絵 / D = 点の大きさを暗さで変える / R = やり直し
// ============================================

let nDots = 2500;         // ★ 点の数
let res = 3;              // ★ 計算に使う画素のまとめ数
let dots = [];
let src, gw, gh, ox = 20, oy = 100;
let dens = null;          // 各画素の暗さ 0〜1
let totalDens = 1;
let running = true;
let picture = 1;
let showSrc = false;
let sizeByDark = true;
let iter = 0, moved = 0;
let gridCs, buckets;      // 近くの点をすばやく探すためのマス目

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  makePicture();
}

// ★ 元の絵を createGraphics に描く（画像ファイルなしでグラデーション・図形・文字）
function makePicture() {
  let w = width - 40, h = height - 120;
  src = createGraphics(w, h);
  src.pixelDensity(1);
  src.colorMode(RGB);
  src.background(255);
  src.noStroke();
  if (picture === 1) {
    for (let x = 0; x < w; x += 4) { src.fill(255 - 230 * x / w); src.rect(x, 0, 4, h); }   // 左から右へ暗くなる
    src.fill(255); src.circle(w * 0.7, h * 0.5, h * 0.55);
    src.fill(40); src.circle(w * 0.25, h * 0.5, h * 0.4);
  } else if (picture === 2) {
    for (let r = h * 0.45; r > 0; r -= 3) { src.fill(255 * r / (h * 0.45)); src.circle(w * 0.3, h * 0.5, r * 2); }   // 球のような影
    src.fill(60); src.rect(w * 0.58, h * 0.15, w * 0.15, h * 0.7);
    src.fill(150); src.triangle(w * 0.78, h * 0.85, w * 0.98, h * 0.85, w * 0.88, h * 0.15);
  } else {
    src.fill(20); src.textAlign(CENTER, CENTER); src.textStyle(BOLD);
    src.textSize(h * 0.62); src.text('p5', w * 0.5, h * 0.45);
    src.textSize(h * 0.12); src.text('VORONOI', w * 0.5, h * 0.88);
  }
  gw = floor(w / res); gh = floor(h / res);
  src.loadPixels();
  dens = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let k = 4 * (gx * res + gy * res * w);
    dens[gx + gy * gw] = 1 - src.pixels[k] / 255;        // 暗いほど 1
  }
  totalDens = 1;
  for (let v of dens) totalDens += v;
  initDots();
}

// 最初の点：暗い所ほど置かれやすい（棄却サンプリング）
function initDots() {
  dots = [];
  let guard = 0;
  while (dots.length < nDots && guard++ < nDots * 200) {
    let gx = floor(random(gw)), gy = floor(random(gh));
    if (random() < dens[gx + gy * gw] * 0.95 + 0.002) dots.push({ x: gx + random(), y: gy + random() });
  }
  iter = 0;
}

function buildBuckets() {
  gridCs = max(2, sqrt(totalDens / max(1, dots.length)));   // 暗い所で 1 マスに点が 1 個くらい
  let bw = ceil(gw / gridCs), bh = ceil(gh / gridCs);
  buckets = { bw, bh, list: Array.from({ length: bw * bh }, () => []) };
  dots.forEach((d, i) => buckets.list[min(bw - 1, floor(d.x / gridCs)) + min(bh - 1, floor(d.y / gridCs)) * bw].push(i));
}
// 近くのマスだけ調べて最寄りの点を探す（近くになければ範囲を広げる）
function nearestDot(x, y) {
  let cx = floor(x / gridCs), cy = floor(y / gridCs), best = -1, bd = Infinity;
  for (let r = 1; r <= 6; r++) {
    for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) {
      if (i < 0 || j < 0 || i >= buckets.bw || j >= buckets.bh) continue;
      for (let k of buckets.list[i + j * buckets.bw]) { let d = (dots[k].x - x) ** 2 + (dots[k].y - y) ** 2; if (d < bd) { bd = d; best = k; } }
    }
    if (best >= 0 && bd <= (r * gridCs) ** 2) break;
  }
  return best;
}

// ★ 重みつきロイドの 1 回
function stippleStep() {
  if (!dots.length) return;
  buildBuckets();
  let sx = new Float32Array(dots.length), sy = new Float32Array(dots.length), sw = new Float32Array(dots.length);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let w = dens[gx + gy * gw];
    if (w < 0.01) continue;                              // 真っ白な所は重心に効かない
    let k = nearestDot(gx + 0.5, gy + 0.5);
    if (k < 0) continue;
    sx[k] += w * (gx + 0.5); sy[k] += w * (gy + 0.5); sw[k] += w;
  }
  moved = 0;
  for (let i = 0; i < dots.length; i++) {
    if (sw[i] <= 0) continue;
    let nx = sx[i] / sw[i], ny = sy[i] / sw[i];
    moved += abs(nx - dots[i].x) + abs(ny - dots[i].y);
    dots[i].x = nx; dots[i].y = ny;
    dots[i].w = sw[i];
  }
  moved /= dots.length;
  iter++;
}

function draw() {
  background(40, 8, 96);
  if (running) stippleStep();
  if (showSrc) { tint(255, 120); image(src, ox, oy); noTint(); }
  noStroke(); fill(230, 40, 15);
  let s = res;
  for (let d of dots) {
    let dk = dens[constrain(floor(d.x), 0, gw - 1) + constrain(floor(d.y), 0, gh - 1) * gw];
    let r = sizeByDark ? 1.5 + 3.5 * dk : 3;               // ★ 点の大きさ
    circle(ox + d.x * s, oy + d.y * s, r);
  }

  fill(0, 0, 15); textSize(18);
  text('スペース：緩和 ' + (running ? 'ON' : 'off') + '　1〜3：絵　←→：点 ' + dots.length + ' 個　V：元の絵　D：大きさを暗さで ' + (sizeByDark ? 'ON' : 'off') + '　R：やり直し　反復 ' + iter, 20, 40);
  fill(0, 0, 35); textSize(15);
  text('各点のセル（最寄りの画素の集まり）の「暗さで重みをつけた重心」へ点を動かす。暗い所に点が集まり、しかも間隔がそろう。平均移動 ' + nf(moved * res, 1, 2) + ' px', 20, 68);
}

function keyPressed() {
  if (key === ' ') running = !running;
  if (key === '1' || key === '2' || key === '3') { picture = int(key); makePicture(); }
  if (key === 'v' || key === 'V') showSrc = !showSrc;
  if (key === 'd' || key === 'D') sizeByDark = !sizeByDark;
  if (key === 'r' || key === 'R') initDots();
  if (key === RIGHT_ARROW) { nDots = min(5000, nDots + 500); initDots(); }
  if (key === LEFT_ARROW) { nDots = max(500, nDots - 500); initDots(); }
}

// ---------- やってみよう ----------
// 1. 緩和を止めた最初の状態（R の直後）と、30 回後を比べよう。ざらざら → なめらかになる理由は？
// 2. 重みを dens の 2 乗にすると、暗い所への集まり方はどう変わる？（コントラストが強くなる）
// 3. makePicture に自分の図形や名前を描いて点描画にしよう。S キーで saveCanvas を足すと保存できる
// 4. 点の代わりに短い線や小さな ♥ を描くと、違うタッチの絵になる
