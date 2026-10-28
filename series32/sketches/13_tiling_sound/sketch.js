// ============================================
// 13 タイリングを聞く 🔊
// 光る点がタイリングの上をまっすぐ進み、新しいタイルに入るたびに音が鳴る
//   タイルの形 → 音の高さの範囲、向き → 音階のどの音か
//   正方形・アルキメデス（周期的）はリズムがくり返す。ペンローズは「長い・短い」が くり返さずに混ざる
// クリック = 音を出す / 1 = 正方形 2 = 3.4.6.4 3 = ペンローズ / マウス上下 = 進む向き / ↑↓ = 速さ / スペース = 止める / S = 保存
// ============================================

let which = 3;          // ★ 1 = 正方形、2 = 3.4.6.4、3 = ペンローズ
let speed = 3;          // ★ 1 フレームに進むピクセル数
let paused = false;
let polys = [];         // { pts: [[x, y]…], kind, dir, id }
let buckets = new Map();
let layer;
let px = 0, py = 0, heading = 0;
let current = -1;
let events = [];        // 鳴った音の記録 { f: フレーム, kind }
let lastHit = -1;

// ★ 音階（ペンタトニック）
let scaleHz = [220, 247, 277, 330, 370, 440, 494, 554, 659, 740, 880, 988];
let kindCols = [[250, 190, 80], [70, 140, 220], [140, 220, 150], [240, 120, 120]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  layer = createGraphics(width, height);
  build();
}

function build() {
  polys = [];
  if (which === 1) {
    let s = 56;
    for (let x = -s; x < width + s; x += s) for (let y = -s; y < height + s; y += s) addPoly([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], 0, 0);
  } else if (which === 2) makeArch();
  else makePenrose();
  buckets = new Map();
  polys.forEach((P, i) => {
    let xs = P.pts.map((v) => v[0]), ys = P.pts.map((v) => v[1]);
    for (let bx = Math.floor(Math.min(...xs) / 64); bx <= Math.floor(Math.max(...xs) / 64); bx++)
      for (let by = Math.floor(Math.min(...ys) / 64); by <= Math.floor(Math.max(...ys) / 64); by++) {
        let k = bx + ',' + by;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(i);
      }
  });
  layer.background(18, 20, 28);
  layer.stroke(18, 20, 28);
  layer.strokeWeight(1.5);
  for (let P of polys) {
    let c = kindCols[P.kind];
    let sh = 0.55 + 0.1 * (P.dir % 5);
    layer.fill(c[0] * sh, c[1] * sh, c[2] * sh);
    layer.beginShape();
    for (let v of P.pts) layer.vertex(v[0], v[1]);
    layer.endShape(CLOSE);
  }
  px = 0;
  py = height / 2;
  events = [];
}

function addPoly(pts, kind, dir) { polys.push({ pts, kind, dir }); }

function draw() {
  image(layer, 0, 0);
  heading = map(mouseY, 0, height, -0.6, 0.6, true);
  if (!paused) {
    px += Math.cos(heading) * speed;
    py += Math.sin(heading) * speed;
    if (px > width) px -= width;
    if (py < 100) py += height - 200;
    if (py > height - 100) py -= height - 200;
    let hit = findPoly(px, py);
    if (hit >= 0 && hit !== lastHit) { lastHit = hit; playTile(polys[hit]); }
  }
  // いま鳴っているタイル
  if (lastHit >= 0) {
    noFill();
    stroke(255);
    strokeWeight(4);
    beginShape();
    for (let v of polys[lastHit].pts) vertex(v[0], v[1]);
    endShape(CLOSE);
  }
  noStroke();
  fill(255);
  circle(px, py, 14);
  stroke(255, 255, 255, 120);
  strokeWeight(1);
  line(px, py, px + Math.cos(heading) * 60, py + Math.sin(heading) * 60);
  drawTimeline();

  noStroke();
  fill(0, 0, 0, 170);
  rect(10, 10, 640, 74, 8);
  fill(255);
  textSize(19);
  text(['', '正方形（周期的）', '3.4.6.4（周期的）', 'ペンローズ（非周期的）'][which] + '　1〜3 で切りかえ', 22, 38);
  textSize(15);
  fill(200);
  text(audioCtx ? 'マウス上下で進む向き、↑↓ で速さ ' + speed + '。下の帯 = 音のリズム' : 'クリックすると音が出ます 🔊', 22, 66);
}

// ★ タイル → 音：形で高さの範囲、向きで音階の位置
function playTile(P) {
  let baseIdx = [3, 0, 6, 8][P.kind];
  let f = scaleHz[(baseIdx + P.dir) % scaleHz.length];
  playNote(f, P.kind === 1 ? 0.25 : 0.15, ['triangle', 'sine', 'square', 'sawtooth'][P.kind]);
  events.push({ f: frameCount, kind: P.kind });
  if (events.length > 200) events.shift();
}

// 下の帯：時間の流れ（右が今）。タイルの色の縦線 = 1 音
function drawTimeline() {
  let y = height - 70, h = 50, span = 360;
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, y - 10, width, h + 20);
  for (let e of events) {
    let age = frameCount - e.f;
    if (age > span) continue;
    let x = width - 20 - (age / span) * (width - 40);
    let c = kindCols[e.kind];
    fill(c[0], c[1], c[2]);
    rect(x, y, 4, h);
  }
  // 音と音の間隔（短い / 長い）を数える
  let gaps = [];
  for (let i = 1; i < events.length; i++) gaps.push(events[i].f - events[i - 1].f);
  let kinds = new Set(gaps.slice(-30).map((g) => Math.round(g / 2)));
  fill(220);
  textSize(14);
  text('最近 30 音の間隔の種類 ≈ ' + kinds.size, 20, y - 16);
}

function findPoly(x, y) {
  let list = buckets.get(Math.floor(x / 64) + ',' + Math.floor(y / 64)) || [];
  for (let i of list) if (insidePoly(x, y, polys[i].pts)) return i;
  return -1;
}

function mousePressed() { startAudio(); }
function keyPressed() {
  startAudio();
  if (key >= '1' && key <= '3') { which = int(key); build(); }
  if (key === UP_ARROW) speed = Math.min(12, speed + 1);
  if (key === DOWN_ARROW) speed = Math.max(1, speed - 1);
  if (key === ' ') paused = !paused;
  if (key === 's' || key === 'S') saveCanvas('tiling_sound', 'png');
}

// ---------- やってみよう ----------
// 1. 正方形で向きを水平（マウスを真ん中）にすると、完全に一定のリズム。少し傾けると？
// 2. ペンローズの帯を見ると、間隔は「長い」と「短い」がくり返さずに混ざる（06 のフィボナッチ語と同じ）
// 3. scaleHz を別の音階に変えて、タイリングで作曲しよう
// 4. playTile を改造し、タイルの面積で音の長さを変えよう


// ==================================================
// ここから下は「タイリングの道具」と「音を鳴らすための道具」
// ==================================================
function insidePoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    let a = poly[i], b = poly[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
// 3.4.6.4：六角形を格子に置き、間に正方形と三角形
function makeArch() {
  let s = 34, S3 = Math.sqrt(3), L = S3 + 1, P = Math.PI;
  let motif = [[0, 0, 6, P / 6, 2], [L / 2, 0, 4, P / 4, 1], [L / 4, (L * S3) / 4, 4, P / 4 + P / 3, 1], [(3 * L) / 4, (L * S3) / 4, 4, P / 4 + (2 * P) / 3, 1], [L / 2, (L * S3) / 6, 3, P / 2, 0], [L, (L * S3) / 3, 3, -P / 2, 0]];
  for (let i = -12; i <= 12; i++) for (let j = -8; j <= 8; j++) {
    for (let m = 0; m < motif.length; m++) {
      let [x, y, n, rot, kind] = motif[m];
      let cx = width / 2 + (x + i * L + (j * L) / 2) * s, cy = height / 2 + (y + (j * L * S3) / 2) * s;
      if (cx < -60 || cx > width + 60 || cy < -60 || cy > height + 60) continue;
      let r = s / (2 * Math.sin(P / n)), pts = [];
      for (let k = 0; k < n; k++) pts.push([cx + r * Math.cos(rot + (2 * P * k) / n), cy + r * Math.sin(rot + (2 * P * k) / n)]);
      addPoly(pts, kind, m % 3);
    }
  }
}
// ペンローズ：05 と同じ分割。三角形 2 枚を 1 枚のひし形にまとめる
function makePenrose() {
  const PHI = (1 + Math.sqrt(5)) / 2;
  let R = Math.hypot(width, height) * 0.6, tr = [];
  for (let i = 0; i < 10; i++) {
    let b = [R * Math.cos(((2 * i - 1) * Math.PI) / 10), R * Math.sin(((2 * i - 1) * Math.PI) / 10)];
    let c = [R * Math.cos(((2 * i + 1) * Math.PI) / 10), R * Math.sin(((2 * i + 1) * Math.PI) / 10)];
    if (i % 2 === 0) [b, c] = [c, b];
    tr.push([0, [0, 0], b, c]);
  }
  let L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let k = 0; k < 6; k++) {
    let out = [];
    for (let [c, A, B, C] of tr) {
      if (c === 0) { let P = L2(A, B, 1 / PHI); out.push([0, C, P, B], [1, P, C, A]); }
      else { let Q = L2(B, A, 1 / PHI), Rr = L2(B, C, 1 / PHI); out.push([1, Rr, C, A], [1, Q, Rr, B], [0, Rr, Q, A]); }
    }
    tr = out;
  }
  let half = new Map();
  for (let [c, A, B, C] of tr) {
    let k = c + ':' + [B, C].map((v) => Math.round(v[0] * 10) + ',' + Math.round(v[1] * 10)).sort().join('|');
    if (!half.has(k)) half.set(k, []);
    half.get(k).push(A);
    half.get(k).B = B;
    half.get(k).C = C;
    half.get(k).c = c;
  }
  for (let h of half.values()) {
    let pts = h.length === 2 ? [h[0], h.B, h[1], h.C] : [h[0], h.B, h.C];
    pts = pts.map((v) => [v[0] + width / 2, v[1] + height / 2]);
    if (pts.every((v) => v[0] < -50 || v[0] > width + 50 || v[1] < -50 || v[1] > height + 50)) continue;
    let ang = Math.atan2(h.C[1] - h.B[1], h.C[0] - h.B[0]);
    let dir = ((Math.round(ang / (Math.PI / 5)) % 5) + 5) % 5;   // ひし形の向きは 5 通り
    addPoly(pts, h.c === 0 ? 3 : 1, dir);
  }
}

let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); masterOut = audioCtx.createDynamicsCompressor(); masterOut.connect(audioCtx.destination); }
  audioCtx.resume();
}
function playNote(f, vol, type) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g);
  g.connect(masterOut);
  o.start(t);
  o.stop(t + 0.4);
}
