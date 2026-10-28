// ============================================
// 05 エネルギー保存：ジェットコースター
// レールの上をすべる玉。高さのエネルギー（位置エネルギー）と速さのエネルギー（運動エネルギー）が入れかわる
//   マウスでレールを描くと、左端から玉がスタートする。宙返りの頂上で v² ≥ gR なら落ちない
// ドラッグ = レールを描く / 1 = 山と谷 / 2 = 宙返り / F = 摩擦 ON/OFF / スペース = スタートに戻す
// ============================================

let PX = 60;               // ★ 1 m = 60 px
let g = 9.8;               // ★ 重力加速度 [m/s²]
let mu = 0.15;             // ★ 摩擦（速さに比例する抵抗の係数 [1/s]）
let friction = false;
let track = [];            // 等間隔に並べたレールの点 {x, y}
let ds = 4;                // 点の間隔 [px]
let drawing = false, raw = [];
let s = 0, v = 0;          // レールに沿った位置 [px] と速さ [m/s]
let loopTop = -1, loopR = 0, vTop = NaN;
let HIST = 600, hK = [], hU = [], hE = [];
let groundY;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  groundY = height * 0.88;
  preset(2);
}

// 手で描いた点を、等間隔 ds に並べなおす
function resample(pts) {
  let out = [pts[0]], acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = out[out.length - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y);
    while (d >= ds) {
      let t = ds / d, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(p); a = p; d = Math.hypot(b.x - a.x, b.y - a.y);
    }
  }
  return out;
}

function preset(n) {
  let pts = [], W = width * 0.46, x0 = width * 0.03, top = height * 0.22;
  if (n === 1) {
    for (let i = 0; i <= 200; i++) { let u = i / 200; pts.push({ x: x0 + u * W, y: top + (groundY - top - 20) * (0.5 - 0.5 * cos(u * TWO_PI * 1.5)) * (1 - 0.35 * u) }); }
  } else {
    // 坂を下りて、半径 loopR の円を 1 周して、また進む
    loopR = min(W * 0.16, (groundY - top) * 0.2);
    let cx = x0 + W * 0.62, bottom = groundY - 10;
    for (let i = 0; i <= 80; i++) { let u = i / 80; pts.push({ x: x0 + u * (cx - x0), y: top + (bottom - top) * (0.5 - 0.5 * cos(u * PI)) }); }
    for (let i = 1; i <= 120; i++) { let a = HALF_PI - (i / 120) * TWO_PI; pts.push({ x: cx + loopR * cos(a) * 1 + (i / 120) * 6, y: bottom - loopR + loopR * sin(a) }); }
    for (let i = 1; i <= 40; i++) pts.push({ x: cx + 6 + (i / 40) * (x0 + W - cx - 6), y: bottom });
  }
  setTrack(pts);
  // 宙返りの頂上（いちばん高い点のうち、半分より先にあるもの）
  loopTop = -1;
  if (n === 2) { let best = 1e9; for (let i = floor(track.length * 0.45); i < track.length; i++) if (track[i].y < best) { best = track[i].y; loopTop = i; } }
}
function setTrack(pts) { let t = resample(pts); if (t.length < 3) return; track = t; s = 0; v = 0; vTop = NaN; hK = []; hU = []; hE = []; }

// レールの位置 s での点・接線（単位ベクトル）
function trackAt(ss) {
  let f = constrain(ss / ds, 0, track.length - 1.001), i = floor(f), u = f - i;
  let a = track[i], b = track[i + 1];
  let tx = (b.x - a.x) / ds, ty = (b.y - a.y) / ds;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, tx, ty, i };
}

function draw() {
  background(260, 30, 11);
  let L = (track.length - 1) * ds;
  if (!drawing && track.length > 2) {
    // ★ 接線方向の加速度 = g × (下向きの傾き)。画面は y が下向きなので ty > 0 が下り坂
    for (let k = 0; k < 20; k++) {
      let h = 1 / 60 / 20, p = trackAt(s);
      let a = g * p.ty - (friction ? mu * v : 0);
      v = constrain(v + a * h, -60, 60);
      s += v * h * PX;
      if (s < 0) { s = 0; v = abs(v); }
      if (s > L) { s = L; v = -abs(v); }
      if (loopTop > 0 && abs(s / ds - loopTop) < 1) vTop = abs(v);
    }
  }
  let p = trackAt(s);
  let hgt = (groundY - p.y) / PX, K = 0.5 * v * v, U = g * hgt;
  pushHist(hK, K); pushHist(hU, U); pushHist(hE, K + U);

  // 地面とレール
  noStroke(); fill(0, 0, 16); rect(0, groundY, width * 0.5, height - groundY);
  stroke(0, 0, 70); strokeWeight(4); noFill();
  beginShape(); for (let q of (drawing ? raw : track)) vertex(q.x, q.y); endShape();
  if (!drawing && track.length > 2) {
    // 玉と速度の矢印
    let pxv = v * 8;
    stroke(130, 80, 100); strokeWeight(3); line(p.x, p.y - 14, p.x + p.tx * pxv, p.y - 14 + p.ty * pxv);
    noStroke(); fill(30, 90, 100); circle(p.x, p.y, 24);
    // スタートの高さ（摩擦なしならここまで戻ってくる）
    stroke(55, 90, 100, 60); strokeWeight(1); drawingContext.setLineDash([5, 6]);
    line(0, track[0].y, width * 0.48, track[0].y); drawingContext.setLineDash([]);
  }

  // 右：棒グラフと時間グラフ
  let gx = width * 0.52, gw = width * 0.44, E0 = g * (groundY - (track[0] ? track[0].y : groundY)) / PX;
  let bmax = max(E0, K + U, 1) * 1.15, bh = height * 0.3, by = height * 0.14;
  noStroke(); fill(0, 0, 14); rect(gx, by, gw * 0.35, bh + 40, 6);
  let bs = gw * 0.35 / 3, bw2 = bs * 0.6;
  barV(gx + bs * 0.2, by + bh + 20, bw2, bh, U / bmax, color(200, 70, 100), 'U = mgh');
  barV(gx + bs * 1.2, by + bh + 20, bw2, bh, K / bmax, color(330, 70, 100), 'K = ½mv²');
  barV(gx + bs * 2.2, by + bh + 20, bw2, bh, (K + U) / bmax, color(55, 90, 100), '合計');
  // 宙返りの判定
  noStroke(); fill(0, 0, 14); rect(gx + gw * 0.38, by, gw * 0.62, bh + 40, 6);
  fill(0, 0, 90); textSize(15);
  let tx = gx + gw * 0.38 + 16;
  text('高さ h = ' + nf(hgt, 1, 2) + ' m　速さ v = ' + nf(abs(v), 1, 2) + ' m/s', tx, by + 30);
  text('v = √(2g(h₀ − h)) なら ' + nf(sqrt(max(0, 2 * (E0 - U))), 1, 2) + ' m/s', tx, by + 56);
  if (loopTop > 0) {
    let R = loopR / PX, need = sqrt(g * R);
    text('宙返り：半径 R = ' + nf(R, 1, 2) + ' m', tx, by + 96);
    text('頂上で必要な速さ √(gR) = ' + nf(need, 1, 2) + ' m/s', tx, by + 122);
    if (isFinite(vTop)) { fill(vTop >= need ? 130 : 0, 80, 100); text('頂上の速さ ' + nf(vTop, 1, 2) + ' m/s → ' + (vTop >= need ? '落ちない ✓' : '本物なら落ちる！'), tx, by + 148); }
    fill(0, 0, 60); text('必要なスタートの高さ h₀ ≥ 2.5R（摩擦なし）', tx, by + 180);
  }
  drawPlot(gx, height * 0.56, gw, height * 0.32, [{ data: hU, hue: 200, name: 'U' }, { data: hK, hue: 330, name: 'K' }, { data: hE, hue: 55, name: 'K + U' }], 0, bmax, 'エネルギー（1 kg あたり、J/kg）');

  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグでレールを描く　1：山と谷　2：宙返り　摩擦 ' + (friction ? 'ON' : 'OFF') + '（F）　スペース：スタートへ', 20, 40);
  fill(0, 0, 65); textSize(15);
  text('摩擦がなければ K + U は一定 → スタートの高さ（黄色い点線）より高くは上がれない。摩擦を入れると熱になって減っていく', 20, 68);
}

function mousePressed() { if (mouseX < width * 0.5 && mouseY > 90) { drawing = true; raw = [{ x: mouseX, y: mouseY }]; loopTop = -1; } }
function mouseDragged() { if (drawing) { let q = raw[raw.length - 1]; if (Math.hypot(mouseX - q.x, mouseY - q.y) > 4) raw.push({ x: constrain(mouseX, 0, width * 0.5), y: constrain(mouseY, 90, groundY) }); } }
function mouseReleased() {
  if (!drawing) return;
  drawing = false;
  if (raw.length > 3) setTrack(raw);
}
function keyPressed() {
  if (key === '1') preset(1);
  if (key === '2') preset(2);
  if (key === 'f' || key === 'F') friction = !friction;
  if (key === ' ') { s = 0; v = 0; vTop = NaN; }
}

// ---------- やってみよう ----------
// 1. スタートより高い山を描くと、玉は越えられずに戻ってくる（エネルギー保存）
// 2. 宙返りの坂のスタートを低く描きなおして、頂上の速さが √(gR) を下回るのを確かめる
// 3. 摩擦 ON にすると K + U がだんだん減る。減った分はどこへ行った？
// 4. まっすぐな坂と、カーブした坂（最速降下線）、どちらが早く下に着く？ 描いて競争させてみよう


// ==================================================
// ここから下は「グラフを描く道具」です
// ==================================================
function pushHist(arr, val) {
  arr.push(isFinite(val) ? val : 0);
  if (arr.length > HIST) arr.shift();
}
function barV(x, y, w, h, f, c, name) {
  noStroke(); fill(c); rect(x, y - h * constrain(f, 0, 1.2), w, h * constrain(f, 0, 1.2), 4);
  fill(0, 0, 80); textSize(12); textAlign(CENTER); text(name, x + w / 2, y + 16); textAlign(LEFT, BASELINE);
}
// 時間プロット：枠 (x, y, w, h) に series = [{data, hue, name}] を描く（縦の範囲 lo〜hi）
function drawPlot(x0, y0, w, h, series, lo, hi, title) {
  noStroke(); fill(0, 0, 14); rect(x0, y0, w, h, 6);
  for (let s2 of series) {
    stroke(s2.hue, 70, 100); strokeWeight(2); noFill();
    beginShape();
    for (let i = 0, off = HIST - s2.data.length; i < s2.data.length; i++) vertex(map(i + off, 0, HIST - 1, x0, x0 + w), map(constrain(s2.data[i], lo, hi), lo, hi, y0 + h, y0));
    endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(LEFT, TOP);
  text(title, x0 + 8, y0 + 6);
  let lx = x0 + w - 8; textAlign(RIGHT, TOP);
  for (let s2 of series) { fill(s2.hue, 70, 100); text(s2.name, lx, y0 + 6); lx -= textWidth(s2.name) + 14; }
  textAlign(LEFT, BASELINE);
}
