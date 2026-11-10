// ============================================
// 04 歯車列と減速比
// 歯車をつなぐと、回転数は歯数の逆比で変わり、トルクはその分だけ大きくなる（速さ ⇄ 力の交換）
// 間にはさんだだけの歯車（遊び歯車）は向きを変えるだけ。同じ軸に大小 2 枚（複合歯車）で大きく減速できる
// クリック = その向きに歯車を足す（遠いほど歯数が多い）/ C = 最後の歯車と同じ軸に小歯車 / Z = 1 枚戻す / ↑↓ = 入力の回転数 / R = リセット
// ============================================

let gearM = 7;              // ★ モジュール（歯の大きさ、px）
let pinionZ = 12;           // ★ C で足す小歯車の歯数
let efficiency = 0.97;      // ★ かみ合い 1 回あたりの伝達効率
let inputRpm = 120;         // ★ 入力（最初の歯車）の回転数
let inputTorque = 1.0;      // ★ 入力トルク（N·m）
let gears = [];             // { x, y, z, parent, coax, rot, rpm, dirAngle }
let rot0 = 0;
let outlines = {};          // 歯数 → 輪郭（作り置き）
const PA = (20 * Math.PI) / 180;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetTrain();
}

function resetTrain() {
  gears = [{ x: width * 0.16, y: height * 0.55, z: 14, parent: -1, coax: false, rot: 0, rpm: 0, dirAngle: 0 }];
  addMesh(width * 0.16 + 180, height * 0.55);
}

function outlineOf(z) {
  if (!outlines[z]) outlines[z] = makeGearOutline(z, gearM, PA);
  return outlines[z];
}

// (mx, my) の向きに、最後の歯車とかみ合う歯車を足す
function addMesh(mx, my) {
  if (gears.length >= 14) return;
  let p = gears[gears.length - 1];
  let d = Math.hypot(mx - p.x, my - p.y);
  if (d < 1) return;
  let z = constrain(Math.round((2 * d) / gearM - p.z), 8, 60);      // 中心距離 a = m(z1 + z2)/2 から歯数を決める
  let a = (gearM * (p.z + z)) / 2, ang = Math.atan2(my - p.y, mx - p.x);
  gears.push({ x: p.x + a * Math.cos(ang), y: p.y + a * Math.sin(ang), z, parent: gears.length - 1, coax: false, rot: 0, rpm: 0, dirAngle: ang });
}

// ★ 回転数と回転角を親から順に決める
function updateTrain() {
  gears[0].rot = rot0; gears[0].rpm = inputRpm;
  for (let i = 1; i < gears.length; i++) {
    let g = gears[i], p = gears[g.parent];
    if (g.coax) { g.rpm = p.rpm; g.rot = p.rot; }                   // 同じ軸：同じ回転
    else {
      g.rpm = (-p.rpm * p.z) / g.z;                                 // かみ合い：歯数の逆比で逆回転
      g.rot = g.dirAngle + Math.PI + Math.PI / g.z - ((p.rot - g.dirAngle) * p.z) / g.z;   // 歯が谷に入る角度
    }
  }
}

function draw() {
  background(212, 45, 13);
  rot0 += (inputRpm / 60) * TWO_PI / 60 * 0.25;     // 画面は 1/4 のスローモーション
  updateTrain();

  let meshes = 0;
  for (let i = 0; i < gears.length; i++) {
    let g = gears[i], r = (gearM * g.z) / 2;
    if (i > 0 && !g.coax) meshes++;
    stroke(0, 0, 100, 70); strokeWeight(1);
    fill(g.coax ? 320 : i === 0 ? 8 : i === gears.length - 1 ? 45 : 200, 55, g.coax ? 60 : 75, g.coax ? 100 : 92);
    drawOutline(outlineOf(g.z), g.x, g.y, g.rot);
    noStroke(); fill(0, 0, 100);
    circle(g.x, g.y, 10);
    circle(g.x + (r - gearM * 2.2) * Math.cos(g.rot), g.y + (r - gearM * 2.2) * Math.sin(g.rot), 6);
    // 回転方向の矢印（弧）
    noFill(); stroke(0, 0, 100, 80); strokeWeight(2);
    let s = g.rpm >= 0 ? 1 : -1, ar = Math.min(r * 0.5, 40);
    arc(g.x, g.y, ar * 2, ar * 2, -2.2, -0.9);
    let ea = s > 0 ? -0.9 : -2.2, ex = g.x + ar * Math.cos(ea), ey = g.y + ar * Math.sin(ea);
    let ta = Math.atan2(s * Math.cos(ea), -s * Math.sin(ea));         // 矢印の先での進行方向
    line(ex, ey, ex - 9 * Math.cos(ta + 0.5), ey - 9 * Math.sin(ta + 0.5));
    line(ex, ey, ex - 9 * Math.cos(ta - 0.5), ey - 9 * Math.sin(ta - 0.5));
  }
  // ラベルは歯車の上に重ねて最後に描く
  noStroke(); fill(0, 0, 100); textSize(13);
  for (let g of gears) {
    let r = (gearM * g.z) / 2;
    if (!g.coax) text('z = ' + g.z + '　' + nf(Math.abs(g.rpm), 1, 1) + ' rpm', g.x - 46, g.y + r + gearM + 18);
    else text('同軸 z = ' + g.z, g.x - 30, g.y - r - gearM - 8);
  }

  // マウスの向きに足せる歯車の下書き
  let last = gears[gears.length - 1];
  let d = Math.hypot(mouseX - last.x, mouseY - last.y);
  if (d > 1 && mouseY > 90 && gears.length < 14) {
    let z = constrain(Math.round((2 * d) / gearM - last.z), 8, 60), a = (gearM * (last.z + z)) / 2;
    noFill(); stroke(0, 0, 100, 30); strokeWeight(1);
    circle(last.x + (a * (mouseX - last.x)) / d, last.y + (a * (mouseY - last.y)) / d, gearM * z);
  }

  // ---- 全体の速度比・トルク
  let ratio = inputRpm / last.rpm;                       // 速度比 i = 入力 / 出力
  let eta = Math.pow(efficiency, meshes);
  let outTorque = inputTorque * Math.abs(ratio) * eta;
  noStroke(); fill(0, 0, 100); textSize(18);
  text('クリック：歯車を足す　C：同じ軸に小歯車（z = ' + pinionZ + '）　Z：1 枚戻す　↑↓：入力 ' + inputRpm + ' rpm　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('赤＝入力、黄＝出力。間の歯車は歯数が式から消える（遊び歯車）。大きく減速したいときは C で複合歯車に', 20, 68);
  let ix = width - 430, iy = height - 140;
  fill(0, 0, 0, 55); rect(ix - 16, iy - 30, 420, 150, 10);
  fill(0, 0, 100); textSize(16);
  text('回転数：n2 / n1 = − z1 / z2（かみ合うたびに逆回転）', ix, iy);
  fill(35, 90, 100);
  text('速度比 i = n入 / n出 = ' + nf(ratio, 1, 2) + (Math.abs(ratio) >= 1 ? '（減速）' : '（増速）'), ix, iy + 28);
  fill(190, 70, 100);
  text('出力 ' + nf(Math.abs(last.rpm), 1, 1) + ' rpm、' + (ratio > 0 ? '入力と同じ向き' : '入力と逆向き'), ix, iy + 54);
  fill(320, 60, 100);
  text('出力トルク = ' + nf(inputTorque, 1, 1) + ' × |i| × η = ' + nf(outTorque, 1, 2) + ' N·m', ix, iy + 80);
  fill(0, 0, 60); textSize(13);
  text('η = ' + efficiency + ' の ' + meshes + ' 乗 = ' + nf(eta, 1, 3) + '（かみ合い ' + meshes + ' 回ぶんの損失）', ix, iy + 104);
}

function mousePressed() { if (mouseY > 90) addMesh(mouseX, mouseY); }

function keyPressed() {
  if ((key === 'c' || key === 'C') && gears.length < 14) {
    let p = gears[gears.length - 1];
    if (!p.coax && p.z > pinionZ) gears.push({ x: p.x, y: p.y, z: pinionZ, parent: gears.length - 1, coax: true, rot: 0, rpm: 0, dirAngle: 0 });
  }
  if ((key === 'z' || key === 'Z') && gears.length > 1) gears.pop();
  if (key === 'r' || key === 'R') resetTrain();
  if (key === UP_ARROW) inputRpm = constrain(inputRpm + 30, 30, 600);
  if (key === DOWN_ARROW) inputRpm = constrain(inputRpm - 30, 30, 600);
}

// ---------- やってみよう ----------
// 1. 歯車を横に 3 枚並べよう。真ん中の歯数を変えても（Z で戻して距離を変える）速度比は同じ。なぜ？
// 2. 大歯車 → C → 大歯車 → C → 大歯車 と 2 段の複合歯車列を作り、速度比 20 以上を目指そう
// 3. かみ合いの回数が偶数なら同じ向き、奇数なら逆向き。確かめよう
// 4. 時計の「分針 → 時針」は 1/12。歯数 8 以上 60 以下の歯車で 12 : 1 を作るには？（例：3 × 4）
// 5. efficiency を 0.9 にすると、段数を増やしたときトルクはどれだけ損をする？

// ==================================================
// ここから下は「歯車の道具」です（インボリュート歯形の輪郭を作る）
// ==================================================

// 歯数 z、モジュール m、圧力角 pa（ラジアン）の歯車の輪郭を [x, y] の配列で返す
//   歯 1 枚の中心が角度 0（+x 方向）を向く。ha・hf は歯先・歯元の高さ（モジュールの何倍か）
//   インボリュート：基礎円 rb に巻いた糸をほどくときの糸の先。ほどいた角 t の点は
//   半径 rb√(1 + t²)、角度 inv = t − atan t
function makeGearOutline(z, m, pa, ha, hf) {
  if (ha === undefined) ha = 1;
  if (hf === undefined) hf = 1.25;
  let r = (m * z) / 2, rb = r * Math.cos(pa);
  let ra = r + ha * m, rf = Math.max(r - hf * m, m);
  let half = Math.PI / (2 * z) + Math.tan(pa) - pa;      // 基礎円の上での歯の半角
  let t0 = rf > rb ? Math.sqrt((rf / rb) * (rf / rb) - 1) : 0;
  let t1 = Math.sqrt(Math.max((ra / rb) * (ra / rb) - 1, t0 * t0));
  let flank = [];                                        // [半径, 歯の中心からの角度]
  if (rf < rb) flank.push([rf, half]);                   // 基礎円より内側はまっすぐ
  for (let i = 0; i <= 8; i++) {
    let t = t0 + ((t1 - t0) * i) / 8;
    flank.push([rb * Math.sqrt(1 + t * t), Math.max(half - (t - Math.atan(t)), 0)]);
  }
  let pts = [];
  for (let k = 0; k < z; k++) {
    let c = (k * 2 * Math.PI) / z;
    pts.push([rf * Math.cos(c - Math.PI / z), rf * Math.sin(c - Math.PI / z)]);   // 歯底の真ん中
    for (let i = 0; i < flank.length; i++) pts.push([flank[i][0] * Math.cos(c - flank[i][1]), flank[i][0] * Math.sin(c - flank[i][1])]);
    for (let i = flank.length - 1; i >= 0; i--) pts.push([flank[i][0] * Math.cos(c + flank[i][1]), flank[i][0] * Math.sin(c + flank[i][1])]);
  }
  return pts;
}

// 輪郭を (x, y) に角度 rot で描く
function drawOutline(pts, x, y, rot) {
  push();
  translate(x, y);
  rotate(rot);
  beginShape();
  for (let p of pts) vertex(p[0], p[1]);
  endShape(CLOSE);
  pop();
}
