// ============================================
// 04 PV 図と 4 つの過程 ─ 等温・断熱・定圧・定積
// 理想気体 1 mol（PV = nRT、V はリットル、P は kPa → PV はジュール）。ピストンを動かすと PV 図に線が引かれる
// 仕事 W = ∫P dV（線の下の面積）を細かく分けて数値で足し、式の値と比べる。熱 Q = ΔU + W（第一法則）
// 1 等温　2 断熱　3 定圧　4 定積 / ← → 体積（4 では温度）/ PV 図をドラッグ / ↑↓ 気体の種類（γ）/ R 最初から / C 線を消す
// ============================================

const N_MOL = 1;                       // ★ 物質量 [mol]
const R_GAS = 8.314;                   // 気体定数 [J/(mol·K)]
const GASES = [{ name: '単原子（He, Ar）', f: 3 }, { name: '2 原子（空気）', f: 5 }, { name: '多原子', f: 7 }];   // ★ 自由度 f → Cv = f/2·R
const SUB = 400;                       // ★ 1 回の動きを何個に分けて積分するか
const KINDS = ['', '等温', '断熱', '定圧', '定積'];
const KCOL = ['', [255, 170, 80], [120, 200, 255], [150, 230, 140], [240, 120, 200]];
let gasIdx = 1, kind = 1, st0 = { V: 20, T: 300 }, cur, legs = [], sum, dragging = false;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); resetAll(); }
function cv() { return (GASES[gasIdx].f / 2) * R_GAS; }
function gam() { return 1 + 2 / GASES[gasIdx].f; }
function pOf(s) { return (N_MOL * R_GAS * s.T) / s.V; }                 // kPa（J ÷ L）
function resetAll() { cur = { V: st0.V, T: st0.T }; legs = []; sum = { W: 0, Q: 0, dU: 0, dS: 0, Wc: 0, Qc: 0 }; }

// 1 つの過程を SUB 個に分けて進め、W・Q・ΔS を数値で足す（式の値 Wc・Qc も一緒に）
function runLeg(s, k, target, Cv, g, nsub) {
  let pts = [], W = 0, Q = 0, dS = 0, a = { V: s.V, T: s.T };
  let V1 = s.V, T1 = s.T, P1 = (N_MOL * R_GAS * T1) / V1;
  for (let i = 1; i <= nsub; i++) {
    let b;
    if (k === 4) b = { V: s.V, T: T1 + ((target - T1) * i) / nsub };                     // 定積：温度を変える
    else {
      let V = V1 + ((target - V1) * i) / nsub;
      if (k === 1) b = { V, T: T1 };
      else if (k === 2) b = { V, T: T1 * Math.pow(V1 / V, g - 1) };                    // TV^(γ−1) = 一定
      else b = { V, T: (P1 * V) / (N_MOL * R_GAS) };                                   // P = 一定
    }
    let pa = (N_MOL * R_GAS * a.T) / a.V, pb = (N_MOL * R_GAS * b.T) / b.V;
    let dW = 0.5 * (pa + pb) * (b.V - a.V), dQ = N_MOL * Cv * (b.T - a.T) + dW;          // 台形の面積、dQ = dU + dW
    W += dW; Q += dQ; dS += dQ / (0.5 * (a.T + b.T));
    if (i % 10 === 0 || i === nsub) pts.push([b.V, pb]);          // 絵には 10 個に 1 個だけ
    a = b;
  }
  let V2 = a.V, T2 = a.T, P2 = (N_MOL * R_GAS * T2) / V2, dU = N_MOL * Cv * (T2 - T1), Wc;
  if (k === 1) Wc = N_MOL * R_GAS * T1 * Math.log(V2 / V1);
  else if (k === 2) Wc = (P1 * V1 - P2 * V2) / (g - 1);
  else if (k === 3) Wc = P1 * (V2 - V1);
  else Wc = 0;
  let dSc = N_MOL * Cv * Math.log(T2 / T1) + N_MOL * R_GAS * Math.log(V2 / V1);
  return { s: { V: V2, T: T2 }, pts, W, Q, dU, dS, Wc, Qc: dU + Wc, dSc, k, from: [V1, P1] };
}
function move(target) {
  if (kind === 4) target = clampv(target, 80, 1200); else target = clampv(target, 5, 60);
  if (kind === 2) { let T2 = cur.T * Math.pow(cur.V / target, gam() - 1); if (T2 > 1200 || T2 < 80) return; }
  if (kind === 3) { let T2 = (cur.T * target) / cur.V; if (T2 > 1200 || T2 < 80) return; }
  let L = runLeg(cur, kind, target, cv(), gam(), SUB);
  if (L.pts.length && Math.abs(L.W) + Math.abs(L.Q) > 1e-9) {
    let last = legs[legs.length - 1];
    if (last && last.k === kind) { last.pts.push(...L.pts); if (last.pts.length > 3000) last.pts = last.pts.filter((_, k) => k % 2 === 0 || k === last.pts.length - 1); for (let q of ['W', 'Q', 'dU', 'dS', 'Wc', 'Qc', 'dSc']) last[q] += L[q]; }
    else legs.push(L);
    for (let q of ['W', 'Q', 'dU', 'dS', 'Wc', 'Qc']) sum[q] += L[q];
  }
  cur = L.s;
}

function draw() {
  background(24, 22, 26);
  let g = { x: 380, y: 110, w: width - 380 - 360, h: height - 230, x0: 0, x1: 62, y0: 0, y1: 900 };
  if (dragging && mouseX > g.x - 20 && mouseX < g.x + g.w + 20) {
    let tv = g.x0 + ((mouseX - g.x) / g.w) * (g.x1 - g.x0);
    if (kind === 4) { let P = g.y1 * (1 - (mouseY - g.y) / g.h); move((clampv(P, 5, 900) * cur.V) / (N_MOL * R_GAS)); }
    else if (Math.abs(tv - cur.V) > 0.05) move(tv);
  }
  // ---- PV 図：うすく等温線（200〜1000 K）
  plotAxes(g, '体積 V [L]', '圧力 P [kPa]', [0, 10, 20, 30, 40, 50, 60], [0, 300, 600, 900]);
  strokeWeight(1);
  for (let t = 200; t <= 1000; t += 100) { stroke(255, 170, 80, 40); polyline(Array.from({ length: 60 }, (_, i) => { let V = 3 + i; return [gX(g, V), gY(g, (N_MOL * R_GAS * t) / V)]; })); }
  // 最後の過程の下の面積 = 仕事
  let lastLeg = legs[legs.length - 1];
  if (lastLeg && lastLeg.k !== 4) {
    noStroke(); fill(255, 220, 120, 40); beginShape(); vertex(gX(g, lastLeg.from[0]), gY(g, 0)); vertex(gX(g, lastLeg.from[0]), gY(g, lastLeg.from[1]));
    for (let p of lastLeg.pts) vertex(gX(g, p[0]), gY(g, p[1])); vertex(gX(g, lastLeg.pts[lastLeg.pts.length - 1][0]), gY(g, 0)); endShape(CLOSE);
  }
  for (let L of legs) { stroke(...KCOL[L.k]); strokeWeight(3); polyline([[gX(g, L.from[0]), gY(g, L.from[1])]].concat(L.pts.map((p) => [gX(g, p[0]), gY(g, p[1])]))); }
  noStroke(); fill(255); circle(gX(g, cur.V), gY(g, pOf(cur)), 12);
  fill(...KCOL[kind]); textSize(14); text(KINDS[kind], gX(g, cur.V) + 10, gY(g, pOf(cur)) - 10);

  // ---- シリンダーの絵（ピストンの位置 = 体積、気体の色 = 温度）
  let cx = 40, cy = 140, ch = 300, cw = 260, px = cy + ch - (cur.V / 62) * ch;
  noFill(); stroke(200); strokeWeight(3); line(cx, cy - 20, cx, cy + ch); line(cx + cw, cy - 20, cx + cw, cy + ch); line(cx, cy + ch, cx + cw, cy + ch);
  noStroke(); let u = clampv((cur.T - 100) / 900, 0, 1); fill(80 + 175 * u, 120 - 40 * u, 255 - 200 * u, 170); rect(cx + 3, px, cw - 6, cy + ch - px);
  fill(180, 185, 200); rect(cx + 3, px - 16, cw - 6, 16); rect(cx + cw / 2 - 8, cy - 60, 16, px - 16 - cy + 60);
  if (lastLeg) { let q = lastLeg.Q; fill(q > 1 ? color(255, 120, 50) : q < -1 ? color(90, 170, 255) : color(120)); textSize(16); text(q > 1 ? '↑ 熱が入る Q > 0' : q < -1 ? '↓ 熱が出る Q < 0' : '熱の出入りなし Q = 0', cx, cy + ch + 34); }
  fill(230); textSize(16);
  text('V = ' + cur.V.toFixed(2) + ' L', cx, cy + ch + 64); text('P = ' + pOf(cur).toFixed(1) + ' kPa', cx, cy + ch + 88); text('T = ' + cur.T.toFixed(1) + ' K', cx, cy + ch + 112);

  // ---- 表
  let tx = width - 340, ty = 130;
  fill(240); textSize(16); text('最後の過程（' + (lastLeg ? KINDS[lastLeg.k] : '—') + '）', tx, ty);
  let rows = lastLeg ? [['W 数値 ∫P dV', lastLeg.W], ['W 式', lastLeg.Wc], ['ΔU = nCvΔT', lastLeg.dU], ['Q = ΔU + W', lastLeg.Q], ['ΔS 数値 Σ dQ/T', lastLeg.dS], ['ΔS 式', lastLeg.dSc]] : [];
  textSize(14);
  for (let k = 0; k < rows.length; k++) { fill(175); text(rows[k][0], tx, ty + 28 + k * 22); fill(235); text(rows[k][1].toFixed(k >= 4 ? 4 : 2) + (k >= 4 ? ' J/K' : ' J'), tx + 170, ty + 28 + k * 22); }
  fill(240); textSize(16); text('はじめからの合計', tx, ty + 180);
  let srows = [['W（気体がした仕事）', sum.W], ['Q（もらった熱）', sum.Q], ['ΔU', sum.dU], ['Q − W', sum.Q - sum.W], ['ΔS', sum.dS]];
  textSize(14);
  for (let k = 0; k < srows.length; k++) { fill(175); text(srows[k][0], tx, ty + 208 + k * 22); fill(235); text(srows[k][1].toFixed(k === 4 ? 4 : 2), tx + 170, ty + 208 + k * 22); }
  fill(170); textSize(13); ['式：等温 W = nRT ln(V₂/V₁)', '断熱 W = (P₁V₁ − P₂V₂)/(γ − 1)', '定圧 W = PΔV　定積 W = 0', 'ΔS = nCv ln(T₂/T₁) + nR ln(V₂/V₁)'].forEach((t, k) => text(t, tx, ty + 340 + 20 * k));

  fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('PV 図と 4 つの過程　いま「' + KINDS[kind] + '」　' + GASES[gasIdx].name + '　γ = ' + gam().toFixed(3) + '　Cv = ' + (cv() / R_GAS).toFixed(1) + 'R', 20, 36);
  fill(175); textSize(15);
  text('1 等温　2 断熱　3 定圧　4 定積　← → ' + (kind === 4 ? '温度' : '体積') + '　PV 図をドラッグ　↑↓ γ　R 最初から　C 線を消す', 20, 62);
  text('黄色の面積 = 最後の過程の仕事 W。体積が増えると W > 0（気体が外に仕事をする）。うすい線は等温線（200〜1000 K）', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key >= '1' && key <= '4') kind = +key;
  if (key === RIGHT_ARROW) move(kind === 4 ? cur.T + 25 : cur.V + 1);
  if (key === LEFT_ARROW) move(kind === 4 ? cur.T - 25 : cur.V - 1);
  if (key === UP_ARROW) gasIdx = Math.min(2, gasIdx + 1);
  if (key === DOWN_ARROW) gasIdx = Math.max(0, gasIdx - 1);
  if (key === 'r' || key === 'R') resetAll();
  if (key === 'c' || key === 'C') legs = [];
  return false;
}
function mousePressed() { dragging = true; }
function mouseReleased() { dragging = false; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let Cv = 1.5 * R_GAS, g = 5 / 3, s = { V: 10, T: 300 };
  let a = runLeg(s, 1, 30, Cv, g, 2000);
  check('等温 10 → 30 L：W 数値 = nRT ln 3 = ' + a.Wc.toFixed(2) + ' J（相対 1e-4）、Q = W', Math.abs(a.W / (R_GAS * 300 * Math.log(3)) - 1) < 1e-4 && Math.abs(a.Q / a.W - 1) < 1e-4);
  let b = runLeg(s, 2, 30, Cv, g, 2000), pv = b.pts.map((p) => p[1] * Math.pow(p[0], g));
  check('断熱：PV^γ が一定、W 数値 = (P₁V₁ − P₂V₂)/(γ − 1)、Q ≈ 0', pv.every((x) => near(x / pv[0], 1, 1e-12)) && Math.abs(b.W / b.Wc - 1) < 1e-4 && Math.abs(b.Q) < 1e-3 * Math.abs(b.W));
  let c = runLeg(s, 3, 25, Cv, g, 400);
  check('定圧：W = PΔV、Q = nCpΔT（Cp = Cv + R）', near(c.W, ((R_GAS * 300) / 10) * 15, 1e-6) && near(c.Q, (Cv + R_GAS) * (c.s.T - 300), 1e-6));
  let d = runLeg(s, 4, 500, Cv, g, 400);
  check('定積：W = 0、Q = nCvΔT', d.W === 0 && near(d.Q, Cv * 200, 1e-9));
  let p1 = runLeg(s, 1, 30, Cv, g, 2000), p2 = runLeg(p1.s, 4, 450, Cv, g, 2000), q1 = runLeg(s, 4, 450, Cv, g, 2000), q2 = runLeg(q1.s, 1, 30, Cv, g, 2000);
  check('エントロピーは道すじによらない：Σ dQ/T（等温→定積）=（定積→等温）= 式（1e-4）', near(p1.dS + p2.dS, q1.dS + q2.dS, 1e-4) && near(p1.dS + p2.dS, p1.dSc + p2.dSc, 1e-4));
  let e1 = runLeg(s, 3, 30, Cv, g, 400), e2 = runLeg(e1.s, 4, 150, Cv, g, 400), e3 = runLeg(e2.s, 3, 10, Cv, g, 400), e4 = runLeg(e3.s, 4, 300, Cv, g, 400);
  let Wc = e1.W + e2.W + e3.W + e4.W, Qc = e1.Q + e2.Q + e3.Q + e4.Q, area = (((R_GAS * 300) / 10) - (R_GAS * 150) / 30) * 20;
  check('長方形のサイクル：1 周で ΔU = 0 → Q = W = 囲まれた面積 ' + area.toFixed(1) + ' J', near(e4.s.T, 300, 1e-9) && near(Wc, area, 1e-6) && near(Qc, Wc, 1e-6));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1（等温）と 2（断熱）で、同じ 20 L → 40 L に広げよう。線の傾きはどちらが急？ W はどちらが大きい？
// 2. 断熱で圧縮すると温度はどうなる？（ディーゼルエンジンの着火、自転車の空気入れ）
// 3. ↑↓ で γ を変えて断熱線を比べよう。単原子の気体のほうが急なのはなぜ？
// 4. 3 → 4 → 3 → 4 で 1 周して元にもどろう。合計の ΔU は？ Q − W は？
// 5. 同じ 2 つの状態の間を、ちがう道すじで行こう。W と Q は変わるのに、ΔS は変わらない？


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
