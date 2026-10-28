// ============================================
// 01 ケーニヒスベルクの橋と一筆書き
// 陸地を「点」、橋を「線」にすると、距離や形を忘れて「つながり方」だけが残る（オイラー 1736 年 ＝ トポロジーの始まり）
//   一筆書きできる ⇔ つながっていて、奇数本の線が出ている点が 0 個（元の点に戻る）か 2 個（端から端へ）
// クリック = 点を追加 / 点から点へドラッグ = 線（橋）を追加 / Shift+ドラッグ = 点を動かす / スペース = 一筆書きを探してアニメ
// K = ケーニヒスベルク / 2 = 家（封筒） / 3 = 星 / 4 = 橋を 1 本増やしたケーニヒスベルク / D = 最後の線を消す / X = マウスの点を消す / C = 全部消す
// ============================================

let verts = [], edges = [];     // 点 {x, y}、線 {a, b}
let dragFrom = -1, moving = -1;
let vr = 24;                    // ★ 点の半径
let animPath = null, animT = 0;
let animSpeed = 0.025;          // ★ アニメの速さ
let showRiver = false;
let result = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  preset('K');
}

function preset(k) {
  let cx = width / 2, cy = height / 2 + 40, s = min(width, height) * 0.32;
  verts = []; edges = []; animPath = null; showRiver = false;
  let E = (a, b) => edges.push({ a, b });
  if (k === 'K' || k === '4') {
    // A = 北岸、B = 南岸、C = 中の島、D = 東の島
    verts = [{ x: cx - s * 0.3, y: cy - s * 0.9 }, { x: cx - s * 0.3, y: cy + s * 0.9 }, { x: cx - s * 0.3, y: cy }, { x: cx + s * 0.9, y: cy }];
    E(0, 2); E(0, 2); E(1, 2); E(1, 2); E(0, 3); E(1, 3); E(2, 3);
    if (k === '4') E(0, 1);
    showRiver = true;
  } else if (k === '2') {
    verts = [{ x: cx - s * 0.6, y: cy + s * 0.7 }, { x: cx + s * 0.6, y: cy + s * 0.7 }, { x: cx + s * 0.6, y: cy - s * 0.3 }, { x: cx - s * 0.6, y: cy - s * 0.3 }, { x: cx, y: cy - s * 0.95 }];
    E(0, 1); E(1, 2); E(2, 3); E(3, 0); E(0, 2); E(1, 3); E(3, 4); E(4, 2);
  } else if (k === '3') {
    for (let i = 0; i < 5; i++) { let a = -HALF_PI + (i * TWO_PI) / 5; verts.push({ x: cx + s * cos(a), y: cy + s * sin(a) }); }
    for (let i = 0; i < 5; i++) { E(i, (i + 1) % 5); E(i, (i + 2) % 5); }
  }
  analyze();
}

function degreeList() { let d = verts.map(() => 0); for (let e of edges) { d[e.a]++; d[e.b]++; } return d; }

// 線のある点がぜんぶ 1 つにつながっているか（幅優先探索）
function connected(d) {
  let s = d.findIndex((x) => x > 0);
  if (s < 0) return true;
  let seen = verts.map(() => false), queue = [s]; seen[s] = true;
  while (queue.length) {
    let v = queue.shift();
    for (let e of edges) { let w = e.a === v ? e.b : e.b === v ? e.a : -1; if (w >= 0 && !seen[w]) { seen[w] = true; queue.push(w); } }
  }
  return d.every((x, i) => x === 0 || seen[i]);
}

function analyze() {
  let d = degreeList(), odd = d.filter((x) => x % 2 === 1).length;
  if (!edges.length) result = '線を引いてみよう';
  else if (!connected(d)) result = 'つながっていない → 一筆書きできない';
  else if (odd === 0) result = '奇数の点 0 個 → 一筆書きできる（元の点に戻ってくる）';
  else if (odd === 2) result = '奇数の点 2 個 → 一筆書きできる（奇数の点から出発して、もう一方で終わる）';
  else result = '奇数の点 ' + odd + ' 個 → 一筆書きできない！';
}

// ★ ヒールホルツァーの方法：行けるだけ進み、行き止まりで戻りながら道をつなぐ
function eulerPath() {
  let d = degreeList(), odd = [];
  d.forEach((x, i) => { if (x % 2) odd.push(i); });
  if (!edges.length || !connected(d) || (odd.length !== 0 && odd.length !== 2)) return null;
  let start = odd.length ? odd[0] : d.findIndex((x) => x > 0);
  let adj = verts.map(() => []);
  edges.forEach((e, i) => { adj[e.a].push(i); adj[e.b].push(i); });
  let used = edges.map(() => false), ptr = verts.map(() => 0);
  let stack = [{ v: start, e: -1 }], out = [];
  while (stack.length) {
    let top = stack[stack.length - 1], v = top.v;
    while (ptr[v] < adj[v].length && used[adj[v][ptr[v]]]) ptr[v]++;
    if (ptr[v] === adj[v].length) { stack.pop(); if (top.e >= 0) out.push({ e: top.e, to: v }); }
    else { let ei = adj[v][ptr[v]]; used[ei] = true; let e = edges[ei]; stack.push({ v: e.a === v ? e.b : e.a, e: ei }); }
  }
  out.reverse();
  return { start, steps: out };
}

function draw() {
  background(205, 35, 14);
  if (showRiver) drawRiver();
  if (moving >= 0) { verts[moving].x = mouseX; verts[moving].y = mouseY; }
  let d = degreeList();
  // 線（同じ 2 点を結ぶ線が何本もあるときはふくらませて描く）
  let doneEdges = new Set(), curE = -1, curP = null;
  if (animPath) {
    animT += animSpeed;
    let k = floor(animT);
    if (k >= animPath.steps.length) { k = animPath.steps.length - 1; }
    for (let i = 0; i < k; i++) doneEdges.add(animPath.steps[i].e);
    let st = animPath.steps[k], from = k === 0 ? animPath.start : animPath.steps[k - 1].to;
    curE = st.e; curP = edgePt(st.e, min(1, animT - k), from);
    if (animT > animPath.steps.length + 1.5) animT = 0;
  }
  noFill();
  for (let i = 0; i < edges.length; i++) {
    let done = doneEdges.has(i);
    stroke(done ? 45 : i === curE ? 45 : 200, done ? 90 : 30, done ? 100 : 80);
    strokeWeight(done ? 7 : 4);
    beginShape();
    for (let t = 0; t <= 1.001; t += 0.05) { let p = edgePt(i, t, edges[i].a); vertex(p.x, p.y); }
    endShape();
  }
  if (dragFrom >= 0) { stroke(45, 80, 100); strokeWeight(3); line(verts[dragFrom].x, verts[dragFrom].y, mouseX, mouseY); }
  // 点（数字 = 次数 = 出ている線の本数）
  textAlign(CENTER, CENTER); textSize(20);
  for (let i = 0; i < verts.length; i++) {
    let v = verts[i], odd = d[i] % 2 === 1;
    stroke(odd ? 0 : 140, 80, 100); strokeWeight(odd ? 5 : 3); fill(220, 40, 25);
    circle(v.x, v.y, vr * 2);
    noStroke(); fill(0, 0, 100); text(d[i], v.x, v.y);
  }
  textAlign(LEFT, BASELINE);
  if (curP) { noStroke(); fill(45, 90, 100); circle(curP.x, curP.y, 22); }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('クリック：点　点→点ドラッグ：線　Shift+ドラッグ：移動　スペース：一筆書き　K 2 3 4：例　D：線を消す　X：点を消す　C：全消去', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('数字 = その点から出ている線の本数（次数）。赤い輪 = 奇数。奇数の点は必ず偶数個（線 1 本で次数の合計が 2 増えるから）', 20, 68);
  let odd = d.filter((x) => x % 2).length;
  fill(odd === 0 || odd === 2 ? 140 : 0, 70, 100); textSize(26);
  text(result, 20, height - 60);
  fill(0, 0, 70); textSize(16);
  text('点 ' + verts.length + '　線 ' + edges.length + '　次数の合計 ' + d.reduce((a, b) => a + b, 0) + ' = 線の数 × 2', 20, height - 28);
}

// 線 i の上の点（t = 0〜1、from 側から）。平行な線は横にずらして弓なりに
function edgePt(i, t, from) {
  let e = edges[i], A = verts[e.a], B = verts[e.b];
  if (from === e.b) t = 1 - t;
  let same = [], key = min(e.a, e.b) + '-' + max(e.a, e.b);
  edges.forEach((f, j) => { if (min(f.a, f.b) + '-' + max(f.a, f.b) === key) same.push(j); });
  let k = same.indexOf(i), off = (k - (same.length - 1) / 2) * 70;
  if (e.a > e.b) off = -off;
  let mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
  let cx = mx - ((B.y - A.y) / L) * off, cy = my + ((B.x - A.x) / L) * off;
  let u = 1 - t;
  return { x: u * u * A.x + 2 * u * t * cx + t * t * B.x, y: u * u * A.y + 2 * u * t * cy + t * t * B.y };
}

function vertexAt(x, y) { for (let i = verts.length - 1; i >= 0; i--) if (Math.hypot(verts[i].x - x, verts[i].y - y) < vr + 4) return i; return -1; }

function mousePressed() {
  let v = vertexAt(mouseX, mouseY);
  if (v >= 0) { if (keyIsDown(SHIFT)) moving = v; else dragFrom = v; }
  else if (mouseY > 90 && mouseY < height - 90) { verts.push({ x: mouseX, y: mouseY }); analyze(); }
}
function mouseReleased() {
  if (dragFrom >= 0) {
    let w = vertexAt(mouseX, mouseY);
    if (w >= 0 && w !== dragFrom) { edges.push({ a: dragFrom, b: w }); animPath = null; analyze(); }
  }
  dragFrom = -1; moving = -1;
}
function keyPressed() {
  if (key === 'k' || key === 'K') preset('K');
  if (key === '2' || key === '3' || key === '4') preset(key);
  if (key === ' ') { animPath = eulerPath(); animT = 0; if (!animPath) result = '一筆書きの道は見つからない：' + result; }
  if ((key === 'd' || key === 'D') && edges.length) { edges.pop(); animPath = null; analyze(); }
  if (key === 'x' || key === 'X') {
    let v = vertexAt(mouseX, mouseY);
    if (v >= 0) {
      edges = edges.filter((e) => e.a !== v && e.b !== v).map((e) => ({ a: e.a > v ? e.a - 1 : e.a, b: e.b > v ? e.b - 1 : e.b }));
      verts.splice(v, 1); animPath = null; analyze();
    }
  }
  if (key === 'c' || key === 'C') { verts = []; edges = []; animPath = null; showRiver = false; analyze(); }
}

// ---------- やってみよう ----------
// 1. K で「全部の点が奇数」を確認。4 で橋を 1 本足すと一筆書きできる。どこからどこへ？
// 2. 自分の名前の漢字（「田」「日」「中」…）を点と線で描いて、一筆書きできるか調べよう
// 3. 線をどれか 1 本消して、一筆書きできるように「直す」には最低何本消せばいい？
// 4. 奇数の点が 4 個のとき、何回に分けて書けば全部の線を通れる？（答え：奇数の点の数 ÷ 2）


// ==================================================
// ここから下は「川を描く道具」（ケーニヒスベルクの雰囲気）
// ==================================================
function drawRiver() {
  let cx = width / 2, cy = height / 2 + 40, s = min(width, height) * 0.32;
  noFill(); stroke(200, 60, 45, 60); strokeWeight(s * 0.3);
  line(-40, cy, cx - s * 1.1, cy);                       // 西で 1 本に合流
  beginShape(); vertex(cx - s * 1.1, cy); vertex(cx - s * 0.8, cy - s * 0.45); vertex(width + 40, cy - s * 0.45); endShape();   // 北の流れ
  beginShape(); vertex(cx - s * 1.1, cy); vertex(cx - s * 0.8, cy + s * 0.45); vertex(width + 40, cy + s * 0.45); endShape();   // 南の流れ
  strokeWeight(s * 0.18); line(cx + s * 0.3, cy - s * 0.45, cx + s * 0.3, cy + s * 0.45);   // 島（C）と東の陸（D）の間の水路
}
