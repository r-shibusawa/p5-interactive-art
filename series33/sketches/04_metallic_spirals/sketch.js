// ============================================
// 04 黄金螺旋と白銀螺旋 ─ 正方形の渦と対数螺旋
// 01 の分割は「1/φ 倍して 90° 回す」の繰り返し。だから角は 1 本の対数螺旋の上に並ぶ
//   z(t) = C + (z0 − C) · φ^(−t) · e^(i·πt/2)   1 周（t = 4）で φ⁴ 倍
// ←→ = n / L = 対数螺旋 / A = 円弧の近似 / S = 正方形 / スペース = 無限ズーム / ↑↓ = ズームの速さ
// ============================================

let n = 1;              // ★ 貴金属比の n
let showLog = true, showArc = true, showSq = true;
let zooming = false;
let zoomT = 0;          // 0〜1 をくり返す（1 段分のズーム）
let zoomSpeed = 0.006;  // ★

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(235, 30, 9);
  let phi = metallic(n);
  // いちばん外の長方形：横 L0、縦 L0/φ。画面の中央に置く
  let L0 = min(width * 0.8, (height - 160) * 0.85 * phi);
  let O0 = { x: width / 2 - L0 / 2, y: height / 2 + 30 - L0 / phi / 2 };
  let u0 = { x: 1, y: 0 };
  // 渦の中心 C = O0 + L0·u0 / (1 − i/φ)
  let C = cadd(O0, cmul(cscale(u0, L0), cdiv({ x: 1, y: 0 }, { x: 1, y: -1 / phi })));

  if (zooming) { zoomT += zoomSpeed; if (zoomT >= 1) zoomT -= 1; }

  push();
  // ズーム：中心 C のまわりに φ^t 倍・−90°·t 回すと、1 段内側が外側にぴったり重なる
  translate(C.x, C.y);
  rotate(-HALF_PI * zoomT);
  scale(pow(phi, zoomT));
  translate(-C.x, -C.y);
  let sw = 1 / pow(phi, zoomT);

  for (let k = -3; k < 26; k++) {
    // k 段目：原点 Ok、長辺の向き uk = i^k u0、長さ Lk = L0 φ^(−k)
    let Lk = L0 * pow(phi, -k);
    if (Lk < 0.6) break;
    let uk = crot(u0, k * HALF_PI);
    let vk = crot(uk, HALF_PI);
    let Ok = cadd(C, cmul(csub(O0, C), cpowPolar(1 / phi, HALF_PI, k)));
    let s = Lk / phi; // 正方形の一辺
    if (showSq) {
      for (let j = 0; j < n; j++) {
        let p = cadd(Ok, cscale(uk, j * s));
        stroke(0, 0, 100, 50);
        strokeWeight(1.2 * sw);
        fill(((k + 30) * 37 + j * 14) % 360, 50, 70, 35);
        quad(p.x, p.y, p.x + uk.x * s, p.y + uk.y * s, p.x + uk.x * s + vk.x * s, p.y + uk.y * s + vk.y * s, p.x + vk.x * s, p.y + vk.y * s);
      }
    }
    // 円弧の近似：Pk = Ok + s·vk から P(k+1) = Ok + n·s·uk まで、角 Q を中心とする 1/4 楕円（n=1 なら 1/4 円）
    if (showArc) {
      let Q = cadd(Ok, cadd(cscale(uk, n * s), cscale(vk, s)));
      noFill();
      stroke(190, 80, 100);
      strokeWeight(3 * sw);
      beginShape();
      for (let th = 0; th <= HALF_PI + 0.001; th += HALF_PI / 16) {
        let p = cadd(Q, cadd(cscale(uk, -n * s * Math.cos(th)), cscale(vk, -s * Math.sin(th))));
        vertex(p.x, p.y);
      }
      endShape();
    }
  }
  // 本物の対数螺旋
  if (showLog) {
    noFill();
    stroke(50, 90, 100);
    strokeWeight(2.5 * sw);
    let P0 = cadd(O0, { x: 0, y: L0 / phi }); // いちばん外の長方形の左下の角
    beginShape();
    for (let t = -3; t < 26; t += 0.05) {
      let z = cadd(C, cmul(csub(P0, C), cpowPolar(1 / phi, HALF_PI, t)));
      vertex(z.x, z.y);
    }
    endShape();
  }
  pop();

  // 中心
  noStroke();
  fill(0, 0, 100);
  circle(C.x, C.y, 6);

  // 文字（下に半透明の帯）
  fill(0, 0, 0, 55);
  rect(0, 0, width, 84);
  rect(0, height - 48, width, 48);
  fill(0, 0, 100);
  textSize(18);
  text('n = ' + n + '（←→）' + nameOf(n) + '　L：対数螺旋 ' + onoff(showLog) + '　A：円弧 ' + onoff(showArc) + '　S：正方形 ' + onoff(showSq) + '　スペース：無限ズーム ' + onoff(zooming), 20, 40);
  fill(0, 0, 65);
  textSize(15);
  text('黄色 = 本物の対数螺旋（角を全部通る）、水色 = 正方形の角を中心にした 1/4 円（n≥2 は 1/4 楕円）をつないだ近似。1 周で φ⁴ = ' + nf(pow(phi, 4), 1, 2) + ' 倍、半周で φ² = ' + nf(phi * phi, 1, 3) + ' 倍', 20, 68);
  text('1/4 周（90°）ごとに φ = ' + nf(phi, 1, 4) + ' 倍。オウムガイの殻は 1 周で約 3 倍なので、実は黄金螺旋（6.85 倍）よりゆるい', 20, height - 24);
}

function keyPressed() {
  if (key === RIGHT_ARROW) n = min(n + 1, 5);
  if (key === LEFT_ARROW) n = max(n - 1, 1);
  if (key === UP_ARROW) zoomSpeed = min(0.03, zoomSpeed * 1.4);
  if (key === DOWN_ARROW) zoomSpeed = max(0.001, zoomSpeed / 1.4);
  if (key === 'l' || key === 'L') showLog = !showLog;
  if (key === 'a' || key === 'A') showArc = !showArc;
  if (key === 's' || key === 'S') showSq = !showSq;
  if (key === ' ') zooming = !zooming;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. n = 1 で 1/4 円と対数螺旋がほとんど重なることを確かめよう。n = 3 ではどれくらいずれる？
// 2. 無限ズーム中、どこが「つなぎ目」か分かる？ 分からないのは形が自己相似だから
// 3. cpowPolar の HALF_PI を PI / 3 に変えると？（もう長方形の渦ではなくなるが螺旋は描ける）
// 4. 正方形の色を「k が偶数か奇数か」で 2 色に塗り分けて、渦の腕を見つけよう

// ---------- 道具（複素数 = {x, y} として計算）----------
function metallic(k) { return (k + Math.sqrt(k * k + 4)) / 2; }
function nameOf(k) { return k === 1 ? '黄金螺旋' : k === 2 ? '白銀螺旋' : k === 3 ? '青銅螺旋' : k + ' 番目'; }
function onoff(b) { return b ? 'ON' : 'off'; }
function cadd(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function csub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function cmul(a, b) { return { x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x }; }
function cdiv(a, b) { let d = b.x * b.x + b.y * b.y; return { x: (a.x * b.x + a.y * b.y) / d, y: (a.y * b.x - a.x * b.y) / d }; }
function cscale(a, s) { return { x: a.x * s, y: a.y * s }; }
function crot(a, th) { return { x: a.x * Math.cos(th) - a.y * Math.sin(th), y: a.x * Math.sin(th) + a.y * Math.cos(th) }; }
// (r·e^(iθ))^t
function cpowPolar(r, th, t) { let m = Math.pow(r, t); return { x: m * Math.cos(th * t), y: m * Math.sin(th * t) }; }
