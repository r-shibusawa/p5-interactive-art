// ============================================
// 00 グラフの表現：隣接リストと隣接行列
// 同じグラフを 2 通りに書く。リストは Θ(V+E)、行列は Θ(V²) のメモリ
// 「u と v はつながっている？」は行列なら一発、「u の隣を全部」はリストが速い
// 操作：クリック＝点 / 点から点へドラッグ＝線 / 行列のマスをクリック＝線のON/OFF
//       D＝有向・無向の切り替え / 1・2＝お手本（無向・有向） / C＝全部消す
// ============================================

let G;
let GA; // グラフを描く範囲
let hover = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function layout() { GA = { x: 60, y: 150, w: max(300, width * 0.42), h: height - 230 }; }

function preset(k) {
  layout();
  if (k === 1) { // 無向グラフ（五角形＋対角線 1 本）
    G = makeGraph(false);
    placeGraph(G, [[0.5, 0.05], [0.95, 0.4], [0.75, 0.95], [0.25, 0.95], [0.05, 0.4]], GA, ['1', '2', '3', '4', '5']);
    for (let [u, v] of [[0, 1], [0, 4], [1, 2], [1, 3], [2, 3], [3, 4], [0, 3]]) addEdge(G, u, v);
  } else { // 有向グラフ（3→6 と 6→3 の往復あり）
    G = makeGraph(true);
    placeGraph(G, [[0.05, 0.15], [0.5, 0.15], [0.95, 0.15], [0.05, 0.85], [0.5, 0.85], [0.95, 0.85]], GA, ['1', '2', '3', '4', '5', '6']);
    for (let [u, v] of [[0, 1], [1, 2], [0, 4], [3, 0], [4, 3], [4, 5], [5, 2], [2, 5], [1, 4]]) addEdge(G, u, v);
  }
}

function draw() {
  background(C.bg);
  hover = nodeAt(G.nodes, mouseX, mouseY);
  hud('00 グラフの表現 ─ 隣接リスト と 隣接行列', [
    'クリック＝点　点→点ドラッグ＝線　行列のマスをクリック＝線のON/OFF　D＝' + (G.directed ? '有向' : '無向') + '（切り替え）　1・2＝お手本　C＝消す',
    '点にマウスをのせると、リストの行と行列の行・列が光る',
  ]);
  // グラフ
  for (let e of G.edges) {
    let hot = hover >= 0 && (e.u === hover || (!G.directed && e.v === hover));
    drawEdge(G.nodes[e.u], G.nodes[e.v], { directed: G.directed, bend: hasReverse(G, e) ? 14 : 0, col: hot ? C.accent : C.edge, w: hot ? 3.5 : 2 });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, i === hover ? C.accent : C.white);

  let n = G.nodes.length, A = adjList(G);
  let px = GA.x + GA.w + 80, pw = width - px - 30;
  // 隣接リスト
  let rowH = min(34, (height * 0.42 - 40) / max(1, n));
  panelBox(px, 110, pw, 40 + n * rowH, '隣接リスト Adj[u]');
  for (let u = 0; u < n; u++) {
    let y = 135 + u * rowH;
    if (u === hover) { noStroke(); fill(withA(C.accent, 50)); rect(px + 6, y, pw - 12, rowH - 2, 6); }
    fill(C.text); noStroke(); textSize(min(15, rowH * 0.55)); textAlign(LEFT, CENTER);
    text(G.nodes[u].label + ' →', px + 14, y + rowH / 2);
    let bx = px + 60;
    for (let a of A[u]) {
      stroke(C.edge); fill(C.panel); rect(bx, y + 3, 30, rowH - 8, 5);
      noStroke(); fill(C.cyan); textAlign(CENTER, CENTER); text(G.nodes[a.v].label, bx + 15, y + rowH / 2);
      if (bx + 70 < px + pw) { stroke(C.dim); line(bx + 30, y + rowH / 2, bx + 38, y + rowH / 2); }
      bx += 38;
      if (bx > px + pw - 40) break;
    }
    textAlign(CENTER, CENTER); fill(C.dim); noStroke(); text('/', bx + 6, y + rowH / 2);
  }
  // 隣接行列
  let my = 110 + 40 + n * rowH + 20;
  let cell = min(34, (height - my - 90) / max(1, n + 1), (pw - 30) / max(1, n + 1));
  panelBox(px, my, pw, cell * (n + 1) + 40, '隣接行列 A[u][v]（1 ＝ 線がある）');
  for (let u = 0; u < n; u++) {
    noStroke(); fill(C.dim); textSize(min(14, cell * 0.5)); textAlign(CENTER, CENTER);
    text(G.nodes[u].label, px + 20 + cell * (u + 1.5), my + 30 + cell * 0.5);
    text(G.nodes[u].label, px + 20 + cell * 0.5, my + 30 + cell * (u + 1.5));
    for (let v = 0; v < n; v++) {
      let on = !!findEdge(G, u, v);
      let x = px + 20 + cell * (v + 1), y = my + 30 + cell * (u + 1);
      let hot = u === hover || v === hover;
      stroke(C.bg); strokeWeight(1); fill(on ? (hot ? C.accent : C.cyan) : hot ? '#262b45' : '#1c2036');
      rect(x, y, cell, cell);
      noStroke(); fill(on ? C.bg : C.dim); text(on ? '1' : '0', x + cell / 2, y + cell / 2);
    }
  }
  // メモリの比較
  let listCells = A.reduce((s, a) => s + a.length, 0);
  noStroke(); textAlign(LEFT, BASELINE); textSize(15);
  fill(C.cyan); text('リストの箱 = ' + listCells + (G.directed ? '（= E）' : '（= 2E）') + '　＋ 頭 ' + n, px, height - 40);
  fill(C.yel); text('行列のマス = ' + n * n + '（= V²）', px, height - 18);
  fill(C.dim); text(G.directed ? '有向：A は非対称' : '無向：A は対称（A = Aᵀ）', px + 260, height - 18);
}

function matrixCell() {
  let n = G.nodes.length, px = GA.x + GA.w + 80, pw = width - px - 30;
  let rowH = min(34, (height * 0.42 - 40) / max(1, n));
  let my = 110 + 40 + n * rowH + 20;
  let cell = min(34, (height - my - 90) / max(1, n + 1), (pw - 30) / max(1, n + 1));
  let v = floor((mouseX - px - 20) / cell) - 1, u = floor((mouseY - my - 30) / cell) - 1;
  return u >= 0 && v >= 0 && u < n && v < n ? [u, v] : null;
}

function mousePressed() {
  let mc = matrixCell();
  if (mc) {
    let [u, v] = mc, e = findEdge(G, u, v);
    if (e) G.edges.splice(G.edges.indexOf(e), 1); else addEdge(G, u, v);
    ed.from = -2;
    return;
  }
  editPress(G, GA);
}
function mouseDragged() { editDrag(); }
function mouseReleased() { editRelease(G, GA); }
function keyPressed() {
  if (key === '1' || key === '2') preset(+key);
  if (key === 'd' || key === 'D') { G.directed = !G.directed; let seen = new Set(); G.edges = G.edges.filter((e) => { let k = G.directed ? e.u + '>' + e.v : min(e.u, e.v) + '-' + max(e.u, e.v); if (seen.has(k)) return false; seen.add(k); return true; }); }
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(G.directed ? 2 : 1); }

// ---------- やってみよう ----------
// 1. 点 10 個で線 12 本のグラフ：リストと行列、どちらの箱が多い？（まばらなグラフはリスト向き）
// 2. 全部の点どうしをつなぐ（完全グラフ）と、リストの箱は V² に近づく
// 3. D で有向にすると、行列はなぜ対称でなくなる？



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
