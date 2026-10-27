// ============================================
// 10 k 平均法（k-means クラスタリング）
// 中心を k 個置き、2 つの手順をくり返すだけ
// ① 割り当て：各点をいちばん近い中心の仲間にする
// ② 更新：各中心を仲間の点の平均（重心）に動かす
// 誤差（各点と中心の距離の 2 乗の合計）は必ず減り、いつか止まる。ただし初めの置き方しだい
// 操作：クリック = 点をまく / 中心をドラッグ / スペース = 再生・停止 / → = 1 手順
//       ↑↓ = k を変える / I = ランダムに置き直す / P = k-means++ で置き直す
//       R = 新しいデータ / 1〜3 = お手本（かたまり・輪・細長い）
// ============================================

let pts = [];
let K = 4;              // ★ クラスタの数
let cents = [], shown = [];   // 中心（shown はアニメーション用）
let label = [];
let phase = 'assign', iter = 0, sseHist = [], converged = false;
let auto = true, speed = 40;
let drag = -1;
let preset = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeData(1);
}

function makeData(k) {
  preset = k; pts = [];
  let W = width - 300, H = height;
  if (k === 1) for (let c = 0; c < 4; c++) {
    let cx = random(W * 0.2, W * 0.8), cy = random(H * 0.3, H * 0.85);
    for (let i = 0; i < 70; i++) pts.push(createVector(cx + randomGaussian() * 45, cy + randomGaussian() * 45));
  }
  if (k === 2) for (let i = 0; i < 260; i++) {   // 輪と真ん中：k-means が苦手な形
    let a = random(TWO_PI), r = i < 200 ? 220 + randomGaussian() * 12 : randomGaussian() * 30;
    pts.push(createVector(W / 2 + cos(a) * r, H * 0.57 + sin(a) * r * 0.8));
  }
  if (k === 3) for (let c = 0; c < 3; c++) for (let i = 0; i < 80; i++)   // 細長いかたまり
    pts.push(createVector(W * 0.2 + random(W * 0.6), H * (0.35 + c * 0.2) + randomGaussian() * 14));
  initCenters(false);
}

function initCenters(plusplus) {
  cents = [];
  if (pts.length === 0) { shown = []; return; }
  if (!plusplus) for (let i = 0; i < K; i++) cents.push(random(pts).copy());
  else {
    // ★ k-means++：すでにある中心から遠い点ほど選ばれやすい
    cents.push(random(pts).copy());
    while (cents.length < K) {
      let w = pts.map((p) => min(cents.map((c) => sq(p.x - c.x) + sq(p.y - c.y))));
      let r = random(w.reduce((a, b) => a + b, 0));
      let i = 0; while (i < w.length - 1 && (r -= w[i]) > 0) i++;
      cents.push(pts[i].copy());
    }
  }
  shown = cents.map((c) => c.copy());
  label = pts.map(() => -1);
  phase = 'assign'; iter = 0; sseHist = []; converged = false;
}

function nearest(p) {
  let b = 0, bd = Infinity;
  cents.forEach((c, j) => { let dd = sq(p.x - c.x) + sq(p.y - c.y); if (dd < bd) { bd = dd; b = j; } });
  return b;
}
function sse() { return pts.reduce((s, p, i) => s + (label[i] >= 0 ? sq(p.x - cents[label[i]].x) + sq(p.y - cents[label[i]].y) : 0), 0); }

// ★ 1 手順進める
function lloydStep() {
  if (!pts.length || converged) return;
  if (phase === 'assign') {
    let changed = 0;
    pts.forEach((p, i) => { let j = nearest(p); if (j !== label[i]) changed++; label[i] = j; });
    if (changed === 0 && iter > 0) converged = true;
    sseHist.push(sse());
    phase = 'update';
  } else {
    for (let j = 0; j < K; j++) {
      let mine = pts.filter((p, i) => label[i] === j);
      if (mine.length) cents[j] = createVector(mine.reduce((s, p) => s + p.x, 0) / mine.length, mine.reduce((s, p) => s + p.y, 0) / mine.length);
    }
    phase = 'assign'; iter++;
  }
}

function hueOf(j) { return (j * 360) / K + 20; }

function draw() {
  background(255, 40, 10);
  if (auto && frameCount % speed === 0) lloydStep();
  shown.forEach((s, j) => { if (cents[j]) s.lerp(cents[j], 0.12); });

  // ボロノイ（どの中心に近いか）を薄く塗る
  let g = 18; noStroke();
  if (cents.length) for (let x = 0; x < width - 280; x += g) for (let y = 100; y < height; y += g) {
    let j = 0, bd = Infinity;
    shown.forEach((c, k) => { let dd = sq(x - c.x) + sq(y - c.y); if (dd < bd) { bd = dd; j = k; } });
    fill(hueOf(j), 60, 40, 22); rect(x, y, g, g);
  }
  // 点と中心を結ぶ線
  pts.forEach((p, i) => {
    if (label[i] >= 0) {
      stroke(hueOf(label[i]), 60, 90, 18); strokeWeight(1); line(p.x, p.y, shown[label[i]].x, shown[label[i]].y);
    }
  });
  noStroke();
  pts.forEach((p, i) => { fill(label[i] >= 0 ? color(hueOf(label[i]), 60, 100) : color(0, 0, 80)); circle(p.x, p.y, 6); });
  shown.forEach((c, j) => {
    stroke(0, 0, 100); strokeWeight(3); fill(hueOf(j), 70, 100);
    push(); translate(c.x, c.y); rotate(QUARTER_PI); rectMode(CENTER); rect(0, 0, 20, 20, 3); pop();
  });

  // パネル：誤差のグラフ
  let px = width - 270;
  noStroke(); fill(255, 30, 18); rect(px, 20, 250, 300, 12);
  fill(0, 0, 95); textAlign(LEFT, TOP); textSize(17); text('誤差（距離² の合計）', px + 18, 36);
  if (sseHist.length) {
    let mx = max(sseHist), mn = min(sseHist);
    stroke(300, 40, 100); strokeWeight(2); noFill();
    beginShape();
    sseHist.forEach((v, i) => vertex(px + 20 + (i / max(sseHist.length - 1, 1)) * 210, 220 - ((v - mn) / max(mx - mn, 1)) * 140));
    endShape();
    noStroke(); fill(0, 0, 90); textSize(14);
    text(`いま ${round(sseHist[sseHist.length - 1])}`, px + 18, 236);
  }
  fill(0, 0, 90); textSize(14);
  text(`k = ${K}   くり返し ${iter} 回\n次の手順：${phase === 'assign' ? '① 割り当て' : '② 中心を重心へ'}${converged ? '\n収束しました（割り当てが変わらない）' : ''}`, px + 18, 258);

  noStroke(); fill(0, 0, 95); textSize(22); textAlign(LEFT, TOP); text('k 平均法  割り当てて、重心へ動かす', 30, 24);
  fill(0, 0, 60); textSize(14);
  text('クリック 点をまく   中心をドラッグ   スペース 再生/停止   → 1 手順   ↑↓ k   I ランダム初期化   P k-means++   R 新データ   1〜3 お手本', 30, 56);
}

function mousePressed() {
  drag = -1;
  shown.forEach((c, j) => { if (dist(mouseX, mouseY, c.x, c.y) < 16) drag = j; });
  if (drag < 0 && mouseY > 100 && mouseX < width - 280) {
    for (let i = 0; i < 15; i++) { pts.push(createVector(mouseX + randomGaussian() * 25, mouseY + randomGaussian() * 25)); label.push(-1); }
    converged = false;
  }
}
function mouseDragged() { if (drag >= 0) { cents[drag].set(mouseX, mouseY); shown[drag].set(mouseX, mouseY); converged = false; phase = 'assign'; } }
function mouseReleased() { drag = -1; }

function keyPressed() {
  if (key === ' ') { auto = !auto; return false; }
  if (key === RIGHT_ARROW) { lloydStep(); return false; }
  if (key === UP_ARROW) { K = min(K + 1, 8); initCenters(true); return false; }
  if (key === DOWN_ARROW) { K = max(K - 1, 1); initCenters(true); return false; }
  if (key === 'i' || key === 'I') initCenters(false);
  if (key === 'p' || key === 'P') initCenters(true);
  if (key === 'r' || key === 'R') makeData(preset);
  if ('123'.includes(key)) makeData(Number(key));
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); makeData(preset); }
