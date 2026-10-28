// ============================================
// 09 メタヒューリスティクス ─ 焼きなまし法（シミュレーテッド・アニーリング）
// 2-opt（08）は「良くなる手」しか選ばないので局所最適で止まる。焼きなまし法は、ときどき「悪くなる手」もわざと受け入れる
//   悪くなる量 Δ の手を確率 exp(−Δ / T) で受け入れる。温度 T を少しずつ下げると、最初は大胆に、最後は慎重に探す
// ↑↓ = 冷やす速さ / ←→ = 最初の温度 / スペース = やり直し / H = 温め直す / G = 温度 0（2-opt と同じ）と比べる / クリック = 町を足す / R = 新しい町
// ============================================

let nCities = 80;                      // ★ 町の数
let cities = [], tour = [], bestTour = [];
let T0 = 200;                          // ★ 最初の温度
let cool = 0.999997;                   // ★ 1 回ごとに T にかける数（1 に近いほどゆっくり冷える）
let T, curLen, bestLen;
let itersPerFrame = 3000;              // ★ 1 フレームに試す手の数
let greedy = false;
let logT = [], logCur = [], logBest = [], logAcc = [];
let recentD = [];                      // 最近の「悪くなる手」の Δ と受け入れたか
let mapX, mapY, mapW, mapH;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  mapX = 30; mapY = 100; mapW = width * 0.5; mapH = height - 130;
  newCities();
}
function newCities() {
  cities = [];
  for (let i = 0; i < nCities; i++) cities.push({ x: mapX + random(20, mapW - 20), y: mapY + random(20, mapH - 20) });
  restart();
}
function restart() {
  tour = shuffle(cities.map((_, i) => i));
  curLen = tourLen(tour); bestLen = curLen; bestTour = tour.slice();
  T = greedy ? 0 : T0;
  logT = []; logCur = []; logBest = []; logAcc = []; recentD = [];
}
function dd(a, b) { return Math.hypot(cities[a].x - cities[b].x, cities[a].y - cities[b].y); }
function tourLen(t) { let s = 0; for (let i = 0; i < t.length; i++) s += dd(t[i], t[(i + 1) % t.length]); return s; }

// ★ 焼きなまし法の 1 手：ランダムな 2-opt の手を試す
function annealStep() {
  let n = tour.length;
  let i = floor(random(n)), j = floor(random(n));
  if (i > j) [i, j] = [j, i];
  if (j - i < 2 || (i === 0 && j === n - 1)) return 0;
  let a = tour[i], b = tour[i + 1], c = tour[j], e = tour[(j + 1) % n];
  let delta = dd(a, c) + dd(b, e) - dd(a, b) - dd(c, e);
  let accept = delta < 0 || (T > 1e-9 && random() < Math.exp(-delta / T));   // ★ 受け入れの確率
  if (delta > 0 && recentD.length < 400 && random() < 0.05) recentD.push({ delta, accept });
  if (accept) {
    for (let p = i + 1, q = j; p < q; p++, q--) [tour[p], tour[q]] = [tour[q], tour[p]];
    curLen += delta;
    if (curLen < bestLen - 1e-9) { bestLen = curLen; bestTour = tour.slice(); }
    return delta > 0 ? 1 : 0;
  }
  return 0;
}

function draw() {
  background(225, 30, 12);
  let uphill = 0;
  if (cities.length >= 5) {
    for (let k = 0; k < itersPerFrame; k++) { uphill += annealStep(); T *= cool; }
    if (T < 0.01) T = 0;
  }
  logT.push(T); logCur.push(curLen); logBest.push(bestLen); logAcc.push(uphill / itersPerFrame);
  for (let L of [logT, logCur, logBest, logAcc]) if (L.length > 500) L.shift();
  if (recentD.length > 300) recentD.splice(0, recentD.length - 300);

  // 地図：今の道（薄い）と最良の道
  noFill(); stroke(0, 0, 100, 15); strokeWeight(1); rect(mapX, mapY, mapW, mapH, 8);
  stroke(30, 70, 100, 35); strokeWeight(1.5);
  beginShape(); for (let i of tour) vertex(cities[i].x, cities[i].y); endShape(CLOSE);
  stroke(50, 90, 100); strokeWeight(2.5);
  beginShape(); for (let i of bestTour) vertex(cities[i].x, cities[i].y); endShape(CLOSE);
  noStroke(); fill(0, 0, 100);
  for (let c of cities) circle(c.x, c.y, 8);

  // 右：グラフ
  let gx = mapX + mapW + 50, gw = width - gx - 30;
  let gh = (height - 200) / 3 - 30;
  plotSeries(logT, gx, 110, gw, gh, T0, color(0, 75, 100), '温度 T = ' + nf(T, 1, 2));
  let hi = max(logCur), lo = min(logBest) * 0.95;
  plotSeries(logCur.map(v => v - lo), gx, 110 + gh + 50, gw, gh, hi - lo, color(30, 70, 100), '今の長さ ' + nf(curLen, 1, 0));
  plotSeries(logBest.map(v => v - lo), gx, 110 + gh + 50, gw, gh, hi - lo, color(50, 90, 100), '');
  fill(50, 90, 100); textSize(14); text('最良の長さ ' + nf(bestLen, 1, 0), gx + 200, 110 + gh + 38);

  // 受け入れ確率 exp(−Δ/T) の曲線と、最近の「悪くなる手」
  let ay = 110 + 2 * (gh + 50), dMax = 200;
  stroke(0, 0, 100, 25); strokeWeight(1); line(gx, ay + gh, gx + gw, ay + gh); line(gx, ay, gx, ay + gh);
  noFill(); stroke(190, 80, 100); strokeWeight(2);
  beginShape(); for (let x = 0; x <= dMax; x += 2) vertex(gx + x / dMax * gw, ay + gh - (T > 1e-9 ? Math.exp(-x / T) : 0) * gh); endShape();
  noStroke();
  for (let r of recentD) { fill(r.accept ? color(140, 80, 100, 70) : color(0, 80, 100, 50)); circle(gx + min(r.delta, dMax) / dMax * gw, ay + gh - (r.accept ? 0.92 : 0.04) * gh, 5); }
  fill(0, 0, 85); textSize(14); text('悪くなる量 Δ → 受け入れる確率 exp(−Δ/T)　緑 = 受け入れた、赤 = 断った', gx, ay - 10);
  fill(0, 0, 60); textSize(12); text('Δ = 0', gx, ay + gh + 14); textAlign(RIGHT); text('Δ = ' + dMax, gx + gw, ay + gh + 14); textAlign(LEFT);

  fill(0, 0, 100); textSize(18);
  text('↑↓ 冷やす速さ ' + cool + '　←→ 最初の温度 ' + T0 + '　スペース：やり直し　H：温め直す　G：温度 0 ' + (greedy ? 'ON' : 'off') + '　クリック：町　R：新しい町', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('悪くなる手の受け入れ率 ' + nf(100 * logAcc[logAcc.length - 1], 1, 2) + '%　　熱いうちはでたらめに動き回り、冷えるにつれて良い道に落ち着く。黄色 = これまでで最良の道', 20, 68);
}

function plotSeries(arr, x, y, w, h, vmax, col, title) {
  stroke(0, 0, 100, 25); strokeWeight(1); line(x, y + h, x + w, y + h); line(x, y, x, y + h);
  noFill(); stroke(col); strokeWeight(2);
  beginShape(); for (let k = 0; k < arr.length; k++) vertex(x + k / 499 * w, y + h - constrain(arr[k] / max(1e-9, vmax), 0, 1) * h); endShape();
  if (title) { noStroke(); fill(col); textSize(14); text(title, x, y - 12); }
}

function mousePressed() {
  if (mouseX > mapX && mouseX < mapX + mapW && mouseY > mapY && mouseY < mapY + mapH) {
    cities.push({ x: mouseX, y: mouseY }); tour.push(cities.length - 1);
    curLen = tourLen(tour); bestTour = tour.slice(); bestLen = curLen;
  }
}
function keyPressed() {
  if (key === UP_ARROW) cool = min(0.9999995, +(cool + (1 - cool) * 0.5).toFixed(8));
  if (key === DOWN_ARROW) cool = max(0.9999, +(1 - (1 - cool) * 2).toFixed(8));
  if (key === RIGHT_ARROW) T0 = min(2000, T0 * 2);
  if (key === LEFT_ARROW) T0 = max(5, T0 / 2);
  if (key === ' ') restart();
  if (key === 'h' || key === 'H') T = T0 * 0.3;
  if (key === 'g' || key === 'G') { greedy = !greedy; restart(); }
  if (key === 'r' || key === 'R') newCities();
}

// ---------- やってみよう ----------
// 1. G（温度 0）と普通の焼きなましで、最後の「最良の長さ」を比べよう。何 % 違う？
// 2. 冷やす速さ（↓）を速くすると（0.9999）すぐ固まる。ゆっくりだと良いが時間がかかる。ちょうどよい速さは？
// 3. 温度が高すぎる・低すぎるとき、右下の緑と赤の点はどう分かれる？
// 4. 手を「2-opt」から「2 つの町を入れかえる」に変えると、成績はどう変わる？（annealStep を書きかえる）
