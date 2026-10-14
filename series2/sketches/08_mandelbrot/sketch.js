// ============================================
// 08 マンデルブロ集合（どこまでズームしても終わらない）
// 点ごとに z = z² + c をくり返し、無限に飛んでいくまでの回数で色をつける
// クリック = その場所に 2倍ズーム / Z = ズームアウト / R = リセット
// 1〜3 キーで配色
// ============================================

let img; // 計算した結果を入れる画像
let centerX = -0.6; // 見ている中心（数学の座標）
let centerY = 0;
let zoom = 1; // 拡大率
let maxIter = 120; // 最大くり返し回数（増やすと細かくなるが遅くなる）
let palette = [];
let scheme = 1;
let needRender = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  img = createImage(width, height);
  makePalette();
}

function draw() {
  if (needRender) {
    render();
    needRender = false;
  }
  image(img, 0, 0);

  noStroke();
  fill(0, 180);
  rect(0, 0, width, 44);
  fill(255);
  textSize(16);
  text('クリックでズーム（' + nf(zoom, 1, 0) + '倍）　Z：ズームアウト　R：リセット　1〜3：配色　くり返し ' + maxIter + ' 回', 16, 28);
}

// 画面の全ピクセルについて計算する
function render() {
  // 画面に映る数学的な範囲（横幅 3.5 を zoom で割る）
  let scale = 3.5 / zoom / width;
  img.loadPixels();
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // ピクセル → 数学の座標 c = (cr, ci)
      let cr = centerX + (px - width / 2) * scale;
      let ci = centerY + (py - height / 2) * scale;
      // z = 0 からスタートして、z = z² + c をくり返す
      let zr = 0, zi = 0, n = 0;
      while (n < maxIter && zr * zr + zi * zi < 4) {
        let t = zr * zr - zi * zi + cr; // 実部
        zi = 2 * zr * zi + ci; // 虚部
        zr = t;
        n++;
      }
      // n 回で飛んでいった → その回数で色をつける（最後まで残った点は黒）
      let i = (px + py * width) * 4;
      let c = n === maxIter ? [0, 0, 0] : palette[n];
      img.pixels[i] = c[0];
      img.pixels[i + 1] = c[1];
      img.pixels[i + 2] = c[2];
      img.pixels[i + 3] = 255;
    }
  }
  img.updatePixels();
}

// 回数 → 色 の表をあらかじめ作っておく（速くするため）
function makePalette() {
  palette = [];
  colorMode(HSB, 360, 100, 100);
  for (let n = 0; n <= maxIter; n++) {
    let t = n / maxIter;
    let c;
    if (scheme === 1) c = color((200 + sqrt(t) * 300) % 360, 80, 100 * min(1, t * 6 + 0.2));
    else if (scheme === 2) c = color(30 + t * 40, 90, sqrt(t) * 100);
    else c = color(0, 0, (n % 2) * 60 + sqrt(t) * 40);
    palette.push([red(c), green(c), blue(c)]);
  }
  colorMode(RGB, 255);
}

function mousePressed() {
  if (mouseY < 44) return;
  // クリックした場所を新しい中心にして 2倍ズーム
  let scale = 3.5 / zoom / width;
  centerX += (mouseX - width / 2) * scale;
  centerY += (mouseY - height / 2) * scale;
  zoom *= 2;
  maxIter = min(600, 120 + floor(log(zoom) / log(2)) * 25); // 深くズームしたら回数も増やす
  makePalette();
  needRender = true;
}

function keyPressed() {
  if (key === 'z' || key === 'Z') {
    zoom = max(1, zoom / 2);
    needRender = true;
  }
  if (key === 'r' || key === 'R') {
    centerX = -0.6;
    centerY = 0;
    zoom = 1;
    maxIter = 120;
    makePalette();
    needRender = true;
  }
  if (key >= '1' && key <= '3') {
    scheme = int(key);
    makePalette();
    needRender = true;
  }
  if (key === 's' || key === 'S') saveCanvas('mandelbrot', 'png');
}

// ---------- やってみよう ----------
// 1. 黒い部分のふち（境界）を何回もクリックしてズームしよう。小さなマンデルブロが見つかる！
// 2. z = z² + c の「2乗」を「3乗」にすると別の集合になる
//    実部: zr*zr*zr - 3*zr*zi*zi + cr   虚部: 3*zr*zr*zi - zi*zi*zi + ci
// 3. 配色の式を変えて、自分だけの色にしよう
