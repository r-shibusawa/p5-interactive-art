// ============================================
// 03 立方根 2 の作図（メッサーの方法）
// 体積が 2 倍の立方体の一辺 ∛2 を作図せよ（デロス島の問題）── 定規とコンパスでは不可能
//   折り紙なら O6 を 1 回使うだけ。紙を 3 等分して、角と点を同時に 2 本の線へ乗せる
// →／スペース = 次の手順 / ← = 前の手順 / A = 自動で進む / G = 3 等分の線の高さを動かして一般化
// ============================================

let stepNo = 0;
let phi = 0;
let auto = false, autoT = 0;
let general = false;        // G：l1 の高さ h を動かす
let h = 1 / 3;              // ★ 下の線 l1 の高さ（3 等分なら 1/3）
let px0, py0, PS;

const STEPS = [
  '正方形の紙（一辺 1）。目標：左の辺を ∛2 : 1 に分ける点',
  '紙を横に 3 等分する線 l1（1/3）・l2（2/3）を折る',
  '点 P = l1 と右の辺の交点、C = 右下の角',
  'O6：角 C を左の辺の上に、点 P を l2 の上に、同時に乗せて折る',
  'C の行き先 C′ が、左の辺を 上 : 下 = ∛2 : 1 に分ける！',
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  PS = min(width * 0.5, height - 170);
  px0 = 60; py0 = 110;
}
function sx(u) { return px0 + u * PS; }
function sy(v) { return py0 + PS - v * PS; }

// ★ O6：C(1, 0) を左の辺 x = 0 に、P(1, h) を l2（y = 2h）に乗せる折り線
function solveFold() {
  let C = { x: 1, y: 0 }, P = { x: 1, y: h };
  let l2 = { p: { x: 0, y: 2 * h }, u: { x: 1, y: 0 } };
  let f = (t) => { let X = { x: 0, y: t }; return sdist(refl(P, bisector(C, X)), l2); };
  let best = null, N = 2000, pt = 0.001, pf = f(pt);
  for (let i = 1; i <= N; i++) {
    let t = 0.001 + 0.998 * i / N, v = f(t);
    if (pf * v <= 0) {
      let lo = pt, hi = t, flo = pf;
      for (let k = 0; k < 50; k++) { let m = (lo + hi) / 2, fm = f(m); if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } }
      let X = { x: 0, y: (lo + hi) / 2 }, cr = bisector(C, X);
      best = { crease: cr, Cp: X, Pp: refl(P, cr) };
    }
    pt = t; pf = v;
  }
  return best;
}

function draw() {
  background(34, 32, 40);
  if (auto) { autoT++; if (autoT % 120 === 0) stepNo = (stepNo + 1) % STEPS.length; }
  if (general) h = constrain(map(mouseY, py0 + PS, py0, 0.15, 0.48), 0.15, 0.48);
  let target = stepNo === 3 ? PI : (stepNo === 4 && frameCount % 160 < 80 ? PI : 0);
  phi += (target - phi) * 0.08;
  let sol = solveFold();

  noStroke(); fill(246, 240, 226); rect(px0, py0, PS, PS);
  if (stepNo >= 1) {
    stroke(120); strokeWeight(2);
    drawingContext.setLineDash([8, 6]);
    line(sx(0), sy(h), sx(1), sy(h)); line(sx(0), sy(2 * h), sx(1), sy(2 * h));
    drawingContext.setLineDash([]);
    noStroke(); fill(90); textSize(15);
    text('l1', sx(1) + 6, sy(h) + 5); text('l2', sx(1) + 6, sy(2 * h) + 5);
  }
  if (stepNo >= 2) {
    noStroke(); fill(40); circle(sx(1), sy(h), 10); circle(sx(1), sy(0), 10);
    fill(230); textSize(16); text('P', sx(1) + 10, sy(h) - 10); text('C', sx(1) + 10, sy(0) + 4);
  }
  if (sol && stepNo >= 3) {
    let seg = clipSquare(sol.crease);
    if (seg) { stroke(255, 190, 40); strokeWeight(3); line(sx(seg[0].x), sy(seg[0].y), sx(seg[1].x), sy(seg[1].y)); }
    let side = sdist({ x: 1, y: 0 }, sol.crease) > 0 ? 1 : -1;
    let flap = clipHalf([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], sol.crease, side);
    if (phi > 0.02) {
      let k = 1 - cos(phi);
      fill(phi > HALF_PI ? color(226, 84, 72, 220) : color(255, 250, 235, 230));
      stroke(80, 40, 40); strokeWeight(1);
      beginShape();
      for (let p of flap) { let s = sdist(p, sol.crease); vertex(sx(p.x + sol.crease.u.y * s * k), sy(p.y - sol.crease.u.x * s * k)); }
      endShape(CLOSE);
    }
    noStroke(); fill(40);
    circle(sx(sol.Cp.x), sy(sol.Cp.y), 12); circle(sx(sol.Pp.x), sy(sol.Pp.y), 10);
    textSize(15); text('C′', sx(sol.Cp.x) + 10, sy(sol.Cp.y) + 5); text('P′', sx(sol.Pp.x) + 8, sy(sol.Pp.y) - 8);
  }
  if (sol && stepNo >= 4) {
    // 左の辺を 2 色で塗り分ける
    strokeWeight(8);
    stroke(60, 110, 220); line(sx(0) - 14, sy(1), sx(0) - 14, sy(sol.Cp.y));
    stroke(40, 160, 110); line(sx(0) - 14, sy(sol.Cp.y), sx(0) - 14, sy(0));
  }

  // 説明
  let tx = px0 + PS + 60;
  noStroke(); fill(255); textSize(18);
  text('→／スペース：次へ　←：戻る　A：自動 ' + (auto ? 'ON' : 'off') + '　G：l1 の高さをマウスで動かす ' + (general ? 'ON（h = ' + nf(h, 1, 3) + '）' : 'off'), 20, 40);
  fill(170); textSize(15);
  text('立方体の体積を 2 倍にするには一辺を ∛2 = 1.2599… 倍。∛2 は 3 次方程式 x³ = 2 の解なので、定規とコンパスでは作図できない', 20, 68);
  fill(255, 190, 40); textSize(30); text('手順 ' + stepNo + ' / ' + (STEPS.length - 1), tx, py0 + 30);
  fill(255); textSize(19); text(STEPS[stepNo], tx, py0 + 60, width - tx - 30, 100);
  textSize(16);
  let y = py0 + 170;
  for (let i = 0; i < STEPS.length; i++) { fill(i === stepNo ? 255 : 120); text(i + '. ' + STEPS[i], tx, y, width - tx - 30, 50); y += 44; }
  if (sol && stepNo >= 4) {
    let up = 1 - sol.Cp.y, lo = sol.Cp.y;
    fill(110, 160, 255); textSize(20); text('上 = ' + nf(up, 1, 5), tx, y + 20);
    fill(40, 200, 140); text('下 = ' + nf(lo, 1, 5), tx + 180, y + 20);
    fill(255); text('上 ÷ 下 = ' + nf(up / lo, 1, 6), tx, y + 54);
    fill(255, 190, 40); text('∛2    = ' + nf(Math.cbrt(2), 1, 6), tx, y + 84);
    drawCubes(tx + 330, y + 90, 50, up / lo);
  } else if (!sol) { fill(255, 120, 100); text('この h では紙の中で折れない', tx, y + 20); }
}

// 一辺 1 と 一辺 r の立方体を並べる（体積 1 と r³）
function drawCubes(x, y, s, r) {
  for (let [k, len, c] of [[0, 1, color(40, 160, 110)], [1, r, color(60, 110, 220)]]) {
    let L = s * len, cx = x + k * s * 2.6, d = L * 0.45;
    stroke(255); strokeWeight(1.5); fill(red(c), green(c), blue(c), 160);
    quad(cx, y, cx + L, y, cx + L, y - L, cx, y - L);
    quad(cx, y - L, cx + L, y - L, cx + L + d, y - L - d, cx + d, y - L - d);
    quad(cx + L, y, cx + L + d, y - d, cx + L + d, y - L - d, cx + L, y - L);
    noStroke(); fill(255); textSize(14);
    text('体積 ' + nf(len * len * len, 1, 3), cx, y + 22);
  }
}

function keyPressed() {
  if (key === RIGHT_ARROW || key === ' ') stepNo = min(stepNo + 1, STEPS.length - 1);
  if (key === LEFT_ARROW) stepNo = max(stepNo - 1, 0);
  if (key === 'a' || key === 'A') { auto = !auto; autoT = 0; }
  if (key === 'g' || key === 'G') { general = !general; if (!general) h = 1 / 3; }
}

// ---------- やってみよう ----------
// 1. 手順 4 の比が ∛2 と何桁まで合っているか見よう。本物の紙で折るとどのくらいずれる？
// 2. G で l1 の高さ h を変えると比はどう変わる？ h = 1/3 のときだけ ∛2 になる理由を考えよう
// 3. ∛2 があれば「体積 2 倍の立方体」が折れる。∛3 をつくるにはどうすればいい？（ヒント：O6 の条件を変える）
// 4. 02 の角の三等分と比べよう。どちらも O6 が 3 次方程式を解いている


// ==================================================
// ここから下は「折り紙の幾何の道具」（紙の座標：一辺 1）
// ==================================================
function nrm(x, y) { let l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
function bisector(a, b) { return { p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, u: nrm(-(b.y - a.y), b.x - a.x) }; }
function sdist(q, L) { return (q.x - L.p.x) * -L.u.y + (q.y - L.p.y) * L.u.x; }
function refl(q, L) { let s = sdist(q, L); return { x: q.x + 2 * s * L.u.y, y: q.y - 2 * s * L.u.x }; }
function clipHalf(pts, L, side) {
  let out = [];
  for (let i = 0; i < pts.length; i++) {
    let p = pts[i], q = pts[(i + 1) % pts.length], s1 = sdist(p, L) * side, s2 = sdist(q, L) * side;
    if (s1 >= 0) out.push(p);
    if (s1 * s2 < 0) { let t = s1 / (s1 - s2); out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
  }
  return out;
}
function clipSquare(L) {
  let sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], r = [];
  for (let i = 0; i < 4; i++) {
    let p = sq[i], q = sq[(i + 1) % 4], s1 = sdist(p, L), s2 = sdist(q, L);
    if (s1 * s2 <= 0 && s1 !== s2) { let t = s1 / (s1 - s2); r.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
  }
  return r.length >= 2 ? r : null;
}
