// ============================================
// 00 4 節リンク機構
// 4 本の棒をピンでつないだ、いちばん基本の機構。クランク a を回すとロッカー c が揺れ、カプラ b 上の点が曲線を描く
// グラスホフの条件：最短 s + 最長 l ≤ 残り p + q なら、どれかのリンクが 1 回転できる
// ● をドラッグ = リンクの長さを変える / 1〜4 = 見本 / B = 組み立て方を反転 / ↑↓ = 速さ / スペース = 止める / R = リセット
// ============================================

let La = 90, Lb = 260, Lc = 180, Ld = 240;   // ★ クランク a、カプラ b、ロッカー c、固定リンク d（px）
let cu = 0.5, cv = 90;                        // ★ カプラ点 P の位置（A→B 方向に cu×b、直角方向に cv）
let th = 0.5, turnDir = 1, branch = 1;        // クランク角、回る向き、組み立て方（+1 / -1）
let turnSpeed = 0.03;                         // ★ 回る速さ（ラジアン/フレーム）
let playing = true, grab = null;
let ox = 0, oy = 0;                           // 固定ピン O2 の位置

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  ox = width * 0.3; oy = height * 0.66;
}

// ★ ループ閉じ込みの式を解く：A はクランクの先、B は「A 中心・半径 b の円」と「O4 中心・半径 c の円」の交点
function solveBar(theta, br) {
  let A = { x: ox + La * Math.cos(theta), y: oy - La * Math.sin(theta) };
  let dx = ox + Ld - A.x, dy = oy - A.y, e = Math.hypot(dx, dy);
  if (e > Lb + Lc || e < Math.abs(Lb - Lc) || e < 1e-6) return null;   // 円が交わらない = 組み立てられない
  let k = (Lb * Lb - Lc * Lc + e * e) / (2 * e);
  let hh = Math.sqrt(Math.max(Lb * Lb - k * k, 0));
  let B = { x: A.x + (k * dx - br * hh * dy) / e, y: A.y + (k * dy + br * hh * dx) / e };
  let ux = (B.x - A.x) / Lb, uy = (B.y - A.y) / Lb;
  let P = { x: A.x + cu * Lb * ux - cv * uy, y: A.y + cu * Lb * uy + cv * ux };
  return { A, B, P, ux, uy };
}

// グラスホフの条件で機構の種類を判定する
function classify() {
  let v = [La, Lb, Lc, Ld].slice().sort((p, q) => p - q);
  let sl = v[0] + v[3], pq = v[1] + v[2];
  let kind;
  if (Math.abs(sl - pq) < 0.5) kind = '思案点あり（s + l = p + q）';
  else if (sl > pq) kind = '両てこ（非グラスホフ：どれも 1 回転できない）';
  else if (Ld === v[0]) kind = '両クランク（固定リンクが最短）';
  else if (Lb === v[0]) kind = '両てこ（カプラが最短：カプラが 1 回転）';
  else kind = 'てこクランク（クランクが最短）';
  return { sl, pq, kind, ok: sl <= pq + 0.5 };
}

// カプラ曲線：クランク角を 1 周ぶん試して P をつなぐ（解けない角度では線を切る）
function drawCouplerCurve(br) {
  let drawing = false;
  for (let i = 0; i <= 360; i++) {
    let s = solveBar((i / 360) * TWO_PI, br);
    if (s) {
      if (!drawing) { beginShape(); drawing = true; }
      vertex(s.P.x, s.P.y);
    } else if (drawing) { endShape(); drawing = false; }
  }
  if (drawing) endShape();
}

function findStart() {
  for (let i = 0; i < 360; i++) {
    let t = th + (i / 360) * TWO_PI;
    if (solveBar(t, branch)) { th = t; return; }
  }
}

function draw() {
  background(212, 45, 13);
  // 回す：解けなくなったら死点。向きを反転し、組み立て方も入れ替わる
  if (playing && !grab) {
    let next = th + turnDir * turnSpeed;
    if (solveBar(next, branch)) th = next;
    else if (solveBar(th, branch)) { turnDir = -turnDir; branch = -branch; }
  }
  let s = solveBar(th, branch);
  let o4 = { x: ox + Ld, y: oy };

  // カプラ曲線（いまの組み立て方 = 明るい、反対 = 暗い）
  noFill();
  strokeWeight(1.5); stroke(35, 60, 70, 35); drawCouplerCurve(-branch);
  strokeWeight(3); stroke(35, 90, 100, 90); drawCouplerCurve(branch);

  // 固定リンク（地面）
  stroke(0, 0, 45); strokeWeight(3);
  line(ox - 40, oy + 22, o4.x + 40, oy + 22);
  for (let p of [{ x: ox, y: oy }, o4]) { noStroke(); fill(0, 0, 40); triangle(p.x, p.y, p.x - 16, p.y + 22, p.x + 16, p.y + 22); }

  if (s) {
    // カプラの三角形（A, B, P）
    noStroke(); fill(200, 50, 90, 22);
    triangle(s.A.x, s.A.y, s.B.x, s.B.y, s.P.x, s.P.y);
    strokeWeight(10);
    stroke(8, 75, 100); line(ox, oy, s.A.x, s.A.y);          // クランク a
    stroke(200, 60, 95); line(s.A.x, s.A.y, s.B.x, s.B.y);   // カプラ b
    stroke(150, 60, 85); line(o4.x, o4.y, s.B.x, s.B.y);     // ロッカー c
    strokeWeight(2); stroke(200, 60, 95, 60);
    line(s.A.x, s.A.y, s.P.x, s.P.y); line(s.B.x, s.B.y, s.P.x, s.P.y);
    noStroke(); fill(0, 0, 100);
    for (let p of [{ x: ox, y: oy }, o4, s.A, s.B]) circle(p.x, p.y, 16);
    fill(35, 90, 100); circle(s.P.x, s.P.y, 16);
    fill(0, 0, 100); textSize(14);
    text('O2', ox - 34, oy + 4); text('O4（ドラッグ）', o4.x + 14, oy + 4);
    text('A', s.A.x + 12, s.A.y - 10); text('B', s.B.x + 12, s.B.y - 10); text('P', s.P.x + 12, s.P.y - 10);
  } else {
    fill(0, 90, 100); noStroke(); textSize(20);
    text('この長さでは組み立てられない（b + c が短すぎる / 長すぎる）。● を動かすか R', ox - 60, oy - 200);
    fill(0, 0, 100); circle(ox, oy, 16); circle(o4.x, o4.y, 16);
    fill(8, 75, 100); circle(ox + La * Math.cos(th), oy - La * Math.sin(th), 16);
  }

  // 文字
  let g = classify();
  noStroke(); fill(0, 0, 100); textSize(18);
  text('● をドラッグ：リンクの長さ　1〜4：見本　B：組み立て方を反転　↑↓：速さ　スペース：' + (playing ? '止める' : '動かす') + '　R：リセット', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('クランク（赤）を回すと、カプラ上の点 P（黄）がカプラ曲線を描く。歩行ロボットの足やワイパーはこの曲線の使い方', 20, 68);

  let px = width - 430, py = 120;
  fill(0, 0, 100, 8); rect(px - 16, py - 30, 420, 218, 10);
  fill(0, 0, 100); textSize(16);
  text('a = ' + nf(La, 1, 0) + '　b = ' + nf(Lb, 1, 0) + '　c = ' + nf(Lc, 1, 0) + '　d = ' + nf(Ld, 1, 0), px, py);
  text('グラスホフの条件：s + l ≤ p + q', px, py + 30);
  fill(g.ok ? 140 : 0, 70, 100);
  text('s + l = ' + nf(g.sl, 1, 0) + (g.ok ? ' ≤ ' : ' > ') + 'p + q = ' + nf(g.pq, 1, 0) + (g.ok ? '　→ 成立' : '　→ 不成立'), px, py + 56);
  fill(35, 90, 100);
  text(g.kind, px, py + 86);
  if (s) {
    // 伝達角 μ：カプラとロッカーのなす角。90° に近いほど力がよく伝わる
    let mu = Math.acos(constrain(((s.A.x - s.B.x) * (o4.x - s.B.x) + (s.A.y - s.B.y) * (o4.y - s.B.y)) / (Lb * Lc), -1, 1));
    let muDeg = mu * 180 / Math.PI;
    let bad = muDeg < 40 || muDeg > 140;
    fill(bad ? 0 : 0, bad ? 80 : 0, 100);
    text('伝達角 μ = ' + nf(muDeg, 1, 0) + '°' + (bad ? '（力が伝わりにくい）' : ''), px, py + 116);
    fill(0, 0, 60); textSize(13);
    text('クランク角 θ = ' + nf((((th * 180 / Math.PI) % 360) + 360) % 360, 1, 0) + '°　組み立て方 ' + (branch > 0 ? '＋' : '−'), px, py + 142);
    text('式：B は |B − A| = b と |B − O4| = c の交点（2 通り）', px, py + 164);
  }
}

// ---------- ドラッグ ----------
function mousePressed() {
  let s = solveBar(th, branch);
  let cand = [{ id: 'O4', x: ox + Ld, y: oy }, { id: 'A', x: ox + La * Math.cos(th), y: oy - La * Math.sin(th) }];
  if (s) cand.push({ id: 'B', x: s.B.x, y: s.B.y }, { id: 'P', x: s.P.x, y: s.P.y });
  grab = null;
  for (let c of cand) if (Math.hypot(mouseX - c.x, mouseY - c.y) < 22) grab = c.id;
}
function mouseDragged() {
  if (!grab) return;
  if (grab === 'O4') Ld = constrain(mouseX - ox, 40, 520);
  if (grab === 'A') { La = constrain(Math.hypot(mouseX - ox, mouseY - oy), 30, 320); th = Math.atan2(oy - mouseY, mouseX - ox); }
  let A = { x: ox + La * Math.cos(th), y: oy - La * Math.sin(th) };
  if (grab === 'B') {
    Lb = constrain(Math.hypot(mouseX - A.x, mouseY - A.y), 40, 520);
    Lc = constrain(Math.hypot(mouseX - ox - Ld, mouseY - oy), 40, 520);
    let dx = ox + Ld - A.x, dy = oy - A.y;
    branch = dx * (mouseY - A.y) - dy * (mouseX - A.x) >= 0 ? 1 : -1;
  }
  if (grab === 'P') {
    let s = solveBar(th, branch);
    if (s) {
      let wx = mouseX - s.A.x, wy = mouseY - s.A.y;
      cu = constrain((wx * s.ux + wy * s.uy) / Lb, -1.5, 2.5);
      cv = constrain(-wx * s.uy + wy * s.ux, -400, 400);
    }
  }
}
function mouseReleased() { grab = null; }

function keyPressed() {
  let presets = { '1': [90, 260, 180, 240], '2': [200, 220, 210, 80], '3': [200, 80, 210, 240], '4': [150, 180, 160, 300] };
  if (presets[key]) { [La, Lb, Lc, Ld] = presets[key]; findStart(); }
  if (key === 'b' || key === 'B') { branch = -branch; findStart(); }
  if (key === ' ') playing = !playing;
  if (key === UP_ARROW) turnSpeed = constrain(turnSpeed + 0.005, 0.005, 0.12);
  if (key === DOWN_ARROW) turnSpeed = constrain(turnSpeed - 0.005, 0.005, 0.12);
  if (key === 'r' || key === 'R') { La = 90; Lb = 260; Lc = 180; Ld = 240; cu = 0.5; cv = 90; th = 0.5; branch = 1; turnDir = 1; }
}

// ---------- やってみよう ----------
// 1. 1〜4 を押して種類を見比べよう。2（両クランク）ではロッカーも 1 回転する。どのリンクが最短？
// 2. 4（非グラスホフ）ではクランクが途中で止まって引き返す。止まる瞬間、A・B・O4 は一直線（死点）
// 3. 点 P をドラッグして、ほぼ直線になる部分を持つカプラ曲線を探そう（ワットやチェビシェフの近似直線機構）
// 4. 伝達角 μ が 40° を切らないように a〜d を決めるのが設計の基本。1 の見本で μ の最小値を読み取ろう
// 5. cu = 0.5, cv = 0 にすると P は棒の上。曲線はどう変わる？
