// ============================================
// 07 ペアノ算術と数学的帰納法 ─ 数は 0 と「次の数」s だけで作る：1 = s(0)、2 = s(s(0))、…
// 足し算と掛け算は 2 番目の数についての再帰で定義する（A1〜M2）。2 + 3 は書きかえ規則を 1 回ずつ使って s⁵(0) になる。
// 「0 + n = n」は定義からすぐには出ない（定義は n + 0 = n）→ 数学的帰納法：n = 0 で成り立ち、n = k で成り立てば k + 1 でも成り立つ
// 1 足し算 2 掛け算 / ↑↓ 左の数 a / ← → 右の数 b / スペース 1 歩 / A 自動 / T 定理を選ぶ / D ドミノを倒す
// ============================================

const RULES = [                         // ★ 定義（X, Y は何の項でもよい）
  ['A1', 'X + 0', 'X'], ['A2', 'X + s(Y)', 's(X + Y)'],
  ['M1', 'X × 0', '0'], ['M2', 'X × s(Y)', 'X × Y + X'],
];
const THEOREMS = [                      // ★ 帰納法の証明：[名前, 主張, 基底（n = 0）の等式の列, 帰納の段（n = k → s(k)）の等式の列, 帰納法の仮定]
  ['定理 1', '0 + n = n', [['0 + 0', ''], ['0', 'A1']], [['0 + s(k)', ''], ['s(0 + k)', 'A2'], ['s(k)', '仮定']], ['0 + k', 'k']],
  ['定理 2', 's(m) + n = s(m + n)', [['s(m) + 0', ''], ['s(m)', 'A1'], ['s(m + 0)', 'A1']], [['s(m) + s(k)', ''], ['s(s(m) + k)', 'A2'], ['s(s(m + k))', '仮定'], ['s(m + s(k))', 'A2']], ['s(m) + k', 's(m + k)']],
  ['定理 3（交換法則）', 'm + n = n + m', [['m + 0', ''], ['m', 'A1'], ['0 + m', '定理 1']], [['m + s(k)', ''], ['s(m + k)', 'A2'], ['s(k + m)', '仮定'], ['s(k) + m', '定理 2']], ['m + k', 'k + m']],
];
const LEMMA_EQ = { '定理 1': ['0 + X', 'X'], '定理 2': ['s(X) + Y', 's(X + Y)'] };
const MAX_REWRITES = 400;               // ★ 書きかえの回数の上限
let opMode = '+', numA = 2, numB = 3, trace = [], shown = 1, thIdx = 0, dominoes = [], pushT = -1, autoPlay = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  rebuildTrace(); resetDominoes();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
// ---- 項：{ k: '0' } / { k: 's', a } / { k: '+' | '×', a, b } / { k: 'v', n }（m, k などの変数。大文字 X, Y は規則のパターン）
function num(n) { let t = { k: '0' }; for (let i = 0; i < n; i++) t = { k: 's', a: t }; return t; }
function pTerm(s) {                     // 'X × s(Y) + X' のような文字列 → 項（+ は × より弱い、左から）
  let i = 0; const ws = () => { while (s[i] === ' ') i++; };
  const sum = () => { let a = prod(); ws(); while (s[i] === '+') { i++; a = { k: '+', a, b: prod() }; ws(); } return a; };
  const prod = () => { let a = atom(); ws(); while (s[i] === '×') { i++; a = { k: '×', a, b: atom() }; ws(); } return a; };
  const atom = () => { ws(); let c = s[i];
    if (c === '0') { i++; return { k: '0' }; }
    if (c === 's' && s[i + 1] === '(') { i += 2; let a = sum(); ws(); i++; return { k: 's', a }; }
    if (c === '(') { i++; let a = sum(); ws(); i++; return a; }
    i++; return { k: 'v', n: c }; };
  return sum();
}
function tStr(t, top) {
  if (t.k === '0') return '0';
  if (t.k === 'v') return t.n;
  if (t.k === 's') return 's(' + tStr(t.a, true) + ')';
  let a = t.a.k === '+' && t.k === '×' ? '(' + tStr(t.a) + ')' : tStr(t.a), b = t.b.k === '+' || (t.b.k === '×' && t.k === '×') ? '(' + tStr(t.b) + ')' : tStr(t.b);
  return a + ' ' + t.k + ' ' + b;
}
function tEq(a, b) { return tStr(a) === tStr(b); }
function sCount(t) { let n = 0; while (t.k === 's') { t = t.a; n++; } return t.k === '0' ? n : -1; }   // s…s(0) なら数、ちがえば -1
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function short(t) { let n = sCount(t); return n > 3 ? 's' + String(n).split('').map((d) => SUP[d]).join('') + '(0)' : tStr(t); }
// ---- パターンの一致と書きかえ
function pmatch(pat, t, b) {             // pat の X, Y に何を入れれば t になるか（b に入れて返す / null）
  if (pat.k === 'v' && pat.n >= 'A' && pat.n <= 'Z') { if (b[pat.n]) return tEq(b[pat.n], t) ? b : null; b[pat.n] = t; return b; }
  if (pat.k !== t.k) return null;
  if (pat.k === 'v') return pat.n === t.n ? b : null;
  if (pat.a && !pmatch(pat.a, t.a, b)) return null;
  if (pat.b && !pmatch(pat.b, t.b, b)) return null;
  return b;
}
function inst(pat, b) { if (pat.k === 'v' && b[pat.n]) return b[pat.n]; if (pat.k === '0' || pat.k === 'v') return pat; return pat.b ? { k: pat.k, a: inst(pat.a, b), b: inst(pat.b, b) } : { k: pat.k, a: inst(pat.a, b) }; }
const RULE_T = RULES.map(([nm, l, r]) => [nm, pTerm(l), pTerm(r)]);
function rewrite1(t) {                  // 内側・左から 1 か所だけ書きかえる：{ t, rule } / null（もう書きかえられない）
  for (let c of ['a', 'b']) if (t[c]) { let o = rewrite1(t[c]); if (o) { let u = Object.assign({}, t); u[c] = o.t; return { t: u, rule: o.rule }; } }
  for (let [nm, l, r] of RULE_T) { let b = pmatch(l, t, {}); if (b) return { t: inst(r, b), rule: nm }; }
  return null;
}
function rewriteOuter(t) {              // 外側・左から（自己テスト：順番を変えても答えは同じ）
  for (let [nm, l, r] of RULE_T) { let b = pmatch(l, t, {}); if (b) return { t: inst(r, b), rule: nm }; }
  for (let c of ['a', 'b']) if (t[c]) { let o = rewriteOuter(t[c]); if (o) { let u = Object.assign({}, t); u[c] = o.t; return { t: u, rule: o.rule }; } }
  return null;
}
function normTrace(t, outer) { let tr = [{ t, rule: '' }]; while (tr.length <= MAX_REWRITES) { let o = (outer ? rewriteOuter : rewrite1)(tr[tr.length - 1].t); if (!o) break; tr.push(o); } return tr; }
function rebuildTrace() { trace = normTrace({ k: opMode, a: num(numA), b: num(numB) }); shown = 1; }
// ---- 証明の 1 歩の検査：右の項が、左の項のどこか 1 か所に規則（どちら向きでも）を使ったものか
function oneStepSet(t, eqs) {
  let out = [];
  for (let [l, r] of eqs) for (let [p, q] of [[l, r], [r, l]]) { let b = pmatch(p, t, {}); if (b) out.push(inst(q, b)); }
  for (let c of ['a', 'b']) if (t[c]) for (let u of oneStepSet(t[c], eqs)) { let w = Object.assign({}, t); w[c] = u; out.push(w); }
  return out;
}
function checkChain(chain, ih) {        // 返り値：まちがいの行の番号（-1 = 全部正しい）
  for (let i = 1; i < chain.length; i++) {
    let [s, why] = chain[i], prev = pTerm(chain[i - 1][0]), cur = pTerm(s), eqs;
    if (why === '仮定') eqs = [[pTerm(ih[0]), pTerm(ih[1])]];
    else if (LEMMA_EQ[why]) eqs = [LEMMA_EQ[why].map(pTerm)];
    else { let r = RULE_T.find((x) => x[0] === why); if (!r) return i; eqs = [[r[1], r[2]]]; }
    if (!oneStepSet(prev, eqs).some((u) => tEq(u, cur))) return i;
  }
  return -1;
}
function resetDominoes() { dominoes = []; for (let n = 0; n < 14; n++) { let tr = normTrace({ k: '+', a: num(0), b: num(n) }); dominoes.push({ n, ok: sCount(tr[tr.length - 1].t) === n, ang: 0 }); } pushT = -1; }

function draw() {
  background(...BG);
  hudTitle('ペアノ算術と数学的帰納法：' + numA + ' ' + opMode + ' ' + numB + ' を書きかえで計算', '1 足し算　2 掛け算　↑↓ a　← → b　スペース 1 歩　A 自動　T 定理を選ぶ　D ドミノを倒す');
  if (autoPlay && frameCount % 12 === 0) { shown = Math.min(trace.length, shown + 1); if (shown === trace.length) autoPlay = false; }
  // ---- 定義
  noStroke(); textAlign(LEFT, BASELINE); textSize(15);
  fill(...YEL); text('定義（2 番目の数についての再帰）', 30, 100);
  RULES.forEach(([nm, l, r], i) => { fill(...INK); text(nm + '：' + l.replace(/X/g, 'n').replace(/Y/g, 'm') + ' = ' + r.replace(/X/g, 'n').replace(/Y/g, 'm'), 30 + (i % 2) * 250, 126 + Math.floor(i / 2) * 22); });
  fill(...DIMC); textSize(13); text('公理：0 は数、n が数なら s(n) も数、s(n) ≠ 0、s(n) = s(m) なら n = m、そして帰納法', 30, 178);
  // ---- 書きかえの様子
  let y0 = 210, lh = Math.min(24, (height - y0 - 60) / Math.max(12, Math.min(trace.length, 22)));
  fill(...YEL); textSize(15); text(numA + ' ' + opMode + ' ' + numB + ' = ' + short(num(numA)) + ' ' + opMode + ' ' + short(num(numB)) + '（' + (trace.length - 1) + ' 回の書きかえ）', 30, y0);
  let first = Math.max(0, shown - 20);
  for (let i = first; i < shown; i++) {
    let y = y0 + 26 + (i - first) * lh, t = trace[i].t, s = tStr(t);
    fill(...DIMC); textSize(13); text(i === 0 ? 'はじめ' : trace[i].rule, 30, y);
    fill(...(i === trace.length - 1 ? GRN : INK)); textSize(s.length > 70 ? 12 : 15); text(s.length > 110 ? s.slice(0, 108) + '…' : s, 80, y);
  }
  if (shown === trace.length) { let v = sCount(trace[trace.length - 1].t); fill(...GRN); textSize(16); text('= ' + short(trace[trace.length - 1].t) + ' = ' + v + '（もう書きかえられない = 正規形）', 80, y0 + 26 + (shown - first) * lh + 6); }
  // ---- 右：帰納法の証明
  let rx = width * 0.58, th = THEOREMS[thIdx], bad1 = checkChain(th[2], th[4]), bad2 = checkChain(th[3], th[4]);
  fill(...YEL); textSize(17); text(th[0] + '：' + th[1] + '（T で次）', rx, 100);
  const chain = (ch, y, bad, title) => {
    fill(...SKY); textSize(14); text(title, rx, y);
    ch.forEach(([s, why], i) => { fill(...(i === bad ? PINK : INK)); textSize(15); text((i ? '= ' : '　') + s, rx + 14, y + 22 + i * 21); fill(...DIMC); textSize(12); if (why) text('（' + why + '）', rx + 260, y + 22 + i * 21); });
    return y + 22 + ch.length * 21;
  };
  let yb = chain(th[2], 130, bad1, '基底 n = 0');
  fill(...DIMC); textSize(13); text('帰納法の仮定：' + th[4][0] + ' = ' + th[4][1] + '（n = k で成り立つとする）', rx, yb + 14);
  let ye = chain(th[3], yb + 40, bad2, '帰納の段 n = s(k)');
  fill(...(bad1 < 0 && bad2 < 0 ? GRN : PINK)); textSize(14);
  textAlign(LEFT, TOP); textLeading(19);
  text(bad1 < 0 && bad2 < 0 ? '✓ 各行は「1 か所に規則（または仮定・前の定理）を 1 回」使ったものと機械で検査ずみ → 帰納法ですべての n で成り立つ' : '✗ 検査に通らない行がある', rx, ye, width - rx - 24, 60);
  textAlign(LEFT, BASELINE);
  // ---- ドミノ
  let dy = height - 150, dw = Math.min(40, (width - rx - 40) / dominoes.length);
  if (pushT >= 0) pushT++;
  fill(...DIMC); textSize(13); text('ドミノ：n 番目 = 「0 + n = n」。書きかえで確かめた ✓（D で倒す：1 枚目 = 基底、倒れたら次も倒れる = 帰納の段）', rx, dy - 66, width - rx - 20, 40);
  dominoes.forEach((d, i) => {
    let target = pushT >= 0 && pushT > i * 10 ? 1 : 0; d.ang += (target * 1.15 - d.ang) * 0.25;
    push(); translate(rx + 10 + i * dw, dy + 40); rotate(d.ang); stroke(...(d.ok ? GRN : PINK)); strokeWeight(1.5); fill(...PANEL); rect(0, -50, dw * 0.35, 50, 2); pop();
    noStroke(); fill(...INK); textSize(11); textAlign(CENTER, TOP); text(d.n, rx + 10 + i * dw + 4, dy + 46);
  });
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === '1') { opMode = '+'; rebuildTrace(); }
  if (key === '2') { opMode = '×'; numA = Math.min(numA, 4); numB = Math.min(numB, 4); rebuildTrace(); }
  if (key === UP_ARROW) { numA = Math.min(opMode === '+' ? 8 : 4, numA + 1); rebuildTrace(); }
  if (key === DOWN_ARROW) { numA = Math.max(0, numA - 1); rebuildTrace(); }
  if (key === RIGHT_ARROW) { numB = Math.min(opMode === '+' ? 8 : 4, numB + 1); rebuildTrace(); }
  if (key === LEFT_ARROW) { numB = Math.max(0, numB - 1); rebuildTrace(); }
  if (key === ' ') shown = shown >= trace.length ? 1 : shown + 1;
  if (key === 'a' || key === 'A') { if (shown >= trace.length) shown = 1; autoPlay = !autoPlay; }
  if (key === 't' || key === 'T') thIdx = (thIdx + 1) % THEOREMS.length;
  if (key === 'd' || key === 'D') { dominoes.forEach((d) => (d.ang = 0)); pushT = 0; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let p = normTrace({ k: '+', a: num(2), b: num(3) }), m = normTrace({ k: '×', a: num(2), b: num(3) });
  check('2 + 3 は書きかえ 4 回（A2 を 3 回、A1 を 1 回）で s⁵(0)', sCount(p[p.length - 1].t) === 5 && p.length - 1 === 4 && p.slice(1).map((x) => x.rule).join() === 'A2,A2,A2,A1');
  check('2 × 3 は s⁶(0) になる', sCount(m[m.length - 1].t) === 6);
  let okAll = true, okConf = true;
  for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) {
    let s = normTrace({ k: '+', a: num(a), b: num(b) }), t = normTrace({ k: '×', a: num(a), b: num(b) });
    if (sCount(s[s.length - 1].t) !== a + b || sCount(t[t.length - 1].t) !== a * b || t.length > MAX_REWRITES) okAll = false;
    if (a <= 4 && b <= 4) { let u = normTrace({ k: '×', a: num(a), b: num(b) }, true); if (!tEq(u[u.length - 1].t, t[t.length - 1].t)) okConf = false; }
  }
  check('a, b = 0〜6 の全部の組（49 組）：a + b と a × b の正規形 = ふつうの計算', okAll);
  check('外側から書きかえても内側からでも同じ答え（a, b ≤ 4）', okConf);
  check('0 + n = n を n = 0〜13 の全部で書きかえて確かめた（ドミノ。ただしこれは証明ではない）', (resetDominoes(), dominoes.every((d) => d.ok)));
  check('3 つの帰納法の証明の全部の行が、規則・仮定・前の定理の 1 回の使用として検査に通る', THEOREMS.every((th) => checkChain(th[2], th[4]) < 0 && checkChain(th[3], th[4]) < 0));
  check('まちがった行ははねる：0 + s(k) = s(k) を A2 だけで、s(0 + k) = s(k) を A1 で', checkChain([['0 + s(k)', ''], ['s(k)', 'A2']], ['0 + k', 'k']) === 1 && checkChain([['s(0 + k)', ''], ['s(k)', 'A1']], ['0 + k', 'k']) === 1);
  check('a + b の書きかえの回数はいつも b + 1（再帰は 2 番目の数について）', [0, 1, 2, 5, 8].every((b) => normTrace({ k: '+', a: num(3), b: num(b) }).length - 1 === b + 1));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 × 3 をスペースで 1 歩ずつ。M2 で「掛け算 → 1 つ少ない掛け算 + 足し算」になるのを追おう
// 2. 定理 1「0 + n = n」の帰納の段で、仮定（0 + k = k）をどこで使っている？ 使わずに書けるだろうか
// 3. 定理 3（交換法則）の証明は定理 1 と 2 を使っている。証明の中の「定理 2」を「A2」に変えると、検査はどの行で ✗ になる？
// 4. RULES に累乗を足そう：['P1', 'X ^ 0', 's(0)'], ['P2', 'X ^ s(Y)', 'X ^ Y × X']（pTerm と tStr にも ^ を足す）
// 5. ドミノが全部倒れるのは「1 枚目が倒れる」と「どの 1 枚が倒れても次が倒れる」の 2 つがそろうから。片方だけだと？

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
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? GRN : PINK)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
