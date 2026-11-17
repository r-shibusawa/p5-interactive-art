// ============================================
// 00 クリスプ集合とファジィ集合 ─「背が高い」
// クリスプ（ふつうの）集合：しきい値より上なら 1、下なら 0。174.9 cm と 175.0 cm で天と地
// ファジィ集合：所属度 μ を 0〜1 のなめらかな関数（シグモイド μ = 1 / (1 + e^(−a(x − c)))）で決める
// グラフをドラッグ（または ←→）= しきい値 c / ↑↓ = 傾き a / スペース = 別の人たち / C = 色をクリスプ⇔ファジィ
// ============================================

let c0 = 175;          // ★ しきい値（シグモイドの真ん中）[cm]
let slope = 0.35;      // ★ シグモイドの傾き a（大きいほどクリスプに近い）
let nPeople = 16;      // ★ 並べる人数
let XLO = 145, XHI = 200;
let people = [], colorCrisp = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  newPeople();
}

function newPeople() {
  people = [];
  for (let i = 0; i < nPeople; i++) people.push(Math.round(random(152, 196) * 10) / 10);
  people.sort((a, b) => a - b);
}
function crispTall(h) { return h >= c0 ? 1 : 0; }      // クリスプ：0 か 1
function fuzzyTall(h) { return sigmf(h, slope, c0); }  // ファジィ：0〜1

function draw() {
  background(250, 18, 14);
  fill(0, 0, 95); noStroke(); textSize(18);
  text('ドラッグ / ←→：しきい値 c = ' + c0.toFixed(1) + ' cm　↑↓：傾き a = ' + slope.toFixed(2) + '　スペース：別の人たち　C：色 = ' + (colorCrisp ? 'クリスプ' : 'ファジィ'), 20, 36);
  fill(0, 0, 70); textSize(15);
  text('「背が高い」を、しきい値で 0 / 1 に分ける（オレンジ）か、なめらかな所属度 μ で表す（青緑）か', 20, 62);

  // ---- グラフ
  let gx = 70, gy = 100, gw = width - 140, gh = height * 0.3;
  let X = (h) => gx + ((h - XLO) / (XHI - XLO)) * gw, Y = (m) => gy + gh - m * gh;
  stroke(0, 0, 40); strokeWeight(1); line(gx, gy + gh, gx + gw, gy + gh); line(gx, gy, gx, gy + gh);
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let h = 150; h <= XHI; h += 5) text(h, X(h) - 10, gy + gh + 16);
  text('1', gx - 16, Y(1) + 4); text('0.5', gx - 26, Y(0.5) + 4); text('0', gx - 16, Y(0) + 4);
  stroke(0, 0, 30); line(gx, Y(0.5), gx + gw, Y(0.5));
  // クリスプ（階段）
  noFill(); stroke(20, 45, 100); strokeWeight(3);
  beginShape(); vertex(X(XLO), Y(0)); vertex(X(c0), Y(0)); vertex(X(c0), Y(1)); vertex(X(XHI), Y(1)); endShape();
  // ファジィ（シグモイド）
  stroke(175, 60, 80); strokeWeight(4);
  beginShape(); for (let i = 0; i <= 200; i++) { let h = XLO + ((XHI - XLO) * i) / 200; vertex(X(h), Y(fuzzyTall(h))); } endShape();
  // 人の位置
  for (let h of people) { stroke(0, 0, 100, 40); strokeWeight(1); line(X(h), gy + gh, X(h), Y(fuzzyTall(h))); noStroke(); fill(175, 60, 80); circle(X(h), Y(fuzzyTall(h)), 8); }

  // ---- 人のアイコン
  let n = people.length, cw = (width - 140) / n, base = height - 120, sc = (height * 0.27) / 200;
  let sumC = 0, sumF = 0;
  for (let i = 0; i < n; i++) {
    let h = people[i], mc = crispTall(h), mf = fuzzyTall(h), m = colorCrisp ? mc : mf;
    sumC += mc; sumF += mf;
    let cx = 70 + cw * (i + 0.5), top = base - h * sc;
    let col = color(lerp(260, 20, m), lerp(15, 60, m), lerp(45, 100, m));
    noStroke(); fill(col);
    circle(cx, top + 10, 20);
    rect(cx - 9, top + 22, 18, h * sc - 22, 6);
    fill(0, 0, 95); textSize(13); textAlign(CENTER);
    text(h.toFixed(1), cx, base + 18);
    fill(20, 45, 100); text('クリスプ ' + mc, cx, base + 38);
    fill(175, 60, 80); text('μ = ' + mf.toFixed(2), cx, base + 58);
    textAlign(LEFT, BASELINE);
  }
  // ---- 集計：クリスプの人数と、ファジィの「濃さの合計」（シグマ・カウント）
  fill(0, 0, 95); textSize(16);
  text('「背が高い人」の数　クリスプ：' + sumC + ' 人　ファジィ（μ の合計 Σμ）：' + sumF.toFixed(2) + ' 人ぶん', 70, gy + gh + 44);
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}

function mouseDragged() {
  let gx = 70, gw = width - 140, gy = 100, gh = height * 0.3;
  if (mouseY > gy - 20 && mouseY < gy + gh + 30) c0 = clampv(XLO + ((mouseX - gx) / gw) * (XHI - XLO), 150, 195);
}
function mousePressed() { mouseDragged(); }
function keyPressed() {
  if (key === LEFT_ARROW) c0 = clampv(c0 - 1, 150, 195);
  if (key === RIGHT_ARROW) c0 = clampv(c0 + 1, 150, 195);
  if (key === UP_ARROW) slope = clampv(slope * 1.4, 0.05, 20);
  if (key === DOWN_ARROW) slope = clampv(slope / 1.4, 0.05, 20);
  if (key === ' ') newPeople();
  if (key === 'c' || key === 'C') colorCrisp = !colorCrisp;
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  check('シグモイドは真ん中 c で μ = 0.5', near(sigmf(175, 0.35, 175), 0.5));
  check('クリスプ：175.0 cm は 1、174.9 cm は 0', crispTall(175) === 1 && crispTall(174.9) === 0);
  check('対称性 μ(c + d) + μ(c − d) = 1（d = 7）', near(sigmf(182, 0.35, 175) + sigmf(168, 0.35, 175), 1));
  check('a = ln 3 ÷ 2 なら μ(c + 2) = 0.75', near(sigmf(177, Math.log(3) / 2, 175), 0.75));
  let mono = true, inside = true, prev = -1;
  for (let h = 140; h <= 210; h += 0.5) { let m = sigmf(h, 0.35, 175); if (m < prev) mono = false; if (m < 0 || m > 1) inside = false; prev = m; }
  check('μ は単調に増え、いつも 0〜1', mono && inside);
  check('170 cm と 180 cm の 2 人：Σμ = 1（c = 175）', near(sigmf(170, 0.35, 175) + sigmf(180, 0.35, 175), 1));
  check('傾きを大きくする（a = 50）とクリスプに近づく', sigmf(175.5, 50, 175) > 0.999 && sigmf(174.5, 50, 175) < 0.001);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑ を何回も押して傾き a を大きくすると、シグモイドはクリスプの階段にどんどん近づく
// 2. しきい値ちょうど付近の 2 人（174 cm と 176 cm）で、クリスプとファジィの答えを比べよう
// 3. 「背が高い人の数」：クリスプは整数、ファジィは Σμ（小数）。どちらが実感に近い？
// 4. nPeople や c0 を変えて、男子・女子・子どもなど、集団ごとに「背が高い」の基準を考えよう
// 5. sigmf を gaussmf にすると「ふつうの背」になる。どんな形にすればよいか考えよう


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

