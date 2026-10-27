// ============================================
// 11 集合被覆の貪欲法
// 点（町）を全部カバーするのに、四角（基地局の範囲）を最少で何個選べばいい？
// 貪欲法：「まだカバーされていない点をいちばん多く含む四角」を選び続ける
// 最適の H(最大の四角の点数) ≈ ln n 倍以内が保証される。これより良い比は（P≠NP なら）多項式時間では無理
// スペース：貪欲法を 1 手ずつ / O：最適解（総当たり）/ 四角をクリック：自分で選ぶ / R：ランダム / 2：貪欲法が負ける例
// ============================================

let pts = [];           // { x, y }
let sets = [];          // { x, y, w, h, members: [点番号], hue }
let chosen = [], manual = [];
let opt = null, showOpt = false;
let GRID_W = 14, GRID_H = 8;   // ★ 点の格子
let N_SETS = 12;               // ★ 四角の数（最適の総当たりは 2^N_SETS）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomInstance();
}

function cellXY(c, r) { let s = min((width - 200) / GRID_W, (height - 260) / GRID_H); return { x: 100 + c * s + s / 2, y: 170 + r * s + s / 2, s }; }
function makePts(W, H) { pts = []; GRID_W = W; GRID_H = H; for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { let p = cellXY(c, r); pts.push({ x: p.x, y: p.y, c, r }); } }
function addSet(c0, r0, c1, r1) {
  let a = cellXY(c0, r0), b = cellXY(c1, r1);
  let members = pts.map((p, i) => (p.c >= c0 && p.c <= c1 && p.r >= r0 && p.r <= r1 ? i : -1)).filter((i) => i >= 0);
  sets.push({ x: a.x - a.s * 0.45, y: a.y - a.s * 0.45, w: b.x - a.x + a.s * 0.9, h: b.y - a.y + a.s * 0.9, members, hue: (sets.length * 47) % 360 });
}
function randomInstance() {
  makePts(14, 8); sets = [];
  // まず格子を 5 つの四角に切り分ける（これで必ず全部カバーできる）
  let pieces = [[0, 0, GRID_W - 1, GRID_H - 1]];
  while (pieces.length < 5) {
    pieces.sort((a, b) => (b[2] - b[0] + 1) * (b[3] - b[1] + 1) - (a[2] - a[0] + 1) * (a[3] - a[1] + 1));
    let [c0, r0, c1, r1] = pieces.shift();
    if (c1 - c0 >= r1 - r0) { let m = floor(random(c0, c1)); pieces.push([c0, r0, m, r1], [m + 1, r0, c1, r1]); }
    else { let m = floor(random(r0, r1)); pieces.push([c0, r0, c1, m], [c0, m + 1, c1, r1]); }
  }
  for (let q of pieces) addSet(...q);
  // 残りはおとり（大きめの四角をばらまく）
  while (sets.length < N_SETS) {
    let w = floor(random(3, 8)), h = floor(random(2, 6));
    let c0 = floor(random(GRID_W - w + 1)), r0 = floor(random(GRID_H - h + 1));
    addSet(c0, r0, c0 + w - 1, r0 + h - 1);
  }
  sets = shuffle(sets);
  sets.forEach((s, k) => (s.hue = (k * 47) % 360));
  resetSel();
}
function badInstance() { // 2 行。上の行・下の行の 2 つで足りるのに、貪欲法は大きなブロックにつられる
  makePts(14, 2); sets = [];
  addSet(0, 0, 13, 0); addSet(0, 1, 13, 1);      // 最適の 2 個
  addSet(0, 0, 1, 1); addSet(2, 0, 5, 1); addSet(6, 0, 13, 1); // 4, 8, 16 個のブロック
  resetSel();
}
function resetSel() { chosen = []; manual = []; opt = null; showOpt = false; }

function uncoveredBy(list) { let c = new Set(list.flatMap((k) => sets[k].members)); return pts.map((_, i) => i).filter((i) => !c.has(i)); }
function greedyStep() {
  let un = new Set(uncoveredBy(chosen));
  if (un.size === 0) return;
  let bestK = -1, bestGain = 0;
  sets.forEach((s, k) => { let g = s.members.filter((i) => un.has(i)).length; if (g > bestGain) { bestGain = g; bestK = k; } });
  if (bestK >= 0) chosen.push(bestK);
}
function computeOpt() {
  let m = sets.length, best = null;
  let words = sets.map((s) => { let w = new Uint32Array(4); for (let i of s.members) w[i >> 5] |= 1 << (i & 31); return w; });
  let full = new Uint32Array(4); for (let i = 0; i < pts.length; i++) full[i >> 5] |= 1 << (i & 31);
  for (let mask = 1; mask < 1 << m; mask++) {
    let cnt = 0; for (let k = 0; k < m; k++) if ((mask >> k) & 1) cnt++;
    if (best && cnt >= best.length) continue;
    let u = [0, 0, 0, 0];
    for (let k = 0; k < m; k++) if ((mask >> k) & 1) for (let w = 0; w < 4; w++) u[w] |= words[k][w];
    if (u.every((v, w) => (v >>> 0) === full[w])) { best = []; for (let k = 0; k < m; k++) if ((mask >> k) & 1) best.push(k); }
  }
  opt = best;
}
function H(n) { let s = 0; for (let i = 1; i <= n; i++) s += 1 / i; return s; }

function draw() {
  background(150, 25, 9);
  let active = manual.length ? manual : chosen;
  let un = new Set(uncoveredBy(active));
  // 四角
  sets.forEach((s, k) => {
    let on = active.includes(k), o = showOpt && opt && opt.includes(k);
    stroke(s.hue, 70, 100, on ? 100 : 40); strokeWeight(on ? 4 : 1.5);
    fill(s.hue, 70, 90, on ? 28 : 6);
    if (o) { drawingContext.setLineDash([10, 6]); stroke(0, 0, 100); strokeWeight(3); }
    rect(s.x, s.y, s.w, s.h, 10);
    drawingContext.setLineDash([]);
    if (on) { noStroke(); fill(s.hue, 60, 100); textSize(16); textAlign(LEFT, TOP); text('#' + (active.indexOf(k) + 1), s.x + 6, s.y + 4); }
  });
  // 点
  noStroke();
  for (let i = 0; i < pts.length; i++) { fill(un.has(i) ? color(0, 0, 100) : color(130, 70, 100)); circle(pts[i].x, pts[i].y, un.has(i) ? 10 : 8); }

  textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('スペース：貪欲法 1 手　O：最適解（総当たり）　四角をクリック：自分で選ぶ　R：ランダム　2：貪欲法が負ける例', 20, 34);
  textSize(20);
  fill(45, 85, 100);
  text((manual.length ? 'あなたの選択 ' + manual.length : '貪欲法 ' + chosen.length) + ' 個　まだカバーされていない点 ' + un.size + ' / ' + pts.length, 20, 70);
  let maxS = max(sets.map((s) => s.members.length));
  if (opt) {
    fill(0, 0, 100);
    text('最適 ' + opt.length + ' 個（点線）　保証：貪欲 ≤ H(' + maxS + ') × 最適 = ' + nf(H(maxS), 1, 2) + ' × ' + opt.length + ' = ' + nf(H(maxS) * opt.length, 1, 1), 20, 102);
  }
  fill(0, 0, 60); textSize(15);
  text('H(d) = 1 + 1/2 + … + 1/d ≈ ln d。各点に「選ばれたとき 1/(新しくカバーした数)」の費用を割り振ると証明できる', 20, height - 22);
}

function mousePressed() {
  if (mouseY < 120) return;
  for (let k = sets.length - 1; k >= 0; k--) {
    let s = sets[k];
    if (mouseX > s.x && mouseX < s.x + s.w && mouseY > s.y && mouseY < s.y + s.h && !manual.includes(k)) { manual.push(k); return; }
  }
  manual = [];
}
function keyPressed() {
  if (key === ' ') { manual = []; if (uncoveredBy(chosen).length === 0) chosen = []; else greedyStep(); }
  if (key === 'o' || key === 'O') { if (!opt) computeOpt(); showOpt = !showOpt; }
  if (key === 'r' || key === 'R' || key === '1') randomInstance();
  if (key === '2') badInstance();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); randomInstance(); }

// ---------- やってみよう ----------
// 1. 2 の例で、貪欲法は最初に何を選ぶ？ なぜ失敗する？
// 2. 自分でクリックして、貪欲法より少ない個数で全部カバーできる？
// 3. 2 の例のブロックを 4・8・16・32 個…と増やすと、貪欲法の個数は log に比例して増えていく
