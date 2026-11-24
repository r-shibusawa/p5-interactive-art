// ============================================
// 08 プッシュダウンオートマトン ─ 有限オートマトンに「スタック（積み重ねの記憶）」を 1 本つけた機械
// かっこ：開きかっこは積む、閉じかっこは一番上と組なら取る。最後にスタックが空なら受理。深さに上限がないのが強み。
// 有限の機械は「深さ D まで」しか覚えられない（状態の数 = 積み方の数）。D + 1 段で必ずまちがえる。
// 回文 w wᴿ：どこが真ん中かわからないので、毎回「ここが真ん中」と推測する枝を全部ためす（非決定性 → 枝の探索）
// Tab かっこ ⇔ 回文 / 文字キー 入力（かっこ：( ) [ ] { }、回文：a b）/ Backspace 消す / ← → 1 文字 / スペース 自動再生 / ↑↓ お手本 / D 有限の機械の深さ
// ============================================

const PAIRS = { ')': '(', ']': '[', '}': '{' };
const BR_PRESETS = ['({[]})[]', '(([]){})', '([)]', '((((()))))', '(()', '{[()()]}{}'];
const PAL_PRESETS = ['abba', 'abaaba', 'abab', 'aabbaa', 'baab', 'aaaa'];
let pdaMode = 'br', word = BR_PRESETS[0], pIdx = 0, tpos = 0, playing = true, playT = 0, depthD = 3, trace, branches;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  rerun();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
// ★ かっこの PDA（決定的）：1 文字ごとのスタックの様子を返す
function bracketPda(s) {
  let stk = [], snaps = [[]], fail = -1;
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if ('([{'.indexOf(c) >= 0) stk.push(c);                       // 開き → 積む
    else if (stk.length && stk[stk.length - 1] === PAIRS[c]) stk.pop();   // 閉じ ＋ 一番上が組 → 取る
    else { fail = i; snaps.push(stk.slice()); break; }               // 組にならない → 不受理
    snaps.push(stk.slice());
  }
  return { ok: fail < 0 && stk.length === 0, snaps, fail };
}
// ★ 有限の機械：積み方を深さ D までだけ覚える DFA（状態の数 = 1 + 3 + 9 + … + 3^D）。D を超えたら「ごみ箱」へ
function boundedDfa(s, D) {
  let stk = '';
  for (let c of s) {
    if ('([{'.indexOf(c) >= 0) { stk += c; if (stk.length > D) return false; }
    else if (stk.length && stk[stk.length - 1] === PAIRS[c]) stk = stk.slice(0, -1);
    else return false;
  }
  return stk === '';
}
function boundedStates(D) { let n = 0; for (let k = 0; k <= D; k++) n += Math.pow(3, k); return n + 1; }
// ★ 回文 w wᴿ の PDA（非決定的）：枝 = 「真ん中は k 文字目のあと」の推測。全部の枝を同時に動かす
function palindromePda(s) {
  let br = [];
  for (let k = 0; k <= s.length; k++) {                // k 文字読んだあとに ε で「戻す段階」へ
    let stk = [], snaps = [], dead = -1;
    for (let i = 0; i < s.length; i++) {
      if (i < k) stk.push(s[i]);
      else if (stk.length && stk[stk.length - 1] === s[i]) stk.pop();
      else { dead = i; break; }
      snaps.push(stk.slice());
    }
    br.push({ k, snaps, dead, ok: dead < 0 && stk.length === 0 });
  }
  return { branches: br, ok: br.some((b) => b.ok) };
}
function rerun() {
  if (pdaMode === 'br') trace = bracketPda(word); else branches = palindromePda(word);
  tpos = 0; playing = true; playT = 0;
}

function draw() {
  background(...BG);
  hudTitle(pdaMode === 'br' ? 'プッシュダウンオートマトン：かっこの対応' : 'プッシュダウンオートマトン：回文 w wᴿ を非決定的に',
    'Tab かっこ ⇔ 回文　' + (pdaMode === 'br' ? '( ) [ ] { }' : 'a b') + ' 入力　Backspace　← → 1 文字　スペース 再生　↑↓ お手本' + (pdaMode === 'br' ? '　D 有限の機械の深さ（' + depthD + '）' : ''));
  if (playing && ++playT % 30 === 0) { if (tpos < word.length) tpos++; else playing = false; }
  tpos = clampv(tpos, 0, word.length);
  // 入力
  for (let i = 0; i < word.length; i++) {
    stroke(...(i === tpos - 1 ? AMBER : WIRE)); strokeWeight(i === tpos - 1 ? 3 : 1); fill(...(i < tpos ? [40, 70, 55] : PANEL)); rect(30 + i * 40, 96, 36, 40, 5);
    noStroke(); fill(...INK); textAlign(CENTER, CENTER); textSize(22); text(word[i], 48 + i * 40, 116);
  }
  if (pdaMode === 'br') drawBrackets(); else drawPalindrome();
  drawSelfTest(width - 180, height - 14);
}
function drawStack(stk, x, yBottom, w, col, label) {     // 下から積む
  noStroke(); fill(...DIMC); textSize(13); textAlign(CENTER, BASELINE); text(label, x + w / 2, yBottom + 22);
  stroke(...WIRE); strokeWeight(2); line(x - 4, yBottom, x + w + 4, yBottom); line(x - 4, yBottom, x - 4, yBottom - 300); line(x + w + 4, yBottom, x + w + 4, yBottom - 300);
  let h = Math.min(34, 290 / Math.max(1, stk.length));
  stk.forEach((c, i) => { noStroke(); fill(...col, i === stk.length - 1 ? 255 : 150); rect(x, yBottom - (i + 1) * h, w, h - 3, 4); fill(10, 20, 15); textAlign(CENTER, CENTER); textSize(Math.min(20, h * 0.7)); text(c, x + w / 2, yBottom - (i + 0.5) * h - 1); });
}
function drawBrackets() {
  let k = Math.min(tpos, trace.snaps.length - 1), stk = trace.snaps[k], failed = trace.fail >= 0 && tpos > trace.fail;
  drawStack(stk, 60, height - 120, 70, AMBER, 'スタック（高さ ' + stk.length + '）');
  let x = 230; noStroke(); textAlign(LEFT, BASELINE); fill(...INK); textSize(16);
  text('遷移の規則（状態は 1 つ、記憶はスタックだけ）', x, 180);
  fill(...DIMC); textSize(15);
  ['( [ { を読む → そのまま積む', ') ] } を読む、一番上が組の相手 → 一番上を取る', 'それ以外（空、組がちがう）→ その場で不受理', '読み終わってスタックが空 → 受理'].forEach((r, i) => text('・' + r, x, 210 + i * 26));
  textSize(22);
  if (tpos >= word.length || failed) { fill(...(trace.ok ? LIME : ROSE)); text(trace.ok ? '受理（スタックが空）' : failed ? '不受理：' + (trace.fail + 1) + ' 文字目の「' + word[trace.fail] + '」の相手がいない' : '不受理：スタックに ' + stk.length + ' 個残った', x, 340); }
  // 深さのグラフ
  let gx = x, gy = 380, gw = width * 0.5, gh = Math.min(220, height - 520), maxD = Math.max(1, ...trace.snaps.map((s) => s.length));
  fill(...INK); textSize(15); text('深さ（スタックの高さ）の変化', gx, gy);
  stroke(...AMBER); strokeWeight(2.5); noFill(); beginShape();
  for (let i = 0; i <= k; i++) vertex(gx + (i / Math.max(1, word.length)) * gw, gy + 20 + gh - (trace.snaps[i].length / maxD) * gh);
  endShape();
  stroke(...ROSE); strokeWeight(1); drawingContext.setLineDash([5, 5]); let yD = gy + 20 + gh - (depthD / maxD) * gh; if (depthD <= maxD) line(gx, yD, gx + gw, yD); drawingContext.setLineDash([]);
  // 有限の機械とくらべる
  let px = width * 0.68, fin = boundedDfa(word, depthD);
  noStroke(); textAlign(LEFT, BASELINE); fill(...INK); textSize(16); text('有限オートマトンとくらべる', px, 180);
  fill(...DIMC); textSize(14);
  text('深さ ' + depthD + ' までの積み方を全部「状態」にした DFA', px, 210);
  text('状態の数 = 1 + 3 + … + 3^' + depthD + ' + ごみ箱 = ' + boundedStates(depthD), px, 234);
  fill(...(fin === trace.ok ? LIME : ROSE)); textSize(18);
  text('DFA：' + (fin ? '受理' : '不受理') + '　PDA：' + (trace.ok ? '受理' : '不受理') + (fin === trace.ok ? '　同じ' : '　ちがう！'), px, 272);
  fill(...DIMC); textSize(14);
  text('深さ ' + (depthD + 1) + ' 以上のかっこでは DFA がまちがえる。', px, 304);
  text('状態をいくら増やしても、もっと深いかっこがある', px, 326);
  text('（ポンピング補題 06 の (ⁿ )ⁿ と同じ理由）', px, 348);
}
function drawPalindrome() {
  let bs = branches.branches, y0 = 170, rh = Math.min(40, (height - 280) / bs.length);
  noStroke(); textAlign(LEFT, BASELINE); fill(...INK); textSize(16);
  text('枝 = 「真ん中は k 文字目のあと」という推測。前半は積み、後半は一番上と同じ文字なら取る', 30, y0 - 12);
  bs.forEach((b, r) => {
    let y = y0 + r * rh, alive = b.dead < 0 || tpos <= b.dead, done = tpos >= word.length;
    fill(...(done ? (b.ok ? LIME : ROSE) : alive ? INK : [90, 100, 95])); textSize(14);
    text('k = ' + b.k + (done ? (b.ok ? '　受理！' : b.dead >= 0 ? '　' + (b.dead + 1) + ' 文字目で行き止まり' : '　スタックが残る') : alive ? '' : '　行き止まり'), 30, y + rh * 0.6);
    let stk = tpos === 0 ? [] : b.snaps[Math.min(tpos, b.snaps.length) - 1] || [];
    stk.forEach((c, i) => { fill(...(alive ? (i < b.k ? AMBER : CYAN) : [70, 80, 75])); rect(290 + i * 24, y + 4, 21, rh - 8, 3); fill(10, 20, 15); textAlign(CENTER, CENTER); textSize(13); text(c, 300 + i * 24, y + rh / 2); textAlign(LEFT, BASELINE); });
    stroke(...WIRE); strokeWeight(1); line(290 + b.k * 0, y + rh, 290 + 24 * 12, y + rh); noStroke();
  });
  let px = width * 0.62; fill(...INK); textSize(16); text('非決定性 = 枝を全部ためす', px, y0 + 20);
  fill(...DIMC); textSize(14);
  ['枝の数 = 文字数 + 1 = ' + bs.length + '（どこで折り返すか）', '1 本でも受理すれば受理（どの推測が正しいか知らなくてよい）', '長さが奇数の回文（aba）は w wᴿ ではないので受理しない', '決定的な PDA では回文は判定できない（真ん中がわからない）'].forEach((t, i) => text('・' + t, px, y0 + 52 + i * 26));
  if (tpos >= word.length) { fill(...(branches.ok ? LIME : ROSE)); textSize(22); text(branches.ok ? '受理：w wᴿ の形' : '不受理：どの枝も受理しない', px, y0 + 180); }
}

function keyPressed() {
  if (key === 'Tab') { pdaMode = pdaMode === 'br' ? 'pal' : 'br'; pIdx = 0; word = (pdaMode === 'br' ? BR_PRESETS : PAL_PRESETS)[0]; rerun(); return false; }
  let allowed = pdaMode === 'br' ? '()[]{}' : 'ab';
  if (allowed.indexOf(key) >= 0 && key.length === 1) { word = typeInto(word, key, allowed, pdaMode === 'br' ? 24 : 12); rerun(); return false; }
  if (key === 'Backspace') { word = word.slice(0, -1); rerun(); }
  if (key === RIGHT_ARROW) { playing = false; tpos = Math.min(word.length, tpos + 1); }
  if (key === LEFT_ARROW) { playing = false; tpos = Math.max(0, tpos - 1); }
  if (key === ' ') { if (tpos >= word.length) tpos = 0; playing = !playing; playT = 0; }
  if (key === UP_ARROW || key === DOWN_ARROW) { let ps = pdaMode === 'br' ? BR_PRESETS : PAL_PRESETS; pIdx = (pIdx + (key === UP_ARROW ? ps.length - 1 : 1)) % ps.length; word = ps[pIdx]; rerun(); }
  if (key === 'd' || key === 'D') depthD = depthD % 6 + 1;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(8); let okCnt = true, okMix = true;
  for (let k = 0; k < 600; k++) {
    let s = rndString('()', rndInt(0, 14)), c = 0, good = true;
    for (let ch of s) { c += ch === '(' ? 1 : -1; if (c < 0) good = false; }     // 数えるだけの判定（1 種類なら十分）
    if (bracketPda(s).ok !== (good && c === 0)) okCnt = false;
    let m = rndString('()[]{}', rndInt(0, 12)), r = m, prev;
    do { prev = r; r = r.replace(/\(\)|\[\]|\{\}/g, ''); } while (r !== prev);   // 組を消し続けて空になるか
    if (bracketPda(m).ok !== (r === '')) okMix = false;
  }
  check('( ) だけの 600 個：PDA = カウンタの判定（途中で負にならず最後が 0）', okCnt);
  check('3 種類のかっこ 600 個：PDA = 「() [] {} を消し続けて空になる」', okMix);
  let okB = true;
  for (let s of allStrings(['(', ')', '['], 8)) { let p = bracketPda(s), d = Math.max(...p.snaps.map((x) => x.length)); if (d <= 3 && boundedDfa(s, 3) !== p.ok) okB = false; }
  check('深さ 3 までの DFA（' + boundedStates(3) + ' 状態）は深さ 3 以内なら PDA と同じ、深さ 4 の (((()))) をまちがえる', okB && bracketPda('(((())))').ok && !boundedDfa('(((())))', 3));
  let okP = allStrings(['a', 'b'], 10).every((s) => palindromePda(s).ok === (s.length % 2 === 0 && s === [...s].reverse().join('')));
  check('回文 PDA（枝の探索）= 「長さが偶数で逆から読んでも同じ」、長さ 10 までの全部 2047 個', okP);
  check('abba は k = 2 の枝だけが受理、abab はどの枝も受理しない', palindromePda('abba').branches.filter((b) => b.ok).map((b) => b.k).join() === '2' && !palindromePda('abab').ok);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ((((((((((  ))))))))))  のように深くすると、D の DFA はどこでまちがえる？ D を増やすと状態は 3 倍ずつ増える
// 2. 「([)]」はなぜ不受理？ スタックの一番上を見よう。数えるだけ（カウンタ）では見分けられない
// 3. 回文で、長さ 12 の文字列だと枝は 13 本。受理する枝はいくつある？（aaaa はいくつ？）
// 4. 奇数の長さの回文（aba）も受理するには、「真ん中の 1 文字を読みとばす」枝を足せばよい。palindromePda を変えてみよう
// 5. スタックを 2 本にすると？ → チューリング機械と同じ強さになる（10）

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
