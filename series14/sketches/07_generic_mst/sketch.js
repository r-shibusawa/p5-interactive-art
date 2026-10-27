// ============================================
// 07 最小全域木の考え方：カットと安全な辺
// 全域木 ＝ すべての点を、閉路なしで V−1 本の線でつないだもの。最小全域木 ＝ 重みの合計が最小
// 基本の作り方：「A に足しても最小全域木の一部のままの辺（安全な辺）」を 1 本ずつ足す
// カットの性質：A の辺をまたがないカット (S, V−S) を横切る辺のうち、いちばん軽い辺は安全
// 操作：点をクリック＝S に入れる/出す（黄色が S）/ スペース＝そのカットの軽い辺を A に足す
//       A＝自動（A の木の 1 つを S にする）/ 線の数字をクリック＝重みを変える / 1・2＝お手本 / R＝最初から
// ============================================

let G, GA;
let inS = [];       // S に入っているか
let inA = new Set(); // A に入った辺
let msg = '';
let T = new Set();  // 比べるための最小全域木 T（クルスカルで求めておく）

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 70, y: 160, w: width - 680, h: height - 360 };
  G = makeGraph(false);
  if (k === 1) { // 9 点・14 本（同じ重みの辺もある）
    placeGraph(G, [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.45, 0.55], [1, 0.5], [0, 1], [0.5, 1], [1, 1]], GA, 'abcdefghi'.split(''));
    for (let [u, v, w] of [[0, 1, 6], [1, 2, 3], [0, 3, 2], [1, 4, 9], [2, 5, 5], [3, 4, 4], [4, 5, 8], [3, 6, 7], [4, 7, 1], [5, 8, 6], [6, 7, 3], [7, 8, 10], [0, 4, 11], [4, 8, 5]]) addEdge(G, u, v, w);
  } else {
    randomSeed(7);
    let pos = [];
    for (let i = 0; i < 10; i++) pos.push([(i % 4) / 3 + random(-0.08, 0.08), floor(i / 4) / 2 + random(-0.1, 0.1)]);
    placeGraph(G, pos.map((p) => [constrain(p[0], 0, 1), constrain(p[1], 0, 1)]), GA, 'abcdefghij'.split(''));
    for (let [u, v] of [[0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [3, 7], [4, 5], [5, 6], [6, 7], [4, 8], [5, 8], [5, 9], [6, 9], [8, 9], [1, 4], [2, 7]]) addEdge(G, u, v, floor(random(1, 15)));
  }
  resetAll();
}
function resetAll() { inS = G.nodes.map(() => false); inA = new Set(); msg = '点をクリックしてカット S を作ろう'; computeT(); }

function computeT() { // クルスカル（比べる用）
  let p = G.nodes.map((n, i) => i), f = (x) => (p[x] === x ? x : (p[x] = f(p[x])));
  T = new Set();
  for (let e of [...G.edges].sort((a, b) => a.w - b.w)) if (f(e.u) !== f(e.v)) { p[f(e.u)] = f(e.v); T.add(e); }
}
function crossing() { return G.edges.filter((e) => inS[e.u] !== inS[e.v]); }
function lightEdge() { let c = crossing(); return c.length ? c.reduce((a, b) => (b.w < a.w ? b : a)) : null; }
function respects() { return [...inA].every((e) => inS[e.u] === inS[e.v]); }
// 木 T の中の u から v への道（辺の列）
function treePath(u, v) {
  let prev = new Map([[u, null]]), q = [u];
  while (q.length) { let x = q.shift(); for (let e of T) { let y = e.u === x ? e.v : e.v === x ? e.u : -1; if (y >= 0 && !prev.has(y)) { prev.set(y, e); q.push(y); } } }
  let path = [], x = v;
  while (prev.get(x)) { let e = prev.get(x); path.push(e); x = e.u === x ? e.v : e.u; }
  return path;
}

function addLight() {
  if (!G.nodes.length) return;
  if (!inS.some((x) => x) || inS.every((x) => x)) { msg = 'S が空 or 全部 → 横切る辺がない。点をクリックして S を作ろう'; return; }
  if (!respects()) { msg = '⚠ A の辺がカットを横切っている → このカットは A を尊重しない。カットの性質が使えない'; return; }
  let e = lightEdge();
  if (!e) { msg = '横切る辺がない（S と V−S がつながっていない）'; return; }
  inA.add(e);
  msg = '軽い辺 ' + G.nodes[e.u].label + '–' + G.nodes[e.v].label + '（' + e.w + '）は安全 → A に追加。|A| = ' + inA.size + ' / ' + (G.nodes.length - 1);
}
// 自動：A の森の木を 1 つ選び、それを S にする（必ず A を尊重する）
function autoCut() {
  if (inA.size >= G.nodes.length - 1 || !G.nodes.length) { msg = '完成！ A は最小全域木'; return; }
  let p = G.nodes.map((n, i) => i), f = (x) => (p[x] === x ? x : (p[x] = f(p[x])));
  for (let e of inA) p[f(e.u)] = f(e.v);
  let roots = [...new Set(G.nodes.map((n, i) => f(i)))];
  let r = roots[floor(random(roots.length))];
  inS = G.nodes.map((n, i) => f(i) === r);
  addLight();
}

function draw() {
  background(C.bg);
  hud('07 カットと安全な辺 ─ 最小全域木の基本の作り方', ['点をクリック＝S に入れる/出す　スペース＝軽い辺を A に足す　A＝自動でカットを選んで足す　線の数字クリック＝重み　1・2＝お手本　R＝最初から',
    '黄色の点＝S　赤い太線＝A（作りかけの最小全域木）　点線＝カットを横切る辺　★＝軽い辺（横切る辺で最小）']);
  let cr = new Set(crossing()), le = lightEdge(), hv = le && !T.has(le) && respects() ? treePath(le.u, le.v) : [];
  let swap = hv.find((e) => inS[e.u] !== inS[e.v]);
  // カットの境界線っぽく、S を薄く囲む
  noStroke(); fill(withA(C.yel, 28));
  for (let i = 0; i < G.nodes.length; i++) if (inS[i]) circle(G.nodes[i].x, G.nodes[i].y, 90);
  for (let e of G.edges) {
    let col = C.edge, w = 2, dash = null;
    if (cr.has(e)) { col = C.cyan; dash = [6, 5]; w = 2.5; }
    if (hv.includes(e)) { col = C.violet; w = 4; dash = null; }
    if (inA.has(e)) { col = C.accent; w = 6; dash = null; }
    if (e === le) { col = C.yel; w = 6; dash = null; }
    drawEdge(G.nodes[e.u], G.nodes[e.v], { col, w, dash, label: (e === le ? '★' : '') + e.w });
  }
  for (let i = 0; i < G.nodes.length; i++) drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, inS[i] ? C.yel : C.white);
  noStroke(); textSize(17); textAlign(LEFT, BASELINE); fill(msg.startsWith('⚠') ? C.accent : C.green);
  text(msg, 40, GA.y + GA.h + 66);
  let wA = [...inA].reduce((s, e) => s + e.w, 0), wT = [...T].reduce((s, e) => s + e.w, 0);
  fill(C.text); textSize(15); text('A の重み ' + wA + '　｜　最小全域木の重み ' + wT + (inA.size === G.nodes.length - 1 ? (wA === wT ? '　✔ 一致！' : '') : ''), 40, GA.y + GA.h + 94);
  fill(respects() ? C.green : C.accent); text(respects() ? 'このカットは A を尊重している（A の辺がまたがない）' : 'このカットは A を尊重していない', 40, GA.y + GA.h + 118);
  // 証明の図解パネル
  let px = width - 540;
  panelBox(px, 110, 520, 330, 'カットの性質の証明を見る（交換論法）');
  noStroke(); fill(C.text); textSize(14); textAlign(LEFT, BASELINE);
  let L = [
    'T ＝ ある最小全域木（ここではクルスカルで作ったもの）',
    '軽い辺 (u, v) が T に入っていなければ…',
    '  ① T に (u, v) を足すと閉路ができる（紫の道 + ★）',
    '  ② 閉路はカットを 2 回横切る → 横切る別の辺 (x, y) が T にある',
    '  ③ (u, v) は軽いので w(u, v) ≤ w(x, y)',
    '  ④ T′ = T − (x, y) + (u, v) も全域木で、重さは T 以下',
    '  → T′ も最小全域木で、A ∪ {(u, v)} を含む。だから安全！',
  ];
  L.forEach((t, i) => { fill(i >= 2 && !hv.length ? C.dim : C.text); text(t, px + 16, 158 + i * 24); });
  fill(C.yel); textSize(15);
  if (le && T.has(le)) text('★ ' + G.nodes[le.u].label + '–' + G.nodes[le.v].label + ' は T に入っている（そのまま安全）', px + 16, 330);
  else if (le && swap) text('★ ' + G.nodes[le.u].label + '–' + G.nodes[le.v].label + '(' + le.w + ') ⇄ ' + G.nodes[swap.u].label + '–' + G.nodes[swap.v].label + '(' + swap.w + ') と交換できる', px + 16, 330);
  else text('点をクリックして S を作ると、ここで交換が見える', px + 16, 330);
  fill(C.dim); textSize(13);
  text('クルスカル（08）もプリム（09）も、この「軽い辺を足す」の特別な場合', px + 16, 370);
  text('プリム＝ S を「今の木」に固定　クルスカル＝ 森の 1 つの木を S にする', px + 16, 392);
}

function mousePressed() {
  if (weightClick(G, 1, 15)) { computeT(); return; }
  let i = nodeAt(G.nodes, mouseX, mouseY);
  if (i >= 0) { inS[i] = !inS[i]; msg = 'S = { ' + G.nodes.filter((n, j) => inS[j]).map((n) => n.label).join(', ') + ' }　スペースで軽い辺を足す'; }
}
function keyPressed() {
  if (key === ' ') addLight();
  if (key === 'a' || key === 'A') autoCut();
  if (key === '1' || key === '2') preset(+key);
  if (key === 'r' || key === 'R') resetAll();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. A を何回も押して完成させ、A の重みが最小全域木の重みと一致するか確かめよう
// 2. わざと A の辺をまたぐカットを作ってスペース → なぜカットの性質が使えない？
// 3. 同じ重みの辺があると、最小全域木は 1 つとは限らない。重みを変えて試そう



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
