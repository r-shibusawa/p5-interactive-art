// ============================================
// 13 群ロボット（swarm）
// 1 台は単純でも、たくさん集まると「群れ」として形をつくる。中央の司令塔はなく、各ロボットは近くの仲間しか見ない
//   1 群れ（boids）：離れすぎない・近すぎない・向きをそろえる
//   2〜4 隊形：各ロボットに「席」を割り当てて向かう（円・一列・V 字）
//   5 合意（rendezvous）：近くの仲間の平均位置へ動く → 全員が 1 点に集まる
// クリック = 集合点 / 1〜5 = 行動 / ↑↓ = 台数 / O = 障害物 ON/OFF / R = ばらまく
// ============================================

let bots = [];              // {x, y, vx, vy}
let N = 30;                 // ★ 台数
let mode = 1;
let center;                 // 集合点・隊形の中心
let obstacles = [];
let useObs = true;
let maxSpeed = 2.4;         // ★ 最高速度
let viewR = 90;             // ★ 仲間が見える距離
let names = ['', '群れ（boids）', '円の隊形', '一列の隊形', 'V 字の隊形', '合意（集まる）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  center = { x: width / 2, y: height / 2 + 40 };
  obstacles = [{ x: width * 0.3, y: height * 0.4, r: 50 }, { x: width * 0.68, y: height * 0.65, r: 65 }];
  scatter();
}
function scatter() { bots = []; for (let i = 0; i < N; i++) bots.push({ x: random(width), y: random(110, height), vx: random(-1, 1), vy: random(-1, 1) }); }

// ★ 隊形の「席」：i 番目のロボットの目標位置
function slot(i) {
  let k = i - (N - 1) / 2;
  if (mode === 2) { let a = TWO_PI * i / N; return { x: center.x + 160 * cos(a), y: center.y + 160 * sin(a) }; }
  if (mode === 3) return { x: center.x + k * 22, y: center.y };
  if (mode === 4) { let s = i % 2 === 0 ? 1 : -1, m = ceil(i / 2); return { x: center.x - m * 18, y: center.y + s * m * 18 }; }
  return center;
}

function draw() {
  background(215, 35, 12);
  for (let i = 0; i < N; i++) {
    let b = bots[i];
    let ax = 0, ay = 0;
    if (mode === 1) {
      // 群れ：分離・整列・結合（近くの仲間だけ見る）
      let sx = 0, sy = 0, vx = 0, vy = 0, cx = 0, cy = 0, n = 0;
      for (let o of bots) {
        if (o === b) continue;
        let dx = o.x - b.x, dy = o.y - b.y, d = sqrt(dx * dx + dy * dy);
        if (d > viewR || d < 0.01) continue;
        n++;
        if (d < 30) { sx -= dx / d * (30 - d) / 30; sy -= dy / d * (30 - d) / 30; }   // 分離
        vx += o.vx; vy += o.vy;                                                       // 整列
        cx += o.x; cy += o.y;                                                         // 結合
      }
      if (n) { ax += sx * 0.6 + (vx / n - b.vx) * 0.05 + (cx / n - b.x) * 0.004; ay += sy * 0.6 + (vy / n - b.vy) * 0.05 + (cy / n - b.y) * 0.004; }
      ax += (center.x - b.x) * 0.0006; ay += (center.y - b.y) * 0.0006;               // ゆるく集合点へ
    } else if (mode === 5) {
      // 合意：見える仲間の平均位置へ（自分も含む）
      let cx = b.x, cy = b.y, n = 1;
      for (let o of bots) { let d = sqrt(sq(o.x - b.x) + sq(o.y - b.y)); if (o !== b && d < viewR * 1.6) { cx += o.x; cy += o.y; n++; } }
      ax += (cx / n - b.x) * 0.05; ay += (cy / n - b.y) * 0.05;
    } else {
      // 隊形：自分の席へ。ぶつからないように分離も少し
      let s = slot(i);
      ax += (s.x - b.x) * 0.02; ay += (s.y - b.y) * 0.02;
      for (let o of bots) { let dx = o.x - b.x, dy = o.y - b.y, d = sqrt(dx * dx + dy * dy); if (o !== b && d < 14 && d > 0.01) { ax -= dx / d * 0.3; ay -= dy / d * 0.3; } }
    }
    // 障害物から離れる
    if (useObs) for (let o of obstacles) {
      let dx = b.x - o.x, dy = b.y - o.y, d = sqrt(dx * dx + dy * dy);
      if (d < o.r + 40 && d > 0.01) { let f = (o.r + 40 - d) / 40; ax += dx / d * f * 0.5; ay += dy / d * f * 0.5; }
    }
    b.vx = (b.vx + ax) * 0.95; b.vy = (b.vy + ay) * 0.95;      // 慣性と摩擦
    let sp = sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > maxSpeed) { b.vx *= maxSpeed / sp; b.vy *= maxSpeed / sp; }
    b.x += b.vx; b.y += b.vy;
    if (b.x < 10) { b.x = 10; b.vx = abs(b.vx); } if (b.x > width - 10) { b.x = width - 10; b.vx = -abs(b.vx); }
    if (b.y < 100) { b.y = 100; b.vy = abs(b.vy); } if (b.y > height - 10) { b.y = height - 10; b.vy = -abs(b.vy); }
  }

  noStroke();
  if (useObs) { fill(0, 60, 70); for (let o of obstacles) circle(o.x, o.y, o.r * 2); }
  // 席（隊形モード）
  if (mode >= 2 && mode <= 4) { fill(0, 0, 100, 20); for (let i = 0; i < N; i++) { let s = slot(i); circle(s.x, s.y, 8); } }
  fill(120, 80, 100, 70); circle(center.x, center.y, 14);
  // 仲間どうしの線（群れと合意）
  if (mode === 1 || mode === 5) {
    stroke(170, 60, 100, 15); strokeWeight(1);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      let d = sqrt(sq(bots[i].x - bots[j].x) + sq(bots[i].y - bots[j].y));
      if (d < viewR) line(bots[i].x, bots[i].y, bots[j].x, bots[j].y);
    }
  }
  for (let i = 0; i < N; i++) {
    let b = bots[i];
    push(); translate(b.x, b.y); rotate(atan2(b.vy, b.vx));
    noStroke(); fill(map(i, 0, N, 170, 330), 60, 95); rect(-9, -7, 18, 14, 3);
    fill(0, 0, 100); triangle(9, 0, 3, -4, 3, 4);
    pop();
  }
  // 群れの広がり（平均からの距離の平均）
  let mx = 0, my = 0; for (let b of bots) { mx += b.x; my += b.y; } mx /= N; my /= N;
  let spread = 0; for (let b of bots) spread += sqrt(sq(b.x - mx) + sq(b.y - my)); spread /= N;

  noStroke(); fill(0, 0, 100); textSize(18);
  text('行動：' + names[mode] + '（1〜5）　' + N + ' 台（↑↓）　クリック：集合点　O：障害物 ' + (useObs ? 'ON' : 'off') + '　R：ばらまく　広がり ' + nf(spread, 1, 0) + ' px', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('各ロボットは半径 ' + viewR + ' px 以内の仲間しか見えない（薄い線）。それでも全体として形ができる = 創発。5 は全員の平均に収束する「合意アルゴリズム」', 20, 68);
}

function mousePressed() { if (mouseY > 90) center = { x: mouseX, y: mouseY }; }
function keyPressed() {
  if (key >= '1' && key <= '5') mode = int(key);
  if (key === UP_ARROW) { N = min(80, N + 10); scatter(); }
  if (key === DOWN_ARROW) { N = max(10, N - 10); scatter(); }
  if (key === 'o' || key === 'O') useObs = !useObs;
  if (key === 'r' || key === 'R') scatter();
}

// ---------- やってみよう ----------
// 1. viewR を 30 にすると群れが分裂する。合意（5）は 1 点に集まれる？（グラフがつながっていないと平均が一致しない）
// 2. 隊形の席を自分で設計しよう（ハート、文字、十字）。slot() に mode 6 を追加
// 3. 群れ（1）で分離を 0 にするとどうなる？ 整列を 0 にすると？ 3 つの力の役割
// 4. 障害物の間を V 字隊形が通り抜けられる？ 通れないなら「隊形を一時的にくずす」ルールを考えよう
