// ============================================
// 08 形式概念分析 ─ 「対象 × 属性」の表から概念を全部見つけ、概念束を描く
// 対象の集合 A に共通の属性 A′、属性の集合 B を全部持つ対象 B′。A′ = B かつ B′ = A となる組 (A, B) が「概念」（外延 A・内包 B）
// 属性の部分集合 2^7 = 128 通りを全部調べて概念を集め、外延の ⊆ で並べる。属性名は上、対象名は下に書く（いちばん簡単なラベル）
// 表のマスをクリックで ✓ を切りかえ / 概念の丸をクリック → 外延・内包 / R もとの表 / C 表を空に / スペース 含意の表示を切りかえ
// ============================================

const OBJS = ['ライオン', 'ワシ', 'ペンギン', 'イルカ', 'カエル', 'ヘビ', 'ハト', 'コウモリ'];   // ★ 対象
const ATTRS = ['飛ぶ', '泳ぐ', '羽', '卵', '哺乳類', '肉食', '4 本足'];                       // ★ 属性
const START = ['0000111', '1011010', '0111010', '0100110', '0101011', '0001010', '1011000', '1000100'];   // ★ 表（1 = ✓）
let ctx = [], CL = null, concepts = [], pick = -1, showImp = true;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); resetCtx(); }

function resetCtx() { ctx = START.map((r) => [...r].reduce((m, c, a) => m | (c === '1' ? 1 << a : 0), 0)); rebuild(); }
// 導出作用素：A′ = A の全員が持つ属性、B′ = B を全部持つ対象（ビットマスク）
function objPrime(cx, nA, A) { let m = (1 << nA) - 1; cx.forEach((row, g) => { if (A >> g & 1) m &= row; }); return m; }
function attrPrime(cx, B) { let m = 0; cx.forEach((row, g) => { if ((row & B) === B) m |= 1 << g; }); return m; }
function conceptsOf(cx, nA) {          // 属性の部分集合を全部調べる：B → B′ → B″ が内包
  let seen = new Map();
  for (let B = 0; B < 1 << nA; B++) { let A = attrPrime(cx, B); if (!seen.has(A)) seen.set(A, objPrime(cx, nA, A)); }
  return [...seen.entries()].map(([A, B]) => ({ A, B })).sort((p, q) => popc(p.A) - popc(q.A) || p.A - q.A);
}
function conceptsByObjects(cx, nA) {   // 確かめ用：対象の部分集合から（A → A′ → A″）
  let seen = new Set(); for (let A = 0; A < 1 << cx.length; A++) seen.add(attrPrime(cx, objPrime(cx, nA, A)));
  return [...seen].sort((a, b) => a - b);
}
function rebuild() {
  concepts = conceptsOf(ctx, ATTRS.length); pick = -1;
  CL = makePoset(concepts.length, (i, j) => (concepts[i].A & concepts[j].A) === concepts[i].A, concepts.map(() => ''));
  layoutHasse(CL, width * 0.47, 170, width * 0.5, height - 290);
}
function implications() {              // 1 つの属性どうしの含意 a → b（a を持つ対象はみな b も持つ）
  let out = [];
  for (let a = 0; a < ATTRS.length; a++) for (let b = 0; b < ATTRS.length; b++) if (a !== b) { let Aa = attrPrime(ctx, 1 << a), Ab = attrPrime(ctx, 1 << b); if (Aa && (Aa & Ab) === Aa) out.push(ATTRS[a] + ' → ' + ATTRS[b]); }
  return out;
}

function draw() {
  background(18, 20, 44);
  // ---- 表
  let cw = 52, chh = 30, tx = 110, ty = 140;
  textSize(13); textAlign(CENTER, CENTER);
  ATTRS.forEach((a, k) => { fill(90, 225, 215); noStroke(); text(a, tx + k * cw + cw / 2, ty - 14); });
  for (let g = 0; g < OBJS.length; g++) {
    let inA = pick >= 0 && concepts[pick].A >> g & 1;
    noStroke(); fill(inA ? [255, 200, 110] : [210]); textAlign(RIGHT, CENTER); text(OBJS[g], tx - 8, ty + g * chh + chh / 2); textAlign(CENTER, CENTER);
    for (let a = 0; a < ATTRS.length; a++) {
      let on = ctx[g] >> a & 1, inB = pick >= 0 && concepts[pick].B >> a & 1;
      stroke(60, 68, 120); fill(inA && inB ? [70, 110, 120] : [30, 34, 70]); rect(tx + a * cw, ty + g * chh, cw, chh);
      if (on) { noStroke(); fill(255); textSize(16); text('✓', tx + a * cw + cw / 2, ty + g * chh + chh / 2); textSize(13); }
    }
  }
  textAlign(LEFT, BASELINE);
  // ---- 概念束（属性名は μ(m) = (m′, m″) の上に、対象名は γ(g) = (g″, g′) の下に）
  drawHasse(CL, { rad: 9, col: (i) => (i === pick ? [255, 255, 255] : pick >= 0 && CL.R[i][pick] ? [255, 200, 110] : pick >= 0 && CL.R[pick][i] ? [90, 225, 215] : [150, 160, 205]) });
  textSize(12); textAlign(CENTER, BASELINE);
  ATTRS.forEach((a, k) => { let A = attrPrime(ctx, 1 << k), i = concepts.findIndex((c) => c.A === A); if (i >= 0) { fill(90, 225, 215); text(a, CL.pos[i][0], CL.pos[i][1] - 13 - 13 * ATTRS.slice(0, k).filter((x, j) => attrPrime(ctx, 1 << j) === A).length); } });
  OBJS.forEach((o, g) => { let B = ctx[g], i = concepts.findIndex((c) => c.B === B); if (i >= 0) { fill(255, 200, 110); text(o, CL.pos[i][0], CL.pos[i][1] + 22 + 13 * OBJS.slice(0, g).filter((x, h) => ctx[h] === B).length); } });
  textAlign(LEFT, BASELINE);
  // ---- 文字
  let y = ty + OBJS.length * chh + 34; textSize(15);
  if (pick >= 0) { let c = concepts[pick];
    fill(255, 200, 110); text('外延 A = {' + OBJS.filter((o, g) => c.A >> g & 1).join('、') + '}', 20, y, width * 0.44);
    fill(90, 225, 215); text('内包 B = {' + ATTRS.filter((a, k) => c.B >> k & 1).join('、') + '}', 20, y + 48, width * 0.44);
    fill(175); text('A′ = B かつ B′ = A ' + (objPrime(ctx, ATTRS.length, c.A) === c.B && attrPrime(ctx, c.B) === c.A ? '✓' : '✗') + '　（下 = 橙の概念は部分概念、上 = 水色は上位概念）', 20, y + 96, width * 0.44); }
  else { fill(175); text('概念の丸をクリック → 外延（対象）と内包（属性）', 20, y); }
  if (showImp) { let im = implications(); fill(200); text('含意（その属性を持つ対象はみな…）' + im.length + ' 個：', 20, y + 140); fill(160, 200, 255); text(im.slice(0, 14).join('　'), 20, y + 150, width * 0.44); }
  fill(240); textSize(18); text('形式概念分析　対象 ' + OBJS.length + ' × 属性 ' + ATTRS.length + ' → 概念 ' + concepts.length + ' 個（2^' + ATTRS.length + ' = ' + (1 << ATTRS.length) + ' 通りの属性の組から）', 20, 36);
  fill(175); textSize(15); text('表のマスをクリック ✓ 切りかえ　丸をクリック 概念を見る　R もとの表　C 空に　スペース 含意 ' + (showImp ? '表示' : '非表示'), 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() {
  let cw = 52, chh = 30, tx = 110, ty = 140, a = Math.floor((mouseX - tx) / cw), g = Math.floor((mouseY - ty) / chh);
  if (a >= 0 && a < ATTRS.length && g >= 0 && g < OBJS.length) { ctx[g] ^= 1 << a; rebuild(); return; }
  let i = nodeAt(CL, mouseX, mouseY, 14); if (i >= 0) pick = i === pick ? -1 : i;
}
function keyPressed() {
  if (key === 'r' || key === 'R') resetCtx();
  if (key === 'c' || key === 'C') { ctx = ctx.map(() => 0); rebuild(); }
  if (key === ' ') showImp = !showImp;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let ne = [0, 1, 2, 3].map((g) => 15 & ~(1 << g)), id = [0, 1, 2, 3].map((g) => 1 << g);
  check('「i ≠ j で ✓」の 4 × 4 の表：概念は 2^4 = 16 個（概念束 = 部分集合の束）', conceptsOf(ne, 4).length === 16);
  check('対角線だけ ✓ の 4 × 4 の表：概念は 4 + 2 = 6 個（M4 の形）', conceptsOf(id, 4).length === 6);
  resetCtx(); let cs = conceptsOf(ctx, ATTRS.length);
  check('動物の表：属性 128 通りから求めた概念 ' + cs.length + ' 個 = 対象 256 通りから求めた概念', cs.map((c) => c.A).sort((a, b) => a - b).join() === conceptsByObjects(ctx, ATTRS.length).join());
  check('どの概念も A′ = B かつ B′ = A', cs.every((c) => objPrime(ctx, ATTRS.length, c.A) === c.B && attrPrime(ctx, c.B) === c.A));
  let ok = isLattice(CL);
  for (let i = 0; i < CL.n; i++) for (let j = 0; j < CL.n; j++) if (concepts[meetOf(CL, i, j)].A !== (concepts[i].A & concepts[j].A)) ok = false;
  check('概念束は束で、下限の外延 = 外延の共通部分', ok);
  let im = implications(), dir = []; for (let a = 0; a < ATTRS.length; a++) for (let b = 0; b < ATTRS.length; b++) if (a !== b && ctx.some((r) => r >> a & 1) && ctx.every((r) => !(r >> a & 1) || r >> b & 1)) dir.push(ATTRS[a] + ' → ' + ATTRS[b]);
  check('含意 a → b の一覧 = 表を 1 行ずつ見て確かめたもの（' + im.length + ' 個、例：羽 → 卵）', im.join() === dir.join() && im.includes('羽 → 卵'));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 「羽」のラベルがある丸をクリック。外延は？ 内包に「卵」が入っているのはなぜ？
// 2. コウモリの「飛ぶ」の ✓ を消すと、概念はいくつ減る？ 束の形はどう変わる？
// 3. 含意「羽 → 卵」がある。ペンギンに ✓ を足し引きして、この含意をこわしてみよう
// 4. 自分で対象（好きな食べ物など）と属性を書きかえて、概念束を作ろう（OBJS, ATTRS, START）
// 5. 07 のガロア接続と同じ f, g。概念 = 閉じた集合の組


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
