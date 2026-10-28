// ============================================
// 10 ナッシュ均衡は不動点
// 2 人のゲーム。「相手の作戦に対するいちばん良い返し（最適反応）」を互いに取り合って、誰も変えたくない状態 = ナッシュ均衡
//   なめらかな最適反応 Φ（ロジット）は正方形 → 正方形の連続写像 → ブラウワーで不動点がある。λ → ∞ でナッシュ均衡に近づく（ナッシュの証明の考え方）
// 1〜4 = 2×2 のゲーム / 5 = じゃんけん（3×3、レプリケーター動学）/ クリック = 出発点 / ↑↓ = λ（合理性）/ ←→ = じゃんけんの勝ち点 / C = 軌跡を消す
// ============================================

let GAMES = [
  { name: '囚人のジレンマ', r: ['協力', '裏切り'], A: [[3, 0], [5, 1]], B: [[3, 5], [0, 1]] },
  { name: 'コイン合わせ', r: ['表', '裏'], A: [[1, -1], [-1, 1]], B: [[-1, 1], [1, -1]] },
  { name: '鹿狩り', r: ['鹿', 'ウサギ'], A: [[4, 0], [3, 3]], B: [[4, 3], [0, 3]] },
  { name: 'チキンゲーム', r: ['よける', '直進'], A: [[0, -1], [1, -5]], B: [[0, 1], [-1, -5]] },
];
let gi = 0;
let lam = 4;               // ★ λ：大きいほど「最適反応」に忠実
let eta = 0.08;            // ★ 1 フレームで最適反応へ近づく割合
let trails = [];           // 2×2：[{p, q}…] の配列
let winA = 1.0;            // ★ じゃんけん：勝ったときの点（負けは −1）
let rpsTrails = [];
let SZ, ox, oy;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  SZ = min(height - 170, width * 0.48); ox = 70; oy = 105;
  trails = [[{ p: 0.85, q: 0.2 }]];
}
function G() { return GAMES[gi]; }
function sig(z) { return 1 / (1 + Math.exp(-constrain(z, -50, 50))); }
// 相手の確率に対する「上の作戦 − 下の作戦」の得の差
function d1(q) { let A = G().A; return (q * A[0][0] + (1 - q) * A[0][1]) - (q * A[1][0] + (1 - q) * A[1][1]); }
function d2(p) { let B = G().B; return (p * B[0][0] + (1 - p) * B[1][0]) - (p * B[0][1] + (1 - p) * B[1][1]); }
// ★ なめらかな最適反応 Φ(p, q)
function Phi(p, q) { return { p: sig(lam * d1(q)), q: sig(lam * d2(p)) }; }

function nashList() {
  let out = [];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    let p = 1 - i, q = 1 - j, A = G().A, B = G().B;
    if (A[i][j] >= A[1 - i][j] && B[i][j] >= B[i][1 - j]) out.push({ p, q });
  }
  // 混合戦略：相手が無差別になる確率
  let a = G().A, b = G().B;
  let qd = (a[1][1] - a[0][1]) / (a[0][0] - a[0][1] - a[1][0] + a[1][1]);
  let pd = (b[1][1] - b[1][0]) / (b[0][0] - b[1][0] - b[0][1] + b[1][1]);
  if (qd > 0 && qd < 1 && pd > 0 && pd < 1) out.push({ p: pd, q: qd });
  return out;
}
// Φ の不動点：p = σ(λ d1(σ(λ d2(p)))) を 1 変数で解く
function phiFixed() {
  let out = [], h = (p) => sig(lam * d1(sig(lam * d2(p)))) - p, prev = h(0), N = 2000;
  for (let i = 1; i <= N; i++) {
    let p = i / N, v = h(p);
    if (prev * v <= 0) { let a = (i - 1) / N, b = p; for (let k = 0; k < 40; k++) { let m = (a + b) / 2; if (h(a) * h(m) <= 0) b = m; else a = m; } let pp = (a + b) / 2; out.push({ p: pp, q: sig(lam * d2(pp)) }); }
    prev = v;
  }
  return out;
}

function X(p) { return ox + p * SZ; }
function Y(q) { return oy + SZ - q * SZ; }

function draw() {
  background(230, 30, 11);
  if (gi === 4) { drawRPS(); return; }
  // 軌跡を進める：x ← x + η(Φ(x) − x)
  for (let t of trails) {
    let c = t[t.length - 1], f = Phi(c.p, c.q);
    if (t.length < 600) t.push({ p: c.p + eta * (f.p - c.p), q: c.q + eta * (f.q - c.q) });
  }
  noFill(); stroke(0, 0, 40); strokeWeight(1); rect(ox, oy, SZ, SZ);
  // 矢印 Φ(x) − x
  stroke(0, 0, 100, 30);
  for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) {
    let p = (i + 0.5) / 14, q = (j + 0.5) / 14, f = Phi(p, q);
    line(X(p), Y(q), X(lerp(p, f.p, 0.12)), Y(lerp(q, f.q, 0.12)));
  }
  // 最適反応（かくかく）とロジット（なめらか）
  strokeWeight(3);
  stroke(190, 70, 100, 40); noFill(); beginShape();
  for (let s = 0; s <= 200; s++) { let q = s / 200, dd = d1(q); vertex(X(dd > 0 ? 1 : dd < 0 ? 0 : 0.5), Y(q)); } endShape();
  stroke(330, 70, 100, 40); beginShape();
  for (let s = 0; s <= 200; s++) { let p = s / 200, dd = d2(p); vertex(X(p), Y(dd > 0 ? 1 : dd < 0 ? 0 : 0.5)); } endShape();
  strokeWeight(2.5);
  stroke(190, 70, 100); beginShape(); for (let s = 0; s <= 200; s++) { let q = s / 200; vertex(X(sig(lam * d1(q))), Y(q)); } endShape();
  stroke(330, 70, 100); beginShape(); for (let s = 0; s <= 200; s++) { let p = s / 200; vertex(X(p), Y(sig(lam * d2(p)))); } endShape();
  // 軌跡
  for (let t of trails) {
    stroke(0, 0, 100, 70); strokeWeight(1.5); noFill();
    beginShape(); for (let c of t) vertex(X(c.p), Y(c.q)); endShape();
    let c = t[t.length - 1]; noStroke(); fill(0, 0, 100); circle(X(c.p), Y(c.q), 8);
  }
  // 不動点
  for (let e of nashList()) { noFill(); stroke(45, 90, 100); strokeWeight(3); circle(X(e.p), Y(e.q), 24); }
  for (let e of phiFixed()) { noStroke(); fill(45, 90, 100); circle(X(e.p), Y(e.q), 10); }
  // 軸
  noStroke(); fill(0, 0, 70); textSize(14);
  text('p = 1 の確率で「' + G().r[0] + '」（プレイヤー 1）→', ox, oy + SZ + 24);
  push(); translate(ox - 18, oy + SZ); rotate(-HALF_PI); text('q = 1 の確率で「' + G().r[0] + '」（プレイヤー 2）→', 0, 0); pop();

  // 右：利得表と説明
  let tx = ox + SZ + 50, ty = oy + 10;
  fill(0, 0, 100); textSize(18); text((gi + 1) + '：' + G().name, tx, ty);
  textSize(16);
  let A = G().A, B = G().B;
  text('　　　　 相手「' + G().r[0] + '」　相手「' + G().r[1] + '」', tx, ty + 34);
  for (let i = 0; i < 2; i++) text('「' + G().r[i] + '」　　(' + A[i][0] + ', ' + B[i][0] + ')　　　(' + A[i][1] + ', ' + B[i][1] + ')', tx, ty + 60 + i * 26);
  fill(0, 0, 60); textSize(14);
  text('（プレイヤー 1 の得, プレイヤー 2 の得）', tx, ty + 120);
  let lines = [
    ['水色', 190, '＝ プレイヤー 1 の最適反応（薄い：かくかく、濃い：ロジット）'],
    ['桃色', 330, '＝ プレイヤー 2 の最適反応'],
    ['黄色の輪', 45, '＝ ナッシュ均衡（2 本のかくかく線の交点）'],
    ['黄色の点', 45, '＝ Φ の不動点（2 本のなめらかな線の交点）'],
  ];
  for (let i = 0; i < lines.length; i++) { fill(lines[i][1], 70, 100); text(lines[i][0], tx, ty + 160 + i * 24); fill(0, 0, 80); text(lines[i][2], tx + 72, ty + 160 + i * 24); }
  fill(0, 0, 80); textSize(15);
  let more = ['λ を大きく（↑）すると、黄色の点が黄色の輪に近づく', 'コイン合わせ：均衡は真ん中だけ。軌跡はうずを巻く', '鹿狩り：均衡が 3 つ。どこから始めるかで行き先が変わる', '囚人のジレンマ：2 人とも協力が得なのに (裏切り, 裏切り) へ'];
  for (let i = 0; i < more.length; i++) text('・' + more[i], tx, ty + 280 + i * 26);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('1〜4：ゲーム　5：じゃんけん　λ = ' + nf(lam, 1, 1) + '（↑↓）　クリック：出発点　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('Φ(p, q) = (σ(λ·得の差₁(q)), σ(λ·得の差₂(p)))。白い軌跡は「少しずつ最適反応へ寄せる」をくり返した道。止まる所が不動点', 20, 68);
}

// じゃんけん：三角形の各点 = 3 つの手を出す割合。レプリケーター動学 ẋᵢ = xᵢ((Mx)ᵢ − xᵀMx)
function rpsM() { let a = winA, b = 1; return [[0, -b, a], [a, 0, -b], [-b, a, 0]]; }
function repl(x) {
  let M = rpsM(), Mx = M.map((r) => r[0] * x[0] + r[1] * x[1] + r[2] * x[2]);
  let avg = x[0] * Mx[0] + x[1] * Mx[1] + x[2] * Mx[2];
  return x.map((xi, i) => xi * (Mx[i] - avg));
}
function triPos(x) {
  let s = SZ / 0.9, P = [{ x: ox, y: oy + s * 0.866 }, { x: ox + s, y: oy + s * 0.866 }, { x: ox + s / 2, y: oy }];
  return { x: x[0] * P[0].x + x[1] * P[1].x + x[2] * P[2].x, y: x[0] * P[0].y + x[1] * P[1].y + x[2] * P[2].y, P };
}
function drawRPS() {
  for (let t of rpsTrails) {
    let x = t[t.length - 1];
    for (let k = 0; k < 8; k++) { let d = repl(x); x = x.map((xi, i) => max(1e-6, xi + 0.01 * d[i])); let s = x[0] + x[1] + x[2]; x = x.map((xi) => xi / s); }
    if (t.length < 3000) t.push(x); else { t.shift(); t.push(x); }
  }
  let P = triPos([1, 0, 0]).P;
  noFill(); stroke(0, 0, 50); strokeWeight(2); triangle(P[0].x, P[0].y, P[1].x, P[1].y, P[2].x, P[2].y);
  stroke(0, 0, 100, 30); strokeWeight(1);
  for (let i = 0; i <= 12; i++) for (let j = 0; i + j <= 12; j++) {
    let x = [(i + 0.3) / 12.9, (j + 0.3) / 12.9, 0]; x[2] = 1 - x[0] - x[1]; if (x[2] < 0.01) continue;
    let d = repl(x), a = triPos(x), b = triPos([x[0] + d[0] * 0.6, x[1] + d[1] * 0.6, x[2] + d[2] * 0.6]);
    line(a.x, a.y, b.x, b.y);
  }
  for (let t of rpsTrails) {
    stroke(45, 80, 100, 70); strokeWeight(1.5); noFill();
    beginShape(); for (let x of t) { let p = triPos(x); vertex(p.x, p.y); } endShape();
  }
  let c = triPos([1 / 3, 1 / 3, 1 / 3]); noFill(); stroke(45, 90, 100); strokeWeight(3); circle(c.x, c.y, 22);
  noStroke(); fill(0, 0, 100); textSize(18);
  text('グー', P[0].x - 20, P[0].y + 30); text('チョキ', P[1].x - 20, P[1].y + 30); text('パー', P[2].x - 16, P[2].y - 14);
  text('5：じゃんけん　勝ち点 a = ' + nf(winA, 1, 2) + '（←→、負けは −1）　クリック：出発点　C：消す　1〜4：2×2 のゲームへ', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('真ん中 (1/3, 1/3, 1/3) がナッシュ均衡 = 動学の不動点。a = 1 で周りを回り続け、a > 1 で吸い込まれ、a < 1 で外へ広がる', 20, 68);
  let tx = P[1].x + 40;
  fill(0, 0, 80); textSize(15);
  let lines = ['各点 = 集団の中でグー・チョキ・パーを出す人の割合', 'レプリケーター動学：平均より得をする手が増える', '　ẋᵢ = xᵢ ((Mx)ᵢ − xᵀMx)', '', '不動点があっても「着く」とは限らない（a = 1）', '→ 01 の |f\'| と同じく、不動点の「安定性」は別の話', '生き物の例：トカゲの 3 つの型、細菌の 3 種'];
  for (let i = 0; i < lines.length; i++) text(lines[i], tx, oy + 40 + i * 26);
}

function mousePressed() {
  if (gi === 4) {
    // 画面の点 → 重心座標
    let P = triPos([1, 0, 0]).P;
    let det = (P[1].y - P[2].y) * (P[0].x - P[2].x) + (P[2].x - P[1].x) * (P[0].y - P[2].y);
    let l0 = ((P[1].y - P[2].y) * (mouseX - P[2].x) + (P[2].x - P[1].x) * (mouseY - P[2].y)) / det;
    let l1 = ((P[2].y - P[0].y) * (mouseX - P[2].x) + (P[0].x - P[2].x) * (mouseY - P[2].y)) / det;
    let l2 = 1 - l0 - l1;
    if (l0 > 0.005 && l1 > 0.005 && l2 > 0.005) rpsTrails.push([[l0, l1, l2]]);
    if (rpsTrails.length > 8) rpsTrails.shift();
    return;
  }
  if (mouseX > ox && mouseX < ox + SZ && mouseY > oy && mouseY < oy + SZ) {
    trails.push([{ p: (mouseX - ox) / SZ, q: (oy + SZ - mouseY) / SZ }]);
    if (trails.length > 10) trails.shift();
  }
}
function keyPressed() {
  if (key >= '1' && key <= '5') { gi = int(key) - 1; trails = []; if (gi === 4 && rpsTrails.length === 0) rpsTrails = [[[0.6, 0.25, 0.15]], [[0.4, 0.35, 0.25]]]; }
  if (key === UP_ARROW) lam = min(60, lam * 1.25);
  if (key === DOWN_ARROW) lam = max(0.2, lam / 1.25);
  if (key === LEFT_ARROW) winA = max(0.5, winA - 0.05);
  if (key === RIGHT_ARROW) winA = min(1.5, winA + 0.05);
  if (key === 'c' || key === 'C') { trails = []; rpsTrails = []; }
}

// ---------- やってみよう ----------
// 1. 鹿狩りで、どこから始めると (鹿, 鹿) に、どこからだと (ウサギ, ウサギ) に行く？ 境目はどこ？
// 2. コイン合わせで λ を 40 にすると、軌跡は真ん中に着かずに回り続ける。eta を 0.02 にすると？
// 3. 囚人のジレンマの利得 5 を 2 に変えると、ゲームはどう変わる？（協力が均衡になる）
// 4. 自分で 2×2 のゲーム（デートの場所選び、など）を GAMES に足して、均衡の数を調べよう
