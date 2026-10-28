// ============================================
// 05 部分群・剰余類・ラグランジュの定理
// 部分群 H（群 G の中で閉じている部分）をずらした gH を剰余類という。剰余類は G を同じ大きさに分ける
//   → |G| = |H| × （剰余類の数）。だから |H| はいつも |G| を割り切る（ラグランジュの定理）
// 1 = Zₙ / 2 = Dₙ / ↑↓ = n / ←→ = 部分群をえらぶ / 点をクリック = その元 g の剰余類 gH を強調 / C = 左剰余類・右剰余類
// ============================================

let groupNo = 2;
let n = 6;               // ★ n
let els = [], mul;       // 元の名前と掛け算（i をしてから j）
let subs = [];           // すべての部分群（元の番号の配列）
let si = 1;              // えらんでいる部分群
let pickG = -1;
let leftCoset = true;
let pos = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  build();
}

function build() {
  if (groupNo === 1) {
    els = [...Array(n).keys()].map(String);
    mul = (i, j) => (i + j) % n;
    pos = els.map((_, i) => [cos(-HALF_PI + (i * TWO_PI) / n), sin(-HALF_PI + (i * TWO_PI) / n)]);
  } else {
    let E = [];
    for (let f = 0; f < 2; f++) for (let k = 0; k < n; k++) E.push([k, f]);
    els = E.map((e) => (e[0] === 0 && !e[1] ? 'e' : (e[0] ? 'r' + (e[0] > 1 ? e[0] : '') : '') + (e[1] ? 's' : '')));
    mul = (i, j) => { let x = E[i], y = E[j]; return ((((y[0] + (y[1] ? -x[0] : x[0])) % n) + n) % n) + ((x[1] + y[1]) % 2) * n; };
    pos = E.map((e) => { let a = -HALF_PI + (e[0] * TWO_PI) / n, r = e[1] ? 0.55 : 1; return [r * cos(a), r * sin(a)]; });
  }
  // 部分群をすべて探す：2 つの元 a, b から生成される集合（Zₙ・Dₙ の部分群はこれで全部）
  let found = {};
  let N = els.length;
  for (let a = 0; a < N; a++) for (let b = a; b < N; b++) {
    let H = closure([a, b]);
    found[H.join(',')] = H;
  }
  subs = Object.values(found).sort((p, q) => p.length - q.length || p[1] - q[1]);
  si = min(1, subs.length - 1); pickG = -1;
}
// 生成：掛け算で閉じるまで足していく
function closure(gens) {
  let H = new Set([0, ...gens]), grew = true;
  while (grew) {
    grew = false;
    for (let x of [...H]) for (let y of [...H]) { let z = mul(x, y); if (!H.has(z)) { H.add(z); grew = true; } }
  }
  return [...H].sort((p, q) => p - q);
}
// 剰余類：左 gH = { g∘h }。mul(i, j) は「i をしてから j」= j∘i なので g∘h = mul(h, g)
function cosetOf(g, H) { return H.map((h) => (leftCoset ? mul(h, g) : mul(g, h))).sort((p, q) => p - q); }

function draw() {
  background(16, 22, 30);
  let N = els.length, H = subs[si];
  // 剰余類に分ける
  let cosets = [], which = Array(N).fill(-1);
  for (let g = 0; g < N; g++) {
    if (which[g] >= 0) continue;
    let C = cosetOf(g, H);
    for (let x of C) which[x] = cosets.length;
    cosets.push(C);
  }
  let normal = true;
  for (let g = 0; g < N; g++) { leftCoset = !leftCoset; let a = cosetOf(g, H).join(); leftCoset = !leftCoset; if (a !== cosetOf(g, H).join()) normal = false; }

  let cx = width * 0.33, cy = height * 0.55, R = min(width * 0.25, height * 0.34);
  // 剰余類ごとに点を線でつなぐ
  for (let c = 0; c < cosets.length; c++) {
    colorMode(HSB); stroke((c * 360) / cosets.length, 60, 90, 0.5); colorMode(RGB);
    strokeWeight(6); noFill();
    beginShape();
    for (let x of cosets[c]) vertex(cx + pos[x][0] * R, cy + pos[x][1] * R);
    endShape(CLOSE);
  }
  // 選んだ g の剰余類 gH：H の各元 h から gh への矢印
  if (pickG >= 0) {
    for (let h of H) {
      let t = leftCoset ? mul(h, pickG) : mul(pickG, h);
      stroke(255, 220, 90); strokeWeight(2);
      line(cx + pos[h][0] * R, cy + pos[h][1] * R, cx + pos[t][0] * R, cy + pos[t][1] * R);
    }
  }
  for (let i = 0; i < N; i++) {
    let x = cx + pos[i][0] * R, y = cy + pos[i][1] * R;
    colorMode(HSB); fill((which[i] * 360) / cosets.length, 60, 90); colorMode(RGB);
    stroke(H.includes(i) ? 255 : 16); strokeWeight(H.includes(i) ? 4 : 2);
    circle(x, y, 46);
    noStroke(); fill(15); textAlign(CENTER, CENTER); textSize(15);
    text(els[i], x, y);
    textAlign(LEFT, BASELINE);
  }

  // 文字
  noStroke(); fill(255); textSize(18);
  text('1：Zₙ　2：Dₙ　↑↓：n = ' + n + '　←→：部分群（' + (si + 1) + ' / ' + subs.length + '）　クリック：g の剰余類　C：' + (leftCoset ? '左剰余類 gH' : '右剰余類 Hg'), 20, 36);
  fill(170); textSize(15);
  text('白い縁の点 = 部分群 H。同じ色 = 同じ剰余類。剰余類は重ならず、全部同じ大きさ', 20, 62);

  let px = width * 0.66, py = 130;
  fill(255); textSize(20);
  text((groupNo === 1 ? 'Z' : 'D') + n + '　|G| = ' + N, px, py);
  fill(200); textSize(17);
  text('H = { ' + H.map((i) => els[i]).join(', ') + ' }', px, py + 36, width - px - 20);
  textSize(36); fill(255, 210, 90);
  text(N + ' = ' + H.length + ' × ' + cosets.length, px, py + 120);
  fill(200); textSize(16);
  text('|G| = |H| × 剰余類の数（指数 [G : H]）', px, py + 150);
  let y = py + 200;
  textSize(15);
  for (let c = 0; c < cosets.length && y < height - 120; c++) {
    colorMode(HSB); fill((c * 360) / cosets.length, 60, 90); colorMode(RGB);
    text('{ ' + cosets[c].map((i) => els[i]).join(', ') + ' }', px, y);
    y += 24;
  }
  fill(normal ? color(120, 230, 160) : color(255, 160, 120)); textSize(16);
  text(normal ? '正規部分群：左剰余類 = 右剰余類（→ 06 の剰余群がつくれる）' : '正規でない：左と右の剰余類がずれる（C で比べよう）', px, height - 80, width - px - 20);
  fill(170); textSize(14);
  text('部分群の大きさ一覧：' + [...new Set(subs.map((s) => s.length))].join(', ') + '（すべて ' + N + ' の約数）', px, height - 30);
}

function mousePressed() {
  let cx = width * 0.33, cy = height * 0.55, R = min(width * 0.25, height * 0.34);
  pickG = -1;
  for (let i = 0; i < els.length; i++) if (dist(mouseX, mouseY, cx + pos[i][0] * R, cy + pos[i][1] * R) < 24) pickG = i;
}

function keyPressed() {
  if (key === '1' || key === '2') { groupNo = +key; build(); }
  if (key === UP_ARROW) { n = min(n + 1, groupNo === 1 ? 24 : 10); build(); }
  if (key === DOWN_ARROW) { n = max(n - 1, groupNo === 1 ? 2 : 3); build(); }
  if (key === RIGHT_ARROW) si = (si + 1) % subs.length;
  if (key === LEFT_ARROW) si = (si + subs.length - 1) % subs.length;
  if (key === 'c' || key === 'C') leftCoset = !leftCoset;
  return false;
}

// ---------- やってみよう ----------
// 1. Z₁₂ の部分群を全部見よう。大きさは 1, 2, 3, 4, 6, 12 → 12 の約数だけ。5 の部分群はない
// 2. D₃ で H = { e, s } を選び、C で左と右を比べる。剰余類がずれる = 正規でない
// 3. Dₙ の回転だけの部分群 { e, r, r², … } は正規。剰余類は「回転」と「鏡映」の 2 つ
// 4. 素数 p の Zₚ には部分群が 2 つ（{0} と全体）しかない。なぜ？
