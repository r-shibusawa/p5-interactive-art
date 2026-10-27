// ============================================
// 15 ドローンのホバリング（ゲーム・自由制作のベース）
// 2 つのローターの推力で飛ぶ 2D ドローン。手動で飛ばすと難しいが、自動（PID）なら風の中でも止まれる
//   自動：高度は PID で推力、横位置は「傾き」を決めてから、傾きを PID で追う（カスケード制御）
// クリック = 目標の位置 / A = 手動⇔自動 / 手動：上下 = 推力、左右 = 傾き / W = 風 / S 保存 / C 軌跡を消す
// ============================================
// ★ のついた数字を変えて、自分のドローンに！

let auto = true;
let windOn = true;
let windMax = 4; // ★ 風の強さ
let m = 1, g = 9.8, Iz = 0.05, Tmax = 25; // ★ 質量・重力・慣性モーメント・最大推力
let altK = { p: 6, i: 1.5, d: 4 }; // ★ 高度の PID
let posK = { p: 1.2, d: 1.4 }; // ★ 横位置 → 目標の傾き
let tiltK = { p: 60, d: 8 }; // ★ 傾き → トルク
let tiltMax = 0.6; // ★ 自動のときの最大の傾き [rad]

let x = 0, y = 2, vx = 0, vy = 0, phi = 0, omega = 0;
let tx = 0, ty = 3, T = m * g, tau = 0, I = 0;
let manualT = m * g, manualTau = 0, wind = 0;
let crashes = 0, score = 0;
let trailLayer;
let HIST = 300, dt = 1 / 60;
let hY = [], hTy = [], hX = [], hTx = [];
let W = 10, H = 6; // 世界の大きさ [m]

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  trailLayer = createGraphics(width, height);
  trailLayer.colorMode(HSB, 360, 100, 100, 100);
  trailLayer.clear();
}

function draw() {
  background(230, 30, 10);
  // ---- 風（ゆっくり変わる + ときどき突風）
  wind = windOn ? (noise(frameCount * 0.01) - 0.5) * 2 * windMax + (noise(frameCount * 0.05 + 100) > 0.8 ? windMax : 0) : 0;

  if (auto) {
    // ★ 高度：PID で推力
    let ey = ty - y;
    I = constrain(I + ey * dt, -3, 3);
    let aCmd = altK.p * ey + altK.i * I - altK.d * vy;
    // ★ 横位置：目標の加速度 → 目標の傾き φd = atan(ax / g)
    let ex = tx - x;
    let axCmd = posK.p * ex - posK.d * vx;
    let phiD = constrain(atan2(axCmd, g), -tiltMax, tiltMax);
    // ★ 傾き：PD でトルク
    tau = tiltK.p * (phiD - phi) - tiltK.d * omega;
    T = constrain(m * (g + aCmd) / max(cos(phi), 0.3), 0, Tmax);
  } else {
    // 手動：キーを押しているあいだ推力と傾きを変える
    if (keyIsDown(UP_ARROW)) manualT = min(manualT + 0.5, Tmax);
    if (keyIsDown(DOWN_ARROW)) manualT = max(manualT - 0.5, 0);
    manualTau = (keyIsDown(RIGHT_ARROW) ? 1.5 : 0) - (keyIsDown(LEFT_ARROW) ? 1.5 : 0);
    T = manualT; tau = manualTau - 2 * omega; // 少しだけ自然な減衰
  }
  tau = constrain(tau, -8, 8);
  // ---- 運動方程式（推力は機体の上向き）
  for (let k = 0; k < 2; k++) {
    let ax = (T * sin(phi) + wind - 0.3 * vx) / m;
    let ay = (T * cos(phi) - m * g - 0.3 * vy) / m;
    vx += ax * dt / 2; vy += ay * dt / 2;
    x += vx * dt / 2; y += vy * dt / 2;
    omega += (tau / Iz) * dt / 2;
    phi += omega * dt / 2;
  }
  omega = constrain(omega, -20, 20); vx = constrain(vx, -30, 30); vy = constrain(vy, -30, 30);
  if (x < -W / 2) { x = -W / 2; vx = abs(vx) * 0.3; }
  if (x > W / 2) { x = W / 2; vx = -abs(vx) * 0.3; }
  if (y > H) { y = H; vy = min(vy, 0); }
  if (y <= 0 && (abs(vy) > 2 || abs(phi) > 0.5)) { crashes++; resetDrone(); }
  else if (y < 0) { y = 0; vy = 0; }
  if (dist(x, y, tx, ty) < 0.3) score++;
  pushHist(hY, y); pushHist(hTy, ty); pushHist(hX, x); pushHist(hTx, tx);

  // ---- 描画
  let sx = (wx) => map(wx, -W / 2, W / 2, 40, width - 40), sy = (wy) => map(wy, 0, H, height - 60, 80);
  // 軌跡
  trailLayer.stroke(auto ? 200 : 30, 60, 100, 50); trailLayer.strokeWeight(2);
  if (hX.length > 1) trailLayer.line(sx(hX[hX.length - 2]), sy(hY[hY.length - 2]), sx(x), sy(y));
  image(trailLayer, 0, 0);
  stroke(0, 0, 40); strokeWeight(3); line(40, sy(0), width - 40, sy(0)); // 地面
  // 目標
  stroke(45, 90, 100); strokeWeight(2); noFill(); circle(sx(tx), sy(ty), 40);
  line(sx(tx) - 30, sy(ty), sx(tx) + 30, sy(ty)); line(sx(tx), sy(ty) - 30, sx(tx), sy(ty) + 30);
  // 風の矢印
  if (abs(wind) > 0.2) {
    stroke(200, 50, 100, 70); strokeWeight(2);
    for (let i = 0; i < 5; i++) { let yy = 120 + i * 60, x0 = width / 2 - wind * 10; line(x0, yy, x0 + wind * 20, yy); }
  }
  // ドローン
  push();
  translate(sx(x), sy(y)); rotate(phi);
  stroke(0, 0, 80); strokeWeight(5); line(-40, 0, 40, 0);
  noStroke(); fill(auto ? 200 : 30, 80, 100); rect(-14, -10, 28, 20, 5);
  fill(0, 0, 100, 40 + map(T, 0, Tmax, 0, 50));
  ellipse(-40, -5, 36 + (frameCount % 3) * 3, 7); ellipse(40, -5, 36 + (frameCount % 3) * 3, 7);
  stroke(120, 80, 100); strokeWeight(3); line(0, 10, 0, 10 + T * 2); // 推力
  pop();
  // 小さなグラフ（右下）
  drawPlot(width - 330, height - 220, 290, 70, [{ data: hTy, hue: 45, sat: 90, name: '目標' }, { data: hY, hue: 200, name: '高度' }], 0, H, '高度');
  drawPlot(width - 330, height - 140, 290, 70, [{ data: hTx, hue: 45, sat: 90, name: '目標' }, { data: hX, hue: 200, name: '横位置' }], -W / 2, W / 2, '横位置');

  noStroke();
  fill(0, 0, 100);
  textSize(18);
  text((auto ? '自動（PID）' : '手動（上下 = 推力、左右 = 傾き）') + '　A で切替　クリックで目標　風 ' + (windOn ? 'ON' : 'OFF') + '（W）　墜落 ' + crashes + ' 回　目標の中にいた時間 ' + nf(score / 60, 1, 1) + ' 秒', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('推力 ' + nf(T, 1, 1) + ' N　傾き ' + nf(degrees(phi), 1, 0) + '°　風 ' + nf(wind, 1, 1) + '　S：保存　C：軌跡を消す', 20, 68);
}

function resetDrone() { x = 0; y = 0.5; vx = 0; vy = 0; phi = 0; omega = 0; I = 0; manualT = m * g; }

function mousePressed() {
  if (mouseY < 90) return;
  tx = constrain(map(mouseX, 40, width - 40, -W / 2, W / 2), -W / 2 + 0.5, W / 2 - 0.5);
  ty = constrain(map(mouseY, height - 60, 80, 0, H), 0.5, H - 0.3);
}
function keyPressed() {
  if (key === 'a' || key === 'A') { auto = !auto; manualT = m * g; I = 0; }
  if (key === 'w' || key === 'W') windOn = !windOn;
  if (key === 'c' || key === 'C') trailLayer.clear();
  if (key === 's' || key === 'S') saveCanvas('drone', 'png');
  if (key === 'r' || key === 'R') { resetDrone(); crashes = 0; score = 0; }
}

// ---------- 自由制作のアイデア ----------
// ・手動モードでどれだけ長く目標の中にいられるか、友だちと勝負（風 ON で）
// ・目標を自動で動かす（円を描く、マウスを追う）。PID はどこまで追いつける？
// ・風を「一方向にずっと」にする。自動の横位置に偏差が残る → 横位置にも I を足してみよう
// ・14 の声で目標高度、06 の Z-N でゲインを決める、など合体
// ・ドローンを 3 台にして、1 台を追いかける「編隊飛行」


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
function pushHist(arr, v) {
  arr.push(isFinite(v) ? v : 0);
  if (arr.length > HIST) arr.shift();
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x, y, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14, 80); rect(x, y, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let y0 = map(0, lo, hi, y + h, y);
  if (y0 > y && y0 < y + h) line(x, y0, x + w, y0);
  for (let s of series) {
    stroke(s.hue, s.sat === undefined ? 70 : s.sat, 100); strokeWeight(s.weight || 2); noFill();
    beginShape();
    for (let i = 0; i < s.data.length; i++) vertex(map(i, 0, HIST - 1, x, x + w), map(constrain(s.data[i], lo, hi), lo, hi, y + h, y));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x + 8, y + 6);
  let lx = x + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, s.sat === undefined ? 70 : s.sat, 100); text(s.name, lx, y + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
