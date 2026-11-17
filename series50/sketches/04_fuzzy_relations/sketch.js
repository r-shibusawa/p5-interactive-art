// ============================================
// 04 ファジィ関係と合成
// ファジィ関係 R(x, y) =「x と y がどのくらい関係があるか」（0〜1 の行列）
// max-min 合成：(R∘S)(x, z) = max_y min(R(x, y), S(y, z))。「x → y → z」の道のうち、いちばん太い道の細いところ
// 1 = 合成のアニメ / 2 = 「似ている」関係の推移閉包 / スペース = 1 歩 / A = 自動 / セルをクリック = +0.1 / ↑↓ = α
// ============================================

let page = 1, auto = true, timer = 0;
let speed = 6;       // ★ 1 秒に何歩すすむか
// ★ 合成する 2 つの関係（行 = x、列 = y）と（行 = y、列 = z）
let R = [[0.7, 0.5, 0.2, 0.0], [0.8, 0.4, 0.9, 0.3], [0.1, 0.6, 0.3, 1.0]];
let Q = [[0.9, 0.6, 0.5], [0.1, 0.7, 0.5], [0.4, 0.3, 0.8], [0.6, 0.2, 0.7]];
let T, ci = 0, ck = 0, cj = 0;
// ★ 「似ている」関係（反射的：自分とは 1、対称的：R(a, b) = R(b, a)）
const COLS = ['赤', '橙', '黄', '緑', '青'];
let SIM = [[1, 0.8, 0.3, 0, 0], [0.8, 1, 0.7, 0.1, 0], [0.3, 0.7, 1, 0.5, 0.1], [0, 0.1, 0.5, 1, 0.6], [0, 0, 0.1, 0.6, 1]];
let closure = [], alphaLv = 0.6;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  selfTest();
  restart();
}
function restart() {
  T = R.map(() => Q[0].map(() => null)); ci = ck = cj = 0;
  closure = [SIM.map((r) => r.slice())];
}
// 合成のアニメを 1 歩：y（j）を 1 つ進め、全部見たら次のセルへ
function stepComp() {
  if (ci >= R.length) { restart(); return; }
  cj++;
  if (cj >= Q.length) { T[ci][ck] = maxMinCell(R, Q, ci, ck); cj = 0; ck++; if (ck >= Q[0].length) { ck = 0; ci++; } }
}
function stepClosure() {
  let C = closure[closure.length - 1], N = maxOf(C, maxMin(C, C));
  if (!sameM(N, C)) closure.push(N);
}

function draw() {
  background(250, 18, 14);
  if (auto) { timer += (page === 1 ? speed : 0.7) / 60; if (timer >= 1) { timer = 0; if (page === 1) stepComp(); else stepClosure(); } }
  fill(0, 0, 95); noStroke(); textSize(18);
  text('1：合成のアニメ　2：推移閉包（いま ' + page + '）　スペース：1 歩　A：自動 ' + (auto ? 'ON' : 'off') + '　セルをクリック：+0.1　↑↓：α = ' + alphaLv.toFixed(1), 20, 36);
  fill(0, 0, 70); textSize(15);
  text(page === 1 ? '(R∘S)(x, z) = max_y min(R(x, y), S(y, z))：x から z への道を全部くらべて、いちばん「太い」道の、いちばん細いところ'
    : '「似ている」は反射的・対称的だが推移的とは限らない（赤〜橙 0.8、橙〜黄 0.7 なのに 赤〜黄 0.3）。R ← max(R, R∘R) をくり返して推移的にする', 20, 62);
  if (page === 1) drawComp(); else drawClosure();
  fill(selfTestResults.every((r) => r.ok) ? color(160, 50, 90) : color(0, 80, 100)); textSize(14);
  text(selfTestLine(), 20, height - 20);
}

function drawComp() {
  let cs = Math.min(70, width / 16, height / 12), y0 = 150;
  let xR = 80, xS = xR + cs * 4 + 80, xT = xS + cs * 3 + 80;
  let done = ci >= R.length;
  drawMat(R, xR, y0, cs, 'R（x → y）', 'x', 'y', (i, j) => !done && i === ci && j <= cj);
  drawMat(Q, xS, y0, cs, 'S（y → z）', 'y', 'z', (j, k) => !done && k === ck && j <= cj);
  drawMat(T, xT, y0, cs, 'R∘S（x → z）', 'x', 'z', (i, k) => !done && i === ci && k === ck);
  // 今のセルの計算
  if (!done) {
    let bx = 80, by = y0 + cs * 4 + 70, best = -1;
    fill(0, 0, 95); textSize(18); text('(R∘S)(x' + (ci + 1) + ', z' + (ck + 1) + ') = max(', bx, by);
    for (let j = 0; j <= cj; j++) best = Math.max(best, Math.min(R[ci][j], Q[j][ck]));
    for (let j = 0; j < Q.length; j++) {
      let yy = by + 30 + j * 34, m = Math.min(R[ci][j], Q[j][ck]), seen = j <= cj;
      fill(seen ? color(0, 0, 90) : color(0, 0, 40)); textSize(16);
      text('y' + (j + 1) + '：min(' + R[ci][j].toFixed(1) + ', ' + Q[j][ck].toFixed(1) + ') = ' + (seen ? m.toFixed(1) : '?'), bx + 20, yy);
      if (seen) { fill(seen && m === best ? color(20, 45, 100) : color(175, 60, 80)); rect(bx + 260, yy - 14, m * 240, 16, 3); }
    }
    fill(20, 45, 100); textSize(18); text(') = ' + (cj === Q.length - 1 ? best.toFixed(1) : '…（いまの最大 ' + best.toFixed(1) + '）'), bx, by + 30 + Q.length * 34 + 10);
  } else { fill(20, 45, 100); textSize(18); text('完成！ スペースでもう一度', 80, y0 + cs * 4 + 70); }
}

function drawClosure() {
  let cs = Math.min(64, width / 18), y0 = 150, last = closure[closure.length - 1];
  drawMat(SIM, 80, y0, cs, 'もとの「似ている」R', '', '', () => false, COLS);
  drawMat(last, 80 + cs * 5 + 120, y0, cs, '推移閉包（' + (closure.length - 1) + ' 回くり返し）', '', '', (i, j) => last[i][j] > SIM[i][j] + 1e-9, COLS);
  let trans = leq(maxMin(last, last), last);
  let tx = 80 + cs * 10 + 220;
  fill(0, 0, 95); textSize(16);
  text('推移的？（R∘R ≤ R）　もと：' + (leq(maxMin(SIM, SIM), SIM) ? 'はい' : 'いいえ') + '　閉包：' + (trans ? 'はい' : 'まだ'), tx, y0 + 10, width - tx - 20);
  text('ふちが光るセル = くり返しで大きくなったところ', tx, y0 + 60, width - tx - 20);
  // α カットで仲間分け（閉包は類似関係なので、α カットは同値関係になる）
  let groups = classesAt(last, alphaLv);
  fill(0, 0, 95); textSize(18); text('α = ' + alphaLv.toFixed(1) + ' で仲間分け（閉包の α カット）', 80, y0 + cs * 5 + 90);
  let gx = 80;
  groups.forEach((g, n) => {
    let w = g.length * 60 + 30;
    fill(260, 30, 90, 25); stroke(260, 30, 90); strokeWeight(2); rect(gx, y0 + cs * 5 + 110, w, 60, 12);
    noStroke(); g.forEach((m, q) => { fill([0, 30, 55, 120, 220][m], 70, 95); circle(gx + 30 + q * 60, y0 + cs * 5 + 140, 36); fill(0, 0, 10); textSize(14); textAlign(CENTER); text(COLS[m], gx + 30 + q * 60, y0 + cs * 5 + 145); textAlign(LEFT, BASELINE); });
    gx += w + 20;
  });
  fill(0, 0, 70); textSize(15); text('↑↓ で α を変えると、仲間がまとまったり分かれたりする（α が大きいほど細かく分かれる）', 80, y0 + cs * 5 + 210);
}

// 行列を描く。hl(i, j) が true のセルは光る
function drawMat(A, x0, y0, cs, title, rn, cn, hl, names) {
  fill(0, 0, 85); noStroke(); textSize(16); text(title, x0, y0 - 30);
  for (let i = 0; i < A.length; i++) {
    fill(0, 0, 60); textSize(13); text(names ? names[i] : rn + (i + 1), x0 - 30, y0 + i * cs + cs / 2 + 4);
    for (let j = 0; j < A[0].length; j++) {
      if (i === 0) { fill(0, 0, 60); text(names ? names[j] : cn + (j + 1), x0 + j * cs + cs / 2 - 8, y0 - 8); }
      let v = A[i][j];
      fill(v === null ? color(0, 0, 20) : color(20, 45 * v + 5, 20 + 80 * v));
      if (hl(i, j)) { stroke(175, 60, 90); strokeWeight(3); } else { stroke(250, 18, 14); strokeWeight(2); }
      rect(x0 + j * cs, y0 + i * cs, cs, cs, 4);
      noStroke(); fill(0, 0, v !== null && v > 0.6 ? 10 : 95); textSize(14); textAlign(CENTER);
      text(v === null ? '?' : v.toFixed(1), x0 + j * cs + cs / 2, y0 + i * cs + cs / 2 + 5);
      textAlign(LEFT, BASELINE);
    }
  }
}

function mousePressed() {
  let hit = (A, x0, y0, cs) => { let j = Math.floor((mouseX - x0) / cs), i = Math.floor((mouseY - y0) / cs); return i >= 0 && j >= 0 && i < A.length && j < A[0].length ? [i, j] : null; };
  let bump = (v) => (Math.round(v * 10) + 1) % 11 / 10;
  if (page === 1) {
    let cs = Math.min(70, width / 16, height / 12), xS = 80 + cs * 4 + 80;
    let h = hit(R, 80, 150, cs); if (h) { R[h[0]][h[1]] = bump(R[h[0]][h[1]]); restart(); }
    h = hit(Q, xS, 150, cs); if (h) { Q[h[0]][h[1]] = bump(Q[h[0]][h[1]]); restart(); }
  } else {
    let cs = Math.min(64, width / 18), h = hit(SIM, 80, 150, cs);
    if (h && h[0] !== h[1]) { let v = bump(SIM[h[0]][h[1]]); SIM[h[0]][h[1]] = v; SIM[h[1]][h[0]] = v; restart(); }
  }
}
function keyPressed() {
  if (key === '1') { page = 1; restart(); }
  if (key === '2') { page = 2; restart(); }
  if (key === ' ') { if (page === 1) stepComp(); else stepClosure(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === UP_ARROW) alphaLv = clampv(Math.round(alphaLv * 10 + 1) / 10, 0.1, 1);
  if (key === DOWN_ARROW) alphaLv = clampv(Math.round(alphaLv * 10 - 1) / 10, 0.1, 1);
}

// ---- 自己テスト：手で計算できる値と比べる
function selfTest() {
  selfTestResults = [];
  let C = maxMin([[0.7, 0.5], [0.8, 0.4]], [[0.9, 0.6, 0.5], [0.1, 0.7, 0.5]]);
  check('手計算の合成 [[0.7, 0.5], [0.8, 0.4]]∘[[0.9, 0.6, 0.5], [0.1, 0.7, 0.5]] = [[0.7, 0.6, 0.5], [0.8, 0.6, 0.5]]', sameM(C, [[0.7, 0.6, 0.5], [0.8, 0.6, 0.5]]));
  let I = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  check('単位関係 I との合成は変わらない R∘I = R', sameM(maxMin(R, I), R));
  check('結合法則 (R∘S)∘S′ = R∘(S∘S′)', sameM(maxMin(maxMin(R, Q), [[0.2, 0.9], [0.5, 0.4], [1, 0.3]]), maxMin(R, maxMin(Q, [[0.2, 0.9], [0.5, 0.4], [1, 0.3]]))));
  let c3 = transClosure([[1, 0.8, 0], [0.8, 1, 0.4], [0, 0.4, 1]]);
  check('3 つの閉包：(1, 3) = min(0.8, 0.4) = 0.4', sameM(c3, [[1, 0.8, 0.4], [0.8, 1, 0.4], [0.4, 0.4, 1]]));
  let cl = transClosure(SIM);
  check('閉包は推移的（C∘C ≤ C）で、もとの R 以上', leq(maxMin(cl, cl), cl) && leq(SIM, cl));
  check('閉包の閉包は同じ（もう変わらない）', sameM(transClosure(cl), cl));
  let g = classesAt(c3, 0.5);
  check('3 つの閉包の 0.5 カットの仲間分け = {1, 2}, {3}', g.length === 2 && g[0].join() === '0,1' && g[1].join() === '2');
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. R のセルをクリックして 0 にすると、合成のどのセルが変わる？「道」が 1 本消えるから
// 2. 合成の 1 つのセルで、どの y を通る道が答えを決めたか（オレンジの棒）を読もう
// 3. 推移閉包で、赤〜青の「似ている度」はいくつになった？ どの色を通る道？
// 4. α を 0.1〜1 まで動かすと、5 つの色の仲間分けが木のように分かれていく（階層クラスタリング）
// 5. min を積にかえた「max-積 合成」を書いて、結果を比べよう



// ==================================================
// ここから下は「ファジィの道具」（中身は読まなくても OK。消さないでね）
// ==================================================
// ---- メンバーシップ関数（所属度 μ を 0〜1 で返す）
function trimf(x, a, b, c) {            // 三角：a で 0、b で 1、c で 0
  if (x < a || x > c) return 0;
  if (x === b) return 1;
  if (x < b) return b > a ? (x - a) / (b - a) : 1;
  return c > b ? (c - x) / (c - b) : 1;
}
function trapmf(x, a, b, c, d) {         // 台形：b〜c が 1
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}
function gaussmf(x, c, s) { return Math.exp(-((x - c) * (x - c)) / (2 * s * s)); }
function sigmf(x, a, c) { return 1 / (1 + Math.exp(-a * (x - c))); }
function bellmf(x, a, b, c) { return 1 / (1 + Math.pow(Math.abs((x - c) / a), 2 * b)); }
// mf = { type: 'tri', p: [a, b, c] } のような形
function evalMF(mf, x) {
  let p = mf.p;
  if (mf.type === 'tri') return trimf(x, p[0], p[1], p[2]);
  if (mf.type === 'trap') return trapmf(x, p[0], p[1], p[2], p[3]);
  if (mf.type === 'gauss') return gaussmf(x, p[0], p[1]);
  if (mf.type === 'sig') return sigmf(x, p[0], p[1]);
  if (mf.type === 'bell') return bellmf(x, p[0], p[1], p[2]);
  return 0;
}
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }


// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }

// ---- 関係（行列）の道具
function maxMinCell(A, B, i, k) { let m = 0; for (let j = 0; j < B.length; j++) m = Math.max(m, Math.min(A[i][j], B[j][k])); return m; }
function maxMin(A, B) { return A.map((r, i) => B[0].map((_, k) => maxMinCell(A, B, i, k))); }
function maxOf(A, B) { return A.map((r, i) => r.map((v, j) => Math.max(v, B[i][j]))); }
function sameM(A, B) { return A.length === B.length && A.every((r, i) => r.length === B[i].length && r.every((v, j) => Math.abs(v - B[i][j]) < 1e-9)); }
function leq(A, B) { return A.every((r, i) => r.every((v, j) => v <= B[i][j] + 1e-9)); }
function transClosure(A) { let C = A.map((r) => r.slice()); for (let n = 0; n < 20; n++) { let N = maxOf(C, maxMin(C, C)); if (sameM(N, C)) break; C = N; } return C; }
// α カットで同値類に分ける（C は推移閉包）
function classesAt(C, al) {
  let seen = C.map(() => false), out = [];
  for (let i = 0; i < C.length; i++) if (!seen[i]) { let g = []; for (let j = 0; j < C.length; j++) if (!seen[j] && C[i][j] >= al - 1e-9) { g.push(j); seen[j] = true; } out.push(g); }
  return out;
}
