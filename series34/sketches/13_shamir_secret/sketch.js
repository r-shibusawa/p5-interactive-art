// ============================================
// 13 秘密分散（シャミアの方法）
// 秘密 S を「k−1 次の多項式 f(x) の x = 0 の値」に隠し、f(1), f(2), …, f(n) を n 人に 1 つずつ配る（シェア）。
//   k 人集まれば点 k 個から多項式が 1 つに決まる（ラグランジュ補間）→ f(0) = S が分かる
//   k−1 人以下だと、どんな S を通る曲線も引けてしまう → 秘密について何も分からない
// シェア（点）をクリック = 選ぶ・外す / ↑↓ = しきい値 k / ←→ = 配る人数 n / スペース = 新しい秘密 / A = 全部選ぶ / C = 全部外す
// ※ 教育用：見やすさのため実数で描いている。実際は mod p（有限体）で計算して、点から何も漏れないようにする
// ============================================

let kNeed = 3;          // ★ しきい値：何人集まれば復元できるか
let nShares = 6;        // ★ 配る人数
let secret = 0, coef = [], picked = [];
let ghosts = [];        // k 人未満のときに引ける「ありえる曲線」

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
  newSecret();
}

function newSecret() {
  secret = floor(random(20, 80));                          // ★ 秘密の数
  coef = [secret];
  for (let i = 1; i < kNeed; i++) coef.push(random(-1, 1) * 40 / pow(nShares, i - 1));  // 高次ほど小さく（画面に収めるため）
  picked = new Array(nShares).fill(false);
  picked[0] = true;
  makeGhosts();
}

function f(x) { let y = 0; for (let i = coef.length - 1; i >= 0; i--) y = y * x + coef[i]; return y; }

// ---- 画面の座標
let R0 = {};
function sx(x) { return R0.x + (x + 0.5) / (nShares + 1) * R0.w; }
function sy(y) { return R0.y + R0.h / 2 - y * R0.h / 2 / R0.ymax; }

function draw() {
  background(14, 18, 24);
  R0 = { x: 40, y: 90, w: width * 0.64, h: height - 150, ymax: 130 };
  for (let i = 0; i <= 60; i++) R0.ymax = max(R0.ymax, abs(f(i / 60 * (nShares + 0.5))) * 1.15);
  noStroke();
  fill(240);
  textSize(18);
  text('シャミアの秘密分散　点をクリックで選ぶ　↑↓ k = ' + kNeed + '　←→ n = ' + nShares + '　スペース 新しい秘密　A 全部　C 外す', 24, 34);
  fill(150);
  textSize(14);
  text(nShares + ' 人に配って、' + kNeed + ' 人集まれば復元できる「(' + kNeed + ', ' + nShares + ') しきい値法」　｜ 教育用（実数で描画）', 24, 56);

  // 軸
  stroke(60, 70, 90);
  strokeWeight(1);
  line(R0.x, sy(0), R0.x + R0.w, sy(0));
  line(sx(0), R0.y, sx(0), R0.y + R0.h);
  noStroke();
  fill(140);
  textSize(13);
  for (let i = 1; i <= nShares; i++) text('x=' + i, sx(i) - 12, sy(0) + 18);

  let sel = [];
  for (let i = 0; i < nShares; i++) if (picked[i]) sel.push(i + 1);

  // k 人未満：ありえる曲線をたくさん描く
  if (sel.length < kNeed) {
    for (let g of ghosts) drawCurve(x => lagrange(g, x), color(255, 200, 90, 60), 1.5);
    for (let g of ghosts) { fill(255, 200, 90, 120); circle(sx(0), sy(g[0][1]), 8); }
  }
  // 本当の多項式（薄く）
  drawCurve(f, color(255, 255, 255, 40), 1);
  // k 人以上：選んだ点から補間した曲線
  let recovered = null;
  if (sel.length >= kNeed) {
    let pts = sel.slice(0, kNeed).map(x => [x, f(x)]);
    drawCurve(x => lagrange(pts, x), color(120, 230, 150), 3);
    recovered = lagrange(pts, 0);
  }
  // 秘密の位置
  fill(255, 120, 200);
  circle(sx(0), sy(secret), recovered !== null ? 22 : 10);
  // シェア
  for (let i = 1; i <= nShares; i++) {
    fill(picked[i - 1] ? color(130, 200, 255) : color(90, 100, 120));
    circle(sx(i), sy(f(i)), picked[i - 1] ? 22 : 16);
    fill(220);
    textSize(12);
    text('人' + i, sx(i) + 14, sy(f(i)) - 10);
  }

  // ---- 右のパネル
  let px = width * 0.68 + 20, py = 110;
  fill(240);
  textSize(17);
  text('配ったシェア', px, py);
  textSize(15);
  for (let i = 1; i <= nShares; i++) {
    fill(picked[i - 1] ? color(130, 200, 255) : 140);
    text((picked[i - 1] ? '● ' : '○ ') + '人' + i + '：(' + i + ', ' + nf(f(i), 1, 2) + ')', px, py + 10 + i * 24);
  }
  let y2 = py + 40 + nShares * 24;
  fill(240);
  textSize(17);
  text('集まった人数 ' + sel.length + ' / 必要 ' + kNeed, px, y2);
  if (recovered !== null) {
    let pts = sel.slice(0, kNeed);
    fill(170);
    textSize(14);
    text('ラグランジュ補間：S = Σ yᵢ·Lᵢ(0)', px, y2 + 30);
    for (let j = 0; j < pts.length; j++) {
      let w = 1;
      for (let m = 0; m < pts.length; m++) if (m !== j) w *= (0 - pts[m]) / (pts[j] - pts[m]);
      text('  L' + pts[j] + '(0) = ' + nf(w, 1, 3), px, y2 + 54 + j * 20);
    }
    fill(120, 230, 150);
    textSize(20);
    text('復元した秘密 = ' + nf(recovered, 1, 2), px, y2 + 70 + pts.length * 20);
    fill(255, 120, 200);
    text('本当の秘密　 = ' + secret, px, y2 + 98 + pts.length * 20);
  } else {
    fill(255, 200, 90);
    textSize(15);
    text('あと ' + (kNeed - sel.length) + ' 人足りない。\n黄色の曲線はどれも今の点を通る。\nx = 0 の値（秘密の候補）は\nどれでもありえる → 何も分からない', px, y2 + 34);
  }
}

function drawCurve(fn, col, w) {
  stroke(col);
  strokeWeight(w);
  let prev = null;
  for (let i = 0; i <= 120; i++) {
    let x = -0.4 + i / 120 * (nShares + 0.8), y = fn(x);
    let s = [sx(x), sy(y)];
    let inside = s[1] > R0.y && s[1] < R0.y + R0.h;
    if (prev && inside && prev.inside) line(prev.s[0], prev.s[1], s[0], s[1]);
    prev = { s, inside };
  }
  noStroke();
}

// k 人未満のとき：選んだ点 + ランダムな秘密 (0, s) + 足りない分のランダムな点 で曲線をつくる
function makeGhosts() {
  ghosts = [];
  let sel = [];
  for (let i = 0; i < nShares; i++) if (picked[i]) sel.push(i + 1);
  if (sel.length >= kNeed) return;
  for (let gi = 0; gi < 14; gi++) {
    let pts = sel.map(x => [x, f(x)]);
    pts.unshift([0, secret + (gi - 6.5) * 9]);                 // 秘密の候補
    let extra = 0;
    while (pts.length < kNeed) { let x = extra + 0.5; pts.push([x, f(x) + random(-15, 15)]); extra++; }
    ghosts.push(pts);
  }
}

function mousePressed() {
  for (let i = 1; i <= nShares; i++) {
    if (Math.hypot(mouseX - sx(i), mouseY - sy(f(i))) < 18) { picked[i - 1] = !picked[i - 1]; makeGhosts(); return; }
  }
}

function keyPressed() {
  if (key === UP_ARROW) { kNeed = min(nShares, kNeed + 1); newSecret(); }
  if (key === DOWN_ARROW) { kNeed = max(2, kNeed - 1); newSecret(); }
  if (key === RIGHT_ARROW) { nShares = min(8, nShares + 1); newSecret(); }
  if (key === LEFT_ARROW) { nShares = max(kNeed, nShares - 1); newSecret(); }
  if (key === ' ') newSecret();
  if (key === 'a' || key === 'A') { picked.fill(true); makeGhosts(); }
  if (key === 'c' || key === 'C') { picked.fill(false); makeGhosts(); }
  return false;
}

// ---------- やってみよう ----------
// 1. k = 2 なら直線。1 人の点を通る直線は無数にあるので秘密は分からない。2 人なら 1 本に決まる
// 2. k = 3, n = 6 で、どの 3 人を選んでも同じ秘密が出るのを確かめよう
// 3. 会社の金庫の暗証番号を「役員 5 人のうち 3 人」で開けられるようにするには k, n をいくつにする？
// 4. 1 人がうそのシェアを出したら復元した秘密はどうなる？（4 人目のシェアで確かめる方法を考えよう）

// ==================================================
// ここから下は「道具」（ラグランジュ補間）
// ==================================================
// 点 pts = [[x, y], …] を全部通る多項式の、x での値
function lagrange(pts, x) {
  let sum = 0;
  for (let j = 0; j < pts.length; j++) {
    let w = 1;
    for (let m = 0; m < pts.length; m++) if (m !== j) w *= (x - pts[m][0]) / (pts[j][0] - pts[m][0]);
    sum += pts[j][1] * w;
  }
  return sum;
}
