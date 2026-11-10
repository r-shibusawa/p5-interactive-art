// ============================================
// 05 遊星歯車
// 太陽歯車・遊星歯車・内歯車（リング）・キャリアの 4 つ。どれを固定するかで速度比が変わる
// ウィリスの式：(ω太陽 − ωキャリア) / (ωリング − ωキャリア) = − zリング / z太陽
// 1 = 内歯車を固定 / 2 = 太陽を固定 / 3 = キャリアを固定 / 4 = 直結 / ←→ = 太陽の歯数 / ↑↓ = 入力の速さ / スペース = 止める
// ============================================

let sunList = [12, 18, 24, 30, 36], sunId = 2;   // ★ 太陽の歯数の候補（内歯車は 60 枚、遊星 3 個で組み立てられる組）
let ringZ = 60;            // 内歯車の歯数
let planetCount = 3;       // 遊星の数
let gearM = 8;             // ★ モジュール（px）
let fixId = 1;             // 1 リング固定 / 2 太陽固定 / 3 キャリア固定 / 4 直結
let inputSpeed = 0.02;     // ★ 入力の速さ（ラジアン/フレーム）
let rotSun = 0, rotCar = 0, playing = true;
let outSun = [], outPlanet = [], outRing = [];
const PA = (20 * Math.PI) / 180;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  let zs = sunList[sunId], zp = (ringZ - zs) / 2;       // 遊星の歯数は zリング = z太陽 + 2 z遊星 から決まる
  outSun = makeGearOutline(zs, gearM, PA);
  outPlanet = makeGearOutline(zp, gearM, PA);
  outRing = makeGearOutline(ringZ, gearM, PA, 1.25, 1);   // 内歯車は「歯のすき間」の形を描く
}

// ★ ウィリスの式から、太陽とキャリアの角速度を決める（リングは式から出る）
function speeds() {
  let zs = sunList[sunId], w = inputSpeed;
  if (fixId === 1) return { ws: w, wc: (w * zs) / (zs + ringZ) };   // リング固定：太陽 → キャリア
  if (fixId === 2) return { ws: 0, wc: w };                          // 太陽固定：キャリア → リング
  if (fixId === 3) return { ws: w, wc: 0 };                          // キャリア固定：太陽 → リング（逆転）
  return { ws: w, wc: w };                                           // 直結：全体が一体で回る
}

function draw() {
  background(212, 45, 13);
  let zs = sunList[sunId], zp = (ringZ - zs) / 2;
  let sp = speeds();
  if (playing) { rotSun += sp.ws; rotCar += sp.wc; }
  let wr = sp.wc - ((sp.ws - sp.wc) * zs) / ringZ;       // リングの角速度（ウィリスの式）

  let ccx = width * 0.36, ccy = height * 0.56;
  let rs = (gearM * zs) / 2, rp = (gearM * zp) / 2, rr = (gearM * ringZ) / 2;
  let fit = Math.min(1, (height - 190) / (2 * rr + 6 * gearM));
  push();
  translate(ccx, ccy);
  scale(fit);
  // かみ合いの角度：遊星 0 の向き g0 を基準に、遊星とリングの回転角を決める
  let g0 = rotCar;
  let rotRing = g0 + (Math.PI * (zp + 1)) / ringZ - ((rotSun - g0) * zs) / ringZ;
  // 内歯車：大きな円を塗り、内側を「60 枚の歯車の形」にくりぬく
  noStroke(); fill(fixId === 1 ? 0 : 150, fixId === 1 ? 0 : 45, fixId === 1 ? 38 : 60);
  circle(0, 0, 2 * rr + 7 * gearM);
  fill(212, 45, 13); stroke(0, 0, 100, 60); strokeWeight(1 / fit);
  drawOutline(outRing, 0, 0, rotRing);
  noStroke(); fill(0, 0, 100);
  circle((rr + 2.4 * gearM) * Math.cos(rotRing), (rr + 2.4 * gearM) * Math.sin(rotRing), 9);   // リングの目印
  // 太陽
  stroke(0, 0, 100, 70); fill(fixId === 2 ? 0 : 40, fixId === 2 ? 0 : 75, fixId === 2 ? 45 : 95);
  drawOutline(outSun, 0, 0, rotSun);
  noStroke(); fill(0, 0, 100); circle((rs - 2.5 * gearM) * Math.cos(rotSun), (rs - 2.5 * gearM) * Math.sin(rotSun), 7);
  // 遊星
  let centers = [];
  for (let i = 0; i < planetCount; i++) {
    let g = g0 + (i * TWO_PI) / planetCount;
    let rotP = g + Math.PI + Math.PI / zp - ((rotSun - g) * zs) / zp;
    let x = (rs + rp) * Math.cos(g), y = (rs + rp) * Math.sin(g);
    centers.push([x, y]);
    stroke(0, 0, 100, 70); fill(200, 55, 85);
    drawOutline(outPlanet, x, y, rotP);
    noStroke(); fill(0, 0, 100); circle(x + (rp - 2.5 * gearM) * Math.cos(rotP), y + (rp - 2.5 * gearM) * Math.sin(rotP), 6);
  }
  // キャリア（遊星の軸をつなぐ腕）
  stroke(fixId === 3 ? 0 : 320, fixId === 3 ? 0 : 55, fixId === 3 ? 55 : 100, 85); strokeWeight(10 / fit); noFill();
  for (let c of centers) line(0, 0, c[0], c[1]);
  noStroke(); fill(0, 0, 100);
  for (let c of centers) circle(c[0], c[1], 12);
  circle(0, 0, 14);
  pop();

  // ---- 文字
  let names = ['内歯車（リング）を固定', '太陽を固定', 'キャリアを固定', '直結（全部いっしょに回る）'];
  let inName = fixId === 2 ? 'キャリア' : '太陽', outName = fixId === 1 ? 'キャリア' : fixId === 4 ? 'リング' : 'リング';
  let wIn = inputSpeed, wOut = fixId === 1 ? sp.wc : wr;
  let ratio = wIn / wOut;
  noStroke(); fill(0, 0, 100); textSize(18);
  text('1〜4：' + names[fixId - 1] + '　←→：太陽の歯数 ' + zs + '　↑↓：入力の速さ　スペース：' + (playing ? '止める' : '動かす'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('灰色＝固定している部品。同じ歯車の組でも、固定する相手を変えるだけで減速・増速・逆転が切り替わる（自動変速機のしくみ）', 20, 68);
  let ix = width - 470, iy = 130;
  fill(0, 0, 100, 8); rect(ix - 16, iy - 30, 460, 330, 10);
  fill(0, 0, 100); textSize(16);
  text('ウィリスの式', ix, iy);
  text('(ωs − ωc) / (ωr − ωc) = − zr / zs = ' + nf(-ringZ / zs, 1, 2), ix, iy + 26);
  fill(0, 0, 70); textSize(14);
  text('歯数：太陽 zs = ' + zs + '　遊星 zp = ' + zp + '　内歯車 zr = ' + ringZ + '（zr = zs + 2 zp）', ix, iy + 54);
  // 3 つの角速度のバー
  let rowsW = [['太陽 ωs', sp.ws, 40], ['キャリア ωc', sp.wc, 320], ['リング ωr', wr, 150]];
  for (let i = 0; i < 3; i++) {
    let y = iy + 96 + i * 40, v = rowsW[i][1] / 0.06;
    fill(0, 0, 100); textSize(14); text(rowsW[i][0], ix, y + 5);
    stroke(0, 0, 40); strokeWeight(1); line(ix + 250, y - 12, ix + 250, y + 12);
    noStroke(); fill(rowsW[i][2], 60, 100);
    rect(ix + 250, y - 7, constrain(v, -1.6, 1.6) * 110, 14);
    fill(0, 0, 100); text(Math.abs(rowsW[i][1]) < 1e-9 ? '固定' : nf(rowsW[i][1] / inputSpeed, 1, 3), ix + 100, y + 5);
  }
  fill(35, 90, 100); textSize(16);
  text('入力：' + inName + ' → 出力：' + outName, ix, iy + 228);
  text('速度比 i = ω入 / ω出 = ' + nf(ratio, 1, 3) + (ratio < 0 ? '（逆転）' : Math.abs(ratio) > 1.001 ? '（減速）' : Math.abs(ratio) < 0.999 ? '（増速）' : '（1 : 1）'), ix, iy + 254);
  fill(0, 0, 60); textSize(13);
  text(['i = 1 + zr / zs', 'i = zr / (zs + zr)', 'i = − zr / zs', 'i = 1'][fixId - 1] + '　　バーの数字は入力を 1 としたときの速さ', ix, iy + 280);
}

function keyPressed() {
  if (key >= '1' && key <= '4') fixId = Number(key);
  if (key === LEFT_ARROW) sunId = constrain(sunId - 1, 0, sunList.length - 1);
  if (key === RIGHT_ARROW) sunId = constrain(sunId + 1, 0, sunList.length - 1);
  if (key === UP_ARROW) inputSpeed = constrain(inputSpeed + 0.005, 0.005, 0.06);
  if (key === DOWN_ARROW) inputSpeed = constrain(inputSpeed - 0.005, 0.005, 0.06);
  if (key === ' ') playing = !playing;
  rebuild();
}

// ---------- やってみよう ----------
// 1. 1（リング固定）で太陽の歯数を 12 → 36 と変える。速度比 1 + zr/zs は 6 から 2.67 まで変わる。確かめよう
// 2. 3（キャリア固定）では遊星はその場で回るだけ（ふつうの歯車列）。リングが逆転する理由を説明しよう
// 3. 2（太陽固定）は増速？減速？ 自転車の内装変速機はこれを使っている
// 4. 遊星 3 個を等間隔に置ける条件は (zs + zr) / 3 が整数。sunList に 20 を足すとどうなる？（歯がぶつかる）
// 5. ハイブリッド車の動力分割機構：太陽 = 発電機、キャリア = エンジン、リング = タイヤ。エンジン一定でリングを止めると太陽は？

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
