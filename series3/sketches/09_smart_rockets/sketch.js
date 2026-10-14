// ============================================
// 09 進化するロケット（遺伝的アルゴリズム）
// ロケットは「毎フレームどの方向に噴射するか」の遺伝子を持つ
// ゴールに近いロケットほど選ばれて、子を残す → 世代を重ねると壁をよけてゴールへ
// クリックでゴールを動かす / ドラッグで壁を動かす
// ============================================

let population = [];
let popSize = 150;
let lifespan = 300; // 1世代のフレーム数
let count = 0; // 今のフレーム
let generation = 1;
let target;
let wall = { x: 0, y: 0, w: 300, h: 16 };
let bestFit = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  target = createVector(width / 2, 80);
  wall.x = width / 2 - 150;
  wall.y = height / 2;
  for (let i = 0; i < popSize; i++) population.push(makeRocket(randomGenes()));
}

// 遺伝子 = lifespan 個の「噴射ベクトル」
function randomGenes() {
  let g = [];
  for (let i = 0; i < lifespan; i++) g.push(p5.Vector.random2D().mult(0.25));
  return g;
}

function makeRocket(genes) {
  return { pos: createVector(width / 2, height - 30), vel: createVector(0, 0), genes, alive: true, reached: false, fitness: 0 };
}

function draw() {
  background(230, 40, 10);

  // ゴールと壁
  noStroke();
  fill(100, 80, 100);
  circle(target.x, target.y, 24);
  fill(0, 0, 60);
  rect(wall.x, wall.y, wall.w, wall.h);

  // ロケットを動かす
  for (let r of population) {
    if (r.alive && !r.reached) {
      r.vel.add(r.genes[count]); // 遺伝子どおりに噴射
      r.vel.limit(4);
      r.pos.add(r.vel);
      // 壁や画面外に当たったら死ぬ
      if (r.pos.x > wall.x && r.pos.x < wall.x + wall.w && r.pos.y > wall.y && r.pos.y < wall.y + wall.h) r.alive = false;
      if (r.pos.x < 0 || r.pos.x > width || r.pos.y < 0 || r.pos.y > height) r.alive = false;
      if (p5.Vector.dist(r.pos, target) < 12) r.reached = true;
    }
    push();
    translate(r.pos.x, r.pos.y);
    rotate(r.vel.heading());
    fill(r.reached ? 100 : r.alive ? 200 : 0, r.alive ? 60 : 0, r.alive ? 100 : 40, 80);
    rect(-8, -2, 16, 4);
    pop();
  }

  count++;
  if (count >= lifespan) {
    nextGeneration();
    count = 0;
  }

  fill(0, 0, 100);
  textSize(16);
  text('世代 ' + generation + '　フレーム ' + count + '/' + lifespan + '　ゴール到達 ' + population.filter((r) => r.reached).length + '/' + popSize + '　クリック=ゴール移動　ドラッグ=壁移動', 16, 28);
}

// ★ 進化：評価 → 選択 → 交叉 → 突然変異
function nextGeneration() {
  // 1. 評価：ゴールに近いほど高得点
  let maxFit = 0;
  for (let r of population) {
    let d = p5.Vector.dist(r.pos, target);
    r.fitness = 1 / (d + 1);
    if (r.reached) r.fitness *= 10; // ゴールしたら大ボーナス
    if (!r.alive) r.fitness *= 0.1; // ぶつかったら減点
    maxFit = max(maxFit, r.fitness);
  }
  bestFit = maxFit;

  // 2. 選択：得点が高いほど「くじ」に多く入れる
  let pool = [];
  for (let r of population) {
    let n = floor((r.fitness / maxFit) * 100);
    for (let i = 0; i < n; i++) pool.push(r);
  }

  // 3. 交叉と突然変異で次の世代をつくる
  let next = [];
  for (let i = 0; i < popSize; i++) {
    let a = random(pool), b = random(pool);
    let mid = floor(random(lifespan));
    let genes = [];
    for (let j = 0; j < lifespan; j++) {
      let gene = j < mid ? a.genes[j] : b.genes[j]; // 前半は親A、後半は親B
      if (random() < 0.01) gene = p5.Vector.random2D().mult(0.25); // 1% で突然変異
      genes.push(gene.copy());
    }
    next.push(makeRocket(genes));
  }
  population = next;
  generation++;
}

function mousePressed() {
  if (mouseY > 44 && !(mouseX > wall.x - 20 && mouseX < wall.x + wall.w + 20 && abs(mouseY - wall.y) < 40)) {
    target.set(mouseX, mouseY);
  }
}
function mouseDragged() {
  wall.x = mouseX - wall.w / 2;
  wall.y = mouseY;
}

// ---------- やってみよう ----------
// 1. 10世代くらい待とう。壁をよけてゴールするロケットが増えてくる
// 2. 突然変異 0.01 を 0.2 にすると？（ランダムすぎて学べない） 0 にすると？
// 3. 壁を動かすと、せっかく進化した遺伝子はどうなる？
