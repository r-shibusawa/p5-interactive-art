// ============================================
// 10 木の高さとランダムな順番
// 二分探索木の操作はすべて O(高さ)。同じ n 個のキーでも、入れる順番で高さが大きく変わる
// ランダムな順番で入れた木の高さの期待値は O(log n)。小さい順に入れると高さ n（ただの 1 列）
// 操作：1 = ランダムな順 / 2 = 小さい順 / 3 = ほぼ小さい順（少しだけ入れかえ）/ ↑↓ = n / スペース = 一時停止 / C = 記録を消す
// ============================================

let n = 63;            // ★ キーの個数
let msPerFrame = 8;     // ★ 1 フレームで実験に使う時間（ミリ秒）
let mode = 1, paused = false;
let hist = {}, trials = 0, sumH = 0, sample = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
}
function makeOrder() {
  let a = []; for (let i = 1; i <= n; i++) a.push(i);
  if (mode === 1) shuffle(a, true);
  if (mode === 3) for (let s = 0; s < n / 10; s++) { let i = floor(random(n)), j = floor(random(n)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function build(order) {
  let root = null, height = 0;
  for (let k of order) {
    let z = { key: k, left: null, right: null }, x = root, y = null, d = 1;
    while (x) { y = x; x = k < x.key ? x.left : x.right; d++; }
    if (!y) root = z; else if (k < y.key) y.left = z; else y.right = z;
    height = max(height, d);
  }
  return { root, height };
}

function draw() {
  background(14, 18, 22);
  let t0 = millis(), t = 0;
  while (!paused && (t === 0 || millis() - t0 < msPerFrame)) {
    let r = build(makeOrder());
    hist[r.height] = (hist[r.height] || 0) + 1; trials++; sumH += r.height;
    if (t === 0 && (frameCount % 30 === 1 || !sample)) sample = r;
    t++;
  }
  noStroke(); fill(240); textAlign(LEFT, TOP); textSize(26);
  text('入れる順番と木の高さ', 30, 24);
  fill(150, 175, 190); textSize(15);
  text('1 = ランダムな順　2 = 小さい順　3 = ほぼ小さい順　↑↓ = n　スペース = 一時停止　C = 記録を消す', 30, 60);
  fill(255); textSize(19);
  text(`n = ${n}　順番：${['', 'ランダム', '小さい順', 'ほぼ小さい順'][mode]}　実験 ${trials} 回　平均の高さ ${trials ? nf(sumH / trials, 1, 2) : '-'}　（log₂ n = ${nf(Math.log2(n), 1, 2)}、最小の高さ ⌈log₂(n+1)⌉ = ${ceil(Math.log2(n + 1))}）`, 30, 90);

  // 見本の木
  if (sample) {
    let pos = {}, i = 0, maxD = 0;
    (function lay(x, d) { if (!x) return; lay(x.left, d + 1); pos[x.key] = [i++, d]; maxD = max(maxD, d); lay(x.right, d + 1); })(sample.root, 0);
    let W = width * 0.55, H = height - 300, gap = min(40, H / (maxD + 1));
    let P = (k) => [40 + ((pos[k][0] + 0.5) / n) * W, 150 + pos[k][1] * gap];
    stroke(90, 150, 170); strokeWeight(1.5);
    (function ed(x) { if (!x) return; for (let c of [x.left, x.right]) if (c) { let a = P(x.key), b = P(c.key); line(a[0], a[1], b[0], b[1]); ed(c); } })(sample.root);
    noStroke(); fill(120, 220, 240);
    for (let k in pos) { let p = P(k); circle(p[0], p[1], 7); }
    fill(200); textSize(15); textAlign(LEFT, TOP);
    text(`見本の木（高さ ${sample.height}）`, 40, 128);
  }

  // 高さのヒストグラム
  let gx = width * 0.62, gw = width * 0.34, gy = height - 160, gh = height * 0.45;
  let maxC = max(1, ...Object.values(hist));
  let hMax = max(n, 1);
  let showMax = mode === 2 ? n + 2 : min(n + 2, max(30, ...Object.keys(hist).map(Number)) + 3);
  stroke(80); line(gx, gy, gx + gw, gy);
  noStroke();
  for (let h in hist) {
    let x = gx + (h / showMax) * gw;
    let hh = (hist[h] / maxC) * gh;
    fill(120, 220, 160); rect(x - 3, gy - hh, max(3, gw / showMax - 2), hh);
  }
  stroke(255, 200, 100); strokeWeight(2);
  let lx = gx + (Math.log2(n + 1) / showMax) * gw;
  line(lx, gy, lx, gy - gh);
  noStroke(); fill(255, 200, 100); textSize(13); textAlign(CENTER, TOP);
  text('log₂(n+1)', lx, gy + 18);
  fill(200); textAlign(LEFT, TOP); textSize(15);
  text('高さの分布（横軸 = 高さ 0〜' + showMax + '）', gx, gy - gh - 26);

  fill(255, 225, 140); textSize(18); textAlign(LEFT, TOP);
  text(mode === 2 ? '小さい順に入れると、毎回いちばん右に付くので高さ = n。探索が O(n) に！' :
       mode === 3 ? '少しの入れかえでは、まだかなり高い。実際のデータはこういう「ほぼ整列」が多い' :
       'ランダムな順なら高さはだいたい log₂ n の 2〜3 倍におさまる。でも順番は選べないことが多い → 赤黒木へ', 30, height - 60);
}
function keyPressed() {
  if (key >= '1' && key <= '3') { mode = int(key); resetStats(); }
  if (key === UP_ARROW) { n = min(1023, n * 2 + 1); resetStats(); }
  if (key === DOWN_ARROW) { n = max(3, floor((n - 1) / 2)); resetStats(); }
  if (key === ' ') paused = !paused;
  if (key.toLowerCase() === 'c') resetStats();
}
function resetStats() { hist = {}; trials = 0; sumH = 0; sample = null; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. ↑ で n = 1023 にする。ランダムなら高さは 20〜25 くらい。小さい順だと 1023！
// 2. 3（ほぼ小さい順）で入れかえの回数（n / 10）を変えてみよう
// 3. 「どんな順番でも高さ O(log n)」を保証するのが 11・12 の赤黒木
