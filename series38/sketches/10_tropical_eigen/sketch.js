// ============================================
// 10 トロピカル固有値と周期スケジュール（max-plus）
// 工程 i の k+1 回目の開始時刻 x_i(k+1) = max_j (A_ij + x_j(k))：「前の工程が全部終わってから」= max，「所要時間を足す」= +
//   この max-plus 系はやがて周期運転になり、周期 λ = トロピカル固有値 = グラフの「最大平均サイクル重み」
//   λ は Karp のアルゴリズムで O(n·m) で求まる。いちばん遅いループ（クリティカル・サイクル）が全体の速さを決める
// ノードを上下にドラッグ = 所要時間 τ / スペース = 一時停止 / R = リセット / ↑↓ = 再生の速さ
// ============================================

let tau = [1.0, 1.2, 1.5, 1.0, 0.8];                     // ★ 各工程の所要時間
let move = 0.5;                                          // ★ 工程から次の工程へ渡す搬送時間
let arcs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 3], [3, 1]];   // ★ 工程のつながり（j → i：i は j が終わるのを待つ）
let n = 5;
let nodes = [];
let X = [];                // x(0), x(1), … 各回の開始時刻（行 = 回，列 = 工程）
let K = 14;                // 計算する回数
let playing = true, speed = 1, now = 0;
let dragging = -1, dragY = 0, dragT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  for (let i = 0; i < n; i++) nodes.push({ x: width * 0.22 + 170 * Math.cos(TWO_PI * i / n - HALF_PI), y: height * 0.42 + 170 * Math.sin(TWO_PI * i / n - HALF_PI) });
}
// ★ max-plus 行列：A_ij = τ_j + 搬送（j → i の辺があれば），A_ii = τ_i（同じ工程は前の仕事が終わるまで始められない），他は −∞
function matrixA() {
  let A = [];
  for (let i = 0; i < n; i++) { A.push([]); for (let j = 0; j < n; j++) A[i].push(i === j ? tau[i] : -Infinity); }
  for (let [j, i] of arcs) A[i][j] = tau[j] + move;
  return A;
}
function iterate(A) {
  X = [new Array(n).fill(0)];
  for (let k = 0; k < K; k++) {
    let x = X[k], y = [];
    for (let i = 0; i < n; i++) { let m = -Infinity; for (let j = 0; j < n; j++) m = Math.max(m, A[i][j] + x[j]); y.push(m === -Infinity ? x[i] : m); }
    X.push(y);
  }
}
// ★ Karp のアルゴリズム：λ = max_v min_k (D_n(v) − D_k(v)) / (n − k)。D_k(v) = ちょうど k 本の辺で v に着く最大重み
function karp(A) {
  let D = [new Array(n).fill(0)];                                   // 仮の出発点から全ノードへ重み 0 の辺
  for (let k = 1; k <= n; k++) {
    D.push(new Array(n).fill(-Infinity));
    for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) if (A[v][u] > -Infinity && D[k - 1][u] > -Infinity) D[k][v] = Math.max(D[k][v], D[k - 1][u] + A[v][u]);
  }
  let lam = -Infinity;
  for (let v = 0; v < n; v++) {
    if (D[n][v] === -Infinity) continue;
    let m = Infinity;
    for (let k = 0; k < n; k++) if (D[k][v] > -Infinity) m = Math.min(m, (D[n][v] - D[k][v]) / (n - k));
    lam = Math.max(lam, m);
  }
  return lam;
}
// 全部の単純サイクルを列挙して平均重みを計算（小さいグラフ用。Karp の答え合わせ）
function cycles(A) {
  let out = [];
  let dfs = (start, v, path, w) => {
    for (let u = 0; u < n; u++) {
      if (A[u][v] === -Infinity) continue;         // v → u
      if (u === start) out.push({ nodes: path.slice(), mean: (w + A[u][v]) / path.length });
      else if (u > start && !path.includes(u)) dfs(start, u, path.concat([u]), w + A[u][v]);
    }
  };
  for (let s = 0; s < n; s++) dfs(s, s, [s], 0);
  return out;
}

function draw() {
  background(190, 55, 10);
  let A = matrixA();
  iterate(A);
  let lam = karp(A), cyc = cycles(A);
  let crit = cyc.reduce((b, c) => (c.mean > (b ? b.mean : -1) ? c : b), null);
  if (playing) now += 0.016 * speed;
  if (now > X[K][0] + 1) now = 0;

  // グラフ
  for (let [j, i] of arcs) {
    let u = nodes[j], v = nodes[i], ang = atan2(v.y - u.y, v.x - u.x);
    let onCrit = crit && crit.nodes.length > 1 && crit.nodes.includes(i) && crit.nodes.includes(j) && (crit.nodes[(crit.nodes.indexOf(j) + 1) % crit.nodes.length] === i);
    stroke(onCrit ? 330 : 0, onCrit ? 80 : 0, 100, onCrit ? 100 : 35); strokeWeight(onCrit ? 5 : 2);
    let o = (arcs.some(([a, b]) => a === i && b === j)) ? 8 : 0;   // 往復の辺は少しずらす
    let nx = -sin(ang) * o, ny = cos(ang) * o;
    line(u.x + nx, u.y + ny, v.x - 24 * cos(ang) + nx, v.y - 24 * sin(ang) + ny);
    noStroke(); fill(onCrit ? 330 : 0, onCrit ? 80 : 0, 100, onCrit ? 100 : 35);
    push(); translate(v.x - 24 * cos(ang) + nx, v.y - 24 * sin(ang) + ny); rotate(ang); triangle(0, 0, -12, 6, -12, -6); pop();
  }
  for (let i = 0; i < n; i++) {
    // いま稼働中？（最新の開始時刻から τ の間）
    let active = X.some((x) => now >= x[i] && now < x[i] + tau[i]);
    let selfCrit = crit && crit.nodes.length === 1 && crit.nodes[0] === i;
    stroke(selfCrit ? 330 : 0, selfCrit ? 80 : 0, selfCrit ? 100 : 10); strokeWeight(selfCrit ? 5 : 2); fill(35, active ? 95 : 25, active ? 100 : 60);
    circle(nodes[i].x, nodes[i].y, 48);
    noStroke(); fill(0, 0, 10); textSize(16); textAlign(CENTER, CENTER); text(i, nodes[i].x, nodes[i].y - 8); textSize(12); text('τ=' + nf(tau[i], 1, 1), nodes[i].x, nodes[i].y + 10); textAlign(LEFT, BASELINE);
  }

  // ダイヤ（タイムライン）
  let tx = width * 0.46, ty = 150, tw = width - tx - 40, rowH = 44, tmax = X[K][0] + 1;
  let sx = (t) => tx + t / tmax * tw;
  noStroke(); fill(0, 0, 100, 6); rect(tx - 10, ty - 30, tw + 20, rowH * n + 40, 12);
  for (let i = 0; i < n; i++) {
    let y = ty + i * rowH;
    fill(0, 0, 60); textSize(13); text('工程 ' + i, tx - 10, y - 14);
    stroke(0, 0, 100, 20); strokeWeight(1); line(tx, y, tx + tw, y);
    for (let k = 0; k <= K; k++) {
      let t0 = X[k][i];
      noStroke(); fill(35, 80, 100, 70); rect(sx(t0), y - 12, Math.max(2, tau[i] / tmax * tw), 24, 3);
      if (k >= 1 && k <= K) { fill(0, 0, 100); textSize(10); text(k, sx(t0) + 2, y - 15); }
    }
  }
  stroke(90, 90, 100); strokeWeight(2); line(sx(now), ty - 30, sx(now), ty + rowH * n + 10);
  noStroke(); fill(90, 90, 100); textSize(13); text('いま t = ' + nf(now, 1, 1), sx(now) + 6, ty - 18);
  // 周期の測定：最後の 6 回の平均間隔（差は 1.5, 2.0, 1.7 … のように「サイクル長」で一周することがあるので平均する）
  let per = (X[K][0] - X[K - 6][0]) / 6;
  let diffs = [X[K - 2][0] - X[K - 3][0], X[K - 1][0] - X[K - 2][0], X[K][0] - X[K - 1][0]].map((v) => nf(v, 1, 2)).join(', ');
  fill(0, 0, 100); textSize(18);
  text('工程 0 の間隔（最後の 6 回の平均）= ' + nf(per, 1, 3) + '　　固有値 λ（Karp）= ' + nf(lam, 1, 3) + '　（直近の間隔：' + diffs + '）', tx, ty + rowH * n + 40);
  fill(330, 70, 100); textSize(15);
  text('クリティカル・サイクル：' + (crit ? crit.nodes.join(' → ') + ' → ' + crit.nodes[0] + '　平均 = ' + nf(crit.mean, 1, 3) : '—'), tx, ty + rowH * n + 66);
  fill(0, 0, 65); textSize(13);
  cyc.sort((a, b) => b.mean - a.mean).slice(0, 6).forEach((c, idx) => text('サイクル ' + c.nodes.join('→') + '：重み合計 ' + nf(c.mean * c.nodes.length, 1, 1) + ' / 長さ ' + c.nodes.length + ' = ' + nf(c.mean, 1, 3), tx, ty + rowH * n + 92 + idx * 20));

  noStroke(); fill(0, 0, 100); textSize(18);
  text('ノードを上下にドラッグ：所要時間 τ　スペース：' + (playing ? '一時停止' : '再生') + '　↑↓：速さ ×' + nf(speed, 1, 1) + '　R：リセット', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('x_i(k+1) = max_j (A_ij + x_j(k))，A_ij = τ_j + 搬送 ' + nf(move, 1, 1) + '（j → i の辺），A_ii = τ_i。右の帯 = 各工程の k 回目の稼働。やがて等間隔 = 周期 λ', 20, 62);
  text('λ = 最大平均サイクル重み = (サイクルの τ の和) / (サイクルの長さ) の最大。ピンクのサイクルを速くしないと全体は速くならない', 20, height - 24);
}

function mousePressed() {
  dragging = -1;
  for (let i = 0; i < n; i++) if (dist(mouseX, mouseY, nodes[i].x, nodes[i].y) < 26) { dragging = i; dragY = mouseY; dragT = tau[i]; }
}
function mouseDragged() { if (dragging >= 0) tau[dragging] = constrain(dragT + (dragY - mouseY) * 0.01, 0.2, 5); }
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === ' ') playing = !playing;
  if (key === UP_ARROW) speed = Math.min(8, speed * 1.5);
  if (key === DOWN_ARROW) speed = Math.max(0.25, speed / 1.5);
  if (key === 'r' || key === 'R') { tau = [1.0, 1.2, 1.5, 1.0, 0.8]; now = 0; }
}

// ---------- やってみよう ----------
// 1. ピンク（クリティカル）でない工程の τ を長くしても周期が変わらない範囲がある。どこまで？
// 2. 直近の間隔が 1.5, 2.0, 1.7 … と一定でないのに平均は λ。何回で一周する？（クリティカル・サイクルの長さ = cyclicity）
// 3. 辺を 1 本足して（arcs に [2, 0] など）サイクルを増やすと λ はどうなる？ 必ず増える？ 搬送時間 move を 0 にすると、いちばん遅い工程 1 つが周期を決める
// 4. 電車のダイヤ：工程 = 駅，τ = 区間の走行時間，辺 = 接続。「全線の最小運転間隔」が λ になる（オランダの鉄道で実際に使われた）
