// ============================================
// 15 カメラ映像をレンズで見る（おまけ）
// 画面の各点について「どこから光が来たか」を計算し、カメラ映像のその場所の色を持ってくる（逆向きの光線追跡）
//   1 = 凸レンズ（中心ほど拡大）  2 = 魚眼（視野を押し込む）  3 = 水面の波紋（屈折がゆらぐ）
//   カメラが使えないときはカラーバーの画像で動く（カメラの許可が必要）
// マウス = レンズの中心 / 1〜3 = モード / ↑↓ = 強さ / ←→ = レンズの大きさ
// ============================================

let cap, fallback;
let vw = 160, vh = 120;     // ★ カメラ画像の大きさ（小さいほど速い）
let cell = 4;               // ★ 出力の粗さ（px）
let lensKind = 1;
let strength = 1.0;         // ★ 効果の強さ
let lensR = 260;            // ★ レンズの半径（px）
let out, ow, oh;
let haveCam = false;
let time = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  ow = Math.ceil(width / cell); oh = Math.ceil(height / cell);
  out = createImage(ow, oh);
  // カメラが使えないときの代わりの画像（カラーバー + 格子）
  fallback = createImage(vw, vh);
  fallback.loadPixels();
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
    let bar = Math.floor(x / vw * 7);
    let cols = [[255, 255, 255], [255, 220, 0], [0, 220, 220], [0, 200, 0], [220, 0, 220], [220, 0, 0], [0, 0, 220]];
    let c = cols[bar];
    let g = (x % 16 < 2 || y % 16 < 2) ? 0.35 : 1;
    let i = (y * vw + x) * 4;
    fallback.pixels[i] = c[0] * g; fallback.pixels[i + 1] = c[1] * g; fallback.pixels[i + 2] = c[2] * g; fallback.pixels[i + 3] = 255;
  }
  fallback.updatePixels();
}

// ★ 画面の点 (x, y)（レンズ中心からの相対位置）→ 光が来た元の位置（相対）
function sourceOffset(dx, dy) {
  let r = Math.hypot(dx, dy);
  if (lensKind === 1) {
    // 凸レンズ（虫めがね）：中心で倍率 1 + strength、縁で 1 に戻る
    if (r >= lensR) return [dx, dy];
    let u = r / lensR, mag = 1 + strength * (1 - u * u);
    return [dx / mag, dy / mag];
  }
  if (lensKind === 2) {
    // 魚眼：角度 θ に比例した距離に写る（等距離射影）。縁ほど押し込まれる
    if (r >= lensR) return [dx, dy];
    let u = r / lensR, k = 0.3 + strength * 1.2;
    let rr = Math.tan(u * Math.atan(k)) / k;                    // 0〜1 → 0〜1（外側ほど急に伸びる）
    let s = rr * lensR / Math.max(r, 1e-6);
    return [dx * s, dy * s];
  }
  // 水面の波紋：高さ h = sin(k r − ωt) の傾きで光が曲がる（屈折）
  let slope = Math.cos(r * 0.08 - time * 4) * Math.exp(-r / (lensR * 1.2)) * 0.08;
  let shift = slope * 220 * strength;
  if (r < 1e-6) return [dx, dy];
  return [dx + dx / r * shift, dy + dy / r * shift];
}

function draw() {
  time += 0.016;
  let src = fallback;
  if (cap && cap.width > 0) { cap.loadPixels(); if (cap.pixels && cap.pixels.length >= vw * vh * 4) { src = cap; haveCam = true; } }
  if (src === fallback) fallback.loadPixels();
  let sp = src.pixels;
  let sw = src.width, sh = src.height;

  out.loadPixels();
  let op = out.pixels;
  let cx = mouseX, cy = mouseY;
  for (let j = 0; j < oh; j++) for (let i = 0; i < ow; i++) {
    let x = i * cell + cell / 2, y = j * cell + cell / 2;
    let off = sourceOffset(x - cx, y - cy);
    let sxp = cx + off[0], syp = cy + off[1];
    // 画面の座標 → カメラ画像の座標（画面いっぱいに引き伸ばしてある）
    let u = Math.floor(sxp / width * sw), v = Math.floor(syp / height * sh);
    u = Math.max(0, Math.min(sw - 1, u)); v = Math.max(0, Math.min(sh - 1, v));
    let si = (v * sw + u) * 4, oi = (j * ow + i) * 4;
    op[oi] = sp[si]; op[oi + 1] = sp[si + 1]; op[oi + 2] = sp[si + 2]; op[oi + 3] = 255;
  }
  out.updatePixels();
  image(out, 0, 0, ow * cell, oh * cell);

  // レンズの縁
  noFill(); stroke(255, 255, 255, 120); strokeWeight(2); circle(cx, cy, lensR * 2);
  noStroke(); fill(0, 0, 0, 140); rect(10, 14, 900, 70, 8);
  fill(255); textSize(18);
  text(['', '凸レンズ（虫めがね）', '魚眼レンズ', '水面の波紋'][lensKind] + '（1〜3）　強さ ' + nf(strength, 1, 1) + '（↑↓）　半径 ' + lensR + '（←→）　' + (haveCam ? 'カメラ ON' : 'カメラなし：代わりの画像'), 20, 40);
  fill(200); textSize(15);
  text('マウスがレンズの中心。各ピクセルについて「光がどこから来たか」を逆にたどって色を取ってくる', 20, 68);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') lensKind = Number(key);
  if (key === UP_ARROW) strength = Math.min(3, strength + 0.2);
  if (key === DOWN_ARROW) strength = Math.max(0.2, strength - 0.2);
  if (key === RIGHT_ARROW) lensR = Math.min(600, lensR + 20);
  if (key === LEFT_ARROW) lensR = Math.max(60, lensR - 20);
}

// ---------- やってみよう ----------
// 1. 凸レンズの倍率の式 mag を「1 − strength × (1 − u²)」（1 より小さく）にすると凹レンズ（縮小）になる
// 2. 魚眼で strength を最大に。ドアののぞき穴・車のバックカメラと同じ見え方
// 3. 波紋の中心を複数（マウス + 固定点）にして、波が重なる干渉（06）を見よう
// 4. sourceOffset に「波長で変わるずれ」を足すと、色がにじむ（色収差）。RGB を別々にサンプリングしてみよう
