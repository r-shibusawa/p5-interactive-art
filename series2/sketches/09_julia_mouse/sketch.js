// ============================================
// 09 ジュリア集合（マウスで形が変わる）
// マンデルブロと同じ式 z = z² + c。でも c をマウスで決めて、
// 全部の点を z のスタート地点にする → マウスを動かすと形がリアルタイムに変わる
// クリックで止める／動かす  1〜3 で配色
// ============================================

let img;
let w = 240; // 計算する画像の大きさ（小さいほど速い）
let h = 135;
let maxIter = 60;
let palette = [];
let scheme = 1;
let frozen = false;
let cr = -0.7, ci = 0.27;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  img = createImage(w, h);
  makePalette();
  noSmooth(); // 拡大したときにドットをそのまま見せる（smooth() にするとなめらか）
}

function draw() {
  if (!frozen) {
    // マウスの位置 → c の値（横: -1.5〜1.5, 縦: -1〜1）
    cr = map(mouseX, 0, width, -1.5, 1.5);
    ci = map(mouseY, 0, height, -1, 1);
  }

  img.loadPixels();
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      // この点を z のスタート地点にする
      let zr = map(px, 0, w, -1.8, 1.8);
      let zi = map(py, 0, h, -1.0, 1.0);
      let n = 0;
      while (n < maxIter && zr * zr + zi * zi < 4) {
        let t = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = t;
        n++;
      }
      let i = (px + py * w) * 4;
      let c = palette[n];
      img.pixels[i] = c[0];
      img.pixels[i + 1] = c[1];
      img.pixels[i + 2] = c[2];
      img.pixels[i + 3] = 255;
    }
  }
  img.updatePixels();
  image(img, 0, 0, width, height); // 小さい画像を画面いっぱいに拡大

  noStroke();
  fill(0, 180);
  rect(0, 0, width, 44);
  fill(255);
  textSize(16);
  text('c = ' + nf(cr, 1, 3) + ' + ' + nf(ci, 1, 3) + 'i　マウスで c を変える　クリックで' + (frozen ? '再開' : '固定') + '　1〜3：配色', 16, 28);
}

function makePalette() {
  palette = [];
  colorMode(HSB, 360, 100, 100);
  for (let n = 0; n <= maxIter; n++) {
    let t = n / maxIter;
    let c;
    if (n === maxIter) c = color(0, 0, 0);
    else if (scheme === 1) c = color((280 + t * 200) % 360, 70, 30 + sqrt(t) * 70);
    else if (scheme === 2) c = color(180 - t * 60, 80, sqrt(t) * 100);
    else c = color(0, 0, (n % 2) * 70 + t * 30);
    palette.push([red(c), green(c), blue(c)]);
  }
  colorMode(RGB, 255);
}

function mousePressed() {
  if (mouseY > 44) frozen = !frozen;
}

function keyPressed() {
  if (key >= '1' && key <= '3') {
    scheme = int(key);
    makePalette();
  }
  if (key === 's' || key === 'S') saveCanvas('julia', 'png');
}

// ---------- やってみよう ----------
// 1. マウスをゆっくり動かして、c によって「つながる／ちぎれる」境目を探そう
// 2. w, h を 480, 270 にすると細かくなる（重くなったら戻す）
// 3. maxIter を 20 や 200 にすると？
