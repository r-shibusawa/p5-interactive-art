// ============================================
// 11 補色残像 ─ 白黒の写真に色が見える
// 色を反転した絵（補色：255 − R, 255 − G, 255 − B）の真ん中の + を見つめてから、白黒の絵に切りかえると
// しばらくの間、白黒の絵に本当の色が見える。目の色のセンサーが疲れて、反対の色が強く感じられるから
// スペース = スタート / ↑↓ = 見つめる時間 / 1〜3 = 絵を選ぶ / T = 真実（いま見ている絵の画素の RGB を表示）
// 長く見つめて気分が悪くなったら目を離す
// ============================================

let adaptSec = 20;            // ★ 見つめる時間（秒）
let testSec = 10;             // ★ 白黒の絵を見せる時間（秒）
let scene = 1, truthKey = false;
let orig, comp, grey, startMs = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  makeImages();
  selfTest();
}
function phaseAt(t) { if (t < 0) return 'ready'; if (t < adaptSec) return 'adapt'; if (t < adaptSec + testSec) return 'test'; return 'ready'; }
function elapsed() { return startMs < 0 ? -1 : (millis() - startMs) / 1000; }
function frameBox() { let w = Math.round(Math.min(width * 0.62, (height - 170) * 1.6)), h = Math.round(w / 1.6); return { x: Math.round((width - w) / 2), y: 90, w, h }; }

// ---- 3 枚の絵：元の色 → 補色 → 白黒（明るさだけ）
function makeImages() {
  let B = frameBox();
  if (!orig || orig.width !== B.w || orig.height !== B.h) { if (orig) orig.remove(); orig = createGraphics(B.w, B.h); orig.pixelDensity(1); }
  drawScene(orig, scene);
  orig.loadPixels();
  comp = createImage(B.w, B.h); grey = createImage(B.w, B.h); comp.loadPixels(); grey.loadPixels();
  for (let i = 0; i < orig.pixels.length; i += 4) {
    let [r, g, b] = [orig.pixels[i], orig.pixels[i + 1], orig.pixels[i + 2]];
    let c = complement([r, g, b]), y = lumaOf([r, g, b]);
    comp.pixels[i] = c[0]; comp.pixels[i + 1] = c[1]; comp.pixels[i + 2] = c[2]; comp.pixels[i + 3] = 255;
    grey.pixels[i] = grey.pixels[i + 1] = grey.pixels[i + 2] = y; grey.pixels[i + 3] = 255;
  }
  comp.updatePixels(); grey.updatePixels();
}
function complement(c) { return [255 - c[0], 255 - c[1], 255 - c[2]]; }
function lumaOf(c) { return Math.round(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]); }   // テレビと同じ明るさの式

function drawScene(g, k) {
  let w = g.width, h = g.height; g.noStroke();
  if (k === 1) {        // 風景：空・太陽・丘・家
    g.background(70, 140, 235);
    g.fill(250, 220, 40); g.circle(w * 0.78, h * 0.25, h * 0.26);
    g.fill(60, 170, 70); g.ellipse(w * 0.25, h * 1.05, w * 0.9, h * 0.9); g.fill(40, 140, 60); g.ellipse(w * 0.8, h * 1.1, w * 0.9, h * 0.8);
    g.fill(220, 50, 50); g.rect(w * 0.42, h * 0.5, w * 0.18, h * 0.22); g.triangle(w * 0.4, h * 0.5, w * 0.62, h * 0.5, w * 0.51, h * 0.36);
    g.fill(250, 240, 210); g.rect(w * 0.48, h * 0.6, w * 0.05, h * 0.12);
  } else if (k === 2) { // 3 色の帯と円
    let cols = [[40, 90, 220], [245, 245, 245], [220, 40, 50]];
    cols.forEach((c, i) => { g.fill(c); g.rect((w * i) / 3, 0, w / 3 + 1, h); });
    g.fill(250, 200, 30); g.circle(w / 2, h / 2, h * 0.45);
  } else {              // 色とりどりの円
    g.background(235);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { g.colorMode(HSB); g.fill((i * 72 + j * 24) % 360, 80, 95); g.circle(((i + 0.5) * w) / 5, ((j + 0.5) * h) / 3, h * 0.26); g.colorMode(RGB); }
  }
}

function draw() {
  let t = elapsed(), ph = phaseAt(t), B = frameBox();
  if (ph === 'ready' && t >= 0) startMs = -1;
  background(30);
  if (ph === 'adapt') image(comp, B.x, B.y);
  else if (ph === 'test') image(grey, B.x, B.y);
  else {
    image(orig, B.x, B.y);
    // 3 枚を小さく並べる
    let tw = Math.round(B.w / 3.4), th = Math.round(tw / 1.6), ty = B.y + B.h + 12;
    [[orig, '元の色'], [comp, '補色（見つめる）'], [grey, '白黒（テスト）']].forEach(([im, nm], i) => { let x = B.x + i * (tw + 20); image(im, x, ty, tw, th); fill(220); textSize(13); textAlign(LEFT, TOP); text(nm, x, ty + th + 2); });
  }
  if (ph !== 'ready') { stroke(0); strokeWeight(3); let cx = B.x + B.w / 2, cy = B.y + B.h / 2; line(cx - 12, cy, cx + 12, cy); line(cx, cy - 12, cx, cy + 12); }
  hud(ph, t);
}

function hud(ph, t) {
  noStroke(); fill(235); rect(0, 0, width, 70);
  fill(20); textSize(18); textAlign(LEFT, BASELINE);
  text('スペース：スタート　↑↓：見つめる時間 ' + adaptSec + ' 秒　1〜3：絵 ' + scene + '　T：真実（マウスの下の画素）', 20, 30);
  fill(160, 30, 30); textSize(15);
  text('+ だけを見つめて、まばたきをがまん。長く見つめて気分が悪くなったら目を離す', 20, 56);
  fill(230); textSize(24); textAlign(CENTER, BASELINE);
  let msg = ph === 'ready' ? 'スペースでスタート' : ph === 'adapt' ? '+ を見つめて… あと ' + Math.ceil(adaptSec - t) + ' 秒' : '白黒の絵です。色が見える？（' + Math.ceil(adaptSec + testSec - t) + '）';
  text(msg, width / 2, height - 24);
  textAlign(LEFT, BASELINE);
  if (truthKey && mouseX >= 0 && mouseY >= 0 && mouseX < width && mouseY < height) {
    let c = get(Math.floor(mouseX), Math.floor(mouseY));
    fill(255); rect(width - 230, 90, 210, 80, 8); fill(c[0], c[1], c[2]); rect(width - 220, 100, 60, 60);
    fill(20); textSize(15); text('R ' + c[0] + ' G ' + c[1], width - 150, 122); text('B ' + c[2] + (c[0] === c[1] && c[1] === c[2] ? '（色なし）' : ''), width - 150, 146);
  }
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(60, 170, 90) : color(230, 60, 60)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}

function keyPressed() {
  if (key === ' ') startMs = millis();
  if (key === UP_ARROW) adaptSec = Math.min(60, adaptSec + 5);
  if (key === DOWN_ARROW) adaptSec = Math.max(5, adaptSec - 5);
  if (key === '1' || key === '2' || key === '3') { scene = +key; startMs = -1; makeImages(); }
  if (key === 't' || key === 'T') truthKey = !truthKey;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); makeImages(); }

// ---------- やってみよう ----------
// 1. 見つめる時間 5 秒・20 秒・40 秒で、色が見えている時間をくらべる
// 2. テスト中に T を押してマウスで白黒の絵をなぞる。R = G = B（色なし）なのに色が見える
// 3. + から目をそらして見つめると、残像の色がずれる・ぼやける
// 4. 2（3 色の帯）で、見える色は元の色と同じ？ 少しちがう？
// 5. drawScene に自分の絵を描こう（国旗、好きなキャラクターの色 など）


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 自己テスト：補色と白黒の計算を、絵の全部の画素で確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), n = orig.pixels.length / 4;
  let allSum = true, allGrey = true, allLuma = true;
  for (let i = 0; i < orig.pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) if (orig.pixels[i + c] + comp.pixels[i + c] !== 255) allSum = false;
    if (grey.pixels[i] !== grey.pixels[i + 1] || grey.pixels[i + 1] !== grey.pixels[i + 2]) allGrey = false;
    if (grey.pixels[i] !== lumaOf([orig.pixels[i], orig.pixels[i + 1], orig.pixels[i + 2]])) allLuma = false;
  }
  ok('全 ' + n + ' 画素で 元の色 ＋ 補色 = 255（R・G・B それぞれ）', allSum);
  ok('補色の補色は元の色', complement(complement([12, 200, 99])).join() === '12,200,99');
  ok('白黒の絵は全画素で R = G = B（色の情報はまったくない）', allGrey);
  ok('白黒の明るさ = 0.299 R ＋ 0.587 G ＋ 0.114 B（白 255、黒 0）', allLuma && lumaOf([255, 255, 255]) === 255 && lumaOf([0, 0, 0]) === 0);
  ok('タイマー：見つめる → テスト → 待ち', phaseAt(-1) === 'ready' && phaseAt(1) === 'adapt' && phaseAt(adaptSec + 1) === 'test' && phaseAt(adaptSec + testSec + 1) === 'ready');
  let colours = new Set(); for (let i = 0; i < orig.pixels.length; i += 4 * 97) colours.add(orig.pixels[i] + ',' + orig.pixels[i + 1] + ',' + orig.pixels[i + 2]);
  ok('元の絵には色がある（' + colours.size + ' 色以上）', colours.size >= 4);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
