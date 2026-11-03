// ============================================
// 00 平面鏡と反射の法則
// 光源（マウス）から扇状に光線を出し、鏡に当たると「入射角 = 反射角」で跳ね返る
//   反射の式： d' = d − 2 (d·n) n   （d は光の向き、n は鏡の法線ベクトル）
// マウス = 光源 / 鏡の端点をドラッグ = 鏡の角度 / ↑↓ = 光線の本数 / ←→ = 扇の向き / M = 鏡を追加 / D = 最後の鏡を消す / V = 鏡像 / R = リセット
// ============================================

let rayCount = 15;        // ★ 光線の本数
let spread = 50;          // ★ 扇の広がり（度）
let maxBounce = 6;        // ★ 反射の最大回数
let mirrors = [];         // 鏡の配列 {a:{x,y}, b:{x,y}}
let dragging = null;      // つかんでいる端点 {m, end}
let aimOffset = 0;        // 扇の向きのずらし（ラジアン）
let showImage = true;     // 鏡像（虚像）を表示
let src = { x: 300, y: 400 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetMirrors();
}

function resetMirrors() {
  mirrors = [
    { a: { x: width * 0.62, y: height * 0.25 }, b: { x: width * 0.72, y: height * 0.75 } },
    { a: { x: width * 0.2, y: height * 0.85 }, b: { x: width * 0.55, y: height * 0.9 } },
  ];
  aimOffset = 0;
}

// 光線（p から向き d）と線分 a-b の交点。t = 光線の進んだ距離、s = 線分上の位置（0〜1）
function raySeg(px, py, dx, dy, a, b) {
  let ex = b.x - a.x, ey = b.y - a.y;
  let den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9) return null;
  let t = ((a.x - px) * ey - (a.y - py) * ex) / den;
  let s = ((a.x - px) * dy - (a.y - py) * dx) / den;
  if (t > 1e-6 && s >= 0 && s <= 1) return { t, s };
  return null;
}

// ★ 光線を追跡する：鏡に当たるたびに反射。点の列と、最初に当たった鏡の情報を返す
function traceRay(px, py, dx, dy) {
  let pts = [{ x: px, y: py }];
  let first = null;
  for (let bounce = 0; bounce < maxBounce; bounce++) {
    let best = null;
    for (let m of mirrors) {
      let h = raySeg(px, py, dx, dy, m.a, m.b);
      if (h && (!best || h.t < best.t)) best = { t: h.t, m };
    }
    if (!best) break;
    let hx = px + dx * best.t, hy = py + dy * best.t;
    // 鏡の法線（長さ 1）
    let mx = best.m.b.x - best.m.a.x, my = best.m.b.y - best.m.a.y;
    let len = Math.hypot(mx, my);
    let nx = -my / len, ny = mx / len;
    let dp = dx * nx + dy * ny;
    if (!first) first = { x: hx, y: hy, nx, ny, dx, dy, dot: dp };
    // 反射： d' = d − 2(d·n)n
    dx = dx - 2 * dp * nx;
    dy = dy - 2 * dp * ny;
    px = hx; py = hy;
    pts.push({ x: hx, y: hy });
  }
  // 最後は画面の外まで伸ばす
  pts.push({ x: px + dx * 3000, y: py + dy * 3000 });
  return { pts, first };
}

function draw() {
  background(230, 40, 8);
  if (!dragging) { src.x = mouseX; src.y = mouseY; }

  // 扇の中心方向：いちばん近い鏡の真ん中へ向ける（←→ でずらせる）
  let near = null, nd = 1e9;
  for (let m of mirrors) {
    let cx = (m.a.x + m.b.x) / 2, cy = (m.a.y + m.b.y) / 2;
    let d = Math.hypot(cx - src.x, cy - src.y);
    if (d < nd) { nd = d; near = { x: cx, y: cy }; }
  }
  let aim = near ? Math.atan2(near.y - src.y, near.x - src.x) + aimOffset : aimOffset;

  // 鏡像（光源を鏡で折り返した位置）
  if (showImage) {
    for (let m of mirrors) {
      let img = reflectPoint(src, m);
      stroke(0, 0, 100, 25); strokeWeight(1);
      drawDashed(src.x, src.y, img.x, img.y);
      noFill(); stroke(45, 80, 100, 50);
      circle(img.x, img.y, 14);
    }
  }

  // 光線
  let half = radians(spread) / 2;
  let central = null;
  strokeWeight(1.5);
  for (let i = 0; i < rayCount; i++) {
    let th = rayCount === 1 ? aim : aim - half + (2 * half * i) / (rayCount - 1);
    let r = traceRay(src.x, src.y, Math.cos(th), Math.sin(th));
    noFill();
    stroke(45, 60, 100, 55);
    beginShape();
    for (let p of r.pts) vertex(p.x, p.y);
    endShape();
    if (i === Math.floor(rayCount / 2)) central = r;
  }

  // 鏡
  for (let m of mirrors) {
    stroke(190, 20, 100); strokeWeight(5);
    line(m.a.x, m.a.y, m.b.x, m.b.y);
    // 裏側のハッチング
    let mx = m.b.x - m.a.x, my = m.b.y - m.a.y, len = Math.hypot(mx, my);
    let nx = -my / len, ny = mx / len;
    strokeWeight(1); stroke(190, 20, 100, 50);
    for (let s = 0; s <= 1; s += 10 / len) line(m.a.x + mx * s, m.a.y + my * s, m.a.x + mx * s + nx * 8 + mx / len * 6, m.a.y + my * s + ny * 8 + my / len * 6);
    noStroke(); fill(0, 0, 100);
    circle(m.a.x, m.a.y, 10); circle(m.b.x, m.b.y, 10);
  }

  // 中央の光線の入射角・反射角を描く
  if (central && central.first) {
    let f = central.first;
    let sgn = f.dot > 0 ? -1 : 1;             // 法線を光の来た側へ向ける
    let nx = f.nx * sgn, ny = f.ny * sgn;
    stroke(0, 0, 100, 60); strokeWeight(1);
    drawDashed(f.x, f.y, f.x + nx * 120, f.y + ny * 120);
    let inc = Math.acos(Math.min(1, Math.abs(f.dot)));
    let an = Math.atan2(ny, nx);
    let ain = Math.atan2(-f.dy, -f.dx);      // 入射光が来た向き
    let aout = Math.atan2(f.dy - 2 * f.dot * f.ny, f.dx - 2 * f.dot * f.nx);
    noFill(); strokeWeight(2);
    stroke(45, 90, 100); arcBetween(f.x, f.y, 70, an, ain);
    stroke(170, 80, 100); arcBetween(f.x, f.y, 90, an, aout);
    noStroke(); fill(0, 0, 100); textSize(16);
    text('入射角 ' + nf(degrees(inc), 1, 1) + '°　反射角 ' + nf(degrees(inc), 1, 1) + '°', f.x + nx * 130 - 60, f.y + ny * 130);
  }

  // 光源
  noStroke(); fill(45, 20, 100); circle(src.x, src.y, 16);
  fill(45, 60, 100, 30); circle(src.x, src.y, 40);

  fill(0, 0, 100); textSize(18);
  text('光線 ' + rayCount + ' 本（↑↓）　扇の向き（←→）　鏡 ' + mirrors.length + ' 枚（M：追加　D：消す）　V：鏡像 ' + (showImage ? 'ON' : 'off') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('鏡の白い端点をドラッグして角度を変えよう。入射角 = 反射角（法線は点線）。黄色の丸は鏡に映った光源の位置（虚像）', 20, 68);
}

// 点 p を鏡 m で折り返した位置
function reflectPoint(p, m) {
  let mx = m.b.x - m.a.x, my = m.b.y - m.a.y, len2 = mx * mx + my * my;
  let t = ((p.x - m.a.x) * mx + (p.y - m.a.y) * my) / len2;
  let fx = m.a.x + mx * t, fy = m.a.y + my * t;   // 足
  return { x: 2 * fx - p.x, y: 2 * fy - p.y };
}

function arcBetween(x, y, r, a1, a2) {
  let d = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
  beginShape();
  for (let k = 0; k <= 16; k++) { let a = a1 + d * k / 16; vertex(x + r * Math.cos(a), y + r * Math.sin(a)); }
  endShape();
}

function drawDashed(x1, y1, x2, y2) {
  let d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(d / 12));
  for (let i = 0; i < n; i += 2) line(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, x1 + (x2 - x1) * (i + 1) / n, y1 + (y2 - y1) * (i + 1) / n);
}

function mousePressed() {
  for (let m of mirrors) for (let end of ['a', 'b']) {
    if (Math.hypot(mouseX - m[end].x, mouseY - m[end].y) < 16) { dragging = { m, end }; return; }
  }
}
function mouseDragged() { if (dragging) { dragging.m[dragging.end].x = mouseX; dragging.m[dragging.end].y = mouseY; } }
function mouseReleased() { dragging = null; }

function keyPressed() {
  if (key === UP_ARROW) rayCount = Math.min(120, rayCount + 2);
  if (key === DOWN_ARROW) rayCount = Math.max(1, rayCount - 2);
  if (key === LEFT_ARROW) aimOffset -= 0.1;
  if (key === RIGHT_ARROW) aimOffset += 0.1;
  if (key === 'm' || key === 'M') {
    let cx = random(width * 0.2, width * 0.8), cy = random(height * 0.2, height * 0.8), a = random(TWO_PI), L = 140;
    mirrors.push({ a: { x: cx - Math.cos(a) * L, y: cy - Math.sin(a) * L }, b: { x: cx + Math.cos(a) * L, y: cy + Math.sin(a) * L } });
  }
  if ((key === 'd' || key === 'D') && mirrors.length > 1) mirrors.pop();
  if (key === 'v' || key === 'V') showImage = !showImage;
  if (key === 'r' || key === 'R') resetMirrors();
}

// ---------- やってみよう ----------
// 1. 鏡を回して、入射角と反射角がいつも同じになることを確かめよう（法線からはかる）
// 2. 2 枚の鏡を 90° に組むと、光はどこから来ても元の向きへ戻る（コーナーリフレクター）。作ってみよう
// 3. 黄色の丸（虚像）はどこにある？ 鏡を挟んで光源と対称な位置 → 鏡の中に見える「像」の正体
// 4. maxBounce を 30 にして、向かい合わせの 2 枚の鏡で光を閉じ込めよう
