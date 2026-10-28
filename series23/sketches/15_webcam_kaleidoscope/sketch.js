// ============================================
// 15 カメラで万華鏡（おまけ）
// カメラ映像の三角形を切り取り、鏡に映すように 2n 枚並べる = 二面体群 Dₙ の対称性
//   W = 壁紙モード：三角形を平面にしきつめる（3 枚の鏡の万華鏡 = 壁紙群 p3m1）
// マウス = 映像のどこを切り取るか / ←→ = n（鏡の数）/ ↑↓ = 大きさ / W = 壁紙モード / スペース = 回転 / S = 保存
// カメラが使えないときは、自動で動く模様を映す（カメラの許可が必要）
// ============================================

let cap;
let vw = 320, vh = 240;      // ★ カメラ画像の大きさ
let n = 6;                   // ★ 鏡の数（Dₙ の n）
let srcR = 0.35;             // ★ 切り取る三角形の大きさ（映像の高さに対する割合）
let wallpaper = false;
let spin = false, spinA = 0;
let pg;                      // カメラがないときの模様
let hud;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  pg = createGraphics(vw, vh);
  hud = createGraphics(width, height);
  textureMode(NORMAL);
}

function camReady() { return cap && cap.width > 0 && cap.elt.readyState >= 2; }

function draw() {
  background(0);
  let src = camReady() ? cap : fallback();
  if (spin) spinA += 0.01;
  // 切り取る三角形（映像の座標 0〜1）：中心はマウス
  let u0 = constrain(mouseX / width, 0.2, 0.8), v0 = constrain(mouseY / height, 0.2, 0.8);
  let r = srcR, half = PI / n;
  let A = [u0, v0];
  let B = [u0 + r * cos(spinA) * (vh / vw), v0 + r * sin(spinA)];
  let C = [u0 + r * cos(spinA + (wallpaper ? PI / 3 : half)) * (vh / vw), v0 + r * sin(spinA + (wallpaper ? PI / 3 : half))];
  for (let q of [B, C]) { q[0] = constrain(q[0], 0, 1); q[1] = constrain(q[1], 0, 1); }

  noStroke();
  texture(src);
  beginShape(TRIANGLES);
  if (!wallpaper) {
    // Dₙ：2n 枚の三角形。となりどうしは鏡映（B と C を入れかえる）
    let Rr = height * 0.48;   // ★ 万華鏡の半径
    for (let i = 0; i < 2 * n; i++) {
      let a1 = i * half, a2 = (i + 1) * half;
      let p = i % 2 === 0 ? [B, C] : [C, B];
      vertex(0, 0, 0, A[0], A[1]);
      vertex(Rr * cos(a1), Rr * sin(a1), 0, p[0][0], p[0][1]);
      vertex(Rr * cos(a2), Rr * sin(a2), 0, p[1][0], p[1][1]);
    }
  } else {
    // 正三角形のしきつめ：格子点 (i, j) に 3 色の番号 (i − j) mod 3 をつけ、番号 → 映像の頂点 A, B, C
    let L = height * 0.22 * (srcR / 0.35);
    let uv = [A, B, C];
    let ax = [L, 0], bx = [L / 2, (L * sqrt(3)) / 2];
    let P = (i, j) => [i * ax[0] + j * bx[0] - width, i * ax[1] + j * bx[1] - height];
    let rows = ceil((height * 2) / bx[1]) + 2, cols = ceil((width * 2) / L) + rows;
    for (let j = 0; j < rows; j++) for (let i = -rows; i < cols; i++) {
      let p0 = P(i, j), p1 = P(i + 1, j), p2 = P(i, j + 1), p3 = P(i + 1, j + 1);
      if (p0[0] > width / 2 + L || p3[0] < -width / 2 - 2 * L || p0[1] > height / 2 + L || p3[1] < -height / 2 - L) continue;
      let lab = (a, b) => uv[(((a - b) % 3) + 3) % 3];
      for (let tri of [[[i, j], [i + 1, j], [i, j + 1]], [[i + 1, j], [i + 1, j + 1], [i, j + 1]]]) {
        for (let [a, b] of tri) { let q = P(a, b), t = lab(a, b); vertex(q[0], q[1], 0, t[0], t[1]); }
      }
    }
  }
  endShape();

  // 文字（2D の層を手前に）
  hud.clear();
  hud.noStroke(); hud.fill(0, 150); hud.rect(0, 0, width, 84);
  hud.fill(255); hud.textSize(18);
  hud.text('マウス：切り取る場所　←→：n = ' + n + '　↑↓：大きさ　W：' + (wallpaper ? '壁紙（p3m1）' : '万華鏡（D' + n + '）') + '　スペース：回転　S：保存', 20, 34);
  hud.fill(190); hud.textSize(15);
  hud.text((camReady() ? 'カメラ映像' : 'カメラなし → 自動の模様') + '。' + (wallpaper ? '3 枚の鏡で囲まれた三角形 → 平面全体（並進も対称性に）' : '対称性は 回転 ' + n + ' 個 ＋ 鏡映 ' + n + ' 個 = ' + 2 * n + ' 個'), 20, 62);
  clearDepth();
  image(hud, -width / 2, -height / 2, width, height);
}

// カメラがないときの、動く模様
function fallback() {
  pg.background(20, 20, 40);
  pg.noStroke();
  for (let i = 0; i < 24; i++) {
    let t = frameCount * 0.01 + i;
    pg.fill(128 + 127 * Math.sin(t * 1.3), 128 + 127 * Math.sin(t * 0.7 + 2), 128 + 127 * Math.sin(t + 4), 200);
    pg.circle(vw / 2 + Math.sin(t * 0.9) * vw * 0.4, vh / 2 + Math.cos(t * 1.1) * vh * 0.4, 18 + 12 * Math.sin(t * 2));
  }
  pg.stroke(255); pg.strokeWeight(4);
  pg.line(0, vh * (0.5 + 0.4 * Math.sin(frameCount * 0.02)), vw, vh * 0.3);
  return pg;
}

function keyPressed() {
  if (key === RIGHT_ARROW) n = min(n + 1, 16);
  if (key === LEFT_ARROW) n = max(n - 1, 2);
  if (key === UP_ARROW) srcR = min(srcR + 0.03, 0.6);
  if (key === DOWN_ARROW) srcR = max(srcR - 0.03, 0.1);
  if (key === 'w' || key === 'W') wallpaper = !wallpaper;
  if (key === ' ') spin = !spin;
  if (key === 's' || key === 'S') saveCanvas('kaleidoscope', 'png');
  return false;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); hud = createGraphics(width, height); }

// ---------- やってみよう ----------
// 1. n = 2, 3, 4… と変えて、鏡の数と模様の「花びら」の数の関係を見よう（花びら n 枚、三角形 2n 枚）
// 2. 隣どうしを鏡映でなく「同じ向き」に並べると（p を常に [B, C] に）巡回群 Cₙ の模様になる。違いは？
// 3. 壁紙モードの三角形を 60° でなく 90°-45°-45° にすると正方形の万華鏡（p4m）になる。uv の作り方を変えてみよう
// 4. 顔を近づけたり手を動かしたりして、気に入った模様を S で保存しよう
