// ============================================
// 09 文脈自由文法と CYK 構文解析 ─ 「式 → 式 + 項」のような書きかえ規則（文法）で、かっこの入った式の形を決める
// チョムスキー標準形（右辺が「記号 2 つ」か「文字 1 つ」）に直した文法なら、短い部分から長い部分へ表を埋めていける：
// 表のマス (i, 長さ) = 「i 文字目からその長さの部分を作れる記号」。一番上のマスに E があれば受理（CYK 法）。
// あいまいな文法では、同じ式に構文木が 2 つ以上できる（n+n*n は「(n+n)*n」と「n+(n*n)」）
// n + * ( ) 入力（数字も n）/ Backspace 消す / スペース 自動で埋める / → 1 マス / A 全部 / G 文法を変える / T 次の構文木 / ↑↓ お手本
// ============================================

const GRAMMARS = [
  { name: 'ふつうの式の文法（あいまいでない）', orig: ['E → E + T | T', 'T → T * F | F', 'F → ( E ) | n'],
    bin: [['E', 'E', 'X1'], ['E', 'T', 'X2'], ['E', 'L', 'X3'], ['X1', 'P', 'T'], ['T', 'T', 'X2'], ['T', 'L', 'X3'], ['X2', 'M', 'F'], ['F', 'L', 'X3'], ['X3', 'E', 'R']],
    term: [['E', 'n'], ['T', 'n'], ['F', 'n'], ['P', '+'], ['M', '*'], ['L', '('], ['R', ')']] },
  { name: 'あいまいな文法', orig: ['E → E + E | E * E | ( E ) | n'],
    bin: [['E', 'E', 'Y1'], ['E', 'E', 'Y2'], ['E', 'L', 'X3'], ['Y1', 'P', 'E'], ['Y2', 'M', 'E'], ['X3', 'E', 'R']],
    term: [['E', 'n'], ['P', '+'], ['M', '*'], ['L', '('], ['R', ')']] },
];
const PRESETS = ['n+n*n', '(n+n)*n', 'n*(n+n*n)', 'n+n+n+n', 'n+*n', '((n))'];
let gIdx = 0, word = PRESETS[0], pIdx = 0, table, filled = 0, auto = true, treeIdx = 0, cells = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  rerun();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }
// ★ CYK：cnt[i][l][A] = 「i 文字目から長さ l の部分」を A から作る構文木の数
function cyk(g, s) {
  let n = s.length, cnt = [];
  for (let i = 0; i < n; i++) { cnt.push([]); for (let l = 0; l <= n - i; l++) cnt[i].push({}); }
  for (let i = 0; i < n; i++) for (let [A, a] of g.term) if (s[i] === a) cnt[i][1][A] = 1;            // 長さ 1：文字の規則
  for (let l = 2; l <= n; l++) for (let i = 0; i + l <= n; i++) for (let k = 1; k < l; k++)            // 長さ l を 左 k + 右 l−k に分ける
    for (let [A, B, C] of g.bin) { let x = cnt[i][k][B], y = cnt[i + k][l - k][C]; if (x && y) cnt[i][l][A] = (cnt[i][l][A] || 0) + x * y; }
  return cnt;
}
function treeOf(g, cnt, A, i, l, t) {   // t 番目の構文木を取り出す
  if (l === 1) return { sym: A, kids: [{ sym: word[i], kids: [] }] };
  for (let k = 1; k < l; k++) for (let [A2, B, C] of g.bin) {
    if (A2 !== A) continue;
    let x = cnt[i][k][B] || 0, y = cnt[i + k][l - k][C] || 0;
    if (t < x * y) return { sym: A, kids: [treeOf(g, cnt, B, i, k, Math.floor(t / y)), treeOf(g, cnt, C, i + k, l - k, t % y)] };
    t -= x * y;
  }
  return { sym: A, kids: [] };
}
function rerun() {
  table = word.length ? cyk(GRAMMARS[gIdx], word) : null;
  cells = []; for (let l = 1; l <= word.length; l++) for (let i = 0; i + l <= word.length; i++) cells.push([i, l]);
  filled = auto ? 0 : cells.length; treeIdx = 0;
}

function draw() {
  background(...BG);
  let g = GRAMMARS[gIdx], n = word.length;
  hudTitle('文脈自由文法と CYK 構文解析：' + g.name, 'n + * ( ) 入力　Backspace　スペース 自動で埋める　→ 1 マス　A 全部　G 文法　T 次の構文木　↑↓ お手本');
  if (auto && frameCount % 10 === 0 && filled < cells.length) filled++;
  // ---- 文法
  noStroke(); textAlign(LEFT, BASELINE); fill(...INK); textSize(16); text('文法', 30, 100);
  fill(...AMBER); textSize(16); g.orig.forEach((r, i) => text(r, 30, 126 + i * 24));
  fill(...DIMC); textSize(13); text('チョムスキー標準形に直すと：', 30, 210);
  g.bin.concat(g.term).forEach((r, i) => text(r[0] + ' → ' + r.slice(1).join(' '), 30 + (i >= 9 ? 120 : 0), 234 + (i % 9) * 20));
  // ---- 入力
  for (let i = 0; i < n; i++) { stroke(...WIRE); fill(...PANEL); rect(300 + i * 54, 92, 50, 36, 5); noStroke(); fill(...INK); textAlign(CENTER, CENTER); textSize(20); text(word[i], 325 + i * 54, 110); }
  if (!n) return;
  // ---- CYK の表（下の段 = 長さ 1、上へ行くほど長い）
  let cw = 54, ch = Math.min(52, (height - 260) / n), bx = 300, by = 150 + n * ch;
  for (let c = 0; c < Math.min(filled, cells.length); c++) {
    let [i, l] = cells[c], x = bx + i * cw + (l - 1) * cw / 2, y = by - l * ch, m = table[i][l], ks = Object.keys(m), last = c === filled - 1 && filled < cells.length;
    stroke(...(last ? AMBER : WIRE)); strokeWeight(last ? 3 : 1); fill(...(ks.length ? [28, 60, 45] : PANEL)); rect(x, y, cw - 4, ch - 4, 4);
    noStroke(); fill(...(m['E'] && l === n ? LIME : INK)); textAlign(CENTER, CENTER); textSize(Math.min(12, ch * 0.3));
    let labs = ks.map((k) => k + (m[k] > 1 ? '×' + m[k] : ''));
    text(labs.slice(0, 3).join(' ') + (labs.length > 3 ? '\n' + labs.slice(3).join(' ') : ''), x + cw / 2 - 2, y + ch / 2 - 2);
  }
  noStroke(); fill(...DIMC); textSize(12); textAlign(LEFT, BASELINE);
  text('マス (i, 長さ) = 作れる記号（×数 = 構文木の数）。長さ l のマスは「左 k + 右 l−k」の全部の分け方を調べる', bx, by + 20);
  // ---- 結果と構文木
  let done = filled >= cells.length, top = table[0][n]['E'] || 0, px = Math.max(bx + n * cw + 30, width * 0.55);
  textSize(20); fill(...(done ? (top ? LIME : ROSE) : DIMC));
  text(done ? (top ? '受理：構文木 ' + top + ' 個' + (top > 1 ? '（あいまい！ T で次の木）' : '') : '不受理：一番上のマスに E がない') : '表を埋めている途中…', px, 110);
  if (done && top) {
    let tr = treeOf(g, table, 'E', 0, n, treeIdx % top);
    fill(...DIMC); textSize(14); text('構文木 ' + (treeIdx % top + 1) + ' / ' + top + '：' + bracketed(tr), px, 140);
    drawTreeAt(tr, px, 170, width - px - 30, height - 240);
  }
  drawSelfTest(width - 180, height - 14);
}
function bracketed(t, inner) {         // 構文木 → 計算のまとまりを [ ] で示した式（一番外は省く）
  if (!t.kids.length) return t.sym;
  let s = t.kids.map((k) => bracketed(k, true)).join('');
  return inner && (t.sym === 'E' || t.sym === 'T') && t.kids.length === 2 && s[0] !== '(' ? '[' + s + ']' : s;
}
function drawTreeAt(t, x, y, w, h) {
  let leaves = (u) => (u.kids.length ? u.kids.reduce((a, k) => a + leaves(k), 0) : 1), depth = (u) => (u.kids.length ? 1 + Math.max(...u.kids.map(depth)) : 1);
  let lw = w / leaves(t), dy = Math.min(50, h / depth(t));
  function rec(u, x0, lvl) {
    let cx = x0 + (leaves(u) * lw) / 2, cy = y + lvl * dy + 14, off = x0;
    for (let k of u.kids) { stroke(...WIRE); strokeWeight(1.5); line(cx, cy, off + (leaves(k) * lw) / 2, y + (lvl + 1) * dy + 14); rec(k, off, lvl + 1); off += leaves(k) * lw; }
    noStroke(); fill(...(u.kids.length ? (u.sym === 'E' ? AMBER : CYAN) : INK)); circle(cx, cy, 26);
    fill(10, 20, 15); textAlign(CENTER, CENTER); textSize(12); text(u.sym, cx, cy + 1);
  }
  rec(t, x, 0);
}

function keyPressed() {
  let c = /[0-9]/.test(key) ? 'n' : key;
  if (key.length === 1 && 'n+*()'.indexOf(c) >= 0) { word = typeInto(word, c, 'n+*()', 12); rerun(); return false; }
  if (key === 'Backspace') { word = word.slice(0, -1); rerun(); }
  if (key === ' ') { auto = !auto; if (auto && filled >= cells.length) filled = 0; }
  if (key === RIGHT_ARROW) { auto = false; filled = Math.min(cells.length, filled + 1); }
  if (key === 'a' || key === 'A') filled = cells.length;
  if (key === 'g' || key === 'G') { gIdx = (gIdx + 1) % GRAMMARS.length; rerun(); }
  if (key === 't' || key === 'T') treeIdx++;
  if (key === UP_ARROW || key === DOWN_ARROW) { pIdx = (pIdx + (key === UP_ARROW ? PRESETS.length - 1 : 1)) % PRESETS.length; word = PRESETS[pIdx]; rerun(); }
  return false;
}

// ---- 自己テスト
function derivedStrings(g, maxLen) {    // 総当たり：一番左の記号から書きかえ続けて、長さ maxLen までの文字列を全部作る
  let nts = new Set(g.bin.map((r) => r[0]).concat(g.term.map((r) => r[0]))), out = new Set(), seen = new Set(), todo = [['E']];
  while (todo.length) {
    let f = todo.pop(), k = f.findIndex((x) => nts.has(x));
    if (k < 0) { out.add(f.join('')); continue; }
    for (let r of g.bin) if (r[0] === f[k] && f.length + 1 <= maxLen) { let nf = f.slice(0, k).concat([r[1], r[2]], f.slice(k + 1)), key2 = nf.join(' '); if (!seen.has(key2)) { seen.add(key2); todo.push(nf); } }
    for (let r of g.term) if (r[0] === f[k]) { let nf = f.slice(0, k).concat([r[1]], f.slice(k + 1)), key2 = nf.join(' '); if (!seen.has(key2)) { seen.add(key2); todo.push(nf); } }
  }
  return out;
}
function cykAcceptsAll(g, maxLen) {     // 長さ maxLen までの全部の文字列（5 文字の組み合わせ）を CYK で。1 文字足すごとに表の右の列だけ計算
  let nts = [...new Set(g.bin.map((r) => r[0]).concat(g.term.map((r) => r[0])))], id = (x) => nts.indexOf(x), E = 1 << id('E');
  let rules = g.bin.map((r) => [1 << id(r[0]), 1 << id(r[1]), 1 << id(r[2])]), al = 'n+*()', tm = [...al].map((c) => g.term.filter((r) => r[1] === c).reduce((m, r) => m | (1 << id(r[0])), 0));
  let T = []; for (let i = 0; i < maxLen; i++) T.push(new Int32Array(maxLen)); let acc = [], s = [];
  function dfs(j) {
    for (let a = 0; a < 5; a++) {
      s[j] = al[a]; T[j][j] = tm[a];
      for (let i = j - 1; i >= 0; i--) { let m = 0; for (let k = i; k < j; k++) { let L = T[i][k], R = T[k + 1][j]; if (L && R) for (let [A, B, C] of rules) if (L & B && R & C) m |= A; } T[i][j] = m; }
      if (T[0][j] & E) acc.push(s.slice(0, j + 1).join(''));
      if (j + 1 < maxLen) dfs(j + 1);
    }
  }
  dfs(0); return acc;
}
function selfTest() {
  selfTestResults = [];
  let D = derivedStrings(GRAMMARS[0], 7), A = cykAcceptsAll(GRAMMARS[0], 7);
  check('ふつうの文法：長さ 7 までの全部の文字列（97655 個）で、CYK が受理 = 書きかえの総当たりで作れる（' + D.size + ' 個）', A.length === D.size && A.every((s) => D.has(s)));
  let D2 = derivedStrings(GRAMMARS[1], 7), A2 = cykAcceptsAll(GRAMMARS[1], 7);
  check('あいまいな文法でも同じ（' + D2.size + ' 個）、しかも 2 つの文法は同じ言語', A2.length === D2.size && A2.every((s) => D2.has(s)) && D2.size === D.size && [...D2].every((s) => D.has(s)));
  check('ふつうの文法では受理される式の構文木はいつも 1 個', [...D].every((s) => cyk(GRAMMARS[0], s)[0][s.length]['E'] === 1));
  let c1 = cyk(GRAMMARS[1], 'n+n*n')[0][5]['E'], c2 = cyk(GRAMMARS[1], 'n+n+n+n')[0][7]['E'], c3 = cyk(GRAMMARS[1], 'n+n+n+n+n')[0][9]['E'];
  check('あいまいな文法の構文木の数：n+n*n → ' + c1 + '、n+n+n+n → ' + c2 + '、5 項 → ' + c3 + '（カタラン数 2, 5, 14）', c1 === 2 && c2 === 5 && c3 === 14);
  check('n+*n、(n、n) は不受理', ['n+*n', '(n', 'n)'].every((s) => !(cyk(GRAMMARS[0], s)[0][s.length]['E'])));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. G であいまいな文法にして n+n*n。2 つの木の「どちらが先に計算されるか」をくらべよう。ふつうの文法ではなぜ 1 つ？
// 2. n+n+n+n+n の木はいくつ？ 項を増やすと 1, 2, 5, 14, 42 …（カタラン数）
// 3. 引き算 - を足すには？ 元の文法に E → E - T を足し、標準形の規則を 2 つ足そう（P2 → - と X4 → P2 T）
// 4. 文法の書きかえで図形を作るのが L システム（シリーズ 2 の 03）。こちらは「書きかえで文字列の形を判定する」側
// 5. CYK の手間は 文字数³ × 規則の数。長い式で表を埋める時間がどう増えるか、数えてみよう

// ==================================================
// ここから下は「オートマトンの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具
const BG = [9, 20, 15];                 // 背景（回路基板の黒緑）
const INK = [226, 240, 228];            // 文字（蛍光の白）
const AMBER = [255, 170, 50], CYAN = [70, 215, 230], LIME = [140, 230, 120], ROSE = [255, 100, 120], VIOLET = [185, 150, 255];
const DIMC = [125, 155, 138], PANEL = [18, 36, 28], WIRE = [44, 74, 58];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; return v.toFixed(d === undefined ? 2 : d); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function typeInto(s, ch, allowed, maxLen) {   // 文字の入力：allowed に入っている 1 文字だけ足す（長さの上限つき）
  if (typeof ch !== 'string' || ch.length !== 1 || allowed.indexOf(ch) < 0) return s;
  return s.length < (maxLen || 40) ? s + ch : s;
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
function rndString(alpha, len) { let s = ''; for (let i = 0; i < len; i++) s += alpha[Math.floor(rnd() * alpha.length)]; return s; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
