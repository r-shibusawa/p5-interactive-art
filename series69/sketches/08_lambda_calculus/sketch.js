// ============================================
// 08 ラムダ計算 ─ 「関数を作る λx.M」と「関数に渡す M N」だけの小さな言語。計算は β 簡約：(λx.M) N → M の x を N に置きかえる
// 数（チャーチ数 2 = λf.λx.f (f x)）も真偽（TRUE = λt.λf.t）も足し算も、全部 λ 式で書ける。黄色の部分が次に簡約する所。
// 正規順序（外側・左から）なら、止まる方法があれば必ず止まる。内側から（作用的順序）だと止まらないことがある
// 文字キー = 入力（\ が λ、. ( ) 空白、小文字 = 変数、数字 = チャーチ数、大文字 = 名前つきの式 PLUS TIMES TRUE …）
// → 1 歩 / ← もどる / Enter 自動で最後まで / Tab 正規順序 ⇔ 作用的順序 / ↑↓ お手本 / Backspace / Esc 全部消す
// ============================================

const PRESETS = [                       // ★ お手本 [式, 説明]
  ['PLUS 2 3', '足し算：2 + 3'],
  ['TIMES 2 3', '掛け算：2 × 3'],
  ['SUCC (SUCC 0)', '次の数を 2 回'],
  ['IF TRUE a b', 'もし真なら a、でなければ b'],
  ['AND TRUE FALSE', '真 かつ 偽'],
  ['PRED 3', '1 つ前の数（クリーネの工夫）'],
  ['POW 2 3', '2 の 3 乗'],
  ['(\\x.x x) (\\x.x x)', 'Ω：止まらない式'],
  ['K a OMEGA', '正規順序なら止まる、作用的順序では止まらない'],
  ['(\\x.\\y.x) y', '変数の捕獲：y の名前を変えないとまちがう'],
];
const MAX_STEPS = 300;                  // ★ 簡約の回数の上限
let src = '', pIdx = 0, err = '', hist = [], at = 0, order = 'normal', autoRun = false, endState = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  loadPreset(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function loadPreset(i) { pIdx = (i + PRESETS.length) % PRESETS.length; src = PRESETS[pIdx][0]; rebuild(); }
function rebuild() {
  let r = lamParse(src);
  if (r.error) { err = r.error + '（' + (r.at + 1) + ' 文字目あたり）'; return; }
  err = ''; hist = [{ m: r.m }]; at = 0; autoRun = false; endState = ''; advanceInfo();
}
function advanceInfo() {               // いまの式の次の簡約の場所（なければ正規形）
  let h = hist[at];
  if (h.redex === undefined) h.redex = lamRedex(h.m, order);
  endState = !h.redex ? 'normal' : at >= MAX_STEPS ? 'steps' : lamSize(h.m) > LAM_MAX_SIZE ? 'size' : '';
}
function stepForward() {
  if (at < hist.length - 1) { at++; advanceInfo(); return; }
  advanceInfo(); if (endState) { autoRun = false; return; }
  let s = lamStep(hist[at].m, order);
  hist.push({ m: s.m }); at++; advanceInfo();
}
function layoutSegs(segs, x, y, w, size, maxLines) {   // 色つきの部分を幅で折り返した「連続した文字のかたまり」[x, y, 文字列, 色] に
  textSize(size);
  let runs = [], cy = y, lines = 1, cur = null, lineStr = '', bar = textWidth('|');
  const adv = (t) => (t ? textWidth('|' + t + '|') - 2 * bar : 0);   // 送り幅（textWidth は文字の形の幅なので、両はしに | をつけて測る）
  for (let [s, hi] of segs) for (let ch of s) {
    if (adv(lineStr + ch) > w) { cy += size * 1.35; lines++; cur = null; lineStr = ''; if (lines > maxLines) { runs.push([x, cy, '…（長すぎるので省略）', 'dim']); return { runs, end: cy + size * 1.35 }; } }
    if (!cur || cur[3] !== hi) { cur = [x + adv(lineStr), cy, '', hi]; runs.push(cur); }   // 行の頭からの幅で位置を決める（文字の詰めも正しく）
    cur[2] += ch; lineStr += ch;
  }
  return { runs, end: cy + size * 1.35 };
}
function drawSegs(h, x, y, w, size, maxLines) {   // 式ごとに折り返しを 1 回だけ計算して覚えておく
  if (!h.lay || h.lay.w !== w || h.lay.ord !== order) { h.lay = layoutSegs(lamStr(h.m, h.redex || null), x, y, w, size, maxLines); h.lay.w = w; h.lay.ord = order; }
  textSize(size); textAlign(LEFT, TOP);
  for (let [rx, ry, s, hi] of h.lay.runs) { fill(...(hi === 'dim' ? DIMC : hi ? YEL : INK)); text(s, rx, ry); }
  return h.lay.end;
}

function draw() {
  background(...BG);
  hudTitle('ラムダ計算：β 簡約　(λx.M) N → M[x := N]　（' + (order === 'normal' ? '正規順序：外側・左から' : '作用的順序：内側・左から') + '）',
    '文字キーで入力（\\ = λ、数字 = チャーチ数、大文字 = 名前つきの式）　→ 1 歩　← もどる　Enter 自動　Tab 順序　↑↓ お手本　Esc 消す');
  drawInputLine(30, 104, 'λ 式：', src, err);
  if (!hist.length) return;
  if (autoRun && frameCount % 4 === 0) stepForward();
  let h = hist[at];
  noStroke(); fill(...DIMC); textSize(14); textAlign(LEFT, BASELINE);
  text('お手本 ' + (pIdx + 1) + '：' + PRESETS[pIdx][1] + '　　' + at + ' 歩目　大きさ ' + lamSize(h.m) + ' 記号', 30, 150);
  let yEnd = drawSegs(h, 30, 166, width * 0.6, 19, 9);
  // ---- 判定
  let y = Math.max(yEnd + 10, 330);
  noStroke(); textAlign(LEFT, BASELINE); textSize(18);
  if (endState === 'normal') { let mean = lamMeaning(h.m); fill(...GRN); text('正規形（もう簡約できない）' + (mean ? '　→　' + mean : ''), 30, y); }
  else if (endState === 'steps') { fill(...YEL); text('上限 ' + MAX_STEPS + ' 歩に当たった：止まらないかもしれない', 30, y); }
  else if (endState === 'size') { fill(...YEL); text('式が大きくなりすぎた（' + LAM_MAX_SIZE + ' 記号）', 30, y); }
  else { fill(...INK); text(autoRun ? '簡約中…' : '黄色の (λx.M) N を簡約する（→）', 30, y); }
  // ---- これまでの歩み
  fill(...SKY); textSize(14); text('これまで（新しいのが下）', 30, y + 34);
  let first = Math.max(0, at - 11);
  for (let i = first; i <= at; i++) {
    let s = lamStr(hist[i].m); if (s.length > 96) s = s.slice(0, 95) + '…';
    fill(...(i === at ? INK : DIMC)); textSize(13); text(i + '　' + s, 30, y + 58 + (i - first) * 19);
  }
  // ---- 右：名前つきの式
  let rx = width * 0.66;
  fill(...YEL); textSize(15); text('名前つきの式（大文字で書ける）', rx, 150);
  ['0', '1', '2', 'SUCC', 'PLUS', 'TIMES', 'TRUE', 'FALSE', 'IF', 'NOT', 'AND', 'K', 'S', 'OMEGA', 'Y'].forEach((nm, i) => {
    let d = /\d/.test(nm) ? lamStr(churchNum(Number(nm))) : LAM_DEFS[nm].replace(/\\/g, 'λ');
    fill(...SKY); textSize(13); text(nm, rx, 178 + i * 21); fill(...INK); text(d, rx + 64, 178 + i * 21);
  });
  fill(...DIMC); textSize(12); textLeading(17); textAlign(LEFT, TOP);
  text('数 n = 「f を n 回使う」関数。PLUS m n = 「n 回のあとに m 回」。真偽は「2 つから 1 つを選ぶ」関数。チャーチ数は ' + LAM_MAX_NUM + ' まで。\nY は自分自身を呼ぶ（再帰）ための式。チューリング機械（シリーズ 66 の 10）と同じだけのことが計算できる', rx, 178 + 15 * 21 + 6, width - rx - 20, 100);
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === UP_ARROW) { loadPreset(pIdx - 1); return false; }
  if (key === DOWN_ARROW) { loadPreset(pIdx + 1); return false; }
  if (hist.length && key === RIGHT_ARROW) { stepForward(); return false; }
  if (hist.length && key === LEFT_ARROW) { at = Math.max(0, at - 1); advanceInfo(); return false; }
  if (hist.length && key === 'Enter') { autoRun = !autoRun; return false; }
  if (key === 'Tab') { order = order === 'normal' ? 'applicative' : 'normal'; rebuild(); return false; }
  if (key === 'Backspace') src = src.slice(0, -1);
  else if (key === 'Escape' || key === 'Delete') src = '';
  else if (key === 'λ') src += '\\';
  else src = typeInto(src, key, LAM_KEYS, 120);
  rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  const run = (s, ord, n) => lamNormalize(lamParse(s).m, n || MAX_STEPS, ord || 'normal');
  const isNum = (s, v) => { let o = run(s); return o.status === 'normal' && churchToInt(o.m) === v; };
  check('PLUS 2 3 は 5 に、TIMES 2 3 は 6 に正規化される', isNum('PLUS 2 3', 5) && isNum('TIMES 2 3', 6));
  check('PRED 3 = 2、POW 2 3 = 8', isNum('PRED 3', 2) && isNum('POW 2 3', 8));
  let okS = true, okP = true;
  for (let n = 0; n <= 10; n++) if (!isNum('SUCC ' + n, n + 1)) okS = false;
  for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) if (!isNum('PLUS ' + a + ' ' + b, a + b) || !isNum('TIMES ' + a + ' ' + b, a * b)) okP = false;
  check('SUCC n = n + 1（n = 0〜10）、PLUS と TIMES は a, b = 0〜4 の全部 25 組で正しい', okS && okP);
  const same = (s, t) => lamAlphaEq(run(s).m, lamParse(t).m);
  check('IF TRUE a b = a、NOT FALSE = TRUE、AND TRUE FALSE = FALSE、ISZERO 0 = TRUE', same('IF TRUE a b', 'a') && same('NOT FALSE', 'TRUE') && same('AND TRUE FALSE', 'FALSE') && same('ISZERO 0', 'TRUE'));
  let om = run('OMEGA', 'normal', 100);
  check('Ω = (λx.x x)(λx.x x) は 100 歩の上限に当たる（1 歩で自分に戻る）', om.status === 'steps' && lamAlphaEq(om.m, lamParse('OMEGA').m));
  let ka = run('K a OMEGA', 'normal'), kb = run('K a OMEGA', 'applicative', 100);
  check('K a Ω：正規順序は 2 歩で a、作用的順序は上限に当たる', ka.status === 'normal' && ka.steps === 2 && ka.m.t === 'v' && ka.m.n === 'a' && kb.status === 'steps');
  let cap = run('(\\x.\\y.x) y');
  check('変数の捕獲をさける：(λx.λy.x) y = λz.y（λy.y ではない）', lamAlphaEq(cap.m, lamParse('\\z.y').m) && !lamAlphaEq(cap.m, lamParse('\\y.y').m));
  seedRng(12); let rt = 0;
  const rl = (d) => { let r = rnd(); if (d <= 0 || r < 0.3) return lamV(rndPick(['x', 'y', 'z'])); if (r < 0.6) return lamL(rndPick(['x', 'y']), rl(d - 1)); return lamA(rl(d - 1), rl(d - 1)); };
  for (let k = 0; k < 200; k++) { let m = rl(5), o = lamParse(lamStr(m)); if (o.m && lamDB(o.m) === lamDB(m)) rt++; }
  check('でたらめな λ 式 200 個：文字列にして読み直すと同じ式', rt === 200);
  let bad = ['', '\\', '\\x', '(x', 'x)', '.x', 'FOO', '99', '123456ztr casnfg', 'λ.x', 'x ..y'], allErr = true;
  for (let b of bad) { try { if (!lamParse(b).error) allErr = false; } catch (e) { allErr = false; } }
  check('おかしな入力 ' + bad.length + ' 個（知らない名前、大きすぎる数を含む）は例外を出さずに説明を返す', allErr);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. PLUS 2 3 を → で 1 歩ずつ。PLUS の λm.λn.λf.λx に 2 と 3 が入っていく様子を追おう
// 2. TIMES 3 3 は何歩？ POW 2 3 は？ 数が大きくなると歩数はどう増える？
// 3. K a OMEGA で Tab（作用的順序）にすると止まらない。「使わない引数を先に計算してしまう」から
// 4. (λx.λy.x) y で、もし名前を変えずに置きかえると λy.y（恒等関数）になってしまう。意味がどう変わる？
// 5. LAM_DEFS に足そう：OR、XOR、ISZERO を使った「0 なら 1、そうでなければ 2」など

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
