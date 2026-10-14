// ============================================
// 05 ボイド（鳥の群れ）
// 1匹1匹は「近づく・そろえる・離れる」の3つのルールだけ
// リーダーはいないのに、群れとして動く
// マウス = 群れが寄ってくる / クリック = 散らす / 1・2・3 キーでルールの ON/OFF
// ============================================

let boids = [];
let useCohesion = true, useAlignment = true, useSeparation = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 120; i++) {
    boids.push({
      pos: createVector(random(width), random(height)),
      vel: p5.Vector.random2D().mult(2),
      hue: random(180, 260),
    });
  }
}

function draw() {
  background(230, 40, 10, 40);

  for (let b of boids) {
    let cohesion = createVector(0, 0); // 近くの仲間の中心へ
    let alignment = createVector(0, 0); // 近くの仲間と同じ向きへ
    let separation = createVector(0, 0); // 近すぎる仲間から離れる
    let count = 0;

    for (let other of boids) {
      if (other === b) continue;
      let d = p5.Vector.dist(b.pos, other.pos);
      if (d < 60) {
        cohesion.add(other.pos);
        alignment.add(other.vel);
        count++;
        if (d < 25) {
          // 近いほど強く離れる
          let away = p5.Vector.sub(b.pos, other.pos).div(d * d);
          separation.add(away);
        }
      }
    }

    let acc = createVector(0, 0);
    if (count > 0) {
      cohesion.div(count).sub(b.pos).setMag(0.03); // 中心に向かう力
      alignment.div(count).setMag(0.05); // 向きをそろえる力
      separation.mult(30); // 離れる力
      if (useCohesion) acc.add(cohesion);
      if (useAlignment) acc.add(alignment);
      if (useSeparation) acc.add(separation);
    }

    // マウスに引き寄せられる（弱く）
    let toMouse = createVector(mouseX, mouseY).sub(b.pos);
    if (toMouse.mag() < 300) acc.add(toMouse.setMag(0.02));

    b.vel.add(acc).limit(3.5);
    b.pos.add(b.vel);

    // 画面の端は反対側につながる
    if (b.pos.x < 0) b.pos.x += width;
    if (b.pos.x > width) b.pos.x -= width;
    if (b.pos.y < 0) b.pos.y += height;
    if (b.pos.y > height) b.pos.y -= height;

    // 描く：進む方向を向いた三角形
    push();
    translate(b.pos.x, b.pos.y);
    rotate(b.vel.heading());
    noStroke();
    fill(b.hue, 60, 100);
    triangle(10, 0, -6, 5, -6, -5);
    pop();
  }

  noStroke();
  fill(0, 0, 100);
  textSize(16);
  text('1:近づく ' + (useCohesion ? 'ON' : 'off') + '　2:そろえる ' + (useAlignment ? 'ON' : 'off') + '　3:離れる ' + (useSeparation ? 'ON' : 'off') + '　クリックで散らす', 16, 28);
}

function mousePressed() {
  for (let b of boids) {
    let away = p5.Vector.sub(b.pos, createVector(mouseX, mouseY));
    if (away.mag() < 250) b.vel.add(away.setMag(6));
  }
}

function keyPressed() {
  if (key === '1') useCohesion = !useCohesion;
  if (key === '2') useAlignment = !useAlignment;
  if (key === '3') useSeparation = !useSeparation;
}

// ---------- やってみよう ----------
// 1. 1〜3 でルールを1つずつ切って、どのルールが何をしているか見よう
// 2. 見える範囲 60 を 150 にすると？（大きな群れに）
// 3. 色を「近くの仲間の数」で変えると、群れの密度が見える
