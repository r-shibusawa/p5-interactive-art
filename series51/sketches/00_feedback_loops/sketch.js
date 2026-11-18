// ============================================
// 00 負のフィードバックと正のフィードバック
// 1：部屋とサーモスタット（負のフィードバック）。温度が下がるとヒーターが入り、上がると切れる → 温度が一定に保たれる
// 2：マイクのハウリング（正のフィードバック）。音が増えるほどもっと増える → 暴走して、アンプの上限で飽和する
// 1 2 = 切りかえ / ↑↓ = 外気温（1）・ループゲイン G（2） / ←→ = 設定温度 / H = ヒステリシスの幅 / F = サーモスタットを外す
// スペース・クリック = 窓を開ける（1）・音を入れる（2） / R = やり直し
// ============================================

let tauRoom = 60;          // ★ 部屋の時定数 [秒]（大きいほど冷めにくい）
let heatRate = 0.5;        // ★ ヒーターの温め速さ [℃/秒]（ヒーターだけなら外気 + 30℃ まで上がる）
let setT = 20, outT = 5;   // ★ 設定温度・外気温 [℃]
const BANDS = [0.25, 0.5, 1, 2];   // ★ ヒステリシスの半分の幅 [℃]（設定 ± この幅で ON / OFF）
let bandI = 1, useThermo = true, windowOpen = false;
let G = 1.5;               // ★ ハウリングのループゲイン（マイク → アンプ → スピーカー → マイク の 1 周の倍率）
let tauHowl = 0.2;         // ★ 音が 1 周する時間の目安 [秒]
let modeSel = 1, room, howl, histA = [], tSim = 0, switches = [];
const SPEED1 = 4, SPEED2 = 0.5;    // 1 フレームで進む時間 = (1/60) × SPEED

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  resetAll();
}
function resetAll() { room = { T: 17, on: 0 }; howl = { y: 1e-3 }; histA = []; tSim = 0; switches = []; }

// ---- 1：部屋の温度 T' = (外気 − T) / τ + (ヒーター ON なら heatRate)
function roomStep(r, p, dt) {
  let band = BANDS[p.bandI], tau = p.windowOpen ? p.tau / 3 : p.tau;
  if (p.thermo) {                                  // サーモスタット：下の線より下で ON、上の線より上で OFF
    if (r.T < p.setT - band) r.on = 1;
    else if (r.T > p.setT + band) r.on = 0;
  } else r.on = 0.5;                               // 外すと：ヒーターを半分の強さでつけっぱなし
  r.T += dt * ((p.outT - r.T) / tau + p.heat * r.on);
  r.T = clampv(r.T, -50, 80);
}
function roomParams() { return { tau: tauRoom, heat: heatRate, setT, outT, bandI, thermo: useThermo, windowOpen }; }
// ---- 2：ハウリング y' = (G · tanh(y) − y) / τ（tanh = アンプの上限で飽和）
function howlDeriv(s, p) { return [(p.G * Math.tanh(s[0]) - s[0]) / p.tau]; }

function draw() {
  background(24, 35, 10);
  let p = roomParams(), ph = (frameCount / 90) % 1;
  if (modeSel === 1) {
    for (let k = 0; k < 4; k++) {
      let was = room.on; roomStep(room, p, SPEED1 / 240); tSim += SPEED1 / 240;
      if (was !== room.on && room.on === 1) switches.push(tSim);
    }
    if (switches.length > 6) switches.shift();
    histA.push([room.T, room.on]);
  } else {
    for (let k = 0; k < 4; k++) { howl.y = clampv(rk4(howlDeriv, [howl.y], { G, tau: tauHowl }, SPEED2 / 240)[0], -5, 5); tSim += SPEED2 / 240; }
    histA.push([howl.y]);
  }
  if (histA.length > 600) histA.shift();

  say(modeSel === 1 ? '1：負のフィードバック ─ 部屋とサーモスタット' : '2：正のフィードバック ─ マイクのハウリング', 20, 36, 20);
  say(modeSel === 1 ? '↑↓ 外気温 ' + outT + '℃　←→ 設定 ' + setT + '℃　H 幅 ±' + BANDS[bandI] + '℃　F サーモスタット ' + (useThermo ? 'ON' : '外した') + '　スペース 窓 ' + (windowOpen ? '開' : '閉') + '　R やり直し　2 ハウリングへ'
                    : '↑↓ ループゲイン G = ' + G.toFixed(2) + '　スペース・クリック 音を入れる　R やり直し　1 サーモスタットへ', 20, 62, 15, C_SUB);

  // ---- ループの図
  let bx = 40, by = 100, bw = 150, bh = 56, gap = 70;
  if (modeSel === 1) {
    let e = setT - room.T;
    blockBox(bx, by, bw, bh, '設定温度', setT + '℃', C_BRASS);
    blockBox(bx + (bw + gap), by, bw, bh, '比べる（誤差）', 'e = ' + e.toFixed(2), C_TUBE);
    blockBox(bx + 2 * (bw + gap), by, bw, bh, 'サーモスタット', useThermo ? (room.on ? 'ON' : 'OFF') : '外した', room.on ? C_TUBE : C_SUB);
    blockBox(bx + 3 * (bw + gap), by, bw, bh, 'ヒーター', (heatRate * room.on).toFixed(2) + ' ℃/s', room.on ? C_TUBE : C_SUB);
    blockBox(bx + 3 * (bw + gap), by + 130, bw, bh, '部屋', room.T.toFixed(2) + '℃', C_SCOPE);
    blockBox(bx + (bw + gap), by + 130, bw, bh, '温度計', room.T.toFixed(2) + '℃', C_SCOPE);
    for (let i = 0; i < 3; i++) flowArrow(bx + i * (bw + gap) + bw, by + bh / 2, bx + (i + 1) * (bw + gap), by + bh / 2, C_TUBE, ph);
    flowArrow(bx + 3 * (bw + gap) + bw / 2, by + bh, bx + 3 * (bw + gap) + bw / 2, by + 130, C_TUBE, ph);
    flowArrow(bx + 3 * (bw + gap), by + 130 + bh / 2, bx + (bw + gap) + bw, by + 130 + bh / 2, C_SCOPE, ph, '外気 ' + outT + '℃ へ熱が逃げる');
    flowArrow(bx + (bw + gap) + bw / 2, by + 130, bx + (bw + gap) + bw / 2, by + bh, C_SCOPE, ph, '−（引き算）');
  } else {
    blockBox(bx, by, bw, bh, 'マイク', howl.y.toFixed(3), C_SCOPE);
    blockBox(bx + (bw + gap), by, bw, bh, 'アンプ × G', 'G = ' + G.toFixed(2), C_TUBE);
    blockBox(bx + 2 * (bw + gap), by, bw, bh, '上限（飽和）', 'tanh', C_TUBE);
    blockBox(bx + 3 * (bw + gap), by, bw, bh, 'スピーカー', (G * Math.tanh(howl.y)).toFixed(3), C_TUBE);
    blockBox(bx + 1.5 * (bw + gap), by + 130, bw, bh, '空気（部屋）', '遅れ τ = ' + tauHowl + ' s', C_SCOPE);
    for (let i = 0; i < 3; i++) flowArrow(bx + i * (bw + gap) + bw, by + bh / 2, bx + (i + 1) * (bw + gap), by + bh / 2, C_TUBE, ph);
    flowArrow(bx + 3 * (bw + gap) + bw / 2, by + bh, bx + 1.5 * (bw + gap) + bw, by + 130 + bh / 2, C_TUBE, ph);
    flowArrow(bx + 1.5 * (bw + gap), by + 130 + bh / 2, bx + bw / 2, by + bh, C_SCOPE, ph, '+（足し算）');
  }

  // ---- 計算した数
  let mx = bx + 4 * (bw + gap) + 10, my = by + 14;
  if (modeSel === 1) {
    let band = BANDS[bandI], Ton = outT + heatRate * (windowOpen ? tauRoom / 3 : tauRoom), tau = windowOpen ? tauRoom / 3 : tauRoom;
    let per = thermoPeriod(setT - band, setT + band, outT, Ton, tau), meas = switches.length > 1 ? (switches[switches.length - 1] - switches[0]) / (switches.length - 1) : NaN;
    say('ON / OFF の線：' + (setT - band) + '℃ / ' + (setT + band) + '℃', mx, my, 15);
    say('ヒーターだけなら ' + Ton.toFixed(1) + '℃ まで上がる', mx, my + 26, 15);
    say(per ? '周期（式）= τ ln(…) + τ ln(…) = ' + per.toFixed(2) + ' s' : '周期（式）：この外気温では保てない', mx, my + 52, 15, C_TUBE);
    say('周期（測った）= ' + (Number.isFinite(meas) ? meas.toFixed(2) + ' s' : '—'), mx, my + 78, 15, C_SCOPE);
    say('誤差 e = ' + (setT - room.T).toFixed(2) + '℃', mx, my + 104, 15);
    say(useThermo ? 'F で外すと、外気温を変えたとき温度がずれていく' : '外したまま ↑↓ で外気温を変えてみよう', mx, my + 130, 14, C_SUB);
  } else {
    let ys = fixedHowl(G), rate = (G - 1) / tauHowl;
    say('小さいうちは y ∝ e^{(G − 1) t / τ}', mx, my, 15);
    say('増える速さ (G − 1)/τ = ' + rate.toFixed(2) + ' /s', mx, my + 26, 15, C_TUBE);
    say(G > 1 ? '2 倍になる時間 = ' + (Math.log(2) / rate).toFixed(3) + ' s' : 'G ≤ 1：音は消えていく', mx, my + 52, 15, C_TUBE);
    say('落ちつく先 y* = G tanh(y*) → ' + ys.toFixed(4), mx, my + 78, 15, C_SCOPE);
    say(G > 1 ? '暴走 → 上限で張りつく（ハウリング）' : '小さな音を入れても静かになる', mx, my + 104, 15, G > 1 ? C_ALARM : C_SCOPE);
  }

  // ---- 時間グラフ
  let gx = 40, gy = by + 230, gw = width - 80, gh = height - gy - 50;
  if (modeSel === 1) {
    let lo = Math.min(setT - 6, outT), hi = setT + 6;
    plotFrame(gx, gy, gw, gh, '室温 T（' + lo + '〜' + hi + '℃）とヒーター（下の帯）　横 = ' + (600 / 60 * SPEED1).toFixed(0) + ' 秒分');
    hLine(setT + BANDS[bandI], gx, gy, gw, gh, lo, hi, C_TUBE); hLine(setT - BANDS[bandI], gx, gy, gw, gh, lo, hi, C_TUBE);
    hLine(setT, gx, gy, gw, gh, lo, hi, C_BRASS);
    plotLine(histA.map((h) => h[0]), gx, gy, gw, gh, lo, hi, C_SCOPE, 600, 2.5);
    plotLine(histA.map((h) => h[1]), gx, gy + gh - 30, gw, 24, 0, 1, C_TUBE, 600, 2);
  } else {
    let hi = Math.max(1.2, fixedHowl(Math.max(G, 1)) * 1.2);
    plotFrame(gx, gy, gw, gh, 'マイクの音の大きさ y（0〜' + hi.toFixed(2) + '）　横 = ' + (600 / 60 * SPEED2).toFixed(0) + ' 秒分');
    hLine(fixedHowl(G), gx, gy, gw, gh, 0, hi, C_TUBE);
    plotLine(histA.map((h) => Math.abs(h[0])), gx, gy, gw, gh, 0, hi, C_TUBE, 600, 2.5);
  }
  drawSelfTest();
}

// サーモスタットの周期（式）：lo→hi に温める時間 + hi→lo に冷める時間
function thermoPeriod(lo, hi, out, Ton, tau) {
  if (!(Ton > hi && out < lo)) return null;
  return tau * Math.log((Ton - lo) / (Ton - hi)) + tau * Math.log((hi - out) / (lo - out));
}
// y = G tanh(y) の正の解（2 分法）。G ≤ 1 なら 0
function fixedHowl(g) {
  if (g <= 1) return 0;
  let a = 1e-9, b = g + 1;
  for (let k = 0; k < 200; k++) { let m = (a + b) / 2; if (g * Math.tanh(m) - m > 0) a = m; else b = m; }
  return (a + b) / 2;
}

function keyPressed() {
  if (key === '1') { modeSel = 1; resetAll(); }
  if (key === '2') { modeSel = 2; resetAll(); }
  if (key === UP_ARROW) { if (modeSel === 1) outT = Math.min(18, outT + 1); else G = Math.min(3, G + 0.05); }
  if (key === DOWN_ARROW) { if (modeSel === 1) outT = Math.max(-15, outT - 1); else G = Math.max(0.2, G - 0.05); }
  if (key === RIGHT_ARROW) setT = Math.min(28, setT + 1);
  if (key === LEFT_ARROW) setT = Math.max(12, setT - 1);
  if (key === 'h' || key === 'H') bandI = (bandI + 1) % BANDS.length;
  if (key === 'f' || key === 'F') useThermo = !useThermo;
  if (key === ' ') kick();
  if (key === 'r' || key === 'R') resetAll();
}
function mousePressed() { kick(); }
function kick() { if (modeSel === 1) windowOpen = !windowOpen; else howl.y = clampv(howl.y + 0.02, -5, 5); }

// ---- 自己テスト：式で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let p = { tau: 60, heat: 0.5, setT: 20, outT: 5, bandI: 1, thermo: true, windowOpen: false }, r = { T: 12, on: 0 }, dt = 0.01;
  let t = 0, lo = 1e9, hi = -1e9, ons = [];
  while (t < 600) { let was = r.on; roomStep(r, p, dt); t += dt; if (t > 300) { lo = Math.min(lo, r.T); hi = Math.max(hi, r.T); if (!was && r.on) ons.push(t); } }
  check('落ちついた後、室温は 19.5〜20.5℃ の帯の中（行きすぎ ≤ 0.01℃）', lo > 19.5 - 0.01 && hi < 20.5 + 0.01);
  let per = (ons[ons.length - 1] - ons[0]) / (ons.length - 1), perF = thermoPeriod(19.5, 20.5, 5, 35, 60);
  check('ON → ON の周期が式 τ ln(15.5/14.5) × 2 = ' + perF.toFixed(3) + ' s と 1% 以内で一致', ons.length > 5 && Math.abs(per - perF) / perF < 0.01);
  let n1 = countSwitches(0), n3 = countSwitches(3);
  check('幅を狭くするほど ON/OFF の回数がふえる（±0.25℃ ' + n1 + ' 回 > ±2℃ ' + n3 + ' 回）', n1 > 3 * n3 && n3 > 0);
  let pc = { ...p, outT: -5 }, rc = { T: 20, on: 0 }, po = { ...pc, thermo: false }, ro = { T: 20, on: 0 }, sc = 0, n = 0;
  for (let k = 0; k < 60000; k++) { roomStep(rc, pc, dt); roomStep(ro, po, dt); if (k > 30000) { sc += rc.T; n++; } }
  check('外気温 −5℃：フィードバックありは平均 20℃ に近い（' + (sc / n).toFixed(2) + '）、外すと 10℃ にずれる', Math.abs(sc / n - 20) < 0.6 && near(ro.T, 10, 0.01));
  let s = [1e-4]; for (let k = 0; k < 100; k++) s = rk4(howlDeriv, s, { G: 1.5, tau: 0.2 }, 0.01);
  check('正のフィードバック G = 1.5：小さい音は 1 秒で e^{2.5} = 12.18 倍（1% 以内）', Math.abs(s[0] / 1e-4 / Math.exp(2.5) - 1) < 0.01);
  for (let k = 0; k < 2000; k++) s = rk4(howlDeriv, s, { G: 1.5, tau: 0.2 }, 0.01);
  check('暴走は上限で止まる：y → y* = 1.5 tanh(y*) = ' + fixedHowl(1.5).toFixed(4), near(s[0], fixedHowl(1.5), 1e-6) && near(1.5 * Math.tanh(fixedHowl(1.5)), fixedHowl(1.5), 1e-9));
  let q = [0.5]; for (let k = 0; k < 2000; k++) q = rk4(howlDeriv, q, { G: 0.8, tau: 0.2 }, 0.01);
  check('G = 0.8 < 1 なら音は消える（20 秒で 0.5 → ' + q[0].toExponential(1) + '）', Math.abs(q[0]) < 1e-6);
  reportSelfTest();
}
function countSwitches(bi) {
  let p = { tau: 60, heat: 0.5, setT: 20, outT: 5, bandI: bi, thermo: true, windowOpen: false }, r = { T: 20, on: 0 }, n = 0;
  for (let k = 0; k < 40000; k++) { let was = r.on; roomStep(r, p, 0.01); if (!was && r.on) n++; }
  return n;
}

// ---------- やってみよう ----------
// 1. H で幅を ±0.25℃ にすると温度の波はどうなる？ ヒーターの ON/OFF の回数は？（機械が早くこわれる理由）
// 2. F でサーモスタットを外し、↑↓ で外気温を変える。温度はどこまでずれる？ もう一度 F で戻すと？
// 3. スペースで窓を開けると、周期（式）はどう変わる？ 測った周期と比べよう
// 4. 2 のハウリングで G を 1.00 ちょうどにすると？ 0.95 と 1.05 で何が起きる？
// 5. tauHowl を変えると「2 倍になる時間」はどう変わる？ 本物のハウリングが一瞬で起きるのはなぜ？


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
