// ============================================
// 08 凸包：ジャービスの行進（ギフト包装法）
// いちばん下の点から、ひもを巻きつけるように「いちばん右側に見える点」を次々選ぶ
// 1 頂点を決めるのに全部の点を調べるので、手間は n × h（h = 凸包の頂点数）
// h が小さいとグレアム走査より速く、全部が凸包に乗ると（円）遅い
// 操作：クリック = 点を追加 / ドラッグ = 動かす / スペース = 再生・停止 / → = 1 回調べる
//       R = ランダム / C = 全部消す / ↑↓ = 速さ / 1〜4 = お手本（ランダム・円・かたまり・三角形）
// ============================================

let pts = [];
let N = 30;             // ★ ランダムに置く点の数
let testsPerFrame = 1;  // ★ 1 フレームに何回調べるか（↑↓）
let auto = true;
let gen = null, hull = [], cur = -1, cand = -1, probe = -1, tests = 0, msg = '';
let drag = -1;

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function preset(k) {
  pts = [];
  let cx = (width - 280) / 2, cy = height / 2 + 30, R = min(width - 280, height) * 0.36;
  for (let i = 0; i < N; i++) {
    if (k === 1) pts.push(createVector(cx + random(-R, R) * 1.2, cy + random(-R, R)));
    if (k === 2) { let a = (TWO_PI * i) / N; pts.push(createVector(cx + cos(a) * R, cy + sin(a) * R)); }       // h = n（いちばん遅い）
    if (k === 3) pts.push(createVector(cx + randomGaussian() * R * 0.3, cy + randomGaussian() * R * 0.3));
    if (k === 4) pts.push(i < 3 ? createVector(cx + cos(i * TWO_PI / 3 - HALF_PI) * R * 1.1, cy + sin(i * TWO_PI / 3 - HALF_PI) * R * 1.1)
      : createVector(cx + random(-R, R) * 0.4, cy + random(-R, R) * 0.4));                                  // h = 3（いちばん速い）
  }
  restart();
}

function turn(o, a, b) { return (a.x - o.x) * (o.y - b.y) - (o.y - a.y) * (b.x - o.x); }   // + なら左回り
function d2(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }

function restart() {
  hull = []; cur = cand = probe = -1; tests = 0;
  gen = pts.length >= 3 ? jarvis() : null;
  msg = pts.length >= 3 ? '' : '点を 3 つ以上置いてください（クリック）';
}

// ★ ギフト包装法
function* jarvis() {
  let n = pts.length;
  let start = 0;
  for (let i = 1; i < n; i++) if (pts[i].y > pts[start].y || (pts[i].y === pts[start].y && pts[i].x < pts[start].x)) start = i;
  cur = start;
  do {
    hull.push(cur);
    cand = (cur + 1) % n;
    for (let j = 0; j < n; j++) {
      if (j === cur) continue;
      probe = j; tests++;
      let c = turn(pts[cur], pts[cand], pts[j]);
      // j が cur→cand の右側にある（または一直線でもっと遠い）なら、j の方が「外側」
      if (c < 0 || (c === 0 && d2(pts[cur], pts[j]) > d2(pts[cur], pts[cand]))) cand = j;
      msg = `頂点 ${hull.length} 個目を探し中：点 ${j} を調べる（いまの候補は点 ${cand}）`;
      yield;
    }
    cur = cand;
    if (hull.length > n) break; // 念のため
  } while (cur !== start);
  probe = cand = -1;
  msg = `完成！ h = ${hull.length}、調べた回数 ${tests}（≒ n × h = ${pts.length} × ${hull.length} = ${pts.length * hull.length}）`;
}

function draw() {
  background(BG);
  if (auto) for (let k = 0; k < testsPerFrame; k++) if (gen && gen.next().done) gen = null;

  // 凸包（ここまで）
  if (hull.length) {
    noFill(); stroke(ORCHID); strokeWeight(3);
    beginShape(); for (let i of hull) vertex(pts[i].x, pts[i].y);
    if (!gen) endShape(CLOSE); else { vertex(pts[cur].x, pts[cur].y); endShape(); }
  }
  // ひも：いまの点 → 候補、いまの点 → 調べている点
  if (gen && cur >= 0 && cand >= 0) {
    let c = pts[cur];
    stroke(GOLD); strokeWeight(3);
    let dir = p5.Vector.sub(pts[cand], c).setMag(2000);
    line(c.x, c.y, c.x + dir.x, c.y + dir.y);
    if (probe >= 0) { stroke(MINT); strokeWeight(1.5); line(c.x, c.y, pts[probe].x, pts[probe].y); }
  }
  pts.forEach((p, i) => {
    noStroke();
    fill(i === cur && gen ? GOLD : i === cand ? GOLD : hull.includes(i) ? ORCHID : i === probe ? MINT : FG);
    circle(p.x, p.y, hull.includes(i) || i === cand ? 13 : 9);
  });

  // パネル
  let px = width - 260;
  noStroke(); fill(PANEL); rect(px, 20, 240, 250, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(17); text('手間のくらべ', px + 18, 36);
  textSize(15);
  let n = pts.length, h = hull.length;
  text(`n = ${n}\nh = ${h}\n調べた回数 ${tests}\n\nジャービス  ≈ n·h\nグレアム  ≈ n·log₂n = ${round(n * Math.log2(max(n, 2)))}`, px + 18, 70);
  fill(DIM); textSize(13); text('円（2）だと h = n で n²、\n三角形（4）だと h = 3 で 3n', px + 18, 205);

  fill(FG); textSize(22); text('凸包：ジャービスの行進（ひもを巻きつける）', 30, 24);
  fill(DIM); textSize(14); text(`クリック 追加   ドラッグ 移動   スペース 再生/停止   → 1 回調べる   ↑↓ 速さ（${testsPerFrame}）   R ランダム   C 消す   1〜4 お手本`, 30, 56);
  fill(GOLD); textSize(17); text(msg, 30, 84, width - 320);
}

function mousePressed() {
  if (mouseX > width - 260 && mouseY < 280) return;
  drag = -1;
  pts.forEach((p, i) => { if (dist(mouseX, mouseY, p.x, p.y) < 12) drag = i; });
}
function mouseDragged() { if (drag >= 0) { pts[drag].x = mouseX; pts[drag].y = mouseY; restart(); } }
function mouseReleased() {
  if (mouseX > width - 260 && mouseY < 280) return;
  if (drag < 0 && mouseY > 110) { pts.push(createVector(mouseX, mouseY)); restart(); }
  drag = -1;
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { if (gen && gen.next().done) gen = null; return false; }
  if (key === UP_ARROW) { testsPerFrame = min(testsPerFrame * 2, 64); return false; }
  if (key === DOWN_ARROW) { testsPerFrame = max(testsPerFrame / 2, 1); return false; }
  if (key === 'r' || key === 'R') preset(1);
  if (key === 'c' || key === 'C') { pts = []; restart(); }
  if ('1234'.includes(key)) preset(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }
