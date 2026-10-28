// ============================================
// 04 五角形のタイリング
// 正五角形は埋まらない（00）。でも「ゆがんだ凸五角形」なら埋まるものがあり、全部で 15 タイプ（2017 年に完全に分類）
//   ここでは タイプ 1（六角形を半分に切る）・タイプ 4（カイロ・タイル）・タイプ 5（花の形）を、形を変えながら試す
// 1・2・3 = タイプ / ドラッグ = 白い点を動かして形を変える / ←→ = タイプ 1 の切り方 / ↑↓ = 拡大縮小 / S = 保存
// ============================================

let type = 2;           // ★ 1 = タイプ 1、2 = タイプ 4（カイロ）、3 = タイプ 5
let zoom = 150;         // ★ 1 単位の長さ（ピクセル）
let Z4 = [0.36, -0.135]; // タイプ 4 の動かせる頂点（辺がほぼ同じ長さのカイロ・タイル）
let Z5 = [0.43, -0.08];  // タイプ 5 の動かせる頂点（角が 60°・120°×4 の「花」の五角形）
let h1 = [0.45, 0.85], h2 = [-0.6, 0.8];   // タイプ 1：中心対称な六角形の頂点
let cut = 0.35;         // タイプ 1：切る位置（0〜1）
let drag = null;

let pal = [[250, 160, 90], [90, 180, 230], [240, 220, 120], [160, 120, 220], [110, 210, 160], [240, 110, 140]];

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(20, 22, 30);
  let set = makeTiling();
  push();
  translate(width / 2, height / 2);
  stroke(20, 22, 30);
  strokeWeight(2);
  for (let t of set.tiles) {
    let c = pal[t.c % pal.length];
    fill(c[0], c[1], c[2]);
    beginShape();
    for (let p of t.pts) vertex(p[0] * zoom, p[1] * zoom);
    endShape(CLOSE);
  }
  // 基本の 1 枚を強調
  noFill();
  stroke(255);
  strokeWeight(4);
  beginShape();
  for (let p of set.base) vertex(p[0] * zoom, p[1] * zoom);
  endShape(CLOSE);
  for (let h of set.handles) {
    fill(255);
    stroke(20);
    strokeWeight(2);
    circle(h[0] * zoom, h[1] * zoom, 16);
  }
  pop();
  drawInfo(set.base);
}

// ★ タイプごとの作り方
function makeTiling() {
  let tiles = [], base, handles;
  let reach = Math.max(width, height) / zoom / 2 + 1.5;
  if (type === 1) {
    // 中心対称な六角形 h0 h1 h2 −h0 −h1 −h2 を、中心を通る線で 2 つに切る → 合同な五角形 2 枚
    let h0 = [1, 0];
    let p = [h0[0] + (h1[0] - h0[0]) * cut, h0[1] + (h1[1] - h0[1]) * cut];
    base = [p, h1, h2, [-h0[0], -h0[1]], [-p[0], -p[1]]];
    let other = base.map((v) => [-v[0], -v[1]]);
    let t1 = [h2[0] - h0[0], h2[1] - h0[1]], t2 = [-h0[0] - h1[0], -h0[1] - h1[1]];
    for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) {
      let ox = i * t1[0] + j * t2[0], oy = i * t1[1] + j * t2[1];
      if (Math.abs(ox) > reach || Math.abs(oy) > reach) continue;
      tiles.push({ pts: base.map((v) => [v[0] + ox, v[1] + oy]), c: 0 });
      tiles.push({ pts: other.map((v) => [v[0] + ox, v[1] + oy]), c: 1 });
    }
    handles = [h1, h2];
  } else if (type === 2) {
    // 4 回回転の中心 A(0,0) と B(0.5,0.5)。Z を A のまわりに 90° 回すと X、X を B のまわりに 90° 回すと Y
    let A = [0, 0], B = [0.5, 0.5];
    let X = rotAround(Z4, A, PI / 2), Y = rotAround(X, B, PI / 2);
    base = [A, X, B, Y, Z4];
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
      if (Math.abs(i) > reach || Math.abs(j) > reach) continue;
      for (let k = 0; k < 4; k++) tiles.push({ pts: base.map((v) => { let r = rotAround(v, A, (k * PI) / 2); return [r[0] + i, r[1] + j]; }), c: k });
    }
    handles = [Z4];
  } else {
    // 6 回回転の中心 A(0,0) と 3 回回転の中心 D。花びらのように 6 枚が集まる
    let A = [0, 0], D = [0.5, Math.sqrt(3) / 6];
    let X = rotAround(Z5, A, PI / 3), Y = rotAround(X, D, (2 * PI) / 3);
    base = [A, X, D, Y, Z5];
    let a1 = [1, 0], a2 = [0.5, Math.sqrt(3) / 2];
    for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) {
      let ox = i * a1[0] + j * a2[0], oy = i * a1[1] + j * a2[1];
      if (Math.abs(ox) > reach || Math.abs(oy) > reach) continue;
      for (let k = 0; k < 6; k++) tiles.push({ pts: base.map((v) => { let r = rotAround(v, A, (k * PI) / 3); return [r[0] + ox, r[1] + oy]; }), c: k });
    }
    handles = [Z5];
  }
  return { tiles, base, handles };
}

function drawInfo(base) {
  let ang = interiorAngles(base);
  let len = base.map((p, i) => dist2(p, base[(i + 1) % 5]));
  noStroke();
  fill(0, 0, 0, 175);
  rect(10, 10, 560, 200, 8);
  fill(255);
  textSize(19);
  let title = { 1: 'タイプ 1：中心対称な六角形を半分に切る', 2: 'タイプ 4：カイロ・タイル（90° の角が 2 つ）', 3: 'タイプ 5：6 枚で花になる（60° と 120°）' }[type];
  text(type + '. ' + title, 22, 38);
  textSize(15);
  fill(210);
  text('角：' + ang.map((a) => Math.round(a) + '°').join('  ') + '　合計 ' + Math.round(ang.reduce((s, a) => s + a, 0)) + '°', 22, 66);
  text('辺：' + len.map((l) => nf(l, 1, 2)).join('  '), 22, 90);
  let rule = { 1: '2 つの辺が平行（となり合う 2 角の和 = 180°）', 2: '回転の中心の 2 つの角 = 90°、それをはさむ辺が同じ長さ', 3: '回転の中心の角 = 60° と 120°、それをはさむ辺が同じ長さ' }[type];
  text('条件：' + rule, 22, 114);
  fill(160);
  text('1918 ラインハルト 1〜5 ／ 1968 カーシュナー 6〜8 ／ 1975 ジェームズ 10', 22, 144);
  text('1977 マージョリー・ライス（主婦の数学愛好家）9・11〜13 ／ 1985 シュタイン 14', 22, 166);
  text('2015 マン・マクラウド・フォン＝ダーウ 15（コンピュータ探索）／ 2017 ラオ「これで全部」', 22, 188);
}

function mousePressed() {
  let mx = (mouseX - width / 2) / zoom, my = (mouseY - height / 2) / zoom;
  drag = null;
  let cands = type === 1 ? [h1, h2] : type === 2 ? [Z4] : [Z5];
  for (let c of cands) if (Math.hypot(c[0] - mx, c[1] - my) < 25 / zoom) drag = c;
}
function mouseDragged() {
  if (!drag) return;
  let old = [drag[0], drag[1]];
  drag[0] = (mouseX - width / 2) / zoom;
  drag[1] = (mouseY - height / 2) / zoom;
  // 形が壊れる（交差・へこむ）なら元に戻す。凸五角形だけを考える
  let base = makeTiling().base;
  let bad = !isSimple(base) || !isConvex(base);
  if (type === 1) bad = bad || !isConvex([[1, 0], h1, h2, [-1, 0], [-h1[0], -h1[1]], [-h2[0], -h2[1]]]);
  if (bad) { drag[0] = old[0]; drag[1] = old[1]; }
}
function mouseReleased() { drag = null; }

function keyPressed() {
  if (key >= '1' && key <= '3') type = int(key);
  if (key === LEFT_ARROW) cut = Math.max(0.05, cut - 0.05);
  if (key === RIGHT_ARROW) cut = Math.min(0.95, cut + 0.05);
  if (key === UP_ARROW) zoom = Math.min(300, zoom + 15);
  if (key === DOWN_ARROW) zoom = Math.max(50, zoom - 15);
  if (key === 's' || key === 'S') saveCanvas('pentagon_tiling', 'png');
}

// ---------- やってみよう ----------
// 1. タイプ 4 で点を動かし、4 つの辺が同じ長さの「本物のカイロ・タイル」を探そう（カイロの石畳の模様）
// 2. タイプ 1 は ←→ で切り方を変えても必ず埋まる。なぜ？（六角形が埋まるから、その半分も埋まる）
// 3. タイプ 5 の花の中心に集まる角は 60° × 6 = 360°。他の頂点の角の合計も確かめよう
// 4. 調べてみよう：マージョリー・ライスはどうやって新しいタイプを見つけた？


// ==================================================
// ここから下は「図形の道具」
// ==================================================
function rotAround(p, c, a) {
  let x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)];
}
function dist2(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

// 内角（へこんだ角にも対応）
function interiorAngles(pts) {
  let n = pts.length, area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  let sg = area > 0 ? 1 : -1, out = [];
  for (let i = 0; i < n; i++) {
    let a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
    let e1 = [b[0] - a[0], b[1] - a[1]], e2 = [c[0] - b[0], c[1] - b[1]];
    let turn = Math.atan2(e1[0] * e2[1] - e1[1] * e2[0], e1[0] * e2[0] + e1[1] * e2[1]);
    out.push(((Math.PI - sg * turn) * 180) / Math.PI);
  }
  return out;
}
function isSimple(pts) {
  let n = pts.length;
  let o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    let a = pts[i], b = pts[(i + 1) % n], c = pts[j], d = pts[(j + 1) % n];
    if (o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0) return false;
  }
  return true;
}
function isConvex(pts) {
  let n = pts.length, s = 0;
  for (let i = 0; i < n; i++) {
    let a = pts[i], b = pts[(i + 1) % n], c = pts[(i + 2) % n];
    let cr = Math.sign((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]));
    if (cr === 0) continue;
    if (s === 0) s = cr; else if (cr !== s) return false;
  }
  return true;
}
