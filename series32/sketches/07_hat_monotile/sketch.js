// ============================================
// 07 アインシュタイン・タイル（帽子）
// 2023 年に見つかった「1 種類だけで、くり返さない模様しか作れない」タイル（ドイツ語 ein Stein = 1 つの石）
//   形は六角形の格子を 6 つに割った「カイト（凧形）」8 枚をつないだ 13 角形。裏返したタイルも使う
//   ここでは帽子を 1 枚ずつ置いて、すき間も重なりもない円形の「パッチ」を探索で作る（青 = 裏返した帽子）
// スペース = 新しく探す / F = 一気に完成 / ↑↓ = パッチの大きさ / G = カイトの格子 / S = 保存
// ============================================

let radius = 10;        // ★ パッチの半径（カイトの短い辺 = 1）
let zoom = 26;          // 1 単位のピクセル数（画面に合わせて自動で決まる）
let speed = 2;          // ★ 1 フレームに何手進めるか
let showGrid = true;
let seed = 1;

const HR3 = Math.sqrt(3) / 2;
// ★ 帽子の輪郭（三角格子の点 hp(x, y) をつないだ 13 角形）
const HAT = [hp(0, 0), hp(-1, -1), hp(0, -2), hp(2, -2), hp(2, -1), hp(4, -2), hp(5, -1), hp(4, 0), hp(3, 0), hp(2, 2), hp(0, 3), hp(0, 2), hp(-1, 2)];
const H1 = hp(2, 2), H2 = hp(-2, 4);   // 六角形の中心の格子

let hatKites = [];      // 帽子に含まれる 8 枚のカイト [i, j, k]
let orients = [];       // 12 通りの向き（回転 6 × 裏返し 2）
let region = [];        // パッチの中のカイト
let covered = new Map();
let stack = [];         // 探索の記録 { cands, idx }
let done = false, steps = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 帽子の中に入っているカイトを数える → 8 枚
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (let k = 0; k < 6; k++) {
    if (insidePoly(kiteCenter(i, j, k), HAT)) hatKites.push([i, j, k]);
  }
  for (let ref = 0; ref < 2; ref++) for (let r = 0; r < 6; r++) {
    orients.push({ ref, r, ks: hatKites.map(([i, j, k]) => locateKite(rotRef(kiteCenter(i, j, k), r, ref))) });
  }
  restart();
}

function restart() {
  region = [];
  for (let i = -14; i <= 14; i++) for (let j = -14; j <= 14; j++) for (let k = 0; k < 6; k++) {
    let c = kiteCenter(i, j, k);
    if (Math.hypot(c[0], c[1]) < radius) region.push([i, j, k]);
  }
  covered = new Map();
  stack = [];
  done = false;
  steps = 0;
  randomSeed(seed);
}

function draw() {
  background(244, 240, 230);
  for (let s = 0; s < speed && !done; s++) stepSearch();
  zoom = Math.min(width * 0.55, height - 200) / (2 * radius + 6);   // 画面に収まる大きさ
  let cx = width * 0.62, cy = 90 + (height - 200) / 2;
  // カイトの格子
  if (showGrid) {
    stroke(210, 200, 185);
    strokeWeight(1);
    noFill();
    for (let [i, j, k] of region) drawPolyAt(kitePoly(i, j, k), cx, cy, zoom);
  }
  // 置いた帽子
  for (let f of stack) {
    let p = f.cands[f.idx], o = orients[p.oi];
    let col = o.ref ? [40, 90, 170] : [[250, 200, 120], [240, 150, 110], [150, 200, 160]][o.r % 3];
    fill(col[0], col[1], col[2]);
    stroke(40, 36, 30);
    strokeWeight(1.5);
    drawPolyAt(hatPoly(p), cx, cy, zoom);
  }
  noFill();
  stroke(180, 60, 60);
  strokeWeight(2);
  circle(cx, cy, 2 * radius * zoom);

  drawSingleHat(130, 200, 30);
  let refl = stack.filter((f) => orients[f.cands[f.idx].oi].ref).length;
  noStroke();
  fill(30);
  textSize(20);
  text('帽子（hat）─ 1 種類で、くり返さない模様だけを作るタイル', 20, 36);
  textSize(15);
  fill(70);
  text('置いた帽子 ' + stack.length + ' 枚（うち裏返し ' + refl + ' 枚）　手数 ' + steps + (done ? '　完成！' : '　探索中…'), 20, 62);
  text('2023 年：スミス（アマチュアの愛好家）・マイヤーズ・カプラン・グッドマン＝ストラウス', 20, height - 84);
  text('本物の無限のタイリングは、帽子を 4 種類のかたまり（H・T・P・F）にまとめ、それを大きくしていく「置き換え」で作る', 20, height - 60);
  text('ここでは「すき間・重なりなし」だけを守って探索したパッチ。裏返しが少ないのは、裏を後回しにして探すから', 20, height - 36);
}

// ★ 探索の 1 手：まだ埋まっていないカイトのうち「置き方がいちばん少ない」所に帽子を置く。置けなければ戻る
function stepSearch() {
  steps++;
  if (steps > 6000) { seed++; restart(); return; }   // 長引いたら別の順番でやり直す
  let best = null, bestC = null;
  for (let [i, j, k] of region) {
    if (covered.has(kkey(i, j, k))) continue;
    let c = candidates(i, j, k);
    if (!best || c.length < bestC.length) { best = [i, j, k]; bestC = c; }
    if (c.length === 0) break;
  }
  if (!best) { done = true; return; }
  if (bestC.length > 0) {
    // 表の帽子を先に、同じ中ではランダムな順番
    bestC = shuffle(bestC).sort((a, b) => orients[a.oi].ref - orients[b.oi].ref);
    stack.push({ cands: bestC, idx: 0 });
    place(bestC[0], true);
    return;
  }
  // 行き止まり → 1 つ前に戻って次の候補へ
  while (stack.length) {
    let f = stack[stack.length - 1];
    place(f.cands[f.idx], false);
    f.idx++;
    if (f.idx < f.cands.length) { place(f.cands[f.idx], true); return; }
    stack.pop();
  }
  seed++;
  restart();
}

// カイト (I, J, K) を覆う帽子の置き方の候補
function candidates(I, J, K) {
  let out = [];
  for (let oi = 0; oi < 12; oi++) {
    for (let [i, j, k] of orients[oi].ks) {
      if (k !== K) continue;
      let di = I - i, dj = J - j, ok = true;
      for (let [a, b, c] of orients[oi].ks) if (covered.has(kkey(a + di, b + dj, c))) { ok = false; break; }
      if (ok) out.push({ oi, di, dj });
    }
  }
  return out;
}

function place(p, on) {
  for (let [a, b, c] of orients[p.oi].ks) {
    if (on) covered.set(kkey(a + p.di, b + p.dj, c), true);
    else covered.delete(kkey(a + p.di, b + p.dj, c));
  }
}

function keyPressed() {
  if (key === ' ') { seed++; restart(); }
  if (key === 'f' || key === 'F') { let t = millis(); while (!done && millis() - t < 1500) stepSearch(); }
  if (key === UP_ARROW) { radius = Math.min(13, radius + 1); restart(); }
  if (key === DOWN_ARROW) { radius = Math.max(5, radius - 1); restart(); }
  if (key === 'g' || key === 'G') showGrid = !showGrid;
  if (key === 's' || key === 'S') saveCanvas('hat', 'png');
}

// ---------- やってみよう ----------
// 1. 左の帽子のカイトを数えよう（8 枚）。13 本の辺の長さは 1 と √3 と 2 の 3 種類
// 2. スペースで何度も探す。裏返しの帽子（青）は、まわりの表の帽子に囲まれてポツンと現れる
// 3. ↑ で大きくすると、行き止まりと戻りが増えて時間がかかる。くり返し模様が作れないことの感覚
// 4. 調べてみよう：裏返しを使わない「スペクター」タイル（2023 年）


// ==================================================
// ここから下は「帽子の道具」（三角格子・カイト・向き）
// （中身は読まなくても OK。消さないでね）
// ==================================================
function hp(x, y) { return [x + 0.5 * y, HR3 * y]; }
function kkey(i, j, k) { return ((i + 60) * 200 + (j + 60)) * 6 + k; }
// 六角形 (i, j) の k 番目のカイト：中心 → 辺の中点 → 頂点 → 辺の中点
function kitePoly(i, j, k) {
  let c = [i * H1[0] + j * H2[0], i * H1[1] + j * H2[1]], s3 = Math.sqrt(3);
  let d = (a, r) => [c[0] + r * Math.cos((a * Math.PI) / 180), c[1] + r * Math.sin((a * Math.PI) / 180)];
  return [c, d(60 * k - 30, s3), d(60 * k, 2), d(60 * k + 30, s3)];
}
function kiteCenter(i, j, k) {
  let p = kitePoly(i, j, k);
  return [(p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4, (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4];
}
// 点に一番近いカイト
function locateKite(p) {
  let det = H1[0] * H2[1] - H1[1] * H2[0];
  let fi = Math.floor((p[0] * H2[1] - p[1] * H2[0]) / det), fj = Math.floor((H1[0] * p[1] - H1[1] * p[0]) / det);
  let best = null, bd = 1e9;
  for (let i = fi - 1; i <= fi + 2; i++) for (let j = fj - 1; j <= fj + 2; j++) for (let k = 0; k < 6; k++) {
    let c = kiteCenter(i, j, k), d = Math.hypot(c[0] - p[0], c[1] - p[1]);
    if (d < bd) { bd = d; best = [i, j, k]; }
  }
  return best;
}
// 裏返し（y → −y）してから 60° × r 回す
function rotRef(p, r, ref) {
  let x = p[0], y = ref ? -p[1] : p[1], a = (r * Math.PI) / 3;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}
function hatPoly(p) {
  let o = orients[p.oi], ox = p.di * H1[0] + p.dj * H2[0], oy = p.di * H1[1] + p.dj * H2[1];
  return HAT.map((v) => { let q = rotRef(v, o.r, o.ref); return [q[0] + ox, q[1] + oy]; });
}
function drawPolyAt(pts, cx, cy, z) {
  beginShape();
  for (let v of pts) vertex(cx + v[0] * z, cy + v[1] * z);
  endShape(CLOSE);
}
function insidePoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    let a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
// 左上：帽子 1 枚と、その中の 8 枚のカイト
function drawSingleHat(cx, cy, z) {
  fill(250, 200, 120);
  stroke(40);
  strokeWeight(3);
  drawPolyAt(HAT, cx, cy, z);
  stroke(120, 100, 80);
  strokeWeight(1);
  noFill();
  for (let [i, j, k] of hatKites) drawPolyAt(kitePoly(i, j, k), cx, cy, z);
  noStroke();
  fill(70);
  textSize(14);
  text('帽子 1 枚 = カイト 8 枚（13 角形）', cx - 60, cy + 3.4 * z);
}
