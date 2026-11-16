// ============================================
// 11 歩くほど道になる ─ アクティブウォーカーモデル（Helbing）
// 芝生を横切る人は、目的地の方向に歩きながら、すでに踏まれて歩きやすい所（踏み跡）に少し引き寄せられる
// 歩いた所は踏み固められ、だれも歩かない所は芝生がまた生えてくる。すると「みんなで少しずつ遠回りして共有する道」のネットワークができる
// クリック = 入口を追加（最大 8）/ C = 入口を 4 つに戻す / ↑↓ = 踏み跡への引かれやすさ κ / ←→ = 芝生が戻る速さ / R = 芝生をリセット
// ============================================

let GW = 180, GH = 110;          // ★ 芝生の格子（1 マス = 1 m とする）
let nWalkers = 140;              // ★ 歩く人の数
let kappa = 6;                   // 踏み跡への引かれやすさ κ
let trample = 0.1;               // ★ 1 歩で踏み固める強さ
let regrowT = 900;               // 芝生が戻る時間（フレーム）
let speedC = 0.45;               // ★ 1 ステップに歩くマス数
let stepsPerFrame = 2;
let G, V, tmpA, walkers = [], gates = [];
let buf, lenHist = [], detHist = [], trips = [], netLen = 0, direct = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buf = createGraphics(GW, GH); buf.pixelDensity(1);
  G = new Float32Array(GW * GH); V = new Float32Array(GW * GH); tmpA = new Float32Array(GW * GH);
  defaultGates();
}

function defaultGates() {
  gates = [[6, 8], [GW - 7, 14], [GW - 10, GH - 8], [12, GH - 12]];
  resetWalkers();
}
function resetWalkers() {
  walkers = [];
  for (let i = 0; i < nWalkers; i++) walkers.push(spawn(Math.floor(Math.random() * gates.length), true));
  trips = []; lenHist = []; detHist = [];
  direct = 0;                                                    // 入口どうしを全部まっすぐ結んだ長さ（比べる目安）
  for (let i = 0; i < gates.length; i++) for (let j = i + 1; j < gates.length; j++) direct += Math.hypot(gates[i][0] - gates[j][0], gates[i][1] - gates[j][1]);
}
function spawn(from, scatter) {
  let to = Math.floor(Math.random() * (gates.length - 1)); if (to >= from) to++;
  let w = { x: gates[from][0], y: gates[from][1], to, walked: 0, sx: gates[from][0], sy: gates[from][1] };
  if (scatter) { let t = Math.random(); w.x += (gates[to][0] - w.x) * t; w.y += (gates[to][1] - w.y) * t; w.sx = w.x; w.sy = w.y; }
  return w;
}
function idx(x, y) { return constrain(Math.floor(y), 0, GH - 1) * GW + constrain(Math.floor(x), 0, GW - 1); }

// 見える踏み跡 V = 踏み固め G をぼかしたもの（遠くの道もぼんやり見える）
function blurField() {
  let R = 4;
  for (let y = 0; y < GH; y++) { let s = 0; for (let x = -R; x <= R; x++) s += G[y * GW + constrain(x, 0, GW - 1)];
    for (let x = 0; x < GW; x++) { tmpA[y * GW + x] = s / (2 * R + 1); s += G[y * GW + Math.min(x + R + 1, GW - 1)] - G[y * GW + Math.max(x - R, 0)]; } }
  for (let x = 0; x < GW; x++) { let s = 0; for (let y = -R; y <= R; y++) s += tmpA[constrain(y, 0, GH - 1) * GW + x];
    for (let y = 0; y < GH; y++) { V[y * GW + x] = s / (2 * R + 1); s += tmpA[Math.min(y + R + 1, GH - 1) * GW + x] - tmpA[Math.max(y - R, 0) * GW + x]; } }
}

// ★ 1 人の 1 歩：目的地の向き ＋ κ × 踏み跡の坂（∇V）
function walk(w) {
  let gx = gates[w.to][0] - w.x, gy = gates[w.to][1] - w.y, gd = Math.hypot(gx, gy);
  if (gd < 2) {                                                 // 着いた：遠回り率を記録して、次の目的地へ
    let straight = Math.hypot(w.x - w.sx, w.y - w.sy);
    if (straight > 20) { trips.push(w.walked / straight); if (trips.length > 60) trips.shift(); }
    Object.assign(w, spawn(w.to, false));
    return;
  }
  let vx = (V[idx(w.x + 1, w.y)] - V[idx(w.x - 1, w.y)]) / 2, vy = (V[idx(w.x, w.y + 1)] - V[idx(w.x, w.y - 1)]) / 2;
  let near = Math.min(1, gd / 10);                               // 目的地のすぐ近くでは、まっすぐ向かう
  let tx = near * kappa * vx * 10, ty = near * kappa * vy * 10, tm = Math.hypot(tx, ty);
  if (tm > 0.85) { tx *= 0.85 / tm; ty *= 0.85 / tm; }            // 踏み跡の引きは目的地の引きより弱くする（行き止まりで迷わない）
  let dx = gx / gd + tx, dy = gy / gd + ty;
  let m = Math.hypot(dx, dy) + 1e-9;
  w.x = constrain(w.x + (dx / m) * speedC + (Math.random() - 0.5) * 0.15, 0, GW - 1);
  w.y = constrain(w.y + (dy / m) * speedC + (Math.random() - 0.5) * 0.15, 0, GH - 1);
  w.walked += speedC;
  let i = idx(w.x, w.y);
  G[i] += trample * (1 - G[i]);                                   // 踏み固める（1 まで）
}

function draw() {
  background(95, 30, 12);
  if (frameCount % 3 === 0) blurField();
  for (let s = 0; s < stepsPerFrame; s++) for (let w of walkers) walk(w);
  let decay = 1 / regrowT, cnt = 0;
  for (let i = 0; i < GW * GH; i++) { G[i] -= G[i] * decay; if (G[i] > 0.3) cnt++; }   // 芝生が戻る
  netLen = cnt;
  if (frameCount % 10 === 0) {
    lenHist.push(netLen); detHist.push(trips.length ? trips.reduce((a, b) => a + b, 0) / trips.length : 1);
    if (lenHist.length > 300) { lenHist.shift(); detHist.shift(); }
  }
  // ---- 芝生（緑）と道（土色）
  buf.loadPixels();
  for (let i = 0; i < GW * GH; i++) {
    let g = Math.min(G[i] * 1.6, 1);
    buf.pixels[i * 4] = 60 + 140 * g; buf.pixels[i * 4 + 1] = 120 + 40 * g - 10 * (i % 7 === 0); buf.pixels[i * 4 + 2] = 50 + 70 * g; buf.pixels[i * 4 + 3] = 255;
  }
  buf.updatePixels();
  let a = area();
  image(buf, a.x, a.y, a.w, a.h);
  let k = a.w / GW;
  noStroke(); fill(0, 0, 100);
  for (let w of walkers) circle(a.x + w.x * k, a.y + w.y * k, 4);
  for (let i = 0; i < gates.length; i++) { fill(0, 80, 100); circle(a.x + gates[i][0] * k, a.y + gates[i][1] * k, 18); fill(0, 0, 100); textSize(12); text(String.fromCharCode(65 + i), a.x + gates[i][0] * k - 4, a.y + gates[i][1] * k + 4); }

  // ---- 右：数字とグラフ
  let gx = a.x + a.w + 30, gw = width - gx - 25;
  let det = detHist.length ? detHist[detHist.length - 1] : 1;
  drawPlot(lenHist, gx, 120, gw, 90, 0, Math.max(direct * 5, 100), color(30, 70, 100), '道の面積（踏み固め > 0.3 のマス、1 マス = 1 m²）= ' + netLen + ' m²');
  drawPlot(detHist, gx, 250, gw, 90, 1, 1.5, color(200, 60, 100), '遠回り率（歩いた距離 / 直線）= ' + nf(det, 1, 3));
  noStroke(); fill(0, 0, 85); textSize(14);
  text('入口 ' + gates.length + ' か所を全部まっすぐ結ぶと ' + nf(direct, 1, 0) + ' m', gx, 380);
  text('道が合流して共有されると、道の量は減り、', gx, 404);
  text('1 人 1 人は少しだけ遠回り（率 > 1）になる', gx, 428);
  fill(0, 0, 65);
  text('向き = 目的地の向き ＋ κ ∇V', gx, 466);
  text('踏む：G ← G ＋ ' + trample + ' (1 − G)', gx, 490);
  text('戻る：G ← G (1 − 1/' + regrowT + ')（毎フレーム）', gx, 514);

  fill(0, 0, 100); textSize(18);
  text('クリック：入口を追加　C：入口を 4 つに　↑↓：踏み跡への引かれやすさ κ = ' + nf(kappa, 1, 1) + '　←→：芝生が戻る時間 ' + regrowT + '　R：芝生をリセット', 20, 36);
  fill(0, 0, 70); textSize(14);
  text('だれも道を設計していない。歩いた跡（環境）が次の人の歩き方を変える ＝ スティグマジー。大学のキャンパスの「けもの道」と同じ', 20, 60);
}

function mousePressed() {
  let a = area();
  if (mouseX < a.x || mouseX > a.x + a.w || mouseY < a.y || mouseY > a.y + a.h || gates.length >= 8) return;
  gates.push([((mouseX - a.x) / a.w) * GW, ((mouseY - a.y) / a.h) * GH]);
  resetWalkers();
}
function keyPressed() {
  if (key === UP_ARROW) kappa = Math.min(kappa + 1, 20);
  if (key === DOWN_ARROW) kappa = Math.max(kappa - 1, 0);
  if (key === RIGHT_ARROW) regrowT = Math.min(regrowT + 150, 3000);
  if (key === LEFT_ARROW) regrowT = Math.max(regrowT - 150, 150);
  if (key === 'c' || key === 'C') defaultGates();
  if (key === 'r' || key === 'R') { G.fill(0); V.fill(0); resetWalkers(); }
}

// ---------- やってみよう ----------
// 1. 最初はまっすぐな線（入口どうしの直線）がたくさんできる。時間がたつと、何本かがまとまって Y 字の分かれ道になる？
// 2. κ = 0 にすると、みんな直線で歩く（遠回り率 1.0）。道の総延長はどうなる？ κ = 15 だと？
// 3. ← で芝生が早く戻るようにすると、あまり使われない道は消える。どの道が残る？
// 4. 入口を三角形に 3 つだけ置く（C のあと R、クリック）と、真ん中で 3 本が合流する形（シュタイナー点）ができる？
// 5. 自分の大学で、芝生に「けもの道」ができている所を探してみよう。設計した道と比べると？

// ==================================================
// ここから下は「描くための道具」です
// ==================================================
function area() {
  let w = Math.min(width * 0.7, ((height - 110) * GW) / GH), h = (w * GH) / GW;
  return { x: 20, y: 85, w, h };
}
function drawPlot(arr, x, y, w, h, lo, hi, c, title) {
  noStroke(); fill(0, 0, 0, 35); rect(x, y, w, h);
  fill(0, 0, 85); textSize(13); text(title, x, y - 8);
  if (arr.length < 2) return;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / 299) * w, y + h - constrain((arr[i] - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
