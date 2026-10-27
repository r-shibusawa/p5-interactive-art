// ============================================
// 09 FFT で巨大な数を掛け算する
// 数の各けたを多項式の係数と見る：1234 = 4 + 3x + 2x² + 1x³（x = 10）
// 係数 → FFT で点の値 → 点ごとに掛ける → 逆 FFT で係数 → くり上がり。全部で Θ(n log n)
// スペース：次の段階 / A：自動 / R：新しい数 / 1：4 けた  2：8 けた  3：16 けた  4：32 けた
// ============================================

let speed = 70; // ★ 自動再生の間隔（フレーム）

let digits = 8, A = '', B = '', N, fa, fb, fc, conv, prodDigits, stageNo = 0, auto = false, timer = 0, verified = false;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); newNumbers(); }

function newNumbers() {
  let rnd = () => { let s = String(floor(random(1, 10))); for (let i = 1; i < digits; i++) s += floor(random(10)); return s; };
  A = rnd(); B = rnd();
  let a = A.split('').reverse().map(Number), b = B.split('').reverse().map(Number);
  N = 1; while (N < a.length + b.length) N *= 2;
  let pa = a.concat(Array(N - a.length).fill(0)).map(v => [v, 0]), pb = b.concat(Array(N - b.length).fill(0)).map(v => [v, 0]);
  fa = fft(pa, false); fb = fft(pb, false);
  fc = fa.map((p, i) => [p[0] * fb[i][0] - p[1] * fb[i][1], p[0] * fb[i][1] + p[1] * fb[i][0]]);
  conv = fft(fc, true).map(v => round(v[0]));
  prodDigits = []; let carry = 0;
  for (let i = 0; i < N; i++) { let s = conv[i] + carry; prodDigits.push(s % 10); carry = floor(s / 10); }
  while (carry) { prodDigits.push(carry % 10); carry = floor(carry / 10); }
  while (prodDigits.length > 1 && prodDigits[prodDigits.length - 1] === 0) prodDigits.pop();
  verified = prodDigits.slice().reverse().join('') === (BigInt(A) * BigInt(B)).toString();
  stageNo = 0;
}

// 反復版 FFT（inv = true なら逆変換）
function fft(x, inv) {
  let n = x.length, L = round(log(n) / log(2)), A2 = [];
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < L; b++) if (i & (1 << b)) r |= 1 << (L - 1 - b); A2[i] = x[r].slice(); }
  for (let m = 2; m <= n; m *= 2) {
    let ang = ((inv ? -1 : 1) * TWO_PI) / m;
    for (let k = 0; k < n; k += m) for (let j = 0; j < m / 2; j++) {
      let wr = cos(ang * j), wi = sin(ang * j), v = A2[k + j + m / 2];
      let t = [wr * v[0] - wi * v[1], wr * v[1] + wi * v[0]], u = A2[k + j];
      A2[k + j] = [u[0] + t[0], u[1] + t[1]]; A2[k + j + m / 2] = [u[0] - t[0], u[1] - t[1]];
    }
  }
  if (inv) A2 = A2.map(v => [v[0] / n, v[1] / n]);
  return A2;
}

function draw() {
  background(18, 14, 26);
  if (auto && ++timer % speed === 0) stageNo = (stageNo + 1) % 6;
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('FFT で巨大な数を掛け算する', 30, 50);
  textSize(15); fill(150);
  text('スペース：次の段階　A：自動' + (auto ? '（中）' : '') + '　R：新しい数　1：4 けた　2：8 けた　3：16 けた　4：32 けた', 30, 80);

  let left = 30, cw = min(36, (width * 0.68 - 120) / N), y = 120;
  textSize(20); fill(235); textAlign(LEFT, TOP);
  text(`${A} × ${B}`, left, y); y += 40;

  let rowLabel = (s, yy) => { fill(170); textSize(14); textAlign(RIGHT, CENTER); text(s, left + 96, yy); };
  let cells = (arr, yy, col, fmtF, hiOn) => { for (let i = 0; i < N; i++) { fill(i < arr.length ? col : color(32, 26, 44)); noStroke(); rect(left + 110 + i * cw, yy - 15, cw - 3, 30, 5); fill(240); textAlign(CENTER, CENTER); textSize(min(14, cw * 0.42)); if (i < arr.length) text(fmtF(arr[i], i), left + 110 + i * cw + cw / 2 - 1, yy); } };
  let bars = (arr, yy, col, h) => { let mx = max(arr.map(v => mag(v[0], v[1]))) || 1; for (let i = 0; i < N; i++) { let mg = mag(arr[i][0], arr[i][1]); fill(col); noStroke(); rect(left + 110 + i * cw, yy - (mg / mx) * h, cw - 3, (mg / mx) * h, 3); } };

  let a = A.split('').reverse().map(Number), b = B.split('').reverse().map(Number);
  rowLabel('A の係数', y + 15); cells(a, y + 15, color(110, 40, 55), v => v); y += 40;
  rowLabel('B の係数', y + 15); cells(b, y + 15, color(110, 40, 55), v => v); y += 34;
  fill(150); textSize(13); textAlign(LEFT, TOP); text(`← 1 の位　　　　（けたを逆順に並べ、長さ ${N}（2 の累乗、2n 以上）まで 0 で埋める）`, left + 110, y); y += 34;

  if (stageNo >= 1) { rowLabel('FFT(A)', y + 40); bars(fa, y + 70, color(255, 200, 90), 60); rowLabel('FFT(B)', y + 120); bars(fb, y + 150, color(255, 200, 90), 60); }
  y += 170;
  if (stageNo >= 2) { rowLabel('点ごとの積', y + 40); bars(fc, y + 70, color(255, 95, 109), 60); }
  y += 90;
  if (stageNo >= 3) { rowLabel('逆 FFT', y + 15); cells(conv, y + 15, color(30, 90, 80), v => v); }
  y += 40;
  if (stageNo >= 4) { rowLabel('くり上がり', y + 15); cells(prodDigits, y + 15, color(78, 225, 190), v => v); }
  y += 50;
  if (stageNo >= 5) { fill(78, 225, 190); textSize(20); textAlign(LEFT, TOP); text(`= ${prodDigits.slice().reverse().join('')}　${verified ? '✓ BigInt の計算と一致' : '✗ 一致しない（誤差）'}`, left, y, width * 0.68); }

  // 右：説明と計算量
  let px = width * 0.7, w = width - px - 30, yy = 120;
  let msgs = ['けたを係数にした多項式 A(x), B(x)。x = 10 を代入すれば元の数', 'FFT：1 の N 乗根での値（点・値表現）に変換。Θ(N log N)', '点ごとに掛ける：C(ωᵏ) = A(ωᵏ)·B(ωᵏ)。たった N 回', '逆 FFT：C の係数に戻す。各けたの「たたみこみ」（筆算の縦の和）が出る', 'くり上がり：10 以上を次のけたへ送る', '完成！'];
  fill(32, 26, 44); noStroke(); rect(px - 10, yy - 10, w + 10, 120, 12);
  fill(235); textSize(16); textAlign(LEFT, TOP); text(`段階 ${stageNo} / 5\n${msgs[stageNo]}`, px, yy, w - 10);
  yy += 140;
  fill(200); textSize(16); text('掛け算の回数の比較', px, yy); yy += 28;
  let n = digits, school = n * n, fftc = round(3 * N * log(N) / log(2) / 2 + N);
  textSize(15); fill(255, 95, 109); text(`筆算：${n} × ${n} = ${school} 回`, px, yy); yy += 24;
  fill(255, 200, 90); text(`FFT：約 ${fftc} 回（FFT 3 回 + 積 ${N} 回）`, px, yy); yy += 34;
  // n² と n log n のグラフ
  let gx = px, gy = yy + 150, gw = w - 10, gh = 140;
  stroke(70); strokeWeight(1); line(gx, gy, gx + gw, gy); line(gx, gy, gx, gy - gh);
  noFill(); strokeWeight(2.5);
  stroke(255, 95, 109); beginShape(); for (let i = 1; i <= 100; i++) { let m = i * 10; vertex(gx + (i / 100) * gw, gy - min(gh, (m * m) / 1e6 * gh)); } endShape();
  stroke(255, 200, 90); beginShape(); for (let i = 1; i <= 100; i++) { let m = i * 10; vertex(gx + (i / 100) * gw, gy - min(gh, (3 * m * log(2 * m) / log(2)) / 1e6 * gh)); } endShape();
  noStroke(); fill(150); textSize(12); text('けた数 → 1000', gx + gw - 80, gy + 6); text('n²', gx + gw * 0.55, gy - gh + 4); text('n log n', gx + gw - 50, gy - 26);
  fill(150); textSize(14);
  text('100 万けたなら、筆算は 10¹² 回、FFT は約 10⁸ 回。円周率の計算記録や暗号の巨大な数はこの方法（とその改良）で掛け算する。浮動小数点の誤差に注意（大きすぎると round がずれる）', px, gy + 30, w - 10);
}

function keyPressed() {
  if (key === ' ') stageNo = (stageNo + 1) % 6;
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') newNumbers();
  if (key >= '1' && key <= '4') { digits = [4, 8, 16, 32][int(key) - 1]; newNumbers(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 4 けたで、逆 FFT の行を手で確かめる：1 の位 = a₀b₀、10 の位 = a₀b₁ + a₁b₀、…
// 2. 99999999 × 99999999 のような数（A と B を直接書きかえる）でくり上がりがたくさん起きる
// 3. 10 進数でなく 100 進数（2 けたずつ）にすると、配列が半分になって速くなる
