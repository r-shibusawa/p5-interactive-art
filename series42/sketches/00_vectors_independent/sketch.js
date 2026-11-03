// ============================================
// 00 ベクトルの線形独立
// 平面（2D）や空間（3D）に並んだベクトルから「いくつか選ぶ」と、その集まりは独立か従属か
//   独立 = どれも他の組み合わせで作れない = 階数（rank）が本数と同じ。従属 = 階数が本数より小さい
//   「独立な部分集合の集まり」がマトロイドの出発点。右の表は大きさごとの独立集合の数
// 先端をクリック = 選ぶ・外す / 先端をドラッグ = 動かす / 2・3 = 平面・空間 / ←→ = 空間を回す / ↑↓ = 本数 / R = ランダム
// ============================================

let dim = 2;                         // ★ 2 = 平面、3 = 空間
let nVec = 4;                        // ★ ベクトルの本数（3〜6）
let vecs = [];                       // {x, y, z, on}
let theta = 0.6;                     // 空間を見る向き
let unit = 110;                      // ★ 1 の長さ（px）
let dragI = -1, dragMoved = false;
let family = [];                     // 大きさごとの独立集合の数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('sans-serif');
  randomVectors();
}

function randomVectors() {
  vecs = [];
  for (let i = 0; i < nVec; i++) {
    let v = { x: random(-2, 2), y: random(-2, 2), z: dim === 3 ? random(-2, 2) : 0, on: false };
    vecs.push(v);
  }
  // 最初から 1 組だけ従属にしておく（3 本目 = 1 本目 + 2 本目）
  if (nVec >= 3) { vecs[2].x = vecs[0].x + vecs[1].x; vecs[2].y = vecs[0].y + vecs[1].y; vecs[2].z = vecs[0].z + vecs[1].z; }
  countFamily();
}

function origin() { return { x: width * 0.38, y: height * 0.55 }; }

// ★ 空間の点 → 画面（縦軸まわりに theta 回し、奥行きは少し下にずらす斜投影）
function toScreen(v) {
  let o = origin();
  if (dim === 2) return { x: o.x + v.x * unit, y: o.y - v.y * unit };
  let c = Math.cos(theta), s = Math.sin(theta);
  let xr = v.x * c + v.z * s, zr = -v.x * s + v.z * c;
  return { x: o.x + xr * unit, y: o.y - v.y * unit + zr * 0.38 * unit };
}
function asRow(v) { return dim === 2 ? [v.x, v.y] : [v.x, v.y, v.z]; }

function chosenRows() { return vecs.filter((v) => v.on).map(asRow); }

// 全部の部分集合を調べて、大きさごとに独立なものを数える
function countFamily() {
  family = new Array(nVec + 1).fill(0);
  for (let m = 1; m < (1 << nVec); m++) {
    let rows = [];
    for (let i = 0; i < nVec; i++) if (m & (1 << i)) rows.push(asRow(vecs[i]));
    if (rankReal(rows) === rows.length) family[rows.length]++;
  }
  family[0] = 1;   // 空集合はいつも独立
}

function draw() {
  background(230, 30, 10);
  let o = origin();
  // 軸
  stroke(0, 0, 35); strokeWeight(1);
  let ax = [{ x: 3, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }, { x: 0, y: 0, z: 3 }];
  for (let k = 0; k < dim; k++) {
    let a = toScreen(ax[k]), b = toScreen({ x: -ax[k].x, y: -ax[k].y, z: -ax[k].z });
    line(a.x, a.y, b.x, b.y);
  }
  if (dim === 3) { // 床のグリッド
    stroke(0, 0, 22);
    for (let i = -2; i <= 2; i++) {
      let a = toScreen({ x: i, y: -2, z: -2 }), b = toScreen({ x: i, y: -2, z: 2 }); line(a.x, a.y, b.x, b.y);
      a = toScreen({ x: -2, y: -2, z: i }); b = toScreen({ x: 2, y: -2, z: i }); line(a.x, a.y, b.x, b.y);
    }
  }

  let rows = chosenRows();
  let r = rankReal(rows), k = rows.length;
  let indep = r === k;
  let hueSel = indep ? 130 : 5;

  // 選んだベクトルの張る空間（直線 or 平面）をうっすら描く
  if (k >= 1 && r === 1) {
    let v = vecs.find((q) => q.on);
    let a = toScreen({ x: v.x * 4, y: v.y * 4, z: v.z * 4 }), b = toScreen({ x: -v.x * 4, y: -v.y * 4, z: -v.z * 4 });
    stroke(hueSel, 60, 70, 50); strokeWeight(2); line(a.x, a.y, b.x, b.y);
  } else if (dim === 3 && k >= 2 && r === 2) {
    let on = vecs.filter((q) => q.on);
    let p = on[0], q = on.find((w) => rankReal([asRow(p), asRow(w)]) === 2) || on[1];
    noStroke(); fill(hueSel, 60, 70, 18);
    beginShape();
    for (let [s, t] of [[2, 2], [2, -2], [-2, -2], [-2, 2]]) { let w = toScreen({ x: p.x * s + q.x * t, y: p.y * s + q.y * t, z: p.z * s + q.z * t }); vertex(w.x, w.y); }
    endShape(CLOSE);
  }

  // ベクトル
  for (let i = 0; i < vecs.length; i++) {
    let v = vecs[i], p = toScreen(v);
    let h = v.on ? hueSel : 210;
    stroke(h, v.on ? 80 : 30, 95); strokeWeight(v.on ? 5 : 2.5);
    line(o.x, o.y, p.x, p.y);
    noStroke(); fill(h, v.on ? 80 : 30, 95); circle(p.x, p.y, v.on ? 18 : 13);
    fill(0, 0, 100); textSize(16); textAlign(LEFT, CENTER);
    text('v' + (i + 1) + '  (' + asRow(v).map((c) => nf(c, 1, 1)).join(', ') + ')', p.x + 12, p.y - 10);
  }
  noStroke(); fill(0, 0, 100); circle(o.x, o.y, 6);

  // 判定
  textAlign(LEFT, BASELINE);
  fill(0, 0, 100); textSize(18);
  text('クリックで選ぶ　ドラッグで動かす　2・3：平面／空間　' + (dim === 3 ? '←→：回す　' : '') + '↑↓：本数 ' + nVec + '　R：ランダム', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('独立 = 階数が本数と同じ。従属なら、選んだうち 1 本は残りの組み合わせで作れる（同じ直線・同じ平面の上にある）', 20, 66);

  let px = width - 360, py = 110;
  fill(0, 0, 100, 8); rect(px - 20, py - 40, 340, 300, 12);
  fill(k === 0 ? 50 : hueSel, k === 0 ? 0 : 80, 100); textSize(30);
  text(k === 0 ? '何も選んでいない' : indep ? '独立 ✓' : '従属 ✗', px, py);
  fill(0, 0, 100); textSize(20);
  text('選んだ本数 |A| = ' + k + '　　階数 r(A) = ' + r, px, py + 40);
  fill(0, 0, 60); textSize(15);
  text(dim === 2 ? '平面では 3 本以上は必ず従属（階数 ≤ 2）' : '空間では 4 本以上は必ず従属（階数 ≤ 3）', px, py + 66);
  fill(0, 0, 100); textSize(18); text('独立集合の数（大きさごと）', px, py + 110);
  for (let s = 0; s <= nVec; s++) {
    fill(s === k && k > 0 ? hueSel : 0, s === k && k > 0 ? 70 : 0, 100);
    text('|A| = ' + s + '：' + family[s] + ' 個' + (family[s] === 0 ? '　（これより大きい独立集合はない）' : ''), px, py + 140 + s * 24);
    if (family[s] === 0) break;
  }
}

function nearestTip(mx, my) {
  let best = -1, bd = 22;
  for (let i = 0; i < vecs.length; i++) { let p = toScreen(vecs[i]); let d = dist(mx, my, p.x, p.y); if (d < bd) { bd = d; best = i; } }
  return best;
}
function mousePressed() { dragI = nearestTip(mouseX, mouseY); dragMoved = false; }
function mouseDragged() {
  if (dragI < 0) return;
  dragMoved = true;
  let v = vecs[dragI];
  let dx = movedX / unit, dy = -movedY / unit;
  if (dim === 2) { v.x += dx; v.y += dy; }
  else { let c = Math.cos(theta), s = Math.sin(theta); v.x += dx * c; v.z += dx * s; v.y += dy; }
  v.x = constrain(v.x, -3, 3); v.y = constrain(v.y, -3, 3); v.z = constrain(v.z, -3, 3);
  countFamily();
}
function mouseReleased() {
  if (dragI >= 0 && !dragMoved) vecs[dragI].on = !vecs[dragI].on;
  dragI = -1;
}
function keyPressed() {
  if (key === '2') { dim = 2; for (let v of vecs) v.z = 0; countFamily(); }
  if (key === '3') { dim = 3; for (let v of vecs) if (v.z === 0) v.z = random(-1.5, 1.5); countFamily(); }
  if (key === LEFT_ARROW) theta -= 0.15;
  if (key === RIGHT_ARROW) theta += 0.15;
  if (key === UP_ARROW) { nVec = min(6, nVec + 1); randomVectors(); }
  if (key === DOWN_ARROW) { nVec = max(3, nVec - 1); randomVectors(); }
  if (key === 'r' || key === 'R') randomVectors();
}

// ---------- やってみよう ----------
// 1. 平面で 2 本だけ選んで、片方をドラッグしてもう片方と同じ直線に乗せる。赤になる瞬間の階数は？
// 2. 空間で 3 本選び、1 本をドラッグして他の 2 本が張る平面（うすい面）に乗せる。「従属」になる
// 3. 右の表で「|A| = 3 が 0 個」になるのはどんなとき？（平面ならいつも。空間なら？）
// 4. 大きさが最大の独立集合（基）はいくつある？ 全部数えると「基の個数」になる

// ==================================================
// ここから下は「マトロイドの道具」（階数の計算）
// ==================================================
// 実数のベクトルの階数（ガウスの消去法。小さい値は 0 とみなす）
function rankReal(rows) {
  let a = rows.map((r) => r.slice());
  let m = a.length, n = m ? a[0].length : 0, rank = 0;
  for (let c = 0; c < n && rank < m; c++) {
    let p = rank;
    for (let i = rank + 1; i < m; i++) if (Math.abs(a[i][c]) > Math.abs(a[p][c])) p = i;
    if (Math.abs(a[p][c]) < 1e-6) continue;
    [a[rank], a[p]] = [a[p], a[rank]];
    for (let i = 0; i < m; i++) {
      if (i === rank) continue;
      let f = a[i][c] / a[rank][c];
      for (let j = c; j < n; j++) a[i][j] -= f * a[rank][j];
    }
    rank++;
  }
  return rank;
}
