// ============================================
// 03 運動量保存と衝突
// ぶつかっても運動量 p = m₁v₁ + m₂v₂ の合計は変わらない。運動エネルギーは反発係数 e しだいで減る
//   e = 1 弾性衝突、e = 0 くっつく（完全非弾性）。N でニュートンのゆりかご
// ←→ = 反発係数 e / ↑↓ = 質量比 m₂/m₁ / スペース = もう一度 / N = ゆりかご / 1〜4 = 持ち上げる玉の数
// ============================================

let e = 1.0;               // ★ 反発係数（0〜1）
let ratio = 1;             // ★ 質量比 m₂ / m₁
let v1start = 1.5;         // ★ 台車 1 の初速 [m/s]（台車 2 は止まっている）
let cradle = false;
let carts = [], balls = [];
let HIST = 600, dt = 1 / 60;
let hP = [], hK = [], hV1 = [], hV2 = [];
let lift = 1, simT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  restart();
}

function restart() {
  carts = [{ x: -1.6, v: v1start, m: 1, w: 0.3 }, { x: 0.2, v: 0, m: ratio, w: 0.3 * sqrt(sqrt(ratio)) }];
  balls = [];
  for (let i = 0; i < 5; i++) balls.push({ th: i < lift ? -0.6 : 0, om: 0 });
  simT = 0;
}

// ★ 1 次元の衝突（反発係数 e）：運動量保存 + 「離れる速さ = e × 近づく速さ」
function collide(a, b) {
  let P = a.m * a.v + b.m * b.v, M = a.m + b.m;
  let va = (P + b.m * e * (b.v - a.v)) / M;
  let vb = (P + a.m * e * (a.v - b.v)) / M;
  a.v = va; b.v = vb;
}

function draw() {
  background(250, 25, 11);
  if (cradle) drawCradle(); else drawCarts();

  noStroke(); fill(0, 0, 100); textSize(18);
  text((cradle ? 'ニュートンのゆりかご（1〜4 で玉の数）' : '台車の衝突') + '　e = ' + nf(e, 1, 2) + '（←→）　m₂/m₁ = ' + nf(ratio, 1, 2) + '（↑↓）　スペース：もう一度　N：切り替え', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('v₁\' = (m₁v₁ + m₂v₂ + m₂e(v₂ − v₁)) / (m₁ + m₂)　　e = 1 なら運動エネルギーも保存、e < 1 なら熱や音になって減る', 20, 68);
}

function drawCarts() {
  for (let sub = 0; sub < 4; sub++) {
    for (let c of carts) c.x += c.v * dt / 4;
    let [a, b] = carts;
    if (b.x - a.x < (a.w + b.w) / 2 && a.v > b.v) collide(a, b);
  }
  simT += dt;
  if (carts.some((c) => abs(c.x) > 2.6) || simT > 12) restart();
  let P = carts.reduce((s, c) => s + c.m * c.v, 0), K = carts.reduce((s, c) => s + 0.5 * c.m * c.v * c.v, 0);
  pushHist(hP, P); pushHist(hK, K); pushHist(hV1, carts[0].v); pushHist(hV2, carts[1].v);

  // 線路と台車
  let y = height * 0.42, sx = (x) => map(x, -2.4, 2.4, width * 0.03, width * 0.47), pxPerM = (width * 0.44) / 4.8;
  stroke(0, 0, 40); strokeWeight(3); line(width * 0.03, y + 34, width * 0.47, y + 34);
  carts.forEach((c, i) => {
    let w = c.w * pxPerM, hh = 30 + 12 * sqrt(c.m);
    noStroke(); fill(i ? 200 : 30, 70, 100); rect(sx(c.x) - w / 2, y + 26 - hh, w, hh, 6);
    fill(0, 0, 20); circle(sx(c.x) - w * 0.3, y + 28, 12); circle(sx(c.x) + w * 0.3, y + 28, 12);
    fill(0, 0, 100); textSize(13); textAlign(CENTER); text('m' + (i + 1) + '=' + nf(c.m, 1, 2), sx(c.x), y + 16 - hh);
    // 速度の矢印
    stroke(i ? 200 : 30, 70, 100); strokeWeight(3); line(sx(c.x), y - hh - 4, sx(c.x) + c.v * 40, y - hh - 4);
    textAlign(LEFT, BASELINE);
  });

  // 棒グラフ：運動量と運動エネルギー
  let bx = width * 0.05, by = height * 0.62, bw = width * 0.4;
  bars(bx, by, bw, '運動量 p = mv', [carts[0].m * carts[0].v, carts[1].m * carts[1].v], 2.4, true);
  bars(bx, by + 110, bw, '運動エネルギー K = ½mv²', [0.5 * carts[0].m * carts[0].v ** 2, 0.5 * carts[1].m * carts[1].v ** 2], 2.4, false);

  let gx = width * 0.5, gw = width * 0.46;
  drawPlot(gx, height * 0.14, gw, height * 0.32, [{ data: hP, hue: 55, name: '運動量の合計' }, { data: hK, hue: 320, name: '運動エネルギーの合計' }], -0.5, 3, '合計（衝突の前後で比べる）');
  drawPlot(gx, height * 0.52, gw, height * 0.32, [{ data: hV1, hue: 30, name: 'v₁' }, { data: hV2, hue: 200, name: 'v₂' }], -3, 3, '速度 [m/s]');
}

// 合計と内訳の棒
function bars(x, y, w, title, vals, vmax, signed) {
  noStroke(); fill(0, 0, 75); textSize(14); text(title + '　合計 ' + nf(vals[0] + vals[1], 1, 3), x, y);
  let x0 = signed ? x + w * 0.3 : x, s = (w * 0.7) / vmax;
  let cur = x0;
  vals.forEach((v, i) => { fill(i ? 200 : 30, 70, 100); rect(cur, y + 12, v * s, 22); cur += v * s; });
  fill(0, 0, 60); rect(x0, y + 40, (vals[0] + vals[1]) * s, 10);
  stroke(0, 0, 50); line(x0, y + 8, x0, y + 56);
}

// ---- ニュートンのゆりかご：5 つの振り子、触れたら 1 次元の衝突
function drawCradle() {
  let Lp = height * 0.32, r = height * 0.04, top = height * 0.2, cx = width * 0.25;
  let gL = 9.8 / (Lp / 200);  // g / L（見た目の長さに合わせる）
  for (let sub = 0; sub < 20; sub++) {
    let h = dt / 20;
    for (let b of balls) { b.om += -gL * sin(b.th) * h; b.th += b.om * h; }
    // 隣どうしが重なって近づいていたら衝突（何回か繰り返して伝える）
    for (let it = 0; it < 5; it++) for (let i = 0; i < 4; i++) {
      let A = balls[i], B = balls[i + 1];
      let xa = (i - 2) * 2 * r + Lp * sin(A.th), xb = (i - 1) * 2 * r + Lp * sin(B.th);
      if (xb - xa < 2 * r + 0.5 && A.om * cos(A.th) > B.om * cos(B.th)) {
        let a = { m: 1, v: A.om }, c = { m: 1, v: B.om };
        collide(a, c); A.om = a.v; B.om = c.v;
      }
    }
  }
  stroke(0, 0, 60); strokeWeight(6); line(cx - 4 * r, top, cx + 4 * r, top);
  balls.forEach((b, i) => {
    let ax = cx + (i - 2) * 2 * r, bx = ax + Lp * sin(b.th), by = top + Lp * cos(b.th);
    stroke(0, 0, 70); strokeWeight(1.5); line(ax, top, bx, by);
    noStroke(); fill(45, 20, 90); circle(bx, by, 2 * r);
  });
  let P = balls.reduce((s, b) => s + b.om, 0), K = balls.reduce((s, b) => s + 0.5 * b.om * b.om + gL * (1 - cos(b.th)), 0);
  pushHist(hP, P); pushHist(hK, K);
  drawPlot(width * 0.5, height * 0.2, width * 0.46, height * 0.5, [{ data: hP, hue: 55, name: '角運動量の合計 Σω' }, { data: hK, hue: 320, name: '力学的エネルギー' }], -4, 12, '合計（e < 1 だとだんだん止まる）');
  noStroke(); fill(0, 0, 65); textSize(15);
  text('同じ質量・e = 1 だと「速度の交換」が起き、持ち上げた数と同じ数の玉が反対側から飛び出す', 20, height - 30);
}

function keyPressed() {
  if (key === RIGHT_ARROW) e = min(round((e + 0.1) * 10) / 10, 1);
  if (key === LEFT_ARROW) e = max(round((e - 0.1) * 10) / 10, 0);
  if (key === UP_ARROW) { ratio = min(ratio * 2, 16); restart(); }
  if (key === DOWN_ARROW) { ratio = max(ratio / 2, 1 / 16); restart(); }
  if (key === ' ') restart();
  if (key === 'n' || key === 'N') { cradle = !cradle; hP = []; hK = []; restart(); }
  if (key >= '1' && key <= '4') { lift = int(key); cradle = true; restart(); }
}

// ---------- やってみよう ----------
// 1. e = 1、質量比 1 で衝突。台車 1 がぴたっと止まり、台車 2 が同じ速さで動き出す（速度の交換）
// 2. 質量比 16（重いトラックに軽い車）と 1/16（ピンポン球にボウリング球）で、跳ね返りはどうなる？
// 3. e = 0 にすると 2 台はくっつく。失われた運動エネルギーは何 % ？ 質量比で変わる
// 4. ゆりかごで e = 0.9 にすると？ 本物のゆりかごがだんだん「まとまって」揺れる理由


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : 0);
  if (arr.length > HIST) arr.shift();
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x0, y0, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x0, y0, w, h, 6);
  stroke(0, 0, 30); strokeWeight(1);
  let yz = map(0, lo, hi, y0 + h, y0);
  if (yz > y0 && yz < y0 + h) line(x0, yz, x0 + w, yz);
  for (let s of series) {
    stroke(s.hue, 70, 100); strokeWeight(2); noFill();
    beginShape();
    for (let i = 0, off = HIST - s.data.length; i < s.data.length; i++) vertex(map(i + off, 0, HIST - 1, x0, x0 + w), map(constrain(s.data[i], lo, hi), lo, hi, y0 + h, y0));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x0 + 8, y0 + 6);
  let lx = x0 + w - 8; textAlign(RIGHT, TOP);
  for (let s of series) { fill(s.hue, 70, 100); text(s.name, lx, y0 + 6); lx -= textWidth(s.name) + 14; }
  textAlign(LEFT, BASELINE);
}
