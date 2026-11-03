// ============================================
// 02 トロピカル直線
// a ⊗ x ⊕ b ⊗ y ⊕ c = min(a + x, b + y, c)。「直線」= 最小値が 2 回以上とられる場所
//   頂点 (c − a, c − b) から 3 本の半直線が出る。min 流儀では方向 (1,0), (0,1), (−1,−1)
//   平面は 3 つの領域に分かれ、各領域で「どの項が最小か」が決まっている
// 頂点をドラッグ / 1 2 3 = 係数 a, b, c を選ぶ / ↑↓ = 選んだ係数を変える / M = max 流儀 / R = リセット
// ============================================

let a = 0, b = 0, c = 0;       // ★ 係数（a ⊗ x ⊕ b ⊗ y ⊕ c）
let useMax = false;            // ★ true なら max 流儀（半直線の向きが反対になる）
let sel = 2;                   // ↑↓ で変える係数（0 = a, 1 = b, 2 = c）
let sc = 70;                   // ★ 1 単位 = 何 px
let ox, oy, buf, dragging = false, scale4 = 4;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  ox = width * 0.42; oy = height * 0.55;
  buf = createGraphics(ceil(width / scale4), ceil(height / scale4));   // 領域の色分け用（粗い画像）
  buf.pixelDensity(1);
}
function toX(x) { return ox + x * sc; }
function toY(y) { return oy - y * sc; }
function fromX(s) { return (s - ox) / sc; }
function fromY(s) { return (oy - s) / sc; }
function hues() { return [35, 330, 90]; }   // a⊗x = マンゴー，b⊗y = ピンク，c = ライム

// ★ 3 つの項の値と、どれが最小（max 流儀なら最大）か
function termsAt(x, y) {
  let v = [a + x, b + y, c];
  let best = 0;
  for (let k = 1; k < 3; k++) if (useMax ? v[k] > v[best] : v[k] < v[best]) best = k;
  return { v, best };
}

// 領域を塗る：粗い画像の各ピクセルで「どの項が最小か」を調べて色を決める
function paintRegions() {
  buf.loadPixels();
  let RGB = [[255, 170, 60], [255, 80, 160], [160, 230, 70]];   // a⊗x = マンゴー，b⊗y = ピンク，c = ライム
  for (let py = 0; py < buf.height; py++) for (let px = 0; px < buf.width; px++) {
    let t = termsAt(fromX(px * scale4), fromY(py * scale4));
    let s = t.v.slice().sort((u, v) => u - v);
    let gap = useMax ? s[2] - s[1] : s[1] - s[0];           // 1 位と 2 位の差：小さいほど直線に近い
    let k = 0.25 + 0.55 * Math.min(1, gap / 1.5), col = RGB[t.best];
    let idx = (px + py * buf.width) * 4;
    buf.pixels[idx] = col[0] * k; buf.pixels[idx + 1] = col[1] * k; buf.pixels[idx + 2] = col[2] * k; buf.pixels[idx + 3] = 255;
  }
  buf.updatePixels();
}

function draw() {
  background(190, 55, 10);
  paintRegions();
  image(buf, 0, 0, width, height);

  // 軸
  stroke(0, 0, 100, 30); strokeWeight(1);
  line(toX(0), 0, toX(0), height); line(0, toY(0), width, toY(0));
  // 頂点と 3 本の半直線
  let vx = c - a, vy = c - b;
  let dirs = useMax ? [[-1, 0], [0, -1], [1, 1]] : [[1, 0], [0, 1], [-1, -1]];
  let H = hues();
  // 各半直線は「2 つの項が同点」の場所：(1,0) では b⊗y = c，(0,1) では a⊗x = c，(−1,−1) では a⊗x = b⊗y
  let tie = [['b ⊗ y = c', 1, 2], ['a ⊗ x = c', 0, 2], ['a ⊗ x = b ⊗ y', 0, 1]];
  for (let k = 0; k < 3; k++) {
    stroke(0, 0, 100); strokeWeight(5);
    line(toX(vx), toY(vy), toX(vx + dirs[k][0] * 100), toY(vy + dirs[k][1] * 100));
    noStroke(); fill(0, 0, 100); textSize(13);
    text(tie[k][0], toX(vx + dirs[k][0] * 1.6) + 6, toY(vy + dirs[k][1] * 1.6) - 6);
  }
  noStroke(); fill(0, 0, 100); circle(toX(vx), toY(vy), 18);
  fill(0, 0, 10); textSize(13);
  text('(' + nf(vx, 1, 1) + ', ' + nf(vy, 1, 1) + ')', toX(vx) + 12, toY(vy) - 12);

  // 領域のラベル
  textSize(20);
  let labels = ['a ⊗ x が' + (useMax ? '最大' : '最小'), 'b ⊗ y が' + (useMax ? '最大' : '最小'), 'c が' + (useMax ? '最大' : '最小')];
  // min：a⊗x は左（対角線の上側），b⊗y は下（対角線の下側），c は右上。max では反対
  let lpos = useMax ? [[vx + 2.5, vy - 1.2], [vx - 1.2, vy + 2.5], [vx - 2, vy - 2]] : [[vx - 2.5, vy + 1.2], [vx + 1.2, vy - 2.5], [vx + 2, vy + 2]];
  for (let k = 0; k < 3; k++) { fill(H[k], 30, 100); text(labels[k], toX(lpos[k][0]) - 60, toY(lpos[k][1])); }

  // マウス位置の値
  let mxv = fromX(mouseX), myv = fromY(mouseY);
  let t = termsAt(mxv, myv);
  fill(0, 0, 100); textSize(18);
  let names = ['a', 'b', 'c'];
  text('F(x, y) = ' + (useMax ? 'max' : 'min') + '(a + x, b + y, c)　a = ' + nf(a, 1, 1) + (sel === 0 ? ' ◀' : '') + '　b = ' + nf(b, 1, 1) + (sel === 1 ? ' ◀' : '') + '　c = ' + nf(c, 1, 1) + (sel === 2 ? ' ◀' : '') + '　（1 2 3 で選んで ↑↓）　M：' + (useMax ? 'max' : 'min') + ' 流儀　R：リセット', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('マウス (' + nf(mxv, 1, 2) + ', ' + nf(myv, 1, 2) + ')：a + x = ' + nf(t.v[0], 1, 2) + '，b + y = ' + nf(t.v[1], 1, 2) + '，c = ' + nf(t.v[2], 1, 2) + ' → ' + (useMax ? '最大' : '最小') + 'は ' + ['a ⊗ x', 'b ⊗ y', 'c'][t.best] + '。頂点 = (c − a, c − b)。色の明るさ = 1 位と 2 位の差（境界で暗い）', 20, 62);
  text('頂点をドラッグすると a, b が変わる（c は固定）。3 本の半直線の方向ベクトルの和は (1,0)+(0,1)+(−1,−1) = 0（バランス条件 → 12）', 20, height - 24);
}

function mousePressed() { dragging = dist(mouseX, mouseY, toX(c - a), toY(c - b)) < 30; }
function mouseDragged() {
  if (!dragging) return;
  a = constrain(c - fromX(mouseX), -8, 8);
  b = constrain(c - fromY(mouseY), -8, 8);
}
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === '1') sel = 0;
  if (key === '2') sel = 1;
  if (key === '3') sel = 2;
  let dv = (key === UP_ARROW) ? 0.5 : (key === DOWN_ARROW) ? -0.5 : 0;
  if (dv) { if (sel === 0) a = constrain(a + dv, -8, 8); if (sel === 1) b = constrain(b + dv, -8, 8); if (sel === 2) c = constrain(c + dv, -8, 8); }
  if (key === 'm' || key === 'M') useMax = !useMax;
  if (key === 'r' || key === 'R') { a = 0; b = 0; c = 0; }
}

// ---------- やってみよう ----------
// 1. c だけを変えると頂点はどう動く？ a だけなら？ 式 (c − a, c − b) で説明しよう
// 2. 3 つの係数に同じ数を足しても直線は変わらない（射影的）。確かめよう
// 3. M で max 流儀にすると半直線の向きが反対になる。領域の形はどう変わる？
// 4. 項を 1 つ増やして min(a + x, b + y, c, e + x + y) にすると「直線」はどんな形になる？（04 の予告）
