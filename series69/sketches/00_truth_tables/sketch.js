// ============================================
// 00 真理値表 ─ 論理式を打つと、構文木と真理値表を作って「恒真・充足可能・矛盾」を判定する
// 式はまず木に読む（¬ が一番強く、∧ ＞ ∨ ＞ → ＞ ↔ の順。→ は右から：p→q→r = p→(q→r)）。
// 変数への真偽の割り当てを全部（2ⁿ 通り）ためすのが真理値表。どの行でも真なら恒真、どの行でも偽なら矛盾。
// 文字キー = 入力（ASCII でも OK：~ ¬、& ∧、| ∨、-> →、<-> ↔、1 ⊤、0 ⊥）/ Backspace 1 字消す / Esc 全部消す
// ↑↓ お手本の式 / ← → 表の行を選ぶ（行のクリックでも）→ 木の色がその行の真偽になる
// ============================================

const PRESETS = [                       // ★ お手本の式（自分の式を足してもよい）
  ['ド・モルガンの法則', '¬(p ∧ q) ↔ (¬p ∨ ¬q)'],
  ['排中律', 'p ∨ ¬p'],
  ['パースの法則', '((p → q) → p) → p'],
  ['矛盾', 'p ∧ ¬p'],
  ['三段論法（推移律）', '(p → q) ∧ (q → r) → (p → r)'],
  ['対偶', '(p → q) ↔ (¬q → ¬p)'],
  ['逆はいつも正しい？', '(p → q) → (q → p)'],
  ['分配法則', 'p ∧ (q ∨ r) ↔ (p ∧ q) ∨ (p ∧ r)'],
  ['多数決（3 つのうち 2 つ以上）', '(p ∧ q) ∨ (q ∧ r) ∨ (p ∧ r)'],
];
const MAX_ROWS_SHOWN = 32;              // ★ 一度に見せる表の行の数
let src = '', pIdx = 0, cur = null, err = '', selRow = 0, rowBoxes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  loadPreset(0);
  selfTest();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function loadPreset(i) { pIdx = (i + PRESETS.length) % PRESETS.length; src = PRESETS[pIdx][1]; selRow = 0; rebuild(); }
// ★ 式を読み直す：まちがいなら説明を出して、前の正しい式のまま
function rebuild() {
  let r = parseFormula(src);
  if (r.error) { err = r.error + '（' + (r.at + 1) + ' 文字目あたり）'; return; }
  err = '';
  let vars = fmlVars(r.f), rows = truthRows(r.f, vars);
  cur = { f: r.f, vars, rows, cls: classifyFml(r.f), cols: subColumns(r.f) };
  selRow = clampv(selRow, 0, rows.length - 1);
}
function subColumns(f) {               // 表の列にする部分式（内側から、同じものは 1 回）
  let out = [], seen = new Set();
  const walk = (g) => { if (g.a) walk(g.a); if (g.b) walk(g.b); if (g.op === 'var') return; let s = fmlStr(g); if (!seen.has(s)) { seen.add(s); out.push(g); } };
  walk(f);
  return out;
}

function draw() {
  background(...BG);
  hudTitle('真理値表：式を木に読んで、全部の割り当てをためす', '文字キーで入力（~ & | -> <-> も可）　Backspace 消す　Esc 全部消す　↑↓ お手本　← → 行を選ぶ（クリックでも）');
  drawInputLine(30, 104, '式：', src, err);
  if (!cur) return;
  noStroke(); fill(...DIMC); textSize(14); textAlign(LEFT, BASELINE);
  text('お手本 ' + (pIdx + 1) + ' / ' + PRESETS.length + '：' + PRESETS[pIdx][0] + '　　読んだ式：' + fmlStr(cur.f), 30, 150);

  // ---- 構文木（選んだ行の真偽で色分け：緑 = 真、桃 = 偽）
  let env = cur.rows[selRow].env, lay = layoutTree(cur.f, fmlTreeKids);
  let tw = Math.min(width * 0.42, 60 + lay.leaves * 52), tx = 30 + (width * 0.42 - tw) / 2;
  noStroke(); fill(...INK); textSize(15); text('構文木（この行：' + cur.vars.map((v) => v + '=' + (env[v] ? 1 : 0)).join(' ') + '）', 30, 182);
  drawTree(lay, tx + 20, 220, tw - 40, height * 0.5, fmlTreeLabel, (g) => (g.op === 'var' || g.op === 'top' || g.op === 'bot' ? (evalFml(g, env) ? GRN : PINK) : evalFml(g, env) ? GRN : PINK), 16);

  // ---- 判定
  let c = cur.cls, kc = c.kind === 'taut' ? GRN : c.kind === 'contra' ? PINK : YEL;
  fill(...kc); textSize(26); textAlign(LEFT, BASELINE); text(KIND_JA[c.kind], 30, height - 96);
  fill(...INK); textSize(15);
  text('真になる行 ' + c.nTrue + ' / ' + c.nRows + '　（' + (c.kind === 'taut' ? 'どの行も真' : c.kind === 'contra' ? 'どの行も偽 → 否定すれば恒真' : '真の行も偽の行もある') + '）', 30, height - 68);
  fill(...DIMC); textSize(13);
  text('同じ真理値表を AND・OR・NOT の回路で作るのはシリーズ 56 の 06（ブール代数と論理回路）。式を読む木はプログラムの構文解析と同じしくみ', 30, height - 40);
  drawTable(width * 0.47, 170, width * 0.51, height - 230);
  drawSelfTest(width - 180, height - 14);
}
function drawTable(x, y, w, h) {
  let cols = cur.vars.map((v) => ({ name: v, f: fVar(v), isVar: true })).concat(cur.cols.map((g) => ({ name: fmlStr(g), f: g })));
  textSize(13);
  cols.forEach((cl) => (cl.w = Math.max(30, textWidth(cl.name) + 14)));
  while (cols.length > cur.vars.length + 1 && cols.reduce((s, cl) => s + cl.w, 0) > w) cols.splice(cur.vars.length, 1);   // 入りきらない部分式の列は省く
  let n = cur.rows.length, first = Math.floor(selRow / MAX_ROWS_SHOWN) * MAX_ROWS_SHOWN, shown = Math.min(MAX_ROWS_SHOWN, n - first);
  let rh = Math.min(24, (h - 30) / Math.min(n, MAX_ROWS_SHOWN));
  rowBoxes = [];
  let cx = x;
  cols.forEach((cl, j) => {
    let last = j === cols.length - 1;
    noStroke(); fill(...(cl.isVar ? SKY : last ? YEL : DIMC)); textAlign(CENTER, BASELINE); textSize(13);
    text(cl.name.length > 26 ? cl.name.slice(0, 25) + '…' : cl.name, cx + cl.w / 2, y + 14);
    for (let i = 0; i < shown; i++) {
      let k = first + i, v = evalFml(cl.f, cur.rows[k].env), ry = y + 24 + i * rh;
      if (k === selRow && j === 0) { fill(...LINEC); rect(x - 4, ry, cols.reduce((s, c2) => s + c2.w, 0) + 8, rh - 2, 4); }
      fill(...(cl.isVar ? INK : v ? GRN : PINK)); textSize(Math.min(15, rh * 0.75)); textAlign(CENTER, CENTER);
      text(v ? '1' : '0', cx + cl.w / 2, ry + rh / 2 - 1);
      if (j === 0) rowBoxes.push([k, x - 4, ry, w, rh]);
    }
    cx += cl.w;
    if (j === cur.vars.length - 1 || j === cols.length - 2) { stroke(...LINEC); strokeWeight(1); line(cx, y, cx, y + 24 + shown * rh); }
  });
  noStroke(); fill(...DIMC); textSize(12); textAlign(LEFT, BASELINE);
  if (n > MAX_ROWS_SHOWN) text('行 ' + (first + 1) + '〜' + (first + shown) + ' / ' + n + '（← → で先へ）', x, y + 40 + shown * rh);
}

function mousePressed() { for (let [k, bx, by, bw, bh] of rowBoxes) if (mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh) selRow = k; }
function keyPressed() {
  if (key === UP_ARROW) { loadPreset(pIdx - 1); return false; }
  if (key === DOWN_ARROW) { loadPreset(pIdx + 1); return false; }
  if (cur && key === LEFT_ARROW) { selRow = (selRow - 1 + cur.rows.length) % cur.rows.length; return false; }
  if (cur && key === RIGHT_ARROW) { selRow = (selRow + 1) % cur.rows.length; return false; }
  if (key === 'Backspace') src = src.slice(0, -1);
  else if (key === 'Escape' || key === 'Delete') src = '';
  else src = typeInto(src, key, FML_KEYS, 80);
  rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(11); let rt = 0, dual = 0;
  for (let k = 0; k < 300; k++) {
    let f = randomFml(4, ['p', 'q', 'r', 's'], true), g = parseFormula(fmlStr(f));
    if (g.f && fmlEq(f, g.f)) rt++;
    let a = classifyFml(f).kind, b = classifyFml(fNot(f)).kind;
    if ((a === 'taut') === (b === 'contra') && (a === 'contra') === (b === 'taut')) dual++;
  }
  check('でたらめな式 300 個：文字列にして読み直すと同じ木（⊤ ⊥ も含む）', rt === 300);
  check('300 個：φ が恒真 ⇔ ¬φ が矛盾、φ が矛盾 ⇔ ¬φ が恒真', dual === 300);
  const kind = (s) => { let r = parseFormula(s); return r.f ? classifyFml(r.f).kind : 'error'; };
  check('ド・モルガンの法則 2 つは恒真', kind('¬(p ∧ q) ↔ (¬p ∨ ¬q)') === 'taut' && kind('¬(p ∨ q) ↔ (¬p ∧ ¬q)') === 'taut');
  check('排中律 p ∨ ¬p とパースの法則 ((p→q)→p)→p は恒真', kind('p ∨ ¬p') === 'taut' && kind('((p → q) → p) → p') === 'taut');
  check('p ∧ ¬p は矛盾、逆 (p→q)→(q→p) は恒真ではない', kind('p ∧ ¬p') === 'contra' && kind('(p → q) → (q → p)') === 'sat');
  let pq = parseFormula('p -> q');
  check('p → q が真になるのは 4 行中 3 行（p = 1, q = 0 だけ偽）', pq.f && classifyFml(pq.f).nTrue === 3 && !evalFml(pq.f, { p: true, q: false }));
  let A = parseFormula('~(p&q)<->(~p|~q)'), U = parseFormula('¬(p∧q)↔(¬p∨¬q)');
  check('ASCII の書き方（~ & | <->）と記号の書き方は同じ木', A.f && U.f && fmlEq(A.f, U.f));
  const same = (s, t) => { let a = parseFormula(s), b = parseFormula(t); return a.f && b.f && fmlEq(a.f, b.f); };
  check('強さの順：p|q&r = p∨(q∧r)、p->q->r = p→(q→r)、~p&q = (¬p)∧q、p&q->r = (p∧q)→r', same('p|q&r', 'p|(q&r)') && same('p->q->r', 'p->(q->r)') && same('~p&q', '(~p)&q') && same('p&q->r', '(p&q)->r'));
  let garbage = ['', '(', ')', 'p q', '&p', 'p->', '((p)', '-', 'p<', 'P', '123456ztr casnfg ', 'p&&q', '[]p', 'é', 'p)('], allErr = true;
  for (let g of garbage) { try { if (!parseFormula(g).error) allErr = false; } catch (e) { allErr = false; } }
  check('おかしな入力 ' + garbage.length + ' 個は例外を出さずに「まちがい」の説明を返す', allErr);
  check('変数は ' + FML_MAX_VARS + ' 個まで（7 個はまちがい、6 個は 64 行）', !!parseFormula('a&b&c&d&e&f&g').error && truthRows(parseFormula('a|b|c|d|e|f').f).length === 64);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. p → q と ¬p ∨ q の真理値表をくらべよう。「同じ表」を <-> でつなぐと恒真になる
// 2. 逆 (q → p)・裏 (¬p → ¬q)・対偶 (¬q → ¬p) のうち、もとの p → q と同じ表になるのはどれ？
// 3. パースの法則 ((p→q)→p)→p は恒真。でも 09（カリー-ハワード）では「証明のプログラム」が作れない。どうして？
// 4. 変数 3 つで、真になる行がちょうど 1 行の式を作ろう（ヒント：p ∧ q ∧ r）。ちょうど 4 行なら？
// 5. 恒真の式は何個ある？ 変数 2 つの真理値表の「最後の列」は 2⁴ = 16 種類。そのうち恒真は 1 種類だけ

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
