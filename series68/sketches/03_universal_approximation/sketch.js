// ============================================
// 03 万能近似 ─ 隠れ層が 1 層でも、ニューロンを増やせばどんな連続関数にもいくらでも近づける（シベンコ 1989 ほか）
// 出力 = b + Σ v_k f(w_k x + c_k)。ここでは学習せず、近似を「組み立てる」（構成的な証明）：
//   ① シグモイドの段：急なシグモイド σ(s(x − m)) は「段」。段の高さを関数の差にして n 段のかいだん
//   ② ReLU の折れ線：ReLU(x − t) は t で折れる。傾きの変化を重みにすれば、n 個で n 区間の折れ線（各点を通る）
//   ③ こぶ：シグモイド 2 個の差 σ(s(x − a)) − σ(s(x − b)) は a〜b の「こぶ」。こぶを並べて関数をつくる
// 誤差は n を 2 倍にすると、段・こぶは約 1/2、折れ線は約 1/4（なめらかな関数なら）
// ドラッグ 関数を描く / 1 2 3 作り方 / ↑↓ ニューロンの数を 2 倍・半分 / ← → 1 つずつ / R 別の関数 / D お手本の関数
// ============================================

const NS = 400;                          // 関数を調べる点の数
const STEEP = 6;                         // ★ シグモイドの急さ（段の幅の何分の 1 で立ち上がるか）
const MODES = ['シグモイドの段', 'ReLU の折れ線', 'シグモイド 2 個のこぶ'];
let target = new Float64Array(NS + 1), units = 8, modeA = 0, seedF = 1, errTab = null, lastDrag = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  setDefault(); updateErr();
}

function demoFn(x) { return 0.55 * Math.sin(2 * Math.PI * x) + 0.3 * Math.cos(9 * x) * x - 0.1; }
function setDefault() { for (let i = 0; i <= NS; i++) target[i] = demoFn(i / NS); }
function setRandom() {                   // ランダムな sin の和（種つき）
  seedRng(40 + seedF); let a = [], f = [], ph = [];
  for (let k = 0; k < 4; k++) { a.push((0.5 * randn()) / (k + 1)); f.push(1 + k * 2 + 2 * rnd()); ph.push(6.28 * rnd()); }
  for (let i = 0; i <= NS; i++) { let x = i / NS, v = 0; for (let k = 0; k < 4; k++) v += a[k] * Math.sin(f[k] * x * 3.14 + ph[k]); target[i] = clampv(v, -1, 1); }
}
function tAt(fn, x) { if (typeof fn === 'function') return fn(x); let u = clampv(x, 0, 1) * NS, i = Math.min(NS - 1, Math.floor(u)), t = u - i; return fn[i] * (1 - t) + fn[i + 1] * t; }

// ★ 近似を組み立てる：戻り値 = { b, terms: [{ kind, w, c, v }] }（出力 = b + Σ v f(w x + c)）
function buildApprox(fn, n, kind) {
  let terms = [];
  if (kind === 0) {                      // かいだん：区間の中央 m_k で段、高さ = 関数の差
    let s = STEEP * 2 * n;
    for (let k = 1; k <= n; k++) { let x0 = (k - 1) / n, x1 = k / n; terms.push({ f: 'sigmoid', w: s, c: -s * ((x0 + x1) / 2), v: tAt(fn, x1) - tAt(fn, x0) }); }
    return { b: tAt(fn, 0), terms };
  }
  if (kind === 1) {                      // 折れ線：t_k = k/n で傾きが変わる
    let prev = 0;
    for (let k = 0; k < n; k++) { let t0 = k / n, sl = (tAt(fn, (k + 1) / n) - tAt(fn, t0)) * n; terms.push({ f: 'relu', w: 1, c: -t0, v: sl - prev }); prev = sl; }
    return { b: tAt(fn, 0), terms };
  }
  let nb = Math.max(1, Math.floor(n / 2)), s = STEEP * 2 * nb;   // こぶ：2 個 1 組で n/2 個
  for (let k = 0; k < nb; k++) {
    let a = k / nb, b = (k + 1) / nb, h = tAt(fn, (a + b) / 2);
    terms.push({ f: 'sigmoid', w: s, c: -s * a, v: h }, { f: 'sigmoid', w: s, c: -s * b, v: -h });
  }
  return { b: 0, terms };
}
function evalApprox(ap, x) { let o = ap.b; for (let t of ap.terms) o += t.v * actF(t.f, t.w * x + t.c); return o; }
function approxErr(fn, ap) {              // 2 乗平均の誤差（RMS）と最大の誤差
  let s = 0, mx = 0;
  for (let i = 0; i <= NS; i++) { let x = i / NS, e = evalApprox(ap, x) - tAt(fn, x); s += e * e; mx = Math.max(mx, Math.abs(e)); }
  return { rms: Math.sqrt(s / (NS + 1)), max: mx };
}
const N_LIST = [2, 4, 8, 16, 32, 64, 128];
function updateErr() { errTab = [0, 1, 2].map((k) => N_LIST.map((n) => approxErr(target, buildApprox(target, n, k)).rms)); }

function draw() {
  background(...BG);
  let ap = buildApprox(target, units, modeA), er = approxErr(target, ap);
  hudTitle('万能近似：' + MODES[modeA] + '　ニューロン ' + ap.terms.length + ' 個　誤差 RMS ' + fmtN(er.rms, 4) + '　最大 ' + fmtN(er.max, 3),
    'ドラッグ 関数を描く　1 2 3 作り方　↑↓ ニューロン 2 倍・半分　← → 1 つずつ　R 別の関数　D お手本　（出力 = b + Σ v_k f(w_k x + c_k)）');
  let lw = width * 0.58, g = { x: 60, y: 100, w: lw - 60, h: (height - 230) * 0.6, x0: 0, x1: 1, y0: -1.2, y1: 1.2 };
  plotAxes(g, 'x', 'マゼンタ = 描いた関数　白 = ニューロンの和', [0, 0.5, 1], [-1, 0, 1]);
  let xs = []; for (let i = 0; i <= 300; i++) xs.push(i / 300);
  plotXY(g, xs, xs.map((x) => tAt(target, x)), MAG, 4);
  plotXY(g, xs, xs.map((x) => evalApprox(ap, x)), INK, 2);
  // ニューロン 1 個ずつの出力（下の段）
  let g2 = { x: 60, y: g.y + g.h + 50, w: g.w, h: (height - 230) * 0.3, x0: 0, x1: 1, y0: -1, y1: 1 };
    plotAxes(g2, 'x', 'ニューロン 1 個ずつの出力 v_k f(w_k x + c_k)（' + (modeA === 1 ? '折れ線の部品' : modeA === 0 ? '段' : 'こぶ = 2 個の差') + '）', [0, 0.5, 1], [-1, 0, 1]);
  let showT = ap.terms.slice(0, 64);
  showT.forEach((t, k) => {
    if (modeA === 2 && k % 2 === 1) return;
    let yy = xs.map((x) => (modeA === 2 ? t.v * actF(t.f, t.w * x + t.c) + showT[k + 1].v * actF(showT[k + 1].f, showT[k + 1].w * x + showT[k + 1].c) : t.v * actF(t.f, t.w * x + t.c)));
    let sc = modeA === 1 ? 1 / Math.max(1e-9, ...ap.terms.map((q) => Math.abs(q.v))) : 1;
    plotXY(g2, xs, yy.map((v) => v * sc), [...[SKY, LIME, AMBER][k % 3], 170], 1.5);
  });
  // ---- 右：ニューロンの数と誤差
  let rx = lw + 60, g3 = { x: rx, y: 110, w: width - rx - 40, h: Math.min(360, height - 330), x0: Math.log2(2), x1: Math.log2(128), y0: -4, y1: 0 };
  plotAxes(g3, 'ニューロンの数 n（2 倍ずつ）', 'log₁₀ 誤差（RMS）', [], [-4, -3, -2, -1, 0]);
  noStroke(); fill(...SUB); textSize(11); textAlign(CENTER, TOP);
  N_LIST.forEach((n) => text(n, gX(g3, Math.log2(n)), g3.y + g3.h + 4));
  let cols = [MAG, SKY, LIME];
  for (let k = 0; k < 3; k++) {
    plotXY(g3, N_LIST.map(Math.log2), errTab[k].map((v) => Math.log10(Math.max(1e-6, v))), cols[k], k === modeA ? 4 : 1.5);
    for (let i = 0; i < N_LIST.length; i++) { noStroke(); fill(...cols[k]); circle(gX(g3, Math.log2(N_LIST[i])), gY(g3, Math.log10(Math.max(1e-6, errTab[k][i]))), k === modeA ? 8 : 5); }
  }
  legend(g3.x + 12, g3.y + g3.h - 60, [[MAG, MODES[0]], [SKY, MODES[1]], [LIME, MODES[2]]]);
  fill(...INK); textSize(14); textAlign(LEFT, BASELINE);
  let ty = g3.y + g3.h + 60, r16 = errTab[1][3] / Math.max(1e-12, errTab[1][4]), s16 = errTab[0][3] / Math.max(1e-12, errTab[0][4]);
  text('n = 16 → 32 で誤差は：段 ÷' + fmtN(s16, 1) + '、折れ線 ÷' + fmtN(r16, 1), rx, ty);
  fill(...SUB); textSize(13);
  text('段は高さのずれ（傾き × 幅）が残るので約 1/2 ずつ。', rx, ty + 24);
  text('折れ線は曲がり（2 階微分 × 幅²）だけ残るので約 1/4 ずつ。', rx, ty + 44);
  text('角やギザギザを描くと、なめらかな関数より誤差が下がりにくい', rx, ty + 64);
  text('定理は「いくらでも近づける」だけ。何個要るか・学習で見つかるかは別の話', rx, ty + 90);
  drawSelfTest(width - 180, height - 14);
}

function mouseDragged() {
  let lw = width * 0.58, gx = 60, gw = lw - 60, gy = 100, gh = (height - 230) * 0.6;
  let x = (mouseX - gx) / gw, y = 1.2 - ((mouseY - gy) / gh) * 2.4;
  if (x < 0 || x > 1 || mouseY < gy || mouseY > gy + gh) { lastDrag = null; return; }
  y = clampv(y, -1.15, 1.15);
  let p = lastDrag || [x, y], i0 = Math.round(Math.min(p[0], x) * NS), i1 = Math.round(Math.max(p[0], x) * NS);
  for (let i = i0; i <= i1; i++) { let t = Math.abs(x - p[0]) > 1e-9 ? (i / NS - p[0]) / (x - p[0]) : 1; target[i] = p[1] + (y - p[1]) * clampv(t, 0, 1); }   // 前の位置との間を直線でうめる
  lastDrag = [x, y];
}
function mouseReleased() { lastDrag = null; updateErr(); }
function keyPressed() {
  if (key >= '1' && key <= '3') modeA = +key - 1;
  if (key === UP_ARROW) units = Math.min(128, units * 2);
  if (key === DOWN_ARROW) units = Math.max(1, Math.floor(units / 2));
  if (key === RIGHT_ARROW) units = Math.min(128, units + 1);
  if (key === LEFT_ARROW) units = Math.max(1, units - 1);
  if (key === 'r' || key === 'R') { seedF++; setRandom(); updateErr(); }
  if (key === 'd' || key === 'D') { setDefault(); updateErr(); }
  return false;
}

// ============================================
// やってみよう
// ・ニューロン 4 個・8 個・16 個で、3 つの作り方を見比べる。どれがいちばん少ない数で近い？
// ・階段のような関数（とびのある関数）を描く。シグモイドの段と ReLU の折れ線、どちらが得意？
// ・STEEP を 1 や 30 にする。ゆるい段だと何が起きる？
// ・学習（04〜05 の誤差逆伝播）でも同じくらい少ない数で近づけるか、考えてみよう
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let fn = (x) => Math.sin(2 * Math.PI * x) + 0.5 * Math.cos(5 * x), dec = true, msg = [];
  for (let k = 0; k < 3; k++) {
    let e = [4, 8, 16, 32].map((n) => approxErr(fn, buildApprox(fn, n, k)).rms);
    for (let i = 1; i < e.length; i++) if (!(e[i] < e[i - 1])) dec = false;
    msg.push(fmtN(e[0], 3) + '→' + fmtN(e[3], 4));
  }
  check('ニューロン 4 → 8 → 16 → 32 で誤差が下がる（' + msg.join('、') + '）', dec);
  let ap = buildApprox(fn, 10, 1), knotErr = 0;
  for (let k = 0; k <= 10; k++) knotErr = Math.max(knotErr, Math.abs(evalApprox(ap, k / 10) - fn(k / 10)));
  check('ReLU 10 個の折れ線は 11 個の節点で関数とぴったり一致（ずれ ' + fmtE(knotErr) + '）', knotErr < 1e-12);
  let r = approxErr(fn, buildApprox(fn, 16, 1)).rms / approxErr(fn, buildApprox(fn, 32, 1)).rms;
  check('折れ線の誤差は n を 2 倍で約 1/4（比 ' + fmtN(r, 2) + '）', r > 3.2 && r < 4.8);
  let s = 200, bump = (x) => sigm(s * (x - 0.4)) - sigm(s * (x - 0.6));
  check('シグモイド 2 個の差は「こぶ」：中で ' + fmtN(bump(0.5), 4) + '、外で ' + fmtE(bump(0.2)), bump(0.5) > 0.99 && bump(0.2) < 1e-3 && bump(0.8) < 1e-3);
  check('シグモイド 64 個の段で、なめらかな関数の最大誤差 < 0.1', approxErr(fn, buildApprox(fn, 64, 0)).max < 0.1);
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- 活性化関数とその微分（name = 'step' 'sigmoid' 'tanh' 'relu' 'softplus'）
const ACT_NAMES = ['step', 'sigmoid', 'tanh', 'relu', 'softplus'];
function actF(name, z) {
  if (name === 'step') return z >= 0 ? 1 : 0;
  if (name === 'sigmoid') return sigm(z);
  if (name === 'tanh') return Math.tanh(z);
  if (name === 'relu') return z > 0 ? z : 0;
  return z > 30 ? z : Math.log(1 + Math.exp(z));           // softplus = log(1 + eᶻ)
}
function actD(name, z) {                 // 微分 f'(z)（ステップは 0、ReLU の 0 での微分は 0 とする）
  if (name === 'step') return 0;
  if (name === 'sigmoid') { let s = sigm(z); return s * (1 - s); }
  if (name === 'tanh') { let t = Math.tanh(z); return 1 - t * t; }
  if (name === 'relu') return z > 0 ? 1 : 0;
  return sigm(z);                          // softplus の微分 = シグモイド
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
