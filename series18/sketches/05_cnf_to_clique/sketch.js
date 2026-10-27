// ============================================
// 05 3-CNF-SAT → クリーク（還元）
// 節が k 個の論理式を「グラフ」に変身させる。各節の 3 つの文字を点にし、
// 「ちがう節」かつ「x と ¬x のように矛盾しない」文字どうしを線で結ぶ
// → 式が充足可能 ⇔ このグラフに大きさ k のクリーク（全員が互いにつながった集まり）がある
// 点をクリックして各節から 1 つずつ選ぶ / スペース：クリークを自動で探す / 1：最初の例 R：ランダムな式
// ============================================

let FIRST = [[1, 2, -3], [-1, -2, 3], [-1, 2, -3]]; // 最初の例（3 節）
let clauses = [];
let verts = [];   // { c: 節番号, lit: ±変数番号, x, y }
let edges = [];
let chosen = [];  // 節ごとに選んだ点の番号
let gen = null, running = false, found = null, tries = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  setFormula(FIRST);
}

function setFormula(cls) {
  clauses = cls;
  verts = []; edges = [];
  let k = clauses.length, cx = width / 2, cy = height * 0.58, R = min(width, height) * 0.3;
  clauses.forEach((cl, c) => {
    let a = TWO_PI * c / k - HALF_PI;
    cl.forEach((lit, j) => {
      let b = a + (j - 1) * 0.32;
      verts.push({ c, lit, x: cx + cos(b) * R, y: cy + sin(b) * R });
    });
  });
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      if (verts[i].c !== verts[j].c && verts[i].lit !== -verts[j].lit) edges.push([i, j]);
  chosen = new Array(k).fill(-1);
  gen = null; running = false; found = null; tries = 0;
}
function randomFormula() {
  let cls = [];
  for (let c = 0; c < 4; c++) cls.push(shuffle([1, 2, 3, 4]).slice(0, 3).sort().map((v) => (random() < 0.5 ? v : -v)));
  setFormula(cls);
}
function ok(i, j) { return verts[i].c !== verts[j].c && verts[i].lit !== -verts[j].lit; }

// 節 0 から順に 1 つずつ選び、それまでの全員とつながっているかを確かめる
function* search(depth) {
  if (depth === clauses.length) return true;
  for (let j = 0; j < 3; j++) {
    let v = depth * 3 + j;
    chosen[depth] = v; tries++;
    for (let d = depth + 1; d < clauses.length; d++) chosen[d] = -1;
    yield;
    let good = true;
    for (let d = 0; d < depth; d++) if (!ok(chosen[d], v)) good = false;
    if (good && (yield* search(depth + 1))) return true;
  }
  chosen[depth] = -1;
  return false;
}

function isClique() {
  if (chosen.includes(-1)) return false;
  for (let a = 0; a < chosen.length; a++) for (let b = a + 1; b < chosen.length; b++) if (!ok(chosen[a], chosen[b])) return false;
  return true;
}
function litName(l) { return (l > 0 ? 'x' : '¬x') + abs(l); }

function draw() {
  background(170, 35, 9);
  if (running && gen && frameCount % 10 === 0) {
    let r = gen.next();
    if (r.done) { running = false; gen = null; found = r.value; }
  }
  let clique = isClique();

  // 線
  for (let [a, b] of edges) {
    let both = chosen.includes(a) && chosen.includes(b);
    stroke(both ? color(50, 90, 100) : color(0, 0, 100, 18)); strokeWeight(both ? 4 : 1.5);
    line(verts[a].x, verts[a].y, verts[b].x, verts[b].y);
  }
  // 選んだのにつながっていない組を赤い破線で
  for (let a = 0; a < chosen.length; a++) for (let b = a + 1; b < chosen.length; b++) {
    let i = chosen[a], j = chosen[b];
    if (i >= 0 && j >= 0 && !ok(i, j)) {
      stroke(0, 90, 100); strokeWeight(3); drawingContext.setLineDash([8, 8]);
      line(verts[i].x, verts[i].y, verts[j].x, verts[j].y); drawingContext.setLineDash([]);
    }
  }
  // 点
  verts.forEach((v, i) => {
    let on = chosen.includes(i);
    noStroke(); fill((v.c * 80) % 360, on ? 80 : 45, on ? 100 : 60);
    circle(v.x, v.y, on ? 50 : 40);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(15);
    text(litName(v.lit), v.x, v.y);
  });
  // 節のラベル
  let cx = width / 2, cy = height * 0.58, R = min(width, height) * 0.3 + 60;
  clauses.forEach((cl, c) => {
    let a = TWO_PI * c / clauses.length - HALF_PI;
    fill((c * 80) % 360, 60, 100); textSize(15);
    text('節 ' + (c + 1), cx + cos(a) * R, cy + sin(a) * R);
  });

  // 式と結果
  textAlign(LEFT, BASELINE); fill(0, 0, 100); textSize(18);
  text('各節から 1 つずつクリック　スペース：自動で探す　1：最初の例　R：ランダムな式（4 節）', 20, 34);
  textSize(20); textFont('monospace');
  let x = 20;
  clauses.forEach((cl, c) => {
    let s = '(' + cl.map(litName).join(' ∨ ') + ')' + (c < clauses.length - 1 ? ' ∧ ' : '');
    fill((c * 80) % 360, 60, 100); text(s, x, 72); x += textWidth(s);
  });
  textFont('sans-serif'); textSize(18);
  fill(0, 0, 75);
  text('点 ' + verts.length + ' 個・線 ' + edges.length + ' 本（式の長さの 2 乗くらい → 多項式時間で作れる）　探した組 ' + tries, 20, 104);
  if (clique) {
    let asg = {};
    chosen.forEach((i) => (asg[abs(verts[i].lit)] = verts[i].lit > 0));
    let s = Object.keys(asg).sort().map((v) => 'x' + v + '=' + (asg[v] ? '真' : '偽')).join('  ');
    fill(120, 80, 100); textSize(22);
    text('大きさ ' + clauses.length + ' のクリーク！ → 選んだ文字を真にすれば全部の節が真：' + s, 20, height - 30);
  } else if (found === false) {
    fill(0, 80, 100); textSize(22); text('クリークなし → 式は充足不能', 20, height - 30);
  } else {
    fill(0, 0, 60); textSize(16);
    text('同じ節の点どうしは結ばない／x と ¬x は結ばない。だからクリークを選ぶ = 矛盾なく各節で 1 つずつ真にできる', 20, height - 30);
  }
}

function mousePressed() {
  verts.forEach((v, i) => {
    if (dist(mouseX, mouseY, v.x, v.y) < 24) {
      running = false; gen = null; found = null;
      chosen[v.c] = chosen[v.c] === i ? -1 : i;
    }
  });
}
function keyPressed() {
  if (key === ' ') { if (!gen) { chosen.fill(-1); tries = 0; found = null; gen = search(0); } running = !running; }
  if (key === '1') setFormula(FIRST);
  if (key === 'r' || key === 'R') randomFormula();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); setFormula(clauses); }

// ---------- やってみよう ----------
// 1. 手でクリークを見つけ、下に出る割り当てで式が本当に真になるか確かめよう
// 2. 逆向き：式を真にする割り当てを先に考え、各節で真の文字を選ぶとクリークになる？
// 3. 節の数を 5 にすると点と線はいくつ？（clauses を自分で書きかえる）
