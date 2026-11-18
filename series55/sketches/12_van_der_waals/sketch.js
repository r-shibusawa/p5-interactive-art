// ============================================
// 12 気体と液体（ファン・デル・ワールス）─ 分子の大きさ b と引き合う力 a を入れた状態方程式
// (P + a/V²)(V − b) = RT。臨界点で割った「換算単位」では P = 8T/(3V − 1) − 3/V²（どの気体でも同じ形）
// 臨界温度より低いと等温線が波打つ → 本当は液体と気体が共存して圧力が一定（水平な線）
// その高さは「上と下の面積が等しい」所（マクスウェルの等面積則）。二分法で数値的に求める
// ↑↓ 温度 / マウスを左右 体積を動かす / M 波打つ線 ⇔ 共存の線 / I 理想気体の線 / スペース 共存の範囲（ドーム）
// ============================================

const T_LIST = [0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.2];   // ★ うすく描く等温線
const CO2 = { a: 0.364, b: 4.267e-5 };   // ★ 二酸化炭素の a [Pa·m⁶/mol²]、b [m³/mol]
const R_GAS = 8.314;
let tr = 0.9, showLoop = false, showIdeal = true, showDome = true, dome = [];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); dome = makeDome(); }
function pVdw(V, t) { return (8 * t) / (3 * V - 1) - 3 / (V * V); }
function pInt(V, t) { return ((8 * t) / 3) * Math.log(3 * V - 1) + 3 / V; }   // ∫P dV（式で）
function pIdeal(V, t) { return (8 * t) / (3 * V); }
function dP(V, t) { return (-24 * t) / (3 * V - 1) ** 2 + 6 / V ** 3; }
function bisect(f, lo, hi, n) { let flo = f(lo); for (let k = 0; k < (n || 100); k++) { let m = (lo + hi) / 2, fm = f(m); if (fm * flo > 0) { lo = m; flo = fm; } else hi = m; } return (lo + hi) / 2; }
// 波の山と谷（dP/dV = 0 の 2 点）
function spinodal(t) { return [bisect((V) => dP(V, t), 0.34, 1, 80), bisect((V) => dP(V, t), 1, 30, 80)]; }
// 圧力 p の水平線と等温線の交点（左・右）
function roots(p, t, sp) { return [bisect((V) => pVdw(V, t) - p, 0.3334, sp[0]), bisect((V) => pVdw(V, t) - p, sp[1], 5000)]; }
// マクスウェルの等面積則：∫(P − p*)dV = 0 になる p* を二分法で
function maxwell(t) {
  if (t >= 1) return null;
  let sp = spinodal(t), pLo = Math.max(1e-6, pVdw(sp[0], t)), pHi = pVdw(sp[1], t);
  let area = (p) => { let r = roots(p, t, sp); return pInt(r[1], t) - pInt(r[0], t) - p * (r[1] - r[0]); };
  let p = bisect(area, pLo + 1e-9, pHi - 1e-9, 80), r = roots(p, t, sp);
  return { p, vl: r[0], vg: r[1], sp };
}
function makeDome() { let d = []; for (let t = 0.8; t < 0.9999; t += 0.004) { let m = maxwell(t); if (m) d.push([m.vl, m.vg, m.p]); } return d; }
// 状態方程式で計算した圧力（共存の所は水平な線）
const memo = new Map();
function maxwellC(t) { if (!memo.has(t)) memo.set(t, maxwell(t)); return memo.get(t); }   // 同じ温度は 1 回だけ計算
function pressure(V, t, loop) { let m = !loop && maxwellC(t); return m && V > m.vl && V < m.vg ? m.p : pVdw(V, t); }

function draw() {
  background(22, 22, 28);
  let g = { x: 90, y: 110, w: width * 0.62, h: height - 220, x0: 0.4, x1: 5, y0: 0, y1: 2, logx: true };
  plotAxes(g, '体積 V/Vc（対数）', '圧力 P/Pc', [0.5, 1, 2, 5], [0, 0.5, 1, 1.5, 2]);
  let vs = Array.from({ length: 300 }, (_, k) => 0.4 * Math.pow(5 / 0.4, k / 299));
  strokeWeight(1);
  for (let t of T_LIST) { stroke(t < 1 ? color(120, 170, 255, 70) : t === 1 ? color(255, 255, 255, 120) : color(255, 150, 90, 70)); polyline(vs.map((V) => [gX(g, V), gY(g, clampv(pressure(V, t, showLoop), -0.1, 2.1))])); }
  // 共存のドーム
  if (showDome && dome.length) { noStroke(); fill(120, 200, 255, 30); beginShape(); for (let d of dome) vertex(gX(g, d[0]), gY(g, d[2])); vertex(gX(g, 1), gY(g, 1)); for (let k = dome.length - 1; k >= 0; k--) vertex(gX(g, dome[k][1]), gY(g, dome[k][2])); endShape(CLOSE); }
  // 選んだ温度
  let m = maxwellC(tr);
  if (m) {                             // 等面積：水平線と波の間の 2 つの面積
    noStroke(); fill(255, 120, 80, 90); beginShape(); vertex(gX(g, m.vl), gY(g, m.p));
    for (let V of vs) if (V > m.vl && V < m.vg && pVdw(V, tr) < m.p) vertex(gX(g, V), gY(g, Math.max(-0.1, pVdw(V, tr)))); endShape(CLOSE);
    fill(120, 220, 140, 90); beginShape();
    for (let V of vs) if (V > m.vl && V < m.vg && pVdw(V, tr) >= m.p) vertex(gX(g, V), gY(g, pVdw(V, tr))); endShape(CLOSE);
    stroke(255, 255, 255, 120); strokeWeight(1); polyline(vs.filter((V) => V > m.vl && V < m.vg).map((V) => [gX(g, V), gY(g, clampv(pVdw(V, tr), -0.1, 2.1))]));
  }
  stroke(255, 210, 120); strokeWeight(3); polyline(vs.map((V) => [gX(g, V), gY(g, clampv(pressure(V, tr, showLoop), -0.1, 2.1))]));
  if (showIdeal) { stroke(200, 200, 200, 120); strokeWeight(1.5); polyline(vs.map((V) => [gX(g, V), gY(g, Math.min(2.1, pIdeal(V, tr)))])); }
  noStroke(); fill(255, 90, 90); circle(gX(g, 1), gY(g, 1), 10);
  // マウスの体積の状態
  let V = clampv(0.4 * Math.pow(5 / 0.4, (mouseX - g.x) / g.w), 0.4, 5), P = pressure(V, tr, false), xg = m && V > m.vl && V < m.vg ? (V - m.vl) / (m.vg - m.vl) : V < (m ? m.vl : 1) ? 0 : 1;
  fill(255); circle(gX(g, V), gY(g, Math.min(P, 2.05)), 12);
  // 容器の絵（液体と気体の割合：てこの規則）
  let cx = g.x + g.w + 70, cy = 140, cw = width - cx - 40, ch = 260, liq = m && V > m.vl && V < m.vg ? 1 - xg : V < (m ? m.vl : 1) && tr < 1 ? 1 : 0;
  noFill(); stroke(200); strokeWeight(2); rect(cx, cy, cw, ch);
  noStroke(); fill(80, 140, 230, 200); rect(cx + 2, cy + ch - (ch - 4) * liq * 0.5, cw - 4, (ch - 4) * liq * 0.5);
  fill(230, 230, 240, 160); for (let k = 0; k < 30 * (1 - liq); k++) circle(cx + 10 + ((k * 53) % (cw - 20)), cy + 10 + ((k * 37) % Math.max(10, (ch - 20) * (1 - liq * 0.5))), 5);
  fill(235); textSize(15);
  text(liq === 1 ? '液体' : liq === 0 ? (tr >= 1 ? '超臨界の流体（区別なし）' : '気体') : '液体 ' + (liq * 100).toFixed(0) + '% + 気体 ' + (xg * 100).toFixed(0) + '%', cx, cy + ch + 26);
  text('V/Vc = ' + V.toFixed(3) + '　P/Pc = ' + P.toFixed(4), cx, cy + ch + 50);
  // CO₂ の例（本当の単位）
  let tcK = (8 * CO2.a) / (27 * R_GAS * CO2.b), pcM = CO2.a / (27 * CO2.b * CO2.b) / 1e6;
  fill(170); textSize(13);
  ['CO₂：Tc = 8a/(27Rb) = ' + tcK.toFixed(1) + ' K', 'Pc = a/(27b²) = ' + pcM.toFixed(2) + ' MPa', 'いまの温度 = ' + (tr * tcK).toFixed(1) + ' K（' + (tr * tcK - 273.15).toFixed(1) + ' °C）', m ? '共存の圧力 = ' + (m.p * pcM).toFixed(2) + ' MPa' : '臨界温度より上：液化しない'].forEach((s, k) => text(s, cx, cy + ch + 90 + 20 * k));

  fill(240); textSize(18); textAlign(LEFT, BASELINE);
  text('ファン・デル・ワールス気体　T/Tc = ' + tr.toFixed(3) + (m ? '　共存の圧力 P* = ' + m.p.toFixed(4) + '　液体 V = ' + m.vl.toFixed(3) + '　気体 V = ' + m.vg.toFixed(3) : '　（臨界温度より上：1 本の曲線）'), 20, 36);
  fill(175); textSize(15);
  text('↑↓ 温度　マウス 体積　M ' + (showLoop ? '波打つ線' : '共存の水平線') + '　I 理想気体（灰色）　スペース ドーム　｜ 赤い点 = 臨界点', 20, 62);
  text(m ? '赤と緑の面積が等しい（マクスウェルの等面積則）。差 = ' + (pInt(m.vg, tr) - pInt(m.vl, tr) - m.p * (m.vg - m.vl)).toExponential(1) : 'Tc より上では、押し縮めても液体と気体に分かれない', 20, 86);
  drawSelfTest(width - 170, height - 12);
}

function keyPressed() {
  if (key === UP_ARROW) tr = Math.min(1.3, Math.round((tr + 0.01) * 1000) / 1000);
  if (key === DOWN_ARROW) tr = Math.max(0.8, Math.round((tr - 0.01) * 1000) / 1000);
  if (key === 'm' || key === 'M') showLoop = !showLoop;
  if (key === 'i' || key === 'I') showIdeal = !showIdeal;
  if (key === ' ') showDome = !showDome;
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let h = 1e-3, d1 = dP(1, 1), d2 = (pVdw(1 + h, 1) - 2 * pVdw(1, 1) + pVdw(1 - h, 1)) / (h * h);
  check('臨界点 (V, T) = (1, 1) で P = 1、dP/dV = 0、d²P/dV² = 0', near(pVdw(1, 1), 1, 1e-12) && Math.abs(d1) < 1e-12 && Math.abs(d2) < 1e-3);
  let tcK = (8 * CO2.a) / (27 * R_GAS * CO2.b), pc = CO2.a / (27 * CO2.b * CO2.b);
  check('CO₂：Tc = 8a/(27Rb) = ' + tcK.toFixed(1) + ' K ≈ 304 K、Pc ≈ 7.4 MPa', Math.abs(tcK - 304) < 1.5 && Math.abs(pc / 1e6 - 7.4) < 0.1);
  let m = maxwell(0.9);
  check('T = 0.9 の共存：P* = ' + m.p.toFixed(4) + ' ≈ 0.647、V液 = ' + m.vl.toFixed(3) + ' < 1 < V気 = ' + m.vg.toFixed(3), Math.abs(m.p - 0.647) < 0.002 && m.vl < 1 && m.vg > 1);
  let A = 0, n = 20000; for (let k = 0; k < n; k++) { let a = m.vl + ((m.vg - m.vl) * k) / n, b = a + (m.vg - m.vl) / n; A += 0.5 * (pVdw(a, 0.9) + pVdw(b, 0.9) - 2 * m.p) * (b - a); }
  let lobe = 0; for (let k = 0; k < n; k++) { let a = m.vl + ((m.vg - m.vl) * k) / n; lobe += Math.abs(pVdw(a, 0.9) - m.p) * ((m.vg - m.vl) / n) / 2; }
  check('等面積：台形の数値積分でも ∫(P − P*)dV ≈ 0（片側の面積の 10⁻⁴ 以下）', Math.abs(A) < 1e-4 * lobe);
  check('両はしは同じ圧力の上：P(V液) = P(V気) = P*', near(pVdw(m.vl, 0.9), m.p, 1e-9) && near(pVdw(m.vg, 0.9), m.p, 1e-9));
  let m2 = maxwell(0.99), mono = true; for (let V = 0.4; V < 10; V += 0.01) if (dP(V, 1.1) >= 0) mono = false;
  check('Tc に近づくと共存の幅が縮み（T = 0.99）、Tc より上（T = 1.1）は波がない', m2.vg - m2.vl < m.vg - m.vl && mono);
  check('うすい気体（V = 200）では理想気体 8T/3V とほぼ同じ（1%）', Math.abs(pVdw(200, 0.9) / pIdeal(200, 0.9) - 1) < 0.01);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で温度を変え、波がなくなる温度（臨界温度 T = 1）を確かめよう
// 2. M で波打つ線を出し、赤と緑の面積を見比べよう。水平線を上げ下げすると面積はどう変わる？
// 3. マウスで体積を小さくしていくと、どこから液体ができ始める？ 全部液体になるのは？
// 4. I の理想気体の線と比べて、体積が小さいときに大きくずれるのはなぜ？（分子の大きさ b、引き合う力 a）
// 5. CO₂ の値を水（a = 0.5536、b = 3.049e-5）に変えて、水の臨界温度を計算しよう（本当は 647 K）


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
