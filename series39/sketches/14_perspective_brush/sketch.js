// ============================================
// 14 透視図法ブラシ
// 画面に描いた線を「地面の上の線」として受け取り（画面 → 地面の逆射影）、壁の高さぶん立ち上げて透視図にする
//   描いた線は世界座標（地面の X, Z）で覚えておくので、カメラを回すと 1 点透視 ↔ 2 点透視に同じ絵が変わる
//   地面のどの平行線も消失点に向かう。G で消失点へ向かう補助線（線路）を表示
// 地平線より下をドラッグ = 描く / ↑↓ = 壁の高さ / ←→ = カメラを回す / 1 = 1 点透視 / 2 = 2 点透視 / G = 補助線 / C = 消す / S = 保存 / R = リセット
// ============================================

let strokes = [];               // 描いた線 [{pts: [{X, Z}], h, hue}]
let wallH = 1.2;                // ★ 壁の高さ（m）
let eyeH = 1.6;                 // ★ 目の高さ（m）
let focal = 650;                // ★ 焦点距離（px）
let yaw = 0;                    // カメラの回転（0 = 1 点透視）
let showGuide = true;
let cur = null;                 // 描いている最中の線
let hueI = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}
function cx() { return width / 2; }
function cy() { return height * 0.45; }   // 地平線の高さ

// ★ 世界の点（地面の X, Z と高さ hgt）→ 画面。カメラは原点、目の高さ eyeH、yaw だけ回っている
function project(X, Z, hgt) {
  let c = Math.cos(yaw), s = Math.sin(yaw);
  let xc = c * X - s * Z, zc = s * X + c * Z, yc = eyeH - hgt;
  if (zc < 0.15) return null;
  return { x: cx() + (focal * xc) / zc, y: cy() + (focal * yc) / zc };
}
// ★ 画面の点 → 地面の点（逆射影）。地平線より上は地面に当たらない
function unproject(sx, sy) {
  let dx = (sx - cx()) / focal, dy = (sy - cy()) / focal;
  if (dy < 0.01) return null;
  let t = eyeH / dy, xc = dx * t, zc = t;
  let c = Math.cos(yaw), s = Math.sin(yaw);
  return { X: c * xc + s * zc, Z: -s * xc + c * zc };
}

function draw() {
  noStroke();
  fill(220, 40, 20); rect(0, 0, width, cy());
  fill(35, 40, 13); rect(0, cy(), width, height - cy());
  if (mouseIsPressed && cur && mouseY > 90) {
    let g = unproject(mouseX, mouseY);
    if (g) { let last = cur.pts[cur.pts.length - 1]; if (!last || Math.hypot(g.X - last.X, g.Z - last.Z) > 0.03) cur.pts.push(g); }
  }
  // 地面の格子（薄く）と消失点
  stroke(45, 30, 70, 14); strokeWeight(1);
  for (let k = -20; k <= 20; k += 2) { seg3(k, 0.5, 0, k, 200, 0); seg3(-200, k < 0.5 ? 0.5 : k, 0, 200, k < 0.5 ? 0.5 : k, 0); }
  stroke(45, 60, 100, 50); line(0, cy(), width, cy());
  let vz = project(0, 1e6, 0), vx = project(1e6, 1, 0), vx2 = project(-1e6, 1, 0);
  noStroke(); fill(45, 90, 100);
  for (let v of [vz, vx, vx2]) if (v && v.x > -50 && v.x < width + 50) circle(v.x, v.y, 10);

  // 線：地面の線、壁（半透明）、上の線、柱
  for (let st of [...strokes, cur].filter((s) => s && s.pts.length > 1)) {
    let P = st.pts, h = st.h;
    noStroke(); fill(st.hue, 50, 80, 35);
    for (let i = 1; i < P.length; i++) {
      let a = project(P[i - 1].X, P[i - 1].Z, 0), b = project(P[i].X, P[i].Z, 0), c = project(P[i].X, P[i].Z, h), d = project(P[i - 1].X, P[i - 1].Z, h);
      if (a && b && c && d) quad(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
    }
    stroke(st.hue, 70, 100); strokeWeight(2.5);
    for (let i = 1; i < P.length; i++) { seg3(P[i - 1].X, P[i - 1].Z, 0, P[i].X, P[i].Z, 0); seg3(P[i - 1].X, P[i - 1].Z, h, P[i].X, P[i].Z, h); }
    stroke(st.hue, 40, 100, 70); strokeWeight(1);
    for (let i = 0; i < P.length; i += 4) seg3(P[i].X, P[i].Z, 0, P[i].X, P[i].Z, h);
    if (showGuide) { stroke(45, 80, 100, 25); for (let i = 0; i < P.length; i += 6) seg3(P[i].X, P[i].Z, 0, P[i].X, P[i].Z + 400, 0); }
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('地平線より下をドラッグ＝描く　壁の高さ ' + nf(wallH, 1, 1) + ' m（↑↓）　カメラ ' + nf(degrees(yaw), 1, 0) + '°（←→）　1/2：1 点・2 点透視　G：補助線 ' + (showGuide ? 'ON' : 'off') + '　C：消す　S：保存　R：リセット', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('描いた線は「地面の上の線」。カメラを回しても同じ線が、別の消失点に向かって描き直される（黄色の点 = 軸方向の消失点）', 20, 68);
}
// 世界の線分を画面に描く（途中で手前に来るものは細かく刻む）
function seg3(X1, Z1, h1, X2, Z2, h2) {
  let a = project(X1, Z1, h1), b = project(X2, Z2, h2);
  if (a && b) { line(a.x, a.y, b.x, b.y); return; }
  let prev = null;
  for (let i = 0; i <= 20; i++) { let p = project(X1 + ((X2 - X1) * i) / 20, Z1 + ((Z2 - Z1) * i) / 20, h1 + ((h2 - h1) * i) / 20); if (p && prev) line(prev.x, prev.y, p.x, p.y); prev = p; }
}

function mousePressed() {
  if (mouseY > 90 && unproject(mouseX, mouseY)) { cur = { pts: [], h: wallH, hue: [15, 45, 200, 140, 300][hueI++ % 5] }; }
}
function mouseReleased() { if (cur && cur.pts.length > 1) strokes.push(cur); cur = null; }
function keyPressed() {
  if (key === UP_ARROW) wallH = min(4, wallH + 0.2);
  if (key === DOWN_ARROW) wallH = max(0, wallH - 0.2);
  if (key === LEFT_ARROW) yaw -= 0.05;
  if (key === RIGHT_ARROW) yaw += 0.05;
  if (key === '1') yaw = 0;
  if (key === '2') yaw = Math.PI / 6;
  if (key === 'g' || key === 'G') showGuide = !showGuide;
  if (key === 'c' || key === 'C') strokes = [];
  if (key === 's' || key === 'S') saveCanvas('perspective_brush', 'png');
  if (key === 'r' || key === 'R') { strokes = []; yaw = 0; wallH = 1.2; }
}

// ---------- やってみよう ----------
// 1. 画面の下のほうに横一直線を描いてから、← を押し続けて回す。地面の直線は回しても直線のまま？
// 2. 壁の高さを 0 にして、地面にだけ絵を描く。「上から見た地図」を描くつもりで描くと透視図はどう見える？
// 3. 四角い部屋を描いて（4 本の線）2 点透視にすると、建築のスケッチになる。eyeH を 0.3 にすると「床すれすれ」
// 4. 線に沿って柱を立てるかわりに、線を「屋根」にする（上の線をずらして斜めに）。ジオメトリは自由

