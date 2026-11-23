// ============================================
// 09 束の不動点定理（クナスター-タルスキ）─ 単調な写像には必ず不動点があり、不動点全体も束になる
// 有限の束 L の単調写像 f（x ≤ y なら f(x) ≤ f(y)）は、⊥ から f をくり返すと最小不動点、⊤ からくり返すと最大不動点に着く（クリーネの反復）
// 不動点 f(x) = x を全部さがし、それだけで作った順序（右の小さな図）も束になることを確かめる。単調でないと不動点がないことも
// ← → 束を変える（部分集合・4 × 4 の格子・60 の約数）/ G ランダムな単調写像 / 1 到達集合の例（部分集合のみ）/ N 単調でない写像
// スペース 反復を 1 歩 / A 自動で進める / R 反復をやり直す
// ============================================

const KINDS = ['部分集合 {a,b,c,d}', '4 × 4 の格子', '60 の約数'];
let ki = 0, latL, fmap = [], mono = true, it = null, auto = true, sd = 9, fpL = null, fps = [];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); build(); randomMap(); }

function latticeOf(k) {
  if (k === 0) return tables(powersetPoset(4));
  if (k === 1) { let lat = makePoset(16, (i, j) => (i & 3) <= (j & 3) && i >> 2 <= j >> 2, [...Array(16).keys()].map((i) => '' + (i & 3) + (i >> 2))); lat.hint = (i) => (i & 3) - (i >> 2); return tables(lat); }
  return tables(divisorPoset(60));
}
function build() { latL = latticeOf(ki); layoutHasse(latL, 90, 170, width * 0.52 - 90, height - 300, true); }
// ランダムな単調写像：ランクの低い順に、f(x) ≥ （x のすぐ下の元の像の上限）となる元をランダムに選ぶ
function randomMonotone(lat, rng) {
  let f = new Array(lat.n).fill(-1), ord = allOf(lat).sort((a, b) => lat.rk[a] - lat.rk[b]);
  for (let x of ord) { let lb = botOf(lat); for (let [a, b] of lat.cov) if (b === x) lb = lat.J[lb][f[a]]; let up = allOf(lat).filter((y) => lat.R[lb][y]); f[x] = up[Math.floor(rng() * up.length * 0.7)]; }
  return f;
}
function antiMap(lat, k) {               // 順序を逆にする写像（単調でない）：補集合、(3 − x, 3 − y)、d → 60/d
  return allOf(lat).map((i) => (k === 0 ? 15 ^ i : k === 1 ? 15 - i : lat.val.indexOf(60 / lat.val[i])));
}
function reachMap() {                  // 到達集合：f(X) = {a} ∪ （X から 1 歩で行ける所）。a→b, b→a, c→d, d→c
  let nx = [2, 1, 8, 4]; return [...Array(16).keys()].map((X) => [0, 1, 2, 3].reduce((m, t) => (X >> t & 1 ? m | nx[t] : m), 1));
}
function isMonotone(lat, f) { for (let [a, b] of lat.cov) if (!lat.R[f[a]][f[b]]) return false; return true; }   // 被覆で確かめれば十分
function kleene(lat, f, start) { let ch = [start]; for (let k = 0; k <= lat.n; k++) { let x = ch[ch.length - 1], y = f[x]; if (y === x) break; ch.push(y); } return ch; }
function fixedPoints(lat, f) { return allOf(lat).filter((x) => f[x] === x); }
function subPoset(lat, S) { let Q = makePoset(S.length, (i, j) => lat.R[S[i]][S[j]] === 1, S.map((i) => lat.lab[i])); Q.src = S; return Q; }
function setMap(f) {
  fmap = f; mono = isMonotone(latL, fmap); fps = fixedPoints(latL, fmap); it = { up: [botOf(latL)], dn: [topOf(latL)], t: 0 };
  fpL = fps.length ? subPoset(latL, fps) : null; if (fpL) layoutHasse(fpL, width * 0.6, height - 250, width * 0.32, 160);
}
function randomMap() { seedRng(sd++); setMap(randomMonotone(latL, rnd)); }

function draw() {
  background(18, 20, 44);
  if (auto && frameCount % 40 === 0) stepIt();
  let up = it.up, dn = it.dn;
  // ---- 写像の矢印 x → f(x)（うすく）
  for (let x = 0; x < latL.n; x++) { let y = fmap[x], p = latL.pos[x], q = latL.pos[y]; if (x === y) continue; stroke(255, 255, 255, 40); strokeWeight(1); line(p[0], p[1], q[0] + (p[0] - q[0]) * 0.12, q[1] + (p[1] - q[1]) * 0.12); }
  // ---- 反復の道すじ（⊥ から = 水色、⊤ から = 橙）
  strokeWeight(5);
  for (let k = 1; k < up.length; k++) { stroke(90, 225, 215, 200); line(...latL.pos[up[k - 1]], ...latL.pos[up[k]]); }
  for (let k = 1; k < dn.length; k++) { stroke(255, 190, 90, 200); line(...latL.pos[dn[k - 1]], ...latL.pos[dn[k]]); }
  drawHasse(latL, { rad: 17, fs: 12, col: (i) => (i === up[up.length - 1] ? [90, 225, 215] : i === dn[dn.length - 1] ? [255, 190, 90] : fps.includes(i) ? [255, 120, 170] : [150, 160, 205]) });
  for (let x of fps) { noFill(); stroke(255, 120, 170); strokeWeight(2); circle(...latL.pos[x], 46); }
  // ---- 右のパネル
  let px = width * 0.57, y = 160, nm = (i) => latL.lab[i];
  noStroke(); fill(mono ? [140, 225, 180] : [255, 130, 140]); textSize(17); text('f は単調？ ' + (mono ? '✓ はい' : '✗ いいえ（x ≤ y なのに f(x) ≰ f(y) の組がある）'), px, y);
  fill(90, 225, 215); textSize(16); text('⊥ から：' + up.map(nm).join(' → ') + (fmap[up[up.length - 1]] === up[up.length - 1] ? '　＝ 最小不動点' : ' …'), px, y + 36, width - px - 20);
  fill(255, 190, 90); text('⊤ から：' + dn.map(nm).join(' → ') + (fmap[dn[dn.length - 1]] === dn[dn.length - 1] ? '　＝ 最大不動点' : ' …'), px, y + 90, width - px - 20);
  fill(255, 120, 170); text('不動点 f(x) = x：' + (fps.length ? fps.length + ' 個 ' + fps.map(nm).join(', ') : 'ない'), px, y + 146, width - px - 20);
  fill(200); textSize(15);
  if (fpL) { text('不動点だけの順序は束？ ' + (isLattice(fpL) ? '✓ はい（クナスター-タルスキ）' : '✗'), px, y + 196);
    let ex = null; for (let i = 0; i < fpL.n && !ex; i++) for (let j = 0; j < fpL.n; j++) { let a = fpL.src[joinOf(fpL, i, j)], b = latL.J[fpL.src[i]][fpL.src[j]]; if (a !== b) { ex = [i, j, a, b]; break; } }
    if (ex) text('注意：不動点の束の上限 ' + fpL.lab[ex[0]] + ' ∨ ' + fpL.lab[ex[1]] + ' = ' + nm(ex[2]) + '（L での上限 ' + nm(ex[3]) + ' は不動点でない）', px, y + 220, width - px - 20);
    drawHasse(fpL, { rad: 13, fs: 10, col: () => [255, 120, 170] }); }
  else if (!mono) text('単調でない写像には不動点がないこともある（順序を逆にする写像）', px, y + 196);
  fill(240); textSize(18); text('束の不動点定理　' + KINDS[ki] + '　うすい線 = x → f(x)、ピンクの輪 = 不動点', 20, 36);
  fill(175); textSize(15); text('← → 束　G ランダムな単調写像　1 到達集合の例　N 単調でない写像　スペース 1 歩　A 自動 ' + (auto ? 'ON' : 'OFF') + '　R やり直し', 20, 62);
  drawSelfTest(width - 180, height - 12);
}
function stepIt() {
  let u = it.up[it.up.length - 1], d = it.dn[it.dn.length - 1];
  if (fmap[u] !== u && it.up.length <= latL.n) it.up.push(fmap[u]);
  if (fmap[d] !== d && it.dn.length <= latL.n) it.dn.push(fmap[d]);
}

function keyPressed() {
  if (key === RIGHT_ARROW || key === LEFT_ARROW) { ki = (ki + (key === RIGHT_ARROW ? 1 : 2)) % 3; build(); randomMap(); }
  if (key === 'g' || key === 'G') randomMap();
  if (key === '1') { ki = 0; build(); setMap(reachMap()); }
  if (key === 'n' || key === 'N') setMap(antiMap(latL, ki));
  if (key === ' ') stepIt();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') it = { up: [botOf(latL)], dn: [topOf(latL)] };
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let ok = { lfp: true, gfp: true, lat: true, tarski: true, mono: true };
  seedRng(90);
  for (let t = 0; t < 60; t++) {
    let lat = latticeOf(t % 3), f = randomMonotone(lat, rnd), F = fixedPoints(lat, f);
    if (!isMonotone(lat, f)) ok.mono = false;
    let lo = kleene(lat, f, botOf(lat)).pop(), hi = kleene(lat, f, topOf(lat)).pop();
    if (f[lo] !== lo || !F.every((x) => lat.R[lo][x])) ok.lfp = false;
    if (f[hi] !== hi || !F.every((x) => lat.R[x][hi])) ok.gfp = false;
    if (!F.length || !isLattice(subPoset(lat, F))) ok.lat = false;
    let pre = allOf(lat).filter((x) => lat.R[f[x]][x]), m = topOf(lat); for (let x of pre) m = lat.M[m][x];   // タルスキの式：最小不動点 = ∧{x | f(x) ≤ x}
    if (m !== lo) ok.tarski = false;
  }
  check('ランダムな単調写像 60 個（3 種類の束）：作り方どおり単調', ok.mono);
  check('⊥ から f をくり返すと不動点に着き、それはどの不動点よりも下（最小不動点）', ok.lfp);
  check('⊤ からくり返すと最大不動点', ok.gfp);
  check('不動点の集合は空でなく、それだけの順序でも束（クナスター-タルスキ）', ok.lat);
  check('最小不動点 = ∧{x | f(x) ≤ x}（タルスキの式）', ok.tarski);
  let ns = [0, 1, 2].every((k) => { let lat = latticeOf(k), f = antiMap(lat, k); return !isMonotone(lat, f) && fixedPoints(lat, f).length === 0; });
  check('順序を逆にする写像（補集合、(3−x, 3−y)、d → 60/d）は単調でなく、不動点がない', ns);
  let P0 = latticeOf(0), rf = reachMap();
  check('到達集合の例：最小不動点 = {a, b}（a から行ける所）、不動点は {a,b} と {a,b,c,d}', kleene(P0, rf, 0).pop() === 3 && fixedPoints(P0, rf).join() === '3,15');
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. G を何回か押す。水色（⊥ から）と橙（⊤ から）の道はいつも不動点で止まる？ 何歩かかる？
// 2. 不動点が 1 つだけの写像、たくさんある写像を見つけよう。右の小さな図はいつも束？
// 3. N で順序を逆にする写像。反復はどうなる？（ぐるぐる回って止まらない）
// 4. 1 の到達集合：プログラムの「どこまで行けるか」も最小不動点（10 のデータフロー解析）
// 5. 「注意」が出たら、不動点の束の上限と、もとの束の上限がちがう例。なぜ？


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
