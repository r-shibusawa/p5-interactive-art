// ============================================
// 14 音と光の同時性 ─ どれくらいずれていても「同時」に感じる？
// 白い円が 1 回だけ光り、短い音が 1 回鳴る。そのずれ（SOA）を −300〜+300 ms で変える（+ は光が先）
// 「光が先」「同時」「音が先」を答え、「光が先」「音が先」の割合にそれぞれロジスティック関数を最尤法で当てはめる
// 2 つの 50% 点の間が「同時に感じる窓」、そのまん中が主観的同時点（PSS）
// K = ブーバ／キキ（形と音の対応）のミニ課題
// まずクリック / スペース = 開始 / ← 光が先  ↓ 同時  → 音が先 / O = シミュレーション観察者 / R = やり直し
// 音量は小さめから。ヘッドホンは特に注意（全体の音量 MASTER は 0.2 以下）。光は 1 試行に 1 回だけ（1.5 秒以上あける）
// ============================================

const SOAS = [-300, -200, -100, 0, 100, 200, 300];   // ★ 光と音のずれ [ms]（+ = 光が先）
const REPS = 4;                        // ★ 1 つのずれの回数（7 × 4 = 28 試行）
const FLASH_MS = 80;                   // ★ 光っている時間 [ms]
const ITI = 1500;                      // ★ 次の試行までの間 [ms]（ゆっくり：点滅しない）
const SIM = { pss: 40, half: 100, sd: 70 };   // ★ シミュレーション観察者：同時点 40 ms、窓の半分 100 ms、ゆらぎ 70 ms
let order = [], ti = 0, cnt = [], phase = 'ready', tPhase = 0, flashAt = 0, simMode = false, simSeed = 1, fits = null;
let kk = { on: false, shapeLeft: 0, snd: 0, n: 0, match: 0, busy: 0 };   // ブーバ／キキ

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  resetData(false);
}
function resetData(sim) {
  simMode = sim; cnt = SOAS.map(() => ({ light: 0, same: 0, sound: 0 })); fits = null; seedRng(Date.now());
  order = []; for (let r = 0; r < REPS; r++) for (let i = 0; i < SOAS.length; i++) order.push(i);
  shuffleArr(order); ti = 0; phase = 'ready';
}
// 試行の時刻：基準 600 ms 後に、光と音のうち先のほう。もう一方は |SOA| 遅れる
function schedule(soa) { return { light: 600 + Math.max(0, -soa), sound: 600 + Math.max(0, soa) }; }
function startTrial() {
  if (ti >= order.length) { phase = 'done'; return; }
  let s = schedule(SOAS[order[ti]]), now = performance.now();
  flashAt = now + s.light;
  if (audioCtx) {
    let lat = (audioCtx.outputLatency || 0) + (audioCtx.baseLatency || 0);     // 音が出るまでの遅れの分だけ早めに予約
    beep(audioCtx.currentTime + Math.max(0.05, s.sound / 1000 - lat));
  }
  phase = 'trial'; tPhase = now;
}
function beep(t) { tone(700, t, 0.05, 0.5); }
function answer(r) {
  if (phase !== 'resp') return;
  cnt[order[ti]][r]++; ti++; refit(); phase = 'iti'; tPhase = performance.now();
}
function refit() {
  let xs = SOAS, ns = cnt.map((c) => c.light + c.same + c.sound);
  let fL = fitLogistic(xs, cnt.map((c) => c.light), ns, 0), fS = fitLogistic(xs, cnt.map((c) => c.sound), ns, 0);
  fits = fL.ok && fS.ok && fL.b > 0 && fS.b < 0 && fL.pse > fS.pse ? { fL, fS, pss: (fL.pse + fS.pse) / 2, win: fL.pse - fS.pse } : { fL, fS };
}
// シミュレーション観察者：感じたずれ = SOA − PSS + ゆらぎ。窓の外なら「光が先」「音が先」
function simAnswer(soa) { let e = soa - SIM.pss + SIM.sd * rndNormal(); return e > SIM.half ? 'light' : e < -SIM.half ? 'sound' : 'same'; }
function runSim(seed) { resetData(true); seedRng(seed); SOAS.forEach((s, i) => { for (let r = 0; r < 40; r++) cnt[i][simAnswer(s)]++; }); ti = order.length; phase = 'done'; refit(); }

// ---- ブーバ／キキ：丸い形ととがった形、やわらかい音と鋭い音
function playKK() {
  if (!audioCtx || millis() < kk.busy) return;   // 鳴っている間は重ねない
  kk.busy = millis() + 900;
  let t = audioCtx.currentTime + 0.05;
  if (kk.snd === 0) { tone(220, t, 0.35, 0.6); tone(180, t + 0.38, 0.4, 0.6); }          // 「ブーバ」：低く、長く
  else { tone(1300, t, 0.06, 0.4); tone(1600, t + 0.12, 0.06, 0.4); }                   // 「キキ」：高く、短く
}
function newKK() { kk.shapeLeft = rnd() < 0.5 ? 0 : 1; kk.snd = rnd() < 0.5 ? 0 : 1; }
function drawShape(type, cx, cy, r) {
  beginShape();
  for (let i = 0; i < 60; i++) {
    let a = (i / 60) * Math.PI * 2, rr = type === 0 ? r * (1 + 0.12 * Math.sin(3 * a) + 0.06 * Math.sin(5 * a)) : r * (i % 6 === 0 ? 1.15 : i % 3 === 0 ? 0.45 : 0.8);
    vertex(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  endShape(CLOSE);
}

function draw() {
  background(30, 32, 40);
  fill(235); noStroke(); textSize(18);
  if (kk.on) return drawKK();
  text('まずクリック　スペース 開始　← 光が先　↓ 同時　→ 音が先　K ブーバ／キキ　O シミュレーション観察者　R やり直し', 20, 36);
  fill(255, 200, 120); textSize(15);
  text('音量は小さめから。ヘッドホンは特に注意。光は 1 試行に 1 回だけ', 20, 62);
  let now = performance.now();
  if (phase === 'trial' && now > tPhase + 600 + 400) phase = 'resp';
  if (phase === 'iti' && now > tPhase + ITI) startTrial();
  let cx = width * 0.25, cy = height * 0.36;
  stroke(80); strokeWeight(2); line(cx - 8, cy + 120, cx + 8, cy + 120); line(cx, cy + 112, cx, cy + 128);
  noStroke(); fill(phase !== 'ready' && now >= flashAt && now < flashAt + FLASH_MS ? 245 : 45); circle(cx, cy, 120);
  fill(215); textSize(16); textAlign(CENTER);
  let msg = { ready: simMode ? '' : (audioCtx ? 'スペースで開始（' + order.length + ' 試行）' : 'まずキャンバスをクリック → スペース'), resp: '← 光が先　↓ 同時　→ 音が先', done: simMode ? 'シミュレーション観察者（各 40 回、音も光も出さない）' : 'おつかれさま！ R でもう一度' }[phase] || '';
  text(msg, cx, cy + 170); textAlign(LEFT, BASELINE);
  text((simMode ? 'シミュレーション観察者' : 'あなた') + '　' + (simMode ? cnt.reduce((a, c) => a + c.light + c.same + c.sound, 0) + ' 回' : Math.min(ti, order.length) + ' / ' + order.length), 20, cy + 210);
  // ---- 表
  let ty = cy + 250; textSize(13); fill(160); text('SOA [ms]', 20, ty); text('光が先', 20, ty + 20); text('同時', 20, ty + 40); text('音が先', 20, ty + 60);
  SOAS.forEach((s, i) => { fill(210); let x = 90 + i * 50; text(s, x, ty); text(cnt[i].light, x, ty + 20); text(cnt[i].same, x, ty + 40); text(cnt[i].sound, x, ty + 60); });

  // ---- 割合のグラフ
  let g = { x: width * 0.55, y: 110, w: width * 0.4, h: height * 0.48, x0: -330, x1: 330, y0: 0, y1: 1 };
  plotAxes(g, 'SOA [ms]（+ = 光が先）', '答えの割合', SOAS, [0, 0.5, 1]);
  let cols = { light: color(255, 220, 120), same: color(120, 210, 150), sound: color(120, 190, 255) };
  if (fits && fits.fL.ok && fits.fS.ok) {
    let fL = fits.fL, fS = fits.fS;
    for (let k of ['light', 'sound', 'same']) {
      stroke(cols[k]); strokeWeight(2.5); let p = [];
      for (let s = -330; s <= 330; s += 5) { let v = k === 'light' ? fL.p(s) : k === 'sound' ? fS.p(s) : Math.max(0, 1 - fL.p(s) - fS.p(s)); p.push([gX(g, s), gY(g, v)]); }
      polyline(p);
    }
  }
  noStroke();
  SOAS.forEach((s, i) => { let c = cnt[i], n = c.light + c.same + c.sound; if (n) for (let k of ['light', 'same', 'sound']) { fill(cols[k]); circle(gX(g, s), gY(g, c[k] / n), 9); } });
  textSize(13); fill(cols.light); text('● 光が先', g.x + 10, g.y + 18); fill(cols.same); text('● 同時', g.x + 90, g.y + 18); fill(cols.sound); text('● 音が先', g.x + 160, g.y + 18);
  fill(235); textSize(16);
  let ry = g.y + g.h + 56;
  if (fits && fits.pss !== undefined) {
    stroke(235, 120); strokeWeight(1); line(gX(g, fits.fS.pse), g.y, gX(g, fits.fS.pse), g.y + g.h); line(gX(g, fits.fL.pse), g.y, gX(g, fits.fL.pse), g.y + g.h); noStroke();
    text('同時に感じる窓：' + fits.fS.pse.toFixed(0) + ' 〜 ' + fits.fL.pse.toFixed(0) + ' ms（幅 ' + fits.win.toFixed(0) + ' ms）', g.x, ry);
    text('主観的同時点 PSS = ' + fits.pss.toFixed(0) + ' ms（+ なら光が少し先のときに同時に感じる）', g.x, ry + 26);
  } else text('「光が先」「音が先」の両方がそろうと当てはめる', g.x, ry);
  if (simMode) { fill(120, 200, 140); textSize(14); text('本当の値：PSS = ' + SIM.pss + ' ms、窓 = ' + (SIM.pss - SIM.half) + ' 〜 ' + (SIM.pss + SIM.half) + ' ms', g.x, ry + 52); }
  fill(170); textSize(12); text('画面は 1 フレーム（約 17 ms）単位でしか光らないので、ずれには ±17 ms ほどの誤差がある', g.x, ry + 76);
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}
function drawKK() {
  text('ブーバ／キキ：スペースで音を聞いて、合うと思う形を ← 左 / → 右 で選ぶ　K でもどる', 20, 36);
  fill(255, 200, 120); textSize(15); text('音量は小さめから。ヘッドホンは特に注意', 20, 62);
  let cy = height * 0.42;
  fill(220, 200, 255); drawShape(kk.shapeLeft, width * 0.3, cy, 110); fill(150, 220, 255); drawShape(1 - kk.shapeLeft, width * 0.62, cy, 110);
  fill(235); textSize(17);
  text('いまの音：' + (kk.snd === 0 ? '低く長い音' : '高く短い音') + '（スペースで再生）', 20, height - 110);
  text(kk.n + ' 回中 ' + kk.match + ' 回、「低く長い音 = 丸い形」「高く短い音 = とがった形」を選んだ（' + (kk.n ? ((100 * kk.match) / kk.n).toFixed(0) : '-') + '%）', 20, height - 80);
  fill(selfTestResults.every((r) => r.ok) ? color(120, 210, 150) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 12);
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key === 'k' || key === 'K') { kk.on = !kk.on; newKK(); return false; }
  if (kk.on) {
    if (key === ' ') playKK();
    if (key === LEFT_ARROW || key === RIGHT_ARROW) { let pick = key === LEFT_ARROW ? kk.shapeLeft : 1 - kk.shapeLeft; kk.n++; if (pick === kk.snd) kk.match++; newKK(); }
    return false;
  }
  if (key === ' ' && phase === 'ready') startTrial();
  if (key === LEFT_ARROW) answer('light');
  if (key === DOWN_ARROW) answer('same');
  if (key === RIGHT_ARROW) answer('sound');
  if (key === 'o' || key === 'O') runSim(++simSeed);
  if (key === 'r' || key === 'R') resetData(false);
  return false;
}

// ---- 自己テスト（音も光も出さない）
function selfTest() {
  selfTestResults = [];
  check('予定の時刻：音の時刻 − 光の時刻 = SOA（どのずれでも）', SOAS.every((s) => { let q = schedule(s); return q.sound - q.light === s; }));
  check('光は 1 試行に 1 回、間は 1.5 秒以上 → 1 Hz 未満（3 Hz より十分ゆっくり）', 1000 / (ITI + 600) < 1 && FLASH_MS < 200);
  let ns = SOAS.map(() => 1000), kL = SOAS.map((s) => 1000 / (1 + Math.exp(-(s - 120) / 30))), f = fitLogistic(SOAS, kL, ns, 0);
  check('割合がロジスティックの上にあれば 50% 点 120 ms を復元', f.ok && near(f.pse, 120, 1e-3));
  seedRng(52); let c = SOAS.map(() => ({ light: 0, same: 0, sound: 0 })); SOAS.forEach((s, i) => { for (let r = 0; r < 400; r++) c[i][simAnswer(s)]++; });
  let n = c.map((q) => q.light + q.same + q.sound), fL = fitLogistic(SOAS, c.map((q) => q.light), n, 0), fS = fitLogistic(SOAS, c.map((q) => q.sound), n, 0);
  check('シミュレーション観察者（各 400 回）：PSS ≈ 40 ms（±12）', near((fL.pse + fS.pse) / 2, SIM.pss, 12));
  check('窓の幅 ≈ 200 ms（±25）', near(fL.pse - fS.pse, 2 * SIM.half, 25));
  check('音量の上限：全体 MASTER ≤ 0.2', MASTER <= 0.2);
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. 28 試行で自分の窓と PSS を出そう。PSS は 0 より光が先（+）？ 音が先（−）？
// 2. 遠くの花火は光が先に見えるのに、同時と感じることがある？ 窓の幅から考えよう（音は 1 秒に約 340 m）
// 3. 隣の人と窓の幅を比べよう。音楽やゲームをする人は狭い？
// 4. K のブーバ／キキで何 % が「丸い形 = 低く長い音」になった？ クラス全体で集計しよう
// 5. 動画の音ずれは何 ms から気になる？ 窓の幅と比べよう


// ==================================================
// ここから下は「心理物理の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 種つきの乱数（同じ種なら毎回同じ列）。シミュレーション観察者と自己テストで使う
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function rnd() {                       // 0〜1 の一様乱数（mulberry32）
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rndNormal() { let u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }   // 標準正規分布
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
// ---- 正規分布：Φ（累積分布）と z（その逆関数。二分法で数値的に解く）
function erfA(x) {                     // 誤差関数（Abramowitz & Stegun 7.1.26、誤差 1.5e-7 以下）
  let s = x < 0 ? -1 : 1; x = Math.abs(x);
  let t = 1 / (1 + 0.3275911 * x);
  let y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
function Phi(x) { return 0.5 * (1 + erfA(x / Math.SQRT2)); }
function zOf(p) {                      // Φ(z) = p となる z
  p = clampv(p, 1e-9, 1 - 1e-9);
  let lo = -9, hi = 9;
  for (let i = 0; i < 70; i++) { let m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// 割合を 1/(2N) で補正（0 や 1 だと z が無限大になるので）
function rateFix(k, n) { return n > 0 ? clampv(k / n, 1 / (2 * n), 1 - 1 / (2 * n)) : 0.5; }
// ---- ロジスティック関数を最尤法で当てはめる
// p(x) = g + (1 − g) / (1 + e^−(a + b x))　g = 当て推量の正答率（Yes/No なら 0、2 肢強制選択なら 0.5）
// xs = 刺激の値、ks = 「はい／正答」の数、ns = 試行数。ニュートン法（フィッシャーのスコア法）で a, b を求める
// PSE = −a / b（ロジスティックの真ん中）、JND = ln3 / |b|（25% 点と 75% 点の幅の半分）
function fitLogistic(xs, ks, ns, g) {
  g = g || 0;
  let N = 0, mx = 0, vals = [];
  for (let i = 0; i < xs.length; i++) if (ns[i] > 0) { N += ns[i]; mx += ns[i] * xs[i]; if (vals.indexOf(xs[i]) < 0) vals.push(xs[i]); }
  if (N < 4 || vals.length < 2) return { ok: false };
  mx /= N;
  let sx = 0;
  for (let i = 0; i < xs.length; i++) sx += ns[i] * (xs[i] - mx) * (xs[i] - mx);
  sx = Math.sqrt(sx / N) || 1;
  const BMAX = 25;                     // 傾きの上限（全部そろった答えでも無限大にしない）
  let u = xs.map((x) => (x - mx) / sx), a = 0, b = 1;
  let P = (a, b, ui) => clampv(g + (1 - g) / (1 + Math.exp(-(a + b * ui))), 1e-9, 1 - 1e-9);
  let LL = (a, b) => { let s = 0; for (let i = 0; i < u.length; i++) { let p = P(a, b, u[i]); s += ks[i] * Math.log(p) + (ns[i] - ks[i]) * Math.log(1 - p); } return s; };
  let it = 0;
  for (; it < 60; it++) {
    let Haa = 1e-6, Hab = 0, Hbb = 1e-6, ga = 0, gb = 0;
    for (let i = 0; i < u.length; i++) {
      if (ns[i] <= 0) continue;
      let L = 1 / (1 + Math.exp(-(a + b * u[i]))), p = P(a, b, u[i]), dp = (1 - g) * L * (1 - L);
      let w = (ns[i] * dp * dp) / (p * (1 - p)), sc = ((ks[i] - ns[i] * p) / (p * (1 - p))) * dp;
      Haa += w; Hab += w * u[i]; Hbb += w * u[i] * u[i]; ga += sc; gb += sc * u[i];
    }
    let det = Haa * Hbb - Hab * Hab;
    if (!(det > 1e-12)) break;
    let da = (Hbb * ga - Hab * gb) / det, db = (Haa * gb - Hab * ga) / det, t = 1, l0 = LL(a, b);
    let mag = Math.hypot(da, db); if (mag > 5) { da *= 5 / mag; db *= 5 / mag; }
    while (t > 1e-4 && LL(a + t * da, clampv(b + t * db, -BMAX, BMAX)) < l0 - 1e-12) t /= 2;
    a += t * da; b = clampv(b + t * db, -BMAX, BMAX);
    if (Math.abs(t * da) + Math.abs(t * db) < 1e-10) break;
  }
  let B = b / sx, A = a - (b * mx) / sx;
  if (!isFinite(A) || !isFinite(B) || Math.abs(B) < 1e-12) return { ok: false };
  return { ok: true, a: A, b: B, pse: -A / B, jnd: Math.log(3) / Math.abs(B), steep: Math.abs(b) >= BMAX * 0.999, iters: it, g,
           p: (x) => g + (1 - g) / (1 + Math.exp(-(A + B * x))) };
}
// ---- グラフの道具：g = { x, y, w, h, x0, x1, y0, y1, logx, logy }
function gX(g, v) { let t = g.logx ? (Math.log(v) - Math.log(g.x0)) / (Math.log(g.x1) - Math.log(g.x0)) : (v - g.x0) / (g.x1 - g.x0); return g.x + clampv(t, -0.02, 1.02) * g.w; }
function gY(g, v) { let t = g.logy ? (Math.log(v) - Math.log(g.y0)) / (Math.log(g.y1) - Math.log(g.y0)) : (v - g.y0) / (g.y1 - g.y0); return g.y + g.h - clampv(t, -0.02, 1.02) * g.h; }
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
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
// ---- 音を鳴らす道具（Web Audio。最初のクリックかキーで startAudio()）
// 音量の上限：全体の音量 MASTER は 0.2 以下（大きな音は出ない）。1 音の大きさ vol も 0〜1 に制限
const MASTER = 0.15;                   // ★ 全体の音量（0.2 以下にしておく）
let audioCtx = null, masterOut = null;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterOut = audioCtx.createGain(); masterOut.gain.value = Math.min(0.2, MASTER); masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音：周波数 f、開始 t0（audioCtx の時刻）、長さ dur 秒、大きさ vol（0〜1）。立ち上がりと終わりは 15 ms でなめらかに
function tone(f, t0, dur, vol) {
  if (!audioCtx || !isFinite(f) || f <= 0 || !isFinite(vol)) return;
  vol = clampv(vol, 0, 1); dur = clampv(dur, 0.03, 2);
  let o = audioCtx.createOscillator(), gn = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = clampv(f, 20, 12000);
  gn.gain.setValueAtTime(0, t0);
  gn.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  gn.gain.setValueAtTime(vol, t0 + dur - 0.015);
  gn.gain.linearRampToValueAtTime(0, t0 + dur);
  o.connect(gn); gn.connect(masterOut); o.start(t0); o.stop(t0 + dur + 0.02);
}
function dbToGain(db) { return Math.pow(10, db / 20); }   // +6 dB ≈ 2 倍、−20 dB = 0.1 倍
