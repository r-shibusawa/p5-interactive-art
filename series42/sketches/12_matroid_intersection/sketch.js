// ============================================
// 12 マトロイド交差：二部グラフのマッチング
// 二部グラフの辺集合に 2 つの分割マトロイドをのせる：M1 = 「左の各頂点から 1 本まで」、M2 = 「右の各頂点から 1 本まで」
//   両方で独立な集合（共通独立集合）= マッチング。最大のものを探すのが「マトロイド交差問題」
//   増加路：使っていない左頂点から、未使用辺 → 使用辺 → 未使用辺 … と交互にたどって未使用の右頂点に着く道。裏返すと 1 本増える
// 辺をクリック = 入れる・外す（両方のマトロイドで検査） / スペース = 増加路を探す → もう一度で裏返す / A = 自動 / C = 全部外す / R = 新しいグラフ
// ============================================

let nL = 4, nR = 4;                  // ★ 左右の頂点数
let edges = [];                      // {a: 左, b: 右, on}
let path = null;                     // 見つけた増加路（辺番号の列）
let auto = false, timer = 0;
let maxSize = 0;                     // 全列挙で求めた最大マッチング

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  randomGraph();
}
function posL(i) { return { x: width * 0.18, y: map(i, 0, nL - 1, height * 0.3, height * 0.85) }; }
function posR(j) { return { x: width * 0.46, y: map(j, 0, nR - 1, height * 0.3, height * 0.85) }; }

function randomGraph() {
  edges = []; path = null; auto = false;
  for (let i = 0; i < nL; i++) {
    let js = shuffle([...Array(nR).keys()]).slice(0, 2);
    for (let j of js) edges.push({ a: i, b: j, on: false });
  }
  for (let j = 0; j < nR; j++) if (!edges.some((e) => e.b === j)) edges.push({ a: floor(random(nL)), b: j, on: false });
  edges.sort((p, q) => p.a - q.a || p.b - q.b);
  // 全列挙で最大
  maxSize = 0;
  for (let m = 0; m < (1 << edges.length); m++) {
    let sub = []; for (let i = 0; i < edges.length; i++) if (m & (1 << i)) sub.push(i);
    if (sub.length > maxSize && indep1(sub) && indep2(sub)) maxSize = sub.length;
  }
}

// ★ 2 つのマトロイド（どちらも分割マトロイド）
function indep1(sub) { let used = new Set(); for (let i of sub) { if (used.has(edges[i].a)) return false; used.add(edges[i].a); } return true; }
function indep2(sub) { let used = new Set(); for (let i of sub) { if (used.has(edges[i].b)) return false; used.add(edges[i].b); } return true; }
function bad1(sub) { let cnt = {}; for (let i of sub) cnt[edges[i].a] = (cnt[edges[i].a] || 0) + 1; return Object.keys(cnt).filter((k) => cnt[k] > 1).map(Number); }
function bad2(sub) { let cnt = {}; for (let i of sub) cnt[edges[i].b] = (cnt[edges[i].b] || 0) + 1; return Object.keys(cnt).filter((k) => cnt[k] > 1).map(Number); }

// ★ 増加路を BFS で探す（マッチングのときだけ）
function findPath() {
  let on = edges.map((e, i) => i).filter((i) => edges[i].on);
  if (!indep1(on) || !indep2(on)) return null;
  let matchL = {}, matchR = {};
  for (let i of on) { matchL[edges[i].a] = i; matchR[edges[i].b] = i; }
  for (let s = 0; s < nL; s++) {
    if (matchL[s] !== undefined) continue;
    let prev = {}, queue = [s], seenR = {};
    prev[s] = null;
    while (queue.length) {
      let u = queue.shift();
      for (let i = 0; i < edges.length; i++) {
        let e = edges[i];
        if (e.a !== u || e.on || seenR[e.b] !== undefined) continue;   // 辺番号 0 も到達済みとして扱う
        seenR[e.b] = i;
        if (matchR[e.b] === undefined) {           // 未使用の右頂点に着いた：道を復元
          let out = [i], v = u;
          while (prev[v] !== null) {                 // 使用辺 → それに着いた未使用辺 → … と戻る
            let m2 = prev[v], i2 = seenR[edges[m2].b];
            out.push(m2, i2); v = edges[i2].a;
          }
          return out.reverse();
        }
        let m = matchR[e.b], nxt = edges[m].a;
        if (prev[nxt] === undefined) { prev[nxt] = m; queue.push(nxt); }
      }
    }
  }
  return null;
}
function applyPath() { if (!path) return; for (let i of path) edges[i].on = !edges[i].on; path = null; }
function stepAlgo() { if (path) applyPath(); else path = findPath(); }

function draw() {
  background(190, 30, 9);
  if (auto && ++timer % 30 === 0) { if (!path && !findPath()) auto = false; else stepAlgo(); }
  let on = edges.map((e, i) => i).filter((i) => edges[i].on);
  let b1 = bad1(on), b2 = bad2(on);
  let ok1 = b1.length === 0, ok2 = b2.length === 0;

  for (let i = 0; i < edges.length; i++) {
    let e = edges[i], p = posL(e.a), q = posR(e.b);
    let inPath = path && path.includes(i);
    let bad = (b1.includes(e.a) || b2.includes(e.b)) && e.on;
    if (inPath) { stroke(50, 90, 100); strokeWeight(e.on ? 10 : 6); }
    else if (e.on) { stroke(bad ? 5 : 130, 85, 100); strokeWeight(8); }
    else { stroke(0, 0, 40); strokeWeight(2.5); }
    line(p.x, p.y, q.x, q.y);
  }
  for (let i = 0; i < nL; i++) { let p = posL(i); stroke(0, 0, 100); strokeWeight(2); fill(b1.includes(i) ? 5 : on.some((k) => edges[k].a === i) ? 130 : 190, 60, 85); circle(p.x, p.y, 34); noStroke(); fill(0, 0, 10); textSize(14); textAlign(CENTER, CENTER); text('L' + (i + 1), p.x, p.y); }
  for (let j = 0; j < nR; j++) { let q = posR(j); stroke(0, 0, 100); strokeWeight(2); fill(b2.includes(j) ? 5 : on.some((k) => edges[k].b === j) ? 130 : 300, 60, 85); rect(q.x - 17, q.y - 17, 34, 34, 6); noStroke(); fill(0, 0, 10); textSize(14); textAlign(CENTER, CENTER); text('R' + (j + 1), q.x, q.y); }

  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('辺をクリック：入れる・外す　スペース：増加路を探す → 裏返す　A：自動 ' + (auto ? 'ON' : 'off') + '　C：全部外す　R：新しいグラフ', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('M1：左の丸から 1 本まで　M2：右の四角から 1 本まで。両方で独立 = マッチング。黄色 = 増加路（交互の道）', 20, 66);

  let px = width - 440, py = 120;
  noStroke(); fill(0, 0, 100, 8); rect(px - 20, py - 40, 430, 400, 12);
  fill(ok1 ? 130 : 5, 80, 100); textSize(20);
  text('M1（左で 1 本まで）：' + (ok1 ? '独立 ✓' : '従属 ✗　L' + b1.map((v) => v + 1).join(', L') + ' に 2 本以上'), px, py);
  fill(ok2 ? 130 : 5, 80, 100);
  text('M2（右で 1 本まで）：' + (ok2 ? '独立 ✓' : '従属 ✗　R' + b2.map((v) => v + 1).join(', R') + ' に 2 本以上'), px, py + 30);
  fill(0, 0, 100); textSize(24);
  text((ok1 && ok2 ? '共通独立集合（マッチング）' : '共通独立ではない') + '　|I| = ' + on.length, px, py + 76);
  fill(on.length === maxSize && ok1 && ok2 ? 130 : 0, on.length === maxSize && ok1 && ok2 ? 80 : 0, 100); textSize(18);
  text('最大 = ' + maxSize + (on.length === maxSize && ok1 && ok2 ? '　→ 最大共通独立集合 ✓' : ''), px, py + 108);
  fill(50, 90, 100); textSize(16);
  if (path) text('増加路：' + path.map((i) => 'L' + (edges[i].a + 1) + '–R' + (edges[i].b + 1)).join(' → ') + '　（もう一度スペースで裏返す）', px, py + 146);
  else if (ok1 && ok2 && on.length < maxSize) text('スペースで増加路を探す', px, py + 146);
  else if (ok1 && ok2) text('増加路なし → これが最大（増加路定理）', px, py + 146);
  fill(0, 0, 70); textSize(14);
  text('増加路は「未使用辺・使用辺・未使用辺 …」と交互に進む道。', px, py + 184);
  text('裏返すと使用辺が 1 本増え、両方の独立性は保たれる', px, py + 204);
  fill(0, 0, 100); textSize(16); text('マトロイド交差定理（Edmonds）', px, py + 244);
  fill(0, 0, 70); textSize(14);
  text('max |I| = min over A ⊂ E of  r1(A) + r2(E∖A)', px, py + 268);
  text('二部グラフでは König の定理（最大マッチング = 最小頂点被覆）そのもの', px, py + 290);
  text('一般のマトロイド 2 つでも多項式時間で解ける。3 つになると NP 困難', px, py + 312);
  text('応用：有向全域木（arborescence）、2 つの木に分けられるか、割当問題', px, py + 334);
}

function nearestEdge(mx, my) {
  let best = -1, bd = 12;
  for (let i = 0; i < edges.length; i++) {
    let p = posL(edges[i].a), q = posR(edges[i].b);
    let dx = q.x - p.x, dy = q.y - p.y, l2 = dx * dx + dy * dy;
    let t = l2 ? constrain(((mx - p.x) * dx + (my - p.y) * dy) / l2, 0.05, 0.95) : 0;
    let d = dist(mx, my, p.x + t * dx, p.y + t * dy);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function mousePressed() { let i = nearestEdge(mouseX, mouseY); if (i >= 0) { edges[i].on = !edges[i].on; path = null; } }
function keyPressed() {
  if (key === ' ') stepAlgo();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'c' || key === 'C') { for (let e of edges) e.on = false; path = null; }
  if (key === 'r' || key === 'R') randomGraph();
}

// ---------- やってみよう ----------
// 1. 手で「これ以上足せない」マッチングを作ってから、スペースで増加路を探す。極大でも最大とは限らない
// 2. 増加路の長さ（辺の数）はいつも奇数。1 本の道（長さ 1）はただの「空いている辺」
// 3. 左右の頂点数を 5 にする（nL, nR）。全列挙の最大（2^辺数）が重くなるのはどのへん？
// 4. 1 つのマトロイドだけなら貪欲法で最大（06）。2 つの共通部分になると貪欲は失敗する例を作ってみよう（07 のマッチングと同じ）
