// ============================================
// 09 ミウラ折り（3D）
// 平行四辺形をジグザグに並べた折り目。1 か所を引くだけで全体が一度に開閉する（自由度 1・剛体折り）
//   三浦公亮さんが考え、1995 年の宇宙実験衛星 SFU の太陽電池パネルや、地図の折り方に使われた
// ←→ = 折る量 / A = 自動で開閉 / ↑↓ = 平行四辺形の角 γ / 1・2 = 色 / ドラッグ = 視点
// ============================================

let nx = 12, ny = 10;       // ★ 平行四辺形の数（横・縦）
let a = 40, b = 40;         // ★ 平行四辺形の 2 辺（px）
let gammaDeg = 60;          // ★ 平行四辺形の角 γ（度）
let fold = 0.5;             // 折る量 θ（0 = 平ら、π/2 = たたみきり）
let auto = true, autoDir = 1;
let colorMode2 = 0;
let mainCam, hudCam, hud;
let curve = [];             // 面積比のグラフ

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hudCam = createCamera();
  mainCam = createCamera();
  mainCam.camera(380, -480, 520, 0, 0, 0, 0, 1, 0);
  hud = createGraphics(width, height);
  makeCurve();
}

// ★ ミウラ折りの単位の大きさ（Schenk & Guest 2013 の式）
//   H = 高さ、S・L = 横・縦の間隔、V = ジグザグのずれ
function cell(th) {
  let g = gammaDeg * PI / 180, tg = Math.tan(g);
  let q = Math.sqrt(1 + Math.cos(th) ** 2 * tg * tg);
  return {
    H: a * Math.sin(th) * Math.sin(g),
    S: b * Math.cos(th) * tg / q,
    L: a * Math.sqrt(1 - Math.sin(th) ** 2 * Math.sin(g) ** 2),
    V: b / q,
  };
}
// 頂点 (i, j) の位置
function node(c, i, j) {
  return [i * c.S, (j % 2) * -c.H, j * c.L + (i % 2) * c.V];
}
function area(th) { let c = cell(th); return (nx * c.S) * (ny * c.L + c.V); }
function makeCurve() {
  curve = [];
  let A0 = area(0);
  for (let k = 0; k <= 60; k++) { let th = k / 60 * HALF_PI; curve.push(area(th) / A0); }
}

function draw() {
  background(30, 28, 36);
  if (keyIsDown(RIGHT_ARROW)) { fold = min(HALF_PI - 0.02, fold + 0.01); auto = false; }
  if (keyIsDown(LEFT_ARROW)) { fold = max(0, fold - 0.01); auto = false; }
  if (auto) { fold += 0.006 * autoDir; if (fold > HALF_PI - 0.05 || fold < 0.02) autoDir *= -1; }

  setCamera(mainCam);
  orbitControl();
  ambientLight(110);
  directionalLight(255, 255, 255, -0.4, 1, -0.6);
  directionalLight(90, 90, 120, 0.5, -0.4, 0.6);
  let c = cell(fold);
  let w = nx * c.S, h = ny * c.L + c.V;
  push();
  translate(-w / 2, 0, -h / 2);
  stroke(40, 30, 30, 120); strokeWeight(1);
  beginShape(QUADS);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      if (colorMode2 === 0) fill((i + j) % 2 ? color(246, 240, 226) : color(226, 84, 72));
      else fill(80 + 140 * i / nx, 120 + 100 * j / ny, 220);
      let p = node(c, i, j), q = node(c, i + 1, j), r = node(c, i + 1, j + 1), s = node(c, i, j + 1);
      vertex(p[0], p[1], p[2]); vertex(q[0], q[1], q[2]); vertex(r[0], r[1], r[2]); vertex(s[0], s[1], s[2]);
    }
  }
  endShape();
  pop();

  clearDepth();
  setCamera(hudCam);
  drawHud(c);
  noStroke();
  image(hud, -width / 2, -height / 2, width, height);
}

function drawHud(c) {
  let c0 = cell(0);
  hud.clear();
  hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('←→：折る量　A：自動 ' + (auto ? 'ON' : 'off') + '　↑↓：角 γ = ' + gammaDeg + '°　1・2：色　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('どの平行四辺形も曲がらず、折り目の角度だけが一斉に変わる。横に縮むと縦も縮む（ふつうの物は横に縮むと縦にのびる）', 20, 68);
  let wr = c.S / c0.S, lr = (ny * c.L + c.V) / (ny * c0.L + c0.V), ar = wr * lr;
  hud.fill(255, 190, 40); hud.textSize(20);
  hud.text('折り角 θ = ' + nf(degrees(fold), 1, 1) + '°', 20, 110);
  hud.fill(220); hud.textSize(17);
  hud.text('横の長さ ' + nf(wr * 100, 1, 1) + '%　縦の長さ ' + nf(lr * 100, 1, 1) + '%', 20, 140);
  hud.text('占める面積 ' + nf(ar * 100, 1, 1) + '%　　高さ ' + nf(c.H, 1, 1) + ' px', 20, 166);
  // 面積比のグラフ
  let gx = width - 360, gy = height - 60, gw = 320, gh = 180;
  hud.fill(0, 0, 0, 120); hud.rect(gx - 40, gy - gh - 40, gw + 60, gh + 80, 8);
  hud.stroke(120); hud.strokeWeight(1);
  hud.line(gx, gy, gx + gw, gy); hud.line(gx, gy, gx, gy - gh);
  hud.noFill(); hud.stroke(255, 190, 40); hud.strokeWeight(2.5);
  hud.beginShape();
  curve.forEach((v, k) => hud.vertex(gx + gw * k / 60, gy - gh * v));
  hud.endShape();
  let mx = gx + gw * fold / HALF_PI, my = gy - gh * ar;
  hud.noStroke(); hud.fill(255); hud.circle(mx, my, 10);
  hud.textSize(13); hud.fill(200);
  hud.text('占める面積（平らなとき = 100%）', gx - 30, gy - gh - 16);
  hud.text('0°', gx - 6, gy + 18); hud.text('θ → 90°', gx + gw - 40, gy + 18); hud.text('100%', gx - 36, gy - gh + 4);
  hud.fill(170); hud.textSize(14);
  hud.text('宇宙では、打ち上げのときは小さくたたみ、軌道上で 1 本の腕を引くだけで広げる。\n逆にたたむときも同じ 1 本で戻せる（剛体折り＝紙がたわまない）', 20, height - 50);
}

function keyPressed() {
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW) { gammaDeg = min(85, gammaDeg + 5); makeCurve(); }
  if (key === DOWN_ARROW) { gammaDeg = max(20, gammaDeg - 5); makeCurve(); }
  if (key === '1') colorMode2 = 0;
  if (key === '2') colorMode2 = 1;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); hud = createGraphics(width, height); }

// ---------- やってみよう ----------
// 1. γ を 85° にすると？ 20° にすると？ どちらがコンパクトにたためる？ グラフで比べよう
// 2. a と b を変えて（例：a = 50, b = 20）、細長い平行四辺形のミウラ折りをつくろう
// 3. 1 つの頂点に集まる 4 本の折り目の角は γ, 180−γ, 180−γ, γ。08 の「ミウラ折りの頂点」と同じか確かめよう
// 4. 紙で A4 をミウラ折りにしてみよう（ネットに折り方の型紙がある）。対角の 2 つの角を引くと一気に開く
