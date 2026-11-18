// ============================================
// 05 カルノーサイクル ─ 2 つの熱源の間で働くいちばん効率のよいエンジン
// 等温膨張（高温 Th）→ 断熱膨張 → 等温圧縮（低温 Tc）→ 断熱圧縮。PV 図と TS 図を同時に描く
// 各過程を細かく分けて W = ∫P dV と Q を数値で足し、効率 η = W/Q_in を計算 → 1 − Tc/Th と一致する
// オットー（ガソリンエンジン）・スターリングと、同じ温度の範囲で効率を比べる
// 1 カルノー　2 オットー　3 スターリング / ↑↓ 高温 Th / ← → 低温 Tc / G 気体（γ）/ スペース 一時停止
// ============================================

const N_MOL = 1, R_GAS = 8.314;
const V_A = 10;                        // ★ いちばん小さい体積 [L]
const V_RATIO = 3;                     // ★ 等温膨張で何倍にするか（スターリングも同じ）
let Th = 600, Tc = 300, gIdx = 1, kind = 1, paused = false, phase = 0, cyc;
const GAMMAS = [5 / 3, 7 / 5];
const NAMES = ['', 'カルノー', 'オットー（ガソリンエンジン）', 'スターリング（再生器なし）'];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); cyc = makeCycle(kind, Th, Tc, GAMMAS[gIdx]); }

// 1 つの過程を細かく分けて進める（04 と同じ）。k：1 等温 2 断熱 3 定圧 4 定積、target：体積（定積は温度）
function runLeg(s, k, target, Cv, g, nsub) {
  let pts = [[s.V, s.T]], W = 0, Q = 0, dS = 0, a = { V: s.V, T: s.T }, V1 = s.V, T1 = s.T;
  for (let i = 1; i <= nsub; i++) {
    let b;
    if (k === 4) b = { V: V1, T: T1 + ((target - T1) * i) / nsub };
    else { let V = V1 + ((target - V1) * i) / nsub; b = { V, T: k === 1 ? T1 : T1 * Math.pow(V1 / V, g - 1) }; }
    let dW = 0.5 * (N_MOL * R_GAS) * (a.T / a.V + b.T / b.V) * (b.V - a.V), dQ = N_MOL * Cv * (b.T - a.T) + dW;
    W += dW; Q += dQ; dS += dQ / (0.5 * (a.T + b.T)); a = b;
    if (i % 5 === 0) pts.push([b.V, b.T]);
  }
  return { s: a, pts, W, Q, dS, k };
}
// サイクルを作る：各過程の終わりの状態を計算してつなぐ
function makeCycle(kd, th, tc, g, nsub) {
  nsub = nsub || 400;
  let Cv = (N_MOL * R_GAS) / (g - 1), e = 1 / (g - 1), plan, r;
  if (kd === 1) { let VB = V_A * V_RATIO, VC = VB * Math.pow(th / tc, e), VD = V_A * Math.pow(th / tc, e); plan = [{ V: V_A, T: th }, [1, VB, '等温膨張（Th）'], [2, VC, '断熱膨張'], [1, VD, '等温圧縮（Tc）'], [2, V_A, '断熱圧縮']]; }
  if (kd === 2) { r = Math.pow(Math.sqrt(th / tc), e); let V2 = V_A * r; plan = [{ V: V2, T: tc }, [2, V_A, '断熱圧縮'], [4, th, '定積加熱（燃焼）'], [2, V2, '断熱膨張'], [4, tc, '定積冷却（排気）']]; }
  if (kd === 3) { plan = [{ V: V_A, T: th }, [1, V_A * V_RATIO, '等温膨張（Th）'], [4, tc, '定積冷却'], [1, V_A, '等温圧縮（Tc）'], [4, th, '定積加熱']]; }
  let s = plan[0], legs = [];
  for (let p of plan.slice(1)) { let L = runLeg(s, p[0], p[1], Cv, g, nsub); L.name = p[2]; legs.push(L); s = L.s; }
  let W = legs.reduce((a, L) => a + L.W, 0), Qin = legs.reduce((a, L) => a + Math.max(0, L.Q), 0), Qout = legs.reduce((a, L) => a + Math.min(0, L.Q), 0);
  return { legs, W, Qin, Qout, eta: W / Qin, end: s, start: plan[0], r, Cv, dS: legs.reduce((a, L) => a + L.dS, 0) };
}
function entropy(V, T, Cv) { return N_MOL * Cv * Math.log(T / 300) + N_MOL * R_GAS * Math.log(V / 10); }   // 基準は 10 L、300 K

function draw() {
  background(22, 22, 28);
  if (!paused) phase = (phase + 0.004) % 4;
  let g = GAMMAS[gIdx];
  // ---- PV 図と TS 図
  let w = (width - 120) / 2 - 40, h = height - 330;
  let pv = { x: 70, y: 120, w, h, x0: 0, x1: 0, y0: 0, y1: 0 }, ts = { x: 70 + w + 90, y: 120, w: w - 40, h, x0: 0, x1: 0, y0: 0, y1: Th * 1.12 };
  let allV = [], allP = [], allS = [];
  for (let L of cyc.legs) for (let p of L.pts) { allV.push(p[0]); allP.push((N_MOL * R_GAS * p[1]) / p[0]); allS.push(entropy(p[0], p[1], cyc.Cv)); }
  pv.logx = pv.logy = true; pv.x0 = Math.min(...allV) * 0.85; pv.x1 = Math.max(...allV) * 1.15; pv.y0 = Math.min(...allP) * 0.85; pv.y1 = Math.max(...allP) * 1.15;   // 両対数（細い形が見やすい）
  ts.x0 = Math.min(...allS) - 2; ts.x1 = Math.max(...allS) + 2;
  plotAxes(pv, '体積 V [L]（対数）', '圧力 P [kPa]（対数）', [10, 20, 50, 100, 200].filter((v) => v > pv.x0 && v < pv.x1), [10, 20, 50, 100, 200, 500, 1000].filter((v) => v > pv.y0 && v < pv.y1));
  plotAxes(ts, 'エントロピー S [J/K]', '温度 T [K]', [Math.round(ts.x0), Math.round(ts.x1)], [0, Tc, Th]);
  stroke(255, 120, 60, 70); line(ts.x, gY(ts, Th), ts.x + ts.w, gY(ts, Th)); stroke(90, 160, 255, 70); line(ts.x, gY(ts, Tc), ts.x + ts.w, gY(ts, Tc));
  // 囲まれた面積（PV では仕事 W、TS では正味の熱 = W）
  noStroke(); fill(255, 210, 120, 40);
  beginShape(); for (let L of cyc.legs) for (let p of L.pts) vertex(gX(pv, p[0]), gY(pv, (N_MOL * R_GAS * p[1]) / p[0])); endShape(CLOSE);
  beginShape(); for (let L of cyc.legs) for (let p of L.pts) vertex(gX(ts, entropy(p[0], p[1], cyc.Cv)), gY(ts, p[1])); endShape(CLOSE);
  let li = Math.floor(phase), f = phase - li;
  for (let k = 0; k < 4; k++) {
    let L = cyc.legs[k], c = L.Q > 1e-6 ? [255, 120, 60] : L.Q < -1e-6 ? [90, 160, 255] : [200, 200, 200];
    stroke(...c); strokeWeight(k === li ? 5 : 2.5);
    polyline(L.pts.map((p) => [gX(pv, p[0]), gY(pv, (N_MOL * R_GAS * p[1]) / p[0])]));
    polyline(L.pts.map((p) => [gX(ts, entropy(p[0], p[1], cyc.Cv)), gY(ts, p[1])]));
  }
  let L = cyc.legs[li], p = L.pts[Math.min(L.pts.length - 1, Math.floor(f * L.pts.length))];
  noStroke(); fill(255); circle(gX(pv, p[0]), gY(pv, (N_MOL * R_GAS * p[1]) / p[0]), 13); circle(gX(ts, entropy(p[0], p[1], cyc.Cv)), gY(ts, p[1]), 13);

  // ---- 効率の比較（同じ Th, Tc）
  let bx = 70, by = height - 160, carnot = 1 - Tc / Th, otto = makeCycle(2, Th, Tc, g, 100), stir = makeCycle(3, Th, Tc, g, 100);
  let bars = [['カルノー 1 − Tc/Th', carnot], ['オットー（r = ' + otto.r.toFixed(2) + '）1 − r^(1−γ)', otto.eta], ['スターリング（再生器なし）', stir.eta]];
  textSize(14);
  for (let k = 0; k < 3; k++) {
    fill(kind === k + 1 ? color(255, 210, 120) : 170); text(bars[k][0], bx, by + k * 30 + 14);
    fill(kind === k + 1 ? color(255, 150, 70) : color(120, 120, 140)); rect(bx + 290, by + k * 30, 400 * bars[k][1], 18);
    fill(235); text((bars[k][1] * 100).toFixed(1) + '%', bx + 300 + 400 * bars[k][1], by + k * 30 + 14);
  }
  // ---- 文字
  fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text(NAMES[kind] + '　Th = ' + Th + ' K　Tc = ' + Tc + ' K　γ = ' + g.toFixed(3) + '　｜ いまの過程：' + L.name, 20, 36);
  fill(175); textSize(15);
  text('1 カルノー　2 オットー　3 スターリング　↑↓ 高温 Th　← → 低温 Tc　G 気体　スペース 停止　（赤 = 熱が入る、青 = 熱が出る、白 = 断熱）', 20, 62);
  fill(255, 200, 120);
  text('数値で積分：W = ' + cyc.W.toFixed(1) + ' J　Q_in = ' + cyc.Qin.toFixed(1) + ' J　Q_out = ' + cyc.Qout.toFixed(1) + ' J　η = W/Q_in = ' + (cyc.eta * 100).toFixed(3) + '%　（カルノーの上限 ' + (carnot * 100).toFixed(3) + '%）　1 周の ΔS = ' + cyc.dS.toExponential(1), 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key >= '1' && key <= '3') kind = +key;
  if (key === UP_ARROW) Th = Math.min(1200, Th + 50);
  if (key === DOWN_ARROW) Th = Math.max(Tc + 50, Th - 50);
  if (key === RIGHT_ARROW) Tc = Math.min(Th - 50, Tc + 25);
  if (key === LEFT_ARROW) Tc = Math.max(100, Tc - 25);
  if (key === 'g' || key === 'G') gIdx = 1 - gIdx;
  if (key === ' ') paused = !paused;
  cyc = makeCycle(kind, Th, Tc, GAMMAS[gIdx]);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let c = makeCycle(1, 600, 300, 1.4, 2000);
  check('カルノー：数値の W/Q_in = 1 − Tc/Th = 50%（1e-6）', near(c.eta, 0.5, 1e-6));
  check('1 周で元の状態にもどる（ΔU = 0）、∮dQ/T = 0（可逆）', near(c.end.V, c.start.V, 1e-9) && near(c.end.T, c.start.T, 1e-9) && Math.abs(c.dS) < 1e-6);
  check('Q_in/Th = |Q_out|/Tc（熱源のエントロピーの出入りがつり合う）', near(c.Qin / 600, -c.Qout / 300, 1e-4));
  let o = makeCycle(2, 600, 300, 1.4, 2000);
  check('オットー：η = 1 − r^(1−γ) = ' + (100 * (1 - Math.pow(o.r, -0.4))).toFixed(2) + '% < カルノー', near(o.eta, 1 - Math.pow(o.r, -0.4), 1e-6) && o.eta < 0.5);
  let s = makeCycle(3, 600, 300, 1.4, 2000), regen = s.W / (s.Qin - s.Cv * 300);
  check('スターリング：再生器なしはカルノーより低く、理想の再生器ありならカルノーと同じ', s.eta < 0.5 && near(regen, 0.5, 1e-5));
  let clausius = o.Qin / 600 + o.Qout / 300;
  check('オットーを 600 K と 300 K の熱源で動かすと ∮dQ/T_熱源 = ' + clausius.toFixed(3) + ' < 0（クラウジウスの不等式）', clausius < 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ ← → で Th と Tc を変え、効率がどう変わるか見よう。効率 100% にするには？
// 2. TS 図ではカルノーサイクルは長方形。面積は何を表す？（PV 図の面積と同じ値になる）
// 3. 2 のオットーと比べよう。同じ温度の範囲なのに効率が低いのはなぜ？（熱を受け取る温度が Th より低い）
// 4. G で γ を変えると、カルノーの効率は変わる？ オットーは？
// 5. V_RATIO を大きくすると、1 周の仕事 W と効率はそれぞれどう変わる？


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
