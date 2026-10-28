// ============================================
// 04 メビウスの帯（3D）
// 紙テープを半回転ねじってつなぐと、表と裏の区別がない「片側しかない」曲面になる
//   アリが真ん中を歩くと、1 周で裏側（さかさま）に、2 周で元に戻る。真ん中で切ると？ 1/3 で切ると？
// 0 = ふつうの輪 / 1 = メビウスの帯 / 2 = 真ん中で切る / 3 = 端から 1/3 で切る / O = 切った帯を広げる / ↑↓ = アリの速さ / スペース = 止める / ドラッグ = 視点
// ============================================

let mode = 1;
let R, Wd;                  // 帯の半径と半分の幅
let antU = 0, antSpeed = 0.012;   // ★ アリの位置（角度）と速さ
let paused = false;
let openT = 0, openGoal = 0;
let rotX = -0.6, rotY = 0.3;
let hud, trail = [];
let slit = 5;               // ★ 切れ目の幅（px）

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  hud = createGraphics(width, height);
  R = min(width, height) * 0.24; Wd = R * 0.36;
}

// ★ k 回半ねじった帯の点：u = 帯にそった角度、s = 幅方向（−Wd〜Wd）
function band(u, s, k) {
  let c = Math.cos((k * u) / 2), sn = Math.sin((k * u) / 2);
  return [(R + s * c) * Math.cos(u), s * sn, (R + s * c) * Math.sin(u)];
}
// 切った帯（u が 0〜4π の 1 本の長い帯）を大きな輪に広げた形：2 回まるごとねじれている
function opened(u, s, s0, s1, big) {
  let v = u / 2, sc = s - (s0 + s1) / 2, phi = 2 * v, Rb = R * big;
  let rx = Math.cos(v), rz = Math.sin(v);
  return [Rb * rx + sc * Math.cos(phi) * rx, sc * Math.sin(phi) - 0.0, Rb * rz + sc * Math.cos(phi) * rz];
}
function pointAt(u, s, piece) {
  let k = mode === 0 ? 0 : 1;
  let a = band(u, s, k);
  if (piece && piece.open && openT > 0) {
    let b = opened(u, s, piece.s0, piece.s1, piece.big);
    return a.map((x, i) => x + (b[i] - x) * openT);
  }
  return a;
}

// 今のモードで描く帯のリスト {u0, u1, s0, s1, hue, open, big}
function pieces() {
  if (mode === 0 || mode === 1) return [{ u0: 0, u1: TWO_PI, s0: -Wd, s1: Wd, hue: mode === 0 ? [90, 200, 255] : [255, 170, 80] }];
  if (mode === 2) return [{ u0: 0, u1: 2 * TWO_PI, s0: slit, s1: Wd, hue: [120, 220, 160], open: true, big: 1.5 }];
  let t = Wd / 3;
  return [{ u0: 0, u1: TWO_PI, s0: -t + slit, s1: t - slit, hue: [255, 170, 80] },
          { u0: 0, u1: 2 * TWO_PI, s0: t + slit, s1: Wd, hue: [150, 140, 255], open: true, big: 1.7 }];
}

function draw() {
  background(18, 16, 28);
  if (mouseIsPressed) { rotY += movedX * 0.01; rotX = constrain(rotX - movedY * 0.01, -1.5, 1.5); }
  openT += (openGoal - openT) * 0.05;
  if (!paused) antU += antSpeed;
  let ps = pieces();

  push();
  rotateX(rotX); rotateY(rotY);
  ambientLight(110); directionalLight(255, 255, 255, 0.3, 0.7, -0.6);
  noStroke();
  for (let p of ps) drawPiece(p);
  // 縁（ふち）：メビウスの帯の縁は 1 本だけ
  noFill(); strokeWeight(3);
  for (let p of ps) for (let s of [p.s0, p.s1]) {
    stroke(255, 230, 120);
    beginShape();
    for (let i = 0; i <= 150; i++) { let u = p.u0 + ((p.u1 - p.u0) * i) / 150; vertex(...pointAt(u, s, p)); }
    endShape();
  }
  // アリ：いちばん長い帯の真ん中を歩く
  let ap = ps[ps.length - 1], uLen = ap.u1 - ap.u0, sMid = (ap.s0 + ap.s1) / 2;
  let ua = ap.u0 + (antU % (2 * uLen));
  let n = normalAt(ua, sMid, ap), pos = pointAt(ua, sMid, ap), side = Math.floor(antU / uLen) % 2 === 0 ? 1 : -1;
  let up = n.map((x) => x * 9);
  trail.push(pos.map((x, i) => x + up[i] * 0.4));
  if (trail.length > 260) trail.shift();
  stroke(255, 80, 80); strokeWeight(3);
  beginShape(); for (let q of trail) vertex(...q); endShape();
  noStroke(); fill(40);
  let tang = pointAt(ua + 0.02, sMid, ap).map((x, i) => x - pos[i]), tl = Math.hypot(...tang) || 1;
  for (let j = -1; j <= 1; j++) { push(); translate(...pos.map((x, i) => x + up[i] + (tang[i] / tl) * j * 9)); sphere(j === 1 ? 6 : 5); pop(); }
  stroke(255, 80, 80); strokeWeight(4);
  line(...pos, ...pos.map((x, i) => x + up[i] * 3));   // アリの「頭の上」の向き
  pop();

  drawHud(ps, ua, uLen);
  drawingContext.clear(drawingContext.DEPTH_BUFFER_BIT);
  image(hud, -width / 2, -height / 2);
}

function drawPiece(p) {
  let nu = Math.round(((p.u1 - p.u0) / TWO_PI) * 110), ns = 4;
  for (let j = 0; j < ns; j++) {
    let sA = p.s0 + ((p.s1 - p.s0) * j) / ns, sB = p.s0 + ((p.s1 - p.s0) * (j + 1)) / ns;
    beginShape(TRIANGLE_STRIP);
    for (let i = 0; i <= nu; i++) {
      let u = p.u0 + ((p.u1 - p.u0) * i) / nu, g = 0.6 + 0.4 * Math.cos((u / (p.u1 - p.u0)) * TWO_PI);   // 帯にそって色を変える
      fill(p.hue[0] * g, p.hue[1] * g, p.hue[2] * g);
      vertex(...pointAt(u, sA, p)); vertex(...pointAt(u, sB, p));
    }
    endShape();
  }
}
// 面の向き（法線）を数値微分で求める
function normalAt(u, s, p) {
  let a = pointAt(u, s, p), b = pointAt(u + 0.01, s, p), c = pointAt(u, s + 0.5, p);
  let du = b.map((x, i) => x - a[i]), ds = c.map((x, i) => x - a[i]);
  let n = [du[1] * ds[2] - du[2] * ds[1], du[2] * ds[0] - du[0] * ds[2], du[0] * ds[1] - du[1] * ds[0]];
  let m = Math.hypot(...n) || 1;
  return n.map((x) => x / m);
}

function drawHud(ps, ua, uLen) {
  hud.clear(); hud.noStroke(); hud.fill(255); hud.textSize(18);
  hud.text('0：ふつうの輪　1：メビウスの帯　2：真ん中で切る　3：1/3 で切る　O：広げる　↑↓：アリの速さ　スペース：止める　ドラッグ：視点', 20, 40);
  hud.fill(170); hud.textSize(15);
  hud.text('黄色 = 縁（ふち）。赤い線 = アリの通った跡、赤い棒 = アリの頭の上の向き', 20, 68);
  let names = ['ふつうの輪：表と裏がある。縁は 2 本', 'メビウスの帯：片側しかない。縁は 1 本だけ！', '真ん中で切ると… 2 つに分かれず、長さ 2 倍・2 回ねじれた 1 本の輪', '1/3 で切ると… 細いメビウスの帯（橙）と、長い 2 回ねじれの輪（紫）が鎖のようにからまる'];
  hud.fill(255, 230, 120); hud.textSize(26);
  hud.text(names[mode], 20, height - 70);
  let laps = antU / uLen;
  hud.fill(255); hud.textSize(18);
  if (mode === 0) hud.text('アリ：何周しても同じ面（表）を歩く', 20, height - 34);
  else if (mode === 1) hud.text('アリ：' + nf(laps, 1, 1) + ' 周目 → ' + (Math.floor(laps) % 2 === 0 ? '出発した側' : '裏側（さかさま）') + '。2 周で元に戻る', 20, height - 34);
  else hud.text('切った帯の数：' + ps.length + '　（O で広げて形を確かめよう）', 20, height - 34);
}

function keyPressed() {
  if ('0123'.includes(key) && key.length === 1) { mode = int(key); trail = []; antU = 0; openGoal = 0; openT = 0; }
  if (key === 'o' || key === 'O') openGoal = openGoal ? 0 : 1;
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) antSpeed = min(0.06, antSpeed + 0.004);
  if (key === DOWN_ARROW) antSpeed = max(0, antSpeed - 0.004);
}

// ---------- やってみよう ----------
// 1. band() の k を 2 や 3 にすると？ 何回ねじると「片側しかない」になる？（奇数？偶数？）
// 2. 本物の紙テープでメビウスの帯をつくって、真ん中と 1/3 で切ってみよう。画面と同じになる？
// 3. 2 で切った帯をもう一度真ん中で切ると何本になる？ 予想してから紙で確かめよう
// 4. アリの跡の色を周回ごとに変えて、「1 周目は表、2 周目は裏」を見えるようにしよう
