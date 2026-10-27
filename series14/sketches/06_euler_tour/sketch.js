// ============================================
// 06 オイラー路・一筆書き
// すべての線をちょうど 1 回ずつ通る道。ケーニヒスベルクの 7 つの橋（オイラー 1736）がグラフ理論の始まり
// 無向：奇数次の点が 0 個 → 一周できる / 2 個 → その 2 点を端に一筆書き / それ以外 → 不可能
// 有向：すべての点で 入る本数 ＝ 出る本数 → オイラー閉路
// ヒアホルツァーの方法：行けるところまで歩き、行き止まりで戻りながら道を記録する。Θ(E)
// 操作：スペース＝再生・停止 / →＝1 手 / 1＝ケーニヒスベルク 2＝家 3＝有向 4＝星
//       ドラッグ＝線（同じ所に何本でも）/ クリック＝点 / R＝最初から / C＝全部消す
// ============================================

let G, GA;
let used = new Set(), order = new Map(), stackV = [], stackE = [], circuit = [], circuitE = [];
let verdict = '', startV = -1, odd = [];
let pen = 0; // 完成後に道をなぞるペン
let curU = -1;
const CODE = [
  'HIERHOLZER(G, s)',
  '  S = [s];  circuit = []',
  '  while S ≠ ∅',
  '      u = TOP(S)',
  '      if u から出る未使用の線 (u, v) がある',
  '          (u, v) を使用済みに;  PUSH(S, v)',
  '      else',
  '          POP(S);  circuit の先頭に u',
];

function setup() { createCanvas(windowWidth, windowHeight); preset(1); }

function preset(k) {
  GA = { x: 70, y: 150, w: width - 680, h: height - 330 };
  G = makeGraph(k === 3); G.multi = true;
  if (k === 1) { // ケーニヒスベルク：A 中の島、B 北岸、C 南岸、D 東の島
    placeGraph(G, [[0.35, 0.5], [0.35, 0], [0.35, 1], [0.95, 0.5]], GA, ['A', 'B', 'C', 'D']);
    for (let [u, v] of [[0, 1], [0, 1], [0, 2], [0, 2], [0, 3], [1, 3], [2, 3]]) addEdge(G, u, v);
  } else if (k === 2) { // 家（封筒）
    placeGraph(G, [[0.25, 1], [0.75, 1], [0.75, 0.4], [0.25, 0.4], [0.5, 0]], GA, ['a', 'b', 'c', 'd', 'e']);
    for (let [u, v] of [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3], [3, 4], [4, 2]]) addEdge(G, u, v);
  } else if (k === 3) { // 有向：入る＝出る
    placeGraph(G, [[0, 0.5], [0.33, 0], [0.33, 1], [0.66, 0.5], [1, 0], [1, 1]], GA, ['a', 'b', 'c', 'd', 'e', 'f']);
    for (let [u, v] of [[0, 1], [1, 3], [3, 2], [2, 0], [1, 2], [2, 3], [3, 1], [3, 4], [4, 5], [5, 3]]) addEdge(G, u, v);
  } else { // 星（K5）
    placeGraph(G, [0, 1, 2, 3, 4].map((i) => [0.5 + 0.5 * cos(-HALF_PI + (TWO_PI * i) / 5), 0.5 + 0.5 * sin(-HALF_PI + (TWO_PI * i) / 5)]), GA, ['a', 'b', 'c', 'd', 'e']);
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) addEdge(G, i, j);
  }
  resetRun();
}

function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1;
  used = new Set(); order = new Map(); stackV = []; stackE = []; circuit = []; circuitE = []; curU = -1; pen = 0;
  check();
  lastMsg = verdict.startsWith('×') ? '一筆書きできない（条件を満たさない）' : 'スペースで開始（' + G.nodes[startV]?.label + ' から）';
}

// 条件のチェック
function check() {
  let n = G.nodes.length, inD = Array(n).fill(0), outD = Array(n).fill(0);
  for (let e of G.edges) { outD[e.u]++; inD[e.v]++; if (!G.directed) { outD[e.v]++; inD[e.u]++; } }
  startV = G.edges.length ? G.edges[0].u : -1; odd = [];
  // 線のある点がつながっているか（向きは無視）
  let seen = Array(n).fill(false), q = startV >= 0 ? [startV] : [];
  if (startV >= 0) seen[startV] = true;
  while (q.length) { let u = q.pop(); for (let e of G.edges) { let w = e.u === u ? e.v : e.v === u ? e.u : -1; if (w >= 0 && !seen[w]) { seen[w] = true; q.push(w); } } }
  let connected = G.nodes.every((nd, i) => seen[i] || inD[i] + outD[i] === 0);
  if (!G.edges.length) { verdict = '× 線がありません'; return; }
  if (!connected) { verdict = '× 線がつながっていない'; return; }
  if (!G.directed) {
    odd = G.nodes.map((nd, i) => i).filter((i) => outD[i] % 2 === 1);
    if (odd.length === 0) verdict = '○ 奇数次の点 0 個 → どこからでも一周できる（オイラー閉路）';
    else if (odd.length === 2) { verdict = '○ 奇数次の点 2 個 → ' + G.nodes[odd[0]].label + ' から ' + G.nodes[odd[1]].label + ' へ一筆書き（オイラー路）'; startV = odd[0]; }
    else verdict = '× 奇数次の点が ' + odd.length + ' 個 → 一筆書きできない';
  } else {
    let plus = [], minus = [], bad = false;
    for (let i = 0; i < n; i++) { let d = outD[i] - inD[i]; if (d === 1) plus.push(i); else if (d === -1) minus.push(i); else if (d !== 0) bad = true; }
    odd = plus.concat(minus);
    if (!bad && plus.length === 0 && minus.length === 0) verdict = '○ どの点も 入る ＝ 出る → オイラー閉路';
    else if (!bad && plus.length === 1 && minus.length === 1) { verdict = '○ 出る−入る ＝ +1 の点から −1 の点へ（オイラー路）'; startV = plus[0]; }
    else { verdict = '× 入る ≠ 出る の点がある → オイラー閉路はない'; }
  }
}

function* hierholzer(s) {
  stackV = [s]; stackE = [null]; circuit = []; circuitE = [];
  yield { line: 1, msg: G.nodes[s].label + ' から歩き始める' };
  let k = 0;
  while (stackV.length) {
    let u = stackV[stackV.length - 1]; curU = u;
    yield { line: 3, msg: '今いる点 ' + G.nodes[u].label };
    let cand = G.edges.filter((e) => !used.has(e) && (e.u === u || (!G.directed && e.v === u)));
    cand.sort((a, b) => G.nodes[a.u === u ? a.v : a.u].label < G.nodes[b.u === u ? b.v : b.u].label ? -1 : 1);
    if (cand.length) {
      let e = cand[0], v = e.u === u ? e.v : e.u;
      used.add(e); order.set(e, ++k); stackV.push(v); stackE.push(e); curU = v;
      yield { line: 5, msg: G.nodes[u].label + ' → ' + G.nodes[v].label + '（' + k + ' 本目）' };
    } else {
      stackV.pop(); circuit.unshift(u); let e = stackE.pop(); if (e) circuitE.unshift(e);
      yield { line: 7, msg: G.nodes[u].label + ' から出る線はもうない → 道の先頭に記録' };
    }
  }
  curU = -1;
  // 線の番号を「完成した道の順番」に付け直す（歩いた順とは違うことがある＝輪の差し込み）
  circuitE.forEach((e, i) => order.set(e, i + 1));
  lastMsg = '完成（番号は道の順に付け直した）：' + circuit.map((i) => G.nodes[i].label).join(' → ');
}

// 平行な線を少しずつ曲げる
function bendOf(e) {
  let par = G.edges.filter((f) => (f.u === e.u && f.v === e.v) || (f.u === e.v && f.v === e.u));
  if (par.length === 1) return hasReverse(G, e) ? 14 : 0;
  let k = par.indexOf(e), b = (k - (par.length - 1) / 2) * 26;
  return e.u < e.v ? b : -b;
}

function draw() {
  background(C.bg);
  autoRun();
  hud('06 オイラー路・一筆書き', ['スペース＝再生/停止　→＝1 手　1＝ケーニヒスベルク　2＝家　3＝有向　4＝星　ドラッグ＝線（何本でも）　クリック＝点　R＝最初から　C＝消す',
    '線の数字＝通った順番（完成後は道の順）。点の下＝次数（有向は 入/出）。赤い輪＝奇数次の点']);
  colorMode(HSB, 360, 100, 100, 100);
  let E = max(1, G.edges.length);
  for (let e of G.edges) {
    let k = order.get(e);
    let col = k ? color((200 + (k / E) * 160) % 360, 70, 100) : color(230, 25, 45);
    drawEdge(G.nodes[e.u], G.nodes[e.v], { directed: G.directed, bend: bendOf(e), col, w: k ? 4 : 2.5, label: k || '', labelT: 0.36 });
  }
  colorMode(RGB, 255);
  // 完成したら、道をペンがなぞる
  if (finished && circuit.length > 1) {
    pen = (pen + 0.03) % (circuit.length - 1);
    let i = floor(pen), t = pen - i, a = G.nodes[circuit[i]], b = G.nodes[circuit[i + 1]];
    let e = circuitE[i];
    let p = e ? edgePoint(G.nodes[e.u], G.nodes[e.v], bendOf(e), e.u === circuit[i] ? t : 1 - t) : { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    noStroke(); fill(withA(C.yel, 80)); circle(p.x, p.y, 34); fill(C.yel); circle(p.x, p.y, 14);
  }
  editRubber(G);
  let n = G.nodes.length, inD = Array(n).fill(0), outD = Array(n).fill(0);
  for (let e of G.edges) { outD[e.u]++; inD[e.v]++; }
  for (let i = 0; i < n; i++) {
    let deg = G.directed ? inD[i] + '/' + outD[i] : String(inD[i] + outD[i]);
    drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, i === curU ? C.yel : i === startV ? C.accent : C.white, { r: 24, ring: odd.includes(i) ? C.accent : null, below: deg });
  }
  noStroke(); textSize(18); textAlign(LEFT, BASELINE); fill(verdict.startsWith('○') ? C.green : C.accent);
  text(verdict, 40, GA.y + GA.h + 54);
  drawBoxes('スタック S', stackV.map((u) => G.nodes[u].label), 40, GA.y + GA.h + 70, width - 640);
  statusLine(40, height - 34);
  let y = drawCode(CODE, curLine, width - 540, 110, 520);
  drawBoxes('道（circuit）', circuit.map((u) => ({ t: G.nodes[u].label, col: C.green })), width - 540, y + 16, 520);
  noStroke(); fill(C.dim); textSize(13); textAlign(LEFT, BASELINE);
  ['なぜ奇数次が問題？ 通り抜けるたびに「入る＋出る」で次数を 2 使う', '端でない点はすべて偶数次でなければならない', '行き止まりで戻るとき、まだ使っていない線の輪を', 'あとから道に「差し込む」ので、全部の線を必ず使い切れる'].forEach((t, i) => text(t, width - 540, y + 80 + i * 20));
}

function mousePressed() { editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() { if (editRelease(G, GA)) resetRun(); }
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { if (verdict.startsWith('×') || startV < 0) return; resetRun(); startRun(hierholzer(startV)); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if ('1234'.includes(key)) preset(+key);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; resetRun(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. ケーニヒスベルクに橋を 1 本足して、一筆書きできるようにしよう（どこに足す？）
// 2. 家の形はどの点から始めないと描けない？
// 3. 有向グラフ（3）で、入る ≠ 出る になるように線を足すと何が起きる？



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
