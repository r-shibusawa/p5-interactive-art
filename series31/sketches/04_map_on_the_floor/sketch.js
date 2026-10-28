// ============================================
// 04 地図の不動点（部屋の地図を床に置く）
// 部屋の地図を、その部屋の床に置く。どう置いても（回しても・縮めても）地図上の 1 点だけが「真下の床とぴったり同じ場所」になる
//   小さい地図 = 大きい地図を相似変換 T(p) = c + sR(p − O) したもの。不動点は (I − sR) p = c − sR·O を解けば求まる
// ドラッグ = 小さい地図を動かす / ←→ = 回す / ↑↓ = 大きさ / N = 地図の中の地図（入れ子）/ マウスを乗せる = その点の行き先 / R = リセット
// ============================================

let s = 0.32;            // ★ 縮小率（小さい地図の大きさ）
let theta = 0.35;        // ★ 回転角
let c;                   // 小さい地図の左上（画面座標）
let O;                   // 大きい地図の左上
let BW, BH;              // 大きい地図の大きさ
let mapG;                // 部屋の地図の絵
let nested = false;
let dragging = false, grabDx = 0, grabDy = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  BW = min(width - 80, (height - 140) * 1.6); BH = BW / 1.6;
  O = { x: (width - BW) / 2, y: 110 };
  c = { x: O.x + BW * 0.45, y: O.y + BH * 0.25 };
  mapG = createGraphics(BW, BH);
  drawRoom(mapG);
}

// ★ 相似変換 T：大きい地図の点 p → 小さい地図の上の同じ場所
function T(p) {
  let dx = p.x - O.x, dy = p.y - O.y, cs = Math.cos(theta), sn = Math.sin(theta);
  return { x: c.x + s * (cs * dx - sn * dy), y: c.y + s * (sn * dx + cs * dy) };
}
// 不動点：p = c + sR(p − O) を 2×2 の連立方程式として解く
function fixedPoint() {
  let cs = Math.cos(theta), sn = Math.sin(theta);
  let a = 1 - s * cs, b = s * sn, cc = -s * sn, d = 1 - s * cs;      // (I − sR)
  let rx = c.x - s * (cs * O.x - sn * O.y), ry = c.y - s * (sn * O.x + cs * O.y);
  let det = a * d - b * cc;
  return { x: (d * rx - b * ry) / det, y: (-cc * rx + a * ry) / det };
}

function draw() {
  background(230, 30, 11);
  keyHeld();                        // ←→↑↓ は押している間ずっと効く
  image(mapG, O.x, O.y);
  // 小さい地図（入れ子なら何重にも）
  push();
  let depth = nested ? 8 : 1;
  for (let k = 0; k < depth; k++) {
    translate(c.x, c.y); rotate(theta); scale(s); translate(-O.x, -O.y);
    drawingContext.shadowBlur = 20; drawingContext.shadowColor = 'rgba(0,0,0,0.6)';
    image(mapG, O.x, O.y);
    drawingContext.shadowBlur = 0;
    noFill(); stroke(45, 90, 100); strokeWeight(3 / Math.pow(s, k + 1));
    rect(O.x, O.y, BW, BH);
  }
  pop();

  // マウスの点 p → T(p) → T²(p) → … （不動点へ吸い込まれる）
  let fp = fixedPoint();
  if (mouseX > O.x && mouseX < O.x + BW && mouseY > O.y && mouseY < O.y + BH && !dragging) {
    let p = { x: mouseX, y: mouseY };
    for (let i = 0; i < 6; i++) {
      let q = T(p);
      stroke(190, 80, 100, 90 - i * 12); strokeWeight(2);
      line(p.x, p.y, q.x, q.y);
      noStroke(); fill(190, 80, 100, 90 - i * 12); circle(q.x, q.y, 7);
      p = q;
    }
    noStroke(); fill(190, 80, 100); circle(mouseX, mouseY, 10);
  }

  // 不動点
  let inside = fp.x > O.x && fp.x < O.x + BW && fp.y > O.y && fp.y < O.y + BH;
  noFill(); stroke(0, 90, 100); strokeWeight(3);
  circle(fp.x, fp.y, 26); line(fp.x - 18, fp.y, fp.x + 18, fp.y); line(fp.x, fp.y - 18, fp.x, fp.y + 18);
  noStroke(); fill(0, 90, 100); circle(fp.x, fp.y, 6);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('縮小率 s = ' + nf(s, 1, 2) + '（↑↓）　回転 θ = ' + nf(degrees(theta), 1, 0) + '°（←→）　ドラッグ：地図を動かす　N：入れ子 ' + (nested ? 'ON' : 'off') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text(inside ? '赤い十字 = 不動点。大きい地図のその場所と、小さい地図のその場所が、画面上でぴったり重なる（上に乗せた地図の「ここ」が本当に「ここ」）'
              : '小さい地図が部屋からはみ出すと、不動点が部屋の外に出ることもある（ブラウワーの条件「自分の中へ写す」が崩れた）', 20, 68);
  fill(190, 80, 100); textSize(14);
  text('水色：マウスの点 p → T(p) → T²(p) → …　入れ子（N）にすると地図の中の地図の中の … が不動点に縮む（02 の縮小写像）', 20, height - 18);
}

function insideSmall(x, y) {
  // 小さい地図の中か？：逆変換で大きい地図の座標に戻して判定
  let dx = x - c.x, dy = y - c.y, cs = Math.cos(-theta), sn = Math.sin(-theta);
  let u = (cs * dx - sn * dy) / s, v = (sn * dx + cs * dy) / s;
  return u >= 0 && u <= BW && v >= 0 && v <= BH;
}
function mousePressed() {
  if (insideSmall(mouseX, mouseY)) { dragging = true; grabDx = mouseX - c.x; grabDy = mouseY - c.y; }
}
function mouseDragged() { if (dragging) { c.x = mouseX - grabDx; c.y = mouseY - grabDy; } }
function mouseReleased() { dragging = false; }
function keyPressed() {
  if (key === 'n' || key === 'N') nested = !nested;
  if (key === 'r' || key === 'R') { s = 0.32; theta = 0.35; c = { x: O.x + BW * 0.45, y: O.y + BH * 0.25 }; }
}
function keyHeld() {
  if (keyIsDown(LEFT_ARROW)) theta -= 0.02;
  if (keyIsDown(RIGHT_ARROW)) theta += 0.02;
  if (keyIsDown(UP_ARROW)) s = min(0.9, s + 0.005);
  if (keyIsDown(DOWN_ARROW)) s = max(0.08, s - 0.005);
}

// ---------- やってみよう ----------
// 1. 小さい地図を大きい地図の左上ぴったりに重ね、θ = 0 にすると不動点はどこ？（左上の角）
// 2. 小さい地図を部屋の外へドラッグすると不動点はどうなる？ 部屋の中に不動点が残るのはどんなとき？
// 3. s を 0.9 にして回すと不動点はどう動く？ s = 1（同じ大きさ）にすると何が起きる？（det = 0 に注意）
// 4. drawRoom を書きかえて自分の部屋・教室・キャンパスの地図にしよう

// ==================================================
// ここから下は「道具」（部屋の地図を描く・キー押しっぱなし）
// ==================================================
function drawRoom(G) {
  G.colorMode(HSB, 360, 100, 100, 100);
  G.background(35, 20, 85);
  G.stroke(35, 15, 75); G.strokeWeight(1);
  let t = G.width / 16;
  for (let x = 0; x < G.width; x += t) G.line(x, 0, x, G.height);       // 床板
  G.noFill(); G.stroke(220, 30, 25); G.strokeWeight(G.width * 0.015);
  G.rect(0, 0, G.width, G.height);                                    // 壁
  G.noStroke();
  G.fill(20, 50, 60); G.rect(G.width * 0.08, G.height * 0.1, G.width * 0.3, G.height * 0.16, 8);    // 本棚
  G.fill(210, 40, 65); G.rect(G.width * 0.62, G.height * 0.62, G.width * 0.3, G.height * 0.24, 20); // ソファ
  G.fill(30, 60, 70); G.ellipse(G.width * 0.5, G.height * 0.5, G.width * 0.22, G.height * 0.3);     // テーブル
  G.fill(120, 50, 55);
  for (let p of [[0.9, 0.12], [0.1, 0.85], [0.92, 0.45]]) G.circle(G.width * p[0], G.height * p[1], G.width * 0.06);  // 植木
  G.fill(0, 60, 75); G.rect(G.width * 0.15, G.height * 0.55, G.width * 0.14, G.height * 0.25, 6);   // ベッド
  G.fill(0, 0, 100); G.rect(G.width * 0.17, G.height * 0.57, G.width * 0.1, G.height * 0.06, 4);
  G.noFill(); G.stroke(220, 30, 25); G.strokeWeight(3);
  G.arc(G.width * 0.75, 0, G.width * 0.14, G.width * 0.14, 0, HALF_PI);                            // ドア
  G.noStroke(); G.fill(220, 30, 25); G.textSize(G.width * 0.025);
  G.text('本棚', G.width * 0.2, G.height * 0.2); G.text('ソファ', G.width * 0.73, G.height * 0.75);
  G.text('テーブル', G.width * 0.46, G.height * 0.51); G.text('ベッド', G.width * 0.18, G.height * 0.7); G.text('ドア', G.width * 0.77, G.height * 0.08);
  G.text('N ↑', G.width * 0.93, G.height * 0.94);
}
