// ============================================
// 09 トロピカル行列積 = 最短経路
// 距離行列 A（辺がなければ ∞）のトロピカル積 (A ⊗ B)_ij = min_k (A_ik + B_kj)
//   A^{⊗k} の (i, j) 成分 = 「k 本以下の辺を使う i → j の最短距離」。k を増やすと ∞ が埋まっていく
//   A^{⊗(n−1)} = すべての最短距離（Floyd–Warshall と同じ答え）
// ノードをドラッグ（辺の長さが変わる）/ ↑↓ = k / クリック = 出発点を選ぶ / R = 辺を引き直す
// ============================================

let n = 6;                 // ★ ノード数
let nodes = [], arcs = [];  // arcs = 有向辺 {u, v}
let k = 1;                 // 行列のべき
let src = 0;               // 出発点
let dragging = -1;
let INF = Infinity;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Helvetica');
  for (let i = 0; i < n; i++) nodes.push({ x: width * 0.28 + 200 * Math.cos(TWO_PI * i / n - 1.2), y: height * 0.5 + 200 * Math.sin(TWO_PI * i / n - 1.2) });
  makeArcs();
}
function makeArcs() {
  arcs = [];
  for (let i = 0; i < n; i++) arcs.push({ u: i, v: (i + 1) % n });                  // 一周する輪
  for (let i = 0; i < n; i++) if (random() < 0.5) arcs.push({ u: i, v: (i + 2) % n });  // ★ 近道をいくつか
  arcs.push({ u: 3, v: 0 });
}
function wgt(a) { return Math.round(dist(nodes[a.u].x, nodes[a.u].y, nodes[a.v].x, nodes[a.v].y) / 30); }   // ★ 辺の長さ → 重み

// ★ 距離行列 A とトロピカル積
function matrixA() {
  let A = [];
  for (let i = 0; i < n; i++) { A.push([]); for (let j = 0; j < n; j++) A[i].push(i === j ? 0 : INF); }
  for (let a of arcs) A[a.u][a.v] = Math.min(A[a.u][a.v], wgt(a));
  return A;
}
function tmul(A, B) {
  let C = [];
  for (let i = 0; i < n; i++) { C.push([]); for (let j = 0; j < n; j++) { let m = INF; for (let l = 0; l < n; l++) m = Math.min(m, A[i][l] + B[l][j]); C[i].push(m); } }
  return C;
}
// 出発点 src からの「k 本以下」の最短経路（前の点を覚えておく：ベルマン・フォードの 1 段ずつ）
function pathsFrom(A) {
  let best = [[]];
  for (let v = 0; v < n; v++) best[0].push({ d: v === src ? 0 : INF, prev: -1, L: 0 });
  for (let s = 1; s <= k; s++) {
    best.push([]);
    for (let v = 0; v < n; v++) {
      let cur = best[s - 1][v], cand = { d: cur.d, prev: cur.prev, L: cur.L };
      for (let u = 0; u < n; u++) if (best[s - 1][u].d + A[u][v] < cand.d - 1e-9) cand = { d: best[s - 1][u].d + A[u][v], prev: u, L: s - 1 };
      best[s].push(cand);
    }
  }
  return best;
}

function draw() {
  background(190, 55, 10);
  let A = matrixA(), P = A, Pprev = null;
  for (let s = 2; s <= k; s++) { Pprev = P; P = tmul(P, A); }
  let best = pathsFrom(A);

  // 辺
  for (let a of arcs) {
    let u = nodes[a.u], v = nodes[a.v], ang = atan2(v.y - u.y, v.x - u.x);
    stroke(0, 0, 100, 35); strokeWeight(2);
    line(u.x, u.y, v.x - 22 * cos(ang), v.y - 22 * sin(ang));
    noStroke(); fill(0, 0, 100, 35);
    push(); translate(v.x - 22 * cos(ang), v.y - 22 * sin(ang)); rotate(ang); triangle(0, 0, -12, 6, -12, -6); pop();
    fill(0, 0, 80); textSize(13); text(wgt(a), (u.x + v.x) / 2 + 8, (u.y + v.y) / 2 - 6);
  }
  // 最短経路（k 本以下）を太く
  for (let v = 0; v < n; v++) {
    if (best[k][v].d === INF || v === src) continue;
    let cur = v, lv = k, guard = 0;
    while (cur !== src && guard++ < 50) {
      let e = best[lv][cur]; if (e.prev < 0) break;
      stroke(90, 80, 100, 80); strokeWeight(5);
      line(nodes[e.prev].x, nodes[e.prev].y, nodes[cur].x, nodes[cur].y);
      cur = e.prev; lv = e.L;
    }
  }
  // ノード
  for (let i = 0; i < n; i++) {
    stroke(0, 0, 10); strokeWeight(2); fill(i === src ? 35 : 330, i === src ? 90 : 60, 100);
    circle(nodes[i].x, nodes[i].y, 40);
    noStroke(); fill(0, 0, 10); textSize(18); textAlign(CENTER, CENTER); text(i, nodes[i].x, nodes[i].y); textAlign(LEFT, BASELINE);
    let dd = best[k][i].d;
    fill(90, 80, 100); textSize(14); text(dd === INF ? '∞' : dd, nodes[i].x + 24, nodes[i].y - 20);
  }

  // 行列
  let mx = width * 0.56, my = 150, cw = 58;
  noStroke(); fill(0, 0, 100); textSize(20);
  text('A^{⊗' + k + '}  （' + k + ' 本以下の辺を使う最短距離）', mx, my - 40);
  fill(0, 0, 60); textSize(12);
  for (let j = 0; j < n; j++) text('→ ' + j, mx + j * cw + cw + 12, my - 12);
  for (let i = 0; i < n; i++) {
    fill(0, 0, 60); textSize(12); text(i + ' →', mx, my + i * cw + cw / 2 + 4);
    for (let j = 0; j < n; j++) {
      let v = P[i][j], isNew = Pprev && Pprev[i][j] === INF && v !== INF, improved = Pprev && Pprev[i][j] !== INF && v < Pprev[i][j];
      fill(v === INF ? 0 : (isNew ? 90 : improved ? 55 : 190), v === INF ? 0 : 70, v === INF ? 25 : (i === src ? 70 : 45));
      rect(mx + j * cw + cw, my + i * cw, cw - 4, cw - 4, 6);
      fill(0, 0, 100); textSize(16); textAlign(CENTER, CENTER);
      text(v === INF ? '∞' : v, mx + j * cw + cw + (cw - 4) / 2, my + i * cw + (cw - 4) / 2);
      textAlign(LEFT, BASELINE);
    }
  }
  fill(0, 0, 65); textSize(14);
  text('緑のマス = この k で初めて有限になった　黄 = 短くなった　明るい行 = 出発点 ' + src, mx, my + n * cw + 24);
  text('(A ⊗ A)_ij = min_l (A_il + A_lj)：「l を経由する行き方の中でいちばん短いもの」', mx, my + n * cw + 48);
  text('ふつうの行列積 Σ_l A_il B_lj の「+ → min, × → +」', mx, my + n * cw + 72);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('↑↓：k = ' + k + '（最大 ' + (n - 1) + '）　クリック：出発点　ドラッグ：ノード（辺の長さが変わる）　R：辺を引き直す', 20, 36);
  fill(0, 0, 65); textSize(15);
  text('緑の太線 = 出発点 ' + src + ' から各ノードへ、' + k + ' 本以下の辺で行く最短経路。ノードの横の数字 = その距離（行列の ' + src + ' 行目と同じ）', 20, 62);
}

function mousePressed() {
  dragging = -1;
  for (let i = 0; i < n; i++) if (dist(mouseX, mouseY, nodes[i].x, nodes[i].y) < 22) dragging = i;
  if (dragging >= 0) src = dragging;
}
function mouseDragged() { if (dragging >= 0) { nodes[dragging].x = constrain(mouseX, 30, width * 0.5); nodes[dragging].y = constrain(mouseY, 90, height - 30); } }
function mouseReleased() { dragging = -1; }
function keyPressed() {
  if (key === UP_ARROW) k = Math.min(n - 1, k + 1);
  if (key === DOWN_ARROW) k = Math.max(1, k - 1);
  if (key === 'r' || key === 'R') makeArcs();
}

// ---------- やってみよう ----------
// 1. k = 1, 2, 3 … と上げて、∞ が埋まる順番を見よう。k = n−1 で全部埋まる？（埋まらないノードがあるのはなぜ？）
// 2. A^{⊗k} = A^{⊗(k+1)} になったら、それ以上は変わらない（最短経路は n−1 本以下）。何本で安定する？
// 3. ノードを動かして近道を長くすると、行列のどこが変わる？
// 4. max 流儀（min → max, ∞ → −∞）にすると「最長経路」。閉路があると発散する。確かめよう
