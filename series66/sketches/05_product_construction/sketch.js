// ============================================
// 05 言語の演算 ─ 2 つの DFA を同時に動かす「積の構成」
// 状態 = (A の状態, B の状態) の組。1 文字読むと両方が同時に進む。受理の決め方だけを変えれば
// 共通部分（両方受理）・和集合（どちらか）・差（A だけ）・対称差（片方だけ）ができる。補集合は受理を反転（先に行き止まりを埋める）。
// 受理状態まで幅優先探索でたどれなければ「空言語」。たどれたら、一番短い受理される文字列が見つかる
// ← → A を選ぶ / ↑↓ B を選ぶ / O 演算を変える / a b 文字列に足す / Backspace 消す / C 文字列を空に
// ============================================

const OPS = [['and', 'A ∩ B（共通部分：両方受理）'], ['or', 'A ∪ B（和集合：どちらか受理）'], ['diff', 'A − B（A だけ受理）'], ['xor', 'A △ B（片方だけ受理）'], ['not', '¬A（A の補集合）']];
let LIB = [], ia = 0, ib = 1, op = 0, word = 'abba', prod = null, posA, posB, posP, witness = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  LIB = buildLibrary();
  selfTest();
  rebuild();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); rebuild(); }
// ★ 部品の DFA（記号 a, b）。5 番は「行き止まり」がある（b から始まると不受理）
function buildLibrary() {
  let d = (name, tr, acc) => ({ name, n: tr.length, alpha: ['a', 'b'], tr, start: 0, acc });
  return [
    d('a の数が偶数', [{ a: 1, b: 0 }, { a: 0, b: 1 }], [true, false]),
    d('b の数が 3 の倍数', [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 0 }], [true, false, false]),
    d('ab を含む', [{ a: 1, b: 0 }, { a: 1, b: 2 }, { a: 2, b: 2 }], [false, false, true]),
    d('b で終わる', [{ a: 0, b: 1 }, { a: 0, b: 1 }], [false, true]),
    d('長さが偶数', [{ a: 1, b: 1 }, { a: 0, b: 0 }], [true, false]),
    d('a で始まる', [{ a: 1 }, { a: 1, b: 1 }], [false, true]),
  ];
}
function preds() { return [(s) => s.split('a').length % 2 === 1, (s) => (s.split('b').length - 1) % 3 === 0, (s) => s.indexOf('ab') >= 0, (s) => s.endsWith('b'), (s) => s.length % 2 === 0, (s) => s[0] === 'a']; }
function makeResult(A, B, o) { return o === 'not' ? complementDfa(A) : productDfa(A, B, o); }
function rebuild() {
  let A = LIB[ia], B = LIB[ib], o = OPS[op][0];
  prod = makeResult(A, B, o);
  witness = dfaShortestAccepted(prod);
  let lw = width * 0.3;
  posA = A.n === 2 ? [{ x: 90, y: height * 0.3 }, { x: lw - 40, y: height * 0.3 }] : circleLayout(A.n, lw / 2 + 30, height * 0.3, 70, Math.PI);
  posB = B.n === 2 ? [{ x: 90, y: height * 0.7 }, { x: lw - 40, y: height * 0.7 }] : circleLayout(B.n, lw / 2 + 30, height * 0.7, 70, Math.PI);
  let gx = width * 0.42, gy = 190, gw = width * 0.52, gh = height - 450;
  if (o === 'not') posP = prod.n <= 2 ? [{ x: gx + 80, y: gy + gh / 2 }, { x: gx + gw - 80, y: gy + gh / 2 }] : circleLayout(prod.n, gx + gw / 2, gy + gh / 2, Math.min(gw, gh) * 0.35, Math.PI);
  else { let na = prod.left.n, nb = prod.right.n;          // 組 (p, q) を格子の (列 p, 行 q) に置く
    posP = prod.pairs.map(([p, q]) => ({ x: gx + 40 + (na > 1 ? (p / (na - 1)) * (gw - 80) : gw / 2), y: gy + 20 + (nb > 1 ? (q / (nb - 1)) * (gh - 40) : gh / 2), loop: q === 0 ? -Math.PI / 2 : Math.PI / 2 })); }
}

function draw() {
  background(...BG);
  hudTitle('言語の演算と積の構成：' + OPS[op][1], '← → A を選ぶ　↑↓ B を選ぶ　O 演算を変える　a b 文字列に足す　Backspace 消す　C 空に');
  let A = LIB[ia], B = LIB[ib], o = OPS[op][0];
  let ta = dfaTrace(A, word), tb = dfaTrace(B, word), tp = dfaTrace(prod, word);
  let fa = ta[ta.length - 1], fb = tb[tb.length - 1], fp = tp[tp.length - 1];
  // ---- A と B
  let one = (m, pos, tr, f, lab, y, col) => {
    noStroke(); fill(...col); textSize(16); textAlign(LEFT, BASELINE); text(lab + '：' + m.name, 30, y);
    let hi = {}; if (f >= 0) hi[f] = col;
    drawMachine(m, pos, { r: 20, hi, names: m.acc.map((_, i) => lab.toLowerCase() + i), nameSize: 13 });
    textAlign(LEFT, BASELINE); fill(...(f >= 0 && m.acc[f] ? LIME : ROSE)); textSize(14);
    text('「' + word + '」→ ' + (f >= 0 && m.acc[f] ? '受理' : f < 0 ? '行き止まり（不受理）' : '不受理'), 30, y + 22);
  };
  one(A, posA, ta, fa, 'A', 100, AMBER);
  if (o !== 'not') one(B, posB, tb, fb, 'B', height * 0.5 + 20, CYAN);
  // ---- 積の機械
  let gx = width * 0.42;
  noStroke(); fill(...INK); textSize(16); textAlign(LEFT, BASELINE);
  text((o === 'not' ? '補集合（行き止まりを「ごみ箱」状態で埋めてから受理を反転）：' : '積の機械（たどれる組だけ）：') + prod.n + ' 状態', gx, 100);
  if (o !== 'not') { fill(...DIMC); textSize(13); text('横 = A の状態、縦 = B の状態。' + (prod.left.n > A.n ? 'A の右端 = ごみ箱。' : '') + (prod.right.n > B.n ? 'B の下端 = ごみ箱。' : ''), gx, 122); }
  let hi = {}; if (fp >= 0) hi[fp] = VIOLET;
  let names = o === 'not' ? prod.acc.map((_, i) => (i < A.n ? 'a' + i : '×')) : prod.pairs.map(([p, q]) => (p < A.n ? 'a' + p : '×') + (q < B.n ? 'b' + q : '×'));
  drawMachine(prod, posP, { r: 24, hi, names, nameSize: 11, labelSize: 13,
    edgeHi: (e) => { for (let i = 1; i < tp.length; i++) if (tp[i - 1] === e.from && tp[i] === e.to) return [200, 170, 255]; return null; } });
  // ---- 結果
  let ry = height - 150;
  textAlign(LEFT, BASELINE); fill(...INK); textSize(17);
  text('「' + word + '」は ' + OPS[op][1].split('（')[0] + ' で ' + (prod.acc[fp] ? '受理' : '不受理'), gx, ry);
  fill(...(witness === null ? ROSE : LIME)); textSize(16);
  text(witness === null ? '空言語：受理状態にたどり着けない（どんな文字列も受理しない）' : '空ではない：一番短い受理される文字列「' + (witness === '' ? 'ε' : witness) + '」', gx, ry + 30);
  fill(...DIMC); textSize(13);
  text('受理状態 = 二重丸。たどった道 = 紫。文字列を変えると、3 つの機械が同時に 1 文字ずつ進む', gx, ry + 56);
  // 入力
  for (let i = 0; i < word.length; i++) { stroke(...WIRE); fill(...PANEL); rect(gx + i * 30, ry + 70, 26, 30, 4); noStroke(); fill(...INK); textAlign(CENTER, CENTER); textSize(16); text(word[i], gx + i * 30 + 13, ry + 85); }
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === 'a' || key === 'b') word = typeInto(word, key, 'ab', 16);
  if (key === 'Backspace') word = word.slice(0, -1);
  if (key === 'c' || key === 'C') word = '';
  if (key === LEFT_ARROW) ia = (ia + LIB.length - 1) % LIB.length;
  if (key === RIGHT_ARROW) ia = (ia + 1) % LIB.length;
  if (key === UP_ARROW) ib = (ib + LIB.length - 1) % LIB.length;
  if (key === DOWN_ARROW) ib = (ib + 1) % LIB.length;
  if (key === 'o' || key === 'O') op = (op + 1) % OPS.length;
  rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let lib = buildLibrary(), pr = preds(), words = allStrings(['a', 'b'], 8), okP = true, okLib = true, okC = true, okE = true;
  lib.forEach((d, i) => { if (!words.every((s) => dfaAccepts(d, s) === pr[i](s))) okLib = false; });
  check('部品の DFA 6 個が、それぞれの説明どおりの言語（長さ 8 までの全部 511 個）', okLib);
  let f = { and: (x, y) => x && y, or: (x, y) => x || y, diff: (x, y) => x && !y, xor: (x, y) => x !== y };
  for (let i = 0; i < lib.length; i++) for (let j = 0; j < lib.length; j++) for (let o in f) {
    let p = productDfa(lib[i], lib[j], o);
    for (let s of words) if (dfaAccepts(p, s) !== f[o](dfaAccepts(lib[i], s), dfaAccepts(lib[j], s))) { okP = false; break; }
  }
  check('積の構成：6 × 6 の組 × 4 演算（∩ ∪ − △）で、受理 = A と B の答えの組み合わせ（長さ 8 まで全部）', okP);
  for (let d of lib) { let c = complementDfa(d); if (!words.every((s) => dfaAccepts(c, s) === !dfaAccepts(d, s))) okC = false; }
  let cs = completeDfa(lib[5]);
  check('補集合：受理と不受理がちょうど入れかわる。「a で始まる」は行き止まりを埋めて 2 → 3 状態', okC && cs.n === 3 && words.every((s) => dfaAccepts(cs, s) === dfaAccepts(lib[5], s)));
  for (let d of lib) { if (dfaShortestAccepted(productDfa(d, complementDfa(d), 'and')) !== null) okE = false; if (dfaShortestAccepted(productDfa(d, complementDfa(d), 'or')) !== '') okE = false; }
  check('空言語の判定：A ∩ ¬A はいつも空、A ∪ ¬A の一番短い文字列は ε', okE);
  let p6 = productDfa(lib[0], lib[1], 'and'), wt = dfaShortestAccepted(productDfa(lib[2], lib[3], 'and'));
  check('「a が偶数 かつ b が 3 の倍数」は 2 × 3 = 6 状態、「ab を含む かつ b で終わる」の一番短い例は「ab」', p6.n === 6 && wt === 'ab');
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. A =「a の数が偶数」、B =「b の数が 3 の倍数」で ∩ ∪ − △ を順に。状態は同じ 6 個で、二重丸だけが変わることを確かめよう
// 2. A =「ab を含む」、B =「b で終わる」の差 A − B の一番短い例は？ 手で考えてから確かめよう
// 3. 「a で始まる」の補集合で、行き止まりが「ごみ箱」状態（×）になって受理に変わるのを見よう
// 4. 01 の DFA 設計の課題「a が偶数 かつ b が奇数」を、この積で作ってから 01 で描き写そう
// 5. 2 つの DFA が同じ言語かどうかは、対称差 △ が空かどうかでわかる（03 の最小化の答え合わせと同じ）

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
