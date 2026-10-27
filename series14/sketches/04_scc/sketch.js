// ============================================
// 04 強連結成分
// 強連結成分 ＝ 互いに行き来できる点のかたまり。かたまりを 1 点に縮めると DAG（成分グラフ）になる
// コサラジュの方法：① DFS で終了時刻 f を求める ② 矢印を全部逆向きにする（転置 Gᵀ）
//                  ③ f の大きい順に Gᵀ で DFS → できた木が 1 つずつ強連結成分
// 操作：スペース＝再生・停止 / →＝1 手 / 1・2＝お手本 / R＝最初から
//       ドラッグ＝矢印 / クリック＝点を追加 / C＝全部消す
// ============================================

let G, GA;
let phase = 0;         // 0 まだ / 1 DFS(G) / 2 転置 / 3 DFS(Gᵀ) / 4 完了
let st = [], clock = 0, order = [];  // clock ＝ 発見・終了時刻をつけるための時計
let comp = [], ncomp = 0;
let flipT = 0;         // 矢印が逆向きになるアニメーション（0→1）
let curU = -1, curV = -1;
const PAL = ['#ff5e7e', '#5ee6ff', '#ffd166', '#7cf4a6', '#c4b5fd', '#ffa25e', '#f0abfc', '#93c5fd', '#fca5a5', '#bef264'];
const CODE = [
  '強連結成分(G)  ─ コサラジュの方法',
  '  ① G で深さ優先探索し、各点の終了時刻 f を記録',
  '  ② 矢印を全部逆向きにしたグラフ Gᵀ をつくる',
  '  ③ Gᵀ で深さ優先探索。新しい木の根は',
  '     まだ白い点のうち f が一番大きいものを選ぶ',
  '  ④ ③ でできた木 1 本 ＝ 強連結成分 1 つ',
  '     （木の点を 1 つのかたまりとして出力）',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 70, y: 150, w: width - 680, h: height - 380 };
  G = makeGraph(true); G.keepOrder = true;
  if (k === 1) { // 8 点・成分 4 つ
    placeGraph(G, [[0, 0.3], [0.35, 0], [0.6, 0.3], [0.9, 0], [0.15, 1], [0.4, 0.75], [0.7, 1], [1, 0.6]], GA, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    for (let [u, v] of [[0, 1], [0, 4], [1, 2], [2, 3], [2, 5], [3, 7], [4, 0], [4, 5], [5, 1], [5, 6], [6, 7], [7, 3]]) addEdge(G, u, v);
  } else {
    let pos = [[0, 0.2], [0.2, 0], [0.2, 0.45], [0.45, 0.2], [0.65, 0], [0.65, 0.45], [0.45, 0.85], [0.75, 0.85], [1, 0.2], [1, 0.65]];
    placeGraph(G, pos, GA, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
    for (let [u, v] of [[0, 1], [1, 2], [2, 0], [1, 3], [3, 4], [4, 5], [5, 3], [2, 6], [6, 7], [7, 6], [5, 7], [4, 8], [8, 9], [9, 8], [7, 9]]) addEdge(G, u, v);
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  st = G.nodes.map(() => ({ color: 'white', d: 0, f: 0 }));
  clock = 0; order = []; comp = G.nodes.map(() => -1); ncomp = 0; flipT = 0; phase = 0; curU = curV = -1;
}

function* scc() {
  let n = G.nodes.length, A = adjList(G);
  phase = 1;
  yield { line: 1, msg: '① G で DFS（終了時刻 f を記録）' };
  for (let u = 0; u < n; u++) if (st[u].color === 'white') yield* visit1(u, A);
  curU = curV = -1;
  phase = 2;
  yield { line: 2, msg: '② 矢印を全部逆向きにする（Gᵀ）' };
  for (let i = 0; i < 10; i++) { flipT = (i + 1) / 10; yield { line: 2 }; }
  // Gᵀ の隣接リスト
  let AT = G.nodes.map(() => []);
  for (let e of G.edges) AT[e.v].push(e.u);
  phase = 3;
  let byF = [...Array(n).keys()].sort((a, b) => st[b].f - st[a].f);
  order = byF;
  for (let u = 0; u < n; u++) st[u].color = 'white';
  yield { line: 3, msg: '③ f の大きい順：' + byF.map((u) => G.nodes[u].label + '(' + st[u].f + ')').join(' ') };
  for (let u of byF) {
    if (st[u].color !== 'white') continue;
    yield { line: 4, msg: G.nodes[u].label + '（f = ' + st[u].f + '）から Gᵀ で DFS → 新しい成分 #' + (ncomp + 1) };
    yield* visit2(u, AT, ncomp);
    ncomp++;
    yield { line: 5, msg: '成分 #' + ncomp + ' = { ' + G.nodes.map((nd, i) => i).filter((i) => comp[i] === ncomp - 1).map((i) => G.nodes[i].label).join(', ') + ' }' };
  }
  curU = curV = -1; phase = 4;
  lastMsg = '完了：強連結成分は ' + ncomp + ' 個。右は成分グラフ（必ず DAG）';
}
function* visit1(u, A) {
  curU = u; clock++; st[u].d = clock; st[u].color = 'gray';
  yield { line: 1, msg: G.nodes[u].label + ' 発見 d = ' + clock };
  for (let a of A[u]) {
    curU = u; curV = a.v;
    if (st[a.v].color === 'white') { yield { line: 1, msg: G.nodes[u].label + ' → ' + G.nodes[a.v].label }; yield* visit1(a.v, A); curU = u; }
  }
  curV = -1; st[u].color = 'black'; clock++; st[u].f = clock;
  yield { line: 1, msg: G.nodes[u].label + ' 終了 f = ' + clock };
}
function* visit2(u, AT, c) {
  curU = u; st[u].color = 'gray'; comp[u] = c;
  yield { line: 4, msg: G.nodes[u].label + ' を成分 #' + (c + 1) + ' へ' };
  for (let v of AT[u]) {
    curU = u; curV = v;
    if (st[v].color === 'white') { yield { line: 4, msg: 'Gᵀ で ' + G.nodes[u].label + ' → ' + G.nodes[v].label }; yield* visit2(v, AT, c); curU = u; }
  }
  curV = -1; st[u].color = 'black';
}

function draw() {
  background(C.bg);
  autoRun();
  hud('04 強連結成分（コサラジュの方法）', ['スペース＝再生/停止　→＝1 手　1・2＝お手本　R＝最初から　ドラッグ＝矢印　クリック＝点　C＝消す',
    phase <= 1 ? '① G で DFS して、終了時刻 f を求める' : phase === 2 ? '② 矢印を全部ひっくり返す：同じ成分の中は、逆向きでもやっぱり行き来できる' : '③ f の大きい順に Gᵀ で DFS。逆向きなので、ほかの成分へはもれ出さない']);
  // 成分のかたまりを背景に
  if (phase >= 3) for (let c = 0; c < ncomp + 1; c++) {
    let mem = G.nodes.map((n, i) => i).filter((i) => comp[i] === c);
    if (mem.length === 0) continue;
    noStroke(); fill(withA(PAL[c % PAL.length], 40));
    for (let i of mem) circle(G.nodes[i].x, G.nodes[i].y, 86);
    for (let i of mem) for (let j of mem) if (i < j && findEdge(G, i, j) || findEdge(G, j, i)) { if (comp[i] === comp[j] && comp[i] === c) { stroke(withA(PAL[c % PAL.length], 40)); strokeWeight(60); line(G.nodes[i].x, G.nodes[i].y, G.nodes[j].x, G.nodes[j].y); noStroke(); } }
  }
  for (let e of G.edges) {
    // 転置：flipT に合わせて矢印の向きが入れ替わる
    let a = G.nodes[e.u], b = G.nodes[e.v];
    let look = phase === 3 ? e.v === curU && e.u === curV : e.u === curU && e.v === curV;
    let same = phase >= 3 && comp[e.u] >= 0 && comp[e.u] === comp[e.v];
    let col = look ? C.yel : same ? PAL[comp[e.u] % PAL.length] : C.edge;
    let o = { directed: true, bend: hasReverse(G, e) ? 14 : 0, col, w: look ? 4 : 2 };
    if (flipT <= 0) drawEdge(a, b, o);
    else if (flipT >= 1) drawEdge(b, a, { ...o, bend: -o.bend });
    else { // 途中：矢印が縮んでから反対向きに伸びる
      let t = flipT < 0.5 ? 1 - flipT * 2 : (flipT - 0.5) * 2;
      let from = flipT < 0.5 ? a : b, to = flipT < 0.5 ? b : a;
      let mid = { x: lerp(from.x, to.x, 0.5), y: lerp(from.y, to.y, 0.5) };
      drawEdge(from, { x: lerp(mid.x, to.x, t), y: lerp(mid.y, to.y, t) }, { ...o, r: 0, bend: 0 });
    }
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) {
    let s = st[i], c = comp[i];
    let fillC = phase >= 3 && c >= 0 ? (s.color === 'gray' ? C.gray : PAL[c % PAL.length]) : s.color;
    drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, fillC, { ring: i === curU ? C.yel : null, below: s.f ? s.d + '/' + s.f : s.d ? s.d + '/' : undefined });
  }
  if (phase >= 3) drawBoxes('f の大きい順', order.map((u) => ({ t: G.nodes[u].label + ' ' + st[u].f, col: comp[u] >= 0 ? PAL[comp[u] % PAL.length] : null })), 40, GA.y + GA.h + 60, width - 640);
  statusLine(40, height - 34);
  let y = drawCode(CODE, phase === 0 ? -1 : curLine, width - 540, 110, 520);
  drawComponentGraph(width - 540, y + 20, 520, height - y - 50);
}

// 成分グラフ Gˢᶜᶜ：成分を 1 点に縮めたグラフ
function drawComponentGraph(x, y, w, h) {
  panelBox(x, y, w, h, '成分グラフ Gˢᶜᶜ（成分を 1 点に縮める → DAG）');
  if (phase < 3 || ncomp === 0) { noStroke(); fill(C.dim); textSize(14); textAlign(CENTER, CENTER); text('③ で成分が見つかると、ここに現れる', x + w / 2, y + h / 2); return; }
  // 成分の重心を枠に縮小
  let cs = [];
  for (let c = 0; c < ncomp; c++) {
    let mem = G.nodes.map((n, i) => i).filter((i) => comp[i] === c);
    if (!mem.length) continue;
    let cx = mem.reduce((s, i) => s + G.nodes[i].x, 0) / mem.length, cy = mem.reduce((s, i) => s + G.nodes[i].y, 0) / mem.length;
    cs[c] = { x: x + 40 + ((cx - GA.x) / max(1, GA.w)) * (w - 80), y: y + 50 + ((cy - GA.y) / max(1, GA.h)) * (h - 90), label: mem.map((i) => G.nodes[i].label).join('') };
  }
  let seen = new Set();
  for (let e of G.edges) {
    let a = comp[e.u], b = comp[e.v];
    if (a < 0 || b < 0 || a === b || seen.has(a + '>' + b) || !cs[a] || !cs[b]) continue;
    seen.add(a + '>' + b);
    drawEdge(cs[a], cs[b], { directed: true, r: 26, col: C.dim });
  }
  for (let c = 0; c < ncomp; c++) if (cs[c]) drawNode(cs[c].x, cs[c].y, cs[c].label, PAL[c % PAL.length], { r: 24 });
}

function mousePressed() { editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() { if (editRelease(G, GA)) resetRun(); }
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(scc()); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if (key === '1' || key === '2') preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. お手本 1 で成分が {a,e} {b,c,f} {g} {d,h} の 4 つになるか確かめよう
// 2. h → a の矢印を足すと、成分はいくつになる？（成分グラフに閉路ができると成分は合体する）
// 3. ③ を「f の小さい順」に変えると、成分が混ざってしまう。確かめよう（byF の並べ方を逆に）



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
