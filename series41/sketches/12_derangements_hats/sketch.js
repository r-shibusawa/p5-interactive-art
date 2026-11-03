// ============================================
// 12 帽子問題と確率
// n 人が帽子を預け、ランダムに返されたとき「誰も自分の帽子を受け取らない」確率は？
// 何万回も試して数える（シミュレーション）と、理論値 D_n/n! に近づき、n が大きいと 1/e ≈ 0.3679 に
// ↑↓ = 人数 n（2〜10）/ スペース = 一時停止 / R = やり直し / マウス左右 = 1 フレームの試行回数
// ============================================

let n = 5;                     // ★ 人数
let trials = 0, successes = 0; // 試行回数、誰も自分の帽子でなかった回数
let fixedHist = [];            // 「自分の帽子だった人数」の分布
let paused = false;
let series = [];               // 推定値の推移（グラフ用）
let shown = [];                // 画面に描く 1 回ぶんの配り方
let showTimer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  trials = 0; successes = 0; series = [];
  fixedHist = new Array(n + 1).fill(0);
  shown = randomPerm(n);
}

// ★ Fisher–Yates：0..k-1 をランダムに並べかえる（どの順列も同じ確率）
function randomPerm(k) {
  let p = [];
  for (let i = 0; i < k; i++) p.push(i);
  for (let i = k - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}

function derangements(k) { let d = [1, 0]; for (let i = 2; i <= k; i++) d.push((i - 1) * (d[i - 1] + d[i - 2])); return d[k]; }
function factorial(k) { let f = 1; for (let i = 2; i <= k; i++) f *= i; return f; }

function draw() {
  background(226, 28, 11);
  let perFrame = Math.round(map(mouseX, 0, width, 1, 400, true));
  if (!paused) {
    for (let t = 0; t < perFrame; t++) {
      let p = randomPerm(n);
      let fixed = 0;
      for (let i = 0; i < n; i++) if (p[i] === i) fixed++;
      fixedHist[fixed]++;
      trials++;
      if (fixed === 0) successes++;
    }
    if (trials > 0 && frameCount % 2 === 0) { series.push(successes / trials); if (series.length > 400) series.shift(); }
    showTimer += deltaTime / 1000;
    if (showTimer > 0.6) { showTimer = 0; shown = randomPerm(n); }
  }
  let est = trials > 0 ? successes / trials : 0;
  let theory = derangements(n) / factorial(n);

  // 左上：1 回ぶんの配り方（人 i → 帽子 shown[i]）
  let hx = 60, hy = 150, gap = Math.min(80, (width * 0.45) / n);
  for (let i = 0; i < n; i++) {
    let x = hx + i * gap;
    // 帽子（上）と人（下）
    noStroke(); fill((i * 360) / n, 60, 95);
    arc(x, hy, 40, 30, PI, TWO_PI);
    rect(x - 26, hy - 2, 52, 6, 3);
    fill(0, 0, 100); textAlign(CENTER, BASELINE); textSize(12); text('帽子 ' + (i + 1), x, hy + 24);
    let own = shown[i] === i;
    fill(own ? 20 : 0, own ? 80 : 0, own ? 100 : 80); circle(x, hy + 150, 30);
    fill(0, 0, 100); text('人 ' + (i + 1), x, hy + 185);
  }
  // 線：人 i が受け取った帽子 shown[i]
  for (let i = 0; i < n; i++) {
    let x1 = hx + shown[i] * gap, x2 = hx + i * gap;
    let own = shown[i] === i;
    stroke(own ? 20 : 180, 80, 100, own ? 100 : 60); strokeWeight(own ? 4 : 2);
    line(x1, hy + 8, x2, hy + 134);
  }
  textAlign(LEFT, BASELINE);
  let fixedNow = shown.filter((v, i) => v === i).length;
  noStroke(); fill(fixedNow === 0 ? 130 : 20, 80, 100); textSize(16);
  text(fixedNow === 0 ? '誰も自分の帽子でない（攪乱順列！）' : '自分の帽子の人：' + fixedNow + ' 人（オレンジ）', hx - 20, hy + 220);

  // 右上：数値
  let px = width * 0.55, py = 130;
  fill(0, 0, 100); textSize(16);
  text('試行 ' + trials.toLocaleString() + ' 回（1 フレーム ' + perFrame + ' 回：マウス左右）', px, py);
  textSize(34); fill(50, 80, 100);
  text('推定 ' + est.toFixed(4), px, py + 50);
  textSize(16); fill(0, 0, 80);
  text('理論値 D_' + n + '/' + n + '! = ' + derangements(n) + '/' + factorial(n) + ' = ' + theory.toFixed(4) + '　　1/e = ' + (1 / Math.E).toFixed(4), px, py + 82);
  text('D_n = (n−1)(D_{n−1} + D_{n−2})　D_n = n! Σ (−1)^k/k!（包除原理）', px, py + 106);

  // 下：推定値の推移（線）
  let gx = 60, gy = height - 60, gw = width * 0.45, gh = 180;
  noStroke(); fill(0, 0, 100, 6); rect(gx, gy - gh, gw, gh);
  stroke(0, 0, 80); strokeWeight(1);
  line(gx, gy - gh * theory / 0.6, gx + gw, gy - gh * theory / 0.6);
  stroke(0, 0, 45); line(gx, gy - gh * (1 / Math.E) / 0.6, gx + gw, gy - gh * (1 / Math.E) / 0.6);
  stroke(50, 80, 100); strokeWeight(2); noFill();
  beginShape();
  for (let i = 0; i < series.length; i++) vertex(gx + (i / 400) * gw, gy - gh * Math.min(0.6, series[i]) / 0.6);
  endShape();
  noStroke(); fill(0, 0, 70); textSize(12);
  text('推定値の推移（0〜0.6）　白線 = 理論値、灰線 = 1/e', gx, gy - gh - 8);

  // 右下：自分の帽子だった人数の分布（ポアソン分布 λ=1 に近づく）
  let bx = width * 0.55, by = height - 60, bw = (width * 0.4) / (n + 1), bh = 180;
  let maxH = Math.max(1, ...fixedHist);
  for (let k = 0; k <= n; k++) {
    let hgt = (fixedHist[k] / Math.max(1, trials)) * bh / 0.5;
    noStroke(); fill(k === 0 ? 130 : 200, 70, 95);
    rect(bx + k * bw + 3, by - Math.min(bh, hgt), bw - 6, Math.min(bh, hgt));
    fill(0, 0, 80); textAlign(CENTER, BASELINE); textSize(12);
    text(k, bx + k * bw + bw / 2, by + 16);
    if (trials > 0) text((fixedHist[k] / trials).toFixed(3), bx + k * bw + bw / 2, by - Math.min(bh, hgt) - 4);
  }
  textAlign(LEFT, BASELINE);
  fill(0, 0, 70); textSize(12);
  text('自分の帽子だった人数の分布（n が大きいと e^{-1}/k!：0.368, 0.368, 0.184, 0.061, …）', bx, by - bh - 8);

  fill(0, 0, 100); textSize(18);
  text('n = ' + n + '（↑↓）　スペース：' + (paused ? '再開' : '一時停止') + '　R：やり直し', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('n! 通りの配り方のうち、誰も自分の帽子でないのが D_n 通り。n = 2 で 1/2、n = 3 で 1/3、n = 4 で 3/8、…と 1/e に近づく', 20, 68);
}

function keyPressed() {
  if (key === UP_ARROW && n < 10) { n++; reset(); }
  if (key === DOWN_ARROW && n > 2) { n--; reset(); }
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. n = 2, 3, 4 で推定値が 0.5, 0.333, 0.375 に落ち着くのを見る。n = 4 で 1/e との差はもうわずか
// 2. 「ちょうど 1 人だけ自分の帽子」の確率は？ 分布の棒 1 を読む（n 大で 1/e と同じ！）
// 3. 試行を 10 万回まで増やしたとき、推定値のふらつき幅はどれくらい？（√(p(1−p)/N) が目安）
// 4. 帽子が「2 つ入れかわっただけ」（2 人だけ交換、あとは自分の）になる確率は C(n,2)/n!。数えて確かめよう
