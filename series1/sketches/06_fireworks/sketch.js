// ============================================
// 06 花火（パーティクル）
// クリックした場所で花火が爆発する
// たくさんの「粒（パーティクル）」を配列で管理する
// ============================================

let particles = []; // 粒をしまっておく配列（リスト）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(0, 0, 5);
}

function draw() {
  // 半透明の背景を重ねると「残像」ができる
  background(0, 0, 5, 20);

  // 配列の後ろから順番に1つずつ処理する
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    p.vy = p.vy + 0.05; // 重力で少しずつ下向きに加速
    p.vx = p.vx * 0.99; // 空気抵抗で少しずつ減速
    p.x = p.x + p.vx; // 速さの分だけ移動
    p.y = p.y + p.vy;
    p.life = p.life - 1.2; // 寿命を減らす

    noStroke();
    fill(p.hue, 80, 100, p.life); // 寿命が減るほど透明になる
    circle(p.x, p.y, p.size);

    // 寿命が尽きたら配列から消す
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function mousePressed() {
  explode(mouseX, mouseY);
}

// 花火を1発爆発させる関数（自分でつくった命令）
function explode(x, y) {
  let hue = random(360);
  for (let i = 0; i < 150; i++) {
    let angle = random(TWO_PI); // 飛んでいく方向（0〜360°）
    let speed = random(1, 7); // 飛んでいく速さ
    particles.push({
      x: x,
      y: y,
      vx: cos(angle) * speed, // 横方向の速さ
      vy: sin(angle) * speed, // 縦方向の速さ
      hue: (hue + random(-20, 20) + 360) % 360,
      size: random(3, 8),
      life: 100,
    });
  }
}

// ---------- やってみよう ----------
// 1. 粒の数 150 を 500 にすると？
// 2. 重力 0.05 を -0.05 にすると？（上に落ちる！）
// 3. mouseDragged() という関数をつくって、ドラッグ中も爆発させてみよう
//    function mouseDragged() { explode(mouseX, mouseY); }
