// ============================================
// 11 互いに素な集合の森 ─ ランクによる合併と経路圧縮
// 集合を根つき木で表す。根が代表。FIND-SET は親をたどって根へ
// 2 つの工夫：①低い木を高い木の下につなぐ（ランクによる合併）②たどった節点を根に直接つなぎ直す（経路圧縮）
// 両方使うと m 回の操作が O(m α(n))。α はアッカーマン関数の逆関数で、現実には 4 以下 ─ ほぼ定数！
// 節点クリック = FIND-SET / 節点から節点へドラッグ = UNION / スペース = ランダムに UNION / F = 一番深い節点を FIND / K = ランク ON/OFF / P = 経路圧縮 ON/OFF / C = 鎖を作る / R = やり直し
// ============================================

let N = 20;           // ★ 要素の数
let SPEED = 0.35;     // ★ 1 コマの秒数

let parent = [], rank = [];
let byRank = true, compress = true;
let pos = {};
let steps = [], timer = 0, hi = { path: [] }, msg = '';
let hops = 0, ops = 0;
let dragFrom = -1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  parent = []; rank = []; steps = []; hops = 0; ops = 0; hi = { path: [] };
  for (let i = 0; i < N; i++) { parent[i] = i; rank[i] = 0; }   // MAKE-SET
  msg = `MAKE-SET を ${N} 回。どの要素も自分自身が根`;
}

function rootOf(x) { while (parent[x] !== x) x = parent[x]; return x; }
function depthOf(x) { let d = 0; while (parent[x] !== x) { x = parent[x]; d++; } return d; }

// FIND-SET をコマに分ける（実行する直前の木で道を調べる）
function planFind(x, label) { steps.push(() => findSteps(x, label)); }
function findSteps(x, label) {
  let out = [];
  let path = [x];
  while (parent[path[path.length - 1]] !== path[path.length - 1]) path.push(parent[path[path.length - 1]]);
  for (let i = 0; i < path.length; i++) {
    let sub = path.slice(0, i + 1);
    out.push(() => { hi = { path: sub }; msg = `${label}FIND-SET(${x})：親をたどる（${i} 歩）`; if (i > 0) hops++; });
  }
  if (compress && path.length > 2) {
    out.push(() => {
      let r = path[path.length - 1];
      for (let v of path.slice(0, -1)) parent[v] = r;
      hi = { path, flat: true };
      msg = `経路圧縮：たどった ${path.length - 1} 個の節点を根 ${r} に直接つなぎ直す（次からは 1 歩）`;
    });
  }
  return out;
}

function planUnion(a, b) {
  ops++;
  steps.push(() => [...findSteps(a, 'UNION の準備 '), () => [...findSteps(b, 'UNION の準備 '), () => link(a, b)]]);
}
function link(a, b) {
  {
    let x = rootOf(a), y = rootOf(b);
    if (x === y) { msg = `${a} と ${b} はもう同じ集合（根 ${x}）`; return; }
    // LINK
    if (!byRank) { parent[x] = y; msg = `LINK：根 ${x} を根 ${y} の下へ（ランクは見ない）`; }
    else if (rank[x] > rank[y]) { parent[y] = x; msg = `LINK：ランク ${rank[y]} < ${rank[x]} → 低い方の根 ${y} を ${x} の下へ`; }
    else {
      parent[x] = y;
      if (rank[x] === rank[y]) { rank[y]++; msg = `LINK：ランクが同じ（${rank[x]}）→ ${x} を ${y} の下へ、${y} のランクを ${rank[y]} に`; }
      else msg = `LINK：ランク ${rank[x]} < ${rank[y]} → 低い方の根 ${x} を ${y} の下へ`;
    }
    hi = { path: [x, y], link: true };
  }
}

// ---------- 配置（森）----------
function layout() {
  let kids = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) if (parent[i] !== i) kids[parent[i]].push(i);
  let roots = [];
  for (let i = 0; i < N; i++) if (parent[i] === i) roots.push(i);
  let leaves = (v) => (kids[v].length ? kids[v].reduce((s, c) => s + leaves(c), 0) : 1);
  let total = roots.reduce((s, r) => s + leaves(r) + 0.5, 0);
  let maxD = max(...Array.from({ length: N }, (_, i) => depthOf(i)));
  let u = min(60, (width - 360) / total), LH = min(80, (height - 330) / max(1, maxD));
  let tg = {}, edges = [], x = 30 + ((width - 360) - total * u) / 2;
  for (let r of roots) {
    (function place(v, left, d) {
      let cx;
      if (!kids[v].length) cx = left + u / 2;
      else {
        let cs = [];
        for (let c of kids[v]) { cs.push(place(c, left, d + 1)); left += leaves(c) * u; edges.push([v, c]); }
        cx = (cs[0] + cs[cs.length - 1]) / 2;
      }
      tg[v] = { x: cx, y: 190 + d * LH };
      return cx;
    })(r, x, 0);
    x += (leaves(r) + 0.5) * u;
  }
  return { tg, edges, u, roots, maxD };
}

function draw() {
  background(30, 30, 9);
  if (steps.length) {
    timer += deltaTime / 1000;
    if (timer > SPEED) {
      timer = 0;
      let more = steps.shift()();
      if (Array.isArray(more)) { steps.unshift(...more); timer = SPEED; }
    }
  }
  let L = layout();
  for (let v in L.tg) {
    if (!pos[v]) pos[v] = { ...L.tg[v] };
    pos[v].x = lerp(pos[v].x, L.tg[v].x, 0.15); pos[v].y = lerp(pos[v].y, L.tg[v].y, 0.15);
  }
  let d = constrain(L.u * 0.7, 20, 40);
  for (let [p, c] of L.edges) {
    let on = hi.path.includes(p) && hi.path.includes(c);
    stroke(on ? color(50, 90, 100) : color(30, 20, 50)); strokeWeight(on ? 3 : 1.6);
    line(pos[p].x, pos[p].y, pos[c].x, pos[c].y);
    // 親への矢印
    let a = atan2(pos[p].y - pos[c].y, pos[p].x - pos[c].x), ex = pos[p].x - cos(a) * d / 2, ey = pos[p].y - sin(a) * d / 2;
    noStroke(); fill(on ? color(50, 90, 100) : color(30, 20, 50));
    triangle(ex, ey, ex - cos(a - 0.4) * 9, ey - sin(a - 0.4) * 9, ex - cos(a + 0.4) * 9, ey - sin(a + 0.4) * 9);
  }
  if (dragFrom >= 0) { stroke(50, 90, 100); strokeWeight(2); line(pos[dragFrom].x, pos[dragFrom].y, mouseX, mouseY); }
  textAlign(CENTER, CENTER);
  for (let v = 0; v < N; v++) {
    let p = pos[v], r = rootOf(v), on = hi.path.includes(v), isRoot = parent[v] === v;
    noStroke();
    fill(on ? color(50, 90, 100) : color((r * 47) % 360, isRoot ? 70 : 45, isRoot ? 85 : 65));
    if (dist(mouseX, mouseY, p.x, p.y) < d / 2) { stroke(0, 0, 100); strokeWeight(2); }
    circle(p.x, p.y, d);
    noStroke(); fill(0, 0, 10); textSize(d * 0.42); text(v, p.x, p.y);
    if (byRank && isRoot) { fill(30, 30, 85); textSize(11); text(`rank ${rank[v]}`, p.x, p.y - d / 2 - 10); }
  }

  // アッカーマン関数とその逆関数
  let px = width - 320;
  textAlign(LEFT, TOP); noStroke();
  fill(30, 15, 15); rect(px - 12, 130, 310, 330, 10);
  fill(0, 0, 100); textSize(16); text('とても速く増える関数 A_k(1)', px, 142);
  let A = [['A₀(1)', '2'], ['A₁(1)', '3'], ['A₂(1)', '7'], ['A₃(1)', '2047'], ['A₄(1)', '≫ 10⁸⁰（宇宙の原子の数）']];
  A.forEach(([a, v], j) => {
    fill(30, 60, 95); textSize(14); text(a, px, 176 + j * 30);
    fill(0, 0, 90); text(v, px + 70, 176 + j * 30);
    fill(30, 70, 70); rect(px + 70, 194 + j * 30, [10, 15, 35, 120, 220][j], 4, 2);
  });
  fill(0, 0, 85); textSize(13);
  text('A_k(j) = A_{k−1} を j+1 回くり返したもの\nα(n) = A_k(1) ≥ n となる最小の k\n→ n が 10⁸⁰ までなら α(n) ≤ 4\n\nランク + 経路圧縮で\nm 回の操作が O(m α(n))', px, 336);

  fill(0, 0, 100); textSize(26); text('互いに素な集合の森', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`ランクによる合併：${byRank ? 'ON' : 'OFF'}（K）   経路圧縮：${compress ? 'ON' : 'OFF'}（P）   集合の数 ${L.roots.length}   いちばん高い木 ${L.maxD}   親をたどった歩数 合計 ${hops}`, 24, 56);
  fill(50, 80, 100); textSize(17); text(msg, 24, 88);
  fill(0, 0, 60); textSize(14);
  text('クリック = FIND-SET / ドラッグ = UNION / スペース = ランダム UNION / F = 一番深い節点を FIND / K = ランク / P = 経路圧縮 / C = 鎖 / R = やり直し', 24, height - 30);
}

function nodeAt(x, y) { for (let v = 0; v < N; v++) if (pos[v] && dist(x, y, pos[v].x, pos[v].y) < 20) return v; return -1; }

function mousePressed() { dragFrom = nodeAt(mouseX, mouseY); }
function mouseReleased() {
  let to = nodeAt(mouseX, mouseY);
  if (dragFrom >= 0 && to >= 0) {
    if (to === dragFrom) { ops++; planFind(dragFrom, ''); }
    else planUnion(dragFrom, to);
  }
  dragFrom = -1;
}

function keyPressed() {
  if (key === ' ') { planUnion(floor(random(N)), floor(random(N))); return false; }
  if (key === 'f' || key === 'F') {
    let deep = 0;
    for (let v = 0; v < N; v++) if (depthOf(v) > depthOf(deep)) deep = v;
    ops++; planFind(deep, '');
  }
  if (key === 'k' || key === 'K') byRank = !byRank;
  if (key === 'p' || key === 'P') compress = !compress;
  if (key === 'c' || key === 'C') {
    // 工夫なしだと 1 本の長い鎖になる並べ方
    reset();
    for (let i = 0; i < N - 1; i++) planUnion(i, i + 1);
  }
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
