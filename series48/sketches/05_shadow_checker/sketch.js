// ============================================
// 05 影の中のチェッカー（明るさの恒常性）
// 床の白いマスに円柱の影がかかる。影の中の白いマス A と、日なたの黒いマス B は、画面の上ではまったく同じ灰色
// 影の濃さを「黒マス ÷ 白マス」から計算しているので、A と B は 1 の位までぴったり同じ（Adelson の原理を使ったオリジナルの図）
// ←→ = 黒マスの明るさ（影の濃さも自動で変わる） / H = 影を消す / ↑↓ = 右の見本の灰色 / Enter = 記録 / R = 消す
// T またはマウスを押している間 = 真実を見る（A と B を同じ灰色の帯でつなぐ）
// ============================================

let LIGHT = 200;             // ★ 白いマスの明るさ
let DARKV = 100;             // ★ 黒いマスの明るさ（←→）
let shadowK = 0.5;           // 影の中の明るさの倍率 = DARKV / LIGHT（自動で計算）
let T = 0.8;                 // ★ マスの大きさ m
const TA = [1, 4], TB = [-2, 4];             // 影の中の白マス A、日なたの黒マス B（マスの番号）
const CYL = [3.6, 6.2], SH_END = [0.6, 3.6]; // 円柱の位置と、影の先（マス単位）
let showShadow = true, truthKey = false, probe = 150, trials = [];
let pg;

function setup() {
  createCanvas(windowWidth, windowHeight);
  build();
  drawScene(false);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function draw() { drawScene(truthOn()); }

// ---- カメラ：床の点 (X, 高さ Y, 距離 z) → 画面
function cam() { return { cx: Math.round(width * 0.35), vy: Math.round(height * 0.18), f: height * 0.9, hc: 1.6 }; }
function proj(X, Y, z) { let c = cam(); return [c.cx + (c.f * X) / z, c.vy + (c.f * (c.hc - Y)) / z]; }
function tileCenter(t) { return proj((t[0] + 0.5) * T, 0, (t[1] + 0.5) * T).map(Math.round); }

// 影の強さ s（0 = 日なた、1 = 影の中心）：円柱から影の先までの線分からの距離で決める
function shadowAt(u, v) {
  let vx = SH_END[0] - CYL[0], vy = SH_END[1] - CYL[1], L = vx * vx + vy * vy;
  let t = constrain(((u - CYL[0]) * vx + (v - CYL[1]) * vy) / L, 0, 1);
  let d = Math.hypot(u - CYL[0] - t * vx, v - CYL[1] - t * vy);
  return d < 1.0 ? 1 : d < 1.4 ? 1 - (d - 1.0) / 0.4 : 0;       // 本影（ぴったり 1）＋ ぼかし
}

// 床を 1 画素ずつ計算してバッファに描く（パラメータを変えたときだけ）
function build() {
  shadowK = DARKV / LIGHT;
  if (!pg || pg.width !== width || pg.height !== height) { if (pg) pg.remove(); pg = createGraphics(width, height); pg.pixelDensity(1); }
  pg.loadPixels();
  let c = cam();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let v8;
    if (y <= c.vy) v8 = 215 + Math.round((20 * y) / c.vy);           // 奥の壁
    else {
      let z = (c.f * c.hc) / (y - c.vy), X = ((x - c.cx) * z) / c.f, u = X / T, v = z / T;
      let base = (Math.floor(u) + Math.floor(v)) % 2 !== 0 ? LIGHT : DARKV;
      let s = showShadow ? shadowAt(u, v) : 0;
      v8 = Math.round(base * (1 - (1 - shadowK) * s));                 // 影 = 明るさに倍率をかける
      if (z > 14) v8 = Math.round(v8 + (225 - v8) * Math.min(1, (z - 14) / 30));   // 遠くはかすむ
    }
    let i = 4 * (y * width + x);
    pg.pixels[i] = pg.pixels[i + 1] = pg.pixels[i + 2] = v8; pg.pixels[i + 3] = 255;
  }
  pg.updatePixels();
}

function drawScene(truth) {
  image(pg, 0, 0, width, height);
  drawCylinder();
  let a = tileCenter(TA), b = tileCenter(TB);
  noStroke(); fill(255, 220, 40); textSize(22); textAlign(CENTER, CENTER);
  for (let [t, nm] of [[TA, 'A'], [TB, 'B']]) { let q = proj((t[0] + 0.18) * T, 0, (t[1] + 0.2) * T); text(nm, q[0], q[1]); }   // マスの左手前の隅に名前
  if (truth) {
    // A と B を、黒マスと同じ灰色 DARKV の帯でつなぐ
    let yb = Math.max(a[1], b[1]) + 70;
    fill(DARKV); rect(a[0] - 8, a[1], 16, yb - a[1]); rect(b[0] - 8, b[1], 16, yb - b[1]); rect(b[0] - 8, yb - 8, a[0] - b[0] + 16, 16);
    fill(255, 230, 60); textSize(16);
    text('A の画素 ' + pixAt(a).join(','), a[0], yb + 26); text('B の画素 ' + pixAt(b).join(','), b[0], yb + 26);
  }
  // 見本の灰色（調整法）
  let px = width - 190, py = Math.round(height * 0.5);
  fill(180); rect(px - 20, py - 20, 160, 160); fill(probe); rect(px + 10, py + 10, 100, 100);
  fill(30); textSize(14); text('見本 ' + probe, px + 60, py + 155);
  // 文字
  fill(30); textAlign(LEFT, BASELINE); textSize(18);
  text('←→：黒マス ' + DARKV + '（影の倍率 ' + shadowK.toFixed(3) + '）　H：影 ' + (showShadow ? 'ON' : 'OFF') + '　↑↓：見本　Enter：記録　T：真実', 20, 34);
  fill(60); textSize(15);
  text('影の中の白マス A ＝ 白 ' + LIGHT + ' × ' + shadowK.toFixed(3) + ' ＝ ' + Math.round(LIGHT * shadowK) + '、日なたの黒マス B ＝ ' + DARKV + '。見本を A と同じ明るさに見えるようにして Enter', 20, 60);
  let tx = width - 300, ty = 110;
  fill(30); textSize(15); text('試行　見本　A の本当　差', tx, ty);
  let last = trials.slice(-8); fill(60);
  last.forEach((t, i) => text((trials.length - last.length + i + 1) + '　　' + t.p + '　　' + t.real + '　　' + (t.p - t.real > 0 ? '+' : '') + (t.p - t.real), tx, ty + 22 * (i + 1)));
  if (trials.length) { fill(30); text('平均の差 ' + mean(trials.map((t) => t.p - t.real)).toFixed(1), tx, ty + 22 * 9 + 4); }
  fill(255, 220); rect(10, height - 36, 150, 28, 6);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}
function pixAt(p) { let c = pg.get(p[0], p[1]); return [c[0], c[1], c[2]]; }

// 円柱（影を落とす物）。光は右奥から
function drawCylinder() {
  let z = CYL[1] * T, X = CYL[0] * T, b = proj(X, 0, z), t = proj(X, 1.5, z), r = (0.35 * cam().f) / z, ry = r * 0.28;
  noStroke();
  fill(60, 66, 90); ellipse(b[0], b[1], 2 * r, 2 * ry);              // 底（手前半分が見える）
  for (let k = -r; k < r; k += 2) { let g = 70 + 110 * Math.max(0, (k + r * 0.3) / (r * 1.3)); fill(g * 0.75, g * 0.8, g); rect(b[0] + k, t[1], 2.5, b[1] - t[1]); }
  fill(190, 200, 230); ellipse(t[0], t[1], 2 * r, 2 * ry);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { DARKV = Math.min(LIGHT - 10, DARKV + 10); build(); }
  if (key === LEFT_ARROW) { DARKV = Math.max(20, DARKV - 10); build(); }
  if (key === 'h' || key === 'H') { showShadow = !showShadow; build(); }
  if (key === UP_ARROW) probe = Math.min(255, probe + 2);
  if (key === DOWN_ARROW) probe = Math.max(0, probe - 2);
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 'r' || key === 'R') trials = [];
  if (key === ENTER) { trials.push({ p: probe, real: pixAt(tileCenter(TA))[0] }); probe = 150; }
}
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); build(); }

// ---------- やってみよう ----------
// 1. 見本を A に合わせて何回か記録。A の本当の値（= B）より明るく選んでしまう？
// 2. T で帯をつなぐと、A と B が同じ色に見える瞬間がある
// 3. H で影を消すと、A は白 200 に戻る。影の中の 200 × 倍率 が、B と同じ値になっていた
// 4. ←→ で黒マスを明るくすると影は薄くなる。いつでも A = B が保たれる（計算で決めているから）
// 5. shadowAt の 1.4（ぼかしの幅）を 3 にすると、影のふちがぼやけて錯視は強くなる？


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：A と B の画素がぴったり同じか、影の倍率の計算、A が本影・B が日なたにあるか
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond });
  let a = tileCenter(TA), b = tileCenter(TB);
  drawScene(false); loadPixels();
  let pa = readPix(a[0], a[1]), pb = readPix(b[0], b[1]);
  ok('画面の画素：A (' + pa.join(',') + ') = B (' + pb.join(',') + ')', pa.join() === pb.join());
  ok('影の倍率 = 黒 ÷ 白 = ' + DARKV + ' / ' + LIGHT + '、白 × 倍率 = 黒（ぴったり）', Math.round(LIGHT * shadowK) === DARKV && pa[0] === DARKV);
  let corners = (t) => [[t[0], t[1]], [t[0] + 1, t[1]], [t[0], t[1] + 1], [t[0] + 1, t[1] + 1]];
  ok('A の 4 つの角は全部「本影」（s = 1）、B の 4 つの角は全部日なた（s = 0）', corners(TA).every((q) => shadowAt(q[0], q[1]) === 1) && corners(TB).every((q) => shadowAt(q[0], q[1]) === 0));
  ok('A は白マス、B は黒マス', (TA[0] + TA[1]) % 2 !== 0 && (TB[0] + TB[1]) % 2 === 0);
  let keep = DARKV, all = true;
  for (let dv of [40, 70, 130, 170]) { DARKV = dv; build(); let p = pixAt(tileCenter(TA)), q = pixAt(tileCenter(TB)); all = all && p[0] === q[0] && p[0] === dv; }
  DARKV = keep; build();
  ok('黒マスを 40・70・130・170 にしても A = B（毎回バッファの画素で確認）', all);
  ok('マス A の中は一様（中心と角の近くが同じ値）', (() => { let q = proj((TA[0] + 0.15) * T, 0, (TA[1] + 0.15) * T); return pixAt(q.map(Math.round))[0] === pixAt(a)[0]; })());
  drawScene(false);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
