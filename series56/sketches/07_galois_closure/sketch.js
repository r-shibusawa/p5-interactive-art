// ============================================
// 07 ガロア接続と閉包 ─ 2 つの束の間を行き来する f と g
// 1：数の集合 X → 「X の全員が持つ性質」f(X)、性質の集合 Y → 「Y を全部持つ数」g(Y)。Y ⊆ f(X) ⇔ X ⊆ g(Y)（向きが逆のガロア接続）
// 2：関数 h(x) = x mod 4 の像 f(X) = h(X) と逆像 g(Y) = h⁻¹(Y)。f(X) ⊆ Y ⇔ X ⊆ g(Y)（向きが同じガロア接続）
// どちらも c = g∘f は閉包作用素（拡大・単調・冪等）で、閉じた集合（c(X) = X）は束になる
// 1 2 例を切りかえ / 上の数をクリックで X に入れる・出す / 下の性質をクリックで Y / スペース X を c(X) にする / R 空にする
// ============================================

const NUM = 10;                        // ★ 数 1〜NUM（10 まで）
const PROPS = [['偶数', (k) => k % 2 === 0], ['奇数', (k) => k % 2 === 1], ['素数', (k) => [2, 3, 5, 7].includes(k)], ['3 の倍数', (k) => k % 3 === 0], ['5 以下', (k) => k <= 5], ['平方数', (k) => [1, 4, 9].includes(k)]];
let ex = 1, Xm = 0b0000010100, Ym = 0, objA = [], attrO = [], CL = null;

function setup() { createCanvas(windowWidth, windowHeight); prepare(); selfTest(); rebuild(); }

function prepare() {                   // 数 → 性質のビット、性質 → 数のビット
  objA = []; attrO = PROPS.map(() => 0);
  for (let o = 0; o < NUM; o++) { let m = 0; PROPS.forEach(([nm, fn], a) => { if (fn(o + 1)) { m |= 1 << a; attrO[a] |= 1 << o; } }); objA.push(m); }
}
const ALLO = (1 << NUM) - 1;
function nB() { return ex === 1 ? PROPS.length : 4; }
function fOf(X) {                      // 1：共通の性質　2：像 h(X)
  if (ex === 1) { let m = (1 << PROPS.length) - 1; for (let o = 0; o < NUM; o++) if (X >> o & 1) m &= objA[o]; return m; }
  let m = 0; for (let o = 0; o < NUM; o++) if (X >> o & 1) m |= 1 << ((o + 1) % 4); return m;
}
function gOf(Y) {                      // 1：Y を全部持つ数　2：逆像 h⁻¹(Y)
  let m = 0; for (let o = 0; o < NUM; o++) { if (ex === 1 ? (objA[o] & Y) === Y : Y >> ((o + 1) % 4) & 1) m |= 1 << o; } return m;
}
function cOf(X) { return gOf(fOf(X)); }
function sub(a, b) { return (a & b) === a; }   // a ⊆ b
function rebuild() {                   // 閉じた集合を全部集めて、⊆ の束を作る
  let cs = new Set(); for (let X = 0; X <= ALLO; X++) cs.add(cOf(X));
  let L = [...cs].sort((a, b) => popc(a) - popc(b) || a - b);
  CL = makePoset(L.length, (i, j) => sub(L[i], L[j]), L.map((m) => (ex === 1 ? bitNames(fOf(m), PROPS.map((p) => p[0][0])) : bitNames(fOf(m), ['0', '1', '2', '3']))));
  CL.val = L; layoutHasse(CL, width * 0.6, 190, width * 0.37, height - 300);
}
function bitNames(m, nm) { let s = ''; for (let a = 0; a < nm.length; a++) if (m >> a & 1) s += nm[a]; return s || '–'; }
function setText(X) { let s = []; for (let o = 0; o < NUM; o++) if (X >> o & 1) s.push(o + 1); return '{' + s.join(', ') + '}'; }

function draw() {
  background(18, 20, 44);
  let fX = fOf(Xm), cX = cOf(Xm), gY = gOf(Ym), bw = Math.min(64, (width * 0.55 - 40) / NUM);
  // ---- 数のタイル（白わく = X、水色 = 閉包で増えた分）
  for (let o = 0; o < NUM; o++) {
    let x = 20 + o * bw, inX = Xm >> o & 1, inC = cX >> o & 1;
    stroke(inX ? 255 : 70); strokeWeight(inX ? 3 : 1); fill(inC ? (inX ? [70, 120, 150] : [60, 200, 190]) : [34, 38, 76]); rect(x, 120, bw - 8, bw - 8, 6);
    noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(20); text(o + 1, x + bw / 2 - 4, 120 + bw / 2 - 4);
    if (gY >> o & 1) { fill(255, 190, 90); circle(x + bw / 2 - 4, 120 + bw - 2, 8); }
  }
  // ---- 性質のチップ（橙わく = Y、緑 = f(X)）
  let names = ex === 1 ? PROPS.map((p) => p[0]) : ['÷4 余り 0', '余り 1', '余り 2', '余り 3'];
  for (let a = 0; a < nB(); a++) {
    let x = 20 + a * 110, inF = fX >> a & 1, inY = Ym >> a & 1;
    stroke(inY ? [255, 190, 90] : [70, 76, 120]); strokeWeight(inY ? 3 : 1); fill(inF ? [60, 150, 100] : [34, 38, 76]); rect(x, 230, 100, 40, 6);
    noStroke(); fill(240); textSize(14); text(names[a], x + 50, 250);
  }
  textAlign(LEFT, BASELINE);
  // ---- 説明
  let y = 310; textSize(16); fill(230);
  text('X = ' + setText(Xm), 20, y);
  fill(140, 225, 160); text((ex === 1 ? 'f(X) = X の全員が持つ性質 = ' : 'f(X) = 像 h(X) = ') + '{' + [...Array(nB()).keys()].filter((a) => fX >> a & 1).map((a) => names[a]).join('、') + '}', 20, y + 28);
  fill(90, 225, 215); text('c(X) = g(f(X)) = ' + setText(cX) + (cX === Xm ? '　← X は閉じている' : '　（水色が増えた分）'), 20, y + 56);
  fill(255, 190, 90); text('Y = {' + [...Array(nB()).keys()].filter((a) => Ym >> a & 1).map((a) => names[a]).join('、') + '}　g(Y) = ' + setText(gY) + '（橙の点）', 20, y + 84);
  let lhs = ex === 1 ? sub(Ym, fX) : sub(fX, Ym), rhs = sub(Xm, gY);
  fill(255); textSize(17);
  text((ex === 1 ? 'Y ⊆ f(X) ？ ' : 'f(X) ⊆ Y ？ ') + (lhs ? 'はい' : 'いいえ') + '　⇔　X ⊆ g(Y) ？ ' + (rhs ? 'はい' : 'いいえ') + (lhs === rhs ? '　✓ いつも同じ答え' : '　✗'), 20, y + 124);
  fill(175); textSize(14);
  ['閉包作用素 c = g∘f の 3 つの性質（全部の X で確かめた）：', '　拡大　X ⊆ c(X)　　単調　X ⊆ X′ なら c(X) ⊆ c(X′)　　冪等　c(c(X)) = c(X)',
    ex === 1 ? '向きが逆（X が大きいほど f(X) は小さい）。だから性質の側は ⊇ で並べるとガロア接続' : '像と逆像：h⁻¹(h(X)) = X と同じ余りの数を全部集めた集合', '閉じた集合 ' + CL.n + ' 個：∩ で閉じていて、上限 = c(X ∪ X′)、下限 = X ∩ X′ の束（右）'].forEach((s, k) => text(s, 20, y + 160 + 22 * k));
  // ---- 右：閉じた集合の束
  let cur = CL.val.indexOf(cX);
  drawHasse(CL, { rad: 15, fs: 10, col: (i) => (i === cur ? [90, 225, 215] : sub(Xm, CL.val[i]) ? [150, 190, 205] : [130, 140, 190]) });
  noStroke(); fill(200); textSize(14); text('閉じた集合の束（ラベル = その集合の f）　水色 = c(X)、うす水色 = X をふくむ閉じた集合', width * 0.6, 150, width * 0.38);
  let hv = nodeAt(CL, mouseX, mouseY, 16); if (hv >= 0) { fill(255); text(setText(CL.val[hv]), mouseX + 14, mouseY - 10); }
  fill(240); textSize(18); text('ガロア接続と閉包　例 ' + ex + '：' + (ex === 1 ? '数 ⇔ 性質（共通の性質・それを持つ数）' : '像と逆像 h(x) = x mod 4'), 20, 36);
  fill(175); textSize(15); text('1 2 例　数をクリック X　性質をクリック Y　スペース X を c(X) に　R 空にする', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() {
  let bw = Math.min(64, (width * 0.55 - 40) / NUM);
  if (mouseY > 120 && mouseY < 120 + bw) { let o = Math.floor((mouseX - 20) / bw); if (o >= 0 && o < NUM) Xm ^= 1 << o; }
  if (mouseY > 230 && mouseY < 270) { let a = Math.floor((mouseX - 20) / 110); if (a >= 0 && a < nB()) Ym ^= 1 << a; }
}
function keyPressed() {
  if (key === '1' || key === '2') { ex = +key; Ym = 0; rebuild(); }
  if (key === ' ') Xm = cOf(Xm);
  if (key === 'r' || key === 'R') { Xm = 0; Ym = 0; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  for (let e of [1, 2]) {
    ex = e; let gal = true, ext = true, mono = true, idem = true, nb = 1 << nB();
    for (let X = 0; X <= ALLO; X++) {
      let fX = fOf(X), c = cOf(X);
      for (let Y = 0; Y < nb; Y++) if ((e === 1 ? sub(Y, fX) : sub(fX, Y)) !== sub(X, gOf(Y))) gal = false;
      if (!sub(X, c)) ext = false; if (cOf(c) !== c) idem = false;
      for (let o = 0; o < NUM; o++) if (!sub(c, cOf(X | (1 << o)))) mono = false;   // 1 つ足しても縮まない → 単調
    }
    check('例 ' + e + '：' + (e === 1 ? 'Y ⊆ f(X) ⇔ X ⊆ g(Y)' : 'f(X) ⊆ Y ⇔ X ⊆ g(Y)') + '（X 1024 通り × Y ' + nb + ' 通り）', gal);
    check('例 ' + e + '：c = g∘f は拡大・単調・冪等（閉包作用素）', ext && mono && idem);
    rebuild(); let L = CL, ok = isLattice(L);
    for (let i = 0; i < L.n; i++) for (let j = 0; j < L.n; j++) if (L.val[meetOf(L, i, j)] !== (L.val[i] & L.val[j]) || L.val[joinOf(L, i, j)] !== cOf(L.val[i] | L.val[j])) ok = false;
    check('例 ' + e + '：閉じた集合 ' + L.n + ' 個は束で、下限 = ∩、上限 = c(∪)' + (e === 2 ? '、2^4 = 16 個' : ''), ok && (e === 1 || L.n === 16));
  }
  ex = 1; let fgf = true; for (let X = 0; X <= ALLO; X++) if (fOf(gOf(fOf(X))) !== fOf(X)) fgf = false;
  check('f∘g∘f = f（性質の側でも g の後に f をすると閉じる）', fgf);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. X = {3, 5} にすると f(X) と c(X) は？ 3 と 5 の両方が持つ性質を全部持つ数は？
// 2. 性質を 1 つずつ Y に入れて、「Y ⊆ f(X)」と「X ⊆ g(Y)」の答えがいつも同じことを確かめよう
// 3. スペースで X を c(X) にする。もう一度押すと変わる？（冪等）
// 4. PROPS に「6 以上」を足すと閉じた集合の束はどう変わる？（08 の形式概念分析と同じしくみ）
// 5. 例 2 の h を x mod 3 に変えると、閉じた集合はいくつ？


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
