// ============================================
// 08 ケプラー運動と万有引力
// 太陽の引力 F = GMm / r² だけで、惑星は楕円を描く（第 1 法則）
//   同じ時間に掃く面積は同じ（第 2 法則）、周期² ∝ 長半径³（第 3 法則）を確かめる
// ドラッグ = 惑星を置いて投げる（押した所が位置、引っぱった向きと長さが速度）/ ↑↓ = 時間の速さ / C = 記録を消す
// ============================================

let GM = 4e6;              // ★ 万有引力定数 × 太陽の質量 [px³/s²]
let timeScale = 1;         // ★ 時間の速さ
let SECTORS = 12;          // ★ 1 周を何個の扇形に分けるか
let sun, p = null;         // 惑星 {x, y, vx, vy}（太陽が原点）
let aiming = null;
let sectors = [], cur = null, tSec = 0, secDT = 1;
let records = [];          // 測った周期 {a, T}
let angAcc = 0, lastAng = 0, tOrbit = 0;
let trail = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  sun = { x: width * 0.25, y: height * 0.52 };
  launch(0, -170, 175, 0);
}

function launch(x, y, vx, vy) {
  p = { x, y, vx, vy };
  let el = elements();
  secDT = isFinite(el.T) ? el.T / SECTORS : 1;
  sectors = []; cur = { pts: [[x, y]] }; tSec = 0;
  angAcc = 0; lastAng = atan2(y, x); tOrbit = 0; trail = [];
}

// 軌道要素：エネルギー E と角運動量 h から 長半径 a・離心率 e・周期 T
function elements() {
  let r = sqrt(p.x * p.x + p.y * p.y), v2 = p.vx * p.vx + p.vy * p.vy;
  let E = v2 / 2 - GM / r, h = p.x * p.vy - p.y * p.vx;
  let a = -GM / (2 * E), e = sqrt(max(0, 1 + 2 * E * h * h / (GM * GM)));
  let T = E < 0 ? TWO_PI * sqrt(a * a * a / GM) : Infinity;
  return { E, h, a, e, T };
}

function accel(x, y) {
  let r2 = x * x + y * y, r = sqrt(r2), f = -GM / (r2 * r);
  return [f * x, f * y];
}

function draw() {
  background(235, 40, 8);
  if (p && !aiming) {
    // ★ 速度ベルレ法（リープフロッグ）で細かく進める。太陽の近くでは自動で細かく
    let total = timeScale / 60, done = 0, guard = 0;
    while (done < total && guard++ < 4000) {
      let r = sqrt(p.x * p.x + p.y * p.y);
      let h = min(total - done, 0.0005 * pow(r / 100, 1.5));
      let a = accel(p.x, p.y);
      p.vx += a[0] * h / 2; p.vy += a[1] * h / 2;
      p.x += p.vx * h; p.y += p.vy * h;
      a = accel(p.x, p.y);
      p.vx += a[0] * h / 2; p.vy += a[1] * h / 2;
      done += h; tSec += h; tOrbit += h;
      if (tSec >= secDT) { cur.pts.push([p.x, p.y]); sectors.push(cur); if (sectors.length > SECTORS) sectors.shift(); cur = { pts: [[p.x, p.y]] }; tSec -= secDT; }
      // 1 周したら周期を記録（角度の合計が 2π を超えたとき）
      let ang = atan2(p.y, p.x), d = ang - lastAng;
      if (d > PI) d -= TWO_PI; if (d < -PI) d += TWO_PI;
      angAcc += d; lastAng = ang;
      if (abs(angAcc) >= TWO_PI) {
        let el = elements();
        records.push({ a: el.a, T: tOrbit, e: el.e }); if (records.length > 8) records.shift();
        angAcc -= Math.sign(angAcc) * TWO_PI; tOrbit = 0;
      }
    }
    if (frameCount % 2 === 0) cur.pts.push([p.x, p.y]);
    trail.push([p.x, p.y]); if (trail.length > 1500) trail.shift();
    let r = sqrt(p.x * p.x + p.y * p.y);
    if (r < 14 || r > 6000 || !isFinite(r)) p = null;   // 太陽にぶつかった・飛んでいった
  }

  push(); translate(sun.x, sun.y);
  // 扇形（同じ時間に掃いた面積）
  sectors.forEach((s, i) => {
    noStroke(); fill(i % 2 ? 200 : 30, 60, 80, 35);
    beginShape(); vertex(0, 0); for (let q of s.pts) vertex(q[0], q[1]); endShape(CLOSE);
  });
  // 予想される楕円（点線）
  if (p) {
    let el = elements();
    if (el.E < 0) {
      // 離心率ベクトルから向きを求める
      let r = sqrt(p.x * p.x + p.y * p.y), vr = (p.x * p.vx + p.y * p.vy);
      let ex = ((p.vx * p.vx + p.vy * p.vy) - GM / r) * p.x / GM - vr * p.vx / GM;
      let ey = ((p.vx * p.vx + p.vy * p.vy) - GM / r) * p.y / GM - vr * p.vy / GM;
      let w = atan2(ey, ex), b = el.a * sqrt(max(0, 1 - el.e * el.e));
      push(); rotate(w); translate(-el.a * el.e, 0);
      noFill(); stroke(0, 0, 60); strokeWeight(1); drawingContext.setLineDash([5, 7]); ellipse(0, 0, 2 * el.a, 2 * b); drawingContext.setLineDash([]);
      pop();
    }
    stroke(45, 60, 100, 60); strokeWeight(1.5); noFill();
    beginShape(); for (let q of trail) vertex(q[0], q[1]); endShape();
    noStroke(); fill(190, 70, 100); circle(p.x, p.y, 16);
    stroke(130, 80, 100); strokeWeight(2); line(p.x, p.y, p.x + p.vx * 0.3, p.y + p.vy * 0.3);
  }
  noStroke(); fill(45, 90, 100); circle(0, 0, 28);
  pop();
  if (aiming) {
    stroke(130, 80, 100); strokeWeight(3); line(aiming.x, aiming.y, mouseX, mouseY);
    noStroke(); fill(190, 70, 100); circle(aiming.x, aiming.y, 16);
  }

  drawPanel();
  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグで惑星を投げる　時間 ×' + nf(timeScale, 1, 2) + '（↑↓）　C：記録を消す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('扇形 = 同じ時間（周期の 1/' + SECTORS + '）に太陽と惑星を結ぶ線が掃いた面積。近日点では速く、遠日点では遅いが、面積は同じ', 20, 68);
}

// 右：面積の表と第 3 法則の表
function drawPanel() {
  let gx = width * 0.52, gy = height * 0.12, gw = width * 0.44;
  noStroke(); fill(0, 0, 12); rect(gx, gy, gw, height * 0.34, 6);
  fill(0, 0, 85); textSize(15); text('第 2 法則：扇形の面積（最近の ' + sectors.length + ' 個）', gx + 14, gy + 26);
  let areas = sectors.map((s) => { let A = 0, q = s.pts; for (let i = 0; i < q.length - 1; i++) A += q[i][0] * q[i + 1][1] - q[i + 1][0] * q[i][1]; return abs(A) / 2; });
  let amax = max(1, ...areas);
  areas.forEach((A, i) => {
    let bw = (gw - 40) / SECTORS;
    fill(i % 2 ? 200 : 30, 60, 80); let hh = A / amax * (height * 0.2);
    rect(gx + 20 + i * bw, gy + height * 0.3 - hh, bw - 4, hh);
  });
  if (p) { let el = elements(); fill(0, 0, 70); textSize(13); text('理論：面積 = (h/2)·Δt = ' + nf(abs(el.h) / 2 * secDT, 1, 0) + ' px²　（h = r × v は一定 = 角運動量保存）', gx + 14, gy + 48); }

  let ty = height * 0.5;
  fill(0, 0, 12); rect(gx, ty, gw, height * 0.4, 6);
  fill(0, 0, 85); textSize(15); text('第 3 法則：T² / a³ はどの軌道でも同じ（= 4π² / GM）', gx + 14, ty + 26);
  textSize(14); fill(0, 0, 60);
  let cols = [gx + 20, gx + gw * 0.25, gx + gw * 0.45, gx + gw * 0.62];
  ['長半径 a [px]', '離心率 e', '周期 T [s]', 'T² / a³ (×10⁻⁶)'].forEach((s, i) => text(s, cols[i], ty + 56));
  records.forEach((r, j) => {
    fill(0, 0, 90);
    [nf(r.a, 1, 0), nf(r.e, 1, 2), nf(r.T, 1, 2), nf(r.T * r.T / (r.a * r.a * r.a) * 1e6, 1, 4)].forEach((s, i) => text(s, cols[i], ty + 82 + j * 24));
  });
  fill(55, 90, 100); text('理論値 4π²/GM = ' + nf(4 * PI * PI / GM * 1e6, 1, 4), gx + 20, ty + height * 0.4 - 16);
  if (p) { let el = elements(); fill(0, 0, 70); text(el.E < 0 ? 'いまの軌道：a = ' + nf(el.a, 1, 0) + '、e = ' + nf(el.e, 1, 2) + '、T = ' + nf(el.T, 1, 2) + ' s' : 'エネルギー ≥ 0 → 双曲線（二度と戻らない）', gx + gw * 0.45, ty + height * 0.4 - 16); }
  else { fill(0, 80, 100); text('惑星がいません。ドラッグで投げよう', gx + gw * 0.45, ty + height * 0.4 - 16); }
}

function mousePressed() { if (mouseX < width * 0.5 && mouseY > 90) aiming = { x: mouseX, y: mouseY }; }
function mouseReleased() {
  if (!aiming) return;
  let x = aiming.x - sun.x, y = aiming.y - sun.y;
  if (x * x + y * y > 30 * 30) launch(x, y, (mouseX - aiming.x) * 1.5, (mouseY - aiming.y) * 1.5);
  aiming = null;
}
function keyPressed() {
  if (key === UP_ARROW) timeScale = min(timeScale * 2, 16);
  if (key === DOWN_ARROW) timeScale = max(timeScale / 2, 0.125);
  if (key === 'c' || key === 'C') records = [];
}

// ---------- やってみよう ----------
// 1. 円になるように投げる（速さ v = √(GM/r)）。e ≈ 0 になる？ 少し速くすると楕円、√2 倍で放物線（脱出）
// 2. 細長い楕円を投げて、扇形の形と面積の棒を見る。形は違うのに面積は同じ
// 3. 大きさの違う軌道を 3 つ以上投げて、表の T²/a³ がそろうことを確かめる（第 3 法則）
// 4. accel の力を 1/r² から 1/r³ や 1/r に変えると？ 楕円が閉じなくなる（閉じるのは 1/r² と r だけ）
