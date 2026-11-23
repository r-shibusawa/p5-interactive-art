// ============================================
// 05 2D のローター ─ R = e^{−Iθ/2} = cos(θ/2) − I sin(θ/2) で v ↦ R v R~
// 回転を「サンドイッチ」で表す。R には θ の半分が入っている（両側から半分ずつ回す）
// 回転を続けるのはローターの掛け算 R2R1。θ = 360° で R = −1 になるが、回転としては元どおり（−1 が両側で打ち消す）
// ← →：θ1　↑↓：θ2　C：2 つの回転の合成　スペース：自動で回す　R：元にもどす
// ============================================

const G2 = makeAlgebra([1, 1]);
const PS = G2.blade(3);                 // I = e12
let th1 = 50, th2 = 70;                 // ★ 角度（度）
let unitPx = 95, compose = false, auto = false;
const SHAPE = [[0.3, 0], [2.2, 0], [2.2, 0.35], [1.4, 0.35], [1.4, 0.9], [0.3, 0.9]];   // ★ 回す図形
const VIO = [180, 130, 255], CYA = [90, 220, 240], SIL = [215, 220, 230], GOLD = [255, 210, 120];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function rotor(deg) { return G2.expB(G2.smul(PS, (-deg * Math.PI) / 180 / 2)); }   // e^{−Iθ/2}
function toPx(p) { return [width * 0.34 + p[0] * unitPx, height * 0.58 - p[1] * unitPx]; }

function draw() {
  background(14, 14, 18);
  if (auto) th1 = (th1 + 0.6) % 720;
  let R1 = rotor(th1), R2 = rotor(th2), Rt = compose ? G2.gp(R2, R1) : R1, tot = compose ? th1 + th2 : th1;
  stroke(35); strokeWeight(1); noFill(); for (let r = 1; r <= 3; r++) circle(toPx([0, 0])[0], toPx([0, 0])[1], 2 * r * unitPx);
  let o = toPx([0, 0]); stroke(70); line(o[0] - 3.3 * unitPx, o[1], o[0] + 3.3 * unitPx, o[1]); line(o[0], o[1] - 3.3 * unitPx, o[0], o[1] + 3.3 * unitPx);
  let vs = SHAPE.map((p) => G2.vec(p));
  stroke(GOLD[0], GOLD[1], GOLD[2], 120); strokeWeight(1.5); fill(GOLD[0], GOLD[1], GOLD[2], 25); polyline(vs.map((v) => toPx(G2.vecOf(v))), true);
  if (compose) { stroke(CYA[0], CYA[1], CYA[2], 120); fill(CYA[0], CYA[1], CYA[2], 25); polyline(vs.map((v) => toPx(G2.vecOf(G2.sandwich(R1, v)))), true); }
  // ローターのサンドイッチで回した図形
  stroke(VIO); strokeWeight(2.5); fill(VIO[0], VIO[1], VIO[2], 70); polyline(vs.map((v) => toPx(G2.vecOf(G2.sandwich(Rt, v)))), true);
  // 回転行列で回した図形（点線）
  let M = rotMat2((tot * Math.PI) / 180); stroke(255); strokeWeight(1); noFill(); drawingContext.setLineDash([4, 5]);
  polyline(SHAPE.map((p) => toPx(matVec(M, p))), true); drawingContext.setLineDash([]);
  // ---- 右：ローターの「ダイヤル」（スカラー, e12）の平面。R は −θ/2 の位置、ベクトルは θ の位置
  let dx = width * 0.8, dy = height * 0.56, dr = Math.min(150, width * 0.12);
  noFill(); stroke(80); circle(dx, dy, 2 * dr); line(dx - dr - 20, dy, dx + dr + 20, dy); line(dx, dy - dr - 20, dx, dy + dr + 20);
  let rp = [dx + Rt[0] * dr, dy - Rt[3] * dr], va = (tot * Math.PI) / 180, vp = [dx + Math.cos(va) * dr * 0.7, dy - Math.sin(va) * dr * 0.7];
  arrowS(dx, dy, rp[0], rp[1], color(VIO), 3); arrowS(dx, dy, vp[0], vp[1], color(GOLD), 2);
  noStroke(); fill(VIO); textSize(15); text('R', rp[0] + 8, rp[1] - 6); 
  fill(150); textSize(13); textAlign(CENTER, BASELINE);
  text('紫 = R（横 = スカラー部、たて = e12 部）、黄 = 回したベクトル', dx, dy + dr + 40); text('R は −θ/2 の所。θ が 360° 回る間に R は半周', dx, dy + dr + 58); textAlign(LEFT, BASELINE);
  // ---- 文字
  fill(SIL); textSize(18);
  text('← →：θ1 = ' + th1.toFixed(0) + '°　↑↓：θ2 = ' + th2 + '°　C：合成 ' + (compose ? 'ON' : 'off') + '　スペース：自動 ' + (auto ? 'ON' : 'off') + '　R：元にもどす', 20, 34);
  textSize(16); let y = 64, row = (s, c) => { fill(c || SIL); text(s, 20, y); y += 25; };
  row('R1 = e^{−Iθ1/2} = ' + G2.str(R1, 3) + '　= cos(' + (th1 / 2).toFixed(1) + '°) − I sin(' + (th1 / 2).toFixed(1) + '°)', VIO);
  if (compose) {
    row('R2 = ' + G2.str(R2, 3) + '　合成 R2R1 = ' + G2.str(Rt, 3), CYA);
    row('= e^{−I(θ1+θ2)/2} = ' + G2.str(rotor(th1 + th2), 3) + '　→ 角度は足し算（' + th1.toFixed(0) + '° + ' + th2 + '° = ' + tot.toFixed(0) + '°）', CYA);
  }
  row('R R~ = ' + G2.str(G2.gp(Rt, G2.rev(Rt)), 3) + '（R~ は R の逆回転。長さを変えない）　紫 = R v R~、白の点線 = 回転行列 [[cos, −sin], [sin, cos]]', SIL);
  if (Math.abs(((tot % 720) + 720) % 720 - 360) < 1) row('θ = 360°：R = −1 なのに図形は元どおり！（R v R~ = (−1)v(−1) = v）', GOLD);
  drawSelfTest(width - 170, height - 14);
}

function keyPressed() {
  if (key === RIGHT_ARROW) th1 = Math.round(th1 + 5);
  if (key === LEFT_ARROW) th1 = Math.round(th1 - 5);
  if (key === UP_ARROW) th2 = Math.min(360, th2 + 5);
  if (key === DOWN_ARROW) th2 = Math.max(-360, th2 - 5);
  th1 = clampv(th1, -720, 720);
  if (key === 'c' || key === 'C') compose = !compose;
  if (key === ' ') auto = !auto;
  if (key === 'r' || key === 'R') { th1 = 50; th2 = 70; compose = false; auto = false; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(5);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true;
  for (let k = 0; k < 40; k++) {
    let a = rnd() * 720 - 360, b = rnd() * 720 - 360, v = G2.randVec(), R = rotor(a);
    ok1 = ok1 && nearArr(G2.vecOf(G2.sandwich(R, v)), matVec(rotMat2((a * Math.PI) / 180), G2.vecOf(v)), 1e-12);
    ok2 = ok2 && G2.near(G2.gp(R, G2.rev(R)), G2.scalar(1), 1e-12);
    ok3 = ok3 && G2.near(G2.gp(rotor(b), R), rotor(a + b), 1e-12);
    let t = (a * Math.PI) / 360;
    ok4 = ok4 && G2.near(R, G2.add(G2.scalar(Math.cos(t)), G2.smul(PS, -Math.sin(t))), 1e-12) && G2.near(G2.expB(G2.smul(PS, -t), true), R, 1e-10);
  }
  check('R v R~ = 回転行列 × v（40 通りの角度）', ok1);
  check('R R~ = 1', ok2);
  check('R(θ2) R(θ1) = R(θ1 + θ2)（回転の合成 = ローターの積）', ok3);
  check('e^{−Iθ/2} = cos(θ/2) − I sin(θ/2)（閉じた式と級数が一致）', ok4);
  let v = G2.vec([0.3, 0.8]);
  check('R(360°) = −1 だが R v R~ = v、R(720°) = +1', G2.near(rotor(360), G2.scalar(-1), 1e-12) && G2.near(G2.sandwich(rotor(360), v), v, 1e-12) && G2.near(rotor(720), G2.scalar(1), 1e-12));
  let u = G2.vec([1, 0]), w = G2.vec([Math.cos(0.9), Math.sin(0.9)]);
  check('2 本の単位ベクトルの積 R = wu は 2 × 0.9 rad の回転（04 の鏡の合成と同じ）', nearArr(G2.vecOf(G2.sandwich(G2.gp(w, u), G2.vec([0, 1]))), [-Math.sin(1.8), Math.cos(1.8)], 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. → を押し続けて θ1 = 360° にしよう。右のダイヤルの R はどこ？ 図形は？
// 2. C で合成。θ1 + θ2 と合成 R2R1 の角度が一致することを確かめよう
// 3. 2 次元の回転は順番を変えても同じ（R1R2 = R2R1）。3 次元ではどうだろう？（07 へ）
// 4. ローターの式に θ/2 が入っているのはなぜ？ R v R~ の R と R~ がそれぞれ何度ずつ回している？
// 5. SHAPE の点を変えて、自分の図形を回してみよう


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
