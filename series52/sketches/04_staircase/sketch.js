// ============================================
// 04 上下法（階段法）─ かすかな点が見えるしきい値
// 中心の + を見つめる。かすかな点が左か右に一瞬出るので、どちらだったかを答える（わからなくても必ず答える）
// 2 回続けて正解ならコントラストを 1 段下げ、1 回まちがえたら 1 段上げる（1-up-2-down）→ 正答率 70.7% の所を行ったり来たり
// （はじめは 1 回まちがえるまで 2 段ずつ下げて、すばやくしきい値の近くへ行く）
// しきい値 = 反転点（上がり下がりが変わった所）の平均。少ない試行で効率よく測れる
// クリック → スペースで開始 / ← → で答える / 2 = 1-up-2-down  3 = 1-up-3-down / O = シミュレーション観察者 / R = やり直し
// ============================================

const N_TRIALS = 30;                   // ★ 試行の数
const FACTOR = 1.25;                   // ★ 1 段の大きさ（1.25 倍 ≈ 2 dB）
const BG = 110;                        // ★ 背景の灰色（画面の値）
const BLOB = 5;                        // ★ 点の大きさ（ガウスの σ px）
const SHOW_MS = 400;                   // ★ 点を見せる時間 [ms]
const SIM = { alpha: 0.04, s: 0.35 };  // ★ シミュレーション観察者：正答率 = 0.5 + 0.5·L((ln c − ln α)/s)
let st, nDown = 2, phase = 'ready', tPhase = 0, cur = null, pg, simMode = false, simSeed = 1, simAvg = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(Math.floor(width * 0.42), 260); pg.pixelDensity(1);
  selfTest();
  resetData(false);
}
function resetData(sim) { simMode = sim; st = makeStair(0.12, FACTOR, nDown, 0.002, 0.6, true); phase = 'ready'; simAvg = null; seedRng(Date.now()); }

// 点の画像を 1 回だけ作る（ディザ = 小さな乱数を足して丸め、8 ビットより細かいコントラストも平均では正しく出す）
function makeStim(c, right) {
  pg.loadPixels();
  let W = pg.width, H = pg.height, cx = right ? W * 0.78 : W * 0.22, cy = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r2 = (x - cx) ** 2 + (y - cy) ** 2, v = BG * (1 + c * Math.exp(-r2 / (2 * BLOB * BLOB))) + rnd() - 0.5;
    let o = 4 * (y * W + x); pg.pixels[o] = pg.pixels[o + 1] = pg.pixels[o + 2] = clampv(Math.round(v), 0, 255); pg.pixels[o + 3] = 255;
  }
  pg.updatePixels();
}
function startTrial() {
  if (st.track.length >= N_TRIALS) { phase = 'done'; return; }
  cur = { right: rnd() < 0.5, c: st.v }; makeStim(cur.c, cur.right);
  phase = 'fix'; tPhase = millis();
}
function answer(right) {
  if (phase !== 'stim' && phase !== 'wait') return;
  stairUpdate(st, right === cur.right); phase = 'blank'; tPhase = millis();
}

// シミュレーション観察者
function simPc(c) { return 0.5 + 0.5 / (1 + Math.exp(-(Math.log(c) - Math.log(SIM.alpha)) / SIM.s)); }
function targetP(nd) { return Math.pow(0.5, 1 / nd); }                     // pⁿ = 0.5
function trueThreshold(nd) { let L = 2 * targetP(nd) - 1; return Math.exp(Math.log(SIM.alpha) + SIM.s * Math.log(L / (1 - L))); }
function simRun(n, nd) { let s = makeStair(0.12, FACTOR, nd, 0.002, 0.6, true); for (let t = 0; t < n; t++) stairUpdate(s, rnd() < simPc(s.v)); return s; }
function runSim(seed) {
  resetData(true); seedRng(seed);
  st = simRun(60, nDown);
  let th = []; for (let r = 0; r < 20; r++) th.push(Math.log(stairThreshold(simRun(60, nDown), 2)));
  simAvg = Math.exp(th.reduce((a, b) => a + b, 0) / th.length); phase = 'done';
}

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('スペースで開始　← 左　→ 右　2：1-up-2-down　3：1-up-3-down（いま 1-up-' + nDown + '-down → ' + (targetP(nDown) * 100).toFixed(1) + '%）　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  text('+ を見つめて、かすかな点が出たのは左か右か。見えなくても必ずどちらかを答える（当てずっぽうでも 50% は当たる）', 20, 62);

  // ---- 刺激
  let sx = 20, sy = 90;
  if (phase === 'blank' && millis() - tPhase > 500) startTrial();
  if (phase === 'fix' && millis() - tPhase > 500) { phase = 'stim'; tPhase = millis(); }
  if (phase === 'stim' && millis() - tPhase > SHOW_MS) phase = 'wait';
  if (phase === 'stim') image(pg, sx, sy);
  else { noStroke(); fill(BG); rect(sx, sy, pg.width, pg.height); }
  stroke(phase === 'wait' ? 60 : 30); strokeWeight(2);
  let fx = sx + pg.width / 2, fy = sy + pg.height / 2; line(fx - 8, fy, fx + 8, fy); line(fx, fy - 8, fx, fy + 8);
  noStroke(); fill(200); textSize(15);
  let msg = { ready: simMode ? '' : 'スペースで開始（' + N_TRIALS + ' 試行）', wait: '左？ 右？（← / →）', done: simMode ? '' : 'おつかれさま！ R でもう一度' }[phase] || '';
  text(msg, sx, sy + pg.height + 26);
  text((simMode ? 'シミュレーション観察者' : 'あなたが観察者') + '　試行 ' + st.track.length + (simMode ? '' : ' / ' + N_TRIALS) + '　いまのコントラスト ' + (st.v * 100).toFixed(2) + '%　反転 ' + st.revs.length + ' 回', sx, sy + pg.height + 50);

  // ---- 階段のグラフ（コントラストは対数）
  let g = { x: width * 0.52, y: 110, w: width * 0.44, h: height * 0.5, x0: 0, x1: Math.max(N_TRIALS, st.track.length), y0: 0.003, y1: 0.6, logy: true };
  plotAxes(g, '試行', 'コントラスト（対数）', [0, Math.round(g.x1 / 2), g.x1], [0.005, 0.01, 0.03, 0.1, 0.3]);
  stroke(120); strokeWeight(1.5);
  polyline(st.track.map((q, i) => [gX(g, i), gY(g, q.v)]));
  for (let i = 0; i < st.track.length; i++) {
    let q = st.track[i], x = gX(g, i), y = gY(g, q.v);
    if (q.ok) { noStroke(); fill(120, 210, 150); circle(x, y, 8); } else { stroke(255, 100, 100); strokeWeight(2); line(x - 4, y - 4, x + 4, y + 4); line(x - 4, y + 4, x + 4, y - 4); }
  }
  noFill(); stroke(255, 210, 120); strokeWeight(1.5);
  for (let r of st.revs) circle(gX(g, r.i), gY(g, r.v), 16);
  let th = st.track.length >= 4 ? stairThreshold(st, 2) : null;
  if (th) { stroke(255, 170, 90); strokeWeight(2.5); line(g.x, gY(g, th), g.x + g.w, gY(g, th)); }
  if (simMode) { stroke(120, 200, 140); strokeWeight(1.5); let t = trueThreshold(nDown); line(g.x, gY(g, t), g.x + g.w, gY(g, t)); }
  noStroke(); fill(235); textSize(17);
  let ry = g.y + g.h + 56;
  text(th ? 'しきい値（反転点の平均、最初の 2 つは除く）= ' + (th * 100).toFixed(2) + '%' : '4 試行以上でしきい値を計算', g.x, ry);
  fill(170); textSize(13); text('● 正解　× まちがい　○ 反転点　橙の線 = しきい値', g.x, ry + 24);
  if (simMode) {
    fill(120, 200, 140); textSize(15);
    text('本当の ' + (targetP(nDown) * 100).toFixed(1) + '% 点 = ' + (trueThreshold(nDown) * 100).toFixed(2) + '%　｜ 60 試行 × 20 回の平均 = ' + (simAvg * 100).toFixed(2) + '%', g.x, ry + 50);
  }
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === ' ' && phase === 'ready') startTrial();
  if (key === LEFT_ARROW) answer(false);
  if (key === RIGHT_ARROW) answer(true);
  if (key === '2' || key === '3') { nDown = +key; resetData(false); }
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('1-up-2-down の目標 p² = 0.5 → 70.71%、1-up-3-down p³ = 0.5 → 79.37%', near(targetP(2), 0.70711, 1e-5) && near(targetP(3), 0.79370, 1e-5));
  check('本当の 70.7% 点で正答率がちょうど 0.7071', near(simPc(trueThreshold(2)), targetP(2), 1e-9));
  let s = makeStair(0.01, 2, 2, 0.005, 0.02); for (let i = 0; i < 10; i++) stairUpdate(s, true);
  check('階段は下限・上限の外に出ない（正解ばかりでも 0.005 で止まる）', near(s.v, 0.005));
  check('データがないときのしきい値は null（0 で割らない）', stairThreshold(makeStair(0.1, 1.25, 2, 0.01, 1), 2) === null);
  seedRng(52); let a = [], b = [];
  for (let r = 0; r < 40; r++) { a.push(Math.log(stairThreshold(simRun(80, 2), 2))); b.push(Math.log(stairThreshold(simRun(80, 3), 2))); }
  let ma = Math.exp(a.reduce((x, y) => x + y) / a.length), mb = Math.exp(b.reduce((x, y) => x + y) / b.length);
  check('シミュレーション観察者 1-up-2-down：平均しきい値 ≈ 70.7% 点（1 段 = ×1.25 以内）', Math.abs(Math.log(ma / trueThreshold(2))) < Math.log(FACTOR));
  check('1-up-3-down：平均しきい値 ≈ 79.4% 点（1 段以内）、2-down より高い', Math.abs(Math.log(mb / trueThreshold(3))) < Math.log(FACTOR) && mb > ma);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 30 試行で自分のしきい値を測ろう。グラフの階段はどこで行ったり来たりしている？
// 2. 3 を押して 1-up-3-down にすると、しきい値は上がる？ 下がる？ なぜ？
// 3. BLOB を 2 や 15 にすると、しきい値はどう変わる？（点が大きいほど見えやすい？）
// 4. FACTOR を 2 にすると速く近づくが、ゆれは大きくなる。O で比べよう
// 5. 背景 BG を暗く（40）すると、同じコントラストでも見え方は変わる？


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
// ---- 上下法（階段法）：nDown 回続けて正答で 1 段下げ（難しく）、1 回まちがえたら 1 段上げ（やさしく）
// 値は掛け算で動かす（factor 倍）。1-up-2-down は正答率 70.7%（p² = 0.5）、1-up-3-down は 79.4% に集まる
// fast = true なら、最初にまちがえるまでは 1 回正解ごとに factor² ずつ下げて、すばやくしきい値の近くへ
function makeStair(start, factor, nDown, lo, hi, fast) {
  return { v: start, factor, nDown, lo, hi, fast: !!fast, run: 0, dir: 0, track: [], revs: [] };
}
function stairUpdate(st, correct) {
  st.track.push({ v: st.v, ok: correct });
  if (st.fast && !correct) st.fast = false;
  if (st.fast) { st.dir = -1; st.v = clampv(st.v / (st.factor * st.factor), st.lo, st.hi); return; }
  let move = 0;
  if (correct) { st.run++; if (st.run >= st.nDown) { st.run = 0; move = -1; } }
  else { st.run = 0; move = 1; }
  if (move !== 0) {
    if (st.dir !== 0 && move !== st.dir) st.revs.push({ i: st.track.length - 1, v: st.v });   // 向きが変わった = 反転点
    st.dir = move;
    st.v = clampv(move < 0 ? st.v / st.factor : st.v * st.factor, st.lo, st.hi);
  }
}
// しきい値 = 反転点の幾何平均（最初の skip 個は練習とみなして捨てる）。足りなければ最後の 6 試行の幾何平均
function stairThreshold(st, skip) {
  let r = st.revs.slice(skip === undefined ? 2 : skip).map((q) => q.v);
  if (r.length < 2) r = st.track.slice(-6).map((q) => q.v);
  if (r.length === 0) return null;
  return Math.exp(r.reduce((s, v) => s + Math.log(v), 0) / r.length);
}
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
