// ============================================
// 04 ホメオスタットと超安定性（アシュビー 1948）
// 4 つのユニットの針が互いに押し合う（結合の重み W）。針が赤い範囲（|x| > 1）に出ると、そのユニットの
// 「ユニセレクター」が 1 段進み、入ってくる結合の重みを表の次の値に取りかえる。やがて全体が落ちつく組み合わせが見つかる
// クリック = ユニットの針をはじく / 重みのマスをクリック・D = 結合を 1 本ひっくり返す（環境を変える） / U = ユニセレクターを止める / スペース = 一時停止 / R = 最初から
// ============================================

const NU = 4;            // ユニットの数
const DAMP = 1.0;        // ★ 針の粘り（水の中で動く磁石のブレーキ）
const SELF = -0.5;       // ★ 自分自身への結合（固定）
const NOISE = 0.3;       // ★ 小さなゆらぎ（本物の装置にもある。不安定な配線を見のがさない）
const GAIN = 1.0;        // ★ 他のユニットからの結合の大きさ（−GAIN〜GAIN）
const POS = 25;          // ユニセレクターの段の数（アシュビーの装置と同じ 25）
const LIMIT = 1;         // ★ 本質変数の範囲（針がこれを超えると取りかえ）
const STABLE_T = 30;     // この秒数だけ取りかえがなければ「安定」
let seed = 3, hm, hist = [], paused = false, useUni = true, SPEED = 3;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  hm = makeHomeostat(seed);
}

// ---- ホメオスタットの状態
function makeHomeostat(sd) {
  let rng = makeRng(sd), tables = [];
  for (let i = 0; i < NU; i++) {          // ユニット i の「入ってくる重み」の表 25 段（乱数で作って固定）
    tables.push([]);
    for (let p = 0; p < POS; p++) { let row = []; for (let j = 0; j < NU; j++) row.push(i === j ? SELF : GAIN * (2 * rng() - 1)); tables[i].push(row); }
  }
  let h = { rng, x: [0.3, -0.2, 0.1, 0.4], v: [0, 0, 0, 0], pos: [0, 0, 0, 0], ref: [0, 0, 0, 0], steps: 0, per: [0, 0, 0, 0], t: 0, lastStep: 0, tables, W: [] };
  for (let i = 0; i < NU; i++) h.W.push(tables[i][0].slice());
  return h;
}
// 1 きざみ：x_i'' = −DAMP·x_i' + Σ W_ij x_j + 小さなゆらぎ（針は ±1.3 の壁で止まる）
function homeoStep(h, dt, uni, noise) {
  for (let i = 0; i < NU; i++) { let a = -DAMP * h.v[i] + (noise || 0) * (2 * h.rng() - 1); for (let j = 0; j < NU; j++) a += h.W[i][j] * h.x[j]; h.v[i] = clampv(h.v[i] + dt * a, -20, 20); }
  for (let i = 0; i < NU; i++) {
    h.x[i] += dt * h.v[i];
    if (h.x[i] > 1.3) { h.x[i] = 1.3; h.v[i] = 0; }
    if (h.x[i] < -1.3) { h.x[i] = -1.3; h.v[i] = 0; }
    h.ref[i] -= dt;
    if (uni && Math.abs(h.x[i]) > LIMIT && h.ref[i] <= 0) {      // 本質変数が範囲の外 → ユニセレクターが 1 段進む
      h.pos[i] = (h.pos[i] + 1) % POS; h.W[i] = h.tables[i][h.pos[i]].slice();
      h.steps++; h.per[i]++; h.ref[i] = 0.5; h.lastStep = h.t;
    }
  }
  h.t += dt;
}
function isSettled(h) { return h.t - h.lastStep > STABLE_T; }

function draw() {
  background(24, 35, 10);
  if (!paused) for (let k = 0; k < SPEED * 2; k++) homeoStep(hm, 1 / 120, useUni, NOISE);
  hist.push(hm.x.slice()); if (hist.length > 600) hist.shift();

  say('ホメオスタット ─ 落ちつくまで、自分で配線を取りかえる機械（超安定性）', 20, 36, 20);
  say('クリック 針をはじく　重みのマス・D 結合をひっくり返す　U ユニセレクター ' + (useUni ? 'ON' : '止めた') + '　スペース ' + (paused ? '再開' : '一時停止') + '　R 最初から（種 ' + seed + '）', 20, 62, 15, C_SUB);

  // ---- 4 つの針（メーター）
  let uw = Math.min(260, (width - 60) / 4 - 20), uy = 110;
  for (let i = 0; i < NU; i++) {
    let ux = 30 + i * (uw + 20), cx = ux + uw / 2, cy = uy + uw * 0.55, r = uw * 0.42;
    noStroke(); fill(28, 30, 16); rect(ux, uy, uw, uw * 0.95, 10);
    noFill(); strokeWeight(10);
    let ang = (v) => -HALF_PI + (v / 1.3) * 1.1;
    stroke(col(C_SCOPE, 50)); arc(cx, cy, 2 * r, 2 * r, ang(-LIMIT), ang(LIMIT));
    stroke(col(C_ALARM, 60)); arc(cx, cy, 2 * r, 2 * r, ang(-1.3), ang(-LIMIT)); arc(cx, cy, 2 * r, 2 * r, ang(LIMIT), ang(1.3));
    let a = ang(hm.x[i]), out = Math.abs(hm.x[i]) > LIMIT;
    stroke(col(out ? C_ALARM : C_TUBE)); strokeWeight(4); line(cx, cy, cx + r * 0.95 * Math.cos(a), cy + r * 0.95 * Math.sin(a));
    noStroke(); fill(col(C_BRASS)); circle(cx, cy, 14);
    say('ユニット ' + (i + 1) + '　x = ' + hm.x[i].toFixed(2), ux + 12, cy + 30, 15, out ? C_ALARM : C_TXT);
    say('ユニセレクター ' + (hm.pos[i] + 1) + ' / ' + POS + '　取りかえ ' + hm.per[i] + ' 回', ux + 12, cy + 52, 13, C_SUB);
  }

  // ---- 重みの表
  let tx = 30, ty = uy + uw * 0.95 + 40, cs = 46;
  say('結合の重み W（行 = 受け取る側、クリックで反転）', tx, ty - 10, 14, C_SUB);
  for (let i = 0; i < NU; i++) for (let j = 0; j < NU; j++) {
    let w = hm.W[i][j];
    noStroke(); fill(w >= 0 ? color(24, 80, 30 + 60 * Math.abs(w)) : color(190, 60, 30 + 60 * Math.abs(w))); rect(tx + j * cs, ty + i * cs, cs - 4, cs - 4, 4);
    fill(col(C_TXT)); textSize(12); textAlign(CENTER, CENTER); text(w.toFixed(2), tx + j * cs + cs / 2 - 2, ty + i * cs + cs / 2 - 2); textAlign(LEFT, BASELINE);
  }
  let sx = tx + NU * cs + 30, settled = isSettled(hm);
  say('取りかえの合計：' + hm.steps + ' 回', sx, ty + 10, 18, C_TUBE);
  say('最後の取りかえから ' + (hm.t - hm.lastStep).toFixed(1) + ' 秒（' + STABLE_T + ' 秒続けば「安定」）', sx, ty + 38, 15);
  say(settled ? '安定 ✓ ─ どの針も範囲の中にとどまる組み合わせを見つけた' : useUni ? 'さがし中…（範囲を出たユニットが配線を取りかえる）' : 'ユニセレクター停止中：不安定なら針は壁に張りつく', sx, ty + 66, 16, settled ? C_SCOPE : C_BRASS);
  say('時間 ' + hm.t.toFixed(0) + ' 秒（3 倍速）。自分で決めた目標はない。「範囲を出たら変える」だけ', sx, ty + 92, 14, C_SUB);

  // ---- 時間グラフ
  let gx = sx, gy = ty + 110, gw = width - gx - 30, gh = height - gy - 40;
  plotFrame(gx, gy, gw, gh, '4 本の針 x（±1.3、赤い点線 = ±1）');
  hLine(LIMIT, gx, gy, gw, gh, -1.3, 1.3, C_ALARM); hLine(-LIMIT, gx, gy, gw, gh, -1.3, 1.3, C_ALARM);
  let cs4 = [C_TUBE, C_SCOPE, C_BRASS, [200, 50, 95]];
  for (let i = 0; i < NU; i++) plotLine(hist.map((h) => h[i]), gx, gy, gw, gh, -1.3, 1.3, cs4[i], 600, 1.6);
  drawSelfTest();
}

function mousePressed() {
  let uw = Math.min(260, (width - 60) / 4 - 20), ty = 110 + uw * 0.95 + 40, ci = Math.floor((mouseY - ty) / 46), cj = Math.floor((mouseX - 30) / 46);
  if (ci >= 0 && ci < NU && cj >= 0 && cj < NU && ci !== cj) { flipCell(hm, ci, cj); return; }   // 重みのマスをクリック = その結合をひっくり返す
  let i = Math.floor((mouseX - 30) / (uw + 20));
  if (i >= 0 && i < NU && mouseY > 100 && mouseY < 110 + uw) { hm.x[i] = hm.x[i] > 0 ? -0.9 : 0.9; hm.v[i] = 0; }
}
function keyPressed() {
  if (key === 'd' || key === 'D') flipOne(hm);
  if (key === 'u' || key === 'U') useUni = !useUni;
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') { seed++; hm = makeHomeostat(seed); hist = []; }
}
// 環境が変わる：どこか 1 本の結合の符号を、表ごとひっくり返す（アシュビーが実験でやったこと）
function flipOne(h) {
  let i = Math.floor((h.t * 7.3) % NU), j = (i + 1 + Math.floor((h.t * 3.1) % (NU - 1))) % NU;
  flipCell(h, i, j);
}
function flipCell(h, i, j) {
  for (let p = 0; p < POS; p++) h.tables[i][p][j] *= -1;
  h.W[i][j] *= -1; h.x[i] = clampv(h.x[i] + 0.5, -1.3, 1.3);
}

// ---- 自己テスト
function decays(W) {                      // 重みを固定してゆらし、30 秒で落ちつくか
  let h = makeHomeostat(1); h.W = W.map((r) => r.slice()); h.x = [0.5, -0.5, 0.5, -0.5];
  for (let k = 0; k < 120 * 200; k++) homeoStep(h, 1 / 120, false, 0);
  return Math.max(...h.x.map(Math.abs)) < 1e-3;
}
function selfTest() {
  selfTestResults = [];
  let h = makeHomeostat(3);
  while (!isSettled(h) && h.t < 900) homeoStep(h, 1 / 120, true, NOISE);
  check('種 3：' + h.steps + ' 回取りかえて、' + h.lastStep.toFixed(1) + ' 秒で安定した', isSettled(h) && h.steps > 0);
  check('見つけた重みは本当に安定：ゆらぎなしで固定してゆらすと 200 秒で |x| < 0.001', decays(h.W));
  let first = makeHomeostat(3); first.W = first.tables.map((t) => t[0].slice());
  check('最初の配線（各表の 1 段目）は不安定：固定すると落ちつかない', !decays(first.W));
  let free = makeHomeostat(1); free.W = [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (i === j ? SELF : 0)));
  free.x = [0.6, -0.6, 0.6, -0.6]; for (let k = 0; k < 120 * 30; k++) homeoStep(free, 1 / 120, true);
  check('つながりがない（自分への −0.5 だけ）なら一度も取りかえない', free.steps === 0);
  let bad = makeHomeostat(1); bad.W = [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (i === j ? SELF : 1)));
  let tFirst = -1; for (let k = 0; k < 120 * 10 && tFirst < 0; k++) { homeoStep(bad, 1 / 120, true); if (bad.steps > 0) tFirst = bad.t; }
  check('全部 +1 の正のフィードバックは 5 秒以内に範囲を出て取りかえる（' + tFirst.toFixed(2) + ' 秒）', tFirst > 0 && tFirst < 5);
  let stuck = makeHomeostat(3); for (let k = 0; k < 120 * 60; k++) homeoStep(stuck, 1 / 120, false);
  check('ユニセレクターを止めると、最初の配線のまま針が壁（±1.3）に張りつく', stuck.steps === 0 && stuck.x.some((v) => Math.abs(v) > 1.29));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 安定したら D で環境を変えよう。もう一度安定するまで何回取りかえた？
// 2. U でユニセレクターを止めてから D。針はどうなる？ もう一度 U で ON にすると？
// 3. 安定しているときクリックで針をはじく。取りかえは起きる？（ゆれが小さければ起きない＝ふつうの安定）
// 4. SELF を 0 にすると、安定するまでの回数はどう変わる？ GAIN を 2 にすると？
// 5. 「目標を知らないのに、目標を達成する」とはどういうことか、話し合おう


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
