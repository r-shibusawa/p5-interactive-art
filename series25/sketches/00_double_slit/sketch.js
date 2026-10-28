// ============================================
// 00 波と粒子：二重スリット
// 電子は 1 個ずつ「点」としてスクリーンに当たる。でも当たる場所の確率は |ψ|²（2 つのスリットを通った波の干渉）
//   点がたまると縞模様（干渉縞）が浮かび上がる。どちらのスリットを通ったか見張る（W）と縞は消える
// 1 = 両方開ける / 2 = 上だけ / 3 = 下だけ / W = 通り道を見張る検出器 / ↑↓ = 1 フレームの粒子数 / ←→ = スリットの間隔 / T = 理論の曲線 / C = 消す
// ============================================

let lambda = 7;          // ★ 波長（px）。大きくすると縞の間隔が広がる
let slitGap = 60;        // ★ スリットの間隔 d（px）
let slitW = 12;          // ★ スリットの幅 a（px）
let rate = 6;            // ★ 1 フレームに飛ばす粒子の数
let openSlit = 'both';       // 'both' | 'top' | 'bottom'
let watch = false;       // 通り道の検出器
let showTheory = true;
let hits;                // 当たった点を描きためる層
let bins = [], binH = 4; // ヒストグラム
let total = 0;
let flying = [];         // 飛んでいる途中の粒子（見た目用）
let srcX, slitX, scrX, cy, ymax;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  hits = createGraphics(width, height);
  layout();
}

function layout() {
  srcX = width * 0.08; slitX = width * 0.3; scrX = width * 0.68;
  cy = height * 0.55; ymax = height * 0.38;
  bins = new Array(ceil((2 * ymax) / binH)).fill(0);
  hits.clear(); total = 0; flying = [];
}

// ★ スクリーン上の位置 y（中心から px）での確率 |ψ|²（フラウンホーファー近似）
//   1 本のスリットの波：ψ1 ∝ sinc(π a (y - s) / (λ L)) · e^{i k r1}
//   両方開いていれば ψ = ψ上 + ψ下 → |ψ|² に cos²（干渉）が出る
function prob(y) {
  let L = scrX - slitX;
  let single = (s) => { let u = (PI * slitW * (y - s)) / (lambda * L); return abs(u) < 1e-6 ? 1 : sin(u) / u; };
  let phase = (PI * slitGap * y) / (lambda * L);      // 2 つの道の位相差の半分
  let a1 = single(-slitGap / 2), a2 = single(slitGap / 2);
  if (openSlit === 'top') return a1 * a1;
  if (openSlit === 'bottom') return a2 * a2;
  if (watch) return 0.5 * (a1 * a1 + a2 * a2);        // 見張ると干渉項が消える（確率を足すだけ）
  // 振幅を足してから 2 乗：|a1 e^{-iφ} + a2 e^{iφ}|² / 4
  let re = (a1 + a2) * cos(phase), im = (a2 - a1) * sin(phase);
  return (re * re + im * im) / 4;
}

// 確率 prob(y) に従って y を 1 つ選ぶ（棄却法：でたらめに選んで、確率に応じて採用）
function sampleY() {
  for (let t = 0; t < 300; t++) {
    let y = random(-ymax, ymax);
    if (random() < prob(y)) return y;
  }
  return 0;
}

function draw() {
  background(230, 30, 10);
  for (let i = 0; i < rate; i++) {
    let y = sampleY();
    let bi = floor((y + ymax) / binH);
    if (bi >= 0 && bi < bins.length) bins[bi]++;
    total++;
    hits.noStroke();
    hits.fill(55, 60, 100, 70);
    hits.circle(scrX + random(-14, 14), cy + y, 2.2);
    if (flying.length < 40 && random() < 0.3) {
      let s = openSlit === 'top' ? -1 : openSlit === 'bottom' ? 1 : random() < 0.5 ? -1 : 1;
      flying.push({ t: 0, s, y });
    }
  }
  image(hits, 0, 0);

  // 源・壁・スクリーン
  noStroke(); fill(0, 0, 70); circle(srcX, cy, 18);
  fill(0, 0, 45);
  let gTop = cy - slitGap / 2, gBot = cy + slitGap / 2;
  rect(slitX - 5, cy - ymax - 20, 10, gTop - slitW / 2 - (cy - ymax - 20));
  rect(slitX - 5, gTop + slitW / 2, 10, gBot - gTop - slitW);
  rect(slitX - 5, gBot + slitW / 2, 10, cy + ymax + 20 - gBot - slitW / 2);
  fill(0, 70, 70);
  if (openSlit === 'bottom') rect(slitX - 5, gTop - slitW / 2, 10, slitW);   // ふさいだスリット
  if (openSlit === 'top') rect(slitX - 5, gBot - slitW / 2, 10, slitW);
  stroke(0, 0, 60); strokeWeight(2); line(scrX, cy - ymax, scrX, cy + ymax);
  if (watch) { noStroke(); fill(120, 80, 90); circle(slitX + 22, gTop, 14); circle(slitX + 22, gBot, 14); }

  // 飛んでいる粒子（源 → スリット → スクリーン）
  noStroke();
  for (let p of flying) {
    p.t += 0.03;
    let sy = cy + p.s * slitGap / 2, x, y;
    if (p.t < 0.5) { x = lerp(srcX, slitX, p.t * 2); y = lerp(cy, sy, p.t * 2); }
    else { x = lerp(slitX, scrX, (p.t - 0.5) * 2); y = lerp(sy, cy + p.y, (p.t - 0.5) * 2); }
    fill(watch ? 120 : 190, 70, 100); circle(x, y, 6);
  }
  flying = flying.filter((p) => p.t < 1);

  // ヒストグラムと理論曲線
  let hx = scrX + 40, hw = width - hx - 30;
  let mx = max(1, max(bins));
  noStroke(); fill(55, 70, 95, 80);
  for (let i = 0; i < bins.length; i++) rect(hx, cy - ymax + i * binH, (bins[i] / mx) * hw, binH - 1);
  if (showTheory) {
    let pm = 0;
    for (let y = -ymax; y <= ymax; y += 2) pm = max(pm, prob(y));
    noFill(); stroke(190, 80, 100); strokeWeight(2);
    beginShape();
    for (let y = -ymax; y <= ymax; y += 2) vertex(hx + (prob(y) / pm) * hw, cy + y);
    endShape();
  }

  noStroke(); fill(0, 0, 100); textSize(18);
  text('1：両方　2：上だけ　3：下だけ（' + openSlit + '）　W：検出器 ' + (watch ? 'ON' : 'off') + '　↑↓ 粒子数 ' + rate + '　←→ 間隔 d = ' + slitGap + '　T：理論　C：消す　粒子 ' + total, 20, 40);
  fill(0, 0, 60); textSize(15);
  text('1 個ずつはでたらめな点。でも数千個たまると縞になる = 確率が波（|ψ|²）。どちらを通ったか見張ると、振幅でなく確率を足すことになり縞が消える', 20, 68);
  fill(190, 80, 100); text('水色の線 = |ψ|²（理論）', hx, cy - ymax - 12);
}

function keyPressed() {
  let changed = false;
  if (key === '1') { openSlit = 'both'; changed = true; }
  if (key === '2') { openSlit = 'top'; changed = true; }
  if (key === '3') { openSlit = 'bottom'; changed = true; }
  if (key === 'w' || key === 'W') { watch = !watch; changed = true; }
  if (key === UP_ARROW) rate = min(200, rate * 2);
  if (key === DOWN_ARROW) rate = max(1, floor(rate / 2));
  if (key === RIGHT_ARROW) { slitGap = min(160, slitGap + 10); changed = true; }
  if (key === LEFT_ARROW) { slitGap = max(20, slitGap - 10); changed = true; }
  if (key === 't' || key === 'T') showTheory = !showTheory;
  if (key === 'c' || key === 'C') changed = true;
  if (changed) layout();
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); hits = createGraphics(width, height); layout(); }

// ---------- やってみよう ----------
// 1. 粒子数を 1 にして、最初の 20 個が縞に見えるか観察。いつごろ縞だとわかる？
// 2. 縞の間隔は λL/d。lambda を 2 倍、slitGap を 2 倍にして確かめよう
// 3. 2（上だけ）でためてから 3（下だけ）で上書き。2 回分を足した模様と 1（両方）は同じ？ → 違う！
// 4. W の検出器を「半分の確率でだけ見張る」ように prob を書き換えると、縞はどのくらい薄くなる？
