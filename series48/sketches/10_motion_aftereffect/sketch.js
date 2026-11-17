// ============================================
// 10 運動残像（滝の錯視）
// 回るうずまきの真ん中を 20 秒見つめてから、止まった絵を見ると、逆向きに回って（ふくらんで・縮んで）見える
// 同じ向きの動きを見続けると、その向きを感じる細胞が「疲れて」、止まっている所で反対向きが勝つ
// スペース = スタート（順応 → テスト）/ ↑↓ = 見つめる時間 / ←→ = 回る速さ / D = 向き / 1・2 = テストの絵
// T = 真実（テストの絵が本当に止まっているか、フレームごとの画素の差を表示）
// 長く見つめて気分が悪くなったら目を離す
// ============================================

let adaptSec = 20;           // ★ 見つめる時間（秒）
let testSec = 12;            // ★ テストの絵を見せる時間（秒）
let speed = 0.5;             // ★ 回る速さ（1 秒に何回転）
let ARMS = 4;                // ★ うずまきの腕の数
const MAX_HZ = 3;            // 安全のため、1 点の明暗の切りかわりは 1 秒に 3 回まで（腕 × 速さ ≤ 3）
let dir = 1, testKind = 1, truthKey = false;
let startMs = -1, lastSum = null, diffNow = 0;
const LIGHTG = 190, DARKG = 60;   // ★ コントラストはひかえめに

function setup() {
  createCanvas(windowWidth, windowHeight);
  speed = safeSpeed(speed);
  selfTest();
}

// いまの段階：ready（待ち）→ adapt（見つめる）→ test（止まった絵）→ ready
function phaseAt(t) { if (t < 0) return 'ready'; if (t < adaptSec) return 'adapt'; if (t < adaptSec + testSec) return 'test'; return 'ready'; }
function safeSpeed(s) { return constrain(s, 0, MAX_HZ / ARMS); }
function elapsed() { return startMs < 0 ? -1 : (millis() - startMs) / 1000; }

function draw() {
  let t = elapsed(), ph = phaseAt(t);
  if (ph === 'ready' && t >= 0) startMs = -1;
  let rot = ph === 'adapt' ? dir * TWO_PI * speed * t : 0;
  drawFrame(ph, rot);
  // 真実：画面の画素を前のフレームと比べる
  if (truthKey && frameCount % 10 === 0) { loadPixels(); let s = sampleSum(); diffNow = lastSum === null ? 0 : Math.abs(s - lastSum); lastSum = s; }
  hud(ph, t);
}

function geom() { return { cx: Math.round(width / 2), cy: Math.round(height / 2 + 20), R: Math.round(Math.min(width, height) * 0.36) }; }

function drawFrame(ph, rot) {
  background(150);
  let g = geom();
  noStroke(); fill(LIGHTG); circle(g.cx, g.cy, 2 * g.R);
  if (ph === 'test' && testKind === 2) drawTexture(g);
  else drawSpiral(g, rot);
  fill(220, 40, 40); circle(g.cx, g.cy, 10);                          // 見つめる点
}
// アルキメデスのうずまき r = b θ を腕の数だけ、回転 rot で
function spiralPts(g, arm, rot) {
  let pts = [], turns = 3, n = 240;
  for (let i = 0; i <= n; i++) {
    let th = (i / n) * turns * TWO_PI, r = (th / (turns * TWO_PI)) * g.R, a = th + rot + (arm * TWO_PI) / ARMS;
    pts.push([g.cx + r * Math.cos(a), g.cy + r * Math.sin(a), r]);
  }
  return pts;
}
function drawSpiral(g, rot) {
  noFill(); stroke(DARKG); strokeWeight(g.R / (ARMS * 3 * 2)); strokeCap(ROUND);   // 線とすき間が同じ幅（1 本の腕は 3 回転）
  for (let k = 0; k < ARMS; k++) { beginShape(); for (let p of spiralPts(g, k, rot)) vertex(p[0], p[1]); endShape(); }
}
// テストの絵 2：止まった水玉の模様（毎回同じになるよう、乱数の種を固定）
function drawTexture(g) {
  randomSeed(48); noStroke(); fill(DARKG + 30);
  for (let i = 0; i < 260; i++) { let a = random(TWO_PI), r = g.R * Math.sqrt(random()) * 0.95; circle(g.cx + r * Math.cos(a), g.cy + r * Math.sin(a), random(6, 22)); }
}

function hud(ph, t) {
  noStroke(); fill(235); rect(0, 0, width, 70);
  fill(20); textSize(18); textAlign(LEFT, BASELINE);
  text('スペース：スタート　↑↓：見つめる時間 ' + adaptSec + ' 秒　←→：速さ ' + speed.toFixed(2) + ' 回転/秒　D：向き ' + (dir > 0 ? '時計回り' : '反時計回り') + '　1・2：テストの絵　T：真実', 20, 30);
  fill(160, 30, 30); textSize(15);
  text('赤い点だけを見つめる。長く見つめて気分が悪くなったら目を離す（明暗の切りかわりは 1 秒に ' + (ARMS * speed).toFixed(1) + ' 回、上限 ' + MAX_HZ + ' 回）', 20, 56);
  textAlign(CENTER, BASELINE); textSize(26); fill(20);
  let msg = ph === 'ready' ? 'スペースでスタート' : ph === 'adapt' ? '見つめて… あと ' + Math.ceil(adaptSec - t) + ' 秒' : '止まった絵です。逆に回って見える？（' + Math.ceil(adaptSec + testSec - t) + '）';
  text(msg, width / 2, height - 30);
  // 時間のバー
  if (ph !== 'ready') { let f = constrain(t / (adaptSec + testSec), 0, 1); fill(120); rect(width / 2 - 200, height - 20, 400, 6); fill(ph === 'adapt' ? color(60, 120, 220) : color(220, 120, 40)); rect(width / 2 - 200, height - 20, 400 * f, 6); }
  textAlign(LEFT, BASELINE);
  if (truthKey) {
    fill(235); rect(width - 300, 90, 280, 90, 10); fill(20); textSize(15);
    text('画素の差（前の確認と比べて）：' + diffNow, width - 285, 118);
    text(ph === 'test' ? (diffNow === 0 ? '→ テストの絵は 1 画素も動いていない' : '→ 切りかえ直後') : ph === 'adapt' ? '→ いまは本当に回っている' : '→ 待ち（止まっている）', width - 285, 146);
  }
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}
function sampleSum() { let g = geom(), s = 0; for (let y = g.cy - g.R; y < g.cy + g.R; y += 9) for (let x = g.cx - g.R; x < g.cx + g.R; x += 9) s += readPix(x, y)[0]; return s; }

function keyPressed() {
  if (key === ' ') { startMs = millis(); lastSum = null; }
  if (key === UP_ARROW) adaptSec = Math.min(60, adaptSec + 5);
  if (key === DOWN_ARROW) adaptSec = Math.max(5, adaptSec - 5);
  if (key === RIGHT_ARROW) speed = safeSpeed(speed + 0.05);
  if (key === LEFT_ARROW) speed = safeSpeed(speed - 0.05);
  if (key === 'd' || key === 'D') dir = -dir;
  if (key === '1' || key === '2') testKind = +key;
  if (key === 't' || key === 'T') { truthKey = !truthKey; lastSum = null; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 見つめる時間を 5 秒と 30 秒にして、残像が続く時間を数える（ストップウォッチで）
// 2. テストの絵を 2（水玉）にしても逆に動いて見える？ 止まっているのに動いて見える
// 3. 片目をつぶって見つめ、テストのときは反対の目で見る。残像は移る？（脳のどこで起きているか）
// 4. D で向きを変えると、残像の向きも変わる？
// 5. 見つめる点から目をそらして見つめた場合と比べよう


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：タイマー・安全の上限・うずまきの形・テストの絵が止まっていること
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), g = geom();
  ok('タイマー：' + adaptSec + ' 秒までは見つめる、そのあと ' + testSec + ' 秒テスト、そのあと待ち',
    phaseAt(-1) === 'ready' && phaseAt(0) === 'adapt' && phaseAt(adaptSec - 0.01) === 'adapt' && phaseAt(adaptSec) === 'test' && phaseAt(adaptSec + testSec + 0.01) === 'ready');
  ok('安全：どんな速さを頼んでも 腕 × 速さ ≤ ' + MAX_HZ + ' 回/秒', [0, 0.3, 1, 5, 100].every((s) => ARMS * safeSpeed(s) <= MAX_HZ + 1e-9) && safeSpeed(-3) === 0);
  let p = spiralPts(g, 0, 0);
  ok('うずまき：半径は外へ単調にふえ、端は R = ' + g.R, p.every((q, i) => i === 0 || q[2] > p[i - 1][2]) && Math.abs(p[p.length - 1][2] - g.R) < 1e-9);
  let q = spiralPts(g, 1, 0), q2 = spiralPts(g, 0, TWO_PI / ARMS);
  ok('腕は 360° ÷ ' + ARMS + ' ずつずれている（1 本を回すと次の腕に重なる）', q.every((v, i) => Math.abs(v[0] - q2[i][0]) < 1e-6 && Math.abs(v[1] - q2[i][1]) < 1e-6));
  let keep = testKind, same = true;
  for (let k of [1, 2]) { testKind = k; drawFrame('test', 0); loadPixels(); let a = sampleSum(); drawFrame('test', 0); loadPixels(); same = same && a === sampleSum(); }
  testKind = keep;
  ok('テストの絵（1・2）は、2 回描いても画素の合計が同じ（止まっている）', same);
  drawFrame('ready', 0); loadPixels();
  let lv = readPix(g.cx + g.R * 0.98, g.cy)[0];
  ok('明るさはひかえめ：うずまきは ' + DARKG + '〜' + LIGHTG + ' の間', DARKG >= 40 && LIGHTG <= 200 && lv >= DARKG && lv <= LIGHTG);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
