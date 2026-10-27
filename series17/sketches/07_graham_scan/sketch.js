// ============================================
// 07 凸包：グレアム走査
// 点の集まりをゴムひもで囲んだ形 = 凸包
// ① いちばん下の点 p0 から見た角度の順に並べる
// ② 順に積み（push）、「右に曲がる」ならスタックから降ろす（pop）
// 各点は 1 回積まれ、高々 1 回降ろされるだけ → 並べ替えの O(n log n) が全体の手間
// 操作：クリック = 点を追加 / ドラッグ = 動かす / スペース = 再生・停止 / → = 1 ステップ
//       R = ランダム / C = 全部消す / 1〜4 = お手本（ランダム・円・格子・かたまり）
// ============================================

let pts = [];
let N = 26;             // ★ ランダムに置く点の数
let speed = 14;         // ★ 何フレームに 1 ステップ
let auto = true;
let gen = null, snap = {}, stack = [], sorted = [], p0 = -1, dropped = [];
let pushes = 0, pops = 0, msg = '';
let drag = -1, moved = false;

const BG = '#14101f', PANEL = '#221a33', FG = '#e9e4f5', DIM = '#8c84a3';
const ORCHID = '#f0a3ff', MINT = '#6fe3d0', GOLD = '#ffcf6b', BAD = '#ff6b81';

function setup() {
  createCanvas(windowWidth, windowHeight);
  preset(1);
}

function preset(k) {
  pts = [];
  let cx = (width - 300) / 2, cy = height / 2 + 30, R = min(width - 300, height) * 0.36;
  for (let i = 0; i < N; i++) {
    if (k === 1) pts.push(createVector(cx + random(-R, R) * 1.2, cy + random(-R, R)));
    if (k === 2) { let a = (TWO_PI * i) / N; pts.push(createVector(cx + cos(a) * R, cy + sin(a) * R)); }   // 全部が凸包に乗る
    if (k === 3) pts.push(createVector(cx + ((i % 6) - 2.5) * R * 0.35, cy + (floor(i / 6) - 2) * R * 0.35));   // 一直線に並ぶ点
    if (k === 4) pts.push(i < N - 5 ? createVector(cx + randomGaussian() * R * 0.25, cy + randomGaussian() * R * 0.25) : createVector(cx + random(-R, R) * 1.3, cy + random(-R, R)));
  }
  restart();
}

// 画面は y が下向きなので、y を反転して「数学の向き」で計算する（+ なら左回り）
function turn(o, a, b) { return (a.x - o.x) * (o.y - b.y) - (o.y - a.y) * (b.x - o.x); }
function angleFrom(o, p) { return atan2(o.y - p.y, p.x - o.x); }
// 表示用の名前：p0 と、角度の順番 p1, p2, …
function lab(i) { return i === p0 ? 'p0' : 'p' + (sorted.indexOf(i) + 1); }

function restart() {
  stack = []; sorted = []; p0 = -1; dropped = []; pushes = 0; pops = 0; snap = {};
  gen = pts.length >= 3 ? graham() : null;
  msg = pts.length >= 3 ? '' : '点を 3 つ以上置いてください（クリック）';
}

// ★ グレアム走査
function* graham() {
  let n = pts.length;
  // ① いちばん下（同じなら左）の点
  p0 = 0;
  for (let i = 1; i < n; i++) if (pts[i].y > pts[p0].y || (pts[i].y === pts[p0].y && pts[i].x < pts[p0].x)) p0 = i;
  msg = '① いちばん下の点 p0 を見つける'; yield;
  // ② 角度の順に並べる（同じ角度なら遠い点だけ残す）
  let rest = [...Array(n).keys()].filter((i) => i !== p0);
  rest.sort((a, b) => angleFrom(pts[p0], pts[a]) - angleFrom(pts[p0], pts[b]) || dist(pts[p0].x, pts[p0].y, pts[a].x, pts[a].y) - dist(pts[p0].x, pts[p0].y, pts[b].x, pts[b].y));
  sorted = [];
  for (let k = 0; k < rest.length; k++) {
    let next = rest[k + 1];
    if (next !== undefined && abs(turn(pts[p0], pts[rest[k]], pts[next])) < 1e-6) dropped.push(rest[k]);
    else sorted.push(rest[k]);
  }
  msg = '② p0 から見た角度の順に並べる（同じ向きなら遠い点だけ残す）'; yield;
  if (sorted.length < 2) { msg = '全部の点が一直線上：凸包は線分'; stack = [p0, ...sorted]; return; }
  // ③ スタックで走査
  stack = [p0, sorted[0], sorted[1]]; pushes = 3;
  msg = '③ p0 と最初の 2 点を積む'; yield;
  for (let k = 2; k < sorted.length; k++) {
    let i = sorted[k];
    while (stack.length >= 2 && turn(pts[stack[stack.length - 2]], pts[stack[stack.length - 1]], pts[i]) <= 0) {
      snap = { cand: i, turn: 'right' };
      msg = `${lab(i)} へ行くと右に曲がる（へこむ）→ 一番上の ${lab(stack[stack.length - 1])} を降ろす（pop）`; yield;
      stack.pop(); pops++;
    }
    snap = { cand: i, turn: 'left' };
    msg = `${lab(i)} へは左に曲がる → 積む（push）`; yield;
    stack.push(i); pushes++;
  }
  snap = {};
  msg = `完成！ 凸包の頂点 ${stack.length} 個   push ${pushes} 回 / pop ${pops} 回（どちらも n 回以下）`;
}

function advance() { if (gen && gen.next().done) gen = null; }

function draw() {
  background(BG);
  if (auto && frameCount % speed === 0) advance();
  // 角度の順を示す放射線
  if (p0 >= 0) {
    sorted.forEach((i, k) => {
      stroke(255, 255, 255, 22); strokeWeight(1); line(pts[p0].x, pts[p0].y, pts[i].x, pts[i].y);
      noStroke(); fill(DIM); textSize(11); textAlign(LEFT, BOTTOM); text('p' + (k + 1), pts[i].x + 7, pts[i].y - 4);
    });
  }
  // スタック上の折れ線
  if (stack.length) {
    noFill(); stroke(ORCHID); strokeWeight(3);
    beginShape(); for (let i of stack) vertex(pts[i].x, pts[i].y);
    if (!gen) endShape(CLOSE); else endShape();
  }
  // 候補点への曲がり方
  if (snap.cand !== undefined && stack.length >= 2) {
    let a = pts[stack[stack.length - 2]], b = pts[stack[stack.length - 1]], c = pts[snap.cand];
    noStroke(); fill(snap.turn === 'right' ? 'rgba(255,107,129,0.3)' : 'rgba(111,227,208,0.3)');
    triangle(a.x, a.y, b.x, b.y, c.x, c.y);
    stroke(snap.turn === 'right' ? BAD : MINT); strokeWeight(3); line(b.x, b.y, c.x, c.y);
  }
  // 点
  if (p0 >= 0) { noStroke(); fill(GOLD); textSize(13); textAlign(LEFT, TOP); text('p0', pts[p0].x + 8, pts[p0].y + 4); }
  pts.forEach((p, i) => {
    noStroke();
    let onHull = stack.includes(i);
    fill(i === p0 ? GOLD : dropped.includes(i) ? '#4a4060' : onHull ? ORCHID : FG);
    circle(p.x, p.y, i === p0 || onHull ? 13 : 9);
  });

  // スタックの表示
  let px = width - 270;
  noStroke(); fill(PANEL); rect(px, 20, 250, height - 40, 12);
  fill(FG); textAlign(LEFT, TOP); textSize(17); text('スタック（上が一番上）', px + 18, 36);
  let sh = min(30, (height - 200) / max(stack.length, 1));
  [...stack].reverse().forEach((i, r) => {
    fill(r === 0 ? ORCHID : '#4b3a6b'); rect(px + 18, 72 + r * sh, 210, sh - 4, 6);
    fill(r === 0 ? BG : FG); textSize(min(15, sh * 0.6)); textAlign(LEFT, CENTER);
    text(lab(i), px + 30, 72 + r * sh + sh / 2 - 2);
  });
  textAlign(LEFT, TOP); fill(FG); textSize(15);
  text(`n = ${pts.length}\npush ${pushes}  pop ${pops}`, px + 18, height - 90);

  fill(FG); textSize(22); text('凸包：グレアム走査', 30, 24);
  fill(DIM); textSize(14); text('クリック 追加   ドラッグ 移動   スペース 再生/停止   → 1 ステップ   R ランダム   C 消す   1〜4 お手本', 30, 56);
  fill(GOLD); textSize(17); text(msg, 30, 84, width - 340);
}

function mousePressed() {
  if (mouseX > width - 270) return;
  drag = -1; moved = false;
  pts.forEach((p, i) => { if (dist(mouseX, mouseY, p.x, p.y) < 12) drag = i; });
}
function mouseDragged() { if (drag >= 0) { pts[drag].x = mouseX; pts[drag].y = mouseY; moved = true; restart(); } }
function mouseReleased() {
  if (mouseX > width - 270) return;
  if (drag < 0 && mouseY > 110) { pts.push(createVector(mouseX, mouseY)); restart(); }
  drag = -1;
}

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { advance(); return false; }
  if (key === 'r' || key === 'R') preset(1);
  if (key === 'c' || key === 'C') { pts = []; restart(); }
  if ('1234'.includes(key)) preset(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); preset(1); }
