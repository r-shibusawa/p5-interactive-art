// ============================================
// 03 複素数が出てくる ─ G(2) の擬スカラー I = e1e2 は I² = −1
// 「スカラー ＋ I の何倍」という偶数次の元 z = x + yI は、複素数 x + yi とまったく同じ掛け算をする
// ベクトル v に右から I を掛けると 90° 回る（vI）。左から掛けると逆向き（Iv = −vI）
// 左：v の先をドラッグ / I：v に I を掛ける（4 回でもとにもどる）/ 右：z1・z2 の点をドラッグ / R：元にもどす
// ============================================

const G2 = makeAlgebra([1, 1]);
const PS = G2.blade(3);                 // 擬スカラー e12（名前 I はさけて PS と書く）
let vv = [2, 1];                        // ★ 左のベクトル
let z1 = [1.2, 0.6], z2 = [0.5, 1.1];   // ★ 右の 2 つの「複素数」（スカラー部, I の係数）
let unitPx = 64, drag = null, turns = 0, anim = 0;
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120], PINK = [255, 150, 200];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function panel(k) { return { cx: k === 0 ? width * 0.26 : width * 0.72, cy: height * 0.63 }; }
function toPx(k, p) { let c = panel(k); return [c.cx + p[0] * unitPx, c.cy - p[1] * unitPx]; }
function axesAt(k, xl, yl) {
  let c = panel(k), r = unitPx * 3.0;
  stroke(40); strokeWeight(1); noFill(); circle(c.cx, c.cy, 2 * unitPx);
  stroke(70); line(c.cx - r, c.cy, c.cx + r, c.cy); line(c.cx, c.cy - r, c.cx, c.cy + r);
  noStroke(); fill(140); textSize(14); text(xl, c.cx + r - 30, c.cy + 18); text(yl, c.cx + 6, c.cy - r + 12);
}

function draw() {
  background(14, 14, 18);
  anim = Math.max(0, anim - 0.06);
  // ---- 左：ベクトル × I = 90° 回転
  axesAt(0, 'e1', 'e2');
  let v = G2.vec(vv), o = toPx(0, [0, 0]);
  let cur = v;
  for (let k = 0; k < 4; k++) {
    let p = G2.vecOf(cur), s = toPx(0, p), al = k === turns % 4 ? 255 : 90;
    arrowS(o[0], o[1], s[0], s[1], color(k === 0 ? VIO[0] : CYA[0], k === 0 ? VIO[1] : CYA[1], k === 0 ? VIO[2] : CYA[2], al), k === turns % 4 ? 4 : 2);
    noStroke(); fill(220, al); textSize(15); text(['v', 'vI', 'vI²', 'vI³'][k], s[0] + 6, s[1] - 6);
    cur = G2.gp(cur, PS);
  }
  let iv = G2.vecOf(G2.gp(PS, v)), si = toPx(0, iv);
  stroke(PINK); strokeWeight(1.5); drawingContext.setLineDash([5, 5]); line(o[0], o[1], si[0], si[1]); drawingContext.setLineDash([]);
  noStroke(); fill(PINK); text('Iv = −vI', si[0] + 6, si[1] + 16);
  // ---- 右：偶数次の元 z = x + y I の掛け算 = 複素数の掛け算
  axesAt(1, 'スカラー', 'I（e12）');
  let za = G2.add(G2.scalar(z1[0]), G2.smul(PS, z1[1])), zb = G2.add(G2.scalar(z2[0]), G2.smul(PS, z2[1]));
  let zp = G2.gp(za, zb), cx = [z1[0] * z2[0] - z1[1] * z2[1], z1[0] * z2[1] + z1[1] * z2[0]];   // 複素数の式
  let q0 = toPx(1, [0, 0]), q1 = toPx(1, z1), q2 = toPx(1, z2), qp = toPx(1, [zp[0], zp[3]]);
  stroke(VIO); strokeWeight(2); line(q0[0], q0[1], q1[0], q1[1]); stroke(CYA); line(q0[0], q0[1], q2[0], q2[1]); stroke(GOLD); line(q0[0], q0[1], qp[0], qp[1]);
  noStroke(); fill(VIO); circle(q1[0], q1[1], 14); fill(CYA); circle(q2[0], q2[1], 14); fill(GOLD); circle(qp[0], qp[1], 16);
  fill(240); textSize(15); text('z1', q1[0] + 9, q1[1] - 8); text('z2', q2[0] + 9, q2[1] - 8); text('z1 z2', qp[0] + 10, qp[1] - 8);
  // 角の和を弧で
  let a1 = Math.atan2(z1[1], z1[0]), a2 = Math.atan2(z2[1], z2[0]);
  noFill(); stroke(GOLD[0], GOLD[1], GOLD[2], 150); strokeWeight(1.5);
  let arcPts = []; for (let i = 0; i <= 40; i++) { let t = ((a1 + a2) * i) / 40; arcPts.push([q0[0] + 40 * Math.cos(t), q0[1] - 40 * Math.sin(t)]); }
  polyline(arcPts);
  // ---- 文字
  noStroke(); fill(SIL); textSize(18); textAlign(LEFT, BASELINE);
  text('左：v の先をドラッグ、I で v に I を掛ける（いま vI^' + (turns % 4) + '）　右：z1・z2 をドラッグ　R：元にもどす', 20, 34);
  textSize(16); let y = 66, row = (s, c) => { fill(c || SIL); text(s, 20, y); y += 25; };
  row('I = e1e2、I² = e1e2e1e2 = −e1e1e2e2 = ' + G2.str(G2.gp(PS, PS)) + '　← 2 乗して −1 になる「数」がベクトルから作れた', GOLD);
  row('v = ' + G2.str(v) + '　vI = ' + G2.str(G2.gp(v, PS)) + '（左回り 90°）　Iv = ' + G2.str(G2.gp(PS, v)) + '（右回り 90°）', CYA);
  row('z1 = ' + G2.str(za) + '　z2 = ' + G2.str(zb) + '　幾何積 z1 z2 = ' + G2.str(zp, 3), GOLD);
  row('複素数の式 (a + bi)(c + di) = (ac − bd) + (ad + bc)i = ' + cx[0].toFixed(3) + (cx[1] < 0 ? ' − ' : ' + ') + Math.abs(cx[1]).toFixed(3) + 'i　→ 同じ！', SIL);
  let x2 = width * 0.5;
  fill(150); textSize(14);
  text('|z1 z2| = |z1||z2|、角度は足し算（黄色の弧）。z1z2 = z2z1', x2, height - 40);
  text('ベクトル v と複素数の橋：e1 v = v1 + v2 I（e1 から見た v の「回し方」）', 20, height - 40);
  drawSelfTest(width - 170, height - 14);
}

function mousePressed() {
  drag = null; let best = 28, cand = [[0, vv], [1, z1], [1, z2]];
  for (let c of cand) { let s = toPx(c[0], c[1]), d = Math.hypot(mouseX - s[0], mouseY - s[1]); if (d < best) { best = d; drag = c; } }
}
function mouseDragged() {
  if (!drag) return;
  let c = panel(drag[0]);
  drag[1][0] = clampv(Math.round(((mouseX - c.cx) / unitPx) * 20) / 20, -3.4, 3.4);
  drag[1][1] = clampv(Math.round(((c.cy - mouseY) / unitPx) * 20) / 20, -3.4, 3.4);
}
function mouseReleased() { drag = null; }
function keyPressed() {
  if (key === 'i' || key === 'I') turns++;
  if (key === 'r' || key === 'R') { vv[0] = 2; vv[1] = 1; z1[0] = 1.2; z1[1] = 0.6; z2[0] = 0.5; z2[1] = 1.1; turns = 0; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(3);
  check('I² = −1（I = e1e2）', G2.near(G2.gp(PS, PS), G2.scalar(-1)));
  let okM = true, okR = true, okA = true, okC = true;
  for (let k = 0; k < 40; k++) {
    let a = rnd() * 4 - 2, b = rnd() * 4 - 2, c = rnd() * 4 - 2, d = rnd() * 4 - 2;
    let p = G2.gp(G2.add(G2.scalar(a), G2.smul(PS, b)), G2.add(G2.scalar(c), G2.smul(PS, d)));
    okM = okM && near(p[0], a * c - b * d, 1e-12) && near(p[3], a * d + b * c, 1e-12) && near(p[1], 0) && near(p[2], 0);
    let v = G2.randVec(), vi = G2.gp(v, PS), vv2 = G2.vecOf(v), w = G2.vecOf(vi);
    okR = okR && near(vv2[0] * w[0] + vv2[1] * w[1], 0, 1e-12) && near(Math.hypot(...w), Math.hypot(...vv2), 1e-12) && near(vv2[0] * w[1] - vv2[1] * w[0], vv2[0] ** 2 + vv2[1] ** 2, 1e-12);
    okA = okA && G2.near(G2.gp(PS, v), G2.smul(vi, -1));
    okC = okC && G2.near(G2.gp(G2.gp(vi, PS), G2.gp(PS, PS)), v);
  }
  check('偶数次の元の積 = 複素数の積（ac − bd, ad + bc）', okM);
  check('vI は v と直交・同じ長さ・左回り 90°', okR);
  check('Iv = −vI（I はベクトルと反可換）', okA);
  check('vI⁴ = v（4 回で 1 周）', okC);
  let t = 0.83, e = G2.expB(G2.smul(PS, t));
  check('オイラーの式 e^{Iθ} = cos θ + I sin θ（指数関数の計算から）', near(e[0], Math.cos(t)) && near(e[3], Math.sin(t)) && G2.near(G2.expB(G2.smul(PS, t), true), e, 1e-12));
  check('e1 v = v1 + v2 I（ベクトル ↔ 複素数の橋）', G2.near(G2.gp(G2.blade(1), G2.vec([0.3, -0.7])), G2.add(G2.scalar(0.3), G2.smul(PS, -0.7))));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. I を 4 回押して、v → vI → vI² → vI³ → v と 1 周することを確かめよう。vI² は何？
// 2. 右で z1 を 1（スカラーだけ）にすると、z1 z2 はどうなる？ z1 = I なら？
// 3. z1・z2 を単位円の上に置くと、積も単位円の上。角度はどうなっている？
// 4. 複素数の i は「謎の数」ではなく、平面の向き付き面積 e1e2 だった。3 次元では I² は？（e123 で確かめよう）
// 5. 3 次元の e12, e23, e13 も 2 乗すると −1。3 つの「虚数単位」は何になる？（07 と シリーズ 57 へ）


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
