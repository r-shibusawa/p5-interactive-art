// ============================================
// 04 ローレンツ・アトラクター（カオスの蝶）
// 気象学者ローレンツが天気の式を3つに単純化したら、
// 「決まった形」の上を「二度と同じ道を通らず」まわり続ける軌道が現れた
// マウスで回転 / クリックで2つ目の点を追加（わずかにずれた場所から）/ C で消す
// ============================================

let points = []; // 動く点たち {x, y, z, hue, trail}
let sigma = 10, rho = 28, beta = 8 / 3; // ローレンツの3つの定数
let rotY = 0, rotX = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  points.push({ x: 0.1, y: 0, z: 0, hue: 180, trail: [] });
}

function draw() {
  background(240, 40, 8);
  rotY = map(mouseX, 0, width, -PI, PI);
  rotX = map(mouseY, 0, height, -0.8, 0.8);

  for (let p of points) {
    // ★ ローレンツ方程式：3つの数が、おたがいを変えあう
    for (let k = 0; k < 3; k++) {
      let dt = 0.005;
      let dx = sigma * (p.y - p.x);
      let dy = p.x * (rho - p.z) - p.y;
      let dz = p.x * p.y - beta * p.z;
      p.x += dx * dt;
      p.y += dy * dt;
      p.z += dz * dt;
      p.trail.push([p.x, p.y, p.z]);
    }
    if (p.trail.length > 3000) p.trail.splice(0, 3);

    // 3D → 2D に投影して描く
    noFill();
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < p.trail.length; i++) {
      let [sx, sy] = project(p.trail[i]);
      stroke(p.hue, 70, 100, map(i, 0, p.trail.length, 5, 100));
      vertex(sx, sy);
    }
    endShape();
    let [sx, sy] = project([p.x, p.y, p.z]);
    noStroke();
    fill(p.hue, 60, 100);
    circle(sx, sy, 10);
  }

  fill(0, 0, 100);
  textSize(18);
  text('マウスで回転　クリックで点を追加（ほんの少しずれた場所から）　C で消す　点 ' + points.length, 20, 40);
  textSize(14);
  fill(0, 0, 60);
  text("dx = σ(y−x)   dy = x(ρ−z) − y   dz = xy − βz    σ=10, ρ=28, β=8/3", 20, 66);
}

// 3D の点 → 回転 → 画面の 2D 座標
function project([x, y, z]) {
  // 中心を合わせて縮尺
  let X = x * 9, Y = y * 9, Z = (z - 25) * 9;
  // Y軸回転
  let x1 = X * cos(rotY) - Y * sin(rotY);
  let y1 = X * sin(rotY) + Y * cos(rotY);
  // X軸回転
  let y2 = y1 * cos(rotX) - Z * sin(rotX);
  let z2 = y1 * sin(rotX) + Z * cos(rotX);
  return [width / 2 + x1, height / 2 - z2 + 20, y2];
}

function mousePressed() {
  if (mouseY < 50) return;
  let base = points[points.length - 1];
  points.push({ x: base.x + 0.0001, y: base.y, z: base.z, hue: (base.hue + 70) % 360, trail: [] });
}

function keyPressed() {
  if (key === 'c' || key === 'C') points = [points[0]];
}

// ---------- やってみよう ----------
// 1. クリックして2つ目の点を足す。最初はぴったり重なるのに、やがて別の羽根へ飛ぶ
// 2. rho（28）を 15 にすると、カオスではなくなり1点に落ち着く。 99 にすると？
// 3. 軌跡の色を z の高さで変えてみよう
