// ============================================
// 15 ビデオフィードバック
// カメラで「カメラの映像を映している画面」を撮ると、映像が映像の中に入り続ける閉ループになる
// ここでは 1 フレーム前の画面を少し拡大・回転して × g 倍し、カメラの映像を足す。g・回転・拡大で模様が自分で育つ
// g > 1 なら暴走（正のフィードバック）するが、画素は 0〜255 で飽和するので止まる
// ↑↓ = ループのゲイン g / ←→ = 回転 / 1 2 = 拡大 −/+ / C = 色をずらす / V = カメラ ↔ テスト画像 / S = 保存 / R = 消す
// ============================================

const FW = 200, FH = 150;      // ループの画像の大きさ（小さくして計算を軽く）
let gain = 0.85;               // ★ ループのゲイン（1 周で何倍になるか）
let rotDeg = 3;                // ★ 1 周ごとの回転 [度]
let zoom = 1.04;               // ★ 1 周ごとの拡大
let inW = 0.35;                // ★ カメラの映像を足す強さ
let colorShift = true, useCam = true;
let cap, fb, outImg, camBuf, histL = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  cap = createCapture(VIDEO, { flipped: true }); cap.size(FW, FH); cap.hide();
  fb = makeLoop(FW, FH); outImg = createImage(FW, FH); camBuf = new Float32Array(FW * FH * 3);
  selfTest();
}
// ---- ループの状態：今の画面（RGB を 0〜255 の小数で）
function makeLoop(w, h) { return { w, h, a: new Float32Array(w * h * 3), b: new Float32Array(w * h * 3) }; }
// 1 周：新しい画面(p) = g × 前の画面(拡大・回転をもどした位置) + inW × 入力(p)、0〜255 で飽和
function loopStep(F, src, p) {
  let { w, h, a, b } = F, cx = (w - 1) / 2, cy = (h - 1) / 2, c = Math.cos(-p.rot) / p.zoom, s = Math.sin(-p.rot) / p.zoom;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let dx = x - cx, dy = y - cy, sx = cx + c * dx - s * dy, sy = cy + s * dx + c * dy, o = 3 * (y * w + x);
    let x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    for (let k = 0; k < 3; k++) {
      let kk = p.shift ? (k + 1) % 3 : k, v = 0;                         // 色をずらす：前の G → 今の R …
      if (x0 >= 0 && y0 >= 0 && x0 < w && y0 < h) {                    // 画面の外は黒
        let dx1 = x0 + 1 < w ? 3 : 0, dy1 = y0 + 1 < h ? 3 * w : 0;
        let i00 = 3 * (y0 * w + x0) + kk, i10 = i00 + dx1, i01 = i00 + dy1, i11 = i01 + dx1;
        v = (a[i00] * (1 - fx) + a[i10] * fx) * (1 - fy) + (a[i01] * (1 - fx) + a[i11] * fx) * fy;   // 双線形補間
      }
      let nv = p.g * v + p.inW * src[o + k];
      b[o + k] = nv > 255 ? 255 : nv < 0 ? 0 : nv;
    }
  }
  F.a = b; F.b = a;
}
// 明るさのヒストグラム（32 区間）のエントロピー [ビット]：0 = 一色、5 = すべての明るさが同じだけ
function lumEntropy(arr) {
  let hgm = new Array(32).fill(0), n = arr.length / 3;
  for (let i = 0; i < n; i++) hgm[Math.min(31, Math.floor(((arr[3 * i] + arr[3 * i + 1] + arr[3 * i + 2]) / 3 / 256) * 32))]++;
  let e = 0; for (let c of hgm) if (c) e -= (c / n) * Math.log2(c / n); return e;
}
// カメラがないときのテスト画像（動く丸と帯）
function testFrame(buf, t) {
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    let o = 3 * (y * FW + x), d = Math.hypot(x - FW / 2 - 40 * Math.cos(t), y - FH / 2 - 30 * Math.sin(1.3 * t));
    let on = d < 14 ? 1 : 0, band = Math.abs(x - FW / 2) < 3 ? 0.6 : 0;
    buf[o] = 255 * on; buf[o + 1] = 160 * on + 200 * band; buf[o + 2] = 60 * on + 255 * band;
  }
}

function draw() {
  background(24, 35, 10);
  let live = useCam && cap && cap.width > 0 && cap.elt.readyState >= 2 && cap.elt.videoWidth > 0;
  if (live) { cap.loadPixels(); if (cap.pixels.length >= FW * FH * 4) for (let i = 0; i < FW * FH; i++) { camBuf[3 * i] = cap.pixels[4 * i]; camBuf[3 * i + 1] = cap.pixels[4 * i + 1]; camBuf[3 * i + 2] = cap.pixels[4 * i + 2]; } else live = false; }
  if (!live) testFrame(camBuf, millis() / 1000);
  loopStep(fb, camBuf, { g: gain, rot: (rotDeg * PI) / 180, zoom, inW, shift: colorShift });
  outImg.loadPixels();
  let sum = 0, sat = 0;
  for (let i = 0; i < FW * FH; i++) { for (let k = 0; k < 3; k++) { let v = fb.a[3 * i + k]; outImg.pixels[4 * i + k] = v; sum += v; } outImg.pixels[4 * i + 3] = 255; if (fb.a[3 * i] >= 254.5 || fb.a[3 * i + 1] >= 254.5 || fb.a[3 * i + 2] >= 254.5) sat++; }
  outImg.updatePixels();
  let mean = sum / (FW * FH * 3), ent = frameCount % 6 === 0 ? lumEntropy(fb.a) : histL.length ? histL[histL.length - 1][1] : 0;
  histL.push([mean, ent, sat / (FW * FH)]); if (histL.length > 400) histL.shift();

  let sc = Math.min((width * 0.62) / FW, (height - 130) / FH), iw = FW * sc, ih = FH * sc;
  image(outImg, 20, 90, iw, ih);
  say((live ? 'カメラ' : 'テスト画像（V でカメラ）') + ' ─ ビデオフィードバック：画面を撮った画面を、また撮る', 20, 36, 20);
  say('↑↓ g = ' + gain.toFixed(2) + '　←→ 回転 ' + rotDeg.toFixed(1) + '°　1 2 拡大 ' + zoom.toFixed(3) + '　C 色ずらし ' + (colorShift ? 'ON' : 'OFF') + '　V 切りかえ　S 保存　R 消す', 20, 62, 15, C_SUB);

  // ---- ループの図と数
  let hx = 40 + iw, hy = 100, bw = width - hx - 30;
  blockBox(hx, hy, bw * 0.45, 50, 'カメラ', '× ' + inW, C_SCOPE);
  blockBox(hx + bw * 0.55, hy, bw * 0.45, 50, '＋ → 画面', '0〜255 で飽和', C_TUBE);
  blockBox(hx + bw * 0.55, hy + 90, bw * 0.45, 50, '画面を撮る', '拡大・回転・× g', C_BRASS);
  let ph = (frameCount / 50) % 1;
  flowArrow(hx + bw * 0.45, hy + 25, hx + bw * 0.55, hy + 25, C_SCOPE, ph);
  flowArrow(hx + bw * 0.78, hy + 50, hx + bw * 0.78, hy + 90, C_TUBE, ph);
  flowArrow(hx + bw * 0.62, hy + 90, hx + bw * 0.62, hy + 50, C_BRASS, ph, 'g');
  let my = hy + 180, fp = gain < 1 ? (inW * 255) / (1 - gain) : Infinity;
  say('平均の明るさ ' + mean.toFixed(1) + '　飽和した画素 ' + ((100 * sat) / (FW * FH)).toFixed(1) + '%', hx, my, 15);
  say('明るさのエントロピー ' + ent.toFixed(3) + ' ビット（最大 5）', hx, my + 24, 15, C_TUBE);
  say(gain < 1 ? '白い入力の行きつく先 ' + inW + '×255÷(1−g) = ' + (fp > 255 ? '255（飽和）' : fp.toFixed(1)) : 'g ≥ 1：明るい所は 255 に張りつく', hx, my + 48, 14, gain < 1 ? C_SCOPE : C_ALARM);
  let gy = my + 70, gh = height - gy - 50;
  plotFrame(hx, gy, bw, gh, '明るさ（橙）・エントロピー（緑）・飽和（赤）');
  plotLine(histL.map((h) => h[0]), hx, gy, bw, gh, 0, 255, C_TUBE, 400, 1.8);
  plotLine(histL.map((h) => h[1]), hx, gy, bw, gh, 0, 5, C_SCOPE, 400, 1.8);
  plotLine(histL.map((h) => h[2]), hx, gy, bw, gh, 0, 1, C_ALARM, 400, 1.2);
  drawSelfTest();
}

function keyPressed() {
  if (key === UP_ARROW) gain = Math.min(1.5, +(gain + 0.05).toFixed(2));
  if (key === DOWN_ARROW) gain = Math.max(0, +(gain - 0.05).toFixed(2));
  if (key === RIGHT_ARROW) rotDeg = Math.min(15, rotDeg + 0.5);
  if (key === LEFT_ARROW) rotDeg = Math.max(-15, rotDeg - 0.5);
  if (key === '1') zoom = Math.max(0.9, +(zoom - 0.01).toFixed(3));
  if (key === '2') zoom = Math.min(1.2, +(zoom + 0.01).toFixed(3));
  if (key === 'c' || key === 'C') colorShift = !colorShift;
  if (key === 'v' || key === 'V') useCam = !useCam;
  if (key === 's' || key === 'S') saveCanvas('video_feedback', 'png');
  if (key === 'r' || key === 'R') { fb.a.fill(0); fb.b.fill(0); }
}

// ---- 自己テスト（小さな 20 × 16 の画像で）
function selfTest() {
  selfTestResults = [];
  let w = 20, h = 16, src = new Float32Array(w * h * 3), r = makeRng(3);
  for (let i = 0; i < src.length; i++) src[i] = Math.floor(r() * 256);
  let F = makeLoop(w, h); for (let i = 0; i < F.a.length; i++) F.a[i] = 200;
  loopStep(F, src, { g: 0, rot: 0.3, zoom: 1.1, inW: 0.5, shift: true });
  check('g = 0：ループなし → 画面 = 0.5 × カメラ（ぴったり）', F.a.every((v, i) => near(v, 0.5 * src[i], 1e-4)));
  let zero = new Float32Array(w * h * 3); F = makeLoop(w, h); for (let i = 0; i < F.a.length; i++) F.a[i] = 255;
  for (let k = 0; k < 30; k++) loopStep(F, zero, { g: 0.5, rot: 0.1, zoom: 1.02, inW: 0.5, shift: false });
  check('g = 0.5・入力なし：30 周で消える（最大 < 1、0.5³⁰ × 255）', Math.max(...F.a) < 1);
  F = makeLoop(w, h); let ok = true;
  for (let k = 0; k < 50; k++) { loopStep(F, src, { g: 1.5, rot: 0.2, zoom: 1.05, inW: 0.5, shift: true }); for (let v of F.a) if (!(v >= 0 && v <= 255)) ok = false; }
  check('g = 1.5（暴走）でも画素は 0〜255 にとどまる（飽和）、NaN なし', ok);
  let flat = new Float32Array(w * h * 3).fill(100); F = makeLoop(w, h);
  for (let k = 0; k < 80; k++) loopStep(F, flat, { g: 0.6, rot: 0, zoom: 1, inW: 0.5, shift: false });
  check('拡大・回転なし、g = 0.6、入力 100：行きつく先 = 50 ÷ (1 − 0.6) = 125（誤差 < 0.01）', F.a.every((v) => near(v, 125, 0.01)));
  let uni = new Float32Array(32 * 3); for (let i = 0; i < 32; i++) uni[3 * i] = uni[3 * i + 1] = uni[3 * i + 2] = i * 8 + 4;
  check('エントロピー：一色 = 0 ビット、32 区間に 1 つずつ = 5 ビット', near(lumEntropy(new Float32Array(30).fill(77)), 0) && near(lumEntropy(uni), 5, 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で g を 0.5 → 0.95 → 1.05 と変えよう。模様の「寿命」はどう変わる？ 1 を超えると？
// 2. ←→ で回転を変えると、らせんの腕の数や巻き方が変わる。1 2 で拡大と組み合わせよう
// 3. C で色ずらしを切ると、色はどうなる？ ON だと 1 周ごとに R ← G ← B と色が回る
// 4. 手をゆっくり動かすと、残像が「時間の地層」になる。S で保存しよう
// 5. 本物のビデオカメラとモニターでもできる（1960 年代のビデオアートの技法）。ここで作った式との共通点は？


// ==================================================
// ここから下は「サイバネティクスの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
function fin(v, d) { return Number.isFinite(v) ? v : d; }        // NaN・Infinity なら d にもどす
// 決まった種（seed）から毎回同じ乱数列（0〜1）を出す。自己テストをいつも同じにするため
function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- 画面の道具（色は [色相, 彩度, 明るさ] の配列）
const C_TXT = [40, 12, 96], C_SUB = [35, 18, 72], C_SCOPE = [135, 70, 92], C_TUBE = [24, 85, 100], C_BRASS = [42, 55, 88], C_ALARM = [0, 80, 100];
function col(c, a) { return color(c[0], c[1], c[2], a === undefined ? 100 : a); }
function say(s, x, y, size, c) { noStroke(); fill(col(c || C_TXT)); textSize(size || 15); text(s, x, y); }
// オシロスコープ風の枠
function plotFrame(x, y, w, h, title) {
  noStroke(); fill(130, 40, 6, 90); rect(x, y, w, h, 6);
  stroke(130, 40, 40, 40); strokeWeight(1);
  for (let k = 1; k < 4; k++) line(x, y + (h * k) / 4, x + w, y + (h * k) / 4);
  noFill(); stroke(C_BRASS[0], C_BRASS[1], 60); rect(x, y, w, h, 6);
  if (title) say(title, x + 8, y + 18, 13, C_SUB);
}
// arr の値を lo〜hi の範囲で、枠 (x, y, w, h) に折れ線で描く（n = 横に並べる点の数）
function plotLine(arr, x, y, w, h, lo, hi, c, n, wt) {
  if (!arr || arr.length < 2) return;
  n = n || arr.length;
  stroke(col(c)); strokeWeight(wt || 2); noFill();
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / (n - 1)) * w, y + h - clampv((fin(arr[i], lo) - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
function hLine(v, x, y, w, h, lo, hi, c) {   // グラフの中の水平線（目標値など）
  let yy = y + h - clampv((v - lo) / (hi - lo), 0, 1) * h;
  stroke(col(c, 70)); strokeWeight(1); drawingContext.setLineDash([6, 5]); line(x, yy, x + w, yy); drawingContext.setLineDash([]);
}
// ブロック図の箱（名前と今の値）
function blockBox(x, y, w, h, name, val, c) {
  stroke(col(c || C_BRASS)); strokeWeight(2); fill(25, 40, 16); rect(x, y, w, h, 8);
  noStroke(); fill(col(C_TXT)); textAlign(CENTER, CENTER); textSize(15); text(name, x + w / 2, y + h / 2 - (val === undefined ? 0 : 10));
  if (val !== undefined) { fill(col(c || C_TUBE)); textSize(14); text(val, x + w / 2, y + h / 2 + 12); }
  textAlign(LEFT, BASELINE);
}
// 信号の矢印：点が流れて「ループを回る」ようすを見せる（phase = 0〜1）
function flowArrow(x1, y1, x2, y2, c, phase, label) {
  stroke(col(c)); strokeWeight(2); line(x1, y1, x2, y2);
  let a = Math.atan2(y2 - y1, x2 - x1);
  noStroke(); fill(col(c)); triangle(x2, y2, x2 - 11 * Math.cos(a - 0.4), y2 - 11 * Math.sin(a - 0.4), x2 - 11 * Math.cos(a + 0.4), y2 - 11 * Math.sin(a + 0.4));
  for (let k = 0; k < 3; k++) { let f = (phase + k / 3) % 1; circle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 6); }
  if (label) { fill(col(C_SUB)); textSize(13); text(label, (x1 + x2) / 2 + 6, (y1 + y2) / 2 - 6); }
}

// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return Number.isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest() { say(selfTestLine(), 20, height - 16, 14, selfTestResults.every((r) => r.ok) ? C_SCOPE : C_ALARM); }
