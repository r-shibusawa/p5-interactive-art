// ============================================
// 14 リンク機構ブラシ（お絵かきマシン）
// 00 の 4 節リンクのカプラ点にペンを付け、紙を回転台でゆっくり回す → 少しずつずれた曲線が重なって模様になる
// 2 はスピログラフ：内歯車の中を小さな歯車が転がり、歯車の穴に差したペンが花模様を描く
// 1 = リンク機構 / 2 = スピログラフ / ● をドラッグ = リンクの長さ・ペンの位置 / ←→ = 回転台の速さ・歯数 / ↑↓ = 描く速さ / T = 回転台 / H = 色 / C = 消す / S = 保存
// ============================================

let machineId = 1;             // 1 リンク機構 / 2 スピログラフ
let La = 70, Lb = 250, Lc = 170, Ld = 200;   // ★ 4 節リンクの長さ（クランク・カプラ・ロッカー・固定）
let cu = 1.9, cv = 0;          // ★ ペンの位置（カプラ A→B 方向に cu×b、直角方向に cv）
let tableRatio = 0.031;        // ★ クランク 1 回転あたりの回転台の回転（割り切れない数ほど細かい模様）
let ringZ = 96, wheelZ = 52;   // ★ スピログラフの歯数（内歯車・動く歯車）
let penHole = 0.7;             // ★ ペンの穴の位置（歯車の半径に対する比）
let stepsPerFrame = 8;         // 1 フレームに進める回数（↑↓）
let th = 0, tableAngle = 0, branch = -1, turnDir = 1;
let tableOn = true, rainbow = true, penHue = 190;
let paper, paperR = 0, pcx = 0, pcy = 0, lastPen = null, grab = null;
let ox = 0, oy = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  paperR = Math.min(height * 0.4, width * 0.26);
  pcx = width - paperR - 40; pcy = height * 0.52;
  ox = pcx - paperR * 0.45 - 356; oy = pcy + 243;      // リンクの台は紙の左下。ペンが紙の左半分に届く位置
  paper = createGraphics(Math.ceil(paperR * 2), Math.ceil(paperR * 2));
  paper.colorMode(HSB, 360, 100, 100, 100);
  paper.noFill();
}

// 00 と同じ：4 節リンクのループを解く（A = クランクの先、B = 2 つの円の交点、P = ペン）
function solveBar(theta, br) {
  let A = { x: ox + La * Math.cos(theta), y: oy - La * Math.sin(theta) };
  let dx = ox + Ld - A.x, dy = oy - A.y, e = Math.hypot(dx, dy);
  if (e > Lb + Lc || e < Math.abs(Lb - Lc) || e < 1e-6) return null;
  let k = (Lb * Lb - Lc * Lc + e * e) / (2 * e), hh = Math.sqrt(Math.max(Lb * Lb - k * k, 0));
  let B = { x: A.x + (k * dx - br * hh * dy) / e, y: A.y + (k * dy + br * hh * dx) / e };
  let ux = (B.x - A.x) / Lb, uy = (B.y - A.y) / Lb;
  return { A, B, ux, uy, P: { x: A.x + cu * Lb * ux - cv * uy, y: A.y + cu * Lb * uy + cv * ux } };
}
// スピログラフ：角度 t のときの動く歯車の中心とペンの位置（ハイポトロコイド）
function spiro(t) {
  let rr = paperR * 0.92, rw = (rr * wheelZ) / ringZ;
  let wx = pcx + (rr - rw) * Math.cos(t), wy = pcy + (rr - rw) * Math.sin(t);
  let roll = (-t * (ringZ - wheelZ)) / wheelZ;                       // 転がるので逆向きに自転する
  return { wx, wy, rw, rr, roll, P: { x: wx + penHole * rw * Math.cos(roll), y: wy + penHole * rw * Math.sin(roll) } };
}

// ★ ペンの位置を「回っている紙の上の座標」に直して線を引く
function drawOnPaper(P) {
  let dx = P.x - pcx, dy = P.y - pcy;
  if (Math.hypot(dx, dy) > paperR - 2) { lastPen = null; return; }   // 紙の外
  let c = Math.cos(-tableAngle), s = Math.sin(-tableAngle);
  let q = { x: dx * c - dy * s + paperR, y: dx * s + dy * c + paperR };
  if (lastPen) {
    paper.stroke(penHue, 70, 100, 55);
    paper.strokeWeight(1.4);
    paper.line(lastPen.x, lastPen.y, q.x, q.y);
  }
  lastPen = q;
}

function draw() {
  background(212, 45, 13);
  let dth = 0.02;
  if (!grab) {
    for (let i = 0; i < stepsPerFrame; i++) {
      if (machineId === 1) {
        let next = th + turnDir * dth;
        if (solveBar(next, branch)) th = next; else { turnDir = -turnDir; branch = -branch; }
        let sv = solveBar(th, branch);
        if (sv) drawOnPaper(sv.P); else lastPen = null;
      } else {
        th += dth;
        drawOnPaper(spiro(th).P);
      }
      if (tableOn) tableAngle += dth * tableRatio;
      if (rainbow) penHue = (penHue + 0.02) % 360;
    }
  }

  // ---- 紙（回転台ごと回して表示）
  noStroke(); fill(220, 30, 8); circle(pcx, pcy, paperR * 2 + 10);
  push();
  translate(pcx, pcy);
  rotate(tableAngle);
  image(paper, -paperR, -paperR);
  stroke(0, 0, 100, 25); strokeWeight(1); line(paperR - 14, 0, paperR, 0);
  pop();
  noFill(); stroke(0, 0, 100, 30); strokeWeight(1); circle(pcx, pcy, paperR * 2);

  // ---- 機械
  if (machineId === 1) {
    let sv = solveBar(th, branch), o4 = { x: ox + Ld, y: oy };
    noStroke(); fill(0, 0, 40);
    for (let p of [{ x: ox, y: oy }, o4]) triangle(p.x, p.y, p.x - 14, p.y + 20, p.x + 14, p.y + 20);
    if (sv) {
      strokeWeight(7);
      stroke(8, 75, 100, 85); line(ox, oy, sv.A.x, sv.A.y);
      stroke(200, 60, 95, 85); line(sv.A.x, sv.A.y, sv.B.x, sv.B.y);
      stroke(150, 60, 85, 85); line(o4.x, o4.y, sv.B.x, sv.B.y);
      strokeWeight(2); stroke(200, 60, 95, 55); line(sv.A.x, sv.A.y, sv.P.x, sv.P.y); line(sv.B.x, sv.B.y, sv.P.x, sv.P.y);
      noStroke(); fill(0, 0, 100);
      for (let p of [{ x: ox, y: oy }, o4, sv.A, sv.B]) circle(p.x, p.y, 13);
      fill(penHue, 70, 100); circle(sv.P.x, sv.P.y, 14);
    } else {
      noStroke(); fill(0, 80, 100); textSize(16); text('組み立てられない。● を動かすか R', ox - 20, oy - 200);
      fill(0, 0, 100); circle(ox, oy, 13); circle(o4.x, o4.y, 13); circle(ox + La * Math.cos(th), oy - La * Math.sin(th), 13);
    }
  } else {
    let sp = spiro(th);
    noFill(); stroke(150, 50, 80, 70); strokeWeight(3); circle(pcx, pcy, sp.rr * 2);
    stroke(200, 55, 95, 80); strokeWeight(2); fill(200, 50, 80, 12); circle(sp.wx, sp.wy, sp.rw * 2);
    stroke(200, 55, 95, 50); strokeWeight(1);
    for (let k = 0; k < 6; k++) line(sp.wx, sp.wy, sp.wx + sp.rw * Math.cos(sp.roll + (k * Math.PI) / 3), sp.wy + sp.rw * Math.sin(sp.roll + (k * Math.PI) / 3));
    noStroke(); fill(penHue, 70, 100); circle(sp.P.x, sp.P.y, 14);
  }

  // ---- 文字
  noStroke(); fill(0, 0, 100); textSize(18);
  text('1：リンク　2：スピログラフ　● ドラッグ：形　←→：' + (machineId === 1 ? '回転台の比 ' + nf(tableRatio, 1, 3) : '歯数 ' + wheelZ + ' / ' + ringZ) + '　↑↓：速さ ' + stepsPerFrame + '　T：回転台 ' + (tableOn ? 'ON' : 'off') + '　H：色　C：消す　S：保存', 20, 40);
  fill(0, 0, 60); textSize(15);
  text(machineId === 1 ? 'カプラ点の曲線（00）を、回る紙の上に描く。リンクの長さを 1 か所変えるだけで模様がまるで変わる' : '花びらの数 = 内歯車の歯数 ÷ 最大公約数。' + ringZ + ' と ' + wheelZ + ' なら ' + ringZ / gcd(ringZ, wheelZ) + ' 枚、' + wheelZ / gcd(ringZ, wheelZ) + ' 周で閉じる', 20, 68);
  if (machineId === 1) {
    fill(0, 0, 100, 8); rect(24, 100, 250, 96, 10);
    fill(0, 0, 100); textSize(14);
    text('a = ' + nf(La, 1, 0) + '　b = ' + nf(Lb, 1, 0) + '　c = ' + nf(Lc, 1, 0) + '　d = ' + nf(Ld, 1, 0), 38, 126);
    text('ペン：cu = ' + nf(cu, 1, 2) + '　cv = ' + nf(cv, 1, 0), 38, 150);
    fill(0, 0, 60); textSize(12); text('O4・A・B・ペンの ● をドラッグ', 38, 176);
  }
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function mousePressed() {
  grab = null;
  if (machineId === 1) {
    let sv = solveBar(th, branch);
    let cand = [{ id: 'O4', x: ox + Ld, y: oy }, { id: 'A', x: ox + La * Math.cos(th), y: oy - La * Math.sin(th) }];
    if (sv) cand.push({ id: 'B', x: sv.B.x, y: sv.B.y }, { id: 'P', x: sv.P.x, y: sv.P.y });
    for (let c of cand) if (Math.hypot(mouseX - c.x, mouseY - c.y) < 22) grab = c.id;
  } else {
    let sp = spiro(th);
    if (Math.hypot(mouseX - sp.wx, mouseY - sp.wy) < sp.rw + 10) grab = 'hole';
  }
}
function mouseDragged() {
  if (!grab) return;
  lastPen = null;
  if (grab === 'hole') { let sp = spiro(th); penHole = constrain(Math.hypot(mouseX - sp.wx, mouseY - sp.wy) / sp.rw, 0.05, 1.3); return; }
  if (grab === 'O4') Ld = constrain(mouseX - ox, 40, 420);
  if (grab === 'A') { La = constrain(Math.hypot(mouseX - ox, mouseY - oy), 20, 220); th = Math.atan2(oy - mouseY, mouseX - ox); }
  let A = { x: ox + La * Math.cos(th), y: oy - La * Math.sin(th) };
  if (grab === 'B') {
    Lb = constrain(Math.hypot(mouseX - A.x, mouseY - A.y), 40, 480);
    Lc = constrain(Math.hypot(mouseX - ox - Ld, mouseY - oy), 40, 480);
    branch = (ox + Ld - A.x) * (mouseY - A.y) - (oy - A.y) * (mouseX - A.x) >= 0 ? 1 : -1;
  }
  if (grab === 'P') {
    let sv = solveBar(th, branch);
    if (sv) { let wx = mouseX - sv.A.x, wy = mouseY - sv.A.y; cu = constrain((wx * sv.ux + wy * sv.uy) / Lb, -2, 3); cv = constrain(-wx * sv.uy + wy * sv.ux, -500, 500); }
  }
}
function mouseReleased() { grab = null; }

function keyPressed() {
  if (key === '1' || key === '2') { machineId = Number(key); lastPen = null; }
  if (key === LEFT_ARROW) { if (machineId === 1) tableRatio = constrain(tableRatio - 0.004, 0.003, 0.5); else wheelZ = constrain(wheelZ - 1, 20, 88); lastPen = null; }
  if (key === RIGHT_ARROW) { if (machineId === 1) tableRatio = constrain(tableRatio + 0.004, 0.003, 0.5); else wheelZ = constrain(wheelZ + 1, 20, 88); lastPen = null; }
  if (key === UP_ARROW) stepsPerFrame = constrain(stepsPerFrame + 2, 2, 40);
  if (key === DOWN_ARROW) stepsPerFrame = constrain(stepsPerFrame - 2, 2, 40);
  if (key === 't' || key === 'T') tableOn = !tableOn;
  if (key === 'h' || key === 'H') { rainbow = !rainbow; penHue = (penHue + 67) % 360; }
  if (key === 'c' || key === 'C') { paper.clear(); lastPen = null; }
  if (key === 's' || key === 'S') saveCanvas('linkage-brush', 'png');
  if (key === 'r' || key === 'R') { La = 70; Lb = 250; Lc = 170; Ld = 200; cu = 1.9; cv = 0; th = 0; branch = -1; turnDir = 1; lastPen = null; }
}

// ---------- やってみよう ----------
// 1. リンク機構（1）で C を押してから、ペンの ● を少し動かして描き直そう。同じ機械でも模様がまるで変わる
// 2. tableRatio を 0.25（ちょうど 1/4）にすると 4 回で同じ線に戻る。0.031 のような半端な数だと？
// 3. スピログラフ（2）で歯数を 48 / 96 にすると直線（だ円）になる。なぜ？（カルダン歯車）
// 4. T で回転台を止めて、スピログラフの花びらの数を数えよう。歯数の最大公約数から予想できる
// 5. 作品づくり：C で消し、H で色を固定 → 形を変えて重ね描き → S で保存。背景色や線の太さ（drawOnPaper）も変えてみよう
