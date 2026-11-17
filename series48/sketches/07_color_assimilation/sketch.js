// ============================================
// 07 色の同化と対比（ムンカー型の原理を使ったオリジナルの図）
// 左右の円はまったく同じ色。左は「黄のしま」、右は「青のしま」が円の上を横切っている
// 細いしまでは、円の色がしまの色に近づいて見える（同化）。太いしまでは逆に遠ざかることも（対比）
// 1〜3 = 色の組 / ↑↓ = しまの太さ / マウスを動かす = スポイト（その画素の本当の RGB）
// T またはマウスを押している間 = 真実を見る（しまを外して、円をそのまま見せる）
// ============================================

let SETS = [
  { p: [30, 70, 230], q: [250, 215, 30], c: [225, 70, 60], name: '赤い円・青と黄のしま' },
  { p: [40, 170, 90], q: [200, 40, 170], c: [240, 160, 40], name: 'オレンジの円・緑と紫のしま' },
  { p: [0, 0, 0], q: [255, 255, 255], c: [128, 128, 128], name: '灰色の円・黒と白のしま' },
];
let setNo = 0;
let SH = 8;                  // ★ しまの太さ px
let truthKey = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noSmooth();
  drawScene(false);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function draw() {
  drawScene(truthOn());
  dropper();
}

// 2 つのパネルの位置と、円の中心・半径
function panels() {
  let pw = Math.round(Math.min(width * 0.42, (height - 160) * 1.1)), ph = Math.round(Math.min(height - 170, pw)), y0 = 90;
  let xL = Math.round(width / 2 - pw - 20), xR = Math.round(width / 2 + 20);
  return { pw, ph, y0, xL, xR, r: Math.round(ph * 0.3) };
}

function drawScene(truth) {
  background(235);
  let S = SETS[setNo], P = panels();
  for (let [k, x0] of [[0, P.xL], [1, P.xR]]) {
    let cx = x0 + Math.round(P.pw / 2), cy = P.y0 + Math.round(P.ph / 2);
    stripes(x0, P.y0, P.pw, P.ph, 'both');
    noStroke(); fill(S.c); circle(cx, cy, 2 * P.r);                 // 同じ色の円
    if (!truth) stripes(x0, P.y0, P.pw, P.ph, k === 0 ? 'q' : 'p');  // 左は黄（q）、右は青（p）のしまを円の上に重ねる
  }
  // 文字
  noStroke(); fill(20); textAlign(LEFT, BASELINE); textSize(18);
  text('1〜3：' + S.name + '　↑↓：しまの太さ ' + SH + ' px　マウス：スポイト　T：真実（しまを外す）', 20, 34);
  fill(70); textSize(15);
  text('左右の円の RGB はどちらも (' + S.c.join(', ') + ')。円の上をスポイトでなぞって確かめよう', 20, 60);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

// しま模様：which = 'both' なら両方、'p' か 'q' ならその色のしまだけ
function stripes(x0, y0, w, h, which) {
  let S = SETS[setNo]; noStroke();
  for (let y = y0, k = 0; y < y0 + h; y += SH, k++) {
    let isP = k % 2 === 0;
    if (which === 'both' || (which === 'p') === isP) { fill(isP ? S.p : S.q); rect(x0, y, w, Math.min(SH, y0 + h - y)); }
  }
}

// スポイト：マウスの下の画素の色を拡大して表示
function dropper() {
  if (mouseX < 0 || mouseY < 0 || mouseX >= width || mouseY >= height) return;
  let c = get(Math.floor(mouseX), Math.floor(mouseY)), x = width - 230, y = height - 110;
  noFill(); stroke(0); strokeWeight(1); line(mouseX - 10, mouseY, mouseX - 3, mouseY); line(mouseX + 3, mouseY, mouseX + 10, mouseY);
  line(mouseX, mouseY - 10, mouseX, mouseY - 3); line(mouseX, mouseY + 3, mouseX, mouseY + 10);
  noStroke(); fill(255); rect(x - 10, y - 10, 220, 90, 8);
  fill(c[0], c[1], c[2]); rect(x, y, 70, 70);
  fill(20); textSize(15); textAlign(LEFT, TOP);
  text('スポイト', x + 80, y); text('R ' + c[0] + '  G ' + c[1], x + 80, y + 24); text('B ' + c[2], x + 80, y + 46);
  textAlign(LEFT, BASELINE);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') setNo = +key - 1;
  if (key === UP_ARROW) SH = Math.min(60, SH + 2);
  if (key === DOWN_ARROW) SH = Math.max(2, SH - 2);
  if (key === 't' || key === 'T') truthKey = !truthKey;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. しまの太さを 2 px・8 px・40 px にして、左右の円の見え方の差が大きいのはどれ？
// 2. 3（灰色の円）でも同じことが起きる？ 色だけでなく明るさの同化
// 3. 画面から離れて見ると（しまが細かく見えると）錯視は強くなる？
// 4. SETS に自分の色の組を足そう：円の色 c を、p と q の中間の色にすると効きやすい
// 5. スポイトで円の上の 2 か所をなぞる。見た目の色と RGB の数字はちがう？


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：3 つの色の組で、左右の円の見えている部分の画素を読み、同じ RGB かを確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), keep = setNo, P = panels();
  let cy = P.y0 + Math.round(P.ph / 2), kc = Math.floor((cy - P.y0) / SH);
  let rowOf = (k) => P.y0 + k * SH + Math.floor(SH / 2);        // k 番目のしまの真ん中の行
  let kP = kc % 2 === 0 ? kc : kc + 1, kQ = kP + 1;                // 中心の近くの p のしま・q のしま
  for (let s = 0; s < SETS.length; s++) {
    setNo = s; drawScene(false); loadPixels();
    let S = SETS[s], xl = P.xL + Math.round(P.pw / 2), xr = P.xR + Math.round(P.pw / 2);
    let a = readPix(xl, rowOf(kP)), b = readPix(xr, rowOf(kQ));     // 左は p の行、右は q の行で円が見えている
    ok('組 ' + (s + 1) + '：左の円 (' + a.join(',') + ') = 右の円 (' + b.join(',') + ') = c', a.join() === S.c.join() && b.join() === S.c.join());
    let a2 = readPix(xl, rowOf(kQ)), b2 = readPix(xr, rowOf(kP));
    ok('組 ' + (s + 1) + '：円の上を横切るしまは 左 = q、右 = p', a2.join() === S.q.join() && b2.join() === S.p.join());
  }
  setNo = keep; drawScene(false);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
