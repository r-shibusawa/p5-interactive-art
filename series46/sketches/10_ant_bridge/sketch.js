// ============================================
// 10 道の分岐と最短路 ─ 二重橋の実験（Deneubourg・Goss）
// 巣とエサの間に長さの違う 2 本の橋。アリは分かれ道で、フェロモンが濃い方を確率で選ぶ：p = (k + τ)^h / ((k + τ1)^h + (k + τ2)^h)
// 短い橋を往復したアリは早く戻るので、短い方が先に濃くなる → さらに選ばれる。最後はほとんどが短い橋を使う
// ←→ = 長さの比 r（長い橋 / 短い橋）/ ↑↓ = アリの流れ / B = 20 回の実験をまとめて行う / R = やり直し / スペース = 一時停止
// ============================================

let ratio = 2.0;             // 長さの比 r（1 = 同じ長さ）
let flux = 0.2;              // 巣から出るアリの数（1 ステップあたり）
let kC = 20, hC = 2;         // ★ 選ぶ式の定数 k と h（Deneubourg の実験に合う値）
let rhoE = 0.002;            // ★ 1 ステップの蒸発率
let stepsPerFrame = 2;
let simA, theoC = [0, 0], hist = [], paused = false;
let pathPts = [[], []], pathLen = [0, 0];
let batch = null, batchResults = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  buildPaths(); resetAll();
}

function newSim() { return { ants: [], tau: [0, 0], acc: 0, recent: [], t: 0 }; }
function resetAll() { simA = newSim(); theoC = [0, 0]; hist = []; }
// ★ 分かれ道で短い橋（0）を選ぶ確率
function chooseShort(tau) { let a = Math.pow(kC + tau[0], hC), b = Math.pow(kC + tau[1], hC); return a / (a + b); }
function lenU(b) { return b === 0 ? 100 : 100 * ratio; }   // 橋の長さ（単位）。短い橋 = 100

// ★ アリの 1 ステップ：生まれる → 歩く → 端に着いたらフェロモンを置き、エサ側なら帰りの橋を選ぶ
function simStep(sm) {
  sm.acc += flux;
  while (sm.acc >= 1) {
    sm.acc -= 1;
    let b = Math.random() < chooseShort(sm.tau) ? 0 : 1;
    sm.ants.push({ b, s: 0, dir: 1 }); record(sm, b);
  }
  for (let a of sm.ants) a.s += a.dir;
  let keep = [];
  for (let a of sm.ants) {
    let L = lenU(a.b);
    if (a.dir > 0 && a.s >= L) {                            // エサに着いた
      sm.tau[a.b] += 100 / L;                               // 通った橋に置く（長い橋は薄く広がる）
      a.b = Math.random() < chooseShort(sm.tau) ? 0 : 1; a.s = lenU(a.b); a.dir = -1; record(sm, a.b);
      keep.push(a);
    } else if (a.dir < 0 && a.s <= 0) {
      sm.tau[a.b] += 100 / L;                               // 巣に戻った（いなくなる）
    } else keep.push(a);
  }
  sm.ants = keep;
  sm.tau[0] *= 1 - rhoE; sm.tau[1] *= 1 - rhoE;
  sm.t++;
}
function record(sm, b) { sm.recent.push(b === 0 ? 1 : 0); if (sm.recent.length > 100) sm.recent.shift(); }
function shortShare(sm) { return sm.recent.length ? sm.recent.reduce((x, y) => x + y, 0) / sm.recent.length : 0.5; }

// ★ 理論（平均場の式）：dτi/dt = 2 Φ pi (100 / Li) − ρ τi（往復で 2 回通る、遅れは無視）
function theoryStep() {
  let p = chooseShort(theoC);
  theoC[0] += 2 * flux * p * (100 / lenU(0)) - rhoE * theoC[0];
  theoC[1] += 2 * flux * (1 - p) * (100 / lenU(1)) - rhoE * theoC[1];
}

function draw() {
  background(275, 35, 12);
  if (!paused) for (let s = 0; s < stepsPerFrame; s++) {
    simStep(simA); theoryStep();
    if (simA.t % 4 === 0) { hist.push([shortShare(simA), chooseShort(theoC)]); if (hist.length > 450) hist.shift(); }
  }
  // まとめ実験：1 フレームに 1 回分（3000 ステップ）
  if (batch && batch.done < 20) {
    let sm = newSim();
    for (let t = 0; t < 3000; t++) simStep(sm);
    if (shortShare(sm) > 0.5) batch.shortWins++;
    batch.done++;
    if (batch.done === 20) batchResults.push({ r: ratio, wins: batch.shortWins });
  }

  // ---- 橋を描く（太さ = フェロモンの量）
  let tmax = Math.max(simA.tau[0], simA.tau[1], 1);
  noFill();
  for (let b = 0; b < 2; b++) {
    stroke(b === 0 ? 45 : 300, 70, 100, 30 + 60 * (simA.tau[b] / tmax)); strokeWeight(3 + 16 * (simA.tau[b] / tmax));
    beginShape(); for (let p of pathPts[b]) vertex(p[0], p[1]); endShape();
  }
  noStroke(); fill(0, 0, 100);
  for (let a of simA.ants) { let p = pointAt(a.b, a.s / lenU(a.b)); circle(p[0], p[1], 5); }
  let n0 = pathPts[0][0], n1 = pathPts[0][pathPts[0].length - 1];
  fill(30, 60, 70); circle(n0[0], n0[1], 46); fill(110, 60, 80); circle(n1[0], n1[1], 46);
  fill(0, 0, 100); textSize(15); text('巣', n0[0] - 8, n0[1] + 5); text('エサ', n1[0] - 15, n1[1] + 5);
  fill(45, 70, 100); text('短い橋（長さ 1）', (n0[0] + n1[0]) / 2 - 50, pathPts[0][2][1] + 34);
  fill(300, 60, 100); text('長い橋（長さ ' + nf(ratio, 1, 2) + '）', (n0[0] + n1[0]) / 2 - 50, height * 0.2);

  // ---- 右：短い橋を選ぶ割合（実測と理論）
  let gx = width * 0.66, gw = width - gx - 30, gy = 120, gh = 170;
  noStroke(); fill(0, 0, 0, 35); rect(gx, gy, gw, gh);
  stroke(0, 0, 100, 20); strokeWeight(1); line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  if (hist.length > 1) {
    noFill(); stroke(45, 80, 100); strokeWeight(2);
    beginShape(); for (let i = 0; i < hist.length; i++) vertex(gx + (i / 449) * gw, gy + gh - hist[i][0] * gh); endShape();
    stroke(180, 60, 100); strokeWeight(2);
    beginShape(); for (let i = 0; i < hist.length; i++) vertex(gx + (i / 449) * gw, gy + gh - hist[i][1] * gh); endShape();
  }
  noStroke(); fill(0, 0, 85); textSize(13);
  text('短い橋を選ぶ割合（黄 = シミュレーション：直近 100 回、水色 = 理論）', gx, gy - 8);
  fill(0, 0, 60); text('1', gx - 12, gy + 8); text('½', gx - 14, gy + gh / 2 + 4); text('0', gx - 12, gy + gh);
  fill(0, 0, 100); textSize(15);
  text('いま：実測 ' + nf(shortShare(simA) * 100, 1, 0) + ' %、理論 ' + nf(chooseShort(theoC) * 100, 1, 0) + ' %', gx, gy + gh + 30);
  text('フェロモン τ：短い ' + nf(simA.tau[0], 1, 0) + '、長い ' + nf(simA.tau[1], 1, 0), gx, gy + gh + 56);
  text('橋の上のアリ ' + simA.ants.length + ' 匹、経過 ' + simA.t + ' ステップ', gx, gy + gh + 82);
  // まとめ実験の結果
  let by = gy + gh + 130;
  fill(0, 0, 85); textSize(14); text('B：20 回の実験で「短い橋が多数派になった回数」', gx, by);
  if (batch && batch.done < 20) { fill(50, 80, 100); text('実験中… ' + batch.done + ' / 20', gx, by + 24); }
  for (let i = 0; i < batchResults.length && i < 8; i++) {
    let rr = batchResults[batchResults.length - 1 - i];
    fill(0, 0, 80); text('r = ' + nf(rr.r, 1, 2) + '：短い橋 ' + rr.wins + ' / 20', gx, by + 48 + i * 22);
    fill(45, 80, 100); rect(gx + 170, by + 38 + i * 22, (rr.wins / 20) * (gw - 180), 12);
  }

  fill(0, 0, 100); textSize(18);
  text('←→：長さの比 r = ' + nf(ratio, 1, 2) + '　↑↓：アリの流れ ' + nf(flux, 1, 2) + '　B：20 回まとめて実験　R：やり直し　スペース：' + (paused ? '停止中' : '実行中'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text('選ぶ確率 p = (k + τ短)² / ((k + τ短)² + (k + τ長)²)。r = 1（同じ長さ）でも、どちらか片方に偏る（対称性の破れ）', 20, 60);
}

function keyPressed() {
  if (key === RIGHT_ARROW) { ratio = Math.min(ratio + 0.25, 3); buildPaths(); resetAll(); }
  if (key === LEFT_ARROW) { ratio = Math.max(ratio - 0.25, 1); buildPaths(); resetAll(); }
  if (key === UP_ARROW) flux = Math.min(flux + 0.05, 1);
  if (key === DOWN_ARROW) flux = Math.max(flux - 0.05, 0.05);
  if (key === 'b' || key === 'B') batch = { done: 0, shortWins: 0 };
  if (key === 'r' || key === 'R') resetAll();
  if (key === ' ') paused = !paused;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); buildPaths(); }

// ---------- やってみよう ----------
// 1. r = 2 で R を何回か押す。短い橋がほぼ毎回勝つ？ B で 20 回まとめて数えよう
// 2. ← で r = 1（同じ長さ）に。それでも片方に偏る。どちらに偏るかは毎回変わる（最初の偶然が増幅される）
// 3. 理論（水色）は「平均」の動き。シミュレーション（黄）は数が少ないのでゆらぐ。↑ でアリを増やすと理論に近づく？
// 4. rhoE を 0 にすると？ 一度偏ると戻れない。0.02 にすると忘れっぽく、偏りが弱くなる
// 5. hC を 1 にすると「濃い方に比例して選ぶ」だけ。偏りは強くなる？弱くなる？

// ==================================================
// ここから下は「橋の形の道具」です（折れ線・長さ・位置）
// ==================================================
function polyLen(p) { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }
function makeBranch(sign, wig) {
  let x0 = width * 0.08, x1 = width * 0.58, cy = height * 0.55, off = 110 * sign, pts = [[x0, cy]];
  pts.push([x0 + 50, cy + off * 0.6], [x0 + 90, cy + off]);
  for (let k = 0; k <= 160; k++) { let x = x0 + 90 + ((x1 - x0 - 180) * k) / 160; pts.push([x, cy + off + sign * wig * Math.sin((k / 160) * Math.PI * 10)]); }
  pts.push([x1 - 50, cy + off * 0.6], [x1, cy]);
  return pts;
}
function buildPaths() {
  pathPts[0] = makeBranch(1, 0);
  let target = polyLen(pathPts[0]) * ratio, lo = 0, hi = 300;
  for (let it = 0; it < 40; it++) { let mid = (lo + hi) / 2; if (polyLen(makeBranch(-1, mid)) < target) lo = mid; else hi = mid; }
  pathPts[1] = makeBranch(-1, lo);
  for (let b = 0; b < 2; b++) {                          // 区間ごとの長さを覚えておく
    let p = pathPts[b], acc = [0];
    for (let i = 1; i < p.length; i++) acc.push(acc[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    pathLen[b] = acc;
  }
}
// 橋 b の上で、割合 u（0 = 巣、1 = エサ）の位置
function pointAt(b, u) {
  let p = pathPts[b], acc = pathLen[b], d = constrain(u, 0, 1) * acc[acc.length - 1], i = 1;
  while (i < acc.length - 1 && acc[i] < d) i++;
  let t = (d - acc[i - 1]) / Math.max(acc[i] - acc[i - 1], 1e-6);
  return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t];
}
