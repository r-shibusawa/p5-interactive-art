// ============================================
// 01 ニュートンの運動方程式と数値積分
// F = ma → a がわかれば、少しずつ v と x を更新して未来を計算できる（数値積分）
//   オイラー法・半陰的オイラー法・ルンゲ＝クッタ法（RK4）を、正解（式）と比べる
// ↑↓ = 時間の刻み dt / M = 放物運動 ↔ ばね / D = 空気抵抗 ON/OFF / スペース = やり直し
// ============================================

let dt = 0.1;               // ★ 時間の刻み [s]（大きいほど誤差が増える）
let g = 9.8;                // ★ 重力加速度 [m/s²]
let k = 0.03;               // ★ 空気抵抗の係数（a = −k|v|v）
let w0 = Math.PI;           // ★ ばねの角振動数 [rad/s]（周期 2 秒）
let scene = 0;              // 0: 放物運動, 1: ばね
let drag = false;
let methods = [
  { name: 'オイラー法', hue: 0 },
  { name: '半陰的オイラー法', hue: 130 },
  { name: 'RK4', hue: 200 },
];
let simT = 0, acc = 0, HIST = 600;
let hE = [[], [], [], []];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  restart();
}

// ★ 運動方程式：状態 s = {x, y, vx, vy} → 加速度
function accel(s) {
  if (scene === 1) return { ax: -w0 * w0 * s.x, ay: 0 };
  let ax = 0, ay = -g;
  if (drag) { let sp = sqrt(s.vx * s.vx + s.vy * s.vy); ax -= k * sp * s.vx; ay -= k * sp * s.vy; }
  return { ax, ay };
}

function restart() {
  simT = 0; acc = 0;
  let s0 = scene === 0 ? { x: 0, y: 0, vx: 13, vy: 18 } : { x: 1, y: 0, vx: 0, vy: 0 };
  for (let m of methods) { m.s = { ...s0 }; m.trail = [{ x: s0.x, y: s0.y }]; }
}

// ---- 3 つの積分法（1 ステップ dt 進める）
function eulerStep(s, h) {
  let a = accel(s);
  return { x: s.x + s.vx * h, y: s.y + s.vy * h, vx: s.vx + a.ax * h, vy: s.vy + a.ay * h }; // 古い v で x を進める
}
function semiImplicitStep(s, h) {
  let a = accel(s);
  let vx = s.vx + a.ax * h, vy = s.vy + a.ay * h;
  return { x: s.x + vx * h, y: s.y + vy * h, vx, vy };                                  // 新しい v で x を進める
}
function rk4Step(s, h) {
  let f = (q) => { let a = accel(q); return { x: q.vx, y: q.vy, vx: a.ax, vy: a.ay }; };
  let add = (q, d, c) => ({ x: q.x + d.x * c, y: q.y + d.y * c, vx: q.vx + d.vx * c, vy: q.vy + d.vy * c });
  let k1 = f(s), k2 = f(add(s, k1, h / 2)), k3 = f(add(s, k2, h / 2)), k4 = f(add(s, k3, h));
  let r = {};
  for (let c of ['x', 'y', 'vx', 'vy']) r[c] = s[c] + h / 6 * (k1[c] + 2 * k2[c] + 2 * k3[c] + k4[c]);
  return r;
}
// 正解（式）：空気抵抗なしの放物線 / ばねの cos
function exact(tt) {
  if (scene === 1) return { x: cos(w0 * tt), y: 0, vx: -w0 * sin(w0 * tt), vy: 0 };
  return { x: 13 * tt, y: 18 * tt - 0.5 * g * tt * tt, vx: 13, vy: 18 - g * tt };
}
function energy(s) {
  if (scene === 1) return 0.5 * s.vx * s.vx + 0.5 * w0 * w0 * s.x * s.x;
  return 0.5 * (s.vx * s.vx + s.vy * s.vy) + g * s.y;
}

function draw() {
  background(220, 30, 11);
  // ★ 実時間で 1/60 秒たつごとに、dt ずつ計算を進める
  acc += 1 / 60;
  let stepper = [eulerStep, semiImplicitStep, rk4Step];
  let guard = 0;
  while (acc >= dt && guard++ < 200) {
    acc -= dt; simT += dt;
    methods.forEach((m, i) => {
      m.s = stepper[i](m.s, dt);
      for (let c of ['x', 'y', 'vx', 'vy']) m.s[c] = constrain(m.s[c], -1e4, 1e4);
      m.trail.push({ x: m.s.x, y: m.s.y, t: simT });
      if (m.trail.length > 400) m.trail.shift();
    });
  }
  let E0 = energy(exact(0));
  methods.forEach((m, i) => pushHist(hE[i], energy(m.s) / E0));
  pushHist(hE[3], drag && scene === 0 ? NaN : 1);
  let ex = exact(simT);

  if (scene === 0) drawProjectile(ex); else drawSpring(ex);

  // ---- 右下：エネルギーの比 E / E0
  let gx = width * 0.5, gw = width * 0.46;
  let series = [{ data: hE[3], hue: 0, sat: 0, name: '正解 1.0' }];
  methods.forEach((m, i) => series.push({ data: hE[i], hue: m.hue, name: m.name }));
  drawPlot(gx, height * 0.58, gw, height * 0.32, series, 0, 2, 'E / E₀');

  noStroke(); fill(0, 0, 100); textSize(18);
  text((scene === 0 ? '放物運動' : 'ばね（単振動）') + '（M）　dt = ' + nf(dt, 1, 3) + ' s（↑↓）　空気抵抗 ' + (drag ? 'ON' : 'OFF') + '（D）　t = ' + nf(simT, 1, 2) + ' s', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('オイラー: x += v·dt, v += a·dt ／ 半陰的: v += a·dt してから x += v·dt ／ RK4: 途中の傾きを 4 回調べて平均。灰色の点線 = 式で求めた正解', 20, 68);
}

function drawProjectile(ex) {
  let ox = width * 0.05, oy = height * 0.8, sc = min(width * 0.42 / 50, height * 0.6 / 22);
  stroke(0, 0, 35); strokeWeight(2); line(ox, oy, ox + 50 * sc, oy);
  // 正解の放物線
  if (!drag) {
    stroke(0, 0, 70); strokeWeight(1.5); noFill(); drawingContext.setLineDash([5, 6]);
    beginShape(); for (let tt = 0; tt <= 3.8; tt += 0.05) { let p = exact(tt); vertex(ox + p.x * sc, oy - p.y * sc); } endShape();
    drawingContext.setLineDash([]);
  }
  for (let m of methods) {
    noFill(); stroke(m.hue, 70, 100, 80); strokeWeight(2);
    beginShape(); for (let p of m.trail) vertex(ox + p.x * sc, oy - p.y * sc); endShape();
    noStroke(); fill(m.hue, 70, 100);
    for (let p of m.trail) circle(ox + p.x * sc, oy - p.y * sc, 5);   // 点 = 計算した時刻
    circle(ox + m.s.x * sc, oy - m.s.y * sc, 14);
  }
  if (methods.every((m) => m.s.y < -2) || simT > 8) restart();
  // 右上：各方法の誤差
  let gx = width * 0.5, gy = height * 0.14;
  noStroke(); fill(0, 0, 14); rect(gx, gy, width * 0.46, height * 0.38, 6);
  fill(0, 0, 90); textSize(16); text('着地点・正解とのずれ', gx + 16, gy + 30);
  methods.forEach((m, i) => {
    let err = drag ? NaN : sqrt(sq(m.s.x - ex.x) + sq(m.s.y - ex.y));
    fill(m.hue, 70, 100); textSize(15);
    text(m.name + '　位置のずれ ' + (isFinite(err) ? nf(err, 1, 3) + ' m' : '（空気抵抗ありは正解の式がない → RK4 を基準に）'), gx + 16, gy + 64 + i * 30);
  });
  fill(0, 0, 60); textSize(14);
  text('重力だけなら RK4 は正解とぴったり一致（a が一定なので）', gx + 16, gy + 170);
  text('D で空気抵抗を入れると差が出る。下のグラフ：1 からずれる = 誤差', gx + 16, gy + 194);
}

function drawSpring(ex) {
  let cx = width * 0.24, sc = width * 0.16;
  methods.forEach((m, i) => {
    let y = height * (0.25 + i * 0.17), mx = cx + constrain(m.s.x, -2.5, 2.5) * sc;
    stroke(0, 0, 40); strokeWeight(4); line(width * 0.03, y - 30, width * 0.03, y + 30);
    stroke(m.hue, 60, 100); strokeWeight(2); noFill();
    beginShape(); for (let j = 0; j <= 16; j++) vertex(lerp(width * 0.03, mx - 20, j / 16), y + (j % 2 ? -10 : 10) * (j > 0 && j < 16)); endShape();
    noStroke(); fill(m.hue, 70, 100); rect(mx - 20, y - 20, 40, 40, 6);
    fill(0, 0, 80); textSize(14); text(m.name, width * 0.03 + 8, y - 30);
  });
  let y = height * 0.76, mx = cx + ex.x * sc;
  noStroke(); fill(0, 0, 60); rect(mx - 20, y - 20, 40, 40, 6);
  fill(0, 0, 80); textSize(14); text('正解 x = cos ωt', width * 0.03 + 8, y - 30);
  // 右上：位相図（x, v）
  let gx = width * 0.5, gy = height * 0.14, gw = width * 0.46, gh = height * 0.38;
  noStroke(); fill(0, 0, 14); rect(gx, gy, gw, gh, 6);
  let pcx = gx + gw / 2, pcy = gy + gh / 2, ps = gh * 0.2;
  stroke(0, 0, 50); noFill(); drawingContext.setLineDash([5, 6]); ellipse(pcx, pcy, 2 * ps, 2 * ps); drawingContext.setLineDash([]);
  for (let m of methods) {
    noStroke(); fill(m.hue, 70, 100); circle(pcx + constrain(m.s.x, -2.4, 2.4) * ps, pcy - constrain(m.s.vx / w0, -2.4, 2.4) * ps, 10);
  }
  for (let m of methods) {
    m.ph = m.ph || [];
    m.ph.push([m.s.x, m.s.vx / w0]);
    if (m.ph.length > 300) m.ph.shift();
    stroke(m.hue, 70, 100, 60); strokeWeight(1.5); noFill();
    beginShape(); for (let p of m.ph) vertex(pcx + constrain(p[0], -2.4, 2.4) * ps, pcy - constrain(p[1], -2.4, 2.4) * ps); endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); text('位相図（横 x、縦 v/ω）点線の円 = 正解。外へ渦巻く = エネルギーが増える', gx + 8, gy + 18);
}

function keyPressed() {
  if (key === UP_ARROW) dt = min(dt * 1.5, 0.4);
  if (key === DOWN_ARROW) dt = max(dt / 1.5, 0.002);
  if (key === 'm' || key === 'M') { scene = 1 - scene; for (let m of methods) m.ph = []; hE = [[], [], [], []]; restart(); }
  if (key === 'd' || key === 'D') { drag = !drag; restart(); }
  if (key === ' ') { for (let m of methods) m.ph = []; restart(); }
}

// ---------- やってみよう ----------
// 1. ばね（M）で dt を大きくする。オイラー法は外へ渦巻き（エネルギーが増え続け）、半陰的オイラーは円のまわりにとどまる
// 2. dt を半分にすると、オイラー法の誤差は約 1/2、RK4 は約 1/16 になる（1 次と 4 次の精度）
// 3. 空気抵抗（D）を入れて、k を 0.1 にしてみる。飛ぶ距離はどれだけ短くなる？
// 4. ゲームの物理エンジンは半陰的オイラー法が多い。速くて、エネルギーが暴走しにくいから


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : NaN);
  if (arr.length > HIST) arr.shift();
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x0, y0, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x0, y0, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let y1 = map(1, lo, hi, y0 + h, y0);
  line(x0, y1, x0 + w, y1);
  for (let s of series) {
    stroke(s.hue, s.sat === undefined ? 70 : s.sat, s.sat === 0 ? 60 : 100); strokeWeight(2); noFill();
    beginShape();
    for (let i = 0, off = HIST - s.data.length; i < s.data.length; i++) {
      if (!isFinite(s.data[i])) { endShape(); beginShape(); continue; }
      vertex(map(i + off, 0, HIST - 1, x0, x0 + w), map(constrain(s.data[i], lo, hi), lo, hi, y0 + h, y0));
    }
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x0 + 8, y0 + 6);
  let lx = x0 + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, s.sat === undefined ? 70 : s.sat, s.sat === 0 ? 70 : 100); text(s.name, lx, y0 + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
