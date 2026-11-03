// ============================================
// 08 貪欲法の定理
// 同じ集合族にランダムな重みを何度も与え、「貪欲解」と「全列挙の最適解」を比べて統計をとる
//   定理：集合族が マトロイド ⇔ どんな重みでも貪欲法が最適（Rado–Edmonds）
//   1：グラフ的マトロイド（K4 の全域木）は 100% 一致。2：ナップサック、3：マッチング は一致しない回が出る
// スペース = 1 回試す / A = 自動（毎フレーム 10 回） / 1〜3 = 集合族を切替 / R = 統計をリセット
// ============================================

let kind = 1;                        // 1 = K4 の森, 2 = ナップサック, 3 = マッチング
let elems = [];                      // {name, v, ...}
let capacity = 10;                   // ★ ナップサックの容量
let trials = 0, matches = 0;
let bins = new Array(20).fill(0);    // 貪欲／最適 の比のヒストグラム（0.5〜1.0）
let auto = false;
let last = null;                     // 直近の試行 {greedy, best, gv, bv}
let nodes = [], knapW = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  build();
}

function build() {
  elems = []; nodes = [];
  if (kind === 1) {              // K4：4 頂点、6 辺。独立 = 閉路なし
    let cx = width * 0.25, cy = height * 0.6, r = 110;
    for (let i = 0; i < 4; i++) nodes.push({ x: cx + r * cos(TWO_PI * i / 4 + QUARTER_PI), y: cy + r * sin(TWO_PI * i / 4 + QUARTER_PI) });
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) elems.push({ name: 'e' + (elems.length + 1), a, b, v: 0 });
  } else if (kind === 2) {       // ナップサック：6 品。重さは固定、価値がランダム
    knapW = [2, 3, 4, 5, 6, 7];
    for (let i = 0; i < 6; i++) elems.push({ name: '品' + (i + 1), w: knapW[i], v: 0 });
  } else {                       // マッチング：6 頂点の輪＋対角線 2 本
    let cx = width * 0.25, cy = height * 0.6, r = 120;
    for (let i = 0; i < 6; i++) nodes.push({ x: cx + r * cos(TWO_PI * i / 6 - HALF_PI), y: cy + r * sin(TWO_PI * i / 6 - HALF_PI) });
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 3], [1, 4]].forEach(([a, b], i) => elems.push({ name: 'e' + (i + 1), a, b, v: 0 }));
  }
  resetStats();
}
function resetStats() { trials = 0; matches = 0; bins.fill(0); last = null; auto = false; }

// ★ 独立の判定（3 つの集合族）
function isIndep(sub) {
  if (kind === 1) {
    let uf = makeUF(4);
    for (let i of sub) if (!uf.union(elems[i].a, elems[i].b)) return false;
    return true;
  }
  if (kind === 2) return sub.reduce((s, i) => s + elems[i].w, 0) <= capacity;
  let used = new Set();
  for (let i of sub) { let e = elems[i]; if (used.has(e.a) || used.has(e.b)) return false; used.add(e.a); used.add(e.b); }
  return true;
}
function valueOf(sub) { return sub.reduce((s, i) => s + elems[i].v, 0); }

// ★ 1 回の試行：ランダムな価値 → 貪欲法と全列挙
function trial() {
  for (let e of elems) e.v = floor(random(1, 20));
  let order = [...Array(elems.length).keys()].sort((p, q) => elems[q].v - elems[p].v);
  let greedy = [];
  for (let i of order) if (isIndep(greedy.concat([i]))) greedy.push(i);
  let bestV = -1, best = [];
  for (let m = 0; m < (1 << elems.length); m++) {
    let sub = []; for (let i = 0; i < elems.length; i++) if (m & (1 << i)) sub.push(i);
    if (!isIndep(sub)) continue;
    let v = valueOf(sub); if (v > bestV) { bestV = v; best = sub; }
  }
  let gv = valueOf(greedy);
  trials++; if (gv === bestV) matches++;
  let ratio = bestV > 0 ? gv / bestV : 1;
  bins[constrain(floor(map(ratio, 0.5, 1.0001, 0, 20)), 0, 19)]++;
  last = { greedy, best, gv, bv: bestV };
}

function draw() {
  background(50, 25, 9);
  if (auto) for (let k = 0; k < 10; k++) trial();

  // 左：構造の絵（直近の試行の貪欲解を緑、最適解を黄色の輪で）
  if (kind === 2) drawKnapsack(); else drawGraph();

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('1：K4 の全域木（マトロイド）　2：ナップサック　3：マッチング　スペース：1 回　A：自動 ' + (auto ? 'ON' : 'off') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('価値をランダムに決めて「貪欲解」と「全列挙の最適解」を比べる。緑 = 貪欲法が選んだもの、黄色の輪 = 最適解', 20, 66);

  // 右：統計
  let px = width * 0.5, py = 130, pw = width - px - 60, ph = 300;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, pw + 40, ph + 230, 12);
  let rate = trials ? matches / trials : 0;
  fill(trials && rate === 1 ? 130 : trials ? 5 : 0, trials ? 80 : 0, 100); textSize(26);
  text(trials ? '一致率 ' + nf(rate * 100, 1, 1) + '%　（' + matches + ' / ' + trials + ' 回）' : 'スペースで試す', px, py);
  fill(0, 0, 70); textSize(15);
  text(kind === 1 ? 'マトロイドなので何回やっても一致する（定理）' : '一致しない回がある → マトロイドではない', px, py + 26);
  // ヒストグラム
  let hy = py + 60, hh = ph - 80, mx = max(1, ...bins);
  stroke(0, 0, 35); strokeWeight(1); line(px, hy + hh, px + pw, hy + hh);
  for (let b = 0; b < 20; b++) {
    let h = (bins[b] / mx) * hh, bw = pw / 20;
    noStroke(); fill(b === 19 ? 130 : 5, 70, 90);
    rect(px + b * bw + 2, hy + hh - h, bw - 4, h);
    if (bins[b]) { fill(0, 0, 100); textSize(11); textAlign(CENTER, BASELINE); text(bins[b], px + b * bw + bw / 2, hy + hh - h - 4); }
  }
  textAlign(LEFT, BASELINE); fill(0, 0, 70); textSize(13);
  text('貪欲／最適 = 0.5', px, hy + hh + 18); text('1.0（一致）', px + pw - 70, hy + hh + 18);
  if (last) {
    fill(0, 0, 100); textSize(16);
    text('直近：貪欲 {' + last.greedy.map((i) => elems[i].name).join(' ') + '} = ' + last.gv + '　最適 {' + last.best.map((i) => elems[i].name).join(' ') + '} = ' + last.bv + (last.gv === last.bv ? '　一致 ✓' : '　✗'), px, hy + hh + 52);
  }
  fill(0, 0, 70); textSize(14);
  text('定理（Rado 1957 / Edmonds 1971）：集合族が (I1)(I2) を満たすとき、', px, hy + hh + 90);
  text('どんな重みでも貪欲法が最大重みの独立集合を返す ⇔ その集合族はマトロイド', px, hy + hh + 110);
}

function drawGraph() {
  let g = last ? last.greedy : [], b = last ? last.best : [];
  for (let i = 0; i < elems.length; i++) {
    let e = elems[i], p = nodes[e.a], q = nodes[e.b];
    if (b.includes(i)) { stroke(50, 90, 100); strokeWeight(14); line(p.x, p.y, q.x, q.y); }
    stroke(g.includes(i) ? 130 : 0, g.includes(i) ? 85 : 0, g.includes(i) ? 100 : 40); strokeWeight(g.includes(i) ? 6 : 2.5);
    line(p.x, p.y, q.x, q.y);
    noStroke(); fill(0, 0, 100); textSize(13); textAlign(CENTER, CENTER);
    text(e.name + (last ? ' (' + e.v + ')' : ''), (p.x + q.x) / 2 + 12, (p.y + q.y) / 2 - 12);
  }
  for (let i = 0; i < nodes.length; i++) { stroke(0, 0, 100); strokeWeight(2); fill(50, 40, 85); circle(nodes[i].x, nodes[i].y, 26); }
}
function drawKnapsack() {
  let g = last ? last.greedy : [], b = last ? last.best : [];
  let x0 = 60, y0 = height * 0.6, bw = 56;
  for (let i = 0; i < elems.length; i++) {
    let e = elems[i], h = e.w * 16, x = x0 + i * (bw + 24);
    if (b.includes(i)) { noFill(); stroke(50, 90, 100); strokeWeight(4); rect(x - 6, y0 - h - 6, bw + 12, h + 12, 8); }
    stroke(0, 0, 60); strokeWeight(1.5); fill(g.includes(i) ? 130 : 0, g.includes(i) ? 70 : 0, g.includes(i) ? 75 : 30);
    rect(x, y0 - h, bw, h, 6);
    noStroke(); fill(0, 0, 100); textSize(13); textAlign(CENTER, CENTER);
    text(e.name, x + bw / 2, y0 + 16); text('重さ ' + e.w, x + bw / 2, y0 - h - 30);
    if (last) { fill(50, 80, 100); text('価値 ' + e.v, x + bw / 2, y0 - h - 14); }
  }
  fill(0, 0, 70); textSize(14); textAlign(LEFT, BASELINE); text('容量 ' + capacity, x0, y0 + 44);
}

function keyPressed() {
  if (key === ' ') trial();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') resetStats();
  if (key === '1' || key === '2' || key === '3') { kind = +key; build(); }
}

// ---------- やってみよう ----------
// 1. 1 を自動で 1000 回まわして 100% を確かめる。2・3 は何%くらい？ 容量（capacity）を変えると？
// 2. 価値を 1〜20 でなく 1〜3 にすると（trial の random）、同点が増えて一致率はどう変わる？
// 3. K4 でなく 01 のランダムなグラフにしても 100% になるか試す（elems と isIndep を 01 から持ってくる）
// 4. 「貪欲法が最適 ⇔ マトロイド」。逆向き（最適なら必ずマトロイド）は、反例から交換公理の違反を作る証明

// ==================================================
// ここから下は「マトロイドの道具」（union–find）
// ==================================================
function makeUF(n) {
  let parent = [...Array(n).keys()];
  let find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; parent[a] = b; return true; };
  return { find, union };
}
