// ============================================
// 13 メビウス関数と反転公式 ─ 区間 [x, y] ごとの数 μ(x, y) を再帰で計算する
// μ(x, x) = 1、x < y なら μ(x, y) = −Σ_{x ≤ z < y} μ(x, z)。約数の束では μ(1, n) が数論のメビウス関数、部分集合の束では (−1)^|Y − X|（包除原理）
// 反転公式：f(y) = Σ_{x ≤ y} g(x) なら g(y) = Σ_{x ≤ y} μ(x, y) f(x)。g を f から復元してみる
// ← → 半順序を変える / ↑↓ 約数の束の n / 要素をクリック → その x から見た μ(x, y) / スペース g を新しく / F 約数の束で g = オイラーの φ
// ============================================

const DIV_NS = [12, 30, 36, 60, 72, 210, 360];   // ★
const KINDS = ['約数の束', '部分集合 {a,b,c,d}', 'N5', 'M3', 'ランダムな半順序'];
let ki = 0, di = 3, lat, MU, x0 = 0, gv = [], phiMode = true;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function posetOf(k) {
  if (k === 0) return divisorPoset(DIV_NS[di]);
  if (k === 1) return powersetPoset(4);
  if (k === 2) return fromCovers(['0', 'a', 'b', 'c', '1'], [[0, 1], [1, 2], [2, 4], [0, 3], [3, 4]]);
  if (k === 3) return fromCovers(['0', 'x', 'y', 'z', '1'], [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4]]);
  seedRng(13); let Q = randomPoset(12, 0.25); Q.lab = Q.lab.map((s, i) => 'abcdefghijkl'[i]); return Q;
}
function mobius(lat) {                   // μ(x, ·) を x ごとに、y をランクの低い順に計算
  let ord = allOf(lat).sort((a, b) => lat.rk[a] - lat.rk[b]), M = [];
  for (let x = 0; x < lat.n; x++) {
    let m = new Array(lat.n).fill(0); m[x] = 1;
    for (let y of ord) if (y !== x && lat.R[x][y]) { let s = 0; for (let z = 0; z < lat.n; z++) if (z !== y && lat.R[x][z] && lat.R[z][y]) s += m[z]; m[y] = -s; }
    M.push(m);
  }
  return M;
}
function muNT(n) { let f = primeFactors(n); return f.some((x) => x[1] > 1) ? 0 : f.length % 2 ? -1 : 1; }   // 数論のメビウス関数
function phi(n) { return primeFactors(n).reduce((r, [p, e]) => r * (p - 1) * p ** (e - 1), 1); }       // オイラーの φ
function sumBelow(lat, g) { return allOf(lat).map((y) => allOf(lat).reduce((s, x) => s + (lat.R[x][y] ? g[x] : 0), 0)); }        // f(y) = Σ_{x ≤ y} g(x)
function invert(lat, M, f) { return allOf(lat).map((y) => allOf(lat).reduce((s, x) => s + (lat.R[x][y] ? M[x][y] * f[x] : 0), 0)); }  // g(y) = Σ μ(x, y) f(x)
function newG() { gv = ki === 0 && phiMode ? lat.val.map(phi) : allOf(lat).map(() => Math.floor(rnd() * 9) - 2); }
function rebuild() { lat = posetOf(ki); MU = mobius(lat); x0 = Math.max(0, botOf(lat)); layoutHasse(lat, 90, 180, width * 0.55 - 90, height - 300, ki <= 1); newG(); }

function draw() {
  background(18, 20, 44);
  let m = MU[x0];
  drawHasse(lat, { rad: 20, fs: 12, col: (i) => (i === x0 ? [255, 255, 255] : !lat.R[x0][i] ? [70, 76, 110] : m[i] > 0 ? [90, 225, 215] : m[i] < 0 ? [255, 130, 150] : [150, 160, 205]) });
  textAlign(CENTER, BASELINE); textSize(15);
  for (let i = 0; i < lat.n; i++) if (lat.R[x0][i]) { fill(m[i] > 0 ? [90, 225, 215] : m[i] < 0 ? [255, 150, 160] : [190]); noStroke(); text('μ=' + m[i], lat.pos[i][0], lat.pos[i][1] - 25); }
  textAlign(LEFT, BASELINE);
  // ---- 右：数論・包除・反転公式
  let px = width * 0.58, y = 160, f = sumBelow(lat, gv), g2 = invert(lat, MU, f);
  noStroke(); fill(230); textSize(17); text(KINDS[ki] + (ki === 0 ? ' n = ' + DIV_NS[di] : '') + '　x = ' + lat.lab[x0] + ' から見た μ(x, y)', px, y);
  textSize(15); fill(200);
  if (ki === 0) { let ok = lat.val.every((d) => MU[0][lat.val.indexOf(d)] === muNT(d));
    text('μ(1, d) = 数論のメビウス関数 μ(d)：' + (ok ? '✓ すべての約数で一致' : '✗'), px, y + 30);
    text('μ(d) = 0（平方因子あり）、(−1)^k（k 個のちがう素数の積）', px, y + 54); }
  if (ki === 1) { text('μ(X, Y) = (−1)^|Y − X|：' + (allOf(lat).every((a) => allOf(lat).every((b) => !lat.R[a][b] || MU[a][b] === (popc(b & ~a) % 2 ? -1 : 1))) ? '✓' : '✗') + '　→ 反転公式 = 包除原理', px, y + 30);
    text('|A∪B∪C| = |A|+|B|+|C| − |A∩B| − … + |A∩B∩C| の符号', px, y + 54); }
  if (ki >= 2) text('μ(⊥, ⊤) = ' + (botOf(lat) >= 0 && topOf(lat) >= 0 ? MU[botOf(lat)][topOf(lat)] : '—（⊥ か ⊤ がない）') + '　' + (ki === 3 ? '（M3 では 3 − 1 = 2）' : ''), px, y + 30);
  y += 90; fill(230); textSize(16); text('反転公式：f(y) = Σ_{x≤y} g(x) から g を復元' + (ki === 0 && phiMode ? '（g = φ なので f(n) = n）' : ''), px, y);
  textSize(14); fill(170); text('y', px, y + 28); text('g(y)', px + 90, y + 28); text('f(y)', px + 170, y + 28); text('Σ μ(x,y) f(x)', px + 250, y + 28);
  let rows = Math.min(lat.n, Math.floor((height - y - 90) / 20));
  for (let k = 0; k < rows; k++) { let ok = g2[k] === gv[k]; fill(220); text(lat.lab[k], px, y + 50 + 20 * k); text(gv[k], px + 90, y + 50 + 20 * k); text(f[k], px + 170, y + 50 + 20 * k); fill(ok ? [140, 225, 180] : [255, 110, 110]); text(g2[k] + (ok ? ' ✓' : ' ✗'), px + 250, y + 50 + 20 * k); }
  if (rows < lat.n) { fill(150); text('…ほか ' + (lat.n - rows) + ' 行（全部 ' + (g2.every((v, k) => v === gv[k]) ? '一致' : '不一致あり') + '）', px, y + 50 + 20 * rows); }
  fill(240); textSize(18); text('メビウス関数と反転公式　' + KINDS[ki] + '　（水色 = 正、赤 = 負、灰 = 0、暗い = x ≤ y でない）', 20, 36);
  fill(175); textSize(15); text('← → 半順序　↑↓ 約数の束の n　クリック x を選ぶ　スペース g を新しく（ランダム）　F 約数の束で g = φ ' + (phiMode ? 'ON' : 'OFF'), 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() { let i = nodeAt(lat, mouseX, mouseY, 24); if (i >= 0) x0 = i; }
function keyPressed() {
  if (key === RIGHT_ARROW) { ki = (ki + 1) % KINDS.length; rebuild(); }
  if (key === LEFT_ARROW) { ki = (ki + KINDS.length - 1) % KINDS.length; rebuild(); }
  if (key === UP_ARROW) { di = Math.min(DIV_NS.length - 1, di + 1); ki = 0; rebuild(); }
  if (key === DOWN_ARROW) { di = Math.max(0, di - 1); ki = 0; rebuild(); }
  if (key === ' ') { phiMode = false; newG(); }
  if (key === 'f' || key === 'F') { phiMode = !phiMode; newG(); }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let ok = true, ok2 = true;
  for (let n = 1; n <= 100; n++) { let D = divisorPoset(n), M = mobius(D); if (M[0][D.n - 1] !== muNT(n)) ok = false; for (let i = 0; i < D.n; i++) if (M[i][D.n - 1] !== muNT(n / D.val[i])) ok2 = false; }
  check('n = 1〜100：約数の束の μ(1, n) = 数論のメビウス関数 μ(n)', ok);
  check('さらに μ(d, n) = μ(n/d)（区間 [d, n] は n/d の約数の束と同じ形）', ok2);
  let B = powersetPoset(4), MB = mobius(B);
  check('部分集合の束：すべての X ⊆ Y で μ(X, Y) = (−1)^|Y − X|', allOf(B).every((a) => allOf(B).every((b) => !B.R[a][b] || MB[a][b] === (popc(b & ~a) % 2 ? -1 : 1))));
  seedRng(1313); let inv = true;
  for (let t = 0; t < 20; t++) { let Q = randomPoset(5 + (t % 10), 0.3), g = allOf(Q).map(() => Math.floor(rnd() * 21) - 10); if (invert(Q, mobius(Q), sumBelow(Q, g)).join() !== g.join()) inv = false; }
  check('ランダムな半順序 20 個：反転公式で f から g がもとどおりに復元できる', inv);
  let D60 = divisorPoset(60), fn = sumBelow(D60, D60.val.map(phi));
  check('Σ_{d|n} φ(d) = n、反転すると φ にもどる（n = 60 の約数すべて）', fn.join() === D60.val.join() && invert(D60, mobius(D60), D60.val).join() === D60.val.map(phi).join());
  let C = fromCovers(['0', '1', '2', '3'], [[0, 1], [1, 2], [2, 3]]), MC = mobius(C), M3 = mobius(posetOf(3));
  check('鎖：μ(i, i+1) = −1、2 つ以上はなれると 0。M3：μ(0, 1) = 2', MC[0].join() === '1,-1,0,0' && MC[1].join() === '0,1,-1,0' && M3[0][4] === 2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 60 の約数で、μ(1, d) が 0 になるのはどの d？（4 = 2² で割り切れるもの）
// 2. 部分集合の束で x = ∅ を選ぶ。μ の符号は要素の数の偶奇で決まる → 包除原理の + − + −
// 3. F で g = φ（n 以下で n と互いに素な数の個数）。f(n) = Σ φ(d) = n になるのはなぜ？
// 4. スペースで g をランダムに。反転公式でいつも復元できることを確かめよう
// 5. M3 の μ(0, 1) = 2、N5 では？ 計算してから画面で確かめよう


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
