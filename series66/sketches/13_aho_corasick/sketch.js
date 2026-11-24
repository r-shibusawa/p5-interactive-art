// ============================================
// 13 エイホ-コラシック法 ─ たくさんの単語を、テキストを 1 回読むだけで全部さがすオートマトン
// 単語をトライ（先頭が同じなら枝を共有する木）にして、各ノードに「失敗リンク」（いまの文字列の、一番長い“後ろの一部”のノード）をつける。
// 次の文字の枝がなければ失敗リンクをたどって戻り、そこから続ける。ノードにつく出力（その位置で終わる単語）を全部報告。
// 1 つの単語の照合（シリーズ 17 の 02）を、たくさんの単語に広げたもの
// Tab = 見る → 単語の編集 → テキストの編集 → 見る（編集中は英小文字と空白が入力、Backspace 消す）/
// 見るモード：← → 1 文字 / スペース 自動再生 / ↑↓ お手本
// ============================================

const PRESETS = [
  [['he', 'she', 'his', 'hers'], 'ushers say his shell is here'],
  [['a', 'ab', 'bab', 'bc', 'bca', 'c', 'caa'], 'abccab bcaab'],
  [['cat', 'cattle', 'at', 'tt', 'le'], 'the cattle eat at the table'],
];
let pats = [], txt = '', ac, run, tpos = 0, playing = true, editMode = 'see', pIdx = 0, nodePos = [], patBuf = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadPreset(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); rebuild(); }
function loadPreset(k) { pIdx = (k + PRESETS.length) % PRESETS.length; pats = PRESETS[pIdx][0].slice(); txt = PRESETS[pIdx][1]; patBuf = pats.join(' '); rebuild(); }
// ★ トライを作り、幅優先で失敗リンクと出力をつける
function buildAC(words) {
  let nodes = [{ next: {}, fail: 0, out: [], own: [], depth: 0, parent: -1, ch: '' }];
  words.forEach((w, wi) => {
    let v = 0;
    for (let c of w) { if (nodes[v].next[c] === undefined) { nodes[v].next[c] = nodes.length; nodes.push({ next: {}, fail: 0, out: [], own: [], depth: nodes[v].depth + 1, parent: v, ch: c }); } v = nodes[v].next[c]; }
    if (w.length) nodes[v].own.push(wi);
  });
  let queue = [0];
  for (let h = 0; h < queue.length; h++) {
    let v = queue[h];
    nodes[v].out = nodes[v].own.concat(v ? nodes[nodes[v].fail].out : []);     // 失敗リンク先の出力も引きつぐ
    for (let c in nodes[v].next) {
      let u = nodes[v].next[c], f = nodes[v].fail;
      if (v === 0) nodes[u].fail = 0;
      else { while (f && nodes[f].next[c] === undefined) f = nodes[f].fail; nodes[u].fail = nodes[f].next[c] !== undefined ? nodes[f].next[c] : 0; }
      queue.push(u);
    }
  }
  return { nodes, order: queue };
}
// ★ テキストを 1 文字ずつ読む。steps = たどった枝 + 失敗リンクの数
function runAC(m, words, s) {
  let v = 0, hits = [], trace = [], steps = 0;
  for (let i = 0; i < s.length; i++) {
    let c = s[i], hops = [];
    while (v && m.nodes[v].next[c] === undefined) { hops.push(v); v = m.nodes[v].fail; steps++; }
    v = m.nodes[v].next[c] !== undefined ? m.nodes[v].next[c] : 0; steps++;
    for (let wi of m.nodes[v].out) hits.push([i - words[wi].length + 1, wi]);
    trace.push({ v, hops, found: m.nodes[v].out.slice() });
  }
  return { hits, trace, steps };
}
function wordOf(m, v) { let s = ''; while (v > 0) { s = m.nodes[v].ch + s; v = m.nodes[v].parent; } return s; }
function rebuild() {
  pats = patBuf.split(/\s+/).filter((w) => w.length).slice(0, 10);
  ac = buildAC(pats); run = runAC(ac, pats, txt); tpos = Math.min(tpos, txt.length);
  // トライの図：葉の数で横に、深さで縦に並べる
  let leaves = (v) => { let ks = Object.values(ac.nodes[v].next); return ks.length ? ks.reduce((a, u) => a + leaves(u), 0) : 1; };
  let maxD = Math.max(1, ...ac.nodes.map((n) => n.depth)), gx = 40, gw = width * 0.62, gy = 250, gh = height - 420;
  nodePos = [];
  let place = (v, x0) => { let L = leaves(v); nodePos[v] = { x: gx + (x0 + L / 2) / leaves(0) * gw, y: gy + (ac.nodes[v].depth / maxD) * gh, loop: Math.PI / 2 }; let off = x0; for (let c of Object.keys(ac.nodes[v].next).sort()) { let u = ac.nodes[v].next[c]; place(u, off); off += leaves(u); } };
  place(0, 0);
}

function draw() {
  background(...BG);
  hudTitle('エイホ-コラシック法：たくさんの単語を同時にさがす',
    editMode === 'see' ? '見るモード：← → 1 文字　スペース 自動再生　↑↓ お手本（' + (pIdx + 1) + '）　Tab 単語の編集へ' : '✎ ' + (editMode === 'pat' ? '単語' : 'テキスト') + 'の編集：英小文字と空白で入力　Backspace 消す　Tab 次へ');
  if (playing && editMode === 'see' && frameCount % 24 === 0) { if (tpos < txt.length) tpos++; else playing = false; }
  // ---- 単語とテキスト
  [['pat', '単語', patBuf, 84], ['txt', 'テキスト', txt, 122]].forEach(([id, lab, s, y]) => {
    let on = editMode === id; stroke(...(on ? AMBER : WIRE)); strokeWeight(on ? 2 : 1); fill(...PANEL); rect(110, y, width - 150, 30, 6);
    noStroke(); fill(...(on ? AMBER : DIMC)); textSize(15); textAlign(LEFT, CENTER); text(lab, 30, y + 15);
    if (id === 'pat') { fill(...INK); textSize(17); text(s + (on && frameCount % 60 < 30 ? '|' : ''), 122, y + 16); }
  });
  // テキスト（読んだところまで・一致を色で）
  let cw = Math.min(22, (width - 170) / Math.max(1, txt.length)), shownHits = run.hits.filter((h) => h[0] + pats[h[1]].length - 1 < tpos);
  for (let i = 0; i < txt.length; i++) {
    let x = 122 + i * cw, inHit = shownHits.some((h) => i >= h[0] && i < h[0] + pats[h[1]].length);
    noStroke(); if (inHit) { fill(...LIME, 90); rect(x, 124, cw, 26); } if (i === tpos - 1) { fill(...AMBER, 150); rect(x, 124, cw, 26); }
    fill(...(i < tpos ? INK : DIMC)); textAlign(CENTER, CENTER); textSize(Math.min(17, cw * 0.9)); text(txt[i], x + cw / 2, 137);
  }
  if (editMode === 'txt' && frameCount % 60 < 30) { fill(...AMBER); rect(122 + txt.length * cw, 126, 2, 22); }
  // ---- トライと失敗リンク
  let cur = tpos > 0 ? run.trace[tpos - 1] : { v: 0, hops: [], found: [] }, hi = {};
  for (let h of cur.hops) hi[h] = ROSE;
  hi[cur.v] = AMBER;
  let m = { n: ac.nodes.length, start: 0, acc: ac.nodes.map((n) => n.out.length > 0), tr: ac.nodes.map((n) => n.next) };
  // 失敗リンク（点線、根へのものは省略）
  for (let v = 1; v < ac.nodes.length; v++) { let f = ac.nodes[v].fail; if (f === 0) continue;
    let a = nodePos[v], b = nodePos[f], mx = (a.x + b.x) / 2 + 20, my = (a.y + b.y) / 2 - 40;
    arrowLine(bezPts(a.x, a.y - 16, mx, my, b.x + 10, b.y + 14, 20), cur.hops.indexOf(v) >= 0 ? ROSE : [150, 110, 190], 1.5, true); }
  drawMachine(m, nodePos, { r: 16, hi, names: ac.nodes.map((n, v) => (v ? n.ch : 'ε')), nameSize: 14, labels: false, start: false, edgeCol: [90, 130, 110] });
  textAlign(LEFT, BASELINE); noStroke(); fill(...DIMC); textSize(13);
  text('トライ ' + ac.nodes.length + ' ノード（二重丸 = そこで終わる単語がある）。紫の点線 = 失敗リンク（根へのものは省略）。赤 = いま失敗リンクで戻ったノード', 40, 236);
  // ---- 右：いまの様子と見つかった単語
  let px = width * 0.68, py = 250;
  fill(...INK); textSize(16); text('いまのノード：「' + wordOf(ac, cur.v) + '」', px, py);
  fill(...DIMC); textSize(14);
  if (cur.hops.length) text('失敗リンクで戻った：' + cur.hops.map((h) => '「' + wordOf(ac, h) + '」').join(' → '), px, py + 26);
  fill(...LIME); text('ここで見つかった：' + (cur.found.length ? cur.found.map((w) => pats[w]).join(', ') : 'なし'), px, py + 52);
  fill(...INK); textSize(15); text('見つかった単語 ' + shownHits.length + ' / ' + run.hits.length + ' 個', px, py + 92);
  shownHits.slice(-14).forEach((h, k) => { fill(...DIMC); textSize(14); text(pats[h[1]] + '（' + (h[0] + 1) + ' 文字目から）', px, py + 118 + k * 22); });
  fill(...DIMC); textSize(13);
  text('枝と失敗リンクをたどった回数 ' + run.steps + ' ≤ 2 × 文字数 ' + 2 * txt.length, px, height - 60);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'Tab') { editMode = { see: 'pat', pat: 'txt', txt: 'see' }[editMode]; return false; }
  if (editMode !== 'see') {
    if (key === 'Backspace') { if (editMode === 'pat') patBuf = patBuf.slice(0, -1); else txt = txt.slice(0, -1); }
    else if (key === 'Enter') editMode = 'see';
    else if (editMode === 'pat') patBuf = typeInto(patBuf, key, 'abcdefghijklmnopqrstuvwxyz ', 60);
    else txt = typeInto(txt, key, 'abcdefghijklmnopqrstuvwxyz ', 50);
    tpos = Math.min(tpos, txt.length); rebuild(); return false;
  }
  if (key === RIGHT_ARROW) { playing = false; tpos = Math.min(txt.length, tpos + 1); }
  if (key === LEFT_ARROW) { playing = false; tpos = Math.max(0, tpos - 1); }
  if (key === ' ') { if (tpos >= txt.length) tpos = 0; playing = !playing; }
  if (key === UP_ARROW) { loadPreset(pIdx - 1); tpos = 0; }
  if (key === DOWN_ARROW) { loadPreset(pIdx + 1); tpos = 0; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(13); let okNaive = true, okFail = true, okLin = true;
  for (let k = 0; k < 300; k++) {
    let ws = []; for (let j = rndInt(1, 6); j > 0; j--) ws.push(rndString('abc', rndInt(1, 4)));
    let s = rndString('abc', 40), m = buildAC(ws), r = runAC(m, ws, s), naive = [];
    for (let i = 0; i < s.length; i++) ws.forEach((w, wi) => { if (s.startsWith(w, i)) naive.push([i, wi]); });
    let key2 = (a) => a.map((h) => h[0] + ':' + h[1]).sort().join(' ');
    if (key2(r.hits) !== key2(naive)) okNaive = false;
    if (r.steps > 2 * s.length) okLin = false;
    for (let v = 1; v < m.nodes.length; v++) {           // 失敗リンク = 一番長い「真の後ろの一部」で、トライにあるもの
      let w = wordOf(m, v), want = 0;
      for (let L = w.length - 1; L >= 1; L--) { let u = 0, suf = w.slice(w.length - L); for (let c of suf) { u = u >= 0 && m.nodes[u].next[c] !== undefined ? m.nodes[u].next[c] : -1; } if (u >= 0) { want = u; break; } }
      if (m.nodes[v].fail !== want) okFail = false;
    }
  }
  check('でたらめな単語の組 300 回：見つかった (位置, 単語) = 全部の位置で全部の単語を比べる素朴な方法', okNaive);
  check('失敗リンク = その文字列の一番長い真の後ろの一部（トライにあるもの）を総当たりで確かめた', okFail);
  check('たどった回数（枝 + 失敗リンク）はいつも 2 × テキストの長さ以下', okLin);
  let ws = ['he', 'she', 'his', 'hers'], r = runAC(buildAC(ws), ws, 'ushers');
  check('有名な例：he, she, his, hers を ushers でさがすと she, he, hers の 3 個', r.hits.map((h) => ws[h[1]]).sort().join() === 'he,hers,she');
  check('トライのノード数：he, she, his, hers → 10（根を含む）', buildAC(ws).nodes.length === 10);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ushers を 1 文字ずつ進めよう。「she」まで読んだとき、出力に he も入っているのはなぜ？（失敗リンク先の出力を引きつぐ）
// 2. 2 番目のお手本で、失敗リンクを何回たどる文字があるか見つけよう
// 3. 単語を 1 つだけにすると、シリーズ 17 の 02 の「文字列照合のオートマトン」と同じ動きになる
// 4. 単語の数を 10 個に増やしても、テキストを読む手間は増えない（増えるのはトライを作る手間と出力の数）
// 5. 禁止語のフィルター、ウイルスの検出、DNA のパターンさがしでも同じしくみが使われる

// ==================================================
// ここから下は「オートマトンの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [9, 20, 15];                 // 背景（回路基板の黒緑）
const INK = [226, 240, 228];            // 文字（蛍光の白）
const AMBER = [255, 170, 50], CYAN = [70, 215, 230], LIME = [140, 230, 120], ROSE = [255, 100, 120], VIOLET = [185, 150, 255];
const DIMC = [125, 155, 138], PANEL = [18, 36, 28], WIRE = [44, 74, 58];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; return v.toFixed(d === undefined ? 2 : d); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function typeInto(s, ch, allowed, maxLen) {   // 文字の入力：allowed に入っている 1 文字だけ足す（長さの上限つき）
  if (typeof ch !== 'string' || ch.length !== 1 || allowed.indexOf(ch) < 0) return s;
  return s.length < (maxLen || 40) ? s + ch : s;
}
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function rndPick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function rndString(alpha, len) { let s = ''; for (let i = 0; i < len; i++) s += alpha[Math.floor(rnd() * alpha.length)]; return s; }
// ---- 状態遷移図を描く道具（円 = 状態、二重丸 = 受理、矢印 = 遷移。曲線は折れ線で描く）
function bezPts(x0, y0, cx, cy, x1, y1, n) {   // 2 次ベジェ曲線 → 折れ線の点
  let out = [];
  for (let i = 0; i <= n; i++) { let t = i / n, u = 1 - t; out.push([u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]); }
  return out;
}
function cubicPts(p0, p1, p2, p3, n) {          // 3 次ベジェ曲線 → 折れ線の点（自己ループ用）
  let out = [];
  for (let i = 0; i <= n; i++) { let t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); }
  return out;
}
function arrowLine(pts, col, w, dashed) {      // 折れ線 + 先の三角
  if (!pts || pts.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2);
  if (dashed) { for (let i = 0; i + 1 < pts.length; i += 2) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); }
  else { beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(); }
  let [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 2], L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, s = 7 + (w || 2) * 1.5;
  noStroke(); fill(...col);
  triangle(x1, y1, x1 - ux * s - uy * s * 0.5, y1 - uy * s + ux * s * 0.5, x1 - ux * s + uy * s * 0.5, y1 - uy * s - ux * s * 0.5);
}
function edgeList(m) {                  // DFA / NFA → 辺のリスト [{from, to, label}]（同じ向きの辺はラベルをまとめる）
  let map = new Map();
  for (let q = 0; q < m.n; q++) for (let c in m.tr[q] || {}) {
    let ts = m.tr[q][c]; ts = Array.isArray(ts) ? ts : [ts];
    for (let t of ts) { if (t < 0 || t >= m.n) continue; let k = q + '>' + t; if (!map.has(k)) map.set(k, { from: q, to: t, syms: [] }); map.get(k).syms.push(c === '' ? 'ε' : c); }
  }
  return [...map.values()].map((e) => ({ from: e.from, to: e.to, label: e.syms.sort().join(','), syms: e.syms }));
}
function edgeGeometry(e, pos, r, both) {        // 1 本の辺の折れ線の点とラベルの位置
  let a = pos[e.from], b = pos[e.to];
  if (e.from === e.to) {                        // 自己ループ：中心から外向き（または上）に輪
    let ang = a.loop !== undefined ? a.loop : -Math.PI / 2, ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
    let s0 = [a.x + (ux * 0.6 + px * 0.8) * r, a.y + (uy * 0.6 + py * 0.8) * r], s1 = [a.x + (ux * 0.6 - px * 0.8) * r, a.y + (uy * 0.6 - py * 0.8) * r];
    let pts = cubicPts(s0, [s0[0] + (ux * 2.2 + px * 0.9) * r, s0[1] + (uy * 2.2 + py * 0.9) * r], [s1[0] + (ux * 2.2 - px * 0.9) * r, s1[1] + (uy * 2.2 - py * 0.9) * r], s1, 18);
    return { pts, lx: a.x + ux * 2.35 * r, ly: a.y + uy * 2.35 * r };
  }
  let dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, bend = both ? 0.22 * L : (e.bend || 0) * L;
  let mx = (a.x + b.x) / 2 - uy * bend, my = (a.y + b.y) / 2 + ux * bend;
  let d0x = mx - a.x, d0y = my - a.y, l0 = Math.hypot(d0x, d0y) || 1, d1x = mx - b.x, d1y = my - b.y, l1 = Math.hypot(d1x, d1y) || 1;
  let pts = bezPts(a.x + (d0x / l0) * r, a.y + (d0y / l0) * r, mx, my, b.x + (d1x / l1) * (r + 2), b.y + (d1y / l1) * (r + 2), 16);
  let mid = pts[8];
  return { pts, lx: mid[0] - uy * 13, ly: mid[1] + ux * 13 };
}
// m = DFA/NFA、pos = [{x, y, loop?}]、opt = { r, names, hi: {状態: 色}, edgeHi: (e) => 色 or null, start: true, labelSize }
function drawMachine(m, pos, opt) {
  opt = opt || {};
  let r = opt.r || 22, edges = opt.edges || edgeList(m), has = new Set(edges.map((e) => e.from + '>' + e.to));
  textAlign(CENTER, CENTER);
  for (let e of edges) {
    if (!pos[e.from] || !pos[e.to]) continue;
    let g = edgeGeometry(e, pos, r, e.from !== e.to && has.has(e.to + '>' + e.from));
    let hc = opt.edgeHi ? opt.edgeHi(e) : null;
    arrowLine(g.pts, hc || opt.edgeCol || [120, 160, 140], hc ? 3.5 : 1.8, e.label === 'ε' && !hc);
    if (opt.labels !== false || hc) { noStroke(); fill(...(hc || opt.labelCol || [200, 225, 210])); textSize(opt.labelSize || 14); text(e.label, g.lx, g.ly); }
  }
  if (opt.start !== false && pos[m.start]) {   // 開始の矢印（左から）
    let p = pos[m.start], sa = opt.startAng !== undefined ? opt.startAng : p.loop !== undefined && Math.cos(p.loop) < -0.5 ? -2.2 : Math.PI;
    let ux = Math.cos(sa), uy = Math.sin(sa);   // 自己ループと重ならない向きから
    arrowLine([[p.x + ux * (r + 34), p.y + uy * (r + 34)], [p.x + ux * (r + 2), p.y + uy * (r + 2)]], opt.startCol || INK, 2);
  }
  for (let q = 0; q < m.n; q++) {
    let p = pos[q]; if (!p) continue;
    let hc = opt.hi && opt.hi[q];
    stroke(...(hc || [150, 190, 170])); strokeWeight(hc ? 3.5 : 2); fill(...(hc ? hc.map((v) => v * 0.35) : PANEL));
    circle(p.x, p.y, 2 * r);
    if (m.acc[q]) { noFill(); circle(p.x, p.y, 2 * r - 9); }
    noStroke(); fill(...(hc ? [255, 255, 255] : INK)); textSize(opt.nameSize || Math.min(16, r * 0.75));
    text(opt.names ? opt.names[q] : 'q' + q, p.x, p.y + 1);
  }
}
function circleLayout(n, cx, cy, rad, a0) {    // 円の上に並べる（自己ループは外向き）
  let out = [];
  for (let i = 0; i < n; i++) { let a = (a0 === undefined ? Math.PI : a0) + (2 * Math.PI * i) / Math.max(1, n); out.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a), loop: a }); }
  return out;
}
function layerLayout(m, x, y, w, h) {          // スタートからの距離（幅優先）で左 → 右に並べる
  let depth = new Array(m.n).fill(-1), order = [m.start]; depth[m.start] = 0;
  for (let i = 0; i < order.length; i++) for (let e of edgeList(m)) if (e.from === order[i] && depth[e.to] < 0) { depth[e.to] = depth[order[i]] + 1; order.push(e.to); }
  let maxD = Math.max(0, ...depth); for (let q = 0; q < m.n; q++) if (depth[q] < 0) { depth[q] = maxD + 1; order.push(q); }
  maxD = Math.max(...depth);
  let cols = []; for (let q of order) (cols[depth[q]] = cols[depth[q]] || []).push(q);
  let pos = [];
  cols.forEach((col, d) => col.forEach((q, k) => { pos[q] = { x: x + (maxD ? (d / maxD) * w : w / 2), y: y + ((k + 1) / (col.length + 1)) * h, loop: -Math.PI / 2 }; }));
  return pos;
}
function hitState(pos, x, y, r) { for (let q = pos.length - 1; q >= 0; q--) if (pos[q] && Math.hypot(pos[q].x - x, pos[q].y - y) < r) return q; return -1; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
