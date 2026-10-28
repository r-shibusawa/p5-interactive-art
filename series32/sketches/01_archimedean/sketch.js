// ============================================
// 01 アルキメデスの平面充填（半正則タイリング）
// 2 種類以上の正多角形を使い、「どの頂点のまわりも同じ並び」になる埋め方はちょうど 8 つ
//   頂点のまわりの多角形を順に読んだ「3.4.6.4」などの数字 = 頂点配置（vertex configuration）
// 1〜8 = タイリング / マウス = 頂点を調べる / ↑↓ = 拡大縮小 / S = 保存
// ============================================

let which = 7;          // ★ 最初に見るタイリング（1〜8 キーの番号 − 1）
let zoom = 46;          // ★ 1 辺の長さ（ピクセル）
let tiles = [];         // { cx, cy, n, rot }（座標は 1 辺 = 1 の世界）
let verts = [];         // 頂点 { x, y, list: [[向き, n, タイル番号]] }
let layer;              // タイリングを描いておく画像

// ★ 多角形の色（辺の数で決める）
let colorsByN = { 3: [255, 150, 110], 4: [110, 190, 255], 6: [130, 220, 150], 8: [250, 200, 90], 12: [200, 150, 250] };
let names = ['3.3.3.3.6 ねじれ六角形', '3.6.3.6 三角・六角（カゴメ）', '4.8.8 八角形と正方形', '3.12.12 十二角形と三角形',
  '4.6.12 十二・六・四角形', '3.3.3.4.4 三角形の帯と正方形の帯', '3.3.4.3.4 ねじれ正方形', '3.4.6.4 三・四・六角形'];
let defIndex = [0, 3, 5, 6, 7, 2, 1, 4];   // キー番号 → 下の tilingDef の番号

function setup() {
  createCanvas(windowWidth, windowHeight);
  build();
}

function build() {
  let def = tilingDef(defIndex[which]);
  let reach = Math.hypot(width, height) / 2 / zoom + 3;
  let lmin = Math.min(Math.hypot(def.a1[0], def.a1[1]), Math.hypot(def.a2[0], def.a2[1]));
  tiles = generateTiles(def, Math.ceil(reach / lmin) + 2, reach);
  verts = collectVertices(tiles);
  layer = createGraphics(width, height);
  layer.background(18, 20, 28);
  layer.stroke(18, 20, 28);
  layer.strokeWeight(2);
  for (let t of tiles) {
    let c = colorsByN[t.n];
    layer.fill(c[0], c[1], c[2]);
    layer.beginShape();
    for (let p of polyPts(t)) layer.vertex(width / 2 + p[0] * zoom, height / 2 + p[1] * zoom);
    layer.endShape(CLOSE);
  }
}

function draw() {
  image(layer, 0, 0);
  // マウスにいちばん近い頂点
  let mx = (mouseX - width / 2) / zoom, my = (mouseY - height / 2) / zoom;
  let best = null, bd = 1e9;
  for (let v of verts) {
    let d = Math.hypot(v.x - mx, v.y - my);
    if (d < bd) { bd = d; best = v; }
  }
  if (best) {
    noFill();
    stroke(255);
    strokeWeight(4);
    for (let e of best.list) {
      beginShape();
      for (let p of polyPts(tiles[e[2]])) vertex(width / 2 + p[0] * zoom, height / 2 + p[1] * zoom);
      endShape(CLOSE);
    }
    fill(255);
    noStroke();
    circle(width / 2 + best.x * zoom, height / 2 + best.y * zoom, 12);
  }
  // パネル
  noStroke();
  fill(0, 0, 0, 170);
  rect(10, 10, 430, 290, 10);
  fill(255);
  textSize(20);
  text((which + 1) + '. ' + names[which], 24, 40);
  textSize(15);
  fill(200);
  text('マウスの頂点のまわり：' + (best ? configOf(best) : '—') + '（角の合計 360°）', 24, 66);
  for (let i = 0; i < 8; i++) {
    fill(i === which ? 255 : 140);
    text((i + 1) + '  ' + names[i], 24, 96 + i * 22);
  }
  fill(160);
  text('どの頂点を選んでも同じ数字になる = 半正則', 24, 286);
}

// 頂点のまわりの多角形を、角度の順に読む → 「いちばん小さい読み方」にそろえる
function configOf(v) {
  let s = v.list.slice().sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  let best = null;
  for (let r = 0; r < s.length; r++) {
    for (let arr of [s, s.slice().reverse()]) {
      let c = arr.slice(r).concat(arr.slice(0, r));
      if (!best || lexLess(c, best)) best = c;
    }
  }
  return best.join('.');
}
function lexLess(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

function keyPressed() {
  if (key >= '1' && key <= '8') { which = int(key) - 1; build(); }
  if (key === UP_ARROW) { zoom = Math.min(120, zoom + 6); build(); }
  if (key === DOWN_ARROW) { zoom = Math.max(14, zoom - 6); build(); }
  if (key === 's' || key === 'S') saveCanvas('archimedean', 'png');
}

// ---------- やってみよう ----------
// 1. 8 つ全部で、頂点を 3 か所調べて「同じ数字」になるか確かめよう
// 2. 数字の角を足すと 360°：3.4.6.4 → 60 + 90 + 120 + 90。他の 7 つも計算しよう
// 3. 3.3.4.3.4 と 3.3.3.4.4 は使う形が同じなのに並び方がちがう。何がちがう？
// 4. colorsByN の色を変えて、自分だけの床タイルのデザインにしよう


// ==================================================
// ここから下は「タイリングの道具」（格子 + 単位の模様で 8 つを作る）
// （中身は読まなくても OK。消さないでね）
// ==================================================
const S3 = Math.sqrt(3), S2 = Math.sqrt(2);
function circumR(k) { return 1 / (2 * Math.sin(Math.PI / k)); }
function regTile(cx, cy, k, rot) { return { cx, cy, n: k, rot }; }
function polyPts(t) {
  let r = circumR(t.n), out = [];
  for (let k = 0; k < t.n; k++) out.push([t.cx + r * Math.cos(t.rot + (2 * Math.PI * k) / t.n), t.cy + r * Math.sin(t.rot + (2 * Math.PI * k) / t.n)]);
  return out;
}
function dirP(a, s) { return [s * Math.cos(a), s * Math.sin(a)]; }
function rotP(p, a) { return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]; }
function triFromPts(a, b, c) {
  let cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
  return regTile(cx, cy, 3, Math.atan2(a[1] - cy, a[0] - cx));
}
function edgeTris(t) {   // 各辺の外側に正三角形をつける
  let v = polyPts(t), out = [];
  for (let k = 0; k < t.n; k++) {
    let a = v[k], b = v[(k + 1) % t.n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let na = Math.atan2(my - t.cy, mx - t.cx);
    out.push(regTile(mx + (Math.cos(na) * S3) / 6, my + (Math.sin(na) * S3) / 6, 3, na));
  }
  return out;
}
// a1, a2 = ずらす向き（格子）、tiles = 1 マス分の多角形（重複は後で消す）
function tilingDef(id) {
  const P = Math.PI;
  if (id === 0) {
    let ts = [regTile(0, 0, 6, 0)];
    for (let k = 0; k < 6; k++) {
      let a = (k * P) / 3, v = dirP(a, 1), vn = dirP(a + P / 3, 1), p = dirP(a + P / 6, S3), pp = dirP(a - P / 6, S3), q = dirP(a, 2), r = rotP([2.5, S3 / 2], a);
      ts.push(triFromPts(v, vn, p), triFromPts(v, pp, q), triFromPts(v, q, p), triFromPts(p, q, r));
    }
    return { a1: [2, S3], a2: rotP([2, S3], P / 3), tiles: ts };
  }
  if (id === 1) {
    let sq2 = [regTile(0, 0, 4, P / 4), regTile(0.5 + (S3 + 1) / 4, 0.5 + (S3 - 1) / 4, 4, P / 12)];
    let ts = [...sq2];
    for (let q of sq2) ts.push(...edgeTris(q));
    return { a1: [0.5, 1 + S3 / 2], a2: [1 + S3 / 2, -0.5], tiles: ts };
  }
  if (id === 2) return { a1: [1, 0], a2: [0.5, 1 + S3 / 2], tiles: [regTile(0.5, 0.5, 4, P / 4), regTile(0.5, 1 + S3 / 6, 3, P / 2), regTile(1, 1 + S3 / 3, 3, -P / 2)] };
  if (id === 3) return { a1: [2, 0], a2: [1, S3], tiles: [regTile(0, 0, 6, 0), regTile(1, S3 / 3, 3, -P / 2), regTile(2, (2 * S3) / 3, 3, P / 2)] };
  if (id === 4) { let L = S3 + 1; return { a1: [L, 0], a2: [L / 2, (L * S3) / 2], tiles: [regTile(0, 0, 6, P / 6), regTile(L / 2, 0, 4, P / 4), regTile(L / 4, (L * S3) / 4, 4, P / 4 + P / 3), regTile((3 * L) / 4, (L * S3) / 4, 4, P / 4 + (2 * P) / 3), regTile(L / 2, (L * S3) / 6, 3, P / 2), regTile(L, (L * S3) / 3, 3, -P / 2)] }; }
  if (id === 5) { let L = 1 + S2; return { a1: [L, 0], a2: [0, L], tiles: [regTile(0, 0, 8, P / 8), regTile(L / 2, L / 2, 4, 0)] }; }
  if (id === 6) { let L = 2 + S3; return { a1: [L, 0], a2: [L / 2, (L * S3) / 2], tiles: [regTile(0, 0, 12, P / 12), regTile(L / 2, (L * S3) / 6, 3, -P / 2), regTile(L, (L * S3) / 3, 3, P / 2)] }; }
  let L = 3 + S3;
  return { a1: [L, 0], a2: [L / 2, (L * S3) / 2], tiles: [regTile(0, 0, 12, P / 12), regTile(L / 2, 0, 4, P / 4), regTile(L / 4, (L * S3) / 4, 4, P / 4 + P / 3), regTile((3 * L) / 4, (L * S3) / 4, 4, P / 4 + (2 * P) / 3), regTile(L / 2, (L * S3) / 6, 6, 0), regTile(L, (L * S3) / 3, 6, 0)] };
}
function generateTiles(def, range, reach) {
  let seen = new Set(), out = [];
  for (let i = -range; i <= range; i++) for (let j = -range; j <= range; j++) for (let t of def.tiles) {
    let cx = t.cx + i * def.a1[0] + j * def.a2[0], cy = t.cy + i * def.a1[1] + j * def.a2[1];
    if (Math.abs(cx) > reach * 1.2 || Math.abs(cy) > reach) continue;
    let k = Math.round(cx * 50) + ',' + Math.round(cy * 50);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(regTile(cx, cy, t.n, t.rot));
  }
  return out;
}
function collectVertices(ts) {
  let m = new Map();
  ts.forEach((t, ti) => {
    for (let p of polyPts(t)) {
      let k = Math.round(p[0] * 100) + ',' + Math.round(p[1] * 100);
      if (!m.has(k)) m.set(k, { x: p[0], y: p[1], list: [] });
      m.get(k).list.push([Math.atan2(t.cy - p[1], t.cx - p[0]), t.n, ti]);
    }
  });
  // 角の合計が 360° になっている（周りが全部そろった）頂点だけ使う
  return [...m.values()].filter((v) => Math.abs(v.list.reduce((s, e) => s + (Math.PI * (e[1] - 2)) / e[1], 0) - 2 * Math.PI) < 1e-6);
}
