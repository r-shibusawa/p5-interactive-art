// ============================================
// 01 標準形 ─ どんな式も「節の ∧」（CNF 和積標準形）か「項の ∨」（DNF 積和標準形）に書きかえられる
// ① → と ↔ を ¬ ∧ ∨ だけにする　② 否定を内側へ押しこむ（ド・モルガン、¬¬A = A）　③ 分配法則で ∧ と ∨ を入れかえる
// 書きかえは 1 回に 1 か所（外側・左から）。どの段階でも真理値表は変わらない（同値）。でも分配で式は爆発的に長くなることがある
// 文字キー = 入力（00 と同じ。~ & | -> <-> 1 0）/ Backspace / Esc 全部消す / ↑↓ お手本
// → 1 歩進む / ← 1 歩もどる / Enter 最後まで / Tab CNF ⇔ DNF
// ============================================

const PRESETS = [                       // ★ お手本の式
  '(p → q) ∧ (q → p)',
  'p ↔ q',
  '¬(p ∧ (q ∨ ¬r))',
  '(p ∧ q) ∨ (r ∧ s)',
  '(a ∧ b) ∨ (c ∧ d) ∨ (e ∧ f)',
  '¬((p → q) → p) ∨ ⊥',
  'p ↔ (q ↔ r)',
];
const MAX_STEPS = 600, MAX_SIZE = 3000; // ★ 書きかえの回数と式の大きさの上限
const PHASE_JA = ['① → ↔ を消す', '② 否定を内側へ', '③ 分配'];
let src = '', pIdx = 0, target = 'cnf', run = null, at = 0, err = '', blowup = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  blowup = blowupTable(5);
  loadPreset(0);
  selfTest();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function loadPreset(i) { pIdx = (i + PRESETS.length) % PRESETS.length; src = PRESETS[pIdx]; rebuild(); at = 0; }
function rebuild() {
  let r = parseFormula(src);
  if (r.error) { err = r.error + '（' + (r.at + 1) + ' 文字目あたり）'; return; }
  err = ''; run = normalSteps(r.f, target, MAX_STEPS, MAX_SIZE); run.f0 = r.f; at = clampv(at, 0, run.steps.length - 1);
}
// ★ 爆発の例：(x1 ∧ y1) ∨ (x2 ∧ y2) ∨ … ∨ (xn ∧ yn) の CNF は 2ⁿ 個の節
function blowupFml(n) { let f = null; for (let i = 1; i <= n; i++) { let t = fBin('and', fVar('x' + i), fVar('y' + i)); f = f ? fBin('or', f, t) : t; } return f; }
function blowupTable(N) {
  let out = [];
  for (let n = 1; n <= N; n++) { let o = normalSteps(blowupFml(n), 'cnf', 5000, 20000); out.push({ n, size: fmlSize(blowupFml(n)), clauses: cnfClauses(o.result).length, csize: fmlSize(o.result), steps: o.steps.length - 1 }); }
  return out;
}

function draw() {
  background(...BG);
  hudTitle('標準形：' + (target === 'cnf' ? 'CNF（節の ∧：(…∨…) ∧ (…∨…)）' : 'DNF（項の ∨：(…∧…) ∨ (…∧…)）') + 'へ 1 歩ずつ書きかえる',
    '文字キーで入力　Backspace / Esc 消す　↑↓ お手本　→ 1 歩　← もどる　Enter 最後まで　Tab CNF ⇔ DNF');
  drawInputLine(30, 104, '式：', src, err);
  if (!run) return;
  let st = run.steps[at], n = run.steps.length - 1;
  // ---- いまの式（大きく）
  noStroke(); fill(...DIMC); textSize(14); textAlign(LEFT, TOP);
  text((at === 0 ? 'はじめ' : PHASE_JA[st.phase] + '　' + at + ' / ' + n + ' 歩目：' + st.name) + (run.hitBound && at === n ? '　（上限 ' + MAX_STEPS + ' 歩・大きさ ' + MAX_SIZE + ' で止めた）' : ''), 30, 142);
  fill(...INK); textSize(fmlSize(st.f) > 60 ? 16 : 22); textLeading(28);
  text(fmlStr(st.f), 30, 166, width * 0.56, 150);
  let ok = sameTable(run.f0, st.f);
  fill(...(ok ? GRN : PINK)); textSize(14);
  text((ok ? '✓ はじめの式と同値（' : '✗ 同値でない（') + (1 << fmlVars(run.f0).length) + ' 行の真理値表で確認）　大きさ ' + fmlSize(run.f0) + ' → ' + fmlSize(st.f) + ' 記号', 30, 322);

  // ---- 手順の一覧
  let y0 = 356, lh = 21, rows = Math.floor((height - y0 - 120) / lh), first = clampv(at - Math.floor(rows / 2), 0, Math.max(0, run.steps.length - rows));
  for (let i = first; i < Math.min(run.steps.length, first + rows); i++) {
    let s = run.steps[i], y = y0 + (i - first) * lh;
    if (i === at) { fill(...LINEC); rect(26, y - 2, width * 0.56, lh, 4); }
    fill(...(i === 0 ? DIMC : [SKY, YEL, GRN][s.phase])); textSize(13); textAlign(LEFT, TOP);
    text(i === 0 ? '0' : i + ' ' + PHASE_JA[s.phase].slice(0, 1), 32, y);
    fill(...(i <= at ? INK : DIMC)); let line1 = (i === 0 ? '' : s.name + '　→　') + fmlStr(s.f);
    text(line1.length > 90 ? line1.slice(0, 89) + '…' : line1, 70, y);
  }
  // ---- 右：節（または項）の一覧
  let rx = width * 0.62, last = run.result;
  fill(...YEL); textSize(16); textAlign(LEFT, BASELINE);
  text((target === 'cnf' ? 'CNF の節' : 'DNF の項') + '（最後まで書きかえた結果）', rx, 160);
  let parts = target === 'cnf' ? cnfClauses(last) : dnfTerms(last);
  fill(...INK); textSize(15);
  if (!parts.length) text(target === 'cnf' ? '節なし = ⊤（いつも真）' : '項なし = ⊥（いつも偽）', rx, 190);
  parts.slice(0, 14).forEach((c, i) => text((i + 1) + '. ' + (c.length ? '(' + c.join(target === 'cnf' ? ' ∨ ' : ' ∧ ') + ')' : (target === 'cnf' ? '空節 □（偽）' : '空の項（真）')), rx, 190 + i * 22));
  if (parts.length > 14) { fill(...DIMC); text('… ほか ' + (parts.length - 14) + ' 個（全部で ' + parts.length + ' 個）', rx, 190 + 14 * 22); }
  // ---- 右下：爆発の表
  let by = height - 250;
  fill(...YEL); textSize(15); text('爆発：(x1∧y1) ∨ … ∨ (xn∧yn) を CNF に', rx, by);
  const cx = [0, 40, 140, 220, 320];
  textAlign(RIGHT, BASELINE);
  ['n', 'もとの大きさ', 'CNF の節', 'CNF の大きさ', '書きかえ'].forEach((h, j) => { fill(...DIMC); textSize(13); text(h, rx + cx[j] + (j ? 70 : 12), by + 24); });
  blowup.forEach((b, i) => [b.n, b.size, b.clauses, b.csize, b.steps].forEach((v, j) => { fill(...(j === 2 ? YEL : INK)); text(v, rx + cx[j] + (j ? 70 : 12), by + 46 + i * 20); }));
  textAlign(LEFT, BASELINE);
  fill(...DIMC); textSize(12); textLeading(17);
  text('節は 2ⁿ 個。新しい変数を足す変換（ツァイティン変換、シリーズ 18 の 04）なら長さに比例する CNF にできる（同値ではなく「充足可能かどうか」が同じ）', rx, by + 156, width - rx - 20, 60);
  drawSelfTest(width - 180, height - 14);
}
function dnfTerms(f) { if (f.op === 'bot') return []; if (f.op === 'top') return [[]]; return flatten(f, 'or').map((c) => litSort(flatten(c, 'and').map(litStr))); }

function keyPressed() {
  if (key === UP_ARROW) { loadPreset(pIdx - 1); return false; }
  if (key === DOWN_ARROW) { loadPreset(pIdx + 1); return false; }
  if (run && key === RIGHT_ARROW) { at = Math.min(at + 1, run.steps.length - 1); return false; }
  if (run && key === LEFT_ARROW) { at = Math.max(at - 1, 0); return false; }
  if (run && key === 'Enter') { at = run.steps.length - 1; return false; }
  if (key === 'Tab') { target = target === 'cnf' ? 'dnf' : 'cnf'; at = 0; rebuild(); return false; }
  if (key === 'Backspace') src = src.slice(0, -1);
  else if (key === 'Escape' || key === 'Delete') src = '';
  else src = typeInto(src, key, FML_KEYS, 80);
  at = 0; rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(5); let okC = 0, okD = 0, okN = 0, N = 150, stepsOk = true, bound = 0;
  for (let k = 0; k < N; k++) {
    let f = randomFml(3, ['p', 'q', 'r', 's'], true);
    let c = normalSteps(f, 'cnf', MAX_STEPS, MAX_SIZE), d = normalSteps(f, 'dnf', MAX_STEPS, MAX_SIZE);
    if (c.hitBound || d.hitBound) { bound++; continue; }
    if (sameTable(f, c.result) && isCNF(c.result)) okC++;
    if (sameTable(f, d.result) && isDNF(d.result)) okD++;
    let nnf = c.steps.filter((s) => s.phase <= 1).pop(), g = nnf ? nnf.f : f;
    if (isNNF(g) || g.op === 'top' || g.op === 'bot') okN++;
    if (k < 40) for (let s of c.steps) if (!sameTable(f, s.f)) stepsOk = false;
  }
  check('でたらめな式 ' + N + ' 個（変数 4 つまで、⊤ ⊥ ↔ 入り）：CNF は CNF の形で、もとの式と同値（上限に当たった ' + bound + ' 個を除く）', okC === N - bound && bound < 5);
  check('同じく DNF も DNF の形で同値', okD === N - bound);
  check('② のあとは否定が変数の直前だけ（否定標準形 NNF）', okN === N - bound);
  check('40 個の全部の書きかえの 1 歩 1 歩で真理値表が変わらない', stepsOk);
  check('爆発：(x1∧y1) ∨ … ∨ (xn∧yn) の CNF の節は 2ⁿ 個（n = 1〜5）', blowup.every((b) => b.clauses === 1 << b.n));
  const cnfOf = (s) => normalSteps(parseFormula(s).f, 'cnf', MAX_STEPS, MAX_SIZE).result;
  check('⊤ ∧ p → p、¬(p ∨ ⊥) → ¬p、p ∨ ⊤ → ⊤（節なし）、p ∧ ⊥ → ⊥（空節 1 つ）', fmlStr(cnfOf('1 & p')) === 'p' && fmlStr(cnfOf('~(p | 0)')) === '¬p' && cnfClauses(cnfOf('p | 1')).length === 0 && cnfClauses(cnfOf('p & 0')).length === 1 && cnfClauses(cnfOf('p & 0'))[0].length === 0);
  let pq = normalSteps(parseFormula('(p | q) & (r | s)').f, 'dnf', MAX_STEPS, MAX_SIZE).result;
  check('(p ∨ q) ∧ (r ∨ s) の DNF は項が 4 つ（p∧r, p∧s, q∧r, q∧s）', dnfTerms(pq).length === 4);
  let iff = normalSteps(parseFormula('p <-> q').f, 'cnf', MAX_STEPS, MAX_SIZE);
  check('p ↔ q の CNF は (¬p ∨ q) ∧ (¬q ∨ p)、最初の 1 歩は ↔ の除去', fmlStr(iff.result) === '(¬p ∨ q) ∧ (¬q ∨ p)' && iff.steps[1].name.indexOf('A ↔ B') === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. p ↔ q を CNF と DNF の両方にしよう（Tab）。どちらが短い？ 真理値表の「1 の行」「0 の行」との関係は？
// 2. (a ∧ b) ∨ (c ∧ d) ∨ (e ∧ f) を CNF に。節は何個？ 右下の表と同じ 2³ = 8 個になる理由を考えよう
// 3. ③ の分配を先にやると（② をとばすと）どうなる？ nfRules の順番を入れかえて試そう
// 4. CNF は SAT ソルバ（シリーズ 18 の 03）や 03 の導出原理の入力の形。DNF なら充足可能かは一目でわかる。なぜ？
// 5. p ↔ (q ↔ r) を CNF に。変数を増やした p ↔ (q ↔ (r ↔ s)) では節がいくつ？（上限に当たるかも）

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
// ---- 標準形の道具：→ ↔ の除去 → 否定を内側へ（NNF）→ 分配（CNF / DNF）を 1 歩ずつ
function nfRules(phase, target) {      // 段階ごとの書きかえ規則：構文木 1 か所 → { f, name } / null
  if (phase === 0) return [
    (f) => f.op === 'iff' ? { f: fBin('and', fBin('imp', f.a, f.b), fBin('imp', f.b, f.a)), name: 'A ↔ B ⇒ (A → B) ∧ (B → A)' } : null,
    (f) => f.op === 'imp' ? { f: fBin('or', fNot(f.a), f.b), name: 'A → B ⇒ ¬A ∨ B' } : null];
  if (phase === 1) return [
    (f) => f.op === 'not' && f.a.op === 'not' ? { f: f.a.a, name: '¬¬A ⇒ A' } : null,
    (f) => f.op === 'not' && f.a.op === 'and' ? { f: fBin('or', fNot(f.a.a), fNot(f.a.b)), name: '¬(A ∧ B) ⇒ ¬A ∨ ¬B（ド・モルガン）' } : null,
    (f) => f.op === 'not' && f.a.op === 'or' ? { f: fBin('and', fNot(f.a.a), fNot(f.a.b)), name: '¬(A ∨ B) ⇒ ¬A ∧ ¬B（ド・モルガン）' } : null,
    (f) => f.op === 'not' && f.a.op === 'top' ? { f: F_BOT, name: '¬⊤ ⇒ ⊥' } : null,
    (f) => f.op === 'not' && f.a.op === 'bot' ? { f: F_TOP, name: '¬⊥ ⇒ ⊤' } : null,
    (f) => (f.op === 'and' || f.op === 'or') && (f.a.op === 'top' || f.a.op === 'bot' || f.b.op === 'top' || f.b.op === 'bot') ? constRule(f) : null];
  let o = target === 'cnf' ? 'or' : 'and', i = target === 'cnf' ? 'and' : 'or', so = OP_SYM[o], si = OP_SYM[i];
  return [
    (f) => f.op === o && f.b.op === i ? { f: fBin(i, fBin(o, f.a, f.b.a), fBin(o, f.a, f.b.b)), name: 'A ' + so + ' (B ' + si + ' C) ⇒ (A ' + so + ' B) ' + si + ' (A ' + so + ' C)（分配）' } : null,
    (f) => f.op === o && f.a.op === i ? { f: fBin(i, fBin(o, f.a.a, f.b), fBin(o, f.a.b, f.b)), name: '(A ' + si + ' B) ' + so + ' C ⇒ (A ' + so + ' C) ' + si + ' (B ' + so + ' C)（分配）' } : null];
}
function constRule(f) {                 // ⊤ と ⊥ の整理：A ∧ ⊤ ⇒ A、A ∨ ⊤ ⇒ ⊤ など
  let c = f.a.op === 'top' || f.a.op === 'bot' ? f.a : f.b, other = c === f.a ? f.b : f.a;
  if (f.op === 'and') return c.op === 'top' ? { f: other, name: 'A ∧ ⊤ ⇒ A' } : { f: F_BOT, name: 'A ∧ ⊥ ⇒ ⊥' };
  return c.op === 'bot' ? { f: other, name: 'A ∨ ⊥ ⇒ A' } : { f: F_TOP, name: 'A ∨ ⊤ ⇒ ⊤' };
}
function rewriteOnce(f, rules) {        // 外側・左から順に、最初に当てはまる 1 か所だけ書きかえる
  for (let r of rules) { let o = r(f); if (o) return { f: o.f, name: o.name, at: f }; }
  if (f.a) { let o = rewriteOnce(f.a, rules); if (o) return { f: f.b ? fBin(f.op, o.f, f.b) : { op: f.op, a: o.f }, name: o.name, at: o.at }; }
  if (f.b) { let o = rewriteOnce(f.b, rules); if (o) return { f: fBin(f.op, f.a, o.f), name: o.name, at: o.at }; }
  return null;
}
function normalSteps(f, target, maxSteps, maxSize) {   // 全部の手順 [{f, name, phase}]。上限に当たったら hitBound
  let steps = [{ f, name: 'はじめの式', phase: -1 }], cur = f, hit = false;
  for (let ph = 0; ph < 3 && !hit; ph++) {
    let rules = nfRules(ph, target);
    while (true) {
      let o = rewriteOnce(cur, rules);
      if (!o) break;
      cur = o.f; steps.push({ f: cur, name: o.name, phase: ph, at: o.at });
      if (steps.length > (maxSteps || 600) || fmlSize(cur) > (maxSize || 3000)) { hit = true; break; }
    }
  }
  return { steps, result: cur, hitBound: hit };
}
function isLit(f) { return f.op === 'var' || (f.op === 'not' && f.a.op === 'var'); }
function isNNF(f) { if (f.op === 'not') return f.a.op === 'var'; if (f.op === 'imp' || f.op === 'iff') return false; return (!f.a || isNNF(f.a)) && (!f.b || isNNF(f.b)); }
function isFlatOf(f, op, inner) { return f.op === op ? isFlatOf(f.a, op, inner) && isFlatOf(f.b, op, inner) : inner(f); }
function isCNF(f) { return f.op === 'top' || f.op === 'bot' || isFlatOf(f, 'and', (c) => isFlatOf(c, 'or', isLit)); }
function isDNF(f) { return f.op === 'top' || f.op === 'bot' || isFlatOf(f, 'or', (c) => isFlatOf(c, 'and', isLit)); }
function flatten(f, op) { return f.op === op ? flatten(f.a, op).concat(flatten(f.b, op)) : [f]; }
function litStr(f) { return f.op === 'var' ? f.name : '¬' + f.a.name; }
function litSort(c) { const k = (l) => (l[0] === '¬' ? l.slice(1) + '~' : l); return [...new Set(c)].sort((a, b) => (k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0)); }   // 変数の名前の順（p の次に ¬p）
function cnfClauses(f) {                // CNF の木 → 節のリスト（節 = リテラルの文字列 'p' / '¬p' の並び）。⊤ = 節なし、⊥ = 空節 1 つ
  if (f.op === 'top') return [];
  if (f.op === 'bot') return [[]];
  return flatten(f, 'and').map((c) => litSort(flatten(c, 'or').map(litStr)));
}
function toClauses(f) {                 // 速い直接の CNF 変換（03 の節の集合づくり用）。節の重複・恒真の節は除く
  let n = normalSteps(f, 'cnf', 1e9, 1e9).result;
  let cl = cnfClauses(n).filter((c) => !c.some((l) => l[0] !== '¬' && c.indexOf('¬' + l) >= 0));
  let seen = new Set(), out = [];
  for (let c of cl) { let k = c.join(','); if (!seen.has(k)) { seen.add(k); out.push(c); } }
  return out;
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? GRN : PINK)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
