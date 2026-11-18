// ============================================
// 06 2 肢強制選択（2AFC）─ 左右どちらに模様があった？
// 2 つのノイズの片方にだけ、かすかな縞模様が入っている。どちらだったかを ← → で答える
// 正答率 Pc と感度の関係は Pc = Φ(d′/√2)。「あった/なかった」（Yes/No）とちがい、答えのくせ（基準 c）の影響を受けない
// Y で Yes/No 課題（模様は 1 つ、J = あった F = なかった）に切りかえて、同じ濃さで d′ を比べる
// クリック → スペースで開始 / ← → / Y = 課題の切りかえ / ↑↓ = 濃さ / O = シミュレーション観察者 / R = やり直し
// ============================================

const PER = 30;                        // ★ 課題 1 つあたりの試行
const NOISE_SD = 28;                   // ★ ノイズの強さ
let amp = 10;                          // ★ 縞模様の濃さ（↑↓）
const SIM = { d: 1.2, cYN: 0.4 };      // ★ シミュレーション観察者：本当の d′ と、Yes/No での基準（「なかった」と言いやすい）
let task = 0, res = [], phase = 'ready', tPhase = 0, cur = null, bufs = [], simMode = false, simSeed = 1;
const N = 112;

function setup() {
  createCanvas(windowWidth, windowHeight);
  bufs = [createGraphics(N, N), createGraphics(N, N)]; bufs.forEach((b) => b.pixelDensity(1));
  selfTest();
  resetData(false);
}
function resetData(sim) { simMode = sim; res = [{ ok: 0, n: 0, left: 0 }, { h: 0, m: 0, f: 0, c: 0 }]; phase = 'ready'; seedRng(Date.now()); }
function fillNoise(b, sig) {
  b.loadPixels();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let dx = x - N / 2, dy = y - N / 2, env = Math.exp(-(dx * dx + dy * dy) / (2 * 16 * 16));
    let v = 128 + NOISE_SD * rndNormal() + (sig ? amp * env * Math.sin((2 * Math.PI * dx) / 11) : 0);
    let o = 4 * (y * N + x); b.pixels[o] = b.pixels[o + 1] = b.pixels[o + 2] = clampv(v, 0, 255); b.pixels[o + 3] = 255;
  }
  b.updatePixels();
}
function nDone() { return task === 0 ? res[0].n : res[1].h + res[1].m + res[1].f + res[1].c; }
function startTrial() {
  if (nDone() >= PER) { phase = 'done'; return; }
  cur = { right: rnd() < 0.5, sig: rnd() < 0.5 };
  if (task === 0) { fillNoise(bufs[0], !cur.right); fillNoise(bufs[1], cur.right); } else fillNoise(bufs[0], cur.sig);
  phase = 'fix'; tPhase = millis();
}
function answer2(right) {
  if (task !== 0 || (phase !== 'stim' && phase !== 'wait')) return;
  res[0].n++; if (right === cur.right) res[0].ok++; if (!right) res[0].left++;
  phase = 'blank'; tPhase = millis();
}
function answerYN(yes) {
  if (task !== 1 || (phase !== 'stim' && phase !== 'wait')) return;
  res[1][cur.sig ? (yes ? 'h' : 'm') : (yes ? 'f' : 'c')]++; phase = 'blank'; tPhase = millis();
}
// 2AFC：d′ = √2 · z(Pc)　／　Yes/No：d′ = z(H) − z(F)
function d2afc(r) { return r.n > 0 ? Math.SQRT2 * zOf(rateFix(r.ok, r.n)) : null; }
function dYN(k) { let ns = k.h + k.m, nn = k.f + k.c; if (!ns || !nn) return null; let zH = zOf(rateFix(k.h, ns)), zF = zOf(rateFix(k.f, nn)); return { d: zH - zF, c: -(zH + zF) / 2, pc: (k.h + k.c) / (ns + nn) }; }
function pc2afc(d) { return Phi(d / Math.SQRT2); }
// シミュレーション観察者
function sim2(r, d) { let right = rnd() < 0.5, xl = rndNormal() + (right ? 0 : d), xr = rndNormal() + (right ? d : 0), ans = xr > xl; r.n++; if (ans === right) r.ok++; if (!ans) r.left++; }
function simYN(k, d, c) { let sig = rnd() < 0.5, yes = rndNormal() + (sig ? d : 0) > d / 2 + c; k[sig ? (yes ? 'h' : 'm') : (yes ? 'f' : 'c')]++; }
function runSim(seed) { resetData(true); seedRng(seed); for (let t = 0; t < 300; t++) { sim2(res[0], SIM.d); simYN(res[1], SIM.d, SIM.cYN); } phase = 'done'; }

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  text('スペースで開始　' + (task === 0 ? '← 左　→ 右' : 'J あった　F なかった') + '　Y 課題（いま：' + (task === 0 ? '2 肢強制選択' : 'Yes/No') + '）　↑↓ 濃さ（' + amp + '）　O シミュレーション観察者　R やり直し', 20, 36);
  fill(170); textSize(15);
  text(task === 0 ? '+ を見つめて、模様が入っていたのは左か右か（必ず答える）' : '模様が入っていたか、いなかったか', 20, 62);

  let sx = 20, sy = 100, sz = Math.min(width * 0.2, height * 0.34);
  if (phase === 'blank' && millis() - tPhase > 600) startTrial();
  if (phase === 'fix' && millis() - tPhase > 400) { phase = 'stim'; tPhase = millis(); }
  if (phase === 'stim' && millis() - tPhase > 500) phase = 'wait';
  noStroke(); fill(128); rect(sx, sy, sz * 2 + 40, sz);
  noSmooth();
  if (phase === 'stim') { if (task === 0) { image(bufs[0], sx, sy, sz, sz); image(bufs[1], sx + sz + 40, sy, sz, sz); } else image(bufs[0], sx + sz / 2 + 20, sy, sz, sz); }
  smooth();
  stroke(60); strokeWeight(2); let fx = sx + sz + 20, fy = sy + sz / 2; line(fx - 7, fy, fx + 7, fy); line(fx, fy - 7, fx, fy + 7);
  noStroke(); fill(205); textSize(15);
  let msg = { ready: simMode ? '' : 'スペースで開始（' + PER + ' 試行）', wait: task === 0 ? '左？ 右？' : 'あった（J）？ なかった（F）？', done: simMode ? 'シミュレーション観察者（各 300 試行）' : 'Y でもう 1 つの課題 → スペース' }[phase] || '';
  text(msg, sx, sy + sz + 28);
  text((simMode ? 'シミュレーション観察者' : 'あなたが観察者') + '　' + (task === 0 ? '2AFC' : 'Yes/No') + '　' + nDone() + (simMode ? '' : ' / ' + PER), sx, sy + sz + 52);

  // ---- 結果
  let r0 = res[0], d0 = d2afc(r0), r1 = dYN(res[1]), ty = sy + sz + 96;
  fill(235); textSize(16);
  text('2AFC：正答 ' + r0.ok + ' / ' + r0.n + (r0.n ? '　Pc = ' + (r0.ok / r0.n).toFixed(2) + '　d′ = √2·z(Pc) = ' + d0.toFixed(2) + '　「左」と答えた割合 ' + (r0.left / r0.n).toFixed(2) : ''), sx, ty);
  let k = res[1];
  text('Yes/No：ヒット ' + k.h + '　見逃し ' + k.m + '　誤警報 ' + k.f + '　棄却 ' + k.c + (r1 ? '　正答率 ' + r1.pc.toFixed(2) + '　d′ = ' + r1.d.toFixed(2) + '　c = ' + r1.c.toFixed(2) : ''), sx, ty + 28);
  fill(170); textSize(13);
  text('2AFC の「左」の割合が 0.5 からずれても、正答率にはほとんど効かない。Yes/No では c がずれると正答率が下がる', sx, ty + 54);
  if (simMode) { fill(120, 200, 140); textSize(14); text('本当の d′ = ' + SIM.d + '（両方の課題で同じ）、Yes/No の基準 c = ' + SIM.cYN + '　→ 2AFC の理論正答率 ' + pc2afc(SIM.d).toFixed(3), sx, ty + 80); }

  // ---- Pc と d′ のグラフ
  let g = { x: width * 0.6, y: 110, w: width * 0.35, h: height * 0.48, x0: 0, x1: 3, y0: 0.4, y1: 1 };
  plotAxes(g, '感度 d′', '正答率 Pc', [0, 1, 2, 3], [0.5, 0.75, 1]);
  let curveOf = (f, col) => { stroke(col); strokeWeight(2.5); let p = []; for (let i = 0; i <= 100; i++) { let d = (3 * i) / 100; p.push([gX(g, d), gY(g, f(d))]); } polyline(p); };
  curveOf(pc2afc, color(255, 170, 90)); curveOf((d) => Phi(d / 2), color(120, 190, 255));
  noStroke(); textSize(13);
  fill(255, 170, 90); text('2AFC：Pc = Φ(d′/√2)', g.x + 10, g.y + 20);
  fill(120, 190, 255); text('Yes/No（くせのない c = 0）：Pc = Φ(d′/2)', g.x + 10, g.y + 40);
  if (d0 !== null) { fill(255, 170, 90); circle(gX(g, clampv(d0, 0, 3)), gY(g, r0.ok / r0.n), 14); }
  if (r1) { fill(120, 190, 255); circle(gX(g, clampv(r1.d, 0, 3)), gY(g, r1.pc), 14); }
  fill(170); textSize(13); text('同じ d′ でも、2AFC のほうが正答率は高い（2 つを比べられるから）', g.x, g.y + g.h + 50);
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function keyPressed() {
  if (key === ' ' && (phase === 'ready' || phase === 'done') && nDone() < PER) startTrial();
  if (key === LEFT_ARROW) answer2(false);
  if (key === RIGHT_ARROW) answer2(true);
  if (key === 'j' || key === 'J') answerYN(true);
  if (key === 'f' || key === 'F') answerYN(false);
  if (key === 'y' || key === 'Y') { task = 1 - task; phase = 'ready'; if (simMode) resetData(false); }
  if (key === UP_ARROW) amp = Math.min(60, amp + 2);
  if (key === DOWN_ARROW) amp = Math.max(0, amp - 2);
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('d′ = 0 なら 2AFC の正答率は 0.5（当てずっぽう）', near(pc2afc(0), 0.5, 1e-6));
  check('d′ = 1 → Pc = Φ(1/√2) = 0.760', near(pc2afc(1), 0.7602, 1e-4));
  check('Pc から d′ にもどす：√2·z(Φ(1.2/√2)) = 1.2', near(Math.SQRT2 * zOf(pc2afc(1.2)), 1.2, 1e-5));
  seedRng(52); let a = { ok: 0, n: 0, left: 0 }, b = { h: 0, m: 0, f: 0, c: 0 };
  for (let t = 0; t < 5000; t++) { sim2(a, SIM.d); simYN(b, SIM.d, SIM.cYN); }
  check('シミュレーション 5000 試行：2AFC の正答率 ≈ Φ(d′/√2)（±0.015）', near(a.ok / a.n, pc2afc(SIM.d), 0.015));
  check('2AFC から d′ ≈ 1.2（±0.08）', near(d2afc(a), SIM.d, 0.08));
  let y = dYN(b);
  check('Yes/No（基準がかたよっても）d′ ≈ 1.2（±0.1）、c ≈ 0.4（±0.08）', near(y.d, SIM.d, 0.1) && near(y.c, SIM.cYN, 0.08));
  check('かたよった基準の Yes/No は正答率が下がる（< Φ(d′/2)）', y.pc < Phi(SIM.d / 2));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 同じ濃さで 2AFC と Yes/No を 30 試行ずつ。d′ は近い値になった？ 正答率はどちらが高い？
// 2. 2AFC で「左」と答えた割合を見よう。くせがあっても d′ はあまり変わらないのはなぜ？
// 3. ↑↓ で濃さを変えて 2AFC の正答率をいくつか測り、グラフの曲線の上に乗るか確かめよう
// 4. SIM.cYN を 0 や 1 にして O。Yes/No の正答率はどう変わる？ d′ は？
// 5. 3 つや 4 つから選ぶ課題（3AFC、4AFC）では、当てずっぽうの正答率はいくつ？


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
