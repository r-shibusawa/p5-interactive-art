// ============================================
// 14 幾何代数の音 ─ マルチベクトルの 4 つの次数を 4 つの声部に
// M = (1 + a)(1 + b)(1 + c) を幾何積で計算し、スカラー・ベクトル・二重ベクトル・擬スカラー（三重ベクトル）の大きさで 4 つの音の音量を決める
// 二重ベクトル a∧b の向き（e12 の符号）で 3 度の音が長調 ⇔ 短調に変わる。音量は小さめから（全体の音量 MASTER は 0.2 以下）
// クリック：音 ON / ドラッグ：a・b の先 / ↑↓：c の傾き / スペース：自動で回す / M：消音 / R：元にもどす
// ============================================

const G3 = makeAlgebra([1, 1, 1]);
let va = [1.2, 0.3], vb = [0.2, 1.1];   // ★ 平面のベクトル a, b（z = 0）
let tiltC = 0.6, auto = false, tt = 0, muted = false, drag = -1;
let unitPx = 120;
const BASE = [110, 220, 329.63, 440];   // ★ 4 つの声部の音の高さ（スカラー・ベクトル・二重ベクトル・擬スカラー）
const GCOL = [[220, 220, 230], [90, 220, 240], [180, 130, 255], [255, 190, 110]];
const GNAME = ['スカラー', 'ベクトル', '二重ベクトル', '擬スカラー'];   // 次数 0〜3
const SIL = [215, 220, 230];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }
function cVec() { return [0.5 * Math.cos(tt * 0.7), 0.5 * Math.sin(tt * 0.7), Math.sin(tiltC)]; }
function multi(a, b, c) { let one = G3.scalar(1); return G3.gp(G3.add(one, a), G3.add(one, b), G3.add(one, c)); }
// 次数ごとの大きさ → 0〜1 の音量（合計 1）
function levels(M) { let g = [0, 1, 2, 3].map((k) => G3.gradeSize(M, k)), s = g.reduce((x, y) => x + y, 0); return s > 1e-12 && isFinite(s) ? g.map((x) => x / s) : [0, 0, 0, 0]; }
// 二重ベクトルの e12 成分が負なら 3 度を半音下げる（長調 → 短調）
function freqs(M) { return BASE.map((f, k) => (k === 2 && M[3] < 0 ? f * Math.pow(2, -1 / 12) : f)); }
function toPx(v) { return [width * 0.3 + v[0] * unitPx, height * 0.55 - v[1] * unitPx]; }

function draw() {
  background(14, 14, 18);
  if (auto) { tt += 0.01; let r1 = Math.hypot(...va), r2 = Math.hypot(...vb), a1 = Math.atan2(va[1], va[0]) + 0.006, a2 = Math.atan2(vb[1], vb[0]) - 0.011; va = [r1 * Math.cos(a1), r1 * Math.sin(a1)]; vb = [r2 * Math.cos(a2), r2 * Math.sin(a2)]; }
  let cv = cVec(), a = G3.vec([va[0], va[1], 0]), b = G3.vec([vb[0], vb[1], 0]), c = G3.vec(cv);
  let M = multi(a, b, c), lv = levels(M), fq = freqs(M);
  if (audioCtx) setVoices(muted ? [0, 0, 0, 0] : lv, fq);
  // ---- 左：a, b と a∧b の平行四辺形、c は斜めの矢印（z は上向きに少しずらして描く）
  stroke(35); strokeWeight(1); for (let r = 1; r <= 2; r++) { noFill(); let o = toPx([0, 0]); circle(o[0], o[1], 2 * r * unitPx); }
  let o = toPx([0, 0]), pa = toPx(va), pb = toPx(vb), pab = toPx([va[0] + vb[0], va[1] + vb[1]]), pc = toPx([cv[0] - cv[2] * 0.35, cv[1] + cv[2] * 0.75]);
  let w12 = M[3], col = GCOL[2];
  noStroke(); fill(col[0], col[1], col[2], w12 >= 0 ? 70 : 30); quad(o[0], o[1], pa[0], pa[1], pab[0], pab[1], pb[0], pb[1]);
  arrowS(o[0], o[1], pa[0], pa[1], color(GCOL[1]), 3); arrowS(o[0], o[1], pb[0], pb[1], color(90, 170, 255), 3); arrowS(o[0], o[1], pc[0], pc[1], color(GCOL[3]), 2);
  noStroke(); textSize(18); fill(GCOL[1]); text('a', pa[0] + 8, pa[1]); fill(90, 170, 255); text('b', pb[0] + 8, pb[1]); fill(GCOL[3]); text('c（z = ' + cv[2].toFixed(2) + '）', pc[0] + 8, pc[1]);
  // ---- 右：4 つの声部（次数ごとの大きさ = 音量）
  let bx = width * 0.58, by = height * 0.72, bw = Math.min(110, width * 0.08);
  for (let k = 0; k < 4; k++) {
    let x = bx + k * (bw + 24), h = lv[k] * height * 0.45;
    noStroke(); fill(35); rect(x, by - height * 0.45, bw, height * 0.45);
    fill(GCOL[k][0], GCOL[k][1], GCOL[k][2], 200 + 55 * Math.sin(frameCount * 0.02 * fq[k] / 110)); rect(x, by, bw, -h);
    fill(SIL); textSize(13); textAlign(CENTER, BASELINE);
    text(GNAME[k], x + bw / 2, by + 20); text(fq[k].toFixed(1) + ' Hz', x + bw / 2, by + 38); text((lv[k] * 100).toFixed(0) + '%', x + bw / 2, by - h - 6);
  }
  textAlign(LEFT, BASELINE);
  // ---- 文字
  fill(SIL); textSize(18);
  text((audioCtx ? (muted ? '消音中（M）' : '音 ON') : 'クリックで音 ON') + '　ドラッグ：a・b　↑↓：c の傾き　スペース：自動 ' + (auto ? 'ON' : 'off') + '　M：消音　R：元にもどす', 20, 34);
  textSize(15); let y = 62, row = (s, cl) => { fill(cl || SIL); text(s, 20, y); y += 23; };
  row('M = (1 + a)(1 + b)(1 + c) = ' + G3.str(M, 2), SIL);
  for (let k = 0; k < 4; k++) row('⟨M⟩' + k + ' = ' + G3.str(G3.gradePart(M, k), 2), GCOL[k]);
  row('a∧b の向き：' + (w12 >= 0 ? '左回り → 長調（3 度 = ' + BASE[2] + ' Hz）' : '右回り → 短調（3 度を半音下げる）') + '　擬スカラー部分 = a∧b∧c（体積）', [255, 210, 120]);
  drawSelfTest(width - 170, height - 14);
}

function mousePressed() {
  startAudio();
  drag = -1; let best = 28;
  [va, vb].forEach((v, i) => { let s = toPx(v), d = Math.hypot(mouseX - s[0], mouseY - s[1]); if (d < best) { best = d; drag = i; } });
}
function mouseDragged() {
  if (drag < 0) return;
  let v = [clampv((mouseX - width * 0.3) / unitPx, -2.2, 2.2), clampv((height * 0.55 - mouseY) / unitPx, -2.2, 2.2)];
  if (drag === 0) va = v; else vb = v;
}
function mouseReleased() { drag = -1; }
function keyPressed() {
  startAudio();
  if (key === UP_ARROW) tiltC = Math.min(1.5, tiltC + 0.1);
  if (key === DOWN_ARROW) tiltC = Math.max(-1.5, tiltC - 0.1);
  if (key === ' ') auto = !auto;
  if (key === 'm' || key === 'M') muted = !muted;
  if (key === 'r' || key === 'R') { va = [1.2, 0.3]; vb = [0.2, 1.1]; tiltC = 0.6; tt = 0; auto = false; }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(14);
  let ok1 = true, ok2 = true, ok3 = true, ok4 = true;
  for (let k = 0; k < 40; k++) {
    let a = G3.randVec(), b = G3.randVec(), c = G3.randVec(), one = G3.scalar(1), M = multi(a, b, c);
    ok1 = ok1 && G3.near(G3.add(...[0, 1, 2, 3].map((g) => G3.gradePart(M, g))), M, 1e-12);
    ok2 = ok2 && G3.near(G3.gp(G3.add(one, a), G3.add(one, b)), G3.add(G3.add(one, G3.inner(a, b)), G3.add(a, b), G3.wedge(a, b)), 1e-12);
    ok3 = ok3 && G3.near(G3.gradePart(M, 3), G3.gradePart(G3.gp(a, b, c), 3), 1e-12) && G3.near(G3.gradePart(G3.gp(a, b, c), 3), G3.wedge(a, b, c), 1e-12);
    let lv = levels(M), fq = freqs(M);
    ok4 = ok4 && lv.every((x) => x >= 0 && x <= 1 && isFinite(x)) && near(lv.reduce((s, x) => s + x, 0), 1, 1e-12) && fq.every((f) => f >= 100 && f <= 1000);
  }
  check('M = ⟨M⟩0 + ⟨M⟩1 + ⟨M⟩2 + ⟨M⟩3（次数に分けて足すと元どおり）', ok1);
  check('(1 + a)(1 + b) = (1 + a·b) + (a + b) + a∧b', ok2);
  check('M の擬スカラー部分 = ⟨abc⟩3 = a∧b∧c', ok3);
  check('音量は 0〜1（合計 1）、周波数は 100〜1000 Hz（ランダム 40 通り）', ok4);
  let z = G3.zero(), lz = levels(multi(z, z, z));
  check('ベクトルが全部 0 でも NaN にならない（M = 1 → スカラーだけ鳴る）', lz.every(isFinite) && near(lz[0], 1));
  check('音量の上限：全体 MASTER ≤ 0.2', MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. a と b を平行にすると二重ベクトルの声部はどうなる？ 直角にすると？
// 2. b を a の右側から左側へ回して、長調 ⇔ 短調が入れかわる瞬間を聞こう
// 3. ↑↓ で c を平面に寝かせる（z = 0）と、擬スカラーの声部は？（a, b, c が同じ平面 → 体積 0）
// 4. BASE の音の高さを変えて、自分の和音を作ろう（例：[130.8, 196, 261.6, 329.6]）
// 5. M を a b c（1 + を取る）に変えると、どの声部が鳴らなくなる？ それはなぜ？


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
// ---- 音の道具（Web Audio）。音量の上限：全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null, voices = [];
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
    let lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.connect(masterOut);
    for (let k = 0; k < 4; k++) {                 // 4 つの声部（やわらかい三角波）
      let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      o.type = k === 0 ? 'sine' : 'triangle'; o.frequency.value = 220; gn.gain.value = 0;
      o.connect(gn); gn.connect(lp); o.start(); voices.push({ o, gn });
    }
  }
  audioCtx.resume();
}
function setVoices(lv, fq) {           // lv：0〜1 の音量 4 つ、fq：周波数 4 つ
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  voices.forEach((v, k) => {
    v.gn.gain.setTargetAtTime(clampv(lv[k] || 0, 0, 1) * 0.3, t, 0.08);
    v.o.frequency.setTargetAtTime(clampv(fq[k] || 220, 50, 2000), t, 0.05);
  });
}
