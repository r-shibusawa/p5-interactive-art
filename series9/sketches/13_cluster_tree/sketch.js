// ============================================
// 13 クラスタの木（H0 のパーシステンス = 階層的クラスタリング）
// 近い点どうしから順に合体させていく記録を「木（デンドログラム）」にする
// 木をどの高さで切るかで、クラスタの数が決まる。長い枝 = はっきり分かれたグループ
// マウス上下 = 切る高さ / 1〜3 でデータ / クリックで作り直す
// ============================================

let pts = [];
let merges = []; // {a, b, d}：合体の記録（距離順）
let cutD = 60;
let kind = 1;
let seed = 1;
let names = ['', '3 つの塊', '2 つの塊（近い）', 'ランダム'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makePoints();
}

function makePoints() {
  randomSeed(seed);
  pts = [];
  let cx = width * 0.3, cy = height * 0.55, R = min(width, height) * 0.2;
  for (let i = 0; i < 40; i++) {
    let x, y;
    if (kind === 1) { let k = i % 3, a = (TWO_PI * k) / 3; x = cx + cos(a) * R + randomGaussian() * 22; y = cy + sin(a) * R + randomGaussian() * 22; }
    else if (kind === 2) { let s = i % 2 ? 1 : -1; x = cx + s * R * 0.5 + randomGaussian() * 25; y = cy + randomGaussian() * 25; }
    else { x = cx + random(-R * 1.3, R * 1.3); y = cy + random(-R * 1.3, R * 1.3); }
    pts.push({ x, y });
  }
  // ★ 単連結法：全ペアを距離順に並べ、別のグループなら合体（= H0 の死）
  let pairs = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) pairs.push({ i, j, d: dist(pts[i].x, pts[i].y, pts[j].x, pts[j].y) });
  pairs.sort((a, b) => a.d - b.d);
  let parent = pts.map((_, i) => i);
  let find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  merges = [];
  for (let p of pairs) {
    let a = find(p.i), b = find(p.j);
    if (a !== b) { parent[a] = b; merges.push({ a: p.i, b: p.j, d: p.d }); }
  }
}

// 切る高さ cutD でのクラスタ
function clustersAt(D) {
  let parent = pts.map((_, i) => i);
  let find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let m of merges) if (m.d < D) parent[find(m.a)] = find(m.b);
  let ids = {}, k = 0;
  return pts.map((_, i) => { let r = find(i); if (ids[r] === undefined) ids[r] = k++; return ids[r]; });
}

function draw() {
  background(230, 40, 10);
  cutD = map(mouseY, 0, height, 250, 5, true);
  let cl = clustersAt(cutD);
  let nCl = new Set(cl).size;

  // 左：点（クラスタで色分け）
  noStroke();
  for (let i = 0; i < pts.length; i++) { fill((cl[i] * 47) % 360, 70, 100); circle(pts[i].x, pts[i].y, 10); }

  // 右：デンドログラム風（H0 バーコードとして描く：各合体 = 1 本の棒が終わる）
  let bx = width * 0.6, bw = width - bx - 50, by = 120, bh = height - 220;
  stroke(0, 0, 30);
  line(bx, by + bh, bx + bw, by + bh);
  // 棒：i 番目の点の「塊」が消える距離 = i を含む合体のうち最初のもの…簡略化して、合体距離を降順に棒として描く
  let ds = merges.map((m) => m.d).sort((a, b) => a - b);
  for (let k = 0; k < ds.length; k++) {
    let y = by + (k / ds.length) * bh;
    stroke(ds[k] < cutD ? 0 : 200, ds[k] < cutD ? 0 : 80, ds[k] < cutD ? 45 : 100);
    strokeWeight(max(2, bh / ds.length - 3));
    line(bx, y, bx + (min(ds[k], 250) / 250) * bw, y);
  }
  stroke(45, 90, 100);
  strokeWeight(2);
  line(bx + (cutD / 250) * bw, by, bx + (cutD / 250) * bw, by + bh);
  noStroke();
  fill(0, 0, 60);
  textSize(13);
  text('H0 の棒（短い順）：棒の長さ = その塊が合体するまでの距離。黄の線より長い棒の数 + 1 = クラスタ数', bx, by - 12);

  fill(0, 0, 100);
  textSize(18);
  text('切る高さ ' + round(cutD) + '（マウス上下）　→ クラスタ ' + nCl + ' 個　データ：' + names[kind] + '（1〜3）　クリックで作り直す', 20, 40);
  fill(0, 0, 60);
  textSize(15);
  text('棒の長さに大きな「ギャップ」があるところが、自然な切り方。3 つの塊なら、長い棒が 2 本だけ飛び出す', 20, 68);
}

function keyPressed() { if (key >= '1' && key <= '3') { kind = int(key); makePoints(); } }
function mousePressed() { seed = floor(random(10000)); makePoints(); }

// ---------- やってみよう ----------
// 1. 3 つの塊で、クラスタ数が 3 になる高さの範囲は広い？（安定 = 本物のクラスタ）
// 2. ランダム（3）だと、どの高さでも「それらしい」クラスタ数がない
// 3. 「平均連結法」（グループの平均距離で合体）にすると結果は変わる？
