// ============================================
// 11 ページランクとペロン＝フロベニウス
// ページランク x* は「グーグル行列 G をかけても変わらないベクトル」= G の不動点（固有値 1 の固有ベクトル）
//   G = α·P + (1 − α)/n（P：リンクをたどる、残り：ランダムにジャンプ）。G は 1-ノルムで α 倍に縮める → 02 のバナッハの定理
//   どんな初期値からでも G をかけ続ける（べき乗法）と x* に着き、誤差は毎回 α 倍以下
// クリック → 別のページをクリック = リンクをつける・外す / ←→ = α（たどる割合）/ スペース = 止める・動かす / N = 1 回 / U = 1 ページに集めて再出発 / R = ランダムなリンク
// ============================================

let n = 8;                // ★ ページの数
let damping = 0.85;         // ★ リンクをたどる確率（グーグルの元の論文は 0.85）
let L = [];               // L[i][j] = 1：i → j のリンク
let Gm = [];              // グーグル行列（列ごとに和 1）
let x = [], xs = [], hist = [];
let running = true;
let sel = -1;
let pos = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  let R = min(width * 0.18, height * 0.3), cx = 60 + R + 30, cy = 130 + R;
  for (let i = 0; i < n; i++) { let a = -HALF_PI + i / n * TWO_PI; pos.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }); }
  randomLinks();
}
function randomLinks() {
  L = [];
  for (let i = 0; i < n; i++) { L.push(new Array(n).fill(0)); let k = 1 + floor(random(3)); for (let t = 0; t < k; t++) { let j = floor(random(n)); if (j !== i) L[i][j] = 1; } }
  rebuild(true);
}
// ★ グーグル行列：リンク先へ等分（行き先のないページは全ページへ等分）＋ ランダムジャンプ
function rebuild(uniformStart) {
  Gm = [];
  for (let j = 0; j < n; j++) Gm.push(new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let out = L[i].reduce((a, b) => a + b, 0);
    for (let j = 0; j < n; j++) {
      let pji = out === 0 ? 1 / n : L[i][j] / out;
      Gm[j][i] = damping * pji + (1 - damping) / n;
    }
  }
  // 不動点 x*：十分たくさんかけて求めておく
  xs = new Array(n).fill(1 / n);
  for (let k = 0; k < 3000; k++) xs = mul(xs);
  if (uniformStart) x = new Array(n).fill(1 / n);
  hist = [err(x)];
}
function mul(v) { let r = new Array(n).fill(0); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) r[j] += Gm[j][i] * v[i]; return r; }
function err(v) { let s = 0; for (let i = 0; i < n; i++) s += abs(v[i] - xs[i]); return s; }
function stepOnce() { x = mul(x); hist.push(err(x)); if (hist.length > 60) hist.shift(); }

function draw() {
  background(230, 30, 11);
  if (running && frameCount % 15 === 0) stepOnce();
  // リンク（矢印）
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (L[i][j]) {
    let a = pos[i], b = pos[j], ang = Math.atan2(b.y - a.y, b.x - a.x);
    let rb = 14 + 120 * Math.sqrt(x[j]);
    let ex = b.x - Math.cos(ang) * rb / 2, ey = b.y - Math.sin(ang) * rb / 2;
    stroke(0, 0, 70, 60); strokeWeight(1.5); line(a.x, a.y, ex, ey);
    noStroke(); fill(0, 0, 70, 80);
    push(); translate(ex, ey); rotate(ang); triangle(0, 0, -12, -5, -12, 5); pop();
  }
  // ページ：大きさ = 今の x、輪 = 不動点 x*
  for (let i = 0; i < n; i++) {
    let d = 14 + 120 * Math.sqrt(x[i]), ds = 14 + 120 * Math.sqrt(xs[i]);
    noStroke(); fill(200 + i * 18, 60, 95, 85); circle(pos[i].x, pos[i].y, d);
    noFill(); stroke(45, 90, 100); strokeWeight(2); circle(pos[i].x, pos[i].y, ds);
    if (i === sel) { stroke(0, 0, 100); strokeWeight(3); circle(pos[i].x, pos[i].y, d + 10); }
    noStroke(); fill(0, 0, 0); textSize(16); textAlign(CENTER, CENTER); text(String.fromCharCode(65 + i), pos[i].x, pos[i].y); textAlign(LEFT, BASELINE);
  }

  // 右上：グーグル行列のヒートマップ
  let hx = width * 0.47, hy = 120, cs = min(30, (width * 0.22) / n);
  noStroke(); fill(0, 0, 70); textSize(14); text('グーグル行列 G', hx, hy - 12); textSize(12); text('列 = 元のページ、行 = 行き先', hx, hy + n * cs + 16); textSize(14);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    fill(45, 80, 15 + 85 * min(1, Gm[j][i] * 1.6)); rect(hx + i * cs, hy + j * cs, cs - 1, cs - 1);
  }
  // 棒グラフ：x_k と x*
  let bx = hx + n * cs + 60, bw = min(26, (width - bx - 30) / n - 6), bh = n * cs;
  fill(0, 0, 70); text('x_k（棒）と x*（黄色の線）', bx, hy - 12);
  for (let i = 0; i < n; i++) {
    let X = bx + i * (bw + 6);
    fill(200 + i * 18, 60, 95); rect(X, hy + bh - x[i] * bh * 2.5, bw, x[i] * bh * 2.5);
    stroke(45, 90, 100); strokeWeight(2); line(X - 2, hy + bh - xs[i] * bh * 2.5, X + bw + 2, hy + bh - xs[i] * bh * 2.5); noStroke();
    fill(0, 0, 80); text(String.fromCharCode(65 + i), X + bw / 2 - 5, hy + bh + 18);
  }
  // 下：誤差の対数グラフ
  let ex0 = hx, ey0 = hy + bh + 60, ew = width - hx - 40, eh = height - ey0 - 110;
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(ex0, ey0, ew, eh);
  let gy = (e) => map(constrain(Math.log10(max(e, 1e-16)), -16, 1), 1, -16, ey0, ey0 + eh);
  stroke(190, 70, 100); drawingContext.setLineDash([6, 6]); noFill(); beginShape();
  for (let k = 0; k < 60; k++) vertex(ex0 + k / 59 * ew, gy(hist[0] * Math.pow(damping, k)));
  endShape(); drawingContext.setLineDash([]);
  noStroke(); fill(320, 70, 100);
  for (let k = 0; k < hist.length; k++) circle(ex0 + k / 59 * ew, gy(hist[k]), 6);
  fill(0, 0, 70); textSize(14);
  text('誤差 ‖x_k − x*‖₁（縦は対数）　点線 = αᵏ × 最初の誤差（バナッハの評価）', ex0, ey0 - 10);
  for (let e = 0; e >= -15; e -= 5) text('1e' + e, ex0 - 38, gy(Math.pow(10, e)) + 4);

  // 順位
  let order = [...Array(n).keys()].sort((a, b) => xs[b] - xs[a]);
  fill(0, 0, 100); textSize(16);
  text('ページランクの順位：' + order.map((i) => String.fromCharCode(65 + i) + '(' + nf(xs[i], 1, 3) + ')').join('  '), 20, height - 50);
  fill(0, 0, 60); textSize(14);
  text('G の成分はすべて正 → ペロン＝フロベニウスの定理：固有値 1 の固有ベクトルは 1 つで成分は全部正。2 番目の固有値の大きさ |λ₂| ≤ α が収束の速さを決める', 20, height - 22);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('α = ' + nf(damping, 1, 2) + '（←→）　スペース：' + (running ? '止める' : '動かす') + '　N：1 回　U：1 ページに集めて再出発　R：ランダム　クリック → クリック：リンク', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('x_{k+1} = G·x_k（べき乗法）。G は不動点反復の写像そのもの。α が 1 に近いほどリンク構造に忠実だが、収束は遅い（誤差の傾き = log₁₀ α）', 20, 68);
}

function mousePressed() {
  let hit = -1;
  for (let i = 0; i < n; i++) if (dist(mouseX, mouseY, pos[i].x, pos[i].y) < 30) hit = i;
  if (hit < 0) { sel = -1; return; }
  if (sel < 0) sel = hit;
  else { if (hit !== sel) { L[sel][hit] = 1 - L[sel][hit]; rebuild(false); } sel = -1; }
}
function keyPressed() {
  if (key === LEFT_ARROW) { damping = max(0, round((damping - 0.05) * 100) / 100); rebuild(false); }
  if (key === RIGHT_ARROW) { damping = min(0.99, round((damping + 0.05) * 100) / 100); rebuild(false); }
  if (key === ' ') running = !running;
  if (key === 'n' || key === 'N') stepOnce();
  if (key === 'u' || key === 'U') { x = new Array(n).fill(0); x[floor(random(n))] = 1; hist = [err(x)]; }
  if (key === 'r' || key === 'R') randomLinks();
}

// ---------- やってみよう ----------
// 1. α = 0.5 と 0.95 で誤差のグラフの傾きを比べよう。15 桁合わせるのに何回ずつかかる？
// 2. α = 0 にすると x* はどうなる？ α = 0.99 では？（どちらも G の不動点）
// 3. どこからもリンクされないページを作ると、そのページのランクはいくつになる？ 式 (1 − α)/n と比べよう
// 4. U で 1 ページに全部集めてから始めても、同じ x* に着くことを確かめよう（バナッハの定理の「どこからでも」）
