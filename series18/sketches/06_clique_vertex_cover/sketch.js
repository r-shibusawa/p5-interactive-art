// ============================================
// 06 クリーク ↔ 頂点被覆（補グラフで裏返す）
// 左：グラフ G。右：補グラフ Ḡ（G で線が「ない」所にだけ線を引いたもの）
// C が G のクリーク（全員つながっている）⇔ 残り V − C が Ḡ の頂点被覆（どの線も少なくとも片方の端を含む）
// だから「大きさ k のクリーク」と「大きさ n − k の頂点被覆」は同じ問題（CLIQUE ≤p VERTEX-COVER）
// 点をクリック：C に入れる・外す / 左のグラフで点から点へドラッグ：線をつける・消す
// スペース：最大クリーク（＝最小頂点被覆）を総当たり / R：ランダムなグラフ / C：選択を消す
// ============================================

let N = 8;              // ★ 点の数（総当たりは 2^N 通り）
let P = 0.5;            // ★ R で線を引く確率
let pos = [];           // 円周上の位置（0〜1）
let A = [];             // 隣接行列
let inC = [];
let dragFrom = -1;
let brute = -1, best = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomGraph();
}

function randomGraph() {
  pos = []; A = [];
  for (let i = 0; i < N; i++) { pos.push(TWO_PI * i / N - HALF_PI); A.push(new Array(N).fill(false)); }
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (random() < P) A[i][j] = A[j][i] = true;
  inC = new Array(N).fill(false);
  brute = -1; best = null;
}

function center(side) { return { x: width * (side === 0 ? 0.27 : 0.73), y: height * 0.55, r: min(width * 0.2, height * 0.3) }; }
function xy(side, i) { let c = center(side); return { x: c.x + cos(pos[i]) * c.r, y: c.y + sin(pos[i]) * c.r }; }

function isClique(S) { for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (S[i] && S[j] && !A[i][j]) return false; return true; }
function isCover(S) { for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (!A[i][j] && !S[i] && !S[j]) return false; return true; }

function draw() {
  background(300, 25, 9);
  // 総当たり：1 フレームに数通り
  if (brute >= 0) {
    for (let k = 0; k < 4 && brute < (1 << N); k++, brute++) {
      let S = []; let cnt = 0;
      for (let i = 0; i < N; i++) { S[i] = ((brute >> i) & 1) === 1; if (S[i]) cnt++; }
      if (isClique(S) && (!best || cnt > best.cnt)) best = { S, cnt };
      inC = S;
    }
    if (brute >= (1 << N)) { brute = -1; if (best) inC = best.S.slice(); }
  }
  let cover = inC.map((b) => !b);
  let cq = isClique(inC), cv = isCover(cover);

  for (let side = 0; side < 2; side++) {
    // 線
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      let has = side === 0 ? A[i][j] : !A[i][j];
      if (!has) continue;
      let a = xy(side, i), b = xy(side, j);
      if (side === 0) { let hot = inC[i] && inC[j]; stroke(hot ? color(50, 90, 100) : color(0, 0, 100, 25)); strokeWeight(hot ? 4 : 2); }
      else { let ok = cover[i] || cover[j]; stroke(ok ? color(190, 70, 100, 70) : color(0, 90, 100)); strokeWeight(ok ? 2.5 : 5); }
      line(a.x, a.y, b.x, b.y);
    }
    // 点
    for (let i = 0; i < N; i++) {
      let p = xy(side, i);
      let on = side === 0 ? inC[i] : cover[i];
      noStroke(); fill(side === 0 ? 50 : 190, on ? 85 : 15, on ? 100 : 45);
      circle(p.x, p.y, on ? 44 : 36);
      fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(16); text(i, p.x, p.y);
    }
  }
  if (dragFrom >= 0) { let a = xy(0, dragFrom); stroke(0, 0, 100); strokeWeight(2); line(a.x, a.y, mouseX, mouseY); }

  // 文字
  noStroke(); textAlign(CENTER, BASELINE); textSize(22);
  let k = inC.filter((b) => b).length;
  let c0 = center(0), c1 = center(1);
  fill(50, 80, 100); text('G：C = {' + inC.map((b, i) => (b ? i : null)).filter((v) => v !== null).join(',') + '}', c0.x, c0.y + c0.r + 60);
  fill(190, 70, 100); text('Ḡ：V − C（' + (N - k) + ' 個）', c1.x, c1.y + c1.r + 60);
  textSize(20);
  fill(cq ? color(120, 80, 100) : color(0, 80, 100)); text(cq ? '大きさ ' + k + ' のクリーク ✓' : 'クリークではない ✗', c0.x, c0.y + c0.r + 92);
  fill(cv ? color(120, 80, 100) : color(0, 80, 100)); text(cv ? '大きさ ' + (N - k) + ' の頂点被覆 ✓' : '頂点被覆ではない（赤い線が残る）✗', c1.x, c1.y + c1.r + 92);

  textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('点をクリック：C に入れる／外す　左でドラッグ：線を切り替え　スペース：総当たり　R：ランダム　C：消す', 20, 34);
  fill(0, 0, 65); textSize(16);
  text('✓ と ✗ はいつも同時に変わる。片方を速く解ければもう片方も速く解ける', 20, 62);
  if (brute >= 0) { fill(45, 80, 100); text('総当たり中… ' + brute + ' / ' + (1 << N), 20, 90); }
  else if (best) { fill(45, 80, 100); text('最大クリーク ' + best.cnt + ' 個 ⇔ 最小頂点被覆 ' + (N - best.cnt) + ' 個', 20, 90); }
}

function hit(x, y) {
  for (let side = 0; side < 2; side++) for (let i = 0; i < N; i++) { let p = xy(side, i); if (dist(x, y, p.x, p.y) < 22) return { side, i }; }
  return null;
}
function mousePressed() { let h = hit(mouseX, mouseY); dragFrom = h && h.side === 0 ? h.i : -1; if (h && h.side === 1) { inC[h.i] = !inC[h.i]; best = null; } }
function mouseReleased() {
  if (dragFrom < 0) return;
  let h = hit(mouseX, mouseY);
  if (h && h.side === 0 && h.i === dragFrom) { inC[h.i] = !inC[h.i]; best = null; }
  else if (h && h.side === 0) { A[dragFrom][h.i] = A[h.i][dragFrom] = !A[dragFrom][h.i]; best = null; }
  dragFrom = -1;
}
function keyPressed() {
  if (key === ' ') { brute = 0; best = null; }
  if (key === 'r' || key === 'R') randomGraph();
  if (key === 'c' || key === 'C') { inC = new Array(N).fill(false); best = null; brute = -1; }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 左で 3 人組のクリークを選ぶ。右で残りの点が赤い線を全部消しているか確かめよう
// 2. 全員を選ぶ（C = V）と右はどうなる？ 誰も選ばないと？
// 3. N を 12 にして総当たり。何通り調べる？ 時間は？
