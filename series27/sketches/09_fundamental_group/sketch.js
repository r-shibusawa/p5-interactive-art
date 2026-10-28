// ============================================
// 09 基本群とループ
// 穴（くぎ）のあいた平面に輪ゴムのループをかける。ループを切らずに 1 点まで縮められるか？
//   各穴のまわりを何回まわったか（回転数）と、穴の上の「見えない線」をどの順で横切ったか（言葉）で調べる ＝ 基本群
// ドラッグ = ループを描く（離すと閉じる） / スペース = 輪ゴムを縮める / 1 = a / 2 = a a / 3 = a b / 4 = a b a⁻¹ b⁻¹（回転数 0 なのに縮まない！） / 5 = 縮むループ / C = 消す
// ============================================

let holes = [];
let holeR = 26;              // ★ 穴の半径
let loopPts = [], drawingNow = false;
let shrinking = false, collapsed = false;
let shrinkRate = 0.35;            // ★ 縮む強さ（なめらかにする量）
let spacing = 6;             // ★ ループの点の間隔（px）
let names = ['a', 'b', 'c'];
let hues = [20, 200, 120];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  let cx = width * 0.42, cy = height * 0.5;
  holes = [{ x: cx - 200, y: cy }, { x: cx, y: cy - 30 }, { x: cx + 200, y: cy + 20 }];
  wordPreset('ab');
}

// 言葉からループをつくる：下の基点 → 穴の下 → 穴のまわりを 1 周 → 基点へ戻る、をつなげる
function wordPreset(w) {
  let bx = width * 0.42, by = height * 0.86, pts = [];
  [...w].forEach((ch, k) => {
    let i = names.indexOf(ch.toLowerCase()), sgn = ch === ch.toLowerCase() ? 1 : -1, h = holes[i], rr = 62 + k * 10, off = k * 5;
    pts.push({ x: bx + off, y: by });
    for (let a = 0; a <= 64; a++) { let th = HALF_PI - sgn * (a / 64) * TWO_PI; pts.push({ x: h.x + rr * cos(th) + off * 0.3, y: h.y + rr * sin(th) }); }
  });
  loopPts = resample(pts); shrinking = false; collapsed = false;
}

// ★ 回転数：ループにそって「穴から見た向き」の変化を足す（反時計回り = +1）
function winding(h) {
  let sum = 0;
  for (let i = 0; i < loopPts.length; i++) {
    let a = loopPts[i], b = loopPts[(i + 1) % loopPts.length];
    let d = Math.atan2(b.y - h.y, b.x - h.x) - Math.atan2(a.y - h.y, a.x - h.x);
    if (d > PI) d -= TWO_PI; if (d < -PI) d += TWO_PI;
    sum += d;
  }
  return Math.round(-sum / TWO_PI);
}
// ★ 言葉：各穴から真上に引いた線を横切るたびに文字を書く（右→左 = a、左→右 = a⁻¹）。となりの a a⁻¹ は消す
function loopWord() {
  let w = [];
  for (let i = 0; i < loopPts.length; i++) {
    let a = loopPts[i], b = loopPts[(i + 1) % loopPts.length];
    holes.forEach((h, k) => {
      if ((a.x < h.x) === (b.x < h.x)) return;
      let y = a.y + ((h.x - a.x) * (b.y - a.y)) / (b.x - a.x);
      if (y < h.y) w.push({ k, e: b.x < a.x ? 1 : -1 });
    });
  }
  let out = [];
  for (let s of w) { let t = out[out.length - 1]; if (t && t.k === s.k && t.e === -s.e) out.pop(); else out.push(s); }
  while (out.length > 1 && out[0].k === out[out.length - 1].k && out[0].e === -out[out.length - 1].e) { out.shift(); out.pop(); }   // 輪なので両端も消せる
  return out;
}

function draw() {
  background(190, 30, 12);
  if (shrinking && !collapsed && loopPts.length > 2) for (let k = 0; k < 4; k++) shrinkStep();
  // 見えない線（穴の上）
  for (let i = 0; i < holes.length; i++) { stroke(hues[i], 50, 60, 50); strokeWeight(2); drawingContext.setLineDash([6, 8]); line(holes[i].x, holes[i].y, holes[i].x, 90); }
  drawingContext.setLineDash([]);
  // ループ
  noFill(); stroke(50, 80, 100); strokeWeight(4);
  if (loopPts.length > 1) { beginShape(); for (let p of loopPts) vertex(p.x, p.y); if (drawingNow) endShape(); else endShape(CLOSE); }
  // 穴
  let ws = holes.map((h) => (drawingNow || loopPts.length < 3 ? 0 : winding(h)));
  holes.forEach((h, i) => {
    noStroke(); fill(hues[i], 70, 90); circle(h.x, h.y, holeR * 2);
    fill(0, 0, 10); textAlign(CENTER, CENTER); textSize(24); text(names[i], h.x, h.y - 2);
    fill(0, 0, 100); textSize(18); text('回転数 ' + ws[i], h.x, h.y + holeR + 22);
  });
  textAlign(LEFT, BASELINE);
  let x0 = width * 0.68;
  if (!drawingNow && loopPts.length > 2) {
    let w = loopWord();
    fill(0, 0, 100); textSize(22); text('ループの言葉：', x0, 150);
    textSize(34); text(w.length ? w.map((s) => names[s.k] + (s.e < 0 ? '⁻¹' : '')).join(' ') : '1（空っぽ）', x0, 196);
    textSize(22);
    fill(w.length ? 0 : 130, 70, 100);
    text(w.length ? '縮められない' : '1 点まで縮められる', x0, 250);
    fill(0, 0, 65); textSize(15);
    let allZero = ws.every((v) => v === 0);
    if (w.length && allZero) { text('回転数は全部 0 なのに縮まない！', x0, 284); text('a b と b a は順番がちがう', x0, 306); text('（基本群は「かけ算の順番」が大事）', x0, 328); }
    else { text('回転数 = 言葉の中の a の個数', x0, 284); text('　　　　 − a⁻¹ の個数', x0, 306); }
    fill(0, 0, 100); textSize(18);
    if (collapsed) { fill(130, 70, 100); text('点に縮んだ！', x0, 380); }
    else if (shrinking) { text('縮めています…', x0, 380); text('（穴に引っかかると止まる）', x0, 404); }
  }
  noStroke(); fill(0, 0, 100); textSize(18);
  text('ドラッグ：ループを描く　スペース：縮める ' + (shrinking ? 'ON' : 'off') + '　1：a　2：a a　3：a b　4：a b a⁻¹ b⁻¹　5：縮むループ　C：消す', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('点線 = 穴の上の「見えない線」。右から左へ横切ると a、左から右なら a⁻¹。となりあう a a⁻¹ は打ち消しあう', 20, 68);
}

// 輪ゴムの 1 ステップ：となりの点の真ん中へ寄せる → 穴の中に入ったら押し出す → 点の間隔をそろえる
function shrinkStep() {
  let n = loopPts.length, next = [];
  for (let i = 0; i < n; i++) {
    let a = loopPts[(i - 1 + n) % n], p = loopPts[i], b = loopPts[(i + 1) % n];
    next.push({ x: p.x + shrinkRate * ((a.x + b.x) / 2 - p.x), y: p.y + shrinkRate * ((a.y + b.y) / 2 - p.y) });
  }
  for (let p of next) for (let h of holes) {
    let dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy);
    if (d < holeR + 5) { let s = (holeR + 5) / (d || 1); p.x = h.x + dx * s; p.y = h.y + dy * s; }
  }
  loopPts = resample(next);
  let L = 0;
  for (let i = 0; i < loopPts.length; i++) L += Math.hypot(loopPts[(i + 1) % loopPts.length].x - loopPts[i].x, loopPts[(i + 1) % loopPts.length].y - loopPts[i].y);
  if (L < 25) collapsed = true;
}

function mousePressed() { if (mouseY > 90) { loopPts = [{ x: mouseX, y: mouseY }]; drawingNow = true; shrinking = false; collapsed = false; } }
function mouseDragged() { if (drawingNow) { let l = loopPts[loopPts.length - 1]; if (Math.hypot(mouseX - l.x, mouseY - l.y) > 5) loopPts.push({ x: mouseX, y: mouseY }); } }
function mouseReleased() { if (drawingNow) { drawingNow = false; loopPts = loopPts.length > 5 ? resample(loopPts) : []; } }
function keyPressed() {
  if (key === ' ') { shrinking = !shrinking; collapsed = false; }
  if (key === '1') wordPreset('a');
  if (key === '2') wordPreset('aa');
  if (key === '3') wordPreset('ab');
  if (key === '4') wordPreset('abAB');
  if (key === '5') wordPreset('aA');
  if (key === 'c' || key === 'C') { loopPts = []; shrinking = false; }
}

// ---------- やってみよう ----------
// 1. 4（a b a⁻¹ b⁻¹）を縮めると、どこに引っかかって止まる？ 回転数が 0 なのに縮まない理由を考えよう
// 2. 穴 a のまわりを 2 回まわるループを自分で描いて、回転数と言葉を確かめよう
// 3. 穴を 1 つにすると（holes を 1 個に）、ループは回転数だけで分類できる（基本群 ＝ 整数）
// 4. 「額縁に絵をかけるひも」パズル：くぎ 2 本にかけて、どちらのくぎを抜いても落ちるかけ方の言葉は？（ヒント：4）


// ==================================================
// ここから下は「ループの点を等間隔にする道具」
// ==================================================
function resample(pts) {
  let n = pts.length, L = 0, seg = [];
  for (let i = 0; i < n; i++) { let a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b.x - a.x, b.y - a.y); seg.push(d); L += d; }
  let m = constrain(Math.round(L / spacing), 8, 1500), out = [], j = 0, acc = 0;
  for (let k = 0; k < m; k++) {
    let target = (k / m) * L;
    while (j < n - 1 && acc + seg[j] < target) { acc += seg[j]; j++; }
    let a = pts[j], b = pts[(j + 1) % n], u = seg[j] > 0 ? (target - acc) / seg[j] : 0;
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  }
  return out;
}
