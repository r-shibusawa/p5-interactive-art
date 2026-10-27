// ============================================
// 10 ベルマン–フォード法と差分制約
// 負の重みがあっても使える最短経路。全部の辺を緩和（d を短く書きかえられるか試す）することを |V|−1 回くり返す
// そのあともう 1 周して、まだ短くなる辺があれば「負の閉路」がある（最短経路が存在しない）
// 差分制約 xⱼ − xᵢ ≤ b は、辺 vᵢ → vⱼ（重み b）に置きかえるとベルマン–フォードで解ける
// 操作：スペース＝再生・停止 / →＝1 手 / 1＝負の重みあり / 2＝負の閉路 / 3＝差分制約 / 4＝解なしの制約
//       点をクリック＝始点 / 線の数字クリック＝重み（Shift で減らす）/ ドラッグ＝矢印 / R＝最初から
// ============================================

let G, GA;
let mode = 1, src = 0;
let d = [], pi = [];
let pass = 0, curE = null, improved = null, badE = null, result = null;
let cons = []; // 差分制約 [j, i, b] : x_j − x_i ≤ b
const CODE = [
  'ベルマン–フォード法(G, s)',
  '  全部の d ← ∞、π ← なし、s.d ← 0',
  '  (点の数 − 1) 周くり返す',
  '      辺 u → v を 1 本ずつ全部',
  '          緩和(u → v)',
  '  最後にもう 1 周、辺 u → v を全部見る',
  '      u.d + 重み < v.d なら（まだ短くなる）',
  '          「負の閉路あり」で終わる',
  '  「最短経路が求まった」で終わる',
  '緩和(u → v)',
  '  u.d + 重み < v.d なら  v.d ← u.d + 重み、v.π ← u',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  mode = k; cons = [];
  GA = { x: 70, y: 160, w: width - 680, h: height - 380 };
  G = makeGraph(true); G.keepOrder = true;
  if (k === 1) { // 負の重みあり（負の閉路はなし）。辺の順番がわざと悪いので 3 周目まで変化が続く
    placeGraph(G, [[0, 0.5], [0.4, 0], [0.4, 1], [0.95, 0], [0.95, 1]], GA, ['s', 'a', 'b', 'c', 'd']);
    for (let [u, v, w] of [[1, 3, 5], [3, 4, 3], [2, 1, -3], [1, 4, 7], [4, 2, -2], [2, 3, 7], [0, 1, 4], [0, 2, 6]]) addEdge(G, u, v, w);
    src = 0;
  } else if (k === 2) { // 負の閉路
    placeGraph(G, [[0, 0.5], [0.35, 0], [0.35, 1], [0.7, 0.5], [1, 0]], GA, ['s', 'a', 'b', 'c', 'd']);
    for (let [u, v, w] of [[0, 1, 4], [0, 2, 5], [1, 3, 3], [3, 2, -6], [2, 1, 2], [3, 4, 1]]) addEdge(G, u, v, w);
    src = 0;
  } else { // 差分制約 → 制約グラフ（v0 から全部へ 0）
    cons = [[5, 4, 2], [4, 3, -1], [3, 2, -2], [2, 1, -1], [1, 5, 3], [3, 1, 0], [5, 2, -1], [4, 1, 1]];
    if (k === 4) cons.push([1, 4, -2], [2, 5, 0]);
    placeGraph(G, [[0.5, 0.5], [0.5, 0], [1, 0.3], [0.85, 1], [0.15, 1], [0, 0.3]], GA, ['v0', 'v1', 'v2', 'v3', 'v4', 'v5']);
    for (let i = 1; i <= 5; i++) addEdge(G, 0, i, 0);
    for (let [j, i, b] of cons) addEdge(G, i, j, b);
    src = 0;
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  d = G.nodes.map(() => Infinity); pi = G.nodes.map(() => -1);
  pass = 0; curE = improved = badE = null; result = null;
  if (src >= G.nodes.length) src = 0;
}

function* bellmanFord(s) {
  d = G.nodes.map(() => Infinity); pi = G.nodes.map(() => -1); d[s] = 0;
  yield { line: 1, msg: 'd = ∞、' + G.nodes[s].label + '.d = 0' };
  for (pass = 1; pass <= G.nodes.length - 1; pass++) {
    let changed = false;
    yield { line: 2, msg: pass + ' 周目（全 ' + (G.nodes.length - 1) + ' 周）' };
    for (let e of G.edges) {
      curE = e; improved = null;
      let nd = d[e.u] + e.w;
      if (d[e.v] > nd) {
        let old = d[e.v]; d[e.v] = nd; pi[e.v] = e.u; improved = e; changed = true;
        yield { line: 10, msg: '緩和 ' + G.nodes[e.u].label + '→' + G.nodes[e.v].label + '：' + G.nodes[e.v].label + '.d ' + fmt(old) + ' → ' + fmt(d[e.u]) + ' + (' + e.w + ') = ' + nd };
      } else yield { line: 4, msg: '緩和 ' + G.nodes[e.u].label + '→' + G.nodes[e.v].label + '：' + fmt(d[e.u]) + ' + (' + e.w + ') ≥ ' + fmt(d[e.v]) + ' → そのまま' };
    }
    curE = improved = null;
    if (!changed) { yield { line: 2, msg: pass + ' 周目で何も変わらなかった（ここで止めても OK）' }; }
  }
  pass = G.nodes.length;
  for (let e of G.edges) {
    curE = e;
    yield { line: 6, msg: '確認：' + G.nodes[e.v].label + '.d > ' + G.nodes[e.u].label + '.d + w ?' };
    if (d[e.v] > d[e.u] + e.w) { badE = e; result = false; curE = null; yield { line: 7, msg: 'まだ短くなる → 負の閉路がある！' }; lastMsg = '失敗：負の閉路（ぐるぐる回るほど短くなる）' + (mode >= 3 ? ' → 制約を全部満たす解はない' : ''); return; }
  }
  curE = null; result = true;
  yield { line: 8, msg: '負の閉路はない' };
  lastMsg = '成功：最短経路が求まった' + (mode >= 3 ? ' → xᵢ = δ(v0, vᵢ) が制約の解' : '');
}

function draw() {
  background(C.bg);
  autoRun();
  hud('10 ベルマン–フォード法' + (mode >= 3 ? ' で差分制約を解く' : ''), ['スペース＝再生/停止　→＝1 手　1＝負の重み　2＝負の閉路　3＝差分制約　4＝解なし　点クリック＝始点　線の数字クリック＝重み（Shift で減）　R＝最初から',
    '点の下 d　赤い太線＝π（最短経路木）　緑＝いま d が小さくなった辺　' + (pass > 0 && pass < G.nodes.length ? pass + ' 周目' : '')]);
  for (let e of G.edges) {
    let tree = pi[e.v] === e.u, col = C.edge, w = 2;
    if (tree) { col = C.accent; w = 4; }
    if (e === curE) { col = C.yel; w = 5; }
    if (e === improved) { col = C.green; w = 6; }
    if (e === badE) { col = '#ff2d55'; w = 7; }
    drawEdge(G.nodes[e.u], G.nodes[e.v], { directed: true, bend: hasReverse(G, e) ? 14 : 0, col, w, label: e.w, labelCol: e.w < 0 ? C.accent : C.text });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, i === src ? C.accent : improved && improved.v === i ? C.green : C.white, { below: 'd=' + fmt(d[i]) });
  statusLine(40, height - 34);
  let y = drawCode(CODE, curLine, width - 540, 110, 520);
  if (mode >= 3) drawConstraints(width - 540, y + 14, 520);
  else {
    // 辺の順番
    drawBoxes('辺の順', G.edges.map((e) => ({ t: G.nodes[e.u].label + G.nodes[e.v].label, col: e === curE ? C.yel : e === improved ? C.green : null })), width - 540, y + 14, 520);
    noStroke(); fill(C.dim); textSize(13); textAlign(LEFT, BASELINE);
    ['なぜ |V|−1 周で十分？ 最短経路は高々 |V|−1 本の辺', 'i 周目が終わると、辺 i 本以内の最短経路は全部正しい（経路緩和性）', '計算量 Θ(VE)。ダイクストラより遅いが負の重みに強い'].forEach((t, i) => text(t, width - 540, y + 76 + i * 20));
  }
}

function drawConstraints(x, y, w) {
  let h = height - y - 30;
  panelBox(x, y, w, h, '差分制約 xⱼ − xᵢ ≤ b　→　辺 vᵢ → vⱼ（重み b）');
  noStroke(); textSize(15); textAlign(LEFT, BASELINE);
  cons.forEach(([j, i, b], k) => {
    let ok = result === true ? d[j] - d[i] <= b : null;
    fill(ok === null ? C.text : ok ? C.green : C.accent);
    text('x' + j + ' − x' + i + ' ≤ ' + b + (ok === null ? '' : '　' + (d[j] - d[i]) + (ok ? ' ✔' : ' ✗')), x + 16 + (k % 2) * 250, y + 44 + floor(k / 2) * 22);
  });
  // 数直線に解を並べる
  if (result === true) {
    let ly = y + h - 50, xs = d.slice(1), lo = min(xs) - 1, hi = max(max(xs), 0) + 1;
    stroke(C.dim); strokeWeight(2); line(x + 20, ly, x + w - 20, ly);
    for (let v = ceil(lo); v <= hi; v++) { let px = map(v, lo, hi, x + 20, x + w - 20); stroke(C.dim); line(px, ly - 4, px, ly + 4); noStroke(); fill(C.dim); textSize(11); textAlign(CENTER, TOP); text(v, px, ly + 8); }
    let seen = {};
    for (let i = 1; i < d.length; i++) { let px = map(d[i], lo, hi, x + 20, x + w - 20), k = (seen[d[i]] = (seen[d[i]] || 0) + 1); drawNode(px, ly - 18 - (k - 1) * 30, 'x' + i, C.cyan, { r: 13 }); }
    noStroke(); fill(C.green); textSize(14); textAlign(LEFT, BASELINE); text('解 x = (' + d.slice(1).join(', ') + ')　全部に定数を足しても解', x + 16, ly - 70);
  } else if (result === false) { noStroke(); fill(C.accent); textSize(16); textAlign(LEFT, BASELINE); text('負の閉路 ＝ 足し合わせると 0 ≤ (負の数) になる矛盾した制約', x + 16, y + h - 30); }
}

function mousePressed() { if (weightClick(G, -5, 10)) { resetRun(); ed.from = -2; return; } editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() {
  let r = editRelease(G, GA, 3);
  if (r === 'click') { src = ed.clicked; resetRun(); } else if (r) resetRun();
}
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(bellmanFord(src)); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if ('1234'.includes(key)) preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; cons = []; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(mode); }

// ---------- やってみよう ----------
// 1. お手本 1 で d = (0, 3, 6, 8, 10) になるか確かめよう。何周目で変化が止まる？
// 2. 2 の負の閉路の重みを 1 つ大きくして（Shift なしでクリック）閉路の合計を 0 以上にすると？
// 3. 差分制約は「時間割」「作業の開始時刻」の問題。制約を 1 つ厳しくすると解が消える（4）



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
