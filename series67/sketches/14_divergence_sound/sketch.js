// ============================================
// 14 分布を聞く 🔊 ─ 8 つの音（ド〜高いド）の確率分布から、拍ごとに 1 音をくじ引きして鳴らす
// 目標の分布（白い枠）へなめらかに近づける道を 4 通り：1 m-測地線（確率を混ぜる）2 e-測地線（対数で混ぜる）
// 3 自然勾配（KL(目標‖p) をフィッシャー行列 7×7 の連立方程式で）4 ふつうの勾配（ソフトマックスの対数のまま）。道によってメロディの変わり方がちがう
// 自然勾配の道は m-測地線とほぼ同じ（η 座標でまっすぐ目標へ）。いまの KL を表示
// クリック 音 ON / 棒をドラッグ = いまの分布 / スペース 目標へ向かう・止まる / 1〜4 道 / T 次の目標 / ↑↓ テンポ
// ============================================

const NOTES = [60, 62, 64, 65, 67, 69, 71, 72];   // ★ 鳴らす音（MIDI：ド レ ミ ファ ソ ラ シ ド）
const NOTE_NAMES = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド↑'];
const TARGETS = [                         // ★ 目標の分布
  ['ドミソ（和音の音）', [0.3, 0.02, 0.25, 0.02, 0.3, 0.02, 0.02, 0.07]],
  ['高い音ばかり', [0.01, 0.01, 0.02, 0.04, 0.1, 0.2, 0.3, 0.32]],
  ['レとラだけ', [0.01, 0.45, 0.01, 0.01, 0.01, 0.48, 0.01, 0.02]],
  ['一様', [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125]],
];
const PATHS = ['m-測地線', 'e-測地線', '自然勾配', 'ふつうの勾配'];
let pNow = [0.05, 0.05, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2], pStart = null, tgK = 0, pathK = 0, moving = false, sMix = 0, thetaVec = null, bpm = 150, nextBeat = 0, roll = [], klHist = [], barR, dragging = false;

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); seedRng(14); layout(); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }
function layout() { barR = { x: 70, y: 130, w: width * 0.5, h: height * 0.36 }; }
function tgt() { return normP(TARGETS[tgK][1]); }
function logits(p) { return p.map((v) => safeLog(v) - safeLog(p[p.length - 1])); }     // θ_i = log(p_i / p_8)（最後は 0）
function softmax(th) { let m = Math.max(...th), e = th.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); }
// ★ 自然勾配の 1 歩：∇_θ KL(t‖p) = p − t（7 成分）、F = diag(p) − p pᵀ（7×7）を解いて Δθ = −lr F⁻¹ ∇
function naturalStep(th, t, lr) {
  let p = softmax(th), n = p.length - 1, F = [], g = [];
  for (let i = 0; i < n; i++) { F.push([]); for (let j = 0; j < n; j++) F[i].push((i === j ? p[i] : 0) - p[i] * p[j]); g.push(p[i] - t[i]); }
  let d = solveLin(F, g);
  return th.map((v, i) => (i < n ? v - lr * clampv(d[i], -50, 50) : 0));
}
function plainStep(th, t, lr) { let p = softmax(th); return th.map((v, i) => (i < th.length - 1 ? v - lr * (p[i] - t[i]) : 0)); }
function startMove() { pStart = pNow.slice(); sMix = 0; thetaVec = logits(pNow); moving = true; klHist = []; }
function advance() {                     // 1 フレーム分だけ目標へ近づける
  let t = tgt();
  if (pathK === 0 || pathK === 1) { sMix = Math.min(1, sMix + 1 / 360); pNow = pathK === 0 ? mixM(pStart, t, sMix) : mixE(pStart, t, sMix); if (sMix >= 1) moving = false; }
  else { thetaVec = pathK === 2 ? naturalStep(thetaVec, t, 0.012) : plainStep(thetaVec, t, 0.25); pNow = softmax(thetaVec); if (divKL(t, pNow) < 1e-5) moving = false; }
  pNow = mixFloor(pNow, 1e-6);
}

function draw() {
  background(...BG);
  hudTitle('分布を聞く：' + (audioCtx ? '音 ON' : 'クリックで音 ON') + '　道 = ' + PATHS[pathK] + '　目標 = ' + TARGETS[tgK][0], 'クリック 音 ON　棒をドラッグ　スペース 目標へ ' + (moving ? '移動中' : '止まっている') + '　1 m　2 e　3 自然勾配　4 ふつうの勾配　T 次の目標　↑↓ テンポ ' + bpm);
  if (moving) advance();
  let t = tgt(), kl = divKL(pNow, t), klr = divKL(t, pNow);
  if (frameCount % 3 === 0) { klHist.push([kl, klr]); if (klHist.length > 300) klHist.shift(); }
  // ---- 拍ごとに 1 音
  if (audioCtx) {
    let now = audioCtx.currentTime;
    if (nextBeat < now) nextBeat = now + 0.05;
    while (nextBeat < now + 0.1) { let k = sampleIndex(pNow); playNote(midiHz(NOTES[k]), nextBeat, 0.35, 'triangle', 0.35); roll.unshift({ k, life: 1 }); if (roll.length > 32) roll.pop(); nextBeat += 60 / bpm; }
  } else if (frameCount % Math.round(3600 / bpm) === 0) { roll.unshift({ k: sampleIndex(pNow), life: 1 }); if (roll.length > 32) roll.pop(); }
  drawBars(pNow, barR, { names: NOTE_NAMES, ghost: t, vmax: 0.6 });
  noStroke(); fill(...DIMC); textSize(13); textAlign(LEFT, BASELINE); text('色 = いまの分布、白い枠 = 目標', barR.x, barR.y - 14);
  // ---- 右：KL の変化
  let rx = barR.x + barR.w + 50, b = plotBox(rx, 130, width - rx - 40, height * 0.3, 0, 300, 0, Math.max(0.5, ...klHist.map((h) => Math.min(4, h[0]))));
  drawAxes(b, '時間', 'KL(p‖目標)（オレンジ）と KL(目標‖p)（紫）');
  plotLine(b, klHist.map((h, i) => [i, Math.min(b.y1, h[0])]), ORANGE, 2); plotLine(b, klHist.map((h, i) => [i, Math.min(b.y1, h[1])]), VIOLET, 2);
  fill(...INK); textSize(16); textAlign(LEFT, BASELINE);
  text('KL(p‖目標) = ' + fmtN(bitsOf(kl), 4) + ' ビット', rx, b.y + b.h + 44); text('KL(目標‖p) = ' + fmtN(bitsOf(klr), 4) + ' ビット', rx, b.y + b.h + 68);
  fill(...DIMC); textSize(14); text('エントロピー H(p) = ' + fmtN(bitsOf(entropyH(pNow)), 3) + ' ビット（最大 3 = 8 音が同じ確率）', rx, b.y + b.h + 96);
  text('m：0 だった音が少しずつ増える　e：0 に近い音はなかなか出ない', rx, b.y + b.h + 120);
  // ---- 下：鳴った音（新しいほど左）
  let ry = barR.y + barR.h + 70, cw = Math.min(34, (width - 140) / 32), rh = 16;
  noStroke(); fill(...DIMC); textSize(13); text('鳴った音（新しいほど左、高さ = 音の高さ）', 70, ry - 10);
  roll.forEach((r, i) => { fill(...OUTC[r.k], 255 - i * 6); rect(70 + i * cw, ry + (7 - r.k) * rh, cw - 3, rh - 2, 3); });
  drawSelfTest(width - 180, height - 14);
}
function mousePressed() { startAudio(); dragging = inRect(mouseX, mouseY, { x: barR.x, y: barR.y - 20, w: barR.w, h: barR.h + 40 }); mouseDragged(); }
function mouseDragged() { if (dragging) { moving = false; pNow = barsDrag(pNow, { x: barR.x, y: barR.y + barR.h - barR.h / 0.6, w: barR.w, h: barR.h / 0.6 }, mouseX, mouseY, 0.002); } }
function mouseReleased() { dragging = false; }
function keyPressed() {
  startAudio();
  if (key === ' ') { if (moving) moving = false; else startMove(); }
  for (let k = 1; k <= 4; k++) if (key === String(k)) { pathK = k - 1; if (moving) startMove(); }
  if (key === 't' || key === 'T') { tgK = (tgK + 1) % TARGETS.length; if (moving) startMove(); }
  if (key === UP_ARROW) bpm = Math.min(300, bpm + 10);
  if (key === DOWN_ARROW) bpm = Math.max(60, bpm - 10);
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  let p0 = normP([0.05, 0.05, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2]), t = normP(TARGETS[0][1]), ok = true;
  for (let fn of [mixM, mixE]) { let a = fn(p0, t, 0), b = fn(p0, t, 1); if (a.some((v, i) => Math.abs(v - p0[i]) > 1e-12) || b.some((v, i) => Math.abs(v - t[i]) > 1e-12) || Math.abs(fn(p0, t, 0.4).reduce((s, v) => s + v, 0) - 1) > 1e-12) ok = false; }
  check('m と e の道は t = 0 で出発点、t = 1 で目標、途中も合計 1', ok);
  let th = logits(p0), q = softmax(th), n = 7, F = [], g = [];
  for (let i = 0; i < n; i++) { F.push([]); for (let j = 0; j < n; j++) F[i].push((i === j ? q[i] : 0) - q[i] * q[j]); g.push(q[i] - t[i]); }
  let d = solveLin(F, g), r = matVec(F, d);
  check('フィッシャー行列 7×7 の連立方程式 F x = ∇ の残差 < 1e-12、logits → softmax でもとにもどる', r.every((v, i) => Math.abs(v - g[i]) < 1e-12) && q.every((v, i) => Math.abs(v - p0[i]) < 1e-12));
  let devN = 0, devP = 0, mono = true, prev = Infinity, thN = logits(p0), thP = logits(p0);
  let distToM = (p) => { let best = Infinity; for (let k = 0; k <= 400; k++) best = Math.min(best, tvDist(p, mixM(p0, t, k / 400))); return best; };
  for (let s = 0; s < 600; s++) {
    thN = naturalStep(thN, t, 0.012); thP = plainStep(thP, t, 0.25);
    let pn = softmax(thN), kl = divKL(t, pn); if (kl > prev + 1e-12) mono = false; prev = kl;
    if (s % 20 === 0) { devN = Math.max(devN, distToM(pn)); devP = Math.max(devP, distToM(softmax(thP))); }
  }
  check('自然勾配の道は m-測地線から ' + fmtN(devN, 4) + ' しか離れない（ふつうの勾配は ' + fmtN(devP, 3) + '）', devN < 0.01 && devP > 3 * devN);
  check('自然勾配で KL(目標‖p) は毎歩減り、600 歩で ' + fmtN(prev, 6) + ' まで', mono && prev < 1e-3);
  let e0 = q, e1 = softmax(naturalStep(th, t, 1e-3)), okEta = true;
  for (let i = 0; i < 8; i++) if (Math.abs((e1[i] - e0[i]) - -1e-3 * (e0[i] - t[i])) > 1e-5) okEta = false;
  check('自然勾配の 1 歩は η（= 確率）で見ると −lr (p − 目標) の向き（まっすぐ目標へ）', okEta);
  seedRng(140); let c = new Array(8).fill(0), N = 40000; for (let k = 0; k < N; k++) c[sampleIndex(p0)]++;
  check('くじ引き 4 万回の割合は分布から 0.01 以内', c.every((v, i) => Math.abs(v / N - p0[i]) < 0.01));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 同じ目標に 1（m）と 2（e）で近づけて、メロディの変わり方を聞き比べよう。どちらが先に「和音らしく」なる？
// 2. 3（自然勾配）と 1（m）の棒グラフの動きはほとんど同じ。4（ふつうの勾配）はどこがちがう？
// 3. TARGETS に自分の目標（たとえば「ドとソだけ」）を足そう
// 4. NOTES を別の音階（ペンタトニック：60, 62, 64, 67, 69, 72, 74, 76）にしてみよう
// 5. KL(p‖目標) と KL(目標‖p) はどちらが先に小さくなる？ 01 の「向き」を耳で感じよう

// ==================================================
// ここから下は「情報幾何の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 色と小さな道具（等高線地図の色）
const BG = [22, 33, 52];                // 背景（深いスレートブルー）
const INK = [240, 236, 226];            // 文字（紙の白）
const ORANGE = [255, 150, 75], VIOLET = [170, 140, 255], TEAL = [95, 205, 190], ROSE = [255, 110, 125], LIME = [150, 225, 120], SAND = [235, 210, 150];
const DIMC = [140, 152, 175], PANEL = [32, 46, 70], WIRE = [62, 80, 110];
const OUTC = [[255, 150, 75], [95, 205, 190], [170, 140, 255], [235, 210, 150], [255, 110, 125], [150, 225, 120], [120, 175, 255], [230, 140, 210]];   // 結果ごとの色
function clampv(v, a, b) { return v < a ? a : v > b ? b : v !== v ? a : v; }     // NaN なら a に戻す
function fmtN(v, d) { if (typeof v !== 'number' || v !== v) return '?'; if (!isFinite(v)) return v > 0 ? '∞' : '−∞'; return v.toFixed(d === undefined ? 2 : d); }
function fmtP(p, d) { return '(' + p.map((v) => fmtN(v, d === undefined ? 2 : d)).join(', ') + ')'; }
function hudTitle(t, sub) {              // 左上のタイトルと操作の説明
  noStroke(); fill(...INK); textSize(22); textAlign(LEFT, BASELINE); text(t, 30, 38);
  fill(...DIMC); textSize(14); textLeading(19); text(sub, 30, 62);
}
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function drawField(f) { if (f) image(f.img, f.x, f.y, f.w, f.h); }   // 等高線の地図（画像）を描く
function freeField(f) { if (f && f.img) f.img.remove(); }
// ---- 種つきの乱数（同じ種なら毎回同じ列 → 実験をくり返せる）
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function gaussRnd() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布（ボックス-ミュラー法）
function rndDist(k, floor) {            // でたらめな確率分布（k 個、どれも floor 以上）
  let p = []; for (let i = 0; i < k; i++) p.push(-Math.log(1 - rnd()) + 1e-9);
  return mixFloor(normP(p), floor || 0);
}
function sampleIndex(p) { let u = rnd(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; } return p.length - 1; }
// ---- 情報の道具：確率分布 p = [p1, p2, ...]（合計 1）。log(0) は 0·log 0 = 0 として扱う
const TINY = 1e-300;
function normP(p) { let s = 0; for (let v of p) s += Math.max(0, v); if (!(s > 0)) return p.map(() => 1 / p.length); return p.map((v) => Math.max(0, v) / s); }
function mixFloor(p, f) { if (!f) return p; return normP(p.map((v) => Math.max(v, f))); }   // どの確率も f 以上に（0 を避ける）
function safeLog(v) { return Math.log(Math.max(v, TINY)); }
function entropyH(p) { let h = 0; for (let v of p) if (v > 0) h -= v * Math.log(v); return h; }           // エントロピー（ナット）
function divKL(p, q) {                  // KL ダイバージェンス D(p‖q)（ナット）。q が 0 で p > 0 なら ∞
  let d = 0;
  for (let i = 0; i < p.length; i++) { if (p[i] <= 0) continue; if (q[i] <= 0) return Infinity; d += p[i] * Math.log(p[i] / q[i]); }
  return Math.max(0, d);
}
function crossH(p, q) { let h = 0; for (let i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * safeLog(q[i]); return h; }  // 交差エントロピー
function bhatta(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.sqrt(Math.max(0, p[i] * q[i])); return Math.min(1, s); }
function fisherRao(p, q) { return 2 * Math.acos(clampv(bhatta(p, q), -1, 1)); }                          // フィッシャー-ラオ距離 = 球の大円の長さ
function hellingerSq(p, q) { let s = 0; for (let i = 0; i < p.length; i++) { let d = Math.sqrt(p[i]) - Math.sqrt(q[i]); s += d * d; } return s; }   // Σ(√p − √q)²
function tvDist(p, q) { let s = 0; for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]); return s / 2; }
function alphaDiv(p, q, a) {            // α-ダイバージェンス（甘利の流儀）。α → −1 で D(p‖q)、α → +1 で D(q‖p)
  if (Math.abs(a + 1) < 1e-12) return divKL(p, q);
  if (Math.abs(a - 1) < 1e-12) return divKL(q, p);
  let s = 0, ea = (1 - a) / 2, eb = (1 + a) / 2;
  for (let i = 0; i < p.length; i++) s += Math.pow(Math.max(p[i], 0), ea) * Math.pow(Math.max(q[i], 0), eb);
  return Math.max(0, (4 / (1 - a * a)) * (1 - s));
}
function mixM(p, q, t) { return p.map((v, i) => (1 - t) * v + t * q[i]); }                       // m-測地線：確率をそのまま混ぜる
function mixE(p, q, t) { return normP(p.map((v, i) => Math.exp((1 - t) * safeLog(v) + t * safeLog(q[i])))); }   // e-測地線：対数で混ぜて正規化
function mixAlpha(p, q, t, a) {         // α-測地線：u^((1−α)/2) で混ぜて正規化（α = −1 は m、α = +1 は e）
  if (Math.abs(a - 1) < 1e-9) return mixE(p, q, t);
  let ex = (1 - a) / 2;
  return normP(p.map((v, i) => Math.pow((1 - t) * Math.pow(v, ex) + t * Math.pow(q[i], ex), 1 / ex)));
}
function bitsOf(nat) { return nat / Math.LN2; }
// ---- 棒グラフ（ドラッグで高さを変えられる）
function drawBars(p, r, opt) {          // r = {x, y, w, h}、opt = {cols, names, vmax, ghost（重ねて描く別の分布）}
  opt = opt || {};
  let k = p.length, bw = r.w / k, vmax = opt.vmax || 1;
  stroke(...WIRE); strokeWeight(1); line(r.x, r.y + r.h, r.x + r.w, r.y + r.h);
  for (let i = 0; i < k; i++) {
    let hh = (clampv(p[i], 0, vmax) / vmax) * r.h, col = (opt.cols || OUTC)[i % 8];
    noStroke(); fill(...col, 210); rect(r.x + i * bw + 3, r.y + r.h - hh, bw - 6, hh, 3);
    if (opt.ghost) { let gh = (clampv(opt.ghost[i], 0, vmax) / vmax) * r.h; noFill(); stroke(...INK); strokeWeight(1.5); rect(r.x + i * bw + 3, r.y + r.h - gh, bw - 6, gh, 3); }
    noStroke(); fill(...INK); textSize(12); textAlign(CENTER, BASELINE);
    if (bw >= 30) text(fmtN(p[i], 2), r.x + (i + 0.5) * bw, r.y + r.h - hh - 4);   // 細い棒では数字を省く
    fill(...DIMC); text(opt.names ? opt.names[i] : String(i + 1), r.x + (i + 0.5) * bw, r.y + r.h + 15);
  }
}
function barsDrag(p, r, mx, my, floor) {  // 棒をドラッグ：i 番目の高さを変えて、残りを比例で縮める（合計 1 のまま）
  let k = p.length, i = Math.floor((mx - r.x) / (r.w / k));
  if (i < 0 || i >= k || my < r.y - 30 || my > r.y + r.h + 20) return p;
  let v = clampv((r.y + r.h - my) / r.h, floor || 0.001, 1 - (floor || 0.001) * (k - 1)), rest = 1 - p[i], q = p.slice();
  for (let j = 0; j < k; j++) q[j] = j === i ? v : rest > 1e-9 ? (p[j] / rest) * (1 - v) : (1 - v) / (k - 1);
  return mixFloor(q, floor || 0.001);
}
// ---- 小さな連立一次方程式 A x = b（ガウスの消去法、部分ピボット）
function solveLin(A, b) {
  let n = b.length, M = A.map((r, i) => r.slice().concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    let d = Math.abs(M[c][c]) < 1e-300 ? 1e-300 : M[c][c];
    for (let r = c + 1; r < n; r++) { let f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  let x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / (Math.abs(M[r][r]) < 1e-300 ? 1e-300 : M[r][r]); }
  return x;
}
function matVec(A, x) { return A.map((r) => r.reduce((s, v, j) => s + v * x[j], 0)); }
// ---- 2 次元の図の枠（データ座標 ↔ 画面）
function plotBox(x, y, w, h, x0, x1, y0, y1) { return { x, y, w, h, x0, x1, y0, y1 }; }
function toScr(b, u, v) { return [b.x + ((u - b.x0) / (b.x1 - b.x0)) * b.w, b.y + b.h - ((v - b.y0) / (b.y1 - b.y0)) * b.h]; }
function fromScr(b, sx, sy) { return [b.x0 + ((sx - b.x) / b.w) * (b.x1 - b.x0), b.y0 + ((b.y + b.h - sy) / b.h) * (b.y1 - b.y0)]; }
function drawAxes(b, xl, yl) {
  noFill(); stroke(...WIRE); strokeWeight(1); rect(b.x, b.y, b.w, b.h);
  noStroke(); fill(...DIMC); textSize(12); textAlign(CENTER, TOP); text(xl, b.x + b.w / 2, b.y + b.h + 16);
  textAlign(LEFT, TOP); text(fmtN(b.x0, 1), b.x, b.y + b.h + 3); textAlign(RIGHT, TOP); text(fmtN(b.x1, 1), b.x + b.w, b.y + b.h + 3);
  textAlign(RIGHT, CENTER); text(fmtN(b.y0, 1), b.x - 4, b.y + b.h); text(fmtN(b.y1, 1), b.x - 4, b.y); textAlign(LEFT, BOTTOM); text(yl, b.x, b.y - 4);
}
function plotLine(b, pts, col, w) {      // データ座標の点列を折れ線に（枠の外の部分は枠のふちで切る）
  if (!pts || pts.length < 2) return;
  noFill(); stroke(...col); strokeWeight(w || 2);
  let run = [], x0 = b.x - 1, x1 = b.x + b.w + 1, y0 = b.y - 1, y1 = b.y + b.h + 1;
  let flush = () => { if (run.length >= 2) { beginShape(); for (let q of run) vertex(q[0], q[1]); endShape(); } run = []; };
  let clip = (a, c) => {                 // 線分 a→c の枠の中の部分 [t0, t1]（リャン-バースキー法）。なければ null
    let t0 = 0, t1 = 1, dx = c[0] - a[0], dy = c[1] - a[1];
    for (let [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      let r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    return t0 <= t1 ? [t0, t1] : null;
  };
  let prev = null;
  for (let p of pts) {
    let s = toScr(b, p[0], p[1]);
    if (!(s[0] === s[0] && s[1] === s[1] && isFinite(s[0]) && isFinite(s[1]))) { flush(); prev = null; continue; }
    if (prev) {
      let c = clip(prev, s);
      if (!c) flush();
      else {
        let A = [prev[0] + c[0] * (s[0] - prev[0]), prev[1] + c[0] * (s[1] - prev[1])], B = [prev[0] + c[1] * (s[0] - prev[0]), prev[1] + c[1] * (s[1] - prev[1])];
        if (c[0] > 0) { flush(); run.push(A); } else if (!run.length) run.push(A);
        run.push(B);
        if (c[1] < 1) flush();
      }
    }
    prev = s;
  }
  flush(); noStroke();                  // あとの文字にふちがつかないように
}
function gridField(b, fn, opt) {        // 長方形の上の等高線の地図（fn(u, v)）
  opt = opt || {};
  let res = opt.res || 3, gw = Math.ceil(b.w / res), gh = Math.ceil(b.h / res), g = createGraphics(gw, gh); g.pixelDensity(1); g.loadPixels();
  let vals = new Float64Array(gw * gh), lv = opt.level || 0.1, vmin = opt.vmin || 0, vmax = opt.vmax || 1, c0 = opt.c0 || [40, 60, 95], c1 = opt.c1 || ORANGE;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { let [u, v] = fromScr(b, b.x + (i + 0.5) * res, b.y + (j + 0.5) * res); vals[j * gw + i] = fn(u, v); }
  let bandOf = (v) => Math.floor(clampv((v - vmin) / lv, -1e6, 1e6));
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let k = j * gw + i, v = vals[k], o = 4 * k, band = bandOf(v), t = clampv((v - vmin) / (vmax - vmin), 0, 1), sh = band % 2 ? 0.9 : 1;
    let edge = v < (opt.cap || Infinity) && ((i + 1 < gw && bandOf(vals[k + 1]) !== band) || (j + 1 < gh && bandOf(vals[k + gw]) !== band));
    for (let c = 0; c < 3; c++) g.pixels[o + c] = edge ? 235 : (c0[c] + (c1[c] - c0[c]) * t) * sh;
    g.pixels[o + 3] = edge ? 170 : 255;
  }
  g.updatePixels();
  return { img: g, x: b.x, y: b.y, w: b.w, h: b.h };
}
// ---- 音の道具（Web Audio）。全体の音量 MASTER は 0.2 以下
const MASTER = 0.12;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playNote(freq, when, dur, wave, vol) {   // 1 音（やわらかく立ち上がって消える）
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = wave || 'triangle'; o.frequency.setValueAtTime(freq, when);
  gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(vol || 0.6, when + 0.015);
  gn.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + dur + 0.05);
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestOk() { return selfTestResults.every((r) => r.ok); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(...(selfTestOk() ? LIME : ROSE)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
