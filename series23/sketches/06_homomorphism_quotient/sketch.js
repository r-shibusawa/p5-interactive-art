// ============================================
// 06 準同型と剰余群
// φ(x) = x mod m で 12 時間の時計 Z₁₂ を m 時間の時計 Zₘ に写す。足し算を保つ：φ(a + b) = φ(a) + φ(b)
//   0 に行く元の集まり = 核（kernel）K。K の剰余類を 1 点にまとめた Z₁₂ / K は Zₘ と同じ（準同型定理）
// ←→ = m（2〜6）/ 時計の数字を 2 つクリック = a + b を確かめる / スペース = 剰余類をまとめる・ばらす
// ============================================

let M = 12;              // ★ もとの時計
let m = 4;               // 写す先の時計
let merge = 0, mergeTarget = 0;   // 0 = ばらばら、1 = まとめる
let pa = -1, pb = -1;    // クリックした 2 つの数

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function phi(x) { return x % m; }
function isHom() { return M % m === 0; }   // m が 12 を割り切るときだけ準同型

function draw() {
  background(250, 248, 242);
  merge += (mergeTarget - merge) * 0.08;
  let R1 = min(width * 0.15, height * 0.24), c1 = [width * 0.24, height * 0.48];
  let R2 = R1 * 0.75, c2 = [width * 0.72, height * 0.48];
  let hom = isHom();

  // 写像の線（まとめるときは消す）
  for (let x = 0; x < M; x++) {
    let a = clockPos(c1, R1, x, M, true), b = clockPos(c2, R2, phi(x), m, false);
    colorMode(HSB); stroke((phi(x) * 360) / m, 50, 80, 0.35 * (1 - merge)); colorMode(RGB);
    strokeWeight(2);
    line(a[0], a[1], b[0], b[1]);
  }
  // 左の時計（Z₁₂）
  noFill(); stroke(0, 30); strokeWeight(2); circle(c1[0], c1[1], R1 * 2);
  for (let x = 0; x < M; x++) {
    let p = clockPos(c1, R1, x, M, true);
    let inK = phi(x) === 0;
    colorMode(HSB); fill((phi(x) * 360) / m, 55, 92); colorMode(RGB);
    stroke(inK ? color(20) : color(255)); strokeWeight(inK ? 4 : 2);
    circle(p[0], p[1], 46);
    noStroke(); fill(20); textAlign(CENTER, CENTER); textSize(18);
    text(x, p[0], p[1]);
  }
  // 右の時計（Zₘ）
  noFill(); stroke(0, 30); strokeWeight(2); circle(c2[0], c2[1], R2 * 2);
  for (let y = 0; y < m; y++) {
    let p = clockPos(c2, R2, y, m, false);
    colorMode(HSB); fill((y * 360) / m, 55, 92); colorMode(RGB);
    stroke(255); strokeWeight(2);
    circle(p[0], p[1], 56);
    noStroke(); fill(20); textSize(22);
    text(y, p[0], p[1]);
  }
  textAlign(LEFT, BASELINE);

  // クリックした a, b の足し算
  noStroke(); fill(20); textSize(20);
  let y0 = height - 110;
  if (pa >= 0 && pb >= 0) {
    let s = (pa + pb) % M;
    text('a + b = ' + pa + ' + ' + pb + ' = ' + s + '（mod 12）→ φ(a + b) = ' + phi(s), 30, y0);
    let rhs = (phi(pa) + phi(pb)) % m;
    text('φ(a) + φ(b) = ' + phi(pa) + ' + ' + phi(pb) + ' = ' + rhs + '（mod ' + m + '）', 30, y0 + 32);
    fill(phi(s) === rhs ? color(40, 150, 90) : color(210, 50, 60)); textSize(24);
    text(phi(s) === rhs ? '一致 ✓' : '一致しない ✗（準同型ではない）', 30, y0 + 70);
  } else if (pa >= 0) text('a = ' + pa + '。もう 1 つクリック', 30, y0);
  else { fill(110); textSize(16); text('左の時計の数字を 2 つクリックすると、φ(a + b) と φ(a) + φ(b) を比べられる', 30, y0); }

  fill(20); textSize(18);
  text('←→：m = ' + m + '　数字を 2 つクリック：足し算を確かめる　スペース：核の剰余類をまとめる（' + (mergeTarget ? 'ON' : 'off') + '）', 20, 36);
  fill(110); textSize(15);
  text('準同型 = 演算を保つ写像。黒い縁の数 = 核 K = φ が 0 に送る元（それ自体が部分群）', 20, 62);
  let px = width * 0.5, py = 110;
  textSize(20); fill(20);
  text('φ : Z₁₂ → Z' + m + '、φ(x) = x mod ' + m, px - 120, py);
  if (hom) {
    let K = [...Array(M).keys()].filter((x) => phi(x) === 0);
    textSize(16); fill(60);
    text('核 K = { ' + K.join(', ') + ' }（|K| = ' + K.length + '）　Z₁₂ / K ≅ Z' + m + '（12 = ' + K.length + ' × ' + m + '）', px - 120, py + 30);
  } else {
    textSize(16); fill(210, 50, 60);
    text(m + ' は 12 を割り切らない → 11 + 1 = 0 なのに φ(11) + φ(1) = ' + ((phi(11) + 1) % m) + ' ≠ φ(0) = 0。準同型にならない', px - 120, py + 30);
  }
}

// 時計の数字の位置。左の時計は「まとめる」と同じ剰余類（同じ φ）の点が 1 か所に集まる
function clockPos(c, R, x, mm, left) {
  let a = -HALF_PI + (x * TWO_PI) / mm;
  let p = [c[0] + R * cos(a), c[1] + R * sin(a)];
  if (left && isHom() && merge > 0.001) {
    let b = -HALF_PI + (phi(x) * TWO_PI) / m;
    let k = floor(x / m), cnt = M / m;
    let q = [c[0] + R * 0.75 * cos(b) + (k - (cnt - 1) / 2) * 8, c[1] + R * 0.75 * sin(b) + (k - (cnt - 1) / 2) * 8];
    p = [lerp(p[0], q[0], merge), lerp(p[1], q[1], merge)];
  }
  return p;
}

function mousePressed() {
  let R1 = min(width * 0.15, height * 0.24), c1 = [width * 0.24, height * 0.48];
  for (let x = 0; x < M; x++) {
    let p = clockPos(c1, R1, x, M, true);
    if (dist(mouseX, mouseY, p[0], p[1]) < 23) {
      if (pa < 0 || pb >= 0) { pa = x; pb = -1; } else pb = x;
      return;
    }
  }
}

function keyPressed() {
  if (key === RIGHT_ARROW) m = min(m + 1, 6);
  if (key === LEFT_ARROW) m = max(m - 1, 2);
  if (key === ' ') mergeTarget = 1 - mergeTarget;
  return false;
}

// ---------- やってみよう ----------
// 1. m = 3, 4, 6 で核の大きさは？ |核| × m = 12 になっている
// 2. m = 5 を選んで 11 と 1 をクリック → 一致しない。12 の約数でないとダメな理由を考えよう
// 3. スペースでまとめると、12 個の点が m 個の「かたまり」に。かたまりどうしの足し算 = Zₘ の足し算
// 4. φ(x) = 2x mod 12 も準同型（Z₁₂ → Z₁₂）。核は？ 写る先（像）は？ phi を書きかえよう
