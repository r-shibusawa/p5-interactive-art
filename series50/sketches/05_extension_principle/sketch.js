// ============================================
// 05 拡張原理とファジィ数 ─「約 3」+「約 5」= ?
// 三角ファジィ数 (a, b, c)：b で 1、a と c で 0 の「だいたい b」。計算は α カット（区間）ごとに区間演算でする
//   [p1, p2] + [q1, q2] = [p1 + q1, p2 + q2]、× は 4 つの積の最小・最大、÷ は 0 をふくむと計算できない
// 点は拡張原理 μ(z) = sup_{x ∘ y = z} min(μA(x), μB(y)) を総当たりで計算した値（α カットの線と重なる）
// 1〜4 = + − × ÷ / ○ をドラッグ = A・B の 3 つの点 / ↑↓ = 表示する α
// ============================================

let A = [2, 3, 4], B = [4, 5, 6];   // ★ 約 3 と 約 5
let opNo = 0, alphaShow = 0.5;
let NALPHA = 20;                     // ★ α カットを何段に分けるか
let XLO = 0, XHI = 10;
let res = [], brute = [], zLo = 0, zHi = 1, dragP = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  recompute();
}

// α カットを全部計算（[α, 左, 右] の列。割れないときは null）＋ 拡張原理の総当たり
function recompute() {
  res = [];
  for (let k = 0; k <= NALPHA; k++) { let al = k / NALPHA, iv = IV_OPS[opNo].f(cutTri(A, al), cutTri(B, al)); res.push(iv ? [al, iv[0], iv[1]] : null); }
  if (res[0]) { zLo = res[0][1]; zHi = res[0][2]; let pad = Math.max(0.5, (zHi - zLo) * 0.08); zLo -= pad; zHi += pad; }
  brute = extensionBrute(A, B, IV_OPS[opNo].name, zLo, zHi, 120);
}

function draw() {
  background(250, 18, 14);
  fill(0, 0, 95); noStroke(); textSize(18);
  text('1〜4：演算 = ' + IV_OPS.map((o, i) => (i === opNo ? '【' + o.name + '】' : o.name)).join(' ') + '　○ ドラッグ：A・B の形　↑↓：α = ' + alphaShow.toFixed(2), 20, 36);
  fill(0, 0, 70); textSize(15);
  text('α カット（μ ≥ α の区間）どうしを区間で計算し、高さ α に並べると答えのファジィ数になる。点 = 拡張原理（総当たり）', 20, 62);

  // ---- 上：A と B
  let gx = 70, gw = width * 0.6, gy = 100, gh = height * 0.28;
  let X = (x) => gx + ((x - XLO) / (XHI - XLO)) * gw, Y = (m) => gy + gh - m * gh;
  axes(gx, gy, gw, gh, XLO, XHI);
  for (let [T, col, nm] of [[A, color(20, 45, 100), 'A'], [B, color(175, 60, 80), 'B']]) {
    noFill(); stroke(col); strokeWeight(3);
    beginShape(); vertex(X(T[0]), Y(0)); vertex(X(T[1]), Y(1)); vertex(X(T[2]), Y(0)); endShape();
    let c = cutTri(T, alphaShow); strokeWeight(6); line(X(c[0]), Y(alphaShow), X(c[1]), Y(alphaShow));
    T.forEach((v, i) => { stroke(0, 0, 100); strokeWeight(2); fill(250, 18, 14); circle(X(v), Y(i === 1 ? 1 : 0), 16); });
    noStroke(); fill(col); textSize(16); text(nm + ' = (' + T.map((v) => v.toFixed(1)).join(', ') + ')', X(T[1]) - 40, gy - 8);
  }

  // ---- 下：答え A ∘ B
  let y2 = gy + gh + 70, h2 = height * 0.36;
  let Z = (z) => gx + ((z - zLo) / (zHi - zLo)) * gw, Y2 = (m) => y2 + h2 - m * h2;
  if (!res[0]) {
    fill(0, 70, 100); textSize(22); text('B の台が 0 をふくむので、割り算できない（0 で割る区間がある）', gx, y2 + 60);
  } else {
    axes(gx, y2, gw, h2, zLo, zHi);
    noStroke(); fill(260, 30, 90, 22);
    beginShape(); for (let r of res) vertex(Z(r[1]), Y2(r[0])); for (let k = res.length - 1; k >= 0; k--) vertex(Z(res[k][2]), Y2(res[k][0])); endShape(CLOSE);
    noFill(); stroke(260, 30, 90); strokeWeight(3);
    beginShape(); for (let r of res) vertex(Z(r[1]), Y2(r[0])); for (let k = res.length - 1; k >= 0; k--) vertex(Z(res[k][2]), Y2(res[k][0])); endShape();
    // 三角で近似した形（× ÷ では本当の答えは三角にならない）
    let tri3 = [res[0][1], res[NALPHA][1], res[0][2]];
    stroke(0, 0, 100, 40); strokeWeight(1);
    beginShape(); vertex(Z(tri3[0]), Y2(0)); vertex(Z(tri3[1]), Y2(1)); vertex(Z(tri3[2]), Y2(0)); endShape();
    // 拡張原理の総当たり（点）
    noStroke(); fill(20, 45, 100);
    for (let b of brute) if (b[1] > 0.001) circle(Z(b[0]), Y2(b[1]), 4);
    let c = IV_OPS[opNo].f(cutTri(A, alphaShow), cutTri(B, alphaShow));
    if (c) { stroke(260, 30, 90); strokeWeight(6); line(Z(c[0]), Y2(alphaShow), Z(c[1]), Y2(alphaShow)); }
    noStroke(); fill(0, 0, 85); textSize(15); text('A ' + IV_OPS[opNo].name + ' B（紫 = α カットの区間演算、オレンジの点 = 拡張原理の総当たり、細線 = 3 点を結んだ三角）', gx, y2 - 10);
  }

  // ---- 右：α カットの表
  let tx = gx + gw + 40, ty = 120;
  fill(0, 0, 95); textSize(17); text('α カットの区間演算', tx, ty);
  textSize(14);
  [0, 0.25, 0.5, 0.75, 1, alphaShow].forEach((al, i) => {
    let a = cutTri(A, al), b = cutTri(B, al), c = IV_OPS[opNo].f(a, b), yy = ty + 34 + i * 54;
    fill(i === 5 ? color(260, 30, 90) : color(0, 0, 70)); text('α = ' + al.toFixed(2) + (i === 5 ? '（↑↓）' : ''), tx, yy);
    fill(0, 0, 95); text(iv(a) + ' ' + IV_OPS[opNo].name + ' ' + iv(b), tx, yy + 20);
    fill(260, 30, 90); text('= ' + (c ? iv(c) : '計算できない'), tx + 10, yy + 38);
  });
  if (res[0]) { fill(0, 0, 70); text('答えの台 = ' + iv([res[0][1], res[0][2]]) + '、核 = ' + res[NALPHA][1].toFixed(2), tx, ty + 34 + 6 * 54 + 10, width - tx - 20); }
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}
function iv(p) { return '[' + p[0].toFixed(2) + ', ' + p[1].toFixed(2) + ']'; }
function axes(gx, gy, gw, gh, lo, hi) {
  stroke(0, 0, 40); strokeWeight(1); line(gx, gy + gh, gx + gw, gy + gh); line(gx, gy, gx, gy + gh);
  noStroke(); fill(0, 0, 60); textSize(12);
  let raw = (hi - lo) / 8, mag = Math.pow(10, Math.floor(Math.log10(Math.max(1e-6, raw)))), st = raw / mag < 2 ? 2 * mag : raw / mag < 5 ? 5 * mag : 10 * mag;
  for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) text(+v.toFixed(2), gx + ((v - lo) / (hi - lo)) * gw - 6, gy + gh + 16);
  text('1', gx - 16, gy + 4); text('0', gx - 16, gy + gh + 4);
}

function mousePressed() {
  let gx = 70, gw = width * 0.6, gy = 100, gh = height * 0.28, best = 30; dragP = null;
  for (let [T, nm] of [[A, 'A'], [B, 'B']]) T.forEach((v, i) => {
    let d = Math.hypot(mouseX - (gx + ((v - XLO) / (XHI - XLO)) * gw), mouseY - (gy + gh - (i === 1 ? gh : 0)));
    if (d < best) { best = d; dragP = [T, i]; }
  });
}
function mouseDragged() {
  if (!dragP) return;
  let [T, i] = dragP, gx = 70, gw = width * 0.6;
  T[i] = clampv(Math.round((XLO + ((mouseX - gx) / gw) * (XHI - XLO)) * 10) / 10, XLO, XHI);
  if (i === 0) T[0] = Math.min(T[0], T[1]); if (i === 2) T[2] = Math.max(T[2], T[1]);
  if (i === 1) T[1] = clampv(T[1], T[0], T[2]);
  recompute();
}
function mouseReleased() { dragP = null; }
function keyPressed() {
  if (key >= '1' && key <= '4') { opNo = +key - 1; recompute(); }
  if (key === UP_ARROW) alphaShow = clampv(alphaShow + 0.05, 0, 1);
  if (key === DOWN_ARROW) alphaShow = clampv(alphaShow - 0.05, 0, 1);
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let A0 = [2, 3, 4], B0 = [4, 5, 6], op = (k, al) => IV_OPS[k].f(cutTri(A0, al), cutTri(B0, al));
  let eq = (p, q) => p && near(p[0], q[0]) && near(p[1], q[1]);
  check('(2, 3, 4) + (4, 5, 6) = (6, 8, 10)：α = 0 で [6, 10]、α = 1 で [8, 8]', eq(op(0, 0), [6, 10]) && eq(op(0, 1), [8, 8]));
  check('足し算の 0.5 カット = [7, 9]', eq(op(0, 0.5), [7, 9]));
  check('(2, 3, 4) − (4, 5, 6) = (−4, −2, 0)', eq(op(1, 0), [-4, 0]) && eq(op(1, 1), [-2, -2]));
  check('× ：α = 0 で [8, 24]、α = 1 で 15、α = 0.5 で [11.25, 19.25]（三角ではない）', eq(op(2, 0), [8, 24]) && eq(op(2, 1), [15, 15]) && eq(op(2, 0.5), [11.25, 19.25]));
  check('÷ ：α = 0 で [2/6, 4/4] = [1/3, 1]', eq(op(3, 0), [1 / 3, 1]));
  check('0 をふくむ区間では割れない（null）', IV_OPS[3].f([1, 2], [-1, 1]) === null);
  let br = extensionBrute(A0, B0, '+', 5, 11, 60), at = (z) => br.reduce((m, b) => (Math.abs(b[0] - z) < 1e-6 ? b[1] : m), -1);
  check('拡張原理の総当たり：μ(8) = 1、μ(7) = 0.5、μ(10) = 0（足し算）', near(at(8), 1, 1e-6) && near(at(7), 0.5, 1e-6) && near(at(10), 0, 1e-6));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 「約 3」+「約 5」は「約 8」。でも幅は広がる（あいまいさは足し算でたまる）
// 2. 「約 3」−「約 3」は 0 にならない！ A を B と同じ形にして確かめよう
// 3. × と ÷ では答えのふちが曲線になり、細線（三角の近似）とずれる。どこがいちばんずれる？
// 4. B の左の点を 0 まで動かして ÷ を選ぶと、なぜ計算できなくなる？
// 5. NALPHA を 2 や 4 に減らすと、α カットの段々がよく見える



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

// ---- 拡張原理を総当たりで：z の小さな区間ごとに、x ∘ y が入る組の min(μA, μB) の最大
function extensionBrute(A, B, opName, zLo, zHi, nz) {
  let out = []; for (let i = 0; i <= nz; i++) out.push([zLo + ((zHi - zLo) * i) / nz, 0]);
  let dz = (zHi - zLo) / nz, n = 80;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    let x = A[0] + ((A[2] - A[0]) * i) / n, y = B[0] + ((B[2] - B[0]) * j) / n;
    let z = opName === '+' ? x + y : opName === '−' ? x - y : opName === '×' ? x * y : y === 0 ? NaN : x / y;
    if (!isFinite(z)) continue;
    let k = Math.round((z - zLo) / dz); if (k < 0 || k > nz) continue;
    let m = Math.min(trimf(x, A[0], A[1], A[2]), trimf(y, B[0], B[1], B[2]));
    if (Math.abs(z - out[k][0]) < dz * 0.25) out[k][1] = Math.max(out[k][1], m);   // z の格子点のすぐ近くだけ数える
  }
  return out;
}
