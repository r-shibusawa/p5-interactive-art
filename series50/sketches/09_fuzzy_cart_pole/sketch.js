// ============================================
// 09 倒立振子のファジィ制御
// 「棒が右に倒れかけていて、右に速く倒れているなら、台車を右に強く押す」― 7 × 7 = 49 個の規則で棒を立てる
//   入力：角度 θ・角速度 ω → マムダニ推論 → 力 F。台車は運動方程式を RK4 で解いて動かす。うすい台車は PID（比べる用）
// クリック = 棒をつつく / 表のマスをクリック = 規則の出力を変える / R = やり直し / ↑↓ = はじめの角度 / P = PID 表示 / X = 中央に戻す項 / D = 表をもとに
// ============================================

let M = 1.0, m = 0.1, l = 0.5, g = 9.8;  // ★ 台車の質量、棒の質量、棒の半分の長さ（series20 と同じ式）
let Fmax = 30;                            // ★ 力の最大 [N]
let TH = 0.4, OM = 2.0;                   // ★ 角度・角速度の範囲（これより外は端の集合に 1）
let KX = 1.0, KV = 2.0, useCenter = true; // ★ 台車を中央へ戻す項 F_c = KX·x + KV·v（ファジィ規則の外）
let Kp = 40, Ki = 5, Kd = 8;              // ★ 比べる PID のゲイン（角度に対して）
let th0deg = 10;                          // ★ はじめの角度 [度]
const L7 = ['NB', 'NM', 'NS', 'ZE', 'PS', 'PM', 'PB'];   // 負で大・中・小、ゼロ、正で小・中・大
let RULE, sys, fz, pd, hist = [], showPID = true, bench, last;
const H = 1 / 240;                         // RK4 の時間きざみ（1 フレームに 4 回）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  defaultTable();
  selfTest();
  resetAll();
}
// ★ 規則の表：RULE[角度][角速度] = 力の番号。「角度 + 角速度」が大きいほど右へ強く（よく使われる形）
function defaultTable() {
  RULE = [];
  for (let i = 0; i < 7; i++) { RULE.push([]); for (let j = 0; j < 7; j++) RULE[i].push(clampv(i + j - 3, 0, 6)); }
  rebuildSystem();
}
function rebuildSystem() {
  let rules = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) rules.push({ ifs: [i, j], then: RULE[i][j] });
  sys = { inputs: [{ lo: -TH, hi: TH, sets: evenTri(-TH, TH, L7) }, { lo: -OM, hi: OM, sets: evenTri(-OM, OM, L7) }],
          output: { lo: -Fmax, hi: Fmax, sets: evenTri(-Fmax, Fmax, L7) }, rules, and: 'min', imp: 'min', N: 121 };
  bench = { fz: simulate(fuzzyCtrl(), th0deg, 10), pid: simulate(pidCtrl(), th0deg, 10) };
}

// ★ 倒立振子の運動方程式（θ = 0 が直立、右に倒れると正）
function cartPoleDeriv(s, u) {
  let [x, xd, th, thd] = s, sn = Math.sin(th), cs = Math.cos(th);
  let tmp = (u + m * l * thd * thd * sn) / (M + m);
  let thdd = (g * sn - cs * tmp) / (l * (4 / 3 - (m * cs * cs) / (M + m)));
  return [xd, tmp - (m * l * thdd * cs) / (M + m), thd, thdd];
}
// 制御器：状態 → 力
function fuzzyCtrl() {
  return (s) => { let r = mamdani(sys, [s[2], s[3]]); last = r; return clampv(r.y + centerTerm(s), -Fmax, Fmax); };
}
function pidCtrl() {
  let I = 0;
  return (s) => { I = clampv(I + s[2] * H, -2, 2); return clampv(Kp * s[2] + Ki * I + Kd * s[3] + centerTerm(s), -Fmax, Fmax); };
}
function centerTerm(s) { return useCenter ? KX * s[0] + KV * s[1] : 0; }

// 1 台分のシミュレーション（状態・制御器・成績）
function makeCart(ctrl) { return { s: [0, 0, (th0deg * Math.PI) / 180, 0], ctrl, F: 0, t: 0, t0: 0, settle: 0, maxTh: 0, over: 0, sgn: 1, se: 0, sf: 0, n: 0, maxX: 0, fallen: false }; }
function advance(c) {
  if (c.fallen) return;
  c.F = c.ctrl(c.s);
  c.s = rk4(cartPoleDeriv, c.s, c.F, H);
  c.s[0] = clampv(c.s[0], -4, 4); c.s[1] = clampv(c.s[1], -30, 30); c.s[3] = clampv(c.s[3], -40, 40);
  c.t += H; let a = Math.abs(c.s[2]);
  if (a > 0.0349) c.settle = c.t - c.t0;          // 2° を超えていた最後の時刻 = 整定時間
  c.over = Math.max(c.over, -c.sgn * c.s[2]);   // 行きすぎ：反対側へ倒れた最大の角度
  c.maxTh = Math.max(c.maxTh, a); c.maxX = Math.max(c.maxX, Math.abs(c.s[0]));
  c.se += c.s[2] * c.s[2]; c.sf += c.F * c.F; c.n++;
  if (a > 1.2) c.fallen = true;
}
// ベンチマーク：はじめの角度 deg から T 秒（HUD と自己テストで同じ関数を使う）
function simulate(ctrl, deg, T) {
  let c = makeCart(ctrl); c.s[2] = (deg * Math.PI) / 180; c.sgn = Math.sign(deg) || 1;
  while (c.t < T && !c.fallen) advance(c);
  return { fallen: c.fallen, settle: c.settle, maxTh: c.maxTh, over: c.over, rmsTh: Math.sqrt(c.se / c.n), rmsF: Math.sqrt(c.sf / c.n), x: c.s[0], maxX: c.maxX };
}
function resetAll() { fz = makeCart(fuzzyCtrl()); pd = makeCart(pidCtrl()); hist = []; }

function draw() {
  background(250, 18, 14);
  for (let k = 0; k < 4; k++) { advance(fz); if (showPID) advance(pd); }
  let r = mamdani(sys, [fz.s[2], fz.s[3]]);
  hist.push([fz.s[2], pd.s[2]]); if (hist.length > 600) hist.shift();

  fill(0, 0, 95); noStroke(); textSize(18);
  text('クリック：つつく　表のマス：規則を変える　R：やり直し　↑↓ はじめ ' + th0deg + '°　P：PID ' + (showPID ? 'ON' : 'off') + '　X：中央に戻す項 ' + (useCenter ? 'ON' : 'off') + '　D：表をもとに', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('F = ファジィ推論(θ, ω)' + (useCenter ? ' + ' + KX + '·x + ' + KV + '·v（中央へ戻す項）' : '') + '　オレンジ = ファジィ、うすい青 = PID', 20, 62);

  // ---- 台車と棒
  let sw = width * 0.5, railY = height * 0.42, X = (xw) => 30 + ((xw + 4) / 8) * (sw - 60), Lp = (sw - 60) / 8 * 2 * l * 1.6;
  stroke(0, 0, 50); strokeWeight(3); line(30, railY + 22, sw - 30, railY + 22);
  if (showPID) drawCart(X(pd.s[0]), railY, pd.s[2], Lp, color(190, 40, 90, 45), pd.fallen);
  drawCart(X(fz.s[0]), railY, fz.s[2], Lp, color(20, 50, 100), fz.fallen);
  stroke(140, 60, 90); strokeWeight(5); line(X(fz.s[0]), railY, X(fz.s[0]) + fz.F * 3, railY);
  noStroke(); fill(0, 0, 90); textSize(15); textAlign(CENTER);
  text('θ = ' + nf((fz.s[2] * 180) / PI, 1, 1) + '°　ω = ' + nf(fz.s[3], 1, 2) + '　F = ' + nf(fz.F, 1, 1) + ' N（推論 ' + nf(r.y, 1, 1) + '）', X(fz.s[0]), railY + 50);
  textAlign(LEFT, BASELINE);
  if (fz.fallen) { fill(0, 70, 100); textSize(28); text('倒れた！ R でやり直し（表を変えすぎ？）', 40, railY - Lp - 20); }

  // ---- 角度のグラフ
  let gx = 30, gy = railY + 80, gw = sw - 60, gh = height - gy - 60;
  stroke(0, 0, 100, 20); strokeWeight(1); noFill(); rect(gx, gy, gw, gh); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  for (let k = 0; k < 2; k++) {
    if (k === 1 && !showPID) continue;
    stroke(k ? color(190, 40, 90, 60) : color(20, 50, 100)); strokeWeight(2); noFill();
    if (hist.length > 1) { beginShape(); hist.forEach((h, i) => vertex(gx + (i / 600) * gw, gy + gh / 2 - clampv(h[k] / 0.35, -1, 1) * (gh / 2))); endShape(); }
  }
  noStroke(); fill(0, 0, 70); textSize(13); text('角度 θ（±20°）の 10 秒分', gx + 6, gy + 16);

  // ---- 規則の表（明るさ = 発火の強さ）
  let tx = width * 0.54, ty = 110, cs = Math.min(52, (height * 0.48) / 8);
  fill(0, 0, 80); textSize(14); text('規則の表：行 = 角度 θ、列 = 角速度 ω、中身 = 力 F', tx, ty - 12);
  for (let j = 0; j < 7; j++) { fill(0, 0, 70); text(L7[j], tx + (j + 1) * cs + 8, ty + cs * 0.6); }
  for (let i = 0; i < 7; i++) {
    fill(0, 0, 70); text(L7[i], tx + 6, ty + (i + 1.6) * cs);
    for (let j = 0; j < 7; j++) {
      let w = r.w[i * 7 + j], k = RULE[i][j], x = tx + (j + 1) * cs, y = ty + (i + 1) * cs;
      fill(k < 3 ? 190 : k > 3 ? 20 : 260, 25 + Math.abs(k - 3) * 15, 22 + 70 * w); stroke(0, 0, 100, w > 0 ? 80 : 15); strokeWeight(w > 0 ? 2 : 1);
      rect(x, y, cs - 4, cs - 4, 4);
      noStroke(); fill(0, 0, w > 0.6 ? 10 : 92); textSize(13); text(L7[k], x + 8, y + cs * 0.45);
      if (w > 0) { textSize(11); text(nf(w, 1, 2), x + 6, y + cs * 0.8); }
    }
  }
  // ---- 成績の表
  let my = ty + 8.4 * cs, mx = tx, cw = (width - tx - 30) / 3;
  let rows = [['', 'ファジィ', 'PID'],
    ['今：整定時間（|θ| < 2°）', nf(fz.settle, 1, 2) + ' s', nf(pd.settle, 1, 2) + ' s'],
    ['今：行きすぎ（反対側の最大）', nf((fz.over * 180) / PI, 1, 2) + '°', nf((pd.over * 180) / PI, 1, 2) + '°'],
    ['今：台車の最大 |x|', nf(fz.maxX, 1, 2) + ' m', nf(pd.maxX, 1, 2) + ' m'],
    ['基準 ' + th0deg + '° から 10 秒：整定', bench.fz.fallen ? '倒れた' : nf(bench.fz.settle, 1, 2) + ' s', bench.pid.fallen ? '倒れた' : nf(bench.pid.settle, 1, 2) + ' s'],
    ['　行きすぎ', nf((bench.fz.over * 180) / PI, 1, 2) + '°', nf((bench.pid.over * 180) / PI, 1, 2) + '°'],
    ['　角度の RMS', nf((bench.fz.rmsTh * 180) / PI, 1, 2) + '°', nf((bench.pid.rmsTh * 180) / PI, 1, 2) + '°'],
    ['　力の RMS', nf(bench.fz.rmsF, 1, 2) + ' N', nf(bench.pid.rmsF, 1, 2) + ' N'],
    ['　台車の最大 |x|', nf(bench.fz.maxX, 1, 2) + ' m', nf(bench.pid.maxX, 1, 2) + ' m']];
  rows.forEach((row, i) => row.forEach((c, k) => {
    fill(i === 0 ? color(0, 0, 70) : k === 1 ? color(20, 50, 100) : k === 2 ? color(190, 40, 90) : color(0, 0, 85));
    textSize(i === 0 ? 13 : 15); text(c, mx + (k ? cw * (k + 0.3) : 0), my + i * 24);
  }));

  fill(selfTestResults.every((q) => q.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}
function drawCart(cx, y, th, Lp, col, fallen) {
  noStroke(); fill(col); rect(cx - 34, y - 18, 68, 36, 6);
  fill(0, 0, 30); circle(cx - 20, y + 18, 14); circle(cx + 20, y + 18, 14);
  let tx = cx + Lp * Math.sin(th), ty = y - 18 - Lp * Math.cos(th);
  stroke(fallen ? color(0, 70, 100) : col); strokeWeight(7); line(cx, y - 18, tx, ty);
  noStroke(); fill(fallen ? color(0, 70, 100) : col); circle(tx, ty, 20);
}

function mousePressed() {
  let tx = width * 0.54, ty = 110, cs = Math.min(52, (height * 0.48) / 8);
  let j = Math.floor((mouseX - tx) / cs) - 1, i = Math.floor((mouseY - ty) / cs) - 1;
  if (i >= 0 && i < 7 && j >= 0 && j < 7) { RULE[i][j] = (RULE[i][j] + 1) % 7; rebuildSystem(); return; }
  if (mouseX < width * 0.5) {                     // つつく：角速度を足す（ファジィも PID も同じだけ）
    let d = mouseX < 30 + ((fz.s[0] + 4) / 8) * (width * 0.5 - 60) ? -0.8 : 0.8;
    for (let c of [fz, pd]) { c.s[3] += d; c.t0 = c.t; c.settle = 0; c.maxTh = 0; c.maxX = 0; c.over = 0; c.sgn = Math.sign(d); }
  }
}
function keyPressed() {
  if (key === 'r' || key === 'R') resetAll();
  if (key === UP_ARROW) { th0deg = Math.min(20, th0deg + 1); rebuildSystem(); resetAll(); }
  if (key === DOWN_ARROW) { th0deg = Math.max(1, th0deg - 1); rebuildSystem(); resetAll(); }
  if (key === 'p' || key === 'P') showPID = !showPID;
  if (key === 'x' || key === 'X') { useCenter = !useCenter; rebuildSystem(); }
  if (key === 'd' || key === 'D') { defaultTable(); resetAll(); }
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let anti = true;
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if (RULE[6 - i][6 - j] !== 6 - RULE[i][j]) anti = false;
  check('規則の表は点対称（左右を入れかえると力の向きが逆）', anti);
  check('θ = 0, ω = 0 → ZE だけが発火 → F = 0', near(mamdani(sys, [0, 0]).y, 0, 1e-9));
  let r = mamdani(sys, [sys.inputs[0].sets[4].mf.p[1], 0]);
  check('θ = PS の頂点、ω = 0 → 規則 (PS, ZE) → PS だけ。F = PS の重心 = Fmax/3 = 10 N', r.w.filter((w) => w > 0).length === 1 && near(r.y, Fmax / 3, 1e-9));
  let mono = true, prev = -1e9;
  for (let t = -0.5; t <= 0.5; t += 0.02) { let y = mamdani(sys, [t, 0]).y; if (y < prev - 1e-9) mono = false; prev = y; }
  check('ω = 0 のとき、角度が大きいほど力は弱くならない（単調）', mono);
  let b = simulate(fuzzyCtrl(), 10, 10);
  check('ファジィ：10° から 10 秒間倒れず、3 秒以内に |θ| < 2°、台車は |x| < 0.1 m に戻る', !b.fallen && b.settle < 3 && Math.abs(b.x) < 0.1);
  let b2 = simulate(fuzzyCtrl(), 2, 10);
  check('ファジィ：2° からでも立つ', !b2.fallen && b2.maxTh < 0.04);
  check('PID（比べる相手）も 10° から立つ', !simulate(pidCtrl(), 10, 10).fallen);
  check('力が 0 なら 3 秒以内に倒れる（運動方程式が正しく不安定）', simulate(() => 0, 10, 3).fallen);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 表のまん中（ZE, ZE）を PB にすると何が起きる？ D でもとに戻せる
// 2. X で「中央に戻す項」を切ると、棒は立つが台車はどこへ行く？
// 3. ↑↓ ではじめの角度を大きくすると、どこから倒れる？ ファジィと PID で比べる
// 4. TH（角度の範囲）を 0.2 にすると、少しの傾きで強く押す制御器になる。成績の表はどう変わる？
// 5. 右の列（ω が PB）を全部 ZE にすると、ブレーキ（角速度の項）がなくなる


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
// mf = { type: 'tri', p: [a, b, c] } のような形
function evalMF(mf, x) { let p = mf.p; return mf.type === 'tri' ? trimf(x, p[0], p[1], p[2]) : 0; }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---- 非ファジィ化：重心 = ∫x μ dx ÷ ∫μ dx（折れ線の区間ごとに正確に積分）。どの規則も発火しなければ null
function centroid(xs, ys) {
  let A = 0, M = 0;
  for (let i = 0; i + 1 < xs.length; i++) {
    let h = xs[i + 1] - xs[i], y0 = ys[i], y1 = ys[i + 1];
    A += (h * (y0 + y1)) / 2;
    M += (h * (xs[i] * (2 * y0 + y1) + xs[i + 1] * (y0 + 2 * y1))) / 6;
  }
  return A > 1e-12 ? M / A : null;
}

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

// ---- 4 次のルンゲ＝クッタ法（f(s, u) = ds/dt）
function rk4(f, s, u, h) {
  let k1 = f(s, u), k2 = f(s.map((v, i) => v + (h / 2) * k1[i]), u);
  let k3 = f(s.map((v, i) => v + (h / 2) * k2[i]), u), k4 = f(s.map((v, i) => v + h * k3[i]), u);
  return s.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
