// ============================================
// 06 意味のタブロー ─ 「φ は恒真？」を、¬φ（φ が偽になる）から出発して確かめる木
// ∧ のような式は 1 本の枝に 2 つ並べ（α 規則）、∨ のような式は枝を 2 つに分ける（β 規則）。枝の上に p と ¬p が両方あれば
// その枝は閉じる ✗（ありえない）。全部の枝が閉じたら ¬φ はありえない ＝ φ は恒真。開いたまま終わった枝 ○ からは反例が読める
// 文字キー = 入力（00 と同じ）/ Backspace / Esc 全部消す / ↑↓ お手本 / → 1 歩広げる / ← もどる / Enter 最後まで
// ============================================

const PRESETS = [                       // ★ お手本
  '((p → q) → p) → p',
  '(p → q) → (¬q → ¬p)',
  '(p ∨ q) ∧ ¬p → q',
  '(p → q) ∧ (q → r) → (p → r)',
  'p → q',
  'p ∨ q → p',
  '¬(p ∧ q) ↔ ¬p ∨ ¬q',
];
const MAX_NODES = 300;                  // ★ 木の大きさの上限
let src = '', pIdx = 0, f0 = null, err = '', tab = null, nSteps = 0, totalSteps = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadPreset(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function loadPreset(i) { pIdx = (i + PRESETS.length) % PRESETS.length; src = PRESETS[pIdx]; rebuild(); }
function rebuild() {
  let r = parseFormula(src);
  if (r.error) { err = r.error + '（' + (r.at + 1) + ' 文字目あたり）'; return; }
  err = ''; f0 = r.f;
  let full = buildTableau(f0, 1e9, MAX_NODES); totalSteps = full.steps; nSteps = 0; tab = buildTableau(f0, nSteps, MAX_NODES);
}
// ★ 規則：返り値 { kind: 'a'（1 本に並べる）| 'b'（2 つに分ける）, parts: [[式…], [式…]] } / null（文字か定数）
function tabRule(f) {
  let n = f.op === 'not' ? f.a : null;
  if (n && n.op === 'not') return { kind: 'a', parts: [[n.a]], name: '¬¬' };
  if (f.op === 'and') return { kind: 'a', parts: [[f.a, f.b]], name: '∧' };
  if (n && n.op === 'or') return { kind: 'a', parts: [[fNot(n.a), fNot(n.b)]], name: '¬∨' };
  if (n && n.op === 'imp') return { kind: 'a', parts: [[n.a, fNot(n.b)]], name: '¬→' };
  if (f.op === 'or') return { kind: 'b', parts: [[f.a], [f.b]], name: '∨' };
  if (n && n.op === 'and') return { kind: 'b', parts: [[fNot(n.a)], [fNot(n.b)]], name: '¬∧' };
  if (f.op === 'imp') return { kind: 'b', parts: [[fNot(f.a)], [f.b]], name: '→' };
  if (f.op === 'iff') return { kind: 'b', parts: [[f.a, f.b], [fNot(f.a), fNot(f.b)]], name: '↔' };
  if (n && n.op === 'iff') return { kind: 'b', parts: [[f.a.a, fNot(f.a.b)], [fNot(f.a.a), f.a.b]], name: '¬↔' };
  return null;
}
function pathOf(node) { let p = []; while (node) { p.unshift(node); node = node.parent; } return p; }
function closesWith(path) {             // 枝が閉じるか：⊥、¬⊤、または A と ¬A
  let seen = new Set(path.map((n) => fmlStr(n.f)));
  for (let n of path) { if (n.f.op === 'bot' || (n.f.op === 'not' && n.f.a.op === 'top')) return [n]; if (n.f.op === 'not' && seen.has(fmlStr(n.f.a))) return [n, path.find((m) => fmlStr(m.f) === fmlStr(n.f.a))]; }
  return null;
}
// ★ タブローを maxSteps 回だけ広げる。各枝で「まだ使っていない式」を α 優先で 1 つ選んで規則を使う
function buildTableau(f, maxSteps, maxNodes) {
  let root = { f: fNot(f), kids: [], parent: null, id: 0, used: new Set() }, nodes = [root], steps = 0, hitBound = false;
  root.status = closesWith([root]) ? 'closed' : 'open';
  while (steps < maxSteps) {
    let leaf = nodes.find((n) => !n.kids.length && n.status === 'open');
    if (!leaf) break;
    let path = pathOf(leaf), cand = path.filter((n) => !leaf.used.has(n.id) && tabRule(n.f));
    let pick = cand.find((n) => tabRule(n.f).kind === 'a') || cand[0];
    if (!pick) { leaf.status = 'done'; continue; }       // もう使える式がない ＝ 開いた枝（反例）
    if (nodes.length >= maxNodes) { hitBound = true; leaf.status = 'bound'; break; }
    let rule = tabRule(pick.f); steps++;
    let used = new Set(leaf.used); used.add(pick.id);
    for (let part of rule.parts) {
      let parent = leaf;
      for (let g of part) { let nd = { f: g, kids: [], parent, id: nodes.length, used, from: pick.id, rule: rule.name, status: 'open' }; parent.kids.push(nd); nodes.push(nd); parent = nd; }
      let c = closesWith(pathOf(parent)); if (c) { parent.status = 'closed'; parent.clash = c; }
    }
    for (let n of nodes) if (n.kids.length) n.status = 'inner';
  }
  let leaves = nodes.filter((n) => !n.kids.length);
  let closed = leaves.every((n) => n.status === 'closed'), openLeaf = leaves.find((n) => n.status === 'done');
  return { root, nodes, steps, hitBound, closed, finished: closed || !!openLeaf || leaves.every((n) => n.status !== 'open'), openLeaf };
}
function counterModel(leaf, f) {        // 開いた枝の上の文字から割り当てを作る（出てこない変数は 0）
  let env = {}; fmlVars(f).forEach((v) => (env[v] = false));
  for (let n of pathOf(leaf)) if (n.f.op === 'var') env[n.f.name] = true;
  return env;
}

function draw() {
  background(...BG);
  hudTitle('意味のタブロー：¬φ から始めて、全部の枝が閉じれば φ は恒真', '文字キーで入力　Backspace / Esc 消す　↑↓ お手本　→ 1 歩　← もどる　Enter 最後まで');
  drawInputLine(30, 104, '式 φ：', src, err);
  if (!tab) return;
  // ---- 木
  let lay = layoutTree(tab.root, (n) => n.kids, MAX_NODES), x0 = 50, w = width - 100, y0 = 160, h = height - 290;
  let dy = lay.depth ? Math.min(38, h / lay.depth) : 0, ts = clampv(Math.min(dy * 0.5, (w / Math.max(1, lay.leaves)) / 7), 9, 16);
  const px = (o) => x0 + o.x * w, py = (o) => y0 + o.depth * dy;
  stroke(...LINEC); strokeWeight(1.2);
  for (let o of lay.nodes) if (o.parent) line(px(o.parent), py(o.parent) + ts * 0.6, px(o), py(o) - ts * 0.6);
  textSize(ts);
  for (let o of lay.nodes) {
    let n = o.node, s = fmlStr(n.f), col = n.id === 0 ? YEL : n.f.op === 'var' || (n.f.op === 'not' && n.f.a.op === 'var') ? SKY : INK;
    noStroke(); fill(...BG); let tw = textWidth(s) + 8; rect(px(o) - tw / 2, py(o) - ts * 0.7, tw, ts * 1.4);
    fill(...col); textAlign(CENTER, CENTER); text(s, px(o), py(o));
    if (!n.kids.length) {
      let mark = n.status === 'closed' ? '✗' : n.status === 'done' ? '○' : n.status === 'bound' ? '…' : '';
      fill(...(n.status === 'closed' ? PINK : n.status === 'done' ? GRN : YEL)); textSize(ts + 2); text(mark, px(o), py(o) + ts * 1.3); textSize(ts);
    }
  }
  // ---- 判定
  let by = height - 110, tt = classifyFml(f0).kind === 'taut';
  noStroke(); textAlign(LEFT, BASELINE); textSize(20);
  if (tab.closed) { fill(...GRN); text('全部の枝が閉じた ✗ → ¬φ はありえない → φ は恒真', 30, by); }
  else if (tab.openLeaf) { let env = counterModel(tab.openLeaf, f0); fill(...PINK); text('開いた枝 ○ が残った → 反例：' + Object.keys(env).map((v) => v + ' = ' + (env[v] ? 1 : 0)).join(', ') + '（このとき φ は ' + (evalFml(f0, env) ? '真!?' : '偽') + '）', 30, by); }
  else if (tab.hitBound) { fill(...YEL); text('上限 ' + MAX_NODES + ' ノードに当たった', 30, by); }
  else { fill(...INK); text('広げている途中：' + nSteps + ' / ' + totalSteps + ' 歩（→ で続ける）', 30, by); }
  fill(...DIMC); textSize(14);
  text('真理値表の答え：' + (tt ? '恒真' : '恒真ではない') + '　→　' + (tab.closed || tab.openLeaf ? (tab.closed === tt ? '一致 ✓（健全性：閉じれば恒真、完全性：恒真なら必ず閉じる）' : '不一致 ✗') : 'タブローは途中'), 30, by + 28);
  text('α 規則（1 本に並べる）：∧、¬∨、¬→、¬¬　　β 規則（枝分かれ）：∨、¬∧、→、↔、¬↔　　α を先に使うと木が小さくなる。ノード ' + tab.nodes.length, 30, by + 52);
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === UP_ARROW) { loadPreset(pIdx - 1); return false; }
  if (key === DOWN_ARROW) { loadPreset(pIdx + 1); return false; }
  if (f0 && (key === RIGHT_ARROW || key === LEFT_ARROW || key === 'Enter')) {
    nSteps = key === 'Enter' ? totalSteps : clampv(nSteps + (key === RIGHT_ARROW ? 1 : -1), 0, totalSteps);
    tab = buildTableau(f0, nSteps, MAX_NODES); return false;
  }
  if (key === 'Backspace') src = src.slice(0, -1);
  else if (key === 'Escape' || key === 'Delete') src = '';
  else src = typeInto(src, key, FML_KEYS, 80);
  rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(17); let agree = 0, N = 300, cmOk = true, nValid = 0, bound = 0, clashOk = true;
  for (let k = 0; k < N; k++) {
    let f = randomFml(rndInt(2, 4), ['p', 'q', 'r', 's'], true), t = buildTableau(f, 1e9, 2000);
    if (t.hitBound) { bound++; continue; }
    let tt = classifyFml(f).kind === 'taut'; if (tt) nValid++;
    if (t.closed === tt) agree++;
    if (!t.closed && (!t.openLeaf || evalFml(f, counterModel(t.openLeaf, f)))) cmOk = false;
    for (let n of t.nodes) if (n.status === 'closed' && !closesWith(pathOf(n))) clashOk = false;
  }
  check('でたらめな式 ' + N + ' 個（恒真 ' + nValid + ' 個）：タブローが閉じる ⇔ 真理値表で恒真（上限に当たった ' + bound + ' 個を除く）', agree === N - bound && bound === 0 && nValid > 10);
  check('恒真でない式では、開いた枝から読んだ割り当てで φ が本当に偽になる（反例）', cmOk);
  check('閉じた枝には必ず A と ¬A（または ⊥）が両方ある', clashOk);
  let pe = buildTableau(parseFormula('((p -> q) -> p) -> p').f, 1e9, MAX_NODES), pq = buildTableau(parseFormula('p -> q').f, 1e9, MAX_NODES);
  check('パースの法則は閉じる、p → q は開いて反例 p = 1, q = 0', pe.closed && !pq.closed && pq.openLeaf && JSON.stringify(counterModel(pq.openLeaf, parseFormula('p -> q').f)) === '{"p":true,"q":false}');
  let big = buildTableau(parseFormula('(a<->b)<->((c<->d)<->(e<->f))').f, 1e9, 40);
  check('大きな式で上限（40 ノード）にすると「上限に当たった」と報告する', big.hitBound && big.nodes.length <= 42);
  let st = buildTableau(parseFormula('(p & q) -> p').f, 1e9, MAX_NODES);
  check('(p ∧ q) → p は α 規則だけで閉じる（枝分かれなし：¬φ、p ∧ q、¬p、p、q の 5 個）', st.closed && st.nodes.length === 5 && st.nodes.every((n) => n.kids.length <= 1));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. パースの法則を → で 1 歩ずつ。¬(A → B) は A と ¬B を並べる（α）。最後に p と ¬p がそろって閉じる
// 2. p ∨ q → p は閉じない。開いた枝 ○ を根までたどって、反例の割り当てを読もう
// 3. ¬(p ∧ q) ↔ ¬p ∨ ¬q は ↔ で枝が 2 つに分かれる。真理値表（00）と同じ答えになるのを確かめよう
// 4. tabRule の中で β 規則を先に使うようにすると、木の大きさはどう変わる？（ノードの数をくらべる）
// 5. 一階述語論理のタブローでは ∀x の式に何度でも新しい値を入れられるので、木が止まらないことがある（上限が要る理由）

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
// ---- 論理式の道具：字句 → 構文木（再帰下降）→ 文字列・真理値
// 構文木 = { op: 'var', name } / { op: 'top' } ⊤ / { op: 'bot' } ⊥ / { op: 'not', a } / { op: 'and' | 'or' | 'imp' | 'iff', a, b }
//          （様相論理だけ { op: 'box', a } □ と { op: 'dia', a } ◇）
// 強さの順：¬ □ ◇ ＞ ∧ ＞ ∨ ＞ →（右から結合：p→q→r = p→(q→r)）＞ ↔
// ASCII でも書ける：~ ! = ¬、& ^ = ∧、| = ∨、-> > = →、<-> = = ↔、1 = ⊤、0 = ⊥、[] = □、<> = ◇
const FML_KEYS = 'abcdefghijklmnopqrstuvwxyz0123456789~!&|^-<>=()[] ';   // 入力できる文字
const FML_MAX_VARS = 6;                // ★ 変数の数の上限（真理値表は 2⁶ = 64 行まで）
const OP_SYM = { not: '¬', and: '∧', or: '∨', imp: '→', iff: '↔', box: '□', dia: '◇' };
function fVar(n) { return { op: 'var', name: n }; }
function fNot(a) { return { op: 'not', a }; }
function fBin(op, a, b) { return { op, a, b }; }
const F_TOP = { op: 'top' }, F_BOT = { op: 'bot' };
function lexFormula(src, modal) {      // 返り値 {toks} または {error, at}
  let toks = [], i = 0;
  const one = { '¬': 'not', '~': 'not', '!': 'not', '∧': 'and', '&': 'and', '^': 'and', '∨': 'or', '|': 'or', '→': 'imp', '>': 'imp', '↔': 'iff', '=': 'iff',
    '(': '(', ')': ')', '⊤': 'top', '1': 'top', '⊥': 'bot', '0': 'bot', '□': 'box', '◇': 'dia' };
  while (i < src.length) {
    let c = src[i];
    if (c === ' ') { i++; continue; }
    if (src.startsWith('<->', i)) { toks.push({ k: 'iff', at: i }); i += 3; continue; }
    if (src.startsWith('->', i)) { toks.push({ k: 'imp', at: i }); i += 2; continue; }
    if (src.startsWith('[]', i) || src.startsWith('<>', i)) {
      if (!modal) return { error: '[] <>（□ ◇）は様相論理（12）だけで使える', at: i };
      toks.push({ k: src[i] === '[' ? 'box' : 'dia', at: i }); i += 2; continue;
    }
    if (c >= 'a' && c <= 'z') {
      let j = i + 1; while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === "'")) j++;
      toks.push({ k: 'var', name: src.slice(i, j), at: i }); i = j; continue;
    }
    if (one[c]) {
      if ((one[c] === 'box' || one[c] === 'dia') && !modal) return { error: '□ ◇ は様相論理（12）だけで使える', at: i };
      toks.push({ k: one[c], at: i }); i++; continue;
    }
    if (c === '-' || c === '<' || c === '[' || c === ']') return { error: '「' + c + '」だけでは記号にならない（-> <-> [] <> と書く）', at: i };
    return { error: '使えない文字「' + c + '」', at: i };
  }
  return { toks };
}
function parseFormula(src, modal) {     // 返り値 {f} または {error, at}（例外は投げない）
  if (typeof src !== 'string') return { error: '文字列ではない', at: 0 };
  if (src.length > 160) return { error: '長すぎる（160 文字まで）', at: 160 };
  let lx = lexFormula(src, modal);
  if (lx.error) return lx;
  let toks = lx.toks, pos = 0, depth = 0;
  if (!toks.length) return { error: '式が空', at: 0 };
  const peek = () => toks[pos], at = () => (toks[pos] ? toks[pos].at : src.length);
  const fail = (m) => { throw { msg: m, at: at() }; };
  const bin = (sub, op, right) => {    // 2 項演算の 1 段：左結合（right なら右結合）
    let a = sub();
    if (right) { if (peek() && peek().k === op) { pos++; return fBin(op, a, bin(sub, op, true)); } return a; }
    while (peek() && peek().k === op) { pos++; a = fBin(op, a, sub()); }
    return a;
  };
  const pIff = () => bin(pImp, 'iff', false);
  const pImp = () => bin(pOr, 'imp', true);
  const pOr = () => bin(pAnd, 'or', false);
  const pAnd = () => bin(pUn, 'and', false);
  const pUn = () => {
    if (++depth > 80) fail('入れ子が深すぎる');
    let t = peek(), r;
    if (!t) fail('式が途中で終わっている');
    if (t.k === 'not' || t.k === 'box' || t.k === 'dia') { pos++; r = { op: t.k, a: pUn() }; }
    else if (t.k === 'var') { pos++; r = fVar(t.name); }
    else if (t.k === 'top') { pos++; r = F_TOP; }
    else if (t.k === 'bot') { pos++; r = F_BOT; }
    else if (t.k === '(') { pos++; r = pIff(); if (!peek() || peek().k !== ')') fail('「)」が足りない'); pos++; }
    else if (t.k === ')') fail('「)」の前に式がない');
    else fail('「' + OP_SYM[t.k] + '」の前に式がない');
    depth--; return r;
  };
  try {
    let f = pIff();
    if (pos < toks.length) {
      let t = toks[pos];
      return { error: t.k === ')' ? '余分な「)」' : t.k === 'var' || t.k === '(' || t.k === 'top' || t.k === 'bot' || t.k === 'not' ? 'ここに演算子（∧ ∨ → など）が要る' : '「' + (OP_SYM[t.k] || t.k) + '」がおかしな所にある', at: t.at };
    }
    let nv = fmlVars(f).length;
    if (nv > FML_MAX_VARS) return { error: '変数が ' + nv + ' 個（' + FML_MAX_VARS + ' 個まで）', at: 0 };
    return { f };
  } catch (e) { return { error: e && e.msg ? e.msg : '読めない式', at: e && e.at !== undefined ? e.at : 0 }; }
}
const FML_PREC = { iff: 1, imp: 2, or: 3, and: 4 };
function fmlStr(f) {                    // 構文木 → 文字列（かっこは必要な所と、ちがう演算子が混ざる所に）
  if (!f) return '?';
  switch (f.op) {
    case 'var': return f.name;
    case 'top': return '⊤';
    case 'bot': return '⊥';
    case 'not': case 'box': case 'dia': return OP_SYM[f.op] + (FML_PREC[f.a.op] ? '(' + fmlStr(f.a) + ')' : fmlStr(f.a));
  }
  let side = (c, isLeft) => {
    if (!FML_PREC[c.op]) return fmlStr(c);
    let assocOk = c.op === f.op && (f.op === 'imp' ? !isLeft : isLeft);
    return assocOk ? fmlStr(c) : '(' + fmlStr(c) + ')';
  };
  return side(f.a, true) + ' ' + OP_SYM[f.op] + ' ' + side(f.b, false);
}
function fmlVars(f, out) {              // 出てくる変数（名前の順）
  let top = !out; out = out || new Set();
  if (f.op === 'var') out.add(f.name);
  if (f.a) fmlVars(f.a, out);
  if (f.b) fmlVars(f.b, out);
  return top ? [...out].sort() : out;
}
function evalFml(f, env) {              // 真理値（env = { p: true, q: false, ... }）
  switch (f.op) {
    case 'var': return !!env[f.name];
    case 'top': return true;
    case 'bot': return false;
    case 'not': return !evalFml(f.a, env);
    case 'and': return evalFml(f.a, env) && evalFml(f.b, env);
    case 'or': return evalFml(f.a, env) || evalFml(f.b, env);
    case 'imp': return !evalFml(f.a, env) || evalFml(f.b, env);
    case 'iff': return evalFml(f.a, env) === evalFml(f.b, env);
  }
  return false;                         // □ ◇ は真理値表では評価しない（12 を見よ）
}
function envOf(vars, k) { let e = {}; vars.forEach((v, i) => (e[v] = !!((k >> (vars.length - 1 - i)) & 1))); return e; }   // k 番目の割り当て（上の桁が最初の変数）
function truthRows(f, vars) { vars = vars || fmlVars(f); let rows = []; for (let k = 0; k < 1 << vars.length; k++) { let env = envOf(vars, k); rows.push({ env, v: evalFml(f, env) }); } return rows; }
function classifyFml(f) {               // 'taut' 恒真 / 'sat' 充足可能（恒真ではない）/ 'contra' 矛盾
  let rows = truthRows(f), n = rows.filter((r) => r.v).length;
  return { kind: n === rows.length ? 'taut' : n === 0 ? 'contra' : 'sat', nTrue: n, nRows: rows.length };
}
const KIND_JA = { taut: '恒真（トートロジー）', sat: '充足可能（恒真ではない）', contra: '矛盾（充足不能）' };
function fmlEq(a, b) { if (!a || !b || a.op !== b.op) return false; if (a.op === 'var') return a.name === b.name; if (a.a && !fmlEq(a.a, b.a)) return false; if (a.b && !fmlEq(a.b, b.b)) return false; return true; }
function fmlSize(f) { return 1 + (f.a ? fmlSize(f.a) : 0) + (f.b ? fmlSize(f.b) : 0); }
function sameTable(f, g) {              // 全部の割り当てで同じ値か（同値）
  let vars = [...new Set(fmlVars(f).concat(fmlVars(g)))].sort();
  for (let k = 0; k < 1 << vars.length; k++) { let e = envOf(vars, k); if (evalFml(f, e) !== evalFml(g, e)) return false; }
  return true;
}
function randomFml(d, vars, consts) {   // でたらめな式（自己テスト用、種つき乱数）
  let r = rnd();
  if (d <= 0 || r < 0.22) return consts && rnd() < 0.12 ? (rnd() < 0.5 ? F_TOP : F_BOT) : fVar(rndPick(vars));
  if (r < 0.38) return fNot(randomFml(d - 1, vars, consts));
  return fBin(rndPick(['and', 'or', 'imp', 'iff', 'and', 'or']), randomFml(d - 1, vars, consts), randomFml(d - 1, vars, consts));
}
function fmlTreeKids(f) { return f.a ? (f.b ? [f.a, f.b] : [f.a]) : []; }
function fmlTreeLabel(f) { return f.op === 'var' ? f.name : f.op === 'top' ? '⊤' : f.op === 'bot' ? '⊥' : OP_SYM[f.op]; }
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
