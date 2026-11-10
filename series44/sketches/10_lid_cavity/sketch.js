// ============================================
// 10 キャビティ流れ（ふたが動く箱）
// 正方形の箱の「ふた」だけが横に動く。粘性でひきずられて、中に大きな渦が 1 つできる
// 計算流体力学（CFD）のプログラムを作ったら、まずこの問題で答え合わせをする定番の問題
// ナヴィエ・ストークス方程式を「渦度 ω と流れ関数 ψ」の形で解く（圧力を消去できる）：
//   ∂ω/∂t + u ∂ω/∂x + v ∂ω/∂y = ν∇²ω　　∇²ψ = −ω　　u = ∂ψ/∂y,  v = −∂ψ/∂x
// 上下キー = レイノルズ数 Re / 左右キー = ふたの向き / V = 表示 / R = やり直し
// ============================================

let Re = 400; // ★ レイノルズ数 Re = U L / ν（ふたの速さ U = 1、箱の一辺 L = 1）
let lid = 1; // ふたの速さ（+1 = 右へ、−1 = 左へ）
let N = 64; // ★ 格子の分割数（64 → 65 × 65 点）
let subSteps = 16; // ★ 1 フレームに進める回数
let viewNo = 0; // 0 = 渦度, 1 = 速さ
let M, h, psi, om, om2, img, t = 0, dots = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  M = N + 1; h = 1 / N;
  img = createImage(M, M);
  for (let i = 0; i < 350; i++) dots.push({ x: Math.random(), y: Math.random() });
  restart();
}

function restart() {
  psi = new Float32Array(M * M); om = new Float32Array(M * M); om2 = new Float32Array(M * M);
  t = 0;
}

// j = 0 が底、j = N がふた
function stepFluid() {
  let nu = 1 / Re;
  let dt = Math.min(0.2 * h * h / nu, 0.4 * h); // 陽解法がこわれない刻み（粘性の条件と、移流の条件）
  // ① ∇²ψ = −ω を反復で解く（SOR 法）。壁では ψ = 0（壁を通りぬけない）
  for (let it = 0; it < 12; it++)
    for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) {
      let k = i + j * M;
      psi[k] += 1.7 * (0.25 * (psi[k - 1] + psi[k + 1] + psi[k - M] + psi[k + M] + h * h * om[k]) - psi[k]);
    }
  // ② 壁の渦度：壁のすぐ内側の ψ から決まる（すべりなし条件。ふたは速さ lid で動く）
  for (let i = 0; i <= N; i++) {
    om[i] = -2 * psi[i + M] / (h * h); // 底
    om[i + N * M] = -2 * psi[i + (N - 1) * M] / (h * h) - 2 * lid / h; // ふた
    om[i * M] = -2 * psi[1 + i * M] / (h * h); // 左
    om[N + i * M] = -2 * psi[N - 1 + i * M] / (h * h); // 右
  }
  // ③ 渦度を運んで（移流）、広げる（粘性）
  for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) {
    let k = i + j * M;
    let u = (psi[k + M] - psi[k - M]) / (2 * h), v = -(psi[k + 1] - psi[k - 1]) / (2 * h);
    let wx = u > 0 ? om[k] - om[k - 1] : om[k + 1] - om[k]; // 風上差分（流れてくる側の値を使う）
    let wy = v > 0 ? om[k] - om[k - M] : om[k + M] - om[k];
    let lap = om[k - 1] + om[k + 1] + om[k - M] + om[k + M] - 4 * om[k];
    om2[k] = constrain(om[k] + dt * (-(u * wx + v * wy) / h + nu * lap / (h * h)), -500, 500);
  }
  for (let j = 1; j < N; j++) for (let i = 1; i < N; i++) om[i + j * M] = om2[i + j * M];
  t += dt;
  return dt;
}

// 場所 (x, y)（0〜1）での速度（まわり 4 点から補間）
function velocityAt(x, y) {
  let i = constrain(Math.floor(x * N), 1, N - 2), j = constrain(Math.floor(y * N), 1, N - 2), k = i + j * M;
  return [(psi[k + M] - psi[k - M]) / (2 * h), -(psi[k + 1] - psi[k - 1]) / (2 * h)];
}

function draw() {
  background(215, 60, 10);
  let dtSum = 0;
  for (let s = 0; s < subSteps; s++) dtSum += stepFluid();

  let side = Math.min(width * 0.52, height * 0.74), bx = width * 0.06, by = height * 0.18;
  let X = (i, j) => bx + i / N * side, Y = (i, j) => by + side - j / N * side;

  // ---- 色（渦度 または 速さ）
  img.loadPixels();
  let px = img.pixels;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    let k = i + j * M, q = (i + (N - j) * M) * 4, r, g, b;
    if (viewNo === 0) {
      let s = om[k] / 6, a = Math.min(Math.abs(s), 1);
      r = 8 + (s > 0 ? 247 : 20) * a; g = 16 + (s > 0 ? 110 : 200) * a; b = 34 + (s > 0 ? 70 : 221) * a;
    } else {
      let w = (i > 0 && i < N && j > 0 && j < N) ? velocityAt(i / N, j / N) : [j === N ? lid : 0, 0], sp = Math.min(Math.hypot(w[0], w[1]) * 1.6, 1);
      r = 8 + 240 * sp * sp; g = 16 + 220 * sp; b = 60 + 150 * sp;
    }
    px[q] = r; px[q + 1] = g; px[q + 2] = b; px[q + 3] = 255;
  }
  img.updatePixels();
  image(img, bx, by, side, side);

  // ---- 流線（ψ の等高線）。すみの小さな逆回りの渦は、細かい間かくで別に描く
  let f = new Float32Array(M * M), f2 = new Float32Array(M * M), best = 0, bi = 0, bj = 0;
  for (let k = 0; k < M * M; k++) {
    f[k] = psi[k] / 0.01; f2[k] = Math.max(psi[k] * lid, 0) / 0.0002; // 大きな渦は ψ × lid < 0、すみの渦は > 0
    if (-psi[k] * lid > best) { best = -psi[k] * lid; bi = k % M; bj = Math.floor(k / M); }
  }
  let pen = { line: (a, b, c, d) => line(a, b, c, d) };
  stroke(0, 0, 100, 60); strokeWeight(1.2); contourLines(pen, f, M, M, X, Y, 0);
  stroke(42, 80, 100, 80); contourLines(pen, f2, M, M, X, Y, 0);

  // ---- 粒
  noStroke(); fill(0, 0, 100, 75);
  for (let q of dots) {
    let w = velocityAt(q.x, q.y);
    q.x += w[0] * dtSum; q.y += w[1] * dtSum;
    if (q.x < 0.005 || q.x > 0.995 || q.y < 0.005 || q.y > 0.995 || Math.random() < 0.003) { q.x = Math.random(); q.y = Math.random(); }
    circle(bx + q.x * side, by + side - q.y * side, 3);
  }
  // ---- 箱とふた
  noFill(); stroke(42, 40, 85); strokeWeight(4);
  line(bx, by, bx, by + side); line(bx, by + side, bx + side, by + side); line(bx + side, by + side, bx + side, by);
  stroke(12, 70, 100); strokeWeight(6); line(bx, by - 3, bx + side, by - 3);
  let ax = bx + side / 2 + lid * 60; strokeWeight(3);
  line(bx + side / 2 - lid * 60, by - 20, ax, by - 20); line(ax, by - 20, ax - lid * 10, by - 27); line(ax, by - 20, ax - lid * 10, by - 13);
  noStroke(); fill(42, 90, 100); circle(X(bi, bj), Y(bi, bj), 10);

  // ---- 右：まん中の縦線での横向きの速さ u(y)（論文の表とくらべる定番のグラフ）
  let gx = width * 0.66, gw = width * 0.28, mid = gx + gw / 2;
  stroke(0, 0, 40); strokeWeight(1); line(mid, by, mid, by + side); line(gx, by, gx + gw, by); line(gx, by + side, gx + gw, by + side);
  stroke(185, 70, 100); strokeWeight(3); noFill();
  beginShape();
  for (let j = 0; j <= N; j++) { let u = j === 0 ? 0 : j === N ? lid : (psi[N / 2 + (j + 1) * M] - psi[N / 2 + (j - 1) * M]) / (2 * h); vertex(mid + u * gw / 2, Y(0, j)); }
  endShape();
  noStroke(); fill(185, 70, 100); textSize(14);
  text('まん中の縦線での u(y)', gx, by - 10);
  fill(0, 0, 65);
  text('大きな渦の中心（黄 ●）：x = ' + nf(bi / N, 1, 3) + ', y = ' + nf(bj / N, 1, 3) + '　　流れ関数の最小値 ' + nf(-best, 1, 4), width * 0.06, by + side + 52);
  text('答え合わせ（Ghia ら 1982、ふたが右向き）：Re 100 → (0.617, 0.734)　Re 400 → (0.554, 0.605)　Re 1000 → (0.531, 0.563)', width * 0.06, by + side + 28);

  fill(0, 0, 100); textSize(18);
  text('キャビティ流れ　Re = ' + nf(Re, 1, 0) + '（上下キー）　ふたの向き（左右キー）　表示：' + (viewNo ? '速さ' : '渦度') + '（V）　R = やり直し　時刻 t = ' + nf(t, 1, 1), 20, 40);
  fill(0, 0, 80); textSize(15);
  text('ナヴィエ・ストークス方程式（渦度の形）　∂ω/∂t + (u·∇)ω = ν∇²ω ,　∇²ψ = −ω　　白 = 流線、黄 = すみの逆回りの渦（100 倍に拡大）', 20, 68);
}

function keyPressed() {
  if (key === UP_ARROW) Re = Math.min(Re * 1.5, 3000);
  if (key === DOWN_ARROW) Re = Math.max(Re / 1.5, 10);
  if (key === RIGHT_ARROW) lid = 1;
  if (key === LEFT_ARROW) lid = -1;
  if (key === '1') Re = 100;
  if (key === '2') Re = 400;
  if (key === '3') Re = 1000;
  if (key === 'v' || key === 'V') viewNo = 1 - viewNo;
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. 1・2・3 で Re = 100・400・1000。渦の中心（黄 ●）は Re が上がるとどこへ動く？ 論文の値と比べよう
// 2. 右下・左下のすみにできる黄色の小さな渦（モファット渦）は、Re でどう育つ？
// 3. Re = 10 にする。流れは左右ほぼ対称（ストークス流れ）。なぜ対称になる？
// 4. 左右キーでふたを逆向きに。渦が入れかわるまで何秒かかる？ Re で変わる？
// 5. N を 32 や 96 にして、渦の中心の位置がどう変わるか調べる（格子を細かくすると論文の値に近づく）


// ==================================================
// ここから下は「等高線を描く道具」です
// ==================================================
// 等高線を引く（マーチングスクエア法）：nx × ny の格子の値 f が「整数」になる所を線で結ぶ
// X(i, j), Y(i, j) = 格子点の画面座標。wrap > 0 なら、値が wrap だけ飛ぶ「切れ目」をまたいでつなぐ
function contourLines(g, f, nx, ny, X, Y, wrap) {
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let c = [f[i + j * nx], f[i + 1 + j * nx], f[i + 1 + (j + 1) * nx], f[i + (j + 1) * nx]];
    if (wrap) for (let k = 1; k < 4; k++) c[k] -= wrap * Math.round((c[k] - c[0]) / wrap);
    let lo = Math.min(c[0], c[1], c[2], c[3]), hi = Math.max(c[0], c[1], c[2], c[3]);
    if (!(hi - lo < 5)) continue; // 特異点のすぐそば（値が急変）は描かない
    let px = [X(i, j), X(i + 1, j), X(i + 1, j + 1), X(i, j + 1)], py = [Y(i, j), Y(i + 1, j), Y(i + 1, j + 1), Y(i, j + 1)];
    for (let L = Math.ceil(lo); L <= hi; L++) {
      let q = [];
      for (let k = 0; k < 4; k++) {
        let a = c[k], b = c[(k + 1) % 4];
        if ((a < L) !== (b < L)) { let s = (L - a) / (b - a); q.push(px[k] + s * (px[(k + 1) % 4] - px[k]), py[k] + s * (py[(k + 1) % 4] - py[k])); }
      }
      if (q.length >= 4) g.line(q[0], q[1], q[2], q[3]);
      if (q.length === 8) g.line(q[4], q[5], q[6], q[7]);
    }
  }
}
