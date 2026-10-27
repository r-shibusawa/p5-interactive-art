// ============================================
// 07 1 の n 乗根：FFT を速くする魔法の点
// ωₙ = e^{2πi/n} は円を n 等分する点。n 乗すると 1 に戻る
// 1：累乗（掛け算 = 角度の足し算）  2：半分補題（2 乗すると n/2 乗根になる → 問題が半分に）
// 3：相殺補題（全部足すと 0）  4：DFT 行列（y = V a の V の中身）
// ←→：n を変える / ↑↓：k を変える / スペース：アニメの一時停止
// ============================================

let n = 8;          // ★ 最初の n（2 の累乗にすると半分補題がきれい）
let mode = 1, k = 1, t = 0, paused = false;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); colorMode(HSB, 360, 100, 100, 100); }

function draw() {
  background(265, 45, 10);
  if (!paused) t += 0.008;
  let cx = width * 0.32, cy = height * 0.56, rad = min(width * 0.25, height * 0.36);
  fill(0, 0, 92); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('1 の n 乗根：FFT を速くする魔法の点', 30, 50);
  textSize(15); fill(0, 0, 60);
  text(`1：累乗　2：半分補題　3：相殺補題　4：DFT 行列　←→：n = ${n}　↑↓：k = ${k}　スペース：${paused ? '再開' : '一時停止'}`, 30, 80);

  if (mode === 4) { dftMatrix(); return; }
  // 円と軸
  noFill(); stroke(0, 0, 30); strokeWeight(1); line(cx - rad * 1.2, cy, cx + rad * 1.2, cy); line(cx, cy - rad * 1.2, cx, cy + rad * 1.2);
  stroke(0, 0, 45); strokeWeight(2); circle(cx, cy, rad * 2);
  noStroke(); fill(0, 0, 60); textSize(14); text('実部', cx + rad * 1.2 - 30, cy - 8); text('虚部', cx + 6, cy - rad * 1.2 + 14);
  let P = (ang, r = rad) => [cx + cos(ang) * r, cy - sin(ang) * r];

  let side = width * 0.62, yy = 130;
  textAlign(LEFT, TOP); textSize(18);
  if (mode === 1) {
    let kk = floor(t * 3) % (n + 1);
    for (let j = 0; j < n; j++) { let [x, y] = P((TWO_PI * j) / n); fill((j * 360) / n, 70, 95); circle(x, y, j === kk % n ? 26 : 16); fill(0, 0, 90); textSize(13); text('ω' + sup(j), x + (x > cx ? 10 : -34), y + (y > cy ? 6 : -20)); }
    stroke(45, 90, 100); strokeWeight(3); noFill();
    beginShape(); for (let j = 0; j <= kk; j++) { let [x, y] = P((TWO_PI * j) / n, rad * (0.55 + 0.4 * (j / n))); vertex(x, y); } endShape();
    let [ex, ey] = P((TWO_PI * kk) / n); stroke(45, 90, 100); line(cx, cy, ex, ey);
    noStroke(); fill(0, 0, 92); textSize(18);
    text(`ωₙ = e^{2πi/${n}} = cos(2π/${n}) + i sin(2π/${n})`, side, yy); yy += 34;
    text(`ω${sup(kk)} は角度 ${kk} × ${(360 / n).toFixed(1)}° = ${((kk * 360) / n).toFixed(1)}°`, side, yy); yy += 34;
    fill(45, 90, 100); text(kk === n ? `ω${sup(n)} = 1：一周して戻る！` : '掛け算するたび、角度が 360°/n ずつ増える', side, yy); yy += 50;
    fill(0, 0, 65); textSize(15);
    text('複素数の掛け算は「長さを掛けて、角度を足す」。長さ 1 の数を掛けると回転だけ。\nn 個の根はみんな「n 乗すると 1」：xⁿ = 1 の n 個の解。', side, yy, width - side - 30);
  }
  if (mode === 2) {
    let s = constrain((sin(t * 2) + 1) / 2 * 1.3 - 0.15, 0, 1); // 0：もとの根 → 1：2 乗した根
    for (let j = 0; j < n; j++) {
      let a0 = (TWO_PI * j) / n, ang = a0 * (1 + s);
      let [x, y] = P(ang);
      fill(((j % (n / 2 || 1)) * 360) / max(1, n / 2), 70, 95, 85); noStroke(); circle(x, y, 20 - (j >= n / 2 ? 6 : 0));
    }
    fill(0, 0, 92); textSize(18);
    text(`n = ${n} 個の根を 2 乗すると…`, side, yy); yy += 34;
    fill(45, 90, 100); text(`${n / 2} 個の「${n / 2} 乗根」に重なる（同じ色が合体）`, side, yy); yy += 34;
    fill(0, 0, 92); text(`(ω${sup(1)}ₙ)² の角度は 2 倍 → ω_(n/2) と同じ`, side, yy); yy += 34;
    text(`ω${sup(1)} と ω${sup(1 + n / 2)} は 180° ちがい → 2 乗すると同じ点`, side, yy); yy += 50;
    fill(0, 0, 65); textSize(15);
    text('半分補題：(ωₙᵏ⁺ⁿ/²)² = (ωₙᵏ)²。\nFFT では偶数番目の係数 A⁰ と奇数番目 A¹ に分けて A(x) = A⁰(x²) + x·A¹(x²)。\nx² の候補が n/2 個に減るので、同じ形の問題（サイズ半分）を 2 つ解けばよい → T(n) = 2T(n/2) + Θ(n) = Θ(n log n)', side, yy, width - side - 30);
  }
  if (mode === 3) {
    // Σ_j (ω^k)^j を矢印の継ぎ足しで描く
    let L = rad * 0.9 / max(2, n / 3), x = width * 0.32 - L, y = cy + rad * 0.3, show = min(n, floor(t * 4) % (n + 6));
    let sumx = 0, sumy = 0;
    for (let j = 0; j < show; j++) {
      let ang = (TWO_PI * k * j) / n, nx = x + cos(ang) * L, ny = y - sin(ang) * L;
      stroke((j * 360) / n, 70, 95); strokeWeight(3); line(x, y, nx, ny); noStroke(); fill((j * 360) / n, 70, 95); circle(nx, ny, 8);
      x = nx; y = ny; sumx += cos(ang); sumy += sin(ang);
    }
    fill(0, 0, 92); textSize(18); noStroke();
    text(`Σ (ωₙ^${k})ʲ   （j = 0 … ${n - 1}）`, side, yy); yy += 34;
    let isZero = k % n !== 0;
    fill(isZero ? color(150, 70, 90) : color(45, 90, 100));
    text(isZero ? `k = ${k} は n の倍数でない → 矢印が閉じて合計 0` : `k = ${k} は n の倍数 → 全部 1、合計 ${n}`, side, yy); yy += 34;
    fill(0, 0, 80); text(`いまの合計 ≈ ${sumx.toFixed(2)} + ${sumy.toFixed(2)}i`, side, yy); yy += 50;
    fill(0, 0, 65); textSize(15);
    text('相殺補題（総和補題）：k が n の倍数でなければ Σ ωₙ^{jk} = 0。\nこれがあるから逆 DFT が「ω を ω⁻¹ にして n で割る」だけで計算できる（V⁻¹ = V̄ / n）。\n↑↓ で k を変えて、閉じた多角形（星形）を見よう。', side, yy, width - side - 30);
  }
}

function dftMatrix() {
  let N = min(n, 32), cs = min((height - 170) / N, (width * 0.55) / N), ox = 40, oy = 110;
  for (let j = 0; j < N; j++) for (let kk = 0; kk < N; kk++) {
    let e = (j * kk) % N, ang = (TWO_PI * e) / N, x = ox + kk * cs, y = oy + j * cs;
    fill((e * 360) / N, 65, 85); noStroke(); rect(x, y, cs - 1, cs - 1);
    if (cs > 14) { stroke(0, 0, 10); strokeWeight(max(1, cs / 14)); line(x + cs / 2, y + cs / 2, x + cs / 2 + cos(ang) * cs * 0.38, y + cs / 2 - sin(ang) * cs * 0.38); }
  }
  let side = ox + N * cs + 40, w = width - side - 30;
  noStroke(); fill(0, 0, 92); textSize(18); textAlign(LEFT, TOP);
  text(`DFT 行列 V（${N}×${N}）`, side, 120);
  fill(0, 0, 70); textSize(15);
  text(`j 行 k 列 = ωₙ^{jk}。色と針が角度。\ny = V a の計算（DFT）は、そのままだと n² = ${N * N} 回の掛け算。\n\n行を見ると「速さ k で回る針」が並ぶ：シリーズ5の DFT と同じもの。\n\n偶数列と奇数列に分けると、上半分と下半分が同じ模様のくり返し（半分補題）→ FFT はこの重複を使って n log n = ${round(N * log(N) / log(2))} 回に減らす。\n\nV⁻¹ は ω を ω⁻¹（逆回り）にして n で割ったもの。`, side, 160, w);
}

function keyPressed() {
  if (key >= '1' && key <= '4') mode = int(key);
  if (key === RIGHT_ARROW) n = min(32, n + (mode === 2 ? n : 1));
  if (key === LEFT_ARROW) n = max(2, mode === 2 ? n / 2 : n - 1);
  if (mode === 2) n = pow(2, round(log(n) / log(2)));
  if (key === UP_ARROW) k++;
  if (key === DOWN_ARROW) k = max(0, k - 1);
  if (key === ' ') paused = !paused;
}
function sup(v) { return String(v).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join(''); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 3 で n = 8, k = 2 → 4 角形を 2 周。k = 3 → 星形。k = 8 → まっすぐ伸びる（合計 8）
// 2. 2 で n = 16 → 8 → 4 … と半分にしていく。何回で 1 点になる？（log₂ n 回 = FFT の段数）
// 3. 4 の DFT 行列で、0 行目と 0 列目が全部同じ色（= 1）になる理由は？
