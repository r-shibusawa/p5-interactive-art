// ============================================
// 03 ジョルダン曲線定理
// 自分と交わらない閉じた曲線は、平面を「内側」と「外側」のちょうど 2 つに分ける（当たり前に見えて証明はむずかしい）
//   ある点が内側かどうかは、そこから半直線を出して曲線と交わる回数を数えればわかる：奇数 → 内側、偶数 → 外側
// ドラッグ = 閉じた曲線を描く / クリック = 調べる点を置く / ←→ = 半直線の向き / 1 = 迷路のようなうずまき / 2 = ぐにゃぐにゃの円 / F = 内側を塗る / C = 消す
// ============================================

let curvePts = [];            // 閉じた曲線（折れ線）
let drawing = [], isDrawing = false;
let probe = null;             // 調べる点
let rayAngle = 0;             // ★ 半直線の向き（ラジアン）
let showFill = false;
let fillG, fillDirty = true;
let fillRes = 6;              // ★ 塗りの細かさ（px）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  fillG = createGraphics(ceil(width / fillRes), ceil(height / fillRes));
  fillG.colorMode(HSB, 360, 100, 100, 100);
  spiralPreset();
  probe = { x: width / 2 + 20, y: height / 2 + 30 };
}

function spiralPreset() {
  // うずまきの帯（外側のうずと内側のうずをつないだ 1 本の閉曲線）
  let cx = width / 2, cy = height / 2 + 30, a = min(width, height) * 0.03, b = min(width, height) * 0.022, gap = b * 2.6;
  let outPts = [], inPts = [];
  for (let t = 0; t <= 5 * PI; t += 0.05) {
    let r = a + b * t;
    outPts.push({ x: cx + r * cos(t), y: cy + r * sin(t) });
    inPts.push({ x: cx + (r + gap) * cos(t), y: cy + (r + gap) * sin(t) });
  }
  curvePts = outPts.concat(inPts.reverse());
  fillDirty = true;
}
function blobPreset() {
  curvePts = [];
  let cx = width / 2, cy = height / 2 + 30, R = min(width, height) * 0.3;
  for (let t = 0; t < TWO_PI; t += 0.02) {
    let r = R * (1 + 0.35 * sin(3 * t) + 0.2 * sin(7 * t + 1));
    curvePts.push({ x: cx + r * cos(t), y: cy + r * sin(t) });
  }
  fillDirty = true;
}

// ★ 半直線（点 p から角度 a の方向）と曲線の交点をすべて求める
function rayHits(p, a) {
  let dx = Math.cos(a), dy = Math.sin(a), hits = [];
  for (let i = 0; i < curvePts.length; i++) {
    let A = curvePts[i], B = curvePts[(i + 1) % curvePts.length];
    let ex = B.x - A.x, ey = B.y - A.y;
    let den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    let t = ((A.x - p.x) * ey - (A.y - p.y) * ex) / den;      // 半直線の上の位置
    let u = ((A.x - p.x) * dy - (A.y - p.y) * dx) / den;      // 線分の上の位置（0〜1）
    if (t > 0 && u >= 0 && u < 1) hits.push({ x: p.x + dx * t, y: p.y + dy * t, t });
  }
  return hits;
}

// 速い内外判定（偶奇規則：右向きの半直線）
function inside(x, y) {
  let c = false;
  for (let i = 0, j = curvePts.length - 1; i < curvePts.length; j = i++) {
    let a = curvePts[i], b = curvePts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function draw() {
  background(30, 25, 12);
  if (showFill) {
    if (fillDirty) makeFill();
    image(fillG, 0, 0, fillG.width * fillRes, fillG.height * fillRes);
  }
  // 曲線
  noFill(); stroke(30, 80, 100); strokeWeight(3);
  if (curvePts.length > 2) { beginShape(); for (let p of curvePts) vertex(p.x, p.y); endShape(CLOSE); }
  if (isDrawing && drawing.length > 1) { stroke(50, 60, 100); beginShape(); for (let p of drawing) vertex(p.x, p.y); endShape(); }

  if (keyIsDown(LEFT_ARROW)) rayAngle -= 0.02;
  if (keyIsDown(RIGHT_ARROW)) rayAngle += 0.02;
  let info = '';
  if (probe && curvePts.length > 2) {
    let hits = rayHits(probe, rayAngle), n = hits.length, isIn = n % 2 === 1;
    let far = max(width, height) * 1.5;
    stroke(isIn ? 140 : 0, 70, 100); strokeWeight(2);
    line(probe.x, probe.y, probe.x + cos(rayAngle) * far, probe.y + sin(rayAngle) * far);
    hits.sort((a, b) => a.t - b.t);
    textSize(14); textAlign(CENTER, CENTER);
    hits.forEach((h, k) => { noStroke(); fill(50, 90, 100); circle(h.x, h.y, 18); fill(0, 0, 0); text(k + 1, h.x, h.y); });
    textAlign(LEFT, BASELINE);
    noStroke(); fill(isIn ? 140 : 0, 70, 100); circle(probe.x, probe.y, 16);
    info = '交わる回数 ' + n + ' → ' + (n % 2 ? '奇数なので 内側' : '偶数なので 外側');
    fill(isIn ? 140 : 0, 70, 100); textSize(30); text(info, 20, height - 40);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグ：曲線を描く　クリック：調べる点　←→：半直線の向き　1：うずまき　2：ぐにゃぐにゃの円　F：内側を塗る ' + (showFill ? 'ON' : 'off') + '　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('うずまきの中心は内側？外側？ 目で追うのは大変でも、交わる回数を数えれば一瞬。半直線の向きを変えても奇数・偶数は変わらない', 20, 68);
}

function makeFill() {
  fillG.clear(); fillG.noStroke();
  if (curvePts.length > 2) for (let y = 0; y < fillG.height; y++) for (let x = 0; x < fillG.width; x++) {
    if (inside((x + 0.5) * fillRes, (y + 0.5) * fillRes)) { fillG.fill(140, 50, 45, 70); fillG.rect(x, y, 1, 1); }
  }
  fillDirty = false;
}

function mousePressed() { drawing = [{ x: mouseX, y: mouseY }]; isDrawing = true; }
function mouseDragged() { if (isDrawing) { let l = drawing[drawing.length - 1]; if (Math.hypot(mouseX - l.x, mouseY - l.y) > 4) drawing.push({ x: mouseX, y: mouseY }); } }
function mouseReleased() {
  if (drawing.length > 10) { curvePts = drawing; fillDirty = true; }
  else if (mouseY > 90) probe = { x: mouseX, y: mouseY };   // 短いドラッグ ＝ クリック
  isDrawing = false; drawing = [];
}
function keyPressed() {
  if (key === '1') spiralPreset();
  if (key === '2') blobPreset();
  if (key === 'f' || key === 'F') showFill = !showFill;
  if (key === 'c' || key === 'C') { curvePts = []; fillDirty = true; }
}

// ---------- やってみよう ----------
// 1. うずまきの巻き数（5 * PI）を増やして、中心が内側か外側かを予想してから点を置いてみよう
// 2. 自分と交わる「8 の字」を描くと、内側・外側はどうなる？（偶奇規則は「交わり方」で答えを決める）
// 3. 半直線が曲線の角（頂点）をちょうど通るとき、数え間違えないための工夫を考えよう
// 4. inside() は塗りつぶしソフトの「バケツ」や、ゲームの当たり判定でも使われている。マウスが内側なら色を変える遊びをつくろう
