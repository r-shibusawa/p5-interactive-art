// ============================================
// 11 ファジィ c-平均法（FCM）
// 点を c 個のグループに分ける。k-平均法は「どれか 1 つ」に入れるが、FCM は「A に 0.7、B に 0.3」のように所属度で分ける
//   u_ik = 1 ÷ Σ_j (d_ik / d_jk)^(2/(m−1))、中心 v_i = Σ u_ik^m x_k ÷ Σ u_ik^m、目的関数 J = Σ u_ik^m d_ik²（くり返すたびに減る）
// クリック = 点を追加 / スペース = 1 回更新 / A = 自動 / ←→ = グループ数 c / ↑↓ = ファジィ化係数 m / K = k-平均法と切りかえ / N = 初期化 / R = 新しいデータ
// ============================================

let nC = 3;          // ★ グループの数 c
let mF = 2.0;        // ★ ファジィ化係数 m（1 に近いほど k-平均法に近い、大きいほどぼやける）
let useKmeans = false, auto = true;
let P = [], U = [], V = [], Jhist = [], converged = false, timer = 0, seed = 7;
let CC;              // グループの色（RGB）
let bg, area;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  CC = [[255, 170, 130], [70, 200, 190], [180, 160, 255], [250, 230, 120], [240, 120, 170], [140, 220, 120]];
  bg = createImage(64, 40);
  selfTest();
  newData();
}

function newData() {
  P = []; let r = lcg(seed++);
  let cs = [[0.25, 0.3], [0.7, 0.35], [0.5, 0.75]];
  for (let [cx, cy] of cs) for (let k = 0; k < 18; k++) P.push([cx + (r() - 0.5) * 0.28, cy + (r() - 0.5) * 0.28]);
  initU();
}
// 所属度をでたらめに決めて（列の和 = 1）、そこから始める
function initU() {
  let r = lcg(seed++);
  U = []; for (let i = 0; i < nC; i++) U.push(P.map(() => 0.1 + r()));
  for (let k = 0; k < P.length; k++) { let s = 0; for (let i = 0; i < nC; i++) s += U[i][k]; for (let i = 0; i < nC; i++) U[i][k] /= s; }
  V = useKmeans ? Array.from({ length: nC }, (_, i) => P[Math.floor(r() * P.length)].slice()) : fcmV(P, U, mF);
  Jhist = []; converged = false;
  iterate();
}
// 1 回分：中心 → 所属度 → J
function iterate() {
  if (P.length < nC) return;
  if (useKmeans) { U = hardU(P, V); V = fcmV(P, U, 1); U = hardU(P, V); }
  else { V = fcmV(P, U, mF); U = fcmU(P, V, mF); }
  let J = fcmJ(P, U, V, useKmeans ? 1 : mF);
  if (Jhist.length && Jhist[Jhist.length - 1] - J < 1e-7) converged = true;
  Jhist.push(J); if (Jhist.length > 60) Jhist.shift();
  makeBg();
}
// 背景：その場所に点を置いたら、どのグループにどれだけ所属するか
function makeBg() {
  bg.loadPixels();
  for (let y = 0; y < bg.height; y++) for (let x = 0; x < bg.width; x++) {
    let q = [[(x + 0.5) / bg.width, (y + 0.5) / bg.height]];
    let u = useKmeans ? hardU(q, V) : fcmU(q, V, mF), c = mixCol(u, 0), o = 4 * (y * bg.width + x);
    bg.pixels[o] = c[0] * 0.35; bg.pixels[o + 1] = c[1] * 0.35; bg.pixels[o + 2] = c[2] * 0.4; bg.pixels[o + 3] = 255;
  }
  bg.updatePixels();
}
function mixCol(u, k) { let c = [0, 0, 0]; for (let i = 0; i < u.length; i++) for (let d = 0; d < 3; d++) c[d] += u[i][k] * CC[i % CC.length][d]; return c; }

function draw() {
  background(250, 18, 14);
  area = { x: 20, y: 90, w: width * 0.58, h: height - 140 };
  if (auto && !converged && ++timer % 12 === 0) iterate();
  let X = (p) => area.x + p[0] * area.w, Y = (p) => area.y + p[1] * area.h;
  image(bg, area.x, area.y, area.w, area.h);
  noFill(); stroke(0, 0, 100, 25); rect(area.x, area.y, area.w, area.h);
  // 点：色 = 所属度でグループの色を混ぜたもの
  let hover = -1, best = 1e9;
  P.forEach((p, k) => { let d = Math.hypot(mouseX - X(p), mouseY - Y(p)); if (d < 14 && d < best) { best = d; hover = k; } });
  colorMode(RGB, 255);
  P.forEach((p, k) => { let c = mixCol(U, k); fill(c[0], c[1], c[2]); stroke(k === hover ? 255 : 30); strokeWeight(k === hover ? 2 : 1); circle(X(p), Y(p), 13); });
  colorMode(HSB, 360, 100, 100, 100);
  // 中心
  V.forEach((v, i) => {
    let c = CC[i % CC.length]; colorMode(RGB, 255); stroke(c[0], c[1], c[2]); colorMode(HSB, 360, 100, 100, 100);
    strokeWeight(4); line(X(v) - 12, Y(v), X(v) + 12, Y(v)); line(X(v), Y(v) - 12, X(v), Y(v) + 12);
    noStroke(); fill(0, 0, 100); textSize(14); text('v' + (i + 1), X(v) + 10, Y(v) - 10);
  });

  noStroke(); fill(0, 0, 95); textSize(18);
  text((useKmeans ? 'k-平均法（所属度は 0 か 1）' : 'ファジィ c-平均法  m = ' + mF.toFixed(2)) + '　c = ' + nC + '　点 ' + P.length + ' 個　｜ クリック 追加　スペース 1 回　A 自動 ' + (auto ? 'ON' : 'off') + '　←→ c　↑↓ m　K 切りかえ　N 初期化　R データ', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('点の色 = グループの色を所属度の割合で混ぜた色。背景 = そこに点を置いたときの所属度。境目の点ほど色が混ざる', 20, 62);

  // 右：J のグラフ
  let gx = width * 0.63, gw = width * 0.34, gy = 100, gh = height * 0.3;
  fill(0, 0, 100, 6); rect(gx, gy, gw, gh, 8);
  fill(0, 0, 95); textSize(16); text('目的関数 J = Σ u^m d²（更新ごと）', gx + 10, gy + 22);
  if (Jhist.length > 1) {
    let hi = Math.max(...Jhist), lo = Math.min(...Jhist), sp = Math.max(1e-9, hi - lo);
    noFill(); stroke(20, 45, 100); strokeWeight(2.5); beginShape();
    Jhist.forEach((J, i) => vertex(gx + 10 + (i / (Jhist.length - 1)) * (gw - 20), gy + gh - 12 - ((J - lo) / sp) * (gh - 50)));
    endShape();
    let inc = Jhist.some((J, i) => i > 0 && J > Jhist[i - 1] + 1e-9);
    noStroke(); fill(inc ? color(0, 70, 100) : color(160, 50, 90)); textSize(14);
    text('J = ' + Jhist[Jhist.length - 1].toFixed(5) + (inc ? '　増えた！' : '　一度も増えていない') + (converged ? '　（収束）' : ''), gx + 10, gy + 44);
  }
  // 中心の表
  let ty = gy + gh + 34; fill(0, 0, 95); textSize(16); text('中心 v_i（0〜1 の座標）', gx, ty);
  textSize(14); V.forEach((v, i) => { fill(0, 0, 80); text('v' + (i + 1) + ' = (' + v[0].toFixed(3) + ', ' + v[1].toFixed(3) + ')', gx + 10, ty + 24 + i * 20); });
  // マウスの点の所属度
  let my = ty + 40 + nC * 20;
  fill(0, 0, 95); textSize(16); text(hover >= 0 ? '点 ' + (hover + 1) + ' の所属度（和 = 1）' : '点にマウスを乗せると所属度を表示', gx, my);
  if (hover >= 0) {
    let s = 0;
    for (let i = 0; i < nC; i++) {
      let u = U[i][hover]; s += u; let c = CC[i % CC.length];
      colorMode(RGB, 255); fill(c[0], c[1], c[2]); colorMode(HSB, 360, 100, 100, 100);
      rect(gx + 40, my + 14 + i * 26, (gw - 140) * u, 18, 3);
      fill(0, 0, 90); textSize(14); text('u' + (i + 1), gx + 10, my + 28 + i * 26); text(u.toFixed(3), gx + gw - 90, my + 28 + i * 26);
    }
    fill(0, 0, 70); text('合計 ' + s.toFixed(6), gx + 10, my + 34 + nC * 26);
  }
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}

function mousePressed() {
  if (!area) return;
  let x = (mouseX - area.x) / area.w, y = (mouseY - area.y) / area.h;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  P.push([x, y]);
  for (let i = 0; i < nC; i++) U[i].push(1 / nC);
  converged = false; iterate();
}
function keyPressed() {
  if (key === ' ') { converged = false; iterate(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'k' || key === 'K') { useKmeans = !useKmeans; initU(); }
  if (key === 'n' || key === 'N') initU();
  if (key === 'r' || key === 'R') newData();
  if (key === RIGHT_ARROW) { nC = Math.min(6, nC + 1); initU(); }
  if (key === LEFT_ARROW) { nC = Math.max(2, nC - 1); initU(); }
  if (key === UP_ARROW) { mF = Math.min(4, mF + 0.25); initU(); }
  if (key === DOWN_ARROW) { mF = Math.max(1.25, mF - 0.25); initU(); }
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let D = [[0, 0], [0, 1], [1, 0], [10, 10], [10, 11], [11, 10]];
  let u0 = [[0.6, 0.3, 0.5, 0.4, 0.7, 0.2], [0.4, 0.7, 0.5, 0.6, 0.3, 0.8]];
  let u = u0, v, Js = [];
  for (let t = 0; t < 30; t++) { v = fcmV(D, u, 2); u = fcmU(D, v, 2); Js.push(fcmJ(D, u, v, 2)); }
  check('どの点も所属度の和 = 1', D.every((_, k) => near(u[0][k] + u[1][k], 1, 1e-12)));
  check('30 回くり返して J は一度も増えない', Js.every((J, i) => i === 0 || J <= Js[i - 1] + 1e-12));
  let vs = v.slice().sort((a, b) => a[0] - b[0]);
  check('2 つのかたまりの中心 ≈ (1/3, 1/3) と (31/3, 31/3)', near(vs[0][0], 1 / 3, 0.01) && near(vs[0][1], 1 / 3, 0.01) && near(vs[1][0], 31 / 3, 0.01) && near(vs[1][1], 31 / 3, 0.01));
  let e = fcmU([[1, 0]], [[0, 0], [2, 0]], 2);
  check('2 つの中心から等距離の点は 0.5 と 0.5', near(e[0][0], 0.5) && near(e[1][0], 0.5));
  let f = fcmU([[1, 0]], [[0, 0], [3, 0]], 2);
  check('距離 1 と 2 なら m = 2 で u = 1 ÷ (1 + (1/2)²) = 0.8', near(f[0][0], 0.8) && near(f[1][0], 0.2));
  let g = fcmU([[0, 0]], [[0, 0], [5, 5]], 2);
  check('中心と同じ位置の点は、そのグループに 1', g[0][0] === 1 && g[1][0] === 0);
  check('m = 1.1 ではほぼ 0 か 1（k-平均法に近い）', fcmU([[1, 0]], [[0, 0], [3, 0]], 1.1)[0][0] > 0.999);
  let kv = [[0, 0], [0, 1]], kJ = [];
  for (let t = 0; t < 10; t++) { let hu = hardU(D, kv); kv = fcmV(D, hu, 1); kJ.push(fcmJ(D, hardU(D, kv), kv, 1)); }
  check('k-平均法でも J は増えない', kJ.every((J, i) => i === 0 || J <= kJ[i - 1] + 1e-12));
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. ↑↓ で m を変える。m = 1.25 では色がはっきり、m = 4 ではどの点もぼんやり混ざる
// 2. K で k-平均法にする。境目の点が「どちらか 1 つ」に決められてしまうのを見比べよう
// 3. 2 つのかたまりのちょうど真ん中をクリックして点を足す。所属度はいくつ？
// 4. ←→ で c を 2 や 5 にする。本当は 3 つのかたまりなのに、c = 5 だとどう分かれる？
// 5. N で何度も初期化。J の最後の値はいつも同じ？（局所解に落ちることもある）


// ==================================================
// ここから下は「ファジィの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

// ---- ファジィ c-平均法の更新式（P：点 [x, y] の列、U[i][k]：点 k のグループ i への所属度、V：中心）
function d2(a, b) { return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]); }
// 所属度：u_ik = 1 ÷ Σ_j (d_ik / d_jk)^(2/(m−1))。中心にぴったり重なる点はそのグループに 1
function fcmU(P, V, m) {
  let U = V.map(() => new Array(P.length).fill(0)), e = 1 / (m - 1);
  P.forEach((p, k) => {
    let d = V.map((v) => d2(p, v)), z = d.findIndex((x) => x < 1e-18);
    if (z >= 0) { U[z][k] = 1; return; }
    for (let i = 0; i < V.length; i++) { let s = 0; for (let j = 0; j < V.length; j++) s += Math.pow(d[i] / d[j], e); U[i][k] = 1 / s; }
  });
  return U;
}
// 中心：v_i = Σ u^m x ÷ Σ u^m（だれも所属しないグループは今の点の平均に置く）
function fcmV(P, U, m) {
  return U.map((row) => {
    let sx = 0, sy = 0, sw = 0;
    P.forEach((p, k) => { let w = Math.pow(row[k], m); sx += w * p[0]; sy += w * p[1]; sw += w; });
    if (sw < 1e-12) { sw = P.length || 1; sx = P.reduce((a, p) => a + p[0], 0); sy = P.reduce((a, p) => a + p[1], 0); }
    return [sx / sw, sy / sw];
  });
}
function fcmJ(P, U, V, m) { let J = 0; U.forEach((row, i) => P.forEach((p, k) => { J += Math.pow(row[k], m) * d2(p, V[i]); })); return J; }
// k-平均法：いちばん近い中心に 1、ほかは 0
function hardU(P, V) {
  let U = V.map(() => new Array(P.length).fill(0));
  P.forEach((p, k) => { let b = 0; V.forEach((v, i) => { if (d2(p, v) < d2(p, V[b])) b = i; }); U[b][k] = 1; });
  return U;
}
// 決まった順番の乱数（毎回同じ点の並びを作れる）
function lcg(s) { let x = s * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
