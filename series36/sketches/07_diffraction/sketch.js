// ============================================
// 07 単スリット・多スリットの回折（フラウンホーファー回折）
// 幅 a のスリットを N 本、間隔 d で並べたときの遠くのスクリーンの明るさ：
//   I(θ) = sinc²(β) × [ sin(Nα) / (N sin α) ]²     β = π a sinθ / λ,  α = π d sinθ / λ
//   sinc² = 1 本のスリットの回折（包絡線）、後ろの項 = N 本の干渉（鋭い山）
// ←→ = スリット幅 a / ↑↓ = 本数 N / Z X = 間隔 d / Q A = 波長 λ / マウス左右 = 値を読む
// ============================================

let a = 20;          // ★ スリット幅（μm）
let d = 60;          // ★ スリット間隔（μm）
let N = 2;           // ★ スリットの本数
let lambda = 550;    // ★ 波長（nm）

function setup() {
  createCanvas(windowWidth, windowHeight);
}

// ★ 強度（0〜1）。s = sinθ
function intensity(s) {
  let lamUm = lambda / 1000;
  let beta = Math.PI * a * s / lamUm, alpha = Math.PI * d * s / lamUm;
  let env = beta === 0 ? 1 : Math.sin(beta) / beta;
  let sa = Math.sin(alpha);
  let inter = Math.abs(sa) < 1e-9 ? 1 : Math.sin(N * alpha) / (N * sa);
  return { I: env * env * inter * inter, env: env * env };
}

function draw() {
  background(10, 10, 16);
  let lamUm = lambda / 1000;
  let smax = Math.min(0.95, 3.2 * lamUm / a);        // 表示する sinθ の範囲（1 本の回折の 3 番目の暗線まで）
  let x0 = 80, x1 = width - 80, W = x1 - x0;
  let c = wavelengthToRGB(lambda);

  // スクリーンの像（上の帯）
  let bandY = 110, bandH = 70;
  strokeWeight(1);
  for (let x = x0; x <= x1; x++) {
    let s = map(x, x0, x1, -smax, smax);
    let I = intensity(s).I;
    let g = Math.pow(I, 0.5);                           // 目の感じ方に合わせて明るさを圧縮
    stroke(c[0] * g, c[1] * g, c[2] * g);
    line(x, bandY, x, bandY + bandH);
  }
  noFill(); stroke(80); rect(x0, bandY, W, bandH);

  // グラフ
  let gy0 = 230, gh = height - 350, gy1 = gy0 + gh;
  stroke(50); line(x0, gy1, x1, gy1); line((x0 + x1) / 2, gy0, (x0 + x1) / 2, gy1);
  noFill(); stroke(255, 255, 255, 70); strokeWeight(1.5);
  beginShape();                                          // 包絡線 sinc²
  for (let x = x0; x <= x1; x += 2) { let s = map(x, x0, x1, -smax, smax); vertex(x, gy1 - intensity(s).env * gh); }
  endShape();
  stroke(c[0], c[1], c[2]); strokeWeight(2.5);
  beginShape();                                          // I(θ)
  for (let x = x0; x <= x1; x += 1) { let s = map(x, x0, x1, -smax, smax); vertex(x, gy1 - intensity(s).I * gh); }
  endShape();
  // 単スリットの暗線 sinθ = mλ/a、多スリットの明線 sinθ = mλ/d
  for (let m = -8; m <= 8; m++) {
    if (m === 0) continue;
    let s = m * lamUm / a;
    if (Math.abs(s) < smax) { stroke(255, 80, 80, 120); strokeWeight(1); let x = map(s, -smax, smax, x0, x1); line(x, gy1, x, gy1 - 18); }
  }
  if (N > 1) for (let m = -40; m <= 40; m++) {
    let s = m * lamUm / d;
    if (Math.abs(s) < smax) { stroke(120, 200, 255, 100); strokeWeight(1); let x = map(s, -smax, smax, x0, x1); line(x, gy0, x, gy0 + 14); }
  }
  // マウスの位置の値
  if (mouseX > x0 && mouseX < x1) {
    let s = map(mouseX, x0, x1, -smax, smax), v = intensity(s);
    stroke(255, 255, 255, 60); line(mouseX, gy0, mouseX, gy1);
    noStroke(); fill(255); textSize(14);
    text('sinθ = ' + nf(s, 1, 4) + '　θ = ' + nf(degrees(Math.asin(s)), 1, 2) + '°　I = ' + nf(v.I, 1, 3), Math.min(mouseX + 10, width - 300), gy0 + 40);
  }
  // 軸ラベル
  noStroke(); fill(160); textSize(13);
  text('sinθ = −' + nf(smax, 1, 3), x0, gy1 + 18); text('0', (x0 + x1) / 2 - 3, gy1 + 18); text('+' + nf(smax, 1, 3), x1 - 60, gy1 + 18);
  text('赤の目盛：1 本の回折の暗線 sinθ = mλ/a　　水色：干渉の明線 sinθ = mλ/d', x0, gy1 + 38);

  // スリットの絵（左上）
  let sy = 60;
  stroke(200); strokeWeight(6);
  let totalW = N * d, scaleS = Math.min(1.5, 300 / Math.max(totalW, 1));
  let left = width - 100 - totalW * scaleS;
  line(left - 40, sy, left, sy);
  for (let i = 0; i < N; i++) {
    let xs = left + i * d * scaleS;
    line(xs + a * scaleS, sy, xs + d * scaleS, sy);
  }
  noStroke(); fill(160); textSize(13); text('スリット（上から見た図）', left - 40, sy + 24);

  // HUD
  fill(255); textSize(18);
  text('a = ' + a + ' μm（←→）　N = ' + N + '（↑↓）　d = ' + d + ' μm（Z X）　λ = ' + lambda + ' nm（Q A）', 20, 40);
  fill(200); textSize(15);
  text(N === 1 ? '単スリット：中央の明るい帯の幅 ∝ λ/a。スリットを細くするほど広がる（回折）' : 'N 本：細い山が d で決まる位置に並び、高さは 1 本の回折（白い包絡線）で決まる。N が増えると山が鋭くなる', 20, 68);
  fill(200); textSize(14);
  text('中央の明るさに対する比。' + (N > 1 ? 'd/a = ' + nf(d / a, 1, 1) + ' → ' + Math.round(d / a) + ' 番目の干渉の山は回折の暗線に重なって消える（欠落次数）' : ''), 20, height - 24);
}

function keyPressed() {
  if (key === RIGHT_ARROW) a = Math.min(200, a + 2);
  if (key === LEFT_ARROW) a = Math.max(2, a - 2);
  if (key === UP_ARROW) N = Math.min(12, N + 1);
  if (key === DOWN_ARROW) N = Math.max(1, N - 1);
  if (key === 'x' || key === 'X') d = Math.min(400, d + 5);
  if (key === 'z' || key === 'Z') d = Math.max(a + 2, d - 5);
  if (key === 'q' || key === 'Q') lambda = Math.min(700, lambda + 10);
  if (key === 'a' || key === 'A') lambda = Math.max(400, lambda - 10);
  if (d < a + 2) d = a + 2;
}

// ---------- やってみよう ----------
// 1. N = 1 で a を小さくしていく。中央の帯が広がり、a < λ でほぼ全方向に広がる
// 2. N = 2 → 06 の縞と同じ。N = 10 にすると山が針のように細くなる（回折格子・CD の虹）
// 3. λ を 400 → 700 に変えると山の位置が動く。格子で色が分かれる理由
// 4. d = 3a にすると 3 番目の干渉の山が消える（欠落次数）。d/a を整数にして確かめよう

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
