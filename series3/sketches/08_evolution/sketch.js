// ============================================
// 08 進化する生き物
// 生き物は「遺伝子」（速さ・大きさ・色）を持つ。エサを食べて増え、
// 子は親の遺伝子を少しだけ変えて（突然変異）受けつぐ。
// 誰も設計していないのに、環境に合った生き物が残っていく
// 1・2 キーで環境を変える（エサの量） / クリックでエサを置く
// ============================================

let creatures = [];
let foods = [];
let foodRate = 2; // 1フレームに生まれるエサの数
let generation = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 40; i++) {
    creatures.push(makeCreature(random(width), random(height), { speed: random(1, 3), size: random(8, 20), hue: random(360) }));
  }
}

function makeCreature(x, y, genes) {
  return { x, y, genes, energy: 60, angle: random(TWO_PI), age: 0 };
}

function draw() {
  background(220, 30, 10);

  // エサが生まれる
  for (let i = 0; i < foodRate; i++) {
    if (random() < 0.5) foods.push(createVector(random(width), random(60, height)));
  }
  noStroke();
  fill(100, 70, 90);
  for (let f of foods) circle(f.x, f.y, 5);

  // 生き物
  let sumSpeed = 0, sumSize = 0;
  for (let i = creatures.length - 1; i >= 0; i--) {
    let c = creatures[i];
    let g = c.genes;
    c.age++;

    // いちばん近いエサへ向かう（大きいほど遠くまで見える）
    let target = null, best = 60 + g.size * 4;
    for (let f of foods) {
      let d = dist(c.x, c.y, f.x, f.y);
      if (d < best) {
        best = d;
        target = f;
      }
    }
    if (target) c.angle = lerp(c.angle, atan2(target.y - c.y, target.x - c.x), 0.2);
    else c.angle += random(-0.3, 0.3);

    c.x += cos(c.angle) * g.speed;
    c.y += sin(c.angle) * g.speed;
    c.x = (c.x + width) % width;
    c.y = constrain(c.y, 60, height);

    // ★ コスト：速くて大きいほど、たくさんエネルギーを使う
    c.energy -= 0.1 + g.speed * 0.08 + g.size * 0.015;

    // エサを食べる
    for (let j = foods.length - 1; j >= 0; j--) {
      if (dist(c.x, c.y, foods[j].x, foods[j].y) < g.size / 2 + 4) {
        foods.splice(j, 1);
        c.energy += 25;
      }
    }

    // ★ 繁殖：遺伝子をコピーして、少しだけ変える（突然変異）
    if (c.energy > 120) {
      c.energy = 60;
      creatures.push(makeCreature(c.x, c.y, {
        speed: constrain(g.speed + random(-0.4, 0.4), 0.3, 6),
        size: constrain(g.size + random(-3, 3), 4, 40),
        hue: (g.hue + random(-20, 20) + 360) % 360,
      }));
      generation++;
    }

    if (c.energy <= 0) {
      creatures.splice(i, 1); // 死ぬ
      continue;
    }

    sumSpeed += g.speed;
    sumSize += g.size;
    fill(g.hue, 70, 100);
    circle(c.x, c.y, g.size);
    fill(g.hue, 70, 60);
    circle(c.x + cos(c.angle) * g.size * 0.3, c.y + sin(c.angle) * g.size * 0.3, g.size * 0.3); // 目
  }

  // 全滅したら新しく始める
  if (creatures.length === 0) setup();

  let n = creatures.length;
  fill(0, 0, 100);
  textSize(16);
  text('生き物 ' + n + '　平均の速さ ' + nf(sumSpeed / n, 1, 2) + '　平均の大きさ ' + nf(sumSize / n, 1, 1) + '　誕生 ' + generation + '　1:エサ少ない 2:エサ多い（いま ' + foodRate + '）', 16, 28);
}

function mousePressed() {
  for (let i = 0; i < 30; i++) foods.push(createVector(mouseX + random(-60, 60), mouseY + random(-60, 60)));
}

function keyPressed() {
  if (key === '1') foodRate = 1;
  if (key === '2') foodRate = 6;
}

// ---------- やってみよう ----------
// 1. しばらく眺めて「平均の速さ」「大きさ」がどう変わるか見よう
// 2. 1（エサ少ない）と 2（エサ多い）で、残る生き物の特徴はどう変わる？
// 3. コストの式を変えると（例：速いほど有利に）、進化の方向が変わる
