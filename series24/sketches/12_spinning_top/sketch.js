// ============================================
// 12 コマの歳差運動
// 傾いたコマは倒れずに、軸がゆっくり円を描く（歳差運動）。軸の先はうねうねと上下もする（章動）
//   重力のトルクが角運動量の「向き」を少しずつ変える。オイラー角 (θ, φ, ψ) のラグランジュ方程式を RK4 で解く
// ↑↓ = 回転の速さ / ←→ = 最初の傾き / 1 / 2 / 3 = 最初の横向きの速さ（とがる・なめらか・輪）/ ドラッグ = 見る向き / スペース = やり直し
// ============================================

let I1 = 1.0;              // ★ 支点のまわりの横向きの慣性モーメント
let I3 = 0.5;              // ★ 軸のまわりの慣性モーメント
let Mgl = 2.0;             // ★ 質量 × 重力 × 支点から重心までの距離
let w3 = 12;               // ★ 軸のまわりの回転の速さ ω₃ [rad/s]
let tilt = 0.5;            // ★ 最初の傾き θ₀ [rad]
let phidot0 = 0;           // 最初の歳差の速さ（1/2/3 で変える）
let presetNo = 1;
let th, thd, phi, psi, pphi;  // 状態と、保存量 p_φ
let tipTrail = [];
let viewX = -0.25, viewY = 0.3;
let HIST = 600, hTh = [], hPd = [];
let hud, info, falls = false;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  hud = createGraphics(floor(width * 0.42), floor(height * 0.5));
  hud.colorMode(HSB, 360, 100, 100, 100);
  info = createDiv('');
  info.position(20, 16);
  info.style('color', '#eee'); info.style('font', '15px sans-serif'); info.style('pointer-events', 'none'); info.style('line-height', '1.7');
  restart();
}

function slowPrecession() { return Mgl / (I3 * w3); }   // 速いコマの近似 Ω ≈ Mgl / (I₃ω₃)
function restart() {
  let pre = [0, 0, slowPrecession(), -slowPrecession() * 1.5];
  phidot0 = pre[presetNo];
  th = tilt; thd = 0; phi = 0; psi = 0;
  pphi = I1 * phidot0 * sin(th) ** 2 + I3 * w3 * cos(th);   // ★ 鉛直軸まわりの角運動量（保存）
  tipTrail = []; hTh = []; hPd = []; falls = false;
}
function phidotOf(t) { let s = sin(t); return (pphi - I3 * w3 * cos(t)) / (I1 * max(s * s, 1e-6)); }

// ★ θ の運動方程式（ψ' + φ' cos θ = ω₃ は一定）
function deriv(s) {
  let [t, td] = s, pd = phidotOf(t);
  let tdd = (I1 * pd * pd * sin(t) * cos(t) - I3 * w3 * pd * sin(t) + Mgl * sin(t)) / I1;
  return [td, tdd];
}

function draw() {
  background(250, 30, 9);
  let sub = 20, h = 1 / 60 / sub;
  for (let k = 0; k < sub; k++) {
    let s = [th, thd];
    let k1 = deriv(s), k2 = deriv([th + k1[0] * h / 2, thd + k1[1] * h / 2]), k3 = deriv([th + k2[0] * h / 2, thd + k2[1] * h / 2]), k4 = deriv([th + k3[0] * h, thd + k3[1] * h]);
    th += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    thd += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    th = constrain(th, 0.01, 1.75); thd = constrain(thd, -50, 50);   // 床（θ ≈ 100°）より倒れない
    let pd = constrain(phidotOf(th), -200, 200);
    phi += pd * h;
    psi += (w3 - pd * cos(th)) * h;
  }
  if (th >= 1.74) falls = true;
  pushHist(hTh, degrees(th)); pushHist(hPd, phidotOf(th));

  // 軸の向き（物理の座標：z が上）→ p5 の座標（y が下）
  let u = [sin(th) * cos(phi), sin(th) * sin(phi), cos(th)];
  let Lp = 200, tip = [u[0] * Lp * 1.3, -u[2] * Lp * 1.3, u[1] * Lp * 1.3];
  tipTrail.push(tip); if (tipTrail.length > 900) tipTrail.shift();

  push();
  translate(-width * 0.2, 140, 0);
  rotateX(viewX); rotateY(viewY);
  ambientLight(0, 0, 45); directionalLight(0, 0, 100, 0.4, 0.7, -1);
  // 床
  push(); rotateX(HALF_PI); noStroke(); fill(220, 20, 20); plane(700, 700); pop();
  // 軸の先の軌跡
  stroke(55, 90, 100); strokeWeight(2); noFill();
  beginShape(); for (let q of tipTrail) vertex(q[0], q[1], q[2]); endShape();
  // コマ本体：z-x-z のオイラー角で回す（rotateY が鉛直軸まわり）
  push();
  rotateY(-phi);            // 歳差 φ（p5 では y 軸が鉛直）
  rotateZ(th);              // 傾き θ
  rotateY(-psi);            // 自転 ψ
  noStroke();
  fill(0, 0, 80); push(); translate(0, -Lp * 0.65, 0); cylinder(4, Lp * 1.3); pop();      // 軸
  fill(30, 80, 100); push(); translate(0, -Lp, 0); cylinder(75, 24, 24, 1); pop();       // 円盤
  fill(200, 80, 100); push(); translate(60, -Lp - 14, 0); box(26, 6, 26); pop();         // 自転が見える目印
  fill(0, 0, 60); push(); translate(0, -8, 0); cone(10, 16, 12, 1, true); pop();
  pop();
  pop();

  drawHUD();
  drawingContext.disable(drawingContext.DEPTH_TEST);
  push(); resetMatrix(); image(hud, width * 0.55 - width / 2, height * 0.18 - height / 2); pop();
  drawingContext.enable(drawingContext.DEPTH_TEST);

  if (frameCount % 5 === 0) {
    let names = ['', '最初は止めて離す → とがった章動', '速いコマの歳差の速さで離す → なめらかな円', '逆向きに押して離す → 輪を描く'];
    info.html('<b style="font-size:18px">ω₃ = ' + nf(w3, 1, 1) + ' rad/s（↑↓）　傾き θ₀ = ' + nf(degrees(tilt), 1, 0) + '°（←→）　' + presetNo + '：' + names[presetNo] + '</b><br>' +
      '歳差の速さ φ\' = ' + nf(phidotOf(th), 1, 2) + ' rad/s（速いコマの近似 Mgl/(I₃ω₃) = ' + nf(slowPrecession(), 1, 2) + '）　θ = ' + nf(degrees(th), 1, 1) + '°<br>' +
      '<span style="color:#aaa">黄色 = 軸の先の軌跡。ドラッグ：見る向き　スペース：やり直し' + (falls ? '　<b style="color:#f88">倒れた！ω₃ を上げよう</b>' : '') + '</span>');
  }
}

function drawHUD() {
  let g = hud, W = g.width, H = g.height;
  g.clear(); g.noStroke(); g.fill(0, 0, 12, 90); g.rect(0, 0, W, H, 6);
  let plot = (data, lo, hi, y0, hh, hue, title) => {
    g.stroke(hue, 70, 100); g.strokeWeight(2); g.noFill();
    g.beginShape(); for (let i = 0; i < data.length; i++) g.vertex(map(i + HIST - data.length, 0, HIST - 1, 0, W), map(constrain(data[i], lo, hi), lo, hi, y0 + hh, y0 + 24)); g.endShape();
    g.noStroke(); g.fill(hue, 60, 100); g.textSize(13); g.text(title, 10, y0 + 18);
  };
  let tmin = min(...hTh, degrees(tilt)) - 2, tmax = max(...hTh, degrees(tilt)) + 2;
  plot(hTh, tmin, tmax, 0, H / 2 - 10, 30, '傾き θ [°]（上下にうねる = 章動）');
  let pmin = min(...hPd, 0) - 0.2, pmax = max(...hPd, 0) + 0.2;
  let y0 = map(0, pmin, pmax, H - 10, H / 2 + 24);
  g.stroke(0, 0, 35); g.line(0, y0, W, y0);
  plot(hPd, pmin, pmax, H / 2, H / 2 - 10, 200, '歳差の速さ φ\' [rad/s]');
}

function mouseDragged() { viewY += (mouseX - pmouseX) * 0.01; viewX -= (mouseY - pmouseY) * 0.01; }
function keyPressed() {
  if (key === UP_ARROW) { w3 = min(w3 + 2, 40); restart(); }
  if (key === DOWN_ARROW) { w3 = max(w3 - 2, 2); restart(); }
  if (key === RIGHT_ARROW) { tilt = min(tilt + 0.1, 1.4); restart(); }
  if (key === LEFT_ARROW) { tilt = max(tilt - 0.1, 0.1); restart(); }
  if (key === '1' || key === '2' || key === '3') { presetNo = int(key); restart(); }
  if (key === ' ') restart();
}

// ---------- やってみよう ----------
// 1. ω₃ を上げると歳差はゆっくりに、章動は小さく速くなる（Ω ≈ Mgl / (I₃ω₃)）
// 2. ω₃ を 2〜4 まで下げると？ 遅いコマは大きくよろめいて倒れる
// 3. 1・2・3 で軸の先の軌跡の形（とがる・円・輪）を比べる。地球の自転軸も 2 万 6 千年で歳差運動している
// 4. Mgl をマイナスにすると「ぶら下がったコマ」になる。どう動く？


// ==================================================
// ここから下は「グラフの道具」です
// ==================================================
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : 0);
  if (arr.length > HIST) arr.shift();
}
