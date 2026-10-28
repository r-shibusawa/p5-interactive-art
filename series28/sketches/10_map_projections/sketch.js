// ============================================
// 10 球面幾何と地図投影
// 球面（K > 0）を平面（K = 0）に、ゆがみなしで写すことはできない（ガウスの驚異の定理）。どこかを犠牲にする
//   ティソーの指示楕円：地球上の同じ大きさの小さな円が、地図の上でどう変形するかを見る
// 1 = 地球儀 2 = 正距円筒 3 = メルカトル 4 = 平射（立体射影）5 = ランベルト正積 6 = モルワイデ / T = ティソーの円 / G = 経緯線 / ドラッグ = 回す（地球儀）/ S = 保存
// ============================================

let mode = 3;
let showTissot = true, showGrid = true;
let tissotR = 6;              // ★ ティソーの円の半径（度）
let yaw = -2.4, tilt = 0.5;   // 地球儀の向き
let land = [];

// ★ 大陸のおおまかな輪郭（経度, 緯度）。本物の地図データは使わず、手で打った多角形
const CONTINENTS = [
  [[-168, 66], [-162, 70], [-140, 70], [-120, 72], [-95, 72], [-80, 73], [-62, 66], [-55, 52], [-66, 45], [-75, 38], [-81, 31], [-80, 25], [-90, 29], [-97, 26], [-97, 20], [-87, 21], [-83, 10], [-78, 8], [-92, 15], [-105, 20], [-112, 30], [-117, 33], [-124, 40], [-125, 48], [-133, 56], [-150, 60], [-165, 60]],
  [[-50, 60], [-42, 60], [-20, 70], [-18, 80], [-35, 83], [-60, 82], [-70, 78], [-55, 70]],
  [[-78, 8], [-60, 10], [-50, 0], [-35, -5], [-39, -15], [-48, -25], [-58, -35], [-65, -42], [-68, -55], [-74, -50], [-72, -35], [-71, -18], [-80, -5], [-77, 3]],
  [[-17, 15], [-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [35, -25], [20, -35], [17, -29], [12, -17], [13, -5], [9, 4], [-8, 4], [-14, 10]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [5, 53], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [60, 69], [70, 73], [90, 76], [110, 77], [140, 72], [160, 70], [180, 68], [180, 65], [170, 60], [160, 55], [142, 54], [140, 46], [130, 42], [127, 35], [122, 40], [120, 30], [110, 20], [106, 10], [100, 13], [98, 8], [103, 1], [95, 15], [90, 22], [80, 15], [77, 8], [72, 20], [67, 25], [57, 25], [52, 18], [44, 13], [35, 28], [35, 36], [27, 37], [28, 41], [20, 39], [13, 45], [16, 38], [9, 44], [3, 43], [-1, 37]],
  [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -25], [151, -34], [146, -39], [138, -35], [131, -31], [118, -35], [115, -34]],
  [[130, 31], [135, 34], [140, 35], [141, 38], [142, 40], [141, 45], [145, 44], [140, 41], [139, 38], [136, 37], [132, 35]],
  [[-5, 50], [1, 51], [-2, 56], [-5, 58], [-6, 55]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
];

// ★ 投影の式：(経度 λ, 緯度 φ)（ラジアン）→ 平面 (x, y)
const PROJ = {
  2: { name: '正距円筒図法', note: '経緯線が等間隔の方眼。高緯度ほど横に伸びる。等角でも正積でもない', f: (l, p) => [l, p] },
  3: { name: 'メルカトル図法', note: '等角（角度と小さな形を保つ）→ 航海に便利。緯度 60° で面積 4 倍、極は無限遠', f: (l, p) => [l, Math.log(Math.tan(PI / 4 + constrain(p, -1.4, 1.4) / 2))] },
  4: { name: '平射図法（立体射影）', note: '01 のチャート。等角。円は円に写る（中心から離れるほど大きく）', f: (l, p) => { let r = 2 * Math.tan((HALF_PI - p) / 2); return [r * Math.sin(l), -r * Math.cos(l)]; } },
  5: { name: 'ランベルト正積円筒図法', note: '正積（面積の比を保つ）。そのかわり高緯度は縦につぶれる', f: (l, p) => [l, Math.sin(p)] },
  6: { name: 'モルワイデ図法', note: '正積の楕円形の地図。周辺で形がゆがむ', f: (l, p) => { let t = mollTheta(p); return [(2 * Math.SQRT2 / PI) * l * Math.cos(t), Math.SQRT2 * Math.sin(t)]; } },
};
// モルワイデの補助角 θ：2θ + sin 2θ = π sin φ をニュートン法で解く
function mollTheta(p) {
  let t = p;
  for (let i = 0; i < 12; i++) { let f = 2 * t + Math.sin(2 * t) - PI * Math.sin(p), d = 2 + 2 * Math.cos(2 * t); if (Math.abs(d) < 1e-9) break; t -= f / d; }
  return t;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 輪郭の辺を 2° 以下に細かく分ける（曲がった地図でも辺が曲がるように）
  for (let poly of CONTINENTS) {
    let out = [];
    for (let i = 0; i < poly.length; i++) {
      let a = poly[i], b = poly[(i + 1) % poly.length], n = max(1, ceil(max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 2));
      for (let k = 0; k < n; k++) out.push([radians(a[0] + ((b[0] - a[0]) * k) / n), radians(a[1] + ((b[1] - a[1]) * k) / n)]);
    }
    land.push(out);
  }
  // 南極大陸（帯状）
  let ant = [];
  for (let lo = -180; lo <= 180; lo += 3) ant.push([radians(lo), radians(-70 + 4 * Math.sin(radians(lo * 3)))]);
  ant.push([PI, -HALF_PI + 0.01], [-PI, -HALF_PI + 0.01]);
  land.push(ant);
}

// 画面への変換。地球儀は正射影（裏側は縁へ押しつける）
function toScreen(l, p) {
  if (mode === 1) {
    let x = Math.cos(p) * Math.cos(l), y = Math.cos(p) * Math.sin(l), z = Math.sin(p);
    let c = Math.cos(yaw), s = Math.sin(yaw), x1 = c * x + s * y, y1 = -s * x + c * y;
    let up = y1 * Math.sin(tilt) + z * Math.cos(tilt), depth = -y1 * Math.cos(tilt) + z * Math.sin(tilt);
    let R = min(width, height) * 0.36;
    if (depth < 0) { let m = Math.hypot(x1, up) || 1; x1 /= m; up /= m; }
    return [width / 2 + x1 * R, height * 0.54 - up * R, depth >= 0];
  }
  let q = PROJ[mode].f(l, p), ext = { 2: [PI, HALF_PI], 3: [PI, 2.45], 4: [3.6, 3.6], 5: [PI, 1], 6: [2.83, 1.42] }[mode];
  let k = min((width * 0.46) / ext[0], (height * 0.36) / ext[1]);
  return [width / 2 + q[0] * k, height * 0.54 - q[1] * k, true];
}

function draw() {
  background(12, 22, 40);
  if (mode === 1) { noStroke(); fill(30, 70, 120); circle(width / 2, height * 0.54, min(width, height) * 0.72); }
  // 経緯線
  if (showGrid) {
    stroke(180, 200, 255, 70); strokeWeight(1); noFill();
    for (let la = -75; la <= 75; la += 15) polyline((t) => [(t - 0.5) * TWO_PI, radians(la)]);
    for (let lo = -180; lo <= 180; lo += 30) polyline((t) => [radians(lo), (t - 0.5) * (PI - 0.02)]);
  }
  // 陸
  stroke(40, 90, 50); strokeWeight(1); fill(110, 170, 100);
  for (let poly of land) {
    if (mode === 4 && poly.every((q) => q[1] < radians(-55))) continue;   // 平射では南極大陸は省略（南極は無限遠）
    beginShape();
    for (let [l, p] of poly) { let s = toScreen(l, mode === 3 ? constrain(p, -1.4, 1.4) : mode === 4 ? max(p, radians(-55)) : p); vertex(s[0], s[1]); }
    endShape(CLOSE);
  }
  // ティソーの指示楕円
  if (showTissot) {
    stroke(255, 120, 90); strokeWeight(1.5); fill(255, 120, 90, 90);
    let r = radians(tissotR);
    for (let la = -60; la <= 60; la += 30) for (let lo = -150; lo <= 180; lo += 30) {
      if (mode === 4 && la < -30) continue;
      let c = [radians(lo), radians(la)], pts = [];
      let front = true;
      for (let i = 0; i < 36; i++) {
        let q = offset(c, r, (i / 36) * TWO_PI), s = toScreen(q[0], q[1]);
        if (!s[2]) front = false;
        pts.push(s);
      }
      if (!front) continue;
      if (mode !== 1 && Math.abs(pts[0][0] - pts[18][0]) > width * 0.5) continue;
      beginShape(); for (let s of pts) vertex(s[0], s[1]); endShape(CLOSE);
    }
  }
  noStroke(); fill(255); textSize(18);
  text('1：地球儀　2：正距円筒　3：メルカトル　4：平射　5：ランベルト正積　6：モルワイデ　T：ティソーの円　G：経緯線　S：保存' + (mode === 1 ? '　ドラッグ：回す' : ''), 20, 40);
  fill(170); textSize(15);
  text('赤い円は、地球の上ではどれも同じ大きさ（半径 ' + tissotR + '°）の円。地図の上で大きさ・形が変わる = ゆがみ', 20, 68);
  fill(255, 220, 120); textSize(20);
  text(mode === 1 ? '地球儀（ゆがみなし。でも平らではない）' : PROJ[mode].name, 20, height - 56);
  fill(220); textSize(15);
  text(mode === 1 ? '球面は K = 1/R²、紙は K = 0。曲率がちがうので、長さ・角度・面積すべてを保つ地図は作れない（05・08）' : PROJ[mode].note, 20, height - 28);
}
function polyline(f) {
  beginShape();
  let prev = null;
  for (let i = 0; i <= 120; i++) {
    let [l, p] = f(i / 120);
    if (mode === 3) p = constrain(p, -1.4, 1.4);
    if (mode === 4 && p < radians(-40)) { endShape(); beginShape(); prev = null; continue; }
    let s = toScreen(l, p);
    if (!s[2] || (prev && Math.abs(s[0] - prev[0]) > width * 0.4)) { endShape(); beginShape(); prev = null; continue; }
    vertex(s[0], s[1]); prev = s;
  }
  endShape();
}
// 中心 c（経度, 緯度）から角度 r、方位 az の点（球面上）
function offset(c, r, az) {
  let [l, p] = c;
  let p2 = Math.asin(Math.sin(p) * Math.cos(r) + Math.cos(p) * Math.sin(r) * Math.cos(az));
  let l2 = l + Math.atan2(Math.sin(az) * Math.sin(r) * Math.cos(p), Math.cos(r) - Math.sin(p) * Math.sin(p2));
  return [l2, p2];
}

function mouseDragged() { if (mode === 1) { yaw -= movedX * 0.01; tilt = constrain(tilt + movedY * 0.01, -1.4, 1.4); } }
function keyPressed() {
  if ('123456'.includes(key) && key.length === 1) mode = int(key);
  if (key === 't' || key === 'T') showTissot = !showTissot;
  if (key === 'g' || key === 'G') showGrid = !showGrid;
  if (key === 's' || key === 'S') saveCanvas('map_projection', 'png');
}

// ---------- やってみよう ----------
// 1. メルカトルとランベルトでグリーンランドとアフリカの大きさを比べよう（本当はアフリカが約 14 倍）
// 2. 3 と 4 は等角：赤い円が円のまま。5 と 6 は正積：円がつぶれるが面積は同じ。両方を満たす地図はない
// 3. PROJ に自分の投影を追加しよう。例：サンソン図法 (λ cos φ, φ)（正積）
// 4. CONTINENTS の日本の輪郭を細かくしてみよう。高緯度の北海道はメルカトルでどれくらい大きくなる？
