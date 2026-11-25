// ============================================
// 05 単一化と論理プログラミング ─ 家系図の小さな Prolog。質問の目標を、規則の頭と「単一化」（同じ形にする代入を探す）して
// 体の目標に置きかえていく（SLD 導出）。目標がなくなれば □ ＝ 答え。どの規則を使うかで枝分かれする木を、深さ優先で探す。
// 単一化はロビンソンの方法：同じ記号なら中身どうしを、変数なら代入。X = f(X) は「出現検査」で失敗（無限の項になってしまう）
// ↑↓ 質問を選ぶ / スペース 探索の一時停止・再開 / ← → 木のノードを選ぶ / U 単一化のお手本を次へ / A 一度に全部
// ============================================

const PROGRAM = [                       // ★ プログラム（事実と規則）。大文字で始まるのが変数
  'parent(tom, bob)', 'parent(tom, liz)', 'parent(bob, ann)', 'parent(bob, pat)', 'parent(pat, jim)',
  'grandparent(X, Z) :- parent(X, Y), parent(Y, Z)',
  'ancestor(X, Y) :- parent(X, Y)',
  'ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y)',
  'anc_left(X, Y) :- anc_left(X, Z), parent(Z, Y)',     // 左再帰：深さ優先では止まらない
  'anc_left(X, Y) :- parent(X, Y)',
];
const QUERIES = ['parent(tom, X)', 'grandparent(tom, W)', 'ancestor(tom, D)', 'ancestor(A, jim)', 'grandparent(X, Y)', 'ancestor(jim, X)', 'anc_left(tom, D)'];
const UNIFY_EX = [['f(X, g(Y))', 'f(a, g(X))'], ['g(X, f(Y))', 'g(f(Z), X)'], ['h(X, Y, Z)', 'h(Y, Z, a)'], ['p(X, X)', 'p(a, b)'], ['X', 'f(X)'], ['f(X, a)', 'g(X, a)']];
const MAX_DEPTH = 10, MAX_NODES = 200, PER_FRAME = 2;   // ★ 探索の深さ・ノード数の上限、1 フレームに広げるノード数
let clauses = [], qIdx = 0, sldRoot = null, sldStack = [], sldNodes = [], paused = false, nodeSel = 0, uIdx = 0, renameCount = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  clauses = PROGRAM.map(parseClause);
  selfTest();
  startQuery(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
// ---- 項：{ v: 'X' } 変数 / { f: 'parent', args: [...] }（args が空なら定数）
function parseTerm(s) {
  let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const one = () => {
    ws(); let j = i; while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) i++;
    let name = s.slice(j, i); if (!name) throw '名前がない';
    if (/[A-Z_]/.test(name[0])) return { v: name };
    ws(); let args = [];
    if (s[i] === '(') { i++; do { args.push(one()); ws(); } while (s[i] === ',' && ++i); if (s[i] !== ')') throw '「)」がない'; i++; }
    return { f: name, args };
  };
  try { let t = one(); ws(); return i === s.length ? t : null; } catch (e) { return null; }
}
function parseClause(s) { let [h, b] = s.split(':-'); return { head: parseTerm(h.trim()), body: b ? b.split(/,(?![^(]*\))/).map((x) => parseTerm(x.trim())) : [], src: s }; }
function termStr(t) { return t.v !== undefined ? t.v : t.args.length ? t.f + '(' + t.args.map(termStr).join(', ') + ')' : t.f; }
function walk(t, s) { while (t.v !== undefined && s[t.v]) t = s[t.v]; return t; }
function resolve(t, s, d) { t = walk(t, s); if ((d || 0) > 50) return { f: '…', args: [] }; return t.v !== undefined ? t : { f: t.f, args: t.args.map((a) => resolve(a, s, (d || 0) + 1)) }; }
function occurs(v, t, s) { t = walk(t, s); if (t.v !== undefined) return t.v === v; return t.args.some((a) => occurs(v, a, s)); }
// ★ ロビンソンの単一化：等式のリストを 1 つずつ片づける。返り値 { sub（代入）| null, steps（説明） }
function unify(a, b, s0, occursCheck, log) {
  let s = Object.assign({}, s0 || {}), todo = [[a, b]], steps = [];
  while (todo.length) {
    let [x, y] = todo.shift(); x = walk(x, s); y = walk(y, s);
    if (x.v !== undefined && y.v !== undefined && x.v === y.v) continue;
    if (x.v === undefined && y.v !== undefined) [x, y] = [y, x];
    if (x.v !== undefined) {
      if (occursCheck !== false && occurs(x.v, y, s)) { if (log) steps.push('出現検査：' + x.v + ' が ' + termStr(resolve(y, s)) + ' の中にある → 失敗'); return { sub: null, steps }; }
      s[x.v] = y; if (log) steps.push('代入 ' + x.v + ' := ' + termStr(resolve(y, s)));
      continue;
    }
    if (x.f !== y.f || x.args.length !== y.args.length) { if (log) steps.push('記号がちがう：' + x.f + '/' + x.args.length + ' と ' + y.f + '/' + y.args.length + ' → 失敗'); return { sub: null, steps }; }
    if (log && x.args.length) steps.push('分解：' + termStr(resolve(x, s)) + ' = ' + termStr(resolve(y, s)) + ' → 引数どうし');
    x.args.forEach((xa, k) => todo.push([xa, y.args[k]]));
  }
  return { sub: s, steps };
}
function renameClause(c) {              // 規則を使うたびに変数の名前を新しくする（X → X_7）
  renameCount++; let m = {};
  const rn = (t) => (t.v !== undefined ? (m[t.v] = m[t.v] || { v: t.v + '_' + renameCount }) : { f: t.f, args: t.args.map(rn) });
  return { head: rn(c.head), body: c.body.map(rn) };
}
function termVars(t, out) { out = out || []; if (t.v !== undefined) { if (out.indexOf(t.v) < 0) out.push(t.v); } else t.args.forEach((a) => termVars(a, out)); return out; }
// ---- SLD 導出の木（深さ優先、上限つき）
function startQuery(k) {
  qIdx = (k + QUERIES.length) % QUERIES.length; renameCount = 0;
  let q = parseTerm(QUERIES[qIdx]);
  sldRoot = { goals: [q], sub: {}, depth: 0, kids: [], status: 'open', via: -1 }; sldRoot.qvars = termVars(q);
  sldStack = [sldRoot]; sldNodes = [sldRoot]; nodeSel = 0; paused = false;
}
function expandOne() {                  // スタックの先頭のノードを 1 つ広げる
  if (!sldStack.length) return false;
  let n = sldStack.pop();
  if (!n.goals.length) { n.status = 'success'; return true; }
  if (n.depth >= MAX_DEPTH) { n.status = 'bound'; return true; }
  if (sldNodes.length >= MAX_NODES) { n.status = 'bound'; sldStack.forEach((m) => (m.status = 'bound')); sldStack = []; return true; }
  let g = n.goals[0], kids = [];
  clauses.forEach((c, ci) => {
    if (c.head.f !== walk(g, n.sub).f) return;
    let rc = renameClause(c), u = unify(g, rc.head, n.sub);
    if (u.sub) kids.push({ goals: rc.body.concat(n.goals.slice(1)), sub: u.sub, depth: n.depth + 1, kids: [], status: 'open', via: ci, parent: n });
  });
  n.kids = kids; n.status = kids.length ? 'inner' : 'fail';
  for (let k = kids.length - 1; k >= 0; k--) sldStack.push(kids[k]);   // 先頭の規則から先に調べる（Prolog の順）
  sldNodes.push(...kids);
  return true;
}
function answers(root) {                // 成功した葉の、質問の変数への答え
  let out = [];
  const go = (n) => { if (n.status === 'success') out.push(root.qvars.map((v) => v + ' = ' + termStr(resolve({ v }, n.sub))).join(', ') || 'はい'); n.kids.forEach(go); };
  go(root); return out;
}
function runAll(k) { startQuery(k); while (expandOne()); return sldRoot; }

function draw() {
  background(...BG);
  hudTitle('単一化と論理プログラミング：?- ' + QUERIES[qIdx] + '.', '↑↓ 質問　スペース 一時停止・再開　← → ノードを選ぶ　U 単一化のお手本　A 一度に全部');
  if (!paused) for (let k = 0; k < PER_FRAME; k++) expandOne();
  // ---- プログラム
  noStroke(); textAlign(LEFT, BASELINE); textSize(14);
  clauses.forEach((c, i) => { let sel = sldNodes[nodeSel] && sldNodes[nodeSel].via === i; fill(...(sel ? YEL : i >= 8 ? DIMC : INK)); text((i + 1) + '. ' + c.src + '.', 30, 104 + i * 21); });
  // ---- 単一化のお手本
  let [ua, ub] = UNIFY_EX[uIdx], uo = unify(parseTerm(ua), parseTerm(ub), {}, true, true), y0 = 104 + clauses.length * 21 + 26;
  fill(...SKY); textSize(15); text('単一化（U で次）：' + ua + ' = ' + ub, 30, y0);
  uo.steps.forEach((s, k) => { fill(...(s.indexOf('失敗') >= 0 ? PINK : INK)); textSize(13); text((k + 1) + '. ' + s, 40, y0 + 22 + k * 19); });
  let ly = y0 + 26 + uo.steps.length * 19;
  if (uo.sub) { fill(...GRN); textSize(14); text('最も一般的な単一化子：{ ' + termVars(parseTerm(ua)).concat(termVars(parseTerm(ub))).filter((v, i, a) => a.indexOf(v) === i).map((v) => v + ' ↦ ' + termStr(resolve({ v }, uo.sub))).join(', ') + ' }', 40, ly); fill(...DIMC); text('両辺に代入すると：' + termStr(resolve(parseTerm(ua), uo.sub)) + '（同じ）', 40, ly + 20); }
  else if (ua === 'X') { fill(...DIMC); textSize(13); text('出現検査なしなら X := f(X) で「成功」→ X = f(f(f(…))) の無限の項になってしまう', 40, ly); }
  // ---- 右：SLD の木
  let tx = width * 0.42, tw = width - tx - 30, ty = 120, th = height - 330;
  let lay = layoutTree(sldRoot, (n) => n.kids, MAX_NODES), dy = lay.depth ? Math.min(46, th / lay.depth) : 0;
  const px = (o) => tx + o.x * tw, py = (o) => ty + o.depth * dy, col = { success: GRN, fail: PINK, bound: YEL, open: DIMC, inner: SKY };
  stroke(...LINEC); strokeWeight(1);
  for (let o of lay.nodes) if (o.parent) line(px(o.parent), py(o.parent), px(o), py(o));
  nodeSel = clampv(nodeSel, 0, sldNodes.length - 1);
  let selN = sldNodes[nodeSel];
  for (let o of lay.nodes) {
    let n = o.node; noStroke(); fill(...col[n.status]); circle(px(o), py(o), n === selN ? 16 : 10);
    if (n.status === 'success' || n.status === 'fail' || n.status === 'bound') { textSize(11); textAlign(CENTER, TOP); text(n.status === 'success' ? '□' : n.status === 'fail' ? '✗' : '…', px(o), py(o) + 7); }
    if (n.via >= 0 && lay.nodes.length < 40) { fill(...DIMC); textSize(10); textAlign(CENTER, BOTTOM); text(n.via + 1, (px(o) + px(o.parent)) / 2 - 6, (py(o) + py(o.parent)) / 2); }
  }
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, TOP);
  text('SLD 導出の木：ノード ' + sldNodes.length + (sldStack.length ? '（探索中' + (paused ? '・一時停止' : '') + '）' : '（終わり）') + '　水色 = 途中、緑 □ = 成功、桃 ✗ = 失敗、黄 … = 上限（深さ ' + MAX_DEPTH + '・ノード ' + MAX_NODES + '）', tx, 92);
  // ---- 選んだノードと答え
  let by = height - 196;
  if (selN) {
    fill(...INK); textSize(14); text('選んだノード（深さ ' + selN.depth + (selN.via >= 0 ? '、規則 ' + (selN.via + 1) + ' を使った' : '') + '）', tx, by);
    fill(...SKY); text('目標：' + (selN.goals.length ? selN.goals.map((g) => termStr(resolve(g, selN.sub))).join(', ') : '□（全部片づいた = 成功）'), tx, by + 22);
    fill(...DIMC); text('質問の変数：' + (sldRoot.qvars.map((v) => v + ' = ' + termStr(resolve({ v }, selN.sub))).join(', ') || 'なし'), tx, by + 44);
  }
  let ans = answers(sldRoot);
  fill(...GRN); textSize(15); text('答え（' + ans.length + ' 個）：' + (ans.length ? ans.join('　|　') : sldStack.length ? '…' : 'なし（no）'), tx, by + 76, tw, 60);
  if (sldNodes.some((n) => n.status === 'bound')) { fill(...YEL); textSize(13); text('上限に当たった枝がある：この先に答えがあるかもしれない（左再帰は深さ優先では止まらない）', tx, by + 134); }
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === UP_ARROW) startQuery(qIdx - 1);
  if (key === DOWN_ARROW) startQuery(qIdx + 1);
  if (key === LEFT_ARROW) nodeSel = Math.max(0, nodeSel - 1);
  if (key === RIGHT_ARROW) nodeSel = Math.min(sldNodes.length - 1, nodeSel + 1);
  if (key === ' ') paused = !paused;
  if (key === 'u' || key === 'U') uIdx = (uIdx + 1) % UNIFY_EX.length;
  if (key === 'a' || key === 'A') while (expandOne());
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let a = parseTerm('f(X, g(Y))'), b = parseTerm('f(a, g(X))'), u = unify(a, b, {}, true);
  check('f(X, g(Y)) = f(a, g(X)) の単一化子は { X ↦ a, Y ↦ a } で、代入すると両辺が同じ', u.sub && termStr(resolve({ v: 'X' }, u.sub)) === 'a' && termStr(resolve({ v: 'Y' }, u.sub)) === 'a' && termStr(resolve(a, u.sub)) === termStr(resolve(b, u.sub)));
  check('X = f(X) は出現検査で失敗、出現検査なしだと「成功」してしまう', !unify(parseTerm('X'), parseTerm('f(X)'), {}, true).sub && !!unify(parseTerm('X'), parseTerm('f(X)'), {}, false).sub);
  check('p(X, X) = p(a, b) と f(X, a) = g(X, a) は失敗', !unify(parseTerm('p(X, X)'), parseTerm('p(a, b)')).sub && !unify(parseTerm('f(X, a)'), parseTerm('g(X, a)')).sub);
  seedRng(9); let okR = 0, nOk = 0;
  const rt = (d) => { let r = rnd(); if (d <= 0 || r < 0.35) return rnd() < 0.5 ? { v: rndPick(['X', 'Y', 'Z']) } : { f: rndPick(['a', 'b']), args: [] }; let k = rndInt(1, 2); let args = []; for (let i = 0; i < k; i++) args.push(rt(d - 1)); return { f: rndPick(['f', 'g']), args }; };
  for (let t = 0; t < 300; t++) { let x = rt(3), y = rt(3), o = unify(x, y, {}, true); if (!o.sub) { okR++; continue; } nOk++; if (termStr(resolve(x, o.sub)) === termStr(resolve(y, o.sub))) okR++; }
  check('でたらめな項の組 300 個：単一化できたもの（' + nOk + ' 組）は代入すると必ず両辺が同じ', okR === 300 && nOk > 30);
  const set = (k) => new Set(answers(runAll(k)));
  const eqSet = (s, arr) => s.size === arr.length && arr.every((x) => s.has(x));
  check('?- ancestor(tom, D). の答え = { bob, liz, ann, pat, jim }', eqSet(set(2), ['D = bob', 'D = liz', 'D = ann', 'D = pat', 'D = jim']));
  check('?- grandparent(tom, W). の答え = { ann, pat }、?- ancestor(A, jim). = { pat, bob, tom }', eqSet(set(1), ['W = ann', 'W = pat']) && eqSet(set(3), ['A = pat', 'A = bob', 'A = tom']));
  let facts = clauses.filter((c) => c.head.f === 'parent').map((c) => c.head.args.map(termStr)), gp = [];
  for (let [p, q] of facts) for (let [r, s] of facts) if (q === r) gp.push('X = ' + p + ', Y = ' + s);
  check('?- grandparent(X, Y).（質問と規則の変数の名前が同じ）の答え = 事実から直接作った祖父母の組 ' + gp.length + ' 個', eqSet(set(4), gp));
  check('?- ancestor(jim, X). は答えなしで、木は上限に当たらずに終わる', set(5).size === 0 && !sldNodes.some((n) => n.status === 'bound'));
  runAll(6);
  check('?- anc_left(tom, D).（左再帰）は深さ ' + MAX_DEPTH + ' の上限に当たり、ノードは ' + MAX_NODES + ' 個以下', sldNodes.some((n) => n.status === 'bound') && sldNodes.length <= MAX_NODES + 10);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ?- ancestor(tom, D). の木で、規則 7 と 8 のどちらを使うと何が起こる？ ← → でノードをたどろう
// 2. 規則 8 の体の順番を「ancestor(Z, Y), parent(X, Z)」に入れかえると？（anc_left と同じ左再帰になる）
// 3. PROGRAM に家族を足そう：parent(liz, sue) など。答えはどう増える？
// 4. 単一化のお手本 g(X, f(Y)) = g(f(Z), X)：X := f(Z) のあと f(Y) = f(Z) が残る。順番を追ってみよう
// 5. sibling(X, Y) :- parent(P, X), parent(P, Y). を足すと、自分自身も兄弟になってしまう。なぜ？（X と Y が同じでも単一化できる）

// ==================================================
// ここから下は「論理の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（黒板とチョーク）
const BG = [40, 54, 47];                // 背景（黒板の灰緑）
const INK = [238, 238, 228];            // 文字（白いチョーク）
const YEL = [246, 218, 120], SKY = [128, 186, 222], PINK = [238, 146, 150], GRN = [164, 214, 146], LILAC = [196, 170, 230];
const DIMC = [150, 166, 156], PANEL = [50, 66, 58], LINEC = [92, 112, 102];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; return v.toFixed(d === undefined ? 2 : d); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明（日本語は 1 文字ずつ折り返す）
  textWrap(CHAR); noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function typeInto(s, ch, allowed, maxLen) {   // 文字の入力：allowed に入っている 1 文字だけ足す（長さの上限つき）
  if (typeof ch !== 'string' || ch.length !== 1 || allowed.indexOf(ch) < 0) return s;
  return s.length < (maxLen || 40) ? s + ch : s;
}
function chalkPanel(x, y, w, h) { noStroke(); fill(...PANEL); rect(x, y, w, h, 8); }
function drawInputLine(x, y, label, s, err, active) {   // 入力欄：文字列と、まちがいの説明
  noStroke(); fill(...(active === false ? DIMC : YEL)); textSize(15); textAlign(LEFT, BASELINE); text(label, x, y);
  let lx = x + textWidth(label) + 8;
  fill(...INK); textSize(20); text(s + (active !== false && frameCount % 60 < 30 ? '▏' : ''), lx, y + 1);
  if (err) { fill(...PINK); textSize(14); text('✗ ' + err, lx, y + 22); }
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
// ---- 木の描き方：葉を左から順に並べ、親は子の真ん中
function layoutTree(root, kids, maxNodes) {   // 返り値 [{node, x（0〜1）, depth, parent}]、depth の最大
  let out = [], leaves = 0, maxD = 0;
  const walk = (n, d, parent) => {
    if (out.length >= (maxNodes || 400)) return null;
    let me = { node: n, depth: d, parent, x: 0 }; out.push(me); maxD = Math.max(maxD, d);
    let ks = kids(n), xs = [];
    for (let k of ks) { let c = walk(k, d + 1, me); if (c) xs.push(c.x); }
    me.x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : leaves++;
    return me;
  };
  walk(root, 0, null);
  for (let o of out) o.x = leaves > 1 ? o.x / (leaves - 1) : 0.5;
  return { nodes: out, depth: maxD, leaves };
}
function drawTree(lay, x, y, w, h, label, col, r) {   // 線と丸と文字。col(node) で色
  r = r || 16;
  let dy = lay.depth > 0 ? Math.min(60, h / lay.depth) : 0, px = (o) => x + o.x * w, py = (o) => y + o.depth * dy;
  stroke(...LINEC); strokeWeight(1.5);
  for (let o of lay.nodes) if (o.parent) line(px(o.parent), py(o.parent), px(o), py(o));
  for (let o of lay.nodes) {
    let c = col ? col(o.node) : INK;
    stroke(...c); strokeWeight(1.5); fill(...BG); circle(px(o), py(o), r * 2);
    noStroke(); fill(...c); textAlign(CENTER, CENTER); textSize(r * 0.95); text(label(o.node), px(o), py(o) + 1);
  }
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? GRN : PINK)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
