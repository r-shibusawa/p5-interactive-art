// ============================================
// 08 アインシュタイン固体 ─ エネルギーの「場合の数」を正確に数える
// 固体 = N 個の振動子。エネルギーは ε のかたまり（量子）でしか持てない。q 個の量子を N 個に分ける方法は
// Ω(N, q) = C(q + N − 1, q) 通り（BigInt で正確に数える）。2 つの固体 A・B で量子をやり取りすると、
// いちばん場合の数が多い分け方 = エントロピー S = k ln Ω が最大 = 熱平衡。そこで 2 つの温度（1/T = dS/dq）が等しい
// ← → 振動子 NA / ↑↓ 量子の数 q / 1 2 3 例（小・中・大）/ スペース やり取り開始・停止 / L 縦軸を対数に / R 全部 A に
// ============================================

const N_TOTAL_MAX = 500;               // ★ 振動子の最大数
let NA = 300, NB = 200, QTOT = 100, tab = null, osc, running = true, logY = false, qaLog = [], qaHist = [];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(8); rebuild(); }

// ---- 場合の数（BigInt で正確に）
function omega(N, q) { let r = 1n; for (let i = 1; i <= q; i++) r = (r * BigInt(q + N - i)) / BigInt(i); return r; }   // C(q+N−1, q)
function omegaRow(N, qmax) {           // Ω(N, 0), Ω(N, 1), … を順に：Ω(N, q+1) = Ω(N, q)·(q + N)/(q + 1)
  let row = [1n]; for (let q = 0; q < qmax; q++) row.push((row[q] * BigInt(q + N)) / BigInt(q + 1)); return row;
}
function bigLn(b) { let s = b.toString(); return s.length <= 15 ? Math.log(Number(s)) : Math.log(Number(s.slice(0, 15))) + (s.length - 15) * Math.LN10; }
function makeTable(na, nb, q) {        // qA = 0〜q のそれぞれの Ω_A·Ω_B、エントロピー、確率
  let ra = omegaRow(na, q), rb = omegaRow(nb, q), t = { na, nb, q, lnA: [], lnB: [], lnT: [], p: [], total: 0n, peak: 0 };
  for (let qa = 0; qa <= q; qa++) { let w = ra[qa] * rb[q - qa]; t.total += w; t.lnA.push(bigLn(ra[qa])); t.lnB.push(bigLn(rb[q - qa])); t.lnT.push(bigLn(w)); }
  t.lnAll = bigLn(t.total);
  for (let qa = 0; qa <= q; qa++) { t.p.push(Math.exp(t.lnT[qa] - t.lnAll)); if (t.lnT[qa] > t.lnT[t.peak]) t.peak = qa; }
  t.omegaAll = t.total; return t;
}
// 温度：1/T = dS/dq（となりとの差で）。S = ln Ω、k = ε = 1 の単位
function tempA(t, qa) { let a = Math.max(0, qa - 1), b = Math.min(t.q, qa + 1); return b > a ? (b - a) / Math.max(1e-9, t.lnA[b] - t.lnA[a]) : NaN; }
function tempB(t, qa) { let a = Math.max(0, qa - 1), b = Math.min(t.q, qa + 1); return b > a ? (b - a) / Math.max(1e-9, t.lnB[a] - t.lnB[b]) : NaN; }

function rebuild() {
  tab = makeTable(NA, NB, QTOT);
  osc = new Int32Array(NA + NB); for (let k = 0; k < QTOT; k++) osc[k % NA]++;   // はじめは全部 A に
  qaLog = []; qaHist = new Array(QTOT + 1).fill(0);
}
function exchange(n) {                 // ランダムに選んだ振動子 i から j へ量子を 1 つ（i が持っていれば）
  for (let k = 0; k < n; k++) { let i = Math.floor(rnd() * osc.length), j = Math.floor(rnd() * osc.length); if (osc[i] > 0) { osc[i]--; osc[j]++; } }
}
function qaNow() { let s = 0; for (let i = 0; i < NA; i++) s += osc[i]; return s; }

function draw() {
  background(24, 22, 26);
  if (running) { exchange(400); let qa = qaNow(); qaLog.push(qa); if (qaLog.length > 300) qaLog.shift(); qaHist[qa]++; }
  let qa = qaNow();
  // ---- 振動子のマス目（量子の数で明るさ）
  let cols = 25, cs = Math.min(14, Math.floor((width * 0.3) / cols)), ox = 20, oy = 120;
  noStroke();
  for (let i = 0; i < NA + NB; i++) {
    let k = i < NA ? i : i - NA, rr = Math.floor(k / cols) + (i < NA ? 0 : Math.ceil(NA / cols) + 1);
    let v = clampv(osc[i] / 4, 0, 1);
    fill(i < NA ? color(60 + 195 * v, 40 + 80 * v, 30) : color(30, 50 + 100 * v, 70 + 185 * v));
    rect(ox + (k % cols) * cs, oy + rr * cs, cs - 1, cs - 1);
  }
  fill(255, 160, 90); textSize(14); text('A：' + NA + ' 個、量子 ' + qa, ox, oy - 8);
  fill(120, 180, 255); text('B：' + NB + ' 個、量子 ' + (QTOT - qa), ox, oy + (Math.ceil(NA / cols) + 1) * cs - 4);

  // ---- グラフ 1：Ω_A·Ω_B の確率と、やり取りで出た qA のヒストグラム
  let gx = ox + cols * cs + 70, gw = width - gx - 30, gh = (height - 270) / 2;
  let pm = Math.max(...tab.p), g1 = { x: gx, y: 120, w: gw, h: gh, x0: -0.5, x1: QTOT + 0.5, y0: logY ? 1e-12 : 0, y1: logY ? 1 : pm * 1.2, logy: logY };
  plotAxes(g1, 'A の量子の数 qA', logY ? '確率（対数）' : '確率 Ω_A·Ω_B / Ω_全体', [0, Math.round(QTOT / 2), QTOT], logY ? [1e-12, 1e-8, 1e-4, 1] : [0, +(pm * 1.2).toPrecision(2)]);
  let tot = qaHist.reduce((a, b) => a + b, 0);
  noStroke(); fill(255, 160, 90, 130);
  if (tot > 0) for (let k = 0; k <= QTOT; k++) if (qaHist[k] > 0) { let y = gY(g1, Math.max(g1.y0, qaHist[k] / tot)); rect(gX(g1, k - 0.45), y, Math.max(1, gX(g1, k + 0.45) - gX(g1, k - 0.45)), g1.y + g1.h - y); }
  stroke(130, 200, 255); strokeWeight(2); polyline(tab.p.map((p, k) => [gX(g1, k), gY(g1, Math.max(g1.y0, p))]));
  stroke(255, 255, 255, 120); strokeWeight(1); line(gX(g1, tab.peak), g1.y, gX(g1, tab.peak), g1.y + g1.h);
  stroke(255, 220, 120); line(gX(g1, qa), g1.y + g1.h - 12, gX(g1, qa), g1.y + g1.h);
  // ---- グラフ 2：エントロピー S_A、S_B、S_全体
  let smax = Math.max(...tab.lnT), g2 = { x: gx, y: g1.y + gh + 80, w: gw, h: gh, x0: 0, x1: QTOT, y0: 0, y1: smax * 1.1 + 1 };
  plotAxes(g2, 'A の量子の数 qA', 'エントロピー S = ln Ω（k = 1）', [0, Math.round(QTOT / 2), QTOT], [0, Math.round(smax)]);
  strokeWeight(2);
  stroke(255, 150, 80); polyline(tab.lnA.map((s, k) => [gX(g2, k), gY(g2, s)]));
  stroke(110, 170, 255); polyline(tab.lnB.map((s, k) => [gX(g2, k), gY(g2, s)]));
  stroke(240); polyline(tab.lnT.map((s, k) => [gX(g2, k), gY(g2, s)]));
  stroke(255, 255, 255, 120); strokeWeight(1); line(gX(g2, tab.peak), g2.y, gX(g2, tab.peak), g2.y + g2.h);

  // ---- 文字
  let pk = tab.peak, TA = tempA(tab, pk), TB = tempB(tab, pk);
  noStroke(); fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('アインシュタイン固体　NA = ' + NA + '　NB = ' + NB + '　q = ' + QTOT + '　全体の場合の数 Ω = ' + (tab.omegaAll.toString().length > 12 ? '約 10^' + (tab.lnAll / Math.LN10).toFixed(1) : tab.omegaAll.toString()) + ' 通り', 20, 36);
  fill(175); textSize(15);
  text('← → NA　↑↓ q　1 2 3 例　スペース やり取り ' + (running ? '中' : '停止') + '　L 対数　R 全部 A に　（白い線 = いちばん多い分け方 qA = ' + pk + '）', 20, 62);
  fill(255, 200, 120);
  text('最大の所で温度 kT_A = ' + TA.toFixed(3) + 'ε、kT_B = ' + TB.toFixed(3) + 'ε（1/T = dS/dq が等しい）　量子の割合 q·NA/(NA+NB) = ' + ((QTOT * NA) / (NA + NB)).toFixed(1) + '　いまの qA = ' + qa, 20, 86);
  fill(170); textSize(13); text('青い線 = 正確な確率、橙 = ランダムなやり取りで出た qA の割合', g1.x, g1.y + g1.h + 48);
  text('橙 S_A、青 S_B、白 S_全体 = S_A + S_B（最大の所が熱平衡）', g2.x, g2.y + g2.h + 48);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === RIGHT_ARROW) NA = Math.min(N_TOTAL_MAX - NB, NA + (NA < 20 ? 1 : 10));
  if (key === LEFT_ARROW) NA = Math.max(1, NA - (NA <= 20 ? 1 : 10));
  if (key === UP_ARROW) QTOT = Math.min(400, QTOT + (QTOT < 20 ? 1 : 10));
  if (key === DOWN_ARROW) QTOT = Math.max(1, QTOT - (QTOT <= 20 ? 1 : 10));
  if (key === '1') { NA = 3; NB = 3; QTOT = 6; }
  if (key === '2') { NA = 30; NB = 20; QTOT = 50; }
  if (key === '3') { NA = 300; NB = 200; QTOT = 100; }
  if (key === 'l' || key === 'L') logY = !logY;
  if (key === ' ') running = !running;
  if (key !== ' ' && key !== 'l' && key !== 'L') rebuild();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('Ω(N = 3, q = 3) = 10、Ω(N, 0) = 1、Ω(1, q) = 1', omega(3, 3) === 10n && omega(50, 0) === 1n && omega(1, 40) === 1n);
  let t = makeTable(30, 20, 50);
  check('Σ Ω_A(qA)·Ω_B(q − qA) = Ω(NA + NB, q)（ヴァンデルモンドの等式、BigInt で正確に）', t.total === omega(50, 50));
  let big = makeTable(300, 200, 100);
  check('いちばん多い分け方 qA = ' + big.peak + ' ≈ q·NA/(NA+NB) = 60（±1）', Math.abs(big.peak - 60) <= 1);
  check('そこで 2 つの温度が等しい（kT_A = ' + tempA(big, big.peak).toFixed(3) + '、kT_B = ' + tempB(big, big.peak).toFixed(3) + '、2% 以内）', Math.abs(tempA(big, big.peak) / tempB(big, big.peak) - 1) < 0.02);
  let N = 300, q = 100, slope = (bigLn(omega(N, q + 1)) - bigLn(omega(N, q - 1))) / 2;
  check('1/kT = dS/dq ≈ ln(1 + N/q)（大きな N, q の式、1% 以内）', Math.abs(slope / Math.log(1 + N / q) - 1) < 0.01);
  seedRng(80); let s = makeTable(6, 4, 10), saveO = osc, saveNA = NA, h = new Array(11).fill(0);
  osc = new Int32Array(10); osc[0] = 10; NA = 6;
  for (let k = 0; k < 40000; k++) { exchange(5); h[qaNow()]++; }
  let L1 = h.reduce((a, c, k) => a + Math.abs(c / 40000 - s.p[k]), 0); osc = saveO; NA = saveNA;
  check('ランダムなやり取りを長く続けると、qA の割合が正確な確率に近づく（ずれ ' + L1.toFixed(3) + ' < 0.05）', L1 < 0.05);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 を押して NA = NB = 3、q = 6。Ω_A·Ω_B を手で数えて、グラフと比べよう（全部で 462 通り）
// 2. 3 にして R。全部 A にあった量子が B へ流れ、山の所で止まる。もう一度全部 A にもどることはある？
// 3. L で対数にすると、山からはずれた分け方がどれだけめずらしいか見える
// 4. NA を大きくすると、A の温度はどうなる？ 熱は温度の高いほうから低いほうへ流れる？
// 5. 1/T = dS/dq：量子 1 個を渡すときのエントロピーの増え方が、温度を決める


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
