// ============================================
// 13 幾何代数で物理 ─ 角運動量は「面」L = r∧p、回転する物体の向きはローター
// 3 次元の教科書では角運動量は軸ベクトル r × p。でも本当は「r と p が掃く面」= 二重ベクトル r∧p（r × p = −I(r∧p)）
// 太陽のまわりの惑星（リープフロッグ法）で L が一定 = 面積速度一定（ケプラーの第 2 法則）。惑星の自転はローター R ← e^{−Iωdt/2} R
// ↑↓：最初の速さ / ← →：自転の速さ ω / A：同じ時間に掃く面積 / スペース：一時停止 / R：やり直す
// ============================================

const G2 = makeAlgebra([1, 1]);
const PS = G2.blade(3);
let v0 = 0.8;                            // ★ 最初の速さ（1 なら円軌道）
let omega = 2.5;                         // ★ 自転の角速度
const GM = 1, DT = 0.002, SUB = 10;      // ★ 重力の強さ、時間の刻み、1 フレームの刻みの数
let rr, vv, body, tSim, hist, paused = false, showArea = true, unitPx = 210;
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120];

function setup() { createCanvas(windowWidth, windowHeight); unitPx = Math.min(width, height) * 0.27; selfTest(); restart(); }
function restart() { rr = [1, 0]; vv = [0, v0]; body = G2.scalar(1); tSim = 0; hist = []; }
// リープフロッグ法（速度ベルレ）：中心力なら r∧p がぴったり保存される
function stepOrbit(r, v, dt) {
  let acc = (p) => { let d = Math.hypot(p[0], p[1]); return [(-GM * p[0]) / d ** 3, (-GM * p[1]) / d ** 3]; };
  let a = acc(r), vh = [v[0] + 0.5 * dt * a[0], v[1] + 0.5 * dt * a[1]], rn = [r[0] + dt * vh[0], r[1] + dt * vh[1]], an = acc(rn);
  return [rn, [vh[0] + 0.5 * dt * an[0], vh[1] + 0.5 * dt * an[1]]];
}
function angMom(r, v) { return G2.wedge(G2.vec(r), G2.vec(v)); }   // L = r∧p（質量 1）
function energy(r, v) { return 0.5 * (v[0] ** 2 + v[1] ** 2) - GM / Math.hypot(r[0], r[1]); }
function toPx(p) { return [width * 0.36 + p[0] * unitPx, height * 0.5 - p[1] * unitPx]; }

function draw() {
  background(14, 14, 18);
  if (!paused) for (let k = 0; k < SUB; k++) {
    [rr, vv] = stepOrbit(rr, vv, DT); tSim += DT;
    body = G2.gp(G2.expB(G2.smul(PS, (-omega * DT) / 2)), body);   // 自転：ローターを少しずつ掛ける
  }
  if (frameCount % 2 === 0) { hist.push([G2.wedge(G2.vec(rr), G2.vec(vv))[3], energy(rr, vv)]); if (hist.length > 400) hist.shift(); }
  // 軌道を先まで計算して描く（同じ方法で 1 周ぶん）
  let pts = [], r = rr, v = vv;
  for (let k = 0; k < 4000; k++) { [r, v] = stepOrbit(r, v, 0.004); if (k % 8 === 0) pts.push(toPx(r)); }
  noFill(); stroke(60); strokeWeight(1); polyline(pts);
  // 同じ時間に掃く扇形（面積 = |L|/2 × 時間）
  if (showArea) {
    let r2 = rr, v2 = vv;
    for (let s = 0; s < 6; s++) {
      let fan = [toPx([0, 0])];
      for (let k = 0; k <= 40; k++) { if (k) [r2, v2] = stepOrbit(r2, v2, 0.006); fan.push(toPx(r2)); }
      for (let k = 0; k < 100; k++) [r2, v2] = stepOrbit(r2, v2, 0.006);
      noStroke(); fill(GOLD[0], GOLD[1], GOLD[2], 40); beginShape(); for (let p of fan) vertex(p[0], p[1]); endShape(CLOSE);
    }
  }
  // 太陽と惑星、L = r∧v の平行四辺形
  let o = toPx([0, 0]), pr = toPx(rr), pv = toPx([rr[0] + vv[0] * 0.5, rr[1] + vv[1] * 0.5]), ph = toPx([vv[0] * 0.5, vv[1] * 0.5]), L = angMom(rr, vv);
  noStroke(); fill(VIO[0], VIO[1], VIO[2], 60); quad(o[0], o[1], pr[0], pr[1], pv[0], pv[1], ph[0], ph[1]);   // r∧(v/2) の平行四辺形
  fill(255, 200, 90); circle(o[0], o[1], 26);
  stroke(VIO); strokeWeight(1.5); line(o[0], o[1], pr[0], pr[1]);
  arrowS(pr[0], pr[1], pv[0], pv[1], color(CYA), 2.5);
  // 自転する惑星：棒の向き = ローター body で e1 を回したもの
  let ax = G2.vecOf(G2.sandwich(body, G2.blade(1))), rl = 0.12;
  stroke(255); strokeWeight(3); line(pr[0] - ax[0] * rl * unitPx, pr[1] + ax[1] * rl * unitPx, pr[0] + ax[0] * rl * unitPx, pr[1] - ax[1] * rl * unitPx);
  noStroke(); fill(CYA); circle(pr[0], pr[1], 14);
  // ---- 右：L とエネルギーのグラフ
  let gx = width * 0.66, gy = 150, gw = width * 0.3, gh = 130;
  plotHist(gx, gy, gw, gh, 0, 'L = r∧v の e12 成分（一定！）', VIO);
  plotHist(gx, gy + gh + 70, gw, gh, 1, 'エネルギー E = ½v² − GM/r', GOLD);
  // ---- 文字
  fill(SIL); textSize(18); textAlign(LEFT, BASELINE);
  text('↑↓：最初の速さ ' + v0.toFixed(2) + '　← →：自転 ω = ' + omega.toFixed(1) + '　A：面積 ' + (showArea ? 'ON' : 'off') + '　スペース：停止　R：やり直す', 20, 34);
  textSize(16); let y = 64, row = (s, c) => { fill(c || SIL); text(s, 20, y); y += 25; };
  row('L = r∧v = ' + G2.str(L, 6) + '　（二重ベクトル：r と v が作る平行四辺形の面積）', VIO);
  let cr = cross3([rr[0], rr[1], 0], [vv[0], vv[1], 0]);
  row('3 次元の軸ベクトルなら r × v = (0, 0, ' + cr[2].toFixed(6) + ') = −I(r∧v)　→ 同じ数', SIL);
  row('惑星の向き：ローター R = ' + G2.str(body, 3) + '　R R~ = ' + G2.gp(body, G2.rev(body))[0].toFixed(12), [255, 255, 255]);
  row('黄色の扇形 = 同じ時間に掃く面積（どれも |L|/2 × 時間）', GOLD);
  drawSelfTest(width - 170, height - 14);
}

function plotHist(x, y, w, h, k, title, col) {
  noStroke(); fill(SIL); textSize(14); text(title, x, y - 8);
  noFill(); stroke(60); rect(x, y, w, h);
  if (hist.length < 2) return;
  let vals = hist.map((e) => e[k]), mid = vals[vals.length - 1], dev = Math.max(...vals.map((v) => Math.abs(v - mid))), span = Math.max(1e-6, dev) * 1.3;
  if (k === 0) span = Math.max(span, Math.abs(mid) * 0.05);
  stroke(col); strokeWeight(2);
  polyline(vals.map((v, i) => [x + (i / 399) * w, y + h / 2 - ((v - mid) / span) * (h / 2)]));
  noStroke(); fill(170); textSize(12); text('今 ' + mid.toFixed(8) + '　ゆれ幅 ' + dev.toExponential(1), x, y + h + 16);
}

function keyPressed() {
  if (key === UP_ARROW) { v0 = Math.min(1.35, v0 + 0.05); restart(); }
  if (key === DOWN_ARROW) { v0 = Math.max(0.4, v0 - 0.05); restart(); }
  if (key === RIGHT_ARROW) omega = Math.min(12, omega + 0.5);
  if (key === LEFT_ARROW) omega = Math.max(-12, omega - 0.5);
  if (key === 'a' || key === 'A') showArea = !showArea;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') restart();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(13);
  let r = [1, 0], v = [0, 0.8], L0 = angMom(r, v)[3], E0 = energy(r, v), maxL = 0, maxE = 0, areas = [], prevY = r[1], crossT = [];
  for (let k = 1; k <= 20000; k++) {
    let rp = r;
    [r, v] = stepOrbit(r, v, DT);
    maxL = Math.max(maxL, Math.abs(angMom(r, v)[3] - L0)); maxE = Math.max(maxE, Math.abs(energy(r, v) - E0));
    if (k % 1000 === 1) areas.push(0);
    areas[areas.length - 1] += 0.5 * G2.wedge(G2.vec(rp), G2.vec(r))[3];
    if (prevY < 0 && r[1] >= 0) crossT.push(k * DT); prevY = r[1];
  }
  check('リープフロッグで 20000 歩：L = r∧v のずれ < 1e-12（角運動量の保存）', maxL < 1e-12);
  check('エネルギーのずれ < 1e-4（シンプレクティック法）', maxE < 1e-4);
  check('同じ時間に掃く面積は等しい（ケプラーの第 2 法則、1e-12）', areas.slice(0, -1).every((a) => near(a, areas[0], 1e-12)));
  let aSemi = -GM / (2 * E0), Tk = 2 * Math.PI * Math.pow(aSemi, 1.5) / Math.sqrt(GM);
  check('周期 = 2π a^{3/2}/√GM（ケプラーの第 3 法則、0.1%）', crossT.length >= 2 && near((crossT[1] - crossT[0]) / Tk, 1, 1e-3));
  let okX = true;
  for (let k = 0; k < 20; k++) { let a = [rnd() - 0.5, rnd() - 0.5], b = [rnd() - 0.5, rnd() - 0.5]; okX = okX && near(angMom(a, b)[3], cross3([...a, 0], [...b, 0])[2], 1e-15); }
  check('2 次元の r∧v の e12 成分 = 3 次元の r × v の z 成分', okX);
  let R = G2.scalar(1), w = 2.5, n = Math.round((2 * Math.PI) / (w * DT)), dtw = (2 * Math.PI) / (w * n);
  for (let k = 0; k < n; k++) R = G2.gp(G2.expB(G2.smul(PS, (-w * dtw) / 2)), R);
  check('ローターを ' + n + ' 回掛けて 1 回転：R = −1、R R~ = 1（1e-10）', G2.near(R, G2.scalar(-1), 1e-10) && near(G2.gp(R, G2.rev(R))[0], 1, 1e-10));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で最初の速さを変え、楕円の形が変わっても L のグラフが平らなままか確かめよう
// 2. 黄色の扇形の面積は同じ。太陽に近いときと遠いときで形はどう違う？
// 3. 速さ 1 で円軌道。√2 ≈ 1.41 をこえると？（↑ の上限を変えてみよう）
// 4. stepOrbit をオイラー法（r += v dt; v += a dt）に変えると、L とエネルギーはどうなる？
// 5. ← → で自転を速くしても公転は変わらない。向きをローターで持つと、何回まわっても R R~ = 1 のまま


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
