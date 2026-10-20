// ============================================
// 15 巡回セールスマン問題（おまけ）
// 全部の都市を 1 回ずつ回って戻る、いちばん短い道は？ 都市が 20 個でも道の数は 10^17 通り
// 「交差している 2 本をほどく」（2-opt）をくり返すだけで、かなり良い道が見つかる
// クリックで都市を追加 / スペースで改善開始 / R でランダムな都市 / C で消す
// ============================================

let cities = [];
let tour = [];
let improving = false;
let bestLen = 0, startLen = 0;
let swaps = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomCities();
}

function randomCities() {
  cities = [];
  for (let i = 0; i < 25; i++) cities.push({ x: random(80, width - 80), y: random(130, height - 60) });
  resetTour();
}
function resetTour() {
  tour = cities.map((_, i) => i).sort(() => random() - 0.5);
  startLen = bestLen = tourLength();
  swaps = 0;
  improving = false;
}
function tourLength() {
  let L = 0;
  for (let i = 0; i < tour.length; i++) L += dist(cities[tour[i]].x, cities[tour[i]].y, cities[tour[(i + 1) % tour.length]].x, cities[tour[(i + 1) % tour.length]].y);
  return L;
}

// ★ 2-opt：区間 [i+1 … j] を逆向きにすると短くなるなら、ひっくり返す
function twoOptStep() {
  let n = tour.length;
  if (n < 4) return false; // 都市が少なすぎる
  for (let tries = 0; tries < 200; tries++) {
    let i = floor(random(n - 1)), j = floor(random(i + 2, n));
    if (i === 0 && j === n - 1) continue;
    let a = cities[tour[i]], b = cities[tour[i + 1]], c = cities[tour[j]], d = cities[tour[(j + 1) % n]];
    let before = dist(a.x, a.y, b.x, b.y) + dist(c.x, c.y, d.x, d.y);
    let after = dist(a.x, a.y, c.x, c.y) + dist(b.x, b.y, d.x, d.y);
    if (after < before - 0.01) {
      tour = tour.slice(0, i + 1).concat(tour.slice(i + 1, j + 1).reverse(), tour.slice(j + 1));
      bestLen = tourLength();
      swaps++;
      return true;
    }
  }
  return false;
}

function draw() {
  background(220, 40, 10);
  if (improving) {
    let changed = false;
    for (let k = 0; k < 5; k++) if (twoOptStep()) changed = true;
    if (!changed && frameCount % 30 === 0) improving = false; // しばらく改善なし → 終了
  }

  if (tour.length > 1) {
    noFill();
    stroke(45, 90, 100);
    strokeWeight(2.5);
    beginShape();
    for (let i of tour) vertex(cities[i].x, cities[i].y);
    endShape(CLOSE);
  }
  for (let i = 0; i < cities.length; i++) {
    noStroke();
    fill(170, 70, 100);
    circle(cities[i].x, cities[i].y, 14);
  }

  fill(0, 0, 100);
  textSize(18);
  text('都市 ' + cities.length + '　道の長さ ' + round(bestLen) + '（最初 ' + round(startLen) + '、' + nf(100 * (1 - bestLen / max(startLen, 1)), 1, 0) + ' % 短縮）　ほどいた回数 ' + swaps + '　スペースで' + (improving ? '停止' : '改善開始') + '　クリックで都市追加　R：ランダム　C：消す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('正解を全部調べるのは不可能（25 都市で 10^23 通り）。でも「交差をほどく」だけで数 % の誤差に。これが「ヒューリスティック」', 20, 68);
}

function mousePressed() { if (mouseY > 90) { cities.push({ x: mouseX, y: mouseY }); resetTour(); } }
function keyPressed() {
  if (key === ' ') improving = !improving;
  if (key === 'r' || key === 'R') randomCities();
  if (key === 'c' || key === 'C') { cities = []; tour = []; bestLen = startLen = 0; improving = false; }
}

// ---------- やってみよう ----------
// 1. 改善が止まったら、もう一度 R → スペース。毎回ちがう道になる？ 長さは？（局所最適）
// 2. 都市を円形に並べて置く。正解（円周）にたどり着ける？
// 3. 「いちばん近い都市へ行く」（最近傍法）で初期の道を作ると、どれだけ良くなる？
