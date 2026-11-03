// ============================================
// 07 包除原理
// |A ∪ B ∪ C| = |A| + |B| + |C| − |A∩B| − |B∩C| − |A∩C| + |A∩B∩C|
// 重なりを「足しすぎては引き、引きすぎては足す」。点を数えて確かめる
// 3 / 4 = 集合の数 / ドラッグ = 円を動かす / スペース = 項を 1 つずつ足し引き / A = 自動 / D = 攪乱順列 D_n の表
// ============================================

let pts = [];               // 散らばった点
let circles = [];           // { x, y, r, hue }
let k = 3;                  // ★ 集合の数（3 か 4）
let termIdx = 0;            // 何項目まで足したか
let auto = true;
let tick = 0;
let dragging = -1;
let showDerange = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  for (let i = 0; i < 500; i++) pts.push({ x: 40 + Math.random() * (width * 0.6), y: 110 + Math.random() * (height - 150) });   // ★ 点の数
  rebuild();
}

function rebuild() {
  circles = [];
  let cx = width * 0.33, cy = height * 0.55, R = Math.min(width, height) * 0.14;
  for (let i = 0; i < k; i++) {
    let a = (i * TWO_PI) / k - HALF_PI;
    circles.push({ x: cx + Math.cos(a) * R * 0.9, y: cy + Math.sin(a) * R * 0.9, r: R * 1.15, hue: (i * 360) / k + 20 });
  }
  termIdx = 0;
}

// 点 p がどの円に入っているか（ビットマスク）
function membership(p) {
  let m = 0;
  for (let i = 0; i < circles.length; i++) { let c = circles[i]; if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < c.r * c.r) m |= 1 << i; }
  return m;
}

// ★ 包除原理の各項：部分集合 S（サイズ順）ごとに (−1)^(|S|−1) × |∩S|
function terms() {
  let masks = [];
  for (let s = 1; s < 1 << k; s++) masks.push(s);
  masks.sort((a, b) => bitCount(a) - bitCount(b) || a - b);
  let mem = pts.map(membership);
  return masks.map((s) => {
    let c = 0;
    for (let m of mem) if ((m & s) === s) c++;
    return { mask: s, size: bitCount(s), sign: bitCount(s) % 2 === 1 ? 1 : -1, count: c };
  });
}
function bitCount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
function maskName(s) { let names = ['A', 'B', 'C', 'D'], out = []; for (let i = 0; i < k; i++) if (s & (1 << i)) out.push(names[i]); return out.join('∩'); }

function draw() {
  background(222, 28, 11);
  let T = terms();
  if (auto) { tick += deltaTime / 1000; if (tick > 0.7) { tick = 0; termIdx = (termIdx + 1) % (T.length + 1); } }

  // 円
  for (let i = 0; i < circles.length; i++) {
    let c = circles[i];
    noStroke(); fill(c.hue, 70, 90, 18);
    circle(c.x, c.y, c.r * 2);
    noFill(); stroke(c.hue, 70, 95); strokeWeight(2);
    circle(c.x, c.y, c.r * 2);
    noStroke(); fill(c.hue, 70, 100); textSize(20);
    text(['A', 'B', 'C', 'D'][i], c.x - 8, c.y - c.r + 26);
  }
  // 点：和集合に入っている点は明るく
  let union = 0;
  noStroke();
  for (let p of pts) {
    let m = membership(p);
    if (m) { union++; fill(50, 80, 100); circle(p.x, p.y, 5); } else { fill(0, 0, 40); circle(p.x, p.y, 3); }
  }

  // 右パネル：項を順に
  let px = width * 0.64, py = 120;
  fill(0, 0, 100, 8); rect(px - 16, py - 30, width - px - 10, height - py - 40, 10);
  fill(0, 0, 100); textSize(22);
  text('|A ∪ B' + (k >= 3 ? ' ∪ C' : '') + (k === 4 ? ' ∪ D' : '') + '| を数える', px, py);
  textSize(15); fill(0, 0, 70);
  text('直接数えた和集合の点：' + union, px, py + 28);
  let sum = 0, y = py + 66;
  textSize(16);
  for (let i = 0; i < T.length; i++) {
    let t = T[i], active = i < termIdx;
    if (active) sum += t.sign * t.count;
    fill(active ? (t.sign > 0 ? 130 : 10) : 0, active ? 70 : 0, active ? 95 : 45);
    let txt = (t.sign > 0 ? '+ ' : '− ') + '|' + maskName(t.mask) + '| = ' + t.count;
    text(txt, px, y);
    if (active) text('→ ' + sum, px + 200, y);
    if (i === termIdx - 1) { fill(50, 80, 100); text('◀', px + 270, y); }
    y += 22;
    if (i + 1 < T.length && T[i + 1].size !== t.size) y += 8;
  }
  fill(0, 0, 100); textSize(18);
  text('合計：' + sum + (termIdx === T.length ? '　＝ 直接数えた ' + union + (sum === union ? ' ✓' : ' ✗') : '　（まだ途中）'), px, y + 16);
  fill(0, 0, 60); textSize(13);
  text(termIdx === 0 ? '' : termIdx <= k ? '1 個ずつ足すと重なりを 2 回数えてしまう' : termIdx <= k + k * (k - 1) / 2 ? '2 個の重なりを引く → 3 個の重なりを引きすぎる' : '3 個の重なりを足し戻す（4 個なら また引く）', px, y + 44);

  if (showDerange) drawDerangement(px, y + 80);

  fill(0, 0, 100); textSize(18);
  text('集合の数 ' + k + '（3 / 4）　ドラッグ：円を動かす　スペース：次の項　A：自動 ' + (auto ? 'ON' : 'off') + '　D：攪乱順列 D_n ' + (showDerange ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('黄色の点 = どれかの円に入っている点（和集合）。足しすぎ・引きすぎを交互に直すと、最後にぴったり合う', 20, 68);
}

// 攪乱順列：D_n = n! Σ_{i=0}^{n} (−1)^i / i!　（包除原理：「i 番が固定」の集合の和集合を n! から引く）
function drawDerangement(px, py) {
  if (py > height - 160) py = height - 160;
  fill(0, 0, 100); textSize(15);
  text('攪乱順列 D_n（誰も自分の席に座らない並び）= n! − |固定点をもつ順列の和集合|', px, py);
  fill(0, 0, 70); textSize(14);
  let d = [1, 0], f = [1, 1];
  for (let i = 2; i <= 8; i++) { f.push(f[i - 1] * i); d.push((i - 1) * (d[i - 1] + d[i - 2])); }
  let line1 = 'n:   ', line2 = 'D_n: ', line3 = 'D_n/n!: ';
  for (let i = 1; i <= 8; i++) { line1 += i + '  '; line2 += d[i] + '  '; line3 += (d[i] / f[i]).toFixed(3) + ' '; }
  text(line1, px, py + 24); text(line2, px, py + 44); text(line3, px, py + 64);
  text('D_n = n!(1 − 1/1! + 1/2! − 1/3! + …)  → 1/e ≈ 0.368 に近づく（12 で実験）', px, py + 88);
}

function mousePressed() {
  for (let i = circles.length - 1; i >= 0; i--) {
    let c = circles[i];
    if ((c.x - mouseX) ** 2 + (c.y - mouseY) ** 2 < c.r * c.r) { dragging = i; return; }
  }
}
function mouseDragged() { if (dragging >= 0) { circles[dragging].x += mouseX - pmouseX; circles[dragging].y += mouseY - pmouseY; } }
function mouseReleased() { dragging = -1; }

function keyPressed() {
  if (key === '3' && k !== 3) { k = 3; rebuild(); }
  if (key === '4' && k !== 4) { k = 4; rebuild(); }
  if (key === ' ') { auto = false; termIdx = (termIdx + 1) % (terms().length + 1); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'd' || key === 'D') showDerange = !showDerange;
}

// ---------- やってみよう ----------
// 1. 円を全部離すと、2 個以上の重なりの項がすべて 0 になる。重ねるほど項が効いてくる
// 2. 3 つの円を完全に重ねると |A∪B∪C| = |A|。式の右辺がどう打ち消し合うか追ってみよう
// 3. 「1〜100 のうち 2 でも 3 でも 5 でも割り切れない数」は包除原理で数えられる。点を整数に置きかえて数えよう
// 4. 攪乱順列 D_n/n! が 1/e に近づく理由：e^x のテイラー展開 Σ x^n/n! に x = −1 を入れた形
