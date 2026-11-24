// ============================================
// 03 DFA の最小化 ─ 同じ言語を受理する DFA の中で、状態がいちばん少ないものを作る
// はじめは「受理」と「不受理」の 2 グループ。同じグループでも、同じ記号で行く先のグループがちがえば分ける。
// 分けられなくなったら、同じグループの状態は区別できない → 1 つにまとめる（ムーアの分割の精密化）。
// 2 つの DFA が同じ言語かは、積の機械を幅優先探索して「片方だけ受理」に着けるかで判定（着けたらそれが反例）
// スペース 1 回分ける / A 最後まで / P 例を変える / R 新しいでたらめな DFA / M 最小 DFA の受理を 1 つ反転（反例さがし）
// ============================================

const N_RANDOM = 8;                     // ★ でたらめな DFA の状態の数
const BLOCK_COLS = [[255, 170, 50], [70, 215, 230], [140, 230, 120], [255, 100, 120], [185, 150, 255], [240, 230, 120], [255, 140, 200], [120, 170, 255], [200, 200, 200], [255, 120, 60]];
let preset = 0, seed = 3, orig, origPos, res, minPos, shownRound = 0, mutated = false, testDfa, counter = undefined, presetName = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  buildPreset();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); buildPreset(); }
// ★ 例 1：2 進数を 6 で割った余りを覚える DFA（受理 = 余りが 0 か 3 = 3 の倍数）。本当は 3 状態で足りる
function mod6Dfa() { let d = { n: 6, alpha: ['0', '1'], tr: [], start: 0, acc: [] }; for (let r = 0; r < 6; r++) { d.tr.push({ '0': (2 * r) % 6, '1': (2 * r + 1) % 6 }); d.acc.push(r % 3 === 0); } return d; }
// ★ 例 2：最後の 3 文字を全部覚える DFA（8 状態）。受理 = 最後が ab。本当は 3 状態で足りる
function window3Dfa() {
  let names = allStrings(['a', 'b'], 3).filter((s) => s.length === 3), id = (s) => names.indexOf(s);
  let d = { n: 8, alpha: ['a', 'b'], tr: names.map((s) => ({ a: id(s.slice(1) + 'a'), b: id(s.slice(1) + 'b') })), start: id('bbb'), acc: names.map((s) => s.endsWith('ab')), names };
  return d;
}
function randomDfa(n, sd) {             // でたらめな DFA（全部の遷移あり）
  seedRng(sd);
  let d = { n, alpha: ['a', 'b'], tr: [], start: 0, acc: [] };
  for (let q = 0; q < n; q++) { d.tr.push({ a: rndInt(0, n - 1), b: rndInt(0, n - 1) }); d.acc.push(rnd() < 0.4); }
  return d;
}
function buildPreset() {
  if (preset === 0) { orig = mod6Dfa(); presetName = '2 進数を 6 で割った余り（受理 = 3 の倍数）'; }
  if (preset === 1) { orig = window3Dfa(); presetName = '最後の 3 文字を覚える（受理 = ab で終わる）'; }
  if (preset === 2) { orig = randomDfa(N_RANDOM, seed); presetName = 'でたらめな DFA（種 ' + seed + '）'; }
  res = minimizeMoore(orig);
  origPos = circleLayout(orig.n, width * 0.24, height * 0.36, Math.min(width * 0.17, height * 0.2), Math.PI);
  minPos = circleLayout(res.min.n, width * 0.76, height * 0.36, Math.min(width * 0.12, height * 0.17), Math.PI);
  shownRound = 0; mutated = false; refreshTest();
}
function refreshTest() {               // 比べる相手：最小 DFA（M なら受理を 1 つ反転したもの）
  testDfa = copyDfa(res.min);
  if (mutated) testDfa.acc[testDfa.n - 1] = !testDfa.acc[testDfa.n - 1];
  counter = dfaEquivalent(orig, testDfa);
}
function blockOfOrig(q, k) {            // 元の状態 q の、k 回目の分割でのグループ（たどれない状態は -1）
  let i = res.work.old.indexOf(q); return i < 0 ? -1 : res.rounds[k][i];
}

function draw() {
  background(...BG);
  hudTitle('DFA の最小化：' + presetName, 'スペース 1 回分ける　A 最後まで　P 例を変える　R 新しいでたらめな DFA　M 最小 DFA を 1 か所こわす');
  let k = Math.min(shownRound, res.rounds.length - 1), done = shownRound >= res.rounds.length - 1;
  // ---- 元の DFA（色 = いまのグループ）
  let hi = {}; for (let q = 0; q < orig.n; q++) { let b = blockOfOrig(q, k); hi[q] = b < 0 ? [70, 80, 75] : BLOCK_COLS[b % BLOCK_COLS.length]; }
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('元の DFA：' + orig.n + ' 状態（色 = グループ）', 30, 96);
  drawMachine(orig, origPos, { r: 22, hi, names: orig.names, nameSize: orig.names ? 11 : 14, labelSize: 13, edgeCol: [70, 110, 90] });
  // ---- 最小の DFA
  textAlign(LEFT, BASELINE); fill(...INK); textSize(15);
  text(done ? '最小の DFA：' + res.min.n + ' 状態' + (res.work.sink >= 0 ? '（ごみ箱を含む）' : '') : '最小の DFA：分割が終わると出てくる', width * 0.56, 96);
  if (done) {
    let mh = {}; for (let b = 0; b < res.min.n; b++) mh[b] = BLOCK_COLS[b % BLOCK_COLS.length];
    if (mutated) mh[testDfa.n - 1] = ROSE;
    drawMachine(testDfa, minPos, { r: 24, hi: mh, names: testDfa.acc.map((_, b) => 'G' + b), labelSize: 13 });
  }
  // ---- 分割の表（行 = 回、列 = 元の状態）
  textAlign(LEFT, BASELINE);
  let ty = height * 0.66, cw = Math.min(64, (width - 260) / orig.n), rh = 26;
  fill(...INK); textSize(15); text('分割の精密化（行 = ' + (k + 1) + ' / ' + res.rounds.length + ' 回目まで、列 = 元の状態、数字 = グループ）', 30, ty - 12);
  for (let q = 0; q < orig.n; q++) { fill(...DIMC); textSize(13); textAlign(CENTER, BASELINE); text(orig.names ? orig.names[q] : 'q' + q, 200 + q * cw + cw / 2, ty + 8); }
  for (let r = 0; r <= k; r++) {
    let y = ty + 16 + r * rh;
    textAlign(LEFT, CENTER); fill(...DIMC); textSize(13); text(r === 0 ? '受理 / 不受理' : r + ' 回目', 30, y + rh / 2);
    for (let q = 0; q < orig.n; q++) {
      let b = blockOfOrig(q, r), col = b < 0 ? [60, 66, 62] : BLOCK_COLS[b % BLOCK_COLS.length];
      noStroke(); fill(...col, 170); rect(200 + q * cw + 2, y + 2, cw - 4, rh - 4, 4);
      fill(10); textAlign(CENTER, CENTER); text(b < 0 ? '−' : b, 200 + q * cw + cw / 2, y + rh / 2);
    }
  }
  textAlign(LEFT, BASELINE); fill(...DIMC); textSize(13);
  let unr = orig.n - res.work.old.filter((q) => q < orig.n).length;
  text((unr ? 'たどれない状態 ' + unr + ' 個は先に消す（−）。' : '') + '同じグループの 2 状態は、どの記号でも行き先が同じグループのときだけ同じまま', 30, ty + 30 + (k + 1) * rh);
  // ---- 同じ言語か（積の幅優先探索）
  let ex = width * 0.56, ey = height * 0.66;
  fill(...INK); textSize(16); text('元の DFA と右の DFA は同じ言語？（積の BFS）', ex, ey);
  if (!done) { fill(...DIMC); text('分割が終わってから', ex, ey + 30); }
  else if (counter === null) { fill(...LIME); textSize(22); text('同じ言語 ✓（片方だけ受理する組にたどり着けない）', ex, ey + 36); }
  else { fill(...ROSE); textSize(20); text('ちがう ✗ 反例「' + (counter === '' ? 'ε' : counter) + '」', ex, ey + 36);
    fill(...DIMC); textSize(14); text('元：' + (dfaAccepts(orig, counter) ? '受理' : '不受理') + '　右：' + (dfaAccepts(testDfa, counter) ? '受理' : '不受理') + '（一番短い反例）', ex, ey + 62); }
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === ' ') shownRound = Math.min(res.rounds.length - 1, shownRound + 1);
  if (key === 'a' || key === 'A') shownRound = res.rounds.length - 1;
  if (key === 'p' || key === 'P') { preset = (preset + 1) % 3; buildPreset(); }
  if (key === 'r' || key === 'R') { preset = 2; seed++; buildPreset(); }
  if (key === 'm' || key === 'M') { mutated = !mutated; refreshTest(); }
  return false;
}

// ---- 自己テスト
// 区別できる状態の数を総当たりで数える：状態から読ませる「続きの文字列」（長さ n まで）の受理の並びがちがえば区別できる
function classesByBruteForce(d) {
  let e = reachableDfa(completeDfa(d)), tails = allStrings(d.alpha, e.n), sig = new Set();
  for (let q = 0; q < e.n; q++) sig.add(tails.map((t) => { let p = q; for (let c of t) p = e.tr[p][c]; return e.acc[p] ? 1 : 0; }).join(''));
  return sig.size;
}
function selfTest() {
  selfTestResults = [];
  let r1 = minimizeMoore(mod6Dfa());
  check('6 で割った余りの DFA（6 状態）→ 最小 3 状態、積の BFS で元と同じ言語', r1.min.n === 3 && dfaEquivalent(mod6Dfa(), r1.min) === null);
  let r2 = minimizeMoore(window3Dfa()), okW = allStrings(['a', 'b'], 10).every((s) => dfaAccepts(r2.min, s) === s.endsWith('ab'));
  check('最後の 3 文字の DFA（8 状態）→ 最小 3 状態、長さ 10 まで「ab で終わる」と一致', r2.min.n === 3 && okW);
  let okEq = true, okSize = true, okIdem = true, okEx = true;
  for (let sd = 100; sd < 150; sd++) {
    let d = randomDfa(N_RANDOM, sd), r = minimizeMoore(d);
    if (dfaEquivalent(d, r.min) !== null) okEq = false;
    if (!allStrings(d.alpha, 8).every((s) => dfaAccepts(d, s) === dfaAccepts(r.min, s))) okEx = false;
    if (r.min.n !== classesByBruteForce(d)) okSize = false;
    if (minimizeMoore(r.min).min.n !== r.min.n) okIdem = false;
  }
  check('でたらめな DFA 50 個：最小 DFA は元と同じ言語（積の BFS ＋ 長さ 8 までの総当たり）', okEq && okEx);
  check('最小の状態数 = 続きの文字列で区別できる状態の数（総当たりで数えた値）', okSize);
  check('最小 DFA をもう一度最小化しても状態は減らない', okIdem);
  let bad = copyDfa(r1.min); bad.acc[1] = !bad.acc[1];
  let w = dfaEquivalent(mod6Dfa(), bad);
  check('受理を 1 つ反転すると反例「' + w + '」が見つかり、本当に片方だけが受理する', w !== null && dfaAccepts(mod6Dfa(), w) !== dfaAccepts(bad, w));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 例 1 で、1 回目の分割で余り 0 と 3 が同じグループに残るのはなぜ？（0 と 3 から 1 文字読んだ行き先を比べよう）
// 2. R をくり返して、最小化しても状態が減らない DFA をさがそう。そのときの表はどうなっている？
// 3. M で 1 か所こわすと、反例が出てくる。反例の文字列を手でたどって、どこで答えが分かれるか確かめよう
// 4. 01 で作った DFA を mod6Dfa のように書き写して最小化してみよう。あなたの DFA は最小だった？
// 5. 最小 DFA は「名前のつけ方を除いて 1 つしかない」（マイヒル-ネローデの定理）。別の作り方の DFA でも同じ形になるか確かめよう

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
