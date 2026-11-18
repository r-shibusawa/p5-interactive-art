// ============================================
// 01 ワットの遠心調速機（ガバナー）
// 回転が速くなると 2 つの球が遠心力で開き、てこが蒸気弁をしぼる → 回転が下がる。負荷が変わっても回転数がほぼ一定
// 摩擦（球の動きのブレーキ）が小さすぎたりゲインが大きすぎると「ハンチング」（ゆれ続ける）。マクスウェル「調速機について」（1868）の安定条件を数で表示
// 1 2 3 = 変える量（負荷・摩擦・ゲイン） / ↑↓ = 値を変える / スペース = 負荷を急に増やす・戻す / F = 調速機を外す（弁を固定） / R = 回転をゆらす
// ============================================

const GL = 30;              // ★ 重力 ÷ 腕の長さ（g / l）[1/s²]
const KT = 10, BE = 0.5;    // ★ 蒸気のトルクの強さ、エンジンの摩擦（回るほどブレーキ）
const U0 = 0.5, PHI0 = 0.6; // 腕の角度が PHI0 のとき弁の開き U0
let par = { L: 2, c: 5, kv: 0.6, fb: true };   // ★ 負荷 L・球の摩擦 c・ゲイン kv（角度 1 rad で弁がどれだけ閉じるか）
let st, theta = 0, hist = [], sel = 1, tNow = 0, Lbase = 2;
const H = 1 / 240;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  st = equilibrium(par);
}

// 弁の開き u（0〜1）：腕が開くほど閉じる。F で外すと U0 のまま
function valve(phi, p) { return p.fb ? clampv(U0 - p.kv * (phi - PHI0), 0, 1) : U0; }
// 状態 s = [腕の角度 φ, 角速度 φ', エンジンの回転 ω]
function govDeriv(s, p) {
  let [ph, pd, w] = s;
  return [pd,
    w * w * Math.sin(ph) * Math.cos(ph) - GL * Math.sin(ph) - p.c * pd,   // 遠心力 − 重力 − 摩擦
    KT * valve(ph, p) - p.L - BE * w];                                   // 蒸気 − 負荷 − 摩擦（慣性 1）
}
function govStep(s, p, h) {
  let n = rk4(govDeriv, s, p, h);
  if (n[0] < 0.05) { n[0] = 0.05; n[1] = Math.max(0, n[1]); }          // 腕のストッパー
  if (n[0] > 1.45) { n[0] = 1.45; n[1] = Math.min(0, n[1]); }
  return [n[0], clampv(fin(n[1], 0), -50, 50), clampv(fin(n[2], 0), 0, 40)];
}
// つり合い：cos φ = GL / ω²、KT·u(φ) = L + BE·ω を 2 分法で
function equilibrium(p) {
  if (!p.fb) { let w = Math.max(0, (KT * U0 - p.L) / BE); return [w * w > GL ? Math.acos(GL / (w * w)) : 0.05, 0, w]; }   // 弁が固定なら式で
  let lo = Math.sqrt(GL) + 1e-9, hi = 40;
  for (let k = 0; k < 200; k++) {
    let w = (lo + hi) / 2, ph = Math.acos(GL / (w * w));
    if (KT * valve(ph, p) - p.L - BE * w > 0) lo = w; else hi = w;
  }
  let w = (lo + hi) / 2;
  return [Math.acos(GL / (w * w)), 0, w];
}
// つり合いのまわりで線形化（数値微分のヤコビ行列）→ 特性方程式 s³ + a2 s² + a1 s + a0
function charPoly(p) {
  let s = equilibrium(p), A = [], e = 1e-6;
  for (let i = 0; i < 3; i++) A.push([0, 0, 0]);
  for (let j = 0; j < 3; j++) {
    let sp = s.slice(), sm = s.slice(); sp[j] += e; sm[j] -= e;
    let fp = govDeriv(sp, p), fm = govDeriv(sm, p);
    for (let i = 0; i < 3; i++) A[i][j] = (fp[i] - fm[i]) / (2 * e);
  }
  let tr = A[0][0] + A[1][1] + A[2][2];
  let m2 = A[0][0] * A[1][1] - A[0][1] * A[1][0] + A[0][0] * A[2][2] - A[0][2] * A[2][0] + A[1][1] * A[2][2] - A[1][2] * A[2][1];
  let det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  return { a2: -tr, a1: m2, a0: -det };
}
// 安定の条件（3 次のラウス＝フルビッツ）：a2, a1, a0 > 0 かつ a2·a1 > a0
function isStable(cp) { return cp.a2 > 0 && cp.a1 > 0 && cp.a0 > 0 && cp.a2 * cp.a1 > cp.a0; }

function draw() {
  background(24, 35, 10);
  for (let k = 0; k < 4; k++) { st = govStep(st, par, H); tNow += H; }
  theta += st[2] / 60;
  let eq = equilibrium(par), u = valve(st[0], par);
  hist.push([st[2], eq[2], u]); if (hist.length > 720) hist.shift();
  let cp = charPoly(par), ok = isStable(cp);
  let ws = hist.slice(-240).map((h) => h[0]), amp = (Math.max(...ws) - Math.min(...ws)) / 2;

  say('ワットの遠心調速機 ─ 回転が上がると球が開き、弁をしぼる（負のフィードバック）', 20, 36, 20);
  let names = ['負荷 L = ' + par.L.toFixed(1), '球の摩擦 c = ' + par.c.toFixed(1), 'ゲイン kv = ' + par.kv.toFixed(2)];
  say(names.map((s, i) => (i + 1 === sel ? '▶' : '　') + (i + 1) + ' ' + s).join('　') + '　↑↓ 変える　スペース 負荷 +1　F 調速機 ' + (par.fb ? 'ON' : '外した') + '　R ゆらす', 20, 62, 15, C_SUB);

  // ---- 調速機の絵
  let cx = width * 0.22, top = 130, Lp = Math.min(150, height * 0.2);
  stroke(col(C_BRASS)); strokeWeight(6); line(cx, top - 20, cx, top + Lp * 1.6);
  let sleeveY = top + 2 * Lp * Math.cos(st[0]) * 0.55;
  for (let sgn of [-1, 1]) {
    let c3 = Math.cos(theta) * sgn, bx = cx + Lp * Math.sin(st[0]) * c3, by = top + Lp * Math.cos(st[0]);
    stroke(col(C_BRASS)); strokeWeight(4); line(cx, top, bx, by);
    line((cx + bx) / 2, (top + by) / 2, cx, sleeveY);
    noStroke(); fill(col(C_TUBE, 70 + 30 * Math.sin(theta) * sgn)); circle(bx, by, 34 + 8 * Math.sin(theta) * sgn);
  }
  fill(col(C_BRASS)); rect(cx - 16, sleeveY - 8, 32, 16, 4);
  // てこと弁
  let vx = cx + 230, vy = sleeveY;
  stroke(col(C_SUB)); strokeWeight(4); line(cx + 16, sleeveY, vx, vy - 60 * (U0 - u));
  noStroke(); fill(28, 20, 30); rect(vx + 20, top + 120, 220, 50, 6);
  fill(col(C_TUBE, 30 + 60 * u)); rect(vx + 20, top + 120, 220 * u, 50, 6);
  say('蒸気弁の開き u = ' + u.toFixed(3), vx + 20, top + 110, 15, C_TUBE);
  say('エンジン ω = ' + st[2].toFixed(3) + ' rad/s（' + (st[2] * 60 / TWO_PI).toFixed(1) + ' rpm）', vx + 20, top + 200, 16, C_SCOPE);
  say('つり合い ω* = ' + eq[2].toFixed(3) + '　腕 φ = ' + (st[0] * 180 / PI).toFixed(1) + '°', vx + 20, top + 224, 15);

  // ---- 安定の判定（数で）
  let mx = width * 0.62, my = 110;
  say('線形化した特性方程式  s³ + a₂s² + a₁s + a₀ = 0', mx, my, 16);
  say('a₂ = ' + cp.a2.toFixed(3) + '　a₁ = ' + cp.a1.toFixed(3) + '　a₀ = ' + cp.a0.toFixed(3), mx, my + 28, 15, C_TUBE);
  say('安定の条件 a₂·a₁ > a₀：' + (cp.a2 * cp.a1).toFixed(2) + (ok ? ' > ' : ' ≤ ') + cp.a0.toFixed(2), mx, my + 56, 16, ok ? C_SCOPE : C_ALARM);
  say(par.fb ? (ok ? '→ 安定：ゆれは消える' : '→ 不安定：ハンチング（ゆれ続ける）') : '調速機なし：弁は固定', mx, my + 84, 18, par.fb ? (ok ? C_SCOPE : C_ALARM) : C_SUB);
  say('測ったゆれの振幅（直近 4 秒）= ' + amp.toFixed(3) + ' rad/s', mx, my + 112, 15);
  let pf = { ...par, L: par.L + 1 }, d1 = equilibrium(pf)[2] - eq[2], d0 = (KT * U0 - par.L - 1) / BE - (KT * U0 - par.L) / BE;
  say('負荷 +1 での回転の変化：調速機あり ' + (par.fb ? d1.toFixed(3) : '—') + '、なし ' + d0.toFixed(3) + ' rad/s', mx, my + 140, 15);
  say('摩擦 c を下げる・ゲイン kv を上げると条件がくずれる', mx, my + 168, 14, C_SUB);
  say('（マクスウェル 1868：ゆれが減るかは特性方程式の係数で決まる）', mx, my + 190, 14, C_SUB);

  // ---- 時間グラフ
  let gx = 40, gy = height * 0.55, gw = width - 80, gh = height - gy - 50;
  let lo = eq[2] - 3, hi = eq[2] + 3;
  plotFrame(gx, gy, gw, gh, '回転 ω（緑）とつり合い ω*（点線）±3 rad/s、弁の開き u（オレンジ、0〜1）　12 秒分');
  hLine(eq[2], gx, gy, gw, gh, lo, hi, C_BRASS);
  plotLine(hist.map((h) => h[2]), gx, gy, gw, gh, 0, 1, C_TUBE, 720, 1.5);
  plotLine(hist.map((h) => h[0]), gx, gy, gw, gh, lo, hi, C_SCOPE, 720, 2.5);
  drawSelfTest();
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') sel = +key;
  let d = key === UP_ARROW ? 1 : key === DOWN_ARROW ? -1 : 0;
  if (d) {
    if (sel === 1) par.L = clampv(par.L + 0.5 * d, 0, 4);
    if (sel === 2) par.c = clampv(par.c + 0.5 * d, 0.5, 12);
    if (sel === 3) par.kv = clampv(par.kv + 0.1 * d, 0.1, 2);
  }
  if (key === ' ') par.L = par.L >= Lbase + 1 ? Lbase : Lbase + 1;
  if (sel === 1 && d) Lbase = par.L;
  if (key === 'f' || key === 'F') par.fb = !par.fb;
  if (key === 'r' || key === 'R') st[2] = clampv(st[2] + 1, 0, 40);
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let p = { L: 2, c: 5, kv: 0.6, fb: true }, e = equilibrium(p), d = govDeriv(e, p);
  check('つり合いの点では変化が 0（|ds/dt| < 1e-9）', Math.abs(d[0]) < 1e-9 && Math.abs(d[1]) < 1e-9 && Math.abs(d[2]) < 1e-9);
  let pL = { ...p, L: 3 }, dClosed = Math.abs(equilibrium(pL)[2] - e[2]), dOpen = Math.abs(equilibrium({ ...pL, fb: false })[2] - equilibrium({ ...p, fb: false })[2]);
  check('負荷 +1：調速機ありの回転の変化 ' + dClosed.toFixed(3) + ' は なし ' + dOpen.toFixed(1) + ' の 1/5 以下', dClosed < dOpen / 5 && near(dOpen, 1 / BE, 1e-6));
  for (let c of [2, 5]) {
    let q = { ...p, c }, cp = charPoly(q), ok = isStable(cp), s = equilibrium(q); s[2] += 0.05;
    let late = 0, eq = equilibrium(q)[2];
    for (let k = 0; k < 30 * 240; k++) { s = govStep(s, q, H); if (k > 25 * 240) late = Math.max(late, Math.abs(s[2] - eq)); }
    check('c = ' + c + '：条件 a₂a₁ > a₀ は ' + (ok ? '成立' : '不成立') + '、シミュレーションのゆれ（25〜30 秒）= ' + late.toExponential(1) + (ok ? ' で消える' : ' で残る'), ok ? late < 1e-3 : late > 0.5);
  }
  let big = charPoly({ ...p, kv: 1.5 }), small = charPoly({ ...p, kv: 0.3 });
  check('ゲイン kv を上げると a₀ が増えて条件がくずれる（kv = 0.3 安定、1.5 不安定）', isStable(small) && !isStable(big) && big.a0 > small.a0);
  let s = equilibrium(p); s[0] = 1.4; s[2] = 30; let bad = false;
  for (let k = 0; k < 20 * 240; k++) { s = govStep(s, { ...p, c: 0.5 }, H); if (!s.every(Number.isFinite)) bad = true; }
  check('極端なゆれ（c = 0.5、ω = 30 から）でも NaN にならない', !bad);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 で摩擦を選び、↓ で少しずつ下げる。a₂·a₁ と a₀ が入れかわる所でゆれ方はどう変わる？
// 2. スペースで負荷を増やす。調速機あり／なし（F）で回転数の落ち方を比べよう
// 3. 3 でゲイン kv を上げると、負荷による回転数のずれは小さくなる。でも安定は？（性能と安定のかけひき）
// 4. GL（腕の長さ）を変えると、つり合いの回転数はどう変わる？
// 5. 1868 年のマクスウェルの論文は、この「a₂·a₁ > a₀」のような条件を調速機について調べたもの。理由を考えてみよう


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
// ---- 4 次のルンゲ＝クッタ法（f(s, p) = ds/dt、s は配列）
function rk4(f, s, p, h) {
  let k1 = f(s, p), k2 = f(s.map((v, i) => v + (h / 2) * k1[i]), p);
  let k3 = f(s.map((v, i) => v + (h / 2) * k2[i]), p), k4 = f(s.map((v, i) => v + h * k3[i]), p);
  return s.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
