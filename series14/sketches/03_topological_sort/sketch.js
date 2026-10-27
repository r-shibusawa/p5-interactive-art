// ============================================
// 03 トポロジカルソート
// 「A は B より先に」という矢印をすべて守る一列の順番を作る（閉路のない有向グラフ DAG だけ）
// DFS 版：点が終わる（黒になる）たびに、リストの「先頭」に入れる → 終了時刻 f の大きい順
// Kahn 版：入ってくる矢印が 0 本の点から順に取り出し、その点の矢印を消していく
// 操作：スペース＝再生・停止 / →＝1 手 / A＝DFS 版 ⇔ Kahn 版 / 1＝カレー作り / 2＝履修の順番
//       ドラッグ＝矢印を追加（閉路を作るとどうなる？）/ クリック＝点を追加 / R＝最初から / C＝全部消す
// ============================================

let G, GA, A;
let useKahn = false;
let st = [], clock = 0, list = [], indeg = [], Q = [];  // clock ＝ 発見・終了時刻をつけるための時計
let curU = -1, curV = -1, cycle = false;
let lineT = 0; // 終わったら一列に並べるアニメーション
const CODE_DFS = [
  'トポロジカルソート(G)',
  '  深さ優先探索で、各点の終了時刻 f を求める',
  '  点が終了するたびに、リストの先頭に入れる',
  '  できたリストを返す',
  '訪問(u)',
  '  時計を進めて u.d ← 時計、u を灰に',
  '  u の隣の点 v それぞれについて',
  '      v が白なら 訪問(v)',
  '      v が灰なら 閉路！（後退辺）',
  '  u を黒に、時計を進めて u.f ← 時計',
  '  リストの先頭に u を入れる',
];
const CODE_KAHN = [
  'Kahn の方法(G)',
  '  各点 u：in[u] ← 入ってくる矢印の本数',
  '  キュー Q ← in が 0 の点ぜんぶ',
  '  Q が空になるまでくり返す',
  '      u ← Q の先頭を取り出し、リストの最後へ',
  '      u から出る矢印 u → v それぞれについて',
  '          in[v] を 1 減らす     （矢印を消す）',
  '          in[v] が 0 になったら v を Q へ',
  '  取り出せなかった点がある → 閉路がある',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 70, y: 150, w: width - 680, h: height - 420 };
  G = makeGraph(true); G.keepOrder = true;
  if (k === 1) { // カレー作り（お茶はいつでもよい）
    placeGraph(G, [[0.05, 0.1], [0.5, 0.05], [0.05, 0.55], [0.05, 0.95], [0.35, 0.75], [0.6, 0.75], [0.8, 0.95], [0.95, 0.4], [0.3, 0.35]], GA,
      ['米研ぎ', '炊飯', '野菜切り', '肉切り', '炒める', '煮込む', 'ルー', '盛り付け', 'お茶']);
    for (let [u, v] of [[0, 1], [1, 7], [2, 4], [3, 4], [4, 5], [5, 6], [6, 7], [2, 5]]) addEdge(G, u, v);
  } else { // 履修の順番
    placeGraph(G, [[0, 0.1], [0, 0.9], [0.33, 0.1], [0.33, 0.6], [0.66, 0.0], [0.66, 0.5], [0.66, 1], [1, 0.3], [1, 0.85]], GA,
      ['数学', 'プロ基礎', '線形代数', 'データ構造', '確率', 'アルゴ', 'OS', '機械学習', 'コンパイラ']);
    for (let [u, v] of [[0, 2], [0, 4], [1, 3], [2, 7], [3, 5], [3, 6], [4, 7], [5, 7], [5, 8], [6, 8], [2, 5]]) addEdge(G, u, v);
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始（A で方法を切り替え）';
  st = G.nodes.map(() => ({ color: 'white', d: 0, f: 0 }));
  clock = 0; list = []; Q = []; indeg = G.nodes.map(() => 0); curU = curV = -1; cycle = false; lineT = 0;
}

function* topoDFS() {
  A = adjList(G);
  yield { line: 1, msg: 'DFS を始める' };
  for (let u = 0; u < G.nodes.length; u++) if (st[u].color === 'white') yield* visit(u);
  curU = curV = -1;
  lastMsg = cycle ? '閉路があるので、正しい順番は存在しない' : '完了：終了時刻 f の大きい順 = トポロジカル順序';
}
function* visit(u) {
  curU = u; clock++; st[u].d = clock; st[u].color = 'gray';
  yield { line: 5, msg: G.nodes[u].label + ' を発見（d = ' + clock + '）' };
  for (let a of A[u]) {
    curU = u; curV = a.v;
    yield { line: 6, msg: G.nodes[u].label + ' → ' + G.nodes[a.v].label };
    if (st[a.v].color === 'white') { yield* visit(a.v); curU = u; }
    else if (st[a.v].color === 'gray') { cycle = true; yield { line: 8, msg: G.nodes[a.v].label + ' は灰色 → 後退辺 ＝ 閉路！' }; }
  }
  curV = -1; st[u].color = 'black'; clock++; st[u].f = clock;
  yield { line: 9, msg: G.nodes[u].label + ' 終了（f = ' + clock + '）' };
  list.unshift(u);
  yield { line: 10, msg: G.nodes[u].label + ' をリストの先頭へ' };
}
function* kahn() {
  A = adjList(G);
  indeg = G.nodes.map(() => 0);
  for (let e of G.edges) indeg[e.v]++;
  yield { line: 1, msg: '入ってくる矢印を数える' };
  Q = []; for (let u = 0; u < G.nodes.length; u++) if (indeg[u] === 0) Q.push(u);
  yield { line: 2, msg: '矢印が 0 本の点（今すぐできること）をキューへ' };
  while (Q.length) {
    yield { line: 3, msg: 'キューは空ではない' };
    curU = Q.shift(); list.push(curU); st[curU].color = 'black';
    yield { line: 4, msg: G.nodes[curU].label + ' を取り出してリストの最後へ' };
    for (let a of A[curU]) {
      curV = a.v; indeg[a.v]--;
      yield { line: 6, msg: G.nodes[curU].label + ' → ' + G.nodes[a.v].label + ' を消す（残り ' + indeg[a.v] + ' 本）' };
      if (indeg[a.v] === 0) { Q.push(a.v); st[a.v].color = 'gray'; yield { line: 7, msg: G.nodes[a.v].label + ' の矢印が 0 本 → キューへ' }; }
    }
    curV = -1;
  }
  curU = -1;
  cycle = list.length < G.nodes.length;
  yield { line: 8, msg: cycle ? '取り出せない点が残った → 閉路がある' : '全部取り出せた' };
  lastMsg = cycle ? '閉路があるので、正しい順番は存在しない' : '完了：矢印がすべて右向きの一列';
}

// 一列に並べたときの位置
function pos(i) {
  let p = G.nodes[i], k = list.indexOf(i);
  if (!finished || cycle || k < 0 || list.length !== G.nodes.length) return p;
  let tx = 60 + (k + 0.5) * ((width - 120) / G.nodes.length), ty = height - 205;
  let t = lineT * lineT * (3 - 2 * lineT);
  return { x: lerp(p.x, tx, t), y: lerp(p.y, ty, t) };
}

function draw() {
  background(C.bg);
  autoRun();
  if (finished) lineT = min(1, lineT + 0.015);
  hud('03 トポロジカルソート ─ ' + (useKahn ? 'Kahn 版（入次数）' : 'DFS 版（終了時刻）'), ['スペース＝再生/停止　→＝1 手　A＝DFS 版 ⇔ Kahn 版　1＝カレー作り　2＝履修　ドラッグ＝矢印　クリック＝点　R＝最初から　C＝消す',
    '矢印 u → v は「u を v より先に」。終わると、全部の矢印が右を向く一列に並び替わる']);
  let P = G.nodes.map((n, i) => pos(i));
  let lined = finished && !cycle && list.length === G.nodes.length && lineT > 0;
  for (let e of G.edges) {
    let look = e.u === curU && e.v === curV;
    let gone = useKahn && st[e.u].color === 'black' && !lined;
    let bend = lined ? -abs(list.indexOf(e.v) - list.indexOf(e.u)) * 9 * lineT : 0;
    drawEdge(P[e.u], P[e.v], { directed: true, r: 30, bend, col: look ? C.yel : gone ? withA(C.edge, 60) : C.edge, w: look ? 4 : 2 });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) {
    let s = st[i];
    let below = useKahn ? (runner ? 'in=' + indeg[i] : undefined) : s.d ? s.d + '/' + (s.f || '') : undefined;
    drawNode(P[i].x, P[i].y, G.nodes[i].label, s.color, { r: 30, ring: i === curU ? C.yel : null, below });
  }
  // リスト
  let ly = height - 120;
  drawBoxes(useKahn ? 'リスト（後ろへ追加）' : 'リスト（先頭へ追加）', list.map((u) => ({ t: G.nodes[u].label + (useKahn ? '' : ' ' + st[u].f), col: C.accent })), 40, ly, useKahn ? width / 2 - 60 : width - 80);
  if (useKahn) drawBoxes('キュー Q', Q.map((u) => ({ t: G.nodes[u].label, col: C.gray })), width / 2 + 20, ly, width / 2 - 60);
  if (cycle) { noStroke(); fill(C.accent); textSize(20); textAlign(LEFT, BASELINE); text('⚠ 閉路があります：どの順番でも、どこかの矢印が逆向きになる', 40, ly - 16); }
  statusLine(40, height - 34);
  let y = drawCode(useKahn ? CODE_KAHN : CODE_DFS, curLine, width - 540, 110, 520);
  noStroke(); fill(C.dim); textSize(13); textAlign(LEFT, BASELINE);
  let notes = useKahn ? ['入ってくる矢印が 0 本 ＝ もう前提がそろったこと', 'キューの取り出し方を変えると、別の正しい順番になる', '計算量 Θ(V + E)'] :
    ['なぜ f の大きい順で正しい？　u → v なら必ず v.f < u.f', 'v が白なら v は u の子孫で先に終わる。v が黒ならもう終わっている', '灰色はありえない（それは閉路）。計算量 Θ(V + E)'];
  notes.forEach((t, i) => text(t, width - 540, y + 24 + i * 20));
}

function mousePressed() { editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() { if (editRelease(G, GA)) resetRun(); }
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(useKahn ? kahn() : topoDFS()); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if (key === 'a' || key === 'A') { useKahn = !useKahn; resetRun(); }
  if (key === '1' || key === '2') preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. DFS 版と Kahn 版で順番は同じ？　違っても両方とも正しいことを確かめよう
// 2. 盛り付け → 米研ぎ の矢印を足すと閉路ができる。両方の方法で何が起きる？
// 3. お茶はどこに入ってもよい。正しい順番は全部で何通りある？



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
