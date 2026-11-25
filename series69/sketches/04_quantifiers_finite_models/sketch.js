// ============================================
// 04 量化子と有限モデル ─ 点（もの）と矢印（関係 R）の小さな世界で、∀（すべての）∃（ある）を含む式の真偽を調べる
// ∀x ∃y R(x,y)「どの点からも矢印が出ている」と ∃y ∀x R(x,y)「全員から矢印が来る 1 点がある」は順番だけちがうが意味がちがう。
// 世界が有限なら、∀ は「全部の点で調べる」、∃ は「1 つ見つかればよい」で計算できる。光る矢印が証拠（∃ の見つけた点）
// 空いた所をクリック = 点を足す（最初の 1 回はキーを届かせるだけ）/ 点から点へドラッグ = 矢印 R(x,y) の切りかえ（同じ点へ戻ると自分への矢印）
// 点をクリック = 性質 P の切りかえ（黄色い点）/ 点を空いた所へドラッグ = 動かす / Backspace 最後の点を消す
// ↑↓ 式を選ぶ / ← → x の値を選ぶ / 1 輪（a→b→c→a）2 星 3 空っぽ / R でたらめな世界
// ============================================

const FORMULAS = [                      // ★ 調べる式（∀ ∃ ¬ ∧ ∨ →、R(x,y)、P(x)、x = y）
  ['∀x ∃y R(x,y)', 'どの点からも矢印が出ている'],
  ['∃y ∀x R(x,y)', '全員（自分も）から矢印が来る点がある'],
  ['∃x ∀y R(x,y)', '全員へ矢印を出す点がある'],
  ['∀x ∃y R(y,x)', 'どの点にも矢印が来ている'],
  ['∀x R(x,x)', '反射的'],
  ['∀x ∀y (R(x,y) → R(y,x))', '対称的'],
  ['∀x ∀y ∀z (R(x,y) ∧ R(y,z) → R(x,z))', '推移的'],
  ['∀x (P(x) → ∃y (R(x,y) ∧ ¬P(y)))', '黄色い点はどれも、黄色でない点へ矢印を出す'],
  ['∃y ∀x R(x,y) → ∀x ∃y R(x,y)', '∃∀ なら ∀∃（いつも真）'],
  ['∀x ∃y R(x,y) → ∃y ∀x R(x,y)', '∀∃ なら ∃∀？（成り立たない世界がある）'],
];
const MAX_PTS = 7, PR = 22;             // ★ 点の数の上限、点の半径
let pts = [], rel = new Set(), fIdx = 0, xSel = 0, gotFocus = false, dragFrom = -1, dragMoved = false, parsedF = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  parsedF = FORMULAS.map((f) => foParse(f[0]));
  selfTest();
  exampleWorld(1);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
const NAMES = 'abcdefg';
function rk(i, j) { return i + ',' + j; }
function hasR(i, j) { return rel.has(rk(i, j)); }
function exampleWorld(k) {
  let cx = width * 0.3, cy = height * 0.52, rr = Math.min(width, height) * 0.2;
  const ring = (n) => { pts = []; for (let i = 0; i < n; i++) pts.push({ x: cx + rr * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n), y: cy + rr * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n), P: false }); };
  rel = new Set();
  if (k === 1) { ring(3); rel = new Set([rk(0, 1), rk(1, 2), rk(2, 0)]); pts[0].P = true; }
  if (k === 2) { ring(4); for (let i = 0; i < 4; i++) rel.add(rk(i, 0)); }
  if (k === 3) ring(3);
  if (k === 4) { ring(rndInt(3, 5)); for (let i = 0; i < pts.length; i++) { pts[i].P = rnd() < 0.4; for (let j = 0; j < pts.length; j++) if (rnd() < 0.3) rel.add(rk(i, j)); } }
  xSel = 0;
}
// ---- 一階の式：小さな構文解析（∀x φ・∃x φ・R(x,y)・P(x)・x = y と ¬ ∧ ∨ →）
function foParse(s) {
  let i = 0;
  const ws = () => { while (s[i] === ' ') i++; }, eat = (c) => { ws(); if (s.startsWith(c, i)) { i += c.length; return true; } return false; };
  const vname = () => { ws(); let c = s[i]; if (c >= 'a' && c <= 'z') { i++; return c; } throw '変数がない'; };
  const imp = () => { let a = orr(); if (eat('→')) return { op: 'imp', a, b: imp() }; return a; };
  const orr = () => { let a = andd(); while (eat('∨')) a = { op: 'or', a, b: andd() }; return a; };
  const andd = () => { let a = un(); while (eat('∧')) a = { op: 'and', a, b: un() }; return a; };
  const un = () => {
    if (eat('¬')) return { op: 'not', a: un() };
    if (eat('∀')) { let v = vname(); return { op: 'all', v, a: un() }; }
    if (eat('∃')) { let v = vname(); return { op: 'ex', v, a: un() }; }
    if (eat('(')) { let a = imp(); if (!eat(')')) throw '「)」がない'; return a; }
    if (eat('R(')) { let a = vname(); eat(','); let b = vname(); if (!eat(')')) throw '「)」がない'; return { op: 'R', x: a, y: b }; }
    if (eat('P(')) { let a = vname(); if (!eat(')')) throw '「)」がない'; return { op: 'P', x: a }; }
    let a = vname(); if (!eat('=')) throw '読めない'; return { op: 'eq', x: a, y: vname() };
  };
  try { let f = imp(); ws(); return i === s.length ? f : null; } catch (e) { return null; }
}
function foEval(f, env, n, R, Pv) {     // 世界：点 0..n-1、関係 R(i,j)、性質 Pv(i)。env = { x: 点の番号 }
  switch (f.op) {
    case 'R': return R(env[f.x], env[f.y]);
    case 'P': return Pv(env[f.x]);
    case 'eq': return env[f.x] === env[f.y];
    case 'not': return !foEval(f.a, env, n, R, Pv);
    case 'and': return foEval(f.a, env, n, R, Pv) && foEval(f.b, env, n, R, Pv);
    case 'or': return foEval(f.a, env, n, R, Pv) || foEval(f.b, env, n, R, Pv);
    case 'imp': return !foEval(f.a, env, n, R, Pv) || foEval(f.b, env, n, R, Pv);
    case 'all': for (let d = 0; d < n; d++) if (!foEval(f.a, Object.assign({}, env, { [f.v]: d }), n, R, Pv)) return false; return true;
    case 'ex': for (let d = 0; d < n; d++) if (foEval(f.a, Object.assign({}, env, { [f.v]: d }), n, R, Pv)) return true; return false;
  }
  return false;
}
function evalHere(f, env) { return foEval(f, env || {}, pts.length, hasR, (i) => !!pts[i].P); }
function witness(f, env) {              // ∃ なら最初の証拠の点、∀ なら最初の反例の点（なければ -1）
  for (let d = 0; d < pts.length; d++) { let v = evalHere(f.a, Object.assign({}, env, { [f.v]: d })); if (f.op === 'ex' ? v : !v) return d; }
  return -1;
}

function draw() {
  background(...BG);
  hudTitle('量化子と有限モデル：∀ と ∃ の順番で意味が変わる', 'クリック 点を足す / 点の切りかえ P　ドラッグ 矢印 R / 動かす　↑↓ 式　← → x を選ぶ　1 輪 2 星 3 空 R でたらめ　Backspace 点を消す');
  let f = parsedF[fIdx], n = pts.length, hiEdges = [], xMark = -1, yMark = -1, lines = [];
  // ---- 説明：外側の量化子の変数 x の値ごとに、内側の証拠（または反例）
  if (f && n && (f.op === 'all' || f.op === 'ex')) {
    xSel = clampv(xSel, 0, n - 1);
    for (let d = 0; d < n; d++) {
      let env = { [f.v]: d }, v = evalHere(f.a, env), inner = f.a, s = f.v + ' = ' + NAMES[d] + '：' + (v ? '真' : '偽');
      if (inner.op === 'all' || inner.op === 'ex') {
        let w = witness(inner, env);
        s += w >= 0 ? '（' + inner.v + ' = ' + NAMES[w] + (inner.op === 'ex' ? ' が証拠）' : ' が反例）') : inner.op === 'ex' ? '（' + inner.v + ' が見つからない）' : '（どの ' + inner.v + ' でも成り立つ）';
        if (d === xSel && w >= 0) { yMark = w; if (inner.a.op === 'R') hiEdges.push(inner.a.x === f.v ? [d, w] : [w, d]); }
      } else if (d === xSel && inner.op === 'R' && inner.x === f.v && inner.y === f.v) hiEdges.push([d, d]);
      lines.push([s, v, d]);
    }
    xMark = xSel;
  }
  // ---- 世界の図
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (hasR(i, j)) drawArrow(i, j, hiEdges.some((e) => e[0] === i && e[1] === j) ? YEL : LINEC);
  if (dragFrom >= 0 && dragMoved) { stroke(...SKY); strokeWeight(2); line(pts[dragFrom].x, pts[dragFrom].y, mouseX, mouseY); }
  pts.forEach((p, i) => {
    stroke(...(i === xMark ? SKY : i === yMark ? YEL : INK)); strokeWeight(i === xMark || i === yMark ? 4 : 2);
    fill(...(p.P ? [150, 128, 60] : PANEL)); circle(p.x, p.y, PR * 2);
    noStroke(); fill(...INK); textSize(18); textAlign(CENTER, CENTER); text(NAMES[i], p.x, p.y);
  });
  // ---- 右：式の一覧と、選んだ式の説明
  let rx = width * 0.58;
  noStroke(); textAlign(LEFT, BASELINE);
  FORMULAS.forEach(([s, ja], k) => {
    let g = parsedF[k], v = g && n ? evalHere(g) : null, y = 108 + k * 27;
    if (k === fIdx) { fill(...LINEC); rect(rx - 8, y - 18, width - rx - 12, 25, 4); }
    fill(...(v === null ? DIMC : v ? GRN : PINK)); textSize(15); text(v === null ? '?' : v ? '真' : '偽', rx, y);
    fill(...INK); text(s, rx + 30, y);
  });
  let y0 = 108 + FORMULAS.length * 27 + 16;
  fill(...YEL); textSize(15); text('「' + FORMULAS[fIdx][1] + '」', rx, y0);
  lines.forEach(([s, v, d], k) => { fill(...(d === xSel ? INK : DIMC)); textSize(14); text((d === xSel ? '▶ ' : '　') + s, rx, y0 + 26 + k * 21); });
  fill(...DIMC); textSize(13);
  text('枠の色：水色 = いま見ている x、黄 = 見つけた証拠 / 反例の y。黄色の矢印がその関係', rx, height - 64);
  text('点 ' + n + ' 個・矢印 ' + rel.size + ' 本（点 n 個の世界の関係は 2^(n×n) 通り）', rx, height - 42);
  drawSelfTest(width - 180, height - 14);
}
function drawArrow(i, j, col) {
  let a = pts[i], b = pts[j];
  stroke(...col); strokeWeight(col === YEL ? 3 : 2); noFill();
  if (i === j) { circle(a.x, a.y - PR - 12, 26); return; }
  let dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, off = hasR(j, i) ? 6 : 0;
  let x0 = a.x + ux * PR - uy * off, y0 = a.y + uy * PR + ux * off, x1 = b.x - ux * (PR + 3) - uy * off, y1 = b.y - uy * (PR + 3) + ux * off;
  line(x0, y0, x1, y1);
  noStroke(); fill(...col); triangle(x1, y1, x1 - ux * 11 - uy * 5, y1 - uy * 11 + ux * 5, x1 - ux * 11 + uy * 5, y1 - uy * 11 - ux * 5);
}
function hitPt(x, y) { for (let i = pts.length - 1; i >= 0; i--) if (Math.hypot(pts[i].x - x, pts[i].y - y) < PR) return i; return -1; }
function mousePressed() {
  if (!gotFocus) { gotFocus = true; return; }  // 最初の 1 回はキーを届かせるだけ
  if (mouseX > width * 0.56) return;
  dragFrom = hitPt(mouseX, mouseY); dragMoved = false;
  if (dragFrom < 0 && pts.length < MAX_PTS && mouseY > 80) pts.push({ x: mouseX, y: mouseY, P: false });
}
function mouseDragged() { if (dragFrom >= 0 && Math.hypot(mouseX - pts[dragFrom].x, mouseY - pts[dragFrom].y) > PR) dragMoved = true; }
function mouseReleased() {
  if (dragFrom < 0) return;
  let to = hitPt(mouseX, mouseY);
  if (!dragMoved && to === dragFrom) pts[dragFrom].P = !pts[dragFrom].P;
  else if (to >= 0) { let k = rk(dragFrom, to); if (rel.has(k)) rel.delete(k); else rel.add(k); }
  else if (dragMoved) { pts[dragFrom].x = clampv(mouseX, 30, width * 0.55); pts[dragFrom].y = clampv(mouseY, 90, height - 30); }
  dragFrom = -1;
}
function keyPressed() {
  if (key === UP_ARROW) fIdx = (fIdx + FORMULAS.length - 1) % FORMULAS.length;
  if (key === DOWN_ARROW) fIdx = (fIdx + 1) % FORMULAS.length;
  if (key === LEFT_ARROW) xSel = Math.max(0, xSel - 1);
  if (key === RIGHT_ARROW) xSel = Math.min(pts.length - 1, xSel + 1);
  if (key >= '1' && key <= '3') exampleWorld(Number(key));
  if (key === 'r' || key === 'R') exampleWorld(4);
  if (key === 'Backspace' && pts.length) { let k = pts.length - 1; pts.pop(); rel = new Set([...rel].filter((e) => e.split(',').every((v) => Number(v) !== k))); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('式 ' + FORMULAS.length + ' 個が全部読める', parsedF.every((f) => f));
  const ev = (k, n, R, Pv) => foEval(parsedF[k], {}, n, R, Pv || (() => false));
  let cyc = (i, j) => (i + 1) % 3 === j;
  check('輪 a→b→c→a：∀x∃y R(x,y) は真、∃y∀x R(x,y) は偽（順番で意味が変わる）', ev(0, 3, cyc) && !ev(1, 3, cyc));
  seedRng(8); let agree = 0, N = 200, valid = true, convFail = 0;
  const all = (n, f) => { for (let i = 0; i < n; i++) if (!f(i)) return false; return true; }, some = (n, f) => !all(n, (i) => !f(i));
  for (let t = 0; t < N; t++) {
    let n = rndInt(1, 5), M = []; for (let i = 0; i < n * n; i++) M.push(rnd() < 0.35);
    let Pa = []; for (let i = 0; i < n; i++) Pa.push(rnd() < 0.5);
    const R = (i, j) => M[i * n + j], Pv = (i) => Pa[i];
    let direct = [all(n, (x) => some(n, (y) => R(x, y))), some(n, (y) => all(n, (x) => R(x, y))), some(n, (x) => all(n, (y) => R(x, y))), all(n, (x) => some(n, (y) => R(y, x))),
      all(n, (x) => R(x, x)), all(n, (x) => all(n, (y) => !R(x, y) || R(y, x))), all(n, (x) => all(n, (y) => all(n, (z) => !(R(x, y) && R(y, z)) || R(x, z)))),
      all(n, (x) => !Pv(x) || some(n, (y) => R(x, y) && !Pv(y)))];
    if (direct.every((v, k) => v === ev(k, n, R, Pv))) agree++;
    if (!ev(8, n, R)) valid = false;
    if (!ev(9, n, R)) convFail++;
  }
  check('でたらめな世界 ' + N + ' 個（点 1〜5 個）：式の計算 = 二重・三重ループで直接調べた答え（8 つの式）', agree === N);
  check('∃y∀x R(x,y) → ∀x∃y R(x,y) は全部の世界で真、逆は偽になる世界がある（' + convFail + ' 個）', valid && convFail > 0);
  let c2 = [0, 0];
  for (let m = 0; m < 16; m++) { const R = (i, j) => !!((m >> (i * 2 + j)) & 1); if (ev(0, 2, R)) c2[0]++; if (ev(1, 2, R)) c2[1]++; }
  check('点 2 個の世界の関係 16 通り：∀x∃y R は (2²−1)² = 9 通り、∃y∀x R は 16 − 3² = 7 通りで真', c2[0] === 9 && c2[1] === 7);
  pts = [{ P: false }, { P: false }, { P: false }]; rel = new Set([rk(0, 1), rk(1, 2), rk(2, 0)]);
  check('輪の世界で ∀x∃y R(x,y) の証拠：a → b、b → c、c → a（次の点）', [0, 1, 2].every((d) => witness(parsedF[0].a, { x: d }) === (d + 1) % 3));
  check('おかしな式は読めない（null を返し、例外を出さない）', foParse('∀ R(x)') === null && foParse('R(x,y') === null && foParse('') === null);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 輪（1）で、どの式が真でどれが偽？ 矢印を 1 本足して ∃y∀x R(x,y) を真にするには？
// 2. ← → で x を動かして、∀x∃y の「y の証拠」が x ごとに変わる様子を見よう。∃y∀x では y は 1 つに決まっている
// 3. 反射的・対称的・推移的を全部みたす世界（同値関係）を作ろう。点はいくつかのグループに分かれる
// 4. 最後の 2 つの式：∃∀ → ∀∃ はどんな世界でも真（妥当）。逆が偽になる一番小さい世界は？
// 5. FORMULAS に式を足そう：「矢印が来ない点がある」∃x ∀y ¬R(y,x)、「x = y でなければ矢印がある」など

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
