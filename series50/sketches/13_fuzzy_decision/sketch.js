// ============================================
// 13 ファジィ意思決定（ベルマン－ザデーの決定）
// 部屋探し：「安い」「駅に近い」「評判が良い」をそれぞれ所属度 0〜1 で評価する
//   決定 D = 目標と制約の交わり（かつ = min）。D がいちばん大きい候補を選ぶ。重み w は μ^w（w が大きいほどきびしく効く）
// ←→ = 基準を選ぶ / ↑↓ = その基準の重み w / T = かつ を min ↔ 積 / 下のグラフをドラッグ = 制約 C を動かす
// ============================================

let OPTS = [   // ★ 候補：名前、家賃 [万円/月]、駅まで [分]、評判 [★]
  { name: 'A', price: 6.5, walk: 25, star: 3.8 },
  { name: 'B', price: 8.0, walk: 10, star: 4.2 },
  { name: 'C', price: 5.0, walk: 40, star: 3.0 },
  { name: 'D', price: 7.0, walk: 15, star: 4.6 },
  { name: 'E', price: 9.5, walk: 5, star: 4.8 },
];
let CRIT = [   // ★ 基準のメンバーシップ関数（台形）
  { name: '安い', key: 'price', unit: '万円', lo: 3, hi: 11, mf: { type: 'trap', p: [0, 0, 5, 10] } },
  { name: '駅に近い', key: 'walk', unit: '分', lo: 0, hi: 50, mf: { type: 'trap', p: [0, 0, 5, 45] } },
  { name: '評判が良い', key: 'star', unit: '★', lo: 2.5, hi: 5, mf: { type: 'trap', p: [3, 4.8, 5, 5] } },
];
let wts = [1, 1, 1];  // ★ 重み（μ^w）
let sel = 0, useProd = false;
let cMid = 6;         // 下のグラフ：制約 C の真ん中（ドラッグで動かす）
let plot1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
}

function draw() {
  background(250, 18, 14);
  let res = decide(OPTS, CRIT, wts, useProd), best = res.best;
  fill(0, 0, 95); noStroke(); textSize(18);
  text('←→ 基準を選ぶ（いま：' + CRIT[sel].name + '）　↑↓ 重み w = ' + wts[sel].toFixed(2) + '　T かつ = ' + (useProd ? '積' : 'min') + '　下のグラフをドラッグ', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('決定 D = μ安い^w₁ ∧ μ近い^w₂ ∧ μ評判^w₃。いちばん弱い基準が全体を決める（min）。積にすると全部が少しずつ効く', 20, 62);

  // 上段：3 つのメンバーシップ関数と候補の位置
  let pw = (width - 80) / 3, ph = height * 0.2, py = 100;
  CRIT.forEach((c, i) => {
    let px = 20 + i * (pw + 20);
    fill(0, 0, 100, i === sel ? 12 : 5); stroke(i === sel ? color(20, 45, 100) : color(0, 0, 100, 15)); rect(px, py, pw, ph + 40, 8);
    noStroke(); fill(0, 0, 95); textSize(16); text(c.name + '（' + c.unit + '）　w = ' + wts[i].toFixed(2), px + 10, py + 22);
    let X = (v) => px + 10 + ((v - c.lo) / (c.hi - c.lo)) * (pw - 20), Y = (m) => py + ph + 20 - m * (ph - 20);
    noFill(); stroke(175, 60, 80); strokeWeight(2.5); beginShape();
    for (let k = 0; k <= 80; k++) { let v = c.lo + ((c.hi - c.lo) * k) / 80; vertex(X(v), Y(Math.pow(evalMF(c.mf, v), wts[i]))); }
    endShape(); strokeWeight(1);
    OPTS.forEach((o, j) => {
      let v = o[c.key], m = res.mu[j][i];
      stroke(0, 0, 100, 30); line(X(v), Y(0), X(v), Y(m));
      noStroke(); fill(j === best ? color(20, 45, 100) : color(260, 30, 90)); circle(X(v), Y(m), 10);
      fill(0, 0, 90); textSize(12); text(o.name, X(v) - 4, Y(m) - 8);
    });
  });

  // 中段：表と D の棒
  let ty = py + ph + 80;
  fill(0, 0, 95); textSize(16);
  let cols = [20, 90, 190, 290, 390, 520, 640, 760, 900];
  ['候補', '家賃', '駅まで', '評判', 'μ安い^w', 'μ近い^w', 'μ評判^w', '決定 D'].forEach((h, i) => text(h, cols[i], ty));
  OPTS.forEach((o, j) => {
    let y = ty + 26 + j * 26;
    fill(j === best ? color(20, 45, 100) : color(0, 0, 85)); textSize(15);
    text(o.name + (j === best ? ' ★' : ''), cols[0], y); text(o.price.toFixed(1) + ' 万', cols[1], y); text(o.walk + ' 分', cols[2], y); text(o.star.toFixed(1), cols[3], y);
    for (let i = 0; i < 3; i++) text(res.mu[j][i].toFixed(3), cols[4 + i], y);
    text(res.D[j].toFixed(3), cols[7], y);
    fill(j === best ? color(20, 45, 100) : color(260, 30, 70)); rect(cols[8], y - 14, (width - cols[8] - 40) * res.D[j], 16, 3);
  });

  // 下段：連続のベルマン－ザデー（目標 G と制約 C の交わり）
  let by = ty + 26 * OPTS.length + 50, bh = height - by - 60, bx = 20, bw = width - 60;
  plot1 = { x: bx, y: by, w: bw, h: bh };
  fill(0, 0, 100, 5); noStroke(); rect(bx, by, bw, bh, 8);
  let X = (x) => bx + 20 + (x / 10) * (bw - 40), Y = (m) => by + bh - 14 - m * (bh - 40);
  let gs = [], cs = [], ds = [], arg = 0, dmax = -1;
  for (let k = 0; k <= 200; k++) {
    let x = k / 20, gv = goalG(x), cv = constrC(x, cMid), dv = Math.min(gv, cv);
    gs.push([X(x), Y(gv)]); cs.push([X(x), Y(cv)]); ds.push([X(x), Y(dv)]);
    if (dv > dmax + 1e-12) { dmax = dv; arg = x; }
  }
  noStroke(); fill(20, 45, 100, 30); beginShape(); vertex(X(0), Y(0)); for (let p of ds) vertex(p[0], p[1]); vertex(X(10), Y(0)); endShape(CLOSE);
  poly(gs, color(175, 60, 80), 2.5); poly(cs, color(260, 30, 90), 2.5); poly(ds, color(20, 45, 100), 4);
  stroke(0, 70, 100); strokeWeight(2); line(X(arg), Y(0), X(arg), Y(dmax)); strokeWeight(1);
  noStroke(); fill(0, 0, 95); textSize(15);
  text('連続の例：x = 部屋の広さを決める量（0〜10）　目標 G「広い」= x/10（青緑）　制約 C「予算に収まる」（紫、ドラッグで動かす）　D = G ∧ C（オレンジ）', bx + 10, by + 20);
  fill(0, 70, 100); text('最良の x* = ' + arg.toFixed(2) + '、D(x*) = ' + dmax.toFixed(3), X(arg) + 8, Y(dmax) - 8);
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}
function poly(pts, c, w) { if (!pts.length) return; noFill(); stroke(c); strokeWeight(w); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(); strokeWeight(1); }
function goalG(x) { return clampv(x / 10, 0, 1); }
function constrC(x, m) { return clampv(0.5 - (x - m) / 10, 0, 1); }   // m で 0.5、傾き −1/10

function mouseDragged() {
  if (!plot1 || mouseY < plot1.y || mouseY > plot1.y + plot1.h) return;
  cMid = clampv(((mouseX - plot1.x - 20) / (plot1.w - 40)) * 10, 0, 10);
}
function keyPressed() {
  if (key === RIGHT_ARROW) sel = (sel + 1) % 3;
  if (key === LEFT_ARROW) sel = (sel + 2) % 3;
  if (key === UP_ARROW) wts[sel] = Math.min(3, wts[sel] + 0.25);
  if (key === DOWN_ARROW) wts[sel] = Math.max(0, wts[sel] - 0.25);
  if (key === 't' || key === 'T') useProd = !useProd;
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let dm = -1, am = -1; for (let k = 0; k <= 100; k++) { let x = k / 10, d = Math.min(x / 10, 1 - x / 10); if (d > dm) { dm = d; am = x; } }
  check('G = x/10、C = 1 − x/10 → D = min が最大になるのは x = 5、D = 0.5', near(am, 5) && near(dm, 0.5));
  check('C の真ん中 m = 5 なら、この画面の C は 1 − x/10 と同じ', [0, 2.5, 5, 7.5, 10].every((x) => near(constrC(x, 5), 1 - x / 10)));
  let r = decide(OPTS, CRIT, [1, 1, 1], false);
  check('候補 D の所属度 = (0.6, 0.75, 0.889)、決定 0.6', near(r.mu[3][0], 0.6) && near(r.mu[3][1], 0.75) && near(r.mu[3][2], 1.6 / 1.8) && near(r.D[3], 0.6));
  check('重みが全部 1 なら ふつうの min：A 0.444、B 0.4、C 0、D 0.6、E 0.1', [0.8 / 1.8, 0.4, 0, 0.6, 0.1].every((v, j) => near(r.D[j], v)));
  check('いちばん良いのは D、順位は D > A > B > E > C', r.best === 3 && [3, 0, 1, 4, 2].every((j, i, a) => i === 0 || r.D[a[i - 1]] > r.D[j]));
  let r0 = decide(OPTS, CRIT, [0, 1, 1], false);
  check('「安い」の重みを 0 にすると（μ⁰ = 1 で無視）E が 1 で一番', r0.best === 4 && near(r0.D[4], 1));
  let r2 = decide(OPTS, CRIT, [2, 1, 1], false);
  check('「安い」の重み 2：D は min(0.36, 0.75, 0.889) = 0.36', near(r2.D[3], 0.36));
  check('積にすると D の決定 = 0.6 × 0.75 × 0.889 = 0.4', near(decide(OPTS, CRIT, [1, 1, 1], true).D[3], 0.6 * 0.75 * (1.6 / 1.8)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で「安い」の重みを 0 → 3 と変える。どこで一番が D から ほかの候補に入れかわる？
// 2. T で積にすると、順位はどう変わる？ min は「いちばん弱い所」だけを見る
// 3. 自分の候補を OPTS に足そう（家賃 6 万、駅 30 分、評判 4.9 など）
// 4. CRIT の台形を変えて「安い」を自分の感覚に合わせる（例 [0, 0, 6, 9]）
// 5. 下のグラフで C を動かす。x* はいつも G と C の交わる点になる？


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

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

// ---- ベルマン－ザデーの決定：候補ごとに D = ∧ μ_i^w_i（min または 積）、D が最大の候補を選ぶ
function decide(opts, crit, w, prod) {
  let mu = opts.map((o) => crit.map((c, i) => Math.pow(evalMF(c.mf, o[c.key]), w[i])));
  let D = mu.map((row) => row.reduce((a, m) => (prod ? a * m : Math.min(a, m)), 1));
  let best = 0; D.forEach((d, j) => { if (d > D[best]) best = j; });
  return { mu, D, best };
}
