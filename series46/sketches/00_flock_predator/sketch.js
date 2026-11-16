// ============================================
// 00 ボイド＋捕食者 ─ 群れが割れる・渦になる
// 3 つのルール（分離・整列・結合）に「捕食者から逃げる」を足す。捕食者が飛び込むと群れが割れ、まわりを回る渦（ベイトボール）ができる
// 近傍を「半径 r 以内の全員」と「近い順に 7 羽（トポロジカル近傍）」で切り替えて、まとまり方を比べる
// T = 近傍の切替 / P = 捕食者（自動 ⇄ マウス）/ ↑↓ = 半径 r / ←→ = 逃げはじめる距離 / スペース = 捕食者を休ませる / R = リセット
// ============================================

let N = 400;                          // ★ 鳥（魚）の数
let maxSpeed = 3.2, maxForce = 0.12;  // ★ 速さと曲がる力の上限
let wSep = 1.6, wAli = 1.0, wCoh = 0.9, wFlee = 4.0;   // ★ 4 つのルールの重み
let radiusR = 55;                     // 近傍の半径 r（px）
let kNear = 7;                        // ★ トポロジカル近傍の数（ムクドリは 6〜7 羽）
let topo = false;                     // true = 近い順に kNear 羽
let fearR = 130;                      // 捕食者から逃げはじめる距離
let predAuto = true, predRest = false;
let predSpeed = 3.7;                  // ★ 捕食者の速さ（鳥より少しだけ速い）
let px, py, vx, vy;
let pred = { x: 0, y: 0, vx: 0, vy: 0 };
let caught = 0, phiHist = [], groupHist = [];
const CELL = 60;
let cols, rows, heads, nexts, uf;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetFlock();
}

function resetFlock() {
  px = new Float32Array(N); py = new Float32Array(N); vx = new Float32Array(N); vy = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    px[i] = width * 0.5 + (Math.random() - 0.5) * 400; py[i] = height * 0.5 + (Math.random() - 0.5) * 300;
    let a = Math.random() * Math.PI * 2; vx[i] = Math.cos(a) * 2; vy[i] = Math.sin(a) * 2;
  }
  pred.x = 60; pred.y = 60; pred.vx = 0; pred.vy = 0;
  cols = Math.max(1, Math.ceil(width / CELL)); rows = Math.max(1, Math.ceil(height / CELL));
  heads = new Int32Array(cols * rows); nexts = new Int32Array(N); uf = new Int32Array(N);
  caught = 0; phiHist = []; groupHist = [];
}

// ★ 鳥 i が見る「仲間」のリストを返す（半径 r か、近い順に k 羽）
function neighbours(i) {
  let found = [], reach = topo ? 1 : Math.ceil(radiusR / CELL);
  for (let tries = 0; tries < 2; tries++) {
    found.length = 0;
    let cx = Math.floor(px[i] / CELL), cy = Math.floor(py[i] / CELL);
    for (let gy = -reach; gy <= reach; gy++) for (let gx = -reach; gx <= reach; gx++) {
      let c = (((cx + gx) % cols) + cols) % cols + ((((cy + gy) % rows) + rows) % rows) * cols;
      for (let j = heads[c]; j >= 0; j = nexts[j]) {
        if (j === i) continue;
        let dx = wrapD(px[j] - px[i], width), dy = wrapD(py[j] - py[i], height), d2 = dx * dx + dy * dy;
        if (topo || d2 < radiusR * radiusR) found.push({ j, dx, dy, d: Math.sqrt(d2) + 0.01 });
      }
    }
    if (!topo || found.length >= kNear) break;
    reach = 3;                                     // 仲間が少ないときはもっと遠くまで探す
  }
  if (topo) { found.sort((a, b) => a.d - b.d); found.length = Math.min(found.length, kNear); }
  return found;
}

function draw() {
  background(258, 45, 12);
  if (keyIsDown(UP_ARROW)) radiusR = Math.min(radiusR + 1, 120);
  if (keyIsDown(DOWN_ARROW)) radiusR = Math.max(radiusR - 1, 15);
  if (keyIsDown(RIGHT_ARROW)) fearR = Math.min(fearR + 2, 300);
  if (keyIsDown(LEFT_ARROW)) fearR = Math.max(fearR - 2, 30);
  // ---- 空間ハッシュ（マス目ごとの名簿）を作る
  heads.fill(-1);
  for (let i = 0; i < N; i++) {
    let c = (Math.floor(px[i] / CELL) % cols) + (Math.floor(py[i] / CELL) % rows) * cols;
    nexts[i] = heads[c]; heads[c] = i; uf[i] = i;
  }
  // ---- 1 羽ずつ 4 つのルールで向きを決める
  let ax = new Float32Array(N), ay = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let nb = neighbours(i), sx = 0, sy = 0, alx = 0, aly = 0, chx = 0, chy = 0;
    for (let o of nb) {
      if (o.d < radiusR * 0.45 || (topo && o.d < 25)) { sx -= o.dx / (o.d * o.d); sy -= o.dy / (o.d * o.d); }   // 分離
      alx += vx[o.j]; aly += vy[o.j];                                                                           // 整列
      chx += o.dx; chy += o.dy;                                                                                 // 結合
      if (o.d < 40) union(i, o.j);
    }
    let fx = 0, fy = 0;
    if (nb.length > 0) {
      fx += steerX(sx, sy, i) * wSep; fy += steerY(sx, sy, i) * wSep;
      fx += steerX(alx, aly, i) * wAli; fy += steerY(alx, aly, i) * wAli;
      fx += steerX(chx, chy, i) * wCoh; fy += steerY(chx, chy, i) * wCoh;
    }
    let ex = wrapD(px[i] - pred.x, width), ey = wrapD(py[i] - pred.y, height), ed = Math.hypot(ex, ey);
    if (!predRest && ed < fearR) {                                                                              // 逃げる
      let k = (1 - ed / fearR) * wFlee;
      fx += steerX(ex, ey, i) * k; fy += steerY(ex, ey, i) * k;
    }
    ax[i] = fx; ay[i] = fy;
  }
  for (let i = 0; i < N; i++) {
    vx[i] += ax[i]; vy[i] += ay[i];
    let sp = Math.hypot(vx[i], vy[i]);
    if (sp > maxSpeed) { vx[i] *= maxSpeed / sp; vy[i] *= maxSpeed / sp; }
    if (sp < 1) { vx[i] += (vx[i] / (sp + 1e-6)) * 0.2; vy[i] += (vy[i] / (sp + 1e-6)) * 0.2; }
    px[i] = (px[i] + vx[i] + width) % width; py[i] = (py[i] + vy[i] + height) % height;
  }
  movePredator();

  // ---- 描く：鳥は 1 つの図形にまとめて描く（速い）
  noStroke(); fill(42, 70, 100);
  beginShape(TRIANGLES);
  for (let i = 0; i < N; i++) {
    let sp = Math.hypot(vx[i], vy[i]) + 1e-6, ux = vx[i] / sp, uy = vy[i] / sp;
    vertex(px[i] + ux * 7, py[i] + uy * 7); vertex(px[i] - ux * 4 - uy * 3, py[i] - uy * 4 + ux * 3); vertex(px[i] - ux * 4 + uy * 3, py[i] - uy * 4 - ux * 3);
  }
  endShape();
  noFill(); stroke(0, 80, 100, predRest ? 20 : 45); strokeWeight(1); circle(pred.x, pred.y, fearR * 2);
  noStroke(); fill(0, 85, predRest ? 50 : 100); circle(pred.x, pred.y, 18);

  // ---- 測る：偏り φ と 群れの数
  let svx = 0, svy = 0, ssp = 0;
  for (let i = 0; i < N; i++) { svx += vx[i]; svy += vy[i]; ssp += Math.hypot(vx[i], vy[i]); }
  let phi = Math.hypot(svx, svy) / Math.max(ssp, 1e-6);
  let sizes = {}, groups = 0;
  for (let i = 0; i < N; i++) { let r = find(i); sizes[r] = (sizes[r] || 0) + 1; }
  for (let r in sizes) if (sizes[r] >= 5) groups++;
  phiHist.push(phi); groupHist.push(groups);
  if (phiHist.length > 300) { phiHist.shift(); groupHist.shift(); }
  drawPlot(phiHist, width - 330, 100, 300, 70, 0, 1, color(42, 70, 100), '向きのそろい方 φ = ' + nf(phi, 1, 2));
  drawPlot(groupHist, width - 330, 210, 300, 70, 0, 20, color(190, 60, 100), '群れの数（5 羽以上）= ' + groups);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('T：近傍 ' + (topo ? '近い順に ' + kNear + ' 羽（トポロジカル）' : '半径 r = ' + radiusR + ' px') + '　P：捕食者 ' + (predAuto ? '自動' : 'マウス') + '　←→：逃げる距離 ' + fearR + '　スペース：' + (predRest ? '休み中' : '狩り中') + '　R：リセット', 20, 36);
  fill(0, 0, 70); textSize(14);
  text('捕まった数 ' + caught + '　（分離・整列・結合 ＋ 逃げる。トポロジカル近傍だと、群れが薄くなってもバラバラになりにくい）', 20, 60);
}

function movePredator() {
  let tx, ty;
  if (!predAuto) { tx = mouseX; ty = mouseY; }
  else {
    // 自動：一番近い鳥をねらう
    let best = -1, bd = 1e9;
    for (let i = 0; i < N; i++) { let d = Math.hypot(wrapD(px[i] - pred.x, width), wrapD(py[i] - pred.y, height)); if (d < bd) { bd = d; best = i; } }
    tx = pred.x + wrapD(px[best] - pred.x, width); ty = pred.y + wrapD(py[best] - pred.y, height);
  }
  if (predRest) { tx = pred.x + pred.vx * 10; ty = pred.y + pred.vy * 10; }
  let dx = tx - pred.x, dy = ty - pred.y, d = Math.hypot(dx, dy) + 1e-6;
  pred.vx += (dx / d) * 0.25; pred.vy += (dy / d) * 0.25;
  let sp = Math.hypot(pred.vx, pred.vy), lim = predRest ? 1.2 : predSpeed;
  if (sp > lim) { pred.vx *= lim / sp; pred.vy *= lim / sp; }
  pred.x = (pred.x + pred.vx + width) % width; pred.y = (pred.y + pred.vy + height) % height;
  if (predRest) return;
  for (let i = 0; i < N; i++) {
    if (Math.hypot(wrapD(px[i] - pred.x, width), wrapD(py[i] - pred.y, height)) < 9) {   // 捕まったら遠くで生まれ直す
      caught++; px[i] = (pred.x + width / 2) % width; py[i] = (pred.y + height / 2) % height;
    }
  }
}

function keyPressed() {
  if (key === 't' || key === 'T') topo = !topo;
  if (key === 'p' || key === 'P') predAuto = !predAuto;
  if (key === ' ') predRest = !predRest;
  if (key === 'r' || key === 'R') resetFlock();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); resetFlock(); }

// ---------- やってみよう ----------
// 1. スペースで捕食者を休ませると、群れは 1 つにまとまり φ が 1 に近づく。狩りを再開すると群れの数と φ はどう変わる？
// 2. T でトポロジカル近傍に。半径 r を小さく（↓）しても群れが崩れにくいのはなぜ？（密度が変わっても「7 羽」は変わらない）
// 3. P でマウスを捕食者に。群れの真ん中にゆっくり入ると、穴が開いて周りを回る「渦」ができる
// 4. wFlee を 0 にすると？ 10 にすると？ 捕まった数を 1 分間数えて比べよう
// 5. predSpeed を maxSpeed（3.2）より遅くすると、捕食者はまず捕まえられない。群れは「逃げ切る」ための形

// ==================================================
// ここから下は「群れの道具」です（向きの計算・境界・グラフ）
// ==================================================
function wrapD(d, L) { return d - L * Math.round(d / L); }        // 画面の端はつながっている（トーラス）
function steerX(x, y, i) { let m = Math.hypot(x, y); if (m < 1e-9) return 0; return clampF(x / m * maxSpeed - vx[i]); }
function steerY(x, y, i) { let m = Math.hypot(x, y); if (m < 1e-9) return 0; return clampF(y / m * maxSpeed - vy[i]); }
function clampF(v) { return Math.max(-maxForce, Math.min(maxForce, v)); }
function find(i) { while (uf[i] !== i) { uf[i] = uf[uf[i]]; i = uf[i]; } return i; }
function union(a, b) { a = find(a); b = find(b); if (a !== b) uf[a] = b; }
// 値の配列 arr を折れ線グラフで描く（lo〜hi の範囲）
function drawPlot(arr, x, y, w, h, lo, hi, c, title) {
  noStroke(); fill(0, 0, 0, 35); rect(x, y, w, h);
  fill(0, 0, 85); textSize(13); text(title, x, y - 6);
  if (arr.length < 2) return;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / 299) * w, y + h - constrain((arr[i] - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
