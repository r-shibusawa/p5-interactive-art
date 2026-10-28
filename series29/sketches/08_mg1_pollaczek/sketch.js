// ============================================
// 08 M/G/1 とポラチェック＝ヒンチンの公式
// サービス時間の分布 G が何でもいい窓口 1 つの待ち行列。平均はどれも 1 分なのに、ばらつきで待ち時間が変わる
//   Wq = ρ (1 + cs²) / (2(1 − ρ)) × E[S]　　cs² = 分散 / 平均²（ばらつきの大きさ）
//   4 種類の窓口に同じ客を流して比べる。リンドレーの式 W(次) = max(0, W + S − 到着の間隔) で 1 人ずつ計算
// ←→ = ρ / ↑↓ = 1 フレームに計算する人数 / スペース = 一時停止 / R = 測り直す
// ============================================

let rho = 0.8;             // ★ 利用率（平均サービス時間 1 なので λ = ρ）
let perFrame = 400;        // ★ 1 フレームで計算する客の数
let paused = false;
let D = [];                // 4 つの窓口
let nCust = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  let p = 0.5 * (1 + Math.sqrt(3 / 5));   // 超指数分布（cs² = 4）の混ぜる割合
  D = [
    { name: '一定（cs² = 0）', cs2: 0, hue: 330, gen: () => 1 },
    { name: 'アーラン 4 段（cs² = 0.25）', cs2: 0.25, hue: 45, gen: () => { let s = 0; for (let k = 0; k < 4; k++) s += expRand(4); return s; } },
    { name: '指数（cs² = 1）', cs2: 1, hue: 190, gen: () => expRand(1) },
    { name: 'ばらつき大（超指数, cs² = 4）', cs2: 4, hue: 0, gen: () => (Math.random() < p ? expRand(2 * p) : expRand(2 * (1 - p))) },
  ];
  for (let d of D) { d.hist = new Array(30).fill(0); for (let i = 0; i < 20000; i++) { let b = floor(d.gen() / 4 * 30); if (b < 30) d.hist[b]++; } }
  resetSim();
}
function resetSim() { nCust = 0; for (let d of D) { d.W = 0; d.S = d.gen(); d.sumW = 0; d.trace = []; } }
function theoryWq(cs2) { return rho * (1 + cs2) / (2 * (1 - rho)); }

function simulate(n) {
  for (let k = 0; k < n; k++) {
    let a = expRand(rho);                    // 次の客までの間隔（4 つで共通）
    for (let d of D) {
      d.W = Math.max(0, d.W + d.S - a);      // ★ リンドレーの式
      d.S = d.gen();
      d.sumW += d.W;
      if (k % 4 === 0) { d.trace.push(d.W); if (d.trace.length > 300) d.trace.shift(); }
    }
    nCust++;
  }
}

function draw() {
  background(200, 25, 11);
  if (!paused) simulate(perFrame);

  let colW = (width - 80) / 4;
  let wmax = theoryWq(4) * 1.6;
  for (let i = 0; i < 4; i++) {
    let d = D[i], x = 40 + i * colW, w = colW - 30;
    noStroke(); fill(d.hue, 60, 100); textSize(16); text(d.name, x, 112);
    // サービス時間の分布
    let hy = 230, hh = 90, pk = max(...d.hist);
    for (let b = 0; b < 30; b++) { let h = d.hist[b] / pk * hh; fill(d.hue, 50, 85, 70); rect(x + b * w / 30, hy - h, w / 30 - 1, h); }
    fill(0, 0, 60); textSize(11); text('サービス時間 0〜4 分', x, hy + 14);
    // 待ち時間の推移（最近の客）
    let ty = height * 0.5, th = 120;
    stroke(0, 0, 100, 25); strokeWeight(1); line(x, ty, x + w, ty);
    noFill(); stroke(d.hue, 70, 100); strokeWeight(1.2);
    beginShape(); for (let j = 0; j < d.trace.length; j++) vertex(x + j / 300 * w, ty - min(d.trace[j] / (wmax * 2), 1) * th); endShape();
    noStroke(); fill(0, 0, 60); textSize(11); text('最近の客の待ち時間', x, ty + 14);
  }

  // ---- 下左：棒グラフ（測定 vs 理論）
  let bx = 60, by = height - 60, bh = height * 0.28, bw = (width * 0.45) / 4;
  stroke(0, 0, 100, 30); strokeWeight(1); line(bx, by, bx + bw * 4, by);
  for (let i = 0; i < 4; i++) {
    let d = D[i], m = d.sumW / max(nCust, 1), t = theoryWq(d.cs2);
    noStroke(); fill(d.hue, 60, 90); let h = min(m / wmax, 1) * bh; rect(bx + i * bw + 10, by - h, bw - 20, h);
    noFill(); stroke(0, 0, 100); strokeWeight(2); let h2 = min(t / wmax, 1) * bh; line(bx + i * bw + 4, by - h2, bx + (i + 1) * bw - 4, by - h2);
    noStroke(); fill(0, 0, 100); textSize(14); textAlign(CENTER);
    text(nf(m, 1, 2), bx + i * bw + bw / 2, by - h - 8); fill(0, 0, 60); text('理論 ' + nf(t, 1, 2), bx + i * bw + bw / 2, by + 18);
    textAlign(LEFT);
  }
  fill(0, 0, 60); textSize(13); text('平均の待ち時間 Wq：色 = シミュレーション、白線 = P-K 公式', bx, by - bh - 10);

  // ---- 下右：Wq は cs² の 1 次関数
  let px = width * 0.6, py = height - 60, pw = width * 0.34, ph = height * 0.28;
  stroke(0, 0, 100, 30); strokeWeight(1); line(px, py, px + pw, py); line(px, py, px, py - ph);
  stroke(45, 90, 100); strokeWeight(2); line(px, py - theoryWq(0) / wmax * ph, px + pw, py - min(theoryWq(4) / wmax, 1) * ph);
  noStroke();
  for (let d of D) { fill(d.hue, 70, 100); circle(px + d.cs2 / 4 * pw, py - min(d.sumW / max(nCust, 1) / wmax, 1) * ph, 14); }
  fill(0, 0, 60); textSize(13);
  text('横 = cs²（0〜4）、縦 = Wq。ばらつきに比例して待ち時間が増える（直線）', px, py - ph - 10);

  fill(0, 0, 100); textSize(18);
  text('ρ = ' + nf(rho, 1, 2) + '（←→）　計算した客 ' + nCust + ' 人（1 フレーム ' + perFrame + ' 人、↑↓）　スペース：一時停止　R：測り直す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('「いつも 1 分」の窓口は指数分布の半分しか待たせない。ばらつきの大きい窓口では、たまに来る長い客の後ろに行列ができる（右上のトゲ）', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { rho = min(0.95, rho + 0.05); resetSim(); }
  if (key === LEFT_ARROW) { rho = max(0.1, rho - 0.05); resetSim(); }
  if (key === UP_ARROW) perFrame = min(4000, perFrame * 2);
  if (key === DOWN_ARROW) perFrame = max(1, perFrame / 2);
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') resetSim();
  rho = round(rho * 100) / 100;
}

// ---------- やってみよう ----------
// 1. 4 つの窓口で Wq の比が 1 : 1.25 : 2 : 5 になっていることを確かめる（1 + cs² の比）
// 2. perFrame を 1 にしてゆっくり見る。ばらつき大の窓口で長い待ちが「まとまって」起きるのはなぜ？
// 3. ρ = 0.95 にすると、ばらつき大の窓口はなかなか理論値に落ち着かない。どれくらいの人数が必要？
// 4. 現実の改善：サービス時間の平均を 10% 縮めるのと、ばらつきを半分にするのはどちらが効く？ 式で比べる

// ==================================================
// ここから下は「道具」
// ==================================================
function expRand(rate) { return -Math.log(1 - Math.random()) / rate; }
