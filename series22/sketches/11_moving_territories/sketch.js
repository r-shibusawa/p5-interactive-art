// ============================================
// 11 ボロノイで動く群れと領域（なわばり）
// 動き回る生き物のなわばり = 毎フレーム作り直すボロノイ図。下のグラフは各自のなわばりの広さの移り変わり
//   クリックで「捕食者」を放す：いちばん近い獲物を追い、近くの獲物は逃げる → なわばりの形が大きく変わる
// クリック = 捕食者 / A = 獲物を追加 / スペース = 一時停止 / ↑↓ = 速さ / C = 捕食者を消す / R = 最初から
// ============================================

let prey = [];
let preds = [];
let nPrey = 28;           // ★ 獲物の数
let speed = 1.5;          // ★ 獲物の速さ
let paused = false;
let cells = [];
let strip;                // 面積のグラフ（1 フレームに 1 列ずつ描き足す）
let bounds;
let eaten = 0;
let fear = 160;           // ★ 捕食者から逃げはじめる距離

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  bounds = { x0: 0, y0: 90, x1: width, y1: height - 150 };
  strip = createGraphics(width, 140);
  strip.colorMode(HSB, 360, 100, 100, 100);
  strip.background(230, 25, 8);
  reset();
}
function reset() {
  prey = []; preds = []; eaten = 0;
  for (let i = 0; i < nPrey; i++) addPrey(random(bounds.x0 + 20, bounds.x1 - 20), random(bounds.y0 + 20, bounds.y1 - 20));
}
function addPrey(x, y) {
  let a = random(TWO_PI);
  prey.push({ x, y, vx: cos(a), vy: sin(a), hue: random(360) });
}

function moveAll() {
  for (let p of prey) {
    // 捕食者から逃げる
    for (let q of preds) {
      let dx = p.x - q.x, dy = p.y - q.y, d = sqrt(dx * dx + dy * dy) + 0.01;
      if (d < fear) { p.vx += dx / d * 0.3; p.vy += dy / d * 0.3; }
    }
    p.vx += random(-0.1, 0.1); p.vy += random(-0.1, 0.1);
    let v = sqrt(p.vx * p.vx + p.vy * p.vy) || 1, vmax = preds.length ? 1.6 : 1;
    p.vx = p.vx / v * min(v, vmax); p.vy = p.vy / v * min(v, vmax);
    p.x += p.vx * speed; p.y += p.vy * speed;
    // 壁ではね返る
    if (p.x < bounds.x0 + 5) { p.x = bounds.x0 + 5; p.vx = abs(p.vx); }
    if (p.x > bounds.x1 - 5) { p.x = bounds.x1 - 5; p.vx = -abs(p.vx); }
    if (p.y < bounds.y0 + 5) { p.y = bounds.y0 + 5; p.vy = abs(p.vy); }
    if (p.y > bounds.y1 - 5) { p.y = bounds.y1 - 5; p.vy = -abs(p.vy); }
  }
  // 捕食者：いちばん近い獲物を追う。つかまえたら食べる
  for (let q of preds) {
    let best = null, bd = Infinity;
    for (let p of prey) { let d = dist(p.x, p.y, q.x, q.y); if (d < bd) { bd = d; best = p; } }
    if (!best) continue;
    let dx = best.x - q.x, dy = best.y - q.y, d = sqrt(dx * dx + dy * dy) + 0.01;
    q.x += dx / d * speed * 1.25; q.y += dy / d * speed * 1.25;
    if (d < 10 && prey.length > 3) { prey.splice(prey.indexOf(best), 1); eaten++; }
  }
}

function draw() {
  background(230, 25, 12);
  if (!paused) moveAll();
  cells = prey.map((p, i) => voronoiCell(prey, i, bounds.x0, bounds.y0, bounds.x1, bounds.y1));
  let total = (bounds.x1 - bounds.x0) * (bounds.y1 - bounds.y0);

  for (let i = 0; i < prey.length; i++) {
    fill(prey[i].hue, 45, 55); stroke(0, 0, 100, 70); strokeWeight(1.5);
    beginShape(); for (let v of cells[i]) vertex(v.x, v.y); endShape(CLOSE);
  }
  noStroke();
  for (let p of prey) { fill(0, 0, 100); circle(p.x, p.y, 9); }
  for (let q of preds) {
    fill(0, 90, 100); triangle(q.x, q.y - 12, q.x - 10, q.y + 8, q.x + 10, q.y + 8);
    noFill(); stroke(0, 90, 100, 30); circle(q.x, q.y, fear * 2); noStroke();
  }

  // 面積のグラフ：獲物ごとの割合を積み上げて 1 列描く（左へ流れる）
  if (!paused) {
    strip.copy(strip, 1, 0, width - 1, 140, 0, 0, width - 1, 140);
    strip.noStroke(); strip.fill(230, 25, 8); strip.rect(width - 1, 0, 1, 140);
    let y = 0;
    let order = prey.map((p, i) => i).sort((a, b) => prey[a].hue - prey[b].hue);
    for (let i of order) {
      let h = polyArea(cells[i]) / total * 130;
      strip.fill(prey[i].hue, 45, 75); strip.rect(width - 1, 5 + y, 1, h);
      y += h;
    }
  }
  image(strip, 0, height - 145);

  // いちばん広い・狭いなわばり
  let areas = cells.map(polyArea), mx = max(areas), mn = min(areas);
  noStroke(); fill(0, 0, 100); textSize(18);
  text('クリック：捕食者を放す　A：獲物を追加　スペース：' + (paused ? '再開' : '一時停止') + '　↑↓：速さ ' + nf(speed, 1, 1) + '　C：捕食者を消す　R：最初から　獲物 ' + prey.length + '　食べられた ' + eaten, 20, 40);
  fill(0, 0, 65); textSize(15);
  text('なわばり = いちばん近い個体の領域。最大 ' + nf(mx / total * 100, 1, 1) + '%、最小 ' + nf(mn / total * 100, 1, 1) + '%（平均 ' + nf(100 / max(1, prey.length), 1, 1) + '%）。下の帯 = 面積の割合の移り変わり。捕食者が来ると逃げた群れが固まり、なわばりが偏る', 20, 68);
}

function mousePressed() {
  if (mouseY > bounds.y0 && mouseY < bounds.y1 && preds.length < 5) preds.push({ x: mouseX, y: mouseY });
}
function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === 'a' || key === 'A') for (let k = 0; k < 5; k++) addPrey(random(bounds.x0 + 20, bounds.x1 - 20), random(bounds.y0 + 20, bounds.y1 - 20));
  if (key === UP_ARROW) speed = min(5, speed + 0.5);
  if (key === DOWN_ARROW) speed = max(0, speed - 0.5);
  if (key === 'c' || key === 'C') preds = [];
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. 捕食者なしで、なわばりの広さの差（最大と最小）はどれくらい？ 捕食者を 3 匹にすると？
// 2. 獲物に「自分のセルの重心へ少し向かう」力（06 のロイド）を足すと、なわばりは公平になる？
// 3. 自分のなわばりが平均より狭い獲物は弱って遅くなる、というルールを足してみよう
// 4. 獲物を「お店」、捕食者を「大型店」と思って、商圏の奪い合いの物語にしてみよう


// ==================================================
// ここから下は「ボロノイ図の道具」（ほかのスケッチにもそのままコピーして使える）
//   voronoiCell(sites, i, x0, y0, x1, y1) … サイト i の領域（多角形）。長方形を垂直二等分線で切っていく（O(n²)）
//   delaunay(pts) … ドロネー三角形分割（Bowyer–Watson 法）。[[i, j, k], ...] を返す
//   circumcircle(a, b, c) … 外接円 {x, y, r2}（r2 = 半径の 2 乗）
//   polyArea(poly) / polyCentroid(poly) … 多角形の面積と重心
// ==================================================
function voronoiCell(sites, i, x0, y0, x1, y1) {
  let poly = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  let a = sites[i];
  for (let j = 0; j < sites.length && poly.length > 2; j++) {
    if (j === i) continue;
    let b = sites[j];
    // a の側 ＝ (b − a)・p ≦ (|b|² − |a|²) / 2　（a と b の垂直二等分線で切る）
    poly = clipHalfPlane(poly, b.x - a.x, b.y - a.y, (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y) / 2);
  }
  return poly;
}
// nx·x + ny·y ≦ c の側だけ残す（Sutherland–Hodgman の 1 本分）
function clipHalfPlane(poly, nx, ny, c) {
  let out = [];
  for (let k = 0; k < poly.length; k++) {
    let p = poly[k], q = poly[(k + 1) % poly.length];
    let dp = nx * p.x + ny * p.y - c, dq = nx * q.x + ny * q.y - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      let t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}
function polyArea(poly) {
  let s = 0;
  for (let k = 0; k < poly.length; k++) { let p = poly[k], q = poly[(k + 1) % poly.length]; s += p.x * q.y - q.x * p.y; }
  return Math.abs(s) / 2;
}
function polyCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let k = 0; k < poly.length; k++) {
    let p = poly[k], q = poly[(k + 1) % poly.length], cr = p.x * q.y - q.x * p.y;
    a += cr; cx += (p.x + q.x) * cr; cy += (p.y + q.y) * cr;
  }
  if (Math.abs(a) < 1e-9) {
    let sx = 0, sy = 0;
    for (let p of poly) { sx += p.x; sy += p.y; }
    return poly.length ? { x: sx / poly.length, y: sy / poly.length } : { x: 0, y: 0 };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}
function circumcircle(a, b, c) {
  let d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, r2: Infinity };
  let a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  let x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  let y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { x, y, r2: (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) };
}
// Bowyer–Watson：点を 1 つずつ入れ、「外接円の中に新しい点がある三角形」を消して穴を新しい点とつなぐ
function delaunay(pts) {
  let n = pts.length;
  if (n < 3) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  let m = Math.max(x1 - x0, y1 - y0, 1) * 20, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let P = pts.concat([{ x: cx - m, y: cy - m }, { x: cx + m, y: cy - m }, { x: cx, y: cy + m }]);   // 全部を囲む大きな三角形
  let mk = (i, j, k) => ({ v: [i, j, k], c: circumcircle(P[i], P[j], P[k]) });
  let tris = [mk(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    let p = P[i], edges = new Map(), keep = [];
    for (let t of tris) {
      if ((p.x - t.c.x) * (p.x - t.c.x) + (p.y - t.c.y) * (p.y - t.c.y) < t.c.r2) {
        for (let e = 0; e < 3; e++) {
          let a = t.v[e], b = t.v[(e + 1) % 3], id = a < b ? a + '_' + b : b + '_' + a;
          if (edges.has(id)) edges.delete(id); else edges.set(id, [a, b]);   // 2 回出た辺 = 穴の内側なので消す
        }
      } else keep.push(t);
    }
    for (let [a, b] of edges.values()) keep.push(mk(a, b, i));
    tris = keep;
  }
  return tris.filter((t) => t.v[0] < n && t.v[1] < n && t.v[2] < n).map((t) => t.v);
}
