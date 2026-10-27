// ============================================
// 12 ダイクストラ法 ─ 二分ヒープつき
// 負の重みがないとき、d が最小の点を取り出して確定（S に入れる）し、その隣を緩和する
// Q は d をキーにした最小優先度つきキュー。ここでは二分ヒープで実装し、木の形で見せる
// 最小の取り出しと d の書きかえ（ヒープ内で上へ）がそれぞれ O(log V) → 全体 O((V + E) log V)
// 操作：点をクリック＝始点 / スペース＝再生・停止 / →＝1 手 / 1＝5 点の例 / 2＝格子 / 3＝負の重み（失敗例）
//       線の数字クリック＝重み / ドラッグ＝矢印 / 空白クリック＝点 / R＝最初から / C＝全部消す
// ============================================

let G, GA;
let src = 0, mode = 1;
let d = [], pi = [], inS = [];
let heap = [];        // 二分ヒープ（点の番号の配列）
let curU = -1, curE = null, improved = null, swapA = -1, swapB = -1;
let truth = null;     // 3 の失敗例で比べる正しい答え（ベルマン–フォード）
const CODE = [
  'ダイクストラ法(G, s)',
  '  全部の d ← ∞、π ← なし、s.d ← 0',
  '  確定した点の集まり S ← 空',
  '  全部の点を d の小さい順に出てくるヒープ Q へ',
  '  Q が空になるまでくり返す',
  '      u ← Q から d 最小の点を取り出す',
  '      u を S に入れる（d が確定）',
  '      u から出る辺 u → v それぞれについて',
  '          緩和(u → v)   // d が減ったらヒープの中で上へ',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  mode = k;
  GA = { x: 70, y: 160, w: width - 680, h: height - 400 };
  G = makeGraph(true);
  if (k === 1) { // 5 点の例（最初に見つけた d が、あとで何度か短くなる）
    placeGraph(G, [[0, 0.5], [0.35, 0.05], [0.35, 0.95], [0.75, 0.3], [1, 0.85]], GA, ['s', 'a', 'b', 'c', 'd']);
    for (let [u, v, w] of [[0, 1, 9], [0, 2, 3], [2, 1, 4], [2, 3, 8], [1, 3, 2], [1, 4, 6], [3, 4, 1], [4, 0, 5], [2, 4, 12], [3, 1, 3]]) addEdge(G, u, v, w);
  } else if (k === 2) {
    G.directed = false;
    randomSeed(5);
    let pos = [];
    for (let i = 0; i < 15; i++) pos.push([(i % 5) / 4, floor(i / 5) / 2]);
    placeGraph(G, pos, GA, 'abcdefghijklmno'.split(''));
    for (let i = 0; i < 15; i++) { if (i % 5 < 4) addEdge(G, i, i + 1, floor(random(1, 10))); if (i < 10) addEdge(G, i, i + 5, floor(random(1, 10))); }
  } else { // 負の重みで失敗する例
    placeGraph(G, [[0, 0.5], [0.45, 0], [1, 0], [0.45, 1]], GA, ['s', 'a', 'c', 'b']);
    for (let [u, v, w] of [[0, 1, 2], [1, 2, 1], [0, 3, 4], [3, 1, -3]]) addEdge(G, u, v, w);
  }
  src = 0;
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始（点クリックで始点）';
  d = G.nodes.map(() => Infinity); pi = G.nodes.map(() => -1); inS = G.nodes.map(() => false);
  heap = []; curU = -1; curE = improved = null; swapA = swapB = -1; truth = null;
  if (src >= G.nodes.length) src = 0;
}

// ---------- 二分ヒープ ----------
function* siftUp(i) {
  while (i > 0) {
    let p = floor((i - 1) / 2);
    if (d[heap[p]] <= d[heap[i]]) break;
    swapA = heap[p]; swapB = heap[i];
    [heap[p], heap[i]] = [heap[i], heap[p]];
    yield { msg: 'ヒープ：' + G.nodes[heap[p]].label + ' を親と交換して上へ' };
    i = p;
  }
  swapA = swapB = -1;
}
function* siftDown(i) {
  while (true) {
    let l = 2 * i + 1, r = l + 1, m = i;
    if (l < heap.length && d[heap[l]] < d[heap[m]]) m = l;
    if (r < heap.length && d[heap[r]] < d[heap[m]]) m = r;
    if (m === i) break;
    swapA = heap[m]; swapB = heap[i];
    [heap[m], heap[i]] = [heap[i], heap[m]];
    yield { msg: 'ヒープ：親子を比べて ' + G.nodes[heap[m]].label + ' を下へ' };
    i = m;
  }
  swapA = swapB = -1;
}

function* dijkstra(s) {
  let A = adjList(G);
  d = G.nodes.map(() => Infinity); pi = G.nodes.map(() => -1); d[s] = 0;
  yield { line: 1, msg: 'd = ∞、' + G.nodes[s].label + '.d = 0' };
  inS = G.nodes.map(() => false);
  yield { line: 2, msg: 'S = ∅' };
  heap = [s].concat(G.nodes.map((n, i) => i).filter((i) => i !== s));
  yield { line: 3, msg: '全部の点でヒープを作る（根が最小）' };
  while (heap.length) {
    yield { line: 4 };
    let u = heap[0]; heap[0] = heap[heap.length - 1]; heap.pop();
    curU = u; curE = improved = null;
    yield { line: 5, msg: '最小を取り出す → ' + G.nodes[u].label + '（d = ' + fmt(d[u]) + '）。最後の要素を根に移して下へ沈める' };
    yield* siftDown(0);
    if (d[u] === Infinity) { inS[u] = true; yield { line: 6, msg: G.nodes[u].label + ' には行けない（d = ∞）' }; continue; }
    inS[u] = true;
    yield { line: 6, msg: G.nodes[u].label + ' を確定（S に追加）' };
    for (let a of A[u]) {
      curE = a.e; improved = null;
      let nd = d[u] + a.w;
      if (d[a.v] > nd) {
        let old = d[a.v]; d[a.v] = nd; pi[a.v] = u; improved = a.e;
        yield { line: 8, msg: '緩和 ' + G.nodes[u].label + '→' + G.nodes[a.v].label + '：' + fmt(old) + ' → ' + nd + (inS[a.v] ? '（⚠ 確定済みの点が変わった！）' : '　ヒープの中で上へ') };
        let i = heap.indexOf(a.v);
        if (i >= 0) yield* siftUp(i);
      } else yield { line: 8, msg: '緩和 ' + G.nodes[u].label + '→' + G.nodes[a.v].label + '：' + nd + ' ≥ ' + fmt(d[a.v]) + ' → そのまま' };
    }
    curE = improved = null;
  }
  curU = -1;
  if (G.edges.some((e) => e.w < 0)) {
    truth = bellmanFordTruth(s);
    let bad = G.nodes.map((n, i) => i).filter((i) => truth[i] !== d[i]);
    lastMsg = bad.length ? '✗ 負の重みのせいで間違えた点：' + bad.map((i) => G.nodes[i].label + '（' + d[i] + ' ≠ 正解 ' + truth[i] + '）').join('、') : '負の重みがあるが、今回はたまたま正しい';
  } else lastMsg = '完了：赤い線が最短経路木。点にマウスで経路';
}
function bellmanFordTruth(s) {
  let t = G.nodes.map(() => Infinity); t[s] = 0;
  for (let k = 0; k < G.nodes.length; k++) for (let e of G.edges) { if (t[e.u] + e.w < t[e.v]) t[e.v] = t[e.u] + e.w; if (!G.directed && t[e.v] + e.w < t[e.u]) t[e.u] = t[e.v] + e.w; }
  return t;
}

function draw() {
  background(C.bg);
  autoRun();
  hud('12 ダイクストラ法', ['点をクリック＝始点　スペース＝再生/停止　→＝1 手　1＝5 点の例　2＝格子　3＝負の重み（失敗例）　線の数字クリック＝重み　ドラッグ＝矢印　R＝最初から　C＝消す',
    '黒＝確定した点（S）　白＝ヒープの中　点の下 d　赤い太線＝π　緑＝いま d が減った辺']);
  let hv = finished ? nodeAt(G.nodes, mouseX, mouseY) : -1, path = new Set();
  for (let v = hv; v >= 0 && pi[v] >= 0; v = pi[v]) path.add(findEdge(G, pi[v], v));
  noStroke(); fill(withA(C.accent, 24));
  for (let i = 0; i < G.nodes.length; i++) if (inS[i]) circle(G.nodes[i].x, G.nodes[i].y, 84);
  for (let e of G.edges) {
    let tree = pi[e.v] === e.u || (!G.directed && pi[e.u] === e.v), col = C.edge, w = 2;
    if (tree) { col = C.accent; w = 4; }
    if (path.has(e)) { col = C.green; w = 7; }
    if (e === curE) { col = C.yel; w = 5; }
    if (e === improved) { col = C.green; w = 6; }
    drawEdge(G.nodes[e.u], G.nodes[e.v], { directed: G.directed, bend: hasReverse(G, e) ? 14 : 0, col, w, label: e.w, labelCol: e.w < 0 ? C.accent : C.text });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) {
    let wrong = truth && truth[i] !== d[i];
    drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, inS[i] ? 'black' : 'white', { ring: wrong ? '#ff2d55' : i === curU ? C.yel : i === src ? C.accent : null, below: 'd=' + fmt(d[i]) + (truth && wrong ? ' (正 ' + truth[i] + ')' : '') });
  }
  statusLine(40, height - 34);
  let y = drawCode(CODE, curLine, width - 540, 110, 520);
  drawHeap(width - 540, y + 14, 520, height - y - 50);
}

// 二分ヒープを木として描く
function drawHeap(x, y, w, h) {
  panelBox(x, y, w, h, '最小優先度つきキュー Q（二分ヒープ：親の d ≤ 子の d）');
  if (!heap.length) { noStroke(); fill(C.dim); textSize(14); textAlign(CENTER, CENTER); text(runner ? '（空）' : 'スペースで開始すると、ここにヒープができる', x + w / 2, y + h / 2); return; }
  let levels = floor(Math.log2(heap.length)) + 1, lh = min(60, (h - 90) / max(1, levels));
  let P = heap.map((u, i) => { let lv = floor(Math.log2(i + 1)), k = i - (2 ** lv - 1), cnt = 2 ** lv; return { x: x + ((k + 0.5) / cnt) * w, y: y + 50 + lv * lh }; });
  for (let i = 1; i < heap.length; i++) { stroke(C.edge); strokeWeight(1.5); let p = P[floor((i - 1) / 2)]; line(p.x, p.y, P[i].x, P[i].y); }
  for (let i = 0; i < heap.length; i++) {
    let u = heap[i], hot = u === swapA || u === swapB;
    drawNode(P[i].x, P[i].y, G.nodes[u].label, hot ? C.yel : i === 0 ? C.cyan : C.white, { r: 15 });
    tagText(fmt(d[u]), P[i].x, P[i].y + 26, C.yel);
  }
  // 配列としても
  drawBoxes('配列', heap.map((u, i) => ({ t: G.nodes[u].label + ':' + fmt(d[u]), col: i === 0 ? C.cyan : null })), x + 10, y + h - 44, w - 20);
}

function mousePressed() { if (weightClick(G, mode === 3 ? -5 : 1, 15)) { resetRun(); ed.from = -2; return; } editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() {
  let r = editRelease(G, GA, floor(random(1, 10)));
  if (r === 'click') { src = ed.clicked; resetRun(); } else if (r) resetRun();
}
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(dijkstra(src)); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if ('123'.includes(key)) preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; src = 0; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(mode); }

// ---------- やってみよう ----------
// 1. お手本 1 で d = (0, 7, 3, 9, 10) になるか確かめよう
// 2. 3 の失敗例：なぜ c の d が間違える？（確定した a の d があとで減っても、c はもう見直さない）
// 3. ヒープの代わりに「毎回全部見て最小を探す」と O(V²)。点が多くて線が多いグラフではどちらが速い？



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
