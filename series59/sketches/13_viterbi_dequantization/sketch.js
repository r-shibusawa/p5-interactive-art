// ============================================
// 13 ビタビと脱量子化 ─ 確率の掛け算は対数にすると足し算、「いちばん大きい」は max → 最尤の道さがしはマックスプラスの行列計算
// 隠れマルコフモデル：天気（晴れ・くもり・雨）は見えず、友だちの行動（散歩・買い物・掃除）だけが見える
//   ビタビ：δ_t(j) = max_i (δ_{t−1}(i) + log a_ij) + log b_j(o_t)。確率 0 の遷移は log 0 = −∞ = ε
// 温度 h の log-sum-exp：h·log(e^{a/h} + e^{b/h}) は h → 0 で max(a, b)（マスロフの脱量子化）。h = 1 なら前向きアルゴリズム（確率の和）
// 上の行動をクリックで変える / ↑↓ 温度 h / R ランダムな行動 / M ランダムなモデル
// ============================================

const ST = ['晴れ', 'くもり', '雨'], OB = ['散歩', '買い物', '掃除'];
let pi0 = [0.5, 0.3, 0.2];                                                    // ★ はじめの天気の確率
let trans = [[0.6, 0.3, 0.1], [0.3, 0.4, 0.3], [0, 0.4, 0.6]];                // ★ a_ij = 今日 i → 明日 j（雨 → 晴れ は 0）
let emit = [[0.6, 0.3, 0.1], [0.3, 0.4, 0.3], [0.1, 0.3, 0.6]];               // ★ b_j(o) = 天気 j のとき行動 o
let obs = [0, 0, 1, 2, 2, 1, 0], hTemp = 0.5, vit = null, bf = null;          // ★ 見えた行動の列、温度 h

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); recompute(); }
function lg(p) { return p > 0 ? Math.log(p) : NEG_INF; }
// ★ 温度 h の log-sum-exp（大きい数でもあふれないように max を引いてから）。h → 0 で max
function lseH(arr, h) {
  let m = arr.reduce((a, b) => mpAdd(a, b), NEG_INF); if (m === NEG_INF) return NEG_INF;
  let s = 0; for (let v of arr) if (v !== NEG_INF) s += Math.exp((v - m) / h);
  return m + h * Math.log(s);
}
// ★ ビタビ（max-plus の行列とベクトルの積をくり返す）＋ 道のもどり
function viterbi(p0, A, B, o) {
  let L = A.map((r) => r.map(lg)), d = p0.map((p, j) => mpMul(lg(p), lg(B[j][o[0]]))), back = [];
  for (let t = 1; t < o.length; t++) {
    let nd = [], bp = [];
    for (let j = 0; j < p0.length; j++) { let best = NEG_INF, arg = 0; for (let i = 0; i < p0.length; i++) { let v = mpMul(d[i], L[i][j]); if (v > best) { best = v; arg = i; } } nd.push(mpMul(best, lg(B[j][o[t]]))); bp.push(arg); }
    back.push(bp); d = nd;
  }
  let last = 0; d.forEach((v, j) => { if (v > d[last]) last = j; });
  let path = [last]; for (let t = back.length - 1; t >= 0; t--) path.unshift(back[t][path[0]]);
  return { logp: d[last], path, delta: d };
}
// ★ 温度 h の前向きアルゴリズム：max を h·log-sum-exp に替えただけ（h = 1 で本当の確率の和）
function forwardH(p0, A, B, o, h) {
  let L = A.map((r) => r.map(lg)), f = p0.map((p, j) => mpMul(lg(p), lg(B[j][o[0]])));
  for (let t = 1; t < o.length; t++) f = p0.map((_, j) => mpMul(lseH(f.map((v, i) => mpMul(v, L[i][j])), h), lg(B[j][o[t]])));
  return lseH(f, h);
}
function bruteAll(p0, A, B, o) {      // 総当たり：3^T 通りの天気の列すべて
  let n = p0.length, T = o.length, best = { lp: NEG_INF, path: null }, sum = 0;
  for (let code = 0; code < n ** T; code++) {
    let s = [], c = code; for (let t = 0; t < T; t++) { s.push(c % n); c = Math.floor(c / n); }
    let p = p0[s[0]] * B[s[0]][o[0]]; for (let t = 1; t < T; t++) p *= A[s[t - 1]][s[t]] * B[s[t]][o[t]];
    sum += p; if (lg(p) > best.lp) best = { lp: lg(p), path: s };
  }
  return { best, logSum: lg(sum) };
}
function recompute() { vit = viterbi(pi0, trans, emit, obs); bf = bruteAll(pi0, trans, emit, obs); }

function draw() {
  background(22, 22, 28);
  let T = obs.length, cw = Math.min(110, (width * 0.55) / T), ox = 120, oy = 150, rh = 70, cols = [[255, 200, 90], [170, 180, 200], [110, 170, 255]];
  // ---- 見えた行動とトレリス
  for (let t = 0; t < T; t++) {
    noStroke(); fill(50); rect(ox + t * cw - cw * 0.4, oy - 64, cw * 0.8, 30, 6);
    fill(240); textAlign(CENTER, CENTER); textSize(14); text(OB[obs[t]], ox + t * cw, oy - 49);
    for (let j = 0; j < 3; j++) {
      let on = vit.path[t] === j, bon = bf.best.path[t] === j;
      if (t > 0) for (let i = 0; i < 3; i++) if (trans[i][j] > 0) { stroke(255, 255, 255, 25); strokeWeight(1); line(ox + (t - 1) * cw, oy + i * rh, ox + t * cw, oy + j * rh); }
      if (t > 0 && on) { stroke(255, 170, 70); strokeWeight(4); line(ox + (t - 1) * cw, oy + vit.path[t - 1] * rh, ox + t * cw, oy + j * rh); }
      noStroke(); fill(...cols[j], on ? 255 : 90); circle(ox + t * cw, oy + j * rh, on ? 30 : 22);
      if (bon) { noFill(); stroke(255); strokeWeight(1.5); circle(ox + t * cw, oy + j * rh, 40); }
    }
  }
  noStroke(); fill(220); textSize(15); textAlign(RIGHT, CENTER); for (let j = 0; j < 3; j++) text(ST[j], ox - 30, oy + j * rh);
  textAlign(LEFT, BASELINE); fill(255, 220, 120); textSize(16);
  let y0 = oy + 3 * rh + 10;
  text('ビタビの答え：' + vit.path.map((j) => ST[j]).join(' → ') + '　log P = ' + mpFmt(vit.logp, 4), 40, y0);
  fill(200); text('総当たり（3^' + T + ' = ' + 3 ** T + ' 通り）の最大：' + bf.best.path.map((j) => ST[j]).join(' → ') + '　log P = ' + mpFmt(bf.best.lp, 4) + (near(bf.best.lp, vit.logp, 1e-9) ? '　✓ 一致（白い輪）' : ''), 40, y0 + 26, width * 0.58);
  // ---- 温度 h の前向き：h → 0 でビタビ
  let g = { x: 70, y: y0 + 100, w: width * 0.5, h: height - y0 - 190, x0: Math.log10(0.01), x1: 0, y0: vit.logp - 1, y1: bf.logSum + 1 };
  plotAxes(g, 'log₁₀ h（左ほど温度が低い）', '温度 h の前向きの値 F_h', [-2, -1, 0], [+vit.logp.toFixed(2), +bf.logSum.toFixed(2)]);
  let pts = []; for (let q = 0; q <= 80; q++) { let lh = g.x0 + ((g.x1 - g.x0) * q) / 80; pts.push([gX(g, lh), gY(g, forwardH(pi0, trans, emit, obs, 10 ** lh))]); }
  stroke(255, 170, 70); strokeWeight(2.5); polyline(pts);
  stroke(255, 220, 120, 150); strokeWeight(1); line(g.x, gY(g, vit.logp), g.x + g.w, gY(g, vit.logp)); line(gX(g, 0), g.y, gX(g, 0), g.y + g.h);
  let Fh = forwardH(pi0, trans, emit, obs, hTemp); noStroke(); fill(255); circle(gX(g, Math.log10(hTemp)), gY(g, Fh), 10);
  fill(200); textSize(14); textAlign(LEFT, BASELINE);
  text('h = ' + hTemp.toFixed(3) + '：F_h = ' + Fh.toFixed(4) + '　（h = 1 → log(確率の和) = ' + bf.logSum.toFixed(4) + '、h → 0 → ビタビ ' + vit.logp.toFixed(4) + '）', g.x, g.y + g.h + 54);
  // ---- 2 つの数の log-sum-exp
  let g2 = { x: width * 0.64, y: 130, w: width * 0.32, h: height * 0.4, x0: -4, x1: 4, y0: -1, y1: 5 };
  plotAxes(g2, 'b（a = 0 に固定）', 'h·log(e^{0/h} + e^{b/h})', [-4, 0, 4], [0, 2, 4]);
  for (let hh of [2, 1, 0.5, hTemp]) {
    let q = []; for (let s = 0; s <= 80; s++) { let b = -4 + (8 * s) / 80; q.push([gX(g2, b), gY(g2, lseH([0, b], hh))]); }
    stroke(hh === hTemp ? color(255, 170, 70) : color(110, 190, 255, 120)); strokeWeight(hh === hTemp ? 3 : 1.5); polyline(q);
  }
  stroke(255); strokeWeight(1.5); polyline([[gX(g2, -4), gY(g2, 0)], [gX(g2, 0), gY(g2, 0)], [gX(g2, 4), gY(g2, 4)]]);
  noStroke(); fill(220); textSize(14);
  text('白 = max(0, b)。青 = h = 2, 1, 0.5、オレンジ = いまの h', g2.x, g2.y + g2.h + 50, g2.w);
  text('ずれは最大 h·ln 2 = ' + (hTemp * Math.log(2)).toFixed(4) + '（b = 0 のとき）。h → 0 で「足し算」が「max」に：log(e^a + e^b) → max(a, b)', g2.x, g2.y + g2.h + 92, g2.w);
  fill(170); text('max-plus の世界の「フーリエ変換」にあたるのがルジャンドル変換（シリーズ 43 の 06）', g2.x, g2.y + g2.h + 150, g2.w);
  fill(240); textSize(20); text('ビタビと脱量子化　温度 h = ' + hTemp.toFixed(3), 40, 40);
  fill(170); textSize(15); text('上の行動をクリックで変える　↑↓ 温度 h　R ランダムな行動　M ランダムなモデル', 40, 66);
  drawSelfTest(width - 170, height - 12);
}

function mousePressed() {
  let T = obs.length, cw = Math.min(110, (width * 0.55) / T);
  for (let t = 0; t < T; t++) if (Math.abs(mouseX - (120 + t * cw)) < cw * 0.4 && Math.abs(mouseY - (150 - 49)) < 16) { obs[t] = (obs[t] + 1) % 3; recompute(); }
}
function keyPressed() {
  if (key === UP_ARROW) hTemp = Math.min(1, hTemp * 1.25);
  if (key === DOWN_ARROW) hTemp = Math.max(0.01, hTemp / 1.25);
  if (key === 'r' || key === 'R') { obs = obs.map(() => Math.floor(Math.random() * 3)); recompute(); }
  if (key === 'm' || key === 'M') { seedRng(Math.floor(Math.random() * 1e6)); [pi0, trans, emit] = randomModel(); recompute(); }
  return false;
}
function randomModel() { let rowP = () => { let r = [rnd() + 0.05, rnd() + 0.05, rnd() + 0.05], s = r[0] + r[1] + r[2]; return r.map((v) => v / s); }; return [rowP(), [rowP(), rowP(), rowP()], [rowP(), rowP(), rowP()]]; }

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(13);
  let okP = true, okV = true, okF = true, okH = true;
  for (let t = 0; t < 30; t++) {
    let [p0, A, B] = randomModel(), o = Array.from({ length: 6 }, () => rndInt(0, 2)), v = viterbi(p0, A, B, o), b = bruteAll(p0, A, B, o);
    if (v.path.join() !== b.best.path.join()) okP = false;
    if (!near(v.logp, b.best.lp, 1e-9)) okV = false;
    if (!near(forwardH(p0, A, B, o, 1), b.logSum, 1e-9)) okF = false;
    let F = forwardH(p0, A, B, o, 0.01); if (!(F >= v.logp - 1e-9 && F <= v.logp + 0.01 * 6 * Math.log(3) + 1e-9)) okH = false;
  }
  check('ビタビの道 = 総当たりの最尤の道（ランダムなモデル 30 個、長さ 6）', okP);
  check('ビタビの log P = 総当たりの最大（10⁻⁹ まで）', okV);
  check('温度 h = 1 の前向き = log(全部の道の確率の和)（前向きアルゴリズム）', okF);
  check('h = 0.01：ビタビ ≤ F_h ≤ ビタビ + h·T·ln 3（脱量子化の誤差の上限）', okH);
  let ok2 = true; for (let t = 0; t < 200; t++) { let a = rnd() * 20 - 10, b = rnd() * 20 - 10, h = 0.01 + rnd() * 3, L = lseH([a, b], h); if (!(L >= Math.max(a, b) - 1e-12 && L <= Math.max(a, b) + h * Math.log(2) + 1e-12) || !near(L, h * Math.log(Math.exp(a / h) + Math.exp(b / h)), 1e-9)) ok2 = false; }
  check('2 つの数：max(a, b) ≤ h·log(e^{a/h} + e^{b/h}) ≤ max(a, b) + h·ln 2、ふつうの式と一致', ok2);
  check('あふれない・NaN なし：a = b = 1000、h = 0.001 → 1000 + 0.001·ln 2。全部 ε なら ε', near(lseH([1000, 1000], 0.001), 1000 + 0.001 * Math.log(2), 1e-9) && lseH([NEG_INF, NEG_INF], 0.5) === NEG_INF && noNaN(viterbi(pi0, trans, emit, [2, 2, 0, 0]).delta));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 行動を「掃除」ばかりにすると、ビタビの答えは？ 途中に「散歩」を 1 つ入れると？
// 2. ↓ で h を小さくして、オレンジの曲線が白い max の折れ線に近づくのを見よう
// 3. 雨 → 晴れ の確率は 0（log 0 = ε）。ビタビの道に「雨 → 晴れ」が出てこないことを確かめよう
// 4. h = 1 の値は「どの天気の列でもいいから、この行動になる確率」の対数。ビタビとの差は何を表す？
// 5. 音声認識・DNA の並べ方・誤り訂正符号も、このビタビ（max-plus の動的計画法）で解いている

// ==================================================
// ここから下は「マックスプラスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- マックスプラスの数：ε = −∞（「ゼロ」= 起きない・制約なし）、e = 0（「いち」= 待ち時間なし）
const NEG_INF = -Infinity;
function mpAdd(a, b) { return a >= b ? a : b; }                                   // a ⊕ b = max(a, b)
function mpMul(a, b) { return a === NEG_INF || b === NEG_INF ? NEG_INF : a + b; }  // a ⊗ b = a + b（ε があれば ε。−∞ + ∞ を作らない）
function mpFmt(v, d) {                                                             // ε を「ε」と表示（−Infinity を見せない）
  if (v === NEG_INF) return 'ε';
  if (v === Infinity) return '+∞';
  if (typeof v !== 'number' || v !== v) return '?';
  let s = (+v.toFixed(d === undefined ? 1 : d)).toString();
  return s === '-0' ? '0' : s;
}
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
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
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
