// ============================================
// 10 ファジィ制御で車庫入れ（トラックのバック）
// 「車庫より少し右にいて、車の向きが真上なら、ハンドルを左にいっぱい」― 位置 x と向き φ の 5 × 7 = 35 規則でハンドル角を決める
//   車はバックで進む（自転車モデル：x' = −v cos φ、y' = −v sin φ、φ' = −v tan δ / L）を RK4 で解く
// クリック = そこから出発 / ←→ = 出発の向き / A = お手本 8 台 / ↑↓ = 速さ / C = 消す / T = 表示する車を切りかえ
// ============================================

let LW = 2.5, V = 1.0, DMAX = 35;        // ★ ホイールベース [m]、バックの速さ [m/s]、ハンドルの最大 [度]
let speedK = 3;                          // ★ 1 フレームに何回計算するか（↑↓）
let phi0 = 90;                           // ★ クリックで出発するときの向き [度]（90 = 前が上）
const XN = ['左遠', '左近', '中央', '右近', '右遠'], XC = [-10, -2, 0, 2, 10];          // ★ 位置 x [m] の集合（中心）
const PN = ['右向き', '右ななめ', '少し右', '真上', '少し左', '左ななめ', '左向き'], PC = [0, 60, 80, 90, 100, 120, 180];   // ★ 向き φ [度]
const DN = ['NB', 'NM', 'NS', 'ZE', 'PS', 'PM', 'PB'];                                // ハンドル角 δ（正 = 左にきる）
// ★ 規則の表：RULE_TAB[位置][向き] = ハンドルの番号（0 = NB … 6 = PB）
const RULE_TAB = [
  [0, 0, 0, 0, 0, 0, 6],   // 左遠
  [0, 0, 0, 0, 1, 4, 6],   // 左近
  [0, 0, 1, 3, 5, 6, 6],   // 中央
  [0, 2, 5, 6, 6, 6, 6],   // 右近
  [0, 6, 6, 6, 6, 6, 6],   // 右遠
];
const PRESETS = [[-8, 24, 0], [-6, 28, 90], [-4, 22, 150], [-2, 26, 45], [3, 24, 180], [5, 27, 90], [7, 22, 30], [8, 28, 135]];
let sys, trucks = [], sel = 0, bench, D2R = Math.PI / 180;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  let rules = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) rules.push({ ifs: [i, j], then: RULE_TAB[i][j] });
  sys = { inputs: [{ lo: -10, hi: 10, sets: triSets(XC, XN) }, { lo: 0, hi: 180, sets: triSets(PC, PN) }],
          output: { lo: -DMAX, hi: DMAX, sets: evenTri(-DMAX, DMAX, DN) }, rules, and: 'min', imp: 'min', N: 141 };
  selfTest();
  runPresets();
}

// 運動方程式（バック）：s = [x, y, φ]、δ はハンドル角 [度]
function truckDeriv(s, d) { return [-V * Math.cos(s[2]), -V * Math.sin(s[2]), (-V * Math.tan(d * D2R)) / LW]; }
// 向きを 0〜180 度に入れる（下向きは端の集合へ）
function headingDeg(s) { let p = ((s[2] / D2R) % 360 + 360) % 360; if (p > 270) p -= 360; return clampv(p, 0, 180); }
function wrapDeg(a) { return ((a / D2R) % 360 + 360) % 360; }   // 0〜360 度に
function controller(s) { return mamdani(sys, [s[0], headingDeg(s)]); }
function makeTruck(x, y, p) { return { s: [x, y, p * D2R], path: [[x, y]], d: 0, done: false, ok: false, t: 0 }; }
function advanceTruck(tr, h) {
  if (tr.done) return;
  tr.d = controller(tr.s).y;
  tr.s = rk4(truckDeriv, tr.s, tr.d, h); tr.t += h;
  if (tr.t % 0.25 < h) tr.path.push([tr.s[0], tr.s[1]]);
  if (tr.s[1] <= 0) { tr.done = true; tr.ok = Math.abs(tr.s[0]) < 0.5 && Math.abs(wrapDeg(tr.s[2]) - 90) < 5; tr.path.push([tr.s[0], tr.s[1]]); }
  if (Math.abs(tr.s[0]) > 14 || tr.s[1] > 40 || tr.t > 80) tr.done = true;
}
// 最後まで走らせる（自己テストと成績用）
function runToEnd(x, y, p) { let tr = makeTruck(x, y, p); while (!tr.done) advanceTruck(tr, 0.05); return tr; }
function runPresets() { trucks = PRESETS.map(([x, y, p]) => makeTruck(x, y, p)); sel = 0; }

function draw() {
  background(250, 18, 14);
  for (let k = 0; k < speedK; k++) for (let tr of trucks) advanceTruck(tr, 0.05);
  let sc = Math.min((width * 0.56) / 26, (height - 170) / 32), ox = 20 + 13 * sc, oy = height - 85;
  let P = (x, y) => [ox + x * sc, oy - y * sc];

  fill(0, 0, 95); noStroke(); textSize(18);
  text('クリック：そこから出発（向き ←→ ' + phi0 + '°）　A：お手本 8 台　↑↓ 速さ ×' + speedK + '　C：消す　T：表示する車', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('入力 = 位置 x と向き φ、出力 = ハンドル角 δ。重心法で 1 つの角度にして、バックで 1 歩ずつ進む', 20, 62);

  // 駐車場と車庫
  stroke(0, 0, 100, 15); strokeWeight(1);
  for (let x = -12; x <= 12; x += 2) line(...P(x, 0), ...P(x, 30));
  for (let y = 0; y <= 30; y += 2) line(...P(-12, y), ...P(12, y));
  stroke(175, 60, 80); strokeWeight(4); line(...P(-1.5, 0), ...P(-1.5, -1.5)); line(...P(1.5, 0), ...P(1.5, -1.5)); line(...P(-12, 0), ...P(-1.5, 0)); line(...P(1.5, 0), ...P(12, 0));
  noStroke(); fill(175, 60, 80); textSize(14); text('車庫（x = 0、向き 90°）', P(2, 0)[0], P(0, -1)[1]);
  // 軌跡と車
  trucks.forEach((tr, k) => {
    let col = tr.done ? (tr.ok ? color(160, 50, 90) : color(0, 70, 100)) : color(20, 45, 100);
    noFill(); stroke(hue(col), saturation(col), brightness(col), 60); strokeWeight(2);
    if (tr.path.length > 1) { beginShape(); for (let [x, y] of tr.path) vertex(...P(x, y)); vertex(...P(tr.s[0], tr.s[1])); endShape(); }
    drawTruck(P, tr, sc, k === sel ? color(20, 45, 100) : color(260, 25, 85, 80));
  });

  // 選んだ車の推論
  let tr = trucks[sel]; if (!tr) return hud();
  let r = controller(tr.s), tx = width * 0.6, ty = 100, cs = Math.min(46, (width - tx - 110) / 7.5);
  fill(0, 0, 95); textSize(16);
  text('車 ' + (sel + 1) + '：x = ' + nf(tr.s[0], 1, 2) + ' m　φ = ' + nf(headingDeg(tr.s), 1, 1) + '°　→ δ = ' + nf(r.y, 1, 1) + '°', tx, ty);
  textSize(12); fill(0, 0, 70);
  for (let j = 0; j < 7; j++) text(PN[j], tx + 64 + j * cs, ty + 26);
  for (let i = 0; i < 5; i++) {
    fill(0, 0, 70); textSize(13); text(XN[i] + ' ' + nf(r.deg[0][i], 1, 2), tx, ty + 34 + (i + 0.6) * cs);
    for (let j = 0; j < 7; j++) {
      let w = r.w[i * 7 + j], k = RULE_TAB[i][j], x = tx + 64 + j * cs, y = ty + 34 + i * cs;
      fill(k < 3 ? 190 : k > 3 ? 20 : 260, 30, 22 + 70 * w); stroke(0, 0, 100, w > 0 ? 80 : 15); rect(x, y, cs - 4, cs - 4, 4);
      noStroke(); fill(0, 0, w > 0.6 ? 10 : 92); textSize(12); text(DN[k], x + 6, y + cs * 0.45);
      if (w > 0) { textSize(10); text(nf(w, 1, 2), x + 5, y + cs * 0.8); }
    }
  }
  let yy = ty + 34 + 5 * cs + 12;
  fill(0, 0, 70); textSize(12);
  text('向きの所属度：' + PN.map((n, j) => (r.deg[1][j] > 0 ? n + ' ' + nf(r.deg[1][j], 1, 2) : '')).filter((s) => s).join('　'), tx, yy);
  // 集約した出力と重心
  let gx = tx, gy = yy + 16, gw = width - tx - 30, gh = 90;
  stroke(0, 0, 100, 20); noFill(); rect(gx, gy, gw, gh);
  fill(20, 45, 100, 40); stroke(20, 45, 100); strokeWeight(2); beginShape(); vertex(gx, gy + gh);
  r.ox.forEach((x, i) => vertex(gx + ((x + DMAX) / (2 * DMAX)) * gw, gy + gh - r.agg[i] * gh)); vertex(gx + gw, gy + gh); endShape(CLOSE);
  let xc = gx + ((r.y + DMAX) / (2 * DMAX)) * gw; stroke(175, 60, 90); strokeWeight(3); line(xc, gy - 4, xc, gy + gh + 4);
  noStroke(); fill(0, 0, 70); textSize(12); text('−35°', gx, gy + gh + 16); text('+35°', gx + gw - 30, gy + gh + 16); text('集約した δ と重心', gx + gw / 2 - 50, gy + gh + 16);
  // 成績
  let done = trucks.filter((q) => q.done), okN = done.filter((q) => q.ok).length;
  fill(0, 0, 90); textSize(15);
  text('着いた車：' + okN + ' / ' + done.length + '（走っている ' + (trucks.length - done.length) + ' 台）', tx, gy + gh + 46);
  done.slice(-4).forEach((q, k) => { fill(q.ok ? color(160, 50, 90) : color(0, 70, 100)); textSize(13); text((q.ok ? '✓' : '✗') + ' 車 ' + (trucks.indexOf(q) + 1) + '：x の誤差 ' + nf(Math.abs(q.s[0]), 1, 2) + ' m、向きの誤差 ' + nf(Math.abs(wrapDeg(q.s[2]) - 90), 1, 1) + '°、' + nf(q.t, 1, 1) + ' 秒', tx, gy + gh + 70 + k * 20); });
  fill(0, 0, 70); textSize(13);
  text('格子 ' + bench.n + ' 通りの出発点で成功 ' + bench.ok + '（' + nf((100 * bench.ok) / bench.n, 1, 0) + '%）、平均 ' + nf(bench.t, 1, 1) + ' 秒', tx, height - 44);
  hud();
}
function hud() { fill(selfTestResults.every((q) => q.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14); noStroke(); text(selfTestLine(), 20, height - 20); }
// トラック：後輪の軸が (x, y)、前へ 4 m の車体
function drawTruck(P, tr, sc, col) {
  let [x, y, f] = tr.s, c = Math.cos(f), s = Math.sin(f), pts = [[-0.8, -1], [3.6, -1], [3.6, 1], [-0.8, 1]];
  noStroke(); fill(col); beginShape();
  for (let [a, b] of pts) vertex(...P(x + a * c - b * s, y + a * s + b * c));
  endShape(CLOSE);
  let fx = x + 3 * c, fy = y + 3 * s, d = f + tr.d * D2R;              // 前輪（ハンドルの向き）
  stroke(0, 0, 15); strokeWeight(4); line(...P(fx - 0.6 * Math.cos(d), fy - 0.6 * Math.sin(d)), ...P(fx + 0.6 * Math.cos(d), fy + 0.6 * Math.sin(d)));
  noStroke(); fill(0, 0, 15); circle(...P(x, y), 6);
}

function mousePressed() {
  let sc = Math.min((width * 0.56) / 26, (height - 170) / 32), ox = 20 + 13 * sc, oy = height - 85;
  let x = (mouseX - ox) / sc, y = (oy - mouseY) / sc;
  if (x < -11 || x > 11 || y < 4 || y > 30) return;
  trucks.push(makeTruck(x, y, phi0)); sel = trucks.length - 1;
}
function keyPressed() {
  if (key === LEFT_ARROW) phi0 = (phi0 + 15) % 360;
  if (key === RIGHT_ARROW) phi0 = (phi0 + 345) % 360;
  if (key === UP_ARROW) speedK = Math.min(12, speedK + 1);
  if (key === DOWN_ARROW) speedK = Math.max(1, speedK - 1);
  if (key === 'a' || key === 'A') runPresets();
  if (key === 'c' || key === 'C') { trucks = []; sel = 0; }
  if ((key === 't' || key === 'T') && trucks.length) sel = (sel + 1) % trucks.length;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let anti = true;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) if (RULE_TAB[4 - i][6 - j] !== 6 - RULE_TAB[i][j]) anti = false;
  check('規則の表は左右対称（x と向きを鏡に映すと、ハンドルが逆）', anti);
  check('x = 0・向き 90° → (中央, 真上) だけ発火 → δ = ZE の重心 = 0', near(controller([0, 10, 90 * D2R]).y, 0, 1e-9));
  let st = runToEnd(0, 25, 90);
  check('真上から真っすぐバック → x = 0、向き 90° のまま車庫へ', st.ok && Math.abs(st.s[0]) < 1e-9);
  let h = 0.05, s = [0, 0, Math.PI / 2], w = (-V * Math.tan(20 * D2R)) / LW;
  for (let k = 0; k < 40; k++) s = rk4(truckDeriv, s, 20, h);
  let ph = Math.PI / 2 + w * 2;
  check('RK4：ハンドル 20° のまま 2 秒 → 円の式 x = −v(sin φ − sin φ₀)/ω などと一致（誤差 < 1e-6）',
    near(s[0], (-V * (Math.sin(ph) - 1)) / w, 1e-6) && near(s[1], (V * Math.cos(ph)) / w, 1e-6) && near(s[2], ph, 1e-9));
  let a = runToEnd(6, 24, 60), b = runToEnd(-6, 24, 120);
  check('鏡の出発点 (6, 24, 60°) と (−6, 24, 120°) → 着いた x が逆符号', near(a.s[0], -b.s[0], 1e-6));
  check('お手本 8 台は全部 |x| < 0.5 m・向き ±5° で車庫に入る', PRESETS.every(([x, y, p]) => runToEnd(x, y, p).ok));
  let n = 0, ok = 0, tt = 0;
  for (let x = -6; x <= 6; x += 2) for (let p = 0; p <= 180; p += 45) for (let y of [22, 28]) { let q = runToEnd(x, y, p); n++; if (q.ok) { ok++; tt += q.t; } }
  bench = { n, ok, t: tt / Math.max(1, ok) };
  check('格子 ' + n + ' 通りの出発点で 90% 以上が成功（' + ok + ' / ' + n + '）', ok >= 0.9 * n);
  check('向き 300°（前が右下）から出発 → 1 回転して 450° になっても、向きは 90° として判定', runToEnd(0, 25, 300).ok);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 車庫のすぐ上（y = 8 くらい）で、横に離れた所から出発すると？ 間に合わないのはなぜ？
// 2. 表の「中央」の行の 1（NM）と 5（PM）を 2 と 4 にすると、ハンドルがおだやかになる。成功率は？
// 3. XC の 2 と −2 を 5 と −5 にすると、車庫の近くで「まっすぐにする」力が弱くなる
// 4. LW（車の長さ）を 5 にすると、小回りがきかない。規則はそのままで大丈夫？
// 5. 向き 270°（前が下）で出発すると、端の集合（右向き・左向き）だけで回って戻ってくる


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
// 中心の列から三角 MF を作る（両端は肩）
function triSets(c, names) { return names.map((name, i) => ({ name, mf: { type: 'tri', p: [i ? c[i - 1] : c[0], c[i], i < c.length - 1 ? c[i + 1] : c[i]] } })); }

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
