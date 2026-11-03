// ============================================
// 10 ピンホールカメラとレンズカメラ
// 小さな穴（ピンホール）を通った光は、奥の面にさかさまの像をつくる。穴が大きいとボケる、小さすぎても回折でボケる
//   像の大きさ = 物体の大きさ × v / z   （v = 穴からセンサーまで、z = 穴から物体まで）
//   ピンホールのボケ ≈ D (1 + v/z) + 2.44 λ v / D　　レンズのボケ（錯乱円） = D |v − v'| / v'   1/f = 1/z + 1/v'
// 上の図で物体をドラッグ = 奥行きと位置 / ←→ = 穴の直径 D / ↑↓ = センサーまでの距離 v（レンズ：ピント距離） / L = ピンホール ⇄ レンズ
// ============================================

let D = 0.6;           // ★ 穴（絞り）の直径 mm
let v = 50;            // ★ 穴からセンサーまでの距離 mm
let focalLen = 50;     // ★ レンズの焦点距離 mm
let focusZ = 800;      // レンズのピントを合わせる距離 mm
let lensMode = false;
let lambdaMm = 0.00055; // 緑の光の波長 mm
let objects = [];      // {lat, up, z, r, hue}：横位置・高さ・奥行き（mm）、半径 mm、色
let dragging = null;
let scaleTop;          // 上の図の mm → px

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  objects = [
    { lat: -150, up: 40, z: 500, r: 40, hue: 0 }, { lat: 60, up: -20, z: 800, r: 60, hue: 120 },
    { lat: 200, up: 80, z: 1300, r: 70, hue: 210 }, { lat: -60, up: -60, z: 2000, r: 90, hue: 45 },
    { lat: 120, up: 120, z: 2600, r: 120, hue: 300 },
  ];
}

// 上の図（真上から見た図）の座標：穴が (hx, hy)、物体は右（z が大きいほど遠く）
function topView() { return { hx: 140, hy: height * 0.25, s: (width - 220) / 3000 }; }

function draw() {
  background(225, 35, 10);
  let tv = topView();
  // ---- 上：真上から見た図
  noStroke(); fill(0, 0, 100, 5); rect(20, 100, width - 40, height * 0.33, 10);
  stroke(0, 0, 100, 30); strokeWeight(1); line(tv.hx, tv.hy, width - 40, tv.hy);   // 光軸
  // カメラ（箱）
  fill(0, 0, 30); noStroke(); rect(tv.hx - v * tv.s * 2 - 10, tv.hy - 60, v * tv.s * 2 + 10, 120, 4);
  fill(0, 0, 100); rect(tv.hx - v * tv.s * 2 - 10, tv.hy - 44, 4, 88);          // センサー
  fill(lensMode ? 190 : 45, 60, 100); rect(tv.hx - 2, tv.hy - 60, 4, 60 - D * 10); rect(tv.hx - 2, tv.hy + D * 10, 4, 60 - D * 10);
  // 物体（遠い順）
  let sorted = [...objects].sort((a, b) => b.z - a.z);
  for (let o of sorted) {
    let x = tv.hx + o.z * tv.s, y = tv.hy + o.lat * tv.s * 0.9;
    noStroke(); fill(o.hue, 70, 100); circle(x, y, o.r * tv.s * 2 + 8);
    stroke(o.hue, 70, 100, 40); strokeWeight(1); line(x, y, tv.hx, tv.hy);
    line(tv.hx, tv.hy, tv.hx - v * tv.s * 2, tv.hy - o.lat * tv.s * 0.9 * (v * 2 / o.z));
    fill(0, 0, 100); noStroke(); textSize(12); text(o.z + ' mm', x - 20, y + o.r * tv.s + 20);
  }
  if (lensMode) { stroke(190, 80, 100, 60); strokeWeight(2); let fx = tv.hx + focusZ * tv.s; line(fx, tv.hy - 70, fx, tv.hy + 70); noStroke(); fill(190, 80, 100); textSize(12); text('ピント ' + focusZ, fx - 24, tv.hy - 76); }

  // ---- 下：センサーの像
  let sw = 480, sh = 360, sx = width * 0.5 - sw / 2, sy = height - sh - 40;
  let pxPerMm = sw / 48;                                 // センサー 48 mm × 36 mm
  noStroke(); fill(0, 0, 4); rect(sx, sy, sw, sh);
  // 奥から順に描く（手前が上に重なる）
  for (let o of sorted) {
    let mag = v / o.z;
    let ix = sx + sw / 2 - o.lat * mag * pxPerMm, iy = sy + sh / 2 + o.up * mag * pxPerMm;   // さかさま
    let sz = o.r * mag * 2 * pxPerMm;
    let blurMm;
    if (!lensMode) blurMm = D * (1 + v / o.z) + 2.44 * lambdaMm * v / D;                // 幾何のボケ + 回折のボケ
    else { let vp = 1 / (1 / focalLen - 1 / o.z); blurMm = vp > 0 ? D * Math.abs(v - vp) / vp : D; }
    let blur = Math.min(300, blurMm * pxPerMm);
    // ボケを同心円で表す（ぼかしの幅だけ薄く広げる）
    let steps = 7, maxR = sz / 2 + blur / 2;
    drawingContext.save(); drawingContext.beginPath(); drawingContext.rect(sx, sy, sw, sh); drawingContext.clip();
    for (let k = steps; k >= 1; k--) {
      let rr = sz / 2 + (blur / 2) * (k / steps);
      let a = 95 / steps * Math.min(1, (sz / 2) / maxR + 0.15);
      fill(o.hue, 70, 100, a); circle(ix, iy, rr * 2);
    }
    drawingContext.restore();
  }
  noFill(); stroke(0, 0, 100, 50); strokeWeight(2); rect(sx, sy, sw, sh);
  noStroke(); fill(0, 0, 60); textSize(13); text('センサーに映る像（48 × 36 mm）', sx, sy - 8);

  // 右の説明パネル
  let px = sx + sw + 30, py = sy + 10;
  fill(0, 0, 100); textSize(15);
  if (!lensMode) {
    text('ピンホール', px, py);
    text('D = ' + nf(D, 1, 2) + ' mm　v = ' + v + ' mm', px, py + 26);
    text('ボケ ≈ D(1 + v/z) + 2.44λv/D', px, py + 56);
    let best = Math.sqrt(2.44 * lambdaMm * v);
    fill(45, 90, 100); text('いちばんボケない D ≈ √(2.44 λ v) = ' + nf(best, 1, 2) + ' mm', px, py + 82);
    fill(0, 0, 60); textSize(13);
    text('大きい穴：光の束が太くてボケる', px, py + 112); text('小さい穴：回折で広がってボケる（暗くもなる）', px, py + 132);
  } else {
    let vNow = 1 / (1 / focalLen - 1 / focusZ);
    text('レンズ　f = ' + focalLen + ' mm　絞り D = ' + nf(D, 1, 1) + ' mm', px, py);
    text('ピント距離 ' + focusZ + ' mm → v = ' + nf(vNow, 1, 1) + ' mm', px, py + 26);
    text('錯乱円 = D |v − v\'| / v\'', px, py + 56);
    fill(45, 90, 100); text('F 値 = f/D = ' + nf(focalLen / D, 1, 1), px, py + 82);
    fill(0, 0, 60); textSize(13);
    text('絞りを開く（D 大）とピント以外がボケる（浅い被写界深度）', px, py + 112); text('絞る（D 小）と全部くっきり（ピンホールに近づく）', px, py + 132);
  }

  fill(0, 0, 100); textSize(18);
  text((lensMode ? 'レンズカメラ' : 'ピンホールカメラ') + '（L）　D = ' + nf(D, 1, 2) + ' mm（←→）　' + (lensMode ? 'ピント距離 ' + focusZ + ' mm' : 'v = ' + v + ' mm') + '（↑↓）', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('上の図の丸をドラッグして奥行きと位置を変えよう。像はさかさま、遠いものほど小さい（大きさ × v/z）', 20, 68);
}

function mousePressed() {
  let tv = topView();
  for (let o of objects) if (Math.hypot(mouseX - (tv.hx + o.z * tv.s), mouseY - (tv.hy + o.lat * tv.s * 0.9)) < o.r * tv.s + 10) dragging = o;
}
function mouseDragged() {
  if (!dragging) return;
  let tv = topView();
  dragging.z = constrain((mouseX - tv.hx) / tv.s, 200, 3000);
  dragging.lat = constrain((mouseY - tv.hy) / (tv.s * 0.9), -300, 300);
}
function mouseReleased() { dragging = null; }
function keyPressed() {
  if (key === RIGHT_ARROW) D = Math.min(lensMode ? 25 : 3, D + (lensMode ? 1 : 0.1));
  if (key === LEFT_ARROW) D = Math.max(lensMode ? 1 : 0.05, D - (lensMode ? 1 : 0.1));
  if (key === UP_ARROW) { if (lensMode) focusZ = Math.min(3000, focusZ + 100); else v = Math.min(150, v + 5); }
  if (key === DOWN_ARROW) { if (lensMode) focusZ = Math.max(200, focusZ - 100); else v = Math.max(15, v - 5); }
  if (key === 'l' || key === 'L') { lensMode = !lensMode; D = lensMode ? 8 : 0.6; if (lensMode) v = 1 / (1 / focalLen - 1 / focusZ); else v = 50; }
  if (lensMode) v = 1 / (1 / focalLen - 1 / focusZ);
}

// ---------- やってみよう ----------
// 1. D を 0.05 から 3 まで変えて、像がいちばんくっきりする D を探そう。√(2.44λv) と合う？
// 2. v を大きく（↑）すると像が大きくなる（望遠）。でも暗くなる（実際のカメラも同じ）
// 3. L でレンズに。D = 25 にして手前にピントを合わせると、奥が大きくボケる（ポートレート写真）
// 4. 物体をピント距離の前後に置いて、どちら側のボケが大きいか比べよう
