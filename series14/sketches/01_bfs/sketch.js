// ============================================
// 01 幅優先探索 BFS
// 始点 s から「近い順」に点を発見する。白＝未発見、灰＝発見済み（キューの中）、黒＝調べ終わり
// d = s からの最短の手数、π = 自分を発見した点。π をたどると幅優先木（最短経路の木）になる
// 操作：点をクリック＝始点 s / スペース＝再生・停止 / →＝1 手 / 終わったら点にマウス＝最短経路
//       クリック＝点を追加 / ドラッグ＝線 / 1〜3＝お手本 / R＝最初から / C＝全部消す
// ============================================

let G, GA, A;
let src = 1;          // 始点 s
let st = [];          // st[u] = { color, d, pi }
let Q = [];           // キュー
let curU = -1, curV = -1;
const CODE = [
  '幅優先探索(G, s)',
  '  s 以外の点 u すべて：白、d ← ∞、π ← なし',
  '  s を灰に、s.d ← 0、s.π ← なし',
  '  キュー Q を空にして s を入れる',
  '  Q が空になるまでくり返す',
  '      u ← Q の先頭を取り出す',
  '      u の隣の点 v それぞれについて',
  '          v がまだ白なら',
  '              v を灰に、v.d ← u.d + 1',
  '              v.π ← u、v を Q の最後に入れる',
  '      u を黒に（隣を全部見終わった）',
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function preset(k) {
  GA = { x: 60, y: 150, w: width - 620, h: height - 300 };
  if (k === 1) { // 8 点の無向グラフ
    G = makeGraph(false);
    placeGraph(G, [[0, 0.5], [0.3, 0.1], [0.3, 0.9], [0.55, 0.5], [0.75, 0.1], [0.75, 0.9], [1, 0.3], [1, 0.8]], GA, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    for (let [u, v] of [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [3, 5], [4, 6], [5, 7], [6, 7], [2, 5]]) addEdge(G, u, v);
    src = 0;
  } else if (k === 2) { // 格子
    G = makeGraph(false);
    let pos = [], labels = [];
    for (let i = 0; i < 20; i++) { pos.push([(i % 5) / 4, floor(i / 5) / 3]); labels.push(String.fromCharCode(97 + i)); }
    placeGraph(G, pos, GA, labels);
    for (let i = 0; i < 20; i++) { if (i % 5 < 4 && i !== 6 && i !== 12) addEdge(G, i, i + 1); if (i < 15 && i !== 2 && i !== 8) addEdge(G, i, i + 5); }
    src = 0;
  } else { // 有向グラフ（矢印の向きにしか進めない）
    G = makeGraph(true);
    placeGraph(G, [[0.05, 0.15], [0.5, 0.15], [0.95, 0.15], [0.05, 0.85], [0.5, 0.85], [0.95, 0.85]], GA, ['1', '2', '3', '4', '5', '6']);
    for (let [u, v] of [[0, 1], [1, 2], [0, 4], [3, 0], [4, 3], [4, 5], [5, 2], [2, 5], [1, 4]]) addEdge(G, u, v);
    src = 0;
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  st = G.nodes.map(() => ({ color: 'white', d: Infinity, pi: -1 }));
  Q = []; curU = curV = -1;
  if (src >= G.nodes.length) src = G.nodes.length - 1;
}

function* bfs(s) {
  A = adjList(G);
  for (let u = 0; u < G.nodes.length; u++) if (u !== s) st[u] = { color: 'white', d: Infinity, pi: -1 };
  yield { line: 1, msg: '全部の点を 白・d=∞ にする' };
  st[s] = { color: 'gray', d: 0, pi: -1 };
  yield { line: 2, msg: '始点 ' + G.nodes[s].label + ' を灰色に、d = 0' };
  Q = [s];
  yield { line: 3, msg: 'キューに ' + G.nodes[s].label + ' を入れる' };
  while (Q.length > 0) {
    yield { line: 4, msg: 'キューは空ではない' };
    curU = Q.shift(); curV = -1;
    yield { line: 5, msg: 'キューの先頭 ' + G.nodes[curU].label + ' を取り出す（先入れ先出し）' };
    for (let a of A[curU]) {
      curV = a.v;
      yield { line: 6, msg: G.nodes[curU].label + ' の隣 ' + G.nodes[curV].label + ' を見る' };
      if (st[curV].color === 'white') {
        yield { line: 7, msg: G.nodes[curV].label + ' は白 ＝ 初めて見つけた！' };
        st[curV].color = 'gray'; st[curV].d = st[curU].d + 1;
        yield { line: 8, msg: G.nodes[curV].label + '.d = ' + st[curU].d + ' + 1 = ' + st[curV].d };
        st[curV].pi = curU; Q.push(curV);
        yield { line: 9, msg: G.nodes[curV].label + '.π = ' + G.nodes[curU].label + '、キューの最後へ' };
      } else {
        yield { line: 7, msg: G.nodes[curV].label + ' は ' + (st[curV].color === 'gray' ? '灰' : '黒') + ' ＝ もう見つけてある' };
      }
    }
    curV = -1;
    st[curU].color = 'black';
    yield { line: 10, msg: G.nodes[curU].label + ' の隣を全部調べた → 黒' };
  }
  curU = -1;
  lastMsg = '完了：点にマウスをのせると s からの最短経路';
}

function pathTo(v) { let p = []; while (v >= 0) { p.unshift(v); v = st[v].pi; } return p; }

function draw() {
  background(C.bg);
  autoRun();
  hud('01 幅優先探索 BFS', ['点をクリック＝始点 s　スペース＝再生/停止　→＝1 手　クリック＝点を追加　ドラッグ＝線　1〜3＝お手本　R＝最初から　C＝消す',
    '白＝未発見　灰＝発見済み（キューの中）　黒＝調べ終わり　点の下の数字 d ＝ s からの手数　太い線＝幅優先木（π）']);
  let hv = nodeAt(G.nodes, mouseX, mouseY), path = [];
  if (finished && hv >= 0 && st[hv] && st[hv].d < Infinity) path = pathTo(hv);
  for (let e of G.edges) {
    let tree = (st[e.v] && st[e.v].pi === e.u) || (!G.directed && st[e.u] && st[e.u].pi === e.v);
    let onPath = path.some((p, i) => i > 0 && ((path[i - 1] === e.u && p === e.v) || (!G.directed && path[i - 1] === e.v && p === e.u)));
    let look = curU >= 0 && curV >= 0 && ((e.u === curU && e.v === curV) || (!G.directed && e.u === curV && e.v === curU));
    drawEdge(G.nodes[e.u], G.nodes[e.v], { directed: G.directed, bend: hasReverse(G, e) ? 14 : 0, col: onPath ? C.green : look ? C.yel : tree ? C.accent : C.edge, w: onPath || look ? 5 : tree ? 4 : 2 });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) {
    let s = st[i] || { color: 'white', d: Infinity, pi: -1 };
    drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, s.color, { ring: i === curU ? C.yel : i === src ? C.accent : null, below: 'd=' + fmt(s.d), above: s.pi >= 0 ? 'π=' + G.nodes[s.pi].label : undefined });
  }
  // キュー
  let qy = height - 120;
  drawBoxes('キュー Q（先頭 →）', Q.map((q) => ({ t: G.nodes[q].label + ':' + st[q].d, col: C.gray })), 40, qy, width - 600);
  if (path.length) { noStroke(); fill(C.green); textSize(16); textAlign(LEFT, BASELINE); text('最短経路：' + path.map((p) => G.nodes[p].label).join(' → ') + '（' + (path.length - 1) + ' 手）', 40, qy - 14); }
  statusLine(40, height - 40);
  // 疑似コード
  drawCode(CODE, curLine, width - 540, 120, 520);
  // 層ごとの表
  let layers = {};
  st.forEach((s, i) => { if (s.d < Infinity) (layers[s.d] = layers[s.d] || []).push(G.nodes[i].label); });
  let ly = 120 + CODE.length * 19 + 40;
  panelBox(width - 540, ly, 520, 180, '距離 d ごとの層（波紋のように広がる）');
  noStroke(); textSize(15); textAlign(LEFT, BASELINE);
  Object.keys(layers).forEach((d, i) => { if (i < 7) { fill(C.yel); text('d = ' + d, width - 524, ly + 46 + i * 20); fill(C.text); text(layers[d].join('  '), width - 450, ly + 46 + i * 20); } });
}

function begin() { if (G.nodes.length === 0) return; if (src < 0) src = 0; resetRun(); startRun(bfs(src)); }
function mousePressed() { editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() {
  let r = editRelease(G, GA);
  if (r === 'click') { src = ed.clicked; resetRun(); }
  else if (r) resetRun();
}
function keyPressed() {
  if (key === ' ' && !runner) { begin(); playing = true; return; }
  if (key === 'ArrowRight' && !runner) { begin(); }
  if (runKeys()) return;
  if ('123'.includes(key)) preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; src = 0; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. 始点を変えると幅優先木の形はどう変わる？ d の最大値（離心率）は？
// 2. キューを「スタック」（Q.pop()）に変えると、d は最短の手数ではなくなる。確かめよう
// 3. 離れ島（つながっていない部分）を作ると、そこは d = ∞ のまま



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
