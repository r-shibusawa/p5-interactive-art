// ============================================
// 10 ラムゼー理論：R(3,3) = 6
// 6 人のパーティでは「3 人が互いに知り合い」か「3 人が互いに他人」が必ずいる
// 完全グラフ K_6 の 15 本の辺をどう 2 色に塗っても、単色の三角形が必ずできる。K_5 なら避けられる
// 5 / 6 = 頂点の数 / クリック = 辺の色を切り替え / スペース = ランダムに塗る / E = K_5 の回避例 / A = 自動で塗り直し
// ============================================

let V = 6;                  // ★ 頂点の数（5 か 6）
let col = [];               // col[i][j] = 0（赤）or 1（青）
let auto = false;
let tick = 0;
let found = [];             // 単色三角形の一覧 [[i,j,k], …]
let flash = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomColor();
}

function vpos(i) {
  let cx = width * 0.4, cy = height * 0.55, R = Math.min(width, height) * 0.33;
  let a = -HALF_PI + (i * TWO_PI) / V;
  return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
}

function randomColor() {
  col = [];
  for (let i = 0; i < V; i++) { col.push([]); for (let j = 0; j < V; j++) col[i].push(0); }
  for (let i = 0; i < V; i++) for (let j = i + 1; j < V; j++) { col[i][j] = col[j][i] = Math.random() < 0.5 ? 0 : 1; }
  findTriangles();
}

// K_5 の回避例：隣（距離 1）は赤、2 つ先（距離 2）は青 → 五角形と五芒星
function avoidExample() {
  V = 5;
  col = [];
  for (let i = 0; i < V; i++) { col.push([]); for (let j = 0; j < V; j++) col[i].push(0); }
  for (let i = 0; i < V; i++) for (let j = i + 1; j < V; j++) { let d = Math.min(j - i, V - (j - i)); col[i][j] = col[j][i] = d === 1 ? 0 : 1; }
  findTriangles();
}

// ★ 単色三角形を全部探す（3 頂点の組合せ C(V,3) 通りを調べるだけ）
function findTriangles() {
  found = [];
  for (let i = 0; i < V; i++) for (let j = i + 1; j < V; j++) for (let k = j + 1; k < V; k++) {
    if (col[i][j] === col[j][k] && col[j][k] === col[i][k]) found.push([i, j, k, col[i][j]]);
  }
  flash = 1;
}

function draw() {
  background(228, 28, 11);
  if (auto) { tick += deltaTime / 1000; if (tick > 0.8) { tick = 0; randomColor(); } }
  flash *= 0.96;

  // 三角形の塗り
  noStroke();
  for (let t of found) {
    let a = vpos(t[0]), b = vpos(t[1]), c = vpos(t[2]);
    fill(t[3] === 0 ? 0 : 215, 80, 100, 10 + flash * 20);
    triangle(a.x, a.y, b.x, b.y, c.x, c.y);
  }
  // 辺
  for (let i = 0; i < V; i++) for (let j = i + 1; j < V; j++) {
    let a = vpos(i), b = vpos(j);
    let inTri = found.some((t) => t.includes(i) && t.includes(j) && t.indexOf(i) < 3 && t.indexOf(j) < 3);
    stroke(col[i][j] === 0 ? 0 : 215, 80, inTri ? 100 : 70);
    strokeWeight(inTri ? 7 : 3);
    line(a.x, a.y, b.x, b.y);
  }
  // 頂点
  for (let i = 0; i < V; i++) {
    let p = vpos(i);
    noStroke(); fill(0, 0, 100); circle(p.x, p.y, 34);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(16); text(i + 1, p.x, p.y);
  }
  textAlign(LEFT, BASELINE);

  // 右パネル
  let px = width * 0.72, py = 130;
  noStroke(); fill(0, 0, 100, 8); rect(px - 16, py - 30, width - px, 330, 10);
  fill(0, 0, 100); textSize(22);
  text('K_' + V + '：辺 ' + (V * (V - 1)) / 2 + ' 本、三角形 ' + choose(V, 3) + ' 個', px, py);
  textSize(16);
  let reds = found.filter((t) => t[3] === 0).length, blues = found.length - reds;
  fill(0, 80, 100); text('赤の三角形：' + reds, px, py + 36);
  fill(215, 80, 100); text('青の三角形：' + blues, px, py + 60);
  fill(found.length === 0 ? 130 : 50, 80, 100); textSize(18);
  text(found.length === 0 ? '単色三角形なし！' : '単色三角形 ' + found.length + ' 個', px, py + 96);
  fill(0, 0, 70); textSize(14);
  if (V === 6) {
    text('証明：頂点 1 から出る 5 本の辺は、同じ色が 3 本以上', px, py + 130);
    text('ある（鳩の巣）。その 3 本の先 a, b, c のどれか 2 つが', px, py + 150);
    text('同じ色なら 1 と三角形、全部ちがえば a b c が三角形', px, py + 170);
    text('→ 2^15 = 32768 通りの塗り方すべてで起こる', px, py + 196);
  } else {
    text('K_5 では避けられる：五角形を赤、五芒星を青（E）', px, py + 130);
    text('→ R(3,3) = 6（5 では足りず 6 で必ず起こる）', px, py + 150);
    text('ランダムに塗ると約 1/2^... で避けられる。何回に 1 回？', px, py + 176);
  }
  text('R(4,4) = 18、R(5,5) は 43〜46 の間（未解決！）', px, py + 228);
  text('「宇宙人が R(6,6) を要求したら…」（エルデシュ）', px, py + 250);

  fill(0, 0, 100); textSize(18);
  text('頂点 ' + V + '（5 / 6）　クリック：辺の色を変える　スペース：ランダム　E：K_5 の回避例　A：自動 ' + (auto ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text(V === 6 ? '辺をクリックして単色三角形を 0 にしてみよう ─ できない（赤 = 知り合い、青 = 他人）' : 'K_5 なら単色三角形なしの塗り方がある。見つけてみよう（E で答え）', 20, 68);
}

function choose(a, b) { let r = 1; for (let i = 1; i <= b; i++) r = (r * (a - b + i)) / i; return Math.round(r); }

// 点と線分の距離
function segDist(px, py, a, b) {
  let dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  let t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function mousePressed() {
  let best = null, bd = 12;
  for (let i = 0; i < V; i++) for (let j = i + 1; j < V; j++) {
    let d = segDist(mouseX, mouseY, vpos(i), vpos(j));
    // 頂点のそばで複数の辺が重なるので、中点に近い方を優先
    let a = vpos(i), b = vpos(j), mid = Math.hypot(mouseX - (a.x + b.x) / 2, mouseY - (a.y + b.y) / 2);
    if (d < bd || (d < 12 && best && mid < best.mid)) { bd = d; best = { i, j, mid }; }
  }
  if (best) { col[best.i][best.j] = col[best.j][best.i] = 1 - col[best.i][best.j]; findTriangles(); auto = false; }
}

function keyPressed() {
  if (key === '5' && V !== 5) { V = 5; randomColor(); }
  if (key === '6' && V !== 6) { V = 6; randomColor(); }
  if (key === ' ') randomColor();
  if (key === 'e' || key === 'E') avoidExample();
  if (key === 'a' || key === 'A') auto = !auto;
}

// ---------- やってみよう ----------
// 1. K_6 で辺を 1 本ずつクリックし、単色三角形を減らしてみる。最小はいくつ？（2 個）
// 2. K_5 でランダムに塗って、単色三角形なしが出るまで何回かかる？（A で自動）
// 3. 色を 3 色にすると、避けられなくなるのは K_17（R(3,3,3) = 17）。col の値を 0〜2 にして K_7 くらいで試そう
// 4. 「3 人が互いに知り合い」を「4 人」に変えると R(4,4) = 18。V を 18 にしたら三角形の代わりに K_4 を探す
