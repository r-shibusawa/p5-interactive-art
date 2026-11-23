// ============================================
// 01 約数の束 ─ n の約数を「割り切る」で並べる
// d | e（d が e を割り切る）は半順序。2 つの約数の上限（最小上界）は最小公倍数 lcm、下限（最大下界）は最大公約数 gcd
// 上限・下限は順序の表から計算して、lcm・gcd と一致するかを確かめる。素因数が k 種類で平方因子がなければ k 次元の立方体
// ← → n を変える / 要素を 2 つクリック → 上限と下限 / スペース 選択を消す / L 数のかわりに素因数で表示
// ============================================

const NS = [12, 30, 36, 60, 72, 210, 360, 420];   // ★ 選べる n
let ni = 3, lat, sel = [], factorLab = false;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function rebuild() {
  lat = divisorPoset(NS[ni]); sel = [];
  if (factorLab) lat.lab = lat.val.map(factorName);
  layoutHasse(lat, 120, 170, width - 520, height - 290, true);
}
function factorName(d) { let f = primeFactors(d); return f.length ? f.map(([p, e]) => p + (e > 1 ? '^' + e : '')).join('·') : '1'; }
function shapeText(n) {               // 約数の束 = 鎖の直積（指数 + 1 個ずつの鎖）
  let f = primeFactors(n), sq = f.every((x) => x[1] === 1);
  return f.map(([p, e]) => e + 1).join(' × ') + ' の格子（鎖の直積）' + (sq ? '＝ ' + f.length + ' 次元の立方体' : '');
}

function draw() {
  background(18, 20, 44);
  let n = NS[ni], jn = sel.length === 2 ? joinOf(lat, sel[0], sel[1]) : -1, mt = sel.length === 2 ? meetOf(lat, sel[0], sel[1]) : -1;
  let up = sel.length === 2 ? upperOf(lat, sel[0], sel[1]) : [], lo = sel.length === 2 ? lowerOf(lat, sel[0], sel[1]) : [];
  drawHasse(lat, { rad: n > 200 ? 17 : 20, fs: factorLab ? 11 : 14,
    col: (i) => (i === jn ? [90, 225, 215] : i === mt ? [255, 190, 90] : sel.includes(i) ? [255, 255, 255] : up.includes(i) ? [160, 215, 220] : lo.includes(i) ? [235, 205, 160] : [150, 160, 205]),
    ecol: (a, b) => (sel.length === 2 && up.includes(a) && up.includes(b) ? [90, 200, 200] : sel.length === 2 && lo.includes(a) && lo.includes(b) ? [220, 160, 80] : null) });
  // ---- 右のパネル
  let px = width - 370, y = 160;
  noStroke(); fill(230); textSize(16); text('n = ' + n + ' = ' + factorName(n), px, y);
  fill(175); textSize(14);
  let lines = ['約数の数 τ(n) = ' + lat.n + ' = ' + primeFactors(n).map((f) => '(' + f[1] + '+1)').join(''), 'ハッセ図の辺（被覆）= ' + lat.cov.length + ' 本', '高さ（ランク）= 素因数の個数（重複こみ）', shapeText(n)];
  lines.forEach((s, k) => text(s, px, y + 30 + 24 * k));
  y += 160;
  if (sel.length === 2) {
    let a = lat.val[sel[0]], b = lat.val[sel[1]];
    fill(255); textSize(16); text('a = ' + a + '、b = ' + b, px, y);
    fill(90, 225, 215); text('上限 a ∨ b = ' + lat.val[jn] + '　lcm(a, b) = ' + lcmOf(a, b) + (lat.val[jn] === lcmOf(a, b) ? '　✓' : '　✗'), px, y + 30);
    fill(255, 190, 90); text('下限 a ∧ b = ' + lat.val[mt] + '　gcd(a, b) = ' + gcdOf(a, b) + (lat.val[mt] === gcdOf(a, b) ? '　✓' : '　✗'), px, y + 58);
    fill(175); textSize(14);
    text('上界（両方の倍数）' + up.length + ' 個：' + up.map((i) => lat.val[i]).join(' '), px, y + 90, 350);
    text('下界（両方の約数）' + lo.length + ' 個：' + lo.map((i) => lat.val[i]).join(' '), px, y + 140, 350);
    text('a・b = ' + a * b + ' = lcm × gcd = ' + lcmOf(a, b) * gcdOf(a, b), px, y + 190);
  } else { fill(175); textSize(15); text('約数を 2 つクリックすると、上界・下界と', px, y); text('上限（水色）・下限（橙）を順序から計算する', px, y + 24); }
  fill(240); textSize(18);
  text('約数の束　n = ' + n + '　「d が e を割り切る」を d ≤ e と読む', 20, 36);
  fill(175); textSize(15);
  text('← → n を変える（' + NS.join(', ') + '）　クリック 2 つ選ぶ　スペース 選択を消す　L 素因数で表示', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() {
  let i = nodeAt(lat, mouseX, mouseY, 24); if (i < 0) return;
  if (sel.length >= 2) sel = []; if (!sel.includes(i)) sel.push(i);
}
function keyPressed() {
  if (key === RIGHT_ARROW) { ni = (ni + 1) % NS.length; rebuild(); }
  if (key === LEFT_ARROW) { ni = (ni + NS.length - 1) % NS.length; rebuild(); }
  if (key === ' ') sel = [];
  if (key === 'l' || key === 'L') { factorLab = !factorLab; rebuild(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let D60 = divisorPoset(60);
  check('60 の約数の束は要素 12 個', D60.n === 12);
  let ok = true;
  for (let n of [12, 60, 72, 210, 360]) { let Q = divisorPoset(n); for (let a = 0; a < Q.n; a++) for (let b = 0; b < Q.n; b++) if (Q.val[joinOf(Q, a, b)] !== lcmOf(Q.val[a], Q.val[b]) || Q.val[meetOf(Q, a, b)] !== gcdOf(Q.val[a], Q.val[b])) ok = false; }
  check('n = 12, 60, 72, 210, 360 のすべての組：順序から求めた上限 = lcm、下限 = gcd', ok);
  ok = true;
  for (let n = 2; n <= 120; n++) { let Q = divisorPoset(n), f = primeFactors(n), cv = f.reduce((s, [p]) => s + divisorsOf(n / p).length, 0);
    if (Q.n !== f.reduce((s, x) => s * (x[1] + 1), 1) || Q.cov.length !== cv) ok = false; }
  check('n = 2〜120：要素の数 = Π(e+1)、被覆の数 = Σ_p τ(n/p)（d → d·p の辺を数える式）', ok);
  ok = true; for (let n of [60, 360, 420]) { let Q = divisorPoset(n); for (let i = 0; i < Q.n; i++) if (Q.rk[i] !== primeFactors(Q.val[i]).reduce((s, x) => s + x[1], 0)) ok = false; }
  check('ランク（下からの最長の鎖）= 素因数の個数（重複こみ）', ok);
  let A = divisorPoset(210), B = powersetPoset(4), lv = (Q) => [0, 1, 2, 3, 4].map((r) => Q.rk.filter((v) => v === r).length).join();
  check('210 = 2·3·5·7 の約数の束と {a,b,c,d} の部分集合の束：要素 16、辺 32、各段 1,4,6,4,1（同じ形）', A.n === 16 && A.cov.length === 32 && B.cov.length === 32 && lv(A) === '1,4,6,4,1' && lv(B) === lv(A));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. n = 30 と 210 はどんな形？ 素因数が 3 個なら立方体、4 個なら 4 次元の立方体
// 2. n = 36 = 2²·3² は 3 × 3 のます目。n = 72 は？ 形と素因数の指数の関係は？
// 3. 2 つ選んで、上界（両方の倍数）の中のいちばん下 = lcm、下界の中のいちばん上 = gcd を確かめよう
// 4. a・b = lcm × gcd はいつでも成り立つ？ いくつかの組で確かめよう
// 5. NS に 64 や 105 を足してみよう。64 の約数の束はどんな形？


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
