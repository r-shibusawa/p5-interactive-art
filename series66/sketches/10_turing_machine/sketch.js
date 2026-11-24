// ============================================
// 10 チューリング機械 ─ 無限に長いテープと、1 マスだけ読み書きできるヘッドと、状態表
// 1 手 = 「いまの状態」と「ヘッドの下の記号」で表を引き、記号を書いて、左右に 1 マス動き、次の状態へ。
// 規則がない組み合わせに来たら止まる。こんな単純な機械で、どんな計算もできる（と考えられている）。
// 下の時空図は、テープの 1 手ごとの様子を上から下へ並べたもの
// 1 2 進数に 1 を足す / 2 単項の足し算 / 3 回文の判定 / スペース 1 手 / A 自動 / ↑↓ 速さ / R 最初から / I 新しい入力
// 表のマスをクリックで選んで W 書く記号 / M 動く向き / N 次の状態 を順に変える / Backspace その規則を消す
// ============================================

const PROGRAMS = [
  { name: '2 進数に 1 を足す', syms: ['0', '1', '_'], states: ['右へ', '繰上'], start: '右へ', inputs: () => (rndInt(0, 63)).toString(2),
    code: { '右へ0': ['0', 'R', '右へ'], '右へ1': ['1', 'R', '右へ'], '右へ_': ['_', 'L', '繰上'], '繰上1': ['0', 'L', '繰上'], '繰上0': ['1', 'L', 'H'], '繰上_': ['1', 'L', 'H'] } },
  { name: '単項の足し算（111+11 → 11111）', syms: ['1', '+', '_'], states: ['A', 'B', 'C'], start: 'A', inputs: () => '1'.repeat(rndInt(0, 5)) + '+' + '1'.repeat(rndInt(0, 5)),
    code: { A1: ['1', 'R', 'A'], 'A+': ['1', 'R', 'B'], B1: ['1', 'R', 'B'], B_: ['_', 'L', 'C'], C1: ['_', 'L', 'H'] } },
  { name: '回文の判定（Y = 受理、N = 不受理）', syms: ['a', 'b', '_'], states: ['読む', 'a右', 'b右', 'a確', 'b確', '戻る'], start: '読む', inputs: () => { let h = rndString('ab', rndInt(1, 4)); return rnd() < 0.5 ? h + [...h].reverse().join('') : rndString('ab', rndInt(2, 7)); },
    code: { '読むa': ['_', 'R', 'a右'], '読むb': ['_', 'R', 'b右'], '読む_': ['_', 'R', 'Y'], 'a右a': ['a', 'R', 'a右'], 'a右b': ['b', 'R', 'a右'], 'a右_': ['_', 'L', 'a確'],
      'b右a': ['a', 'R', 'b右'], 'b右b': ['b', 'R', 'b右'], 'b右_': ['_', 'L', 'b確'], 'a確a': ['_', 'L', '戻る'], 'a確b': ['b', 'L', 'N'], 'a確_': ['_', 'L', 'Y'],
      'b確b': ['_', 'L', '戻る'], 'b確a': ['a', 'L', 'N'], 'b確_': ['_', 'L', 'Y'], '戻るa': ['a', 'L', '戻る'], '戻るb': ['b', 'L', '戻る'], '戻る_': ['_', 'R', '読む'] } },
];
const SYM_COL = { '1': [255, 170, 50], '0': [70, 150, 160], a: [255, 170, 50], b: [70, 215, 230], '+': [185, 150, 255] };
let prog = 0, mach, cfg, inputStr = '1011', hist = [], auto = false, speed = 4, sel = null, cellBoxes = [], histG;
const HIST_LO = -6, HIST_CELLS = 40, HIST_ROWS = 110;

function setup() {
  createCanvas(windowWidth, windowHeight);
  histG = createGraphics(HIST_CELLS * 8, HIST_ROWS * 3);
  selfTest();
  loadProgram(0, '1011');
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function makeMachine(p) { let P = PROGRAMS[p]; return { states: P.states, syms: P.syms, blank: '_', rules: JSON.parse(JSON.stringify(P.code)), start: P.start, halt: 'H' }; }
function loadProgram(p, inp) { prog = p; mach = makeMachine(p); inputStr = inp; resetRun(); sel = null; }
function resetRun() { cfg = tmStart(mach, inputStr, 0); hist = [tmTape(cfg, '_', HIST_LO, HIST_LO + HIST_CELLS - 1)]; histHead = [cfg.head]; redrawHist(); }
let histHead = [];
function doStep() {
  if (!tmStep(mach, cfg)) return;
  hist.push(tmTape(cfg, '_', HIST_LO, HIST_LO + HIST_CELLS - 1)); histHead.push(cfg.head);
  if (hist.length > HIST_ROWS) { hist.shift(); histHead.shift(); }
}
function redrawHist() {                // 時空図（1 行 = 1 手）を絵にしておく
  histG.background(14, 26, 20); histG.noStroke();
  hist.forEach((row, r) => { for (let k = 0; k < row.length; k++) { let c = SYM_COL[row[k]]; if (c) { histG.fill(...c); histG.rect(k * 8, r * 3, 7, 3); } }
    let h = histHead[r] - HIST_LO; if (h >= 0 && h < HIST_CELLS) { histG.fill(255); histG.rect(h * 8 + 2, r * 3, 3, 3); } });
}

function draw() {
  background(...BG);
  let P = PROGRAMS[prog];
  hudTitle('チューリング機械：' + P.name, '1 2 3 プログラム　スペース 1 手　A 自動（' + (auto ? 'ON' : 'OFF') + '）　↑↓ 速さ ' + speed + '　R 最初から　I 新しい入力　表をクリック → W 書く / M 向き / N 次 / Backspace 消す');
  if (auto && !cfg.halted) { let before = cfg.steps; for (let k = 0; k < speed && !cfg.halted; k++) if (frameCount % Math.max(1, 6 - speed) === 0) doStep(); if (cfg.steps !== before) redrawHist(); }
  // ---- テープ
  noStroke(); fill(...INK); textSize(16); textAlign(LEFT, BASELINE);
  text('入力「' + inputStr + '」　手数 ' + cfg.steps + '　状態 ' + cfg.q + (cfg.halted ? '　→ 止まった' : ''), 30, 100);
  drawTape(cfg, '_', 30, 140, 40, Math.floor((width - 60) / 40), Math.max(cfg.head, 8), SYM_COL);
  if (cfg.halted) {
    let out = tmContent(cfg, '_'), msg = prog === 0 ? '結果 ' + out + '（10 進で ' + parseInt(inputStr || '0', 2) + ' + 1 = ' + parseInt(out || '0', 2) + '）' : prog === 1 ? '結果 ' + out.length + ' 個の 1（' + inputStr.split('+').map((s) => s.length).join(' + ') + '）' : cfg.q === 'Y' ? '受理（回文）' : '不受理（回文でない）';
    fill(...LIME); textSize(20); text(msg, 30, 230);
  }
  // ---- 状態表
  let tx = 30, ty = 270, cw = 96, rh = 30; cellBoxes = [];
  textAlign(LEFT, BASELINE);
  fill(...INK); textSize(15); text('状態表（行 = 状態、列 = 読んだ記号、マス = 書く・動く・次）', tx, ty - 10);
  mach.syms.forEach((s, j) => { fill(...DIMC); textAlign(CENTER, CENTER); text(s === '_' ? '空白 _' : s, tx + 80 + j * cw + cw / 2, ty + 12); });
  mach.states.forEach((q, i) => {
    let y = ty + 26 + i * rh;
    fill(...(q === cfg.q ? AMBER : DIMC)); textAlign(LEFT, CENTER); textSize(14); text(q, tx, y + rh / 2);
    mach.syms.forEach((s, j) => {
      let r = mach.rules[q + s], x = tx + 80 + j * cw, on = q === cfg.q && s === tmRead(cfg, cfg.head, '_') && !cfg.halted, isSel = sel && sel[0] === q && sel[1] === s;
      stroke(...(isSel ? VIOLET : on ? AMBER : WIRE)); strokeWeight(isSel || on ? 2.5 : 1); fill(...(on ? [70, 55, 20] : PANEL)); rect(x, y + 2, cw - 6, rh - 4, 4);
      noStroke(); fill(...(r ? INK : DIMC)); textAlign(CENTER, CENTER); textSize(13); text(r ? r.join(' ') : '（止まる）', x + cw / 2 - 3, y + rh / 2);
      cellBoxes.push([x, y + 2, cw - 6, rh - 4, q, s]);
    });
  });
  fill(...DIMC); textAlign(LEFT, BASELINE); textSize(13);
  text('H / Y / N = 止まる状態。紫 = 選んだマス（W M N で変える）', tx, ty + 40 + mach.states.length * rh);
  // ---- 時空図
  let hx = width * 0.6, hy = 270, sc = Math.min((width - hx - 30) / histG.width, (height - hy - 60) / histG.height);
  fill(...INK); textSize(15); text('時空図（横 = テープ、下へ = 時間）', hx, hy - 10);
  image(histG, hx, hy, histG.width * sc, histG.height * sc);
  noFill(); stroke(...WIRE); rect(hx, hy, histG.width * sc, histG.height * sc);
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() { for (let b of cellBoxes) if (mouseX > b[0] && mouseX < b[0] + b[2] && mouseY > b[1] && mouseY < b[1] + b[3]) sel = [b[4], b[5]]; }
function cycle(arr, v) { let i = arr.indexOf(v); return arr[(i + 1) % arr.length]; }
function editRule(what) {
  if (!sel) return;
  let k = sel[0] + sel[1], r = mach.rules[k] || [sel[1], 'R', sel[0]];
  if (what === 'w') r[0] = cycle(mach.syms, r[0]);
  if (what === 'm') r[1] = cycle(['L', 'R'], r[1]);
  if (what === 'n') r[2] = cycle(mach.states.concat(prog === 2 ? ['Y', 'N'] : ['H']), r[2]);
  mach.rules[k] = r; resetRun();
}
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { seedRng(+key * 11); loadProgram(+key - 1, PROGRAMS[+key - 1].inputs()); }
  if (key === ' ') { doStep(); redrawHist(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW) speed = Math.min(8, speed + 1);
  if (key === DOWN_ARROW) speed = Math.max(1, speed - 1);
  if (key === 'r' || key === 'R') resetRun();
  if (key === 'i' || key === 'I') { inputStr = PROGRAMS[prog].inputs(); resetRun(); }
  if (key === 'w' || key === 'W') editRule('w');
  if (key === 'm' || key === 'M') editRule('m');
  if (key === 'n' || key === 'N') editRule('n');
  if (key === 'Backspace' && sel) { delete mach.rules[sel[0] + sel[1]]; resetRun(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let m0 = makeMachine(0), ok0 = true, maxSteps = 0;
  for (let n = 0; n <= 255; n++) { let c = tmRun(m0, n.toString(2), 1000); maxSteps = Math.max(maxSteps, c.steps); if (!c.halted || tmContent(c, '_') !== (n + 1).toString(2)) ok0 = false; }
  check('2 進数に 1 を足す：n = 0〜255 で結果のテープ = n + 1（最大 ' + maxSteps + ' 手で止まる）', ok0);
  let m1 = makeMachine(1), ok1 = true;
  for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) { let c = tmRun(m1, '1'.repeat(a) + '+' + '1'.repeat(b), 1000); if (!c.halted || tmContent(c, '_') !== '1'.repeat(a + b)) ok1 = false; }
  check('単項の足し算：a, b = 0〜8 の 81 通りで 1 の数 = a + b', ok1);
  let m2 = makeMachine(2), ok2 = true;
  for (let s of allStrings(['a', 'b'], 8)) { let c = tmRun(m2, s, 5000); if (!c.halted || (c.q === 'Y') !== (s === [...s].reverse().join(''))) ok2 = false; }
  check('回文の判定：長さ 8 までの全部 511 個で、Y で止まる = 回文', ok2);
  let c = tmRun(m0, '1011', 100), steps = c.steps; tmStep(m0, c);
  check('1011 + 1 = 1100 は 8 手で止まり、止まったあとは 1 手も進まない', tmContent(c, '_') === '1100' && steps === 8 && c.steps === 8);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 「2 進数に 1 を足す」で 1111 を入れると、繰上が左へ走っていく様子を時空図で見よう
// 2. 状態表を 1 マスこわして（W や N）、どこで答えがまちがうか確かめよう。R で最初から
// 3. 「2 進数から 1 を引く」機械を作ろう：繰上の代わりに繰下（0 を 1 にして左へ、1 を 0 にして止まる）
// 4. 単項の足し算を「かけ算」にするには状態がたくさん要る。どんな手順なら作れそう？
// 5. 止まらない機械も作れる（右へ右へ進み続ける）。止まるかどうかを前もって判定できるか → 11 の忙しいビーバーと停止問題

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
// ---- 有限オートマトンの道具
// DFA = { n: 状態の数, alpha: ['a','b'], tr: [{a: 1, b: 0}, ...], start: 0, acc: [true/false...] }
//   tr[q][c] がない = 「行き止まり」（そこで不受理が決まる）
// NFA = { n, alpha, tr: [{a: [1, 2], '': [3]}, ...], start, acc }  ('' が ε 遷移)
function dfaNext(d, q, c) { if (q < 0 || !d.tr[q]) return -1; let t = d.tr[q][c]; return t === undefined || t < 0 || t >= d.n ? -1 : t; }
function dfaTrace(d, s) {               // たどった状態の列（-1 = 行き止まり）
  let q = d.start, out = [q];
  for (let c of s) { q = dfaNext(d, q, c); out.push(q); }
  return out;
}
function dfaAccepts(d, s) { let q = d.start; for (let c of s) { q = dfaNext(d, q, c); if (q < 0) return false; } return q >= 0 && !!d.acc[q]; }
function copyDfa(d) { return { n: d.n, alpha: d.alpha.slice(), tr: d.tr.map((m) => Object.assign({}, m)), start: d.start, acc: d.acc.slice() }; }
function completeDfa(d) {               // 行き止まりを「ごみ箱」状態にまとめて、全部の遷移をそろえる
  let e = copyDfa(d), sink = -1;
  for (let q = 0; q < e.n; q++) for (let c of e.alpha) if (dfaNext(e, q, c) < 0) {
    if (sink < 0) { sink = e.n++; e.tr.push({}); e.acc.push(false); for (let cc of e.alpha) e.tr[sink][cc] = sink; }
    e.tr[q][c] = sink;
  }
  e.sink = sink;
  return e;
}
function complementDfa(d) { let e = completeDfa(d); e.acc = e.acc.map((v) => !v); return e; }   // 受理と不受理を入れかえる
function productDfa(A, B, op) {         // 積の構成：状態 = (A の状態, B の状態) の組。たどれる組だけ作る
  let a = completeDfa(A), b = completeDfa(B), alpha = a.alpha.filter((c) => b.alpha.indexOf(c) >= 0);
  let id = new Map(), pairs = [], tr = [], queue = [];
  let get = (p, q) => { let k = p * 1000 + q; if (!id.has(k)) { id.set(k, pairs.length); pairs.push([p, q]); tr.push({}); queue.push(k); } return id.get(k); };
  get(a.start, b.start);
  for (let h = 0; h < queue.length; h++) {
    let [p, q] = pairs[h];
    for (let c of alpha) tr[h][c] = get(a.tr[p][c], b.tr[q][c]);
  }
  let f = { and: (x, y) => x && y, or: (x, y) => x || y, diff: (x, y) => x && !y, xor: (x, y) => x !== y }[op];
  return { n: pairs.length, alpha, tr, start: 0, acc: pairs.map(([p, q]) => f(!!a.acc[p], !!b.acc[q])), pairs, left: a, right: b };
}
function dfaShortestAccepted(d) {       // 幅優先探索：受理状態までの一番短い文字列（なければ null = 空言語）
  let prev = new Array(d.n).fill(null), seen = new Array(d.n).fill(false), queue = [d.start];
  seen[d.start] = true;
  for (let h = 0; h < queue.length; h++) {
    let q = queue[h];
    if (d.acc[q]) { let s = ''; while (prev[q]) { s = prev[q][1] + s; q = prev[q][0]; } return s; }
    for (let c of d.alpha) { let t = dfaNext(d, q, c); if (t >= 0 && !seen[t]) { seen[t] = true; prev[t] = [q, c]; queue.push(t); } }
  }
  return null;
}
function dfaEquivalent(A, B) { return dfaShortestAccepted(productDfa(A, B, 'xor')); }   // null なら同じ言語、そうでなければ反例
function reachableDfa(d) {              // スタートからたどれない状態を消す
  let order = [d.start], idx = new Map([[d.start, 0]]);
  for (let h = 0; h < order.length; h++) for (let c of d.alpha) { let t = dfaNext(d, order[h], c); if (t >= 0 && !idx.has(t)) { idx.set(t, order.length); order.push(t); } }
  let tr = order.map((q) => { let m = {}; for (let c of d.alpha) { let t = dfaNext(d, q, c); if (t >= 0) m[c] = idx.get(t); } return m; });
  return { n: order.length, alpha: d.alpha.slice(), tr, start: 0, acc: order.map((q) => !!d.acc[q]), old: order };
}
function minimizeMoore(d) {             // ムーアの分割の精密化：「区別できない状態」を同じブロックに
  let e = reachableDfa(completeDfa(d));
  let blk = e.acc.map((v) => (v ? 1 : 0)), rounds = [];
  let renum = (keys) => { let m = new Map(); return keys.map((k) => { if (!m.has(k)) m.set(k, m.size); return m.get(k); }); };
  blk = renum(blk); rounds.push(blk.slice());
  for (;;) {
    let keys = blk.map((b, q) => b + '|' + e.alpha.map((c) => blk[e.tr[q][c]]).join(','));
    let nb = renum(keys), cnt = new Set(nb).size;
    if (cnt === new Set(blk).size) break;
    blk = nb; rounds.push(blk.slice());
  }
  let k = new Set(blk).size, tr = [], acc = [];
  for (let b = 0; b < k; b++) { tr.push({}); acc.push(false); }
  for (let q = 0; q < e.n; q++) { acc[blk[q]] = !!e.acc[q]; for (let c of e.alpha) tr[blk[q]][c] = blk[e.tr[q][c]]; }
  return { work: e, rounds, blockOf: blk, min: { n: k, alpha: e.alpha.slice(), tr, start: blk[e.start], acc } };
}
function allStrings(alpha, maxLen) {    // 長さ 0〜maxLen の文字列を全部
  let out = [''], layer = [''];
  for (let L = 1; L <= maxLen; L++) { let nx = []; for (let s of layer) for (let c of alpha) nx.push(s + c); out.push(...nx); layer = nx; }
  return out;
}
function epsClosure(nfa, states) {      // ε 遷移だけでたどれる状態を全部足す
  let seen = new Set(states), todo = [...states];
  while (todo.length) { let q = todo.pop(); for (let t of (nfa.tr[q] && nfa.tr[q]['']) || []) if (!seen.has(t)) { seen.add(t); todo.push(t); } }
  return [...seen].sort((x, y) => x - y);
}
function nfaMove(nfa, set, c) { let out = new Set(); for (let q of set) for (let t of (nfa.tr[q] && nfa.tr[q][c]) || []) out.add(t); return epsClosure(nfa, [...out]); }
function nfaTrace(nfa, s) { let cur = epsClosure(nfa, [nfa.start]), out = [cur]; for (let c of s) { cur = nfaMove(nfa, cur, c); out.push(cur); } return out; }
function nfaAccepts(nfa, s) { let cur = epsClosure(nfa, [nfa.start]); for (let c of s) { cur = nfaMove(nfa, cur, c); if (!cur.length) return false; } return cur.some((q) => nfa.acc[q]); }
function subsetConstruct(nfa, maxStates) {   // 部分集合構成：DFA の 1 状態 = NFA の状態の集合（たどれる集合だけ）
  let first = epsClosure(nfa, [nfa.start]), sets = [first], id = new Map([[first.join(','), 0]]), rows = [], tr = [];
  for (let h = 0; h < sets.length && sets.length <= (maxStates || 4096); h++) {
    let row = { from: h, to: {} }; tr.push({});
    for (let c of nfa.alpha) {
      let t = nfaMove(nfa, sets[h], c), k = t.join(',');
      if (!id.has(k)) { id.set(k, sets.length); sets.push(t); }
      row.to[c] = id.get(k); tr[h][c] = id.get(k);
    }
    rows.push(row);
  }
  return { sets, rows, dfa: { n: sets.length, alpha: nfa.alpha.slice(), tr, start: 0, acc: sets.map((st) => st.some((q) => nfa.acc[q])) } };
}
function setName(st) { return '{' + st.join(',') + '}'; }
// ---- チューリング機械の道具
// 機械 = { states: ['A','B'], syms: ['0','1'], blank: '0', rules: { A0: ['1', 'R', 'B'], ... }, start: 'A', halt: 'H' }
//   規則がないときも止まる（「止まる」= 規則がない or 状態 H）
function tmStart(m, s, head) {
  let tape = new Map(); for (let i = 0; i < s.length; i++) if (s[i] !== m.blank) tape.set(i, s[i]);
  return { tape, head: head || 0, q: m.start, steps: 0, halted: false, lo: 0, hi: Math.max(0, s.length - 1) };
}
function tmRead(cfg, i, blank) { let v = cfg.tape.get(i); return v === undefined ? blank : v; }
function tmStep(m, cfg) {               // 1 手：読む → 書く → 動く → 状態を変える
  if (cfg.halted) return false;
  let r = m.rules[cfg.q + tmRead(cfg, cfg.head, m.blank)];
  if (!r || cfg.q === m.halt) { cfg.halted = true; return false; }
  if (r[0] === m.blank) cfg.tape.delete(cfg.head); else cfg.tape.set(cfg.head, r[0]);
  cfg.head += r[1] === 'R' ? 1 : r[1] === 'L' ? -1 : 0;
  cfg.q = r[2]; cfg.steps++;
  cfg.lo = Math.min(cfg.lo, cfg.head); cfg.hi = Math.max(cfg.hi, cfg.head);
  if (cfg.q === m.halt) cfg.halted = true;
  return true;
}
function tmRun(m, s, maxSteps, head) { let cfg = tmStart(m, s, head); while (!cfg.halted && cfg.steps < maxSteps) tmStep(m, cfg); return cfg; }
function tmTape(cfg, blank, lo, hi) { let s = ''; for (let i = lo; i <= hi; i++) s += tmRead(cfg, i, blank); return s; }
function tmContent(cfg, blank) {        // 空白でない部分だけの文字列
  let ks = [...cfg.tape.keys()]; if (!ks.length) return '';
  return tmTape(cfg, blank, Math.min(...ks), Math.max(...ks));
}
function tmCount(cfg, sym) { let n = 0; for (let v of cfg.tape.values()) if (v === sym) n++; return n; }
function tmFromCode(code) {             // 'A0:1RB A1:1LB B0:1LA B1:1RH' のような短い書き方から
  let rules = {}, states = new Set();
  for (let part of code.trim().split(/\s+/)) { let [k, v] = part.split(':'); rules[k] = [v[0], v[1], v.slice(2)]; states.add(k.slice(0, -1)); }
  return { states: [...states], syms: ['0', '1'], blank: '0', rules, start: 'A', halt: 'H' };
}
function drawTape(cfg, blank, x, y, cw, ncell, center, cols) {   // テープのマスとヘッド
  let lo = Math.round(center - ncell / 2);
  textAlign(CENTER, CENTER); textSize(Math.min(22, cw * 0.6));
  for (let k = 0; k < ncell; k++) {
    let i = lo + k, v = tmRead(cfg, i, blank), cx = x + k * cw;
    stroke(...WIRE); strokeWeight(1); fill(...((cols && cols[v]) || PANEL)); rect(cx, y, cw - 2, cw * 1.2, 4);
    noStroke(); fill(...INK); text(v === blank ? '' : v, cx + cw / 2 - 1, y + cw * 0.6);
    if (i === cfg.head) { fill(...AMBER); triangle(cx + cw / 2 - 1, y - 4, cx + cw / 2 - 10, y - 18, cx + cw / 2 + 8, y - 18); noFill(); stroke(...AMBER); strokeWeight(3); rect(cx, y, cw - 2, cw * 1.2, 4); noStroke(); }
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
