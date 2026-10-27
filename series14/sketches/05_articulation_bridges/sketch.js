// ============================================
// 05 関節点・橋・二重連結成分
// 関節点 ＝ 取り除くとグラフが切れる点。橋 ＝ 取り除くと切れる線
// DFS をしながら low[v]（v の子孫から後退辺 1 本で戻れる、いちばん早い発見時刻）を計算する
//   根でない v が関節点 ⇔ ある子 s で low[s] ≥ v.d　　根が関節点 ⇔ 子が 2 つ以上
//   木の辺 (v, s) が橋 ⇔ low[s] > v.d
// 操作：スペース＝再生・停止 / →＝1 手 / 終わったら点にマウス＝その点を消したグラフ
//       1・2＝お手本 / クリック＝点 / ドラッグ＝線 / R＝最初から / C＝全部消す
// ============================================

let G, GA;
let st = [], clock = 0;  // clock ＝ 発見・終了時刻をつけるための時計
let isArt = [], bridges = new Set(), bcc = new Map(), nb = 0, edgeStack = [];
let curU = -1, curV = -1;
const PAL = ['#ff5e7e', '#5ee6ff', '#ffd166', '#7cf4a6', '#c4b5fd', '#ffa25e', '#f0abfc', '#93c5fd', '#fca5a5', '#bef264'];
const CODE = [
  '弱点さがし(u)    // 無向グラフの深さ優先探索',
  '  時計を進めて u.d ← u.low ← 時計',
  '  u の隣の点 v それぞれについて',
  '      v がまだ未発見なら      // 木の辺',
  '          v.π ← u、辺 (u,v) を積む、弱点さがし(v)',
  '          u.low ← min(u.low, v.low)',
  '          v.low ≥ u.d なら u は関節点（根は子が 2 つ以上）',
  '              (u,v) まで辺を降ろす → 二重連結成分',
  '          v.low > u.d なら (u, v) は橋',
  '      v が親でなく、u より先に発見済みなら   // 後退辺',
  '          辺 (u,v) を積む、u.low ← min(u.low, v.d)',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 70, y: 150, w: width - 680, h: height - 330 };
  G = makeGraph(false);
  if (k === 1) {
    placeGraph(G, [[0.05, 0.15], [0.05, 0.75], [0.28, 0.45], [0.2, 1], [0.45, 0.95], [0.6, 0.6], [0.75, 0.95], [0.75, 0.35], [1, 0.15], [1, 0.6], [0.35, 0.05], [0.55, 0.0]], GA,
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']);
    for (let [u, v] of [[0, 1], [1, 2], [2, 0], [2, 3], [3, 1], [3, 4], [4, 5], [5, 6], [6, 4], [5, 7], [7, 8], [8, 9], [9, 7], [2, 10], [10, 11], [11, 2]]) addEdge(G, u, v);
  } else {
    let pos = [];
    for (let i = 0; i < 12; i++) pos.push([(i % 4) / 3, floor(i / 4) / 2]);
    placeGraph(G, pos, GA, 'abcdefghijkl'.split(''));
    for (let [u, v] of [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [4, 5], [5, 6], [6, 7], [3, 7], [6, 10], [10, 11], [8, 9], [4, 8], [9, 10]]) addEdge(G, u, v);
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  st = G.nodes.map(() => ({ d: 0, low: 0, pi: -1, kids: 0 }));
  clock = 0; isArt = G.nodes.map(() => false); bridges = new Set(); bcc = new Map(); nb = 0; edgeStack = []; curU = curV = -1;
}

function* articulation() {
  let A = adjList(G);
  for (let r = 0; r < G.nodes.length; r++) {
    if (st[r].d) continue;
    yield { line: 0, msg: G.nodes[r].label + ' を根に DFS' };
    yield* artDFS(r, A, true);
    if (st[r].kids >= 2) { isArt[r] = true; yield { line: 6, msg: '根 ' + G.nodes[r].label + ' は子が ' + st[r].kids + ' つ → 関節点' }; }
    else if (isArt[r]) { isArt[r] = false; yield { line: 6, msg: '根 ' + G.nodes[r].label + ' は子が 1 つ → 関節点ではない' }; }
  }
  curU = curV = -1;
  lastMsg = '完了：関節点 ' + isArt.filter((x) => x).length + ' 個、橋 ' + bridges.size + ' 本、二重連結成分 ' + nb + ' 個。点にマウス＝消してみる';
}
function* artDFS(u, A, isRoot) {
  curU = u; clock++; st[u].d = st[u].low = clock;
  yield { line: 1, msg: G.nodes[u].label + '.d = low = ' + clock };
  for (let a of A[u]) {
    let v = a.v; curU = u; curV = v;
    if (!st[v].d) {
      st[v].pi = u; st[u].kids++; edgeStack.push(a.e);
      yield { line: 4, msg: G.nodes[u].label + ' – ' + G.nodes[v].label + ' は木の辺' };
      yield* artDFS(v, A, false);
      curU = u; curV = v;
      st[u].low = min(st[u].low, st[v].low);
      yield { line: 5, msg: G.nodes[u].label + '.low = min(' + G.nodes[u].label + '.low, ' + G.nodes[v].label + '.low) = ' + st[u].low };
      if (st[v].low >= st[u].d) {
        if (!isRoot) isArt[u] = true;
        let c = nb++;
        while (edgeStack.length) { let e = edgeStack.pop(); bcc.set(e, c); if (e === a.e) break; }
        yield { line: 7, msg: G.nodes[v].label + '.low = ' + st[v].low + ' ≥ ' + G.nodes[u].label + '.d = ' + st[u].d + (isRoot ? '（根なので子の数で判定）' : ' → ' + G.nodes[u].label + ' は関節点') + '、二重連結成分 #' + nb };
      }
      if (st[v].low > st[u].d) { bridges.add(a.e); yield { line: 8, msg: G.nodes[v].label + '.low > ' + G.nodes[u].label + '.d → ' + G.nodes[u].label + '–' + G.nodes[v].label + ' は橋' }; }
    } else if (v !== st[u].pi && st[v].d < st[u].d) {
      edgeStack.push(a.e);
      st[u].low = min(st[u].low, st[v].d);
      yield { line: 10, msg: G.nodes[u].label + ' – ' + G.nodes[v].label + ' は後退辺 → ' + G.nodes[u].label + '.low = ' + st[u].low };
    }
  }
  curV = -1;
}

// 点 x を取り除いたときの連結成分（色分け用）
function componentsWithout(x) {
  let n = G.nodes.length, c = Array(n).fill(-1), k = 0, A = adjList(G);
  for (let s = 0; s < n; s++) {
    if (s === x || c[s] >= 0) continue;
    let q = [s]; c[s] = k;
    while (q.length) { let u = q.pop(); for (let a of A[u]) if (a.v !== x && c[a.v] < 0) { c[a.v] = k; q.push(a.v); } }
    k++;
  }
  return { c, k };
}

function draw() {
  background(C.bg);
  autoRun();
  hud('05 関節点・橋・二重連結成分', ['スペース＝再生/停止　→＝1 手　終わったら点にマウス＝その点を消す　1・2＝お手本　クリック＝点　ドラッグ＝線　R＝最初から　C＝消す',
    '点の下 d/low　◆＝関節点　太い白線＝橋　線の色＝二重連結成分（どの 1 点を消してもつながったまま）']);
  let hv = finished ? nodeAt(G.nodes, mouseX, mouseY) : -1;
  let cw = hv >= 0 ? componentsWithout(hv) : null;
  for (let e of G.edges) {
    let look = curU >= 0 && ((e.u === curU && e.v === curV) || (e.v === curU && e.u === curV));
    let col = bcc.has(e) ? PAL[bcc.get(e) % PAL.length] : C.edge, w = bcc.has(e) ? 4 : 2;
    if (bridges.has(e)) { col = C.white; w = 6; }
    if (look) { col = C.yel; w = 5; }
    if (hv >= 0 && (e.u === hv || e.v === hv)) { col = withA(C.edge, 50); w = 1; }
    drawEdge(G.nodes[e.u], G.nodes[e.v], { col, w, dash: bridges.has(e) ? null : st[e.u].pi !== e.v && st[e.v].pi !== e.u && st[e.u].d ? [7, 5] : null });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) {
    let s = st[i], p = G.nodes[i];
    if (isArt[i]) { push(); translate(p.x, p.y); rotate(QUARTER_PI); noFill(); stroke(C.accent); strokeWeight(4); rectMode(CENTER); rect(0, 0, 50, 50, 6); pop(); }
    let fc = cw ? (i === hv ? C.black : PAL[cw.c[i] % PAL.length]) : s.d ? (curU === i ? C.gray : C.white) : C.white;
    drawNode(p.x, p.y, p.label, fc, { ring: i === curU ? C.yel : null, below: s.d ? s.d + '/' + s.low : undefined });
  }
  if (cw) { noStroke(); fill(isArt[hv] ? C.accent : C.green); textSize(18); textAlign(LEFT, BASELINE); text(G.nodes[hv].label + ' を消すと → ' + cw.k + ' つのかたまり' + (isArt[hv] ? '（関節点！）' : '（切れない）'), 40, GA.y + GA.h + 60); }
  statusLine(40, height - 34);
  let y = drawCode(CODE, curLine, width - 540, 110, 520);
  noStroke(); fill(C.dim); textSize(13); textAlign(LEFT, BASELINE);
  ['low[v] ＝ min( v.d, 後退辺 (w, x) の x.d（w は v の子孫） )', '子 s の部分木から v より上へ戻る道がない ⇔ low[s] ≥ v.d', '→ v を消すと s の部分木が切り離される', '計算量 Θ(V + E)：DFS 1 回だけ'].forEach((t, i) => text(t, width - 540, y + 24 + i * 20));
}

function mousePressed() { editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() { if (editRelease(G, GA)) resetRun(); }
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(articulation()); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if (key === '1' || key === '2') preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. 橋の両端は（葉でなければ）必ず関節点。確かめよう
// 2. 橋を 1 本、迂回路でつなぐ（ドラッグで線を足す）と、橋も関節点も消える
// 3. 通信網・送電網で「1 か所壊れたら切れる場所」を探すのがこのアルゴリズム



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
