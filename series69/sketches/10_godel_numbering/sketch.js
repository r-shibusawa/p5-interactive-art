// ============================================
// 10 ゲーデル数 ─ 記号に番号をつけ、式（記号の並び）を素数のべき 2^a × 3^b × 5^c × … の 1 つの数にする
// 素因数分解はただ 1 通りなので、数から式に必ず戻せる。証明（式の並び）も 2^g1 × 3^g2 × … で 1 つの数になる。
// すると「式 g の最初の記号は ∀」のような「式についての話」が「g は 2^10 で割り切れて 2^11 では割り切れない」という
// 「数についての話」になる。これが不完全性定理（11）の出発点
// 文字キー = 入力（0 s = + * ( ) ~ > と A = ∀、E = ∃、x y z）/ Tab 式 ⇔ 数（数字を入れて式に戻す）/ ↑↓ お手本 / Backspace / Esc
// ============================================

const SYMBOLS = ['0', 's', '=', '+', '×', '(', ')', '¬', '→', '∀', '∃', 'x', 'y', 'z'];   // ★ 記号の番号は 1, 2, 3, …（この並びの順）
const ASCII = { '*': '×', '~': '¬', '>': '→', A: '∀', E: '∃' };
const PRESETS = ['0 = 0', 's0 + s0 = ss0', '∀x (x + 0 = x)', '∀x ¬(sx = 0)', '∃y (y = ss0)', '∀x ∀y (x + sy = s(x + y))'];
const MAX_DIGITS = 300, MAX_LEN = 24;   // ★ 数の桁数・式の長さの上限
let chMode = 'fml', fsrc = '', nsrc = '', pIdx = 0, enc = null, dec = null, primes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  primes = firstPrimes(40);
  selfTest();
  loadPreset(0);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function firstPrimes(n) { let out = []; for (let k = 2; out.length < n; k++) if (out.every((p) => k % p !== 0)) out.push(k); return out; }
function toSyms(s) { let out = []; for (let ch of s) { if (ch === ' ') continue; ch = ASCII[ch] || ch; if (SYMBOLS.indexOf(ch) < 0) return { error: '使えない記号「' + ch + '」' }; out.push(ch); } return out.length ? (out.length > MAX_LEN ? { error: '長すぎる（' + MAX_LEN + ' 記号まで）' } : { syms: out }) : { error: '式が空' }; }
// ★ 符号化：i 番目の記号の番号 c_i を、i 番目の素数の指数にする
function godel(codes) { let g = 1n; codes.forEach((c, i) => (g *= BigInt(primes[i]) ** BigInt(c))); return g; }
function encodeSyms(syms) { let codes = syms.map((ch) => SYMBOLS.indexOf(ch) + 1); return { syms, codes, g: godel(codes) }; }
// ★ 復号：2, 3, 5, … で割れるだけ割って指数を数える。素数が飛んだり、残りがあったら「ゲーデル数ではない」
function exponents(g, maxExp) {         // 返り値 { exps } / { error }
  if (g < 2n) return { error: '2 以上の数を入れる' };
  let exps = [];
  for (let i = 0; i < primes.length && g > 1n; i++) {
    let p = BigInt(primes[i]), e = 0;
    while (g % p === 0n) { g /= p; e++; if (e > maxExp) return { error: primes[i] + ' の指数が ' + maxExp + ' をこえる' }; }
    if (e === 0) return { error: primes[i] + ' で割り切れない（素数が飛んでいる）→ ゲーデル数ではない' };
    exps.push(e);
  }
  if (g > 1n) return { error: 'ほかの素因数が残る → ゲーデル数ではない' };
  return { exps };
}
function decodeNum(g) { let o = exponents(g, SYMBOLS.length); if (o.error) return o; for (let e of o.exps) if (e > SYMBOLS.length) return { error: '番号 ' + e + ' の記号はない' }; return { syms: o.exps.map((e) => SYMBOLS[e - 1]), codes: o.exps }; }
function log10Big(g) { let t = g.toString(); return t.length - 1 + Math.log10(Number(t.slice(0, 15)) / Math.pow(10, Math.min(15, t.length) - 1)); }   // BigInt の常用対数（だいたい）
function bigShort(g) { let s = g.toString(); return s.length > 90 ? s.slice(0, 40) + ' … ' + s.slice(-40) + '（' + s.length + ' 桁）' : s + '（' + s.length + ' 桁）'; }
function loadPreset(i) { pIdx = (i + PRESETS.length) % PRESETS.length; fsrc = PRESETS[pIdx]; chMode = 'fml'; rebuild(); }
function rebuild() {
  if (chMode === 'fml') { let o = toSyms(fsrc); if (o.error) enc = Object.assign(enc || {}, { error: o.error }); else { enc = encodeSyms(o.syms); nsrc = enc.g.toString(); } dec = null; }
  else {
    if (!nsrc.length) dec = { error: '数を入れる' };
    else if (nsrc.length > MAX_DIGITS) dec = { error: MAX_DIGITS + ' 桁まで' };
    else { dec = decodeNum(BigInt(nsrc)); if (!dec.error) { enc = encodeSyms(dec.syms); fsrc = dec.syms.join(' '); } }
  }
}
// ★ 「式についての性質」を「数についての性質」として計算する（文字列は見ない）
function divides(g, p, e) { return g % BigInt(p) ** BigInt(e) === 0n; }
function arithFirstIsForall(g) { let c = SYMBOLS.indexOf('∀') + 1; return divides(g, 2, c) && !divides(g, 2, c + 1); }
function arithLength(g) { let n = 0; while (n < primes.length && divides(g, primes[n], 1)) n++; return n; }
function arithHasNot(g) { let c = SYMBOLS.indexOf('¬') + 1, n = arithLength(g); for (let i = 0; i < n; i++) if (divides(g, primes[i], c) && !divides(g, primes[i], c + 1)) return true; return false; }

function draw() {
  background(...BG);
  hudTitle('ゲーデル数：式 → 素数のべきの積 → 1 つの数', '文字キーで入力（* = ×、~ = ¬、> = →、A = ∀、E = ∃）　Tab 式 ⇔ 数　↑↓ お手本　Backspace / Esc 消す');
  drawInputLine(30, 104, '式：', chMode === 'fml' ? fsrc : (enc && !enc.error ? enc.syms.join(' ') : fsrc), chMode === 'fml' && enc ? enc.error : '', chMode === 'fml');
  drawInputLine(30, 150, '数：', nsrc.length > 80 ? nsrc.slice(0, 78) + '…' : nsrc, chMode === 'num' && dec ? dec.error : '', chMode === 'num');
  if (!enc || !enc.syms) return;
  // ---- 記号の表
  let n = enc.syms.length, cw = Math.min(58, (width - 60) / n), y0 = 200;
  noStroke(); textAlign(CENTER, CENTER);
  enc.syms.forEach((ch, i) => {
    let x = 30 + i * cw;
    fill(...PANEL); rect(x, y0, cw - 4, 92, 6);
    fill(...YEL); textSize(20); text(ch, x + cw / 2 - 2, y0 + 18);
    fill(...INK); textSize(12); text('番号 ' + enc.codes[i], x + cw / 2 - 2, y0 + 44);
    fill(...SKY); textSize(13); text(primes[i] + '^' + enc.codes[i], x + cw / 2 - 2, y0 + 70);
  });
  noStroke(); textAlign(LEFT, BASELINE); fill(...DIMC); textSize(13);
  text('記号の番号：' + SYMBOLS.map((s, i) => s + '=' + (i + 1)).join('  '), 30, y0 + 116);
  fill(...INK); textSize(16); text('ゲーデル数 = ' + enc.codes.map((c, i) => primes[i] + '^' + c).join(' × '), 30, y0 + 148, width - 60);
  fill(...GRN); textSize(18); text('= ' + bigShort(enc.g), 30, y0 + 180);
  // ---- 数の性質 = 式の性質
  let g = enc.g, y1 = y0 + 226;
  fill(...YEL); textSize(15); text('「式についての話」を「数の割り算」だけで判定する（文字列は見ない）', 30, y1);
  const row = (k, q, v, w) => { fill(...INK); textSize(14); text(q, 40, y1 + 28 + k * 24); fill(...(v === w ? GRN : PINK)); text((v ? 'はい' : 'いいえ') + '（文字列で見ても ' + (w ? 'はい' : 'いいえ') + '）', width * 0.62, y1 + 28 + k * 24); };
  row(0, '最初の記号は ∀？ ⇔ 2^10 で割り切れて 2^11 では割り切れない', arithFirstIsForall(g), enc.syms[0] === '∀');
  row(1, '長さは ' + arithLength(g) + '？ ⇔ ' + primes[Math.max(0, arithLength(g) - 1)] + ' で割り切れて ' + primes[arithLength(g)] + ' では割り切れない', arithLength(g) === n, true);
  row(2, '¬ をふくむ？ ⇔ ある i 番目の素数 p で p^8 が割り切り p^9 は割り切らない', arithHasNot(g), enc.syms.indexOf('¬') >= 0);
  // ---- 証明も 1 つの数
  let y2 = y1 + 120, seq = [g, 270n], lg = seq.map((gi, i) => log10Big(gi) + Math.log10(Math.log10(primes[i]))), top = Math.max(...lg);
  let lgDigits = top + Math.log10(lg.reduce((t, v) => t + Math.pow(10, v - top), 0));   // 桁数 = Σ g_i × log10(p_i) の常用対数
  fill(...YEL); textSize(15); text('証明（式の並び）も 1 つの数：2^(1 つ目の式の数) × 3^(2 つ目の式の数) × …', 30, y2);
  fill(...INK); textSize(14);
  text('例：[いまの式, 0 = 0] → 2^' + (g.toString().length > 12 ? '(' + g.toString().length + ' 桁の数)' : g) + ' × 3^270　＝ ' + (lgDigits < 6 ? 'およそ ' + Math.round(Math.pow(10, lgDigits)) : 'およそ 10^' + lgDigits.toFixed(1)) + ' 桁の数（書き出せないほど大きいが、ちゃんと決まった数）', 30, y2 + 26, width - 60);
  fill(...DIMC); textSize(13);
  text('「p は g の証明の番号である」も数の割り算と掛け算で書ける → 算術は自分自身の証明について語れる（11 の対角線論法へ）', 30, y2 + 76);
  drawSelfTest(width - 180, height - 14);
}
function keyPressed() {
  if (key === 'Tab') { chMode = chMode === 'fml' ? 'num' : 'fml'; rebuild(); return false; }
  if (key === UP_ARROW) { loadPreset(pIdx - 1); return false; }
  if (key === DOWN_ARROW) { loadPreset(pIdx + 1); return false; }
  if (chMode === 'fml') {
    if (key === 'Backspace') fsrc = fsrc.slice(0, -1);
    else if (key === 'Escape' || key === 'Delete') fsrc = '';
    else fsrc = typeInto(fsrc, key, '0s=+*()~>AExyz ', 60);
  } else {
    if (key === 'Backspace') nsrc = nsrc.slice(0, -1);
    else if (key === 'Escape' || key === 'Delete') nsrc = '';
    else nsrc = typeInto(nsrc, key, '0123456789', MAX_DIGITS + 1);
  }
  rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('「0 = 0」のゲーデル数は 2^1 × 3^3 × 5^1 = 270', encodeSyms(toSyms('0 = 0').syms).g === 270n);
  check('はじめの 20 個の素数が正しい（2, 3, 5, …, 71）', primes.slice(0, 20).join() === '2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71');
  seedRng(10); let rt = 0, seen = new Map(), clash = 0, props = 0, N = 300;
  for (let k = 0; k < N; k++) {
    let syms = []; for (let j = rndInt(1, 14); j > 0; j--) syms.push(rndPick(SYMBOLS));
    let e = encodeSyms(syms), d = decodeNum(e.g);
    if (!d.error && d.syms.join('') === syms.join('')) rt++;
    let key2 = syms.join(' '), gs = e.g.toString();
    if (seen.has(gs) && seen.get(gs) !== key2) clash++; seen.set(gs, key2);
    if (arithFirstIsForall(e.g) === (syms[0] === '∀') && arithLength(e.g) === syms.length && arithHasNot(e.g) === (syms.indexOf('¬') >= 0)) props++;
  }
  check('でたらめな記号の列 ' + N + ' 個：数にして戻すと同じ列', rt === N);
  check('ちがう列は必ずちがう数（素因数分解はただ 1 通り）', clash === 0);
  check('割り算だけで判定した「最初は ∀」「長さ」「¬ をふくむ」が、文字列で見た答えと全部一致', props === N);
  let bad = [10n, 1n, 2n ** 20n, 2n * 3n * 7n, 270n * 11n], errs = bad.map((g) => decodeNum(g).error);
  check('ゲーデル数でない数は説明つきで戻せない：10（3 が飛ぶ）、1、2^20（番号 20 はない）、2·3·7、270·11', errs.every((e) => !!e));
  let seqG = 2n ** 270n * 3n ** 3n * 5n ** 5n, ex = exponents(seqG, 1000);
  check('並び [270, 3, 5] を 2^270 × 3^3 × 5^5 にして戻すと [270, 3, 5]（証明の番号のしくみ）', !ex.error && ex.exps.join() === '270,3,5');
  check('入力の上限：' + MAX_LEN + ' 記号をこえる式、使えない記号はまちがいとして説明', !!toSyms('0'.repeat(MAX_LEN + 1)).error && !!toSyms('0 = q').error && !!toSyms('').error);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 「0 = 0」の 270 を Tab で数の欄に入れて、式に戻そう。271 や 540 を入れると？
// 2. 記号が 1 つ増えるごとに数は何倍くらいになる？（次の素数の、記号の番号乗）
// 3. 「長さ」や「¬ をふくむ」のように、割り算だけで判定できる式の性質をもう 1 つ考えよう（例：最後の記号が ) ）
// 4. SYMBOLS の順番を変えると数はどう変わる？ それでも戻せるのはなぜ？
// 5. 11 の「この文は証明できない」は、自分のゲーデル数についての式。数が自分のことを話せるしくみがここにある

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
