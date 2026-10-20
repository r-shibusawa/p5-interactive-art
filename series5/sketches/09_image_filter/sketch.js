// ============================================
// 09 画像フィルタ（2次元の信号処理）
// 画像も「信号」。まわりの画素と重みをかけて足す（畳み込み）だけで、
// ぼかし・輪郭・シャープ・エンボスができる
// 1〜5 キーでフィルタを切りかえ（カメラの許可が必要）
// ============================================

let video;
let w = 160, h = 120; // 小さく処理（速くするため）
let out;
let mode = 1;

// ★ 3×3 のカーネル（重みの表）
let kernels = {
  1: { name: 'そのまま', k: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] },
  2: { name: 'ぼかし（平均）', k: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]] },
  3: { name: '輪郭（ラプラシアン）', k: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]] },
  4: { name: 'シャープ', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
  5: { name: 'エンボス', k: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]] },
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  video = createCapture(VIDEO);
  video.size(w, h);
  video.hide();
  out = createImage(w, h);
  noSmooth();
}

function draw() {
  background(20);
  video.loadPixels();
  if (video.pixels.length === 0) return;

  let k = kernels[mode].k;
  out.loadPixels();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0;
      // ★ 畳み込み：まわり 3×3 の画素 × 重み を足す
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          let idx = ((x + i) + (y + j) * w) * 4;
          let wgt = k[j + 1][i + 1];
          r += video.pixels[idx] * wgt;
          g += video.pixels[idx + 1] * wgt;
          b += video.pixels[idx + 2] * wgt;
        }
      }
      let o = (w - 1 - x + y * w) * 4; // 左右反転して鏡に
      if (mode === 5) { r += 128; g += 128; b += 128; } // エンボスは灰色を足す
      out.pixels[o] = constrain(r, 0, 255);
      out.pixels[o + 1] = constrain(g, 0, 255);
      out.pixels[o + 2] = constrain(b, 0, 255);
      out.pixels[o + 3] = 255;
    }
  }
  out.updatePixels();

  // 元の映像（小）と結果（大）
  let scaleF = min((width - 40) / w, (height - 120) / h);
  image(out, (width - w * scaleF) / 2, 100, w * scaleF, h * scaleF);
  push();
  translate(w + 20, 10);
  scale(-1, 1);
  image(video, 0, 0, w, h);
  pop();

  noStroke();
  fill(255);
  textSize(18);
  text('1〜5 でフィルタ：' + kernels[mode].name, w + 40, 40);
  textSize(14);
  fill(180);
  text('カーネル: ' + JSON.stringify(k.map((row) => row.map((v) => round(v * 100) / 100))), w + 40, 70);
}

function keyPressed() {
  if (kernels[key]) mode = int(key);
}

// ---------- やってみよう ----------
// 1. 輪郭フィルタの重みを全部足すと 0。だから平らな場所は黒くなる
// 2. ぼかしは 08 の移動平均の 2次元版。5×5 にするともっとぼける
// 3. 自分のカーネルを 6 として追加しよう（例：横の線だけ出す [[-1,-1,-1],[2,2,2],[-1,-1,-1]]）
