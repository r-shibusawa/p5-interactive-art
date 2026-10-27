// ============================================
// 07 巡回セールスマンを総当たりで解く
// 都市を全部 1 回ずつ回って戻る、いちばん短い道。都市 n 個で巡回路は (n−1)!/2 通り
// 総当たりは必ず正解。でも 1 都市増えるごとに時間が n 倍に
// H モード：ハミルトン閉路 → TSP の還元。グラフの線は費用 0、線がない所は費用 1 として TSP を解く。最短 0 ⇔ ハミルトン閉路あり
// クリック：都市を追加 / スペース：探索開始・停止 / 上下キー：速さ / R：ランダム / C：消す / H：還元モード切り替え
// ============================================

let cities = [];
let MAX_CITIES = 10;    // ★ これ以上は待ちきれない
let perm = [], best = null, bestLen = Infinity, count = 0, total = 0;
let running = false, done = false, speed = 20;
let hamMode = false, gEdges = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomCities(7);
}

function randomCities(n) {
  cities = [];
  for (let i = 0; i < n; i++) cities.push({ x: random(100, width - 100), y: random(150, height - 80) });
  makeGraph();
  reset();
}
function makeGraph() { // H モード用のグラフ（近い都市どうしをつなぐ）
  gEdges = [];
  let n = cities.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let d = dist(cities[i].x, cities[i].y, cities[j].x, cities[j].y);
    if (d < min(width, height) * 0.38 && random() < 0.75) gEdges.push(i + '-' + j);
  }
}
function hasEdge(a, b) { return gEdges.includes(min(a, b) + '-' + max(a, b)); }
function cost(a, b) { return hamMode ? (hasEdge(a, b) ? 0 : 1) : dist(cities[a].x, cities[a].y, cities[b].x, cities[b].y); }
function tourLen(t) { let L = 0; for (let i = 0; i < t.length; i++) L += cost(t[i], t[(i + 1) % t.length]); return L; }

function reset() {
  perm = cities.map((_, i) => i);
  best = null; bestLen = Infinity; count = 0; done = false; running = false;
  total = 1; for (let k = 2; k < cities.length; k++) total *= k; // (n−1)!
}
// 都市 0 を固定し、残りを辞書順に並べかえる
function nextPerm(a) {
  let i = a.length - 2;
  while (i >= 1 && a[i] >= a[i + 1]) i--;
  if (i < 1) return false;
  let j = a.length - 1;
  while (a[j] <= a[i]) j--;
  [a[i], a[j]] = [a[j], a[i]];
  for (let l = i + 1, r = a.length - 1; l < r; l++, r--) [a[l], a[r]] = [a[r], a[l]];
  return true;
}

function draw() {
  background(30, 30, 9);
  if (running && cities.length >= 3) {
    for (let k = 0; k < speed; k++) {
      let L = tourLen(perm);
      count++;
      if (L < bestLen - 1e-9) { bestLen = L; best = perm.slice(); }
      if (!nextPerm(perm)) { done = true; running = false; break; }
    }
  }
  // H モードのグラフ
  if (hamMode) for (let e of gEdges) {
    let [a, b] = e.split('-').map(Number);
    stroke(120, 50, 70, 60); strokeWeight(3); line(cities[a].x, cities[a].y, cities[b].x, cities[b].y);
  }
  // 今調べている巡回路
  if (running && cities.length >= 3) drawTour(perm, color(0, 0, 100, 25), 1.5);
  if (best) drawTour(best, color(45, 90, 100), 5);
  for (let i = 0; i < cities.length; i++) {
    noStroke(); fill(i === 0 ? color(0, 80, 100) : color(200, 60, 100));
    circle(cities[i].x, cities[i].y, 22);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(12); text(i, cities[i].x, cities[i].y);
  }

  textAlign(LEFT, BASELINE); fill(0, 0, 100); noStroke(); textSize(18);
  text('クリック：都市を追加　スペース：探索　上下：速さ　R：ランダム　C：消す　H：ハミルトン閉路→TSP モード', 20, 34);
  textSize(20); fill(45, 80, 100);
  let n = cities.length;
  text('都市 ' + n + ' 個　調べた巡回路 ' + count.toLocaleString() + ' / ' + total.toLocaleString() + '（' + (total > 0 ? nf((100 * count) / total, 1, 1) : 0) + '%）　速さ ' + speed + '/フレーム', 20, 68);
  fill(0, 0, 85);
  if (best) text((hamMode ? '最小費用 ' + bestLen : '最短距離 ' + nf(bestLen, 1, 1)) + (done ? '（確定！）' : '（暫定）'), 20, 98);
  if (hamMode && done) {
    fill(bestLen === 0 ? color(120, 80, 100) : color(0, 80, 100)); textSize(22);
    text(bestLen === 0 ? '費用 0 の巡回路 = 緑の線だけで回れる = ハミルトン閉路がある！' : '費用 0 にできない → このグラフにハミルトン閉路はない', 20, 132);
  }
  fill(0, 0, 60); textSize(15);
  let sec = total / (speed * 60);
  text('この速さだと全部で約 ' + fmtSec(sec) + '。都市を 1 つ足すと ' + n + ' 倍、15 都市なら 10¹⁰ 通り以上', 20, height - 22);
}
function drawTour(t, c, w) {
  if (!t || t.length < 2) return;
  stroke(c); strokeWeight(w); noFill();
  beginShape(); for (let i of t) vertex(cities[i].x, cities[i].y); endShape(CLOSE);
}
function fmtSec(s) { return s < 60 ? nf(s, 1, 1) + ' 秒' : s < 3600 ? nf(s / 60, 1, 1) + ' 分' : s < 86400 * 2 ? nf(s / 3600, 1, 1) + ' 時間' : nf(s / 86400, 1, 0) + ' 日'; }

function mousePressed() {
  if (mouseY < 110 || cities.length >= MAX_CITIES) return;
  cities.push({ x: mouseX, y: mouseY });
  makeGraph(); reset();
}
function keyPressed() {
  if (key === ' ') { if (done) reset(); running = !running; }
  if (key === UP_ARROW) speed = min(5000, speed * 2);
  if (key === DOWN_ARROW) speed = max(1, floor(speed / 2));
  if (key === 'r' || key === 'R') randomCities(7);
  if (key === 'c' || key === 'C') { cities = []; gEdges = []; reset(); }
  if (key === 'h' || key === 'H') { hamMode = !hamMode; reset(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 都市 8・9・10 個で、全部調べるのにかかる時間を比べよう
// 2. 暫定の最短路は、全体の何 % 調べたところで見つかることが多い？
// 3. H モードで、ハミルトン閉路がないグラフ（R を何度か押す）を探そう
