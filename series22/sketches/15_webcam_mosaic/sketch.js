// ============================================
// 15 カメラでボロノイ（おまけ）
// カメラの映像にサイトをまき、セルの中の色の平均で塗る → ボロノイのモザイク（ステンドグラス風の自分）
//   1 = サイトをランダムに / 2 = 輪郭（明るさが急に変わる所）に多くまく → 少ない数でも顔の形が残る
// 1・2 = まき方 / ←→ = サイトの数 / A = 平均の色 ⇄ サイトの点の色 / E = 境界線 / スペース = 止める（カメラの許可が必要。なければ作った絵で動く）
// ============================================

let cap;
let vw = 160, vh = 120;   // ★ カメラ画像の大きさ
let L = 2;                // ★ セルを計算する細かさ（カメラ 1 画素を L×L に分ける）
let lw, lh, out;
let sites = [];
let nSites = 400;         // ★ サイトの数
let mode = 1;
let avgColor = true, edges = true, frozen = false;
let lab;                // 各画素がどのサイトのセルか
let gen;                  // カメラがないときの代わりの絵
let needLabel = true;
let usingCam = false;
let gray = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  gen = createGraphics(vw, vh);
  gen.pixelDensity(1);
  lw = vw * L; lh = vh * L;
  out = createGraphics(lw, lh);
  out.pixelDensity(1);
  lab = new Int32Array(lw * lh);
  scatter();
}

// カメラがないときの絵（動く丸と縞）
function drawGen() {
  gen.colorMode(HSB, 360, 100, 100);
  gen.noStroke();
  for (let y = 0; y < vh; y += 4) { gen.fill((frameCount + y * 2) % 360, 40, 60); gen.rect(0, y, vw, 4); }
  gen.fill(40, 30, 95); gen.circle(vw / 2 + 30 * sin(frameCount * 0.03), vh / 2, 60);
  gen.fill(0, 0, 15); gen.circle(vw / 2 + 30 * sin(frameCount * 0.03) - 10, vh / 2 - 6, 8); gen.circle(vw / 2 + 30 * sin(frameCount * 0.03) + 10, vh / 2 - 6, 8);
}

// 映像の画素を取り出す（カメラが使えればカメラ、だめなら代わりの絵）
function sourcePixels() {
  if (cap && cap.width > 0) {
    cap.loadPixels();
    if (cap.pixels && cap.pixels.length >= vw * vh * 4) { usingCam = true; return cap.pixels; }
  }
  usingCam = false;
  drawGen();
  gen.loadPixels();
  return gen.pixels;
}

// ★ サイトをまく：1 = ランダム、2 = 輪郭ほど多く（明るさの差が大きい所）
function scatter(px) {
  sites = [];
  if (mode === 2 && px) {
    gray = new Float32Array(vw * vh);
    for (let i = 0; i < vw * vh; i++) gray[i] = (px[4 * i] + px[4 * i + 1] + px[4 * i + 2]) / 3;
    let guard = 0;
    while (sites.length < nSites && guard++ < nSites * 100) {
      let x = floor(random(1, vw - 1)), y = floor(random(1, vh - 1)), i = x + y * vw;
      let g = abs(gray[i + 1] - gray[i - 1]) + abs(gray[i + vw] - gray[i - vw]);
      if (random() < 0.04 + g / 60) sites.push({ x: x + random(), y: y + random() });
    }
  } else {
    for (let i = 0; i < nSites; i++) sites.push({ x: random(vw), y: random(vh) });
  }
  needLabel = true;
}

// 各画素の最寄りのサイトを、マス目で近くだけ探して決める
function computeLabels() {
  let cs = max(2, sqrt(vw * vh / sites.length) * 1.2), bw = ceil(vw / cs), bh = ceil(vh / cs);
  let bucket = Array.from({ length: bw * bh }, () => []);
  sites.forEach((s, i) => bucket[min(bw - 1, floor(s.x / cs)) + min(bh - 1, floor(s.y / cs)) * bw].push(i));
  for (let ly = 0; ly < lh; ly++) for (let lx = 0; lx < lw; lx++) {
    let x = (lx + 0.5) / L, y = (ly + 0.5) / L, cx = floor(x / cs), cy = floor(y / cs), best = 0, bd = Infinity;
    for (let r = 1; r <= 8; r++) {
      for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) {
        if (i < 0 || j < 0 || i >= bw || j >= bh) continue;
        for (let k of bucket[i + j * bw]) { let d = (sites[k].x - x) ** 2 + (sites[k].y - y) ** 2; if (d < bd) { bd = d; best = k; } }
      }
      if (bd <= (r * cs) ** 2) break;
    }
    lab[lx + ly * lw] = best;
  }
  needLabel = false;
}

function draw() {
  background(230, 25, 12);
  if (!frozen) {
    let px = sourcePixels();
    if (mode === 2 && frameCount % 15 === 0) scatter(px);   // 輪郭は動くので時々まき直す
    if (needLabel && sites.length) computeLabels();
    // セルごとの色：平均（A）かサイトの点の色
    let n = sites.length, sr = new Float32Array(n), sg = new Float32Array(n), sb = new Float32Array(n), sc = new Float32Array(n);
    if (avgColor) {
      for (let ly = 0; ly < lh; ly++) for (let lx = 0; lx < lw; lx++) {
        let l = lab[lx + ly * lw], k = 4 * (floor(lx / L) + floor(ly / L) * vw);
        sr[l] += px[k]; sg[l] += px[k + 1]; sb[l] += px[k + 2]; sc[l]++;
      }
    } else {
      sites.forEach((s, i) => { let k = 4 * (floor(s.x) + floor(s.y) * vw); sr[i] = px[k]; sg[i] = px[k + 1]; sb[i] = px[k + 2]; sc[i] = 1; });
    }
    out.loadPixels();
    let op = out.pixels;
    for (let ly = 0; ly < lh; ly++) for (let lx = 0; lx < lw; lx++) {
      let i = lx + ly * lw, l = lab[i], k = 4 * i, c = max(1, sc[l]);
      let e = edges && ((lx + 1 < lw && lab[i + 1] !== l) || (ly + 1 < lh && lab[i + lw] !== l));
      let f = e ? 0.25 : 1;
      op[k] = sr[l] / c * f; op[k + 1] = sg[l] / c * f; op[k + 2] = sb[l] / c * f; op[k + 3] = 255;
    }
    out.updatePixels();
  }
  // 画面いっぱいに 4:3 で表示
  let s = min((width - 40) / lw, (height - 110) / lh), w = lw * s, h = lh * s;
  image(out, (width - w) / 2, 95, w, h);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('1・2：まき方 = ' + (mode === 1 ? 'ランダム' : '輪郭に多く') + '　←→：サイト ' + nSites + ' 個　A：' + (avgColor ? 'セルの平均の色' : 'サイトの点の色') + '　E：境界線 ' + (edges ? 'ON' : 'off') + '　スペース：' + (frozen ? '再開' : '止める') + '　' + (usingCam ? '📷 カメラ' : '（カメラなし：作った絵）'), 20, 40);
  fill(0, 0, 65); textSize(15);
  text('セルの中の色を平均すると、細かい模様は消えて形だけが残る。輪郭にサイトを集めると、少ない数でも顔の輪郭がくっきり（セルが小さい = 解像度が高い）', 20, 68);
}

function keyPressed() {
  if (key === '1') { mode = 1; scatter(); }
  if (key === '2') { mode = 2; scatter(sourcePixels()); }
  if (key === RIGHT_ARROW) { nSites = min(3000, floor(nSites * 1.5)); scatter(mode === 2 ? sourcePixels() : null); }
  if (key === LEFT_ARROW) { nSites = max(30, floor(nSites / 1.5)); scatter(mode === 2 ? sourcePixels() : null); }
  if (key === 'a' || key === 'A') avgColor = !avgColor;
  if (key === 'e' || key === 'E') edges = !edges;
  if (key === ' ') frozen = !frozen;
}

// ---------- やってみよう ----------
// 1. サイトを 30 個と 3000 個で比べよう。何個あれば自分だとわかる？
// 2. まき方 2 で、輪郭の重み（g / 60 の 60）を変えてみよう。小さくすると輪郭にもっと集まる
// 3. セルを平均の色でなく「いちばん明るい色」や「白黒 2 値」で塗ると、ポスター風になる
// 4. 06 のロイド緩和を 1 回かけてからモザイクにすると、セルの大きさがそろってタイルのようになる
