// ============================================
// 10 ユークリッドの互除法：長方形を正方形で切り取る
// a × b の長方形から、いちばん大きい正方形を切り取り続けると、最後の正方形の 1 辺が最大公約数 gcd(a, b)
// 拡張版は帰り道で ax + by = d となる整数 x, y も求める（拡張ユークリッドの互除法）
// スペース：1 ステップ / A：自動 / ドラッグ：長方形の右下の角で a, b を変える
// 1：gcd(45, 33)  2：gcd(161, 119)  3：フィボナッチ（最悪の場合）  4：ランダム
// ============================================

let speed = 40; // ★ 自動再生の間隔

let a = 161, b = 119, rows = [], s = 0, auto = false, timer = 0, dragging = false;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); colorMode(HSB, 360, 100, 100, 100); prepare(); }

function prepare() {
  rows = [];
  let x = a, y = b;
  while (y > 0) { rows.push({ a: x, b: y, q: floor(x / y) }); [x, y] = [y, x % y]; }
  rows.push({ a: x, b: 0, q: null, d: x, x: 1, y: 0 });
  for (let i = rows.length - 2; i >= 0; i--) { let nx = rows[i + 1]; rows[i].d = nx.d; rows[i].x = nx.y; rows[i].y = nx.x - rows[i].q * nx.y; }
  s = 0;
}
function total() { return 2 * rows.length - 1; }

function draw() {
  background(265, 45, 10);
  if (auto && ++timer % speed === 0) s = s >= total() ? 0 : s + 1;
  fill(0, 0, 92); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text(`ユークリッドの互除法：gcd(${a}, ${b})`, 30, 50);
  textSize(15); fill(0, 0, 60);
  text('スペース：1 ステップ　A：自動' + (auto ? '（中）' : '') + '　右下の角をドラッグ：a, b を変える　1：(45, 33)　2：(161, 119)　3：フィボナッチ　4：ランダム', 30, 80);

  // 長方形を正方形で切り取る
  let areaW = width * 0.5, areaH = height - 170, sc = min(areaW / a, areaH / b), ox = 40, oy = 110;
  noFill(); stroke(0, 0, 70); strokeWeight(2); rect(ox, oy, a * sc, b * sc);
  let x = 0, y = 0, w = a, h = b, horizontal = true, shown = min(s, rows.length - 1);
  for (let i = 0; i < shown; i++) {
    let r = rows[i], side = r.b;
    for (let k = 0; k < r.q; k++) {
      fill((i * 47) % 360, 60, 85, 80); stroke(265, 45, 10); strokeWeight(1.5);
      if (horizontal) rect(ox + (x + k * side) * sc, oy + y * sc, side * sc, side * sc); else rect(ox + x * sc, oy + (y + k * side) * sc, side * sc, side * sc);
    }
    if (side * sc > 26) { fill(0, 0, 10); noStroke(); textAlign(CENTER, CENTER); textSize(min(22, side * sc * 0.3)); horizontal ? text(side, ox + (x + side / 2) * sc, oy + (y + side / 2) * sc) : text(side, ox + (x + side / 2) * sc, oy + (y + side / 2) * sc); }
    if (horizontal) { x += r.q * side; w -= r.q * side; } else { y += r.q * side; h -= r.q * side; }
    horizontal = !horizontal;
  }
  if (s >= rows.length - 1) { noFill(); stroke(45, 90, 100); strokeWeight(4); let g = rows[rows.length - 1].d; rect(ox + (!horizontal ? x - g : x) * sc, oy + (!horizontal ? y : y - g) * sc, g * sc, g * sc); }
  noStroke(); fill(0, 0, 100); circle(ox + a * sc, oy + b * sc, 16);

  // 表
  let px = width * 0.55, py = 120, cw = (width - px - 30) / 6, rh = min(34, (height - 330) / rows.length);
  let heads = ['a', 'b', '⌊a/b⌋', 'd', 'x', 'y'];
  textSize(16); textAlign(CENTER, CENTER);
  for (let j = 0; j < 6; j++) { fill(0, 0, 70); text(heads[j], px + j * cw + cw / 2, py); }
  for (let i = 0; i < rows.length; i++) {
    let r = rows[i], yy = py + 26 + i * rh, down = i < s, up = s >= rows.length - 1 && i >= total() - s;
    if (!down && !up) continue;
    fill(down && !up && i === s - 1 ? color(45, 70, 40) : up && i === total() - s ? color(160, 60, 35) : color(265, 30, 18)); rect(px, yy - rh / 2 + 2, cw * 6, rh - 4, 6);
    fill(0, 0, 92);
    text(r.a, px + cw / 2, yy); text(r.b, px + cw * 1.5, yy); text(r.q === null ? '—' : r.q, px + cw * 2.5, yy);
    if (up) { fill(45, 80, 100); text(r.d, px + cw * 3.5, yy); fill(160, 60, 95); text(r.x, px + cw * 4.5, yy); text(r.y, px + cw * 5.5, yy); }
  }
  let r0 = rows[0], my = py + 40 + rows.length * rh;
  textAlign(LEFT, TOP); textSize(16); fill(0, 0, 92);
  let msg;
  if (s === 0) msg = 'スペースで開始。行きは「a を b で割った余り」で次の行へ（gcd(a, b) = gcd(b, a mod b)）';
  else if (s < rows.length) msg = s === rows.length - 1 ? `b = 0 になった → gcd = ${rows[rows.length - 1].d}。帰り道は d = a·1 + 0·0 から始める` : `${rows[s - 1].a} = ${rows[s - 1].q} × ${rows[s - 1].b} + ${rows[s - 1].a % rows[s - 1].b}　→ 正方形 ${rows[s - 1].q} 枚を切り取る`;
  else msg = `帰り道：x ← 下の行の y、y ← 下の行の x − ⌊a/b⌋·下の行の y`;
  text(msg, px, my, width - px - 30);
  if (s >= total()) { fill(45, 80, 100); textSize(20); text(`${r0.a}·(${r0.x}) + ${r0.b}·(${r0.y}) = ${r0.d}`, px, my + 56); }
  fill(0, 0, 60); textSize(14);
  text(`ステップ数 ${rows.length - 1}。最悪はフィボナッチ数の組（ラメの定理）：ステップは O(log b)。\nx, y はベズーの等式の係数。d = 1 なら x が「a の mod b での逆数」→ RSA の秘密鍵づくり（13）で使う`, px, height - 90, width - px - 30);
}

function mousePressed() { let sc = min((width * 0.5) / a, (height - 170) / b); if (dist(mouseX, mouseY, 40 + a * sc, 110 + b * sc) < 20) dragging = true; }
function mouseDragged() {
  if (!dragging) return;
  let sc = min((width * 0.5) / a, (height - 170) / b);
  a = constrain(round((mouseX - 40) / sc), 2, 400); b = constrain(round((mouseY - 110) / sc), 1, 400); prepare(); s = total();
}
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === ' ') s = s >= total() ? 0 : s + 1;
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === '1') { a = 45; b = 33; prepare(); }
  if (key === '2') { a = 161; b = 119; prepare(); }
  if (key === '3') { a = 89; b = 55; prepare(); }
  if (key === '4') { a = floor(random(20, 300)); b = floor(random(10, a)); prepare(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 3 のフィボナッチ（89, 55）は毎回正方形が 1 枚だけ → いちばんステップが多い
// 2. a と b が互いに素（gcd = 1）だと、最後の正方形は 1 × 1
// 3. 帰り道の計算を手でやって、表の x, y と比べる
