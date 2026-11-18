// ============================================
// 03 熱容量と相変化 ─ 氷を一定の熱で温めると、0 °C と 100 °C で温度が止まる（潜熱）
// 加えた熱 Q を「エンタルピー」として積み上げ、qHeat から温度と状態（氷・水・水蒸気の割合）を計算する
// 右：2 つのものを混ぜたときの平衡温度。熱の合計が変わらない（熱量保存）温度を二分法で求める
// ↑↓ ヒーターの強さ / スペース 加熱開始・停止 / R 最初から / 1〜4 混ぜる側の値を選ぶ → ← → で変更 / 5 B の物質（水・鉄）
// ============================================

const MASS = 1;                        // ★ 温める H₂O の質量 [kg]
const T_START = -30;                   // ★ はじめの氷の温度 [°C]
const C_ICE = 2100, C_WATER = 4186, C_STEAM = 2010, C_IRON = 450;   // ★ 比熱 [J/(kg·K)]
const L_F = 334000, L_V = 2257000;     // ★ 融解熱・蒸発熱 [J/kg]
const SPEED = 4;                       // ★ 1 コマで進む時間 [秒]
let power = 2000, qHeat = 0, simT = 0, running = false, trace = [];
let mixA = { m: 1, t: 80 }, mixB = { m: 1, t: 20, mat: 'water' }, sel = 1;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); }

// 1 kg あたりのエンタルピー h(T)（−30 °C の氷 = 0 ではなく、0 °C の氷 = 0 を基準）と、その逆
function hWater(t, phase) {            // phase：'ice' 'water' 'steam'
  if (phase === 'ice') return C_ICE * t;
  if (phase === 'water') return L_F + C_WATER * t;
  return L_F + C_WATER * 100 + L_V + C_STEAM * (t - 100);
}
function stateOf(h) {                  // h → 温度と、とけた割合・蒸発した割合
  if (h < 0) return { t: h / C_ICE, melt: 0, vapor: 0 };
  if (h < L_F) return { t: 0, melt: h / L_F, vapor: 0 };
  let h1 = L_F + C_WATER * 100;
  if (h < h1) return { t: (h - L_F) / C_WATER, melt: 1, vapor: 0 };
  if (h < h1 + L_V) return { t: 100, melt: 1, vapor: (h - h1) / L_V };
  return { t: 100 + (h - h1 - L_V) / C_STEAM, melt: 1, vapor: 1 };
}
function hOfT(t) { return t < 0 ? hWater(t, 'ice') : t <= 100 ? hWater(t, 'water') : hWater(t, 'steam'); }   // 相変化の途中でない状態
// 混ぜる：物質ごとの h(T) を足した「全体の熱」が変わらない温度を二分法で求める
function hMat(mat, t) { return mat === 'iron' ? C_IRON * t : hOfT(Math.min(t, 100)); }
function mixEquilibrium(A, B) {
  let H = A.m * hMat('water', A.t) + B.m * hMat(B.mat, B.t), lo = -60, hi = 300;
  for (let k = 0; k < 80; k++) { let mid = (lo + hi) / 2; if (A.m * hMat('water', mid) + B.m * hMat(B.mat, mid) < H) lo = mid; else hi = mid; }
  let t = (lo + hi) / 2;
  if (Math.abs(t) < 1e-6) {           // ちょうど 0 °C：氷と水がまざった状態（とけた割合を計算）
    return { t: 0, melt: clampv(H / (A.m * L_F + (B.mat === 'water' ? B.m * L_F : 0)), 0, 1), H };
  }
  return { t, melt: t > 0 ? 1 : 0, H };
}

function draw() {
  background(26, 24, 28);
  let h0 = hWater(T_START, 'ice');
  if (running) { for (let k = 0; k < 10; k++) { qHeat += (power * SPEED) / 10; simT += SPEED / 10; } }   // 加えた熱 Q = P·t
  qHeat = Math.min(qHeat, MASS * (hWater(140, 'steam') - h0));
  let s = stateOf(h0 + qHeat / MASS);
  if (running && frameCount % 2 === 0) trace.push([qHeat, s.t]);

  // ---- ビーカーの絵
  let bx = 40, by = 150, bw = 230, bh = 300;
  noFill(); stroke(200); strokeWeight(3); line(bx, by, bx, by + bh); line(bx, by + bh, bx + bw, by + bh); line(bx + bw, by, bx + bw, by + bh);
  noStroke();
  let liquid = (1 - s.vapor) * s.melt, iceFrac = 1 - s.melt, level = bh * 0.55 * (liquid + iceFrac * 0.4);
  fill(70, 140, 230, 180); rect(bx + 3, by + bh - level, bw - 6, level);
  fill(220, 240, 255, 230);
  let nIce = Math.round(9 * iceFrac); for (let k = 0; k < nIce; k++) rect(bx + 20 + (k % 3) * 66, by + bh - 50 - Math.floor(k / 3) * 46, 50 * Math.sqrt(iceFrac) + 6, 40 * Math.sqrt(iceFrac) + 4, 6);
  if (s.t >= 100 && s.vapor < 1) { fill(255, 255, 255, 160); for (let k = 0; k < 12; k++) circle(bx + 20 + ((k * 37 + frameCount * 3) % (bw - 40)), by + bh - ((k * 53 + frameCount * 2) % Math.max(10, level)), 7); }
  if (s.vapor > 0) { fill(230, 230, 240, 70 * s.vapor + 20); for (let k = 0; k < 6; k++) ellipse(bx + 40 + k * 32, by - 30 - 20 * Math.sin(frameCount * 0.05 + k), 50, 30); }
  fill(255, 120, 40, running ? 230 : 90); rect(bx - 10, by + bh + 8, bw + 20, 16, 4);

  // ---- グラフ：温度と加えた熱
  let Qmax = MASS * (hWater(140, 'steam') - h0) / 1000;
  let g = { x: bx + bw + 90, y: 130, w: width * 0.36, h: height - 300, x0: 0, x1: Qmax, y0: -40, y1: 150 };
  plotAxes(g, '加えた熱 Q [kJ]', '温度 [°C]', [0, 500, 1000, 1500, 2000, 2500, 3000], [-40, 0, 50, 100, 150]);
  stroke(255, 255, 255, 50); strokeWeight(2);
  polyline(Array.from({ length: 301 }, (_, k) => { let q = (k / 300) * Qmax * 1000; return [gX(g, q / 1000), gY(g, stateOf(h0 + q / MASS).t)]; }));
  stroke(255, 150, 70); strokeWeight(3); polyline(trace.map((p) => [gX(g, p[0] / 1000), gY(g, p[1])]));
  noStroke(); fill(255, 210, 120); circle(gX(g, qHeat / 1000), gY(g, s.t), 10);
  fill(170); textSize(13);
  text('融解 ' + ((MASS * L_F) / 1000).toFixed(0) + ' kJ', gX(g, (MASS * (0 - h0)) / 1000) + 4, gY(g, 0) - 8);
  text('蒸発 ' + ((MASS * L_V) / 1000).toFixed(0) + ' kJ', gX(g, (MASS * (hWater(100, 'water') - h0)) / 1000) + 4, gY(g, 100) - 8);

  // ---- 混ぜる計算
  let mx = g.x + g.w + 60, my = 150, eq = mixEquilibrium(mixA, mixB);
  fill(240); textSize(17); text('混ぜると何 °C？（熱量保存）', mx, my - 20);
  let items = [['1 A：水の温度', mixA.t.toFixed(0) + ' °C'], ['2 A：水の質量', mixA.m.toFixed(2) + ' kg'], ['3 B：' + (mixB.mat === 'iron' ? '鉄' : mixB.t < 0 ? '氷' : '水') + 'の温度', mixB.t.toFixed(0) + ' °C'], ['4 B：質量', mixB.m.toFixed(2) + ' kg']];
  textSize(15);
  for (let k = 0; k < 4; k++) { fill(sel === k + 1 ? color(255, 210, 120) : 190); text(items[k][0] + '　' + items[k][1], mx, my + 14 + k * 26); }
  fill(190); text('5 B の物質：' + (mixB.mat === 'iron' ? '鉄（c = 450）' : '水 / 氷'), mx, my + 118);
  fill(255, 180, 100); textSize(22); text('平衡温度 ' + eq.t.toFixed(2) + ' °C' + (eq.t === 0 ? '（とけた割合 ' + (eq.melt * 100).toFixed(0) + '%）' : ''), mx, my + 160);
  let lostA = mixA.m * (hMat('water', mixA.t) - hMat('water', eq.t)), gainB = mixB.m * (hMat(mixB.mat, eq.t) - hMat(mixB.mat, mixB.t));
  if (eq.t === 0) { lostA = mixA.m * hMat('water', mixA.t) - mixA.m * L_F * eq.melt; gainB = -lostA; }
  fill(190); textSize(14); text('A が出した熱 ' + (lostA / 1000).toFixed(2) + ' kJ ＝ B がもらった熱 ' + (gainB / 1000).toFixed(2) + ' kJ', mx, my + 190);
  let wA = 200 * clampv(Math.abs(lostA) / 400000, 0, 1); fill(255, 120, 60); rect(mx, my + 205, wA, 14); fill(90, 160, 255); rect(mx, my + 225, 200 * clampv(Math.abs(gainB) / 400000, 0, 1), 14);

  fill(240); textSize(18);
  text('氷 ' + MASS + ' kg を ' + power + ' W で温める　時間 ' + simT.toFixed(0) + ' 秒　Q = ' + (qHeat / 1000).toFixed(1) + ' kJ　温度 ' + s.t.toFixed(1) + ' °C', 20, 36);
  fill(175); textSize(15);
  text('スペース 加熱 ' + (running ? '中' : '停止') + '　↑↓ ヒーター　R 最初から　｜ 混ぜる：1〜4 で選んで ← →、5 で物質', 20, 62);
  text('とけた割合 ' + (s.melt * 100).toFixed(0) + '%　蒸発した割合 ' + (s.vapor * 100).toFixed(0) + '%　｜ 温度が止まっている間、熱は分子のつながりをほどくのに使われる（潜熱）', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === ' ') running = !running;
  if (key === UP_ARROW) power = Math.min(10000, power + 500);
  if (key === DOWN_ARROW) power = Math.max(500, power - 500);
  if (key === 'r' || key === 'R') { qHeat = 0; simT = 0; trace = []; running = false; }
  if (key >= '1' && key <= '4') sel = +key;
  if (key === '5') { mixB.mat = mixB.mat === 'iron' ? 'water' : 'iron'; mixB.t = mixB.mat === 'iron' ? 200 : 20; }
  let d = key === RIGHT_ARROW ? 1 : key === LEFT_ARROW ? -1 : 0;
  if (d) {
    if (sel === 1) mixA.t = clampv(mixA.t + 5 * d, 0, 100);
    if (sel === 2) mixA.m = clampv(mixA.m + 0.1 * d, 0.1, 5);
    if (sel === 3) mixB.t = clampv(mixB.t + 5 * d, -30, mixB.mat === 'iron' ? 500 : 100);
    if (sel === 4) mixB.m = clampv(mixB.m + 0.1 * d, 0.1, 5);
  }
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let need = 2100 * 30 + 334000 + 4186 * 100 + 2257000 + 2010 * 20;
  check('−30 °C の氷 → 120 °C の水蒸気：' + (need / 1000).toFixed(1) + ' kJ（各部分の和）', near(hWater(120, 'steam') - hWater(-30, 'ice'), need, 1e-6));
  check('温度 → 熱 → 温度 が元にもどる（−30, −5, 37, 99, 110 °C）', [-30, -5, 37, 99, 110].every((t) => near(stateOf(hOfT(t)).t, t, 1e-9)));
  let half = stateOf(L_F / 2);
  check('融解の途中は 0 °C のまま。融解熱の半分でちょうど半分とける', half.t === 0 && near(half.melt, 0.5, 1e-12));
  let q = 0, tt = 0, h0 = hWater(0, 'ice'); while (stateOf(h0 + q).melt < 1) { q += 1000 * 0.5; tt += 0.5; }
  check('1000 W で 0 °C の氷 1 kg がとけきるまで L/P = 334 秒（1 ステップ 0.5 秒）', near(tt, 334, 0.5));
  check('80 °C の水 1 kg + 20 °C の水 1 kg → 50 °C', near(mixEquilibrium({ m: 1, t: 80 }, { m: 1, t: 20, mat: 'water' }).t, 50, 1e-6));
  let e = mixEquilibrium({ m: 1, t: 50 }, { m: 0.1, t: 0, mat: 'water' });   // 0 °C の「水」として入れた場合
  let ei = (1 * C_WATER * 50 - 0.1 * L_F) / (1.1 * C_WATER);
  let ice = { m: 0.1, t: -1e-9, mat: 'water' }, e2 = mixEquilibrium({ m: 1, t: 50 }, ice);
  check('50 °C の水 1 kg に 0 °C の氷 0.1 kg → ' + ei.toFixed(2) + ' °C（融解熱を引いてから混ぜる）', near(e2.t, ei, 1e-3) && near(e.t, 50 / 1.1, 1e-6));
  let fe = mixEquilibrium({ m: 1, t: 20 }, { m: 0.5, t: 200, mat: 'iron' }), lost = 0.5 * C_IRON * (200 - fe.t), gain = C_WATER * (fe.t - 20);
  check('200 °C の鉄 0.5 kg を 20 °C の水 1 kg に：鉄が出した熱 = 水がもらった熱（' + fe.t.toFixed(2) + ' °C）', near(lost, gain, 1e-3) && near(fe.t, (0.5 * 450 * 200 + 4186 * 20) / (225 + 4186), 1e-6));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. スペースで加熱。温度が止まる 2 か所はどこ？ 長いのはどちら？ なぜ？
// 2. ↑ でヒーターを強くすると、グラフの形は変わる？（横軸は熱、時間ではない）
// 3. C_WATER を小さく（1000 に）すると、グラフのどこが変わる？ 水の比熱が大きいことの意味は？
// 4. 混ぜる：3 を選び B の温度を 0 °C 以下にすると B は氷。とけきらないのはどんなとき？
// 5. 5 で鉄にして、熱い鉄球を水に入れる。水の温度はあまり上がらないのはなぜ？


// ==================================================
// ここから下は「熱力学の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーションと自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(t, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 32); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
