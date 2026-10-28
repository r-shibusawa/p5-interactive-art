// ============================================
// 05 出生死滅過程と定常分布
// 系内人数を「状態 0, 1, 2, …, K」として、到着で右へ（率 λ）、サービス終了で左へ（率 μ）1 つずつ動く
//   600 人の「分身」を同時に動かすと、どこから始めても人数の分布が定常分布 π_n ∝ (λ/μ)^n に落ち着く
//   落ち着いた状態では、となりどうしの流れがつり合う：π_n λ = π_(n+1) μ（つり合いの式）
// ←→ = λ / ↑↓ = μ / R = 全員を状態 0 から / T = 全員を状態 K から / スペース = 一時停止
// ============================================

let K = 8;                 // ★ 定員（状態は 0〜K）。M/M/1/K 待ち行列
let lambda = 0.8, mu = 1;  // ★ 到着率とサービス率
let nWalk = 600;           // ★ 分身の数
let speed = 1.5;           // ★ 1 秒で進む時間
let paused = false;
let walkers = [], occ = [], sparks = [], fluxR = [], fluxL = [], simT = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  startAt(0);
}
function startAt(s) {
  walkers = new Array(nWalk).fill(s);
  occ = new Array(K + 1).fill(0); fluxR = new Array(K).fill(0); fluxL = new Array(K).fill(0);
  simT = 0; sparks = [];
}
function nodeX(n) { return map(n, 0, K, 110, width - 110); }

// ★ 小さな時間 dt の間に、確率 λdt で右へ、μdt で左へ
function stepAll(dt) {
  let cR = new Array(K).fill(0), cL = new Array(K).fill(0);
  for (let i = 0; i < nWalk; i++) {
    let n = walkers[i], u = Math.random();
    if (n < K && u < lambda * dt) { walkers[i] = n + 1; cR[n]++; }
    else if (n > 0 && u > 1 - mu * dt) { walkers[i] = n - 1; cL[n - 1]++; }
  }
  for (let j = 0; j < K; j++) {   // 流れ（1 人・単位時間あたり）をなめらかに記録
    fluxR[j] += (cR[j] / nWalk / dt - fluxR[j]) * 0.02;
    fluxL[j] += (cL[j] / nWalk / dt - fluxL[j]) * 0.02;
    if (cR[j] && sparks.length < 300 && Math.random() < 0.3) sparks.push({ from: j, dir: 1, f: 0 });
    if (cL[j] && sparks.length < 300 && Math.random() < 0.3) sparks.push({ from: j + 1, dir: -1, f: 0 });
  }
  occ[walkers[0]] += dt;    // 分身 1 号が各状態にいた時間
  simT += dt;
}
function stationary() {
  let r = lambda / mu, p = [], s = 0;
  for (let n = 0; n <= K; n++) { p.push(Math.pow(r, n)); s += p[n]; }
  return p.map((v) => v / s);
}

function draw() {
  background(150, 25, 11);
  if (!paused) { let sub = ceil(speed / 60 / 0.02); for (let k = 0; k < sub; k++) stepAll(speed / 60 / sub); }
  let pi = stationary(), cy = 190;

  // ---- 状態の図と矢印
  for (let n = 0; n < K; n++) {
    let a = nodeX(n) + 34, b = nodeX(n + 1) - 34;
    stroke(190, 70, 100, 70); strokeWeight(3); noFill();
    arc((a + b) / 2, cy - 6, b - a, 60, PI, TWO_PI);
    stroke(330, 70, 100, 70); arc((a + b) / 2, cy + 6, b - a, 60, 0, PI);
  }
  noStroke();
  for (let s of sparks) {     // 流れの粒
    s.f += 0.04;
    let a = nodeX(s.from), b = nodeX(s.from + s.dir), x = lerp(a, b, s.f);
    let y = s.dir > 0 ? cy - 6 - sin(s.f * PI) * 30 : cy + 6 + sin(s.f * PI) * 30;
    fill(s.dir > 0 ? color(190, 60, 100) : color(330, 60, 100)); circle(x, y, 6);
  }
  sparks = sparks.filter((s) => s.f < 1);
  let cnt = new Array(K + 1).fill(0);
  for (let w of walkers) cnt[w]++;
  for (let n = 0; n <= K; n++) {
    fill(0, 0, 100, 10 + 60 * cnt[n] / nWalk * 3); stroke(0, 0, 100, 60); strokeWeight(2);
    circle(nodeX(n), cy, 60);
    noStroke(); fill(0, 0, 100); textSize(22); textAlign(CENTER, CENTER); text(n, nodeX(n), cy);
    textAlign(LEFT, BASELINE);
  }
  noFill(); stroke(45, 90, 100); strokeWeight(4); circle(nodeX(walkers[0]), cy, 72);   // 分身 1 号
  noStroke(); fill(190, 70, 100); textSize(15); text('λ（到着）', nodeX(0) + 30, cy - 50);
  fill(330, 70, 100); text('μ（サービス終了）', nodeX(0) + 30, cy + 62);

  // ---- 棒グラフ：分身の分布（色）・定常分布（白枠）・1 号の滞在時間の割合（黄の点）
  let gy = height - 70, gh = height - 420;
  let bw = (nodeX(1) - nodeX(0)) * 0.6;
  stroke(0, 0, 100, 30); strokeWeight(1); line(60, gy, width - 60, gy);
  for (let n = 0; n <= K; n++) {
    let x = nodeX(n), h1 = cnt[n] / nWalk * gh * 1.6, h2 = pi[n] * gh * 1.6;
    noStroke(); fill(160, 60, 85, 80); rect(x - bw / 2, gy - min(h1, gh), bw, min(h1, gh));
    noFill(); stroke(0, 0, 100); strokeWeight(2); rect(x - bw / 2, gy - min(h2, gh), bw, min(h2, gh));
    let o = occ[n] / max(simT, 1e-9) * gh * 1.6;
    noStroke(); fill(45, 90, 100); circle(x, gy - min(o, gh), 10);
    fill(0, 0, 80); textSize(13); textAlign(CENTER); text(nf(pi[n], 1, 3), x, gy + 18);
    if (n < K) {
      fill(0, 0, 60); textSize(12);
      text('→' + nf(fluxR[n], 1, 3), (x + nodeX(n + 1)) / 2, gy - gh + 10);
      text('←' + nf(fluxL[n], 1, 3), (x + nodeX(n + 1)) / 2, gy - gh + 26);
    }
    textAlign(LEFT);
  }
  fill(0, 0, 60); textSize(13);
  text('緑の棒 = 600 人の分身がいまいる状態の割合　白枠 = 定常分布 π_n　黄の点 = 1 号が各状態にいた時間の割合　上の小さな数 = となりへの流れ（→ と ← がほぼ等しくなる）', 60, gy - gh - 14);

  let L = 0; for (let n = 0; n <= K; n++) L += n * pi[n];
  fill(0, 0, 100); textSize(18);
  text('λ = ' + nf(lambda, 1, 2) + '（←→）　μ = ' + nf(mu, 1, 2) + '（↑↓）　ρ = ' + nf(lambda / mu, 1, 2) + '　定員 K = ' + K + '　平均人数 ' + nf(L, 1, 2) + '　満員の確率 π_K = ' + nf(pi[K], 1, 3) + '　R / T：0 から / K から　スペース', 20, 40);
  fill(0, 0, 60); textSize(15);
  text('時間 ' + nf(simT, 1, 1) + '。定員があるので ρ > 1 でも分布は落ち着く（右に偏るだけ）。満員のとき来た客は入れない → π_K = 断られる確率', 20, 68);
}

function keyPressed() {
  if (key === RIGHT_ARROW) lambda = min(3, lambda + 0.1);
  if (key === LEFT_ARROW) lambda = max(0.1, lambda - 0.1);
  if (key === UP_ARROW) mu = min(3, mu + 0.1);
  if (key === DOWN_ARROW) mu = max(0.1, mu - 0.1);
  if (key === 'r' || key === 'R') startAt(0);
  if (key === 't' || key === 'T') startAt(K);
  if (key === ' ') paused = !paused;
}

// ---------- やってみよう ----------
// 1. R と T で始め方を変えても、最後は同じ分布になることを確かめる。何秒くらいで落ち着く？
// 2. λ = μ のとき定常分布はどんな形？ λ = 2μ のときは？（π_n ∝ ρ^n）
// 3. サービス終了の率を μ × min(n, 2) に変えると窓口 2 つ（M/M/2/K）になる。stepAll の mu を書き換える
// 4. 到着の率を λ × (K − n) にすると「人数が限られた客」（機械の修理など）。分布はどう変わる？
