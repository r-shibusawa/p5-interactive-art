// ============================================
// 11 エレベーターを待つか、階段を使うか（オンラインアルゴリズム）
// エレベーターがいつ来るかは分からない（m 分後）。階段なら B 分。待つほど損かもしれない
// 未来を知っている人（OPT）のコスト = min(m, B)。分からないまま決める戦略のコストと比べる → 競合比
// 「B 分だけ待って、来なければ階段」は、どんな m でも OPT の 2 倍以内（2-競合）。乱択ならさらに e/(e−1) ≈ 1.58 倍
// マウスの左右 = エレベーターが来る時刻 m（意地悪な相手）/ 1〜4 = 戦略を強調 / スペース = ランダムな m で 1 回 / 上下 = B
// ============================================

let B = 10;
let focus = 3;
let sim = null;
let names = ['すぐ階段', 'ずっと待つ', 'B 分待って階段（決定的）', 'ランダムな時間だけ待つ（乱択）'];
let hues = [0, 200, 45, 140];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
}

// 戦略 k が、エレベーターが m 分後に来るときに払う時間
function cost(k, m) {
  if (k === 0) return B;
  if (k === 1) return m;
  if (k === 2) return m <= B ? m : 2 * B;       // B 分待って来なければ、さらに B 分かけて階段
  return expectedRandom(m);
}

// 乱択：待つ時間 w を密度 e^(w/B) / (B(e−1)) で選ぶ（0 ≤ w ≤ B）。期待コストを数値計算
function expectedRandom(m) {
  let s = 0, steps = 200;
  for (let q = 0; q < steps; q++) {
    let w = ((q + 0.5) / steps) * B;
    let p = exp(w / B) / (B * (exp(1) - 1)) * (B / steps);
    s += p * (m <= w ? m : w + B);
  }
  return s;
}

function opt(m) { return min(m, B); }

function draw() {
  background(210, 30, 9);
  let gx = 90, gy = 130, gw = width * 0.5, gh = height - 300;
  let mMax = 3 * B;
  let m = constrain(map(mouseX, gx, gx + gw, 0, mMax), 0.01, mMax);
  // グラフ：横 = m、縦 = 競合比（コスト / OPT）
  stroke(210, 20, 30); strokeWeight(1);
  for (let r = 1; r <= 4; r++) { let y = gy + gh - ((r - 0.5) / 3.5) * gh; line(gx, y, gx + gw, y); noStroke(); fill(0, 0, 60); textSize(13); text(r + ' 倍', gx - 44, y + 4); stroke(210, 20, 30); }
  for (let k = 0; k < 4; k++) {
    noFill(); stroke(hues[k], 70, 95, focus === k ? 100 : 35); strokeWeight(focus === k ? 4 : 2);
    beginShape();
    for (let q = 1; q <= 160; q++) {
      let mm = (q / 160) * mMax;
      let ratio = min(4, cost(k, mm) / opt(mm));
      vertex(gx + (mm / mMax) * gw, gy + gh - ((ratio - 0.5) / 3.5) * gh);
    }
    endShape();
  }
  stroke(0, 0, 100, 50); line(gx + (m / mMax) * gw, gy, gx + (m / mMax) * gw, gy + gh);
  stroke(0, 0, 50); line(gx + (B / mMax) * gw, gy + gh, gx + (B / mMax) * gw, gy + gh + 8);
  noStroke(); fill(0, 0, 70); textSize(13); textAlign(CENTER, TOP);
  text('m = B', gx + (B / mMax) * gw, gy + gh + 10);
  text('エレベーターが来る時刻 m（分）→', gx + gw / 2, gy + gh + 30);
  textAlign(LEFT, BASELINE);
  // 右のパネル：今の m での各戦略
  let px = gx + gw + 50, py = 150;
  fill(0, 0, 100); textSize(20); text('m = ' + nf(m, 1, 1) + ' 分、階段 B = ' + B + ' 分', px, py);
  fill(0, 0, 75); textSize(16); text('未来を知る人（OPT）：' + nf(opt(m), 1, 1) + ' 分', px, py + 32);
  let worst = [Infinity, Infinity, 2, exp(1) / (exp(1) - 1)];
  for (let k = 0; k < 4; k++) {
    let c = cost(k, m);
    fill(hues[k], 70, 95, focus === k ? 100 : 60); textSize(focus === k ? 18 : 16);
    text((k + 1) + '. ' + names[k], px, py + 80 + k * 64);
    fill(0, 0, focus === k ? 95 : 65); textSize(15);
    text('コスト ' + nf(c, 1, 1) + ' 分　比 ' + nf(c / opt(m), 1, 2) + '　最悪 ' + (worst[k] === Infinity ? '∞' : nf(worst[k], 1, 2) + ' 倍'), px + 20, py + 104 + k * 64);
  }
  // シミュレーション
  if (sim) {
    sim.t += 0.1;
    let y = height - 120;
    fill(0, 0, 80); textSize(15);
    text('ランダムな m = ' + nf(sim.m, 1, 1) + '：乱択で選んだ待ち時間 w = ' + nf(sim.w, 1, 1) + ' → ' + (sim.m <= sim.w ? 'エレベーターに乗れた（' + nf(sim.m, 1, 1) + ' 分）' : '階段（' + nf(sim.w + B, 1, 1) + ' 分）'), px, y);
  }
  fill(0, 0, 100); textSize(18);
  text('マウス左右：エレベーターの到着 m（意地悪な相手が選ぶ）　1〜4：戦略を強調　スペース：乱択で 1 回試す　上下：B = ' + B, 20, 36);
  textSize(15); fill(0, 0, 65);
  text('グラフの縦 = コスト ÷ OPT（競合比）。オンライン：未来を知らずに、今決める。スキーの「レンタルか購入か」も同じ問題', 20, 62);
  fill(45, 80, 100); textSize(17);
  text('決定的な戦略は最良でも 2 倍（相手は「あなたが階段に向かった直後」に m を選べる）。乱択なら相手は w を知らないので 1.58 倍', 20, height - 28);
}

function sampleWait() {
  // 逆関数法：F(w) = (e^(w/B) − 1)/(e − 1)
  let u = random();
  return B * log(1 + u * (exp(1) - 1));
}

function keyPressed() {
  if (key >= '1' && key <= '4') focus = int(key) - 1;
  if (key === ' ') sim = { m: random(0, 3 * B), w: sampleWait(), t: 0, total: 0 };
  if (key === UP_ARROW) B = min(30, B + 2);
  if (key === DOWN_ARROW) B = max(2, B - 2);
}

// ---------- やってみよう ----------
// 1. 戦略 3 の比が最大になる m はどこ？（m がちょうど B を少し超えたとき → 2 倍）
// 2. 「B/2 分待つ」戦略を cost に追加して、最悪の比を調べる（B 分待つより悪くなる）
// 3. スキー：レンタル 1 日 1、購入 B。「B 日レンタルしたら買う」が同じ 2-競合
