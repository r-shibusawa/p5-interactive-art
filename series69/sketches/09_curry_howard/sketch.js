// ============================================
// 09 カリー-ハワード対応 ─ 「型 = 命題」「プログラム（λ 式）= 証明」。λ 式の型を推論すると、その導出の木は自然演繹の証明と同じ形
// λx.M（関数を作る）= →導入（仮定 x を外す）、M N（関数を使う）= →除去、変数 = 仮定。λx.λy.x : A → B → A は p → (q → p) の証明。
// ただし対応するのは直観主義論理：パースの法則 ((A→B)→A)→A や ¬¬A → A は古典論理では恒真なのに、その型を持つ λ 式はない
// （型 → 式の探索が有限の場合を全部調べて「ない」と確かめる。古典論理には継続（call/cc）のような道具が要る）。¬A は A → ⊥ と書く
// Tab 式 → 型 ⇔ 型 → 式 / ↑↓ お手本 / 式 → 型 では文字キーで λ 式を入力（08 と同じ：\ = λ、大文字 = I K S B C など）/ Backspace / Esc
// ============================================

const TERM_PRESETS = ['K', 'I', 'S', 'B', 'C', '\\x.\\f.f x', '2', '\\f.\\g.\\x.g (f x)', '\\x.x x', 'Y'];   // ★ 式 → 型 のお手本
const TYPE_PRESETS = [                  // ★ 型 → 式 のお手本（大文字 1 字 = 型の変数、⊥ = 偽）
  'A → B → A', '(A → B → C) → (A → B) → A → C', '(A → B) → (B → C) → A → C', 'A → (A → ⊥) → ⊥', '(A → B) → (B → ⊥) → A → ⊥',
  '((A → B) → A) → A', '((A → ⊥) → ⊥) → A', 'A → B',
];
const SEARCH_MAX = 20000;               // ★ 探索の上限（呼び出しの回数）
let allTypes = [], chMode = 'term', src = '', tIdx = 0, yIdx = 0, err = '', cur = null, found = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadTerm(0); loadType(0);
  allTypes = TYPE_PRESETS.map((t) => { let g = tyParse(t); return { s: t, m: searchTerm(g).m, taut: classifyFml(tyToFml(g)).kind === 'taut' }; });
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
// ---- 型：{ t: 'tv', n } 型の変数 / { t: 'fn', a, b } a → b / { t: 'bot' } ⊥
function tyStr(ty, s) {
  ty = s ? tyWalk(ty, s) : ty;
  if (ty.t === 'tv') return ty.n;
  if (ty.t === 'bot') return '⊥';
  let a = s ? tyWalk(ty.a, s) : ty.a;
  return (a.t === 'fn' ? '(' + tyStr(a, s) + ')' : tyStr(a, s)) + ' → ' + tyStr(ty.b, s);
}
function tyParse(str) {                 // 'A → (B → C)' → 型（→ は右から）
  let toks = str.replace(/->/g, '→').match(/[A-Z]|⊥|→|\(|\)/g) || [], i = 0;
  const atom = () => { let t = toks[i++]; if (t === '(') { let r = arrow(); i++; return r; } return t === '⊥' ? { t: 'bot' } : { t: 'tv', n: t }; };
  const arrow = () => { let a = atom(); if (toks[i] === '→') { i++; return { t: 'fn', a, b: arrow() }; } return a; };
  return arrow();
}
function tyWalk(ty, s) { while (ty.t === 'tv' && s[ty.n]) ty = s[ty.n]; return ty; }
function tyOccurs(n, ty, s) { ty = tyWalk(ty, s); return ty.t === 'tv' ? ty.n === n : ty.t === 'fn' && (tyOccurs(n, ty.a, s) || tyOccurs(n, ty.b, s)); }
function tyUnify(a, b, s) {             // 型の単一化（出現検査つき）。失敗なら false
  a = tyWalk(a, s); b = tyWalk(b, s);
  if (a.t === 'tv' && b.t === 'tv' && a.n === b.n) return true;
  if (a.t === 'tv') { if (tyOccurs(a.n, b, s)) return false; s[a.n] = b; return true; }
  if (b.t === 'tv') return tyUnify(b, a, s);
  if (a.t !== b.t) return false;
  return a.t === 'bot' || (tyUnify(a.a, b.a, s) && tyUnify(a.b, b.b, s));
}
function tyResolve(ty, s) { ty = tyWalk(ty, s); return ty.t === 'fn' ? { t: 'fn', a: tyResolve(ty.a, s), b: tyResolve(ty.b, s) } : ty; }
function tyRename(ty) {                 // 型の変数を出てくる順に A, B, C, … に
  let m = {}, k = 0;
  const go = (u) => (u.t === 'tv' ? { t: 'tv', n: m[u.n] || (m[u.n] = 'ABCDEFGHIJ'[k++] || 'Z' + k) } : u.t === 'fn' ? { t: 'fn', a: go(u.a), b: go(u.b) } : u);
  return go(ty);
}
// ★ 型の推論（ヒンドリー-ミルナーの let なし版）：導出の木を作りながら、型の方程式を単一化で解く
function inferType(m) {
  let s = {}, fresh = 0, fail = '';
  const go = (m, ctx) => {
    if (fail) return null;
    if (m.t === 'v') {
      let h = ctx.slice().reverse().find((c) => c[0] === m.n);
      if (!h) { fail = '自由変数 ' + m.n + ' の型がわからない（仮定がない）'; return null; }
      return { rule: 'var', m, ty: h[1], kids: [] };
    }
    if (m.t === 'l') { let a = { t: 'tv', n: 't' + fresh++ }, body = go(m.b, ctx.concat([[m.v, a]])); return body && { rule: 'abs', m, ty: { t: 'fn', a, b: body.ty }, kids: [body], v: m.v, hyp: a }; }
    let f = go(m.f, ctx), x = go(m.x, ctx); if (!f || !x) return null;
    let r = { t: 'tv', n: 't' + fresh++ };
    if (!tyUnify(f.ty, { t: 'fn', a: x.ty, b: r }, s)) { fail = '型が合わない：' + lamStr(m.f) + ' を ' + lamStr(m.x) + ' に使えない（無限の型 または 形のちがい）'; return null; }
    return { rule: 'app', m, ty: r, kids: [f, x] };
  };
  let d = go(m, []);
  if (!d) return { error: fail };
  return { tree: d, ty: tyRename(tyResolve(d.ty, s)), s };
}
// ★ 型 → 式：直観主義の証明探索（目標が A → B なら仮定 A を足して B を、A がただの変数なら仮定から A を作る）
function searchTerm(goal) {
  let calls = 0, names = 0, hit = false;
  const target = (ty) => { let args = []; while (ty.t === 'fn') { args.push(ty.a); ty = ty.b; } return { args, head: ty }; };
  const go = (ctx, g, path) => {
    if (++calls > SEARCH_MAX) { hit = true; return null; }
    if (g.t === 'fn') { let x = 'xyzuvwpqrs'[names % 10] + (names >= 10 ? Math.floor(names / 10) : ''); names++; let b = go(ctx.concat([[x, g.a]]), g.b, path); return b && lamL(x, b); }
    let key = [...new Set(ctx.map((c) => tyStr(c[1])))].sort().join(';') + '⊢' + tyStr(g);
    if (path.has(key)) return null;     // 同じ問いに戻ってきた（ループ）
    path = new Set(path); path.add(key);
    for (let k = ctx.length - 1; k >= 0; k--) {
      let { args, head } = target(ctx[k][1]);
      if (tyStr(head) !== tyStr(g)) continue;
      let term = lamV(ctx[k][0]), ok = true;
      for (let a of args) { let sub = go(ctx, a, path); if (!sub) { ok = false; break; } term = lamA(term, sub); }
      if (ok) return term;
    }
    return null;
  };
  let m = go([], goal, new Set());
  return { m, calls, hitBound: hit };
}
function tyToFml(ty) { return ty.t === 'tv' ? fVar(ty.n.toLowerCase()) : ty.t === 'bot' ? F_BOT : fBin('imp', tyToFml(ty.a), tyToFml(ty.b)); }
function tyMatches(general, goal) {     // general の型の変数に何かを入れると goal になるか
  let b = {};
  const go = (g, t) => { if (g.t === 'tv') { if (b[g.n]) return tyStr(b[g.n]) === tyStr(t); b[g.n] = t; return true; } if (g.t !== t.t) return false; return g.t === 'bot' || (go(g.a, t.a) && go(g.b, t.b)); };
  return go(general, goal);
}
function loadTerm(i) { tIdx = (i + TERM_PRESETS.length) % TERM_PRESETS.length; src = TERM_PRESETS[tIdx]; rebuild(); }
function loadType(i) { yIdx = (i + TYPE_PRESETS.length) % TYPE_PRESETS.length; let g = tyParse(TYPE_PRESETS[yIdx]); found = Object.assign(searchTerm(g), { goal: g, taut: classifyFml(tyToFml(g)).kind === 'taut' }); }
function rebuild() {
  let r = lamParse(src);
  if (r.error) { err = r.error + '（' + (r.at + 1) + ' 文字目あたり）'; return; }
  err = ''; cur = Object.assign(inferType(r.m), { m: r.m });
}

// ---- 証明の木（下が結論、上が前提）を描く
const TREE_GAP = 64;                    // 並んだ前提のあいだ（規則の名前が入る）
function treeWidth(d, lab) { textSize(14); d.w = Math.max(textWidth(lab(d)) + 20, d.kids.reduce((s, k) => s + treeWidth(k, lab) + TREE_GAP, -TREE_GAP)); return d.w; }
function drawProofTree(d, x, y, lab, side, s) {   // x = 左はし、y = 結論の線の下
  let cs = lab(d), kw = d.kids.reduce((t, k) => t + k.w + TREE_GAP, -TREE_GAP), kx = x + (d.w - Math.max(0, kw)) / 2;
  noStroke(); fill(...(d === cur?.tree ? YEL : INK)); textSize(14); textAlign(CENTER, TOP); text(cs, x + d.w / 2, y + 4);
  if (d.rule === 'var') { fill(...DIMC); textSize(11); text(side === 'logic' ? '仮定 ' + d.m.n : '変数', x + d.w / 2, y - 14); return; }
  let lw = Math.max(textWidth(cs), kw - (d.kids.length ? d.kids[0].w / 2 + d.kids[d.kids.length - 1].w / 2 : 0) + 40) + 10;
  stroke(...SKY); strokeWeight(1.3); line(x + d.w / 2 - lw / 2, y, x + d.w / 2 + lw / 2, y);
  noStroke(); fill(...SKY); textSize(11); textAlign(LEFT, CENTER);
  text(d.rule === 'abs' ? (side === 'logic' ? '→I（' + d.v + ' を外す）' : 'λ') : side === 'logic' ? '→E' : '適用', x + d.w / 2 + lw / 2 + 4, y);
  d.kids.forEach((k) => { drawProofTree(k, kx, y - 40, lab, side, s); kx += k.w + TREE_GAP; });
}
function treeDepth(d) { return 1 + Math.max(0, ...d.kids.map(treeDepth)); }

function draw() {
  background(...BG);
  hudTitle('カリー-ハワード対応：' + (chMode === 'term' ? 'λ 式（プログラム）の型（命題）を推論する' : '型（命題）から λ 式（証明）を探す'), 'Tab 式 → 型 ⇔ 型 → 式　↑↓ お手本　（式 → 型）文字キーで λ 式を入力（\\ = λ、I K S B C など）　Backspace / Esc 消す');
  if (chMode === 'term') {
    drawInputLine(30, 104, 'λ 式：', src, err);
    if (!cur) return;
    noStroke(); textAlign(LEFT, BASELINE); textSize(18);
    if (cur.error) { fill(...PINK); text('型がつかない：' + cur.error, 30, 156); fill(...DIMC); textSize(14); text('型のつかない式 = 証明にならない式。λx.x x は「x : A かつ x : A → B」となり A = A → B（無限の型）が必要', 30, 184); }
    else {
      let s = cur.s, nm = {}, k = 0;
      const ren = (ty) => { let u = tyResolve(ty, s); const go = (v) => (v.t === 'tv' ? { t: 'tv', n: nm[v.n] || (nm[v.n] = 'ABCDEFGHIJ'[k++] || 'Z') } : v.t === 'fn' ? { t: 'fn', a: go(v.a), b: go(v.b) } : v); return go(u); };
      ren(cur.tree.ty);
      fill(...YEL); text(lamStr(cur.m) + '　:　' + tyStr(cur.ty), 30, 156);
      fill(...DIMC); textSize(14); text('論理式として読むと：' + fmlStr(tyToFml(cur.ty)) + '（' + KIND_JA[classifyFml(tyToFml(cur.ty)).kind] + '）', 30, 182);
      let dep = treeDepth(cur.tree), baseY = Math.min(height - 120, 230 + dep * 40);
      const labT = (d) => { let t = lamStr(d.m); return (t.length > 26 ? t.slice(0, 25) + '…' : t) + ' : ' + tyStr(ren(d.ty)); };
      const labL = (d) => tyStr(ren(d.ty));
      let wT = treeWidth(cur.tree, labT); drawProofTree(cur.tree, 30 + Math.max(0, (width * 0.5 - 40 - wT) / 2), baseY, labT, 'type', s);
      let wL = treeWidth(cur.tree, labL); drawProofTree(cur.tree, width * 0.55 + Math.max(0, (width * 0.43 - wL) / 2), baseY, labL, 'logic', s);
      noStroke(); fill(...SKY); textSize(15); textAlign(LEFT, BASELINE);
      text('型の導出（プログラム）', 30, 214); text('自然演繹の証明（命題）', width * 0.55, 214);
      fill(...DIMC); textSize(13); text('同じ形の木：λ = →I（仮定を外す）、適用 = →E、変数 = 仮定', 30, height - 60);
    }
  } else {
    let g = found.goal;
    noStroke(); textAlign(LEFT, BASELINE); fill(...YEL); textSize(20); text('型（命題）：' + tyStr(g) + '　（' + (yIdx + 1) + ' / ' + TYPE_PRESETS.length + '）', 30, 110);
    fill(...DIMC); textSize(15); text('論理式として：' + fmlStr(tyToFml(g)) + '　　古典論理（真理値表）では ' + (found.taut ? '恒真' : '恒真ではない'), 30, 140);
    textSize(20);
    if (found.m) { let it = inferType(found.m); fill(...GRN); text('見つけた λ 式（証明）：' + lamStr(found.m), 30, 190); fill(...DIMC); textSize(15); text('その式の型を推論すると ' + (it.ty ? tyStr(it.ty) : '?') + '（目標はその特別な場合）', 30, 220); }
    else if (found.hitBound) { fill(...YEL); text('探索の上限 ' + SEARCH_MAX + ' 回に当たった：わからない', 30, 190); }
    else { fill(...PINK); text('この型を持つ λ 式はない（' + found.calls + ' 回の探索で、可能性を全部調べた）', 30, 190); fill(...DIMC); textSize(15); text(found.taut ? '古典論理では恒真なのに、直観主義論理（= 型のある λ 計算）では証明できない。古典論理には継続（call/cc）などの道具が要る' : '古典論理でも恒真ではないので、証明がないのは当然', 30, 220); }
    fill(...DIMC); textSize(13); textAlign(LEFT, TOP); textLeading(19);
    allTypes.forEach((o, k) => { fill(...(k === yIdx ? YEL : INK)); textSize(14); text(o.s, 60, 360 + k * 26); fill(...(o.m ? GRN : PINK)); text(o.m ? 'λ 式あり：' + lamStr(o.m) : 'λ 式なし', 420, 360 + k * 26); fill(...DIMC); text(o.taut ? '古典では恒真' : '古典でも恒真ではない', 800, 360 + k * 26); });
    fill(...DIMC); textSize(13);
    text('探し方：目標が A → B なら「x : A を仮定して B を探す」（λx. …）。目標が型の変数なら、仮定の中から「… → 目標」の形の関数を選んで、引数を探す。\n同じ仮定の集まりで同じ目標に戻ってきたらやめる（ループ）。仮定は目標の部分式だけなので、調べることは有限で、必ず終わる。', 30, 260, width - 60, 80);
  }
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === 'Tab') { chMode = chMode === 'term' ? 'type' : 'term'; return false; }
  if (key === UP_ARROW) { if (chMode === 'term') loadTerm(tIdx - 1); else loadType(yIdx - 1); return false; }
  if (key === DOWN_ARROW) { if (chMode === 'term') loadTerm(tIdx + 1); else loadType(yIdx + 1); return false; }
  if (chMode !== 'term') return false;
  if (key === 'Backspace') src = src.slice(0, -1);
  else if (key === 'Escape' || key === 'Delete') src = '';
  else src = typeInto(src, key, LAM_KEYS, 120);
  rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  const ty = (s) => { let o = inferType(lamParse(s).m); return o.error ? 'ERR' : tyStr(o.ty); };
  check('I : A → A、K : A → B → A', ty('I') === 'A → A' && ty('K') === 'A → B → A');
  check('S : (A → B → C) → (A → B) → A → C', ty('S') === '(A → B → C) → (A → B) → A → C');
  check('合成 B : (A → B) → (C → A) → C → B、C : (A → B → C) → B → A → C', ty('B') === '(A → B) → (C → A) → C → B' && ty('C') === '(A → B → C) → B → A → C');
  check('チャーチ数 2 : (A → A) → A → A', ty('2') === '(A → A) → A → A');
  check('λx.x x、Y、Ω には型がつかない（出現検査で失敗）', ty('\\x.x x') === 'ERR' && ty('Y') === 'ERR' && ty('OMEGA') === 'ERR');
  let okTree = true;
  for (let s of ['I', 'K', 'S', 'B', 'C', '\\x.\\f.f x', '2', 'SUCC']) {
    let o = inferType(lamParse(s).m);
    const chk = (d) => { let t = tyResolve(d.ty, o.s); if (d.rule === 'abs' && !(t.t === 'fn' && tyStr(tyResolve(d.kids[0].ty, o.s)) === tyStr(t.b))) okTree = false;
      if (d.rule === 'app') { let f = tyResolve(d.kids[0].ty, o.s); if (!(f.t === 'fn' && tyStr(f.a) === tyStr(tyResolve(d.kids[1].ty, o.s)) && tyStr(f.b) === tyStr(t))) okTree = false; } d.kids.forEach(chk); };
    chk(o.tree);
  }
  check('導出の木の全部の段が規則（λ = →I、適用 = →E）の形になっている（8 つの式）', okTree);
  let okFind = ['A → B → A', '(A → B → C) → (A → B) → A → C', '(A → B) → (B → C) → A → C', 'A → (A → ⊥) → ⊥'].every((s) => {
    let g = tyParse(s), r = searchTerm(g); if (!r.m) return false; let it = inferType(r.m); return it.ty && tyMatches(it.ty, g); });
  check('K・S の型、三段論法、A → ¬¬A には λ 式が見つかり、その式の型は目標に合う', okFind);
  let pe = searchTerm(tyParse('((A → B) → A) → A')), dn = searchTerm(tyParse('((A → ⊥) → ⊥) → A'));
  check('パースの法則と ¬¬A → A：全部調べても λ 式はない（上限には当たらない）が、真理値表では恒真', !pe.m && !pe.hitBound && !dn.m && !dn.hitBound && classifyFml(tyToFml(tyParse('((A → B) → A) → A'))).kind === 'taut' && classifyFml(tyToFml(tyParse('((A → ⊥) → ⊥) → A'))).kind === 'taut');
  seedRng(14); let nFound = 0, sound = true;
  const rt = (d) => (d <= 0 || rnd() < 0.3 ? (rnd() < 0.15 ? { t: 'bot' } : { t: 'tv', n: rndPick(['A', 'B', 'C']) }) : { t: 'fn', a: rt(d - 1), b: rt(d - 1) });
  for (let k = 0; k < 150; k++) {
    let g = rt(3), r = searchTerm(g);
    if (r.hitBound) { sound = false; continue; }
    if (r.m) { nFound++; let it = inferType(r.m); if (!it.ty || !tyMatches(it.ty, g) || classifyFml(tyToFml(g)).kind !== 'taut') sound = false; }
  }
  check('でたらめな型 150 個：見つけた λ 式（' + nFound + ' 個）は型が合い、その命題は古典論理でも恒真（健全）', sound && nFound > 10);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. K = λx.λy.x の 2 つの木を見くらべよう。「y を使わない」= 仮定 B を使わずに外す（→I）
// 2. λf.λg.λx.g (f x) の型は？ 論理式として読むと「三段論法」(p→q)→(q→r)→(p→r)
// 3. 型 → 式（Tab）で A → B を選ぶと「ない」。古典論理でも恒真ではないので当然。パースの法則とのちがいは？
// 4. ¬¬A → A は証明できないが、A → ¬¬A はできる（λx.λf.f x）。02 の自然演繹の課題 2 で背理法が要った理由
// 5. TYPE_PRESETS に足そう：(A → A → B) → A → B、((A → B) → C) → (A → C) など。λ 式は見つかる？

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
// ---- ラムダ計算の道具：λ 式 = { t: 'v', n } 変数 / { t: 'l', v, b } λv.b / { t: 'a', f, x } 適用 f x
// 書き方：\x.x や λx.x（λx y.M = λx.λy.M）、適用は並べるだけ（左から：f x y = (f x) y）、
// 数字 n = チャーチ数 λf.λx.f(…(f x))、大文字の名前 = 下の LAM_DEFS
const LAM_KEYS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\\.() \'';
const LAM_MAX_NUM = 12, LAM_MAX_SIZE = 2500;   // ★ チャーチ数の上限、式の大きさ（記号の数）の上限
const LAM_DEFS = {                      // ★ 名前つきの式（大文字）。自分で足してもよい
  I: '\\x.x', K: '\\x y.x', S: '\\x y z.x z (y z)', B: '\\f g x.f (g x)', C: '\\f x y.f y x',
  TRUE: '\\t f.t', FALSE: '\\t f.f', IF: '\\b t e.b t e', NOT: '\\b.b FALSE TRUE', AND: '\\a b.a b FALSE', OR: '\\a b.a TRUE b',
  SUCC: '\\n f x.f (n f x)', PLUS: '\\m n f x.m f (n f x)', TIMES: '\\m n f.m (n f)', POW: '\\b e.e b',
  PRED: '\\n f x.n (\\g h.h (g f)) (\\u.x) (\\u.u)', ISZERO: '\\n.n (\\x.FALSE) TRUE',
  OMEGA: '(\\x.x x) (\\x.x x)', Y: '\\f.(\\x.f (x x)) (\\x.f (x x))',
};
function lamV(n) { return { t: 'v', n }; }
function lamL(v, b) { return { t: 'l', v, b }; }
function lamA(f, x) { return { t: 'a', f, x }; }
function churchNum(n) { let b = lamV('x'); for (let i = 0; i < n; i++) b = lamA(lamV('f'), b); return lamL('f', lamL('x', b)); }
function lamSize(m) { return m.t === 'v' ? 1 : m.t === 'l' ? 1 + lamSize(m.b) : 1 + lamSize(m.f) + lamSize(m.x); }
function lamParse(src, guard) {         // 返り値 {m} または {error, at}（例外は投げない）
  if (typeof src !== 'string') return { error: '文字列ではない', at: 0 };
  if (src.length > 200) return { error: '長すぎる（200 文字まで）', at: 200 };
  let toks = [], i = 0;
  while (i < src.length) {
    let c = src[i];
    if (c === ' ') { i++; continue; }
    if (c === '\\' || c === 'λ') { toks.push({ k: 'lam', at: i }); i++; continue; }
    if (c === '.' || c === '(' || c === ')') { toks.push({ k: c, at: i }); i++; continue; }
    if (c >= 'a' && c <= 'z') { let j = i + 1; while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === "'")) j++; toks.push({ k: 'var', n: src.slice(i, j), at: i }); i = j; continue; }
    if (c >= 'A' && c <= 'Z') { let j = i + 1; while (j < src.length && src[j] >= 'A' && src[j] <= 'Z') j++; toks.push({ k: 'def', n: src.slice(i, j), at: i }); i = j; continue; }
    if (c >= '0' && c <= '9') { let j = i + 1; while (j < src.length && src[j] >= '0' && src[j] <= '9') j++; toks.push({ k: 'num', n: src.slice(i, j), at: i }); i = j; continue; }
    return { error: '使えない文字「' + c + '」', at: i };
  }
  if (!toks.length) return { error: '式が空', at: 0 };
  let pos = 0, depth = 0;
  const peek = () => toks[pos], fail = (m) => { throw { msg: m, at: toks[pos] ? toks[pos].at : src.length }; };
  const pTerm = () => {
    if (++depth > 80) fail('入れ子が深すぎる');
    let r;
    if (peek() && peek().k === 'lam') {
      pos++; let vs = [];
      while (peek() && peek().k === 'var') { vs.push(peek().n); pos++; }
      if (!vs.length) fail('λ のあとに変数の名前（小文字）が要る');
      if (!peek() || peek().k !== '.') fail('λx のあとに「.」が要る');
      pos++; r = pTerm();
      for (let k = vs.length - 1; k >= 0; k--) r = lamL(vs[k], r);
    } else {
      r = null;
      while (peek() && peek().k !== ')' && peek().k !== '.') {
        let a = peek().k === 'lam' ? pTerm() : pAtom();
        r = r ? lamA(r, a) : a;
      }
      if (!r) fail(peek() ? '「' + peek().k + '」の前に式がない' : '式が途中で終わっている');
      if (peek() && peek().k === '.') fail('「.」は λx のあとだけ');
    }
    depth--; return r;
  };
  const pAtom = () => {
    let t = peek(); pos++;
    if (t.k === 'var') return lamV(t.n);
    if (t.k === 'num') { let v = Number(t.n); if (!(v <= LAM_MAX_NUM)) { pos--; fail('数が大きすぎる（' + LAM_MAX_NUM + ' まで）'); } return churchNum(v); }
    if (t.k === 'def') {
      let d = LAM_DEFS[t.n];
      if (!d) { pos--; fail('「' + t.n + '」という名前はない'); }
      if ((guard || 0) > 6) { pos--; fail('名前の中の名前が深すぎる'); }
      let o = lamParse(d, (guard || 0) + 1);
      if (o.error) { pos--; fail(t.n + ' の定義がまちがい：' + o.error); }
      return o.m;
    }
    if (t.k === '(') { let m = pTerm(); if (!peek() || peek().k !== ')') fail('「)」が足りない'); pos++; return m; }
    pos--; fail('ここに式が要る');
  };
  try {
    let m = pTerm();
    if (pos < toks.length) return { error: toks[pos].k === ')' ? '余分な「)」' : '読めない所がある', at: toks[pos].at };
    if (lamSize(m) > LAM_MAX_SIZE) return { error: '大きすぎる（' + LAM_MAX_SIZE + ' 記号まで）', at: 0 };
    return { m };
  } catch (e) { return { error: e && e.msg ? e.msg : '読めない式', at: e && e.at !== undefined ? e.at : 0 }; }
}
function lamStr(m, hi, out) {           // 文字列に。hi（簡約する場所）の部分を [文字列, true] で返す
  let top = !out; out = out || [];
  const put = (s) => out.push([s, false]);
  const go = (m, inHi) => {
    let h = inHi || m === hi, mark = (s) => out.push([s, h]);
    if (m.t === 'v') mark(m.n);
    else if (m.t === 'l') { mark('λ' + m.v + '.'); go(m.b, h); }
    else {
      let pf = m.f.t === 'l', px = m.x.t !== 'v';
      if (pf) mark('('); go(m.f, h); if (pf) mark(')');
      mark(' ');
      if (px) mark('('); go(m.x, h); if (px) mark(')');
    }
  };
  go(m, false);
  if (!top) return out;
  let merged = [];                      // 同じ色の部分をつなげる
  for (let [s, h] of out) { if (merged.length && merged[merged.length - 1][1] === h) merged[merged.length - 1][0] += s; else merged.push([s, h]); }
  return hi === undefined ? merged.map((x) => x[0]).join('') : merged;
}
function lamFree(m, out) {              // 自由変数
  out = out || new Set();
  if (m.t === 'v') out.add(m.n);
  else if (m.t === 'l') { let inner = lamFree(m.b); inner.delete(m.v); inner.forEach((v) => out.add(v)); }
  else { lamFree(m.f, out); lamFree(m.x, out); }
  return out;
}
function lamAllNames(m, out) { out = out || new Set(); if (m.t === 'v') out.add(m.n); else if (m.t === 'l') { out.add(m.v); lamAllNames(m.b, out); } else { lamAllNames(m.f, out); lamAllNames(m.x, out); } return out; }
function freshName(v, avoid) { let w = v; while (avoid.has(w)) w += "'"; return w; }
function lamSubst(m, x, s, fvS) {       // m[x := s]（変数の捕獲をさける：ぶつかる束縛変数は名前を変える）
  fvS = fvS || lamFree(s);
  if (m.t === 'v') return m.n === x ? s : m;
  if (m.t === 'a') return lamA(lamSubst(m.f, x, s, fvS), lamSubst(m.x, x, s, fvS));
  if (m.v === x) return m;
  if (!fvS.has(m.v)) return lamL(m.v, lamSubst(m.b, x, s, fvS));
  let avoid = new Set([...fvS, ...lamAllNames(m.b), x]), w = freshName(m.v, avoid);
  return lamL(w, lamSubst(lamSubst(m.b, m.v, lamV(w)), x, s, fvS));
}
function lamRedex(m, order) {           // 次に簡約する (λx.M) N の場所。order = 'normal'（外側・左から）/ 'applicative'（内側・左から）
  if (m.t === 'v') return null;
  if (m.t === 'l') return lamRedex(m.b, order);
  if (order === 'normal' && m.f.t === 'l') return m;
  let r = lamRedex(m.f, order) || lamRedex(m.x, order);
  if (r) return r;
  return m.f.t === 'l' ? m : null;
}
function lamReplace(m, target, rep) {   // target（同じもの）を rep に置きかえた新しい木
  if (m === target) return rep;
  if (m.t === 'v') return m;
  if (m.t === 'l') { let b = lamReplace(m.b, target, rep); return b === m.b ? m : lamL(m.v, b); }
  let f = lamReplace(m.f, target, rep); if (f !== m.f) return lamA(f, m.x);
  let x = lamReplace(m.x, target, rep); return x === m.x ? m : lamA(m.f, x);
}
function lamStep(m, order) {            // β 簡約 1 歩：返り値 {m, redex} / null（正規形）
  let r = lamRedex(m, order || 'normal');
  if (!r) return null;
  return { m: lamReplace(m, r, lamSubst(r.f.b, r.f.v, r.x)), redex: r };
}
function lamNormalize(m, maxSteps, order) {   // 返り値 {m, steps, status: 'normal' | 'steps' | 'size'}
  let n = 0;
  while (n < maxSteps) {
    let s = lamStep(m, order);
    if (!s) return { m, steps: n, status: 'normal' };
    m = s.m; n++;
    if (lamSize(m) > LAM_MAX_SIZE) return { m, steps: n, status: 'size' };
  }
  return { m, steps: n, status: lamRedex(m, order) ? 'steps' : 'normal' };
}
function lamDB(m, ctx) {                // ド・ブラウン記法の文字列（名前によらない形 → α 同値の判定に）
  ctx = ctx || [];
  if (m.t === 'v') { let i = ctx.lastIndexOf(m.n); return i < 0 ? m.n : '#' + (ctx.length - 1 - i); }
  if (m.t === 'l') return 'λ' + lamDB(m.b, ctx.concat([m.v]));
  return '(' + lamDB(m.f, ctx) + ' ' + lamDB(m.x, ctx) + ')';
}
function lamAlphaEq(a, b) { return lamDB(a) === lamDB(b); }
function churchToInt(m) {               // λf.λx.f (f … x) なら数、ちがえば null
  if (m.t !== 'l' || m.b.t !== 'l' || m.v === m.b.v) return null;
  let f = m.v, x = m.b.v, b = m.b.b, n = 0;
  while (b.t === 'a' && b.f.t === 'v' && b.f.n === f) { b = b.x; n++; }
  return b.t === 'v' && b.n === x ? n : null;
}
function lamMeaning(m) {                // 結果の読み方：数・真偽
  let n = churchToInt(m), t = lamParse(LAM_DEFS.TRUE).m, f = lamParse(LAM_DEFS.FALSE).m;
  if (lamAlphaEq(m, t)) return 'TRUE';
  if (lamAlphaEq(m, f)) return 'FALSE（= 0 と同じ形）';
  return n === null ? null : 'チャーチ数 ' + n;
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? GRN : PINK)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
