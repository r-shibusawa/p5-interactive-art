// ============================================
// 12 共形幾何代数 ─ 平面の点を 4 次元の Cl(3,1)（16 成分）に持ち上げると、円も直線も「外積 1 つ」
// e₊² = +1、e₋² = −1 から e∞ = e₋ + e₊、e0 = (e₋ − e₊)/2 を作る（どちらも 2 乗が 0）。点 x → up(x) = x + ½|x|² e∞ + e0
// 3 点を通る円 = P1∧P2∧P3、2 点を通る直線 = P∧Q∧e∞（無限遠を通る円）。円と直線の交わり = 2 点の組（点対）
// ドラッグ：白い点（円）・水色の点（直線）・黄色の点（4 点目）/ C：中心と半径の比較 / スペース：自動 / R：元にもどす
// ============================================

const CGA = makeAlgebra([1, 1, 1, -1]);  // e1, e2, e₊, e₋
CGA.names = CGA.names.map((s, m) => (m ? 'e' + [0, 1, 2, 3].filter((i) => (m >> i) & 1).map((i) => ['1', '2', '₊', '₋'][i]).join('') : '1'));
const EINF = CGA.add(CGA.blade(4), CGA.blade(8)), EO = CGA.smul(CGA.sub(CGA.blade(8), CGA.blade(4)), 0.5);
let cps = [[-2, -0.5], [1.5, 1.6], [2, -1.2]];   // ★ 円を決める 3 点
let lps = [[-3.5, -2], [3.5, 0.8]];               // ★ 直線を決める 2 点
let p4 = [0.2, 2.2], showCmp = true, auto = false, tt = 0;
let unitPx = 90, drag = null;
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120], PINK = [255, 150, 200];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function up(p) { return CGA.add(CGA.vec([p[0], p[1], 0, 0]), CGA.smul(EINF, 0.5 * (p[0] * p[0] + p[1] * p[1])), EO); }
function down(P) { let w = -CGA.inner(P, EINF)[0]; return [P[1] / w, P[2] / w]; }      // 点の重みでわって平面へ
// 円（3 次の元）→ 中心と半径。双対 σ = C* を −σ·e∞ = 1 にそろえると σ = up(c) − ½r²e∞、σ² = r²
function circleOf(C) {
  let s = CGA.dualOf(C), w = -CGA.inner(s, EINF)[0];
  if (!(Math.abs(w) > 1e-9 * CGA.norm(s))) return { line: true, n: [s[1], s[2]], d: s[4] + s[8] };   // 直線（中心が無限遠）
  s = CGA.smul(s, 1 / w);
  return { c: [s[1], s[2]], r2: CGA.gp(s, s)[0] };
}
// 点対 T（2 次の元）→ 2 つの点。T² < 0 なら交わらない
function pairOf(T) {
  let t2 = CGA.gp(T, T)[0]; if (t2 < -1e-9) return null;
  let rt = Math.sqrt(Math.max(0, t2)), ei = CGA.lc(EINF, T);
  return [1, -1].map((s) => down(CGA.gp(CGA.add(T, CGA.scalar(s * rt)), ei)));
}
// くらべる：ふつうの解析幾何（外心の公式、直線と円の交点の 2 次方程式）
function circumcenter(a, b, c) {
  let d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])), s = (p) => p[0] * p[0] + p[1] * p[1];
  let ux = (s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, uy = (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d;
  return [ux, uy, Math.hypot(a[0] - ux, a[1] - uy)];
}
function lineCircle(p, q, cx, cy, r) {
  let dx = q[0] - p[0], dy = q[1] - p[1], fx = p[0] - cx, fy = p[1] - cy, A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - r * r, D = B * B - 4 * A * C;
  if (D < 0) return null;
  return [-1, 1].map((s) => { let t = (-B + s * Math.sqrt(D)) / (2 * A); return [p[0] + t * dx, p[1] + t * dy]; });
}
function toPx(p) { return [width * 0.42 + p[0] * unitPx, height * 0.56 - p[1] * unitPx]; }

function draw() {
  background(14, 14, 18);
  if (auto) { tt += 0.01; lps[0][1] = -2 + 1.6 * Math.sin(tt); lps[1][1] = 0.8 + 1.6 * Math.cos(tt * 0.7); }
  stroke(30); strokeWeight(1); for (let k = -8; k <= 8; k++) { let a = toPx([k, -6]), b = toPx([k, 6]), c = toPx([-8, k]), d = toPx([8, k]); line(a[0], a[1], b[0], b[1]); line(c[0], c[1], d[0], d[1]); }
  let P = cps.map(up), Cir = CGA.wedge(P[0], P[1], P[2]), Lin = CGA.wedge(up(lps[0]), up(lps[1]), EINF);
  let ci = circleOf(Cir), T = CGA.meet(Cir, Lin), pts = ci.line ? null : pairOf(T);
  // 円（または 3 点が一直線なら直線）
  noFill(); stroke(VIO); strokeWeight(3);
  if (!ci.line && ci.r2 > 0 && ci.r2 < 400) { let c = toPx(ci.c); circle(c[0], c[1], 2 * Math.sqrt(ci.r2) * unitPx); noStroke(); fill(VIO); circle(c[0], c[1], 9); }
  if (ci.line) { let u = [cps[1][0] - cps[0][0], cps[1][1] - cps[0][1]], a1 = toPx([cps[0][0] - 9 * u[0], cps[0][1] - 9 * u[1]]), a2 = toPx([cps[0][0] + 9 * u[0], cps[0][1] + 9 * u[1]]); line(a1[0], a1[1], a2[0], a2[1]); }
  // 直線 P∧Q∧e∞
  let d = [lps[1][0] - lps[0][0], lps[1][1] - lps[0][1]], a = toPx([lps[0][0] - 9 * d[0], lps[0][1] - 9 * d[1]]), b = toPx([lps[0][0] + 9 * d[0], lps[0][1] + 9 * d[1]]);
  stroke(CYA); strokeWeight(2.5); line(a[0], a[1], b[0], b[1]);
  // 交わり（点対）
  if (pts) for (let p of pts) { let s = toPx(p); noFill(); stroke(GOLD); strokeWeight(3); circle(s[0], s[1], 22); }
  // 4 点目：P4∧円 = 0 なら同じ円の上
  let on4 = CGA.wedge(up(p4), Cir), dev = CGA.norm(on4) / Math.max(1e-9, CGA.norm(Cir));
  for (let p of cps) { let s = toPx(p); noStroke(); fill(255); circle(s[0], s[1], 15); }
  for (let p of lps) { let s = toPx(p); noStroke(); fill(CYA); circle(s[0], s[1], 15); }
  let s4 = toPx(p4); noStroke(); fill(dev < 0.02 ? GOLD : [140, 140, 150]); circle(s4[0], s4[1], 15);
  // ---- 文字
  fill(SIL); textSize(18); textAlign(LEFT, BASELINE);
  text('ドラッグ：白（円の 3 点）・水色（直線の 2 点）・黄（4 点目）　C：比較 ' + (showCmp ? 'ON' : 'off') + '　スペース：自動　R：元にもどす', 20, 34);
  textSize(15); let y = 62, row = (s, c) => { fill(c || SIL); text(s, 20, y); y += 23; };
  row('up(x) = x + ½|x|² e∞ + e0　　up(x)·up(y) = −½|x − y|²（内積が距離になる）　2 点の外積 P∧Q = 点対', SIL);
  row('円 C = P1∧P2∧P3 = ' + CGA.str(Cir, 2), VIO);
  if (ci.line) row('3 点が一直線：双対 σ の e∞ との内積が 0 → 中心が無限遠 = 直線', [255, 120, 120]);
  else {
    row('C の双対 σ = ' + CGA.str(CGA.smul(CGA.dualOf(Cir), -1 / CGA.inner(CGA.dualOf(Cir), EINF)[0]), 3) + '　→ 中心 (' + ci.c.map((x) => x.toFixed(4)).join(', ') + ')、半径 √σ² = ' + Math.sqrt(Math.max(0, ci.r2)).toFixed(4), VIO);
    if (showCmp) { let cc = circumcenter(...cps); row('外心の公式（解析幾何）：中心 (' + cc[0].toFixed(4) + ', ' + cc[1].toFixed(4) + ')、半径 ' + cc[2].toFixed(4) + '　→ 一致', SIL); }
  }
  row('直線 L = P∧Q∧e∞ = ' + CGA.str(Lin, 2), CYA);
  if (!ci.line) {
    if (pts) {
      row('交わり C ∨ L = 点対 → (' + pts[0].map((x) => x.toFixed(3)).join(', ') + ') と (' + pts[1].map((x) => x.toFixed(3)).join(', ') + ')', GOLD);
      if (showCmp) { let cc = circumcenter(...cps), lc2 = lineCircle(lps[0], lps[1], cc[0], cc[1], cc[2]); if (lc2) row('2 次方程式で解いた交点：(' + lc2[0].map((x) => x.toFixed(3)).join(', ') + ') と (' + lc2[1].map((x) => x.toFixed(3)).join(', ') + ')', SIL); }
    } else row('点対 T の T² < 0 → 円と直線は交わらない（虚の点対）', [255, 120, 120]);
  }
  row('4 点目：|P4∧C| / |C| = ' + dev.toFixed(4) + (dev < 0.02 ? '　→ 同じ円の上（共円）！' : '　（0 なら同じ円の上）'), dev < 0.02 ? GOLD : [150, 150, 150]);
  fill(150); textSize(14); text('3 次元版は Cl(4,1)（32 成分）：4 点の外積で球、球と平面の交わりで円……同じ式がそのまま使える', 20, height - 40);
  drawSelfTest(width - 170, height - 14);
}

function mousePressed() {
  drag = null; let best = 24;
  for (let p of [...cps, ...lps, p4]) { let s = toPx(p), d = Math.hypot(mouseX - s[0], mouseY - s[1]); if (d < best) { best = d; drag = p; } }
}
function mouseDragged() { if (drag) { drag[0] = clampv((mouseX - width * 0.42) / unitPx, -7, 7); drag[1] = clampv((height * 0.56 - mouseY) / unitPx, -5, 5); } }
function mouseReleased() { drag = null; }
function keyPressed() {
  if (key === 'c' || key === 'C') showCmp = !showCmp;
  if (key === ' ') auto = !auto;
  if (key === 'r' || key === 'R') { cps = [[-2, -0.5], [1.5, 1.6], [2, -1.2]]; lps = [[-3.5, -2], [3.5, 0.8]]; p4 = [0.2, 2.2]; auto = false; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(12);
  check('e∞² = 0、e0² = 0、e0·e∞ = −1', CGA.isZero(CGA.gp(EINF, EINF)) && CGA.isZero(CGA.gp(EO, EO)) && near(CGA.inner(EO, EINF)[0], -1));
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true;
  let rp = () => [rnd() * 6 - 3, rnd() * 6 - 3];
  for (let k = 0; k < 30; k++) {
    let x = rp(), yv = rp(), X = up(x);
    ok1 = ok1 && CGA.isZero(CGA.gp(X, X), 1e-10) && near(CGA.inner(X, up(yv))[0], -0.5 * ((x[0] - yv[0]) ** 2 + (x[1] - yv[1]) ** 2), 1e-10);
    let a = rp(), b = rp(), c = rp(), ci = circleOf(CGA.wedge(up(a), up(b), up(c))), cc = circumcenter(a, b, c);
    ok2 = ok2 && !ci.line && near(ci.c[0], cc[0], 1e-7 * Math.max(1, Math.abs(cc[0]))) && near(ci.c[1], cc[1], 1e-7 * Math.max(1, Math.abs(cc[1]))) && near(Math.sqrt(ci.r2), cc[2], 1e-7 * Math.max(1, cc[2]));
    let p = rp(), q = rp(), T = CGA.meet(CGA.wedge(up(a), up(b), up(c)), CGA.wedge(up(p), up(q), EINF)), pr = pairOf(T), an = lineCircle(p, q, cc[0], cc[1], cc[2]);
    if (!!pr !== !!an) ok3 = false;
    else if (pr) { let m1 = nearArr(pr[0], an[0], 1e-6) && nearArr(pr[1], an[1], 1e-6), m2 = nearArr(pr[0], an[1], 1e-6) && nearArr(pr[1], an[0], 1e-6); ok3 = ok3 && (m1 || m2); }
    let th = rnd() * 6.28, on = [cc[0] + cc[2] * Math.cos(th), cc[1] + cc[2] * Math.sin(th)];
    ok4 = ok4 && CGA.norm(CGA.wedge(up(on), CGA.wedge(up(a), up(b), up(c)))) < 1e-7 * CGA.norm(CGA.wedge(up(a), up(b), up(c)));
  }
  check('up(x)² = 0（点は「長さ 0」）、up(x)·up(y) = −½|x − y|²', ok1);
  check('3 点の外積の円：中心と半径 = 外心の公式（30 組）', ok2);
  check('円と直線の meet の点対 = 2 次方程式の交点（交わらないときもどちらも「なし」）', ok3);
  check('円の上の点 P は P∧C = 0', ok4);
  let pp = pairOf(CGA.wedge(up([1, 2]), up([-0.5, 0.3])));
  check('2 点の外積 P∧Q は点対：取り出すと元の 2 点', pp && ((nearArr(pp[0], [1, 2], 1e-9) && nearArr(pp[1], [-0.5, 0.3], 1e-9)) || (nearArr(pp[1], [1, 2], 1e-9) && nearArr(pp[0], [-0.5, 0.3], 1e-9))));
  check('一直線の 3 点 → 直線（中心が無限遠）', circleOf(CGA.wedge(up([0, 0]), up([1, 1]), up([3, 3]))).line === true);
  let C3 = makeAlgebra([1, 1, 1, 1, -1]), ei = C3.add(C3.blade(8), C3.blade(16)), eo = C3.smul(C3.sub(C3.blade(16), C3.blade(8)), 0.5);
  let up3 = (p) => C3.add(C3.vec([p[0], p[1], p[2], 0, 0]), C3.smul(ei, 0.5 * dot3(p, p)), eo), ctr = [1, -2, 0.5], rr = 2;
  let sph = C3.wedge(...[[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.6, 0, 0.8]].map((u) => up3(ctr.map((x, i) => x + rr * u[i])))), sg = C3.dualOf(sph);
  sg = C3.smul(sg, -1 / C3.inner(sg, ei)[0]);
  check('3 次元の Cl(4,1)（32 成分）：4 点の外積の球から中心 (1, −2, 0.5) と半径 2', nearArr([sg[1], sg[2], sg[4]], ctr, 1e-9) && near(Math.sqrt(C3.gp(sg, sg)[0]), rr, 1e-9));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 白い 3 点を一直線に並べると、円はどうなる？ 画面の文字は？
// 2. 水色の直線を円から離していくと、点対はどうなる？ ちょうど接するときは？
// 3. 黄色の 4 点目を紫の円の上にのせて、|P4∧C| が 0 になることを確かめよう
// 4. up(x)·up(y) = −½|x − y|² なので、内積だけで距離がわかる。2 点の距離を CGA.inner で計算してみよう
// 5. 円と円の交わりも CGA.meet(C1, C2) で点対になる。もう 1 つ円を足してみよう


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
