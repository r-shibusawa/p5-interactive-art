// ============================================
// 09 周辺視ドリフト錯視（止まっている絵が回って見える）
// 明るさの階段「黒 → 暗い灰 → 白 → 明るい灰」をくり返して並べるだけ。視線を動かしたり、まばたきすると
// 目のはし（周辺視）で、黒 → 暗い灰 の向きに少しずつ動いて見える。並びを入れかえると止まる・逆に回る
// 1 = 黒→暗灰→白→明灰（動く）/ 2 = 黒→白→暗灰→明灰（止まる）/ 3 = 逆向き / L = 輪 ⇔ 横のしま
// ←→ = 1 周の区切りの数 / ↑↓ = 輪の数 / T = 真実（動いていないことを画素で確かめる、明るさの並びを拡大）
// 長く見つめて気分が悪くなったら目を離す
// ============================================

let LUM = { B: 0, DG: 90, W: 255, LG: 170 };   // ★ 4 つの明るさ
let ORDERS = [['B', 'DG', 'W', 'LG'], ['B', 'W', 'DG', 'LG'], ['LG', 'W', 'DG', 'B']];
let orderNo = 0;
let SEG = 20;                // ★ 1 周（1 行）の区切りの数
let RINGS = 6;               // ★ 輪の数
let rowsLayout = false, truthKey = false;
let pg, lastSum = null, diffNow = 0;
const BG = 128;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noSmooth();
  build();
  drawScene(false);
  selfTest();
}
function draw() { drawScene(truthKey); }

function geom() { let R = Math.min(width * 0.36, height * 0.41); return { cx: Math.round(width * 0.4), cy: Math.round(height * 0.535), R }; }
// k 番目の輪の内側・外側の半径
function ringR(k) { let g = geom(), w = g.R / (RINGS + 0.6); return [w * (k + 0.6) + 3, w * (k + 1.6) - 3]; }

// 絵をバッファに 1 回だけ描く（動かすのは見ている人の目）
function build() {
  if (!pg || pg.width !== width || pg.height !== height) { if (pg) pg.remove(); pg = createGraphics(width, height); pg.pixelDensity(1); }
  pg.background(BG); pg.noStroke();
  let g = geom(), ord = ORDERS[orderNo];
  if (!rowsLayout) {
    for (let k = 0; k < RINGS; k++) {
      let [r0, r1] = ringR(k), dir = k % 2 ? -1 : 1, rot = k * 0.37;      // となりの輪は逆向き
      for (let s = 0; s < SEG; s++) for (let q = 0; q < 4; q++) {
        let a0 = rot + (dir * TWO_PI * (s + q / 4)) / SEG, a1 = rot + (dir * TWO_PI * (s + (q + 1) / 4)) / SEG;
        pg.fill(LUM[ord[q]]); sector(pg, g.cx, g.cy, r0, r1, a0, a1);
      }
    }
  } else {
    let h = (2 * g.R) / RINGS, w = (2 * g.R) / SEG;
    for (let k = 0; k < RINGS; k++) {
      let dir = k % 2 ? -1 : 1, y = g.cy - g.R + k * h + 3;
      for (let s = 0; s < SEG; s++) for (let q = 0; q < 4; q++) {
        let x = g.cx - g.R + s * w + (dir > 0 ? q : 3 - q) * (w / 4);
        pg.fill(LUM[ord[q]]); pg.rect(x, y, w / 4 + 0.6, h - 6);
      }
    }
  }
  pg.fill(255, 40, 40); pg.circle(g.cx, g.cy, 8);                       // 見つめる点
}
// 扇形の帯（半径 r0〜r1、角度 a0〜a1）を折れ線で
function sector(gr, cx, cy, r0, r1, a0, a1) {
  let n = 6;
  gr.beginShape();
  for (let i = 0; i <= n; i++) { let a = a0 + ((a1 - a0) * i) / n; gr.vertex(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); }
  for (let i = n; i >= 0; i--) { let a = a0 + ((a1 - a0) * i) / n; gr.vertex(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)); }
  gr.endShape(CLOSE);
}

function drawScene(truth) {
  image(pg, 0, 0, width, height);
  let names = ['黒→暗灰→白→明灰（動く）', '黒→白→暗灰→明灰（止まる）', '逆の並び（逆に回る）'];
  noStroke(); fill(235); rect(0, 0, width, 70);
  fill(20); textSize(18); textAlign(LEFT, BASELINE);
  text('1〜3：' + names[orderNo] + '　L：' + (rowsLayout ? '横のしま' : '輪') + '　←→：区切り ' + SEG + '　↑↓：輪 ' + RINGS + '　T：真実', 20, 30);
  fill(160, 30, 30); textSize(15);
  text('赤い点のまわりをゆっくり見回す・まばたきする。長く見つめて気分が悪くなったら目を離す', 20, 56);
  // 真実：明るさの並びを拡大、前の確認との画素の差
  let px = width - 250;
  if (truth) {
    if (frameCount % 30 === 0 || lastSum === null) { loadPixels(); let s = sampleSum(); diffNow = lastSum === null ? 0 : Math.abs(s - lastSum); lastSum = s; }
    fill(235); rect(px - 20, 90, 250, 260, 10);
    fill(20); textSize(15); text('明るさの並び（1 区切り）', px, 116);
    ORDERS[orderNo].forEach((nm, q) => { fill(LUM[nm]); stroke(60); rect(px + q * 52, 130, 50, 90); noStroke(); fill(20); textAlign(CENTER, TOP); text(LUM[nm], px + q * 52 + 25, 226); textAlign(LEFT, BASELINE); });
    fill(20); text('0.5 秒ごとに画面の画素を', px, 280); text('読んで比べた差：' + diffNow, px, 302);
    fill(diffNow === 0 ? color(30, 130, 60) : color(200, 40, 40)); text(diffNow === 0 ? '→ 1 画素も動いていない' : '→ 変化あり', px, 326);
  } else lastSum = null;
  fill(235); rect(10, height - 36, 150, 28, 6);
  fill(selfTestResults.length && selfTestResults.every((r) => r.ok) ? color(30, 130, 60) : color(200, 40, 40)); textSize(14);
  text(selfTestLine(), 20, height - 16);
}
// 絵の範囲の画素を間引いて合計（変化の確認用）
function sampleSum() { let g = geom(), s = 0; for (let y = g.cy - g.R; y < g.cy + g.R; y += 7) for (let x = g.cx - g.R; x < g.cx + g.R; x += 7) s += readPix(x, y)[0]; return s; }

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') { orderNo = +key - 1; build(); }
  if (key === 'l' || key === 'L') { rowsLayout = !rowsLayout; build(); }
  if (key === RIGHT_ARROW) { SEG = Math.min(48, SEG + 2); build(); }
  if (key === LEFT_ARROW) { SEG = Math.max(6, SEG - 2); build(); }
  if (key === UP_ARROW) { RINGS = Math.min(10, RINGS + 1); build(); }
  if (key === DOWN_ARROW) { RINGS = Math.max(1, RINGS - 1); build(); }
  if (key === 't' || key === 'T') truthKey = !truthKey;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); build(); }

// ---------- やってみよう ----------
// 1. 1 と 2 を切りかえる。同じ 4 つの明るさなのに、並びだけで動いたり止まったりする
// 2. 3（逆の並び）で回る向きが逆になる？
// 3. LUM の暗い灰 DG を 0（黒と同じ）にすると？ 階段が 3 段になると弱くなる？
// 4. L で横のしまにすると、行ごとに左右に流れて見える
// 5. 画面に近づく・離れる。区切りの大きさ（←→）で強さは変わる？


// ==================================================
// ここから下は「錯視の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function readPix(x, y) {
  let d = pixelDensity(), i = 4 * (Math.round(y * d) * Math.round(width * d) + Math.round(x * d));
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
}

// ---- 自己テスト：描いた輪の画素を読んで、明るさの並びと「動いていない」ことを確かめる
let selfTestResults = [];
function selfTest() {
  let R = [], ok = (name, cond) => R.push({ name, ok: !!cond }), keep = orderNo, g = geom();
  let readSeq = (k) => {          // k 番目の輪の 1 区切り目の 4 つの明るさ（帯の真ん中）
    let [r0, r1] = ringR(k), r = (r0 + r1) / 2, dir = k % 2 ? -1 : 1, rot = k * 0.37;
    return [0, 1, 2, 3].map((q) => { let a = rot + (dir * TWO_PI * (q + 0.5) / 4) / SEG; return readPix(g.cx + r * Math.cos(a), g.cy + r * Math.sin(a))[0]; });
  };
  orderNo = 0; build(); drawScene(false); loadPixels();
  let want = ORDERS[0].map((n) => LUM[n]);
  ok('内側の輪：画素の並び ' + readSeq(0).join('→') + ' = 黒→暗灰→白→明灰', readSeq(0).join() === want.join());
  ok('となりの輪も同じ並び（角度は逆回り）' + readSeq(1).join('→'), readSeq(1).join() === want.join());
  let s1 = sampleSum(); drawScene(false); loadPixels(); let s2 = sampleSum();
  ok('もう一度描いても画素は 1 つも変わらない（止まっている絵）', s1 === s2);
  let lv = new Set(); for (let y = g.cy - g.R; y < g.cy + g.R; y += 5) for (let x = g.cx - g.R; x < g.cx + g.R; x += 5) { let v = readPix(x, y); if (v[0] === v[1] && v[1] === v[2]) lv.add(v[0]); }
  ok('使っている明るさ：0・90・170・255 と背景 128 がすべて現れる', [0, 90, 170, 255, 128].every((v) => lv.has(v)));
  orderNo = 1; build(); drawScene(false); loadPixels();
  ok('並び 2（止まる）は 黒→白→暗灰→明灰：' + readSeq(0).join('→'), readSeq(0).join() === ORDERS[1].map((n) => LUM[n]).join());
  orderNo = keep; build(); drawScene(false);
  selfTestResults = R;
  for (let r of R) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name);
  return R.every((r) => r.ok);
}
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
