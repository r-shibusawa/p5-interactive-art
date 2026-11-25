// ============================================
// 15 カメラで論理 📷 ─ 画面を 4 つに分け、それぞれの「動きがある」（または「明るい」）を変数 p, q, r, s にする
// 左上 = p、右上 = q、左下 = r、右下 = s。入力した論理式の値がリアルタイムで変わり、真なら枠が光る。
// 手で 4 つの領域をおおったり振ったりして、真理値表の 16 行を全部ためすゲーム。カメラが使えないときは領域をクリックで切りかえ
// Tab 式を編集（編集中は文字キーが全部入力、Enter か Tab で終わる）/ ↑↓ お手本の式 / ← → しきい値 / M 動き ⇔ 明るさ
// C カメラ ⇔ マウス / R ためした行を消す / S 画面を保存
// ============================================

const PRESETS = ['(p ∧ q) → (r ∨ s)', 'p ∧ q', '¬(p ↔ q)', 'p ∨ q ∨ r ∨ s', '¬(p ∧ q ∧ r ∧ s)', '(p ∧ s) ∨ (q ∧ r)'];   // ★ お手本の式
const CAM_W = 64, CAM_H = 48;
let thr = 18;                           // ★ しきい値（動き：前のフレームとの差の平均、明るさ：0〜255 の平均を 8 で割った値）
let src = PRESETS[0], fml = null, pIdx = 0, editing = false, editSrc = '', editErr = '', cap = null, useCam = true, senseMode = 'motion';
let prevGray = null, levels = [0, 0, 0, 0], regionOn = [false, false, false, false], visited = new Set(), vbox = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  fml = parseFormula(src).f;
  selfTest();
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(CAM_W, CAM_H); cap.hide(); } catch (e) { cap = null; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
function camLive() { return useCam && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0; }
// ★ 4 つの領域の量：動き = 前のフレームとの明るさの差の平均、明るさ = 明るさの平均 / 8
function regionLevels(gray, prev, w, h, mode) {
  let sum = [0, 0, 0, 0], cnt = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let i = y * w + x, k = (y < h / 2 ? 0 : 2) + (x < w / 2 ? 0 : 1);
    sum[k] += mode === 'motion' ? (prev ? Math.abs(gray[i] - prev[i]) : 0) : gray[i] / 8; cnt[k]++;
  }
  return sum.map((s, k) => s / Math.max(1, cnt[k]));
}
function hysteresis(on, v, t) { return on ? v > t * 0.7 : v > t; }   // ちらつかないように：消えるのは 0.7 倍を下回ったとき
function envNow() { return { p: regionOn[0], q: regionOn[1], r: regionOn[2], s: regionOn[3] }; }
function rowIndex(st) { return (st[0] ? 8 : 0) + (st[1] ? 4 : 0) + (st[2] ? 2 : 0) + (st[3] ? 1 : 0); }   // 真理値表の行（p が上の桁）
function setFormula(s) { let o = parseFormula(s); if (o.error) return o.error; let extra = fmlVars(o.f).filter((v) => 'pqrs'.indexOf(v) < 0); if (extra.length) return '変数は p q r s だけ'; src = fmlStr(o.f); fml = o.f; visited = new Set(); return ''; }

function draw() {
  background(...BG);
  hudTitle('カメラで論理：' + (camLive() ? (senseMode === 'motion' ? '4 つの領域で手を動かそう' : '4 つの領域を明るく / 暗くしよう') : '領域をクリックで切りかえ（カメラなし）'),
    'Tab 式を編集　↑↓ お手本　← → しきい値 ' + thr + '　M 動き ⇔ 明るさ（いま：' + (senseMode === 'motion' ? '動き' : '明るさ') + '）　C カメラ ⇔ マウス　R やり直し　S 保存');
  let vw = Math.min(width * 0.5, (height - 230) * 4 / 3), vh = vw * 0.75, vx = 30, vy = 150;
  vbox = { x: vx, y: vy, w: vw, h: vh };
  if (camLive()) {
    cap.loadPixels();
    if (cap.pixels && cap.pixels.length >= CAM_W * CAM_H * 4) {
      let g = new Float32Array(CAM_W * CAM_H);
      for (let i = 0; i < g.length; i++) g[i] = (cap.pixels[4 * i] + cap.pixels[4 * i + 1] + cap.pixels[4 * i + 2]) / 3;
      let lv = regionLevels(g, prevGray, CAM_W, CAM_H, senseMode), same = senseMode === 'motion' && prevGray && lv.every((v) => v === 0);
      if (!same) levels = levels.map((o, k) => o * 0.5 + lv[k] * 0.5);   // カメラの新しいコマが来たときだけ、なめらかに更新
      prevGray = g;
      regionOn = regionOn.map((on, k) => hysteresis(on, levels[k], thr));
    }
    image(cap, vx, vy, vw, vh);
  } else { noStroke(); fill(...PANEL); rect(vx, vy, vw, vh, 8); }
  visited.add(rowIndex(regionOn));
  // ---- 4 つの領域
  let val = evalFml(fml, envNow());
  ['p', 'q', 'r', 's'].forEach((v, k) => {
    let x = vx + (k % 2) * vw / 2, y = vy + Math.floor(k / 2) * vh / 2;
    stroke(...(regionOn[k] ? YEL : LINEC)); strokeWeight(regionOn[k] ? 5 : 1.5); noFill(); rect(x + 4, y + 4, vw / 2 - 8, vh / 2 - 8, 8);
    noStroke(); fill(...(regionOn[k] ? YEL : INK)); textSize(34); textAlign(LEFT, TOP); text(v + ' = ' + (regionOn[k] ? 1 : 0), x + 16, y + 12);
    fill(...DIMC); textSize(13); if (camLive()) text('量 ' + fmtN(levels[k], 1), x + 18, y + 54);
  });
  stroke(...(val ? GRN : PINK)); strokeWeight(val ? 8 : 3); noFill(); rect(vx - 6, vy - 6, vw + 12, vh + 12, 12);
  // ---- 式とその値
  noStroke(); textAlign(LEFT, BASELINE);
  if (editing) drawInputLine(30, 108, '式：', editSrc, editErr);
  else { fill(...INK); textSize(22); text('式：' + src + '　＝　', 30, 112); fill(...(val ? GRN : PINK)); text(val ? '1（真）' : '0（偽）', 40 + textWidth('式：' + src + '　＝　'), 112); }
  // ---- 右：真理値表とためした行
  let tx = vx + vw + 50, ty = 150, rh = Math.min(30, (height - ty - 120) / 17), cur = rowIndex(regionOn), nTrue = 0;
  fill(...SKY); textSize(14); textAlign(CENTER, CENTER);
  ['p', 'q', 'r', 's', '値', 'ためした'].forEach((h, j) => text(h, tx + j * 44 + (j > 4 ? 20 : 0), ty));
  for (let k = 0; k < 16; k++) {
    let env = { p: !!(k & 8), q: !!(k & 4), r: !!(k & 2), s: !!(k & 1) }, v = evalFml(fml, env), y = ty + (k + 1) * rh;
    if (v) nTrue++;
    if (k === cur) { fill(...LINEC); rect(tx - 20, y - rh / 2, 300, rh - 2, 4); }
    ['p', 'q', 'r', 's'].forEach((u, j) => { fill(...(env[u] ? INK : DIMC)); textSize(Math.min(15, rh * 0.6)); text(env[u] ? 1 : 0, tx + j * 44, y); });
    fill(...(v ? GRN : PINK)); text(v ? 1 : 0, tx + 4 * 44, y);
    fill(...(visited.has(k) ? YEL : LINEC)); text(visited.has(k) ? '✓' : '・', tx + 5 * 44 + 20, y);
  }
  fill(...(visited.size === 16 ? GRN : INK)); textSize(17); textAlign(LEFT, BASELINE);
  text(visited.size === 16 ? '全部の行をためした！ 真の行は ' + nTrue + ' 個' : 'ためした行 ' + visited.size + ' / 16', tx - 20, ty + 18 * rh + 10);
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() {
  if (!vbox || camLive() || editing) return;
  let { x, y, w, h } = vbox;
  if (mouseX < x || mouseX > x + w || mouseY < y || mouseY > y + h) return;
  let k = (mouseY < y + h / 2 ? 0 : 2) + (mouseX < x + w / 2 ? 0 : 1);
  regionOn[k] = !regionOn[k];
}
function keyPressed() {
  if (editing) {                        // 編集モード：文字キーは全部入力
    if (key === 'Enter' || key === 'Tab' || key === 'Escape') { if (key !== 'Escape') editErr = setFormula(editSrc); if (!editErr || key !== 'Enter') { editing = false; editErr = ''; } return false; }
    if (key === 'Backspace') editSrc = editSrc.slice(0, -1);
    else editSrc = typeInto(editSrc, key, FML_KEYS, 60);
    editErr = parseFormula(editSrc).error || '';
    return false;
  }
  if (key === 'Tab') { editing = true; editSrc = src; editErr = ''; return false; }
  if (key === UP_ARROW) { pIdx = (pIdx + PRESETS.length - 1) % PRESETS.length; setFormula(PRESETS[pIdx]); }
  if (key === DOWN_ARROW) { pIdx = (pIdx + 1) % PRESETS.length; setFormula(PRESETS[pIdx]); }
  if (key === LEFT_ARROW) thr = Math.max(2, thr - 2);
  if (key === RIGHT_ARROW) thr = Math.min(60, thr + 2);
  if (key === 'm' || key === 'M') { senseMode = senseMode === 'motion' ? 'bright' : 'motion'; prevGray = null; }
  if (key === 'c' || key === 'C') { useCam = !useCam; prevGray = null; }
  if (key === 'r' || key === 'R') visited = new Set();
  if (key === 's' || key === 'S') saveCanvas('logic_camera', 'png');
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('お手本の式 ' + PRESETS.length + ' 個が読めて、変数は p q r s だけ', PRESETS.every((s) => { let o = parseFormula(s); return o.f && fmlVars(o.f).every((v) => 'pqrs'.indexOf(v) >= 0); }));
  let w = 8, h = 6, dark = new Float32Array(w * h), bright = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) bright[y * w + x] = x >= 4 && y < 3 ? 240 : 20;
  let lv = regionLevels(bright, null, w, h, 'bright');
  check('明るさ：右上だけ明るい画像 → q だけが 1（しきい値 18）', lv.map((v) => v > 18).join() === 'false,true,false,false');
  let moved = Float32Array.from(dark); for (let y = 3; y < 6; y++) for (let x = 0; x < 4; x++) moved[y * w + x] = 120;
  let lm = regionLevels(moved, dark, w, h, 'motion');
  check('動き：左下だけ変わった 2 枚 → r だけが 1、前のフレームがなければ全部 0', lm.map((v) => v > 18).join() === 'false,false,true,false' && regionLevels(moved, null, w, h, 'motion').every((v) => v === 0));
  let seq = [0, 20, 15, 13, 11, 25, 5], out = [], on = false; for (let v of seq) { on = hysteresis(on, v, 18); out.push(on ? 1 : 0); }
  check('ちらつき防止：18 をこえたら 1、12.6 を下回るまで 1 のまま（0,20,15,13,11,25,5 → 0,1,1,1,0,1,0）', out.join('') === '0111010');
  let f = parseFormula(PRESETS[0]).f, rowsFalse = [];
  for (let k = 0; k < 16; k++) { let st = [!!(k & 8), !!(k & 4), !!(k & 2), !!(k & 1)]; if (rowIndex(st) !== k) rowsFalse.push('idx'); if (!evalFml(f, { p: st[0], q: st[1], r: st[2], s: st[3] })) rowsFalse.push(k); }
  check('(p ∧ q) → (r ∨ s) が偽になるのは 16 行中 1 行だけ（p = q = 1, r = s = 0 の 12 行目）、行の番号の付け方も一致', rowsFalse.join() === '12');
  let keep = src, e = setFormula('p & x');
  check('変数 x を含む式はまちがいとして説明し、前の式のまま', !!e && src === keep);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. お手本 1 (p ∧ q) → (r ∨ s) を偽にするには、どの領域で手を動かせばいい？ 真理値表の 1 行だけ
// 2. 16 行全部をためそう（両手と頭を使う！）。カメラがないときはクリックで
// 3. M で「明るさ」にして、手で領域をおおう（暗くする）と 0 になる式を作ろう
// 4. ¬(p ↔ q)（どちらか一方だけ）は排他的論理和 XOR。左上と右上で手を動かしてためそう
// 5. 「4 つのうち 3 つ以上」で真になる式（多数決）を作ろう。00 の真理値表でも確かめよう

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
