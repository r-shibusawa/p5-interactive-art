// ============================================
// 04 差動二輪ロボットとオドメトリ
// 左右の車輪の速さ vL, vR だけで動くロボット（お掃除ロボットと同じ）
//   前進速度 v = (vR + vL) / 2,  回転速度 ω = (vR − vL) / W（W = 車輪の間隔）
// オドメトリ = 車輪の回転から自分の位置を推定する。でも車輪は少しすべる → 推定（薄い）と本当（濃い）がずれていく
// ↑↓ = 両輪を速く／遅く / ←→ = 左右の差 / スペース = 停止 / N = すべりの大きさ / R = リセット
// ============================================

let W = 40;                    // ★ 車輪の間隔（px）
let vL = 0, vR = 0;            // 指令した車輪速度（px/フレーム）
let slip = 0.03;               // ★ すべりの大きさ（車輪ごとの速度のばらつき）
let truePose, odomPose;        // {x, y, th}
let trueTrail = [], odomTrail = [];
let slipLevels = [0, 0.03, 0.1];
let slipIdx = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetAll();
}

function resetAll() {
  truePose = { x: width / 2, y: height / 2, th: 0 };
  odomPose = { x: width / 2, y: height / 2, th: 0 };
  trueTrail = []; odomTrail = [];
  vL = 0; vR = 0;
}

// ★ 差動二輪の運動学：車輪速度 → 姿勢の変化（1 フレーム分）
function advance(p, l, r) {
  let v = (r + l) / 2;
  let w = (r - l) / W;
  p.x += v * cos(p.th);
  p.y += v * sin(p.th);
  p.th += w;
}

function draw() {
  background(215, 35, 12);
  // 本当の動き：車輪ごとに少しすべる（指令より速かったり遅かったり）
  let lReal = vL * (1 + randomGaussian() * slip);
  let rReal = vR * (1 + randomGaussian() * slip);
  advance(truePose, lReal, rReal);
  // オドメトリ：指令どおり動いたと信じて積分
  advance(odomPose, vL, vR);
  // 画面の端で折り返す（両方同じだけ向きを変える）
  if (truePose.x < 10 || truePose.x > width - 10 || truePose.y < 90 || truePose.y > height - 10) {
    truePose.th += PI; odomPose.th += PI;
    truePose.x = constrain(truePose.x, 10, width - 10); truePose.y = constrain(truePose.y, 90, height - 10);
  }
  if (frameCount % 2 === 0 && (vL !== 0 || vR !== 0)) {
    trueTrail.push({ x: truePose.x, y: truePose.y });
    odomTrail.push({ x: odomPose.x, y: odomPose.y });
    if (trueTrail.length > 1200) { trueTrail.shift(); odomTrail.shift(); }
  }

  drawTrail(odomTrail, 45, 40);
  drawTrail(trueTrail, 170, 90);
  drawRobot(odomPose, 45, 35);
  drawRobot(truePose, 170, 100);
  // ずれを線で
  stroke(0, 80, 100, 60);
  strokeWeight(1);
  line(truePose.x, truePose.y, odomPose.x, odomPose.y);

  let v = (vR + vL) / 2, w = (vR - vL) / W;
  let err = sqrt(sq(truePose.x - odomPose.x) + sq(truePose.y - odomPose.y));
  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text('vL = ' + nf(vL, 1, 1) + '　vR = ' + nf(vR, 1, 1) + '（↑↓ 両輪、←→ 差）　v = ' + nf(v, 1, 1) + '　ω = ' + nf(w, 1, 3) + '　すべり ' + slip + '（N）　位置のずれ ' + nf(err, 1, 0) + ' px　R：リセット', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('濃い = 本当の位置　薄い = 車輪の回転から推定した位置（オドメトリ）。ずれは消えずにたまっていく → 10 でセンサーで補正する', 20, 68);

  // 式のパネル
  let px = width - 360, py = 110;
  fill(0, 0, 100, 8);
  rect(px - 16, py - 30, 350, 110, 10);
  fill(45, 90, 100);
  textSize(15);
  text('v = (vR + vL) / 2', px, py);
  text('ω = (vR − vL) / W', px, py + 24);
  text('x += v cos θ,  y += v sin θ,  θ += ω', px, py + 48);
  fill(0, 0, 60);
  textSize(13);
  text('vL = vR：直進　vL = −vR：その場で回転', px, py + 72);
}

function drawRobot(p, hue, alpha) {
  push();
  translate(p.x, p.y);
  rotate(p.th);
  noStroke();
  fill(hue, 60, 90, alpha);
  rect(-22, -18, 44, 36, 6);
  fill(0, 0, 20, alpha);
  rect(-10, -W / 2 - 4, 20, 8, 2);   // 左の車輪
  rect(-10, W / 2 - 4, 20, 8, 2);    // 右の車輪
  fill(0, 0, 100, alpha);
  triangle(22, 0, 10, -8, 10, 8);    // 前
  pop();
}
function drawTrail(tr, hue, alpha) {
  noFill();
  stroke(hue, 60, 100, alpha);
  strokeWeight(2);
  beginShape();
  for (let p of tr) vertex(p.x, p.y);
  endShape();
}

function keyPressed() {
  let dv = 0.3;   // ★ キー 1 回で変わる速さ
  if (key === UP_ARROW) { vL += dv; vR += dv; }
  if (key === DOWN_ARROW) { vL -= dv; vR -= dv; }
  if (key === LEFT_ARROW) { vL -= dv; vR += dv; }
  if (key === RIGHT_ARROW) { vL += dv; vR -= dv; }
  if (key === ' ') { vL = 0; vR = 0; }
  if (key === 'n' || key === 'N') { slipIdx = (slipIdx + 1) % slipLevels.length; slip = slipLevels[slipIdx]; }
  if (key === 'r' || key === 'R') resetAll();
  vL = constrain(vL, -4, 4); vR = constrain(vR, -4, 4);
}

// ---------- やってみよう ----------
// 1. ↑ を 3 回押してまっすぐ走らせる。すべりがあると少しずつ曲がる。なぜ横ではなく向きがずれる？
// 2. その場回転（← だけ）を 10 秒続けて、本当の向きと推定の向きがどれだけ開くか
// 3. W を 10 や 100 にすると曲がりやすさはどう変わる？（ω の式を見る）
// 4. 直進と回転を交互に繰り返して「四角」を走らせる。元の場所に戻れるか（ロボット競技でよくある課題）
