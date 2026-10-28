// ============================================
// 07 ばねと連成振動・基準モード
// ばねでつながったおもりは、ふつうは複雑に揺れる。でも「基準モード」の形で揺らすと、全員が同じ周期で揺れ続ける
//   どんな揺れも基準モードの足し算。1 個だけ揺らすとエネルギーが隣へ行ったり来たり（うなり）
// ←→ = おもりの数（2〜5）/ 1〜5 = 基準モードで揺らす / B = 1 個目だけ揺らす / W = 弱い結合 / ドラッグ = おもりを引っぱる
// ============================================

let N = 2;                 // ★ おもりの数
let kWall = 10;            // ★ 壁とつなぐばね [N/m]
let kc = 10;               // ★ おもりどうしのばね（W で弱くなる）
let weak = false;
let m = 1;                 // ★ おもりの質量 [kg]
let x = [], v = [];
let modes = [], omegas = [];
let HIST = 600, hx = [], hE = [];
let grab = -1;
let HUES = [30, 200, 130, 320, 55];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  rebuild();
  excite(1);
}

// 剛性行列 K（N×N）をつくり、固有ベクトル = 基準モードの形、固有値 = ω² を求める
function rebuild() {
  kc = weak ? 1.5 : kWall;
  let K = [];
  for (let i = 0; i < N; i++) {
    K.push(new Array(N).fill(0));
    K[i][i] = (i === 0 ? kWall : kc) + (i === N - 1 ? kWall : kc);
    if (i > 0) K[i][i - 1] = -kc;
    if (i < N - 1) K[i][i + 1] = -kc;
  }
  let res = jacobiEigen(K.map((r) => r.map((q) => q / m)));
  let idx = res.vals.map((val, i) => i).sort((a, b) => res.vals[a] - res.vals[b]);
  omegas = idx.map((i) => sqrt(max(res.vals[i], 0)));
  modes = idx.map((i) => res.vecs.map((r) => r[i]));
  x = new Array(N).fill(0); v = new Array(N).fill(0);
  hx = []; hE = [];
  for (let i = 0; i < N; i++) { hx.push([]); hE.push([]); }
}

function excite(n) {
  if (n > N) return;
  let shape = modes[n - 1], s = 0.6 / max(...shape.map(abs));
  for (let i = 0; i < N; i++) { x[i] = shape[i] * s; v[i] = 0; }
}

function forces(xx) {
  let a = [];
  for (let i = 0; i < N; i++) {
    let left = i === 0 ? -kWall * xx[0] : -kc * (xx[i] - xx[i - 1]);
    let right = i === N - 1 ? -kWall * xx[i] : -kc * (xx[i] - xx[i + 1]);
    a.push((left + right) / m);
  }
  return a;
}

function draw() {
  background(190, 30, 10);
  // ★ 速度ベルレ法（エネルギーがずれにくい）で 10 回に分けて進める
  let sub = 10, h = 1 / 60 / sub;
  for (let s = 0; s < sub; s++) {
    let a = forces(x);
    for (let i = 0; i < N; i++) { v[i] += a[i] * h / 2; if (i !== grab) x[i] += v[i] * h; }
    let a2 = forces(x);
    for (let i = 0; i < N; i++) { v[i] += a2[i] * h / 2; if (i === grab) v[i] = 0; x[i] = constrain(x[i], -1.5, 1.5); }
  }
  let spacing = width * 0.44 / (N + 1), y0 = height * 0.36, wallL = width * 0.03, sc = spacing * 0.5;
  if (grab >= 0) x[grab] = constrain((mouseX - (wallL + spacing * (grab + 1))) / sc, -1.2, 1.2);
  for (let i = 0; i < N; i++) {
    pushHist(hx[i], x[i]);
    pushHist(hE[i], 0.5 * m * v[i] * v[i] + 0.25 * kWall * x[i] * x[i]);  // おもりのエネルギーの目安
  }

  // ---- 壁・ばね・おもり
  let wallR = wallL + spacing * (N + 1);
  stroke(0, 0, 50); strokeWeight(6); line(wallL, y0 - 60, wallL, y0 + 60); line(wallR, y0 - 60, wallR, y0 + 60);
  let pos = [wallL];
  for (let i = 0; i < N; i++) pos.push(wallL + spacing * (i + 1) + x[i] * sc);
  pos.push(wallR);
  for (let i = 0; i <= N; i++) spring(pos[i] + (i ? 22 : 0), pos[i + 1] - (i < N ? 22 : 0), y0, (i === 0 || i === N) ? 1 : (weak ? 0.4 : 1));
  for (let i = 0; i < N; i++) {
    noStroke(); fill(HUES[i], 70, 100); rect(pos[i + 1] - 22, y0 - 22, 44, 44, 6);
    fill(0, 0, 10); textSize(14); textAlign(CENTER, CENTER); text(i + 1, pos[i + 1], y0); textAlign(LEFT, BASELINE);
  }

  // ---- 基準モードの形と、いまの揺れに含まれる量（モードへの射影）
  let by = height * 0.58;
  noStroke(); fill(0, 0, 80); textSize(15); text('基準モード（キー 1〜' + N + '）と、いまの揺れに含まれる大きさ', wallL, by - 14);
  for (let n = 0; n < N; n++) {
    let bx = wallL + n * (width * 0.44 / N), bw = width * 0.44 / N - 12;
    noStroke(); fill(0, 0, 14); rect(bx, by, bw, 150, 6);
    stroke(0, 0, 40); line(bx + 8, by + 50, bx + bw - 8, by + 50);
    for (let i = 0; i < N; i++) { let qx = map(i, -1, N, bx, bx + bw); noStroke(); fill(HUES[i], 70, 100); circle(qx, by + 50 - modes[n][i] * 60, 12); stroke(HUES[i], 40, 80); line(qx, by + 50, qx, by + 50 - modes[n][i] * 60); }
    // 射影：q = Σ mode·x、q' = Σ mode·v → 振幅 √(q² + (q'/ω)²)
    let q = 0, qd = 0;
    for (let i = 0; i < N; i++) { q += modes[n][i] * x[i]; qd += modes[n][i] * v[i]; }
    let A = sqrt(q * q + (qd / omegas[n]) ** 2);
    noStroke(); fill(55, 90, 100); rect(bx + 8, by + 110, constrain(A, 0, 1.2) / 1.2 * (bw - 16), 12, 3);
    fill(0, 0, 80); textSize(12); text('モード ' + (n + 1) + '　ω = ' + nf(omegas[n], 1, 2) + '　T = ' + nf(TWO_PI / omegas[n], 1, 2) + ' s', bx + 8, by + 100);
  }

  // ---- 右：変位とエネルギーのグラフ
  let gx = width * 0.5, gw = width * 0.46;
  drawPlot(gx, height * 0.12, gw, height * 0.38, hx.map((d, i) => ({ data: d, hue: HUES[i], name: 'x' + (i + 1) })), -1.3, 1.3, '変位 x(t)');
  drawPlot(gx, height * 0.54, gw, height * 0.36, hE.map((d, i) => ({ data: d, hue: HUES[i], name: 'E' + (i + 1) })), 0, 0.5 * m * (omegas[N - 1] * 0.8) ** 2, 'おもりごとのエネルギーの目安（行ったり来たり = うなり）');

  noStroke(); fill(0, 0, 100); textSize(18);
  text('おもり ' + N + ' 個（←→）　1〜' + N + '：基準モード　B：1 個目だけ　W：結合 ' + (weak ? '弱い' : 'ふつう') + '　ドラッグ：引っぱる', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('m x\'\' = −K x の固有ベクトル = 基準モード。ω はモードごとに違う → 混ざると揺れが複雑に見える。W + B で 2 つの近い ω が重なって「うなり」', 20, 68);
}

function mousePressed() {
  let spacing = width * 0.44 / (N + 1), y0 = height * 0.36, wallL = width * 0.03, sc = spacing * 0.5;
  for (let i = 0; i < N; i++) if (abs(mouseX - (wallL + spacing * (i + 1) + x[i] * sc)) < 26 && abs(mouseY - y0) < 30) grab = i;
}
function mouseReleased() { grab = -1; }
function keyPressed() {
  if (key === RIGHT_ARROW) { N = min(N + 1, 5); rebuild(); excite(1); }
  if (key === LEFT_ARROW) { N = max(N - 1, 2); rebuild(); excite(1); }
  if (key >= '1' && key <= '5') excite(int(key));
  if (key === 'b' || key === 'B') { x.fill(0); v.fill(0); x[0] = 0.8; }
  if (key === 'w' || key === 'W') { weak = !weak; rebuild(); x[0] = 0.8; }
}

// ---------- やってみよう ----------
// 1. おもり 2 個でモード 1（同じ向き）とモード 2（逆向き）。周期の比は？ ω₂/ω₁ = √3 になる
// 2. W（弱い結合）で B。エネルギーが 1 → 2 → 1 と移る。行き来する周期 = 2π / (ω₂ − ω₁)
// 3. おもり 5 個でモード 1〜5。モード番号が上がるほど「節」（動かない点）が増える → 弦の倍音と同じ（13 へ）
// 4. 自分でドラッグして揺らす。どんな揺れも黄色い棒（モードの大きさ）は時間がたっても変わらない


// ==================================================
// ここから下は「道具」：ヤコビ法（対称行列の固有値）・ばねの絵・グラフ
// ==================================================
function jacobiEigen(A0) {
  let n = A0.length, A = A0.map((r) => r.slice()), V = [];
  for (let i = 0; i < n; i++) { V.push(new Array(n).fill(0)); V[i][i] = 1; }
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-14) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-12) continue;
      let th2 = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      let t = Math.sign(th2 || 1) / (Math.abs(th2) + Math.sqrt(th2 * th2 + 1));
      let c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { let akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { let apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { let vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  // 向きをそろえる（いちばん大きい成分を正に）
  for (let j = 0; j < n; j++) { let s = 0; for (let i = 0; i < n; i++) s += V[i][j]; if (s < -1e-9) for (let i = 0; i < n; i++) V[i][j] *= -1; }
  return { vals: A.map((r, i) => r[i]), vecs: V };
}
function spring(xa, xb, y, thick) {
  stroke(0, 0, 75); strokeWeight(1.5 + thick); noFill();
  beginShape(); vertex(xa, y);
  for (let j = 1; j < 12; j++) vertex(lerp(xa, xb, j / 12), y + (j % 2 ? -10 : 10));
  vertex(xb, y); endShape();
}
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : 0);
  if (arr.length > HIST) arr.shift();
}
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
