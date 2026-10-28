// ============================================
// 01 ポアソン到着と指数分布
// 「いつ来るかまったく予想できない」到着を、時間の上の点としてならべる
//   到着と到着の間隔 → 指数分布 λe^(−λx)　　1 秒ごとに数えた人数 → ポアソン分布 e^(−λ) λ^k / k!
// ←→ = 到着率 λ / ↑↓ = 時間の速さ / スペース = 一時停止 / R = リセット
// ============================================

let lambda = 3;        // ★ 単位時間あたりの平均到着数
let speed = 2;         // ★ 1 秒で進む時間
let showSpan = 12;     // ★ 上の帯に表示する時間の長さ
let paused = false;
let simT, nextArr, lastArr;
let arrivals = [];     // 最近の到着時刻
let gaps = [];         // 到着の間隔（すべて）
let counts = [];       // 1 単位時間ごとの到着数（すべて）
let curCount, curBin;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function resetAll() {
  simT = 0; lastArr = 0; nextArr = expRand(lambda);
  arrivals = []; gaps = []; counts = []; curCount = 0; curBin = 0;
}

function advance(tEnd) {
  while (nextArr <= tEnd) {
    // 区切り（整数時刻）をまたいだら、その区間の人数を記録
    while (floor(nextArr) > curBin) { counts.push(curCount); curCount = 0; curBin++; }
    arrivals.push(nextArr); gaps.push(nextArr - lastArr); curCount++;
    lastArr = nextArr;
    nextArr += expRand(lambda);     // ★ 次の到着までの時間は指数分布
  }
  while (floor(tEnd) > curBin) { counts.push(curCount); curCount = 0; curBin++; }
  simT = tEnd;
  while (arrivals.length && arrivals[0] < simT - showSpan) arrivals.shift();
  if (gaps.length > 20000) gaps.splice(0, gaps.length - 20000);
  if (counts.length > 5000) counts.splice(0, counts.length - 5000);
}

function draw() {
  background(250, 25, 12);
  if (!paused) advance(simT + speed / 60);

  // ---- 時間の帯：到着 = 縦線、区切り = 単位時間
  let x0 = 40, x1 = width - 40, by = 110, bh = 70;
  let X = (t) => map(t, simT - showSpan, simT, x0, x1);
  noStroke(); fill(0, 0, 100, 6); rect(x0, by, x1 - x0, bh, 8);
  for (let k = ceil(simT - showSpan); k <= simT; k++) {
    stroke(0, 0, 100, 25); strokeWeight(1); line(X(k), by, X(k), by + bh);
    let n = 0; for (let a of arrivals) if (a >= k && a < k + 1) n++;
    if (k >= 0 && k + 1 <= simT) { noStroke(); fill(45, 80, 100); textSize(14); textAlign(CENTER); text(n, X(k + 0.5), by + bh + 18); textAlign(LEFT); }
  }
  stroke(190, 70, 100); strokeWeight(3);
  for (let a of arrivals) line(X(a), by + 10, X(a), by + bh - 10);
  noStroke(); fill(0, 0, 60); textSize(13); text('← 過去　　時間の上の到着（縦線）。黄色の数字 = 1 単位時間に来た人数　　いま →', x0, by - 8);

  // ---- 左：間隔のヒストグラム vs 指数分布
  let gx = 60, gy = height - 60, gw = width * 0.42, gh = height - 340;
  let xmax = 5 / lambda, nb = 30, bw = xmax / nb;
  let bins = new Array(nb).fill(0);
  for (let g of gaps) { let b = floor(g / bw); if (b < nb) bins[b]++; }
  let ymax = lambda * 1.15;
  axes(gx, gy, gw, gh, '到着の間隔 x', '0', nf(xmax, 1, 1));
  noStroke(); fill(190, 60, 90, 70);
  for (let i = 0; i < nb; i++) {
    let dens = bins[i] / max(gaps.length, 1) / bw;
    let h = min(dens / ymax, 1) * gh;
    rect(gx + i * gw / nb + 1, gy - h, gw / nb - 2, h);
  }
  noFill(); stroke(45, 90, 100); strokeWeight(3);
  beginShape();
  for (let i = 0; i <= 80; i++) { let x = xmax * i / 80; vertex(gx + gw * i / 80, gy - lambda * Math.exp(-lambda * x) / ymax * gh); }
  endShape();
  let mg = 0; for (let g of gaps) mg += g; mg /= max(gaps.length, 1);
  noStroke(); fill(0, 0, 100); textSize(16);
  text('間隔のヒストグラム（青）と λe^(−λx)（黄）', gx, gy - gh - 34);
  fill(45, 90, 100); text('平均の間隔 ' + nf(mg, 1, 3) + '（理論 1/λ = ' + nf(1 / lambda, 1, 3) + '）', gx, gy - gh - 12);

  // ---- 右：1 単位時間の人数 vs ポアソン分布
  let hx = width * 0.55, hw = width * 0.4;
  let kmax = max(10, ceil(lambda + 4 * sqrt(lambda)));
  let freq = new Array(kmax + 1).fill(0);
  for (let c of counts) if (c <= kmax) freq[c]++;
  let pm = poissonPmf(lambda, kmax);
  let pmax = 0; for (let p of pm) pmax = max(pmax, p); pmax *= 1.3;
  axes(hx, gy, hw, gh, '1 単位時間の人数 k', '0', '' + kmax);
  let cw = hw / (kmax + 1);
  for (let k = 0; k <= kmax; k++) {
    let f = freq[k] / max(counts.length, 1);
    noStroke(); fill(320, 50, 90, 70);
    rect(hx + k * cw + 2, gy - min(f / pmax, 1) * gh, cw - 4, min(f / pmax, 1) * gh);
    fill(45, 90, 100); circle(hx + k * cw + cw / 2, gy - pm[k] / pmax * gh, 10);
  }
  let m = 0, v = 0; for (let c of counts) m += c; m /= max(counts.length, 1);
  for (let c of counts) v += (c - m) * (c - m); v /= max(counts.length - 1, 1);
  noStroke(); fill(0, 0, 100); textSize(16);
  text('人数の頻度（ピンク）とポアソン分布（黄の点）', hx, gy - gh - 34);
  fill(45, 90, 100); text('平均 ' + nf(m, 1, 2) + '　分散 ' + nf(v, 1, 2) + '（理論はどちらも λ = ' + nf(lambda, 1, 1) + '）', hx, gy - gh - 12);

  fill(0, 0, 100); textSize(18);
  text('λ = ' + nf(lambda, 1, 1) + '（←→）　時間 ' + nf(simT, 1, 0) + '　到着 ' + gaps.length + ' 回　区間 ' + counts.length + ' 個　速さ ×' + speed + '（↑↓）　スペース：一時停止　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('間隔は「短いものほど多い」。たくさん集めるほど理論の曲線に近づく。ばらばらに来るように見えて、平均と分散はきちんと λ に従う', 20, 68);
}

function axes(x, y, w, h, lab, a, b) {
  stroke(0, 0, 100, 40); strokeWeight(1); line(x, y, x + w, y); line(x, y, x, y - h);
  noStroke(); fill(0, 0, 60); textSize(13);
  text(a, x - 4, y + 16); textAlign(RIGHT); text(b, x + w, y + 16); textAlign(CENTER); text(lab, x + w / 2, y + 30); textAlign(LEFT);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { lambda = min(8, lambda + 0.5); resetAll(); }
  if (key === LEFT_ARROW) { lambda = max(0.5, lambda - 0.5); resetAll(); }
  if (key === UP_ARROW) speed = min(64, speed * 2);
  if (key === DOWN_ARROW) speed = max(0.25, speed / 2);
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. ↑ で速くして 1000 回分集める。ヒストグラムは曲線にどれくらい近づく？
// 2. λ = 0.5 と 8 で人数の分布の形を比べる。λ が大きいと何の形に近づく？（中心極限定理）
// 3. expRand(lambda) を 1 / lambda（等間隔）に変えると、分散はどうなる？「ランダム」とは何かを考える
// 4. expRand を 2 回足した間隔（λ を 2 倍に）にすると、間隔の分布は指数分布でなくなる（アーラン分布）。形を見る

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
// ポアソン分布 P(k) = e^(−λ) λ^k / k!（k = 0..kmax）
function poissonPmf(lam, kmax) {
  let out = [Math.exp(-lam)];
  for (let k = 1; k <= kmax; k++) out.push(out[k - 1] * lam / k);
  return out;
}
