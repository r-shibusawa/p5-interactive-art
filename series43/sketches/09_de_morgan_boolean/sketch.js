// ============================================
// 09 論理とブール代数の双対：ド・モルガン則
// 式 E の「双対」E^d = AND と OR を入れ替えた式（0 と 1 も入れ替える）
//   ド・モルガン：¬E(A, B, C) = E^d(¬A, ¬B, ¬C)　　左の回路の出力を反転 = 右の回路（入力を全部反転）の出力
//   真理値表で全部の行を比べると一致する。双対の双対は元の式
// 入力の丸をクリック = 0/1 切替 / 1〜4 = 式 / T = 真理値表
// ============================================

let exprNo = 1;
let inputs = { A: 1, B: 0, C: 1 };
let showTable = true;
let exprs = [
  ['and', 'A', 'B'],
  ['or', ['and', 'A', 'B'], 'C'],
  ['and', ['or', 'A', 'B'], ['or', ['not', 'A'], 'C']],
  ['or', ['and', 'A', ['not', 'B']], ['and', 'B', 'C'], ['not', 'C']],
];
let inputPos = {};   // 入力の丸の位置（クリック判定）

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// ★ 式の評価と双対化
function evalE(e, env) {
  if (typeof e === 'string') return env[e];
  if (e[0] === 'not') return 1 - evalE(e[1], env);
  if (e[0] === 'and') return e.slice(1).every((s) => evalE(s, env)) ? 1 : 0;
  return e.slice(1).some((s) => evalE(s, env)) ? 1 : 0;
}
function dual(e) {
  if (typeof e === 'string') return e;
  if (e[0] === 'not') return ['not', dual(e[1])];
  return [e[0] === 'and' ? 'or' : 'and', ...e.slice(1).map(dual)];
}
function toStr(e, top = true) {
  if (typeof e === 'string') return e;
  if (e[0] === 'not') return '¬' + toStr(e[1], false);
  let s = e.slice(1).map((x) => toStr(x, false)).join(e[0] === 'and' ? ' ∧ ' : ' ∨ ');
  return top ? s : '(' + s + ')';
}
function varsOf(e, out = new Set()) { if (typeof e === 'string') out.add(e); else e.slice(1).forEach((s) => varsOf(s, out)); return out; }
function depthOf(e) { return typeof e === 'string' ? 0 : 1 + Math.max(...e.slice(1).map(depthOf)); }
function leavesOf(e) { return typeof e === 'string' ? 1 : e.slice(1).reduce((s, x) => s + leavesOf(x), 0); }

// ★ 回路を描く：入力を左、出力を右。各ノードは [x, y] に置き、値で色をつける
//   invertIn = 入力を反転して与える（右側の回路）、x0..x1 は横幅、y0..y1 は縦幅
function drawCircuit(e, env, x0, y0, x1, y1, invertIn, label) {
  let D = depthOf(e), colW = (x1 - x0 - 120) / Math.max(D, 1);
  noStroke(); fill(0, 0, 70); textSize(14); text(label, x0, y0 - 10);
  let row = { y: y0 + 20 };
  let env2 = {}; for (let k in env) env2[k] = invertIn ? 1 - env[k] : env[k];
  let out = layout(e, env2, x0 + 60, x1 - 60, y0 + 20, y1, D, row, invertIn, x0);
  // 出力
  stroke(0, 0, 60); strokeWeight(2); line(out.x, out.y, x1 - 20, out.y);
  noStroke(); fill(out.v ? 55 : 0, out.v ? 90 : 0, out.v ? 100 : 35); circle(x1 - 20, out.y, 22);
  fill(0, 0, 100); textSize(14); text(out.v, x1 - 25, out.y + 5);
  return out;
}
function layout(e, env, x0, x1, y0, y1, D, row, invertIn, leftX) {
  if (typeof e === 'string') {
    let y = row.y; row.y += 60;
    let v = env[e];
    // 入力の丸（反転ならバーを描く）
    noStroke(); fill(v ? 55 : 0, v ? 90 : 0, v ? 100 : 35); circle(x0, y, 24);
    fill(0, 0, 100); textSize(14); text((invertIn ? '¬' : '') + e, x0 - 40, y + 5);
    if (!invertIn) (inputPos[e] = inputPos[e] || []).push({ x: x0, y });
    return { x: x0 + 12, y, v };
  }
  let kids = e.slice(1).map((s) => layout(s, env, x0, x1, y0, y1, D, row, invertIn, leftX));
  let gx = x0 + 60 + (D - depthOf(e) + 1) * ((x1 - x0 - 60) / D) - 30;
  let gy = kids.reduce((s, k) => s + k.y, 0) / kids.length;
  let v = evalE(e, env);
  // 配線
  for (let k of kids) { stroke(k.v ? 55 : 0, k.v ? 80 : 0, k.v ? 100 : 45); strokeWeight(k.v ? 3 : 1.5); line(k.x, k.y, gx - 30, k.y); line(gx - 30, k.y, gx - 30, gy); }
  stroke(0, 0, 50); strokeWeight(1.5); line(gx - 30, gy, gx - 24, gy);
  // ゲート
  let hue = e[0] === 'and' ? 10 : e[0] === 'or' ? 180 : 300;
  stroke(hue, 70, 100); strokeWeight(2); fill(hue, 70, 100, v ? 40 : 10);
  rect(gx - 24, gy - 16, 48, 32, e[0] === 'or' ? 16 : 6);
  noStroke(); fill(0, 0, 100); textSize(12); textAlign(CENTER, CENTER); text(e[0].toUpperCase(), gx, gy); textAlign(LEFT, BASELINE);
  return { x: gx + 24, y: gy, v };
}

function draw() {
  background(250, 40, 10);
  let e = exprs[exprNo - 1], ed = dual(e);
  let vars = [...varsOf(e)].sort();
  inputPos = {};
  let midX = width / 2, top = 120, bottom = showTable ? height * 0.55 : height - 40;
  let outL = drawCircuit(e, inputs, 40, top, midX - 40, bottom, false, 'E = ' + toStr(e) + '　（左：そのまま）');
  let outR = drawCircuit(ed, inputs, midX + 40, top, width - 40, bottom, true, 'E^d = ' + toStr(ed) + '　（右：AND↔OR、入力を全部反転）');
  // 中央で比較：¬E と E^d(¬·)
  noStroke(); fill(0, 0, 100); textSize(16);
  let ok = 1 - outL.v === outR.v;
  text('¬E = ' + (1 - outL.v) + '　　E^d(¬A, ¬B, …) = ' + outR.v + (ok ? '　✓ 一致' : '　✗'), midX - 120, bottom + 30);

  // 真理値表
  if (showTable) {
    let rows = 1 << vars.length, ty = height * 0.55 + 60, rh = Math.min(24, (height - ty - 30) / (rows + 1));
    let cols = [...vars, 'E', '¬E', 'E^d(¬·)', '一致'];
    textSize(13);
    for (let ci = 0; ci < cols.length; ci++) { fill(0, 0, 70); text(cols[ci], 60 + ci * 90, ty); }
    for (let r = 0; r < rows; r++) {
      let env = {}; vars.forEach((v, i) => (env[v] = (r >> (vars.length - 1 - i)) & 1));
      let envN = {}; for (let k in env) envN[k] = 1 - env[k];
      let vE = evalE(e, env), vD = evalE(ed, envN);
      let current = vars.every((v) => env[v] === inputs[v]);
      let yy = ty + (r + 1) * rh;
      if (current) { noStroke(); fill(55, 80, 100, 20); rect(50, yy - rh + 6, cols.length * 90, rh); }
      let vals = [...vars.map((v) => env[v]), vE, 1 - vE, vD, 1 - vE === vD ? '✓' : '✗'];
      for (let ci = 0; ci < vals.length; ci++) { fill(ci >= vars.length ? (ci === vars.length + 1 || ci === vars.length + 2 ? 55 : 0) : 0, ci >= vars.length + 1 ? 70 : 0, 100); text(vals[ci], 60 + ci * 90, yy); }
    }
    fill(0, 0, 60); textSize(13); text('¬E の列と E^d(¬·) の列はすべての行で同じ', 60 + cols.length * 90 + 20, ty + rh);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('式 ' + exprNo + '（1〜4）：E = ' + toStr(e) + '　　双対 E^d = ' + toStr(ed) + '　T：真理値表 ' + (showTable ? 'ON' : 'off'), 20, 40);
  fill(0, 0, 60); textSize(15);
  text('入力の丸をクリックして 0/1 を切り替える。「否定を中に押し込むと AND と OR が入れ替わる」：¬(A ∧ B) = ¬A ∨ ¬B。回路を裏返しても同じ答え', 20, 68);
}

function mousePressed() {
  for (let k in inputPos) if (inputPos[k].some((p) => dist(mouseX, mouseY, p.x, p.y) < 18)) inputs[k] = 1 - inputs[k];
}
function keyPressed() {
  if (key >= '1' && key <= '4') exprNo = int(key);
  if (key === 't' || key === 'T') showTable = !showTable;
}

// ---------- やってみよう ----------
// 1. 式 1 で 4 通りの入力をすべて試す。¬(A ∧ B) と ¬A ∨ ¬B の真理値表が同じ
// 2. exprs に自分の式を足す（['or', 'A', ['not', ['and', 'B', 'C']]] など）。双対が自動で出る
// 3. 定数 0・1 も双対では入れ替わる：A ∨ 1 = 1 の双対は A ∧ 0 = 0。式に定数を足すなら eval も直そう
// 4. 集合の世界では ∧ = ∩、∨ = ∪、¬ = 補集合。ベン図で同じ法則を描いてみよう
