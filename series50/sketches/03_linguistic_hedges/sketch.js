// ============================================
// 03 言語変数とヘッジ ─「とても暑い」「やや寒い」
// 言語変数「気温」の値は 寒い・快適・暑い という言葉（それぞれファジィ集合）
// ヘッジ（言葉の強め・弱め）は μ の計算：とても = μ²（集中）、やや = √μ（拡張）、〜ではない = 1 − μ
// ←→ = ヘッジ / ↑↓ = 言葉 / N = 「ない」の位置 / マウス左右 = 今の気温
// ============================================

let XLO = 0, XHI = 40;
// ★ 気温の言葉（台形・三角の形と位置を変えてみよう）
const TERMS = [
  { name: '寒い', mf: { type: 'trap', p: [0, 0, 8, 16] }, col: [200, 50, 95] },
  { name: '快適', mf: { type: 'tri', p: [14, 22, 30] }, col: [120, 40, 85] },
  { name: '暑い', mf: { type: 'trap', p: [24, 32, 40, 40] }, col: [20, 60, 100] },
];
// ★ ヘッジ：μ を何乗するか（とても = 2、やや = 0.5）
const HEDGES = [
  { name: '（なし）', f: (m) => m },
  { name: 'とても', f: (m) => m * m },
  { name: 'やや', f: (m) => Math.sqrt(m) },
  { name: 'とてもとても', f: (m) => Math.pow(m, 4) },
  { name: '本当に', f: (m) => (m <= 0.5 ? 2 * m * m : 1 - 2 * (1 - m) * (1 - m)) },   // 強調（INT）：0.5 より上は上げ、下は下げる
];
const NEGS = ['', '「とても暑い」ではない 型', 'とても「暑いではない」型'];
let hi = 1, ti = 2, ni = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
}
// 文の所属度：ni = 0 そのまま / 1 = 1 − hedge(μ)（「とても暑い」ではない）/ 2 = hedge(1 − μ)（とても「暑いではない」）
function phraseMu(h, t, n, x) {
  let m = evalMF(TERMS[t].mf, x);
  if (n === 1) return fnot(HEDGES[h].f(m));
  if (n === 2) return HEDGES[h].f(fnot(m));
  return clampv(HEDGES[h].f(m), 0, 1);
}
function phraseText(h, t, n) {
  let hd = h === 0 ? '' : HEDGES[h].name + ' ';
  if (n === 1) return '「' + hd + TERMS[t].name + '」ではない';
  if (n === 2) return hd + '「' + TERMS[t].name + 'ではない」';
  return hd + TERMS[t].name;
}

function draw() {
  background(250, 18, 14);
  fill(0, 0, 95); noStroke(); textSize(18);
  text('←→：ヘッジ = ' + HEDGES[hi].name + '　↑↓：言葉 = ' + TERMS[ti].name + '　N：「ない」= ' + (NEGS[ni] || 'なし') + '　マウス左右：気温', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('とても = μ²（集中：しぼる）、やや = √μ（拡張：ゆるめる）、ない = 1 − μ。「『とても暑い』ではない」と「とても『暑いではない』」は別の関数', 20, 62);

  let gx = 70, gy = 150, gw = width * 0.6, gh = height * 0.55;
  let X = (x) => gx + ((x - XLO) / (XHI - XLO)) * gw, Y = (m) => gy + gh - m * gh;
  let temp = clampv(XLO + ((mouseX - gx) / gw) * (XHI - XLO), XLO, XHI);
  stroke(0, 0, 40); strokeWeight(1); line(gx, Y(0), gx + gw, Y(0)); line(gx, gy, gx, Y(0));
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let x = XLO; x <= XHI; x += 5) text(x + '℃', X(x) - 10, Y(0) + 16);
  text('1', gx - 16, Y(1) + 4); text('0', gx - 16, Y(0) + 4);
  // 3 つの言葉（うすく）
  TERMS.forEach((T, k) => {
    noFill(); stroke(T.col[0], T.col[1], T.col[2], k === ti ? 70 : 30); strokeWeight(k === ti ? 3 : 2);
    beginShape(); for (let i = 0; i <= 200; i++) { let x = XLO + ((XHI - XLO) * i) / 200; vertex(X(x), Y(evalMF(T.mf, x))); } endShape();
    noStroke(); fill(T.col[0], T.col[1], T.col[2], 80); textSize(14);
    text(T.name, X((T.mf.p[0] + T.mf.p[T.mf.p.length - 1]) / 2) - 14, gy - 10);
  });
  // 組み立てた文の関数
  noStroke(); fill(260, 30, 90, 22);
  beginShape(); vertex(X(XLO), Y(0));
  for (let i = 0; i <= 200; i++) { let x = XLO + ((XHI - XLO) * i) / 200; vertex(X(x), Y(phraseMu(hi, ti, ni, x))); }
  vertex(X(XHI), Y(0)); endShape(CLOSE);
  noFill(); stroke(260, 30, 90); strokeWeight(4);
  beginShape(); for (let i = 0; i <= 200; i++) { let x = XLO + ((XHI - XLO) * i) / 200; vertex(X(x), Y(phraseMu(hi, ti, ni, x))); } endShape();
  // 今の気温
  let m = phraseMu(hi, ti, ni, temp);
  stroke(0, 0, 100, 50); strokeWeight(1); line(X(temp), gy, X(temp), Y(0));
  noStroke(); fill(0, 0, 100); circle(X(temp), Y(m), 12);
  fill(0, 0, 95); textSize(28);
  text('気温 ' + temp.toFixed(1) + '℃ は「' + phraseText(hi, ti, ni) + '」の度合い ' + m.toFixed(3), gx, 120);

  // ---- 右：言葉 × ヘッジ の表（今の気温で）
  let tx = gx + gw + 40, ty = 150, cw = (width - tx - 20) / 3, ch = 34;
  fill(0, 0, 80); textSize(15); text('気温 ' + temp.toFixed(1) + '℃ での所属度', tx, ty - 20);
  TERMS.forEach((T, k) => { fill(T.col[0], T.col[1], T.col[2]); text(T.name, tx + 100 + k * ((width - tx - 120) / 3), ty + 6); });
  let colW = (width - tx - 120) / 3;
  HEDGES.forEach((H, h) => {
    let yy = ty + 20 + h * ch;
    fill(0, 0, 75); textSize(14); text(H.name, tx, yy + 22);
    TERMS.forEach((T, k) => {
      let v = phraseMu(h, k, ni, temp), xx = tx + 100 + k * colW;
      fill(260, 30, 20 + 70 * v); if (h === hi && k === ti) { stroke(0, 0, 100); strokeWeight(2); } else noStroke();
      rect(xx, yy, colW - 8, ch - 6, 4);
      noStroke(); fill(0, 0, v > 0.6 ? 5 : 95); textSize(14); text(v.toFixed(2), xx + 8, yy + 20);
    });
  });
  fill(0, 0, 70); textSize(14);
  let yb = ty + 40 + HEDGES.length * ch;
  text('表の「ない」の位置：' + (NEGS[ni] || 'なし（N で切りかえ）'), tx, yb);
  let m0 = evalMF(TERMS[ti].mf, temp);
  text('もとの μ = ' + m0.toFixed(3) + '　→　μ² = ' + (m0 * m0).toFixed(3) + '　√μ = ' + Math.sqrt(m0).toFixed(3) + '　1 − μ = ' + (1 - m0).toFixed(3), tx, yb + 26, width - tx - 20);
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}

function keyPressed() {
  if (key === RIGHT_ARROW) hi = (hi + 1) % HEDGES.length;
  if (key === LEFT_ARROW) hi = (hi + HEDGES.length - 1) % HEDGES.length;
  if (key === UP_ARROW) ti = (ti + 1) % TERMS.length;
  if (key === DOWN_ARROW) ti = (ti + TERMS.length - 1) % TERMS.length;
  if (key === 'n' || key === 'N') ni = (ni + 1) % NEGS.length;
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  check('とても 0.5 → 0.25', near(HEDGES[1].f(0.5), 0.25));
  check('やや 0.25 → 0.5', near(HEDGES[2].f(0.25), 0.5));
  check('ない 0.3 → 0.7', near(fnot(0.3), 0.7));
  check('「とても暑い」ではない ≠ とても「暑いではない」（μ = 0.5 で 0.75 と 0.25）', near(phraseMu(1, 2, 1, 28), 0.75) && near(phraseMu(1, 2, 2, 28), 0.25));
  check('暑い(32℃) = 1、寒い(12℃) = 0.5、快適(18℃) = 0.5', evalMF(TERMS[2].mf, 32) === 1 && near(evalMF(TERMS[0].mf, 12), 0.5) && near(evalMF(TERMS[1].mf, 18), 0.5));
  let ok = true;
  for (let x = 0; x <= 40; x += 0.25) for (let k = 0; k < 3; k++) { let m = evalMF(TERMS[k].mf, x); if (!(m * m <= m + 1e-12 && m <= Math.sqrt(m) + 1e-12)) ok = false; }
  check('どこでも とても ≤ もと ≤ やや', ok);
  check('ヘッジは 0 と 1 を動かさない', [1, 2, 3].every((h) => HEDGES[h].f(0) === 0 && HEDGES[h].f(1) === 1));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 「とても暑い」と「やや暑い」で、所属度 0.5 になる気温はそれぞれ何℃？
// 2. N で「『とても暑い』ではない」と「とても『暑いではない』」を比べ、グラフの違いを説明しよう
// 3. 「とてもとても」（μ⁴）を何回も重ねると、どんな形に近づく？
// 4. 「本当に」（強調 INT）は 0.5 を境に、上は 1 へ・下は 0 へ寄せる。何回も重ねるとクリスプ集合に近づく
// 5. TERMS に「ぬるい」「蒸し暑い」を足して、自分の言語変数を作ろう


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

