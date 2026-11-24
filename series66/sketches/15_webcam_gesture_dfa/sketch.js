// ============================================
// 15 身ぶりをオートマトンで認識 📷 ─ カメラの「動いた所」（前のフレームとの差）の重心がどちらへ動いたかを
// 左 L・右 R・上 U・下 D の記号に変え、その記号の列を DFA で読む。身ぶりは正規表現で書き、
// (L|R|U|D)*(身ぶり) を トンプソン構成 → 部分集合構成 → 最小化 して「いつ終わってもよい」認識の DFA にする（04 → 02 → 03）。
// 受理状態に着いたら認識！ その DFA は最初にもどる。カメラが使えないときはマウスを大きく動かす
// 1 2 3 図に出す身ぶり / ↑↓ 感度 / C カメラ ⇔ マウス / X 記号の列を消す / S 画面を保存
// ============================================

const GESTURES = [                      // ★ [名前, 正規表現（記号 L R U D）]
  ['手を振る（左右左右）', 'LRLR|RLRL'],
  ['うなずく（上下上下）', 'UDUD|DUDU'],
  ['円を描く（右回り）', 'RDLU|DLUR|LURD|URDL'],
];
const CAM_W = 64, CAM_H = 48;
let sens = 1.0;                         // ★ 感度（大きいほど小さな動きでも記号が出る）
let idle = 0, lastSym = null, sinceSym = 0, recs = [], showG = 0, cap = null, useCam = true, prevGray = null, cen = null, track = [], acc = { x: 0, y: 0 }, cool = 0, stream = '', lastMouse = null, flashG = -1, flashT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  recs = GESTURES.map((g) => buildRecognizer(g[1]));
  selfTest();
  layoutRecs();
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(CAM_W, CAM_H); cap.hide(); } catch (e) { cap = null; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layoutRecs(); }
// ★ 身ぶりの認識 DFA：(L|R|U|D)*(身ぶり) → NFA → DFA → 最小 DFA
function buildRecognizer(re) {
  let nfa = thompson(parseRegex('(L|R|U|D)*(' + re + ')').ast); nfa.alpha = ['D', 'L', 'R', 'U'];
  let sub = subsetConstruct(nfa), mn = minimizeMoore(sub.dfa);
  return { nfa, big: sub.dfa, dfa: mn.min, q: mn.min.start, count: 0, pos: [] };
}
function layoutRecs() { for (let r of recs) r.pos = circleLayout(r.dfa.n, width * 0.72, height * 0.5, Math.min(width * 0.14, height * 0.22), Math.PI); }
function feed(sym) {                    // 記号を 1 つ全部の DFA に読ませる
  stream = (stream + sym).slice(-28);
  recs.forEach((r, k) => {
    r.q = dfaNext(r.dfa, r.q, sym);
    if (r.q >= 0 && r.dfa.acc[r.q]) { r.count++; flashG = k; flashT = 60; r.q = r.dfa.start; }   // 認識！ 最初にもどる
    if (r.q < 0) r.q = r.dfa.start;
  });
}
// ★ 動きの向き → 記号：たまった移動量が しきい値 をこえ、縦横の片方が 1.5 倍以上大きいとき
function symbolFrom(a, thresh) {
  if (Math.abs(a.x) > thresh && Math.abs(a.x) > 1.5 * Math.abs(a.y)) return a.x > 0 ? 'R' : 'L';
  if (Math.abs(a.y) > thresh && Math.abs(a.y) > 1.5 * Math.abs(a.x)) return a.y > 0 ? 'D' : 'U';
  return null;
}
function camLive() { return useCam && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }
function motionCentroid() {             // フレーム差分の重心（0〜1 の座標）と動きの量
  cap.loadPixels(); if (!cap.pixels || cap.pixels.length < CAM_W * CAM_H * 4) return null;
  let g = new Float32Array(CAM_W * CAM_H), sx = 0, sy = 0, sw = 0;
  for (let i = 0; i < g.length; i++) g[i] = (cap.pixels[4 * i] + cap.pixels[4 * i + 1] + cap.pixels[4 * i + 2]) / 3;
  if (prevGray) for (let i = 0; i < g.length; i++) { let d = Math.abs(g[i] - prevGray[i]); if (d > 30) { sx += (i % CAM_W) * d; sy += Math.floor(i / CAM_W) * d; sw += d; } }
  prevGray = g;
  return sw > 2000 ? { x: sx / sw / CAM_W, y: sy / sw / CAM_H, amt: sw } : null;
}

function draw() {
  background(...BG);
  hudTitle('身ぶりをオートマトンで認識：' + (camLive() ? 'カメラの前で手を動かそう' : 'マウスを大きく動かそう（カメラなし）'), '1 2 3 図に出す身ぶり　↑↓ 感度 ' + fmtN(sens, 1) + '　C カメラ ⇔ マウス　X 記号の列を消す　S 画面を保存');
  // ---- 動き → 記号
  let vx = 30, vy = 90, vw = width * 0.42, vh = vw * 0.75, p = null;
  if (camLive()) { let c = motionCentroid(); if (c) p = { x: c.x * vw, y: c.y * vh }; }
  else if (lastMouse) { if (dist(mouseX, mouseY, lastMouse.x, lastMouse.y) > 2) p = { x: clampv(mouseX - vx, 0, vw), y: clampv(mouseY - vy, 0, vh) }; }
  lastMouse = { x: mouseX, y: mouseY };
  if (p) { if (cen) { acc.x += p.x - cen.x; acc.y += p.y - cen.y; } cen = p; idle = 0; track.push(p); if (track.length > 30) track.shift(); }
  else {                                // 動きが止まったら：少し待ってから移動量を減らし、0.5 秒で重心を忘れる
    idle++;
    if (idle > 8) { acc.x *= 0.85; acc.y *= 0.85; if (track.length) track.shift(); }
    if (idle > 30) cen = null;
  }
  if (cool > 0) cool--;
  let sym = cool === 0 ? symbolFrom(acc, (vw * 0.18) / sens) : null;
  sinceSym++;
  if (sym) {                            // 同じ向きへの 1 回の大きな動きは 1 記号だけ（向きが変わるか、少し止まるまで同じ記号は出さない）
    if (!(sym === lastSym && sinceSym < 40)) { feed(sym); lastSym = sym; }
    sinceSym = 0; acc = { x: 0, y: 0 }; cool = 10;
  }
  // ---- 映像
  if (camLive()) image(cap, vx, vy, vw, vh); else { noStroke(); fill(...PANEL); rect(vx, vy, vw, vh, 8); fill(...DIMC); textSize(14); textAlign(CENTER, CENTER); text('マウスをこの中で大きく動かす', vx + vw / 2, vy + vh / 2); }
  if (track.length > 1) { noFill(); stroke(...AMBER); strokeWeight(3); beginShape(); for (let t of track) vertex(vx + t.x, vy + t.y); endShape(); }   // 空の図形は描かない
  if (cen) { noStroke(); fill(...AMBER); circle(vx + cen.x, vy + cen.y, 14); }
  // ---- 記号の列
  let sy0 = vy + vh + 30;
  noStroke(); fill(...INK); textSize(15); textAlign(LEFT, BASELINE); text('記号の列（新しいのが右）', vx, sy0);
  let arrows = { L: '←', R: '→', U: '↑', D: '↓' };
  for (let i = 0; i < stream.length; i++) { fill(...PANEL); rect(vx + i * 26, sy0 + 10, 23, 30, 4); fill(...(i === stream.length - 1 ? AMBER : INK)); textAlign(CENTER, CENTER); textSize(16); text(arrows[stream[i]], vx + i * 26 + 11, sy0 + 25); }
  recs.forEach((r, k) => { fill(...(flashG === k && flashT > 0 ? LIME : k === showG ? INK : DIMC)); textAlign(LEFT, BASELINE); textSize(16);
    text((k + 1) + '. ' + GESTURES[k][0] + '　' + GESTURES[k][1].replace(/\|/g, ' | ') + '　認識 ' + r.count + ' 回', vx, sy0 + 76 + k * 26); });
  if (flashT > 0) { flashT--; fill(...LIME, 255 * flashT / 60); textSize(34); textAlign(CENTER, CENTER); text(GESTURES[flashG][0].split('（')[0] + '！', vx + vw / 2, vy + 40); }
  // ---- 選んだ身ぶりの DFA
  let r = recs[showG], hi = {}; hi[r.q] = AMBER;
  fill(...INK); textSize(15); textAlign(LEFT, BASELINE);
  text('「' + GESTURES[showG][0] + '」の認識 DFA', width * 0.52, 100);
  fill(...DIMC); textSize(13);
  text('NFA ' + r.nfa.n + ' 状態 → 部分集合構成 ' + r.big.n + ' 状態 → 最小化 ' + r.dfa.n + ' 状態。矢印 = 記号（' + 'D L R U' + '）', width * 0.52, 122);
  drawMachine(r.dfa, r.pos, { r: 22, hi, labelSize: 12, nameSize: 13 });
  drawSelfTest(width - 180, height - 14);
}

function keyPressed() {
  if (key >= '1' && key <= '3') showG = +key - 1;
  if (key === UP_ARROW) sens = Math.min(3, sens + 0.2);
  if (key === DOWN_ARROW) sens = Math.max(0.4, sens - 0.2);
  if (key === 'c' || key === 'C') { useCam = !useCam; prevGray = null; cen = null; track = []; }
  if (key === 'x' || key === 'X') { stream = ''; lastSym = null; recs.forEach((r) => (r.q = r.dfa.start)); }
  if (key === 's' || key === 'S') saveCanvas('gesture_dfa', 'png');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let words = allStrings(['D', 'L', 'R', 'U'], 6), ok = true, okMin = true;
  recs.forEach((r, k) => {
    let js = new RegExp('(' + GESTURES[k][1] + ')$');
    for (let s of words) { let v = js.test(s); if (nfaAccepts(r.nfa, s) !== v || dfaAccepts(r.dfa, s) !== v) { ok = false; break; } }
    if (dfaEquivalent(r.big, r.dfa) !== null || r.dfa.n > r.big.n) okMin = false;
  });
  check('3 つの身ぶり：NFA = 最小 DFA = 「その身ぶりで終わる」（記号 4 種、長さ 6 までの全部 5461 個）', ok);
  check('最小 DFA は部分集合構成の DFA と同じ言語（積の BFS）で、状態は同じか少ない（' + recs.map((r) => r.big.n + '→' + r.dfa.n).join('、') + '）', okMin);
  let saved = recs.map((r) => ({ q: r.q, c: r.count })), keepStream = stream;
  for (let c of 'LRLRUDUDLRUD') feed(c);
  check('記号の列 LRLR UDUD LRUD を読むと：手を振る 1 回・うなずく 1 回（LRUD では何も認識しない）', recs[0].count === 1 && recs[1].count === 1 && recs[2].count === 0);
  recs.forEach((r, k) => { r.q = saved[k].q; r.count = saved[k].c; }); stream = keepStream;
  check('動き → 記号：右へ 40 → R、上へ 40 → U、ななめ (30, 25) と小さな動きは記号なし', symbolFrom({ x: 40, y: 3 }, 20) === 'R' && symbolFrom({ x: -2, y: -40 }, 20) === 'U' && symbolFrom({ x: 30, y: 25 }, 20) === null && symbolFrom({ x: 5, y: 0 }, 20) === null);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. カメラの前で手を左右に 2 往復。記号の列に ← → ← → が並んで「手を振る！」になるか確かめよう（↑↓ で感度）
// 2. GESTURES に新しい身ぶりを足そう：「L L L」（左へ 3 回スワイプ）、「(LR)+U」（振ってから上げる）など
// 3. 右の DFA の状態の数は、身ぶりの長さとどう関係する？ 03 の最小化がなければ何状態？
// 4. 円を左回りでも認識させるには？ 正規表現に | で足すだけ（DFA は自動で作り直される）
// 5. ゲームのコマンド入力（↓↘→ + パンチ）や、スマホのジェスチャーも同じしくみで作れる

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
