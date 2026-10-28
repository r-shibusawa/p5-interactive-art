// ============================================
// 06 調和振動子
// V = x²/2（ばね、ω = 1, ħ = m = 1）。エネルギーは等間隔のはしご En = n + 1/2、固有関数はエルミート関数
//   ψn(x) = Hn(x) e^{−x²/2} / √(2ⁿ n! √π)。いくつも重ねた「コヒーレント状態」は古典的なボールのように往復する
// 1 = 固有状態 / 2 = 2 つの重ね合わせ / 3 = コヒーレント状態 / ↑↓ = n / ←→ = 振幅 α / K = 古典の確率分布 / スペース = 停止
// ============================================

const NH = 40;              // ★ 使う固有関数の数
const M = 300;
const XR = 6;               // x の範囲 −6 〜 6
let table = [];             // table[n][i] = ψn(xi)
let mode = 1, nSel = 0, alpha = 2;
let t = 0, running = true, showClassic = true;
let cRe = new Float64Array(NH), cIm = new Float64Array(NH);
let pRe = new Float64Array(M), pIm = new Float64Array(M);

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  // ★ 正規化されたエルミート関数を漸化式でつくる（階乗の大きな数を使わずにすむ）
  //   ψ0 = π^{−1/4} e^{−x²/2}、ψ1 = √2 x ψ0、ψ(n+1) = √(2/(n+1)) x ψn − √(n/(n+1)) ψ(n−1)
  for (let n = 0; n < NH; n++) table[n] = new Float64Array(M);
  for (let i = 0; i < M; i++) {
    let x = -XR + (2 * XR * i) / (M - 1);
    table[0][i] = Math.pow(PI, -0.25) * exp(-x * x / 2);
    table[1][i] = Math.SQRT2 * x * table[0][i];
    for (let n = 1; n < NH - 1; n++) table[n + 1][i] = sqrt(2 / (n + 1)) * x * table[n][i] - sqrt(n / (n + 1)) * table[n - 1][i];
  }
  setCoeffs();
}

// 係数 cn を決める
function setCoeffs() {
  cRe.fill(0); cIm.fill(0);
  if (mode === 1) cRe[nSel] = 1;
  if (mode === 2) { cRe[nSel] = Math.SQRT1_2; cRe[min(nSel + 1, NH - 1)] = Math.SQRT1_2; }
  if (mode === 3) {
    // ★ コヒーレント状態：cn = e^{−α²/2} αⁿ / √(n!)（漸化式 cn = c(n−1) · α / √n）
    cRe[0] = exp(-alpha * alpha / 2);
    for (let n = 1; n < NH; n++) cRe[n] = (cRe[n - 1] * alpha) / sqrt(n);
  }
}

function draw() {
  background(170, 30, 9);
  if (running) t += deltaTime / 1000;

  // ψ(x, t) = Σ cn e^{−i(n + 1/2)t} ψn(x)
  pRe.fill(0); pIm.fill(0);
  let Eavg = 0;
  for (let n = 0; n < NH; n++) {
    let a = cRe[n];
    if (abs(a) < 1e-9) continue;
    Eavg += a * a * (n + 0.5);
    let th = -(n + 0.5) * t, cr = a * cos(th), ci = a * sin(th);
    for (let i = 0; i < M; i++) { pRe[i] += cr * table[n][i]; pIm[i] += ci * table[n][i]; }
  }

  let left = 60, w = width - 380, base = height - 60, eU = (height - 200) / 13;
  let sx = (x) => left + ((x + XR) / (2 * XR)) * w;
  // 放物線 V = x²/2 とはしご
  noFill(); stroke(0, 0, 45); strokeWeight(2);
  beginShape(); for (let x = -XR; x <= XR; x += 0.05) vertex(sx(x), base - min(x * x / 2, 13) * eU); endShape();
  for (let n = 0; n < 13; n++) {
    let E = n + 0.5, A = sqrt(2 * E);
    stroke(0, 0, 100, n === nSel && mode !== 3 ? 60 : 15); strokeWeight(1);
    line(sx(-A), base - E * eU, sx(A), base - E * eU);
  }

  // |ψ|²（⟨E⟩ の高さから）色 = 位相
  let yE = base - Eavg * eU, hs = eU * 3.2;
  strokeWeight(w / M + 0.8);
  for (let i = 0; i < M; i++) {
    let p = pRe[i] * pRe[i] + pIm[i] * pIm[i];
    if (p * hs < 0.4) continue;
    stroke(((atan2(pIm[i], pRe[i]) + PI) / TWO_PI) * 360, 75, 100);
    let x = sx(-XR + (2 * XR * i) / (M - 1));
    line(x, yE, x, yE - p * hs);
  }
  // 古典的な確率分布 P(x) = 1 / (π √(A² − x²))：ボールが長くいる場所（折り返し点）ほど濃い
  if (showClassic && mode === 1) {
    let A = sqrt(2 * Eavg);
    noFill(); stroke(55, 90, 100); strokeWeight(2); beginShape();
    for (let x = -A + 0.02; x < A; x += 0.02) vertex(sx(x), yE - min(1 / (PI * sqrt(A * A - x * x)), 1.2) * hs);
    endShape();
  }
  // 古典的なボール（コヒーレント状態と比べる）x = √2 α cos t
  if (mode === 3) {
    let xc = Math.SQRT2 * alpha * cos(t);
    noStroke(); fill(0, 0, 100); circle(sx(xc), base - (xc * xc / 2) * eU, 16);
    stroke(0, 0, 100, 40); strokeWeight(1); line(sx(xc), base, sx(xc), yE - 2.4 * hs);
  }

  // 右：係数 |cn|² のはしご
  let rx = width - 290, ry = base;
  noStroke(); fill(0, 0, 70); textSize(14); text('|cn|²（どの段がどれだけ混ざっているか）', rx, 110);
  for (let n = 0; n < 24; n++) {
    let y = ry - n * ((ry - 140) / 24), a2 = cRe[n] * cRe[n];
    fill(0, 0, 25); rect(rx + 40, y - 8, 200, 12);
    fill(170 + n * 6, 70, 100); rect(rx + 40, y - 8, a2 * 200, 12);
    fill(0, 0, 60); textSize(11); text(n, rx + 14, y + 2);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  let mname = ['', '固有状態 n = ' + nSel, '重ね合わせ n = ' + nSel + ', ' + (nSel + 1), 'コヒーレント状態 α = ' + nf(alpha, 1, 2)][mode];
  text('1/2/3：' + mname + '　↑↓ n　←→ α　K：古典 ' + (showClassic ? 'ON' : 'off') + '　スペース：' + (running ? '動' : '止') + '　⟨E⟩ = ' + nf(Eavg, 1, 2), 20, 40);
  fill(0, 0, 60); textSize(15);
  text(mode === 1 ? '固有状態の |ψ|² は時間で変わらない（色 = 位相だけが回る）。n を上げると黄色の古典分布に近づく（対応原理）'
    : mode === 2 ? '隣どうしの重ね合わせは ω = E(n+1) − En = 1 の速さで左右に揺れる'
    : '白い玉 = 古典のボール。コヒーレント状態は形を変えずに一緒に往復する。⟨E⟩ = α² + 1/2', 20, 68);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { mode = int(key); setCoeffs(); }
  if (key === UP_ARROW) { nSel = min(12, nSel + 1); setCoeffs(); }
  if (key === DOWN_ARROW) { nSel = max(0, nSel - 1); setCoeffs(); }
  if (key === RIGHT_ARROW) { alpha = min(3, alpha + 0.25); setCoeffs(); }
  if (key === LEFT_ARROW) { alpha = max(0, alpha - 0.25); setCoeffs(); }
  if (key === 'k' || key === 'K') showClassic = !showClassic;
  if (key === ' ') running = !running;
}

// ---------- やってみよう ----------
// 1. n = 0 の「ゼロ点エネルギー」1/2。いちばん低い状態でも粒子は止まっていない。なぜ？（02 の不確定性）
// 2. n = 12 にして、|ψ|² の山の数と黄色い古典分布を比べよう。折り返し点の外にも少ししみ出している
// 3. 3 で α = 0 にすると？（基底状態そのもの）。α を大きくすると |cn|² の山はどこへ動く？
// 4. setCoeffs で cn の符号を交互（(−1)ⁿ）にすると、ボールはどこから出発する？
