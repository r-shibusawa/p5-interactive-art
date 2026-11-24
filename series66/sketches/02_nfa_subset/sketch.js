// ============================================
// 02 NFA と部分集合構成 ─ 非決定性有限オートマトン（NFA）は「同時にいくつもの状態にいられる」機械
// 同じ記号で矢印が何本もあってよく、ε（イプシロン）の矢印は文字を読まずに進める。玉 = いまいる状態の全部。
// 「いまいる状態の集合」を 1 つの状態とみなせば DFA になる（部分集合構成）。表を 1 行ずつ作ってみよう
// 0 1 入力に足す / Backspace 消す / Enter 先頭から再生 / ← → 1 文字 / スペース 表を 1 行 / A 表を全部 / ↑↓ n（最後から n 文字目）/ P 例を変える
// ============================================

let nBack = 3;                          // ★ 「最後から n 文字目が 1」の n（DFA の状態は 2^n 個になる）
const PRESETS = ['last', 'eps', 'thompson'];
let preset = 0, nfa, nfaPos, sub, dfaPos, shown = 1, word = '0110', tpos = 0, playing = true, playT = 0, title = '', pred = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  buildPreset();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); buildPreset(); }
// ★ 「最後から n 文字目が 1」の NFA：0 番で待ち、「ここが最後から n 文字目」と賭けて 1 で先へ進む
function lastNfa(n) {
  let tr = [{ '0': [0], '1': [0, 1] }];
  for (let i = 1; i < n; i++) tr.push({ '0': [i + 1], '1': [i + 1] });
  tr.push({});
  return { n: n + 1, alpha: ['0', '1'], tr, start: 0, acc: tr.map((_, i) => i === n) };
}
// ★ ε つきの NFA：「0 の数が偶数」または「1 の数が 3 の倍数」。最初に ε で 2 つの機械の両方に入る
function epsNfa() {
  let tr = [{ '': [1, 3] }, { '0': [2], '1': [1] }, { '0': [1], '1': [2] }, { '1': [4], '0': [3] }, { '1': [5], '0': [4] }, { '1': [3], '0': [5] }];
  return { n: 6, alpha: ['0', '1'], tr, start: 0, acc: [false, true, false, true, false, false] };
}
function buildPreset() {
  let kind = PRESETS[preset];
  if (kind === 'last') { nfa = lastNfa(nBack); title = '最後から ' + nBack + ' 文字目が 1'; pred = (s) => s.length >= nBack && s[s.length - nBack] === '1'; }
  if (kind === 'eps') { nfa = epsNfa(); title = 'ε つき：0 の数が偶数 または 1 の数が 3 の倍数'; pred = (s) => (s.split('0').length - 1) % 2 === 0 || (s.split('1').length - 1) % 3 === 0; }
  if (kind === 'thompson') { nfa = thompson(parseRegex('(0|1)*01').ast); nfa.alpha = ['0', '1']; title = '正規表現 (0|1)*01 のトンプソン構成（04 で作る形）'; pred = (s) => s.endsWith('01'); }
  let w = width * 0.55;
  if (kind === 'eps') nfaPos = [{ x: 80, y: height * 0.3 }, { x: 240, y: 150 }, { x: 420, y: 150 }, { x: 240, y: height * 0.42 }, { x: 420, y: height * 0.42 }, { x: 330, y: height * 0.3 + 30 }].map((p) => ({ x: p.x * w / 600, y: p.y, loop: -Math.PI / 2 }));
  else nfaPos = layerLayout(nfa, 80, 100, w - 120, height * 0.4 - 60);
  if (kind === 'eps') { nfaPos[3].loop = nfaPos[4].loop = nfaPos[5].loop = Math.PI / 2; }
  sub = subsetConstruct(nfa);
  dfaPos = circleLayout(sub.dfa.n, w / 2 + 10, height * 0.75, Math.min(w * 0.3, height * 0.15), Math.PI);
  shown = 1; tpos = 0; playing = true; playT = 0;
}

function draw() {
  background(...BG);
  hudTitle('NFA と部分集合構成：' + title, '0 1 入力　Backspace　Enter 再生　← → 1 文字　スペース 表を 1 行　A 全部　↑↓ n　P 例を変える');
  if (playing && ++playT % 36 === 0) { if (tpos < word.length) tpos++; else playing = false; }
  tpos = clampv(tpos, 0, word.length);
  let sets = nfaTrace(nfa, word), cur = sets[tpos], hi = {};
  for (let q of cur) hi[q] = AMBER;
  // ---- NFA（玉 = いまいる状態）
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('NFA（' + nfa.n + ' 状態、点線 = ε）　玉の数 = ' + cur.length, 30, 92);
  drawMachine(nfa, nfaPos, { r: nfa.n > 8 ? 17 : 22, hi, labelSize: 14 });
  let pulse = 6 + 3 * Math.sin(frameCount * 0.15);
  for (let q of cur) { noStroke(); fill(...AMBER, 220); circle(nfaPos[q].x, nfaPos[q].y - (nfa.n > 8 ? 17 : 22) - 8, pulse * 2); }
  // ---- 入力
  let y = height * 0.47;
  for (let i = 0; i < word.length; i++) {
    stroke(...(i === tpos - 1 ? AMBER : WIRE)); strokeWeight(i === tpos - 1 ? 3 : 1); fill(...(i < tpos ? [40, 70, 55] : PANEL)); rect(30 + i * 32, y, 28, 30, 4);
    noStroke(); fill(...INK); textAlign(CENTER, CENTER); textSize(17); text(word[i], 44 + i * 32, y + 15);
  }
  let acc = cur.some((q) => nfa.acc[q]);
  textAlign(LEFT, CENTER); fill(...(tpos === word.length ? (acc ? LIME : ROSE) : DIMC)); textSize(16);
  text(tpos === word.length ? (acc ? '受理（玉のどれかが二重丸）' : '不受理') : '読んでいる途中', 40 + word.length * 32, y + 15);

  // ---- DFA（部分集合構成）
  let dq = sub.dfa.n, dcur = dfaTrace(sub.dfa, word)[tpos], dhi = {};
  dhi[dcur] = AMBER;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text('部分集合構成でできた DFA：' + dq + ' 状態' + (PRESETS[preset] === 'last' ? '（= 2^' + nBack + '）' : ''), 30, height * 0.47 + 62);
  if (dq <= 16) drawMachine(sub.dfa, dfaPos, { r: dq > 8 ? 16 : 22, hi: dhi, names: sub.dfa.acc.map((_, i) => 'D' + i), labels: dq <= 8, edgeCol: [60, 100, 80], nameSize: 12,
    edgeHi: (e) => (tpos > 0 && e.to === dcur && e.from === dfaTrace(sub.dfa, word)[tpos - 1] ? AMBER : null) });
  else { fill(...DIMC); text('状態が多いので図は省略（右の表を見よう）', 30, height * 0.72); }

  // ---- 部分集合構成の表
  textAlign(LEFT, BASELINE);
  let px = width * 0.58, py = 100, rows = sub.rows, rh = clampv((height - 200) / (rows.length + 1), 12, 26);
  fill(...INK); textSize(16); text('部分集合構成の表（' + Math.min(shown, rows.length) + ' / ' + rows.length + ' 行）', px, py);
  textSize(Math.min(15, rh * 0.7)); let cx = [px, px + 70, px + 250, px + 340, px + 430];
  fill(...DIMC); ['DFA', 'NFA の状態の集合', '0 で', '1 で', '受理'].forEach((h, i) => text(h, cx[i], py + rh + 6));
  for (let i = 0; i < Math.min(shown, rows.length); i++) {
    let yy = py + rh * (i + 2) + 6, isCur = rows[i].from === dcur;
    if (isCur) { noStroke(); fill(...AMBER, 50); rect(px - 6, yy - rh * 0.8, 480, rh, 4); }
    fill(...(isCur ? AMBER : INK));
    text('D' + i, cx[0], yy); text(setName(sub.sets[i]), cx[1], yy);
    text('D' + rows[i].to['0'], cx[2], yy); text('D' + rows[i].to['1'], cx[3], yy);
    fill(...(sub.dfa.acc[i] ? LIME : DIMC)); text(sub.dfa.acc[i] ? '◎' : '', cx[4], yy);
  }
  fill(...DIMC); textSize(13);
  text('新しい集合が出てきたら下に 1 行増える。たどれる集合だけを作るので、2^' + nfa.n + ' = ' + Math.pow(2, nfa.n) + ' 個を全部作る必要はない', px, height - 50);
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key === '0' || key === '1') { word = typeInto(word, key, '01', 20); tpos = 0; playing = true; playT = 0; }
  if (key === 'Backspace') { word = word.slice(0, -1); tpos = Math.min(tpos, word.length); }
  if (key === 'Enter') { tpos = 0; playing = true; playT = 0; }
  if (key === RIGHT_ARROW) { playing = false; tpos = Math.min(word.length, tpos + 1); }
  if (key === LEFT_ARROW) { playing = false; tpos = Math.max(0, tpos - 1); }
  if (key === ' ') shown = Math.min(sub.rows.length, shown + 1);
  if (key === 'a' || key === 'A') shown = sub.rows.length;
  if (key === UP_ARROW && nBack < 5) { nBack++; if (PRESETS[preset] === 'last') buildPreset(); }
  if (key === DOWN_ARROW && nBack > 1) { nBack--; if (PRESETS[preset] === 'last') buildPreset(); }
  if (key === 'p' || key === 'P') { preset = (preset + 1) % PRESETS.length; buildPreset(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let words = allStrings(['0', '1'], 10), okSize = true, okEq = true;
  for (let n = 1; n <= 5; n++) {
    let a = lastNfa(n), d = subsetConstruct(a).dfa;
    if (d.n !== Math.pow(2, n)) okSize = false;
    for (let s of words) { let v = nfaAccepts(a, s); if (v !== dfaAccepts(d, s) || v !== (s.length >= n && s[s.length - n] === '1')) { okEq = false; break; } }
  }
  check('「最後から 3 文字目が 1」の NFA（4 状態）から作った DFA はちょうど 8 状態', subsetConstruct(lastNfa(3)).dfa.n === 8);
  check('n = 1〜5 で DFA の状態は 2^n 個（2, 4, 8, 16, 32）', okSize);
  check('n = 1〜5：NFA のシミュレーション = 部分集合構成の DFA = 正解（長さ 10 までの全部 2047 個）', okEq);
  let e = epsNfa(), de = subsetConstruct(e).dfa, okE = true;
  for (let s of words) { let v = (s.split('0').length - 1) % 2 === 0 || (s.split('1').length - 1) % 3 === 0; if (nfaAccepts(e, s) !== v || dfaAccepts(de, s) !== v) { okE = false; break; } }
  check('ε つきの NFA：スタートの ε 閉包 = {0,1,3}、NFA = DFA = 正解（長さ 10 まで）、DFA は 7 状態 → 最小化で 2 × 3 = 6 状態', okE && epsClosure(e, [0]).join(',') === '0,1,3' && de.n === 7 && minimizeMoore(de).min.n === 6);
  let tn = thompson(parseRegex('(0|1)*01').ast); tn.alpha = ['0', '1'];
  let td = subsetConstruct(tn).dfa, okT = words.every((s) => nfaAccepts(tn, s) === s.endsWith('01') && dfaAccepts(td, s) === s.endsWith('01'));
  check('トンプソン構成の (0|1)*01（' + tn.n + ' 状態）→ DFA ' + td.n + ' 状態 → 最小化すると 3 状態', okT && minimizeMoore(td).min.n === 3);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. n を 1 → 5 と増やすと DFA は 2, 4, 8, 16, 32 状態。NFA はたった n + 1 状態。なぜ DFA は「最後の n 文字を全部覚える」必要がある？
// 2. 「1101」を入力して、玉が増えたり減ったりする様子を見よう。玉の位置の集合が表のどの行か、指でたどろう
// 3. ε つきの例で、最初の玉が 2 つ（ε でただちに 2 つの機械に入る）なのを確かめよう
// 4. lastNfa を「最後から n 文字目が 1 で、しかも最後が 0」に変えると DFA は何状態？
// 5. 04 の正規表現 → NFA と、この部分集合構成をつなげると、正規表現から DFA が作れる（15 でそれを使う）

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
