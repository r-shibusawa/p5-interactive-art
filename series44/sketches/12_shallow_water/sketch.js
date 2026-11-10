// ============================================
// 12 浅水波 ─ 水面を伝わる波
// 水深にくらべて波長が長い波（津波、浴そうの波、池の波紋の大きなもの）は「浅水方程式」にしたがう
//   ∂η/∂t = −∂(H u)/∂x − ∂(H v)/∂y　　（水が集まると水面 η が上がる ＝ 連続の式）
//   ∂u/∂t = −g ∂η/∂x,　∂v/∂t = −g ∂η/∂y　（水面のかたむきが水を押す ＝ 運動方程式）
// 波の速さは c = √(g H)。深いほど速い（津波は深さ 4000 m で時速 700 km、岸で遅くなり高くなる）
// クリック・ドラッグ = 水滴 / W = 道具（水滴・壁を描く・壁を消す）/ 1〜4 = 場面 / P = 造波機
// 上下キー = 水深 H / R = 水面を静める
// ============================================

let grav = 1.0; // ★ 重力加速度 g
let depth0 = 1.0; // ★ 水深 H（上下キー。波の速さ c = √(gH)）
let damp = 0.002; // ★ 波が弱まる速さ
let dropSize = 3; // ★ 水滴の大きさ [マス]
let dt = 0.5, subSteps = 2;
let NX = 160, NY;
let eta, uu, vv, wall, depth, img;
let tool = 0, scene = 1, maker = false, t = 0;
let toolNames = ['水滴を落とす', '壁を描く', '壁を消す'];
let sceneNames = ['', '1 何もないプール', '2 すき間 1 つ（回折）', '3 すき間 2 つ（干渉）', '4 浅瀬のレンズ（屈折）'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  NY = Math.max(20, Math.round(NX * height / width));
  img = createImage(NX, NY);
  setScene(1);
}

function calm() {
  eta = new Float32Array(NX * NY); uu = new Float32Array((NX + 1) * NY); vv = new Float32Array(NX * (NY + 1));
}

function setScene(n) {
  scene = n; calm();
  wall = new Uint8Array(NX * NY); depth = new Float32Array(NX * NY).fill(1);
  let wx = Math.floor(NX * 0.35), mid = Math.floor(NY / 2);
  for (let j = 0; j < NY; j++) {
    if (n === 2 && Math.abs(j - mid) > 3) wall[wx + j * NX] = wall[wx + 1 + j * NX] = 1;
    if (n === 3 && Math.abs(Math.abs(j - mid) - 9) > 2) wall[wx + j * NX] = wall[wx + 1 + j * NX] = 1;
  }
  // 浅瀬：まん中の円の中だけ浅い（波が遅くなり、レンズのように曲がって集まる）
  if (n === 4) for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let r = Math.hypot(i - NX * 0.42, j - mid) / (NY * 0.3);
    if (r < 1) depth[i + j * NX] = 0.35 + 0.65 * r * r;
  }
  maker = n > 1; // 場面 2〜4 は左の造波機から平らな波を送る
}

// ★ 浅水方程式を 1 歩進める（速度は「マスの境目」に置く：スタガード格子）
function stepWater() {
  let g = grav * dt;
  // 運動方程式：水面の高さの差が、境目の水を押す。壁の面は通さない
  for (let j = 0; j < NY; j++) for (let i = 1; i < NX; i++) {
    let k = i + j * NX, f = i + j * (NX + 1);
    uu[f] = wall[k] || wall[k - 1] ? 0 : (uu[f] - g * (eta[k] - eta[k - 1])) * (1 - damp);
  }
  for (let j = 1; j < NY; j++) for (let i = 0; i < NX; i++) {
    let k = i + j * NX;
    vv[k] = wall[k] || wall[k - NX] ? 0 : (vv[k] - g * (eta[k] - eta[k - NX])) * (1 - damp);
  }
  // 連続の式：入ってくる水 − 出ていく水 のぶんだけ水面が上下する
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let k = i + j * NX, f = i + j * (NX + 1), H = depth0 * depth[k];
    eta[k] = constrain(eta[k] - dt * H * (uu[f + 1] - uu[f] + vv[k + NX] - vv[k]), -4, 4);
    if (maker && i > NX - 14) eta[k] *= 1 - 0.012 * (i - (NX - 14)); // 造波機を使うときは、右端で波を吸収する（はね返りを消す）
  }
  // 造波機：左端の水面を上下にゆらす
  t += dt;
  if (maker) for (let j = 0; j < NY; j++) eta[1 + j * NX] = 0.22 * Math.sin(t * 0.32);
}

function addDrop(mx, my, amount) {
  let ci = mx / width * NX, cj = my / height * NY;
  for (let j = Math.max(0, Math.floor(cj - 3 * dropSize)); j < Math.min(NY, cj + 3 * dropSize); j++)
    for (let i = Math.max(0, Math.floor(ci - 3 * dropSize)); i < Math.min(NX, ci + 3 * dropSize); i++)
      eta[i + j * NX] += amount * Math.exp(-((i - ci) * (i - ci) + (j - cj) * (j - cj)) / (dropSize * dropSize));
}

function draw() {
  if (mouseIsPressed && mouseY > 100) {
    if (tool === 0) addDrop(mouseX, mouseY, 0.12);
    else {
      let ci = Math.floor(mouseX / width * NX), cj = Math.floor(mouseY / height * NY);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        let i = ci + di, j = cj + dj;
        if (i > 1 && i < NX - 1 && j >= 0 && j < NY) { wall[i + j * NX] = tool === 1 ? 1 : 0; eta[i + j * NX] = 0; }
      }
    }
  }
  for (let s = 0; s < subSteps; s++) stepWater();

  // ---- 水面を色に：高い所は明るく、低い所は暗く。かたむきで光の反射をつける
  img.loadPixels();
  let px = img.pixels;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    let k = i + j * NX, q = k * 4;
    if (wall[k]) { px[q] = 222; px[q + 1] = 196; px[q + 2] = 140; px[q + 3] = 255; continue; }
    let e = eta[k], slope = (i > 0 && i < NX - 1) ? eta[k + 1] - eta[k - 1] : 0;
    let a = constrain(0.5 + e * 1.8, 0, 1), shine = constrain(slope * 6, -1, 1), shallow = 1 - depth[k];
    let hi = Math.max(shine, 0), dark = 1 + 0.3 * Math.min(shine, 0); // 光が当たる側は明るく、反対側は暗く
    px[q] = (10 + 50 * a + 110 * hi + 60 * shallow) * dark;
    px[q + 1] = (40 + 140 * a + 70 * hi + 45 * shallow) * dark;
    px[q + 2] = (80 + 150 * a + 30 * hi + 10 * shallow) * dark;
    px[q + 3] = 255;
  }
  img.updatePixels();
  image(img, 0, 0, width, height);

  noStroke(); fill(215, 60, 8, 78); rect(0, 0, width, 100);
  fill(0, 0, 100); textSize(18);
  text(sceneNames[scene] + '（1〜4）　道具：' + toolNames[tool] + '（W）　造波機 ' + (maker ? 'ON' : 'OFF') + '（P）　水深 H = ' + nf(depth0, 1, 2) + '（上下キー）　R = 静める', 20, 38);
  fill(0, 0, 80); textSize(15);
  text('浅水方程式　∂η/∂t = −∇·(H u) ,　∂u/∂t = −g∇η　　波の速さ c = √(gH) = ' + nf(Math.sqrt(grav * depth0), 1, 2) + ' マス/ステップ', 20, 66);
  fill(0, 0, 65);
  text(['', '水滴を落とすと波紋が広がり、壁（画面の端）ではね返る', 'すき間を通った波は、まっすぐ進まずに扇形に広がる（回折）', '2 つのすき間から出た波が重なり、強め合う筋と打ち消し合う筋ができる（干渉）', '浅い所（明るい円）で波が遅くなり、内側へ曲がって 1 点に集まる（屈折）。津波が岬に集中するのも同じ'][scene], 20, 90);
}

function keyPressed() {
  if (key >= '1' && key <= '4') setScene(Number(key));
  if (key === 'w' || key === 'W') tool = (tool + 1) % 3;
  if (key === 'p' || key === 'P') maker = !maker;
  if (key === UP_ARROW) depth0 = Math.min(depth0 + 0.2, 1.6); // これ以上深いと計算がこわれる（c Δt < 0.7 マス）
  if (key === DOWN_ARROW) depth0 = Math.max(depth0 - 0.2, 0.2);
  if (key === 'r' || key === 'R') calm();
}

// ---------- やってみよう ----------
// 1. 1 で水滴を 1 つ。波紋が端ではね返る。2 か所に続けて落とすと、重なった所はどうなる？
// 2. 水深 H を 0.2 と 1.6 で比べる。波が画面を横切る時間はどのくらいちがう？（c = √(gH)）
// 3. 2 のすき間：W で壁を消して、すき間を広げていく。広いと波はまっすぐ進む。波長と比べてどのくらいから？
// 4. 3 の干渉：すき間の間かく（9 マス）を変えると、筋の本数はどう変わる？
// 5. 4 の浅瀬：波が集まる「焦点」はどこ？ depth の 0.35 を 0.7 にすると焦点は遠くなる？ 近くなる？
// 6. W で壁を描いて、自分の港（防波堤）を作ろう。港の中を静かに保つには？
