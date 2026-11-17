// ============================================
// 02 ファジィ集合の演算 ─ かつ・または・でない
// AND（t ノルム）：min・積・ウカシェヴィチ max(0, a + b − 1)　OR（s ノルム）：max・確率和 a + b − ab・有界和
// NOT（補集合）：1 − μ。ファジィでは「A かつ A でない」が空にならない（排中律・矛盾律が成り立たない）
// ドラッグ = A・B を動かす / 1〜3 = AND の種類 / 4〜6 = OR の種類 / スペース = 上の図を AND → OR → NOT A
// ============================================

let pA = 4, pB = 6.5;        // ★ A・B の頂点の位置
let wA = 2.5, wB = 2;        // ★ 三角の半分の幅
let tn = 0, sn = 0, view = 0;
let XLO = 0, XHI = 10, NX = 1000;   // x は 0.01 刻み（三角の折れ目が格子に乗る）
const VIEWS = ['A かつ B', 'A または B', 'A でない'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
}
function muA(x) { return trimf(x, pA - wA, pA, pA + wA); }
function muB(x) { return trimf(x, pB - wB, pB, pB + wB); }
function opAt(x) {
  let a = muA(x), b = muB(x);
  return view === 0 ? T_NORMS[tn].f(a, b) : view === 1 ? S_NORMS[sn].f(a, b) : fnot(a);
}

function draw() {
  background(250, 18, 14);
  fill(0, 0, 95); noStroke(); textSize(18);
  text('ドラッグ：A・B を動かす　1〜3：AND = ' + T_NORMS[tn].name + '　4〜6：OR = ' + S_NORMS[sn].name + '　スペース：上の図 = ' + VIEWS[view], 20, 36);
  fill(0, 0, 70); textSize(15);
  text('同じ 2 つの集合でも、AND・OR の決め方（t ノルム・s ノルム）で結果の形が変わる。下は A と「A でない」の組み合わせ', 20, 62);

  // ---- 上：A・B と演算の結果
  let gx = 70, gw = width * 0.6;
  plotBox(gx, 100, gw, height * 0.38, [
    { f: opAt, col: color(260, 30, 90), fillIt: true },
    { f: muA, col: color(20, 45, 100) }, { f: muB, col: color(175, 60, 80) },
  ], VIEWS[view] + '（' + (view === 0 ? T_NORMS[tn].name : view === 1 ? S_NORMS[sn].name : '1 − μ') + '）');
  // ---- 下：A ∧ ¬A と A ∨ ¬A
  let andNot = (x) => T_NORMS[tn].f(muA(x), fnot(muA(x))), orNot = (x) => S_NORMS[sn].f(muA(x), fnot(muA(x)));
  let y2 = 100 + height * 0.38 + 60, h2 = height * 0.3;
  plotBox(gx, y2, gw, h2, [
    { f: andNot, col: color(0, 70, 100), fillIt: true }, { f: orNot, col: color(175, 60, 80) },
    { f: muA, col: color(20, 45, 100, 50) },
  ], 'A かつ（A でない）＝赤、A または（A でない）＝青緑');
  let mx = 0, mn = 1;
  for (let i = 0; i <= NX; i++) { let x = XLO + ((XHI - XLO) * i) / NX; mx = Math.max(mx, andNot(x)); mn = Math.min(mn, orNot(x)); }

  // ---- 右：数値の表
  noStroke();
  let tx = gx + gw + 50, ty = 120;
  let x = clampv(XLO + ((mouseX - gx) / gw) * (XHI - XLO), XLO, XHI), a = muA(x), b = muB(x);
  fill(0, 0, 95); textSize(18); text('マウスの x = ' + x.toFixed(2), tx, ty);
  textSize(15);
  let rows = [['μA', a], ['μB', b], ['A でない 1 − μA', fnot(a)]];
  T_NORMS.forEach((t, i) => rows.push(['AND ' + t.name, t.f(a, b), i === tn]));
  S_NORMS.forEach((s, i) => rows.push(['OR ' + s.name, s.f(a, b), i === sn]));
  rows.forEach((r, i) => {
    let yy = ty + 30 + i * 28;
    fill(r[2] ? color(260, 30, 90) : color(0, 0, 70)); text(r[0], tx, yy);
    fill(0, 0, 95); text(r[1].toFixed(3), tx + 150, yy);
    fill(r[2] ? color(260, 30, 90) : color(0, 0, 50)); rect(tx + 210, yy - 12, r[1] * 120, 12, 3);
  });
  let yy = ty + 30 + rows.length * 28 + 20;
  fill(0, 0, 95); textSize(16);
  text('max (A かつ A でない) = ' + mx.toFixed(3), tx, yy);
  text('min (A または A でない) = ' + mn.toFixed(3), tx, yy + 28);
  fill(0, 0, 70); textSize(14);
  text(mx > 1e-9 ? 'クリスプなら 0 のはず → ファジィでは矛盾が少し残る' : 'ウカシェヴィチの AND では A ∧ ¬A = ∅ になる！', tx, yy + 60, width - tx - 20);
  text(mn < 1 - 1e-9 ? 'クリスプなら 1 のはず → 排中律が成り立たない' : 'この OR では A ∨ ¬A = 全体（排中律が成り立つ）', tx, yy + 100, width - tx - 20);
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}

// グラフ 1 枚：curves = [{ f, col, fillIt }]
function plotBox(gx, gy, gw, gh, curves, title) {
  let X = (x) => gx + ((x - XLO) / (XHI - XLO)) * gw, Y = (m) => gy + gh - m * gh;
  stroke(0, 0, 40); strokeWeight(1); line(gx, Y(0), gx + gw, Y(0)); line(gx, gy, gx, Y(0));
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let x = XLO; x <= XHI; x++) text(x, X(x) - 4, Y(0) + 16);
  text('1', gx - 16, Y(1) + 4); text('0', gx - 16, Y(0) + 4);
  fill(0, 0, 85); textSize(14); text(title, gx + 8, gy - 8);
  for (let c of curves) {
    if (c.fillIt) { noStroke(); fill(hue(c.col), saturation(c.col), brightness(c.col), 30); }
    else noFill();
    stroke(c.col); strokeWeight(c.fillIt ? 2 : 3);
    beginShape();
    if (c.fillIt) vertex(X(XLO), Y(0));
    for (let i = 0; i <= 300; i++) { let x = XLO + ((XHI - XLO) * i) / 300; vertex(X(x), Y(c.f(x))); }
    if (c.fillIt) vertex(X(XHI), Y(0));
    endShape();
  }
}

function mouseDragged() {
  let gx = 70, gw = width * 0.6;
  if (mouseX < gx || mouseX > gx + gw) return;
  let x = clampv(XLO + ((mouseX - gx) / gw) * (XHI - XLO), 1, 9);
  if (Math.abs(x - pA) <= Math.abs(x - pB)) pA = x; else pB = x;
}
function keyPressed() {
  if (key >= '1' && key <= '3') tn = +key - 1;
  if (key >= '4' && key <= '6') sn = +key - 4;
  if (key === ' ') view = (view + 1) % 3;
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let grid = (f) => { let r = []; for (let i = 0; i <= NX; i++) r.push(f(XLO + ((XHI - XLO) * i) / NX)); return r; };
  let A = grid((x) => trimf(x, 2, 5, 8)), B = grid((x) => trimf(x, 4, 6, 8));
  check('max_x min(μA, 1 − μA) = 0.5（三角 (2, 5, 8)）', near(Math.max(...A.map((a) => Math.min(a, 1 - a))), 0.5, 1e-6));
  check('min_x max(μA, 1 − μA) = 0.5（排中律が成り立たない）', near(Math.min(...A.map((a) => Math.max(a, 1 - a))), 0.5, 1e-6));
  check('ウカシェヴィチ：A ∧ ¬A = 0、有界和：A ∨ ¬A = 1（どの x でも）', A.every((a) => near(T_NORMS[2].f(a, 1 - a), 0) && near(S_NORMS[2].f(a, 1 - a), 1)));
  check('ド・モルガン：¬(A ∧ B) = ¬A ∨ ¬B（min と max、積と確率和）', A.every((a, i) => near(1 - Math.min(a, B[i]), Math.max(1 - a, 1 - B[i])) && near(1 - a * B[i], S_NORMS[1].f(1 - a, 1 - B[i]))));
  check('どの t ノルムも ≤ min、どの s ノルムも ≥ max', A.every((a, i) => T_NORMS.every((t) => t.f(a, B[i]) <= Math.min(a, B[i]) + 1e-12) && S_NORMS.every((s) => s.f(a, B[i]) >= Math.max(a, B[i]) - 1e-12)));
  check('手計算：a = 0.6, b = 0.7 → min 0.6、積 0.42、ウカシェヴィチ 0.3、確率和 0.88', near(T_NORMS[1].f(0.6, 0.7), 0.42) && near(T_NORMS[2].f(0.6, 0.7), 0.3) && near(S_NORMS[1].f(0.6, 0.7), 0.88) && T_NORMS[0].f(0.6, 0.7) === 0.6);
  check('境界：T(a, 1) = a、S(a, 0) = a', [0, 0.3, 1].every((a) => T_NORMS.every((t) => near(t.f(a, 1), a)) && S_NORMS.every((s) => near(s.f(a, 0), a))));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. A と B を離すと AND（min）は 0 に、OR は 2 つの山になる。重ねるとどうなる？
// 2. 1〜3 で AND を切りかえ、積はいつも min 以下、ウカシェヴィチはさらに小さいことを確かめよう
// 3. 下の図：min / max では A ∧ ¬A の最大が 0.5。ちょうど μA = 0.5 の点で起きる
// 4. 3（ウカシェヴィチ）と 6（有界和）を選ぶと、矛盾律も排中律も成り立つ！ そのかわり何が失われる？
// 5. 三角の幅 wA・wB を変えて、「ほぼ同じ」2 つの集合の AND を見てみよう


// ==================================================
// ここから下は「ファジィの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- メンバーシップ関数（所属度 μ を 0〜1 で返す）
function trimf(x, a, b, c) {            // 三角：a で 0、b で 1、c で 0
  if (x < a || x > c) return 0;
  if (x === b) return 1;
  if (x < b) return b > a ? (x - a) / (b - a) : 1;
  return c > b ? (c - x) / (c - b) : 1;
}
function trapmf(x, a, b, c, d) {         // 台形：b〜c が 1
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}
function gaussmf(x, c, s) { return Math.exp(-((x - c) * (x - c)) / (2 * s * s)); }
function sigmf(x, a, c) { return 1 / (1 + Math.exp(-a * (x - c))); }
function bellmf(x, a, b, c) { return 1 / (1 + Math.pow(Math.abs((x - c) / a), 2 * b)); }
// mf = { type: 'tri', p: [a, b, c] } のような形
function evalMF(mf, x) {
  let p = mf.p;
  if (mf.type === 'tri') return trimf(x, p[0], p[1], p[2]);
  if (mf.type === 'trap') return trapmf(x, p[0], p[1], p[2], p[3]);
  if (mf.type === 'gauss') return gaussmf(x, p[0], p[1]);
  if (mf.type === 'sig') return sigmf(x, p[0], p[1]);
  if (mf.type === 'bell') return bellmf(x, p[0], p[1], p[2]);
  return 0;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }


// ---- 演算：t ノルム（かつ）・s ノルム（または）・補集合（でない）
const T_NORMS = [
  { name: 'min', f: (a, b) => Math.min(a, b) },
  { name: '積', f: (a, b) => a * b },
  { name: 'ウカシェヴィチ', f: (a, b) => Math.max(0, a + b - 1) },
];
const S_NORMS = [
  { name: 'max', f: (a, b) => Math.max(a, b) },
  { name: '確率和', f: (a, b) => a + b - a * b },
  { name: '有界和', f: (a, b) => Math.min(1, a + b) },
];
function fnot(a) { return 1 - a; }


// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

