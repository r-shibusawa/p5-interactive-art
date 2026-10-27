// ============================================
// 13 グラフで奏でる（自由制作のベース）🔊
// 探索アルゴリズムが点に「たどり着いた瞬間」に、その点の音を鳴らす
//   BFS ＝ 層ごとに和音 / DFS ＝ 奥へ奥へのメロディ / ダイクストラ ＝ 距離 d の時刻に届く波 / プリム ＝ 木が育つ順
// 点の高さ（y）が音の高さ。グラフの形とアルゴリズムで曲が変わる
// 操作：まずクリック（音を出す許可）/ 点をクリック＝始点 / 空白クリック＝点 / ドラッグ＝線
//       スペース＝再生・停止 / A＝アルゴリズム切り替え / W＝音色 / 1〜3＝お手本 / S＝画像を保存 / C＝全部消す
// ============================================

// ★ここを変えてみよう
let scaleSteps = [0, 2, 4, 7, 9];   // 音階（ペンタトニック）。[0, 2, 4, 5, 7, 9, 11] で長音階
let baseNote = 48;              // いちばん下の音（MIDI 番号。60 = ド）
let beat = 0.22;                // 1 手の長さ（秒）
let waves = ['triangle', 'sine', 'square', 'sawtooth'];
let algos = ['BFS（幅優先）', 'DFS（深さ優先）', 'ダイクストラ（距離 = 時刻）', 'プリム（木が育つ順）'];

let G, GA;
let algo = 0, wave = 0, src = 0;
let events = [];      // { t, node, from }  t 秒後に node が鳴る
let t0 = 0, playingSong = false, loopLen = 0;
let flash = [];       // 点が光る強さ

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function preset(k) {
  GA = { x: 60, y: 130, w: width - 120, h: height - 260 };
  G = makeGraph(false);
  randomSeed(k * 13);
  if (k === 1) { // 近い点どうしをつなぐ
    for (let i = 0; i < 18; i++) G.nodes.push({ x: GA.x + random(GA.w), y: GA.y + random(GA.h), label: nextLabel(G) });
    for (let i = 0; i < 18; i++) {
      let near = G.nodes.map((n, j) => [j, dist(n.x, n.y, G.nodes[i].x, G.nodes[i].y)]).filter((p) => p[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 2);
      for (let [j] of near) addEdge(G, i, j);
    }
  } else if (k === 2) { // 輪と弦
    for (let i = 0; i < 16; i++) G.nodes.push({ x: width / 2 + cos((TWO_PI * i) / 16) * GA.h * 0.45, y: GA.y + GA.h / 2 + sin((TWO_PI * i) / 16) * GA.h * 0.45, label: nextLabel(G) });
    for (let i = 0; i < 16; i++) { addEdge(G, i, (i + 1) % 16); if (i % 4 === 0) addEdge(G, i, (i + 5) % 16); }
  } else { // 格子
    for (let i = 0; i < 20; i++) G.nodes.push({ x: GA.x + ((i % 5) + 0.5) * (GA.w / 5), y: GA.y + (floor(i / 5) + 0.5) * (GA.h / 4), label: nextLabel(G) });
    for (let i = 0; i < 20; i++) { if (i % 5 < 4) addEdge(G, i, i + 1); if (i < 15) addEdge(G, i, i + 5); }
  }
  src = 0;
  rebuild();
}

// 線の重み ＝ 長さ（ダイクストラ・プリム用）
function weigh() { for (let e of G.edges) e.w = max(1, round(dist(G.nodes[e.u].x, G.nodes[e.u].y, G.nodes[e.v].x, G.nodes[e.v].y) / 60)); }

// アルゴリズムを最後まで走らせて「いつ・どの点が鳴るか」の表を作る
function rebuild() {
  weigh();
  flash = G.nodes.map(() => 0);
  events = [];
  let n = G.nodes.length; if (n === 0) { loopLen = 1; return; }
  if (src >= n) src = 0;
  let A = adjList(G);
  if (algo === 0) { // BFS：同じ層は同時に
    let dd = Array(n).fill(-1), q = [src]; dd[src] = 0; events.push({ t: 0, node: src, from: -1 });
    while (q.length) { let u = q.shift(); for (let a of A[u]) if (dd[a.v] < 0) { dd[a.v] = dd[u] + 1; q.push(a.v); events.push({ t: dd[a.v] * beat * 2, node: a.v, from: u }); } }
  } else if (algo === 1) { // DFS：発見した順に 1 音ずつ
    let seen = Array(n).fill(false), k = 0;
    let visit = (u, from) => { seen[u] = true; events.push({ t: k++ * beat, node: u, from }); for (let a of A[u]) if (!seen[a.v]) visit(a.v, u); };
    visit(src, -1);
  } else if (algo === 2) { // ダイクストラ：確定した距離 d がそのまま時刻
    let dd = Array(n).fill(Infinity), pi = Array(n).fill(-1), done = Array(n).fill(false); dd[src] = 0;
    for (let it = 0; it < n; it++) {
      let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dd[i] < dd[u])) u = i;
      if (u < 0 || dd[u] === Infinity) break;
      done[u] = true; events.push({ t: dd[u] * beat * 0.5, node: u, from: pi[u] });
      for (let a of A[u]) if (dd[u] + a.w < dd[a.v]) { dd[a.v] = dd[u] + a.w; pi[a.v] = u; }
    }
  } else { // プリム：木に入った順
    let key = Array(n).fill(Infinity), pi = Array(n).fill(-1), inT = Array(n).fill(false); key[src] = 0;
    for (let it = 0; it < n; it++) {
      let u = -1; for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || key[i] < key[u])) u = i;
      if (u < 0 || key[u] === Infinity) break;
      inT[u] = true; events.push({ t: it * beat, node: u, from: pi[u] });
      for (let a of A[u]) if (!inT[a.v] && a.w < key[a.v]) { key[a.v] = a.w; pi[a.v] = u; }
    }
  }
  loopLen = (events.length ? max(...events.map((e) => e.t)) : 0) + beat * 6;
  if (playingSong && audioCtx) { t0 = audioCtx.currentTime + 0.1; scheduleLoop(); }
}

// 点の高さ → 音の高さ（音階に合わせる）
function noteOf(i) {
  let k = floor(map(G.nodes[i].y, GA.y + GA.h, GA.y, 0, scaleSteps.length * 3));
  k = constrain(k, 0, scaleSteps.length * 3 - 1);
  return baseNote + 12 * floor(k / scaleSteps.length) + scaleSteps[k % scaleSteps.length];
}

let scheduledUntil = 0;
function scheduleLoop() { scheduledUntil = t0; }
function scheduler() {
  if (!playingSong || !audioCtx) return;
  while (scheduledUntil < audioCtx.currentTime + 0.3) {
    for (let e of events) playNote(noteToFreq(noteOf(e.node)), 0.18, beat * 2.2, waves[wave], scheduledUntil + e.t);
    scheduledUntil += loopLen;
  }
}

function draw() {
  background(C.bg);
  scheduler();
  let now = playingSong && audioCtx ? (audioCtx.currentTime - t0) % loopLen : -1;
  if (now < 0 && playingSong) now = 0;
  hud('13 グラフで奏でる ─ ' + algos[algo] + '　🔊', ['まずクリック　点クリック＝始点　空白クリック＝点　ドラッグ＝線　スペース＝' + (playingSong ? '停止' : '再生') + '　A＝アルゴリズム　W＝音色（' + waves[wave] + '）　1〜3＝お手本　S＝保存　C＝消す',
    '点の高さ ＝ 音の高さ。アルゴリズムが点にたどり着いた瞬間に鳴る。光った線 ＝ その点を見つけた線（探索木）']);
  // 再生位置までに鳴った点と線
  let reached = new Set();
  for (let e of events) if (now >= e.t) { reached.add(e.node); if (now - e.t < 0.08) flash[e.node] = 1; }
  for (let e of G.edges) drawEdge(G.nodes[e.u], G.nodes[e.v], { col: C.edge, w: 1.5 });
  colorMode(HSB, 360, 100, 100, 100);
  for (let ev of events) if (ev.from >= 0 && now >= ev.t) {
    let hue = (noteOf(ev.node) * 25) % 360;
    stroke(hue, 70, 100, 90); strokeWeight(4); line(G.nodes[ev.from].x, G.nodes[ev.from].y, G.nodes[ev.node].x, G.nodes[ev.node].y);
  }
  for (let i = 0; i < G.nodes.length; i++) {
    let p = G.nodes[i], hue = (noteOf(i) * 25) % 360;
    if (flash[i] > 0.01) { noFill(); stroke(hue, 60, 100, flash[i] * 80); strokeWeight(3); circle(p.x, p.y, 40 + (1 - flash[i]) * 90); flash[i] *= 0.93; }
    noStroke(); fill(hue, reached.has(i) ? 70 : 20, reached.has(i) ? 100 : 45);
    circle(p.x, p.y, i === src ? 34 : 26);
  }
  colorMode(RGB, 255);
  editRubber(G);
  // 楽譜っぽい帯（下）
  let y0 = height - 100, x0 = 40, x1 = width - 40;
  noStroke(); fill(C.panel); rect(x0, y0, x1 - x0, 70, 8);
  for (let e of events) {
    let x = map(e.t, 0, loopLen, x0 + 10, x1 - 10), y = map(noteOf(e.node), baseNote, baseNote + 36, y0 + 64, y0 + 6);
    fill(now >= e.t ? C.accent : C.dim); circle(x, y, 7);
  }
  if (now >= 0) { stroke(C.yel); strokeWeight(2); let x = map(now, 0, loopLen, x0 + 10, x1 - 10); line(x, y0, x, y0 + 70); }
  noStroke(); fill(C.dim); textSize(12); textAlign(LEFT, BASELINE); text('横 ＝ 時間（' + nf(loopLen, 1, 1) + ' 秒でくり返す）　縦 ＝ 音の高さ', x0, y0 - 6);
}

function mousePressed() { startAudio(); editPress(G, GA); }
function mouseDragged() { editDrag(); }
function mouseReleased() {
  let r = editRelease(G, GA);
  if (r === 'click') src = ed.clicked;
  if (r) rebuild();
}
function keyPressed() {
  if (key === ' ') { startAudio(); playingSong = !playingSong; if (playingSong) { t0 = audioCtx.currentTime + 0.1; scheduleLoop(); } }
  if (key === 'a' || key === 'A') { algo = (algo + 1) % algos.length; rebuild(); }
  if (key === 'w' || key === 'W') wave = (wave + 1) % waves.length;
  if (key === 's' || key === 'S') saveCanvas('graph_music', 'png');
  if ('123'.includes(key)) preset(+key);
  if (key === 'c' || key === 'C') { G.nodes = []; G.edges = []; rebuild(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }

// ---------- やってみよう ----------
// 1. 同じグラフで A を押してアルゴリズムを変え、曲の違いを聞き比べよう（BFS は和音、DFS は旋律）
// 2. ダイクストラで、遠い点ほど遅れて届く「波」を感じよう。点を動かすと距離＝リズムが変わる
// 3. scaleSteps や beat を変えて、自分のグラフ曲を作ろう。点を縦一列に並べると音階になる



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


// ==================================================
// ここから下は「音を鳴らすための道具」です
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(freqHz, volume = 0.3, duration = 0.3, type = 'triangle', when) {
  if (!audioCtx) return;
  let t = when === undefined ? audioCtx.currentTime : when;
  let osc = audioCtx.createOscillator(), amp = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freqHz;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp); amp.connect(masterOut); osc.start(t); osc.stop(t + duration + 0.05);
}
function noteToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
