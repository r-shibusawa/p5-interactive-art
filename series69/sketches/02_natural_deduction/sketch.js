// ============================================
// 02 自然演繹 ─ 前提から結論までを、規則を 1 回ずつ使って 1 行ずつ導く（フィッチ式：仮定を置くと箱が開く）
// 証明は「意味」を見ずに「形」だけで検査できる。→I・¬I・背理法は箱を閉じて仮定を外す（箱の中の行は外から使えない）
// 操作：左の行をクリックで選ぶ（順番に 1・2・3）→ 右の規則ボタン。仮定・∨I・⊥E の式は下の候補から選ぶ
// 1〜6 課題 / U 1 行もどす / X 箱を閉じる（結論なし：∨E の 2 つ目の箱の前に）/ H お手本を見る / C 最初から
// ============================================

const EXERCISES = [                     // ★ 課題：[名前, 前提, 結論, お手本（[深さ, 規則, 参照する行の番号, 式]）]
  ['三段論法', ['p → q', 'q → r'], 'p → r', [[1, 'assume', [], 'p'], [1, 'impE', [1, 3], 'q'], [1, 'impE', [2, 4], 'r'], [0, 'impI', [3], 'p → r']]],
  ['二重否定', ['¬¬p'], 'p', [[1, 'assume', [], '¬p'], [1, 'notE', [2, 1], '⊥'], [0, 'raa', [2], 'p']]],
  ['∧ の入れかえ', ['p ∧ q'], 'q ∧ p', [[0, 'andE2', [1], 'q'], [0, 'andE1', [1], 'p'], [0, 'andI', [2, 3], 'q ∧ p']]],
  ['∨ の入れかえ', ['p ∨ q'], 'q ∨ p', [[1, 'assume', [], 'p'], [1, 'orI2', [2], 'q ∨ p'], [1, 'assume', [], 'q'], [1, 'orI1', [4], 'q ∨ p'], [0, 'orE', [1, 2, 4], 'q ∨ p']]],
  ['対偶', ['p → q'], '¬q → ¬p', [[1, 'assume', [], '¬q'], [2, 'assume', [], 'p'], [2, 'impE', [1, 3], 'q'], [2, 'notE', [4, 2], '⊥'], [1, 'notI', [3], '¬p'], [0, 'impI', [2], '¬q → ¬p']]],
  ['挑戦：排中律', [], 'p ∨ ¬p', [[1, 'assume', [], '¬(p ∨ ¬p)'], [2, 'assume', [], 'p'], [2, 'orI1', [2], 'p ∨ ¬p'], [2, 'notE', [3, 1], '⊥'], [1, 'notI', [2], '¬p'], [1, 'orI2', [5], 'p ∨ ¬p'], [1, 'notE', [6, 1], '⊥'], [0, 'raa', [1], 'p ∨ ¬p']]],
];
const RULE_INFO = {                     // 規則の名前と、参照するもの（L = 行、B = 閉じた箱）
  prem: ['前提', ''], assume: ['仮定', ''], reit: ['R', 'L'], andI: ['∧I', 'LL'], andE1: ['∧E', 'L'], andE2: ['∧E', 'L'],
  orI1: ['∨I', 'L'], orI2: ['∨I', 'L'], orE: ['∨E', 'LBB'], impI: ['→I', 'B'], impE: ['→E', 'LL'],
  notI: ['¬I', 'B'], notE: ['¬E', 'LL'], botE: ['⊥E', 'L'], dnE: ['¬¬E', 'L'], raa: ['背理法', 'B'],
};
const BUTTONS = [['assume', '仮定（候補の式）'], ['reit', 'R 再掲'], ['andI', '∧I（A, B → A∧B）'], ['andE1', '∧E 左（A∧B → A）'], ['andE2', '∧E 右（A∧B → B）'],
  ['orI1', '∨I（A → A∨候補）'], ['orI2', '∨I（A → 候補∨A）'], ['orE', '∨E（A∨B と箱 2 つ）'], ['impI', '→I（箱を閉じる）'], ['impE', '→E（A→B と A）'],
  ['notI', '¬I（⊥ で箱を閉じる）'], ['notE', '¬E（A と ¬A → ⊥）'], ['botE', '⊥E（⊥ → 候補）'], ['dnE', '¬¬E（¬¬A → A）'], ['raa', '背理法（¬A…⊥ → A）'], ['close', 'X 箱を閉じる'], ['undo', 'U 1 行もどす']];
let ex = 0, pf = null, hist = [], sel = [], cand = null, cands = [], msg = '', hits = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  loadExercise(0);
  selfTest();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
const fm = (s) => parseFormula(s).f;     // 文字列 → 式
function freshProof(k) { let e = EXERCISES[k]; return { lines: e[1].map((s) => ({ f: fm(s), rule: 'prem', refs: [], depth: 0 })), depth: 0, goal: fm(e[2]) }; }
function loadExercise(k) {
  ex = clampv(k, 0, EXERCISES.length - 1); pf = freshProof(ex); hist = []; sel = []; cand = null; msg = '左の行をクリックで選んで、右の規則を押す';
  let e = EXERCISES[ex], set = new Map();
  const add = (f) => { let s = fmlStr(f); if (!set.has(s)) set.set(s, f); };
  const walk = (f) => { add(f); if (f.a) walk(f.a); if (f.b) walk(f.b); };
  e[1].concat([e[2]]).forEach((s) => walk(fm(s)));
  [...set.values()].forEach((f) => add(fNot(f)));                    // 候補 = 前提と結論の部分式と、その否定、⊥
  add(F_BOT); cands = [...set.values()].slice(0, 22);
}
function solutionLines(k) { return EXERCISES[k][3].map(([d, r, refs, s]) => ({ f: fm(s), rule: r, refs: refs.map((x) => x - 1), depth: d })); }

// ---- 証明のチェッカー：各行の「箱（スコープ）」を求めて、規則の形を調べる。返り値 msgs[k]（'' なら正しい）
function isPrefix(a, b) { return a.length <= b.length && a.every((x, i) => b[i] === x); }
function ndCheck(lines) {
  let msgs = [], stack = [], scopes = [], seenOther = false;
  for (let k = 0; k < lines.length; k++) {
    let L = lines[k], m = '';
    if (L.rule === 'prem') { if (seenOther || L.depth !== 0) m = '前提は最初にだけ置ける'; } else seenOther = true;
    if (L.rule === 'assume') { if (L.depth < 1 || L.depth > stack.length + 1) m = m || '箱の深さがおかしい'; stack = stack.slice(0, Math.max(0, L.depth - 1)); stack.push(k); }
    else { if (L.depth > stack.length || L.depth < 0) m = m || '仮定なしで箱には入れない'; stack = stack.slice(0, Math.max(0, L.depth)); }
    scopes.push(stack.slice());
    msgs.push(m || ruleCheck(lines, scopes, k));
  }
  return { msgs, scopes, ok: msgs.every((x) => !x) };
}
function ruleCheck(lines, scopes, k) {
  let L = lines[k], info = RULE_INFO[L.rule], refs = L.refs || [];
  if (!info) return '知らない規則';
  if (!L.f) return '式がない';
  if (refs.length !== info[1].length) return info[0] + ' は ' + info[1].length + ' つを参照する';
  let A = [];
  for (let j = 0; j < refs.length; j++) {
    let r = refs[j];
    if (!(Number.isInteger(r) && r >= 0 && r < k)) return '参照できるのは前の行だけ';
    if (info[1][j] === 'L') {
      if (!isPrefix(scopes[r], scopes[k])) return (r + 1) + ' 行目は閉じた箱の中にあるので、ここでは使えない';
      A.push(lines[r].f);
    } else {
      if (lines[r].rule !== 'assume') return (r + 1) + ' 行目は箱の始まり（仮定）ではない';
      if (scopes[k].indexOf(r) >= 0) return (r + 1) + ' 行目からの箱がまだ閉じていない';
      if (!isPrefix(scopes[r].slice(0, -1), scopes[k])) return (r + 1) + ' 行目の箱はここからは見えない';
      let e = r; for (let i = r + 1; i < k; i++) if (scopes[i].indexOf(r) >= 0) e = i;
      if (scopes[e][scopes[e].length - 1] !== r) return (r + 1) + ' 行目の箱の最後の行が、もっと内側の箱の中にある';
      A.push({ a: lines[r].f, e: lines[e].f });
    }
  }
  const f = L.f, eq = fmlEq, isBot = (g) => g.op === 'bot';
  switch (L.rule) {
    case 'prem': case 'assume': return '';
    case 'reit': return eq(f, A[0]) ? '' : 'R：同じ式ではない';
    case 'andI': return f.op === 'and' && eq(f.a, A[0]) && eq(f.b, A[1]) ? '' : '∧I：結論は「1 つ目 ∧ 2 つ目」';
    case 'andE1': return A[0].op === 'and' && eq(A[0].a, f) ? '' : '∧E：A ∧ B から A';
    case 'andE2': return A[0].op === 'and' && eq(A[0].b, f) ? '' : '∧E：A ∧ B から B';
    case 'orI1': return f.op === 'or' && eq(f.a, A[0]) ? '' : '∨I：A から A ∨ B';
    case 'orI2': return f.op === 'or' && eq(f.b, A[0]) ? '' : '∨I：A から B ∨ A';
    case 'orE': return A[0].op === 'or' && eq(A[1].a, A[0].a) && eq(A[2].a, A[0].b) && eq(A[1].e, f) && eq(A[2].e, f) ? '' : '∨E：A ∨ B、A を仮定して C の箱、B を仮定して C の箱 → C';
    case 'impI': return f.op === 'imp' && eq(f.a, A[0].a) && eq(f.b, A[0].e) ? '' : '→I：A を仮定して B の箱 → A → B';
    case 'impE': return A[0].op === 'imp' && eq(A[0].a, A[1]) && eq(A[0].b, f) ? '' : '→E：A → B と A から B';
    case 'notI': return isBot(A[0].e) && f.op === 'not' && eq(f.a, A[0].a) ? '' : '¬I：A を仮定して ⊥ の箱 → ¬A';
    case 'notE': return isBot(f) && A[1].op === 'not' && eq(A[1].a, A[0]) ? '' : '¬E：A と ¬A から ⊥';
    case 'botE': return isBot(A[0]) ? '' : '⊥E：⊥ からは何でも';
    case 'dnE': return A[0].op === 'not' && A[0].a.op === 'not' && eq(A[0].a.a, f) ? '' : '¬¬E：¬¬A から A';
    case 'raa': return isBot(A[0].e) && A[0].a.op === 'not' && eq(A[0].a.a, f) ? '' : '背理法：¬A を仮定して ⊥ の箱 → A';
  }
  return '知らない規則';
}
// ---- ボタンから新しい行を作る（作った行は必ずチェッカーで検査してから足す）
function openBoxes(st) { let c = ndCheck(st.lines).scopes; return (c.length ? c[c.length - 1] : []).slice(0, st.depth); }
function ndBuild(st, rule, s, cf) {
  let L = st.lines, d = st.depth, kinds = RULE_INFO[rule][1], fo = (i) => L[i].f, ob = openBoxes(st);
  if (rule === 'assume') return cf ? { line: { f: cf, rule, refs: [], depth: d + 1 } } : { error: '仮定する式を下の候補から選ぶ' };
  if (kinds === 'B') {
    let b = s.find((i) => L[i].rule === 'assume' && ob.indexOf(i) < 0), closing = b === undefined;
    if (closing) { if (!ob.length) return { error: '閉じる箱がない（仮定を置くと箱が開く）' }; b = ob[ob.length - 1]; }
    let sc = ndCheck(L).scopes, e = b; for (let i = b + 1; i < L.length; i++) if (sc[i].indexOf(b) >= 0) e = i;
    let fa = fo(b), fe = fo(e), f = rule === 'impI' ? fBin('imp', fa, fe) : rule === 'notI' ? fNot(fa) : fa.op === 'not' ? fa.a : null;
    if (!f) return { error: '背理法の仮定は ¬A の形' };
    return { line: { f, rule, refs: [b], depth: closing ? L[b].depth - 1 : d } };
  }
  if (rule === 'orE') {
    let inner = ob[ob.length - 1];      // いちばん内側の開いた箱は、ここで閉じてよい
    let boxes = s.filter((i) => L[i].rule === 'assume' && (ob.indexOf(i) < 0 || i === inner)), rest = s.filter((i) => boxes.indexOf(i) < 0);
    if (rest.length !== 1 || boxes.length !== 2) return { error: '∨E：A ∨ B の行と、2 つの箱の仮定の行を選ぶ' };
    boxes.sort((u, v) => u - v);
    let sc = ndCheck(L).scopes, e = boxes[0]; for (let i = boxes[0] + 1; i < L.length; i++) if (sc[i].indexOf(boxes[0]) >= 0) e = i;
    return { line: { f: fo(e), rule, refs: [rest[0], boxes[0], boxes[1]], depth: boxes.indexOf(inner) >= 0 ? L[inner].depth - 1 : d } };
  }
  if (s.length !== kinds.length) return { error: RULE_INFO[rule][0] + '：行を ' + kinds.length + ' つ選ぶ（いま ' + s.length + ' つ）' };
  let a = fo(s[0]), b = s[1] !== undefined ? fo(s[1]) : null, refs = s.slice(), f = null;
  if (rule === 'reit') f = a;
  if (rule === 'andI') f = fBin('and', a, b);
  if (rule === 'andE1' || rule === 'andE2') f = a.op === 'and' ? (rule === 'andE1' ? a.a : a.b) : null;
  if (rule === 'orI1' || rule === 'orI2') { if (!cf) return { error: '∨I：足す式を候補から選ぶ' }; f = rule === 'orI1' ? fBin('or', a, cf) : fBin('or', cf, a); }
  if (rule === 'impE') { if (b.op === 'imp' && a.op !== 'imp') { refs = [s[1], s[0]]; [a, b] = [b, a]; } f = a.op === 'imp' ? a.b : null; }
  if (rule === 'notE') { if (a.op === 'not' && !(b.op === 'not' && fmlEq(b.a, a))) refs = [s[1], s[0]]; f = F_BOT; }
  if (rule === 'botE') { if (!cf) return { error: '⊥E：結論の式を候補から選ぶ' }; f = cf; }
  if (rule === 'dnE') f = a.op === 'not' && a.a.op === 'not' ? a.a.a : null;
  if (!f) return { error: RULE_INFO[rule][0] + '：選んだ行の形が合わない' };
  return { line: { f, rule, refs, depth: d } };
}
function tryRule(st, rule, s, cf) {     // 返り値 '' = 足せた / エラーの説明
  if (rule === 'close') { if (!st.depth) return '開いている箱がない'; st.depth--; return ''; }
  let o = ndBuild(st, rule, s, cf);
  if (o.error) return o.error;
  let c = ndCheck(st.lines.concat([o.line]));
  if (c.msgs[c.msgs.length - 1]) return c.msgs[c.msgs.length - 1];
  st.lines.push(o.line); st.depth = o.line.depth;
  return '';
}
function press(rule) {
  if (rule === 'undo') { if (hist.length) { pf = hist.pop(); msg = '1 つもどした'; } sel = []; return; }
  let save = { lines: pf.lines.slice(), depth: pf.depth, goal: pf.goal };
  let m = tryRule(pf, rule, sel, cand);
  if (m) msg = '✗ ' + m; else { hist.push(save); sel = []; msg = rule === 'close' ? '箱を閉じた' : '✓ ' + RULE_INFO[rule][0] + ' で ' + fmlStr(pf.lines[pf.lines.length - 1].f); }
}
function solved(st) { let c = ndCheck(st.lines); return c.ok && st.lines.some((L, k) => c.scopes[k].length === 0 && fmlEq(L.f, st.goal)); }   // 箱の外に結論が出たら完成
function justify(L, k, c) {
  if (L.rule === 'prem' || L.rule === 'assume') return RULE_INFO[L.rule][0];
  let kinds = RULE_INFO[L.rule][1];
  return RULE_INFO[L.rule][0] + ' ' + L.refs.map((r, j) => { if (kinds[j] === 'L') return r + 1; let e = r; for (let i = r + 1; i < k; i++) if (c.scopes[i].indexOf(r) >= 0) e = i; return (r + 1) + '–' + (e + 1); }).join(', ');
}

function draw() {
  background(...BG);
  let e = EXERCISES[ex];
  hudTitle('自然演繹（フィッチ式）　課題 ' + (ex + 1) + '：' + e[0] + '　　' + e[1].join(', ') + ' ⊢ ' + e[2],
    '行をクリックで選ぶ → 規則のボタン　候補の式もクリックで選ぶ　1〜6 課題　U もどす　X 箱を閉じる　H お手本　C 最初から');
  let c = ndCheck(pf.lines), x0 = 40, y0 = 110, lh = Math.min(32, (height - 260) / Math.max(10, pf.lines.length + 1));
  hits = [];
  pf.lines.forEach((L, k) => {
    let y = y0 + k * lh, sc = c.scopes[k], ix = x0 + 40;
    let si = sel.indexOf(k);
    if (si >= 0) { noStroke(); fill(...LINEC); rect(x0 - 6, y - 3, width * 0.56, lh - 2, 4); }
    stroke(...SKY); strokeWeight(2);
    sc.forEach((b, lv) => { let bx = ix + lv * 22; line(bx, y - 3, bx, y + lh - 5); });
    let tx = ix + sc.length * 22 + 8;
    if (L.rule === 'assume') line(tx - 8, y + lh - 5, tx + 120, y + lh - 5);
    if (L.rule === 'prem' && (k + 1 === pf.lines.length || pf.lines[k + 1].rule !== 'prem')) { stroke(...INK); line(ix, y + lh - 4, ix + 160, y + lh - 4); }
    noStroke(); fill(...DIMC); textSize(15); textAlign(RIGHT, TOP); text(k + 1, x0 + 22, y + 2);
    fill(...(c.msgs[k] ? PINK : fmlEq(L.f, pf.goal) && sc.length === 0 ? YEL : INK)); textAlign(LEFT, TOP); textSize(18); text(fmlStr(L.f), tx, y);
    fill(...DIMC); textSize(14); text(justify(L, k, c), x0 + width * 0.4, y + 3);
    if (si >= 0) { fill(...YEL); text('選択 ' + (si + 1), x0 + width * 0.5, y + 3); }
    hits.push(['line', k, x0 - 6, y - 3, width * 0.56, lh]);
  });
  let yb = y0 + pf.lines.length * lh + 6;
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, TOP);
  text('次の行の深さ：' + pf.depth + (pf.depth ? '（箱の中。→I・¬I・背理法 か X で閉じる）' : '（いちばん外）'), x0, yb);
  fill(...(msg[0] === '✗' ? PINK : msg[0] === '✓' ? GRN : INK)); textSize(16); text(msg, x0, height - 92);
  if (solved(pf)) { fill(...YEL); textSize(24); text('証明できた！ ' + e[1].join(', ') + ' ⊢ ' + e[2] + '（チェッカーが全部の行を検査済み）', x0, height - 62); }
  // ---- 右：規則のボタンと候補の式
  let rx = width * 0.62, bw = (width - rx - 30) / 2;
  BUTTONS.forEach(([r, lab], i) => {
    let bx = rx + (i % 2) * (bw + 8), by = 96 + Math.floor(i / 2) * 34;
    stroke(...(r === 'close' || r === 'undo' ? LILAC : SKY)); strokeWeight(1.2); fill(...PANEL); rect(bx, by, bw, 28, 5);
    noStroke(); fill(...INK); textSize(13); textAlign(CENTER, CENTER); text(lab, bx + bw / 2, by + 14);
    hits.push(['rule', r, bx, by, bw, 28]);
  });
  let cy = 96 + Math.ceil(BUTTONS.length / 2) * 34 + 20, cx = rx;
  fill(...YEL); textSize(14); textAlign(LEFT, BASELINE); text('候補の式（仮定・∨I・⊥E で使う）：' + (cand ? fmlStr(cand) : 'なし'), rx, cy); cy += 10;
  textSize(14);
  for (let f of cands) {
    let s = fmlStr(f), w = textWidth(s) + 16;
    if (cx + w > width - 20) { cx = rx; cy += 30; }
    stroke(...(cand && fmlEq(cand, f) ? YEL : LINEC)); fill(...PANEL); rect(cx, cy, w, 24, 12);
    noStroke(); fill(...INK); textAlign(CENTER, CENTER); text(s, cx + w / 2, cy + 12);
    hits.push(['cand', f, cx, cy, w, 24]); cx += w + 6;
  }
  drawSelfTest(width - 180, height - 14);
}

function mousePressed() {
  for (let [kind, v, x, y, w, h] of hits) {
    if (mouseX < x || mouseX > x + w || mouseY < y || mouseY > y + h) continue;
    if (kind === 'line') { let i = sel.indexOf(v); if (i >= 0) sel.splice(i, 1); else if (sel.length < 3) sel.push(v); }
    if (kind === 'rule') press(v);
    if (kind === 'cand') cand = cand && fmlEq(cand, v) ? null : v;
    return;
  }
}
function keyPressed() {
  if (key >= '1' && key <= '6') loadExercise(Number(key) - 1);
  if (key === 'u' || key === 'U' || key === 'Backspace') press('undo');
  if (key === 'x' || key === 'X') press('close');
  if (key === 'c' || key === 'C') loadExercise(ex);
  if (key === 'h' || key === 'H') { pf = freshProof(ex); pf.lines = pf.lines.concat(solutionLines(ex)); pf.depth = 0; hist = []; sel = []; msg = 'お手本（チェッカーで検査ずみ）。C で最初から自分で'; }
  return false;
}

// ---- 自己テスト
function entailed(st, c, k) {           // 意味の検査：前提 ＋ その行で開いている仮定 ⊨ その行（真理値表）
  let hyps = st.lines.filter((L) => L.rule === 'prem').map((L) => L.f).concat(c.scopes[k].map((i) => st.lines[i].f));
  let all = hyps.reduce((acc, h) => fBin('and', acc, h), F_TOP);
  return classifyFml(fBin('imp', all, st.lines[k].f)).kind === 'taut';
}
function selfTest() {
  selfTestResults = [];
  const ex0 = ex;                     // 自己テストのあと、はじめの課題にもどすため
  let okAll = true, sound = true;
  EXERCISES.forEach((e, k) => {
    let st = freshProof(k); st.lines = st.lines.concat(solutionLines(k));
    let c = ndCheck(st.lines);
    if (!c.ok || !solved(st)) okAll = false;
    st.lines.forEach((L, i) => { if (!entailed(st, c, i)) sound = false; });
  });
  check('お手本 ' + EXERCISES.length + ' 問：チェッカーが全部の行を認めて、結論に着く', okAll);
  check('お手本の全部の行で「前提 ＋ 開いている仮定 ⊨ その行」（真理値表で意味を確認）', sound);
  seedRng(21); let made = 0, badSem = 0;
  const RULES = BUTTONS.map((b) => b[0]).filter((r) => r !== 'undo');
  for (let k = 0; k < EXERCISES.length; k++) for (let t = 0, ck = candsOf(k); t < 4; t++) {
    let st = freshProof(k);
    for (let a = 0; a < 60 && st.lines.length < 24; a++) {
      let n = st.lines.length, s = []; for (let j = rndInt(0, 3); j > 0 && n; j--) s.push(rndInt(0, n - 1));
      if (!tryRule(st, rndPick(RULES), s, rnd() < 0.8 ? rndPick(ck) : null) && st.lines.length > n) made++;
    }
    let c = ndCheck(st.lines);
    if (!c.ok) badSem++;
    st.lines.forEach((L, i) => { if (!entailed(st, c, i)) badSem++; });
  }
  check('でたらめにボタンを押して作った ' + made + ' 行も、チェッカーが通した行は全部「意味として正しい」（健全性）', badSem === 0 && made > 80);
  const rej = (k, lines) => { let st = freshProof(k); st.lines = st.lines.concat(lines); return !ndCheck(st.lines).ok; };
  const Ln = (d, r, refs, s) => ({ f: fm(s), rule: r, refs: refs.map((x) => x - 1), depth: d });
  check('はねる例 1：閉じた箱の中の行（q）を外で使う', rej(0, solutionLines(0).concat([Ln(0, 'reit', [4], 'q')])));
  check('はねる例 2：→E の前件がちがう（q → r と p から r）', rej(0, [Ln(1, 'assume', [], 'p'), Ln(1, 'impE', [2, 3], 'r')]));
  check('はねる例 3：∧E で p ∧ q から q を「左」として取り出す', rej(2, [Ln(0, 'andE1', [1], 'q')]));
  check('はねる例 4：⊥ で終わらない箱で背理法', rej(1, [Ln(1, 'assume', [], '¬p'), Ln(1, 'reit', [2], '¬p'), Ln(0, 'raa', [2], 'p')]));
  check('はねる例 5：箱の最後の行が内側の箱の中（p を仮定 / q を仮定 / q → 外の箱で p → q）', rej(5, [Ln(1, 'assume', [], 'p'), Ln(2, 'assume', [], 'q'), Ln(2, 'reit', [2], 'q'), Ln(0, 'impI', [1], 'p → q')]));
  check('はねる例 6：まだ閉じていない箱を →I で参照する、仮定なしで深い行', rej(5, [Ln(1, 'assume', [], 'p'), Ln(1, 'impI', [1], 'p → p')]) && rej(0, [Ln(1, 'reit', [1], 'p → q')]));
  reportSelfTest();
  loadExercise(ex0);
}
function candsOf(k) { loadExercise(k); return cands; }

// ---------- やってみよう ----------
// 1. 課題 1：p を仮定（候補の p → 仮定）、1 と 3 を選んで →E、2 と 4 を選んで →E、→I で箱を閉じる
// 2. 課題 4 は ∨E：p を仮定して q ∨ p、X で箱を閉じ、q を仮定して q ∨ p。最後に 1・2・4 行目を選んで ∨E（2 つ目の箱はここで閉じる）
// 3. 課題 2 を ¬¬E を使わずに。背理法なしでは ¬¬p ⊢ p は証明できない（直観主義論理。09 のカリー-ハワードを見よう）
// 4. わざとまちがえよう：閉じた箱の中の行を選んで使うと、チェッカーは何と言う？
// 5. EXERCISES に課題を足そう：例 ['分配', ['p ∧ (q ∨ r)'], '(p ∧ q) ∨ (p ∧ r)', []]（お手本は空でもよいが自己テストは ✗ になる）

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
