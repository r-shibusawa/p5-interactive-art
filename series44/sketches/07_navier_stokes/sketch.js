// ============================================
// 07 ナヴィエ・ストークス方程式を解く
// 水や空気の動きを決める式（非圧縮性の流体）：
//
//   ∂u/∂t = −(u·∇)u − (1/ρ)∇p + ν∇²u + f　　　∇·u = 0
//            └ 移流 ┘  └ 圧力 ┘  └粘性┘  └外力
//
//   移流：流れが自分自身（速度）を運ぶ。うずが流されるのはこの項のはたらき
//   圧力：流体がつぶれない（∇·u = 0）ように、押し返す
//   粘性：速さの差をならす（06 の拡散と同じ）
//   外力：かき混ぜる力、重力など
// 格子の上で、1 フレームごとに「① 外力 → ② 粘性（拡散）→ ③ 移流 → ④ 圧力（射影）」の順に解く
// （Jos Stam の Stable Fluids という方法。どんな Δt でも発散しない）
// ドラッグ = かき混ぜる / 1〜4 = 各ステップを ON/OFF / V = 表示切替 / A = 矢印
// 上下キー = 粘性 ν / 左右キー = 時間刻み Δt / F = ファン / R = やり直し
// ============================================

let nu = 0.02; // ★ 動粘性係数 ν（大きいほどねばっこい）
let dt = 1.0; // ★ 時間刻み Δt
let forceGain = 0.5; // ★ マウスで押す強さ
let fanPower = 0.12; // ★ ファン（左から吹く外力）の強さ
let fade = 0.997; // ★ 染料がうすくなる速さ（1 = 消えない）
let NX = 128, NY; // ★ 格子の数（横。縦は画面の形に合わせる）
let on = [true, true, true, true]; // ① 外力 ② 粘性 ③ 移流 ④ 圧力
let viewNo = 0, showArrows = true, fan = true;
let viewNames = ['染料', '渦度 ω = ∇×u', '圧力 p', '発散 ∇·u（0 なら非圧縮）'];

let W2, u, v, u0, v0, p, dvg, dye, dye0, img;
let divBefore = 0, divAfter = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  NY = Math.max(16, Math.round(NX * height / width));
  W2 = NX + 2;
  img = createImage(NX, NY);
  restart();
}

function restart() {
  let n = W2 * (NY + 2);
  u = new Float32Array(n); v = new Float32Array(n); u0 = new Float32Array(n); v0 = new Float32Array(n);
  p = new Float32Array(n); dvg = new Float32Array(n); dye = new Float32Array(n); dye0 = new Float32Array(n);
}

function IX(i, j) { return i + W2 * j; }

// ===== ナヴィエ・ストークス方程式を 1 歩（Δt）進める =====
function stepFluid() {
  // ① 外力 f：u ← u + Δt f
  if (on[0]) addForces();

  // ② 粘性 ν∇²u：速度を「拡散」させる（06 と同じ式を、こわれない陰解法で解く）
  if (on[1] && nu > 0) {
    u0.set(u); v0.set(v);
    diffuse(1, u, u0, nu); diffuse(2, v, v0, nu);
  }

  // ③ 移流 −(u·∇)u：速度を、速度自身で運ぶ
  if (on[2]) {
    u0.set(u); v0.set(v);
    advect(1, u, u0, u0, v0); advect(2, v, v0, u0, v0);
  }

  // ④ 圧力 −∇p：∇·u = 0 になるような p を求めて、そのこう配を引く
  divBefore = maxDivergence();
  if (on[3]) project();
  divAfter = maxDivergence();

  // 染料（流れを見るための色）は速度に運ばれるだけ
  dye0.set(dye);
  advect(0, dye, dye0, u, v);
  for (let k = 0; k < dye.length; k++) {
    dye[k] *= fade;
    if (!(Math.abs(u[k]) < 30)) u[k] = constrain(u[k] || 0, -30, 30); // 念のための安全装置
    if (!(Math.abs(v[k]) < 30)) v[k] = constrain(v[k] || 0, -30, 30);
  }
}

// ① 外力：マウスのドラッグと、左のファン
function addForces() {
  if (mouseIsPressed) {
    let fx = (mouseX - pmouseX) / width * NX * forceGain, fy = (mouseY - pmouseY) / height * NY * forceGain;
    splat(mouseX / width * NX + 1, mouseY / height * NY + 1, constrain(fx, -4, 4), constrain(fy, -4, 4), 1.0, 4);
  }
  if (fan) {
    let a = 0.5 * Math.sin(frameCount * 0.012); // ゆっくり首をふる
    splat(NX * 0.12, NY * 0.5 + 1, fanPower * Math.cos(a) * dt, fanPower * Math.sin(a) * dt, 0.12, 3);
  }
}
// 場所 (ci, cj) のまわり半径 r に、速度 (fx, fy) と染料 amount を足す
function splat(ci, cj, fx, fy, amount, r) {
  for (let j = Math.max(1, Math.floor(cj - 2 * r)); j <= Math.min(NY, cj + 2 * r); j++)
    for (let i = Math.max(1, Math.floor(ci - 2 * r)); i <= Math.min(NX, ci + 2 * r); i++) {
      let w = Math.exp(-((i - ci) * (i - ci) + (j - cj) * (j - cj)) / (r * r)), n = IX(i, j);
      u[n] += fx * w; v[n] += fy * w; dye[n] = Math.min(dye[n] + amount * w, 3);
    }
}

// ② 拡散：(1 − νΔt∇²) x = x0 を解く（未来の値どうしで平均するので、ν が大きくても安定）
function diffuse(b, x, x0, k) {
  let a = dt * k;
  linSolve(b, x, x0, a, 1 + 4 * a, 12);
}

// ③ 移流：各マスで「Δt 前にここへ来たはずの場所」へさかのぼり、そこの値をもらう（セミ・ラグランジュ法）
function advect(b, d, d0, uu, vv) {
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    let x = constrain(i - dt * uu[n], 0.5, NX + 0.5), y = constrain(j - dt * vv[n], 0.5, NY + 0.5);
    let i0 = Math.floor(x), j0 = Math.floor(y), s = x - i0, t = y - j0, m = IX(i0, j0);
    d[n] = (1 - s) * ((1 - t) * d0[m] + t * d0[m + W2]) + s * ((1 - t) * d0[m + 1] + t * d0[m + 1 + W2]);
  }
  setBnd(b, d);
}

// ④ 射影：∇²p = ∇·u を解き、u ← u − ∇p。これで ∇·u = 0（入った分だけ出ていく）になる
function project() {
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    dvg[n] = -0.5 * (u[n + 1] - u[n - 1] + v[n + W2] - v[n - W2]);
  }
  setBnd(0, dvg);
  linSolve(0, p, dvg, 1, 4, 30); // 前のフレームの p を初期値にして反復
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j);
    u[n] -= 0.5 * (p[n + 1] - p[n - 1]);
    v[n] -= 0.5 * (p[n + W2] - p[n - W2]);
  }
  setBnd(1, u); setBnd(2, v);
}

function maxDivergence() {
  let big = 0;
  for (let j = 2; j < NY; j++) for (let i = 2; i < NX; i++) {
    let n = IX(i, j), d = Math.abs(0.5 * (u[n + 1] - u[n - 1] + v[n + W2] - v[n - W2]));
    if (d > big) big = d;
  }
  return big;
}

function draw() {
  stepFluid();
  render();
  image(img, 0, 0, width, height);

  // 速度の矢印
  if (showArrows) {
    stroke(0, 0, 100, 45); strokeWeight(1);
    let cw = width / NX, ch = height / NY;
    for (let j = 4; j <= NY; j += 6) for (let i = 4; i <= NX; i += 6) {
      let n = IX(i, j), x = (i - 0.5) * cw, y = (j - 0.5) * ch;
      line(x, y, x + constrain(u[n] * 14, -30, 30), y + constrain(v[n] * 14, -30, 30));
    }
  }
  drawHud();
}

// 式を、項ごとに色分けして書く（OFF の項は暗くする）
function drawHud() {
  noStroke(); fill(215, 60, 8, 78); rect(0, 0, width, 128);
  let terms = [['−(u·∇)u', 2, 185], ['− ∇p/ρ', 3, 12], ['+ ν∇²u', 1, 42], ['+ f', 0, 130]];
  let names = ['① 外力', '② 粘性', '③ 移流', '④ 圧力'];
  fill(0, 0, 100); textSize(24);
  text('∂u/∂t  =', 20, 42);
  for (let k = 0; k < 4; k++) {
    let q = terms[k], x = 150 + k * 150;
    fill(q[2], 60, on[q[1]] ? 100 : 35);
    textSize(24); text(q[0], x, 42);
    textSize(13); text(names[q[1]] + (on[q[1]] ? ' ON' : ' OFF') + '（' + (q[1] + 1) + ' キー）', x, 64);
  }
  fill(12, 60, on[3] ? 100 : 35); textSize(24);
  text('∇·u = 0', 780, 42);
  fill(0, 0, 100); textSize(16);
  text('ナヴィエ・ストークス方程式　ν = ' + nf(nu, 1, 3) + '（上下キー）　Δt = ' + nf(dt, 1, 2) + '（左右キー）　表示：' + viewNames[viewNo] + '（V）', 20, 94);
  fill(0, 0, 70); textSize(14);
  text('発散の最大値 |∇·u|：圧力のステップの前 ' + nf(divBefore, 1, 4) + ' → 後 ' + nf(divAfter, 1, 4) + '　　ドラッグ = かき混ぜる　F = ファン　A = 矢印　R = やり直し', 20, 116);
}

function keyPressed() {
  if (key >= '1' && key <= '4') on[Number(key) - 1] = !on[Number(key) - 1];
  if (key === 'v' || key === 'V') viewNo = (viewNo + 1) % 4;
  if (key === 'a' || key === 'A') showArrows = !showArrows;
  if (key === 'f' || key === 'F') fan = !fan;
  if (key === UP_ARROW) nu = Math.min(nu === 0 ? 0.005 : nu * 2, 2.56);
  if (key === DOWN_ARROW) nu = nu <= 0.005 ? 0 : nu / 2;
  if (key === RIGHT_ARROW) dt = Math.min(dt * 1.25, 4);
  if (key === LEFT_ARROW) dt = Math.max(dt / 1.25, 0.2);
  if (key === 'r' || key === 'R') restart();
}

// ---------- やってみよう ----------
// 1. ドラッグしてうずを作る。V で渦度に切り替えると、うずが赤（反時計回り）と青のペアで生まれるのが見える
// 2. 4 を押して圧力を OFF。V で「発散」を見ると、流体がたまる所・うすくなる所ができる（つぶれる流体）
// 3. 3 を押して移流を OFF。うずが動かなくなり、ただ広がって消える（ストークス流れ ＝ とてもねばい流れ）
// 4. ν を 0 → 0.64 と変える。水 → はちみつ。うずの寿命はどう変わる？
// 5. Δt を 4 にしてもこわれない（無条件安定）。でも動きはぼやける。なぜ？（さかのぼる距離が長い）
// 6. addForces に浮力を足そう：染料のある所を上へ押す　v[n] -= 0.02 * dye[n]


// ==================================================
// ここから下は「解くための道具」と「色をつける道具」です
// ==================================================
// 連立方程式を反復で解く（ガウス・ザイデル法）：x = (x0 + a × まわり 4 マスの合計) / c をくり返す
function linSolve(b, x, x0, a, c, iters) {
  let ic = 1 / c;
  for (let k = 0; k < iters; k++) {
    for (let j = 1; j <= NY; j++) {
      let r = j * W2;
      for (let i = 1; i <= NX; i++) { let n = r + i; x[n] = (x0[n] + a * (x[n - 1] + x[n + 1] + x[n - W2] + x[n + W2])) * ic; }
    }
    setBnd(b, x);
  }
}
// 境界条件：壁は通りぬけない。b = 1 は u（左右の壁で反転）、b = 2 は v（上下の壁で反転）、0 はとなりをコピー
function setBnd(b, x) {
  for (let i = 1; i <= NX; i++) {
    x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
    x[IX(i, NY + 1)] = b === 2 ? -x[IX(i, NY)] : x[IX(i, NY)];
  }
  for (let j = 0; j <= NY + 1; j++) {
    x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)];
    x[IX(NX + 1, j)] = b === 1 ? -x[IX(NX, j)] : x[IX(NX, j)];
  }
}
// 格子の値を色にして画像に書きこむ
function render() {
  img.loadPixels();
  let px = img.pixels;
  for (let j = 1; j <= NY; j++) for (let i = 1; i <= NX; i++) {
    let n = IX(i, j), k = ((i - 1) + (j - 1) * NX) * 4, r, g, b;
    if (viewNo === 0) { // 染料：紺 → 水色 → 白
      let d = Math.min(dye[n], 1.6);
      r = 8 + 150 * d * d * 0.6; g = 16 + 190 * d; b = 34 + 220 * d;
    } else { // 正 = 赤（さんご色）、負 = 青（水色）
      let s = viewNo === 1 ? 0.5 * (v[n + 1] - v[n - 1] - u[n + W2] + u[n - W2]) * 6
        : viewNo === 2 ? p[n] * 1.5 : -0.5 * (u[n + 1] - u[n - 1] + v[n + W2] - v[n - W2]) * 12;
      let a = Math.min(Math.abs(s), 1);
      if (viewNo === 1) s = -s; // 画面は y が下向きなので、反時計回りを赤にする
      r = 8 + (s > 0 ? 247 : 20) * a; g = 16 + (s > 0 ? 110 : 200) * a; b = 34 + (s > 0 ? 70 : 221) * a;
    }
    px[k] = r; px[k + 1] = g; px[k + 2] = b; px[k + 3] = 255;
  }
  img.updatePixels();
}
