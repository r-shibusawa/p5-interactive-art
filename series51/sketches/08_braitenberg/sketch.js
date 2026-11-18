// ============================================
// 08 ブライテンベルクの乗り物（1984）
// センサー 2 つ・モーター 2 つ。つなぎ方を変えるだけで、見る人には「こわがり」「攻撃的」「好き」「探検家」に見える
// 同じ側／交差 × 興奮（明るいほど速く）／抑制（明るいほど遅く）の 4 通り。中身は数行の足し算
// 1〜4 = 全員のつなぎ方 / M = ばらばら（混ぜる） / ドラッグ = 光を動かす / クリック（空き地）= 光を足す / V = 乗り物を足す / T = 軌跡を消す / R = やり直し
// ============================================

const WIRES = [
  { name: '2a こわがり', cross: false, inhib: false },
  { name: '2b 攻撃的', cross: true, inhib: false },
  { name: '3a 好き', cross: false, inhib: true },
  { name: '3b 探検家', cross: true, inhib: true },
];
const VMAX = 120, BASE = 8, KS = 160;   // ★ モーターの最大・最小の速さ、センサーの効きぐあい
const AXLE = 30, SENS_A = 0.5, SENS_D = 16;   // 車輪の間、センサーの角度と前への距離
let lamps = [], cars = [], dragI = -1, sel = 0, mixMode = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  resetAll();
}
function resetAll() {
  lamps = [{ x: width * 0.45, y: height * 0.5, P: 1 }, { x: width * 0.72, y: height * 0.35, P: 1 }];
  cars = []; for (let i = 0; i < 8; i++) cars.push(makeCar(width * (0.1 + 0.1 * i), height * (i % 2 ? 0.25 : 0.8), i * 0.8, mixMode ? i % 4 : sel));
}
function makeCar(x, y, th, w) { return { x, y, th, w, trail: [], sL: 0, sR: 0, mL: 0, mR: 0 }; }

// ---- センサー：明るさ = Σ P ÷ (1 + (距離/150)²) × (0.5 + 0.5 cos(センサーの向きと光の向きのずれ))
function sensorAt(x, y, dir, L) {
  let s = 0;
  for (let l of L) { let dx = l.x - x, dy = l.y - y, d = Math.hypot(dx, dy); s += (l.P / (1 + (d / 150) ** 2)) * (0.5 + 0.5 * Math.cos(Math.atan2(dy, dx) - dir)); }
  return s;
}
// ---- 1 きざみ：センサー → （配線）→ モーター → 車輪の速さのちがいで曲がる
function carStep(c, L, dt, W, H, wrap) {
  let a = c.th - SENS_A, b = c.th + SENS_A;                     // 画面は y が下向きなので、角度が小さい側 = 左
  c.sL = sensorAt(c.x + SENS_D * Math.cos(a), c.y + SENS_D * Math.sin(a), a, L);
  c.sR = sensorAt(c.x + SENS_D * Math.cos(b), c.y + SENS_D * Math.sin(b), b, L);
  let w = WIRES[c.w], inL = w.cross ? c.sR : c.sL, inR = w.cross ? c.sL : c.sR;
  let motor = (s) => clampv(w.inhib ? VMAX - KS * s : BASE + KS * s, 0, VMAX * 1.5);
  c.mL = motor(inL); c.mR = motor(inR);
  let v = (c.mL + c.mR) / 2, om = (c.mL - c.mR) / AXLE;          // 左が速い → 右へ曲がる
  c.th += om * dt; c.x += v * Math.cos(c.th) * dt; c.y += v * Math.sin(c.th) * dt;
  if (wrap) { c.x = (c.x + W) % W; c.y = (c.y + H) % H; }
  return { v, om };
}

function draw() {
  background(24, 35, 10);
  for (let c of cars) {
    let ox = c.x, oy = c.y;
    for (let k = 0; k < 2; k++) carStep(c, lamps, 1 / 120, width, height, true);
    if (Math.abs(c.x - ox) > 50 || Math.abs(c.y - oy) > 50) c.trail.push(null);
    if (frameCount % 3 === 0) { c.trail.push([c.x, c.y]); if (c.trail.length > 240) c.trail.shift(); }
  }
  for (let l of lamps) { noStroke(); for (let r = 6; r > 0; r--) { fill(48, 60, 100, 5); circle(l.x, l.y, r * 70); } fill(48, 40, 100); circle(l.x, l.y, 26); }
  let cols = [[200, 50, 95], C_ALARM, C_SCOPE, C_BRASS];
  for (let c of cars) {
    stroke(col(cols[c.w], 35)); strokeWeight(2); noFill();
    let seg = []; for (let p of c.trail.concat([[c.x, c.y]])) { if (!p) { drawSeg(seg); seg = []; } else seg.push(p); } drawSeg(seg);
    push(); translate(c.x, c.y); rotate(c.th);
    noStroke(); fill(col(cols[c.w])); rect(-16, -12, 30, 24, 5);
    fill(0, 0, 15); rect(-12, -16, 14, 5); rect(-12, 11, 14, 5);
    fill(48, 60, 60 + 40 * Math.min(1, c.sL)); circle(SENS_D * Math.cos(-SENS_A), SENS_D * Math.sin(-SENS_A), 9);
    fill(48, 60, 60 + 40 * Math.min(1, c.sR)); circle(SENS_D * Math.cos(SENS_A), SENS_D * Math.sin(SENS_A), 9);
    pop();
  }

  say('ブライテンベルクの乗り物 ─ つなぎ方だけで「性格」が生まれる', 20, 36, 20);
  say('1〜4 全員のつなぎ方　M ばらばら' + (mixMode ? '（いま）' : '') + '　ドラッグ 光を動かす　空き地をクリック 光を足す　V 乗り物を足す　T 軌跡を消す　R やり直し', 20, 62, 15, C_SUB);
  // 配線の図（4 種類）
  let px = width - 300, py = 90;
  noStroke(); fill(25, 35, 13, 92); rect(px - 10, py - 10, 290, 340, 10);
  WIRES.forEach((w, i) => {
    let x = px + (i % 2) * 140, y = py + Math.floor(i / 2) * 150;
    say(w.name, x, y + 14, 14, cols[i]);
    let sx1 = x + 30, sx2 = x + 90, sy = y + 34, my = y + 110;
    fill(48, 60, 90); circle(sx1, sy, 12); circle(sx2, sy, 12); fill(0, 0, 60); rect(sx1 - 8, my, 16, 22); rect(sx2 - 8, my, 16, 22);
    stroke(col(cols[i])); strokeWeight(3);
    if (w.inhib) drawingContext.setLineDash([5, 4]);
    if (w.cross) { line(sx1, sy, sx2, my); line(sx2, sy, sx1, my); } else { line(sx1, sy, sx1, my); line(sx2, sy, sx2, my); }
    drawingContext.setLineDash([]);
    say(w.inhib ? '抑制（点線）' : '興奮', x + 18, y + 146, 12, C_SUB);
  });
  // 1 台目の数
  let c = cars[0];
  say('1 台目（' + WIRES[c.w].name + '）　センサー 左 ' + c.sL.toFixed(3) + '・右 ' + c.sR.toFixed(3) + '　→　モーター 左 ' + c.mL.toFixed(1) + '・右 ' + c.mR.toFixed(1) + '　→　曲がる速さ ' + ((c.mL - c.mR) / AXLE).toFixed(2) + ' rad/s', 20, height - 44, 14);
  drawSelfTest();
}
function drawSeg(seg) { if (seg.length < 2) return; beginShape(); for (let p of seg) vertex(p[0], p[1]); endShape(); }

function mousePressed() {
  dragI = lamps.findIndex((l) => Math.hypot(mouseX - l.x, mouseY - l.y) < 30);
  if (dragI < 0 && mouseX < width - 310 && lamps.length < 5) lamps.push({ x: mouseX, y: mouseY, P: 1 });
}
function mouseDragged() { if (dragI >= 0) { lamps[dragI].x = mouseX; lamps[dragI].y = mouseY; } }
function mouseReleased() { dragI = -1; }
function keyPressed() {
  let n = parseInt(key);
  if (n >= 1 && n <= 4) { sel = n - 1; mixMode = false; for (let c of cars) c.w = sel; }
  if (key === 'm' || key === 'M') { mixMode = true; cars.forEach((c, i) => (c.w = i % 4)); }
  if (key === 'v' || key === 'V') if (cars.length < 24) cars.push(makeCar(random(width), random(height), random(TWO_PI), mixMode ? cars.length % 4 : sel));
  if (key === 't' || key === 'T') for (let c of cars) c.trail = [];
  if (key === 'r' || key === 'R') resetAll();
}

// ---- 自己テスト（光 1 つ、まわりに壁なし）
function selfTest() {
  selfTestResults = [];
  let L = [{ x: 400, y: 0, P: 1 }];
  check('光が真正面：4 種類とも左右のモーターが同じ → まっすぐ', WIRES.every((w, i) => near(carStep(makeCar(0, 0, 0, i), L, 1e-9, 0, 0, false).om, 0, 1e-12)));
  let Lleft = [{ x: 300, y: -200, P: 1 }];                     // 前の左（y が上 = 画面の上）
  let om = WIRES.map((w, i) => carStep(makeCar(0, 0, 0, i), Lleft, 1e-9, 0, 0, false).om);
  check('光が左前：2a と 3b は右へ（離れる）、2b と 3a は左へ（向かう）', om[0] > 0 && om[3] > 0 && om[1] < 0 && om[2] < 0);
  let run = (w, T) => { let c = makeCar(0, 300, -0.4, w), minD = 1e9, d0 = Math.hypot(400, 300), v = 0; for (let k = 0; k < T * 120; k++) { v = carStep(c, L, 1 / 120, 0, 0, false).v; minD = Math.min(minD, Math.hypot(c.x - 400, c.y)); } return { c, minD, d: Math.hypot(c.x - 400, c.y), d0, v }; };
  let b = run(1, 25);
  check('2b 攻撃的：光にぶつかる（最も近い距離 ' + b.minD.toFixed(1) + ' < 20）', b.minD < 20);
  let a = run(0, 25);
  check('2a こわがり：25 秒後、はじめ（' + a.d0.toFixed(0) + '）より遠い（' + a.d.toFixed(0) + '）', a.d > a.d0);
  let l = run(2, 30);
  check('3a 好き：光のそば（' + l.d.toFixed(0) + ' < 150）でゆっくり（速さ ' + l.v.toFixed(1) + ' < ' + (0.25 * VMAX) + '）', l.d < 150 && l.v < 0.25 * VMAX);
  let e = run(3, 30);
  check('どの配線でも 30 秒後に NaN にならない', [a, b, l, e].every((r) => Number.isFinite(r.c.x + r.c.y + r.c.th)));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 1〜4 で全員のつなぎ方をそろえ、光をドラッグして動かそう。どれが「こわがり」に見える？
// 2. 光を 2 つ近くに置くと、3a（好き）はどちらを選ぶ？ 3b（探検家）は？
// 3. KS を 2 倍にすると、性格は「強く」なる？
// 4. 自分で配線を考えよう：左センサーを両方のモーターに興奮でつなぐと？（WIRES に 1 行足して carStep を少し変える）
// 5. ブライテンベルクの「作るのはやさしく、外から見て中身を当てるのは難しい」（下から作る心理学）を、06 のブラックボックスと比べよう


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
