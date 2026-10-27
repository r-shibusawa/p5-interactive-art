// ============================================
// 06 なぜ「フィボナッチ」？ ─ 次数の上限
// 連鎖的な切り取りのおかげで、次数 k の木はどんなにやせても F(k+2) 個以上の節点を持つ
// F(k+2) ≥ φ^k なので、n 個の節点なら次数は log_φ n 以下。EXTRACT-MIN が O(log n) になる理由
// 左：印の規則ありの一番やせた木 / 右：規則なし（子を何人でも失える）の一番やせた木
// ←→ で次数 k / スペースで自動 / H でヒープ比較表の表示切りかえ
// ============================================

let K = 4;            // ★ 次数
let KMAX = 9;
let auto = false, timer = 0;
let pos = {};
let showTable = true;
const PHI = (1 + Math.sqrt(5)) / 2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// 一番やせた次数 k の木：子の次数は 0, 0, 1, 2, …, k−2（i 番目の子は次数 ≥ i−2）
function minimal(k, id) {
  let kids = [];
  if (k >= 1) kids.push(minimal(0, id + 'a'));
  for (let i = 0; i <= k - 2; i++) kids.push(minimal(i, id + String.fromCharCode(98 + i)));
  return { id, kids };
}
function star(k, id) { let kids = []; for (let i = 0; i < k; i++) kids.push({ id: id + i, kids: [] }); return { id, kids }; }
function treeSize(n) { return 1 + n.kids.reduce((s, c) => s + treeSize(c), 0); }
function leaves(n) { return n.kids.length ? n.kids.reduce((s, c) => s + leaves(c), 0) : 1; }
function depthOf(n) { return n.kids.length ? 1 + max(...n.kids.map(depthOf)) : 0; }
function fib(n) { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; }

function place(root, x0, x1, y0, y1, out, edges) {
  let u = min(40, (x1 - x0) / leaves(root));
  let LH = min(70, (y1 - y0) / max(1, depthOf(root)));
  let left = (x0 + x1) / 2 - (leaves(root) * u) / 2;
  (function rec(n, l, d) {
    let cx;
    if (!n.kids.length) cx = l + u / 2;
    else {
      let cs = [];
      for (let c of n.kids) { cs.push(rec(c, l, d + 1)); l += leaves(c) * u; edges.push([n.id, c.id]); }
      cx = (cs[0] + cs[cs.length - 1]) / 2;
    }
    out[n.id] = { x: cx, y: y0 + d * LH, d };
    return cx;
  })(root, left, 0);
  return u;
}

function draw() {
  background(45, 25, 9);
  if (auto) { timer += deltaTime / 1000; if (timer > 1.4) { timer = 0; K = (K + 1) % (KMAX + 1); } }
  let tableW = showTable ? 400 : 0;
  let midX = (width - tableW) * 0.62;
  let A = minimal(K, 'S'), B = star(K, 'T');
  let tg = {}, edges = [];
  let u1 = place(A, 30, midX - 20, 170, height * 0.58, tg, edges);
  let u2 = place(B, midX + 20, width - tableW - 30, 170, height * 0.58, tg, edges);
  for (let id in tg) {
    if (!pos[id]) {
      let par = id.slice(0, -1);
      pos[id] = pos[par] ? { ...pos[par] } : { ...tg[id] };
    }
    pos[id].x = lerp(pos[id].x, tg[id].x, 0.12); pos[id].y = lerp(pos[id].y, tg[id].y, 0.12);
  }
  for (let id in pos) if (!tg[id]) delete pos[id];

  stroke(45, 20, 50); strokeWeight(1.5);
  for (let [a, b] of edges) line(pos[a].x, pos[a].y, pos[b].x, pos[b].y);
  noStroke();
  for (let id in tg) {
    let isA = id[0] === 'S';
    fill(isA ? color(45 + tg[id].d * 25, 70, 95) : color(200, 40, 70));
    circle(pos[id].x, pos[id].y, constrain((isA ? u1 : u2) * 0.6, 6, 22));
  }
  textAlign(CENTER, TOP);
  fill(45, 60, 100); textSize(18);
  text(`印の規則あり：次数 ${K} の一番やせた木 = ${treeSize(A)} 個 = F(${K + 2})`, (30 + midX) / 2, 120);
  fill(200, 40, 90);
  text(`規則なし：次数 ${K} でも ${treeSize(B)} 個だけ`, (midX + width - tableW) / 2, 120);

  // 棒グラフ：F(k+2) と k+1 と φ^k
  let gx = 60, gy = height - 80, gw = width - tableW - 120, gh = height * 0.26;
  let maxV = fib(KMAX + 2);
  stroke(45, 15, 40); line(gx, gy, gx + gw, gy);
  noStroke();
  let bw = gw / (KMAX + 1);
  for (let k = 0; k <= KMAX; k++) {
    let f = fib(k + 2), h1 = (f / maxV) * gh, h2 = ((k + 1) / maxV) * gh;
    fill(k === K ? color(45, 90, 100) : color(45, 60, 60)); rect(gx + k * bw + 4, gy - h1, bw * 0.45, h1, 3);
    fill(k === K ? color(200, 60, 100) : color(200, 40, 55)); rect(gx + k * bw + 4 + bw * 0.47, gy - h2, bw * 0.3, h2, 3);
    fill(0, 0, 80); textAlign(CENTER, TOP); textSize(12); text(k, gx + k * bw + bw * 0.4, gy + 6);
    textSize(11); fill(45, 60, 95); text(f, gx + k * bw + 4 + bw * 0.22, gy - h1 - 16);
  }
  noFill(); stroke(0, 0, 100, 70); strokeWeight(2); beginShape();
  for (let t = 0; t <= KMAX; t += 0.1) vertex(gx + t * bw + bw * 0.25, gy - (pow(PHI, t) / maxV) * gh);
  endShape();
  noStroke(); fill(0, 0, 85); textAlign(LEFT, TOP); textSize(13);
  text('黄 = F(k+2)（規則あり）  青 = k+1（規則なし）  白線 = φ^k', gx, gy - gh - 30);

  // 説明
  textAlign(LEFT, TOP); fill(0, 0, 100); textSize(26);
  text('次数の上限とフィボナッチ数', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`サイズ s_k = 2 + s_0 + s_1 + … + s_(k−2) = F(k+2) ≥ φ^k（φ ≈ 1.618）→ n 個なら次数 ≤ log_φ n。n = 100 万でも次数は ${floor(log(1e6) / log(PHI))} 以下`, 24, 56);
  text('規則がないと次数 k の木が k+1 個しかなく、根のリストに次数の大きい木があふれて EXTRACT-MIN が遅くなる', 24, 80);

  if (showTable) {
    let tx = width - 390, ty = 120;
    fill(45, 15, 15); rect(tx - 10, ty - 10, 385, 380, 10);
    fill(0, 0, 100); textSize(16); text('マージ可能ヒープの比較（最悪 / 償却）', tx, ty);
    let rows = [['操作', '2分', '二項', 'Fib*'], ['MAKE-HEAP', '1', '1', '1'], ['INSERT', 'lg n', 'lg n', '1'], ['MINIMUM', '1', 'lg n', '1'], ['EXTRACT-MIN', 'lg n', 'lg n', 'lg n'], ['UNION', 'n', 'lg n', '1'], ['DECREASE-KEY', 'lg n', 'lg n', '1'], ['DELETE', 'lg n', 'lg n', 'lg n']];
    rows.forEach((r, j) => {
      let y = ty + 34 + j * 32;
      r.forEach((c, i) => {
        fill(j === 0 ? color(45, 50, 90) : i === 3 ? color(45, 70, 100) : color(0, 0, 85));
        textSize(j === 0 ? 13 : 14);
        text(c, tx + [0, 150, 220, 300][i], y);
      });
    });
    fill(0, 0, 70); textSize(12);
    text('* 償却コスト。すべて Θ(…) または O(…)\nダイクストラ法：2分ヒープ O((V+E) lg V)\n→ フィボナッチヒープ O(V lg V + E)', tx, ty + 300);
  }
  fill(0, 0, 60); textSize(14); textAlign(LEFT, TOP);
  text('←→ = 次数 k / スペース = 自動 / H = 比較表', 24, height - 30);
}

function keyPressed() {
  if (key === 'ArrowRight') K = min(KMAX, K + 1);
  if (key === 'ArrowLeft') K = max(0, K - 1);
  if (key === ' ') { auto = !auto; return false; }
  if (key === 'h' || key === 'H') showTable = !showTable;
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
