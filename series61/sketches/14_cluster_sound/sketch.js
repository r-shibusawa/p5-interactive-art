// ============================================
// 14 クラスタの音 ─ 点が「音符」。横 = 時間（左から右へ再生）、縦 = 音の高さ
//   クラスタごとに楽器（音色）と和音が決まっている：0 サイン波・C の和音 / 1 三角波・Am / 2 矩形波・F / 3 のこぎり波・G
//   点の高さは、そのクラスタの和音の音（2 オクターブ分）に合わせる → 同じクラスタの点はいつも和音になる
//   スペースで k-means を半ステップ進める。割り当てで点が別のクラスタに移ると、その点の音色と和音が変わる（光る）
// クリック 点を置く（音が鳴る）/ スペース 半ステップ / A 1 小節ごとに自動 / ↑↓ k / M 消音 / R やり直し（音量は小さめ）
// ============================================

const BAR = 4;                         // ★ 1 小節の秒数
const WAVES = ['sine', 'triangle', 'square', 'sawtooth'];
const CHORDS = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]];   // ★ C・Am・F・G（ド = 0 からの半音の数）
const CHORD_JA = ['C', 'Am', 'F', 'G'];
const WAVE_VOL = [0.5, 0.45, 0.18, 0.15];   // ★ 音色ごとの音量（矩形波・のこぎり波はうるさいので小さく）
let pts = [], centers = [], labels = [], kNum = 3, nextAssign = false, auto = false, muted = false, flash = [], t0 = 0, lastPhase = 0, view, msg = '';

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); selfTest(); reset(); }
function reset() {
  seedRng(141); pts = [];
  for (let g = 0; g < 3; g++) for (let i = 0; i < 7; i++) pts.push([clampv(0.15 + 0.33 * g + 0.09 * gauss(), 0.02, 0.98), clampv(0.3 + 0.2 * g + 0.12 * gauss(), 0.03, 0.97)]);
  seedRng(7); centers = initRandomCenters(pts, kNum); labels = assignLabels(pts, centers); nextAssign = false; flash = pts.map(() => 0); msg = '';
}
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// ★ 点の高さ y（0 = 下、1 = 上）→ クラスタ c の和音の音（C4 = 60 から 2 オクターブ）
function noteOf(y, c) { let tones = []; for (let o = 0; o < 2; o++) for (let s of CHORDS[c % 4]) tones.push(60 + 12 * o + s - 12); let i = clampv(Math.floor(y * tones.length), 0, tones.length - 1); return tones[i]; }
function playPoint(i, when) { if (muted || !audioCtx) return; let c = labels[i]; playTone(midiToFreq(noteOf(pts[i][1], c)), WAVES[c % 4], when, 0.35, WAVE_VOL[c % 4]); }
// ★ 半ステップ。割り当てで別のクラスタに移った点の番号を返す
function halfStep() {
  let moved = [];
  if (nextAssign) { let nl = assignLabels(pts, centers); nl.forEach((l, i) => { if (l !== labels[i]) moved.push(i); }); labels = nl; }
  else centers = updateCenters(pts, labels, centers);
  nextAssign = !nextAssign;
  return moved;
}
function doStep() {
  let moved = halfStep(), now = audioCtx ? audioCtx.currentTime : 0;
  moved.forEach((i, r) => { flash[i] = 60; playPoint(i, now + 0.05 + 0.12 * r); });
  msg = (nextAssign ? '② 更新：中心を平均へ' : '① 割り当て：' + moved.length + ' 点が別のクラスタへ移った') + '（J = ' + inertiaOf(pts, centers, labels).toFixed(4) + '）';
}

function draw() {
  background(22, 24, 34);
  view = { x: 40, y: 100, w: width - 380, h: height - 190, x0: 0, x1: 1, y0: 0, y1: 1 };
  // ボロノイの領域（粗いマス）
  noStroke();
  for (let gy = 0; gy < 24; gy++) for (let gx = 0; gx < 40; gx++) { let p = [(gx + 0.5) / 40, 1 - (gy + 0.5) / 24]; fill(palC(nearestCenter(p, centers), 28)); rect(view.x + (gx * view.w) / 40, view.y + (gy * view.h) / 24, view.w / 40 + 1, view.h / 24 + 1); }
  noFill(); stroke(80); rect(view.x, view.y, view.w, view.h);
  // 再生
  let phase = t0 ? ((millis() - t0) / 1000 / BAR) % 1 : 0;
  if (t0 && audioCtx) {
    pts.forEach((p, i) => { let crossed = lastPhase <= phase ? p[0] > lastPhase && p[0] <= phase : p[0] > lastPhase || p[0] <= phase; if (crossed) { playPoint(i, audioCtx.currentTime); flash[i] = Math.max(flash[i], 12); } });
    if (phase < lastPhase && auto) doStep();
  }
  lastPhase = phase;
  stroke(255, 255, 255, 120); strokeWeight(2); line(gX(view, phase), view.y, gX(view, phase), view.y + view.h);
  // 点と中心
  pts.forEach((p, i) => {
    let c = labels[i], x = gX(view, p[0]), y = gY(view, p[1]);
    if (flash[i] > 0) { noStroke(); fill(255, 255, 255, 4 * flash[i]); circle(x, y, 18 + flash[i] * 0.6); flash[i]--; }
    stroke(20); strokeWeight(1); fill(palC(c)); circle(x, y, 16);
    noStroke(); fill(20); textSize(9); textAlign(CENTER, CENTER); text(noteName(noteOf(p[1], c)), x, y);
  });
  centers.forEach((cn, j) => { stroke(255); strokeWeight(2); fill(palC(j)); rect(gX(view, cn[0]) - 9, gY(view, cn[1]) - 9, 18, 18, 3); });
  // ---- 右：クラスタの楽器と和音
  let bx = width - 310; noStroke(); textAlign(LEFT, BASELINE); textSize(15);
  for (let j = 0; j < kNum; j++) { fill(palC(j)); rect(bx, 120 + j * 52, 22, 22, 4); fill(220); text('クラスタ ' + j + '：' + WAVES[j] + '（' + ['サイン波', '三角波', '矩形波', 'のこぎり波'][j] + '）\n和音 ' + CHORD_JA[j] + '　' + labels.filter((l) => l === j).length + ' 点', bx + 34, 136 + j * 52); }
  fill(255, 220, 140); textSize(14); text(msg, bx, 360, 280);
  fill(150); textSize(13); text('点の中の文字 = 音の名前。縦の位置は同じでも、クラスタが変わると和音の音に合わせ直すので、音の高さが少し変わることがある', bx, 450, 280);
  // ---- 文字
  fill(240); textSize(20);
  text('クラスタの音　k = ' + kNum + '　次は ' + (nextAssign ? '① 割り当て（点が移るかも）' : '② 更新') + (audioCtx ? (muted ? '　消音中' : '') : '　← クリックで音 ON'), 40, 40);
  fill(170); textSize(15); text('クリック 点を置く　スペース 半ステップ　A 1 小節ごとに自動' + (auto ? '（ON）' : '') + '　↑↓ k　M 消音　R やり直し', 40, 66);
  drawSelfTest(width - 170, height - 12);
}
function noteName(m) { return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }

function mousePressed() {
  startAudio(); if (!t0) t0 = millis();
  if (view && inBox(view, mouseX, mouseY) && pts.length < 80) {
    let p = [clampv(invX(view, mouseX), 0, 1), clampv(invY(view, mouseY), 0, 1)]; pts.push(p); labels.push(nearestCenter(p, centers)); flash.push(40);
    if (audioCtx) playPoint(pts.length - 1, audioCtx.currentTime);
  }
}
function keyPressed() {
  startAudio(); if (!t0) t0 = millis();
  if (key === ' ') doStep();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW || key === DOWN_ARROW) { kNum = clampv(kNum + (key === UP_ARROW ? 1 : -1), 2, 4); seedRng(7 + kNum); centers = initRandomCenters(pts, kNum); labels = assignLabels(pts, centers); nextAssign = false; }
  if (key === 'm' || key === 'M') muted = !muted;
  if (key === 'r' || key === 'R') reset();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  seedRng(14);
  let mono = true, onlyAssign = true;
  for (let t = 0; t < 20; t++) {
    pts = Array.from({ length: 25 }, () => [rnd(), rnd()]); centers = initRandomCenters(pts, 2 + (t % 3)); labels = assignLabels(pts, centers); nextAssign = false;
    let prev = inertiaOf(pts, centers, labels);
    for (let s = 0; s < 12; s++) { let wasAssign = nextAssign, mv = halfStep(), J = inertiaOf(pts, centers, labels); if (J > prev + 1e-12) mono = false; if (!wasAssign && mv.length) onlyAssign = false; if (wasAssign && labels.some((l, i) => l !== nearestCenter(pts[i], centers))) onlyAssign = false; prev = J; }
  }
  check('半ステップごとに J は増えない（20 通り）', mono);
  check('点がクラスタを移るのは割り当てのときだけ、移った先はいちばん近い中心', onlyAssign);
  let inChord = true, range = true;
  for (let c = 0; c < 4; c++) for (let y = 0; y <= 1; y += 0.01) { let m = noteOf(y, c); if (!CHORDS[c].some((s) => (((m - 60 - s) % 12) + 12) % 12 === 0)) inChord = false; let f = midiToFreq(m); if (f < 100 || f > 1000) range = false; }
  check('どの高さの点も、そのクラスタの和音の音になる（C・Am・F・G）', inChord);
  check('音の高さは 100〜1000 Hz の中、A4 = 440 Hz、A5 = 880 Hz', range && near(midiToFreq(69), 440, 1e-12) && near(midiToFreq(81), 880, 1e-12));
  check('全体の音量 MASTER = ' + MASTER + ' ≤ 0.2、1 音の音量 ≤ 0.5', MASTER <= 0.2 && WAVE_VOL.every((v) => v <= 0.5));
  check('クラスタ 0〜3 の音色と和音はみんなちがう', new Set(WAVES).size === 4 && new Set(CHORD_JA).size === 4);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. まずクリックで音 ON。スペースを押していき、割り当てのときに光った点の音が変わるのを聞こう
// 2. A で自動にすると、1 小節ごとに半ステップ進む。止まったら（J が変わらない）音楽も同じくり返しになる
// 3. 2 つのクラスタのあいだに点を置くと？ どちらの楽器になるかは、近い中心しだい
// 4. ↑↓ で k を 4 にすると G の和音（のこぎり波）が加わる。CHORDS を変えて自分のコード進行にしよう
// 5. 横 = 時間なので、クラスタが「左のほう」に集まると曲の前半、右なら後半に鳴る

// ==================================================
// ここから下は「クラスタリングの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 共通：値をはさむ・クラスタの色・距離（点は [x, y] や [r, g, b] のような配列）
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const PAL = [[176, 140, 255], [110, 230, 190], [255, 190, 80], [110, 180, 255], [255, 120, 130], [200, 240, 110], [255, 150, 220], [90, 210, 220], [255, 150, 70], [190, 190, 255]];
function palC(k, a) {                  // クラスタ k の色（k < 0 = ノイズ = 灰色）
  let al = a === undefined ? 255 : a;
  if (k < 0) return color(120, 120, 135, al);
  let c = PAL[k % PAL.length]; return color(c[0], c[1], c[2], al);
}
function sqd(a, b) { let s = 0; for (let i = 0; i < a.length; i++) { let d = a[i] - b[i]; s += d * d; } return s; }   // 距離の 2 乗
function edist(a, b) { return Math.sqrt(sqd(a, b)); }                                                              // ユークリッド距離
function meanOf(arr) { if (!arr.length) return 0; let s = 0; for (let v of arr) s += v; return s / arr.length; }
// ---- 種つきの乱数（同じ種なら毎回同じ列）
let rngState = 1, gaussSpare = null;
function seedRng(s) { rngState = (s >>> 0) || 1; gaussSpare = null; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function gauss() {                     // 標準正規分布（ボックス-ミュラー法）
  if (gaussSpare !== null) { let g = gaussSpare; gaussSpare = null; return g; }
  let u = 1 - rnd(), v = rnd(), r = Math.sqrt(-2 * Math.log(u));
  gaussSpare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v);
}
// ---- k-means（ロイドのアルゴリズム）。目的関数 = 慣性 = Σ |x_i − 中心|²
function nearestCenter(p, centers) { let best = 0, bd = Infinity; for (let j = 0; j < centers.length; j++) { let d = sqd(p, centers[j]); if (d < bd) { bd = d; best = j; } } return best; }
function assignLabels(pts, centers) { return pts.map((p) => nearestCenter(p, centers)); }        // ① 割り当て
function inertiaOf(pts, centers, labels) { let s = 0; for (let i = 0; i < pts.length; i++) s += sqd(pts[i], centers[labels[i]]); return s; }
function updateCenters(pts, labels, centers) {                                                     // ② 更新（仲間の平均。仲間 0 なら動かさない）
  let k = centers.length, dim = centers[0].length, sum = centers.map(() => new Array(dim).fill(0)), cnt = new Array(k).fill(0);
  for (let i = 0; i < pts.length; i++) { let l = labels[i]; cnt[l]++; for (let d = 0; d < dim; d++) sum[l][d] += pts[i][d]; }
  return sum.map((s, j) => (cnt[j] ? s.map((v) => v / cnt[j]) : centers[j].slice()));
}
function initRandomCenters(pts, k) {   // ランダムに k 点えらぶ（重ならないように）
  if (!pts.length) return Array.from({ length: k }, () => [0, 0]);
  let idx = pts.map((_, i) => i), out = [];
  for (let j = 0; j < Math.min(k, pts.length); j++) { let r = j + Math.floor(rnd() * (idx.length - j)); [idx[j], idx[r]] = [idx[r], idx[j]]; out.push(pts[idx[j]].slice()); }
  while (out.length < k) out.push(pts[0].slice());
  return out;
}
function initPlusPlus(pts, k) {        // k-means++：今ある中心から遠い点ほど（距離² に比例して）えらばれやすい
  if (!pts.length) return Array.from({ length: k }, () => [0, 0]);
  let out = [pts[Math.floor(rnd() * pts.length)].slice()], d2 = pts.map((p) => sqd(p, out[0]));
  while (out.length < k) {
    let tot = 0; for (let v of d2) tot += v;
    let r = rnd() * tot, pick = pts.length - 1;
    if (tot > 0) { for (let i = 0; i < pts.length; i++) { r -= d2[i]; if (r <= 0) { pick = i; break; } } } else pick = Math.floor(rnd() * pts.length);
    out.push(pts[pick].slice());
    for (let i = 0; i < pts.length; i++) d2[i] = Math.min(d2[i], sqd(pts[i], pts[pick]));
  }
  return out;
}
// 最後まで回す。hist = 半ステップ（割り当て・更新）ごとの慣性
function lloyd(pts, centers0, maxIter) {
  let centers = centers0.map((c) => c.slice()), labels = assignLabels(pts, centers), hist = [inertiaOf(pts, centers, labels)], iters = 0;
  for (let it = 0; it < (maxIter || 100); it++) {
    let nc = updateCenters(pts, labels, centers); hist.push(inertiaOf(pts, nc, labels));
    let nl = assignLabels(pts, nc); hist.push(inertiaOf(pts, nc, nl));
    centers = nc; iters++;
    let same = nl.every((v, i) => v === labels[i]); labels = nl;
    if (same) break;
  }
  return { centers, labels, inertia: hist[hist.length - 1], hist, iters };
}
function kmeansBest(pts, k, restarts, usePP, maxIter) {   // restarts 回やり直して慣性がいちばん小さいものを選ぶ
  let best = null, all = [];
  for (let r = 0; r < restarts; r++) { let res = lloyd(pts, usePP ? initPlusPlus(pts, k) : initRandomCenters(pts, k), maxIter); all.push(res.inertia); if (!best || res.inertia < best.inertia) best = res; }
  best.all = all; return best;
}
// ---- グラフと図の道具：g = { x, y, w, h, x0, x1, y0, y1 }（画面の四角とデータの範囲）
function gX(g, v) { return g.x + clampv((v - g.x0) / (g.x1 - g.x0), -0.02, 1.02) * g.w; }
function gY(g, v) { return g.y + g.h - clampv((v - g.y0) / (g.y1 - g.y0), -0.02, 1.02) * g.h; }
function invX(g, px) { return g.x0 + ((px - g.x) / g.w) * (g.x1 - g.x0); }
function invY(g, py) { return g.y0 + ((g.y + g.h - py) / g.h) * (g.y1 - g.y0); }
function inBox(g, px, py) { return px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h; }
function fitView(x, y, w, h, cx, cy, span) {   // 縦横の縮尺をそろえる（span = 短い辺に入るデータの幅）
  let s = Math.min(w, h) / span; return { x, y, w, h, x0: cx - w / 2 / s, x1: cx + w / 2 / s, y0: cy - h / 2 / s, y1: cy + h / 2 / s };
}
function plotAxes(g, xl, yl, xt, yt) {
  stroke(95); strokeWeight(1); noFill(); rect(g.x, g.y, g.w, g.h);
  noStroke(); fill(165); textSize(12); textAlign(CENTER, TOP);
  for (let v of xt) text(+v.toPrecision(3), gX(g, v), g.y + g.h + 4);
  textAlign(RIGHT, CENTER);
  for (let v of yt) text(+v.toPrecision(3), g.x - 5, gY(g, v));
  textAlign(LEFT, BASELINE); fill(205); textSize(13);
  text(xl, g.x + g.w - textWidth(xl), g.y + g.h + 30); text(yl, g.x, g.y - 8);
}
function polyline(pts) {               // 点が 2 つ以上あるときだけ折れ線を描く
  if (pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape();
}
function drawPts(g, pts, labels, r, al) {   // クラスタの色で点を描く（labels がなければ白）
  noStroke();
  for (let i = 0; i < pts.length; i++) { fill(labels ? palC(labels[i], al) : color(230, 230, 240, al === undefined ? 255 : al)); circle(gX(g, pts[i][0]), gY(g, pts[i][1]), r); }
}
// ---- 音の道具（Web Audio）。音量の上限：全体の音量 MASTER は 0.2 以下
const MASTER = 0.1;                    // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
function playTone(freq, type, when, dur, vol) {   // 1 音（type = 'sine' 'triangle' 'square' 'sawtooth'）
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain(), f = clampv(freq, 40, 4000), v = clampv(vol, 0, 1);
  o.type = type; o.frequency.setValueAtTime(f, when);
  gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), when + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(gn); gn.connect(masterOut); o.start(when); o.stop(when + dur + 0.05);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function noNaN(v) { return Array.isArray(v) ? v.every(noNaN) : !(typeof v === 'number' && v !== v); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14); textAlign(LEFT, BASELINE); text(selfTestLine(), x, y); }
