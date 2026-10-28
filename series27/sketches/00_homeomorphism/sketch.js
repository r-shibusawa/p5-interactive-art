// ============================================
// 00 ゴムの幾何学：同相
// トポロジーでは図形をゴムのように伸ばす・曲げる・縮めるのは OK、「切る」「貼る」はダメ
//   穴の数が同じ図形どうしは、なめらかに変形できる ＝「同相」。コーヒーカップとドーナツは同じ形！
// 0 / 1 / 2 = 穴の数のグループ / ←→ = となりの形へ変形 / スペース = 自動で次々変形 / ドラッグ = ゴムを引っぱる
// ============================================

let N = 160;                 // ★ 輪郭 1 本あたりの点の数
let morphSpeed = 0.018;      // ★ 変形の速さ
let pullSigma = 0.12;        // ★ 引っぱるときに動く範囲（形の大きさを 1 として）
let shapes = {};             // 名前 → { outer: 輪郭, holes: [穴の輪郭…] }
let groups = [
  ['円板', 'I', 'L', 'T', 'C'],
  ['ドーナツ', 'コーヒーカップ', 'O', 'D', 'P', 'A'],
  ['8', 'B', '取っ手 2 つのカップ'],
];
let gi = 1, si = 0;          // いまのグループと形の番号
let fromS, toS, tMorph = 1;
let auto = false, autoTimer = 0;
let pulls = [];              // 引っぱり {x, y, dx, dy, life}（形の座標）
let dragPull = null;
let msg = '', msgLife = 0;
let S, ox, oy;               // 形を描く枠の大きさと位置

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildShapes();
  fromS = toS = shapes[groups[gi][si]];
  layout();
}
function layout() { S = min(width * 0.5, height * 0.72); ox = 60; oy = (height - S) / 2 + 30; }
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }

function goTo(g, s) {
  let cur = currentRings();
  if (g !== gi) {
    msg = '穴の数が ' + gi + ' → ' + g + '：ゴムのままでは無理。切る（貼る）しかない！';
    msgLife = 180;
    gi = g; si = 0;
    fromS = toS = shapes[groups[gi][si]]; tMorph = 1;
    return;
  }
  si = (s + groups[gi].length) % groups[gi].length;
  fromS = cur; toS = shapes[groups[gi][si]]; tMorph = 0;
}

// いま画面にある形（変形の途中）＝ 2 つの形の点を混ぜる
function currentRings() {
  let e = tMorph * tMorph * (3 - 2 * tMorph);   // なめらかに始まってなめらかに止まる
  let mixRing = (a, b) => a.map((p, i) => ({ x: p.x + (b[i].x - p.x) * e, y: p.y + (b[i].y - p.y) * e }));
  return { outer: mixRing(fromS.outer, toS.outer), holes: fromS.holes.map((h, k) => mixRing(h, toS.holes[k])) };
}

function draw() {
  background(250, 30, 12);
  if (tMorph < 1) tMorph = min(1, tMorph + morphSpeed);
  if (auto && tMorph >= 1 && ++autoTimer > 50) { autoTimer = 0; goTo(gi, si + 1); }
  if (dragPull) { dragPull.dx = (mouseX - ox) / S - dragPull.x; dragPull.dy = (mouseY - oy) / S - dragPull.y; }
  for (let p of pulls) if (p !== dragPull) p.life *= 0.93;   // 離すとゴムのように戻る
  pulls = pulls.filter((p) => p.life > 0.01);

  let r = currentRings();
  // 枠
  noFill(); stroke(250, 20, 30); strokeWeight(1); rect(ox, oy, S, S, 12);
  // ★ 形を描く：外側の輪郭を塗って、穴を背景色で抜く
  noStroke(); fill(30 + gi * 60, 70, 95);
  drawRing(r.outer);
  fill(250, 30, 12);
  for (let h of r.holes) drawRing(h);
  noFill(); stroke(0, 0, 100, 70); strokeWeight(2);
  drawRing(r.outer); for (let h of r.holes) drawRing(h);
  // 引っぱっている所
  for (let p of pulls) { stroke(50, 90, 100, 80 * p.life); line(ox + p.x * S, oy + p.y * S, ox + (p.x + p.dx * p.life) * S, oy + (p.y + p.dy * p.life) * S); }

  noStroke(); fill(0, 0, 100); textSize(40);
  text(groups[gi][si], ox, oy - 22);
  textSize(18);
  text('0 / 1 / 2：穴の数のグループ（いま ' + gi + '）　←→：となりの形へ変形　スペース：自動 ' + (auto ? 'ON' : 'off') + '　ドラッグ：引っぱる', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('同じグループ（穴の数が同じ）なら切らずに変形できる ＝ 同相。点のつながり方だけを見るのがトポロジー', 20, 68);
  if (msgLife > 0) { msgLife--; fill(0, 80, 100, min(100, msgLife)); textSize(22); text(msg, ox, oy + S + 40); }
  drawAlphabet(ox + S + 60, oy + 10);
}

// 輪郭 1 本を、引っぱりの変形をかけて描く
function drawRing(ring) {
  beginShape();
  for (let p of ring) { let q = warp(p); vertex(ox + q.x * S, oy + q.y * S); }
  endShape(CLOSE);
}
// ★ 引っぱり ＝ ガウス関数の形のなめらかなずらし（連続なので形のつながりは変わらない）
function warp(p) {
  let x = p.x, y = p.y;
  for (let q of pulls) {
    let w = Math.exp(-((p.x - q.x) ** 2 + (p.y - q.y) ** 2) / (pullSigma * pullSigma)) * q.life;
    x += q.dx * w; y += q.dy * w;
  }
  return { x, y };
}

// アルファベット（太い文字＝面として）を穴の数で分類
function drawAlphabet(x0, y0) {
  let holes = { A: 1, B: 2, D: 1, O: 1, P: 1, Q: 1, R: 1 };
  let colW = max(40, min(56, (width - x0 - 30) / 7));
  fill(0, 0, 100); textSize(18); text('アルファベットを穴の数で分類（太い文字を「面」と見る）', x0, y0);
  textSize(colW * 0.7); textStyle(BOLD);
  for (let i = 0; i < 26; i++) {
    let ch = String.fromCharCode(65 + i), h = holes[ch] || 0;
    fill(30 + h * 60, h === gi ? 80 : 30, h === gi ? 100 : 55);
    text(ch, x0 + (i % 7) * colW, y0 + 60 + floor(i / 7) * colW * 1.05);
  }
  textStyle(NORMAL); textSize(15);
  for (let h = 0; h < 3; h++) { fill(30 + h * 60, 70, 95); text('■ 穴 ' + h + ' 個', x0 + h * 120, y0 + 80 + 4 * colW * 1.05); }
  fill(0, 0, 60);
  text('細い「線」として見ると分類はもっと細かい（T と I は別：枝分かれ点があるか）', x0, y0 + 110 + 4 * colW * 1.05);
}

function mousePressed() {
  let x = (mouseX - ox) / S, y = (mouseY - oy) / S;
  if (x > -0.2 && x < 1.2 && y > -0.2 && y < 1.2) { dragPull = { x, y, dx: 0, dy: 0, life: 1 }; pulls.push(dragPull); }
}
function mouseReleased() { dragPull = null; }
function keyPressed() {
  if (key === '0' || key === '1' || key === '2') goTo(int(key), 0);
  if (key === RIGHT_ARROW) goTo(gi, si + 1);
  if (key === LEFT_ARROW) goTo(gi, si - 1);
  if (key === ' ') { auto = !auto; autoTimer = 0; }
}

// ---------- やってみよう ----------
// 1. buildShapes に自分の形（たとえば穴 1 つの「Q」や「R」）を追加して、ドーナツから変形させよう
// 2. 取っ手 2 つのカップと「8」が同相なのを確かめる。穴 3 つのグループ（プレッツェル）もつくれる？
// 3. pullSigma を小さくして思いきり引っぱると、輪郭が重なる。それは「同相写像」と言える？
// 4. 文字を「線」と見たとき、X と Y、E と F は同相？ 枝分かれ点の数を数えてみよう


// ==================================================
// ここから下は「形をつくる道具」（輪郭の点を同じ数・同じ向きにそろえる）
// ==================================================
function arcPts(cx, cy, rx, ry, a0, a1, n) {
  let out = [];
  for (let i = 0; i <= n; i++) { let a = a0 + ((a1 - a0) * i) / n; out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }); }
  return out;
}
function P(x, y) { return { x, y }; }
const H = Math.PI / 2;
function cup(two) {
  let o = [P(0.3, 0.22), P(0.66, 0.22), P(0.66, 0.32), ...arcPts(0.66, 0.5, 0.2, 0.18, -H, H, 30), P(0.66, 0.85), P(0.3, 0.85)];
  if (two) o.push(...arcPts(0.3, 0.5, 0.2, 0.18, H, 3 * H, 30));
  let holes = [[P(0.66, 0.42), ...arcPts(0.66, 0.5, 0.1, 0.08, -H, H, 20)]];
  if (two) holes.unshift([P(0.3, 0.58), ...arcPts(0.3, 0.5, 0.1, 0.08, H, 3 * H, 20)]);
  return { outer: o, holes };
}
function buildShapes() {
  let raw = {
    '円板': { outer: arcPts(0.5, 0.5, 0.42, 0.42, 0, 2 * Math.PI, 60), holes: [] },
    'I': { outer: [P(0.4, 0.06), P(0.6, 0.06), P(0.6, 0.94), P(0.4, 0.94)], holes: [] },
    'L': { outer: [P(0.25, 0.06), P(0.45, 0.06), P(0.45, 0.74), P(0.8, 0.74), P(0.8, 0.94), P(0.25, 0.94)], holes: [] },
    'T': { outer: [P(0.1, 0.06), P(0.9, 0.06), P(0.9, 0.26), P(0.6, 0.26), P(0.6, 0.94), P(0.4, 0.94), P(0.4, 0.26), P(0.1, 0.26)], holes: [] },
    'C': { outer: [...arcPts(0.5, 0.5, 0.44, 0.44, 0.7, 2 * Math.PI - 0.7, 40), ...arcPts(0.5, 0.5, 0.24, 0.24, 2 * Math.PI - 0.7, 0.7, 30)], holes: [] },
    'ドーナツ': { outer: arcPts(0.5, 0.5, 0.45, 0.45, 0, 2 * Math.PI, 60), holes: [arcPts(0.5, 0.5, 0.17, 0.17, 0, 2 * Math.PI, 40)] },
    'コーヒーカップ': cup(false),
    'O': { outer: arcPts(0.5, 0.5, 0.36, 0.45, 0, 2 * Math.PI, 60), holes: [arcPts(0.5, 0.5, 0.18, 0.27, 0, 2 * Math.PI, 40)] },
    'D': { outer: [P(0.22, 0.08), ...arcPts(0.5, 0.5, 0.42, 0.42, -H, H, 40), P(0.22, 0.92)], holes: [[P(0.4, 0.26), ...arcPts(0.5, 0.5, 0.24, 0.24, -H, H, 30), P(0.4, 0.74)]] },
    'P': { outer: [P(0.2, 0.95), P(0.2, 0.05), ...arcPts(0.5, 0.3, 0.25, 0.25, -H, H, 30), P(0.4, 0.55), P(0.4, 0.95)], holes: [[P(0.4, 0.18), ...arcPts(0.5, 0.3, 0.12, 0.12, -H, H, 20), P(0.4, 0.42)]] },
    'A': { outer: [P(0.1, 0.95), P(0.42, 0.05), P(0.58, 0.05), P(0.9, 0.95), P(0.7, 0.95), P(0.62, 0.72), P(0.38, 0.72), P(0.3, 0.95)], holes: [[P(0.5, 0.28), P(0.58, 0.55), P(0.42, 0.55)]] },
    'B': { outer: [P(0.2, 0.05), ...arcPts(0.5, 0.26, 0.21, 0.21, -H, H, 30), ...arcPts(0.5, 0.71, 0.24, 0.24, -H, H, 30), P(0.2, 0.95)],
           holes: [[P(0.38, 0.16), ...arcPts(0.5, 0.26, 0.1, 0.1, -H, H, 20), P(0.38, 0.36)], [P(0.38, 0.58), ...arcPts(0.5, 0.71, 0.13, 0.13, -H, H, 20), P(0.38, 0.84)]] },
    '取っ手 2 つのカップ': cup(true),
  };
  let eight = [];
  for (let i = 0; i < 80; i++) { let t = (i / 80) * 2 * Math.PI, c = Math.cos(t); eight.push(P(0.5 + 0.32 * Math.sin(t) * (0.45 + 0.55 * c * c), 0.5 - 0.46 * c)); }
  raw['8'] = { outer: eight, holes: [arcPts(0.5, 0.28, 0.1, 0.1, 0, 2 * Math.PI, 30), arcPts(0.5, 0.72, 0.1, 0.1, 0, 2 * Math.PI, 30)] };
  for (let k in raw) shapes[k] = { outer: resample(raw[k].outer), holes: raw[k].holes.map(resample) };
}
// 輪郭を弧長で N 等分し、向き（時計回り）と始点（いちばん上の点）をそろえる
function resample(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) { let a = pts[i], b = pts[(i + 1) % pts.length]; area += a.x * b.y - b.x * a.y; }
  if (area < 0) pts = pts.slice().reverse();
  let lens = [0];
  for (let i = 0; i < pts.length; i++) { let a = pts[i], b = pts[(i + 1) % pts.length]; lens.push(lens[i] + Math.hypot(b.x - a.x, b.y - a.y)); }
  let total = lens[pts.length], out = [], j = 0;
  for (let k = 0; k < N; k++) {
    let d = (k / N) * total;
    while (lens[j + 1] < d) j++;
    let a = pts[j], b = pts[(j + 1) % pts.length], u = (d - lens[j]) / (lens[j + 1] - lens[j] || 1);
    out.push(P(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u));
  }
  let top = 0;
  for (let k = 1; k < N; k++) if (out[k].y < out[top].y - 1e-6) top = k;
  return out.slice(top).concat(out.slice(0, top));
}
