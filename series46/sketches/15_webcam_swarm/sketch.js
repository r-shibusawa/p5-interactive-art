// ============================================
// 15 カメラの光に集まる群れ 📷（おまけ）
// カメラ映像の「明るい所」または「動いた所」をエサの場にして、800 匹の群れがエサの濃い方へ集まり、通った跡で絵を描く
// 1 匹 1 匹はエサの坂（勾配）を登るのと、近すぎる仲間から離れるだけ。カメラが使えないときはマウスの周りがエサになる
// 1 = 明るい所 / 2 = 動いた所 / ↑↓ = 群れの数 / C = 絵を消す / F = 跡を少しずつ消す / S = 画像を保存
// ============================================

let cap, vw = 160, vh = 120;
let nAgents = 800;           // 群れの数
let climb = 2.2;             // ★ エサの坂を登る強さ
let sepR = 7;                // ★ この距離より近い仲間からは離れる（px）
let maxSp = 3.0;             // ★ 速さの上限
let jitter = 0.35;           // ★ ふらつき
let foodMode = 1;            // 1 = 明るさ、2 = 動き
let fading = false;
let ax, ay, avx, avy, apx, apy;
let food, foodB, prevGray = null, usingCam = false;
let art, heads, nexts, cols, rows;
const CELL = 14;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  food = new Float32Array(vw * vh); foodB = new Float32Array(vw * vh);
  art = createGraphics(width, height); art.pixelDensity(1); art.colorMode(HSB, 360, 100, 100, 100); art.background(260, 50, 8);
  makeAgents();
}
function makeAgents() {
  ax = new Float32Array(nAgents); ay = new Float32Array(nAgents); avx = new Float32Array(nAgents); avy = new Float32Array(nAgents);
  apx = new Float32Array(nAgents); apy = new Float32Array(nAgents);
  for (let i = 0; i < nAgents; i++) { ax[i] = apx[i] = Math.random() * width; ay[i] = apy[i] = Math.random() * height; }
  cols = Math.ceil(width / CELL) + 1; rows = Math.ceil(height / CELL) + 1;
  heads = new Int32Array(cols * rows); nexts = new Int32Array(nAgents);
}

function draw() {
  updateFood();
  // ---- 空間ハッシュで近い仲間を探す
  heads.fill(-1);
  for (let i = 0; i < nAgents; i++) { let c = Math.floor(ax[i] / CELL) + Math.floor(ay[i] / CELL) * cols; nexts[i] = heads[c]; heads[c] = i; }
  let gs = width / vw;
  for (let i = 0; i < nAgents; i++) {
    // エサの坂（となりのマスとの差）
    let gx = (foodAt(ax[i] + gs, ay[i]) - foodAt(ax[i] - gs, ay[i])) * 20, gy = (foodAt(ax[i], ay[i] + gs) - foodAt(ax[i], ay[i] - gs)) * 20;
    let fx = constrain(gx, -1, 1) * climb, fy = constrain(gy, -1, 1) * climb;
    // 近すぎる仲間から離れる
    let cx = Math.floor(ax[i] / CELL), cy = Math.floor(ay[i] / CELL);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      let c = cx + dx + (cy + dy) * cols;
      if (c < 0 || c >= cols * rows) continue;
      for (let j = heads[c]; j >= 0; j = nexts[j]) {
        if (j === i) continue;
        let ex = ax[i] - ax[j], ey = ay[i] - ay[j], d = Math.hypot(ex, ey);
        if (d > 0.01 && d < sepR) { fx += (ex / d) * (1 - d / sepR) * 1.5; fy += (ey / d) * (1 - d / sepR) * 1.5; }
      }
    }
    avx[i] = (avx[i] + fx * 0.3 + (Math.random() - 0.5) * jitter) * 0.94;
    avy[i] = (avy[i] + fy * 0.3 + (Math.random() - 0.5) * jitter) * 0.94;
    let sp = Math.hypot(avx[i], avy[i]);
    if (sp > maxSp) { avx[i] *= maxSp / sp; avy[i] *= maxSp / sp; }
    apx[i] = ax[i]; apy[i] = ay[i];
    ax[i] = constrain(ax[i] + avx[i], 0, width - 1); ay[i] = constrain(ay[i] + avy[i], 0, height - 1);
  }
  // ---- 通った跡を絵に描く（色は時間とともに変わる）
  if (fading) { art.noStroke(); art.fill(260, 50, 8, 4); art.rect(0, 0, width, height); }
  art.stroke((frameCount * 0.4) % 360, 60, 100, 25); art.strokeWeight(1.5);
  art.beginShape(LINES);
  for (let i = 0; i < nAgents; i++) { art.vertex(apx[i], apy[i]); art.vertex(ax[i], ay[i]); }
  art.endShape();
  image(art, 0, 0);
  // ---- 群れの点
  stroke(0, 0, 100, 80); strokeWeight(2);
  beginShape(POINTS);
  for (let i = 0; i < nAgents; i++) vertex(ax[i], ay[i]);
  endShape();
  // ---- 右上：カメラとエサの場
  let pw = 200, ph = 150, px0 = width - pw - 16, py0 = 16;
  if (usingCam) image(cap, px0, py0, pw, ph); else { noStroke(); fill(0, 0, 15); rect(px0, py0, pw, ph); }
  noStroke();
  for (let y = 0; y < vh; y += 6) for (let x = 0; x < vw; x += 6) {
    let f = food[y * vw + x]; if (f < 0.05) continue;
    fill(50, 90, 100, Math.min(f * 120, 80)); rect(px0 + (x / vw) * pw, py0 + (y / vh) * ph, 7, 7);
  }
  let near = 0; for (let i = 0; i < nAgents; i += 4) if (foodAt(ax[i], ay[i]) > 0.1) near++;
  fill(0, 0, 0, 55); rect(10, 10, 760, 58, 6);
  fill(0, 0, 100); textSize(16);
  text('1：明るい所　2：動いた所（いま ' + (foodMode === 1 ? '明るさ' : '動き') + '）　↑↓：' + nAgents + ' 匹　C：消す　F：跡を消していく ' + (fading ? 'ON' : 'off') + '　S：保存', 20, 34);
  fill(0, 0, 75); textSize(13);
  text((usingCam ? 'カメラ使用中' : 'カメラなし → マウスの周りがエサ') + '。エサの上にいる割合 ' + nf((near / Math.ceil(nAgents / 4)) * 100, 1, 0) + ' %（黄 = エサの場）', 20, 56);
}

function keyPressed() {
  if (key === '1') foodMode = 1;
  if (key === '2') { foodMode = 2; food.fill(0); }
  if (key === UP_ARROW) { nAgents = Math.min(nAgents + 200, 2000); makeAgents(); }
  if (key === DOWN_ARROW) { nAgents = Math.max(nAgents - 200, 200); makeAgents(); }
  if (key === 'c' || key === 'C') art.background(260, 50, 8);
  if (key === 'f' || key === 'F') fading = !fading;
  if (key === 's' || key === 'S') saveCanvas('swarm_painting', 'png');
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); art = createGraphics(width, height); art.pixelDensity(1); art.colorMode(HSB, 360, 100, 100, 100); art.background(260, 50, 8); makeAgents(); }

// ---------- やってみよう ----------
// 1. 部屋を暗くして、スマホのライトをカメラに向けて動かそう。群れが光を追いかけて線を描く
// 2. 2（動き）にして手を振ると、振った所に群れが集まる。止まるとエサが消えて群れは散る
// 3. sepR を 0 にすると全員が 1 点に集まる。15 にすると広がって「面」を塗る。描ける絵がどう変わる？
// 4. climb を 0.5 にすると、ふらつきが勝ってエサを見つけにくい。jitter とのバランスを探そう
// 5. 群れは「エサの坂」しか知らないのに、映像の形をなぞる。これも 1 匹ずつの単純なルールから生まれる全体の形

// ==================================================
// ここから下は「カメラの道具」です（映像 → エサの場）
// ==================================================
// ★ エサの場を作る：カメラの明るさ（1）か、前のフレームとの差＝動き（2）。カメラがなければマウスの周り
function updateFood() {
  usingCam = !!(cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2);
  if (usingCam) {
    cap.loadPixels();
    let px = cap.pixels;
    if (px && px.length >= vw * vh * 4) {
      let gray = new Float32Array(vw * vh);
      for (let i = 0; i < vw * vh; i++) gray[i] = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 765;
      for (let i = 0; i < vw * vh; i++) {
        if (foodMode === 1) food[i] = Math.pow(gray[i], 3);                               // 明るい所ほど強く
        else food[i] = Math.max(food[i] * 0.9, prevGray ? Math.min(Math.abs(gray[i] - prevGray[i]) * 5, 1) : 0);   // 動いた所（少し残る）
      }
      prevGray = gray;
      blurFood();
      return;
    }
  }
  let mx = (mouseX / width) * vw, my = (mouseY / height) * vh;
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) food[y * vw + x] = Math.exp(-((x - mx) ** 2 + (y - my) ** 2) / 120);
  blurFood();
}
// ぼかして、遠くからでもエサの方向がわかるようにする
function blurFood() {
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
      let s = 0;
      for (let d = -3; d <= 3; d++) s += food[y * vw + constrain(x + d, 0, vw - 1)];
      foodB[y * vw + x] = s / 7;
    }
    for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
      let s = 0;
      for (let d = -3; d <= 3; d++) s += foodB[constrain(y + d, 0, vh - 1) * vw + x];
      food[y * vw + x] = s / 7;
    }
  }
  let fmax = 0;                                      // いちばん濃い所が 1 になるようにそろえる
  for (let i = 0; i < vw * vh; i++) fmax = Math.max(fmax, food[i]);
  if (fmax > 0.02) for (let i = 0; i < vw * vh; i++) food[i] /= fmax;
}
function foodAt(x, y) { return food[constrain(Math.floor((y / height) * vh), 0, vh - 1) * vw + constrain(Math.floor((x / width) * vw), 0, vw - 1)]; }
