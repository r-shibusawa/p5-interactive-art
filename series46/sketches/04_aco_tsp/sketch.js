// ============================================
// 04 アリコロニー最適化で巡回セールスマン問題（ACO / TSP）
// 全部の都市を 1 回ずつ回って戻る一番短い道は？ アリは「近い都市」と「フェロモンの濃い道」を確率で選んで 1 周する
// 短い巡回路ほどフェロモンを多く置き、全体は少しずつ蒸発する。線の太さ = フェロモンの量、赤い線 = これまでの最良の巡回路
// クリック = 都市を追加 / 1 = 円の上の都市（最適解がわかる）/ 2 = ランダムな都市 / C = 全部消す
// ↑↓ = β（距離の重視）/ ←→ = 蒸発率 ρ / A = α（フェロモンの重視）/ O = 最良路を 2-opt で磨く / R = フェロモンをリセット / スペース = 一時停止
// ============================================

let alphaP = 1.0;            // α：フェロモンをどれだけ信じるか
let betaP = 3.0;             // β：距離の近さをどれだけ重視するか
let rho = 0.1;               // ρ：1 回ごとの蒸発率
let elite = 3;               // ★ 最良の巡回路に追加で置くフェロモンの倍率（エリート戦略）
let itersPerFrame = 1;       // ★ 1 フレームに何回まわすか
let cities = [];
let nC = 0, dmat, tau, wMat;
let bestTour = [], bestLen = Infinity, iterCount = 0;
let hist = [], histIter = [];
let twoOptLen = 0, knownOpt = 0, layoutName = '';
let paused = false, polished = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  makeCircle(24);
}

function areaBox() { return { x: 30, y: 90, w: width * 0.62 - 30, h: height - 120 }; }
function makeCircle(n) {
  let b = areaBox(), R = Math.min(b.w, b.h) * 0.42;
  cities = [];
  for (let i = 0; i < n; i++) { let a = (i / n) * Math.PI * 2; cities.push({ x: b.x + b.w / 2 + R * Math.cos(a), y: b.y + b.h / 2 + R * Math.sin(a) }); }
  shuffleArr(cities);                                   // 番号の順に回れば正解、とならないように並びを混ぜる
  layoutName = '円の上の ' + n + ' 都市';
  knownOpt = 2 * n * R * Math.sin(Math.PI / n);           // 円に内接する正 n 角形の周 = 最適解
  rebuild();
}
function makeRandom(n) {
  let b = areaBox();
  cities = [];
  for (let i = 0; i < n; i++) cities.push({ x: b.x + 20 + Math.random() * (b.w - 40), y: b.y + 20 + Math.random() * (b.h - 40) });
  layoutName = 'ランダムな ' + n + ' 都市'; knownOpt = 0;
  rebuild();
}

// 都市が変わったら距離の表を作り直して最初から
function rebuild() {
  nC = cities.length;
  dmat = new Float64Array(nC * nC); tau = new Float64Array(nC * nC); wMat = new Float64Array(nC * nC);
  for (let i = 0; i < nC; i++) for (let j = 0; j < nC; j++) dmat[i * nC + j] = Math.max(1e-3, Math.hypot(cities[i].x - cities[j].x, cities[i].y - cities[j].y));
  bestTour = []; bestLen = Infinity; iterCount = 0; hist = []; histIter = []; polished = false;
  if (nC < 3) { twoOptLen = 0; return; }
  // 比べる相手：2-opt だけで作った巡回路（ランダムな順番から 5 回やって一番よいもの）
  twoOptLen = Infinity;
  for (let k = 0; k < 5; k++) {
    let t = [...Array(nC).keys()]; shuffleArr(t);
    twoOpt(t); twoOptLen = Math.min(twoOptLen, tourLen(t));
  }
  let tau0 = 1 / (nC * twoOptLen);
  tau.fill(tau0 * 10);
}

// ★ ACO の 1 回分：アリ nC 匹がそれぞれ 1 周 → 蒸発 → フェロモンを置く
function acoIteration() {
  for (let k = 0; k < nC * nC; k++) wMat[k] = Math.pow(tau[k], alphaP) * Math.pow(1 / dmat[k], betaP);
  let tours = [];
  for (let a = 0; a < nC; a++) {
    let visited = new Uint8Array(nC), cur = a, t = [cur]; visited[cur] = 1;
    for (let s = 1; s < nC; s++) {
      let total = 0;
      for (let j = 0; j < nC; j++) if (!visited[j]) total += wMat[cur * nC + j];
      let r = Math.random() * total, nxt = -1;
      for (let j = 0; j < nC; j++) if (!visited[j]) { nxt = j; r -= wMat[cur * nC + j]; if (r <= 0) break; }
      visited[nxt] = 1; t.push(nxt); cur = nxt;
    }
    tours.push({ t, len: tourLen(t) });
  }
  for (let k = 0; k < nC * nC; k++) tau[k] *= 1 - rho;                      // 蒸発
  let itBest = Infinity;
  for (let o of tours) {
    deposit(o.t, 1 / o.len);                                              // 短いほど多く置く
    if (o.len < itBest) itBest = o.len;
    if (o.len < bestLen) { bestLen = o.len; bestTour = o.t.slice(); }
  }
  deposit(bestTour, elite / bestLen);
  for (let k = 0; k < nC * nC; k++) tau[k] = Math.min(Math.max(tau[k], 1e-12), 1e6);   // 念のため範囲に収める
  iterCount++;
  hist.push(bestLen); histIter.push(itBest);
  if (hist.length > 2000) { hist = hist.filter((v, i) => i % 2 === 0); histIter = histIter.filter((v, i) => i % 2 === 0); }   // 長くなったら間引く
}
function deposit(t, amount) {
  for (let s = 0; s < t.length; s++) { let a = t[s], b = t[(s + 1) % t.length]; tau[a * nC + b] += amount; tau[b * nC + a] += amount; }
}

function draw() {
  background(268, 40, 13);
  if (!paused && nC >= 3) for (let k = 0; k < itersPerFrame; k++) acoIteration();
  let b = areaBox();
  noStroke(); fill(0, 0, 0, 25); rect(b.x, b.y, b.w, b.h, 8);
  // ---- フェロモン：濃さを 6 段階に分けて、段階ごとにまとめて描く
  if (nC >= 3) {
    let tmax = 1e-12;
    for (let k = 0; k < nC * nC; k++) tmax = Math.max(tmax, tau[k]);
    for (let lv = 1; lv <= 6; lv++) {
      let segs = [];
      for (let i = 0; i < nC; i++) for (let j = i + 1; j < nC; j++) {
        let q = tau[i * nC + j] / tmax;
        if (Math.ceil(q * 6) === lv && q > 0.04) segs.push(i, j);
      }
      if (segs.length === 0) continue;
      stroke(45, 70, 100, 12 + lv * 12); strokeWeight(lv * 1.3);
      beginShape(LINES);
      for (let s = 0; s < segs.length; s++) vertex(cities[segs[s]].x, cities[segs[s]].y);
      endShape();
    }
  }
  if (bestTour.length >= 3) {
    noFill(); stroke(0, 85, 100); strokeWeight(2.5);
    beginShape(); for (let i of bestTour) vertex(cities[i].x, cities[i].y); endShape(CLOSE);
  }
  noStroke(); fill(0, 0, 100);
  for (let c of cities) circle(c.x, c.y, 9);

  // ---- 右：数字と収束グラフ
  let gx = width * 0.65, gw = width - gx - 30;
  fill(0, 0, 100); textSize(16);
  let lines = ['配置：' + layoutName, '反復 ' + iterCount + ' 回（アリ ' + nC + ' 匹 × 回）',
    '最良の巡回路の長さ：' + (bestLen < Infinity ? nf(bestLen, 1, 1) : '—') + (polished ? '（2-opt 済み）' : ''),
    '2-opt だけ（5 回の最良）：' + (twoOptLen ? nf(twoOptLen, 1, 1) : '—'),
    knownOpt ? '最適解（正 n 角形の周）：' + nf(knownOpt, 1, 1) + '　→ 差 ' + nf(Math.max(0, ((bestLen - knownOpt) / knownOpt) * 100), 1, 2) + ' %' : '最適解：わからない（だから比べる相手が必要）'];
  for (let i = 0; i < lines.length; i++) text(lines[i], gx, 110 + i * 26);
  let py = 280, ph = Math.min(220, height - py - 80);
  noStroke(); fill(0, 0, 0, 35); rect(gx, py, gw, ph);
  fill(0, 0, 85); textSize(13); text('長さの推移（赤 = これまでの最良、薄 = その回、緑 = 最適解か 2-opt）', gx, py - 8);
  if (hist.length > 1) {
    let ref = knownOpt || twoOptLen, lo = ref * 0.97, hi = Math.max(...histIter.slice(0, 20), ref * 1.3);
    let Y = (v) => py + ph - constrain((v - lo) / (hi - lo), 0, 1) * ph;
    stroke(120, 60, 90); strokeWeight(1.5); line(gx, Y(ref), gx + gw, Y(ref));
    noFill(); stroke(0, 0, 100, 30); strokeWeight(1);
    beginShape(); for (let i = 0; i < histIter.length; i++) vertex(gx + (i / (histIter.length - 1)) * gw, Y(histIter[i])); endShape();
    stroke(0, 85, 100); strokeWeight(2);
    beginShape(); for (let i = 0; i < hist.length; i++) vertex(gx + (i / (hist.length - 1)) * gw, Y(hist[i])); endShape();
  }
  noStroke(); fill(0, 0, 70); textSize(14);
  text('選ぶ確率 ∝ τ^α × (1/距離)^β\nτ ← (1 − ρ) τ ＋ Σ 1/L（短い巡回路ほど多く置く）', gx, py + ph + 30);

  fill(0, 0, 100); textSize(18);
  text('α = ' + nf(alphaP, 1, 1) + '（A）　β = ' + nf(betaP, 1, 1) + '（↑↓）　蒸発率 ρ = ' + nf(rho, 1, 2) + '（←→）　O：2-opt で磨く　R：フェロモンをリセット　スペース：' + (paused ? '停止中' : '実行中'), 20, 36);
  fill(0, 0, 70); textSize(14);
  text('クリック：都市を追加（最大 80）　1：円の上の都市　2：ランダム　C：全部消す', 20, 60);
}

function mousePressed() {
  let b = areaBox();
  if (mouseX > b.x && mouseX < b.x + b.w && mouseY > b.y && mouseY < b.y + b.h && cities.length < 80) {
    cities.push({ x: mouseX, y: mouseY }); layoutName = cities.length + ' 都市（自分で置いた）'; knownOpt = 0; rebuild();
  }
}
function keyPressed() {
  if (key === '1') makeCircle(24);
  if (key === '2') makeRandom(40);
  if (key === 'c' || key === 'C') { cities = []; layoutName = '空（クリックで都市を置く）'; knownOpt = 0; rebuild(); }
  if (key === UP_ARROW) betaP = Math.min(betaP + 0.5, 8);
  if (key === DOWN_ARROW) betaP = Math.max(betaP - 0.5, 0);
  if (key === RIGHT_ARROW) rho = Math.min(rho + 0.02, 0.9);
  if (key === LEFT_ARROW) rho = Math.max(rho - 0.02, 0.01);
  if (key === 'a' || key === 'A') alphaP = alphaP >= 2 ? 0 : alphaP + 0.5;
  if (key === 'o' || key === 'O') { if (bestTour.length >= 4) { twoOpt(bestTour); bestLen = tourLen(bestTour); polished = true; } }
  if (key === 'r' || key === 'R') rebuild();
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. 1（円の上の 24 都市）で、最適解との差が 0 % になるまで何回かかる？ 何回やっても同じ？
// 2. β = 0 にすると距離を見ないで選ぶ。β = 8 だと「近い所へ行くだけ」の貪欲法に近づく。どちらも苦手な理由は？
// 3. ρ を 0.5 にすると忘れっぽいアリ。速く収束するけど、悪い答えで固まる（早すぎる収束）ことが増える
// 4. 2（ランダム 40 都市）で ACO の最良と「2-opt だけ」を比べよう。O で ACO の答えを 2-opt で磨くと、さらに短くなる？
// 5. 自分で都市を置いて、人間の目で考えた最短の回り方と ACO の答えを比べてみよう

// ==================================================
// ここから下は「巡回路の道具」です（長さ・2-opt・シャッフル）
// ==================================================
function tourLen(t) { let s = 0; for (let i = 0; i < t.length; i++) s += dmat[t[i] * nC + t[(i + 1) % t.length]]; return s; }
// 2-opt：2 本の辺を入れかえて短くなる限り続ける（交差がほどける）
function twoOpt(t) {
  let n = t.length, improved = true, guard = 0;
  while (improved && guard++ < 200) {
    improved = false;
    for (let i = 0; i < n - 1; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      let a = t[i], b = t[i + 1], c = t[j], d = t[(j + 1) % n];
      let delta = dmat[a * nC + c] + dmat[b * nC + d] - dmat[a * nC + b] - dmat[c * nC + d];
      if (delta < -1e-9) { reverseSeg(t, i + 1, j); improved = true; }
    }
  }
}
function reverseSeg(t, i, j) { while (i < j) { let tmp = t[i]; t[i] = t[j]; t[j] = tmp; i++; j--; } }
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); let tmp = a[i]; a[i] = a[j]; a[j] = tmp; } return a; }
