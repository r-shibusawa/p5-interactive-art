// ============================================
// 15 カメラでボロノイとドロネー（おまけ）
// カメラの映像を小さなマス目に分け、各マスでいちばん明るい画素を「母点」にする
//   母点が動くとボロノイ図（面）とドロネー三角形分割（頂点をつなぐ）が同時に動く（02 の双対をライブで）
//   カメラが使えないときはランダムに動く点で代用（カメラの許可が必要）
// V = ボロノイ / D = ドロネー / B = 両方 / ←→ = 明るさのしきい値 / ↑↓ = マス目の数
// ============================================

let cap;
let vw = 96, vh = 72;          // ★ カメラ画像の大きさ（小さいほど速い）
let cols = 8, rows = 6;        // ★ マス目の数（母点の最大数 = cols × rows）
let thr = 120;                 // ★ この明るさより暗いマスは母点にしない
let viewMode = 'B';            // 'V' / 'D' / 'B'
let sites = [];                // 母点（画面座標、なめらかに追いかける）
let movers = [];               // カメラがないときの点
let camOK = false;
let follow = 0.25;             // ★ 母点の追従のなめらかさ

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  cap = createCapture(VIDEO, { flipped: true });
  cap.size(vw, vh);
  cap.hide();
  for (let i = 0; i < 24; i++) movers.push({ x: random(width), y: random(100, height - 40), vx: random(-1.5, 1.5), vy: random(-1.5, 1.5) });
}
function fieldRect() { return { x: 20, y: 95, w: width - 40, h: height - 130 }; }

// ★ 各マスでいちばん明るい画素を探す → 目標の母点
function brightTargets() {
  cap.loadPixels();
  if (cap.width === 0 || cap.pixels.length < vw * vh * 4) return null;
  let A = fieldRect(), out = [], px = cap.pixels, all = [];
  let cw = vw / cols, ch = vh / rows;
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    let best = -1, bx = 0, by = 0;
    for (let y = Math.floor(gy * ch); y < Math.floor((gy + 1) * ch); y++) for (let x = Math.floor(gx * cw); x < Math.floor((gx + 1) * cw); x++) {
      let i = (x + y * vw) * 4, b = px[i] + px[i + 1] + px[i + 2];
      if (b > best) { best = b; bx = x; by = y; }
    }
    let site = { x: A.x + (bx + 0.5) / vw * A.w, y: A.y + (by + 0.5) / vh * A.h, b: best / 3 };
    all.push(site);
    if (best / 3 >= thr) out.push(site);
  }
  // しきい値を超えるマスが 3 つ未満なら、明るい順に 3 つは必ず使う
  if (out.length < 3) out = all.sort((p, q) => q.b - p.b).slice(0, 3);
  return out;
}

function draw() {
  background(250, 40, 10);
  let A = fieldRect();
  let targets = brightTargets();
  camOK = targets !== null;
  if (!camOK) {
    for (let m of movers) { m.x += m.vx; m.y += m.vy; if (m.x < A.x || m.x > A.x + A.w) m.vx *= -1; if (m.y < A.y || m.y > A.y + A.h) m.vy *= -1; }
    targets = movers;
    if (mouseX > A.x && mouseX < A.x + A.w && mouseY > A.y && mouseY < A.y + A.h) targets = movers.concat([{ x: mouseX, y: mouseY }]);
  }
  // 母点をなめらかに動かす（数が変わったら合わせる）
  while (sites.length < targets.length) sites.push({ x: targets[sites.length].x, y: targets[sites.length].y });
  sites.length = targets.length;
  for (let i = 0; i < sites.length; i++) { sites[i].x = lerp(sites[i].x, targets[i].x, follow); sites[i].y = lerp(sites[i].y, targets[i].y, follow); }
  // 同じ場所に重なった点を少しずらす（退化を避ける）
  for (let i = 0; i < sites.length; i++) for (let j = 0; j < i; j++) if (Math.abs(sites[i].x - sites[j].x) < 1 && Math.abs(sites[i].y - sites[j].y) < 1) { sites[i].x += 1.5; sites[i].y += 0.7; }

  // カメラの映像を薄く背景に
  if (camOK) { push(); tint(0, 0, 100, 25); image(cap, A.x, A.y, A.w, A.h); pop(); }
  noFill(); stroke(0, 0, 35); strokeWeight(1); rect(A.x, A.y, A.w, A.h);

  let tris = sites.length >= 3 ? delaunay(sites) : [];
  let cells = sites.length >= 2 ? voronoiCells(sites, A.x, A.y, A.x + A.w, A.y + A.h) : [];
  if (viewMode !== 'D') {
    for (let i = 0; i < cells.length; i++) {
      let c = cells[i]; if (c.length < 3) continue;
      noStroke(); fill(180 + (i * 29) % 80, 60, 70, 20);
      beginShape(); for (let p of c) vertex(p.x, p.y); endShape(CLOSE);
      noFill(); stroke(180, 70, 100, 85); strokeWeight(2); beginShape(); for (let p of c) vertex(p.x, p.y); endShape(CLOSE);
    }
  }
  if (viewMode !== 'V') {
    stroke(10, 80, 100, 80); strokeWeight(1.5);
    for (let t of tris) { line(sites[t.a].x, sites[t.a].y, sites[t.b].x, sites[t.b].y); line(sites[t.b].x, sites[t.b].y, sites[t.c].x, sites[t.c].y); line(sites[t.c].x, sites[t.c].y, sites[t.a].x, sites[t.a].y); }
  }
  if (viewMode === 'B') { noStroke(); fill(55, 90, 100); for (let t of tris) if (t.cx > A.x && t.cx < A.x + A.w && t.cy > A.y && t.cy < A.y + A.h) circle(t.cx, t.cy, 5); }
  noStroke(); fill(0, 0, 100); for (let s of sites) circle(s.x, s.y, 8);

  fill(0, 0, 100); textSize(18);
  text((camOK ? '📷 カメラ：明るい点 ' + sites.length + ' 個が母点' : 'カメラなし → 動く点 ' + sites.length + ' 個（マウスも母点）') + '　V：ボロノイ　D：ドロネー　B：両方（いま ' + viewMode + '）　しきい値 ' + thr + '（←→）　マス目 ' + cols + '×' + rows + '（↑↓）', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('スマホのライトや白い紙を動かすと母点が追いかける。面（ボロノイ）と頂点（ドロネー）は同じ点から作られ、いつも連動する。暗い部屋でライトを 3 つ振ってみよう', 20, 68);
}

function keyPressed() {
  if (key === 'v' || key === 'V') viewMode = 'V';
  if (key === 'd' || key === 'D') viewMode = 'D';
  if (key === 'b' || key === 'B') viewMode = 'B';
  if (key === RIGHT_ARROW) thr = Math.min(250, thr + 10);
  if (key === LEFT_ARROW) thr = Math.max(0, thr - 10);
  if (key === UP_ARROW) { cols = Math.min(12, cols + 1); rows = Math.min(9, rows + 1); }
  if (key === DOWN_ARROW) { cols = Math.max(2, cols - 1); rows = Math.max(2, rows - 1); }
}

// ---------- やってみよう ----------
// 1. しきい値を上げて母点を減らす。3 個になると三角形 1 つとボロノイの頂点 1 つ
// 2. ライトを 1 つだけ振ると、その周りの面だけが変わる（局所性）
// 3. 明るい点の代わりに「赤い点」を母点にする（R が G・B より大きい画素）
// 4. ボロノイの面を母点の明るさ b で塗り分ける（明るいほど白く）


// ==================================================
// ここから下は「ボロノイ・ドロネーの道具」（02 と同じ。読まなくても OK）
// ==================================================
function makeTri(P, a, b, c) {
  let A = P[a], B = P[b], C = P[c];
  let d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(d) < 1e-9) d = 1e-9;
  let a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
  let cx = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d;
  let cy = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
  return { a, b, c, cx, cy, r2: (A.x - cx) ** 2 + (A.y - cy) ** 2 };
}
function delaunay(P0) {
  let n = P0.length, big = 1e5;
  let P = P0.concat([{ x: -big, y: -big }, { x: big, y: -big }, { x: 0, y: big }]);
  let tris = [makeTri(P, n, n + 1, n + 2)];
  for (let i = 0; i < n; i++) {
    let bad = [], keep = [];
    for (let t of tris) (((P[i].x - t.cx) ** 2 + (P[i].y - t.cy) ** 2 < t.r2) ? bad : keep).push(t);
    let edges = [];
    for (let t of bad) for (let [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
      let shared = bad.some((u) => u !== t && [[u.a, u.b], [u.b, u.c], [u.c, u.a]].some(([p, q]) => (p === a && q === b) || (p === b && q === a)));
      if (!shared) edges.push([a, b]);
    }
    for (let [a, b] of edges) keep.push(makeTri(P, a, b, i));
    tris = keep;
  }
  return tris.filter((t) => t.a < n && t.b < n && t.c < n);
}
function voronoiCells(P, x0, y0, x1, y1) {
  return P.map((p, i) => {
    let poly = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    for (let j = 0; j < P.length && poly.length; j++) {
      if (j === i) continue;
      let q = P[j], nx = q.x - p.x, ny = q.y - p.y, c = nx * (p.x + q.x) / 2 + ny * (p.y + q.y) / 2;
      poly = clipHalf(poly, nx, ny, c);
    }
    return poly;
  });
}
function clipHalf(poly, nx, ny, c) {
  let out = [];
  for (let i = 0; i < poly.length; i++) {
    let a = poly[i], b = poly[(i + 1) % poly.length];
    let fa = nx * a.x + ny * a.y - c, fb = nx * b.x + ny * b.y - c;
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { let t = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
  }
  return out;
}
