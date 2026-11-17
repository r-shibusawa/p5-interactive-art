// ============================================
// 06 ニュートン法
// いまの点で f を 2 次式 m(d) = f + ∇fᵀd + ½ dᵀHd で近似し、その停留点 d = −H⁻¹∇f へ跳ぶ（H = ヘッセ行列）
//   最小点の近くでは誤差が e → C·e²（正しい桁数が毎回ほぼ倍）。遠くからだと発散したり、鞍点・最大点へ行ったりする
//   減衰ニュートン：H が正定値でなければ −∇f に切りかえ、アルミホの直線探索で歩幅を決める
// 1〜4 = 関数 / クリック = 初期点 / スペース = 1 回すすむ / A = 自動 / D = 減衰ニュートン ON/off / R = 最初から
// ============================================

const KMAX = 40;                   // ★ 反復の最大回数
const FLOOR = 1e-13;               // ★ これより小さい誤差は丸め誤差に埋もれるので、収束の次数に使わない
let fi = 0, damped = false, auto = false, F, V, CI, FNS, x0, RUN, shown = 0, SQ;

function setup() {
  createCanvas(windowWidth, windowHeight);
  SQ = makeSQ();
  FNS = [ROSEN, HIMMEL, SQ, BEALE];
  selfTest();
  pick(0);
}
// f = √(1+x²) + √(1+y²)：凸だが遠くでは平ら（2 次近似が悪い）。最小点 (0, 0)、最小値 2
function makeSQ() {
  return { name: '√(1+x²) + √(1+y²)', f: (x, y) => Math.sqrt(1 + x * x) + Math.sqrt(1 + y * y), g: (x, y) => [x / Math.sqrt(1 + x * x), y / Math.sqrt(1 + y * y)],
    H: (x, y) => [[Math.pow(1 + x * x, -1.5), 0], [0, Math.pow(1 + y * y, -1.5)]], xs: [[0, 0]], fs: 2, view: [0, 0, 3.2], start: [1.2, 0.6] };
}
function pick(i) { fi = i; F = FNS[i]; V = makeView(16, 74, width * 0.47, height - 124, F.view); CI = contourImage(V, F.f); x0 = F.start.slice(); rerun(); }
function rerun() { RUN = runNewton(F, x0, damped); shown = 0; }
// 1 回分：H の固有値で 2 次近似の形を判定し、跳び先を決める
function newtonStep(F, p, damped) {
  let g = F.g(...p), H = F.H(...p), E = eig2(H), d = solve2(H, g).map((v) => -v), s = { E, g, H, ds: d.slice(), kind: E.l[0] > 0 ? '正定値' : E.l[1] < 0 ? '負定値' : '不定', t: 1, fb: false };
  if (damped) { if (!(E.l[0] > 0) || !(vdot(d, g) < 0)) { d = [-g[0], -g[1]]; s.fb = true; } s.t = armijo(F, p, d, 1e-4, 0.5, 1).t; }
  s.next = [p[0] + s.t * d[0], p[1] + s.t * d[1]];
  return s;
}
function runNewton(F, p, damped, K = KMAX) {
  let P = [p], I = [], div = false;
  for (let k = 0; k < K && vlen(F.g(...p)) > 1e-15; k++) {
    let s = newtonStep(F, p, damped);
    if (bad(s.next[0]) || bad(s.next[1]) || bad(F.f(...s.next))) { div = true; I.push(s); break; }
    if (s.next[0] === p[0] && s.next[1] === p[1]) break;
    I.push(s); p = s.next; P.push(p);
  }
  let tgt = div ? null : criticalPoint(F, p), e = P.map((q) => (tgt ? Math.hypot(q[0] - tgt[0], q[1] - tgt[1]) : NaN)), kind = '';
  if (tgt) { let l = eig2(F.H(...tgt)).l; kind = l[0] > 0 ? '最小点' : l[1] < 0 ? '最大点' : '鞍点'; }
  return { P, I, div, tgt, e, kind, fv: P.map((q) => F.f(...q) - F.fs), gn: P.map((q) => vlen(F.g(...q))) };
}
// 収束の次数 q ≈ log(e_{k+1}/e_k) / log(e_k/e_{k−1})（3 つとも丸め誤差より上のときだけ）
function orderAt(e, k) { return k >= 1 && k + 1 < e.length && e[k + 1] > FLOOR && e[k] > FLOOR && e[k - 1] > FLOOR && e[k] < 0.5 ? Math.log(e[k + 1] / e[k]) / Math.log(e[k] / e[k - 1]) : NaN; }
// 2 次近似 m の等高線：固有ベクトルの向きに λ₁u² + λ₂w² = 2c（楕円か双曲線）
function modelCurves(p, s) {
  let [l1, l2] = s.E.l, [v1, v2] = s.E.v, c0 = 0.5 * vdot(s.ds, [s.H[0][0] * s.ds[0] + s.H[0][1] * s.ds[1], s.H[1][0] * s.ds[0] + s.H[1][1] * s.ds[1]]), out = [], R = 4 * V.hw;
  if (Math.abs(l1) < 1e-12 || Math.abs(l2) < 1e-12 || !isFinite(c0)) return out;
  let pt = (u, w) => [p[0] + s.ds[0] + u * v1[0] + w * v2[0], p[1] + s.ds[1] + u * v1[1] + w * v2[1]];
  for (let sc of [0.15, 0.45, 1, 2]) for (let sg of l1 * l2 > 0 ? [1] : [1, -1]) {
    let c = c0 * sc * sg;
    if (l1 * l2 > 0) { if (c / l1 <= 0) continue; let a = Math.sqrt((2 * c) / l1), b = Math.sqrt((2 * c) / l2); if (a > R) continue; out.push(Array.from({ length: 49 }, (_, i) => pt(a * Math.cos((i * Math.PI) / 24), b * Math.sin((i * Math.PI) / 24)))); }
    else {
      let lp = Math.max(l1, l2), ln = Math.min(l1, l2), up = l1 > 0, a = Math.sqrt(Math.abs((2 * c) / (c > 0 ? lp : ln))), b = Math.sqrt(Math.abs((2 * c) / (c > 0 ? ln : lp))), S = Math.acosh(Math.max(1.01, R / a));
      for (let br of [1, -1]) out.push(Array.from({ length: 41 }, (_, i) => { let t = -S + (2 * S * i) / 40, A = br * a * Math.cosh(t), B = b * Math.sinh(t); return (c > 0) === up ? pt(A, B) : pt(B, A); }));
    }
  }
  return out;
}

function draw() {
  background(PAL.bg);
  if (auto && frameCount % 40 === 0 && shown < RUN.P.length - 1) shown++;
  image(CI, V.px, V.py);
  let cx = drawingContext; cx.save(); cx.beginPath(); cx.rect(V.px, V.py, V.pw, V.ph); cx.clip();
  let p = RUN.P[shown], s = RUN.I[shown];
  if (s) {
    stroke(PAL.ye); strokeWeight(1.3); noFill();
    for (let C of modelCurves(p, s)) { beginShape(); for (let q of C) vertex(...V.toS(...q)); endShape(); }
    let a = V.toS(...p), m = V.toS(p[0] + s.ds[0], p[1] + s.ds[1]), n = V.toS(...s.next);
    drawingContext.setLineDash([5, 4]); stroke(PAL.ye); line(a[0], a[1], m[0], m[1]); drawingContext.setLineDash([]);
    noStroke(); fill(PAL.ye); circle(m[0], m[1], 9); if (!RUN.div) arrow(a[0], a[1], n[0], n[1], damped ? PAL.gr : PAL.or, 2.5);
  }
  drawPath(V, RUN.P.slice(0, shown + 1), damped ? PAL.gr : PAL.or, 2);
  for (let q of F.xs) { let t = V.toS(...q); noFill(); stroke(PAL.gr); strokeWeight(2); circle(t[0], t[1], 16); }   // 最小点
  cx.restore();
  hud([['ニュートン法 ── ' + F.name + '　' + (damped ? '減衰ニュートン（H が正定値でなければ −∇f、アルミホで歩幅）' : '純粋なニュートン法（いつも t = 1）'), PAL.ink],
    ['1〜4 関数　クリック 初期点　スペース 1 回　A 自動 ' + (auto ? 'ON' : 'off') + '　D 減衰 ' + (damped ? 'ON' : 'off') + '　R 最初から', PAL.dim]], 16, 14, 16);
  let X = width * 0.5, y = 82, w = width - X - 24, info = [];
  if (s) info.push(['H の固有値 ' + fmt(s.E.l[0], 3) + ', ' + fmt(s.E.l[1], 3) + ' → ' + s.kind + '：2 次近似（黄）は ' + (s.kind === '不定' ? '双曲線、停留点は鞍点' : s.kind === '正定値' ? '楕円、停留点は最小点' : '楕円、停留点は最大点') + (s.fb ? '　→ −∇f に切りかえ' : '') + (damped ? '　t = ' + fmt(s.t, 3) : ''), s.kind === '正定値' ? PAL.ye : PAL.pk]);
  info.push(RUN.div ? ['発散：|x| がどんどん大きくなった（√(1+x²) では x → −x³）', PAL.rd] : RUN.tgt ? ['行き先：' + RUN.kind + ' (' + fmt(RUN.tgt[0], 6) + ', ' + fmt(RUN.tgt[1], 6) + ')　' + RUN.I.length + ' 回' + (RUN.kind === '最小点' ? '' : '　← ∇f = 0 だが最小ではない'), RUN.kind === '最小点' ? PAL.gr : PAL.pk] : ['まだ収束していない', PAL.dim]);
  hud(info, X, y, 14);
  // 表：k, f − f*, ‖∇f‖, e_k, e_{k+1}/e_k², 次数 q
  let cols = ['k', 'f − f*', '‖∇f‖', 'e_k = ‖x_k − x∞‖', 'e_{k+1} / e_k²', '次数 q'], cw = [0, 0.07, 0.25, 0.43, 0.64, 0.84], ty = y + 50;
  textSize(13); textAlign(LEFT, TOP); fill(PAL.dim); noStroke(); cols.forEach((c, i) => text(c, X + w * cw[i], ty));
  let n = RUN.P.length, k0 = Math.max(0, Math.min(shown, n - 1) - 11);
  for (let k = k0; k <= Math.min(shown, n - 1); k++) {
    let e = RUN.e, r = k + 1 < n && e[k + 1] > FLOOR && e[k] > FLOOR && e[k] < 0.5 ? e[k + 1] / (e[k] * e[k]) : NaN, q = orderAt(e, k), yy = ty + 20 + (k - k0) * 18;
    fill(k === shown ? PAL.ye : PAL.ink);
    [k, fmt(RUN.fv[k], 3), fmt(RUN.gn[k], 3), RUN.tgt ? fmt(e[k], 3) : '—', isFinite(r) ? fmt(r, 3) : '—', isFinite(q) ? q.toFixed(2) : '—'].forEach((c, i) => text(c, X + w * cw[i], yy));
  }
  hud([['x∞ = 最後に着いた停留点。e_{k+1}/e_k² が有界なら 2 次収束（q ≈ 2）。3 の関数は e_{k+1} = e_k³（q = 3）', PAL.dim]], X, ty + 20 + 12 * 18 + 6, 12);
  let top = ty + 20 + 12 * 18 + 44;
  logPlot(X + 34, top, w - 40, height - top - 50, [{ v: RUN.fv.slice(0, shown + 1), c: damped ? PAL.gr : PAL.or, name: 'f − f*' }, { v: RUN.gn.slice(0, shown + 1), c: PAL.cy, name: '‖∇f‖', dash: true }, { v: RUN.e.slice(0, shown + 1), c: PAL.ye, name: 'e_k' }], { lo: -17, kmax: Math.max(6, n - 1), title: '縦は対数：2 次収束ではグラフが崖のように落ちる' });
  drawSelfTest();
}

function mousePressed() { if (V.inside(mouseX, mouseY)) { x0 = V.toW(mouseX, mouseY); rerun(); } }
function keyPressed() {
  if (key >= '1' && key <= '4') pick(+key - 1);
  if (key === ' ' || key === RIGHT_ARROW) shown = Math.min(RUN.P.length - 1, shown + 1);
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'd' || key === 'D') { damped = !damped; rerun(); }
  if (key === 'r' || key === 'R') shown = 0;
}

function selfTest() {
  if (!SQ) SQ = makeSQ();
  let pts = [[-0.7, 0.4], [1.3, 1.1], [2.2, -1.5], [0.4, 0.9]];
  for (let G of [ROSEN, HIMMEL, BEALE, SQ]) { let e = derivErr(G, pts); stOk(G.name + '：勾配・ヘッセ行列 = 差分', e.g < 1e-6 && e.H < 1e-5, 'g ' + fmt(e.g) + ', H ' + fmt(e.H)); }
  let Q = quadFn(30), r1 = runNewton(Q, [2.4, -1.3], false);
  stOk('2 次関数（κ = 30）は 1 回で最小点（2 次近似 = 本物）', vlen(r1.P[1]) < 1e-14, '1 回目の誤差 ' + fmt(vlen(r1.P[1])));
  let rd = runNewton(ROSEN, [-1.2, 1], true), qs = rd.e.map((_, k) => orderAt(rd.e, k)).filter(isFinite);
  stOk('ローゼンブロック (−1.2, 1)：減衰ニュートンで (1, 1) に 1e−10 以内', errTo(ROSEN, rd.P[rd.P.length - 1]) < 1e-10, rd.I.length + ' 回');
  // 定理：e_{k+1} ≤ ‖H(x_k)⁻¹‖·(M/2)·e_k²（M = H のリプシッツ定数）。(1, 1) の近く（|x| ≤ 1.02）では 3 階微分から M ≤ √((2400·1.02)² + 3·400²)
  let Mr = Math.sqrt((2400 * 1.02) ** 2 + 3 * 400 ** 2), okq = true, cnt = 0;
  for (let k = 0; k + 1 < rd.e.length; k++) if (rd.e[k] < 0.01 && rd.e[k + 1] > 0) { cnt++; okq = okq && rd.e[k + 1] <= (Mr / (2 * eig2(ROSEN.H(...rd.P[k])).l[0])) * rd.e[k] ** 2; }
  stOk('ローゼンブロック：(1, 1) の近くで e_{k+1} ≤ (M / 2λ_min(H(x_k)))·e_k²（2 次収束の定理）', okq && cnt >= 2, cnt + ' 回、e_{k+1}/e_k² = ' + rd.e.slice(0, -1).map((v, k) => (v < 0.01 && rd.e[k + 1] > 0 ? fmt(rd.e[k + 1] / v ** 2, 3) : null)).filter((v) => v).join(', ') + '、q = ' + qs.map((v) => v.toFixed(2)).join(', '));
  let s = newtonStep(SQ, [0.7, -0.4], false);
  stOk('√(1+x²)：ニュートンの 1 歩は x → −x³（(0.7, −0.4) → (−0.343, 0.064)）', Math.abs(s.next[0] + 0.343) < 1e-14 && Math.abs(s.next[1] - 0.064) < 1e-14);
  let rs = runNewton(SQ, [1.2, 0.6], false), rsd = runNewton(SQ, [1.2, 0.6], true), rc = runNewton(SQ, [0.6, 0], false), q3 = rc.e.map((_, k) => orderAt(rc.e, k)).filter(isFinite);
  stOk('√(1+x²)：|x| > 1 から純粋なニュートン法は発散、減衰ニュートンは (0, 0) へ', rs.div && errTo(SQ, rsd.P[rsd.P.length - 1]) < 1e-10, rs.I.length + ' 回で発散、減衰は ' + rsd.I.length + ' 回');
  stOk('√(1+x²)：(0.6, 0) から次数 q = 3（e_{k+1} = e_k³、±0.01）', q3.length > 0 && q3.every((v) => Math.abs(v - 3) < 0.01), 'q = ' + q3.map((v) => v.toFixed(3)).join(', '));
  let okh = HIMMEL.xs.every((m) => { let r = runNewton(HIMMEL, [m[0] + 0.3, m[1] - 0.25], false); return r.kind === '最小点' && errTo(HIMMEL, r.P[r.P.length - 1]) < 1e-10; });
  stOk('ヒンメルブラウ：4 つの最小点それぞれの近くから、その最小点に 1e−10 以内', okh);
  let rh = runNewton(HIMMEL, HIMMEL.start, false), rhd = runNewton(HIMMEL, HIMMEL.start, true);
  stOk('ヒンメルブラウ (−0.3, −0.9)：純粋なニュートン法は最大点へ（H が負定値）、減衰ニュートンは最小点へ', rh.kind === '最大点' && rhd.kind === '最小点', '最大点 (' + fmt(rh.tgt[0], 6) + ', ' + fmt(rh.tgt[1], 6) + ')、f = ' + fmt(HIMMEL.f(...rh.tgt), 6));
  stReport();
}

// ---------- やってみよう ----------
// 1. スペースで 1 回ずつ進め、表の e_k の指数（10⁻³ → 10⁻⁶ → 10⁻¹²）が倍々になるのを確かめよう
// 2. 2（ヒンメルブラウ）の初期点は最大点のそば。D で減衰ニュートンにすると最小点へ行き先が変わる
// 3. 3（√(1+x²)）で (0.9, 0.9) と (1.1, 1.1) をクリック。|x| = 1 が収束と発散の境目
// 4. 黄色の 2 次近似の等高線が楕円か双曲線かで、跳び先が最小点・鞍点・最大点のどれになるかが決まる
// 5. ニュートン法は 1 回に H の計算と連立方程式が必要。変数が 100 万個だと？（→ 07 準ニュートン法・08 共役勾配法）

// ==================================================
// ここから下は「最適化の道具」（中身は読まなくても OK。消さないでね）
// テスト関数（値・勾配・ヘッセ行列）、等高線、対数グラフ、2×2 行列、直線探索、自己テスト
// ==================================================
const PAL = { bg: '#0c2445', ink: '#e8f2fb', dim: '#8eb2cf', line: '#2c5a85', or: '#ff7a2f', cy: '#5fd8f0', gr: '#8de07a', ye: '#ffd24a', pk: '#ff6fa8', vi: '#b79cff', rd: '#ff5a5a' };

// ---- テスト関数 { f 値, g 勾配, H ヘッセ行列, xs 最小点, fs 最小値, view [中心x, 中心y, 横の半幅] }
function quadFn(kap, th = 0.5) {     // f = ½ xᵀAx、A の固有値は μ = 1 と L = κ（θ だけ回転）
  let c = Math.cos(th), s = Math.sin(th), a = c * c + kap * s * s, b = (1 - kap) * c * s, d = s * s + kap * c * c;
  return { name: '2 次関数 κ = ' + fmt(kap), f: (x, y) => 0.5 * (a * x * x + 2 * b * x * y + d * y * y), g: (x, y) => [a * x + b * y, b * x + d * y],
    H: () => [[a, b], [b, d]], mu: 1, L: kap, xs: [[0, 0]], fs: 0, view: [0, 0, 3.2], start: [-2.6, 1.6], convex: true, th };
}
const ROSEN = { name: 'ローゼンブロック', f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
  g: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  H: (x, y) => [[2 - 400 * (y - x * x) + 800 * x * x, -400 * x], [-400 * x, 200]], xs: [[1, 1]], fs: 0, view: [-0.2, 0.9, 2.1], start: [-1.2, 1] };
const HIMMEL = { name: 'ヒンメルブラウ', f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
  g: (x, y) => [4 * x * (x * x + y - 11) + 2 * (x + y * y - 7), 2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)],
  H: (x, y) => [[12 * x * x + 4 * y - 42, 4 * x + 4 * y], [4 * x + 4 * y, 4 * x + 12 * y * y - 26]],
  xs: [[3, 2], [-2.8051, 3.1313], [-3.7793, -3.2832], [3.5844, -1.8481]], fs: 0, view: [0, 0, 6.2], start: [-0.3, -0.9] };
const BEALE = (() => {
  let C = [1.5, 2.25, 2.625], each = (x, y, fn) => C.forEach((c, i) => { let n = i + 1; fn(c - x + x * y ** n, y ** n - 1, n * x * y ** (n - 1), n * y ** (n - 1), n > 1 ? n * (n - 1) * x * y ** (n - 2) : 0); });
  return { name: 'ビール', f: (x, y) => { let s = 0; each(x, y, (r) => (s += r * r)); return s; },
    g: (x, y) => { let p = [0, 0]; each(x, y, (r, rx, ry) => { p[0] += 2 * r * rx; p[1] += 2 * r * ry; }); return p; },
    H: (x, y) => { let a = 0, b = 0, d = 0; each(x, y, (r, rx, ry, rxy, ryy) => { a += 2 * rx * rx; b += 2 * (rx * ry + r * rxy); d += 2 * (ry * ry + r * ryy); }); return [[a, b], [b, d]]; },
    xs: [[3, 0.5]], fs: 0, view: [0.6, 0, 4.6], start: [-1.5, 1.8] };
})();
HIMMEL.xs = HIMMEL.xs.map((p) => criticalPoint(HIMMEL, p));   // 4 つの最小点を ∇f = 0 のニュートン法で精密に
const LSE = (() => {                  // log(e^(x+3y−0.1) + e^(x−3y−0.1) + e^(−x−0.1))：凸。最小点 (−ln2 / 2, 0)、最小値 (3/2)ln2 − 0.1
  let pr = (x, y) => { let z = [x + 3 * y - 0.1, x - 3 * y - 0.1, -x - 0.1], m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e[0] + e[1] + e[2]; return [m + Math.log(s), e.map((v) => v / s)]; };
  return { name: 'log-sum-exp', f: (x, y) => pr(x, y)[0], g: (x, y) => { let p = pr(x, y)[1]; return [p[0] + p[1] - p[2], 3 * p[0] - 3 * p[1]]; },
    H: (x, y) => { let p = pr(x, y)[1], g0 = p[0] + p[1] - p[2], g1 = 3 * p[0] - 3 * p[1]; return [[1 - g0 * g0, g1 - g0 * g1], [g1 - g0 * g1, 9 * (p[0] + p[1]) - g1 * g1]]; },
    xs: [[-Math.LN2 / 2, 0]], fs: 1.5 * Math.LN2 - 0.1, view: [-0.4, 0, 2.4], start: [-2, 1.1], convex: true, L: 10 };
})();

// ---- 2×2 の行列とベクトル
function eig2(M) {                    // 対称行列の固有値（小さい順）と固有ベクトル
  let a = M[0][0], b = M[0][1], d = M[1][1], t = (a + d) / 2, r = Math.hypot((a - d) / 2, b), l1 = t - r;
  let v = Math.abs(b) > 1e-14 * (Math.abs(a) + Math.abs(d) + 1) ? [l1 - d, b] : a <= d ? [1, 0] : [0, 1], n = Math.hypot(v[0], v[1]);
  v = [v[0] / n, v[1] / n];
  return { l: [l1, t + r], v: [v, [-v[1], v[0]]] };
}
function solve2(M, r) { let det = M[0][0] * M[1][1] - M[0][1] * M[1][0]; return [(M[1][1] * r[0] - M[0][1] * r[1]) / det, (M[0][0] * r[1] - M[1][0] * r[0]) / det]; }
function vlen(v) { return Math.hypot(...v); }
function vdot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function vaxpy(a, x, y) { return y.map((yi, i) => yi + a * x[i]); }   // a·x + y
function bad(v) { return !isFinite(v) || Math.abs(v) > 1e12; }
function errTo(F, p) { return Math.min(...F.xs.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))); }

// ---- 微分のチェック（中心差分）。H は「解析的な勾配」の差分と比べる
function fdGrad(fn, x, y, h = 1e-6) { return [(fn(x + h, y) - fn(x - h, y)) / (2 * h), (fn(x, y + h) - fn(x, y - h)) / (2 * h)]; }
function derivErr(F, pts) {
  let eg = 0, eh = 0, rel = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(b));
  for (let [x, y] of pts) {
    let g = F.g(x, y), n = fdGrad(F.f, x, y), H = F.H(x, y), h = 1e-6;
    let gx1 = F.g(x + h, y), gx0 = F.g(x - h, y), gy1 = F.g(x, y + h), gy0 = F.g(x, y - h);
    let N = [[(gx1[0] - gx0[0]) / (2 * h), (gy1[0] - gy0[0]) / (2 * h)], [(gx1[1] - gx0[1]) / (2 * h), (gy1[1] - gy0[1]) / (2 * h)]];
    eg = Math.max(eg, rel(g[0], n[0]), rel(g[1], n[1]));
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) eh = Math.max(eh, rel(H[i][j], N[i][j]));
  }
  return { g: eg, H: eh };
}
// ∇f = 0 をニュートン法で解く（停留点を探す）
function criticalPoint(F, p, it = 60) {
  for (let k = 0; k < it; k++) { let d = solve2(F.H(p[0], p[1]), F.g(p[0], p[1])); if (!isFinite(d[0] + d[1])) return null; p = [p[0] - d[0], p[1] - d[1]]; if (vlen(d) < 1e-14) break; }
  return vlen(F.g(p[0], p[1])) < 1e-8 ? p : null;
}
// アルミホの条件 f(x + t d) ≤ f(x) + c₁ t ∇fᵀd になるまで t を β 倍（試した点も返す）
function armijo(F, p, d, c1 = 1e-4, beta = 0.5, t = 1) {
  let f0 = F.f(p[0], p[1]), sl = vdot(F.g(p[0], p[1]), d), tries = [];
  for (let k = 0; k < 60; k++) { let fq = F.f(p[0] + t * d[0], p[1] + t * d[1]); tries.push([t, fq]); if (fq <= f0 + c1 * t * sl) break; t *= beta; }
  return { t, tries, slope: sl };
}

// ---- 画面と世界の座標（縦横の縮尺は同じ）
function makeView(px, py, pw, ph, v) {
  let V = { px, py, pw: Math.round(pw), ph: Math.round(ph), cx: v[0], cy: v[1], hw: v[2] };
  V.sc = V.pw / (2 * V.hw); V.hh = V.ph / (2 * V.sc);
  V.toS = (x, y) => [V.px + V.pw / 2 + (x - V.cx) * V.sc, V.py + V.ph / 2 - (y - V.cy) * V.sc];
  V.toW = (sx, sy) => [V.cx + (sx - V.px - V.pw / 2) / V.sc, V.cy - (sy - V.py - V.ph / 2) / V.sc];
  V.inside = (sx, sy) => sx >= V.px && sx <= V.px + V.pw && sy >= V.py && sy <= V.py + V.ph;
  return V;
}
// 等高線の画像：格子で値を計算 → 分位点で段を決め、色ぬり ＋ マーチングスクエアで線（関数を変えたときだけ呼ぶ）
function contourImage(V, fz, nLev = 18) {
  let cs = 5, nx = Math.ceil(V.pw / cs) + 1, ny = Math.ceil(V.ph / cs) + 1, Z = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let [x, y] = V.toW(V.px + i * cs, V.py + j * cs), z = fz(x, y); Z[j * nx + i] = isFinite(z) ? z : 1e300; }
  let srt = Array.from(Z).filter((z) => z < 1e300).sort((a, b) => a - b), lev = [];
  for (let k = 1; k <= nLev; k++) lev.push(srt[Math.min(srt.length - 1, Math.floor(srt.length * Math.pow(k / (nLev + 1), 1.7)))]);
  let G = createGraphics(V.pw, V.ph); G.pixelDensity(1);
  let ctx = G.drawingContext, img = ctx.createImageData(V.pw, V.ph), band = new Uint8Array(nx * ny);
  for (let q = 0; q < Z.length; q++) { let b = 0; while (b < nLev && Z[q] > lev[b]) b++; band[q] = Z[q] >= 1e300 ? 255 : b; }
  for (let py = 0; py < V.ph; py++) for (let px = 0; px < V.pw; px++) {
    let b = band[Math.round(py / cs) * nx + Math.round(px / cs)], t = b === 255 ? 1.25 : b / nLev, o = 4 * (py * V.pw + px);
    img.data[o] = 14 + 34 * (1 - t); img.data[o + 1] = 40 + 62 * (1 - t); img.data[o + 2] = 72 + 70 * (1 - t); img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // 方眼（製図用紙）
  let gs = Math.pow(10, Math.floor(Math.log10(V.hw / 2))); if (V.hw / gs > 10) gs *= 2; if (V.hw / gs > 10) gs *= 2.5;
  ctx.strokeStyle = 'rgba(120,200,240,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = Math.ceil((V.cx - V.hw) / gs) * gs; x < V.cx + V.hw; x += gs) { let s = V.toS(x, 0)[0] - V.px; ctx.moveTo(s, 0); ctx.lineTo(s, V.ph); }
  for (let y = Math.ceil((V.cy - V.hh) / gs) * gs; y < V.cy + V.hh; y += gs) { let s = V.toS(0, y)[1] - V.py; ctx.moveTo(0, s); ctx.lineTo(V.pw, s); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(110,215,250,0.55)';
  for (let L of lev) {
    ctx.beginPath();
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let a = Z[j * nx + i], b = Z[j * nx + i + 1], c = Z[(j + 1) * nx + i + 1], d = Z[(j + 1) * nx + i], P = [];
      if (a > L !== b > L) P.push(i + (L - a) / (b - a), j);
      if (b > L !== c > L) P.push(i + 1, j + (L - b) / (c - b));
      if (d > L !== c > L) P.push(i + (L - d) / (c - d), j + 1);
      if (a > L !== d > L) P.push(i, j + (L - a) / (d - a));
      for (let q = 0; q + 3 < P.length; q += 4) { ctx.moveTo(P[q] * cs, P[q + 1] * cs); ctx.lineTo(P[q + 2] * cs, P[q + 3] * cs); }
    }
    ctx.stroke();
  }
  G.levels = lev;
  return G;
}

// ---- 対数グラフ：series = [{ v: 値の配列, c: 色, name, dash }]。0 以下・NaN は描かない。opt = { lo, hi, logx, title, kmax }
function logPlot(x, y, w, h, series, opt = {}) {
  let lo = opt.lo, hi = opt.hi, kmax = opt.kmax || 1, mn = Infinity, mx = -Infinity;
  for (let s of series) { if (!opt.kmax) kmax = Math.max(kmax, s.v.length - 1); for (let v of s.v) if (v > 0 && isFinite(v)) { mn = Math.min(mn, Math.log10(v)); mx = Math.max(mx, Math.log10(v)); } }
  if (lo === undefined) lo = isFinite(mn) ? Math.max(-17, Math.floor(mn)) : -16;
  if (hi === undefined) hi = isFinite(mx) ? Math.ceil(mx) : 2;
  if (hi <= lo) hi = lo + 1;
  let X = (k) => x + w * (opt.logx ? Math.log(1 + k) / Math.log(1 + kmax) : k / kmax), Y = (v) => y + h - (h * (Math.log10(v) - lo)) / (hi - lo);
  push();
  fill(8, 26, 50, 230); stroke(PAL.line); strokeWeight(1); rect(x, y, w, h);
  textSize(11); textAlign(RIGHT, CENTER);
  let de = Math.max(1, Math.ceil((hi - lo) / 8));
  for (let e = lo; e <= hi; e += de) { let yy = Y(Math.pow(10, e)); stroke(40, 80, 120); line(x, yy, x + w, yy); noStroke(); fill(PAL.dim); text('10' + sup(e), x - 4, yy); }
  textAlign(CENTER, TOP); noStroke(); fill(PAL.dim);
  let kt = opt.logx ? [1, 10, 100, 1000, 10000].filter((k) => k <= kmax) : [0, Math.round(kmax / 2), kmax];
  for (let k of kt) text(k, X(k), y + h + 3);
  text(opt.xlabel || '反復 k', x + w / 2, y + h + 16);
  for (let s of series) {
    stroke(s.c); strokeWeight(s.wt || 2); noFill();
    if (s.dash) drawingContext.setLineDash([6, 5]);
    let pts = [];
    let flush = () => { if (pts.length >= 2) { beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(); } else if (pts.length === 1) point(pts[0][0], pts[0][1]); pts = []; };
    for (let k = 0; k < s.v.length && k <= kmax; k++) { let v = s.v[k]; if (v > 0 && isFinite(v)) pts.push([X(k), Math.max(y, Math.min(y + h, Y(v)))]); else flush(); }
    flush(); drawingContext.setLineDash([]);
  }
  noStroke(); textAlign(RIGHT, TOP); textSize(12);
  series.filter((s) => s.name).forEach((s, i) => { let yy = y + 6 + 15 * i; noStroke(); fill(s.c); text(s.name, x + w - 34, yy); stroke(s.c); strokeWeight(2); if (s.dash) drawingContext.setLineDash([4, 3]); line(x + w - 28, yy + 7, x + w - 8, yy + 7); drawingContext.setLineDash([]); });
  if (opt.title) { noStroke(); fill(PAL.ink); textSize(13); textAlign(LEFT, BOTTOM); text(opt.title, x, y - 4); }
  pop();
}

// ---- 描く道具
function arrow(x1, y1, x2, y2, c, w = 2) {
  let a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), hd = Math.min(12, L * 0.4);
  push(); stroke(c); fill(c); strokeWeight(w); line(x1, y1, x2, y2);
  if (L > 2) triangle(x2, y2, x2 - hd * Math.cos(a - 0.4), y2 - hd * Math.sin(a - 0.4), x2 - hd * Math.cos(a + 0.4), y2 - hd * Math.sin(a + 0.4));
  pop();
}
function drawPath(V, P, c, w = 2, dots = true) {   // 反復点の列を折れ線と点で
  if (P.length === 0) return;
  push(); stroke(c); strokeWeight(w); noFill();
  if (P.length >= 2) { beginShape(); for (let p of P) { let s = V.toS(p[0], p[1]); vertex(s[0], s[1]); } endShape(); }
  if (dots) { noStroke(); fill(c); for (let i = 0; i < P.length; i += Math.max(1, Math.floor(P.length / 60))) { let s = V.toS(P[i][0], P[i][1]); circle(s[0], s[1], 5); } }
  let s = V.toS(P[P.length - 1][0], P[P.length - 1][1]); stroke(255); strokeWeight(1.5); fill(c); circle(s[0], s[1], 11);
  pop();
}
function hud(lines, x, y, sz = 15, lh = 1.45) {   // 文字の列（[文字, 色] または 文字）
  push(); noStroke(); textSize(sz); textAlign(LEFT, TOP);
  lines.forEach((L, i) => { let [s, c] = Array.isArray(L) ? L : [L, PAL.ink]; fill(c); text(s, x, y + i * sz * lh); });
  pop();
}
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function sup(n) { return String(n).split('').map((ch) => SUP[ch] || ch).join(''); }
function fmt(v, d = 3) {             // 数の表示（発散・とても小さい数も）
  if (!isFinite(v) || Math.abs(v) > 1e12) return '発散';
  if (v === 0) return '0';
  let a = Math.abs(v);
  if (a < 1e-3 || a >= 1e5) { let e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e); return m.toFixed(d - 1) + '×10' + sup(e); }
  return String(+v.toPrecision(d));
}
function rngSeed(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- 自己テスト（起動時に、知られている答えと照合する）
let selfTestResults = [];
function stOk(name, cond, info = '') { selfTestResults.push({ name, ok: !!cond, info }); }
function stReport() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name + (r.info ? '  [' + r.info + ']' : '')); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { push(); noStroke(); textSize(14); textAlign(LEFT, BOTTOM); fill(selfTestResults.every((r) => r.ok) ? PAL.gr : PAL.rd); text(selfTestLine(), 16, height - 12); pop(); }
