// ============================================
// 12 力学系と貴金属比 ─ 猫写像とフィボナッチ行列
// 画素 (x, y) を (n·x + y, x) mod P に動かす。行列 [[n, 1], [1, 0]] の固有値は φn と −1/φn
//   φn 方向に引きのばされ、−1/φn 方向に縮む。ぐちゃぐちゃになるのに、何回かで元の絵に戻る！
// スペース = 1 回 / A = 自動 / ←→ = n / ↑↓ = 絵の大きさ P / R = 元の絵に戻す / D = 絵をかえる
// ============================================

let n = 1;              // ★ 行列 [[n, 1], [1, 0]]
let sizes = [60, 89, 101, 128, 150, 199, 256];
let sIdx = 3;           // ★ P = sizes[sIdx]
let P;
let pic, buf;           // 絵（P×P）
let iter = 0, period = 0;
let auto = false;
let design = 0;
let tick = 0;
let hist = [];          // 元の絵との一致率の記録

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  reset();
}

function reset() {
  P = sizes[sIdx];
  if (pic) { pic.remove(); buf.remove(); }
  pic = createGraphics(P, P); buf = createGraphics(P, P);
  pic.pixelDensity(1); buf.pixelDensity(1);
  drawPicture(pic);
  pic.loadPixels();
  orig = pic.pixels.slice();
  iter = 0;
  hist = [1];
  period = matrixPeriod(n, P);
}
let orig = [];

// 元の絵：顔・しま・文字
function drawPicture(g) {
  g.colorMode(HSB, 360, 100, 100);
  g.background(220, 30, 15);
  g.noStroke();
  if (design === 0) {
    g.fill(45, 80, 100); g.circle(P / 2, P / 2, P * 0.8);
    g.fill(0, 0, 10); g.circle(P * 0.36, P * 0.42, P * 0.12); g.circle(P * 0.64, P * 0.42, P * 0.12);
    g.noFill(); g.stroke(0, 0, 10); g.strokeWeight(P * 0.04); g.arc(P / 2, P * 0.55, P * 0.4, P * 0.3, 0.2, PI - 0.2);
  } else if (design === 1) {
    for (let i = 0; i < 8; i++) { g.fill(i * 45, 70, 95); g.rect(i * P / 8, 0, P / 8, P); }
  } else {
    g.fill(0, 0, 100); g.textAlign(CENTER, CENTER); g.textSize(P * 0.5); g.text('φ', P / 2, P / 2);
  }
}

// 1 回の写像：(x, y) → (n·x + y, x) mod P
function stepMap() {
  pic.loadPixels(); buf.loadPixels();
  let src = pic.pixels, dst = buf.pixels;
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    let nx = (n * x + y) % P, ny = x;
    let i = 4 * (y * P + x), j = 4 * (ny * P + nx);
    dst[j] = src[i]; dst[j + 1] = src[i + 1]; dst[j + 2] = src[i + 2]; dst[j + 3] = 255;
  }
  buf.updatePixels();
  let t = pic; pic = buf; buf = t;
  iter++;
  // 元の絵とどれくらい同じか
  pic.loadPixels();
  let same = 0;
  for (let i = 0; i < pic.pixels.length; i += 4) if (pic.pixels[i] === orig[i] && pic.pixels[i + 1] === orig[i + 1]) same++;
  hist.push(same / (P * P));
  if (hist.length > 400) hist.shift();
}

function draw() {
  background(230, 25, 9);
  if (auto) { tick++; if (tick % 6 === 0) stepMap(); }

  let side = min(height - 170, width * 0.48);
  let x0 = 40, y0 = 110;
  noSmooth();
  image(pic, x0, y0, side, side);
  smooth();
  noFill();
  stroke(0, 0, 100, 40);
  rect(x0, y0, side, side);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('行列 [[' + n + ', 1], [1, 0]]（←→）　P = ' + P + '（↑↓）　' + iter + ' 回目　周期 ' + period + ' 回で元に戻る　スペース：1 回　A：自動 ' + (auto ? 'ON' : 'off') + '　R：戻す　D：絵', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('かけ算と mod だけの決まった規則なのに見た目はランダム（カオス）。でも画素の数は有限なので、いつか必ず元の絵に戻る', 20, 68);

  // 右：単位正方形がどう引きのばされるか
  let px = x0 + side + 60, py = y0 + 20, u = min(70, (width - px - 40) / (n + 3));
  let phi = metallic(n);
  push();
  translate(px + u, py + u * 2.2);
  stroke(0, 0, 100, 25);
  line(-u, 0, u * (n + 2), 0); line(0, u, 0, -u * 2);
  // もとの正方形（y を上向きに描く）
  fill(200, 50, 90, 30); stroke(200, 60, 100);
  quad(0, 0, u, 0, u, -u, 0, -u);
  // 移った平行四辺形：(1,0)→(n,1), (0,1)→(1,0)
  fill(45, 70, 100, 30); stroke(45, 80, 100);
  quad(0, 0, n * u, -u, (n + 1) * u, -u, u, 0);
  // 固有ベクトル (φ, 1) 方向
  stroke(330, 80, 100);
  strokeWeight(2);
  let L = u * 2.5 / Math.hypot(phi, 1);
  line(-phi * L * 0.3, L * 0.3, phi * L, -L);
  pop();
  noStroke();
  fill(0, 0, 80);
  textSize(14);
  let ty = py + u * 3.6;
  text('青 = 1×1 の正方形　黄 = 行列で移した形（面積は同じ 1）', px, ty);
  fill(330, 70, 100);
  text('ピンク = 固有ベクトル (φ, 1)：この方向は φ = ' + nf(phi, 1, 4) + ' 倍にのびる', px, ty + 22);
  fill(0, 0, 80);
  text('直交する方向は 1/φ = ' + nf(1 / phi, 1, 4) + ' 倍に縮む（向きも反転）', px, ty + 44);
  text('この行列の k 乗の成分は 03 の一般化フィボナッチ数！', px, ty + 66);
  text('n = 1 の 2 乗 [[2, 1], [1, 1]] がアーノルドの猫写像', px, ty + 88);

  // 一致率のグラフ
  let gx = px, gy = ty + 120, gw = width - px - 40, gh = min(150, height - gy - 40);
  if (gh > 40) {
    noFill();
    stroke(0, 0, 100, 20);
    rect(gx, gy, gw, gh, 4);
    stroke(120, 70, 100);
    beginShape();
    for (let i = 0; i < hist.length; i++) vertex(gx + i * gw / 400, gy + gh - hist[i] * gh);
    endShape();
    noStroke();
    fill(0, 0, 70);
    textSize(13);
    text('元の絵と同じ画素の割合（100% にもどる瞬間を待とう）', gx + 6, gy + 16);
  }
}

function keyPressed() {
  if (key === ' ') stepMap();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === RIGHT_ARROW) { n = min(n + 1, 5); reset(); }
  if (key === LEFT_ARROW) { n = max(n - 1, 1); reset(); }
  if (key === UP_ARROW) { sIdx = min(sIdx + 1, sizes.length - 1); reset(); }
  if (key === DOWN_ARROW) { sIdx = max(sIdx - 1, 0); reset(); }
  if (key === 'r' || key === 'R') reset();
  if (key === 'd' || key === 'D') { design = (design + 1) % 3; reset(); }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. P = 101 と P = 128 で周期をくらべよう。P を少し変えるだけで周期は大きく変わる
// 2. 周期のちょうど半分のとき、絵はどうなっている？（さかさまになることがある）
// 3. 行列を [[2, 1], [1, 1]]（猫写像）に変えるには stepMap の nx, ny をどう書く？
// 4. 自分の名前を drawPicture に描いて、ぐちゃぐちゃ → 元どおりを見せよう

// ---------- 道具 ----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
// 行列 [[n,1],[1,0]] を mod P で何回かけると単位行列にもどるか
function matrixPeriod(nn, m) {
  let a = 1, b = 0, c = 0, d = 1;
  for (let k = 1; k <= 6 * m; k++) {
    let na = (nn * a + c) % m, nb = (nn * b + d) % m, nc = a % m, nd = b % m;
    a = na; b = nb; c = nc; d = nd;
    if (a === 1 % m && b === 0 && c === 0 && d === 1 % m) return k;
  }
  return -1;
}
