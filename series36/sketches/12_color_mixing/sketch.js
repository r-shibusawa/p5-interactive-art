// ============================================
// 12 加法混色と減法混色
// 光を足す（加法混色）：赤 + 緑 + 青 のスポットライトが重なると白に近づく（ディスプレイ）
// 色を引く（減法混色）：シアン・マゼンタ・イエローのフィルタを重ねると黒に近づく（印刷・絵の具）
//   目には 3 種類の錐体（L・M・S）しかない。だから 3 色で「ほぼすべての色」が作れる
// スポット / フィルタをドラッグ / S = 加法 ⇄ 減法 / ↑↓ = 大きさ / ←→ = 明るさ / R = リセット
// ============================================

let subtractive = false;
let radius = 170;          // ★ スポットの半径
let bright = 1.0;          // ★ 明るさ（0.2〜1）
let spots = [];
let dragging = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  resetSpots();
}
function resetSpots() {
  let cx = width * 0.36, cy = height * 0.5, r = 95;
  spots = [
    { x: cx, y: cy - r, rgb: [255, 0, 0], cmy: [0, 255, 255], name: ['赤', 'シアン'] },
    { x: cx - r * 0.87, y: cy + r * 0.5, rgb: [0, 255, 0], cmy: [255, 0, 255], name: ['緑', 'マゼンタ'] },
    { x: cx + r * 0.87, y: cy + r * 0.5, rgb: [0, 0, 255], cmy: [255, 255, 0], name: ['青', 'イエロー'] },
  ];
}

// 点 (x, y) でのスポットの強さ（中心 1 → 縁 0 のなめらかな山）
function falloff(s, x, y) {
  let d = Math.hypot(x - s.x, y - s.y) / radius;
  return d >= 1 ? 0 : Math.pow(1 - d * d, 1.5);
}

function draw() {
  background(subtractive ? 255 : 0);
  // ★ 重ね方：加法 = 足す（ADD）、減法 = かけ算（MULTIPLY）
  blendMode(subtractive ? MULTIPLY : ADD);
  noStroke();
  let rings = 24;
  for (let s of spots) {
    for (let k = rings; k >= 1; k--) {
      let rr = radius * k / rings;
      let w = Math.pow(1 - (rr / radius) ** 2, 1.5) * bright;            // この半径での強さ
      if (subtractive) {
        // フィルタ：白 (255) から色を w の分だけ引く → 重ねると暗くなる
        let c = s.cmy; fill(255 - (255 - c[0]) * w / rings * 2.2, 255 - (255 - c[1]) * w / rings * 2.2, 255 - (255 - c[2]) * w / rings * 2.2);
      } else {
        let c = s.rgb; fill(c[0] * w / rings * 2.2, c[1] * w / rings * 2.2, c[2] * w / rings * 2.2);
      }
      circle(s.x, s.y, rr * 2);
    }
  }
  blendMode(BLEND);
  // 名前
  for (let s of spots) { fill(subtractive ? 0 : 255); textSize(14); text(s.name[subtractive ? 1 : 0], s.x - 10, s.y - radius - 10); }

  // マウスの位置の色を計算して表示（式で）
  let mx = mouseX, my = mouseY, ws = spots.map((s) => falloff(s, mx, my) * bright);
  let col;
  if (subtractive) col = [0, 1, 2].map((i) => 255 * spots.reduce((p, s, k) => p * (1 - (1 - s.cmy[i] / 255) * ws[k]), 1));
  else col = [0, 1, 2].map((i) => Math.min(255, spots.reduce((p, s, k) => p + s.rgb[i] * ws[k], 0)));
  let fg = subtractive ? 0 : 255, bgp = subtractive ? [235, 235, 235] : [25, 25, 30];
  let px = width - 420, py = 100;
  fill(bgp[0], bgp[1], bgp[2]); rect(px - 16, py - 30, 400, 150, 10);
  fill(col[0], col[1], col[2]); stroke(fg); strokeWeight(1); rect(px, py - 10, 70, 70, 6);
  noStroke(); fill(fg); textSize(15);
  text('マウスの位置の色', px + 90, py + 4);
  text('R ' + Math.round(col[0]) + '　G ' + Math.round(col[1]) + '　B ' + Math.round(col[2]), px + 90, py + 30);
  textSize(13); fill(fg);
  text(subtractive ? '白 × (1 − 吸収₁) × (1 − 吸収₂) × …　重ねるほど暗い' : '赤 + 緑 + 青　重ねるほど明るい', px + 90, py + 56);
  text(subtractive ? 'C + M + Y → 黒（理論）。印刷では K（黒）を足す CMYK' : 'R + G + B → 白。R + G = 黄、G + B = シアン、R + B = マゼンタ', px, py + 96);

  // 下：スペクトルと錐体の感度（簡易近似）
  let gx = 60, gw = width - 120, gy = height - 50, gh = 110;
  for (let x = 0; x < gw; x++) { let nm = 400 + x / gw * 300; let c = wavelengthToRGB(nm); stroke(c[0], c[1], c[2]); line(gx + x, gy - 14, gx + x, gy); }
  noFill(); strokeWeight(2);
  let cones = [{ peak: 445, sd: 22, c: [90, 120, 255], nm: 'S（青）' }, { peak: 540, sd: 40, c: [60, 220, 90], nm: 'M（緑）' }, { peak: 570, sd: 45, c: [255, 90, 70], nm: 'L（赤）' }];
  for (let k of cones) {
    stroke(k.c[0], k.c[1], k.c[2]);
    beginShape();
    for (let x = 0; x <= gw; x += 3) { let nm = 400 + x / gw * 300; vertex(gx + x, gy - 18 - Math.exp(-((nm - k.peak) ** 2) / (2 * k.sd * k.sd)) * gh); }
    endShape();
  }
  noStroke(); fill(fg); textSize(13);
  text('400 nm', gx, gy + 16); text('700 nm', gx + gw - 44, gy + 16);
  text('目の 3 種類の錐体の感度（ガウス関数での簡易近似）：S・M・L。どんな光も、この 3 つの反応の組 (L, M, S) にまとめられる → 3 色で色が作れる', gx, gy - gh - 30);
  fill(fg); textSize(18);
  text((subtractive ? '減法混色（フィルタ・絵の具）' : '加法混色（光）') + '（S）　半径 ' + radius + '（↑↓）　明るさ ' + nf(bright, 1, 1) + '（←→）　R：リセット', 20, 40);
  fill(subtractive ? 80 : 180); textSize(15);
  text('丸をドラッグして重ねよう。' + (subtractive ? '3 枚重なった所が黒に近づく' : '3 つ重なった所が白に近づく。2 つ重なると黄・シアン・マゼンタ'), 20, 68);
}

function mousePressed() { for (let s of spots) if (Math.hypot(mouseX - s.x, mouseY - s.y) < radius * 0.6) dragging = s; }
function mouseDragged() { if (dragging) { dragging.x = mouseX; dragging.y = mouseY; } }
function mouseReleased() { dragging = null; }
function keyPressed() {
  if (key === 's' || key === 'S') subtractive = !subtractive;
  if (key === UP_ARROW) radius = Math.min(320, radius + 10);
  if (key === DOWN_ARROW) radius = Math.max(60, radius - 10);
  if (key === RIGHT_ARROW) bright = Math.min(1, bright + 0.1);
  if (key === LEFT_ARROW) bright = Math.max(0.2, bright - 0.1);
  if (key === 'r' || key === 'R') { resetSpots(); radius = 170; bright = 1; }
}

// ---------- やってみよう ----------
// 1. 赤と緑だけ重ねると黄色。でもスペクトルの「黄色の光（580 nm）」は入っていない。目には区別できない（条件等色）
// 2. 減法混色（S）でシアンとイエローを重ねると緑。絵の具の「青 + 黄 = 緑」はこれ
// 3. 4 つ目のスポット（白や黄）を spots に足してみよう
// 4. 錐体の感度のピークを動かすと「色覚の違い」のモデルになる。L と M が近いとどうなる？

// ==================================================
// ここから下は「色の道具」（波長 nm → RGB の近似）
// ==================================================
function wavelengthToRGB(nm) {
  nm = Math.max(380, Math.min(780, nm));
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else r = 1;
  let f = 1;
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 700) f = 0.3 + 0.7 * (780 - nm) / 80;
  return [255 * Math.pow(r * f, 0.8), 255 * Math.pow(g * f, 0.8), 255 * Math.pow(b * f, 0.8)];
}
