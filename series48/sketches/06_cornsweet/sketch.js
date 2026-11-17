// ============================================
// 06 クレイク＝オブライエン＝コーンスウィート錯視
// 左右の面はまったく同じ灰色。境界の「ふち」だけ、左は少し暗く・右は少し明るくしてある
// それだけで、右の面全体が明るく見える。脳はふち（変化）から面の明るさを推測している
// ↑↓ = ふちの強さ / ←→ = ふちの幅 / A・Z = 下の「本物の段差」の大きさ / Enter = 記録 / R = 消す
// T またはマウスを押している間 = 真実を見る（境界を棒でかくす → 左右が同じに見える）
// ============================================

let G = 128;                 // ★ 面の灰色
let amp = 40;                // ★ ふちの強さ（境界での明暗の差の半分）
let wpx = 40;                // ★ ふちの幅 px（指数関数のなだらかさ）
let stepD = 0;               // 本物の段差（左 G − stepD、右 G + stepD）
let truthKey = false, trials = [], prof = [];
let pg;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noSmooth();                 // バッファを拡大するとき画素をまぜない（画素の値を正確に保つ）
  build();
  drawScene(false);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function draw() { drawScene(truthOn()); }

function area() { return { x0: 40, x1: Math.round(width * 0.72), y0: 90, y1: Math.round(height * 0.38), y2: Math.round(height * 0.42), y3: Math.round(height * 0.6) }; }
function edgeX() { let A = area(); return Math.round((A.x0 + A.x1) / 2); }
// コーンスウィートの明るさの断面：境界からの距離 d で指数関数的に G に戻る
function cornsweet(x) {
  let d = x + 0.5 - edgeX();
  return Math.round(G + Math.sign(d) * amp * Math.exp(-Math.abs(d) / wpx));
}

// 2 つの図をバッファに描く（パラメータを変えたときだけ）
function build() {
  let A = area();
  if (!pg || pg.width !== width || pg.height !== height) { if (pg) pg.remove(); pg = createGraphics(width, height); pg.pixelDensity(1); }
  pg.clear(); pg.strokeWeight(1);
  prof = [];
  for (let x = A.x0; x < A.x1; x++) {
    let v = cornsweet(x); prof.push(v);
    pg.stroke(v); pg.line(x + 0.5, A.y0, x + 0.5, A.y1);
    pg.stroke(x < edgeX() ? G - stepD : G + stepD); pg.line(x + 0.5, A.y2, x + 0.5, A.y3);
  }
}

function drawScene(truth) {
  background(200);
  let A = area(), ex = edgeX();
  image(pg, 0, 0, width, height);
  if (truth) { noStroke(); fill(40); rect(ex - Math.max(12, wpx * 2.5), A.y0 - 10, 2 * Math.max(12, wpx * 2.5), A.y1 - A.y0 + 20); }
  // 断面のグラフ（上の図の 1 行の明るさ）
  let gy0 = Math.round(height * 0.66), gy1 = height - 50, yOf = (v) => gy1 - ((v - (G - 90)) / 180) * (gy1 - gy0);
  noFill(); stroke(150); strokeWeight(1); rect(A.x0, gy0, A.x1 - A.x0, gy1 - gy0);
  stroke(120); drawingContext.setLineDash([4, 4]); line(A.x0, yOf(G), A.x1, yOf(G)); drawingContext.setLineDash([]);
  stroke(220, 60, 40); strokeWeight(2.5); beginShape(); prof.forEach((v, i) => vertex(A.x0 + i, yOf(v))); endShape();
  stroke(40, 90, 220); strokeWeight(1.5); beginShape(); vertex(A.x0, yOf(G - stepD)); vertex(ex, yOf(G - stepD)); vertex(ex, yOf(G + stepD)); vertex(A.x1, yOf(G + stepD)); endShape();
  noStroke(); fill(30); textSize(14); textAlign(LEFT, BASELINE);
  text('赤 = 上の図の明るさの断面（画面の画素と同じ：自己テストで確認）　青 = 下の本物の段差　点線 = ' + G, A.x0 + 8, gy0 + 18);
  textAlign(RIGHT, CENTER); text(G, A.x0 - 4, yOf(G)); textAlign(LEFT, BASELINE);
  // 文字
  fill(20); textSize(18);
  text('↑↓：ふちの強さ ' + amp + '　←→：ふちの幅 ' + wpx + ' px　A・Z：下の段差 ±' + stepD + '　Enter：記録　T：境界をかくす', 20, 34);
  fill(60); textSize(15);
  text('上の図の左右の面は、ふちから離れるとどちらも ' + G + '。下の本物の段差を、上と同じ「明るさの差」に見えるまで A・Z で調整して Enter', 20, 60);
  fill(30); textSize(15); textAlign(LEFT, BASELINE);
  text('上：コーンスウィート（ふちだけ）', A.x0, A.y0 - 6); text('下：本物の段差', A.x0, A.y2 - 6);
  let tx = Math.round(width * 0.75), ty = 110;
  text('試行　強さ　幅　選んだ段差', tx, ty);
  let last = trials.slice(-10); fill(60);
  last.forEach((t, i) => text((trials.length - last.length + i + 1) + '　　' + t.amp + '　　' + t.w + '　　±' + t.d, tx, ty + 22 * (i + 1)));
  if (trials.length) { fill(20); text('平均：段差 ±' + mean(trials.map((t) => t.d)).toFixed(1) + '（ふちの強さの ' + ((100 * mean(trials.map((t) => t.d / t.amp))) | 0) + ' %）', tx, ty + 22 * 11 + 6); }
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

function keyPressed() {
  if (key === UP_ARROW) { amp = Math.min(100, amp + 5); build(); }
  if (key === DOWN_ARROW) { amp = Math.max(0, amp - 5); build(); }
  if (key === RIGHT_ARROW) { wpx = Math.min(200, wpx + 5); build(); }
  if (key === LEFT_ARROW) { wpx = Math.max(5, wpx - 5); build(); }
  if (key === 'a' || key === 'A') { stepD = Math.min(100, stepD + 1); build(); }
  if (key === 'z' || key === 'Z') { stepD = Math.max(0, stepD - 1); build(); }
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 'r' || key === 'R') trials = [];
  if (key === ENTER) { trials.push({ amp, w: wpx, d: stepD }); stepD = 0; build(); }
}
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); build(); }

// ---------- やってみよう ----------
// 1. ふちの強さ 40 のとき、本物の段差はいくつに見えた？ 何回か測って平均を出す
// 2. ふちの幅を 5 px（くっきり）と 150 px（なだらか）で比べる。どちらが「面全体」の差に見える？
// 3. T で境界をかくすと、左右は同じに見える。指で画面の境界をかくしても OK
// 4. 断面のグラフの赤い線：遠くでは左右とも点線（128）に重なっている
// 5. cornsweet() の exp をやめて、直線で G に戻すとどうなる？


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：上の図の 1 行の画素を全部読み、左右の面が同じ灰色か、ふちの明暗が打ち消し合うかを確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), A = area(), ex = edgeX();
  drawScene(false); loadPixels();
  let y = Math.round((A.y0 + A.y1) / 2), row = [];
  for (let x = A.x0; x < A.x1; x++) row.push(readPix(x, y)[0]);
  let l = readPix(A.x0 + 10, y), r = readPix(A.x1 - 10, y);
  ok('左の面 (' + l.join(',') + ') と右の面 (' + r.join(',') + ') は同じ ' + G, l.join() === r.join() && l[0] === G && l[1] === G && l[2] === G);
  ok('境界のすぐ左は暗く ' + readPix(ex - 1, y)[0] + '、すぐ右は明るく ' + readPix(ex, y)[0], readPix(ex - 1, y)[0] < G && readPix(ex, y)[0] > G);
  let dev = row.reduce((s, v) => s + (v - G), 0);
  ok('ふちの明暗は打ち消し合う：(画素 − ' + G + ') の合計 = ' + dev + '（ほぼ 0）', Math.abs(dev) <= 3);
  ok('画面の画素 = 計算した断面（' + row.length + ' 画素すべて）', row.every((v, i) => v === prof[i]));
  ok('はじめの「本物の段差」は 0：下の図は左右とも ' + G, readPix(A.x0 + 10, A.y3 - 10)[0] === G && readPix(A.x1 - 10, A.y3 - 10)[0] === G);
  selfTestResults = R;
  for (let q of R) (q.ok ? console.log : console.error)((q.ok ? '✓ ' : '✗ ') + q.name);
  return R.every((q) => q.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
