// ============================================
// 03 輸送問題 ─ 北西隅法と MODI 法（飛び石法）
// 3 つの工場から 4 つの店へ商品を運ぶ。供給と需要を満たして、運賃の合計を最小にする
//   北西隅法：表の左上から順に詰めて「とりあえずの解」をつくる → MODI 法：まだ使っていないマスの「得になる度合い」を計算し、
//   損しないループ（飛び石）に沿って荷物を付け替える。得になるマスがなくなったら最適
// スペース = 1 ステップ / A = 自動 / R = 新しい問題 / N = 北西隅からやり直し
// ============================================

let m = 3, n = 4;                      // ★ 工場の数・店の数
let cost, supply, demand;
let alloc, basic;                      // 輸送量と「基底」（使っているマス）
let phase = 'nw';                      // 'nw' → 'modi' → 'cycle' → … → 'opt'
let nwI = 0, nwJ = 0, remS, remD;
let u, v, redCost, enter = null, loopCells = [], theta = 0;
let auto = false, iter = 0, costLog = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newProblem();
}

function newProblem() {
  cost = []; for (let i = 0; i < m; i++) { cost.push([]); for (let j = 0; j < n; j++) cost[i].push(floor(random(2, 13))); }   // ★ 1 個あたりの運賃
  demand = []; for (let j = 0; j < n; j++) demand.push(floor(random(4, 13)) * 5);
  let total = demand.reduce((a, b) => a + b, 0);
  supply = []; let left = total;
  for (let i = 0; i < m - 1; i++) { let s = floor(total / m / 5 + random(-2, 3)) * 5; s = constrain(s, 5, left - 5 * (m - 1 - i)); supply.push(s); left -= s; }
  supply.push(left);
  restart();
}
function restart() {
  alloc = []; basic = [];
  for (let i = 0; i < m; i++) { alloc.push(new Array(n).fill(0)); basic.push(new Array(n).fill(false)); }
  phase = 'nw'; nwI = 0; nwJ = 0; remS = supply.slice(); remD = demand.slice();
  enter = null; loopCells = []; iter = 0; costLog = []; redCost = null;
}
function totalCost() { let s = 0; for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) s += alloc[i][j] * cost[i][j]; return s; }

// ★ 北西隅法の 1 マス：供給と需要の小さい方を詰める
function stepNW() {
  let q = min(remS[nwI], remD[nwJ]);
  alloc[nwI][nwJ] = q; basic[nwI][nwJ] = true;
  remS[nwI] -= q; remD[nwJ] -= q;
  if (remS[nwI] === 0 && nwI < m - 1) nwI++;
  else if (nwJ < n - 1) nwJ++;
  else { phase = 'modi'; computeModi(); }
}
// ★ MODI：使っているマスで cost = u_i + v_j となる u, v を決め、他のマスの「得になる度合い」= cost − u − v
function computeModi() {
  u = new Array(m).fill(null); v = new Array(n).fill(null); u[0] = 0;
  for (let rep = 0; rep < m + n; rep++)
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (basic[i][j]) {
      if (u[i] !== null && v[j] === null) v[j] = cost[i][j] - u[i];
      if (v[j] !== null && u[i] === null) u[i] = cost[i][j] - v[j];
    }
  redCost = []; enter = null; let best = -1e-9;
  for (let i = 0; i < m; i++) { redCost.push([]); for (let j = 0; j < n; j++) {
    let r = basic[i][j] ? 0 : cost[i][j] - u[i] - v[j];
    redCost[i].push(r);
    if (!basic[i][j] && r < best) { best = r; enter = [i, j]; }
  } }
  costLog.push(totalCost());
  if (!enter) { phase = 'opt'; auto = false; }
}
// 入るマスから、使っているマスだけを縦横に飛んで戻るループ（飛び石）を探す
function findLoop(ei, ej) {
  // 行 i と列 j を点、使っているマスを辺とみなした木の上で、行 ei → 列 ej の道を幅優先で探す
  let N = m + n, prev = new Array(N).fill(-1), seen = new Array(N).fill(false), q = [ei];
  seen[ei] = true;
  while (q.length) {
    let a = q.shift();
    for (let b = 0; b < N; b++) {
      if (seen[b]) continue;
      let ok = a < m ? (b >= m && basic[a][b - m]) : (b < m && basic[b][a - m]);
      if (ok) { seen[b] = true; prev[b] = a; q.push(b); }
    }
  }
  let path = [], b = m + ej;
  while (b !== ei && b >= 0) { let a = prev[b]; path.push(a < m ? [a, b - m] : [b, a - m]); b = a; }
  path.reverse();
  return [[ei, ej]].concat(path);       // 0 番目が入るマス（+）、あとは − + − … と交互
}
function stepModi() {
  if (phase === 'modi') {
    loopCells = findLoop(enter[0], enter[1]);
    theta = Infinity;
    for (let k = 1; k < loopCells.length; k += 2) theta = min(theta, alloc[loopCells[k][0]][loopCells[k][1]]);
    phase = 'cycle';
  } else if (phase === 'cycle') {
    let leaving = null;
    for (let k = 0; k < loopCells.length; k++) {
      let [i, j] = loopCells[k];
      alloc[i][j] += k % 2 === 0 ? theta : -theta;
      if (k % 2 === 1 && !leaving && alloc[i][j] === 0) leaving = [i, j];
    }
    basic[enter[0]][enter[1]] = true;
    basic[leaving[0]][leaving[1]] = false;
    loopCells = []; iter++;
    phase = 'modi'; computeModi();
  }
}
function stepAll() { if (phase === 'nw') stepNW(); else if (phase !== 'opt') stepModi(); }

function draw() {
  background(225, 30, 12);
  if (auto && frameCount % 40 === 0) stepAll();
  let cw = min(120, (width * 0.55 - 160) / n), chh = min(80, (height - 330) / m);
  let tx = 140, ty = 160;

  // 表
  textAlign(CENTER, CENTER);
  for (let j = 0; j < n; j++) {
    fill(0, 0, 90); textSize(16); text('店 ' + (j + 1), tx + j * cw + cw / 2, ty - 40);
    fill(0, 0, 60); textSize(13); text('需要 ' + demand[j], tx + j * cw + cw / 2, ty - 18);
    if (v && phase !== 'nw') { fill(190, 70, 100); text('v=' + v[j], tx + j * cw + cw / 2, ty + m * chh + 16); }
  }
  for (let i = 0; i < m; i++) {
    fill(0, 0, 90); textSize(16); text('工場 ' + 'ABCDE'[i], tx - 80, ty + i * chh + chh / 2 - 10);
    fill(0, 0, 60); textSize(13); text('供給 ' + supply[i], tx - 80, ty + i * chh + chh / 2 + 12);
    if (u && phase !== 'nw') { fill(190, 70, 100); text('u=' + u[i], tx + n * cw + 34, ty + i * chh + chh / 2); }
  }
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let x = tx + j * cw, y = ty + i * chh;
    let isEnter = enter && enter[0] === i && enter[1] === j && phase !== 'opt';
    stroke(0, 0, 100, 30); strokeWeight(1);
    fill(basic[i][j] ? color(210, 40, 30) : color(225, 25, 17));
    if (phase === 'nw' && i === nwI && j === nwJ) fill(50, 60, 45);
    rect(x, y, cw, chh);
    noStroke(); fill(0, 0, 65); textSize(12); textAlign(LEFT, TOP); text('¥' + cost[i][j], x + 6, y + 5); textAlign(CENTER, CENTER);
    if (basic[i][j]) { fill(0, 0, 100); textSize(22); text(alloc[i][j], x + cw / 2, y + chh / 2 + 4); }
    else if (redCost && phase !== 'nw') {
      fill(redCost[i][j] < 0 ? color(0, 75, 100) : color(140, 50, 80)); textSize(15);
      text((redCost[i][j] > 0 ? '+' : '') + redCost[i][j], x + cw / 2, y + chh / 2 + 4);
    }
    if (isEnter) { noFill(); stroke(0, 80, 100); strokeWeight(3); rect(x + 3, y + 3, cw - 6, chh - 6); }
  }
  // ループ（飛び石）
  if (loopCells.length) {
    noFill(); stroke(50, 90, 100); strokeWeight(3);
    beginShape();
    for (let [i, j] of loopCells) vertex(tx + j * cw + cw / 2, ty + i * chh + chh / 2);
    endShape(CLOSE);
    noStroke();
    loopCells.forEach(([i, j], k) => { fill(k % 2 === 0 ? color(140, 80, 100) : color(0, 80, 100)); circle(tx + j * cw + cw - 16, ty + i * chh + chh - 16, 22); fill(0, 0, 10); textSize(16); text(k % 2 === 0 ? '+' : '−', tx + j * cw + cw - 16, ty + i * chh + chh - 16); });
  }
  textAlign(LEFT, BASELINE);

  // 説明
  let ey = ty + m * chh + 60;
  fill(0, 0, 100); textSize(20);
  text('運賃の合計　¥' + totalCost() + (phase === 'opt' ? '　✓ 最適' : ''), tx - 120, ey);
  fill(0, 0, 70); textSize(15);
  let msg = {
    nw: '北西隅法：黄色のマスに「供給の残り」と「需要の残り」の小さい方を詰めて、右か下へ進む',
    modi: '数字のないマス = 運び始めたら 1 個あたりいくら変わるか（赤 = 得する）。赤い枠のマスを使い始める',
    cycle: 'ループに沿って ＋ と − を交互に θ = ' + theta + ' 個ずつ付け替える（供給・需要の合計は変わらない）',
    opt: 'どのマスを使い始めても運賃は下がらない → 最適。改善 ' + iter + ' 回',
  }[phase];
  text(msg, tx - 120, ey + 30);
  if (phase === 'cycle' && enter) text('1 個あたり ' + redCost[enter[0]][enter[1]] + ' 円 × θ = ' + theta + ' 個 → ' + (redCost[enter[0]][enter[1]] * theta) + ' 円の変化', tx - 120, ey + 56);

  // 右：地図と運賃の推移
  let mx = tx + n * cw + 110, mw = width - mx - 40, mh = (height - 240) * 0.55, my = 140;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (alloc[i][j] > 0) {
    let a = { x: mx + 30, y: my + (i + 0.5) * mh / m }, b = { x: mx + mw - 30, y: my + (j + 0.5) * mh / n };
    stroke(200 + cost[i][j] * 10, 60, 100, 70); strokeWeight(1 + alloc[i][j] / 6);
    line(a.x, a.y, b.x, b.y);
  }
  noStroke(); textAlign(CENTER, CENTER); textSize(13);
  for (let i = 0; i < m; i++) { fill(30, 70, 100); rect(mx + 10, my + (i + 0.5) * mh / m - 18, 40, 36, 6); fill(0, 0, 10); text('ABCDE'[i], mx + 30, my + (i + 0.5) * mh / m); }
  for (let j = 0; j < n; j++) { fill(190, 60, 100); circle(mx + mw - 30, my + (j + 0.5) * mh / n, 38); fill(0, 0, 10); text(j + 1, mx + mw - 30, my + (j + 0.5) * mh / n); }
  textAlign(LEFT, BASELINE);
  let gy = my + mh + 50, gh = height - gy - 40;
  fill(0, 0, 70); textSize(14); text('運賃の合計の推移（MODI の改善ごと）', mx, gy - 10);
  if (costLog.length) {
    let hi = max(costLog), lo = min(costLog) * 0.9;
    stroke(50, 90, 100); strokeWeight(2); noFill();
    beginShape();
    costLog.forEach((c, k) => vertex(mx + k * mw / max(1, costLog.length - 1), gy + gh - (c - lo) / max(1, hi - lo) * gh));
    endShape();
    noStroke(); fill(0, 0, 80);
    costLog.forEach((c, k) => { let x = mx + k * mw / max(1, costLog.length - 1); circle(x, gy + gh - (c - lo) / max(1, hi - lo) * gh, 6); });
  }

  fill(0, 0, 100); textSize(18);
  text('スペース：1 ステップ　A：自動 ' + (auto ? 'ON' : 'off') + '　R：新しい問題　N：北西隅からやり直し', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('表のマス：左上 = 1 個あたりの運賃、真ん中 = 運ぶ個数。地図の線の太さ = 運ぶ量、色 = 運賃（青 安 → 赤 高）', 20, 68);
}

function keyPressed() {
  if (key === ' ') stepAll();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') newProblem();
  if (key === 'n' || key === 'N') restart();
}

// ---------- やってみよう ----------
// 1. 北西隅法の解と最適解で運賃がどれだけ違う？ 北西隅法は運賃を見ていないことに注目
// 2. 「運賃が一番安いマスから詰める」（最小費用法）に stepNW を書きかえると、改善の回数は減る？
// 3. 供給の合計が需要より多いときは「ダミーの店（運賃 0）」を足すとこの方法が使える。n = 5 にして試そう
// 4. ループの + と − で、なぜ供給・需要の合計が変わらないのか説明してみよう
