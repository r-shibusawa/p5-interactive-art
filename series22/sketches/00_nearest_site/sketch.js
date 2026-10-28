// ============================================
// 00 最寄りの点で塗り分ける
// 画面に「サイト（種の点）」を置き、すべての場所を「いちばん近いサイト」の色で塗る ＝ ボロノイ図
//   同じ色の領域 = そのサイトの「なわばり」（セル）。境目は 2 つのサイトからちょうど同じ距離の場所
// クリック = サイトを追加 / ドラッグ = サイトを動かす / D = 距離の濃淡 / E = 境界線 / R = ランダム / C = 全部消す
// ============================================

let sites = [];
let res = 5;              // ★ 塗り分けの細かさ（何画素ずつまとめて計算するか。小さいほど細かく重い）
let buf, gw, gh;
let dirty = true;         // サイトが変わったときだけ塗り直す
let shade = false;        // 距離で濃淡をつける
let edges = true;         // 境界線をかく
let dragging = -1;
let palette = [];         // サイトごとの色 [r, g, b]

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  gw = ceil(width / res); gh = ceil(height / res);
  buf = createGraphics(gw, gh);
  buf.pixelDensity(1);
  randomSites(12);
}

function randomSites(n) {
  sites = [];
  for (let i = 0; i < n; i++) sites.push({ x: random(60, width - 60), y: random(110, height - 40) });
  dirty = true;
}

// ★ 色の決め方：番号 × 137.5°（黄金角）で色相をずらすと、となり同士が似た色になりにくい
function siteColor(i) { return hsbToRgb((i * 137.5) % 360, 45, 85); }

// すべての画素について「いちばん近いサイト」と「2 番目に近いサイト」を探して塗る
function paintBuffer() {
  palette = sites.map((s, i) => siteColor(i));
  buf.loadPixels();
  let px = buf.pixels;
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let x = (gx + 0.5) * res, y = (gy + 0.5) * res;
      let best = -1, d1 = Infinity, d2 = Infinity;
      for (let i = 0; i < sites.length; i++) {
        let dx = x - sites[i].x, dy = y - sites[i].y, d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; best = i; } else if (d < d2) d2 = d;
      }
      let k = 4 * (gx + gy * gw);
      if (best < 0) { px[k] = px[k + 1] = px[k + 2] = 25; px[k + 3] = 255; continue; }
      let c = palette[best];
      let f = shade ? Math.max(0.25, 1 - Math.sqrt(d1) / 350) : 1;     // ★ 遠いほど暗く
      if (edges && Math.sqrt(d2) - Math.sqrt(d1) < res * 0.8) f = 0.15;  // 1 番と 2 番がほぼ同じ距離 = 境界
      px[k] = c[0] * f; px[k + 1] = c[1] * f; px[k + 2] = c[2] * f; px[k + 3] = 255;
    }
  }
  buf.updatePixels();
  dirty = false;
}

function nearestSite(x, y) {
  let best = -1, bd = Infinity;
  for (let i = 0; i < sites.length; i++) {
    let d = (x - sites[i].x) ** 2 + (y - sites[i].y) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return { i: best, d: Math.sqrt(bd) };
}

function draw() {
  if (dirty) paintBuffer();
  image(buf, 0, 0, gw * res, gh * res);

  // サイト
  for (let i = 0; i < sites.length; i++) {
    stroke(0, 0, 10); strokeWeight(2); fill(0, 0, 100);
    circle(sites[i].x, sites[i].y, 12);
  }

  // マウスの最寄りのサイト：線と「空の円」（この円の中にはほかのサイトが 1 つもない）
  let nb = nearestSite(mouseX, mouseY);
  if (nb.i >= 0 && mouseY > 90) {
    let s = sites[nb.i];
    stroke(0, 0, 100); strokeWeight(2);
    line(mouseX, mouseY, s.x, s.y);
    noFill(); stroke(0, 0, 100, 60); strokeWeight(1.5);
    circle(mouseX, mouseY, nb.d * 2);
    noStroke(); fill(0, 0, 100);
    circle(mouseX, mouseY, 8);
    fill(0, 0, 10); textSize(14);
    text('#' + nb.i + '  ' + nf(nb.d, 1, 0) + 'px', mouseX + 10, mouseY - 10);
  }

  noStroke(); fill(0, 0, 0, 55); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text('クリック：サイトを追加　ドラッグ：動かす　D：距離の濃淡 ' + (shade ? 'ON' : 'off') + '　E：境界線 ' + (edges ? 'ON' : 'off') + '　R：ランダム　C：消す　サイト ' + sites.length + ' 個', 20, 40);
  fill(0, 0, 80); textSize(15);
  text('どの場所も「いちばん近いサイト」の色。マウスの円の中にはほかのサイトが入らない（入ったら最寄りが変わる）。境界 = 2 つのサイトから同じ距離', 20, 68);
}

function mousePressed() {
  if (mouseY < 90) return;
  let nb = nearestSite(mouseX, mouseY);
  if (nb.i >= 0 && nb.d < 14) { dragging = nb.i; return; }
  sites.push({ x: mouseX, y: mouseY });
  dirty = true;
}
function mouseDragged() {
  if (dragging < 0) return;
  sites[dragging].x = constrain(mouseX, 0, width);
  sites[dragging].y = constrain(mouseY, 90, height);
  dirty = true;
}
function mouseReleased() { dragging = -1; }

function keyPressed() {
  if (key === 'd' || key === 'D') { shade = !shade; dirty = true; }
  if (key === 'e' || key === 'E') { edges = !edges; dirty = true; }
  if (key === 'r' || key === 'R') randomSites(floor(random(8, 25)));
  if (key === 'c' || key === 'C') { sites = []; dirty = true; }
}

// ---------- やってみよう ----------
// 1. サイトを 2 個だけにしてみよう。境界はどんな線？ 3 個なら？（境界が 1 点で交わる）
// 2. サイトを 1 列にきれいに並べると、セルはどんな形になる？ 格子状（碁盤の目）や六角形状に並べたら？
// 3. res を 2 にすると細かくなるが重くなる。res を 20 にするとどう見える？
// 4. siteColor を「サイトの y 座標で色を決める」に変えると、地図のような絵になる

// 色の変換（HSB → RGB 0〜255）
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  let k = (n) => (n + h / 60) % 6;
  let f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [255 * f(5), 255 * f(3), 255 * f(1)];
}
