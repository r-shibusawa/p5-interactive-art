// ============================================
// 15 カメラ映像で数える（おまけ）
// 映像を粗いセルに分け、明るいセルが k 個あれば「そこから r 個選ぶ組合せ」は C(k, r) 通り
// 各行の明るいセルの数を並べて大きい順にすると「k の分割」（ヤング図形）になる
// マウス左右 = 明るさのしきい値 / ↑↓ = 選ぶ数 r / N = ノイズ画像に切り替え（カメラの許可が必要。使えないときは自動でノイズ）
// ============================================

let cap;
let cols = 16, rows = 12;        // ★ セルの数
let vw = 64, vh = 48;            // カメラ画像の大きさ（4×4 画素で 1 セル）
let bright = [];                 // 各セルの明るさ 0〜255
let thr = 128;
let r = 3;                       // ★ 選ぶ数
let useNoise = false;
let camWaited = 0;
let blink = [];                  // いま光らせている組合せ（セル番号）
let blinkTimer = 0;
let lastK = -1, bigC = 0n;       // C(k, r) は BigInt で

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  try { cap = createCapture(VIDEO, { flipped: true }); cap.size(vw, vh); cap.hide(); } catch (e) { useNoise = true; }
  bright = new Array(cols * rows).fill(0);
}

// ★ セルの明るさを読む（カメラ or ノイズ）
function readCells() {
  if (!useNoise && cap && cap.width > 0) {
    cap.loadPixels();
    if (cap.pixels.length < vw * vh * 4) return;
    let bw = vw / cols, bh = vh / rows;
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      let s = 0, c = 0;
      for (let y = cy * bh; y < (cy + 1) * bh; y++) for (let x = cx * bw; x < (cx + 1) * bw; x++) {
        let i = (Math.floor(x) + Math.floor(y) * vw) * 4;
        s += (cap.pixels[i] + cap.pixels[i + 1] + cap.pixels[i + 2]) / 3; c++;
      }
      bright[cx + cy * cols] = s / c;
    }
  } else {
    let t = millis() * 0.0004;
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) bright[cx + cy * cols] = noise(cx * 0.25, cy * 0.25, t) * 255;
  }
}

// ★ BigInt の二項係数（大きな数も正確に）
function chooseBig(a, b) {
  if (b < 0 || b > a) return 0n;
  let res = 1n;
  for (let i = 0; i < b; i++) res = (res * BigInt(a - i)) / BigInt(i + 1);
  return res;
}
function fmtBig(v) {
  let s = v.toString();
  if (s.length <= 12) return Number(v).toLocaleString();
  return s[0] + '.' + s.slice(1, 4) + ' × 10^' + (s.length - 1) + '（' + s.length + ' 桁）';
}

function draw() {
  background(228, 28, 10);
  if (!useNoise && !(cap && cap.width > 0)) { camWaited += deltaTime; if (camWaited > 4000) useNoise = true; }
  thr = map(mouseX, 0, width, 60, 220, true);
  readCells();

  // セルを描く
  let cs = Math.min((width * 0.55) / cols, (height - 200) / rows);
  let ox = 30, oy = 110;
  let onCells = [], rowCounts = new Array(rows).fill(0);
  noStroke();
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    let i = cx + cy * cols, b = bright[i], on = b > thr;
    if (on) { onCells.push(i); rowCounts[cy]++; }
    fill(on ? 50 : 220, on ? 80 : 20, on ? 60 + (b / 255) * 40 : 15 + (b / 255) * 25);
    rect(ox + cx * cs, oy + cy * cs, cs - 2, cs - 2, 3);
  }
  let k = onCells.length;
  if (k !== lastK) { lastK = k; bigC = chooseBig(k, r); }

  // ランダムな r 個の組合せを点滅
  blinkTimer += deltaTime / 1000;
  if (blinkTimer > 0.25) { blinkTimer = 0; blink = pickSubset(onCells, r); }
  for (let i of blink) {
    let cx = i % cols, cy = Math.floor(i / cols);
    noFill(); stroke(330, 80, 100); strokeWeight(3);
    rect(ox + cx * cs + 1, oy + cy * cs + 1, cs - 4, cs - 4, 3);
  }
  noStroke();

  // 右：数
  let px = width * 0.62, py = 130;
  fill(0, 0, 100); textSize(16);
  text('セル ' + cols * rows + ' 個のうち明るいセル k = ' + k, px, py);
  text('しきい値 ' + Math.round(thr) + '（マウス左右）', px, py + 22);
  textSize(30); fill(50, 80, 100);
  text('C(' + k + ', ' + r + ') = ' + fmtBig(bigC), px, py + 66);
  textSize(14); fill(0, 0, 70);
  text('明るいセルから r = ' + r + ' 個（↑↓）選ぶ組合せの数。', px, py + 94);
  text('ピンクの枠はそのうちの 1 つ（ランダムに点滅）', px, py + 114);
  let all = chooseBig(cols * rows, k);
  text('「' + cols * rows + ' セルのうち明るい ' + k + ' 個」の配置は', px, py + 144);
  text('C(' + cols * rows + ',' + k + ') = ' + fmtBig(all) + ' 通り', px, py + 164);
  text('全部の明るさパターンは 2^' + cols * rows + ' ≈ 10^' + Math.round(cols * rows * Math.log10(2)) + ' 通り', px, py + 184);

  // 分割：各行の明るいセル数 → 降順 → ヤング図形
  let lam = rowCounts.filter((v) => v > 0).sort((p, q) => q - p);
  fill(0, 0, 100); textSize(15);
  text('各行の明るいセル数を大きい順に ＝ ' + k + ' の分割', px, py + 226);
  fill(0, 0, 80); textSize(14);
  text(lam.length ? '(' + lam.join(', ') + ')' : '（なし）', px, py + 248);
  let ys = Math.min(14, (height - py - 300) / Math.max(1, lam.length));
  for (let i = 0; i < lam.length; i++) for (let j = 0; j < lam[i]; j++) {
    fill((i * 30 + 180) % 360, 55, 95);
    rect(px + j * ys, py + 262 + i * ys, ys - 2, ys - 2, 2);
  }
  fill(0, 0, 60); textSize(13);
  text('ヤング図形（09）。しきい値を下げると行が長くなる', px + 250, py + 276);

  fill(0, 0, 100); textSize(18);
  text((useNoise ? 'ノイズ画像' : 'カメラ') + '（N で切り替え）　明るいセル k = ' + k + '　r = ' + r + '（↑↓）', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('手や顔を動かすと k が変わり、組合せの数が爆発的に増減する。「選ぶ」はカメラの前でも数えられる', 20, 68);
}

// 配列から r 個をランダムに選ぶ（部分 Fisher–Yates）
function pickSubset(arr, cnt) {
  let a = arr.slice(), out = [];
  for (let i = 0; i < Math.min(cnt, a.length); i++) { let j = i + Math.floor(Math.random() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; out.push(a[i]); }
  return out;
}

function keyPressed() {
  if (key === UP_ARROW && r < 20) r++;
  if (key === DOWN_ARROW && r > 1) r--;
  if (key === 'n' || key === 'N') useNoise = !useNoise;
  lastK = -1;
}

// ---------- やってみよう ----------
// 1. r = k/2 のとき C(k, r) は最大。r を動かして C(k,r) が左右対称に増減するのを見よう（01 とつなぐ）
// 2. cols, rows を 32×24 にすると C(768, k) は何桁になる？ BigInt なら正確に出る
// 3. 「明るいセルが隣り合うペア」の数を数えてみよう（グラフの辺の数。10 のラムゼーとつなぐ）
// 4. 点滅する組合せを「ヤング図形の形」や「格子路（02）」に置きかえて、映像から別の数え方を作ろう
