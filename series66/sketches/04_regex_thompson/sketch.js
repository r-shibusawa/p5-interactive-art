// ============================================
// 04 正規表現から NFA へ ─ 正規表現を構文木にして、トンプソン構成で NFA を組み立てる
// 部品（1 文字・つなげる・または・くり返し）ごとに「入口 1 つ・出口 1 つ」の小さな NFA を作り、ε の矢印でつなぐ。
// テキストの一致は NFA の「玉の集合」で 1 文字ずつ調べる（一番左から、一番長い一致）。後もどり（バックトラック）しないので
// 意地悪な式でも時間は「テキストの長さ × 状態の数」まで。後もどりする方法とくらべる
// Tab = 正規表現 ⇔ テキストの切りかえ / 文字キー = いま選んでいる欄に入力（正規表現は 英数字 | * + ? ( )、テキストは英数字と空白）/
// Backspace 1 文字消す / ↑↓ お手本を変える（5 番目は意地悪な式）
// ============================================

const PRESETS = [                       // ★ お手本 [正規表現, テキスト]
  ['(a|b)*abb', 'babb ab aabb abab abba bbabb'],
  ['colou?r', 'color colour colouur colr'],
  ['go+gle', 'ggle gogle google goooogle'],
  ['(ab|c)+d?', 'abd cab ababcd xd ccc'],
  ['a?a?a?a?a?a?a?a?a?a?a?a?a?a?a?a?aaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaa'],
];
const BT_LIMIT = 3000000;               // ★ 後もどりする方法の手数の上限（これを超えたら打ち切り）
let pIdx = 0, pat = '', hay = '', editing = 'pat', parsed = null, ast = null, nfa = null, nfaPos = [], matches = [], nfaSteps = 0, bt = null, errMsg = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadPreset(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); rebuild(); }
function loadPreset(k) { pIdx = (k + PRESETS.length) % PRESETS.length; pat = PRESETS[pIdx][0]; hay = PRESETS[pIdx][1]; rebuild(); }
function rebuild() {
  parsed = parseRegex(pat);
  if (parsed.error) { errMsg = parsed.error + '（' + (parsed.at + 1) + ' 文字目）'; return; }   // まちがいがあれば前の機械のまま
  errMsg = ''; ast = parsed.ast; nfa = thompson(ast);
  nfaPos = layerLayout(nfa, width * 0.4 + 30, 170, width * 0.6 - 90, height * 0.42);
  let r = findAll(nfa, hay); matches = r.list; nfaSteps = r.steps;
  bt = hay.indexOf(' ') < 0 && hay.length <= 40 ? btFullMatch(ast, hay) : null;
}
// ★ NFA で一番左・一番長い一致を全部さがす（玉の集合を 1 文字ずつ動かす）
function findAll(m, s) {
  let list = [], steps = 0, i = 0;
  while (i <= s.length) {
    let cur = epsClosure(m, [m.start]), best = -1;
    if (cur.some((q) => m.acc[q])) best = i;
    for (let j = i; j < s.length && cur.length; j++) { cur = nfaMove(m, cur, s[j]); steps += cur.length + 1; if (cur.some((q) => m.acc[q])) best = j + 1; }
    if (best > i) { list.push([i, best]); i = best; } else i++;
  }
  return { list, steps };
}
// ★ くらべる相手：後もどりする方法（構文木を上から順に試し、だめなら 1 つ前の分かれ道へ戻る）
function btFullMatch(a, s) {
  let steps = 0;
  function m(node, i, k) {
    if (++steps > BT_LIMIT) throw 'limit';
    if (node.t === 'chr') return s[i] === node.c && k(i + 1);
    if (node.t === 'eps') return k(i);
    if (node.t === 'cat') return m(node.a, i, (j) => m(node.b, j, k));
    if (node.t === 'alt') return m(node.a, i, k) || m(node.b, i, k);
    if (node.t === 'opt') return m(node.a, i, k) || k(i);
    let loop = (j0) => m(node.a, j0, (j) => j > j0 && loop(j)) || k(j0);   // * と +（空回りはしない）
    return node.t === 'star' ? loop(i) : m(node.a, i, (j) => loop(j));
  }
  try { let ok = m(a, 0, (j) => j === s.length); return { ok, steps, cut: false }; } catch (e) { return { ok: null, steps, cut: true }; }
}

function draw() {
  background(...BG);
  hudTitle('正規表現から NFA へ（トンプソン構成）', 'Tab 正規表現 ⇔ テキスト　文字キー 入力　Backspace 消す　↑↓ お手本（' + (pIdx + 1) + ' / ' + PRESETS.length + '）　使える記号 | * + ? ( )');
  // ---- 入力欄
  [['pat', '正規表現', pat, 84], ['hay', 'テキスト', hay, 124]].forEach(([id, lab, s, y]) => {
    let on = editing === id;
    stroke(...(on ? AMBER : WIRE)); strokeWeight(on ? 2 : 1); fill(...PANEL); rect(120, y, width - 160, 32, 6);
    noStroke(); fill(...(on ? AMBER : DIMC)); textSize(15); textAlign(LEFT, CENTER); text(lab + (on ? ' ✎' : ''), 30, y + 16);
    fill(...INK); textSize(18); text(s + (on && frameCount % 60 < 30 ? '|' : ''), 132, y + 17);
  });
  if (errMsg) { fill(...ROSE); textSize(14); textAlign(LEFT, BASELINE); text('まちがい：' + errMsg + '（前の機械のまま）', 132, 178); }
  if (!ast) return;
  // ---- 構文木
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text('構文木：' + astString(ast), 30, 200);
  drawTree(ast, 30, 220, width * 0.38 - 30, height * 0.62 - 220);
  // ---- NFA
  textAlign(LEFT, BASELINE); fill(...INK); textSize(15);
  text('トンプソン構成の NFA：' + nfa.n + ' 状態（点線 = ε）', width * 0.4, 200);
  drawMachine(nfa, nfaPos, { r: nfa.n > 30 ? 9 : nfa.n > 16 ? 12 : 16, names: nfa.n > 30 ? nfa.acc.map(() => '') : null, labelSize: 13, nameSize: 10, edgeCol: [70, 110, 90] });
  // ---- テキストの一致
  let ty = height * 0.7, cw = Math.min(26, (width - 60) / Math.max(1, hay.length));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(15); text('一致（一番左・一番長い）：' + matches.length + ' か所　' + matches.map((m) => '「' + hay.slice(m[0], m[1]) + '」').join(' '), 30, ty - 14);
  for (let i = 0; i < hay.length; i++) {
    let inM = matches.find((m) => i >= m[0] && i < m[1]), x = 30 + i * cw;
    noStroke(); fill(...(inM ? (matches.indexOf(inM) % 2 ? CYAN : AMBER) : PANEL)); rect(x, ty, cw - 2, 34, 3);
    fill(...(inM ? [10, 20, 15] : INK)); textAlign(CENTER, CENTER); textSize(Math.min(18, cw * 0.8)); text(hay[i], x + cw / 2 - 1, ty + 17);
  }
  // ---- 手数のくらべっこ
  textAlign(LEFT, BASELINE); textSize(14); fill(...LIME);
  text('NFA（玉の集合）：一致さがし全体で ' + nfaSteps + ' 手 ＝ 長さ × 状態の数 以下', 30, ty + 66);
  if (bt) { fill(...(bt.cut ? ROSE : bt.steps > 50 * Math.max(1, nfaSteps) ? AMBER : DIMC));
    text('後もどりする方法（テキスト全体が一致するか）：' + (bt.cut ? BT_LIMIT + ' 手で打ち切り（終わらない！）' : bt.steps + ' 手　答え ' + (bt.ok ? '一致' : '不一致')), 30, ty + 90); }
  else { fill(...DIMC); text('後もどりする方法とのくらべっこは、空白のないテキスト（5 番目のお手本）で', 30, ty + 90); }
  drawSelfTest(width - 180, height - 14);
}
function drawTree(a, x, y, w, h) {      // 構文木：葉の数で横幅を分ける
  let leaves = (n) => (n.t === 'chr' || n.t === 'eps' ? 1 : n.b ? leaves(n.a) + leaves(n.b) : leaves(n.a));
  let depthOf = (n) => (n.t === 'chr' || n.t === 'eps' ? 1 : 1 + Math.max(depthOf(n.a), n.b ? depthOf(n.b) : 0));
  let L = leaves(a), D = depthOf(a), dy = Math.min(46, h / D), lw = w / L;
  function rec(n, x0, lvl) {
    let cx = x0 + (leaves(n) * lw) / 2, cy = y + lvl * dy + 14, kids = n.t === 'chr' || n.t === 'eps' ? [] : n.b ? [n.a, n.b] : [n.a], off = x0;
    for (let k of kids) { stroke(...WIRE); strokeWeight(1.5); line(cx, cy, off + (leaves(k) * lw) / 2, y + (lvl + 1) * dy + 14); rec(k, off, lvl + 1); off += leaves(k) * lw; }   // 線を先に、丸をあとに
    let lab = { chr: n.c, eps: 'ε', cat: '・', alt: '|', star: '*', plus: '+', opt: '?' }[n.t];
    noStroke(); fill(...(n.t === 'chr' ? AMBER : n.t === 'eps' ? DIMC : CYAN)); circle(cx, cy, Math.min(26, lw * 0.9));
    fill(10, 20, 15); textAlign(CENTER, CENTER); textSize(Math.min(15, lw * 0.6)); text(lab, cx, cy + 1);
    return [cx, cy];
  }
  rec(a, x, 0);
}

function keyPressed() {
  if (key === 'Tab') { editing = editing === 'pat' ? 'hay' : 'pat'; return false; }
  if (key === UP_ARROW) { loadPreset(pIdx - 1); return false; }
  if (key === DOWN_ARROW) { loadPreset(pIdx + 1); return false; }
  if (key === 'Backspace') { if (editing === 'pat') pat = pat.slice(0, -1); else hay = hay.slice(0, -1); rebuild(); return false; }
  const word = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  if (editing === 'pat') pat = typeInto(pat, key, word + '|*+?()', 50);
  else hay = typeInto(hay, key, word + ' ', 60);
  rebuild();
  return false;
}

// ---- 自己テスト
function randomRegex(d) {              // でたらめな正規表現（JavaScript の RegExp でも同じ意味になる形だけ）
  let r = rnd();
  if (d <= 0 || r < 0.3) return rndPick(['a', 'b', 'c']);
  if (r < 0.5) return randomRegex(d - 1) + randomRegex(d - 1);
  if (r < 0.65) return '(' + randomRegex(d - 1) + '|' + randomRegex(d - 1) + ')';
  return '(' + randomRegex(d - 1) + ')' + rndPick(['*', '+', '?']);
}
function selfTest() {
  selfTestResults = [];
  seedRng(4); let bad = 0, tot = 0, btBad = 0;
  for (let k = 0; k < 250; k++) {
    let re = randomRegex(4), p = parseRegex(re), m = thompson(p.ast), js = new RegExp('^(?:' + re + ')$');
    for (let j = 0; j < 24; j++) { let s = rndString('abc', rndInt(0, 7)); tot++; if (nfaAccepts(m, s) !== js.test(s)) bad++; if (j < 6 && btFullMatch(p.ast, s).ok !== js.test(s)) btBad++; }
  }
  check('でたらめな正規表現 250 個 × 24 文字列：トンプソンの NFA の答え = JavaScript の RegExp（全体一致）、' + tot + ' 回中ちがい ' + bad, bad === 0);
  check('後もどりする方法の答えも RegExp と同じ（1500 回）', btBad === 0);
  let okFind = true;
  for (let k = 0; k < 40; k++) {
    let re = randomRegex(3), m = thompson(parseRegex(re).ast), js = new RegExp('^(?:' + re + ')$'), s = rndString('abc', 12), want = [], i = 0;
    while (i <= s.length) { let best = -1; for (let j = s.length; j > i; j--) if (js.test(s.slice(i, j))) { best = j; break; } if (best > i) { want.push([i, best]); i = best; } else i++; }
    if (JSON.stringify(findAll(m, s).list) !== JSON.stringify(want)) okFind = false;
  }
  check('一番左・一番長い一致のさがし方 = 部分文字列を全部 RegExp で調べた答え（40 回）', okFind);
  let errs = ['(ab', 'a)', '*a', 'a**', 'a|(', '?'].map((s) => parseRegex(s));
  check('まちがった式 (ab a) *a a** a|( ? は例外ではなく「まちがい」として返る', errs.every((e) => e.error && e.ast === undefined));
  let n = 14, re = 'a?'.repeat(n) + 'a'.repeat(n), m = thompson(parseRegex(re).ast), s = 'a'.repeat(n), f = findAll(m, s), b = btFullMatch(parseRegex(re).ast, s);
  check('意地悪な式 (a?)^14 a^14：NFA は ' + f.steps + ' 手、後もどりは ' + b.steps + ' 手（100 倍以上）、答えは同じ', b.ok === true && nfaAccepts(m, s) && b.steps > 100 * f.steps);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. (a|b)*abb の NFA の状態の数を数えよう。1 文字につき 2 状態、| や * でさらに 2 状態ずつ増える
// 2. 5 番目のお手本で、テキストの a を 1 つずつ増やすと、後もどりの手数は約 2 倍ずつ増える。NFA の手数は？
// 3. 正規表現を 02 の部分集合構成にかけると DFA になる。(a|b)*abb の DFA は何状態？（答え：最小 4 状態）
// 4. メールアドレスや郵便番号のような形を、使える記号だけで書いてみよう（[0-9] がないので (0|1|2|3|4|5|6|7|8|9) と書く）
// 5. 「一番左・一番長い」の代わりに「一番左・一番短い」一致にするには findAll のどこを変える？

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
// ---- 正規表現の道具：再帰下降の構文解析 → 構文木 → トンプソン構成の NFA
// 使える記号：文字（英字・数字）、| （または）、つなげる、* （0 回以上）、+ （1 回以上）、? （0 か 1 回）、( )
function parseRegex(src) {              // 返り値 {ast} または {error, at}（例外は投げない）
  let i = 0;
  function peek() { return i < src.length ? src[i] : null; }
  function isChr(c) { return c !== null && /[A-Za-z0-9]/.test(c); }
  function alt() { let a = cat(); while (peek() === '|') { i++; a = { t: 'alt', a, b: cat() }; } return a; }
  function cat() {
    let a = null;
    while (peek() !== null && peek() !== '|' && peek() !== ')') { let r = rep(); a = a ? { t: 'cat', a, b: r } : r; }
    return a || { t: 'eps' };
  }
  function rep() {
    let a = atom(), c = peek();
    if (c === '*' || c === '+' || c === '?') { i++; a = { t: { '*': 'star', '+': 'plus', '?': 'opt' }[c], a }; }
    if (peek() === '*' || peek() === '+' || peek() === '?') throw [i, '記号を 2 つ続けて書けない（かっこを使う）'];
    return a;
  }
  function atom() {
    let c = peek();
    if (c === '(') { i++; let a = alt(); if (peek() !== ')') throw [i, ') が足りない']; i++; return a; }
    if (isChr(c)) { i++; return { t: 'chr', c }; }
    throw [i, c === null ? '式が途中で終わっている' : '「' + c + '」はここに書けない'];
  }
  try { let ast = alt(); if (i < src.length) throw [i, '( が足りない']; return { ast }; }
  catch (e) { if (Array.isArray(e)) return { error: e[1], at: e[0] }; return { error: String(e), at: i }; }
}
function astString(a) {                 // 構文木 → 文字列（かっこを補って）
  if (!a) return '';
  if (a.t === 'chr') return a.c;
  if (a.t === 'eps') return 'ε';
  if (a.t === 'cat') return astString(a.a) + astString(a.b);
  if (a.t === 'alt') return '(' + astString(a.a) + '|' + astString(a.b) + ')';
  return '(' + astString(a.a) + ')' + { star: '*', plus: '+', opt: '?' }[a.t];
}
function thompson(ast) {                // トンプソン構成：部品ごとに「入口 1 つ・出口 1 つ」の NFA を作ってつなぐ
  let tr = [], alpha = new Set();
  let ns = () => { tr.push({}); return tr.length - 1; };
  let add = (p, c, q) => { (tr[p][c] = tr[p][c] || []).push(q); };
  function build(a) {
    let s = ns(), f;
    if (a.t === 'chr') { f = ns(); add(s, a.c, f); alpha.add(a.c); }
    else if (a.t === 'eps') { f = ns(); add(s, '', f); }
    else if (a.t === 'cat') { let x = build(a.a), y = build(a.b); add(s, '', x[0]); add(x[1], '', y[0]); f = ns(); add(y[1], '', f); }
    else if (a.t === 'alt') { let x = build(a.a), y = build(a.b); f = ns(); add(s, '', x[0]); add(s, '', y[0]); add(x[1], '', f); add(y[1], '', f); }
    else { let x = build(a.a); f = ns(); add(s, '', x[0]); add(x[1], '', f);
      if (a.t !== 'plus') add(s, '', f);          // * と ? は 0 回でも OK
      if (a.t !== 'opt') add(x[1], '', x[0]);     // * と + はもう一度
    }
    return [s, f];
  }
  let [s, f] = build(ast), acc = tr.map((_, q) => q === f);
  return { n: tr.length, alpha: [...alpha].sort(), tr, start: s, acc, fin: f };
}
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
