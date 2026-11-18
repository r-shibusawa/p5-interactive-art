// ============================================
// 03 予測して狙う
// 弾が届くまでに標的は動いてしまう。だから「過去の位置」から「未来の位置」を予測して、そこを狙う
// 過去 N 個の位置に多項式を最小二乗であてはめ、弾の飛ぶ時間だけ先を計算する（ウィーナーが戦争中に取り組んだ対空射撃の予測の発想）
// ↑↓ = 予測の次数（0〜3） / ←→ = 使う過去の点の数 N / 1 2 = 弾の速さ（先読み時間が変わる） / M = 標的をマウスで動かす / スペース = 撃つ / A = 自動で撃つ / R = 数をリセット
// ============================================

let order = 2;          // ★ 多項式の次数（0 = 平均、1 = 直線、2 = 放物線…）
let nPts = 8;           // ★ 使う過去の点の数
const TS = 0.1;         // ★ 位置を記録する間隔 [秒]
let shellV = 900;       // ★ 弾の速さ [px/s]（遅いほど先まで予測しないといけない）
const HIT_R = 26;       // 標的の半径 [px]
let game, mouseMode = false, autoFire = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  game = makeGame(width, height);
}

// ---- 予測：過去の点 (t = −N+1, …, −1, 0) に次数 p の多項式をあてはめて、t = ahead の値を出す
function fitPoly(vals, p) {
  let n = vals.length; if (n < p + 1) return null;
  let X = vals.map((v, i) => { let t = i - (n - 1), r = []; for (let k = 0; k <= p; k++) r.push(Math.pow(t, k)); return r; });
  return lsqFit(X, vals);
}
function evalPoly(c, t) { let s = 0; for (let k = c.length - 1; k >= 0; k--) s = s * t + c[k]; return s; }
function predictAt(samples, p, aheadSec) {
  let cx = fitPoly(samples.map((q) => q[0]), p), cy = fitPoly(samples.map((q) => q[1]), p);
  if (!cx || !cy) return null;
  return [evalPoly(cx, aheadSec / TS), evalPoly(cy, aheadSec / TS)];
}
// 標的の自動の動き（リサジュー曲線）
function autoTarget(t, W, H) { return [W * 0.5 + W * 0.33 * Math.sin(0.45 * t), H * 0.38 + H * 0.2 * Math.sin(0.75 * t + 0.5)]; }

// ---- ゲームの状態：記録した点、飛んでいる弾、成績
function makeGame(W, H) { return { W, H, t: 0, lastS: -1, samples: [], shells: [], shots: [0, 0], hits: [0, 0], fireT: 0.5, tp: [W / 2, H / 3], aim: null }; }
function gunPos(g) { return [g.W * 0.5, g.H - 70]; }
// 狙う点：飛ぶ時間 = 距離 ÷ 弾の速さ をくり返し計算（5 回でほぼ動かなくなる）
function predictiveAim(g) {
  if (g.samples.length < nPts) return null;
  let s = g.samples.slice(-nPts), gp = gunPos(g), fly = 0, P = null, since = g.t - g.lastS;
  for (let k = 0; k < 5; k++) { P = predictAt(s, order, since + fly); if (!P) return null; fly = Math.hypot(P[0] - gp[0], P[1] - gp[1]) / shellV; }
  return P;
}
function fire(g) {
  let gp = gunPos(g), aims = [predictiveAim(g), g.tp];
  aims.forEach((a, k) => {
    if (!a) return;
    let d = Math.hypot(a[0] - gp[0], a[1] - gp[1]) || 1;
    g.shells.push({ x: gp[0], y: gp[1], vx: (shellV * (a[0] - gp[0])) / d, vy: (shellV * (a[1] - gp[1])) / d, k, hit: false }); g.shots[k]++;
  });
  g.aim = aims[0];
}
function gameStep(g, dt, tp, auto) {
  g.t += dt; g.tp = tp;
  if (g.t - g.lastS >= TS - 1e-9) { g.samples.push(tp.slice()); g.lastS = g.t; if (g.samples.length > 40) g.samples.shift(); }
  for (let s of g.shells) {
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (!s.hit && Math.hypot(s.x - tp[0], s.y - tp[1]) < HIT_R) { s.hit = true; g.hits[s.k]++; }
  }
  g.shells = g.shells.filter((s) => !s.hit && s.x > -50 && s.x < g.W + 50 && s.y > -50 && s.y < g.H + 50);
  if (auto) { g.fireT -= dt; if (g.fireT <= 0) { g.fireT = 0.6; fire(g); } }
}

function draw() {
  background(24, 35, 10);
  let tp = mouseMode ? [mouseX, mouseY] : autoTarget(game.t, width, height);
  game.W = width; game.H = height;
  for (let k = 0; k < 4; k++) gameStep(game, 1 / 240, tp, autoFire);

  say('予測して狙う ─ 過去の位置から最小二乗で未来を予測（オレンジ = 予測あり、灰色 = 今の位置を狙う）', 20, 36, 20);
  say('↑↓ 次数 ' + order + '　←→ 点の数 N = ' + nPts + '　1 2 弾の速さ ' + shellV + '　M 標的 ' + (mouseMode ? 'マウス' : '自動') + '　スペース 撃つ　A 自動射撃 ' + (autoFire ? 'ON' : 'OFF') + '　R リセット', 20, 62, 15, C_SUB);

  // 記録した点と、あてはめた曲線の先
  let s = game.samples.slice(-nPts);
  noStroke(); fill(col(C_SCOPE, 70)); for (let q of s) circle(q[0], q[1], 8);
  if (s.length >= nPts && s.length >= order + 1) {
    stroke(col(C_TUBE, 70)); strokeWeight(2); noFill(); beginShape();
    for (let a = -(nPts - 1) * TS; a <= 1.2; a += 0.05) { let P = predictAt(s, order, a); if (P) vertex(clampv(P[0], -100, width + 100), clampv(P[1], -100, height + 100)); }
    endShape();
  }
  // 標的
  noFill(); stroke(col(C_TXT)); strokeWeight(2); circle(tp[0], tp[1], HIT_R * 2); line(tp[0] - 8, tp[1], tp[0] + 8, tp[1]);
  if (game.aim) { stroke(col(C_TUBE)); line(game.aim[0] - 10, game.aim[1] - 10, game.aim[0] + 10, game.aim[1] + 10); line(game.aim[0] - 10, game.aim[1] + 10, game.aim[0] + 10, game.aim[1] - 10); }
  // 砲台と弾
  let gp = gunPos(game);
  noStroke(); fill(col(C_BRASS)); rect(gp[0] - 30, gp[1], 60, 30, 6);
  for (let sh of game.shells) { fill(sh.k ? color(0, 0, 70) : col(C_TUBE)); circle(sh.x, sh.y, sh.k ? 8 : 10); }

  // 成績
  let hx = 20, hy = height - 150;
  let rate = (k) => (game.shots[k] ? ((100 * game.hits[k]) / game.shots[k]).toFixed(1) + '%' : '—');
  say('予測あり（次数 ' + order + '、N = ' + nPts + '）：' + game.hits[0] + ' / ' + game.shots[0] + ' 命中 = ' + rate(0), hx, hy, 17, C_TUBE);
  say('今の位置を狙う：' + game.hits[1] + ' / ' + game.shots[1] + ' 命中 = ' + rate(1), hx, hy + 26, 17, [0, 0, 75]);
  let P = predictiveAim(game);
  say(P ? '狙う点 = (' + P[0].toFixed(0) + ', ' + P[1].toFixed(0) + ')　弾が届くまで ' + (Math.hypot(P[0] - gp[0], P[1] - gp[1]) / shellV).toFixed(2) + ' 秒' : '点が足りない（N 個たまるまで待つ）', hx, hy + 52, 15);
  if (s.length >= order + 1) {
    let cx = fitPoly(s.map((q) => q[0]), order);
    if (cx) say('x(t) ≈ ' + cx.map((c, k) => c.toFixed(1) + (k ? ' t' + (k > 1 ? '^' + k : '') : '')).join(' + ') + '（t = 記録の番号、今が 0）', hx, hy + 78, 14, C_SUB);
  }
  drawSelfTest();
}

function keyPressed() {
  if (key === UP_ARROW) order = Math.min(3, order + 1);
  if (key === DOWN_ARROW) order = Math.max(0, order - 1);
  if (key === RIGHT_ARROW) nPts = Math.min(20, nPts + 1);
  if (key === LEFT_ARROW) nPts = Math.max(order + 1, nPts - 1);
  nPts = Math.max(nPts, order + 1);
  if (key === '1') shellV = Math.max(300, shellV - 100);
  if (key === '2') shellV = Math.min(1500, shellV + 100);
  if (key === 'm' || key === 'M') mouseMode = !mouseMode;
  if (key === 'a' || key === 'A') autoFire = !autoFire;
  if (key === ' ') fire(game);
  if (key === 'r' || key === 'R') { game.shots = [0, 0]; game.hits = [0, 0]; }
}
function mousePressed() { fire(game); }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let line5 = [0, 1, 2, 3, 4].map((i) => 3 + 2 * (i - 4));          // x = 3 + 2t（t = −4…0）
  check('次数 1：直線 x = 3 + 2t を t = 5 で 13 と正確に先読み', near(evalPoly(fitPoly(line5, 1), 5), 13, 1e-9));
  let quad = [0, 1, 2, 3, 4, 5].map((i) => { let t = i - 5; return 1 - t + 0.5 * t * t; });
  let q2 = fitPoly(quad, 2), q1 = fitPoly(quad, 1);
  check('次数 2：放物線 1 − t + t²/2 を t = 4 で 5 と正確に', near(evalPoly(q2, 4), 5, 1e-9));
  check('次数 1 で放物線を先読みすると外れる（誤差 ' + Math.abs(evalPoly(q1, 4) - 5).toFixed(2) + '）', Math.abs(evalPoly(q1, 4) - 5) > 1);
  check('次数 0 の予測 = 点の平均', near(evalPoly(fitPoly([2, 4, 9], 0), 7), 5, 1e-12));
  check('点が足りない（3 点に 3 次）→ null（NaN を出さない）', fitPoly([1, 2, 3], 3) === null);
  let g = makeGame(1280, 800), saveO = order, saveN = nPts, saveV = shellV; order = 2; nPts = 8; shellV = 900;
  for (let k = 0; k < 240 * 40; k++) gameStep(g, 1 / 240, autoTarget(g.t, 1280, 800), true);
  order = saveO; nPts = saveN; shellV = saveV;
  let r0 = g.hits[0] / g.shots[0], r1 = g.hits[1] / g.shots[1];
  check('自動の標的を 40 秒撃つ：予測あり ' + (100 * r0).toFixed(0) + '% > 今を狙う ' + (100 * r1).toFixed(0) + '%、予測は 80% 以上', r0 > r1 && r0 >= 0.8);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↓ で次数 0（平均）・1（直線）・2（放物線）と変え、命中率を比べよう
// 2. ←→ で N を変える。少なすぎ／多すぎると何が困る？（曲がり方が変わると古い点がじゃまになる）
// 3. M でマウスで標的を動かし、急に向きを変えてみよう。予測は人の「気まぐれ」を読めるか？
// 4. 1 で弾を遅くすると（先読み時間が長くなる）、命中率はどうなる？ 予測する時間が長いほど外れやすい理由は？
// 5. 標的が「予測されている」と知っていたら、どう動けばよいか考えよう（12 の「互いを観察する系」へ）


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
