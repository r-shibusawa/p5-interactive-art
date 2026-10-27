// ============================================
// 02 深さ優先探索 DFS
// 行けるところまで奥へ進み、行き止まりで戻る。発見時刻 d と終了時刻 f を記録する
// [d, f] の区間は「入れ子」か「離れている」かのどちらか ＝ 括弧の構造（括弧定理）
// 線の分類：T 木の辺 / B 後退辺（灰へ＝閉路がある）/ F 前進辺（子孫の黒へ）/ C 横断辺（それ以外の黒へ）
// 操作：スペース＝再生・停止 / →＝1 手 / 1・2＝お手本（有向）/ 3＝無向 / R＝最初から
//       クリック＝点を追加 / ドラッグ＝線 / C＝全部消す
// ============================================

let G, GA, A;
let st = [];          // { color, d, f, pi, depth }
let clock = 0;  // clock ＝ 発見・終了時刻をつけるための時計
let stack = [];       // 訪問中の呼び出しの列（灰色の点）
let kind = new Map(); // 線 → 'T' | 'B' | 'F' | 'C'
let curU = -1, curV = -1;
const KCOL = { T: '#ff5e7e', B: '#ffd166', F: '#5ee6ff', C: '#c4b5fd' };
const KNAME = { T: '木の辺', B: '後退辺', F: '前進辺', C: '横断辺' };
const CODE = [
  '深さ優先探索(G)',
  '  点 u すべて：白、π ← なし',
  '  時計 ← 0',
  '  点 u を順に見ていく',
  '      u がまだ白なら 訪問(u)（新しい木の根）',
  '訪問(u)',
  '  時計を 1 進め、u.d ← 時計、u を灰に',
  '  u の隣の点 v それぞれについて',
  '      v がまだ白なら',
  '          v.π ← u、訪問(v)（もっと奥へ）',
  '  u を黒に（行き止まり）',
  '  時計を 1 進め、u.f ← 時計',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 70, y: 150, w: width - 680, h: height - 470 };
  if (k === 1) { // 6 点：T・B・F・C が全部 1 回以上出る
    G = makeGraph(true); G.keepOrder = true;
    placeGraph(G, [[0, 0], [0.5, 0], [0.25, 1], [0.75, 1], [1, 0.5], [1, 1]], GA, ['a', 'b', 'c', 'd', 'e', 'f']);
    let id = (c) => G.nodes.findIndex((n) => n.label === c);
    for (let [a, b] of [['a', 'b'], ['a', 'c'], ['b', 'c'], ['c', 'a'], ['d', 'c'], ['d', 'e'], ['e', 'f'], ['f', 'd']]) addEdge(G, id(a), id(b));
  } else if (k === 2) { // 8 点：深さ優先の森が 2 本の木になる
    G = makeGraph(true);
    G.keepOrder = true; // 線を足した順に隣を見る
    placeGraph(G, [[0, 0], [0.35, 0], [0.55, 0.5], [0.35, 1], [0, 1], [0.8, 0.8], [0.75, 0], [1, 0.4]], GA, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    let id = (c) => G.nodes.findIndex((n) => n.label === c);
    for (let [a, b] of [['a', 'b'], ['a', 'd'], ['a', 'e'], ['b', 'c'], ['b', 'd'], ['c', 'a'], ['d', 'c'], ['e', 'd'], ['f', 'g'], ['f', 'e'], ['g', 'h'], ['h', 'f']]) addEdge(G, id(a), id(b));
  } else {
    G = makeGraph(false);
    placeGraph(G, [[0.1, 0.1], [0.45, 0], [0.85, 0.15], [0.05, 0.75], [0.4, 0.6], [0.75, 0.75], [1, 1]], GA, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    for (let [u, v] of [[0, 1], [1, 2], [0, 3], [3, 4], [4, 1], [4, 5], [5, 2], [5, 6]]) addEdge(G, u, v);
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  st = G.nodes.map(() => ({ color: 'white', d: 0, f: 0, pi: -1, depth: 0 }));
  clock = 0; stack = []; kind = new Map(); curU = curV = -1;
}

function* dfs() {
  A = adjList(G);
  yield { line: 1, msg: '全部の点を白にする' };
  clock = 0;
  yield { line: 2, msg: '時計 = 0' };
  for (let u = 0; u < G.nodes.length; u++) {
    yield { line: 3, msg: G.nodes[u].label + ' を見る（外側のループ）' };
    if (st[u].color === 'white') {
      yield { line: 4, msg: G.nodes[u].label + ' は白 → 新しい木の根として訪問' };
      yield* visit(u, 0);
    }
  }
  curU = curV = -1;
  lastMsg = '完了：下の区間が入れ子になっているのを確かめよう';
}

function* visit(u, depth) {
  stack.push(u); curU = u; curV = -1;
  clock++; st[u].d = clock; st[u].color = 'gray'; st[u].depth = depth;
  yield { line: 6, msg: G.nodes[u].label + '.d = ' + clock + '（発見）　"(' + G.nodes[u].label + '"' };
  for (let a of A[u]) {
    curU = u; curV = a.v;
    yield { line: 7, msg: G.nodes[u].label + ' → ' + G.nodes[a.v].label + ' を調べる' };
    let c = st[a.v].color, k;
    if (!G.directed && a.v === st[u].pi && !kind.has(a.e)) k = null; // 無向：親へ戻る線は木の辺そのもの
    if (c === 'white') k = 'T';
    else if (c === 'gray') k = 'B';
    else if (G.directed) k = st[u].d < st[a.v].d ? 'F' : 'C';
    if (k && !kind.has(a.e)) kind.set(a.e, k);
    if (c === 'white') {
      st[a.v].pi = u;
      yield { line: 9, msg: G.nodes[a.v].label + ' は白 → 木の辺 T。' + G.nodes[a.v].label + '.π = ' + G.nodes[u].label };
      yield* visit(a.v, depth + 1);
      curU = u;
    } else if (k) {
      yield { line: 8, msg: G.nodes[a.v].label + ' は' + (c === 'gray' ? '灰' : '黒') + ' → ' + KNAME[kind.get(a.e)] + ' ' + kind.get(a.e) };
    }
  }
  curV = -1;
  st[u].color = 'black';
  yield { line: 10, msg: G.nodes[u].label + ' の隣を全部調べた → 黒' };
  clock++; st[u].f = clock; stack.pop();
  yield { line: 11, msg: G.nodes[u].label + '.f = ' + clock + '（終了）　"' + G.nodes[u].label + ')"' };
}

function draw() {
  background(C.bg);
  autoRun();
  hud('02 深さ優先探索 DFS', ['スペース＝再生/停止　→＝1 手　1・2＝お手本（有向）　3＝無向　R＝最初から　クリック＝点　ドラッグ＝線　C＝消す',
    '点の下 d/f ＝ 発見時刻/終了時刻　線の文字 T 木 / B 後退 / F 前進 / C 横断']);
  for (let e of G.edges) {
    let k = kind.get(e), look = curU >= 0 && curV >= 0 && ((e.u === curU && e.v === curV) || (!G.directed && e.u === curV && e.v === curU));
    drawEdge(G.nodes[e.u], G.nodes[e.v], { directed: G.directed, bend: hasReverse(G, e) ? 14 : 0, col: look ? C.text : k ? KCOL[k] : C.edge, w: k === 'T' ? 4 : look ? 4 : 2, label: k || '', dash: k === 'B' || k === 'C' ? [7, 5] : null });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) {
    let s = st[i];
    drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, s.color, { ring: i === curU ? C.yel : null, below: s.d ? s.d + '/' + (s.f || '') : undefined });
  }
  // 呼び出しスタック
  drawBoxes('呼び出し中（灰）', stack.map((u) => ({ t: G.nodes[u].label, col: C.gray })), 40, GA.y + GA.h + 42, width - 640);
  statusLine(40, height - 34);
  drawCode(CODE, curLine, width - 540, 110, 520);
  drawParens();
  // 凡例
  let ly = 110 + CODE.length * 19 + 30;
  for (let [i, k] of ['T', 'B', 'F', 'C'].entries()) {
    noStroke(); fill(KCOL[k]); rect(width - 540 + i * 130, ly, 18, 18, 4);
    fill(C.text); textSize(14); textAlign(LEFT, CENTER); text(k + ' ' + KNAME[k] + ' ' + [...kind.values()].filter((x) => x === k).length, width - 516 + i * 130, ly + 9);
  }
  noStroke(); fill(C.dim); textSize(13); textAlign(LEFT, BASELINE);
  text('後退辺 B がある ⇔ 閉路がある', width - 540, ly + 44);
  text('白い道の定理：v が u の子孫 ⇔ u.d の時点で u から v へ白い点だけの道がある', width - 540, ly + 64);
}

// 括弧の構造：区間 [d, f] を深さごとに描く
function drawParens() {
  let n = G.nodes.length; if (n === 0) return;
  let T = 2 * n, x0 = 40, x1 = width - 600, y0 = height - 165, uw = (x1 - x0) / T;
  noStroke(); fill(C.dim); textSize(12); textAlign(CENTER, BASELINE);
  for (let t = 1; t <= T; t++) { fill(t === clock ? C.yel : C.dim); text(t, x0 + (t - 0.5) * uw, y0); }
  for (let i = 0; i < n; i++) {
    let s = st[i]; if (!s.d) continue;
    let f = s.f || clock + 0.5, y = y0 + 8 + s.depth * 16;
    fill(s.f ? withA(C.accent, 170) : withA(C.gray, 200));
    rect(x0 + (s.d - 1) * uw + 2, y, (f - s.d + 1) * uw - 4, 13, 4);
    fill(C.bg); textSize(11); textAlign(LEFT, CENTER); text(G.nodes[i].label, x0 + (s.d - 1) * uw + 6, y + 7);
  }
  // 括弧の文字列
  let ev = [];
  st.forEach((s, i) => { if (s.d) ev.push([s.d, '(' + G.nodes[i].label]); if (s.f) ev.push([s.f, G.nodes[i].label + ')']); });
  ev.sort((a, b) => a[0] - b[0]);
  fill(C.text); textSize(15); textAlign(LEFT, BASELINE);
  text(ev.map((e) => e[1]).join(' '), x0, y0 - 22);
}

function mousePressed() { editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() { if (editRelease(G, GA)) resetRun(); }
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(dfs()); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if ('123'.includes(key)) preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. お手本 2 で、括弧の文字列 (a (b (c c) (d d) b) (e e) a) (f (g (h h) g) f) になるか確かめよう
// 2. 後退辺 B を消すように線を消す（C で作り直す）と、閉路のないグラフ（DAG）になる
// 3. 無向グラフ（3）では前進辺・横断辺が出てこない。なぜ？（無向では、黒い点への線はもう逆向きにたどってある）



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
