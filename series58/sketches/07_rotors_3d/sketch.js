// ============================================
// 07 3D のローター ─ R = e^{−Bθ/2}、v ↦ R v R~ で 3 次元の回転
// 05 の 2D とまったく同じ式。I を「回転の面」B（単位の二重ベクトル）に取りかえるだけ
// ローターの成分 (1, e23, e13, e12) は四元数と同じ掛け算をする（i = −e23, j = e13, k = −e12）→ シリーズ 57 へ
// ドラッグ：視点 / 1 2 3 4：回転の面 / ← →：角度 θ / スペース：自動 / C：2 つの回転の順番（R2R1 と R1R2）
// ============================================

const G3 = makeAlgebra([1, 1, 1]);
let planeNo = 4, theta = 0.6, auto = true, order = 0;
let scl = 140;                           // ★ 長さ 1 のピクセル数
// ★ 回す物体（紙飛行機）：頂点と辺
const PTS = [[1.4, 0, 0], [-0.8, 0.9, 0], [-0.8, -0.9, 0], [-0.6, 0, 0], [-0.8, 0, -0.45], [-0.8, 0, 0.35]];
const EDGES = [[0, 1], [1, 3], [3, 2], [2, 0], [0, 3], [0, 4], [4, 3], [3, 5], [5, 0]];
const PLANES = { 1: [3, 'e12（z 軸まわり）'], 2: [6, 'e23（x 軸まわり）'], 3: [5, 'e13（y 軸まわり、向きは −y）'] };
const VIO = [180, 130, 255], CYA = [90, 220, 240], GOLD = [255, 210, 120];

function setup() { createCanvas(windowWidth, windowHeight, WEBGL); selfTest(); makeHud(); camera(560, -400, 760, 0, 0, 0, 0, 1, 0); }
function toGL(v) { return [v[0] * scl, -v[2] * scl, -v[1] * scl]; }
// 回転の面 B（単位の二重ベクトル）
function planeB() {
  if (planeNo <= 3) return G3.blade(PLANES[planeNo][0]);
  return G3.unit(G3.wedge(G3.vec([1, 0.3, 0.2]), G3.vec([0.1, 0.7, 0.9])));   // ★ 4：自由な面 a∧b
}
function rotorOf(B, th) { return G3.expB(G3.smul(B, -th / 2)); }

function draw() {
  background(14, 14, 18);
  orbitControl();
  if (auto) theta = (theta + 0.012) % (4 * Math.PI);
  let B = planeB(), R = rotorOf(B, theta), axis = G3.vecOf(G3.dualOf(B));   // B = n I → 軸 n = B I⁻¹（双対）
  if (order) {                                                                        // C：2 つの回転を合成
    let R1 = rotorOf(G3.blade(3), theta), R2 = rotorOf(G3.blade(6), Math.PI / 2);
    R = order === 1 ? G3.gp(R2, R1) : G3.gp(R1, R2);
  }
  strokeWeight(1);
  for (let k = 0; k < 3; k++) { let e = [0, 0, 0]; e[k] = 2.2; let p = toGL(e), q = toGL(e.map((x) => -x)); stroke(60); line(...q, ...p); }
  // 回転の面（円板）と軸
  if (!order) {
    let bv = [B[6], -B[5], B[3]], u = cross3(bv, Math.abs(bv[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]); u = u.map((x) => x / len3(u)); let w = cross3(bv, u);
    noStroke(); fill(VIO[0], VIO[1], VIO[2], 40);
    beginShape(); for (let i = 0; i < 48; i++) { let t = (i / 48) * 2 * Math.PI; vertex(...toGL(u.map((x, k) => 1.8 * (Math.cos(t) * x + Math.sin(t) * w[k])))); } endShape(CLOSE);
    stroke(GOLD); strokeWeight(2); line(...toGL(axis.map((x) => -2 * x)), ...toGL(axis.map((x) => 2 * x)));
  }
  // 元の物体（うすく）と、ローターで回した物体
  let rot = PTS.map((p) => G3.vecOf(G3.sandwich(R, G3.vec(p))));
  stroke(90); strokeWeight(1); for (let [i, j] of EDGES) line(...toGL(PTS[i]), ...toGL(PTS[j]));
  stroke(CYA); strokeWeight(3); for (let [i, j] of EDGES) line(...toGL(rot[i]), ...toGL(rot[j]));
  noStroke(); fill(VIO); for (let [i, j] of [[0, 1], [0, 2]]) { beginShape(); vertex(...toGL(rot[i])); vertex(...toGL(rot[j])); vertex(...toGL(rot[3])); endShape(CLOSE); }
  // 回転行列（ロドリゲスの式）で回した頂点 = 白い点（ローターの結果と重なる）
  if (!order) { let M = rodrigues(axis, theta); stroke(255); strokeWeight(9); for (let p of PTS) point(...toGL(matVec(M, p))); }
  // ---- 画面の文字
  let q = [R[0], -R[6], R[5], -R[3]];                       // 四元数 w + xi + yj + zk
  let tbl = qTable();
  hudSet('ドラッグ：視点　1 2 3 4：回転の面　← →：θ　スペース：自動 ' + (auto ? 'ON' : 'off') + '　C：合成 ' + ['off', 'R2R1（z 軸 → x 軸の順）', 'R1R2（逆の順）'][order] + '\n' +
    (order ? '<span style="color:#5adcf0">R1 = e12 面で θ、R2 = e23 面で 90°。R2R1 と R1R2 は違う → 3 次元の回転は順番が大事</span>\n' :
      '回転の面 B = ' + (planeNo <= 3 ? PLANES[planeNo][1] : G3.str(B, 3) + '（自由な面）') + '　θ = ' + (theta * 180 / Math.PI).toFixed(0) + '°\n') +
    '<span style="color:#b482ff">R = ' + (order ? '' : 'e^{−Bθ/2} = ') + G3.str(R, 3) + '　R R~ = ' + G3.str(G3.gp(R, G3.rev(R)), 3) + '</span>\n' +
    '四元数にすると q = ' + q[0].toFixed(3) + sg(q[1]) + 'i' + sg(q[2]) + 'j' + sg(q[3]) + 'k\n' +
    '白い点 = 回転行列（ロドリゲスの式）で回した頂点 → ローターの結果（水色）とぴったり重なる\n' +
    '<span style="color:#ffd278">i = −e23、j = e13、k = −e12 の掛け算表（幾何積で計算）：\n<span style="font-family:monospace">' + tbl + '</span></span>\n' +
    '<span style="color:#888">四元数と 3D の回転はシリーズ 57 でくわしく</span>');
}

function sg(x) { return (x < 0 ? ' − ' : ' + ') + Math.abs(x).toFixed(3); }
// 四元数の掛け算表を幾何積で作る
function qTable() {
  let u = [G3.scalar(1), G3.blade(6, -1), G3.blade(5), G3.blade(3, -1)], nm = ['1', 'i', 'j', 'k'];
  let name = (m) => { for (let s of [1, -1]) for (let k = 0; k < 4; k++) if (G3.near(m, G3.smul(u[k], s))) return (s < 0 ? '−' : '+') + nm[k]; return '?'; };
  let out = '     1    i    j    k\n';
  for (let a = 1; a < 4; a++) { out += '  ' + nm[a] + ' '; for (let b = 0; b < 4; b++) out += ' ' + name(G3.gp(u[a], u[b])).padStart(3, ' ') + ' '; out += '\n'; }
  return out.trimEnd();
}

function keyPressed() {
  if (key >= '1' && key <= '4') { planeNo = +key; order = 0; }
  if (key === RIGHT_ARROW) theta += 0.1;
  if (key === LEFT_ARROW) theta -= 0.1;
  if (key === ' ') auto = !auto;
  if (key === 'c' || key === 'C') order = (order + 1) % 3;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(7);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true;
  for (let k = 0; k < 30; k++) {
    let n = G3.unit(G3.randVec()), nv = G3.vecOf(n), B = G3.gp(n, G3.pss), th = rnd() * 12 - 6, R = rotorOf(B, th), v = G3.randVec();
    ok1 = ok1 && nearArr(G3.vecOf(G3.sandwich(R, v)), matVec(rodrigues(nv, th), G3.vecOf(v)), 1e-12);
    ok2 = ok2 && G3.near(G3.gp(R, G3.rev(R)), G3.scalar(1), 1e-12);
    let m = G3.unit(G3.randVec()), th2 = rnd() * 6, R2 = rotorOf(G3.gp(m, G3.pss), th2);
    let RM = matMul(rodrigues(G3.vecOf(m), th2), rodrigues(nv, th));
    ok3 = ok3 && nearArr(G3.vecOf(G3.sandwich(G3.gp(R2, R), v)), matVec(RM, G3.vecOf(v)), 1e-12);
    let a = G3.unit(G3.randVec()), b = G3.unit(G3.randVec()), Rab = G3.unit(G3.add(G3.scalar(1), G3.gp(b, a)));
    ok4 = ok4 && G3.near(G3.sandwich(Rab, a), b, 1e-10);
  }
  check('R v R~ = ロドリゲスの回転行列 × v（30 通り、B = n I）', ok1);
  check('R R~ = 1', ok2);
  check('ローターの積 R2R1 = 回転行列の積 M2M1', ok3);
  check('R = (1 + ba)/|1 + ba| は a を b に重ねる（2 本のベクトルからローター）', ok4);
  let qi = G3.blade(6, -1), qj = G3.blade(5), qk = G3.blade(3, -1), m1 = G3.scalar(-1);
  check('i² = j² = k² = ijk = −1（i = −e23, j = e13, k = −e12）', [G3.gp(qi, qi), G3.gp(qj, qj), G3.gp(qk, qk), G3.gp(qi, qj, qk)].every((x) => G3.near(x, m1)));
  check('ij = k、jk = i、ki = j、ji = −k（偶数部分 = 四元数）', G3.near(G3.gp(qi, qj), qk) && G3.near(G3.gp(qj, qk), qi) && G3.near(G3.gp(qk, qi), qj) && G3.near(G3.gp(qj, qi), G3.smul(qk, -1)));
  let Rz = rotorOf(G3.blade(3), 1), Rx = rotorOf(G3.blade(6), 1);
  check('e12 面と e23 面の回転は順番で結果が違う（R1R2 ≠ R2R1）、R(360°) = −1', !G3.near(G3.gp(Rz, Rx), G3.gp(Rx, Rz), 1e-3) && G3.near(rotorOf(G3.blade(3), 2 * Math.PI), m1, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 2 3 で面を変え、黄色の軸と紫の円板（回転の面）の関係を見よう
// 2. θ を 360° 回すと物体は元どおり。でも R はいくつ？（画面の R を見る）720° では？
// 3. C で順番を変えて、R2R1 と R1R2 で飛行機の向きが違うことを確かめよう
// 4. 画面の掛け算表を、i = e23, j = e13, k = e12（マイナスなし）で作るとどこが変わる？ planeB と qTable を書きかえて試そう
// 5. 4 の自由な面の a、b を変えてみよう。軸を一度も使わずに回転が決まっている


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
