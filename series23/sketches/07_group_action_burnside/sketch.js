// ============================================
// 07 群の作用と軌道 ─ バーンサイドの補題
// n 個のビーズに k 色を塗る。回したり裏返したりして重なるものは「同じネックレス」= 同じ軌道
//   異なるネックレスの数 = （各対称性 g で変わらない塗り方の数）の平均 = (1/|G|) Σ k^(g の巡回の数)
// ←→ = ビーズの数 n / ↑↓ = 色の数 k / D = 裏返しも同じとみなす / ビーズをクリック = 色を変える / X = ランダム
// ============================================

let n = 6, k = 2;        // ★ ビーズの数、色の数
let useFlip = true;      // 裏返しを含める（二面体群）か、回転だけ（巡回群）か
let beads = [];
let G = [];              // 群の元：ビーズの位置の置換（配列）
let reps = [], orbitCount = 0;
let repLayer;
const PAL = ['#f4f1e8', '#e2483d', '#2f6fdf', '#f0b429'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  repLayer = createGraphics(floor(width * 0.42), floor(height - 400));
  rebuild();
}

function rebuild() {
  // 群：回転 j と（あれば）鏡映 j
  G = [];
  for (let j = 0; j < n; j++) G.push({ p: [...Array(n).keys()].map((i) => (i + j) % n), name: '回転 ' + j });
  if (useFlip) for (let j = 0; j < n; j++) G.push({ p: [...Array(n).keys()].map((i) => (j - i + n) % n), name: '鏡映 ' + j });
  for (let g of G) g.cyc = cycleCount(g.p);
  beads = beads.length === n ? beads.map((c) => c % k) : Array(n).fill(0).map((_, i) => i % k);
  // 全部の塗り方を調べ、軌道の代表（いちばん小さい数）だけ集める
  reps = [];
  let total = k ** n;
  for (let code = 0; code < total; code++) {
    let c = decode(code);
    let isMin = true;
    for (let g of G) { if (encode(applyG(g.p, c)) < code) { isMin = false; break; } }
    if (isMin) reps.push(c);
  }
  orbitCount = reps.length;
  drawReps();
}
function decode(code) { let c = []; for (let i = 0; i < n; i++) { c.push(code % k); code = floor(code / k); } return c; }
function encode(c) { let v = 0; for (let i = n - 1; i >= 0; i--) v = v * k + c[i]; return v; }
function applyG(p, c) { let out = Array(n); for (let i = 0; i < n; i++) out[p[i]] = c[i]; return out; }
function cycleCount(p) { let seen = [], cnt = 0; for (let i = 0; i < p.length; i++) { if (seen[i]) continue; cnt++; for (let j = i; !seen[j]; j = p[j]) seen[j] = true; } return cnt; }

// 代表のネックレスを並べた絵（パラメータが変わったときだけ描く）
function drawReps() {
  let g = repLayer;
  g.clear();
  let s = 46, cols = floor(g.width / s);
  let maxShow = cols * floor(g.height / s);
  for (let i = 0; i < min(reps.length, maxShow); i++) {
    let x = (i % cols) * s + s / 2, y = floor(i / cols) * s + s / 2;
    necklace(g, x, y, s * 0.32, reps[i], 4);
  }
  if (reps.length > maxShow) { g.noStroke(); g.fill(255); g.textSize(14); g.text('…ほか ' + (reps.length - maxShow) + ' 個', 4, g.height - 6); }
}
function necklace(g, x, y, r, c, br) {
  g.noFill(); g.stroke(255, 60); g.strokeWeight(1); g.circle(x, y, r * 2);
  for (let i = 0; i < c.length; i++) {
    let a = -HALF_PI + (i * TWO_PI) / c.length;
    g.fill(PAL[c[i]]); g.stroke(20); g.strokeWeight(1);
    g.circle(x + r * cos(a), y + r * sin(a), br * 2);
  }
}

function draw() {
  background(28, 30, 40);
  // 大きなネックレス
  let cx = width * 0.2, cy = height * 0.36, R = min(width * 0.13, height * 0.2);
  necklace(window, cx, cy, R, beads, 22);
  // その軌道（重ならないものだけ）と安定化群
  let orbit = {}, stab = 0;
  for (let g of G) { let c = applyG(g.p, beads); orbit[encode(c)] = c; if (encode(c) === encode(beads)) stab++; }
  let orb = Object.values(orbit);
  noStroke(); fill(255); textSize(16);
  text('このネックレスの軌道：' + orb.length + ' 個　安定化群：' + stab + ' 個　→ ' + orb.length + ' × ' + stab + ' = ' + G.length + ' = |G|', 30, cy + R + 60);
  for (let i = 0; i < orb.length; i++) necklace(window, 50 + (i % 12) * 50, cy + R + 100 + floor(i / 12) * 50, 16, orb[i], 5);

  // バーンサイドの表
  let px = width * 0.5, py = 110;
  fill(255); textSize(18);
  text('バーンサイドの補題：対称性 g ごとに「変わらない塗り方」を数える', px, py);
  textSize(14);
  let sum = 0;
  let rowH = min(22, (height * 0.42) / n);
  G.forEach((g, i) => {             // 左の列 = 回転、右の列 = 鏡映
    let fix = k ** g.cyc;
    sum += fix;
    fill(200);
    text(g.name + '　巡回 ' + g.cyc + ' 個 → ' + k + '^' + g.cyc + ' = ' + fix, px + (i < n ? 0 : 280), py + 30 + (i % n) * rowH);
  });
  let y = py + 40 + rowH * n;
  fill(255, 210, 90); textSize(22);
  text('(' + sum + ') / ' + G.length + ' = ' + sum / G.length, px, y + 10);
  fill(255); textSize(16);
  text('実際に全部の ' + k ** n + ' 通りを調べた軌道の数：' + orbitCount + (orbitCount === sum / G.length ? '　✓ 一致' : ''), px, y + 40);
  image(repLayer, px, y + 60);

  fill(255); textSize(18);
  text('←→：n = ' + n + '　↑↓：k = ' + k + '　D：' + (useFlip ? '回転＋裏返し（D' + n + '）' : '回転だけ（C' + n + '）') + '　ビーズをクリック：色　X：ランダム', 20, 36);
  fill(170); textSize(15);
  text('群がものに「作用」すると、ものは軌道に分かれる。軌道の大きさ × 安定化群の大きさ = |G|（軌道・安定化群定理）', 20, 62);
}

function mousePressed() {
  let cx = width * 0.2, cy = height * 0.36, R = min(width * 0.13, height * 0.2);
  for (let i = 0; i < n; i++) {
    let a = -HALF_PI + (i * TWO_PI) / n;
    if (dist(mouseX, mouseY, cx + R * cos(a), cy + R * sin(a)) < 24) beads[i] = (beads[i] + 1) % k;
  }
}

function keyPressed() {
  if (key === RIGHT_ARROW) { n = min(n + 1, 8); rebuild(); }
  if (key === LEFT_ARROW) { n = max(n - 1, 3); rebuild(); }
  if (key === UP_ARROW) { k = min(k + 1, 4); rebuild(); }
  if (key === DOWN_ARROW) { k = max(k - 1, 2); rebuild(); }
  if (key === 'd' || key === 'D') { useFlip = !useFlip; rebuild(); }
  if (key === 'x' || key === 'X') beads = beads.map(() => floor(Math.random() * k));
  return false;
}

// ---------- やってみよう ----------
// 1. n = 6, k = 2、回転だけだと 14 個、裏返しも入れると 13 個。どのネックレスが「裏返して初めて同じ」になる？
// 2. 全部同じ色のネックレスの軌道は 1 個、安定化群は |G| 個。軌道 × 安定化群 = |G| を確かめよう
// 3. 回転 j の巡回の数は gcd(j, n)。表で確かめよう
// 4. 立方体の面を k 色で塗る数も同じ方法で数えられる（立方体の回転群は 24 個）。式をつくってみよう
