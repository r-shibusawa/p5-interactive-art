// ============================================
// 03 導出原理 ─ 節（リテラルの ∨）を 2 つ選び、p と ¬p のように打ち消し合う文字を消して 1 つにまとめる（導出）
// (A ∨ p) と (B ∨ ¬p) から (A ∨ B)。どんどん作って空節 □（何もない節 = 偽）が出たら、節の集合は矛盾（充足不能）。
// 「前提 ⊢ 結論」を示すには、前提と「結論の否定」の節から □ を出す（背理法）。□ が出ないまま新しい節が尽きたら充足可能
// 1〜5 問題 / R でたらめな節の集合 / スペース 自動で探す（幅優先・上限つき）/ N 1 段だけ / C 作った節を消す
// 節を 2 つクリック = 手で導出（打ち消し合う文字がないと作れない）
// ============================================

const PROBLEMS = [                      // ★ [名前, 論理式のリスト（それぞれ CNF の節にする）]
  ['場合分け：p か q、どちらでも r', ['p ∨ q', 'p → r', 'q → r', '¬r']],
  ['三段論法 p→q, q→r ⊢ p→r（結論の否定を足す）', ['p → q', 'q → r', '¬(p → r)']],
  ['充足可能な集合（□ は出ない）', ['p ∨ q', '¬p ∨ q', 'q → r']],
  ['鳩の巣：3 羽を 2 つの巣に（同じ巣に 2 羽は入れない）', ['a1 ∨ a2', 'b1 ∨ b2', 'c1 ∨ c2', '¬a1 ∨ ¬b1', '¬a1 ∨ ¬c1', '¬b1 ∨ ¬c1', '¬a2 ∨ ¬b2', '¬a2 ∨ ¬c2', '¬b2 ∨ ¬c2']],
  ['対偶 p→q ⊢ ¬q→¬p', ['p → q', '¬(¬q → ¬p)']],
];
const MAX_CLAUSES = 800;                // ★ 作る節の上限（変数 6 個なら節は多くても 3⁶ = 729 種類なので、ここまでに必ず終わる）
const PAIRS_PER_FRAME = 600;            // ★ 1 フレームに調べる組の数（多いほど速い）
let prob = 0, cls = [], given = 0, partner = 0, status = 'ready', auto = false, pick = [], note = '', rowHits = [], title = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadProblem(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function clauseKey(c) { return c.join(','); }
function clauseStr(c) { return c.length ? c.join(' ∨ ') : '□'; }
function negLit(l) { return l[0] === '¬' ? l.slice(1) : '¬' + l; }
function resolvents(a, b) {             // a と b の導出：打ち消し合う文字 1 組ごとに 1 つ。恒真（p ∨ ¬p を含む）はすてる
  let out = [];
  for (let l of a) if (b.indexOf(negLit(l)) >= 0) {
    let c = litSort(a.filter((x) => x !== l).concat(b.filter((x) => x !== negLit(l))));
    if (!c.some((x) => c.indexOf(negLit(x)) >= 0)) out.push({ c, pivot: l });
  }
  return out;
}
function startSet(list) { let seen = new Set(), out = []; for (let c of list) { let k = clauseKey(c); if (!seen.has(k)) { seen.add(k); out.push({ c, from: null }); } } return out; }
function loadProblem(k) { prob = k; title = PROBLEMS[k][0]; resetWith(startSet(PROBLEMS[k][1].flatMap((s) => toClauses(parseFormula(s).f)))); }
function resetWith(list) { cls = list; cls.keys = new Set(list.map((x) => clauseKey(x.c))); given = 1; partner = 0; status = cls.some((x) => !x.c.length) ? 'unsat' : 'ready'; auto = false; pick = []; note = ''; }
function addClause(set, c, from, pivot) {   // 新しい節なら足す。返り値：足したか
  let k = clauseKey(c);
  if (set.keys.has(k)) return false;
  set.keys.add(k); set.push({ c, from, pivot }); return true;
}
// ★ 幅優先の飽和：「given 番目の節」と「それより前の全部の節」の組を順に調べる（組は 1 回ずつ）
function saturate(set, st, budget) {   // st = {given, partner}。返り値 'unsat' / 'sat'（もう新しい節がない）/ 'bound' / 'running'
  while (budget-- > 0) {
    if (set.some((x) => !x.c.length)) return 'unsat';
    if (st.given >= set.length) return 'sat';
    if (st.partner >= st.given) { st.given++; st.partner = 0; continue; }
    let i = st.given, j = st.partner++;
    for (let r of resolvents(set[i].c, set[j].c)) {
      if (addClause(set, r.c, [j, i], r.pivot) && !r.c.length) return 'unsat';
      if (set.length >= MAX_CLAUSES) return 'bound';
    }
  }
  return 'running';
}
function bruteSat(list) {               // 総当たり：全部の割り当てで節が全部真になるものがあるか
  let vars = [...new Set(list.flat().map((l) => l.replace('¬', '')))].sort();
  for (let k = 0; k < 1 << vars.length; k++) {
    let env = envOf(vars, k);
    if (list.every((c) => c.some((l) => (l[0] === '¬' ? !env[l.slice(1)] : env[l])))) return true;
  }
  return false;
}
function randomSet(nv, nc) { let vs = 'pqrs'.slice(0, nv).split(''), out = []; for (let i = 0; i < nc; i++) { let c = []; for (let j = rndInt(1, 3); j > 0; j--) { let v = rndPick(vs); c.push(rnd() < 0.5 ? v : '¬' + v); } c = litSort(c); if (!c.some((x) => c.indexOf(negLit(x)) >= 0)) out.push(c); } return out; }

function draw() {
  background(...BG);
  hudTitle('導出原理：問題 ' + (prob >= 0 ? prob + 1 + '　' + title : '（でたらめな節）'), '1〜5 問題　R でたらめ　スペース 自動で探す（幅優先）　N 1 段　C 作った節を消す　節を 2 つクリック = 手で導出');
  if (auto && status !== 'unsat' && status !== 'sat' && status !== 'bound') {
    let st = { given, partner }; status = saturate(cls, st, PAIRS_PER_FRAME); given = st.given; partner = st.partner;
    if (status !== 'running') auto = false;
  }
  // ---- 節の一覧（最初の節 = 白、作った節 = 黄、□ = 桃）
  let nInit = cls.findIndex((x) => x.from), lh = 22, rows = Math.floor((height - 210) / lh);   // 最初の節（半分まで）と、新しい節を見せる
  if (nInit < 0) nInit = cls.length;
  rowHits = [];
  let shownIdx = [];
  for (let i = 0; i < Math.min(nInit, Math.floor(rows / 2)); i++) shownIdx.push(i);
  let restStart = Math.max(shownIdx.length, cls.length - (rows - shownIdx.length));
  for (let i = restStart; i < cls.length; i++) shownIdx.push(i);
  shownIdx.forEach((i, r) => {
    let x = cls[i], y = 100 + r * lh;
    if (r > 0 && i !== shownIdx[r - 1] + 1) { noStroke(); fill(...DIMC); textSize(12); textAlign(LEFT, TOP); text('⋮（あいだの ' + (i - shownIdx[r - 1] - 1) + ' 個は省略）', 150, y - 10); stroke(...LINEC); line(32, y - 2, 140, y - 2); }
    if (pick.indexOf(i) >= 0) { noStroke(); fill(...LINEC); rect(26, y - 2, width * 0.5, lh - 2, 4); }
    noStroke(); textSize(15); textAlign(LEFT, TOP);
    fill(...DIMC); text('C' + (i + 1), 32, y);
    fill(...(!x.c.length ? PINK : x.from ? YEL : INK)); text(clauseStr(x.c), 80, y);
    if (x.from) { fill(...DIMC); textSize(13); text('← C' + (x.from[0] + 1) + ' と C' + (x.from[1] + 1) + ' で ' + x.pivot.replace('¬', '') + ' を消す', 80 + width * 0.2, y + 2); }
    rowHits.push([i, 26, y - 2, width * 0.5, lh]);
  });
  // ---- 状態
  let msgs = { ready: 'スペースで自動、または節を 2 つクリック', running: '探索中… 節 ' + cls.length + ' 個（' + (given + 1) + ' 番目の節を調べている）', unsat: '□ が出た！ この節の集合は充足不能（矛盾）', sat: '新しい節がもう作れない（飽和）。□ は出ない → 充足可能', bound: '上限 ' + MAX_CLAUSES + ' 個に当たった：どちらとも言えない' };
  noStroke(); textSize(20); textAlign(LEFT, BASELINE);
  fill(...(status === 'unsat' ? PINK : status === 'sat' ? GRN : status === 'bound' ? YEL : INK)); text(msgs[status], 30, height - 70);
  fill(...DIMC); textSize(13); text((note ? note + '　' : '') + '総当たりの答え：' + (bruteSat(cls.filter((x) => !x.from).map((x) => x.c)) ? '充足可能' : '充足不能') + '　／　DPLL（シリーズ 18 の 03）は割り当てを探す方法、導出は節を作って矛盾を探す方法', 30, height - 44);
  // ---- 右：□ の導出の木
  let ei = cls.findIndex((x) => !x.c.length);
  if (ei >= 0) drawRefutation(ei, width * 0.53, 110, width * 0.45, height - 220);
  else { fill(...DIMC); textSize(14); textAlign(LEFT, TOP); text('□ が出たら、ここに導出の木を描く（下が □、上が最初の節）', width * 0.55, 110); }
  drawSelfTest(width - 180, height - 14);
}
function drawRefutation(ei, x, y, w, h) {   // □ から親をたどった木（根 □ を下に）
  const kids = (i) => (cls[i].from ? cls[i].from : []);
  let lay = layoutTree(ei, kids, 80), dy = lay.depth ? Math.min(54, h / lay.depth) : 0;
  const px = (o) => x + o.x * w, py = (o) => y + h - o.depth * dy;
  stroke(...LINEC); strokeWeight(1.5);
  for (let o of lay.nodes) if (o.parent) line(px(o.parent), py(o.parent), px(o), py(o));
  textSize(clampv(w / Math.max(1, lay.leaves) / 6, 8, 13));
  for (let o of lay.nodes) {
    let s = clauseStr(cls[o.node].c), tw = textWidth(s) + 10;
    stroke(...(!cls[o.node].c.length ? PINK : cls[o.node].from ? YEL : INK)); fill(...BG); rect(px(o) - tw / 2, py(o) - 11, tw, 22, 6);
    noStroke(); fill(...INK); textAlign(CENTER, CENTER); text(s, px(o), py(o));
  }
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, TOP); text('□ の導出の木（使った節 ' + lay.nodes.length + (lay.nodes.length >= 80 ? '、80 で打ち切り' : '') + '）', x, y - 24);
}

function mousePressed() {
  for (let [i, x, y, w, h] of rowHits) if (mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) {
    let k = pick.indexOf(i); if (k >= 0) { pick.splice(k, 1); return; }
    pick.push(i);
    if (pick.length === 2) {
      let rs = resolvents(cls[pick[0]].c, cls[pick[1]].c), a = Math.min(...pick), b = Math.max(...pick);
      if (!rs.length) note = 'C' + (a + 1) + ' と C' + (b + 1) + '：打ち消し合う文字がない（または結果が恒真）';
      else { let added = rs.filter((r) => addClause(cls, r.c, [a, b], r.pivot)); note = added.length ? '手で導出：' + added.map((r) => clauseStr(r.c)).join('、') : 'もうある節'; if (cls.some((x) => !x.c.length)) status = 'unsat'; }
      pick = [];
    }
    return;
  }
}
function keyPressed() {
  if (key >= '1' && key <= '5') loadProblem(Number(key) - 1);
  if (key === 'r' || key === 'R') { prob = -1; resetWith(startSet(randomSet(3, rndInt(4, 7)))); }
  if (key === ' ') auto = !auto;
  if (key === 'n' || key === 'N') { let st = { given, partner: 0 }, g0 = given; while (st.given === g0) { let s = saturate(cls, st, 1); if (s !== 'running') { status = s; break; } } given = st.given; partner = 0; }
  if (key === 'c' || key === 'C') resetWith(startSet(cls.filter((x) => !x.from).map((x) => x.c)));
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let r1 = resolvents(['p', 'q'], ['¬p', 'r']);
  check('(p ∨ q) と (¬p ∨ r) の導出は (q ∨ r)、(p ∨ q) と (¬p ∨ ¬q) は恒真しか出ないので何も作らない', r1.length === 1 && clauseKey(r1[0].c) === 'q,r' && resolvents(['p', 'q'], ['¬p', '¬q']).length === 0);
  check('(p) と (¬p) の導出は空節 □', resolvents(['p'], ['¬p']).length === 1 && resolvents(['p'], ['¬p'])[0].c.length === 0);
  seedRng(3); let agree = 0, N = 150, unsatN = 0, treeOk = true;
  for (let k = 0; k < N; k++) {
    let list = randomSet(3, rndInt(3, 8)), set = startSet(list); set.keys = new Set(set.map((x) => clauseKey(x.c)));
    let r = saturate(set, { given: 1, partner: 0 }, 1e6), brute = bruteSat(set.map((x) => x.c));
    if ((r === 'unsat') === !brute && r !== 'bound') agree++;
    if (r === 'unsat') unsatN++;
    for (let x of set) if (x.from && !resolvents(set[x.from[0]].c, set[x.from[1]].c).some((y) => clauseKey(y.c) === clauseKey(x.c))) treeOk = false;
  }
  check('でたらめな節の集合 ' + N + ' 個（変数 3 つ、うち充足不能 ' + unsatN + ' 個）：□ が出る ⇔ 総当たりで充足不能', agree === N && unsatN > 10 && unsatN < N);
  check('作った節は全部、記録した 2 つの親の本当の導出になっている', treeOk);
  let res = PROBLEMS.map((p, k) => { loadProblem(k); let st = { given: 1, partner: 0 }; return saturate(cls, st, 1e6); });
  check('問題 1・2・4（鳩の巣）・5 は □ が出る、問題 3 は飽和して □ が出ない', res[0] === 'unsat' && res[1] === 'unsat' && res[2] === 'sat' && res[3] === 'unsat' && res[4] === 'unsat');
  check('問題の答えは総当たりとも一致', PROBLEMS.every((p, k) => { loadProblem(k); return bruteSat(cls.map((x) => x.c)) === (res[k] === 'sat'); }));
  check('p → q を節にすると (¬p ∨ q)、¬(p → r) は (p) と (¬r) の 2 つ', clauseKey(toClauses(parseFormula('p -> q').f)[0]) === '¬p,q' && toClauses(parseFormula('~(p -> r)').f).map(clauseKey).join('|') === 'p|¬r');
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 問題 1 を手で：C1 (p ∨ q) と C2 (¬p ∨ r) → (q ∨ r)。続けて □ まで何回で行ける？ 自動（スペース）とくらべよう
// 2. 問題 3 はなぜ □ が出ない？ 全部の節を真にする割り当てを 1 つ見つけよう（それが「充足可能」の証拠）
// 3. 問題 4 の鳩の巣は、鳩を 4 羽・巣を 3 つにすると節が一気に増える。PROBLEMS に足して、作る節の数をくらべよう
// 4. 「前提 ⊢ 結論」を調べるには「結論の否定」を足す。自分の三段論法を PROBLEMS に書いてみよう
// 5. Prolog（05）は、この導出を「ホーン節」（正のリテラルが 1 つまでの節）に限って速くしたもの

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
