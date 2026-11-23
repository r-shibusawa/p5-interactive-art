// ============================================
// 06 3D の二重ベクトル ─ 回転の「面」B = a∧b と、その双対の「軸」
// 3 次元では面 B に垂直な向きが 1 つだけあるので、双対 B* = B I⁻¹ が軸ベクトルになる：a × b = −I(a∧b)
// でも 4 次元では面に垂直な向きが 2 次元分もある → 軸は決まらない。面 B ならどの次元でも同じ式で使える
// ドラッグ：視点を回す / 1 2 3：例 / ← →：b を回す / ↑↓：a を傾ける / スペース：自動 / 4：4 次元の例
// ============================================

const G3 = makeAlgebra([1, 1, 1]), G4 = makeAlgebra([1, 1, 1, 1]);
let angB = 1.1, tiltA = 0.25, preset = 1, auto = true, show4 = false;
let scl = 150;                           // ★ 長さ 1 のピクセル数
const VIO = [180, 130, 255], CYA = [90, 220, 240], GOLD = [255, 210, 120], GRN = [150, 220, 170];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  selfTest(); makeHud();
  camera(520, -380, 720, 0, 0, 0, 0, 1, 0);
}
// 数学の座標（右手系、z が上）→ p5 の WEBGL の座標（y が下）
function toGL(v) { return [v[0] * scl, -v[2] * scl, -v[1] * scl]; }
function vecs() {
  let a = [Math.cos(tiltA), 0, Math.sin(tiltA)], b;
  if (preset === 1) b = [Math.cos(angB) * 0.9, Math.sin(angB) * 0.9, 0.5];
  if (preset === 2) { a = [1, 0, 0]; b = [Math.cos(angB), Math.sin(angB), 0]; }
  if (preset === 3) b = [Math.cos(tiltA) + 0.15 * Math.cos(angB), 0.15 * Math.sin(angB), Math.sin(tiltA)];
  return [a.map((x) => x * 1.6), b.map((x) => x * 1.6)];
}

function draw() {
  background(14, 14, 18);
  orbitControl();
  if (auto) angB += 0.008;
  let [av, bv] = vecs(), a = G3.vec(av), b = G3.vec(bv);
  let B = G3.wedge(a, b), ax = G3.dualOf(B), axv = G3.vecOf(ax), cr = cross3(av, bv);
  // 座標軸
  strokeWeight(1);
  for (let k = 0; k < 3; k++) { let e = [0, 0, 0]; e[k] = 2.4; let p = toGL(e), q = toGL(e.map((x) => -x)); stroke(70); line(q[0], q[1], q[2], p[0], p[1], p[2]); }
  // 面 B = a∧b（平行四辺形）と、回る向き
  let o = [0, 0, 0], pa = toGL(av), pb = toGL(bv), pab = toGL([av[0] + bv[0], av[1] + bv[1], av[2] + bv[2]]);
  noStroke(); fill(VIO[0], VIO[1], VIO[2], 90);
  beginShape(); vertex(...o); vertex(...pa); vertex(...pab); vertex(...pb); endShape(CLOSE);
  stroke(VIO); strokeWeight(1.5); noFill();
  let c = [(av[0] + bv[0]) / 2, (av[1] + bv[1]) / 2, (av[2] + bv[2]) / 2], ring = [];
  let u = av.map((x) => x / len3(av)), w = bv.map((x, k) => x - dot3(bv, u) * u[k]), wl = len3(w) || 1;
  w = w.map((x) => x / wl);                           // 面の中の正規直交基底 u, w（a から b へ回る向き）
  for (let i = 0; i <= 30; i++) { let t = (i / 30) * 1.6 * Math.PI; ring.push(toGL(c.map((x, k) => x + 0.3 * (Math.cos(t) * u[k] + Math.sin(t) * w[k])))); }
  beginShape(); for (let p of ring) vertex(...p); endShape();
  arrow3(o, av, VIO); arrow3(o, bv, CYA);
  arrow3(o, axv, GOLD);                               // 双対 = 軸
  // 軸に垂直な円板（面の向きの別の見かた）
  hudSet('ドラッグ：視点　1 2 3：例（いま ' + preset + '）　← →：b を回す　↑↓：a を傾ける　スペース：自動　4：4 次元の例 ' + (show4 ? 'ON' : 'off') + '\n' +
    '<span style="color:#b482ff">a = (' + av.map((x) => x.toFixed(2)).join(', ') + ')</span>　<span style="color:#5adcf0">b = (' + bv.map((x) => x.toFixed(2)).join(', ') + ')</span>\n' +
    '<span style="color:#b482ff">B = a∧b = ' + G3.str(B, 3) + '　（面積 |B| = ' + G3.gradeSize(B, 2).toFixed(3) + '）</span>\n' +
    '<span style="color:#ffd278">双対 B* = B I⁻¹ = ' + G3.str(ax, 3) + '　← 面に垂直な軸（黄色の矢印）</span>\n' +
    '外積 a × b = (' + cr.map((x) => x.toFixed(3)).join(', ') + ')　→ −I(a∧b) と同じ\n' +
    'B の成分 e23・e13・e12 は「yz 面・xz 面・xy 面にどれだけ傾いているか」\n' +
    (show4 ? '<span style="color:#96dcaa">4 次元：B = e12 + e34 は B∧B = ' + G4.str(G4.wedge(G4.add(G4.blade(3), G4.blade(12)), G4.add(G4.blade(3), G4.blade(12)))) + ' ≠ 0 → 1 枚の面ではない（2 つの面で同時に回る）。\n  双対 B I⁻¹ = ' + G4.str(G4.dualOf(G4.add(G4.blade(3), G4.blade(12)))) + ' は二重ベクトル → 「軸ベクトル」は作れない</span>' : '<span style="color:#888">4 を押すと 4 次元の例</span>'));
}

// 3D の矢印（数学の座標で from → to）。矢じりは 4 本の短い線
function arrow3(from, to, col) {
  let p = toGL(from), q = toGL(to), d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d);
  stroke(col); strokeWeight(3); line(...p, ...q);
  if (L < 1) return;
  d = d.map((x) => x / L);
  let h = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = cross3(d, h), ul = len3(u); u = u.map((x) => x / ul);
  let w = cross3(d, u), hl = Math.min(18, L * 0.3);
  for (let s of [u, w, u.map((x) => -x), w.map((x) => -x)]) line(...q, ...q.map((x, k) => x - d[k] * hl + s[k] * hl * 0.4));
}

function keyPressed() {
  if (key >= '1' && key <= '3') preset = +key;
  if (key === '4') show4 = !show4;
  if (key === RIGHT_ARROW) angB += 0.1;
  if (key === LEFT_ARROW) angB -= 0.1;
  if (key === UP_ARROW) tiltA = Math.min(1.4, tiltA + 0.1);
  if (key === DOWN_ARROW) tiltA = Math.max(-1.4, tiltA - 0.1);
  if (key === ' ') auto = !auto;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(6);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true;
  for (let k = 0; k < 40; k++) {
    let a = G3.randVec(), b = G3.randVec(), B = G3.wedge(a, b), ax = G3.vecOf(G3.dualOf(B));
    ok1 = ok1 && nearArr(G3.vecOf(G3.smul(G3.gp(G3.pss, B), -1)), cross3(G3.vecOf(a), G3.vecOf(b)), 1e-12);
    ok2 = ok2 && near(dot3(ax, G3.vecOf(a)), 0, 1e-12) && near(dot3(ax, G3.vecOf(b)), 0, 1e-12) && near(len3(ax), G3.gradeSize(B, 2), 1e-12);
    let Br = G3.gradePart(G3.rand(), 2);
    ok3 = ok3 && G3.isZero(G3.wedge(Br, Br), 1e-12);
    ok4 = ok4 && G3.near(G3.undual(G3.dualOf(B)), B, 1e-12);
  }
  check('a × b = −I(a∧b)（40 組）', ok1);
  check('双対の軸 B I⁻¹ は a にも b にも垂直、長さ = 面積 |a∧b|', ok2);
  check('3 次元の二重ベクトルは必ず 1 枚の面（B∧B = 0）', ok3);
  check('双対をもどすと元どおり（(B I⁻¹) I = B）', ok4);
  let B4 = G4.add(G4.blade(3), G4.blade(12));
  check('4 次元の e12 + e34 は B∧B = 2 e1234 ≠ 0（1 枚の面ではない）', G4.near(G4.wedge(B4, B4), G4.blade(15, 2)));
  let s = 0.7, t = 1.3, Bst = G4.add(G4.blade(3, s), G4.blade(12, t));
  let ex = G4.expB(Bst), prod = G4.gp(G4.expB(G4.blade(3, s)), G4.expB(G4.blade(12, t)));
  check('4 次元：e^{s e12 + t e34}（級数で計算）= e^{s e12} e^{t e34}（2 つの面の回転の積）', G4.near(ex, prod, 1e-10));
  let R4 = G4.expB(G4.smul(Bst, -0.5)), x = G4.vec([1, 0, 1, 0]), y = G4.vecOf(G4.sandwich(R4, x));
  check('そのローターは e1 を e12 面で s、e3 を e34 面で t 回す（2 つの角度の 4 次元の回転）', nearArr(y, [Math.cos(s), Math.sin(s), Math.cos(t), Math.sin(t)], 1e-10));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 を押すと a と b は xy 平面の中。B のどの成分だけが残る？ 軸はどちら向き？
// 2. 3 を押すと a と b がほぼ平行。面積と軸の長さはどうなる？
// 3. ← → で b を a のまわりに回し、軸の向きと B の符号が一緒に変わることを見よう
// 4. 4 を押して 4 次元の例を読もう。「軸のまわりの回転」より「面の中の回転」が一般的な理由は？
// 5. scl を変えて大きさを調整しよう


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
