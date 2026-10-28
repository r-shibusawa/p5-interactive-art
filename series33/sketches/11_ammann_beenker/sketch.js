// ============================================
// 11 アンマン・ビーンカー（八回対称）タイリング ─ 白銀比の準結晶
// 正方形と 45° のひし形だけで、周期をもたずに平面をしきつめる。拡大率（インフレーション）は 1 + √2
// ここでは de Bruijn の「多重格子法」でつくる：4 方向の平行線を引き、交点 1 つをタイル 1 枚に置きかえる
//   ひし形と正方形の枚数の比は √2 に近づく
// ↑↓ = 広さ（線の本数）/ ←→ = 格子をずらす（フェイゾン）/ スペース = ずらし続ける / G = 格子線 / O = 八角形の目印
// ============================================

let K = 8;              // ★ 各方向の線の本数（片側）
let gamma = [0.21, 0.37, 0.13, 0.29]; // ★ 4 方向の格子のずれ
let shift = 0;          // ←→ で動かすずれ
let moving = false;
let showGrid = false, showOct = true;
let tiles = [];
let edge = 26;          // タイル 1 辺の長さ（px）
const E = [0, 1, 2, 3].map(j => ({ x: Math.cos(j * Math.PI / 4), y: Math.sin(j * Math.PI / 4) }));

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  build();
}

// 多重格子法：方向 r, s の線の交点ごとにタイルを 1 枚つくる
function build() {
  tiles = [];
  let g = gamma.map((v, j) => v + shift * (j % 2 === 0 ? 1 : -0.6));
  for (let r = 0; r < 4; r++) for (let s = r + 1; s < 4; s++) {
    for (let kr = -K; kr <= K; kr++) for (let ks = -K; ks <= K; ks++) {
      // x·e_r = kr + g_r, x·e_s = ks + g_s を解く
      let a = E[r], b = E[s], det = a.x * b.y - a.y * b.x;
      let c1 = kr + g[r], c2 = ks + g[s];
      let px = (c1 * b.y - a.y * c2) / det, py = (a.x * c2 - c1 * b.x) / det;
      if (px * px + py * py > K * K * 0.8) continue; // 円の中だけ
      // 交点が他の方向のどの帯にあるか → 頂点の整数座標
      let kk = [];
      for (let j = 0; j < 4; j++) kk.push(j === r ? kr : j === s ? ks : Math.ceil(px * E[j].x + py * E[j].y - g[j]));
      let corner = (dr, ds) => {
        let x = 0, y = 0;
        for (let j = 0; j < 4; j++) {
          let k = kk[j] + (j === r ? dr : 0) + (j === s ? ds : 0);
          x += k * E[j].x; y += k * E[j].y;
        }
        return { x, y };
      };
      let type = s - r === 2 ? 'square' : 'rhomb';
      tiles.push({ type, pts: [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)], cx: px, cy: py, dir: r * 4 + s });
    }
  }
}

function draw() {
  background(215, 30, 10);
  if (moving) { shift += 0.004; build(); }
  edge = min(width, height - 90) / (K * 1.85);
  let cx = width / 2, cy = height / 2 + 20;

  let nSq = 0, nRh = 0;
  stroke(220, 30, 15);
  strokeWeight(1);
  for (let t of tiles) {
    if (t.type === 'square') { fill(200, 45, 90); nSq++; }
    else { fill(t.dir === 1 || t.dir === 11 ? 40 : t.dir === 6 ? 25 : 50, 60, 95); nRh++; }
    let p = t.pts;
    quad(cx + p[0].x * edge * 0.5, cy + p[0].y * edge * 0.5, cx + p[1].x * edge * 0.5, cy + p[1].y * edge * 0.5,
         cx + p[2].x * edge * 0.5, cy + p[2].y * edge * 0.5, cx + p[3].x * edge * 0.5, cy + p[3].y * edge * 0.5);
  }

  // 格子線（おおよその位置。線 1 本 = タイルの帯 1 本、交点 1 つ = タイル 1 枚）
  if (showGrid) {
    stroke(330, 80, 100, 50);
    for (let j = 0; j < 4; j++) {
      let e = E[j];
      for (let k = -K; k <= K; k++) {
        let d = (k + gamma[j] + shift * (j % 2 === 0 ? 1 : -0.6)) * edge;
        let px = cx + e.x * d, py = cy + e.y * d;
        line(px - e.y * 2000, py + e.x * 2000, px + e.y * 2000, py - e.x * 2000);
      }
    }
  }
  // 八回対称の目印
  if (showOct) {
    noFill();
    stroke(0, 0, 100, 60);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < 8; i++) vertex(cx + edge * 3 * Math.cos(i * PI / 4 + PI / 8), cy + edge * 3 * Math.sin(i * PI / 4 + PI / 8));
    endShape(CLOSE);
  }

  noStroke();
  fill(0, 0, 0, 55);
  rect(0, 0, width, 84);
  fill(0, 0, 100);
  textSize(18);
  text('広さ K = ' + K + '（↑↓）　ずれ ' + nf(shift, 1, 2) + '（←→、スペース：動かす ' + (moving ? 'ON' : 'off') + '）　G：格子線 ' + (showGrid ? 'ON' : 'off') + '　O：八角形 ' + (showOct ? 'ON' : 'off'), 20, 36);
  fill(0, 0, 70);
  textSize(15);
  text('ひし形 ' + nRh + ' 枚 / 正方形 ' + nSq + ' 枚 = ' + nf(nRh / max(1, nSq), 1, 4) + '（→ √2 = 1.4142）　正方形 2 種類 × ひし形 4 種類の向き。拡大縮小の倍率は 1 + √2', 20, 64);
}

function keyPressed() {
  if (key === UP_ARROW) { K = min(K + 1, 14); build(); }
  if (key === DOWN_ARROW) { K = max(K - 1, 3); build(); }
  if (key === RIGHT_ARROW) { shift += 0.05; build(); }
  if (key === LEFT_ARROW) { shift -= 0.05; build(); }
  if (key === ' ') moving = !moving;
  if (key === 'g' || key === 'G') showGrid = !showGrid;
  if (key === 'o' || key === 'O') showOct = !showOct;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 正方形のまわりに 8 枚のひし形が集まった「八角形の星」を探そう
// 2. スペースでずらすと、タイルがところどころでパタッと入れかわる（フェイゾンフリップ）
// 3. gamma を全部 0.5 にすると？（線が 1 点で何本も交わってしまい、タイルが重なる）
// 4. 方向を 5 本（PI / 5 ずつ）にすると、黄金比のペンローズ・タイリングになる（シリーズ 32 と比べよう）

// ---------- 道具 ----------
// （このスケッチは配列 E の 4 方向ベクトルと quad() だけで描いている）
