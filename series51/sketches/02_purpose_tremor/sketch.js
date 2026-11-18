// ============================================
// 02 遅れのあるフィードバックと企図振戦
// 手（オレンジの点）は「目で見たずれ」に比例した速さで目標へ動く。でも目と神経には遅れ τ がある
// K·τ が小さいとまっすぐ届く。大きくなると行きすぎてゆれ、π/2 を超えるとゆれが止まらない（ウィーナーが『サイバネティックス』で挙げた企図振戦の例）
// マウス = 目標 / A = 目標を自動でジャンプ / ↑↓ = 遅れ τ / ←→ = ゲイン K / R = 手を戻す
// ============================================

let K = 8;            // ★ ゲイン：ずれ 1 px につき 1 秒で何 px 動くか [1/s]
let tau = 0.1;        // ★ 目と神経の遅れ [秒]
let vmax = 2500;      // ★ 手の速さの上限 [px/s]（筋肉の限界。ゆれが無限に大きくならない）
const DT = 1 / 600;   // 計算のきざみ（1 フレームに 10 回）
let hand, buf, autoT = true, target = [0, 0], tJump = 0, hist = [], trail = [], tNow = 0, zc = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  resetHand();
}
function resetHand() { hand = makeHand([width * 0.3, height * 0.5]); hist = []; trail = []; zc = []; }
// 手の状態：位置と、過去の「見えたずれ」の記録（遅れのため）
function makeHand(p) { return { x: p[0], y: p[1], past: [] }; }
// 1 きざみ：τ 秒前に見えたずれ e(t − τ) に K をかけた速さで動く
function handStep(h, r, k, delay, vm, dt) {
  h.past.push([r[0] - h.x, r[1] - h.y]);
  let n = Math.round(delay / dt);
  while (h.past.length > n + 1) h.past.shift();
  let e = h.past[0];
  h.x += dt * clampv(k * e[0], -vm, vm);
  h.y += dt * clampv(k * e[1], -vm, vm);
  h.x = clampv(fin(h.x, 0), -1e5, 1e5); h.y = clampv(fin(h.y, 0), -1e5, 1e5);
}
function zone(kt) { return kt < 1 / Math.E ? 0 : kt < Math.PI / 2 ? 1 : 2; }
const ZONES = ['まっすぐ届く（Kτ < 1/e）', '行きすぎてゆれ、やがて止まる', 'ゆれが止まらない（振戦）'];

function draw() {
  background(24, 35, 10);
  let aw = width * 0.58, ax = 20, ay = 90, ah = height - 160;
  if (autoT) {
    if (tNow > tJump) { tJump = tNow + 2.5; let pts = [[0.25, 0.3], [0.75, 0.35], [0.5, 0.75], [0.2, 0.7]]; let q = pts[Math.floor(tNow / 2.5) % 4]; target = [ax + q[0] * aw, ay + q[1] * ah]; }
  } else target = [clampv(mouseX, ax, ax + aw), clampv(mouseY, ay, ay + ah)];
  for (let k = 0; k < 10; k++) { handStep(hand, target, K, tau, vmax, DT); tNow += DT; }
  let ex = target[0] - hand.x;
  hist.push(ex); if (hist.length > 360) hist.shift();
  if (hist.length > 1 && Math.sign(hist[hist.length - 1]) !== Math.sign(hist[hist.length - 2]) && hist[hist.length - 1] !== 0) zc.push(tNow);
  while (zc.length && zc[0] < tNow - 3) zc.shift();
  trail.push([hand.x, hand.y]); if (trail.length > 120) trail.shift();

  say('遅れのあるフィードバック ─ 企図振戦（手が目標のまわりでふるえる）', 20, 36, 20);
  say((autoT ? 'A 目標は自動でジャンプ中（A でマウスに）' : 'マウス = 目標（A で自動に）') + '　↑↓ 遅れ τ = ' + tau.toFixed(2) + ' s　←→ ゲイン K = ' + K.toFixed(1) + ' /s　R 手を戻す', 20, 62, 15, C_SUB);

  // ---- 手と目標
  noStroke(); fill(28, 30, 14); rect(ax, ay, aw, ah, 8);
  stroke(col(C_SCOPE, 80)); strokeWeight(2); noFill(); circle(target[0], target[1], 40); line(target[0] - 26, target[1], target[0] + 26, target[1]); line(target[0], target[1] - 26, target[0], target[1] + 26);
  noFill(); stroke(col(C_TUBE, 50)); strokeWeight(2); beginShape(); for (let p of trail) vertex(clampv(p[0], ax, ax + aw), clampv(p[1], ay, ay + ah)); endShape();
  noStroke(); fill(col(C_TUBE)); circle(clampv(hand.x, ax, ax + aw), clampv(hand.y, ay, ay + ah), 22);
  let seen = hand.past[0] || [0, 0];
  stroke(col(C_BRASS, 60)); strokeWeight(1); line(hand.x, hand.y, hand.x + seen[0] * 0.2, hand.y + seen[1] * 0.2);

  // ---- ループの図
  let bx = ax + aw + 30, bw = width - bx - 30, by = 100, half = (bw - 30) / 2;
  blockBox(bx, by, half, 50, '目標 − 手 = ずれ', ex.toFixed(1) + ' px', C_BRASS);
  blockBox(bx + half + 30, by, half, 50, '脳：速さ = K × ずれ', 'K = ' + K.toFixed(1), C_TUBE);
  blockBox(bx + half + 30, by + 90, half, 50, '筋肉 → 手', '上限 ' + vmax + ' px/s', C_TUBE);
  blockBox(bx, by + 90, half, 50, '目と神経（遅れ）', 'τ = ' + tau.toFixed(2) + ' s', C_SCOPE);
  let ph = (frameCount / 60) % 1;
  flowArrow(bx + half, by + 25, bx + half + 30, by + 25, C_TUBE, ph);
  flowArrow(bx + half + 30 + half / 2, by + 50, bx + half + 30 + half / 2, by + 90, C_TUBE, ph);
  flowArrow(bx + half + 30, by + 115, bx + half, by + 115, C_SCOPE, ph);
  flowArrow(bx + half / 2, by + 90, bx + half / 2, by + 50, C_SCOPE, ph);

  // ---- Kτ の地図と測った数
  let kt = K * tau, my = by + 180, z = zone(kt);
  say('K·τ = ' + kt.toFixed(3) + '　→ ' + ZONES[z], bx, my, 17, [C_SCOPE, C_BRASS, C_ALARM][z]);
  let mw = bw, X = (v) => bx + (v / 3) * mw;
  noStroke(); fill(col(C_SCOPE, 40)); rect(X(0), my + 14, X(1 / Math.E) - X(0), 16); fill(col(C_BRASS, 40)); rect(X(1 / Math.E), my + 14, X(Math.PI / 2) - X(1 / Math.E), 16);
  fill(col(C_ALARM, 40)); rect(X(Math.PI / 2), my + 14, X(3) - X(Math.PI / 2), 16);
  fill(col(C_TXT)); circle(X(Math.min(kt, 3)), my + 22, 14);
  say('0', X(0), my + 48, 12, C_SUB); say('1/e', X(1 / Math.E) - 8, my + 48, 12, C_SUB); say('π/2', X(Math.PI / 2) - 10, my + 48, 12, C_SUB); say('3', X(3) - 8, my + 48, 12, C_SUB);
  let last = hist.slice(-120), amp = (Math.max(...last) - Math.min(...last)) / 2, per = zc.length > 2 ? (2 * (zc[zc.length - 1] - zc[0])) / (zc.length - 1) : NaN;
  say('ゆれの振幅（直近 2 秒）= ' + amp.toFixed(1) + ' px', bx, my + 80, 15);
  say('ゆれの周期（測った）= ' + (Number.isFinite(per) ? per.toFixed(3) + ' s' : '—（ゆれていない）'), bx, my + 104, 15, C_SCOPE);
  say('ゆれ始めの周期の目安 4τ = ' + (4 * tau).toFixed(3) + ' s', bx, my + 128, 15, C_TUBE);
  say('遅れ 0 なら、どんなに K が大きくてもゆれない', bx, my + 152, 14, C_SUB);

  // ---- ずれのグラフ
  let gy = my + 175, gh = height - gy - 50;
  plotFrame(bx, gy, bw, gh, '横のずれ e_x（±300 px）　6 秒分');
  hLine(0, bx, gy, bw, gh, -300, 300, C_BRASS);
  plotLine(hist, bx, gy, bw, gh, -300, 300, C_TUBE, 360, 2);
  drawSelfTest();
}

function keyPressed() {
  if (key === 'a' || key === 'A') autoT = !autoT;
  if (key === UP_ARROW) tau = Math.min(0.4, +(tau + 0.02).toFixed(2));
  if (key === DOWN_ARROW) tau = Math.max(0, +(tau - 0.02).toFixed(2));
  if (key === RIGHT_ARROW) K = Math.min(25, K + 0.5);
  if (key === LEFT_ARROW) K = Math.max(0.5, K - 0.5);
  if (key === 'r' || key === 'R') resetHand();
}

// ---- 自己テスト：1 次元で、目標を 0 → 1 にジャンプさせる
function stepRun(k, d, T) {
  let h = makeHand([0, 0]), xs = [];
  for (let t = 0; t < T; t += DT) { handStep(h, [1, 0], k, d, 50, DT); xs.push(h.x); }
  return xs;
}
function selfTest() {
  selfTestResults = [];
  let a = stepRun(3, 0.1, 6);                                // Kτ = 0.3 < 1/e
  check('Kτ = 0.3 < 1/e：行きすぎない（最大 ' + Math.max(...a).toFixed(4) + ' ≤ 1）、6 秒で目標に届く', Math.max(...a) <= 1 + 1e-9 && a[a.length - 1] > 0.99);
  let b = stepRun(10, 0.1, 10), tail = b.slice(-600);         // Kτ = 1.0
  check('Kτ = 1.0：行きすぎる（最大 ' + Math.max(...b).toFixed(3) + '）が、ゆれは消える（最後 1 秒の |ずれ| < 1e-3）', Math.max(...b) > 1.05 && tail.every((x) => Math.abs(x - 1) < 1e-3));
  let c = stepRun(20, 0.1, 6), early = 0, late = 0;          // Kτ = 2.0
  c.forEach((x, i) => { if (i < 600) early = Math.max(early, Math.abs(x - 1)); if (i > c.length - 600) late = Math.max(late, Math.abs(x - 1)); });
  check('Kτ = 2.0 > π/2：ゆれが止まらない（最後 1 秒の振幅 ' + late.toFixed(2) + ' ≥ 最初の 1 秒 ' + early.toFixed(2) + '）', late >= early * 0.99 && late > 0.5);
  let d = stepRun(16, 0.1, 8), z = [];
  for (let i = 1; i < d.length; i++) if ((d[i] - 1) * (d[i - 1] - 1) < 0) z.push(i * DT);
  let per = (2 * (z[z.length - 1] - z[2])) / (z.length - 3);
  check('Kτ = 1.6（境目 π/2 のすぐ上）：周期 ' + per.toFixed(3) + ' s ≈ 4τ = 0.4 s（5% 以内）', Math.abs(per - 0.4) / 0.4 < 0.05);
  let e = stepRun(200, 0, 1);
  check('遅れ 0 なら K = 200 でも行きすぎない', Math.max(...e) <= 1 + 1e-9);
  let f = stepRun(40, 0.4, 5);
  check('Kτ = 16 でも速さの上限で値は有限（NaN にならない）', f.every(Number.isFinite) && Math.max(...f.map(Math.abs)) < 1e3);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で τ を 0 にすると、K をどんなに上げてもゆれない。τ = 0.1 にして K を上げていくと、どこからゆれ始める？
// 2. 測った周期と 4τ を比べよう。τ を 2 倍にすると周期は？
// 3. A を切ってマウスで目標を動かす。ゆれているときに目標を速く動かすとどうなる？
// 4. vmax を小さくすると、ゆれの振幅はどう変わる？（筋肉が弱いと…）
// 5. 「よく見てから動く」（τ が大きい）人ほど、ゆっくり（K を小さく）動くべき理由を、Kτ の地図で説明しよう


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
