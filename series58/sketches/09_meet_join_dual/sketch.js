// ============================================
// 09 双対と交わり ─ 点・直線・平面を外積で作り、双対で交わりを計算する
// 点 p は 4 次元のベクトル P = p + e4（同次座標。シリーズ 39 の射影幾何と同じ考え）。直線 = P∧Q、平面 = P∧Q∧R（結び = join）
// 交わり（meet）は「双対をとって ∧ して双対をもどす」：A∨B = ((A I⁻¹)∧(B I⁻¹)) I。2 平面 → 直線、平面と直線 → 点
// ドラッグ：視点 / ← →：平面 1 を傾ける / ↑↓：平面 2 を傾ける / W S：直線を動かす / P：平面 2 を平面 1 と平行に / スペース：自動
// ============================================

const G4 = makeAlgebra([1, 1, 1, 1]);   // e1 e2 e3 = 空間、e4 = 同次座標の「重み」
let tilt1 = 0.25, tilt2 = -0.7, lineOff = 0, makePar = false, auto = true, tt = 0;
let scl = 120;                           // ★ 長さ 1 のピクセル数
const VIO = [180, 130, 255], CYA = [90, 220, 240], GOLD = [255, 210, 120], PINK = [255, 150, 200];

function setup() { createCanvas(windowWidth, windowHeight, WEBGL); selfTest(); makeHud(); camera(600, -420, 820, 0, 0, 0, 0, 1, 0); }
function toGL(v) { return [v[0] * scl, -v[2] * scl, -v[1] * scl]; }
function pt(p) { return G4.vec([p[0], p[1], p[2], 1]); }                 // 点 → 同次座標
function ptOf(X) { let v = G4.vecOf(X); return Math.abs(v[3]) < 1e-9 ? null : [v[0] / v[3], v[1] / v[3], v[2] / v[3]]; }
function addv(p, q, s) { return p.map((x, i) => x + (s === undefined ? 1 : s) * q[i]); }
// 法線 n と高さ h の平面の上の 3 点（これを ∧ でつなぐ）
function planePts(n, h) {
  let u = cross3(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]); u = u.map((x) => x / len3(u)); let w = cross3(n, u), c = n.map((x) => x * h);
  return [c, addv(c, u), addv(c, w), u, w];
}
// 直線 L（二重ベクトル）→ 向き d と、原点にいちばん近い点
function lineOf(L) {
  let d = [-L[9], -L[10], -L[12]], m = [L[6], -L[5], L[3]], dd = dot3(d, d);
  if (dd < 1e-12) return null;
  return { d: d.map((x) => x / Math.sqrt(dd)), p: cross3(d, m).map((x) => x / dd) };
}

function draw() {
  background(14, 14, 18);
  orbitControl();
  if (auto) { tt += 0.01; lineOff = 0.8 * Math.sin(tt); }
  let n1 = [Math.sin(tilt1), 0, Math.cos(tilt1)], n2 = makePar ? n1 : [0, Math.sin(tilt2), Math.cos(tilt2)];
  let h1 = 0, h2 = makePar ? 1 : 0.3;
  let [a1, b1, c1, u1, w1] = planePts(n1, h1), [a2, b2, c2, u2, w2] = planePts(n2, h2);
  let P1 = G4.wedge(pt(a1), pt(b1), pt(c1)), P2 = G4.wedge(pt(a2), pt(b2), pt(c2));   // 平面 = 3 点の結び
  let q1 = [-1.6 + lineOff, 0.6, 1.8], q2 = [1.2, -0.5 + lineOff, -1.6], Ln = G4.wedge(pt(q1), pt(q2));   // 直線 = 2 点の結び
  let L12 = G4.meet(P1, P2), X = G4.meet(P1, Ln), ln = lineOf(L12), xp = ptOf(X);
  // 座標軸
  strokeWeight(1); for (let k = 0; k < 3; k++) { let e = [0, 0, 0]; e[k] = 2.4; stroke(55); line(...toGL(e.map((x) => -x)), ...toGL(e)); }
  // 交線（2 平面の meet）
  if (ln) { stroke(GOLD); strokeWeight(4); line(...toGL(addv(ln.p, ln.d, -3)), ...toGL(addv(ln.p, ln.d, 3))); }
  // 直線と、平面 1 との交点
  stroke(PINK); strokeWeight(2.5); line(...toGL(addv(q1, addv(q2, q1, -1), -0.4)), ...toGL(addv(q1, addv(q2, q1, -1), 1.4)));
  if (xp && len3(xp) < 20) { push(); translate(...toGL(xp)); noStroke(); fill(255); sphere(9); pop(); }
  // 平面（四角い板）：半透明なので最後に描く
  for (let [c, u, w, col] of [[a1, u1, w1, VIO], [a2, u2, w2, CYA]]) {
    noStroke(); fill(col[0], col[1], col[2], 55); let s = 2.2;
    beginShape(); for (let [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) vertex(...toGL(addv(addv(c, u, i * s), w, j * s))); endShape(CLOSE);
    stroke(col[0], col[1], col[2], 160); strokeWeight(1); noFill();
    beginShape(); for (let [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) vertex(...toGL(addv(addv(c, u, i * s), w, j * s))); endShape(CLOSE);
  }
  // ---- 画面の文字
  let lineMsg = G4.isZero(L12, 1e-9) ? '同じ平面：meet = 0（交線は 1 本に決まらない）' : !ln ? '平行：meet = ' + G4.str(L12, 2) + '（e_i e4 の成分が 0 → 交線は無限遠）' : '交線（黄）：向き (' + ln.d.map((x) => x.toFixed(3)).join(', ') + ')　法線の外積 n1×n2 と平行';
  hudSet('ドラッグ：視点　← →：平面 1　↑↓：平面 2　W S：直線　P：平行 ' + (makePar ? 'ON' : 'off') + '　スペース：自動\n' +
    '<span style="color:#b482ff">平面 1 = P∧Q∧R = ' + G4.str(P1, 2) + '</span>\n' +
    '<span style="color:#b482ff">双対 (平面 1) I⁻¹ = ' + G4.str(G4.dualOf(P1), 2) + '　← (法線, −距離) のベクトル</span>\n' +
    '<span style="color:#5adcf0">平面 2 = ' + G4.str(P2, 2) + '</span>\n' +
    '<span style="color:#ffd278">平面 1 ∨ 平面 2 = ' + G4.str(L12, 3) + '\n' + lineMsg + '</span>\n' +
    '<span style="color:#ff96c8">直線 = P∧Q = ' + G4.str(Ln, 2) + '\n' +
    '平面 1 ∨ 直線 = ' + G4.str(X, 3) + (xp ? '　→ 点 (' + xp.map((x) => x.toFixed(3)).join(', ') + ')（白い球）' : '　→ e4 の成分 0：直線は平面と平行') + '</span>\n' +
    (xp ? '確かめ：点∧平面 1 = ' + G4.str(G4.wedge(pt(xp), P1), 6) + '、点∧直線 = ' + G4.str(G4.wedge(pt(xp), Ln), 6) + '（0 = 上にのっている）' : ''));
}

function keyPressed() {
  if (key === RIGHT_ARROW) tilt1 += 0.08;
  if (key === LEFT_ARROW) tilt1 -= 0.08;
  if (key === UP_ARROW) tilt2 += 0.08;
  if (key === DOWN_ARROW) tilt2 -= 0.08;
  tilt1 = clampv(tilt1, -1.4, 1.4); tilt2 = clampv(tilt2, -1.4, 1.4);
  if (key === 'w' || key === 'W') { auto = false; lineOff = Math.min(2, lineOff + 0.1); }
  if (key === 's' || key === 'S') { auto = false; lineOff = Math.max(-2, lineOff - 0.1); }
  if (key === 'p' || key === 'P') makePar = !makePar;
  if (key === ' ') auto = !auto;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(9);
  let rv = () => [rnd() * 4 - 2, rnd() * 4 - 2, rnd() * 4 - 2];
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true;
  for (let k = 0; k < 30; k++) {
    let A = [rv(), rv(), rv()], B = [rv(), rv(), rv()], P1 = G4.wedge(...A.map(pt)), P2 = G4.wedge(...B.map(pt));
    let n1 = cross3(addv(A[1], A[0], -1), addv(A[2], A[0], -1)), n2 = cross3(addv(B[1], B[0], -1), addv(B[2], B[0], -1));
    let ln = lineOf(G4.meet(P1, P2));
    let on = (p, P) => G4.isZero(G4.wedge(pt(p), P), 1e-8 * Math.max(1, G4.norm(P)));
    ok1 = ok1 && ln && on(ln.p, P1) && on(ln.p, P2) && on(addv(ln.p, ln.d), P1) && on(addv(ln.p, ln.d), P2);
    let cr = cross3(n1, n2), cl = len3(cr);
    ok2 = ok2 && near(Math.abs(dot3(ln.d, cr.map((x) => x / cl))), 1, 1e-9);
    let q1 = rv(), q2 = rv(), X = ptOf(G4.meet(P1, G4.wedge(pt(q1), pt(q2))));
    let dq = addv(q2, q1, -1), t = dot3(n1, addv(A[0], q1, -1)) / dot3(n1, dq), ana = addv(q1, dq, t);   // 解析的な交点
    ok3 = ok3 && X && nearArr(X, ana, 1e-8 * Math.max(1, len3(ana)));
    let du = G4.vecOf(G4.dualOf(P1)), nn = cross3([du[0], du[1], du[2]], n1);
    ok4 = ok4 && len3(nn) < 1e-9 * Math.max(1, len3(n1) * len3(du));
  }
  check('2 平面の meet の直線は両方の平面の上（点∧平面 = 0）', ok1);
  check('交線の向き ∥ 法線の外積 n1 × n2', ok2);
  check('平面と直線の meet = 解析的な交点（直線の式を平面の式に代入）', ok3);
  check('平面の双対 Π I⁻¹ の空間部分 ∥ 法線', ok4);
  let Pz0 = G4.wedge(pt([0, 0, 0]), pt([1, 0, 0]), pt([0, 1, 0])), Pz1 = G4.wedge(pt([0, 0, 1]), pt([1, 0, 1]), pt([0, 1, 1]));
  let Lp = G4.meet(Pz0, Pz1);
  check('平行な平面：meet は 0 でないが e_i e4 成分が 0（無限遠の直線）、同じ平面なら 0', !G4.isZero(Lp) && lineOf(Lp) === null && G4.isZero(G4.meet(Pz0, Pz0)));
  check('平面に平行な直線：meet の e4 成分が 0（交点は無限遠）', ptOf(G4.meet(Pz0, G4.wedge(pt([0, 0, 2]), pt([1, 1, 2])))) === null);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. P で 2 つの平面を平行に。黄色の交線はどうなる？ 画面の meet の値は？
// 2. ← → と ↑↓ で平面を傾け、交線の向きが法線の外積 n1 × n2 になっていることを確かめよう
// 3. W S で直線を動かして、白い交点が平面 1 の上をすべることを見よう
// 4. 双対 Π I⁻¹ の 4 つの数は、平面の式 ax + by + cz = d のどれ？
// 5. 3 つの平面の交わり（点）は、meet を 2 回くり返せば計算できる。コードに足してみよう


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
