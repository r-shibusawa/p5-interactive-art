// ============================================
// 08 モールの応力円
// 同じ応力状態でも、見る向き（切り口の角度 θ）で 垂直応力 σ と せん断応力 τ の値は変わる
// 要素を θ 回すと、モールの円の上では 2θ 進む。円の左右の端が主応力、上下の端が最大せん断応力
// 円の上の X・Y をドラッグ = σx, σy, τxy を変える / 左の要素をドラッグ = 回す / ←→ = θ / P = 主応力の向き / M = 最大せん断の向き / 1〜4 = 見本
// ============================================

let sx = 80, sy = -20, txy = 40;   // ★ 応力（MPa）：σx, σy, τxy
let theta = 0.35;                  // 要素を回す角度（ラジアン、反時計回りが正）
let pxPerMPa = 1.9;                // ★ 円の図の縮尺
let grab = null;
let ecx = 0, ecy = 0, mcx = 0, mcy = 0;   // 要素の中心、モール円の原点

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 応力の座標変換（θ だけ回した面での σx′, σy′, τx′y′）
function rotated(t) {
  let c = (sx + sy) / 2, d = (sx - sy) / 2;
  return {
    sx: c + d * Math.cos(2 * t) + txy * Math.sin(2 * t),
    sy: c - d * Math.cos(2 * t) - txy * Math.sin(2 * t),
    txy: -d * Math.sin(2 * t) + txy * Math.cos(2 * t),
  };
}

function arrow(x1, y1, x2, y2) {
  let a = Math.atan2(y2 - y1, x2 - x1);
  if (Math.hypot(x2 - x1, y2 - y1) < 4) return;
  line(x1, y1, x2, y2);
  line(x2, y2, x2 - 10 * Math.cos(a - 0.45), y2 - 10 * Math.sin(a - 0.45));
  line(x2, y2, x2 - 10 * Math.cos(a + 0.45), y2 - 10 * Math.sin(a + 0.45));
}

function draw() {
  background(212, 45, 13);
  ecx = width * 0.24; ecy = height * 0.56; mcx = width * 0.66; mcy = height * 0.56;
  if (keyIsDown(LEFT_ARROW)) theta += 0.01;
  if (keyIsDown(RIGHT_ARROW)) theta -= 0.01;
  theta = Math.atan2(Math.sin(theta), Math.cos(theta));   // −180°〜180° に収める
  let r = rotated(theta);
  let c = (sx + sy) / 2, d = (sx - sy) / 2, R = Math.hypot(d, txy);
  let s1 = c + R, s2 = c - R, thP = 0.5 * Math.atan2(txy, d);

  // ---- 左：回した要素と、その面にかかる応力の矢印
  push();
  translate(ecx, ecy);
  stroke(0, 0, 40); strokeWeight(1); line(-150, 0, 150, 0); line(0, -150, 0, 150);
  rotate(-theta);                                   // 画面では反時計回り
  let a = 62, k = 0.7;
  fill(200, 40, 55, 70); stroke(200, 50, 100); strokeWeight(2);
  rect(-a, -a, 2 * a, 2 * a);
  // 垂直応力（引張 = 外向き、圧縮 = 内向き）
  stroke(35, 90, 100); strokeWeight(3);
  let nx = Math.abs(r.sx) * k, ny = Math.abs(r.sy) * k;
  if (r.sx >= 0) { arrow(a + 6, 0, a + 6 + nx, 0); arrow(-a - 6, 0, -a - 6 - nx, 0); } else { arrow(a + 6 + nx, 0, a + 6, 0); arrow(-a - 6 - nx, 0, -a - 6, 0); }
  stroke(150, 70, 100);
  if (r.sy >= 0) { arrow(0, -a - 6, 0, -a - 6 - ny); arrow(0, a + 6, 0, a + 6 + ny); } else { arrow(0, -a - 6 - ny, 0, -a - 6); arrow(0, a + 6 + ny, 0, a + 6); }
  // せん断応力（τ が正：右の面で上向き）
  stroke(320, 60, 100);
  let h = (r.txy * k) / 2;
  arrow(a + 14, h, a + 14, -h); arrow(-a - 14, -h, -a - 14, h);
  arrow(-h, -a - 14, h, -a - 14); arrow(h, a + 14, -h, a + 14);
  stroke(0, 0, 100, 70); strokeWeight(1.5); line(0, 0, a, 0);   // x′ 軸
  pop();
  noFill(); stroke(0, 0, 100, 60); strokeWeight(1.5);
  if (Math.abs(theta) > 0.01) arc(ecx, ecy, 80, 80, Math.min(-theta, 0), Math.max(-theta, 0));
  noStroke(); fill(0, 0, 100); textSize(14);
  text('θ = ' + nf((theta * 180) / Math.PI, 1, 1) + '°', ecx + 48, ecy - 10);

  // ---- 右：モールの応力円（横軸 σ、縦軸 τ は下向きが正）
  let X = (s) => mcx + s * pxPerMPa, Y = (t) => mcy + t * pxPerMPa;
  stroke(0, 0, 45); strokeWeight(1);
  line(mcx - 290, mcy, mcx + 290, mcy); line(mcx, mcy - 240, mcx, mcy + 240);
  noStroke(); fill(0, 0, 60); textSize(13);
  text('σ（引張 +）', mcx + 220, mcy - 8); text('τ（下が +）', mcx + 8, mcy + 236);
  for (let v = -120; v <= 120; v += 40) if (v !== 0) text(v, X(v) - 10, mcy + 16);
  noFill(); stroke(0, 0, 100); strokeWeight(2);
  circle(X(c), mcy, 2 * R * pxPerMPa);
  // もとの面 X, Y（ドラッグできる）と、回した面 X′, Y′
  stroke(0, 0, 100, 35); strokeWeight(1.5); line(X(sx), Y(txy), X(sy), Y(-txy));
  stroke(50, 90, 100); strokeWeight(2.5); line(X(r.sx), Y(r.txy), X(r.sy), Y(-r.txy));
  // 2θ の弧
  noFill(); stroke(50, 90, 100, 70); strokeWeight(1.5);
  let a0 = Math.atan2(txy, d);
  if (R > 3 && Math.abs(theta) > 0.01) {
    let from = a0, to = a0 - 2 * theta;
    arc(X(c), mcy, 60, 60, Math.min(from, to), Math.max(from, to));
  }
  noStroke();
  fill(0, 0, 70); circle(X(sx), Y(txy), 16); circle(X(sy), Y(-txy), 16);
  fill(35, 90, 100); circle(X(r.sx), Y(r.txy), 13);
  fill(150, 70, 100); circle(X(r.sy), Y(-r.txy), 13);
  fill(0, 80, 100); circle(X(s1), mcy, 10); circle(X(s2), mcy, 10);
  fill(320, 60, 100); circle(X(c), Y(R), 10); circle(X(c), Y(-R), 10);
  fill(0, 0, 100); textSize(13);
  text('X（σx, τxy）', X(sx) + 12, Y(txy) + 16); text('Y（σy, −τxy）', X(sy) - 96, Y(-txy) - 10);
  text('σ1', X(s1) + 8, mcy - 8); text('σ2', X(s2) - 24, mcy - 8); text('τmax', X(c) + 8, Y(R) + 16);

  // ---- 数値
  noStroke(); fill(0, 0, 100); textSize(18);
  text('X・Y をドラッグ：応力　左の要素をドラッグ / ←→：回す　P：主応力の向き　M：最大せん断の向き　1〜4：見本', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('要素を θ 回すと、円の上の点（橙・緑）は中心のまわりに 2θ 進む。せん断が 0 になる向きが主応力の向き', 20, 68);
  let ix = 30, iy = height - 118;
  fill(0, 0, 100, 8); rect(ix - 12, iy - 26, width * 0.44, 132, 10);
  fill(0, 0, 100); textSize(15);
  text('σx = ' + nf(sx, 1, 0) + '　σy = ' + nf(sy, 1, 0) + '　τxy = ' + nf(txy, 1, 0) + ' MPa　→　中心 (σx+σy)/2 = ' + nf(c, 1, 0) + '、半径 R = ' + nf(R, 1, 1), ix, iy);
  fill(35, 90, 100); text('回した面：σx′ = ' + nf(r.sx, 1, 1) + '　σy′ = ' + nf(r.sy, 1, 1) + '　τx′y′ = ' + nf(r.txy, 1, 1), ix, iy + 26);
  fill(0, 80, 100); text('主応力 σ1 = ' + nf(s1, 1, 1) + '　σ2 = ' + nf(s2, 1, 1) + '　向き θp = ' + nf((thP * 180) / Math.PI, 1, 1) + '°', ix, iy + 52);
  fill(320, 60, 100); text('最大せん断応力 τmax = R = ' + nf(R, 1, 1) + ' MPa（主応力の向きから 45°）', ix, iy + 78);
}

function mousePressed() {
  grab = null;
  let X = (s) => mcx + s * pxPerMPa, Y = (t) => mcy + t * pxPerMPa;
  if (Math.hypot(mouseX - X(sx), mouseY - Y(txy)) < 20) grab = 'X';
  else if (Math.hypot(mouseX - X(sy), mouseY - Y(-txy)) < 20) grab = 'Y';
  else if (Math.hypot(mouseX - ecx, mouseY - ecy) < 190 && mouseY > 90) grab = 'E';
}
function mouseDragged() {
  if (grab === 'X') { sx = constrain((mouseX - mcx) / pxPerMPa, -120, 120); txy = constrain((mouseY - mcy) / pxPerMPa, -100, 100); }
  if (grab === 'Y') { sy = constrain((mouseX - mcx) / pxPerMPa, -120, 120); txy = constrain(-(mouseY - mcy) / pxPerMPa, -100, 100); }
  if (grab === 'E') theta = Math.atan2(ecy - mouseY, mouseX - ecx);
}
function mouseReleased() { grab = null; }

function keyPressed() {
  let presets = { '1': [100, 0, 0], '2': [0, 0, 60], '3': [80, 80, 0], '4': [80, -20, 40] };
  if (presets[key]) { [sx, sy, txy] = presets[key]; }
  let thP = 0.5 * Math.atan2(txy, (sx - sy) / 2);
  if (key === 'p' || key === 'P') theta = thP;
  if (key === 'm' || key === 'M') theta = thP + Math.PI / 4;
  if (key === 'r' || key === 'R') { sx = 80; sy = -20; txy = 40; theta = 0.35; }
}

// ---------- やってみよう ----------
// 1. 1（単軸引張）で要素を 45° 回そう。せん断応力が最大（σ/2）になる。延性材料が斜め 45° にすべる理由
// 2. 2（純せん断）で 45° 回すと、引張と圧縮だけになる。チョークをねじると斜め 45° に割れる理由
// 3. 3（等二軸）では円が点になる。どの向きでも同じ応力（せん断なし）。風船の表面がこれ
// 4. P を押して主応力の向きにし、要素の矢印からせん断（ピンク）が消えるのを確かめよう
// 5. 降伏条件（トレスカ）：τmax が降伏せん断応力に達したら降伏。τmax = 60 MPa を超えない σx, σy の組を探そう
