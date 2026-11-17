// ============================================
// 04 明るさの同時対比
// 同じ灰色でも、暗い背景の上では明るく、明るい背景の上では暗く見える（となりとの「差」を見ている）
// 1 = 左右の背景　2 = グラデーションの上の帯　3 = ホワイト錯視（黒白のしまに灰色を埋めこむ）
// ↑↓ = 右の灰色の明るさ（比較） / ←→ = 背景のコントラスト / Enter = 記録 / R = 消す
// T またはマウスを押している間 = 真実を見る（背景を消す）　B = 2 つの灰色を同じ色の帯でつなぐ
// ============================================

let which = 1;
let G = 128;                  // ★ 左の灰色（標準）。0〜255
let cmp = 128;                // 右の灰色（比較）。最初は G と同じ
let contrast = 0.85;          // ★ 背景のコントラスト（0 = 一様、1 = 黒と白）
let SW = 14;                  // ★ ホワイト錯視のしまの幅 px
let truthKey = false, bridge = false, trials = [];
const PAPER = 200;

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawScene(false);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function draw() { drawScene(truthOn()); }

function area() { return { x0: 40, y0: 100, x1: Math.round(width * 0.7), y1: height - 70 }; }
function bgDark() { return Math.round(128 - 125 * contrast); }
function bgLight() { return Math.round(128 + 125 * contrast); }
// 2 つの的（標準・比較）の中心と大きさ
function targets() {
  let A = area(), cy = Math.round((A.y0 + A.y1) / 2), w = A.x1 - A.x0;
  if (which === 3) return { s: { x: A.x0 + Math.round(w * 0.25), y: cy }, c: { x: A.x0 + Math.round(w * 0.75), y: cy }, r: 0 };
  let q = which === 1 ? 0.25 : 0.12;
  return { s: { x: A.x0 + Math.round(w * q), y: cy }, c: { x: A.x1 - Math.round(w * q), y: cy }, r: 60 };
}

function drawScene(truth) {
  background(PAPER);
  let A = area(), T = targets(), w = A.x1 - A.x0, h = A.y1 - A.y0;
  noStroke();
  if (which === 1) {
    if (!truth) { fill(bgDark()); rect(A.x0, A.y0, w / 2, h); fill(bgLight()); rect(A.x0 + w / 2, A.y0, w - w / 2, h); }
    patch(T.s, T.r, G); patch(T.c, T.r, cmp);
  } else if (which === 2) {
    if (!truth) for (let x = A.x0; x < A.x1; x += 4) { fill(Math.round(bgDark() + ((bgLight() - bgDark()) * (x - A.x0)) / w)); rect(x, A.y0, 4, h); }
    let mid = A.x0 + Math.round(w / 2);
    fill(G); rect(T.s.x - 40, T.s.y - 30, mid - (T.s.x - 40), 60);        // 左半分：一様な灰色 G の帯
    fill(cmp); rect(mid, T.c.y - 30, T.c.x + 40 - mid, 60);                // 右半分：比較（最初は G）
  } else {
    // ホワイト錯視：黒白のしま。左は黒いしまの一部、右は白いしまの一部を灰色に置きかえる
    let n = Math.floor(w / SW), yb0 = T.s.y - 70, yb1 = T.s.y + 70;
    for (let k = 0; k < n; k++) {
      let x = A.x0 + k * SW, dark = k % 2 === 0;
      if (!truth) { fill(dark ? bgDark() : bgLight()); rect(x, A.y0, SW, h); }
      let left = x + SW / 2 < A.x0 + w / 2;
      if (left && dark && Math.abs(x + SW / 2 - T.s.x) < w * 0.15) { fill(G); rect(x, yb0, SW, yb1 - yb0); }
      if (!left && !dark && Math.abs(x + SW / 2 - T.c.x) < w * 0.15) { fill(cmp); rect(x, yb0, SW, yb1 - yb0); }
    }
  }
  if (bridge) { fill(G); rect(T.s.x, T.s.y - 6, T.c.x - T.s.x, 12); }
  // 文字
  fill(20); textAlign(LEFT, BASELINE); textSize(18);
  let names = ['', '左右の背景', 'グラデーション', 'ホワイト錯視'];
  text('1〜3：' + names[which] + '　↑↓：右の灰色 ' + cmp + '　←→：背景のコントラスト ' + contrast.toFixed(2) + '　Enter：記録　T：背景を消す　B：帯でつなぐ ' + (bridge ? 'ON' : 'off'), 20, 34);
  fill(60); textSize(15);
  text('左の灰色は ' + G + '（RGB = ' + G + ', ' + G + ', ' + G + '）。右が左と同じ明るさに見えたら Enter。記録されるのは「本当の差」', 20, 60);
  drawTable(Math.round(width * 0.73), 120);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}
function patch(p, r, v) { fill(v); rect(p.x - r, p.y - r, 2 * r, 2 * r); }

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') which = +key;
  if (key === UP_ARROW) cmp = Math.min(255, cmp + 1);
  if (key === DOWN_ARROW) cmp = Math.max(0, cmp - 1);
  if (key === RIGHT_ARROW) contrast = Math.min(1, Math.round((contrast + 0.05) * 100) / 100);
  if (key === LEFT_ARROW) contrast = Math.max(0, Math.round((contrast - 0.05) * 100) / 100);
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 'b' || key === 'B') bridge = !bridge;
  if (key === 'r' || key === 'R') trials = [];
  if (key === ENTER) {
    trials.push({ which, c: contrast, diff: cmp - G });
    cmp = G + Math.round((Math.random() - 0.5) * 60);
  }
}
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }

function drawTable(x, y) {
  fill(20); textSize(16);
  let cw = [44, 76, 112, 90], cols = (v, yy) => { let xx = x; v.forEach((s, i) => { text(s, xx, yy); xx += cw[i]; }); };
  cols(['試行', '図', 'コントラスト', '差（右−左）'], y);
  let last = trials.slice(-10); fill(50);
  last.forEach((t, i) => cols([trials.length - last.length + i + 1, ['', '左右', 'グラデ', 'ホワイト'][t.which], t.c.toFixed(2), (t.diff > 0 ? '+' : '') + t.diff], y + 24 * (i + 1)));
  fill(20); textSize(16);
  for (let w = 1; w <= 3; w++) {
    let a = trials.filter((t) => t.which === w).map((t) => t.diff);
    text(['', '左右', 'グラデ', 'ホワイト'][w] + '：平均の差 ' + (a.length ? mean(a).toFixed(1) + '（' + a.length + ' 回）' : '−'), x, y + 24 * 11 + w * 24);
  }
  fill(60); textSize(13);
  text('差 = 錯視を打ち消すのに必要だった明るさ（0〜255）', x, y + 24 * 16);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. コントラストを 0 にすると、差は 0 に近づく？ 1 にすると？ グラフに描いてみよう
// 2. B で帯をつなぐと、つないだ瞬間に同じ色に見える？
// 3. ホワイト錯視（3）は、近くの背景（左は黒）ではなく「しまの仲間」と比べている。だから向きが逆になることも
// 4. G を 60（暗い灰色）や 200（明るい灰色）にして、錯視の大きさは変わる？
// 5. SW（しまの幅）を 4 や 60 にすると、ホワイト錯視はどうなる？


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：3 つの図を描いて、左右の灰色の画素を読み、本当に同じ RGB かを確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), keep = which;
  ok('はじめは 比較 = 標準 = ' + G + '（同じ定数）', cmp === G);
  for (let w = 1; w <= 3; w++) {
    which = w; drawScene(false); loadPixels();
    let T = targets();
    // ホワイト錯視は灰色のしまの中心を読む
    let xs = w === 3 ? grayStripeX(T.s.x) : T.s.x, xc = w === 3 ? grayStripeX(T.c.x) : T.c.x;
    let a = readPix(xs, T.s.y), b = readPix(xc, T.c.y);
    ok(['', '左右の背景', 'グラデーション', 'ホワイト錯視'][w] + '：2 つの灰色の画素 (' + a.join(',') + ') と (' + b.join(',') + ') が同じ', a.join() === b.join() && a[0] === G && a[1] === G && a[2] === G);
    if (w === 2) {
      let xs2 = [...Array(20)].map((_, k) => Math.round(T.s.x + 2 + ((T.c.x - T.s.x - 4) * k) / 19));
      ok('グラデーション：帯は左から右まで（背景は 0→255 なのに）どこを読んでも ' + G, xs2.every((x) => readPix(x, T.s.y).every((v) => v === G)));
    }
    if (w === 1) ok('背景：左は暗く ' + bgDark() + '、右は明るく ' + bgLight(), readPix(area().x0 + 5, area().y0 + 5)[0] === bgDark() && readPix(area().x1 - 5, area().y0 + 5)[0] === bgLight());
  }
  which = keep; drawScene(false);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
// x に一番近い「灰色のしま」の中心（ホワイト錯視）
function grayStripeX(x) {
  let A = area(), k = Math.floor((x - A.x0) / SW), left = x < A.x0 + (A.x1 - A.x0) / 2;
  if ((k % 2 === 0) !== left) k++;              // 左は黒いしま（偶数）、右は白いしま（奇数）
  return A.x0 + k * SW + Math.floor(SW / 2);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
