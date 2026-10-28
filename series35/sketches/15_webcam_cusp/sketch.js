// ============================================
// 15 カメラで操作するカスプ（おまけ）
// カメラの映像から「いちばん明るい所」または「動いた所」を見つけ、その位置をコントロール (a, b) にする
//   スマホのライトや手を動かすと、カスプの系 V = x⁴ + a·x² + b·x の状態 x が谷をすべり、折り目でとぶ
//   カメラが使えないときはマウスで動く（フォールバック）
// 1 = 明るい所を追う / 2 = 動いた所を追う / ↑↓ = 動きのしきい値 / C = 軌跡を消す（カメラの許可が必要）
// ============================================

let cap;
let vw = 160, vh = 120;     // ★ カメラ画像の大きさ（小さいほど速い）
let trackKind = 1;          // 1 明るさ, 2 動き
let motionThr = 40;         // ★ 動きのしきい値
let prevPix = null;
let a = -1, b = 0, x = 1;
let ta = -1, tb = 0;        // 目標（なめらかに追う）
let usingMouse = true;
let trail = [], flash = 0, jumpCount = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
}

function dV(xx) { return 4 * xx * xx * xx + 2 * a * xx + b; }

// ★ 画像から目標の位置（0〜1）を探す
function findTarget() {
  if (!cap || cap.width === 0) return null;
  cap.loadPixels();
  let px = cap.pixels;
  if (!px || px.length < vw * vh * 4) return null;
  let sx = 0, sy = 0, n = 0;
  if (trackKind === 1) {
    let maxB = 0;
    for (let i = 0; i < vw * vh; i++) { let v = px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]; if (v > maxB) maxB = v; }
    if (maxB < 300) return null;
    for (let i = 0; i < vw * vh; i++) { if (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2] >= maxB * 0.9) { sx += i % vw; sy += Math.floor(i / vw); n++; } }
  } else {
    if (prevPix) for (let i = 0; i < vw * vh; i++) {
      let d = Math.abs(px[i * 4] - prevPix[i * 4]) + Math.abs(px[i * 4 + 1] - prevPix[i * 4 + 1]) + Math.abs(px[i * 4 + 2] - prevPix[i * 4 + 2]);
      if (d > motionThr * 3) { sx += i % vw; sy += Math.floor(i / vw); n++; }
    }
    prevPix = px.slice();
    if (n < 20) return null;
  }
  if (n === 0) return null;
  return { u: sx / n / vw, v: sy / n / vh };
}

function draw() {
  background(170, 30, 10);
  let tg = findTarget();
  if (tg) { usingMouse = false; tb = -3 + 6 * tg.u; ta = 1.5 - 4.5 * tg.v; }
  else { usingMouse = true; tb = map(mouseX, 0, width, -3, 3, true); ta = map(mouseY, 100, height, 1.5, -3, true); }
  a += (ta - a) * 0.15; b += (tb - b) * 0.15;
  let before = x;
  for (let k = 0; k < 20; k++) x -= 0.004 * dV(x);
  x = constrain(x, -1.8, 1.8);
  if (abs(x - before) > 0.06 && flash < 20) { jumpCount++; flash = 40; }
  if (flash > 0) flash--;
  trail.push({ a, b, x }); if (trail.length > 400) trail.shift();

  // ---- 左：コントロール平面
  let py = 110, sz = min(height - py - 40, width * 0.5), px0 = 30;
  let toB = (v) => px0 + (v + 3) / 6 * sz, toA = (v) => py + (1.5 - v) / 4.5 * sz;
  noStroke(); fill(170, 25, 17); rect(px0, py, sz, sz, 8);
  if (flash > 0) { fill(50, 90, 100, flash); rect(px0, py, sz, sz, 8); }
  fill(50, 80, 100, 25); stroke(50, 80, 100); strokeWeight(2);
  beginShape(); for (let s = -0.7; s <= 0.701; s += 0.02) vertex(toB(8 * s ** 3), toA(-6 * s * s)); endShape(CLOSE);
  noStroke();
  for (let p of trail) { fill(p.x > 0 ? color(25, 90, 100, 40) : color(195, 80, 100, 40)); circle(toB(p.b), toA(p.a), 5); }
  fill(x > 0 ? color(25, 90, 100) : color(195, 80, 100)); circle(toB(b), toA(a), 22);
  fill(0, 0, 85); textSize(14); text('コントロール (a, b)：映像の位置がそのまま入る。黄 = カスプ', px0 + 12, py + 22);

  // ---- 右上：カメラ映像
  let rx = px0 + sz + 30, rw = width - rx - 30;
  let vwid = min(rw, 320), vhei = vwid * vh / vw;
  if (cap && cap.width > 0) image(cap, rx, py, vwid, vhei); else { fill(0, 0, 20); rect(rx, py, vwid, vhei); }
  if (tg) { noFill(); stroke(120, 90, 100); strokeWeight(3); circle(rx + tg.u * vwid, py + tg.v * vhei, 20); }
  noStroke(); fill(0, 0, 85); textSize(14);
  text(usingMouse ? '見つからない → マウスで操作中' : (trackKind === 1 ? '明るい所を追っています' : '動いた所を追っています'), rx, py + vhei + 20);

  // ---- 右下：いまの地形 V(x)
  let gy = py + vhei + 40, gh = height - gy - 40;
  noStroke(); fill(170, 25, 17); rect(rx, gy, rw, gh, 8);
  let toX = (v) => rx + (v + 1.8) / 3.6 * rw;
  let V = (v) => v ** 4 + a * v * v + b * v;
  let vmin = 1e9; for (let i = 0; i <= 100; i++) vmin = min(vmin, V(-1.8 + 3.6 * i / 100));
  let toY = (v) => gy + gh - 15 - (v - vmin) * gh * 0.15;
  noFill(); stroke(160, 60, 90); strokeWeight(3);
  beginShape(); for (let i = 0; i <= 100; i++) { let v = -1.8 + 3.6 * i / 100; vertex(toX(v), constrain(toY(V(v)), gy, gy + gh)); } endShape();
  noStroke(); fill(45, 90, 100); circle(toX(x), constrain(toY(V(x)) - 10, gy + 10, gy + gh), 18);
  fill(0, 0, 85); textSize(14); text('いまの地形 V(x) とボール', rx + 12, gy + 20);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('1：明るい所　2：動いた所（' + (trackKind === 1 ? '明るさ' : '動き') + '）　↑↓：しきい値 ' + motionThr + '　C：軌跡を消す　とんだ回数 ' + jumpCount + '　x = ' + nf(x, 1, 2), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('ライトを左右に振ると、カスプの中では行きと帰りで違う所でボールがとぶ。下の方（a < 0）ほど、とぶ幅が大きい', 20, 68);
}

function keyPressed() {
  if (key === '1') trackKind = 1;
  if (key === '2') { trackKind = 2; prevPix = null; }
  if (key === UP_ARROW) motionThr = min(120, motionThr + 5);
  if (key === DOWN_ARROW) motionThr = max(10, motionThr - 5);
  if (key === 'c' || key === 'C') trail = [];
}

// ---------- やってみよう ----------
// 1. ライトを画面の上の方（a > 0）と下の方（a < 0）で左右に振り、とび方を比べよう
// 2. 2（動き）で、手をゆっくり動かしたときと速く動かしたときの違いは？
// 3. 映像の明るさ全体の平均を a に、明るい所の横位置を b にしてみよう（部屋の電気で地形が変わる）
// 4. とんだ瞬間に 13 の ping を鳴らして、カメラの楽器にしよう
