// ============================================
// 02 距離を変えると形が変わる
// 「近い」の測り方（距離）を変えると、同じサイトでもボロノイ図の形が変わる
//   ユークリッド √(dx² + dy²)・マンハッタン |dx| + |dy|・チェビシェフ max(|dx|, |dy|)・ミンコフスキー (|dx|^p + |dy|^p)^(1/p)
// 1〜4 = 距離の種類 / ←→ = p（ミンコフスキー）/ ドラッグ = 動かす / クリック = 追加 / R = ランダム / C = 消す
// ============================================

let sites = [];
let metric = 1;           // 1 ユークリッド 2 マンハッタン 3 チェビシェフ 4 ミンコフスキー
let p = 3;                // ★ ミンコフスキーの p（1 = マンハッタン、2 = ユークリッド、大きいほどチェビシェフ）
let res = 5;              // ★ 計算の細かさ
let buf, gw, gh;
let dirty = true;
let dragging = -1;
let names = ['', 'ユークリッド', 'マンハッタン（碁盤の目の道）', 'チェビシェフ（王将の動き）', 'ミンコフスキー'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  gw = ceil(width / res); gh = ceil(height / res);
  buf = createGraphics(gw, gh);
  buf.pixelDensity(1);
  randomSites(14);
}
function randomSites(n) {
  sites = [];
  for (let i = 0; i < n; i++) sites.push({ x: random(60, width - 60), y: random(120, height - 40) });
  dirty = true;
}

// ★ 距離の定義（ここを書きかえると新しい形のボロノイ図）
function metricDist(dx, dy) {
  dx = Math.abs(dx); dy = Math.abs(dy);
  if (metric === 1) return Math.sqrt(dx * dx + dy * dy);
  if (metric === 2) return dx + dy;
  if (metric === 3) return Math.max(dx, dy);
  // ミンコフスキー：大きい方で割ってから p 乗すると、桁あふれしない
  let m = Math.max(dx, dy);
  if (m === 0) return 0;
  return m * Math.pow(Math.pow(dx / m, p) + Math.pow(dy / m, p), 1 / p);
}

function paintBuffer() {
  let cols = sites.map((s, i) => hsbToRgb((i * 137.5) % 360, 45, 85));
  buf.loadPixels();
  let px = buf.pixels;
  let lab = new Int16Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let x = (gx + 0.5) * res, y = (gy + 0.5) * res, best = -1, bd = Infinity;
      for (let i = 0; i < sites.length; i++) {
        let d = metricDist(x - sites[i].x, y - sites[i].y);
        if (d < bd) { bd = d; best = i; }
      }
      lab[gx + gy * gw] = best;
    }
  }
  // となりとラベルが違う画素 = 境界（暗く）
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let i = gx + gy * gw, l = lab[i], k = 4 * i;
      let edge = (gx + 1 < gw && lab[i + 1] !== l) || (gy + 1 < gh && lab[i + gw] !== l);
      let c = l >= 0 ? cols[l] : [25, 25, 25];
      let f = edge ? 0.2 : 1;
      px[k] = c[0] * f; px[k + 1] = c[1] * f; px[k + 2] = c[2] * f; px[k + 3] = 255;
    }
  }
  buf.updatePixels();
  dirty = false;
}

// 「距離 = r の点の集まり」（その距離での“円”）をかく
function drawUnitBall(cx, cy, r) {
  beginShape();
  for (let k = 0; k < 120; k++) {
    let t = k / 120 * TWO_PI, ux = cos(t), uy = sin(t);
    let d = metricDist(ux, uy);
    vertex(cx + ux / d * r, cy + uy / d * r);
  }
  endShape(CLOSE);
}

function draw() {
  if (dirty) paintBuffer();
  image(buf, 0, 0, gw * res, gh * res);
  for (let s of sites) { stroke(0, 0, 10); strokeWeight(2); fill(0, 0, 100); circle(s.x, s.y, 11); }

  // マウスから最寄りのサイトまでの距離で“円”をかく：円の上にサイトが乗っている
  if (sites.length && mouseY > 90) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < sites.length; i++) { let d = metricDist(mouseX - sites[i].x, mouseY - sites[i].y); if (d < bd) { bd = d; best = i; } }
    noFill(); stroke(0, 0, 100); strokeWeight(2);
    drawUnitBall(mouseX, mouseY, bd);
    stroke(0, 0, 100, 50); line(mouseX, mouseY, sites[best].x, sites[best].y);
  }
  // 左下：距離 = 1 の“円”の見本
  noStroke(); fill(0, 0, 0, 55); rect(20, height - 170, 150, 150, 10);
  noFill(); stroke(50, 90, 100); strokeWeight(3);
  drawUnitBall(95, height - 95, 60);
  noStroke(); fill(0, 0, 100); textSize(13); text('距離 = 1 の「円」', 32, height - 150);

  noStroke(); fill(0, 0, 0, 55); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text('1〜4：距離 = ' + names[metric] + (metric === 4 ? '　p = ' + nf(p, 1, 2) + '（←→）' : '') + '　ドラッグ：動かす　クリック：追加　R：ランダム　C：消す', 20, 40);
  fill(0, 0, 80); textSize(15);
  text('マウスの線 = 最寄りのサイトまでの“円”。マンハッタンではひし形、チェビシェフでは正方形 → 境界が 45° や水平・垂直の折れ線になる。p を 1 → 2 → 8 と動かしてみよう', 20, 68);
}

function mousePressed() {
  if (mouseY < 90) return;
  for (let i = 0; i < sites.length; i++) if (dist(mouseX, mouseY, sites[i].x, sites[i].y) < 14) { dragging = i; return; }
  sites.push({ x: mouseX, y: mouseY }); dirty = true;
}
function mouseDragged() {
  if (dragging < 0) return;
  sites[dragging].x = constrain(mouseX, 0, width); sites[dragging].y = constrain(mouseY, 90, height); dirty = true;
}
function mouseReleased() { dragging = -1; }

function keyPressed() {
  if (key === '1' || key === '2' || key === '3' || key === '4') { metric = int(key); dirty = true; }
  if (key === RIGHT_ARROW) { p = min(12, p < 1 ? p + 0.1 : p + 0.25); metric = 4; dirty = true; }
  if (key === LEFT_ARROW) { p = max(0.5, p <= 1 ? p - 0.1 : p - 0.25); metric = 4; dirty = true; }
  if (key === 'r' || key === 'R') randomSites(floor(random(8, 22)));
  if (key === 'c' || key === 'C') { sites = []; dirty = true; }
}

// ---------- やってみよう ----------
// 1. p = 1 と マンハッタン、p = 2 と ユークリッド、p = 12 と チェビシェフ を見比べよう
// 2. p を 1 より小さく（0.5）すると“円”がへこむ（星形）。これはもう「距離」と呼べない（三角不等式が成り立たない）。セルはどうなる？
// 3. metricDist を dx * 2 + dy のように「横に長い」距離にすると、セルはどちらに伸びる？
// 4. マンハッタン距離で、2 つのサイトを斜め 45° に並べると境界に「面」ができることがある。探してみよう

// 色の変換（HSB → RGB 0〜255）
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  let k = (n) => (n + h / 60) % 6;
  let f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [255 * f(5), 255 * f(3), 255 * f(1)];
}
