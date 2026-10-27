// ============================================
// 02 回路充足可能性（CIRCUIT-SAT）
// AND・OR・NOT の回路に、出力が 1 になる入力はある？ → 最初に NP 完全と証明された問題のなかま（クック＝レヴィン）
// 入力を決めれば出力の計算（検証）は一瞬。でも入力が k 本なら候補は 2^k 通り
// 左の入力をクリックで 0/1 切り替え / スペースで全部の入力を総当たり / 1〜3 で回路を切り替え
// ============================================

let inputs = [];   // { name, v }
let gates = [];    // { type, ins: ['x1' | ゲート番号], v }
let truth = [];    // 総当たりの結果
let bruteK = -1;   // 総当たりで今調べている番号
let presetNo = 1;
let BRUTE_WAIT = 18; // ★ 1 通り調べるのにかけるフレーム数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function preset(k) {
  presetNo = k;
  if (k === 1) { // 充足可能
    inputs = ['x1', 'x2', 'x3'];
    gates = [
      { type: 'OR', ins: ['x2', 'x3'] },   // 0
      { type: 'NOT', ins: ['x2'] },        // 1
      { type: 'AND', ins: ['x1', 0] },     // 2
      { type: 'OR', ins: [1, 'x3'] },      // 3
      { type: 'AND', ins: [2, 3] },        // 4 = 出力（答えは 101 と 111）
    ];
  } else if (k === 2) { // 充足不能
    inputs = ['x1', 'x2', 'x3'];
    gates = [
      { type: 'OR', ins: ['x1', 'x2'] },
      { type: 'NOT', ins: ['x1'] },
      { type: 'NOT', ins: ['x2'] },
      { type: 'AND', ins: [1, 2] },
      { type: 'AND', ins: [0, 3, 'x3'] },
    ];
  } else { // 4 入力、答えは 1 通りだけ
    inputs = ['x1', 'x2', 'x3', 'x4'];
    gates = [
      { type: 'AND', ins: ['x1', 'x3'] },
      { type: 'OR', ins: ['x2', 'x4'] },
      { type: 'NOT', ins: [1] },
      { type: 'OR', ins: [0, 'x2'] },
      { type: 'AND', ins: [3, 2] },
      { type: 'AND', ins: [4, 'x1'] },
    ];
  }
  inputs = inputs.map((name) => ({ name, v: 0 }));
  truth = []; bruteK = -1;
  layout();
  evaluate();
}

// ゲートの深さで横位置を決める
function layout() {
  let depth = [];
  for (let i = 0; i < gates.length; i++) {
    let d = 0;
    for (let s of gates[i].ins) if (typeof s === 'number') d = max(d, depth[s]);
    depth[i] = d + 1;
  }
  let maxD = max(depth);
  let left = 120, right = width * 0.62;
  inputs.forEach((p, i) => { p.x = left; p.y = map(i, 0, inputs.length - 1, height * 0.3, height * 0.85); });
  for (let d = 1; d <= maxD; d++) {
    let col = gates.map((g, i) => i).filter((i) => depth[i] === d);
    col.forEach((i, j) => {
      gates[i].x = map(d, 0, maxD, left, right);
      gates[i].y = col.length === 1 ? height * 0.575 : map(j, 0, col.length - 1, height * 0.33, height * 0.82);
    });
  }
}

function val(s) { return typeof s === 'number' ? gates[s].v : inputs.find((p) => p.name === s).v; }
function pos(s) { return typeof s === 'number' ? gates[s] : inputs.find((p) => p.name === s); }
function evaluate() {
  for (let g of gates) {
    let vs = g.ins.map(val);
    g.v = g.type === 'AND' ? (vs.every((v) => v) ? 1 : 0) : g.type === 'OR' ? (vs.some((v) => v) ? 1 : 0) : 1 - vs[0];
  }
  return gates[gates.length - 1].v;
}

function draw() {
  background(220, 35, 9);
  // 総当たり
  if (bruteK >= 0 && frameCount % BRUTE_WAIT === 0) {
    let k = inputs.length;
    if (bruteK < (1 << k)) {
      inputs.forEach((p, i) => (p.v = (bruteK >> (k - 1 - i)) & 1));
      truth.push({ bits: inputs.map((p) => p.v).join(''), out: evaluate() });
      bruteK++;
    } else bruteK = -1;
  }

  // 配線
  for (let g of gates) {
    g.ins.forEach((s, j) => {
      let a = pos(s), on = val(s);
      let ty = g.y + (j - (g.ins.length - 1) / 2) * 16;
      noFill(); strokeWeight(on ? 5 : 3);
      stroke(on ? color(50, 90, 100) : color(220, 30, 40));
      bezier(a.x + 30, a.y, (a.x + g.x) / 2, a.y, (a.x + g.x) / 2, ty, g.x - 34, ty);
    });
  }
  // 入力
  for (let p of inputs) {
    noStroke(); fill(p.v ? color(50, 90, 100) : color(220, 25, 30));
    rect(p.x - 34, p.y - 22, 64, 44, 10);
    fill(p.v ? 0 : 100); textAlign(CENTER, CENTER); textSize(18);
    text(p.name + '=' + p.v, p.x - 2, p.y);
  }
  // ゲート
  gates.forEach((g, i) => {
    let out = i === gates.length - 1;
    let hue = g.type === 'AND' ? 190 : g.type === 'OR' ? 280 : 340;
    noStroke(); fill(hue, 60, g.v ? 95 : 45);
    if (g.type === 'NOT') triangle(g.x - 34, g.y - 24, g.x - 34, g.y + 24, g.x + 22, g.y);
    else rect(g.x - 34, g.y - 26, 64, 52, 4, 26, 26, 4);
    fill(0, 0, g.v ? 10 : 90); textSize(g.type === 'NOT' ? 11 : 14);
    text(g.type, g.type === 'NOT' ? g.x - 18 : g.x - 6, g.y);
    if (out) {
      fill(g.v ? color(120, 80, 100) : color(0, 70, 80)); textSize(28);
      text('出力 ' + g.v, g.x + 90, g.y);
    }
  });

  // 真理値表
  let tx = width * 0.74, ty = 120;
  textAlign(LEFT, TOP); fill(0, 0, 100); textSize(18);
  text('総当たりの結果（' + truth.length + ' / ' + (1 << inputs.length) + '）', tx, ty);
  textFont('monospace'); textSize(17);
  truth.forEach((r, i) => {
    fill(r.out ? color(120, 80, 100) : color(0, 0, 55));
    text(r.bits + '  →  ' + r.out + (r.out ? '  ★' : ''), tx, ty + 34 + i * 24);
  });
  textFont('sans-serif');
  if (truth.length === (1 << inputs.length)) {
    let sat = truth.some((r) => r.out);
    fill(sat ? color(120, 80, 100) : color(0, 70, 100)); textSize(20);
    text(sat ? '充足可能（出力 1 になる入力がある）' : '充足不能（どんな入力でも 0）', tx, ty + 44 + truth.length * 24);
  }

  textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('入力をクリックで 0/1　スペース：総当たり　1：充足可能　2：充足不能　3：4 入力（答え 1 つ）', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('出力の計算 = 証拠の検証（ゲートの数だけの手間）。でも入力 k 本なら 2^k 通り。k = 100 なら 10³⁰ 通り', 20, 64);
}

function mousePressed() {
  for (let p of inputs) if (abs(mouseX - p.x) < 36 && abs(mouseY - p.y) < 24) { p.v = 1 - p.v; bruteK = -1; evaluate(); }
}
function keyPressed() {
  if (key === ' ') { truth = []; bruteK = 0; }
  if (key >= '1' && key <= '3') preset(int(key));
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }

// ---------- やってみよう ----------
// 1. 回路 3 で、総当たりする前に自分で答えを見つけよう
// 2. gates に新しいゲートを足して、充足不能な回路をつくろう
// 3. 入力を 5 本にすると表は何行？ 20 本なら？
