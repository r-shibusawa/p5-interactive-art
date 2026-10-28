// ============================================
// 02 無記憶性
// 窓口で前の人がすでに t 分サービスを受けている。あと何分かかる？
//   平均 1 分の 3 種類のサービス時間で比べる：指数分布（無記憶）・一様分布 0〜2 分・いつもちょうど 1 分
//   指数分布だけは「もう t 分たった」ことを忘れる → 残り時間の分布が最初とまったく同じ
// ←→ = すでに経った時間 t / A = t を自動で動かす / N = サンプルを取り直す
// ============================================

let tWait = 0.5;           // ★ すでに経った時間
let nSamp = 30000;         // ★ 各分布のサンプル数
let nBars = 36;            // 上に描く棒（サンプル）の数
let auto = false;
let dists = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resample();
}
function resample() {
  dists = [
    { name: '指数分布（平均 1）', hue: 190, gen: () => -Math.log(1 - Math.random()), resid: (t) => 1 },
    { name: '一様分布 0〜2', hue: 45, gen: () => 2 * Math.random(), resid: (t) => (t < 2 ? (2 - t) / 2 : NaN) },
    { name: 'いつも 1 分', hue: 330, gen: () => 1, resid: (t) => (t < 1 ? 1 - t : NaN) },
  ];
  for (let d of dists) { d.xs = []; for (let i = 0; i < nSamp; i++) d.xs.push(d.gen()); }
}

function draw() {
  background(170, 25, 11);
  if (auto) tWait = (tWait + 0.004) % 2;
  let cw = (width - 80) / 3;
  for (let k = 0; k < 3; k++) drawColumn(dists[k], 40 + k * cw, cw - 30);
  drawResidPlot(40, height - 30, width - 80, height * 0.15);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('すでに経った時間 t = ' + nf(tWait, 1, 2) + ' 分（←→）　A：自動 ' + (auto ? 'ON' : 'off') + '　N：取り直す　　上：サンプルの棒（灰 = もう終わった）　中：残り時間の分布', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('白い枠 = t = 0 のとき（最初）の分布。色の棒 = 「t 分たってまだ終わっていない人」の残り時間。指数分布だけ、枠と色がぴったり重なる', 20, 68);
}

function drawColumn(d, x, w) {
  // ---- サンプルの棒：長さ = サービス時間、縦線 = t
  let top = 100, rowH = (height * 0.28) / nBars, sx = w / 3;   // 横 1 分 = w/3 px
  noStroke(); fill(d.hue, 60, 100); textSize(17); text(d.name, x, top - 6);
  for (let i = 0; i < nBars; i++) {
    let v = d.xs[i], y = top + 6 + i * rowH;
    if (v <= tWait) { fill(0, 0, 40); rect(x, y, min(v, 3) * sx, rowH - 2); }
    else { fill(0, 0, 55); rect(x, y, tWait * sx, rowH - 2); fill(d.hue, 70, 95); rect(x + tWait * sx, y, min(v - tWait, 3 - tWait) * sx, rowH - 2); }
  }
  stroke(0, 0, 100); strokeWeight(2); let lx = x + tWait * sx; line(lx, top, lx, top + 10 + nBars * rowH);

  // ---- 残り時間 X − t（X > t の人だけ）のヒストグラム
  let gy = height * 0.72, gh = height * 0.17, nb = 24, bw = 3 / nb;
  let b0 = new Array(nb).fill(0), b1 = new Array(nb).fill(0), alive = 0, sumR = 0;
  for (let v of d.xs) {
    let i0 = floor(v / bw); if (i0 < nb) b0[i0]++;
    if (v > tWait) { alive++; sumR += v - tWait; let i1 = floor((v - tWait) / bw); if (i1 < nb) b1[i1]++; }
  }
  let peak = 0; for (let i = 0; i < nb; i++) peak = max(peak, b0[i] / nSamp, alive ? b1[i] / alive : 0);
  peak = max(peak, 1e-6) * 1.1;
  stroke(0, 0, 100, 40); strokeWeight(1); line(x, gy, x + w, gy);
  noStroke();
  for (let i = 0; i < nb; i++) {
    let h = alive ? (b1[i] / alive) / peak * gh : 0;
    fill(d.hue, 60, 90, 75); rect(x + i * w / nb + 1, gy - h, w / nb - 2, h);
  }
  noFill(); stroke(0, 0, 100); strokeWeight(2);
  beginShape();
  for (let i = 0; i < nb; i++) { let h = (b0[i] / nSamp) / peak * gh; vertex(x + i * w / nb, gy - h); vertex(x + (i + 1) * w / nb, gy - h); }
  endShape();
  noStroke(); fill(0, 0, 60); textSize(12);
  text('0', x, gy + 14); textAlign(RIGHT); text('3 分', x + w, gy + 14); textAlign(LEFT);
  fill(0, 0, 100); textSize(15);
  let pAlive = alive / nSamp;
  text('まだ終わっていない ' + nf(pAlive * 100, 1, 1) + '%', x, gy - gh - 30);
  text(alive ? '残り時間の平均 ' + nf(sumR / alive, 1, 3) + ' 分' : '全員もう終わっている', x, gy - gh - 10);
}

// ---- 下：残り時間の平均 E[X − t | X > t] を t の関数として
function drawResidPlot(x, y, w, h) {
  stroke(0, 0, 100, 40); strokeWeight(1); line(x, y, x + w, y); line(x, y, x, y - h);
  let X = (t) => x + t / 2 * w, Y = (v) => y - v / 1.2 * h;
  for (let d of dists) {
    noFill(); stroke(d.hue, 70, 100); strokeWeight(3);
    beginShape();
    for (let i = 0; i <= 100; i++) { let t = 2 * i / 100, r = d.resid(t); if (!isNaN(r)) vertex(X(t), Y(r)); }
    endShape();
    let r = d.resid(tWait);
    if (!isNaN(r)) { noStroke(); fill(d.hue, 70, 100); circle(X(tWait), Y(r), 12); }
  }
  stroke(0, 0, 100, 60); line(X(tWait), y, X(tWait), y - h);
  noStroke(); fill(0, 0, 60); textSize(13);
  text('残り時間の平均（縦）と経った時間 t（横、0〜2 分）。指数分布は水平：何分待っても「あと平均 1 分」', x + 8, y - h - 6);
}

function keyPressed() {
  if (key === RIGHT_ARROW) tWait = min(1.95, tWait + 0.05);
  if (key === LEFT_ARROW) tWait = max(0, tWait - 0.05);
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'n' || key === 'N') resample();
}

// ---------- やってみよう ----------
// 1. t を 0 → 1.5 に動かす。一様分布の「残り」はどう縮む？「いつも 1 分」は？
// 2. 指数分布は「もう 1 分待ったのに、まだ平均 1 分」。これを電話のサポート待ちに当てはめるとどんな気持ち？
// 3. gen を「2 つの指数分布の足し算 / 2」（アーラン分布）にすると、指数と一様の中間になるか試す
// 4. 平均 0.2 分と平均 5 分の混ぜ合わせ（超指数分布）だと、待つほど残りが「長く」なる。gen を書き換えて確かめる
