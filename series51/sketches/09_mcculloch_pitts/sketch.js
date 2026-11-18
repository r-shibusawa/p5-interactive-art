// ============================================
// 09 マカロック-ピッツのニューロン（1943）
// ニューロン = 「興奮の入力の数がしきい値以上で、抑制の入力が 1 つもなければ、次の時刻に発火（1）」という 0/1 の素子
// これだけで AND・OR・NOT が作れ、ループがあると「覚える」（フリップフロップ）。脳を論理回路として考えた最初の論文
// 1 2 = 入力 A・B / 3 4 = セット S・リセット R（クリックでも） / スペース = 1 時刻進める / P = 自動で進める / C = 全部 0 に
// ============================================

// ★ ネットワーク：ex = 興奮の入力、inh = 抑制の入力、th = しきい値。入力（A, B, S, R）は外から決める
const NET = [
  { id: 'AND', ex: ['A', 'B'], inh: [], th: 2, x: 0.30, y: 0.22 },
  { id: 'OR', ex: ['A', 'B'], inh: [], th: 1, x: 0.30, y: 0.40 },
  { id: 'NOT A', ex: [], inh: ['A'], th: 0, x: 0.30, y: 0.58 },
  { id: 'A∧¬B', ex: ['A'], inh: ['B'], th: 1, x: 0.50, y: 0.22 },
  { id: 'B∧¬A', ex: ['B'], inh: ['A'], th: 1, x: 0.50, y: 0.40 },
  { id: 'XOR', ex: ['A∧¬B', 'B∧¬A'], inh: [], th: 1, x: 0.66, y: 0.31 },
  { id: '記憶 M', ex: ['S', '記憶 M'], inh: ['R'], th: 1, x: 0.50, y: 0.74 },
];
const INPUTS = [{ id: 'A', x: 0.08, y: 0.28 }, { id: 'B', x: 0.08, y: 0.48 }, { id: 'S', x: 0.08, y: 0.68 }, { id: 'R', x: 0.08, y: 0.84 }];
let inp = { A: 0, B: 0, S: 0, R: 0 }, state = {}, tick = 0, autoRun = true, lastT = 0, raster = [], pulse = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  state = zeroState();
}
function zeroState() { let s = {}; for (let n of NET) s[n.id] = 0; return s; }
// ---- 1 時刻進める：時刻 t の値（入力 + ニューロン）から、t + 1 のニューロンの値を同時に計算
function netTick(s, input) {
  let v = (id) => (id in input ? input[id] : s[id]), next = {};
  for (let n of NET) {
    let inhibited = n.inh.some((id) => v(id) === 1);
    let sum = n.ex.reduce((a, id) => a + v(id), 0);
    next[n.id] = !inhibited && sum >= n.th ? 1 : 0;
  }
  return next;
}

function draw() {
  background(24, 35, 10);
  if (autoRun && millis() - lastT > 700) doTick();
  pulse = Math.max(0, pulse - deltaTime / 400);
  let W = width * 0.78, H = height - 160, X = (f) => 20 + f * W, Y = (f) => 90 + f * H;

  say('マカロック-ピッツのニューロン ─ しきい値で 0/1 を決める素子で、論理と記憶を作る（時刻 t = ' + tick + '）', 20, 36, 20);
  say('1 2 入力 A・B　3 4 セット S・リセット R（クリックでも）　スペース 1 時刻進める　P 自動 ' + (autoRun ? 'ON' : 'OFF') + '　C 全部 0', 20, 62, 15, C_SUB);
  // つながり
  let pos = {}; for (let n of NET) pos[n.id] = [X(n.x), Y(n.y)]; for (let q of INPUTS) pos[q.id] = [X(q.x), Y(q.y)];
  let val = (id) => (id in inp ? inp[id] : state[id]);
  for (let n of NET) {
    for (let [list, inh] of [[n.ex, false], [n.inh, true]]) for (let id of list) {
      let [x1, y1] = pos[id], [x2, y2] = pos[n.id], on = val(id) === 1;
      stroke(inh ? col(C_ALARM, on ? 90 : 30) : col(C_SCOPE, on ? 90 : 30)); strokeWeight(on ? 3 : 1.5); noFill();
      if (id === n.id) { arc(x2 + 40, y2, 60, 46, -HALF_PI - 1.2, HALF_PI + 1.2); continue; }
      line(x1 + 30, y1, x2 - 34, y2);
      let ex = x2 - 34, ey = y2; noStroke(); fill(inh ? col(C_ALARM) : col(C_SCOPE));
      if (inh) circle(ex, ey, 10); else triangle(ex, ey, ex - 10, ey - 5, ex - 10, ey + 5);
      if (on) { let f = 1 - pulse; fill(col(C_TUBE)); circle(x1 + 30 + (ex - x1 - 30) * f, y1 + (ey - y1) * f, 8); }
    }
  }
  // 入力
  for (let q of INPUTS) {
    let [x, y] = pos[q.id], on = inp[q.id];
    stroke(col(C_BRASS)); strokeWeight(2); fill(on ? col(C_TUBE) : color(25, 30, 18)); rect(x - 30, y - 22, 60, 44, 8);
    noStroke(); fill(col(on ? [0, 0, 5] : C_TXT)); textAlign(CENTER, CENTER); textSize(18); text(q.id + ' = ' + on, x, y); textAlign(LEFT, BASELINE);
  }
  // ニューロン
  for (let n of NET) {
    let [x, y] = pos[n.id], on = state[n.id];
    stroke(col(C_BRASS)); strokeWeight(2); fill(on ? col(C_TUBE) : color(25, 30, 18)); circle(x, y, 68);
    noStroke(); fill(col(on ? [0, 0, 5] : C_TXT)); textAlign(CENTER, CENTER); textSize(14); text(n.id, x, y - 8); textSize(12); text('θ = ' + n.th + '　' + on, x, y + 12); textAlign(LEFT, BASELINE);
  }
  say('緑の矢印 = 興奮（+1）　赤い丸 = 抑制（1 つでも来たら発火しない）　XOR は 2 段なので 2 時刻おくれる', 20, Y(0.96), 14, C_SUB);

  // 発火の記録（ラスター図）
  let rx = W + 40, ry = 100, rw = width - rx - 20, ids = INPUTS.map((q) => q.id).concat(NET.map((n) => n.id)), rh = Math.min(30, (height - 200) / ids.length);
  say('発火の記録（右が新しい、30 時刻）', rx, ry - 12, 13, C_SUB);
  ids.forEach((id, i) => {
    say(id, rx, ry + i * rh + rh * 0.7, 12, C_SUB);
    raster.forEach((r, k) => { if (r[id]) { noStroke(); fill(id in inp ? col(C_BRASS) : col(C_TUBE)); rect(rx + 70 + k * ((rw - 70) / 30), ry + i * rh + 3, (rw - 70) / 30 - 1, rh - 6); } });
  });
  drawSelfTest();
}
function doTick() {
  raster.push({ ...inp, ...state }); if (raster.length > 30) raster.shift();
  state = netTick(state, inp); tick++; lastT = millis(); pulse = 1;
}
function toggle(id) { inp[id] = 1 - inp[id]; }
function mousePressed() {
  let W = width * 0.78, H = height - 160;
  for (let q of INPUTS) if (Math.abs(mouseX - (20 + q.x * W)) < 32 && Math.abs(mouseY - (90 + q.y * H)) < 24) toggle(q.id);
}
function keyPressed() {
  if (key === '1') toggle('A'); if (key === '2') toggle('B'); if (key === '3') toggle('S'); if (key === '4') toggle('R');
  if (key === ' ') doTick();
  if (key === 'p' || key === 'P') autoRun = !autoRun;
  if (key === 'c' || key === 'C') { inp = { A: 0, B: 0, S: 0, R: 0 }; state = zeroState(); raster = []; }
}

// ---- 自己テスト：真理値表と記憶
function run(s, input, n) { for (let k = 0; k < n; k++) s = netTick(s, input); return s; }
function selfTest() {
  selfTestResults = [];
  let tt = { AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], 'NOT A': [1, 1, 0, 0], XOR: [0, 1, 1, 0] }, ok = {};
  for (let g in tt) ok[g] = true;
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b], i) => {
    let s1 = run(zeroState(), { A: a, B: b, S: 0, R: 0 }, 1), s2 = run(zeroState(), { A: a, B: b, S: 0, R: 0 }, 2);
    for (let g of ['AND', 'OR', 'NOT A']) if (s1[g] !== tt[g][i]) ok[g] = false;
    if (s2.XOR !== tt.XOR[i]) ok.XOR = false;
  });
  check('AND の真理値表 0 0 0 1（しきい値 2）', ok.AND);
  check('OR の真理値表 0 1 1 1（しきい値 1）', ok.OR);
  check('NOT：A = 0 なら 1、A = 1 なら 0（抑制だけ、しきい値 0）', ok['NOT A']);
  check('XOR：2 段で 0 1 1 0（2 時刻あとに出る）', ok.XOR);
  let s = run(zeroState(), { A: 0, B: 0, S: 1, R: 0 }, 1), hold = true;
  for (let k = 0; k < 10; k++) { s = netTick(s, { A: 0, B: 0, S: 0, R: 0 }); if (s['記憶 M'] !== 1) hold = false; }
  check('記憶：S を 1 時刻だけ入れると、離しても 10 時刻 1 を保つ', hold);
  s = netTick(s, { A: 0, B: 0, S: 0, R: 1 }); let cleared = s['記憶 M'] === 0;
  for (let k = 0; k < 10; k++) { s = netTick(s, { A: 0, B: 0, S: 0, R: 0 }); if (s['記憶 M'] !== 0) cleared = false; }
  check('R を入れると 0 になり、そのまま 0 を保つ', cleared);
  check('S と R を同時に入れると R が勝つ（抑制は絶対）', netTick({ ...zeroState(), '記憶 M': 1 }, { A: 0, B: 0, S: 1, R: 1 })['記憶 M'] === 0);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1 2 で A・B を切りかえ、AND・OR・XOR の出力が何時刻あとに変わるかラスター図で確かめよう
// 2. 3 で S を入れてすぐ切る。記憶 M はどうなる？ 4 で R を入れると？
// 3. NET に「NAND」（A と B の両方が来たら発火しない）を足すには？ ヒント：しきい値 0 と抑制
// 4. 記憶 M の自分へのループ（ex の '記憶 M'）を消すと？ ループが記憶になる理由を説明しよう
// 5. 3 つのニューロンを輪につなぐと、1 つの発火がぐるぐる回る（リズム）。NET に足して作ってみよう


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
