// ============================================
// 11 時間と周波数の双対（フーリエ変換）
// 時間で狭い信号は周波数で広く、時間で広い信号は周波数で狭い（不確定性）
//   ガウス関数はガウス関数に写る。矩形 ↔ sinc、くし形 ↔ くし形（間隔が逆数）
//   幅 Δt と Δf を標準偏差で測ると Δt·Δf ≥ 1/(4π)：ガウスで等号
// ↑↓ = 幅 / ←→ = 周波数（変調）・間隔 / 1〜4 = 信号 / 簡易 DFT をリアルタイム計算
// ============================================

let N = 256;                 // ★ 標本の数（DFT は N² なので増やしすぎ注意）
let sigNo = 1;
let widthP = 0.12;           // ★ 信号の幅（時間 −1〜1 の中で）
let f0 = 0;                  // ★ 変調の周波数（1〜4 の時）／ くし形の間隔
let cosT = [], sinT = [];
let names = ['', 'ガウス', '矩形', 'ガウス × cos（変調）', 'くし形（パルス列）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let k = 0; k < N; k++) { cosT.push(Math.cos(2 * Math.PI * k / N)); sinT.push(Math.sin(2 * Math.PI * k / N)); }
}
// ★ 信号 x(t)、t ∈ [−1, 1)
function signal(t) {
  if (sigNo === 1) return Math.exp(-t * t / (2 * widthP * widthP));
  if (sigNo === 2) return Math.abs(t) < widthP ? 1 : 0;
  if (sigNo === 3) return Math.exp(-t * t / (2 * widthP * widthP)) * Math.cos(2 * Math.PI * (8 + f0 * 4) * t);
  let d = Math.max(0.04, widthP);       // 間隔
  let r = ((t + 1) % d + d) % d; return r < 2 / N ? 1 : 0;
}
// 簡易 DFT（|X_k| を返す。k = −N/2 … N/2−1 の順に並べ替え）
function dft(x) {
  let mag = [];
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) { let idx = (k * n) % N; re += x[n] * cosT[idx]; im -= x[n] * sinT[idx]; }
    mag.push(Math.sqrt(re * re + im * im) / N);
  }
  return mag.slice(N / 2).concat(mag.slice(0, N / 2));
}
// 幅（2 乗を重みにした標準偏差）
function spread(vals, positions) {
  let w = vals.map((v) => v * v), tot = w.reduce((a, b) => a + b, 0) || 1e-9;
  let m = w.reduce((a, b, i) => a + b * positions[i], 0) / tot;
  let v = w.reduce((a, b, i) => a + b * (positions[i] - m) ** 2, 0) / tot;
  return Math.sqrt(Math.max(v, 0));
}

function draw() {
  background(250, 40, 10);
  let ts = [], xs = [];
  for (let n = 0; n < N; n++) { let t = -1 + 2 * n / N; ts.push(t); xs.push(signal(t)); }
  let mag = dft(xs);
  let fs = []; for (let k = 0; k < N; k++) fs.push((k - N / 2) / 2);     // 周波数（Hz 相当：区間の長さが 2 なので刻みは 0.5）
  let dt = spread(xs, ts), df = spread(mag, fs);

  let L = { x: 60, y: 110, w: width - 120, h: (height - 200) / 2 - 20 };
  let R = { x: 60, y: L.y + L.h + 60, w: width - 120, h: L.h };
  // 時間領域
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(L.x, L.y, L.w, L.h);
  stroke(0, 0, 30); line(L.x, L.y + L.h * 0.8, L.x + L.w, L.y + L.h * 0.8); line(L.x + L.w / 2, L.y, L.x + L.w / 2, L.y + L.h);
  stroke(10, 80, 100); strokeWeight(2.5); beginShape();
  for (let n = 0; n < N; n++) vertex(L.x + (ts[n] + 1) / 2 * L.w, L.y + L.h * 0.8 - xs[n] * L.h * 0.7);
  endShape();
  noStroke(); fill(0, 0, 70); textSize(14); text('時間 x(t)　' + names[sigNo] + '　幅 Δt = ' + nf(dt, 1, 3), L.x + 10, L.y + 22);
  // 幅の帯
  let mx = L.x + L.w / 2; noStroke(); fill(10, 80, 100, 15); rect(mx - dt * L.w / 2, L.y, dt * L.w, L.h);
  // 周波数領域
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(R.x, R.y, R.w, R.h);
  stroke(0, 0, 30); line(R.x + R.w / 2, R.y, R.x + R.w / 2, R.y + R.h);
  let mmax = Math.max(...mag) || 1;
  stroke(180, 80, 100); strokeWeight(2.5); beginShape();
  for (let k = 0; k < N; k++) vertex(R.x + k / N * R.w, R.y + R.h * 0.9 - mag[k] / mmax * R.h * 0.8);
  endShape();
  for (let f = -60; f <= 60; f += 20) { let sx = R.x + (f / 0.5 + N / 2) / N * R.w; stroke(0, 0, 30); line(sx, R.y + R.h - 6, sx, R.y + R.h); noStroke(); fill(0, 0, 50); textSize(11); text(f, sx - 6, R.y + R.h + 14); }
  noStroke(); fill(0, 0, 70); textSize(14); text('周波数 |X(f)|　幅 Δf = ' + nf(df, 1, 3), R.x + 10, R.y + 22);
  fill(180, 80, 100, 15); rect(R.x + R.w / 2 - df / 128 * R.w, R.y, df / 64 * R.w, R.h);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('信号：' + names[sigNo] + '（1〜4）　幅 ' + nf(widthP, 1, 2) + '（↑↓）' + (sigNo === 3 ? '　変調 ' + (8 + f0 * 4) + ' Hz（←→）' : '') + '　Δt·Δf = ' + nf(dt * df, 1, 4) + '（最小 1/4π = ' + nf(1 / (4 * Math.PI), 1, 4) + '）', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('↑↓ で時間の幅を変えると周波数の幅は逆に動く。ガウス（1）は積が最小。矩形（2）は sinc に、変調（3）はピークが ±f0 に移動、くし形（4）はくし形に（間隔が逆数）', 20, 68);
}

function keyPressed() {
  if (key >= '1' && key <= '4') sigNo = int(key);
  if (key === UP_ARROW) widthP = Math.min(0.6, widthP * 1.25);
  if (key === DOWN_ARROW) widthP = Math.max(0.01, widthP / 1.25);
  if (key === RIGHT_ARROW) f0 = Math.min(8, f0 + 1);
  if (key === LEFT_ARROW) f0 = Math.max(-1, f0 - 1);
}

// ---------- やってみよう ----------
// 1. ガウスの幅を半分にすると Δf は何倍？ 積 Δt·Δf が変わらないことを確認
// 2. 矩形の幅をとても狭くすると（インパルスに近づく）スペクトルは平らになる。広くすると？
// 3. くし形の間隔を 2 倍にするとスペクトルの間隔は半分。「周期 ↔ 離散」の双対
// 4. 自分の信号を signal() に足す（三角波、ノコギリ波）。音の高さと倍音の関係が見える
