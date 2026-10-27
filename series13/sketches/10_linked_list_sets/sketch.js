// ============================================
// 10 互いに素な集合（連結リスト版）─ 短い方を長い方につなぐ
// 集合を連結リストで表し、どの要素も「自分の集合（代表）」へのポインタを持つ。FIND-SET は O(1)
// UNION は片方のリストをもう片方の後ろにつなぎ、つないだ要素のポインタを全部書きかえる。短い方をつなぐ（重みつき合併）と速い
// 要素を 2 つ順にクリック = UNION / スペース = ランダムに UNION / W = 重みつき合併 ON/OFF / B = 最悪の順番で合併 / R = やり直し
// ============================================

let N = 16;           // ★ 要素の数
let SPEED = 0.25;     // ★ 1 回の UNION の間の秒数（B のとき）

let sets = [];        // [{ id, list: [要素…] }]
let rep = [];         // 要素 → 集合 id
let weighted = true;
let pos = {}, flash = {};
let selected = -1, queue = [], timer = 0;
let updates = 0, unions = 0, lastMsg = '';
let hist = [];        // [重みつき?, 書きかえ合計]

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  sets = []; rep = []; queue = []; selected = -1; updates = 0; unions = 0; flash = {};
  for (let i = 0; i < N; i++) { sets.push({ id: i, list: [i] }); rep[i] = i; }   // MAKE-SET
  lastMsg = `MAKE-SET を ${N} 回：要素が 1 つずつの集合`;
}

function findSet(x) { return rep[x]; }
function setOf(id) { return sets.find((s) => s.id === id); }

// UNION(x, y)：y の集合を x の集合の後ろにつなぐ（重みつきなら短い方を長い方へ）
function union(x, y) {
  let A = setOf(findSet(x)), B = setOf(findSet(y));
  if (A === B) { lastMsg = `${x} と ${y} はもう同じ集合`; return; }
  if (weighted && B.list.length > A.list.length) [A, B] = [B, A];
  for (let e of B.list) { rep[e] = A.id; flash[e] = 1; }
  updates += B.list.length; unions++;
  lastMsg = `UNION：長さ ${B.list.length} のリストを長さ ${A.list.length} のリストの後ろへ → ポインタを ${B.list.length} 個書きかえ`;
  A.list.push(...B.list);
  sets.splice(sets.indexOf(B), 1);
}

function draw() {
  background(100, 25, 9);
  if (queue.length) {
    timer += deltaTime / 1000;
    if (timer > SPEED) { timer = 0; let [a, b] = queue.shift(); union(a, b); if (!queue.length) hist.push([weighted, updates]); }
  }
  let rows = sets.slice().sort((a, b) => min(...a.list) - min(...b.list));
  let rowH = min(46, (height - 260) / max(1, rows.length));
  let nodeW = min(54, (width - 480) / N);
  rows.forEach((s, r) => {
    let y = 150 + r * rowH + rowH / 2;
    s._y = y;
    s.list.forEach((e, j) => {
      let tx = 150 + j * nodeW, ty = y;
      if (!pos[e]) pos[e] = { x: tx, y: ty };
      pos[e].x = lerp(pos[e].x, tx, 0.15); pos[e].y = lerp(pos[e].y, ty, 0.15);
    });
  });
  // 集合オブジェクトと矢印
  rows.forEach((s) => {
    let hue = (s.id * 137) % 360;
    noStroke(); fill(hue, 50, 40); rect(30, s._y - rowH * 0.38, 90, rowH * 0.76, 6);
    fill(0, 0, 100); textAlign(CENTER, CENTER); textSize(min(13, rowH * 0.32));
    text(`集合 ${s.id}（${s.list.length}）`, 75, s._y);
    stroke(hue, 40, 70); strokeWeight(1.5);
    line(120, s._y, pos[s.list[0]].x - nodeW * 0.35, pos[s.list[0]].y);   // head
    for (let j = 0; j < s.list.length - 1; j++) {
      let a = pos[s.list[j]], b = pos[s.list[j + 1]];
      line(a.x + nodeW * 0.35, a.y, b.x - nodeW * 0.35, b.y);
      noStroke(); fill(hue, 40, 70); triangle(b.x - nodeW * 0.35, b.y, b.x - nodeW * 0.35 - 6, b.y - 4, b.x - nodeW * 0.35 - 6, b.y + 4); stroke(hue, 40, 70);
    }
  });
  // 要素
  for (let e = 0; e < N; e++) {
    let p = pos[e], s = setOf(rep[e]), hue = (s.id * 137) % 360;
    flash[e] = (flash[e] || 0) * 0.95;
    // 代表へのポインタ：書きかえた直後と、マウスをのせた行だけ表示
    let hoverRow = abs(mouseY - s._y) < rowH / 2 && mouseX < width - 320;
    if (flash[e] > 0.05 || hoverRow) {
      stroke(hoverRow ? color(hue, 40, 90) : color(0, 0, 100, flash[e] * 100)); strokeWeight(1.5); noFill();
      bezier(p.x, p.y - rowH * 0.3, p.x, p.y - rowH * 0.75, 75, s._y - rowH * 0.75, 75, s._y - rowH * 0.38);
    }
    noStroke();
    fill(selected === e ? color(50, 90, 100) : flash[e] > 0.1 ? color(0, 0, 100) : color(hue, 55, 80));
    rect(p.x - nodeW * 0.35, p.y - rowH * 0.32, nodeW * 0.7, rowH * 0.64, 5);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(min(15, rowH * 0.36)); text(e, p.x, p.y);
  }

  // パネル
  let px = width - 300;
  textAlign(LEFT, TOP); noStroke(); fill(0, 0, 100); textSize(26);
  text('互いに素な集合：連結リスト版', 24, 18);
  textSize(15); fill(0, 0, 80);
  text(`重みつき合併（短い方をつなぐ）：${weighted ? 'ON' : 'OFF'}（W）   集合の数 ${sets.length}   UNION ${unions} 回   ポインタ書きかえ 合計 ${updates} 回`, 24, 56);
  fill(50, 80, 100); textSize(17); text(lastMsg, 24, 88);
  fill(0, 0, 100); textSize(15); text('B（最悪の順番）の結果', px, 150);
  textSize(13);
  hist.slice(-6).forEach(([w, u], j) => { fill(w ? color(100, 60, 90) : color(0, 60, 90)); text(`${w ? '重みつき' : '重みなし'}：${u} 回`, px, 178 + j * 22); });
  fill(0, 0, 70); textSize(12.5);
  text(`重みなし最悪：1+2+…+${N - 1} = ${(N * (N - 1)) / 2}（Θ(n²)）\n重みつき：どの要素も書きかえられるたびに\n集合の大きさが 2 倍以上 → 高々 lg n 回\n合計 O(n lg n) = 最大 ${round(N * log(N) / log(2))}`, px, 330);
  fill(0, 0, 60); textSize(14);
  text('行にマウスをのせると「代表へのポインタ」が見える。要素を 2 つ順にクリック = UNION / スペース = ランダム / W = 重みつき ON/OFF / B = 最悪の順番（重みなしだと遅い）/ R = やり直し', 24, height - 30);
}

function mousePressed() {
  let nodeW = min(54, (width - 480) / N);
  for (let e = 0; e < N; e++) {
    if (abs(mouseX - pos[e].x) < nodeW * 0.4 && abs(mouseY - pos[e].y) < 16) {
      if (selected < 0) selected = e;
      else { union(selected, e); selected = -1; }
      return;
    }
  }
  selected = -1;
}

function keyPressed() {
  if (key === ' ') {
    if (sets.length > 1) { let [A, B] = [random(sets), random(sets)]; if (A !== B) union(A.list[0], B.list[0]); }
    return false;
  }
  if (key === 'w' || key === 'W') weighted = !weighted;
  if (key === 'b' || key === 'B') {
    reset();
    // UNION(x2, x1), UNION(x3, x2), …：どんどん長くなるリストを 1 個の集合の後ろにつなぐ
    for (let i = 0; i < N - 1; i++) queue.push([i + 1, i]);
  }
  if (key === 'r' || key === 'R') reset();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
