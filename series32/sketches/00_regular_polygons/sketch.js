// ============================================
// 00 正多角形で平面を埋める
// 1 種類の正多角形だけで、すき間なく・重ならずに平面を埋められるのはどれ？
//   1 つの頂点に集まる角の合計がちょうど 360° のときだけ埋まる → 正三角形・正方形・正六角形の 3 つだけ
// 3〜8 = 正 n 角形 / スペース = 頂点のまわりに置き直す / ←→ = 回転 / ↑↓ = 大きさ
// ============================================

let n = 5;             // ★ 正 n 角形（3〜8 キーで変える）
let side = 60;         // ★ 1 辺の長さ（ピクセル）
let placed = 0;        // 左：頂点のまわりに置いた枚数
let timer = 0;
let spin = 0;          // 全体の回転（ラジアン）
let spread = [];       // 右：となりに次々と並べた多角形

// ★ 色（n ごと）
let palette = { 3: [255, 140, 105], 4: [120, 200, 255], 5: [255, 210, 90], 6: [140, 230, 160], 7: [200, 150, 255], 8: [255, 130, 190] };

function setup() {
  createCanvas(windowWidth, windowHeight);
  makeSpread();
}

function draw() {
  background(18, 20, 28);
  let a = interiorAngle(n);
  let fit = Math.floor(TWO_PI / a + 1e-9);   // 頂点のまわりに何枚入るか

  // 左：1 つの頂点のまわりに 1 枚ずつ置く
  timer++;
  if (timer % 40 === 0 && placed < fit + 1) placed++;
  drawVertexDemo(width * 0.25, height * 0.56, a, fit);

  // 右：となりへ、となりへと並べていく（重なると濃くなる）
  let ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(width * 0.5, 90, width * 0.5, height - 180);
  ctx.clip();
  for (let p of spread) drawPoly(p, palette[n], 70);
  ctx.restore();
  noFill();
  stroke(60, 64, 80);
  rect(width * 0.5, 90, width * 0.5 - 1, height - 180);

  // 説明
  let deg = (180 * (n - 2)) / n;
  let total = deg * fit;
  noStroke();
  fill(240);
  textSize(20);
  text('正 ' + n + ' 角形（3〜8 キー）　1 つの角 = 180 × (n − 2) / n = ' + nf(deg, 1, 1) + '°', 20, 36);
  textSize(15);
  fill(180);
  text('左：1 つの頂点に ' + fit + ' 枚 → 合計 ' + nf(total, 1, 1) + '°　' + (abs(total - 360) < 0.01 ? 'ぴったり 360°！ 平面が埋まる' : '360° まで あと ' + nf(360 - total, 1, 1) + '° のすき間（もう 1 枚は重なる）'), 20, 62);
  text('右：辺どうしをくっつけて、となりへ広げた様子。重なった所は濃く見える', width * 0.5 + 10, height - 60);
  drawTable(20, height - 150);
}

// 1 つの角（ラジアン）
function interiorAngle(k) {
  return PI - TWO_PI / k;
}

// 頂点 (vx, vy) のまわりに placed 枚並べる
function drawVertexDemo(vx, vy, a, fit) {
  for (let k = 0; k < placed; k++) {
    let th = spin + k * a;
    let pts = polyFromVertex(vx, vy, th, side * 1.1, n);
    let over = k >= fit;               // 入りきらなかった 1 枚
    drawPoly(pts, over ? [255, 70, 70] : palette[n], over ? 120 : 200);
  }
  // すき間を黄色の扇形で見せる
  let rest = TWO_PI - fit * a;
  if (placed >= fit && rest > 0.01) {
    noStroke();
    fill(255, 230, 0, 90);
    arc(vx, vy, 120, 120, spin + fit * a, spin + TWO_PI, PIE);
    fill(255, 230, 0);
    textSize(16);
    let mid = spin + fit * a + rest / 2;
    text(nf(degreesOf(rest), 1, 1) + '°', vx + Math.cos(mid) * 80 - 18, vy + Math.sin(mid) * 80 + 6);
  }
  fill(255);
  noStroke();
  circle(vx, vy, 8);
}

// 頂点 (vx, vy) から角度 th の向きに 1 辺を伸ばし、左回りに正 k 角形を作る
function polyFromVertex(vx, vy, th, s, k) {
  let pts = [], x = vx, y = vy, d = th;
  for (let i = 0; i < k; i++) {
    pts.push([x, y]);
    x += Math.cos(d) * s;
    y += Math.sin(d) * s;
    d += TWO_PI / k;
  }
  return pts;
}

// 真ん中の多角形から、辺で「折り返して」となりを次々に作る（幅優先）
function makeSpread() {
  let depth = { 3: 12, 4: 8, 6: 6, 5: 2 }[n] || 1;   // ★ 埋まらない形は 1〜2 周まで
  let cx = width * 0.75, cy = height * 0.5;
  let r = side / (2 * Math.sin(PI / n));
  let first = [];
  for (let i = 0; i < n; i++) first.push([cx + r * Math.cos(spin + (TWO_PI * i) / n), cy + r * Math.sin(spin + (TWO_PI * i) / n)]);
  spread = [first];
  let seen = new Set([keyOf(first)]);
  let front = [first];
  for (let d = 0; d < depth; d++) {
    let next = [];
    for (let p of front) {
      for (let i = 0; i < n; i++) {
        let q = p.map((v) => reflectPt(v, p[i], p[(i + 1) % n]));
        let k = keyOf(q);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(q);
      }
    }
    spread.push(...next);
    front = next;
    if (spread.length > 900) break;
  }
}

function keyOf(p) {
  let x = 0, y = 0;
  for (let v of p) { x += v[0]; y += v[1]; }
  return Math.round(x / p.length) + ',' + Math.round(y / p.length);
}

function keyPressed() {
  if (key >= '3' && key <= '8') { n = int(key); placed = 0; timer = 0; makeSpread(); }
  if (key === ' ') { placed = 0; timer = 0; }
  if (key === LEFT_ARROW) { spin -= 0.1; makeSpread(); }
  if (key === RIGHT_ARROW) { spin += 0.1; makeSpread(); }
  if (key === UP_ARROW) { side = Math.min(120, side + 8); makeSpread(); }
  if (key === DOWN_ARROW) { side = Math.max(24, side - 8); makeSpread(); }
  if (key === 's' || key === 'S') saveCanvas('regular_tiling', 'png');
}

// ---------- やってみよう ----------
// 1. 3・4・6 だけが「ぴったり 360°」。5・7・8 で残る角度を記録して表にしよう
// 2. 8（正八角形）のすき間は何の形？ → 正方形を足すと 01 の「4.8.8」になる
// 3. 角の合計の式 180 × (n − 2) / n × 枚数 = 360 を解くと、なぜ 3 つしかないか分かる


// ==================================================
// ここから下は「図形の道具」（多角形を描く・折り返す・表を描く）
// ==================================================
function drawPoly(pts, c, a) {
  stroke(20, 22, 30);
  strokeWeight(2);
  fill(c[0], c[1], c[2], a);
  beginShape();
  for (let v of pts) vertex(v[0], v[1]);
  endShape(CLOSE);
}

// 点 v を直線 p-q で折り返す
function reflectPt(v, p, q) {
  let dx = q[0] - p[0], dy = q[1] - p[1];
  let t = ((v[0] - p[0]) * dx + (v[1] - p[1]) * dy) / (dx * dx + dy * dy);
  let fx = p[0] + t * dx, fy = p[1] + t * dy;
  return [2 * fx - v[0], 2 * fy - v[1]];
}

function degreesOf(r) {
  return (r * 180) / Math.PI;
}

function drawTable(x, y) {
  textSize(14);
  noStroke();
  for (let k = 3; k <= 8; k++) {
    let deg = (180 * (k - 2)) / k, q = 360 / deg;
    let good = abs(q - Math.round(q)) < 1e-6;
    fill(k === n ? 255 : 150);
    text('正' + k + '角形  ' + nf(deg, 1, 1) + '°   360 ÷ 角 = ' + nf(q, 1, 2) + (good ? '  ○' : '  ×'), x, y + (k - 3) * 20);
  }
}
