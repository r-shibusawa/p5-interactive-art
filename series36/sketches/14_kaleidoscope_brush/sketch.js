// ============================================
// 14 万華鏡ブラシ
// 鏡を N 枚、放射状に組んだ万華鏡。描いた線が N 回対称に映り、鏡なので裏返しの像も出る（2N 個のコピー）
//   1 本の線を描く → 中心まわりに 360°/N ずつ回した位置にも描く → さらに鏡で折り返した位置にも描く
// ドラッグ = 描く / ↑↓ = 鏡の枚数 N / M = 鏡の折り返し ON/off / 1〜3 = ブラシ / W = 鏡の線を見る / C = 消す / S = 保存
// ============================================

let N = 6;                // ★ 鏡の枚数（対称の数）
let mirrored = true;      // 折り返し（鏡像）も描く
let brush = 1;            // 1 線、2 粒、3 光
let showWedge = false;
let pg;                   // 絵をためておく層
let hueBase = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pg = createGraphics(width, height);
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.background(230, 40, 6);
}

// ★ 点 (x, y) を万華鏡の 2N 個の像に写す（中心まわりの回転 + 鏡の折り返し）
function images(x, y) {
  let cx = width / 2, cy = height / 2;
  let dx = x - cx, dy = y - cy;
  let r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  let out = [];
  for (let k = 0; k < N; k++) {
    let rot = (TWO_PI * k) / N;
    out.push({ x: cx + r * Math.cos(a + rot), y: cy + r * Math.sin(a + rot) });
    if (mirrored) out.push({ x: cx + r * Math.cos(-a + rot), y: cy + r * Math.sin(-a + rot) });   // 鏡像：角度を反転
  }
  return out;
}

function draw() {
  hueBase = (hueBase + 0.4) % 360;
  if (mouseIsPressed && (pmouseX !== mouseX || pmouseY !== mouseY)) {
    let v = Math.hypot(mouseX - pmouseX, mouseY - pmouseY);
    let A = images(pmouseX, pmouseY), B = images(mouseX, mouseY);
    let hue = (hueBase + v * 2) % 360;
    for (let i = 0; i < A.length; i++) {
      if (brush === 1) {
        pg.stroke(hue, 70, 100, 90); pg.strokeWeight(Math.max(1.5, 14 - v * 0.5));
        pg.line(A[i].x, A[i].y, B[i].x, B[i].y);
      } else if (brush === 2) {
        pg.noStroke(); pg.fill(hue, 60, 100, 80);
        for (let k = 0; k < 3; k++) { let t = k / 3; pg.circle(A[i].x + (B[i].x - A[i].x) * t + random(-4, 4), A[i].y + (B[i].y - A[i].y) * t + random(-4, 4), random(2, 7)); }
      } else {
        pg.noStroke();
        for (let k = 4; k >= 1; k--) { pg.fill(hue, 50, 100, 6); pg.circle(B[i].x, B[i].y, 10 + k * 10 + v); }
        pg.fill(0, 0, 100, 60); pg.circle(B[i].x, B[i].y, 4);
      }
    }
  }
  image(pg, 0, 0);

  if (showWedge) {
    let cx = width / 2, cy = height / 2;
    stroke(0, 0, 100, 25); strokeWeight(1);
    for (let k = 0; k < N; k++) {
      let a = (TWO_PI * k) / N; line(cx, cy, cx + 2000 * Math.cos(a), cy + 2000 * Math.sin(a));
      if (mirrored) { let a2 = a + PI / N; stroke(0, 0, 100, 10); line(cx, cy, cx + 2000 * Math.cos(a2), cy + 2000 * Math.sin(a2)); stroke(0, 0, 100, 25); }
    }
  }
  // マウスの像の位置を小さく表示
  noStroke(); fill(0, 0, 100, 50);
  for (let p of images(mouseX, mouseY)) circle(p.x, p.y, 5);

  fill(0, 0, 100); textSize(18);
  text('鏡 ' + N + ' 枚（↑↓）　折り返し ' + (mirrored ? 'ON' : 'off') + '（M）　ブラシ ' + ['', '線', '粒', '光'][brush] + '（1〜3）　W：鏡の線　C：消す　S：保存', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('ドラッグで描く。1 本の線が ' + (mirrored ? 2 * N : N) + ' 本に。速く動かすと細く、ゆっくりだと太い', 20, 68);
}

function keyPressed() {
  if (key === UP_ARROW) N = Math.min(24, N + 1);
  if (key === DOWN_ARROW) N = Math.max(1, N - 1);
  if (key === 'm' || key === 'M') mirrored = !mirrored;
  if (key === '1' || key === '2' || key === '3') brush = Number(key);
  if (key === 'w' || key === 'W') showWedge = !showWedge;
  if (key === 'c' || key === 'C') pg.background(230, 40, 6);
  if (key === 's' || key === 'S') saveCanvas('kaleidoscope', 'png');
}

// ---------- やってみよう ----------
// 1. N = 1 で折り返し ON にすると、ただの左右対称。N = 2 で上下左右。本物の万華鏡は鏡 3 枚（N = 3）
// 2. 鏡の線（W）を出して、1 つの扇形の中だけに描く。他の扇形は「鏡の中」
// 3. 中心からの距離 r を「r の 2 乗」や「sin(r)」に変えて写すと、鏡が曲がった万華鏡になる
// 4. 色を時間でなく「中心からの距離」で決めると、同心円の虹になる。自由制作のベースに
