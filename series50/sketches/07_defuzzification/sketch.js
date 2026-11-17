// ============================================
// 07 非ファジィ化の比較
// 推論の結果は「形」（ファジィ集合）。最後に 1 つの数にする方法はいくつもある
//   重心法・面積二等分法・最大値の平均（MOM）・最大値の最小（SOM）・最大値の最大（LOM）
// ドラッグ = 三角の頂点を動かす（横 = 位置、縦 = 切る高さ）/ 1 2 = 選ぶ / ←→ ↑↓ = 動かす / C = 切る ⇔ 縮める / R = もとに戻す
// ============================================

const LO = 0, HI = 10, N = 1001;               // ★ 出力の範囲と、積分に使う点の数
let tris, sel = 0, scaled = false, ag, out;
const METHODS = [
  { key: 'cog', name: '重心法', desc: '∫x μ dx ÷ ∫μ dx。形全体の「つり合う点」', hue: 175 },
  { key: 'bis', name: '面積二等分法', desc: '左右の面積がちょうど半分ずつになる点', hue: 260 },
  { key: 'mom', name: '最大値の平均 MOM', desc: 'μ がいちばん高い点たちの平均', hue: 20 },
  { key: 'som', name: '最大値の最小 SOM', desc: 'μ がいちばん高い点のうち、いちばん左', hue: 50 },
  { key: 'lom', name: '最大値の最大 LOM', desc: 'μ がいちばん高い点のうち、いちばん右', hue: 330 },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetShapes();
  selfTest();
}
function resetShapes() {
  // ★ 2 つの後件：三角 (a, b, c) と、切る高さ h
  tris = [{ a: 1, b: 3, c: 5, h: 0.8 }, { a: 3.5, b: 6.5, c: 9.5, h: 0.45 }];
}

// 2 つの「切った三角」の max（集約）を折れ線にする
function aggregate() {
  let xs = [], ys = [];
  for (let i = 0; i < N; i++) {
    let x = LO + ((HI - LO) * i) / (N - 1), y = 0;
    for (let t of tris) { let m = trimf(x, t.a, t.b, t.c); y = Math.max(y, scaled ? t.h * m : Math.min(t.h, m)); }
    xs.push(x); ys.push(y);
  }
  return { xs, ys };
}
function defuzzAll(xs, ys) {
  let mx = maxima(xs, ys);
  return { cog: centroid(xs, ys), bis: bisector(xs, ys), mom: mx && mx.mom, som: mx && mx.som, lom: mx && mx.lom, height: mx ? mx.height : 0 };
}

function draw() {
  background(250, 18, 14);
  ag = aggregate(); out = defuzzAll(ag.xs, ag.ys);
  let px = 40, py = 175, pw = width * 0.6, ph = height - 300;
  let X = (x) => px + ((x - LO) / (HI - LO)) * pw, Y = (y) => py + ph - y * ph;

  fill(0, 0, 95); noStroke(); textSize(18);
  text('ドラッグ：頂点（横 = 位置、縦 = 高さ）　1 2：選ぶ（今 ' + (sel + 1) + '）　←→ ↑↓：動かす　C：' + (scaled ? '縮める（積）' : '切る（min）') + '　R：戻す', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('同じ形でも、非ファジィ化の方法で出てくる数がちがう。台形の平らな部分や、2 つの山の大きさの差に注目', 20, 62);

  // 軸と目盛り
  stroke(0, 0, 100, 25); strokeWeight(1); noFill(); rect(px, py, pw, ph);
  noStroke(); fill(0, 0, 60); textSize(13);
  for (let x = LO; x <= HI; x++) text(x, X(x) - 4, py + ph + 18);
  text('1', px - 16, py + 5); text('0', px - 16, py + ph + 4);
  // もとの三角（うすく）
  tris.forEach((t, k) => {
    stroke(0, 0, 100, k === sel ? 55 : 25); strokeWeight(k === sel ? 2 : 1); noFill();
    beginShape(); vertex(X(t.a), Y(0)); vertex(X(t.b), Y(1)); vertex(X(t.c), Y(0)); endShape();
    noStroke(); fill(k === sel ? color(20, 45, 100) : color(0, 0, 70)); circle(X(t.b), Y(t.h), 14);
  });
  // 集約した形
  fill(260, 30, 90, 30); stroke(260, 30, 95); strokeWeight(2.5);
  beginShape(); vertex(X(LO), Y(0));
  for (let i = 0; i < N; i += 5) vertex(X(ag.xs[i]), Y(ag.ys[i]));
  vertex(X(HI), Y(0)); endShape(CLOSE);
  // 面積二等分の左側を少し濃く
  if (out.bis !== null) {
    noStroke(); fill(260, 40, 90, 25); beginShape(); vertex(X(LO), Y(0));
    for (let i = 0; i < N && ag.xs[i] <= out.bis; i += 2) vertex(X(ag.xs[i]), Y(ag.ys[i]));
    vertex(X(out.bis), Y(0)); endShape(CLOSE);
  }
  // 各方法の位置
  METHODS.forEach((m, k) => {
    let v = out[m.key]; if (v === null || v === undefined) return;
    stroke(m.hue, 60, 100); strokeWeight(2.5); line(X(v), py - 10 - k * 19, X(v), py + ph);
    noStroke(); fill(m.hue, 60, 100); circle(X(v), py - 10 - k * 19, 9);
    textSize(13); text(m.name.split(' ')[0], X(v) + 7, py - 6 - k * 19);
  });

  // 右の表
  let tx = width * 0.66, ty = 130, tw = width - tx - 30;
  fill(0, 0, 95); textSize(20); text('出力の値（範囲 ' + LO + '〜' + HI + '）', tx, ty);
  METHODS.forEach((m, k) => {
    let y = ty + 30 + k * 78, v = out[m.key];
    fill(m.hue, 50, 30); rect(tx, y, tw, 66, 8);
    fill(m.hue, 60, 100); textSize(18); text(m.name, tx + 14, y + 26);
    textSize(24); text(v === null || v === undefined ? '—' : nf(v, 1, 3), tx + tw - 110, y + 28);
    fill(0, 0, 80); textSize(13); text(m.desc, tx + 14, y + 52);
  });
  let A = areaOf(ag.xs, ag.ys), yb = ty + 30 + 5 * 78 + 20;
  fill(0, 0, 80); textSize(15);
  text('面積 ∫μ dx = ' + nf(A, 1, 3) + '　高さ = ' + nf(out.height, 1, 2) + '（' + N + ' 点で積分）', tx, yb);
  if (out.bis !== null) {
    let left = areaOf(ag.xs.filter((x) => x <= out.bis), ag.ys.slice(0, ag.xs.filter((x) => x <= out.bis).length));
    text('二等分点の左の面積 ≈ ' + nf(left, 1, 3) + '　右 ≈ ' + nf(A - left, 1, 3), tx, yb + 24);
  }
  fill(0, 0, 65); textSize(13);
  text('重心法はなめらかで、よく使われる。MOM・SOM・LOM は計算が速いが、山の高さが入れかわると値がとぶ', tx, yb + 48, tw);

  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}

// ---- 操作
function mousePressed() {
  let px = 40, py = 175, pw = width * 0.6, ph = height - 300, best = 1e9;
  tris.forEach((t, k) => { let d = Math.hypot(mouseX - (px + (t.b / HI) * pw), mouseY - (py + ph - t.h * ph)); if (d < best && d < 60) { best = d; sel = k; } });
  mouseDragged();
}
function mouseDragged() {
  let px = 40, py = 175, pw = width * 0.6, ph = height - 300;
  if (mouseX < px || mouseX > px + pw || mouseY < py - 20 || mouseY > py + ph + 20) return;
  moveTo(LO + ((mouseX - px) / pw) * (HI - LO), (py + ph - mouseY) / ph);
}
// 頂点 b を x へ（三角の幅はそのまま）、高さ h を y に
function moveTo(x, y) {
  let t = tris[sel], wl = t.b - t.a, wr = t.c - t.b;
  t.b = clampv(x, LO, HI); t.a = t.b - wl; t.c = t.b + wr; t.h = clampv(y, 0.05, 1);
}
function keyPressed() {
  let t = tris[sel];
  if (key === '1') sel = 0;
  if (key === '2') sel = 1;
  if (key === LEFT_ARROW) moveTo(t.b - 0.1, t.h);
  if (key === RIGHT_ARROW) moveTo(t.b + 0.1, t.h);
  if (key === UP_ARROW) moveTo(t.b, t.h + 0.05);
  if (key === DOWN_ARROW) moveTo(t.b, t.h - 0.05);
  if (key === 'c' || key === 'C') scaled = !scaled;
  if (key === 'r' || key === 'R') resetShapes();
}

// ---- 自己テスト：閉じた式（手で計算できる値）と比べる
function selfTest() {
  selfTestResults = [];
  let grid = (f) => { let xs = [], ys = []; for (let i = 0; i <= 1000; i++) { xs.push(i / 100); ys.push(f(i / 100)); } return { xs, ys }; };
  let g1 = grid((x) => Math.min(0.6, trimf(x, 2, 5, 8))), d1 = defuzzAll(g1.xs, g1.ys);
  check('左右対称の三角 (2, 5, 8) を 0.6 で切る → 重心 = 二等分 = MOM = 5、SOM = 3.8、LOM = 6.2',
    near(d1.cog, 5, 1e-9) && near(d1.bis, 5, 1e-9) && near(d1.mom, 5, 1e-9) && near(d1.som, 3.8, 1e-9) && near(d1.lom, 6.2, 1e-9));
  let g2 = grid((x) => trimf(x, 0, 2, 10)), d2 = defuzzAll(g2.xs, g2.ys);
  check('三角 (0, 2, 10) の重心 = (0 + 2 + 10) / 3 = 4', near(d2.cog, 4, 1e-9));
  check('三角 (0, 2, 10) の面積二等分 = 10 − √40 = 3.675（右側の面積 (10−x)²/16 = 2.5）', near(d2.bis, 10 - Math.sqrt(40), 1e-6));
  check('三角 (0, 2, 10) の MOM = SOM = LOM = 頂点 2', near(d2.mom, 2) && near(d2.som, 2) && near(d2.lom, 2));
  let g3 = grid((x) => Math.min(0.5, trimf(x, 0, 2, 10))), d3 = defuzzAll(g3.xs, g3.ys);
  let P = polyCentroid([[0, 0], [1, 0.5], [6, 0.5], [10, 0]]);
  check('三角 (0, 2, 10) を 0.5 で切った台形 (0, 1, 6, 10)：重心 = 多角形の重心の公式 ' + nf(P, 1, 4), near(d3.cog, P, 1e-9));
  check('同じ台形：MOM = 3.5、SOM = 1、LOM = 6', near(d3.mom, 3.5, 1e-9) && near(d3.som, 1, 1e-9) && near(d3.lom, 6, 1e-9));
  let empty = defuzzAll(g3.xs, g3.xs.map(() => 0));
  check('全部 0（どの規則も発火しない）→ 0 で割らずに「値なし」', empty.cog === null && empty.bis === null && empty.mom === null);
  reportSelfTest();
}
// 多角形（[x, y] の列、x 軸の上）の重心の x 座標：靴ひもの公式
function polyCentroid(P) {
  let A = 0, Cx = 0;
  for (let i = 0; i < P.length; i++) {
    let [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], cr = x0 * y1 - x1 * y0;
    A += cr; Cx += (x0 + x1) * cr;
  }
  return Cx / (3 * A);
}

// ---------- やってみよう ----------
// 1. 2 つの山の高さを同じにすると、MOM はどこへとぶ？ 重心は？
// 2. 片方の山を左右にゆっくり動かして、5 つの値がなめらかに動くか見る
// 3. C で「縮める」にすると、平らな部分がなくなる → SOM = MOM = LOM になる
// 4. 山を離して置くと、重心が「どちらの山でもない谷」に来ることがある。これは良い？
// 5. N を 101 に減らすと、重心の値はどれくらい変わる？


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
// 面積二等分：左右の面積が等しくなる x
function bisector(xs, ys) {
  let A = areaOf(xs, ys); if (A <= 1e-12) return null;
  let acc = 0;
  for (let i = 0; i + 1 < xs.length; i++) {
    let h = xs[i + 1] - xs[i], y0 = ys[i], y1 = ys[i + 1], a = (h * (y0 + y1)) / 2;
    if (acc + a >= A / 2) {
      let need = A / 2 - acc, k = (y1 - y0) / h, t;   // y0 t + k t²/2 = need を解く
      if (Math.abs(k) < 1e-12) t = y0 > 0 ? need / y0 : 0;
      else t = (-y0 + Math.sqrt(Math.max(0, y0 * y0 + 2 * k * need))) / k;
      return xs[i] + clampv(t, 0, h);
    }
    acc += a;
  }
  return xs[xs.length - 1];
}
// 最大値の点たち：平均（MOM）・いちばん左（SOM）・いちばん右（LOM）
function maxima(xs, ys) {
  let m = 0; for (let y of ys) m = Math.max(m, y);
  if (m <= 1e-12) return null;
  let s = 0, n = 0, lo = null, hi = null;
  for (let i = 0; i < xs.length; i++) if (ys[i] >= m - 1e-9) { s += xs[i]; n++; if (lo === null) lo = xs[i]; hi = xs[i]; }
  return { mom: s / n, som: lo, lom: hi, height: m };
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
