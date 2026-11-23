// ============================================
// 02 部分集合の束 ─ {a, b, c, d} の部分集合 16 個を「含まれる ⊆」で並べる（4 次元の立方体）
// 上限 = 和集合 X ∪ Y、下限 = 共通部分 X ∩ Y。ビット列で書くと ∪ は OR、∩ は AND（1 ビットずつ）
// 各段の個数は二項係数 C(k, r)、ハッセ図の辺は k·2^(k−1) 本（1 要素ずつ足す）
// ↑↓ 要素の数 k（2〜5）/ 部分集合を 2 つクリック → 和集合・共通部分 / B 集合 ⇔ ビット列 / スペース 選択を消す
// ============================================

let kSet = 4, lat, sel = [], bitLab = false;   // ★ はじめの要素の数

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function bitsOf(m, k) { let s = ''; for (let t = k - 1; t >= 0; t--) s += m >> t & 1; return s; }   // d c b a の順
function rebuild() {
  lat = powersetPoset(kSet); sel = [];
  if (bitLab) lat.lab = lat.val.map((m) => bitsOf(m, kSet));
  layoutHasse(lat, 100, 170, width - 500, height - 290, kSet <= 4);
}
function binom(n, r) { let c = 1; for (let i = 1; i <= r; i++) c = (c * (n - r + i)) / i; return Math.round(c); }

function draw() {
  background(18, 20, 44);
  let two = sel.length === 2, jn = two ? joinOf(lat, sel[0], sel[1]) : -1, mt = two ? meetOf(lat, sel[0], sel[1]) : -1;
  let hov = nodeAt(lat, mouseX, mouseY, 18);
  drawHasse(lat, { rad: kSet === 5 ? 15 : 19, fs: kSet === 5 ? 10 : 12,
    col: (i) => (i === jn ? [90, 225, 215] : i === mt ? [255, 190, 90] : sel.includes(i) ? [255, 255, 255] : hov >= 0 && (i & lat.val[hov]) === i ? [190, 175, 240] : [150, 160, 205]),
    ecol: (a, b) => (hov >= 0 && (b & lat.val[hov]) === b ? [170, 150, 240] : null) });
  // ---- 右のパネル
  let px = width - 370, y = 160;
  noStroke(); fill(230); textSize(16); text('集合 {' + 'abcde'.slice(0, kSet).split('').join(', ') + '}　部分集合 2^' + kSet + ' = ' + lat.n + ' 個', px, y);
  fill(175); textSize(14);
  text('ハッセ図の辺 ' + lat.cov.length + ' 本（式 k·2^(k−1) = ' + kSet * 2 ** (kSet - 1) + '）', px, y + 28);
  let lv = []; for (let r = 0; r <= kSet; r++) lv.push(lat.rk.filter((v) => v === r).length);
  text('各段の個数 ' + lv.join(', ') + '（二項係数 C(' + kSet + ', r)）', px, y + 52);
  text('ビット列：右から a, b, c, …（1 = 入っている）', px, y + 76);
  y += 130;
  if (two) {
    let X = lat.val[sel[0]], Y = lat.val[sel[1]];
    fill(255); textSize(16); text('X = ' + setName(X, kSet) + '（' + bitsOf(X, kSet) + '）', px, y); text('Y = ' + setName(Y, kSet) + '（' + bitsOf(Y, kSet) + '）', px, y + 26);
    fill(90, 225, 215); text('上限 X ∨ Y = ' + lat.lab[jn] + '　X ∪ Y = ' + setName(X | Y, kSet) + (lat.val[jn] === (X | Y) ? ' ✓' : ' ✗'), px, y + 60);
    text('　ビットの OR：' + bitsOf(X, kSet) + ' | ' + bitsOf(Y, kSet) + ' = ' + bitsOf(X | Y, kSet), px, y + 84);
    fill(255, 190, 90); text('下限 X ∧ Y = ' + lat.lab[mt] + '　X ∩ Y = ' + setName(X & Y, kSet) + (lat.val[mt] === (X & Y) ? ' ✓' : ' ✗'), px, y + 116);
    text('　ビットの AND：' + bitsOf(X, kSet) + ' & ' + bitsOf(Y, kSet) + ' = ' + bitsOf(X & Y, kSet), px, y + 140);
    fill(175); textSize(14); text('|X ∪ Y| + |X ∩ Y| = |X| + |Y|：' + (popc(X | Y) + popc(X & Y)) + ' = ' + (popc(X) + popc(Y)), px, y + 174);
  } else { fill(175); textSize(15); text('2 つクリック → 和集合（水色）と共通部分（橙）', px, y); text('マウスをのせる → その部分集合の部分集合（紫）', px, y + 24); }
  fill(240); textSize(18);
  text('部分集合の束　k = ' + kSet + '　X ≤ Y ⇔ X ⊆ Y（X が Y に含まれる）　' + (kSet === 4 ? '4 次元の立方体' : kSet + ' 次元の立方体'), 20, 36);
  fill(175); textSize(15);
  text('↑↓ 要素の数 k（2〜5）　クリック 2 つ選ぶ　B ' + (bitLab ? 'ビット列' : '集合') + ' 表示　スペース 選択を消す', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() {
  let i = nodeAt(lat, mouseX, mouseY, 22); if (i < 0) return;
  if (sel.length >= 2) sel = []; if (!sel.includes(i)) sel.push(i);
}
function keyPressed() {
  if (key === UP_ARROW && kSet < 5) { kSet++; rebuild(); }
  if (key === DOWN_ARROW && kSet > 2) { kSet--; rebuild(); }
  if (key === 'b' || key === 'B') { bitLab = !bitLab; rebuild(); }
  if (key === ' ') sel = [];
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let Q4 = powersetPoset(4);
  check('要素 4 個の部分集合の束：部分集合 16 個、被覆の辺 32 本', Q4.n === 16 && Q4.cov.length === 32);
  let ok = true;
  for (let k = 1; k <= 5; k++) { let Q = powersetPoset(k); if (Q.cov.length !== k * 2 ** (k - 1)) ok = false; for (let r = 0; r <= k; r++) if (Q.rk.filter((v) => v === r).length !== binom(k, r)) ok = false; }
  check('k = 1〜5：辺の数 = k·2^(k−1)、ランク r の段の個数 = C(k, r)', ok);
  ok = true; for (let k of [3, 4, 5]) { let Q = powersetPoset(k); for (let a = 0; a < Q.n; a++) for (let b = 0; b < Q.n; b++) if (joinOf(Q, a, b) !== (a | b) || meetOf(Q, a, b) !== (a & b)) ok = false; }
  check('k = 3, 4, 5 のすべての組：順序から求めた上限 = OR（和集合）、下限 = AND（共通部分）', ok);
  ok = Q4.cov.every(([a, b]) => popc(b) === popc(a) + 1 && (a & b) === a);
  check('被覆 X ⋖ Y ⇔ Y は X に 1 要素だけ足したもの', ok);
  check('⊥ = ∅、⊤ = 全体、束である', botOf(Q4) === 0 && topOf(Q4) === 15 && isLattice(Q4));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. k = 2 は正方形、k = 3 は立方体。k = 4 の図のどこに立方体が 2 つ見える？（d が入っている・いない）
// 2. 2 つ選んで、ビット列の OR と AND が和集合と共通部分になることを確かめよう
// 3. マウスをのせると、その部分集合の部分集合（下にある全部）が紫になる。いくつある？（2^|X|）
// 4. 01 の n = 210 と見比べよう。どの素数がどの要素に対応する？
// 5. 真ん中の段がいちばん多いのはなぜ？（12 のスペルナーの定理につながる）


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
