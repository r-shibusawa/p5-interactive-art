// ============================================
// 03 ドロネー三角形分割（Bowyer–Watson 法）
// 点を結んで三角形に分ける方法のうち「どの三角形の外接円の中にも、ほかの点が入らない」もの = ドロネー三角形分割
//   Bowyer–Watson：点を 1 つ入れる → 外接円にその点が入る三角形（赤）を消す → できた穴のふちを新しい点とつなぐ（緑）
// スペース = 1 ステップ / A = 自動 / ↑↓ = 速さ / F = 一気に完成 / クリック = 点を追加 / マウスを三角形に乗せる = 空の円 / R = 作り直し
// ============================================

let P = [];               // 点（0〜2 は全体を囲む大きな三角形の頂点）
let tris = [];            // {v:[i,j,k], c:外接円}
let next = 3;             // 次に入れる点
let phase = 0;            // 0 = 次の点へ, 1 = 赤い三角形を見せる, 2 = 緑の三角形を見せる
let bad = [], fresh = [];
let auto = true;
let wait = 20;            // ★ 自動のとき 1 ステップに何フレームかけるか
let timer = 0;
let nPoints = 40;         // ★ 最初の点の数

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  reset();
}

function reset() {
  let m = max(width, height) * 10, cx = width / 2, cy = height / 2;
  P = [{ x: cx - m, y: cy - m }, { x: cx + m, y: cy - m }, { x: cx, y: cy + m }];
  for (let i = 0; i < nPoints; i++) P.push({ x: random(50, width - 50), y: random(130, height - 40) });
  tris = [mk(0, 1, 2)];
  next = 3; phase = 0; bad = []; fresh = [];
}
function mk(i, j, k) { return { v: [i, j, k], c: circumcircle(P[i], P[j], P[k]) }; }
function inCircle(t, p) { return (p.x - t.c.x) ** 2 + (p.y - t.c.y) ** 2 < t.c.r2; }

// ★ Bowyer–Watson の 1 ステップ
function stepBW() {
  if (next >= P.length) return;
  let p = P[next];
  if (phase === 0) {
    bad = tris.filter((t) => inCircle(t, p));        // 外接円の中に新しい点がある三角形
    fresh = [];
    phase = 1;
  } else if (phase === 1) {
    // 赤い三角形の辺のうち、1 回だけ出てくる辺 = 穴のふち
    let edges = new Map();
    for (let t of bad) for (let e = 0; e < 3; e++) {
      let a = t.v[e], b = t.v[(e + 1) % 3], id = min(a, b) + '_' + max(a, b);
      if (edges.has(id)) edges.delete(id); else edges.set(id, [a, b]);
    }
    tris = tris.filter((t) => !bad.includes(t));
    fresh = [];
    for (let [a, b] of edges.values()) { let t = mk(a, b, next); tris.push(t); fresh.push(t); }
    bad = [];
    phase = 2;
  } else {
    next++; phase = 0; fresh = [];
  }
}

function isReal(t) { return t.v[0] > 2 && t.v[1] > 2 && t.v[2] > 2; }
function triPath(t) { beginShape(); for (let i of t.v) vertex(P[i].x, P[i].y); endShape(CLOSE); }

function draw() {
  background(230, 25, 12);
  if (auto && next < P.length && ++timer >= wait) { timer = 0; stepBW(); }

  // 三角形（大きな三角形につながるものは薄く）
  for (let t of tris) {
    if (isReal(t)) { fill(200, 40, 40, 40); stroke(200, 40, 90); strokeWeight(1.5); }
    else { noFill(); stroke(0, 0, 100, 10); strokeWeight(1); }
    triPath(t);
  }
  // 赤：消される三角形とその外接円
  for (let t of bad) {
    fill(0, 80, 90, 45); stroke(0, 80, 100); strokeWeight(2); triPath(t);
    if (isFinite(t.c.r2) && t.c.r2 < 4e6) { noFill(); stroke(0, 80, 100, 60); circle(t.c.x, t.c.y, 2 * sqrt(t.c.r2)); }
  }
  // 緑：新しくできた三角形
  for (let t of fresh) { fill(130, 70, 80, 45); stroke(130, 70, 100); strokeWeight(2); triPath(t); }

  // 点
  noStroke();
  for (let i = 3; i < P.length; i++) {
    if (i === next) { fill(50, 90, 100); circle(P[i].x, P[i].y, 16); }
    else if (i < next) { fill(0, 0, 100); circle(P[i].x, P[i].y, 8); }
    else { fill(0, 0, 50); circle(P[i].x, P[i].y, 6); }
  }

  // マウスの下の三角形：外接円の中に点がない（空の円）ことを確かめる
  let hover = null;
  for (let t of tris) if (isReal(t) && insideTri(mouseX, mouseY, t)) { hover = t; break; }
  let inside = 0;
  if (hover) {
    for (let i = 3; i < next; i++) if (!hover.v.includes(i) && inCircle(hover, P[i])) inside++;
    noFill(); stroke(inside ? color(0, 80, 100) : color(50, 90, 100)); strokeWeight(2.5);
    circle(hover.c.x, hover.c.y, 2 * sqrt(hover.c.r2));
    fill(50, 90, 100, 40); triPath(hover);
    noStroke(); fill(50, 90, 100); circle(hover.c.x, hover.c.y, 7);
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  let done = next >= P.length;
  text('スペース：1 ステップ　A：自動 ' + (auto ? 'ON' : 'off') + '　↑↓：速さ　F：完成　クリック：点を追加　R：作り直し　点 ' + min(next - 3, P.length - 3) + ' / ' + (P.length - 3) + '　三角形 ' + tris.filter(isReal).length, 20, 40);
  fill(0, 0, 65); textSize(15);
  let msg = done ? '完成。三角形にマウスを乗せると外接円（黄）。どの円の中にもほかの点がない = ドロネー'
    : phase === 1 ? '赤 = 黄色い新しい点が外接円の中に入ってしまう三角形 → 消す'
      : phase === 2 ? '緑 = 穴のふちの辺と新しい点を結んだ三角形。これでまた「空の円」が守られる' : '次の点（黄）を入れる';
  if (hover) msg += '　｜　この外接円の中の点：' + inside + (inside ? ' 個（まだ途中）' : ' 個 ✓ 空の円');
  text(msg, 20, 68);
}

function insideTri(x, y, t) {
  let [a, b, c] = t.v.map((i) => P[i]);
  let s1 = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
  let s2 = (c.x - b.x) * (y - b.y) - (c.y - b.y) * (x - b.x);
  let s3 = (a.x - c.x) * (y - c.y) - (a.y - c.y) * (x - c.x);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
}

function mousePressed() {
  if (mouseY > 90) P.push({ x: mouseX + random(-0.01, 0.01), y: mouseY });
}
function keyPressed() {
  if (key === ' ') { auto = false; stepBW(); }
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'f' || key === 'F') { let guard = 0; while (next < P.length && guard++ < 100000) stepBW(); phase = 0; bad = []; fresh = []; }
  if (key === UP_ARROW) wait = max(1, wait - 4);
  if (key === DOWN_ARROW) wait = min(80, wait + 4);
  if (key === 'r' || key === 'R') reset();
}

// ---------- やってみよう ----------
// 1. 1 点入れるたびに赤い三角形は何個くらい？ 点が増えても平均はあまり増えない（だいたい一定）ことを確かめよう
// 2. 点を正方形の格子にきっちり並べると、4 点が同じ円の上に乗る。どちらの対角線で切られる？（ドロネーは 1 通りに決まらない）
// 3. 完成した図の「いちばん小さい角」を見てみよう。ドロネーは細長い三角形をなるべく作らない分割
// 4. 大きな三角形の頂点 P[0〜2] を画面の中に置くと何が起きる？ 外側の三角形が残ってしまう理由を考えよう


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
