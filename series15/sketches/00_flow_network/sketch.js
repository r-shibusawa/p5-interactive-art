// ============================================
// 00 フローネットワーク
// 線 = パイプ。数字は「流れている量 / 容量」。水は s（出発）から t（到着）へ流れる
// 2 つのルールを守れば「フロー」：①容量を超えない ②途中の点では 入る量 = 出る量（フロー保存則）
// 線をクリック = 流れを +1 / Shift + クリック = −1 / 1：お手本 / 2：出発点と到着点が複数 / S：超出発点・超到着点
// ============================================

let nodes = [], edges = [];
let particles = [];
let superMode = false;
let presetNo = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset(1);
}

function P(fx, fy) { return { x: width * fx, y: height * fy }; }

function preset(k) {
  presetNo = k; superMode = false;
  if (k === 1) {
    // お手本のネットワーク（値 15 のフローが流れている）
    nodes = [
      { name: 's', ...P(0.12, 0.55), kind: 'source' },
      { name: 'a', ...P(0.35, 0.33) }, { name: 'b', ...P(0.35, 0.77) },
      { name: 'c', ...P(0.65, 0.33) }, { name: 'd', ...P(0.65, 0.77) },
      { name: 't', ...P(0.88, 0.55), kind: 'sink' },
    ];
    edges = [[0, 1, 10, 6], [0, 2, 12, 9], [1, 2, 3, 0], [1, 3, 9, 6], [1, 4, 4, 0], [2, 4, 11, 9], [4, 3, 5, 2], [3, 5, 15, 8], [4, 5, 9, 7]]
      .map(([u, v, c, f]) => ({ u, v, c, f }));
  } else {
    // 工場が 3 つ（出発点）、倉庫が 2 つ（到着点）
    nodes = [
      { name: 's1', ...P(0.14, 0.3), kind: 'source' }, { name: 's2', ...P(0.14, 0.55), kind: 'source' }, { name: 's3', ...P(0.14, 0.8), kind: 'source' },
      { name: 'a', ...P(0.4, 0.38) }, { name: 'b', ...P(0.4, 0.72) }, { name: 'c', ...P(0.62, 0.55) },
      { name: 't1', ...P(0.84, 0.4), kind: 'sink' }, { name: 't2', ...P(0.84, 0.72), kind: 'sink' },
    ];
    edges = [[0, 3, 6, 0], [1, 3, 4, 0], [1, 4, 5, 0], [2, 4, 7, 0], [3, 5, 6, 0], [4, 5, 5, 0], [3, 6, 4, 0], [5, 6, 5, 0], [5, 7, 6, 0], [4, 7, 4, 0]]
      .map(([u, v, c, f]) => ({ u, v, c, f }));
  }
  particles = [];
}

// S キー：出発点を 1 つにまとめる「超出発点」、到着点をまとめる「超到着点」を足す（容量 ∞）
function toggleSuper() {
  if (presetNo !== 2) return;
  superMode = !superMode;
  if (superMode) {
    nodes.push({ name: 's', ...P(0.04, 0.55), kind: 'super' }, { name: 't', ...P(0.96, 0.56), kind: 'super' });
    let S = nodes.length - 2, T = nodes.length - 1;
    for (let i = 0; i < S; i++) {
      if (nodes[i].kind === 'source') edges.push({ u: S, v: i, c: Infinity, f: 0, sup: true });
      if (nodes[i].kind === 'sink') edges.push({ u: i, v: T, c: Infinity, f: 0, sup: true });
    }
  } else {
    nodes = nodes.filter((n) => n.kind !== 'super');
    edges = edges.filter((e) => !e.sup);
  }
  balanceSuper();
}

// 超出発点・超到着点の線の流れは、つながる点の差し引きで自動的に決まる
function balanceSuper() {
  for (let e of edges) {
    if (!e.sup) continue;
    let i = nodes[e.v].kind === 'source' ? e.v : e.u;
    let out = 0, inn = 0;
    for (let d of edges) if (!d.sup) { if (d.u === i) out += d.f; if (d.v === i) inn += d.f; }
    e.f = max(0, nodes[i].kind === 'source' ? out - inn : inn - out);
  }
}

function balance(i) {
  let inn = 0, out = 0;
  for (let e of edges) { if (e.v === i) inn += e.f; if (e.u === i) out += e.f; }
  return { inn, out };
}

function flowValue() {
  let v = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].kind !== 'source') continue;
    let b = balance(i); v += b.out - b.inn;
  }
  return v;
}

function draw() {
  background(222, 45, 9);
  // パイプ
  for (let e of edges) drawPipe(e);
  // 水の粒：流れの量に比例して生まれる
  for (let e of edges) if (e.f > 0 && random() < min(0.9, e.f * 0.04)) particles.push({ e, t: 0 });
  noStroke();
  for (let p of particles) {
    p.t += 0.012;
    let a = nodes[p.e.u], b = nodes[p.e.v];
    let x = lerp(a.x, b.x, p.t), y = lerp(a.y, b.y, p.t);
    fill(195, 70, 100, 80);
    circle(x, y, 6);
  }
  particles = particles.filter((p) => p.t < 1 && edges.includes(p.e));
  // 点
  let ok = true;
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i], b = balance(i);
    let inner = !n.kind;
    let bad = inner && b.inn !== b.out;
    if (bad) ok = false;
    noStroke();
    fill(n.kind === 'source' || (n.kind === 'super' && n.name === 's') ? color(140, 70, 80) : n.kind === 'sink' || n.kind === 'super' ? color(20, 75, 95) : bad ? color(0, 80, 90) : color(222, 20, 85));
    circle(n.x, n.y, 52);
    fill(0, 0, 10);
    textAlign(CENTER, CENTER); textSize(17);
    text(n.name, n.x, n.y);
    if (inner) {
      textSize(13); fill(bad ? color(0, 70, 100) : color(0, 0, 75));
      text('入 ' + b.inn + ' / 出 ' + b.out, n.x, n.y + 42);
    }
  }
  for (let e of edges) if (e.f > e.c) ok = false;
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('線をクリック = +1　Shift+クリック = −1　1：お手本　2：出発点・到着点が複数' + (presetNo === 2 ? '　S：超出発点 s・超到着点 t ' + (superMode ? 'を外す' : 'を足す') : ''), 20, 36);
  textSize(15); fill(0, 0, 65);
  text('ルール ① 流れ ≤ 容量（はみ出すと赤）　② 途中の点では 入る量 = 出る量（守れないと赤）', 20, 62);
  textSize(26);
  fill(ok ? color(140, 60, 95) : color(0, 70, 100));
  text((ok ? '正しいフロー　' : 'ルール違反あり　') + 'フローの値 |f| = ' + flowValue(), 20, height - 30);
}

function drawPipe(e) {
  let a = nodes[e.u], b = nodes[e.v];
  let ang = atan2(b.y - a.y, b.x - a.x);
  let x1 = a.x + cos(ang) * 28, y1 = a.y + sin(ang) * 28, x2 = b.x - cos(ang) * 30, y2 = b.y - sin(ang) * 30;
  let full = e.c === Infinity ? 0.3 : e.f / max(1, e.c);
  // 外側 = 容量、内側 = 流れ
  stroke(222, 15, 35); strokeWeight(e.c === Infinity ? 6 : 4 + e.c * 0.7);
  line(x1, y1, x2, y2);
  if (e.f > 0) { stroke(e.f > e.c ? color(0, 80, 100) : color(195, 80, 95)); strokeWeight(2 + e.f * 0.7); line(x1, y1, x2, y2); }
  noStroke(); fill(e.f > e.c ? color(0, 80, 100) : full >= 1 ? color(45, 90, 100) : color(0, 0, 80));
  triangle(x2, y2, x2 - cos(ang - 0.4) * 16, y2 - sin(ang - 0.4) * 16, x2 - cos(ang + 0.4) * 16, y2 - sin(ang + 0.4) * 16);
  let mx = (x1 + x2) / 2 - sin(ang) * 18, my = (y1 + y2) / 2 + cos(ang) * 18;
  fill(222, 40, 15, 85); rectMode(CENTER); rect(mx, my, 62, 24, 6); rectMode(CORNER);
  fill(e.f > e.c ? color(0, 70, 100) : full >= 1 ? color(45, 90, 100) : color(0, 0, 95));
  textAlign(CENTER, CENTER); textSize(15);
  text(e.f + ' / ' + (e.c === Infinity ? '∞' : e.c), mx, my);
}

function segDist(px, py, a, b) {
  let dx = b.x - a.x, dy = b.y - a.y;
  let t = constrain(((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return dist(px, py, a.x + t * dx, a.y + t * dy);
}

function mousePressed() {
  let best = null, bd = 16;
  for (let e of edges) {
    if (e.sup) continue;
    let d = segDist(mouseX, mouseY, nodes[e.u], nodes[e.v]);
    if (d < bd) { bd = d; best = e; }
  }
  if (best) {
    best.f = max(0, best.f + (keyIsDown(SHIFT) ? -1 : 1));
    balanceSuper();
  }
}

function keyPressed() {
  if (key === '1' || key === '2') preset(int(key));
  if (key === 's' || key === 'S') toggleSuper();
  if (key === 'r' || key === 'R') preset(presetNo);
}

// ---------- やってみよう ----------
// 1. お手本で、フローの値を 15 から 21 まで増やせるか？（21 が最大）
// 2. 2 で S を押す。出発点が何個あっても「s から t への 1 つの問題」にできる
// 3. ルール ② を守ったまま、どこか 1 本だけ流れを増やすことはできる？（できない理由を考える）
