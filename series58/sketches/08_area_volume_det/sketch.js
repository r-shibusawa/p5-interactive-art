// ============================================
// 08 面積・体積・行列式 ─ a∧b∧c = det[a b c] I
// 3 本のベクトルの外積 a∧b∧c は三重ベクトル（向き付きの体積）。その数は行列式そのもの。0 なら 3 本は同じ平面の上
// 連立方程式 xa + yb + zc = d も ∧ で解ける（クラメルの公式）：x = (d∧b∧c)/(a∧b∧c)、y = (a∧d∧c)/(a∧b∧c)、z = (a∧b∧d)/(a∧b∧c)
// 1 2 3 4：a b c d をえらぶ / X Y Z：成分 / ↑↓：値を変える / F：c を平面に落とす / スペース：ランダム / ドラッグ：視点を回す
// ============================================

const G3 = makeAlgebra([1, 1, 1]);
let vs = null;                           // a, b, c, d（resetVecs で作る）
let sel = 0, comp = 0, az = 0.3, dragX = null;
let scl = 75;                            // ★ 長さ 1 のピクセル数
const NAMES = ['a', 'b', 'c', 'd'], COLS = [[180, 130, 255], [90, 220, 240], [255, 160, 220], [255, 210, 120]];
const SIL = [215, 220, 230];

function setup() { createCanvas(windowWidth, windowHeight); resetVecs(); selfTest(); }
function resetVecs() { vs = [[2, 0.3, 0.2], [0.4, 1.8, 0.3], [0.3, 0.5, 1.6], [1.5, 1.6, 1.2]]; }   // ★ 最初の a, b, c, d
// 3D → 画面（z 軸まわりに az 回してから斜めに見る。右手系）
function pr(v) {
  let x = v[0] * Math.cos(az) - v[1] * Math.sin(az), y = v[0] * Math.sin(az) + v[1] * Math.cos(az);
  return [width * 0.52 + (y - x) * 0.87 * scl, height * 0.68 + (x + y) * 0.5 * scl - v[2] * scl];
}
function addv(p, q, s) { return p.map((x, i) => x + (s === undefined ? 1 : s) * q[i]); }

function draw() {
  background(14, 14, 18);
  let [a, b, c, d] = vs.map((v) => G3.vec(v));
  let abc = G3.wedge(a, b, c), vol = abc[7], det = det3(vs[0], vs[1], vs[2]);
  // 床の格子
  stroke(35); strokeWeight(1);
  for (let k = -3; k <= 3; k++) { let p = pr([k, -3, 0]), q = pr([k, 3, 0]), r = pr([-3, k, 0]), s = pr([3, k, 0]); line(p[0], p[1], q[0], q[1]); line(r[0], r[1], s[0], s[1]); }
  // 平行六面体（a, b, c）
  let o = [0, 0, 0], col = vol >= 0 ? COLS[0] : [90, 220, 240];
  let faces = [[o, vs[0], addv(vs[0], vs[1]), vs[1]], [o, vs[1], addv(vs[1], vs[2]), vs[2]], [o, vs[0], addv(vs[0], vs[2]), vs[2]]];
  for (let f of faces) for (let sh of [[0, 0, 0], null]) {
    let off = sh ? sh : f === faces[0] ? vs[2] : f === faces[1] ? vs[0] : vs[1];
    noStroke(); fill(col[0], col[1], col[2], Math.abs(det) < 0.05 ? 15 : 28);
    let q = f.map((p) => pr(addv(p, off)));
    quad(q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], q[3][0], q[3][1]);
    stroke(col[0], col[1], col[2], 90); strokeWeight(1); noFill(); polyline(q, true);
  }
  // クラメルの公式で解いた x, y, z を、xa → yb → zc とつないで d に届くことを見せる
  let sol = null;
  if (Math.abs(vol) > 1e-9) {
    sol = [G3.wedge(d, b, c)[7] / vol, G3.wedge(a, d, c)[7] / vol, G3.wedge(a, b, d)[7] / vol];
    let p0 = [0, 0, 0], p1 = addv(p0, vs[0], sol[0]), p2 = addv(p1, vs[1], sol[1]), p3 = addv(p2, vs[2], sol[2]);
    for (let [s, e, k] of [[p0, p1, 0], [p1, p2, 1], [p2, p3, 2]]) { let ps = pr(s), pe = pr(e); stroke(COLS[k][0], COLS[k][1], COLS[k][2], 130); strokeWeight(6); line(ps[0], ps[1], pe[0], pe[1]); }
  }
  for (let k = 0; k < 4; k++) {
    let p = pr(o), q = pr(vs[k]);
    arrowS(p[0], p[1], q[0], q[1], color(COLS[k]), k === sel ? 4 : 2.5);
    noStroke(); fill(COLS[k]); textSize(20); text(NAMES[k], q[0] + 8, q[1] - 6);
  }
  // ---- 文字
  fill(SIL); textSize(18); textAlign(LEFT, BASELINE);
  text('1〜4：ベクトル（いま ' + NAMES[sel] + '）　X Y Z：成分（いま ' + 'xyz'[comp] + '）　↑↓：値　F：c を平面に　スペース：ランダム　ドラッグ：視点', 20, 34);
  textSize(16); let y = 64, row = (s, cl) => { fill(cl || SIL); text(s, 20, y); y += 25; };
  for (let k = 0; k < 4; k++) row(NAMES[k] + ' = (' + vs[k].map((x) => x.toFixed(2)).join(', ') + ')', COLS[k]);
  row('a∧b = ' + G3.str(G3.wedge(a, b), 3) + '　（面積 ' + G3.gradeSize(G3.wedge(a, b), 2).toFixed(3) + '）', SIL);
  row('a∧b∧c = ' + G3.str(abc, 4) + '　　det[a b c] = ' + det.toFixed(4) + '　→ 同じ数！', col);
  if (Math.abs(det) < 1e-6) row('体積 0：a, b, c は同じ平面の上（解はひとつに決まらない）', [255, 120, 120]);
  else {
    row('クラメル：x = (d∧b∧c)/(a∧b∧c) = ' + sol[0].toFixed(4) + '　y = ' + sol[1].toFixed(4) + '　z = ' + sol[2].toFixed(4), [255, 210, 120]);
    let chk = addv(addv(vs[0].map((v) => v * sol[0]), vs[1], sol[1]), vs[2], sol[2]);
    row('確かめ：xa + yb + zc = (' + chk.map((x) => x.toFixed(4)).join(', ') + ') = d（太い線の道すじが d の先に届く）', [255, 210, 120]);
  }
  drawSelfTest(width - 170, height - 14);
}

function keyPressed() {
  if (key >= '1' && key <= '4') sel = +key - 1;
  let k = key.toLowerCase ? key.toLowerCase() : key;
  if (k === 'x' || k === 'y' || k === 'z') comp = 'xyz'.indexOf(k);
  if (key === UP_ARROW) vs[sel][comp] = Math.round(clampv(vs[sel][comp] + 0.1, -3, 3) * 10) / 10;
  if (key === DOWN_ARROW) vs[sel][comp] = Math.round(clampv(vs[sel][comp] - 0.1, -3, 3) * 10) / 10;
  if (k === 'f') vs[2] = vs[0].map((x, i) => 0.6 * x + 0.4 * vs[1][i]);
  if (key === ' ') vs = vs.map(() => [0, 0, 0].map(() => Math.round((Math.random() * 4 - 2) * 10) / 10));
  if (k === 'r') resetVecs();
  return false;
}
function mousePressed() { dragX = mouseX; }
function mouseDragged() { if (dragX !== null) { az += (mouseX - dragX) * 0.01; dragX = mouseX; } }
function mouseReleased() { dragX = null; }

// 比べるための別の解き方：ガウスの消去法（部分ピボット）
function gaussSolve(M, rhs) {
  let n = M.length, A = M.map((r, i) => [...r, rhs[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = c + 1; r < n; r++) { let f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  let x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = A[r][n]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x;
}
function gaussDet(M) {
  let n = M.length, A = M.map((r) => [...r]), det = 1;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (p !== c) { [A[c], A[p]] = [A[p], A[c]]; det = -det; }
    det *= A[c][c];
    for (let r = c + 1; r < n; r++) { let f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; }
  }
  return det;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(8);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true, ok5 = true;
  const G2 = makeAlgebra([1, 1]), G4 = makeAlgebra([1, 1, 1, 1]);
  for (let k = 0; k < 40; k++) {
    let a = G3.randVec(), b = G3.randVec(), c = G3.randVec(), d = G3.randVec(), [av, bv, cv, dv] = [a, b, c, d].map(G3.vecOf);
    ok1 = ok1 && G3.near(G3.wedge(a, b, c), G3.blade(7, det3(av, bv, cv)), 1e-12);
    let cp = G3.add(G3.smul(a, rnd() - 0.5), G3.smul(b, rnd() - 0.5));
    ok2 = ok2 && G3.isZero(G3.wedge(a, b, cp), 1e-12) && G3.near(G3.wedge(b, a, c), G3.smul(G3.wedge(a, b, c), -1), 1e-12);
    let vol = G3.wedge(a, b, c)[7], sol = [G3.wedge(d, b, c)[7] / vol, G3.wedge(a, d, c)[7] / vol, G3.wedge(a, b, d)[7] / vol];
    let M = [0, 1, 2].map((i) => [av[i], bv[i], cv[i]]), gs = gaussSolve(M, dv);
    ok3 = ok3 && nearArr(sol, gs, 1e-9 * Math.max(1, ...gs.map(Math.abs)));
    let p = G2.randVec(), q = G2.randVec(), pv = G2.vecOf(p), qv = G2.vecOf(q);
    ok4 = ok4 && near(G2.wedge(p, q)[3], pv[0] * qv[1] - pv[1] * qv[0], 1e-12);
    let w4 = [0, 1, 2, 3].map(() => G4.randVec()), M4 = [0, 1, 2, 3].map((i) => w4.map((v) => v[1 << i]));
    ok5 = ok5 && near(G4.wedge(...w4)[15], gaussDet(M4), 1e-12);
  }
  check('a∧b∧c = det[a b c] e123（40 組）', ok1);
  check('同じ平面の上なら a∧b∧c = 0、2 本を入れかえると符号が逆', ok2);
  check('クラメルの公式（∧ で計算）= ガウスの消去法の解（1e-9）', ok3);
  check('2 次元：a∧b = (a1b2 − a2b1) e12（2×2 の行列式）', ok4);
  check('4 次元：a∧b∧c∧d = det（4×4、消去法）e1234 → 次元によらず同じ式', ok5);
  check('|a∧b∧c| = |a·(b×c)|（スカラー三重積 = 体積）', near(Math.abs(G3.wedge(G3.vec([1, 2, 0]), G3.vec([0, 1, 3]), G3.vec([2, 0, 1]))[7]), Math.abs(dot3([1, 2, 0], cross3([0, 1, 3], [2, 0, 1]))), 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. F で c を a と b の平面に落とすと、体積と a∧b∧c はどうなる？ クラメルの公式は？
// 2. 1 と 2 で a と b を入れかえる代わりに、a の成分を少しずつ変えて体積の符号が変わる瞬間を探そう
// 3. d を a と同じにすると、解 (x, y, z) はいくつになるはず？ 確かめよう
// 4. 2 次元の連立方程式も同じ形で解ける：x = (d∧b)/(a∧b)。紙で計算してみよう
// 5. 体積が 0 に近いと、x, y, z がとても大きくなるのはなぜ？


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
