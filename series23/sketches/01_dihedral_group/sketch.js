// ============================================
// 01 二面体群 Dₙ
// 正 n 角形の対称性は 2 つの操作 R（360°/n 回す）と F（たて軸で裏返す）の組み合わせで全部つくれる
//   2n 個の元を表にしたものがケイリー表。R·F と F·R は違う → 順番が大事（非可換）
// R = 回す / F = 裏返す / ↑↓ = n（3〜6）/ 表のマスをクリック = その掛け算を実行 / A = 表を全部うめる / 0 = リセット
// ============================================

let n = 3;               // ★ 角の数
let g = [0, 0];          // 今の元 [k, f] = rᵏ sᶠ（関数として「まず sᶠ、次に rᵏ」）
let word = [];           // 押したキーの列
let filled = {};         // うまった表のマス "i,j"
let anim = null;         // 見た目のアニメーション
let shown = [0, 0];      // アニメーション開始時の元
let hover = null;
let autoFill = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('sans-serif');
}

// 元の番号 ↔ [k, f]：0..n-1 が回転、n..2n-1 が鏡映
function el(i) { return [i % n, i < n ? 0 : 1]; }
function idx(e) { return e[0] + e[1] * n; }
// 「x をしてから y」= 関数の合成 y∘x。rᵃsᵇ · rᵏsᶠ = rᵃ⁺⁽±ᵏ⁾ sᵇ⁺ᶠ（s が r を逆向きにする）
function then(x, y) { return [(((y[0] + (y[1] ? -x[0] : x[0])) % n) + n) % n, (x[1] + y[1]) % 2]; }
function name(e) { return e[0] === 0 && !e[1] ? 'e' : (e[0] ? 'r' + (e[0] > 1 ? sup(e[0]) : '') : '') + (e[1] ? 's' : ''); }
function sup(k) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[k]; }
const R_ = [1, 0], F_ = [0, 1];

function draw() {
  background(244, 242, 250);
  if (autoFill && frameCount % 4 === 0) {
    let N = 2 * n, todo = [];
    for (let i = 0; i < N * N; i++) if (!filled[floor(i / N) + ',' + (i % N)]) todo.push(i);
    if (todo.length) filled[floor(todo[0] / N) + ',' + (todo[0] % N)] = true; else autoFill = false;
  }
  let cx = width * 0.22, cy = height * 0.48, R0 = min(width * 0.15, height * 0.25);
  drawPolygon(cx, cy, R0);

  // 文字
  noStroke();
  fill(30);
  textSize(18);
  text('R：回す　F：裏返す　↑↓：n = ' + n + '　表のマスをクリック：掛け算を実行　A：表をうめる　0：リセット', 20, 36);
  fill(110);
  textSize(15);
  text('表の「行 a・列 b」のマス = 「a をしてから b」の結果。どの行・どの列にも全部の元が 1 回ずつ現れる（ラテン方陣）', 20, 62);
  textSize(18);
  fill(30);
  let wtxt = word.slice(-16).join('·');
  text('押した順：' + (wtxt || '（なし）'), 30, height - 96);
  textSize(30);
  fill(120, 60, 200);
  text('= ' + name(g), 30, height - 56);
  // R·F と F·R の比較
  fill(30);
  textSize(16);
  text('R·F = ' + name(then(R_, F_)) + '　　F·R = ' + name(then(F_, R_)) + (n > 2 ? '　→ 違う！（非可換）' : ''), 30, height - 20);

  drawTable();
}

// 番号つきの正 n 角形（アニメーションつき）
function drawPolygon(cx, cy, R0) {
  let a0 = shown, a1 = g, t = 1;
  if (anim) { anim.t = min(1, anim.t + 0.06); t = anim.t * anim.t * (3 - 2 * anim.t); if (anim.t >= 1) anim = null; }
  // 頂点 i の位置：元 [k, f] は角度 θ を (f ? π - θ : θ) にしてから k 段回す
  let pos = (e, i) => {
    let th = -HALF_PI + (i * TWO_PI) / n;
    if (e[1]) th = PI - th;                          // たて軸で裏返す（-π/2 の軸）
    th += (e[0] * TWO_PI) / n;
    return th;
  };
  stroke(0, 30); strokeWeight(3); fill(0, 8);
  beginShape();
  for (let i = 0; i < n; i++) vertex(cx + R0 * cos(-HALF_PI + (i * TWO_PI) / n), cy + R0 * sin(-HALF_PI + (i * TWO_PI) / n));
  endShape(CLOSE);
  stroke(220, 60, 90, 120); strokeWeight(2);
  drawingContext.setLineDash([6, 6]);
  line(cx, cy - R0 * 1.25, cx, cy + R0 * 1.25);      // F の軸
  drawingContext.setLineDash([]);
  let pts = [];
  for (let i = 0; i < n; i++) {
    let A = pos(a0, i), B = pos(a1, i);
    let d = atan2(sin(B - A), cos(B - A));           // 近い向きに回す
    if (anim && anim.flip) {                         // 裏返しは x 座標だけ反転して見せる
      let x0 = cos(A), x1 = cos(B), y = sin(A);
      pts.push([cx + R0 * lerp(x0, x1, t), cy + R0 * lerp(y, sin(B), t)]);
    } else pts.push([cx + R0 * cos(A + d * t), cy + R0 * sin(A + d * t)]);
  }
  stroke(50, 50, 120); strokeWeight(4); fill(150, 130, 240, 120);
  beginShape();
  for (let p of pts) vertex(p[0], p[1]);
  endShape(CLOSE);
  for (let i = 0; i < n; i++) {
    noStroke();
    colorMode(HSB); fill((i * 360) / n, 70, 90); colorMode(RGB);
    circle(pts[i][0], pts[i][1], 40);
    fill(255); textAlign(CENTER, CENTER); textSize(20);
    text(i + 1, pts[i][0], pts[i][1]);
    textAlign(LEFT, BASELINE);
  }
}

// ケイリー表（行 a・列 b に「a をしてから b」）
function drawTable() {
  let N = 2 * n;
  let x0 = width * 0.46, y0 = 110;
  let cs = min((width - x0 - 30) / (N + 1), (height - 250) / (N + 1));
  hover = null;
  textAlign(CENTER, CENTER);
  for (let i = -1; i < N; i++) for (let j = -1; j < N; j++) {
    let x = x0 + (j + 1) * cs, y = y0 + (i + 1) * cs;
    if (i < 0 && j < 0) { fill(30); textSize(cs * 0.28); text('a＼b', x + cs / 2, y + cs / 2); continue; }
    if (i < 0 || j < 0) {
      let e = el(i < 0 ? j : i);
      fill(e[1] ? color(200, 230, 255) : color(255, 225, 200)); noStroke();
      rect(x + 1, y + 1, cs - 2, cs - 2, 4);
      fill(30); textSize(cs * 0.36); text(name(e), x + cs / 2, y + cs / 2);
      continue;
    }
    let p = then(el(i), el(j));
    let on = filled[i + ',' + j];
    let over = mouseX > x && mouseX < x + cs && mouseY > y && mouseY < y + cs;
    if (over) hover = [i, j];
    stroke(255); strokeWeight(1);
    if (on) { colorMode(HSB); fill(p[1] ? 200 + p[0] * 25 : 20 + p[0] * 25, 45, 95); colorMode(RGB); }
    else fill(over ? 225 : 235);
    rect(x, y, cs, cs, 3);
    if (on) { noStroke(); fill(30); textSize(cs * 0.36); text(name(p), x + cs / 2, y + cs / 2); }
  }
  textAlign(LEFT, BASELINE);
  if (hover) {
    let [i, j] = hover;
    fill(30); noStroke(); textSize(18);
    text(name(el(i)) + ' をしてから ' + name(el(j)) + '  =  ' + name(then(el(i), el(j))), x0, y0 + (N + 1) * cs + 30);
  }
  let cnt = Object.keys(filled).length;
  fill(110); textSize(14);
  text('うまったマス ' + cnt + ' / ' + N * N + '（R や F を押すと、今の行の R・F の列がうまる）', x0, y0 + (N + 1) * cs + 56);
}

function apply(op, label) {
  filled[idx(g) + ',' + idx(op)] = true;
  shown = g;
  anim = { t: 0, flip: op[1] === 1 && op[0] === 0 };
  g = then(g, op);
  word.push(label);
}

function keyPressed() {
  if (key === 'r' || key === 'R') apply(R_, 'R');
  if (key === 'f' || key === 'F') apply(F_, 'F');
  if (key === UP_ARROW || key === DOWN_ARROW) { n = constrain(n + (key === UP_ARROW ? 1 : -1), 3, 6); resetAll(); }
  if (key === 'a' || key === 'A') autoFill = !autoFill;
  if (key === '0') resetAll();
  return false;
}
function resetAll() { g = [0, 0]; shown = [0, 0]; word = []; filled = {}; anim = null; }

function mousePressed() {
  if (!hover) return;
  let [i, j] = hover;
  filled[i + ',' + j] = true;
  // e から a を実行 → b を実行、の 2 段階を見せる
  g = el(i); word = [name(el(i)), name(el(j))];
  shown = g; g = then(el(i), el(j)); anim = { t: 0, flip: false };
}

// ---------- やってみよう ----------
// 1. R を n 回、F を 2 回 → e。R F R F は？（F R F = R⁻¹ になる）
// 2. 表の対角線（a·a）を見て、e になる元を数えよう。鏡映はすべて「2 回で e」
// 3. n = 4 の表で、左上 4×4（回転だけ）は閉じている = 部分群（→ 05）
// 4. R·F と F·R の違いを、番号 1 の行き先で説明してみよう
// 5. どの行・列にも全部の元が 1 回ずつ。なぜ？（ヒント：逆元があるから）
