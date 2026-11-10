// ============================================
// 02 ベルヌーイの定理　p + ½ρv² + ρgh = 一定
// 流れに沿って「圧力・運動・高さ」のエネルギーの合計は変わらない（粘性なし・定常）
//   1 = ベンチュリ管：細い所は速い → 圧力が下がる（立てた管の水位でわかる）
//   2 = トリチェリの定理：タンクの穴から出る速さ v = √(2gh)
// 1/2 = 場面 / ドラッグ = しぼる・穴の高さ / 上下キー = 流速・穴の高さ / R = 元に戻す
// ============================================

let scene = 1;
let v0 = 120; // ★ 太い所の流速 [px/秒]
let throat = 0.5; // ★ しぼり（細い所の太さ ÷ 元の太さ）
let rho = 1.0; // ★ 密度
let p0 = 60000; // ★ 太い所の圧力（立てた管の水位のもと）
let pipeH = 90, cy, parts = [];
// トリチェリ用
let grav = 600; // ★ 重力加速度 [px/秒²]
let level = 0.9; // 水位（タンクの高さに対する割合）
let holeY = 0.3; // ★ 穴の高さ（同じく割合）
let drain = 0.02; // ★ 穴の大きさ（大きいほど水位が早く下がる）
let drops = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cy = height * 0.6;
  for (let i = 0; i < 500; i++) parts.push({ x: Math.random() * width, eta: Math.random() * 2 - 1 });
}

function halfHeight(x) {
  let s = constrain((x - width / 2) / (width * 0.2), -1, 1);
  return pipeH * (1 - (1 - throat) * 0.5 * (1 + Math.cos(Math.PI * s)));
}
function speedAt(x) { return v0 * pipeH / halfHeight(x); } // 連続の式
// ★ ベルヌーイの定理：p = p0 + ½ρ(v0² − v²)
function pressureAt(x) { let v = speedAt(x); return p0 + 0.5 * rho * (v0 * v0 - v * v); }

function draw() {
  background(215, 60, 10);
  let dt = Math.min(deltaTime / 1000, 0.033);
  if (scene === 1) drawVenturi(dt); else drawTank(dt);
}

function drawVenturi(dt) {
  if (mouseIsPressed && mouseY > 90) throat = constrain(Math.abs(mouseY - cy) / pipeH, 0.3, 1);
  // 管と粒
  stroke(42, 40, 85); strokeWeight(5); noFill();
  for (let sgn of [-1, 1]) {
    beginShape();
    for (let x = 0; x <= width + 8; x += 8) vertex(x, cy + sgn * (halfHeight(x) + 4));
    endShape();
  }
  noStroke();
  for (let q of parts) {
    q.x += speedAt(q.x) * dt;
    if (q.x > width) q.x -= width;
    fill(map(speedAt(q.x), 80, 500, 200, 10, true), 70, 100);
    circle(q.x, cy + q.eta * halfHeight(q.x), 5);
  }
  // 立てた管（マノメータ）と、エネルギーの棒グラフ
  let unit = (cy - pipeH - 110) / (p0 + 0.5 * rho * v0 * v0) * 0.9; // 高さへの換算
  textAlign(CENTER); textSize(14);
  for (let k = 0; k < 5; k++) {
    let x = width * (0.1 + 0.2 * k), top = cy - halfHeight(x) - 4;
    let p = pressureAt(x), v = speedAt(x), dyn = 0.5 * rho * v * v;
    let hp = Math.max(p, 0) * unit;
    stroke(0, 0, 70); strokeWeight(2); noFill();
    line(x - 9, top, x - 9, 90); line(x + 9, top, x + 9, 90);
    noStroke(); fill(200, 70, 95, 80);
    rect(x - 8, top - hp, 16, hp); // 水位 = 圧力 p
    fill(12, 70, 100, 80);
    rect(x + 22, top - hp - dyn * unit, 10, dyn * unit); // 動圧 ½ρv² をその上に積む
    fill(200, 50, 100); text('p = ' + nf(p / 1000, 1, 1), x, cy + pipeH + 34);
    fill(12, 60, 100); text('½ρv² = ' + nf(dyn / 1000, 1, 1), x, cy + pipeH + 54);
    fill(0, 0, 100); text('合計 ' + nf((p + dyn) / 1000, 1, 1), x, cy + pipeH + 74);
    if (p < 0) { fill(350, 80, 100); text('負圧！（泡が出る）', x, cy + pipeH + 96); }
  }
  // 合計の高さ（全部の場所で同じ）
  let total = cy - pipeH - 4 - (p0 + 0.5 * rho * v0 * v0) * unit;
  stroke(42, 80, 100, 70); strokeWeight(1);
  for (let x = 0; x < width; x += 16) line(x, total, x + 8, total);
  textAlign(LEFT, BASELINE);
  noStroke(); fill(42, 80, 100); textSize(14);
  text('p + ½ρv² = 一定（全圧）', 20, total - 8);
  fill(0, 0, 100); textSize(18);
  text('1 ベンチュリ管　流速 v₀ = ' + nf(v0, 1, 0) + '（上下キー）　しぼり ' + nf(throat * 100, 1, 0) + '%（上下にドラッグ）　2 = トリチェリ', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('青 = 圧力 p（水位）、赤 = 動圧 ½ρv²。細い所は速くなったぶん、圧力が下がる。足すといつも同じ高さ', 20, 68);
}

function drawTank(dt) {
  let tx = width * 0.08, tw = width * 0.2, ground = height * 0.88, th = height * 0.62, top = ground - th;
  if (mouseIsPressed && mouseY > top) holeY = constrain((ground - mouseY) / th, 0.03, 0.85);
  let depth = Math.max(level - holeY, 0) * th; // 穴の上にある水の深さ h
  let v = Math.sqrt(2 * grav * depth); // ★ トリチェリの定理
  level = Math.max(level - drain * v / th * dt, 0); // 出たぶんだけ水位が下がる
  let hy = ground - holeY * th;
  // タンクと水
  noStroke(); fill(200, 70, 90, 70);
  rect(tx, ground - level * th, tw, level * th);
  stroke(42, 40, 85); strokeWeight(5); noFill();
  line(tx, top, tx, ground); line(tx, ground, width, ground);
  line(tx + tw, top, tx + tw, hy - 8); line(tx + tw, hy + 8, tx + tw, ground);
  // 噴流：水平に速さ v で飛び出し、あとは放物線
  if (v > 1) {
    if (frameCount % 2 === 0) drops.push({ x: tx + tw, y: hy, vx: v, vy: 0 });
    noFill(); stroke(200, 50, 100, 60); strokeWeight(2);
    beginShape();
    for (let s = 0; s < 3; s += 0.03) { let y = hy + 0.5 * grav * s * s; vertex(tx + tw + v * s, Math.min(y, ground)); if (y > ground) break; }
    endShape();
  }
  noStroke(); fill(200, 60, 100);
  for (let d of drops) { d.vy += grav * dt; d.x += d.vx * dt; d.y += d.vy * dt; circle(d.x, d.y, 6); }
  drops = drops.filter((d) => d.y < ground && d.x < width);
  // 飛ぶ距離の理論値：L = v × 落下時間 = 2 √(h × 穴の高さ)
  let reach = 2 * Math.sqrt(depth * holeY * th);
  stroke(42, 80, 100); strokeWeight(2);
  line(tx + tw + reach, ground - 14, tx + tw + reach, ground + 14);
  noStroke(); fill(42, 80, 100); textSize(14); textAlign(CENTER);
  text('届く距離 ' + nf(reach, 1, 0), tx + tw + reach, ground + 32);
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(15);
  text('深さ h = ' + nf(depth, 1, 0), tx + 10, hy - 12);
  text('v = √(2gh) = ' + nf(v, 1, 0), tx + tw + 14, hy - 12);
  textSize(18);
  text('2 トリチェリの定理　穴の高さ（上下キー・タンクをドラッグ）　R = 水を入れ直す　1 = ベンチュリ管', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('水面（v ≈ 0, 高さ h）と穴（速さ v, 高さ 0）でベルヌーイ：ρgh = ½ρv²。高さ h から自由落下した速さと同じ', 20, 68);
}

function keyPressed() {
  if (key === '1') scene = 1;
  if (key === '2') { scene = 2; level = 0.9; drops = []; }
  if (key === UP_ARROW) { if (scene === 1) v0 = Math.min(v0 + 10, 220); else holeY = Math.min(holeY + 0.05, 0.85); }
  if (key === DOWN_ARROW) { if (scene === 1) v0 = Math.max(v0 - 10, 40); else holeY = Math.max(holeY - 0.05, 0.03); }
  if (key === 'r' || key === 'R') { level = 0.9; throat = 0.5; v0 = 120; drops = []; }
}

// ---------- やってみよう ----------
// 1. しぼりを 50% にして v₀ を上げていく。細い所の水位が 0 になる（負圧）のは v₀ がいくつのとき？
// 2. 「合計」の数字が 5 か所で同じことを確かめる。p0 を変えるとどうなる？
// 3. 2 のタンクで、いちばん遠くまで届く穴の高さは？（水位のちょうど半分になるはず）
// 4. grav を 100（月）にする。v と届く距離はどう変わる？
// 5. drain を 0.1 にすると水位が早く下がる。水位の下がり方はだんだん遅くなる。なぜ？
