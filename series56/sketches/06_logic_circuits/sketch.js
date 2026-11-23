// ============================================
// 06 ブール代数と論理回路 ─ 論理式 → 真理値表・カルノー図 → いちばん短い式 → ゲートの数
// 論理式は 4 変数のブール代数の元。クワイン-マクラスキー法で主項（これ以上 文字を消せない積）をすべて求め、
// 主項の組み合わせを総当たりして、文字の数が最小の積和形（最簡積和形）を選ぶ。回路のゲートの数をくらべる
// ボタンかキーで式を組む（A B C D、! = ¬、& = ∧、| = ∨、( )）/ Backspace 1 つ消す / 0 全部消す / 1〜5 例 / カルノー図をクリックで 0 ⇔ 1
// ============================================

const VARS = ['A', 'B', 'C', 'D'];
const PRESETS = ['(A∧B)∨(A∧¬B)∨(¬A∧B∧C)', '(A∧B)∨(A∧C)∨(B∧C)∨(A∧B∧C)', '(¬A∧¬B)∨(¬A∧B∧D)∨(A∧B∧D)∨(A∧¬B∧¬D)', '¬(A∧B)∧(C∨D)∨(A∧B∧C∧D)', '(A∧¬B)∨(¬A∧B)'];   // ★ 例
const BTN = ['A', 'B', 'C', 'D', '¬', '∧', '∨', '(', ')', '⌫', '消す'];
let toks = [], tt = 0, err = '', fromMap = false, sol = null;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); loadExpr(PRESETS[0]); }

// ---- 式の読み取り（¬ が最も強く、次に ∧、最後に ∨）
function parse(tk) {
  let i = 0, peek = () => tk[i], eat = (t) => { if (tk[i] !== t) throw new Error(t + ' がほしい'); i++; };
  let atom = () => { let t = tk[i++]; if (t === '¬') return { op: 'not', a: atom() }; if (t === '(') { let e = orE(); eat(')'); return e; } if (VARS.includes(t)) return { op: 'var', v: VARS.indexOf(t) }; throw new Error(t ? '「' + t + '」は置けない' : '式が途中で終わっている'); };
  let andE = () => { let e = atom(); while (peek() === '∧') { i++; e = { op: 'and', a: e, b: atom() }; } return e; };
  let orE = () => { let e = andE(); while (peek() === '∨') { i++; e = { op: 'or', a: e, b: andE() }; } return e; };
  let e = orE(); if (i < tk.length) throw new Error('「' + tk[i] + '」が余分'); return e;
}
function evalE(e, m) { return e.op === 'var' ? (m >> (3 - e.v)) & 1 : e.op === 'not' ? 1 - evalE(e.a, m) : e.op === 'and' ? evalE(e.a, m) & evalE(e.b, m) : evalE(e.a, m) | evalE(e.b, m); }
function truthOf(e) { let t = 0; for (let m = 0; m < 16; m++) if (evalE(e, m)) t |= 1 << m; return t; }   // 16 ビットで真理値表（m = 8A + 4B + 2C + D）
function gatesOf(e) { let g = { and: 0, or: 0, not: 0 }; (function w(x) { if (x.op !== 'var') { g[x.op]++; w(x.a); if (x.b) w(x.b); } })(e); return g; }
function loadExpr(s) { toks = [...s]; fromMap = false; reparse(); }
function reparse() { try { let e = parse(toks); tt = truthOf(e); err = ''; sol = minimize(tt); sol.orig = gatesOf(e); } catch (ex) { err = ex.message; } }
// ---- クワイン-マクラスキー法：項 = [値 v, 消した文字 dc]（dc のビットは「どちらでもよい」）
function primesQM(t) {
  let cur = [], primes = [];
  for (let m = 0; m < 16; m++) if (t >> m & 1) cur.push([m, 0]);
  while (cur.length) {
    let used = new Set(), next = new Map();
    for (let i = 0; i < cur.length; i++) for (let j = i + 1; j < cur.length; j++) {
      let [v1, d1] = cur[i], [v2, d2] = cur[j], x = v1 ^ v2;
      if (d1 === d2 && popc(x) === 1) { used.add(i); used.add(j); next.set((v1 & ~x) + ',' + (d1 | x), [v1 & ~x, d1 | x]); }   // 1 文字だけちがう 2 項をまとめる
    }
    cur.forEach((c, i) => { if (!used.has(i)) primes.push(c); });
    cur = [...next.values()];
  }
  return primes;
}
function cellsOf([v, d]) { let s = 0; for (let m = 0; m < 16; m++) if ((m & ~d) === v) s |= 1 << m; return s; }
function litsOf([v, d]) { return 4 - popc(d); }
function minimize(t) {                 // 主項の部分集合を総当たり：全部の 1 をおおう中で文字数（同じなら項の数）が最小
  let pr = primesQM(t), best = null, nbest = 0;
  for (let s = 0; s < 1 << pr.length; s++) {
    let cov = 0, lit = 0, k = 0; for (let i = 0; i < pr.length; i++) if (s >> i & 1) { cov |= cellsOf(pr[i]); lit += litsOf(pr[i]); k++; }
    if (cov !== t) continue;
    if (!best || lit < best.lit || (lit === best.lit && k < best.k)) { best = { lit, k, terms: pr.filter((p, i) => s >> i & 1) }; nbest = 1; } else if (lit === best.lit && k === best.k) nbest++;
  }
  return { primes: pr, terms: best.terms, lit: best.lit, nbest };
}
function termStr([v, d]) { if (d === 15) return '1'; let s = []; for (let q = 0; q < 4; q++) { let b = 1 << (3 - q); if (!(d & b)) s.push((v & b ? '' : '¬') + VARS[q]); } return s.join(''); }
function sopStr(terms) { return terms.length ? terms.map(termStr).join(' ∨ ') : '0'; }
function sopGates(terms) { let nots = new Set(); terms.forEach(([v, d]) => { for (let q = 0; q < 4; q++) { let b = 1 << (3 - q); if (!(d & b) && !(v & b)) nots.add(q); } }); return { and: terms.reduce((s, p) => s + Math.max(0, litsOf(p) - 1), 0), or: Math.max(0, terms.length - 1), not: nots.size }; }

const TC = [[90, 225, 215], [255, 190, 90], [255, 120, 170], [170, 150, 255], [140, 225, 120], [255, 240, 120], [120, 170, 255], [255, 150, 100]];
function draw() {
  background(18, 20, 44);
  noStroke(); fill(240); textSize(18); text('ブール代数と論理回路　式 → 真理値表 → カルノー図 → 最簡積和形 → 回路', 20, 36);
  fill(175); textSize(15); text('ボタン / キー（A B C D ! & | ( )）で式を組む　Backspace 1 つ消す　0 全部消す　1〜5 例　カルノー図のマスをクリックで 0 ⇔ 1', 20, 62);
  BTN.forEach((b, k) => { fill(40, 46, 90); stroke(90, 100, 160); rect(20 + k * 50, 80, 44, 34, 6); noStroke(); fill(230); textAlign(CENTER, CENTER); textSize(k > 9 ? 13 : 17); text(b, 42 + k * 50, 97); });
  textAlign(LEFT, BASELINE); textSize(20); fill(255);
  text('f = ' + (fromMap ? 'Σm(' + [...Array(16).keys()].filter((m) => tt >> m & 1).join(',') + ')（カルノー図から）' : toks.join('') + (frameCount % 60 < 30 ? '▏' : '')), 590, 106);
  if (err) { fill(255, 120, 120); textSize(15); text('式がまだ完成していない：' + err + '（前の正しい式で表示中）', 590, 132); }
  // ---- 真理値表
  let ty = 170; textSize(13); fill(170); text('A B C D | f', 20, ty);
  for (let m = 0; m < 16; m++) { let y = ty + 22 + m * 21, v = tt >> m & 1; fill(v ? [255, 220, 130] : [140, 146, 180]); text([3, 2, 1, 0].map((q) => m >> q & 1).join(' ') + ' | ' + v, 24, y); }
  // ---- カルノー図（行 CD、列 AB をグレイ符号 00 01 11 10 の順に）
  let G = [0, 1, 3, 2], kx = 170, ky = 190, cs = Math.min(70, (height - 330) / 4);
  fill(170); text('AB →  00   01   11   10', kx, ky - 22);
  for (let r = 0; r < 4; r++) { fill(170); text(['00', '01', '11', '10'][r], kx - 26, ky + r * cs + cs / 2 + 4);
    for (let c = 0; c < 4; c++) { let m = G[c] * 4 + G[r], v = tt >> m & 1; stroke(70, 80, 130); fill(v ? [70, 76, 130] : [28, 32, 64]); rect(kx + c * cs, ky + r * cs, cs, cs);
      noStroke(); fill(v ? 255 : 110); textSize(18); textAlign(CENTER, CENTER); text(v, kx + c * cs + cs / 2, ky + r * cs + cs / 2);
      if (sol) sol.terms.forEach((p, k) => { if (cellsOf(p) >> m & 1) { fill(...TC[k % 8]); circle(kx + c * cs + 9 + 11 * (k % 5), ky + r * cs + cs - 9, 8); } });
      textAlign(LEFT, BASELINE); textSize(13); } }
  fill(170); text('CD ↓', kx - 40, ky - 8);
  // ---- 結果と回路
  if (!sol) return;
  let px = kx + 4 * cs + 50, y = 180; textSize(16); fill(230);
  text('主項（クワイン-マクラスキー法）' + sol.primes.length + ' 個：' + sol.primes.map(termStr).join('、'), px, y, width - px - 20);
  textSize(20); fill(255); text('最簡積和形：f = ', px, y + 70);
  let x = px + textWidth('最簡積和形：f = ');
  sol.terms.forEach((p, k) => { fill(...TC[k % 8]); let s = termStr(p) + (k < sol.terms.length - 1 ? ' ∨ ' : ''); text(s, x, y + 70); x += textWidth(s); });
  if (!sol.terms.length) text('0', x, y + 70);
  textSize(15); fill(200);
  text('文字 ' + sol.lit + ' 個、項 ' + sol.terms.length + ' 個（最小の組み合わせ ' + sol.nbest + ' 通り、主項の部分集合 2^' + sol.primes.length + ' 通りを総当たり）', px, y + 98);
  let g0 = sol.orig, g1 = sopGates(sol.terms);
  if (!fromMap) text('もとの式のゲート：AND ' + g0.and + '、OR ' + g0.or + '、NOT ' + g0.not + '（合計 ' + (g0.and + g0.or + g0.not) + '）', px, y + 128);
  fill(140, 225, 180); text('簡単にした回路：AND ' + g1.and + '、OR ' + g1.or + '、NOT ' + g1.not + '（合計 ' + (g1.and + g1.or + g1.not) + '、2 入力ゲートで数える）', px, y + 152);
  drawCircuit(px, y + 190, Math.min(width - px - 30, 520), height - y - 240);
  drawSelfTest(width - 180, height - 12);
}
function drawCircuit(x, y, w, h) {    // 入力の線 → AND（&）→ OR（≥1）
  let T = sol.terms, n = Math.max(1, T.length), gh = Math.min(44, h / n - 8), ox = x + w - 70, oy = y + h / 2;
  stroke(90, 100, 160); strokeWeight(1); noFill(); rect(x - 10, y - 10, w + 20, h + 10, 8);
  for (let q = 0; q < 4; q++) { stroke(150); line(x + 20 + q * 28, y, x + 20 + q * 28, y + h - 10); noStroke(); fill(220); textSize(13); text(VARS[q], x + 15 + q * 28, y + 4); }
  T.forEach((p, k) => {
    let gy = y + 10 + k * (h - 20) / n, ax = x + 170, [v, d] = p, li = 0;
    for (let q = 0; q < 4; q++) { let b = 1 << (3 - q); if (d & b) continue; let yy = gy + 8 + li * 9; li++; stroke(...TC[k % 8]); line(x + 20 + q * 28, yy, ax, yy); if (!(v & b)) { noStroke(); fill(255, 120, 120); circle(ax - 14, yy, 6); } }
    stroke(...TC[k % 8]); if (litsOf(p) > 1) { fill(30, 34, 70); rect(ax, gy, 40, Math.max(gh, li * 9 + 8), 4); noStroke(); fill(230); textSize(13); text('&', ax + 15, gy + gh / 2 + 4); stroke(...TC[k % 8]); line(ax + 40, gy + gh / 2, ox, oy); }
    else line(ax, gy + 8, ox, oy);   // 1 文字の項は AND がいらない（線をそのまま OR へ）
  });
  stroke(230); fill(30, 34, 70); rect(ox, oy - 22, 44, 44, 4); line(ox + 44, oy, ox + 64, oy); noStroke(); fill(230); text('≥1', ox + 12, oy + 5); text('f', ox + 58, oy - 6);
  fill(255, 120, 120); text('● = NOT', x, y + h - 14);
}

function addTok(t) { if (t === '⌫') toks.pop(); else if (t === '消す') toks = []; else toks.push(t); fromMap = false; reparse(); }
function mousePressed() {
  for (let k = 0; k < BTN.length; k++) if (mouseX > 20 + k * 50 && mouseX < 64 + k * 50 && mouseY > 80 && mouseY < 114) return addTok(BTN[k]);
  let G = [0, 1, 3, 2], kx = 170, ky = 190, cs = Math.min(70, (height - 330) / 4), c = Math.floor((mouseX - kx) / cs), r = Math.floor((mouseY - ky) / cs);
  if (c >= 0 && c < 4 && r >= 0 && r < 4) { tt ^= 1 << (G[c] * 4 + G[r]); fromMap = true; err = ''; sol = minimize(tt); sol.orig = { and: 0, or: 0, not: 0 }; }
}
function keyPressed() {
  let map = { a: 'A', b: 'B', c: 'C', d: 'D', '!': '¬', '~': '¬', '&': '∧', '*': '∧', '|': '∨', '+': '∨', '(': '(', ')': ')' }, k = typeof key === 'string' ? key.toLowerCase() : '';
  if (key === 'Backspace') addTok('⌫'); else if (key === '0') addTok('消す'); else if ('12345'.includes(key) && key.length === 1) loadExpr(PRESETS[+key - 1]); else if (map[k]) addTok(map[k]);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('ド・モルガン：¬(A∧B) と ¬A∨¬B は 16 行すべてで同じ', truthOf(parse([...'¬(A∧B)'])) === truthOf(parse([...'¬A∨¬B'])));
  seedRng(6); let fs = PRESETS.map((s) => truthOf(parse([...s]))); for (let k = 0; k < 40; k++) fs.push(Math.floor(rnd() * 65536));
  let eq = true, prOk = true;
  for (let t of fs) {
    let s = minimize(t), cov = 0; s.terms.forEach((p) => (cov |= cellsOf(p))); if (cov !== t) eq = false;
    let imp = []; for (let v = 0; v < 16; v++) for (let d = 0; d < 16; d++) if (!(v & d) && (cellsOf([v, d]) & ~t) === 0) imp.push(v + ',' + d);   // 81 個の積を全部調べた主項
    let isImp = new Set(imp), pr = imp.filter((x) => { let [v, d] = x.split(',').map(Number); for (let q = 0; q < 4; q++) { let b = 1 << q; if (!(d & b) && isImp.has((v & ~b) + ',' + (d | b))) return false; } return true; });
    if (pr.sort().join() !== s.primes.map((p) => p.join(',')).sort().join()) prOk = false;
  }
  check('例 5 つ + ランダムな関数 40 個：簡単にした式は 16 行すべてでもとの関数と同じ', eq);
  check('クワイン-マクラスキー法の主項 = 81 個の積を全部調べて求めた主項（同じ集合）', prOk);
  let s1 = minimize(fs[0]), maj = minimize(fs[1]), xr = minimize(0x6996), cyc = minimize([0, 1, 2, 5, 6, 7].reduce((t, m) => t | (3 << (2 * m)), 0));   // D は関係なし
  check('例 1 は A ∨ BC（3 文字）、多数決は AB ∨ AC ∨ BC（6 文字）', s1.terms.map(termStr).sort().join() === 'A,BC' && maj.lit === 6 && maj.terms.length === 3);
  check('4 変数の XOR は 8 項 32 文字（これ以上まとまらない）', xr.lit === 32 && xr.terms.length === 8 && xr.primes.length === 8);
  check('巡回する関数 Σm(0,1,2,5,6,7)（3 変数）：最簡形は 3 項 6 文字が 2 通り', cyc.lit === 6 && cyc.terms.length === 3 && cyc.nbest === 2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 例 1 の式は長いのに、最簡形は A ∨ BC。カルノー図で 1 のかたまりを見つけよう
// 2. カルノー図のマスをクリックして、項が 1 つになる形、2 つになる形を作ろう（大きな四角 = 短い項）
// 3. 例 5（XOR）は簡単にならない。カルノー図が市松模様だから
// 4. ¬(A∧B) と ¬A∨¬B を入力して、真理値表が同じになることを確かめよう（ド・モルガン）
// 5. 4 変数の論理関数は全部で 2^16 = 65536 個。これは 16 個の原子をもつブール代数（05）


// ==================================================
// ここから下は「束論の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 順序集合 P = { n, R, lab, cov, rk, pos }。R[i][j] = 1 は「i ≤ j」（n × n の 0/1 の表）
function makePoset(n, leqFn, labs) {
  let R = [];
  for (let i = 0; i < n; i++) { R.push(new Uint8Array(n)); for (let j = 0; j < n; j++) R[i][j] = i === j || leqFn(i, j) ? 1 : 0; }
  return posetFromRel(R, labs);
}
function posetFromRel(R, labs) { let n = R.length, cov = coversOf(R); return { n, R, cov, rk: ranksOf(n, cov), pos: [], lab: labs || [...Array(n).keys()].map(String) }; }
function fromCovers(labs, cv) { let n = labs.length, R = []; for (let i = 0; i < n; i++) R.push(new Uint8Array(n)); for (let [a, b] of cv) R[a][b] = 1; return posetFromRel(closeRel(R), labs); }   // 被覆の組から
function closeRel(R) {                 // 反射的・推移的閉包（ワーシャル法：k を経由して行けるなら i ≤ j）
  let n = R.length, C = R.map((r) => Uint8Array.from(r));
  for (let i = 0; i < n; i++) C[i][i] = 1;
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) if (C[i][k]) for (let j = 0; j < n; j++) if (C[k][j]) C[i][j] = 1;
  return C;
}
function isReflexive(R) { return R.every((r, i) => r[i] === 1); }
function isAntisym(R) { for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (R[i][j] && R[j][i]) return false; return true; }
function isTransitive(R) { let n = R.length; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (R[i][j]) for (let k = 0; k < n; k++) if (R[j][k] && !R[i][k]) return false; return true; }
function isPoset(R) { return isReflexive(R) && isAntisym(R) && isTransitive(R); }
function coversOf(R) {                 // 被覆 a ⋖ b：a < b で、間にはさまる c がない（推移的簡約 = ハッセ図の辺）
  let n = R.length, E = [], lt = (a, b) => a !== b && R[a][b] && !R[b][a];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (lt(a, b)) {
    let ok = true; for (let c = 0; c < n && ok; c++) if (lt(a, c) && lt(c, b)) ok = false;
    if (ok) E.push([a, b]);
  }
  return E;
}
function ranksOf(n, cov) {             // ランク = 下から c までの最長の鎖の長さ（最大 n 回くり返せば止まる）
  let rk = new Array(n).fill(0);
  for (let t = 0; t <= n; t++) { let ch = false; for (let [a, b] of cov) if (rk[b] < rk[a] + 1 && rk[a] < n) { rk[b] = rk[a] + 1; ch = true; } if (!ch) break; }
  return rk;
}
function allOf(P) { return [...Array(P.n).keys()]; }
function upperOf(P, a, b) { return allOf(P).filter((c) => P.R[a][c] && P.R[b][c]); }   // 上界：a と b の両方より上
function lowerOf(P, a, b) { return allOf(P).filter((c) => P.R[c][a] && P.R[c][b]); }   // 下界
function leastOf(P, Sx) { for (let x of Sx) if (Sx.every((y) => P.R[x][y])) return x; return -1; }      // 最小元（なければ −1）
function greatestOf(P, Sx) { for (let x of Sx) if (Sx.every((y) => P.R[y][x])) return x; return -1; }   // 最大元
function joinOf(P, a, b) { return leastOf(P, upperOf(P, a, b)); }     // 上限 a ∨ b = 最小上界（なければ −1）
function meetOf(P, a, b) { return greatestOf(P, lowerOf(P, a, b)); }  // 下限 a ∧ b = 最大下界
function botOf(P) { return leastOf(P, allOf(P)); }
function topOf(P) { return greatestOf(P, allOf(P)); }
function isLattice(P) { if (P.n === 0) return false; for (let a = 0; a < P.n; a++) for (let b = a + 1; b < P.n; b++) if (joinOf(P, a, b) < 0 || meetOf(P, a, b) < 0) return false; return true; }
function tables(P) {                   // 上限・下限の表（何度も使うので先に計算）
  P.J = []; P.M = [];
  for (let a = 0; a < P.n; a++) { P.J.push(new Int16Array(P.n)); P.M.push(new Int16Array(P.n)); for (let b = 0; b < P.n; b++) { P.J[a][b] = joinOf(P, a, b); P.M[a][b] = meetOf(P, a, b); } }
  return P;
}
// ---- よく使う束：約数の束（割り切る）と部分集合の束（含まれる）
function gcdOf(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function lcmOf(a, b) { return (a / gcdOf(a, b)) * b; }
function divisorsOf(n) { let d = []; for (let k = 1; k <= n; k++) if (n % k === 0) d.push(k); return d; }
function primeFactors(n) { let f = []; for (let p = 2; p * p <= n; p++) if (n % p === 0) { let e = 0; while (n % p === 0) { n /= p; e++; } f.push([p, e]); } if (n > 1) f.push([n, 1]); return f; }
function divisorPoset(n) {
  let D = divisorsOf(n), P = makePoset(D.length, (i, j) => D[j] % D[i] === 0, D.map(String)), ps = primeFactors(n).map((f) => f[0]), dir = [-1, 1, -0.3, 0.55, -0.62];
  P.val = D; P.hint = (i) => ps.reduce((s, p, t) => { let e = 0, v = D[i]; while (v % p === 0) { v /= p; e++; } return s + e * dir[t % 5]; }, 0);
  return P;
}
function popc(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }
function setName(m, k) { let s = ''; for (let t = 0; t < k; t++) if (m >> t & 1) s += 'abcdefg'[t]; return s || '∅'; }
function powersetPoset(k) {
  let P = makePoset(1 << k, (i, j) => (i & j) === i, [...Array(1 << k).keys()].map((m) => setName(m, k))), dir = [-1, 1, -0.3, 0.55];
  P.val = [...Array(1 << k).keys()]; if (k <= 4) P.hint = (i) => dir.reduce((s, d, t) => s + (i >> t & 1) * d, 0);
  return P;
}
// ---- ハッセ図を描く：高さ = ランク、横 = hint（なければ下の被覆の平均の順）
function layoutHasse(P, x, y, w, h, exact) {
  let mr = Math.max(0, ...P.rk), lv = [], px = new Array(P.n).fill(0.5);
  for (let r = 0; r <= mr; r++) lv.push([]);
  for (let i = 0; i < P.n; i++) lv[P.rk[i]].push(i);
  for (let r = 0; r <= mr; r++) {
    for (let i of lv[r]) { if (P.hint) px[i] = P.hint(i); else { let s = 0, c = 0; for (let [a, b] of P.cov) if (b === i) { s += px[a]; c++; } px[i] = (c ? s / c : 0.5) + i * 1e-6; } }
    lv[r].sort((a, b) => px[a] - px[b]);
    if (!(exact && P.hint)) lv[r].forEach((i, k) => (px[i] = (k + 0.5) / lv[r].length));
  }
  if (exact && P.hint) { let lo = Math.min(...px), hi = Math.max(...px); px = px.map((v) => (hi > lo ? 0.04 + 0.92 * (v - lo) / (hi - lo) : 0.5)); }
  P.pos = []; for (let i = 0; i < P.n; i++) P.pos.push([x + w * px[i], y + h - (mr ? P.rk[i] / mr : 0.5) * h]);
}
function drawHasse(P, o) {             // o = { col(i), ecol(a, b), rad, fs }。色は [r, g, b]
  o = o || {}; let rad = o.rad || 16;
  strokeWeight(2);
  for (let [a, b] of P.cov) { stroke(...((o.ecol && o.ecol(a, b)) || [96, 108, 168])); line(P.pos[a][0], P.pos[a][1], P.pos[b][0], P.pos[b][1]); }
  textAlign(CENTER, CENTER); textSize(o.fs || 13);
  for (let i = 0; i < P.n; i++) {
    stroke(18, 20, 44); strokeWeight(2); fill(...((o.col && o.col(i)) || [226, 232, 248])); circle(P.pos[i][0], P.pos[i][1], 2 * rad);
    noStroke(); fill(18, 20, 44); text(P.lab[i], P.pos[i][0], P.pos[i][1] + 1);
  }
  textAlign(LEFT, BASELINE);
}
function nodeAt(P, mx, my, r) { let best = -1, bd = r || 20; for (let i = 0; i < P.n; i++) { let d = Math.hypot(P.pos[i][0] - mx, P.pos[i][1] - my); if (d < bd) { bd = d; best = i; } } return best; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(sd) { rngState = (sd >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randomPoset(n, p) { let o = []; for (let i = 0; i < n; i++) o.push(i); for (let i = n - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }   // ランダムな順番 o で、前 → 後ろに確率 p で辺 → 閉包
  let R = []; for (let i = 0; i < n; i++) R.push(new Uint8Array(n));
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (rnd() < p) R[o[a]][o[b]] = 1;
  return posetFromRel(closeRel(R));
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let k = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (k === selfTestResults.length ? '✓ ' : '✗ ') + k + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestResults.every((r) => r.ok) ? [120, 220, 170] : [255, 90, 90])); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
