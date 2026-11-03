// ============================================
// 06 2 つの波源の干渉（ヤングの実験）
// 2 つのスリット（点波源）から出た波が重なり、山と山で強め合い、山と谷で打ち消し合う
//   画面の各点で 2 つの波を足す： cos(k r1 − ωt) + cos(k r2 − ωt)   （k = 2π/λ）
//   スクリーン上の明るい縞の間隔  Δy ≈ λ L / d   （L = スクリーンまでの距離、d = スリット間隔）
// ↑↓ = 波長 λ / ←→ = スリット間隔 d / T = 瞬間の波 ⇄ 時間平均の明るさ / 1 = 波源 1 つだけ / スペース = 一時停止
// ============================================

let lambda = 18;          // ★ 波長（px）
let d = 70;               // ★ スリット間隔（px）
let cell = 3;             // ★ 計算の粗さ（px）小さいほどきれいだが重い
let single = false, paused = false, averaged = false;
let t = 0;
let img, gw, gh, r1, r2;
let lut = [];
let sx, screenX;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  sx = 90; screenX = width - 300;
  gw = Math.ceil((screenX - 0) / cell); gh = Math.ceil(height / cell);
  img = createImage(gw, gh);
  r1 = new Float32Array(gw * gh); r2 = new Float32Array(gw * gh);
  // 値 −1〜1 → 色の表（青 ← 黒 → 橙）
  for (let i = 0; i < 256; i++) {
    let v = (i - 128) / 128;
    lut.push(v > 0 ? [255 * v, 170 * v, 60 * v] : [60 * -v, 150 * -v, 255 * -v]);
  }
  computeDistances();
}

// 各マスから 2 つの波源までの距離（d が変わったときだけ計算）
function computeDistances() {
  let cy = height * 0.5;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let x = i * cell + cell / 2, y = j * cell + cell / 2;
    r1[j * gw + i] = Math.hypot(x - sx, y - (cy - d / 2));
    r2[j * gw + i] = Math.hypot(x - sx, y - (cy + d / 2));
  }
}

function draw() {
  if (!paused) t += 0.18;
  let k = TWO_PI / lambda;
  // ★ 波の重ね合わせをピクセルごとに計算
  img.loadPixels();
  let px = img.pixels;
  for (let idx = 0; idx < gw * gh; idx++) {
    let a = r1[idx], b = r2[idx];
    let amp1 = 6 / Math.sqrt(a + 20), amp2 = single ? 0 : 6 / Math.sqrt(b + 20);
    let v;
    if (averaged) {
      // 時間平均の強さ I = A1² + A2² + 2 A1 A2 cos(k(r1 − r2))
      v = amp1 * amp1 + amp2 * amp2 + 2 * amp1 * amp2 * Math.cos(k * (a - b));
      v = Math.min(1, v * 1.6);
    } else {
      v = amp1 * Math.cos(k * a - t) + amp2 * Math.cos(k * b - t);
    }
    let ci = Math.max(0, Math.min(255, Math.floor(128 + 127 * v)));
    let c = lut[ci];
    px[idx * 4] = c[0]; px[idx * 4 + 1] = c[1]; px[idx * 4 + 2] = c[2]; px[idx * 4 + 3] = 255;
  }
  img.updatePixels();
  background(10);
  image(img, 0, 0, gw * cell, gh * cell);

  // 波源・壁
  let cy = height * 0.5;
  noStroke(); fill(60); rect(sx - 10, 0, 10, height);
  fill(255); circle(sx, cy - d / 2, 8); if (!single) circle(sx, cy + d / 2, 8);

  // スクリーン上の明るさ（時間平均）のグラフ
  let L = screenX - sx;
  stroke(80); strokeWeight(4); line(screenX, 0, screenX, height);
  noFill(); stroke(255, 200, 80); strokeWeight(2);
  beginShape();
  for (let y = 0; y < height; y += 2) {
    let a = Math.hypot(screenX - sx, y - (cy - d / 2)), b = Math.hypot(screenX - sx, y - (cy + d / 2));
    let A1 = 1 / Math.sqrt(a), A2 = single ? 0 : 1 / Math.sqrt(b);
    let I = A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(k * (a - b));
    vertex(screenX + 10 + I / (4 / L) * 220, y);
  }
  endShape();
  // 明線の位置（理論）
  let dy = lambda * L / d;
  if (!single) {
    stroke(255, 255, 255, 70); strokeWeight(1);
    for (let m = -12; m <= 12; m++) { let y = cy + m * dy; if (y > 0 && y < height) line(screenX, y, screenX + 240, y); }
  }

  noStroke(); fill(255); textSize(18);
  text('λ = ' + lambda + ' px（↑↓）　d = ' + d + ' px（←→）　T：' + (averaged ? '時間平均の明るさ' : '瞬間の波') + '　1：波源 ' + (single ? '1 つ' : '2 つ') + '　スペース：' + (paused ? '再生' : '停止'), 20, 40);
  fill(200); textSize(15);
  text('橙 = 山、青 = 谷。右の黄色い曲線はスクリーンの明るさ（時間平均）、白い横線は理論の明線 Δy = λL/d = ' + nf(dy, 1, 1) + ' px', 20, 68);
  fill(200); textSize(14);
  text('d を広げると縞が細かく、λ を長く（赤い光）すると縞が広がる。縞が見える = 光は波', screenX + 10, height - 20);
}

function keyPressed() {
  if (key === UP_ARROW) lambda = Math.min(60, lambda + 2);
  if (key === DOWN_ARROW) lambda = Math.max(6, lambda - 2);
  if (key === RIGHT_ARROW) { d = Math.min(300, d + 10); computeDistances(); }
  if (key === LEFT_ARROW) { d = Math.max(10, d - 10); computeDistances(); }
  if (key === 't' || key === 'T') averaged = !averaged;
  if (key === '1') single = !single;
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. T で時間平均を見る。縞が双曲線の形になる。縞の数は d/λ と関係がある
// 2. 1 を押して波源を 1 つにすると縞が消える。干渉には 2 つの波が要る
// 3. λ を 2 倍にすると縞の間隔は？ d を 2 倍にすると？ Δy = λL/d を確かめよう
// 4. 波源を 3 つ・4 つに増やす（r3 を足す）と縞が鋭くなる → 回折格子（07）
