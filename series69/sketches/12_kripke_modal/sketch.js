// ============================================
// 12 様相論理とクリプキモデル ─ 「必ず □」「かもしれない ◇」を、可能世界（点）と到達関係（矢印）で考える
// □p が世界 w で真 ⇔ w から行ける全部の世界で p が真。◇p が真 ⇔ 行ける世界のどこかで p が真（行き先がなければ □p はいつも真）。
// 公理 T（□p → p）は「どの世界も自分に行ける（反射的）」フレームなら、p をどう決めても必ず真。4（□p → □□p）は推移的なフレームで必ず真。
// 空いた所をクリック = 世界を足す（最初の 1 回はキーを届かせるだけ）/ 世界から世界へドラッグ = 矢印の切りかえ（同じ世界へ戻ると自分への矢印）
// 世界をクリック = 選ぶ → P / Q でその世界の p / q を切りかえ / Backspace 最後の世界を消す / ↑↓ 式 / 1〜4 お手本のフレーム
// ============================================

const FORMULAS = [                      // ★ [式, 名前]（[] = □、<> = ◇ と書いてもよい）
  ['□p', '必ず p'], ['◇p', 'p かもしれない'], ['□p → p', 'T'], ['□p → □□p', '4'], ['p → □◇p', 'B'], ['□p → ◇p', 'D'], ['◇p → □◇p', '5'],
  ['□(p → q) → (□p → □q)', 'K（どのフレームでも）'], ['◇p ↔ ¬□¬p', '◇ と □ の関係'],
];
const AXIOMS = [                        // ★ 公理と、それが必ず成り立つフレームの性質
  ['T', '□p → p', '反射的', (n, R) => all(n, (x) => R[x][x])],
  ['4', '□p → □□p', '推移的', (n, R) => all(n, (x) => all(n, (y) => all(n, (z) => !(R[x][y] && R[y][z]) || R[x][z])))],
  ['B', 'p → □◇p', '対称的', (n, R) => all(n, (x) => all(n, (y) => !R[x][y] || R[y][x]))],
  ['D', '□p → ◇p', '行き止まりがない', (n, R) => all(n, (x) => any(n, (y) => R[x][y]))],
  ['5', '◇p → □◇p', 'ユークリッド的', (n, R) => all(n, (x) => all(n, (y) => all(n, (z) => !(R[x][y] && R[x][z]) || R[y][z])))],
];
const MAX_W = 6, WR = 26;               // ★ 世界の数の上限、半径
let worlds = [], rel = [], fIdx = 2, selW = 0, gotFocus = false, dragFrom = -1, dragMoved = false, parsed = [], axF = [];
function all(n, f) { for (let i = 0; i < n; i++) if (!f(i)) return false; return true; }
function any(n, f) { for (let i = 0; i < n; i++) if (f(i)) return true; return false; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  parsed = FORMULAS.map((f) => parseFormula(f[0], true).f); axF = AXIOMS.map((a) => parseFormula(a[1], true).f);
  selfTest();
  example(1);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
// ★ 様相の式の真偽：世界 w で、到達関係 R、付値 V（V.p[w] = その世界の p）
function evalModal(f, w, n, R, V) {
  switch (f.op) {
    case 'var': return !!(V[f.name] && V[f.name][w]);
    case 'top': return true;
    case 'bot': return false;
    case 'not': return !evalModal(f.a, w, n, R, V);
    case 'and': return evalModal(f.a, w, n, R, V) && evalModal(f.b, w, n, R, V);
    case 'or': return evalModal(f.a, w, n, R, V) || evalModal(f.b, w, n, R, V);
    case 'imp': return !evalModal(f.a, w, n, R, V) || evalModal(f.b, w, n, R, V);
    case 'iff': return evalModal(f.a, w, n, R, V) === evalModal(f.b, w, n, R, V);
    case 'box': return all(n, (v) => !R[w][v] || evalModal(f.a, v, n, R, V));
    case 'dia': return any(n, (v) => R[w][v] && evalModal(f.a, v, n, R, V));
  }
  return false;
}
function validOnFrame(f, n, R) {        // フレームで妥当：p, q をどう決めても、どの世界でも真
  let vars = fmlVars(f);
  for (let k = 0; k < 1 << (n * vars.length); k++) {
    let V = {}; vars.forEach((v, j) => { V[v] = []; for (let w = 0; w < n; w++) V[v].push(!!((k >> (j * n + w)) & 1)); });
    for (let w = 0; w < n; w++) if (!evalModal(f, w, n, R, V)) return { ok: false, V, w };
  }
  return { ok: true };
}
function matrix() { let n = worlds.length, R = []; for (let i = 0; i < n; i++) { R.push([]); for (let j = 0; j < n; j++) R[i].push(rel.some((e) => e[0] === i && e[1] === j)); } return R; }
function vals() { return { p: worlds.map((w) => w.p), q: worlds.map((w) => w.q) }; }
function example(k) {
  let cx = width * 0.3, cy = height * 0.52, rr = Math.min(width, height) * 0.2;
  const ring = (n) => { worlds = []; for (let i = 0; i < n; i++) worlds.push({ x: cx + rr * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n), y: cy + rr * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n), p: false, q: false }); };
  if (k === 1) { ring(3); rel = [[0, 1], [1, 2], [0, 2]]; worlds[1].p = worlds[2].p = true; }      // 推移的だが反射的でない
  if (k === 2) { ring(3); rel = [[0, 0], [1, 1], [2, 2], [0, 1], [1, 2]]; worlds[0].p = worlds[1].p = true; }   // 反射的だが推移的でない
  if (k === 3) { ring(3); rel = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rel.push([i, j]); worlds[0].p = true; }   // 全部つながる（S5）
  if (k === 4) { ring(4); rel = [[0, 1], [1, 2], [2, 3], [3, 0]]; worlds[0].p = worlds[2].p = true; worlds[1].q = true; }
  selW = 0;
}

function draw() {
  background(...BG);
  hudTitle('様相論理とクリプキモデル：□ = 行ける世界の全部で、◇ = 行ける世界のどこかで', 'クリック 世界を足す / 選ぶ　ドラッグ 矢印　P Q 選んだ世界の p q　↑↓ 式　1〜4 お手本　Backspace 世界を消す');
  let n = worlds.length, R = matrix(), V = vals(), f = parsed[fIdx];
  // ---- 矢印と世界
  for (let [i, j] of rel) arrowW(i, j, LINEC);
  if (dragFrom >= 0 && dragMoved) { stroke(...SKY); strokeWeight(2); line(worlds[dragFrom].x, worlds[dragFrom].y, mouseX, mouseY); }
  worlds.forEach((w, i) => {
    let v = evalModal(f, i, n, R, V);
    stroke(...(i === selW ? YEL : INK)); strokeWeight(i === selW ? 4 : 2); fill(...(v ? [70, 110, 70] : [120, 60, 66])); circle(w.x, w.y, WR * 2);
    noStroke(); fill(...INK); textSize(16); textAlign(CENTER, CENTER); text('w' + i, w.x, w.y - 6);
    textSize(11); text((w.p ? 'p' : '¬p') + ' ' + (w.q ? 'q' : '¬q'), w.x, w.y + 10);
  });
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE);
  text('世界の色：緑 = 「' + FORMULAS[fIdx][0] + '」が真、赤 = 偽　（黄色の枠 = 選んだ世界）', 30, height - 70);
  text('真偽を 0 と 1 だけでなく途中の値にする多値論理・ファジィ論理はシリーズ 50 で', 30, height - 46);
  // ---- 右：式の一覧（全部の世界で真か）
  let rx = width * 0.56;
  FORMULAS.forEach(([s, nm], k) => {
    let g = parsed[k], allT = n > 0 && all(n, (w) => evalModal(g, w, n, R, V)), y = 104 + k * 25;
    if (k === fIdx) { fill(...LINEC); rect(rx - 8, y - 17, width - rx - 14, 23, 4); }
    fill(...(allT ? GRN : DIMC)); textSize(14); text(allT ? '全部で真' : '　', rx, y);
    fill(...INK); text(s, rx + 80, y); fill(...DIMC); text(nm, rx + 300, y);
  });
  // ---- 右下：公理とフレームの性質の対応（p の決め方を全部ためす）
  let y0 = 104 + FORMULAS.length * 25 + 26;
  fill(...YEL); textSize(15); text('このフレーム（矢印だけ）で：p をどう決めても真？ ⇔ フレームの性質', rx, y0);
  AXIOMS.forEach(([nm, s, prop, test], k) => {
    let vf = n ? validOnFrame(axF[k], n, R) : { ok: true }, pr = test(n, R), y = y0 + 28 + k * 24;
    fill(...INK); textSize(14); text(nm + '　' + s, rx, y);
    fill(...(vf.ok ? GRN : PINK)); text(vf.ok ? '必ず真' : '偽になる p がある', rx + 190, y);
    fill(...(pr ? GRN : PINK)); text(prop + (pr ? ' ✓' : ' ✗'), rx + 330, y);
    fill(...(vf.ok === pr ? DIMC : PINK)); text(vf.ok === pr ? '一致' : '不一致!', rx + 470, y);
  });
  fill(...DIMC); textSize(12); text('（世界 ' + n + ' 個なら p の決め方は 2^' + n + ' 通り。全部ためして調べている）', rx, y0 + 28 + AXIOMS.length * 24);
  drawSelfTest(width - 180, height - 14);
}
function arrowW(i, j, col) {
  let a = worlds[i], b = worlds[j];
  stroke(...col); strokeWeight(2); noFill();
  if (i === j) { circle(a.x, a.y - WR - 12, 26); return; }
  let dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, off = rel.some((e) => e[0] === j && e[1] === i) ? 6 : 0;
  let x0 = a.x + ux * WR - uy * off, y0 = a.y + uy * WR + ux * off, x1 = b.x - ux * (WR + 3) - uy * off, y1 = b.y - uy * (WR + 3) + ux * off;
  line(x0, y0, x1, y1); noStroke(); fill(...col);
  triangle(x1, y1, x1 - ux * 11 - uy * 5, y1 - uy * 11 + ux * 5, x1 - ux * 11 + uy * 5, y1 - uy * 11 - ux * 5);
}
function hitW(x, y) { for (let i = worlds.length - 1; i >= 0; i--) if (Math.hypot(worlds[i].x - x, worlds[i].y - y) < WR) return i; return -1; }
function mousePressed() {
  if (!gotFocus) { gotFocus = true; return; }
  if (mouseX > width * 0.54) return;
  dragFrom = hitW(mouseX, mouseY); dragMoved = false;
  if (dragFrom < 0 && worlds.length < MAX_W && mouseY > 80) { worlds.push({ x: mouseX, y: mouseY, p: false, q: false }); selW = worlds.length - 1; }
}
function mouseDragged() { if (dragFrom >= 0 && Math.hypot(mouseX - worlds[dragFrom].x, mouseY - worlds[dragFrom].y) > WR) dragMoved = true; }
function mouseReleased() {
  if (dragFrom < 0) return;
  let to = hitW(mouseX, mouseY);
  if (!dragMoved && to === dragFrom) selW = to;
  else if (to >= 0) { let k = rel.findIndex((e) => e[0] === dragFrom && e[1] === to); if (k >= 0) rel.splice(k, 1); else rel.push([dragFrom, to]); }
  else if (dragMoved) { worlds[dragFrom].x = clampv(mouseX, 30, width * 0.53); worlds[dragFrom].y = clampv(mouseY, 90, height - 90); }
  dragFrom = -1;
}
function keyPressed() {
  if (key === UP_ARROW) fIdx = (fIdx + FORMULAS.length - 1) % FORMULAS.length;
  if (key === DOWN_ARROW) fIdx = (fIdx + 1) % FORMULAS.length;
  if (key >= '1' && key <= '4') example(Number(key));
  if (worlds[selW] && (key === 'p' || key === 'P')) worlds[selW].p = !worlds[selW].p;
  if (worlds[selW] && (key === 'q' || key === 'Q')) worlds[selW].q = !worlds[selW].q;
  if (key === 'Backspace' && worlds.length) { let k = worlds.length - 1; worlds.pop(); rel = rel.filter((e) => e[0] !== k && e[1] !== k); selW = Math.min(selW, worlds.length - 1); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('式 ' + FORMULAS.length + ' 個と公理 5 つが全部読める（□ ◇ も [] <> も）', parsed.every((f) => f) && axF.every((f) => f) && fmlEq(parseFormula('[]p -> <>p', true).f, axF[3]));
  let frames = [];                      // 世界 1〜3 個のフレームを全部（2 + 16 + 512 = 530 個）
  for (let n = 1; n <= 3; n++) for (let m = 0; m < 1 << (n * n); m++) { let R = []; for (let i = 0; i < n; i++) { R.push([]); for (let j = 0; j < n; j++) R[i].push(!!((m >> (i * n + j)) & 1)); } frames.push([n, R]); }
  AXIOMS.forEach(([nm, s, prop, test], k) => {
    let agree = 0, fails = 0;
    for (let [n, R] of frames) { let v = validOnFrame(axF[k], n, R).ok; if (v === test(n, R)) agree++; if (!v) fails++; }
    check(nm + '（' + s + '）：世界 3 個までの全部のフレーム ' + frames.length + ' 個で「必ず真」⇔ ' + prop + '（成り立たないフレーム ' + fails + ' 個）', agree === frames.length && fails > 0);
  });
  let okK = frames.filter(([n]) => n <= 2).every(([n, R]) => validOnFrame(parsed[7], n, R).ok && validOnFrame(parsed[8], n, R).ok);
  check('K と「◇p ↔ ¬□¬p」は、どのフレームでも p, q をどう決めても真（世界 2 個まで全部）', okK);
  let R1 = [[false]];
  check('行き先のない世界では □⊥ が真（全部の行き先で… の「全部」が空）、◇⊤ は偽', evalModal(parseFormula('[]0', true).f, 0, 1, R1, {}) && !evalModal(parseFormula('<>1', true).f, 0, 1, R1, {}));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. お手本 1（推移的、反射的でない）で T を選ぶ。どの世界が赤？ w0 に自分への矢印を足すと？
// 2. お手本 2（反射的、推移的でない）で 4 が偽になる p の決め方を見つけよう（右下の表は「ある」と言っている）
// 3. お手本 3（全部つながる）では T・4・B・D・5 が全部「必ず真」。これが知識の論理 S5（「知っている」の論理）
// 4. □ を「いつも（これから先ずっと）」、◇ を「いつか」と読むと時間の論理。矢印 = 時間が進む向き。どんなフレームが合う？
// 5. FORMULAS に足そう：□□p → □p、◇◇p → ◇p。どんなフレームの性質と対応する？

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
