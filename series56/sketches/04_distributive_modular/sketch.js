// ============================================
// 04 分配束とモジュラー束 ─ すべての 3 つ組で法則を調べ、N5 と M3 をさがす
// 分配律：x ∧ (y ∨ z) = (x ∧ y) ∨ (x ∧ z)。モジュラー律：x ≤ z なら x ∨ (y ∧ z) = (x ∨ y) ∧ z
// デデキントの定理「N5 を部分束に含まない ⇔ モジュラー」、バーコフの定理「N5 も M3 も含まない ⇔ 分配」を確かめる
// ← → 束を変える / G ランダムな束（部分集合の族を ∩ で閉じたもの）/ 最後の「マウスで作る束」は下の部分集合をクリックで出し入れ / スペース 破れる 3 つ組を順に表示 / N N5 を表示 / M M3 を表示
// ============================================

let li = 0, lat, res, show = 'triple', ti = 0, randSeed = 7;
const NAMES = ['60 の約数', '部分集合 {a,b,c}', '𝔽₂³ の部分空間', 'N5', 'M3', 'ランダムな束（G）', 'マウスで作る束'];
let myGens = new Set([1, 3, 4]);       // ★ マウスで作る束のはじめの集合 {a}, {a,b}, {c}（∩ で閉じると N5 の形）

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); rebuild(); }

function smallLattice(kind) {          // N5 と M3（被覆から）
  return kind === 'N5' ? fromCovers(['0', 'a', 'b', 'c', '1'], [[0, 1], [1, 2], [2, 4], [0, 3], [3, 4]]) : fromCovers(['0', 'x', 'y', 'z', '1'], [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4]]);
}
function subspaceLattice() {           // 𝔽₂³ の 8 つのベクトルの集合（ビットマスク）のうち、0 を含み XOR で閉じたもの = 部分空間
  let sp = [];
  for (let m = 1; m < 256; m += 2) { let ok = true; for (let u = 0; u < 8 && ok; u++) for (let v = 0; v < 8 && ok; v++) if (m >> u & 1 && m >> v & 1 && !(m >> (u ^ v) & 1)) ok = false; if (ok) sp.push(m); }
  sp.sort((a, b) => popc(a) - popc(b));
  let lab = sp.map((m) => { let k = popc(m); if (k === 1) return '0'; if (k === 8) return '𝔽³'; let v = [...Array(8).keys()].filter((u) => u && m >> u & 1); return k === 2 ? v[0].toString(2).padStart(3, '0') : '⟨' + v.join('') + '⟩'; });
  return makePoset(sp.length, (i, j) => (sp[i] & sp[j]) === sp[i], lab);
}
function closureLattice(sd, gens) {    // {a,b,c,d} の部分集合をいくつか選び（gens、なければランダム）、共通部分 ∩ で閉じる（全体も入れる）→ いつも束
  let fam = new Set([15]);
  if (gens) gens.forEach((m) => fam.add(m)); else { seedRng(sd); let k = 3 + Math.floor(rnd() * 5); for (let t = 0; t < k; t++) fam.add(Math.floor(rnd() * 15)); }
  let grow = true; while (grow) { grow = false; for (let a of [...fam]) for (let b of [...fam]) if (!fam.has(a & b)) { fam.add(a & b); grow = true; } }
  let F = [...fam].sort((a, b) => popc(a) - popc(b) || a - b);
  return makePoset(F.length, (i, j) => (F[i] & F[j]) === F[i], F.map((m) => setName(m, 4)));
}
function latticeOf(k, sd) { return k === 0 ? divisorPoset(60) : k === 1 ? powersetPoset(3) : k === 2 ? subspaceLattice() : k === 3 ? smallLattice('N5') : k === 4 ? smallLattice('M3') : k === 5 ? closureLattice(sd) : closureLattice(0, myGens); }
// すべての 3 つ組で調べる ＋ N5・M3 の部分束をさがす
function analyze(lat) {
  tables(lat); let n = lat.n, J = lat.J, M = lat.M, r = { dist: [], mod: [], n5: null, m3: null };
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
    if (M[x][J[y][z]] !== J[M[x][y]][M[x][z]]) r.dist.push([x, y, z]);
    if (lat.R[x][z] && J[x][M[y][z]] !== M[J[x][y]][z]) r.mod.push([x, y, z]);
  }
  for (let a = 0; a < n && !r.n5; a++) for (let b = 0; b < n && !r.n5; b++) if (a !== b && lat.R[a][b])   // a < b と c で a∨c = b∨c、a∧c = b∧c
    for (let c = 0; c < n; c++) if (J[a][c] === J[b][c] && M[a][c] === M[b][c]) { r.n5 = [M[a][c], a, b, c, J[a][c]]; break; }
  for (let x = 0; x < n && !r.m3; x++) for (let y = x + 1; y < n && !r.m3; y++) for (let z = y + 1; z < n; z++)                  // 3 つの上限も下限も全部同じ
    if (J[x][y] === J[y][z] && J[x][y] === J[x][z] && M[x][y] === M[y][z] && M[x][y] === M[x][z]) { r.m3 = [M[x][y], x, y, z, J[x][y]]; break; }
  return r;
}
function rebuild() { lat = latticeOf(li, randSeed); res = analyze(lat); ti = 0; layoutHasse(lat, 110, 170, width * 0.52 - 110, height - 290, li <= 1); }

function draw() {
  background(18, 20, 44);
  let hl = [], hc = [255, 110, 130], fails = res.dist.length ? res.dist : [];
  if (show === 'triple' && fails.length) hl = fails[ti % fails.length];
  if (show === 'N5' && res.n5) { hl = res.n5; hc = [255, 190, 90]; }
  if (show === 'M3' && res.m3) { hl = res.m3; hc = [90, 225, 215]; }
  let inHl = (a) => hl.includes(a) && show !== 'triple';
  drawHasse(lat, { rad: 20, fs: lat.n > 12 ? 10 : 13, col: (i) => (hl.includes(i) ? (show === 'triple' ? [[255, 255, 255], [255, 150, 160], [255, 200, 120]][hl.indexOf(i)] : hc) : [150, 160, 205]),
    ecol: (a, b) => (inHl(a) && inHl(b) ? hc : null) });
  // ---- 右のパネル
  let px = width * 0.56, y = 160, yes = (v) => (v ? '✓ はい' : '✗ いいえ'), dist = res.dist.length === 0, mod = res.mod.length === 0;
  noStroke(); fill(230); textSize(18); text(NAMES[li] + '　（要素 ' + lat.n + '、3 つ組 ' + lat.n ** 3 + ' 通りを全部調べた）', px, y);
  textSize(16);
  fill(dist ? [140, 225, 180] : [255, 130, 140]); text('分配束？ ' + yes(dist) + '　分配律が破れる 3 つ組 ' + res.dist.length, px, y + 36);
  fill(mod ? [140, 225, 180] : [255, 130, 140]); text('モジュラー束？ ' + yes(mod) + '　モジュラー律が破れる組 ' + res.mod.length, px, y + 64);
  fill(255, 190, 90); text('N5 の部分束：' + (res.n5 ? res.n5.map((i) => lat.lab[i]).join(', ') : 'ない'), px, y + 100);
  fill(90, 225, 215); text('M3 の部分束：' + (res.m3 ? res.m3.map((i) => lat.lab[i]).join(', ') : 'ない'), px, y + 126);
  fill(200); textSize(15);
  text((mod === !res.n5 ? '✓' : '✗') + ' デデキント：モジュラー ⇔ N5 を含まない', px, y + 164);
  text((dist === (!res.n5 && !res.m3) ? '✓' : '✗') + ' バーコフ：分配 ⇔ N5 も M3 も含まない', px, y + 188);
  if (show === 'triple' && fails.length) {
    let [x, yy, z] = hl, L = lat.lab, J = lat.J, M = lat.M;
    fill(255); text('破れる 3 つ組 ' + ((ti % fails.length) + 1) + ' / ' + fails.length + '：x = ' + L[x] + '（白）、y = ' + L[yy] + '（赤）、z = ' + L[z] + '（黄）', px, y + 230);
    fill(255, 160, 170); text('x ∧ (y ∨ z) = ' + L[x] + ' ∧ ' + L[J[yy][z]] + ' = ' + L[M[x][J[yy][z]]], px, y + 258);
    text('(x ∧ y) ∨ (x ∧ z) = ' + L[M[x][yy]] + ' ∨ ' + L[M[x][z]] + ' = ' + L[J[M[x][yy]][M[x][z]]] + '　← ちがう', px, y + 282);
  } else if (show === 'triple') { fill(140, 225, 180); text('分配律はすべての 3 つ組で成り立つ', px, y + 230); }
  fill(150, 156, 190); textSize(13);
  text('N5 = 0 < a < b < 1 と 0 < c < 1。M3 = 0 < x, y, z < 1。部分束 = ∨ と ∧ で閉じた部分（ただの部分順序ではない）', px, y + 330, width - px - 20);
  if (li === 6) {                      // マウスで作る束：下の 14 個の部分集合をクリックで出し入れ（全体と ∩ は自動で足す）
    textSize(14); textAlign(CENTER, CENTER);
    for (let m = 1; m < 15; m++) { let x = 20 + (m - 1) * 62, on = myGens.has(m); stroke(on ? [90, 225, 215] : [80, 88, 140]); fill(on ? [40, 90, 100] : [30, 34, 70]); rect(x, height - 70, 56, 30, 6); noStroke(); fill(on ? 255 : 170); text(setName(m, 4), x + 28, height - 55); }
    textAlign(LEFT, BASELINE); fill(175); text('クリックで集合を出し入れ → ∩ で閉じて全体 abcd を足すと、いつも束になる', 20, height - 80);
  }
  fill(240); textSize(18); text('分配束とモジュラー束　' + (li + 1) + ' / ' + NAMES.length + '：' + NAMES[li], 20, 36);
  fill(175); textSize(15); text('← → 束を変える　G ランダムな束　スペース 次の破れる 3 つ組　N N5 を表示　M M3 を表示　（7 番目はマウスで作る）', 20, 62);
  drawSelfTest(width - 180, height - 12);
}

function mousePressed() {
  if (li !== 6 || mouseY < height - 70 || mouseY > height - 40) return;
  let m = Math.floor((mouseX - 20) / 62) + 1; if (m < 1 || m > 14 || mouseX - 20 - (m - 1) * 62 > 56) return;
  if (myGens.has(m)) myGens.delete(m); else myGens.add(m); rebuild();
}
function keyPressed() {
  if (key === RIGHT_ARROW) { li = (li + 1) % NAMES.length; rebuild(); }
  if (key === LEFT_ARROW) { li = (li + NAMES.length - 1) % NAMES.length; rebuild(); }
  if (key === 'g' || key === 'G') { li = 5; randSeed++; rebuild(); }
  if (key === ' ') { show = 'triple'; ti++; }
  if (key === 'n' || key === 'N') show = 'N5';
  if (key === 'm' || key === 'M') show = 'M3';
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let n5 = analyze(smallLattice('N5')), m3 = analyze(smallLattice('M3'));
  check('N5：モジュラー？ いいえ、分配？ いいえ', n5.mod.length > 0 && n5.dist.length > 0);
  check('M3：分配？ いいえ、でもモジュラー？ はい', m3.dist.length > 0 && m3.mod.length === 0);
  let d60 = analyze(divisorPoset(60)), b3 = analyze(powersetPoset(3));
  check('60 の約数の束と部分集合の束は分配束（N5 も M3 もない）', d60.dist.length === 0 && b3.dist.length === 0 && !d60.n5 && !d60.m3 && !b3.m3);
  let Vs = subspaceLattice(), vr = analyze(Vs);
  check('𝔽₂³ の部分空間は 1 + 7 + 7 + 1 = 16 個、モジュラーだが分配ではない（M3 を含む）', Vs.n === 16 && Vs.rk.filter((r) => r === 1).length === 7 && vr.mod.length === 0 && vr.dist.length > 0 && vr.m3);
  let okD = true, okB = true, cnt = { n5: 0, m3: 0, dist: 0 };
  for (let sd = 1; sd <= 60; sd++) {
    let L = closureLattice(sd * 13), r = analyze(L), mod = r.mod.length === 0, dist = r.dist.length === 0;
    if (!isLattice(L)) okD = false;
    if (mod !== !r.n5) okD = false; if (dist !== (!r.n5 && !r.m3)) okB = false; if (dist && !mod) okB = false;
    if (r.n5) cnt.n5++; if (r.m3) cnt.m3++; if (dist) cnt.dist++;
  }
  let my = closureLattice(0, new Set([1, 3, 4])), myr = analyze(my);
  check('マウスで作る束のはじめ {a}, {a,b}, {c} を ∩ で閉じると 5 個の N5（モジュラーでない）', my.n === 5 && isLattice(my) && myr.mod.length > 0 && myr.n5);
  check('ランダムな束 60 個：モジュラー ⇔ N5 なし（デデキント）', okD && cnt.n5 > 0);
  check('ランダムな束 60 個：分配 ⇔ N5 も M3 もなし（バーコフ）、分配ならモジュラー（分配 ' + cnt.dist + '、N5 あり ' + cnt.n5 + '、M3 あり ' + cnt.m3 + '）', okB && cnt.dist > 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. N5 でスペースを押して、分配律が破れる 3 つ組を手で計算しよう（x ∧ (y ∨ z) と (x ∧ y) ∨ (x ∧ z)）
// 2. M3 はモジュラーなのに分配ではない。どの 3 つ組で破れる？
// 3. 𝔽₂³ の部分空間（原点を通る直線と平面）の束で M を押す。どの 3 本の直線が M3 を作る？
// 4. G を何回か押す。N5 を含む束と含まない束はどんな形？
// 5. 約数の束はいつも分配束。なぜ？（gcd と lcm は「指数の min と max」）


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
