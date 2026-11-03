// ============================================
// 00 透視図法：地面の格子と線路
// 地面の平行線（線路・格子）は、画面の上では 1 つの点 = 消失点に集まる。これが「射影」の出発点
//   目の高さ h、焦点距離 f のピンホールで地面の点 (X, Z) を写す：  sx = cx + f·X / Z,  sy = cy + f·h / Z
//   Z → ∞ で (cx, cy) = 消失点。地平線はすべての「地面の無限遠点」の集まり
// 消失点をドラッグ / ↑↓ = 地平線の高さ / ←→ = 目の高さ h / 1 = 1 点透視（線路） / 2 = 2 点透視（箱） / G = 作図線 / R = リセット
// ============================================

let vp = { x: 0, y: 0 };        // 消失点（地平線の上）
let eyeH = 1.6;                 // ★ 目の高さ（m）
let focal = 700;                // ★ 焦点距離（px）。大きいほど望遠
let gauge = 1.2;                // ★ 線路の幅（m）
let spread = 560;               // ★ 2 点透視のときの 2 つの消失点の間隔（px）
let view = 1;                   // 1 = 1 点透視, 2 = 2 点透視
let showGuide = true;
let boxes = [];                 // 2 点透視の箱

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}
function resetAll() {
  vp = { x: width * 0.5, y: height * 0.42 };
  eyeH = 1.6;
  // 箱：手前の縦の辺（x, 底の y, 高さ）と、左右の消失点へ向かう割合
  boxes = [{ x: 0.32, y: 0.88, h: 0.34, l: 0.42, r: 0.5, hue: 15 },
           { x: 0.62, y: 0.80, h: 0.22, l: 0.3, r: 0.36, hue: 200 },
           { x: 0.48, y: 0.70, h: 0.10, l: 0.2, r: 0.25, hue: 45 }];
}

// ★ 地面の点 (X, Z) [m]（X = 左右、Z = 奥行き）と高さ hgt [m] を画面に写す（1 点透視 = ピンホールそのもの）
function project(X, Z, hgt) {
  return { x: vp.x + (focal * X) / Z, y: vp.y + (focal * (eyeH - (hgt || 0))) / Z };
}

function draw() {
  // 空と地面
  noStroke();
  fill(220, 45, 22); rect(0, 0, width, vp.y);
  fill(35, 40, 14); rect(0, vp.y, width, height - vp.y);
  if (mouseIsPressed && mouseY > 90) vp = { x: constrain(mouseX, 40, width - 40), y: constrain(mouseY, 120, height - 120) };
  if (view === 1) drawOnePoint(); else drawTwoPoint();

  // 地平線と消失点
  stroke(45, 60, 100, 60); strokeWeight(1);
  drawDashed(0, vp.y, width, vp.y, 12);
  noStroke(); fill(45, 90, 100);
  if (view === 1) circle(vp.x, vp.y, 12);
  else { circle(vp.x - spread / 2, vp.y, 12); circle(vp.x + spread / 2, vp.y, 12); }

  fill(0, 0, 100); textSize(18);
  text((view === 1 ? '1 点透視（線路）' : '2 点透視（箱）') + '　ドラッグ：消失点　↑↓：地平線　←→：目の高さ h = ' + nf(eyeH, 1, 1) + ' m　G：作図線 ' + (showGuide ? 'ON' : 'off') + '　1/2：切替　R：リセット', 20, 40);
  fill(0, 0, 65); textSize(15);
  text(view === 1 ? '地面の平行線はすべて消失点へ。sy = cy + f·h / Z なので、Z が 2 倍になると地平線からの距離は半分。目の高さを変えると枕木の間隔が変わる'
                  : '2 つの消失点はどちらも地平線の上。箱の縦の辺だけが平行のまま（縦方向の消失点は無限遠）。箱の奥の辺は、左右の消失点への線の交点', 20, 68);
}

// 1 点透視：格子・線路・電柱
function drawOnePoint() {
  let far = 400, near = 0.6;
  // 奥行き方向の線（X = 一定）→ すべて消失点へ
  strokeWeight(1);
  for (let X = -12; X <= 12; X += 1) {
    let a = project(X, near), b = project(X, far);
    stroke(45, 30, 70, showGuide ? 30 : 12); line(a.x, a.y, b.x, b.y);
  }
  // 横方向の線（Z = 一定）→ 地平線に平行、間隔が 1/Z で詰まる
  for (let Z = 1; Z <= 60; Z += 1) {
    let a = project(-12, Z), b = project(12, Z);
    stroke(45, 30, 70, 25); line(a.x, a.y, b.x, b.y);
  }
  // 枕木（流れる）
  let shift = (millis() * 0.0015) % 0.8;
  stroke(25, 50, 55); strokeWeight(3);
  for (let Z = near + shift; Z < 80; Z += 0.8) {
    let a = project(-gauge * 0.7, Z), b = project(gauge * 0.7, Z);
    strokeWeight(max(1, 6 / Z)); line(a.x, a.y, b.x, b.y);
  }
  // レール
  stroke(200, 30, 95); strokeWeight(3);
  for (let X of [-gauge / 2, gauge / 2]) { let a = project(X, near), b = project(X, far); line(a.x, a.y, b.x, b.y); }
  // 電柱（高さ 4 m）：てっぺんも消失点に向かう線に乗る
  stroke(45, 20, 85); strokeWeight(2);
  for (let Z = 3 + (shift * 10) % 8; Z < 120; Z += 8) {
    let g = project(3.5, Z), t = project(3.5, Z, 4);
    strokeWeight(max(1, 8 / Z)); line(g.x, g.y, t.x, t.y);
  }
  if (showGuide) { stroke(45, 90, 100, 50); strokeWeight(1); let g = project(3.5, 3, 4); line(g.x, g.y, vp.x, vp.y); }
}

// 2 点透視：箱。手前の縦辺から、左右の消失点へ向かう線で奥行きをつくる
function drawTwoPoint() {
  let VL = { x: vp.x - spread / 2, y: vp.y }, VR = { x: vp.x + spread / 2, y: vp.y };
  for (let b of boxes) {
    let fx = width * b.x, fy = height * b.y, hpx = height * b.h;
    let B = { x: fx, y: fy }, T = { x: fx, y: fy - hpx };
    let BL = lerpPt(B, VL, b.l), TL = lerpPt(T, VL, b.l), BR = lerpPt(B, VR, b.r), TR = lerpPt(T, VR, b.r);
    let BB = meet(BL, VR, BR, VL), TB = meet(TL, VR, TR, VL);   // 奥の辺 = 作図線の交点
    noStroke();
    fill(b.hue, 55, 70, 85); quad(B.x, B.y, BL.x, BL.y, TL.x, TL.y, T.x, T.y);     // 左の面
    fill(b.hue, 55, 55, 85); quad(B.x, B.y, BR.x, BR.y, TR.x, TR.y, T.x, T.y);     // 右の面
    fill(b.hue, 40, 90, 85); quad(T.x, T.y, TL.x, TL.y, TB.x, TB.y, TR.x, TR.y);   // 上の面
    stroke(0, 0, 10); strokeWeight(2); noFill();
    quad(B.x, B.y, BL.x, BL.y, TL.x, TL.y, T.x, T.y); quad(B.x, B.y, BR.x, BR.y, TR.x, TR.y, T.x, T.y);
    quad(T.x, T.y, TL.x, TL.y, TB.x, TB.y, TR.x, TR.y);
    if (showGuide) {
      stroke(45, 90, 100, 35); strokeWeight(1);
      for (let p of [B, T, BR, TR]) line(p.x, p.y, VL.x, VL.y);
      for (let p of [B, T, BL, TL]) line(p.x, p.y, VR.x, VR.y);
    }
  }
}

function lerpPt(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
// 直線 ab と直線 cd の交点（2D の外積版。詳しくは 02）
function meet(a, b, c, d) {
  let l1 = [a.y - b.y, b.x - a.x, a.x * b.y - b.x * a.y], l2 = [c.y - d.y, d.x - c.x, c.x * d.y - d.x * c.y];
  let x = l1[1] * l2[2] - l1[2] * l2[1], y = l1[2] * l2[0] - l1[0] * l2[2], w = l1[0] * l2[1] - l1[1] * l2[0];
  if (Math.abs(w) < 1e-9) return { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
  return { x: x / w, y: y / w };
}
function drawDashed(x1, y1, x2, y2, d) {
  let L = dist(x1, y1, x2, y2), n = floor(L / d);
  for (let i = 0; i < n; i += 2) line(lerp(x1, x2, i / n), lerp(y1, y2, i / n), lerp(x1, x2, (i + 1) / n), lerp(y1, y2, (i + 1) / n));
}

function keyPressed() {
  if (key === UP_ARROW) vp.y = max(120, vp.y - 15);
  if (key === DOWN_ARROW) vp.y = min(height - 120, vp.y + 15);
  if (key === LEFT_ARROW) eyeH = max(0.3, eyeH - 0.1);
  if (key === RIGHT_ARROW) eyeH = min(6, eyeH + 0.1);
  if (key === '1') view = 1;
  if (key === '2') view = 2;
  if (key === 'g' || key === 'G') showGuide = !showGuide;
  if (key === 'r' || key === 'R') resetAll();
}

// ---------- やってみよう ----------
// 1. 目の高さ h を 0.3 m（猫の目線）と 6 m（2 階から）にして、線路の見え方を比べよう
// 2. focal を 300 と 1500 に変える。広角と望遠では、同じ Z の枕木の間隔はどう変わる？
// 3. 2 点透視で spread を小さくすると箱がゆがむ（消失点が近すぎる = 超広角）。自然に見える間隔は？
// 4. 電柱のように「高さのあるもの」を線路の両側に並べて、街並みを描いてみよう（project(X, Z, hgt) を使う）
