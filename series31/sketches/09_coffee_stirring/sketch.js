// ============================================
// 09 コーヒーをかき混ぜる（と毛玉の定理）
// カップのコーヒーを（こぼさず・ちぎらず）かき混ぜると、どこか 1 点は必ず元の場所に戻ってくる（ブラウワー）
//   粒の色 = 最初の場所（角度 → 色相、中心からの距離 → 濃さ）。かき混ぜ写像を何回重ねても不動点はある
// スペース = 1 回かき混ぜる / ドラッグ = スプーンの通り道を描き直す / ←→ = うずの強さ / A = ずれの矢印 / O = 元の場所への線 / R = やり直し
// ============================================

let N = 2400;              // ★ 粒の数
let twist = 2.2;           // ★ うず（中心ほど多く回る）の強さ
let base = 0.5;            // ★ カップ全体の回転
let sigma = 0.22;          // ★ スプーンの影響の広さ
let spoon = [];            // スプーンの通り道（単位円の座標）
let stirs = [];            // これまでのかき混ぜ（それぞれの設定を保存）
let parts = [];            // {ox, oy, x, y, sx, sy}
let anim = 1;              // 0→1 でアニメーション
let fixedP = null, arrows = [];
let showArrows = false, showOrig = false;
let cx, cy, R;
let drawing = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  R = min(width * 0.3, (height - 160) / 2); cx = 60 + R; cy = 110 + R;
  for (let t = 0; t <= 1; t += 0.04) spoon.push({ x: -0.7 + 1.4 * t, y: 0.35 * Math.sin(t * 2 * PI) });
  reset();
}
function reset() {
  parts = [];
  for (let i = 0; i < N; i++) {
    let r = Math.sqrt(Math.random()) * 0.98, a = Math.random() * TWO_PI;
    let x = r * Math.cos(a), y = r * Math.sin(a);
    parts.push({ ox: x, oy: y, x, y, sx: x, sy: y });
  }
  stirs = []; fixedP = null; arrows = []; anim = 1;
}

// ★ 1 回のかき混ぜ：スプーンで押す（流れに沿って少しずつ動かす）→ うずで回す。カップの外には出さない
function stirOnce(p, st) {
  let x = p[0], y = p[1];
  for (let k = 0; k < 6; k++) {
    let dx = 0, dy = 0;
    for (let i = 0; i < st.spoon.length - 1; i++) {
      let a = st.spoon[i], b = st.spoon[i + 1];
      let w = Math.exp(-((x - a.x) ** 2 + (y - a.y) ** 2) / (sigma * sigma));
      dx += (b.x - a.x) * w; dy += (b.y - a.y) * w;
    }
    x += dx * 0.5; y += dy * 0.5;
    let r = Math.hypot(x, y); if (r > 0.99) { x *= 0.99 / r; y *= 0.99 / r; }
  }
  let r2 = x * x + y * y, ang = st.base + st.twist * (1 - r2);
  let c = Math.cos(ang), s = Math.sin(ang);
  return [c * x - s * y, s * x + c * y];
}
function total(p) { for (let st of stirs) p = stirOnce(p, st); return p; }

// 不動点：格子で |M(p) − p| の小さい点を探し、まわりを細かく探して仕上げる
function findFixed() {
  let best = null, bd = 1e9, G = stirs.length > 4 ? 30 : 44;
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    let x = -1 + 2 * (i + 0.5) / G, y = -1 + 2 * (j + 0.5) / G;
    if (x * x + y * y > 0.97) continue;
    let q = total([x, y]), d = Math.hypot(q[0] - x, q[1] - y);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  let h = 2 / G;
  for (let it = 0; it < 40; it++) {
    let improved = false;
    for (let [ddx, ddy] of [[h, 0], [-h, 0], [0, h], [0, -h], [h, h], [-h, -h], [h, -h], [-h, h]]) {
      let x = best[0] + ddx, y = best[1] + ddy; if (x * x + y * y > 0.98) continue;
      let q = total([x, y]), d = Math.hypot(q[0] - x, q[1] - y);
      if (d < bd) { bd = d; best = [x, y]; improved = true; }
    }
    if (!improved) h /= 2;
  }
  fixedP = { x: best[0], y: best[1], err: bd };
  arrows = [];
  for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) {
    let x = -1 + 2 * (i + 0.5) / 15, y = -1 + 2 * (j + 0.5) / 15;
    if (x * x + y * y < 0.95) arrows.push([x, y, total([x, y])]);
  }
}

function doStir() {
  if (stirs.length >= 12 || anim < 1) return;
  let st = { spoon: spoon.slice(), twist, base };
  stirs.push(st);
  for (let p of parts) { p.sx = p.x; p.sy = p.y; let q = stirOnce([p.x, p.y], st); p.tx = q[0]; p.ty = q[1]; }
  anim = 0;
  findFixed();
}

function sx(x) { return cx + x * R; }
function sy(y) { return cy - y * R; }

function draw() {
  background(230, 30, 11);
  if (anim < 1) {
    anim = min(1, anim + 0.025);
    let e = anim * anim * (3 - 2 * anim);
    for (let p of parts) { p.x = lerp(p.sx, p.tx, e); p.y = lerp(p.sy, p.ty, e); }
  }
  // カップ
  noStroke(); fill(25, 60, 22); circle(cx, cy, R * 2 + 24);
  fill(25, 50, 14); circle(cx, cy, R * 2);
  // 粒：色 = 最初の場所
  strokeWeight(5);
  for (let p of parts) {
    let back = stirs.length > 0 && Math.hypot(p.x - p.ox, p.y - p.oy) < 0.04;
    if (back) stroke(0, 0, 100); else stroke((Math.atan2(p.oy, p.ox) / TWO_PI * 360 + 360) % 360, 30 + 60 * Math.hypot(p.ox, p.oy), 95);
    point(sx(p.x), sy(p.y));
  }
  if (showOrig) {
    stroke(0, 0, 100, 25); strokeWeight(1);
    for (let i = 0; i < parts.length; i += 12) { let p = parts[i]; line(sx(p.ox), sy(p.oy), sx(p.x), sy(p.y)); }
  }
  if (showArrows && anim >= 1) {
    stroke(0, 0, 100, 70); strokeWeight(1.5);
    for (let [x, y, q] of arrows) { line(sx(x), sy(y), sx(lerp(x, q[0], 0.5)), sy(lerp(y, q[1], 0.5))); }
  }
  // スプーンの通り道
  noFill(); stroke(0, 0, 100, 60); strokeWeight(2); drawingContext.setLineDash([6, 6]);
  if (spoon.length > 1) { beginShape(); for (let s of spoon) vertex(sx(s.x), sy(s.y)); endShape(); }
  drawingContext.setLineDash([]);
  if (spoon.length > 1) { let a = spoon[spoon.length - 2], b = spoon[spoon.length - 1]; noStroke(); fill(0, 0, 100, 70); arrowHead(sx(b.x), sy(b.y), Math.atan2(-(b.y - a.y), b.x - a.x)); }
  // 不動点
  if (fixedP && anim >= 1) {
    noFill(); stroke(0, 0, 100); strokeWeight(3);
    circle(sx(fixedP.x), sy(fixedP.y), 30);
    line(sx(fixedP.x) - 22, sy(fixedP.y), sx(fixedP.x) + 22, sy(fixedP.y));
    line(sx(fixedP.x), sy(fixedP.y) - 22, sx(fixedP.x), sy(fixedP.y) + 22);
  }

  let tx = cx + R + 60;
  noStroke(); fill(0, 0, 100); textSize(18);
  text('かき混ぜた回数 ' + stirs.length + '　スペース：かき混ぜる　ドラッグ：スプーンの道　うず ' + nf(twist, 1, 1) + '（←→）　A：矢印　O：元の場所への線　R：やり直し', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('白い十字 = ' + stirs.length + ' 回ぶんのかき混ぜ全体で元の場所に戻る点（不動点）。白い粒 = たまたま元の場所の近くにいる粒', 20, 68);
  fill(0, 0, 80); textSize(15);
  let lines = [
    'かき混ぜ = カップ（円板）からカップへの連続写像',
    '→ ブラウワーの不動点定理で、動かない点が必ずある',
    fixedP ? '見つけた不動点：(' + nf(fixedP.x, 1, 3) + ', ' + nf(fixedP.y, 1, 3) + ')　ずれ ' + fixedP.err.toExponential(1) : '（まだかき混ぜていない）',
    '',
    '「ちぎる」（連続でない）なら逃げられる：',
    '半分に切って入れ替えれば、どの点も動く',
    '',
    '毛玉の定理（シリーズ 27 の 12）との関係',
    '・球の表面の毛をなでつけると、必ずつむじができる',
    '  （向きの場が 0 になる点 = ずれ v = 0 の点）',
    '・地球の風：どこかに風のない点がある',
    '・コーヒーの表面を球と考えると、かき混ぜても',
    '  どこかは動かない、が別の角度から言える',
  ];
  for (let i = 0; i < lines.length; i++) text(lines[i], tx, 130 + i * 26);
}

function mousePressed() {
  if (dist(mouseX, mouseY, cx, cy) < R) { drawing = true; spoon = [{ x: (mouseX - cx) / R, y: (cy - mouseY) / R }]; }
}
function mouseDragged() {
  if (!drawing) return;
  let p = { x: constrain((mouseX - cx) / R, -0.98, 0.98), y: constrain((cy - mouseY) / R, -0.98, 0.98) };
  let last = spoon[spoon.length - 1];
  if (Math.hypot(p.x - last.x, p.y - last.y) > 0.06 && spoon.length < 40) spoon.push(p);
}
function mouseReleased() { drawing = false; }
function keyPressed() {
  if (key === ' ') doStir();
  if (key === LEFT_ARROW) twist = max(-4, twist - 0.2);
  if (key === RIGHT_ARROW) twist = min(4, twist + 0.2);
  if (key === 'a' || key === 'A') showArrows = !showArrows;
  if (key === 'o' || key === 'O') showOrig = !showOrig;
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. スペースを何回か押して、白い十字のまわりの粒の色が「元の色」に近いことを確かめよう
// 2. スプーンの道を中心を通る直線にすると不動点はどこへ行く？ ぐるっと 1 周の道にすると？
// 3. twist = 0、base = 0 にしてスプーンだけでかき混ぜる。不動点は何個できる？（A の矢印で探す）
// 4. stirOnce の最後に「左右を入れ替える」（x → −x にして半分ずらす）と連続でなくなる。不動点は消える？

// ==================================================
// ここから下は「道具」
// ==================================================
function arrowHead(x, y, a) {
  push(); translate(x, y); rotate(a); triangle(0, 0, -14, -7, -14, 7); pop();
}
