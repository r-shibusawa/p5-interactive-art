// ============================================
// 07 字句解析器 ─ プログラムの文字の列を「トークン」（数・名前・キーワード・演算子・コメント）に切り分ける
// 1 つの DFA で先頭から読み、受理状態を通るたびに「ここまでなら 1 トークン」と覚えておく。進めなくなったら、
// 最後に覚えた所までを 1 トークンにする（最長一致）。<= は < と = ではなく 1 つ、iff は if ではなく名前。
// 名前とキーワードは同じ形なので、切り出してから表で見分ける（キーワードが優先）。どの受理状態も通らなければエラー文字
// Tab = 見るモード ⇔ 編集モード（編集中は文字キーがすべて入力、Enter 改行、Backspace 消す）
// 見るモード：← → 1 文字ずつ DFA をたどる / スペース 自動再生 / ↑↓ お手本を変える
// ============================================

const KEYWORDS = ['if', 'else', 'while', 'let', 'print'];   // ★ キーワード（名前より優先）
const PRESETS = [
  'let x = 12.5;\nif (x >= 10) { print(x * 2); } // ok\nwhile iff <= 3.',
  'a==b=c<=d<e>=f>g/h// comment\n// whole line\nlet  _tmp1 = 007;',
  'price = 3.14 * r * r;\nprint(price) # oops @\nelse{}',
];
const KIND_COL = { キーワード: [255, 120, 200], 名前: [226, 240, 228], 数: [255, 170, 50], 演算子: [70, 215, 230], コメント: [110, 150, 120], 空白: [40, 60, 50], エラー: [255, 90, 90] };
// DFA の状態：[名前, 受理したときのトークンの種類（null = 受理しない）, 図の x, y（0〜1）, 自己ループの向き]
const LEX_STATES = [
  ['開始', null, 0.05, 0.5], ['名前', '名前', 0.38, 0.06, 0], ['数', '数', 0.38, 0.2, -1.5], ['数.', null, 0.7, 0.2], ['小数', '数', 0.95, 0.2, 0],
  ['記号', '演算子', 0.38, 0.34], ['<', '演算子', 0.38, 0.46], ['<=', '演算子', 0.7, 0.46], ['>', '演算子', 0.38, 0.58], ['>=', '演算子', 0.7, 0.58],
  ['=', '演算子', 0.38, 0.7], ['==', '演算子', 0.7, 0.7], ['/', '演算子', 0.38, 0.82], ['//…', 'コメント', 0.7, 0.82, 0], ['空白', '空白', 0.38, 0.95, 0],
];
function charClass(c) {
  if (/[A-Za-z_]/.test(c)) return '英字';
  if (/[0-9]/.test(c)) return '数字';
  if (c === ' ' || c === '\t' || c === '\n') return '空白';
  return c;
}
// ★ DFA の遷移：状態 q で文字 c を読んだら次の状態（-1 = 進めない）
function lexNext(q, c) {
  let k = charClass(c);
  switch (q) {
    case 0: if (k === '英字') return 1; if (k === '数字') return 2; if ('+-*(){};'.indexOf(c) >= 0) return 5;
      if (c === '<') return 6; if (c === '>') return 8; if (c === '=') return 10; if (c === '/') return 12; if (k === '空白') return 14; return -1;
    case 1: return k === '英字' || k === '数字' ? 1 : -1;
    case 2: return k === '数字' ? 2 : c === '.' ? 3 : -1;
    case 3: case 4: return k === '数字' ? 4 : -1;
    case 6: case 8: case 10: return c === '=' ? q + 1 : -1;
    case 12: return c === '/' ? 13 : -1;
    case 13: return c !== '\n' ? 13 : -1;
    case 14: return k === '空白' ? 14 : -1;
  }
  return -1;
}
// ★ 最長一致で全部切り出す。trace = 1 文字読むごとの [トークン番号, 位置, 状態]
function lex(src) {
  let toks = [], trace = [], i = 0;
  while (i < src.length) {
    let q = 0, j = i, last = -1, lastQ = -1;
    while (j < src.length) { let nq = lexNext(q, src[j]); if (nq < 0) break; q = nq; j++; trace.push([toks.length, j - 1, q]); if (LEX_STATES[q][1]) { last = j; lastQ = q; } }
    if (last < 0) { toks.push({ kind: 'エラー', text: src[i], at: i }); trace.push([toks.length - 1, i, -1]); i++; continue; }
    let s = src.slice(i, last), kind = LEX_STATES[lastQ][1];
    if (kind === '名前' && KEYWORDS.indexOf(s) >= 0) kind = 'キーワード';
    toks.push({ kind, text: s, at: i }); i = last;
  }
  return { toks, trace };
}
let src = '', res, tIdx = 0, playing = false, editMode = false, pIdx = 0, statePos = [], lexMachine;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lexMachine = buildLexMachine();
  selfTest();
  loadPreset(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function loadPreset(k) { pIdx = (k + PRESETS.length) % PRESETS.length; src = PRESETS[pIdx]; relex(); }
function relex() { res = lex(src); tIdx = Math.min(tIdx, res.trace.length); }
function buildLexMachine() {          // 図にするための DFA（記号 = 文字の種類）
  let tr = LEX_STATES.map(() => ({}));
  let e = (a, lab, b) => { tr[a][lab] = b; };
  e(0, '英字', 1); e(1, '英数', 1); e(0, '数字', 2); e(2, '数字', 2); e(2, '.', 3); e(3, '数字', 4); e(4, '数字', 4);
  e(0, '+-*(){};', 5); e(0, '<', 6); e(6, '=', 7); e(0, '>', 8); e(8, '=', 9); e(0, '=', 10); e(10, '=', 11); e(0, '/', 12); e(12, '/', 13); e(13, '改行以外', 13); e(0, '空白', 14); e(14, '空白', 14);
  return { n: LEX_STATES.length, alpha: [], tr, start: 0, acc: LEX_STATES.map((s) => !!s[1]) };
}

function draw() {
  background(...BG);
  hudTitle('字句解析器：DFA の最長一致でトークンに切る', (editMode ? '✎ 編集モード：文字キー 入力　Enter 改行　Backspace 消す　Tab 見るモードへ' : '見るモード：← → 1 文字　スペース 自動再生　↑↓ お手本（' + (pIdx + 1) + '）　Tab 編集モードへ'));
  if (playing && frameCount % 8 === 0) { if (tIdx < res.trace.length) tIdx++; else playing = false; }
  let cur = tIdx > 0 ? res.trace[tIdx - 1] : null;
  // ---- ソース（色 = トークンの種類）
  let x0 = 30, y0 = 100, cw = 13, lh = 30, x = x0, y = y0;
  stroke(...(editMode ? AMBER : WIRE)); strokeWeight(editMode ? 2 : 1); noFill(); rect(20, 84, width * 0.55, 120, 8);
  textFont('monospace'); textSize(19); textAlign(LEFT, TOP);
  res.toks.forEach((t, ti) => {
    for (let k = 0; k < t.text.length; k++) {
      let c = t.text[k], gi = t.at + k;
      if (cur && gi === cur[1]) { noStroke(); fill(...AMBER, 120); rect(x, y - 2, cw, lh - 4); }
      if (t.kind === 'エラー') { noStroke(); fill(255, 90, 90, 80); rect(x, y - 2, cw, lh - 4); }
      if (cur && ti === cur[0] && t.kind !== '空白') { stroke(...AMBER); strokeWeight(2); line(x, y + lh - 6, x + cw, y + lh - 6); }
      noStroke(); fill(...(KIND_COL[t.kind] || INK));
      if (c === '\n') { x = x0; y += lh; continue; }
      text(c === ' ' ? '·' : c, x, y); x += cw;
    }
  });
  if (editMode && frameCount % 60 < 30) { fill(...AMBER); rect(x + 1, y, 2, lh - 6); }
  textFont('sans-serif');
  // ---- トークンの列
  let ty = 230, col = 0, row = 0, shown = res.toks.filter((t) => t.kind !== '空白');
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('トークン ' + shown.length + ' 個（空白を除く）', 30, ty);
  shown.slice(0, 48).forEach((t, k) => {
    let xx = 30 + col * (width * 0.55 / 3), yy = ty + 26 + row * 22;
    fill(...(KIND_COL[t.kind] || INK)); textSize(14); text(t.kind + '  ' + JSON.stringify(t.text), xx, yy);
    if (++row >= 16) { row = 0; col++; }
  });
  // ---- 字句解析の DFA
  let gx = width * 0.6, gy = 110, gw = width * 0.37, gh = height - 220;
  statePos = LEX_STATES.map((s) => ({ x: gx + s[2] * gw, y: gy + s[3] * gh, loop: s[4] !== undefined ? s[4] : -Math.PI / 2 }));
  let hi = {}; if (cur && cur[2] >= 0) hi[cur[2]] = AMBER; if (cur && cur[2] < 0) hi[0] = ROSE;
  drawMachine(lexMachine, statePos, { r: 19, names: LEX_STATES.map((s) => s[0]), nameSize: 11, labelSize: 12, hi, edgeCol: [70, 110, 90] });
  textAlign(LEFT, BASELINE); fill(...INK); textSize(15); text('字句解析の DFA（二重丸 = 1 トークンになれる）', gx - 20, 96);
  fill(...DIMC); textSize(13);
  if (cur) text('いま：「' + (src[cur[1]] === '\n' ? '改行' : src[cur[1]]) + '」を読んで ' + (cur[2] >= 0 ? LEX_STATES[cur[2]][0] : 'どこにも進めない → エラー文字'), gx - 20, height - 60);
  text('進めなくなったら「最後に二重丸を通った所」まで戻ってトークンにする', gx - 20, height - 40);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'Tab') { editMode = !editMode; return false; }
  if (editMode) {
    if (key === 'Backspace') src = src.slice(0, -1);
    else if (key === 'Enter') src = src.length < 300 ? src + '\n' : src;
    else if (key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) < 127) src = typeInto(src, key, key, 300);
    relex(); return false;
  }
  if (key === RIGHT_ARROW) { playing = false; tIdx = Math.min(res.trace.length, tIdx + 1); }
  if (key === LEFT_ARROW) { playing = false; tIdx = Math.max(0, tIdx - 1); }
  if (key === ' ') { if (tIdx >= res.trace.length) tIdx = 0; playing = !playing; }
  if (key === UP_ARROW) loadPreset(pIdx - 1);
  if (key === DOWN_ARROW) loadPreset(pIdx + 1);
  return false;
}

// ---- 自己テスト
function refLex(s) {                    // くらべる相手：正規表現をいくつも試して一番長いものを選ぶ字句解析
  let pats = [['名前', /[A-Za-z_][A-Za-z0-9_]*/y], ['数', /[0-9]+(\.[0-9]+)?/y], ['コメント', /\/\/[^\n]*/y], ['空白', /[ \t\n]+/y], ['演算子', /<=|>=|==|[-+*\/()<>={};]/y]];
  let out = [], i = 0;
  while (i < s.length) {
    let best = null;
    for (let [k, re] of pats) { re.lastIndex = i; let m = re.exec(s); if (m && (!best || m[0].length > best[1].length)) best = [k, m[0]]; }
    if (!best) { out.push({ kind: 'エラー', text: s[i] }); i++; continue; }
    if (best[0] === '名前' && KEYWORDS.indexOf(best[1]) >= 0) best[0] = 'キーワード';
    out.push({ kind: best[0], text: best[1] }); i += best[1].length;
  }
  return out;
}
function selfTest() {
  selfTestResults = [];
  seedRng(7); let okRound = true, okRef = true, okLen = true;
  for (let k = 0; k < 400; k++) {
    let s = rndString('aif1 2.=</>;\n#_ewlh', rndInt(0, 30)), t = lex(s).toks;
    if (t.map((x) => x.text).join('') !== s) okRound = false;
    if (JSON.stringify(t.map((x) => [x.kind, x.text])) !== JSON.stringify(refLex(s).map((x) => [x.kind, x.text]))) okRef = false;
    if (t.some((x) => !x.text.length || (x.kind === 'エラー' && x.text.length !== 1))) okLen = false;
  }
  check('でたらめな 400 個のソース：トークンをつなぐと元に戻る（取りこぼしなし）', okRound);
  check('DFA の最長一致 = 正規表現で一番長いものを選ぶ字句解析（400 個とも同じ列）', okRef);
  check('トークンは空にならない、エラー文字は 1 文字ずつ', okLen);
  let k1 = lex('if iff <= 1. a//b\nc').toks.filter((x) => x.kind !== '空白').map((x) => x.kind + ':' + x.text).join(' ');
  check('最長一致の例：' + k1, k1 === 'キーワード:if 名前:iff 演算子:<= 数:1 エラー:. 名前:a コメント://b 名前:c');
  let k2 = lex(PRESETS[0]).toks.filter((x) => x.kind !== '空白').length;
  check('お手本 1 のトークンは 26 個（空白を除く）', k2 === 26);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 「iff」「if」「if1」「_if」を入力して、どれがキーワードになるか確かめよう。なぜ「切ってから表で見分ける」と楽？
// 2. 「1.」「1.5」「1..5」はどう切られる？ 数. の状態は二重丸でないので、1 文字戻る（最長一致の「後もどり」）
// 3. != （等しくない）を足そう：LEX_STATES に状態 ['!', null, …] と ['!=', '演算子', …] を、lexNext に遷移を足す
// 4. 文字列リテラル "…" を足すには、どんな状態が要る？ 閉じない " はどうなる？
// 5. 字句解析の次は「構文解析」：トークンの列が文法に合うかを調べる（09 の CYK）

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
