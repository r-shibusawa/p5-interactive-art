// ============================================
// 06 マムダニ型推論（エアコンの強さを決める）
// 「暑くて じめじめ なら 強く」のような 9 個の規則で、温度と湿度からエアコンの強さを決める
//   入力 → 所属度（ファジィ化）→ 規則の強さ（min か 積）→ 後件を切る/縮める → max で集約 → 重心 → 出力
// マウス = 入力のグラフをドラッグ / ←→ = 温度 / ↑↓ = 湿度 / 1 = 「かつ」min ⇔ 積 / 2 = 含意 切る ⇔ 縮める
// ============================================

let temp = 29, hum = 70;                       // ★ はじめの入力（温度 ℃、湿度 %）
const OUT_NAMES = ['とても弱', '弱', '中', '強', 'とても強'];
// ★ 規則の表：行 = 温度（低い・ふつう・高い）、列 = 湿度（低い・ふつう・高い）、中身 = 出力の番号
let RULES = [
  [0, 1, 1],
  [1, 2, 3],
  [2, 3, 4],
];
let sys, res, surf, OUTCOL;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  OUTCOL = [color(200, 45, 90), color(175, 60, 80), color(260, 30, 90), color(20, 45, 100), color(0, 60, 100)];
  sys = makeSystem('min', 'min');
  selfTest();
  rebuildSurface();
}

// 2 入力 1 出力のマムダニ型システム
function makeSystem(andMode, impMode) {
  let rules = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rules.push({ ifs: [i, j], then: RULES[i][j] });
  return {
    inputs: [{ name: '温度', unit: '℃', lo: 10, hi: 40, sets: evenTri(10, 40, ['低い', 'ふつう', '高い']) },
             { name: '湿度', unit: '%', lo: 20, hi: 90, sets: evenTri(20, 90, ['低い', 'ふつう', '高い']) }],
    output: { name: '強さ', lo: 0, hi: 100, sets: evenTri(0, 100, OUT_NAMES) },
    rules, and: andMode, imp: impMode, N: 401,
  };
}

// 出力の曲面（40 × 40 の入力で推論した結果）を色の地図に。設定を変えたときだけ計算
function rebuildSurface() {
  let n = 40, s2 = { ...sys, N: 101 };
  surf = createGraphics(n, n); surf.colorMode(HSB, 360, 100, 100, 100); surf.noStroke();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    let y = mamdani(s2, [10 + (30 * i) / (n - 1), 90 - (70 * j) / (n - 1)]).y;
    surf.fill((220 + 1.6 * y) % 360, 30 + y * 0.35, 40 + y * 0.55); surf.rect(i, j, 1, 1);
  }
}

function draw() {
  background(250, 18, 14);
  res = mamdani(sys, [temp, hum]);
  let W = width, c1 = 20, cw = W * 0.3, c2 = W * 0.35, c3 = W * 0.69, ph = Math.min(150, (height - 300) / 3);

  fill(0, 0, 95); noStroke(); textSize(18);
  text('←→ 温度 ' + nf(temp, 1, 1) + '℃　↑↓ 湿度 ' + nf(hum, 1, 0) + '%　1：かつ = ' + (sys.and === 'min' ? 'min' : '積') + '　2：含意 = ' + (sys.imp === 'min' ? '切る（min）' : '縮める（積）') + '　グラフをドラッグでも入力', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('① ファジィ化 → ② 規則の強さ w → ③ 後件を切る → ④ max で集約 → ⑤ 重心 = 出力', 20, 62);

  // ① 入力のメンバーシップ関数と所属度
  for (let k = 0; k < 2; k++) {
    let v = sys.inputs[k], y0 = 100 + k * (ph + 50);
    drawSets(c1, y0, cw, ph, v.lo, v.hi, v.sets.map((s) => s.mf), [OUTCOL[1], OUTCOL[2], OUTCOL[3]], null);
    let xv = c1 + ((k ? hum : temp) - v.lo) / (v.hi - v.lo) * cw;
    stroke(0, 0, 95); strokeWeight(2); line(xv, y0, xv, y0 + ph);
    noStroke(); fill(0, 0, 95); textSize(15);
    text('① ' + v.name + ' = ' + nf(k ? hum : temp, 1, 1) + v.unit + '　' + v.sets.map((s, i) => s.name + ' ' + nf(res.deg[k][i], 1, 2)).join('　'), c1, y0 - 8);
  }
  // ③ 出力の集合と、切った後件
  let yo = 100 + 2 * (ph + 50);
  drawSets(c1, yo, cw, ph, 0, 100, sys.output.sets.map((s) => s.mf), OUTCOL.map(() => color(0, 0, 100, 25)), null);
  for (let k = 0; k < 5; k++) if (res.str[k] > 0) {
    let ys = res.ox.map((x) => { let m = evalMF(sys.output.sets[k].mf, x); return sys.imp === 'prod' ? res.str[k] * m : Math.min(res.str[k], m); });
    fillCurve(c1, yo, cw, ph, res.ox, ys, OUTCOL[k]);
  }
  noStroke(); fill(0, 0, 95); textSize(15);
  text('③ 後件（' + (sys.imp === 'min' ? '強さ w で切る' : '強さ w 倍に縮める') + '）', c1, yo - 8);

  // ② 規則の表（セルの明るさ = 強さ w）
  let cs = Math.min((cw - 60) / 3, (2 * ph + 20) / 3.3), tx = c2 + 60, ty = 120;
  textSize(14); fill(0, 0, 70); text('② 規則の強さ w = ' + (sys.and === 'min' ? 'min' : '積') + '(温度の所属度, 湿度の所属度)', c2, 92);
  for (let j = 0; j < 3; j++) { fill(0, 0, 70); text('湿度が' + sys.inputs[1].sets[j].name, tx + j * cs + 6, ty - 4); }
  sys.rules.forEach((r, n) => {
    let i = r.ifs[0], j = r.ifs[1], x = tx + j * cs, y = ty + i * cs, w = res.w[n];
    fill(hueOf(r.then), 40, 18 + 70 * w); stroke(0, 0, 100, 30); rect(x, y, cs - 6, cs - 6, 6);
    noStroke(); fill(0, 0, w > 0.5 ? 10 : 95); textSize(13); text('R' + (n + 1) + '→' + OUT_NAMES[r.then], x + 6, y + 20);
    textSize(18); text('w=' + nf(w, 1, 2), x + 6, y + 48);
  });
  for (let i = 0; i < 3; i++) { fill(0, 0, 70); textSize(14); push(); translate(tx - 12, ty + i * cs + cs * 0.75); rotate(-HALF_PI); text('温度が' + sys.inputs[0].sets[i].name, 0, 0); pop(); }

  // ④ 集約と ⑤ 重心
  drawSets(c2, yo, cw, ph, 0, 100, [], [], null);
  fillCurve(c2, yo, cw, ph, res.ox, res.agg, color(20, 45, 100));
  let xc = c2 + (res.y / 100) * cw;
  stroke(175, 60, 90); strokeWeight(3); line(xc, yo - 4, xc, yo + ph + 4);
  noStroke(); fill(175, 60, 90); triangle(xc - 9, yo + ph + 16, xc + 9, yo + ph + 16, xc, yo + ph + 3);
  fill(0, 0, 95); textSize(15);
  text('④ max で集約　⑤ 重心 = ∫x μ dx ÷ ∫μ dx（' + sys.N + ' 点で積分）', c2, yo - 8);
  textSize(24); fill(175, 60, 90); text('出力 = ' + nf(res.y, 1, 2) + (res.fired ? '' : '（発火なし → まん中）'), c2, yo + ph + 46);

  // 出力の曲面（ヒートマップ）
  let hs = Math.min(W - c3 - 30, 2 * ph + 50);
  image(surf, c3, 100, hs, hs);
  let mx = c3 + ((temp - 10) / 30) * hs, my = 100 + ((90 - hum) / 70) * hs;
  noFill(); stroke(0, 0, 100); strokeWeight(2); circle(mx, my, 14);
  noStroke(); fill(0, 0, 95); textSize(14);
  text('出力の曲面（横 = 温度、縦 = 湿度、色 = 強さ）', c3, 90);
  text('10℃', c3, 100 + hs + 18); text('40℃', c3 + hs - 30, 100 + hs + 18);
  fill(0, 0, 70);
  text('発火した規則：' + res.w.map((w, n) => (w > 0 ? 'R' + (n + 1) : '')).filter((s) => s).join(' ') + '　面積 = ' + nf(areaOf(res.ox, res.agg), 1, 2), c3, 100 + hs + 44, W - c3 - 20);

  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}
function hueOf(k) { return [200, 175, 260, 20, 0][k]; }

// グラフの枠と MF（折れ線）を描く
function drawSets(x, y, w, h, lo, hi, mfs, cols) {
  noFill(); stroke(0, 0, 100, 25); strokeWeight(1); rect(x, y, w, h);
  mfs.forEach((mf, k) => {
    stroke(cols[k]); strokeWeight(2.5); beginShape();
    for (let i = 0; i <= 120; i++) { let v = lo + ((hi - lo) * i) / 120; vertex(x + (i / 120) * w, y + h - evalMF(mf, v) * h); }
    endShape();
  });
}
// 折れ線の下を塗る
function fillCurve(x, y, w, h, xs, ys, col) {
  if (xs.length < 2) return;
  let lo = xs[0], hi = xs[xs.length - 1];
  fill(hue(col), saturation(col), brightness(col), 45); stroke(col); strokeWeight(2);
  beginShape(); vertex(x, y + h);
  for (let i = 0; i < xs.length; i++) vertex(x + ((xs[i] - lo) / (hi - lo)) * w, y + h - ys[i] * h);
  vertex(x + w, y + h); endShape(CLOSE);
}

function mouseDragged() { setFromMouse(); }
function mousePressed() { setFromMouse(); }
function setFromMouse() {
  let cw = width * 0.3, ph = Math.min(150, (height - 300) / 3);
  if (mouseX < 20 || mouseX > 20 + cw) return;
  let u = (mouseX - 20) / cw;
  if (mouseY > 100 && mouseY < 100 + ph) temp = clampv(10 + 30 * u, 10, 40);
  if (mouseY > 150 + ph && mouseY < 150 + 2 * ph) hum = clampv(20 + 70 * u, 20, 90);
}
function keyPressed() {
  if (key === LEFT_ARROW) temp = clampv(temp - 0.5, 10, 40);
  if (key === RIGHT_ARROW) temp = clampv(temp + 0.5, 10, 40);
  if (key === UP_ARROW) hum = clampv(hum + 1, 20, 90);
  if (key === DOWN_ARROW) hum = clampv(hum - 1, 20, 90);
  if (key === '1') { sys = makeSystem(sys.and === 'min' ? 'prod' : 'min', sys.imp); rebuildSurface(); }
  if (key === '2') { sys = makeSystem(sys.and, sys.imp === 'min' ? 'prod' : 'min'); rebuildSurface(); }
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let s = makeSystem('min', 'min'), r;
  r = mamdani(s, [25, 55]);
  check('温度 25℃・湿度 55%（どちらも「ふつう」の頂点）→ R5 だけ w = 1、出力 = 「中」の重心 50', r.w.filter((w) => w > 0).length === 1 && near(r.w[4], 1) && near(r.y, 50, 1e-6));
  r = mamdani(s, [10, 20]);
  check('10℃・20% → R1 だけ。「とても弱」は 0〜25 の直角三角形 → 重心 25/3 = 8.33', near(r.y, 25 / 3, 1e-6));
  r = mamdani(s, [17.5, 55]);
  check('17.5℃・55% → R2 と R5 が w = 0.5。切った「弱」と「中」の和は 37.5 に対称 → 出力 37.5', near(r.w[1], 0.5) && near(r.w[4], 0.5) && near(r.y, 37.5, 1e-6));
  r = mamdani(s, [17.5, 37.5]);
  let rp = mamdani(makeSystem('prod', 'min'), [17.5, 37.5]);
  check('17.5℃・37.5% → 4 規則が min で 0.5、積で 0.25', [0, 1, 3, 4].every((k) => near(r.w[k], 0.5) && near(rp.w[k], 0.25)));
  let xs = [], ys = [];
  for (let i = 0; i <= 400; i++) { xs.push(i * 0.25); ys.push(Math.min(0.6, trimf(i * 0.25, 25, 50, 75))); }
  check('1 つの三角 (25, 50, 75) を 0.6 で切った台形の重心 = 50、面積 = 0.6 × (50 + 20) / 2 = 21', near(centroid(xs, ys), 50, 1e-9) && near(areaOf(xs, ys), 21, 1e-9));
  let empty = mamdani({ ...s, rules: [] }, [30, 60]);
  check('規則が 1 つも発火しない → 0 で割らずに まん中 50 を返す', !empty.fired && empty.y === 50);
  let mono = true, prev;
  for (let h = 20; h <= 90; h += 10) { prev = -1; for (let t = 10; t <= 40; t += 2) { let y = mamdani({ ...s, N: 201 }, [t, h]).y; if (y < prev - 1e-6 || y < 0 || y > 100) mono = false; prev = y; } }
  check('出力は 0〜100 に入り、温度が上がると弱くならない（規則の表が単調だから）', mono);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 温度を 17.5℃ にすると「低い」と「ふつう」が 0.5 ずつ。どの規則が発火する？
// 2. 1 で「かつ」を積にすると、w はどう変わる？ 曲面はなめらかになる？
// 3. 2 で「縮める」にすると、集約の形と出力が少し変わる
// 4. RULES の表を書きかえて（例：湿度が高いと とても強）、曲面の形を見る
// 5. 出力の集合を 3 個にすると、曲面はどうなる？（OUT_NAMES と RULES を変える）


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

// ---- 非ファジィ化（xs, ys は同じ長さの配列。ys は折れ線の高さ）
// 重心 = ∫x μ dx ÷ ∫μ dx（折れ線の区間ごとに正確に積分）。どの規則も発火しなければ null
function centroid(xs, ys) {
  let A = 0, M = 0;
  for (let i = 0; i + 1 < xs.length; i++) {
    let h = xs[i + 1] - xs[i], y0 = ys[i], y1 = ys[i + 1];
    A += (h * (y0 + y1)) / 2;
    M += (h * (xs[i] * (2 * y0 + y1) + xs[i + 1] * (y0 + 2 * y1))) / 6;
  }
  return A > 1e-12 ? M / A : null;
}
function areaOf(xs, ys) { let A = 0; for (let i = 0; i + 1 < xs.length; i++) A += ((xs[i + 1] - xs[i]) * (ys[i] + ys[i + 1])) / 2; return A; }

// ---- マムダニ型推論
// sys = { inputs: [{ name, lo, hi, sets: [{ name, mf }] }], output: { name, lo, hi, sets }, rules: [{ ifs: [i, j], then: k }],
//         and: 'min' | 'prod', imp: 'min' | 'prod', N: 401 }
function mamdani(sys, xin) {
  let deg = sys.inputs.map((v, i) => v.sets.map((s) => evalMF(s.mf, clampv(xin[i], v.lo, v.hi))));
  let w = sys.rules.map((r) => r.ifs.reduce((acc, si, i) => (si < 0 ? acc : sys.and === 'prod' ? acc * deg[i][si] : Math.min(acc, deg[i][si])), 1));
  let o = sys.output, str = o.sets.map(() => 0);
  sys.rules.forEach((r, k) => { str[r.then] = Math.max(str[r.then], w[k]); });   // 同じ後件は max でまとめる
  let N = sys.N || 401, ox = new Array(N), agg = new Array(N);
  for (let i = 0; i < N; i++) {
    let x = o.lo + ((o.hi - o.lo) * i) / (N - 1), a = 0;
    for (let k = 0; k < o.sets.length; k++) if (str[k] > 0) {
      let m = evalMF(o.sets[k].mf, x);
      a = Math.max(a, sys.imp === 'prod' ? str[k] * m : Math.min(str[k], m));   // 切る（min）か縮める（積）
    }
    ox[i] = x; agg[i] = a;
  }
  let c = centroid(ox, agg);
  return { deg, w, str, ox, agg, y: c === null ? (o.lo + o.hi) / 2 : c, fired: c !== null };
}
// 等間隔の三角 MF を n 個（両端は肩）
function evenTri(lo, hi, names) {
  let n = names.length, d = (hi - lo) / (n - 1);
  return names.map((name, i) => ({ name, mf: { type: 'tri', p: [lo + (i - 1) * d, lo + i * d, lo + (i + 1) * d] } }));
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
