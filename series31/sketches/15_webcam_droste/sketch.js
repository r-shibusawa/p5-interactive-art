// ============================================
// 15 カメラのフィードバック（ビデオの不動点）📷
// 前のフレームを、縮めて回して今の映像の上に貼る、を毎フレームくり返す → 映像の中に映像の中に映像…（ドロステ効果）
//   貼り方は相似変換 T(p) = c + sR(p − c)。どこまで潜っても動かない点 c が不動点 = うずの中心（02・04 と同じ）
// クリック = うずの中心 c / ←→ = 回転 / ↑↓ = 縮小率 / F = 映像を止める / B = 枠 / S = 保存（カメラがないときは模様で動く）
// ============================================

let cap;
let FW = 640, FH = 400;     // ★ フィードバック用の画像の大きさ（小さいほど速い）
let s = 0.78;               // ★ 縮小率
let theta = 0.18;           // ★ 回転角
let c;                      // 不動点（画像の座標）
let fbA, fbB, srcG;
let frozen = false, border = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  FH = round(FW * height / width);
  fbA = createGraphics(FW, FH); fbB = createGraphics(FW, FH); srcG = createGraphics(FW, FH);
  for (let g of [fbA, fbB, srcG]) g.pixelDensity(1);
  c = { x: FW * 0.62, y: FH * 0.45 };
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(320, 240);
  cap.hide();
}

function draw() {
  keyHeld();                        // ←→↑↓ は押している間ずっと効く
  // 1. 今の映像（止めていなければ更新）
  if (!frozen) {
    if (camReady()) {
      // 縦横比を保ったまま画面いっぱいに
      let sc = max(FW / cap.width, FH / cap.height), w = cap.width * sc, h = cap.height * sc;
      srcG.image(cap, (FW - w) / 2, (FH - h) / 2, w, h);
    } else drawPattern(srcG);
  }
  // 2. 今の映像の上に、前のフレームを T で縮めて回して貼る
  fbB.image(srcG, 0, 0);
  fbB.push();
  fbB.translate(c.x, c.y); fbB.rotate(theta); fbB.scale(s); fbB.translate(-c.x, -c.y);   // ★ T(p) = c + sR(p − c)
  fbB.image(fbA, 0, 0);
  if (border) { fbB.noFill(); fbB.stroke(255, 220, 90); fbB.strokeWeight(6); fbB.rect(0, 0, FW, FH); }
  fbB.pop();
  // 3. 入れ替えて表示
  let tmp = fbA; fbA = fbB; fbB = tmp;
  image(fbA, 0, 0, width, height);

  // 不動点と、四隅の点が T をくり返すとどこへ行くか
  let k = width / FW;
  let corners = [[0, 0], [FW, 0], [FW, FH], [0, FH]];
  for (let p of corners) {
    let q = { x: p[0], y: p[1] };
    noFill(); stroke(0, 0, 100, 70); strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < 14; i++) { vertex(q.x * k, q.y * k); q = T(q); }
    endShape();
  }
  noFill(); stroke(0, 90, 100); strokeWeight(3);
  circle(c.x * k, c.y * k, 30); line(c.x * k - 22, c.y * k, c.x * k + 22, c.y * k); line(c.x * k, c.y * k - 22, c.x * k, c.y * k + 22);

  noStroke(); fill(0, 0, 0, 55); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text('縮小率 s = ' + nf(s, 1, 2) + '（↑↓）　回転 ' + nf(degrees(theta), 1, 0) + '°（←→）　クリック：うずの中心　F：映像を止める ' + (frozen ? 'ON' : 'off') + '　B：枠　S：保存' + (camReady() ? '' : '　（カメラ待ち：模様で表示中）'), 20, 40);
  fill(0, 0, 75); textSize(15);
  text('赤い十字 = 不動点 c（T で動かない点）。白い線 = 四隅が T, T², T³ … で c に吸い込まれる道。s → 1 だと吸い込みがゆっくり、回転を足すとうずになる', 20, 68);
}

function T(p) {
  let dx = p.x - c.x, dy = p.y - c.y, cs = Math.cos(theta), sn = Math.sin(theta);
  return { x: c.x + s * (cs * dx - sn * dy), y: c.y + s * (sn * dx + cs * dy) };
}

function mousePressed() { if (mouseY > 84) c = { x: mouseX / width * FW, y: mouseY / height * FH }; }
function keyPressed() {
  if (key === 'f' || key === 'F') frozen = !frozen;
  if (key === 'b' || key === 'B') border = !border;
  if (key === 's' || key === 'S') saveCanvas('droste', 'png');
}
function keyHeld() {
  if (keyIsDown(LEFT_ARROW)) theta -= 0.01;
  if (keyIsDown(RIGHT_ARROW)) theta += 0.01;
  if (keyIsDown(UP_ARROW)) s = min(0.97, s + 0.004);
  if (keyIsDown(DOWN_ARROW)) s = max(0.2, s - 0.004);
}

// ---------- やってみよう ----------
// 1. θ = 0 にすると、ただの「合わせ鏡」のトンネル。c をクリックで動かして、トンネルの奥がどこを向くか見よう
// 2. 手をカメラの前で動かすと、動きが渦を巻いて奥へ流れていく。s を 0.95 にすると？
// 3. F で止めてから中心を動かすと、絵がどう変わる？ 止めても不動点は c のまま
// 4. fbB.scale(s) を fbB.scale(s, -s) にすると（裏返し）、不動点はどうなる？ 04 の地図と比べよう

// ==================================================
// ここから下は「道具」
// ==================================================
// カメラが映像を送り始めたか（cap.width が 0 の間は模様を表示する）
function camReady() { return cap && cap.width > 0 && cap.elt && cap.elt.readyState >= 2; }
// カメラがないときの模様
function drawPattern(g) {
  g.colorMode(HSB, 360, 100, 100, 100);
  g.background(230, 30, 15);
  g.noStroke();
  let t = frameCount * 0.02;
  for (let i = 0; i < 12; i++) {
    g.fill((i * 30 + frameCount) % 360, 70, 95);
    g.circle(FW / 2 + Math.cos(t + i) * FW * 0.35, FH / 2 + Math.sin(t * 1.3 + i * 2) * FH * 0.35, 40 + 20 * Math.sin(t + i));
  }
  g.fill(0, 0, 100); g.textSize(28); g.textAlign(CENTER, CENTER);
  g.text('カメラなし（許可するとあなたの映像に）', FW / 2, FH * 0.12);
}
