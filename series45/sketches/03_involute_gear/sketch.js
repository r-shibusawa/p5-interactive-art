// ============================================
// 03 インボリュート歯車
// 歯の形は「基礎円に巻いた糸をほどくときの糸の先の軌跡」（インボリュート曲線）
// かみ合う点はいつも 2 つの基礎円の共通接線（作用線）の上を動く → 速度比が一定になる
// ←→ = 歯数 z1 / ↑↓ = 歯数 z2 / M・N = モジュール / A = 圧力角（14.5°・20°・25°）/ C = 円の表示 / スペース = 止める
// ============================================

let z1 = 14, z2 = 24;         // ★ 歯数
let moduleMm = 16;            // ★ モジュール m（歯の大きさ。ピッチ円直径 = m × z）
let paList = [14.5, 20, 25], paId = 1;   // ★ 圧力角（度）
let rot1 = 0;                 // 歯車 1 の回転角
let turnSpeed = 0.008;        // ★ 回る速さ
let playing = true, showCircles = true;
let out1 = [], out2 = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
}

function rebuild() {
  let pa = (paList[paId] * Math.PI) / 180;
  out1 = makeGearOutline(z1, moduleMm, pa);
  out2 = makeGearOutline(z2, moduleMm, pa);
}

function draw() {
  background(212, 45, 13);
  if (playing) rot1 += turnSpeed;
  let pa = (paList[paId] * Math.PI) / 180, m = moduleMm;
  let r1 = (m * z1) / 2, r2 = (m * z2) / 2;                    // ピッチ円
  let rb1 = r1 * Math.cos(pa), rb2 = r2 * Math.cos(pa);        // 基礎円
  let ra1 = r1 + m, ra2 = r2 + m;                              // 歯先円
  // 画面に収まるように全体を縮める
  let fit = Math.min(1, (width - 80) / (2 * (r1 + r2) + 4 * m), (height - 200) / (2 * Math.max(r1, r2) + 3 * m));
  // ★ かみ合いの条件：歯車 1 の歯が歯車 2 の谷に入る。回転角は歯数の逆比で逆向き
  let rot2 = Math.PI + Math.PI / z2 - (rot1 * z1) / z2;

  push();
  translate(width / 2 - ((r2 - r1) * fit) / 2, height * 0.56);
  scale(fit);
  let c1 = -r1, c2 = r2;                                       // ピッチ点を原点に、中心は左右
  stroke(0, 0, 100, 80); strokeWeight(1.5 / fit);
  fill(200, 55, 70); drawOutline(out1, c1, 0, rot1);
  fill(28, 60, 80); drawOutline(out2, c2, 0, rot2);
  noStroke(); fill(0, 0, 100);
  circle(c1, 0, 14 / fit); circle(c2, 0, 14 / fit);
  // 目印の歯
  fill(0, 0, 100);
  circle(c1 + (r1 - m) * Math.cos(rot1), (r1 - m) * Math.sin(rot1), 8 / fit);
  circle(c2 + (r2 - m) * Math.cos(rot2), (r2 - m) * Math.sin(rot2), 8 / fit);

  if (showCircles) {
    noFill(); strokeWeight(1.2 / fit);
    stroke(0, 0, 100, 45); circle(c1, 0, 2 * r1); circle(c2, 0, 2 * r2);        // ピッチ円
    stroke(140, 70, 100, 70); circle(c1, 0, 2 * rb1); circle(c2, 0, 2 * rb2);   // 基礎円
  }
  // ---- 作用線：基礎円の共通接線。ピッチ点を通り、共通接線（縦線）から圧力角 α だけ傾く
  let ux = Math.sin(pa), uy = Math.cos(pa);
  let t1x = c1 + rb1 * Math.cos(pa), t1y = -rb1 * Math.sin(pa);   // 歯車 1 側の接点
  let t2x = c2 - rb2 * Math.cos(pa), t2y = rb2 * Math.sin(pa);    // 歯車 2 側の接点
  stroke(50, 90, 100, 60); strokeWeight(1.5 / fit);
  line(t1x, t1y, t2x, t2y);
  line(c1, 0, t1x, t1y); line(c2, 0, t2x, t2y);
  // 実際にかみ合う区間：相手の歯先円が作用線を切るところまで
  let sEnd = -r1 * Math.sin(pa) + Math.sqrt(Math.max(r1 * r1 * Math.sin(pa) * Math.sin(pa) + ra1 * ra1 - r1 * r1, 0));
  let sStart = -(-r2 * Math.sin(pa) + Math.sqrt(Math.max(r2 * r2 * Math.sin(pa) * Math.sin(pa) + ra2 * ra2 - r2 * r2, 0)));
  sEnd = Math.min(sEnd, r2 * Math.sin(pa)); sStart = Math.max(sStart, -r1 * Math.sin(pa));   // 接点より先ではかみ合えない
  stroke(50, 90, 100); strokeWeight(4 / fit);
  line(sStart * ux, sStart * uy, sEnd * ux, sEnd * uy);
  // かみ合い点：作用線の上を、法線ピッチ pb = πm cos α ごとに並んで進む
  let pb = Math.PI * m * Math.cos(pa);
  let s0 = rb1 * (rot1 + Math.PI / (2 * z1));
  s0 = ((s0 % pb) + pb) % pb;
  noStroke(); fill(0, 90, 100);
  let contacts = 0;
  for (let k = -4; k <= 4; k++) {
    let s = s0 + k * pb;
    if (s >= sStart && s <= sEnd) { circle(s * ux, s * uy, 12 / fit); contacts++; }
  }
  fill(0, 0, 100); circle(0, 0, 8 / fit);   // ピッチ点
  pop();

  // ---- 数値
  let eps = (sEnd - sStart) / pb;                         // かみ合い率
  let zMin = 2 / (Math.sin(pa) * Math.sin(pa));           // 切り下げが起きない最小歯数
  noStroke(); fill(0, 0, 100); textSize(18);
  text('←→：z1 = ' + z1 + '　↑↓：z2 = ' + z2 + '　M・N：モジュール ' + m + '　A：圧力角 ' + paList[paId] + '°　C：円　スペース：' + (playing ? '止める' : '動かす'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('赤い点＝いま歯が触れている点。いつも黄色の作用線の上にあり、白いピッチ点を通る → 回転がなめらかに伝わる', 20, 68);
  let ix = 30, iy = height - 150;
  fill(0, 0, 100, 8); rect(ix - 12, iy - 26, 470, 150, 10);
  fill(0, 0, 100); textSize(15);
  text('ピッチ円 d = m z：' + m * z1 + ' / ' + m * z2 + '　中心距離 a = m(z1 + z2)/2 = ' + (m * (z1 + z2)) / 2, ix, iy);
  fill(140, 60, 100); text('基礎円 d_b = d cos α：' + nf(2 * rb1, 1, 1) + ' / ' + nf(2 * rb2, 1, 1), ix, iy + 24);
  fill(35, 90, 100); text('速度比 i = z2 / z1 = ' + nf(z2 / z1, 1, 3) + '（歯車 2 は ' + nf(z1 / z2, 1, 3) + ' 倍の速さで逆回転）', ix, iy + 48);
  fill(eps < 1.2 ? 0 : 0, eps < 1.2 ? 80 : 0, 100);
  text('かみ合い率 ε = ' + nf(eps, 1, 2) + '（いま ' + contacts + ' 組が接触。1.2 以上がめやす）', ix, iy + 72);
  let under = Math.min(z1, z2) < zMin;
  fill(under ? 0 : 0, under ? 80 : 0, under ? 100 : 60);
  text('切り下げなしの最小歯数 2 / sin² α = ' + nf(zMin, 1, 1) + (under ? '　→ 歯数が少なすぎる（歯元がえぐれる）' : ''), ix, iy + 96);
}

function keyPressed() {
  if (key === LEFT_ARROW) z1 = constrain(z1 - 1, 6, 40);
  if (key === RIGHT_ARROW) z1 = constrain(z1 + 1, 6, 40);
  if (key === DOWN_ARROW) z2 = constrain(z2 - 1, 6, 40);
  if (key === UP_ARROW) z2 = constrain(z2 + 1, 6, 40);
  if (key === 'm' || key === 'M') moduleMm = constrain(moduleMm + 2, 6, 30);
  if (key === 'n' || key === 'N') moduleMm = constrain(moduleMm - 2, 6, 30);
  if (key === 'a' || key === 'A') paId = (paId + 1) % paList.length;
  if (key === 'c' || key === 'C') showCircles = !showCircles;
  if (key === ' ') playing = !playing;
  rebuild();
}

// ---------- やってみよう ----------
// 1. スペースで止めて赤い点を数えよう。1 組 → 2 組 → 1 組 と入れ替わる。かみ合い率 ε はその平均
// 2. A で圧力角を変える。25° は歯元が太く強いが ε は小さい。14.5° は？
// 3. z1 を 6 まで減らすと歯元が細くなる（切り下げ）。17 枚（α = 20°）が境目と言われる理由を式で確かめよう
// 4. モジュールを変えても速度比は変わらない。変わるのは何？（大きさと強さ）
// 5. 道具の makeGearOutline の ha を 0.8 にすると「低歯」になる。ε はどう変わる？（sEnd の式の ra も直す）

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
