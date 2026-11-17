// ============================================
// 14 変分法と最速降下線 🔊
// A から B へ、玉が摩擦なしで転がり落ちる（速さ v = √(2gh)、h は A からの落差）。いちばん早く着く曲線は？
//   折れ線の時間は 1 本ずつ正確に t = 2L/(v₁ + v₂)（まっすぐな坂では一定の加速度）。答えはサイクロイド（変分法）
//   折れ線の高さ y₁…y_N を勾配法で最適化すると、サイクロイドに近づいていく。着いた順に音（速いほど高い）
// ドラッグ = 曲線を描く / スペース = 競走 / O = 最適化 ON/OFF / R = 最適化をやり直す / ←→ = B の位置 / C = 消す
// 🔊 最初にキャンバスを 1 回クリック（音を出すため）
// ============================================

const GRAV = 9.8;                    // ★ 重力加速度 g（m/s²）
const BXS = [0.5, 1, 2, 3];          // ★ B の横の位置（A から右へ何 m）。B は A の 1 m 下
const NSEG = 40;                     // ★ 最適化する折れ線の区間の数
const SLOW = 3;                      // ★ スローモーション（何倍ゆっくり見せるか）
let bi = 2, BX, BY = 1, cyc, curves, opt, optOn = true, hist = [], user = null, drawing = false, race = -1, arrived = [], tstep = 1e-3;
let ox, oy, sc;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  reset();
}
function reset() {
  BX = BXS[bi]; cyc = cycloid(BX, BY);
  let ymax = Math.max(BY, 2 * cyc.R), pw = width * 0.6, ph = height - 170;
  sc = Math.min(pw / (BX + 0.3), ph / (ymax + 0.25)); ox = 40 + 0.1 * sc; oy = 110;
  opt = optGrid().map((x) => [x, (BY * x) / BX]); hist = []; tstep = 1e-3; user = null; race = -1;
}
// 折れ線の時間（正確）：区間ごとに 2L/(v₁+v₂)。A より上に出たら ∞（到達できない）
function polyT(P) {
  let T = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    let h1 = P[i][1], h2 = P[i + 1][1], L = Math.hypot(P[i + 1][0] - P[i][0], h2 - h1);
    if (h1 < 0 || h2 < 0) return Infinity;
    if (L === 0) continue;
    let s = Math.sqrt(2 * GRAV * h1) + Math.sqrt(2 * GRAV * h2); if (s === 0) return Infinity;
    T += (2 * L) / s;
  }
  return T;
}
// ∂T/∂yᵢ（両端は動かさない）：t = 2L/s の微分、∂L/∂y = ±Δy/L、∂v/∂h = g/v
function gradT(P) {
  let n = P.length, g = new Array(n).fill(0);
  for (let i = 0; i + 1 < n; i++) {
    let v1 = Math.sqrt(2 * GRAV * P[i][1]), v2 = Math.sqrt(2 * GRAV * P[i + 1][1]), dy = P[i + 1][1] - P[i][1], L = Math.hypot(P[i + 1][0] - P[i][0], dy), s = v1 + v2;
    g[i + 1] += (2 * dy) / L / s - ((2 * L) / (s * s)) * (v2 > 0 ? GRAV / v2 : 0);
    g[i] += (-2 * dy) / L / s - ((2 * L) / (s * s)) * (v1 > 0 ? GRAV / v1 : 0);
  }
  g[0] = 0; g[n - 1] = 0; return g;
}
// 勾配法 1 回（アルミホ。ステップ幅は毎回 2 倍から試す）
function optStep(P) {
  let g = gradT(P), gg = vdot(g, g), T0 = polyT(P);
  if (!(gg > 0) || !isFinite(gg) || !isFinite(T0)) return P;   // 勾配 0（収束）や異常値なら動かない（ステップ幅が ∞ になって止まるのを防ぐ）
  for (tstep = Math.min(tstep * 2, 1); tstep > 1e-16; tstep *= 0.5) { let Q = P.map((p, i) => [p[0], p[1] - tstep * g[i]]); if (polyT(Q) <= T0 - 1e-4 * tstep * gg) return Q; }
  return P;
}
function optGrid() { let xs = []; for (let i = 0; i <= NSEG; i++) xs.push(BX * (i / NSEG) ** 2); return xs; }   // A の近く（急な所）を細かく
// サイクロイド x = R(θ − sinθ)、y = R(1 − cosθ)：(θ − sinθ)/(1 − cosθ) = BX/BY を二分法 → ニュートン法で解く
function cycloid(bx, by) {
  let r = bx / by, F = (t) => (t - Math.sin(t)) / (1 - Math.cos(t)) - r, lo = 1e-9, hi = 2 * Math.PI - 1e-9;
  for (let k = 0; k < 60; k++) { let m = (lo + hi) / 2; if (F(m) > 0) hi = m; else lo = m; }
  let th = (lo + hi) / 2;
  for (let k = 0; k < 5; k++) { let h = 1e-7, d = (F(th + h) - F(th - h)) / (2 * h); th -= F(th) / d; }
  let R = by / (1 - Math.cos(th)), pts = [];
  for (let k = 0; k <= 300; k++) { let t = (th * k) / 300; pts.push([R * (t - Math.sin(t)), R * (1 - Math.cos(t))]); }
  return { th, R, T: th * Math.sqrt(R / GRAV), res: F(th), pts };
}
function cycY(x) { if (x <= 0) return 0; let t = Math.min(cyc.th, Math.cbrt((6 * x) / cyc.R)); for (let k = 0; k < 60; k++) { t -= (cyc.R * (t - Math.sin(t)) - x) / (cyc.R * (1 - Math.cos(t))); t = Math.max(1e-12, Math.min(cyc.th, t)); } return cyc.R * (1 - Math.cos(t)); }
// 時刻 τ の玉の位置：区間の中は s = v₁t + ½at²
function ballAt(P, tau) {
  for (let i = 0; i + 1 < P.length; i++) {
    let v1 = Math.sqrt(2 * GRAV * P[i][1]), v2 = Math.sqrt(2 * GRAV * P[i + 1][1]), L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    if (L === 0) continue;
    let dt = (2 * L) / (v1 + v2);
    if (tau <= dt) { let a = (v2 * v2 - v1 * v1) / (2 * L), s = Math.min(L, v1 * tau + 0.5 * a * tau * tau); return [P[i][0] + ((P[i + 1][0] - P[i][0]) * s) / L, P[i][1] + ((P[i + 1][1] - P[i][1]) * s) / L]; }
    tau -= dt;
  }
  return P[P.length - 1];
}
function toS(p) { return [ox + p[0] * sc, oy + p[1] * sc]; }
function toW(sx, sy) { return [(sx - ox) / sc, (sy - oy) / sc]; }

function draw() {
  background(PAL.bg);
  if (optOn) for (let k = 0; k < 10; k++) { opt = optStep(opt); hist.push(polyT(opt) - cyc.T); }
  if (hist.length > 4000) optOn = false;
  let line0 = [[0, 0], [BX, BY]], cycPoly = optGrid().map((x) => [x, cycY(x)]);
  curves = [{ P: line0, name: '直線', c: PAL.dim }, { P: cyc.pts, name: 'サイクロイド（理論 T*）', c: PAL.gr }, { P: opt, name: '勾配法で最適化した折れ線', c: PAL.or }];
  if (user && user.length > 1) curves.push({ P: user, name: 'あなたの曲線', c: PAL.cy });
  // 方眼と A・B
  stroke(40, 80, 120); strokeWeight(1);
  for (let x = 0; x <= BX + 1e-9; x += 0.25) { let s = toS([x, 0]); line(s[0], oy - 20, s[0], height - 50); }
  for (let y = 0; y <= Math.max(BY, 2 * cyc.R) + 1e-9; y += 0.25) { let s = toS([0, y]); line(ox - 20, s[1], ox + (BX + 0.1) * sc, s[1]); }
  for (let C of curves) { noFill(); stroke(C.c); strokeWeight(C === curves[2] ? 2 : 3); beginShape(); for (let p of C.P) { let s = toS(p); vertex(s[0], s[1]); } endShape(); }
  noStroke(); fill(PAL.ink); textSize(16); let a = toS([0, 0]), b = toS([BX, BY]); text('A', a[0] - 22, a[1]); text('B', b[0] + 10, b[1] + 6); circle(a[0], a[1], 8); circle(b[0], b[1], 8);
  // 競走
  let Ts = curves.map((C) => polyT(C.P)), Tl = Ts[0], Tcp = polyT(cycPoly);
  if (race >= 0) {
    race += deltaTime / 1000 / SLOW;
    curves.forEach((C, i) => {
      if (!isFinite(Ts[i])) return;
      let s = toS(ballAt(C.P, Math.min(race, Ts[i]))); fill(C.c); stroke(255); strokeWeight(1.5); circle(s[0], s[1], 16);
      if (race >= Ts[i] && !arrived[i]) { arrived[i] = true; playNote(Math.max(110, Math.min(1500, 330 * Math.pow(2, (Tl - Ts[i]) / (Tl - cyc.T)))), 0.6, 0.3, 'triangle'); }
    });
  }
  hud([['変分法と最速降下線 ── B は A から右へ ' + BX + ' m、下へ ' + BY + ' m（g = ' + GRAV + '）', PAL.ink],
    ['ドラッグ 曲線を描く　スペース 競走（' + SLOW + ' 倍スロー）　O 最適化 ' + (optOn ? 'ON' : 'OFF') + '　R やり直す　←→ B の位置　C 消す　' + (audioCtx ? '🔊' : 'クリックで音 ON'), PAL.dim]], 16, 14, 16);
  let x = width * 0.64, L = [['着くまでの時間（折れ線は区間ごとに正確に計算）', PAL.ink]];
  curves.forEach((C, i) => L.push([C.name + '：' + (isFinite(Ts[i]) ? Ts[i].toFixed(5) + ' 秒（T* の ' + (Ts[i] / cyc.T).toFixed(4) + ' 倍）' : '到達できない（A より上を通る）'), C.c]));
  L.push(['サイクロイドの点を通る折れ線：' + Tcp.toFixed(5) + ' 秒（区間 ' + NSEG + '）', PAL.dim], ['θ_B = ' + fmt(cyc.th, 6) + '、R = ' + fmt(cyc.R, 6) + ' m、T* = θ_B √(R/g) = ' + cyc.T.toFixed(6) + ' 秒', PAL.gr], ['直線の公式 √(2L²/(g·Δy)) = ' + Math.sqrt((2 * (BX * BX + BY * BY)) / (GRAV * BY)).toFixed(6) + ' 秒', PAL.dim]);
  hud(L, x, 80, 14);
  logPlot(x + 34, 290, width - x - 70, height - 380, [{ v: hist, c: PAL.or, name: 'T（最適化中の折れ線）− T*' }, { v: hist.map(() => Tcp - cyc.T), c: PAL.dim, dash: true, name: 'サイクロイドの点を通る折れ線 − T*' }],
    { lo: -6, hi: 0, kmax: Math.max(100, hist.length - 1), title: '勾配法の収束：T(y₁…y_N) − T*（秒、縦は対数）' });
  drawSelfTest();
}

function mousePressed() {
  startAudio();
  let p = toW(mouseX, mouseY);
  if (mouseX < width * 0.62 && mouseY > 70) { drawing = true; user = [[0, 0], p]; }
}
function mouseDragged() { if (drawing) { let p = toW(mouseX, mouseY), q = user[user.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) * sc > 5 && user.length < 400) user.push(p); } }
function mouseReleased() { if (drawing) { drawing = false; user.push([BX, BY]); } }
function keyPressed() {
  startAudio();
  if (key === ' ') { race = 0; arrived = []; }
  if (key === 'o' || key === 'O') optOn = !optOn;
  if (key === 'r' || key === 'R') { opt = optGrid().map((x) => [x, (BY * x) / BX]); hist = []; tstep = 1e-3; optOn = true; }
  if (key === RIGHT_ARROW && bi < BXS.length - 1) { bi++; reset(); }
  if (key === LEFT_ARROW && bi > 0) { bi--; reset(); }
  if (key === 'c' || key === 'C') user = null;
}

function selfTest() {
  BX = BXS[bi]; cyc = cycloid(BX, BY);
  let Tl = Math.sqrt((2 * (BX * BX + BY * BY)) / (GRAV * BY)), sub = []; for (let k = 0; k <= 37; k++) sub.push([(BX * k) / 37, (BY * k) / 37]);
  stOk('直線：区間の公式の和（37 区間）= 閉じた式 √(2L²/(gΔy))', Math.abs(polyT(sub) - Tl) < 1e-12 && Math.abs(polyT([[0, 0], [BX, BY]]) - Tl) < 1e-12, Tl.toFixed(9));
  stOk('サイクロイドの式 (θ − sinθ)/(1 − cosθ) = Δx/Δy を解いた（残差 ≈ 0）', Math.abs(cyc.res) < 1e-12, '残差 ' + fmt(Math.abs(cyc.res)));
  let Td = polyT(cyc.pts);
  stOk('サイクロイドを細かい折れ線（300 区間）にした時間 ≈ T* = θ_B√(R/g)（少しだけ遅い）', Td >= cyc.T && Td < cyc.T * (1 + 1e-4), 'T* ' + cyc.T.toFixed(6) + ' / 折れ線 ' + Td.toFixed(6));
  let P = optGrid().map((x) => [x, (BY * x) / BX + 0.2 * Math.sin((Math.PI * x) / BX)]), g = gradT(P), e = 0;
  for (let i = 1; i < P.length - 1; i++) { let h = 1e-7, a = P.map((p) => p.slice()), b = P.map((p) => p.slice()); a[i][1] += h; b[i][1] -= h; e = Math.max(e, Math.abs((polyT(a) - polyT(b)) / (2 * h) - g[i]) / Math.max(1, Math.abs(g[i]))); }
  stOk('∂T/∂yᵢ（式）= 差分', e < 1e-6, fmt(e));
  let Q = optGrid().map((x) => [x, (BY * x) / BX]); tstep = 1e-3;
  for (let k = 0; k < 1500; k++) Q = optStep(Q);
  let To = polyT(Q), Pc = optGrid().map((x) => [x, cycY(x)]), Tc = polyT(Pc); tstep = 1e-3;
  for (let k = 0; k < 300; k++) Pc = optStep(Pc);
  stOk('直線から勾配法 1500 回：T* ≤ T(折れ線) で、T* の 1% 以内', cyc.T <= To && (To - cyc.T) / cyc.T < 0.01, '差 ' + fmt(((To - cyc.T) / cyc.T) * 100, 3) + '%');
  stOk('サイクロイドの点を通る折れ線から始めると、さらに短くなる（でも T* より下には行けない）', cyc.T <= polyT(Pc) && polyT(Pc) < Tc, Tc.toFixed(7) + ' → ' + polyT(Pc).toFixed(7) + ' ≥ ' + cyc.T.toFixed(7));
  stOk('A より上を通る曲線は「到達できない」（∞）', polyT([[0, 0], [0.5, -0.1], [BX, BY]]) === Infinity && polyT([[0, 0], [1, 0], [BX, BY]]) === Infinity);
  stReport();
}

// ---------- やってみよう ----------
// 1. 直線より速い曲線を描けるかな？ 最初に急に落ちて速さをかせぐのがコツ
// 2. ←→ で B を遠くにすると、サイクロイドは B より下にもぐってから上がる。それでも直線より速い
// 3. 最適化した折れ線（オレンジ）は、勾配法の回数とともにサイクロイド（緑）に重なっていく
// 4. NSEG を 10 や 80 にすると、点線（区間 NSEG の折れ線で近づける限界の目安）はどう変わる？
// 5. 音の高さ：直線を基準に、T* に近いほど 1 オクターブまで高くなる。自分の曲線で和音を作ろう

// ---- 音を鳴らす道具（Web Audio。最初のクリックで startAudio()）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音：周波数 f、長さ dur 秒、大きさ vol、音色 type（'sine' 'triangle' 'square' 'sawtooth'）
function playNote(f, dur, vol, type) {
  if (!audioCtx || !isFinite(f) || f <= 0) return;
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = Math.min(4000, f);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, Math.min(0.5, vol)), t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + dur + 0.05);
}

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
