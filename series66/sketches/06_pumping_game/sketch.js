// ============================================
// 06 ポンピング補題ゲーム ─ 「この言語は正規言語（DFA で判定できる）ではない」をゲームで確かめる
// p 状態の DFA が長さ p 以上の文字列を読むと、どこかで同じ状態を 2 回通る → その間の部分 y は何回くり返しても（0 回でも）受理のまま。
// ゲーム：① 相手（コンピュータ）が p を決める ② あなたが言語の中の長さ p 以上の文字列を選ぶ ③ 相手が x y z に分ける（|xy| ≤ p, |y| ≥ 1）
// ④ あなたが i を選び、x y^i z が言語の外に出たらあなたの勝ち。正規言語なら相手はいつでも勝てる分け方を見つける
// 1〜5 言語を選ぶ / ↑↓ 文字列の長さ（②）・i（④）を選ぶ / スペース 決定 / N 新しいゲーム
// ============================================

const I_MAX = 5;                        // ★ i は 0〜I_MAX から選ぶ（相手はこの範囲で全部受理になる分け方をさがす）
const LANGS = [                         // ★ [名前, 言語に入るか, あなたが選べる文字列 (k) => ..., 正規言語か]
  ['aⁿbⁿ（a と b が同じ数、a が先）', (s) => /^a*b*$/.test(s) && s.split('a').length - 1 === s.split('b').length - 1, (k) => 'a'.repeat(k) + 'b'.repeat(k), false],
  ['回文（逆から読んでも同じ）', (s) => s === [...s].reverse().join(''), (k) => 'a'.repeat(k) + 'b' + 'a'.repeat(k), false],
  ['a の数が平方数（a, aaaa, a⁹ …）', (s) => /^a*$/.test(s) && Number.isInteger(Math.sqrt(s.length)), (k) => 'a'.repeat(k * k), false],
  ['a*b*（a のあとに b）', (s) => /^a*b*$/.test(s), (k) => 'a'.repeat(k) + 'b'.repeat(k), true],
  ['(ab)*（ab のくり返し）', (s) => /^(ab)*$/.test(s), (k) => 'ab'.repeat(k), true],
];
let lang = 0, pLen = 3, kSel = 3, phase = 0, word = '', xyz = null, iSel = 2, wins = { you: 0, cpu: 0 }, gameSeed = 1, result = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  newGame();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function newGame() { seedRng(gameSeed++); pLen = rndInt(2, 5); kSel = 1; phase = 0; xyz = null; iSel = 2; result = ''; }
function pump(s, sp, i) { return s.slice(0, sp[0]) + s.slice(sp[0], sp[1]).repeat(i) + s.slice(sp[1]); }   // x y^i z
// ★ 相手の作戦：全部の分け方 (x, y) を調べ、i = 0〜I_MAX の全部で言語に入るものがあればそれを選ぶ
function allSplits(s, p) { let out = []; for (let a = 0; a < Math.min(p, s.length); a++) for (let b = a + 1; b <= Math.min(p, s.length); b++) out.push([a, b]); return out; }
function pumpable(L, s, sp) { for (let i = 0; i <= I_MAX; i++) if (!L(pump(s, sp, i))) return false; return true; }
function cpuSplit(L, s, p) { let all = allSplits(s, p), good = all.find((sp) => pumpable(L, s, sp)); return { sp: good || all[0], safe: !!good }; }

function draw() {
  background(...BG);
  let [name, L, fam, regular] = LANGS[lang];
  hudTitle('ポンピング補題ゲーム：' + name + (regular ? '　← 正規言語' : ''), '1〜5 言語　↑↓ 選ぶ　スペース 決定　N 新しいゲーム　　あなた ' + wins.you + ' 勝 ／ 相手 ' + wins.cpu + ' 勝');
  word = fam(kSel);
  let y0 = 110;
  noStroke(); textAlign(LEFT, BASELINE);
  fill(...CYAN); textSize(20); text('① 相手：p = ' + pLen + '（「わたしの DFA は ' + pLen + ' 状態」）', 30, y0);
  fill(...(phase === 0 ? AMBER : INK)); textSize(18);
  text('② あなた：言語の中の、長さ ' + pLen + ' 以上の文字列を選ぶ（↑↓）→ 長さ ' + word.length + (word.length < pLen ? '　✗ 短すぎる' : L(word) ? '　✓' : '　✗ 言語の外'), 30, y0 + 36);
  drawWord(word, xyz && phase >= 1 ? xyz.sp : null, 30, y0 + 56);
  if (phase >= 1) {
    let [a, b] = xyz.sp;
    fill(...(phase === 1 ? AMBER : INK)); textSize(18); textAlign(LEFT, BASELINE);
    text('③ 相手：x = 「' + word.slice(0, a) + '」 y = 「' + word.slice(a, b) + '」 z = 「' + word.slice(b) + '」　|xy| = ' + b + ' ≤ ' + pLen + '、|y| = ' + (b - a), 30, y0 + 140);
    fill(...DIMC); textSize(14); text(xyz.safe ? '（相手は i = 0〜' + I_MAX + ' の全部で言語に入る分け方を見つけた）' : '（相手はどう分けても逃げられない……とりあえず最初の分け方）', 30, y0 + 162);
  }
  if (phase >= 2) {
    let pw = pump(word, xyz.sp, iSel), inL = L(pw);
    fill(...(phase === 2 ? AMBER : INK)); textSize(18);
    text('④ あなた：i = ' + iSel + '（↑↓）→ x y^' + iSel + ' z = 長さ ' + pw.length + (inL ? '　言語の中' : '　言語の外！'), 30, y0 + 200);
    drawWord(pw, null, 30, y0 + 214, xyz.sp, iSel);
  }
  if (phase === 3) { fill(...(result === 'you' ? LIME : ROSE)); textSize(26); textAlign(LEFT, BASELINE); text(result === 'you' ? 'あなたの勝ち！ y をくり返すと言語の外に出た' : '相手の勝ち。何回くり返しても言語の中', 30, y0 + 300); }
  // ---- 相手の頭の中：全部の分け方 × i の表
  if (phase >= 1) drawSplitTable(L, word, width * 0.62, 110);
  else {                                // ② のヒント：言語に入る短い文字列
    let ex = allStrings(['a', 'b'], 9).filter((s) => L(s)).slice(0, 16);
    fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('この言語に入る文字列の例（短い順）', width * 0.62, 110);
    ex.forEach((s, i) => { fill(...DIMC); textSize(14); text(s === '' ? 'ε（空）' : s, width * 0.62 + (i % 2) * 170, 140 + Math.floor(i / 2) * 24); });
    fill(...AMBER); textSize(14); text('↑↓ で長さ ' + pLen + ' 以上の文字列にしてスペース', 30, 240);
  }
  fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE);
  text('正規言語でないことを示すには：どんな p でも、あなたが文字列をうまく選べば、相手のどんな分け方にも勝てる i がある', 30, height - 60);
  text('aⁿbⁿ のコツ：a^p b^p を選ぶと |xy| ≤ p なので y は a だけ → i = 0 で a が減って数がずれる', 30, height - 40);
  drawSelfTest(width - 180, height - 14);
}
function drawWord(s, sp, x, y, pumpedFrom, i) {   // 文字を箱で。x = 灰、y = 金、z = 水色
  let cw = Math.min(28, (width * 0.58) / Math.max(1, s.length));
  for (let k = 0; k < s.length; k++) {
    let col = PANEL;
    if (sp) col = k < sp[0] ? [70, 90, 80] : k < sp[1] ? AMBER : CYAN;
    if (pumpedFrom) { let [a, b] = pumpedFrom, ylen = (b - a) * i; col = k < a ? [70, 90, 80] : k < a + ylen ? AMBER : CYAN; }
    noStroke(); fill(...col); rect(x + k * cw, y, cw - 2, 36, 3);
    fill(...(col === PANEL ? INK : [10, 20, 15])); textAlign(CENTER, CENTER); textSize(Math.min(18, cw * 0.7)); text(s[k], x + k * cw + cw / 2 - 1, y + 18);
  }
}
function drawSplitTable(L, s, x, y) {
  let all = allSplits(s, pLen);
  fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('相手の頭の中：分け方 × i（○ = 言語の中）', x, y);
  for (let i = 0; i <= I_MAX; i++) { fill(...DIMC); textSize(13); textAlign(CENTER, BASELINE); text('i=' + i, x + 150 + i * 36, y + 24); }
  all.slice(0, 14).forEach((sp, r) => {
    let yy = y + 48 + r * 24, ok = pumpable(L, s, sp), chosen = xyz && sp[0] === xyz.sp[0] && sp[1] === xyz.sp[1];
    textAlign(LEFT, BASELINE); fill(...(chosen ? AMBER : ok ? LIME : DIMC)); textSize(13);
    text('|x|=' + sp[0] + ' y=' + s.slice(sp[0], sp[1]) + (ok ? ' 安全' : ''), x, yy);
    for (let i = 0; i <= I_MAX; i++) { let v = L(pump(s, sp, i)); fill(...(v ? LIME : ROSE)); textAlign(CENTER, BASELINE); text(v ? '○' : '×', x + 150 + i * 36, yy); }
  });
  if (all.length > 14) { fill(...DIMC); textAlign(LEFT, BASELINE); text('… ほか ' + (all.length - 14) + ' 通り', x, y + 48 + 14 * 24); }
}

function keyPressed() {
  if (key >= '1' && key <= '5') { lang = +key - 1; newGame(); return false; }
  if (key === 'n' || key === 'N') { newGame(); return false; }
  let [, L] = LANGS[lang];
  if (key === UP_ARROW || key === DOWN_ARROW) {
    let d = key === UP_ARROW ? 1 : -1;
    if (phase === 0) kSel = clampv(kSel + d, 0, 12);
    if (phase === 2) iSel = clampv(iSel + d, 0, I_MAX);
  }
  if (key === ' ') {
    if (phase === 0 && word.length >= pLen && L(word)) { xyz = cpuSplit(L, word, pLen); phase = 1; }
    else if (phase === 1) phase = 2;
    else if (phase === 2) { result = L(pump(word, xyz.sp, iSel)) ? 'cpu' : 'you'; wins[result]++; phase = 3; }
    else if (phase === 3) newGame();
  }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  // 正規言語：長さ p〜p+3 の言語の中の文字列なら全部、相手は安全な分け方を見つける
  let cpuAlways = (L) => { for (let p = 2; p <= 6; p++) for (let s of allStrings(['a', 'b'], p + 3)) if (s.length >= p && L(s) && !cpuSplit(L, s, p).safe) return false; return true; };
  check('a*b*（正規）：p = 2〜6、長さ p〜p+3 の全部の文字列で、相手は i = 0〜5 の全部で言語に入る分け方を見つける', cpuAlways(LANGS[3][1]));
  check('(ab)*（正規）：同じく相手はいつも勝てる', cpuAlways(LANGS[4][1]));
  // 正規でない言語：あなたの作戦（よい文字列 + よい i）でどの分け方にも勝てる
  let youWin = (L, fam, kOf, iList) => { for (let p = 1; p <= 8; p++) { let s = fam(kOf(p)); if (!L(s) || s.length < p) return false; for (let sp of allSplits(s, p)) if (!iList.some((i) => !L(pump(s, sp, i)))) return false; } return true; };
  check('aⁿbⁿ：a^p b^p を選べば、p = 1〜8 のどの分け方にも i = 0 か 2 で勝てる', youWin(LANGS[0][1], LANGS[0][2], (p) => p, [0, 2]));
  check('回文：a^p b a^p を選べば、どの分け方にも i = 0 で勝てる', youWin(LANGS[1][1], LANGS[1][2], (p) => p, [0]));
  check('a の数が平方数：a^(p²) を選べば i = 2 で長さが p² と (p+1)² の間 → 勝てる', youWin(LANGS[2][1], LANGS[2][2], (p) => p, [2]));
  let okSplit = true;
  for (let p = 1; p <= 6; p++) for (let s of ['ab', 'aabb', 'abab', 'aaaa']) { let c = cpuSplit(() => true, s, p); if (!(c.sp[1] <= p && c.sp[1] - c.sp[0] >= 1)) okSplit = false; }
  check('相手の分け方はいつもルールどおり（|xy| ≤ p、|y| ≥ 1）', okSplit);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. aⁿbⁿ で、わざと短い文字列（k を小さく）や a^1 b^(p) のような選び方をすると、相手が逃げられることがある。どの選び方が強い？
// 2. 回文で a^p b a^p の代わりに (ab)^k (ba)^k を選ぶと？ 相手の表で「安全」が出るか見よう
// 3. a*b* はどう選んでも勝てない。表の「安全」な分け方が必ずあるのはなぜ？（y = 最初の 1 文字）
// 4. LANGS に「a の数 > b の数」や「a の数が 2 のべき」を足して、勝てる作戦を考えよう
// 5. 08 のプッシュダウンオートマトン（スタックつき）なら aⁿbⁿ も回文も判定できる。機械を強くすると何が変わる？

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
