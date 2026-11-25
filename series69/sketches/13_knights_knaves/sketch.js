// ============================================
// 13 正直者とうそつき ─ ある島の住人は、いつも本当のことを言う正直者か、いつもうそを言ううそつき。
// 「A が言う S」は「A が正直者 ⇔ S が正しい」という論理式になる（a = A が正直者）。全員の式を ∧ でつなぎ、
// 割り当て（だれが正直者か）を全部ためすと、答えが 1 つ・いくつも・1 つもない、のどれかがわかる。
// 「私はうそつき」は a ↔ ¬a で、どの割り当てでも偽：うそつきのパラドックス
// 1〜6 問題 / 人のカードの言葉をクリック = 次の言葉（Shift + クリック = 前）/ N 人を足す（4 人まで）/ X 人を減らす / R でたらめな問題
// ============================================

const NAMES = ['A', 'B', 'C', 'D'];
const PUZZLES = [                       // ★ 問題：人ごとの言葉 [種類, 引数…]
  ['定番', [['liar', 1], ['same', 0, 1]]],
  ['2 人ともうそつき？', [['allLiars'], ['none']]],
  ['うそつきの連鎖', [['liar', 1], ['liar', 2], ['bothLiars', 0, 1]]],
  ['「私は正直者」', [['knight', 0], ['none']]],
  ['うそつきのパラドックス', [['liar', 0], ['none']]],
  ['人数の証言', [['exactly', 1], ['exactly', 2], ['atLeastOneLiar']]],
];
let people = [], pIdx = 0, cardHits = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadPuzzle(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function loadPuzzle(k) { pIdx = k; people = PUZZLES[k][1].map((s) => s.slice()); }
// ---- 言葉 → 日本語と論理式（変数 a b c d = その人が正直者）
const vname = (i) => 'abcd'[i];
function stmtJa(s, me) {
  const nm = (i) => (i === me ? '私' : NAMES[i]);
  switch (s[0]) {
    case 'none': return '（何も言わない）';
    case 'knight': return nm(s[1]) + 'は正直者';
    case 'liar': return nm(s[1]) + 'はうそつき';
    case 'same': return nm(s[1]) + 'と' + nm(s[2]) + 'は同じ種類';
    case 'diff': return nm(s[1]) + 'と' + nm(s[2]) + 'はちがう種類';
    case 'ifThen': return nm(s[1]) + 'が正直者なら' + nm(s[2]) + 'も正直者';
    case 'bothLiars': return nm(s[1]) + 'も' + nm(s[2]) + 'もうそつき';
    case 'exactly': return '正直者はちょうど ' + s[1] + ' 人';
    case 'atLeastOneLiar': return '少なくとも 1 人はうそつき';
    case 'allLiars': return '全員うそつき';
  }
  return '?';
}
function stmtFml(s, n) {                // 言葉の論理式
  const v = (i) => fVar(vname(i)), ands = (fs) => fs.reduce((x, y) => fBin('and', x, y)), ors = (fs) => fs.reduce((x, y) => fBin('or', x, y));
  switch (s[0]) {
    case 'none': return F_TOP;
    case 'knight': return v(s[1]);
    case 'liar': return fNot(v(s[1]));
    case 'same': return fBin('iff', v(s[1]), v(s[2]));
    case 'diff': return fNot(fBin('iff', v(s[1]), v(s[2])));
    case 'ifThen': return fBin('imp', v(s[1]), v(s[2]));
    case 'bothLiars': return fBin('and', fNot(v(s[1])), fNot(v(s[2])));
    case 'atLeastOneLiar': return ors(Array.from({ length: n }, (_, i) => fNot(v(i))));
    case 'allLiars': return ands(Array.from({ length: n }, (_, i) => fNot(v(i))));
    case 'exactly': {                   // ちょうど k 人：正直者の組み合わせを全部 ∨ でつなぐ
      let terms = [];
      for (let m = 0; m < 1 << n; m++) if (popcount(m) === s[1]) terms.push(ands(Array.from({ length: n }, (_, i) => ((m >> i) & 1 ? v(i) : fNot(v(i))))));
      return terms.length ? ors(terms) : F_BOT;
    }
  }
  return F_TOP;
}
function popcount(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }
function stmtDirect(s, env, n) {        // 同じ意味を、式を使わずに直接計算（自己テストでくらべる）
  let k = env.filter((x) => x).length;
  switch (s[0]) {
    case 'none': return true;
    case 'knight': return env[s[1]];
    case 'liar': return !env[s[1]];
    case 'same': return env[s[1]] === env[s[2]];
    case 'diff': return env[s[1]] !== env[s[2]];
    case 'ifThen': return !env[s[1]] || env[s[2]];
    case 'bothLiars': return !env[s[1]] && !env[s[2]];
    case 'exactly': return k === s[1];
    case 'atLeastOneLiar': return k < n;
    case 'allLiars': return k === 0;
  }
  return true;
}
function puzzleFml(ps) { let n = ps.length; return ps.map((s, i) => fBin('iff', fVar(vname(i)), stmtFml(s, n))).reduce((x, y) => fBin('and', x, y)); }
// ★ 解く：全部の割り当て（2ⁿ 通り）で、全員の「正直者 ⇔ 言葉が正しい」が成り立つものを集める
function solve(ps) {
  let n = ps.length, f = puzzleFml(ps), vars = ps.map((_, i) => vname(i)), models = [];
  for (let m = 0; m < 1 << n; m++) { let env = {}; vars.forEach((v, i) => (env[v] = !!((m >> (n - 1 - i)) & 1))); if (evalFml(f, env)) models.push(vars.map((v) => env[v])); }
  return { f, models };
}
function solveDirect(ps) { let n = ps.length, out = []; for (let m = 0; m < 1 << n; m++) { let env = []; for (let i = 0; i < n; i++) env.push(!!((m >> (n - 1 - i)) & 1)); if (ps.every((s, i) => env[i] === stmtDirect(s, env, n))) out.push(env); } return out; }
function choices(me, n) {               // その人が言える言葉の一覧
  let out = [['none']];
  for (let i = 0; i < n; i++) out.push(['knight', i], ['liar', i]);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push(['same', i, j], ['diff', i, j], ['bothLiars', i, j]);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) out.push(['ifThen', i, j]);
  for (let k = 0; k <= n; k++) out.push(['exactly', k]);
  out.push(['atLeastOneLiar'], ['allLiars']);
  return out;
}
function cycle(i, dir) { let cs = choices(i, people.length), k = cs.findIndex((c) => JSON.stringify(c) === JSON.stringify(people[i])); people[i] = cs[(k + dir + cs.length) % cs.length]; pIdx = -1; }
function randomPuzzle(n) { let ps = []; for (let i = 0; i < n; i++) ps.push(rndPick(choices(i, n).slice(1))); return ps; }
function fixRefs() { let n = people.length; people = people.map((s) => (s.slice(1).some((x, j) => s[0] !== 'exactly' && x >= n) ? ['none'] : s[0] === 'exactly' && s[1] > n ? ['exactly', n] : s)); }

function draw() {
  background(...BG);
  hudTitle('正直者とうそつき：' + (pIdx >= 0 ? '問題 ' + (pIdx + 1) + '「' + PUZZLES[pIdx][0] + '」' : '自分で作った問題'), '1〜6 問題　言葉をクリック = 次の言葉（Shift + クリック = 前）　N 人を足す　X 人を減らす　R でたらめな問題');
  let n = people.length, sol = solve(people), unique = sol.models.length === 1 ? sol.models[0] : null;
  // ---- 人のカード
  let cw = Math.min(280, (width - 60) / n - 16);
  cardHits = [];
  people.forEach((s, i) => {
    let x = 30 + i * (cw + 16), y = 96, role = unique ? (unique[i] ? 'knight' : 'liar') : null;
    stroke(...(role === 'knight' ? GRN : role === 'liar' ? PINK : LINEC)); strokeWeight(2); fill(...PANEL); rect(x, y, cw, 150, 10);
    noStroke(); fill(...INK); textSize(28); textAlign(LEFT, TOP); text(NAMES[i], x + 16, y + 12);
    if (role) { fill(...(role === 'knight' ? GRN : PINK)); textSize(16); text(role === 'knight' ? '正直者' : 'うそつき', x + 56, y + 22); }
    fill(...YEL); textSize(17); text('「' + stmtJa(s, i) + '」', x + 16, y + 62, cw - 24, 50);
    fill(...DIMC); textSize(13); text(fmlStr(fBin('iff', fVar(vname(i)), stmtFml(s, n))), x + 16, y + 116, cw - 24, 30);
    cardHits.push([i, x, y, cw, 150]);
  });
  // ---- 真理値表
  let y0 = 290, rows = 1 << n, rh = Math.min(26, (height - y0 - 140) / rows);
  noStroke(); textAlign(CENTER, CENTER); textSize(14);
  people.forEach((_, i) => { fill(...SKY); text(NAMES[i], 50 + i * 44, y0); });
  people.forEach((s, i) => { fill(...DIMC); text(NAMES[i] + ' の式', 50 + n * 44 + 40 + i * 80, y0); });
  fill(...YEL); text('全部', 50 + n * 44 + 40 + n * 80, y0);
  for (let m = 0; m < rows; m++) {
    let env = {}; for (let i = 0; i < n; i++) env[vname(i)] = !!((m >> (n - 1 - i)) & 1);
    let y = y0 + 22 + m * rh, ok = evalFml(sol.f, env);
    if (ok) { fill(...LINEC); rect(30, y - rh / 2, 50 + n * 44 + 40 + n * 80 + 20, rh - 2, 4); }
    textSize(Math.min(14, rh * 0.7));
    for (let i = 0; i < n; i++) { fill(...(env[vname(i)] ? GRN : PINK)); text(env[vname(i)] ? '正' : 'う', 50 + i * 44, y); }
    people.forEach((s, i) => { let v = evalFml(fBin('iff', fVar(vname(i)), stmtFml(s, n)), env); fill(...(v ? GRN : DIMC)); text(v ? '✓' : '×', 50 + n * 44 + 40 + i * 80, y); });
    fill(...(ok ? YEL : DIMC)); text(ok ? '答え' : '', 50 + n * 44 + 40 + n * 80, y);
  }
  let lx = 50 + n * 44 + 40 + n * 80 + 80;
  fill(...DIMC); textSize(14); textAlign(LEFT, TOP); textLeading(22);
  text('読み方\n正 = 正直者、う = うそつき（a = A は正直者）\n「A の式」= A ⇔ A の言葉が正しい\n全員の式が ✓ の行が答え\n\n正直者の言葉は正しい、うそつきの言葉はまちがい。\nだから「A が S と言う」は a ↔ S。\n割り当ては 2 の人数乗 通りしかないので、全部ためせば必ず解ける', lx, y0 - 10, width - lx - 30, 300);
  // ---- 結論
  let by = height - 104; textAlign(LEFT, BASELINE); textSize(20);
  if (unique) { fill(...GRN); text('答えはただ 1 つ：' + people.map((_, i) => NAMES[i] + ' は' + (unique[i] ? '正直者' : 'うそつき')).join('、'), 30, by); }
  else if (sol.models.length) { fill(...YEL); text('答えが ' + sol.models.length + ' 通り：この言葉だけでは決まらない', 30, by); }
  else { fill(...PINK); text('答えなし：どの割り当てでも矛盾する' + (people.some((s, i) => s[0] === 'liar' && s[1] === i) ? '（「私はうそつき」= a ↔ ¬a はうそつきのパラドックス）' : ''), 30, by); }
  fill(...DIMC); textSize(13);
  text('全体の式：' + (fmlStr(sol.f).length > 150 ? fmlStr(sol.f).slice(0, 149) + '…' : fmlStr(sol.f)), 30, by + 30, width - 60, 40);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  for (let [i, x, y, w, h] of cardHits) if (mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) { cycle(i, keyIsPressed && key === 'Shift' ? -1 : 1); return; }
}
function keyPressed() {
  if (key >= '1' && key <= '6') loadPuzzle(Number(key) - 1);
  if ((key === 'n' || key === 'N') && people.length < 4) { people.push(['none']); pIdx = -1; }
  if ((key === 'x' || key === 'X') && people.length > 1) { people.pop(); fixRefs(); pIdx = -1; }
  if (key === 'r' || key === 'R') { people = randomPuzzle(rndInt(2, 4)); pIdx = -1; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  const ans = (k) => solve(PUZZLES[k][1]).models.map((m) => m.map((v) => (v ? '正' : 'う')).join(''));
  check('問題 1：A は正直者、B はうそつき（ただ 1 つ）', ans(0).join() === '正う');
  check('問題 2：「2 人ともうそつき」と言う A はうそつき、B は正直者', ans(1).join() === 'う正');
  check('問題 3：うそつきの連鎖は B だけが正直者', ans(2).join() === 'う正う');
  check('問題 4「私は正直者」は答えが 2 通り、問題 5「私はうそつき」は答えなし', ans(3).length === 2 && ans(4).length === 0);
  check('うそつきの文 L ↔ ¬L は矛盾（真理値表で 2 行とも偽）', classifyFml(fBin('iff', fVar('l'), fNot(fVar('l')))).kind === 'contra');
  seedRng(13); let agree = 0, N = 300, kinds = [0, 0, 0], sat = true;
  for (let t = 0; t < N; t++) {
    let ps = randomPuzzle(rndInt(2, 4));
    let a = solve(ps).models.map((m) => m.join()), b = solveDirect(ps).map((m) => m.join());
    if (a.join('|') === b.join('|')) agree++;
    kinds[Math.min(2, a.length)]++;
    for (let m of solve(ps).models) if (!ps.every((s, i) => m[i] === stmtDirect(s, m, ps.length))) sat = false;
  }
  check('でたらめな問題 ' + N + ' 個：論理式の真理値表で解いた答え = 言葉を直接計算した総当たりの答え', agree === N);
  check('答えなし ' + kinds[0] + '・ただ 1 つ ' + kinds[1] + '・複数 ' + kinds[2] + ' の全部が出て、答えはどれも全員の言葉と合う', kinds.every((k) => k > 0) && sat);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 問題 1 を自分で解いてから、右の表で確かめよう。「B が言う A と B は同じ種類」は、実は「A は正直者」と同じ意味（なぜ？）
// 2. 問題 4「私は正直者」はなぜ答えが決まらない？ 問題 5「私はうそつき」はなぜ答えがない？
// 3. 言葉をクリックで変えて、答えがただ 1 つになる 3 人の問題を作ろう。友だちに出題してみよう
// 4. 「正直者はちょうど k 人」は ∧ と ∨ で書くと長い式になる。全体の式の長さを見よう
// 5. 11 の「この文は証明できない」は、うそつきの文の「うそ」を「証明できない」にかえたもの。こちらは矛盾しない

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? GRN : PINK)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
