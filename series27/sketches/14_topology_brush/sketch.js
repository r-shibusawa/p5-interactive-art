// ============================================
// 14 トポロジカル・ブラシ
// 正方形の辺を貼り合わせた世界（トーラス・クラインの壺・射影平面）でお絵かき。辺の外へ描くと、貼り合わせた相手の辺から線が出てくる
//   自由制作のベース：貼り方・色・音の決め方を変えよう。辺を越えるたびに音が鳴る
// クリックで音をスタート / ドラッグ = 描く（正方形の外まで描いてよい） / 1 = トーラス / 2 = クラインの壺 / 3 = 射影平面 / 0 = ふつうの紙
// A = 自動でまっすぐ進むペン / V = 貼り合わせを並べて見る / ↑↓ = 太さ / ←→ = A のペンの向き / S = 保存 / C = 消す
// ============================================

let surf = 1;
let pg, Q, X0, Y0;
let brush = 8;               // ★ ペンの太さ
let hueNow = 0;
let prevRaw = null;
let autoPen = false, wPos = { x: 0.3, y: 0.6 }, wDir = { x: Math.cos(0.4), y: -Math.sin(0.4) };
let tileView = false;
let lastTile = '0,0';
let names = { 0: 'ふつうの紙（貼らない）', 1: 'トーラス', 2: 'クラインの壺', 3: '射影平面' };

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  Q = floor(min(width * 0.5, height * 0.72));
  X0 = floor(width * 0.42 - Q / 2); Y0 = floor(height * 0.55 - Q / 2);
  pg = createGraphics(Q, Q);
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.background(230, 30, 14);
}

// ★ 貼り合わせの写像：となりのマスの点 → 正方形の中の点（座標は 0〜1、y は下向き）
function maps() {
  let out = [];
  if (surf === 0) return [(x, y) => [x, y]];
  if (surf === 1 || surf === 2) {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      let flip = surf === 2 && i !== 0;                      // クラインの壺：左右の辺を越えると上下さかさま
      out.push((x, y) => [x - i, (flip ? 1 - y : y) - j * (flip ? -1 : 1)]);
    }
    return out;
  }
  // 射影平面：左右を越えると上下さかさま、上下を越えると左右さかさま
  return [(x, y) => [x, y], (x, y) => [x - 1, 1 - y], (x, y) => [x + 1, 1 - y], (x, y) => [1 - x, y + 1], (x, y) => [1 - x, y - 1],
          (x, y) => [2 - x, 2 - y], (x, y) => [-x, -y], (x, y) => [2 - x, -y], (x, y) => [-x, 2 - y]];
}
// 正方形の外の点を、正方形の中の同じ点に戻す
function canonical(x, y) {
  for (let g of maps()) { let [a, b] = g(x, y); if (a >= 0 && a <= 1 && b >= 0 && b <= 1) return { x: a, y: b, g }; }
  return { x: constrain(x, 0, 1), y: constrain(y, 0, 1), g: (u, v) => [u, v] };
}

// 線分を、貼り合わせのすべての写し先に描く（正方形からはみ出た部分は自動で切れる）
function stroke2(a, b) {
  pg.stroke(hueNow, 70, 100); pg.strokeWeight(brush);
  for (let g of maps()) { let [x1, y1] = g(a.x, a.y), [x2, y2] = g(b.x, b.y); pg.line(x1 * Q, y1 * Q, x2 * Q, y2 * Q); }
}

function draw() {
  background(230, 25, 9);
  hueNow = (hueNow + 0.4) % 360;
  if (autoPen) stepAuto();
  if (tileView) drawTiles(); else {
    image(pg, X0, Y0);
    drawEdges(X0, Y0, Q);
    // 正方形の中のペンの位置
    let raw = { x: (mouseX - X0) / Q, y: (mouseY - Y0) / Q }, c = canonical(raw.x, raw.y);
    noFill(); stroke(0, 0, 100); strokeWeight(2); circle(X0 + c.x * Q, Y0 + c.y * Q, brush + 10);
    if (autoPen) { noStroke(); fill(50, 90, 100); circle(X0 + wPos.x * Q, Y0 + wPos.y * Q, 14); }
  }
  noStroke(); fill(0, 0, 100); textSize(30); text(names[surf], X0, Y0 - 24);
  textSize(18);
  text((audioCtx ? '♪' : 'クリックで音') + '　ドラッグ：描く（外まで描いてOK）　1 2 3 0：貼り方　A：自動ペン ' + (autoPen ? 'ON' : 'off') + '　V：並べて見る　↑↓：太さ　←→：ペンの向き　S：保存　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('同じ色の矢印の辺どうしが貼り合わされている。白い丸 = 正方形の中でのペンの位置', 20, 68);
  setTone(autoPen || mouseIsPressed ? 0.06 : 0, 200 + 400 * (1 - (autoPen ? wPos.y : constrain((mouseY - Y0) / Q, 0, 1))));
}

// A：まっすぐ進むペン。辺を越えたら相手の辺から、向きも貼り合わせどおりに変えて入る
function stepAuto() {
  let v = 0.006, nx = wPos.x + wDir.x * v, ny = wPos.y + wDir.y * v;
  stroke2(wPos, { x: nx, y: ny });
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
    let c = canonical(nx, ny), e = c.g(nx + wDir.x * 1e-3, ny + wDir.y * 1e-3);
    let dx = (e[0] - c.x) / 1e-3, dy = (e[1] - c.y) / 1e-3, m = Math.hypot(dx, dy) || 1;
    wDir = { x: dx / m, y: dy / m }; wPos = { x: c.x, y: c.y };
    ping(nx < 0 || nx > 1 ? 660 : 880);
    if (surf === 0) { wDir = { x: nx < 0 || nx > 1 ? -wDir.x : wDir.x, y: ny < 0 || ny > 1 ? -wDir.y : wDir.y }; }
  } else wPos = { x: nx, y: ny };
}

function drawEdges(x, y, s) {
  if (surf === 0) { noFill(); stroke(0, 0, 50); strokeWeight(2); rect(x, y, s, s); return; }
  // [辺, 向き(+1 = 右・下へ), 色]
  let E = { 1: [['T', 1, 20], ['B', 1, 20], ['L', 1, 200], ['R', 1, 200]], 2: [['T', 1, 20], ['B', 1, 20], ['L', 1, 200], ['R', -1, 200]], 3: [['T', 1, 20], ['B', -1, 20], ['L', 1, 200], ['R', -1, 200]] }[surf];
  for (let [e, d, h] of E) {
    let a = e === 'T' ? [x, y, x + s, y] : e === 'B' ? [x, y + s, x + s, y + s] : e === 'L' ? [x, y, x, y + s] : [x + s, y, x + s, y + s];
    if (d < 0) a = [a[2], a[3], a[0], a[1]];
    stroke(h, 80, 100); strokeWeight(5); line(...a);
    let mx = (a[0] + a[2]) / 2, my = (a[1] + a[3]) / 2, an = Math.atan2(a[3] - a[1], a[2] - a[0]);
    line(mx, my, mx - 16 * Math.cos(an - 0.6), my - 16 * Math.sin(an - 0.6)); line(mx, my, mx - 16 * Math.cos(an + 0.6), my - 16 * Math.sin(an + 0.6));
  }
}

// V：となりのマスに、貼り合わせどおりに裏返した絵を並べる（つながって見える）
function drawTiles() {
  let s = floor(min(width - 40, height - 130) / 3), ox = width / 2 - 1.5 * s, oy = 100;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    let fx = false, fy = false;
    if (surf === 2) fy = i !== 0;
    if (surf === 3) { fy = i !== 0; fx = j !== 0; }
    push(); translate(ox + (i + 1) * s + (fx ? s : 0), oy + (j + 1) * s + (fy ? s : 0)); scale(fx ? -1 : 1, fy ? -1 : 1);
    if (i || j) tint(0, 0, 100, 60); image(pg, 0, 0, s, s); noTint(); pop();
  }
  noFill(); stroke(0, 0, 100); strokeWeight(2); rect(ox + s, oy + s, s, s);
  if (surf === 3) { noStroke(); fill(0, 0, 70); textSize(14); text('射影平面は平面を並べてもきれいにはつながらない（角が合わない）。まわりの 8 枚は目安', ox, oy + 3 * s + 20); }
}

function mousePressed() { startAudio(); prevRaw = { x: (mouseX - X0) / Q, y: (mouseY - Y0) / Q }; lastTile = tileOf(prevRaw); }
function mouseDragged() {
  if (tileView || !prevRaw) return;
  let raw = { x: constrain((mouseX - X0) / Q, -0.95, 1.95), y: constrain((mouseY - Y0) / Q, -0.95, 1.95) };
  stroke2(prevRaw, raw);
  let t = tileOf(raw);
  if (t !== lastTile) { ping(t === '0,0' ? 520 : 780); lastTile = t; }
  prevRaw = raw;
}
function mouseReleased() { prevRaw = null; }
function tileOf(p) { return Math.floor(p.x) + ',' + Math.floor(p.y); }
function keyPressed() {
  startAudio();
  if ('0123'.includes(key) && key.length === 1) surf = int(key);
  if (key === 'a' || key === 'A') autoPen = !autoPen;
  if (key === 'v' || key === 'V') tileView = !tileView;
  if (key === UP_ARROW) brush = min(40, brush + 2);
  if (key === DOWN_ARROW) brush = max(2, brush - 2);
  if (key === LEFT_ARROW || key === RIGHT_ARROW) { let a = Math.atan2(wDir.y, wDir.x) + (key === LEFT_ARROW ? -0.1 : 0.1); wDir = { x: Math.cos(a), y: Math.sin(a) }; }
  if (key === 's' || key === 'S') saveCanvas('topology_brush', 'png');
  if (key === 'c' || key === 'C') pg.background(230, 30, 14);
}

// ---------- やってみよう ----------
// 1. トーラスで自動ペン（A）を走らせ、←→ で向きを変えよう。線が閉じる向きと、どこまでも埋めつくす向きがある
// 2. クラインの壺で正方形の右の辺の外に自分の名前を書くと、左の辺からどう出てくる？（V で並べて見る）
// 3. ping() の音の高さを、越えた辺（上下・左右）や曲面ごとに変えて「辺を越える音楽」にしよう
// 4. maps() に自分の貼り方を追加しよう（たとえば上下の辺だけさかさまに貼る）


// ==================================================
// ここから下は「音を鳴らすための道具」（描いている間の音・辺を越えたときの音）
// ==================================================
let audioCtx, masterOut, toneO, toneG;
function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterOut = audioCtx.createDynamicsCompressor();
    masterOut.connect(audioCtx.destination);
    toneO = audioCtx.createOscillator(); toneG = audioCtx.createGain();
    toneO.type = 'triangle'; toneG.gain.value = 0;
    toneO.connect(toneG); toneG.connect(masterOut); toneO.start();
  }
  audioCtx.resume();
}
// 描いている間の音（大きさ 0〜0.3、高さ Hz）
function setTone(vol, freq) {
  if (!audioCtx) return;
  let t = audioCtx.currentTime;
  toneG.gain.setTargetAtTime(constrain(vol, 0, 0.3), t, 0.05);
  toneO.frequency.setTargetAtTime(constrain(freq, 50, 2000), t, 0.05);
}
// 短い「チン」（辺を越えたとき）
function ping(f) {
  if (!audioCtx) return;
  let o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  o.connect(g); g.connect(masterOut); o.start(t); o.stop(t + 0.65);
}
