// ============================================
// 12 ケーリー-ディクソン構成 ─ 「2 つ組」で数を倍に広げる
// 実数 → 複素数 → 四元数 → 八元数 → 十六元数。どれも (a, b)(c, d) = (ac − d*b, da + bc*) の 1 つの式で作れる
// 段を上がるたびに性質を 1 つずつ失う：大小の順序 → 交換法則 → 結合法則 → 割り算（十六元数には零因子 ab = 0 がある）
// R：ランダムな数を取りかえ / Z：十六元数の零因子さがしをやり直す / ↑↓ 例を見る段 / スペース：さがす速さ
// ============================================

const LEVELS = [[1, '実数 ℝ'], [2, '複素数 ℂ'], [4, '四元数 ℍ'], [8, '八元数 𝕆'], [16, '十六元数 𝕊']];
const N_TRIALS = 30;                   // ★ 性質を調べるランダムな組の数
let stats = [], showLevel = 2, search = null, fast = false;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(12); measure(); startSearch(); }
function measure() {                   // 各段で、ランダムな a, b, c を使って「ずれ」の最大を測る
  stats = LEVELS.map(([n]) => {
    let m = { comm: 0, assoc: 0, alt: 0, nrm: 0 };
    for (let t = 0; t < N_TRIALS; t++) {
      let a = cdRandom(n), b = cdRandom(n), c = cdRandom(n);
      m.comm = Math.max(m.comm, cdMaxAbs(cdSub(cdMul(a, b), cdMul(b, a))));
      m.assoc = Math.max(m.assoc, cdMaxAbs(cdAssoc(a, b, c)));
      m.alt = Math.max(m.alt, cdMaxAbs(cdAssoc(a, a, b)));
      m.nrm = Math.max(m.nrm, Math.abs(cdNorm(cdMul(a, b)) - cdNorm(a) * cdNorm(b)));
    }
    return m;
  });
}
function startSearch() { search = { n: 16, a: 1, b: 2, found: [], tried: 0, done: false }; }
function searchSome(k) {               // (e_a + e_b)(e_c ± e_d) = 0 となる組を少しずつさがす
  for (let rep = 0; rep < k && !search.done; rep++) {
    let { a, b, n } = search, x = cdAdd(cdBasis(n, a), cdBasis(n, b));
    for (let c = 1; c < n; c++) for (let d = c + 1; d < n; d++) for (let s of [1, -1]) {
      search.tried++;
      if (cdMaxAbs(cdMul(x, cdAdd(cdBasis(n, c), cdBasis(n, d, s)))) === 0) search.found.push([a, b, c, d, s]);
    }
    search.b++; if (search.b >= n) { search.a++; search.b = search.a + 1; }
    if (search.a >= n - 1) search.done = true;
  }
}

function draw() {
  background(18, 18, 34);
  searchSome(fast ? 6 : 1);
  // ---- 表
  let x0 = 30, y0 = 140, cw = [190, 120, 150, 150, 150, 170, 180], heads = ['', '大小の順序', '交換 ab = ba', '結合 (ab)c = a(bc)', '交代 (aa)b = a(ab)', 'ノルム |ab| = |a||b|', '割り算（零因子なし）'];
  textSize(15); let x = x0;
  heads.forEach((h, n) => { fill(255, 210, 110); text(h, x, y0); x += cw[n]; });
  LEVELS.forEach(([n, name], r) => {
    let y = y0 + 40 + r * 54, m = stats[r];
    let cells = [[r === 0, r === 0 ? 'あり' : 'なし'], [m.comm < 1e-12, m.comm.toExponential(0)], [m.assoc < 1e-12, m.assoc.toExponential(0)], [m.alt < 1e-12, m.alt.toExponential(0)], [m.nrm < 1e-9, m.nrm.toExponential(0)],
      [r < 4, r < 4 ? 'できる' : search.found.length ? '零因子 ' + search.found.length + ' 組' : 'さがし中…']];
    noStroke(); fill(r === showLevel ? color(40, 50, 90) : color(28, 30, 52)); rect(x0 - 10, y - 26, cw.reduce((s, v) => s + v, 0), 46, 6);
    fill(235); textSize(17); text(name + '（' + n + ' 次元）', x0, y);
    let xx = x0 + cw[0];
    cells.forEach(([ok, v], c) => { fill(ok ? color(130, 230, 150) : color(255, 130, 130)); textSize(17); text(ok ? '✓' : '✗', xx, y); fill(185); textSize(12); text(v, xx + 22, y); xx += cw[c + 1]; });
  });
  // ---- 2 つ組の例
  let tx = 30, ty = y0 + 330, [n] = LEVELS[showLevel], h = n / 2;
  fill(255, 210, 110); textSize(17); text('2 つ組の式：(a, b)(c, d) = (ac − d* b,  d a + b c*)、(a, b)* = (a*, −b)', tx, ty);
  fill(210); textSize(15);
  if (n > 1) {
    let u = cdBasis(n, 1), v = cdBasis(n, h);
    text(LEVELS[showLevel][1] + ' の元 = ' + LEVELS[showLevel - 1][1] + ' の 2 つ組。例：e1 = (e1, 0)、e' + h + ' = (0, 1)', tx, ty + 30);
    text('e1 · e' + h + ' = ' + cdName(cdMul(u, v)) + '　　e' + h + ' · e1 = ' + cdName(cdMul(v, u)), tx, ty + 56);
    text('e' + h + ' · e' + h + ' = ' + cdName(cdMul(v, v)) + '（新しい虚数単位）', tx, ty + 82);
  } else text('実数は 1 つの数。共役 a* = a', tx, ty + 30);
  // ---- 零因子
  let zx = width * 0.62;
  fill(255, 210, 110); textSize(17); text('十六元数の零因子さがし（e_a + e_b)(e_c ± e_d) = 0', zx, ty);
  fill(210); textSize(15); text('調べた組 ' + search.tried + '　見つかった ' + search.found.length + (search.done ? '（全部調べた）' : ''), zx, ty + 30);
  if (search.found.length) {
    let [a, b, c, d, s] = search.found[0], pa = cdAdd(cdBasis(16, a), cdBasis(16, b)), pb = cdAdd(cdBasis(16, c), cdBasis(16, d, s));
    fill(255, 150, 150); text('例：(e' + a + ' + e' + b + ')(e' + c + (s > 0 ? ' + ' : ' − ') + 'e' + d + ') = ' + cdName(cdMul(pa, pb)), zx, ty + 58);
    fill(200); text('|a| = |b| = √2 なのに積は 0 → b で割れない', zx, ty + 82);
  }
  fill(240); textSize(20); textAlign(LEFT, BASELINE);
  text('ケーリー-ディクソン構成　実数 → 複素数 → 四元数 → 八元数 → 十六元数', 20, 36);
  fill(175); textSize(15);
  text('R：ランダムな数を取りかえて測り直す　↑↓ 例を見る段　Z：零因子さがしをやり直す　スペース：さがす速さ', 20, 62);
  text('表の数 = ランダムな ' + N_TRIALS + ' 組でのずれの最大（0 に近ければ ✓）。順序は実数だけ（i > 0 も i < 0 も矛盾する）', 20, 86);
  drawSelfTest(width - 170, height - 12);
}
function cdName(v) {
  let nz = v.map((x, a) => [x, a]).filter((t) => Math.abs(t[0]) > 1e-12);
  if (!nz.length) return '0';
  return nz.map((t, k) => (t[0] < 0 ? '−' : k ? '+' : '') + (Math.abs(t[0]) === 1 && t[1] ? '' : Math.abs(t[0])) + (t[1] ? 'e' + t[1] : '')).join(' ');
}

function keyPressed() {
  if (key === 'r' || key === 'R') measure();
  if (key === 'z' || key === 'Z') startSearch();
  if (key === UP_ARROW) showLevel = Math.max(0, showLevel - 1);
  if (key === DOWN_ARROW) showLevel = Math.min(4, showLevel + 1);
  if (key === ' ') fast = !fast;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(120);
  let e1 = 0, e2 = 0, e3 = 0, sedN = 0, sedAlt = 0, conjE = 0;
  for (let t = 0; t < 100; t++) {
    let a = cdRandom(4), b = cdRandom(4), z = cdRandom(2), w = cdRandom(2);
    e1 = Math.max(e1, cdMaxAbs(cdSub(cdMul(a, b), qMul(a, b))));
    e2 = Math.max(e2, Math.abs(cdMul(z, w)[0] - (z[0] * w[0] - z[1] * w[1])), Math.abs(cdMul(z, w)[1] - (z[0] * w[1] + z[1] * w[0])));
    let o1 = cdRandom(8), o2 = cdRandom(8); e3 = Math.max(e3, Math.abs(cdNorm(cdMul(o1, o2)) / (cdNorm(o1) * cdNorm(o2)) - 1));
    let s1 = cdRandom(16), s2 = cdRandom(16); sedN = Math.max(sedN, Math.abs(cdNorm(cdMul(s1, s2)) / (cdNorm(s1) * cdNorm(s2)) - 1)); sedAlt = Math.max(sedAlt, cdMaxAbs(cdAssoc(s1, s1, s2)));
    for (let n of [2, 4, 8, 16]) { let x = cdRandom(n), xx = cdMul(x, cdConj(x)); conjE = Math.max(conjE, Math.abs(xx[0] - cdNorm(x) ** 2), cdMaxAbs(xx.slice(1))); }
  }
  check('2 次元の cdMul = 複素数の積、4 次元の cdMul = qMul（ハミルトン積）', e1 < 1e-12 && e2 < 1e-12);
  check('どの段でも x x* = |x|²（実数）', conjE < 1e-10);
  check('八元数まではノルムが積と両立（相対 1e-9）、十六元数では破れる（' + sedN.toFixed(2) + '）', e3 < 1e-9 && sedN > 0.05);
  check('十六元数は交代的でもない：(aa)b ≠ a(ab)', sedAlt > 0.1);
  let za = cdAdd(cdBasis(16, 1), cdBasis(16, 10)), zb = cdAdd(cdBasis(16, 4), cdBasis(16, 15, -1));
  check('十六元数の零因子：(e1 + e10)(e4 − e15) = 0（どちらも 0 でない）', cdMaxAbs(cdMul(za, zb)) === 0 && cdNorm(za) > 0 && cdNorm(zb) > 0);
  let octZero = 0;
  for (let a = 1; a < 8; a++) for (let b = a + 1; b < 8; b++) for (let c = 1; c < 8; c++) for (let d = c + 1; d < 8; d++) for (let s of [1, -1])
    if (cdMaxAbs(cdMul(cdAdd(cdBasis(8, a), cdBasis(8, b)), cdAdd(cdBasis(8, c), cdBasis(8, d, s)))) === 0) octZero++;
  check('八元数では同じ形の組をすべて調べても零因子なし', octZero === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. R を何回か押そう。✓ と ✗ の並びは変わる？ 数字（ずれの大きさ）は？
// 2. ↓ で段を下りながら、e1 · e_h と e_h · e1 を比べよう。どの段から符号が変わる？
// 3. 見つかった零因子の 1 つを、自分で cdMul に入れて確かめよう（コンソールで cdMul(a, b)）
// 4. 32 次元（cdRandom(32)）でも測ってみよう。ノルムは？ 零因子は？
// 5. 「1, 2, 4, 8 次元だけが、ノルムが積と両立する」（フルヴィッツの定理）。表のノルムの列で確かめよう


// ==================================================
// ここから下は「四元数の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 四元数 [w, x, y, z] = w + xi + yj + zk（ふつうの配列）
function qMake(w, x, y, z) { return [w, x, y, z]; }
function qMul(a, b) {                  // ハミルトン積（i² = j² = k² = ijk = −1）
  return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
          a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
          a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
          a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
}
function qConj(a) { return [a[0], -a[1], -a[2], -a[3]]; }               // 共役 q*
function qAdd(a, b) { return a.map((v, t) => v + b[t]); }
function qSub(a, b) { return a.map((v, t) => v - b[t]); }
function qScl(a, s) { return a.map((v) => v * s); }
function qDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; }
function qNorm(a) { return Math.sqrt(qDot(a, a)); }                     // |q|
function qUnit(a) { let n = qNorm(a); return n > 1e-300 ? qScl(a, 1 / n) : [1, 0, 0, 0]; }
function qInv(a) { let n2 = qDot(a, a); return n2 > 1e-300 ? qScl(qConj(a), 1 / n2) : [0, 0, 0, 0]; }   // q⁻¹ = q*/|q|²
function qDist(a, b) { return qNorm(qSub(a, b)); }
function qAxisAngle(n, th) {           // 軸 n（単位ベクトル）まわりに角度 th の回転：cos(th/2) + sin(th/2) n
  let u = v3Unit(n), s = Math.sin(th / 2);
  return [Math.cos(th / 2), u[0] * s, u[1] * s, u[2] * s];
}
function qRot(q, v) {                  // v を q v q* で回す（v は 3 次元ベクトル → 純四元数）
  let r = qMul(qMul(q, [0, v[0], v[1], v[2]]), qConj(q));
  return [r[1], r[2], r[3]];
}
function qToMat(q) {                   // 同じ q から作った 3×3 回転行列（単位四元数のとき）
  let [w, x, y, z] = q;
  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
          [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
          [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
}
function qExp(a) {                     // exp(w + v) = e^w (cos|v| + sin|v| v/|v|)
  let vn = Math.hypot(a[1], a[2], a[3]), ew = Math.exp(a[0]), s = vn > 1e-12 ? Math.sin(vn) / vn : 1 - (vn * vn) / 6;
  return [ew * Math.cos(vn), ew * s * a[1], ew * s * a[2], ew * s * a[3]];
}
function qLog(a) {                     // log q = ln|q| + acos(w/|q|) v/|v|
  let n = qNorm(a), vn = Math.hypot(a[1], a[2], a[3]), th = Math.atan2(vn, a[0]), s = vn > 1e-12 ? th / vn : 1 / Math.max(n, 1e-300);
  return [Math.log(Math.max(n, 1e-300)), s * a[1], s * a[2], s * a[3]];
}
function qSlerp(a, b, t, shortest) {   // 球面線形補間。shortest = true なら −b と近い方の道
  let d = qDot(a, b);
  if (shortest && d < 0) { b = qScl(b, -1); d = -d; }
  d = clampv(d, -1, 1);
  let om = Math.acos(d), so = Math.sin(om);
  if (so < 1e-9) return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));        // ほぼ同じ向き → lerp で十分
  return qAdd(qScl(a, Math.sin((1 - t) * om) / so), qScl(b, Math.sin(t * om) / so));
}
function qNlerp(a, b, t, shortest) {   // 正規化した線形補間（まっすぐ結んで |q| = 1 にもどす）
  if (shortest && qDot(a, b) < 0) b = qScl(b, -1);
  return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));
}
function qAngle(a, b) {                // 2 つの姿勢の間の回転角（0〜π）。a⁻¹b の角を atan2 で（小さい角でも正確）
  let d = qMul(qConj(qUnit(a)), qUnit(b));
  return 2 * Math.atan2(Math.hypot(d[1], d[2], d[3]), Math.abs(d[0]));
}
function qRandom() {                   // 一様にランダムな単位四元数（S³ の上の点）
  return qUnit([rndNormal(), rndNormal(), rndNormal(), rndNormal()]);
}
function qStr(a, dg) { dg = dg === undefined ? 3 : dg; return '(' + a.map((v) => (Math.abs(v) < 0.5 * Math.pow(10, -dg) ? 0 : v).toFixed(dg)).join(', ') + ')'; }
// ---- 3 次元ベクトルと 3×3 行列
function v3Dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3Cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function v3Len(a) { return Math.hypot(a[0], a[1], a[2]); }
function v3Unit(a) { let n = v3Len(a); return n > 1e-300 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 1]; }
function v3Add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function v3Scl(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function v3Dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function matVec(m, v) { return [0, 1, 2].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2]); }
function matMul(a, b) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c])); }
function matT(a) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[c][r])); }
function matDet(a) { return v3Dot(a[0], v3Cross(a[1], a[2])); }
function matOrthoErr(a) {              // |MᵀM − I| の最大成分（回転行列なら 0）
  let m = matMul(matT(a), a), e = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(m[r][c] - (r === c ? 1 : 0)));
  return e;
}
function matDiff(a, b) { let e = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(a[r][c] - b[r][c])); return e; }
// ---- ケーリー-ディクソン構成：長さ 2ⁿ の配列 = 「数の 2 つ組」(a, b)
//   積の約束 (a, b)(c, d) = (ac − d* b, da + b c*)、共役 (a, b)* = (a*, −b)
//   長さ 1 = 実数、2 = 複素数、4 = 四元数（qMul と一致）、8 = 八元数、16 = 十六元数
function cdConj(x) {
  if (x.length === 1) return [x[0]];
  let h = x.length / 2;
  return cdConj(x.slice(0, h)).concat(x.slice(h).map((v) => -v));
}
function cdMul(x, y) {
  let n = x.length;
  if (n === 1) return [x[0] * y[0]];
  let h = n / 2, a = x.slice(0, h), b = x.slice(h), c = y.slice(0, h), d = y.slice(h);
  let ac = cdMul(a, c), db = cdMul(cdConj(d), b), da = cdMul(d, a), bc = cdMul(b, cdConj(c));
  return ac.map((v, t) => v - db[t]).concat(da.map((v, t) => v + bc[t]));
}
function cdAdd(x, y) { return x.map((v, t) => v + y[t]); }
function cdSub(x, y) { return x.map((v, t) => v - y[t]); }
function cdNorm(x) { return Math.sqrt(x.reduce((s, v) => s + v * v, 0)); }
function cdBasis(n, a, s) { let v = new Array(n).fill(0); v[a] = s === undefined ? 1 : s; return v; }   // e_a
function cdRandom(n) { return Array.from({ length: n }, () => rndNormal()); }
function cdMaxAbs(x) { return x.reduce((m, v) => Math.max(m, Math.abs(v)), 0); }
function cdAssoc(x, y, z) { return cdSub(cdMul(cdMul(x, y), z), cdMul(x, cdMul(y, z))); }   // 結合子 (xy)z − x(yz)
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y, g) {       // g = 描く先（省略で画面、WEBGL では HUD のバッファ）
  g = g || window;
  g.noStroke(); g.fill(selfTestResults.every((r) => r.ok) ? g.color(120, 210, 150) : g.color(255, 90, 90));
  g.textSize(14); g.textAlign(LEFT, BASELINE); g.text(selfTestLine(), x, y);
}
