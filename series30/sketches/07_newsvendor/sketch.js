// ============================================
// 07 新聞売り子問題 ─ 不確かな需要と発注量
// 明日の弁当を何個仕入れる？ 売れ残りは捨て値、足りなければ売りそこね。需要は毎日ランダム
//   最適な Q は「需要が Q 以下である確率 = (p − c) / (p − s)」を満たす点（クリティカル・フラクタイル）
// ←→ = 仕入れ数 Q / ↑↓ = 仕入れ値 c / O = 最適な Q / スペース = 毎日のシミュレーション ON/OFF / C = 記録を消す
// ============================================

let price = 600;                       // ★ 売り値 p（円）
let cost = 300;                        // ★ 仕入れ値 c（円）
let salvage = 50;                      // ★ 売れ残りの処分価格 s（円）
let mu = 100, sigma = 25;              // ★ 需要の平均と標準偏差（正規分布）
let Q = 100;
let running = true;
let dayLog = [], profitLog = [];       // シミュレーション：需要と利益の記録

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function profitOf(q, d) { let sold = min(q, d); return price * sold + salvage * max(0, q - d) - cost * q; }
// ★ 期待利益：需要 d ごとの利益 × その確率 を足す
function expectedProfit(q) {
  let s = 0, tot = 0;
  for (let d = 0; d <= mu + 5 * sigma; d++) { let pr = normPdf(d, mu, sigma); s += pr * profitOf(q, d); tot += pr; }
  return s / tot;
}
function criticalFractile() { return (price - cost) / (price - salvage); }
function optimalQ() { return mu + sigma * invNorm(criticalFractile()); }

function draw() {
  background(225, 30, 12);
  if (running) for (let k = 0; k < 3; k++) {
    let d = max(0, round(mu + sigma * randomGaussian()));
    dayLog.push(d); profitLog.push(profitOf(Q, d));
    if (dayLog.length > 3000) { dayLog.shift(); profitLog.shift(); }
  }
  let cf = criticalFractile(), qOpt = optimalQ();

  // 左上：需要の分布と Q
  let ax = 80, ay = 120, aw = width * 0.42, ah = height * 0.3;
  let dMax = mu + 4 * sigma, pMax = normPdf(mu, mu, sigma) * 1.15;
  let X = d => ax + d / dMax * aw, Y = p => ay + ah - p / pMax * ah;
  noStroke();
  for (let d = 0; d <= dMax; d++) {
    fill(d <= Q ? color(190, 60, 85, 70) : color(30, 70, 95, 70));
    rect(X(d), Y(normPdf(d, mu, sigma)), aw / dMax, ay + ah - Y(normPdf(d, mu, sigma)));
  }
  stroke(0, 0, 100); strokeWeight(3); line(X(Q), ay - 10, X(Q), ay + ah);
  stroke(140, 80, 100); strokeWeight(2); drawingContext.setLineDash([6, 5]); line(X(qOpt), ay - 10, X(qOpt), ay + ah); drawingContext.setLineDash([]);
  noStroke(); fill(0, 0, 100); textSize(14); text('Q = ' + Q, X(Q) + 6, ay);
  fill(140, 70, 100); text('Q* = ' + nf(qOpt, 1, 1), X(qOpt) + 6, ay + 18);
  fill(0, 0, 70); textSize(13);
  text('需要の分布（平均 ' + mu + '、標準偏差 ' + sigma + '）　青 = 売り切れない日（確率 ' + nf(normCdf(Q, mu, sigma), 1, 3) + '）、橙 = 足りない日', ax, ay - 24);
  textAlign(CENTER, TOP); text('需要（個）→', ax + aw / 2, ay + ah + 6); textAlign(LEFT, BASELINE);

  // 右上：期待利益の曲線
  let bx = ax + aw + 70, bw = width - bx - 50;
  let qs = [], eMax = -Infinity, eMin = Infinity;
  for (let q = 0; q <= dMax; q += 2) { let e = expectedProfit(q); qs.push([q, e]); eMax = max(eMax, e); eMin = min(eMin, e); }
  eMin = min(eMin, 0);
  let BX = q => bx + q / dMax * bw, BY = e => ay + ah - (e - eMin) / (eMax - eMin) * ah;
  stroke(0, 0, 100, 25); strokeWeight(1); line(bx, BY(0), bx + bw, BY(0));
  noFill(); stroke(50, 90, 100); strokeWeight(3);
  beginShape(); for (let [q, e] of qs) vertex(BX(q), BY(e)); endShape();
  let eq = expectedProfit(Q);
  noStroke(); fill(0, 0, 100); circle(BX(Q), BY(eq), 12);
  fill(140, 80, 100); circle(BX(qOpt), BY(expectedProfit(qOpt)), 10);
  fill(0, 0, 70); textSize(13); text('仕入れ数 Q → 1 日の期待利益', bx, ay - 24);
  fill(0, 0, 100); text('期待利益 ' + nf(eq, 1, 0) + ' 円', BX(Q) + 10, BY(eq) + 20);

  // 下左：シミュレーションの利益のヒストグラム
  let hx = 80, hy = ay + ah + 80, hw = width * 0.42, hh = height - hy - 70;
  let lo = profitOf(Q, 0), hi = profitOf(Q, Q), nb = 30, cnt = new Array(nb).fill(0);
  for (let p of profitLog) cnt[constrain(floor((p - lo) / max(1, hi - lo) * (nb - 1)), 0, nb - 1)]++;
  let cm = max(1, max(cnt));
  for (let b = 0; b < nb; b++) { let hgt = cnt[b] / cm * hh; fill(b === nb - 1 ? color(190, 60, 85) : color(30, 60, 90)); rect(hx + b * hw / nb, hy + hh - hgt, hw / nb - 2, hgt); }
  fill(0, 0, 70); textSize(13);
  text('シミュレーションした ' + profitLog.length + ' 日の利益の分布　（右端の青 = 全部売れた日：利益 ' + hi + ' 円）', hx, hy - 12);
  textSize(11); fill(0, 0, 55); text(lo + ' 円', hx, hy + hh + 14); textAlign(RIGHT); text(hi + ' 円', hx + hw, hy + hh + 14); textAlign(LEFT);

  // 下右：数字
  let rx = bx, avg = profitLog.length ? profitLog.reduce((a, b) => a + b, 0) / profitLog.length : 0;
  let soldOut = dayLog.filter(d => d >= Q).length;
  fill(0, 0, 100); textSize(16);
  let L = [
    '売り値 p = ' + price + '　仕入れ値 c = ' + cost + '　処分価格 s = ' + salvage,
    '1 個足りないと損する額（機会損失）　p − c = ' + (price - cost) + ' 円',
    '1 個余ると損する額　c − s = ' + (cost - salvage) + ' 円',
    'クリティカル・フラクタイル　(p − c) / (p − s) = ' + nf(cf, 1, 3),
    '→ 需要が Q* 以下になる確率が ' + nf(cf * 100, 1, 1) + '% になる Q* = ' + nf(qOpt, 1, 1),
    '',
    'シミュレーションの平均利益　' + nf(avg, 1, 0) + ' 円（期待値 ' + nf(eq, 1, 0) + '）',
    '売り切れた日の割合　' + (dayLog.length ? nf(100 * soldOut / dayLog.length, 1, 1) : '—') + '%',
  ];
  textSize(15);
  L.forEach((s, i) => { fill(i === 4 ? color(140, 70, 100) : color(0, 0, 85)); text(s, rx, hy + i * 26); });

  fill(0, 0, 100); textSize(18);
  text('←→ 仕入れ数 Q ' + Q + '　↑↓ 仕入れ値 c ' + cost + '　O：最適な Q にする　スペース：シミュレーション ' + (running ? 'ON' : 'OFF') + '　C：記録を消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('平均の需要（' + mu + '）ちょうどを仕入れるのが最適とは限らない。足りない損と余る損のバランスで決まる', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { Q = min(250, Q + 2); profitLog = []; dayLog = []; }
  if (key === LEFT_ARROW) { Q = max(0, Q - 2); profitLog = []; dayLog = []; }
  if (key === UP_ARROW) { cost = min(price - 10, cost + 10); profitLog = []; dayLog = []; }
  if (key === DOWN_ARROW) { cost = max(salvage + 10, cost - 10); profitLog = []; dayLog = []; }
  if (key === 'o' || key === 'O') { Q = round(optimalQ()); profitLog = []; dayLog = []; }
  if (key === ' ') running = !running;
  if (key === 'c' || key === 'C') { profitLog = []; dayLog = []; }
}

// ---------- やってみよう ----------
// 1. 仕入れ値 c を上げると Q* は平均より少なく、下げると多くなる。フラクタイルが 0.5 になるのはいつ？
// 2. Q を Q* から ±20 動かすと期待利益はどれくらい下がる？ 曲線の形で説明しよう
// 3. sigma（ばらつき）を 50 にすると Q* と期待利益はどう変わる？「需要予測の精度」の値打ちを考えよう
// 4. 売れ残りを翌日に回せる（パン → ラスク）なら？ salvage を上げてみよう


// ==================================================
// ここから下は「正規分布の道具」
// ==================================================
function normPdf(x, m, s) { return Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)); }
function normCdf(x, m, s) { return 0.5 * (1 + erf((x - m) / (s * Math.SQRT2))); }
function erf(x) {   // 近似式（誤差 1e-7 程度）
  let t = 1 / (1 + 0.3275911 * Math.abs(x));
  let y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
// 標準正規分布の逆関数（二分法）
function invNorm(p) {
  let lo = -8, hi = 8;
  for (let i = 0; i < 60; i++) { let m = (lo + hi) / 2; if (normCdf(m, 0, 1) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
