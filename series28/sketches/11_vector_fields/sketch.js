// ============================================
// 11 ベクトル場と流れ
// 平面の各点に矢印（ベクトル）を置いたものがベクトル場。矢印に沿って流すと流線ができる
//   場が 0 になる点（特異点）には「指数」がある：わき出し・吸い込み・渦 = +1、鞍点 = −1。小さな円を 1 周したとき矢印が何回まわるか
// クリック = +1 の点 / Shift + クリック = −1 の点（鞍点）/ ←→ = 場を回す（わき出し → 渦）/ ↑↓ = 調べる円の半径 / 1〜4 = 例 / A = 矢印 / C = 消す
// ============================================

let sing = [];                  // 特異点 {x, y, s: +1 か −1}（画面座標）
let rot = 0;                    // ★ 場全体を回す角度（0 = わき出し、π/2 = 渦、π = 吸い込み）
let probeR = 80;                // ★ 指数を調べる円の半径（px）
let showArrows = true;
let NP = 1800;                  // ★ 流れる粒子の数
let parts = [], trails;

function setup() {
  createCanvas(windowWidth, windowHeight);
  trails = createGraphics(width, height);
  trails.background(14, 16, 26);
  for (let i = 0; i < NP; i++) parts.push(newPart());
  preset(1);
}
function newPart() { return { x: Math.random() * width, y: Math.random() * height, life: 40 + Math.random() * 120 }; }

// ★ ベクトル場：複素数で f(z) = e^{i rot} × Π (z − cₖ) または (z̄ − c̄ₖ)。+1 の点は z − c、−1 の点は共役
function field(x, y) {
  let re = Math.cos(rot), im = Math.sin(rot);
  for (let p of sing) {
    let a = (x - p.x) / 100, b = (y - p.y) / 100;
    if (p.s < 0) b = -b;
    let nr = re * a - im * b, ni = re * b + im * a;
    re = nr; im = ni;
  }
  return [re, im];   // 画面の y は下向きなので、そのまま使うと見た目の回転向きも保たれる
}

function preset(k) {
  let cx = width / 2, cy = height / 2;
  if (k === 1) sing = [{ x: cx, y: cy, s: 1 }];
  if (k === 2) sing = [{ x: cx - 180, y: cy, s: 1 }, { x: cx + 180, y: cy, s: 1 }];
  if (k === 3) sing = [{ x: cx - 200, y: cy, s: 1 }, { x: cx, y: cy, s: -1 }, { x: cx + 200, y: cy, s: 1 }];
  if (k === 4) sing = [{ x: cx, y: cy, s: -1 }];
  trails.background(14, 16, 26);
}

// 円に沿って 1 周したときに、矢印が何回まわるか（回転数 = 指数の合計）
function windingNumber(cx, cy, r) {
  let total = 0, prev = null, n = 360;
  for (let i = 0; i <= n; i++) {
    let a = (i / n) * TWO_PI, v = field(cx + r * Math.cos(a), cy + r * Math.sin(a));
    let ang = Math.atan2(v[1], v[0]);
    if (prev !== null) { let d = ang - prev; while (d > PI) d -= TWO_PI; while (d < -PI) d += TWO_PI; total += d; }
    prev = ang;
  }
  return Math.round(total / TWO_PI);
}

function draw() {
  // 流れ：粒子を場の向きに動かし、薄く消えていく軌跡を描く
  trails.noStroke(); trails.fill(14, 16, 26, 18); trails.rect(0, 0, width, height);
  trails.strokeWeight(1.5);
  for (let p of parts) {
    let v = field(p.x, p.y), m = Math.hypot(v[0], v[1]);
    if (m < 1e-9 || !isFinite(m)) { Object.assign(p, newPart()); continue; }
    let sp = 1.6 * Math.min(1.5, Math.pow(m, 0.3));   // 速さは控えめに
    let nx = p.x + (v[0] / m) * sp, ny = p.y + (v[1] / m) * sp;
    trails.stroke(120 + 100 * Math.min(1, m / 3), 180, 255, 140);
    trails.line(p.x, p.y, nx, ny);
    p.x = nx; p.y = ny; p.life--;
    if (p.life < 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) Object.assign(p, newPart());
  }
  image(trails, 0, 0);

  // 矢印の格子
  if (showArrows) {
    stroke(255, 255, 255, 90); strokeWeight(1);
    for (let x = 20; x < width; x += 40) for (let y = 100; y < height; y += 40) {
      let v = field(x, y), m = Math.hypot(v[0], v[1]) || 1, dx = (v[0] / m) * 14, dy = (v[1] / m) * 14;
      line(x - dx / 2, y - dy / 2, x + dx / 2, y + dy / 2);
      let a = Math.atan2(dy, dx);
      line(x + dx / 2, y + dy / 2, x + dx / 2 - 5 * Math.cos(a - 0.5), y + dy / 2 - 5 * Math.sin(a - 0.5));
    }
  }
  // 特異点
  for (let p of sing) {
    noStroke(); fill(p.s > 0 ? [255, 120, 100] : [100, 200, 255]); circle(p.x, p.y, 16);
    fill(0); textSize(12); textAlign(CENTER, CENTER); text(p.s > 0 ? '+' : '−', p.x, p.y); textAlign(LEFT, BASELINE);
  }
  // マウスの位置の円で指数を調べる
  let w = windingNumber(mouseX, mouseY, probeR);
  noFill(); stroke(255, 230, 90); strokeWeight(2); circle(mouseX, mouseY, 2 * probeR);
  for (let i = 0; i < 12; i++) {   // 円の上の矢印（回転を見るため）
    let a = (i / 12) * TWO_PI, x = mouseX + probeR * Math.cos(a), y = mouseY + probeR * Math.sin(a);
    let v = field(x, y), m = Math.hypot(v[0], v[1]) || 1;
    stroke(255, 230, 90); line(x, y, x + (v[0] / m) * 22, y + (v[1] / m) * 22);
  }
  noStroke(); fill(255, 230, 90); textSize(18); text('指数 ' + (w > 0 ? '+' : '') + w, mouseX + probeR + 8, mouseY);

  let total = sing.reduce((a, p) => a + p.s, 0);
  noStroke(); fill(0, 0, 0, 170); rect(0, 0, width, 90);
  fill(255); textSize(18);
  text('クリック：+1 の点　Shift + クリック：−1（鞍点）　←→：場を回す ' + nf(degrees(rot) % 360, 1, 0) + '°　↑↓：円の半径　1〜4：例　A：矢印　C：消す', 20, 34);
  fill(170); textSize(15);
  text('黄色の円を 1 周すると矢印が何回まわるか = 円の中の特異点の指数の合計。←→ でわき出しを渦に変えても指数は +1 のまま', 20, 62);
  fill(0, 0, 0, 170); rect(0, height - 70, width, 70);
  fill(255); textSize(16);
  text('特異点の指数の合計 = ' + total + '　　この場を球面に貼ると（01 の立体射影）、無限遠点（北極）の指数 = 2 − (' + total + ') = ' + (2 - total), 20, height - 40);
  fill(170); textSize(14);
  text('ポアンカレ＝ホップの定理：球面上のベクトル場の指数の合計は必ず χ(球面) = 2。だから「毛の生えたボールはどこかにつむじがある」', 20, height - 16);
}

function mousePressed() {
  if (mouseY < 90 || mouseY > height - 70) return;
  // 近くの点をクリックしたら消す
  for (let i = 0; i < sing.length; i++) if (dist(mouseX, mouseY, sing[i].x, sing[i].y) < 12) { sing.splice(i, 1); return; }
  if (sing.length < 8) sing.push({ x: mouseX, y: mouseY, s: keyIsDown(SHIFT) ? -1 : 1 });
}
function keyPressed() {
  if (key === LEFT_ARROW) rot -= PI / 8;
  if (key === RIGHT_ARROW) rot += PI / 8;
  if (key === UP_ARROW) probeR = min(400, probeR + 20);
  if (key === DOWN_ARROW) probeR = max(20, probeR - 20);
  if ('1234'.includes(key) && key.length === 1) preset(int(key));
  if (key === 'a' || key === 'A') showArrows = !showArrows;
  if (key === 'c' || key === 'C') { sing = []; trails.background(14, 16, 26); }
}

// ---------- やってみよう ----------
// 1. 例 3（+1, −1, +1）：大きな円で 3 つ全部を囲むと指数は？ 1 つずつ囲むと？（足し算になっている）
// 2. ←→ で 90° 回すと、わき出しは渦（台風）に、鞍点は向きの変わった鞍点になる。指数は変わらない
// 3. 特異点を 1 つも置かないと、場はどこでも同じ向き。球面に貼ると北極の指数は 2（双極子のつむじ）
// 4. field を「(z − c)²」にすると指数 +2 の点が作れる。どんな模様になる？
