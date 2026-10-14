// ============================================
// 04 反応拡散（チューリング・パターン）
// 2種類の化学物質 A と B が「広がる」「反応する」だけで、
// ヒョウの斑点やシマウマの縞、サンゴのような模様が自然にできる
// クリック・ドラッグで B をたらす / 1〜4 キーで模様のタイプ
// ============================================

let w = 160, h = 90; // 計算する大きさ（小さいほど速い）
let A, B, nextA, nextB;
let img;
let dA = 1.0, dB = 0.5; // 広がる速さ
let feed = 0.055, kill = 0.062; // 反応のパラメータ（これで模様が変わる）
let presets = [
  { name: '斑点（ヒョウ）', f: 0.035, k: 0.065 },
  { name: 'サンゴ', f: 0.055, k: 0.062 },
  { name: 'ミトコンドリア', f: 0.03, k: 0.06 },
  { name: '波', f: 0.014, k: 0.045 },
];
let presetName = 'サンゴ';

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  img = createImage(w, h);
  A = new Float32Array(w * h).fill(1);
  B = new Float32Array(w * h).fill(0);
  nextA = new Float32Array(w * h);
  nextB = new Float32Array(w * h);
  // 真ん中に B をひとたらし
  for (let i = 0; i < 300; i++) B[floor(random(w * h))] = 1;
}

function draw() {
  // 1フレームに 8 回計算を進める
  for (let n = 0; n < 8; n++) update();

  // 描く：B の濃さで色をつける
  img.loadPixels();
  for (let i = 0; i < w * h; i++) {
    let v = constrain(B[i] * 3, 0, 1);
    let p = i * 4;
    img.pixels[p] = 20 + v * 220;
    img.pixels[p + 1] = 30 + v * 120;
    img.pixels[p + 2] = 60 + (1 - v) * 80;
    img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  image(img, 0, 0, width, height);

  noStroke();
  fill(0, 180);
  rect(0, 0, width, 44);
  fill(255);
  textSize(16);
  text('クリック・ドラッグで B をたらす　1〜4：' + presetName + '（f=' + feed + ', k=' + kill + '）', 16, 28);
}

// ★ グレイ＝スコット・モデル：A と B のルール
function update() {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let i = x + y * w;
      let a = A[i], b = B[i];
      // まわりとの差（ラプラシアン）＝「広がる」のもと
      let la = laplace(A, x, y), lb = laplace(B, x, y);
      let abb = a * b * b; // A と B が出会うと A が B に変わる（反応）
      nextA[i] = a + (dA * la - abb + feed * (1 - a));
      nextB[i] = b + (dB * lb + abb - (kill + feed) * b);
      nextA[i] = constrain(nextA[i], 0, 1);
      nextB[i] = constrain(nextB[i], 0, 1);
    }
  }
  [A, nextA] = [nextA, A];
  [B, nextB] = [nextB, B];
}

function laplace(arr, x, y) {
  let xm = (x - 1 + w) % w, xp = (x + 1) % w;
  let ym = (y - 1 + h) % h, yp = (y + 1) % h;
  return (
    -arr[x + y * w] +
    0.2 * (arr[xm + y * w] + arr[xp + y * w] + arr[x + ym * w] + arr[x + yp * w]) +
    0.05 * (arr[xm + ym * w] + arr[xp + ym * w] + arr[xm + yp * w] + arr[xp + yp * w])
  );
}

function mouseDragged() {
  drop();
}
function mousePressed() {
  drop();
}
function drop() {
  let cx = floor(map(mouseX, 0, width, 0, w));
  let cy = floor(map(mouseY, 0, height, 0, h));
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      let x = (cx + i + w) % w, y = (cy + j + h) % h;
      B[x + y * w] = 1;
    }
  }
}

function keyPressed() {
  let i = int(key) - 1;
  if (i >= 0 && i < presets.length) {
    feed = presets[i].f;
    kill = presets[i].k;
    presetName = presets[i].name;
  }
}

// ---------- やってみよう ----------
// 1. 1〜4 で模様を切りかえて、しばらく待とう。模様が「育つ」
// 2. feed と kill を自分で少しずつ変えてみる（0.01 ずらすだけで別の模様）
// 3. 色の式を変えて、本物の動物の柄に近づけよう
