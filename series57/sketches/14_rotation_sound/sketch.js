// ============================================
// 14 回転の音 ─ 単位四元数の 4 成分を 4 つの声に
// q = (w, x, y, z) の各成分 c を音の高さ f = 220 × 2^c Hz（110〜440 Hz）と音量 c² に。|q| = 1 なので音量の合計はいつも一定
// 姿勢をキーからキーへ slerp でゆっくり回すと、和音がなめらかに変わる。q と −q は同じ姿勢なのに音がちがう（二重被覆が聞こえる）
// クリック：音を出す / スペース：止める・動かす / N：q → −q / ↑↓ 速さ / M：消音 / R：新しいキー姿勢
// ============================================

const MASTER = 0.15;                   // ★ 全体の音量（0.2 以下）
const BASE_F = 220;                    // ★ 成分 0 のときの高さ [Hz]
const NAMES = ['w', 'x', 'y', 'z'], COLS = [[255, 210, 110], [240, 100, 100], [110, 210, 120], [100, 160, 255]];
let keysQ = [], seg = 0, u = 0, speed = 0.004, running = true, flipSign = 1, muted = false, trail = [];

function setup() { createCanvas(windowWidth, windowHeight); selfTest(); newKeys(); }
function newKeys() { seedRng(Math.floor(Math.random() * 1e6)); keysQ = [[1, 0, 0, 0]]; for (let n = 1; n < 6; n++) keysQ.push(qRandom()); seg = 0; u = 0; trail = []; }
function freqOf(c) { return BASE_F * Math.pow(2, c); }
function currentQ() { return qSlerp(keysQ[seg], keysQ[(seg + 1) % keysQ.length], u, true); }

function draw() {
  background(16, 16, 32);
  if (running) { u += speed; if (u >= 1) { u = 0; keysQ[(seg + 1) % keysQ.length] = currentQOf(seg); seg = (seg + 1) % keysQ.length; } }
  let q = qScl(currentQ(), flipSign);
  for (let n = 0; n < 4; n++) setVoice(n, freqOf(q[n]), muted ? 0 : (q[n] * q[n]) * 0.25);
  trail.push(q); if (trail.length > 400) trail.shift();
  // ---- 物体
  let view = { x: width * 0.3, y: height * 0.55, s: Math.min(width, height) * 0.17, d: 8 }, vq = qAxisAngle([1, 0, 0], 0.35);
  drawParts2D(PLANE_PARTS, qMul(vq, q), view);
  // ---- 4 つの声の棒（高さ = 音の高さ、太さ = 音量）
  let bx = width * 0.5, by = height * 0.78, bh = height * 0.5;
  stroke(70); strokeWeight(1); line(bx - 20, by - bh / 2, bx + 380, by - bh / 2);
  for (let n = 0; n < 4; n++) {
    let x = bx + n * 95, h = ((q[n] + 1) / 2) * bh, vol = q[n] * q[n];
    noStroke(); fill(...COLS[n], 60 + 195 * vol); rect(x, by - h, 50, h, 4);
    fill(230); textSize(14); textAlign(CENTER, BASELINE);
    text(NAMES[n] + ' = ' + q[n].toFixed(3), x + 25, by + 24);
    fill(180); textSize(13); text(freqOf(q[n]).toFixed(1) + ' Hz', x + 25, by + 44); text('音量 ' + vol.toFixed(2), x + 25, by + 62);
    textAlign(LEFT, BASELINE);
  }
  fill(170); textSize(13); text('高さの線 = 成分 0（220 Hz）', bx - 20, by - bh / 2 - 8);
  // ---- S³ の上の道のり（x, y, z を平面に、w を色に）
  let px = width * 0.86, py = height * 0.3, pr = Math.min(width, height) * 0.13;
  noFill(); stroke(90); circle(px, py, pr * 2);
  strokeWeight(3);
  for (let n = 1; n < trail.length; n++) { let a = trail[n - 1], b = trail[n]; stroke(b[0] > 0 ? color(255, 210, 110, 60 + n / 3) : color(110, 160, 255, 60 + n / 3)); line(px + a[1] * pr, py - a[2] * pr, px + b[1] * pr, py - b[2] * pr); }
  noStroke(); fill(170); textSize(13); text('q の道のり（横 x・縦 y、色 = w の符号）', px - pr, py + pr + 22);
  let sum = q.reduce((s, v) => s + v * v, 0);
  fill(230); textSize(15);
  text('q = ' + qStr(q, 3) + (flipSign < 0 ? '　（−q で演奏中）' : ''), 20, 120);
  text('音量の合計 = w² + x² + y² + z² = ' + sum.toFixed(6), 20, 146);
  text('キー ' + (seg + 1) + ' → ' + (((seg + 1) % keysQ.length) + 1) + '　t = ' + u.toFixed(2), 20, 172);
  fill(240); textSize(20);
  text('回転の音　4 成分 (w, x, y, z) を 4 つの声に' + (audioCtx ? '' : '（クリックで音が出る）'), 20, 36);
  fill(175); textSize(15);
  text('クリック：音 ON　スペース：止める/動かす　N：q と −q を入れかえる（姿勢は同じ、音はちがう）　↑↓ 速さ　M：消音　R：新しいキー', 20, 62);
  text('音量は小さめから。全体の音量 MASTER は 0.2 以下', 20, 86);
  drawSelfTest(width - 170, height - 12);
}
function currentQOf(s) { let a = keysQ[s], b = keysQ[(s + 1) % keysQ.length]; return qDot(a, b) < 0 ? qScl(b, -1) : b; }   // 着いたキーは近い方の符号にそろえる

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === ' ') running = !running;
  if (key === 'n' || key === 'N') flipSign = -flipSign;
  if (key === UP_ARROW) speed = Math.min(0.03, speed * 1.5);
  if (key === DOWN_ARROW) speed = Math.max(0.0005, speed / 1.5);
  if (key === 'm' || key === 'M') muted = !muted;
  if (key === 'r' || key === 'R') newKeys();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = []; seedRng(14);
  let e1 = 0, e2 = 0, fr = true, diff = 0, e5 = 0;
  for (let t = 0; t < 100; t++) {
    let a = qRandom(), b = qRandom(), q = qSlerp(a, b, rnd(), true);
    e1 = Math.max(e1, Math.abs(q.reduce((s, v) => s + v * v * 0.25, 0) - 0.25));
    e2 = Math.max(e2, matDiff(qToMat(q), qToMat(qScl(q, -1))));
    diff = Math.max(diff, Math.max(...q.map((c) => Math.abs(freqOf(c) - freqOf(-c)))));
    for (let c of q) { if (freqOf(c) < 110 - 1e-9 || freqOf(c) > 440 + 1e-9) fr = false; e5 = Math.max(e5, Math.abs(freqOf(c) * freqOf(-c) - BASE_F * BASE_F)); }
  }
  check('音量の合計 Σ c² × 0.25 = 0.25（|q| = 1 だからいつも一定）', e1 < 1e-12);
  check('q と −q は同じ回転行列（同じ姿勢）', e2 < 1e-15);
  check('でも q と −q の音の高さはちがう（最大の差 ' + diff.toFixed(0) + ' Hz）', diff > 50);
  check('高さ f(c) と f(−c) は 220 Hz をはさんで対称：f(c) f(−c) = 220²', e5 < 1e-8);
  check('高さはいつも 110〜440 Hz（成分は −1〜1）', fr);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 音を出して N を押そう。飛行機の向きは変わらないのに、音はどう変わる？
// 2. 速さを ↑ で上げると、和音の変化はどう聞こえる？ キーのところで音の動きは急に変わる？
// 3. freqOf を BASE_F × 2^(2c)（2 オクターブ）や、ドレミの音階に丸める式に変えよう
// 4. 音量を c² でなく |c| にすると、合計は一定？（式で確かめよう）
// 5. 自由制作：マウスの位置で回転軸を決めて、自分で「回転の楽器」を作ろう


// ==================================================
// ここから下は「四元数の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 四元数 [w, x, y, z] = w + xi + yj + zk（ふつうの配列）
function qMake(w, x, y, z) { return [w, x, y, z]; }
function qMul(a, b) {                  // ハミルトン積（i² = j² = k² = ijk = −1）
  return [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
          a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
          a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
          a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
}
function qConj(a) { return [a[0], -a[1], -a[2], -a[3]]; }               // 共役 q*
function qAdd(a, b) { return a.map((v, t) => v + b[t]); }
function qSub(a, b) { return a.map((v, t) => v - b[t]); }
function qScl(a, s) { return a.map((v) => v * s); }
function qDot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; }
function qNorm(a) { return Math.sqrt(qDot(a, a)); }                     // |q|
function qUnit(a) { let n = qNorm(a); return n > 1e-300 ? qScl(a, 1 / n) : [1, 0, 0, 0]; }
function qInv(a) { let n2 = qDot(a, a); return n2 > 1e-300 ? qScl(qConj(a), 1 / n2) : [0, 0, 0, 0]; }   // q⁻¹ = q*/|q|²
function qDist(a, b) { return qNorm(qSub(a, b)); }
function qAxisAngle(n, th) {           // 軸 n（単位ベクトル）まわりに角度 th の回転：cos(th/2) + sin(th/2) n
  let u = v3Unit(n), s = Math.sin(th / 2);
  return [Math.cos(th / 2), u[0] * s, u[1] * s, u[2] * s];
}
function qRot(q, v) {                  // v を q v q* で回す（v は 3 次元ベクトル → 純四元数）
  let r = qMul(qMul(q, [0, v[0], v[1], v[2]]), qConj(q));
  return [r[1], r[2], r[3]];
}
function qToMat(q) {                   // 同じ q から作った 3×3 回転行列（単位四元数のとき）
  let [w, x, y, z] = q;
  return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
          [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
          [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]];
}
function qExp(a) {                     // exp(w + v) = e^w (cos|v| + sin|v| v/|v|)
  let vn = Math.hypot(a[1], a[2], a[3]), ew = Math.exp(a[0]), s = vn > 1e-12 ? Math.sin(vn) / vn : 1 - (vn * vn) / 6;
  return [ew * Math.cos(vn), ew * s * a[1], ew * s * a[2], ew * s * a[3]];
}
function qLog(a) {                     // log q = ln|q| + acos(w/|q|) v/|v|
  let n = qNorm(a), vn = Math.hypot(a[1], a[2], a[3]), th = Math.atan2(vn, a[0]), s = vn > 1e-12 ? th / vn : 1 / Math.max(n, 1e-300);
  return [Math.log(Math.max(n, 1e-300)), s * a[1], s * a[2], s * a[3]];
}
function qSlerp(a, b, t, shortest) {   // 球面線形補間。shortest = true なら −b と近い方の道
  let d = qDot(a, b);
  if (shortest && d < 0) { b = qScl(b, -1); d = -d; }
  d = clampv(d, -1, 1);
  let om = Math.acos(d), so = Math.sin(om);
  if (so < 1e-9) return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));        // ほぼ同じ向き → lerp で十分
  return qAdd(qScl(a, Math.sin((1 - t) * om) / so), qScl(b, Math.sin(t * om) / so));
}
function qNlerp(a, b, t, shortest) {   // 正規化した線形補間（まっすぐ結んで |q| = 1 にもどす）
  if (shortest && qDot(a, b) < 0) b = qScl(b, -1);
  return qUnit(qAdd(qScl(a, 1 - t), qScl(b, t)));
}
function qAngle(a, b) {                // 2 つの姿勢の間の回転角（0〜π）。a⁻¹b の角を atan2 で（小さい角でも正確）
  let d = qMul(qConj(qUnit(a)), qUnit(b));
  return 2 * Math.atan2(Math.hypot(d[1], d[2], d[3]), Math.abs(d[0]));
}
function qRandom() {                   // 一様にランダムな単位四元数（S³ の上の点）
  return qUnit([rndNormal(), rndNormal(), rndNormal(), rndNormal()]);
}
function qStr(a, dg) { dg = dg === undefined ? 3 : dg; return '(' + a.map((v) => (Math.abs(v) < 0.5 * Math.pow(10, -dg) ? 0 : v).toFixed(dg)).join(', ') + ')'; }
// ---- 3 次元ベクトルと 3×3 行列
function v3Dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function v3Cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function v3Len(a) { return Math.hypot(a[0], a[1], a[2]); }
function v3Unit(a) { let n = v3Len(a); return n > 1e-300 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 1]; }
function v3Add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function v3Scl(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function v3Dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function matVec(m, v) { return [0, 1, 2].map((r) => m[r][0] * v[0] + m[r][1] * v[1] + m[r][2] * v[2]); }
function matMul(a, b) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c])); }
function matT(a) { return [0, 1, 2].map((r) => [0, 1, 2].map((c) => a[c][r])); }
function matDet(a) { return v3Dot(a[0], v3Cross(a[1], a[2])); }
function matOrthoErr(a) {              // |MᵀM − I| の最大成分（回転行列なら 0）
  let m = matMul(matT(a), a), e = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(m[r][c] - (r === c ? 1 : 0)));
  return e;
}
function matDiff(a, b) { let e = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e = Math.max(e, Math.abs(a[r][c] - b[r][c])); return e; }
// ---- 3D を 2D の画面に描く道具（透視投影）。view = { x, y, s, d }（中心・拡大・目までの距離）
//   数学の向き：x 右・y 上・z 手前。回転は全部 q v q* で計算する
function projP(v, view) { let f = view.d / Math.max(0.2, view.d - v[2]); return [view.x + v[0] * view.s * f, view.y - v[1] * view.s * f, v[2]]; }
const BOX_FACES = [[[1, 0, 0], [1, 2, 6, 5]], [[-1, 0, 0], [0, 4, 7, 3]], [[0, 1, 0], [2, 3, 7, 6]], [[0, -1, 0], [0, 1, 5, 4]], [[0, 0, 1], [4, 5, 6, 7]], [[0, 0, -1], [0, 3, 2, 1]]];
const BOX_CORNERS = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const LIGHT2 = v3Unit([0.4, 0.7, 0.8]);
// 箱を組み合わせた物体を、回転の四元数 q で回して描く（奥の面から順にぬる＝画家のアルゴリズム）
function drawParts2D(parts, q, view, alphaV) {
  let faces = [];
  for (let P of parts) {
    let pts = BOX_CORNERS.map((c) => qRot(q, [P.c[0] + c[0] * P.h[0], P.c[1] + c[1] * P.h[1], P.c[2] + c[2] * P.h[2]]));
    for (let [n, idx] of BOX_FACES) {
      let nw = qRot(q, n), fp = idx.map((t) => pts[t]), cz = fp.reduce((s, p) => s + p[2], 0) / 4;
      let ctr = fp.reduce((s, p) => v3Add(s, v3Scl(p, 0.25)), [0, 0, 0]);
      if (v3Dot(nw, v3Sub2([0, 0, view.d], ctr)) <= 0) continue;            // 裏を向いた面は描かない
      faces.push({ cz, fp, b: 0.42 + 0.58 * Math.max(0, v3Dot(nw, LIGHT2)), col: P.col });
    }
  }
  faces.sort((a, b) => a.cz - b.cz);
  stroke(20, 24, 40, alphaV === undefined ? 120 : alphaV * 0.5); strokeWeight(1);
  for (let f of faces) {
    fill(f.col[0] * f.b, f.col[1] * f.b, f.col[2] * f.b, alphaV === undefined ? 255 : alphaV);
    beginShape(); for (let p of f.fp) { let s = projP(p, view); vertex(s[0], s[1]); } endShape(CLOSE);
  }
}
function v3Sub2(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function line3(a, b, view) { let p = projP(a, view), r = projP(b, view); line(p[0], p[1], r[0], r[1]); }
function drawAxes2D(q, view, L) {      // 回した座標軸（x 赤、y 緑、z 青）
  let cols = [[240, 90, 90], [110, 220, 120], [100, 160, 255]];
  for (let a = 0; a < 3; a++) { let e = [0, 0, 0]; e[a] = L; stroke(...cols[a]); strokeWeight(2.5); line3([0, 0, 0], qRot(q, e), view); }
}
const PLANE_PARTS = [
  { c: [0, 0, 0], h: [0.18, 0.18, 0.9], col: [235, 235, 240] },
  { c: [0, 0, 0.05], h: [1.0, 0.04, 0.26], col: [90, 200, 235] },
  { c: [0, 0.28, -0.72], h: [0.04, 0.26, 0.16], col: [245, 200, 80] },
  { c: [0, 0, -0.75], h: [0.4, 0.03, 0.12], col: [90, 200, 235] },
  { c: [0, 0.02, 0.95], h: [0.1, 0.1, 0.06], col: [240, 110, 90] },
];
// ---- 音の道具（Web Audio、p5.sound なし）。最初のクリックかキーで startAudio()
let audioCtx = null, masterOut = null, voices = [];
function startAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
    for (let n = 0; n < 4; n++) {           // 4 つの声（w, x, y, z）
      let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      o.type = n === 0 ? 'sine' : 'triangle'; o.frequency.value = 220; gn.gain.value = 0;
      o.connect(gn); gn.connect(masterOut); o.start(); voices.push({ o, gn });
    }
  }
  audioCtx.resume();
}
function setVoice(n, freq, vol) {      // 高さと音量をなめらかに変える
  if (!audioCtx || !voices[n]) return;
  let t = audioCtx.currentTime;
  voices[n].o.frequency.setTargetAtTime(clampv(freq, 40, 2000), t, 0.05);
  voices[n].gn.gain.setTargetAtTime(clampv(vol, 0, 1), t, 0.08);
}
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y, g) {       // g = 描く先（省略で画面、WEBGL では HUD のバッファ）
  g = g || window;
  g.noStroke(); g.fill(selfTestResults.every((r) => r.ok) ? g.color(120, 210, 150) : g.color(255, 90, 90));
  g.textSize(14); g.textAlign(LEFT, BASELINE); g.text(selfTestLine(), x, y);
}
