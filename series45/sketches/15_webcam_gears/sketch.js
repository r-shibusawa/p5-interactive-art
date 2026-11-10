// ============================================
// 15 カメラの動きで歯車を回す 📷（おまけ）
// カメラの前で手を振ると、その「動きの大きさ」（フレーム差分）が入力軸のトルクになり、歯車列でおもりを巻き上げる
// 減速比が小さいと力が足りず持ち上がらない。減速比を大きくすると、ゆっくりだが軽い力で上がる（力 ⇄ 速さの交換）
// 1〜3 = 歯車の段数（減速比）/ ↑↓ = おもりの重さ / K = 逆転止め（ラチェット）/ R = おもりを下ろす。カメラが使えないときはマウスを動かす
// ============================================

let cap, vw = 160, vh = 120;
let prevGray = null;
let motion = 0;                // 動きの大きさ（0〜1）
let motionGain = 9;            // ★ 動き → トルクの感度
let maxTorque = 1.0;           // ★ 入力トルクの上限
let stages = 2;                // 歯車の段数（1〜3）
let loadTorque = 3.0;          // ★ おもりが出力軸にかけるトルク（重さ）
let friction = 0.08;           // ★ まさつ
let ratchet = true;            // 逆転止め
let omega = 0, rot0 = 0;       // 入力軸の角速度・回転角
let lifted = 0, goals = 0;
let gears = [], outlines = {};
let cells = [];                // 動いた場所（表示用）
const GM = 6, PA = (20 * Math.PI) / 180;
const MAX_LIFT = 240, DRUM_R = 28;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  buildTrain();
}

// ★ 歯車列を作る：[歯数, 同軸か] を順に並べる。段数が増えるほど減速比が大きい
function buildTrain() {
  let spec = [[14, false], [36, false]];
  if (stages >= 2) spec.push([12, true], [48, false]);
  if (stages >= 3) spec.push([12, true], [40, false]);
  gears = [];
  let x = width * 0.4, y = height * 0.42, zig = 1;
  for (let i = 0; i < spec.length; i++) {
    let z = spec[i][0], coax = spec[i][1], p = gears[gears.length - 1];
    if (i === 0) gears.push({ x, y, z, coax: false, parent: -1, rot: 0, dirAngle: 0, speed: 1 });
    else if (coax) gears.push({ x: p.x, y: p.y, z, coax: true, parent: i - 1, rot: 0, dirAngle: 0, speed: 1 });
    else {
      let a = (GM * (p.z + z)) / 2, ang = zig * 0.38; zig = -zig;
      gears.push({ x: p.x + a * Math.cos(ang), y: p.y + a * Math.sin(ang), z, coax: false, parent: i - 1, rot: 0, dirAngle: ang, speed: 1 });
    }
  }
  omega = 0; rot0 = 0; lifted = 0;
}
function outlineOf(z) { if (!outlines[z]) outlines[z] = makeGearOutline(z, GM, PA); return outlines[z]; }

// 04 と同じ：親から順に回転角と速さの比を決める
function updateTrain() {
  gears[0].rot = rot0; gears[0].speed = 1;
  for (let i = 1; i < gears.length; i++) {
    let g = gears[i], p = gears[g.parent];
    if (g.coax) { g.rot = p.rot; g.speed = p.speed; }
    else { g.speed = (-p.speed * p.z) / g.z; g.rot = g.dirAngle + Math.PI + Math.PI / g.z - ((p.rot - g.dirAngle) * p.z) / g.z; }
  }
}

// ★ フレーム差分：前のフレームと明るさが大きく変わった画素の割合
function measureMotion() {
  cells = [];
  if (!cap || cap.width === 0) return null;
  cap.loadPixels();
  let px = cap.pixels;
  if (!px || px.length < vw * vh * 4) return null;
  let n = (vw / 4) * (vh / 4), gray = new Float32Array(n), moved = 0;
  for (let j = 0; j < vh / 4; j++) for (let i = 0; i < vw / 4; i++) {
    let k = (i * 4 + j * 4 * vw) * 4, id = i + (j * vw) / 4;
    gray[id] = (px[k] + px[k + 1] + px[k + 2]) / 3;
    if (prevGray && Math.abs(gray[id] - prevGray[id]) > 22) { moved++; cells.push([i, j]); }
  }
  prevGray = gray;
  return moved / n;
}

function draw() {
  background(212, 45, 13);
  // ---- 入力：カメラの動き（だめならマウスの速さ）
  let m = measureMotion(), usingCam = m !== null;
  if (!usingCam) m = constrain(Math.hypot(mouseX - pmouseX, mouseY - pmouseY) / 120, 0, 1);
  motion = lerp(motion, constrain(m, 0, 1), 0.3);
  let torqueIn = Math.min(motion * motionGain, maxTorque);

  // ---- 力学：J ω′ = 入力トルク − まさつ − おもりのトルク / 減速比
  updateTrain();
  let ratio = Math.abs(1 / gears[gears.length - 1].speed);          // 減速比 i
  let back = lifted > 0 || torqueIn > loadTorque / ratio ? loadTorque / ratio : 0;   // 床に着いているときは引かれない
  omega += (torqueIn - friction * omega - back) / 60 * 6;
  if (ratchet && omega < 0) omega = 0;
  omega = constrain(omega, -20, 30);
  rot0 += omega / 60;
  lifted += (omega / 60 / ratio) * DRUM_R;
  if (lifted <= 0) { lifted = 0; if (omega < 0) omega = 0; }
  if (lifted >= MAX_LIFT) { goals++; lifted = 0; omega = 0; }

  // ---- 歯車列
  for (let i = 0; i < gears.length; i++) {
    let g = gears[i], r = (GM * g.z) / 2;
    stroke(0, 0, 100, 70); strokeWeight(1);
    fill(g.coax ? 320 : i === 0 ? 8 : i === gears.length - 1 ? 45 : 200, 55, g.coax ? 60 : 78, 94);
    drawOutline(outlineOf(g.z), g.x, g.y, g.rot);
    noStroke(); fill(0, 0, 100); circle(g.x, g.y, 9);
    circle(g.x + (r - GM * 2.4) * Math.cos(g.rot), g.y + (r - GM * 2.4) * Math.sin(g.rot), 6);
  }
  noStroke(); fill(0, 0, 100); textSize(13);
  for (let g of gears) if (!g.coax) text('z = ' + g.z, g.x - 16, g.y - (GM * g.z) / 2 - GM - 8);
  // 入力トルクの矢印（赤い歯車のまわり）
  let g0 = gears[0];
  noFill(); stroke(0, 80, 100); strokeWeight(5);
  if (torqueIn > 0.02) arc(g0.x, g0.y, 150, 150, -Math.PI / 2, -Math.PI / 2 + torqueIn * 4.5);
  // ドラムとおもり
  let gl = gears[gears.length - 1], wx = gl.x + DRUM_R, floorY = height - 50, wy = floorY - 36 - lifted;
  noStroke(); fill(0, 0, 75); circle(gl.x, gl.y, DRUM_R * 2);
  stroke(0, 0, 85); strokeWeight(2); line(wx, gl.y, wx, wy);
  noStroke(); fill(35, 80, 95); rect(wx - 26, wy, 52, 36, 5);
  fill(0, 0, 10); textSize(13); text(nf(loadTorque, 1, 1), wx - 10, wy + 23);
  stroke(0, 0, 45); strokeWeight(2); line(wx - 70, floorY, wx + 70, floorY);
  stroke(140, 60, 100, 70); line(wx - 70, floorY - 36 - MAX_LIFT, wx + 70, floorY - 36 - MAX_LIFT);
  noStroke(); fill(140, 60, 100); textSize(12); text('ゴール', wx + 34, floorY - 40 - MAX_LIFT);

  // ---- カメラ映像と動いた場所
  let vx = 30, vy = 120, vs = 2;
  if (usingCam) {
    image(cap, vx, vy, vw * vs, vh * vs);
    noStroke(); fill(50, 90, 100, 55);
    for (let c of cells) rect(vx + c[0] * 4 * vs, vy + c[1] * 4 * vs, 4 * vs, 4 * vs);
  } else {
    noStroke(); fill(0, 0, 100, 8); rect(vx, vy, vw * vs, vh * vs, 8);
    fill(0, 0, 70); textSize(14); text('カメラなし：マウスを動かすと回る', vx + 40, vy + 124);
  }
  noFill(); stroke(0, 0, 100, 40); strokeWeight(1); rect(vx, vy, vw * vs, vh * vs);
  // メーター
  let my = vy + vh * vs + 34;
  let bars = [['動き', motion, 50], ['入力トルク', torqueIn / maxTorque, 0], ['必要なトルク', Math.min(loadTorque / ratio / maxTorque, 1), 200]];
  for (let i = 0; i < 3; i++) {
    noStroke(); fill(0, 0, 100); textSize(13); text(bars[i][0], vx, my + i * 30 + 4);
    fill(0, 0, 100, 10); rect(vx + 100, my + i * 30 - 9, 220, 14);
    fill(bars[i][2], 75, 100); rect(vx + 100, my + i * 30 - 9, 220 * constrain(bars[i][1], 0, 1), 14);
  }
  let canLift = loadTorque / ratio < maxTorque;
  fill(canLift ? 140 : 0, 70, 100); textSize(14);
  text(canLift ? '入力トルクが必要なトルクを超えれば上がる' : '力不足：どれだけ振っても上がらない → 段数を増やそう', vx, my + 100);

  // ---- 文字
  noStroke(); fill(0, 0, 100); textSize(18);
  text('手を振る：回す　1〜3：段数 ' + stages + '（減速比 ' + nf(ratio, 1, 1) + '）　↑↓：おもり ' + nf(loadTorque, 1, 1) + '　K：逆転止め ' + (ratchet ? 'ON' : 'off') + '　R：下ろす　　成功 ' + goals + ' 回', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('出力トルク = 入力トルク × 減速比、出力の速さ = 入力 ÷ 減速比。入力軸から見ると、おもりは 1/減速比 の軽さになる', 20, 68);
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { stages = Number(key); buildTrain(); }
  if (key === UP_ARROW) loadTorque = constrain(loadTorque + 0.5, 0.5, 12);
  if (key === DOWN_ARROW) loadTorque = constrain(loadTorque - 0.5, 0.5, 12);
  if (key === 'k' || key === 'K') ratchet = !ratchet;
  if (key === 'r' || key === 'R') { lifted = 0; omega = 0; }
}

// ---------- やってみよう ----------
// 1. 1 段（1）ではおもり 3.0 が上がらない。2 段、3 段にすると？ 上がる速さはどう変わる？
// 2. おもりを 12 まで重くして、3 段で持ち上げよう。ウインチやジャッキが小さな力で重い物を上げるしくみ
// 3. K で逆転止めを外すと、手を止めたとたんに落ちる。減速比が大きいと落ちる速さは？
// 4. 仕事 = 力 × 距離。減速しても仕事は増えない（まさつで少し減る）。成功 1 回に必要な「振る回数」を段数ごとに比べよう
// 5. measureMotion を左右半分に分け、左で振ると逆回転するように改造しよう

// ==================================================
// ここから下は「歯車の道具」です（インボリュート歯形の輪郭を作る）
// ==================================================

// 歯数 z、モジュール m、圧力角 pa（ラジアン）の歯車の輪郭を [x, y] の配列で返す
//   歯 1 枚の中心が角度 0（+x 方向）を向く。ha・hf は歯先・歯元の高さ（モジュールの何倍か）
//   インボリュート：基礎円 rb に巻いた糸をほどくときの糸の先。ほどいた角 t の点は
//   半径 rb√(1 + t²)、角度 inv = t − atan t
function makeGearOutline(z, m, pa, ha, hf) {
  if (ha === undefined) ha = 1;
  if (hf === undefined) hf = 1.25;
  let r = (m * z) / 2, rb = r * Math.cos(pa);
  let ra = r + ha * m, rf = Math.max(r - hf * m, m);
  let half = Math.PI / (2 * z) + Math.tan(pa) - pa;      // 基礎円の上での歯の半角
  let t0 = rf > rb ? Math.sqrt((rf / rb) * (rf / rb) - 1) : 0;
  let t1 = Math.sqrt(Math.max((ra / rb) * (ra / rb) - 1, t0 * t0));
  let flank = [];                                        // [半径, 歯の中心からの角度]
  if (rf < rb) flank.push([rf, half]);                   // 基礎円より内側はまっすぐ
  for (let i = 0; i <= 8; i++) {
    let t = t0 + ((t1 - t0) * i) / 8;
    flank.push([rb * Math.sqrt(1 + t * t), Math.max(half - (t - Math.atan(t)), 0)]);
  }
  let pts = [];
  for (let k = 0; k < z; k++) {
    let c = (k * 2 * Math.PI) / z;
    pts.push([rf * Math.cos(c - Math.PI / z), rf * Math.sin(c - Math.PI / z)]);   // 歯底の真ん中
    for (let i = 0; i < flank.length; i++) pts.push([flank[i][0] * Math.cos(c - flank[i][1]), flank[i][0] * Math.sin(c - flank[i][1])]);
    for (let i = flank.length - 1; i >= 0; i--) pts.push([flank[i][0] * Math.cos(c + flank[i][1]), flank[i][0] * Math.sin(c + flank[i][1])]);
  }
  return pts;
}

// 輪郭を (x, y) に角度 rot で描く
function drawOutline(pts, x, y, rot) {
  push();
  translate(x, y);
  rotate(rot);
  beginShape();
  for (let p of pts) vertex(p[0], p[1]);
  endShape(CLOSE);
  pop();
}
