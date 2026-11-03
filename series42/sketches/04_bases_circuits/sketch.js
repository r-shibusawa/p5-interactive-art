// ============================================
// 04 基とサーキット
// グラフ的マトロイドの「基」（= 全域木、最大の独立集合）と「サーキット」（= 閉路、最小の従属集合）を全部列挙して順に見る
//   基交換公理：基 B1 から辺 e を抜いても、別の基 B2 の辺 f を入れれば また基になる（スペースでアニメーション）
//   基はどれも同じ大きさ（= 階数）。サーキットから 1 本抜くと必ず独立
// ←→ = 次の基／サーキット / B・K = 基 ⇄ サーキットの表示 / スペース = 基の交換 / ノードをドラッグ / R = ランダムなグラフ / 1 = K4
// ============================================

let nodes = [], edges = [];
let bases = [], circuits = [];     // 辺番号の配列の配列
let viewMode = 'B';                // 'B' = 基, 'K' = サーキット
let idx = 0;
let dragI = -1;
let anim = null;                   // 交換アニメーション {from, e, f, to, t}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  makeK4();
}

function makeK4() {
  let cx = width * 0.33, cy = height * 0.55, r = min(width, height) * 0.26;
  nodes = [0, 1, 2, 3].map((i) => ({ x: cx + r * cos(TWO_PI * i / 4 - HALF_PI + QUARTER_PI), y: cy + r * sin(TWO_PI * i / 4 - HALF_PI + QUARTER_PI) }));
  edges = [];
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) edges.push({ a, b });
  enumerate();
}
function randomGraph() {
  let n = 5, m = 7;
  nodes = []; edges = [];
  let cx = width * 0.33, cy = height * 0.55, r = min(width, height) * 0.27;
  for (let i = 0; i < n; i++) nodes.push({ x: cx + r * cos(TWO_PI * i / n - HALF_PI) + random(-20, 20), y: cy + r * sin(TWO_PI * i / n - HALF_PI) + random(-20, 20) });
  let order = shuffle([...Array(n).keys()]);
  for (let i = 1; i < n; i++) edges.push({ a: order[i], b: order[floor(random(i))] });
  let tries = 0;
  while (edges.length < m && tries++ < 200) {
    let a = floor(random(n)), b = floor(random(n));
    if (a === b || edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) continue;
    edges.push({ a, b });
  }
  enumerate();
}

// ★ 全部の部分集合を調べて、基とサーキットを集める
function enumerate() {
  let n = nodes.length, E = edges.length;
  let rk = forestRank(n, edges, [...Array(E).keys()]);
  bases = []; circuits = [];
  for (let mask = 1; mask < (1 << E); mask++) {
    let sub = []; for (let i = 0; i < E; i++) if (mask & (1 << i)) sub.push(i);
    let ind = isForest(n, edges, sub);
    if (ind && sub.length === rk) bases.push(sub);
    if (!ind) {   // 最小の従属集合 = どの 1 本を抜いても独立
      let minimal = sub.every((i) => isForest(n, edges, sub.filter((j) => j !== i)));
      if (minimal) circuits.push(sub);
    }
  }
  idx = 0; anim = null;
}

// ★ 基の交換：B1 から e を抜き、入れると基になる f を探す
function startExchange() {
  if (viewMode !== 'B' || !bases.length) return;
  let B1 = bases[idx];
  let e = B1[floor(random(B1.length))];
  let rest = B1.filter((i) => i !== e);
  let cands = [];
  for (let f = 0; f < edges.length; f++) if (!B1.includes(f) && isForest(nodes.length, edges, rest.concat([f]))) cands.push(f);
  if (!cands.length) return;
  let f = cands[floor(random(cands.length))];
  let B2 = rest.concat([f]).sort((p, q) => p - q);
  let to = bases.findIndex((b) => b.length === B2.length && b.every((v, k) => v === B2[k]));
  anim = { from: idx, e, f, to, t: 0, cands };
}

function draw() {
  background(30, 30, 9);
  let list = viewMode === 'B' ? bases : circuits;
  if (list.length) idx = constrain(idx, 0, list.length - 1);
  let cur = list.length ? list[idx] : [];
  if (anim) { anim.t += 1 / 90; if (anim.t >= 1) { idx = anim.to; anim = null; } }

  // 辺
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = nodes[e.a], q = nodes[e.b];
    let on = cur.includes(i);
    let hue = viewMode === 'B' ? 130 : 5, wgt = on ? 7 : 2.5, bri = on ? 100 : 45, sat = on ? 85 : 0;
    if (anim) {
      if (i === anim.e) { hue = 5; sat = 90; bri = 100; wgt = lerp(7, 1, anim.t); }
      if (i === anim.f) { hue = 50; sat = 90; bri = 100; wgt = lerp(1, 7, anim.t); on = true; }
      if (anim.cands.includes(i) && i !== anim.f && !on) { hue = 50; sat = 50; bri = 70; wgt = 3; }
    }
    stroke(hue, sat, bri); strokeWeight(wgt);
    line(p.x, p.y, q.x, q.y);
    noStroke(); fill(0, 0, on ? 100 : 60); textSize(13); textAlign(CENTER, CENTER);
    text('e' + (i + 1), (p.x + q.x) / 2 + 10, (p.y + q.y) / 2 - 10);
  }
  for (let i = 0; i < nodes.length; i++) {
    stroke(0, 0, 100); strokeWeight(2); fill(30, 40, 85); circle(nodes[i].x, nodes[i].y, 30);
    noStroke(); fill(0, 0, 10); textSize(14); text(i + 1, nodes[i].x, nodes[i].y);
  }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('←→：次へ　B：基（全域木）　K：サーキット（閉路）　スペース：基の交換　ドラッグ：ノード　R：ランダム　1：K4', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('基 = これ以上足せない独立集合（全部同じ大きさ）。サーキット = これ以上減らせない従属集合（1 本抜けば森）', 20, 66);

  // 右のリスト
  let px = width - 400, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 390, height - py - 20, 12);
  fill(viewMode === 'B' ? 130 : 5, 80, 100); textSize(26);
  text((viewMode === 'B' ? '基（全域木）' : 'サーキット（閉路）') + '　' + (idx + 1) + ' / ' + list.length, px, py);
  fill(0, 0, 100); textSize(17);
  text(viewMode === 'B' ? '階数 = ' + (bases[0] ? bases[0].length : 0) + '　（どの基も同じ大きさ）' : 'サーキットの大きさは ' + [...new Set(circuits.map((c) => c.length))].sort().join('・'), px, py + 32);
  if (anim) {
    fill(50, 90, 100); textSize(17);
    text('e' + (anim.e + 1) + ' を抜く → e' + (anim.f + 1) + ' を入れる（候補 ' + anim.cands.map((c) => 'e' + (c + 1)).join(' ') + '）', px, py + 60);
    fill(0, 0, 70); textSize(14);
    text('B1 − e + f がまた基になる（基交換公理）', px, py + 82);
  }
  textSize(15);
  let rowH = 22, maxRows = floor((height - py - 140) / rowH);
  for (let k = 0; k < min(list.length, maxRows); k++) {
    let on = k === idx;
    fill(on ? (viewMode === 'B' ? 130 : 5) : 0, on ? 80 : 0, on ? 100 : 65);
    text((on ? '▶ ' : '　 ') + list[k].map((i) => 'e' + (i + 1)).join(' '), px, py + 120 + k * rowH);
  }
  if (list.length > maxRows) { fill(0, 0, 50); text('… 他 ' + (list.length - maxRows) + ' 個', px, py + 120 + maxRows * rowH); }
}

function nearestNode(mx, my) {
  let best = -1, bd = 20;
  for (let i = 0; i < nodes.length; i++) { let d = dist(mx, my, nodes[i].x, nodes[i].y); if (d < bd) { bd = d; best = i; } }
  return best;
}
function mousePressed() { dragI = nearestNode(mouseX, mouseY); }
function mouseDragged() { if (dragI >= 0) { nodes[dragI].x = constrain(mouseX, 20, width - 420); nodes[dragI].y = constrain(mouseY, 90, height - 20); } }
function mouseReleased() { dragI = -1; }
function keyPressed() {
  let list = viewMode === 'B' ? bases : circuits;
  if (key === RIGHT_ARROW && list.length) { idx = (idx + 1) % list.length; anim = null; }
  if (key === LEFT_ARROW && list.length) { idx = (idx + list.length - 1) % list.length; anim = null; }
  if (key === 'b' || key === 'B') { viewMode = 'B'; idx = 0; anim = null; }
  if (key === 'k' || key === 'K') { viewMode = 'K'; idx = 0; anim = null; }
  if (key === ' ') startExchange();
  if (key === 'r' || key === 'R') randomGraph();
  if (key === '1') makeK4();
}

// ---------- やってみよう ----------
// 1. K4 の基は 16 個、サーキットは 7 個（三角形 4 つと四角形 3 つ）。全部めくって確かめよう
// 2. スペースを何回も押す。抜いた辺によって「入れられる候補」の数が変わる。候補が 1 本だけのときはどんなとき？
// 3. R で辺が 1 本だけのグラフや、ぶら下がりの辺があるグラフが出たら、その辺はどの基にも入っている（コループ）
// 4. 基の補集合（入っていない辺）を全部並べると、それも「別のマトロイド」の基になっている（09 の双対）

// ==================================================
// ここから下は「マトロイドの道具」（union–find と森の判定）
// ==================================================
function makeUF(n) {
  let parent = [...Array(n).keys()];
  let find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  let union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; parent[a] = b; return true; };
  return { find, union };
}
function isForest(n, edgeList, sub) {
  let uf = makeUF(n);
  for (let i of sub) if (!uf.union(edgeList[i].a, edgeList[i].b)) return false;
  return true;
}
function forestRank(n, edgeList, sub) {
  let uf = makeUF(n), r = 0;
  for (let i of sub) if (uf.union(edgeList[i].a, edgeList[i].b)) r++;
  return r;
}
