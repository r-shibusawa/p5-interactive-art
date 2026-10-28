// ============================================
// 14 ボロノイ・ブラシ（自由制作のベース）
// マウスでなぞるとサイトがまかれ、その場でボロノイ図の絵になる。サイトを置くたびに音が鳴る
//   L でロイドの緩和（06）をかけると、ばらばらのセルがそろっていく。色・描き方を変えて自分の作品に
// ドラッグ = サイトをまく / 1〜4 = 配色 / W = 描き方 / L = ロイド ON/OFF / ↑↓ = まく間隔 / S = 保存 / C = 全部消す（最初のクリックで音もスタート）
// ============================================

let sites = [];
let cells = [];
let gap = 28;             // ★ まく間隔（px）
let maxSites = 300;       // ★ サイトの上限（多いと重い）
let lloyd = false;
let styleNo = 0;
let palNo = 0;
let art;                  // 絵を描いておく画用紙
let dirty = true;
let last = null;
let styles = ['塗り', 'ステンドグラス', 'グラデーション', '線だけ'];
// ★ 配色（好きな色に変えよう）
let palettes = [
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  ['#0b132b', '#1c2541', '#3a506b', '#5bc0be', '#a8dadc'],
  ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'],
  ['#f1faee', '#e0e1dd', '#c9ada7', '#9a8c98', '#4a4e69'],
];
let penta = [0, 2, 4, 7, 9];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  art = createGraphics(width, height - 90);
  for (let i = 0; i < 40; i++) sites.push({ x: random(width), y: random(art.height), c: floor(random(5)) });
}

function rebuild() {
  cells = sites.map((s, i) => voronoiCell(sites, i, 0, 0, art.width, art.height));
  art.background(15);
  let pal = palettes[palNo];
  for (let i = 0; i < cells.length; i++) {
    let poly = cells[i];
    if (poly.length < 3) continue;
    let col = pal[sites[i].c % pal.length];
    let cen = polyCentroid(poly);
    if (styleNo === 0) {                               // 塗り
      art.fill(col); art.stroke(15); art.strokeWeight(1.5); drawPoly(poly, cen, 1);
    } else if (styleNo === 1) {                        // ステンドグラス：太い黒い枠
      art.fill(col); art.stroke(10); art.strokeWeight(7); drawPoly(poly, cen, 1);
      art.noFill(); art.stroke(255, 60); art.strokeWeight(2); drawPoly(poly, cen, 0.6);
    } else if (styleNo === 2) {                        // グラデーション：中心へ縮めた多角形を重ねる（F1 のような見え方）
      art.noStroke();
      for (let k = 0; k < 5; k++) { art.fill(lerpColor(color(col), color('#ffffff'), k * 0.12)); drawPoly(poly, cen, 1 - k * 0.18); }
    } else {                                           // 線だけ
      art.noFill(); art.stroke(col); art.strokeWeight(2); drawPoly(poly, cen, 0.9);
    }
  }
  dirty = false;
}
// 多角形を重心 cen に向かって k 倍に縮めて描く
function drawPoly(poly, cen, k) {
  art.beginShape();
  for (let p of poly) art.vertex(cen.x + (p.x - cen.x) * k, cen.y + (p.y - cen.y) * k);
  art.endShape(CLOSE);
}

function lloydStep() {
  for (let i = 0; i < sites.length; i++) {
    if (!cells[i] || cells[i].length < 3) continue;
    let c = polyCentroid(cells[i]);
    sites[i].x = lerp(sites[i].x, c.x, 0.5); sites[i].y = lerp(sites[i].y, c.y, 0.5);
  }
  dirty = true;
}

function draw() {
  background(230, 25, 12);
  if (lloyd && cells.length) lloydStep();
  if (dirty) rebuild();
  image(art, 0, 90);
  // ブラシの円
  noFill(); stroke(0, 0, 100, 60); strokeWeight(1.5); circle(mouseX, mouseY, gap);

  noStroke(); fill(0, 0, 100); textSize(18);
  text((audioCtx ? '♪' : 'クリックで音もスタート') + '　ドラッグ：まく　1〜4：配色　W：' + styles[styleNo] + '　L：ロイド ' + (lloyd ? 'ON' : 'off') + '　↑↓：間隔 ' + gap + '　S：保存　C：消す　サイト ' + sites.length + ' / ' + maxSites, 20, 40);
  fill(0, 0, 65); textSize(15);
  text('サイトの色はまいた順にランダム。L を押しっぱなしにせず ON/OFF で。セルがそろったら W で描き方を変えて S で保存しよう', 20, 68);
}

function paint() {
  if (mouseY < 90 || sites.length >= maxSites) return;
  let y = mouseY - 90;
  if (last && dist(mouseX, y, last.x, last.y) < gap) return;
  sites.push({ x: mouseX + random(-0.5, 0.5), y, c: floor(random(5)) });
  last = { x: mouseX, y };
  dirty = true;
  // ★ 置いた場所で音：高さ = 上ほど高い、左右 = 音色
  let k = constrain(floor(map(y, art.height, 0, 0, 15)), 0, 14);
  playNote(220 * pow(2, (12 * floor(k / 5) + penta[k % 5]) / 12), 0.4, 0.15, mouseX < width / 2 ? 'triangle' : 'sine');
}
function mousePressed() { startAudio(); last = null; paint(); }
function mouseDragged() { paint(); }

function keyPressed() {
  if (key >= '1' && key <= '4') { palNo = int(key) - 1; dirty = true; }
  if (key === 'w' || key === 'W') { styleNo = (styleNo + 1) % styles.length; dirty = true; }
  if (key === 'l' || key === 'L') lloyd = !lloyd;
  if (key === UP_ARROW) gap = min(120, gap + 4);
  if (key === DOWN_ARROW) gap = max(6, gap - 4);
  if (key === 's' || key === 'S') saveCanvas('voronoi_brush', 'png');
  if (key === 'c' || key === 'C') { sites = []; cells = []; dirty = true; }
}

// ---------- やってみよう ----------
// 1. palettes に自分の配色を足そう（coolors.co などで 5 色選ぶ）
// 2. サイトの色を「置いた場所の y」や「置いた時刻」で決めると、グラデーションの絵になる
// 3. 08 の重みつきボロノイのように、ブラシの速さで「重み」を変えるとどうなる？
// 4. 10 のウォーリーノイズの描き方（F2 − F1 で線）を新しい style として足そう


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


// ==================================================
// ここから下は「音を鳴らすための道具」（Web Audio。p5.sound は使わない）
// ==================================================
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 1 音だけ鳴らす：高さ freq（Hz）、長さ dur（秒）、大きさ vol（0〜1）、波形 type
function playNote(freq, dur, vol, type) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine';
  o.frequency.value = constrain(freq, 30, 4000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(constrain(vol, 0.001, 1), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut);
  o.start(t); o.stop(t + dur + 0.05);
}
