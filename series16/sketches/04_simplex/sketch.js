// ============================================
// 04 シンプレックス法：角から角へ、上り坂だけを歩く
// スラック形の式を書きかえる「ピボット」をくり返すと、実行可能領域の頂点を 1 つずつ移動し、
// 目的関数 z が増えなくなったところが最適解。
// 原点がダメなときは補助 LP（x₀ を足す）で最初の頂点を探す（2 段階法の第 1 段階）
// スペース：1 ステップ / A：自動 / R：最初から
// 1：お手本  2：工場の例  3：原点が実行不能（補助 LP）  4：実行不能  5：非有界  6：ランダム
// ============================================

let speed = 50; // ★ 自動再生の間隔（フレーム）

let n = 2, m, V, T, basis, zrow, zv, names;
let LP, runner, msg = '', hi = {}, finished = false, phase = 2;
let pos = [0, 0], target = [0, 0], trail = [], auto = false, timer = 0, presetNo = 1;

const PRE = {
  1: { c: [2, 1], A: [[3, -1], [1, 1], [-1, 2]], b: [9, 7, 8] },
  2: { c: [3, 5], A: [[1, 0], [0, 2], [3, 2]], b: [4, 12, 18] },
  3: { c: [1, 2], A: [[1, 1], [-2, -1]], b: [6, -4] }, // x₁ + x₂ ≤ 6 かつ 2x₁ + x₂ ≥ 4
  4: { c: [1, 1], A: [[1, 1], [-1, -1]], b: [2, -5] },
  5: { c: [1, 1], A: [[1, -1], [-1, 1]], b: [1, 4] },
};

function setup() { createCanvas(windowWidth, windowHeight);
  textWrap(CHAR); load(1); }

function load(k) {
  presetNo = k;
  if (k === 6) {
    let A = [], b = [];
    for (let i = 0; i < 4; i++) { A.push([floor(random(1, 6)), floor(random(1, 6))]); b.push(floor(random(10, 30))); }
    LP = { c: [floor(random(1, 6)), floor(random(1, 6))], A, b };
  } else LP = PRE[k];
  m = LP.A.length;
  runner = simplex(); finished = false; hi = {}; trail = []; phase = 2;
  build(false);
  pos = cur(); target = pos.slice(); trail = [pos.slice()];
  msg = 'スペースで 1 ステップずつ。最初は原点（x₁ = x₂ = 0、余りが全部 b）からスタート';
}

// 表（タブロー）を作る：各行は「基底変数 + Σ T[i][j]·x_j = 右辺」
function build(aux) {
  V = n + m + (aux ? 1 : 0);
  names = []; for (let j = 0; j < n + m; j++) names.push('x' + sub(j + 1)); if (aux) names.push('x₀');
  T = []; basis = [];
  for (let i = 0; i < m; i++) {
    let row = Array(V + 1).fill(0);
    row[0] = LP.A[i][0]; row[1] = LP.A[i][1]; row[n + i] = 1; if (aux) row[V - 1] = -1; row[V] = LP.b[i];
    T.push(row); basis.push(n + i);
  }
  zrow = Array(V).fill(0); zv = 0;
  if (aux) zrow[V - 1] = -1; else { zrow[0] = LP.c[0]; zrow[1] = LP.c[1]; }
}

function pivot(l, e) {
  let pv = T[l][e];
  for (let j = 0; j <= V; j++) T[l][j] /= pv;
  for (let i = 0; i < m; i++) if (i !== l && abs(T[i][e]) > 1e-12) { let f = T[i][e]; for (let j = 0; j <= V; j++) T[i][j] -= f * T[l][j]; }
  let ce = zrow[e];
  for (let j = 0; j < V; j++) zrow[j] -= ce * T[l][j];
  zv += ce * T[l][V];
  basis[l] = e;
}

function* simplexLoop() { // 1 回の単体法（z の係数が正の変数がなくなるまで）
  while (true) {
    let e = -1;
    for (let j = 0; j < V; j++) if (!basis.includes(j) && zrow[j] > 1e-9 && (e < 0 || zrow[j] > zrow[e] + 1e-9)) e = j;
    if (e < 0) return 'optimal';
    hi = { e }; msg = `z の式で係数がいちばん大きい正の変数 ${names[e]} を増やす（入る変数）。増やすほど z が増える`; yield;
    let l = -1, best = Infinity;
    for (let i = 0; i < m; i++) if (T[i][e] > 1e-9) { let r = T[i][V] / T[i][e]; if (r < best - 1e-9) { best = r; l = i; } }
    if (l < 0) { hi = { e, unb: true }; return 'unbounded'; }
    hi = { e, l }; msg = `${names[e]} をどこまで増やせる？ 各式で他が 0 になる限界を比べる → ${names[basis[l]]} の式が最初に 0（出る変数）。限界 ${fmt(best)}`; yield;
    let out = names[basis[l]];
    pivot(l, e); target = cur(); trail.push(target.slice());
    hi = { done: l }; msg = `ピボット：${names[e]} の式に書きかえて、他の式と z に代入。${names[e]} が基底に入り、${out} が 0（非基底）に。z = ${fmt(zv)}`; yield;
  }
}

function* simplex() {
  let minb = min(LP.b);
  if (minb < 0) {
    phase = 1; build(true);
    msg = '原点では b < 0 の式があって余りが負 → 実行不能。補助 LP「x₀ を最小に（−x₀ を最大に）」を作る（最初の頂点さがし）'; hi = {}; yield;
    let l = LP.b.indexOf(minb);
    pivot(l, V - 1); target = cur(); trail.push(target.slice());
    msg = `x₀ を入れて、いちばん負の式 ${names[n + l]} と入れかえる → 全部の右辺が 0 以上になり、補助 LP の出発点ができた`; hi = { done: l }; yield;
    let r = yield* simplexLoop();
    if (zv < -1e-9) { msg = `補助 LP の最大値が −x₀ = ${fmt(zv)} < 0 → x₀ を 0 にできない → もとの LP は実行不能`; hi = { bad: true }; finished = true; return; }
    let li = basis.indexOf(V - 1);
    if (li >= 0) { let e = -1; for (let j = 0; j < V - 1; j++) if (!basis.includes(j) && abs(T[li][j]) > 1e-9) { e = j; break; } if (e >= 0) pivot(li, e); }
    // x₀ の列を消して、もとの目的関数を今の非基底変数で書き直す
    for (let row of T) row.splice(V - 1, 1);
    V -= 1; names.pop(); zrow = Array(V).fill(0); zv = 0; zrow[0] = LP.c[0]; zrow[1] = LP.c[1];
    for (let i = 0; i < m; i++) { let b = basis[i], cb = zrow[b]; if (abs(cb) > 1e-12) { for (let j = 0; j < V; j++) zrow[j] -= cb * T[i][j]; zv += cb * T[i][V]; } }
    phase = 2; hi = {};
    msg = 'x₀ = 0 にできた → 実行可能な頂点が見つかった。x₀ を消して、もとの目的関数 z に戻して本番スタート'; yield;
  }
  let r = yield* simplexLoop();
  if (r === 'unbounded') { msg = `${names[hi.e]} を増やしても、どの式も 0 にならない → いくらでも増やせる → 非有界（最大値なし）`; finished = true; return; }
  hi = {}; msg = `z の式の係数が全部 0 以下 → どの方向に動いても z は増えない → 最適！ x = (${fmt(cur()[0])}, ${fmt(cur()[1])})、z = ${fmt(zv)}`; finished = true;
}

function cur() { let p = [0, 0]; for (let i = 0; i < m; i++) if (basis[i] < n) p[basis[i]] = T[i][V]; return p; }

function draw() {
  background(18, 14, 26);
  if (auto && !finished && ++timer % speed === 0) advance();
  pos = [lerp(pos[0], target[0], 0.08), lerp(pos[1], target[1], 0.08)];
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('シンプレックス法：角から角へ上り坂を歩く' + (phase === 1 ? '　［補助 LP］' : ''), 30, 50);
  textSize(15); fill(150);
  text('スペース：1 ステップ　A：自動' + (auto ? '（中）' : '') + '　R：最初から　1：お手本　2：工場　3：原点が実行不能　4：実行不能　5：非有界　6：ランダム', 30, 80);
  drawGeo();
  drawSlack();
}

function drawGeo() {
  let s = min(width * 0.42, height - 150), ox = 40, oy = 110;
  let rng = 12; for (let p of trail) rng = max(rng, p[0] * 1.2, p[1] * 1.2);
  let toS = (p) => [ox + (p[0] / rng) * s, oy + s - (p[1] / rng) * s];
  fill(28, 22, 38); noStroke(); rect(ox, oy, s, s, 8);
  push(); drawingContext.beginPath(); drawingContext.rect(ox, oy, s, s); drawingContext.clip();
  let P = [[0, 0], [200, 0], [200, 200], [0, 200]];
  for (let i = 0; i < m; i++) P = clipHalf(P, LP.A[i][0], LP.A[i][1], LP.b[i]);
  stroke(45, 38, 62); strokeWeight(1); for (let k = 0; k <= rng; k += rng > 30 ? 5 : 1) { let a = toS([k, 0]), b = toS([0, k]); line(a[0], oy, a[0], oy + s); line(ox, b[1], ox + s, b[1]); }
  if (P.length >= 3) { fill(78, 225, 190, 60); stroke(78, 225, 190); strokeWeight(2); beginShape(); for (let p of P) { let q = toS(p); vertex(q[0], q[1]); } endShape(CLOSE); }
  stroke(255, 200, 90); strokeWeight(3); noFill(); beginShape(); for (let p of trail) { let q = toS(p); vertex(q[0], q[1]); } endShape();
  let q = toS(pos); noStroke(); fill(255, 200, 90); circle(q[0], q[1], 22); fill(18, 14, 26); circle(q[0], q[1], 8);
  pop();
  fill(200); textSize(14); textAlign(LEFT, TOP); noStroke();
  text('緑：実行可能領域　黄：いまの基底解 (x₁, x₂) とたどった道' + (phase === 1 ? '\n補助 LP の間は、領域の外から中へ入ってくる' : ''), ox, oy + s + 10);
}

function drawSlack() {
  let px = width * 0.42 + 80, yy = 120, w = width - px - 30;
  fill(235); noStroke(); textSize(18); textAlign(LEFT, TOP);
  text('スラック形（左辺 = 基底変数、右辺 = 非基底変数）', px, yy); yy += 36;
  textSize(17);
  let nb = []; for (let j = 0; j < V; j++) if (!basis.includes(j)) nb.push(j);
  // z の式
  let zs = `z  = ${fmt(zv)}` + nb.map(j => ` ${zrow[j] >= 0 ? '+' : '−'} ${fmt(abs(zrow[j]))}${names[j]}`).join('');
  fill(32, 26, 44); rect(px - 8, yy - 6, w, 32, 6);
  fill(255, 200, 90); text(phase === 1 ? zs.replace('z ', 'z′') : zs, px, yy);
  if (hi.e !== undefined) { fill(255, 95, 109); text('↑ ' + names[hi.e] + ' を増やす', px + w - 170, yy); }
  yy += 44;
  for (let i = 0; i < m; i++) {
    let on = hi.l === i, dn = hi.done === i;
    fill(on ? color(255, 95, 109, 90) : dn ? color(78, 225, 190, 60) : color(28, 22, 38)); rect(px - 8, yy - 6, w, 32, 6);
    fill(235);
    let s = `${names[basis[i]]} = ${fmt(T[i][V])}` + nb.map(j => ` ${-T[i][j] >= 0 ? '+' : '−'} ${fmt(abs(T[i][j]))}${names[j]}`).join('');
    text(s, px, yy);
    if (hi.e !== undefined && T[i][hi.e] > 1e-9 && hi.l !== undefined) { fill(255, 200, 90); textAlign(RIGHT, TOP); text('限界 ' + fmt(T[i][V] / T[i][hi.e]), px + w - 16, yy); textAlign(LEFT, TOP); }
    yy += 40;
  }
  yy += 10;
  fill(32, 26, 44); rect(px - 8, yy, w, 86, 10);
  fill(finished ? (hi.bad ? color(255, 110, 110) : color(78, 225, 190)) : color(240)); textSize(16);
  text(msg, px + 6, yy + 12, w - 24);
  fill(150); textSize(14);
  text('基底解：右辺の非基底変数を全部 0 にした点。それがいつも領域の角になる。\n入る変数の選び方はいろいろ（ここでは係数最大）。同じ角でぐるぐる回る「巡回」はブランドの規則で防げる。\n最悪は指数時間だが、実際はとても速い。多項式時間の方法（楕円体法・内点法）もある。', px, height - 110, w);
}

function clipHalf(P, a1, a2, b) {
  let out = [];
  for (let i = 0; i < P.length; i++) {
    let p = P[i], q = P[(i + 1) % P.length], fp = a1 * p[0] + a2 * p[1] - b, fq = a1 * q[0] + a2 * q[1] - b;
    if (fp <= 1e-9) out.push(p);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) { let t = fp / (fp - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}
function advance() { if (finished) return; let r = runner.next(); if (r.done) finished = true; }
function keyPressed() {
  if (key === ' ') advance();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') load(presetNo);
  if (key >= '1' && key <= '6') load(int(key));
}
function fmt(v) { if (abs(v) < 1e-9) return '0'; if (abs(v - round(v)) < 1e-9) return String(round(v)); return v.toFixed(2); }
function sub(k) { return String(k).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join(''); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 2 の工場で、入る変数を「係数最大」ではなく「番号が小さい順」にすると歩く道は変わる？
// 2. 3 の補助 LP で、黄色の点が領域の外から入ってくる様子を見る
// 3. PRE に自分の問題を書いて、03 で描いた図と答えが同じか確かめる
