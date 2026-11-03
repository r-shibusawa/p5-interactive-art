// ============================================
// 07 貪欲法が失敗する構造
// 06 と同じ貪欲法（価値の高い順に、入れられるなら入れる）を「マトロイドでない集合族」に使うと最適解を逃す
//   1：ナップサック（重さの合計 ≤ 容量 なら独立）　2：マッチング（辺が頂点を共有しなければ独立）
//   どちらも (I1)(I2) は満たすが (I3) 交換公理が壊れている。その「壊れている場所」を右下に表示
// 1・2 = 問題を切替 / スペース = 1 ステップ / A = 自動 / R = 最初から（重みをランダムに） / ↑↓ = 容量（1 のとき）
// ============================================

let kind = 1;                        // 1 = ナップサック, 2 = マッチング
let elems = [];                      // {name, w, v, ...}
let capacity = 10;                   // ★ ナップサックの容量
let order = [], stepI = 0, status = [], auto = false, timer = 0;
let bestVal = 0, bestSet = [];
let violation = null;                // {A, B} 交換公理の反例
let nodes = [], mEdges = [];         // マッチング用のグラフ

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  build();
}

function build() {
  elems = [];
  if (kind === 1) {
    // ★ 品物：重さ w、価値 v
    for (let i = 0; i < 6; i++) elems.push({ name: '品' + (i + 1), w: floor(random(2, 8)), v: floor(random(3, 15)) });
  } else {
    // ★ 6 頂点の輪＋対角線のグラフ。辺が要素、価値はランダム
    nodes = [];
    let cx = width * 0.3, cy = height * 0.55, r = min(width, height) * 0.24;
    for (let i = 0; i < 6; i++) nodes.push({ x: cx + r * cos(TWO_PI * i / 6 - HALF_PI), y: cy + r * sin(TWO_PI * i / 6 - HALF_PI) });
    mEdges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3], [1, 4]];
    mEdges.forEach(([a, b], i) => elems.push({ name: 'e' + (i + 1), a, b, w: 1, v: floor(random(3, 15)) }));
  }
  reset();
}

// ★ 独立かどうか（この判定だけが 06 とちがう）
function isIndep(sub) {
  if (kind === 1) return sub.reduce((s, i) => s + elems[i].w, 0) <= capacity;
  let used = new Set();
  for (let i of sub) { let e = elems[i]; if (used.has(e.a) || used.has(e.b)) return false; used.add(e.a); used.add(e.b); }
  return true;
}
function valueOf(sub) { return sub.reduce((s, i) => s + elems[i].v, 0); }

function reset() {
  order = [...Array(elems.length).keys()].sort((p, q) => elems[q].v - elems[p].v);
  status = new Array(elems.length).fill(''); stepI = 0; auto = false;
  // 全列挙で最適解
  bestVal = -1; bestSet = [];
  let indeps = [];
  for (let m = 0; m < (1 << elems.length); m++) {
    let sub = []; for (let i = 0; i < elems.length; i++) if (m & (1 << i)) sub.push(i);
    if (!isIndep(sub)) continue;
    indeps.push(sub);
    let v = valueOf(sub); if (v > bestVal) { bestVal = v; bestSet = sub; }
  }
  // 交換公理の反例：|A| < |B| なのに B のどれを足しても従属になる A
  violation = null;
  for (let A of indeps) {
    for (let B of indeps) {
      if (B.length <= A.length) continue;
      let ok = B.some((e) => !A.includes(e) && isIndep(A.concat([e])));
      if (!ok) { if (!violation || A.length + B.length < violation.A.length + violation.B.length) violation = { A, B }; }
    }
  }
}
function greedyStep() {
  if (stepI >= order.length) return;
  let i = order[stepI];
  let chosen = order.slice(0, stepI).filter((j) => status[j] === 'ok');
  status[i] = isIndep(chosen.concat([i])) ? 'ok' : 'ng';
  stepI++;
}

function draw() {
  background(340, 25, 9);
  if (auto && ++timer % 25 === 0) greedyStep();
  let chosen = [...Array(elems.length).keys()].filter((i) => status[i] === 'ok');
  let done = stepI >= order.length;
  let total = valueOf(chosen);

  if (kind === 1) drawKnapsack(chosen); else drawMatching(chosen);

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('1：ナップサック　2：マッチング　スペース：1 ステップ　A：自動 ' + (auto ? 'ON' : 'off') + '　R：最初から' + (kind === 1 ? '　↑↓：容量 ' + capacity : ''), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('06 と同じ貪欲法：価値の高い順に、入れられるなら入れる。でもこの集合族はマトロイドではない', 20, 66);

  let px = width - 420, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 410, height - py - 20, 12);
  fill(done ? (total === bestVal ? 130 : 5) : 50, 80, 100); textSize(24);
  text(done ? (total === bestVal ? '今回は最適と一致' : '貪欲法は最適を逃した ✗') : '価値の高い順に試す（' + stepI + ' / ' + elems.length + '）', px, py);
  fill(0, 0, 100); textSize(18);
  text('貪欲法の価値 = ' + total + '　　全列挙の最適 = ' + bestVal, px, py + 34);
  fill(0, 0, 70); textSize(15);
  text('最適解：{' + bestSet.map((i) => elems[i].name).join(', ') + '}', px, py + 58);
  textSize(15);
  for (let k = 0; k < order.length; k++) {
    let i = order[k], e = elems[i], st = status[i];
    fill(st === 'ok' ? 130 : st === 'ng' ? 5 : k === stepI ? 50 : 0, st || k === stepI ? 75 : 0, st === 'ng' ? 70 : k > stepI ? 60 : 100);
    text((k === stepI && !done ? '▶ ' : '　 ') + e.name + '　価値 ' + nf(e.v, 2) + (kind === 1 ? '　重さ ' + e.w : '　' + (e.a + 1) + '–' + (e.b + 1)) + '　' + (st === 'ok' ? '採用' : st === 'ng' ? '入らない → 捨てる' : ''), px, py + 96 + k * 22);
  }
  // 交換公理の反例
  let vy = py + 96 + order.length * 22 + 30;
  fill(5, 80, 100); textSize(18); text('(I3) 交換公理が壊れている場所', px, vy);
  fill(0, 0, 80); textSize(15);
  if (violation) {
    text('A = {' + violation.A.map((i) => elems[i].name).join(', ') + '}　B = {' + violation.B.map((i) => elems[i].name).join(', ') + '}', px, vy + 26);
    text('|A| < |B| なのに、B のどれを A に足しても独立でない', px, vy + 48);
    text(kind === 1 ? '→ 軽い品 2 つ vs 重い品 1 つ。「大きさ」が意味を持たない' : '→ 真ん中の辺 1 本 vs 両側の辺 2 本。極大なのに大きさがちがう', px, vy + 70);
  } else text('この重みでは反例なし（たまたま）', px, vy + 26);
  fill(0, 0, 60); textSize(14);
  text('マトロイドなら極大独立集合はみな同じ大きさで、貪欲法は必ず最適（08 で統計）', px, vy + 100);
}

function drawKnapsack(chosen) {
  let x0 = 60, y0 = height * 0.55, bw = 70;
  // 容量のバー
  let barW = width - 520, used = chosen.reduce((s, i) => s + elems[i].w, 0);
  noStroke(); fill(0, 0, 25); rect(x0, y0 + 160, barW, 30, 6);
  fill(130, 70, 80); rect(x0, y0 + 160, barW * min(1, used / capacity), 30, 6);
  fill(0, 0, 100); textSize(15); textAlign(LEFT, BASELINE);
  text('重さの合計 ' + used + ' / 容量 ' + capacity, x0, y0 + 215);
  for (let i = 0; i < elems.length; i++) {
    let e = elems[i], on = chosen.includes(i), st = status[i];
    let h = e.w * 14, x = x0 + i * (bw + 30);
    stroke(st === 'ng' ? 5 : 0, st === 'ng' ? 70 : 0, st === 'ng' ? 70 : 60); strokeWeight(2);
    fill(on ? 130 : 0, on ? 70 : 0, on ? 75 : 30);
    rect(x, y0 + 100 - h, bw, h, 6);
    noStroke(); fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(14);
    text(e.name, x + bw / 2, y0 + 118);
    text('重さ ' + e.w, x + bw / 2, y0 + 100 - h - 32);
    fill(50, 80, 100); text('価値 ' + e.v, x + bw / 2, y0 + 100 - h - 14);
  }
}
function drawMatching(chosen) {
  for (let i = 0; i < elems.length; i++) {
    let e = elems[i], p = nodes[e.a], q = nodes[e.b], on = chosen.includes(i), st = status[i];
    if (on) { stroke(130, 85, 100); strokeWeight(8); } else if (st === 'ng') { stroke(5, 70, 70, 60); strokeWeight(2); drawingContext.setLineDash([6, 6]); } else { stroke(0, 0, 45); strokeWeight(2.5); }
    line(p.x, p.y, q.x, q.y); drawingContext.setLineDash([]);
    noStroke(); fill(on ? 130 : 50, 70, 100); textSize(14); textAlign(CENTER, CENTER);
    text(e.name + ' (' + e.v + ')', (p.x + q.x) / 2 + 14, (p.y + q.y) / 2 - 12);
  }
  let used = new Set(); for (let i of chosen) { used.add(elems[i].a); used.add(elems[i].b); }
  for (let i = 0; i < nodes.length; i++) {
    stroke(0, 0, 100); strokeWeight(2); fill(used.has(i) ? 130 : 340, used.has(i) ? 60 : 30, 85); circle(nodes[i].x, nodes[i].y, 30);
    noStroke(); fill(0, 0, 10); textSize(14); text(i + 1, nodes[i].x, nodes[i].y);
  }
}

function keyPressed() {
  if (key === '1') { kind = 1; build(); }
  if (key === '2') { kind = 2; build(); }
  if (key === ' ') greedyStep();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') build();
  if (kind === 1 && key === UP_ARROW) { capacity = min(30, capacity + 1); reset(); }
  if (kind === 1 && key === DOWN_ARROW) { capacity = max(2, capacity - 1); reset(); }
}

// ---------- やってみよう ----------
// 1. ナップサックで R を何回か押し、貪欲が失敗する回と成功する回の割合を感じる。容量を大きくすると？
// 2. 「価値／重さ」の順に並べ替えるとどうなる？（コードの sort を v / w に）。それでも失敗する例を探す
// 3. マッチングで、真ん中の対角線 e7・e8 の価値を高くすると貪欲法がだまされる。ノードを増やしたら？
// 4. どちらも「極大なのに大きさがちがう独立集合」がある。これがマトロイドでない印。03 の見本 4 と同じ
