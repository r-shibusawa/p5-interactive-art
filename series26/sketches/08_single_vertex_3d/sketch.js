// ============================================
// 08 一頂点の平坦折りシミュレーション（3D）
// 4 本の折り目が集まる頂点を、紙を曲げずに（剛体のまま）少しずつ折る。動かせるのは 1 つの角度だけ（自由度 1）
//   川崎の条件を満たすと最後までぺたんと平らになる。満たさないと途中で止まる
// ←→ = 折る量 / A = 自動 / 1〜3 = 角の組み合わせ / B = 折れ方（もう一方の枝）/ ドラッグ = 視点
// ============================================

let PRESETS = [
  ['ミウラ折りの頂点', [70, 110, 110, 70]],
  ['一般の平坦折り可能な頂点', [50, 80, 130, 100]],
  ['川崎の条件を満たさない頂点', [80, 100, 95, 85]],
];
let presetNo = 0;
let thetaDeg = PRESETS[0][1];  // ★ 4 つの角（度）。θ1 + θ3 = θ2 + θ4 = 180 で平坦折り可能
let rho = 0;                   // 折り目 c0 の折り角（ラジアン）
let branch = 1;                // 2 つの折れ方のどちらか
let auto = false, autoDir = 1;
let Rr = 220;                  // ★ 紙の半径（px）
let C = [];                    // 今の 4 本の折り目の向き（長さ 1 の 3D ベクトル）
let stuck = false;
let mainCam, hudCam, hud;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hudCam = createCamera();
  mainCam = createCamera();
  mainCam.camera(0, -420, 520, 0, 0, 0, 0, 1, 0);
  hud = createGraphics(width, height);
  resetFold();
}
function resetFold() { rho = 0.02; C = []; solve(rho); }

// ★ 折り目 c0 を ρ だけ折ったときの 4 本の折り目を求める
function solve(r) {
  let th = thetaDeg.map((d) => d * PI / 180);
  let c0 = [1, 0, 0], c1 = [Math.cos(th[0]), 0, Math.sin(th[0])];          // 面 0（c0〜c1）は床に固定
  let c3 = rotAxis([Math.cos(-th[3]), 0, Math.sin(-th[3])], c0, r);          // 面 3 を c0 のまわりに ρ 回す
  // c2 は「c1 と θ2 の角」かつ「c3 と θ3 の角」をなす単位ベクトル：2 つの円錐の交わり
  let g = dotv(c1, c3), ca = Math.cos(th[1]), cb = Math.cos(th[2]);
  let den = 1 - g * g;
  if (den < 1e-9) return false;
  let a = (ca - g * cb) / den, b = (cb - g * ca) / den;
  let base = addv(scalev(c1, a), scalev(c3, b));
  let w = crossv(c1, c3), ww = dotv(w, w);
  let rest = 1 - dotv(base, base);
  if (rest < -1e-9) return false;                 // 交わらない → これ以上折れない
  let t = Math.sqrt(Math.max(0, rest) / ww);
  let s1 = addv(base, scalev(w, t)), s2 = addv(base, scalev(w, -t));
  let prev = C[2];
  let c2;
  if (prev) c2 = dotv(s1, prev) >= dotv(s2, prev) ? s1 : s2;   // 前のフレームに近い方（連続に動かす）
  else c2 = (s1[1] * branch <= s2[1] * branch) ? s1 : s2;
  C = [c0, c1, c2, c3];
  return true;
}

// 折り目 i の折り角（左右の面の法線の角度）。符号 + = 谷、− = 山
function foldAngle(i) {
  let a = C[(i + 3) % 4], b = C[i], c = C[(i + 1) % 4];
  let n1 = normv(crossv(a, b)), n2 = normv(crossv(b, c));
  let ang = Math.acos(Math.max(-1, Math.min(1, dotv(n1, n2))));
  return dotv(crossv(n1, n2), b) >= 0 ? ang : -ang;
}

function draw() {
  background(30, 28, 36);
  if (keyIsDown(RIGHT_ARROW)) tryRho(rho + 0.012);
  if (keyIsDown(LEFT_ARROW)) tryRho(rho - 0.012);
  if (auto) { if (!tryRho(rho + 0.01 * autoDir) || rho > PI - 0.03 || rho < 0.02) autoDir *= -1; }

  setCamera(mainCam);
  orbitControl();
  ambientLight(120);
  directionalLight(255, 255, 255, 0.3, 1, -0.5);
  let th = thetaDeg.map((d) => d * PI / 180);
  let cols = [[246, 240, 226], [226, 84, 72], [246, 240, 226], [226, 84, 72]];
  noStroke();
  for (let i = 0; i < 4; i++) {
    fill(cols[i][0], cols[i][1], cols[i][2]);
    let a = C[i], b = C[(i + 1) % 4];
    beginShape(TRIANGLES);
    let N = 16;
    for (let k = 0; k < N; k++) {
      let p = slerp(a, b, th[i], k / N), q = slerp(a, b, th[i], (k + 1) / N);
      vertex(0, 0, 0); vertex(p[0] * Rr, p[1] * Rr, p[2] * Rr); vertex(q[0] * Rr, q[1] * Rr, q[2] * Rr);
    }
    endShape();
  }
  // 折り目（山 = 赤、谷 = 青）
  strokeWeight(4);
  for (let i = 0; i < 4; i++) {
    let f = foldAngle(i);
    stroke(f >= 0 ? color(60, 120, 240) : color(230, 70, 50));
    line(0, 0, 0, C[i][0] * Rr * 1.02, C[i][1] * Rr * 1.02, C[i][2] * Rr * 1.02);
  }

  clearDepth();
  setCamera(hudCam);
  drawHud(th);
  noStroke();
  image(hud, -width / 2, -height / 2, width, height);
}

function tryRho(r) {
  r = constrain(r, 0.02, PI - 0.02);
  let saved = C.slice(), old = rho;
  if (solve(r)) { rho = r; stuck = false; return true; }
  C = saved; rho = old; stuck = true; return false;
}

function drawHud(th) {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('←→：折る量　A：自動 ' + (auto ? 'ON' : 'off') + '　1〜3：頂点の種類　B：折れ方を変える　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('紙は曲げずに 4 枚の板として回す。1 本の折り角を決めると、残り 3 本は自動で決まる（自由度 1）', 20, 68);
  hud.fill(255, 190, 40); hud.textSize(22);
  hud.text((presetNo + 1) + '. ' + PRESETS[presetNo][0], 20, 110);
  hud.fill(220); hud.textSize(17);
  hud.text('角：' + thetaDeg.join('° / ') + '°', 20, 138);
  let k1 = thetaDeg[0] + thetaDeg[2], k2 = thetaDeg[1] + thetaDeg[3];
  hud.fill(k1 === 180 && k2 === 180 ? color(80, 220, 140) : color(255, 110, 90));
  hud.text('θ1 + θ3 = ' + k1 + '°,  θ2 + θ4 = ' + k2 + '°', 20, 164);
  hud.fill(255); hud.textSize(16);
  for (let i = 0; i < 4; i++) {
    let f = foldAngle(i);
    hud.fill(f >= 0 ? color(110, 160, 255) : color(255, 110, 90));
    hud.text('折り目 c' + i + '：' + nf(degrees(Math.abs(f)), 1, 1) + '°  ' + (f >= 0 ? '谷' : '山'), 20, 206 + i * 26);
  }
  hud.fill(stuck ? color(255, 110, 90) : 200); hud.textSize(16);
  hud.text(stuck ? 'これ以上は剛体のまま折れない！' : 'ρ = ' + nf(degrees(rho), 1, 1) + '°（180° で平らにたたまれる）', 20, 320);
  // 展開図（右下）
  let ox = width - 170, oy = height - 170, r = 120;
  hud.fill(246, 240, 226); hud.circle(ox, oy, r * 2 + 20);
  let a = 0;
  for (let i = 0; i < 4; i++) {
    let f = foldAngle(i);
    hud.stroke(f >= 0 ? color(60, 120, 240) : color(230, 70, 50)); hud.strokeWeight(3);
    hud.line(ox, oy, ox + Math.cos(a) * r, oy + Math.sin(a) * r);
    a += th[i];
  }
  hud.noStroke(); hud.fill(200); hud.textSize(13); hud.text('展開図（赤 = 山、青 = 谷）', ox - 80, oy + r + 30);
}

function keyPressed() {
  if (key >= '1' && key <= '3') { presetNo = int(key) - 1; thetaDeg = PRESETS[presetNo][1]; resetFold(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'b' || key === 'B') { branch *= -1; resetFold(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); hud = createGraphics(width, height); }

// ---------- やってみよう ----------
// 1. 1（ミウラ）と 2 で ρ = 180° まで折れるのに、3 は途中で止まる。止まる角度は？
// 2. B で折れ方を変えると、山と谷の組み合わせが入れかわる。どちらも前川の定理（M − V = ±2）を満たしている？
// 3. thetaDeg を自分で決めよう（例：[40, 90, 140, 90]）。川崎の条件を満たすようにして平らになるか確かめる
// 4. 4 本の折り角の大きさを見比べよう。向かい合う折り目の角度はどうなっている？


// ==================================================
// ここから下は「3D ベクトルの道具」
// ==================================================
function dotv(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function addv(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scalev(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function crossv(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function normv(a) { let l = Math.hypot(a[0], a[1], a[2]) || 1; return scalev(a, 1 / l); }
// 軸 k（長さ 1）のまわりに v を角 t 回す（ロドリゲスの公式）
function rotAxis(v, k, t) {
  let c = Math.cos(t), s = Math.sin(t), kv = crossv(k, v), d = dotv(k, v);
  return [v[0] * c + kv[0] * s + k[0] * d * (1 - c), v[1] * c + kv[1] * s + k[1] * d * (1 - c), v[2] * c + kv[2] * s + k[2] * d * (1 - c)];
}
// a から b へ（間の角 th）の球面上の補間
function slerp(a, b, th, s) {
  let k1 = Math.sin((1 - s) * th) / Math.sin(th), k2 = Math.sin(s * th) / Math.sin(th);
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}
