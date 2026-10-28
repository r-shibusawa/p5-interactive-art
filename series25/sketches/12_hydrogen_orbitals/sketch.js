// ============================================
// 12 水素原子の軌道
// 電子の波動関数 ψnlm = Rnl(r) · Ylm(θ, φ)（動径 × 角度）。断面を切って |ψ|² を明るさ、ψ の符号を色で描く
//   エネルギーは n だけで決まる En = −13.6 eV / n²。n → 2 へ落ちるときに出る光がバルマー系列（目に見える 4 本の線）
// ↑↓ = n（1〜4） / ←→ = l（0〜n−1） / M = m を切りかえ / P = 断面（xz 面 ⇔ xy 面） / Z = 拡大 / G = 明るさの強調
// ============================================

const G = 160;              // ★ 断面の画素数（大きいほどきれいだが重い）
let n = 2, l = 1, m = 0;
let slicePlane = 'xz';
let zoom = 1, gammaV = 0.45;   // ★ 明るさの強調（小さいほど薄い所が見える）
let img, radial = [];
let spdf = 'spdf';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  img = createGraphics(G, G);
  img.pixelDensity(1);
  render();
}

function extent() { return (2.4 * n * n + 5) / zoom; }   // 表示する範囲（ボーア半径 a0 = 1 の単位）

// ★ 動径関数 Rnl(r) ∝ ρ^l e^{−ρ/2} L(n−l−1, 2l+1)(ρ)、ρ = 2r/n（L はラゲールの陪多項式、漸化式で計算）
function Rnl(r) {
  let rho = (2 * r) / n, k = n - l - 1, al = 2 * l + 1;
  let L0 = 1, L1 = 1 + al - rho, Lk = k === 0 ? L0 : L1;
  for (let j = 1; j < k; j++) { let L2 = ((2 * j + 1 + al - rho) * L1 - (j + al) * L0) / (j + 1); L0 = L1; L1 = L2; Lk = L2; }
  return Math.pow(rho, l) * Math.exp(-rho / 2) * Lk;
}
// ★ 角度の部分（実数の球面調和関数）∝ P_l^|m|(cos θ) × cos(mφ) か sin(|m|φ)
function Ylm(ct, ph) {
  let am = abs(m), st = sqrt(max(0, 1 - ct * ct));
  let pmm = 1;
  for (let i = 1; i <= am; i++) pmm *= -(2 * i - 1) * st;      // P_m^m
  let P = pmm;
  if (l > am) {
    let p1 = ct * (2 * am + 1) * pmm;                           // P_{m+1}^m
    P = p1;
    for (let ll = am + 2; ll <= l; ll++) { let p2 = ((2 * ll - 1) * ct * p1 - (ll + am - 1) * pmm) / (ll - am); pmm = p1; p1 = p2; P = p2; }
  }
  return m > 0 ? P * cos(m * ph) : m < 0 ? P * sin(am * ph) : P;
}
function psi(x, y, z) {
  let r = sqrt(x * x + y * y + z * z) + 1e-9;
  return Rnl(r) * Ylm(z / r, Math.atan2(y, x));
}

// 断面の画像をつくる（n, l, m を変えたときだけ）
function render() {
  let E = extent(), vals = new Float64Array(G * G), mx = 1e-30;
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    let u = ((i + 0.5) / G * 2 - 1) * E, v = (1 - (j + 0.5) / G * 2) * E;
    let p = slicePlane === 'xz' ? psi(u, 0, v) : psi(u, v, 0);
    vals[j * G + i] = p; mx = max(mx, p * p);
  }
  img.loadPixels();
  for (let k = 0; k < G * G; k++) {
    let p = vals[k], b = Math.pow((p * p) / mx, gammaV);
    // ψ > 0 はオレンジ、ψ < 0 は水色（符号 = 位相 0 か π）
    let c = p >= 0 ? [255, 150, 60] : [70, 180, 255];
    img.pixels[k * 4] = c[0] * b; img.pixels[k * 4 + 1] = c[1] * b; img.pixels[k * 4 + 2] = c[2] * b; img.pixels[k * 4 + 3] = 255;
  }
  img.updatePixels();
  // 動径分布 P(r) = r² R²（半径 r の殻に電子がいる確率）
  radial = [];
  let rm = 0;
  for (let i = 0; i <= 300; i++) { let r = (i / 300) * E * 1.4, R = Rnl(r); radial.push(r * r * R * R); rm = max(rm, r * r * R * R); }
  radial = radial.map((v) => v / rm);
}

function orbitalName() {
  let nm = n + spdf[l];
  let tbl = { 1: { 0: 'z', 1: 'x', '-1': 'y' }, 2: { 0: 'z²', 1: 'xz', '-1': 'yz', 2: 'x²−y²', '-2': 'xy' } };
  if (tbl[l]) nm += tbl[l][m];
  else if (l === 3) nm += '（m = ' + m + '）';
  return nm;
}

// 波長（nm）→ 色（目に見える範囲のだいたいの色）
function waveColor(wl) {
  let h = map(wl, 400, 700, 270, 0, true);
  return color(h, 90, 100);
}

function draw() {
  background(240, 30, 6);
  let S = min(height - 160, width * 0.5);
  let ox = 40, oy = 110;
  image(img, ox, oy, S, S);
  noFill(); stroke(0, 0, 40); rect(ox, oy, S, S);
  noStroke(); fill(0, 0, 100); circle(ox + S / 2, oy + S / 2, 4);   // 原子核
  fill(0, 0, 80); textSize(14);
  text((slicePlane === 'xz' ? 'xz 面（y = 0）横 = x、縦 = z' : 'xy 面（z = 0）横 = x、縦 = y') + '　幅 ' + nf(2 * extent(), 1, 0) + ' a0', ox, oy + S + 22);

  // 右：動径分布
  let px = ox + S + 50, pw = width - px - 40, py = oy + 10, ph = height * 0.28;
  fill(0, 0, 100); textSize(16); text('動径分布 r²|R(r)|²（電子が半径 r にいる確率）', px, py);
  noFill(); stroke(0, 0, 35); rect(px, py + 10, pw, ph);
  stroke(30, 80, 100); strokeWeight(2); beginShape();
  for (let i = 0; i < radial.length; i++) vertex(px + (i / 300) * pw, py + 10 + ph - radial[i] * ph);
  endShape(); strokeWeight(1);
  noStroke(); fill(0, 0, 60); textSize(12);
  text('0', px, py + ph + 26); text('r = ' + nf(extent() * 1.4, 1, 0) + ' a0', px + pw - 60, py + ph + 26);
  text('節（ゼロ）の数：動径 ' + (n - l - 1) + ' + 角度 ' + l + ' = n − 1 = ' + (n - 1), px, py + ph + 44);

  // エネルギー準位
  let ey = py + ph + 80, eh = height - ey - 170, ew = pw * 0.45;
  fill(0, 0, 100); textSize(16); text('エネルギー準位 En = −13.6 / n² eV', px, ey);
  let yOf = (E) => ey + 20 + eh * (-E / 13.6);   // E = −13.6 が下、0 が上
  for (let k = 1; k <= 6; k++) {
    let E = -13.6 / (k * k), y = yOf(E);
    stroke(k === n ? color(55, 90, 100) : color(0, 0, 60)); strokeWeight(k === n ? 3 : 1);
    line(px, y, px + ew, y);
    noStroke(); fill(0, 0, 80); textSize(12);
    if (k <= 4) text('n=' + k + '  ' + nf(E, 1, 2) + ' eV', px + ew + 8 + (k === 4 ? 120 : 0), y + 4);
  }
  // バルマー系列（n → 2）の矢印
  for (let k = 3; k <= 6; k++) {
    let wl = 1e9 / (1.097e7 * (0.25 - 1 / (k * k))), x = px + 20 + (k - 3) * 30;
    stroke(waveColor(wl)); strokeWeight(k === n ? 4 : 2); line(x, yOf(-13.6 / (k * k)), x, yOf(-3.4));
  }

  // スペクトル（380〜700 nm）
  let sx = px, sy = height - 80, sw = pw, sh = 36;
  noStroke(); fill(0, 0, 12); rect(sx, sy, sw, sh);
  for (let k = 3; k <= 6; k++) {
    let wl = 1e9 / (1.097e7 * (0.25 - 1 / (k * k))), x = sx + ((wl - 380) / 320) * sw;
    stroke(waveColor(wl)); strokeWeight(k === n ? 6 : 3); line(x, sy, x, sy + sh);
    noStroke(); fill(0, 0, 80); textSize(11); text(nf(wl, 1, 0) + ' nm', x - 18, sy + sh + (k === 6 ? 28 : 14));
  }
  noStroke(); fill(0, 0, 70); textSize(13); text('水素のバルマー系列（n = 3, 4, 5, 6 → 2）', sx, sy - 8);

  fill(0, 0, 100); textSize(18);
  text('↑↓ n = ' + n + '　←→ l = ' + l + '（' + spdf[l] + '）　M：m = ' + m + '　P：断面 ' + slicePlane + '　Z：拡大 × ' + zoom + '　G：強調 ' + gammaV + '　→ ' + orbitalName() + ' 軌道', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('明るさ = |ψ|²（電子が見つかる確率の濃さ）、色 = ψ の符号（オレンジ +、水色 −）。y を含む軌道（m < 0）は xz 面では見えない → P で xy 面へ', 20, 68);
}

function keyPressed() {
  let ch = true;
  if (key === UP_ARROW) n = min(4, n + 1);
  else if (key === DOWN_ARROW) n = max(1, n - 1);
  else if (key === RIGHT_ARROW) l = l + 1;
  else if (key === LEFT_ARROW) l = l - 1;
  else if (key === 'm' || key === 'M') m = m + 1 > l ? -l : m + 1;
  else if (key === 'p' || key === 'P') slicePlane = slicePlane === 'xz' ? 'xy' : 'xz';
  else if (key === 'z' || key === 'Z') zoom = zoom === 1 ? 2 : zoom === 2 ? 0.5 : 1;
  else if (key === 'g' || key === 'G') gammaV = gammaV === 0.45 ? 0.25 : gammaV === 0.25 ? 1 : 0.45;
  else ch = false;
  l = constrain(l, 0, n - 1);
  m = constrain(m, -l, l);
  if (ch) render();
}

// ---------- やってみよう ----------
// 1. 1s → 2s → 3s と n を上げると、動径分布の山はどこへ動く？ 山の数は？（節の数 n − l − 1）
// 2. 2p の m = 0（z）と m = 1（x）を比べる。形は同じで向きだけが違う。m = −1（y）は P で xy 面に
// 3. 3d の 5 つの m を順に見よう。化学で出てくる d 軌道の形（四つ葉）になっている？
// 4. 3 → 2 の光（656 nm）は赤、4 → 2 は青緑。En の式から波長 λ = hc / ΔE を自分で計算してみよう
