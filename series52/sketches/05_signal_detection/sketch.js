// ============================================
// 05 信号検出理論 ─「あった」「なかった」を感度 d′ と基準 c に分ける
// ノイズの中に、かすかな縞模様が半分の確率で入っている。見えたら J（あった）、見えなかったら F（なかった）
// ヒット率 H と誤警報率 F から、感度 d′ = z(H) − z(F)、基準 c = −(z(H) + z(F)) / 2 を計算する
// 得点表（P で切りかえ）を変えると、感度は同じでも基準 c が動く。ROC 曲線（H と F の関係）で確かめる
// クリック → スペースで開始 / J = あった  F = なかった / P = 得点表 / ↑↓ = 模様の濃さ / O = シミュレーション観察者 / R = やり直し
// ============================================

const PER = 30;                        // ★ 得点表 1 つあたりの試行
const NOISE_SD = 28;                   // ★ ノイズの強さ（画面の値の標準偏差）
let amp = 10;                          // ★ 縞模様の濃さ（↑↓）
const PAYOFFS = [                      // ★ 得点表：ヒット・見逃し・誤警報・正しい棄却
  { name: '中立', hit: 1, miss: -1, fa: -1, cr: 1 },
  { name: '見逃すな', hit: 3, miss: -3, fa: -1, cr: 1 },
  { name: '空振りするな', hit: 1, miss: -1, fa: -3, cr: 3 },
];
const SIM_D = 1.5;                     // ★ シミュレーション観察者の本当の d′
let pay = 0, counts = [], phase = 'ready', tPhase = 0, cur = null, pg, score = 0, simMode = false, simSeed = 1, lastMsg = '';
const N = 128;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(N, N); pg.pixelDensity(1);
  selfTest();
  resetData(false);
}
function resetData(sim) { simMode = sim; counts = PAYOFFS.map(() => ({ h: 0, m: 0, f: 0, c: 0 })); phase = 'ready'; score = 0; lastMsg = ''; seedRng(Date.now()); }

// ノイズ ＋（半分の試行だけ）ガボール模様。試行ごとに 1 回だけ作る
function makeStim(sig) {
  pg.loadPixels();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let dx = x - N / 2, dy = y - N / 2, env = Math.exp(-(dx * dx + dy * dy) / (2 * 18 * 18));
    let v = 128 + NOISE_SD * rndNormal() + (sig ? amp * env * Math.sin((2 * Math.PI * dx) / 12) : 0);
    let o = 4 * (y * N + x); pg.pixels[o] = pg.pixels[o + 1] = pg.pixels[o + 2] = clampv(v, 0, 255); pg.pixels[o + 3] = 255;
  }
  pg.updatePixels();
}
function done() { return counts[pay].h + counts[pay].m + counts[pay].f + counts[pay].c >= PER; }
function startTrial() { if (done()) { phase = 'done'; return; } cur = { sig: rnd() < 0.5 }; makeStim(cur.sig); phase = 'fix'; tPhase = millis(); }
function answer(yes) {
  if (phase !== 'stim' && phase !== 'wait') return;
  let k = counts[pay], P = PAYOFFS[pay], kind = cur.sig ? (yes ? 'h' : 'm') : (yes ? 'f' : 'c');
  k[kind]++; score += { h: P.hit, m: P.miss, f: P.fa, c: P.cr }[kind];
  lastMsg = { h: 'ヒット', m: '見逃し', f: '誤警報', c: '正しい棄却' }[kind];
  phase = 'blank'; tPhase = millis();
}
// d′ と c（割合は 1/(2N) で補正して z が無限大にならないように）
function sdt(k) {
  let ns = k.h + k.m, nn = k.f + k.c;
  if (ns < 1 || nn < 1) return null;
  let H = rateFix(k.h, ns), F = rateFix(k.f, nn), zH = zOf(H), zF = zOf(F);
  return { H, F, d: zH - zF, c: -(zH + zF) / 2 };
}
function optimalC(P, d) { return Math.log((P.cr - P.fa) / (P.hit - P.miss)) / d; }   // 得点の期待値が最大になる基準（信号と雑音は半々）
// シミュレーション観察者：内部の反応 x ~ 正規分布（信号なら平均 d′）。x > d′/2 + c なら「あった」
function simTrial(k, d, c) { let sig = rnd() < 0.5, x = rndNormal() + (sig ? d : 0), yes = x > d / 2 + c; k[sig ? (yes ? 'h' : 'm') : (yes ? 'f' : 'c')]++; }
function runSim(seed) {
  resetData(true); seedRng(seed);
  PAYOFFS.forEach((P, i) => { for (let t = 0; t < 200; t++) simTrial(counts[i], SIM_D, optimalC(P, SIM_D)); });
  phase = 'done';
}

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('スペースで開始　J あった　F なかった　P 得点表　↑↓ 濃さ（' + amp + '）　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  let P0 = PAYOFFS[pay];
  text('得点表：' + P0.name + '（ヒット ' + P0.hit + '、見逃し ' + P0.miss + '、誤警報 ' + P0.fa + '、棄却 +' + P0.cr + '）｜ 感度 d′ は「どれだけ見分けられるか」、基準 c は「どれだけ『あった』と言いやすいか」', 20, 62);

  let sx = 20, sy = 90, sz = Math.min(width * 0.36, height * 0.5);
  if (phase === 'blank' && millis() - tPhase > 600) startTrial();
  if (phase === 'fix' && millis() - tPhase > 400) { phase = 'stim'; tPhase = millis(); }
  if (phase === 'stim' && millis() - tPhase > 500) phase = 'wait';
  noStroke(); fill(128); rect(sx, sy, sz, sz);
  if (phase === 'stim') { noSmooth(); image(pg, sx, sy, sz, sz); smooth(); }
  stroke(60); strokeWeight(2); let fx = sx + sz / 2, fy = sy + sz / 2; line(fx - 7, fy, fx + 7, fy); line(fx, fy - 7, fx, fy + 7);
  noStroke(); fill(205); textSize(15);
  let msg = { ready: simMode ? '' : 'スペースで開始（' + PER + ' 試行）', wait: 'あった（J）？ なかった（F）？', done: simMode ? 'シミュレーション観察者：各 200 試行' : 'この得点表は終わり。P で次の得点表 → スペース' }[phase] || '';
  text(msg, sx, sy + sz + 26);
  text('前の試行：' + lastMsg + '　得点 ' + score, sx, sy + sz + 50);
  // ---- 表
  let ty = sy + sz + 86, cx = [0, 100, 150, 200, 250, 300, 350, 400, 450]; textSize(13);
  ['得点表', 'ヒット', '見逃し', '誤警報', '棄却', 'H', 'F', 'd′', 'c'].forEach((h, j) => { fill(160); text(h, sx + cx[j], ty); });
  PAYOFFS.forEach((P, i) => {
    let k = counts[i], r = sdt(k), cells = [P.name, k.h, k.m, k.f, k.c].concat(r ? [r.H, r.F, r.d, r.c].map((v) => v.toFixed(2)) : ['-']);
    fill(i === pay ? 240 : 170); cells.forEach((v, j) => text(v, sx + cx[j], ty + 20 + i * 20));
  });

  // ---- ROC 曲線
  let g = { x: width * 0.55, y: 110, w: Math.min(width * 0.36, height * 0.52), h: Math.min(width * 0.36, height * 0.52), x0: 0, x1: 1, y0: 0, y1: 1 };
  plotAxes(g, '誤警報率 F', 'ヒット率 H', [0, 0.5, 1], [0, 0.5, 1]);
  stroke(80); line(g.x, g.y + g.h, g.x + g.w, g.y);
  let rs = PAYOFFS.map((P, i) => sdt(counts[i])).filter((r) => r), dm = rs.length ? rs.reduce((a, r) => a + r.d, 0) / rs.length : null;
  let roc = (d, col, w) => { stroke(col); strokeWeight(w); let p = []; for (let i = 0; i <= 100; i++) { let z = -4 + (8 * i) / 100; p.push([gX(g, Phi(z)), gY(g, Phi(z + d))]); } polyline(p); };
  if (simMode) roc(SIM_D, color(120, 200, 140), 1.5);
  if (dm !== null && isFinite(dm)) roc(dm, color(255, 170, 90), 2.5);
  let cols = [color(120, 190, 255), color(255, 120, 120), color(220, 200, 90)];
  PAYOFFS.forEach((P, i) => { let r = sdt(counts[i]); if (r) { noStroke(); fill(cols[i]); circle(gX(g, r.F), gY(g, r.H), 13); } });
  noStroke(); textSize(13);
  PAYOFFS.forEach((P, i) => { fill(cols[i]); text('● ' + P.name, g.x + g.w + 20, g.y + 20 + i * 22); });
  fill(235); textSize(16);
  let ry = g.y + g.h + 50;
  if (dm !== null) text('平均の d′ = ' + dm.toFixed(2) + '（橙：その d′ の理論 ROC　H = Φ(d′ + z(F))）', g.x, ry);
  fill(170); textSize(13);
  text('d′ が同じなら点は同じ曲線の上を動く（c だけ変わる）。対角線 = d′ 0', g.x, ry + 24);
  if (simMode) { fill(120, 200, 140); textSize(14); text('本当の d′ = ' + SIM_D + '、c = ' + PAYOFFS.map((P) => optimalC(P, SIM_D).toFixed(2)).join(' / ') + '（得点が最大になる基準）', g.x, ry + 48); }
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === ' ' && (phase === 'ready' || (phase === 'done' && !done()))) startTrial();
  if (key === 'j' || key === 'J') answer(true);
  if (key === 'f' || key === 'F') answer(false);
  if (key === 'p' || key === 'P') { pay = (pay + 1) % PAYOFFS.length; if (simMode) resetData(false); phase = 'ready'; }
  if (key === UP_ARROW) amp = Math.min(60, amp + 2);
  if (key === DOWN_ARROW) amp = Math.max(0, amp - 2);
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('Φ(0) = 0.5、z(Φ(1)) = 1', near(Phi(0), 0.5, 1e-6) && near(zOf(Phi(1)), 1, 1e-5));
  let zH = zOf(Phi(1)), zF = zOf(Phi(-0.5));
  check('H = Φ(1)、F = Φ(−0.5) → d′ = 1.5、c = −0.25', near(zH - zF, 1.5, 1e-5) && near(-(zH + zF) / 2, -0.25, 1e-5));
  let r = sdt({ h: 20, m: 0, f: 0, c: 20 });
  check('全部正解（H = 1、F = 0）でも 1/(2N) の補正で d′ は有限（= 2·z(1 − 1/40) = 3.92）', r && isFinite(r.d) && near(r.d, 2 * zOf(1 - 1 / 40), 1e-6));
  check('信号か雑音が 0 回なら計算しない（null）', sdt({ h: 3, m: 2, f: 0, c: 0 }) === null);
  seedRng(52); let ks = PAYOFFS.map(() => ({ h: 0, m: 0, f: 0, c: 0 }));
  PAYOFFS.forEach((P, i) => { for (let t = 0; t < 3000; t++) simTrial(ks[i], SIM_D, optimalC(P, SIM_D)); });
  let rr = ks.map(sdt);
  check('シミュレーション観察者 3000 試行 × 3：d′ ≈ 1.5（どの得点表でも ±0.12）', rr.every((q) => near(q.d, SIM_D, 0.12)));
  check('基準 c を復元（±0.08）：見逃すな < 中立 < 空振りするな', rr.every((q, i) => near(q.c, optimalC(PAYOFFS[i], SIM_D), 0.08)) && rr[1].c < rr[0].c && rr[0].c < rr[2].c);
  check('理論 ROC：F = 0.5、d′ = 1 → H = Φ(1) = 0.841', near(Phi(zOf(0.5) + 1), 0.8413, 1e-4));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 中立で 30 試行。自分の d′ と c はいくつ？ c が負なら「あった」と言いやすいタイプ
// 2. P で「見逃すな」「空振りするな」に変えて測ると、ROC の点はどう動く？ d′ は変わった？
// 3. ↑↓ で模様を濃くすると、d′ はどれくらい上がる？
// 4. O で本当の値と推定値を比べよう。PER を 10 にすると推定はどれくらいばらつく？
// 5. 医師の診断、空港の手荷物検査、迷惑メールのフィルタ……「基準 c」をどこに置くべきか考えよう


// ==================================================
// ここから下は「心理物理の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーション観察者と自己テストで使う
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
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 正規分布：Φ（累積分布）と z（その逆関数。二分法で数値的に解く）
function erfA(x) {                     // 誤差関数（Abramowitz & Stegun 7.1.26、誤差 1.5e-7 以下）
  let s = x < 0 ? -1 : 1; x = Math.abs(x);
  let t = 1 / (1 + 0.3275911 * x);
  let y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
function Phi(x) { return 0.5 * (1 + erfA(x / Math.SQRT2)); }
function zOf(p) {                      // Φ(z) = p となる z
  p = clampv(p, 1e-9, 1 - 1e-9);
  let lo = -9, hi = 9;
  for (let i = 0; i < 70; i++) { let m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// 割合を 1/(2N) で補正（0 や 1 だと z が無限大になるので）
function rateFix(k, n) { return n > 0 ? clampv(k / n, 1 / (2 * n), 1 - 1 / (2 * n)) : 0.5; }
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
