// ============================================
// 15 カメラで折る（おまけ）
// カメラの映像を「紙」にして、マウスで引いた線で折る。折られた部分は鏡に映したように裏返り、紙の裏（白）が見える
//   00 と同じ「面の切り分け + 鏡映」を、映像を貼った紙でやる。何回でも重ねて折れる
// ドラッグ = 折り線を引く（線の右側が手前に折れる）/ Z = 戻す / R = 広げる / B = カメラ ⇄ 模様 / S = 保存（カメラの許可が必要）
// ============================================

let cap;
let vw = 320, vh = 240;          // ★ カメラ画像の大きさ
let foldFrames = 24;             // ★ 折るアニメーションの長さ（フレーム）
let backAlpha = 0.82;            // ★ 裏の白さ（1 = 真っ白、0 = 映像が透ける）
let faces = [], history = [];
let dragA = null;
let anim = null;                 // 折っている途中 { L, side, t, result }
let pattern;
let usePattern = false;
let W, H, ox, oy;

function setup() {
  createCanvas(windowWidth, windowHeight);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  pattern = makePattern();
  resetPaper();
}
function resetPaper() {
  H = min(height - 200, (width - 120) * 0.75); W = H * 4 / 3;
  ox = width / 2 - W / 2; oy = 120;
  faces = [{ pts: [{ x: ox, y: oy }, { x: ox + W, y: oy }, { x: ox + W, y: oy + H }, { x: ox, y: oy + H }], M: ident(), back: false, z: 0 }];
  history = []; anim = null;
}
function camReady() { return !usePattern && cap && cap.width > 0 && cap.elt.readyState >= 2; }

// ★ 折る：直線 L の side 側の面を鏡に映して上に重ねる（00 と同じ）
function foldFaces(fs, L, side) {
  let maxZ = 0;
  for (let f of fs) maxZ = max(maxZ, f.z);
  let R = partialFold(L, 2), out = [];
  for (let f of fs) {
    let keep = clipHalf(f.pts, L, -side), move = clipHalf(f.pts, L, side);
    if (keep.length >= 3) out.push({ pts: keep, M: f.M, back: f.back, z: f.z, moving: false });
    if (move.length >= 3) out.push({ pts: move, M: f.M, back: f.back, z: 2 * maxZ + 1 - f.z, moving: true });
  }
  // moving の面は、アニメーションの最後に R をかける
  return { faces: out, R };
}

function draw() {
  background(30, 28, 36);
  let src = camReady() ? cap.elt : pattern.elt;
  let flip = camReady();

  if (anim) {
    anim.t++;
    let phi = PI * min(1, anim.t / foldFrames);
    let P = partialFold(anim.L, 1 - Math.cos(phi));        // 途中：折り線からの距離が cos φ 倍
    let shown = anim.res.faces.map((f) => f.moving
      ? { pts: f.pts.map((p) => apply(P, p)), M: compose(P, f.M), back: phi > HALF_PI ? !f.back : f.back, z: f.z }
      : f);
    drawFaces(shown, src, flip);
    if (anim.t >= foldFrames) {
      faces = anim.res.faces.map((f) => f.moving
        ? { pts: f.pts.map((p) => apply(anim.res.R, p)), M: compose(anim.res.R, f.M), back: !f.back, z: f.z }
        : { pts: f.pts, M: f.M, back: f.back, z: f.z });
      anim = null;
    }
  } else drawFaces(faces, src, flip);

  // 引いている折り線
  if (dragA && !anim && dist(dragA.x, dragA.y, mouseX, mouseY) > 10) {
    let L = lineOf(dragA, { x: mouseX, y: mouseY });
    stroke(255, 220, 90); strokeWeight(2);
    drawingContext.setLineDash([10, 8]);
    line(L.p.x - L.u.x * 3000, L.p.y - L.u.y * 3000, L.p.x + L.u.x * 3000, L.p.y + L.u.y * 3000);
    drawingContext.setLineDash([]);
    // 折れる側に矢印
    let nx = -L.u.y, ny = L.u.x, mx = (dragA.x + mouseX) / 2, my = (dragA.y + mouseY) / 2;
    strokeWeight(3); line(mx + nx * 50, my + ny * 50, mx - nx * 30, my - ny * 30);
    noStroke(); fill(255, 220, 90); circle(mx - nx * 30, my - ny * 30, 10);
  }

  noStroke(); fill(255); textSize(18);
  text('ドラッグ：折り線を引く（線の右側が手前に折れる）　Z：戻す　R：広げる　B：' + (camReady() ? 'カメラ' : '模様') + '　S：保存　　層の数 ' + faces.length, 20, 40);
  fill(170); textSize(15);
  text(camReady() ? '紙 = カメラの映像。折っても映像は動き続ける：折られた部分は、もとの紙の位置の映像を鏡に映して見せている' : 'カメラが使えないときは模様の紙。アドレスバーでカメラを許可すると映像の紙になる（B で切りかえ）', 20, 68);
}

function drawFaces(fs, src, flip) {
  let ctx = drawingContext;
  let sorted = fs.slice().sort((a, b) => a.z - b.z);
  for (let f of sorted) {
    ctx.save();
    ctx.beginPath();
    f.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ddd'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.clip();
    // もとの紙の位置に映像を貼り、面の変換 M をかけて今の位置へ
    ctx.save();
    ctx.transform(f.M.a, f.M.c, f.M.b, f.M.d, f.M.e, f.M.f);
    if (flip) { ctx.translate(ox + W, oy); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0, W, H); }
    else ctx.drawImage(src, ox, oy, W, H);
    ctx.restore();
    if (f.back) { ctx.fillStyle = 'rgba(244,238,224,' + backAlpha + ')'; ctx.fillRect(0, 0, width, height); }
    ctx.strokeStyle = 'rgba(60,40,40,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
}

function mousePressed() { if (!anim) dragA = { x: mouseX, y: mouseY }; }
function mouseReleased() {
  if (dragA && !anim && dist(dragA.x, dragA.y, mouseX, mouseY) > 10) {
    let L = lineOf(dragA, { x: mouseX, y: mouseY });
    let res = foldFaces(faces, L, 1);                  // 線の右側（画面の向きで）が折れる
    if (res.faces.some((f) => f.moving)) { history.push(faces); anim = { L, t: 0, res }; }
  }
  dragA = null;
}
function keyPressed() {
  if ((key === 'z' || key === 'Z') && history.length && !anim) faces = history.pop();
  if (key === 'r' || key === 'R') resetPaper();
  if (key === 'b' || key === 'B') usePattern = !usePattern;
  if (key === 's' || key === 'S') saveCanvas('folded_camera', 'png');
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); resetPaper(); }

// カメラがないときの紙：青海波（せいがいは）の模様
function makePattern() {
  let g = createGraphics(640, 480);
  g.background(30, 60, 120);
  g.noFill();
  let r = 40;
  for (let row = -1; row < 480 / (r / 2) + 2; row++) {
    for (let col = -1; col < 640 / r + 2; col++) {
      let x = col * r * 2 + (row % 2) * r, y = row * r / 2;
      for (let k = 4; k >= 1; k--) { g.fill(k % 2 ? color(40, 90, 170) : color(235, 225, 200)); g.stroke(20, 40, 90); g.circle(x, y, r * 2 * k / 4); }
    }
  }
  g.noStroke(); g.fill(255); g.textSize(40); g.text('PAPER', 20, 460);
  return g;
}

// ---------- やってみよう ----------
// 1. 自分の顔を半分に折ってみよう。折り線の上の点だけは動かない（鏡映の「軸」）
// 2. 4 回折ってから R。00 の「折り目」と同じように、どこを折ったか思い出せる？
// 3. backAlpha を 0.3 にすると裏から映像が透ける。トレーシングペーパーみたいに
// 4. foldFrames を大きくしてゆっくり折る。途中の形は「折り線からの距離 × cos φ」で計算している


// ==================================================
// ここから下は「折り紙の幾何の道具」（00 と同じ）
// ==================================================
function lineOf(a, b) { let dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { p: a, u: { x: dx / l, y: dy / l } }; }
function sdist(q, L) { return (q.x - L.p.x) * -L.u.y + (q.y - L.p.y) * L.u.x; }
function clipHalf(pts, L, side) {
  let out = [];
  for (let i = 0; i < pts.length; i++) {
    let a = pts[i], b = pts[(i + 1) % pts.length];
    let sa = sdist(a, L) * side, sb = sdist(b, L) * side;
    if (sa >= -1e-6) out.push(a);
    if ((sa > 1e-6 && sb < -1e-6) || (sa < -1e-6 && sb > 1e-6)) { let t = sa / (sa - sb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
  }
  return out;
}
function ident() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
function apply(M, p) { return { x: M.a * p.x + M.b * p.y + M.e, y: M.c * p.x + M.d * p.y + M.f }; }
function compose(A, B) { // B をしてから A をする
  return { a: A.a * B.a + A.b * B.c, b: A.a * B.b + A.b * B.d, c: A.c * B.a + A.d * B.c, d: A.c * B.b + A.d * B.d,
    e: A.a * B.e + A.b * B.f + A.e, f: A.c * B.e + A.d * B.f + A.f };
}
// 折り線 L からの距離を (1 − k) 倍にする変換。k = 2 で鏡映、k = 1 − cos φ で折りの途中
function partialFold(L, k) {
  let nx = -L.u.y, ny = L.u.x;
  let a = 1 - k * nx * nx, b = -k * nx * ny, d = 1 - k * ny * ny;
  return { a, b, c: b, d, e: L.p.x - (a * L.p.x + b * L.p.y), f: L.p.y - (b * L.p.x + d * L.p.y) };
}
