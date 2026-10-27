// ============================================
// 04 どんな論理式も 3-CNF に変身（SAT ≤p 3-CNF-SAT）
// ① 式を木にする → ② 木の各分かれ目に新しい変数 y をつけ「y ↔ (子どうしの演算)」を並べる
// ③ 各部品を真理値表から CNF（偽になる行を否定）に → ④ 文字が 3 個未満の節を p, q で水増しして、ちょうど 3 個に
// 式の長さに比例する手間で変換できる（多項式時間の還元）。だから 3-CNF-SAT も NP 完全
// 左右キー：段階を進める・戻す / 上下キー：③で見る部品を選ぶ / 1〜3：式を切り替え
// ============================================

let PRESETS = [
  '(~(x3>x1)|(x4=~x2))&x3',  // > は →、= は ↔
  '(x1&x2)|(~x1&x3)',
  '~(x1|x2)>(x3=x1)',
];
let src = '', tree = null, inner = [], stage = 0, pick = 0;
let parts = [];  // 各 y の部品 { y, desc, vars, f, cnf, padded }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  load(0);
}

// ---------- 構文解析（↔ < → < ∨ < ∧ < ¬ の順に強く結びつく）----------
let toks, tp;
function load(k) {
  src = PRESETS[k];
  toks = src.match(/x\d|[~&|>=()]/g); tp = 0;
  tree = parseIff();
  inner = [];
  let cnt = 0;
  (function name(t) { if (t.op) { t.y = 'y' + ++cnt; inner.push(t); t.kids.forEach(name); } })(tree);
  buildParts();
  stage = 0; pick = 0;
}
function parseIff() { let a = parseImp(); while (toks[tp] === '=') { tp++; a = { op: '↔', kids: [a, parseImp()] }; } return a; }
function parseImp() { let a = parseOr(); if (toks[tp] === '>') { tp++; a = { op: '→', kids: [a, parseImp()] }; } return a; }
function parseOr() { let a = parseAnd(); while (toks[tp] === '|') { tp++; a = { op: '∨', kids: [a, parseAnd()] }; } return a; }
function parseAnd() { let a = parseNot(); while (toks[tp] === '&') { tp++; a = { op: '∧', kids: [a, parseNot()] }; } return a; }
function parseNot() {
  if (toks[tp] === '~') { tp++; return { op: '¬', kids: [parseNot()] }; }
  if (toks[tp] === '(') { tp++; let a = parseIff(); tp++; return a; }
  return { v: toks[tp++] };
}
function nm(t) { return t.op ? t.y : t.v; }
function show(t) { // 元の式を読みやすく
  if (!t.op) return t.v;
  if (t.op === '¬') return '¬' + show(t.kids[0]);
  return '(' + show(t.kids[0]) + ' ' + t.op + ' ' + show(t.kids[1]) + ')';
}
function apply(op, a, b) {
  if (op === '¬') return !a;
  if (op === '∧') return a && b;
  if (op === '∨') return a || b;
  if (op === '→') return !a || b;
  return a === b;
}

function buildParts() {
  parts = [{ y: 'y1', desc: 'y1', vars: ['y1'], f: (m) => m.y1 }];
  for (let t of inner) {
    let ks = t.kids.map(nm);
    let desc = t.y + ' ↔ ' + (t.op === '¬' ? '¬' + ks[0] : '(' + ks[0] + ' ' + t.op + ' ' + ks[1] + ')');
    let vars = [t.y, ...ks].filter((v, i, arr) => arr.indexOf(v) === i);
    parts.push({ y: t.y, desc, vars, f: (m) => m[t.y] === apply(t.op, m[ks[0]], m[ks[1]]) });
  }
  let pq = 0;
  for (let p of parts) {
    p.rows = [];
    p.cnf = [];
    let k = p.vars.length;
    for (let r = 0; r < 1 << k; r++) {
      let m = {};
      p.vars.forEach((v, i) => (m[v] = !((r >> (k - 1 - i)) & 1)));
      let ok = p.f(m);
      p.rows.push({ m, ok });
      if (!ok) p.cnf.push(p.vars.map((v) => (m[v] ? '¬' + v : v))); // 偽の行を否定 → 節
    }
    p.padded = [];
    for (let cl of p.cnf) {
      if (cl.length === 3) p.padded.push(cl);
      else if (cl.length === 2) p.padded.push([...cl, 'p'], [...cl, '¬p']);
      else p.padded.push([cl[0], 'p', 'q'], [cl[0], 'p', '¬q'], [cl[0], '¬p', 'q'], [cl[0], '¬p', '¬q']);
    }
  }
}

// ---------- 描画 ----------
function draw() {
  background(200, 35, 9);
  noStroke(); fill(0, 0, 100); textSize(18); textAlign(LEFT, BASELINE);
  text('左右キー：段階　上下キー：部品を選ぶ　1〜3：式を切り替え', 20, 34);
  let titles = ['⓪ 元の式', '① 構文木にする', '② 分かれ目ごとに y ↔ (…) の部品', '③ 部品を真理値表で CNF に', '④ 3 文字ずつにそろえる（3-CNF 完成）'];
  fill(45, 80, 100); textSize(24); text(titles[stage], 20, 72);
  fill(0, 0, 90); textSize(20); textFont('monospace');
  text('φ = ' + show(tree), 20, 108);
  textFont('sans-serif');

  if (stage >= 1) drawTree(30, 150, width * 0.45, height - 220);
  let px = width * 0.5, py = 150;
  if (stage === 2) {
    fill(0, 0, 100); textSize(18); text("φ' = 次の部品すべての ∧（φ と充足可能性が同じ）", px, py);
    textFont('monospace');
    parts.forEach((p, i) => { fill(i === pick ? color(45, 80, 100) : color(0, 0, 85)); text(p.desc, px, py + 36 + i * 28); });
    textFont('sans-serif');
    fill(0, 0, 60); textSize(15); text('どの部品も変数は 3 個以下 → 真理値表は 8 行以下', px, py + 50 + parts.length * 28);
  }
  if (stage === 3) {
    let p = parts[pick];
    fill(45, 80, 100); textSize(20); textFont('monospace'); text(p.desc, px, py);
    textSize(16);
    fill(0, 0, 70); text(p.vars.map((v) => v.padStart(3)).join(' ') + '   値', px, py + 34);
    p.rows.forEach((r, i) => {
      fill(r.ok ? color(0, 0, 70) : color(0, 75, 100));
      text(p.vars.map((v) => (r.m[v] ? '  1' : '  0')).join(' ') + '    ' + (r.ok ? '1' : '0  → 否定して節に'), px, py + 60 + i * 24);
    });
    let cy = py + 80 + p.rows.length * 24;
    fill(130, 60, 100); textSize(17);
    text(p.cnf.map((c) => '(' + c.join(' ∨ ') + ')').join(' ∧ '), px, cy, width - px - 20);
    textFont('sans-serif');
  }
  if (stage === 4) {
    let all = parts.flatMap((p) => p.padded);
    fill(0, 0, 100); textSize(18); text('3-CNF：節 ' + all.length + ' 個（どの節もちょうど 3 文字）', px, py);
    textFont('monospace'); textSize(14);
    let cols = 2, colW = (width - px - 20) / cols;
    all.forEach((c, i) => {
      let col = i % cols, row = floor(i / cols);
      let y = py + 34 + row * 20;
      if (y > height - 40) return;
      fill(c.some((l) => l.includes('p') || l.includes('q')) ? color(280, 50, 100) : color(130, 50, 95));
      text('(' + c.join(' ∨ ') + ')', px + col * colW, y);
    });
    textFont('sans-serif');
    fill(0, 0, 60); textSize(15);
    text('紫 = p, q で水増しした節（p, q がどちらでも同じ意味になるように 2 通り・4 通り並べる）', 20, height - 24);
  }
  if (stage === 0) {
    fill(0, 0, 80); textSize(18);
    text('この式を真にする x の割り当てはある？ 形がバラバラだと扱いにくい。', 20, 170);
    text('右キーで、同じ答えをもつ「3 文字の節の ∧」に変換していく。', 20, 200);
    fill(0, 0, 60); text('記号：¬ 否定、∧ かつ、∨ または、→ ならば、↔ 同値', 20, 240);
  }
}

function drawTree(x0, y0, w, h) {
  let leaves = [];
  (function walk(t, d) { t.d = d; if (!t.op) leaves.push(t); else t.kids.forEach((k) => walk(k, d + 1)); })(tree, 0);
  let maxD = 0;
  (function md(t) { maxD = max(maxD, t.d); if (t.op) t.kids.forEach(md); })(tree);
  leaves.forEach((l, i) => (l.px = x0 + ((i + 0.5) / leaves.length) * w));
  (function px(t) { if (t.op) { t.kids.forEach(px); t.px = t.kids.reduce((s, k) => s + k.px, 0) / t.kids.length; } })(tree);
  let lh = min(80, h / (maxD + 1));
  (function dr(t) {
    t.py = y0 + t.d * lh + 20;
    if (t.op) for (let k of t.kids) { k.py = y0 + k.d * lh + 20; stroke(0, 0, 45); strokeWeight(2); line(t.px, t.py, k.px, k.py); dr(k); }
  })(tree);
  (function nd(t) {
    noStroke();
    let sel = stage === 3 && parts[pick] && parts[pick].y === t.y;
    fill(t.op ? (sel ? color(45, 90, 100) : color(200, 50, 70)) : color(130, 50, 85));
    circle(t.px, t.py, 40);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(16);
    text(t.op || t.v, t.px, t.py);
    if (t.op && stage >= 2) { fill(45, 80, 100); textSize(14); text(t.y, t.px + 30, t.py - 16); }
    textAlign(LEFT, BASELINE);
    if (t.op) t.kids.forEach(nd);
  })(tree);
}

function keyPressed() {
  if (key === RIGHT_ARROW) stage = min(4, stage + 1);
  if (key === LEFT_ARROW) stage = max(0, stage - 1);
  if (key === DOWN_ARROW) pick = (pick + 1) % parts.length;
  if (key === UP_ARROW) pick = (pick + parts.length - 1) % parts.length;
  if (key >= '1' && key <= '3') load(int(key) - 1);
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 式 1 は何個の節になった？ 元の式の長さとの比は？
// 2. PRESETS に自分の式を足そう（x1〜x9、~ & | > = と括弧が使える）
// 3. 部品 y ↔ ¬a の真理値表は何行？ 偽の行はいくつ？
