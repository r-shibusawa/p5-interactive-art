// ============================================
// 08 重みつきボロノイ
// サイトに「重み w（強さ）」をつけて、距離の測り方を変える。強いサイトほど広いなわばりを持つ
//   1 加法（アポロニウス）d − w：境界は双曲線 / 2 乗法 d ÷ w：境界は円（アポロニウスの円）/ 3 パワー図 d² − w²：境界は直線
// 1〜3 = 種類 / ドラッグ = 動かす / Shift+ドラッグ・ホイール・↑↓ = マウスの近くのサイトの重み / クリック = 追加 / R = ランダムな重み / E = 重みをそろえる / C = 消す
// ============================================

let sites = [];
let mode = 1;
let res = 5;              // ★ 計算の細かさ
let buf, gw, gh;
let dirty = true;
let dragging = -1, weighting = -1, dragStartY = 0, wStart = 0;
let names = ['', '加法（アポロニウス）  d − w', '乗法  d ÷ w', 'パワー図  d² − w²'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  gw = ceil(width / res); gh = ceil(height / res);
  buf = createGraphics(gw, gh);
  buf.pixelDensity(1);
  for (let i = 0; i < 12; i++) sites.push({ x: random(80, width - 80), y: random(140, height - 60), w: random(10, 90) });
}

// ★ 重みつきの「距離」。小さいサイトが勝つ
function wdist(s, x, y) {
  let d2 = (x - s.x) ** 2 + (y - s.y) ** 2;
  if (mode === 1) return Math.sqrt(d2) - s.w;
  if (mode === 2) return Math.sqrt(d2) / (s.w * 0.02);   // w = 50 で 1 倍
  return d2 - s.w * s.w;
}

function paintBuffer() {
  let cols = sites.map((s, i) => hsbToRgb((i * 137.5) % 360, 45, 85));
  let lab = new Int16Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let x = (gx + 0.5) * res, y = (gy + 0.5) * res, best = -1, bd = Infinity;
    for (let i = 0; i < sites.length; i++) { let d = wdist(sites[i], x, y); if (d < bd) { bd = d; best = i; } }
    lab[gx + gy * gw] = best;
  }
  buf.loadPixels();
  let px = buf.pixels;
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let i = gx + gy * gw, l = lab[i], k = 4 * i;
    let edge = (gx + 1 < gw && lab[i + 1] !== l) || (gy + 1 < gh && lab[i + gw] !== l);
    let c = l >= 0 ? cols[l] : [25, 25, 25], f = edge ? 0.15 : 1;
    px[k] = c[0] * f; px[k + 1] = c[1] * f; px[k + 2] = c[2] * f; px[k + 3] = 255;
  }
  buf.updatePixels();
  dirty = false;
}

function nearestIdx(x, y, r) {
  let best = -1, bd = r;
  for (let i = 0; i < sites.length; i++) { let d = dist(x, y, sites[i].x, sites[i].y); if (d < bd) { bd = d; best = i; } }
  return best;
}

function draw() {
  if (dirty) paintBuffer();
  image(buf, 0, 0, gw * res, gh * res);
  let hov = nearestIdx(mouseX, mouseY, 200);
  for (let i = 0; i < sites.length; i++) {
    let s = sites[i];
    noFill(); stroke(0, 0, 100, i === hov ? 90 : 40); strokeWeight(i === hov ? 2.5 : 1.5);
    circle(s.x, s.y, s.w * 2);                       // 重みを円の大きさで
    stroke(0, 0, 10); strokeWeight(2); fill(0, 0, 100); circle(s.x, s.y, 11);
    noStroke(); fill(0, 0, 10); textSize(13); text('w=' + nf(s.w, 1, 0), s.x + 8, s.y - 8);
  }
  noStroke(); fill(0, 0, 0, 55); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text('1〜3：' + names[mode] + '　ドラッグ：動かす　Shift+ドラッグ／ホイール／↑↓：重み　クリック：追加　R：ランダムな重み　E：そろえる　C：消す', 20, 40);
  fill(0, 0, 80); textSize(15);
  let tip = mode === 1 ? '境界は双曲線。結晶が同時でなく「時間差で」育つ様子、店の魅力の差' : mode === 2 ? '境界は円。弱いサイトが強いサイトに囲まれて島になる。セルが飛び地になることも'
    : 'パワー図：境界はまっすぐのまま動く。重みが小さすぎるとセルが消える（空のセル）';
  text('円の大きさ = 重み w。' + tip + '。重みを全部そろえると普通のボロノイ図（E）', 20, 68);
}

function mousePressed() {
  if (mouseY < 90) return;
  let i = nearestIdx(mouseX, mouseY, 14);
  if (keyIsDown(SHIFT)) { weighting = nearestIdx(mouseX, mouseY, 200); dragStartY = mouseY; if (weighting >= 0) wStart = sites[weighting].w; return; }
  if (i >= 0) { dragging = i; return; }
  sites.push({ x: mouseX, y: mouseY, w: 40 }); dirty = true;
}
function mouseDragged() {
  if (weighting >= 0) { sites[weighting].w = constrain(wStart + (dragStartY - mouseY) * 0.6, 5, 200); dirty = true; return; }
  if (dragging < 0) return;
  sites[dragging].x = constrain(mouseX, 0, width); sites[dragging].y = constrain(mouseY, 90, height); dirty = true;
}
function mouseReleased() { dragging = -1; weighting = -1; }
function mouseWheel(e) {
  let i = nearestIdx(mouseX, mouseY, 200);
  if (i >= 0) { sites[i].w = constrain(sites[i].w - e.delta * 0.05, 5, 200); dirty = true; }
  return false;
}
function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { mode = int(key); dirty = true; }
  let i = nearestIdx(mouseX, mouseY, 200);
  if (key === UP_ARROW && i >= 0) { sites[i].w = min(200, sites[i].w + 8); dirty = true; }
  if (key === DOWN_ARROW && i >= 0) { sites[i].w = max(5, sites[i].w - 8); dirty = true; }
  if (key === 'r' || key === 'R') { for (let s of sites) s.w = random(5, 120); dirty = true; }
  if (key === 'e' || key === 'E') { for (let s of sites) s.w = 40; dirty = true; }
  if (key === 'c' || key === 'C') { sites = []; dirty = true; }
}

// ---------- やってみよう ----------
// 1. E で重みをそろえてから、1 つだけ重みを大きくしよう。3 つの種類で境界の形はどう違う？
// 2. 乗法（2）で、強いサイトの近くに弱いサイトを置くと「島」になる。島の境界が円になることを確かめよう
// 3. パワー図（3）で重みを小さくしていくと、セルが消える。消える瞬間はどんなとき？
// 4. 重みを「人口」、サイトを「駅」と思って、駅の利用圏の地図をつくってみよう

// 色の変換（HSB → RGB 0〜255）
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  let k = (n) => (n + h / 60) % 6;
  let f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [255 * f(5), 255 * f(3), 255 * f(1)];
}
