// ============================================
// 14 真理値表のシーケンサー 🔊 ─ 16 拍のカウンタ（0〜15 の 2 進数）の各桁を変数にする：p = 1 の位、q = 2 の位、r = 4 の位、s = 8 の位
// 16 拍 = 4 変数の真理値表の 16 行。段ごとの論理式が真（1）の拍で音が鳴る。式を変えるとリズムが変わる。
// 恒真の段はいつも鳴り、矛盾の段は一度も鳴らない。p が一番速く変わるので、p だけの式は 1 拍おきのリズム
// まずクリックで音を ON（音量は小さめから）/ スペース 再生・停止 / ↑↓ 段を選ぶ / ← → テンポ / M 選んだ段を消音 / 1〜3 お手本
// Tab 選んだ段の式を編集（編集中は文字キーが全部入力、~ & | -> <-> も可。Enter か Tab で終わる。まちがった式なら前の式のまま）
// ============================================

const BANKS = [                         // ★ お手本：[段の名前, 式, 音]
  [['キック', '¬p ∧ ¬q', 'kick'], ['スネア', 'q ∧ ¬p', 'snare'], ['ハイハット', 'p ∨ ¬p', 'hat'], ['ベル', 'p ∧ (r ↔ s)', 'bell'], ['ベース', '¬p ∧ ¬r', 'bass'], ['矛盾', 'p ∧ ¬p', 'bell']],
  [['キック', '¬p ∧ ¬q ∧ ¬r ∨ (p ∧ q ∧ r)', 'kick'], ['スネア', 'q ∧ r ∧ ¬p', 'snare'], ['ハイハット', 'p ∨ q', 'hat'], ['ベル', 'p → (q ↔ s)', 'bell'], ['ベース', 's ∧ ¬p', 'bass'], ['恒真', '(p → q) ∨ (q → p)', 'hat']],
  [['キック', '¬(p ∨ q)', 'kick'], ['スネア', '¬(p ∨ ¬q)', 'snare'], ['ハイハット', 'p', 'hat'], ['ベル', '(p ∧ q) ∨ (r ∧ s)', 'bell'], ['ベース', '¬q ∧ ¬r ∧ ¬p', 'bass'], ['ド・モルガン', '¬(p ∧ q) ↔ ¬p ∨ ¬q', 'hat']],
];
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76];   // ★ ベルの音階（ペンタトニック）。拍の q r s で選ぶ
let bpm = 112;                          // ★ テンポ（1 拍 = 16 分音符）
let rows = [], sel = 0, playing = true, stepNow = 0, nextT = 0, editing = false, editSrc = '', editErr = '', lastMs = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  loadBank(0);
  selfTest();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function loadBank(k) { rows = BANKS[k].map(([nm, s, snd]) => ({ nm, src: s, f: parseFormula(s).f, snd, mute: false })); sel = 0; editing = false; }
function bits(k) { return { p: !!(k & 1), q: !!(k & 2), r: !!(k & 4), s: !!(k & 8) }; }   // ★ 拍 k → 変数
function pattern(f) { let out = []; for (let k = 0; k < 16; k++) out.push(evalFml(f, bits(k))); return out; }
function setRowFormula(r, s) {         // 式を読み、正しければ入れかえる。返り値：まちがいの説明（'' = OK）
  let o = parseFormula(s);
  if (o.error) return o.error;
  let extra = fmlVars(o.f).filter((v) => 'pqrs'.indexOf(v) < 0);
  if (extra.length) return '変数は p q r s だけ（' + extra.join(' ') + ' は使えない）';
  r.src = fmlStr(o.f); r.f = o.f; return '';
}
function playStep(k, when) {
  rows.forEach((r, i) => {
    if (r.mute || !evalFml(r.f, bits(k))) return;
    if (!audioCtx) return;
    if (r.snd === 'kick') playKick(when);
    else if (r.snd === 'snare') playNoise(when, 0.14, 1500, 0.45);
    else if (r.snd === 'hat') playNoise(when, 0.04, 7000, 0.22);
    else if (r.snd === 'bass') playNote(midiHz(36 + ((k >> 2) & 3) * 2), when, 0.22, 'sawtooth', 0.35);
    else playNote(midiHz(SCALE[(k >> 1) % SCALE.length]), when, 0.25, 'triangle', 0.4);
  });
}
function geom() {                       // 格子の位置と大きさ（draw とクリックで共通）
  let x0 = 220, y0 = 150, gy = y0 + 4 * 22 + 16;
  return { x0, y0, gy, cw: Math.min(52, (width - x0 - 160) / 16), rh: clampv((height - gy - 140) / rows.length, 30, 64) };
}
function stepSec() { return 60 / bpm / 4; }

function draw() {
  background(...BG);
  hudTitle('真理値表のシーケンサー：16 拍 = 4 変数の真理値表の 16 行', (audioCtx ? '' : 'まずクリックで音を ON　') + 'スペース 再生・停止　↑↓ 段　← → テンポ ' + bpm + '　M 消音　1〜3 お手本　Tab 式を編集');
  // ---- 時間を進める（音があれば Web Audio の時計で先読み、なければ millis）
  if (playing) {
    if (audioCtx) { if (nextT < audioCtx.currentTime) nextT = audioCtx.currentTime + 0.05; while (nextT < audioCtx.currentTime + 0.1) { playStep(stepNow, nextT); nextT += stepSec(); stepNow = (stepNow + 1) % 16; } }
    else if (millis() - lastMs > stepSec() * 1000) { lastMs = millis(); playStep(stepNow, 0); stepNow = (stepNow + 1) % 16; }
  }
  let cur = (stepNow + 15) % 16;
  // ---- 格子
  let { x0, cw, y0, rh, gy } = geom();
  noStroke(); textAlign(CENTER, CENTER);
  ['p', 'q', 'r', 's'].forEach((v, j) => {
    fill(...SKY); textSize(14); text(v, x0 - 20, y0 + j * 22);
    for (let k = 0; k < 16; k++) { let b = bits(k)[v]; fill(...(k === cur ? YEL : b ? INK : LINEC)); textSize(13); text(b ? 1 : 0, x0 + k * cw + cw / 2, y0 + j * 22); }
  });
  for (let k = 0; k < 16; k++) { fill(...DIMC); textSize(11); text(k, x0 + k * cw + cw / 2, y0 - 24); }
  rows.forEach((r, i) => {
    let y = gy + i * rh, pat = pattern(r.f), n = pat.filter((b) => b).length, kind = n === 16 ? 'taut' : n === 0 ? 'contra' : 'sat';
    if (i === sel) { fill(...LINEC); rect(20, y + 2, width - 40, rh - 4, 6); }
    fill(...(r.mute ? DIMC : INK)); textSize(15); textAlign(LEFT, CENTER); text(r.nm + (r.mute ? '（消音）' : ''), 30, y + rh * 0.32);
    let fs = editing && i === sel ? '編集中' : r.src; textSize(12); if (textWidth(fs) > x0 - 40) fs = fs.slice(0, 22) + '…';
    fill(...(kind === 'taut' ? GRN : kind === 'contra' ? PINK : YEL)); text(fs, 30, y + rh * 0.68);
    for (let k = 0; k < 16; k++) {
      let on = pat[k], hit = on && k === cur && playing;
      fill(...(hit ? YEL : on ? (r.mute ? DIMC : [120, 170, 120]) : PANEL)); rect(x0 + k * cw + 2, y + 6, cw - 4, rh - 12, 5);
    }
    textAlign(LEFT, CENTER); fill(...DIMC); textSize(12); text(n + ' / 16' + (kind === 'taut' ? ' 恒真' : kind === 'contra' ? ' 矛盾' : ''), x0 + 16 * cw + 10, y + rh / 2);
  });
  stroke(...YEL); strokeWeight(2); noFill(); rect(x0 + cur * cw, y0 - 36, cw, gy + rows.length * rh - y0 + 40, 4); noStroke();
  // ---- 編集欄
  let ey = gy + rows.length * rh + 30;
  if (editing) drawInputLine(30, ey, rows[sel].nm + ' の式：', editSrc, editErr);
  else { fill(...DIMC); textSize(14); textAlign(LEFT, BASELINE); text('選んだ段：' + rows[sel].nm + '「' + rows[sel].src + '」　Tab で編集。拍 k の p q r s は k の 2 進数（p が 1 の位）', 30, ey); }
  fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE);
  text('鳴る拍の数 = （真になる割り当ての数）×（式に出てこない変数の分だけ 2 倍）。¬p ∧ ¬q は 4 拍に 1 回、p は 2 拍に 1 回', 30, ey + 50);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  startAudio();
  let { rh, gy } = geom(), i = Math.floor((mouseY - gy) / rh);
  if (i >= 0 && i < rows.length && !editing) sel = i;
}
function keyPressed() {
  startAudio();
  if (editing) {                        // 編集モード：文字キーは全部入力
    if (key === 'Enter' || key === 'Tab' || key === 'Escape') { editErr = setRowFormula(rows[sel], editSrc); if (!editErr || key !== 'Enter') editing = false; if (key === 'Escape') editErr = ''; return false; }
    if (key === 'Backspace') editSrc = editSrc.slice(0, -1);
    else editSrc = typeInto(editSrc, key, FML_KEYS, 60);
    let o = parseFormula(editSrc); editErr = o.error || '';
    return false;
  }
  if (key === 'Tab') { editing = true; editSrc = rows[sel].src; editErr = ''; return false; }
  if (key === ' ') playing = !playing;
  if (key === UP_ARROW) sel = (sel + rows.length - 1) % rows.length;
  if (key === DOWN_ARROW) sel = (sel + 1) % rows.length;
  if (key === LEFT_ARROW) bpm = Math.max(60, bpm - 8);
  if (key === RIGHT_ARROW) bpm = Math.min(200, bpm + 8);
  if (key === 'm' || key === 'M') rows[sel].mute = !rows[sel].mute;
  if (key >= '1' && key <= '3') loadBank(Number(key) - 1);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('お手本 3 組の式 ' + BANKS.flat().length + ' 個が全部読めて、変数は p q r s だけ', BANKS.flat().every(([nm, s]) => setRowFormula({}, s) === ''));
  const pat = (s) => pattern(parseFormula(s).f), on = (s) => pat(s).map((b, k) => (b ? k : -1)).filter((k) => k >= 0).join(',');
  check('恒真の段（p ∨ ¬p）は 16 拍全部、矛盾の段（p ∧ ¬p）は 0 拍', pat('p | ~p').every((b) => b) && pat('p & ~p').every((b) => !b));
  check('キック ¬p ∧ ¬q は 0, 4, 8, 12 拍、p だけなら 1 拍おき（奇数の拍）', on('~p & ~q') === '0,4,8,12' && on('p') === '1,3,5,7,9,11,13,15');
  let okCount = BANKS.flat().every(([nm, s]) => { let f = parseFormula(s).f, c = classifyFml(f); return pattern(f).filter((b) => b).length === c.nTrue * (1 << (4 - fmlVars(f).length)); });
  check('どの段も「鳴る拍の数 = 真になる割り当ての数 × 2^(4 − 変数の数)」', okCount);
  let b11 = bits(11);
  check('拍 11 = 2 進数 1011 → p = 1, q = 1, r = 0, s = 1', b11.p && b11.q && !b11.r && b11.s);
  let r = { src: 'p', f: parseFormula('p').f }, e1 = setRowFormula(r, 'p &'), e2 = setRowFormula(r, 'p & x');
  check('まちがった式（p & や、変数 x）は説明を出して、前の式 p のまま', e1 && e2 && r.src === 'p' && setRowFormula(r, 'q') === '' && r.src === 'q');
  check('音量：全体 MASTER ≤ 0.2', MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. キックを ¬p ∧ ¬q ∧ ¬r にすると何拍に 1 回？ ¬p だけなら？（変数が 1 つ増えるごとに半分）
// 2. スネアの式を「2 拍目と 4 拍目」（拍 4 と 12）に鳴るように作ろう。ヒント：¬p ∧ ¬q ∧ r
// 3. 恒真の段と矛盾の段を作ろう。真理値表（00）で「恒真」と出た式は、ここではいつも鳴る
// 4. 同値な式（例：ド・モルガンの両辺）を 2 つの段に入れると、まったく同じリズムになる
// 5. BANKS に自分のリズムを足そう。SCALE を変えるとベルの音階が変わる

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
// ---- 音の道具（Web Audio）。全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null, noiseBuf = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
    let d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  audioCtx.resume();
}
function playNote(freq, when, dur, wave, vol) {   // 1 音（やわらかく立ち上がって消える）
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = wave || 'triangle'; o.frequency.setValueAtTime(freq, when);
  gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(vol || 0.6, when + 0.015);
  gn.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + dur + 0.05);
}
function playKick(when) {               // バスドラム：周波数がすっと下がる正弦波
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.frequency.setValueAtTime(150, when); o.frequency.exponentialRampToValueAtTime(45, when + 0.15);
  gn.gain.setValueAtTime(0.9, when); gn.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + 0.3);
}
function playNoise(when, dur, hp, vol) { // スネア・ハイハット：雑音をフィルターで
  if (!audioCtx || !noiseBuf) return;
  let src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), gn = audioCtx.createGain();
  src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  gn.gain.setValueAtTime(vol || 0.5, when); gn.gain.exponentialRampToValueAtTime(0.001, when + dur);
  src.connect(f); f.connect(gn); gn.connect(masterOut); src.start(when); src.stop(when + dur + 0.02);
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? GRN : PINK)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
