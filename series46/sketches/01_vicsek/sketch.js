// ============================================
// 01 ヴィチェック模型 ─ ノイズに負けずに向きがそろうか
// 粒子はみんな同じ速さで進み、半径 1 の中の仲間の「平均の向き」にそろえる。ただし毎回ノイズ η が入る
// 秩序変数 φ = |平均の速度| / 速さ（0 = バラバラ、1 = 全員同じ向き）。η や密度を変えると φ が急に変わる（相転移）
// ←→ = ノイズ η / ↑↓ = 粒子の数（密度 ρ）/ S = η を自動で走査して φ(η) を描く / A = 全員同じ向きから / R = バラバラから
// ============================================

let L = 20;                 // ★ 箱の大きさ（相互作用の半径 = 1 が単位）
let nP = 400;               // 粒子の数（ρ = nP / L²）
let v0 = 0.03;              // ★ 1 ステップに進む距離
let eta = 2.0;              // ノイズの強さ η（0〜2π）
let stepsPerFrame = 3;      // ★ 1 フレームに何ステップ進めるか
let th, xs, ys;
let phiHist = [], scan = [];  // scan: φ(η) の点 {eta, phi, rho}
let sweeping = false, sweepEta = 0, sweepCount = 0, sweepSum = 0;
let heads, nexts;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  resetParticles(false);
}

function resetParticles(aligned) {
  th = new Float32Array(nP); xs = new Float32Array(nP); ys = new Float32Array(nP);
  for (let i = 0; i < nP; i++) { xs[i] = Math.random() * L; ys[i] = Math.random() * L; th[i] = aligned ? 0.3 : Math.random() * Math.PI * 2 - Math.PI; }
  heads = new Int32Array(L * L); nexts = new Int32Array(nP);
  phiHist = [];
}

// ★ ヴィチェックの 1 ステップ：近くの仲間の平均の向き ＋ ノイズ、そして前に進む
function vicsekStep() {
  heads.fill(-1);
  for (let i = 0; i < nP; i++) { let c = (Math.floor(xs[i]) % L) + (Math.floor(ys[i]) % L) * L; nexts[i] = heads[c]; heads[c] = i; }
  let nt = new Float32Array(nP);
  for (let i = 0; i < nP; i++) {
    let sx = 0, sy = 0, cx = Math.floor(xs[i]), cy = Math.floor(ys[i]);
    for (let gy = -1; gy <= 1; gy++) for (let gx = -1; gx <= 1; gx++) {
      let c = ((cx + gx + L) % L) + ((cy + gy + L) % L) * L;
      for (let j = heads[c]; j >= 0; j = nexts[j]) {
        let dx = xs[j] - xs[i], dy = ys[j] - ys[i];
        dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L);
        if (dx * dx + dy * dy <= 1) { sx += Math.cos(th[j]); sy += Math.sin(th[j]); }   // 自分も含む
      }
    }
    nt[i] = Math.atan2(sy, sx) + eta * (Math.random() - 0.5);
  }
  for (let i = 0; i < nP; i++) {
    th[i] = nt[i];
    xs[i] = (xs[i] + v0 * Math.cos(th[i]) + L) % L; ys[i] = (ys[i] + v0 * Math.sin(th[i]) + L) % L;
    if (!(xs[i] >= 0 && xs[i] < L)) xs[i] = Math.random() * L;          // 念のため（NaN や端ちょうど）
    if (!(ys[i] >= 0 && ys[i] < L)) ys[i] = Math.random() * L;
  }
}
function orderParam() {
  let sx = 0, sy = 0;
  for (let i = 0; i < nP; i++) { sx += Math.cos(th[i]); sy += Math.sin(th[i]); }
  return Math.hypot(sx, sy) / nP;
}

function draw() {
  background(258, 45, 12);
  if (keyIsDown(RIGHT_ARROW)) eta = Math.min(eta + 0.02, 6.28);
  if (keyIsDown(LEFT_ARROW)) eta = Math.max(eta - 0.02, 0);
  for (let s = 0; s < stepsPerFrame; s++) vicsekStep();
  let phi = orderParam();
  phiHist.push(phi); if (phiHist.length > 300) phiHist.shift();
  // ---- 自動走査：η を少しずつ上げ、落ち着かせてから φ の平均をとる
  if (sweeping) {
    sweepCount++;
    if (sweepCount > 120) sweepSum += phi;
    if (sweepCount >= 240) {
      scan.push({ eta: sweepEta, phi: sweepSum / 120, rho: nP / (L * L) });
      sweepEta += 0.25; sweepCount = 0; sweepSum = 0;
      if (sweepEta > 5.01) sweeping = false; else eta = sweepEta;
    }
  }

  // ---- 箱の中の粒子（向きで色をつける）
  let bs = Math.min(height - 120, width * 0.55), bx = 20, by = 90, k = bs / L;
  noStroke(); fill(0, 0, 0, 30); rect(bx, by, bs, bs);
  strokeWeight(2);
  let buckets = [];                                      // 向きを 12 色に分けて、色ごとにまとめて描く（速い）
  for (let b = 0; b < 12; b++) buckets.push([]);
  for (let i = 0; i < nP; i++) {
    let hueA = ((th[i] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    buckets[Math.floor((hueA / (Math.PI * 2)) * 12) % 12].push(i);
  }
  for (let b = 0; b < 12; b++) {
    if (buckets[b].length === 0) continue;               // 空の図形は描かない
    stroke(b * 30, 70, 100);
    beginShape(LINES);
    for (let i of buckets[b]) {
      let x = bx + xs[i] * k, y = by + ys[i] * k;
      vertex(x, y); vertex(x - Math.cos(th[i]) * 7, y - Math.sin(th[i]) * 7);
    }
    endShape();
  }
  noFill(); stroke(0, 0, 100, 40); strokeWeight(1); circle(bx + bs - 40, by + 40, 2 * k);
  noStroke(); fill(0, 0, 80); textSize(12); text('半径 1', bx + bs - 58, by + 44 + k);

  // ---- 右：φ の時間変化と φ(η)
  let gx = bx + bs + 50, gw = width - gx - 40;
  drawPlot(phiHist, gx, 120, gw, 110, 0, 1, color(45, 80, 100), 'φ の時間変化（いま ' + nf(phi, 1, 3) + '）');
  let sy0 = 300, sh = Math.max(120, height - sy0 - 60);
  noStroke(); fill(0, 0, 0, 35); rect(gx, sy0, gw, sh);
  stroke(0, 0, 50); strokeWeight(1);
  for (let e = 0; e <= 5; e++) line(gx + (e / 5) * gw, sy0 + sh, gx + (e / 5) * gw, sy0 + sh + 5);
  noStroke(); fill(0, 0, 75); textSize(12);
  for (let e = 0; e <= 5; e++) text(e, gx + (e / 5) * gw - 3, sy0 + sh + 18);
  text('ノイズ η →', gx + gw - 70, sy0 + sh + 34);
  fill(0, 0, 90); textSize(14); text('φ(η)：S で走査（' + (sweeping ? '走査中 η = ' + nf(sweepEta, 1, 2) : '色 = 密度 ρ') + '）', gx, sy0 - 8);
  for (let p of scan) {
    fill((p.rho * 80) % 360, 70, 100); circle(gx + (p.eta / 5) * gw, sy0 + sh - p.phi * sh, 9);
  }
  fill(0, 80, 100); circle(gx + (Math.min(eta, 5) / 5) * gw, sy0 + sh - phi * sh, 13);

  fill(0, 0, 100); textSize(18);
  text('←→：ノイズ η = ' + nf(eta, 1, 2) + '　↑↓：粒子 ' + nP + ' 個（密度 ρ = ' + nf(nP / (L * L), 1, 2) + '）　S：η を走査　A：そろった状態から　R：バラバラから', 20, 36);
  fill(0, 0, 70); textSize(14);
  text('θ(t+1) = 半径 1 の中の平均の向き ＋ η × 一様乱数(−½〜½)。η が小さい・密度が高いほど φ → 1（集団で同じ向きに動く）', 20, 60);
}

function keyPressed() {
  if (key === UP_ARROW) { nP = Math.min(nP + 100, 1600); resetParticles(false); }
  if (key === DOWN_ARROW) { nP = Math.max(nP - 100, 100); resetParticles(false); }
  if (key === 's' || key === 'S') { sweeping = !sweeping; sweepEta = 0; eta = 0; sweepCount = 0; sweepSum = 0; resetParticles(true); }
  if (key === 'a' || key === 'A') resetParticles(true);
  if (key === 'r' || key === 'R') { resetParticles(false); scan = []; }
}

// ---------- やってみよう ----------
// 1. η = 0.3 と η = 4.5 で φ を比べよう。どこかの η で φ が急に下がる。そこが「相転移点」
// 2. S で走査したあと ↑ で粒子を増やし（密度を上げ）、もう一度 S。曲線は右にずれる？左にずれる？
// 3. η が小さいとき、R（バラバラ）から始めても、色（向き）の帯がだんだん 1 色になる様子を見よう
// 4. v0 を 0.3 にすると？ 速いと仲間がよく入れ替わり、情報が遠くまで伝わる
// 5. 00 のボイドとの違いは？ ヴィチェックは「整列」だけ。それでも集団の動きが生まれる

// ==================================================
// ここから下は「グラフの道具」です
// ==================================================
function drawPlot(arr, x, y, w, h, lo, hi, c, title) {
  noStroke(); fill(0, 0, 0, 35); rect(x, y, w, h);
  fill(0, 0, 85); textSize(14); text(title, x, y - 8);
  if (arr.length < 2) return;
  noFill(); stroke(c); strokeWeight(2);
  beginShape();
  for (let i = 0; i < arr.length; i++) vertex(x + (i / 299) * w, y + h - constrain((arr[i] - lo) / (hi - lo), 0, 1) * h);
  endShape();
}
