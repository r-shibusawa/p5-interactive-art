// ============================================
// 12 ゼロ知識証明（洞窟の例・グラフ彩色）
// 「秘密を知っている」ことだけを、秘密そのものは 1 ビットも見せずに納得させる方法。
//   左：輪になった洞窟の奥に合言葉の扉。ペギーが入り、ビクターが「A から出て」「B から出て」と叫ぶ。
//       合言葉を知らない人は 1 回あたり 1/2 の確率でしか当てられない → k 回続けて成功する確率は (1/2)^k
//   右：グラフの 3 彩色。毎回色をシャッフルして封をし（コミット）、ビクターが選んだ辺の両端だけ開ける
// スペース = 次のラウンド / A = 自動 / K = ペギーが本当に知っている ⇄ ずるをする / 辺をクリック = その辺を開けさせる / R = リセット
// ※ 教育用の概念モデル
// ============================================

let knows = true;            // ★ true = 秘密を知っている、false = ずるをする
let auto = false;
let phase = 3, t = 0;        // 洞窟のアニメ：0 入る 1 呼ぶ 2 出る 3 結果
let hideSide = 0, callSide = 0, exitSide = 0;
let caveLog = [];
// グラフ（7 頂点）。正しい 3 彩色と、1 本だけ矛盾のある「ずる」の彩色
const NODES = 7;
const EDGES = [[0, 1], [1, 2], [2, 0], [0, 4], [1, 3], [2, 5], [3, 4], [4, 5], [5, 3], [3, 6], [6, 0], [4, 2]];
const GOOD = [0, 1, 2, 2, 1, 0, 1];
const BAD = [0, 1, 2, 2, 1, 0, 2];       // 頂点 6 が 頂点 3 と同じ色 → 辺 3-6 が矛盾
let colorPerm = [0, 1, 2], openEdge = -1, graphLog = [];
const PALETTE = [[255, 110, 110], [110, 220, 140], [110, 160, 255]];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');
}

function speed() { return auto ? 0.06 : 0.035; }

function draw() {
  background(16, 16, 22);
  noStroke();
  fill(240);
  textSize(18);
  text('ゼロ知識証明　スペース 次のラウンド　A 自動 ' + (auto ? 'ON' : 'off') + '　K ペギー：' + (knows ? '本当に知っている' : 'ずるをする') + '　辺をクリック　R リセット', 24, 34);
  fill(150);
  textSize(14);
  text('ビクターは何回やっても秘密（合言葉・色の塗り方）を知ることはできない。でも「知っている」ことには納得する　｜ 教育用', 24, 56);

  // 洞窟のアニメを進める
  if (phase < 3) { t += speed(); if (t >= 1) { t = 0; phase++; if (phase === 3) finishCave(); } }
  else if (auto && frameCount % 30 === 0) nextRound();

  drawCave(width * 0.25, height * 0.45, min(width * 0.17, height * 0.26));
  drawGraph(width * 0.74, height * 0.42, min(width * 0.18, height * 0.25));
}

// ---------------- 洞窟 ----------------
function drawCave(cx, cy, R) {
  // 岩
  fill(48, 42, 38);
  circle(cx, cy, R * 2 + 70);
  rect(cx - 30, cy + R, 60, R * 0.6);
  // 通路（輪）
  noFill();
  stroke(110, 96, 80);
  strokeWeight(34);
  circle(cx, cy, R * 2);
  line(cx, cy + R, cx, cy + R * 1.6);
  // 扉（上）
  stroke(255, 200, 90);
  strokeWeight(8);
  line(cx, cy - R - 20, cx, cy - R + 20);
  noStroke();
  fill(220);
  textSize(16);
  textAlign(CENTER);
  text('合言葉の扉', cx, cy - R - 34);
  text('A', cx - R - 40, cy + 6);
  text('B', cx + R + 40, cy + 6);
  // ビクター
  let vy = phase >= 1 ? cy + R + 10 : cy + R * 1.7;
  if (phase === 1) vy = lerp(cy + R * 1.7, cy + R + 10, t);
  fill(130, 180, 255);
  circle(cx, vy, 26);
  text('ビクター', cx + 60, vy + 6);
  if (phase >= 1) { fill(130, 180, 255); textSize(18); text('「' + 'AB'[callSide] + ' から出て！」', cx, cy + R * 1.95); }
  // ペギー
  let ang = peggyAngle(), px, py;
  if (ang === null) { px = cx; py = cy + R * 1.5; }
  else { px = cx + R * cos(radians(ang)); py = cy + R * sin(radians(ang)); }
  fill(255, 140, 180);
  circle(px, py, 26);
  textSize(14);
  text('ペギー', px, py - 20);
  // 結果
  textSize(16);
  if (phase === 3 && caveLog.length) {
    let last = caveLog[caveLog.length - 1];
    fill(last ? color(120, 230, 150) : color(255, 110, 110));
    text(last ? '言われた側から出てきた ✓' : '違う側から出てきた ✗ ずるがばれた', cx, cy);
  }
  textAlign(LEFT);
  // 記録
  let streak = 0;
  for (let i = caveLog.length - 1; i >= 0 && caveLog[i]; i--) streak++;
  let ly = height - 110;
  fill(200);
  textSize(15);
  text('連続成功 ' + streak + ' 回　→ ずるで当て続ける確率 (1/2)^' + streak + ' = ' + (streak > 30 ? '≈0' : '1/' + pow(2, streak).toLocaleString()), 24, ly);
  for (let i = 0; i < min(caveLog.length, 40); i++) {
    let v = caveLog[caveLog.length - min(caveLog.length, 40) + i];
    fill(v ? color(120, 230, 150) : color(255, 110, 110));
    circle(34 + i * 14, ly + 22, 10);
  }
}

// 洞窟の中のペギーの角度（度）。下 = 90°、A（左）側 = 180°、上の扉 = 270°、B（右）側 = 360°
function peggyAngle() {
  let hideA = 225, hideB = 315;
  if (phase === 0) return hideSide === 0 ? lerp(90, hideA, t) : lerp(90, hideB - 360, t);
  if (phase === 1) return hideSide === 0 ? hideA : hideB;
  if (phase === 2 || phase === 3) {
    let s = phase === 3 ? 1 : t;
    if (exitSide === 0) return hideSide === 0 ? lerp(hideA, 90, s) : lerp(hideB, 90, s);
    return hideSide === 0 ? lerp(hideA, 450, s) : lerp(hideB, 450, s);
  }
  return null;
}

function finishCave() { caveLog.push(exitSide === callSide); if (caveLog.length > 200) caveLog.shift(); }

// ---------------- グラフ彩色 ----------------
function nodePos(i, cx, cy, R) {
  if (i < 3) { let a = -HALF_PI + i * TWO_PI / 3; return [cx + R * 0.45 * cos(a), cy + R * 0.45 * sin(a)]; }
  if (i < 6) { let a = HALF_PI + (i - 3) * TWO_PI / 3; return [cx + R * cos(a), cy + R * sin(a)]; }
  return [cx - R * 1.15, cy - R * 0.75];
}

function drawGraph(cx, cy, R) {
  let col = knows ? GOOD : BAD;
  for (let e = 0; e < EDGES.length; e++) {
    let [a, b] = EDGES[e], pa = nodePos(a, cx, cy, R), pb = nodePos(b, cx, cy, R);
    stroke(e === openEdge ? color(255, 220, 120) : color(90, 90, 110));
    strokeWeight(e === openEdge ? 5 : 3);
    line(pa[0], pa[1], pb[0], pb[1]);
  }
  noStroke();
  for (let i = 0; i < NODES; i++) {
    let p = nodePos(i, cx, cy, R);
    let shown = openEdge >= 0 && EDGES[openEdge].includes(i);
    if (shown) { let c = PALETTE[colorPerm[col[i]]]; fill(c[0], c[1], c[2]); }
    else fill(70, 70, 86);
    circle(p[0], p[1], 34);
    if (!shown) { fill(150); textSize(14); textAlign(CENTER); text('封', p[0], p[1] + 5); textAlign(LEFT); }
  }
  fill(220);
  textSize(15);
  textAlign(CENTER);
  text('隣どうしが違う色になる 3 色の塗り方を知っている（封 = コミット）', cx, cy - R - 30);
  if (openEdge >= 0) {
    let [a, b] = EDGES[openEdge], ok = col[a] !== col[b];
    fill(ok ? color(120, 230, 150) : color(255, 110, 110));
    text(ok ? '開けた 2 色は違う ✓（色は毎回シャッフルされるので何も分からない）' : '同じ色だった ✗ ずるがばれた', cx, cy + R + 50);
  }
  textAlign(LEFT);
  let passed = 0; for (let i = graphLog.length - 1; i >= 0 && graphLog[i]; i--) passed++;
  let pCheat = pow(1 - 1 / EDGES.length, passed);
  let ly = height - 110, lx = width * 0.52;
  fill(200);
  textSize(15);
  text('連続成功 ' + passed + ' 回　→ ずるが見つからない確率 (1 − 1/' + EDGES.length + ')^' + passed + ' = ' + nf(pCheat, 1, 4), lx, ly);
  for (let i = 0; i < min(graphLog.length, 40); i++) {
    let v = graphLog[graphLog.length - min(graphLog.length, 40) + i];
    fill(v ? color(120, 230, 150) : color(255, 110, 110));
    circle(lx + 10 + i * 14, ly + 22, 10);
  }
}

function graphRound(edge) {
  colorPerm = shuffle([0, 1, 2]);      // ★ 毎回、色の名前をシャッフルしてから封をする
  openEdge = edge;
  let col = knows ? GOOD : BAD, [a, b] = EDGES[edge];
  graphLog.push(col[a] !== col[b]);
  if (graphLog.length > 200) graphLog.shift();
}

function nextRound() {
  if (phase < 3) return;
  hideSide = floor(random(2));          // ペギーはどちらかに隠れる（ビクターは見ていない）
  callSide = floor(random(2));          // ★ ビクターはランダムに呼ぶ
  if (knows) exitSide = callSide;       // 合言葉で扉を通れるので、いつも言われた側から出られる
  else exitSide = hideSide;             // 扉を通れない → 隠れた側からしか出られない
  phase = 0; t = 0;
  graphRound(floor(random(EDGES.length)));
}

function mousePressed() {
  let cx = width * 0.74, cy = height * 0.42, R = min(width * 0.18, height * 0.25);
  for (let e = 0; e < EDGES.length; e++) {
    let pa = nodePos(EDGES[e][0], cx, cy, R), pb = nodePos(EDGES[e][1], cx, cy, R);
    if (distToSegment(mouseX, mouseY, pa, pb) < 12) { graphRound(e); return; }
  }
}

function keyPressed() {
  if (key === ' ') nextRound();
  if (key === 'a' || key === 'A') auto = !auto;
  if (key === 'k' || key === 'K') { knows = !knows; caveLog = []; graphLog = []; openEdge = -1; }
  if (key === 'r' || key === 'R') { caveLog = []; graphLog = []; openEdge = -1; phase = 3; }
  return false;
}

// ---------- やってみよう ----------
// 1. K で「ずる」にして A で自動。洞窟は何回目でばれる？ グラフ彩色はなかなかばれないのはなぜ？
// 2. ずるのペギーが「ビクターが何と言うか前もって知っていたら」？ → 呼ぶ側のランダムさが大切
// 3. 色をシャッフルしない（colorPerm = [0, 1, 2] のまま）と、何回も開けるうちに塗り方がバレる。なぜ？
// 4. 成功確率 99.9999% にするには洞窟で何回、グラフで何回のラウンドが要る？

// ==================================================
// ここから下は「道具」（点と線分の距離）
// ==================================================
function distToSegment(px, py, a, b) {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  let u = constrain(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - a[0] - u * dx, py - a[1] - u * dy);
}
