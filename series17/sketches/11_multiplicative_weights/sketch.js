// ============================================
// 11 乗算型重み更新法（重みつき多数決）
// 8 人の「専門家」が毎日、明日の天気（晴れ / 雨）を予想する。誰が当たるかは最初わからない
// アルゴリズム：重みの合計が大きい方の意見に従う。はずれた専門家の重みを (1 − ε) 倍にする
// これだけで、自分のまちがいは「いちばん優秀な専門家のまちがい」の約 2 倍 + 定数におさまる
//   まちがい ≤ 2(1 + ε)·m* + 2 ln n / ε  （m* = 最優秀の専門家のまちがい数）
// 操作：スペース = 再生・停止 / → = 1 日進める / ↑↓ = ε を変える / R = やり直し
//       1〜3 = お手本（名人が 1 人・名人が途中で交代・全員でたらめ）
// ============================================

let n = 8;
let eps = 0.25;         // ★ はずれたときに重みを減らす割合
let acc = [];           // 各専門家が当たる確率
let w = [], mistakes = [], algMistakes = 0, day = 0;
let histAlg = [], histBest = [], histBound = [];
let lastPred = [], lastTruth = 0, lastAlg = 0;
let scenario = 1;
let auto = true, speed = 6;
const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('sans-serif');
  reset(1);
}

function reset(k) {
  scenario = k;
  acc = [0.55, 0.6, 0.5, 0.62, 0.58, 0.52, 0.9, 0.5];   // G が名人
  if (k === 3) acc = acc.map(() => 0.5);
  w = new Array(n).fill(1); mistakes = new Array(n).fill(0);
  algMistakes = 0; day = 0; histAlg = []; histBest = []; histBound = []; lastPred = [];
}

// ★ 1 日ぶん
function oneDay() {
  if (scenario === 2 && day === 150) { acc[6] = 0.45; acc[1] = 0.92; }   // 名人が交代する
  let truth = random() < 0.5 ? 1 : 0;                     // 1 = 雨、0 = 晴れ
  let pred = acc.map((a) => (random() < a ? truth : 1 - truth));
  // 重みつき多数決
  let wRain = 0, wSun = 0;
  pred.forEach((p, i) => (p ? (wRain += w[i]) : (wSun += w[i])));
  let alg = wRain >= wSun ? 1 : 0;
  if (alg !== truth) algMistakes++;
  // はずれた専門家の重みを (1 − ε) 倍
  pred.forEach((p, i) => { if (p !== truth) { mistakes[i]++; w[i] *= 1 - eps; } });
  let mx = max(w); if (mx < 1e-100) w = w.map((v) => v * 1e100);   // 小さくなりすぎないように（比は同じ）
  day++;
  let best = min(mistakes);
  histAlg.push(algMistakes); histBest.push(best);
  histBound.push(2 * (1 + eps) * best + (2 * Math.log(n)) / eps);
  lastPred = pred; lastTruth = truth; lastAlg = alg;
  if (histAlg.length > 600) { histAlg.shift(); histBest.shift(); histBound.shift(); }
}

function draw() {
  background(BG);
  if (auto && frameCount % speed === 0) oneDay();

  noStroke(); fill(FG); textAlign(LEFT, TOP); textSize(22);
  text('乗算型重み更新法  はずれた人の発言力を少しずつ下げる', 30, 24);
  fill(DIM); textSize(14);
  text(`スペース 再生/停止   → 1 日進める   ↑↓ ε = ${eps.toFixed(2)}   R やり直し   1 名人が 1 人  2 名人が交代  3 全員でたらめ`, 30, 56);

  // 専門家の重み
  let total = w.reduce((a, b) => a + b, 0);
  let x0 = 30, y0 = 100, rowH = min(46, (height * 0.56 - 100) / n), barW = width * 0.36;
  for (let i = 0; i < n; i++) {
    let y = y0 + i * rowH;
    let share = w[i] / total;
    fill(PANEL); rect(x0 + 60, y, barW, rowH - 8, 6);
    fill(lastPred.length && lastPred[i] !== lastTruth ? BAD : MINT);
    rect(x0 + 60, y, max(2, share * barW), rowH - 8, 6);
    fill(FG); textSize(18); textAlign(LEFT, CENTER); text(names[i], x0 + 10, y + rowH / 2 - 4);
    textSize(14); fill(DIM);
    text(lastPred.length ? (lastPred[i] ? '☂' : '☀') : '', x0 + 36, y + rowH / 2 - 4);
    text(`${(share * 100).toFixed(1)}%   はずれ ${mistakes[i]}   (当たる確率 ${round(acc[i] * 100)}%)`, x0 + 70 + barW, y + rowH / 2 - 4);
  }
  // 今日の結果
  let ry = y0 + n * rowH + 6;
  textAlign(LEFT, TOP); textSize(18);
  fill(FG); text(`${day} 日目   本当の天気：${lastPred.length ? (lastTruth ? '☂ 雨' : '☀ 晴れ') : '—'}   アルゴリズムの予想：${lastPred.length ? (lastAlg ? '☂ 雨' : '☀ 晴れ') : '—'}`, x0, ry);
  fill(lastPred.length && lastAlg === lastTruth ? MINT : BAD);
  if (lastPred.length) text(lastAlg === lastTruth ? '当たり' : 'はずれ', x0 + 620, ry);

  // まちがい数のグラフ
  let gx = 30, gy = ry + 36, gw = width - 60, gh = height - gy - 16;
  fill(PANEL); rect(gx, gy, gw, gh, 10);
  let mx = max(1, ...histBound.slice(-1), ...histAlg.slice(-1));
  let plot = (arr, col, dash) => {
    noFill(); stroke(col); strokeWeight(2.5);
    if (dash) drawingContext.setLineDash([6, 6]);
    beginShape(); arr.forEach((v, i) => vertex(gx + 10 + (i / 600) * (gw - 20), gy + gh - 10 - (v / mx) * (gh - 30))); endShape();
    drawingContext.setLineDash([]);
  };
  plot(histBound, GOLD, true); plot(histBest, MINT, false); plot(histAlg, ORCHID, false);
  noStroke(); textSize(14); textAlign(LEFT, TOP);
  fill(ORCHID); text(`アルゴリズムのまちがい ${algMistakes}`, gx + 16, gy + 10);
  fill(MINT); text(`最優秀の専門家 m* = ${min(mistakes)}`, gx + 250, gy + 10);
  fill(GOLD); text(`保証：2(1+ε)m* + 2 ln n / ε = ${histBound.length ? histBound[histBound.length - 1].toFixed(1) : '—'}`, gx + 480, gy + 10);
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { oneDay(); return false; }
  if (key === UP_ARROW) { eps = min(0.9, eps + 0.05); return false; }
  if (key === DOWN_ARROW) { eps = max(0.05, eps - 0.05); return false; }
  if (key === 'r' || key === 'R') reset(scenario);
  if ('123'.includes(key)) reset(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
