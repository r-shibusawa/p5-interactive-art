// ============================================
// 03 三体問題
// 2つの星なら軌道はきれいな楕円。3つになると、もう誰にも予測できない
// クリックで星を追加 / R でやり直し / スペースで止める
// ============================================

let bodies = [];
let trail;
let G = 1.2;
let paused = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  trail = createGraphics(width, height);
  trail.colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  trail.background(240, 40, 8);
  bodies = [];
  // 正三角形に置いて、少し回転させる（それでもすぐ乱れる）
  for (let i = 0; i < 3; i++) {
    let a = (TWO_PI * i) / 3;
    let r = 160;
    bodies.push({
      pos: createVector(width / 2 + cos(a) * r, height / 2 + sin(a) * r),
      vel: createVector(-sin(a), cos(a)).mult(1.4 + random(-0.05, 0.05)), // ★ ほんの少しランダム
      mass: 60,
      hue: i * 120 + 20,
    });
  }
}

function draw() {
  if (!paused) {
    for (let k = 0; k < 4; k++) physics(0.25);
  }

  image(trail, 0, 0);
  for (let b of bodies) {
    noStroke();
    fill(b.hue, 60, 100);
    circle(b.pos.x, b.pos.y, sqrt(b.mass) * 3);
    fill(b.hue, 20, 100);
    circle(b.pos.x, b.pos.y, sqrt(b.mass) * 1.2);
  }

  fill(0, 0, 100);
  textSize(18);
  text('星 ' + bodies.length + '　クリックで星を追加　R でやり直し　スペースで' + (paused ? '再開' : '停止'), 20, 40);
}

// 万有引力：すべての星のペアで、質量に比例・距離の2乗に反比例する力
function physics(dt) {
  for (let a of bodies) {
    let acc = createVector(0, 0);
    for (let b of bodies) {
      if (a === b) continue;
      let d = p5.Vector.sub(b.pos, a.pos);
      let dist2 = max(d.magSq(), 400); // 近すぎると力が無限大になるので制限
      acc.add(d.setMag((G * b.mass) / dist2));
    }
    a.vel.add(acc.mult(dt));
  }
  for (let b of bodies) {
    let prev = b.pos.copy();
    b.pos.add(p5.Vector.mult(b.vel, dt));
    trail.stroke(b.hue, 60, 100, 50);
    trail.strokeWeight(1.5);
    trail.line(prev.x, prev.y, b.pos.x, b.pos.y);
  }
}

function mousePressed() {
  if (mouseY < 50) return;
  bodies.push({ pos: createVector(mouseX, mouseY), vel: createVector(0, 0), mass: random(20, 80), hue: random(360) });
}

function keyPressed() {
  if (key === 'r' || key === 'R') reset();
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. R を何回も押そう。最初はほぼ同じなのに、毎回ちがう運命になる
// 2. 星を 2 つだけにすると（1つ削除）、軌道は安定する？
// 3. 太陽（mass 2000）を真ん中に置いて、まわりに小さい星を置くと惑星系になる
