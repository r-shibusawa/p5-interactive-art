// ============================================
// 09 最近点探索と最大空円
// サイト = 町のコンビニ。① マウスの場所からいちばん近い店は？（自分がどのセルにいるか）
//   ② 新しい店はどこに建てる？ → どの店からもいちばん遠い場所 = 最大の「空の円」の中心。候補はボロノイの頂点（外心）
// マウス = 現在地 / スペース = 最大空円 / N = いちばん良い場所に出店 / クリック = 出店 / R = ランダム / C = 3 店に戻す
// ============================================

let shops = [];
let cells = [], tris = [], circ = [];
let showEmpty = true;
let dirty = true;
let town;                 // 町の範囲（この中に中心がある円だけ考える）
let topN = 3;             // ★ 表示する候補の数
let history = [];         // 出店したときの最大空円の半径

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  town = { x0: 40, y0: 110, x1: width - 300, y1: height - 30 };
  randomShops(12);
}
function randomShops(n) {
  shops = [];
  for (let i = 0; i < n; i++) shops.push({ x: random(town.x0 + 20, town.x1 - 20), y: random(town.y0 + 20, town.y1 - 20) });
  history = []; dirty = true;
}
function rebuild() {
  cells = shops.map((s, i) => voronoiCell(shops, i, town.x0, town.y0, town.x1, town.y1));
  tris = delaunay(shops);
  circ = tris.map((t) => circumcircle(shops[t[0]], shops[t[1]], shops[t[2]]));
  dirty = false;
}

// ★ 最大空円の候補：町の中にあるボロノイの頂点（外心）。半径 = 3 店までの距離（それより近い店はない）
//   （本当は町の境界とボロノイの辺の交点・町の角も候補になる。ここでは内側の頂点だけ）
function emptyCircles() {
  let list = [];
  for (let c of circ) {
    if (c.x < town.x0 || c.x > town.x1 || c.y < town.y0 || c.y > town.y1 || !isFinite(c.r2)) continue;
    if (list.some((q) => abs(q.x - c.x) < 2 && abs(q.y - c.y) < 2)) continue;   // 4 店が同じ円の上 → 同じ中心が 2 回出るので 1 つに
    list.push({ x: c.x, y: c.y, r: sqrt(c.r2) });
  }
  list.sort((a, b) => b.r - a.r);
  return list;
}

function draw() {
  background(230, 25, 12);
  if (dirty) rebuild();

  // 最寄りの店（全部と比べる：n 回の比較）
  let me = { x: constrain(mouseX, town.x0, town.x1), y: constrain(mouseY, town.y0, town.y1) };
  let best = -1, bd = Infinity;
  for (let i = 0; i < shops.length; i++) { let d = dist(me.x, me.y, shops[i].x, shops[i].y); if (d < bd) { bd = d; best = i; } }

  noStroke(); fill(230, 20, 18); rect(town.x0, town.y0, town.x1 - town.x0, town.y1 - town.y0);
  for (let i = 0; i < cells.length; i++) {
    fill(i === best ? color(190, 60, 55) : color(230, 15, 22)); stroke(0, 0, 60); strokeWeight(1);
    beginShape(); for (let p of cells[i]) vertex(p.x, p.y); endShape(CLOSE);
  }

  // 最大空円
  let ec = emptyCircles();
  if (showEmpty) {
    noStroke(); fill(50, 90, 100, 60);
    for (let c of ec) circle(c.x, c.y, 5);
    for (let k = min(topN, ec.length) - 1; k >= 0; k--) {
      let c = ec[k];
      noFill(); stroke(k === 0 ? color(50, 90, 100) : color(50, 50, 80, 60)); strokeWeight(k === 0 ? 3 : 1.5);
      circle(c.x, c.y, 2 * c.r);
      noStroke(); fill(k === 0 ? color(50, 90, 100) : color(50, 40, 80)); circle(c.x, c.y, 10);
      textSize(14); text((k + 1) + '位 r=' + nf(c.r, 1, 0), c.x + 8, c.y - 8);
    }
  }

  // 店と現在地
  for (let i = 0; i < shops.length; i++) {
    stroke(0, 0, 10); strokeWeight(2); fill(i === best ? color(190, 80, 100) : color(0, 0, 100));
    rect(shops[i].x - 7, shops[i].y - 7, 14, 14, 3);
  }
  if (best >= 0) {
    stroke(190, 80, 100); strokeWeight(2); line(me.x, me.y, shops[best].x, shops[best].y);
    noStroke(); fill(0, 80, 100); circle(me.x, me.y, 12);
  }

  // 右のパネル：出店するたびの最大空円の半径
  let px = width - 280;
  noStroke(); fill(0, 0, 0, 40); rect(px, 110, 260, 260, 8);
  fill(0, 0, 100); textSize(14); text('出店のたびの最大空円の半径', px + 12, 132);
  if (history.length) {
    let mx = max(history);
    for (let k = 0; k < history.length; k++) {
      let bw = min(20, 236 / history.length), bh = history[k] / mx * 200;
      fill(50, 80, 90); rect(px + 12 + k * bw, 360 - bh, bw - 2, bh);
    }
  }
  fill(0, 0, 70); textSize(13);
  text('N を押すたびに「いちばん遠い所」', px + 12, 395);
  text('に建てる。半径はどう減っていく？', px + 12, 415);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('マウス：現在地　スペース：最大空円 ' + (showEmpty ? 'ON' : 'off') + '　N：最適な場所に出店　クリック：出店　R：ランダム　C：3 店に戻す　店 ' + shops.length, 20, 40);
  fill(0, 0, 65); textSize(15);
  text('最寄りの店 = 自分がいるセルのサイト（距離 ' + nf(bd === Infinity ? 0 : bd, 1, 0) + 'px）。黄の点 = ボロノイの頂点。その外接円の中には店がない（空の円）。いちばん大きい円の中心 = 新しい店の候補', 20, 68);
}

function addShop(x, y) {
  let ec = emptyCircles();
  history.push(ec.length ? ec[0].r : 0);
  shops.push({ x, y }); dirty = true;
}
function mousePressed() {
  if (mouseX > town.x0 && mouseX < town.x1 && mouseY > town.y0 && mouseY < town.y1) addShop(mouseX, mouseY);
}
function keyPressed() {
  if (key === ' ') showEmpty = !showEmpty;
  if (key === 'n' || key === 'N') { let ec = emptyCircles(); if (ec.length) addShop(ec[0].x, ec[0].y); }
  if (key === 'r' || key === 'R') randomShops(floor(random(6, 20)));
  if (key === 'c' || key === 'C') randomShops(3);
}

// ---------- やってみよう ----------
// 1. N を 10 回押して、店がどんな並びになるか見よう。半径のグラフはどう減る？
// 2. 町の角は候補に入れていない。角に住む人がいちばん遠いこともある。角（4 点）を候補に足してみよう
// 3. 逆に「ゴミ処理場はどこに？」= 家（サイト）からいちばん遠い場所。同じ計算で答えが出る
// 4. 最寄り探しは今「全部と比べる」。点が 100 万個だったら？ ボロノイのセルをたどる方法・格子に分ける方法を考えよう


// ==================================================
// ここから下は「ボロノイ図の道具」（ほかのスケッチにもそのままコピーして使える）
//   voronoiCell(sites, i, x0, y0, x1, y1) … サイト i の領域（多角形）。長方形を垂直二等分線で切っていく（O(n²)）
//   delaunay(pts) … ドロネー三角形分割（Bowyer–Watson 法）。[[i, j, k], ...] を返す
//   circumcircle(a, b, c) … 外接円 {x, y, r2}（r2 = 半径の 2 乗）
//   polyArea(poly) / polyCentroid(poly) … 多角形の面積と重心
// ==================================================
function voronoiCell(sites, i, x0, y0, x1, y1) {
  let poly = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  let a = sites[i];
  for (let j = 0; j < sites.length && poly.length > 2; j++) {
    if (j === i) continue;
    let b = sites[j];
    // a の側 ＝ (b − a)・p ≦ (|b|² − |a|²) / 2　（a と b の垂直二等分線で切る）
    poly = clipHalfPlane(poly, b.x - a.x, b.y - a.y, (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y) / 2);
  }
  return poly;
}
// nx·x + ny·y ≦ c の側だけ残す（Sutherland–Hodgman の 1 本分）
function clipHalfPlane(poly, nx, ny, c) {
  let out = [];
  for (let k = 0; k < poly.length; k++) {
    let p = poly[k], q = poly[(k + 1) % poly.length];
    let dp = nx * p.x + ny * p.y - c, dq = nx * q.x + ny * q.y - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      let t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}
function polyArea(poly) {
  let s = 0;
  for (let k = 0; k < poly.length; k++) { let p = poly[k], q = poly[(k + 1) % poly.length]; s += p.x * q.y - q.x * p.y; }
  return Math.abs(s) / 2;
}
function polyCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let k = 0; k < poly.length; k++) {
    let p = poly[k], q = poly[(k + 1) % poly.length], cr = p.x * q.y - q.x * p.y;
    a += cr; cx += (p.x + q.x) * cr; cy += (p.y + q.y) * cr;
  }
  if (Math.abs(a) < 1e-9) {
    let sx = 0, sy = 0;
    for (let p of poly) { sx += p.x; sy += p.y; }
    return poly.length ? { x: sx / poly.length, y: sy / poly.length } : { x: 0, y: 0 };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}
function circumcircle(a, b, c) {
  let d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, r2: Infinity };
  let a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  let x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  let y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { x, y, r2: (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) };
}
// Bowyer–Watson：点を 1 つずつ入れ、「外接円の中に新しい点がある三角形」を消して穴を新しい点とつなぐ
function delaunay(pts) {
  let n = pts.length;
  if (n < 3) return [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  let m = Math.max(x1 - x0, y1 - y0, 1) * 20, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let P = pts.concat([{ x: cx - m, y: cy - m }, { x: cx + m, y: cy - m }, { x: cx, y: cy + m }]);   // 全部を囲む大きな三角形
  let mk = (i, j, k) => ({ v: [i, j, k], c: circumcircle(P[i], P[j], P[k]) });
  let tris = [mk(n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    let p = P[i], edges = new Map(), keep = [];
    for (let t of tris) {
      if ((p.x - t.c.x) * (p.x - t.c.x) + (p.y - t.c.y) * (p.y - t.c.y) < t.c.r2) {
        for (let e = 0; e < 3; e++) {
          let a = t.v[e], b = t.v[(e + 1) % 3], id = a < b ? a + '_' + b : b + '_' + a;
          if (edges.has(id)) edges.delete(id); else edges.set(id, [a, b]);   // 2 回出た辺 = 穴の内側なので消す
        }
      } else keep.push(t);
    }
    for (let [a, b] of edges.values()) keep.push(mk(a, b, i));
    tris = keep;
  }
  return tris.filter((t) => t.v[0] < n && t.v[1] < n && t.v[2] < n).map((t) => t.v);
}
