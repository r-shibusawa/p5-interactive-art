// ============================================
// 12 主観的輪郭 ─ カニッツァの三角形とネオン色拡散
// 欠けた円（パックマン）を 3 つ置くだけで、描いていない白い三角形のふちが見える。真ん中は背景より白く見える
// 口の向きがそろっていると見え、少し回すと消える。ネオン色拡散：線の一部の色だけで、面に色がしみ出して見える
// 3・4 = 三角形 / 四角形 / ←→ = パックマンを回す / ↑↓ = 口の角度 / O = 線の角を足す / N = ネオン色拡散
// T またはマウスを押している間 = 真実を見る（描いていない輪郭を点線で示し、中と外の画素を読む）
// ============================================

let nV = 3;                  // ★ パックマンの数（3 = 三角形、4 = 四角形）
let twist = 0;               // パックマンを回す角度（度）。0 で口がそろう
let mouthExtra = 0;          // 口の角度の追加（度）。0 で多角形の角とぴったり
let PR = 70;                 // ★ パックマンの半径 px
let outline = false, neon = false, truthKey = false;
const BG = 250, INK = 20, NEON = [40, 110, 240];

function setup() {
  createCanvas(windowWidth, windowHeight);
  drawScene(false);
  selfTest();
}
function truthOn() { return truthKey || mouseIsPressed; }
function draw() { drawScene(truthOn()); }

function geom() { return { cx: Math.round(width * 0.45), cy: Math.round(height * 0.55), R: Math.round(Math.min(width, height) * 0.27) }; }
// 多角形の頂点（上向きの三角形・正方形）
function verts() { let g = geom(); return [...Array(nV)].map((_, i) => { let a = -HALF_PI + (i * TWO_PI) / nV + (nV === 4 ? PI / 4 : 0); return [g.cx + g.R * Math.cos(a), g.cy + g.R * Math.sin(a)]; }); }
// i 番目のパックマンの口：中心の向きと、口の半分の角度（ラジアン）
function mouth(i) {
  let v = verts()[i], g = geom(), toC = Math.atan2(g.cy - v[1], g.cx - v[0]);
  let interior = Math.PI - TWO_PI / nV;                       // 正多角形の内角（三角形 60°、四角形 90°）
  return { dir: toC + (twist * Math.PI) / 180, half: (interior + (mouthExtra * Math.PI) / 180) / 2 };
}

function drawScene(truth) {
  background(BG);
  if (neon) drawNeon(truth);
  else {
    let V = verts(), g = geom();
    if (outline) {   // 線でできた逆向きの三角形（角だけ）
      noFill(); stroke(INK); strokeWeight(3);
      let W = V.map((v) => [2 * g.cx - v[0], 2 * g.cy - v[1]]).map((v) => [g.cx + (v[0] - g.cx) * 0.95, g.cy + (v[1] - g.cy) * 0.95]);
      W.forEach((v, i) => { for (let j of [1, nV - 1]) { let w = W[(i + j) % nV]; line(v[0], v[1], v[0] + (w[0] - v[0]) * 0.22, v[1] + (w[1] - v[1]) * 0.22); } });
    }
    noStroke(); fill(INK);
    V.forEach((v, i) => { let m = mouth(i); arc(v[0], v[1], 2 * PR, 2 * PR, m.dir + m.half, m.dir - m.half + TWO_PI, PIE); });
    if (truth) {
      stroke(230, 40, 40); strokeWeight(1.5); drawingContext.setLineDash([7, 6]); noFill();
      beginShape(); for (let v of V) vertex(v[0], v[1]); endShape(CLOSE); drawingContext.setLineDash([]);
      loadPixels();
      let pIn = readPix(g.cx, g.cy), mid = edgeProbe(), pOut = readPix(mid.out[0], mid.out[1]), pOn = readPix(mid.on[0], mid.on[1]);
      noStroke(); fill(230, 40, 40); textSize(15); textAlign(LEFT, BASELINE);
      text('中の画素 ' + pIn.join(',') + '　ふちの上 ' + pOn.join(',') + '　外の画素 ' + pOut.join(','), 20, height - 40);
    }
  }
  noStroke(); fill(20); textAlign(LEFT, BASELINE); textSize(18);
  text('3・4：' + (nV === 3 ? '三角形' : '四角形') + '　←→：回す ' + twist + '°　↑↓：口の角度 ' + (mouthExtra >= 0 ? '+' : '') + mouthExtra + '°　O：線の角 ' + (outline ? 'ON' : 'off') + '　N：ネオン ' + (neon ? 'ON' : 'off') + '　T：真実', 20, 34);
  fill(80); textSize(15);
  text(neon ? '円の中の線だけ青くしてある。線のすき間の白は、外と同じ ' + BG + ' なのに青っぽく見える' : '三角形のふちは描いていない（真ん中も背景と同じ ' + BG + '）。←→ で口をずらすと、三角形は消える？', 20, 60);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}
// ふちの点：1 番目と 2 番目の頂点の中点（ふちの上）と、外側に 20 px
function edgeProbe() {
  let V = verts(), g = geom(), a = V[0], b = V[1 % nV], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let dx = m[0] - g.cx, dy = m[1] - g.cy, d = Math.hypot(dx, dy);
  return { on: m.map(Math.round), out: [Math.round(m[0] + (dx / d) * 20), Math.round(m[1] + (dy / d) * 20)], inn: [Math.round(m[0] - (dx / d) * 20), Math.round(m[1] - (dy / d) * 20)] };
}

// ネオン色拡散：黒い格子の線のうち、円の中の部分だけ青
const GAP = 36, RN = 150;
function drawNeon(truth) {
  let g = geom(); strokeWeight(3); strokeCap(SQUARE);
  for (let x = g.cx % GAP; x < width; x += GAP) neonLine(x, 0, x, height, g, true);
  for (let y = g.cy % GAP; y < height; y += GAP) neonLine(0, y, width, y, g, false);
  if (truth) { noFill(); stroke(230, 40, 40); strokeWeight(1.5); drawingContext.setLineDash([7, 6]); circle(g.cx, g.cy, 2 * RN); drawingContext.setLineDash([]); }
}
function neonLine(x0, y0, x1, y1, g, vert) {
  stroke(INK); line(x0, y0, x1, y1);
  let off = vert ? x0 - g.cx : y0 - g.cy;
  if (Math.abs(off) >= RN) return;
  let h = Math.sqrt(RN * RN - off * off);
  stroke(NEON);
  if (vert) line(x0, g.cy - h, x0, g.cy + h); else line(g.cx - h, y0, g.cx + h, y0);
}

function keyPressed() {
  if (key === '3' || key === '4') nV = +key;
  if (key === RIGHT_ARROW) twist = Math.min(90, twist + 5);
  if (key === LEFT_ARROW) twist = Math.max(-90, twist - 5);
  if (key === UP_ARROW) mouthExtra = Math.min(60, mouthExtra + 5);
  if (key === DOWN_ARROW) mouthExtra = Math.max(-50, mouthExtra - 5);
  if (key === 'o' || key === 'O') outline = !outline;
  if (key === 'n' || key === 'N') neon = !neon;
  if (key === 't' || key === 'T') truthKey = !truthKey;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. ←→ で少しずつ回す。三角形が見えなくなるのは何度ぐらい？
// 2. ↑↓ で口を広げる・せばめる。ぴったり（0°）のときが一番くっきり？
// 3. PR（パックマンの大きさ）を小さくする。すき間が広いと輪郭は弱くなる？
// 4. O で線の角を足すと、三角形が「上に重なっている」感じが強くなる
// 5. ネオン（N）で、NEON の色を赤や緑に変えてみよう


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：輪郭も白い面も描いていないことを画素で、口の向きを幾何で確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), g = geom(), keepN = neon;
  neon = false; drawScene(false); loadPixels();
  let e = edgeProbe(), same = (p) => p.every((v) => v === BG);
  ok('三角形の真ん中の画素 = 背景 ' + BG + '（白い面は描いていない）', same(readPix(g.cx, g.cy)));
  ok('ふちの上・内側・外側の画素も全部 背景（輪郭の線は描いていない）', same(readPix(...e.on)) && same(readPix(...e.inn)) && same(readPix(...e.out)));
  let V = verts(), aligned = V.every((v, i) => {
    let m = mouth(i), nb = [V[(i + 1) % nV], V[(i + nV - 1) % nV]].map((w) => Math.atan2(w[1] - v[1], w[0] - v[0]));
    let ed = [m.dir + m.half, m.dir - m.half], dist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    return nb.every((a) => Math.min(dist(a, ed[0]), dist(a, ed[1])) < 1e-9);
  });
  ok('口のふち 2 本は、ちょうどとなりのパックマンの中心を向く（ふちが一直線につながる）', aligned);
  ok('パックマンの体は黒（頂点から外向き 0.5 r の画素）', (() => { let v = V[0], d = Math.hypot(v[0] - g.cx, v[1] - g.cy); return readPix(v[0] + ((v[0] - g.cx) / d) * PR * 0.5, v[1] + ((v[1] - g.cy) / d) * PR * 0.5)[0] === INK; })());
  neon = true; drawScene(false); loadPixels();
  let gapIn = [g.cx + GAP / 2, g.cy + GAP / 2], gapOut = [g.cx + GAP * 5.5, g.cy + GAP / 2];
  ok('ネオン：円の中の線のすき間 = 外のすき間 = 背景 ' + BG + '（青はしみ出していない）', same(readPix(...gapIn)) && (gapOut[0] >= width || same(readPix(...gapOut))));
  ok('ネオン：円の中の線は青、外の線は黒', readPix(g.cx, g.cy + GAP / 2).join() === NEON.join() && readPix(g.cx, g.cy + RN + GAP / 2 + 6).every((v) => v === INK));
  neon = keepN; drawScene(false);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
