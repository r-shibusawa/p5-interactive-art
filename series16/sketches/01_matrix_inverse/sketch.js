// ============================================
// 01 逆行列：変換を「もとに戻す」行列
// 左：2×2 行列 A は平面の変形。2 本の矢印（基底）をドラッグして A を決める。I で A⁻¹ をかけて元に戻す
// 右：3×3 の [A | I] を掃き出して [I | A⁻¹] にする（LUP 分解を 1 回して右辺を n 回解くやり方でも、中身は同じ）
// ドラッグ：矢印の先 / I：逆変換アニメ / スペース：掃き出し 1 ステップ / A：自動 / R：やり直し
// 1：整数で割り切れる例  2：ランダム  3：特異行列（逆行列なし）
// ============================================

let unit = 60;    // ★ 左の方眼 1 マスのピクセル数
let speed = 40;   // ★ 自動再生の間隔（フレーム）

let a = 1.4, b = 0.5, c = 0.3, d = 1.1; // A = [[a, b], [c, d]]
let dragging = null, back = 0, backTarget = 0;
let shapeF = [[0, 0], [0, 3], [2, 3], [2, 2.4], [0.7, 2.4], [0.7, 1.8], [1.6, 1.8], [1.6, 1.2], [0.7, 1.2], [0.7, 0]];

let G, runner, gmsg = '', ghi = {}, gdone = false, auto = false, timer = 0, preset = 1;
const PRE = { 1: [[2, 1, 1], [1, 3, 2], [1, 0, 0]], 3: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] };

function setup() {
  createCanvas(windowWidth, windowHeight);
  textWrap(CHAR); // 日本語を文字単位で折り返す
  loadG(1);
}

function loadG(k) {
  preset = k;
  let A = k === 2 ? [0, 1, 2].map(() => [0, 1, 2].map(() => floor(random(-5, 6)))) : PRE[k].map(r => r.slice());
  G = A.map((r, i) => r.concat([0, 1, 2].map(j => (i === j ? 1 : 0))));
  runner = gaussJordan(); gdone = false; ghi = {}; gmsg = 'スペースで掃き出しを 1 ステップずつ';
}

function* gaussJordan() {
  for (let k = 0; k < 3; k++) {
    let p = k;
    for (let i = k + 1; i < 3; i++) if (abs(G[i][k]) > abs(G[p][k])) p = i;
    if (abs(G[p][k]) < 1e-9) { ghi = { bad: k }; gmsg = `列 ${k + 1} が全部 0 → 特異行列。逆行列はない（det = 0）`; gdone = true; return; }
    if (p !== k) { [G[k], G[p]] = [G[p], G[k]]; ghi = { rows: [k, p] }; gmsg = `ピボットに絶対値最大の行を使うため、行 ${k + 1} と行 ${p + 1} を入れかえ`; yield; }
    let pv = G[k][k];
    for (let j = 0; j < 6; j++) G[k][j] /= pv;
    ghi = { row: k }; gmsg = `行 ${k + 1} を ${fmt(pv)} で割って、ピボットを 1 にする`; yield;
    for (let i = 0; i < 3; i++) if (i !== k) { let f = G[i][k]; for (let j = 0; j < 6; j++) G[i][j] -= f * G[k][j]; }
    ghi = { col: k }; gmsg = `ほかの行から行 ${k + 1} の何倍かを引いて、列 ${k + 1} をピボット以外 0 にする`; yield;
  }
  ghi = { inv: true }; gmsg = '左が単位行列 I になった → 右半分が A⁻¹。同じ操作を I にもしたので A⁻¹ が出てくる'; gdone = true;
}

function draw() {
  background(18, 14, 26);
  if (auto && !gdone && ++timer % speed === 0) runner.next();
  back = lerp(back, backTarget, 0.06);

  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text('逆行列：変換をもとに戻す', 30, 50);
  textSize(15); fill(150);
  text('左：矢印の先をドラッグ　I：A⁻¹ をかけて戻す　｜　右：スペース 1 ステップ　A：自動' + (auto ? '（中）' : '') + '　R：やり直し　1〜3：お手本', 30, 80);

  drawPlane(width * 0.25, height * 0.55);
  drawGauss(width * 0.52, 140);
}

function drawPlane(cx, cy) {
  let det = a * d - b * c;
  push(); translate(cx, cy);
  // 元の方眼
  stroke(45, 38, 62); strokeWeight(1);
  for (let k = -5; k <= 5; k++) { line(k * unit, -5 * unit, k * unit, 5 * unit); line(-5 * unit, k * unit, 5 * unit, k * unit); }
  // A で変形した方眼（戻すアニメ中は I に近づく）
  let M = blendA();
  stroke(255, 95, 109, 90);
  for (let k = -4; k <= 4; k++) {
    let p1 = tr(M, k, -4), p2 = tr(M, k, 4), p3 = tr(M, -4, k), p4 = tr(M, 4, k);
    line(p1[0], p1[1], p2[0], p2[1]); line(p3[0], p3[1], p4[0], p4[1]);
  }
  // 単位正方形の行き先（面積 = |det|）
  let q = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => tr(M, u, v));
  fill(255, 200, 90, 70); noStroke(); beginShape(); for (let p of q) vertex(p[0], p[1]); endShape(CLOSE);
  // F の形
  fill(78, 225, 190, 150); stroke(78, 225, 190); strokeWeight(2);
  beginShape(); for (let [u, v] of shapeF) { let p = tr(M, u * 0.8, v * 0.8); vertex(p[0], p[1]); } endShape(CLOSE);
  // 基底ベクトル（ドラッグ用）
  arrowTo(a * unit, -c * unit, color(255, 95, 109), 'i');
  arrowTo(b * unit, -d * unit, color(255, 200, 90), 'j');
  pop();
  // 数字
  let ox = 30, oy = height - 170;
  fill(32, 26, 44); noStroke(); rect(ox, oy, width * 0.45, 150, 12);
  fill(235); textSize(18); textAlign(LEFT, TOP);
  text(`A = [ ${fmt(a)}  ${fmt(b)} ; ${fmt(c)}  ${fmt(d)} ]　　det A = ad − bc = ${fmt(det)}`, ox + 16, oy + 14);
  if (abs(det) < 0.05) { fill(255, 90, 90); text('det ≈ 0：平面が線につぶれる → 元に戻せない（逆行列なし）', ox + 16, oy + 50); }
  else {
    fill(78, 225, 190);
    text(`A⁻¹ = (1/det) [ d  −b ; −c  a ] = [ ${fmt(d / det)}  ${fmt(-b / det)} ; ${fmt(-c / det)}  ${fmt(a / det)} ]`, ox + 16, oy + 50);
  }
  fill(150); textSize(14);
  text('黄色の正方形の面積 = |det A|。裏返る（F が鏡文字）と det < 0。\nI を押すと A⁻¹ をかけて、方眼と F が元の位置に戻る。', ox + 16, oy + 88);
}

function blendA() { // back=0 なら A、back=1 なら単位行列
  return [lerp(a, 1, back), lerp(b, 0, back), lerp(c, 0, back), lerp(d, 1, back)];
}
function tr(M, u, v) { return [(M[0] * u + M[1] * v) * unit, -(M[2] * u + M[3] * v) * unit]; }
function arrowTo(x, y, col, label) {
  let s = 1 - back;
  x *= s; y *= s; if (back > 0.02) { x += back * (label === 'i' ? unit : 0); y += back * (label === 'j' ? -unit : 0); }
  stroke(col); strokeWeight(4); line(0, 0, x, y);
  noStroke(); fill(col); circle(x, y, 18);
  fill(18, 14, 26); textAlign(CENTER, CENTER); textSize(12); text(label, x, y);
}

function drawGauss(ox, oy) {
  let cs = min(70, (width - ox - 40) / 6.6);
  fill(200); noStroke(); textSize(18); textAlign(LEFT, BASELINE);
  text('[ A | I ]  →  [ I | A⁻¹ ]（掃き出し法）', ox, oy - 14);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) {
    let px = ox + j * cs + (j >= 3 ? cs * 0.5 : 0), py = oy + i * cs;
    let col = j < 3 ? color(40, 34, 56) : color(30, 60, 58);
    if (ghi.row === i) col = color(255, 200, 90, 180);
    if (ghi.col !== undefined && j === ghi.col) col = color(255, 95, 109, 160);
    if (ghi.rows && ghi.rows.includes(i)) col = color(120, 100, 200);
    if (ghi.inv && j >= 3) col = color(78, 225, 190, 200);
    if (ghi.bad !== undefined && j === ghi.bad && i >= ghi.bad) col = color(200, 50, 50);
    stroke(18, 14, 26); strokeWeight(3); fill(col); rect(px, py, cs, cs, 8);
    noStroke(); fill(240); textAlign(CENTER, CENTER); textSize(cs * 0.27); text(fmt(G[i][j]), px + cs / 2, py + cs / 2);
  }
  stroke(200); strokeWeight(2); line(ox + 3.25 * cs, oy - 4, ox + 3.25 * cs, oy + 3 * cs + 4);
  let my = oy + 3 * cs + 30;
  fill(32, 26, 44); noStroke(); rect(ox, my, width - ox - 30, 90, 12);
  fill(gdone ? color(78, 225, 190) : color(235)); textSize(16); textAlign(LEFT, TOP);
  text(gmsg, ox + 14, my + 14, width - ox - 60);
  fill(150); textSize(14);
  text('A⁻¹ の第 i 列は Ax = eᵢ の解。LUP 分解を 1 回だけして、右辺 e₁, e₂, … を n 回、前進代入・後退代入で解いてもよい（合計 Θ(n³)）。\n逆行列を求める計算量は、行列のかけ算と同じ（どちらかが速くなれば、もう片方も速くなる）。\n実際に Ax = b を解くときは、逆行列を作るより LUP 分解で直接解く方が速くて誤差も小さい。', ox, my + 110, width - ox - 40);
}

function mousePressed() {
  let cx = width * 0.25, cy = height * 0.55;
  let ix = cx + a * unit, iy = cy - c * unit, jx = cx + b * unit, jy = cy - d * unit;
  if (dist(mouseX, mouseY, ix, iy) < 20) dragging = 'i';
  else if (dist(mouseX, mouseY, jx, jy) < 20) dragging = 'j';
  if (dragging) { back = 0; backTarget = 0; }
}
function mouseDragged() {
  if (!dragging) return;
  let cx = width * 0.25, cy = height * 0.55;
  let u = round(((mouseX - cx) / unit) * 10) / 10, v = round((-(mouseY - cy) / unit) * 10) / 10;
  if (dragging === 'i') { a = u; c = v; } else { b = u; d = v; }
}
function mouseReleased() { dragging = null; }
function keyPressed() {
  if (key === 'i' || key === 'I') { if (abs(a * d - b * c) > 0.05) backTarget = backTarget ? 0 : 1; }
  if (key === ' ') { if (!gdone) runner.next(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'r' || key === 'R') loadG(preset);
  if (key >= '1' && key <= '3') loadG(int(key));
}
function fmt(v) { if (abs(v - round(v)) < 1e-9) return String(round(v)); return v.toFixed(2); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 矢印 i と j を同じ向きにそろえると？（det = 0、F が線につぶれる）
// 2. i と j を入れかえると F は鏡文字になる。det の符号を見る
// 3. 右の 1 で、A⁻¹ が整数になる理由を det から考える（det = −1）
