// ============================================
// 15 粘菌（スライムモールド）シミュレーション（おまけ）
// 数千の粒が「前の3方向のにおいをかいで、強い方へ進み、においを残す」だけ。
// 本物の粘菌が電車の路線図のようなネットワークをつくるのと同じしくみ
// クリックでエサ（においの源）を置く / 1〜3 で動きのタイプ / C でリセット
// ============================================

let scale = 3; // においマップの粗さ（大きいほど速い）
let gw, gh;
let trail, trail2;
let agents = [];
let count = 4000;
let sensorAngle = 0.4, sensorDist = 9, turnSpeed = 0.3; // ★ 粘菌の性格
let img;
let foods = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  gw = floor(width / scale);
  gh = floor(height / scale);
  trail = new Float32Array(gw * gh);
  trail2 = new Float32Array(gw * gh);
  img = createImage(gw, gh);
  for (let i = 0; i < count; i++) {
    let a = random(TWO_PI), r = random(min(gw, gh) * 0.3);
    agents.push({ x: gw / 2 + cos(a) * r, y: gh / 2 + sin(a) * r, angle: random(TWO_PI) });
  }
}

function draw() {
  // エサはにおいを出し続ける
  for (let f of foods) trail[f.x + f.y * gw] = 5;

  // ---- 粒を動かす ----
  for (let a of agents) {
    // 前・左前・右前 のにおいを調べる
    let f = sense(a, 0), l = sense(a, sensorAngle), r = sense(a, -sensorAngle);
    if (f > l && f > r) {
      // まっすぐ
    } else if (l > r) a.angle += turnSpeed;
    else if (r > l) a.angle -= turnSpeed;
    else a.angle += random(-0.3, 0.3);

    a.x += cos(a.angle);
    a.y += sin(a.angle);
    // 端で跳ね返る
    if (a.x < 0 || a.x >= gw) { a.angle = PI - a.angle; a.x = constrain(a.x, 0, gw - 1); }
    if (a.y < 0 || a.y >= gh) { a.angle = -a.angle; a.y = constrain(a.y, 0, gh - 1); }
    // においを残す
    let i = floor(a.x) + floor(a.y) * gw;
    trail[i] = min(trail[i] + 1, 5);
  }

  // ---- においを広げて（ぼかす）、少し消す ----
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      let i = x + y * gw;
      let s = trail[i - 1] + trail[i + 1] + trail[i - gw] + trail[i + gw] + trail[i] * 4;
      trail2[i] = (s / 8) * 0.95; // 0.95 = 消える速さ
    }
  }
  [trail, trail2] = [trail2, trail];

  // ---- 描く ----
  img.loadPixels();
  for (let i = 0; i < gw * gh; i++) {
    let v = min(trail[i] / 2, 1);
    let p = i * 4;
    img.pixels[p] = v * 255;
    img.pixels[p + 1] = v * v * 230;
    img.pixels[p + 2] = v * 80;
    img.pixels[p + 3] = 255;
  }
  img.updatePixels();
  image(img, 0, 0, width, height);

  noStroke();
  fill(0, 180);
  rect(0, 0, width, 44);
  fill(255);
  textSize(16);
  text('クリックでエサを置く　1：道をつくる　2：細かい網　3：うねる　C：リセット　粒 ' + count, 16, 28);
}

// 角度 offset の方向、sensorDist 先のにおいの強さ
function sense(a, offset) {
  let ang = a.angle + offset;
  let x = floor(a.x + cos(ang) * sensorDist), y = floor(a.y + sin(ang) * sensorDist);
  if (x < 0 || y < 0 || x >= gw || y >= gh) return 0;
  return trail[x + y * gw];
}

function mousePressed() {
  if (mouseY > 44) foods.push({ x: floor(mouseX / scale), y: floor(mouseY / scale) });
}

function keyPressed() {
  if (key === '1') { sensorAngle = 0.4; sensorDist = 9; turnSpeed = 0.3; }
  if (key === '2') { sensorAngle = 0.8; sensorDist = 4; turnSpeed = 0.6; }
  if (key === '3') { sensorAngle = 0.2; sensorDist = 20; turnSpeed = 0.1; }
  if (key === 'c' || key === 'C') { trail.fill(0); foods = []; }
}

// ---------- やってみよう ----------
// 1. エサを3〜4か所に置いて、粘菌がそれらをつなぐ道をつくるのを待とう
// 2. 消える速さ 0.95 を 0.9 や 0.99 に
// 3. 色の式を変えて、本物の粘菌（黄色）や、電気回路のような見た目に
