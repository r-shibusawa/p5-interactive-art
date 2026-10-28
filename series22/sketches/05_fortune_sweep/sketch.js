// ============================================
// 05 フォーチュンのアルゴリズム（掃引線）
// 水平な線（掃引線）を上から下へ動かしながらボロノイ図を作る、速い方法 O(n log n) のしくみを見る
//   掃引線より上のサイトごとに「サイトと掃引線から等距離」の放物線ができる。その下側の包み = 汀線（ビーチライン）
//   ビーチラインより上は、もう答えが決まった場所。放物線どうしの交点がボロノイの辺をなぞっていく
// スペース = 一時停止 / ↑↓ = 速さ / ←→ = 手で動かす / P = 放物線 / クリック = サイトを追加 / R = ランダム
// ============================================

let sites = [];
let ly = 90;              // 掃引線の y
let speed = 1.5;          // ★ 掃引線の速さ（px / フレーム）
let paused = false;
let showPar = true;
let cells = [], tris = [], circ = [];
let beach = [];           // 各 x のビーチラインの y
let flashes = [];         // イベントの光
let res = 5, buf, gw, gh, cols = [];
let dirty = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  gw = ceil(width / res); gh = ceil(height / res);
  buf = createGraphics(gw, gh);
  buf.pixelDensity(1);
  randomSites(18);
}
function randomSites(n) {
  sites = [];
  for (let i = 0; i < n; i++) sites.push({ x: random(60, width - 60), y: random(130, height - 60) });
  ly = 90; dirty = true;
}
function rebuild() {
  cells = sites.map((s, i) => voronoiCell(sites, i, 0, 90, width, height));
  tris = delaunay(sites);
  circ = tris.map((t) => circumcircle(sites[t[0]], sites[t[1]], sites[t[2]]));
  cols = sites.map((s, i) => hsbToRgb((i * 137.5) % 360, 40, 70));
  dirty = false;
}

// ★ サイト s と掃引線 y = L から等距離の点の y（放物線）
function parabolaY(s, x, L) { return (L * L - s.y * s.y - (x - s.x) * (x - s.x)) / (2 * (L - s.y)); }

function computeBeach() {
  beach = new Array(width + 1);
  for (let x = 0; x <= width; x++) {
    let y = -Infinity;
    for (let s of sites) if (ly - s.y > 0.5) y = Math.max(y, parabolaY(s, x, ly));
    beach[x] = y;
  }
}
function beachAt(x) { return beach[constrain(round(x), 0, width)]; }

// ビーチラインより上だけ、いちばん近いサイトの色で塗る
function paintBuffer() {
  buf.loadPixels();
  let px = buf.pixels;
  for (let gx = 0; gx < gw; gx++) {
    let x = (gx + 0.5) * res, by = beachAt(x);
    for (let gy = 0; gy < gh; gy++) {
      let y = (gy + 0.5) * res, k = 4 * (gx + gy * gw);
      if (y >= by || y < 90) { px[k + 3] = 0; continue; }
      let best = 0, bd = Infinity;
      for (let i = 0; i < sites.length; i++) { let d = (x - sites[i].x) ** 2 + (y - sites[i].y) ** 2; if (d < bd) { bd = d; best = i; } }
      let c = cols[best];
      px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; px[k + 3] = 255;
    }
  }
  buf.updatePixels();
}

// 完成図のボロノイの辺のうち、ビーチラインより上の部分だけかく
function drawFixedEdges() {
  stroke(0, 0, 100); strokeWeight(2.5);
  for (let poly of cells) {
    for (let k = 0; k < poly.length; k++) {
      let p = poly[k], q = poly[(k + 1) % poly.length];
      if ((p.y <= 90.5 && q.y <= 90.5) || (p.x <= 0.5 && q.x <= 0.5) || (p.x >= width - 0.5 && q.x >= width - 0.5) || (p.y >= height - 0.5 && q.y >= height - 0.5)) continue;   // 画面のふち
      let n = max(1, ceil(dist(p.x, p.y, q.x, q.y) / 5)), run = -1;
      for (let j = 0; j <= n; j++) {
        let t = j / n, x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
        let vis = y < beachAt(x);
        if (vis && run < 0) run = t;
        if ((!vis || j === n) && run >= 0) {
          let t2 = vis ? t : (j - 1) / n;
          line(p.x + (q.x - p.x) * run, p.y + (q.y - p.y) * run, p.x + (q.x - p.x) * t2, p.y + (q.y - p.y) * t2);
          run = -1;
        }
      }
    }
  }
}

function draw() {
  background(230, 25, 12);
  if (dirty) rebuild();
  let prev = ly;
  if (!paused) ly += speed;
  if (ly > height * 1.8) ly = 90;              // 下まで行ったら最初から
  // イベント：サイトイベント（掃引線がサイトを通過）と円イベント（外接円のいちばん下を通過 = ボロノイの頂点が決まる）
  for (let s of sites) if (prev < s.y && ly >= s.y) flashes.push({ x: s.x, y: s.y, t: 30, site: true });
  for (let c of circ) { let bottom = c.y + sqrt(c.r2); if (prev < bottom && ly >= bottom) flashes.push({ x: c.x, y: c.y, t: 40, site: false, r: sqrt(c.r2) }); }

  computeBeach();
  paintBuffer();
  image(buf, 0, 0, gw * res, gh * res);
  drawFixedEdges();

  // 決まったボロノイの頂点
  noStroke(); fill(50, 90, 100);
  for (let c of circ) if (ly >= c.y + sqrt(c.r2)) circle(c.x, c.y, 8);

  // 放物線（1 つずつ）とビーチライン
  noFill();
  if (showPar) {
    stroke(190, 60, 100, 30); strokeWeight(1);
    for (let s of sites) {
      if (ly - s.y <= 0.5) continue;
      beginShape();
      for (let x = 0; x <= width; x += 8) { let y = parabolaY(s, x, ly); if (y > 90) vertex(x, y); else { endShape(); beginShape(); } }
      endShape();
    }
  }
  stroke(190, 90, 100); strokeWeight(3);
  beginShape();
  for (let x = 0; x <= width; x += 4) vertex(x, max(90, beach[x]));
  endShape();

  // 光るイベント
  for (let f of flashes) {
    f.t--;
    if (f.site) { stroke(130, 80, 100, f.t * 3); strokeWeight(2); line(f.x, f.y, f.x, ly); }
    else { noFill(); stroke(50, 90, 100, f.t * 2.5); strokeWeight(2); circle(f.x, f.y, 2 * f.r); }
  }
  flashes = flashes.filter((f) => f.t > 0);

  // 掃引線とサイト
  stroke(0, 80, 100); strokeWeight(2); line(0, ly, width, ly);
  for (let s of sites) { stroke(0, 0, 10); strokeWeight(2); fill(s.y < ly ? color(0, 0, 100) : color(0, 0, 45)); circle(s.x, s.y, 11); }

  noStroke(); fill(0, 0, 0, 55); rect(0, 0, width, 84);
  fill(0, 0, 100); textSize(18);
  text('スペース：' + (paused ? '再開' : '一時停止') + '　↑↓：速さ ' + nf(speed, 1, 1) + '　←→：手で動かす　P：放物線 ' + (showPar ? 'ON' : 'off') + '　クリック：追加　R：ランダム', 20, 40);
  fill(0, 0, 80); textSize(15);
  text('赤 = 掃引線、水色 = ビーチライン（放物線の下側の包み）。それより上は答えが決まった場所。緑の光 = サイトイベント（新しい放物線）、黄の円 = 円イベント（頂点が決まる）', 20, 68);
}

function mousePressed() { if (mouseY > 90) { sites.push({ x: mouseX, y: mouseY }); dirty = true; } }
function keyPressed() {
  if (key === ' ') paused = !paused;
  if (key === UP_ARROW) speed = min(8, speed + 0.5);
  if (key === DOWN_ARROW) speed = max(0.5, speed - 0.5);
  if (key === RIGHT_ARROW) { paused = true; ly = min(height * 1.8, ly + 12); }
  if (key === LEFT_ARROW) { paused = true; ly = max(90, ly - 12); }
  if (key === 'p' || key === 'P') showPar = !showPar;
  if (key === 'r' || key === 'R') randomSites(floor(random(8, 30)));
}

// ---------- やってみよう ----------
// 1. ←→ で少しずつ動かし、2 本の放物線の交点が、ちょうどボロノイの辺の上を動くことを確かめよう
// 2. 放物線が 1 本消える瞬間（円イベント）を見つけよう。そのとき掃引線は外接円のいちばん下に触れている
// 3. 掃引線の真上にあるサイトの放物線はとても細い（縦線）。掃引線から離れるほど広がるのはなぜ？
// 4. 本物のフォーチュン法は「イベントの順番待ちの列（優先度つきキュー）」と「ビーチラインの木」で O(n log n)。
//    このスケッチはすべての x で放物線を全部調べている（遅いが見やすい）。どこが速くできるか考えよう

// 色の変換（HSB → RGB 0〜255）
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  let k = (n) => (n + h / 60) % 6;
  let f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return [255 * f(5), 255 * f(3), 255 * f(1)];
}


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
