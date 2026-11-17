// ============================================
// 15 カメラ映像に錯視フィルタ
// 1 同時対比：映像のいちばん暗い所と明るい所に、まったく同じ灰色の四角を置く → 違う明るさに見える
// 2 きらめき格子：映像の上に灰色の格子と白い円を重ねる → 円の中に黒い点がちらつく
// 3 補色残像：色を反転した映像を見つめてから、白黒の映像へ → 白黒なのに色が見える
// 1〜3 = 切替 / スペース = 3 のスタート / ↑↓ = 3 の見つめる時間・2 の格子の細かさ / C = カメラ ⇔ テスト画像 / S = 保存
// T またはマウスを押している間 = 真実を見る（2 つの四角を同じ灰色の帯でつなぎ、画素を読む）
// 長く見つめて気分が悪くなったら目を離す
// ============================================

let which = 1;
let G = 128;                  // ★ 同時対比の四角の灰色
let cell = 90;                // ★ きらめき格子のマスの大きさ px
let adaptSec = 15, testSec = 10;
let VW = 160, VH = 120;       // 映像を処理する大きさ
let cap, useCam = true, testImg, outImg, startMs = -1, truthKey = false;
let spots = null;             // 同時対比の四角の位置（暗い所・明るい所）

function setup() {
  createCanvas(windowWidth, windowHeight);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(VW, VH); cap.hide();
  testImg = makeTestImage();
  outImg = createImage(VW, VH);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function camReady() { return useCam && cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2; }   // 映像が届いているか
function phaseAt(t) { if (t < 0) return 'ready'; if (t < adaptSec) return 'adapt'; if (t < adaptSec + testSec) return 'test'; return 'ready'; }
function elapsed() { return startMs < 0 ? -1 : (millis() - startMs) / 1000; }

// テスト画像（カメラがないとき）：明るさのグラデーションと色の図形
function makeTestImage() {
  let g = createGraphics(VW, VH); g.pixelDensity(1); g.noStroke();
  for (let x = 0; x < VW; x++) { g.fill(20 + (200 * x) / VW, 30 + (120 * x) / VW, 90); g.rect(x, 0, 1, VH); }
  g.fill(240, 200, 40); g.circle(VW * 0.75, VH * 0.35, 40);
  g.fill(220, 50, 60); g.rect(VW * 0.15, VH * 0.55, 40, 30);
  g.fill(60, 180, 90); g.triangle(VW * 0.45, VH * 0.9, VW * 0.6, VH * 0.55, VW * 0.75, VH * 0.9);
  return g;
}
// いまの映像の画素（160 × 120）
function sourcePixels() {
  let src = camReady() ? cap : testImg;
  src.loadPixels();
  return src.pixels && src.pixels.length >= VW * VH * 4 ? src.pixels : (testImg.loadPixels(), testImg.pixels);
}
function grayOf(r, g, b) { return Math.round(0.299 * r + 0.587 * g + 0.114 * b); }
function invert(c) { return [255 - c[0], 255 - c[1], 255 - c[2]]; }

// 映像を 4 × 4 のブロックに分け、いちばん暗い・明るいブロックの中心を探す
function findSpots(px) {
  let best = { lo: null, hi: null }, bw = VW / 4, bh = VH / 4;
  for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) {
    let s = 0, n = 0;
    for (let y = by * bh; y < (by + 1) * bh; y += 2) for (let x = bx * bw; x < (bx + 1) * bw; x += 2) { let i = 4 * (y * VW + x); s += grayOf(px[i], px[i + 1], px[i + 2]); n++; }
    let m = s / n, c = { x: (bx + 0.5) / 4, y: (by + 0.5) / 4, m };
    if (!best.lo || m < best.lo.m) best.lo = c;
    if (!best.hi || m > best.hi.m) best.hi = c;
  }
  return best;
}

function draw() { drawScene(truthOn(), false); }

function drawScene(truth, snap) {
  let px = sourcePixels(), ph = phaseAt(elapsed());
  if (ph === 'ready' && startMs >= 0 && elapsed() > adaptSec + testSec) startMs = -1;
  outImg.loadPixels();
  for (let i = 0; i < VW * VH * 4; i += 4) {
    let r = px[i], g = px[i + 1], b = px[i + 2], o;
    if (which === 1) { let y = grayOf(r, g, b); o = [y, y, y]; }
    else if (which === 2) o = [r * 0.35, g * 0.35, b * 0.35];
    else if (ph === 'adapt') o = invert([r, g, b]);
    else if (ph === 'test') { let y = grayOf(r, g, b); o = [y, y, y]; }
    else o = [r, g, b];
    outImg.pixels[i] = o[0]; outImg.pixels[i + 1] = o[1]; outImg.pixels[i + 2] = o[2]; outImg.pixels[i + 3] = 255;
  }
  outImg.updatePixels();
  image(outImg, 0, 0, width, height);

  if (which === 1) {
    let f = findSpots(px), s = Math.round(Math.min(width, height) * 0.1);
    if (!spots || snap) spots = { lo: { x: f.lo.x, y: f.lo.y }, hi: { x: f.hi.x, y: f.hi.y } };
    for (let k of ['lo', 'hi']) { spots[k].x += (f[k].x - spots[k].x) * 0.05; spots[k].y += (f[k].y - spots[k].y) * 0.05; }
    let a = spotPx('lo'), b = spotPx('hi');
    noStroke(); fill(G);
    rect(a[0] - s / 2, a[1] - s / 2, s, s); rect(b[0] - s / 2, b[1] - s / 2, s, s);
    if (truth) {
      rect(Math.min(a[0], b[0]), a[1] - 6, Math.abs(b[0] - a[0]), 12); rect(b[0] - 6, Math.min(a[1], b[1]), 12, Math.abs(b[1] - a[1]));
      fill(255, 230, 60); textSize(15); textAlign(CENTER, TOP);
      text('暗い所 ' + Math.round(f.lo.m) + ' の上の ' + G, a[0], a[1] + s / 2 + 4); text('明るい所 ' + Math.round(f.hi.m) + ' の上の ' + G, b[0], b[1] + s / 2 + 4);
    }
  } else if (which === 2) {
    let st = Math.round(cell * 0.2);
    noStroke(); fill(110);
    for (let x = 0; x < width; x += cell) rect(x, 0, st, height);
    for (let y = 0; y < height; y += cell) rect(0, y, width, st);
    fill(255); for (let x = 0; x < width + cell; x += cell) for (let y = 0; y < height + cell; y += cell) circle(x + st / 2, y + st / 2, st * 1.25);
  } else if (ph !== 'ready') {
    stroke(0); strokeWeight(3); line(width / 2 - 12, height / 2, width / 2 + 12, height / 2); line(width / 2, height / 2 - 12, width / 2, height / 2 + 12);
  }
  hud(ph);
}
function spotPx(k) { return [Math.round(spots[k].x * width), Math.round(spots[k].y * height)]; }

function hud(ph) {
  noStroke(); fill(0, 160); rect(0, 0, width, 70);
  fill(255); textSize(18); textAlign(LEFT, BASELINE);
  let names = ['', '同時対比', 'きらめき格子', '補色残像'];
  text('1〜3：' + names[which] + '　' + (which === 3 ? 'スペース：スタート　↑↓：見つめる ' + adaptSec + ' 秒' : which === 2 ? '↑↓：マス ' + cell + ' px' : 'T：帯でつなぐ') + '　C：' + (camReady() ? 'カメラ' : 'テスト画像') + '　S：保存', 20, 30);
  fill(255, 200, 200); textSize(15);
  let msg = which === 1 ? '2 つの四角は同じ灰色 ' + G + '。暗い所の上は明るく、明るい所の上は暗く見える'
          : which === 2 ? '白い円の中に黒い点がちらつく（点はどこにも描いていない）'
          : ph === 'adapt' ? '+ を見つめて… あと ' + Math.ceil(adaptSec - elapsed()) + ' 秒' : ph === 'test' ? '白黒の映像です。色が見える？' : 'スペースでスタート';
  text(msg + '。長く見つめて気分が悪くなったら目を離す', 20, 56);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(120, 230, 140) : color(255, 90, 90)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { which = +key; startMs = -1; }
  if (key === ' ' && which === 3) startMs = millis();
  if (key === UP_ARROW) { if (which === 3) adaptSec = Math.min(40, adaptSec + 5); else cell = Math.min(200, cell + 10); }
  if (key === DOWN_ARROW) { if (which === 3) adaptSec = Math.max(5, adaptSec - 5); else cell = Math.max(40, cell - 10); }
  if (key === 'c' || key === 'C') useCam = !useCam;
  if (key === 't' || key === 'T') truthKey = !truthKey;
  if (key === 's' || key === 'S') saveCanvas('illusion_camera', 'png');
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 1 で、暗い服や明るい窓の前で手を動かす。四角は同じ灰色のまま、見え方だけ変わる
// 2. T で帯をつなぐと、2 つが同じ色だと分かる。でも帯を消すとまた違って見える
// 3. 2 の格子の大きさ（↑↓）で、ちらつきの強さは変わる？
// 4. 3 で自分の顔の補色を 15 秒見つめてから白黒へ。顔色はどう見える？
// 5. G を 60 や 200 に変えて、どの明るさで一番錯視が強い？


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：テスト画像で描いて、2 つの四角が同じ灰色か画素で確かめる。計算の道具も確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), keepCam = useCam, keepW = which;
  useCam = false; which = 1; drawScene(false, true); loadPixels();
  let a = readPix(...spotPx('lo')), b = readPix(...spotPx('hi'));
  ok('同時対比：暗い所の四角 (' + a.join(',') + ') = 明るい所の四角 (' + b.join(',') + ') = ' + G, a.join() === b.join() && a.every((v) => v === G));
  testImg.loadPixels(); let f = findSpots(testImg.pixels);
  ok('暗いブロック（' + Math.round(f.lo.m) + '）と明るいブロック（' + Math.round(f.hi.m) + '）を見つけた', f.lo.m < f.hi.m - 50);
  ok('補色：(30, 200, 90) → (225, 55, 165)、2 回で元に戻る', invert([30, 200, 90]).join() === '225,55,165' && invert(invert([30, 200, 90])).join() === '30,200,90');
  ok('白黒：白 255・黒 0、R = G = B', grayOf(255, 255, 255) === 255 && grayOf(0, 0, 0) === 0);
  which = 3; startMs = -1; drawScene(false, true); loadPixels();
  let c = readPix(width / 4, height / 2); outImg.loadPixels();
  ok('補色残像の「待ち」では元の色をそのまま表示', c[0] !== c[1] || c[1] !== c[2]);
  ok('タイマー：見つめる → 白黒 → 待ち', phaseAt(-1) === 'ready' && phaseAt(1) === 'adapt' && phaseAt(adaptSec + 1) === 'test' && phaseAt(adaptSec + testSec + 1) === 'ready');
  useCam = keepCam; which = keepW; spots = null;
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
