// ============================================
// 11 存続可能システムモデル（ビア 1972）の考え方
// 4 つの現場（システム 1）が、同じ倉庫（共有の資源）から品物を取り寄せて在庫を目標に保とうとする。届くまでに遅れがあるので、
// 各自がばらばらに注文すると在庫が大きくゆれる。調整（システム 2）＝「注文中の分も数える」を入れるとゆれが減る
// 在庫が尽きそうになると、まっすぐ上（システム 3）へ「痛み」の信号（アルゲドニック信号）が飛び、倉庫から緊急に届ける
// 2 = 調整 ON/OFF / 3 = 緊急信号 ON/OFF / ↑↓ = 届くまでの遅れ / ←→ = 注文の強さ k / 現場をクリック = 注文が急に増える / R = やり直し
// ============================================

const NUNIT = 4;
const TARGET = 20;        // ★ 在庫の目標（システム 5 の方針）
const PROD = 22;          // ★ 倉庫に入ってくる量（1 日あたり）。需要の平均は 4 × 5 = 20
const PMAX = 120;         // 倉庫の大きさ（あふれた分は捨てる）
const ALARM = 3;          // ★ これより在庫が減ると緊急信号
const DT = 0.1;           // 1 きざみ = 0.1 日
let par = { s2: false, s3: true, delay: 4, k: 0.5 };
let sim, hist = [], speed = 4;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  sim = makeSim(1);
}
// ---- 組織の状態
function makeSim(seed) {
  let r = makeRng(seed), u = [];
  for (let i = 0; i < NUNIT; i++) u.push({ q: TARGET, pipe: [], ph: 6.28 * r(), shock: 0, alarms: 0, emerg: 0, dev2: 0, n: 0 });
  return { t: 0, P: 60, units: u, produced: 0, wasted: 0, used: 0, q0: NUNIT * TARGET + 60, signal: -1 };
}
function demand(u, t) { return 5 + 1.5 * Math.sin(0.35 * t + u.ph) + u.shock; }
function inPipe(u) { return u.pipe.reduce((a, b) => a + b.amt, 0); }
// ---- 1 きざみ
function simStep(s, p) {
  let req = s.units.map((u) => {
    let d = demand(u, s.t), want;
    if (p.s2) want = d + p.k * (TARGET + d * p.delay - u.q - inPipe(u));   // 調整あり：注文中（まだ届いていない分）も数える
    else want = d + p.k * (TARGET - u.q);                                   // 調整なし：目の前の在庫だけを見る
    return Math.max(0, want) * DT;
  });
  let tot = req.reduce((a, b) => a + b, 0), f = tot > s.P ? s.P / tot : 1;  // 倉庫が足りなければ全員を同じ割合でへらす
  s.signal = -1;
  s.units.forEach((u, i) => {
    let g = req[i] * f; s.P -= g; u.pipe.push({ amt: g, at: s.t + p.delay });
    while (u.pipe.length && u.pipe[0].at <= s.t + 1e-9) u.q += u.pipe.shift().amt;
    let d = demand(u, s.t) * DT; u.q -= d; s.used += d;
    if (p.s3 && u.q < ALARM && s.P > 0) {                                  // 痛みの信号 → システム 3 が直接届ける
      let e = Math.min(s.P, (TARGET / 2 - u.q) * 0.2); s.P -= e; u.q += e; u.emerg += e; u.alarms++; s.signal = i;
    }
    u.shock = Math.max(0, u.shock - 0.6 * DT);
    if (s.t > 30) { u.dev2 += (u.q - TARGET) ** 2; u.n++; }
  });
  s.P += PROD * DT; s.produced += PROD * DT;
  if (s.P > PMAX) { s.wasted += s.P - PMAX; s.P = PMAX; }
  s.t += DT;
}
function total(s) { return s.P + s.units.reduce((a, u) => a + u.q + inPipe(u), 0); }
function rmsDev(s) { let a = 0, n = 0; for (let u of s.units) { a += u.dev2; n += u.n; } return n ? Math.sqrt(a / n) : 0; }

function draw() {
  background(24, 35, 10);
  for (let k = 0; k < speed; k++) simStep(sim, par);
  hist.push(sim.units.map((u) => u.q)); if (hist.length > 600) hist.shift();

  say('存続可能システム（ビア）─ 現場どうしのゆれを「調整」と「痛みの信号」でおさえる', 20, 36, 20);
  say('2 調整 ' + (par.s2 ? 'ON' : 'OFF') + '　3 緊急信号 ' + (par.s3 ? 'ON' : 'OFF') + '　↑↓ 遅れ ' + par.delay + ' 日　←→ 注文の強さ k = ' + par.k.toFixed(2) + '　現場をクリック 注文が急増　R やり直し', 20, 62, 15, C_SUB);

  // ---- 図：5 つのシステム
  let x0 = 30, y0 = 100, bw = 210, bh = 52;
  blockBox(x0, y0, bw, bh, 'システム 5 方針', '在庫の目標 ' + TARGET, C_BRASS);
  blockBox(x0, y0 + 70, bw, bh, 'システム 4 外を見る', '需要の平均 ' + (sim.units.reduce((a, u) => a + demand(u, sim.t), 0)).toFixed(1) + '/日', C_BRASS);
  blockBox(x0, y0 + 140, bw, bh, 'システム 3 管理（倉庫）', 'P = ' + sim.P.toFixed(1), sim.signal >= 0 ? C_ALARM : C_TUBE);
  blockBox(x0, y0 + 210, bw, bh, 'システム 2 調整', par.s2 ? '注文中も数える' : 'なし', par.s2 ? C_SCOPE : C_SUB);
  let ux = x0 + bw + 50, uw = (width * 0.62 - ux) / NUNIT - 12;
  sim.units.forEach((u, i) => {
    let x = ux + i * (uw + 12), y = y0 + 140;
    stroke(col(u.q < ALARM ? C_ALARM : C_TUBE)); strokeWeight(2); fill(25, 40, 16); rect(x, y, uw, 120, 8);
    noStroke(); fill(0, 0, 100, 8); rect(x + 10, y + 34, uw - 20, 60, 4);
    fill(col(u.q < ALARM ? C_ALARM : C_SCOPE)); let hq = clampv(u.q / (2 * TARGET), 0, 1) * 60; rect(x + 10, y + 94 - hq, uw - 20, hq, 4);
    say('現場 ' + (i + 1), x + 10, y + 24, 14);
    say('在庫 ' + u.q.toFixed(1), x + 10, y + 112, 13); say('注文中 ' + inPipe(u).toFixed(1), x + 10, y - 8, 12, C_SUB);
    stroke(col(C_SUB, 50)); strokeWeight(1.5); line(x0 + bw, y0 + 165, x, y + 30);
    if (sim.signal === i) { stroke(col(C_ALARM)); strokeWeight(4); line(x + uw / 2, y, x0 + bw, y0 + 166); }
  });
  say('現場 1〜4 = システム 1　赤い線 = 痛みの信号（緊急 ' + sim.units.reduce((a, u) => a + u.alarms, 0) + ' 回、緊急に届けた量 ' + sim.units.reduce((a, u) => a + u.emerg, 0).toFixed(0) + '）', ux, y0 + 290, 14, C_ALARM);
  // 数
  let mx = width * 0.64, my = 110, rms = rmsDev(sim);
  say('在庫の目標からのずれ（RMS、30 日目から）', mx, my, 15);
  say(rms.toFixed(2), mx, my + 44, 40, rms < 3 ? C_SCOPE : C_ALARM);
  say('時間 ' + sim.t.toFixed(0) + ' 日', mx + 160, my + 40, 15, C_SUB);
  say('調整なし：遅れ × k = ' + (par.delay * par.k).toFixed(2) + (par.delay * par.k > Math.PI / 2 ? ' > π/2 → ゆれ続ける（02 と同じ）' : ' ≤ π/2'), mx, my + 76, 14, C_SUB);
  say('保存：倉庫 + 在庫 + 注文中 − 入荷 + 使った量 + 捨てた量 = ' + (total(sim) - sim.produced + sim.used + sim.wasted).toFixed(6), mx, my + 100, 13, C_SUB);
  say('（はじめの ' + sim.q0 + ' のまま）', mx, my + 120, 13, C_SUB);

  let gx = 30, gy = y0 + 320, gw = width - 60, gh = height - gy - 40;
  plotFrame(gx, gy, gw, gh, '4 つの現場の在庫（0〜50、点線 = 目標 ' + TARGET + '、赤 = 緊急ライン）');
  hLine(TARGET, gx, gy, gw, gh, 0, 50, C_BRASS); hLine(ALARM, gx, gy, gw, gh, 0, 50, C_ALARM);
  let cs4 = [C_TUBE, C_SCOPE, C_BRASS, [200, 50, 95]];
  for (let i = 0; i < NUNIT; i++) plotLine(hist.map((h) => h[i]), gx, gy, gw, gh, 0, 50, cs4[i], 600, 1.6);
  drawSelfTest();
}

function mousePressed() {
  let ux = 30 + 210 + 50, uw = (width * 0.62 - ux) / NUNIT - 12;
  let i = Math.floor((mouseX - ux) / (uw + 12));
  if (i >= 0 && i < NUNIT && mouseY > 200 && mouseY < 400) sim.units[i].shock = 4;
}
function keyPressed() {
  if (key === '2') { par.s2 = !par.s2; resetSim(); }
  if (key === '3') par.s3 = !par.s3;
  if (key === UP_ARROW) { par.delay = Math.min(8, par.delay + 1); resetSim(); }
  if (key === DOWN_ARROW) { par.delay = Math.max(1, par.delay - 1); resetSim(); }
  if (key === RIGHT_ARROW) par.k = Math.min(1.5, +(par.k + 0.1).toFixed(2));
  if (key === LEFT_ARROW) par.k = Math.max(0.1, +(par.k - 0.1).toFixed(2));
  if (key === 'r' || key === 'R') resetSim();
}
function resetSim() { sim = makeSim(1); hist = []; }

// ---- 自己テスト
function runFor(p, days, seed) { let s = makeSim(seed || 1); for (let k = 0; k < days / DT; k++) simStep(s, p); return s; }
function selfTest() {
  selfTestResults = [];
  let off = runFor({ s2: false, s3: false, delay: 4, k: 0.5 }, 200), on = runFor({ s2: true, s3: false, delay: 4, k: 0.5 }, 200);
  check('調整なしのゆれ RMS ' + rmsDev(off).toFixed(2) + ' → 調整あり ' + rmsDev(on).toFixed(2) + '（1/3 以下に）', rmsDev(on) < rmsDev(off) / 3);
  let s = runFor({ s2: false, s3: true, delay: 4, k: 0.5 }, 200), bal = total(s) - s.produced + s.used + s.wasted;
  check('品物の保存：倉庫 + 在庫 + 注文中 − 入荷 + 使った + 捨てた = はじめの ' + s.q0 + '（差 < 1e-6）', near(bal, s.q0, 1e-6));
  let minQ = (p) => { let t = makeSim(1), m = 1e9; for (let k = 0; k < 2000; k++) { simStep(t, p); if (t.t > 30) m = Math.min(m, ...t.units.map((u) => u.q)); } return m; };
  let m0 = minQ({ s2: false, s3: false, delay: 4, k: 0.5 }), m1 = minQ({ s2: false, s3: true, delay: 4, k: 0.5 });
  check('緊急信号があると、在庫の最小が上がる（' + m0.toFixed(1) + ' → ' + m1.toFixed(1) + '）', m1 > m0);
  let low = runFor({ s2: false, s3: false, delay: 1, k: 0.5 }, 200);
  check('遅れが小さい（1 日 × k 0.5 < π/2）なら、調整なしでもゆれは小さい（RMS ' + rmsDev(low).toFixed(2) + ' < 3）', rmsDev(low) < 3);
  let ex = runFor({ s2: false, s3: true, delay: 8, k: 1.5 }, 200);
  check('極端な設定（遅れ 8 日、k = 1.5）でも NaN にならない', Number.isFinite(total(ex)) && ex.units.every((u) => Number.isFinite(u.q)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 2 で調整を入れたり切ったりして、在庫のゆれと RMS を比べよう（切りかえるとやり直しになる）
// 2. ↑ で遅れを長くすると？ 調整なしの「遅れ × k」が π/2 を超える所に注目（02 の企図振戦と同じ式）
// 3. 3 で緊急信号を切ると、在庫がマイナス（品切れの借り）になる現場が出る？
// 4. 現場をクリックして急な注文を入れる。ほかの現場にも影響が出るのはなぜ？（倉庫を分け合っているから）
// 5. 学校やバイト先で「システム 1〜5」にあたるものは何か考えよう


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
