// ============================================
// 05 シェルピンスキーの三角形とカーペット
// 「真ん中を抜く」を再帰でくり返す
// マウス左右 = 深さ / クリックで 三角形 ⇄ カーペット
// ============================================

let mode = 'triangle';
let maxDepth = 5;
let count = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
}

function draw() {
  background(260, 30, 10);
  maxDepth = floor(map(mouseX, 0, width, 0, mode === 'triangle' ? 9 : 6, true));
  count = 0;

  let s = min(width, height) * 0.8;
  if (mode === 'triangle') {
    // 大きな三角形の3つの頂点
    let cx = width / 2;
    let top = height / 2 - s * 0.43;
    sierpinski(cx, top, cx - s / 2, top + s * 0.866, cx + s / 2, top + s * 0.866, 0);
  } else {
    carpet(width / 2 - s / 2, height / 2 - s / 2, s, 0);
  }

  fill(0, 0, 100);
  textSize(18);
  text('深さ ' + maxDepth + '　図形の数 ' + count + '　クリックで切りかえ（' + (mode === 'triangle' ? '三角形' : 'カーペット') + '）', 20, 30);
}

// 三角形：深さが残っていれば、3つの小さい三角形に分ける（真ん中は描かない）
function sierpinski(x1, y1, x2, y2, x3, y3, depth) {
  if (depth >= maxDepth) {
    fill((depth * 30 + frameCount * 0.3) % 360, 60, 100);
    triangle(x1, y1, x2, y2, x3, y3);
    count++;
    return;
  }
  // 各辺の真ん中の点
  let mx12 = (x1 + x2) / 2, my12 = (y1 + y2) / 2;
  let mx23 = (x2 + x3) / 2, my23 = (y2 + y3) / 2;
  let mx31 = (x3 + x1) / 2, my31 = (y3 + y1) / 2;
  sierpinski(x1, y1, mx12, my12, mx31, my31, depth + 1); // 上
  sierpinski(mx12, my12, x2, y2, mx23, my23, depth + 1); // 左下
  sierpinski(mx31, my31, mx23, my23, x3, y3, depth + 1); // 右下
}

// カーペット：9分割して、真ん中以外の8個を描く
function carpet(x, y, s, depth) {
  if (depth >= maxDepth) {
    fill((depth * 30 + frameCount * 0.3) % 360, 60, 100);
    rect(x, y, s, s);
    count++;
    return;
  }
  let t = s / 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 1 && j === 1) continue; // 真ん中はスキップ
      carpet(x + i * t, y + j * t, t, depth + 1);
    }
  }
}

function mousePressed() {
  mode = mode === 'triangle' ? 'carpet' : 'triangle';
}

// ---------- やってみよう ----------
// 1. 三角形で、真ん中を「描いて」まわりを描かないようにすると？
// 2. カーペットで、スキップするマスを変えてみよう（i === 0 && j === 0 など）
// 3. 深さが1増えると、図形の数は何倍になる？（三角形 3倍、カーペット 8倍）
