// ============================================
// 02 角の三等分（阿部の方法）
// 「定規とコンパスで任意の角を 3 等分することはできない」（1837 年に証明）。でも折り紙ならできる
//   決め手は O6（2 点を 2 直線に同時に乗せる折り）。3 次方程式を 1 回の折りで解いている
// →／スペース = 次の手順 / ← = 前の手順 / ↑↓ = 角 θ を変える / A = 自動で進む
// ============================================

let theta = 66;          // ★ 3 等分したい角（度）。0〜90
let a = 0.22;            // ★ 平行線の間隔（紙の一辺 = 1）。小さいほど大きな角まで折れる
let stepNo = 0;
let phi = 0;             // 折りのアニメーション（0 = 広げた、PI = 折った）
let auto = false, autoT = 0;
let px0, py0, PS;

const STEPS = [
  '角 θ が与えられた（左下の角 Q と、下の辺・直線 l でできる角）',
  '下の辺と平行な線 L2 を折る（高さ 2a、どこでもよい）',
  '下の辺を L2 に重ねて、真ん中の線 L1（高さ a）を折る。左の辺との交点を M・P とする',
  'O6：角 Q を L1 の上に、点 P を直線 l の上に、同時に乗せて折る',
  '折ったまま、Q・M の行き先 Q′・M′ に印をつけて広げる',
  '左下の角 Q から Q′ と M′ へ線を引く → θ が 3 等分された！',
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  PS = min(width * 0.5, height - 170);
  px0 = 60; py0 = 110;
}
// 紙の座標（左下が原点、一辺 1、y は上向き）→ 画面
function sx(u) { return px0 + u * PS; }
function sy(v) { return py0 + PS - v * PS; }

// ★ O6 で折り線を求める：Q を L1（y = a）に、P(0, 2a) を直線 l に乗せる
function solveFold() {
  let r = radians(theta);
  let l = { p: { x: 0, y: 0 }, u: { x: cos(r), y: sin(r) } };
  let L1 = { p: { x: 0, y: a }, u: { x: 1, y: 0 } };
  let Q = { x: 0, y: 0 }, P = { x: 0, y: 2 * a }, M = { x: 0, y: a };
  let f = (t) => { let X = { x: t, y: a }; return sdist(refl(P, bisector(Q, X)), l); };
  let best = null, N = 3000, pt = -3, pf = f(-3);
  for (let i = 1; i <= N; i++) {
    let t = -3 + 6 * i / N, v = f(t);
    if (pf * v <= 0) {
      let lo = pt, hi = t, flo = pf;
      for (let k = 0; k < 50; k++) { let m = (lo + hi) / 2, fm = f(m); if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; } }
      let X = { x: (lo + hi) / 2, y: a }, cr = bisector(Q, X), Pp = refl(P, cr);
      // 紙の中で、P′ が直線 l の正の側にある解を選ぶ
      if (X.x > 0 && X.x < 1 && Pp.x * l.u.x + Pp.y * l.u.y > 0) best = { crease: cr, Qp: X, Pp, Mp: refl(M, cr) };
    }
    pt = t; pf = v;
  }
  return best;
}

function draw() {
  background(34, 32, 40);
  if (auto) { autoT++; if (autoT % 120 === 0) stepNo = (stepNo + 1) % STEPS.length; }
  let target = (stepNo === 3) ? PI : 0;
  if (stepNo === 4) target = (frameCount % 160 < 80) ? PI : 0;   // 折って、広げて
  phi += (target - phi) * 0.08;
  let sol = solveFold();

  // 紙
  noStroke(); fill(246, 240, 226); rect(px0, py0, PS, PS);
  // 平行線
  strokeWeight(2);
  if (stepNo >= 1) { stroke(120, 120, 120); dashed(0, 2 * a, 1, 2 * a); label('L2', 1.01, 2 * a); }
  if (stepNo >= 2) { stroke(120, 120, 120); dashed(0, a, 1, a); label('L1', 1.01, a); }
  // 角 θ の直線 l
  let r = radians(theta);
  let lx = cos(r), ly = sin(r), lt = min(1 / max(lx, 1e-6), 1 / max(ly, 1e-6));
  stroke(200, 70, 50); strokeWeight(3);
  line(sx(0), sy(0), sx(lx * lt), sy(ly * lt));
  label('l', lx * lt * 0.9 + 0.02, ly * lt * 0.9);
  noFill(); stroke(200, 70, 50, 120); strokeWeight(2);
  arc(sx(0), sy(0), PS * 0.5, PS * 0.5, -r, 0);

  if (sol && stepNo >= 3) {
    // 折り線
    let seg = clipSquare(sol.crease);
    if (seg) { stroke(255, 190, 40); strokeWeight(3); line(sx(seg[0].x), sy(seg[0].y), sx(seg[1].x), sy(seg[1].y)); }
    // 折り返される部分（Q の側）をアニメーション：折り線からの距離 s が s·cos φ になる
    let sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    let side = sdist({ x: 0, y: 0 }, sol.crease) > 0 ? 1 : -1;
    let flap = clipHalf(sq, sol.crease, side);
    if (phi > 0.02) {
      let k = 1 - cos(phi);
      fill(phi > HALF_PI ? color(226, 84, 72, 220) : color(255, 250, 235, 230));
      stroke(80, 40, 40); strokeWeight(1);
      beginShape();
      for (let p of flap) { let s = sdist(p, sol.crease); vertex(sx(p.x + sol.crease.u.y * s * k), sy(p.y - sol.crease.u.x * s * k)); }
      endShape(CLOSE);
    }
    // 印：Q′・M′・P′
    noStroke();
    fill(40); circle(sx(sol.Qp.x), sy(sol.Qp.y), 10); circle(sx(sol.Mp.x), sy(sol.Mp.y), 10); circle(sx(sol.Pp.x), sy(sol.Pp.y), 10);
    fill(20); textSize(15);
    text('Q′', sx(sol.Qp.x) + 8, sy(sol.Qp.y) - 8); text('M′', sx(sol.Mp.x) + 8, sy(sol.Mp.y) - 8); text('P′', sx(sol.Pp.x) + 8, sy(sol.Pp.y) - 8);
  }
  // 左の辺の点
  noStroke(); fill(40);
  circle(sx(0), sy(0), 10);
  if (stepNo >= 2) { circle(sx(0), sy(a), 10); circle(sx(0), sy(2 * a), 10); }
  fill(230); textSize(16); text('Q', sx(0) - 24, sy(0) + 5);
  if (stepNo >= 2) { text('M', sx(0) - 26, sy(a) + 5); text('P', sx(0) - 24, sy(2 * a) + 5); }

  // 三等分線
  if (sol && stepNo >= 5) {
    strokeWeight(3);
    let k1 = 1 / max(sol.Qp.x, sol.Qp.y), k2 = 1 / max(sol.Mp.x, sol.Mp.y);   // 紙の端まで伸ばす
    stroke(40, 160, 110); line(sx(0), sy(0), sx(sol.Qp.x * k1), sy(sol.Qp.y * k1));
    stroke(60, 110, 220); line(sx(0), sy(0), sx(sol.Mp.x * k2), sy(sol.Mp.y * k2));
  }

  // 説明
  let tx = px0 + PS + 60;
  noStroke(); fill(255); textSize(18);
  text('→／スペース：次へ　←：戻る　↑↓：角 θ = ' + nf(theta, 1, 0) + '°　A：自動 ' + (auto ? 'ON' : 'off'), 20, 40);
  fill(170); textSize(15);
  text('定規とコンパスは 2 次方程式まで（円と直線の交点）。折り紙の O6 は 3 次方程式を解けるので、角の三等分ができる', 20, 68);
  fill(255, 190, 40); textSize(30); text('手順 ' + stepNo + ' / ' + (STEPS.length - 1), tx, py0 + 30);
  fill(255); textSize(19); text(STEPS[stepNo], tx, py0 + 60, width - tx - 30, 120);
  textSize(16);
  let y = py0 + 200;
  for (let i = 0; i < STEPS.length; i++) { fill(i === stepNo ? 255 : 120); text(i + '. ' + STEPS[i], tx, y, width - tx - 30, 50); y += 46; }
  if (!sol) { fill(255, 120, 100); text('この角度では紙の中で折れない → a を小さくしよう', tx, y + 10); }
  else if (stepNo >= 5) {
    let a1 = degrees(atan2(sol.Qp.y, sol.Qp.x)), a2 = degrees(atan2(sol.Mp.y, sol.Mp.x));
    fill(40, 200, 140); textSize(20); text('∠(下の辺, QQ′) = ' + nf(a1, 1, 3) + '°', tx, y + 20);
    fill(110, 160, 255); text('∠(下の辺, QM′) = ' + nf(a2, 1, 3) + '°', tx, y + 50);
    fill(255); text('θ / 3 = ' + nf(theta / 3, 1, 3) + '°　　2θ / 3 = ' + nf(2 * theta / 3, 1, 3) + '°', tx, y + 80);
  }
}

function keyPressed() {
  if (key === RIGHT_ARROW || key === ' ') stepNo = min(stepNo + 1, STEPS.length - 1);
  if (key === LEFT_ARROW) stepNo = max(stepNo - 1, 0);
  if (key === UP_ARROW) theta = min(theta + 2, 88);
  if (key === DOWN_ARROW) theta = max(theta - 2, 4);
  if (key === 'a' || key === 'A') { auto = !auto; autoT = 0; }
}

// ---------- やってみよう ----------
// 1. θ = 90° を 3 等分すると 30°。これは定規とコンパスでもできる。θ = 60° → 20° はなぜ定規とコンパスでは無理？
// 2. a を 0.1 や 0.4 に変えると、折れる角の範囲はどう変わる？
// 3. なぜ 3 等分になるのか：Q・M′・Q′ と、P′ の関係（合同な三角形が 3 つ）を図に描いて考えよう
// 4. この手順を本物の紙で折ってみよう。分度器で測ると何度ずれる？


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
function dashed(x1, y1, x2, y2) { drawingContext.setLineDash([8, 6]); line(sx(x1), sy(y1), sx(x2), sy(y2)); drawingContext.setLineDash([]); }
function label(s, u, v) { noStroke(); fill(90); textSize(15); text(s, sx(u) + 4, sy(v) + 5); }
