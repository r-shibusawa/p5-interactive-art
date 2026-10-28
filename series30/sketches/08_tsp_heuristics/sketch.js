// ============================================
// 08 巡回セールスマン問題 ─ ヒューリスティクス
// 全部の町を 1 回ずつ回って戻る最短の道は？ 町が 20 で約 6 京通り。全部は試せないので「そこそこ良い道」を速くつくる
//   つくる：最近傍法（一番近い町へ）→ 直す：2-opt（交差する 2 本をつなぎかえる）、Or-opt（1〜3 個の町を別の場所へ移す）
// クリック = 町を足す / N = 最近傍法 / 2 = 2-opt / O = Or-opt / スペース = 全部を順に / X = でたらめな順 / ↑↓ = 町の数 / R = 新しい町 / C = 全部消す
// ============================================

let nCities = 60;                      // ★ 町の数
let cities = [], tour = [];
let mode = 'idle';                     // 'nn' | '2opt' | 'oropt' | 'idle'
let chain = false;                     // スペース：NN → 2-opt → Or-opt を続けて
let nnVisited = [], moves = 0;
let lenLog = [];                       // 道の長さの記録 { L, mode }
let mapX, mapY, mapW, mapH;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  mapX = 30; mapY = 100; mapW = width * 0.62; mapH = height - 130;
  newCities();
}
function newCities() {
  cities = [];
  for (let i = 0; i < nCities; i++) cities.push({ x: mapX + random(20, mapW - 20), y: mapY + random(20, mapH - 20) });
  dmN = -1;
  resetTour();
}
function resetTour() { tour = cities.map((_, i) => i); mode = 'idle'; chain = false; lenLog = []; moves = 0; logLen(); }
// 町どうしの距離（表にしておくと速い。町の数が変わったら作り直す）
let DM = null, dmN = -1;
function d(a, b) {
  if (dmN !== cities.length) {
    dmN = cities.length; DM = new Float64Array(dmN * dmN);
    for (let i = 0; i < dmN; i++) for (let j = 0; j < dmN; j++) DM[i * dmN + j] = Math.hypot(cities[i].x - cities[j].x, cities[i].y - cities[j].y);
  }
  return DM[a * dmN + b];
}
function tourLen(t) { let s = 0; for (let i = 0; i < t.length; i++) s += d(t[i], t[(i + 1) % t.length]); return s; }
function logLen() { lenLog.push({ L: tourLen(tour), mode }); if (lenLog.length > 600) lenLog.shift(); }

// ★ 最近傍法：今いる町から、まだ行っていない一番近い町へ
function startNN() { tour = [floor(random(cities.length))]; nnVisited = new Array(cities.length).fill(false); nnVisited[tour[0]] = true; mode = 'nn'; moves = 0; }
function stepNN() {
  let cur = tour[tour.length - 1], best = -1, bd = Infinity;
  for (let j = 0; j < cities.length; j++) if (!nnVisited[j] && d(cur, j) < bd) { bd = d(cur, j); best = j; }
  if (best < 0) return false;
  tour.push(best); nnVisited[best] = true;
  return tour.length < cities.length;
}
// ★ 2-opt：辺 (a,b) と (c,e) を (a,c) と (b,e) につなぎかえて短くなるなら、間を逆向きにする
function stepTwoOpt() {
  let n = tour.length;
  for (let i = 0; i < n - 1; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    let a = tour[i], b = tour[i + 1], c = tour[j], e = tour[(j + 1) % n];
    if (d(a, c) + d(b, e) < d(a, b) + d(c, e) - 1e-9) {
      let seg = tour.slice(i + 1, j + 1).reverse();
      tour.splice(i + 1, seg.length, ...seg);
      return true;
    }
  }
  return false;
}
// ★ Or-opt：連続する 1〜3 個の町をぬき出して、別の辺の間に（向きも選んで）入れる
function stepOrOpt() {
  let n = tour.length;
  for (let L = 1; L <= 3; L++) for (let i = 0; i + L <= n; i++) {
    let s0 = tour[i], sL = tour[i + L - 1], prev = tour[(i - 1 + n) % n], next = tour[(i + L) % n];
    if (prev === sL || next === s0) continue;
    let gain = d(prev, s0) + d(sL, next) - d(prev, next);
    for (let k = 0; k < n; k++) {
      if (k >= i - 1 && k <= i + L - 1) continue;
      if (i === 0 && k === n - 1) continue;
      let p = tour[k], q = tour[(k + 1) % n];
      let add1 = d(p, s0) + d(sL, q) - d(p, q), add2 = d(p, sL) + d(s0, q) - d(p, q);
      if (min(add1, add2) < gain - 1e-9) {
        let seg = tour.slice(i, i + L);
        if (add2 < add1) seg.reverse();
        let rest = tour.slice(0, i).concat(tour.slice(i + L));
        let at = rest.indexOf(p) + 1;
        rest.splice(at, 0, ...seg);
        tour = rest;
        return true;
      }
    }
  }
  return false;
}

function draw() {
  background(225, 30, 12);
  if (mode === 'nn') { for (let k = 0; k < 2; k++) if (!stepNN()) { mode = chain ? '2opt' : 'idle'; break; } logLen(); }
  else if (mode === '2opt') { if (stepTwoOpt()) moves++; else mode = chain ? 'oropt' : 'idle'; logLen(); }
  else if (mode === 'oropt') { if (stepOrOpt()) moves++; else { mode = 'idle'; chain = false; } logLen(); }

  // 地図
  noFill(); stroke(0, 0, 100, 15); strokeWeight(1); rect(mapX, mapY, mapW, mapH, 8);
  let closed = mode !== 'nn';
  stroke(mode === 'nn' ? color(30, 80, 100) : mode === '2opt' ? color(190, 80, 100) : mode === 'oropt' ? color(300, 60, 100) : color(50, 80, 100));
  strokeWeight(2.5);
  if (tour.length >= 2) { beginShape(); for (let i of tour) vertex(cities[i].x, cities[i].y); if (closed) endShape(CLOSE); else endShape(); }
  noStroke();
  for (let i = 0; i < cities.length; i++) { fill(0, 0, 100); circle(cities[i].x, cities[i].y, 9); }
  if (tour.length) { fill(0, 80, 100); circle(cities[tour[0]].x, cities[tour[0]].y, 14); }

  // 右：長さのグラフ
  let gx = mapX + mapW + 40, gw = width - gx - 30, gy = mapY + 30, gh = height * 0.38;
  fill(0, 0, 85); textSize(15); text('道の長さの推移', gx, gy - 12);
  if (lenLog.length > 1) {
    let hi = 0, lo = Infinity;
    for (let p of lenLog) if (p.mode !== 'nn') { hi = max(hi, p.L); lo = min(lo, p.L); }
    if (hi === 0) { hi = lenLog[lenLog.length - 1].L; lo = 0; }
    lo *= 0.95;
    noStroke();
    for (let k = 0; k < lenLog.length; k++) {
      let p = lenLog[k]; if (p.mode === 'nn') continue;
      fill(p.mode === '2opt' ? color(190, 80, 100) : p.mode === 'oropt' ? color(300, 60, 100) : color(50, 80, 100));
      circle(gx + k / (lenLog.length - 1) * gw, gy + gh - constrain((p.L - lo) / max(1, hi - lo), 0, 1) * gh, 4);
    }
  }
  let L = tourLen(tour);
  let ty = gy + gh + 50;
  fill(0, 0, 100); textSize(26); text(closed ? '長さ ' + nf(L, 1, 0) : '作成中…', gx, ty);
  fill(0, 0, 75); textSize(14);
  let info = [
    '町の数 ' + cities.length + '　改善の回数 ' + moves,
    '今の段階：' + { idle: '止まっている', nn: '最近傍法でつくる（橙）', '2opt': '2-opt で直す（水色）', oropt: 'Or-opt で直す（紫）' }[mode],
    '',
    '最近傍法：速いが、最後に遠くから戻る長い辺が残りがち',
    '2-opt：交差した 2 本の辺はほどくと必ず短くなる',
    '　→ 2-opt が終わった道には交差がない',
    'Or-opt：2-opt で直せない「寄り道」を移す',
    '',
    'でたらめな順（X）から 2-opt だけでも',
    'かなり良くなる。でも最適とは限らない（局所最適）',
  ];
  info.forEach((s, i) => text(s, gx, ty + 30 + i * 22));

  fill(0, 0, 100); textSize(18);
  text('クリック：町を足す　N：最近傍法　2：2-opt　O：Or-opt　スペース：全部を順に　X：でたらめ　↑↓ 町の数 ' + nCities + '　R：新しい町　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('「つくる」と「直す」を組み合わせるのがヒューリスティクスの基本。赤い町がスタート', 20, 68);
}

function mousePressed() {
  if (mouseX > mapX && mouseX < mapX + mapW && mouseY > mapY && mouseY < mapY + mapH) {
    cities.push({ x: mouseX, y: mouseY });
    if (mode === 'nn') resetTour(); else { tour.push(cities.length - 1); logLen(); }
  }
}
function keyPressed() {
  if (cities.length < 4 && key !== 'r' && key !== 'R' && key !== UP_ARROW && key !== DOWN_ARROW) return;
  if (key === 'n' || key === 'N') { chain = false; startNN(); }
  if (key === '2') { if (mode === 'nn') return; chain = false; mode = '2opt'; }
  if (key === 'o' || key === 'O') { if (mode === 'nn') return; chain = false; mode = 'oropt'; }
  if (key === ' ') { startNN(); chain = true; }
  if (key === 'x' || key === 'X') { tour = shuffle(cities.map((_, i) => i)); mode = 'idle'; chain = false; moves = 0; logLen(); }
  if (key === 'r' || key === 'R') newCities();
  if (key === 'c' || key === 'C') { cities = []; tour = []; mode = 'idle'; lenLog = []; }
  if (key === UP_ARROW) { nCities = min(300, nCities + 20); newCities(); }
  if (key === DOWN_ARROW) { nCities = max(10, nCities - 20); newCities(); }
}

// ---------- やってみよう ----------
// 1. 同じ町で「最近傍法 → 2-opt」と「でたらめ（X）→ 2-opt」の最後の長さを比べよう。どちらが良い？ 何回改善した？
// 2. 町を円の形に並べてクリックしてみよう。最適な道は明らか。ヒューリスティクスは見つけられる？
// 3. 最近傍法のスタートを変えると結果が変わる。全部の町をスタートにして一番良いものを選ぶ（反復最近傍法）を書こう
// 4. 2-opt が止まった道は「局所最適」。そこから抜け出すには？（→ 09 焼きなまし法）
