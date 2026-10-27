// ============================================
// 08 部分和問題（SUBSET-SUM）
// 数の集まりから何個か選んで、合計をちょうど t にできる？
// モード 1：表（動的計画法）で解く。手間は「個数 × t」。でも t は桁数に対して指数的に大きくなれる（擬多項式時間）
// モード 2：3-CNF-SAT → 部分和 の還元。式を「桁ごとの数」に変身させる。繰り上がりが起きないよう各桁は小さく保つ
// 1：表で解く  2：還元を見る / スペース：再生・停止 / モード 1：上下キーで t、R で新しい数  モード 2：変数をクリックで真偽
// ============================================

let mode = 1;
// ---- モード 1 ----
let nums = [3, 34, 4, 12, 5, 2];
let target = 9;
let cell = 0, playing = true, pathCells = [];
let tbl = [];
// ---- モード 2 ----
let nV = 3;
let cls = [[1, 2, -3], [-1, 2, 3], [-1, -2, -3], [1, -2, 3]]; // 例：x1, x2, x3 の 4 節
let asg = [true, false, true];
let bruteI = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetDP();
}

function resetDP() {
  tbl = []; cell = 0; pathCells = [];
  for (let i = 0; i <= nums.length; i++) tbl.push(new Array(target + 1).fill(null));
}
function fillOne() { // 1 マス埋める
  let W = target + 1, total = (nums.length + 1) * W;
  if (cell >= total) return false;
  let i = floor(cell / W), s = cell % W;
  if (i === 0) tbl[i][s] = s === 0;
  else tbl[i][s] = tbl[i - 1][s] || (s >= nums[i - 1] && tbl[i - 1][s - nums[i - 1]]);
  cell++;
  if (cell === total && tbl[nums.length][target]) { // 選んだ数をたどる
    let s2 = target;
    for (let r = nums.length; r > 0; r--) {
      if (!tbl[r - 1][s2]) { pathCells.push([r, s2, true]); s2 -= nums[r - 1]; }
      else pathCells.push([r, s2, false]);
    }
  }
  return true;
}

function draw() {
  background(330, 25, 9);
  noStroke(); textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  if (mode === 1) drawDP(); else drawReduction();
}

function drawDP() {
  if (playing) for (let k = 0; k < 3; k++) fillOne();
  text('1：表で解く　2：還元を見る　スペース：再生／停止　上下：t を変える　R：新しい数', 20, 34);
  textSize(22); fill(45, 80, 100);
  text('数 {' + nums.join(', ') + '}　から合計 t = ' + target + ' を作れる？', 20, 72);
  let W = target + 1, H = nums.length + 1;
  let x0 = 110, y0 = 110, cw = min(46, (width - x0 - 30) / W), ch = min(46, (height - y0 - 120) / H);
  textAlign(CENTER, CENTER); textSize(min(14, cw * 0.45));
  for (let s = 0; s < W; s++) { fill(0, 0, 60); text(s, x0 + s * cw + cw / 2, y0 - 12); }
  for (let i = 0; i < H; i++) {
    fill(0, 0, 70); textAlign(RIGHT, CENTER); textSize(15);
    text(i === 0 ? '何も使わない' : '〜' + nums[i - 1] + ' まで', x0 - 8, y0 + i * ch + ch / 2);
    textAlign(CENTER, CENTER); textSize(min(14, cw * 0.45));
    for (let s = 0; s < W; s++) {
      let v = tbl[i][s];
      let onPath = pathCells.find((p) => p[0] === i && p[1] === s);
      fill(v === null ? color(0, 0, 14) : v ? color(150, 70, 80) : color(0, 0, 24));
      if (onPath) fill(onPath[2] ? color(45, 90, 100) : color(190, 60, 90));
      if (i * W + s === cell) fill(0, 0, 100);
      rect(x0 + s * cw + 1, y0 + i * ch + 1, cw - 2, ch - 2, 4);
      if (v !== null && cw > 22) { fill(0, 0, v ? 10 : 50); text(v ? '○' : '×', x0 + s * cw + cw / 2, y0 + i * ch + ch / 2); }
    }
  }
  textAlign(LEFT, BASELINE); textSize(18);
  let y = y0 + H * ch + 40;
  if (cell >= W * H) {
    let ok = tbl[nums.length][target];
    fill(ok ? color(120, 80, 100) : color(0, 80, 100));
    let used = pathCells.filter((p) => p[2]).map((p) => nums[p[0] - 1]);
    text(ok ? 'できる！ ' + used.join(' + ') + ' = ' + target + '（黄色のマスで数を使った）' : 'できない（右下が ×）', 20, y);
  }
  fill(0, 0, 60); textSize(15);
  text('マス (i, s) = 「最初の i 個で合計 s を作れるか」= 上のマス or 上の (s − 数) のマス。手間は ' + H + ' × ' + W + ' = ' + H * W + ' マス', 20, y + 30);
  text('t が 30 桁の数なら表は 10³⁰ 列。入力の長さ（桁数）に対しては多項式ではない → NP 完全と矛盾しない', 20, y + 54);
}

// ---------- モード 2：3-CNF → 部分和 ----------
function rowsOf() {
  let k = cls.length, rows = [];
  for (let i = 1; i <= nV; i++) for (let neg of [false, true]) {
    let d = new Array(nV + k).fill(0);
    d[i - 1] = 1;
    cls.forEach((c, j) => { if (c.includes(neg ? -i : i)) d[nV + j] = 1; });
    rows.push({ name: 'v' + i + (neg ? "'" : ''), d, kind: 'v', i, neg });
  }
  for (let j = 0; j < k; j++) for (let two of [false, true]) {
    let d = new Array(nV + k).fill(0); d[nV + j] = two ? 2 : 1;
    rows.push({ name: 's' + (j + 1) + (two ? "'" : ''), d, kind: 's', j, two });
  }
  return rows;
}
function chooseRows(rows) {
  let pick = rows.map((r) => r.kind === 'v' && asg[r.i - 1] !== r.neg);
  let k = cls.length;
  for (let j = 0; j < k; j++) { // 節の桁を 4 にするよう、おまけの数 s, s' を足す
    let sum = 0; rows.forEach((r, ri) => { if (pick[ri]) sum += r.d[nV + j]; });
    let need = 4 - sum;
    rows.forEach((r, ri) => {
      if (r.kind === 's' && r.j === j) {
        if (need === 3) pick[ri] = true;
        if (need === 2 && r.two) pick[ri] = true;
        if (need === 1 && !r.two) pick[ri] = true;
      }
    });
  }
  return pick;
}
function drawReduction() {
  if (bruteI >= 0 && frameCount % 40 === 0) {
    if (bruteI < (1 << nV)) { for (let i = 0; i < nV; i++) asg[i] = ((bruteI >> (nV - 1 - i)) & 1) === 0; bruteI++; }
    else bruteI = -1;
  }
  text('1：表で解く　2：還元を見る　変数（上の x）をクリックで真偽を切り替え　スペース：全部の割り当てを順に試す', 20, 34);
  let k = cls.length, rows = rowsOf(), pick = chooseRows(rows);
  let x0 = 140, y0 = 150, cw = min(70, (width * 0.6 - x0) / (nV + k)), ch = min(34, (height - 260) / (rows.length + 3));
  // 式
  textSize(20); textFont('monospace');
  let fx = 20;
  cls.forEach((c, j) => {
    let s = 'C' + (j + 1) + '=(' + c.map((l) => (l > 0 ? 'x' : '¬x') + abs(l)).join('∨') + ')  ';
    let sat = c.some((l) => asg[abs(l) - 1] === l > 0);
    fill(sat ? color(130, 60, 95) : color(0, 70, 100)); text(s, fx, 72); fx += textWidth(s);
  });
  textFont('sans-serif');
  // 変数ボタン
  for (let i = 0; i < nV; i++) {
    let bx = 20 + i * 120;
    fill(asg[i] ? color(50, 80, 100) : color(220, 30, 40)); rect(bx, 90, 108, 34, 8);
    fill(asg[i] ? 0 : 100); textAlign(CENTER, CENTER); textSize(17); text('x' + (i + 1) + ' = ' + (asg[i] ? '真' : '偽'), bx + 54, 107);
  }
  // 見出し
  textAlign(CENTER, CENTER); textSize(16);
  let heads = [];
  for (let i = 1; i <= nV; i++) heads.push('x' + i);
  for (let j = 1; j <= k; j++) heads.push('C' + j);
  heads.forEach((h, c) => { fill(c < nV ? color(50, 70, 100) : color(190, 60, 100)); text(h, x0 + c * cw + cw / 2, y0); });
  rows.forEach((r, ri) => {
    let y = y0 + (ri + 1) * ch;
    fill(pick[ri] ? color(45, 70, 40) : color(0, 0, 13)); rect(20, y - ch / 2 + 2, x0 - 30 + (nV + k) * cw + 120, ch - 4, 4);
    fill(pick[ri] ? color(45, 80, 100) : color(0, 0, 70)); textAlign(LEFT, CENTER); textSize(16);
    text(r.name, 30, y);
    textAlign(CENTER, CENTER); textFont('monospace');
    r.d.forEach((v, c) => { fill(v ? color(0, 0, pick[ri] ? 100 : 85) : color(0, 0, 35)); text(v, x0 + c * cw + cw / 2, y); });
    fill(0, 0, 55); textAlign(LEFT, CENTER); text('= ' + r.d.join(''), x0 + (nV + k) * cw + 10, y);
    textFont('sans-serif');
  });
  // 合計と目標
  let sumD = new Array(nV + k).fill(0);
  rows.forEach((r, ri) => { if (pick[ri]) r.d.forEach((v, c) => (sumD[c] += v)); });
  let tD = [...new Array(nV).fill(1), ...new Array(k).fill(4)];
  let yS = y0 + (rows.length + 1.5) * ch, yT = yS + ch;
  textFont('monospace'); textSize(18);
  fill(0, 0, 100); textAlign(LEFT, CENTER); text('選んだ合計', 20, yS); text('目標 t', 20, yT);
  textAlign(CENTER, CENTER);
  sumD.forEach((v, c) => { fill(v === tD[c] ? color(120, 70, 100) : color(0, 80, 100)); text(v, x0 + c * cw + cw / 2, yS); });
  tD.forEach((v, c) => { fill(45, 80, 100); text(v, x0 + c * cw + cw / 2, yT); });
  textFont('sans-serif');
  let ok = sumD.every((v, c) => v === tD[c]);
  // 説明
  let ex = width * 0.66;
  textAlign(LEFT, TOP); textSize(16); fill(0, 0, 85);
  text("・v_i（x_i が真）か v_i'（偽）の\n  どちらか 1 つを選ぶ → x の桁が 1\n・C_j の桁 = その節で真になる文字の数（1〜3）\n・おまけ s=1, s'=2 で 4 にそろえる\n  → 真の文字が 0 個の節は 4 に届かない\n・各桁は最大 6 なので繰り上がりなし\n\n数の個数も桁数も式の大きさに比例\n→ 多項式時間の還元", ex, y0, width - ex - 20);
  textSize(22); fill(ok ? color(120, 80, 100) : color(0, 80, 100));
  text(ok ? '合計 = t ✓  式も真！' : '合計 ≠ t ✗  偽の節がある', ex, y0 + 280);
}

function mousePressed() {
  if (mode === 2) for (let i = 0; i < nV; i++) if (mouseX > 20 + i * 120 && mouseX < 128 + i * 120 && mouseY > 90 && mouseY < 124) { asg[i] = !asg[i]; bruteI = -1; }
}
function keyPressed() {
  if (key === '1') { mode = 1; resetDP(); }
  if (key === '2') mode = 2;
  if (key === ' ') { if (mode === 1) { if (cell >= tbl.length * (target + 1)) resetDP(); playing = !playing; } else bruteI = bruteI >= 0 ? -1 : 0; }
  if (mode === 1 && key === UP_ARROW) { target = min(40, target + 1); resetDP(); }
  if (mode === 1 && key === DOWN_ARROW) { target = max(1, target - 1); resetDP(); }
  if (mode === 1 && (key === 'r' || key === 'R')) { nums = []; for (let i = 0; i < 6; i++) nums.push(floor(random(1, 16))); resetDP(); }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. モード 1 で t を 1 ずつ変え、作れない t を探そう
// 2. モード 2 で全部の節が真になる割り当てを探し、合計が t と一致するのを確かめよう
// 3. cls に節を 1 つ足すと、表の行と桁はいくつ増える？
