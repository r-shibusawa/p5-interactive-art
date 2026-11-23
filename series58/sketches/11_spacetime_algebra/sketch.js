// ============================================
// 11 時空の代数 ─ Cl(1,1)：γ0² = +1（時間）、γ1² = −1（空間）
// 時空のベクトル v = tγ0 + xγ1 の「長さ」v² = t² − x²。光（t = ±x）は v² = 0
// B = γ0γ1 は B² = +1 なので e^{−φB/2} = cosh(φ/2) − B sinh(φ/2)。R v R~ が回転ではなく「双曲回転」= ローレンツブースト
// ← →：ブースト φ1 / ↑↓：φ2 / C：2 つのブーストの合成 / マウス：出来事（点）の座標を両方の観測者で / R：元にもどす
// ============================================

const STA = makeAlgebra([1, -1], ['1', 'γ0', 'γ1', 'γ0γ1']);   // 時空の代数（1 + 1 次元）
const G0 = STA.blade(1), G1 = STA.blade(2), BB = STA.blade(3);
let phi1 = 0.55, phi2 = 0.4, compose = false;   // ★ ラピディティ（速さ v = tanh φ、光速 c = 1）
let unitPx = 95;
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function boost(phi) { return STA.expB(STA.smul(BB, -phi / 2)); }
function toPx(t, x) { return [width * 0.4 + x * unitPx, height * 0.56 - t * unitPx]; }
function tx(v) { return [v[1], v[2]]; }                          // マルチベクトル → (t, x)
function ev(t, x) { return STA.add(STA.smul(G0, t), STA.smul(G1, x)); }

function draw() {
  background(14, 14, 18);
  let R = compose ? STA.gp(boost(phi2), boost(phi1)) : boost(phi1), phi = compose ? phi1 + phi2 : phi1;
  let ext = 3.6;
  // 双曲線 t² − x² = ±1, ±4（ブーストしても動かない）
  noFill(); strokeWeight(1);
  for (let s2 of [1, 2]) for (let sg of [1, -1]) for (let side of [1, -1]) {
    let pts = [];
    for (let u = -2.2; u <= 2.2; u += 0.05) { let a = s2 * Math.cosh(u), b = s2 * Math.sinh(u); pts.push(sg > 0 ? toPx(side * a, b) : toPx(b, side * a)); }
    stroke(80, 80, 100); polyline(pts);
  }
  // 静止している観測者の格子（うすい）
  stroke(45); for (let k = -3; k <= 3; k++) { let a = toPx(-ext, k), b = toPx(ext, k), c = toPx(k, -ext), d = toPx(k, ext); line(a[0], a[1], b[0], b[1]); line(c[0], c[1], d[0], d[1]); }
  // 光円錐 t = ±x
  stroke(GOLD); strokeWeight(2); let l1 = toPx(-ext, -ext), l2 = toPx(ext, ext), l3 = toPx(-ext, ext), l4 = toPx(ext, -ext); line(l1[0], l1[1], l2[0], l2[1]); line(l3[0], l3[1], l4[0], l4[1]);
  // ブーストした観測者の格子：R γ0 R~（時間の軸）と R γ1 R~（空間の軸）
  let e0 = tx(STA.sandwich(R, G0)), e1 = tx(STA.sandwich(R, G1));
  strokeWeight(1);
  for (let k = -3; k <= 3; k++) {
    stroke(VIO[0], VIO[1], VIO[2], k === 0 ? 255 : 70); strokeWeight(k === 0 ? 3 : 1);
    let a = toPx(k * e1[0] - ext * e0[0], k * e1[1] - ext * e0[1]), b = toPx(k * e1[0] + ext * e0[0], k * e1[1] + ext * e0[1]); line(a[0], a[1], b[0], b[1]);
    stroke(CYA[0], CYA[1], CYA[2], k === 0 ? 255 : 70);
    a = toPx(k * e0[0] - ext * e1[0], k * e0[1] - ext * e1[1]); b = toPx(k * e0[0] + ext * e1[0], k * e0[1] + ext * e1[1]); line(a[0], a[1], b[0], b[1]);
  }
  let o = toPx(0, 0), p0 = toPx(e0[0], e0[1]), p1 = toPx(e1[0], e1[1]);
  arrowS(o[0], o[1], p0[0], p0[1], color(VIO), 3); arrowS(o[0], o[1], p1[0], p1[1], color(CYA), 3);
  noStroke(); fill(VIO); textSize(16); text('Rγ0R~（動く観測者の時間）', p0[0] + 8, p0[1]); fill(CYA); text('Rγ1R~（その人の「同時」）', p1[0] + 8, p1[1] + 18);
  // マウスの出来事：静止系の (t, x) と、動く観測者の (t', x')（R~ X R で座標を読む）
  let mt = (height * 0.56 - mouseY) / unitPx, mx = (mouseX - width * 0.4) / unitPx, info = '';
  if (Math.abs(mt) < ext && Math.abs(mx) < ext) {
    let X = ev(mt, mx), Xp = STA.sandwich(STA.rev(R), X), s2 = STA.gp(X, X)[0];
    noStroke(); fill(255); circle(mouseX, mouseY, 10);
    info = '出来事：静止系 (t, x) = (' + mt.toFixed(2) + ', ' + mx.toFixed(2) + ')　動く観測者 (t\', x\') = (' + Xp[1].toFixed(2) + ', ' + Xp[2].toFixed(2) + ')　X² = t² − x² = ' + s2.toFixed(3) + ' = t\'² − x\'² = ' + (Xp[1] ** 2 - Xp[2] ** 2).toFixed(3) + (Math.abs(s2) < 0.05 ? '（光の上）' : s2 > 0 ? '（時間的：因果がつながる）' : '（空間的）');
  }
  // ---- 文字
  fill(SIL); textSize(18); textAlign(LEFT, BASELINE);
  text('← →：φ1 = ' + phi1.toFixed(2) + '　↑↓：φ2 = ' + phi2.toFixed(2) + '　C：合成 ' + (compose ? 'ON' : 'off') + '　マウス：出来事　R：元にもどす', 20, 34);
  textSize(16); let y = 64, row = (s, c) => { fill(c || SIL); text(s, 20, y); y += 25; };
  row('B = γ0γ1、B² = ' + STA.str(STA.gp(BB, BB)) + '（回転の I² = −1 とちがって +1）　R = e^{−φB/2} = ' + STA.str(R, 3), VIO);
  row('動く観測者の速さ v = tanh φ = ' + Math.tanh(phi).toFixed(4) + ' c　（Rγ0R~ = ' + STA.str(STA.sandwich(R, G0), 3) + '）', VIO);
  if (compose) {
    let v1 = Math.tanh(phi1), v2 = Math.tanh(phi2);
    row('合成 R2R1 = e^{−(φ1+φ2)B/2}：ラピディティは足し算 ' + phi1.toFixed(2) + ' + ' + phi2.toFixed(2) + ' = ' + phi.toFixed(2), CYA);
    row('速さは (v1 + v2)/(1 + v1v2) = (' + v1.toFixed(3) + ' + ' + v2.toFixed(3) + ')/(1 + ' + (v1 * v2).toFixed(3) + ') = ' + ((v1 + v2) / (1 + v1 * v2)).toFixed(4) + '　（足し算ではない、c をこえない）', CYA);
  }
  row('黄色 = 光円錐（どの観測者にも同じ）、灰色の双曲線 = t² − x² が一定の線（ブーストで動かない）', GOLD);
  if (info) { fill(255); textSize(15); text(info, 20, height - 40); }
  drawSelfTest(width - 170, height - 14);
}

function keyPressed() {
  if (key === RIGHT_ARROW) phi1 += 0.05;
  if (key === LEFT_ARROW) phi1 -= 0.05;
  if (key === UP_ARROW) phi2 += 0.05;
  if (key === DOWN_ARROW) phi2 -= 0.05;
  phi1 = clampv(phi1, -2.5, 2.5); phi2 = clampv(phi2, -2.5, 2.5);
  if (key === 'c' || key === 'C') compose = !compose;
  if (key === 'r' || key === 'R') { phi1 = 0.55; phi2 = 0.4; compose = false; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(11);
  check('γ0² = +1、γ1² = −1、γ0γ1 = −γ1γ0、B² = (γ0γ1)² = +1', STA.near(STA.gp(G0, G0), STA.scalar(1)) && STA.near(STA.gp(G1, G1), STA.scalar(-1)) && STA.near(STA.gp(G0, G1), STA.smul(STA.gp(G1, G0), -1)) && STA.near(STA.gp(BB, BB), STA.scalar(1)));
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true, ok5 = true;
  for (let k = 0; k < 40; k++) {
    let a = rnd() * 4 - 2, b = rnd() * 4 - 2, R = boost(a), v = STA.randVec();
    ok1 = ok1 && STA.near(STA.gp(R, STA.rev(R)), STA.scalar(1), 1e-12);
    let g = STA.sandwich(R, G0);
    ok2 = ok2 && near(g[1], Math.cosh(a), 1e-12) && near(g[2], Math.sinh(a), 1e-12);
    ok3 = ok3 && STA.near(STA.gp(boost(b), R), boost(a + b), 1e-10);
    let va = Math.tanh(a), vb = Math.tanh(b), w = STA.sandwich(STA.gp(boost(b), R), G0);
    ok4 = ok4 && near(w[2] / w[1], (va + vb) / (1 + va * vb), 1e-12);
    ok5 = ok5 && near(STA.gp(STA.sandwich(R, v), STA.sandwich(R, v))[0], STA.gp(v, v)[0], 1e-10);
  }
  check('R R~ = 1（ローターの大きさは 1）', ok1);
  check('Rγ0R~ = cosh φ γ0 + sinh φ γ1 → 速さ v = tanh φ', ok2);
  check('R(φ2)R(φ1) = R(φ1 + φ2)（ラピディティは足し算）', ok3);
  check('合成した速さ = (v1 + v2)/(1 + v1v2)（相対論の速度の合成）', ok4);
  check('t² − x² はブーストで変わらない（不変間隔）', ok5);
  let light = STA.add(G0, G1), lb = STA.sandwich(boost(1.3), light);
  check('光のベクトル γ0 + γ1 はブーストしても v² = 0（光速はどの観測者にも同じ）、長さは e^φ 倍（ドップラー）', near(STA.gp(lb, lb)[0], 0, 1e-12) && near(lb[1], Math.exp(1.3), 1e-12));
  const ST4 = makeAlgebra([1, -1, -1, -1]), Rx = ST4.expB(ST4.smul(ST4.blade(3), -0.7));
  check('Cl(1,3)：x 方向のブーストで γ2, γ3 は変わらず、γ0 → cosh γ0 + sinh γ1', ST4.near(ST4.sandwich(Rx, ST4.blade(4)), ST4.blade(4), 1e-12) && ST4.near(ST4.sandwich(Rx, ST4.blade(8)), ST4.blade(8), 1e-12) && ST4.near(ST4.sandwich(Rx, ST4.blade(1)), ST4.add(ST4.blade(1, Math.cosh(1.4)), ST4.blade(2, Math.sinh(1.4))), 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. → を押し続けて φ1 を大きくしよう。紫と水色の軸は光円錐（黄色）に近づくが、こえる？
// 2. マウスを光円錐の上に置くと、両方の観測者で t² − x² はいくつ？
// 3. C で合成。φ1 = φ2 = 1（v ≈ 0.76c）を 2 回合成した速さは？ 1.52c になる？
// 4. 静止系で同時（t = 0）の 2 つの出来事は、動く観測者でも同時？（水色の線と比べる）
// 5. BB の符号をまちがえて回転にすると（STA を [1, 1] にすると）何が変わる？


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
