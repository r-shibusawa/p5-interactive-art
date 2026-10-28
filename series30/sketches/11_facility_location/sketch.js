// ============================================
// 11 施設配置問題 ─ p メディアンと最大被覆
// 町に p か所の拠点（倉庫・救急車の待機所・図書館）を置く。どこに置くとみんなが便利？
//   p メディアン：「人数 × 一番近い拠点までの距離」の合計を最小に ／ 最大被覆：半径 R 以内に入る人数を最大に
//   貪欲法で 1 か所ずつ足し、そのあと「入れかえ（スワップ）」で直す
// クリック = 住宅地を足す / スペース = 貪欲 → 入れかえ / ↑↓ = 拠点の数 p / 1・2 = 目的 / ←→ = 半径 R / R = 新しい町 / C = 全部消す
// ============================================

let nDemand = 120;                     // ★ 住宅地の数
let pts = [];                          // 住宅地 { x, y, w: 人数 }
let fac = [];                          // 拠点（pts の番号）
let P = 4;                             // ★ 拠点の数
let objMode = 1;                       // 1 = p メディアン, 2 = 最大被覆
let R = 120;                           // ★ 被覆の半径
let phase = 'idle';                    // 'greedy' → 'swap' → 'idle'
let swapIdx = 0, noImprove = 0, swaps = 0, objLog = [];
let mapX, mapY, mapW, mapH;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  mapX = 30; mapY = 100; mapW = width * 0.62; mapH = height - 130;
  newTown();
}
function newTown() {
  pts = [];
  let centers = [];
  for (let k = 0; k < 5; k++) centers.push({ x: mapX + random(80, mapW - 80), y: mapY + random(80, mapH - 80), s: random(40, 110) });
  for (let i = 0; i < nDemand; i++) {
    let c = random(centers);
    pts.push({ x: constrain(c.x + randomGaussian() * c.s, mapX + 10, mapX + mapW - 10), y: constrain(c.y + randomGaussian() * c.s, mapY + 10, mapY + mapH - 10), w: floor(random(1, 10)) });
  }
  resetFac();
}
function resetFac() { fac = []; phase = 'idle'; swaps = 0; objLog = []; }
function dst(i, j) { return Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y); }

// ★ 目的関数（小さいほど良いようにそろえる）
function objective(F) {
  if (!F.length) return Infinity;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    let m = Infinity;
    for (let f of F) m = Math.min(m, dst(i, f));
    if (objMode === 1) s += pts[i].w * m;            // p メディアン：人数 × 距離
    else if (m > R) s += pts[i].w;                   // 最大被覆：カバーされない人数
  }
  return s;
}
// ★ 貪欲法：今の拠点に 1 か所足すなら、目的が一番良くなる場所
function greedyAdd() {
  let best = -1, bv = Infinity;
  for (let c = 0; c < pts.length; c++) {
    if (fac.includes(c)) continue;
    let v = objective(fac.concat([c]));
    if (v < bv) { bv = v; best = c; }
  }
  if (best >= 0) fac.push(best);
}
// ★ 入れかえ：拠点 k を別の場所に動かして良くなるなら動かす（1 フレームに拠点 1 つ分）
function swapStep() {
  let k = swapIdx % fac.length, cur = objective(fac), best = -1, bv = cur;
  for (let c = 0; c < pts.length; c++) {
    if (fac.includes(c)) continue;
    let F = fac.slice(); F[k] = c;
    let v = objective(F);
    if (v < bv - 1e-9) { bv = v; best = c; }
  }
  if (best >= 0) { fac[k] = best; swaps++; noImprove = 0; } else noImprove++;
  swapIdx++;
  return noImprove < fac.length;
}

function draw() {
  background(225, 30, 12);
  if (phase === 'greedy' && frameCount % 8 === 0) { greedyAdd(); objLog.push(objective(fac)); if (fac.length >= P) { phase = 'swap'; swapIdx = 0; noImprove = 0; } }
  else if (phase === 'swap' && frameCount % 4 === 0) { if (!swapStep()) phase = 'idle'; objLog.push(objective(fac)); }
  if (objLog.length > 300) objLog.shift();

  noFill(); stroke(0, 0, 100, 15); strokeWeight(1); rect(mapX, mapY, mapW, mapH, 8);
  // 割り当て（一番近い拠点）
  let covered = 0, total = 0;
  let near = pts.map((p, i) => { let m = Infinity, b = -1; for (let f of fac) { let dd = dst(i, f); if (dd < m) { m = dd; b = f; } } return { b, m }; });
  if (objMode === 2) for (let f of fac) { noStroke(); fill(190, 60, 90, 12); circle(pts[f].x, pts[f].y, 2 * R); stroke(190, 60, 90, 40); noFill(); circle(pts[f].x, pts[f].y, 2 * R); }
  for (let i = 0; i < pts.length; i++) {
    total += pts[i].w;
    let ok = near[i].m <= R; if (ok) covered += pts[i].w;
    if (near[i].b >= 0 && objMode === 1) { stroke((fac.indexOf(near[i].b) * 67 + 30) % 360, 50, 90, 40); strokeWeight(1); line(pts[i].x, pts[i].y, pts[near[i].b].x, pts[near[i].b].y); }
    noStroke();
    fill(objMode === 2 && fac.length ? (ok ? color(140, 60, 90) : color(0, 70, 90)) : color(0, 0, 85));
    circle(pts[i].x, pts[i].y, 3 + pts[i].w * 1.2);
  }
  for (let k = 0; k < fac.length; k++) {
    let f = pts[fac[k]];
    fill((k * 67 + 30) % 360, 70, 100); stroke(0, 0, 100); strokeWeight(2);
    rect(f.x - 10, f.y - 10, 20, 20, 4);
    noStroke(); fill(0, 0, 10); textSize(12); textAlign(CENTER, CENTER); text(k + 1, f.x, f.y); textAlign(LEFT, BASELINE);
  }

  // 右：数字とグラフ
  let rx = mapX + mapW + 40, rw = width - rx - 30;
  let sumWD = 0; for (let i = 0; i < pts.length; i++) if (near[i].b >= 0) sumWD += pts[i].w * near[i].m;
  fill(0, 0, 100); textSize(20); text(objMode === 1 ? 'p メディアン' : '最大被覆', rx, 130);
  fill(0, 0, 85); textSize(15);
  let lines = [
    '拠点 ' + fac.length + ' / p = ' + P + '　住宅地 ' + pts.length + '（' + total + ' 人）',
    '人数 × 距離の合計　' + (fac.length ? nf(sumWD, 1, 0) : '—'),
    '平均の距離　' + (fac.length ? nf(sumWD / max(1, total), 1, 1) : '—'),
    '半径 ' + R + ' 以内の人　' + (fac.length ? nf(100 * covered / max(1, total), 1, 1) + '%' : '—'),
    '段階：' + { idle: '止まっている', greedy: '貪欲法で 1 か所ずつ足す', swap: '入れかえで直す' }[phase] + '　入れかえ ' + swaps + ' 回',
  ];
  lines.forEach((s, i) => text(s, rx, 166 + i * 26));
  let gy = 330, gh = 160;
  fill(0, 0, 70); textSize(13); text('目的関数の推移（下がるほど良い）', rx, gy - 10);
  if (objLog.length > 1) {
    let hi = max(objLog.filter(isFinite)), lo = min(objLog);
    noFill(); stroke(50, 90, 100); strokeWeight(2);
    beginShape(); objLog.forEach((v, k) => { if (isFinite(v)) vertex(rx + k / (objLog.length - 1) * rw, gy + gh - (v - lo) / max(1e-9, hi - lo) * gh); }); endShape();
  }
  stroke(0, 0, 100, 25); strokeWeight(1); line(rx, gy + gh, rx + rw, gy + gh); noStroke();
  fill(0, 0, 60); textSize(13);
  ['p メディアン = 平均的な便利さ（配送センター、学校）', '最大被覆 = 「〇分以内」の約束（救急車、消防署、コンビニ）', '貪欲法は 1 か所目を真ん中に置きがち →', '入れかえで、あとから全体を見直す（Teitz–Bart 法）', '', '住宅地の丸の大きさ = 人数']
    .forEach((s, i) => text(s, rx, gy + gh + 40 + i * 22));

  fill(0, 0, 100); textSize(18);
  text('クリック：住宅地　スペース：貪欲 → 入れかえ　↑↓ p ' + P + '　1・2：目的 ' + (objMode === 1 ? 'p メディアン' : '最大被覆') + '　←→ 半径 R ' + R + '　R：新しい町　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('□ = 拠点。p メディアンは線の長さ（× 人数）の合計を、最大被覆は円に入る人数を見る。目的が変わると最適な場所も変わる', 20, 68);
}

function mousePressed() {
  if (mouseX > mapX && mouseX < mapX + mapW && mouseY > mapY && mouseY < mapY + mapH) pts.push({ x: mouseX, y: mouseY, w: 9 });
}
function keyPressed() {
  if (key === ' ' && pts.length > P) { fac = []; objLog = []; swaps = 0; phase = 'greedy'; }
  if (key === UP_ARROW) { P = min(10, P + 1); resetFac(); }
  if (key === DOWN_ARROW) { P = max(1, P - 1); resetFac(); }
  if (key === '1' || key === '2') { objMode = int(key); resetFac(); }
  if (key === RIGHT_ARROW) R = min(400, R + 10);
  if (key === LEFT_ARROW) R = max(20, R - 10);
  if (key === 'r' || key === 'R') newTown();
  if (key === 'c' || key === 'C') { pts = []; resetFac(); }
}

// ---------- やってみよう ----------
// 1. p = 1 の p メディアンの拠点はどこになる？ 人数の重心と比べよう（同じとは限らない）
// 2. 同じ町・同じ p で 1（p メディアン）と 2（最大被覆）の配置を比べよう。どこが違う？
// 3. 町の外れに人数 9 の住宅地をいくつかクリックすると、拠点は動く？ 最大被覆では？
// 4. 「最も遠い人の距離を最小に」（p センター問題）を objective に足してみよう
