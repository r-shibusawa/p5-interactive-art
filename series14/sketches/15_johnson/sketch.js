// ============================================
// 15 ジョンソン法
// まばらなグラフの全点対最短路。負の重みがあってもダイクストラ法を使えるように「重みを付け替える」
//  ① 新しい点 s を足し、s から全部の点へ重み 0 の辺。ベルマン–フォードで h(v) = δ(s, v)
//  ② ŵ(u, v) = w(u, v) + h(u) − h(v) ≥ 0（三角不等式より）。どの経路も「両端の h の差」だけずれるので最短経路は変わらない
//  ③ 各点からダイクストラ → d(u, v) = δ̂(u, v) + h(v) − h(u)　計算量 O(V² log V + VE)
// h は「高さ（位置エネルギー）」。坂を下る辺は付け替え後に軽くならない
// 操作：スペース＝再生・停止 / →＝1 手 / 線の数字クリック＝重み / 1＝5 点の例（14 と同じ）/ 2＝6 点の例 / R＝最初から
// ============================================

let G, GA;
let phase = 0;          // 0 前 / 1 s を足して BF / 2 付け替え / 3 ダイクストラ / 4 完了
let h = [], showS = 0, reT = 0, D = [], srcRow = -1, dh = [], curE = null;
const CODE = [
  'ジョンソン法(G)',
  '  新しい点 s と、s → 全部の点（重み 0）の辺を足す',
  '  s からベルマン–フォード法（負の閉路なら中止）',
  '  各点の高さ h(v) ← s からの最短距離',
  '  各辺の重みを付け替え：ŵ ← w + h(u) − h(v)',
  '  各点 u を始点にして',
  '      重み ŵ でダイクストラ法 → δ̂(u, v)',
  '      高さを戻す：d(u, v) ← δ̂(u, v) + h(v) − h(u)',
  '  表 D が答え',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 90, y: 190, w: width - 760, h: height - 380 };
  G = makeGraph(true);
  if (k === 1) {
    placeGraph(G, [[0, 0.2], [0.55, 0], [1, 0.5], [0.6, 1], [0.05, 0.9]], GA, ['1', '2', '3', '4', '5']);
    for (let [u, v, w] of [[0, 1, 4], [0, 2, -2], [1, 3, 3], [2, 1, 5], [2, 4, 6], [3, 0, 1], [3, 2, 7], [4, 3, -3], [1, 4, 2], [4, 0, 8]]) addEdge(G, u, v, w);
  } else {
    placeGraph(G, [[0, 0.3], [0.35, 0], [0.35, 0.7], [0.7, 0.3], [1, 0], [1, 0.8]], GA, ['a', 'b', 'c', 'd', 'e', 'f']);
    for (let [u, v, w] of [[0, 1, 2], [0, 2, 4], [1, 2, -2], [1, 3, 5], [2, 3, 1], [3, 4, -3], [3, 5, 2], [4, 5, 4], [5, 2, 3]]) addEdge(G, u, v, w);
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  phase = 0; h = G.nodes.map(() => 0); showS = 0; reT = 0; D = []; srcRow = -1; dh = []; curE = null;
}
function what(e) { return e.w + h[e.u] - h[e.v]; } // ŵ

function* johnson() {
  let n = G.nodes.length;
  phase = 1;
  for (let i = 0; i < 10; i++) { showS = (i + 1) / 10; yield { line: 1, msg: '新しい点 s を足す（s → 全点、重み 0）' }; }
  // ベルマン–フォード（s から）
  h = G.nodes.map(() => 0); // s からの 0 の辺で、最初は全部 0
  yield { line: 2, msg: 's からベルマン–フォード法：最初は s→v の 0 で h(v) = 0' };
  for (let pass = 0; pass < n; pass++) {
    let ch = false;
    for (let e of G.edges) if (h[e.u] + e.w < h[e.v]) { h[e.v] = h[e.u] + e.w; ch = true; curE = e; yield { line: 2, msg: '緩和 ' + G.nodes[e.u].label + '→' + G.nodes[e.v].label + '：h(' + G.nodes[e.v].label + ') = ' + h[e.v] }; }
    if (!ch) break;
    if (pass === n - 1) { lastMsg = '負の閉路があるので止める'; phase = 0; return; }
  }
  curE = null;
  yield { line: 3, msg: 'h = (' + h.join(', ') + ')　点の高さとして表示' };
  phase = 2;
  for (let i = 0; i < 20; i++) { reT = (i + 1) / 20; yield { line: 4, msg: '重みを付け替える：ŵ = w + h(u) − h(v)　→ 全部 0 以上！' }; }
  phase = 3;
  D = G.nodes.map(() => G.nodes.map(() => Infinity)); dh = D.map((r) => r.slice());
  let A = G.nodes.map(() => []); for (let e of G.edges) A[e.u].push(e);
  for (let u = 0; u < n; u++) {
    srcRow = u;
    yield { line: 5, msg: G.nodes[u].label + ' からダイクストラ（重み ŵ ≥ 0 なので OK）' };
    let d = Array(n).fill(Infinity), done = Array(n).fill(false); d[u] = 0;
    for (let it = 0; it < n; it++) {
      let x = -1; for (let i = 0; i < n; i++) if (!done[i] && (x < 0 || d[i] < d[x])) x = i;
      if (x < 0 || d[x] === Infinity) break;
      done[x] = true;
      for (let e of A[x]) if (d[x] + what(e) < d[e.v]) d[e.v] = d[x] + what(e);
    }
    dh[u] = d.slice();
    yield { line: 6, msg: 'δ̂(' + G.nodes[u].label + ', ·) = (' + d.map(fmt).join(', ') + ')' };
    D[u] = d.map((v, j) => (v === Infinity ? Infinity : v + h[j] - h[u]));
    yield { line: 7, msg: '高さを戻す：d(' + G.nodes[u].label + ', v) = δ̂ + h(v) − h(' + G.nodes[u].label + ') = (' + D[u].map(fmt).join(', ') + ')' };
  }
  srcRow = -1; phase = 4;
  lastMsg = '完了：表 D が全点対の最短距離（フロイド–ワーシャル（14）と同じ答え）';
}

function draw() {
  background(C.bg);
  autoRun();
  hud('15 ジョンソン法', ['スペース＝再生/停止　→＝1 手　線の数字クリック＝重み　1・2＝お手本　R＝最初から',
    '点の高さの棒 ＝ h(v)（下ほど低い）。付け替え後の数字 ŵ は全部 0 以上。赤字 ＝ 負の重み']);
  let n = G.nodes.length; if (!n) return;
  // 高さ h を縦にずらして見せる（坂のイメージ）
  let P = G.nodes.map((p, i) => ({ x: p.x, y: p.y - h[i] * 14 * (phase >= 1 ? 1 : 0) }));
  // 高さの棒
  for (let i = 0; i < n; i++) if (h[i] !== 0) { stroke(withA(C.violet, 120)); strokeWeight(3); drawingContext.setLineDash([4, 4]); line(G.nodes[i].x, G.nodes[i].y, P[i].x, P[i].y); drawingContext.setLineDash([]); }
  // s
  let S = { x: GA.x + GA.w / 2, y: GA.y - 60 };
  if (showS > 0 && phase < 3) for (let i = 0; i < n; i++) drawEdge(S, P[i], { directed: true, r: 22, col: withA(C.dim, 160 * showS), w: 1.5, dash: [5, 5] });
  for (let e of G.edges) {
    let w = phase >= 2 ? lerp(e.w, what(e), reT) : e.w, lab = phase >= 2 ? (reT < 1 ? nf(w, 1, 1) : String(what(e))) : String(e.w);
    let col = e === curE ? C.yel : phase >= 2 && reT >= 1 ? C.green : e.w < 0 ? C.accent : C.edge;
    drawEdge(P[e.u], P[e.v], { directed: true, bend: hasReverse(G, e) ? 14 : 0, col, w: e === curE ? 4 : 2.5, label: lab, labelCol: w < 0 ? C.accent : C.text });
  }
  if (showS > 0 && phase < 3) drawNode(S.x, S.y, 's', withA(C.cyan, 255 * showS));
  for (let i = 0; i < n; i++) drawNode(P[i].x, P[i].y, G.nodes[i].label, i === srcRow ? C.yel : C.white, { below: phase >= 1 ? 'h=' + h[i] : undefined, belowCol: C.violet });
  statusLine(40, height - 34);
  let y = drawCode(CODE, curLine, width - 580, 110, 560);
  // 結果の表
  let cell = min(44, (width - 600) / 2 / (n + 1));
  panelBox(width - 580, y + 14, 560, height - y - 64, '');
  let tx = width - 566, ty = y + 50;
  for (let [T, name, cx] of [[dh, 'δ̂（付け替え後）', tx], [D, 'D ＝ δ̂ + h(v) − h(u)', tx + cell * (n + 1) + 20]]) {
    noStroke(); fill(C.text); textSize(14); textAlign(LEFT, BASELINE); text(name, cx, ty - 12);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      let v = T[i] ? T[i][j] : undefined;
      fill(i === srcRow ? '#3a3420' : '#1c2036'); rect(cx + j * cell, ty + i * cell, cell - 3, cell - 3, 4);
      fill(v === undefined ? C.dim : v < 0 ? C.accent : C.text); textAlign(CENTER, CENTER); textSize(cell * 0.36);
      text(v === undefined ? '' : fmt(v), cx + j * cell + cell / 2 - 1, ty + i * cell + cell / 2 - 1);
    }
  }
}

function mousePressed() { if (phase === 0 && weightClick(G, -5, 10)) resetRun(); }
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { resetRun(); startRun(johnson()); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if (key === '1' || key === '2') preset(+key);
  if (key === 'r' || key === 'R') resetRun();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. お手本 1 で h = (−2, 0, −4, −3, 0)、ŵ が全部 0 以上になるか確かめよう
// 2. 経路 1→3→5→4 の ŵ の合計と w の合計の差は h(1) − h(4) になっている？
// 3. 点が多く辺が少ないグラフでは、フロイド–ワーシャル Θ(V³) よりジョンソン法が速い



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
