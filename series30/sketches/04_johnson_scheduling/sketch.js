// ============================================
// 04 割当とスケジューリング ─ ジョンソン法
// 印刷所の仕事（ジョブ）は全部「印刷機 M1 → 製本機 M2」の順に通る。どの順番で流すと全部終わる時刻（メイクスパン）が一番早い？
//   ジョンソン法（1954）：M1 が短い仕事は前へ（短い順）、M2 が短い仕事は後ろへ（長い順）。2 台なら必ず最適になる
// ドラッグ = 下の札を並べかえる / J = ジョンソン法 / X = ばらばらに / ↑↓ = 仕事の数 / R = 新しい仕事
// ============================================

let nJobs = 6;                         // ★ 仕事の数（4〜8）
let jobs = [];                         // { a: M1 の時間, b: M2 の時間, hue }
let seq = [];                          // 流す順番
let dragK = -1, dragX = 0;
let allSpans = [], bestSpan = 0;       // 全部の順番を試した結果（ヒストグラム用）
let worstSpan = 0, meanSpan = 0, spanCount = [];
let johnsonSteps = [];                 // ジョンソン法の説明

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  newJobs();
}
function newJobs() {
  jobs = [];
  for (let i = 0; i < nJobs; i++) jobs.push({ a: floor(random(1, 10)), b: floor(random(1, 10)), hue: (i * 360 / nJobs + 20) % 360 });   // ★ 処理時間
  seq = jobs.map((_, i) => i);
  johnsonSteps = [];
  enumerateAll();
}

// ★ メイクスパン：M1 は詰めて流す。M2 は「M1 が終わった」かつ「M2 が空いた」ときに始める
function schedule(order) {
  let t1 = 0, t2 = 0, bars = [];
  for (let k of order) {
    let s1 = t1; t1 += jobs[k].a;
    let s2 = max(t2, t1); t2 = s2 + jobs[k].b;
    bars.push({ k, s1, e1: t1, s2, e2: t2 });
  }
  return { span: t2, bars };
}
// ★ ジョンソン法
function johnson() {
  let front = [], back = [];
  johnsonSteps = [];
  let idx = jobs.map((_, i) => i).sort((p, q) => min(jobs[p].a, jobs[p].b) - min(jobs[q].a, jobs[q].b));
  for (let k of idx) {
    if (jobs[k].a <= jobs[k].b) { front.push(k); johnsonSteps.push('J' + (k + 1) + '：M1 ' + jobs[k].a + ' ≤ M2 ' + jobs[k].b + ' → 前へ'); }
    else { back.unshift(k); johnsonSteps.push('J' + (k + 1) + '：M2 ' + jobs[k].b + ' < M1 ' + jobs[k].a + ' → 後ろへ'); }
  }
  seq = front.concat(back);
}
// 全部の順番（n!）を試す ─ 8 個で 40320 通り
function enumerateAll() {
  allSpans = []; bestSpan = Infinity;
  let a = jobs.map((_, i) => i);
  let permute = (k) => {
    if (k === a.length) { let s = schedule(a).span; allSpans.push(s); bestSpan = min(bestSpan, s); return; }
    for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; permute(k + 1); [a[k], a[i]] = [a[i], a[k]]; }
  };
  permute(0);
  worstSpan = 0; meanSpan = 0;
  for (let x of allSpans) { worstSpan = Math.max(worstSpan, x); meanSpan += x / allSpans.length; }
  spanCount = new Array(worstSpan - bestSpan + 1).fill(0);
  for (let x of allSpans) spanCount[x - bestSpan]++;
}

function cardRect(k) { let w = min(110, (width - 80) / nJobs - 10); return { x: 40 + k * (w + 10), y: height - 150, w, h: 90 }; }

function draw() {
  background(225, 30, 12);
  let sch = schedule(seq);
  let span = sch.span;
  let worst = worstSpan;
  let gx = 120, gw = width - gx - 60, unit = gw / max(1, worst + 2);

  // ガントチャート
  let rowY = [150, 230];
  fill(0, 0, 85); textSize(16);
  text('M1 印刷', 30, rowY[0] + 30); text('M2 製本', 30, rowY[1] + 30);
  stroke(0, 0, 100, 12); strokeWeight(1);
  for (let t = 0; t <= worst + 2; t++) line(gx + t * unit, rowY[0] - 10, gx + t * unit, rowY[1] + 60);
  noStroke(); fill(0, 0, 50); textSize(11); textAlign(CENTER, TOP);
  for (let t = 0; t <= worst + 2; t += 5) text(t, gx + t * unit, rowY[1] + 64);
  for (let b of sch.bars) {
    let jb = jobs[b.k];
    fill(jb.hue, 60, 90); rect(gx + b.s1 * unit, rowY[0], (b.e1 - b.s1) * unit - 1, 50, 4);
    fill(jb.hue, 60, 90); rect(gx + b.s2 * unit, rowY[1], (b.e2 - b.s2) * unit - 1, 50, 4);
    fill(0, 0, 10); textSize(13);
    text('J' + (b.k + 1), gx + (b.s1 + b.e1) / 2 * unit, rowY[0] + 18);
    text('J' + (b.k + 1), gx + (b.s2 + b.e2) / 2 * unit, rowY[1] + 18);
  }
  // M2 の待ち時間（アイドル）
  let prevEnd = 0, idle = 0;
  for (let b of sch.bars) {
    if (b.s2 > prevEnd + 1e-9) { fill(0, 70, 80, 35); rect(gx + prevEnd * unit, rowY[1], (b.s2 - prevEnd) * unit, 50); idle += b.s2 - prevEnd; }
    prevEnd = b.e2;
  }
  stroke(50, 90, 100); strokeWeight(3); line(gx + span * unit, rowY[0] - 20, gx + span * unit, rowY[1] + 60);
  stroke(140, 80, 100); strokeWeight(2); drawingContext.setLineDash([6, 5]);
  line(gx + bestSpan * unit, rowY[0] - 20, gx + bestSpan * unit, rowY[1] + 60); drawingContext.setLineDash([]);
  noStroke(); textAlign(LEFT, BASELINE);
  fill(50, 90, 100); textSize(16); textAlign(RIGHT); text('メイクスパン ' + span, gx + span * unit - 6, rowY[0] - 14); textAlign(LEFT);
  fill(140, 70, 100); textSize(13); text('最適 ' + bestSpan, gx + bestSpan * unit + 6, rowY[1] + 86);

  // ヒストグラム：全部の順番のメイクスパン
  let hx = 40, hy = 360, hw = width * 0.5, hh = height - hy - 200;
  let lo = bestSpan, hi = worst, nb = hi - lo + 1, cnt = spanCount;
  let cmax = max(cnt);
  fill(0, 0, 80); textSize(14); text('全 ' + allSpans.length + ' 通りの順番のメイクスパン（左ほど良い）', hx, hy - 10);
  for (let i = 0; i < nb; i++) {
    let bw = hw / nb, h = cnt[i] / cmax * hh;
    fill(lo + i === span ? color(50, 90, 100) : lo + i === bestSpan ? color(140, 60, 80) : color(220, 30, 50));
    rect(hx + i * bw, hy + hh - h, bw - 2, h);
    if (nb < 30 || i % 2 === 0) { fill(0, 0, 60); textSize(10); textAlign(CENTER, TOP); text(lo + i, hx + (i + 0.5) * bw, hy + hh + 4); textAlign(LEFT, BASELINE); }
  }
  let nBest = cnt[0];
  fill(0, 0, 70); textSize(13);
  text('最適の順番は ' + nBest + ' 通り（' + nf(100 * nBest / allSpans.length, 1, 1) + '%）。ランダムに並べると平均 ' + nf(meanSpan, 1, 1), hx, hy + hh + 34);

  // 右：ジョンソン法の説明
  let jx = hx + hw + 50;
  fill(0, 0, 90); textSize(16); text('ジョンソン法', jx, hy);
  fill(0, 0, 65); textSize(13);
  text('① M1・M2 の時間の中で一番短いものを探す', jx, hy + 24);
  text('② それが M1 なら前から、M2 なら後ろから並べる', jx, hy + 44);
  text('③ その仕事を消して ① に戻る', jx, hy + 64);
  fill(0, 0, 85);
  johnsonSteps.forEach((s, i) => text((i + 1) + '. ' + s, jx, hy + 96 + i * 20));
  fill(0, 0, 60);
  text('M2 の赤い所 = 製本機の待ち時間 ' + idle, jx, hy + hh + 34);

  // 札（ドラッグで並べかえ）
  for (let k = 0; k < seq.length; k++) {
    if (k === dragK) continue;
    drawCard(seq[k], cardRect(k).x, cardRect(k).y);
  }
  if (dragK >= 0) drawCard(seq[dragK], mouseX - dragX, cardRect(dragK).y - 10);

  fill(0, 0, 100); textSize(18);
  text('ドラッグ：札を並べかえ　J：ジョンソン法　X：ばらばら　↑↓：仕事の数 ' + nJobs + '　R：新しい仕事', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('メイクスパン ' + span + '　最適 ' + bestSpan + (span === bestSpan ? '　✓ 最適！' : '　あと ' + (span - bestSpan)) + '　　黄色の線 = 全部終わる時刻、緑の点線 = これ以上早くできない時刻', 20, 68);
}

function drawCard(k, x, y) {
  let r = cardRect(0), jb = jobs[k];
  fill(jb.hue, 50, 85); rect(x, y, r.w, r.h, 8);
  fill(0, 0, 10); textSize(18); textAlign(CENTER, TOP);
  text('J' + (k + 1), x + r.w / 2, y + 8);
  textSize(13); text('M1 ' + jb.a + '\nM2 ' + jb.b, x + r.w / 2, y + 38);
  textAlign(LEFT, BASELINE);
}

function mousePressed() {
  for (let k = 0; k < seq.length; k++) {
    let r = cardRect(k);
    if (mouseX > r.x && mouseX < r.x + r.w && mouseY > r.y && mouseY < r.y + r.h) { dragK = k; dragX = mouseX - r.x; }
  }
}
function mouseReleased() {
  if (dragK < 0) return;
  let r = cardRect(0), slot = constrain(round((mouseX - dragX - r.x) / (r.w + 10)), 0, seq.length - 1);
  let item = seq.splice(dragK, 1)[0];
  seq.splice(slot, 0, item);
  dragK = -1; johnsonSteps = [];
}

function keyPressed() {
  if (key === 'j' || key === 'J') johnson();
  if (key === 'x' || key === 'X') { seq = shuffle(seq); johnsonSteps = []; }
  if (key === 'r' || key === 'R') newJobs();
  if (key === UP_ARROW && nJobs < 8) { nJobs++; newJobs(); }
  if (key === DOWN_ARROW && nJobs > 4) { nJobs--; newJobs(); }
}

// ---------- やってみよう ----------
// 1. J を押す前に、自分で並べかえて最適（緑の点線）に届くか挑戦しよう
// 2. ヒストグラムを見ると「最適の順番」は何 % ある？ 仕事が 8 個になると全部試すのは大変（40320 通り）
// 3. 機械を 3 台にすると、ジョンソン法はもう最適を保証しない。schedule に M3 を足して試そう
// 4. 最初の仕事の M1 と最後の仕事の M2 の間は必ず待つ。だから「M1 が短い仕事を先に」がよい理由を説明しよう
