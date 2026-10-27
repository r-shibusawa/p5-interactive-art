// ============================================
// 08 クルスカル法
// 辺を軽い順に見て、「別々の木をつなぐ辺」なら採用、「同じ木の中（閉路ができる）」なら捨てる
// どの点がどの木か ＝ 素集合データ構造（代表元を探す / 2 つの集合を合わせる）で管理する
// 計算量 O(E log V)：ほとんどが最初の並べ替え
// 操作：スペース＝再生・停止 / →＝1 手 / 線の数字クリック＝重み / 1・2＝お手本 / R＝最初から
//       クリック＝点 / ドラッグ＝線 / C＝全部消す
// ============================================

let G, GA;
let sorted = [], idx = -1, A = new Set(), rejected = new Set();
let parent = [], rank = [];
let curE = null, findU = -1, findV = -1;
const PAL = ['#ff5e7e', '#5ee6ff', '#ffd166', '#7cf4a6', '#c4b5fd', '#ffa25e', '#f0abfc', '#93c5fd', '#fca5a5', '#bef264', '#fde68a', '#a5f3fc'];
const CODE = [
  'クルスカル法(G)',
  '  A ← 空（採用した辺の集まり）',
  '  点を 1 つずつ、別々の集合にする',
  '  辺を重みの小さい順に並べる',
  '  辺 (u, v) を小さい順に 1 本ずつ見る',
  '      u の代表元 ≠ v の代表元 なら（別の木）',
  '          (u, v) を A に入れる',
  '          u の集合と v の集合を合わせる',
  '  A を返す',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 70, y: 150, w: width - 720, h: height - 400 };
  G = makeGraph(false);
  if (k === 1) { // 07 と同じ 9 点のグラフ
    placeGraph(G, [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.45, 0.55], [1, 0.5], [0, 1], [0.5, 1], [1, 1]], GA, 'abcdefghi'.split(''));
    for (let [u, v, w] of [[0, 1, 6], [1, 2, 3], [0, 3, 2], [1, 4, 9], [2, 5, 5], [3, 4, 4], [4, 5, 8], [3, 6, 7], [4, 7, 1], [5, 8, 6], [6, 7, 3], [7, 8, 10], [0, 4, 11], [4, 8, 5]]) addEdge(G, u, v, w);
  } else {
    randomSeed(11);
    let pos = [];
    for (let i = 0; i < 12; i++) pos.push([random(), random()]);
    placeGraph(G, pos, GA, 'abcdefghijkl'.split(''));
    for (let i = 0; i < 12; i++) { // 近い 3 点とつなぐ
      let near = G.nodes.map((n, j) => [j, dist(n.x, n.y, G.nodes[i].x, G.nodes[i].y)]).filter((p) => p[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 3);
      for (let [j, d] of near) addEdge(G, i, j, max(1, round(d / 25)));
    }
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  sorted = [...G.edges].sort((a, b) => a.w - b.w); idx = -1; A = new Set(); rejected = new Set();
  parent = G.nodes.map((n, i) => i); rank = G.nodes.map(() => 0); curE = null; findU = findV = -1;
}

// 素集合森（ランクによる合併 ＋ 経路圧縮）
function findSet(x) { if (parent[x] !== x) parent[x] = findSet(parent[x]); return parent[x]; }
function link(x, y) { if (rank[x] > rank[y]) parent[y] = x; else { parent[x] = y; if (rank[x] === rank[y]) rank[y]++; } }

function* kruskal() {
  yield { line: 1, msg: 'A = ∅' };
  parent = G.nodes.map((n, i) => i); rank = G.nodes.map(() => 0);
  yield { line: 2, msg: '点を 1 つずつ別々の集合に（' + G.nodes.length + ' 本の木）' };
  sorted = [...G.edges].sort((a, b) => a.w - b.w);
  yield { line: 3, msg: '辺を軽い順に並べる（右の列）' };
  for (idx = 0; idx < sorted.length; idx++) {
    curE = sorted[idx];
    let lu = G.nodes[curE.u].label, lv = G.nodes[curE.v].label;
    yield { line: 4, msg: lu + '–' + lv + '（重み ' + curE.w + '）を見る' };
    findU = findSet(curE.u); findV = findSet(curE.v);
    yield { line: 5, msg: lu + ' の代表 = ' + G.nodes[findU].label + '、' + lv + ' の代表 = ' + G.nodes[findV].label + (findU === findV ? ' → 同じ木：閉路になるので捨てる' : ' → 別の木') };
    if (findU !== findV) {
      A.add(curE);
      yield { line: 6, msg: lu + '–' + lv + ' を A に追加' };
      link(findU, findV);
      yield { line: 7, msg: '合併：2 つの木を 1 つに（残り ' + new Set(G.nodes.map((n, i) => findSet(i))).size + ' 本）' };
      if (A.size === G.nodes.length - 1) { idx++; break; }
    } else rejected.add(curE);
    findU = findV = -1;
  }
  curE = null; findU = findV = -1;
  lastMsg = '完了：A の重み ＝ ' + [...A].reduce((s, e) => s + e.w, 0) + '（' + A.size + ' 本）';
}

function draw() {
  background(C.bg);
  autoRun();
  hud('08 クルスカル法', ['スペース＝再生/停止　→＝1 手　線の数字クリック＝重み　1・2＝お手本　R＝最初から　クリック＝点　ドラッグ＝線　C＝消す',
    '点の色＝属している木（素集合）　赤い太線＝A　灰色の点線＝捨てた辺（閉路になる）']);
  let rootColor = (i) => PAL[findSet(i) % PAL.length];
  for (let e of G.edges) {
    let col = C.edge, w = 2, dash = null;
    if (rejected.has(e)) { col = withA(C.dim, 90); dash = [5, 6]; }
    if (A.has(e)) { col = C.accent; w = 6; }
    if (e === curE) { col = C.yel; w = 6; }
    drawEdge(G.nodes[e.u], G.nodes[e.v], { col, w, dash, label: e.w });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, runner ? rootColor(i) : C.white, { ring: i === findU || i === findV ? C.yel : null });
  statusLine(40, height - 34);
  // 並べた辺の列
  let lx = width - 640, ly = 110, rowH = min(24, (height - 160) / max(1, sorted.length));
  panelBox(lx, ly, 90, rowH * sorted.length + 36, '辺（軽い順）');
  for (let k = 0; k < sorted.length; k++) {
    let e = sorted[k], y = ly + 30 + k * rowH;
    noStroke(); fill(A.has(e) ? C.accent : rejected.has(e) ? '#2a2e44' : e === curE ? C.yel : C.panel); rect(lx + 6, y, 78, rowH - 3, 4);
    fill(A.has(e) || e === curE ? C.bg : rejected.has(e) ? C.dim : C.text); textSize(min(13, rowH * 0.6)); textAlign(LEFT, CENTER);
    text(G.nodes[e.u].label + G.nodes[e.v].label + '  ' + e.w, lx + 14, y + rowH / 2 - 1);
  }
  let y = drawCode(CODE, curLine, width - 540, 110, 520);
  drawForest(width - 540, y + 16, 520, height - y - 60);
}

// 素集合森（parent のポインタ）を描く
function drawForest(x, y, w, h) {
  panelBox(x, y, w, h, '素集合森（矢印は parent。根が代表元）');
  let n = G.nodes.length; if (!n) return;
  let kids = G.nodes.map(() => []), roots = [];
  for (let i = 0; i < n; i++) (parent[i] === i ? roots : kids[parent[i]]).push(i);
  let pos = [], cx = x + 20;
  let width_ = (i) => max(1, kids[i].reduce((s, c) => s + width_(c), 0));
  let total = roots.reduce((s, r) => s + width_(r), 0), unit = (w - 40) / max(1, total);
  let place = (i, x0, depth) => { let ww = width_(i) * unit; pos[i] = { x: x0 + ww / 2, y: y + 50 + depth * 46 }; let xx = x0; for (let c of kids[i]) { place(c, xx, depth + 1); xx += width_(c) * unit; } };
  for (let r of roots) { place(r, cx, 0); cx += width_(r) * unit; }
  for (let i = 0; i < n; i++) if (parent[i] !== i && pos[i] && pos[parent[i]]) drawEdge(pos[i], pos[parent[i]], { directed: true, r: 14, col: C.dim, w: 1.5 });
  for (let i = 0; i < n; i++) if (pos[i]) drawNode(pos[i].x, pos[i].y, G.nodes[i].label, PAL[findSet(i) % PAL.length], { r: 14 });
}

function mousePressed() { if (weightClick(G, 1, 15)) { resetRun(); ed.from = -2; return; } editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() { if (editRelease(G, GA, floor(random(1, 10)))) resetRun(); }
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(kruskal()); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if (key === '1' || key === '2') preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. お手本 1 で、A の重みの合計が 29 になるか確かめよう（重み 6 の辺はどちらが選ばれる？）
// 2. 素集合森の高さは低いまま（ランク＋経路圧縮）。点を増やしても高くならない？
// 3. 「重い順」に並べて同じことをすると、最大全域木ができる



// ==================================================
// ここから下は「グラフを描く・動かすための道具」です（シリーズ14 共通）
// （中身は読まなくても OK。消さないでね）
// ==================================================

// 色（未訪問＝白、発見済み＝灰、完了＝黒 ＋ 強調色）
const C = {
  bg: '#0d1020', panel: '#161a2e', edge: '#4a5275', text: '#e8ebf5', dim: '#8a92b0',
  white: '#f4f4f6', gray: '#9a9cab', black: '#22242e',
  accent: '#ff5e7e', yel: '#ffd166', cyan: '#5ee6ff', green: '#7cf4a6', violet: '#c4b5fd', orange: '#ffa25e'
};
function withA(hex, a) { let c = color(hex); c.setAlpha(a); return c; }
function fmt(d) { return d === Infinity ? '∞' : d === -Infinity ? '-∞' : d === undefined || d === null ? '–' : String(d); }

// ---------- グラフ G = { nodes: [{x, y, label}], edges: [{u, v, w}], directed } ----------
function makeGraph(directed) { return { nodes: [], edges: [], directed: directed }; }
// 位置を 0〜1 の割合で書いたお手本を、画面の範囲 area に置く
function placeGraph(G, pos, area, labels) {
  G.nodes = pos.map((p, i) => ({ x: area.x + p[0] * area.w, y: area.y + p[1] * area.h, label: labels ? labels[i] : String(i) }));
}
function addEdge(G, u, v, w = 1) {
  if (u === v || u < 0 || v < 0) return;
  let same = G.multi ? null : G.edges.find((e) => (e.u === u && e.v === v) || (!G.directed && e.u === v && e.v === u));
  if (same) { same.w = w; return; }
  G.edges.push({ u, v, w });
}
// 隣接リスト Adj[u] = [{ v, w }, ...]（相手のラベル順。G.keepOrder なら線を足した順）
function adjList(G) {
  let A = G.nodes.map(() => []);
  for (let e of G.edges) {
    A[e.u].push({ v: e.v, w: e.w, e });
    if (!G.directed) A[e.v].push({ v: e.u, w: e.w, e });
  }
  if (!G.keepOrder) for (let a of A) a.sort((p, q) => (G.nodes[p.v].label < G.nodes[q.v].label ? -1 : 1));
  return A;
}
function hasReverse(G, e) { return G.directed && G.edges.some((f) => f.u === e.v && f.v === e.u); }
function findEdge(G, u, v) { return G.edges.find((e) => (e.u === u && e.v === v) || (!G.directed && e.u === v && e.v === u)); }

// ---------- 描く ----------
function nodeAt(list, x, y, r = 26) { for (let i = list.length - 1; i >= 0; i--) if (dist(x, y, list[i].x, list[i].y) < r) return i; return -1; }
function edgePoint(a, b, bend, t) {
  let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, L = max(1, sqrt(dx * dx + dy * dy));
  let cx = mx - (dy / L) * bend * 2, cy = my + (dx / L) * bend * 2, u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y };
}
// 線（矢印）。o = { directed, col, w, bend, label, labelCol, labelT, r, dash }
function drawEdge(a, b, o = {}) {
  if (!a || !b || a === b) return;
  let r = o.r === undefined ? 22 : o.r, bend = o.bend || 0, t0 = 0, t1 = 1;
  for (let i = 0; i <= 50; i++) { let p = edgePoint(a, b, bend, i / 50); if (dist(p.x, p.y, a.x, a.y) >= r) { t0 = i / 50; break; } }
  for (let i = 50; i >= 0; i--) { let p = edgePoint(a, b, bend, i / 50); if (dist(p.x, p.y, b.x, b.y) >= r + 2) { t1 = i / 50; break; } }
  let col = o.col || C.edge, w = o.w || 2;
  stroke(col); strokeWeight(w); noFill();
  if (o.dash) drawingContext.setLineDash(o.dash);
  let prev = edgePoint(a, b, bend, t0);
  for (let i = 1; i <= 16; i++) { let p = edgePoint(a, b, bend, t0 + ((t1 - t0) * i) / 16); line(prev.x, prev.y, p.x, p.y); prev = p; }
  drawingContext.setLineDash([]);
  if (o.directed) {
    let q = edgePoint(a, b, bend, t1 - 0.05), ang = atan2(prev.y - q.y, prev.x - q.x), s = 9 + w;
    noStroke(); fill(col);
    triangle(prev.x, prev.y, prev.x - cos(ang - 0.42) * s, prev.y - sin(ang - 0.42) * s, prev.x - cos(ang + 0.42) * s, prev.y - sin(ang + 0.42) * s);
  }
  if (o.label !== undefined && o.label !== '') {
    let m = edgePoint(a, b, bend, o.labelT || 0.5), s = String(o.label);
    textSize(14); textStyle(BOLD);
    let tw = textWidth(s) + 12;
    stroke(col); strokeWeight(1.5); fill(C.bg);
    rect(m.x - tw / 2, m.y - 11, tw, 22, 6);
    noStroke(); fill(o.labelCol || C.text); textAlign(CENTER, CENTER);
    text(s, m.x, m.y + 1);
    textStyle(NORMAL);
  }
}
function edgeLabelAt(a, b, bend, x, y) { let m = edgePoint(a, b, bend, 0.5); return dist(x, y, m.x, m.y) < 16; }
// 点。state = 'white' | 'gray' | 'black' | 色。o = { r, ring, below, above, textCol }
function drawNode(x, y, label, state, o = {}) {
  let r = o.r || 22;
  let f = state === 'gray' ? C.gray : state === 'black' ? C.black : state === 'white' || !state ? C.white : state;
  if (o.ring) { noFill(); stroke(o.ring); strokeWeight(4); circle(x, y, r * 2 + 12); }
  stroke(state === 'black' ? C.dim : C.bg); strokeWeight(2); fill(f);
  circle(x, y, r * 2);
  noStroke(); fill(o.textCol || (brightness(color(f)) > 60 ? C.bg : C.text));
  textAlign(CENTER, CENTER); textStyle(BOLD); textSize(label.length > 3 ? r * 0.45 : label.length > 2 ? r * 0.55 : r * 0.8);
  text(label, x, y + 1);
  textStyle(NORMAL);
  if (o.below !== undefined) tagText(o.below, x, y + r + 13, o.belowCol || C.yel);
  if (o.above !== undefined) tagText(o.above, x, y - r - 12, o.aboveCol || C.cyan);
}
// 背景つきの小さな文字（線と重なっても読める）
function tagText(s, x, y, col) {
  s = String(s); textSize(14); textAlign(CENTER, CENTER);
  let tw = textWidth(s) + 8;
  noStroke(); fill(withA(C.bg, 210)); rect(x - tw / 2, y - 9, tw, 18, 4);
  fill(col); text(s, x, y);
}
// 見出しと説明
function hud(title, lines) {
  noStroke(); textAlign(LEFT, BASELINE);
  fill(C.accent); textSize(22); textStyle(BOLD); text(title, 20, 36); textStyle(NORMAL);
  fill(C.dim); textSize(14);
  for (let i = 0; i < lines.length; i++) text(lines[i], 20, 60 + i * 20);
}
// 枠
function panelBox(x, y, w, h, title) {
  noStroke(); fill(C.panel); rect(x, y, w, h, 10);
  if (title) { fill(C.dim); textSize(13); textAlign(LEFT, BASELINE); text(title, x + 12, y + 20); }
}
// 疑似コード（日本語で書き直したもの）。cur 行を強調
function drawCode(lines, cur, x, y, w) {
  let lh = 19;
  panelBox(x, y, w, lines.length * lh + 16);
  textFont('monospace'); textSize(12.5); textAlign(LEFT, BASELINE);
  for (let i = 0; i < lines.length; i++) {
    if (i === cur) { noStroke(); fill(withA(C.accent, 60)); rect(x + 4, y + 8 + i * lh, w - 8, lh, 4); fill(C.accent); rect(x + 4, y + 8 + i * lh, 3, lh); }
    noStroke(); fill(i === cur ? C.text : C.dim);
    text(lines[i], x + 12, y + 22 + i * lh);
  }
  textFont('sans-serif');
  return y + lines.length * lh + 16;
}
// 箱の列（キュー・スタック・リスト）。items は文字列か { t, col }
function drawBoxes(label, items, x, y, maxW) {
  noStroke(); fill(C.dim); textSize(13); textAlign(LEFT, CENTER); text(label, x, y + 16);
  let bx = x + textWidth(label) + 10;
  for (let i = 0; i < items.length; i++) {
    let it = typeof items[i] === 'object' ? items[i] : { t: String(items[i]) };
    textSize(14); let bw = max(34, textWidth(it.t) + 14);
    if (maxW && bx + bw > x + maxW) { fill(C.dim); text('…', bx + 4, y + 16); break; }
    stroke(C.edge); strokeWeight(1.5); fill(it.col || C.panel); rect(bx, y, bw, 32, 6);
    noStroke(); fill(it.col ? C.bg : C.text); textAlign(CENTER, CENTER); text(it.t, bx + bw / 2, y + 17);
    textAlign(LEFT, CENTER); bx += bw + 6;
  }
  if (items.length === 0) { fill(C.dim); text('（空）', bx, y + 16); }
}

// ---------- アルゴリズムを 1 手ずつ動かす（ジェネレータ） ----------
// アルゴリズムを function* で書き、1 手ごとに yield { line, msg } する
let runner = null, playing = false, speed = 4, finished = false, curLine = -1, lastMsg = '';
function startRun(gen) { runner = gen; finished = false; curLine = -1; lastMsg = ''; }
function stepRun() {
  if (!runner || finished) return;
  let r = runner.next();
  if (r.done) { finished = true; playing = false; return; }
  if (r.value) { if (r.value.line !== undefined) curLine = r.value.line; if (r.value.msg !== undefined) lastMsg = r.value.msg; }
}
function autoRun() { if (playing && runner && !finished && frameCount % max(1, round(60 / speed)) === 0) stepRun(); }
// スペース＝再生/停止、→＝1 手、↑↓＝速さ、S＝画像を保存。扱ったら true
function runKeys() {
  if (key === ' ') { if (finished) return false; playing = !playing; return true; }
  if (key === 'ArrowRight') { playing = false; stepRun(); return true; }
  if (key === 'ArrowUp') { speed = min(60, speed * 2); return true; }
  if (key === 'ArrowDown') { speed = max(0.5, speed / 2); return true; }
  if (key === 's' || key === 'S') { saveCanvas('graph', 'png'); return true; }
  return false;
}
function statusLine(x, y) {
  noStroke(); textAlign(LEFT, BASELINE); textSize(15);
  fill(finished ? C.green : C.yel);
  text((finished ? '✔ 終了　' : playing ? '▶ 再生中　' : '⏸ 停止中　') + lastMsg, x, y);
  fill(C.dim); textSize(12); text('スペース 再生/停止　→ 1 手　↑↓ 速さ ×' + speed, x, y + 18);
}

// ---------- マウスでグラフを編集 ----------
// クリック＝点を追加、点から点へドラッグ＝線を追加、点から空白へドラッグ＝点を移動
let ed = { from: -1, sx: 0, sy: 0, moved: false, clicked: -1 };
function inArea(a, x, y) { return x > a.x - 20 && x < a.x + a.w + 20 && y > a.y - 20 && y < a.y + a.h + 20; }
function editPress(G, area) { ed.from = inArea(area, mouseX, mouseY) ? nodeAt(G.nodes, mouseX, mouseY) : -2; ed.sx = mouseX; ed.sy = mouseY; ed.moved = false; }
function editDrag() { if (dist(mouseX, mouseY, ed.sx, ed.sy) > 6) ed.moved = true; }
// 返り値: 'node' | 'edge' | 'move' | 'click'（点をクリック。番号は ed.clicked） | null
function editRelease(G, area, newWeight = 1) {
  let from = ed.from; ed.from = -1;
  if (from === -2 || !inArea(area, mouseX, mouseY)) return null;
  let to = nodeAt(G.nodes, mouseX, mouseY);
  if (from < 0 && !ed.moved && to < 0 && G.nodes.length < 26) {
    G.nodes.push({ x: mouseX, y: mouseY, label: nextLabel(G) });
    return 'node';
  }
  if (from >= 0 && !ed.moved) { ed.clicked = from; return 'click'; }
  if (from >= 0 && to >= 0 && to !== from) { addEdge(G, from, to, newWeight); return 'edge'; }
  if (from >= 0 && to < 0 && ed.moved) { G.nodes[from].x = mouseX; G.nodes[from].y = mouseY; return 'move'; }
  return null;
}
function nextLabel(G) { let used = new Set(G.nodes.map((n) => n.label)); for (let c of 'abcdefghijklmnopqrstuvwxyz') if (!used.has(c)) return c; return String(G.nodes.length); }
function editRubber(G) {
  if (ed.from >= 0 && ed.moved && mouseIsPressed && G.nodes[ed.from]) {
    stroke(C.yel); strokeWeight(2); drawingContext.setLineDash([6, 6]);
    line(G.nodes[ed.from].x, G.nodes[ed.from].y, mouseX, mouseY);
    drawingContext.setLineDash([]);
  }
}
// 線の数字（重み）をクリック → 重みを 1 つ増やす（Shift で減らす）。範囲 lo〜hi で一周
function weightClick(G, lo = 1, hi = 9) {
  for (let e of G.edges) {
    if (edgeLabelAt(G.nodes[e.u], G.nodes[e.v], hasReverse(G, e) ? 14 : 0, mouseX, mouseY)) {
      let d = keyIsDown(SHIFT) ? -1 : 1;
      e.w += d;
      if (e.w > hi) e.w = lo;
      if (e.w < lo) e.w = hi;
      return true;
    }
  }
  return false;
}
