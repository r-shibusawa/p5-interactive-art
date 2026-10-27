// ============================================
// 09 プリム法
// 根 r から 1 本の木を育てる。木の外の点 v は key ＝ 木とつなぐいちばん軽い辺の重み を持つ
// key が最小の点を優先度つきキューから取り出し、隣の key を小さく書きかえる
// 二分ヒープなら O(E log V)、フィボナッチヒープなら O(E + V log V)（シリーズ13）
// 操作：点をクリック＝根 r / スペース＝再生・停止 / →＝1 手 / 線の数字クリック＝重み
//       1・2＝お手本 / R＝最初から / ドラッグ＝線 / 空白クリック＝点 / C＝全部消す
// ============================================

let G, GA, Adj;
let root = 0;
let key_ = [], pi = [], inQ = [];
let curU = -1, curV = -1;
const CODE = [
  'プリム法(G, r)',
  '  点 u すべて：key ← ∞、π ← なし',
  '  根 r の key ← 0',
  '  全部の点を、key の小さい順に出てくるキュー Q へ',
  '  Q が空になるまでくり返す',
  '      u ← Q から key 最小の点を取り出す（木に入る）',
  '      u の隣の点 v それぞれについて',
  '          v がまだ Q にあり、辺 (u, v) が v.key より軽いなら',
  '              v.π ← u',
  '              v.key ← 辺 (u, v) の重み（key を小さく）',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 70, y: 150, w: width - 680, h: height - 380 };
  G = makeGraph(false);
  if (k === 1) { // 07 と同じ 9 点のグラフ
    placeGraph(G, [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.45, 0.55], [1, 0.5], [0, 1], [0.5, 1], [1, 1]], GA, 'abcdefghi'.split(''));
    for (let [u, v, w] of [[0, 1, 6], [1, 2, 3], [0, 3, 2], [1, 4, 9], [2, 5, 5], [3, 4, 4], [4, 5, 8], [3, 6, 7], [4, 7, 1], [5, 8, 6], [6, 7, 3], [7, 8, 10], [0, 4, 11], [4, 8, 5]]) addEdge(G, u, v, w);
  } else {
    randomSeed(3);
    let pos = [];
    for (let i = 0; i < 12; i++) pos.push([random(), random()]);
    placeGraph(G, pos, GA, 'abcdefghijkl'.split(''));
    for (let i = 0; i < 12; i++) {
      let near = G.nodes.map((n, j) => [j, dist(n.x, n.y, G.nodes[i].x, G.nodes[i].y)]).filter((p) => p[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 3);
      for (let [j, d] of near) addEdge(G, i, j, max(1, round(d / 25)));
    }
  }
  root = 0;
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始（点クリックで根を変える）';
  key_ = G.nodes.map(() => Infinity); pi = G.nodes.map(() => -1); inQ = G.nodes.map(() => true); curU = curV = -1;
  if (root >= G.nodes.length) root = 0;
}

function* prim(r) {
  Adj = adjList(G);
  key_ = G.nodes.map(() => Infinity); pi = G.nodes.map(() => -1); inQ = G.nodes.map(() => false);
  yield { line: 1, msg: '全部の key = ∞' };
  key_[r] = 0;
  yield { line: 2, msg: '根 ' + G.nodes[r].label + ' の key = 0' };
  inQ = G.nodes.map(() => true);
  yield { line: 3, msg: '全部の点をキュー Q へ' };
  while (inQ.some((x) => x)) {
    yield { line: 4 };
    let u = -1;
    for (let i = 0; i < G.nodes.length; i++) if (inQ[i] && (u < 0 || key_[i] < key_[u])) u = i;
    inQ[u] = false; curU = u; curV = -1;
    yield { line: 5, msg: '最小を取り出す → ' + G.nodes[u].label + '（key ' + fmt(key_[u]) + '）' + (pi[u] >= 0 ? '、辺 ' + G.nodes[pi[u]].label + '–' + G.nodes[u].label + ' が木に入る' : '') };
    for (let a of Adj[u]) {
      curV = a.v;
      yield { line: 6, msg: G.nodes[u].label + ' の隣 ' + G.nodes[a.v].label + '（w = ' + a.w + '）' };
      if (inQ[a.v] && a.w < key_[a.v]) {
        pi[a.v] = u;
        yield { line: 8, msg: G.nodes[a.v].label + '.π = ' + G.nodes[u].label };
        let old = key_[a.v]; key_[a.v] = a.w;
        yield { line: 9, msg: 'key を小さく：' + G.nodes[a.v].label + '.key ' + fmt(old) + ' → ' + a.w };
      } else yield { line: 7, msg: inQ[a.v] ? 'w(u,v) = ' + a.w + ' ≥ key ' + fmt(key_[a.v]) + ' → そのまま' : G.nodes[a.v].label + ' はもう木の中' };
    }
    curV = -1;
  }
  curU = -1;
  let tot = pi.reduce((s, p, i) => s + (p >= 0 ? findEdge(G, p, i).w : 0), 0);
  lastMsg = '完了：最小全域木の重み ＝ ' + tot + (key_.some((k) => k === Infinity) ? '（つながっていない点がある → 全域森）' : '');
}

function draw() {
  background(C.bg);
  autoRun();
  hud('09 プリム法', ['点をクリック＝根 r　スペース＝再生/停止　→＝1 手　線の数字クリック＝重み　1・2＝お手本　R＝最初から　ドラッグ＝線　空白クリック＝点　C＝消す',
    '黒＝木に入った点　白＝キューの中（点の下 key）　赤い太線＝木（π）　水色の線＝候補（key を決めている辺）']);
  // 木の領域をうっすら
  noStroke(); fill(withA(C.accent, 26));
  for (let i = 0; i < G.nodes.length; i++) if (runner && !inQ[i]) circle(G.nodes[i].x, G.nodes[i].y, 84);
  for (let e of G.edges) {
    let tree = (pi[e.v] === e.u && !inQ[e.v]) || (pi[e.u] === e.v && !inQ[e.u]);
    let cand = !tree && ((pi[e.v] === e.u && inQ[e.v]) || (pi[e.u] === e.v && inQ[e.u]));
    let look = curU >= 0 && ((e.u === curU && e.v === curV) || (e.v === curU && e.u === curV));
    drawEdge(G.nodes[e.u], G.nodes[e.v], { col: look ? C.yel : tree ? C.accent : cand ? C.cyan : C.edge, w: look || tree ? 6 : cand ? 3.5 : 2, label: e.w });
  }
  editRubber(G);
  for (let i = 0; i < G.nodes.length; i++) drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, runner && !inQ[i] ? 'black' : 'white', { ring: i === curU ? C.yel : i === root ? C.accent : null, below: runner ? 'key=' + fmt(key_[i]) : undefined });
  // 優先度つきキュー（key の小さい順に表示）
  let q = G.nodes.map((n, i) => i).filter((i) => inQ[i] && runner).sort((a, b) => key_[a] - key_[b]);
  drawBoxes('Q（key 順 →）', q.map((i) => ({ t: G.nodes[i].label + ':' + fmt(key_[i]), col: i === curV ? C.yel : key_[i] < Infinity ? C.cyan : null })), 40, GA.y + GA.h + 60, width - 640);
  statusLine(40, height - 34);
  let y = drawCode(CODE, curLine, width - 540, 110, 520);
  noStroke(); fill(C.dim); textSize(13); textAlign(LEFT, BASELINE);
  ['なぜ正しい？ 「今の木」と「それ以外」のカットを考えると、', '最小を取り出すときに選ぶ辺はそのカットの軽い辺 → 安全な辺（07）', 'クルスカルは森をくっつける、プリムは 1 本の木を太らせる', 'ダイクストラ法（12）とそっくり：key が「木までの距離」か「始点までの距離」か'].forEach((t, i) => text(t, width - 540, y + 24 + i * 20));
}

function mousePressed() { if (weightClick(G, 1, 15)) { resetRun(); ed.from = -2; return; } editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() {
  let r = editRelease(G, GA, floor(random(1, 10)));
  if (r === 'click') { root = ed.clicked; resetRun(); } else if (r) resetRun();
}
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (G.nodes.length === 0) return; resetRun(); startRun(prim(root)); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if (key === '1' || key === '2') preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; root = 0; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. 根を変えても、最小全域木の重みは同じ（29）になるか確かめよう
// 2. クルスカル（08）と、辺が選ばれる順番を比べよう
// 3. 「v ∈ Q and」を消すとどうなる？（木の中の点の key を書きかえてしまう）



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
