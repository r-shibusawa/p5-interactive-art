// ============================================
// 08 スピンとブロッホ球（3D）
// スピン 1/2（1 量子ビット）の状態 |ψ⟩ = α|0⟩ + β|1⟩ は、球の表面の 1 点（ブロッホベクトル）で表せる
//   ゲート = 球の回転。測定すると |0⟩（北極）か |1⟩（南極）に飛び移る。確率 = |α|²、|β|²
// X Y Z H S T = ゲート / M = z で測定 / K = 1000 回測った統計 / B = 磁場（z 軸のまわりの歳差運動） / ←→ ↑↓ = y・x 軸まわりに少しずつ回す / R = |0⟩ に戻す / ドラッグ = 視点
// ============================================

let aR = 1, aI = 0, bR = 0, bI = 0;   // α と β（複素数）
let queue = [];             // アニメーション中のゲート {nx, ny, nz, th, left, name}
let animFrames = 24;        // ★ ゲート 1 つを何フレームかけて回すか
let field = false, larmor = 1.2;   // ★ 歳差運動の角速度
let trail = [];
let counts = [0, 0], stat = null;
let rotX = -0.35, rotY = -0.7;
let hud, lastGate = '—';
let R;                      // 球の半径（px）

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hud = createGraphics(width, height);
  R = min(width, height) * 0.3;
}

// ★ 回転のゲート U = cos(θ/2) I − i sin(θ/2) (n · σ) を状態にかける（σ = パウリ行列）
function applyRot(nx, ny, nz, th) {
  let c = Math.cos(th / 2), s = Math.sin(th / 2);
  // (n·σ)|ψ⟩ の成分：上 = nz α + (nx − i ny) β、下 = (nx + i ny) α − nz β
  let uR = nz * aR + nx * bR + ny * bI, uI = nz * aI + nx * bI - ny * bR;
  let dR = nx * aR - ny * aI - nz * bR, dI = nx * aI + ny * aR - nz * bI;
  // ψ' = c ψ − i s (n·σ)ψ　（−i (x + iy) = y − ix）
  aR = c * aR + s * uI; aI = c * aI - s * uR;
  bR = c * bR + s * dI; bI = c * bI - s * dR;
  let nrm = Math.sqrt(aR * aR + aI * aI + bR * bR + bI * bI) || 1;   // 誤差がたまらないよう正規化
  aR /= nrm; aI /= nrm; bR /= nrm; bI /= nrm;
}

// ブロッホベクトル (x, y, z) = (2 Re(α*β), 2 Im(α*β), |α|² − |β|²)
function bloch() {
  return { x: 2 * (aR * bR + aI * bI), y: 2 * (aR * bI - aI * bR), z: aR * aR + aI * aI - bR * bR - bI * bI };
}
// ブロッホ座標 → 画面の 3D 座標（z が上、x が手前、y が右）
function toScreen(v) { return [v.y * R, -v.z * R, v.x * R]; }

function gate(name) {
  let r2 = Math.SQRT1_2;
  let g = { X: [1, 0, 0, PI], Y: [0, 1, 0, PI], Z: [0, 0, 1, PI], H: [r2, 0, r2, PI], S: [0, 0, 1, PI / 2], T: [0, 0, 1, PI / 4] }[name];
  if (g) queue.push({ nx: g[0], ny: g[1], nz: g[2], th: g[3], left: animFrames, name });
}

function draw() {
  background(16, 18, 34);
  // ゲートを少しずつ回す
  if (queue.length) {
    let q = queue[0];
    applyRot(q.nx, q.ny, q.nz, q.th / animFrames);
    lastGate = q.name;
    if (--q.left <= 0) queue.shift();
  }
  if (field) applyRot(0, 0, 1, (larmor * deltaTime) / 1000);
  if (keyIsDown(LEFT_ARROW)) applyRot(0, 1, 0, -0.03);
  if (keyIsDown(RIGHT_ARROW)) applyRot(0, 1, 0, 0.03);
  if (keyIsDown(UP_ARROW)) applyRot(1, 0, 0, -0.03);
  if (keyIsDown(DOWN_ARROW)) applyRot(1, 0, 0, 0.03);
  if (mouseIsPressed) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -1.5, 1.5); }

  let v = bloch();
  trail.push(toScreen(v));
  if (trail.length > 300) trail.shift();

  push();
  rotateX(rotX); rotateY(rotY);
  // 球の骨組み
  noFill(); strokeWeight(1);
  for (let lat = -60; lat <= 60; lat += 30) ring(lat === 0 ? 120 : 50, (lat * PI) / 180, 'lat');
  for (let lon = 0; lon < 180; lon += 30) ring(40, (lon * PI) / 180, 'lon');
  // 軸：x 赤、y 緑、z 青
  strokeWeight(3);
  stroke(255, 110, 110); line(0, 0, -R * 1.25, 0, 0, R * 1.25);
  stroke(110, 230, 140); line(-R * 1.25, 0, 0, R * 1.25, 0, 0);
  stroke(120, 170, 255); line(0, -R * 1.25, 0, 0, R * 1.25, 0);
  // 北極 |0⟩ と南極 |1⟩
  noStroke();
  push(); translate(0, -R, 0); fill(120, 170, 255); sphere(7); pop();
  push(); translate(0, R, 0); fill(60, 90, 160); sphere(7); pop();
  // 軌跡
  stroke(255, 220, 120, 150); strokeWeight(2);
  for (let i = 1; i < trail.length; i++) line(...trail[i - 1], ...trail[i]);
  // 状態ベクトル
  let p = toScreen(v);
  stroke(255, 230, 120); strokeWeight(5); line(0, 0, 0, ...p);
  noStroke(); fill(255, 230, 120);
  push(); translate(...p); sphere(12); pop();
  // z 軸への影（測定で |0⟩ が出る確率 = (1 + z)/2）
  stroke(255, 230, 120, 90); strokeWeight(1); line(...p, 0, p[1], 0);
  pop();

  drawHud(v);
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);   // HUD を必ず手前に
  image(hud, -width / 2, -height / 2);
}

// 緯線（lat）または経線（lon）を 1 本描く
function ring(alpha, a, kind) {
  stroke(200, 210, 255, alpha);
  beginShape();
  for (let i = 0; i <= 64; i++) {
    let u = (i / 64) * TWO_PI, x, y, z;
    if (kind === 'lat') { x = Math.cos(a) * Math.cos(u); y = Math.cos(a) * Math.sin(u); z = Math.sin(a); }
    else { x = Math.cos(a) * Math.sin(u); y = Math.sin(a) * Math.sin(u); z = Math.cos(u); }
    vertex(...toScreen({ x, y, z }));
  }
  endShape();
}

function drawHud(v) {
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('X Y Z H S T：ゲート（最後 ' + lastGate + '）　M：測定　K：1000 回の統計　B：磁場 ' + (field ? 'ON' : 'off') + '　←→ ↑↓：少し回す　R：|0⟩　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('青 = z 軸（上 |0⟩・下 |1⟩）、赤 = x 軸（手前 |+⟩）、緑 = y 軸（右 |+i⟩）。H は |0⟩ を赤道の |+⟩ へ、S・T は z 軸のまわりの回転（位相）', 20, 68);
  let p0 = (1 + v.z) / 2;
  let px = 20, py = height - 250;
  hud.fill(0, 0, 0, 120); hud.rect(px - 10, py - 30, 400, 270, 10);
  hud.fill(255, 230, 120); hud.textSize(17);
  hud.text('α = ' + nf(aR, 1, 3) + (aI >= 0 ? ' + ' : ' − ') + nf(abs(aI), 1, 3) + 'i', px, py);
  hud.text('β = ' + nf(bR, 1, 3) + (bI >= 0 ? ' + ' : ' − ') + nf(abs(bI), 1, 3) + 'i', px, py + 26);
  hud.fill(255); hud.textSize(15);
  hud.text('ブロッホ (x, y, z) = (' + nf(v.x, 1, 2) + ', ' + nf(v.y, 1, 2) + ', ' + nf(v.z, 1, 2) + ')', px, py + 56);
  hud.text('P(|0⟩) = |α|² = ' + nf(p0, 1, 3) + '　P(|1⟩) = ' + nf(1 - p0, 1, 3), px, py + 82);
  // 測定の記録
  let tot = counts[0] + counts[1];
  hud.text('M で測った回数：|0⟩ ' + counts[0] + '　|1⟩ ' + counts[1], px, py + 112);
  if (stat) {
    hud.text('K：1000 回中 |0⟩ が ' + stat[0] + ' 回、|1⟩ が ' + stat[1] + ' 回', px, py + 140);
    hud.fill(120, 170, 255); hud.rect(px, py + 156, (stat[0] / 1000) * 360, 16);
    hud.fill(60, 90, 160); hud.rect(px + (stat[0] / 1000) * 360, py + 156, (stat[1] / 1000) * 360, 16);
  }
  hud.fill(170); hud.textSize(13);
  hud.text(tot ? '測ると状態は北極か南極に飛び移る（波束の収縮）' : '測定は状態をこわす。K は「同じ状態を 1000 個用意して測った」場合', px, py + 200);
}

function keyPressed() {
  let k = key.toUpperCase();
  if ('XYZHST'.includes(k) && k.length === 1) gate(k);
  if (k === 'M') {
    queue = [];
    let p0 = aR * aR + aI * aI;
    if (Math.random() < p0) { aR = 1; aI = 0; bR = 0; bI = 0; counts[0]++; } else { aR = 0; aI = 0; bR = 1; bI = 0; counts[1]++; }
  }
  if (k === 'K') {
    let p0 = aR * aR + aI * aI, c = 0;
    for (let i = 0; i < 1000; i++) if (Math.random() < p0) c++;
    stat = [c, 1000 - c];
  }
  if (k === 'B') field = !field;
  if (k === 'R') { aR = 1; aI = 0; bR = 0; bI = 0; queue = []; trail = []; counts = [0, 0]; stat = null; }
}

// ---------- やってみよう ----------
// 1. H を 2 回押すと元に戻る。H → Z → H は何のゲートと同じ？（X）
// 2. H で赤道へ → B で歳差運動。M で測ると |0⟩ と |1⟩ はいつでも半々。でも K の前に H を押すと？（位相で変わる）
// 3. T を 8 回押すと 1 周。S は T 何回分？
// 4. applyRot に好きな軸 (nx, ny, nz) を入れた自分のゲートを作り、キーに割り当てよう
