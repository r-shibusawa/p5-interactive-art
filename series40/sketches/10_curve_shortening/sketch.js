// ============================================
// 10 曲線短縮流 ─ どんな閉曲線も丸くなって消える（Grayson の定理）
// 曲線の各点を曲率 κ に比例して法線方向へ動かす：∂p/∂t = κ n
//   等間隔の点列なら κ n ≈ (p_{i−1} − 2p_i + p_{i+1}) / h²（ラプラシアン）なので、各点を隣の平均に近づけるだけ
//   出っぱりは引っこみ、へこみは出る。長さは単調に減り、等周比 L²/(4πA) は 1（円）に近づき、最後は 1 点に消える
// ドラッグ = 閉曲線を描く / 1〜4 = プリセット（星・ダンベル・でこぼこ・楕円）/ ↑↓ = 速さ / スペース = 一時停止 / R = 最初から / S = 今の形を残す
// ============================================

let h = 5;                   // ★ 点の間隔（px）
let sigma = 0.6;             // ★ 1 歩の強さ（0〜1、1 に近いほど速いが荒い）
let stepsPerFrame = 4;       // ↑↓ で変わる
let pts = [], init = [], raw = [], drawing = false, paused = false;
let hist = [], snaps = [], stepN = 0, gone = false;
let names = ['星', 'ダンベル', 'でこぼこ', '楕円'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setPreset(1);
}

// ★ プリセットの閉曲線
function presetPts(no) {
  let cx = width * 0.5, cy = height * 0.42, s = Math.min(width, height) * 0.2, out = [];
  for (let i = 0; i < 400; i++) {
    let t = (i / 400) * TWO_PI, r;
    if (no === 1) r = s * (1 + 0.55 * Math.cos(5 * t));
    else if (no === 2) { let x = 2.2 * s * Math.cos(t), y = s * Math.sin(t) * (0.35 + 0.65 * Math.cos(t) ** 2); out.push({ x: cx + x, y: cy + y }); continue; }
    else if (no === 3) r = s * (1 + 0.3 * Math.sin(3 * t + 1) + 0.25 * Math.cos(7 * t) + 0.15 * Math.sin(11 * t + 2));
    else { out.push({ x: cx + 1.8 * s * Math.cos(t), y: cy + 0.7 * s * Math.sin(t) }); continue; }
    out.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  return out;
}
function setPreset(no) { init = resample(presetPts(no), h); restart(); }
function restart() { pts = init.map((p) => ({ x: p.x, y: p.y })); hist = []; snaps = []; stepN = 0; gone = false; }

// 曲線短縮流の 1 歩：各点を隣の平均に σ だけ近づける（= κ n 方向に動かす）
function flowStep() {
  let n = pts.length, q = [];
  for (let i = 0; i < n; i++) {
    let a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    q.push({ x: pts[i].x + (sigma / 2) * (a.x - 2 * pts[i].x + b.x), y: pts[i].y + (sigma / 2) * (a.y - 2 * pts[i].y + b.y) });
  }
  pts = resample(q, h);                 // 点が偏らないように打ち直す（長さが減ると点も減る）
  stepN++;
  if (pts.length < 8) gone = true;
}
function curveLength(p) { let L = 0; for (let i = 0; i < p.length; i++) { let a = p[i], b = p[(i + 1) % p.length]; L += Math.hypot(b.x - a.x, b.y - a.y); } return L; }
function curveArea(p) { let A = 0; for (let i = 0; i < p.length; i++) { let a = p[i], b = p[(i + 1) % p.length]; A += a.x * b.y - b.x * a.y; } return Math.abs(A) / 2; }

function draw() {
  background(160, 25, 10);
  if (keyIsDown(UP_ARROW)) stepsPerFrame = Math.min(40, stepsPerFrame + 1);
  if (keyIsDown(DOWN_ARROW)) stepsPerFrame = Math.max(1, stepsPerFrame - 1);
  if (!paused && !drawing && !gone) {
    for (let k = 0; k < stepsPerFrame; k++) { if (gone) break; flowStep(); }
    let L = curveLength(pts), A = curveArea(pts);
    if (frameCount % 2 === 0) hist.push({ L, A, ratio: A > 1 ? (L * L) / (4 * Math.PI * A) : 1 });
    if (hist.length > 600) hist.shift();
  }
  // 最初の形（薄く）と残した形
  noFill(); stroke(0, 0, 100, 18); strokeWeight(1.5);
  closedShape(init);
  stroke(45, 70, 100, 35);
  for (let s of snaps) closedShape(s);
  // 今の曲線（曲率で色：出っぱり = 赤、へこみ = 青）
  if (!gone) {
    let n = pts.length;
    strokeWeight(3.5);
    for (let i = 0; i < n; i++) {
      let a = pts[(i - 1 + n) % n], p = pts[i], b = pts[(i + 1) % n];
      let lx = a.x - 2 * p.x + b.x, ly = a.y - 2 * p.y + b.y;
      let tx = b.x - a.x, ty = b.y - a.y;
      let k = (tx * ly - ty * lx);                         // 符号つき曲率（向きに対して左か右か）
      let kk = k / (h * h * h) * 40;
      stroke(kk > 0 ? 215 : 5, Math.min(100, Math.abs(kk) * 100), 100);
      line(p.x, p.y, b.x, b.y);
    }
  }
  if (drawing) { stroke(0, 0, 100, 70); strokeWeight(2); noFill(); beginShape(); for (let p of raw) vertex(p.x, p.y); endShape(); }

  drawGraph();
  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグ：閉曲線を描く　1〜4：プリセット　↑↓：速さ ' + stepsPerFrame + ' 歩/フレーム　スペース：' + (paused ? '再開' : '一時停止') + '　R：最初から　S：今の形を残す', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('∂p/∂t = κ n　（各点を隣の平均に近づける）　歩数 ' + stepN + '　点の数 ' + pts.length + '　長さ L = ' + nf(curveLength(pts), 1, 0) + '　面積 A = ' + nf(curveArea(pts), 1, 0) + '　等周比 L²/(4πA) = ' + nf(curveArea(pts) > 1 ? curveLength(pts) ** 2 / (4 * Math.PI * curveArea(pts)) : 1, 1, 3), 20, 66);
  if (gone) { fill(45, 90, 100); textSize(26); text('消えた！　丸くなってから 1 点に縮んだ（Grayson 1987）　R で最初から', 20, 110); }
}

function closedShape(p) { if (p.length < 2) return; beginShape(); for (let q of p) vertex(q.x, q.y); endShape(CLOSE); }
function drawGraph() {
  let gx = 20, gy = height - 170, gw = width - 40, gh = 140;
  noStroke(); fill(0, 0, 100, 6); rect(gx, gy, gw, gh, 8);
  if (hist.length < 2) return;
  let L0 = Math.max(hist[0].L, 1), A0 = Math.max(hist[0].A, 1), rmax = Math.max(1.05, ...hist.map((hh) => hh.ratio));
  noFill(); strokeWeight(2);
  for (let [key, hue, sc] of [['L', 45, L0], ['A', 130, A0]]) {
    stroke(hue, 70, 100); beginShape();
    for (let i = 0; i < hist.length; i++) vertex(gx + (i / 600) * gw, gy + gh - (hist[i][key] / sc) * (gh - 20));
    endShape();
  }
  stroke(300, 60, 100); beginShape();
  for (let i = 0; i < hist.length; i++) vertex(gx + (i / 600) * gw, gy + gh - ((hist[i].ratio - 1) / (rmax - 1)) * (gh - 20));
  endShape();
  noStroke(); textSize(13);
  fill(45, 70, 100); text('長さ L / L0', gx + 10, gy + 18);
  fill(130, 70, 100); text('面積 A / A0', gx + 110, gy + 18);
  fill(300, 60, 100); text('等周比 L²/(4πA) − 1（0 = 円）　今 ' + nf(hist[hist.length - 1].ratio, 1, 3), gx + 210, gy + 18);
}

function mousePressed() { if (mouseY < height - 180) { drawing = true; raw = [{ x: mouseX, y: mouseY }]; } }
function mouseDragged() { if (!drawing) return; let l = raw[raw.length - 1]; if (Math.hypot(mouseX - l.x, mouseY - l.y) > 3) raw.push({ x: mouseX, y: mouseY }); }
function mouseReleased() { if (!drawing) return; drawing = false; if (raw.length < 15) return; init = resample(raw, h); if (init.length >= 8) restart(); }
function keyPressed() {
  if (key >= '1' && key <= '4') setPreset(+key);
  if (key === ' ') paused = !paused;
  if (key === 'r' || key === 'R') restart();
  if (key === 's' || key === 'S') { if (snaps.length > 12) snaps.shift(); snaps.push(pts.map((p) => ({ x: p.x, y: p.y }))); }
}

// ---------- やってみよう ----------
// 1. ダンベル（2）は真ん中がくびれて切れそうに見えるが切れない（平面では必ず丸くなる）。3D の曲面（09）との違い
// 2. 等周比のグラフが単調に 1 に近づくのを見よう。どの形がいちばん時間がかかる？
// 3. 自分で「8 の字」のように交差した曲線を描くとどうなる？（Grayson の定理は単純閉曲線だけ）
// 4. sigma を 1.2 にすると不安定になってギザギザが育つ。なぜ？（熱方程式の安定条件）

// ==================================================
// ここから下は「曲線の道具」です（等間隔に打ち直す）
// （中身は読まなくても OK。消さないでね）
// ==================================================
function resample(src, h) {
  let out = [], acc = 0, n = src.length;
  out.push({ x: src[0].x, y: src[0].y });
  for (let i = 1; i <= n; i++) {
    let a = src[i - 1], b = src[i % n], d = Math.hypot(b.x - a.x, b.y - a.y), t = 0;
    if (d < 1e-9) continue;
    while (acc + (d - t) >= h) { let need = h - acc; t += need; acc = 0; out.push({ x: a.x + (b.x - a.x) * (t / d), y: a.y + (b.y - a.y) * (t / d) }); }
    acc += d - t;
  }
  if (out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < h * 0.5) out.pop();
  return out;
}
