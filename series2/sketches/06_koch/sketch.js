// ============================================
// 06 コッホ雪片
// 線を4つに折る、を全部の線にくり返す
// クリックで世代を進める（0〜6）/ マウス上下 = 折る角度
// ============================================

let level = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(200, 50, 10);

  // 折る角度：ふつうのコッホ曲線は 60°。マウスで変えると別の形になる
  let bend = map(mouseY, 0, height, 85, 20, true);

  // 最初は正三角形（3本の線）
  let s = min(width, height) * 0.6;
  let cx = width / 2;
  let cy = height / 2 + s * 0.12;
  let pts = [
    createVector(cx, cy - s * 0.577),
    createVector(cx + s / 2, cy + s * 0.289),
    createVector(cx - s / 2, cy + s * 0.289),
  ];

  // level 回、全部の線を折る
  for (let i = 0; i < level; i++) {
    pts = fold(pts, radians(bend));
  }

  // 描く
  noFill();
  stroke(190, 50, 100);
  strokeWeight(map(level, 0, 6, 3, 1));
  beginShape();
  for (let p of pts) vertex(p.x, p.y);
  endShape(CLOSE);

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('世代 ' + level + '　線の数 ' + pts.length + '　角度 ' + round(bend) + '°　クリックで次の世代', 20, 30);
}

// 点の列を受け取り、となり合う2点の間を「4本の線」に折って返す
function fold(pts, angle) {
  let out = [];
  for (let i = 0; i < pts.length; i++) {
    let a = pts[i];
    let b = pts[(i + 1) % pts.length]; // 最後は最初につなぐ
    let d = p5.Vector.sub(b, a).div(3); // 線の 1/3
    let p1 = p5.Vector.add(a, d); // 1/3 の点
    let p3 = p5.Vector.add(a, p5.Vector.mult(d, 2)); // 2/3 の点
    // とがった先の点：p1 から angle だけ回した方向へ（二等辺三角形になる長さ）
    let p2 = p5.Vector.add(p1, d.copy().rotate(-angle).setMag(d.mag() * 0.5 / cos(angle)));
    out.push(a, p1, p2, p3);
  }
  return out;
}

function mousePressed() {
  level = (level + 1) % 7;
}

// ---------- やってみよう ----------
// 1. 世代 0 → 6 と進めて、線の数が 4倍ずつ増えるのを確かめよう
// 2. 角度を変えて、雪の結晶・ギザギザの島・星をつくろう
// 3. 最初の形を三角形ではなく四角形（4点）にすると？
