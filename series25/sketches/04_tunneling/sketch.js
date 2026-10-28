// ============================================
// 04 トンネル効果
// エネルギー E が壁の高さ V0 より低くても、波束の一部は壁を「すり抜ける」
//   透過率（理論, E < V0）：T = 1 / (1 + V0² sinh²(κa) / (4E(V0 − E)))、κ = √(2(V0 − E))   （ħ = m = 1）
// ↑↓ = 壁の高さ V0 / ←→ = 壁の幅 a / W/S = 波束のエネルギー（k0） / スペース = 撃ち直す / P = 一時停止
// ============================================

const N = 512;              // ★ 格子点の数
const L = 240;              // x の範囲 −120 〜 120
const dt = 0.05;
let sub = 8;                // ★ 1 フレームに進める歩数
let dx = L / N;
let V0 = 1.3;               // ★ 壁の高さ
let barrierCells = 4;       // ★ 壁の幅（格子のマス数）。幅 a = マス数 × dx
let barrierW = barrierCells * dx;
let k0 = 1.5;               // ★ 波数（E = k0²/2）
let sigma = 12;             // 波束の幅（大きいほどエネルギーがそろう）
let re = new Float64Array(N), im = new Float64Array(N);
let V = new Float64Array(N), ks = new Float64Array(N);
let kc = new Float64Array(N), kS = new Float64Array(N), vc = new Float64Array(N), vS = new Float64Array(N);
let mask = new Float64Array(N);
let lostL = 0, lostR = 0;   // 端で吸い込んだ確率（左 = 反射、右 = 透過 として数える）
let tSim = 0, paused = false;
let histTR = [];           // T と R の時間変化

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let j = 0; j < N; j++) {
    ks[j] = ((2 * PI) / L) * (j < N / 2 ? j : j - N);
    kc[j] = cos(-(ks[j] * ks[j] * dt) / 2); kS[j] = sin(-(ks[j] * ks[j] * dt) / 2);
    let d = min(j, N - 1 - j), W = 50;
    mask[j] = d < W ? 1 - 0.04 * sq((W - d) / W) : 1;
  }
  shoot();
}
function xAt(j) { return -L / 2 + j * dx; }

function shoot() {
  barrierW = barrierCells * dx;
  for (let j = 0; j < N; j++) {
    // 真ん中の barrierCells マスだけ V0（幅 a = マス数 × dx。理論の式もこの a を使う）
    let j0 = N / 2 - floor(barrierCells / 2);
    V[j] = j >= j0 && j < j0 + barrierCells ? V0 : 0;
    vc[j] = cos((-V[j] * dt) / 2); vS[j] = sin((-V[j] * dt) / 2);
  }
  let s = 0, x0 = -55;
  for (let j = 0; j < N; j++) {
    let x = xAt(j), a = exp(-sq(x - x0) / (4 * sigma * sigma));
    re[j] = a * cos(k0 * x); im[j] = a * sin(k0 * x); s += a * a * dx;
  }
  for (let j = 0; j < N; j++) { re[j] /= sqrt(s); im[j] /= sqrt(s); }
  lostL = lostR = 0; tSim = 0; histTR = [];
}

// ★ 長方形の壁の透過率（解析解）
function transmission(E) {
  if (E <= 0) return 0;
  let a = barrierW;
  if (abs(E - V0) < 1e-6) return 1 / (1 + (a * a * V0) / 2);
  if (E < V0) { let kap = sqrt(2 * (V0 - E)), sh = Math.sinh(min(kap * a, 30)); return 1 / (1 + (V0 * V0 * sh * sh) / (4 * E * (V0 - E))); }
  let kk = sqrt(2 * (E - V0)), sn = sin(kk * a);
  return 1 / (1 + (V0 * V0 * sn * sn) / (4 * E * (E - V0)));
}

function rot(c, s) { for (let j = 0; j < N; j++) { let a = re[j], b = im[j]; re[j] = a * c[j] - b * s[j]; im[j] = a * s[j] + b * c[j]; } }

function draw() {
  background(280, 25, 10);
  if (!paused) for (let i = 0; i < sub; i++) {
    rot(vc, vS); fft(re, im, false); rot(kc, kS); fft(re, im, true); rot(vc, vS);
    for (let j = 0; j < N; j++) {               // 吸い込んだ分を左右別に記録してから減らす
      if (mask[j] < 1) { let p = (re[j] * re[j] + im[j] * im[j]) * (1 - mask[j] * mask[j]) * dx; if (j < N / 2) lostL += p; else lostR += p; }
      re[j] *= mask[j]; im[j] *= mask[j];
    }
    tSim += dt;
  }
  // 壁の左（反射）・右（透過）にある確率
  let pL = lostL, pR = lostR, pmax = 0;
  for (let j = 0; j < N; j++) { let p = re[j] * re[j] + im[j] * im[j]; if (xAt(j) < 0) pL += p * dx; else pR += p * dx; pmax = max(pmax, p); }
  if (frameCount % 3 === 0 && histTR.length < 400) histTR.push({ R: pL, T: pR });

  // 理論：波束がもつエネルギーの分布で T(E) を平均（運動量の分布はガウス、幅 1/(2σ)）
  let E0 = (k0 * k0) / 2, sk = 1 / (2 * sigma), tAvg = 0, wsum = 0;
  for (let q = -3; q <= 3; q += 0.1) { let k = k0 + q * sk, wgt = exp(-q * q / 2); tAvg += wgt * transmission((k * k) / 2); wsum += wgt; }
  tAvg /= wsum;

  // --- 波束と壁 ---
  let left = 40, w = width - 80, base = height * 0.6, eS = height * 0.18;
  let px = (j) => left + (j / (N - 1)) * w;
  noStroke(); fill(0, 0, 35);
  let j0 = N / 2 - floor(barrierCells / 2), bx1 = left + ((j0 - 0.5) / (N - 1)) * w, bx2 = left + ((j0 + barrierCells - 0.5) / (N - 1)) * w;
  rect(bx1, base - V0 * eS, max(2, bx2 - bx1), V0 * eS);
  stroke(55, 80, 100, 70); strokeWeight(1); line(left, base - E0 * eS, left + w, base - E0 * eS);
  strokeWeight(w / N + 0.8);
  let hs = (height * 0.32) / max(pmax, 0.01);
  for (let j = 0; j < N; j++) {
    let p = re[j] * re[j] + im[j] * im[j];
    if (p * hs < 0.4) continue;
    stroke(((atan2(im[j], re[j]) + PI) / TWO_PI) * 360, 75, 100);
    line(px(j), base, px(j), base - p * hs);
  }
  stroke(0, 0, 50); strokeWeight(1); line(left, base, left + w, base);

  // --- R と T のバーと時間変化 ---
  let gx = left, gy = height * 0.95, gh = height * 0.25, gw = w * 0.5;
  noFill(); stroke(0, 0, 35); rect(gx, gy - gh, gw, gh);
  for (let [k, hue] of [['R', 200], ['T', 30]]) {
    stroke(hue, 80, 100); strokeWeight(2); beginShape();
    for (let i = 0; i < histTR.length; i++) vertex(gx + (i / 400) * gw, gy - histTR[i][k] * gh);
    endShape();
  }
  stroke(30, 80, 100, 50); strokeWeight(1); line(gx, gy - tAvg * gh, gx + gw, gy - tAvg * gh);
  noStroke(); fill(200, 80, 100); textSize(16); text('反射 R = ' + nf(pL, 1, 3), gx + gw + 30, gy - gh + 20);
  fill(30, 80, 100); text('透過 T = ' + nf(pR, 1, 3), gx + gw + 30, gy - gh + 46);
  fill(0, 0, 100); text('理論 T（E0 での値）= ' + nf(transmission(E0), 1, 3), gx + gw + 30, gy - gh + 82);
  text('理論 T（波束のエネルギー幅で平均）= ' + nf(tAvg, 1, 3), gx + gw + 30, gy - gh + 108);
  fill(0, 0, 60); textSize(14); text('点線 = 平均の理論値。波束が壁を通り過ぎると T のグラフが近づく', gx + gw + 30, gy - gh + 134);
  text('R + T = ' + nf(pL + pR, 1, 3) + '（確率は保存）。格子が粗いぶん理論と数 % ずれる', gx + gw + 30, gy - gh + 158);

  // T(E) の小さなグラフ
  let cx = width - 300, cy = 150, cw = 250, ch = 120, Emax = 3;
  noFill(); stroke(0, 0, 35); rect(cx, cy, cw, ch);
  stroke(30, 80, 100); strokeWeight(2); beginShape();
  for (let i = 0; i <= 100; i++) { let E = (i / 100) * Emax; vertex(cx + (E / Emax) * cw, cy + ch - transmission(E) * ch); }
  endShape();
  stroke(0, 0, 70); strokeWeight(1); line(cx + (V0 / Emax) * cw, cy, cx + (V0 / Emax) * cw, cy + ch);
  stroke(55, 90, 100); line(cx + (E0 / Emax) * cw, cy, cx + (E0 / Emax) * cw, cy + ch);
  noStroke(); fill(0, 0, 70); textSize(13);
  text('T(E)　白 = V0　黄 = E0', cx, cy - 8); text('E = 0', cx, cy + ch + 16); text(Emax, cx + cw - 10, cy + ch + 16);

  fill(0, 0, 100); textSize(18);
  text('↑↓ V0 = ' + nf(V0, 1, 2) + '　←→ 幅 a = ' + nf(barrierW, 1, 2) + '　W/S：E0 = k0²/2 = ' + nf(E0, 1, 3) + '　スペース：撃ち直す　P：' + (paused ? '止' : '動') + '　t = ' + nf(tSim, 1, 1), 20, 40);
  fill(0, 0, 60); textSize(15);
  text(E0 < V0 ? '古典的には E0 < V0 なので全部はね返るはず。でも波は壁の中で指数関数的に減りながら向こう側へ抜ける' : 'E0 > V0 なのに一部ははね返る（これも古典にはない）。幅を変えると T が 1 になる「共鳴」がある', 20, 68);
}

function keyPressed() {
  if (key === UP_ARROW) V0 = min(4, V0 + 0.1);
  if (key === DOWN_ARROW) V0 = max(0.1, V0 - 0.1);
  if (key === RIGHT_ARROW) barrierCells = min(20, barrierCells + 1);
  if (key === LEFT_ARROW) barrierCells = max(1, barrierCells - 1);
  if (key === 'w' || key === 'W') k0 = min(2.4, k0 + 0.05);
  if (key === 's' || key === 'S') k0 = max(0.5, k0 - 0.05);
  if (key === 'p' || key === 'P') { paused = !paused; return; }
  if ([UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW, 'w', 'W', 's', 'S', ' '].includes(key)) shoot();
}

// ---------- やってみよう ----------
// 1. 幅 a を 1 マスずつ増やすと T はどれだけ速く減る？（ほぼ e^{−2κa} に比例）
// 2. V0 を E0 より少し低くして、T が 1 にならないことを確かめる。幅を変えて T ≈ 1 になる共鳴を探そう
// 3. sigma を 4 にすると波束のエネルギーの幅が広がり、「E0 での理論値」と合わなくなる。平均の理論値とは？
// 4. 壁を 2 枚にして（V の式を変える）、間で波が行き来する「共鳴トンネル」を作ってみよう


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
