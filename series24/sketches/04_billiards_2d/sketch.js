// ============================================
// 04 2 次元の衝突（ビリヤード）
// たくさんの円盤が弾性衝突をくり返す。最初は全員同じ速さでも、速さの分布はやがてマクスウェル＝ボルツマン分布になる
//   運動量の合計（黄色い矢印）とエネルギーの合計は、ぶつかっても変わらない
// スペース = やり直し（全員同じ速さ）/ ↑↓ = 円盤の数 / P = 周期境界 ↔ 壁 / M = 重い円盤を混ぜる / クリック = 速い円盤を追加
// ============================================

let N = 260;               // ★ 円盤の数
let R = 7;                 // ★ 円盤の半径 [px]
let speed0 = 120;          // ★ 最初の速さ [px/s]
let periodic = true;       // 周期境界（右から出たら左から入る）なら運動量も保存
let heavy = false;
let disks = [];
let arena, cell, grid;
let hist = [];
let BINS = 30;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  restart();
}

function restart() {
  arena = { x: width * 0.03, y: 100, w: width * 0.44, h: height - 150 };
  disks = [];
  hist = new Array(BINS).fill(0);
  let tries = 0;
  while (disks.length < N && tries++ < 20000) {
    let x = arena.x + R + Math.random() * (arena.w - 2 * R), y = arena.y + R + Math.random() * (arena.h - 2 * R);
    if (disks.some((d) => (d.x - x) ** 2 + (d.y - y) ** 2 < (2 * R + 1) ** 2)) continue;
    let a = Math.random() * TWO_PI, m = heavy && disks.length % 5 === 0 ? 4 : 1;
    disks.push({ x, y, vx: speed0 * cos(a), vy: speed0 * sin(a), m, r: m > 1 ? R * 1.6 : R });
  }
}

function draw() {
  background(200, 30, 10);
  let dt = 1 / 60, subs = 2;
  for (let s = 0; s < subs; s++) {
    for (let d of disks) {
      d.x += d.vx * dt / subs; d.y += d.vy * dt / subs;
      if (periodic) {
        if (d.x < arena.x) d.x += arena.w; if (d.x >= arena.x + arena.w) d.x -= arena.w;
        if (d.y < arena.y) d.y += arena.h; if (d.y >= arena.y + arena.h) d.y -= arena.h;
      } else {
        if (d.x < arena.x + d.r) { d.x = arena.x + d.r; d.vx = abs(d.vx); }
        if (d.x > arena.x + arena.w - d.r) { d.x = arena.x + arena.w - d.r; d.vx = -abs(d.vx); }
        if (d.y < arena.y + d.r) { d.y = arena.y + d.r; d.vy = abs(d.vy); }
        if (d.y > arena.y + arena.h - d.r) { d.y = arena.y + arena.h - d.r; d.vy = -abs(d.vy); }
      }
    }
    collideAll();
  }

  // 円盤（色 = 速さ）
  noStroke(); fill(0, 0, 6); rect(arena.x, arena.y, arena.w, arena.h);
  let px = 0, py = 0, KE = 0, M = 0;
  for (let d of disks) {
    let sp = sqrt(d.vx * d.vx + d.vy * d.vy);
    fill(map(constrain(sp, 0, speed0 * 2.5), 0, speed0 * 2.5, 230, 0), 70, 100);
    circle(d.x, d.y, d.r * 2);
    px += d.m * d.vx; py += d.m * d.vy; KE += 0.5 * d.m * sp * sp; M += d.m;
  }
  noFill(); stroke(0, 0, periodic ? 30 : 80); strokeWeight(periodic ? 1 : 3); rect(arena.x, arena.y, arena.w, arena.h);
  // ★ 運動量の合計（矢印、長さは 1 個あたりに直して表示）
  let cx = arena.x + arena.w / 2, cy = arena.y + arena.h / 2;
  stroke(55, 100, 100); strokeWeight(5); line(cx, cy, cx + px / M * 3, cy + py / M * 3);
  noStroke(); fill(55, 100, 100); circle(cx + px / M * 3, cy + py / M * 3, 12);

  drawHistogram(KE, M);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('円盤 ' + disks.length + ' 個（↑↓）　' + (periodic ? '周期境界（P）' : '壁あり（P）') + '　重い円盤 ' + (heavy ? 'あり' : 'なし') + '（M）　スペース：やり直し　クリック：速い円盤', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('運動量の合計 (' + nf(px, 1, 0) + ', ' + nf(py, 1, 0) + ')　運動エネルギーの合計 ' + nf(KE / 1000, 1, 1) + ' k　（壁ありだと運動量は壁にぶつかるたびに変わる。エネルギーは変わらない）', 20, 68);
}

// ★ 2 次元の弾性衝突：中心を結ぶ方向の速度成分だけを交換する（グリッドで近くだけ調べる）
function collideAll() {
  cell = R * 4; grid = new Map();
  for (let i = 0; i < disks.length; i++) {
    let d = disks[i], key2 = floor(d.x / cell) + ',' + floor(d.y / cell);
    if (!grid.has(key2)) grid.set(key2, []);
    grid.get(key2).push(i);
  }
  for (let i = 0; i < disks.length; i++) {
    let a = disks[i], gx = floor(a.x / cell), gy = floor(a.y / cell);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      let list = grid.get((gx + ox) + ',' + (gy + oy));
      if (!list) continue;
      for (let j of list) {
        if (j <= i) continue;
        let b = disks[j], dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        let dd = sqrt(d2), nx = dx / dd, ny = dy / dd;
        let rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;     // 近づく速さ（負なら近づいている）
        let over = (rr - dd) / 2;
        a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
        if (rel >= 0) continue;
        let J = (2 * rel) / (1 / a.m + 1 / b.m);                  // 弾性衝突の力積
        a.vx += (J / a.m) * nx; a.vy += (J / a.m) * ny;
        b.vx -= (J / b.m) * nx; b.vy -= (J / b.m) * ny;
      }
    }
  }
}

// 右：速さのヒストグラムと 2 次元のマクスウェル＝ボルツマン分布
function drawHistogram(KE, M) {
  let gx = width * 0.52, gy = height * 0.16, gw = width * 0.44, gh = height * 0.6, vmax = speed0 * 3;
  let counts = new Array(BINS).fill(0), light = disks.filter((d) => d.m === 1);
  for (let d of light) { let b = floor(sqrt(d.vx * d.vx + d.vy * d.vy) / vmax * BINS); if (b >= 0 && b < BINS) counts[b]++; }
  for (let i = 0; i < BINS; i++) hist[i] = hist[i] * 0.95 + counts[i] * 0.05;   // 少し時間平均
  noStroke(); fill(0, 0, 14); rect(gx, gy, gw, gh, 6);
  let bw = (gw - 40) / BINS, peak = max(4, max(hist) * 1.3);
  for (let i = 0; i < BINS; i++) {
    fill(map(i, 0, BINS / 2.5, 230, 0), 60, 90);
    let hh = hist[i] / peak * (gh - 60);
    rect(gx + 20 + i * bw, gy + gh - 30 - hh, bw - 2, hh);
  }
  // 理論：f(v) = (v/σ²) exp(−v²/2σ²)、σ² = kT/m（平均の運動エネルギーから）
  let mvv = light.reduce((s, d) => s + d.vx * d.vx + d.vy * d.vy, 0) / max(1, light.length);
  let s2 = mvv / 2;
  stroke(55, 90, 100); strokeWeight(2.5); noFill();
  beginShape();
  for (let i = 0; i <= 120; i++) {
    let v = (i / 120) * vmax, f = (v / s2) * exp(-v * v / (2 * s2)) * light.length * (vmax / BINS);
    vertex(gx + 20 + (v / vmax) * BINS * bw, gy + gh - 30 - f / peak * (gh - 60));
  }
  endShape();
  stroke(0, 0, 80); strokeWeight(1); drawingContext.setLineDash([4, 5]);
  let x0 = gx + 20 + (speed0 / vmax) * BINS * bw; line(x0, gy + 30, x0, gy + gh - 30);
  drawingContext.setLineDash([]);
  noStroke(); fill(0, 0, 70); textSize(13);
  text('速さの分布（軽い円盤）　点線 = 最初の速さ　黄色 = マクスウェル＝ボルツマン分布（2 次元）', gx + 8, gy + 18);
  textAlign(CENTER); text('速さ →', gx + gw / 2, gy + gh - 8); textAlign(LEFT, BASELINE);
}

function mousePressed() {
  if (mouseX > arena.x && mouseX < arena.x + arena.w && mouseY > arena.y && mouseY < arena.y + arena.h) {
    let a = Math.random() * TWO_PI;
    disks.push({ x: mouseX, y: mouseY, vx: speed0 * 4 * cos(a), vy: speed0 * 4 * sin(a), m: 1, r: R });
    if (disks.length > 600) disks.shift();
  }
}
function keyPressed() {
  if (key === ' ') restart();
  if (key === UP_ARROW) { N = min(N + 60, 500); restart(); }
  if (key === DOWN_ARROW) { N = max(N - 60, 20); restart(); }
  if (key === 'p' || key === 'P') periodic = !periodic;
  if (key === 'm' || key === 'M') { heavy = !heavy; restart(); }
}

// ---------- やってみよう ----------
// 1. スペースでやり直して、全員同じ速さ（点線に集中）から黄色い曲線になるまでの時間を見る
// 2. 円盤を減らす（20 個）と分布になるまで時間がかかる。なぜ？（ぶつかる回数）
// 3. M で重い円盤を混ぜる。重い円盤は遅く、軽い円盤は速くなる。でも ½mv² の平均は同じ（エネルギー等分配）
// 4. 1 個だけ速い円盤をクリックで入れると、その速さは全体に広がっていく（熱が伝わる）
