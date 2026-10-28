// ============================================
// 08 壁紙模様（17 の壁紙群のうち 9 つ）
// マウスで描いた線が、対称性（並進・回転・鏡映・すべり鏡映）で平面いっぱいにコピーされる
//   平面をくり返し埋める模様の対称性はちょうど 17 種類しかない（壁紙群）
// ドラッグ = 描く / 1〜9 = p1 p2 pm pg cm p4 p4m p3 p6m / ↑↓ = 単位の大きさ / G = 単位の枠 / C = 消す / S = 保存
// ============================================

// ★ 壁紙群：周期の長方形 W×H（単位の大きさ = 1）と、その中のコピーの作り方（x' = a x + b y + e, y' = c x + d y + f）
const R3 = Math.sqrt(3);
const GROUPS = {
  p1: { W: 1, H: 1, maps: [[1, 0, 0, 1, 0, 0]], note: '並進だけ' },
  p2: { W: 1, H: 1, maps: [[1, 0, 0, 1, 0, 0], [-1, 0, 0, -1, 0, 0]], note: '180° 回転' },
  pm: { W: 1, H: 1, maps: [[1, 0, 0, 1, 0, 0], [-1, 0, 0, 1, 0, 0]], note: '鏡映（たて軸）' },
  pg: { W: 1, H: 1, maps: [[1, 0, 0, 1, 0, 0], [-1, 0, 0, 1, 0, 0.5]], note: 'すべり鏡映（鏡に映して半分ずらす）' },
  cm: { W: 1, H: 1, maps: [[1, 0, 0, 1, 0, 0], [-1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 0.5, 0.5], [-1, 0, 0, 1, 0.5, 0.5]], note: '鏡映 ＋ ひし形の格子' },
  p4: { W: 1, H: 1, maps: rotations(4, 0, 0), note: '90° 回転' },
  p4m: { W: 1, H: 1, maps: [...rotations(4, 0, 0), ...rotations(4, 0, 0).map(mirrorX)], note: '90° 回転 ＋ 鏡映（正方形の対称性）' },
  p3: { W: 1, H: R3, maps: withCenter(rotations(3, 0, 0)), note: '120° 回転（六角形の格子）' },
  p6m: { W: 1, H: R3, maps: withCenter([...rotations(6, 0, 0), ...rotations(6, 0, 0).map(mirrorX)]), note: '60° 回転 ＋ 鏡映（雪の結晶の対称性）' },
};
const NAMES = Object.keys(GROUPS);
let gName = 'p4m';
let unit = 150;          // ★ 単位の大きさ（px）
let segs = [];           // 描いた線分 [x1, y1, x2, y2, 色相]（単位の座標）
let cell;                // 周期の長方形 1 枚分の絵
let showGrid = true;
let hueNow = 0;

function rotations(m, cx, cy) {
  let out = [];
  for (let i = 0; i < m; i++) { let a = (i * Math.PI * 2) / m, c = Math.cos(a), s = Math.sin(a); out.push([c, -s, s, c, 0, 0]); }
  return out;
}
function mirrorX(t) { return [-t[0], -t[1], t[2], t[3], -t[4], t[5]]; }     // 先に変換してから x を反転
function withCenter(maps) { return [...maps, ...maps.map((t) => [t[0], t[1], t[2], t[3], t[4] + 0.5, t[5] + R3 / 2])]; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  presetMotif();
  rebuildCell();
}

// 最初から入っている非対称な模様（ここを消して自分で描こう）
function presetMotif() {
  segs = [];
  let pts = [];
  for (let t = 0; t <= 1; t += 0.05) pts.push([0.12 + 0.3 * t, 0.1 + 0.25 * t * t]);
  for (let i = 1; i < pts.length; i++) segs.push([...pts[i - 1], ...pts[i], 20 + i * 8]);
  segs.push([0.42, 0.35, 0.3, 0.42, 200], [0.3, 0.42, 0.36, 0.2, 200]);
}

function rebuildCell() {
  let G = GROUPS[gName];
  cell = createGraphics(max(4, round(G.W * unit)), max(4, round(G.H * unit)));
  cell.colorMode(HSB, 360, 100, 100, 100);
  cell.background(230, 25, 14);
  for (let s of segs) drawSeg(s);
}

// 1 本の線分を、すべてのコピー × となりの周期（はみ出し分）に描く
function drawSeg(s) {
  let G = GROUPS[gName];
  let sx = cell.width / G.W, sy = cell.height / G.H;
  cell.stroke(s[4] % 360, 70, 100);
  cell.strokeWeight(3);
  for (let t of G.maps) {
    let x1 = t[0] * s[0] + t[1] * s[1] + t[4], y1 = t[2] * s[0] + t[3] * s[1] + t[5];
    let x2 = t[0] * s[2] + t[1] * s[3] + t[4], y2 = t[2] * s[2] + t[3] * s[3] + t[5];
    // 周期の長方形の中に寄せてから、まわり 3×3 にも描く
    let ox = Math.floor(x1 / G.W) * G.W, oy = Math.floor(y1 / G.H) * G.H;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      let dx = i * G.W - ox, dy = j * G.H - oy;
      cell.line((x1 + dx) * sx, (y1 + dy) * sy, (x2 + dx) * sx, (y2 + dy) * sy);
    }
  }
}

function draw() {
  // 周期の長方形をしきつめる
  let G = GROUPS[gName];
  for (let y = 0; y < height; y += cell.height) for (let x = 0; x < width; x += cell.width) image(cell, x, y);
  if (showGrid) {
    stroke(0, 0, 100, 25); strokeWeight(1); noFill();
    for (let y = 0; y < height; y += cell.height) line(0, y, width, y);
    for (let x = 0; x < width; x += cell.width) line(x, 0, x, height);
  }
  // 説明の帯
  noStroke(); fill(0, 0, 0, 60);
  rect(0, 0, width, 104);
  fill(0, 0, 100); textSize(18);
  text('ドラッグ：描く　1〜9：' + NAMES.map((nm, i) => (i + 1) + ' ' + nm).join('  ') + '　↑↓：大きさ　G：枠　C：消す　S：保存', 20, 36);
  textSize(26); fill(50, 80, 100);
  text(gName, 20, 80);
  textSize(16); fill(0, 0, 90);
  text(G.note + '　｜　1 つの周期の中のコピー ' + G.maps.length + ' 個　｜　平面の模様の対称性は全部で 17 種類', 90, 78);
}

function mouseDragged() {
  if (mouseY < 104) return;
  let G = GROUPS[gName];
  let sx = cell.width / G.W, sy = cell.height / G.H;
  let s = [pmouseX / sx, pmouseY / sy, mouseX / sx, mouseY / sy, hueNow];
  if (Math.hypot(mouseX - pmouseX, mouseY - pmouseY) < 2 || segs.length > 3000) return;
  hueNow = (hueNow + 1.5) % 360;
  segs.push(s);
  drawSeg(s);
}

function keyPressed() {
  if (key >= '1' && key <= '9' && key.length === 1) { gName = NAMES[+key - 1]; rebuildCell(); }
  if (key === UP_ARROW) { unit = min(unit * 1.15, 400); rebuildCell(); }
  if (key === DOWN_ARROW) { unit = max(unit / 1.15, 50); rebuildCell(); }
  if (key === 'g' || key === 'G') showGrid = !showGrid;
  if (key === 'c' || key === 'C') { segs = []; rebuildCell(); }
  if (key === 's' || key === 'S') saveCanvas('wallpaper_' + gName, 'png');
  return false;
}

// ---------- やってみよう ----------
// 1. 同じ線のまま 1〜9 を切りかえて、どこに鏡・回転の中心があるか探そう
// 2. pm と pg の違いは？（鏡に映すだけか、映して半分ずらすか）。足あとを描くと pg がよくわかる
// 3. p3 と p6m の周期は正方形でなく 1 × √3 の長方形（六角形の格子）。G で枠を見よう
// 4. 残りの 8 種類（pmm, pmg, pgg, cmm, p4g, p3m1, p31m, p6）を GROUPS に足してみよう
// 5. エッシャーのように「すき間なく埋まる形」を描けるかな？ S で保存
