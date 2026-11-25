// ============================================
// 12 ホップフィールド網 ─ 10 × 10 = 100 個のニューロン（+1 = 白、−1 = 黒）が全部たがいにつながった連想記憶
// 覚える：ヘッブ則 W_ij = Σ_μ ξ_i^μ ξ_j^μ（いっしょに白・黒になる 2 つはつながりを強く）、自分自身とはつながない W_ii = 0
// 思い出す：ニューロンを 1 つずつ選び、s_i ← sign(Σ_j W_ij s_j)。エネルギー E = −½ sᵀ W s は 1 回ごとに必ず下がるか同じ
//   → 谷（覚えた絵）に転がり落ちる。ノイズで汚した絵から元の絵を思い出せる
// 覚える数が多すぎると（ランダムな絵なら 約 0.14 × 100 = 14 枚）、思い出せなくなり、まざった「偽の記憶」に落ちる
// クリック 覚えた絵を汚して入れる / ドラッグ 状態に描く / ↑↓ 覚える絵の数 / N ノイズを足す / スペース 一時停止 / M 容量の実験 ⇔ 絵 / R 状態をランダムに
// ============================================

const PICS = [                           // ★ 覚える絵（# = 白）。自分の絵に書きかえてよい
  ['ハート', ['..........', '.##...##..', '####.####.', '#########.', '#########.', '.#######..', '..#####...', '...###....', '....#.....', '..........']],
  ['家', ['....##....', '...####...', '..######..', '.########.', '##########', '.#......#.', '.#.##...#.', '.#.##.###.', '.#....###.', '.########.']],
  ['顔', ['..######..', '.#......#.', '#..#..#..#', '#........#', '#........#', '#.#....#.#', '#..####..#', '#........#', '.#......#.', '..######..']],
  ['十字', ['....##....', '....##....', '....##....', '##########', '##########', '....##....', '....##....', '....##....', '....##....', '....##....']],
  ['月', ['...####...', '..##......', '.##.......', '##........', '##........', '##........', '##........', '.##.......', '..##......', '...####...']],
  ['しま', ['#.#.#.#.#.', '#.#.#.#.#.', '#.#.#.#.#.', '#.#.#.#.#.', '#.#.#.#.#.', '#.#.#.#.#.', '#.#.#.#.#.', '#.#.#.#.#.', '#.#.#.#.#.', '#.#.#.#.#.']],
];
const NN = 100, NOISE_FRAC = 0.2, UPDATES_PER_FRAME = 3;   // ★ ニューロンの数、汚す割合、1 フレームの更新数
let nStored = 3, hop = null, stateS = null, energyLog = [], pausedH = false, viewCap = false, capCurve = null, capJob = 0, lastI = -1, stableCount = 0, seedH = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  learnPics(); corruptFrom(0);
  capCurve = [];
}

function picVec(k) { let v = []; for (let r of PICS[k][1]) for (let ch of r) v.push(ch === '#' ? 1 : -1); return v; }
// ★ ヘッブ則：W_ij = Σ_μ ξ_i ξ_j（i ≠ j）。整数のまま（1/N で割らない）なので、エネルギーの比較がぴったり
function hebbian(pats) {
  let n = pats[0].length, w = Array.from({ length: n }, () => new Int32Array(n));
  for (let p of pats) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) w[i][j] += p[i] * p[j];
  return w;
}
function energyOf(w, s) { let e = 0; for (let i = 0; i < s.length; i++) { let h = 0; for (let j = 0; j < s.length; j++) h += w[i][j] * s[j]; e += s[i] * h; } return -e / 2; }
function localField(w, s, i) { let h = 0, r = w[i]; for (let j = 0; j < s.length; j++) h += r[j] * s[j]; return h; }
// ★ 1 個の更新：s_i ← sign(h_i)（h_i = 0 ならそのまま）。変わったら ΔE = −2 s_i(新) h_i ≤ 0
function updateOne(w, s, i) { let h = localField(w, s, i), nv = h > 0 ? 1 : h < 0 ? -1 : s[i], ch = nv !== s[i]; s[i] = nv; return ch; }
function recall(w, s0, maxSweeps) {       // ランダムな順番で全部のニューロンを更新、変化がなくなるまで
  let s = s0.slice(), order = s.map((_, i) => i);
  for (let sw = 0; sw < maxSweeps; sw++) { shuffleArr(order); let ch = 0; for (let i of order) if (updateOne(w, s, i)) ch++; if (!ch) break; }
  return s;
}
function overlap(a, b) { let m = 0; for (let i = 0; i < a.length; i++) m += a[i] * b[i]; return m / a.length; }
function randomPattern() { let v = []; for (let i = 0; i < NN; i++) v.push(rnd() < 0.5 ? 1 : -1); return v; }
function learnPics() { hop = hebbian(PICS.slice(0, nStored).map((_, k) => picVec(k))); }
function corruptFrom(k) { seedRng(1200 + seedH++); stateS = picVec(k).map((v) => (rnd() < NOISE_FRAC ? -v : v)); energyLog = [energyOf(hop, stateS)]; stableCount = 0; }
// 容量の実験（ランダムな絵）：P 枚覚えて、それぞれ 10% 汚してから思い出したときの重なり（1 = 完全）の平均
function capPoint(p, seed) {
  seedRng(seed); let pats = []; for (let k = 0; k < p; k++) pats.push(randomPattern());
  let w = hebbian(pats), sum = 0, fixed = 0;
  for (let k = 0; k < p; k++) {
    let noisy = pats[k].map((v) => (rnd() < 0.1 ? -v : v)), out = recall(w, noisy, 20); sum += overlap(out, pats[k]);
    let s = pats[k].slice(), moved = false; for (let i = 0; i < NN; i++) if (updateOne(w, s, i)) moved = true; if (!moved) fixed++;
  }
  return { m: sum / p, fixed: fixed / p };
}

function draw() {
  background(...BG);
  if (!pausedH && !viewCap) for (let k = 0; k < UPDATES_PER_FRAME; k++) {
    let i = Math.floor(rnd() * NN); lastI = i;
    if (updateOne(hop, stateS, i)) stableCount = 0; else stableCount++;
    energyLog.push(energyOf(hop, stateS)); if (energyLog.length > 1500) energyLog.shift();
  }
  if (viewCap && capCurve.length < 40) { let t0 = performance.now(); while (capCurve.length < 40 && performance.now() - t0 < 8) { let p = capCurve.length + 1; capCurve.push(capPoint(p, 3000 + p)); } }
  if (viewCap) { drawCapacity(); drawSelfTest(width - 180, height - 14); return; }
  let ov = PICS.slice(0, nStored).map((_, k) => overlap(stateS, picVec(k))), best = ov.indexOf(Math.max(...ov));
  hudTitle('ホップフィールド網：覚えた絵 ' + nStored + ' 枚（100 ニューロン）　エネルギー E = ' + energyLog[energyLog.length - 1] + (stableCount > 300 ? '　→ 止まった（谷の底）' : ''),
    'クリック 下の絵を汚して入れる　ドラッグ 状態に描く（Shift で黒）　↑↓ 覚える数　N ノイズ　スペース ' + (pausedH ? '再開' : '一時停止') + '　M 容量の実験　R ランダムな状態');
  // ---- 左：いまの状態
  let cs = Math.min(36, (height - 300) / 10), gx = 40, gy = 100;
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) { let v = stateS[j * 10 + i]; noStroke(); fill(...(v > 0 ? INK : [26, 48, 50])); rect(gx + i * cs, gy + j * cs, cs - 2, cs - 2, 3); }
  if (lastI >= 0) { noFill(); stroke(...MAG); strokeWeight(2); rect(gx + (lastI % 10) * cs - 1, gy + Math.floor(lastI / 10) * cs - 1, cs, cs, 3); }
  noStroke(); fill(...SUB); textSize(13); textAlign(LEFT, BASELINE); text('いまの状態 s（マゼンタの枠 = いま更新したニューロン）', gx, gy + 10 * cs + 20);
  // ---- 下：覚えた絵と重なり
  let ty = gy + 10 * cs + 50, ts = 7;
  for (let k = 0; k < PICS.length; k++) {
    let x0 = gx + k * (ts * 10 + 56), on = k < nStored, v = picVec(k);
    for (let q = 0; q < NN; q++) { noStroke(); fill(...(v[q] > 0 ? (on ? INK : [90, 100, 100]) : [20, 38, 40])); rect(x0 + (q % 10) * ts, ty + Math.floor(q / 10) * ts, ts - 1, ts - 1); }
    fill(...(on ? (k === best ? LIME : INK) : SUB)); textSize(12); text(PICS[k][0] + (on ? '　m = ' + fmtN(ov[k], 2) : '（未）'), x0, ty + 10 * ts + 16);
  }
  // ---- 右：エネルギー
  let rx = gx + 10 * cs + 50, g = { x: rx + 20, y: 110, w: width - rx - 70, h: (height - 260) * 0.55, x0: 0, x1: Math.max(10, energyLog.length - 1), y0: Math.min(...energyLog) - 20, y1: Math.max(...energyLog) + 20 };
  plotAxes(g, '更新の回数', 'エネルギー E = −½ sᵀ W s（下がるか同じ、上がることはない）', [0, g.x1], [Math.round(g.y0), Math.round(g.y1)]);
  plotXY(g, energyLog.map((_, i) => i), energyLog, AMBER, 2);
  for (let k = 0; k < nStored; k++) { let e = energyOf(hop, picVec(k)); stroke(...LIME, 120); strokeWeight(1); line(g.x, gY(g, e), g.x + g.w, gY(g, e)); }
  noStroke(); fill(...SUB); textSize(13);
  let by = g.y + g.h + 50;
  text('緑の横線 = 覚えた絵そのもののエネルギー（谷の底）。m = 重なり（1 = 同じ、−1 = 白黒反転）', rx + 20, by);
  text('白黒を反転した絵も同じエネルギー → 反転した記憶にも落ちる（ヘッブ則は ξ と −ξ を区別しない）', rx + 20, by + 20);
  text('手で描いた絵どうしは似ている（黒が多い）ので、ランダムな絵より早く混ざる。M で容量の実験', rx + 20, by + 40);
  drawSelfTest(width - 180, height - 14);
}
function drawCapacity() {
  hudTitle('ホップフィールド網の容量：ランダムな絵を P 枚覚えて、10% 汚してから思い出す（N = 100）', 'M 絵の画面にもどる　（P = 1〜40、計算 ' + capCurve.length + ' / 40）');
  let g = { x: 90, y: 110, w: width - 180, h: height - 280, x0: 0, x1: 0.4, y0: 0, y1: 1.05 };
  plotAxes(g, '覚えた数 / ニューロンの数 = α = P/N', '思い出した絵の重なりの平均（1 = 完全）と、覚えた絵がそのまま止まる割合', [0, 0.1, 0.138, 0.2, 0.3, 0.4], [0, 0.5, 1]);
  stroke(...AMBER); strokeWeight(1); line(gX(g, 0.138), g.y, gX(g, 0.138), g.y + g.h);
  noStroke(); fill(...AMBER); textSize(13); text('理論の容量 α ≈ 0.138（N が大きいとき）', gX(g, 0.138) + 6, g.y + 18);
  let as = capCurve.map((_, i) => (i + 1) / NN);
  plotXY(g, as, capCurve.map((c) => c.m), MAG, 3); plotXY(g, as, capCurve.map((c) => c.fixed), SKY, 2);
  legend(g.x + g.w - 300, g.y + 30, [[MAG, '思い出した重なりの平均'], [SKY, '覚えた絵が固定点のままの割合']]);
  fill(...SUB); textSize(13); textAlign(LEFT, BASELINE);
  text('N = 100 は小さいので、急な落ち方はなだらかになる。α が大きいと、覚えた絵そのものも動いてしまう（偽の記憶へ）', g.x, g.y + g.h + 50);
}

function mousePressed() {
  let cs = Math.min(36, (height - 300) / 10), ty = 100 + 10 * cs + 50, ts = 7;
  for (let k = 0; k < PICS.length; k++) { let x0 = 40 + k * (ts * 10 + 56); if (mouseX > x0 && mouseX < x0 + ts * 10 && mouseY > ty && mouseY < ty + ts * 10 && k < nStored) corruptFrom(k); }
  paintState();
}
function mouseDragged() { paintState(); }
function paintState() {
  if (viewCap) return;
  let cs = Math.min(36, (height - 300) / 10), i = Math.floor((mouseX - 40) / cs), j = Math.floor((mouseY - 100) / cs);
  if (i >= 0 && i < 10 && j >= 0 && j < 10) { stateS[j * 10 + i] = keyIsDown(SHIFT) ? -1 : 1; energyLog.push(energyOf(hop, stateS)); stableCount = 0; }
}
function keyPressed() {
  if (key === UP_ARROW) { nStored = Math.min(PICS.length, nStored + 1); learnPics(); energyLog = [energyOf(hop, stateS)]; }
  if (key === DOWN_ARROW) { nStored = Math.max(1, nStored - 1); learnPics(); energyLog = [energyOf(hop, stateS)]; }
  if (key === 'n' || key === 'N') { stateS = stateS.map((v) => (rnd() < 0.1 ? -v : v)); energyLog.push(energyOf(hop, stateS)); stableCount = 0; }
  if (key === ' ') pausedH = !pausedH;
  if (key === 'm' || key === 'M') viewCap = !viewCap;
  if (key === 'r' || key === 'R') { stateS = randomPattern(); energyLog = [energyOf(hop, stateS)]; stableCount = 0; }
  return false;
}

// ============================================
// やってみよう
// ・覚える数 1 → 6 と増やしながら、汚した「顔」を思い出せるか試す。どこから混ざる？
// ・R でランダムな状態から始めると、どの絵（または反転した絵）に落ちる？
// ・NOISE_FRAC を 0.4、0.5 にする。半分汚すとどうなる？
// ・PICS に自分の 10 × 10 の絵を足す。似ていない絵どうしのほうが、たくさん覚えられる？
// ============================================

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(1212); let pats = []; for (let k = 0; k < 5; k++) pats.push(randomPattern());
  let w = hebbian(pats), sym = true; for (let i = 0; i < NN; i++) { if (w[i][i] !== 0) sym = false; for (let j = 0; j < NN; j++) if (w[i][j] !== w[j][i]) sym = false; }
  check('ヘッブ則の W は対称で、対角が 0（整数）', sym);
  let s = randomPattern(), e = energyOf(w, s), mono = true, dOk = true;
  for (let t = 0; t < 3000; t++) {
    let i = Math.floor(rnd() * NN), h = localField(w, s, i), old = s[i]; updateOne(w, s, i);
    let e2 = energyOf(w, s); if (e2 > e) mono = false;
    if (e2 - e !== -(s[i] - old) * h) dOk = false;           // ΔE = −(s_i 新 − s_i 旧) h_i
    e = e2;
  }
  check('1 個ずつの更新 3000 回：エネルギーは一度も上がらない', mono);
  check('ΔE = −(s_i の変化) × h_i が毎回ぴったり', dOk);
  check('ランダムな絵 5 枚（α = 0.05）：覚えた絵は全部そのまま止まる（固定点）', pats.every((p) => { let q = p.slice(); for (let i = 0; i < NN; i++) updateOne(w, q, i); return overlap(q, p) === 1; }));
  let w3 = hebbian(pats.slice(0, 3)), ok3 = pats.slice(0, 3).every((p) => overlap(recall(w3, p.map((v) => (rnd() < 0.15 ? -v : v)), 30), p) === 1);
  check('3 枚覚えて 15% 汚した絵から、元の絵を完全に思い出す', ok3);
  let lo = capPoint(5, 3005), hi = capPoint(30, 3030);
  check('容量：5 枚（α = 0.05）なら重なり ' + fmtN(lo.m, 3) + '、30 枚（α = 0.3）では ' + fmtN(hi.m, 2) + ' に落ちる', lo.m > 0.99 && hi.m < 0.8);
  reportSelfTest();
}

// ==================================================
// ここから下は「神経回路網の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（神経細胞：深い青緑の黒、あたたかい白、シナプスのマゼンタ、軸索のライム）
const BG = [8, 22, 24];                  // 背景（深い青緑の黒）
const INK = [246, 238, 224];             // 文字（あたたかい白）
const MAG = [232, 72, 160], LIME = [184, 232, 76], AMBER = [250, 186, 72], SKY = [96, 196, 236], VIOLET = [168, 140, 250];
const SUB = [150, 178, 172], PANEL = [16, 38, 40], WIRE = [44, 76, 76];
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function sumOf(a) { let s = 0; for (let v of a) s += v; return s; }
function meanOf(a) { return a.length ? sumOf(a) / a.length : 0; }
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; let s = v.toFixed(d === undefined ? 2 : d); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; }
function fmtE(v) { if (typeof v !== 'number' || !isFinite(v)) return '?'; return v === 0 ? '0' : v.toExponential(1); }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...SUB); textSize(14); text(sub, 30, 62);
}
function sigm(z) { return 1 / (1 + Math.exp(-clampv(z, -40, 40))); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                         // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function randn() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1 }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function plotAxes(g, xl, yl, xt, yt) {
  stroke(...WIRE); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(...SUB); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(...INK); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {                 // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape を作らない）
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function plotXY(g, xs, ys, col, sw) {    // (xs[i], ys[i]) を折れ線で（有限の値だけ）
  let pts = []; for (let i = 0; i < xs.length; i++) if (isFinite(ys[i])) pts.push([gX(g, xs[i]), gY(g, ys[i])]);
  stroke(...col); strokeWeight(sw || 2); polyline(pts);
}
function legend(x, y, items) {           // items = [[色, 名前], …]
  textSize(13); textAlign(LEFT, CENTER);
  for (let [c, s] of items) { noStroke(); fill(...c); rect(x, y - 5, 16, 10); fill(...INK); text(s, x + 22, y); y += 20; }
  textAlign(LEFT, BASELINE);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function relErr(a, b) { return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b)); }
function noNaN(v) { return Array.isArray(v) || ArrayBuffer.isView(v) ? Array.from(v).every(noNaN) : !(typeof v === 'number' && !isFinite(v)); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(150, 230, 170) : color(255, 90, 110)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
