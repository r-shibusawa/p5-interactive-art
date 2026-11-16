// ============================================
// 08 シロアリの柱づくり ─ スティグマジー（環境を介した協調）
// シロアリは設計図を持たない。ランダムに歩き、「土の少ない所では拾い、土の多い所に置く」だけ
// 置いた土からはにおい（セメントフェロモン）が広がり、土を運ぶシロアリはにおいの濃い方へ歩く → 小山が育って柱になり、柱どうしは適度に離れる
// ↑↓ = シロアリの数 / ←→ = 速さ / P = におい ON/OFF / ドラッグ = 土をまく / R = やり直し / スペース = 一時停止
// ============================================

let GW = 150, GH = 88;           // ★ 格子の大きさ（マスの数）
let nTermites = 500;
let k1 = 0.4, k2 = 0.3;          // ★ 拾う・置くの感度（Deneubourg の式の定数）
let chem = 6;                    // ★ においへの引かれやすさ
let evap = 0.02, diffuse = 0.2;  // ★ においの蒸発と広がり
let soilRatio = 0.3;             // ★ 最初に土があるマスの割合
let pillarH = 8;                 // ★ この高さ以上を「柱」と数える
let stepsPerFrame = 20;
let usePher = true, paused = false;
let hgt, pher, tmp, termites = [];
let buf, pillarHist = [], maxHHist = [], pillarCount = 0, maxH = 0, peaks = [];
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buf = createGraphics(GW, GH); buf.pixelDensity(1);
  resetWorld();
}

function resetWorld() {
  hgt = new Uint16Array(GW * GH); pher = new Float32Array(GW * GH); tmp = new Float32Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) if (Math.random() < soilRatio) hgt[i] = 1;
  termites = [];
  for (let i = 0; i < nTermites; i++) termites.push({ x: Math.floor(Math.random() * GW), y: Math.floor(Math.random() * GH), d: Math.floor(Math.random() * 8), carry: false });
  pillarHist = []; maxHHist = [];
}
function idx(x, y) { return ((y + GH) % GH) * GW + ((x + GW) % GW); }
// まわり 3×3 の土の平均の高さ
function localSoil(x, y) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += hgt[idx(x + dx, y + dy)]; return s / 9; }

// ★ シロアリ 1 匹の 1 歩
function termiteStep(t) {
  // 歩く：だいたいまっすぐ。土を運んでいるときは、においの濃い方を選びやすい
  let ws = [], total = 0;
  for (let k = 0; k < 8; k++) {
    let turn = Math.min((k - t.d + 8) % 8, (t.d - k + 8) % 8);
    let w = [8, 4, 1, 0.3, 0.1][turn];
    if (t.carry && usePher) w *= 1 + chem * pher[idx(t.x + DIRS[k][0], t.y + DIRS[k][1])];
    ws.push(w); total += w;
  }
  let r = Math.random() * total, k = 0;
  while (k < 7 && r > ws[k]) { r -= ws[k]; k++; }
  t.d = k; t.x = (t.x + DIRS[k][0] + GW) % GW; t.y = (t.y + DIRS[k][1] + GH) % GH;
  // 拾う・置く：f = まわりの土の量
  let i = idx(t.x, t.y), f = localSoil(t.x, t.y);
  if (!t.carry && hgt[i] > 0) {
    let pPick = Math.pow(k1 / (k1 + f), 2);               // 土が少ない所ほど拾いやすい
    if (Math.random() < pPick) { hgt[i]--; t.carry = true; }
  } else if (t.carry) {
    let g = f + (usePher ? pher[i] : 0);
    let pDrop = Math.pow(g / (k2 + g), 2);                 // 土（とにおい）が多い所ほど置きやすい
    if (Math.random() < pDrop * 0.5) { hgt[i] = Math.min(hgt[i] + 1, 60000); t.carry = false; pher[i] += 1; }
  }
}

// においを広げて、少しずつ消す
function updatePheromone() {
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    let i = y * GW + x;
    let avg = (pher[idx(x + 1, y)] + pher[idx(x - 1, y)] + pher[idx(x, y + 1)] + pher[idx(x, y - 1)]) / 4;
    tmp[i] = Math.min((pher[i] + diffuse * (avg - pher[i])) * (1 - evap), 50);
  }
  let s = pher; pher = tmp; tmp = s;
}

// 柱を数える：高さ pillarH 以上のマスのかたまりの数（つながったもの = 1 本）
function countPillars() {
  let seen = new Uint8Array(GW * GH), n = 0; maxH = 0; peaks = [];
  for (let i = 0; i < GW * GH; i++) {
    maxH = Math.max(maxH, hgt[i]);
    if (seen[i] || hgt[i] < pillarH) continue;
    n++;
    let stack = [i], top = i;
    seen[i] = 1;
    while (stack.length) {
      let c = stack.pop(), cx = c % GW, cy = Math.floor(c / GW);
      if (hgt[c] > hgt[top]) top = c;
      for (let [dx, dy] of DIRS) { let j = idx(cx + dx, cy + dy); if (!seen[j] && hgt[j] >= pillarH) { seen[j] = 1; stack.push(j); } }
    }
    peaks.push({ x: top % GW, y: Math.floor(top / GW), h: hgt[top] });   // 柱のてっぺん
  }
  return n;
}

function draw() {
  background(30, 35, 12);
  if (!paused) {
    for (let s = 0; s < stepsPerFrame; s++) for (let t of termites) termiteStep(t);
    if (usePher) updatePheromone();
  }
  if (mouseIsPressed) {
    let g = toGrid(mouseX, mouseY);
    if (g) for (let k = 0; k < 6; k++) hgt[idx(g.x + Math.floor(Math.random() * 5) - 2, g.y + Math.floor(Math.random() * 5) - 2)]++;
  }
  if (frameCount % 15 === 0) {
    pillarCount = countPillars();
    pillarHist.push(pillarCount); maxHHist.push(maxH);
    if (pillarHist.length > 300) { pillarHist.shift(); maxHHist.shift(); }
  }
  // ---- 土の高さ（明るさ）とにおい（紫）を画像にする
  buf.loadPixels();
  for (let i = 0; i < GW * GH; i++) {
    let h = Math.min(Math.sqrt(hgt[i] / 25), 1), p = Math.min(pher[i] * 0.6, 1);   // 高いほど明るい（√ で低い山も見える）
    buf.pixels[i * 4] = 40 + 180 * h + 70 * p; buf.pixels[i * 4 + 1] = 30 + 130 * h; buf.pixels[i * 4 + 2] = 30 + 60 * h + 110 * p; buf.pixels[i * 4 + 3] = 255;
  }
  for (let t of termites) {                                // シロアリ：運び中 = 黄、手ぶら = うすい灰色
    let i = (t.y * GW + t.x) * 4;
    if (t.carry) { buf.pixels[i] = 255; buf.pixels[i + 1] = 220; buf.pixels[i + 2] = 40; }
    else { buf.pixels[i] = (buf.pixels[i] + 160) / 2; buf.pixels[i + 1] = (buf.pixels[i + 1] + 160) / 2; buf.pixels[i + 2] = (buf.pixels[i + 2] + 170) / 2; }
  }
  buf.updatePixels();
  let a = area();
  noSmooth(); image(buf, a.x, a.y, a.w, a.h); smooth();
  noFill(); stroke(40, 60, 100, 60); strokeWeight(1.5);                  // 柱に輪（大きさ = 高さ）
  let kk = a.w / GW;
  for (let p of peaks) circle(a.x + (p.x + 0.5) * kk, a.y + (p.y + 0.5) * kk, kk * (1.5 + Math.sqrt(p.h)));

  // ---- 右：数字とグラフ
  let gx = a.x + a.w + 30, gw = width - gx - 25;
  drawPlot(pillarHist, gx, 120, gw, 90, 0, 120, color(30, 80, 100), '柱の本数（高さ ' + pillarH + ' 以上のかたまり）= ' + pillarCount);
  drawPlot(maxHHist, gx, 250, gw, 90, 0, 100, color(200, 60, 100), 'いちばん高い柱 = ' + maxH);
  let carrying = termites.filter((t) => t.carry).length;
  noStroke(); fill(0, 0, 85); textSize(14);
  text('土を運んでいる：' + carrying + ' / ' + termites.length + ' 匹', gx, 380);
  text('黄 = 運んでいるシロアリ、灰色 = 手ぶら', gx, 404);
  text('明るい所 = 高く積まれた土、紫 = におい', gx, 428);
  fill(0, 0, 65);
  text('拾う確率 = (k1 / (k1 + f))²', gx, 466);
  text('置く確率 = (f / (k2 + f))²', gx, 490);
  text('f = まわりの土の量（＋におい）', gx, 514);

  fill(0, 0, 100); textSize(18);
  text('↑↓：シロアリ ' + nTermites + ' 匹　←→：速さ ×' + stepsPerFrame + '　P：におい ' + (usePher ? 'ON' : 'OFF') + '　ドラッグ：土をまく　R：やり直し　スペース：' + (paused ? '停止中' : '実行中'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text('だれも全体を見ていないのに、土の山（柱）が自然にできる。前の仕事の跡（積まれた土）が次の仕事を呼ぶ ＝ スティグマジー', 20, 60);
}

function keyPressed() {
  if (key === UP_ARROW) { nTermites = Math.min(nTermites + 100, 1500); resetWorld(); }
  if (key === DOWN_ARROW) { nTermites = Math.max(nTermites - 100, 100); resetWorld(); }
  if (key === RIGHT_ARROW) stepsPerFrame = Math.min(stepsPerFrame + 5, 60);
  if (key === LEFT_ARROW) stepsPerFrame = Math.max(stepsPerFrame - 5, 1);
  if (key === 'p' || key === 'P') usePher = !usePher;
  if (key === 'r' || key === 'R') resetWorld();
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. P でにおいを OFF にすると？ 小山はできるが、柱のように高くはなりにくい。においが「ここに積め」の合図
// 2. k2 を 0.05 にすると少しの土でも置く → 小さな山がたくさん。k2 = 1 だと？
// 3. ドラッグで土をまいて「種」を作ると、そこに柱が育つ？ 柱と柱の間隔はにおいの広がり diffuse で変わる
// 4. 柱の本数のグラフは、最初に増えて、あとで減る。小さい山が大きい山に吸収されるから（勝者総取り）
// 5. 本物のシロアリの塚は高さ数メートル。1 匹 1 匹は数ミリなのに、どうやって「高さ」がそろうのだろう？

// ==================================================
// ここから下は「描くための道具」です
// ==================================================
function area() {
  let w = Math.min(width * 0.7, ((height - 110) * GW) / GH), h = (w * GH) / GW;
  return { x: 20, y: 85, w, h };
}
function toGrid(mx, my) {
  let a = area();
  if (mx < a.x || mx >= a.x + a.w || my < a.y || my >= a.y + a.h) return null;
  return { x: Math.floor(((mx - a.x) / a.w) * GW), y: Math.floor(((my - a.y) / a.h) * GH) };
}
function drawPlot(arr, x, y, w, h, lo, hi, c, title) {
  noStroke(); fill(0, 0, 0, 35); rect(x, y, w, h);
  fill(0, 0, 85); textSize(13); text(title, x, y - 8);
  if (arr.length < 2) return;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / 299) * w, y + h - constrain((arr[i] - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
