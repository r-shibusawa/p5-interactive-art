// ============================================
// 08 薄膜干渉（シャボン玉の色）
// 薄い膜の表と裏で反射した 2 つの光が干渉する。膜の厚さ t で強め合う波長が変わる → 場所ごとに違う色
//   位相差 δ = 2π · 2 n t cosθ' / λ + π    （+π は「屈折率が大きい物質で反射するとき」の位相の反転）
//   反射の強さ I(λ) ∝ 1 + cos δ   → 波長ごとに計算して足し合わせると見える色になる
// 1〜3 = 膜の形（くさび・シャボン膜・ニュートン環） / マウス = 厚さの勾配・中心 / ↑↓ = 膜の屈折率 n / P = 位相の反転 ON/off
// ============================================

let nFilm = 1.33;         // ★ 膜の屈折率（水 1.33、油 1.45）
let inversion = true;     // 表面での位相の反転を考える
let shapeKind = 2;        // 1 くさび、2 シャボン膜、3 ニュートン環
let cell = 4;             // ★ 計算の粗さ（px）
let maxT = 1200;          // 色の表の最大厚さ（nm）
let lut = [];             // 厚さ 2 nm ごとの色
let img, gw, gh, noiseMap;
let time = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  gw = Math.ceil(width / cell); gh = Math.ceil(height / cell);
  img = createImage(gw, gh);
  noiseMap = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) noiseMap[j * gw + i] = noise(i * 0.02, j * 0.02) - 0.5;
  buildLUT();
}

// ★ 厚さ t(nm) → 色：波長 400〜700 nm を 10 nm ごとに足し合わせる
function buildLUT() {
  lut = [];
  let wsum = [0, 0, 0];
  let cols = [];
  for (let nm = 400; nm <= 700; nm += 10) { let c = wavelengthToRGB(nm); cols.push(c); wsum[0] += c[0]; wsum[1] += c[1]; wsum[2] += c[2]; }
  for (let t = 0; t <= maxT; t += 2) {
    let acc = [0, 0, 0], i = 0;
    for (let nm = 400; nm <= 700; nm += 10) {
      let delta = TWO_PI * 2 * nFilm * t / nm + (inversion ? Math.PI : 0);
      let I = (1 + Math.cos(delta)) / 2;                // 2 つの反射光の干渉（0〜1）：位相差 0 で強め合う
      acc[0] += I * cols[i][0]; acc[1] += I * cols[i][1]; acc[2] += I * cols[i][2]; i++;
    }
    lut.push([255 * Math.pow(acc[0] / wsum[0], 0.7), 255 * Math.pow(acc[1] / wsum[1], 0.7), 255 * Math.pow(acc[2] / wsum[2], 0.7)]);
  }
}

// 膜の厚さ（nm）
function thickness(i, j) {
  let u = i / gw, v = j / gh;
  let T = map(mouseX, 0, width, 150, 2500, true);
  if (shapeKind === 1) return T * u + noiseMap[j * gw + i] * 60;                                   // くさび（空気層）
  if (shapeKind === 2) { let vv = v + 0.05 * Math.sin(time * 0.7 + u * 6); return T * vv * vv * 0.8 + noiseMap[j * gw + i] * 120; }   // 下にたまる
  let dx = (i * cell - mouseX), dy = (j * cell - mouseY), r2 = (dx * dx + dy * dy) / (width * width);
  return 1800 * r2 * 4;                                                                                // ニュートン環 t ∝ r²
}

function draw() {
  time += 0.016;
  img.loadPixels();
  let px = img.pixels;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let t = thickness(i, j);
    let idx = Math.max(0, Math.min(lut.length - 1, Math.floor(t / 2)));
    let c = lut[idx];
    let k = (j * gw + i) * 4;
    px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; px[k + 3] = 255;
  }
  img.updatePixels();
  background(0);
  image(img, 0, 0, gw * cell, gh * cell);

  // 厚さ → 色 の表（下の帯）
  let bx = 40, bw = width - 80, by = height - 70;
  for (let x = 0; x < bw; x++) { let c = lut[Math.floor(x / bw * (lut.length - 1))]; stroke(c[0], c[1], c[2]); line(bx + x, by, bx + x, by + 26); }
  noStroke(); fill(255); textSize(13);
  text('膜の厚さ 0 nm', bx, by - 6); text(maxT + ' nm', bx + bw - 60, by - 6);
  text('← 薄い：' + (inversion ? '黒（2 つの反射光が打ち消し合う）' : '明るい') + '　→ 厚い：色が薄れて白っぽくなる（いろんな波長が混ざる）', bx + 120, by - 6);

  fill(0, 0, 0, 120); rect(10, 14, 980, 70, 8);
  fill(255); textSize(18);
  text(['', 'くさび（空気層）', 'シャボン膜（下にたまる）', 'ニュートン環'][shapeKind] + '（1〜3）　n = ' + nf(nFilm, 1, 2) + '（↑↓）　P：位相の反転 ' + (inversion ? 'ON' : 'off') + '　マウス：' + (shapeKind === 3 ? '中心の位置' : '最大の厚さ'), 20, 40);
  fill(200); textSize(15);
  text('δ = 4π n t / λ' + (inversion ? ' + π' : '') + '　同じ厚さは同じ色（等厚干渉縞）。シャボン玉のてっぺんが黒くなると破れる直前', 20, 68);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') shapeKind = Number(key);
  if (key === UP_ARROW) { nFilm = Math.min(2.0, nFilm + 0.05); buildLUT(); }
  if (key === DOWN_ARROW) { nFilm = Math.max(1.0, nFilm - 0.05); buildLUT(); }
  if (key === 'p' || key === 'P') { inversion = !inversion; buildLUT(); }
}

// ---------- やってみよう ----------
// 1. くさび（1）でマウスを左右に動かす。縞の数が変わる。縞 1 本 = 厚さが λ/(2n) 増えた
// 2. P を押して位相の反転をなくすと、いちばん薄い所が黒 → 明るいに変わる。本物のシャボン玉はどっち？
// 3. n を大きくすると縞が詰まる（光路長 2nt が長くなる）。油膜（1.45）と水（1.33）で比べよう
// 4. ニュートン環（3）：中心からの距離の 2 乗で厚さが増える → 外側ほど縞が細かい。レンズの検査に使われる

// ==================================================
// ここから下は「色の道具」（波長 nm → RGB の近似）
// ==================================================
function wavelengthToRGB(nm) {
  nm = Math.max(380, Math.min(780, nm));
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else r = 1;
  let f = 1;
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) f = 0.3 + 0.7 * (780 - nm) / 80;
  return [255 * Math.pow(r * f, 0.8), 255 * Math.pow(g * f, 0.8), 255 * Math.pow(b * f, 0.8)];
}
