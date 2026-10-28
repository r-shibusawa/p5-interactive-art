// ============================================
// 09 フリーズ群（7 種類）
// 帯（フリーズ）状にくり返す模様の対称性は、ちょうど 7 種類しかない
//   並進に、鏡映（たて・よこ）、180° 回転、すべり鏡映をどう組み合わせるかで決まる
// 左の枠の中でドラッグ = 模様を描く / 1〜7 = その帯の対称性（鏡・回転の中心）を表示 / C = 消す / P = 例の模様
// ============================================

// ★ 7 つのフリーズ群：周期 1 の中のコピー（x' = a x + e, y' = d y）と名前
const FRIEZE = [
  { name: 'p1', nick: 'ホップ', gens: '並進だけ', maps: [[1, 1, 0]] },
  { name: 'p11g', nick: 'ステップ', gens: '並進 ＋ すべり鏡映', maps: [[1, 1, 0], [1, -1, 0.5]] },
  { name: 'p1m1', nick: 'サイドル', gens: '並進 ＋ たての鏡映', maps: [[1, 1, 0], [-1, 1, 0]] },
  { name: 'p2', nick: 'スピニングホップ', gens: '並進 ＋ 180° 回転', maps: [[1, 1, 0], [-1, -1, 0]] },
  { name: 'p2mg', nick: 'スピニングサイドル', gens: 'たての鏡映 ＋ すべり鏡映（→ 180° 回転）', maps: [[1, 1, 0], [-1, 1, 0], [1, -1, 0.5], [-1, -1, 0.5]] },
  { name: 'p11m', nick: 'ジャンプ', gens: '並進 ＋ よこの鏡映', maps: [[1, 1, 0], [1, -1, 0]] },
  { name: 'p2mm', nick: 'スピニングジャンプ', gens: 'たて・よこの鏡映（→ 180° 回転）', maps: [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0]] },
];
let segs = [];           // 模様の線分（x: 0〜0.5, y: -0.5〜0.5 の座標）
let layer;               // 7 本の帯を描いておく層
let sel = -1;            // 対称性を表示する帯
let hueNow = 0;
let pad, stripX, stripH, period;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  layout();
  preset();
}
function layout() {
  pad = { x: 30, y: 130, s: min(width * 0.24, height * 0.5) };
  stripX = pad.x + pad.s + 50;
  stripH = (height - 120) / 7;
  period = stripH * 1.1;    // ★ 周期の長さ（px）
  layer = createGraphics(width - stripX, height - 100);
  layer.colorMode(HSB, 360, 100, 100, 100);
}

// 例：「F」に似た非対称な模様
function preset() {
  segs = [];
  let add = (a, b, c, d) => { segs.push([a, b, c, d, hueNow]); hueNow += 25; };
  add(0.1, 0.4, 0.1, -0.4); add(0.1, -0.4, 0.42, -0.4); add(0.1, -0.05, 0.32, -0.05); add(0.32, -0.05, 0.4, 0.2);
  redrawAll();
}

function redrawAll() {
  layer.clear();
  for (let i = 0; i < 7; i++) {
    layer.noStroke(); layer.fill(i % 2 ? 220 : 225, 20, 16);
    layer.rect(0, i * stripH, layer.width, stripH);
  }
  for (let s of segs) drawSeg(s);
}

// 線分 1 本を 7 本の帯すべてに描く
function drawSeg(s) {
  layer.strokeWeight(3);
  layer.stroke(s[4] % 360, 70, 100);
  let sc = stripH * 0.8;
  for (let i = 0; i < 7; i++) {
    let cy = i * stripH + stripH / 2;
    for (let t of FRIEZE[i].maps) for (let k = -1; k * period < layer.width + period; k++) {
      let X = (x) => (t[0] * x + t[2] + k) * period, Y = (y) => cy + t[1] * y * sc;
      layer.line(X(s[0]), Y(s[1]), X(s[2]), Y(s[3]));
    }
  }
}

function draw() {
  background(230, 25, 10);
  image(layer, stripX, 100);
  // 左：描く枠（x は 0〜0.5、真ん中の線が帯の軸）
  noFill(); stroke(0, 0, 100, 60); strokeWeight(2);
  rect(pad.x, pad.y, pad.s, pad.s);
  stroke(0, 0, 100, 25); line(pad.x, pad.y + pad.s / 2, pad.x + pad.s, pad.y + pad.s / 2);
  for (let s of segs) {
    stroke(s[4] % 360, 70, 100); strokeWeight(3);
    line(pad.x + s[0] * 2 * pad.s, pad.y + (s[1] + 0.5) * pad.s, pad.x + s[2] * 2 * pad.s, pad.y + (s[3] + 0.5) * pad.s);
  }
  // 帯の名前
  for (let i = 0; i < 7; i++) {
    let y = 100 + i * stripH;
    noStroke(); fill(0, 0, 0, 55);
    rect(stripX, y + 2, 330, 24, 4);
    fill(i === sel ? color(50, 80, 100) : color(0, 0, 100)); textSize(15);
    text((i + 1) + '  ' + FRIEZE[i].name + '（' + FRIEZE[i].nick + '）  ' + FRIEZE[i].gens, stripX + 6, y + 19);
  }
  if (sel >= 0) drawSymmetry(sel);

  noStroke(); fill(0, 0, 100); textSize(18);
  text('左の枠でドラッグ：描く　1〜7：対称性を表示（' + (sel >= 0 ? FRIEZE[sel].name : 'なし') + '）　C：消す　P：例', 20, 36);
  fill(0, 0, 70); textSize(15);
  text('帯の模様の対称性はちょうど 7 種類。ニックネームは「足あと」の並び方（Conway）', 20, 62);
  fill(0, 0, 80); textSize(14);
  text('この枠が周期の左半分。', pad.x, pad.y + pad.s + 26);
  text('中央の線 = 帯の軸（よこの鏡・すべり鏡映の軸）', pad.x, pad.y + pad.s + 48);
}

// えらんだ帯の上に、鏡（実線）・すべり鏡映の軸（点線）・回転の中心（◆）を描く
function drawSymmetry(i) {
  let cy = 100 + i * stripH + stripH / 2, maps = FRIEZE[i].maps;
  let has = (a, d, e) => maps.some((t) => t[0] === a && t[1] === d && t[2] === e);
  strokeWeight(2);
  if (has(1, -1, 0)) { stroke(50, 90, 100); line(stripX, cy, width, cy); }
  if (has(1, -1, 0.5)) { stroke(50, 90, 100); drawingContext.setLineDash([10, 8]); line(stripX, cy, width, cy); drawingContext.setLineDash([]); }
  for (let k = 0; stripX + k * period / 2 < width; k++) {
    let x = stripX + (k * period) / 2;
    if (has(-1, 1, 0)) { stroke(170, 80, 100); line(x, cy - stripH / 2, x, cy + stripH / 2); }
    let rot = has(-1, -1, 0) ? 0 : has(-1, -1, 0.5) ? 0.25 : -1;
    if (rot >= 0) {
      let rx = stripX + (k * 0.5 + rot) * period;
      noStroke(); fill(330, 80, 100);
      quad(rx, cy - 7, rx + 7, cy, rx, cy + 7, rx - 7, cy);
    }
  }
}

function mouseDragged() {
  if (mouseX < pad.x || mouseX > pad.x + pad.s || mouseY < pad.y || mouseY > pad.y + pad.s) return;
  if (Math.hypot(mouseX - pmouseX, mouseY - pmouseY) < 2 || segs.length > 2000) return;
  let f = (x, y) => [(x - pad.x) / pad.s / 2, (y - pad.y) / pad.s - 0.5];
  let s = [...f(pmouseX, pmouseY), ...f(mouseX, mouseY), hueNow];
  hueNow += 2;
  segs.push(s);
  drawSeg(s);
}

function keyPressed() {
  if (key >= '1' && key <= '7' && key.length === 1) sel = sel === +key - 1 ? -1 : +key - 1;
  if (key === 'c' || key === 'C') { segs = []; redrawAll(); }
  if (key === 'p' || key === 'P') preset();
  return false;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); redrawAll(); }

// ---------- やってみよう ----------
// 1. 「F」の模様で 7 本を見比べ、それぞれ F がどう並んでいるか言葉で説明しよう
// 2. 左右対称な模様（例：「A」）を描くと、いくつかの帯が同じに見える。なぜ？
// 3. 身のまわりの帯模様（ふすま、着物、建物の飾り）は 7 種類のどれ？
// 4. 2 つの鏡映を合わせると 180° 回転になる（p2mm の ◆）。1〜7 で確かめよう
