// ============================================
// 03 シュレーディンガー方程式（1 次元）
// i ∂ψ/∂t = −(1/2) ∂²ψ/∂x² + V(x) ψ   （ħ = m = 1）を「分割演算子法」で解く
//   V の半歩（位置空間で位相を回す）→ FFT → 運動エネルギーの 1 歩（運動量空間で e^{−ik²dt/2}）→ 逆 FFT → V の半歩
// ドラッグ = 波束を置いて投げる（向きと長さ = 運動量） / 1〜5 = ポテンシャル（自由・段差・壁・調和・二重井戸） / ↑↓ = V の強さ / ←→ = 幅 σ / スペース = 停止 / R = 投げ直す
// ============================================

const N = 512;              // ★ 格子点の数（2 のべき）
const L = 200;              // x の範囲 −100 〜 100
const dt = 0.05;            // ★ 1 歩の時間
let sub = 6;                // ★ 1 フレームに進める歩数（大きいほど速い）
let dx = L / N;
let re = new Float64Array(N), im = new Float64Array(N);
let V = new Float64Array(N), ks = new Float64Array(N);
let kc = new Float64Array(N), kS = new Float64Array(N);   // 運動エネルギーの位相 e^{−ik²dt/2}
let vc = new Float64Array(N), vS = new Float64Array(N);   // ポテンシャルの半歩 e^{−iV dt/2}
let mask = new Float64Array(N);                           // 端で波を吸い込む（反射させない）
let pot = 3, vAmp = 1;
let x0 = -50, k0 = 2, sigma = 6;
let running = true, dragFrom = null;
let names = ['', '自由粒子', '段差', '壁（障壁）', '調和振動子', '二重井戸'];
let tre = new Float64Array(N), tim = new Float64Array(N);

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let j = 0; j < N; j++) {
    ks[j] = ((2 * PI) / L) * (j < N / 2 ? j : j - N);
    let th = -(ks[j] * ks[j] * dt) / 2;
    kc[j] = cos(th); kS[j] = sin(th);
    let d = min(j, N - 1 - j), W = 40;
    mask[j] = d < W ? 1 - 0.03 * sq((W - d) / W) : 1;
  }
  makePotential();
  launch();
}

function xAt(j) { return -L / 2 + j * dx; }

// ★ ポテンシャル V(x) の形
function makePotential() {
  for (let j = 0; j < N; j++) {
    let x = xAt(j), v = 0;
    if (pot === 2) v = x > 0 ? 2.5 : 0;
    if (pot === 3) v = abs(x) < 2 ? 2.5 : 0;
    if (pot === 4) v = 0.5 * sq(0.04) * x * x;
    if (pot === 5) v = 7.7e-6 * sq(x * x - 625);       // 底は x = ±25、真ん中の山の高さ ≈ 3
    V[j] = v * vAmp;
    vc[j] = cos((-V[j] * dt) / 2); vS[j] = sin((-V[j] * dt) / 2);
  }
}

// ガウス波束 ψ = exp(−(x−x0)²/4σ²) e^{ik0 x} を置く
function launch() {
  let s = 0;
  for (let j = 0; j < N; j++) {
    let x = xAt(j), a = exp(-sq(x - x0) / (4 * sigma * sigma));
    re[j] = a * cos(k0 * x); im[j] = a * sin(k0 * x); s += a * a * dx;
  }
  let nrm = 1 / sqrt(s);
  for (let j = 0; j < N; j++) { re[j] *= nrm; im[j] *= nrm; }
}

// 複素数の配列に位相 (c + is) をかける
function rotate2(c, s) {
  for (let j = 0; j < N; j++) { let a = re[j], b = im[j]; re[j] = a * c[j] - b * s[j]; im[j] = a * s[j] + b * c[j]; }
}
function stepOnce() {
  rotate2(vc, vS);        // V の半歩
  fft(re, im, false);
  rotate2(kc, kS);        // 運動エネルギーの 1 歩（運動量空間）
  fft(re, im, true);
  rotate2(vc, vS);        // V の半歩
  for (let j = 0; j < N; j++) { re[j] *= mask[j]; im[j] *= mask[j]; }
}

function draw() {
  background(220, 30, 10);
  if (running && !dragFrom) for (let i = 0; i < sub; i++) stepOnce();

  // エネルギーの期待値 ⟨E⟩ = ⟨T⟩ + ⟨V⟩
  let norm = 0, eV = 0, pmax = 0;
  for (let j = 0; j < N; j++) { let p = re[j] * re[j] + im[j] * im[j]; norm += p * dx; eV += V[j] * p * dx; pmax = max(pmax, p); }
  tre.set(re); tim.set(im); fft(tre, tim, false);
  let eT = 0, sk = 0;
  for (let j = 0; j < N; j++) { let p = tre[j] * tre[j] + tim[j] * tim[j]; eT += (ks[j] * ks[j] / 2) * p; sk += p; }
  let E = (sk > 0 ? eT / sk : 0) + (norm > 1e-9 ? eV / norm : 0);

  let left = 40, w = width - 80, base = height * 0.88, eS = height * 0.11;   // eS：エネルギー 1 あたりの px
  let px = (j) => left + (j / (N - 1)) * w;
  // ポテンシャル
  noStroke(); fill(0, 0, 30);
  beginShape(); vertex(left, base);
  for (let j = 0; j < N; j++) vertex(px(j), base - min(V[j], 6.5) * eS);
  vertex(left + w, base); endShape(CLOSE);
  // ⟨E⟩ の線
  let yE = base - constrain(E, 0, 6.5) * eS;
  stroke(55, 80, 100, 60); strokeWeight(1); line(left, yE, left + w, yE);
  // |ψ|²（⟨E⟩ の高さから上に、色 = 位相）
  strokeWeight(w / N + 0.8);
  let hs = (height * 0.3) / max(pmax, 0.02);
  for (let j = 0; j < N; j++) {
    let p = re[j] * re[j] + im[j] * im[j];
    if (p * hs < 0.5) continue;
    stroke(((atan2(im[j], re[j]) + PI) / TWO_PI) * 360, 80, 100);
    line(px(j), yE, px(j), yE - p * hs);
  }
  // 吸収する端
  noStroke(); fill(0, 0, 100, 6); rect(left, 90, (40 / N) * w, base - 90); rect(left + w - (40 / N) * w, 90, (40 / N) * w, base - 90);
  // ドラッグ中の矢印
  if (dragFrom) {
    stroke(55, 90, 100); strokeWeight(3); line(dragFrom.x, dragFrom.y, mouseX, dragFrom.y);
    noStroke(); fill(55, 90, 100); circle(dragFrom.x, dragFrom.y, 12);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('1〜5：' + names[pot] + '　ドラッグ：波束を投げる　↑↓ V × ' + nf(vAmp, 1, 2) + '　←→ σ = ' + nf(sigma, 1, 1) + '　スペース：' + (running ? '動' : '止') + '　R：投げ直す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('灰色 = V(x)、黄線 = エネルギーの期待値 ⟨E⟩、色の山 = |ψ|²（色は位相）。⟨E⟩ が V より低い所にも波はしみ出す', 20, 68);
  fill(55, 80, 100);
  text('k0 = ' + nf(k0, 1, 2) + '　⟨E⟩ = ' + nf(E, 1, 3) + '　全確率 ∫|ψ|²dx = ' + nf(norm, 1, 3) + '（端で吸い込まれると減る）', 20, 94);
}

function mousePressed() { if (mouseY > 110) dragFrom = { x: mouseX, y: mouseY }; }
function mouseReleased() {
  if (!dragFrom) return;
  let left = 40, w = width - 80;
  x0 = constrain(((dragFrom.x - left) / w) * L - L / 2, -L / 2 + 25, L / 2 - 25);
  let d = (mouseX - dragFrom.x) / 60;
  if (abs(d) > 0.1) k0 = constrain(d, -4, 4);
  dragFrom = null;
  launch();
}

function keyPressed() {
  if (key >= '1' && key <= '5') { pot = int(key); makePotential(); }
  if (key === UP_ARROW) { vAmp = min(3, vAmp * 1.25); makePotential(); }
  if (key === DOWN_ARROW) { vAmp = max(0.1, vAmp / 1.25); makePotential(); }
  if (key === LEFT_ARROW) { sigma = max(2, sigma - 1); launch(); }
  if (key === RIGHT_ARROW) { sigma = min(20, sigma + 1); launch(); }
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') launch();
}

// ---------- やってみよう ----------
// 1. 2（段差）で ⟨E⟩ が段差より高いのに一部が跳ね返る。古典的な粒子ならありえない！
// 2. 4（調和）で波束を投げると形を保って往復する？ σ を変えると「息をする」ように幅が変わる
// 3. 5（二重井戸）の片方の底に k0 ≈ 0 で置くと、山を越えられないはずなのに少しずつ反対側へ移る（トンネル）
// 4. makePotential に自分の V（たとえば周期的な山 sin(x)）を足して、結晶の中の電子のようすを見よう


// ==================================================
// ここから下は「道具」（複素数の FFT：高速フーリエ変換）
// ==================================================
// re, im：長さ n（2 のべき）の配列をその場で変換する。inv = true で逆変換（1/n で割る）
function fft(re, im, inv) {
  let n = re.length;
  for (let i = 1, j = 0; i < n; i++) {           // ビット反転の並べ替え
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let tr = re[i]; re[i] = re[j]; re[j] = tr; let ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {       // バタフライ演算
    let ang = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        let a = i + k, b = a + len / 2;
        let xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        let tc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = tc;
      }
    }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
