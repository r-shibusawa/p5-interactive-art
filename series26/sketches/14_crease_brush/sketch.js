// ============================================
// 14 折り紙パターン・ブラシ（自由制作のベース）
// マス目の上に山折り・谷折りの線を描くと、対称に増えて、右側でタイルのように敷きつめられる（テッセレーション）
//   頂点ごとに前川の定理（M − V = ±2）をチェック。線を引くたびに音が鳴る
// ドラッグ = 折り線を描く / M・V = 山・谷 / 1〜4 = 対称（なし・鏡・4 回転・8 方向）/ P = お手本 / Z = 戻す / C = 消す / S = 保存
// ============================================

let N = 8;                 // ★ 1 マスの分割数
let mv = 'M';
let sym = 4;               // 1 = なし、2 = 左右の鏡、3 = 4 回回転、4 = 8 方向（鏡 + 回転）
let segs = [];             // 単位の線分 { i1, j1, i2, j2, mv }
let undoStack = [];
let startPt = null;
let cs, cx0, cy0;          // 編集マスの大きさと左上
let tilePg, dirty = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  layout();
  preset();
}
function layout() {
  cs = min(width * 0.4, height - 200);
  cx0 = 40; cy0 = 120;
  tilePg = createGraphics(max(10, floor(width - cx0 - cs - 80)), floor(height - 160));
  dirty = true;
}

// ★ 対称の変換（マスの中心のまわり）。座標は 0〜N の整数
function symCopies(i, j) {
  let out = [[i, j]];
  if (sym === 2) out.push([N - i, j]);
  if (sym >= 3) { out.push([N - j, i], [N - i, N - j], [j, N - i]); }
  if (sym === 4) { let m = out.slice(); for (let [a, b] of m) out.push([N - a, b]); }
  return out;
}

// 線を引く：対称にコピーし、格子点ごとの短い線分に分けて登録
function addStroke(a, b) {
  let added = 0, before = segs.slice();
  let A = symCopies(a.i, a.j), B = symCopies(b.i, b.j);
  for (let k = 0; k < A.length; k++) {
    let [i1, j1] = A[k], [i2, j2] = B[k];
    let di = i2 - i1, dj = j2 - j1, g = gcd(abs(di), abs(dj));
    if (g === 0) continue;
    for (let s = 0; s < g; s++) {
      let p = [i1 + di / g * s, j1 + dj / g * s], q = [i1 + di / g * (s + 1), j1 + dj / g * (s + 1)];
      let old = segs.find((e) => (e.i1 === p[0] && e.j1 === p[1] && e.i2 === q[0] && e.j2 === q[1]) || (e.i1 === q[0] && e.j1 === q[1] && e.i2 === p[0] && e.j2 === p[1]));
      if (old) old.mv = mv; else segs.push({ i1: p[0], j1: p[1], i2: q[0], j2: q[1], mv });
      added++;
    }
  }
  if (added) {
    undoStack.push(before);
    // ★ 音：長い線ほど低く、山は三角波・谷はサイン波。対称のコピーの数だけ和音
    let len = dist(a.i, a.j, b.i, b.j);
    let base = 880 / (1 + len * 0.5);
    for (let k = 0; k < min(A.length, 4); k++) playTone(base * [1, 1.25, 1.5, 2][k], 0.6, mv === 'M' ? 'triangle' : 'sine', 0.12, k * 0.06);
    dirty = true;
  }
}

function preset() {
  segs = []; undoStack = [];
  let keep = [mv, sym];
  sym = 2;                                                          // お手本：風船の基本形
  mv = 'V'; addStroke({ i: 0, j: 0 }, { i: N, j: N });             // 対角線 = 谷（鏡でもう 1 本）
  mv = 'M'; addStroke({ i: 0, j: N / 2 }, { i: N, j: N / 2 });     // 横の中心線 = 山
  [mv, sym] = keep;
  undoStack = [];
}

function gridPt(x, y) {
  let i = round((x - cx0) / cs * N), j = round((y - cy0) / cs * N);
  if (i < 0 || j < 0 || i > N || j > N) return null;
  return { i, j };
}
function P(i, j) { return { x: cx0 + i * cs / N, y: cy0 + j * cs / N }; }

// 頂点ごとの山・谷の数（内側の点だけ）
function vertexCheck() {
  let cnt = {};
  for (let e of segs) for (let [i, j] of [[e.i1, e.j1], [e.i2, e.j2]]) {
    let k = i + ',' + j;
    cnt[k] = cnt[k] || { i, j, M: 0, V: 0 };
    cnt[k][e.mv]++;
  }
  return Object.values(cnt).filter((c) => c.i > 0 && c.j > 0 && c.i < N && c.j < N);
}

function draw() {
  background(34, 32, 40);
  // 編集マス
  noStroke(); fill(246, 240, 226); rect(cx0, cy0, cs, cs);
  stroke(0, 0, 0, 25); strokeWeight(1);
  for (let k = 0; k <= N; k++) { line(P(k, 0).x, P(k, 0).y, P(k, N).x, P(k, N).y); line(P(0, k).x, P(0, k).y, P(N, k).x, P(N, k).y); }
  drawSegs(window, cx0, cy0, cs, 3);
  let checks = vertexCheck(), ng = 0;
  for (let c of checks) {
    let ok = abs(c.M - c.V) === 2;
    if (!ok) ng++;
    noStroke(); fill(ok ? color(40, 180, 110) : color(240, 60, 60)); circle(P(c.i, c.j).x, P(c.i, c.j).y, ok ? 7 : 11);
  }
  // ドラッグ中の線
  if (startPt) {
    let g = gridPt(mouseX, mouseY);
    if (g) {
      stroke(mv === 'M' ? color(220, 70, 50, 150) : color(50, 110, 230, 150)); strokeWeight(4);
      for (let [[a1, b1], [a2, b2]] of zip(symCopies(startPt.i, startPt.j), symCopies(g.i, g.j))) line(P(a1, b1).x, P(a1, b1).y, P(a2, b2).x, P(a2, b2).y);
    }
  }
  // タイル（敷きつめ）
  if (dirty) { renderTiles(); dirty = false; }
  image(tilePg, cx0 + cs + 40, 120);

  noStroke(); fill(255); textSize(18);
  text('ドラッグ：線を描く　M・V：' + (mv === 'M' ? '山（赤）' : '谷（青）') + '　1〜4：対称 ' + ['', 'なし', '左右の鏡', '4 回回転', '8 方向'][sym] + '　P：お手本　Z：戻す　C：消す　S：保存', 20, 40);
  fill(170); textSize(15);
  text('点の色 = 前川の定理のチェック（緑 = M − V = ±2、赤 = たためない）。NG ' + ng + ' / ' + checks.length + ' 点　　線分 ' + segs.length + ' 本', 20, 68);
  fill(150); textSize(13);
  text('右：このマスを敷きつめた模様（テッセレーション）', cx0 + cs + 40, 108);
}

function drawSegs(g, x0, y0, size, w) {
  g.strokeWeight(w);
  for (let e of segs) {
    if (e.mv === 'M') { g.stroke(220, 70, 50); g.drawingContext.setLineDash([w * 4, w * 1.5, w, w * 1.5]); }
    else { g.stroke(50, 110, 230); g.drawingContext.setLineDash([w * 2.5, w * 2]); }
    g.line(x0 + e.i1 * size / N, y0 + e.j1 * size / N, x0 + e.i2 * size / N, y0 + e.j2 * size / N);
  }
  g.drawingContext.setLineDash([]);
}
function renderTiles() {
  tilePg.background(246, 240, 226);
  let ts = 120;
  for (let y = 0; y < tilePg.height; y += ts) for (let x = 0; x < tilePg.width; x += ts) drawSegs(tilePg, x, y, ts, 1.5);
}

function mousePressed() { startAudio(); startPt = gridPt(mouseX, mouseY); }
function mouseReleased() {
  if (startPt) { let g = gridPt(mouseX, mouseY); if (g && (g.i !== startPt.i || g.j !== startPt.j)) addStroke(startPt, g); }
  startPt = null;
}
function keyPressed() {
  startAudio();
  if (key === 'm' || key === 'M') mv = 'M';
  if (key === 'v' || key === 'V') mv = 'V';
  if (key >= '1' && key <= '4') sym = int(key);
  if (key === 'p' || key === 'P') { preset(); dirty = true; }
  if (key === 'c' || key === 'C') { undoStack.push(segs); segs = []; dirty = true; }
  if ((key === 'z' || key === 'Z') && undoStack.length) { segs = undoStack.pop(); dirty = true; }
  if (key === 's' || key === 'S') saveCanvas('crease_pattern', 'png');
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); layout(); }

// ---------- やってみよう ----------
// 1. 8 方向の対称で、赤い点（NG）が 1 つもない模様をつくろう。本物の紙に写して折れるか試す
// 2. N を 6 や 12 に変えると、使える角度が変わる。三角形のマス目にするにはどう変える？
// 3. 音の決め方（線の長さ → 高さ）を、角度 → 高さに変えてみよう
// 4. 右のタイルを「1 マスごとに鏡に映す」敷きつめに変えると、つなぎ目の線がそろう


// ==================================================
// ここから下は「道具」（最大公約数・対応づけ・音）
// ==================================================
function gcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }
function zip(A, B) { return A.map((a, k) => [a, B[k]]); }
let audioCtx, masterOut;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
  }
  audioCtx.resume();
}
// 短い音（f Hz、dur 秒、delay 秒あとに）
function playTone(f, dur, type, vol, delay) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime + (delay || 0), o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type || 'sine'; o.frequency.value = constrain(f, 40, 4000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + dur + 0.05);
}
