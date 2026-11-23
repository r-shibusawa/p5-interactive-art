// ============================================
// 10 符号 (p, q) ─ e_i² を +1 にするか −1 にするかで、いろいろな「数」が生まれる
// クリフォード代数 Cl(p, q)：2 乗して +1 の基底が p 個、−1 の基底が q 個。掛け算のしくみ（並べかえの符号）は全部同じ
// Cl(0,1) = 複素数、Cl(1,0) = 双曲数（分解型複素数）、Cl(0,2) = 四元数、Cl(1,3) = 時空の代数（11）、Cl(3,1) = 共形幾何（12）
// ← →：次元 n（1〜4）/ 1〜4：e1〜e4 の 2 乗を ± 切りかえ / 表のマスにマウス：計算のしかた / Q W E：例
// ============================================

let dim = 2, sig = [-1, -1, 1, 1];      // ★ 最初は Cl(0,2) = 四元数
let alg = null, hovTxt = '';
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120];

function setup() { createCanvas(windowWidth, windowHeight); rebuild(); selfTest(); }
function rebuild() { alg = makeAlgebra(sig.slice(0, dim)); }
function pq() { let m = sig.slice(0, dim); return [m.filter((x) => x > 0).length, m.filter((x) => x < 0).length]; }
function knownName() {
  let [p, q] = pq(), key = p + ',' + q;
  let tbl = { '1,0': '双曲数（分解型複素数）：j² = +1。(1 + j)(1 − j) = 0 → 0 でないのに掛けて 0（零因子）', '0,1': '複素数 ℂ：e1² = −1 が虚数単位 i',
    '2,0': '平面の幾何代数 G(2)：2×2 の実行列と同じ。偶数部分（1, e12）は複素数（03）', '1,1': '2×2 の実行列と同じ（時空の 2 次元版、11）', '0,2': '四元数 ℍ：i = e1, j = e2, k = e12 で i² = j² = k² = ijk = −1',
    '3,0': '空間の幾何代数 G(3)：2×2 の複素行列（パウリ行列）と同じ。偶数部分は四元数（07）', '0,3': '四元数 2 つ分 ℍ ⊕ ℍ', '1,3': '時空の代数（STA）：γ0² = +1、γ1² = γ2² = γ3² = −1（ディラック行列）',
    '3,1': '共形幾何代数（2 次元の平面用）：e1, e2, e+ の 2 乗が +1、e− が −1（12）', '4,0': '4 次元の幾何代数 G(4)', '2,2': 'Cl(2,2)：4×4 の実行列と同じ' };
  return tbl[key] || 'Cl(' + p + ',' + q + ')：' + Math.pow(2, dim) + ' 次元の代数';
}

function draw() {
  background(14, 14, 18);
  let nb = alg.nb, [p, q] = pq();
  let cell = Math.min(42, Math.floor((height - 230) / (nb + 1)), Math.floor((width * 0.62) / (nb + 1)));
  let tx = 30, ty = 150;
  hovTxt = '';
  textAlign(CENTER, CENTER); textSize(cell > 34 ? 13 : 11);
  for (let i = 0; i < nb; i++) {
    noStroke(); fill(150); text(alg.names[i], tx + (i + 1.5) * cell, ty + cell / 2); text(alg.names[i], tx + cell / 2, ty + (i + 1.5) * cell);
    for (let j = 0; j < nb; j++) {
      let s = alg.tbl[i * nb + j], k = i ^ j, x = tx + (j + 1) * cell, y = ty + (i + 1) * cell;
      let inside = mouseX > x && mouseX < x + cell && mouseY > y && mouseY < y + cell;
      let col = s > 0 ? VIO : CYA;
      fill(col[0], col[1], col[2], inside ? 230 : i === j ? 150 : 70); rect(x + 1, y + 1, cell - 2, cell - 2, 3);
      fill(240); text((s < 0 ? '−' : '') + alg.names[k], x + cell / 2, y + cell / 2);
      if (inside) {
        let sw = reorderSign(i, j), common = [], ms = 1;
        for (let t = 0; t < dim; t++) if ((i & j) >> t & 1) { common.push('e' + (t + 1) + '² = ' + (sig[t] > 0 ? '+1' : '−1')); ms *= sig[t]; }
        hovTxt = alg.names[i] + ' × ' + alg.names[j] + ' = ' + (s < 0 ? '−' : '') + alg.names[k] + '　：並べかえ ' + (sw > 0 ? '偶数回（+）' : '奇数回（−）') + (common.length ? '、' + common.join('、') : '') + '　→ 符号 ' + (sw * ms > 0 ? '+' : '−');
      }
    }
  }
  textAlign(LEFT, BASELINE);
  // ---- 右：基底の 2 乗（−1 になるもの = 「虚数単位」の候補）
  let rx = tx + (nb + 1.6) * cell, ry = ty + 10;
  fill(SIL); textSize(16); text('基底の 2 乗', rx, ry);
  let rowH = Math.min(26, (height - ry - 60) / nb);
  for (let k = 0; k < nb; k++) {
    let sq = alg.tbl[k * nb + k];
    fill(sq > 0 ? VIO : CYA); textSize(Math.min(15, rowH - 4)); text(alg.names[k] + '² = ' + (sq > 0 ? '+1' : '−1'), rx, ry + (k + 1) * rowH);
  }
  // ---- 文字
  fill(SIL); textSize(18);
  text('← →：次元 n = ' + dim + '　1〜' + dim + '：e_i² の符号を切りかえ　Q：複素数　W：四元数　E：時空の代数　表にマウス：計算', 20, 34);
  textSize(22); fill(GOLD); text('Cl(' + p + ', ' + q + ')　=　' + sig.slice(0, dim).map((s, i) => 'e' + (i + 1) + '² = ' + (s > 0 ? '+1' : '−1')).join('、'), 20, 72);
  textSize(16); fill(SIL); text(knownName(), 20, 102);
  fill(150); textSize(14); text('紫 = +、水色 = −。表の形（どこに何が入るか）は同じで、符号だけが変わる。ビットマスクの XOR で基底、並べかえの回数と e_i² で符号が決まる', 20, 126);
  if (hovTxt) { fill(GOLD); textSize(16); text(hovTxt, 20, height - 40); }
  drawSelfTest(width - 170, height - 14);
}

function keyPressed() {
  if (key === RIGHT_ARROW) dim = Math.min(4, dim + 1);
  if (key === LEFT_ARROW) dim = Math.max(1, dim - 1);
  if (key >= '1' && key <= '4' && +key <= dim) sig[+key - 1] *= -1;
  if (key === 'q' || key === 'Q') { dim = 1; sig = [-1, 1, 1, 1]; }
  if (key === 'w' || key === 'W') { dim = 2; sig = [-1, -1, 1, 1]; }
  if (key === 'e' || key === 'E') { dim = 4; sig = [1, -1, -1, -1]; }
  rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(10);
  let ok1 = true, ok2 = true;
  for (let n = 1; n <= 5; n++) for (let pp = 0; pp <= n; pp++) {
    let m = Array.from({ length: n }, (_, i) => (i < pp ? 1 : -1)), A = makeAlgebra(m);
    for (let i = 0; i < n; i++) {
      ok2 = ok2 && A.near(A.gp(A.blade(1 << i), A.blade(1 << i)), A.scalar(m[i]));
      for (let j = 0; j < n; j++) if (i !== j) ok1 = ok1 && A.near(A.gp(A.blade(1 << i), A.blade(1 << j)), A.smul(A.gp(A.blade(1 << j), A.blade(1 << i)), -1));
    }
  }
  check('すべての (p, q)（n ≤ 5）で e_i e_j = −e_j e_i（i ≠ j）', ok1);
  check('すべての (p, q)（n ≤ 5）で e_i² = 符号（+1 または −1）', ok2);
  let assoc = (A) => { for (let k = 0; k < 10; k++) { let x = A.rand(), y = A.rand(), z = A.rand(); if (!A.near(A.gp(A.gp(x, y), z), A.gp(x, A.gp(y, z)), 1e-11)) return false; } return true; };
  check('結合法則：G(3)、Cl(1,3)、Cl(4,1)（n = 5、32 成分）でランダムに確認', assoc(makeAlgebra([1, 1, 1])) && assoc(makeAlgebra([1, -1, -1, -1])) && assoc(makeAlgebra([1, 1, 1, 1, -1])));
  let C1 = makeAlgebra([-1]), okC = true;
  for (let k = 0; k < 20; k++) { let a = rnd(), b = rnd(), c = rnd(), d = rnd(), z = C1.gp(Float64Array.from([a, b]), Float64Array.from([c, d])); okC = okC && near(z[0], a * c - b * d) && near(z[1], a * d + b * c); }
  check('Cl(0,1) の積 = 複素数の積（a + bi）(c + di)', okC);
  let H = makeAlgebra([-1, -1]), qi = H.blade(1), qj = H.blade(2), qk = H.blade(3), m1 = H.scalar(-1);
  check('Cl(0,2)：i = e1, j = e2, k = e12 で i² = j² = k² = ijk = −1、ij = k = −ji（四元数）', [H.gp(qi, qi), H.gp(qj, qj), H.gp(qk, qk), H.gp(qi, qj, qk)].every((x) => H.near(x, m1)) && H.near(H.gp(qi, qj), qk) && H.near(H.gp(qj, qi), H.smul(qk, -1)));
  let D = makeAlgebra([1]), one = D.scalar(1), jj = D.blade(1);
  check('Cl(1,0)：j² = +1、(1 + j)(1 − j) = 0（零因子がある）', D.near(D.gp(jj, jj), one) && D.isZero(D.gp(D.add(one, jj), D.sub(one, jj))));
  let G2 = makeAlgebra([1, 1]), e12 = G2.blade(3);
  check('Cl(2,0) と Cl(0,2) は e12² = −1 が同じでも、e1² の符号が違う別の代数（次元はどちらも 2ⁿ = 4）', G2.near(G2.gp(e12, e12), G2.scalar(-1)) && G2.nb === 4 && H.nb === 4 && !G2.near(G2.gp(G2.blade(1), G2.blade(1)), H.gp(H.blade(1), H.blade(1))));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. Q（複素数）から 1 を押して e1² = +1 にすると、何が変わる？（双曲数）
// 2. W（四元数）の表で、i·j と j·i のマスを見比べよう
// 3. n = 3 で全部 +1（G(3)）にして、2 乗が −1 になる基底を数えよう。それは何個？
// 4. E（時空の代数）で γ0 = e1 だけ +1。e1e2 の 2 乗は？（11 のローレンツブーストで使う）
// 5. Cl(1,1) と Cl(2,0) はどちらも 2×2 の実行列と同じになる。表の符号の数を比べてみよう


// ==================================================
// ここから下は「幾何代数の道具」（中身は読まなくても OK。消さないでね）
//   マルチベクトル = 2ⁿ 個の数の配列。基底ブレードは「ビットマスク」で番号をつける
//   例（n = 3）：0 = 1、1 = e1、2 = e2、3 = e12、4 = e3、5 = e13、6 = e23、7 = e123（e31 = −e13）
//   幾何積：ブレード a と b を並べかえる回数（入れかえ 1 回で −1）× 同じ e_i が 2 つ並んだら e_i² を掛ける
// ==================================================
function bitCount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
// 基底 a のうしろに基底 b を並べ、標準の順（番号の小さい順）にするまでの入れかえ回数 → 奇数なら −1
function reorderSign(a, b) { a >>= 1; let s = 0; while (a) { s += bitCount(a & b); a >>= 1; } return s & 1 ? -1 : 1; }
// 代数をつくる：metric = 各 e_i の 2 乗（+1 か −1）。[1,1,1] = G(3)、[-1,-1] = Cl(0,2)、[1,-1,-1,-1] = 時空の代数
function makeAlgebra(metric, names) {
  const n = metric.length, nb = 1 << n, tbl = new Float64Array(nb * nb), grade = [];
  for (let a = 0; a < nb; a++) {
    grade.push(bitCount(a));
    for (let b = 0; b < nb; b++) {
      let s = reorderSign(a, b), c = a & b;
      for (let i = 0; i < n; i++) if ((c >> i) & 1) s *= metric[i];   // 同じ e_i どうし → e_i² = ±1
      tbl[a * nb + b] = s;
    }
  }
  const A = { n, nb, metric, grade, tbl };
  A.names = names || grade.map((g, a) => { if (!a) return '1'; let s = 'e'; for (let i = 0; i < n; i++) if ((a >> i) & 1) s += i + 1; return s; });
  A.zero = () => new Float64Array(nb);
  A.scalar = (s) => { let m = A.zero(); m[0] = s; return m; };
  A.blade = (mask, c) => { let m = A.zero(); m[mask] = c === undefined ? 1 : c; return m; };
  A.vec = (v) => { let m = A.zero(); for (let i = 0; i < n; i++) m[1 << i] = v[i] || 0; return m; };
  A.vecOf = (m) => { let v = []; for (let i = 0; i < n; i++) v.push(m[1 << i]); return v; };
  A.add = (...ms) => { let r = A.zero(); for (let m of ms) for (let i = 0; i < nb; i++) r[i] += m[i]; return r; };
  A.sub = (a, b) => a.map((x, i) => x - b[i]);
  A.smul = (a, s) => a.map((x) => x * s);
  // 積の共通部分：kind 0 = 幾何積、1 = 外積 ∧（共通の e_i がないときだけ）、2 = 左縮約 ⌋（a のブレードが b に含まれるときだけ）
  function prod(a, b, kind) {
    const r = new Float64Array(nb);
    for (let i = 0; i < nb; i++) {
      const x = a[i]; if (x === 0) continue;
      for (let j = 0; j < nb; j++) {
        const y = b[j]; if (y === 0) continue;
        if (kind === 1 && (i & j)) continue;
        if (kind === 2 && (i & j) !== i) continue;
        r[i ^ j] += tbl[i * nb + j] * x * y;
      }
    }
    return r;
  }
  A.gp = (a, b, ...more) => { let r = prod(a, b, 0); for (let m of more) r = prod(r, m, 0); return r; };
  A.wedge = (a, b, ...more) => { let r = prod(a, b, 1); for (let m of more) r = prod(r, m, 1); return r; };
  A.lc = (a, b) => prod(a, b, 2);
  A.inner = (a, b) => A.gradePart(A.gp(a, b), 0);                // ベクトルどうしなら a·b
  A.sp = (a, b) => A.gp(a, b)[0];                                  // スカラー部分
  A.gradePart = (a, k) => a.map((x, i) => (grade[i] === k ? x : 0));
  A.gradeSize = (a, k) => { let s = 0; for (let i = 0; i < nb; i++) if (grade[i] === k) s += a[i] * a[i]; return Math.sqrt(s); };
  A.rev = (a) => a.map((x, i) => ((grade[i] * (grade[i] - 1)) / 2) % 2 ? -x : x);   // 逆順 ã（掛ける順を逆に）
  A.ginv = (a) => a.map((x, i) => (grade[i] % 2 ? -x : x));       // 次数の反転（奇数次に −）
  A.normSq = (a) => A.gp(a, A.rev(a))[0];
  A.norm = (a) => Math.sqrt(Math.abs(A.normSq(a)));
  A.unit = (a) => A.smul(a, 1 / (A.norm(a) || 1));
  A.inv = (a) => { let r = A.rev(a), s = A.gp(a, r); return A.smul(r, 1 / s[0]); };   // 逆元（ベクトル・ブレード・ベルソル用：a ã がスカラー）
  A.pss = A.blade(nb - 1);                                         // 擬スカラー（一番上のブレード）
  A.dualOf = (a) => A.gp(a, A.inv(A.pss));                         // 双対 a* = a I⁻¹
  A.undual = (a) => A.gp(a, A.pss);
  A.meet = (a, b) => A.undual(A.wedge(A.dualOf(a), A.dualOf(b)));  // 交わり（向きと大きさは決めかた次第）
  A.sandwich = (R, x) => A.gp(R, x, A.rev(R));                     // R x R~（回転）
  A.reflect = (nv, x) => A.smul(A.gp(nv, x, A.inv(nv)), -1);       // −n x n⁻¹（法線 n の鏡で反射）
  A.isOdd = (V) => { let o = 0, e = 0; for (let i = 0; i < nb; i++) if (grade[i] % 2) o += V[i] * V[i]; else e += V[i] * V[i]; return o > e; };
  A.applyVersor = (V, x) => A.smul(A.gp(V, x, A.inv(V)), A.isOdd(V) ? -1 : 1);   // ±V x V⁻¹（鏡 k 枚の積なら符号 (−1)^k）
  // 二重ベクトル B の指数関数 e^B：B² がスカラーなら閉じた式、そうでなければ級数（割って 2 乗をくり返す）
  A.expB = (B, forceSeries) => {
    let b2 = A.gp(B, B), rest = 0;
    for (let i = 1; i < nb; i++) rest += Math.abs(b2[i]);
    if (!forceSeries && rest < 1e-12) {
      let s = b2[0], r = A.zero(), c, k;
      if (s < -1e-15) { let t = Math.sqrt(-s); c = Math.cos(t); k = Math.sin(t) / t; }
      else if (s > 1e-15) { let t = Math.sqrt(s); c = Math.cosh(t); k = Math.sinh(t) / t; }
      else { c = 1; k = 1; }
      for (let i = 0; i < nb; i++) r[i] = k * B[i];
      r[0] += c; return r;
    }
    let sz = 0; for (let x of B) sz = Math.max(sz, Math.abs(x));
    let sq = 0; while (sz > 0.25 && sq < 40) { sz /= 2; sq++; }
    let X = A.smul(B, 1 / Math.pow(2, sq)), term = A.scalar(1), sum = A.scalar(1);
    for (let k = 1; k < 30; k++) { term = A.smul(A.gp(term, X), 1 / k); sum = A.add(sum, term); }
    for (let k = 0; k < sq; k++) sum = A.gp(sum, sum);
    return sum;
  };
  A.near = (a, b, tol) => { tol = tol === undefined ? 1e-9 : tol; for (let i = 0; i < nb; i++) if (!(Math.abs(a[i] - b[i]) <= tol)) return false; return true; };
  A.isZero = (a, tol) => A.near(a, A.zero(), tol);
  A.rand = () => { let m = A.zero(); for (let i = 0; i < nb; i++) m[i] = rnd() * 2 - 1; return m; };
  A.randVec = () => A.vec(Array.from({ length: n }, () => rnd() * 2 - 1));
  // 文字にする：「1.20 + 0.50 e12」
  A.str = (a, d) => {
    d = d === undefined ? 2 : d; let s = '';
    for (let i = 0; i < nb; i++) {
      let x = a[i]; if (Math.abs(x) < Math.pow(10, -d) / 2) continue;
      let v = Math.abs(x).toFixed(d);
      s += (s ? (x < 0 ? ' − ' : ' + ') : x < 0 ? '−' : '') + (i ? (v === (1).toFixed(d) ? '' : v + ' ') + A.names[i] : v);
    }
    return s || '0';
  };
  return A;
}

// ---- 比べるための「ふつうの」計算（行列・外積・行列式）
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function len3(a) { return Math.sqrt(dot3(a, a)); }
function det3(a, b, c) { return dot3(a, cross3(b, c)); }
function matVec(M, v) { return M.map((r) => r.reduce((s, x, j) => s + x * v[j], 0)); }
function matMul(P, Q) { return P.map((r) => Q[0].map((_, j) => r.reduce((s, x, k) => s + x * Q[k][j], 0))); }
function rotMat2(t) { return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]]; }
function rodrigues(ax, t) {             // 軸 ax（単位ベクトル）まわりに角 t 回す行列
  let [x, y, z] = ax, c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [y * x * k + z * s, c + y * y * k, y * z * k - x * s], [z * x * k - y * s, z * y * k + x * s, c + z * z * k]];
}
function nearArr(a, b, tol) { tol = tol === undefined ? 1e-9 : tol; return a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= tol); }
// ---- 種つきの乱数（自己テストで毎回同じ数を使う）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 描く道具（画面の座標）
function arrowS(x1, y1, x2, y2, col, sw, g) {
  g = g || window; let a = Math.atan2(y2 - y1, x2 - x1), h = 8 + (sw || 2) * 2;
  g.stroke(col); g.strokeWeight(sw || 2); g.line(x1, y1, x2, y2);
  if (Math.hypot(x2 - x1, y2 - y1) < 2) return;
  g.noStroke(); g.fill(col);
  g.triangle(x2, y2, x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4), x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4));
}
function polyline(pts, closed) {        // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// ---- 3D（WEBGL）の画面の文字：HTML の文字を重ねる（カメラを回しても動かない）
let hudDiv = null, hudTestDiv = null;
function makeHud() {
  hudDiv = createDiv(''); hudDiv.position(16, 8);
  hudDiv.style('color', '#d7dce6'); hudDiv.style('font', '15px/1.6 sans-serif'); hudDiv.style('pointer-events', 'none'); hudDiv.style('white-space', 'pre');
  hudTestDiv = createDiv(selfTestLine()); hudTestDiv.style('font', '14px sans-serif'); hudTestDiv.style('pointer-events', 'none');
  hudTestDiv.style('position', 'fixed'); hudTestDiv.style('right', '20px'); hudTestDiv.style('bottom', '10px');
  hudTestDiv.style('color', selfTestResults.every((r) => r.ok) ? '#96dcc8' : '#ff646e');
}
function hudSet(s) { if (hudDiv && frameCount % 4 === 1) hudDiv.html(s); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let k = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (k === selfTestResults.length ? '✓ ' : '✗ ') + k + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y, g) {
  g = g || window; g.noStroke();
  if (selfTestResults.every((r) => r.ok)) g.fill(150, 220, 200); else g.fill(255, 100, 110);
  g.textSize(14); g.textAlign(LEFT, BASELINE); g.text(selfTestLine(), x, y);
}
