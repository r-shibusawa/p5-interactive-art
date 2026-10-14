// ============================================
// 07 生態系シミュレーション（草・ウサギ・キツネ）
// 草は生える。ウサギは草を食べて増える。キツネはウサギを食べて増える。
// 食べられないと死ぬ。それだけで、数が波のように増えたり減ったりする
// クリックでウサギを追加 / 右クリックなし：F キーでキツネを追加
// ============================================

let grass = []; // 草のマス（0〜1 の量）
let gw = 48, gh = 27;
let rabbits = [];
let foxes = [];
let history = []; // 数の記録（グラフ用）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  grass = new Float32Array(gw * gh).fill(1);
  for (let i = 0; i < 80; i++) rabbits.push(newAnimal());
  for (let i = 0; i < 8; i++) foxes.push(newAnimal());
}

function newAnimal(x, y) {
  return { x: x ?? random(width), y: y ?? random(height - 120), energy: 50, angle: random(TWO_PI) };
}

function draw() {
  background(100, 30, 15);
  let cw = width / gw, ch = (height - 120) / gh;

  // ---- 草：少しずつ生える ----
  noStroke();
  for (let i = 0; i < gw * gh; i++) {
    grass[i] = min(1, grass[i] + 0.004);
    fill(110, 60, 30 + grass[i] * 40);
    rect((i % gw) * cw, floor(i / gw) * ch, cw, ch);
  }

  // ---- ウサギ ----
  for (let i = rabbits.length - 1; i >= 0; i--) {
    let r = rabbits[i];
    move(r, 1.5);
    r.energy -= 0.3; // 生きているだけでお腹が減る
    // 草を食べる
    let gi = floor(r.x / cw) + floor(r.y / ch) * gw;
    if (grass[gi] > 0.3) {
      grass[gi] -= 0.3;
      r.energy += 6;
    }
    // 十分食べたら子を産む
    if (r.energy > 100) {
      r.energy = 50;
      rabbits.push(newAnimal(r.x, r.y));
    }
    if (r.energy <= 0) rabbits.splice(i, 1); // 餓死
    fill(0, 0, 95);
    circle(r.x, r.y, 8);
  }

  // ---- キツネ ----
  for (let i = foxes.length - 1; i >= 0; i--) {
    let f = foxes[i];
    // いちばん近いウサギを追う
    let target = null, best = 150;
    for (let r of rabbits) {
      let d = dist(f.x, f.y, r.x, r.y);
      if (d < best) {
        best = d;
        target = r;
      }
    }
    if (target) f.angle = atan2(target.y - f.y, target.x - f.x);
    move(f, 2.2);
    f.energy -= 0.5;
    // ウサギを食べる
    for (let j = rabbits.length - 1; j >= 0; j--) {
      if (dist(f.x, f.y, rabbits[j].x, rabbits[j].y) < 10) {
        rabbits.splice(j, 1);
        f.energy += 40;
        break;
      }
    }
    if (f.energy > 150) {
      f.energy = 60;
      foxes.push(newAnimal(f.x, f.y));
    }
    if (f.energy <= 0) foxes.splice(i, 1);
    fill(20, 90, 95);
    circle(f.x, f.y, 14);
  }

  // ---- グラフ ----
  if (frameCount % 4 === 0) {
    history.push([rabbits.length, foxes.length]);
    if (history.length > width / 2) history.shift();
  }
  fill(0, 0, 5);
  rect(0, height - 120, width, 120);
  drawLine(history, 0, 400, color(0, 0, 95));
  drawLine(history, 1, 40, color(20, 90, 95));
  fill(0, 0, 100);
  textSize(16);
  text('ウサギ ' + rabbits.length + '（白）　キツネ ' + foxes.length + '（赤）　クリック=ウサギ追加　F=キツネ追加', 16, height - 96);
}

function drawLine(hist, idx, maxVal, col) {
  noFill();
  stroke(col);
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < hist.length; i++) {
    vertex(i * 2, height - 10 - min(hist[i][idx] / maxVal, 1) * 80);
  }
  endShape();
  noStroke();
}

function move(a, speed) {
  a.angle += random(-0.4, 0.4);
  a.x += cos(a.angle) * speed;
  a.y += sin(a.angle) * speed;
  if (a.x < 0 || a.x > width) a.angle = PI - a.angle;
  if (a.y < 0 || a.y > height - 120) a.angle = -a.angle;
  a.x = constrain(a.x, 0, width - 1);
  a.y = constrain(a.y, 0, height - 121);
}

function mousePressed() {
  if (mouseY < height - 120) for (let i = 0; i < 10; i++) rabbits.push(newAnimal(mouseX, mouseY));
}
function keyPressed() {
  if (key === 'f' || key === 'F') for (let i = 0; i < 3; i++) foxes.push(newAnimal(mouseX, mouseY));
}

// ---------- やってみよう ----------
// 1. グラフを見よう。ウサギが増えた少しあとにキツネが増え、ウサギが減る…波になる
// 2. キツネを全部いなくすると（F を押さず待つ）、ウサギと草はどうなる？
// 3. 数字（草の回復 0.004、繁殖 100 など）を変えて、絶滅しないバランスを探そう
