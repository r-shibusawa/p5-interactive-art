// ============================================
// 03 ポテンシャル流の重ね合わせ
// 粘性がなく渦なしの流れは、速度ポテンシャル φ（速度 = ∇φ）で書ける。式は ∇²φ = 0（ラプラス方程式）
// 線形なので「足し算」ができる：一様流・湧き出し・吸い込み・渦・二重極を足すだけで、いろいろな流れになる
//   水色 = 流線（流れ関数 ψ の等高線）　　砂色 = 等ポテンシャル線（φ の等高線）。2 つはいつも直交する
// 1〜5 = 置く部品 / クリック = 置く・ドラッグ = 動かす / 左右キー = 一様流 U / E = 等ポテンシャル線
// R = お手本を順に / Z = 1 つ戻す / C = 全部消す
// ============================================

let U = 100; // ★ 一様流の速さ [px/秒]（左右キー、0 で止める）
let m = 40000; // ★ 湧き出し・吸い込み・渦の強さ
let kappa = 500000; // ★ 二重極の強さ（一様流の中では半径 √(κ/U) の円柱になる）
let levels = 16; // ★ 部品 1 個から出る流線の本数
let kind = 1; // 1 湧き出し, 2 吸い込み, 3 渦（時計回り）, 4 渦（反時計回り）, 5 二重極
let showPhi = true;
let elems = [], presetNo = 0, grab = -1, dirty = true;
let layer, dots = [];
let GX = 129, GY, cell;
let kindNames = ['', '湧き出し', '吸い込み', '渦 ↻', '渦 ↺', '二重極'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layer = createGraphics(width, height);
  layer.colorMode(HSB, 360, 100, 100, 100);
  cell = width / (GX - 1);
  GY = Math.ceil(height / cell) + 1;
  for (let i = 0; i < 300; i++) dots.push({ x: Math.random() * width, y: Math.random() * height });
  preset();
}

// お手本：R を押すたびに次へ
function preset() {
  let cx = width / 2, c2 = height / 2;
  let list = [
    [{ x: cx - 120, y: c2, k: 1 }, { x: cx + 120, y: c2, k: 2 }], // ランキンの卵形（湧き出し + 吸い込み + 一様流）
    [{ x: cx, y: c2, k: 1 }], // 半無限物体
    [{ x: cx, y: c2, k: 5 }], // 円柱（二重極 + 一様流）
    [{ x: cx, y: c2, k: 5 }, { x: cx, y: c2, k: 3 }], // 回る円柱（+ 渦）→ 04 へ
  ];
  elems = list[presetNo % list.length];
  presetNo++; dirty = true;
}

// ★ 重ね合わせ：全部品の φ・ψ・速度を足すだけ
function fieldAt(x, y) {
  let phi = U * x, psi = U * y, vx = U, vy = 0;
  for (let e of elems) {
    let dx = x - e.x, dy = y - e.y, r2 = dx * dx + dy * dy + 1, th = Math.atan2(dy, dx), lr = 0.5 * Math.log(r2);
    let s = m / (2 * Math.PI);
    if (e.k === 1 || e.k === 2) { // 湧き出し（吸い込みは符号が逆）：速さ m/(2πr) で放射状
      let q = e.k === 1 ? s : -s;
      phi += q * lr; psi += q * th; vx += q * dx / r2; vy += q * dy / r2;
    } else if (e.k === 3 || e.k === 4) { // 渦：速さ Γ/(2πr) で回る
      let q = e.k === 3 ? s : -s;
      phi += q * th; psi -= q * lr; vx -= q * dy / r2; vy += q * dx / r2;
    } else { // 二重極：湧き出しと吸い込みをくっつけた極限
      phi += kappa * dx / r2; psi -= kappa * dy / r2;
      vx += kappa * (dy * dy - dx * dx) / (r2 * r2); vy -= kappa * 2 * dx * dy / (r2 * r2);
    }
  }
  return [phi, psi, vx, vy];
}

// 流線と等ポテンシャル線を描き直す（部品が変わったときだけ）
function rebuild() {
  let d = m / levels; // 等高線の間かく。部品の強さ m がちょうど levels 本ぶんになる
  let fpsi = new Float32Array(GX * GY), fphi = new Float32Array(GX * GY);
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    let f = fieldAt(i * cell, j * cell);
    fphi[i + j * GX] = f[0] / d; fpsi[i + j * GX] = f[1] / d;
  }
  let X = (i, j) => i * cell, Y = (i, j) => j * cell;
  layer.clear();
  if (showPhi) { layer.stroke(42, 50, 90, 30); layer.strokeWeight(1); contourLines(layer, fphi, GX, GY, X, Y, levels); }
  layer.stroke(185, 70, 100, 80); layer.strokeWeight(1.5); contourLines(layer, fpsi, GX, GY, X, Y, levels);
  dirty = false;
}

function draw() {
  background(215, 60, 10);
  if (dirty) rebuild();
  image(layer, 0, 0, width, height);
  let dt = Math.min(deltaTime / 1000, 0.033);

  // 流れに乗る粒
  noStroke(); fill(0, 0, 100, 70);
  for (let q of dots) {
    let f = fieldAt(q.x, q.y), sp = Math.hypot(f[2], f[3]), lim = Math.min(1, 900 / (sp + 1));
    q.x += f[2] * lim * dt; q.y += f[3] * lim * dt;
    let eaten = elems.some((e) => (e.k === 2 || e.k === 5) && Math.hypot(q.x - e.x, q.y - e.y) < 12);
    if (eaten || q.x < 0 || q.x > width || q.y < 0 || q.y > height || Math.random() < 0.002) {
      let born = elems.filter((e) => e.k === 1);
      if (born.length && Math.random() < 0.3) { let e = born[Math.floor(Math.random() * born.length)], a = Math.random() * 6.283; q.x = e.x + 14 * Math.cos(a); q.y = e.y + 14 * Math.sin(a); }
      else if (U > 0 && Math.random() < 0.6) { q.x = 1; q.y = Math.random() * height; }
      else { q.x = Math.random() * width; q.y = Math.random() * height; }
    }
    circle(q.x, q.y, 3.5);
  }

  // 部品の印
  textAlign(CENTER, CENTER); textSize(15);
  for (let e of elems) {
    stroke(0, 0, 100); strokeWeight(2); fill([0, 12, 200, 290, 130, 42][e.k], 70, 95);
    circle(e.x, e.y, 26);
    noStroke(); fill(0, 0, 10);
    text(['', '+', '−', '↻', '↺', '◐'][e.k], e.x, e.y);
  }
  textAlign(LEFT, BASELINE);

  // マウスの場所の速さと圧力（ベルヌーイ：Cp = 1 − (v/U)²）
  let f = fieldAt(mouseX, mouseY), sp = Math.hypot(f[2], f[3]);
  noStroke(); fill(215, 60, 10, 85); rect(0, 0, width, 82);
  fill(0, 0, 100); textSize(18);
  text('置く部品：' + kind + ' ' + kindNames[kind] + '（1〜5、クリックで置く）　一様流 U = ' + U + '（左右キー）　E 等ポテンシャル線　R お手本　Z 戻す　C 消す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('部品 ' + elems.length + ' 個の φ と ψ を足しただけ。マウスの場所：速さ ' + nf(sp, 1, 0) + (U > 0 ? '　圧力係数 Cp = ' + nf(Math.max(1 - sp * sp / (U * U), -99), 1, 2) : ''), 20, 68);
}

function mousePressed() {
  grab = elems.findIndex((e) => Math.hypot(mouseX - e.x, mouseY - e.y) < 18);
  if (grab < 0 && mouseY > 80 && elems.length < 14) { elems.push({ x: mouseX, y: mouseY, k: kind }); dirty = true; }
}
function mouseDragged() {
  if (grab >= 0) { elems[grab].x = mouseX; elems[grab].y = mouseY; dirty = true; }
}
function mouseReleased() { grab = -1; }

function keyPressed() {
  if (key >= '1' && key <= '5') kind = Number(key);
  if (key === RIGHT_ARROW) { U = Math.min(U + 20, 300); dirty = true; }
  if (key === LEFT_ARROW) { U = Math.max(U - 20, 0); dirty = true; }
  if (key === 'e' || key === 'E') { showPhi = !showPhi; dirty = true; }
  if (key === 'r' || key === 'R') preset();
  if (key === 'z' || key === 'Z') { elems.pop(); dirty = true; }
  if (key === 'c' || key === 'C') { elems = []; dirty = true; }
}

// ---------- やってみよう ----------
// 1. R でお手本を順に見る。湧き出し + 吸い込み + 一様流で「卵形の物体」のまわりの流れになる
// 2. 二重極だけを一様流に置く → 円柱。半径 √(κ/U) を U（左右キー）で変えて確かめる
// 3. 円柱の上に渦（3）を重ねる。流線が上下で非対称になる（→ 04 の揚力）
// 4. C で消して U = 0 にし、湧き出しと吸い込みを並べる。磁石や電荷の絵と同じ形になるのはなぜ？
// 5. 流線（水色）と等ポテンシャル線（砂色）がどこでも直角に交わっていることを確かめる


// ==================================================
// ここから下は「等高線を描く道具」です
// ==================================================
// 等高線を引く（マーチングスクエア法）：nx × ny の格子の値 f が「整数」になる所を線で結ぶ
// X(i, j), Y(i, j) = 格子点の画面座標。wrap > 0 なら、値が wrap だけ飛ぶ「切れ目」をまたいでつなぐ
function contourLines(g, f, nx, ny, X, Y, wrap) {
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let c = [f[i + j * nx], f[i + 1 + j * nx], f[i + 1 + (j + 1) * nx], f[i + (j + 1) * nx]];
    if (wrap) for (let k = 1; k < 4; k++) c[k] -= wrap * Math.round((c[k] - c[0]) / wrap);
    let lo = Math.min(c[0], c[1], c[2], c[3]), hi = Math.max(c[0], c[1], c[2], c[3]);
    if (!(hi - lo < 5)) continue; // 特異点のすぐそば（値が急変）は描かない
    let px = [X(i, j), X(i + 1, j), X(i + 1, j + 1), X(i, j + 1)], py = [Y(i, j), Y(i + 1, j), Y(i + 1, j + 1), Y(i, j + 1)];
    for (let L = Math.ceil(lo); L <= hi; L++) {
      let q = [];
      for (let k = 0; k < 4; k++) {
        let a = c[k], b = c[(k + 1) % 4];
        if ((a < L) !== (b < L)) { let s = (L - a) / (b - a); q.push(px[k] + s * (px[(k + 1) % 4] - px[k]), py[k] + s * (py[(k + 1) % 4] - py[k])); }
      }
      if (q.length >= 4) g.line(q[0], q[1], q[2], q[3]);
      if (q.length === 8) g.line(q[4], q[5], q[6], q[7]);
    }
  }
}
