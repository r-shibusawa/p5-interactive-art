// ============================================
// 10 三角不等式つき TSP の 2 倍近似（最小全域木をなぞって近道）
// ① 最小全域木（MST）をつくる → ② 木を深さ優先でなぞる（各辺を 2 回通る）→ ③ 一度行った都市は飛ばして近道
// 三角不等式（寄り道しないほうが短い）が成り立てば：近道の巡回路 ≤ 木を 2 周 = 2 × MST ≤ 2 × 最適
// N：距離を「距離の 2 乗」に変える（三角不等式がこわれる）→ 保証が消える。一般の TSP は近似すら NP 困難
// スペース：次の段階へ / クリック：都市を追加 / R：ランダム / C：消す / N：距離の測り方を切り替え
// ============================================

let cities = [];
let stage = 0;          // 0 都市 1 MST 2 なぞる 3 近道 4 比較
let mst = [], walk = [], tour = [], best = null, bestLen = 0;
let anim = 0;
let squared = false;
let EXACT_LIMIT = 9;    // ★ この数までは総当たりで本当の最適解を求める

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomCities(8);
}
function randomCities(n) { cities = []; for (let i = 0; i < n; i++) cities.push({ x: random(100, width - 100), y: random(160, height - 90) }); recompute(); }

function d(a, b) {
  let e = dist(cities[a].x, cities[a].y, cities[b].x, cities[b].y) / 100;
  return squared ? e * e : e;
}
function len(t) { let L = 0; for (let i = 0; i < t.length; i++) L += d(t[i], t[(i + 1) % t.length]); return L; }

function recompute() {
  stage = 0; anim = 0; mst = []; walk = []; tour = []; best = null;
  let n = cities.length;
  if (n < 3) return;
  // プリム法
  let inT = [true], key = [], par = [];
  for (let i = 1; i < n; i++) { key[i] = d(0, i); par[i] = 0; inT[i] = false; }
  for (let k = 1; k < n; k++) {
    let u = -1;
    for (let i = 1; i < n; i++) if (!inT[i] && (u < 0 || key[i] < key[u])) u = i;
    inT[u] = true; mst.push([par[u], u]);
    for (let i = 1; i < n; i++) if (!inT[i] && d(u, i) < key[i]) { key[i] = d(u, i); par[i] = u; }
  }
  // 深さ優先でなぞる（行き帰りの全部）と、先行順の巡回路
  let kids = cities.map(() => []);
  for (let [p, c] of mst) kids[p].push(c);
  (function dfs(v) { walk.push(v); tour.push(v); for (let c of kids[v]) { dfs(c); walk.push(v); } })(0);
  // 比べる相手
  if (n <= EXACT_LIMIT) {
    let rest = []; for (let i = 1; i < n; i++) rest.push(i);
    let bl = Infinity, bt = null;
    (function perm(k) {
      if (k === rest.length) { let t = [0, ...rest], L = len(t); if (L < bl) { bl = L; bt = t; } return; }
      for (let i = k; i < rest.length; i++) { [rest[k], rest[i]] = [rest[i], rest[k]]; perm(k + 1); [rest[k], rest[i]] = [rest[i], rest[k]]; }
    })(0);
    best = bt; bestLen = bl;
  } else { // 都市が多いときは 2-opt で「かなり良い」巡回路
    let t = tour.slice(), improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < n - 1; i++) for (let j = i + 2; j < n; j++) {
        let a = t[i], b = t[i + 1], c = t[j], e = t[(j + 1) % n];
        if (d(a, c) + d(b, e) < d(a, b) + d(c, e) - 1e-9) { t.splice(i + 1, j - i, ...t.slice(i + 1, j + 1).reverse()); improved = true; }
      }
    }
    best = t; bestLen = len(t);
  }
}

function draw() {
  background(260, 30, 9);
  anim += 0.04;
  let n = cities.length;
  // 最適（比較）
  if (stage >= 4 && best) { stroke(280, 60, 100, 70); strokeWeight(10); noFill(); beginShape(); for (let i of best) vertex(cities[i].x, cities[i].y); endShape(CLOSE); }
  // MST
  if (stage >= 1) {
    let m = stage === 1 ? min(mst.length, floor(anim * 3)) : mst.length;
    for (let k = 0; k < m; k++) { let [a, b] = mst[k]; stroke(150, 70, 90); strokeWeight(stage === 1 ? 5 : 3); line(cities[a].x, cities[a].y, cities[b].x, cities[b].y); }
  }
  // なぞる
  if (stage === 2) {
    let m = min(walk.length - 1, floor(anim * 4));
    for (let k = 0; k < m; k++) {
      let a = cities[walk[k]], b = cities[walk[k + 1]];
      let off = 6, ang = atan2(b.y - a.y, b.x - a.x) + HALF_PI;
      stroke(45, 90, 100); strokeWeight(3);
      line(a.x + cos(ang) * off, a.y + sin(ang) * off, b.x + cos(ang) * off, b.y + sin(ang) * off);
    }
  }
  // 近道
  if (stage >= 3) {
    let m = stage === 3 ? min(tour.length, floor(anim * 3) + 1) : tour.length;
    stroke(45, 90, 100); strokeWeight(4); noFill();
    for (let k = 0; k < m; k++) {
      let a = cities[tour[k]], b = cities[tour[(k + 1) % tour.length]];
      if (k < m - 1 || m === tour.length) line(a.x, a.y, b.x, b.y);
    }
  }
  for (let i = 0; i < n; i++) {
    noStroke(); fill(i === 0 ? color(0, 80, 100) : color(200, 60, 100)); circle(cities[i].x, cities[i].y, 24);
    if (stage >= 3) { fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(12); text(tour.indexOf(i) + 1, cities[i].x, cities[i].y); }
  }

  noStroke(); textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('スペース：次の段階　クリック：都市　R：ランダム　C：消す　N：距離の測り方（いま：' + (squared ? '距離の 2 乗 ✗三角不等式' : 'ふつうの距離 ✓三角不等式') + '）', 20, 34);
  let names = ['都市', '① 最小全域木（プリム法）', '② 木を一筆書きでなぞる（各辺 2 回）', '③ 行った都市を飛ばして近道', '④ 最適と比べる'];
  fill(45, 85, 100); textSize(24); text(names[stage], 20, 72);
  textSize(18); fill(0, 0, 85);
  if (n >= 3) {
    let mstL = mst.reduce((s, [a, b]) => s + d(a, b), 0);
    let lines = ['MST = ' + nf(mstL, 1, 2), 'なぞり = 2×MST = ' + nf(2 * mstL, 1, 2), '近道の巡回路 H = ' + nf(len(tour), 1, 2)];
    for (let k = 0; k < min(stage, 3); k++) text(lines[k], 20, 106 + k * 26);
    if (stage >= 4) {
      fill(280, 60, 100);
      text((n <= EXACT_LIMIT ? '最適 H* = ' : '2-opt で改善した巡回路 ≈ ') + nf(bestLen, 1, 2) + '　　H / H* = ' + nf(len(tour) / bestLen, 1, 2), 20, 184);
      fill(squared ? color(0, 80, 100) : color(120, 70, 100));
      text(squared ? '三角不等式がないので 2 倍の保証はない（都市を動かすと 2 を超えることも）' : 'H ≤ 2×MST ≤ 2×H*：必ず 2 以下', 20, 212);
    }
  }
  fill(0, 0, 60); textSize(15);
  text('MST は巡回路から 1 辺消したものより短い → MST ≤ 最適。近道は三角不等式で短くなるだけ', 20, height - 22);
}

function mousePressed() { if (mouseY > 230 && cities.length < 14) { cities.push({ x: mouseX, y: mouseY }); recompute(); } }
function keyPressed() {
  if (key === ' ') { stage = (stage + 1) % 5; anim = 0; }
  if (key === 'r' || key === 'R') randomCities(8);
  if (key === 'c' || key === 'C') { cities = []; recompute(); }
  if (key === 'n' || key === 'N') { squared = !squared; let s = stage; recompute(); stage = s; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. R を何度も押して H/H* を記録。2 に近づくことはある？
// 2. N で距離の 2 乗にして、都市を一直線上に並べてみよう。比はどうなる？
// 3. 本物の改良版（クリストフィデス法）は 1.5 倍を保証する。どこを変えると思う？
