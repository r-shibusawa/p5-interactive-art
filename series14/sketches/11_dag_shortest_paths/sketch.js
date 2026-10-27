// ============================================
// 11 DAG の最短経路と PERT（クリティカルパス）
// 閉路のない有向グラフなら、トポロジカル順に 1 回ずつ緩和するだけで最短経路が決まる。Θ(V + E)
// 負の重みがあっても OK。重みを「作業時間」にして「最長」経路を求めると、
// プロジェクト全体にかかる時間とクリティカルパス（遅れると全体が遅れる作業の列）がわかる（PERT）
// 操作：スペース＝再生・停止 / →＝1 手 / 1＝最短経路の例 / 2＝家を建てる（PERT・最長）
//       点をクリック＝始点 / 線の数字クリック＝重み / R＝最初から
// ============================================

let G, GA;
let mode = 1, src = 1;
let topo = [], d = [], pi = [];
let curU = -1, curE = null, improved = null;
const CODE_SP = [
  'DAG の最短経路(G, s)',
  '  点をトポロジカル順に並べる（03）',
  '  全部の d ← ∞、π ← なし、s.d ← 0',
  '  点 u を並べた順に 1 つずつ',
  '      u から出る辺 u → v それぞれについて',
  '          緩和(u → v)：短くなるなら d と π を書きかえ',
];
const CODE_PERT = [
  'PERT（最長経路）',
  '  点をトポロジカル順に並べる',
  '  全部の d ← −∞、s.d ← 0',
  '  点 u を並べた順に 1 つずつ',
  '      u から出る辺 u → v それぞれについて',
  '          u.d + 日数 > v.d なら  v.d ← u.d + 日数、v.π ← u',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  mode = k;
  G = makeGraph(true); G.keepOrder = true;
  if (k === 1) { // 6 点（すでにトポロジカル順に並んでいる。a は始点 b から行けない）
    placeGraph(G, [0, 1, 2, 3, 4, 5].map((i) => [i / 5, 0]), { x: 0, y: 0, w: 1, h: 1 }, ['a', 'b', 'c', 'd', 'e', 'f']);
    for (let [u, v, w] of [[0, 1, 3], [0, 3, 2], [1, 2, 4], [1, 3, 1], [2, 4, -2], [2, 5, 3], [3, 4, 6], [3, 5, 8], [4, 5, -1]]) addEdge(G, u, v, w);
    src = 1;
  } else { // 家を建てる（日数）
    let L = ['着工', '基礎', '骨組み', '屋根', '配管', '電気', '外壁', '内装', '完成'];
    placeGraph(G, L.map((l, i) => [i / 8, 0]), { x: 0, y: 0, w: 1, h: 1 }, L);
    for (let [u, v, w] of [[0, 1, 2], [1, 2, 5], [2, 3, 3], [2, 4, 4], [2, 5, 2], [3, 6, 4], [4, 7, 3], [5, 7, 2], [6, 8, 2], [7, 8, 6], [1, 4, 1], [3, 7, 1]]) addEdge(G, u, v, w);
    src = 0;
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  d = G.nodes.map(() => (mode === 2 ? -Infinity : Infinity)); pi = G.nodes.map(() => -1);
  topo = []; curU = -1; curE = improved = null;
  if (src >= G.nodes.length) src = 0;
}

// 一列に並べたときの位置（トポロジカル順）
function layoutLine() {
  let n = G.nodes.length, order = topo.length === n ? topo : G.nodes.map((nd, i) => i);
  let x0 = 90, x1 = width - 90, y = height * 0.64;
  order.forEach((u, k) => { G.nodes[u].x = lerp(G.nodes[u].x || x0 + (k / max(1, n - 1)) * (x1 - x0), x0 + (k / max(1, n - 1)) * (x1 - x0), 0.15); G.nodes[u].y = lerp(G.nodes[u].y || y, y, 0.15); });
}

function topoSort() {
  let n = G.nodes.length, seen = Array(n).fill(0), out = [], A = adjList(G), ok = true;
  let visit = (u) => { seen[u] = 1; for (let a of A[u]) { if (seen[a.v] === 0) visit(a.v); else if (seen[a.v] === 1) ok = false; } seen[u] = 2; out.unshift(u); };
  for (let u = 0; u < n; u++) if (!seen[u]) visit(u);
  return ok ? out : null;
}

function* dagSP(s) {
  let t = topoSort();
  if (!t) { lastMsg = '閉路があるので DAG ではない'; return; }
  topo = t;
  yield { line: 1, msg: 'トポロジカル順：' + topo.map((u) => G.nodes[u].label).join(' → ') };
  let longest = mode === 2;
  d = G.nodes.map(() => (longest ? -Infinity : Infinity)); pi = G.nodes.map(() => -1); d[s] = 0;
  yield { line: 2, msg: longest ? 'd = −∞（まだ始められない）、始点 0' : 'd = ∞、始点 ' + G.nodes[s].label + '.d = 0' };
  let A = adjList(G);
  for (let u of topo) {
    curU = u; curE = improved = null;
    yield { line: 3, msg: G.nodes[u].label + '（d = ' + fmt(d[u]) + '）の番：この時点で d は確定している' };
    for (let a of A[u]) {
      curE = a.e; improved = null;
      let nd = d[u] + a.w, better = longest ? d[a.v] < nd : d[a.v] > nd;
      if (better && d[u] !== (longest ? -Infinity : Infinity)) {
        let old = d[a.v]; d[a.v] = nd; pi[a.v] = u; improved = a.e;
        yield { line: 5, msg: '緩和 ' + G.nodes[u].label + '→' + G.nodes[a.v].label + '：' + fmt(old) + ' → ' + nd };
      } else yield { line: 5, msg: '緩和 ' + G.nodes[u].label + '→' + G.nodes[a.v].label + '：変化なし' };
    }
  }
  curU = -1; curE = improved = null;
  if (longest) { let sink = G.nodes.length - 1; lastMsg = '完了：全体で ' + d[sink] + ' 日。赤い道がクリティカルパス'; }
  else lastMsg = '完了：各辺を 1 回ずつ見ただけ（Θ(V+E)）';
}

function criticalSet() {
  let set = new Set(); if (mode !== 2 || !finished) return set;
  let v = G.nodes.length - 1;
  while (pi[v] >= 0) { set.add(findEdge(G, pi[v], v)); v = pi[v]; }
  return set;
}

function draw() {
  background(C.bg);
  autoRun();
  layoutLine();
  let longest = mode === 2;
  hud('11 DAG の最短経路' + (longest ? ' → PERT（クリティカルパス）' : '') + '', ['スペース＝再生/停止　→＝1 手　1＝最短経路の例　2＝家を建てる（最長経路・PERT）　点クリック＝始点　線の数字クリック＝重み　R＝最初から',
    longest ? '矢印 ＝ 作業（数字は日数）。点 ＝ そこまでの作業が全部終わった時点。d ＝ 最も早く着手できる日' : '左から右へ（トポロジカル順に）1 回ずつ緩和。点の下 d、赤い線 π']);
  let crit = criticalSet();
  let n = G.nodes.length;
  G.edges.forEach((e, k) => {
    let span = abs(G.nodes[e.v].x - G.nodes[e.u].x) / max(1, (width - 180) / max(1, n - 1));
    let side = k % 2 === 0 ? -1 : 1;
    let bend = span > 1.2 ? side * min(60, span * 20) : 0;
    let col = C.edge, w = 2;
    if (pi[e.v] === e.u) { col = longest ? C.orange : C.accent; w = 4; }
    if (crit.has(e)) { col = C.accent; w = 7; }
    if (e === curE) { col = C.yel; w = 5; }
    if (e === improved) { col = C.green; w = 6; }
    drawEdge(G.nodes[e.u], G.nodes[e.v], { directed: true, r: 28, bend, col, w, label: e.w, labelCol: e.w < 0 ? C.accent : C.text });
  });
  for (let i = 0; i < n; i++) {
    let done = topo.length && curU >= 0 && topo.indexOf(i) < topo.indexOf(curU);
    drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, i === curU ? C.yel : finished || done ? 'black' : i === src ? C.accent : C.white, { r: 28, ring: i === src ? C.accent : null, below: 'd=' + fmt(d[i]) });
  }
  statusLine(40, height - 34);
  let y = drawCode(longest ? CODE_PERT : CODE_SP, curLine, 40, 110, 560);
  noStroke(); fill(C.dim); textSize(13); textAlign(LEFT, BASELINE);
  let notes = longest ? ['最長経路は一般のグラフでは難しい（NP 困難）が、DAG なら簡単', '重みを −1 倍して最短経路を求めても同じ', 'クリティカルパス上の作業が 1 日遅れると、完成も 1 日遅れる', 'それ以外の作業には「余裕（スラック）」がある'] :
    ['なぜ 1 回で十分？ u を処理するときには、u に入る辺はすべて処理済み', '（トポロジカル順なので u より前の点からしか入ってこない）', '→ 経路緩和性により d は正しい。負の重みも OK', 'a は始点 b から行けないので d = ∞ のまま'];
  notes.forEach((t, i) => text(t, 40, y + 24 + i * 20));
  if (longest && finished) { // 余裕（スラック）の表
    let sink = n - 1, late = G.nodes.map(() => Infinity); late[sink] = d[sink];
    for (let k = topo.length - 1; k >= 0; k--) { let u = topo[k]; for (let e of G.edges) if (e.u === u) late[u] = min(late[u], late[e.v] - e.w); }
    panelBox(width - 560, 110, 520, 30 + 22 * ceil(n / 2), '各時点の 最早 / 最遅（差 ＝ 余裕）');
    noStroke(); textSize(14); textAlign(LEFT, BASELINE);
    for (let i = 0; i < n; i++) { let slack = late[i] - d[i]; fill(slack === 0 ? C.accent : C.text); text(G.nodes[i].label + '  ' + d[i] + ' / ' + late[i] + (slack === 0 ? '  ★' : '  余裕 ' + slack), width - 544 + (i % 2) * 250, 158 + floor(i / 2) * 22); }
  }
}

function mousePressed() {
  if (weightClick(G, -5, 9)) { resetRun(); return; }
  let i = nodeAt(G.nodes, mouseX, mouseY, 30);
  if (i >= 0) { src = i; resetRun(); }
}
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(dagSP(src)); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if (key === '1' || key === '2') preset(+key);
  if (key === 'r' || key === 'R') resetRun();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. お手本 1 で d = (∞, 0, 4, 1, 2, 1) になるか確かめよう（負の辺で f が近くなる）
// 2. 家を建てる：内装の日数を減らしても完成が早まらないことがある。なぜ？
// 3. 余裕 0 の作業（★）だけを並べると、クリティカルパスになっている



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
