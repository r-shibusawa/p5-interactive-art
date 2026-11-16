// ============================================
// 02 ホタルの同期 ─ パルス結合振動子（ミロロ–ストロガッツ型）
// ホタルは自分のリズムで光る。近くの仲間が光るのを見ると、自分の「光りたさ」x が ε だけ押し上げられ、早めに光る
// x = f(位相) は上に凸のカーブ。これだけで、バラバラだった光がだんだんそろう。秩序変数 r = |平均 e^{2πiφ}|
// ↑↓ = 結合の強さ ε / ←→ = 見える距離 / A = 全員が見える ⇄ 近くだけ / クリック = ランタンを光らせる / R = 位相をバラバラに
// ============================================

let N = 300;                // ★ ホタルの数
let period = 1.0;           // ★ 光る周期（秒）
let jitter = 0.0;           // ★ 周期のばらつき（0 = 全員同じ、0.05 = ±5%）
let curveB = 3.0;           // ★ x = f(φ) の曲がり具合（0 に近いと直線 → そろいにくい）
let eps = 0.08;             // 結合の強さ ε
let seeR = 160;             // 見える距離（px）
let allToAll = false;
let ff = [];                // {x, y, ph, T, glow}
let nbr = [];               // 見える仲間のリスト
let rHist = [], raster;      // ラスター図（横 = 時間、縦 = ホタル）
let flashesThisFrame = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  raster = createGraphics(360, 150);
  raster.pixelDensity(1); raster.background(0);
  for (let i = 0; i < N; i++) ff.push({ x: random(40, width * 0.62), y: random(110, height - 40), ph: Math.random(), T: period * (1 + jitter * (Math.random() * 2 - 1)), glow: 0 });
  buildNeighbours();
}

function buildNeighbours() {
  nbr = [];
  for (let i = 0; i < N; i++) {
    let l = [];
    for (let j = 0; j < N; j++) if (j !== i && (allToAll || Math.hypot(ff[i].x - ff[j].x, ff[i].y - ff[j].y) < seeR)) l.push(j);
    nbr.push(l);
  }
}

// ★ 光りたさ x と 位相 φ の関係（上に凸）と、その逆関数
function fX(ph) { return Math.log(1 + (Math.exp(curveB) - 1) * ph) / curveB; }
function fInv(x) { return (Math.exp(curveB * x) - 1) / (Math.exp(curveB) - 1); }

function draw() {
  background(250, 50, 7);
  let dt = 1 / 60;
  // ---- 1) 全員の位相を進める
  let fired = [];
  for (let i = 0; i < N; i++) {
    ff[i].ph += dt / ff[i].T;
    if (ff[i].ph >= 1) fired.push(i);
  }
  // ---- 2) 光ったホタルが仲間を押す。押されて 1 を超えた仲間もその場で光る（連鎖）
  let done = new Uint8Array(N);
  while (fired.length > 0) {
    let i = fired.pop();
    if (done[i]) continue;
    done[i] = 1; ff[i].ph = 0; ff[i].glow = 1;
    let push1 = eps / Math.max(1, Math.sqrt(nbr[i].length) / 3);   // 仲間が多いと 1 匹あたりの押す量を少し弱める
    for (let j of nbr[i]) {
      if (done[j]) continue;
      let x = fX(ff[j].ph) + push1;
      if (x >= 1) fired.push(j); else ff[j].ph = fInv(x);
    }
  }
  flashesThisFrame = 0;
  for (let i = 0; i < N; i++) if (done[i]) flashesThisFrame++;
  // ---- 3) 秩序変数 r
  let sx = 0, sy = 0;
  for (let f of ff) { sx += Math.cos(f.ph * Math.PI * 2); sy += Math.sin(f.ph * Math.PI * 2); }
  let r = Math.hypot(sx, sy) / N;
  rHist.push(r); if (rHist.length > 300) rHist.shift();

  // ---- ホタルを描く（光った直後ほど大きく明るい）
  noStroke();
  for (let f of ff) {
    if (f.glow > 0.05) { fill(65, 80, 100, f.glow * 30); circle(f.x, f.y, 10 + 30 * f.glow); }
    fill(65, 60 + 40 * f.glow, 25 + 75 * f.glow); circle(f.x, f.y, 4 + 3 * f.glow);
    f.glow *= 0.86;
  }
  if (!allToAll && mouseX < width * 0.65) { noFill(); stroke(0, 0, 100, 25); circle(mouseX, mouseY, seeR * 2); }

  // ---- ラスター図：1 列 = 1 フレーム、光ったホタルに点
  let col = frameCount % 360;                          // 書きこむ列（ぐるっと回して使う）
  raster.noStroke(); raster.fill(0); raster.rect(col, 0, 1, 150);
  raster.fill(255, 240, 120);
  for (let i = 0; i < N; i++) if (done[i]) raster.rect(col, Math.floor((i / N) * 150), 1, 1);
  let gx = width * 0.66, gw = width - gx - 30, a = 359 - col;   // 古い部分 → 新しい部分の順に 2 つに分けて貼る
  if (a > 0) image(raster, gx, 300, (gw * a) / 360, 150, col + 1, 0, a, 150);
  image(raster, gx + (gw * a) / 360, 300, (gw * (col + 1)) / 360, 150, 0, 0, col + 1, 150);
  noStroke(); fill(0, 0, 85); textSize(14); text('光った時刻（横 = 時間、縦 = ホタルの番号）', gx, 292);
  drawPlot(rHist, gx, 120, gw, 110, 0, 1, color(60, 80, 100), 'そろい具合 r = ' + nf(r, 1, 3));
  // 光りたさのカーブ
  let cx = gx, cy = 500, cw = 170, ch = 120;
  stroke(0, 0, 40); strokeWeight(1); noFill(); rect(cx, cy, cw, ch);
  stroke(30, 80, 100); strokeWeight(2);
  beginShape(); for (let k = 0; k <= 40; k++) vertex(cx + (k / 40) * cw, cy + ch - fX(k / 40) * ch); endShape();
  noStroke(); fill(0, 0, 80); textSize(12);
  text('x = f(φ)', cx + 6, cy + 16); text('位相 φ →', cx + cw - 56, cy + ch + 16);
  text('押されると x が ε 上がる →\n上に凸なので、位相が進んだ\nホタルほど大きく前に進む', cx + cw + 14, cy + 30);

  fill(0, 0, 100); textSize(18);
  text('↑↓：結合 ε = ' + nf(eps, 1, 3) + '　←→：見える距離 ' + (allToAll ? '全員' : seeR + ' px') + '　A：全員が見える ' + (allToAll ? 'ON' : 'off') + '　クリック：ランタン　R：バラバラに', 20, 36);
  fill(0, 0, 70); textSize(14);
  text('いま光った数 ' + flashesThisFrame + ' / ' + N + '。r が 1 に近いほど、みんな同時に光っている', 20, 60);
}

function mousePressed() {
  // ランタン：クリックした場所の近くのホタルを ε × 3 押す
  for (let f of ff) if (Math.hypot(f.x - mouseX, f.y - mouseY) < seeR) { let x = fX(f.ph) + eps * 3; f.ph = x >= 1 ? 0.999 : fInv(x); }
}
function keyPressed() {
  if (key === UP_ARROW) eps = Math.min(eps + 0.01, 0.4);
  if (key === DOWN_ARROW) eps = Math.max(eps - 0.01, 0);
  if (key === RIGHT_ARROW) { seeR = Math.min(seeR + 20, 600); buildNeighbours(); }
  if (key === LEFT_ARROW) { seeR = Math.max(seeR - 20, 40); buildNeighbours(); }
  if (key === 'a' || key === 'A') { allToAll = !allToAll; buildNeighbours(); }
  if (key === 'r' || key === 'R') for (let f of ff) f.ph = Math.random();
}

// ---------- やってみよう ----------
// 1. ε = 0 にすると r はずっと低いまま。ε = 0.05、0.1、0.2 で r が 0.9 を超えるまでの時間を比べよう
// 2. ←で見える距離を短くすると、場所ごとに別々のリズムの「波」ができる。ラスター図の斜めの線が波
// 3. curveB を 0.01（ほぼ直線）にすると、押されても前後のずれが縮まらない。上に凸であることが同期の秘密
// 4. jitter を 0.05 にして周期をばらつかせる。それでもそろう ε はいくつ？
// 5. クリックでランタンを光らせ続けると、ホタルはランタンのリズムに引き込まれる？

// ==================================================
// ここから下は「グラフの道具」です
// ==================================================
function drawPlot(arr, x, y, w, h, lo, hi, c, title) {
  noStroke(); fill(0, 0, 0, 35); rect(x, y, w, h);
  fill(0, 0, 85); textSize(14); text(title, x, y - 8);
  if (arr.length < 2) return;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / 299) * w, y + h - constrain((arr[i] - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
