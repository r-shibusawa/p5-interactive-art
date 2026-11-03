// ============================================
// 01 一変数トロピカル多項式
// p(x) = ⊕ (a_i ⊗ x^{⊗i}) = min (a_i + i·x)：各項は直線 a_i + i x、p はその「下包絡線」（折れ線）
//   折れ点 = トロピカルな「根」。根 r の重複度 = そこで変わる傾きの差。根は全部で d 個（基本定理）
// 係数（●）を上下にドラッグ / ↑↓ = 次数 d / R = ランダム / 0 = 全部 0
// ============================================

let d = 3;                                   // ★ 次数（1 〜 6）
let coef = [0, -1, -1, 2, 4, 7, 11];         // ★ 係数 a_0 … a_6（高さ）
let X0 = -4, X1 = 4, Y0 = -8, Y1 = 8;        // 表示する範囲
let dragging = -1;
let px0, py0, pw, ph;                        // グラフの領域

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  px0 = 60; py0 = 100; pw = width * 0.62; ph = height - 160;
}
function sx(x) { return px0 + (x - X0) / (X1 - X0) * pw; }
function sy(y) { return py0 + ph - (y - Y0) / (Y1 - Y0) * ph; }
function mx(s) { return X0 + (s - px0) / pw * (X1 - X0); }
function my(s) { return Y0 + (py0 + ph - s) / ph * (Y1 - Y0); }
function hueOf(i) { return (i * 55 + 20) % 360; }
function handleX(i) { return -2.5 + (i + 0.5) * 5 / (d + 1); }          // 係数 i のつまみを置く x（−2.5 〜 2.5 に並べる）

// ★ 多項式の値（min 流儀）
function p(x) { let v = Infinity; for (let i = 0; i <= d; i++) v = Math.min(v, coef[i] + i * x); return v; }

// ★ 根と重複度：点 (i, a_i) の下側凸包の辺から求める（辺の傾き s → 根 −s、横の長さ → 重複度）
function roots() {
  let hull = [0];
  for (let i = 1; i <= d; i++) {
    while (hull.length >= 2) {
      let o = hull[hull.length - 2], q = hull[hull.length - 1];
      if ((coef[q] - coef[o]) * (i - o) >= (coef[i] - coef[o]) * (q - o)) hull.pop(); else break;
    }
    hull.push(i);
  }
  let rs = [];
  for (let k = 0; k + 1 < hull.length; k++) {
    let i0 = hull[k], i1 = hull[k + 1];
    rs.push({ r: -(coef[i1] - coef[i0]) / (i1 - i0), m: i1 - i0, i0, i1 });
  }
  return { hull, rs };
}

function draw() {
  background(190, 55, 10);
  let R = roots();

  // グラフ領域と軸
  noStroke(); fill(0, 0, 100, 6); rect(px0, py0, pw, ph);
  stroke(0, 0, 100, 25); strokeWeight(1);
  line(sx(0), py0, sx(0), py0 + ph); line(px0, sy(0), px0 + pw, sy(0));
  noStroke(); fill(0, 0, 60); textSize(12);
  for (let x = X0; x <= X1; x++) text(x, sx(x) - 4, py0 + ph + 16);
  for (let y = Y0; y <= Y1; y += 2) text(y, px0 - 26, sy(y) + 4);

  // 各項の直線 a_i + i x
  for (let i = 0; i <= d; i++) {
    stroke(hueOf(i), 60, 90, 45); strokeWeight(1.5);
    // グラフの枠の中だけ描く（y が Y0〜Y1 に入る x の範囲）
    let xa = X0, xb = X1;
    if (i > 0) { xa = Math.max(X0, (Y0 - coef[i]) / i); xb = Math.min(X1, (Y1 - coef[i]) / i); }
    if (xa < xb && coef[i] >= Y0 && coef[i] <= Y1 || i > 0 && xa < xb) line(sx(xa), sy(coef[i] + i * xa), sx(xb), sy(coef[i] + i * xb));
  }
  // 下包絡線 p(x)（太く）
  stroke(0, 0, 100); strokeWeight(4); noFill();
  beginShape();
  for (let s = px0; s <= px0 + pw; s += 3) { let y = p(mx(s)); vertex(s, constrain(sy(y), py0 - 2, py0 + ph + 2)); }
  endShape();
  // 根（折れ点）
  for (let q of R.rs) {
    let X = sx(q.r), Y = sy(p(q.r));
    noStroke(); fill(0, 85, 100);
    circle(X, Y, 10 + q.m * 6);
    fill(0, 0, 100); textSize(14);
    text('r = ' + nf(q.r, 1, 2) + (q.m > 1 ? '  ×' + q.m : ''), X + 12, Y - 10);
  }
  // 係数のつまみ
  for (let i = 0; i <= d; i++) {
    let hx = handleX(i), X = sx(hx), Y = constrain(sy(coef[i] + i * hx), py0 + 8, py0 + ph - 8);
    stroke(0, 0, 10); strokeWeight(2); fill(hueOf(i), 70, 100);
    circle(X, Y, dragging === i ? 22 : 16);
    noStroke(); fill(hueOf(i), 50, 100); textSize(13);
    text('a' + i + ' = ' + nf(coef[i], 1, 1), X + 12, Y + 5);
  }

  // ---- 右：式と「ニュートン多角形」（1 次元版）----
  let rx = px0 + pw + 40, ry = 110;
  noStroke(); fill(0, 0, 100); textSize(18);
  text('p(x) = min(' + [...Array(d + 1).keys()].map((i) => nf(coef[i], 1, 1) + (i ? ' + ' + i + 'x' : '')).join(',  ') + ')', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('●を上下にドラッグ　↑↓：次数 d = ' + d + '　R：ランダム　0：全部 0　　白い折れ線 = p(x)，赤丸 = 根（折れ点）', 20, 66);

  fill(0, 0, 100); textSize(16);
  text('根と重複度（合計 = 次数 ' + d + '）', rx, ry);
  textSize(15); fill(0, 80, 100);
  let total = 0;
  R.rs.forEach((q, k) => { total += q.m; text('r' + (k + 1) + ' = ' + nf(q.r, 1, 2) + '　重複度 ' + q.m + '　（項 ' + q.i0 + ' と項 ' + q.i1 + ' が入れ替わる）', rx, ry + 26 + k * 22); });
  fill(0, 0, 100);
  let fy = ry + 26 + R.rs.length * 22 + 16;
  text('因数分解（基本定理）：', rx, fy);
  fill(90, 60, 95);
  text('p(x) = ' + nf(coef[d], 1, 1) + ' ⊗ ' + R.rs.map((q) => '(x ⊕ ' + nf(q.r, 1, 2) + ')' + (q.m > 1 ? '^{⊗' + q.m + '}' : '')).join(' ⊗ '), rx, fy + 24);
  fill(0, 0, 60); textSize(13);
  text('= ' + nf(coef[d], 1, 1) + ' + Σ m_k · min(x, r_k)。重複度の合計 = ' + total + '。すべての根が実数（折れ点）になる', rx, fy + 46);

  // 1 次元ニュートン多角形：点 (i, a_i) と下側凸包
  let nx = rx, ny = fy + 90, nw = width - rx - 40, nh = height - ny - 40;
  fill(0, 0, 100, 6); rect(nx, ny, nw, nh);
  fill(0, 0, 100); textSize(15); text('双対：点 (i, a_i) の下側凸包 ─ 辺の傾き −s が根，横の長さが重複度', nx, ny - 8);
  let lo = Math.min(...coef.slice(0, d + 1)) - 1, hi = Math.max(...coef.slice(0, d + 1)) + 1;
  let gx = (i) => nx + 30 + i * (nw - 60) / Math.max(d, 1), gy = (v) => ny + nh - 20 - (v - lo) / (hi - lo) * (nh - 40);
  stroke(0, 85, 100); strokeWeight(3); noFill();
  beginShape(); for (let i of R.hull) vertex(gx(i), gy(coef[i])); endShape();
  for (let i = 0; i <= d; i++) { noStroke(); fill(hueOf(i), 70, 100); circle(gx(i), gy(coef[i]), 12); fill(0, 0, 80); textSize(12); text('(' + i + ', ' + nf(coef[i], 1, 1) + ')', gx(i) - 20, gy(coef[i]) - 12); }
}

function mousePressed() {
  dragging = -1;
  for (let i = 0; i <= d; i++) {
    let hx = handleX(i);
    if (dist(mouseX, mouseY, sx(hx), constrain(sy(coef[i] + i * hx), py0 + 8, py0 + ph - 8)) < 16) dragging = i;
  }
}
function mouseDragged() {
  if (dragging < 0) return;
  coef[dragging] = constrain(my(mouseY) - dragging * handleX(dragging), -12, 12);
}
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === UP_ARROW) d = Math.min(6, d + 1);
  if (key === DOWN_ARROW) d = Math.max(1, d - 1);
  if (key === 'r' || key === 'R') for (let i = 0; i <= 6; i++) coef[i] = Math.round(random(-4, 4) * 2) / 2 + i * 0.5;
  if (key === '0') for (let i = 0; i <= 6; i++) coef[i] = 0;
}

// ---------- やってみよう ----------
// 1. 係数を全部 0 にすると根は 1 つ（x = 0）で重複度 d。なぜ？（下側凸包が 1 本の線分になる）
// 2. a_1 をうんと上げると、項 1 は包絡線から消える。そのとき根はどうなる？ 重複度は？
// 3. 根がちょうど 1, 2, 3 になるように係数を決めてみよう（ヒント：因数分解の式から逆算）
// 4. min を max に変えると（上包絡線）、根は点 (i, a_i) の「上側」凸包から出る。コードを書き換えて確かめよう
