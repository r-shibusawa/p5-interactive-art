// ============================================
// 14 全点対最短路：行列で考える
// すべての点の組 (i, j) の最短距離を表（行列）にする
//  1：L⁽ᵐ⁾ ＝ 辺 m 本以内の最短距離。⊗（min と + の「行列のかけ算」）で 1 本ずつ伸ばす  Θ(V⁴)
//  2：くり返し 2 乗 L⁽²ᵐ⁾ ＝ L⁽ᵐ⁾ ⊗ L⁽ᵐ⁾ で倍々に伸ばす  Θ(V³ log V)
//  3：フロイド–ワーシャル D⁽ᵏ⁾ ＝ 途中で通ってよい点を 1〜k に増やしていく  Θ(V³)
//  4：推移的閉包 T⁽ᵏ⁾ ＝ 「行けるか行けないか」だけを OR と AND で
// 操作：スペース＝再生・停止 / →＝1 手 / 1〜4＝方法 / 線の数字クリック＝重み / R＝最初から
// ============================================

let G, GA;
let mode = 3;
let M = [], Wm = [], P = [], Lprev = [], Pi = [];  // 表示する行列
let ci = -1, cj = -1, ck = -1, upd = false, mLabel = '', kLabel = 0;
const CODES = {
  1: ['1 本ずつ伸ばす方法(W)', '  L(1) ← W（辺 1 本以内の表）', '  m を 2 から n − 1 まで増やしながら', '      L(m) ← L(m−1) ⊗ W', 'A ⊗ B（min と + のかけ算）', '  各マス (i, j) を ∞ にしておき', '      途中の点 k を 1〜n 全部ためして', '          (i, j) ← min((i, j), A[i][k] + B[k][j])'],
  2: ['くり返し 2 乗(W)', '  L(1) ← W、m ← 1', '  m < n − 1 のあいだ', '      L(2m) ← L(m) ⊗ L(m)（自分どうしでかける）', '      m を 2 倍にする', '⊗ は 1 と同じ', '  (i, j) ← k についての min(A[i][k] + A[k][j])', '  （＋ を ×、min を ＋ にすると普通の行列積）'],
  3: ['フロイド–ワーシャル法(W)', '  D(0) ← W（途中の点なし）', '  k を 1 から n まで（経由してよい点を増やす）', '      行 i を 1 から n まで', '          列 j を 1 から n まで', '              d[i][j] ← min(d[i][j], d[i][k] + d[k][j])', '              （短くなったら π[i][j] ← π[k][j]）', '  D(n) が答え'],
  4: ['推移的閉包(G)', '  t[i][j] ← 1（i = j か、辺 i → j がある）、ほかは 0', '  k を 1 から n まで（経由してよい点を増やす）', '      行 i を 1 から n まで', '          列 j を 1 から n まで', '              t[i][j] ← t[i][j] OR (t[i][k] AND t[k][j])', '  T(n) が答え', '  （ビット演算で速く計算できる）'],
};

function setup() { createCanvas(windowWidth, windowHeight); preset(3); }

function preset(k) {
  mode = k;
  G = makeGraph(true);
  GA = { x: 70, y: height - 280, w: 380, h: 200 };
  if (k === 4) { // 4 点：4 からは全部へ行けるが、4 へはだれも行けない
    placeGraph(G, [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], GA, ['1', '2', '3', '4']);
    for (let [u, v] of [[0, 1], [1, 2], [2, 1], [3, 0]]) addEdge(G, u, v, 1);
  } else { // 5 点・負の重みあり（負の閉路はなし）
    placeGraph(G, [[0, 0.2], [0.55, 0], [1, 0.5], [0.6, 1], [0.05, 0.9]], GA, ['1', '2', '3', '4', '5']);
    for (let [u, v, w] of [[0, 1, 4], [0, 2, -2], [1, 3, 3], [2, 1, 5], [2, 4, 6], [3, 0, 1], [3, 2, 7], [4, 3, -3], [1, 4, 2], [4, 0, 8]]) addEdge(G, u, v, w);
  }
  resetRun();
}

function weightMatrix() {
  let n = G.nodes.length, W = [];
  for (let i = 0; i < n; i++) { W.push([]); for (let j = 0; j < n; j++) { let e = G.edges.find((f) => f.u === i && f.v === j); W[i].push(i === j ? 0 : e ? e.w : Infinity); } }
  return W;
}
function resetRun() {
  runner = null; playing = false; finished = false; curLine = -1; lastMsg = 'スペースで開始';
  let n = G.nodes.length, W = weightMatrix();
  Wm = W;
  if (mode === 4) M = W.map((r, i) => r.map((v, j) => (i === j || v < Infinity ? 1 : 0)));
  else M = W.map((r) => r.slice());
  Lprev = M.map((r) => r.slice());
  Pi = W.map((r, i) => r.map((v, j) => (i !== j && v < Infinity ? i : -1)));
  ci = cj = ck = -1; upd = false;
  mLabel = mode === 3 ? 'D(0)' : mode === 4 ? 'T(0)' : 'L(1)'; kLabel = 0;
}

function* extend(L, R, nameL, nameR, nameOut) {
  let n = L.length, out = L.map((r) => r.map(() => Infinity));
  Lprev = L; P = R; M = out; mLabel = nameOut;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    ci = i; cj = j;
    for (let k = 0; k < n; k++) { let v = L[i][k] + R[k][j]; if (v < out[i][j]) out[i][j] = v; }
    ck = -1; upd = true;
    yield { line: mode === 1 ? 7 : 6, msg: nameOut + '[' + (i + 1) + '][' + (j + 1) + '] = minₖ(' + nameL + '[' + (i + 1) + '][k] + ' + nameR + '[k][' + (j + 1) + ']) = ' + fmt(out[i][j]) };
  }
  ci = cj = -1;
  return out;
}

function* run() {
  let n = G.nodes.length, W = weightMatrix();
  if (mode === 1) {
    let L = W; mLabel = 'L(1)'; M = L;
    yield { line: 1, msg: 'L⁽¹⁾ = W（辺 1 本以内）' };
    for (let m = 2; m <= n - 1; m++) {
      yield { line: 3, msg: 'L(' + m + ') = L(' + (m - 1) + ') ⊗ W（辺 ' + m + ' 本以内）' };
      L = yield* extend(L, W, 'L(' + (m - 1) + ')', 'W', 'L(' + m + ')');
    }
    lastMsg = '完了：L⁽ⁿ⁻¹⁾ が最短距離（' + (n - 2) + ' 回の ⊗、各 Θ(n³)）';
  } else if (mode === 2) {
    let L = W, m = 1; M = L;
    yield { line: 1, msg: 'L⁽¹⁾ = W' };
    while (m < n - 1) {
      yield { line: 3, msg: 'L(' + 2 * m + ') = L(' + m + ') ⊗ L(' + m + ')（2 乗）' };
      L = yield* extend(L, L, 'L(' + m + ')', 'L(' + m + ')', 'L(' + 2 * m + ')');
      m *= 2;
    }
    lastMsg = '完了：log 回の 2 乗で済んだ（L⁽ᵐ⁾ は m ≥ n−1 なら全部同じ）';
  } else {
    let bool = mode === 4;
    let D = bool ? W.map((r, i) => r.map((v, j) => (i === j || v < Infinity ? 1 : 0))) : W.map((r) => r.slice());
    M = D; P = []; mLabel = bool ? 'T(0)' : 'D(0)';
    yield { line: 1, msg: bool ? 'T⁽⁰⁾：辺があるか自分自身なら 1' : 'D⁽⁰⁾ = W（途中の点なし）' };
    for (let k = 0; k < n; k++) {
      ck = k; kLabel = k + 1;
      Lprev = D.map((r) => r.slice());
      mLabel = (bool ? 'T(' : 'D(') + (k + 1) + ')';
      yield { line: 2, msg: 'k = ' + (k + 1) + '：点 ' + (k + 1) + ' を経由してもよいことにする' };
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        ci = i; cj = j;
        let via = bool ? Lprev[i][k] && Lprev[k][j] : Lprev[i][k] + Lprev[k][j];
        upd = bool ? !Lprev[i][j] && via : via < Lprev[i][j];
        if (upd) { D[i][j] = bool ? 1 : via; if (!bool) Pi[i][j] = Pi[k][j]; }
        if (i === k || j === k) continue; // 行 k・列 k は変わらない
        yield { line: 5, msg: (bool ? 't' : 'd') + (i + 1) + (j + 1) + ' = ' + (bool ? 'OR(' + Lprev[i][j] + ', ' + Lprev[i][k] + ' AND ' + Lprev[k][j] + ')' : 'min(' + fmt(Lprev[i][j]) + ', ' + fmt(Lprev[i][k]) + ' + ' + fmt(Lprev[k][j]) + ')') + ' = ' + fmt(D[i][j]) + (upd ? '　← 更新' : '') };
      }
    }
    ci = cj = ck = -1;
    lastMsg = bool ? '完了：T⁽ⁿ⁾ の 1 ＝ 行ける' : '完了：D⁽ⁿ⁾ が最短距離、Π で経路が復元できる（3 重ループだけ！）';
  }
}

function drawMatrix(A, x, y, cell, title, opt = {}) {
  let n = A.length;
  noStroke(); fill(C.text); textSize(18); textAlign(LEFT, BASELINE); text(title, x, y - 10);
  for (let i = 0; i < n; i++) {
    fill(C.dim); textSize(12); textAlign(CENTER, CENTER);
    text(i + 1, x + cell * (i + 1.5), y + cell * 0.5);
    text(i + 1, x + cell * 0.5, y + cell * (i + 1.5));
    for (let j = 0; j < n; j++) {
      let px = x + cell * (j + 1), py = y + cell * (i + 1);
      let hot = opt.cell && i === ci && j === cj, rowH = opt.row !== undefined && i === opt.row, colH = opt.col !== undefined && j === opt.col;
      stroke(C.bg); strokeWeight(2);
      fill(hot ? (upd ? C.green : C.yel) : rowH || colH ? '#3a2f55' : '#1c2036');
      rect(px, py, cell, cell, 4);
      noStroke(); fill(hot ? C.bg : opt.fmt ? opt.fmt(A[i][j]) : A[i][j] < 0 ? C.accent : C.text);
      textSize(cell * 0.36); text(opt.show ? opt.show(A[i][j]) : fmt(A[i][j]), px + cell / 2, py + cell / 2);
    }
  }
}

function draw() {
  background(C.bg);
  autoRun();
  let names = { 1: '1 ⊗ を n−2 回', 2: '2 くり返し 2 乗', 3: '3 フロイド–ワーシャル', 4: '4 推移的閉包' };
  hud('14 全点対最短路 ─ ' + names[mode], ['スペース＝再生/停止　→＝1 手　1＝1 本ずつ伸ばす　2＝くり返し 2 乗　3＝フロイド–ワーシャル　4＝推移的閉包　線の数字クリック＝重み　R＝最初から　↑↓＝速さ',
    mode >= 3 ? '紫の行・列 ＝ 点 k を経由するときに使う値。緑 ＝ 短くなった（つながった）マス' : '左の行 i と右の列 j を「足して最小」をとると、右端の 1 マスができる']);
  let n = G.nodes.length; if (!n) return;
  let x = 40, y = 150;
  if (mode <= 2) {
    let cell = min(54, (width - 160) / (3 * (n + 1) + 3), (height - 470) / (n + 1));
    drawMatrix(Lprev, x, y, cell, mode === 1 ? 'L（前）' : 'L(m)', { row: ci >= 0 ? ci : undefined });
    noStroke(); fill(C.yel); textSize(30); textAlign(CENTER, CENTER); text('⊗', x + cell * (n + 1) + cell * 0.6, y + cell * (n + 2) / 2);
    drawMatrix(P.length ? P : Wm, x + cell * (n + 2.2), y, cell, mode === 1 ? 'W' : 'L(m)', { col: cj >= 0 ? cj : undefined });
    noStroke(); fill(C.yel); textSize(30); text('=', x + cell * (2 * n + 3.4), y + cell * (n + 2) / 2);
    drawMatrix(M, x + cell * (2 * n + 4.4), y, cell, mLabel, { cell: true });
  } else {
    let cell = min(58, (width - 640) / (2 * (n + 1) + 1), (height - 470) / (n + 1));
    let bool = mode === 4, show = bool ? (v) => String(v) : undefined;
    drawMatrix(M, x, y, cell, mLabel, { cell: true, row: ck >= 0 ? ck : undefined, col: ck >= 0 ? ck : undefined, show, fmt: bool ? (v) => (v ? C.cyan : C.dim) : undefined });
    if (!bool) drawMatrix(Pi, x + cell * (n + 2), y, cell, 'Π(' + kLabel + ')（直前の点）', { show: (v) => (v < 0 ? '–' : String(v + 1)), fmt: () => C.violet });
  }
  // グラフ（下）
  let gy = GA.y;
  for (let e of G.edges) {
    let on = mode >= 3 && ck >= 0 && ci >= 0 && ((e.u === ci && e.v === ck) || (e.u === ck && e.v === cj));
    drawEdge(G.nodes[e.u], G.nodes[e.v], { directed: true, r: 20, bend: hasReverse(G, e) ? 12 : 0, col: on ? C.yel : C.edge, w: on ? 4 : 2, label: mode === 4 ? '' : e.w, labelCol: e.w < 0 ? C.accent : C.text });
  }
  for (let i = 0; i < n; i++) drawNode(G.nodes[i].x, G.nodes[i].y, G.nodes[i].label, i === ck ? C.violet : i === ci ? C.yel : i === cj ? C.green : C.white, { r: 20 });
  if (mode >= 3 && ci >= 0 && ck >= 0) { noStroke(); fill(C.yel); textSize(14); textAlign(LEFT, BASELINE); text('黄 ' + (ci + 1) + ' → 紫 ' + (ck + 1) + ' → 緑 ' + (cj + 1) + ' と回り道すると短い？', GA.x, gy - 30); }
  statusLine(40, height - 34);
  drawCode(CODES[mode], curLine, width - 560, mode <= 2 ? height - 300 : 150, 540);
}

function mousePressed() { if (mode !== 4 && weightClick(G, -5, 10)) resetRun(); }
function keyPressed() {
  if ((key === ' ' || key === 'ArrowRight') && !runner) { resetRun(); startRun(run()); if (key === ' ') { playing = true; return; } }
  if (runKeys()) return;
  if ('1234'.includes(key)) preset(+key);
  if (key === 'r' || key === 'R') resetRun();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(mode); }

// ---------- やってみよう ----------
// 1. 3 の結果の 1 行目が 0 3 −2 1 4 になるか確かめよう（1 → 3 → 5 → 4 の回り道に注目）
// 2. 1 と 2 で同じ答えになる？ かかった ⊗ の回数は？
// 3. 負の閉路があると、対角成分 dᵢᵢ が負になる。重みを変えて作ってみよう



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
