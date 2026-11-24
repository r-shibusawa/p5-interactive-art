// ============================================
// 01 DFA を設計する ─ 決定性有限オートマトン（DFA）を自分で描いて、文字列を 1 文字ずつたどらせる
// 状態から出る矢印は「記号 1 つにつき 1 本」だけ（決定的）。最後に二重丸（受理状態）にいれば受理。
// 矢印がない記号を読んだら「行き止まり」で不受理。課題の言語と、長さ 7 までの全部の文字列で答え合わせ
// 編集：空いた所をクリック = 状態を足す / 状態から状態へドラッグ = 遷移（離したら記号キーで名前）/
//       外に出て同じ状態に戻る = 自己ループ / ダブルクリック = 受理 ⇔ 不受理 / Shift + ドラッグ = 動かす
// キー：記号（0 1 や a b）= 入力の文字列に足す / Backspace 1 文字消す / Enter 先頭から再生 / スペース 1 文字進める /
//       ← → 1 文字もどる・進む / P 課題を変える / E 空にして自分で作る / X 選んだ状態を消す / S 選んだ状態を開始に
// ============================================

const TASKS = [                         // ★ 課題：名前・記号・正解の判定（JavaScript で書いた「答え」）
  { name: '2 進数で 3 の倍数', alpha: ['0', '1'], pred: (s) => (s === '' ? 0 : parseInt(s, 2)) % 3 === 0, sample: 'mult3' },
  { name: 'a の数が偶数', alpha: ['a', 'b'], pred: (s) => s.split('a').length % 2 === 1, sample: 'evenA' },
  { name: 'ab を含む', alpha: ['a', 'b'], pred: (s) => s.indexOf('ab') >= 0, sample: 'hasAB' },
  { name: '長さが 3 の倍数', alpha: ['a', 'b'], pred: (s) => s.length % 3 === 0, sample: 'len3' },
];
const JUDGE_LEN = 7;                    // ★ 答え合わせに使う文字列の長さの上限
const R0 = 28;                          // 状態の円の半径
let task = 0, mach, word = '', tpos = 0, playing = false, playT = 0, judge = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadTask(0, true);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function areaBox() { return { x: 40, y: 118, w: width * 0.6, h: height - 318 }; }
function sampleDfa(kind, alpha) {       // 課題ごとのお手本の DFA
  let m = edNew(alpha), b = areaBox(), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  let line = (n) => { for (let i = 0; i < n; i++) edAddState(m, b.x + 60 + ((b.w - 120) * i) / Math.max(1, n - 1), cy); };
  if (kind === 'mult3') { line(3); for (let r = 0; r < 3; r++) for (let c of ['0', '1']) edSetEdge(m, r, (2 * r + +c) % 3, c); m.acc[0] = true; }
  if (kind === 'evenA') { line(2); edSetEdge(m, 0, 1, 'a'); edSetEdge(m, 1, 0, 'a'); edSetEdge(m, 0, 0, 'b'); edSetEdge(m, 1, 1, 'b'); m.acc[0] = true; }
  if (kind === 'hasAB') { line(3); edSetEdge(m, 0, 1, 'a'); edSetEdge(m, 0, 0, 'b'); edSetEdge(m, 1, 1, 'a'); edSetEdge(m, 1, 2, 'b'); edSetEdge(m, 2, 2, 'a'); edSetEdge(m, 2, 2, 'b'); m.acc[2] = true; }
  if (kind === 'len3') { m.pos = circleLayout(3, cx, cy, Math.min(b.w, b.h) * 0.3, Math.PI); m.n = 3; m.tr = [{}, {}, {}]; m.acc = [true, false, false];
    for (let q = 0; q < 3; q++) for (let c of alpha) edSetEdge(m, q, (q + 1) % 3, c); }
  return m;
}
function loadTask(k, withSample) {
  task = (k + TASKS.length) % TASKS.length;
  let t = TASKS[task];
  mach = withSample ? sampleDfa(t.sample, t.alpha) : edNew(t.alpha);
  if (!withSample) { let b = areaBox(); edAddState(mach, b.x + 80, b.y + b.h / 2); }
  word = t.alpha[1] + t.alpha[0] + t.alpha[1] + t.alpha[1]; tpos = 0; playing = true; playT = 0; edPending = null; edSel = -1;
  rejudge();
}
// ★ 答え合わせ：長さ JUDGE_LEN までの全部の文字列で、DFA の答えと正解をくらべる（一番短い反例も）
function judgeDfa(m, pred, alpha, L) {
  let agree = 0, total = 0, counter = null;
  for (let s of allStrings(alpha, L)) { total++; if (dfaAccepts(m, s) === pred(s)) agree++; else if (counter === null) counter = s; }
  return { agree, total, counter };
}
function rejudge() { let t = TASKS[task]; judge = judgeDfa(mach, t.pred, t.alpha, JUDGE_LEN); }

function draw() {
  background(...BG);
  let t = TASKS[task], b = areaBox();
  hudTitle('DFA を設計する：課題 ' + (task + 1) + '「' + t.name + '」（記号 ' + t.alpha.join(', ') + '）',
    'クリック 状態を足す　ドラッグ 遷移 → 記号キーで名前　ダブルクリック 受理　Shift+ドラッグ 移動　X 消す　S 開始に\n記号キー 入力に足す　Backspace 消す　Enter 再生　スペース/← → 1 文字　P 課題を変える　E 空から作る');
  noFill(); stroke(...WIRE); strokeWeight(1); rect(b.x - 10, b.y - 10, b.w + 20, b.h + 20, 10);
  // 再生：30 フレームごとに 1 文字
  if (playing && ++playT % 30 === 0) { if (tpos < word.length) tpos++; else playing = false; }
  tpos = clampv(tpos, 0, word.length);
  let tr = dfaTrace(mach, word), cur = tr[tpos], hi = {};
  if (cur >= 0) hi[cur] = tpos === word.length ? (mach.acc[cur] ? LIME : ROSE) : AMBER;
  if (edSel >= 0 && edSel < mach.n && !hi[edSel]) hi[edSel] = VIOLET;
  let lastC = tpos > 0 ? word[tpos - 1] : null, prevQ = tpos > 0 ? tr[tpos - 1] : -1;
  drawMachine(mach, mach.pos, { r: R0, hi, labelSize: 16,
    edgeHi: (e) => (lastC !== null && e.from === prevQ && e.to === cur && e.syms.indexOf(lastC) >= 0 ? AMBER : null) });
  edDrawRubber(mach, R0);

  // ---- 入力の文字列とたどった道
  let y = height - 170, cw = Math.min(44, (b.w - 20) / Math.max(1, word.length + 1));
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('入力（記号キーで足す）', 40, y - 14);
  for (let i = 0; i < word.length; i++) {
    let x = 40 + i * cw;
    stroke(...(i === tpos - 1 ? AMBER : WIRE)); strokeWeight(i === tpos - 1 ? 3 : 1); fill(...(i < tpos ? [40, 70, 55] : PANEL)); rect(x, y, cw - 4, 40, 5);
    noStroke(); fill(...INK); textAlign(CENTER, CENTER); textSize(20); text(word[i], x + cw / 2 - 2, y + 20);
  }
  textAlign(LEFT, BASELINE); textSize(14); fill(...DIMC);
  text('たどった状態：' + tr.slice(0, tpos + 1).map((q) => (q < 0 ? '行き止まり' : 'q' + q)).join(' → '), 40, y + 64);
  if (tpos === word.length) {
    let ok = dfaAccepts(mach, word), right = t.pred(word);
    fill(...(ok ? LIME : ROSE)); textSize(22); text(ok ? '受理' : '不受理', 40, y + 100);
    fill(...(ok === right ? LIME : ROSE)); textSize(15); text(ok === right ? '（課題の答えと同じ ✓）' : '（課題の答えは「' + (right ? '受理' : '不受理') + '」✗）', 130, y + 98);
  }

  // ---- 答え合わせ（右）
  let px = width * 0.66 + 10, py = 124;
  fill(...INK); textSize(17); text('答え合わせ（長さ ' + JUDGE_LEN + ' まで全部）', px, py);
  let all = judge.agree === judge.total;
  fill(...(all ? LIME : AMBER)); textSize(26); text(judge.agree + ' / ' + judge.total + (all ? '  正解！' : ''), px, py + 40);
  fill(...DIMC); textSize(14);
  if (!all) text('一番短い反例：「' + (judge.counter === '' ? 'ε（空の文字列）' : judge.counter) + '」 正解は ' + (t.pred(judge.counter) ? '受理' : '不受理'), px, py + 68);
  let samples = allStrings(t.alpha, 4).slice(0, 18);
  samples.forEach((s, i) => {
    let ok = dfaAccepts(mach, s) === t.pred(s), x = px + (i % 2) * 160, yy = py + 110 + Math.floor(i / 2) * 26;
    fill(...(ok ? LIME : ROSE)); textSize(15); text((ok ? '✓ ' : '✗ ') + (s === '' ? 'ε' : s) + '  ' + (t.pred(s) ? '受理' : '不受理'), x, yy);
  });
  fill(...DIMC); textSize(13);
  let dead = 0; for (let q = 0; q < mach.n; q++) for (let c of mach.alpha) if (dfaNext(mach, q, c) < 0) dead++;
  text('状態 ' + mach.n + ' 個、矢印のない記号 ' + dead + ' 本（読むと行き止まり）', px, py + 360);
  text('紫 = 選んだ状態、オレンジ = いまの状態', px, py + 384);
  text('緑 / 赤 = 読み終わって受理 / 不受理', px, py + 404);
  drawSelfTest(width - 180, height - 14);
}

function inArea(x, y) { let b = areaBox(); return x > b.x - 10 && x < b.x + b.w + 10 && y > b.y - 10 && y < b.y + b.h + 10; }
let firstPress = true, swallow = false;  // 最初のクリック（キーを届かせるためのクリック）では状態を足さない
function mousePressed(ev) {
  if (firstPress) { firstPress = false; swallow = true; return; }
  if (inArea(mouseX, mouseY) && edPress(mach, mouseX, mouseY, R0, millis(), ev && ev.shiftKey) === 'acc') rejudge();
}
function mouseDragged() { if (!swallow) edDragTo(mach, mouseX, mouseY); }
function mouseReleased() {
  if (swallow) { swallow = false; return; }
  if (edRelease(mach, mouseX, mouseY, R0, inArea(mouseX, mouseY))) rejudge();
}
function keyPressed() {
  let t = TASKS[task];
  if (edPending && t.alpha.indexOf(key) >= 0) { edLabel(mach, key); rejudge(); return false; }   // 名前待ちの矢印に記号をつける
  if (t.alpha.indexOf(key) >= 0) { word = typeInto(word, key, t.alpha, 24); tpos = 0; playing = true; playT = 0; return false; }
  if (key === 'Backspace') { word = word.slice(0, -1); tpos = Math.min(tpos, word.length); }
  if (key === 'Enter') { tpos = 0; playing = true; playT = 0; }
  if (key === ' ' || key === RIGHT_ARROW) { playing = false; tpos = Math.min(word.length, tpos + 1); }
  if (key === LEFT_ARROW) { playing = false; tpos = Math.max(0, tpos - 1); }
  if (key === 'p' || key === 'P') loadTask(task + 1, true);
  if (key === 'e' || key === 'E') loadTask(task, false);
  if ((key === 'x' || key === 'X') && edSel >= 0) { edDelete(mach, edSel); edSel = -1; edPending = null; rejudge(); }
  if ((key === 's' || key === 'S') && edSel >= 0 && edSel < mach.n) { mach.start = edSel; rejudge(); }
  if (key === 'Escape') edPending = null;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let m3 = sampleDfa('mult3', ['0', '1']), ok3 = true;
  for (let n = 0; n <= 1000; n++) if (dfaAccepts(m3, n.toString(2)) !== (n % 3 === 0)) ok3 = false;
  check('「3 の倍数」の DFA（3 状態）は n = 0〜1000 の 2 進数で n % 3 === 0 と一致', ok3 && m3.n === 3);
  for (let k = 1; k < TASKS.length; k++) {
    let t = TASKS[k], j = judgeDfa(sampleDfa(t.sample, t.alpha), t.pred, t.alpha, 10);
    check('お手本「' + t.name + '」：長さ 10 までの全部 ' + j.total + ' 個の文字列で正解と一致', j.agree === j.total && j.total === 2047);
  }
  // 編集の手順をまねて「b で終わる」DFA を作る（クリック 2 回 → 矢印 4 本 → 受理）
  let m = edNew(['a', 'b']); edAddState(m, 0, 0); edAddState(m, 100, 0);
  edSetEdge(m, 0, 0, 'a'); edSetEdge(m, 0, 1, 'b'); edSetEdge(m, 1, 1, 'b'); edSetEdge(m, 1, 0, 'a'); m.acc[1] = true;
  let jb = judgeDfa(m, (s) => s.endsWith('b'), m.alpha, 8);
  check('編集の手順で作った「b で終わる」DFA（2 状態）が長さ 8 まで全部正しい', jb.agree === jb.total);
  edSetEdge(m, 0, 0, 'b');                                  // 同じ記号の矢印は上書き（決定的のまま）
  let jw = judgeDfa(m, (s) => s.endsWith('b'), m.alpha, 8);
  check('矢印を 1 本まちがえると、反例「' + jw.counter + '」（一番短い）が見つかる', jw.counter === 'b' && dfaAccepts(m, 'b') === false);
  edDelete(m, 1);
  check('状態を消すと、その状態への矢印も消えて行き止まりになる（例外なし）', m.n === 1 && dfaNext(m, 0, 'b') === 0 && dfaNext(m, 0, 'a') === 0 && !dfaAccepts(m, 'ab'));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. E で空にして、課題 1「3 の倍数」を自分で作ろう。ヒント：状態 = 「ここまでの数を 3 で割った余り」。1 文字読むと余りは (2r + c) % 3
// 2. 課題「a の数が偶数 かつ b の数が奇数」には状態がいくつ要る？（05 の積の構成で確かめられる）
// 3. 反例が出たら、その文字列を入力してたどってみよう。どこで道をまちがえた？
// 4. TASKS に新しい課題を足そう：{ name: 'aa を含まない', alpha: ['a', 'b'], pred: (s) => s.indexOf('aa') < 0, sample: '' }
// 5. 「a と b が同じ数」は DFA で作れる？ 何状態あっても足りない理由を考えよう（06 のポンピング補題ゲーム）

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
// ---- 図を編集する道具：空いた所をクリック = 状態を足す、状態から状態へドラッグ = 遷移（すぐ記号のキーで名前）、
//      ダブルクリック = 受理 ⇔ 不受理、状態をドラッグ（Shift を押しながら）= 動かす、X = 選んだ状態を消す
let edMach = null, edDrag = null, edPending = null, edLast = { t: -1e9, q: -1 }, edSel = -1;
function edNew(alpha) { return { n: 0, alpha: alpha.slice(), tr: [], start: 0, acc: [], pos: [] }; }
function edAddState(m, x, y) { m.pos.push({ x, y, loop: -Math.PI / 2 }); m.tr.push({}); m.acc.push(false); m.n = m.pos.length; return m.n - 1; }
function edSetEdge(m, from, to, c) { if (from >= 0 && from < m.n && to >= 0 && to < m.n && m.alpha.indexOf(c) >= 0) m.tr[from][c] = to; }   // DFA なので同じ記号の古い遷移は上書き
function edDelete(m, q) {
  if (q < 0 || q >= m.n || m.n <= 1) return;
  m.pos.splice(q, 1); m.acc.splice(q, 1); m.tr.splice(q, 1); m.n = m.pos.length;
  for (let row of m.tr) for (let c in row) { if (row[c] === q) delete row[c]; else if (row[c] > q) row[c]--; }
  if (m.start === q) m.start = 0; else if (m.start > q) m.start--;
}
function edPress(m, x, y, r, now, shift) {      // 返り値：'acc' / 'drag' / 'move' / null（shift = Shift を押しているか）
  let q = hitState(m.pos, x, y, r);
  if (q >= 0 && edLast.q === q && now - edLast.t < 350) { m.acc[q] = !m.acc[q]; edLast = { t: -1e9, q: -1 }; edDrag = null; return 'acc'; }
  edLast = { t: now, q };
  if (q >= 0) { edSel = q; edDrag = { from: q, x, y, move: !!shift || keyIsDown(SHIFT) }; return edDrag.move ? 'move' : 'drag'; }
  edDrag = null;
  return null;
}
function edDragTo(m, x, y) {
  if (!edDrag) return;
  edDrag.x = x; edDrag.y = y;
  let p = m.pos[edDrag.from]; edDrag.far = Math.max(edDrag.far || 0, Math.hypot(x - p.x, y - p.y));   // どこまで離れたか
  if (edDrag.move) { p.x = x; p.y = y; }
}
function edRelease(m, x, y, r, inArea) {
  if (!edDrag) { if (inArea && hitState(m.pos, x, y, r * 2.2) < 0) { edSel = edAddState(m, x, y); return 'add'; } return null; }
  let d = edDrag; edDrag = null;
  if (d.move) return 'move';
  let to = hitState(m.pos, x, y, r);
  if (to < 0) return null;
  if (to === d.from && !((d.far || 0) > r * 1.3)) return 'select';   // その場でクリックしただけ（外に出て戻ると自己ループ）
  edPending = { from: d.from, to }; return 'edge';
}
function edLabel(m, c) { if (!edPending || m.alpha.indexOf(c) < 0) return false; edSetEdge(m, edPending.from, edPending.to, c); edPending = null; return true; }
function edDrawRubber(m, r) {                   // ドラッグ中の線と、名前待ちの辺
  if (edDrag && !edDrag.move) { let p = m.pos[edDrag.from]; stroke(...AMBER); strokeWeight(2); line(p.x, p.y, edDrag.x, edDrag.y); }
  if (edPending && m.pos[edPending.from] && m.pos[edPending.to]) {
    let a = m.pos[edPending.from], b = m.pos[edPending.to];
    noStroke(); fill(...AMBER); textSize(14); textAlign(CENTER, CENTER);
    text('記号のキー（' + m.alpha.join(' ') + '）で名前をつける', (a.x + b.x) / 2, (a.y + b.y) / 2 - r - 22);
    stroke(...AMBER); strokeWeight(2); drawingContext.setLineDash([6, 6]);
    if (edPending.from === edPending.to) { noFill(); circle(a.x, a.y - r * 1.6, r * 1.6); } else line(a.x, a.y, b.x, b.y);
    drawingContext.setLineDash([]);
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
