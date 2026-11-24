// ============================================
// 14 オートマトンの作曲 🔊 ─ 状態ごとに音を決めておき、入力の 0 と 1 の列に沿って 1 拍に 1 歩ずつ歩かせる
// 同じ入力でも機械（矢印）を変えると曲が変わる。入力を読み終えたとき受理状態（二重丸）にいれば「終わりの和音」、
// そうでなければ「まだ続く」音で次の小節へ。矢印のない記号を読むと行き止まり（その小節は休み）
// まずクリックで音を ON（音量は小さめから）/ スペース 再生・停止 / 0 1 入力に足す / Backspace 消す / R でたらめな入力 / ↑↓ テンポ
// 編集：空いた所をクリック = 状態 / 状態から状態へドラッグ → 0 か 1 のキー = 矢印 / ダブルクリック = 受理 / Shift + ドラッグ = 動かす /
//       K 選んだ状態の音を変える / X 選んだ状態を消す
// ============================================

const SOUNDS = [['キック', 'kick'], ['スネア', 'snare'], ['ハイハット', 'hat'], ['ド', 60], ['ミ', 64], ['ソ', 67], ['ラ', 69], ['高いド', 72], ['休み', null]];   // ★ 状態に割り当てる音
let bpm = 120;                          // ★ テンポ（1 拍 = 8 分音符）
const R0 = 30;
let mach, snd = [], word = '0110100110010110', beat = -1, playing = true, lastBeatMs = 0, curQ = 0, rollHist = [], flash = 0, cadence = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  mach = defaultMachine(width * 0.32, height * 0.48, Math.min(width * 0.2, height * 0.26));
  curQ = mach.start;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function defaultMachine(cx, cy, rad) {   // ★ はじめの機械：キック・スネア・ハイハット・ミ・ソ
  let m = edNew(['0', '1']);
  m.pos = circleLayout(5, cx, cy, rad, Math.PI); m.n = 5; m.tr = [{}, {}, {}, {}, {}]; m.acc = [true, false, false, false, false];
  [[0, '0', 2], [0, '1', 1], [1, '0', 2], [1, '1', 3], [2, '0', 0], [2, '1', 4], [3, '0', 2], [3, '1', 0], [4, '0', 3], [4, '1', 0]].forEach(([a, c, b]) => edSetEdge(m, a, b, c));
  snd = [0, 1, 2, 4, 5];
  return m;
}
// ★ 歩く：入力を 1 文字読むごとの状態（-1 = 行き止まり）。音はその状態の音
function walk(m, s) { return dfaTrace(m, s).slice(1); }
function beatSec() { return 60 / bpm / 2; }
function playSound(k, when) {
  let s = SOUNDS[k] ? SOUNDS[k][1] : null;
  if (!audioCtx || s === null) return;
  if (s === 'kick') playKick(when);
  else if (s === 'snare') playNoise(when, 0.15, 1500, 0.5);
  else if (s === 'hat') playNoise(when, 0.05, 7000, 0.3);
  else playNote(midiHz(s), when, beatSec() * 1.6, 'triangle', 0.5);
}
function playCadence(ok, when) {        // 終わりの和音（ド・ミ・ソ）か、まだ続く感じ（レ・ファ・シ）
  if (!audioCtx) return;
  (ok ? [60, 64, 67, 72] : [62, 65, 71]).forEach((n, i) => playNote(midiHz(n), when + i * 0.02, 0.9, 'sine', 0.35));
}
function onBeat() {
  if (!word.length) return;
  beat++;
  if (beat >= word.length) {             // 小節の終わり
    let ok = dfaAccepts(mach, word); cadence = ok ? '受理 → 終わりの和音' : '受理でない → まだ続く音';
    playCadence(ok, audioCtx ? audioCtx.currentTime + 0.01 : 0); beat = 0;
  }
  let path = walk(mach, word); curQ = path[beat];
  if (curQ >= 0) playSound(snd[curQ], audioCtx ? audioCtx.currentTime + 0.01 : 0);
  rollHist.push(curQ >= 0 ? snd[curQ] : -1); if (rollHist.length > 48) rollHist.shift();
  flash = 1;
}

function draw() {
  background(...BG);
  hudTitle('オートマトンの作曲：状態 = 音、入力 = リズムの道順', 'クリックで音 ON　スペース 再生・停止　0 1 入力　Backspace　R でたらめ　↑↓ テンポ ' + bpm + '\nクリック 状態　ドラッグ → 0/1 矢印　ダブルクリック 受理　Shift+ドラッグ 移動　K 音を変える　X 消す');
  if (playing && millis() - lastBeatMs >= beatSec() * 1000) { lastBeatMs = millis(); onBeat(); }
  flash *= 0.9;
  // ---- 機械
  let hi = {}; if (curQ >= 0 && curQ < mach.n) hi[curQ] = AMBER;
  if (edSel >= 0 && edSel < mach.n && !hi[edSel]) hi[edSel] = VIOLET;
  let prevQ = beat > 0 ? walk(mach, word)[beat - 1] : mach.start;
  drawMachine(mach, mach.pos, { r: R0 + (flash * 6), names: mach.pos.map((_, q) => SOUNDS[snd[q] || 0][0]), nameSize: 12, labelSize: 15,
    edgeHi: (e) => (beat >= 0 && e.from === prevQ && e.to === curQ && e.syms.indexOf(word[beat]) >= 0 ? AMBER : null) });
  edDrawRubber(mach, R0);
  // ---- 入力（リズムの道順）
  let y = height - 150, cw = Math.min(40, (width * 0.6) / Math.max(1, word.length));
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('入力（1 小節 = ' + word.length + ' 拍）　' + cadence, 30, y - 12);
  for (let i = 0; i < word.length; i++) {
    stroke(...(i === beat ? AMBER : WIRE)); strokeWeight(i === beat ? 3 : 1); fill(...(i === beat ? [80, 60, 20] : PANEL)); rect(30 + i * cw, y, cw - 4, 36, 5);
    noStroke(); fill(...INK); textAlign(CENTER, CENTER); textSize(18); text(word[i], 30 + i * cw + cw / 2 - 2, y + 18);
  }
  // ---- ピアノロール（右）：行 = 音、横 = 時間
  let px = width * 0.66, py = 110, rh = 26, rw = (width - px - 40) / 48;
  fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('鳴った音（右がいま）', px, py - 8);
  SOUNDS.forEach((s, k) => { fill(...DIMC); textSize(12); textAlign(RIGHT, CENTER); text(s[0], px + 56, py + 14 + k * rh); stroke(...WIRE); strokeWeight(1); line(px + 62, py + 14 + k * rh, width - 40, py + 14 + k * rh); });
  rollHist.forEach((k, i) => { if (k < 0) return; noStroke(); fill(...(k < 3 ? CYAN : AMBER)); rect(px + 64 + i * rw, py + 4 + k * rh, Math.max(2, rw - 2), rh - 8, 3); });
  fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE);
  let ry = py + SOUNDS.length * rh + 30;
  ['同じ入力でも、矢印を 1 本変えると曲が変わる', 'キック → 1 → スネア、0 → ハイハット …のように', '「どの音のあとにどの音」を矢印で決めている', '入力を読み終えて二重丸にいれば終わりの和音'].forEach((t, i) => text(t, px, ry + i * 22));
  if (!audioCtx) { fill(...AMBER); textSize(16); text('▶ キャンバスをクリックすると音が出ます（音量は小さめに）', px, height - 60); }
  drawSelfTest(width - 180, height - 14);
}

function inArea(x, y) { return x < width * 0.62 && y > 100 && y < height - 170; }
let firstPress = true, swallow = false;  // 最初のクリック（音を ON にするクリック）では状態を足さない
function mousePressed(ev) {
  startAudio();
  if (firstPress) { firstPress = false; swallow = true; return; }
  if (inArea(mouseX, mouseY)) edPress(mach, mouseX, mouseY, R0, millis(), ev && ev.shiftKey);
}
function mouseDragged() { if (!swallow) edDragTo(mach, mouseX, mouseY); }
function mouseReleased() {
  if (swallow) { swallow = false; return; }
  let r = edRelease(mach, mouseX, mouseY, R0, inArea(mouseX, mouseY));
  if (r === 'add') snd[mach.n - 1] = 3 + (mach.n % 5);
}
function keyPressed() {
  startAudio();
  if (edPending && (key === '0' || key === '1')) { edLabel(mach, key); return false; }
  if (key === '0' || key === '1') { word = typeInto(word, key, '01', 16); return false; }
  if (key === 'Backspace') { word = word.slice(0, -1); beat = Math.min(beat, word.length - 1); }
  if (key === ' ') playing = !playing;
  if (key === 'r' || key === 'R') { word = ''; for (let i = 0; i < 16; i++) word += rnd() < 0.5 ? '0' : '1'; beat = -1; }
  if (key === UP_ARROW) bpm = Math.min(220, bpm + 10);
  if (key === DOWN_ARROW) bpm = Math.max(60, bpm - 10);
  if ((key === 'k' || key === 'K') && edSel >= 0 && edSel < mach.n) snd[edSel] = ((snd[edSel] || 0) + 1) % SOUNDS.length;
  if ((key === 'x' || key === 'X') && edSel >= 0 && edSel < mach.n && mach.n > 1) { snd.splice(edSel, 1); edDelete(mach, edSel); edSel = -1; curQ = mach.start; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let m = defaultMachine(0, 0, 100), p = walk(m, '0110');
  check('はじめの機械で 0110 を歩く：ハイハット → ソ → キック → ハイハット（状態 2 → 4 → 0 → 2）', p.join(',') === '2,4,0,2');
  check('入力が 16 拍なら音も 16 個、状態はいつも 0〜4（行き止まりなし）', walk(m, '0110100110010110').length === 16 && allStrings(['0', '1'], 8).every((s) => walk(m, s).every((q) => q >= 0 && q < 5)));
  let okAcc = allStrings(['0', '1'], 10).every((s) => s === '' || (walk(m, s)[s.length - 1] === 0) === dfaAccepts(m, s));
  check('終わりの和音が鳴る ⇔ 入力を読み終えて受理状態（キック）にいる（長さ 10 まで全部）', okAcc);
  let m2 = defaultMachine(0, 0, 100); delete m2.tr[0]['1'];
  check('矢印を消すと行き止まり（-1）になり、そのあとは休み', walk(m2, '0011').join(',') === '2,0,-1,-1');
  check('全体の音量 MASTER = ' + MASTER + ' ≤ 0.2、テンポ 120 で 1 拍 = 0.25 秒', MASTER <= 0.2 && Math.abs(60 / 120 / 2 - 0.25) < 1e-12);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 入力を 0000000000000000 にすると、キック → ハイハット → キック …の 2 拍のループ。1111 … だと？
// 2. 矢印を 1 本だけ（ドラッグで）変えて、同じ入力の曲がどう変わるか聞きくらべよう
// 3. K で状態の音をメロディ（ド・ミ・ソ・ラ）に変えて、0 と 1 で上がったり下がったりする機械を作ろう
// 4. 「最後がキックで終わるリズム」だけが受理になる。受理状態を変えて、終わりの和音が鳴る入力をさがそう
// 5. 02 の NFA のように「同時に 2 つの状態」にいられたら？ 和音が鳴る機械になる（ムーア型の出力 = 00）

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
// ---- 音の道具（Web Audio）。全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null, noiseBuf = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
    let d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  audioCtx.resume();
}
function playNote(freq, when, dur, wave, vol) {   // 1 音（やわらかく立ち上がって消える）
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = wave || 'triangle'; o.frequency.setValueAtTime(freq, when);
  gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(vol || 0.6, when + 0.015);
  gn.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + dur + 0.05);
}
function playKick(when) {               // バスドラム：周波数がすっと下がる正弦波
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.frequency.setValueAtTime(150, when); o.frequency.exponentialRampToValueAtTime(45, when + 0.15);
  gn.gain.setValueAtTime(0.9, when); gn.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + 0.3);
}
function playNoise(when, dur, hp, vol) { // スネア・ハイハット：雑音をフィルターで
  if (!audioCtx || !noiseBuf) return;
  let src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), gn = audioCtx.createGain();
  src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  gn.gain.setValueAtTime(vol || 0.5, when); gn.gain.exponentialRampToValueAtTime(0.001, when + dur);
  src.connect(f); f.connect(gn); gn.connect(masterOut); src.start(when); src.stop(when + dur + 0.02);
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
