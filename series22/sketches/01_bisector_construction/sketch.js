// ============================================
// 01 垂直二等分線から作る
// 2 点 A・B から同じ距離の点の集まり = 線分 AB の「垂直二等分線」。A に近い側は半平面（平面の半分）
//   サイト A のセル ＝ 「A が B より近い半平面」を、ほかの全部のサイトについて重ねた（共通部分をとった）もの
// スペース = 次の二等分線で切る / B = 1 つ戻る / ←→ = 注目するサイト / A = 全員のセル / ドラッグ = 動かす / クリック = 追加 / R = ランダム
// ============================================

let sites = [];
let focus = 0;            // 注目しているサイト
let cut = 0;              // 何本目の二等分線まで切ったか
let order = [];           // 切る順番（近いサイトから）
let showAll = false;
let dragging = -1;
let anim = 0;             // 新しい線が出てくるアニメーション 0〜1

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  randomSites(5);
}

function randomSites(n) {
  sites = [];
  for (let i = 0; i < n; i++) sites.push({ x: random(width * 0.2, width * 0.8), y: random(180, height - 80) });
  focus = 0; cut = 0; makeOrder();
}

// ★ 近いサイトから順に切ると、早くセルの形に近づく
function makeOrder() {
  let a = sites[focus];
  order = sites.map((s, j) => j).filter((j) => j !== focus);
  order.sort((p, q) => (sites[p].x - a.x) ** 2 + (sites[p].y - a.y) ** 2 - (sites[q].x - a.x) ** 2 - (sites[q].y - a.y) ** 2);
  cut = constrain(cut, 0, order.length);
}

function hueOf(i) { return (i * 137.5) % 360; }
function screenRect() { return [{ x: 0, y: 90 }, { x: width, y: 90 }, { x: width, y: height }, { x: 0, y: height }]; }

// 線分 ab の垂直二等分線を長くかく
function drawBisector(a, b, t) {
  let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  let dx = -(b.y - a.y), dy = b.x - a.x, L = sqrt(dx * dx + dy * dy) || 1;
  let len = 2000 * t;
  line(mx - dx / L * len, my - dy / L * len, mx + dx / L * len, my + dy / L * len);
}
function drawPoly(poly) { beginShape(); for (let p of poly) vertex(p.x, p.y); endShape(CLOSE); }

function draw() {
  background(230, 25, 12);
  anim = min(1, anim + 0.06);
  if (sites.length === 0) { drawHud(); return; }
  focus = constrain(focus, 0, sites.length - 1);
  let a = sites[focus];

  if (showAll) {
    // 全員のセル（道具の voronoiCell）
    for (let i = 0; i < sites.length; i++) {
      let poly = voronoiCell(sites, i, 0, 90, width, height);
      fill(hueOf(i), 45, 60, 70); stroke(0, 0, 100); strokeWeight(2);
      drawPoly(poly);
    }
  } else {
    // いま切っている二等分線：A の側を薄く塗る（半平面）
    if (cut > 0) {
      let b = sites[order[cut - 1]];
      let half = clipHalfPlane(screenRect(), b.x - a.x, b.y - a.y, (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y) / 2);
      noStroke(); fill(hueOf(focus), 40, 70, 18 * anim);
      drawPoly(half);
    }
    // これまでに切った半平面の共通部分 = セルの途中経過
    let poly = screenRect();
    for (let k = 0; k < cut; k++) {
      let b = sites[order[k]];
      poly = clipHalfPlane(poly, b.x - a.x, b.y - a.y, (b.x * b.x + b.y * b.y - a.x * a.x - a.y * a.y) / 2);
    }
    fill(hueOf(focus), 55, 75, 45); stroke(hueOf(focus), 30, 100); strokeWeight(4);
    drawPoly(poly);
    // 二等分線と、A と B を結ぶ点線
    for (let k = 0; k < cut; k++) {
      let b = sites[order[k]], last = k === cut - 1;
      stroke(0, 0, 100, last ? 90 : 25); strokeWeight(last ? 2 : 1);
      drawBisector(a, b, last ? anim : 1);
      if (last) {
        drawingContext.setLineDash([6, 6]);
        stroke(50, 80, 100); line(a.x, a.y, b.x, b.y);
        drawingContext.setLineDash([]);
        // 中点の直角マーク
        let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ang = atan2(b.y - a.y, b.x - a.x);
        push(); translate(mx, my); rotate(ang); noFill(); stroke(50, 80, 100); rect(0, 0, 12, 12); pop();
      }
    }
  }

  // サイト
  for (let i = 0; i < sites.length; i++) {
    let s = sites[i], isF = i === focus && !showAll;
    let isB = !showAll && cut > 0 && order[cut - 1] === i;
    stroke(0, 0, 10); strokeWeight(2);
    fill(isF ? color(50, 90, 100) : isB ? color(190, 70, 100) : color(0, 0, 100));
    circle(s.x, s.y, isF ? 20 : 14);
    noStroke(); fill(0, 0, 100); textSize(16);
    text(isF ? 'A' : isB ? 'B' : '' + i, s.x + 12, s.y - 10);
  }
  drawHud();
}

function drawHud() {
  noStroke(); fill(0, 0, 100); textSize(18);
  let msg = showAll ? '全員のセル（A でもどる）' : 'スペース：次の線で切る（' + cut + ' / ' + order.length + '）　B：戻る　←→：注目するサイト';
  text(msg + '　A：全員　ドラッグ：動かす　クリック：追加　R：ランダム', 20, 40);
  fill(0, 0, 65); textSize(15);
  let done = cut >= order.length;
  text(showAll ? 'セルはどれも「凸多角形」（へこみがない）。半平面の共通部分は必ず凸になるから'
    : done ? '完成！ 黄色いサイト A のセル。切っても形が変わらなかった線（遠いサイト）もある → セルの辺の数 ≦ サイトの数 − 1'
      : '黄 = A、水色 = B。点線 AB の真ん中を直角に通る線 = 垂直二等分線。薄い色が「A のほうが近い側」。重ねた共通部分がセルになる', 20, 68);
}

function mousePressed() {
  if (mouseY < 90) return;
  for (let i = 0; i < sites.length; i++) if (dist(mouseX, mouseY, sites[i].x, sites[i].y) < 14) { dragging = i; return; }
  if (sites.length < 12) { sites.push({ x: mouseX, y: mouseY }); makeOrder(); }
}
function mouseDragged() {
  if (dragging < 0) return;
  sites[dragging].x = constrain(mouseX, 0, width); sites[dragging].y = constrain(mouseY, 90, height);
  makeOrder();
}
function mouseReleased() { dragging = -1; }

function keyPressed() {
  if (key === ' ') { if (cut < order.length) { cut++; anim = 0; } }
  if (key === 'b' || key === 'B') cut = max(0, cut - 1);
  if (key === RIGHT_ARROW && sites.length) { focus = (focus + 1) % sites.length; cut = 0; makeOrder(); }
  if (key === LEFT_ARROW && sites.length) { focus = (focus + sites.length - 1) % sites.length; cut = 0; makeOrder(); }
  if (key === 'a' || key === 'A') showAll = !showAll;
  if (key === 'r' || key === 'R') randomSites(floor(random(3, 9)));
}

// ---------- やってみよう ----------
// 1. サイトを 2 個にすると、セルは「半平面」そのもの。3 個のとき、3 本の二等分線は 1 点で交わる（外心）。確かめよう
// 2. makeOrder の並べかえをやめる（番号順に切る）と、途中経過がどう変わる？ 最後の形は同じ？
// 3. A を囲むようにサイトを 6 個並べると、セルは何角形？ 遠くにもう 1 個置くとセルは変わる？
// 4. 全員のセル（A）で、セルの辺の数を数えよう。平均すると何角形くらい？（06 で答え合わせ）


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
