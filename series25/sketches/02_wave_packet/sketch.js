// ============================================
// 02 波束と不確定性
// 平面波（01）をたくさん重ねると「かたまり」= 波束になる。位置の広がり Δx と運動量の広がり Δp は
//   フーリエ変換で結ばれていて、Δx · Δp ≥ ħ/2（ħ = 1 の単位なので 0.5）。ガウス型のときだけ等号
// ←→ = 幅 σ / ↑↓ = 平均の運動量 k0 / スペース = 時間を進める（自由粒子は広がっていく） / G = ガウス ⇔ 四角 / R = 時刻を 0 に
// ============================================

const N = 512;            // ★ 格子点の数（2 のべき）
const L = 200;            // 計算する x の範囲の長さ（両端はつながっている）
let dx = L / N;
let sigma = 6;            // ★ 位置の広がり σ
let k0 = 1.5;             // ★ 平均の波数（ħ = 1 なので運動量 p = k）
let gauss = true;
let t = 0, running = false;
let phiRe, phiIm;         // t = 0 の運動量空間の波動関数 φ(k)
let re = new Float64Array(N), im = new Float64Array(N);
let ks = new Float64Array(N);

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let j = 0; j < N; j++) ks[j] = ((2 * PI) / L) * (j < N / 2 ? j : j - N);
  makePacket();
}

// 波束をつくって、FFT で運動量の分布 φ(k) を求めておく
function makePacket() {
  phiRe = new Float64Array(N); phiIm = new Float64Array(N);
  let x0 = -40, s = 0;
  for (let j = 0; j < N; j++) {
    let x = -L / 2 + j * dx;
    let a = gauss ? exp(-sq(x - x0) / (4 * sigma * sigma)) : abs(x - x0) < sigma * sqrt(3) ? 1 : 0;   // 四角も Δx = σ になる幅
    phiRe[j] = a * cos(k0 * x); phiIm[j] = a * sin(k0 * x);
    s += a * a * dx;
  }
  let nrm = 1 / sqrt(s);                           // ∫|ψ|² dx = 1 に正規化
  for (let j = 0; j < N; j++) { phiRe[j] *= nrm; phiIm[j] *= nrm; }
  fft(phiRe, phiIm, false);
  t = 0;
}

function draw() {
  background(260, 30, 10);
  if (running) t += 0.25;
  // ★ 自由粒子の時間発展：運動量空間では各成分の位相が e^{-i k² t / 2} で回るだけ
  for (let j = 0; j < N; j++) {
    let th = -(ks[j] * ks[j] * t) / 2, c = cos(th), s = sin(th);
    re[j] = phiRe[j] * c - phiIm[j] * s; im[j] = phiRe[j] * s + phiIm[j] * c;
  }
  fft(re, im, true);   // 逆変換で位置の波動関数へ

  // 位置の期待値と広がり
  let mx = 0, mx2 = 0, pmax = 0;
  for (let j = 0; j < N; j++) { let x = -L / 2 + j * dx, p = re[j] * re[j] + im[j] * im[j]; mx += x * p * dx; mx2 += x * x * p * dx; pmax = max(pmax, p); }
  let dX = sqrt(max(0, mx2 - mx * mx));
  // 運動量の期待値と広がり（|φ|² で重みづけ）
  let mk = 0, mk2 = 0, sk = 0, kmax = 0;
  for (let j = 0; j < N; j++) { let p = phiRe[j] * phiRe[j] + phiIm[j] * phiIm[j]; sk += p; mk += ks[j] * p; mk2 += ks[j] * ks[j] * p; kmax = max(kmax, p); }
  mk /= sk; mk2 /= sk;
  let dP = sqrt(max(0, mk2 - mk * mk));

  let left = 60, w = width - 120;
  // --- 位置の分布 |ψ(x)|²（色 = 位相）---
  let y1 = height * 0.48, h1 = height * 0.3;
  noStroke(); fill(0, 0, 100); textSize(16);
  text('位置の分布 |ψ(x)|²（色 = 位相）', left, y1 - h1 - 10);
  strokeWeight(w / N + 0.6);
  for (let j = 0; j < N; j++) {
    let p = re[j] * re[j] + im[j] * im[j];
    stroke(((atan2(im[j], re[j]) + PI) / TWO_PI) * 360, 80, 100);
    let x = left + (j / N) * w;
    line(x, y1, x, y1 - (p / max(pmax, 1e-9)) * h1);
  }
  stroke(0, 0, 50); strokeWeight(1); line(left, y1, left + w, y1);
  // Δx の矢印
  let xm = left + ((mx + L / 2) / L) * w, xd = (dX / L) * w;
  stroke(55, 90, 100); strokeWeight(3); line(xm - xd, y1 + 14, xm + xd, y1 + 14);

  // --- 運動量の分布 |φ(k)|² ---
  let y2 = height * 0.92, h2 = height * 0.25, kShow = 4;
  noStroke(); fill(0, 0, 100);
  text('運動量の分布 |φ(k)|²（FFT で計算）　k = −' + kShow + ' 〜 ' + kShow, left, y2 - h2 - 10);
  noFill(); stroke(190, 80, 100); strokeWeight(2);
  beginShape();
  for (let j = 0; j < N; j++) {
    let jj = (j + N / 2) % N;             // fftshift：負の k を左に並べ直す
    let k = ks[jj];
    if (abs(k) > kShow) continue;
    let p = phiRe[jj] * phiRe[jj] + phiIm[jj] * phiIm[jj];
    vertex(left + ((k + kShow) / (2 * kShow)) * w, y2 - (p / kmax) * h2);
  }
  endShape();
  stroke(0, 0, 50); strokeWeight(1); line(left, y2, left + w, y2); line(left + w / 2, y2, left + w / 2, y2 + 6);
  let km = left + ((mk + kShow) / (2 * kShow)) * w, kd = (dP / (2 * kShow)) * w;
  stroke(55, 90, 100); strokeWeight(3); line(km - kd, y2 + 14, km + kd, y2 + 14);

  // --- 数値 ---
  let prod = dX * dP;
  noStroke(); fill(0, 0, 100); textSize(18);
  text('←→ σ = ' + nf(sigma, 1, 1) + '　↑↓ k0 = ' + nf(k0, 1, 2) + '　G：' + (gauss ? 'ガウス' : '四角') + '　スペース：時間 ' + (running ? '進む' : '止') + '　R：t = 0　　t = ' + nf(t, 1, 1), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('細い波束ほど運動量が広がる（たくさんの波が必要）。時間がたつと速い成分と遅い成分がずれて、位置の広がりが大きくなる', 20, 68);
  let px = width - 380, py = 110;
  fill(0, 0, 100, 8); rect(px - 16, py - 28, 360, 130, 10);
  fill(55, 90, 100); textSize(17);
  text('Δx = ' + nf(dX, 1, 2) + '　（理論 σ√(1 + (t/2σ²)²) = ' + nf(sigma * sqrt(1 + sq(t / (2 * sigma * sigma))), 1, 2) + '）', px, py);
  text('Δp = ' + nf(dP, 1, 3) + '　（ガウスなら 1/(2σ) = ' + nf(1 / (2 * sigma), 1, 3) + '）', px, py + 28);
  fill(prod < 0.52 ? color(120, 70, 100) : color(0, 0, 100)); textSize(20);
  text('Δx · Δp = ' + nf(prod, 1, 3) + '  ≥ 0.5', px, py + 66);
  fill(0, 0, 60); textSize(13); text('ħ = m = 1 の単位。自由粒子なので Δp は時間で変わらない', px, py + 90);
}

function keyPressed() {
  if (key === LEFT_ARROW) { sigma = max(1, sigma - 0.5); makePacket(); }
  if (key === RIGHT_ARROW) { sigma = min(20, sigma + 0.5); makePacket(); }
  if (key === UP_ARROW) { k0 = min(3, k0 + 0.25); makePacket(); }
  if (key === DOWN_ARROW) { k0 = max(-3, k0 - 0.25); makePacket(); }
  if (key === 'g' || key === 'G') { gauss = !gauss; makePacket(); }
  if (key === ' ') running = !running;
  if (key === 'r' || key === 'R') t = 0;
}

// ---------- やってみよう ----------
// 1. σ を 1 と 20 にして、下のグラフの幅を比べよう。Δx · Δp はいつも 0.5 のまま？
// 2. G で四角い波束に。Δx は同じなのに Δp は大きくなる → 角ばった形には高い波数が要る
// 3. スペースで時間を進めると細い波束ほど早く広がる。広がりが 2 倍になる時刻 t = 2√3 σ² を確かめよう
// 4. k0 を 0 にすると波束は止まったまま広がるだけ。k0 を変えると中心の速さ（= k0）がどう変わる？


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
