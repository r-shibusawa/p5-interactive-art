// ============================================
// 03 魚の渦（ミル）と隊列 ─ クーザンの 3 ゾーンモデル
// 魚のまわりに 3 つの輪：近すぎたら離れる（反発 zor）→ その外で向きをそろえる（整列 zoo）→ さらに外の仲間に寄る（誘引 zoa）
// 輪の幅 Δro（整列）と Δra（誘引）を変えるだけで「ばらばらの群れ」「ドーナツ形の渦」「ゆるい隊列」「きれいな隊列」に切り替わる
// 1〜4 = 型のプリセット / ←→ = 整列の幅 Δro / ↑↓ = 誘引の幅 Δra / R = 散らばった状態から / Z = 輪を表示
// ============================================

let N = 200;                 // ★ 魚の数
let zor = 1;                 // 反発ゾーンの半径（これが長さの単位）
let dRo = 2, dRa = 13;       // 整列ゾーンの幅、誘引ゾーンの幅
let speedU = 3;              // ★ 速さ（単位 / 秒）
let turnRate = 40;           // ★ 1 秒に曲がれる最大角度（度）
let fov = 270;               // ★ 見える角度（真後ろは見えない）
let dtS = 0.1;               // 1 ステップの時間
let stepsPerFrame = 2;
let unitPx = 13;             // 1 単位 = 何 px
let fish = [];
let showZones = true;
let pHist = [], mHist = [];
const PRESETS = [[0, 14, '群れ（スウォーム）'], [2, 13, '渦（ミル・トーラス）'], [6, 12, 'ゆるい隊列'], [13, 13, 'きれいな隊列']];
let presetName = PRESETS[1][2];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  scatter();
}

function scatter() {
  fish = [];
  for (let i = 0; i < N; i++) {
    let a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 12;
    let h = Math.random() * Math.PI * 2;
    fish.push({ x: r * Math.cos(a), y: r * Math.sin(a), dx: Math.cos(h), dy: Math.sin(h) });
  }
  pHist = []; mHist = [];
}

// ★ クーザンのルール：反発が最優先。反発する相手がいなければ 整列＋誘引
function couzinStep() {
  let rRo = zor + dRo, rRa = zor + dRo + dRa, cosHalf = Math.cos(((fov / 2) * Math.PI) / 180);
  let maxTurn = ((turnRate * Math.PI) / 180) * dtS;
  let nd = [];
  for (let i = 0; i < N; i++) {
    let a = fish[i], rx = 0, ry = 0, ox = 0, oy = 0, ax = 0, ay = 0, nr = 0, no = 0, na = 0;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      let b = fish[j], vx = b.x - a.x, vy = b.y - a.y, d = Math.hypot(vx, vy);
      if (d < 1e-6 || d >= rRa) continue;
      vx /= d; vy /= d;
      if (d < zor) { rx -= vx; ry -= vy; nr++; continue; }        // 反発は全方向
      if (vx * a.dx + vy * a.dy < cosHalf) continue;             // 真後ろは見えない
      if (d < rRo) { ox += b.dx; oy += b.dy; no++; }
      else { ax += vx; ay += vy; na++; }
    }
    let tx, ty;
    if (nr > 0) { tx = rx; ty = ry; }
    else {
      tx = 0; ty = 0;
      if (no > 0) { let m = Math.hypot(ox + a.dx, oy + a.dy) + 1e-9; tx += (ox + a.dx) / m; ty += (oy + a.dy) / m; }
      if (na > 0) { let m = Math.hypot(ax, ay) + 1e-9; tx += ax / m; ty += ay / m; }
      if (no === 0 && na === 0) { tx = a.dx; ty = a.dy; }
    }
    tx += (Math.random() - 0.5) * 0.1; ty += (Math.random() - 0.5) * 0.1;   // 小さなゆらぎ
    // 目標の向きへ、最大 maxTurn だけ回る
    let cur = Math.atan2(a.dy, a.dx), want = Math.atan2(ty, tx);
    let diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    let h = cur + Math.max(-maxTurn, Math.min(maxTurn, diff));
    nd.push(h);
  }
  for (let i = 0; i < N; i++) {
    let f = fish[i];
    f.dx = Math.cos(nd[i]); f.dy = Math.sin(nd[i]);
    f.x += f.dx * speedU * dtS; f.y += f.dy * speedU * dtS;
  }
}

function draw() {
  background(222, 55, 14);
  for (let s = 0; s < stepsPerFrame; s++) couzinStep();
  // ---- 測る：偏極度 p（向きのそろい）と 角運動量 m（重心のまわりを回るか）
  let cx = 0, cy = 0, sx = 0, sy = 0;
  for (let f of fish) { cx += f.x; cy += f.y; sx += f.dx; sy += f.dy; }
  cx /= N; cy /= N;
  let mz = 0;
  for (let f of fish) { let rx = f.x - cx, ry = f.y - cy, rl = Math.hypot(rx, ry) + 1e-9; mz += (rx * f.dy - ry * f.dx) / rl; }
  let pol = Math.hypot(sx, sy) / N, mom = Math.abs(mz) / N;
  pHist.push(pol); mHist.push(mom);
  if (pHist.length > 300) { pHist.shift(); mHist.shift(); }

  // ---- 描く：カメラは群れの重心を追う
  let ox = width * 0.36 - cx * unitPx, oy = height * 0.55 - cy * unitPx;
  noStroke(); fill(185, 60, 100);
  beginShape(TRIANGLES);
  for (let f of fish) {
    let x = ox + f.x * unitPx, y = oy + f.y * unitPx;
    vertex(x + f.dx * 8, y + f.dy * 8); vertex(x - f.dx * 5 - f.dy * 2.5, y - f.dy * 5 + f.dx * 2.5); vertex(x - f.dx * 5 + f.dy * 2.5, y - f.dy * 5 - f.dx * 2.5);
  }
  endShape();
  if (showZones) {
    let f = fish[0], x = ox + f.x * unitPx, y = oy + f.y * unitPx;
    noFill(); strokeWeight(1.5);
    stroke(0, 80, 100, 80); circle(x, y, 2 * zor * unitPx);
    stroke(50, 80, 100, 60); circle(x, y, 2 * (zor + dRo) * unitPx);
    stroke(120, 60, 100, 45); circle(x, y, 2 * (zor + dRo + dRa) * unitPx);
    noStroke(); fill(0, 0, 100); circle(x, y, 6);
  }

  // ---- 右：グラフと「型の地図」
  let gx = width - 340;
  drawPlot(pHist, gx, 110, 310, 70, 0, 1, color(50, 80, 100), '偏極度 p（向きのそろい）= ' + nf(pol, 1, 2));
  drawPlot(mHist, gx, 220, 310, 70, 0, 1, color(320, 60, 100), '角運動量 m（渦の強さ）= ' + nf(mom, 1, 2));
  let mx = gx, my = 340, mw = 310, mh = 200;
  noStroke(); fill(0, 0, 0, 35); rect(mx, my, mw, mh);
  fill(0, 0, 85); textSize(13); text('型の地図（横 = Δro、縦 = Δra）', mx, my - 8);
  fill(0, 0, 60); textSize(12);
  stroke(0, 0, 100, 15); for (let b of [1, 4, 10]) line(mx + (b / 15) * mw, my, mx + (b / 15) * mw, my + mh);   // おおよその境目（Δra が大きいとき）
  noStroke(); fill(0, 0, 60);
  text('群れ', mx + 2, my + 30); text('渦', mx + (2 / 15) * mw, my + 30); text('ゆるい隊列', mx + (5 / 15) * mw, my + 30); text('きれいな隊列', mx + (10.5 / 15) * mw, my + 30);
  text('Δro → 15', mx + mw - 60, my + mh - 6); text('Δra 0', mx + 4, my + mh - 6);
  fill(0, 80, 100); circle(mx + (dRo / 15) * mw, my + mh - (dRa / 15) * mh, 12);
  let kind = pol > 0.65 ? '隊列（平行に泳ぐ）' : mom > 0.45 ? '渦（ミル）' : '群れ（スウォーム）';

  fill(0, 0, 100); textSize(18);
  text('1〜4：プリセット（' + presetName + '）　←→：整列の幅 Δro = ' + nf(dRo, 1, 1) + '　↑↓：誘引の幅 Δra = ' + nf(dRa, 1, 1) + '　R：散らす　Z：輪', 20, 36);
  fill(0, 0, 70); textSize(14);
  text('いまの型（p と m から判定）：' + kind + '。赤 = 反発、黄 = 整列、緑 = 誘引の輪（1 匹目のまわり）', 20, 60);
}

function keyPressed() {
  let n = parseInt(key);
  if (n >= 1 && n <= 4) { dRo = PRESETS[n - 1][0]; dRa = PRESETS[n - 1][1]; presetName = PRESETS[n - 1][2]; scatter(); }
  if (key === RIGHT_ARROW) dRo = Math.min(dRo + 0.5, 15);
  if (key === LEFT_ARROW) dRo = Math.max(dRo - 0.5, 0);
  if (key === UP_ARROW) dRa = Math.min(dRa + 0.5, 15);
  if (key === DOWN_ARROW) dRa = Math.max(dRa - 0.5, 0);
  if (key === 'r' || key === 'R') scatter();
  if (key === 'z' || key === 'Z') showZones = !showZones;
  if (key === LEFT_ARROW || key === RIGHT_ARROW || key === UP_ARROW || key === DOWN_ARROW) presetName = '手動';
}

// ---------- やってみよう ----------
// 1. 2（渦）で R を何回か押す。毎回ドーナツができる？ 右回り・左回りはどう決まる？
// 2. 渦の状態から → で Δro を少しずつ広げる。どこで渦が「隊列」に変わる？ 戻すと渦に戻る？（ヒステリシス）
// 3. fov を 360 にする（真後ろも見える）と、渦はできにくくなる。目の付き方が群れの形を決める
// 4. Δra を 0 にすると誘引がなくなり、群れはバラバラに散っていく
// 5. N を 50 と 400 で比べよう。数が多いほど渦は大きく、安定する？

// ==================================================
// ここから下は「グラフの道具」です
// ==================================================
function drawPlot(arr, x, y, w, h, lo, hi, c, title) {
  noStroke(); fill(0, 0, 0, 35); rect(x, y, w, h);
  fill(0, 0, 85); textSize(13); text(title, x, y - 8);
  if (arr.length < 2) return;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / 299) * w, y + h - constrain((arr[i] - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
