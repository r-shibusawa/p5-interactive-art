// ============================================
// 09 アリの仕分け（Deneubourg のモデル）
// 2 色（または 3 色）の卵がばらまかれている。アリは「まわりに同じ色が少ない卵は拾いやすく、同じ色が多い所には置きやすい」だけ
// 拾う確率 = (k1 / (k1 + f))²、置く確率 = (f / (k2 + f))²、f = まわり 5×5 にある「同じ色」の割合。色ごとの塊に分かれていく
// 1 = 2 色 / 2 = 3 色 / ↑↓ = 速さ / ←→ = k1（拾いやすさ）/ R = やり直し / スペース = 一時停止
// ============================================

let GW = 120, GH = 72;            // ★ 格子の大きさ
let nAnts = 120;                  // ★ アリの数
let nItems = 1600;                // ★ 卵の数
let nColors = 2;
let k1 = 0.1, k2 = 0.3;           // ★ 拾う・置くの感度
let movesPerFrame = 40;           // アリ 1 匹が 1 フレームに歩く歩数
let cells, ants = [], paused = false;
let buf, sameHist = [], sameNow = 0;
const PAL = [[255, 120, 80], [90, 180, 255], [250, 230, 90]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buf = createGraphics(GW, GH); buf.pixelDensity(1);
  resetWorld();
}

function resetWorld() {
  cells = new Int8Array(GW * GH).fill(-1);           // -1 = 空、0〜2 = 卵の色
  let placed = 0;
  while (placed < nItems) { let i = Math.floor(Math.random() * GW * GH); if (cells[i] < 0) { cells[i] = placed % nColors; placed++; } }
  ants = [];
  for (let i = 0; i < nAnts; i++) ants.push({ x: Math.floor(Math.random() * GW), y: Math.floor(Math.random() * GH), load: -1 });
  sameHist = []; sameNow = measureSame();
}
function idx(x, y) { return ((y + GH) % GH) * GW + ((x + GW) % GW); }

// f = まわり 5×5（自分以外の 24 マス）にある色 c の卵の割合
function fraction(x, y, c) {
  let n = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && cells[idx(x + dx, y + dy)] === c) n++;
  return n / 24;
}

// ★ アリ 1 匹の 1 歩：歩く → 拾う or 置く
function antMove(a) {
  a.x = (a.x + Math.floor(Math.random() * 3) - 1 + GW) % GW;
  a.y = (a.y + Math.floor(Math.random() * 3) - 1 + GH) % GH;
  let i = idx(a.x, a.y);
  if (a.load < 0 && cells[i] >= 0) {
    let f = fraction(a.x, a.y, cells[i]);
    if (Math.random() < Math.pow(k1 / (k1 + f), 2)) { a.load = cells[i]; cells[i] = -1; }
  } else if (a.load >= 0 && cells[i] < 0) {
    let f = fraction(a.x, a.y, a.load);
    if (Math.random() < Math.pow(f / (k2 + f), 2)) { cells[i] = a.load; a.load = -1; }
  }
}

// 仕分けの度合い：卵ごとに「となり 8 マスの卵のうち同じ色の割合」を平均
function measureSame() {
  let sum = 0, cnt = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    let c = cells[y * GW + x]; if (c < 0) continue;
    let same = 0, all = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      let d = cells[idx(x + dx, y + dy)];
      if (d >= 0) { all++; if (d === c) same++; }
    }
    if (all > 0) { sum += same / all; cnt++; }
  }
  return cnt ? sum / cnt : 0;
}

function draw() {
  background(25, 25, 11);
  if (!paused) for (let s = 0; s < movesPerFrame; s++) for (let a of ants) antMove(a);
  if (frameCount % 10 === 0) { sameNow = measureSame(); sameHist.push(sameNow); if (sameHist.length > 300) sameHist.shift(); }
  // ---- 格子を画像にする
  buf.loadPixels();
  for (let i = 0; i < GW * GH; i++) {
    let c = cells[i], p = c >= 0 ? PAL[c] : [38, 30, 26];
    buf.pixels[i * 4] = p[0]; buf.pixels[i * 4 + 1] = p[1]; buf.pixels[i * 4 + 2] = p[2]; buf.pixels[i * 4 + 3] = 255;
  }
  for (let a of ants) { let i = a.y * GW + a.x; buf.pixels[i * 4] = 255; buf.pixels[i * 4 + 1] = 255; buf.pixels[i * 4 + 2] = 255; }
  buf.updatePixels();
  let w = Math.min(width * 0.68, ((height - 110) * GW) / GH), h = (w * GH) / GW;
  noSmooth(); image(buf, 20, 85, w, h); smooth();

  // ---- 右：数字とグラフ
  let gx = 20 + w + 30, gw = width - gx - 25, carried = ants.filter((a) => a.load >= 0).length;
  drawPlot(sameHist, gx, 120, gw, 120, 1 / nColors - 0.05, 1, color(30, 80, 100), '近傍の同種率 = ' + nf(sameNow * 100, 1, 1) + ' %');
  noStroke(); fill(0, 0, 70); textSize(12);
  text('ランダムなら約 ' + nf(100 / nColors, 1, 0) + ' %（' + nColors + ' 色）', gx, 258);
  fill(0, 0, 85); textSize(14);
  text('卵 ' + nItems + ' 個（' + nColors + ' 色）、アリ ' + nAnts + ' 匹', gx, 300);
  text('運び中：' + carried + ' 匹（白 = アリ）', gx, 324);
  fill(0, 0, 65);
  text('拾う確率 = (k1 / (k1 + f))²', gx, 362);
  text('置く確率 = (f / (k2 + f))²', gx, 386);
  text('f = まわり 5×5 の「同じ色」の割合', gx, 410);
  text('k1 = ' + nf(k1, 1, 2) + '、k2 = ' + nf(k2, 1, 2), gx, 434);
  // 拾う・置く確率のグラフ
  let cx = gx, cy = 470, cw = Math.min(gw, 260), ch = 110;
  stroke(0, 0, 40); strokeWeight(1); noFill(); rect(cx, cy, cw, ch);
  stroke(20, 80, 100); strokeWeight(2); beginShape(); for (let k = 0; k <= 40; k++) { let f = k / 40; vertex(cx + f * cw, cy + ch - Math.pow(k1 / (k1 + f), 2) * ch); } endShape();
  stroke(200, 70, 100); beginShape(); for (let k = 0; k <= 40; k++) { let f = k / 40; vertex(cx + f * cw, cy + ch - Math.pow(f / (k2 + f), 2) * ch); } endShape();
  noStroke(); fill(20, 80, 100); text('拾う', cx + 6, cy + 18); fill(200, 70, 100); text('置く', cx + cw - 36, cy + 30);
  fill(0, 0, 60); textSize(12); text('f →', cx + cw - 22, cy + ch + 14);

  fill(0, 0, 100); textSize(18);
  text('1：2 色　2：3 色　↑↓：速さ（' + movesPerFrame + ' 歩 / フレーム）　←→：k1 = ' + nf(k1, 1, 2) + '　R：やり直し　スペース：' + (paused ? '停止中' : '実行中'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text('アリは色を「仕分けよう」とは思っていない。拾う・置くの 2 つの確率だけで、同じ色の塊ができていく', 20, 60);
}

function keyPressed() {
  if (key === '1') { nColors = 2; resetWorld(); }
  if (key === '2') { nColors = 3; resetWorld(); }
  if (key === UP_ARROW) movesPerFrame = Math.min(movesPerFrame * 2, 320);
  if (key === DOWN_ARROW) movesPerFrame = Math.max(Math.round(movesPerFrame / 2), 1);
  if (key === RIGHT_ARROW) k1 = Math.min(k1 + 0.05, 1);
  if (key === LEFT_ARROW) k1 = Math.max(k1 - 0.05, 0.01);
  if (key === 'r' || key === 'R') resetWorld();
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. 同種率が 50 % → 何 % まで上がるか、時間とともに見よう。塊は時間がたつと数が減って大きくなる？
// 2. k1 を 0.5 にすると、塊の中の卵も拾ってしまう。塊はどうなる？
// 3. 2（3 色）にして同じことを。ランダムなら 33 % から始まる
// 4. k2 を 0.05 にすると、どこにでも置いてしまう。仕分けは進む？
// 5. 実際のアリは卵・幼虫・さなぎを大きさごとに別の場所に集める。ロボットで倉庫を仕分ける研究もある

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
