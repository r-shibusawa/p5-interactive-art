// ============================================
// 06 黄金比と非周期性
// ペンローズ・タイルの枚数の比は黄金比 φ に近づく。φ は無理数だから、模様は決してくり返さない
//   1 次元版 = フィボナッチ語（L → LS、S → L）。格子を「無理数の傾き」で切ると同じ並びが出てくる
//   くり返さないのに「秩序」がある証拠 = 回折像（光を当てた時の模様）にくっきりした点が 10 回対称に並ぶ
// ↑↓ = フィボナッチ語の世代 / ドラッグ左右 = 切る傾き（P で 1/φ に戻す）/ 1・2・3 = 回折：ペンローズ・正方格子・ランダム
// ============================================

let gen = 7;            // ★ フィボナッチ語の世代
let slope = 1 / ((1 + Math.sqrt(5)) / 2);   // ★ 格子を切る直線の傾き（1/φ）
let source = 1;         // 回折に使う点：1 = ペンローズ、2 = 正方格子、3 = ランダム
let diffImg;
const PHI = (1 + Math.sqrt(5)) / 2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  computeDiffraction();
}

function draw() {
  background(16, 18, 26);
  let w = width / 3;
  drawCounts(20, 110, w - 40, height - 200);
  drawCutProject(w + 10, 110, w - 20, height - 200);
  drawDiffraction(2 * w + 10, 110, w - 30);

  noStroke();
  fill(255);
  textSize(20);
  text('黄金比と非周期性 ─ くり返さないのに秩序がある', 20, 38);
  textSize(15);
  fill(190);
  text('左：分割するたびの枚数と比　中：格子を傾き ' + nf(slope, 1, 4) + ' で切る（ドラッグ左右 / P で 1/φ）　右：回折像（1・2・3）', 20, 66);
}

// ---- 左：太い / 細いひし形（の半分の三角形）の枚数 ----
function drawCounts(x, y, w, h) {
  let thin = 1, thick = 0, rows = [];
  for (let n = 0; n <= 12; n++) {
    rows.push([thin, thick]);
    // ★ 分割のルール：細い → 細い 1 + 太い 1、太い → 細い 1 + 太い 2
    [thin, thick] = [thin + thick, thin + 2 * thick];
  }
  textSize(14);
  for (let n = 0; n < rows.length; n++) {
    let [a, b] = rows[n];
    let yy = y + n * 26;
    fill(150);
    noStroke();
    text(n, x, yy + 12);
    let tot = a + b;
    fill(250, 190, 80);
    rect(x + 24, yy, ((w - 140) * a) / tot, 16);
    fill(70, 130, 210);
    rect(x + 24 + ((w - 140) * a) / tot, yy, ((w - 140) * b) / tot, 16);
    fill(220);
    text(a > 0 ? nf(b / a, 1, 5) : '—', x + w - 100, yy + 12);
  }
  fill(255);
  text('回数　細い（黄）と太い（青）の割合　太 ÷ 細', x, y - 10);
  fill(255, 220, 120);
  text('→ φ = ' + nf(PHI, 1, 5) + '…（無理数）', x, y + rows.length * 26 + 20);
  fill(170);
  text('比が無理数 → 同じ模様を何枚かずつ\n並べただけ（周期的）では作れない', x, y + rows.length * 26 + 46);
}

// ---- 中：切断と射影（cut and project）とフィボナッチ語 ----
function drawCutProject(x, y, w, h) {
  let cs = 26, ox = x + 20, oy = y + h * 0.55;
  let c = 1 / Math.sqrt(1 + slope * slope), s = slope * c;
  let win = c + s;                          // ★ 帯の幅 = 単位正方形の影の長さ
  let pts = [];
  for (let i = 0; i < 60; i++) for (let j = -3; j < 70; j++) {
    let perp = -i * s + j * c;              // 直線からの（符号つき）距離
    let inside = perp >= -1e-9 && perp < win - 1e-9;
    if (inside) pts.push(i * c + j * s);    // 直線上に写した位置
    let px = ox + i * cs, py = oy - j * cs;
    if (px > x + w || py < y || py > y + h - 120) continue;
    noStroke();
    fill(inside ? color(255, 220, 120) : color(70, 74, 90));
    circle(px, py, inside ? 8 : 4);
  }
  // 帯（2 本の平行線）
  stroke(120, 200, 255, 140);
  strokeWeight(1.5);
  let L = Math.min(w - 30, (oy - y) / Math.max(slope, 0.01));
  line(ox, oy, ox + L, oy - L * slope);
  line(ox, oy - (win / c) * cs, ox + L, oy - L * slope - (win / c) * cs);
  // 写した点の間隔：長い L と短い S の 2 種類だけ
  pts.sort((a, b) => a - b);
  let word = '';
  let big = Math.max(c, s), small = Math.min(c, s);
  for (let k = 1; k < pts.length && word.length < 34; k++) {
    let d = pts[k] - pts[k - 1];
    word += Math.abs(d - big) < Math.abs(d - small) ? 'L' : 'S';
  }
  noStroke();
  fill(255);
  textSize(14);
  text('黄色 = 帯に入った格子点 → 直線に写すと間隔は 2 種類（L・S）', x, y - 10);
  text('切って得た並び：' + word, x, y + h - 58);
  text('フィボナッチ語：' + fibWord(gen).slice(0, 34), x, y + h - 34);
  fill(170);
  text('世代 ' + gen + '（↑↓）　長さ ' + fibWord(gen).length + '　L の数 ÷ S の数 = ' + nf(countOf(fibWord(gen), 'L') / Math.max(1, countOf(fibWord(gen), 'S')), 1, 4), x, y + h - 10);
  drawWordStrip(fibWord(gen), x, y + h - 100, w);
}

function drawWordStrip(wd, x, y, w) {
  let total = 0;
  for (let ch of wd) total += ch === 'L' ? PHI : 1;
  let k = Math.min(1, w / (total * 14)) * 14;
  let px = x;
  for (let ch of wd) {
    let len = (ch === 'L' ? PHI : 1) * k;
    if (px + len > x + w) break;
    fill(ch === 'L' ? [250, 190, 80] : [70, 130, 210]);
    noStroke();
    rect(px, y, len - 1, 18);
    px += len;
  }
}

// ★ フィボナッチ語：L → LS、S → L をくり返す
function fibWord(g) {
  let wd = 'L';
  for (let i = 0; i < g; i++) {
    let nw = '';
    for (let ch of wd) nw += ch === 'L' ? 'LS' : 'L';
    wd = nw;
  }
  return wd;
}
function countOf(s, ch) { let n = 0; for (let c of s) if (c === ch) n++; return n; }

// ---- 右：回折像 ----
function drawDiffraction(x, y, w) {
  image(diffImg, x, y, w, w);
  noFill();
  stroke(80);
  rect(x, y, w, w);
  noStroke();
  fill(255);
  textSize(14);
  text(['', 'ペンローズの頂点', '正方格子', 'ランダムな点'][source] + ' の回折像（1・2・3）', x, y - 10);
  fill(170);
  let msg = ['', 'くっきりした点が 10 回対称 → 秩序がある\nでも 10 回対称は周期的な結晶では不可能（準結晶）', '点が正方形の格子状 → 周期的な結晶', 'ぼんやりした霧だけ → 秩序がない'][source];
  text(msg, x, y + w + 24);
}

// 点の集まりに光を当てた時の明るさ |Σ exp(i k·x)|²（重い計算なので 1 回だけ）
function computeDiffraction() {
  let P = [];
  if (source === 1) P = penroseVertices(6, 9);
  else if (source === 2) { for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) if (i * i + j * j < 81) P.push([i, j]); }
  else { randomSeed(3); for (let i = 0; i < 300; i++) { let r = 9 * Math.sqrt(random()), a = random(TWO_PI); P.push([r * Math.cos(a), r * Math.sin(a)]); } }
  let N = 96, kmax = 13;   // ★ 解像度と k の範囲
  diffImg = createImage(N, N);
  diffImg.loadPixels();
  let vals = [], mx = 0;
  let wgt = P.map((p) => Math.exp(-(p[0] * p[0] + p[1] * p[1]) / 40));   // 端をぼかして、にじみを減らす
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
    let kx = ((a / (N - 1)) * 2 - 1) * kmax, ky = ((b / (N - 1)) * 2 - 1) * kmax;
    let re = 0, im = 0;
    for (let q = 0; q < P.length; q++) {
      let ph = kx * P[q][0] + ky * P[q][1];
      re += wgt[q] * Math.cos(ph);
      im += wgt[q] * Math.sin(ph);
    }
    let v = re * re + im * im;
    vals.push(v);
    if (v > mx) mx = v;
  }
  for (let i = 0; i < vals.length; i++) {
    let a = Math.floor(i / N), b = i % N;
    let br = Math.pow(vals[i] / mx, 0.35) * 255;
    let idx = 4 * (b * N + a);
    diffImg.pixels[idx] = br;
    diffImg.pixels[idx + 1] = br * 0.9;
    diffImg.pixels[idx + 2] = Math.min(255, br * 0.6 + 40);
    diffImg.pixels[idx + 3] = 255;
  }
  diffImg.updatePixels();
}

function keyPressed() {
  if (key === UP_ARROW) gen = Math.min(14, gen + 1);
  if (key === DOWN_ARROW) gen = Math.max(1, gen - 1);
  if (key >= '1' && key <= '3') { source = int(key); computeDiffraction(); }
  if (key === 'p' || key === 'P') slope = 1 / PHI;
  if (key === 's' || key === 'S') saveCanvas('golden', 'png');
}
function mouseDragged() { slope = map(mouseX, 0, width, 0.2, 1.2, true); }
function mousePressed() { mouseDragged(); }

// ---------- やってみよう ----------
// 1. ドラッグで傾きを 0.5（= 1/2）や 0.6（= 3/5）に近づけると、切った並びがくり返しになる。1/φ では？
// 2. フィボナッチ語の長さは 1, 2, 3, 5, 8, 13, … 。L ÷ S が φ に近づくのを確かめよう
// 3. 回折像 1 と 2 を比べよう。10 回対称の点の並びは、1984 年に本物の合金（準結晶）で見つかった
// 4. 左の表の数を足し算でたどると、フィボナッチ数列が隠れている。見つけよう


// ==================================================
// ここから下は「ペンローズの道具」（05 と同じ分割で頂点を作る）
// ==================================================
function penroseVertices(lv, radius) {
  let R = Math.pow(PHI, lv), tr = [];
  for (let i = 0; i < 10; i++) {
    let b = [R * Math.cos(((2 * i - 1) * Math.PI) / 10), R * Math.sin(((2 * i - 1) * Math.PI) / 10)];
    let c = [R * Math.cos(((2 * i + 1) * Math.PI) / 10), R * Math.sin(((2 * i + 1) * Math.PI) / 10)];
    if (i % 2 === 0) [b, c] = [c, b];
    tr.push([0, [0, 0], b, c]);
  }
  let L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let k = 0; k < lv; k++) {
    let out = [];
    for (let [c, A, B, C] of tr) {
      if (c === 0) { let P = L2(A, B, 1 / PHI); out.push([0, C, P, B], [1, P, C, A]); }
      else { let Q = L2(B, A, 1 / PHI), Rr = L2(B, C, 1 / PHI); out.push([1, Rr, C, A], [1, Q, Rr, B], [0, Rr, Q, A]); }
    }
    tr = out;
  }
  let seen = new Map();
  for (let t of tr) for (let v of [t[1], t[2], t[3]]) {
    if (v[0] * v[0] + v[1] * v[1] > radius * radius) continue;
    seen.set(Math.round(v[0] * 1000) + ',' + Math.round(v[1] * 1000), v);
  }
  return [...seen.values()];
}
