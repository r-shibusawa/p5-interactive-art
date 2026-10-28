// ============================================
// 10 遺伝的アルゴリズム（GA）─ 予算内で投資プロジェクトを選ぶ
// 30 個のプロジェクトにはそれぞれ費用と効果がある。予算を超えずに効果の合計を最大にする組み合わせは？（2^30 ≒ 10 億通り）
//   1 つの答え = 0/1 の並び（遺伝子）。良い答えほど親に選ばれ、交叉（混ぜる）と突然変異（ときどき反転）で次の世代をつくる
// スペース = 一時停止 / ↑↓ = 突然変異率 / ←→ = 集団の大きさ / C = 交叉 ON/OFF / E = エリート保存 / F = 早送り / R = やり直し / N = 新しい問題
// ============================================

let nItems = 30;                       // ★ プロジェクトの数
let items = [], budget = 0;
let popSize = 60;                      // ★ 集団の大きさ（個体の数）
let mutRate = 0.02;                    // ★ 1 ビットあたりの突然変異率
let useCross = true, elitism = true, fast = false, paused = false;
let popu = [];                         // 個体 { g: [0/1...], fit }
let gen = 0, logBest = [], logMean = [];
let dpBest = 0, greedyBest = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newProblem();
}
function newProblem() {
  items = [];
  for (let i = 0; i < nItems; i++) { let w = floor(random(5, 41)); items.push({ w, v: max(1, floor(w * random(0.5, 1.8) + random(-5, 5))), hue: (i * 137) % 360 }); }   // ★ 費用 w、効果 v
  budget = floor(items.reduce((a, it) => a + it.w, 0) * 0.35);      // ★ 予算 = 費用の合計の 35%
  dpBest = solveDP(); greedyBest = solveGreedy();
  restart();
}
function restart() {
  popu = [];
  for (let k = 0; k < popSize; k++) { let g = items.map(() => random() < 0.3 ? 1 : 0); repair(g); popu.push({ g, fit: fitness(g) }); }
  popu.sort((a, b) => b.fit - a.fit);
  gen = 0; logBest = []; logMean = [];
}
function weightOf(g) { let s = 0; for (let i = 0; i < nItems; i++) if (g[i]) s += items[i].w; return s; }
function fitness(g) { let s = 0; for (let i = 0; i < nItems; i++) if (g[i]) s += items[i].v; return s; }
// ★ 予算オーバーなら、効果 / 費用 が一番悪いものから外す（修復）
function repair(g) {
  while (weightOf(g) > budget) {
    let worst = -1, wr = Infinity;
    for (let i = 0; i < nItems; i++) if (g[i] && items[i].v / items[i].w < wr) { wr = items[i].v / items[i].w; worst = i; }
    g[worst] = 0;
  }
}
// ★ トーナメント選択：ランダムに 3 個体を選んで一番良いものを親に
function pickParent() {
  let best = null;
  for (let k = 0; k < 3; k++) { let c = popu[floor(random(popu.length))]; if (!best || c.fit > best.fit) best = c; }
  return best.g;
}
// ★ 1 世代すすめる
function nextGeneration() {
  let next = [];
  if (elitism) next.push({ g: popu[0].g.slice(), fit: popu[0].fit });
  while (next.length < popSize) {
    let p1 = pickParent(), p2 = pickParent(), child;
    if (useCross) { let cut = floor(random(1, nItems)); child = p1.slice(0, cut).concat(p2.slice(cut)); }   // 一点交叉
    else child = p1.slice();
    for (let i = 0; i < nItems; i++) if (random() < mutRate) child[i] = 1 - child[i];                       // 突然変異
    repair(child);
    next.push({ g: child, fit: fitness(child) });
  }
  popu = next.sort((a, b) => b.fit - a.fit);
  gen++;
  logBest.push(popu[0].fit); logMean.push(popu.reduce((a, p) => a + p.fit, 0) / popu.length);
  if (logBest.length > 600) { logBest.shift(); logMean.shift(); }
}

function draw() {
  background(225, 30, 12);
  if (!paused) for (let k = 0; k < (fast ? 10 : 1); k++) nextGeneration();

  // 左：集団（行 = 個体、上ほど良い。列 = プロジェクト）
  let gx = 40, gy = 110, gw = width * 0.42, gh = height - 260;
  let cw = gw / nItems, rh = gh / popSize;
  noStroke();
  for (let r = 0; r < popu.length; r++) for (let i = 0; i < nItems; i++) {
    fill(popu[r].g[i] ? color(items[i].hue, 60, 90) : color(225, 25, 20));
    rect(gx + i * cw, gy + r * rh, cw - 1, max(1, rh - (rh > 4 ? 1 : 0)));
  }
  fill(0, 0, 70); textSize(13); text('集団 ' + popSize + ' 個体（上ほど効果が大きい）。色 = 選んだプロジェクト', gx, gy - 12);
  // 列ごとの「選ばれている割合」（多様性が消えると 0% か 100% に固まる）
  let div = 0;
  for (let i = 0; i < nItems; i++) {
    let f = popu.reduce((a, p) => a + p.g[i], 0) / popu.length;
    div += f * (1 - f) * 4 / nItems;
    fill(items[i].hue, 60, 90); rect(gx + i * cw, gy + gh + 10 + (1 - f) * 40, cw - 1, f * 40);
  }
  fill(0, 0, 60); textSize(12); text('各プロジェクトが選ばれている割合　多様性 ' + nf(div, 1, 2) + '（0 = 全員同じ）', gx, gy + gh + 68);
  // 一番良い個体
  let best = popu[0];
  fill(0, 0, 85); textSize(13);
  text('最良：効果 ' + best.fit + '　費用 ' + weightOf(best.g) + ' / 予算 ' + budget, gx, gy + gh + 92);

  // 右：成績のグラフ
  let px = gx + gw + 60, pw = width - px - 40, py = 120, ph = height * 0.42;
  let vmax = dpBest * 1.05, vmin = dpBest * 0.5;
  let Y = v => py + ph - constrain((v - vmin) / (vmax - vmin), 0, 1) * ph;
  stroke(0, 0, 100, 25); strokeWeight(1); line(px, py + ph, px + pw, py + ph); line(px, py, px, py + ph);
  stroke(140, 80, 100); drawingContext.setLineDash([6, 5]); line(px, Y(dpBest), px + pw, Y(dpBest));
  stroke(30, 70, 100); line(px, Y(greedyBest), px + pw, Y(greedyBest)); drawingContext.setLineDash([]);
  noFill(); stroke(200, 50, 80); strokeWeight(1.5);
  if (logMean.length > 1) { beginShape(); for (let k = 0; k < logMean.length; k++) vertex(px + k / 599 * pw, Y(logMean[k])); endShape(); }
  stroke(50, 90, 100); strokeWeight(2.5);
  if (logBest.length > 1) { beginShape(); for (let k = 0; k < logBest.length; k++) vertex(px + k / 599 * pw, Y(logBest[k])); endShape(); }
  noStroke(); textSize(13);
  fill(140, 80, 100); text('本当の最適（動的計画法）' + dpBest, px + pw - 220, Y(dpBest) - 6);
  fill(30, 70, 100); text('貪欲法（効果/費用の順）' + greedyBest, px + pw - 220, Y(greedyBest) + 16);
  fill(50, 90, 100); text('最良 ' + best.fit, px + 6, py - 8);
  fill(200, 50, 80); text('平均', px + 90, py - 8);

  // 説明
  let ty = py + ph + 50;
  fill(0, 0, 85); textSize(15);
  let lines = [
    '世代 ' + gen + '　最良 ' + best.fit + ' / 最適 ' + dpBest + '（' + nf(100 * best.fit / dpBest, 1, 1) + '%）' + (best.fit === dpBest ? '　✓ 最適に到達' : ''),
    '突然変異率 ' + nf(mutRate, 1, 3) + '（1 個体あたり平均 ' + nf(mutRate * nItems, 1, 1) + ' ビット反転）',
    '交叉 ' + (useCross ? 'ON（親 2 人の遺伝子を一点で切ってつなぐ）' : 'OFF（親のコピー + 突然変異だけ）'),
    'エリート保存 ' + (elitism ? 'ON（最良の個体はそのまま次へ）' : 'OFF（最良でも消えることがある）'),
    '',
    '突然変異が少ない → すぐ全員同じになって止まる（早すぎる収束）',
    '突然変異が多い → でたらめ探索に近くなる',
  ];
  lines.forEach((s, i) => text(s, px, ty + i * 24));

  fill(0, 0, 100); textSize(18);
  text('スペース：' + (paused ? '再開' : '一時停止') + '　↑↓ 突然変異率　←→ 集団 ' + popSize + '　C：交叉 ' + (useCross ? 'ON' : 'off') + '　E：エリート ' + (elitism ? 'ON' : 'off') + '　F：早送り ' + (fast ? 'ON' : 'off') + '　R：やり直し　N：新しい問題', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('予算 ' + budget + ' の中で、効果の合計を最大に。GA は最適を保証しないが、問題の中身を知らなくても使える', 20, 68);
}

function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) mutRate = min(0.3, mutRate * 1.5);
  if (key === DOWN_ARROW) mutRate = max(0.001, mutRate / 1.5);
  if (key === RIGHT_ARROW) { popSize = min(200, popSize + 20); restart(); }
  if (key === LEFT_ARROW) { popSize = max(10, popSize - 10); restart(); }
  if (key === 'c' || key === 'C') useCross = !useCross;
  if (key === 'e' || key === 'E') elitism = !elitism;
  if (key === 'f' || key === 'F') fast = !fast;
  if (key === 'r' || key === 'R') restart();
  if (key === 'n' || key === 'N') newProblem();
}

// ---------- やってみよう ----------
// 1. 突然変異率を 0.001 と 0.2 にして、多様性と最良の伸び方を比べよう
// 2. 交叉 OFF だと最適に届くまでの世代はどう変わる？ 交叉は何の役に立っている？
// 3. エリート保存 OFF だと最良の線がギザギザになる。なぜ？
// 4. 修復（repair）をやめて、予算オーバーの個体の効果を 0 にする（罰金）方式に変えるとどうなる？


// ==================================================
// ここから下は「答え合わせの道具」（動的計画法・貪欲法 → シリーズ 12）
// ==================================================
function solveDP() {
  let best = new Array(budget + 1).fill(0);
  for (let it of items) for (let c = budget; c >= it.w; c--) best[c] = Math.max(best[c], best[c - it.w] + it.v);
  return best[budget];
}
function solveGreedy() {
  let idx = items.map((_, i) => i).sort((a, b) => items[b].v / items[b].w - items[a].v / items[a].w);
  let w = 0, v = 0;
  for (let i of idx) if (w + items[i].w <= budget) { w += items[i].w; v += items[i].v; }
  return v;
}
