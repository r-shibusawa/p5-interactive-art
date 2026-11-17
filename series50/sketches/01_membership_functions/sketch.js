// ============================================
// 01 メンバーシップ関数の形
// 三角・台形・ガウス・シグモイド・ベル。どれも x に所属度 μ(x)（0〜1）を対応させる関数
// 台（μ > 0 の範囲）・核（μ = 1 の範囲）・α カット（μ ≥ α の範囲）・高さ（μ の最大）・正規（高さ = 1）を式で計算して表示
// 1〜5 = 形 / ○ をドラッグ = パラメータ / ↑↓ = α / ←→ = ベルの肩の急さ b
// ============================================

let shapeNo = 0;
let alphaCut = 0.5;   // ★ α カットの α
let XLO = 0, XHI = 10;
// ★ それぞれの形のパラメータ（ドラッグで変わる）
let P = {
  tri: [2, 3, 4],
  trap: [1.5, 3.5, 6, 8],
  gauss: [5, 1.2],          // 中心 c、幅 σ
  sig: [2, 5],              // 傾き a、真ん中 c
  bell: [1.5, 2, 5],        // 幅 a、肩 b、中心 c
};
const SHAPES = [['tri', '三角'], ['trap', '台形'], ['gauss', 'ガウス'], ['sig', 'シグモイド'], ['bell', 'ベル']];
let dragK = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
}

function curMF() { let t = SHAPES[shapeNo][0]; return { type: t, p: P[t] }; }

// ドラッグできる点（x 座標）。ガウスは c と c + σ、シグモイドは c と c + 2/a、ベルは c と c + a
function handles() {
  let t = SHAPES[shapeNo][0], p = P[t];
  if (t === 'tri' || t === 'trap') return p.slice();
  if (t === 'gauss') return [p[0], p[0] + p[1]];
  if (t === 'sig') return [p[1], p[1] + 2 / p[0]];
  return [p[2], p[2] + p[0]];
}
function setHandle(k, x) {
  let t = SHAPES[shapeNo][0], p = P[t];
  if (t === 'tri' || t === 'trap') {
    p[k] = x;
    for (let i = 1; i < p.length; i++) p[i] = Math.max(p[i], p[i - 1] + (i === 2 && t === 'trap' ? 0 : 0.05));   // 順番を保つ
    for (let i = p.length - 2; i >= 0; i--) p[i] = Math.min(p[i], p[i + 1]);
  }
  if (t === 'gauss') { if (k === 0) p[0] = x; else p[1] = clampv(x - p[0], 0.1, 5); }
  if (t === 'sig') { if (k === 0) p[1] = x; else { let d = x - p[1]; p[0] = Math.abs(d) < 0.1 ? (d < 0 ? -20 : 20) : 2 / d; } }
  if (t === 'bell') { if (k === 0) p[2] = x; else p[0] = clampv(x - p[2], 0.1, 5); }
}

// ---- 台・核・α カット・高さを式で求める（[左, 右] の区間。空なら null）
function analyze(mf, al) {
  let t = mf.type, p = mf.p, cut = (lo, hi) => [Math.max(XLO, lo), Math.min(XHI, hi)];
  if (t === 'tri') return { sup: [p[0], p[2]], core: [p[1], p[1]], h: 1, cut: cutTri(p, al) };
  if (t === 'trap') return { sup: [p[0], p[3]], core: [p[1], p[2]], h: 1, cut: [p[0] + al * (p[1] - p[0]), p[3] - al * (p[3] - p[2])] };
  if (t === 'gauss') { let r = p[1] * Math.sqrt(-2 * Math.log(al)); return { sup: cut(-Infinity, Infinity), core: [p[0], p[0]], h: 1, cut: [p[0] - r, p[0] + r] }; }
  if (t === 'sig') { let x = p[1] - Math.log((1 - al) / al) / p[0]; return { sup: cut(-Infinity, Infinity), core: null, h: 1, cut: p[0] > 0 ? cut(x, Infinity) : cut(-Infinity, x) }; }
  let r = p[0] * Math.pow((1 - al) / al, 1 / (2 * p[1]));
  return { sup: cut(-Infinity, Infinity), core: [p[2], p[2]], h: 1, cut: [p[2] - r, p[2] + r] };
}
function ivStr(iv) { return iv && iv[0] <= iv[1] ? '[' + iv[0].toFixed(2) + ', ' + iv[1].toFixed(2) + ']' : '空'; }

function draw() {
  background(250, 18, 14);
  let mf = curMF(), A = analyze(mf, alphaCut);
  fill(0, 0, 95); noStroke(); textSize(18);
  text('1〜5：形 = ' + SHAPES.map((s, i) => (i === shapeNo ? '【' + s[1] + '】' : s[1])).join(' ') + '　○ ドラッグ　↑↓：α = ' + alphaCut.toFixed(2) + (mf.type === 'bell' ? '　←→：b = ' + P.bell[1].toFixed(1) : ''), 20, 36);
  fill(0, 0, 70); textSize(15);
  text('台 = μ > 0 の範囲、核 = μ = 1 の範囲、α カット = μ ≥ α の範囲。α カットを全部重ねると、もとの集合にもどる', 20, 62);

  let gx = 70, gy = 110, gw = width * 0.62, gh = height * 0.55;
  let X = (x) => gx + ((x - XLO) / (XHI - XLO)) * gw, Y = (m) => gy + gh - m * gh;
  stroke(0, 0, 40); strokeWeight(1); line(gx, Y(0), gx + gw, Y(0)); line(gx, gy, gx, Y(0));
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let x = XLO; x <= XHI; x++) text(x, X(x) - 4, Y(0) + 16);
  text('1', gx - 16, Y(1) + 4); text('0', gx - 16, Y(0) + 4);
  // α の線と α カット（帯）
  stroke(260, 30, 90, 60); line(gx, Y(alphaCut), gx + gw, Y(alphaCut));
  if (A.cut && A.cut[1] >= A.cut[0]) {
    let a = clampv(A.cut[0], XLO, XHI), b = clampv(A.cut[1], XLO, XHI);
    noStroke(); fill(260, 30, 90, 25); rect(X(a), Y(alphaCut), Math.max(2, X(b) - X(a)), Y(0) - Y(alphaCut));
    stroke(260, 30, 90); strokeWeight(6); line(X(a), Y(0) + 30, X(b), Y(0) + 30);
  }
  // 台と核
  strokeWeight(6); stroke(175, 60, 80); line(X(clampv(A.sup[0], XLO, XHI)), Y(0) + 46, X(clampv(A.sup[1], XLO, XHI)), Y(0) + 46);
  if (A.core) { stroke(20, 45, 100); line(X(clampv(A.core[0], XLO, XHI)), Y(0) + 62, X(clampv(A.core[1], XLO, XHI)) + 1, Y(0) + 62); }
  noStroke(); textSize(13);
  fill(260, 30, 90); text('α カット', gx + gw + 10, Y(0) + 34);
  fill(175, 60, 80); text('台', gx + gw + 10, Y(0) + 50);
  fill(20, 45, 100); text('核', gx + gw + 10, Y(0) + 66);
  // 曲線
  noFill(); stroke(20, 45, 100); strokeWeight(4);
  beginShape(); for (let i = 0; i <= 400; i++) { let x = XLO + ((XHI - XLO) * i) / 400; vertex(X(x), Y(evalMF(mf, x))); } endShape();
  // ドラッグできる点
  let hs = handles();
  hs.forEach((hx, k) => { let m = evalMF(mf, hx); stroke(0, 0, 100); strokeWeight(2); fill(k === dragK ? color(20, 45, 100) : color(250, 18, 14)); circle(X(clampv(hx, XLO, XHI)), Y(m), 18); });

  // ---- 右の表
  let tx = gx + gw + 70, ty = 130;
  fill(0, 0, 95); noStroke(); textSize(20); text(SHAPES[mf.type === undefined ? 0 : shapeNo][1] + ' ' + mf.type + 'mf', tx, ty);
  textSize(15); fill(0, 0, 80);
  let rows = [
    ['パラメータ', mf.p.map((v) => v.toFixed(2)).join(', ')],
    ['台（μ > 0）', ivStr(A.sup) + (mf.type === 'tri' || mf.type === 'trap' ? '' : ' = 全体')],
    ['核（μ = 1）', A.core ? ivStr(A.core) : '空（1 にならない）'],
    ['α カット', ivStr(A.cut)],
    ['高さ', A.h.toFixed(2) + (A.core ? '' : '（上限）')],
    ['正規？', A.core ? 'はい（μ = 1 の点がある）' : 'いいえ'],
    ['凸？', mf.type === 'sig' ? 'はい（片側だけ）' : 'はい（α カットが 1 区間）'],
  ];
  rows.forEach((r, i) => { fill(0, 0, 65); text(r[0], tx, ty + 40 + i * 30); fill(0, 0, 95); text(r[1], tx + 110, ty + 40 + i * 30); });
  // マウスの位置の μ
  if (mouseX > gx && mouseX < gx + gw) {
    let x = XLO + ((mouseX - gx) / gw) * (XHI - XLO), m = evalMF(mf, x);
    stroke(0, 0, 100, 30); strokeWeight(1); line(X(x), gy, X(x), Y(0));
    noStroke(); fill(0, 0, 95); textSize(15); text('x = ' + x.toFixed(2) + '　μ(x) = ' + m.toFixed(3), tx, ty + 290);
  }
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}

function plotX(x) { return XLO + ((x - 70) / (width * 0.62)) * (XHI - XLO); }
function mousePressed() {
  let hs = handles(), best = 1e9; dragK = -1;
  let gx = 70, gw = width * 0.62, gy = 110, gh = height * 0.55, mf = curMF();
  hs.forEach((hx, k) => { let px = gx + ((hx - XLO) / (XHI - XLO)) * gw, py = gy + gh - evalMF(mf, hx) * gh, d = Math.hypot(mouseX - px, mouseY - py); if (d < best && d < 40) { best = d; dragK = k; } });
}
function mouseDragged() { if (dragK >= 0) setHandle(dragK, clampv(plotX(mouseX), XLO, XHI)); }
function mouseReleased() { dragK = -1; }
function keyPressed() {
  if (key >= '1' && key <= '5') shapeNo = +key - 1;
  if (key === UP_ARROW) alphaCut = clampv(alphaCut + 0.05, 0.05, 1);
  if (key === DOWN_ARROW) alphaCut = clampv(alphaCut - 0.05, 0.05, 1);
  if (key === LEFT_ARROW) P.bell[1] = clampv(P.bell[1] - 0.5, 0.5, 10);
  if (key === RIGHT_ARROW) P.bell[1] = clampv(P.bell[1] + 0.5, 0.5, 10);
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  check('三角 (2, 3, 4)：μ(3) = 1、μ(2.5) = 0.5、μ(4.5) = 0', trimf(3, 2, 3, 4) === 1 && near(trimf(2.5, 2, 3, 4), 0.5) && trimf(4.5, 2, 3, 4) === 0);
  let c = cutTri([2, 3, 4], 0.5);
  check('三角 (2, 3, 4) の 0.5 カット = [2.5, 3.5]', near(c[0], 2.5) && near(c[1], 3.5));
  check('台形 (1, 2, 4, 6)：核 [2, 4] で 1、μ(5) = 0.5', trapmf(2, 1, 2, 4, 6) === 1 && trapmf(4, 1, 2, 4, 6) === 1 && near(trapmf(5, 1, 2, 4, 6), 0.5));
  check('ガウス：μ(c ± σ) = e^(−1/2) ≈ 0.6065', near(gaussmf(6, 5, 1), Math.exp(-0.5)) && near(gaussmf(4, 5, 1), Math.exp(-0.5)));
  check('ベル (a, b, c)：μ(c ± a) = 0.5、μ(c) = 1', near(bellmf(6.5, 1.5, 2, 5), 0.5) && near(bellmf(3.5, 1.5, 2, 5), 0.5) && bellmf(5, 1.5, 2, 5) === 1);
  check('シグモイド：μ(c) = 0.5', near(sigmf(5, 2, 5), 0.5));
  // 式の α カットと、細かく調べた α カットが一致するか（ガウス・ベル・シグモイド）
  let ok = true;
  for (let mf of [{ type: 'gauss', p: [5, 1.2] }, { type: 'bell', p: [1.5, 2, 5] }, { type: 'sig', p: [2, 5] }]) for (let al of [0.2, 0.5, 0.8]) {
    let lo = null, hi = null;
    for (let i = 0; i <= 100000; i++) { let x = (10 * i) / 100000; if (evalMF(mf, x) >= al) { if (lo === null) lo = x; hi = x; } }
    let A = analyze(mf, al); if (!near(lo, A.cut[0], 2e-4) || !near(hi, A.cut[1], 2e-4)) ok = false;
  }
  check('α カットの式 = 細かく調べた範囲（ガウス・ベル・シグモイド × α 3 通り）', ok);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 三角の 3 つの点をドラッグして、左右非対称な「だいたい 3」を作ろう。α カットはどう変わる？
// 2. 台形の真ん中の 2 点を重ねると三角になる。核が「区間」から「点」になるのを見よう
// 3. ベルで ←→ を押して b を大きくすると、だんだん台形（肩の急な形）に近づく
// 4. シグモイドの傾きの点を左に動かすと a が負になり、「大きい」が「小さい」に変わる
// 5. ↑↓ で α を動かし、α = 1 のとき α カットが核と一致することを確かめよう


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


// ---- 三角ファジィ数 (a, b, c) と α カット
function cutTri(T, al) { return [T[0] + al * (T[1] - T[0]), T[2] - al * (T[2] - T[1])]; }
const IV_OPS = [
  { name: '+', f: (p, q) => [p[0] + q[0], p[1] + q[1]] },
  { name: '−', f: (p, q) => [p[0] - q[1], p[1] - q[0]] },
  { name: '×', f: (p, q) => { let v = [p[0] * q[0], p[0] * q[1], p[1] * q[0], p[1] * q[1]]; return [Math.min(...v), Math.max(...v)]; } },
  { name: '÷', f: (p, q) => (q[0] <= 0 && q[1] >= 0 ? null : IV_OPS[2].f(p, [1 / q[1], 1 / q[0]])) },
];


// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

