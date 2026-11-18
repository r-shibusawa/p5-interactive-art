// ============================================
// 06 ブラックボックス
// 中身の見えない箱に入力 u を入れ、出てくる出力 y を記録する。記録だけから箱の「式」を当てる（システム同定）
// モデル（ARX）：y[k] = a₁y[k−1] + a₂y[k−2] + b₁u[k−1] + … + b₅u[k−5]。次数を小さい順に試し、係数は最小二乗法で。R で答え合わせ
// 左の帯でマウス上下 = 入力 u / A = 自動の入力（ランダムな高さの階段） / R = 正体を見る / N = 新しい箱 / C = 記録を消す / W = 雑音
// ============================================

const NA = 2, NB = 5;      // ★ モデルの次数：過去の出力 2 つ、過去の入力 5 つ
const MAXREC = 400;        // 記録する点の数
const KINDS = ['1 次遅れ', '2 次（ゆれる）', 'むだ時間', '非線形'];
let hidden, rec, autoIn = true, reveal = false, noiseOn = false, uNow = 0, rng, fit = null, boxN = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  rng = makeRng(2024);
  newBox();
}
// ---- 箱の中身（4 種類のどれか）。θ = その箱を ARX で書いたときの本当の係数 [a1, a2, b1…b5]
function makeBox(kind) {
  if (kind === 0) return { kind, f: (y, u) => 0.9 * y[1] + 0.2 * u[1], theta: [0.9, 0, 0.2, 0, 0, 0, 0] };
  if (kind === 1) return { kind, f: (y, u) => 1.6 * y[1] - 0.81 * y[2] + 0.25 * u[1], theta: [1.6, -0.81, 0.25, 0, 0, 0, 0] };
  if (kind === 2) return { kind, f: (y, u) => 0.8 * y[1] + 0.3 * u[4], theta: [0.8, 0, 0, 0, 0, 0.3, 0] };
  return { kind, f: (y, u) => 0.85 * y[1] + 0.3 * Math.tanh(3 * u[1]), theta: null };
}
function newBox() { boxN++; hidden = makeBox(Math.floor(rng() * 4)); clearRec(); reveal = false; }
function clearRec() { rec = { u: [], y: [] }; fit = null; }
// 箱を 1 きざみ動かす：過去の値を並べた配列 hy[i] = y[k−i]、hu[i] = u[k−i]
function boxStep(b, U, Y, uNew, noise) {
  U.push(uNew);
  let k = U.length - 1, hy = [], hu = [];
  for (let i = 0; i <= 5; i++) { hy.push(k - i >= 0 && k - i < Y.length ? Y[k - i] : 0); hu.push(k - i >= 0 ? U[k - i] : 0); }
  let y = b.f(hy, hu) + noise;
  Y.push(clampv(fin(y, 0), -50, 50));
}
// ---- 同定：記録から行（説明変数）を作って最小二乗。次数 (na, nb) は小さい順に試す
// （1 次遅れの箱に 2 次のモデルを使うと、y[k−1] が y[k−2] と u[k−2] で書けてしまい式が 1 つに決まらない）
function arxRows(U, Y, na, nb) {
  let X = [], t = [];
  for (let k = Math.max(NA, NB); k < Y.length; k++) {
    let r = []; for (let i = 1; i <= na; i++) r.push(Y[k - i]); for (let i = 1; i <= nb; i++) r.push(U[k - i]);
    X.push(r); t.push(Y[k]);
  }
  return { X, t };
}
function fitOrder(U, Y, na, nb) {
  let { X, t } = arxRows(U, Y, na, nb);
  if (X.length < 20) return null;
  let c = lsqFit(X, t); if (!c) return null;
  let res = 0, sy = 0, my = t.reduce((a, b) => a + b, 0) / t.length;
  X.forEach((r, i) => { let p = r.reduce((s, v, j) => s + v * c[j], 0); res += (t[i] - p) ** 2; sy += (t[i] - my) ** 2; });
  let th = new Array(NA + NB).fill(0);                     // 7 個の並びにそろえる（使わない係数は 0）
  for (let i = 0; i < na; i++) th[i] = c[i];
  for (let i = 0; i < nb; i++) th[NA + i] = c[na + i];
  return { th, na, nb, n: t.length, rms: Math.sqrt(res / t.length), ys: Math.sqrt(sy / t.length), fitPct: sy > 0 ? 100 * (1 - Math.sqrt(res / sy)) : 0 };
}
function identify(U, Y) {
  let cands = [];
  for (let na = 1; na <= NA; na++) for (let nb = 1; nb <= NB; nb++) { let f = fitOrder(U, Y, na, nb); if (f) cands.push(f); }
  if (!cands.length) return null;
  cands.sort((a, b) => a.na + a.nb - (b.na + b.nb));
  let exact = cands.find((f) => f.rms <= 1e-9 * Math.max(f.ys, 1e-12));   // 誤差がほぼ 0 になる一番小さいモデル
  if (exact) return exact;
  let aic = (f) => f.n * Math.log(f.rms * f.rms + 1e-300) + 2 * (f.na + f.nb);   // なければ AIC が最小のもの
  return cands.reduce((m, f) => (aic(f) < aic(m) ? f : m));
}
// モデルだけで動かした出力（入力は記録と同じ）
function simulateModel(th, U) {
  let Y = [];
  for (let k = 0; k < U.length; k++) { let y = 0; for (let i = 1; i <= NA; i++) y += th[i - 1] * (k - i >= 0 ? Y[k - i] : 0); for (let i = 1; i <= NB; i++) y += th[NA + i - 1] * (k - i >= 0 ? U[k - i] : 0); Y.push(clampv(fin(y, 0), -50, 50)); }
  return Y;
}

function draw() {
  background(24, 35, 10);
  let sx = 30, sy = 110, sw = 60, sh = height - 200;
  if (frameCount % 2 === 0) {
    if (autoIn) { if (rng() < 0.15) uNow = 2 * rng() - 1; }
    else if (mouseX > sx - 20 && mouseX < sx + sw + 20 && mouseY > sy && mouseY < sy + sh) uNow = clampv(1 - (2 * (mouseY - sy)) / sh, -1, 1);
    boxStep(hidden, rec.u, rec.y, uNow, noiseOn ? 0.02 * (2 * rng() - 1) : 0);
    if (rec.u.length > MAXREC) { rec.u.shift(); rec.y.shift(); }
    if (frameCount % 10 === 0) fit = identify(rec.u, rec.y);
  }

  say('ブラックボックス ─ 入力と出力の記録だけから、中の式を当てる（箱 #' + boxN + '）', 20, 36, 20);
  say('左の帯でマウス上下 = 入力　A 自動入力 ' + (autoIn ? 'ON' : 'OFF') + '　R 正体を' + (reveal ? '隠す' : '見る') + '　N 新しい箱　C 記録を消す　W 雑音 ' + (noiseOn ? 'ON' : 'OFF'), 20, 62, 15, C_SUB);

  // ---- 入力の帯
  noStroke(); fill(28, 30, 18); rect(sx, sy, sw, sh, 8);
  fill(col(C_TUBE)); let uy = sy + ((1 - uNow) / 2) * sh; rect(sx, uy - 6, sw, 12, 4);
  say('u = ' + uNow.toFixed(2), sx - 6, sy + sh + 24, 14, C_TUBE);
  // ---- 箱
  let bx = sx + sw + 50, by = sy, bw = 200, bh = 120;
  stroke(col(C_BRASS)); strokeWeight(3); fill(reveal ? color(30, 30, 22) : color(0, 0, 4)); rect(bx, by, bw, bh, 12);
  noStroke(); fill(col(reveal ? C_TXT : C_SUB)); textAlign(CENTER, CENTER); textSize(reveal ? 18 : 40);
  text(reveal ? KINDS[hidden.kind] : '?', bx + bw / 2, by + bh / 2); textAlign(LEFT, BASELINE);
  flowArrow(sx + sw, uy, bx, by + bh / 2, C_TUBE, (frameCount / 60) % 1, 'u');
  flowArrow(bx + bw, by + bh / 2, bx + bw + 50, by + bh / 2, C_SCOPE, (frameCount / 60) % 1, 'y');

  // ---- 記録と、モデルだけで動かした出力
  let gx = bx, gy = by + bh + 40, gw = width * 0.55 - gx, gh = (height - gy - 60) / 2 - 10;
  plotFrame(gx, gy, gw, gh, '入力 u（±1）');
  plotLine(rec.u, gx, gy, gw, gh, -1.2, 1.2, C_TUBE, MAXREC, 1.5);
  let gy2 = gy + gh + 20, ymax = Math.max(1, ...rec.y.map(Math.abs)) * 1.1;
  plotFrame(gx, gy2, gw, gh, '出力 y（緑）とモデルの予想（オレンジ：入力だけからモデルで計算）');
  plotLine(rec.y, gx, gy2, gw, gh, -ymax, ymax, C_SCOPE, MAXREC, 2);
  if (fit) plotLine(simulateModel(fit.th, rec.u), gx, gy2, gw, gh, -ymax, ymax, C_TUBE, MAXREC, 1.5);

  // ---- 推定した係数
  let tx = width * 0.58, ty = 110;
  say('記録 ' + rec.y.length + ' 点から最小二乗で求めた係数' + (fit ? '（選んだ次数 na = ' + fit.na + '、nb = ' + fit.nb + '）' : ''), tx, ty, 17);
  if (!fit) say('入力が足りない：もっと動かすか A で自動入力（同じ入力ばかりだと式が決まらない）', tx, ty + 30, 15, C_ALARM);
  else {
    let names = ['a₁', 'a₂', 'b₁', 'b₂', 'b₃', 'b₄', 'b₅'];
    say('係数　　推定　　　' + (reveal ? '本当' : '（R で本当の値）'), tx, ty + 34, 15, C_SUB);
    names.forEach((n, i) => {
      let tr = reveal && hidden.theta ? hidden.theta[i] : null;
      say(n + '　' + (fit.th[i] >= 0 ? ' ' : '') + fit.th[i].toFixed(6) + (tr !== null ? '　　' + (tr >= 0 ? ' ' : '') + tr.toFixed(6) + '　差 ' + Math.abs(fit.th[i] - tr).toExponential(1) : ''), tx, ty + 60 + i * 24, 15, Math.abs(fit.th[i]) > 0.02 ? C_TUBE : C_SUB);
    });
    say('1 歩先の誤差 RMS = ' + fit.rms.toExponential(2) + '　あてはまり ' + fit.fitPct.toFixed(2) + '%', tx, ty + 240, 15, C_SCOPE);
    if (reveal && !hidden.theta) say('非線形の箱は ARX（線形）では書けない → 誤差が 0 にならない', tx, ty + 266, 15, C_ALARM);
    if (reveal && hidden.theta) say(noiseOn ? '雑音があると推定は少しずれる' : '雑音なし・中身がモデルの形 → ほぼぴったり当たる', tx, ty + 266, 15, C_SCOPE);
  }
  // ---- 階段の入力への応答（ステップ応答）
  let sx2 = tx, sy2 = ty + 300, sw2 = width - tx - 30, sh2 = height - sy2 - 50;
  plotFrame(sx2, sy2, sw2, sh2, 'ステップ応答：u = 1 を入れ続けたら（オレンジ = モデル' + (reveal ? '、緑 = 本当' : '') + '）');
  let step = new Array(60).fill(1);
  if (reveal) { let U = [], Y = []; for (let k = 0; k < 60; k++) boxStep(hidden, U, Y, 1, 0); plotLine(Y, sx2, sy2, sw2, sh2, -0.5, 3, C_SCOPE, 60, 2.5); }
  if (fit) plotLine(simulateModel(fit.th, step), sx2, sy2, sw2, sh2, -0.5, 3, C_TUBE, 60, 1.8);
  drawSelfTest();
}

function keyPressed() {
  if (key === 'a' || key === 'A') autoIn = !autoIn;
  if (key === 'r' || key === 'R') reveal = !reveal;
  if (key === 'n' || key === 'N') newBox();
  if (key === 'c' || key === 'C') clearRec();
  if (key === 'w' || key === 'W') noiseOn = !noiseOn;
}

// ---- 自己テスト
function record(kind, n, seed, uFn) {
  let b = makeBox(kind), r = makeRng(seed), U = [], Y = [], u = 1;
  for (let k = 0; k < n; k++) { if (uFn) u = uFn(k); else if (r() < 0.3) u = 2 * r() - 1; boxStep(b, U, Y, u, 0); }
  return { b, U, Y };
}
function selfTest() {
  selfTestResults = [];
  for (let kind = 0; kind < 3; kind++) {
    let { b, U, Y } = record(kind, 200, 7 + kind), f = identify(U, Y);
    let err = f ? Math.max(...f.th.map((v, i) => Math.abs(v - b.theta[i]))) : Infinity;
    check(KINDS[kind] + '：雑音なしの 200 点から係数を誤差 ' + err.toExponential(1) + '（< 1e-6）で当てる', err < 1e-6);
  }
  let nl = record(3, 200, 11), fn = identify(nl.U, nl.Y);
  check('非線形の箱：ARX では 1 歩先の誤差が残る（RMS ' + (fn ? fn.rms.toExponential(1) : '—') + ' > 1e-3）', fn && fn.rms > 1e-3);
  let c0 = record(2, 200, 1, () => 0);
  check('入力がずっと 0（出力も 0）→ 何もわからないので null（NaN を出さない）', identify(c0.U, c0.Y) === null);
  let c1 = record(0, 200, 1, (k) => (k % 2 ? 1 : -1)), f1 = identify(c1.U, c1.Y);
  check('入力が同じ ±1 のくり返しでも、1 次遅れなら当たる（誤差 < 1e-6）', f1 && Math.max(...f1.th.map((v, i) => Math.abs(v - c1.b.theta[i]))) < 1e-6);
  let { b, U } = record(1, 100, 3), Ysim = simulateModel(b.theta, U), Yt = []; let U2 = [];
  for (let k = 0; k < U.length; k++) boxStep(b, U2, Yt, U[k], 0);
  check('本当の係数でモデルを動かすと、箱の出力と一致（差 < 1e-12）', Ysim.every((v, i) => Math.abs(v - Yt[i]) < 1e-12));
  check('2 次の箱のステップ応答の行きつく先 = 0.25 ÷ (1 − 1.6 + 0.81) = 1.1905', near(simulateModel(b.theta, new Array(600).fill(1))[599], 0.25 / 0.21, 1e-6));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. A を切って、左の帯で自分で入力を作る。ゆっくり動かすだけだと「入力が足りない」になる？ どんな入力だと当たりやすい？
// 2. 当てた係数を見て、箱の種類を予想してから R で答え合わせ。むだ時間の箱では b のどこが大きい？
// 3. W で雑音を入れると、推定はどれくらいずれる？ 記録が長いほど良くなる？
// 4. 非線形の箱で、入力を小さく（±0.2 くらい）すると、ARX のあてはまりはどうなる？
// 5. NB を 2 にすると、むだ時間の箱は当てられる？ モデルの「形」が合っていないとどうなるか


// ==================================================
// ここから下は「サイバネティクスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function fin(v, d) { return Number.isFinite(v) ? v : d; }        // NaN・Infinity なら d にもどす
// 決まった種（seed）から毎回同じ乱数列（0〜1）を出す。自己テストをいつも同じにするため
function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- 画面の道具（色は [色相, 彩度, 明るさ] の配列）
const C_TXT = [40, 12, 96], C_SUB = [35, 18, 72], C_SCOPE = [135, 70, 92], C_TUBE = [24, 85, 100], C_BRASS = [42, 55, 88], C_ALARM = [0, 80, 100];
function col(c, a) { return color(c[0], c[1], c[2], a === undefined ? 100 : a); }
function say(s, x, y, size, c) { noStroke(); fill(col(c || C_TXT)); textSize(size || 15); text(s, x, y); }
// オシロスコープ風の枠
function plotFrame(x, y, w, h, title) {
  noStroke(); fill(130, 40, 6, 90); rect(x, y, w, h, 6);
  stroke(130, 40, 40, 40); strokeWeight(1);
  for (let k = 1; k < 4; k++) line(x, y + (h * k) / 4, x + w, y + (h * k) / 4);
  noFill(); stroke(C_BRASS[0], C_BRASS[1], 60); rect(x, y, w, h, 6);
  if (title) say(title, x + 8, y + 18, 13, C_SUB);
}
// arr の値を lo〜hi の範囲で、枠 (x, y, w, h) に折れ線で描く（n = 横に並べる点の数）
function plotLine(arr, x, y, w, h, lo, hi, c, n, wt) {
  if (!arr || arr.length < 2) return;
  n = n || arr.length;
  stroke(col(c)); strokeWeight(wt || 2); noFill();
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / (n - 1)) * w, y + h - clampv((fin(arr[i], lo) - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
function hLine(v, x, y, w, h, lo, hi, c) {   // グラフの中の水平線（目標値など）
  let yy = y + h - clampv((v - lo) / (hi - lo), 0, 1) * h;
  stroke(col(c, 70)); strokeWeight(1); drawingContext.setLineDash([6, 5]); line(x, yy, x + w, yy); drawingContext.setLineDash([]);
}
// ブロック図の箱（名前と今の値）
function blockBox(x, y, w, h, name, val, c) {
  stroke(col(c || C_BRASS)); strokeWeight(2); fill(25, 40, 16); rect(x, y, w, h, 8);
  noStroke(); fill(col(C_TXT)); textAlign(CENTER, CENTER); textSize(15); text(name, x + w / 2, y + h / 2 - (val === undefined ? 0 : 10));
  if (val !== undefined) { fill(col(c || C_TUBE)); textSize(14); text(val, x + w / 2, y + h / 2 + 12); }
  textAlign(LEFT, BASELINE);
}
// 信号の矢印：点が流れて「ループを回る」ようすを見せる（phase = 0〜1）
function flowArrow(x1, y1, x2, y2, c, phase, label) {
  stroke(col(c)); strokeWeight(2); line(x1, y1, x2, y2);
  let a = Math.atan2(y2 - y1, x2 - x1);
  noStroke(); fill(col(c)); triangle(x2, y2, x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4), x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4));
  for (let k = 0; k < 3; k++) { let f = (phase + k / 3) % 1; circle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 6); }
  if (label) { fill(col(C_SUB)); textSize(13); text(label, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6); }
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return Number.isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { say(selfTestLine(), 20, height - 16, 14, selfTestResults.every((r) => r.ok) ? C_SCOPE : C_ALARM); }
// ---- 最小二乗法：行 X[k]（説明変数）と y[k] から、Σ(y − X·θ)² が最小の θ を求める（正規方程式）
function lsqFit(X, y) {
  let n = X[0].length, A = [], b = new Array(n).fill(0);
  for (let i = 0; i < n; i++) A.push(new Array(n).fill(0));
  for (let k = 0; k < X.length; k++) for (let i = 0; i < n; i++) { b[i] += X[k][i] * y[k]; for (let j = 0; j < n; j++) A[i][j] += X[k][i] * X[k][j]; }
  return solveLinear(A, b);
}
// 連立 1 次方程式 A x = b（部分ピボットのガウス消去）。解けない（情報が足りない）ときは null
function solveLinear(A0, b0) {
  let n = b0.length, A = A0.map((r) => r.slice()), b = b0.slice(), scale0 = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) scale0 = Math.max(scale0, Math.abs(A[i][j]));
  if (!(scale0 > 0)) return null;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-11 * scale0) return null;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) { let f = A[r][c] / A[c][c]; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  let x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x.every(Number.isFinite) ? x : null;
}
