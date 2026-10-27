// ============================================
// 15 カメラで操るアーム（おまけ）
// カメラの映像から「いちばん明るい所」または「選んだ色」の塊を見つけ、その位置をアームの目標にする
//   見つけた画素の平均位置（重心）= 目標 → 2 リンクの IK（01）で腕が追いかける
// クリック = 画面の映像の上でクリックしてその色を追う / B = いちばん明るい所を追う / ←→ = 色のしきい値 / E = ひじの向き（カメラの許可が必要）
// ============================================

let cap;
let vw = 160, vh = 120;           // ★ カメラ画像の大きさ（小さいほど速い）
let L1 = 180, L2 = 140;
let q1 = 0.8, q2 = 0.9;
let elbowUp = true;
let smooth = 0.12;
let mode = 'bright';              // 'bright' か 'color'
let pick = [255, 255, 255];       // 追う色
let colorThr = 60;                // ★ 色の近さのしきい値（小さいほど厳しい）
let minPixels = 15;               // ★ これより少ないと「見つからない」
let blob = null;                  // 見つけた重心（カメラ座標）
let target = null;
let usingMouse = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  target = { x: width * 0.6, y: height * 0.4 };
}
function basePos() { return { x: width * 0.4, y: height * 0.65 }; }
function videoRect() { let s = min(320 / vw, 240 / vh); return { x: width - vw * s - 20, y: 100, w: vw * s, h: vh * s, s }; }

function inverse(tx, ty, up) {
  let b = basePos();
  let x = tx - b.x, y = b.y - ty;
  let r = constrain(sqrt(x * x + y * y), abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
  let c2 = constrain((r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  let a2 = acos(c2) * (up ? 1 : -1);
  return { a1: atan2(y, x) - atan2(L2 * sin(a2), L1 + L2 * cos(a2)), a2 };
}
function forward(a1, a2) {
  let b = basePos();
  let e = { x: b.x + L1 * cos(a1), y: b.y - L1 * sin(a1) };
  return { b, e, h: { x: e.x + L2 * cos(a1 + a2), y: e.y - L2 * sin(a1 + a2) } };
}
function approach(cur, goal) { let d = goal - cur; return cur + atan2(sin(d), cos(d)) * smooth; }

// ★ 画像から塊の重心を探す
function findBlob() {
  cap.loadPixels();
  if (cap.width === 0 || cap.pixels.length < vw * vh * 4) return null;
  let px = cap.pixels;
  let sx = 0, sy = 0, n = 0;
  if (mode === 'bright') {
    // いちばん明るい画素のまわり（上位）を平均：まず最大を探し、その 85% 以上の画素を集める
    let maxB = 0;
    for (let i = 0; i < vw * vh; i++) { let b = px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]; if (b > maxB) maxB = b; }
    if (maxB < 300) return null;
    let thr = maxB * 0.85;
    for (let i = 0; i < vw * vh; i++) {
      let b = px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2];
      if (b >= thr) { sx += i % vw; sy += floor(i / vw); n++; }
    }
  } else {
    for (let i = 0; i < vw * vh; i++) {
      let d = abs(px[i * 4] - pick[0]) + abs(px[i * 4 + 1] - pick[1]) + abs(px[i * 4 + 2] - pick[2]);
      if (d < colorThr) { sx += i % vw; sy += floor(i / vw); n++; }
    }
  }
  if (n < minPixels) return null;
  return { x: sx / n, y: sy / n, n };
}

function draw() {
  background(215, 35, 12);
  let b = basePos();
  blob = findBlob();
  if (blob) {
    // カメラ座標 → アームの届く範囲（ドーナツの上半分くらい）に写す
    usingMouse = false;
    let nx = blob.x / vw, ny = blob.y / vh;
    let goal = { x: b.x + (nx - 0.5) * (L1 + L2) * 1.8, y: b.y - 40 - (1 - ny) * (L1 + L2) * 0.9 };
    target.x = lerp(target.x, goal.x, 0.3); target.y = lerp(target.y, goal.y, 0.3);
  } else {
    usingMouse = true;
    if (mouseX > 0 || mouseY > 0) target = { x: mouseX, y: mouseY };
  }
  let sol = inverse(target.x, target.y, elbowUp);
  q1 = approach(q1, sol.a1); q2 = approach(q2, sol.a2);
  let fk = forward(q1, q2);

  // 届く範囲
  noFill(); stroke(45, 80, 100, 30); strokeWeight(1);
  circle(b.x, b.y, (L1 + L2) * 2); circle(b.x, b.y, abs(L1 - L2) * 2);
  // 腕
  stroke(200, 60, 95); strokeWeight(14); line(fk.b.x, fk.b.y, fk.e.x, fk.e.y);
  stroke(320, 60, 95); line(fk.e.x, fk.e.y, fk.h.x, fk.h.y);
  noStroke();
  fill(0, 0, 100); circle(fk.b.x, fk.b.y, 22); circle(fk.e.x, fk.e.y, 18);
  fill(45, 90, 100); circle(fk.h.x, fk.h.y, 16);
  fill(0, 0, 40); rect(b.x - 30, b.y, 60, 14, 3);
  noFill(); stroke(120, 90, 100); strokeWeight(2); circle(target.x, target.y, 22);

  // カメラ映像と重心
  let vr = videoRect();
  if (cap.width > 0) image(cap, vr.x, vr.y, vr.w, vr.h);
  else { noStroke(); fill(0, 0, 30); rect(vr.x, vr.y, vr.w, vr.h); fill(0, 0, 70); textSize(14); text('カメラ待ち…', vr.x + 20, vr.y + vr.h / 2); }
  noFill(); stroke(0, 0, 100, 60); strokeWeight(1); rect(vr.x, vr.y, vr.w, vr.h);
  if (blob) {
    stroke(120, 90, 100); strokeWeight(2);
    let cx = vr.x + blob.x * vr.s, cy = vr.y + blob.y * vr.s;
    circle(cx, cy, 20); line(cx - 14, cy, cx + 14, cy); line(cx, cy - 14, cx, cy + 14);
  }
  if (mode === 'color') { noStroke(); colorMode(RGB); fill(pick[0], pick[1], pick[2]); rect(vr.x, vr.y + vr.h + 8, 40, 24, 4); colorMode(HSB, 360, 100, 100, 100); }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('追うもの：' + (mode === 'bright' ? 'いちばん明るい所（B）' : '選んだ色') + '　映像をクリック＝その色を追う　しきい値 ' + colorThr + '（←→）　E：ひじ　' + (blob ? '✓ 見つけた（' + blob.n + ' 画素）' : usingMouse ? '見つからない → マウスで操作' : ''), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('スマホのライトや白い紙を動かすと腕が追いかける。色モードは背景にない色（赤い物など）を選ぶとよい。見つからないときはマウスが目標になる', 20, 68);
}

function mousePressed() {
  let vr = videoRect();
  if (mouseX >= vr.x && mouseX <= vr.x + vr.w && mouseY >= vr.y && mouseY <= vr.y + vr.h && cap.width > 0) {
    let ix = floor((mouseX - vr.x) / vr.s), iy = floor((mouseY - vr.y) / vr.s);
    let i = (constrain(ix, 0, vw - 1) + constrain(iy, 0, vh - 1) * vw) * 4;
    cap.loadPixels();
    if (cap.pixels.length > i + 2) { pick = [cap.pixels[i], cap.pixels[i + 1], cap.pixels[i + 2]]; mode = 'color'; }
  }
}
function keyPressed() {
  if (key === 'b' || key === 'B') mode = 'bright';
  if (key === 'e' || key === 'E') elbowUp = !elbowUp;
  if (key === RIGHT_ARROW) colorThr = min(250, colorThr + 10);
  if (key === LEFT_ARROW) colorThr = max(10, colorThr - 10);
}

// ---------- やってみよう ----------
// 1. 色モードで 2 色を追って（赤と青）、2 本の腕を動かす。両手で指揮者のように
// 2. 重心だけでなく「大きさ（画素数）」も使って、近づけたら腕を伸ばす・遠ざけたら縮める
// 3. 14 の音をつなぐ：カメラで動かした腕がモーター音を出す
// 4. 重心は「平均」なので 2 つの塊があると真ん中になる。いちばん大きい塊だけ選ぶには？（連結成分 = シリーズ 9 の β0）
