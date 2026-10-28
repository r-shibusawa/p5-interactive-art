// ============================================
// 06 ロイドの緩和（重心ボロノイ）
// 「サイトを自分のセルの重心へ動かす → ボロノイ図を作り直す」をくり返すと、セルの大きさがそろっていく
//   最後は サイト = セルの重心 になる（重心ボロノイ図）。内側のセルはほとんど六角形 = ハチの巣
// スペース = 緩和 ON/OFF / N = 1 回だけ / ←→ = サイトの数 / M = 重心の矢印 / R = ばらばらに戻す / クリック = 追加
// ============================================

let sites = [];
let nSites = 80;          // ★ サイトの数
let running = false;
let cells = [];
let energy = [];          // エネルギー（点から最寄りのサイトまでの距離² の平均）の履歴
let iter = 0;
let showArrow = true;
let rate = 1.0;           // ★ 重心へどれだけ動くか（1 = 一気に、0.3 = ゆっくり）
let bounds;                  // 計算する範囲

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  bounds = { x0: 20, y0: 100, x1: width - 340, y1: height - 20 };
  scatter();
}

function scatter() {
  sites = [];
  // わざと偏らせて置く（左下に寄せる）と、広がっていく様子がよく見える
  for (let i = 0; i < nSites; i++) {
    let u = random() ** 1.6, v = random() ** 0.7;
    sites.push({ x: lerp(bounds.x0 + 5, bounds.x1 - 5, u), y: lerp(bounds.y0 + 5, bounds.y1 - 5, v) });
  }
  energy = []; iter = 0;
  rebuild();
}
function rebuild() { cells = sites.map((s, i) => voronoiCell(sites, i, bounds.x0, bounds.y0, bounds.x1, bounds.y1)); }

// ★ セル内の点からサイトまでの距離² の積分（多角形の公式）。これが小さいほど「サイトがセルの真ん中」
function cellEnergy(poly, s) {
  let e = 0;
  for (let k = 0; k < poly.length; k++) {
    let ax = poly[k].x - s.x, ay = poly[k].y - s.y, bx = poly[(k + 1) % poly.length].x - s.x, by = poly[(k + 1) % poly.length].y - s.y;
    let cr = ax * by - bx * ay;
    e += cr * (ax * ax + ax * bx + bx * bx + ay * ay + ay * by + by * by);
  }
  return Math.abs(e) / 12;
}

// ロイドの 1 ステップ
function lloydStep() {
  let total = 0, area = 0;
  for (let i = 0; i < sites.length; i++) {
    let poly = cells[i];
    if (poly.length < 3) continue;
    total += cellEnergy(poly, sites[i]); area += polyArea(poly);
    let c = polyCentroid(poly);
    sites[i].x = lerp(sites[i].x, c.x, rate);
    sites[i].y = lerp(sites[i].y, c.y, rate);
  }
  energy.push(area > 0 ? total / area : 0);
  if (energy.length > 200) energy.shift();
  iter++;
  rebuild();
}

// セルの辺の数（画面のふちに触れるセルは数えない）
function sides(poly) {
  for (let p of poly) if (p.x < bounds.x0 + 0.5 || p.x > bounds.x1 - 0.5 || p.y < bounds.y0 + 0.5 || p.y > bounds.y1 - 0.5) return 0;
  let n = 0;
  for (let k = 0; k < poly.length; k++) { let p = poly[k], q = poly[(k + 1) % poly.length]; if (dist(p.x, p.y, q.x, q.y) > 0.5) n++; }
  return n;
}

function draw() {
  background(230, 25, 12);
  if (running) lloydStep();

  // セル：辺の数で色分け（5 = 青, 6 = 緑, 7 = 赤）
  let hist = {}, inner = 0;
  for (let i = 0; i < cells.length; i++) {
    let poly = cells[i], n = sides(poly);
    if (n) { hist[n] = (hist[n] || 0) + 1; inner++; }
    let h = n === 6 ? 130 : n === 5 ? 210 : n === 7 ? 0 : n === 4 ? 270 : n >= 8 ? 30 : 0;
    fill(h, n ? 50 : 0, n ? 60 : 30); stroke(0, 0, 90); strokeWeight(1.2);
    beginShape(); for (let p of poly) vertex(p.x, p.y); endShape(CLOSE);
  }
  // サイトと重心への矢印
  for (let i = 0; i < sites.length; i++) {
    let s = sites[i];
    if (showArrow && cells[i].length > 2) {
      let c = polyCentroid(cells[i]);
      stroke(50, 90, 100); strokeWeight(1.5); line(s.x, s.y, c.x, c.y);
      noStroke(); fill(50, 90, 100); circle(c.x, c.y, 4);
    }
    noStroke(); fill(0, 0, 100); circle(s.x, s.y, 6);
  }

  // 右のパネル：エネルギーのグラフと辺の数のヒストグラム
  let px = width - 320, pw = 300;
  noStroke(); fill(0, 0, 0, 40); rect(px, 100, pw, 230, 8); rect(px, 345, pw, 230, 8);
  fill(0, 0, 100); textSize(14); text('エネルギー（小さいほど整う）', px + 12, 122);
  if (energy.length > 1) {
    let mx = max(energy), mn = min(energy);
    noFill(); stroke(50, 90, 100); strokeWeight(2);
    beginShape();
    for (let k = 0; k < energy.length; k++) vertex(px + 12 + k / 199 * (pw - 24), 315 - (energy[k] - mn) / (mx - mn + 1e-9) * 170);
    endShape();
    noStroke(); fill(0, 0, 80); textSize(13); text(nf(energy[energy.length - 1], 1, 1), px + pw - 70, 122);
  }
  fill(0, 0, 100); textSize(14); text('内側のセルの辺の数', px + 12, 367);
  for (let n = 3; n <= 9; n++) {
    let c = hist[n] || 0, bh = inner ? c / inner * 160 : 0, bx = px + 18 + (n - 3) * 40;
    let h = n === 6 ? 130 : n === 5 ? 210 : n === 7 ? 0 : n === 4 ? 270 : 30;
    fill(h, 50, 70); rect(bx, 555 - bh, 28, bh);
    fill(0, 0, 80); textSize(13); text(n, bx + 9, 570);
  }
  fill(130, 60, 90); textSize(15);
  text('六角形 ' + (inner ? nf(100 * (hist[6] || 0) / inner, 1, 0) : 0) + '%', px + 12, 395);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('スペース：緩和 ' + (running ? 'ON' : 'off') + '　N：1 回　←→：サイト ' + nSites + ' 個　M：矢印　R：ばらばらに　クリック：追加　反復 ' + iter + ' 回', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('黄の矢印 = サイトからセルの重心へ。全員が重心へ動く → 作り直す、をくり返すとエネルギーが下がり、緑（六角形）が増えていく', 20, 68);
}

function mousePressed() {
  if (mouseX > bounds.x0 && mouseX < bounds.x1 && mouseY > bounds.y0 && mouseY < bounds.y1) { sites.push({ x: mouseX, y: mouseY }); nSites = sites.length; rebuild(); }
}
function keyPressed() {
  if (key === ' ') running = !running;
  if (key === 'n' || key === 'N') lloydStep();
  if (key === 'm' || key === 'M') showArrow = !showArrow;
  if (key === 'r' || key === 'R') scatter();
  if (key === RIGHT_ARROW) { nSites = min(250, nSites + 20); scatter(); }
  if (key === LEFT_ARROW) { nSites = max(10, nSites - 20); scatter(); }
}

// ---------- やってみよう ----------
// 1. 何回くらいでエネルギーのグラフが平らになる？ サイトを 20 個と 200 個で比べよう
// 2. rate を 0.3 にするとゆっくり、1.8 にすると行き過ぎる。グラフはどうなる？
// 3. 最後まで六角形にならないセルはどこにある？（ふちの近く・5 角形と 7 角形のペア = 「欠陥」）
// 4. 計算範囲 bounds を円形に切り取る（clipHalfPlane を何回か使う）と、どんな模様に落ち着く？


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
