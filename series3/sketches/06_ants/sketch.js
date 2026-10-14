// ============================================
// 06 アリの道（フェロモン）
// アリは地図を持っていない。エサを見つけたアリが「におい（フェロモン）」を
// 落としながら巣に帰るだけで、群れ全体が最短に近い道をつくる
// クリックでエサを置く / C でフェロモンを消す
// ============================================

let ants = [];
let nest; // 巣の位置
let foods = []; // エサの位置
let gridSize = 8; // フェロモンのマス目の大きさ
let cols, rows;
let pheromone; // マスごとの「におい」の強さ
let delivered = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  cols = ceil(width / gridSize);
  rows = ceil(height / gridSize);
  pheromone = new Float32Array(cols * rows);
  nest = createVector(width / 2, height / 2);
  foods.push(createVector(width * 0.2, height * 0.3));
  foods.push(createVector(width * 0.8, height * 0.7));
  for (let i = 0; i < 300; i++) {
    ants.push({ pos: nest.copy(), angle: random(TWO_PI), hasFood: false });
  }
}

function draw() {
  background(40, 20, 10);

  // ---- フェロモンを描いて、少しずつ蒸発させる ----
  noStroke();
  for (let i = 0; i < cols * rows; i++) {
    pheromone[i] *= 0.995; // 蒸発
    if (pheromone[i] > 0.02) {
      fill(180, 80, 100, min(pheromone[i], 1) * 70);
      rect((i % cols) * gridSize, floor(i / cols) * gridSize, gridSize, gridSize);
    }
  }

  // ---- エサと巣 ----
  fill(100, 80, 90);
  for (let f of foods) circle(f.x, f.y, 36);
  fill(30, 80, 90);
  circle(nest.x, nest.y, 40);

  // ---- アリを動かす ----
  for (let a of ants) {
    if (a.hasFood) {
      // エサを持っている：巣に向かい、フェロモンを落とす
      let toNest = p5.Vector.sub(nest, a.pos);
      a.angle = lerpAngle(a.angle, toNest.heading(), 0.2);
      let gi = cellIndex(a.pos);
      if (gi >= 0) pheromone[gi] = min(pheromone[gi] + 0.3, 3);
      if (toNest.mag() < 20) {
        a.hasFood = false;
        delivered++;
        a.angle += PI; // 巣についたら反転
      }
    } else {
      // 探している：前方3方向のにおいをかいで、強い方へ。あとはランダム
      let best = -1, bestAngle = a.angle;
      for (let d of [-0.6, 0, 0.6]) {
        let ang = a.angle + d;
        let p = createVector(a.pos.x + cos(ang) * 24, a.pos.y + sin(ang) * 24);
        let gi = cellIndex(p);
        let v = gi >= 0 ? pheromone[gi] : 0;
        if (v > best) {
          best = v;
          bestAngle = ang;
        }
      }
      if (best > 0.05) a.angle = lerpAngle(a.angle, bestAngle, 0.3);
      a.angle += random(-0.3, 0.3); // ふらふら歩く
      // エサを見つけたら持つ
      for (let f of foods) {
        if (p5.Vector.dist(a.pos, f) < 20) {
          a.hasFood = true;
          a.angle += PI;
        }
      }
    }

    a.pos.x += cos(a.angle) * 2;
    a.pos.y += sin(a.angle) * 2;
    // 壁で跳ね返る
    if (a.pos.x < 0 || a.pos.x > width) a.angle = PI - a.angle;
    if (a.pos.y < 0 || a.pos.y > height) a.angle = -a.angle;
    a.pos.x = constrain(a.pos.x, 0, width);
    a.pos.y = constrain(a.pos.y, 0, height);

    fill(a.hasFood ? 100 : 0, a.hasFood ? 80 : 0, 100);
    circle(a.pos.x, a.pos.y, 4);
  }

  fill(0, 0, 100);
  textSize(16);
  text('運んだエサ ' + delivered + '　クリックでエサを置く　C でにおいを消す', 16, 28);
}

function cellIndex(p) {
  let cx = floor(p.x / gridSize), cy = floor(p.y / gridSize);
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return -1;
  return cx + cy * cols;
}

// 角度をなめらかに近づける（360° のつなぎ目を正しく扱う）
function lerpAngle(a, b, t) {
  let d = ((b - a + PI) % TWO_PI + TWO_PI) % TWO_PI - PI;
  return a + d * t;
}

function mousePressed() {
  if (mouseY > 44) foods.push(createVector(mouseX, mouseY));
}

function keyPressed() {
  if (key === 'c' || key === 'C') pheromone.fill(0);
}

// ---------- やってみよう ----------
// 1. 蒸発 0.995 を 0.98（すぐ消える）や 0.999（ずっと残る）にすると道はどうなる？
// 2. エサを遠くと近くに置いて、どちらの道が太くなるか見よう
// 3. アリの数 300 を 1000 にすると？
