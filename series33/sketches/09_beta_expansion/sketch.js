// ============================================
// 09 ベータ展開 ─ φ 進法とツェッケンドルフ表現
// 10 進法の「位」は 1, 10, 100 …。φ 進法では位が φ^k（…, 1/φ, 1, φ, φ², …）で、数字は 0 と 1 だけ
//   φ² = φ + 1 なので「011 = 100」。だから 1 が 2 つ続かない形にそろえられる（白銀比なら数字は 0〜2）
// 下は整数をフィボナッチ数の和で表すツェッケンドルフ表現（となりどうしを使わない）
// スペース = 自動カウント / ←→ = 数を 1 ずつ / ↑↓ = n（1 黄金・2 白銀・3 青銅）/ M = マウスで小数も
// ============================================

let N = 1;               // 表す数
let n = 1;               // ★ 底 β = φn
let auto = true;
let mouseMode = false;
let timer = 0;
const KLO = -10, KHI = 11; // ★ 表示する位の範囲

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(200, 30, 10);
  if (auto && !mouseMode) { timer++; if (timer > 50) { timer = 0; N = N >= 150 ? 0 : N + 1; } }
  let beta = metallic(n);
  let x = mouseMode ? map(constrain(mouseX, 0, width), 0, width, 0, 40) : N;
  let digits = betaDigits(x, beta);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('x = ' + (mouseMode ? nf(x, 1, 4) : N) + '（←→ / スペース：自動 ' + (auto ? 'ON' : 'off') + ' / M：マウスで小数 ' + (mouseMode ? 'ON' : 'off') + '）　底 β = φ' + n + ' = ' + nf(beta, 1, 4) + '（↑↓）', 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('β 進法：大きい位から「入るだけ入れる」（貪欲法）。数字は 0〜' + n + '、そして「' + n + ' のあとは 0」という決まりが自然に守られる', 20, 68);

  // 位のマス
  let cols = KHI - KLO + 1;
  let cw = min(64, (width - 80) / cols), x0 = 40, y0 = 110;
  for (let k = KHI; k >= KLO; k--) {
    let i = KHI - k;
    let d = digits[k] || 0;
    let cx = x0 + i * cw + (k < 0 ? 14 : 0);
    fill(d > 0 ? color(45 + (d - 1) * 140, 80, 100) : color(0, 0, 22));
    rect(cx, y0, cw - 6, cw - 6, 6);
    fill(d > 0 ? 0 : 60);
    textAlign(CENTER, CENTER);
    textSize(cw * 0.45);
    text(d, cx + (cw - 6) / 2, y0 + (cw - 6) / 2);
    fill(0, 0, 70);
    textSize(11);
    text('β^' + k, cx + (cw - 6) / 2, y0 + cw + 6);
    text(nf(Math.pow(beta, k), 1, k < -2 ? 3 : 2), cx + (cw - 6) / 2, y0 + cw + 20);
    textAlign(LEFT, BASELINE);
  }
  fill(0, 0, 100);
  circle(x0 + (KHI + 1) * cw + 4, y0 + cw - 10, 6); // 小数点

  // 文字列としての表現
  let s = '';
  for (let k = KHI; k >= KLO; k--) { if (k === -1) s += '.'; s += digits[k] || 0; }
  s = s.replace(/^0+(?=\d)/, '').replace(/\.?0+$/, '');
  fill(45, 60, 100);
  textSize(22);
  text('(' + (mouseMode ? nf(x, 1, 4) : N) + ')₁₀ = (' + s + ')_φ' + n, 40, y0 + cw + 64);

  // 数直線：位の長さのブロックを積み上げる
  let ly = y0 + cw + 110, lw = width - 80, unit = lw / max(10, x * 1.1);
  stroke(0, 0, 100, 40);
  line(40, ly + 30, 40 + lw, ly + 30);
  noStroke();
  let pos = 0;
  for (let k = KHI; k >= KLO; k--) {
    let d = digits[k] || 0;
    for (let j = 0; j < d; j++) {
      let L = Math.pow(beta, k) * unit;
      fill((k * 40 + 400) % 360, 60, 95, 85);
      rect(40 + pos * unit, ly, max(1, L - 1), 26);
      if (L > 30) { fill(0, 0, 10); textSize(12); text('β^' + k, 40 + pos * unit + 4, ly + 18); }
      pos += Math.pow(beta, k);
    }
  }
  fill(0, 0, 100);
  triangle(40 + x * unit, ly - 4, 40 + x * unit - 6, ly - 14, 40 + x * unit + 6, ly - 14);
  fill(0, 0, 65);
  textSize(13);
  text('ブロックを並べた長さ = ' + nf(pos, 1, 6) + '（誤差 ' + abs(pos - x).toExponential(1) + '）', 40, ly + 52);

  // ツェッケンドルフ（オストロフスキー）表現：整数を数列の和で
  if (!mouseMode) drawZeckendorf(N, 40, ly + 100);
}

function drawZeckendorf(m, x0, y0) {
  // 数列 1, n, n²+1, …（n=1 なら 1, 2, 3, 5, 8, …）
  let G = [1, n];
  while (G[G.length - 1] < 400) G.push(n * G[G.length - 1] + G[G.length - 2]);
  if (n === 1) G.shift();
  let rest = m, use = new Array(G.length).fill(0);
  for (let i = G.length - 1; i >= 0; i--) { use[i] = floor(rest / G[i]); rest -= use[i] * G[i]; }
  fill(0, 0, 100);
  textSize(16);
  text((n === 1 ? 'ツェッケンドルフ表現（フィボナッチ数の和）' : n === 2 ? 'ペル数での表現' : '数列 a(k+1) = ' + n + 'a(k) + a(k−1) での表現') + '：' + m + ' = ' +
    G.map((g, i) => use[i] ? (use[i] > 1 ? use[i] + '×' : '') + g : '').filter(t => t).reverse().join(' + '), x0, y0);
  let bw = min(70, (width - 80) / G.length);
  for (let i = 0; i < G.length; i++) {
    let on = use[i] > 0;
    fill(on ? color(190, 70, 100) : color(0, 0, 20));
    circle(x0 + i * bw + bw / 2, y0 + 40, bw * 0.6);
    fill(on ? 0 : 60);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(G[i], x0 + i * bw + bw / 2, y0 + 40);
    if (use[i] > 1) { fill(50, 90, 100); text('×' + use[i], x0 + i * bw + bw / 2, y0 + 70); }
    textAlign(LEFT, BASELINE);
  }
  fill(0, 0, 65);
  textSize(13);
  text('となりどうしの電球は同時につかない（n=1）。大きい方から貪欲に取ると必ずそうなる', x0, y0 + 96);
}

function keyPressed() {
  if (key === RIGHT_ARROW) N = min(N + 1, 199);
  if (key === LEFT_ARROW) N = max(N - 1, 0);
  if (key === UP_ARROW) n = min(n + 1, 4);
  if (key === DOWN_ARROW) n = max(n - 1, 1);
  if (key === ' ') auto = !auto;
  if (key === 'm' || key === 'M') mouseMode = !mouseMode;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. φ 進法で 1, 2, 3 を書くと？（1 = 1、2 = 10.01、3 = 100.01）。2 = φ + 1/φ² を確かめよう
// 2. どの整数も「有限の桁」で書けるのは φ が特別な数（ピゾ数）だから。↑↓ で白銀比・青銅比も試そう
// 3. M で x = 1/2 のような小数にすると、桁が KLO まで続く（終わらない）ことがある
// 4. ツェッケンドルフ表現の電球で、N を 1 ずつ増やすと電球はどう繰り上がる？（011 → 100）

// ---------- 道具 ----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
// x の β 進展開（貪欲法）。digits[k] = β^k の位の数字
function betaDigits(x, beta) {
  let d = {}, rest = x;
  for (let k = KHI; k >= KLO; k--) {
    let p = Math.pow(beta, k);
    let c = Math.floor(rest / p + 1e-9);
    c = constrain(c, 0, Math.floor(beta));
    d[k] = c;
    rest -= c * p;
    if (rest < 1e-9) rest = Math.max(0, rest);
  }
  return d;
}
