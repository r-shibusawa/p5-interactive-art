// ============================================
// 07 グレイ・ウォルターの亀（1948〜49）
// 目（光センサー）1 つ、モーター 2 つ、真空管 2 本ほどの小さなロボット。それだけで「さがす・近づく・まぶしいと離れる・
// ぶつかると押し返す・電池が減ると巣（充電所）へ帰る」をくり返し、生きもののように見える
// ドラッグ = ランプを動かす / B = 電池を減らす / O = 障害物の ON/OFF / T = 軌跡を消す / R = やり直し
// ============================================

const WW = 1200, WH = 720;           // 世界の大きさ（画面に合わせて縮める）
const I_SEE = 0.12, I_DAZZLE = 0.6;  // ★ 「光が見えた」しきい値、「まぶしい」しきい値
const DRAIN = 1 / 80;                // ★ 電池の減る速さ（1 秒あたり）
const LOW = 0.3;                     // ★ この電池量より下で巣へ帰る
const ROBOT_R = 18;
let lamp = { x: 850, y: 330, P: 1 }, hutch = { x: 110, y: 610, P: 1.4 }, obs = [], useObs = true;
let tt, dragging = false, sc = 1, ox = 0, oy = 0, histI = [];
const STATES = { EXPLORE: 'さがす', APPROACH: '近づく', AVOID: 'まぶしい → 離れる', BUMP: 'ぶつかった → 押し返す', SEEK: '電池が少ない → 巣へ', CHARGE: '充電中' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  resetAll();
}
function makeObstacles() { return [{ x: 520, y: 250, r: 60 }, { x: 640, y: 560, r: 50 }, { x: 330, y: 380, r: 45 }]; }
function makeTortoise() { return { x: 300, y: 150, th: 0.3, psi: 0, state: 'EXPLORE', timer: 0, bat: 1, lock: 0, trail: [], bumps: 0, charges: 0, minLamp: 1e9 }; }
function resetAll() { tt = makeTortoise(); obs = useObs ? makeObstacles() : []; histI = []; }

// ---- 光センサー：明るさ = P ÷ (1 + (距離/200)²) × （目の向きとのずれの cos の 4 乗）
function lightFrom(L, x, y, dir) {
  let dx = L.x - x, dy = L.y - y, d = Math.hypot(dx, dy), c = Math.cos(Math.atan2(dy, dx) - dir);
  return c <= 0 ? 0 : (L.P / (1 + (d / 200) ** 2)) * c ** 4;
}
function sense(t, w) {
  let dir = t.th + t.psi;
  if (t.bat < LOW || t.state === 'CHARGE') return lightFrom(w.hutch, t.x, t.y, dir);   // 電池が少ないと巣の光だけを見る（単純化）
  return lightFrom(w.lamp, t.x, t.y, dir) + 0.3 * lightFrom(w.hutch, t.x, t.y, dir);
}
function angDiff(a, b) { let d = (a - b) % TWO_PI; if (d > Math.PI) d -= TWO_PI; if (d < -Math.PI) d += TWO_PI; return d; }

// ---- 1 きざみ（dt 秒）：状態ごとに速さ v と回る速さ ω を決めて動かす
function tortoiseStep(t, w, dt) {
  let I = sense(t, w), v = 0, om = 0;
  t.bat = clampv(t.bat - DRAIN * dt, 0, 1); t.timer -= dt;
  let dh = Math.hypot(t.x - w.hutch.x, t.y - w.hutch.y);
  if (t.state === 'CHARGE') { t.bat = clampv(t.bat + 0.25 * dt, 0, 1); if (t.bat >= 1) { t.state = 'AVOID'; t.timer = 1.5; t.charges++; } }
  else if (t.state === 'BUMP' || t.state === 'AVOID') { v = t.state === 'BUMP' ? -50 : 30; om = 2.8; if (t.timer <= 0) t.state = 'EXPLORE'; }
  else if (t.bat < LOW && dh < 45) { t.state = 'CHARGE'; }
  else if (t.bat >= LOW && I > I_DAZZLE) { t.state = 'AVOID'; t.timer = 1.2; }
  else if (I > I_SEE) {                                   // 光が見えた：目を明るい側へ少しずつ寄せ、目の向きへ車体を回す
    t.state = t.bat < LOW ? 'SEEK' : 'APPROACH';
    let ip = sense({ ...t, psi: t.psi + 0.05 }, w), im = sense({ ...t, psi: t.psi - 0.05 }, w);
    t.psi += 2.5 * dt * Math.sign(ip - im);
    let turn = clampv(3 * t.psi, -2.5, 2.5);
    om = turn; t.psi -= turn * dt; v = 110;
  } else {                                                // さがす：目をぐるぐる回しながらゆっくり進む
    t.state = 'EXPLORE'; t.psi = angDiff(t.psi + 3.0 * dt, 0); v = 60; om = 0.6;
  }
  t.th += om * dt;
  let nx = t.x + v * Math.cos(t.th) * dt, ny = t.y + v * Math.sin(t.th) * dt, hit = nx < ROBOT_R || nx > WW - ROBOT_R || ny < ROBOT_R || ny > WH - ROBOT_R;
  for (let o of w.obs) if (Math.hypot(nx - o.x, ny - o.y) < o.r + ROBOT_R) hit = true;
  if (hit && t.state !== 'BUMP') { t.state = 'BUMP'; t.timer = 0.7; t.bumps++; }
  else if (!hit) { t.x = nx; t.y = ny; }
  t.minLamp = Math.min(t.minLamp, Math.hypot(t.x - w.lamp.x, t.y - w.lamp.y));
  return I;
}

function draw() {
  background(24, 35, 10);
  sc = Math.min((width - 380) / WW, (height - 110) / WH); ox = 20; oy = 90;
  let w = { lamp, hutch, obs };
  let I = 0; for (let k = 0; k < 2; k++) I = tortoiseStep(tt, w, 1 / 120);
  if (frameCount % 3 === 0) { tt.trail.push([tt.x, tt.y]); if (tt.trail.length > 900) tt.trail.shift(); }
  histI.push([I, tt.bat]); if (histI.length > 600) histI.shift();

  say('グレイ・ウォルターの亀 ─ 目 1 つ・モーター 2 つでも、ふるまいは生きもののよう', 20, 36, 20);
  say('ドラッグ ランプを動かす　B 電池を減らす　O 障害物 ' + (useObs ? 'ON' : 'OFF') + '　T 軌跡を消す　R やり直し', 20, 62, 15, C_SUB);
  push(); translate(ox, oy); scale(sc);
  noStroke(); fill(28, 25, 14); rect(0, 0, WW, WH, 10);
  for (let L of [lamp, hutch]) for (let r = 5; r > 0; r--) { fill(L === lamp ? 45 : 140, 60, 100, 6); circle(L.x, L.y, r * 90); }
  fill(48, 40, 100); circle(lamp.x, lamp.y, 30);
  noFill(); stroke(col(C_SCOPE)); strokeWeight(3); rect(hutch.x - 50, hutch.y - 50, 100, 100, 8); noStroke(); fill(col(C_SCOPE)); circle(hutch.x, hutch.y, 18);
  for (let o of obs) { fill(30, 20, 35); circle(o.x, o.y, 2 * o.r); }
  stroke(col(C_TUBE, 45)); strokeWeight(2); noFill();
  if (tt.trail.length > 1) { beginShape(); for (let p of tt.trail) vertex(p[0], p[1]); endShape(); }
  translate(tt.x, tt.y); rotate(tt.th);
  noStroke(); fill(col(C_BRASS)); ellipse(0, 0, ROBOT_R * 2.6, ROBOT_R * 2); fill(25, 50, 30); ellipse(0, 0, ROBOT_R * 1.6, ROBOT_R * 1.2);
  stroke(col(C_TUBE)); strokeWeight(3); line(0, 0, 60 * Math.cos(tt.psi), 60 * Math.sin(tt.psi));
  noStroke(); fill(col(C_TUBE, 18)); arc(0, 0, 260, 260, tt.psi - 0.45, tt.psi + 0.45);
  pop();
  say('ランプ', ox + lamp.x * sc - 20, oy + lamp.y * sc + 34, 13, C_BRASS); say('巣（充電所）', ox + (hutch.x - 50) * sc, oy + (hutch.y - 58) * sc, 13, C_SCOPE);

  // ---- 計器
  let hx = ox + WW * sc + 30, hy = 110;
  say('いまのふるまい', hx, hy, 14, C_SUB);
  say(STATES[tt.state], hx, hy + 30, 22, tt.state === 'BUMP' || tt.state === 'AVOID' ? C_ALARM : tt.state === 'SEEK' || tt.state === 'CHARGE' ? C_SCOPE : C_TUBE);
  say('目に入る光 I = ' + I.toFixed(3), hx, hy + 66, 15);
  say('見えた > ' + I_SEE + '　まぶしい > ' + I_DAZZLE, hx, hy + 88, 13, C_SUB);
  say('電池 ' + (100 * tt.bat).toFixed(0) + '%' + (tt.bat < LOW ? '（少ない：巣の光へ）' : ''), hx, hy + 118, 15, tt.bat < LOW ? C_ALARM : C_TXT);
  noStroke(); fill(0, 0, 100, 10); rect(hx, hy + 128, 300, 14, 4); fill(col(tt.bat < LOW ? C_ALARM : C_SCOPE)); rect(hx, hy + 128, 300 * tt.bat, 14, 4);
  say('ランプに最も近づいた距離 ' + tt.minLamp.toFixed(0), hx, hy + 170, 14);
  say('ぶつかった ' + tt.bumps + ' 回　充電 ' + tt.charges + ' 回', hx, hy + 194, 14);
  let gy = hy + 220, gw = width - hx - 30, gh = Math.min(200, height - gy - 60);
  plotFrame(hx, gy, gw, gh, '光 I（オレンジ、0〜1.2）と電池（緑）');
  hLine(I_DAZZLE, hx, gy, gw, gh, 0, 1.2, C_ALARM); hLine(I_SEE, hx, gy, gw, gh, 0, 1.2, C_BRASS);
  plotLine(histI.map((h) => h[0]), hx, gy, gw, gh, 0, 1.2, C_TUBE, 600, 1.5);
  plotLine(histI.map((h) => h[1]), hx, gy, gw, gh, 0, 1.2, C_SCOPE, 600, 2);
  drawSelfTest();
}

function toWorld() { return [(mouseX - ox) / sc, (mouseY - oy) / sc]; }
function mousePressed() { let p = toWorld(); dragging = Math.hypot(p[0] - lamp.x, p[1] - lamp.y) < 80; if (!dragging && p[0] > 0 && p[0] < WW && p[1] > 0 && p[1] < WH) { lamp.x = p[0]; lamp.y = p[1]; } }
function mouseDragged() { if (dragging) { let p = toWorld(); lamp.x = clampv(p[0], 20, WW - 20); lamp.y = clampv(p[1], 20, WH - 20); } }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === 'b' || key === 'B') tt.bat = Math.min(tt.bat, 0.2);
  if (key === 'o' || key === 'O') { useObs = !useObs; obs = useObs ? makeObstacles() : []; }
  if (key === 't' || key === 'T') tt.trail = [];
  if (key === 'r' || key === 'R') resetAll();
}

// ---- 自己テスト（決まった世界で、決まった時間だけ動かす）
function runWorld(T, bat, withObs) {
  let t = makeTortoise(), w = { lamp: { x: 850, y: 330, P: 1 }, hutch: { x: 110, y: 610, P: 1.4 }, obs: withObs ? makeObstacles() : [] }, minObs = 1e9, ok = true, maxBat = 0;
  t.bat = bat;
  for (let k = 0; k < T * 120; k++) {
    tortoiseStep(t, w, 1 / 120);
    for (let o of w.obs) minObs = Math.min(minObs, Math.hypot(t.x - o.x, t.y - o.y) - o.r - ROBOT_R);
    if (![t.x, t.y, t.th, t.psi, t.bat].every(Number.isFinite)) ok = false;
    if (k > 10) maxBat = Math.max(maxBat, t.bat);
  }
  return { t, minObs, ok, maxBat };
}
function selfTest() {
  selfTestResults = [];
  let L = { x: 0, y: 0, P: 1 }, mono = true, prev = 2;
  for (let d = 0; d < 1000; d += 10) { let v = lightFrom(L, -d, 0, 0); if (v > prev) mono = false; prev = v; }
  check('光センサー：遠いほど暗い（単調）、真後ろの光は 0', mono && lightFrom(L, 100, 0, 0) === 0);
  let a = runWorld(25, 1, false), dz = 200 * Math.sqrt(1 / I_DAZZLE - 1);
  check('ランプに近づく（最も近い距離 ' + a.t.minLamp.toFixed(0) + ' < 250）が、まぶしい距離 ' + dz.toFixed(0) + ' の半分より内側には入らない', a.t.minLamp < 250 && a.t.minLamp > dz / 2);
  let b = runWorld(90, 0.25, false);
  check('電池 25% から：巣に帰って充電する（90 秒で充電 ' + b.t.charges + ' 回、電池の最大 ' + (100 * b.maxBat).toFixed(0) + '%）', b.maxBat > 0.95 && b.t.charges >= 1);
  let c = runWorld(120, 1, true);
  check('障害物があっても、めりこまない（最小のすきま ' + c.minObs.toFixed(1) + ' ≥ 0）、ぶつかって ' + c.t.bumps + ' 回押し返した', c.minObs >= -1e-9);
  check('120 秒動かしても位置・向き・電池が NaN にならない', a.ok && b.ok && c.ok);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ランプをドラッグして動かそう。亀はついてくる？ 近づきすぎると何をする？
// 2. B で電池を減らすと、ふるまいはどう変わる？ 巣で充電したあとは？
// 3. I_DAZZLE を 2 にすると（まぶしさを感じない）、ランプのまわりでどう動く？
// 4. ランプを巣のすぐそばに置くと、亀はどちらへ行く？
// 5. ウォルターは、亀が鏡の前で「自分を見て」ふらふらする様子を観察した。センサーの前に自分の光があったら？ と想像しよう


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
