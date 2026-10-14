// ============================================
// 13 パーティクル・ライフ
// 色のちがう粒どうしに「引き合う／反発する」の表（ルール）をランダムに決めるだけで、
// 細胞のような、生き物のような構造が自然に生まれる
// クリックで新しいルール / スペースで止める / S で保存
// ============================================

let n = 400; // ★ 粒の数（多いと重い）
let types = 5; // 色の種類
let particles = [];
let matrix = []; // matrix[a][b] = 色 a の粒が、色 b の粒から受ける力（-1〜1）
let paused = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newRules();
  for (let i = 0; i < n; i++) {
    particles.push({ x: random(width), y: random(height), vx: 0, vy: 0, type: floor(random(types)) });
  }
}

function newRules() {
  matrix = [];
  for (let a = 0; a < types; a++) {
    matrix.push([]);
    for (let b = 0; b < types; b++) matrix[a].push(random(-1, 1));
  }
}

function draw() {
  background(0, 0, 5, 60);

  if (!paused) {
    for (let p of particles) {
      let fx = 0, fy = 0;
      for (let q of particles) {
        if (p === q) continue;
        let dx = q.x - p.x, dy = q.y - p.y;
        // 画面の端はつながっている（いちばん近い方向を使う）
        if (dx > width / 2) dx -= width; else if (dx < -width / 2) dx += width;
        if (dy > height / 2) dy -= height; else if (dy < -height / 2) dy += height;
        if (dx > 80 || dx < -80 || dy > 80 || dy < -80) continue; // 遠い粒は計算しない（速くするため）
        let d = sqrt(dx * dx + dy * dy);
        if (d > 0 && d < 80) {
          let f;
          if (d < 20) f = (d / 20 - 1) * 2; // 近すぎると必ず反発（ぶつからない）
          else f = matrix[p.type][q.type] * (1 - abs(2 * d - 100) / 60); // ★ 表の値で引力/反発
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }
      p.vx = (p.vx + fx * 0.3) * 0.85; // 摩擦
      p.vy = (p.vy + fy * 0.3) * 0.85;
    }
    for (let p of particles) {
      p.x = (p.x + p.vx + width) % width;
      p.y = (p.y + p.vy + height) % height;
    }
  }

  noStroke();
  for (let p of particles) {
    fill((p.type * 360) / types, 70, 100);
    circle(p.x, p.y, 7);
  }

  // ルール表を右上に表示
  let s = 22, ox = width - types * s - 20, oy = 50;
  for (let a = 0; a < types; a++) {
    fill((a * 360) / types, 70, 100);
    rect(ox + a * s, oy - s, s - 2, s - 2);
    rect(ox - s, oy + a * s, s - 2, s - 2);
    for (let b = 0; b < types; b++) {
      let v = matrix[a][b];
      fill(v > 0 ? 120 : 0, 80, 40 + abs(v) * 60);
      rect(ox + b * s, oy + a * s, s - 2, s - 2);
    }
  }
  fill(0, 0, 100);
  textSize(16);
  text('クリックで新しいルール　スペースで止める　右上の表：緑＝引き合う 赤＝反発（行の色が、列の色から受ける力）', 16, 28);
}

function mousePressed() {
  if (mouseY > 44) newRules();
}
function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === 's' || key === 'S') saveCanvas('particle-life', 'png');
}

// ---------- やってみよう ----------
// 1. クリックを何回もして、「細胞」「追いかけっこ」「結晶」みたいなルールを探そう
// 2. types を 3 や 8 にすると？
// 3. 摩擦 0.85 を 0.95 にすると、ぬるぬる動く
