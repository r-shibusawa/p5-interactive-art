// ============================================
// 09 ボルツマン分布 ─ ランダムにエネルギーをやり取りすると、分布は指数関数 e^(−E/kT) になる
// 2500 個の粒子が、エネルギーのかたまり（量子 ε）を 1 つずつランダムに渡し合う（全体のエネルギーは一定）
// はじめは全員同じエネルギーでも、やがて「エネルギー 0 がいちばん多く、高いほど指数関数的に少ない」分布に
// 片対数グラフでは直線になり、その傾き = −1/kT。理論：p(n) = (1 − a)aⁿ、a = e^(−ε/kT) = ⟨n⟩/(1 + ⟨n⟩)
// スペース 一時停止 / ↑↓ エネルギーを足す・引く / ← → 速さ / R 全員同じにもどす
// ============================================

const GRID_N = 50;                     // ★ 粒子を GRID_N × GRID_N に並べる
const E_MEAN = 3;                      // ★ はじめの 1 粒子あたりの量子の数
let en, paused = false, speed = 20000, hist = [], totalE = 0, fitInfo = null, t0Frame = 0, logMax = [];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(9); resetAll(); }
function resetAll() { en = new Int32Array(GRID_N * GRID_N).fill(E_MEAN); hist = []; logMax = []; }
function exchangeE(e, n) { let N = e.length; for (let k = 0; k < n; k++) { let i = Math.floor(rnd() * N), j = Math.floor(rnd() * N); if (e[i] > 0) { e[i]--; e[j]++; } } }
function meanE(e) { let s = 0; for (let v of e) s += v; return s / e.length; }
function histogram(e, nmax) { let h = new Array(nmax + 1).fill(0); for (let v of e) if (v <= nmax) h[v]++; return h.map((c) => c / e.length); }
function geomP(n, m) { let a = m / (1 + m); return (1 - a) * Math.pow(a, n); }                    // 理論（⟨n⟩ = m）
function kTof(m) { return 1 / Math.log(1 + 1 / m); }                                               // e^(−ε/kT) = m/(1+m)、ε = 1
// 直線の当てはめ（最小二乗）：y = a + b·x
function fitLine(xs, ys) {
  let n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let k = 0; k < n; k++) { sx += xs[k]; sy += ys[k]; sxx += xs[k] * xs[k]; sxy += xs[k] * ys[k]; }
  let d = n * sxx - sx * sx; if (n < 2 || d === 0) return null;
  let b = (n * sxy - sx * sy) / d; return { a: (sy - b * sx) / n, b };
}
function fitSemilog(h, minP) { let xs = [], ys = []; h.forEach((p, n) => { if (p >= minP) { xs.push(n); ys.push(Math.log(p)); } }); return fitLine(xs, ys); }

function draw() {
  background(22, 22, 28);
  if (!paused) exchangeE(en, speed);
  let m = meanE(en), nmax = Math.max(12, Math.ceil(m * 6)), h = histogram(en, nmax), kT = kTof(m);
  fitInfo = fitSemilog(h, 20 / en.length);
  let mx = 0; for (let v of en) mx = Math.max(mx, v); logMax.push(mx); if (logMax.length > 300) logMax.shift();

  // ---- 粒子のマス目
  let cs = Math.floor(Math.min((width * 0.36) / GRID_N, (height - 180) / GRID_N)), ox = 20, oy = 120;
  noStroke();
  for (let i = 0; i < en.length; i++) {
    let u = clampv(en[i] / (4 * m + 1), 0, 1);
    fill(u < 0.5 ? color(30 + 200 * u, 40 + 120 * u, 120 - 60 * u) : color(130 + 125 * u, 100 + 155 * (u - 0.5), 60 + 140 * (u - 0.5)));
    rect(ox + (i % GRID_N) * cs, oy + Math.floor(i / GRID_N) * cs, cs, cs);
  }

  // ---- 分布（ふつうの目盛り）と片対数
  let gx = ox + GRID_N * cs + 70, gw = width - gx - 30, gh = (height - 270) / 2;
  let g1 = { x: gx, y: 120, w: gw, h: gh, x0: -0.5, x1: nmax + 0.5, y0: 0, y1: Math.max(geomP(0, m), h[0]) * 1.15 };
  plotAxes(g1, 'エネルギー n（量子の数）', '割合 p(n)', [0, Math.round(nmax / 2), nmax], [0, +g1.y1.toPrecision(2)]);
  noStroke(); fill(255, 150, 80, 170);
  for (let n = 0; n <= nmax; n++) { let y = gY(g1, h[n]); rect(gX(g1, n - 0.4), y, gX(g1, n + 0.4) - gX(g1, n - 0.4), g1.y + g1.h - y); }
  stroke(130, 200, 255); strokeWeight(2); polyline(Array.from({ length: nmax + 1 }, (_, n) => [gX(g1, n), gY(g1, geomP(n, m))]));
  let g2 = { x: gx, y: g1.y + gh + 80, w: gw, h: gh, x0: -0.5, x1: nmax + 0.5, y0: 1e-4, y1: 1, logy: true };
  plotAxes(g2, 'エネルギー n', '割合（対数）', [0, Math.round(nmax / 2), nmax], [1e-4, 1e-3, 1e-2, 0.1, 1]);
  noStroke(); fill(255, 150, 80);
  for (let n = 0; n <= nmax; n++) if (h[n] > 0) circle(gX(g2, n), gY(g2, h[n]), 8);
  stroke(130, 200, 255); strokeWeight(2); polyline(Array.from({ length: nmax + 1 }, (_, n) => [gX(g2, n), gY(g2, geomP(n, m))]));
  if (fitInfo) { stroke(255, 230, 120); strokeWeight(1.5); polyline([0, nmax].map((n) => [gX(g2, n), gY(g2, Math.exp(fitInfo.a + fitInfo.b * n))])); }

  noStroke(); fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('ボルツマン分布　粒子 ' + en.length + ' 個　全体の量子 ' + Math.round(m * en.length) + '（一定）　⟨n⟩ = ' + m.toFixed(2) + '　→ kT = 1/ln(1 + 1/⟨n⟩) = ' + kT.toFixed(3) + ' ε', 20, 36);
  fill(175); textSize(15);
  text('スペース 一時停止　↑↓ エネルギーを足す・引く　← → 速さ（1 コマ ' + speed + ' 回）　R 全員同じエネルギーにもどす', 20, 62);
  fill(255, 220, 120);
  text(fitInfo ? '片対数の直線の傾き（最小二乗）= ' + fitInfo.b.toFixed(4) + ' → kT = ' + (-1 / fitInfo.b).toFixed(3) + ' ε　（理論 −1/kT = ' + (-1 / kT).toFixed(4) + '）　いちばん大きいエネルギー ' + mx : '当てはめ中…', 20, 86);
  fill(130, 200, 255); textSize(13); text('青い線 = 理論 p(n) = (1 − a)aⁿ、黄色 = 測った点に当てはめた直線', g2.x, g2.y + g2.h + 48);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) { for (let k = 0; k < en.length / 2; k++) en[Math.floor(rnd() * en.length)]++; }
  if (key === DOWN_ARROW) { let n = 0; for (let k = 0; k < en.length * 4 && n < en.length / 2 && meanE(en) > 0.6; k++) { let i = Math.floor(rnd() * en.length); if (en[i] > 0) { en[i]--; n++; } } }
  if (key === RIGHT_ARROW) speed = Math.min(200000, speed * 2);
  if (key === LEFT_ARROW) speed = Math.max(100, speed / 2);
  if (key === 'r' || key === 'R') resetAll();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(90);
  let e = new Int32Array(2000).fill(3), sum0 = 3 * 2000;
  exchangeE(e, 300000);
  check('やり取りしても全体の量子の数は一定（' + sum0 + '）', Math.round(meanE(e) * 2000) === sum0);
  let ps = 0, pm = 0; for (let n = 0; n < 400; n++) { ps += geomP(n, 3); pm += n * geomP(n, 3); }
  check('理論の分布：合計 = 1、平均 = ⟨n⟩ = 3', near(ps, 1, 1e-12) && near(pm, 3, 1e-9));
  let acc = new Array(31).fill(0);
  for (let r = 0; r < 10; r++) { exchangeE(e, 20000); histogram(e, 30).forEach((p, n) => (acc[n] += p / 10)); }
  let L1 = acc.reduce((a, p, n) => a + Math.abs(p - geomP(n, 3)), 0);
  check('はじめ全員 n = 3 → 分布が指数関数に（理論とのずれ ' + L1.toFixed(3) + ' < 0.05）', L1 < 0.05);
  let f = fitSemilog(acc, 0.005);
  check('片対数の傾き ' + f.b.toFixed(3) + ' = −1/kT = −ln(4/3) = ' + (-Math.log(4 / 3)).toFixed(3) + '（5%）', Math.abs(f.b / -Math.log(4 / 3) - 1) < 0.05);
  let L = fitLine([0, 1, 2, 3], [1, 3, 5, 7]);
  check('最小二乗：y = 1 + 2x の点から a = 1、b = 2', near(L.a, 1, 1e-12) && near(L.b, 2, 1e-12));
  check('温度が高い（⟨n⟩ = 10）と kT ≈ ⟨n⟩ + 1/2（古典的な等分配に近づく）', near(kTof(10), 10.5, 0.01));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. R を押して、全員同じエネルギーから分布が指数関数になるまでを見よう。何コマくらいかかる？
// 2. ↑ でエネルギーを足すと、片対数の直線の傾きはどうなる？（温度が上がる = 傾きがゆるやか）
// 3. エネルギー 0 の粒子がいちばん多いのはなぜ？「場合の数」で考えよう（08 とつながる）
// 4. GRID_N を 10 にすると、分布はどれくらいゆれる？
// 5. 大気の高さと気圧（e^(−mgh/kT)）、化学反応の速さ（e^(−E/kT)）も同じ形


// ==================================================
// ここから下は「熱力学の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーションと自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(t, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
